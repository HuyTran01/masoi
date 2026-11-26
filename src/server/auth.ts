import crypto from 'node:crypto';
import fs from 'node:fs';
import type { StateStore } from './stateStore.ts';

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

export interface PublicAccountRecord {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  region: 'VN' | 'SEA' | 'GLOBAL';
  elo: number;
  matchesPlayed: number;
  wins: number;
  createdAt: number;
  updatedAt: number;
}

export interface SessionTokenPayload {
  userId: string;
  username: string;
  iat: number;
  exp: number;
}

const SCRYPT_KEYLEN = 64;
const DEFAULT_SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days
const EPHEMERAL_FALLBACK_SECRET = crypto.randomBytes(32).toString('hex');

function readAuthEnv(key: string): string | undefined {
  const netlifyEnv = (
    globalThis as { Netlify?: { env?: { get?: (k: string) => string | undefined } } }
  ).Netlify?.env;
  if (typeof netlifyEnv?.get === 'function') {
    const val = netlifyEnv.get(key);
    if (val !== undefined) return val;
  }
  return process.env[key];
}

function getSessionSecret(overrideSecret?: string): string {
  if (overrideSecret && overrideSecret.length >= 16) return overrideSecret;
  const envSecret = readAuthEnv('SESSION_SECRET');
  if (envSecret && envSecret.length >= 16) {
    return envSecret;
  }
  return EPHEMERAL_FALLBACK_SECRET;
}

const clusterSecretCache = new WeakMap<StateStore, string>();

/**
 * Resolves a stable HMAC session secret across cold-started serverless instances:
 * uses SESSION_SECRET env var when configured, otherwise persists a shared secret in StateStore.
 */
export async function resolveClusterSessionSecret(store: StateStore): Promise<string> {
  const envSecret = readAuthEnv('SESSION_SECRET');
  if (envSecret && envSecret.length >= 16) {
    return envSecret;
  }
  const cached = clusterSecretCache.get(store);
  if (cached) return cached;

  const existing = await store.getJSON<{ secret: string }>('meta/session_secret');
  if (existing && typeof existing.secret === 'string' && existing.secret.length >= 16) {
    clusterSecretCache.set(store, existing.secret);
    return existing.secret;
  }

  const generated = crypto.randomBytes(32).toString('hex');
  const created = await store.setJSONIfNew('meta/session_secret', {
    secret: generated,
    createdAt: Date.now(),
  });
  if (created) {
    clusterSecretCache.set(store, generated);
    return generated;
  }
  const winner = await store.getJSON<{ secret: string }>('meta/session_secret');
  const resolved = winner?.secret && winner.secret.length >= 16 ? winner.secret : generated;
  clusterSecretCache.set(store, resolved);
  return resolved;
}

function scryptAsync(password: string, salt: string, keylen: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, keylen, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey);
    });
  });
}

/**
 * Hashes a plaintext password using scrypt with a unique 16-byte random salt.
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, SCRYPT_KEYLEN).toString('hex');
  return `scrypt:${salt}:${derived}`;
}

export async function hashPasswordAsync(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = (await scryptAsync(password, salt, SCRYPT_KEYLEN)).toString('hex');
  return `scrypt:${salt}:${derived}`;
}

function legacySha256Hash(password: string): string {
  return crypto
    .createHash('sha256')
    .update(`werewolf3d_salt_v1:${password}`)
    .digest('hex');
}

export function needsPasswordRehash(storedHash: string): boolean {
  return !storedHash.startsWith('scrypt:');
}

/**
 * Constant-time password verification supporting scrypt hashes and safe migration
 * from legacy SHA-256 hashes. No hardcoded bypasses exist.
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  if (!password || !storedHash) return false;

  if (storedHash.startsWith('scrypt:')) {
    const parts = storedHash.split(':');
    if (parts.length !== 3) return false;
    const [, salt, expectedHex] = parts;
    if (!salt || !expectedHex) return false;
    try {
      const expectedBuf = Buffer.from(expectedHex, 'hex');
      const derivedBuf = crypto.scryptSync(password, salt, expectedBuf.length);
      if (expectedBuf.length !== derivedBuf.length) return false;
      return crypto.timingSafeEqual(expectedBuf, derivedBuf);
    } catch {
      return false;
    }
  }

  // Legacy SHA-256 hash support (exact hash match only, constant-time)
  try {
    const expectedBuf = Buffer.from(storedHash, 'hex');
    const actualBuf = Buffer.from(legacySha256Hash(password), 'hex');
    if (expectedBuf.length === 0 || expectedBuf.length !== actualBuf.length) return false;
    return crypto.timingSafeEqual(expectedBuf, actualBuf);
  } catch {
    return false;
  }
}

export async function verifyPasswordAsync(password: string, storedHash: string): Promise<boolean> {
  if (!password || !storedHash) return false;

  if (storedHash.startsWith('scrypt:')) {
    const parts = storedHash.split(':');
    if (parts.length !== 3) return false;
    const [, salt, expectedHex] = parts;
    if (!salt || !expectedHex) return false;
    try {
      const expectedBuf = Buffer.from(expectedHex, 'hex');
      const derivedBuf = await scryptAsync(password, salt, expectedBuf.length);
      if (expectedBuf.length !== derivedBuf.length) return false;
      return crypto.timingSafeEqual(expectedBuf, derivedBuf);
    } catch {
      return false;
    }
  }

  // Legacy SHA-256 hash support (exact hash match only, constant-time)
  try {
    const expectedBuf = Buffer.from(storedHash, 'hex');
    const actualBuf = Buffer.from(legacySha256Hash(password), 'hex');
    if (expectedBuf.length === 0 || expectedBuf.length !== actualBuf.length) return false;
    return crypto.timingSafeEqual(expectedBuf, actualBuf);
  } catch {
    return false;
  }
}

/**
 * Creates a signed HMAC-SHA256 Bearer token for authenticated API calls.
 */
export function signSessionToken(
  input: { userId: string; username: string },
  secret?: string,
  ttlMs: number = DEFAULT_SESSION_TTL_MS
): string {
  const now = Date.now();
  const payload: SessionTokenPayload = {
    userId: input.userId,
    username: input.username.toLowerCase(),
    iat: now,
    exp: now + ttlMs,
  };
  const encoded = Buffer.from(JSON.stringify(payload), 'utf-8').toString('base64url');
  const sig = crypto
    .createHmac('sha256', getSessionSecret(secret))
    .update(encoded)
    .digest('base64url');
  return `${encoded}.${sig}`;
}

/**
 * Verifies a signed HMAC-SHA256 Bearer token and checks expiration.
 */
export function verifySessionToken(
  token: string,
  secret?: string
): SessionTokenPayload | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encoded, sig] = parts;
  if (!encoded || !sig) return null;

  try {
    const expectedSig = crypto
      .createHmac('sha256', getSessionSecret(secret))
      .update(encoded)
      .digest('base64url');
    const sigBuf = Buffer.from(sig);
    const expectedBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expectedBuf.length) return null;
    if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;

    const parsed = JSON.parse(
      Buffer.from(encoded, 'base64url').toString('utf-8')
    ) as SessionTokenPayload;
    if (
      !parsed ||
      typeof parsed.userId !== 'string' ||
      typeof parsed.username !== 'string' ||
      typeof parsed.exp !== 'number'
    ) {
      return null;
    }
    if (Date.now() > parsed.exp) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function extractBearerToken(authHeader?: string): string | null {
  if (!authHeader || typeof authHeader !== 'string') return null;
  const match = /^Bearer\s+(.+)$/i.exec(authHeader.trim());
  return match ? match[1].trim() : null;
}

export function getDefaultSeedAccounts(): DatabaseAccountRecord[] {
  if (readAuthEnv('NODE_ENV') === 'production' && readAuthEnv('SEED_DEMO_ACCOUNTS') !== '1') {
    return [];
  }
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

export function readAccountsDb(dbPath: string): DatabaseAccountRecord[] {
  try {
    if (fs.existsSync(dbPath)) {
      const raw = fs.readFileSync(dbPath, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // fall through to seed
  }
  const seeded = getDefaultSeedAccounts();
  writeAccountsDb(dbPath, seeded);
  return seeded;
}

export function writeAccountsDb(dbPath: string, accounts: DatabaseAccountRecord[]): void {
  try {
    const tmpPath = `${dbPath}.tmp.${process.pid}.${Date.now()}`;
    fs.writeFileSync(tmpPath, JSON.stringify(accounts, null, 2), 'utf-8');
    fs.renameSync(tmpPath, dbPath);
  } catch {
    try {
      fs.writeFileSync(dbPath, JSON.stringify(accounts, null, 2), 'utf-8');
    } catch {
      // ignore write error
    }
  }
}

export function toPublicAccount(acc: DatabaseAccountRecord): PublicAccountRecord {
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

export async function loadAccountsFromStore(store: StateStore): Promise<DatabaseAccountRecord[]> {
  const existing = await store.getJSON<DatabaseAccountRecord[]>('accounts/list');
  if (Array.isArray(existing)) {
    return existing;
  }
  const seeded = getDefaultSeedAccounts();
  if (seeded.length > 0) {
    await store.setJSON('accounts/list', seeded);
  }
  return seeded;
}

export async function saveAccountsToStore(
  store: StateStore,
  accounts: DatabaseAccountRecord[]
): Promise<void> {
  await store.setJSON('accounts/list', accounts);
}

export async function applyOnlineMatchEloUpdates(
  store: StateStore,
  updates: Array<{ userId: string; delta: number; won: boolean }>
): Promise<void> {
  const accountUpdates = updates.filter((u) => u.userId.startsWith('acc_'));
  if (accountUpdates.length === 0) return;

  const accounts = await loadAccountsFromStore(store);
  const byId = new Map(accountUpdates.map((u) => [u.userId, u]));
  let mutated = false;
  const now = Date.now();

  for (const acc of accounts) {
    const upd = byId.get(acc.id);
    if (!upd) continue;
    const clampedDelta = Math.max(-80, Math.min(80, Math.round(upd.delta)));
    acc.elo = Math.max(0, Math.min(10000, acc.elo + clampedDelta));
    acc.matchesPlayed += 1;
    if (upd.won) acc.wins = Math.min(acc.matchesPlayed, acc.wins + 1);
    acc.updatedAt = now;
    mutated = true;
  }

  if (mutated) {
    await saveAccountsToStore(store, accounts);
  }
}
