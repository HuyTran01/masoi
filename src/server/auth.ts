import crypto from 'node:crypto';
import fs from 'node:fs';

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

function getSessionSecret(overrideSecret?: string): string {
  if (overrideSecret && overrideSecret.length >= 16) return overrideSecret;
  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 16) {
    return process.env.SESSION_SECRET;
  }
  return EPHEMERAL_FALLBACK_SECRET;
}

/**
 * Hashes a plaintext password using scrypt with a unique 16-byte random salt.
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, SCRYPT_KEYLEN).toString('hex');
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
