import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  AUDIO_SAMPLE_MANIFEST,
  PROP_REACTION_META,
  ROLE_CALLOUT_LINES,
  getAudioSampleManifest,
  selectBestVoiceForLanguage,
  sound,
} from './sound.ts';
import type { Language, PropType, RoleId } from '../types/game.ts';

const PUBLIC_DIR = path.resolve(process.cwd(), 'public');

function hasValidMp3Header(buf: Buffer): boolean {
  if (buf.length < 4) return false;
  // ID3v2 container tag ("ID3")
  if (buf[0] === 0x49 && buf[1] === 0x44 && buf[2] === 0x33) return true;
  // Raw MPEG-1 / MPEG-2 Layer III frame sync (11 set bits + Layer III = 01)
  if (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0 && (buf[1] & 0x06) === 0x02) return true;
  return false;
}

test('Audio sample manifest references valid, compact MP3 recordings on disk + CREDITS.md', () => {
  const manifest = getAudioSampleManifest();
  assert.deepEqual(manifest, sound.getAudioSampleManifest());
  assert.equal(manifest.length, AUDIO_SAMPLE_MANIFEST.length);
  assert.ok(manifest.length >= 10, 'Expected at least 10 curated acoustic samples');

  const seenKeys = new Set<string>();
  let totalBytes = 0;

  for (const entry of manifest) {
    assert.ok(!seenKeys.has(entry.key), `Duplicate manifest key: ${entry.key}`);
    seenKeys.add(entry.key);
    assert.ok(entry.url.startsWith('/audio/sfx/'), `Unexpected URL prefix: ${entry.url}`);
    assert.ok(entry.url.endsWith('.mp3'), `Expected .mp3 asset: ${entry.url}`);

    const filePath = path.join(PUBLIC_DIR, entry.url.replace(/^\/+/, ''));
    assert.ok(fs.existsSync(filePath), `Missing audio asset on disk: ${filePath}`);

    const stat = fs.statSync(filePath);
    assert.ok(stat.size >= 4096, `Audio file unexpectedly tiny (${stat.size}B): ${entry.url}`);
    totalBytes += stat.size;

    const header = Buffer.alloc(16);
    const fd = fs.openSync(filePath, 'r');
    try {
      fs.readSync(fd, header, 0, 16, 0);
    } finally {
      fs.closeSync(fd);
    }
    assert.ok(
      hasValidMp3Header(header),
      `Invalid MP3 header (${header.subarray(0, 4).toString('hex')}) for ${entry.url}`
    );
  }

  assert.ok(
    totalBytes <= 1.5 * 1024 * 1024,
    `Bundled SFX total (${(totalBytes / 1024).toFixed(1)} KB) exceeds 1.5 MB budget`
  );

  const creditsPath = path.join(PUBLIC_DIR, 'audio', 'sfx', 'CREDITS.md');
  assert.ok(fs.existsSync(creditsPath), 'Missing public/audio/sfx/CREDITS.md');
  const creditsText = fs.readFileSync(creditsPath, 'utf8');
  for (const entry of manifest) {
    const basename = path.basename(entry.url);
    assert.ok(creditsText.includes(basename), `CREDITS.md missing attribution entry for ${basename}`);
  }
});

test('selectBestVoiceForLanguage strictly matches language and prioritizes natural voices', () => {
  assert.equal(selectBestVoiceForLanguage([], 'vi'), null);

  const enOnly = [{ lang: 'en-US', name: 'Samantha' }];
  assert.equal(selectBestVoiceForLanguage(enOnly, 'vi'), null);
  assert.equal(selectBestVoiceForLanguage(enOnly, 'ja'), null);
  assert.equal(selectBestVoiceForLanguage(enOnly, 'en')?.name, 'Samantha');

  const multi = [
    { lang: 'vi_VN', name: 'Linh' },
    { lang: 'vi-VN', name: 'Microsoft HoaiMy Online (Natural)' },
    { lang: 'fr-FR', name: 'Google français' },
  ];
  assert.equal(selectBestVoiceForLanguage(multi, 'vi')?.name, 'Microsoft HoaiMy Online (Natural)');
  assert.equal(selectBestVoiceForLanguage(multi, 'fr')?.name, 'Google français');
});

test('ROLE_CALLOUT_LINES and PROP_REACTION_META have full localized copy and refined Hunter tone', () => {
  const langs: Language[] = ['vi', 'en', 'fr', 'es', 'ja'];
  const roles = Object.keys(ROLE_CALLOUT_LINES) as RoleId[];
  assert.equal(roles.length, 13);

  for (const role of roles) {
    const meta = ROLE_CALLOUT_LINES[role];
    assert.ok(meta.quote.length > 0);
    assert.ok(meta.sfxLabel.length > 0);
    assert.ok(meta.musicTitle.length > 0);
    for (const lang of langs) {
      assert.ok(meta.quotes[lang].length > 0, `Missing quote for ${role}/${lang}`);
    }
  }

  assert.ok(!ROLE_CALLOUT_LINES.hunter.quote.includes('hoa cải'));
  assert.ok(ROLE_CALLOUT_LINES.hunter.quote.includes('súng săn'));
  assert.equal(ROLE_CALLOUT_LINES.hunter.quote, ROLE_CALLOUT_LINES.hunter.quotes.vi);

  const props: PropType[] = ['tomato', 'egg', 'water', 'rose'];
  for (const prop of props) {
    assert.ok(PROP_REACTION_META[prop]);
  }
});

test('Master, BGM, and SFX mute toggles persist in-memory state cleanly in Node/SSR', () => {
  const initMaster = sound.getMuted();
  const initBgm = sound.getBgmMuted();
  const initSfx = sound.getSfxMuted();

  try {
    assert.equal(sound.toggleMute(), !initMaster);
    assert.equal(sound.getMuted(), !initMaster);
    assert.equal(sound.toggleMute(), initMaster);

    assert.equal(sound.toggleBgmMute(), !initBgm);
    assert.equal(sound.getBgmMuted(), !initBgm);
    assert.equal(sound.toggleBgmMute(), initBgm);

    assert.equal(sound.toggleSfxMute(), !initSfx);
    assert.equal(sound.getSfxMuted(), !initSfx);
    assert.equal(sound.toggleSfxMute(), initSfx);
  } finally {
    if (sound.getMuted() !== initMaster) sound.toggleMute();
    if (sound.getBgmMuted() !== initBgm) sound.toggleBgmMute();
    if (sound.getSfxMuted() !== initSfx) sound.toggleSfxMute();
  }
});

test('All SoundEngine play*, BGM, and speech methods execute safely in Node/SSR without throwing', () => {
  const roles = Object.keys(ROLE_CALLOUT_LINES) as RoleId[];
  const props: PropType[] = ['tomato', 'egg', 'water', 'rose'];

  assert.doesNotThrow(() => {
    sound.startBGM('night');
    sound.setBGMMode('day');
    sound.setBGMMode('lobby');
    sound.stopBGM();

    for (const roleId of roles) {
      const info = sound.playRoleCallout(roleId, 'vi');
      assert.ok(info.quote.length > 0);
      assert.ok(info.sfxLabel.length > 0);
      assert.ok(info.musicTitle.length > 0);
    }

    sound.playWolfHowl();
    sound.playWolfPupBark();
    sound.playWitchCauldron();
    sound.playShotgunCock();
    sound.playMysticChime();
    sound.playShieldClang();
    sound.playCupidHarp();
    sound.playDoppelgangerMirror();
    sound.playElderGong();
    sound.playCursedHeartbeat();
    sound.playTraitorDagger();
    sound.playTannerJester();

    for (const p of props) {
      sound.playThrowWhoosh(p);
      sound.playPropSplat(p);
    }

    sound.playGhostWail();
    sound.playNightBell();
    sound.playDayGong();
    sound.playGavel();
    sound.playCardFlip();
    sound.playDeath();
    sound.playVictory();
    sound.playGMAnnouncement('dawn', true, 'Bình minh đã lên!', 'vi');
    sound.playGMAnnouncement('dusk', true, 'Hoàng hôn buông xuống!', 'vi');
    sound.playGMAnnouncement('dawn', false, '', 'en');

    assert.equal(sound.speakLocalized('Xin chào', 'vi'), false);
    sound.cancelSpeech();
  });
});
