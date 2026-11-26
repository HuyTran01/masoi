import type { StateStore } from './stateStore.ts';
import {
  applyOnlineMatchEloUpdates,
  type DatabaseAccountRecord,
  extractBearerToken,
  hashPasswordAsync,
  loadAccountsFromStore,
  needsPasswordRehash,
  resolveClusterSessionSecret,
  saveAccountsToStore,
  signSessionToken,
  toPublicAccount,
  verifyPasswordAsync,
  verifySessionToken,
} from './auth.ts';
import {
  normalizeRoomCode,
  type OpenRoomSummary,
  type RealtimeChatMessage,
  type RealtimePropEvent,
  RealtimeRoomManager,
  type RealtimeRoomState,
  type StoredOnlineRoomSnapshot,
} from './realtimeRooms.ts';
import {
  GMRoomManager,
  type GMRoomSummary,
  type StoredGMRoomSnapshot,
} from './gmRooms.ts';
import type {
  EloUpdateEntry,
  OnlineNightActionPayload,
  OnlineNightActionType,
} from './onlineMatchEngine.ts';

export interface ApiRouterHooks {
  onRoomMutated?: (
    code: string,
    kind: 'state' | 'match_started' | 'kicked' | 'chat' | 'prop' | 'votes' | 'deleted',
    extra?: {
      kickedId?: string;
      message?: RealtimeChatMessage;
      propEvent?: RealtimePropEvent;
      votes?: Record<string, string>;
    }
  ) => void;
  onGMRoomMutated?: (code: string) => void;
}

export interface ApiRouterOptions {
  store: StateStore;
  isNetlify: boolean;
  /**
   * When true (Netlify serverless), rooms and GM rooms are loaded/persisted per request
   * in `store` with concurrent per-player vote & night-action shard merging.
   * When false (local Node server.ts), uses the shared in-memory `roomManager` & `gmRoomManager`.
   */
  persistRooms: boolean;
  roomManager?: RealtimeRoomManager;
  gmRoomManager?: GMRoomManager;
  hooks?: ApiRouterHooks;
}

interface VoteShard {
  matchId: number;
  round: number;
  voterId: string;
  targetId: string;
  updatedAt: number;
}

interface NightActionShard {
  matchId: number;
  round: number;
  stepIndex: number;
  userId: string;
  picks: OnlineNightActionPayload[];
  confirmed: boolean;
  updatedAt: number;
}

const VALID_PROP_TYPES = new Set<RealtimePropEvent['propType']>(['tomato', 'rose', 'egg', 'water']);
const VALID_NIGHT_ACTIONS = new Set<OnlineNightActionType>([
  'wolf_bite',
  'wolf_second_bite',
  'guard',
  'seer_inspect',
  'witch_heal',
  'witch_poison',
  'cupid_link',
  'doppelganger_pick',
  'confirm_done',
]);

const MAX_BODY_BYTES = 100 * 1024;
const AUTH_RATE_WINDOW_MS = 60_000;
const AUTH_RATE_LIMIT = 30;
const IDLE_ROOM_TTL_MS = 2 * 60 * 60 * 1000;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}

function readHeader(req: Request, name: string): string | undefined {
  const val = req.headers.get(name);
  return val && val.trim() ? val.trim() : undefined;
}

async function parseJsonBody(
  req: Request
): Promise<{ ok: true; body: Record<string, unknown> } | { ok: false; status: number; error: string }> {
  try {
    const raw = await req.text();
    if (Buffer.byteLength(raw, 'utf-8') > MAX_BODY_BYTES) {
      return { ok: false, status: 413, error: 'Payload quá lớn (tối đa 100KB).' };
    }
    if (!raw.trim()) return { ok: true, body: {} };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { ok: false, status: 400, error: 'JSON body phải là một object.' };
    }
    return { ok: true, body: parsed as Record<string, unknown> };
  } catch {
    return { ok: false, status: 400, error: 'Dữ liệu JSON không hợp lệ.' };
  }
}

export function createApiRouter(options: ApiRouterOptions) {
  const { store, isNetlify, persistRooms, hooks } = options;
  const sharedRoomManager = options.roomManager ?? new RealtimeRoomManager();
  const sharedGMManager = options.gmRoomManager ?? new GMRoomManager();
  const authRateMap = new Map<string, { count: number; resetAt: number }>();

  function checkAuthRateLimit(ip: string): Response | null {
    const now = Date.now();
    if (authRateMap.size > 1000) {
      for (const [k, v] of authRateMap.entries()) {
        if (now >= v.resetAt) authRateMap.delete(k);
      }
    }
    const key = ip || 'unknown';
    const entry = authRateMap.get(key);
    if (!entry || now >= entry.resetAt) {
      authRateMap.set(key, { count: 1, resetAt: now + AUTH_RATE_WINDOW_MS });
      return null;
    }
    entry.count += 1;
    if (entry.count > AUTH_RATE_LIMIT) {
      return jsonResponse(
        {
          ok: false,
          code: 'RATE_LIMITED',
          error: 'Quá nhiều yêu cầu xác thực. Vui lòng thử lại sau 1 phút.',
        },
        429
      );
    }
    return null;
  }

  // ---- Persistent Room Helpers (Blobs / Store in serverless mode, shared manager in Node mode) ----

  function roomStateKey(code: string): string {
    return `rooms/${code}/state`;
  }

  function roomVoteShardKey(code: string, userId: string): string {
    return `rooms/${code}/votes/${userId}`;
  }

  function roomNightShardKey(code: string, round: number, stepIdx: number, userId: string): string {
    return `rooms/${code}/night/${round}_${stepIdx}_${userId}`;
  }

  function gmRoomKey(code: string): string {
    return `gm_rooms/${code}`;
  }

  async function deleteKeysByPrefix(prefix: string): Promise<void> {
    try {
      const keys = await store.listKeys(prefix);
      await Promise.all(keys.map((k) => store.delete(k)));
    } catch {
      // best-effort cleanup of stale shard keys
    }
  }

  async function loadOnlineRoomManager(code: string): Promise<{
    mgr: RealtimeRoomManager;
    existed: boolean;
    shardsMerged: boolean;
  }> {
    if (!persistRooms) {
      return {
        mgr: sharedRoomManager,
        existed: Boolean(sharedRoomManager.getRoom(code)),
        shardsMerged: false,
      };
    }

    const mgr = new RealtimeRoomManager();
    const snapshot = await store.getJSON<StoredOnlineRoomSnapshot>(roomStateKey(code));
    if (!snapshot) {
      return { mgr, existed: false, shardsMerged: false };
    }
    if (Date.now() - snapshot.room.updatedAt > IDLE_ROOM_TTL_MS) {
      await deleteKeysByPrefix(`rooms/${code}/`);
      return { mgr, existed: false, shardsMerged: false };
    }

    mgr.importSnapshot(snapshot);
    let shardsMerged = false;
    const match = mgr.getMatchState(code);

    if (match && match.phase === 'day_voting') {
      const voteKeys = await store.listKeys(`rooms/${code}/votes/`);
      if (voteKeys.length > 0) {
        const shards = await Promise.all(voteKeys.map((k) => store.getJSON<VoteShard>(k)));
        for (const shard of shards) {
          if (!shard) continue;
          if (shard.matchId !== match.matchId || shard.round !== match.round) continue;
          const currentVote = mgr.getRoom(code)?.votes[shard.voterId] ?? '';
          if (currentVote !== shard.targetId) {
            const res = mgr.castVote(code, shard.voterId, shard.targetId);
            if (res.ok) shardsMerged = true;
          }
        }
      }
    } else if (match && match.phase === 'night') {
      const prefix = `rooms/${code}/night/${match.round}_${match.nightStepIndex}_`;
      const nightKeys = await store.listKeys(prefix);
      if (nightKeys.length > 0) {
        const shards = (
          await Promise.all(nightKeys.map((k) => store.getJSON<NightActionShard>(k)))
        )
          .filter((s): s is NightActionShard => Boolean(s))
          .sort((a, b) => a.updatedAt - b.updatedAt);

        const targetRound = match.round;
        const targetStep = match.nightStepIndex;
        for (const shard of shards) {
          if (
            shard.matchId !== match.matchId ||
            shard.round !== targetRound ||
            shard.stepIndex !== targetStep
          ) {
            continue;
          }
          for (const pick of shard.picks) {
            if (
              pick.actionType === 'seer_inspect' &&
              match.seerInspectionsByPlayer[shard.userId]?.round === targetRound
            ) {
              continue;
            }
            const res = mgr.submitNightAction(code, shard.userId, pick, shard.updatedAt);
            if (res.ok) shardsMerged = true;
          }
        }

        // Apply confirmations after all picks are merged
        for (const shard of shards) {
          const liveMatch = mgr.getMatchState(code);
          if (
            !liveMatch ||
            liveMatch.phase !== 'night' ||
            liveMatch.round !== targetRound ||
            liveMatch.nightStepIndex !== targetStep
          ) {
            break;
          }
          if (shard.confirmed && !liveMatch.stepConfirmedBy[shard.userId]) {
            const res = mgr.submitNightAction(
              code,
              shard.userId,
              { actionType: 'confirm_done' },
              shard.updatedAt
            );
            if (res.ok) shardsMerged = true;
          }
        }
      }
    }

    return { mgr, existed: true, shardsMerged };
  }

  async function saveOnlineRoomManager(
    mgr: RealtimeRoomManager,
    code: string,
    options?: { clearVoteShards?: boolean; clearNightShards?: boolean; eloUpdates?: EloUpdateEntry[] }
  ): Promise<void> {
    const match = mgr.getMatchState(code);
    let pendingElo: EloUpdateEntry[] | undefined = options?.eloUpdates;
    if (match && match.phase === 'game_over' && !match.eloApplied) {
      match.eloApplied = true;
      if (!pendingElo && match.eloDeltasByPlayer) {
        pendingElo = match.players
          .filter((p) => !p.isBot)
          .map((p) => ({
            userId: p.id,
            delta: match.eloDeltasByPlayer?.[p.id] ?? 0,
            won: (match.eloDeltasByPlayer?.[p.id] ?? 0) > 0,
          }));
      }
    } else if (match?.eloApplied) {
      pendingElo = undefined;
    }

    if (persistRooms) {
      const snapshot = mgr.exportSnapshot(code);
      if (!snapshot) {
        await deleteKeysByPrefix(`rooms/${code}/`);
      } else {
        await store.setJSON(roomStateKey(code), snapshot);
        if (options?.clearVoteShards) {
          await deleteKeysByPrefix(`rooms/${code}/votes/`);
        }
        if (options?.clearNightShards) {
          await deleteKeysByPrefix(`rooms/${code}/night/`);
        }
      }
    }

    if (pendingElo && pendingElo.length > 0) {
      await applyOnlineMatchEloUpdates(store, pendingElo);
    }
  }

  async function loadGMRoomManager(code: string): Promise<{ mgr: GMRoomManager; existed: boolean }> {
    if (!persistRooms) {
      return {
        mgr: sharedGMManager,
        existed: Boolean(sharedGMManager.getHostState(code)),
      };
    }
    const mgr = new GMRoomManager();
    const snapshot = await store.getJSON<StoredGMRoomSnapshot>(gmRoomKey(code));
    if (!snapshot) return { mgr, existed: false };
    if (Date.now() - snapshot.room.updatedAt > IDLE_ROOM_TTL_MS) {
      await store.delete(gmRoomKey(code));
      return { mgr, existed: false };
    }
    mgr.importSnapshot(snapshot);
    return { mgr, existed: true };
  }

  async function saveGMRoomManager(mgr: GMRoomManager, code: string): Promise<void> {
    if (!persistRooms) return;
    const snapshot = mgr.exportSnapshot(code);
    if (!snapshot) {
      await store.delete(gmRoomKey(code));
    } else {
      await store.setJSON(gmRoomKey(code), snapshot);
    }
  }

  async function listOnlineRoomSummaries(): Promise<OpenRoomSummary[]> {
    if (!persistRooms) return sharedRoomManager.listOpenRooms();
    const keys = (await store.listKeys('rooms/')).filter((k) => k.endsWith('/state'));
    const now = Date.now();
    const snapshots = await Promise.all(
      keys.map((k) => store.getJSON<StoredOnlineRoomSnapshot>(k))
    );
    const summaries: OpenRoomSummary[] = [];
    for (const snap of snapshots) {
      if (!snap || now - snap.room.updatedAt > IDLE_ROOM_TTL_MS) continue;
      const host =
        snap.room.participants.find((p) => p.id === snap.room.hostId) || snap.room.participants[0];
      summaries.push({
        code: snap.room.code,
        hostName: host?.name || 'Host',
        playerCount: snap.room.participants.length,
        humanCount: snap.room.participants.filter((p) => !p.isBot).length,
        villageSize: snap.room.villageSize,
        status: snap.room.status,
        updatedAt: snap.room.updatedAt,
      });
    }
    return summaries.sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 24);
  }

  async function listGMRoomSummaries(): Promise<GMRoomSummary[]> {
    if (!persistRooms) return sharedGMManager.listRooms();
    const keys = await store.listKeys('gm_rooms/');
    const now = Date.now();
    const snapshots = await Promise.all(keys.map((k) => store.getJSON<StoredGMRoomSnapshot>(k)));
    const summaries: GMRoomSummary[] = [];
    for (const snap of snapshots) {
      if (!snap || now - snap.room.updatedAt > IDLE_ROOM_TTL_MS) continue;
      summaries.push({
        code: snap.room.code,
        matchId: snap.room.matchId,
        deckMode: snap.room.deckMode,
        status: snap.room.status,
        playerCount: snap.room.seats.length,
        claimedCount: snap.room.seats.filter((s) => Boolean(s.claimedByUserId)).length,
        updatedAt: snap.room.updatedAt,
      });
    }
    return summaries.sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 30);
  }

  // ---- Main Web Standard Request Handler ----

  async function handleRequest(
    req: Request,
    meta?: { clientIp?: string; now?: number }
  ): Promise<Response> {
    const url = new URL(req.url, 'http://localhost');
    const pathname = url.pathname.replace(/\/+$/, '') || '/';
    const method = req.method.toUpperCase();
    const clientIp =
      meta?.clientIp ||
      readHeader(req, 'x-nf-client-connection-ip') ||
      readHeader(req, 'x-forwarded-for')?.split(',')[0]?.trim() ||
      'unknown';
    const now = meta?.now ?? Date.now();

    // 1. Health
    if (method === 'GET' && pathname === '/api/health') {
      return jsonResponse({
        ok: true,
        runtime: isNetlify ? 'netlify' : 'node',
        wsSupported: !isNetlify,
      });
    }

    // 2. Accounts API
    if (method === 'GET' && pathname === '/api/accounts/list') {
      const accounts = (await loadAccountsFromStore(store)).map(toPublicAccount);
      return jsonResponse({ ok: true, accounts });
    }

    if (method === 'GET' && pathname === '/api/accounts/me') {
      const secret = await resolveClusterSessionSecret(store);
      const token = extractBearerToken(readHeader(req, 'authorization'));
      const session = token ? verifySessionToken(token, secret) : null;
      if (!session) {
        return jsonResponse(
          {
            ok: false,
            code: 'UNAUTHORIZED',
            error: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.',
          },
          401
        );
      }
      const accounts = await loadAccountsFromStore(store);
      const found = accounts.find((a) => a.username.toLowerCase() === session.username);
      if (!found) {
        return jsonResponse(
          { ok: false, code: 'ACCOUNT_NOT_FOUND', error: 'Tài khoản không tồn tại.' },
          404
        );
      }
      return jsonResponse({ ok: true, account: toPublicAccount(found) });
    }

    if (method === 'POST' && pathname === '/api/accounts/register') {
      const limited = checkAuthRateLimit(clientIp);
      if (limited) return limited;
      const parsed = await parseJsonBody(req);
      if (!parsed.ok) return jsonResponse({ ok: false, error: parsed.error }, parsed.status);

      const body = parsed.body;
      const rawUsername = String(body.username || '').trim().toLowerCase();
      const password = String(body.password || '');
      const displayName = String(body.displayName || '').trim();
      const avatar = String(body.avatar || '🐺').trim().slice(0, 16) || '🐺';
      const region: 'VN' | 'SEA' | 'GLOBAL' =
        body.region === 'SEA' ? 'SEA' : body.region === 'GLOBAL' ? 'GLOBAL' : 'VN';

      if (rawUsername.length < 3 || rawUsername.length > 32 || !/^[a-z0-9_.\-@]+$/.test(rawUsername)) {
        return jsonResponse(
          {
            ok: false,
            code: 'INVALID_USERNAME',
            error: 'Tên đăng nhập phải từ 3–32 ký tự (chữ cái, số, _, ., - hoặc @).',
          },
          400
        );
      }
      if (password.length < 6) {
        return jsonResponse(
          {
            ok: false,
            code: 'INVALID_PASSWORD',
            error: 'Mật khẩu phải có tối thiểu 6 ký tự.',
          },
          400
        );
      }
      if (displayName.length < 2 || displayName.length > 40) {
        return jsonResponse(
          {
            ok: false,
            code: 'INVALID_DISPLAY_NAME',
            error: 'Tên hiển thị trong Làng 3D phải từ 2–40 ký tự.',
          },
          400
        );
      }

      const accounts = await loadAccountsFromStore(store);
      if (accounts.some((a) => a.username.toLowerCase() === rawUsername)) {
        return jsonResponse(
          {
            ok: false,
            code: 'USERNAME_TAKEN',
            error: 'Tên tài khoản này đã tồn tại! Vui lòng chọn tên khác hoặc chuyển sang Đăng Nhập.',
          },
          409
        );
      }

      const passwordHash = await hashPasswordAsync(password);
      const newAccount: DatabaseAccountRecord = {
        id: `acc_${rawUsername.replace(/[^a-z0-9]/g, '')}_${now.toString(36)}`,
        username: rawUsername,
        passwordHash,
        displayName,
        avatar,
        region,
        elo: 1620,
        matchesPlayed: 0,
        wins: 0,
        createdAt: now,
        updatedAt: now,
      };
      await saveAccountsToStore(store, [newAccount, ...accounts]);

      const secret = await resolveClusterSessionSecret(store);
      const token = signSessionToken({ userId: newAccount.id, username: newAccount.username }, secret);
      return jsonResponse({ ok: true, token, account: toPublicAccount(newAccount) });
    }

    if (method === 'POST' && pathname === '/api/accounts/login') {
      const limited = checkAuthRateLimit(clientIp);
      if (limited) return limited;
      const parsed = await parseJsonBody(req);
      if (!parsed.ok) return jsonResponse({ ok: false, error: parsed.error }, parsed.status);

      const body = parsed.body;
      const rawUsername = String(body.username || '').trim().toLowerCase();
      const password = String(body.password || '');
      if (!rawUsername || !password) {
        return jsonResponse(
          {
            ok: false,
            code: 'MISSING_CREDENTIALS',
            error: 'Vui lòng nhập đầy đủ Tên tài khoản và Mật khẩu.',
          },
          400
        );
      }

      const accounts = await loadAccountsFromStore(store);
      const foundIdx = accounts.findIndex((a) => a.username.toLowerCase() === rawUsername);
      if (foundIdx === -1) {
        return jsonResponse(
          {
            ok: false,
            code: 'INVALID_CREDENTIALS',
            error: 'Tài khoản hoặc mật khẩu không chính xác.',
          },
          401
        );
      }

      const account = accounts[foundIdx];
      if (!(await verifyPasswordAsync(password, account.passwordHash))) {
        return jsonResponse(
          {
            ok: false,
            code: 'INVALID_CREDENTIALS',
            error: 'Tài khoản hoặc mật khẩu không chính xác.',
          },
          401
        );
      }

      if (needsPasswordRehash(account.passwordHash)) {
        account.passwordHash = await hashPasswordAsync(password);
      }
      account.updatedAt = now;
      accounts[foundIdx] = account;
      await saveAccountsToStore(store, accounts);

      const secret = await resolveClusterSessionSecret(store);
      const token = signSessionToken({ userId: account.id, username: account.username }, secret);
      return jsonResponse({ ok: true, token, account: toPublicAccount(account) });
    }

    if (method === 'POST' && pathname === '/api/accounts/update') {
      const limited = checkAuthRateLimit(clientIp);
      if (limited) return limited;
      const secret = await resolveClusterSessionSecret(store);
      const token = extractBearerToken(readHeader(req, 'authorization'));
      const session = token ? verifySessionToken(token, secret) : null;
      if (!session) {
        return jsonResponse(
          { ok: false, code: 'UNAUTHORIZED', error: 'Bạn cần đăng nhập để cập nhật hồ sơ.' },
          401
        );
      }

      const parsed = await parseJsonBody(req);
      if (!parsed.ok) return jsonResponse({ ok: false, error: parsed.error }, parsed.status);
      const body = parsed.body;
      const rawUsername = String(body.username || session.username).trim().toLowerCase();
      if (rawUsername !== session.username) {
        return jsonResponse(
          {
            ok: false,
            code: 'FORBIDDEN',
            error: 'Bạn không có quyền chỉnh sửa tài khoản của người khác.',
          },
          403
        );
      }

      const accounts = await loadAccountsFromStore(store);
      const idx = accounts.findIndex((a) => a.username.toLowerCase() === session.username);
      if (idx === -1) {
        return jsonResponse(
          {
            ok: false,
            code: 'ACCOUNT_NOT_FOUND',
            error: 'Không tìm thấy tài khoản cần cập nhật.',
          },
          404
        );
      }

      const current = accounts[idx];
      if (typeof body.displayName === 'string' && body.displayName.trim().length >= 2) {
        current.displayName = body.displayName.trim().slice(0, 40);
      }
      if (typeof body.avatar === 'string' && body.avatar.trim().length >= 1) {
        current.avatar = body.avatar.trim().slice(0, 16);
      }
      if (body.region === 'VN' || body.region === 'SEA' || body.region === 'GLOBAL') {
        current.region = body.region;
      }
      if (typeof body.elo === 'number' && !Number.isNaN(body.elo)) {
        const clampedDelta = Math.max(-80, Math.min(80, Math.round(body.elo - current.elo)));
        current.elo = Math.max(0, Math.min(10000, current.elo + clampedDelta));
      }
      if (typeof body.matchesPlayed === 'number' && !Number.isNaN(body.matchesPlayed)) {
        current.matchesPlayed = Math.max(
          current.matchesPlayed,
          Math.min(current.matchesPlayed + 1, Math.round(body.matchesPlayed))
        );
      }
      if (typeof body.wins === 'number' && !Number.isNaN(body.wins)) {
        current.wins = Math.min(
          current.matchesPlayed,
          Math.max(current.wins, Math.min(current.wins + 1, Math.round(body.wins)))
        );
      }

      current.updatedAt = now;
      accounts[idx] = current;
      await saveAccountsToStore(store, accounts);
      return jsonResponse({ ok: true, account: toPublicAccount(current) });
    }

    // 3. GM Rooms API
    if (method === 'GET' && pathname === '/api/gm-rooms') {
      const rooms = await listGMRoomSummaries();
      return jsonResponse({ ok: true, rooms });
    }

    const gmMatch = /^\/api\/gm-rooms\/([^/]+)\/(.+)$/.exec(pathname);
    if (gmMatch) {
      const code = normalizeRoomCode(decodeURIComponent(gmMatch[1]));
      const tail = gmMatch[2];

      if (method === 'GET' && tail === 'exists') {
        const { mgr } = await loadGMRoomManager(code);
        const room = mgr.getHostState(code);
        if (!room) return jsonResponse({ ok: true, exists: false });
        return jsonResponse({
          ok: true,
          exists: true,
          code: room.code,
          deckMode: room.deckMode,
          status: room.status,
        });
      }

      if (method === 'GET' && tail === 'host') {
        const hostSecret = readHeader(req, 'x-gm-host-secret');
        if (!hostSecret) {
          return jsonResponse(
            { ok: false, error: 'Chỉ Quản Trò sở hữu phòng mới có quyền xem toàn bộ vai trò.' },
            403
          );
        }
        const { mgr } = await loadGMRoomManager(code);
        const room = mgr.getHostState(code);
        if (!room) return jsonResponse({ ok: false, error: 'Không tìm thấy phòng Quản Trò.' }, 404);
        if (!mgr.verifyHostSecret(code, hostSecret)) {
          return jsonResponse(
            { ok: false, error: 'Chỉ Quản Trò sở hữu phòng mới có quyền xem toàn bộ vai trò.' },
            403
          );
        }
        return jsonResponse({ ok: true, room });
      }

      if (method === 'POST' && tail === 'sync') {
        const parsed = await parseJsonBody(req);
        if (!parsed.ok) return jsonResponse({ ok: false, error: parsed.error }, parsed.status);
        const body = parsed.body;
        const hostId = String(body.hostId || 'gm_host');
        const hostSecret =
          readHeader(req, 'x-gm-host-secret') ??
          (typeof body.hostSecret === 'string' && body.hostSecret.trim()
            ? body.hostSecret.trim()
            : undefined);

        const { mgr, existed } = await loadGMRoomManager(code);
        if (existed && !mgr.verifyHostSecret(code, hostSecret)) {
          return jsonResponse(
            {
              ok: false,
              error: 'Chỉ Quản Trò sở hữu phòng mới có quyền đồng bộ cấu hình phòng này.',
            },
            403
          );
        }

        const result = mgr.syncFromHost(
          code,
          hostId,
          {
            deckMode: body.deckMode as 'virtual_deck' | 'physical_cards' | undefined,
            status: body.status as 'setup' | 'in_match' | undefined,
            round: typeof body.round === 'number' ? body.round : undefined,
            phase: body.phase as 'setup' | 'night' | 'day' | undefined,
            seats: Array.isArray(body.seats) ? (body.seats as never) : undefined,
            playerCount: typeof body.playerCount === 'number' ? body.playerCount : undefined,
            resetMatch: Boolean(body.resetMatch),
          },
          existed ? hostSecret : undefined
        );
        if (!result.ok) {
          return jsonResponse(result, result.error.includes('Chỉ Quản Trò') ? 403 : 400);
        }
        await saveGMRoomManager(mgr, result.room.code);
        hooks?.onGMRoomMutated?.(result.room.code);
        return jsonResponse(result);
      }

      if (method === 'POST' && tail === 'join') {
        const parsed = await parseJsonBody(req);
        if (!parsed.ok) return jsonResponse({ ok: false, error: parsed.error }, parsed.status);
        const body = parsed.body;
        const user = (body.user || {}) as { id?: string; name?: string; avatar?: string };
        const { mgr } = await loadGMRoomManager(code);
        const result = mgr.joinAsPlayer(
          code,
          {
            id: String(user.id || ''),
            name: String(user.name || ''),
            avatar: typeof user.avatar === 'string' ? user.avatar : undefined,
          },
          { seatId: typeof body.seatId === 'string' ? body.seatId : undefined }
        );
        if (!result.ok) return jsonResponse(result, 400);
        await saveGMRoomManager(mgr, code);
        hooks?.onGMRoomMutated?.(code);
        return jsonResponse({ ok: true, view: result.view, playerToken: result.playerToken });
      }

      if (method === 'POST' && tail === 'leave') {
        const parsed = await parseJsonBody(req);
        if (!parsed.ok) return jsonResponse({ ok: false, error: parsed.error }, parsed.status);
        const body = parsed.body;
        const userId = String(body.userId || '').trim().slice(0, 64);
        const playerToken =
          readHeader(req, 'x-gm-player-token') ??
          (typeof body.playerToken === 'string' && body.playerToken.trim()
            ? body.playerToken.trim()
            : undefined);

        const { mgr } = await loadGMRoomManager(code);
        if (mgr.hasPlayerToken(code, userId) && !mgr.verifyPlayerToken(code, userId, playerToken)) {
          return jsonResponse({ ok: false, error: 'Mã xác thực người chơi không hợp lệ.' }, 403);
        }
        const result = mgr.leaveAsPlayer(code, userId);
        if (!result.ok) return jsonResponse(result, 400);
        await saveGMRoomManager(mgr, code);
        hooks?.onGMRoomMutated?.(code);
        return jsonResponse({ ok: true });
      }

      if (method === 'POST' && tail === 'self-role') {
        const parsed = await parseJsonBody(req);
        if (!parsed.ok) return jsonResponse({ ok: false, error: parsed.error }, parsed.status);
        const body = parsed.body;
        const userId = String(body.userId || '').trim().slice(0, 64);
        const playerToken =
          readHeader(req, 'x-gm-player-token') ??
          (typeof body.playerToken === 'string' && body.playerToken.trim()
            ? body.playerToken.trim()
            : undefined);

        const { mgr } = await loadGMRoomManager(code);
        if (mgr.hasPlayerToken(code, userId) && !mgr.verifyPlayerToken(code, userId, playerToken)) {
          return jsonResponse({ ok: false, error: 'Mã xác thực người chơi không hợp lệ.' }, 403);
        }
        const result = mgr.submitSelfRole(code, userId, body.roleId as never);
        if (!result.ok) return jsonResponse(result, 400);
        await saveGMRoomManager(mgr, code);
        hooks?.onGMRoomMutated?.(code);
        return jsonResponse({ ok: true, view: result.view });
      }

      const playerMatch = /^player\/([^/]+)$/.exec(tail);
      if (method === 'GET' && playerMatch) {
        const userId = decodeURIComponent(playerMatch[1]).trim().slice(0, 64);
        const playerToken = readHeader(req, 'x-gm-player-token');
        const { mgr } = await loadGMRoomManager(code);
        if (mgr.hasPlayerToken(code, userId) && !mgr.verifyPlayerToken(code, userId, playerToken)) {
          return jsonResponse({ ok: false, error: 'Mã xác thực người chơi không hợp lệ.' }, 403);
        }
        const view = mgr.getPlayerView(code, userId);
        if (!view) return jsonResponse({ ok: false, error: 'Không tìm thấy phòng Quản Trò.' }, 404);
        return jsonResponse({ ok: true, view });
      }
    }

    // 4. Online Rooms API (HTTP dual-transport & serverless match state)
    if (method === 'GET' && pathname === '/api/rooms') {
      const rooms = await listOnlineRoomSummaries();
      return jsonResponse({ ok: true, rooms });
    }

    const roomMatch = /^\/api\/rooms\/([^/]+)\/(join|state|action)$/.exec(pathname);
    if (roomMatch) {
      const code = normalizeRoomCode(decodeURIComponent(roomMatch[1]));
      const endpoint = roomMatch[2];

      if (method === 'POST' && endpoint === 'join') {
        const parsed = await parseJsonBody(req);
        if (!parsed.ok) return jsonResponse({ ok: false, error: parsed.error }, parsed.status);
        const body = parsed.body;
        const user = (body.user || {}) as {
          id?: string;
          name?: string;
          avatar?: string;
          elo?: number;
        };
        const cleanUserId = String(user.id || '').trim().slice(0, 64);
        const cleanName = String(user.name || '').trim().slice(0, 40);
        if (!cleanUserId || !cleanName) {
          return jsonResponse({ ok: false, error: 'Thiếu thông tin người chơi.' }, 400);
        }

        const rawAuthToken =
          (typeof body.authToken === 'string' && body.authToken.trim()) ||
          extractBearerToken(readHeader(req, 'authorization')) ||
          '';
        let verifiedAccountUserId: string | null = null;
        if (cleanUserId.startsWith('acc_') && rawAuthToken) {
          const secret = await resolveClusterSessionSecret(store);
          const session = verifySessionToken(rawAuthToken, secret);
          if (!session || session.userId !== cleanUserId) {
            return jsonResponse({ ok: false, error: 'Phiên đăng nhập không hợp lệ.' }, 401);
          }
          verifiedAccountUserId = session.userId;
        }

        const providedSecret =
          readHeader(req, 'x-room-player-secret') ??
          (typeof body.playerSecret === 'string' && body.playerSecret.trim()
            ? body.playerSecret.trim()
            : undefined);

        const { mgr } = await loadOnlineRoomManager(code);
        const existingRoom = mgr.getRoom(code);
        const alreadyInRoom = Boolean(existingRoom?.participants.some((p) => p.id === cleanUserId));
        if (
          alreadyInRoom &&
          mgr.hasPlayerSecret(code, cleanUserId) &&
          !mgr.verifyPlayerSecret(code, cleanUserId, providedSecret) &&
          verifiedAccountUserId !== cleanUserId
        ) {
          return jsonResponse(
            { ok: false, error: 'Người chơi này đang hoạt động trong phòng với phiên khác.' },
            403
          );
        }

        const joinRes = mgr.createOrJoinRoom(
          code,
          {
            id: cleanUserId,
            name: cleanName,
            avatar: String(user.avatar || '🐺').slice(0, 16),
            elo: Number(user.elo) || 1500,
          },
          {
            villageSize: typeof body.villageSize === 'number' ? body.villageSize : undefined,
            timerConfig:
              body.timerConfig && typeof body.timerConfig === 'object'
                ? (body.timerConfig as {
                    nightActionSec?: number;
                    dayDiscussSec?: number;
                    dayVoteSec?: number;
                  })
                : undefined,
            createIfMissing: body.createIfMissing !== false,
          }
        );
        if (!joinRes.ok) {
          return jsonResponse(joinRes, 400);
        }

        const playerSecret = mgr.getOrIssuePlayerSecret(joinRes.room.code, cleanUserId);
        const tickRes = mgr.tickRoom(joinRes.room.code, now);
        await saveOnlineRoomManager(mgr, joinRes.room.code, { eloUpdates: tickRes.eloUpdates });
        hooks?.onRoomMutated?.(joinRes.room.code, 'state');

        return jsonResponse({
          ok: true,
          room: mgr.getSanitizedRoomForUser(joinRes.room.code, cleanUserId),
          matchView: mgr.getMatchViewForUser(joinRes.room.code, cleanUserId, now),
          recentProps: mgr.getRecentProps(joinRes.room.code),
          playerSecret,
          serverNow: now,
        });
      }

      if (method === 'GET' && endpoint === 'state') {
        const userId = (url.searchParams.get('userId') || '').trim().slice(0, 64);
        const sinceRaw = url.searchParams.get('since');
        const since = sinceRaw !== null ? Number(sinceRaw) : NaN;
        const playerSecret = readHeader(req, 'x-room-player-secret');

        if (!userId) {
          return jsonResponse({ ok: false, error: 'Thiếu tham số userId.' }, 400);
        }

        const { mgr, existed, shardsMerged } = await loadOnlineRoomManager(code);
        if (!existed) {
          return jsonResponse({ ok: false, error: 'Phòng không tồn tại.' }, 404);
        }

        if (mgr.wasKickedWithSecret(code, userId, playerSecret)) {
          return jsonResponse({
            ok: false,
            kicked: true,
            reason: 'Chủ phòng đã mời bạn ra khỏi phòng.',
            serverNow: now,
          });
        }

        if (!mgr.verifyPlayerSecret(code, userId, playerSecret)) {
          return jsonResponse({ ok: false, error: 'Mã xác thực người chơi không hợp lệ.' }, 403);
        }

        const beforePhase = mgr.getMatchState(code)?.phase;
        const beforeStep = mgr.getMatchState(code)?.nightStepIndex;
        const beforeRound = mgr.getMatchState(code)?.round;
        const tickRes = mgr.tickRoom(code, now);
        const afterMatch = mgr.getMatchState(code);

        if (shardsMerged || tickRes.changed) {
          await saveOnlineRoomManager(mgr, code, {
            clearVoteShards: Boolean(beforePhase === 'day_voting' && afterMatch?.phase !== 'day_voting'),
            clearNightShards: Boolean(
              beforePhase === 'night' &&
                (afterMatch?.phase !== 'night' ||
                  afterMatch?.nightStepIndex !== beforeStep ||
                  afterMatch?.round !== beforeRound)
            ),
            eloUpdates: tickRes.eloUpdates,
          });
          hooks?.onRoomMutated?.(code, 'state');
        }

        const sanitizedRoom = mgr.getSanitizedRoomForUser(code, userId);
        if (!sanitizedRoom) {
          return jsonResponse({ ok: false, error: 'Phòng không tồn tại.' }, 404);
        }

        if (!Number.isNaN(since) && !shardsMerged && !tickRes.changed && sanitizedRoom.updatedAt <= since) {
          return jsonResponse({ ok: true, unchanged: true, serverNow: now });
        }

        return jsonResponse({
          ok: true,
          unchanged: false,
          room: sanitizedRoom,
          matchView: mgr.getMatchViewForUser(code, userId, now),
          recentProps: mgr.getRecentProps(code),
          serverNow: now,
        });
      }

      if (method === 'POST' && endpoint === 'action') {
        const parsed = await parseJsonBody(req);
        if (!parsed.ok) return jsonResponse({ ok: false, error: parsed.error }, parsed.status);
        const body = parsed.body;
        const userId = String(body.userId || '').trim().slice(0, 64);
        const action = String(body.action || '').trim();
        const playerSecret =
          readHeader(req, 'x-room-player-secret') ??
          (typeof body.playerSecret === 'string' && body.playerSecret.trim()
            ? body.playerSecret.trim()
            : undefined);

        if (!userId || !action) {
          return jsonResponse({ ok: false, error: 'Thiếu userId hoặc loại hành động.' }, 400);
        }

        const { mgr, existed } = await loadOnlineRoomManager(code);
        if (!existed) {
          return jsonResponse({ ok: false, error: 'Phòng không tồn tại.' }, 404);
        }
        if (!mgr.verifyPlayerSecret(code, userId, playerSecret)) {
          return jsonResponse({ ok: false, error: 'Mã xác thực người chơi không hợp lệ.' }, 403);
        }

        const beforeMatch = mgr.getMatchState(code);
        const beforePhase = beforeMatch?.phase;
        const beforeStep = beforeMatch?.nightStepIndex;
        const beforeRound = beforeMatch?.round;

        if (action === 'leave') {
          const left = mgr.leaveRoom(code, userId);
          await saveOnlineRoomManager(mgr, code);
          hooks?.onRoomMutated?.(code, left.deleted ? 'deleted' : 'state');
          return jsonResponse({ ok: true, left: true, deleted: left.deleted, serverNow: now });
        }

        let hookKind: 'state' | 'match_started' | 'kicked' | 'chat' | 'prop' | 'votes' = 'state';
        let hookExtra: Parameters<NonNullable<ApiRouterHooks['onRoomMutated']>>[2];
        let eloUpdates: EloUpdateEntry[] | undefined;

        if (action === 'kick') {
          const res = mgr.kickParticipant(code, userId, String(body.targetId || ''));
          if (!res.ok) return jsonResponse(res, 400);
          hookKind = 'kicked';
          hookExtra = { kickedId: res.kickedId };
        } else if (action === 'add_bot') {
          const res = mgr.addBot(code, userId);
          if (!res.ok) return jsonResponse(res, 400);
        } else if (action === 'fill_bots') {
          const res = mgr.fillBots(code, userId);
          if (!res.ok) return jsonResponse(res, 400);
        } else if (action === 'config') {
          const cfg = (body.config && typeof body.config === 'object' ? body.config : {}) as {
            villageSize?: number;
            timerConfig?: { nightActionSec?: number; dayDiscussSec?: number; dayVoteSec?: number };
          };
          const res = mgr.updateConfig(code, userId, cfg);
          if (!res.ok) return jsonResponse(res, 400);
        } else if (action === 'start') {
          const res = mgr.startMatch(code, userId, { now });
          if (!res.ok) return jsonResponse(res, 400);
          hookKind = 'match_started';
        } else if (action === 'restart') {
          const res = mgr.restartMatch(code, userId, { now });
          if (!res.ok) return jsonResponse(res, 400);
          hookKind = 'match_started';
        } else if (action === 'chat') {
          const rawMsg = (body.message && typeof body.message === 'object'
            ? body.message
            : {}) as Partial<RealtimeChatMessage>;
          const res = mgr.postChat(code, {
            id: String(rawMsg.id || ''),
            senderId: userId,
            senderName: String(rawMsg.senderName || 'Player'),
            text: String(rawMsg.text || ''),
            timestamp: typeof rawMsg.timestamp === 'number' ? rawMsg.timestamp : now,
            isGhost: Boolean(rawMsg.isGhost),
            isSystem: false,
          });
          if (!res.ok) return jsonResponse(res, 400);
          hookKind = 'chat';
          hookExtra = { message: res.message };
        } else if (action === 'prop') {
          const ev = (body.event && typeof body.event === 'object'
            ? body.event
            : {}) as Partial<RealtimePropEvent>;
          if (!ev.targetPlayerId || !ev.propType || !VALID_PROP_TYPES.has(ev.propType)) {
            return jsonResponse({ ok: false, error: 'Đạo cụ hoặc mục tiêu không hợp lệ.' }, 400);
          }
          const propEvent: RealtimePropEvent = {
            id: String(ev.id || `prop_${now}_${Math.random().toString(36).slice(2, 6)}`),
            propType: ev.propType,
            fromPlayerId: userId,
            targetPlayerId: String(ev.targetPlayerId).slice(0, 64),
            timestamp: now,
          };
          const res = mgr.recordProp(code, propEvent);
          if (!res.ok) return jsonResponse(res, 403);
          hookKind = 'prop';
          hookExtra = { propEvent };
        } else if (action === 'vote') {
          const targetId = String(body.targetId ?? '').trim().slice(0, 64);
          const res = mgr.castVote(code, userId, targetId);
          if (!res.ok) return jsonResponse(res, 400);
          if (persistRooms && beforeMatch && beforeMatch.phase === 'day_voting') {
            await store.setJSON<VoteShard>(roomVoteShardKey(code, userId), {
              matchId: beforeMatch.matchId,
              round: beforeMatch.round,
              voterId: userId,
              targetId,
              updatedAt: now,
            });
          }
          hookKind = 'votes';
          hookExtra = { votes: res.votes };
        } else if (action === 'night_action') {
          const actionType = String(body.actionType || '') as OnlineNightActionType;
          if (!VALID_NIGHT_ACTIONS.has(actionType)) {
            return jsonResponse({ ok: false, error: 'Loại hành động đêm không hợp lệ.' }, 400);
          }
          const payload: OnlineNightActionPayload = {
            actionType,
            targetId:
              body.targetId === null || body.targetId === undefined
                ? null
                : String(body.targetId).slice(0, 64),
            secondTargetId:
              body.secondTargetId === null || body.secondTargetId === undefined
                ? null
                : String(body.secondTargetId).slice(0, 64),
          };
          const snapRound = beforeMatch?.round ?? 1;
          const snapStep = beforeMatch?.nightStepIndex ?? 0;
          const snapMatchId = beforeMatch?.matchId ?? 1;

          const res = mgr.submitNightAction(code, userId, payload, now);
          if (!res.ok) return jsonResponse(res, 400);
          eloUpdates = res.eloUpdates;

          // Persist per-player night action shard so concurrent wolf/step actions never get lost
          if (persistRooms && beforeMatch && beforeMatch.phase === 'night') {
            const shardKey = roomNightShardKey(code, snapRound, snapStep, userId);
            const existingShard = await store.getJSON<NightActionShard>(shardKey);
            const base: NightActionShard =
              existingShard &&
              existingShard.matchId === snapMatchId &&
              existingShard.round === snapRound &&
              existingShard.stepIndex === snapStep
                ? existingShard
                : {
                    matchId: snapMatchId,
                    round: snapRound,
                    stepIndex: snapStep,
                    userId,
                    picks: [],
                    confirmed: false,
                    updatedAt: now,
                  };
            if (actionType === 'confirm_done') {
              base.confirmed = true;
            } else {
              base.picks = [
                ...base.picks.filter((p) => p.actionType !== actionType),
                payload,
              ];
            }
            base.updatedAt = now;
            await store.setJSON(shardKey, base);
          }
        } else if (action === 'hunter_shot') {
          const targetId =
            body.targetId === null || body.targetId === undefined || body.targetId === ''
              ? null
              : String(body.targetId).slice(0, 64);
          const res = mgr.submitHunterShot(code, userId, targetId, now);
          if (!res.ok) return jsonResponse(res, 400);
          eloUpdates = res.eloUpdates;
        } else if (action === 'advance_phase') {
          const res = mgr.advancePhase(code, userId, now);
          if (!res.ok) return jsonResponse(res, 400);
          eloUpdates = res.eloUpdates;
        } else {
          return jsonResponse({ ok: false, error: `Hành động không hỗ trợ: ${action}` }, 400);
        }

        const tickRes = mgr.tickRoom(code, now);
        const afterMatch = mgr.getMatchState(code);
        const clearVoteShards = Boolean(
          action === 'start' ||
            action === 'restart' ||
            (beforePhase === 'day_voting' && afterMatch?.phase !== 'day_voting')
        );
        const clearNightShards = Boolean(
          action === 'start' ||
            action === 'restart' ||
            (beforePhase === 'night' &&
              (afterMatch?.phase !== 'night' ||
                afterMatch?.nightStepIndex !== beforeStep ||
                afterMatch?.round !== beforeRound))
        );

        await saveOnlineRoomManager(mgr, code, {
          clearVoteShards,
          clearNightShards,
          eloUpdates: eloUpdates ?? tickRes.eloUpdates,
        });
        hooks?.onRoomMutated?.(code, hookKind, hookExtra);

        return jsonResponse({
          ok: true,
          room: mgr.getSanitizedRoomForUser(code, userId),
          matchView: mgr.getMatchViewForUser(code, userId, now),
          recentProps: mgr.getRecentProps(code),
          serverNow: now,
        });
      }
    }

    return jsonResponse({ ok: false, error: 'API endpoint not found.' }, 404);
  }

  return {
    handleRequest,
  };
}
