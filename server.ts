import express from 'express';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { WebSocketServer, WebSocket } from 'ws';
import {
  type DatabaseAccountRecord,
  extractBearerToken,
  hashPasswordAsync,
  needsPasswordRehash,
  readAccountsDb,
  signSessionToken,
  toPublicAccount,
  verifyPasswordAsync,
  verifySessionToken,
  writeAccountsDb,
} from './src/server/auth.ts';
import {
  normalizeRoomCode,
  type RealtimeChatMessage,
  type RealtimePropEvent,
  type RealtimeRoomState,
  RealtimeRoomManager,
} from './src/server/realtimeRooms.ts';
import type { RoleId } from './src/types/game.ts';
import { GMRoomManager } from './src/server/gmRooms.ts';

dotenv.config();

const app = express();
app.use(express.json({ limit: '100kb' }));

const PORT = Number(process.env.PORT) || 3000;
const ACCOUNTS_DB_PATH = path.resolve(process.cwd(), '.accounts_db.json');

const AUTH_RATE_WINDOW_MS = 60_000;
const AUTH_RATE_LIMIT = 30;
const authRateMap = new Map<string, { count: number; resetAt: number }>();

function authRateLimit(req: express.Request, res: express.Response, next: express.NextFunction) {
  const now = Date.now();
  if (authRateMap.size > 1000) {
    for (const [k, v] of authRateMap.entries()) {
      if (now >= v.resetAt) authRateMap.delete(k);
    }
  }
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const entry = authRateMap.get(ip);
  if (!entry || now >= entry.resetAt) {
    authRateMap.set(ip, { count: 1, resetAt: now + AUTH_RATE_WINDOW_MS });
    next();
    return;
  }
  entry.count += 1;
  if (entry.count > AUTH_RATE_LIMIT) {
    res.status(429).json({
      ok: false,
      code: 'RATE_LIMITED',
      error: 'Quá nhiều yêu cầu xác thực. Vui lòng thử lại sau 1 phút.',
    });
    return;
  }
  next();
}

function readHeaderToken(value: string | string[] | undefined): string | undefined {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (Array.isArray(value) && typeof value[0] === 'string' && value[0].trim()) return value[0].trim();
  return undefined;
}

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
app.post('/api/accounts/register', authRateLimit, async (req, res) => {
  try {
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

    // Preserve all registered accounts without silent truncation
    const updated = [newAccount, ...accounts];
    writeAccountsDb(ACCOUNTS_DB_PATH, updated);

    const token = signSessionToken({ userId: newAccount.id, username: newAccount.username });

    res.json({
      ok: true,
      token,
      account: toPublicAccount(newAccount),
    });
  } catch {
    res.status(500).json({ ok: false, code: 'INTERNAL_ERROR', error: 'Lỗi xử lý đăng ký tài khoản.' });
  }
});

/**
 * 4. POST /api/accounts/login
 * Verifies username + password in constant time (no bypasses) and returns a signed Bearer token.
 */
app.post('/api/accounts/login', authRateLimit, async (req, res) => {
  try {
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
    if (!(await verifyPasswordAsync(password, account.passwordHash))) {
      res.status(401).json({
        ok: false,
        code: 'INVALID_CREDENTIALS',
        error: 'Tài khoản hoặc mật khẩu không chính xác.',
      });
      return;
    }

    // Transparently upgrade legacy SHA-256 hashes to per-user salted scrypt on login
    if (needsPasswordRehash(account.passwordHash)) {
      account.passwordHash = await hashPasswordAsync(password);
    }
    account.updatedAt = Date.now();
    accounts[foundIdx] = account;
    writeAccountsDb(ACCOUNTS_DB_PATH, accounts);

    const token = signSessionToken({ userId: account.id, username: account.username });

    res.json({
      ok: true,
      token,
      account: toPublicAccount(account),
    });
  } catch {
    res.status(500).json({ ok: false, code: 'INTERNAL_ERROR', error: 'Lỗi xử lý đăng nhập.' });
  }
});

/**
 * 5. POST /api/accounts/update
 * Requires a valid signed Bearer token and strictly enforces account ownership.
 */
app.post('/api/accounts/update', authRateLimit, (req, res) => {
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
    current.wins = Math.min(
      current.matchesPlayed,
      Math.max(current.wins, Math.min(current.wins + 1, Math.round(body.wins)))
    );
  }

  current.updatedAt = Date.now();
  accounts[idx] = current;
  writeAccountsDb(ACCOUNTS_DB_PATH, accounts);

  res.json({
    ok: true,
    account: toPublicAccount(current),
  });
});

// =========================================================================
// REAL-TIME MULTIPLAYER WEBSOCKET SERVER (/ws)
// =========================================================================
const roomManager = new RealtimeRoomManager();

interface SocketMeta {
  roomCode: string | null;
  userId: string | null;
  authUserId: string | null;
  isAlive: boolean;
}

const VALID_PROP_TYPES = new Set<RealtimePropEvent['propType']>(['tomato', 'rose', 'egg', 'water']);

const socketMeta = new Map<WebSocket, SocketMeta>();
const roomSockets = new Map<string, Set<WebSocket>>();

function sendJson(ws: WebSocket, payload: Record<string, unknown>) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function sanitizeRoomForUser(room: RealtimeRoomState, userId: string | null): RealtimeRoomState {
  if (!room.matchRoles) return room;
  const filtered: Record<string, RoleId> = {};
  if (userId && room.matchRoles[userId]) {
    const myRole = room.matchRoles[userId];
    filtered[userId] = myRole;
    if (myRole === 'werewolf' || myRole === 'wolf_pup') {
      for (const [pid, role] of Object.entries(room.matchRoles)) {
        if (role === 'werewolf' || role === 'wolf_pup') {
          filtered[pid] = role;
        }
      }
    }
  }
  return { ...room, matchRoles: filtered };
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

function broadcastRoomState(
  code: string,
  type: 'room:state' | 'room:match_started',
  room: RealtimeRoomState
) {
  if (!room.matchRoles) {
    broadcastToRoom(code, { type, room });
    return;
  }
  const members = roomSockets.get(code);
  if (!members) return;
  for (const sock of members) {
    if (sock.readyState === WebSocket.OPEN) {
      const uid = socketMeta.get(sock)?.userId ?? null;
      sock.send(JSON.stringify({ type, room: sanitizeRoomForUser(room, uid) }));
    }
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
    // Only leave room if no other active socket belongs to the same userId in that room
    const stillConnected = Array.from(roomSockets.get(prevCode) || []).some(
      (s) => socketMeta.get(s)?.userId === prevUserId
    );
    if (!stillConnected) {
      const { room } = roomManager.leaveRoom(prevCode, prevUserId, options);
      if (room) {
        broadcastRoomState(prevCode, 'room:state', room);
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
  const hostSecret =
    readHeaderToken(req.headers['x-gm-host-secret']) ??
    (typeof body.hostSecret === 'string' && body.hostSecret.trim() ? body.hostSecret.trim() : undefined);

  const alreadyExists = Boolean(gmRoomManager.getHostState(code));
  if (alreadyExists && !gmRoomManager.verifyHostSecret(code, hostSecret)) {
    res.status(403).json({
      ok: false,
      error: 'Chỉ Quản Trò sở hữu phòng mới có quyền đồng bộ cấu hình phòng này.',
    });
    return;
  }

  const result = gmRoomManager.syncFromHost(
    code,
    hostId,
    {
      deckMode: body.deckMode,
      status: body.status,
      round: typeof body.round === 'number' ? body.round : undefined,
      phase: body.phase,
      seats: Array.isArray(body.seats) ? body.seats : undefined,
      playerCount: typeof body.playerCount === 'number' ? body.playerCount : undefined,
      resetMatch: Boolean(body.resetMatch),
    },
    alreadyExists ? hostSecret : undefined
  );
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
  const code = normalizeRoomCode(req.params.code);
  const hostSecret = readHeaderToken(req.headers['x-gm-host-secret']);
  if (!hostSecret) {
    res.status(403).json({
      ok: false,
      error: 'Chỉ Quản Trò sở hữu phòng mới có quyền xem toàn bộ vai trò.',
    });
    return;
  }
  const room = gmRoomManager.getHostState(code);
  if (!room) {
    res.status(404).json({ ok: false, error: 'Không tìm thấy phòng Quản Trò.' });
    return;
  }
  if (!gmRoomManager.verifyHostSecret(code, hostSecret)) {
    res.status(403).json({
      ok: false,
      error: 'Chỉ Quản Trò sở hữu phòng mới có quyền xem toàn bộ vai trò.',
    });
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
  res.json({ ok: true, view: result.view, playerToken: result.playerToken });
});

app.post('/api/gm-rooms/:code/leave', (req, res) => {
  const code = normalizeRoomCode(req.params.code);
  const body = req.body || {};
  const userId = String(body.userId || '').trim().slice(0, 64);
  const playerToken =
    readHeaderToken(req.headers['x-gm-player-token']) ??
    (typeof body.playerToken === 'string' && body.playerToken.trim() ? body.playerToken.trim() : undefined);
  if (gmRoomManager.hasPlayerToken(code, userId) && !gmRoomManager.verifyPlayerToken(code, userId, playerToken)) {
    res.status(403).json({ ok: false, error: 'Mã xác thực người chơi không hợp lệ.' });
    return;
  }
  const result = gmRoomManager.leaveAsPlayer(code, userId);
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
  const userId = String(body.userId || '').trim().slice(0, 64);
  const playerToken =
    readHeaderToken(req.headers['x-gm-player-token']) ??
    (typeof body.playerToken === 'string' && body.playerToken.trim() ? body.playerToken.trim() : undefined);
  if (gmRoomManager.hasPlayerToken(code, userId) && !gmRoomManager.verifyPlayerToken(code, userId, playerToken)) {
    res.status(403).json({ ok: false, error: 'Mã xác thực người chơi không hợp lệ.' });
    return;
  }
  const result = gmRoomManager.submitSelfRole(code, userId, body.roleId);
  if (!result.ok) {
    res.status(400).json(result);
    return;
  }
  broadcastGMRoomUpdates(code);
  res.json({ ok: true, view: result.view });
});

app.get('/api/gm-rooms/:code/player/:userId', (req, res) => {
  const code = normalizeRoomCode(req.params.code);
  const userId = String(req.params.userId || '').trim().slice(0, 64);
  const playerToken = readHeaderToken(req.headers['x-gm-player-token']);
  if (gmRoomManager.hasPlayerToken(code, userId) && !gmRoomManager.verifyPlayerToken(code, userId, playerToken)) {
    res.status(403).json({ ok: false, error: 'Mã xác thực người chơi không hợp lệ.' });
    return;
  }
  const view = gmRoomManager.getPlayerView(code, userId);
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
          if (cleanUserId.startsWith('acc_') && rawAuthToken) {
            const session = verifySessionToken(rawAuthToken);
            if (!session || session.userId !== cleanUserId) {
              sendJson(ws, { type: 'error', message: 'Phiên đăng nhập không hợp lệ.' });
              return;
            }
            verifiedAccountUserId = session.userId;
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
          if (meta && meta.roomCode && meta.roomCode !== code) {
            detachSocketFromRoom(ws);
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
            meta.userId = cleanUserId;
            meta.authUserId = verifiedAccountUserId;
          }
          let set = roomSockets.get(result.room.code);
          if (!set) {
            set = new Set<WebSocket>();
            roomSockets.set(result.room.code, set);
          }
          set.add(ws);

          broadcastRoomState(result.room.code, 'room:state', result.room);
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
          const meta = requireBoundSocket(ws, code);
          if (!meta) return;
          const res = roomManager.kickParticipant(
            code,
            meta.userId!,
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
                m.authUserId = null;
              }
            }
          }
          broadcastRoomState(code, 'room:state', res.room);
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
          broadcastRoomState(code, 'room:state', res.room);
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
          broadcastRoomState(code, 'room:state', res.room);
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
          broadcastRoomState(code, 'room:state', res.room);
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
          broadcastRoomState(code, 'room:match_started', res.room);
          broadcastOpenRooms();
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
          broadcastToRoom(code, { type: 'room:chat', code, message: res.message });
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
          broadcastToRoom(code, {
            type: 'room:prop',
            code,
            event: {
              id: String(ev.id || `prop_${Date.now()}`),
              propType: ev.propType,
              fromPlayerId: meta.userId!,
              targetPlayerId: String(ev.targetPlayerId),
              timestamp: Date.now(),
            },
          });
          return;
        }

        if (type === 'room:vote') {
          const code = normalizeRoomCode(String(msg.code || ''));
          const meta = requireBoundSocket(ws, code);
          if (!meta) return;
          const res = roomManager.castVote(
            code,
            meta.userId!,
            String(msg.targetId || '')
          );
          if (res.ok) {
            broadcastToRoom(code, { type: 'room:votes', code, votes: res.votes });
          }
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
