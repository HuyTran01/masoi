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
  type AudioBiome,
  type FootstepSurface,
} from './sound.ts';
import type { Language, NightSkillCutsceneKind, PropType, RoleId } from '../types/game.ts';

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
  assert.equal(manifest.length, 16, 'Expected all 16 curated acoustic samples');

  const expectedNewKeys = [
    'stream-loop',
    'wind-howl-loop',
    'owl-forest-call',
    'tomato-splat',
    'egg-crack-splat',
    'water-splash',
  ];
  const manifestKeys = new Set(manifest.map((m) => m.key));
  for (const key of expectedNewKeys) {
    assert.ok(manifestKeys.has(key), `Missing Phase 3 audio sample key in manifest: ${key}`);
  }

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
      sound.playThrowWhoosh(p, { x: 4, y: 1.5, z: -6 });
      sound.playPropSplat(p);
      sound.playPropSplat(p, { x: -3, y: 1.2, z: 5 });
      sound.playPropVictimReaction(p);
      sound.playPropVictimReaction(p, { x: -3, y: 1.2, z: 5 });
    }

    const biomes: AudioBiome[] = ['forest', 'frostpeak', 'autumn'];
    for (const biome of biomes) {
      sound.setBiome(biome);
      assert.equal(sound.getBiome(), biome);
      sound.updateSpatialFrame({
        x: 2.5,
        y: 1.7,
        z: -8.0,
        fx: 0,
        fy: 0,
        fz: -1,
        ux: 0,
        uy: 1,
        uz: 0,
        biome,
        isDay: true,
        isNightBlindfolded: false,
      });
      sound.updateSpatialFrame({
        x: 0,
        y: 1.7,
        z: 0,
        fx: 0,
        fy: 0,
        fz: -1,
        ux: 0,
        uy: 1,
        uz: 0,
        biome,
        isDay: false,
        isNightBlindfolded: true,
      });
    }
    sound.setBiome('forest');

    const surfaces: FootstepSurface[] = ['dirt', 'grass', 'snow', 'water'];
    for (const surface of surfaces) {
      sound.playFootstep(surface);
      sound.playFootstep(surface, true, false);
      sound.playFootstep(surface, false, true);
    }

    const cutscenes: NightSkillCutsceneKind[] = [
      'werewolf',
      'cupid',
      'bodyguard',
      'seer',
      'witch_heal',
      'witch_poison',
      'doppelganger',
      'hunter_shot',
    ];
    for (const kind of cutscenes) {
      sound.playSkillCutsceneSfx(kind);
      sound.playSkillCutsceneSfx(kind, { x: 6, y: 1.4, z: -4 });
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

test('3D spatial audio graph routes campfire PannerNode, autumn stream filter sweep, frostpeak mute, and listener smoothing', () => {
  interface MockParam {
    value: number;
    setValueAtTime: (v: number) => void;
    setTargetAtTime: (v: number) => void;
    linearRampToValueAtTime: (v: number) => void;
    exponentialRampToValueAtTime: (v: number) => void;
  }
  const makeParam = (init = 0): MockParam => {
    const p: MockParam = {
      value: init,
      setValueAtTime(v) {
        p.value = v;
      },
      setTargetAtTime(v) {
        p.value = v;
      },
      linearRampToValueAtTime(v) {
        p.value = v;
      },
      exponentialRampToValueAtTime(v) {
        p.value = v;
      },
    };
    return p;
  };

  const createdPanners: Array<{
    panningModel: string;
    distanceModel: string;
    refDistance: number;
    maxDistance: number;
    rolloffFactor: number;
    positionX: MockParam;
    positionY: MockParam;
    positionZ: MockParam;
    connect: () => void;
    disconnect: () => void;
  }> = [];

  const mockListener = {
    positionX: makeParam(),
    positionY: makeParam(),
    positionZ: makeParam(),
    forwardX: makeParam(),
    forwardY: makeParam(),
    forwardZ: makeParam(-1),
    upX: makeParam(),
    upY: makeParam(1),
    upZ: makeParam(),
  };

  const mockCtx = {
    currentTime: 1.0,
    sampleRate: 44100,
    state: 'running',
    destination: {},
    listener: mockListener,
    resume: () => Promise.resolve(),
    createGain: () => ({ gain: makeParam(1), connect: () => {}, disconnect: () => {} }),
    createBiquadFilter: () => ({
      type: 'lowpass',
      frequency: makeParam(1000),
      Q: makeParam(1),
      connect: () => {},
      disconnect: () => {},
    }),
    createOscillator: () => ({
      type: 'sine',
      frequency: makeParam(440),
      detune: makeParam(0),
      connect: () => {},
      start: () => {},
      stop: () => {},
    }),
    createBuffer: (ch: number, len: number, sr: number) => ({
      numberOfChannels: ch,
      length: len,
      sampleRate: sr,
      duration: len / sr,
      getChannelData: () => new Float32Array(len),
    }),
    createBufferSource: () => ({
      buffer: null,
      playbackRate: makeParam(1),
      onended: null,
      connect: () => {},
      start: () => {},
      stop: () => {},
    }),
    createStereoPanner: () => ({ pan: makeParam(0), connect: () => {}, disconnect: () => {} }),
    createPanner: () => {
      const p = {
        panningModel: 'equalpower',
        distanceModel: 'inverse',
        refDistance: 1,
        maxDistance: 10000,
        rolloffFactor: 1,
        positionX: makeParam(),
        positionY: makeParam(),
        positionZ: makeParam(),
        connect: () => {},
        disconnect: () => {},
      };
      createdPanners.push(p);
      return p;
    },
  };

  const engine = sound as unknown as {
    ctx: unknown;
    bgmDuckGain: unknown;
    sfxBus: unknown;
    sampleBuffers: Map<string, { duration: number }>;
    ambientTracks: Record<
      string,
      { bus: { gain: MockParam }; filter: { frequency: MockParam }; panner: { positionX: MockParam; positionZ: MockParam } | null }
    >;
    isBgmActive: boolean;
    preloadStarted: boolean;
  };

  const prevCtx = engine.ctx;
  const prevDuck = engine.bgmDuckGain;
  const prevSfx = engine.sfxBus;
  const prevPreload = engine.preloadStarted;
  const prevWindow = (globalThis as unknown as { window?: unknown }).window;

  try {
    (globalThis as unknown as { window: unknown }).window = {
      setInterval: () => 1,
      clearInterval: () => {},
      setTimeout: () => 1,
      clearTimeout: () => {},
    };
    engine.preloadStarted = true;
    engine.ctx = mockCtx;
    engine.bgmDuckGain = mockCtx.createGain();
    engine.sfxBus = mockCtx.createGain();

    for (const entry of AUDIO_SAMPLE_MANIFEST) {
      engine.sampleBuffers.set(entry.key, { duration: 6.0 });
    }

    sound.setBiome('autumn');
    sound.startBGM('day');

    // Campfire spatial panner at (0, 0.45, 0) with exact distance model parameters
    const campfirePanner = createdPanners.find(
      (p) => p.refDistance === 4.2 && p.maxDistance === 32 && p.rolloffFactor === 1.25
    );
    assert.ok(campfirePanner, 'Expected spatial campfire PannerNode at (0, 0.45, 0)');
    assert.equal(campfirePanner.positionX.value, 0);
    assert.equal(campfirePanner.positionY.value, 0.45);
    assert.equal(campfirePanner.positionZ.value, 0);

    // Autumn stream lowpass opens up near stream (<3m -> 9500Hz) and muffles far away (>=20m -> 1400Hz)
    const streamZAtX0 = -16.2 + Math.sin(0) * 2.4 + Math.cos(0) * 0.95; // -15.25
    sound.updateSpatialFrame({
      x: 0,
      y: 1.7,
      z: streamZAtX0 + 1.5, // 1.5m from stream (< 3m)
      fx: 0,
      fy: 0,
      fz: -1,
      ux: 0,
      uy: 1,
      uz: 0,
      biome: 'autumn',
      isDay: true,
      isNightBlindfolded: false,
    });
    assert.equal(mockListener.positionZ.value, streamZAtX0 + 1.5);
    assert.ok(
      engine.ambientTracks['stream-loop'].filter.frequency.value >= 9400,
      'Expected autumn stream lowpass near 9500 Hz within 3m'
    );

    sound.updateSpatialFrame({
      x: 0,
      y: 1.7,
      z: streamZAtX0 + 22, // 22m from stream (>= 20m)
      fx: 0,
      fy: 0,
      fz: -1,
      ux: 0,
      uy: 1,
      uz: 0,
      biome: 'autumn',
      isDay: true,
      isNightBlindfolded: false,
    });
    assert.ok(
      engine.ambientTracks['stream-loop'].filter.frequency.value <= 1450,
      'Expected autumn stream lowpass muffled to ~1400 Hz at >=20m'
    );

    // Frostpeak mutes summer birds & pond frogs and enables alpine wind bed
    sound.setBiome('frostpeak');
    assert.equal(engine.ambientTracks['day-birds-loop'].bus.gain.value, 0.0001);
    assert.equal(engine.ambientTracks['night-forest-loop'].bus.gain.value, 0.0001);
    assert.ok(engine.ambientTracks['wind-howl-loop'].bus.gain.value >= 0.3);

    // Spatial prop & cutscene calls allocate 3D PannerNodes cleanly at target coordinates
    const pannersBefore = createdPanners.length;
    sound.playThrowWhoosh('tomato', { x: 3, y: 1.5, z: -4 });
    sound.playPropSplat('tomato', { x: 5, y: 1.2, z: -7 });
    sound.playPropSplat('egg', { x: -4, y: 1.2, z: 3 });
    sound.playPropSplat('water', { x: 2, y: 1.2, z: 6 });
    sound.playPropSplat('rose', { x: -2, y: 1.2, z: -5 });
    sound.playSkillCutsceneSfx('werewolf', { x: 6, y: 1.3, z: -2 });
    sound.playSkillCutsceneSfx('witch_poison', { x: -6, y: 1.3, z: 2 });
    sound.playFootstep('water', true, false);
    sound.playFootstep('snow', false, true);
    assert.ok(createdPanners.length > pannersBefore, 'Expected 3D PannerNodes created for spatial SFX');

    sound.stopBGM();
  } finally {
    sound.stopBGM();
    sound.setBiome('forest');
    engine.sampleBuffers.clear();
    engine.ctx = prevCtx;
    engine.bgmDuckGain = prevDuck;
    engine.sfxBus = prevSfx;
    engine.preloadStarted = prevPreload;
    if (prevWindow === undefined) {
      delete (globalThis as unknown as { window?: unknown }).window;
    } else {
      (globalThis as unknown as { window?: unknown }).window = prevWindow;
    }
  }
});
