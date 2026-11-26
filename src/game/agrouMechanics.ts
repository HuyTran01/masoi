import { Language, Player, RoleId, VoteRecord } from '../types/game';

export type AgrouMapBiome = 'forest' | 'frostpeak' | 'autumn';

export type AgrouHatId =
  | 'none'
  | 'witch'
  | 'crown'
  | 'knight'
  | 'straw'
  | 'antlers'
  | 'pirate';

export type AgrouEmoteId =
  | 'wave'
  | 'accuse'
  | 'clap'
  | 'laugh'
  | 'panic'
  | 'dance';

export interface AgrouAvatarConfig {
  hat: AgrouHatId;
  cloakColor: number;
  titleId: string;
  mapBiome: AgrouMapBiome;
}

export interface AgrouEmoteEvent {
  id: string;
  playerId: string;
  emote: AgrouEmoteId;
  timestamp: number;
}

export const CAMPFIRE_ABSTAIN_ID = '__CAMPFIRE_ABSTAIN__';

export interface AgrouBiomePalette {
  id: AgrouMapBiome;
  icon: string;
  name: Record<Language, string>;
  subtitle: Record<Language, string>;
  daySky: number;
  nightSky: number;
  blindNightSky: number;
  dayHemiSky: number;
  dayHemiGround: number;
  nightHemiSky: number;
  nightHemiGround: number;
  daySunColor: number;
  nightMoonLight: number;
  groundDay: number;
  groundNight: number;
  clearingDirt: number;
  foliagePrimary: number;
  foliageSecondary: number;
  foliageAccent: number;
  rockColor: number;
  mountainColor: number;
  mountainSnowCap: number;
  roofColor: number;
  wallColor: number;
  ambientParticleColor: number;
}

export const AGROU_BIOMES: Record<AgrouMapBiome, AgrouBiomePalette> = {
  forest: {
    id: 'forest',
    icon: '🌲',
    name: {
      vi: 'Trại Rừng Cổ Thụ',
      en: 'Redwood Camp',
      fr: 'Camp des Séquoias',
      es: 'Campamento del Bosque',
      ja: '巨木の森キャンプ',
    },
    subtitle: {
      vi: 'Rừng cổ thụ mờ sương, lều vải & ánh lửa ấm áp quanh lửa trại',
      en: 'Towering misty redwoods, canvas expedition tents & glowing campfire',
      fr: 'Séquoias brumeux, tentes d’expédition et feu de camp ardent',
      es: 'Secuoyas brumosas, tiendas de lona y cálida fogata',
      ja: '霧の巨木林、キャンバス製テントと温かな焚き火',
    },
    daySky: 0x3b4d5e,
    nightSky: 0x101826,
    blindNightSky: 0x050810,
    dayHemiSky: 0x9fc2dc,
    dayHemiGround: 0x3f5432,
    nightHemiSky: 0x4b6a94,
    nightHemiGround: 0x161f18,
    daySunColor: 0xffe8c2,
    nightMoonLight: 0x8fb8f0,
    groundDay: 0x4c7c31,
    groundNight: 0x243b22,
    clearingDirt: 0xd9c69a,
    foliagePrimary: 0x274d32,
    foliageSecondary: 0x386b3a,
    foliageAccent: 0x5c9636,
    rockColor: 0x626b73,
    mountainColor: 0x2f3e4d,
    mountainSnowCap: 0xcbd8e6,
    roofColor: 0xd8d3c4,
    wallColor: 0x3b434d,
    ambientParticleColor: 0xffd166,
  },
  frostpeak: {
    id: 'frostpeak',
    icon: '🏔️',
    name: {
      vi: 'Đỉnh Tuyết Trắng',
      en: 'Frostpeak Camp',
      fr: 'Sommet Enneigé',
      es: 'Campamento Nevado',
      ja: '白銀の雪山キャンプ',
    },
    subtitle: {
      vi: 'Tuyết rơi lấp lánh, lều thám hiểm phủ băng & rừng thông tuyết',
      en: 'Drifting snow, frosted expedition tents & alpine pines',
      fr: 'Neige tombante, tentes givrées et sapins alpins',
      es: 'Nieve brillante, tiendas heladas y pinos alpinos',
      ja: '舞う雪、雪化粧のテントと針葉樹林',
    },
    daySky: 0x8cb8d8,
    nightSky: 0x121e33,
    blindNightSky: 0x060b16,
    dayHemiSky: 0xdff2ff,
    dayHemiGround: 0x89a4bd,
    nightHemiSky: 0x6e98cc,
    nightHemiGround: 0x23344a,
    daySunColor: 0xfff5e4,
    nightMoonLight: 0xb0d8f8,
    groundDay: 0xd7e6f2,
    groundNight: 0x5d748f,
    clearingDirt: 0xbcb6ac,
    foliagePrimary: 0x2c5652,
    foliageSecondary: 0xd5e8f5,
    foliageAccent: 0x47736e,
    rockColor: 0x6f8194,
    mountainColor: 0x4b637a,
    mountainSnowCap: 0xf1f7fc,
    roofColor: 0xe6eff5,
    wallColor: 0x4a5f75,
    ambientParticleColor: 0xf0f9ff,
  },
  autumn: {
    id: 'autumn',
    icon: '🌿',
    name: {
      vi: 'Thảo Nguyên Ven Suối',
      en: 'Riverside Meadow',
      fr: 'Prairie de la Rivière',
      es: 'Pradera del Río',
      ja: '川辺の大草原',
    },
    subtitle: {
      vi: 'Đồi cỏ xanh mướt, suối trong, đại thụ cổ & đom đóm bay lấp lánh',
      en: 'Rolling emerald hills, sparkling river, ancient oaks & golden fireflies',
      fr: 'Collines verdoyantes, rivière bleue, chênes géants et lucioles',
      es: 'Colinas verdes, río azul, robles antiguos y luciérnagas doradas',
      ja: '緑の丘、清流、巨大な古木と黄金の蛍',
    },
    daySky: 0x5b8ec4,
    nightSky: 0x142038,
    blindNightSky: 0x060b16,
    dayHemiSky: 0xcce6ff,
    dayHemiGround: 0x4e7535,
    nightHemiSky: 0x587cb0,
    nightHemiGround: 0x1a2b1c,
    daySunColor: 0xfff1cc,
    nightMoonLight: 0x9cc4f5,
    groundDay: 0x548a32,
    groundNight: 0x284726,
    clearingDirt: 0xdecb9c,
    foliagePrimary: 0x3b6e2f,
    foliageSecondary: 0x578c3a,
    foliageAccent: 0x73a844,
    rockColor: 0x767d82,
    mountainColor: 0x466b38,
    mountainSnowCap: 0x6d9949,
    roofColor: 0xd4c7a9,
    wallColor: 0x5e4d3e,
    ambientParticleColor: 0xffe47a,
  },
};

export interface AgrouHatOption {
  id: AgrouHatId;
  icon: string;
  label: Record<Language, string>;
}

export const AGROU_HATS: AgrouHatOption[] = [
  {
    id: 'none',
    icon: '🧑',
    label: { vi: 'Tóc Gọn', en: 'Bare Head', fr: 'Sans Chapeau', es: 'Sin Sombrero', ja: '帽子なし' },
  },
  {
    id: 'witch',
    icon: '🧙',
    label: { vi: 'Mũ Phù Thủy', en: 'Witch Hat', fr: 'Chapeau Sorcière', es: 'Sombrero Bruja', ja: '魔女の帽子' },
  },
  {
    id: 'knight',
    icon: '⛑️',
    label: { vi: 'Mũ Hiệp Sĩ', en: 'Knight Helm', fr: 'Heaume', es: 'Yelmo', ja: '騎士の兜' },
  },
  {
    id: 'straw',
    icon: '👒',
    label: { vi: 'Mũ Rơm Làng', en: 'Village Straw', fr: 'Chapeau Paille', es: 'Sombrero Paja', ja: '麦わら帽子' },
  },
  {
    id: 'antlers',
    icon: '🦌',
    label: { vi: 'Sừng Hươu Rừng', en: 'Forest Antlers', fr: 'Bois de Cerf', es: 'Astas del Bosque', ja: '森の鹿角' },
  },
  {
    id: 'pirate',
    icon: '🏴‍☠️',
    label: { vi: 'Mũ Thuyền Trưởng', en: 'Captain Hat', fr: 'Tricorne', es: 'Tricornio', ja: '船長の帽子' },
  },
  {
    id: 'crown',
    icon: '👑',
    label: { vi: 'Vương Miện Vàng', en: 'Royal Crown', fr: 'Couronne', es: 'Corona Real', ja: '黄金の王冠' },
  },
];

export interface AgrouCloakOption {
  id: string;
  hex: number;
  cssHex: string;
  label: Record<Language, string>;
}

export const AGROU_CLOAK_COLORS: AgrouCloakOption[] = [
  { id: 'crimson', hex: 0xc83737, cssHex: '#c83737', label: { vi: 'Đỏ Rượu Vang', en: 'Tavern Crimson', fr: 'Cramoisi', es: 'Carmesí', ja: '深紅' } },
  { id: 'forest', hex: 0x2f7d4d, cssHex: '#2f7d4d', label: { vi: 'Xanh Rừng Già', en: 'Forest Ranger', fr: 'Vert Forêt', es: 'Verde Bosque', ja: '森緑' } },
  { id: 'cobalt', hex: 0x2d68a8, cssHex: '#2d68a8', label: { vi: 'Lam Hiệp Sĩ', en: 'Royal Cobalt', fr: 'Bleu Royal', es: 'Azul Real', ja: '騎士青' } },
  { id: 'ochre', hex: 0xd48324, cssHex: '#d48324', label: { vi: 'Vàng Lửa Trại', en: 'Ember Ochre', fr: 'Ocre Doré', es: 'Ocre Dorado', ja: '焚火琥珀' } },
  { id: 'plum', hex: 0x7b3fa0, cssHex: '#7b3fa0', label: { vi: 'Tím Huyền Bí', en: 'Mystic Plum', fr: 'Prune Mystique', es: 'Ciruela Mística', ja: '神秘紫' } },
  { id: 'teal', hex: 0x1d8a8a, cssHex: '#1d8a8a', label: { vi: 'Ngọc Bích', en: 'Deep Teal', fr: 'Sarcelle', es: 'Turquesa', ja: '深緑青' } },
  { id: 'berry', hex: 0xb83b70, cssHex: '#b83b70', label: { vi: 'Hồng Lựu', en: 'Berry Cloak', fr: 'Baie', es: 'Frambuesa', ja: '茜色' } },
  { id: 'charcoal', hex: 0x454f5e, cssHex: '#454f5e', label: { vi: 'Xám Thợ Săn', en: 'Hunter Slate', fr: 'Ardoise', es: 'Pizarra', ja: '狩人灰' } },
];

export interface AgrouTitleOption {
  id: string;
  label: Record<Language, string>;
}

export const AGROU_TITLES: AgrouTitleOption[] = [
  { id: 'campfire_sleuth', label: { vi: 'Thám Tử Lửa Trại', en: 'Campfire Sleuth', fr: 'Détective du Feu', es: 'Detective de la Hoguera', ja: '焚き火の探偵' } },
  { id: 'wolf_bane', label: { vi: 'Khắc Tinh Bầy Sói', en: 'Wolf Bane', fr: 'Fléau des Loups', es: 'Azote de Lobos', ja: '人狼狩り' } },
  { id: 'silver_tongue', label: { vi: 'Bậc Thầy Thuyết Phục', en: 'Silver Tongue', fr: 'Beaux Parleurs', es: 'Lengua de Plata', ja: '議論の達人' } },
  { id: 'midnight_shadow', label: { vi: 'Bóng Ma Nửa Đêm', en: 'Midnight Shadow', fr: 'Ombre de Minuit', es: 'Sombra Nocturna', ja: '真夜中の影' } },
  { id: 'village_keeper', label: { vi: 'Người Giữ Lửa Làng', en: 'Village Keeper', fr: 'Gardien du Village', es: 'Guardián del Pueblo', ja: '村の守り手' } },
  { id: 'mayor_charm', label: { vi: 'Thị Trưởng Tài Ba', en: 'Grand Mayor', fr: 'Grand Maire', es: 'Gran Alcalde', ja: '名村長' } },
];

export interface AgrouEmoteOption {
  id: AgrouEmoteId;
  icon: string;
  label: Record<Language, string>;
  bubble: Record<Language, string>;
}

export const AGROU_EMOTES: AgrouEmoteOption[] = [
  {
    id: 'wave',
    icon: '👋',
    label: { vi: 'Vẫy Chào', en: 'Wave', fr: 'Saluer', es: 'Saludar', ja: '手を振る' },
    bubble: { vi: '👋 Xin chào cả làng!', en: '👋 Hello village!', fr: '👋 Salut !', es: '👋 ¡Hola!', ja: '👋 よろしく！' },
  },
  {
    id: 'accuse',
    icon: '👉',
    label: { vi: 'Chỉ Mặt Nghi Vấn', en: 'Accuse', fr: 'Accuser', es: 'Acusar', ja: '告発する' },
    bubble: { vi: '👉 Rất đáng nghi!', en: '👉 Looking sus!', fr: '👉 Très suspect !', es: '👉 ¡Muy sospechoso!', ja: '👉 怪しいぞ！' },
  },
  {
    id: 'clap',
    icon: '👏',
    label: { vi: 'Vỗ Tay Tán Thưởng', en: 'Applaud', fr: 'Applaudir', es: 'Aplaudir', ja: '拍手' },
    bubble: { vi: '👏 Suy luận hay lắm!', en: '👏 Great deduction!', fr: '👏 Bien joué !', es: '👏 ¡Bien dicho!', ja: '👏 名推理！' },
  },
  {
    id: 'laugh',
    icon: '😂',
    label: { vi: 'Cười Lớn', en: 'Laugh', fr: 'Rire', es: 'Reír', ja: '笑う' },
    bubble: { vi: '😂 Hahaha không phải tôi!', en: '😂 Haha not me!', fr: '😂 Haha pas moi !', es: '😂 ¡Jaja yo no fui!', ja: '😂 違うってば！' },
  },
  {
    id: 'panic',
    icon: '😱',
    label: { vi: 'Hoảng Hốt', en: 'Panic', fr: 'Panique', es: 'Pánico', ja: '焦る' },
    bubble: { vi: '😱 Khoan đã nghe tôi nói!', en: '😱 Wait hear me out!', fr: '😱 Attendez !', es: '😱 ¡Esperen!', ja: '😱 待って聞いて！' },
  },
  {
    id: 'dance',
    icon: '💃',
    label: { vi: 'Nhảy Mừng Lửa Trại', en: 'Campfire Dance', fr: 'Danse du Feu', es: 'Baile', ja: 'ダンス' },
    bubble: { vi: '💃 Quẩy quanh lửa trại!', en: '💃 Campfire groove!', fr: '💃 On danse !', es: '💃 ¡A bailar!', ja: '💃 焚き火ダンス！' },
  },
];

export const DEFAULT_AGROU_AVATAR: AgrouAvatarConfig = {
  hat: 'witch',
  cloakColor: AGROU_CLOAK_COLORS[0].hex,
  titleId: 'campfire_sleuth',
  mapBiome: 'forest',
};

const STORAGE_KEY = 'werewolf_agrou_avatar_v1';
const AVATAR_SCHEMA_VERSION = 2;

export function migrateAgrouAvatarPayload(rawParsed: unknown): AgrouAvatarConfig {
  if (!rawParsed || typeof rawParsed !== 'object') {
    return { ...DEFAULT_AGROU_AVATAR };
  }
  const parsed = rawParsed as Record<string, unknown>;
  const validHat = AGROU_HATS.some((h) => h.id === parsed.hat)
    ? (parsed.hat as AgrouHatId)
    : DEFAULT_AGROU_AVATAR.hat;

  let normalizedColor: number | null = null;
  if (typeof parsed.cloakColor === 'number' && Number.isFinite(parsed.cloakColor)) {
    normalizedColor = parsed.cloakColor;
  } else if (typeof parsed.cloakColor === 'string') {
    const cleanHex = parsed.cloakColor.replace(/^#/, '');
    const asInt = parseInt(cleanHex, 16);
    if (!Number.isNaN(asInt)) normalizedColor = asInt;
  }
  const validColor =
    normalizedColor !== null && AGROU_CLOAK_COLORS.some((c) => c.hex === normalizedColor)
      ? normalizedColor
      : DEFAULT_AGROU_AVATAR.cloakColor;

  const validTitle = AGROU_TITLES.some((t) => t.id === parsed.titleId)
    ? String(parsed.titleId)
    : DEFAULT_AGROU_AVATAR.titleId;

  const legacyBiomeMap: Record<string, AgrouMapBiome> = {
    forest: 'forest',
    redwood: 'forest',
    frostpeak: 'frostpeak',
    snow: 'frostpeak',
    winter: 'frostpeak',
    autumn: 'autumn',
    meadow: 'autumn',
    river: 'autumn',
  };
  const biomeKey = typeof parsed.mapBiome === 'string' ? parsed.mapBiome.toLowerCase() : '';
  const validBiome: AgrouMapBiome = legacyBiomeMap[biomeKey] || DEFAULT_AGROU_AVATAR.mapBiome;

  return {
    hat: validHat,
    cloakColor: validColor,
    titleId: validTitle,
    mapBiome: validBiome,
  };
}

export function loadAgrouAvatarConfig(): AgrouAvatarConfig {
  try {
    if (typeof localStorage === 'undefined') return { ...DEFAULT_AGROU_AVATAR };
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_AGROU_AVATAR };
    const parsed = JSON.parse(raw);
    const migrated = migrateAgrouAvatarPayload(parsed);
    if (!parsed || typeof parsed !== 'object' || parsed._v !== AVATAR_SCHEMA_VERSION) {
      saveAgrouAvatarConfig(migrated);
    }
    return migrated;
  } catch {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    return { ...DEFAULT_AGROU_AVATAR };
  }
}

export function saveAgrouAvatarConfig(cfg: AgrouAvatarConfig): void {
  try {
    if (typeof localStorage === 'undefined') return;
    const safeCfg = migrateAgrouAvatarPayload(cfg);
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...safeCfg, _v: AVATAR_SCHEMA_VERSION })
    );
  } catch {
    // ignore storage quota errors
  }
}

/**
 * Assigns varied low-poly medieval hats & warm cloak colors to bot players so every campfire circle looks lively like Agrou.
 */
export function getBotCosmetics(seatIndex: number): { hat: AgrouHatId; cloakColor: number } {
  const botHatPool: AgrouHatId[] = ['straw', 'knight', 'witch', 'antlers', 'pirate', 'none'];
  return {
    hat: botHatPool[seatIndex % botHatPool.length],
    cloakColor: AGROU_CLOAK_COLORS[(seatIndex + 1) % AGROU_CLOAK_COLORS.length].hex,
  };
}

// ============================================================================
// AGROU MAYOR (THỊ TRƯỞNG) & CAMPFIRE ABSTENTION VOTING ENGINE
// ============================================================================

export function electMayorForVillage(
  players: Player[],
  preferredCandidateId?: string | null
): string | null {
  const alive = players.filter((p) => p.isAlive);
  if (alive.length === 0) return null;
  if (preferredCandidateId && alive.some((p) => p.id === preferredCandidateId)) {
    return preferredCandidateId;
  }
  return alive[0].id;
}

export function resolveNextMayorIfNeeded(
  players: Player[],
  currentMayorId: string | null
): { nextMayorId: string | null; transferredFromName?: string; transferredToName?: string } {
  const alive = players.filter((p) => p.isAlive);
  if (alive.length === 0) return { nextMayorId: null };

  if (currentMayorId && alive.some((p) => p.id === currentMayorId)) {
    return { nextMayorId: currentMayorId };
  }

  const deadMayor = currentMayorId ? players.find((p) => p.id === currentMayorId) : null;
  const successor = alive[0];
  return {
    nextMayorId: successor.id,
    transferredFromName: deadMayor?.name,
    transferredToName: successor.name,
  };
}

export interface MayorWeightedVoteResult {
  targetId: string | null;
  isTie: boolean;
  counts: Record<string, number>;
  abstainCount: number;
  abstainerIds: string[];
  mayorVoteTargetId: string | null;
}

/**
 * Agrou-style Day Voting Tally:
 * - Each voter's latest vote counts (deduplicated).
 * - Votes cast into the Central Campfire (CAMPFIRE_ABSTAIN_ID) are tracked as explicit Abstentions and NEVER execute anyone.
 * - The living Mayor's vote carries weight 2 (breaking 1-vote ties automatically, just like Agrou!).
 */
export function tallyVotesWithMayor(
  votes: VoteRecord[],
  mayorId: string | null
): MayorWeightedVoteResult {
  const latestVoteByVoter = new Map<string, string>();
  for (const v of votes) {
    if (!v.voterId || !v.targetId) continue;
    latestVoteByVoter.set(v.voterId, v.targetId);
  }

  const counts: Record<string, number> = {};
  const abstainerIds: string[] = [];
  let abstainCount = 0;
  let mayorVoteTargetId: string | null = null;

  for (const [voterId, targetId] of latestVoteByVoter.entries()) {
    const weight = mayorId && voterId === mayorId ? 2 : 1;
    if (voterId === mayorId) {
      mayorVoteTargetId = targetId;
    }
    if (targetId === CAMPFIRE_ABSTAIN_ID) {
      abstainCount += weight;
      abstainerIds.push(voterId);
      continue;
    }
    counts[targetId] = (counts[targetId] || 0) + weight;
  }

  let maxVotes = 0;
  let candidates: string[] = [];
  for (const [id, count] of Object.entries(counts)) {
    if (count > maxVotes) {
      maxVotes = count;
      candidates = [id];
    } else if (count === maxVotes) {
      candidates.push(id);
    }
  }

  if (
    maxVotes === 0 ||
    candidates.length === 0 ||
    (abstainCount > 0 && abstainCount >= maxVotes)
  ) {
    return {
      targetId: null,
      isTie: false,
      counts,
      abstainCount,
      abstainerIds,
      mayorVoteTargetId,
    };
  }

  if (candidates.length > 1) {
    return {
      targetId: null,
      isTie: true,
      counts,
      abstainCount,
      abstainerIds,
      mayorVoteTargetId,
    };
  }

  return {
    targetId: candidates[0],
    isTie: false,
    counts,
    abstainCount,
    abstainerIds,
    mayorVoteTargetId,
  };
}

// ============================================================================
// AGROU INTERACTIVE DEDUCTION NOTEBOOK ENGINE
// ============================================================================

export type DeductionTrustLevel = 'unknown' | 'trusted' | 'suspicious' | 'wolf_lock';

export interface PlayerNotebookNote {
  guessedRole: RoleId | 'unknown';
  trust: DeductionTrustLevel;
  memo: string;
}

export interface NotebookTimelineEvent {
  id: string;
  round: number;
  phaseLabel: string;
  text: string;
  tone: 'info' | 'death' | 'clue' | 'mayor';
}

export interface AgrouNotebookState {
  playerNotes: Record<string, PlayerNotebookNote>;
  freeText: string;
  timeline: NotebookTimelineEvent[];
}

export function createInitialNotebook(): AgrouNotebookState {
  return {
    playerNotes: {},
    freeText: '',
    timeline: [],
  };
}

export function updateNotebookPlayerEntry(
  state: AgrouNotebookState,
  playerId: string,
  patch: Partial<PlayerNotebookNote>
): AgrouNotebookState {
  const prev = state.playerNotes[playerId] || {
    guessedRole: 'unknown',
    trust: 'unknown',
    memo: '',
  };
  return {
    ...state,
    playerNotes: {
      ...state.playerNotes,
      [playerId]: { ...prev, ...patch },
    },
  };
}

export function appendNotebookTimelineEvent(
  state: AgrouNotebookState,
  event: Omit<NotebookTimelineEvent, 'id'>
): AgrouNotebookState {
  const id = `nb_${state.timeline.length + 1}_${event.round}_${event.tone}`;
  return {
    ...state,
    timeline: [...state.timeline.slice(-24), { ...event, id }],
  };
}

export function formatNotebookShareSummary(
  state: AgrouNotebookState,
  players: Player[],
  lang: Language
): string {
  const suspects: string[] = [];
  const trusted: string[] = [];

  players.forEach((p, idx) => {
    const entry = state.playerNotes[p.id];
    if (!entry) return;
    const tag = `#${idx + 1} ${p.name}`;
    if (entry.trust === 'wolf_lock' || entry.trust === 'suspicious') {
      suspects.push(entry.trust === 'wolf_lock' ? `${tag} (🐺!)` : `${tag} (?)`);
    } else if (entry.trust === 'trusted') {
      trusted.push(tag);
    }
  });

  const parts: string[] = [];
  if (suspects.length > 0) {
    parts.push(
      lang === 'vi'
        ? `Nghi Sói: ${suspects.join(', ')}`
        : `Suspects: ${suspects.join(', ')}`
    );
  }
  if (trusted.length > 0) {
    parts.push(
      lang === 'vi'
        ? `Tin tưởng: ${trusted.join(', ')}`
        : `Trusted: ${trusted.join(', ')}`
    );
  }
  if (state.freeText.trim()) {
    parts.push(state.freeText.trim().slice(0, 90));
  }

  if (parts.length === 0) {
    return lang === 'vi'
      ? '📒 Sổ tay: Mình đang quan sát thêm manh mối quanh lửa trại!'
      : '📒 Notebook: Still observing clues around the campfire!';
  }

  return `📒 ${parts.join(' · ')}`;
}
