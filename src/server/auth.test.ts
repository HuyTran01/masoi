import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  hashPassword,
  verifyPassword,
  needsPasswordRehash,
  signSessionToken,
  verifySessionToken,
  extractBearerToken,
  readAccountsDb,
  writeAccountsDb,
  toPublicAccount,
  DatabaseAccountRecord,
} from './auth';

test('hashPassword uses salted scrypt and generates unique hashes per call', () => {
  const h1 = hashPassword('strongPass123!');
  const h2 = hashPassword('strongPass123!');
  assert.ok(h1.startsWith('scrypt:'), 'hash must use scrypt prefix');
  assert.notEqual(h1, h2, 'unique random salt must yield distinct hashes');
  assert.equal(verifyPassword('strongPass123!', h1), true);
  assert.equal(verifyPassword('strongPass123!', h2), true);
  assert.equal(verifyPassword('wrongPass', h1), false);
  assert.equal(needsPasswordRehash(h1), false);
});

test('verifyPassword strictly rejects hardcoded masked-dot bypass and empty inputs', () => {
  const hash = hashPassword('werewolf2026');
  assert.equal(verifyPassword('••••••••', hash), false);
  assert.equal(verifyPassword('', hash), false);
  assert.equal(verifyPassword('werewolf2026', ''), false);
  assert.equal(verifyPassword('werewolf2026', 'scrypt:badformat'), false);
});

test('verifyPassword supports safe migration from legacy SHA-256 hashes', () => {
  const legacyHash = crypto
    .createHash('sha256')
    .update('werewolf3d_salt_v1:oldsecret99')
    .digest('hex');

  assert.equal(needsPasswordRehash(legacyHash), true);
  assert.equal(verifyPassword('oldsecret99', legacyHash), true);
  assert.equal(verifyPassword('••••••••', legacyHash), false);
  assert.equal(verifyPassword('wrongsecret', legacyHash), false);
});

test('signSessionToken and verifySessionToken validate signatures, tamper attempts, and expiry', () => {
  const secret = 'unit_test_secret_key_for_werewolf_3d_hmac_256';
  const token = signSessionToken(
    { userId: 'acc_alice', username: 'AliceDev' },
    secret,
    60_000
  );

  const payload = verifySessionToken(token, secret);
  assert.ok(payload, 'valid token should decode');
  assert.equal(payload?.userId, 'acc_alice');
  assert.equal(payload?.username, 'alicedev');

  // Wrong secret must fail
  assert.equal(verifySessionToken(token, 'different_secret_key_1234567890'), null);

  // Tampered payload must fail
  const [, sig] = token.split('.');
  const fakePayload = Buffer.from(
    JSON.stringify({ userId: 'acc_admin', username: 'huy132001', iat: Date.now(), exp: Date.now() + 60_000 })
  ).toString('base64url');
  assert.equal(verifySessionToken(`${fakePayload}.${sig}`, secret), null);

  // Expired token must fail
  const expiredToken = signSessionToken({ userId: 'acc_old', username: 'old' }, secret, -1000);
  assert.equal(verifySessionToken(expiredToken, secret), null);

  // extractBearerToken parses valid headers only
  assert.equal(extractBearerToken(`Bearer ${token}`), token);
  assert.equal(extractBearerToken(`bearer   ${token}  `), token);
  assert.equal(extractBearerToken('Basic abc123'), null);
  assert.equal(extractBearerToken(undefined), null);
});

test('readAccountsDb and writeAccountsDb persist >60 accounts without truncation and strip passwordHash', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'werewolf-auth-test-'));
  const dbPath = path.join(tmpDir, 'accounts.json');
  try {
    const accounts: DatabaseAccountRecord[] = [];
    const now = Date.now();
    for (let i = 0; i < 65; i++) {
      accounts.push({
        id: `acc_${i}`,
        username: `player_${i}`,
        passwordHash: `scrypt:salt${i}:deadbeef`,
        displayName: `Player ${i}`,
        avatar: '🐺',
        region: 'VN',
        elo: 1500 + i,
        matchesPlayed: i,
        wins: Math.floor(i / 2),
        createdAt: now,
        updatedAt: now,
      });
    }

    writeAccountsDb(dbPath, accounts);
    const loaded = readAccountsDb(dbPath);
    assert.equal(loaded.length, 65, 'Must not silently truncate at 50 accounts');
    assert.equal(loaded[64].username, 'player_64');

    const pub = toPublicAccount(loaded[0]) as unknown as Record<string, unknown>;
    assert.equal('passwordHash' in pub, false, 'Public account must never expose passwordHash');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
