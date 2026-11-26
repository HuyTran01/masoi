import express from 'express';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { WebSocketServer, WebSocket } from 'ws';
import {
  type DatabaseAccountRecord,
  extractBearerToken,
  hashPassword,
  needsPasswordRehash,
  readAccountsDb,
  signSessionToken,
  toPublicAccount,
  verifyPassword,
  verifySessionToken,
  writeAccountsDb,
} from './src/server/auth.ts';
import {
  normalizeRoomCode,
  type RealtimeChatMessage,
  type RealtimePropEvent,
  RealtimeRoomManager,
} from './src/server/realtimeRooms.ts';
import { GMRoomManager } from './src/server/gmRooms.ts';

dotenv.config();

const app = express();
app.use(express.json({ limit: '100kb' }));

const PORT = Number(process.env.PORT) || 3000;
const ACCOUNTS_DB_PATH = path.resolve(process.cwd(), '.accounts_db.json');

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

/**
 * 1. GET /api/accounts/list
 * Returns registered public player summaries (never password hashes).
 */
app.get('/api/accounts/list', (_req, res) => {
  const accounts = readAccountsDb(ACCOUNTS_DB_PATH).map(toPublicAccount);
  res.json({ ok: true, accounts });
});

/**
 * 2. GET /api/accounts/me
 * Validates the signed Bearer token and returns the authenticated user's profile.
 */
app.get('/api/accounts/me', (req, res) => {
  const token = extractBearerToken(req.headers.authorization);
  const session = token ? verifySessionToken(token) : null;
  if (!session) {
    res.status(401).json({
      ok: false,
      code: 'UNAUTHORIZED',
      error: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.',
    });
    return;
  }
  const accounts = readAccountsDb(ACCOUNTS_DB_PATH);
  const found = accounts.find((a) => a.username.toLowerCase() === session.username);
  if (!found) {
    res.status(404).json({ ok: false, code: 'ACCOUNT_NOT_FOUND', error: 'Tài khoản không tồn tại.' });
    return;
  }
  res.json({ ok: true, account: toPublicAccount(found) });
});

/**
 * 3. POST /api/accounts/register
 * Registers a new account with salted scrypt password hashing and returns a signed Bearer token.
 */
app.post('/api/accounts/register', (req, res) => {
  const body = req.body || {};
  const rawUsername = String(body.username || '').trim().toLowerCase();
  const password = String(body.password || '');
  const displayName = String(body.displayName || '').trim();
  const avatar = String(body.avatar || '🐺').trim().slice(0, 16) || '🐺';
  const region: 'VN' | 'SEA' | 'GLOBAL' =
    body.region === 'SEA' ? 'SEA' : body.region === 'GLOBAL' ? 'GLOBAL' : 'VN';

  if (rawUsername.length < 3 || rawUsername.length > 32 || !/^[a-z0-9_.\-@]+$/.test(rawUsername)) {
    res.status(400).json({
      ok: false,
      code: 'INVALID_USERNAME',
      error: 'Tên đăng nhập phải từ 3–32 ký tự (chữ cái, số, _, ., - hoặc @).',
    });
    return;
  }

  if (password.length < 6) {
    res.status(400).json({
      ok: false,
      code: 'INVALID_PASSWORD',
      error: 'Mật khẩu phải có tối thiểu 6 ký tự.',
    });
    return;
  }

  if (displayName.length < 2 || displayName.length > 40) {
    res.status(400).json({
      ok: false,
      code: 'INVALID_DISPLAY_NAME',
      error: 'Tên hiển thị trong Làng 3D phải từ 2–40 ký tự.',
    });
    return;
  }

  const accounts = readAccountsDb(ACCOUNTS_DB_PATH);
  const exists = accounts.some((a) => a.username.toLowerCase() === rawUsername);
  if (exists) {
    res.status(409).json({
      ok: false,
      code: 'USERNAME_TAKEN',
      error: 'Tên tài khoản này đã tồn tại! Vui lòng chọn tên khác hoặc chuyển sang Đăng Nhập.',
    });
    return;
  }

  const now = Date.now();
  const newAccount: DatabaseAccountRecord = {
    id: `acc_${rawUsername.replace(/[^a-z0-9]/g, '')}_${now.toString(36)}`,
    username: rawUsername,
    passwordHash: hashPassword(password),
    displayName,
    avatar,
    region,
    elo: 1620,
    matchesPlayed: 0,
    wins: 0,
    createdAt: now,
    updatedAt: now,
  };

  // Preserve all registered accounts without silent truncation
  const updated = [newAccount, ...accounts];
  writeAccountsDb(ACCOUNTS_DB_PATH, updated);

  const token = signSessionToken({ userId: newAccount.id, username: newAccount.username });

  res.json({
    ok: true,
    token,
    account: toPublicAccount(newAccount),
    accounts: updated.map(toPublicAccount),
  });
});

/**
 * 4. POST /api/accounts/login
 * Verifies username + password in constant time (no bypasses) and returns a signed Bearer token.
 */
app.post('/api/accounts/login', (req, res) => {
  const body = req.body || {};
  const rawUsername = String(body.username || '').trim().toLowerCase();
  const password = String(body.password || '');

  if (!rawUsername || !password) {
    res.status(400).json({
      ok: false,
      code: 'MISSING_CREDENTIALS',
      error: 'Vui lòng nhập đầy đủ Tên tài khoản và Mật khẩu.',
    });
    return;
  }

  const accounts = readAccountsDb(ACCOUNTS_DB_PATH);
  const foundIdx = accounts.findIndex((a) => a.username.toLowerCase() === rawUsername);
  if (foundIdx === -1) {
    res.status(401).json({
      ok: false,
      code: 'INVALID_CREDENTIALS',
      error: 'Tài khoản hoặc mật khẩu không chính xác.',
    });
    return;
  }

  const account = accounts[foundIdx];
  if (!verifyPassword(password, account.passwordHash)) {
    res.status(401).json({
      ok: false,
      code: 'INVALID_CREDENTIALS',
      error: 'Tài khoản hoặc mật khẩu không chính xác.',
    });
    return;
  }

  // Transparently upgrade legacy SHA-256 hashes to per-user salted scrypt on login
  if (needsPasswordRehash(account.passwordHash)) {
    account.passwordHash = hashPassword(password);
  }
  account.updatedAt = Date.now();
  accounts[foundIdx] = account;
  writeAccountsDb(ACCOUNTS_DB_PATH, accounts);

  const token = signSessionToken({ userId: account.id, username: account.username });

  res.json({
    ok: true,
    token,
    account: toPublicAccount(account),
    accounts: accounts.map(toPublicAccount),
  });
});

/**
 * 5. POST /api/accounts/update
 * Requires a valid signed Bearer token and strictly enforces account ownership.
 */
app.post('/api/accounts/update', (req, res) => {
  const token = extractBearerToken(req.headers.authorization);
  const session = token ? verifySessionToken(token) : null;
  if (!session) {
    res.status(401).json({
      ok: false,
      code: 'UNAUTHORIZED',
      error: 'Bạn cần đăng nhập để cập nhật hồ sơ.',
    });
    return;
  }

  const body = req.body || {};
  const rawUsername = String(body.username || session.username).trim().toLowerCase();
  if (rawUsername !== session.username) {
    res.status(403).json({
      ok: false,
      code: 'FORBIDDEN',
      error: 'Bạn không có quyền chỉnh sửa tài khoản của người khác.',
    });
    return;
  }

  const accounts = readAccountsDb(ACCOUNTS_DB_PATH);
  const idx = accounts.findIndex((a) => a.username.toLowerCase() === session.username);
  if (idx === -1) {
    res.status(404).json({
      ok: false,
      code: 'ACCOUNT_NOT_FOUND',
      error: 'Không tìm thấy tài khoản cần cập nhật.',
    });
    return;
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
    // Clamp ELO change per update to prevent arbitrary inflation
    const clampedDelta = Math.max(-80, Math.min(80, Math.round(body.elo - current.elo)));
    current.elo = Math.max(0, Math.min(10000, current.elo + clampedDelta));
  }
  if (typeof body.matchesPlayed === 'number' && !Number.isNaN(body.matchesPlayed)) {
    current.matchesPlayed = Math.max(current.matchesPlayed, Math.min(current.matchesPlayed + 1, Math.round(body.matchesPlayed)));
  }
  if (typeof body.wins === 'number' && !Number.isNaN(body.wins)) {
    current.wins = Math.max(current.wins, Math.min(current.wins + 1, Math.round(body.wins)));
  }

  current.updatedAt = Date.now();
  accounts[idx] = current;
  writeAccountsDb(ACCOUNTS_DB_PATH, accounts);

  res.json({
    ok: true,
    account: toPublicAccount(current),
    accounts: accounts.map(toPublicAccount),
  });
});

// =========================================================================
// REAL-TIME MULTIPLAYER WEBSOCKET SERVER (/ws)
// =========================================================================
const roomManager = new RealtimeRoomManager();

interface SocketMeta {
  roomCode: string | null;
  userId: string | null;
  isAlive: boolean;
}

const socketMeta = new Map<WebSocket, SocketMeta>();
const roomSockets = new Map<string, Set<WebSocket>>();

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

function detachSocketFromRoom(ws: WebSocket) {
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

  if (prevUserId) {
    // Only leave room if no other active socket belongs to the same userId in that room
    const stillConnected = Array.from(roomSockets.get(prevCode) || []).some(
      (s) => socketMeta.get(s)?.userId === prevUserId
    );
    if (!stillConnected) {
      const { room } = roomManager.leaveRoom(prevCode, prevUserId);
      if (room) {
        broadcastToRoom(prevCode, { type: 'room:state', room });
      }
      broadcastOpenRooms();
    }
  }
}

const gmRoomManager = new GMRoomManager();
const gmHostSockets = new Map<string, Set<WebSocket>>();
const gmPlayerSockets = new Map<string, Map<WebSocket, string>>();

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

app.get('/api/rooms', (_req, res) => {
  res.json({ ok: true, rooms: roomManager.listOpenRooms() });
});

app.get('/api/gm-rooms', (_req, res) => {
  res.json({ ok: true, rooms: gmRoomManager.listRooms() });
});

app.post('/api/gm-rooms/:code/sync', (req, res) => {
  const code = normalizeRoomCode(req.params.code);
  const body = req.body || {};
  const hostId = String(body.hostId || 'gm_host');
  const result = gmRoomManager.syncFromHost(code, hostId, {
    deckMode: body.deckMode,
    status: body.status,
    round: typeof body.round === 'number' ? body.round : undefined,
    phase: body.phase,
    seats: Array.isArray(body.seats) ? body.seats : undefined,
    playerCount: typeof body.playerCount === 'number' ? body.playerCount : undefined,
    resetMatch: Boolean(body.resetMatch),
  });
  if (!result.ok) {
    res.status(result.error.includes('Chỉ Quản Trò') ? 403 : 400).json(result);
    return;
  }
  broadcastGMRoomUpdates(result.room.code);
  broadcastOpenGMRooms();
  res.json(result);
});

app.get('/api/gm-rooms/:code/exists', (req, res) => {
  const room = gmRoomManager.getHostState(req.params.code);
  if (!room) {
    res.json({ ok: true, exists: false });
    return;
  }
  res.json({
    ok: true,
    exists: true,
    code: room.code,
    deckMode: room.deckMode,
    status: room.status,
  });
});

app.get('/api/gm-rooms/:code/host', (req, res) => {
  const room = gmRoomManager.getHostState(req.params.code);
  if (!room) {
    res.status(404).json({ ok: false, error: 'Không tìm thấy phòng Quản Trò.' });
    return;
  }
  res.json({ ok: true, room });
});

app.post('/api/gm-rooms/:code/join', (req, res) => {
  const code = normalizeRoomCode(req.params.code);
  const body = req.body || {};
  const user = (body.user || {}) as { id?: string; name?: string; avatar?: string };
  const result = gmRoomManager.joinAsPlayer(
    code,
    {
      id: String(user.id || ''),
      name: String(user.name || ''),
      avatar: typeof user.avatar === 'string' ? user.avatar : undefined,
    },
    { seatId: typeof body.seatId === 'string' ? body.seatId : undefined }
  );
  if (!result.ok) {
    res.status(400).json(result);
    return;
  }
  broadcastGMRoomUpdates(code);
  broadcastOpenGMRooms();
  res.json({ ok: true, view: result.view });
});

app.post('/api/gm-rooms/:code/leave', (req, res) => {
  const code = normalizeRoomCode(req.params.code);
  const body = req.body || {};
  const result = gmRoomManager.leaveAsPlayer(code, String(body.userId || ''));
  if (!result.ok) {
    res.status(400).json(result);
    return;
  }
  broadcastGMRoomUpdates(code);
  broadcastOpenGMRooms();
  res.json({ ok: true });
});

app.post('/api/gm-rooms/:code/self-role', (req, res) => {
  const code = normalizeRoomCode(req.params.code);
  const body = req.body || {};
  const result = gmRoomManager.submitSelfRole(
    code,
    String(body.userId || ''),
    body.roleId
  );
  if (!result.ok) {
    res.status(400).json(result);
    return;
  }
  broadcastGMRoomUpdates(code);
  res.json({ ok: true, view: result.view });
});

app.get('/api/gm-rooms/:code/player/:userId', (req, res) => {
  const view = gmRoomManager.getPlayerView(req.params.code, req.params.userId);
  if (!view) {
    res.status(404).json({ ok: false, error: 'Không tìm thấy phòng Quản Trò.' });
    return;
  }
  res.json({ ok: true, view });
});

async function startServer() {
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
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws) => {
    socketMeta.set(ws, { roomCode: null, userId: null, isAlive: true });

    ws.on('pong', () => {
      const m = socketMeta.get(ws);
      if (m) m.isAlive = true;
    });

    ws.on('message', (raw) => {
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(String(raw));
      } catch {
        sendJson(ws, { type: 'error', message: 'Invalid JSON message' });
        return;
      }

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

        const meta = socketMeta.get(ws);
        if (meta && meta.roomCode && meta.roomCode !== code) {
          detachSocketFromRoom(ws);
        }

        const result = roomManager.createOrJoinRoom(
          code,
          {
            id: String(user.id).slice(0, 64),
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

        if (meta) {
          meta.roomCode = result.room.code;
          meta.userId = String(user.id).slice(0, 64);
        }
        let set = roomSockets.get(result.room.code);
        if (!set) {
          set = new Set<WebSocket>();
          roomSockets.set(result.room.code, set);
        }
        set.add(ws);

        broadcastToRoom(result.room.code, { type: 'room:state', room: result.room });
        broadcastOpenRooms();
        return;
      }

      if (type === 'room:leave') {
        detachSocketFromRoom(ws);
        sendJson(ws, { type: 'room:list', rooms: roomManager.listOpenRooms() });
        return;
      }

      if (type === 'room:kick') {
        const code = normalizeRoomCode(String(msg.code || ''));
        const actorId = socketMeta.get(ws)?.userId || '';
        const res = roomManager.kickParticipant(
          code,
          actorId,
          String(msg.targetId || '')
        );
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
        // Detach kicked user's socket(s) from this room cleanly
        const set = roomSockets.get(code);
        if (set) {
          for (const sock of Array.from(set)) {
            const m = socketMeta.get(sock);
            if (m && m.userId === res.kickedId) {
              set.delete(sock);
              m.roomCode = null;
              m.userId = null;
            }
          }
        }
        broadcastToRoom(code, { type: 'room:state', room: res.room });
        broadcastOpenRooms();
        return;
      }

      if (type === 'room:add_bot') {
        const code = normalizeRoomCode(String(msg.code || ''));
        const actorId = socketMeta.get(ws)?.userId || '';
        const res = roomManager.addBot(code, actorId);
        if (!res.ok) {
          sendJson(ws, { type: 'error', message: res.error });
          return;
        }
        broadcastToRoom(code, { type: 'room:state', room: res.room });
        broadcastOpenRooms();
        return;
      }

      if (type === 'room:fill_bots') {
        const code = normalizeRoomCode(String(msg.code || ''));
        const actorId = socketMeta.get(ws)?.userId || '';
        const res = roomManager.fillBots(code, actorId);
        if (!res.ok) {
          sendJson(ws, { type: 'error', message: res.error });
          return;
        }
        broadcastToRoom(code, { type: 'room:state', room: res.room });
        broadcastOpenRooms();
        return;
      }

      if (type === 'room:config') {
        const code = normalizeRoomCode(String(msg.code || ''));
        const actorId = socketMeta.get(ws)?.userId || '';
        const config = (msg.config || {}) as {
          villageSize?: number;
          timerConfig?: { nightActionSec?: number; dayDiscussSec?: number; dayVoteSec?: number };
        };
        const res = roomManager.updateConfig(code, actorId, config);
        if (!res.ok) {
          sendJson(ws, { type: 'error', message: res.error });
          return;
        }
        broadcastToRoom(code, { type: 'room:state', room: res.room });
        broadcastOpenRooms();
        return;
      }

      if (type === 'room:start') {
        const code = normalizeRoomCode(String(msg.code || ''));
        const actorId = socketMeta.get(ws)?.userId || '';
        const res = roomManager.startMatch(code, actorId);
        if (!res.ok) {
          sendJson(ws, { type: 'error', message: res.error });
          return;
        }
        broadcastToRoom(code, { type: 'room:match_started', room: res.room });
        broadcastOpenRooms();
        return;
      }

      if (type === 'room:chat') {
        const code = normalizeRoomCode(String(msg.code || ''));
        const message = msg.message as RealtimeChatMessage;
        const res = roomManager.postChat(code, message);
        if (!res.ok) {
          sendJson(ws, { type: 'error', message: res.error });
          return;
        }
        broadcastToRoom(code, { type: 'room:chat', code, message: res.message });
        return;
      }

      if (type === 'room:prop') {
        const code = normalizeRoomCode(String(msg.code || ''));
        const ev = msg.event as RealtimePropEvent;
        if (!ev || !ev.targetPlayerId || !['tomato', 'rose', 'egg'].includes(ev.propType)) {
          return;
        }
        broadcastToRoom(code, {
          type: 'room:prop',
          code,
          event: {
            id: String(ev.id || `prop_${Date.now()}`),
            propType: ev.propType,
            fromPlayerId: String(ev.fromPlayerId || ''),
            targetPlayerId: String(ev.targetPlayerId),
            timestamp: Date.now(),
          },
        });
        return;
      }

      if (type === 'room:vote') {
        const code = normalizeRoomCode(String(msg.code || ''));
        const res = roomManager.castVote(
          code,
          String(msg.voterId || ''),
          String(msg.targetId || '')
        );
        if (res.ok) {
          broadcastToRoom(code, { type: 'room:votes', code, votes: res.votes });
        }
        return;
      }

      if (type === 'gm:subscribe_host') {
        const code = normalizeRoomCode(String(msg.code || ''));
        if (code.length < 3) return;
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
        if (code.length < 3 || !userId) return;
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
    });

    ws.on('close', () => {
      detachSocketFromRoom(ws);
      detachSocketFromGMRoom(ws);
      socketMeta.delete(ws);
    });
  });

  // Periodic heartbeat to clean up broken sockets
  const heartbeatInterval = setInterval(() => {
    for (const [sock, meta] of socketMeta.entries()) {
      if (!meta.isAlive) {
        detachSocketFromRoom(sock);
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

  wss.on('close', () => clearInterval(heartbeatInterval));

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(
      `Werewolf 3D Server + Secure Auth API + Realtime WS (/ws) listening on http://0.0.0.0:${PORT}`
    );
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
