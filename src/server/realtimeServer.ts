import express from 'express';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import type { AddressInfo } from 'node:net';
import { WebSocketServer, WebSocket } from 'ws';
import {
  applyOnlineMatchEloUpdates,
  resolveClusterSessionSecret,
  verifySessionToken,
} from './auth.ts';
import {
  normalizeRoomCode,
  type RealtimeChatMessage,
  type RealtimePropEvent,
  RealtimeRoomManager,
  type StoredOnlineRoomSnapshot,
} from './realtimeRooms.ts';
import { GMRoomManager, type StoredGMRoomSnapshot } from './gmRooms.ts';
import { createLocalNodeStateStore } from './stateStore.ts';
import { createApiRouter } from './apiRouter.ts';
import type { EloUpdateEntry, OnlineNightActionType } from './onlineMatchEngine.ts';

interface SocketMeta {
  roomCode: string | null;
  userId: string | null;
  authUserId: string | null;
  clientIp: string;
  isAlive: boolean;
}

interface DiskSnapshotPayload {
  version: 1;
  savedAt: number;
  onlineRooms: StoredOnlineRoomSnapshot[];
  gmRooms: StoredGMRoomSnapshot[];
}

export interface CreateRealtimeServerOptions {
  port?: number;
  host?: string;
  accountsDbPath?: string;
  snapshotPath?: string;
  enableSnapshots?: boolean;
  hostDisconnectGraceMs?: number;
  tickIntervalMs?: number;
  attachVite?: boolean;
  disableRateLimits?: boolean;
  quiet?: boolean;
}

export interface RealtimeAppServerHandle {
  app: express.Express;
  httpServer: http.Server;
  wss: WebSocketServer;
  port: number;
  baseUrl: string;
  wsUrl: string;
  roomManager: RealtimeRoomManager;
  gmRoomManager: GMRoomManager;
  flushSnapshotsNow: () => void;
  close: () => Promise<void>;
}

const VALID_PROP_TYPES = new Set<RealtimePropEvent['propType']>(['tomato', 'rose', 'egg', 'water']);
const VALID_NIGHT_ACTIONS = new Set<OnlineNightActionType>([
  'wolf_bite',
  'wolf_second_bite',
  'guard',
  'hunter_mark',
  'seer_inspect',
  'witch_heal',
  'witch_poison',
  'cupid_link',
  'doppelganger_pick',
  'confirm_done',
]);

const WS_ROOM_CREATE_WINDOW_MS = 60_000;
const WS_ROOM_CREATE_LIMIT = 25;
const WS_CHAT_WINDOW_MS = 10_000;
const WS_CHAT_LIMIT = 15;

export async function createRealtimeAppServer(
  options: CreateRealtimeServerOptions = {}
): Promise<RealtimeAppServerHandle> {
  const app = express();
  const port = options.port ?? (Number(process.env.PORT) || 3000);
  const host = options.host ?? '0.0.0.0';
  const accountsDbPath =
    options.accountsDbPath ?? path.resolve(process.cwd(), '.accounts_db.json');
  const snapshotPath =
    options.snapshotPath ?? path.resolve(process.cwd(), '.masoi-rooms-snapshot.json');
  const enableSnapshots = options.enableSnapshots ?? false;
  const tickIntervalMs = Math.max(50, options.tickIntervalMs ?? 1000);

  const localStore = createLocalNodeStateStore(accountsDbPath);
  const roomManager = new RealtimeRoomManager({
    hostDisconnectGraceMs: options.hostDisconnectGraceMs,
  });
  const gmRoomManager = new GMRoomManager();

  // Restore snapshots from disk on startup if enabled
  if (enableSnapshots && fs.existsSync(snapshotPath)) {
    try {
      const raw = fs.readFileSync(snapshotPath, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<DiskSnapshotPayload>;
      if (parsed && parsed.version === 1) {
        if (Array.isArray(parsed.onlineRooms)) {
          roomManager.importAllSnapshots(parsed.onlineRooms);
        }
        if (Array.isArray(parsed.gmRooms)) {
          gmRoomManager.importAllSnapshots(parsed.gmRooms);
        }
      }
    } catch {
      // ignore corrupted snapshot file on startup
    }
  }

  // Per-room serialized execution queue: prevents concurrent WS/HTTP mutations and 1s tick from interleaving
  const roomLocks = new Map<string, Promise<void>>();
  function withRoomLock<T>(rawCode: string, fn: () => Promise<T> | T): Promise<T> {
    const key = normalizeRoomCode(rawCode) || '__global__';
    const prev = roomLocks.get(key) ?? Promise.resolve();
    const run = prev.then(
      () => fn(),
      () => fn()
    );
    const tail = run.then(
      () => {
        if (roomLocks.get(key) === tail) roomLocks.delete(key);
      },
      () => {
        if (roomLocks.get(key) === tail) roomLocks.delete(key);
      }
    );
    roomLocks.set(key, tail);
    return run;
  }

  // Debounced atomic snapshot persistence
  let snapshotTimer: ReturnType<typeof setTimeout> | null = null;
  function flushSnapshotsNow() {
    if (!enableSnapshots) return;
    if (snapshotTimer) {
      clearTimeout(snapshotTimer);
      snapshotTimer = null;
    }
    try {
      const payload: DiskSnapshotPayload = {
        version: 1,
        savedAt: Date.now(),
        onlineRooms: roomManager.exportAllSnapshots(),
        gmRooms: gmRoomManager.exportAllSnapshots(),
      };
      const tmpPath = `${snapshotPath}.${process.pid}.tmp`;
      fs.writeFileSync(tmpPath, JSON.stringify(payload), 'utf-8');
      fs.renameSync(tmpPath, snapshotPath);
    } catch {
      // best-effort snapshot persistence
    }
  }

  function scheduleSnapshotSave() {
    if (!enableSnapshots || snapshotTimer) return;
    snapshotTimer = setTimeout(() => {
      snapshotTimer = null;
      flushSnapshotsNow();
    }, 1200);
  }

  // Simple sliding-window rate bucket for WS actions
  const wsRoomCreateRateMap = new Map<string, { count: number; resetAt: number }>();
  const wsChatRateMap = new Map<string, { count: number; resetAt: number }>();
  function checkWsRateBucket(
    bucket: Map<string, { count: number; resetAt: number }>,
    key: string,
    limit: number,
    windowMs: number
  ): boolean {
    if (options.disableRateLimits) return true;
    const now = Date.now();
    if (bucket.size > 1000) {
      for (const [k, v] of bucket.entries()) {
        if (now >= v.resetAt) bucket.delete(k);
      }
    }
    const entry = bucket.get(key);
    if (!entry || now >= entry.resetAt) {
      bucket.set(key, { count: 1, resetAt: now + windowMs });
      return true;
    }
    entry.count += 1;
    return entry.count <= limit;
  }

  const socketMeta = new Map<WebSocket, SocketMeta>();
  const roomSockets = new Map<string, Set<WebSocket>>();
  const gmHostSockets = new Map<string, Set<WebSocket>>();
  const gmPlayerSockets = new Map<string, Map<WebSocket, string>>();

  function sendJson(ws: WebSocket, payload: Record<string, unknown>) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
    }
  }

  function broadcastToRoom(code: string, payload: Record<string, unknown>) {
    const members = roomSockets.get(code);
    if (!members) return;
    const serialized = JSON.stringify(payload);
    for (const sock of members) {
      if (sock.readyState === WebSocket.OPEN) {
        sock.send(serialized);
      }
    }
  }

  function broadcastChatToRoom(code: string, message: RealtimeChatMessage) {
    const members = roomSockets.get(code);
    if (!members) return;
    const match = roomManager.getMatchState(code);
    const serialized = JSON.stringify({ type: 'room:chat', code, message });
    for (const sock of members) {
      if (sock.readyState !== WebSocket.OPEN) continue;
      if (message.isGhost && match && match.phase !== 'game_over') {
        const uid = socketMeta.get(sock)?.userId ?? null;
        const viewer = uid ? match.players.find((p) => p.id === uid) : undefined;
        if (!viewer || viewer.isAlive) continue;
      }
      sock.send(serialized);
    }
  }

  function broadcastRoomState(
    code: string,
    type: 'room:state' | 'room:match_started',
    includeMatchView = true
  ) {
    const members = roomSockets.get(code);
    if (!members) return;
    const now = Date.now();
    for (const sock of members) {
      if (sock.readyState !== WebSocket.OPEN) continue;
      const uid = socketMeta.get(sock)?.userId ?? null;
      const sanitized = roomManager.getSanitizedRoomForUser(code, uid);
      if (!sanitized) continue;
      sock.send(JSON.stringify({ type, room: sanitized }));
      if (includeMatchView && uid) {
        const view = roomManager.getMatchViewForUser(code, uid, now);
        if (view) {
          sock.send(JSON.stringify({ type: 'room:match_state', code, view, serverNow: now }));
        }
      }
    }
  }

  function broadcastMatchStateOnly(code: string) {
    const members = roomSockets.get(code);
    if (!members) return;
    const now = Date.now();
    for (const sock of members) {
      if (sock.readyState !== WebSocket.OPEN) continue;
      const uid = socketMeta.get(sock)?.userId ?? null;
      if (!uid) continue;
      const view = roomManager.getMatchViewForUser(code, uid, now);
      if (view) {
        sock.send(JSON.stringify({ type: 'room:match_state', code, view, serverNow: now }));
      }
    }
  }

  function applyEloIfNeeded(code: string, eloUpdates?: EloUpdateEntry[]) {
    const match = roomManager.getMatchState(code);
    if (!match || match.phase !== 'game_over' || match.eloApplied) return;
    match.eloApplied = true;
    const entries =
      eloUpdates ??
      match.players
        .filter((p) => !p.isBot)
        .map((p) => ({
          userId: p.id,
          delta: match.eloDeltasByPlayer?.[p.id] ?? 0,
          won: (match.eloDeltasByPlayer?.[p.id] ?? 0) > 0,
        }));
    if (entries.length > 0) {
      void applyOnlineMatchEloUpdates(localStore, entries).catch(() => {
        // ignore local ELO write errors
      });
    }
  }

  function requireBoundSocket(ws: WebSocket, code: string): SocketMeta | null {
    const meta = socketMeta.get(ws);
    if (!meta || !meta.userId || meta.roomCode !== code) {
      sendJson(ws, { type: 'error', message: 'Bạn chưa tham gia phòng này.' });
      return null;
    }
    return meta;
  }

  function broadcastToAll(payload: Record<string, unknown>) {
    const serialized = JSON.stringify(payload);
    for (const sock of socketMeta.keys()) {
      if (sock.readyState === WebSocket.OPEN) {
        sock.send(serialized);
      }
    }
  }

  function broadcastOpenRooms() {
    broadcastToAll({ type: 'room:list', rooms: roomManager.listOpenRooms() });
  }

  function broadcastOpenGMRooms() {
    broadcastToAll({ type: 'gm:room_list', rooms: gmRoomManager.listRooms() });
  }

  function detachKickedUserSockets(code: string, kickedId: string) {
    const set = roomSockets.get(code);
    if (!set) return;
    for (const sock of Array.from(set)) {
      const m = socketMeta.get(sock);
      if (m && m.userId === kickedId) {
        set.delete(sock);
        m.roomCode = null;
        m.userId = null;
        m.authUserId = null;
      }
    }
  }

  function detachSocketFromRoom(ws: WebSocket, detachOptions?: { isDisconnect?: boolean }) {
    const meta = socketMeta.get(ws);
    if (!meta || !meta.roomCode) return;
    const prevCode = meta.roomCode;
    const prevUserId = meta.userId;

    const set = roomSockets.get(prevCode);
    if (set) {
      set.delete(ws);
      if (set.size === 0) roomSockets.delete(prevCode);
    }

    meta.roomCode = null;
    meta.userId = null;
    meta.authUserId = null;

    if (prevUserId) {
      void withRoomLock(prevCode, () => {
        const stillConnected = Array.from(roomSockets.get(prevCode) || []).some(
          (s) => socketMeta.get(s)?.userId === prevUserId
        );
        if (!stillConnected) {
          const { room } = roomManager.leaveRoom(prevCode, prevUserId, detachOptions);
          if (room) {
            broadcastRoomState(prevCode, 'room:state', false);
          }
          broadcastOpenRooms();
          scheduleSnapshotSave();
        }
      });
    }
  }

  function detachSocketFromGMRoom(ws: WebSocket) {
    for (const [code, set] of gmHostSockets.entries()) {
      if (set.delete(ws) && set.size === 0) {
        gmHostSockets.delete(code);
      }
    }
    for (const [code, map] of gmPlayerSockets.entries()) {
      if (map.delete(ws) && map.size === 0) {
        gmPlayerSockets.delete(code);
      }
    }
  }

  function broadcastGMRoomUpdates(rawCode: string) {
    const code = normalizeRoomCode(rawCode);
    const hostState = gmRoomManager.getHostState(code);
    if (!hostState) return;

    const hosts = gmHostSockets.get(code);
    if (hosts) {
      const payload = JSON.stringify({ type: 'gm:host_state', room: hostState });
      for (const sock of hosts) {
        if (sock.readyState === WebSocket.OPEN) {
          sock.send(payload);
        }
      }
    }

    const playersMap = gmPlayerSockets.get(code);
    if (playersMap) {
      for (const [sock, userId] of playersMap.entries()) {
        if (sock.readyState === WebSocket.OPEN) {
          const view = gmRoomManager.getPlayerView(code, userId);
          if (view) {
            sock.send(JSON.stringify({ type: 'gm:player_state', view }));
          }
        }
      }
    }
  }

  const apiRouter = createApiRouter({
    store: localStore,
    isNetlify: false,
    persistRooms: false,
    roomManager,
    gmRoomManager,
    withRoomLock,
    disableRateLimits: options.disableRateLimits,
    hooks: {
      onRoomMutated(code, kind, extra) {
        scheduleSnapshotSave();
        if (kind === 'deleted') {
          broadcastOpenRooms();
          return;
        }
        if (kind === 'kicked' && extra?.kickedId) {
          broadcastToRoom(code, {
            type: 'room:kicked',
            code,
            targetId: extra.kickedId,
            reason: 'Chủ phòng đã mời bạn ra khỏi phòng.',
          });
          detachKickedUserSockets(code, extra.kickedId);
          broadcastRoomState(code, 'room:state');
          broadcastOpenRooms();
          return;
        }
        if (kind === 'chat' && extra?.message) {
          broadcastChatToRoom(code, extra.message);
          return;
        }
        if (kind === 'prop' && extra?.propEvent) {
          broadcastToRoom(code, { type: 'room:prop', code, event: extra.propEvent });
          return;
        }
        if (kind === 'votes' && extra?.votes) {
          broadcastToRoom(code, { type: 'room:votes', code, votes: extra.votes });
          broadcastMatchStateOnly(code);
          return;
        }
        if (kind === 'match_started') {
          broadcastRoomState(code, 'room:match_started');
          broadcastOpenRooms();
          return;
        }
        broadcastRoomState(code, 'room:state');
        broadcastOpenRooms();
      },
      onGMRoomMutated(code) {
        scheduleSnapshotSave();
        broadcastGMRoomUpdates(code);
        broadcastOpenGMRooms();
      },
    },
  });

  app.use('/api', express.raw({ type: '*/*', limit: '100kb' }), async (req, res) => {
    try {
      const fullUrl = new URL(req.originalUrl, `http://${req.headers.host || 'localhost'}`);
      const headers = new Headers();
      for (const [key, val] of Object.entries(req.headers)) {
        if (typeof val === 'string') headers.set(key, val);
        else if (Array.isArray(val)) headers.set(key, val.join(', '));
      }
      const method = req.method.toUpperCase();
      const hasBody = method !== 'GET' && method !== 'HEAD';
      const rawBody =
        hasBody && Buffer.isBuffer(req.body) && req.body.length > 0
          ? new Uint8Array(req.body)
          : undefined;

      const webReq = new Request(fullUrl.toString(), {
        method,
        headers,
        body: rawBody,
      });

      const webRes = await apiRouter.handleRequest(webReq, {
        clientIp: req.ip || req.socket.remoteAddress || 'unknown',
      });

      res.status(webRes.status);
      webRes.headers.forEach((value, key) => {
        res.setHeader(key, value);
      });
      const text = await webRes.text();
      res.send(text);
    } catch {
      res.status(500).json({ ok: false, error: 'Lỗi xử lý API nội bộ.' });
    }
  });

  const sessionSecret = await resolveClusterSessionSecret(localStore);
  let viteServer: { close: () => Promise<void> } | null = null;

  if (options.attachVite) {
    const distPath = path.resolve(process.cwd(), 'dist');
    const hasDistBuild = fs.existsSync(path.join(distPath, 'index.html'));
    const isDevLifecycle = process.env.npm_lifecycle_event === 'dev';
    const shouldServeStatic =
      hasDistBuild && (!isDevLifecycle || process.env.NODE_ENV === 'production');

    if (!shouldServeStatic) {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      viteServer = vite;
      app.use(vite.middlewares);
    } else {
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  const httpServer = http.createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: '/ws', maxPayload: 64 * 1024 });

  wss.on('connection', (ws, req) => {
    const clientIp =
      String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
      req.socket.remoteAddress ||
      'unknown';
    socketMeta.set(ws, {
      roomCode: null,
      userId: null,
      authUserId: null,
      clientIp,
      isAlive: true,
    });

    ws.on('pong', () => {
      const m = socketMeta.get(ws);
      if (m) m.isAlive = true;
    });

    ws.on('message', (raw) => {
      let msg: Record<string, unknown>;
      try {
        const parsed = JSON.parse(String(raw));
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          sendJson(ws, { type: 'error', message: 'Invalid JSON message' });
          return;
        }
        msg = parsed as Record<string, unknown>;
      } catch {
        sendJson(ws, { type: 'error', message: 'Invalid JSON message' });
        return;
      }

      const type = String(msg.type || '');
      const lockCode = normalizeRoomCode(String(msg.code || socketMeta.get(ws)?.roomCode || ''));

      const handleRoomBoundMessage = () => {
        try {
          if (type === 'room:list') {
            sendJson(ws, { type: 'room:list', rooms: roomManager.listOpenRooms() });
            return;
          }

          if (type === 'room:join') {
            const code = normalizeRoomCode(String(msg.code || ''));
            const user = (msg.user || {}) as {
              id?: string;
              name?: string;
              avatar?: string;
              elo?: number;
            };
            if (!user.id || !user.name) {
              sendJson(ws, { type: 'error', message: 'Thiếu thông tin người chơi.' });
              return;
            }

            const cleanUserId = String(user.id).slice(0, 64);
            const rawAuthToken = typeof msg.authToken === 'string' ? msg.authToken.trim() : '';
            let verifiedAccountUserId: string | null = null;
            if (cleanUserId.startsWith('acc_')) {
              if (!rawAuthToken) {
                sendJson(ws, { type: 'error', message: 'Cần đăng nhập lại.' });
                return;
              }
              const session = verifySessionToken(rawAuthToken, sessionSecret);
              if (!session || session.userId !== cleanUserId) {
                sendJson(ws, { type: 'error', message: 'Phiên đăng nhập không hợp lệ.' });
                return;
              }
              verifiedAccountUserId = session.userId;
            }

            const meta = socketMeta.get(ws);
            const existingRoom = roomManager.getRoom(code);
            if (
              !existingRoom &&
              msg.createIfMissing !== false &&
              !checkWsRateBucket(
                wsRoomCreateRateMap,
                meta?.clientIp || 'unknown',
                WS_ROOM_CREATE_LIMIT,
                WS_ROOM_CREATE_WINDOW_MS
              )
            ) {
              sendJson(ws, {
                type: 'error',
                code: 'RATE_LIMITED',
                message: 'Bạn tạo phòng quá nhanh. Vui lòng thử lại sau ít phút.',
              });
              return;
            }

            const alreadyParticipant = Boolean(
              existingRoom?.participants.some((p) => !p.isBot && p.id === cleanUserId)
            );
            const providedSecret =
              typeof msg.playerSecret === 'string' ? msg.playerSecret.trim() : undefined;
            if (
              alreadyParticipant &&
              roomManager.hasPlayerSecret(code, cleanUserId) &&
              !roomManager.verifyPlayerSecret(code, cleanUserId, providedSecret) &&
              verifiedAccountUserId !== cleanUserId
            ) {
              sendJson(ws, {
                type: 'error',
                message: 'Người chơi này đang hoạt động trong phòng với phiên khác.',
              });
              return;
            }

            const existingSockets = roomSockets.get(code);
            if (existingSockets) {
              const conflictingSocket = Array.from(existingSockets).find(
                (s) =>
                  s !== ws &&
                  s.readyState === WebSocket.OPEN &&
                  socketMeta.get(s)?.userId === cleanUserId
              );
              if (conflictingSocket) {
                const conflictAuth = socketMeta.get(conflictingSocket)?.authUserId ?? null;
                const tokenMatches = Boolean(
                  verifiedAccountUserId &&
                    verifiedAccountUserId === cleanUserId &&
                    (!conflictAuth || conflictAuth === verifiedAccountUserId)
                );
                const secretMatches = Boolean(
                  providedSecret && roomManager.verifyPlayerSecret(code, cleanUserId, providedSecret)
                );
                if (!tokenMatches && !secretMatches) {
                  sendJson(ws, {
                    type: 'error',
                    message: 'Người chơi này đang hoạt động trong phòng trên một kết nối khác.',
                  });
                  return;
                }
                // Replace stale socket cleanly on authenticated reconnect
                existingSockets.delete(conflictingSocket);
                const oldMeta = socketMeta.get(conflictingSocket);
                if (oldMeta) {
                  oldMeta.roomCode = null;
                  oldMeta.userId = null;
                }
              }
            }

            const result = roomManager.createOrJoinRoom(
              code,
              {
                id: cleanUserId,
                name: String(user.name).slice(0, 40),
                avatar: String(user.avatar || '🐺').slice(0, 16),
                elo: Number(user.elo) || 1500,
              },
              {
                villageSize: typeof msg.villageSize === 'number' ? msg.villageSize : undefined,
                timerConfig:
                  msg.timerConfig && typeof msg.timerConfig === 'object'
                    ? (msg.timerConfig as {
                        nightActionSec?: number;
                        dayDiscussSec?: number;
                        dayVoteSec?: number;
                      })
                    : undefined,
                createIfMissing: msg.createIfMissing !== false,
                lang: msg.lang === 'en' ? 'en' : msg.lang === 'vi' ? 'vi' : undefined,
              }
            );

            if (!result.ok) {
              sendJson(ws, { type: 'error', message: result.error });
              return;
            }

            if (meta && meta.roomCode && meta.roomCode !== result.room.code) {
              detachSocketFromRoom(ws);
            }

            const playerSecret = roomManager.getOrIssuePlayerSecret(result.room.code, cleanUserId);

            if (meta) {
              meta.roomCode = result.room.code;
              meta.userId = cleanUserId;
              meta.authUserId = verifiedAccountUserId;
            }
            let set = roomSockets.get(result.room.code);
            if (!set) {
              set = new Set<WebSocket>();
              roomSockets.set(result.room.code, set);
            }
            set.add(ws);

            sendJson(ws, {
              type: 'room:joined',
              code: result.room.code,
              userId: cleanUserId,
              playerSecret,
            });
            broadcastRoomState(result.room.code, 'room:state');
            broadcastOpenRooms();
            scheduleSnapshotSave();
            return;
          }

          if (type === 'room:leave') {
            const targetCode = normalizeRoomCode(String(msg.code || ''));
            const currentCode = socketMeta.get(ws)?.roomCode;
            if (!targetCode || currentCode === targetCode) {
              detachSocketFromRoom(ws);
            }
            sendJson(ws, { type: 'room:list', rooms: roomManager.listOpenRooms() });
            return;
          }

          if (type === 'room:kick') {
            const code = normalizeRoomCode(String(msg.code || ''));
            const meta = requireBoundSocket(ws, code);
            if (!meta) return;
            const res = roomManager.kickParticipant(code, meta.userId!, String(msg.targetId || ''));
            if (!res.ok) {
              sendJson(ws, { type: 'error', message: res.error });
              return;
            }
            broadcastToRoom(code, {
              type: 'room:kicked',
              code,
              targetId: res.kickedId,
              reason: 'Chủ phòng đã mời bạn ra khỏi phòng.',
            });
            detachKickedUserSockets(code, res.kickedId);
            broadcastRoomState(code, 'room:state', false);
            broadcastOpenRooms();
            scheduleSnapshotSave();
            return;
          }

          if (type === 'room:add_bot') {
            const code = normalizeRoomCode(String(msg.code || ''));
            const meta = requireBoundSocket(ws, code);
            if (!meta) return;
            const res = roomManager.addBot(code, meta.userId!);
            if (!res.ok) {
              sendJson(ws, { type: 'error', message: res.error });
              return;
            }
            broadcastRoomState(code, 'room:state', false);
            broadcastOpenRooms();
            scheduleSnapshotSave();
            return;
          }

          if (type === 'room:fill_bots') {
            const code = normalizeRoomCode(String(msg.code || ''));
            const meta = requireBoundSocket(ws, code);
            if (!meta) return;
            const res = roomManager.fillBots(code, meta.userId!);
            if (!res.ok) {
              sendJson(ws, { type: 'error', message: res.error });
              return;
            }
            broadcastRoomState(code, 'room:state', false);
            broadcastOpenRooms();
            scheduleSnapshotSave();
            return;
          }

          if (type === 'room:config') {
            const code = normalizeRoomCode(String(msg.code || ''));
            const meta = requireBoundSocket(ws, code);
            if (!meta) return;
            const config = (msg.config || {}) as {
              villageSize?: number;
              timerConfig?: { nightActionSec?: number; dayDiscussSec?: number; dayVoteSec?: number };
            };
            const res = roomManager.updateConfig(code, meta.userId!, config);
            if (!res.ok) {
              sendJson(ws, { type: 'error', message: res.error });
              return;
            }
            broadcastRoomState(code, 'room:state', false);
            broadcastOpenRooms();
            scheduleSnapshotSave();
            return;
          }

          if (type === 'room:start') {
            const code = normalizeRoomCode(String(msg.code || ''));
            const meta = requireBoundSocket(ws, code);
            if (!meta) return;
            const res = roomManager.startMatch(code, meta.userId!);
            if (!res.ok) {
              sendJson(ws, { type: 'error', message: res.error });
              return;
            }
            broadcastRoomState(code, 'room:match_started');
            broadcastOpenRooms();
            scheduleSnapshotSave();
            return;
          }

          if (type === 'room:restart') {
            const code = normalizeRoomCode(String(msg.code || ''));
            const meta = requireBoundSocket(ws, code);
            if (!meta) return;
            const res = roomManager.restartMatch(code, meta.userId!);
            if (!res.ok) {
              sendJson(ws, { type: 'error', message: res.error });
              return;
            }
            broadcastRoomState(code, 'room:match_started');
            broadcastOpenRooms();
            scheduleSnapshotSave();
            return;
          }

          if (type === 'room:night_action') {
            const code = normalizeRoomCode(String(msg.code || ''));
            const meta = requireBoundSocket(ws, code);
            if (!meta) return;
            const actionObj = (msg.action && typeof msg.action === 'object'
              ? msg.action
              : msg) as Record<string, unknown>;
            const actionType = String(actionObj.actionType || '') as OnlineNightActionType;
            if (!VALID_NIGHT_ACTIONS.has(actionType)) {
              sendJson(ws, { type: 'error', message: 'Loại hành động đêm không hợp lệ.' });
              return;
            }
            const res = roomManager.submitNightAction(code, meta.userId!, {
              actionType,
              targetId:
                actionObj.targetId === null || actionObj.targetId === undefined
                  ? null
                  : String(actionObj.targetId).slice(0, 64),
              secondTargetId:
                actionObj.secondTargetId === null || actionObj.secondTargetId === undefined
                  ? null
                  : String(actionObj.secondTargetId).slice(0, 64),
            });
            if (!res.ok) {
              sendJson(ws, { type: 'error', message: res.error });
              return;
            }
            applyEloIfNeeded(code, res.eloUpdates);
            broadcastRoomState(code, 'room:state');
            scheduleSnapshotSave();
            return;
          }

          if (type === 'room:advance_phase') {
            const code = normalizeRoomCode(String(msg.code || ''));
            const meta = requireBoundSocket(ws, code);
            if (!meta) return;
            const expectedStepIndex =
              typeof msg.expectedStepIndex === 'number' && !Number.isNaN(msg.expectedStepIndex)
                ? msg.expectedStepIndex
                : undefined;
            const res = roomManager.advancePhase(code, meta.userId!, Date.now(), expectedStepIndex);
            if (!res.ok) {
              sendJson(ws, { type: 'error', message: res.error });
              return;
            }
            applyEloIfNeeded(code, res.eloUpdates);
            broadcastRoomState(code, 'room:state');
            scheduleSnapshotSave();
            return;
          }

          if (type === 'room:set_lang') {
            const code = normalizeRoomCode(String(msg.code || ''));
            const meta = requireBoundSocket(ws, code);
            if (!meta) return;
            const nextLang = msg.lang === 'en' ? 'en' : 'vi';
            roomManager.setParticipantLang(code, meta.userId!, nextLang);
            const now = Date.now();
            const view = roomManager.getMatchViewForUser(code, meta.userId!, now);
            if (view) {
              sendJson(ws, { type: 'room:match_state', code, view, serverNow: now });
            }
            return;
          }

          if (type === 'room:chat') {
            const code = normalizeRoomCode(String(msg.code || ''));
            const meta = requireBoundSocket(ws, code);
            if (!meta) return;
            if (
              !checkWsRateBucket(
                wsChatRateMap,
                `${code}:${meta.userId}`,
                WS_CHAT_LIMIT,
                WS_CHAT_WINDOW_MS
              )
            ) {
              sendJson(ws, {
                type: 'error',
                code: 'RATE_LIMITED',
                message: 'Bạn gửi tin nhắn quá nhanh. Vui lòng chờ vài giây.',
              });
              return;
            }
            const rawMsg = (msg.message && typeof msg.message === 'object'
              ? msg.message
              : {}) as Partial<RealtimeChatMessage>;
            const res = roomManager.postChat(code, {
              id: String(rawMsg.id || ''),
              senderId: meta.userId!,
              senderName: String(rawMsg.senderName || 'Player'),
              text: String(rawMsg.text || ''),
              timestamp: typeof rawMsg.timestamp === 'number' ? rawMsg.timestamp : Date.now(),
              isGhost: Boolean(rawMsg.isGhost),
              isSystem: false,
            });
            if (!res.ok) {
              sendJson(ws, { type: 'error', message: res.error });
              return;
            }
            broadcastChatToRoom(code, res.message);
            scheduleSnapshotSave();
            return;
          }

          if (type === 'room:prop') {
            const code = normalizeRoomCode(String(msg.code || ''));
            const meta = requireBoundSocket(ws, code);
            if (!meta) return;
            const ev = msg.event as RealtimePropEvent;
            if (!ev || !ev.targetPlayerId || !VALID_PROP_TYPES.has(ev.propType)) {
              return;
            }
            const propEvent: RealtimePropEvent = {
              id: String(ev.id || `prop_${Date.now()}`),
              propType: ev.propType,
              fromPlayerId: meta.userId!,
              targetPlayerId: String(ev.targetPlayerId).slice(0, 64),
              timestamp: Date.now(),
            };
            const res = roomManager.recordProp(code, propEvent);
            if (!res.ok) {
              sendJson(ws, { type: 'error', message: res.error });
              return;
            }
            broadcastToRoom(code, { type: 'room:prop', code, event: propEvent });
            scheduleSnapshotSave();
            return;
          }

          if (type === 'room:vote') {
            const code = normalizeRoomCode(String(msg.code || ''));
            const meta = requireBoundSocket(ws, code);
            if (!meta) return;
            const res = roomManager.castVote(code, meta.userId!, String(msg.targetId || ''));
            if (!res.ok) {
              sendJson(ws, { type: 'error', message: res.error });
              return;
            }
            broadcastToRoom(code, { type: 'room:votes', code, votes: res.votes });
            broadcastMatchStateOnly(code);
            scheduleSnapshotSave();
            return;
          }

          if (type === 'gm:subscribe_host') {
            const code = normalizeRoomCode(String(msg.code || ''));
            const hostSecret =
              typeof msg.hostSecret === 'string' ? msg.hostSecret.trim() : undefined;
            if (code.length < 3) return;
            if (!gmRoomManager.verifyHostSecret(code, hostSecret)) {
              sendJson(ws, {
                type: 'error',
                message: 'Chỉ Quản Trò sở hữu phòng mới có quyền theo dõi toàn bộ vai trò.',
              });
              return;
            }
            detachSocketFromGMRoom(ws);
            let set = gmHostSockets.get(code);
            if (!set) {
              set = new Set<WebSocket>();
              gmHostSockets.set(code, set);
            }
            set.add(ws);
            const hostState = gmRoomManager.getHostState(code);
            if (hostState) {
              sendJson(ws, { type: 'gm:host_state', room: hostState });
            }
            return;
          }

          if (type === 'gm:subscribe_player') {
            const code = normalizeRoomCode(String(msg.code || ''));
            const userId = String(msg.userId || '').trim().slice(0, 64);
            const playerToken =
              typeof msg.playerToken === 'string' ? msg.playerToken.trim() : undefined;
            if (code.length < 3 || !userId) return;
            if (
              gmRoomManager.hasPlayerToken(code, userId) &&
              !gmRoomManager.verifyPlayerToken(code, userId, playerToken)
            ) {
              sendJson(ws, { type: 'error', message: 'Mã xác thực người chơi không hợp lệ.' });
              return;
            }
            detachSocketFromGMRoom(ws);
            let map = gmPlayerSockets.get(code);
            if (!map) {
              map = new Map<WebSocket, string>();
              gmPlayerSockets.set(code, map);
            }
            map.set(ws, userId);
            const view = gmRoomManager.getPlayerView(code, userId);
            if (view) {
              sendJson(ws, { type: 'gm:player_state', view });
            }
            return;
          }

          if (type === 'gm:unsubscribe') {
            detachSocketFromGMRoom(ws);
            return;
          }
        } catch {
          sendJson(ws, { type: 'error', message: 'Internal message error' });
        }
      };

      if (type.startsWith('room:') && lockCode) {
        void withRoomLock(lockCode, handleRoomBoundMessage);
      } else {
        handleRoomBoundMessage();
      }
    });

    ws.on('close', () => {
      detachSocketFromRoom(ws, { isDisconnect: true });
      detachSocketFromGMRoom(ws);
      socketMeta.delete(ws);
    });
  });

  // Authoritative server tick for active Online 3D matches & host disconnect grace transfers
  const matchTickInterval = setInterval(() => {
    const now = Date.now();
    const openRooms = roomManager.listOpenRooms();
    for (const summary of openRooms) {
      void withRoomLock(summary.code, () => {
        const res = roomManager.tickRoom(summary.code, now);
        if (!res.changed) return;
        if (res.deleted) {
          broadcastOpenRooms();
          scheduleSnapshotSave();
          return;
        }
        applyEloIfNeeded(summary.code, res.eloUpdates);
        broadcastRoomState(summary.code, 'room:state');
        broadcastOpenRooms();
        scheduleSnapshotSave();
      });
    }
  }, tickIntervalMs);

  // Periodic heartbeat to clean up broken sockets
  const heartbeatInterval = setInterval(() => {
    for (const [sock, meta] of socketMeta.entries()) {
      if (!meta.isAlive) {
        detachSocketFromRoom(sock, { isDisconnect: true });
        detachSocketFromGMRoom(sock);
        socketMeta.delete(sock);
        sock.terminate();
        continue;
      }
      meta.isAlive = false;
      try {
        sock.ping();
      } catch {
        // ignore
      }
    }
  }, 30000);

  wss.on('close', () => {
    clearInterval(matchTickInterval);
    clearInterval(heartbeatInterval);
  });

  await new Promise<void>((resolve, reject) => {
    httpServer.once('error', reject);
    httpServer.listen(port, host, () => {
      httpServer.off('error', reject);
      resolve();
    });
  });

  const boundAddr = httpServer.address() as AddressInfo | null;
  const actualPort = boundAddr?.port ?? port;
  const connectHost = host === '0.0.0.0' ? '127.0.0.1' : host;

  if (!options.quiet) {
    console.log(
      `Werewolf 3D Server + Secure Auth API + Online Match Engine + Realtime WS (/ws) listening on http://${host}:${actualPort}`
    );
  }

  let closed = false;
  async function close(): Promise<void> {
    if (closed) return;
    closed = true;
    clearInterval(matchTickInterval);
    clearInterval(heartbeatInterval);
    flushSnapshotsNow();
    for (const sock of wss.clients) {
      try {
        sock.terminate();
      } catch {
        // ignore
      }
    }
    await new Promise<void>((resolve) => wss.close(() => resolve()));
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
    if (viteServer) {
      await viteServer.close();
    }
  }

  return {
    app,
    httpServer,
    wss,
    port: actualPort,
    baseUrl: `http://${connectHost}:${actualPort}`,
    wsUrl: `ws://${connectHost}:${actualPort}/ws`,
    roomManager,
    gmRoomManager,
    flushSnapshotsNow,
    close,
  };
}
