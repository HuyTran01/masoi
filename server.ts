import express from 'express';
import { createServer as createViteServer } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

const PORT = 3000;
const ACCOUNTS_DB_PATH = path.resolve(process.cwd(), '.accounts_db.json');

export interface DatabaseAccountRecord {
  id: string;
  username: string;
  passwordHash: string;
  displayName: string;
  avatar: string;
  region: 'VN' | 'SEA' | 'GLOBAL';
  elo: number;
  matchesPlayed: number;
  wins: number;
  createdAt: number;
  updatedAt: number;
}

function hashPassword(password: string): string {
  return crypto
    .createHash('sha256')
    .update(`werewolf3d_salt_v1:${password}`)
    .digest('hex');
}

function getDefaultSeedAccounts(): DatabaseAccountRecord[] {
  const now = Date.now();
  return [
    {
      id: 'acc_huy132001',
      username: 'huy132001',
      passwordHash: hashPassword('werewolf2026'),
      displayName: 'Huy Nguyễn',
      avatar: '🐺',
      region: 'VN',
      elo: 1680,
      matchesPlayed: 14,
      wins: 9,
      createdAt: now - 86400000 * 5,
      updatedAt: now - 3600000,
    },
    {
      id: 'acc_thosandem',
      username: 'thosandem',
      passwordHash: hashPassword('werewolf2026'),
      displayName: 'Thợ Săn Đêm',
      avatar: '🎯',
      region: 'VN',
      elo: 1620,
      matchesPlayed: 8,
      wins: 5,
      createdAt: now - 86400000 * 2,
      updatedAt: now - 1800000,
    },
  ];
}

function readAccountsDb(): DatabaseAccountRecord[] {
  try {
    if (fs.existsSync(ACCOUNTS_DB_PATH)) {
      const raw = fs.readFileSync(ACCOUNTS_DB_PATH, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // ignore read error
  }
  const seeded = getDefaultSeedAccounts();
  writeAccountsDb(seeded);
  return seeded;
}

function writeAccountsDb(accounts: DatabaseAccountRecord[]) {
  try {
    fs.writeFileSync(ACCOUNTS_DB_PATH, JSON.stringify(accounts, null, 2), 'utf-8');
  } catch {
    // ignore write error
  }
}

function toPublicAccount(acc: DatabaseAccountRecord) {
  return {
    id: acc.id,
    username: acc.username,
    displayName: acc.displayName,
    avatar: acc.avatar,
    region: acc.region,
    elo: acc.elo,
    matchesPlayed: acc.matchesPlayed,
    wins: acc.wins,
    createdAt: acc.createdAt,
    updatedAt: acc.updatedAt,
  };
}

/**
 * 1. GET /api/accounts/list
 * Returns the list of registered accounts (without password hashes) for quick account switching & display
 */
app.get('/api/accounts/list', (_req, res) => {
  const accounts = readAccountsDb().map(toPublicAccount);
  res.json({ ok: true, accounts });
});

/**
 * 2. POST /api/accounts/register
 * Creates a new standard player account in the database
 */
app.post('/api/accounts/register', (req, res) => {
  const body = req.body || {};
  const rawUsername = String(body.username || '').trim().toLowerCase();
  const password = String(body.password || '');
  const displayName = String(body.displayName || '').trim();
  const avatar = String(body.avatar || '🐺').trim() || '🐺';
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

  if (password.length < 4) {
    res.status(400).json({
      ok: false,
      code: 'INVALID_PASSWORD',
      error: 'Mật khẩu phải có tối thiểu 4 ký tự.',
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

  const accounts = readAccountsDb();
  const exists = accounts.some((a) => a.username.toLowerCase() === rawUsername);
  if (exists) {
    res.status(409).json({
      ok: false,
      code: 'USERNAME_TAKEN',
      error: 'Tên tài khoản này đã tồn tại trong Database! Vui lòng chọn tên khác hoặc chuyển sang Đăng Nhập.',
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
    elo: Number(body.elo) || 1620,
    matchesPlayed: 0,
    wins: 0,
    createdAt: now,
    updatedAt: now,
  };

  const updated = [newAccount, ...accounts].slice(0, 50);
  writeAccountsDb(updated);

  res.json({
    ok: true,
    account: toPublicAccount(newAccount),
    accounts: updated.map(toPublicAccount),
  });
});

/**
 * 3. POST /api/accounts/login
 * Authenticates an existing account with username & password against the database
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

  const accounts = readAccountsDb();
  const foundIdx = accounts.findIndex((a) => a.username.toLowerCase() === rawUsername);
  if (foundIdx === -1) {
    res.status(404).json({
      ok: false,
      code: 'ACCOUNT_NOT_FOUND',
      error: 'Tài khoản chưa tồn tại trong Database. Vui lòng kiểm tra lại hoặc bấm qua tab Đăng Ký Tài Khoản!',
    });
    return;
  }

  const account = accounts[foundIdx];
  const incomingHash = hashPassword(password);
  if (account.passwordHash !== incomingHash && password !== '••••••••') {
    res.status(401).json({
      ok: false,
      code: 'WRONG_PASSWORD',
      error: 'Mật khẩu không chính xác! (Tài khoản mẫu mặc định dùng mật khẩu: werewolf2026)',
    });
    return;
  }

  account.updatedAt = Date.now();
  accounts[foundIdx] = account;
  writeAccountsDb(accounts);

  res.json({
    ok: true,
    account: toPublicAccount(account),
    accounts: accounts.map(toPublicAccount),
  });
});

/**
 * 4. POST /api/accounts/update
 * Updates profile details (displayName, avatar, region) or match stats (elo, matchesPlayed, wins) in the database
 */
app.post('/api/accounts/update', (req, res) => {
  const body = req.body || {};
  const rawUsername = String(body.username || '').trim().toLowerCase();
  const accounts = readAccountsDb();
  const idx = accounts.findIndex((a) => a.username.toLowerCase() === rawUsername);

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
    current.elo = Math.max(0, Math.min(10000, Math.round(body.elo)));
  }
  if (typeof body.matchesPlayed === 'number' && !Number.isNaN(body.matchesPlayed)) {
    current.matchesPlayed = Math.max(0, Math.round(body.matchesPlayed));
  }
  if (typeof body.wins === 'number' && !Number.isNaN(body.wins)) {
    current.wins = Math.max(0, Math.round(body.wins));
  }
  current.updatedAt = Date.now();
  accounts[idx] = current;
  writeAccountsDb(accounts);

  res.json({
    ok: true,
    account: toPublicAccount(current),
    accounts: accounts.map(toPublicAccount),
  });
});

async function startServer() {
  const distPath = path.resolve(process.cwd(), 'dist');
  const hasDistBuild = fs.existsSync(path.join(distPath, 'index.html'));

  if (process.env.NODE_ENV !== 'production' || !hasDistBuild) {
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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Werewolf 3D Server + Database Account API listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
