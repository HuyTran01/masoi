import express from 'express';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { WebSocketServer, WebSocket } from 'ws';
import {
  applyOnlineMatchEloUpdates,
  resolveClusterSessionSecret,
  verifySessionToken,
} from './src/server/auth.ts';
import {
  normalizeRoomCode,
  type RealtimeChatMessage,
  type RealtimePropEvent,
  RealtimeRoomManager,
} from './src/server/realtimeRooms.ts';
import { GMRoomManager } from './src/server/gmRooms.ts';
import { createLocalNodeStateStore } from './src/server/stateStore.ts';
import { createApiRouter } from './src/server/apiRouter.ts';
import type {
  EloUpdateEntry,
  OnlineNightActionType,
} from './src/server/onlineMatchEngine.ts';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const ACCOUNTS_DB_PATH = path.resolve(process.cwd(), '.accounts_db.json');

const localStore = createLocalNodeStateStore(ACCOUNTS_DB_PATH);
const roomManager = new RealtimeRoomManager();
const gmRoomManager = new GMRoomManager();

// =========================================================================
// REAL-TIME MULTIPLAYER WEBSOCKET SERVER (/ws)
// =========================================================================
interface SocketMeta {
  roomCode: string | null;
  userId: string | null;
  authUserId: string | null;
  isAlive: boolean;
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

function detachSocketFromRoom(ws: WebSocket, options?: { isDisconnect?: boolean }) {
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
    const stillConnected = Array.from(roomSockets.get(prevCode) || []).some(
      (s) => socketMeta.get(s)?.userId === prevUserId
    );
    if (!stillConnected) {
      const { room } = roomManager.leaveRoom(prevCode, prevUserId, options);
      if (room) {
        broadcastRoomState(prevCode, 'room:state', false);
      }
      broadcastOpenRooms();
    }
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

// =========================================================================
// SHARED /api/* ROUTER (identical endpoints on Node Express & Netlify)
// =========================================================================
const apiRouter = createApiRouter({
  store: localStore,
  isNetlify: false,
  persistRooms: false,
  roomManager,
  gmRoomManager,
  hooks: {
    onRoomMutated(code, kind, extra) {
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

async function startServer() {
  const sessionSecret = await resolveClusterSessionSecret(localStore);
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
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const httpServer = http.createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: '/ws', maxPayload: 64 * 1024 });

  wss.on('connection', (ws) => {
    socketMeta.set(ws, { roomCode: null, userId: null, authUserId: null, isAlive: true });

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

      try {
        const type = String(msg.type || '');

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

          const existingRoom = roomManager.getRoom(code);
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
              if (!tokenMatches) {
                sendJson(ws, {
                  type: 'error',
                  message: 'Người chơi này đang hoạt động trong phòng trên một kết nối khác.',
                });
                return;
              }
            }
          }

          const meta = socketMeta.get(ws);

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
                  ? (msg.timerConfig as { nightActionSec?: number; dayDiscussSec?: number; dayVoteSec?: number })
                  : undefined,
              createIfMissing: msg.createIfMissing !== false,
            }
          );

          if (!result.ok) {
            sendJson(ws, { type: 'error', message: result.error });
            return;
          }

          // Only leave the previous room after the new join succeeds so failed room codes keep the active room intact.
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
          return;
        }

        if (type === 'room:chat') {
          const code = normalizeRoomCode(String(msg.code || ''));
          const meta = requireBoundSocket(ws, code);
          if (!meta) return;
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
          return;
        }

        if (type === 'gm:subscribe_host') {
          const code = normalizeRoomCode(String(msg.code || ''));
          const hostSecret = typeof msg.hostSecret === 'string' ? msg.hostSecret.trim() : undefined;
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
    });

    ws.on('close', () => {
      detachSocketFromRoom(ws, { isDisconnect: true });
      detachSocketFromGMRoom(ws);
      socketMeta.delete(ws);
    });
  });

  // 1-second authoritative server tick for active Online 3D matches
  const matchTickInterval = setInterval(() => {
    const changed = roomManager.tickDueRooms(Date.now());
    for (const item of changed) {
      applyEloIfNeeded(item.code, item.eloUpdates);
      broadcastRoomState(item.code, 'room:state');
    }
  }, 1000);

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

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(
      `Werewolf 3D Server + Secure Auth API + Online Match Engine + Realtime WS (/ws) listening on http://0.0.0.0:${PORT}`
    );
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
