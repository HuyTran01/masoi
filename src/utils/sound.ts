import { Language, PropType, RoleId } from '../types/game';

export interface RoleCalloutMeta {
  quote: string;
  quotes: Record<Language, string>;
  sfxLabel: string;
  musicTitle: string;
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
      fr: 'Aouuuuu... La Lune de Sang se lève ! Loups-Garous, réveillez-vous et chassez !',
      es: '¡Auuuuu... La Luna de Sangre se alza! ¡Hombres Lobo, despertad y cazad!',
      ja: 'アオォォーン…血の月が昇った！人狼よ、目覚めて獲物を狩れ！',
    },
    sfxLabel: '🐺 Tiếng Sói Hú Trăng Máu & Gió Rừng Đêm',
    musicTitle: '🎵 Bản Giaoưởng Trăng Máu (Blood Moon Pack Howl)',
  },
  wolf_pup: {
    quote: 'Gâu gâu! Sói Con nhe nanh thức dậy cùng bầy đàn nào!',
    quotes: {
      vi: 'Gâu gâu! Sói Con nhe nanh thức dậy cùng bầy đàn nào!',
      en: 'Arf arf! The fierce Wolf Pup bares its fangs with the pack!',
      fr: 'Wouf wouf ! Le Louveteau montre les crocs avec la meute !',
      es: '¡Guau guau! ¡El Cachorro de Lobo muestra sus colmillos con la manada!',
      ja: 'ワンワン！狼の子が群れと共に牙を剥く！',
    },
    sfxLabel: '🐾 Tiếng Sói Con Gầm Gừ & Trống Chiến Cuồng Nộ',
    musicTitle: '🎵 Vũ Điệu Nanh Sói Non (Feral Cub Drums)',
  },
  witch: {
    quote: 'Khà khà khà... Vạc độc sôi sùng sục... Cứu ai hay giết ai đêm nay đây?',
    quotes: {
      vi: 'Khà khà khà... Vạc độc sôi sùng sục... Cứu ai hay giết ai đêm nay đây?',
      en: 'Hehehe... My cauldron bubbles... Who shall I heal, and who shall taste poison tonight?',
      fr: 'Héhéhé... Mon chaudron bouillonne... Qui sauver ou empoisonner cette nuit ?',
      es: 'Jajaja... Mi caldero burbujea... ¿A quién salvaré o envenenaré esta noche?',
      ja: 'ヒッヒッヒ…大釜が煮えたぎる…今夜は誰を生かし、誰に毒を盛ろうか？',
    },
    sfxLabel: '🧪 Tiếng Vạc Độc Sôi Sùng Sục & Tiếng Cười Ma Mị',
    musicTitle: '🎵 Khúc Nhạc Giả Kim Huyền Bí (Midnight Cauldron Waltz)',
  },
  hunter: {
    quote: 'Cạch rốp! Tao có súng hoa cải đó nha! Đứa nào động vào tao là nổ súng kéo theo liền!',
    quotes: {
      vi: 'Cạch rốp! Tao có súng hoa cải đó nha! Đứa nào động vào tao là nổ súng kéo theo liền!',
      en: 'Click-clack! My shotgun is loaded! Touch me and I will take you down with me!',
      fr: 'Clic-clac ! Mon fusil est chargé ! Touchez-moi et je vous emporte avec moi !',
      es: '¡Clic-clac! ¡Mi escopeta está cargada! ¡Si caigo, me llevaré a uno conmigo!',
      ja: 'カチャッ！散弾銃には弾が入っているぞ！俺を倒せば道連れにしてやる！',
    },
    sfxLabel: '🔫 Tiếng Lên Đạn Súng Hoa Cải & Còi Săn Đêm',
    musicTitle: '🎵 Hành Khúc Xạ Thủ Rừng Già (Iron Shotgun March)',
  },
  seer: {
    quote: 'Hỡi quả cầu pha lê huyền bí... Hãy vạch trần bộ mặt thật kẻ ẩn mình trong bóng tối!',
    quotes: {
      vi: 'Hỡi quả cầu pha lê huyền bí... Hãy vạch trần bộ mặt thật kẻ ẩn mình trong bóng tối!',
      en: 'O mystic crystal ball... Reveal the true alignment hidden in the shadows!',
      fr: 'Ô boule de cristal mystique... Révèle la vraie nature cachée dans l’ombre !',
      es: 'Oh esfera de cristal mística... ¡Revela la verdadera identidad oculta en las sombras!',
      ja: '神秘の水晶玉よ…闇に潜む者の正体を映し出せ！',
    },
    sfxLabel: '🔮 Tiếng Chuông Pha Lê & Nhịp Đập Nhãn Thần',
    musicTitle: '🎵 Giai Điệu Tiên Tri Tinh Tú (Astral Divination Chimes)',
  },
  bodyguard: {
    quote: 'Keng! Khiên thép đã giương cao! Đêm nay không con sói nào bước qua được xác ta!',
    quotes: {
      vi: 'Keng! Khiên thép đã giương cao! Đêm nay không con sói nào bước qua được xác ta!',
      en: 'Clang! My iron shield is raised! No werewolf shall pass my watch tonight!',
      fr: 'Clang ! Mon bouclier d’acier est levé ! Aucun loup ne passera cette nuit !',
      es: '¡Clang! ¡Mi escudo de acero está en alto! ¡Ningún lobo pasará mi guardia hoy!',
      ja: 'カァン！鋼の盾は掲げられた！今夜、人狼どもは一歩も通さん！',
    },
    sfxLabel: '🛡️ Tiếng Khiên Thép Va Chạm & Tù Và Hộ Vệ',
    musicTitle: '🎵 Khúc Ca Kỵ Sĩ Hộ Vệ (Citadel Shield Fanfare)',
  },
  cupid: {
    quote: 'Vút... Phập! Mũi tên tình ái đã giương cung, hai sinh mệnh kết nối cùng sống cùng chết!',
    quotes: {
      vi: 'Vút... Phập! Mũi tên tình ái đã giương cung, hai sinh mệnh kết nối cùng sống cùng chết!',
      en: 'Whoosh... Thwip! Cupid’s arrow flies, binding two souls in life and death!',
      fr: 'Zou... La flèche de Cupidon vole, liant deux âmes à la vie, à la mort !',
      es: '¡Fiuuu! ¡La flecha de Cupido vuela, uniendo dos almas en la vida y la muerte!',
      ja: 'ヒュン…キューピッドの矢が放たれ、二つの魂が生死を共にする！',
    },
    sfxLabel: '💘 Tiếng Bắn Cung Tên Tình Ái & Đàn Hạc Thiên Thần',
    musicTitle: '🎵 Bản Tình Ca Định Mệnh (Celestial Harp Serenade)',
  },
  doppelganger: {
    quote: 'Chiếc gương ma thuật phản chiếu... Khi ngươi ngã xuống, ta sẽ mang hình hài của ngươi!',
    quotes: {
      vi: 'Chiếc gương ma thuật phản chiếu... Khi ngươi ngã xuống, ta sẽ mang hình hài của ngươi!',
      en: 'The phantom mirror reflects... When you fall, I shall become your shadow!',
      fr: 'Le miroir fantôme reflète... Quand tu tomberas, je prendrai ton visage !',
      es: 'El espejo fantasma refleja... ¡Cuando caigas, tomaré tu lugar y tu poder!',
      ja: '幻影の鏡が映し出す…お前が倒れる時、私がお前の姿と力を継ぐ！',
    },
    sfxLabel: '🪞 Tiếng Gương Ma Thuật Ngân Vang & Bóng Phân Thân',
    musicTitle: '🎵 Vũ Khúc Phản Chiếu Trong Gương (Phantom Mirror Echo)',
  },
  elder: {
    quote: 'Boong... Lão già làng chống gậy sắt thức tỉnh! Sức mạnh cổ xưa che chở ngôi làng!',
    quotes: {
      vi: 'Boong... Lão già làng chống gậy sắt thức tỉnh! Sức mạnh cổ xưa che chở ngôi làng!',
      en: 'Boooong... The Village Elder awakens! Ancient wisdom shields our bloodline!',
      fr: 'Boooong... L’Ancien du village s’éveille ! La sagesse ancestrale nous protège !',
      es: '¡Boooong... El Anciano del pueblo despierta! ¡La sabiduría antigua nos protege!',
      ja: 'ゴォォーン…長老が杖を鳴らす！古の知恵が村を守護する！',
    },
    sfxLabel: '👑 Tiếng Chiêng Đồng Cổ Đại & Gậy Trượng Già Làng',
    musicTitle: '🎵 Hào Khí Trưởng Lão Ngàn Năm (Ancient Temple Gong)',
  },
  cursed: {
    quote: 'Thịch... thịch... Dòng máu nguyền rủa đang sôi trào dưới ánh trăng đêm!',
    quotes: {
      vi: 'Thịch... thịch... Dòng máu nguyền rủa đang sôi trào dưới ánh trăng đêm!',
      en: 'Thump... thump... The cursed blood simmers beneath the moonlight!',
      fr: 'Boum... boum... Le sang maudit bouillonne sous le clair de lune !',
      es: 'Latido... latido... ¡La sangre maldita hierve bajo la luz de la luna!',
      ja: 'ドクン…ドクン…呪われた血が月光の下で疼き出す！',
    },
    sfxLabel: '🌓 Tiếng Tim Đập Huyết Nguyền & Tiếng Gầm Hóa Sói',
    musicTitle: '🎵 Giao Hưởng Huyết Nguyền (Dark Transformation Pulse)',
  },
  traitor: {
    quote: 'Xoẹt! Lưỡi dao găm giấu trong tay áo... Ta sẽ dẫn đường cho bầy Sói làm cỏ ngôi làng này!',
    quotes: {
      vi: 'Xoẹt! Lưỡi dao găm giấu trong tay áo... Ta sẽ dẫn đường cho bầy Sói làm cỏ ngôi làng này!',
      en: 'Shhhk! A dagger hidden in the dark... I serve the Werewolves from within!',
      fr: 'Chlac ! Une dague cachée dans l’ombre... Je sers les Loups de l’intérieur !',
      es: '¡Zas! Una daga oculta en las sombras... ¡Guiaré a los Lobos a la victoria!',
      ja: 'シュッ！袖に隠した短剣…村の内側から人狼どもを勝利へ導く！',
    },
    sfxLabel: '🗡️ Tiếng Tuốt Dao Găm Sắc Lạnh & Lời Thì Thầm Phản Bội',
    musicTitle: '🎵 Khúc Nhạc Mưu Đồ Bóng Tối (Shadow Dagger Intrigue)',
  },
  tanner: {
    quote: 'Haha! Treo cổ ta đi! Chỉ cần bước lên giá treo cổ là ta độc chiếm chiến thắng!',
    quotes: {
      vi: 'Haha! Treo cổ ta đi! Chỉ cần bước lên giá treo cổ là ta độc chiếm chiến thắng!',
      en: 'Haha! Lynch me today! The gallows are my throne of solo victory!',
      fr: 'Haha ! Pendez-moi aujourd’hui ! La potence est ma victoire solitaire !',
      es: '¡Jaja! ¡Cuelguenme hoy! ¡La horca es mi victoria en solitario!',
      ja: 'ハハハ！俺を処刑してみろ！処刑台こそが俺の単独勝利だ！',
    },
    sfxLabel: '🎭 Tiếng Lục Lạc Chú Hề & Kèn Trêu Ngươi',
    musicTitle: '🎵 Điệu Nhảy Kẻ Chán Đời (Jester Gallows Polka)',
  },
  villager: {
    quote: 'Boong... Màn đêm tĩnh mịch bao trùm... Dân làng khoá chặt cửa cầu nguyện bình an...',
    quotes: {
      vi: 'Boong... Màn đêm tĩnh mịch bao trùm... Dân làng khoá chặt cửa cầu nguyện bình an...',
      en: 'Bong... Silence falls over the dark village... Lock your doors and pray for dawn...',
      fr: 'Bong... Le silence tombe sur le village... Verrouillez vos portes jusqu’à l’aube...',
      es: 'Bong... El silencio cae sobre la aldea... Cierren sus puertas hasta el amanecer...',
      ja: 'ゴーン…静寂が村を包む…夜明けまで扉を閉ざして祈りなさい…',
    },
    sfxLabel: '🔔 Tiếng Chuông Canh Đêm & Dế Kêu Rừng Khuya',
    musicTitle: '🎵 Khúc Ru Đêm Làng Cổ (Silent Village Lullaby)',
  },
};

export interface PropReactionMeta {
  emotion: 'angry' | 'happy_dance';
  emoji: string;
  badgeText: Record<Language, string>;
  speechText: Record<Language, string>;
}

export const PROP_REACTION_META: Record<PropType, PropReactionMeta> = {
  tomato: {
    emotion: 'angry',
    emoji: '🤬',
    badgeText: {
      vi: '🤬 TỨC GIẬN SÔI MÁU!',
      en: '🤬 FURIOUS RAGE!',
      fr: '🤬 FURIEUX !',
      es: '🤬 ¡FURIOSO!',
      ja: '🤬 激怒カンカン！',
    },
    speechText: {
      vi: 'Á à! Đứa nào dám ném cà chua vào mặt ta đó?! Tức điên lên được! 🍅💢',
      en: 'Hey!! Who threw that rotten tomato at my face?! I am furious! 🍅💢',
      fr: 'Hé ! Qui a osé me lancer cette tomate ?! Je suis furieux ! 🍅💢',
      es: '¡¿Quién se atrevió a lanzarme ese tomate?! ¡Estoy furioso! 🍅💢',
      ja: 'ちょっと！誰がトマトを投げたの？！頭にきたぞ！🍅💢',
    },
  },
  egg: {
    emotion: 'angry',
    emoji: '😡',
    badgeText: {
      vi: '😡 NỔI GIẬN ĐÙNG ĐÙNG!',
      en: '😡 BOILING ANGRY!',
      fr: '😡 EN COLÈRE NOIRE !',
      es: '😡 ¡HIRVIENDO DE IRA!',
      ja: '😡 大激怒プンプン！',
    },
    speechText: {
      vi: 'Trứng thối bốc mùi kinh quá! Đồ đáng ghét! 🥚💢',
      en: 'Yuck, rotten egg! That smells awful! You will pay for this! 🥚💢',
      fr: 'Pouah, un œuf pourri ! Ça pue horriblement ! 🥚💢',
      es: '¡Puaj, huevo podrido! ¡Me las pagarás en la votación! 🥚💢',
      ja: 'うわっ、腐った卵だ！臭すぎる！覚えてろよ！🥚💢',
    },
  },
  water: {
    emotion: 'angry',
    emoji: '😤',
    badgeText: {
      vi: '😤 TỨC XÌ KHÓI ĐẦU!',
      en: '😤 SOAKED & ANGRY!',
      fr: '😤 TREMPÉ & FURIEUX !',
      es: '😤 ¡MOJADO Y ENOJADO!',
      ja: '😤 ずぶ濡れで激怒！',
    },
    speechText: {
      vi: 'Ướt nhẹp cả người rồi! Lạnh quá đi mất, coi chừng ta! 🪣💢',
      en: 'I am completely soaked! Freezing cold! Watch yourself! 🪣💢',
      fr: 'Je suis trempé jusqu’aux os ! Gare à toi ! 🪣💢',
      es: '¡Estoy empapado! ¡Qué frío, ten cuidado conmigo! 🪣💢',
      ja: '全身ずぶ濡れじゃないか！冷たい！許さないぞ！🪣💢',
    },
  },
  rose: {
    emotion: 'happy_dance',
    emoji: '💃',
    badgeText: {
      vi: '💃 VUI MỪNG NHẢY MÚA!',
      en: '💃 HAPPY DANCING!',
      fr: '💃 DANSE DE JOIE !',
      es: '💃 ¡BAILANDO DE ALEGRÍA!',
      ja: '💃 歓喜のダンス！',
    },
    speechText: {
      vi: 'Oa hoa hồng thơm quá! Vui quá nhảy múa thôi! 💐💖🎶',
      en: 'Aw, a lovely rose bouquet! Time for a happy dance! 💐💖🎶',
      fr: 'Oh, un bouquet de roses ! Dansons de joie ! 💐💖🎶',
      es: '¡Qué hermoso ramo de rosas! ¡A bailar de alegría! 💐💖🎶',
      ja: 'わぁ、素敵なバラの花束！嬉しくて踊っちゃう！💐💖🎶',
    },
  },
};

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private isBgmActive: boolean = false;
  private bgmMode: 'night' | 'day' | 'lobby' = 'lobby';
  private bgmInterval: number | null = null;
  private bgmStepCounter: number = 0;

  constructor() {
    if (typeof window !== 'undefined') {
      this.isMuted = localStorage.getItem('werewolf_muted') === 'true';
      // Pre-warm speechSynthesis voice list if available
      if ('speechSynthesis' in window) {
        try {
          window.speechSynthesis.getVoices();
        } catch {
          // ignore
        }
      }
    }
  }

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        this.ctx = new AudioCtxClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /**
   * Helper to generate a procedural white/pink noise AudioBuffer for realistic wind,
   * shotgun blasts, cauldron bubbles, and metallic scrapes.
   */
  private createNoiseBuffer(ctx: AudioContext, durationSec: number): AudioBuffer {
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
    return buffer;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (typeof window !== 'undefined') {
      localStorage.setItem('werewolf_muted', String(this.isMuted));
      if (this.isMuted && 'speechSynthesis' in window) {
        try {
          window.speechSynthesis.cancel();
        } catch {
          // ignore
        }
      }
    }
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Speaks localized text ONLY if the user's browser/OS actually has a voice installed
   * for `lang`. Never falls back to an English voice when `lang === 'vi'` (fixes the
   * bug where PC browsers read Vietnamese text with an English accent).
   */
  public speakLocalized(
    text: string,
    lang: Language = 'vi',
    options?: { pitch?: number; rate?: number; volume?: number }
  ): boolean {
    if (this.isMuted || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return false;
    }

    try {
      const voices = window.speechSynthesis.getVoices();
      const matchedVoice = selectBestVoiceForLanguage(voices, lang);
      if (!matchedVoice) {
        // Do NOT speak with a mismatched OS default English voice!
        return false;
      }

      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.voice = matchedVoice;
      utter.lang = matchedVoice.lang;
      utter.pitch = options?.pitch ?? 1.0;
      utter.rate = options?.rate ?? 1.0;
      utter.volume = options?.volume ?? 0.85;
      window.speechSynthesis.speak(utter);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Rich Multi-Voice Procedural Background Music (BGM)
   */
  public startBGM(mode: 'night' | 'day' | 'lobby' = 'night') {
    this.bgmMode = mode;
    if (this.isBgmActive) return;
    this.isBgmActive = true;
    this.bgmStepCounter = 0;

    if (typeof window === 'undefined') return;

    const playMusicalMeasure = () => {
      if (!this.isBgmActive || this.isMuted) return;
      const ctx = this.initCtx();
      if (!ctx) return;

      try {
        const now = ctx.currentTime;
        const step = this.bgmStepCounter++;

        if (this.bgmMode === 'night') {
          const nightRoots = [110.0, 87.31, 98.0, 82.41]; // A2, F2, G2, E2
          const rootFreq = nightRoots[step % nightRoots.length];

          const padOsc = ctx.createOscillator();
          const padFilter = ctx.createBiquadFilter();
          const padGain = ctx.createGain();
          padOsc.type = 'sawtooth';
          padOsc.frequency.setValueAtTime(rootFreq, now);
          padFilter.type = 'lowpass';
          padFilter.frequency.setValueAtTime(230, now);

          padGain.gain.setValueAtTime(0.0001, now);
          padGain.gain.linearRampToValueAtTime(0.028, now + 0.6);
          padGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.3);

          padOsc.connect(padFilter);
          padFilter.connect(padGain);
          padGain.connect(ctx.destination);
          padOsc.start(now);
          padOsc.stop(now + 2.35);

          const nightMotifs = [
            [440.0, 523.25, 659.25],
            [349.23, 440.0, 523.25],
            [392.0, 493.88, 587.33],
            [329.63, 415.3, 493.88],
          ];
          const motif = nightMotifs[step % nightMotifs.length];
          motif.forEach((noteFreq, idx) => {
            const noteOsc = ctx.createOscillator();
            const noteGain = ctx.createGain();
            noteOsc.type = 'sine';
            const tStart = now + idx * 0.65;
            noteOsc.frequency.setValueAtTime(noteFreq, tStart);
            noteGain.gain.setValueAtTime(0.0001, tStart);
            noteGain.gain.linearRampToValueAtTime(0.018, tStart + 0.06);
            noteGain.gain.exponentialRampToValueAtTime(0.0001, tStart + 0.72);
            noteOsc.connect(noteGain);
            noteGain.connect(ctx.destination);
            noteOsc.start(tStart);
            noteOsc.stop(tStart + 0.75);
          });
        } else if (this.bgmMode === 'day') {
          const dayChords = [
            [146.83, 220.0, 293.66, 349.23],
            [130.81, 196.0, 261.63, 329.63],
            [196.0, 293.66, 392.0, 493.88],
            [146.83, 220.0, 293.66, 440.0],
          ];
          const chord = dayChords[step % dayChords.length];
          chord.forEach((freq, i) => {
            const luteOsc = ctx.createOscillator();
            const luteGain = ctx.createGain();
            luteOsc.type = 'triangle';
            const tStart = now + i * 0.42;
            luteOsc.frequency.setValueAtTime(freq, tStart);
            luteGain.gain.setValueAtTime(0.0001, tStart);
            luteGain.gain.linearRampToValueAtTime(0.024, tStart + 0.04);
            luteGain.gain.exponentialRampToValueAtTime(0.0001, tStart + 0.65);
            luteOsc.connect(luteGain);
            luteGain.connect(ctx.destination);
            luteOsc.start(tStart);
            luteOsc.stop(tStart + 0.68);
          });
        }
      } catch {
        // ignore audio errors
      }
    };

    playMusicalMeasure();
    this.bgmInterval = window.setInterval(playMusicalMeasure, 2400);
  }

  public setBGMMode(mode: 'night' | 'day' | 'lobby') {
    const modeChanged = this.bgmMode !== mode;
    this.bgmMode = mode;
    if (!this.isBgmActive) {
      this.startBGM(mode);
    } else if (modeChanged) {
      this.bgmStepCounter = 0;
    }
  }

  public stopBGM() {
    this.isBgmActive = false;
    if (this.bgmInterval !== null && typeof window !== 'undefined') {
      clearInterval(this.bgmInterval);
      this.bgmInterval = null;
    }
  }

  /**
   * Dramatic Role Callout: Plays signature Werewolf SFX + musical theme + localized voice (if native voice exists)
   */
  public playRoleCallout(
    roleId: RoleId,
    lang: Language = 'vi'
  ): { quote: string; sfxLabel: string; musicTitle: string } {
    const info = ROLE_CALLOUT_LINES[roleId] || ROLE_CALLOUT_LINES.villager;
    const localizedQuote = info.quotes[lang] || info.quote;

    if (!this.isMuted) {
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

      // Speak localized voice ONLY if the device has an actual matching voice for `lang`
      const pitchMap: Partial<Record<RoleId, { pitch: number; rate: number }>> = {
        werewolf: { pitch: 0.62, rate: 0.94 },
        wolf_pup: { pitch: 1.24, rate: 1.06 },
        witch: { pitch: 1.32, rate: 0.96 },
        hunter: { pitch: 0.8, rate: 1.05 },
        elder: { pitch: 0.7, rate: 0.9 },
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
   * 1. WEREWOLF: Spine-chilling Dual Wolf Pack Howl + Night Wind + Feral Snarl
   */
  public playWolfHowl() {
    if (this.isMuted) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      // Layer A: Eerie Night Wind Gust (Bandpass-filtered noise)
      const windSrc = ctx.createBufferSource();
      windSrc.buffer = this.createNoiseBuffer(ctx, 2.5);
      const windFilter = ctx.createBiquadFilter();
      windFilter.type = 'bandpass';
      windFilter.frequency.setValueAtTime(380, now);
      windFilter.frequency.exponentialRampToValueAtTime(720, now + 1.1);
      windFilter.frequency.exponentialRampToValueAtTime(290, now + 2.4);
      windFilter.Q.setValueAtTime(3.2, now);
      const windGain = ctx.createGain();
      windGain.gain.setValueAtTime(0.001, now);
      windGain.gain.linearRampToValueAtTime(0.16, now + 0.5);
      windGain.gain.exponentialRampToValueAtTime(0.001, now + 2.45);
      windSrc.connect(windFilter);
      windFilter.connect(windGain);
      windGain.connect(ctx.destination);
      windSrc.start(now);

      // Layer B: Alpha Wolf Throat Formant Howl with Natural Vibrato LFO ("Auuuuuuuu!")
      const alphaOsc = ctx.createOscillator();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      const formant1 = ctx.createBiquadFilter();
      const alphaGain = ctx.createGain();

      alphaOsc.type = 'sawtooth';
      alphaOsc.frequency.setValueAtTime(145, now);
      alphaOsc.frequency.exponentialRampToValueAtTime(420, now + 0.52);
      alphaOsc.frequency.setValueAtTime(420, now + 0.95);
      alphaOsc.frequency.exponentialRampToValueAtTime(385, now + 1.45);
      alphaOsc.frequency.exponentialRampToValueAtTime(160, now + 2.35);

      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(5.6, now);
      lfoGain.gain.setValueAtTime(9.5, now);
      lfo.connect(lfoGain);
      lfoGain.connect(alphaOsc.frequency);

      formant1.type = 'bandpass';
      formant1.frequency.setValueAtTime(340, now);
      formant1.frequency.exponentialRampToValueAtTime(760, now + 0.55);
      formant1.frequency.exponentialRampToValueAtTime(280, now + 2.35);
      formant1.Q.setValueAtTime(4.2, now);

      alphaGain.gain.setValueAtTime(0.001, now);
      alphaGain.gain.linearRampToValueAtTime(0.28, now + 0.35);
      alphaGain.gain.setValueAtTime(0.26, now + 1.3);
      alphaGain.gain.exponentialRampToValueAtTime(0.001, now + 2.4);

      alphaOsc.connect(formant1);
      formant1.connect(alphaGain);
      alphaGain.connect(ctx.destination);

      alphaOsc.start(now);
      lfo.start(now);
      alphaOsc.stop(now + 2.45);
      lfo.stop(now + 2.45);

      // Layer C: Second Pack Wolf Harmony Howl answering 0.38s later (Minor Third above)
      const packOsc = ctx.createOscillator();
      const packFilter = ctx.createBiquadFilter();
      const packGain = ctx.createGain();
      packOsc.type = 'triangle';
      packOsc.frequency.setValueAtTime(195, now + 0.38);
      packOsc.frequency.exponentialRampToValueAtTime(508, now + 0.88);
      packOsc.frequency.exponentialRampToValueAtTime(220, now + 2.3);
      packFilter.type = 'lowpass';
      packFilter.frequency.setValueAtTime(950, now + 0.38);
      packGain.gain.setValueAtTime(0.001, now + 0.38);
      packGain.gain.linearRampToValueAtTime(0.18, now + 0.75);
      packGain.gain.exponentialRampToValueAtTime(0.001, now + 2.35);
      packOsc.connect(packFilter);
      packFilter.connect(packGain);
      packGain.connect(ctx.destination);
      packOsc.start(now + 0.38);
      packOsc.stop(now + 2.4);
    } catch {
      // silent
    }
  }

  /**
   * 2. WOLF PUP: Double Fierce Cub Bark ("Gâu! Gâu!") + High Cub Howl + Tribal War Drum
   */
  public playWolfPupBark() {
    if (this.isMuted) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      // Double sharp cub bark with noise transient
      [0, 0.21].forEach((offset) => {
        const bark = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        const bGain = ctx.createGain();
        bark.type = 'sawtooth';
        bark.frequency.setValueAtTime(320, now + offset);
        bark.frequency.exponentialRampToValueAtTime(640, now + offset + 0.05);
        bark.frequency.exponentialRampToValueAtTime(185, now + offset + 0.16);
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(750, now + offset);
        filter.Q.setValueAtTime(3.0, now + offset);
        bGain.gain.setValueAtTime(0.24, now + offset);
        bGain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.18);
        bark.connect(filter);
        filter.connect(bGain);
        bGain.connect(ctx.destination);
        bark.start(now + offset);
        bark.stop(now + offset + 0.19);
      });

      // Energetic high cub howl with vibrato
      const howl = ctx.createOscillator();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      const hGain = ctx.createGain();
      howl.type = 'sawtooth';
      howl.frequency.setValueAtTime(290, now + 0.45);
      howl.frequency.exponentialRampToValueAtTime(680, now + 0.82);
      howl.frequency.exponentialRampToValueAtTime(340, now + 1.75);
      lfo.frequency.setValueAtTime(6.8, now + 0.45);
      lfoGain.gain.setValueAtTime(12, now + 0.45);
      lfo.connect(lfoGain);
      lfoGain.connect(howl.frequency);

      hGain.gain.setValueAtTime(0.001, now + 0.45);
      hGain.gain.linearRampToValueAtTime(0.18, now + 0.72);
      hGain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);
      howl.connect(hGain);
      hGain.connect(ctx.destination);
      howl.start(now + 0.45);
      lfo.start(now + 0.45);
      howl.stop(now + 1.85);
      lfo.stop(now + 1.85);
    } catch {
      // silent
    }
  }

  /**
   * 3. WITCH: Bubbling Potion Cauldron + Cackling Witch Laugh + Cork Pop
   */
  public playWitchCauldron() {
    if (this.isMuted) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      // Layer A: 10 Boiling Cauldron Bubble Pops
      const bubbleFreqs = [310, 480, 390, 620, 440, 710, 530, 840, 490, 660];
      bubbleFreqs.forEach((f, idx) => {
        const t = now + idx * 0.085;
        const bOsc = ctx.createOscillator();
        const bGain = ctx.createGain();
        bOsc.type = 'sine';
        bOsc.frequency.setValueAtTime(f * 0.75, t);
        bOsc.frequency.exponentialRampToValueAtTime(f * 1.45, t + 0.065);
        bGain.gain.setValueAtTime(0.001, t);
        bGain.gain.linearRampToValueAtTime(0.14, t + 0.015);
        bGain.gain.exponentialRampToValueAtTime(0.001, t + 0.075);
        bOsc.connect(bGain);
        bGain.connect(ctx.destination);
        bOsc.start(t);
        bOsc.stop(t + 0.08);
      });

      // Layer B: Eerie Witch Cackle Motif ("Khà-khà-khà-khà!")
      const cackleNotes = [740.0, 698.46, 659.25, 622.25, 587.33];
      cackleNotes.forEach((freq, i) => {
        const t = now + 0.35 + i * 0.13;
        const cOsc = ctx.createOscillator();
        const cFilter = ctx.createBiquadFilter();
        const cGain = ctx.createGain();
        cOsc.type = 'sawtooth';
        cOsc.frequency.setValueAtTime(freq, t);
        cOsc.frequency.exponentialRampToValueAtTime(freq * 0.84, t + 0.1);
        cFilter.type = 'bandpass';
        cFilter.frequency.setValueAtTime(1150, t);
        cFilter.Q.setValueAtTime(4.0, t);
        cGain.gain.setValueAtTime(0.16, t);
        cGain.gain.exponentialRampToValueAtTime(0.001, t + 0.11);
        cOsc.connect(cFilter);
        cFilter.connect(cGain);
        cGain.connect(ctx.destination);
        cOsc.start(t);
        cOsc.stop(t + 0.12);
      });
    } catch {
      // silent
    }
  }

  /**
   * 4. HUNTER: Realistic Double-Barrel Metallic Shotgun Pump ("Cạch - Rốp!") + Warning Blast Echo
   */
  public playShotgunCock() {
    if (this.isMuted) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      // Layer A: Two Crisp Metallic Slide Rack Clicks ("Cạch - Rốp!")
      [0, 0.16].forEach((offset, idx) => {
        const noise = ctx.createBufferSource();
        noise.buffer = this.createNoiseBuffer(ctx, 0.12);
        const bandpass = ctx.createBiquadFilter();
        bandpass.type = 'bandpass';
        bandpass.frequency.setValueAtTime(idx === 0 ? 1450 : 1950, now + offset);
        bandpass.Q.setValueAtTime(5.5, now + offset);
        const nGain = ctx.createGain();
        nGain.gain.setValueAtTime(0.35, now + offset);
        nGain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.09);
        noise.connect(bandpass);
        bandpass.connect(nGain);
        nGain.connect(ctx.destination);
        noise.start(now + offset);

        const clack = ctx.createOscillator();
        const cGain = ctx.createGain();
        clack.type = 'square';
        clack.frequency.setValueAtTime(idx === 0 ? 260 : 185, now + offset);
        clack.frequency.exponentialRampToValueAtTime(48, now + offset + 0.09);
        cGain.gain.setValueAtTime(0.28, now + offset);
        cGain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.1);
        clack.connect(cGain);
        cGain.connect(ctx.destination);
        clack.start(now + offset);
        clack.stop(now + offset + 0.11);
      });

      // Layer B: Heavy Shotgun Warning Blast at +0.42s
      const blastNoise = ctx.createBufferSource();
      blastNoise.buffer = this.createNoiseBuffer(ctx, 0.65);
      const blastFilter = ctx.createBiquadFilter();
      blastFilter.type = 'lowpass';
      blastFilter.frequency.setValueAtTime(1600, now + 0.42);
      blastFilter.frequency.exponentialRampToValueAtTime(180, now + 1.0);
      const blastGain = ctx.createGain();
      blastGain.gain.setValueAtTime(0.36, now + 0.42);
      blastGain.gain.exponentialRampToValueAtTime(0.001, now + 1.02);
      blastNoise.connect(blastFilter);
      blastFilter.connect(blastGain);
      blastGain.connect(ctx.destination);
      blastNoise.start(now + 0.42);

      // Sub punch
      const sub = ctx.createOscillator();
      const sGain = ctx.createGain();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(125, now + 0.42);
      sub.frequency.exponentialRampToValueAtTime(28, now + 0.85);
      sGain.gain.setValueAtTime(0.32, now + 0.42);
      sGain.gain.exponentialRampToValueAtTime(0.001, now + 0.88);
      sub.connect(sGain);
      sGain.connect(ctx.destination);
      sub.start(now + 0.42);
      sub.stop(now + 0.9);
    } catch {
      // silent
    }
  }

  /**
   * 5. SEER: Shimmering Crystal Ball Harmonic Resonance + Third-Eye Pulse
   */
  public playMysticChime() {
    if (this.isMuted) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      [523.25, 659.25, 783.99, 987.77, 1174.66, 1567.98].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.075);
        gain.gain.setValueAtTime(0.001, now + idx * 0.075);
        gain.gain.linearRampToValueAtTime(0.12, now + idx * 0.075 + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.075 + 1.55);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.075);
        osc.stop(now + idx * 0.075 + 1.6);
      });
    } catch {
      // silent
    }
  }

  /**
   * 6. BODYGUARD: Heavy Steel Shield & Broadsword Clash + Citadel Horn
   */
  public playShieldClang() {
    if (this.isMuted) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      // Metallic inharmonic ring impact
      [293.66, 440.0, 622.25, 932.33, 1396.91].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = i % 2 === 0 ? 'triangle' : 'square';
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0.18 / (i + 1), now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.9);
      });
    } catch {
      // silent
    }
  }

  /**
   * 7. CUPID: Bowstring Arrow Whoosh ("Vút - Phập!") + Angelic Harp Glissando
   */
  public playCupidHarp() {
    if (this.isMuted) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      // Arrow whoosh
      const whoosh = ctx.createBufferSource();
      whoosh.buffer = this.createNoiseBuffer(ctx, 0.28);
      const wFilter = ctx.createBiquadFilter();
      wFilter.type = 'bandpass';
      wFilter.frequency.setValueAtTime(600, now);
      wFilter.frequency.exponentialRampToValueAtTime(2200, now + 0.18);
      const wGain = ctx.createGain();
      wGain.gain.setValueAtTime(0.22, now);
      wGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      whoosh.connect(wFilter);
      wFilter.connect(wGain);
      wGain.connect(ctx.destination);
      whoosh.start(now);

      // Harp glissando
      const harpNotes = [261.63, 329.63, 392.0, 493.88, 523.25, 659.25, 783.99, 1046.5];
      harpNotes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        const t = now + 0.18 + i * 0.065;
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.001, t);
        gain.gain.linearRampToValueAtTime(0.14, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.95);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 1.0);
      });
    } catch {
      // silent
    }
  }

  /**
   * 8. DOPPELGANGER: Phantom Mirror Dual Reflection
   */
  public playDoppelgangerMirror() {
    if (this.isMuted) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const forward = [329.63, 392.0, 493.88, 659.25];
      const mirror = [659.25, 493.88, 392.0, 329.63];
      forward.forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now + i * 0.09);
        gain.gain.setValueAtTime(0.12, now + i * 0.09);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.09 + 0.45);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.09);
        osc.stop(now + i * 0.09 + 0.48);
      });
      mirror.forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        const t = now + 0.4 + i * 0.09;
        osc.frequency.setValueAtTime(f * 1.01, t);
        gain.gain.setValueAtTime(0.1, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.58);
      });
    } catch {
      // silent
    }
  }

  /**
   * 9. ELDER: Deep Ancient Bronze Temple Gong + Shimmer Wash
   */
  public playElderGong() {
    if (this.isMuted) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      [98.0, 146.83, 196.0, 293.66].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = i === 0 ? 'sawtooth' : 'sine';
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0.22 / (i + 1), now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 2.25);
      });
    } catch {
      // silent
    }
  }

  /**
   * 10. CURSED: Accelerating Blood-Curse Heartbeat + Snarl
   */
  public playCursedHeartbeat() {
    if (this.isMuted) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      [0, 0.16, 0.52, 0.68].forEach((offset, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(i % 2 === 0 ? 78 : 62, now + offset);
        osc.frequency.exponentialRampToValueAtTime(32, now + offset + 0.13);
        gain.gain.setValueAtTime(0.3, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.14);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + offset);
        osc.stop(now + offset + 0.15);
      });
    } catch {
      // silent
    }
  }

  /**
   * 11. TRAITOR: Metallic Dagger Unsheathe ("Xoẹt!") + Sinister Chord
   */
  public playTraitorDagger() {
    if (this.isMuted) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const scrape = ctx.createBufferSource();
      scrape.buffer = this.createNoiseBuffer(ctx, 0.25);
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1800, now);
      filter.frequency.exponentialRampToValueAtTime(4800, now + 0.2);
      filter.Q.setValueAtTime(6.0, now);
      const sGain = ctx.createGain();
      sGain.gain.setValueAtTime(0.24, now);
      sGain.gain.exponentialRampToValueAtTime(0.001, now + 0.23);
      scrape.connect(filter);
      filter.connect(sGain);
      sGain.connect(ctx.destination);
      scrape.start(now);

      [246.94, 293.66, 349.23, 415.3].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        const t = now + 0.15 + i * 0.06;
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.09, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.48);
      });
    } catch {
      // silent
    }
  }

  /**
   * 12. TANNER: Playful Jester Carnival Bells
   */
  public playTannerJester() {
    if (this.isMuted) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 587.33, 783.99, 739.99, 987.77];
      notes.forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        const t = now + i * 0.085;
        osc.frequency.setValueAtTime(f, t);
        gain.gain.setValueAtTime(0.14, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.19);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.21);
      });
    } catch {
      // silent
    }
  }

  public playThrowWhoosh(propType: PropType = 'tomato') {
    if (this.isMuted) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      if (propType === 'rose') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(380, now);
        osc.frequency.exponentialRampToValueAtTime(760, now + 0.35);
      } else {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.exponentialRampToValueAtTime(140, now + 0.35);
      }

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.4);
    } catch {
      // silent
    }
  }

  public playPropSplat(propType: PropType = 'tomato') {
    if (this.isMuted) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      if (propType === 'rose') {
        const danceMelody = [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5];
        danceMelody.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = i % 2 === 0 ? 'triangle' : 'sine';
          const tStart = now + i * 0.085;
          osc.frequency.setValueAtTime(freq, tStart);
          gain.gain.setValueAtTime(0.001, tStart);
          gain.gain.linearRampToValueAtTime(0.15, tStart + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, tStart + 0.25);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(tStart);
          osc.stop(tStart + 0.27);
        });
      } else if (propType === 'egg') {
        [0, 0.06].forEach((tOff, idx) => {
          const crack = ctx.createOscillator();
          const cGain = ctx.createGain();
          crack.type = 'square';
          crack.frequency.setValueAtTime(idx === 0 ? 920 : 640, now + tOff);
          crack.frequency.exponentialRampToValueAtTime(160, now + tOff + 0.07);
          cGain.gain.setValueAtTime(0.22, now + tOff);
          cGain.gain.exponentialRampToValueAtTime(0.001, now + tOff + 0.08);
          crack.connect(cGain);
          cGain.connect(ctx.destination);
          crack.start(now + tOff);
          crack.stop(now + tOff + 0.09);
        });
        this.playAngryCharacterReaction(now + 0.16);
      } else if (propType === 'tomato') {
        const splat = ctx.createOscillator();
        const sGain = ctx.createGain();
        splat.type = 'sawtooth';
        splat.frequency.setValueAtTime(240, now);
        splat.frequency.exponentialRampToValueAtTime(52, now + 0.22);
        sGain.gain.setValueAtTime(0.26, now);
        sGain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
        splat.connect(sGain);
        sGain.connect(ctx.destination);
        splat.start(now);
        splat.stop(now + 0.25);
        this.playAngryCharacterReaction(now + 0.2);
      } else {
        [340, 260, 180, 120].forEach((f, idx) => {
          const splash = ctx.createOscillator();
          const spGain = ctx.createGain();
          splash.type = 'triangle';
          splash.frequency.setValueAtTime(f, now + idx * 0.04);
          spGain.gain.setValueAtTime(0.18, now + idx * 0.04);
          spGain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.18);
          splash.connect(spGain);
          spGain.connect(ctx.destination);
          splash.start(now + idx * 0.04);
          splash.stop(now + idx * 0.04 + 0.2);
        });
        this.playAngryCharacterReaction(now + 0.22);
      }
    } catch {
      // silent
    }
  }

  private playAngryCharacterReaction(startTime: number) {
    const ctx = this.ctx;
    if (!ctx || this.isMuted) return;

    [0, 0.18].forEach((offset, i) => {
      const growl = ctx.createOscillator();
      const gGain = ctx.createGain();
      growl.type = 'sawtooth';
      const baseF = i === 0 ? 155 : 138;
      growl.frequency.setValueAtTime(baseF, startTime + offset);
      growl.frequency.exponentialRampToValueAtTime(85, startTime + offset + 0.14);

      gGain.gain.setValueAtTime(0.18, startTime + offset);
      gGain.gain.exponentialRampToValueAtTime(0.001, startTime + offset + 0.16);

      growl.connect(gGain);
      gGain.connect(ctx.destination);
      growl.start(startTime + offset);
      growl.stop(startTime + offset + 0.17);
    });
  }

  public playGhostWail() {
    if (this.isMuted) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(420, now);
      osc.frequency.exponentialRampToValueAtTime(620, now + 0.4);
      osc.frequency.exponentialRampToValueAtTime(360, now + 1.1);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.11, now + 0.25);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 1.25);
    } catch {
      // silent
    }
  }

  public playNightBell() {
    if (this.isMuted) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      [110, 220, 330].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.15 / (idx + 1), now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.5);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 2.6);
      });
    } catch {
      // silent
    }
  }

  public playDayGong() {
    if (this.isMuted) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      [440, 554.37, 659.25].forEach((f, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, now + idx * 0.08);
        gain.gain.setValueAtTime(0.2 / (idx + 1), now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.45);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.08);
        osc.stop(now + 1.5);
      });
    } catch {
      // silent
    }
  }

  public playGavel() {
    if (this.isMuted) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.15);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.2);
    } catch {
      // silent
    }
  }

  public playCardFlip() {
    if (this.isMuted) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.1);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.12);
    } catch {
      // silent
    }
  }

  public playDeath() {
    if (this.isMuted) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      [311.13, 261.63, 196.0, 155.56].forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now + i * 0.12);

        gain.gain.setValueAtTime(0.001, now + i * 0.12);
        gain.gain.linearRampToValueAtTime(0.14, now + i * 0.12 + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.12 + 1.2);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + i * 0.12);
        osc.stop(now + i * 0.12 + 1.25);
      });
    } catch {
      // silent
    }
  }

  public playVictory() {
    if (this.isMuted) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      [261.63, 329.63, 392.0, 523.25].forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, now + i * 0.1);

        gain.gain.setValueAtTime(0.001, now + i * 0.1);
        gain.gain.linearRampToValueAtTime(0.2, now + i * 0.1 + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 1.4);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + i * 0.1);
        osc.stop(now + i * 0.1 + 1.45);
      });
    } catch {
      // silent
    }
  }
}

export const sound = new SoundEngine();
