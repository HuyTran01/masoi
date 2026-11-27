import { Language, NightSkillCutsceneKind, PropType, RoleId } from '../types/game';

export type AudioBiome = 'forest' | 'frostpeak' | 'autumn';
export type FootstepSurface = 'dirt' | 'grass' | 'snow' | 'water';

export interface SpatialVec3 {
  x: number;
  y: number;
  z: number;
}

export interface SpatialAudioFrame {
  x: number;
  y: number;
  z: number;
  fx: number;
  fy: number;
  fz: number;
  ux: number;
  uy: number;
  uz: number;
  biome: AudioBiome;
  isDay: boolean;
  isNightBlindfolded: boolean;
}

export interface RoleCalloutMeta {
  quote: string;
  quotes: Record<Language, string>;
  sfxLabel: string;
  musicTitle: string;
}

export interface PropReactionMeta {
  emotion: 'angry' | 'happy_dance';
  emoji: string;
  badgeText: Record<Language, string>;
  speechText: Record<Language, string>;
}

export const AUDIO_SAMPLE_MANIFEST = [
  { key: 'wolf-howl', url: '/audio/sfx/wolf-howl.mp3' },
  { key: 'campfire-loop', url: '/audio/sfx/campfire-loop.mp3' },
  { key: 'night-forest-loop', url: '/audio/sfx/night-forest-loop.mp3' },
  { key: 'day-birds-loop', url: '/audio/sfx/day-birds-loop.mp3' },
  { key: 'church-bell', url: '/audio/sfx/church-bell.mp3' },
  { key: 'cauldron-bubble', url: '/audio/sfx/cauldron-bubble.mp3' },
  { key: 'shotgun-blast', url: '/audio/sfx/shotgun-blast.mp3' },
  { key: 'wood-gavel', url: '/audio/sfx/wood-gavel.mp3' },
  { key: 'card-flip', url: '/audio/sfx/card-flip.mp3' },
  { key: 'mystic-chime', url: '/audio/sfx/mystic-chime.mp3' },
  { key: 'stream-loop', url: '/audio/sfx/stream-loop.mp3' },
  { key: 'wind-howl-loop', url: '/audio/sfx/wind-howl-loop.mp3' },
  { key: 'owl-forest-call', url: '/audio/sfx/owl-forest-call.mp3' },
  { key: 'tomato-splat', url: '/audio/sfx/tomato-splat.mp3' },
  { key: 'egg-crack-splat', url: '/audio/sfx/egg-crack-splat.mp3' },
  { key: 'water-splash', url: '/audio/sfx/water-splash.mp3' },
] as const;

export type AudioSampleKey = (typeof AUDIO_SAMPLE_MANIFEST)[number]['key'];

export function getAudioSampleManifest(): readonly { key: string; url: string }[] {
  return AUDIO_SAMPLE_MANIFEST;
}

/**
 * Pure helper to select a SpeechSynthesisVoice that strictly matches the target language.
 * Prevents PC browsers (which often only have en-US voices installed) from reading
 * Vietnamese, Japanese, French, or Spanish text using an English accent!
 */
export function selectBestVoiceForLanguage<
  T extends { lang: string; name?: string; localService?: boolean }
>(voices: readonly T[], targetLang: Language): T | null {
  if (!Array.isArray(voices) || voices.length === 0) return null;
  const prefix = targetLang.toLowerCase();
  const matching = voices.filter((v) => {
    if (!v || typeof v.lang !== 'string') return false;
    const normalized = v.lang.toLowerCase().replace('_', '-').trim();
    return normalized === prefix || normalized.startsWith(`${prefix}-`);
  });

  if (matching.length === 0) return null;
  // Prefer high-quality natural/Google/Microsoft voices for that exact language
  const preferred = matching.find(
    (v) =>
      v.name &&
      (v.name.toLowerCase().includes('natural') ||
        v.name.toLowerCase().includes('google') ||
        v.name.toLowerCase().includes('hoaimy') ||
        v.name.toLowerCase().includes('namminh'))
  );
  return preferred || matching[0];
}

/**
 * Dramatic Role Wake-Up Voice Lines, Authentic Werewolf SFX & Musical Themes for all 13 Roles
 */
export const ROLE_CALLOUT_LINES: Record<RoleId, RoleCalloutMeta> = {
  werewolf: {
    quote: 'Auuuuuu... Trăng máu đã lên! Đàn Ma Sói thức dậy đi săn mồi nào!',
    quotes: {
      vi: 'Auuuuuu... Trăng máu đã lên! Đàn Ma Sói thức dậy đi săn mồi nào!',
      en: 'Awooooo... The Blood Moon rises! Werewolves, awaken and hunt your prey!',
    },
    sfxLabel: '🐺 Tiếng Sói Hú Trăng Máu & Gió Rừng Đêm',
    musicTitle: '🎵 Bản Giao Hưởng Trăng Máu (Blood Moon Pack Howl)',
  },
  wolf_pup: {
    quote: 'Gâu gâu! Sói Con nhe nanh thức dậy cùng bầy đàn nào!',
    quotes: {
      vi: 'Gâu gâu! Sói Con nhe nanh thức dậy cùng bầy đàn nào!',
      en: 'Arf arf! The fierce Wolf Pup bares its fangs with the pack!',
    },
    sfxLabel: '🐾 Tiếng Sói Con Gầm Gừ & Trống Chiến Cuồng Nộ',
    musicTitle: '🎵 Vũ Điệu Nanh Sói Non (Feral Cub Drums)',
  },
  witch: {
    quote: 'Khà khà khà... Vạc độc sôi sùng sục... Cứu ai hay giết ai đêm nay đây?',
    quotes: {
      vi: 'Khà khà khà... Vạc độc sôi sùng sục... Cứu ai hay giết ai đêm nay đây?',
      en: 'Hehehe... My cauldron bubbles... Who shall I heal, and who shall taste poison tonight?',
    },
    sfxLabel: '🧪 Tiếng Vạc Độc Sôi Sùng Sục & Tiếng Thì Thầm Ma Mị',
    musicTitle: '🎵 Khúc Nhạc Giả Kim Huyền Bí (Midnight Cauldron Waltz)',
  },
  hunter: {
    quote: 'Cạch rốp! Khẩu súng săn đã lên nòng... Kẻ nào hạ gục ta sẽ phải trả giá!',
    quotes: {
      vi: 'Cạch rốp! Khẩu súng săn đã lên nòng... Kẻ nào hạ gục ta sẽ phải trả giá!',
      en: 'Click-clack! My hunting shotgun is loaded... Whoever strikes me down will pay the price!',
    },
    sfxLabel: '🔫 Tiếng Lên Nòng Súng Săn & Phát Bắn Rừng Đêm',
    musicTitle: '🎵 Hành Khúc Xạ Thủ Rừng Già (Iron Shotgun March)',
  },
  seer: {
    quote: 'Hỡi quả cầu pha lê huyền bí... Hãy vạch trần bộ mặt thật kẻ ẩn mình trong bóng tối!',
    quotes: {
      vi: 'Hỡi quả cầu pha lê huyền bí... Hãy vạch trần bộ mặt thật kẻ ẩn mình trong bóng tối!',
      en: 'O mystic crystal ball... Reveal the true alignment hidden in the shadows!',
    },
    sfxLabel: '🔮 Tiếng Chuông Pha Lê & Nhịp Đập Nhãn Thần',
    musicTitle: '🎵 Giai Điệu Tiên Tri Tinh Tú (Astral Divination Chimes)',
  },
  bodyguard: {
    quote: 'Keng! Khiên thép đã giương cao! Đêm nay không con sói nào bước qua được xác ta!',
    quotes: {
      vi: 'Keng! Khiên thép đã giương cao! Đêm nay không con sói nào bước qua được xác ta!',
      en: 'Clang! My iron shield is raised! No werewolf shall pass my watch tonight!',
    },
    sfxLabel: '🛡️ Tiếng Khiên Thép Va Chạm & Tù Và Hộ Vệ',
    musicTitle: '🎵 Khúc Ca Kỵ Sĩ Hộ Vệ (Citadel Shield Fanfare)',
  },
  cupid: {
    quote: 'Vút... Phập! Mũi tên tình ái đã giương cung, hai sinh mệnh kết nối cùng sống cùng chết!',
    quotes: {
      vi: 'Vút... Phập! Mũi tên tình ái đã giương cung, hai sinh mệnh kết nối cùng sống cùng chết!',
      en: 'Whoosh... Thwip! Cupid’s arrow flies, binding two souls in life and death!',
    },
    sfxLabel: '💘 Tiếng Bắn Cung Tên Tình Ái & Đàn Hạc Thiên Thần',
    musicTitle: '🎵 Bản Tình Ca Định Mệnh (Celestial Harp Serenade)',
  },
  doppelganger: {
    quote: 'Chiếc gương ma thuật phản chiếu... Khi ngươi ngã xuống, ta sẽ mang hình hài của ngươi!',
    quotes: {
      vi: 'Chiếc gương ma thuật phản chiếu... Khi ngươi ngã xuống, ta sẽ mang hình hài của ngươi!',
      en: 'The phantom mirror reflects... When you fall, I shall become your shadow!',
    },
    sfxLabel: '🪞 Tiếng Gương Ma Thuật Ngân Vang & Bóng Phân Thân',
    musicTitle: '🎵 Vũ Khúc Phản Chiếu Trong Gương (Phantom Mirror Echo)',
  },
  elder: {
    quote: 'Boong... Lão già làng chống gậy sắt thức tỉnh! Sức mạnh cổ xưa che chở ngôi làng!',
    quotes: {
      vi: 'Boong... Lão già làng chống gậy sắt thức tỉnh! Sức mạnh cổ xưa che chở ngôi làng!',
      en: 'Boooong... The Village Elder awakens! Ancient wisdom shields our bloodline!',
    },
    sfxLabel: '👑 Tiếng Chuông Đồng Cổ Đại & Gậy Trượng Già Làng',
    musicTitle: '🎵 Hào Khí Trưởng Lão Ngàn Năm (Ancient Temple Gong)',
  },
  cursed: {
    quote: 'Thịch... thịch... Dòng máu nguyền rủa đang sôi trào dưới ánh trăng đêm!',
    quotes: {
      vi: 'Thịch... thịch... Dòng máu nguyền rủa đang sôi trào dưới ánh trăng đêm!',
      en: 'Thump... thump... The cursed blood simmers beneath the moonlight!',
    },
    sfxLabel: '🌓 Tiếng Tim Đập Huyết Nguyền & Tiếng Gầm Hóa Sói',
    musicTitle: '🎵 Giao Hưởng Huyết Nguyền (Dark Transformation Pulse)',
  },
  traitor: {
    quote: 'Xoẹt! Lưỡi dao găm giấu trong tay áo... Ta sẽ dẫn đường cho bầy Sói làm cỏ ngôi làng này!',
    quotes: {
      vi: 'Xoẹt! Lưỡi dao găm giấu trong tay áo... Ta sẽ dẫn đường cho bầy Sói làm cỏ ngôi làng này!',
      en: 'Shhhk! A dagger hidden in the dark... I serve the Werewolves from within!',
    },
    sfxLabel: '🗡️ Tiếng Tuốt Dao Găm Sắc Lạnh & Lời Thì Thầm Phản Bội',
    musicTitle: '🎵 Khúc Nhạc Mưu Đồ Bóng Tối (Shadow Dagger Intrigue)',
  },
  tanner: {
    quote: 'Haha! Treo cổ ta đi! Chỉ cần bước lên giá treo cổ là ta độc chiếm chiến thắng!',
    quotes: {
      vi: 'Haha! Treo cổ ta đi! Chỉ cần bước lên giá treo cổ là ta độc chiếm chiến thắng!',
      en: 'Haha! Lynch me today! The gallows are my throne of solo victory!',
    },
    sfxLabel: '🎭 Tiếng Hộp Nhạc Hề Ma & Chuông Giá Treo Cổ',
    musicTitle: '🎵 Điệu Nhảy Kẻ Chán Đời (Jester Gallows Polka)',
  },
  villager: {
    quote: 'Boong... Màn đêm tĩnh mịch bao trùm... Dân làng khoá chặt cửa cầu nguyện bình an...',
    quotes: {
      vi: 'Boong... Màn đêm tĩnh mịch bao trùm... Dân làng khoá chặt cửa cầu nguyện bình an...',
      en: 'Bong... Silence falls over the dark village... Lock your doors and pray for dawn...',
    },
    sfxLabel: '🔔 Tiếng Chuông Canh Đêm & Dế Kêu Rừng Khuya',
    musicTitle: '🎵 Khúc Ru Đêm Làng Cổ (Silent Village Lullaby)',
  },
};

export const PROP_REACTION_META: Record<PropType, PropReactionMeta> = {
  tomato: {
    emotion: 'angry',
    emoji: '🤬',
    badgeText: {
      vi: '🤬 TỨC GIẬN SÔI MÁU!',
      en: '🤬 FURIOUS RAGE!',
    },
    speechText: {
      vi: 'Á à! Đứa nào dám ném cà chua vào mặt ta đó?! Tức điên lên được! 🍅💢',
      en: 'Hey!! Who threw that rotten tomato at my face?! I am furious! 🍅💢',
    },
  },
  egg: {
    emotion: 'angry',
    emoji: '😡',
    badgeText: {
      vi: '😡 NỔI GIẬN ĐÙNG ĐÙNG!',
      en: '😡 BOILING ANGRY!',
    },
    speechText: {
      vi: 'Trứng thối bốc mùi kinh quá! Đồ đáng ghét! 🥚💢',
      en: 'Yuck, rotten egg! That smells awful! You will pay for this! 🥚💢',
    },
  },
  water: {
    emotion: 'angry',
    emoji: '😤',
    badgeText: {
      vi: '😤 TỨC XÌ KHÓI ĐẦU!',
      en: '😤 SOAKED & ANGRY!',
    },
    speechText: {
      vi: 'Ướt nhẹp cả người rồi! Lạnh quá đi mất, coi chừng ta! 🪣💢',
      en: 'I am completely soaked! Freezing cold! Watch yourself! 🪣💢',
    },
  },
  rose: {
    emotion: 'happy_dance',
    emoji: '💃',
    badgeText: {
      vi: '💃 VUI MỪNG NHẢY MÚA!',
      en: '💃 HAPPY DANCING!',
    },
    speechText: {
      vi: 'Oa hoa hồng thơm quá! Vui quá nhảy múa thôi! 💐💖🎶',
      en: 'Aw, a lovely rose bouquet! Time for a happy dance! 💐💖🎶',
    },
  },
};

type BgmMode = 'night' | 'day' | 'lobby';
type AmbientLoopKey =
  | 'campfire-loop'
  | 'night-forest-loop'
  | 'day-birds-loop'
  | 'stream-loop'
  | 'wind-howl-loop';

const AMBIENT_LOOP_KEYS: readonly AmbientLoopKey[] = [
  'campfire-loop',
  'night-forest-loop',
  'day-birds-loop',
  'stream-loop',
  'wind-howl-loop',
];

interface SamplePlayOptions {
  gain?: number;
  rate?: number;
  jitter?: boolean;
  pan?: number;
  pos?: SpatialVec3;
  refDistance?: number;
  maxDistance?: number;
  rolloffFactor?: number;
  startTime?: number;
  offset?: number;
  duration?: number;
  fadeIn?: number;
  fadeOut?: number;
  filterType?: BiquadFilterType;
  filterFreq?: number;
  filterQ?: number;
  extraReverb?: number;
}

interface AmbientLoopTrack {
  key: AmbientLoopKey;
  bus: GainNode;
  filter: BiquadFilterNode;
  panner: PannerNode | null;
  activeSources: Set<AudioBufferSourceNode>;
  timer: number | null;
  running: boolean;
}

interface GothicDroneRig {
  gain: GainNode;
  filter: BiquadFilterNode;
  oscillators: OscillatorNode[];
  lfo: OscillatorNode;
  lfoGain: GainNode;
}

const SAMPLE_URL_BY_KEY: Record<AudioSampleKey, string> = Object.fromEntries(
  AUDIO_SAMPLE_MANIFEST.map((entry) => [entry.key, entry.url])
) as Record<AudioSampleKey, string>;

class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private bgmBus: GainNode | null = null;
  private bgmDuckGain: GainNode | null = null;
  private reverbNode: ConvolverNode | null = null;
  private pinkNoiseCache: Map<number, AudioBuffer> = new Map();

  private sampleBuffers: Map<AudioSampleKey, AudioBuffer> = new Map();
  private sampleLoads: Map<AudioSampleKey, Promise<AudioBuffer | null>> = new Map();
  private preloadStarted: boolean = false;

  private isMuted: boolean = false;
  private isBgmMuted: boolean = false;
  private isSfxMuted: boolean = false;
  private isBgmActive: boolean = false;
  private bgmMode: BgmMode = 'lobby';
  private currentBiome: AudioBiome = 'forest';
  private nextAmbientOneShotAt: number = 0;
  private footstepSide: number = 1;
  private lastPropReactionMs: Partial<Record<PropType, number>> = {};

  private ambientTracks: Partial<Record<AmbientLoopKey, AmbientLoopTrack>> = {};
  private droneRig: GothicDroneRig | null = null;
  private frostPadRig: GothicDroneRig | null = null;
  private motifTimer: number | null = null;
  private motifStep: number = 0;

  private ttsQueueTimer: number | null = null;
  private ttsDuckFallbackTimer: number | null = null;
  private lastTtsAt: number = 0;
  private cachedVoices: SpeechSynthesisVoice[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
      this.isMuted = this.readStorageFlag('werewolf_muted');
      this.isBgmMuted = this.readStorageFlag('werewolf_bgm_muted');
      this.isSfxMuted = this.readStorageFlag('werewolf_sfx_muted');

      if ('speechSynthesis' in window) {
        const refreshVoices = () => {
          try {
            const loaded = window.speechSynthesis.getVoices();
            if (loaded.length > 0) this.cachedVoices = loaded;
          } catch {
            // ignore
          }
        };
        refreshVoices();
        try {
          window.speechSynthesis.onvoiceschanged = refreshVoices;
        } catch {
          // ignore
        }
      }
    }
  }

  private readStorageFlag(key: string): boolean {
    try {
      return localStorage.getItem(key) === 'true';
    } catch {
      return false;
    }
  }

  private writeStorageFlag(key: string, value: boolean) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(key, String(value));
    } catch {
      // ignore storage quota/privacy errors
    }
  }

  private canPlaySfx(): boolean {
    return !this.isMuted && !this.isSfxMuted;
  }

  private canPlayBgm(): boolean {
    return !this.isMuted && !this.isBgmMuted;
  }

  /**
   * Initializes AudioContext + Studio Master Bus:
   * sfxBus / bgmBus -> (dry + ConvolverNode 2.6s Dark Forest IR) -> masterGain -> DynamicsCompressor -> destination
   */
  private initCtx(): AudioContext | null {
    if (typeof window === 'undefined') return null;

    if (!this.ctx) {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtxClass) return null;

      try {
        const ctx = new AudioCtxClass();
        this.ctx = ctx;

        const masterGain = ctx.createGain();
        masterGain.gain.setValueAtTime(this.isMuted ? 0.0001 : 1.0, ctx.currentTime);
        this.masterGain = masterGain;

        // Master bus limiter/compressor (-14dB threshold, 4:1 ratio) prevents clipping
        if (typeof ctx.createDynamicsCompressor === 'function') {
          const comp = ctx.createDynamicsCompressor();
          comp.threshold.setValueAtTime(-14, ctx.currentTime);
          comp.knee.setValueAtTime(12, ctx.currentTime);
          comp.ratio.setValueAtTime(4, ctx.currentTime);
          comp.attack.setValueAtTime(0.004, ctx.currentTime);
          comp.release.setValueAtTime(0.18, ctx.currentTime);
          masterGain.connect(comp);
          comp.connect(ctx.destination);
        } else {
          masterGain.connect(ctx.destination);
        }

        // 2.6s procedural stereo Dark Forest / Stone Cathedral impulse response reverb
        let reverbReturn: GainNode | null = null;
        if (typeof ctx.createConvolver === 'function') {
          const convolver = ctx.createConvolver();
          convolver.buffer = this.createDarkForestImpulse(ctx, 2.6);
          const wetReturn = ctx.createGain();
          wetReturn.gain.setValueAtTime(0.68, ctx.currentTime);
          convolver.connect(wetReturn);
          wetReturn.connect(masterGain);
          this.reverbNode = convolver;
          reverbReturn = wetReturn;
        }

        // SFX bus -> dry (0.9) + reverb send (0.38)
        const sfxBus = ctx.createGain();
        sfxBus.gain.setValueAtTime(this.canPlaySfx() ? 1.0 : 0.0001, ctx.currentTime);
        const sfxDry = ctx.createGain();
        sfxDry.gain.setValueAtTime(0.9, ctx.currentTime);
        sfxBus.connect(sfxDry);
        sfxDry.connect(masterGain);
        if (this.reverbNode && reverbReturn) {
          const sfxWet = ctx.createGain();
          sfxWet.gain.setValueAtTime(0.38, ctx.currentTime);
          sfxBus.connect(sfxWet);
          sfxWet.connect(this.reverbNode);
        }
        this.sfxBus = sfxBus;

        // BGM duck -> BGM bus -> dry (0.85) + reverb send (0.45)
        const bgmDuckGain = ctx.createGain();
        bgmDuckGain.gain.setValueAtTime(1.0, ctx.currentTime);
        const bgmBus = ctx.createGain();
        bgmBus.gain.setValueAtTime(this.canPlayBgm() ? 1.0 : 0.0001, ctx.currentTime);
        bgmDuckGain.connect(bgmBus);

        const bgmDry = ctx.createGain();
        bgmDry.gain.setValueAtTime(0.85, ctx.currentTime);
        bgmBus.connect(bgmDry);
        bgmDry.connect(masterGain);
        if (this.reverbNode && reverbReturn) {
          const bgmWet = ctx.createGain();
          bgmWet.gain.setValueAtTime(0.45, ctx.currentTime);
          bgmBus.connect(bgmWet);
          bgmWet.connect(this.reverbNode);
        }
        this.bgmDuckGain = bgmDuckGain;
        this.bgmBus = bgmBus;
      } catch {
        return null;
      }
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    if (!this.preloadStarted) {
      this.preloadStarted = true;
      this.preloadCoreSamples();
    }

    return this.ctx;
  }

  private syncBusGains() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    try {
      if (this.masterGain) {
        this.masterGain.gain.setTargetAtTime(this.isMuted ? 0.0001 : 1.0, now, 0.03);
      }
      if (this.sfxBus) {
        this.sfxBus.gain.setTargetAtTime(this.canPlaySfx() ? 1.0 : 0.0001, now, 0.03);
      }
      if (this.bgmBus) {
        this.bgmBus.gain.setTargetAtTime(this.canPlayBgm() ? 1.0 : 0.0001, now, 0.08);
      }
    } catch {
      // ignore
    }
  }

  private setBgmDuck(ducked: boolean) {
    if (!this.ctx || !this.bgmDuckGain) return;
    try {
      const now = this.ctx.currentTime;
      this.bgmDuckGain.gain.setTargetAtTime(ducked ? 0.48 : 1.0, now, ducked ? 0.08 : 0.25);
    } catch {
      // ignore
    }
  }

  /**
   * Generates a 2.6s stereo Dark Forest / Stone Cathedral impulse response:
   * early outdoor/stone reflections + exponentially decaying progressively-damped pink noise.
   */
  private createDarkForestImpulse(ctx: AudioContext, durationSec: number): AudioBuffer {
    const sampleRate = ctx.sampleRate || 44100;
    const length = Math.max(1, Math.floor(sampleRate * durationSec));
    const impulse = ctx.createBuffer(2, length, sampleRate);

    const earlyMs = [21, 37, 58, 84, 117];
    for (let ch = 0; ch < 2; ch++) {
      const data = impulse.getChannelData(ch);
      let b0 = 0,
        b1 = 0,
        b2 = 0,
        lp = 0;

      for (let i = 0; i < length; i++) {
        const t = i / sampleRate;
        const white = Math.random() * 2 - 1;
        b0 = 0.997 * b0 + white * 0.099;
        b1 = 0.963 * b1 + white * 0.296;
        b2 = 0.57 * b2 + white * 1.052;
        const pink = (b0 + b1 + b2 + white * 0.184) * 0.19;

        // Damp high frequencies faster as tail decays (forest mist absorption)
        const dampAlpha = Math.max(0.08, 0.58 * Math.exp(-t * 1.15));
        lp += dampAlpha * (pink - lp);

        // Pre-delay ramp in first 22ms + smooth exponential decay
        const preDelay = t < 0.022 ? t / 0.022 : 1.0;
        const decay = Math.exp(-t * 2.45);
        data[i] = lp * preDelay * decay * 0.42;
      }

      // Sparse early reflections with alternating stereo weight
      earlyMs.forEach((ms, idx) => {
        const sampleIdx = Math.floor((ms / 1000) * sampleRate) + (ch === 1 ? idx * 71 : 0);
        if (sampleIdx < length) {
          const sign = idx % 2 === ch ? 1 : -0.7;
          data[sampleIdx] += sign * (0.22 / (idx + 1));
        }
      });
    }
    return impulse;
  }

  private createNoiseBuffer(ctx: AudioContext, durationSec: number): AudioBuffer {
    const key = Math.round(durationSec * 100);
    const cached = this.pinkNoiseCache.get(key);
    if (cached && cached.sampleRate === ctx.sampleRate) return cached;

    const sampleRate = ctx.sampleRate || 44100;
    const length = Math.max(1, Math.floor(sampleRate * durationSec));
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0,
      b1 = 0,
      b2 = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99765 * b0 + white * 0.099046;
      b1 = 0.963 * b1 + white * 0.2965164;
      b2 = 0.57 * b2 + white * 1.0526913;
      data[i] = (b0 + b1 + b2 + white * 0.1848) * 0.22;
    }
    if (this.pinkNoiseCache.size < 16) {
      this.pinkNoiseCache.set(key, buffer);
    }
    return buffer;
  }

  private createPanner(ctx: AudioContext, pan: number): AudioNode {
    if (typeof ctx.createStereoPanner === 'function') {
      const p = ctx.createStereoPanner();
      p.pan.setValueAtTime(Math.max(-1, Math.min(1, pan)), ctx.currentTime);
      return p;
    }
    return ctx.createGain();
  }

  private setPannerPosition(
    panner: PannerNode,
    pos: SpatialVec3,
    now: number,
    smoothTau: number = 0
  ) {
    if (!Number.isFinite(pos.x) || !Number.isFinite(pos.y) || !Number.isFinite(pos.z)) return;
    try {
      if (panner.positionX && panner.positionY && panner.positionZ) {
        if (smoothTau > 0) {
          panner.positionX.setTargetAtTime(pos.x, now, smoothTau);
          panner.positionY.setTargetAtTime(pos.y, now, smoothTau);
          panner.positionZ.setTargetAtTime(pos.z, now, smoothTau);
        } else {
          panner.positionX.setValueAtTime(pos.x, now);
          panner.positionY.setValueAtTime(pos.y, now);
          panner.positionZ.setValueAtTime(pos.z, now);
        }
      } else if (typeof panner.setPosition === 'function') {
        panner.setPosition(pos.x, pos.y, pos.z);
      }
    } catch {
      // ignore legacy WebKit param errors
    }
  }

  private createSpatialPanner(
    ctx: AudioContext,
    pos: SpatialVec3,
    opts?: { refDistance?: number; maxDistance?: number; rolloffFactor?: number }
  ): PannerNode | null {
    if (typeof ctx.createPanner !== 'function') return null;
    try {
      const panner = ctx.createPanner();
      panner.panningModel = 'equalpower';
      panner.distanceModel = 'inverse';
      panner.refDistance = opts?.refDistance ?? 4.5;
      panner.maxDistance = opts?.maxDistance ?? 40;
      panner.rolloffFactor = opts?.rolloffFactor ?? 1.1;
      this.setPannerPosition(panner, pos, ctx.currentTime);
      return panner;
    } catch {
      return null;
    }
  }

  private connectToSfx(
    ctx: AudioContext,
    node: AudioNode,
    pan: number = 0,
    extraReverbSend: number = 0,
    pos?: SpatialVec3,
    spatialOpts?: { refDistance?: number; maxDistance?: number; rolloffFactor?: number }
  ) {
    const target = this.sfxBus || this.masterGain || ctx.destination;
    let out: AudioNode = node;
    if (pos) {
      const spatial = this.createSpatialPanner(ctx, pos, spatialOpts);
      if (spatial) {
        node.connect(spatial);
        out = spatial;
      }
    } else if (pan !== 0) {
      const stereo = this.createPanner(ctx, pan);
      node.connect(stereo);
      out = stereo;
    }
    out.connect(target);
    if (extraReverbSend > 0 && this.reverbNode && this.sfxBus) {
      const send = ctx.createGain();
      send.gain.setValueAtTime(extraReverbSend, ctx.currentTime);
      out.connect(send);
      send.connect(this.reverbNode);
    }
  }

  /**
   * Lazy async sample loader with per-key deduplication & silent offline fallback.
   */
  private loadSample(key: AudioSampleKey): Promise<AudioBuffer | null> {
    const existing = this.sampleBuffers.get(key);
    if (existing) return Promise.resolve(existing);

    const inflight = this.sampleLoads.get(key);
    if (inflight) return inflight;

    if (typeof window === 'undefined' || typeof fetch !== 'function' || !this.ctx) {
      return Promise.resolve(null);
    }

    const ctx = this.ctx;
    const url = SAMPLE_URL_BY_KEY[key];

    const promise = fetch(url)
      .then((res) => {
        if (!res.ok) return null;
        return res.arrayBuffer();
      })
      .then((arr) => {
        if (!arr || arr.byteLength < 64) return null;
        return ctx.decodeAudioData(arr.slice(0));
      })
      .then((decoded) => {
        if (decoded) {
          this.sampleBuffers.set(key, decoded);
          if (this.isBgmActive && (AMBIENT_LOOP_KEYS as readonly string[]).includes(key)) {
            this.ensureAmbientLoopRunning(key as AmbientLoopKey);
            this.updateAmbientMix(1.2);
          }
        }
        return decoded;
      })
      .catch(() => null);

    this.sampleLoads.set(key, promise);
    return promise;
  }

  private preloadCoreSamples() {
    // Load ambient loops first, then interactive SFX asynchronously
    const ordered: AudioSampleKey[] = [
      'campfire-loop',
      'night-forest-loop',
      'day-birds-loop',
      'stream-loop',
      'wind-howl-loop',
      'card-flip',
      'tomato-splat',
      'egg-crack-splat',
      'water-splash',
      'owl-forest-call',
      'church-bell',
      'wolf-howl',
      'wood-gavel',
      'mystic-chime',
      'cauldron-bubble',
      'shotgun-blast',
    ];
    for (const key of ordered) {
      void this.loadSample(key);
    }
  }

  private playSampleBuffer(key: AudioSampleKey, opts: SamplePlayOptions = {}): boolean {
    const ctx = this.ctx;
    if (!ctx) return false;
    const buffer = this.sampleBuffers.get(key);
    if (!buffer) {
      void this.loadSample(key);
      return false;
    }

    try {
      const startTime = opts.startTime ?? ctx.currentTime;
      const src = ctx.createBufferSource();
      src.buffer = buffer;

      const baseRate = opts.rate ?? 1.0;
      const jitterFactor = opts.jitter === false ? 1.0 : 0.96 + Math.random() * 0.08;
      const rate = Math.max(0.4, Math.min(2.2, baseRate * jitterFactor));
      src.playbackRate.setValueAtTime(rate, startTime);

      const offset = Math.max(0, Math.min(opts.offset ?? 0, Math.max(0, buffer.duration - 0.05)));
      const availableDur = Math.max(0.05, (buffer.duration - offset) / rate);
      const playDur = opts.duration ? Math.min(opts.duration, availableDur) : availableDur;

      const gain = ctx.createGain();
      const targetGain = opts.gain ?? 0.8;
      const fadeIn = Math.min(opts.fadeIn ?? 0.015, playDur * 0.25);
      const fadeOut = Math.min(opts.fadeOut ?? 0.14, playDur * 0.45);

      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.linearRampToValueAtTime(targetGain, startTime + Math.max(0.004, fadeIn));
      const holdEnd = Math.max(startTime + fadeIn + 0.008, startTime + playDur - fadeOut);
      const endTime = Math.max(holdEnd + 0.01, startTime + playDur);
      gain.gain.setValueAtTime(targetGain, holdEnd);
      gain.gain.exponentialRampToValueAtTime(0.0001, endTime);

      let chainTail: AudioNode = src;
      if (opts.filterType && opts.filterFreq) {
        const filter = ctx.createBiquadFilter();
        filter.type = opts.filterType;
        filter.frequency.setValueAtTime(opts.filterFreq, startTime);
        if (opts.filterQ) filter.Q.setValueAtTime(opts.filterQ, startTime);
        chainTail.connect(filter);
        chainTail = filter;
      }

      chainTail.connect(gain);
      const pan = opts.pan ?? Math.random() * 0.26 - 0.13;
      this.connectToSfx(
        ctx,
        gain,
        pan,
        opts.extraReverb ?? 0,
        opts.pos,
        opts.pos
          ? {
              refDistance: opts.refDistance,
              maxDistance: opts.maxDistance,
              rolloffFactor: opts.rolloffFactor,
            }
          : undefined
      );

      src.start(startTime, offset);
      src.stop(endTime + 0.04);
      return true;
    } catch {
      return false;
    }
  }

  public getAudioSampleManifest(): readonly { key: string; url: string }[] {
    return AUDIO_SAMPLE_MANIFEST;
  }

  public cancelSpeech() {
    if (typeof window === 'undefined') return;
    if (this.ttsQueueTimer !== null) {
      window.clearTimeout(this.ttsQueueTimer);
      this.ttsQueueTimer = null;
    }
    if (this.ttsDuckFallbackTimer !== null) {
      window.clearTimeout(this.ttsDuckFallbackTimer);
      this.ttsDuckFallbackTimer = null;
    }
    this.setBgmDuck(false);
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    this.writeStorageFlag('werewolf_muted', this.isMuted);
    this.syncBusGains();
    if (this.isMuted) {
      this.cancelSpeech();
    } else if (this.isBgmActive && !this.isBgmMuted) {
      this.ensureSoundscapeActive();
    }
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public toggleBgmMute(): boolean {
    this.isBgmMuted = !this.isBgmMuted;
    this.writeStorageFlag('werewolf_bgm_muted', this.isBgmMuted);
    this.syncBusGains();
    if (!this.isBgmMuted && !this.isMuted && this.isBgmActive) {
      this.ensureSoundscapeActive();
    }
    return this.isBgmMuted;
  }

  public getBgmMuted(): boolean {
    return this.isBgmMuted;
  }

  public toggleSfxMute(): boolean {
    this.isSfxMuted = !this.isSfxMuted;
    this.writeStorageFlag('werewolf_sfx_muted', this.isSfxMuted);
    this.syncBusGains();
    if (this.isSfxMuted) {
      this.cancelSpeech();
    }
    return this.isSfxMuted;
  }

  public getSfxMuted(): boolean {
    return this.isSfxMuted;
  }

  /**
   * Speaks localized text ONLY if the user's browser/OS actually has a voice installed
   * for `lang`. Smoothly ducks BGM by ~50% while speaking and restores afterward.
   */
  public speakLocalized(
    text: string,
    lang: Language = 'vi',
    options?: { pitch?: number; rate?: number; volume?: number }
  ): boolean {
    if (!this.canPlaySfx() || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return false;
    }

    try {
      const liveVoices = window.speechSynthesis.getVoices();
      if (liveVoices.length > 0) this.cachedVoices = liveVoices;
      const voices = liveVoices.length > 0 ? liveVoices : this.cachedVoices;
      const matchedVoice = selectBestVoiceForLanguage(voices, lang);
      if (!matchedVoice) return false;

      if (this.ttsQueueTimer !== null) {
        window.clearTimeout(this.ttsQueueTimer);
        this.ttsQueueTimer = null;
      }

      const now = Date.now();
      const delayMs = now - this.lastTtsAt < 280 ? 180 : 60;
      this.lastTtsAt = now;

      this.ttsQueueTimer = window.setTimeout(() => {
        this.ttsQueueTimer = null;
        if (!this.canPlaySfx() || typeof window === 'undefined' || !('speechSynthesis' in window)) {
          return;
        }
        try {
          window.speechSynthesis.cancel();
          const utter = new SpeechSynthesisUtterance(text);
          utter.voice = matchedVoice;
          utter.lang = matchedVoice.lang;
          utter.pitch = options?.pitch ?? 1.0;
          utter.rate = options?.rate ?? 1.0;
          utter.volume = options?.volume ?? 0.88;

          const restoreDuck = () => {
            if (this.ttsDuckFallbackTimer !== null) {
              window.clearTimeout(this.ttsDuckFallbackTimer);
              this.ttsDuckFallbackTimer = null;
            }
            this.setBgmDuck(false);
          };

          utter.onstart = () => this.setBgmDuck(true);
          utter.onend = restoreDuck;
          utter.onerror = restoreDuck;

          // Safety restore in case Chromium/Safari drops onend
          this.setBgmDuck(true);
          if (this.ttsDuckFallbackTimer !== null) {
            window.clearTimeout(this.ttsDuckFallbackTimer);
          }
          const estMs = Math.max(3200, Math.min(18000, text.length * 95));
          this.ttsDuckFallbackTimer = window.setTimeout(restoreDuck, estMs);

          window.speechSynthesis.speak(utter);
        } catch {
          this.setBgmDuck(false);
        }
      }, delayMs);
      return true;
    } catch {
      return false;
    }
  }

  // =========================================================================
  // CONTINUOUS 3D SPATIAL BIOME SOUNDSCAPES (REAL RECORDINGS + GOTHIC/FROST PADS)
  // =========================================================================

  private computeStreamPoint(playerX: number): SpatialVec3 {
    const clampedX = Math.max(-42, Math.min(42, Number.isFinite(playerX) ? playerX : 0));
    const streamZ = -16.2 + Math.sin(clampedX * 0.095) * 2.4 + Math.cos(clampedX * 0.045) * 0.95;
    return { x: clampedX, y: -0.2, z: streamZ };
  }

  private ensureAmbientLoopRunning(key: AmbientLoopKey) {
    const ctx = this.ctx;
    if (!ctx || !this.bgmDuckGain || !this.isBgmActive) return;

    const buffer = this.sampleBuffers.get(key);
    if (!buffer) {
      void this.loadSample(key);
      return;
    }

    let track = this.ambientTracks[key];
    if (!track) {
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      const initCutoff =
        key === 'campfire-loop'
          ? 6200
          : key === 'night-forest-loop'
          ? 5400
          : key === 'stream-loop'
          ? 2400
          : key === 'wind-howl-loop'
          ? 4400
          : 7200;
      filter.frequency.setValueAtTime(initCutoff, ctx.currentTime);

      const bus = ctx.createGain();
      bus.gain.setValueAtTime(0.0001, ctx.currentTime);
      filter.connect(bus);

      let panner: PannerNode | null = null;
      if (key === 'campfire-loop') {
        panner = this.createSpatialPanner(
          ctx,
          { x: 0, y: 0.45, z: 0 },
          { refDistance: 4.2, maxDistance: 32, rolloffFactor: 1.25 }
        );
      } else if (key === 'stream-loop') {
        panner = this.createSpatialPanner(ctx, this.computeStreamPoint(0), {
          refDistance: 3.4,
          maxDistance: 28,
          rolloffFactor: 1.2,
        });
      }

      if (panner) {
        bus.connect(panner);
        panner.connect(this.bgmDuckGain);
      } else {
        bus.connect(this.bgmDuckGain);
      }

      track = { key, bus, filter, panner, activeSources: new Set(), timer: null, running: false };
      this.ambientTracks[key] = track;
    }

    if (track.running) return;
    track.running = true;

    const playbackRate = key === 'wind-howl-loop' ? 1.18 : 1.0;
    const effectiveDur = Math.max(1.2, buffer.duration / playbackRate);
    const crossfadeSec = Math.min(1.4, effectiveDur * 0.28);
    const stepMs = Math.max(1400, Math.floor((effectiveDur - crossfadeSec) * 1000));

    const spawnCycle = (firstCycle: boolean) => {
      if (!track || !track.running || !this.ctx || !this.isBgmActive) return;
      try {
        const c = this.ctx;
        const now = c.currentTime;
        const src = c.createBufferSource();
        src.buffer = buffer;
        if (playbackRate !== 1.0) {
          src.playbackRate.setValueAtTime(playbackRate, now);
        }

        const env = c.createGain();
        const fadeIn = firstCycle ? 0.6 : crossfadeSec;
        env.gain.setValueAtTime(0.0001, now);
        env.gain.linearRampToValueAtTime(1.0, now + fadeIn);
        env.gain.setValueAtTime(1.0, Math.max(now + fadeIn, now + effectiveDur - crossfadeSec));
        env.gain.linearRampToValueAtTime(0.0001, now + effectiveDur);

        src.connect(env);
        env.connect(track.filter);
        track.activeSources.add(src);
        src.onended = () => {
          track?.activeSources.delete(src);
        };
        src.start(now);
        src.stop(now + effectiveDur + 0.06);
      } catch {
        // ignore
      }
    };

    spawnCycle(true);
    if (typeof window !== 'undefined') {
      track.timer = window.setInterval(() => spawnCycle(false), stepMs);
    }
  }

  private ensureGothicDroneRunning() {
    const ctx = this.ctx;
    if (!ctx || !this.bgmDuckGain || this.droneRig) return;

    try {
      const now = ctx.currentTime;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(240, now);
      filter.Q.setValueAtTime(1.8, now);

      // Slow 14.3-second breathing LFO sweeping lowpass cutoff organically
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(0.07, now);
      lfoGain.gain.setValueAtTime(135, now);
      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, now);

      // Warm dark D-minor cello & bowed glass voices (D2, A2, F2 detuned pair)
      const voices: Array<{ type: OscillatorType; freq: number; detune: number; amp: number }> = [
        { type: 'triangle', freq: 73.42, detune: -3, amp: 0.42 }, // D2 sub-cello
        { type: 'sine', freq: 110.0, detune: 2, amp: 0.26 }, // A2 dark fifth
        { type: 'sawtooth', freq: 87.31, detune: -7, amp: 0.14 }, // F2 minor third
        { type: 'sawtooth', freq: 146.83, detune: 6, amp: 0.11 }, // D3 warm bowed octave
      ];

      const oscillators: OscillatorNode[] = [];
      for (const v of voices) {
        const osc = ctx.createOscillator();
        const vGain = ctx.createGain();
        osc.type = v.type;
        osc.frequency.setValueAtTime(v.freq, now);
        osc.detune.setValueAtTime(v.detune, now);
        vGain.gain.setValueAtTime(v.amp, now);
        osc.connect(vGain);
        vGain.connect(filter);
        osc.start(now);
        oscillators.push(osc);
      }

      lfo.start(now);
      filter.connect(gain);
      gain.connect(this.bgmDuckGain);
      this.droneRig = { gain, filter, oscillators, lfo, lfoGain };
    } catch {
      // ignore
    }
  }

  private ensureFrostPadRunning() {
    const ctx = this.ctx;
    if (!ctx || !this.bgmDuckGain || this.frostPadRig) return;

    try {
      const now = ctx.currentTime;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1280, now);
      filter.Q.setValueAtTime(2.6, now);

      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(0.09, now);
      lfoGain.gain.setValueAtTime(340, now);
      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, now);

      // Glacial crystalline high-register resonant fifths (D5, A5, E6 shimmer)
      const voices: Array<{ type: OscillatorType; freq: number; detune: number; amp: number }> = [
        { type: 'sine', freq: 587.33, detune: -4, amp: 0.36 },
        { type: 'triangle', freq: 880.0, detune: 5, amp: 0.24 },
        { type: 'sine', freq: 1318.51, detune: -6, amp: 0.14 },
      ];

      const oscillators: OscillatorNode[] = [];
      for (const v of voices) {
        const osc = ctx.createOscillator();
        const vGain = ctx.createGain();
        osc.type = v.type;
        osc.frequency.setValueAtTime(v.freq, now);
        osc.detune.setValueAtTime(v.detune, now);
        vGain.gain.setValueAtTime(v.amp, now);
        osc.connect(vGain);
        vGain.connect(filter);
        osc.start(now);
        oscillators.push(osc);
      }

      lfo.start(now);
      filter.connect(gain);
      gain.connect(this.bgmDuckGain);
      this.frostPadRig = { gain, filter, oscillators, lfo, lfoGain };
    } catch {
      // ignore
    }
  }

  private updateAmbientMix(fadeSec: number = 1.2) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const tau = Math.max(0.08, fadeSec / 3);
    const biome = this.currentBiome;
    const mode = this.bgmMode;

    const targets: Record<AmbientLoopKey, number> = {
      'campfire-loop': mode === 'night' ? 0.62 : mode === 'day' ? 0.34 : 0.56,
      'night-forest-loop': 0.0001,
      'day-birds-loop': 0.0001,
      'stream-loop': 0.0001,
      'wind-howl-loop': 0.0001,
    };

    if (biome === 'frostpeak') {
      // Alpine blizzard bed completely silences summer birds and pond frogs
      targets['day-birds-loop'] = 0.0001;
      targets['night-forest-loop'] = 0.0001;
      targets['wind-howl-loop'] = mode === 'night' ? 0.42 : mode === 'day' ? 0.32 : 0.36;
    } else if (biome === 'autumn') {
      targets['stream-loop'] = mode === 'day' ? 0.68 : mode === 'night' ? 0.52 : 0.58;
      targets['day-birds-loop'] = mode === 'day' ? 0.42 : 0.0001;
      targets['night-forest-loop'] = mode === 'night' ? 0.24 : mode === 'lobby' ? 0.16 : 0.0001;
    } else {
      // Ancient forest: canopy-filtered day birds + deep night forest bed
      targets['day-birds-loop'] = mode === 'day' ? 0.38 : 0.0001;
      targets['night-forest-loop'] = mode === 'night' ? 0.38 : mode === 'lobby' ? 0.24 : 0.0001;
    }

    AMBIENT_LOOP_KEYS.forEach((key) => {
      const track = this.ambientTracks[key];
      if (!track) return;
      try {
        track.bus.gain.setTargetAtTime(targets[key], now, tau);
        if (key === 'day-birds-loop') {
          track.filter.frequency.setTargetAtTime(biome === 'autumn' ? 8000 : 4800, now, tau);
        } else if (key === 'night-forest-loop') {
          track.filter.frequency.setTargetAtTime(biome === 'autumn' ? 4200 : 5400, now, tau);
        } else if (key === 'wind-howl-loop') {
          track.filter.frequency.setTargetAtTime(mode === 'day' ? 4800 : 4100, now, tau);
        }
      } catch {
        // ignore
      }
    });

    if (this.droneRig) {
      const baseDrone = mode === 'night' ? 0.085 : mode === 'lobby' ? 0.055 : 0.012;
      const droneTarget = biome === 'frostpeak' ? baseDrone * 0.55 : baseDrone;
      const cutoffTarget = mode === 'day' ? 320 : 240;
      try {
        this.droneRig.gain.gain.setTargetAtTime(droneTarget, now, tau);
        this.droneRig.filter.frequency.setTargetAtTime(cutoffTarget, now, tau);
      } catch {
        // ignore
      }
    }

    if (this.frostPadRig) {
      const frostTarget =
        biome === 'frostpeak' ? (mode === 'night' ? 0.032 : mode === 'lobby' ? 0.024 : 0.018) : 0.0001;
      try {
        this.frostPadRig.gain.gain.setTargetAtTime(frostTarget, now, tau);
      } catch {
        // ignore
      }
    }
  }

  public setBiome(biome: AudioBiome): void {
    const changed = this.currentBiome !== biome;
    this.currentBiome = biome;
    if (!this.ctx || !this.isBgmActive) return;
    this.ensureFrostPadRunning();
    this.ensureAmbientLoopRunning('stream-loop');
    this.ensureAmbientLoopRunning('wind-howl-loop');
    if (changed) {
      this.nextAmbientOneShotAt = this.ctx.currentTime + 3.0 + Math.random() * 3.0;
    }
    this.updateAmbientMix(1.2);
  }

  public getBiome(): AudioBiome {
    return this.currentBiome;
  }

  public updateSpatialFrame(frame: SpatialAudioFrame): void {
    if (!frame) return;
    if (frame.biome !== this.currentBiome) {
      this.setBiome(frame.biome);
    }

    const ctx = this.ctx;
    if (!ctx || ctx.state === 'closed') return;

    const now = ctx.currentTime;
    const { x, y, z, fx, fy, fz, ux, uy, uz } = frame;
    if (
      Number.isFinite(x) &&
      Number.isFinite(y) &&
      Number.isFinite(z) &&
      Number.isFinite(fx) &&
      Number.isFinite(fy) &&
      Number.isFinite(fz) &&
      Number.isFinite(ux) &&
      Number.isFinite(uy) &&
      Number.isFinite(uz)
    ) {
      try {
        const listener = ctx.listener;
        if (listener.positionX && listener.forwardX && listener.upX) {
          listener.positionX.setTargetAtTime(x, now, 0.045);
          listener.positionY.setTargetAtTime(y, now, 0.045);
          listener.positionZ.setTargetAtTime(z, now, 0.045);
          listener.forwardX.setTargetAtTime(fx, now, 0.045);
          listener.forwardY.setTargetAtTime(fy, now, 0.045);
          listener.forwardZ.setTargetAtTime(fz, now, 0.045);
          listener.upX.setTargetAtTime(ux, now, 0.045);
          listener.upY.setTargetAtTime(uy, now, 0.045);
          listener.upZ.setTargetAtTime(uz, now, 0.045);
        } else {
          const legacy = listener as AudioListener & {
            setPosition?: (px: number, py: number, pz: number) => void;
            setOrientation?: (
              ofx: number,
              ofy: number,
              ofz: number,
              oux: number,
              ouy: number,
              ouz: number
            ) => void;
          };
          legacy.setPosition?.(x, y, z);
          legacy.setOrientation?.(fx, fy, fz, ux, uy, uz);
        }
      } catch {
        // ignore listener update errors
      }
    }

    // Dynamic nearest-point stream emitter + distance-coupled air-absorption lowpass on autumn biome
    if (frame.biome === 'autumn') {
      const streamTrack = this.ambientTracks['stream-loop'];
      if (streamTrack) {
        const pt = this.computeStreamPoint(x);
        if (streamTrack.panner) {
          this.setPannerPosition(streamTrack.panner, pt, now, 0.06);
        }
        const dist = Math.hypot(x - pt.x, z - pt.z);
        const t = Math.max(0, Math.min(1, (dist - 3) / 17));
        const cutoff = 9500 * Math.pow(1400 / 9500, t);
        try {
          streamTrack.filter.frequency.setTargetAtTime(cutoff, now, 0.08);
        } catch {
          // ignore
        }
      }
    }

    // Randomized 3D perimeter directional ambient one-shot scheduler (every 5-11s)
    if (this.isBgmActive && this.canPlayBgm() && !frame.isNightBlindfolded) {
      if (this.nextAmbientOneShotAt <= 0) {
        this.nextAmbientOneShotAt = now + 4.0 + Math.random() * 4.0;
      } else if (now >= this.nextAmbientOneShotAt) {
        this.nextAmbientOneShotAt = now + 5.0 + Math.random() * 6.0;
        this.triggerBiomeAmbientOneShot(frame.biome, frame.isDay, x, z);
      }
    } else if (frame.isNightBlindfolded) {
      this.nextAmbientOneShotAt = Math.max(this.nextAmbientOneShotAt, now + 2.5);
    }
  }

  private triggerBiomeAmbientOneShot(
    biome: AudioBiome,
    isDay: boolean,
    listenerX: number,
    listenerZ: number
  ) {
    const ctx = this.ctx;
    if (!ctx || !this.canPlayBgm()) return;

    const now = ctx.currentTime;
    const angle = Math.random() * Math.PI * 2;
    const radius = 22 + Math.random() * 14;
    const px = listenerX + Math.cos(angle) * radius;
    const pz = listenerZ + Math.sin(angle) * radius;

    try {
      if (biome === 'forest') {
        const roll = Math.random();
        if (roll < 0.3) {
          // Whistling pine wind gust along perimeter canopy
          const played = this.playSampleBuffer('wind-howl-loop', {
            rate: 0.85,
            gain: 0.42,
            offset: Math.random() * 1.6,
            duration: 2.6,
            fadeIn: 0.65,
            fadeOut: 0.85,
            filterType: 'bandpass',
            filterFreq: 680,
            filterQ: 1.4,
            pos: { x: px, y: 6.0, z: pz },
            refDistance: 9,
            maxDistance: 56,
            rolloffFactor: 0.85,
            extraReverb: 0.35,
          });
          if (!played) {
            const wind = ctx.createBufferSource();
            wind.buffer = this.createNoiseBuffer(ctx, 2.2);
            const bp = ctx.createBiquadFilter();
            bp.type = 'bandpass';
            bp.frequency.setValueAtTime(480, now);
            bp.frequency.exponentialRampToValueAtTime(860, now + 1.0);
            bp.frequency.exponentialRampToValueAtTime(340, now + 2.1);
            bp.Q.setValueAtTime(3.2, now);
            const g = ctx.createGain();
            g.gain.setValueAtTime(0.0001, now);
            g.gain.linearRampToValueAtTime(0.14, now + 0.6);
            g.gain.exponentialRampToValueAtTime(0.0001, now + 2.15);
            wind.connect(bp);
            bp.connect(g);
            this.connectToSfx(ctx, g, 0, 0.35, { x: px, y: 6.0, z: pz }, { refDistance: 9, maxDistance: 56 });
            wind.start(now);
          }
        } else if (roll < 0.62) {
          // Real tawny owl hoot perched high in forest canopy (y = 10m)
          this.playSampleBuffer('owl-forest-call', {
            rate: isDay ? 1.08 : 0.96,
            gain: isDay ? 0.32 : 0.62,
            fadeIn: 0.06,
            fadeOut: 0.28,
            pos: { x: px, y: 10.0, z: pz },
            refDistance: 10,
            maxDistance: 60,
            rolloffFactor: 0.8,
            extraReverb: 0.45,
          });
        } else if (roll < 0.84) {
          // Distant crisp twig snap on forest floor
          const snapPos: SpatialVec3 = { x: px * 0.72, y: 0.4, z: pz * 0.72 };
          const played = this.playSampleBuffer('wood-gavel', {
            rate: 1.72,
            gain: 0.34,
            duration: 0.16,
            fadeIn: 0.003,
            fadeOut: 0.06,
            filterType: 'highpass',
            filterFreq: 900,
            pos: snapPos,
            refDistance: 7,
            maxDistance: 46,
            extraReverb: 0.25,
          });
          if (!played) {
            const snap = ctx.createBufferSource();
            snap.buffer = this.createNoiseBuffer(ctx, 0.09);
            const bp = ctx.createBiquadFilter();
            bp.type = 'bandpass';
            bp.frequency.setValueAtTime(2100, now);
            bp.Q.setValueAtTime(3.0, now);
            const g = ctx.createGain();
            g.gain.setValueAtTime(0.18, now);
            g.gain.exponentialRampToValueAtTime(0.0001, now + 0.075);
            snap.connect(bp);
            bp.connect(g);
            this.connectToSfx(ctx, g, 0, 0.25, snapPos, { refDistance: 7, maxDistance: 46 });
            snap.start(now);
          }
        } else if (!isDay) {
          // Distant muffled nocturnal wolf/animal call echoing beyond the pines
          this.playSampleBuffer('wolf-howl', {
            rate: 0.92 + Math.random() * 0.14,
            gain: 0.32,
            duration: 2.5,
            fadeIn: 0.25,
            fadeOut: 0.7,
            filterType: 'lowpass',
            filterFreq: 760,
            pos: { x: px, y: 1.4, z: pz },
            refDistance: 12,
            maxDistance: 65,
            rolloffFactor: 0.75,
            extraReverb: 0.55,
          });
        }
      } else if (biome === 'frostpeak') {
        const roll = Math.random();
        if (roll < 0.45) {
          // Howling blizzard squall sweeping across northern mountain ridges (z < -14)
          const dir = Math.random() < 0.5 ? 1 : -1;
          const ridgeZ = -16 - Math.random() * 14;
          const panner = this.createSpatialPanner(
            ctx,
            { x: -24 * dir, y: 8, z: ridgeZ },
            { refDistance: 11, maxDistance: 64, rolloffFactor: 0.75 }
          );
          if (panner) {
            const squallDur = 3.2;
            if (panner.positionX) {
              panner.positionX.setValueAtTime(-24 * dir, now);
              panner.positionX.linearRampToValueAtTime(24 * dir, now + squallDur);
            }
            const target = this.bgmDuckGain || this.sfxBus || ctx.destination;
            panner.connect(target);

            const windBuf = this.sampleBuffers.get('wind-howl-loop');
            const src = ctx.createBufferSource();
            src.buffer = windBuf || this.createNoiseBuffer(ctx, squallDur);
            if (windBuf) src.playbackRate.setValueAtTime(1.24, now);

            const bp = ctx.createBiquadFilter();
            bp.type = 'bandpass';
            bp.frequency.setValueAtTime(520, now);
            bp.frequency.exponentialRampToValueAtTime(1450, now + squallDur * 0.45);
            bp.frequency.exponentialRampToValueAtTime(420, now + squallDur);
            bp.Q.setValueAtTime(3.2, now);

            const g = ctx.createGain();
            g.gain.setValueAtTime(0.0001, now);
            g.gain.linearRampToValueAtTime(windBuf ? 0.5 : 0.16, now + 0.85);
            g.gain.exponentialRampToValueAtTime(0.0001, now + squallDur);

            src.connect(bp);
            bp.connect(g);
            g.connect(panner);
            const windOffset = windBuf
              ? Math.min(Math.random() * 1.0, Math.max(0, windBuf.duration - 1.0))
              : 0;
            src.start(now, windOffset);
            src.stop(now + squallDur + 0.08);
          }
        } else if (roll < 0.78 || isDay) {
          // Crystalline alpine ice crackles & glacial glass chime
          const icePos: SpatialVec3 = {
            x: listenerX + Math.cos(angle) * (14 + Math.random() * 10),
            y: 2.5 + Math.random() * 4,
            z: listenerZ + Math.sin(angle) * (14 + Math.random() * 10),
          };
          [0, 0.085, 0.19].forEach((offset, idx) => {
            const crack = ctx.createBufferSource();
            crack.buffer = this.createNoiseBuffer(ctx, 0.06);
            const hp = ctx.createBiquadFilter();
            hp.type = 'highpass';
            hp.frequency.setValueAtTime(3200 + idx * 900, now + offset);
            const g = ctx.createGain();
            g.gain.setValueAtTime(0.14 / (idx * 0.4 + 1), now + offset);
            g.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.05);
            crack.connect(hp);
            hp.connect(g);
            this.connectToSfx(ctx, g, 0, 0.35, icePos, { refDistance: 8, maxDistance: 48 });
            crack.start(now + offset);
          });
          [1760.0, 2349.32, 3135.96].forEach((freq, idx) => {
            const t = now + 0.06 + idx * 0.09;
            const osc = ctx.createOscillator();
            const g = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, t);
            g.gain.setValueAtTime(0.0001, t);
            g.gain.linearRampToValueAtTime(0.024 / (idx + 1), t + 0.02);
            g.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
            osc.connect(g);
            this.connectToSfx(ctx, g, 0, 0.5, icePos, { refDistance: 10, maxDistance: 50 });
            osc.start(t);
            osc.stop(t + 1.25);
          });
        } else {
          // Distant Arctic wolf howl echoing off snowy ridges at night
          this.playSampleBuffer('wolf-howl', {
            rate: 0.94,
            gain: 0.44,
            duration: 3.1,
            fadeIn: 0.18,
            fadeOut: 0.85,
            filterType: 'lowpass',
            filterFreq: 1650,
            pos: { x: (Math.random() - 0.5) * 34, y: 3.5, z: -20 - Math.random() * 14 },
            refDistance: 13,
            maxDistance: 70,
            rolloffFactor: 0.72,
            extraReverb: 0.6,
          });
        }
      } else if (!isDay && Math.random() < 0.45) {
        // Autumn riverside night: occasional distant canopy owl across the creek
        this.playSampleBuffer('owl-forest-call', {
          rate: 1.0,
          gain: 0.38,
          fadeIn: 0.08,
          fadeOut: 0.3,
          pos: { x: (Math.random() - 0.5) * 28, y: 9.0, z: -22 - Math.random() * 8 },
          refDistance: 11,
          maxDistance: 60,
          rolloffFactor: 0.8,
          extraReverb: 0.4,
        });
      }
    } catch {
      // ignore ambient one-shot errors
    }
  }

  /**
   * Sparse, non-metronomic atmospheric harmonic swells (Dark Phrygian at night, warm Dorian by day).
   */
  private scheduleNextAtmosphereMotif() {
    if (!this.isBgmActive || typeof window === 'undefined') return;
    if (this.motifTimer !== null) {
      window.clearTimeout(this.motifTimer);
      this.motifTimer = null;
    }

    const delayMs =
      this.bgmMode === 'day'
        ? 5800 + Math.floor(Math.random() * 3400)
        : 6500 + Math.floor(Math.random() * 4200);

    this.motifTimer = window.setTimeout(() => {
      this.motifTimer = null;
      if (!this.isBgmActive) return;
      if (this.canPlayBgm()) {
        this.playAmbientHarmonicSwell();
      }
      this.scheduleNextAtmosphereMotif();
    }, delayMs);
  }

  private playAmbientHarmonicSwell() {
    const ctx = this.ctx;
    if (!ctx || !this.bgmDuckGain) return;

    try {
      const now = ctx.currentTime;
      const step = this.motifStep++;

      if (this.bgmMode === 'day') {
        // Warm medieval D-Dorian plucked harp/lute whisper
        const dorianPhrases = [
          [293.66, 349.23, 440.0], // Dm
          [261.63, 329.63, 392.0], // C
          [293.66, 392.0, 493.88], // G/D
          [220.0, 293.66, 329.63], // Asus4
        ];
        const phrase = dorianPhrases[step % dorianPhrases.length];
        phrase.forEach((freq, i) => {
          const t = now + i * (0.48 + Math.random() * 0.14);
          const osc = ctx.createOscillator();
          const filter = ctx.createBiquadFilter();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, t);
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(1400, t);
          filter.frequency.exponentialRampToValueAtTime(420, t + 1.8);
          gain.gain.setValueAtTime(0.0001, t);
          gain.gain.linearRampToValueAtTime(0.022, t + 0.04);
          gain.gain.exponentialRampToValueAtTime(0.0001, t + 2.1);

          const pan = this.createPanner(ctx, (i - 1) * 0.35);
          osc.connect(filter);
          filter.connect(gain);
          gain.connect(pan);
          pan.connect(this.bgmDuckGain!);
          osc.start(t);
          osc.stop(t + 2.2);
        });
      } else {
        // Haunting D-Phrygian / minor-9th distant glass-harp resonance + occasional subtle forest breeze
        const darkNotes = [293.66, 311.13, 349.23, 440.0, 523.25, 659.25]; // D4, Eb4, F4, A4, C5, E5
        const baseIdx = step % darkNotes.length;
        const pair = [darkNotes[baseIdx], darkNotes[(baseIdx + 2) % darkNotes.length]];

        pair.forEach((freq, i) => {
          const t = now + i * 1.15;
          const osc = ctx.createOscillator();
          const overtone = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, t);
          overtone.type = 'sine';
          overtone.frequency.setValueAtTime(freq * 2.003, t);

          const ovGain = ctx.createGain();
          ovGain.gain.setValueAtTime(0.22, t);
          overtone.connect(ovGain);

          gain.gain.setValueAtTime(0.0001, t);
          gain.gain.linearRampToValueAtTime(0.022, t + 0.45);
          gain.gain.exponentialRampToValueAtTime(0.0001, t + 3.8);

          const pan = this.createPanner(ctx, i === 0 ? -0.45 : 0.48);
          osc.connect(gain);
          ovGain.connect(gain);
          gain.connect(pan);
          pan.connect(this.bgmDuckGain!);
          if (this.reverbNode) {
            const wet = ctx.createGain();
            wet.gain.setValueAtTime(0.55, t);
            pan.connect(wet);
            wet.connect(this.reverbNode);
          }

          osc.start(t);
          overtone.start(t);
          osc.stop(t + 3.9);
          overtone.stop(t + 3.9);
        });
      }
    } catch {
      // ignore
    }
  }

  private ensureSoundscapeActive() {
    const ctx = this.initCtx();
    if (!ctx) return;

    this.ensureGothicDroneRunning();
    this.ensureFrostPadRunning();
    for (const key of AMBIENT_LOOP_KEYS) {
      this.ensureAmbientLoopRunning(key);
    }
    this.updateAmbientMix(1.2);
    if (this.motifTimer === null) {
      this.scheduleNextAtmosphereMotif();
    }
  }

  /**
   * Starts the haunting organic soundscape (campfire, biome ambience, dark Gothic/frost pads).
   */
  public startBGM(mode: BgmMode = 'night') {
    this.bgmMode = mode;
    if (this.isBgmActive) {
      this.updateAmbientMix(1.2);
      return;
    }
    this.isBgmActive = true;
    this.motifStep = 0;

    if (typeof window === 'undefined') return;
    this.ensureSoundscapeActive();
  }

  public setBGMMode(mode: BgmMode) {
    const modeChanged = this.bgmMode !== mode;
    this.bgmMode = mode;
    if (!this.isBgmActive) {
      this.startBGM(mode);
    } else if (modeChanged) {
      this.motifStep = 0;
      this.updateAmbientMix(1.2);
    }
  }

  private stopRig(rig: GothicDroneRig | null) {
    if (!rig) return;
    rig.oscillators.forEach((osc) => {
      try {
        osc.stop();
      } catch {
        // ignore
      }
    });
    try {
      rig.lfo.stop();
      rig.gain.disconnect();
    } catch {
      // ignore
    }
  }

  public stopBGM() {
    this.isBgmActive = false;
    this.nextAmbientOneShotAt = 0;
    if (this.motifTimer !== null && typeof window !== 'undefined') {
      window.clearTimeout(this.motifTimer);
      this.motifTimer = null;
    }

    AMBIENT_LOOP_KEYS.forEach((key) => {
      const track = this.ambientTracks[key];
      if (!track) return;
      track.running = false;
      if (track.timer !== null && typeof window !== 'undefined') {
        window.clearInterval(track.timer);
        track.timer = null;
      }
      track.activeSources.forEach((src) => {
        try {
          src.stop();
        } catch {
          // ignore
        }
      });
      track.activeSources.clear();
      try {
        track.bus.disconnect();
        track.panner?.disconnect();
      } catch {
        // ignore
      }
      delete this.ambientTracks[key];
    });

    this.stopRig(this.droneRig);
    this.droneRig = null;
    this.stopRig(this.frostPadRig);
    this.frostPadRig = null;
  }

  // =========================================================================
  // ROLE CALLOUTS & HYBRID ACOUSTIC + WEB AUDIO DSP SFX
  // =========================================================================

  /**
   * Dramatic Role Callout: Plays signature Werewolf SFX + musical theme + localized voice (if native voice exists)
   */
  public playRoleCallout(
    roleId: RoleId,
    lang: Language = 'vi'
  ): { quote: string; sfxLabel: string; musicTitle: string } {
    const info = ROLE_CALLOUT_LINES[roleId] || ROLE_CALLOUT_LINES.villager;
    const localizedQuote = info.quotes[lang] || info.quote;

    if (this.canPlaySfx()) {
      switch (roleId) {
        case 'werewolf':
          this.playWolfHowl();
          break;
        case 'wolf_pup':
          this.playWolfPupBark();
          break;
        case 'witch':
          this.playWitchCauldron();
          break;
        case 'hunter':
          this.playShotgunCock();
          break;
        case 'seer':
          this.playMysticChime();
          break;
        case 'bodyguard':
          this.playShieldClang();
          break;
        case 'cupid':
          this.playCupidHarp();
          break;
        case 'doppelganger':
          this.playDoppelgangerMirror();
          break;
        case 'elder':
          this.playElderGong();
          break;
        case 'cursed':
          this.playCursedHeartbeat();
          break;
        case 'traitor':
          this.playTraitorDagger();
          break;
        case 'tanner':
          this.playTannerJester();
          break;
        case 'villager':
        default:
          this.playNightBell();
          break;
      }

      const pitchMap: Partial<Record<RoleId, { pitch: number; rate: number }>> = {
        werewolf: { pitch: 0.65, rate: 0.94 },
        wolf_pup: { pitch: 1.22, rate: 1.05 },
        witch: { pitch: 1.26, rate: 0.95 },
        hunter: { pitch: 0.82, rate: 1.02 },
        elder: { pitch: 0.72, rate: 0.9 },
      };
      this.speakLocalized(localizedQuote, lang, pitchMap[roleId]);
    }

    return {
      quote: localizedQuote,
      sfxLabel: info.sfxLabel,
      musicTitle: info.musicTitle,
    };
  }

  /**
   * 1. WEREWOLF: Real Wolf Pack Howl recording + sub-bass dark night wind swell
   */
  public playWolfHowl() {
    if (!this.canPlaySfx()) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      // Dark forest wind gust bed (always layered for sinister depth)
      const windSrc = ctx.createBufferSource();
      windSrc.buffer = this.createNoiseBuffer(ctx, 2.8);
      const windFilter = ctx.createBiquadFilter();
      windFilter.type = 'bandpass';
      windFilter.frequency.setValueAtTime(300, now);
      windFilter.frequency.exponentialRampToValueAtTime(640, now + 1.2);
      windFilter.frequency.exponentialRampToValueAtTime(220, now + 2.7);
      windFilter.Q.setValueAtTime(2.6, now);
      const windGain = ctx.createGain();
      windGain.gain.setValueAtTime(0.0001, now);
      windGain.gain.linearRampToValueAtTime(0.14, now + 0.55);
      windGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.75);
      windSrc.connect(windFilter);
      windFilter.connect(windGain);
      this.connectToSfx(ctx, windGain, -0.18, 0.35);
      windSrc.start(now);

      // Sub-bass dread swell
      const sub = ctx.createOscillator();
      const subGain = ctx.createGain();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(68, now);
      sub.frequency.exponentialRampToValueAtTime(48, now + 2.5);
      subGain.gain.setValueAtTime(0.0001, now);
      subGain.gain.linearRampToValueAtTime(0.16, now + 0.45);
      subGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.6);
      sub.connect(subGain);
      this.connectToSfx(ctx, subGain, 0);
      sub.start(now);
      sub.stop(now + 2.65);

      const playedReal = this.playSampleBuffer('wolf-howl', {
        gain: 1.05,
        duration: 3.6,
        fadeIn: 0.08,
        fadeOut: 0.65,
        pan: 0.12,
        extraReverb: 0.42,
      });

      if (!playedReal) {
        // Organic reverb-drenched formant fallback if sample not yet cached
        const alphaOsc = ctx.createOscillator();
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        const formant = ctx.createBiquadFilter();
        const alphaGain = ctx.createGain();
        alphaOsc.type = 'sawtooth';
        alphaOsc.frequency.setValueAtTime(155, now);
        alphaOsc.frequency.exponentialRampToValueAtTime(415, now + 0.55);
        alphaOsc.frequency.exponentialRampToValueAtTime(375, now + 1.45);
        alphaOsc.frequency.exponentialRampToValueAtTime(165, now + 2.4);
        lfo.frequency.setValueAtTime(5.4, now);
        lfoGain.gain.setValueAtTime(8.5, now);
        lfo.connect(lfoGain);
        lfoGain.connect(alphaOsc.frequency);
        formant.type = 'bandpass';
        formant.frequency.setValueAtTime(360, now);
        formant.frequency.exponentialRampToValueAtTime(720, now + 0.6);
        formant.frequency.exponentialRampToValueAtTime(290, now + 2.4);
        formant.Q.setValueAtTime(4.0, now);
        alphaGain.gain.setValueAtTime(0.0001, now);
        alphaGain.gain.linearRampToValueAtTime(0.22, now + 0.35);
        alphaGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.45);
        alphaOsc.connect(formant);
        formant.connect(alphaGain);
        this.connectToSfx(ctx, alphaGain, 0.1, 0.45);
        alphaOsc.start(now);
        lfo.start(now);
        alphaOsc.stop(now + 2.5);
        lfo.stop(now + 2.5);
      }
    } catch {
      // silent
    }
  }

  /**
   * 2. WOLF PUP: Pitched young wolf howl + organic cub yip + frame drum thump
   */
  public playWolfPupBark() {
    if (!this.canPlaySfx()) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      // Two warm resonant cub yips + low tribal drum pulse
      [0, 0.22].forEach((offset, idx) => {
        const bark = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        const bGain = ctx.createGain();
        bark.type = 'sawtooth';
        bark.frequency.setValueAtTime(340 + idx * 35, now + offset);
        bark.frequency.exponentialRampToValueAtTime(620, now + offset + 0.045);
        bark.frequency.exponentialRampToValueAtTime(195, now + offset + 0.16);
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(740, now + offset);
        filter.Q.setValueAtTime(3.2, now + offset);
        bGain.gain.setValueAtTime(0.16, now + offset);
        bGain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.18);
        bark.connect(filter);
        filter.connect(bGain);
        this.connectToSfx(ctx, bGain, idx === 0 ? -0.18 : 0.18, 0.25);
        bark.start(now + offset);
        bark.stop(now + offset + 0.19);

        // Soft war drum accent
        const drum = ctx.createOscillator();
        const dGain = ctx.createGain();
        drum.type = 'sine';
        drum.frequency.setValueAtTime(115, now + offset);
        drum.frequency.exponentialRampToValueAtTime(46, now + offset + 0.16);
        dGain.gain.setValueAtTime(0.18, now + offset);
        dGain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.2);
        drum.connect(dGain);
        this.connectToSfx(ctx, dGain, 0);
        drum.start(now + offset);
        drum.stop(now + offset + 0.22);
      });

      // Higher-pitched real wolf cub howl tail
      const playedReal = this.playSampleBuffer('wolf-howl', {
        startTime: now + 0.36,
        rate: 1.46,
        gain: 0.78,
        duration: 1.8,
        fadeIn: 0.08,
        fadeOut: 0.45,
        pan: -0.1,
        extraReverb: 0.38,
      });

      if (!playedReal) {
        const howl = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        const hGain = ctx.createGain();
        howl.type = 'sawtooth';
        howl.frequency.setValueAtTime(310, now + 0.4);
        howl.frequency.exponentialRampToValueAtTime(640, now + 0.78);
        howl.frequency.exponentialRampToValueAtTime(330, now + 1.65);
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(820, now + 0.4);
        filter.Q.setValueAtTime(3.2, now + 0.4);
        hGain.gain.setValueAtTime(0.0001, now + 0.4);
        hGain.gain.linearRampToValueAtTime(0.15, now + 0.68);
        hGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.7);
        howl.connect(filter);
        filter.connect(hGain);
        this.connectToSfx(ctx, hGain, 0, 0.35);
        howl.start(now + 0.4);
        howl.stop(now + 1.75);
      }
    } catch {
      // silent
    }
  }

  /**
   * 3. WITCH: Real boiling cauldron recording + eerie dark alchemy tritone whisper
   */
  public playWitchCauldron() {
    if (!this.canPlaySfx()) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const playedReal = this.playSampleBuffer('cauldron-bubble', {
        gain: 0.72,
        fadeIn: 0.04,
        fadeOut: 0.32,
        filterType: 'lowpass',
        filterFreq: 3800,
        pan: 0.14,
        extraReverb: 0.25,
      });

      if (!playedReal) {
        // Organic resonant water bubbles fallback
        [290, 430, 360, 560, 410, 650, 480, 590].forEach((f, idx) => {
          const t = now + idx * 0.11;
          const bOsc = ctx.createOscillator();
          const bGain = ctx.createGain();
          bOsc.type = 'sine';
          bOsc.frequency.setValueAtTime(f * 0.72, t);
          bOsc.frequency.exponentialRampToValueAtTime(f * 1.48, t + 0.07);
          bGain.gain.setValueAtTime(0.0001, t);
          bGain.gain.linearRampToValueAtTime(0.11, t + 0.015);
          bGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.085);
          bOsc.connect(bGain);
          this.connectToSfx(ctx, bGain, idx % 2 === 0 ? -0.2 : 0.2, 0.25);
          bOsc.start(t);
          bOsc.stop(t + 0.09);
        });
      }

      // Eerie breathy witch whisper resonance + dark tritone harmonic (replaces cartoon sawtooth)
      const steam = ctx.createBufferSource();
      steam.buffer = this.createNoiseBuffer(ctx, 1.5);
      const sFilter = ctx.createBiquadFilter();
      sFilter.type = 'bandpass';
      sFilter.frequency.setValueAtTime(920, now + 0.15);
      sFilter.frequency.exponentialRampToValueAtTime(2100, now + 0.85);
      sFilter.frequency.exponentialRampToValueAtTime(680, now + 1.55);
      sFilter.Q.setValueAtTime(4.5, now + 0.15);
      const sGain = ctx.createGain();
      sGain.gain.setValueAtTime(0.0001, now + 0.15);
      sGain.gain.linearRampToValueAtTime(0.11, now + 0.55);
      sGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.6);
      steam.connect(sFilter);
      sFilter.connect(sGain);
      this.connectToSfx(ctx, sGain, -0.22, 0.45);
      steam.start(now + 0.15);

      // Sinister soft glass tritone shimmer (F#4 + C5)
      [369.99, 523.25].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + 0.25);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.985, now + 1.85);
        g.gain.setValueAtTime(0.0001, now + 0.25);
        g.gain.linearRampToValueAtTime(0.055 / (i + 1), now + 0.65);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 1.9);
        osc.connect(g);
        this.connectToSfx(ctx, g, i === 0 ? -0.35 : 0.35, 0.55);
        osc.start(now + 0.25);
        osc.stop(now + 1.95);
      });
    } catch {
      // silent
    }
  }

  /**
   * 4. HUNTER: Crisp metallic shotgun pump rack + real gunshot blast echoing in the forest
   */
  public playShotgunCock(pos?: SpatialVec3) {
    if (!this.canPlaySfx()) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      // Metallic slide rack clicks ("Cạch - Rốp!")
      [0, 0.15].forEach((offset, idx) => {
        const noise = ctx.createBufferSource();
        noise.buffer = this.createNoiseBuffer(ctx, 0.11);
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.setValueAtTime(idx === 0 ? 1550 : 2150, now + offset);
        bp.Q.setValueAtTime(5.2, now + offset);
        const nGain = ctx.createGain();
        nGain.gain.setValueAtTime(0.28, now + offset);
        nGain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.085);
        noise.connect(bp);
        bp.connect(nGain);
        this.connectToSfx(ctx, nGain, idx === 0 ? -0.1 : 0.1, 0.15, pos);
        noise.start(now + offset);

        const body = ctx.createOscillator();
        const bFilter = ctx.createBiquadFilter();
        const bGain = ctx.createGain();
        body.type = 'triangle';
        body.frequency.setValueAtTime(idx === 0 ? 290 : 210, now + offset);
        body.frequency.exponentialRampToValueAtTime(62, now + offset + 0.08);
        bFilter.type = 'lowpass';
        bFilter.frequency.setValueAtTime(900, now + offset);
        bGain.gain.setValueAtTime(0.2, now + offset);
        bGain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.09);
        body.connect(bFilter);
        bFilter.connect(bGain);
        this.connectToSfx(ctx, bGain, 0, 0, pos);
        body.start(now + offset);
        body.stop(now + offset + 0.095);
      });

      // Real acoustic gunshot blast at +0.34s + chest-thump sub punch
      const playedReal = this.playSampleBuffer('shotgun-blast', {
        startTime: now + 0.34,
        gain: 0.85,
        fadeIn: 0.005,
        fadeOut: 0.18,
        pan: 0,
        pos,
        extraReverb: 0.45,
      });

      const sub = ctx.createOscillator();
      const sGain = ctx.createGain();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(118, now + 0.34);
      sub.frequency.exponentialRampToValueAtTime(28, now + 0.78);
      sGain.gain.setValueAtTime(0.26, now + 0.34);
      sGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.82);
      sub.connect(sGain);
      this.connectToSfx(ctx, sGain, 0, 0.2, pos);
      sub.start(now + 0.34);
      sub.stop(now + 0.85);

      if (!playedReal) {
        const blast = ctx.createBufferSource();
        blast.buffer = this.createNoiseBuffer(ctx, 0.65);
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.setValueAtTime(1900, now + 0.34);
        lp.frequency.exponentialRampToValueAtTime(180, now + 0.95);
        const bGain = ctx.createGain();
        bGain.gain.setValueAtTime(0.32, now + 0.34);
        bGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.98);
        blast.connect(lp);
        lp.connect(bGain);
        this.connectToSfx(ctx, bGain, 0, 0.45, pos);
        blast.start(now + 0.34);
      }
    } catch {
      // silent
    }
  }

  /**
   * 5. SEER: Real Tibetan singing bowl shimmer + celestial harmonic crystal chimes
   */
  public playMysticChime() {
    if (!this.canPlaySfx()) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const playedReal = this.playSampleBuffer('mystic-chime', {
        gain: 0.88,
        duration: 3.4,
        fadeIn: 0.06,
        fadeOut: 0.95,
        pan: 0,
        extraReverb: 0.55,
      });

      // Delicate ethereal overtone sparkles
      const notes = playedReal
        ? [587.33, 880.0, 1318.51] // D5, A5, E6 subtle halo
        : [523.25, 659.25, 783.99, 1046.5, 1318.51];
      notes.forEach((freq, idx) => {
        const t = now + idx * 0.11;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);
        const amp = playedReal ? 0.045 : 0.09;
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.linearRampToValueAtTime(amp, t + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.85);
        osc.connect(gain);
        this.connectToSfx(ctx, gain, (idx % 2 === 0 ? -1 : 1) * 0.35, 0.5);
        osc.start(t);
        osc.stop(t + 1.9);
      });
    } catch {
      // silent
    }
  }

  /**
   * 6. BODYGUARD: Heavy iron shield metallic ring + deep medieval watch-horn fifth
   */
  public playShieldClang() {
    if (!this.canPlaySfx()) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      // Sharp steel impact transient
      const hit = ctx.createBufferSource();
      hit.buffer = this.createNoiseBuffer(ctx, 0.14);
      const hp = ctx.createBiquadFilter();
      hp.type = 'bandpass';
      hp.frequency.setValueAtTime(2800, now);
      hp.Q.setValueAtTime(3.5, now);
      const hGain = ctx.createGain();
      hGain.gain.setValueAtTime(0.24, now);
      hGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
      hit.connect(hp);
      hp.connect(hGain);
      this.connectToSfx(ctx, hGain, 0, 0.25);
      hit.start(now);

      // Pitched-up bronze bell ring gives real metallic resonance
      this.playSampleBuffer('church-bell', {
        rate: 1.52,
        gain: 0.36,
        duration: 1.2,
        fadeIn: 0.008,
        fadeOut: 0.55,
        filterType: 'highpass',
        filterFreq: 420,
        pan: 0.08,
        extraReverb: 0.35,
      });

      // Inharmonic iron shield overtones
      [293.66, 440.0, 658.4, 932.33, 1480.0].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const lp = ctx.createBiquadFilter();
        const gain = ctx.createGain();
        osc.type = i < 2 ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(freq, now);
        lp.type = 'lowpass';
        lp.frequency.setValueAtTime(3200, now);
        lp.frequency.exponentialRampToValueAtTime(600, now + 1.0);
        gain.gain.setValueAtTime(0.14 / (i + 1), now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.05);
        osc.connect(lp);
        lp.connect(gain);
        this.connectToSfx(ctx, gain, (i - 2) * 0.12, 0.3);
        osc.start(now);
        osc.stop(now + 1.1);
      });
    } catch {
      // silent
    }
  }

  /**
   * 7. CUPID: Silky arrow whoosh panning L->R + lush reverberant celestial harp glissando
   */
  public playCupidHarp() {
    if (!this.canPlaySfx()) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const whoosh = ctx.createBufferSource();
      whoosh.buffer = this.createNoiseBuffer(ctx, 0.32);
      const wFilter = ctx.createBiquadFilter();
      wFilter.type = 'bandpass';
      wFilter.frequency.setValueAtTime(520, now);
      wFilter.frequency.exponentialRampToValueAtTime(2400, now + 0.22);
      wFilter.Q.setValueAtTime(2.8, now);
      const wGain = ctx.createGain();
      wGain.gain.setValueAtTime(0.0001, now);
      wGain.gain.linearRampToValueAtTime(0.18, now + 0.08);
      wGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
      whoosh.connect(wFilter);
      wFilter.connect(wGain);
      this.connectToSfx(ctx, wGain, -0.35, 0.25);
      whoosh.start(now);

      this.playSampleBuffer('mystic-chime', {
        startTime: now + 0.16,
        rate: 1.32,
        gain: 0.34,
        duration: 2.2,
        fadeIn: 0.12,
        fadeOut: 0.85,
        pan: 0.2,
        extraReverb: 0.45,
      });

      // Warm plucked harp glissando panning across stereo stage
      const harpNotes = [293.66, 369.99, 440.0, 493.88, 587.33, 659.25, 739.99, 880.0];
      harpNotes.forEach((freq, i) => {
        const t = now + 0.16 + i * 0.068;
        const osc = ctx.createOscillator();
        const lp = ctx.createBiquadFilter();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t);
        lp.type = 'lowpass';
        lp.frequency.setValueAtTime(2600, t);
        lp.frequency.exponentialRampToValueAtTime(520, t + 1.1);
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.linearRampToValueAtTime(0.11, t + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.25);
        osc.connect(lp);
        lp.connect(gain);
        const pan = -0.55 + (i / (harpNotes.length - 1)) * 1.1;
        this.connectToSfx(ctx, gain, pan, 0.45);
        osc.start(t);
        osc.stop(t + 1.3);
      });
    } catch {
      // silent
    }
  }

  /**
   * 8. DOPPELGANGER: Stereo-mirrored glass reflection + haunted reverse-feel shimmer
   */
  public playDoppelgangerMirror() {
    if (!this.canPlaySfx()) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      this.playSampleBuffer('mystic-chime', {
        rate: 0.82,
        gain: 0.44,
        duration: 2.2,
        fadeIn: 0.45,
        fadeOut: 0.7,
        pan: 0,
        extraReverb: 0.55,
      });

      const forward = [329.63, 392.0, 493.88, 659.25];
      const mirror = [659.25, 493.88, 392.0, 329.63];
      forward.forEach((f, i) => {
        const t = now + i * 0.095;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, t);
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.linearRampToValueAtTime(0.095, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.72);
        osc.connect(gain);
        this.connectToSfx(ctx, gain, -0.55, 0.5);
        osc.start(t);
        osc.stop(t + 0.75);
      });
      mirror.forEach((f, i) => {
        const t = now + 0.36 + i * 0.095;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f * 1.007, t);
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.linearRampToValueAtTime(0.08, t + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.85);
        osc.connect(gain);
        this.connectToSfx(ctx, gain, 0.55, 0.55);
        osc.start(t);
        osc.stop(t + 0.9);
      });
    } catch {
      // silent
    }
  }

  /**
   * 9. ELDER: Deep resonant ancient bronze temple bell toll + low beating harmonics
   */
  public playElderGong() {
    if (!this.canPlaySfx()) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      this.playSampleBuffer('church-bell', {
        rate: 0.76,
        gain: 0.82,
        fadeIn: 0.015,
        fadeOut: 0.85,
        filterType: 'lowpass',
        filterFreq: 2600,
        pan: 0,
        extraReverb: 0.55,
      });

      // Deep bronze temple fundamental + beating fifth
      [73.42, 110.0, 146.83, 221.2].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = i === 0 ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(0.14 / (i + 1), now + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.7);
        osc.connect(gain);
        this.connectToSfx(ctx, gain, 0, 0.4);
        osc.start(now);
        osc.stop(now + 2.75);
      });
    } catch {
      // silent
    }
  }

  /**
   * 10. CURSED: Visceral accelerating heartbeat + faint distant cursed wolf whisper
   */
  public playCursedHeartbeat() {
    if (!this.canPlaySfx()) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      [0, 0.16, 0.54, 0.69].forEach((offset, i) => {
        const osc = ctx.createOscillator();
        const lp = ctx.createBiquadFilter();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(i % 2 === 0 ? 74 : 58, now + offset);
        osc.frequency.exponentialRampToValueAtTime(28, now + offset + 0.15);
        lp.type = 'lowpass';
        lp.frequency.setValueAtTime(160, now + offset);
        gain.gain.setValueAtTime(0.32, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.18);
        osc.connect(lp);
        lp.connect(gain);
        this.connectToSfx(ctx, gain, 0, 0.25);
        osc.start(now + offset);
        osc.stop(now + offset + 0.2);
      });

      // Faint low-passed wolf growl shadow beneath the heartbeat
      this.playSampleBuffer('wolf-howl', {
        startTime: now + 0.35,
        rate: 0.72,
        gain: 0.32,
        duration: 1.5,
        fadeIn: 0.2,
        fadeOut: 0.55,
        filterType: 'lowpass',
        filterFreq: 520,
        pan: -0.25,
        extraReverb: 0.45,
      });
    } catch {
      // silent
    }
  }

  /**
   * 11. TRAITOR: Crisp steel dagger unsheathe + dark diminished intrigue chord
   */
  public playTraitorDagger() {
    if (!this.canPlaySfx()) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const scrape = ctx.createBufferSource();
      scrape.buffer = this.createNoiseBuffer(ctx, 0.28);
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(1700, now);
      bp.frequency.exponentialRampToValueAtTime(5600, now + 0.22);
      bp.Q.setValueAtTime(6.5, now);
      const sGain = ctx.createGain();
      sGain.gain.setValueAtTime(0.22, now);
      sGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.26);
      scrape.connect(bp);
      bp.connect(sGain);
      this.connectToSfx(ctx, sGain, 0.2, 0.3);
      scrape.start(now);

      // High steel ring harmonic
      const ring = ctx.createOscillator();
      const rGain = ctx.createGain();
      ring.type = 'sine';
      ring.frequency.setValueAtTime(2840, now + 0.04);
      ring.frequency.exponentialRampToValueAtTime(2420, now + 0.45);
      rGain.gain.setValueAtTime(0.055, now + 0.04);
      rGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.48);
      ring.connect(rGain);
      this.connectToSfx(ctx, rGain, 0.25, 0.45);
      ring.start(now + 0.04);
      ring.stop(now + 0.5);

      // Sinister warm filtered diminished chord (B3, D4, F4, Ab4)
      [246.94, 293.66, 349.23, 415.3].forEach((freq, i) => {
        const t = now + 0.16 + i * 0.06;
        const osc = ctx.createOscillator();
        const lp = ctx.createBiquadFilter();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t);
        lp.type = 'lowpass';
        lp.frequency.setValueAtTime(980, t);
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.linearRampToValueAtTime(0.07, t + 0.06);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.95);
        osc.connect(lp);
        lp.connect(gain);
        this.connectToSfx(ctx, gain, (i - 1.5) * 0.2, 0.45);
        osc.start(t);
        osc.stop(t + 1.0);
      });
    } catch {
      // silent
    }
  }

  /**
   * 12. TANNER: Eerie dark-carnival music-box jester motif
   */
  public playTannerJester() {
    if (!this.canPlaySfx()) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      // Haunting minor-augmented music-box celesta bells
      const notes = [587.33, 698.46, 659.25, 830.61, 880.0, 932.33];
      notes.forEach((f, i) => {
        const t = now + i * 0.11;
        const osc = ctx.createOscillator();
        const ov = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, t);
        ov.type = 'sine';
        ov.frequency.setValueAtTime(f * 3.005, t);
        const ovG = ctx.createGain();
        ovG.gain.setValueAtTime(0.18, t);
        ov.connect(ovG);

        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.linearRampToValueAtTime(0.095, t + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.65);

        osc.connect(gain);
        ovG.connect(gain);
        this.connectToSfx(ctx, gain, (i % 2 === 0 ? -1 : 1) * 0.32, 0.5);
        osc.start(t);
        ov.start(t);
        osc.stop(t + 0.68);
        ov.stop(t + 0.68);
      });
    } catch {
      // silent
    }
  }

  // =========================================================================
  // FOOTSTEPS, SPATIAL PROP FOLEY, VICTIM REACTIONS & SKILL CUTSCENE SFX
  // =========================================================================

  /**
   * Zero-latency procedural + sample hybrid footsteps across all 4 terrain surfaces.
   */
  public playFootstep(
    surface: FootstepSurface,
    isSprint: boolean = false,
    isLanding: boolean = false
  ): void {
    if (!this.canPlaySfx()) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const vol = (isLanding ? 1.45 : isSprint ? 1.18 : 0.92) * (0.9 + Math.random() * 0.2);
      const rateMul = (isLanding ? 0.84 : isSprint ? 1.12 : 1.0) * (0.94 + Math.random() * 0.12);
      this.footstepSide = -this.footstepSide;
      const pan = this.footstepSide * 0.08;

      if (surface === 'water') {
        const played = this.playSampleBuffer('water-splash', {
          rate: 1.45 * rateMul,
          offset: 0.04,
          duration: 0.22,
          gain: Math.min(0.85, 0.44 * vol),
          fadeIn: 0.008,
          fadeOut: 0.085,
          pan,
          extraReverb: 0.14,
        });
        if (!played) {
          const splash = ctx.createBufferSource();
          splash.buffer = this.createNoiseBuffer(ctx, 0.18);
          const bp = ctx.createBiquadFilter();
          bp.type = 'bandpass';
          bp.frequency.setValueAtTime(1650 * rateMul, now);
          bp.frequency.exponentialRampToValueAtTime(620, now + 0.16);
          bp.Q.setValueAtTime(1.6, now);
          const g = ctx.createGain();
          g.gain.setValueAtTime(0.2 * vol, now);
          g.gain.exponentialRampToValueAtTime(0.0001, now + 0.17);
          splash.connect(bp);
          bp.connect(g);
          this.connectToSfx(ctx, g, pan, 0.14);
          splash.start(now);
        }
        // Crisp bubbly droplet transient
        const drop = ctx.createOscillator();
        const dGain = ctx.createGain();
        drop.type = 'sine';
        drop.frequency.setValueAtTime(460 * rateMul, now + 0.012);
        drop.frequency.exponentialRampToValueAtTime(980 * rateMul, now + 0.055);
        dGain.gain.setValueAtTime(0.0001, now + 0.012);
        dGain.gain.linearRampToValueAtTime(0.065 * vol, now + 0.022);
        dGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.062);
        drop.connect(dGain);
        this.connectToSfx(ctx, dGain, pan, 0.12);
        drop.start(now + 0.012);
        drop.stop(now + 0.068);
      } else if (surface === 'snow') {
        // Dual resonant bandpass snow compaction crunch grains (1450 Hz + 4400 Hz, 75ms)
        const dur = isLanding ? 0.095 : 0.075;
        [
          { freq: 1450 * rateMul, q: 3.1, amp: 0.22 * vol },
          { freq: 4400 * rateMul, q: 2.6, amp: 0.16 * vol },
        ].forEach((band) => {
          const src = ctx.createBufferSource();
          src.buffer = this.createNoiseBuffer(ctx, dur + 0.02);
          const bp = ctx.createBiquadFilter();
          bp.type = 'bandpass';
          bp.frequency.setValueAtTime(band.freq, now);
          bp.Q.setValueAtTime(band.q, now);
          const g = ctx.createGain();
          g.gain.setValueAtTime(0.0001, now);
          g.gain.linearRampToValueAtTime(band.amp, now + 0.012);
          g.gain.linearRampToValueAtTime(band.amp * 0.45, now + dur * 0.48);
          g.gain.linearRampToValueAtTime(band.amp * 0.85, now + dur * 0.65);
          g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
          src.connect(bp);
          bp.connect(g);
          this.connectToSfx(ctx, g, pan, 0.08);
          src.start(now);
        });
        if (isLanding) {
          const thud = ctx.createOscillator();
          const tGain = ctx.createGain();
          thud.type = 'sine';
          thud.frequency.setValueAtTime(78, now);
          thud.frequency.exponentialRampToValueAtTime(38, now + 0.065);
          tGain.gain.setValueAtTime(0.14 * vol, now);
          tGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);
          thud.connect(tGain);
          this.connectToSfx(ctx, tGain, pan);
          thud.start(now);
          thud.stop(now + 0.075);
        }
      } else if (surface === 'dirt') {
        // Earthy low thump (95Hz) + dry gravel burst (950Hz)
        const thud = ctx.createOscillator();
        const tGain = ctx.createGain();
        thud.type = 'sine';
        thud.frequency.setValueAtTime(95 * rateMul, now);
        thud.frequency.exponentialRampToValueAtTime(44, now + 0.075);
        tGain.gain.setValueAtTime(0.17 * vol, now);
        tGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.085);
        thud.connect(tGain);
        this.connectToSfx(ctx, tGain, pan);
        thud.start(now);
        thud.stop(now + 0.09);

        const gravel = ctx.createBufferSource();
        gravel.buffer = this.createNoiseBuffer(ctx, 0.075);
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.setValueAtTime(950 * rateMul, now);
        bp.Q.setValueAtTime(1.8, now);
        const gGain = ctx.createGain();
        gGain.gain.setValueAtTime(0.0001, now);
        gGain.gain.linearRampToValueAtTime(0.15 * vol, now + 0.01);
        gGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);
        gravel.connect(bp);
        bp.connect(gGain);
        this.connectToSfx(ctx, gGain, pan, 0.06);
        gravel.start(now);
      } else {
        // Grass: soft brushed highpass swish (2200Hz) + damped turf tap
        const swish = ctx.createBufferSource();
        swish.buffer = this.createNoiseBuffer(ctx, 0.095);
        const hp = ctx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.setValueAtTime(2200 * rateMul, now);
        const sGain = ctx.createGain();
        sGain.gain.setValueAtTime(0.0001, now);
        sGain.gain.linearRampToValueAtTime(0.11 * vol, now + 0.018);
        sGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.085);
        swish.connect(hp);
        hp.connect(sGain);
        this.connectToSfx(ctx, sGain, pan, 0.05);
        swish.start(now);

        const turf = ctx.createOscillator();
        const tGain = ctx.createGain();
        turf.type = 'sine';
        turf.frequency.setValueAtTime(108 * rateMul, now);
        turf.frequency.exponentialRampToValueAtTime(52, now + 0.055);
        tGain.gain.setValueAtTime((isLanding ? 0.14 : 0.06) * vol, now);
        tGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
        turf.connect(tGain);
        this.connectToSfx(ctx, tGain, pan);
        turf.start(now);
        turf.stop(now + 0.065);
      }
    } catch {
      // silent
    }
  }

  public playThrowWhoosh(propType: PropType = 'tomato', pos?: SpatialVec3) {
    if (!this.canPlaySfx()) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const noise = ctx.createBufferSource();
      noise.buffer = this.createNoiseBuffer(ctx, 0.4);
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      const gain = ctx.createGain();

      if (propType === 'rose') {
        // Breezy flutter toss + light petal rustle
        bp.frequency.setValueAtTime(850, now);
        bp.frequency.exponentialRampToValueAtTime(2550, now + 0.3);
        bp.Q.setValueAtTime(2.2, now);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(0.14, now + 0.06);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);
        this.playSampleBuffer('card-flip', {
          rate: 1.5,
          gain: 0.24,
          duration: 0.2,
          fadeIn: 0.01,
          fadeOut: 0.08,
          pos,
          extraReverb: 0.12,
        });
      } else if (propType === 'egg') {
        // Light nimble whistle arc
        bp.frequency.setValueAtTime(1480, now);
        bp.frequency.exponentialRampToValueAtTime(520, now + 0.26);
        bp.Q.setValueAtTime(4.8, now);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(0.15, now + 0.045);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);

        const whistle = ctx.createOscillator();
        const wGain = ctx.createGain();
        whistle.type = 'sine';
        whistle.frequency.setValueAtTime(940, now);
        whistle.frequency.exponentialRampToValueAtTime(520, now + 0.24);
        wGain.gain.setValueAtTime(0.0001, now);
        wGain.gain.linearRampToValueAtTime(0.042, now + 0.05);
        wGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.26);
        whistle.connect(wGain);
        this.connectToSfx(ctx, wGain, 0, 0.15, pos);
        whistle.start(now);
        whistle.stop(now + 0.28);
      } else if (propType === 'water') {
        // Heavy sloshing bucket toss
        bp.frequency.setValueAtTime(860, now);
        bp.frequency.exponentialRampToValueAtTime(220, now + 0.36);
        bp.Q.setValueAtTime(1.4, now);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(0.22, now + 0.07);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);
      } else {
        // Tomato: wet heavy lob
        bp.frequency.setValueAtTime(640, now);
        bp.frequency.exponentialRampToValueAtTime(185, now + 0.33);
        bp.Q.setValueAtTime(2.0, now);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(0.19, now + 0.065);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
      }

      noise.connect(bp);
      bp.connect(gain);
      this.connectToSfx(ctx, gain, 0, 0.2, pos);
      noise.start(now);
    } catch {
      // silent
    }
  }

  public playPropSplat(propType: PropType = 'tomato', pos?: SpatialVec3) {
    if (!this.canPlaySfx()) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      if (propType === 'rose') {
        // Foliage rustle + shimmering harp arpeggio + mystic chime sparkle
        this.playSampleBuffer('card-flip', {
          rate: 1.35,
          gain: 0.65,
          duration: 0.42,
          fadeIn: 0.01,
          fadeOut: 0.14,
          filterType: 'lowpass',
          filterFreq: 2400,
          pos,
          extraReverb: 0.16,
        });
        this.playSampleBuffer('mystic-chime', {
          rate: 1.42,
          gain: 0.34,
          duration: 1.5,
          fadeIn: 0.05,
          fadeOut: 0.65,
          pos,
          extraReverb: 0.42,
        });
        const danceMelody = [587.33, 739.99, 880.0, 1174.66, 880.0, 1174.66];
        danceMelody.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = i % 2 === 0 ? 'triangle' : 'sine';
          const tStart = now + i * 0.08;
          osc.frequency.setValueAtTime(freq, tStart);
          gain.gain.setValueAtTime(0.0001, tStart);
          gain.gain.linearRampToValueAtTime(0.095, tStart + 0.018);
          gain.gain.exponentialRampToValueAtTime(0.0001, tStart + 0.44);
          osc.connect(gain);
          this.connectToSfx(ctx, gain, (i - 2.5) * 0.16, 0.35, pos);
          osc.start(tStart);
          osc.stop(tStart + 0.46);
        });
        this.schedulePropVictimReaction('rose', pos, now + 0.24);
      } else if (propType === 'egg') {
        // Real eggshell crack-splat recording + bubbly stink-gas hiss (bandpass 2.8kHz)
        const played = this.playSampleBuffer('egg-crack-splat', {
          gain: 0.95,
          fadeIn: 0.004,
          fadeOut: 0.12,
          pos,
          extraReverb: 0.15,
        });
        if (!played) {
          [0, 0.055].forEach((tOff, idx) => {
            const burst = ctx.createBufferSource();
            burst.buffer = this.createNoiseBuffer(ctx, 0.1);
            const bp = ctx.createBiquadFilter();
            bp.type = 'bandpass';
            bp.frequency.setValueAtTime(idx === 0 ? 1850 : 1100, now + tOff);
            bp.Q.setValueAtTime(3.2, now + tOff);
            const g = ctx.createGain();
            g.gain.setValueAtTime(0.24, now + tOff);
            g.gain.exponentialRampToValueAtTime(0.0001, now + tOff + 0.09);
            burst.connect(bp);
            bp.connect(g);
            this.connectToSfx(ctx, g, 0, 0.15, pos);
            burst.start(now + tOff);
          });
        }
        // Bubbly stink-gas hiss (bandpass 2.8kHz)
        const hiss = ctx.createBufferSource();
        hiss.buffer = this.createNoiseBuffer(ctx, 0.78);
        const hBp = ctx.createBiquadFilter();
        hBp.type = 'bandpass';
        hBp.frequency.setValueAtTime(2800, now + 0.06);
        hBp.Q.setValueAtTime(3.4, now + 0.06);
        const hGain = ctx.createGain();
        hGain.gain.setValueAtTime(0.0001, now + 0.06);
        hGain.gain.linearRampToValueAtTime(0.11, now + 0.18);
        hGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.82);
        hiss.connect(hBp);
        hBp.connect(hGain);
        this.connectToSfx(ctx, hGain, 0, 0.15, pos);
        hiss.start(now + 0.06);

        [0.12, 0.25, 0.41].forEach((off, idx) => {
          const bub = ctx.createOscillator();
          const bGain = ctx.createGain();
          bub.type = 'sine';
          bub.frequency.setValueAtTime(310 + idx * 70, now + off);
          bub.frequency.exponentialRampToValueAtTime(560 + idx * 80, now + off + 0.06);
          bGain.gain.setValueAtTime(0.055, now + off);
          bGain.gain.exponentialRampToValueAtTime(0.0001, now + off + 0.07);
          bub.connect(bGain);
          this.connectToSfx(ctx, bGain, 0, 0.1, pos);
          bub.start(now + off);
          bub.stop(now + off + 0.075);
        });
        this.schedulePropVictimReaction('egg', pos, now + 0.2);
      } else if (propType === 'tomato') {
        // Real tomato-splat recording + sub-thud (160->45Hz) + juicy drip tail
        const played = this.playSampleBuffer('tomato-splat', {
          gain: 0.94,
          fadeIn: 0.005,
          fadeOut: 0.14,
          pos,
          extraReverb: 0.18,
        });
        if (!played) {
          const splatNoise = ctx.createBufferSource();
          splatNoise.buffer = this.createNoiseBuffer(ctx, 0.25);
          const lp = ctx.createBiquadFilter();
          lp.type = 'lowpass';
          lp.frequency.setValueAtTime(1100, now);
          lp.frequency.exponentialRampToValueAtTime(180, now + 0.22);
          const nGain = ctx.createGain();
          nGain.gain.setValueAtTime(0.28, now);
          nGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);
          splatNoise.connect(lp);
          lp.connect(nGain);
          this.connectToSfx(ctx, nGain, 0, 0.15, pos);
          splatNoise.start(now);
        }

        const thud = ctx.createOscillator();
        const tGain = ctx.createGain();
        thud.type = 'sine';
        thud.frequency.setValueAtTime(160, now);
        thud.frequency.exponentialRampToValueAtTime(45, now + 0.17);
        tGain.gain.setValueAtTime(0.24, now);
        tGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
        thud.connect(tGain);
        this.connectToSfx(ctx, tGain, 0, 0.08, pos);
        thud.start(now);
        thud.stop(now + 0.21);

        // Juicy drip tail
        [0.18, 0.3, 0.44].forEach((off, idx) => {
          const drip = ctx.createOscillator();
          const dGain = ctx.createGain();
          drip.type = 'sine';
          drip.frequency.setValueAtTime(340 + idx * 55, now + off);
          drip.frequency.exponentialRampToValueAtTime(700 + idx * 90, now + off + 0.045);
          dGain.gain.setValueAtTime(0.055 / (idx * 0.35 + 1), now + off);
          dGain.gain.exponentialRampToValueAtTime(0.0001, now + off + 0.055);
          drip.connect(dGain);
          this.connectToSfx(ctx, dGain, 0, 0.12, pos);
          drip.start(now + off);
          drip.stop(now + off + 0.06);
        });
        this.schedulePropVictimReaction('tomato', pos, now + 0.2);
      } else {
        // Water: metallic bucket-rim clang at t=0 + real heavy water-splash recording
        [780, 1340, 2190].forEach((freq, idx) => {
          const rim = ctx.createOscillator();
          const rGain = ctx.createGain();
          rim.type = idx === 0 ? 'triangle' : 'sine';
          rim.frequency.setValueAtTime(freq, now);
          rGain.gain.setValueAtTime(0.08 / (idx + 1), now);
          rGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.24 - idx * 0.04);
          rim.connect(rGain);
          this.connectToSfx(ctx, rGain, 0, 0.18, pos);
          rim.start(now);
          rim.stop(now + 0.26);
        });

        const played = this.playSampleBuffer('water-splash', {
          gain: 0.94,
          fadeIn: 0.005,
          fadeOut: 0.16,
          pos,
          extraReverb: 0.24,
        });
        if (!played) {
          const splash = ctx.createBufferSource();
          splash.buffer = this.createNoiseBuffer(ctx, 0.42);
          const bp = ctx.createBiquadFilter();
          bp.type = 'bandpass';
          bp.frequency.setValueAtTime(1400, now);
          bp.frequency.exponentialRampToValueAtTime(420, now + 0.38);
          const g = ctx.createGain();
          g.gain.setValueAtTime(0.28, now);
          g.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
          splash.connect(bp);
          bp.connect(g);
          this.connectToSfx(ctx, g, 0, 0.22, pos);
          splash.start(now);
        }
        this.schedulePropVictimReaction('water', pos, now + 0.22);
      }
    } catch {
      // silent
    }
  }

  private schedulePropVictimReaction(
    propType: PropType,
    pos: SpatialVec3 | undefined,
    startTime: number
  ) {
    const nowMs = Date.now();
    // Deduplicate if caller triggers both playPropSplat and playPropVictimReaction on the same hit
    if (nowMs - (this.lastPropReactionMs[propType] ?? 0) < 320) return;
    this.lastPropReactionMs[propType] = nowMs;
    this.renderPropVictimReaction(propType, pos, startTime);
  }

  /**
   * Four distinct spatial character vocal/foley reactions replacing the old single robotic buzz.
   */
  public playPropVictimReaction(propType: PropType, pos?: SpatialVec3): void {
    if (!this.canPlaySfx()) return;
    const ctx = this.initCtx();
    if (!ctx) return;
    this.schedulePropVictimReaction(propType, pos, ctx.currentTime);
  }

  private renderPropVictimReaction(
    propType: PropType,
    pos: SpatialVec3 | undefined,
    startTime: number
  ) {
    const ctx = this.ctx;
    if (!ctx || !this.canPlaySfx()) return;

    try {
      if (propType === 'tomato') {
        // Wet splutter ("pfft-blub!") + angry dual-formant grumble
        [0, 0.09].forEach((off, idx) => {
          const puff = ctx.createBufferSource();
          puff.buffer = this.createNoiseBuffer(ctx, 0.08);
          const bp = ctx.createBiquadFilter();
          bp.type = 'bandpass';
          bp.frequency.setValueAtTime(720 + idx * 320, startTime + off);
          bp.frequency.exponentialRampToValueAtTime(1550, startTime + off + 0.06);
          bp.Q.setValueAtTime(2.6, startTime + off);
          const g = ctx.createGain();
          g.gain.setValueAtTime(0.16, startTime + off);
          g.gain.exponentialRampToValueAtTime(0.0001, startTime + off + 0.075);
          puff.connect(bp);
          bp.connect(g);
          this.connectToSfx(ctx, g, 0, 0.12, pos);
          puff.start(startTime + off);
        });
        [0.18, 0.39].forEach((off, idx) => {
          const voice = ctx.createOscillator();
          const f1 = ctx.createBiquadFilter();
          const f2 = ctx.createBiquadFilter();
          const g = ctx.createGain();
          voice.type = 'sawtooth';
          voice.frequency.setValueAtTime(idx === 0 ? 185 : 162, startTime + off);
          voice.frequency.exponentialRampToValueAtTime(idx === 0 ? 118 : 96, startTime + off + 0.16);
          f1.type = 'bandpass';
          f1.frequency.setValueAtTime(520, startTime + off);
          f1.Q.setValueAtTime(3.8, startTime + off);
          f2.type = 'bandpass';
          f2.frequency.setValueAtTime(1180, startTime + off);
          f2.Q.setValueAtTime(4.2, startTime + off);
          g.gain.setValueAtTime(0.0001, startTime + off);
          g.gain.linearRampToValueAtTime(0.15, startTime + off + 0.025);
          g.gain.exponentialRampToValueAtTime(0.0001, startTime + off + 0.18);
          voice.connect(f1);
          voice.connect(f2);
          f1.connect(g);
          f2.connect(g);
          this.connectToSfx(ctx, g, 0, 0.14, pos);
          voice.start(startTime + off);
          voice.stop(startTime + off + 0.19);
        });
      } else if (propType === 'egg') {
        // Coughing/gagging vocal formant + orbiting buzzing flies LFO
        [0, 0.21].forEach((off, idx) => {
          const coughNoise = ctx.createBufferSource();
          coughNoise.buffer = this.createNoiseBuffer(ctx, 0.15);
          const throat = ctx.createOscillator();
          throat.type = 'sawtooth';
          throat.frequency.setValueAtTime(idx === 0 ? 215 : 185, startTime + off);
          throat.frequency.exponentialRampToValueAtTime(125, startTime + off + 0.13);

          const formant = ctx.createBiquadFilter();
          formant.type = 'bandpass';
          formant.frequency.setValueAtTime(idx === 0 ? 740 : 1480, startTime + off);
          formant.Q.setValueAtTime(3.6, startTime + off);

          const g = ctx.createGain();
          g.gain.setValueAtTime(0.0001, startTime + off);
          g.gain.linearRampToValueAtTime(0.16, startTime + off + 0.02);
          g.gain.exponentialRampToValueAtTime(0.0001, startTime + off + 0.15);

          coughNoise.connect(formant);
          throat.connect(formant);
          formant.connect(g);
          this.connectToSfx(ctx, g, 0, 0.14, pos);
          coughNoise.start(startTime + off);
          throat.start(startTime + off);
          throat.stop(startTime + off + 0.16);
        });

        // Orbiting buzzing flies LFO
        const flyOsc = ctx.createOscillator();
        const flyLfo = ctx.createOscillator();
        const flyLfoGain = ctx.createGain();
        const flyBp = ctx.createBiquadFilter();
        const flyGain = ctx.createGain();
        flyOsc.type = 'sawtooth';
        flyOsc.frequency.setValueAtTime(168, startTime + 0.22);
        flyLfo.type = 'sine';
        flyLfo.frequency.setValueAtTime(6.5, startTime + 0.22);
        flyLfoGain.gain.setValueAtTime(18, startTime + 0.22);
        flyLfo.connect(flyLfoGain);
        flyLfoGain.connect(flyOsc.frequency);

        flyBp.type = 'bandpass';
        flyBp.frequency.setValueAtTime(980, startTime + 0.22);
        flyBp.Q.setValueAtTime(5.2, startTime + 0.22);

        flyGain.gain.setValueAtTime(0.0001, startTime + 0.22);
        flyGain.gain.linearRampToValueAtTime(0.075, startTime + 0.42);
        flyGain.gain.exponentialRampToValueAtTime(0.0001, startTime + 1.5);

        flyOsc.connect(flyBp);
        flyBp.connect(flyGain);
        this.connectToSfx(ctx, flyGain, 0.2, 0.18, pos);
        flyOsc.start(startTime + 0.22);
        flyLfo.start(startTime + 0.22);
        flyOsc.stop(startTime + 1.54);
        flyLfo.stop(startTime + 1.54);
      } else if (propType === 'water') {
        // Cold shivering inward gasp + 14Hz teeth chatter
        const gaspBreath = ctx.createBufferSource();
        gaspBreath.buffer = this.createNoiseBuffer(ctx, 0.22);
        const hp = ctx.createBiquadFilter();
        hp.type = 'bandpass';
        hp.frequency.setValueAtTime(1400, startTime);
        hp.frequency.exponentialRampToValueAtTime(2600, startTime + 0.16);
        hp.Q.setValueAtTime(2.8, startTime);
        const gGain = ctx.createGain();
        gGain.gain.setValueAtTime(0.0001, startTime);
        gGain.gain.linearRampToValueAtTime(0.16, startTime + 0.05);
        gGain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.2);
        gaspBreath.connect(hp);
        hp.connect(gGain);
        this.connectToSfx(ctx, gGain, 0, 0.14, pos);
        gaspBreath.start(startTime);

        const gaspTone = ctx.createOscillator();
        const gtGain = ctx.createGain();
        gaspTone.type = 'sine';
        gaspTone.frequency.setValueAtTime(260, startTime);
        gaspTone.frequency.exponentialRampToValueAtTime(470, startTime + 0.15);
        gtGain.gain.setValueAtTime(0.0001, startTime);
        gtGain.gain.linearRampToValueAtTime(0.075, startTime + 0.04);
        gtGain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.18);
        gaspTone.connect(gtGain);
        this.connectToSfx(ctx, gtGain, 0, 0.14, pos);
        gaspTone.start(startTime);
        gaspTone.stop(startTime + 0.19);

        // 14Hz rhythmic teeth chatter (period = 1/14s ~= 0.0714s)
        for (let i = 0; i < 10; i++) {
          const t = startTime + 0.22 + i / 14;
          const click = ctx.createBufferSource();
          click.buffer = this.createNoiseBuffer(ctx, 0.025);
          const bp = ctx.createBiquadFilter();
          bp.type = 'bandpass';
          bp.frequency.setValueAtTime(3100 + (i % 2) * 420, t);
          bp.Q.setValueAtTime(4.8, t);
          const cGain = ctx.createGain();
          const decay = 1 - i * 0.07;
          cGain.gain.setValueAtTime(0.11 * decay, t);
          cGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.022);
          click.connect(bp);
          bp.connect(cGain);
          this.connectToSfx(ctx, cGain, 0, 0.08, pos);
          click.start(t);
        }
      } else {
        // Rose: warm joyful harmonic sigh + 3 crisp happy hand claps
        [293.66, 369.99, 440.0].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const lp = ctx.createBiquadFilter();
          const g = ctx.createGain();
          osc.type = idx === 1 ? 'triangle' : 'sine';
          osc.frequency.setValueAtTime(freq, startTime);
          osc.frequency.linearRampToValueAtTime(freq * 1.03, startTime + 0.28);
          lp.type = 'lowpass';
          lp.frequency.setValueAtTime(1600, startTime);
          g.gain.setValueAtTime(0.0001, startTime);
          g.gain.linearRampToValueAtTime(0.065 / (idx * 0.35 + 1), startTime + 0.08);
          g.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.45);
          osc.connect(lp);
          lp.connect(g);
          this.connectToSfx(ctx, g, 0, 0.24, pos);
          osc.start(startTime);
          osc.stop(startTime + 0.48);
        });
        [0.28, 0.46, 0.64].forEach((off) => {
          const clap = ctx.createBufferSource();
          clap.buffer = this.createNoiseBuffer(ctx, 0.075);
          const bp = ctx.createBiquadFilter();
          bp.type = 'bandpass';
          bp.frequency.setValueAtTime(1280, startTime + off);
          bp.Q.setValueAtTime(1.6, startTime + off);
          const cGain = ctx.createGain();
          cGain.gain.setValueAtTime(0.0001, startTime + off);
          cGain.gain.linearRampToValueAtTime(0.16, startTime + off + 0.006);
          cGain.gain.exponentialRampToValueAtTime(0.0001, startTime + off + 0.068);
          clap.connect(bp);
          bp.connect(cGain);
          this.connectToSfx(ctx, cGain, 0, 0.16, pos);
          clap.start(startTime + off);
        });
      }
    } catch {
      // silent
    }
  }

  /**
   * Distinct atmospheric 3D spatial foley for all 8 NightSkillCutsceneKind events.
   */
  public playSkillCutsceneSfx(kind: NightSkillCutsceneKind, pos?: SpatialVec3): void {
    if (!this.canPlaySfx()) return;
    if (kind === 'hunter_shot') {
      this.playShotgunCock(pos);
      return;
    }

    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      switch (kind) {
        case 'werewolf': {
          // Guttural beast snarl + triple claw rip
          const snarl = ctx.createOscillator();
          const sLp = ctx.createBiquadFilter();
          const sGain = ctx.createGain();
          snarl.type = 'sawtooth';
          snarl.frequency.setValueAtTime(92, now);
          snarl.frequency.exponentialRampToValueAtTime(56, now + 0.48);
          sLp.type = 'lowpass';
          sLp.frequency.setValueAtTime(420, now);
          sGain.gain.setValueAtTime(0.0001, now);
          sGain.gain.linearRampToValueAtTime(0.22, now + 0.06);
          sGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.52);
          snarl.connect(sLp);
          sLp.connect(sGain);
          this.connectToSfx(ctx, sGain, 0, 0.3, pos);
          snarl.start(now);
          snarl.stop(now + 0.55);

          this.playSampleBuffer('wolf-howl', {
            rate: 0.68,
            gain: 0.45,
            duration: 0.9,
            fadeIn: 0.04,
            fadeOut: 0.35,
            filterType: 'lowpass',
            filterFreq: 720,
            pos,
            extraReverb: 0.35,
          });

          // Triple razor claw rip
          [0.14, 0.26, 0.38].forEach((off, idx) => {
            const slash = ctx.createBufferSource();
            slash.buffer = this.createNoiseBuffer(ctx, 0.16);
            const bp = ctx.createBiquadFilter();
            bp.type = 'bandpass';
            bp.frequency.setValueAtTime(950 + idx * 240, now + off);
            bp.frequency.exponentialRampToValueAtTime(4200, now + off + 0.11);
            bp.Q.setValueAtTime(2.4, now + off);
            const g = ctx.createGain();
            g.gain.setValueAtTime(0.28, now + off);
            g.gain.exponentialRampToValueAtTime(0.0001, now + off + 0.14);
            slash.connect(bp);
            bp.connect(g);
            this.connectToSfx(ctx, g, (idx - 1) * 0.25, 0.25, pos);
            slash.start(now + off);
          });
          break;
        }
        case 'cupid': {
          // Bowstring draw + twin arrow whoosh + celestial harp chime
          const draw = ctx.createOscillator();
          const dLp = ctx.createBiquadFilter();
          const dGain = ctx.createGain();
          draw.type = 'triangle';
          draw.frequency.setValueAtTime(175, now);
          draw.frequency.exponentialRampToValueAtTime(320, now + 0.26);
          dLp.type = 'bandpass';
          dLp.frequency.setValueAtTime(620, now);
          dGain.gain.setValueAtTime(0.0001, now);
          dGain.gain.linearRampToValueAtTime(0.11, now + 0.12);
          dGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
          draw.connect(dLp);
          dLp.connect(dGain);
          this.connectToSfx(ctx, dGain, 0, 0.15, pos);
          draw.start(now);
          draw.stop(now + 0.3);

          // Twin arrow whooshes
          [0.28, 0.42].forEach((off, idx) => {
            const whoosh = ctx.createBufferSource();
            whoosh.buffer = this.createNoiseBuffer(ctx, 0.24);
            const bp = ctx.createBiquadFilter();
            bp.type = 'bandpass';
            bp.frequency.setValueAtTime(620, now + off);
            bp.frequency.exponentialRampToValueAtTime(2700, now + off + 0.18);
            bp.Q.setValueAtTime(3.2, now + off);
            const g = ctx.createGain();
            g.gain.setValueAtTime(0.0001, now + off);
            g.gain.linearRampToValueAtTime(0.2, now + off + 0.05);
            g.gain.exponentialRampToValueAtTime(0.0001, now + off + 0.22);
            whoosh.connect(bp);
            bp.connect(g);
            this.connectToSfx(ctx, g, idx === 0 ? -0.35 : 0.35, 0.25, pos);
            whoosh.start(now + off);
          });

          this.playSampleBuffer('mystic-chime', {
            startTime: now + 0.46,
            rate: 1.32,
            gain: 0.42,
            duration: 1.8,
            fadeIn: 0.08,
            fadeOut: 0.7,
            pos,
            extraReverb: 0.45,
          });
          [440.0, 554.37, 659.25, 880.0, 1108.73].forEach((freq, i) => {
            const t = now + 0.48 + i * 0.065;
            const osc = ctx.createOscillator();
            const g = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, t);
            g.gain.setValueAtTime(0.0001, t);
            g.gain.linearRampToValueAtTime(0.095, t + 0.015);
            g.gain.exponentialRampToValueAtTime(0.0001, t + 1.05);
            osc.connect(g);
            this.connectToSfx(ctx, g, (i - 2) * 0.2, 0.4, pos);
            osc.start(t);
            osc.stop(t + 1.1);
          });
          break;
        }
        case 'bodyguard': {
          // Heavy metal shield slam + resonant barrier hum
          const sub = ctx.createOscillator();
          const sGain = ctx.createGain();
          sub.type = 'sine';
          sub.frequency.setValueAtTime(135, now);
          sub.frequency.exponentialRampToValueAtTime(36, now + 0.24);
          sGain.gain.setValueAtTime(0.32, now);
          sGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
          sub.connect(sGain);
          this.connectToSfx(ctx, sGain, 0, 0.2, pos);
          sub.start(now);
          sub.stop(now + 0.3);

          const clang = ctx.createBufferSource();
          clang.buffer = this.createNoiseBuffer(ctx, 0.16);
          const bp = ctx.createBiquadFilter();
          bp.type = 'bandpass';
          bp.frequency.setValueAtTime(2600, now);
          bp.Q.setValueAtTime(4.0, now);
          const cGain = ctx.createGain();
          cGain.gain.setValueAtTime(0.28, now);
          cGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
          clang.connect(bp);
          bp.connect(cGain);
          this.connectToSfx(ctx, cGain, 0, 0.28, pos);
          clang.start(now);

          this.playSampleBuffer('church-bell', {
            rate: 1.48,
            gain: 0.42,
            duration: 1.2,
            fadeIn: 0.006,
            fadeOut: 0.55,
            filterType: 'highpass',
            filterFreq: 450,
            pos,
            extraReverb: 0.38,
          });

          // Resonant protective barrier hum (D3 + A3 + D4)
          [146.83, 220.0, 293.66].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const g = ctx.createGain();
            osc.type = i === 0 ? 'triangle' : 'sine';
            osc.frequency.setValueAtTime(freq, now + 0.06);
            g.gain.setValueAtTime(0.0001, now + 0.06);
            g.gain.linearRampToValueAtTime(0.1 / (i + 1), now + 0.25);
            g.gain.exponentialRampToValueAtTime(0.0001, now + 1.45);
            osc.connect(g);
            this.connectToSfx(ctx, g, 0, 0.4, pos);
            osc.start(now + 0.06);
            osc.stop(now + 1.5);
          });
          break;
        }
        case 'seer': {
          // Crystal orb swell + mystic scan chime
          this.playSampleBuffer('mystic-chime', {
            rate: 1.08,
            gain: 0.78,
            duration: 2.5,
            fadeIn: 0.18,
            fadeOut: 0.85,
            pos,
            extraReverb: 0.55,
          });
          [440.0, 659.25, 880.0, 1318.51].forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const g = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq * 0.96, now);
            osc.frequency.exponentialRampToValueAtTime(freq, now + 0.55);
            g.gain.setValueAtTime(0.0001, now);
            g.gain.linearRampToValueAtTime(0.055 / (idx * 0.35 + 1), now + 0.45);
            g.gain.exponentialRampToValueAtTime(0.0001, now + 1.65);
            osc.connect(g);
            this.connectToSfx(ctx, g, (idx - 1.5) * 0.22, 0.5, pos);
            osc.start(now);
            osc.stop(now + 1.7);
          });
          break;
        }
        case 'witch_heal': {
          // Sparkling emerald elixir chime + light bubbling shimmer
          this.playSampleBuffer('mystic-chime', {
            rate: 1.38,
            gain: 0.62,
            duration: 1.9,
            fadeIn: 0.06,
            fadeOut: 0.7,
            pos,
            extraReverb: 0.48,
          });
          this.playSampleBuffer('cauldron-bubble', {
            rate: 1.42,
            gain: 0.36,
            duration: 0.75,
            fadeIn: 0.04,
            fadeOut: 0.25,
            filterType: 'highpass',
            filterFreq: 520,
            pos,
            extraReverb: 0.25,
          });
          [587.33, 739.99, 880.0, 1174.66, 1479.98].forEach((freq, i) => {
            const t = now + i * 0.075;
            const osc = ctx.createOscillator();
            const g = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, t);
            g.gain.setValueAtTime(0.0001, t);
            g.gain.linearRampToValueAtTime(0.075, t + 0.015);
            g.gain.exponentialRampToValueAtTime(0.0001, t + 0.95);
            osc.connect(g);
            this.connectToSfx(ctx, g, (i - 2) * 0.18, 0.45, pos);
            osc.start(t);
            osc.stop(t + 1.0);
          });
          break;
        }
        case 'witch_poison': {
          // Glass vial shatter + cauldron-bubble + corrosive toxic hiss
          const glassBurst = ctx.createBufferSource();
          glassBurst.buffer = this.createNoiseBuffer(ctx, 0.22);
          const gHp = ctx.createBiquadFilter();
          gHp.type = 'highpass';
          gHp.frequency.setValueAtTime(3600, now);
          const gbGain = ctx.createGain();
          gbGain.gain.setValueAtTime(0.24, now);
          gbGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.19);
          glassBurst.connect(gHp);
          gHp.connect(gbGain);
          this.connectToSfx(ctx, gbGain, 0, 0.28, pos);
          glassBurst.start(now);

          [2950, 3840, 4720, 5610, 6380].forEach((freq, i) => {
            const t = now + i * 0.032;
            const shard = ctx.createOscillator();
            const sg = ctx.createGain();
            shard.type = 'sine';
            shard.frequency.setValueAtTime(freq, t);
            sg.gain.setValueAtTime(0.055 / (i * 0.25 + 1), t);
            sg.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
            shard.connect(sg);
            this.connectToSfx(ctx, sg, (i - 2) * 0.15, 0.35, pos);
            shard.start(t);
            shard.stop(t + 0.2);
          });

          this.playSampleBuffer('cauldron-bubble', {
            startTime: now + 0.14,
            gain: 0.78,
            duration: 1.5,
            fadeIn: 0.05,
            fadeOut: 0.4,
            filterType: 'lowpass',
            filterFreq: 3600,
            pos,
            extraReverb: 0.3,
          });

          const hiss = ctx.createBufferSource();
          hiss.buffer = this.createNoiseBuffer(ctx, 1.2);
          const hBp = ctx.createBiquadFilter();
          hBp.type = 'bandpass';
          hBp.frequency.setValueAtTime(1400, now + 0.12);
          hBp.frequency.exponentialRampToValueAtTime(3100, now + 0.65);
          hBp.frequency.exponentialRampToValueAtTime(920, now + 1.25);
          hBp.Q.setValueAtTime(3.6, now + 0.12);
          const hGain = ctx.createGain();
          hGain.gain.setValueAtTime(0.0001, now + 0.12);
          hGain.gain.linearRampToValueAtTime(0.14, now + 0.35);
          hGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.28);
          hiss.connect(hBp);
          hBp.connect(hGain);
          this.connectToSfx(ctx, hGain, 0, 0.4, pos);
          hiss.start(now + 0.12);
          break;
        }
        case 'doppelganger': {
          // Eerie spatial mirror shimmer (palindrome glass echo)
          this.playSampleBuffer('mystic-chime', {
            rate: 0.8,
            gain: 0.5,
            duration: 2.1,
            fadeIn: 0.35,
            fadeOut: 0.7,
            pos,
            extraReverb: 0.55,
          });
          const seq = [329.63, 392.0, 493.88, 659.25, 493.88, 392.0, 329.63];
          seq.forEach((freq, i) => {
            const t = now + i * 0.095;
            const osc = ctx.createOscillator();
            const g = ctx.createGain();
            osc.type = i >= 4 ? 'triangle' : 'sine';
            osc.frequency.setValueAtTime(i >= 4 ? freq * 1.008 : freq, t);
            g.gain.setValueAtTime(0.0001, t);
            g.gain.linearRampToValueAtTime(0.085, t + 0.025);
            g.gain.exponentialRampToValueAtTime(0.0001, t + 0.75);
            osc.connect(g);
            this.connectToSfx(ctx, g, i < 4 ? -0.45 : 0.45, 0.5, pos);
            osc.start(t);
            osc.stop(t + 0.8);
          });
          break;
        }
      }
    } catch {
      // silent
    }
  }

  /**
   * Ethereal stereo-panned ghost wind wail drifting left-to-right in Dark Forest reverb
   */
  public playGhostWail() {
    if (!this.canPlaySfx()) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const panner = this.createPanner(ctx, -0.75);
      if ('pan' in panner && (panner as StereoPannerNode).pan) {
        (panner as StereoPannerNode).pan.linearRampToValueAtTime(0.75, now + 2.1);
      }
      const outBus = this.sfxBus || this.masterGain || ctx.destination;
      panner.connect(outBus);
      if (this.reverbNode) {
        const wet = ctx.createGain();
        wet.gain.setValueAtTime(0.68, now);
        panner.connect(wet);
        wet.connect(this.reverbNode);
      }

      // Eerie breathy wind formant
      const breath = ctx.createBufferSource();
      breath.buffer = this.createNoiseBuffer(ctx, 2.2);
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(340, now);
      bp.frequency.exponentialRampToValueAtTime(880, now + 0.8);
      bp.frequency.exponentialRampToValueAtTime(260, now + 2.1);
      bp.Q.setValueAtTime(5.2, now);
      const bGain = ctx.createGain();
      bGain.gain.setValueAtTime(0.0001, now);
      bGain.gain.linearRampToValueAtTime(0.14, now + 0.5);
      bGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.15);
      breath.connect(bp);
      bp.connect(bGain);
      bGain.connect(panner);
      breath.start(now);

      // Dual haunting ghostly voices with vibrato
      [1, 1.008].forEach((detuneRatio, idx) => {
        const osc = ctx.createOscillator();
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(392 * detuneRatio, now);
        osc.frequency.exponentialRampToValueAtTime(587.33 * detuneRatio, now + 0.72);
        osc.frequency.exponentialRampToValueAtTime(311.13 * detuneRatio, now + 2.0);
        lfo.frequency.setValueAtTime(4.8 + idx * 0.4, now);
        lfoGain.gain.setValueAtTime(6.5, now);
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);

        g.gain.setValueAtTime(0.0001, now);
        g.gain.linearRampToValueAtTime(0.065, now + 0.45);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 2.1);
        osc.connect(g);
        g.connect(panner);
        osc.start(now);
        lfo.start(now);
        osc.stop(now + 2.15);
        lfo.stop(now + 2.15);
      });
    } catch {
      // silent
    }
  }

  /**
   * Night Falls: Real resonant bronze church bell toll + minor-3rd hum tail
   */
  public playNightBell() {
    if (!this.canPlaySfx()) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const playedReal = this.playSampleBuffer('church-bell', {
        rate: 0.92,
        gain: 0.78,
        fadeIn: 0.015,
        fadeOut: 0.75,
        pan: 0,
        extraReverb: 0.5,
      });

      // Subtle dark minor-3rd bell hum tail (full bronze partial stack if sample not cached yet)
      const partials = playedReal
        ? [110.0, 261.63] // A2 hum + C4 minor-3rd haunting ghost partial
        : [110.0, 220.0, 261.63, 329.63, 440.0, 659.25];
      partials.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        const amp = playedReal ? 0.055 / (idx + 1) : 0.14 / (idx + 1);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(amp, now + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.8);
        osc.connect(gain);
        this.connectToSfx(ctx, gain, 0, 0.45);
        osc.start(now);
        osc.stop(now + 2.85);
      });
    } catch {
      // silent
    }
  }

  /**
   * Dawn Breaks: Warm morning resonance + uplifting Dorian bronze chime
   */
  public playDayGong() {
    if (!this.canPlaySfx()) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      this.playSampleBuffer('mystic-chime', {
        rate: 1.14,
        gain: 0.46,
        duration: 2.2,
        fadeIn: 0.04,
        fadeOut: 0.85,
        pan: -0.1,
        extraReverb: 0.35,
      });

      [293.66, 440.0, 587.33, 739.99].forEach((f, idx) => {
        const t = now + idx * 0.085;
        const osc = ctx.createOscillator();
        const lp = ctx.createBiquadFilter();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, t);
        lp.type = 'lowpass';
        lp.frequency.setValueAtTime(2200, t);
        lp.frequency.exponentialRampToValueAtTime(620, t + 1.6);
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.linearRampToValueAtTime(0.11 / (idx * 0.35 + 1), t + 0.025);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.85);
        osc.connect(lp);
        lp.connect(gain);
        this.connectToSfx(ctx, gain, (idx - 1.5) * 0.18, 0.35);
        osc.start(t);
        osc.stop(t + 1.9);
      });
    } catch {
      // silent
    }
  }

  /**
   * Day Voting / Dusk Verdict: Real wooden gavel knock + tight court-table resonance
   */
  public playGavel() {
    if (!this.canPlaySfx()) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const playedReal = this.playSampleBuffer('wood-gavel', {
        gain: 0.92,
        fadeIn: 0.004,
        fadeOut: 0.14,
        pan: 0,
        extraReverb: 0.25,
      });

      // Authoritative sub-wood table body
      const thump = ctx.createOscillator();
      const tGain = ctx.createGain();
      thump.type = 'sine';
      thump.frequency.setValueAtTime(115, now);
      thump.frequency.exponentialRampToValueAtTime(42, now + 0.13);
      tGain.gain.setValueAtTime(playedReal ? 0.18 : 0.28, now);
      tGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
      thump.connect(tGain);
      this.connectToSfx(ctx, tGain, 0, 0.15);
      thump.start(now);
      thump.stop(now + 0.18);

      if (!playedReal) {
        const knock = ctx.createBufferSource();
        knock.buffer = this.createNoiseBuffer(ctx, 0.12);
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.setValueAtTime(680, now);
        bp.Q.setValueAtTime(4.2, now);
        const kGain = ctx.createGain();
        kGain.gain.setValueAtTime(0.32, now);
        kGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
        knock.connect(bp);
        bp.connect(kGain);
        this.connectToSfx(ctx, kGain, 0, 0.2);
        knock.start(now);
      }
    } catch {
      // silent
    }
  }

  /**
   * UI & Role Card Flip: Crisp real parchment page flick (replaces harsh 800Hz sine beep!)
   */
  public playCardFlip() {
    if (!this.canPlaySfx()) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const playedReal = this.playSampleBuffer('card-flip', {
        gain: 0.92,
        offset: 0.06,
        duration: 0.38,
        fadeIn: 0.006,
        fadeOut: 0.12,
        filterType: 'bandpass',
        filterFreq: 1850,
        filterQ: 0.7,
        extraReverb: 0.08,
      });

      if (!playedReal) {
        // Tactile filtered parchment brush fallback (zero robotic sine beep)
        const rustle = ctx.createBufferSource();
        rustle.buffer = this.createNoiseBuffer(ctx, 0.12);
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.setValueAtTime(1100, now);
        bp.frequency.exponentialRampToValueAtTime(2400, now + 0.08);
        bp.Q.setValueAtTime(1.6, now);
        const rGain = ctx.createGain();
        rGain.gain.setValueAtTime(0.0001, now);
        rGain.gain.linearRampToValueAtTime(0.14, now + 0.015);
        rGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
        rustle.connect(bp);
        bp.connect(rGain);
        this.connectToSfx(ctx, rGain, Math.random() * 0.2 - 0.1, 0.08);
        rustle.start(now);
      }
    } catch {
      // silent
    }
  }

  /**
   * Elimination / Death: Deep mournful funeral bell toll + dark minor choir chord in cathedral reverb
   */
  public playDeath() {
    if (!this.canPlaySfx()) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      this.playSampleBuffer('church-bell', {
        rate: 0.7,
        gain: 0.62,
        duration: 2.8,
        fadeIn: 0.02,
        fadeOut: 0.9,
        filterType: 'lowpass',
        filterFreq: 1650,
        pan: 0,
        extraReverb: 0.6,
      });

      // Mournful D-minor funeral choir/cello descent (F3, D3, C3, A2)
      [174.61, 146.83, 130.81, 110.0].forEach((f, i) => {
        const t = now + i * 0.18;
        const osc = ctx.createOscillator();
        const detuned = ctx.createOscillator();
        const lp = ctx.createBiquadFilter();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        detuned.type = 'triangle';
        osc.frequency.setValueAtTime(f, t);
        detuned.frequency.setValueAtTime(f * 1.005, t);

        lp.type = 'lowpass';
        lp.frequency.setValueAtTime(620, t);
        lp.frequency.exponentialRampToValueAtTime(240, t + 1.8);

        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.linearRampToValueAtTime(0.075, t + 0.22);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 2.1);

        osc.connect(lp);
        detuned.connect(lp);
        lp.connect(gain);
        this.connectToSfx(ctx, gain, (i - 1.5) * 0.22, 0.55);
        osc.start(t);
        detuned.start(t);
        osc.stop(t + 2.15);
        detuned.stop(t + 2.15);
      });
    } catch {
      // silent
    }
  }

  /**
   * Victory: Majestic warm medieval horn fifth + triumphant harp/chime fanfare
   */
  public playVictory() {
    if (!this.canPlaySfx()) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      this.playSampleBuffer('mystic-chime', {
        startTime: now + 0.22,
        rate: 1.24,
        gain: 0.56,
        duration: 2.6,
        fadeIn: 0.08,
        fadeOut: 0.9,
        pan: 0,
        extraReverb: 0.45,
      });

      // Warm brass/horn open fifth pad (D3 + A3)
      [146.83, 220.0].forEach((f, idx) => {
        const osc = ctx.createOscillator();
        const lp = ctx.createBiquadFilter();
        const g = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(f, now);
        lp.type = 'lowpass';
        lp.frequency.setValueAtTime(740, now);
        g.gain.setValueAtTime(0.0001, now);
        g.gain.linearRampToValueAtTime(0.075, now + 0.15);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 2.1);
        osc.connect(lp);
        lp.connect(g);
        this.connectToSfx(ctx, g, idx === 0 ? -0.25 : 0.25, 0.4);
        osc.start(now);
        osc.stop(now + 2.15);
      });

      // Triumphant D-major harp fanfare
      [293.66, 369.99, 440.0, 587.33, 739.99, 880.0].forEach((f, i) => {
        const t = now + i * 0.095;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, t);
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.linearRampToValueAtTime(0.12, t + 0.025);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.75);
        osc.connect(gain);
        this.connectToSfx(ctx, gain, -0.4 + i * 0.16, 0.45);
        osc.start(t);
        osc.stop(t + 1.8);
      });
    } catch {
      // silent
    }
  }

  public playGMAnnouncement(
    kind: 'dawn' | 'dusk',
    hasDeaths: boolean,
    spokenText: string,
    lang: Language = 'vi'
  ) {
    if (!this.canPlaySfx()) return;

    if (kind === 'dawn') {
      this.playDayGong();
      if (hasDeaths && typeof window !== 'undefined') {
        window.setTimeout(() => {
          this.playDeath();
        }, 320);
      }
    } else {
      this.playGavel();
      if (hasDeaths && typeof window !== 'undefined') {
        window.setTimeout(() => {
          this.playDeath();
        }, 220);
      }
    }

    if (spokenText && typeof window !== 'undefined') {
      window.setTimeout(() => {
        this.speakLocalized(spokenText, lang, {
          pitch: kind === 'dawn' ? 0.96 : 0.88,
          rate: 0.98,
          volume: 0.9,
        });
      }, 380);
    }
  }
}

export const sound = new SoundEngine();
