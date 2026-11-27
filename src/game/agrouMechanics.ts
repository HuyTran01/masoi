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
    },
    subtitle: {
      vi: 'Rừng cổ thụ mờ sương, lều vải & ánh lửa ấm áp quanh lửa trại',
      en: 'Towering misty redwoods, canvas expedition tents & glowing campfire',
    },
    daySky: 0xaab8a2,
    nightSky: 0x0e1828,
    blindNightSky: 0x050810,
    dayHemiSky: 0xffe8c2,
    dayHemiGround: 0x3b4d24,
    nightHemiSky: 0x5274a6,
    nightHemiGround: 0x162119,
    daySunColor: 0xffdea3,
    nightMoonLight: 0x99c4f8,
    groundDay: 0x456b26,
    groundNight: 0x20381e,
    clearingDirt: 0x7d5837,
    foliagePrimary: 0x2a4f25,
    foliageSecondary: 0x3e6f2c,
    foliageAccent: 0x679935,
    rockColor: 0x6f7574,
    mountainColor: 0x384d3b,
    mountainSnowCap: 0xd2dfd6,
    roofColor: 0xe6dcc8,
    wallColor: 0x454a4d,
    ambientParticleColor: 0xffd56b,
  },
  frostpeak: {
    id: 'frostpeak',
    icon: '🏔️',
    name: {
      vi: 'Đỉnh Tuyết Trắng',
      en: 'Frostpeak Camp',
    },
    subtitle: {
      vi: 'Tuyết rơi lấp lánh, lều thám hiểm phủ băng & rừng thông tuyết',
      en: 'Drifting snow, frosted expedition tents & alpine pines',
    },
    daySky: 0x9ebcd2,
    nightSky: 0x111f36,
    blindNightSky: 0x060b16,
    dayHemiSky: 0xc5dbee,
    dayHemiGround: 0x5d778f,
    nightHemiSky: 0x6e9ad0,
    nightHemiGround: 0x23354c,
    daySunColor: 0xf7e6cb,
    nightMoonLight: 0xb4dcfa,
    groundDay: 0xb8cbd9,
    groundNight: 0x546b85,
    clearingDirt: 0x8a7967,
    foliagePrimary: 0x2a504b,
    foliageSecondary: 0xb4cadb,
    foliageAccent: 0x456f68,
    rockColor: 0x6c7a88,
    mountainColor: 0x4b6176,
    mountainSnowCap: 0xcfdde8,
    roofColor: 0xc4d0da,
    wallColor: 0x46596c,
    ambientParticleColor: 0xdcebf7,
  },
  autumn: {
    id: 'autumn',
    icon: '🌿',
    name: {
      vi: 'Thảo Nguyên Ven Suối',
      en: 'Riverside Meadow',
    },
    subtitle: {
      vi: 'Đồi cỏ xanh mướt, suối trong, đại thụ cổ & đom đóm bay lấp lánh',
      en: 'Rolling emerald hills, sparkling river, ancient oaks & golden fireflies',
    },
    daySky: 0xd8d2ae,
    nightSky: 0x111f38,
    blindNightSky: 0x060b16,
    dayHemiSky: 0xffecc4,
    dayHemiGround: 0x4a6624,
    nightHemiSky: 0x5b82b8,
    nightHemiGround: 0x1a2c1c,
    daySunColor: 0xffe29e,
    nightMoonLight: 0xa2caf8,
    groundDay: 0x4b7424,
    groundNight: 0x234222,
    clearingDirt: 0x865d38,
    foliagePrimary: 0x365c20,
    foliageSecondary: 0x56822b,
    foliageAccent: 0x7ba63a,
    rockColor: 0x7d8078,
    mountainColor: 0x4e7030,
    mountainSnowCap: 0x7da145,
    roofColor: 0xdfd2b4,
    wallColor: 0x624e3b,
    ambientParticleColor: 0xffe885,
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
    label: { vi: 'Tóc Gọn', en: 'Bare Head',},
  },
  {
    id: 'witch',
    icon: '🧙',
    label: { vi: 'Mũ Phù Thủy', en: 'Witch Hat',},
  },
  {
    id: 'knight',
    icon: '⛑️',
    label: { vi: 'Mũ Hiệp Sĩ', en: 'Knight Helm',},
  },
  {
    id: 'straw',
    icon: '👒',
    label: { vi: 'Mũ Rơm Làng', en: 'Village Straw',},
  },
  {
    id: 'antlers',
    icon: '🦌',
    label: { vi: 'Sừng Hươu Rừng', en: 'Forest Antlers',},
  },
  {
    id: 'pirate',
    icon: '🏴‍☠️',
    label: { vi: 'Mũ Thuyền Trưởng', en: 'Captain Hat',},
  },
  {
    id: 'crown',
    icon: '👑',
    label: { vi: 'Vương Miện Vàng', en: 'Royal Crown',},
  },
];

export interface AgrouCloakOption {
  id: string;
  hex: number;
  cssHex: string;
  label: Record<Language, string>;
}

export const AGROU_CLOAK_COLORS: AgrouCloakOption[] = [
  { id: 'crimson', hex: 0xc83737, cssHex: '#c83737', label: { vi: 'Đỏ Rượu Vang', en: 'Tavern Crimson',} },
  { id: 'forest', hex: 0x2f7d4d, cssHex: '#2f7d4d', label: { vi: 'Xanh Rừng Già', en: 'Forest Ranger',} },
  { id: 'cobalt', hex: 0x2d68a8, cssHex: '#2d68a8', label: { vi: 'Lam Hiệp Sĩ', en: 'Royal Cobalt',} },
  { id: 'ochre', hex: 0xd48324, cssHex: '#d48324', label: { vi: 'Vàng Lửa Trại', en: 'Ember Ochre',} },
  { id: 'plum', hex: 0x7b3fa0, cssHex: '#7b3fa0', label: { vi: 'Tím Huyền Bí', en: 'Mystic Plum',} },
  { id: 'teal', hex: 0x1d8a8a, cssHex: '#1d8a8a', label: { vi: 'Ngọc Bích', en: 'Deep Teal',} },
  { id: 'berry', hex: 0xb83b70, cssHex: '#b83b70', label: { vi: 'Hồng Lựu', en: 'Berry Cloak',} },
  { id: 'charcoal', hex: 0x454f5e, cssHex: '#454f5e', label: { vi: 'Xám Thợ Săn', en: 'Hunter Slate',} },
];

export interface AgrouTitleOption {
  id: string;
  label: Record<Language, string>;
}

export const AGROU_TITLES: AgrouTitleOption[] = [
  { id: 'campfire_sleuth', label: { vi: 'Thám Tử Lửa Trại', en: 'Campfire Sleuth',} },
  { id: 'wolf_bane', label: { vi: 'Khắc Tinh Bầy Sói', en: 'Wolf Bane',} },
  { id: 'silver_tongue', label: { vi: 'Bậc Thầy Thuyết Phục', en: 'Silver Tongue',} },
  { id: 'midnight_shadow', label: { vi: 'Bóng Ma Nửa Đêm', en: 'Midnight Shadow',} },
  { id: 'village_keeper', label: { vi: 'Người Giữ Lửa Làng', en: 'Village Keeper',} },
  { id: 'mayor_charm', label: { vi: 'Thị Trưởng Tài Ba', en: 'Grand Mayor',} },
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
    label: { vi: 'Vẫy Chào', en: 'Wave',},
    bubble: { vi: '👋 Xin chào cả làng!', en: '👋 Hello village!',},
  },
  {
    id: 'accuse',
    icon: '👉',
    label: { vi: 'Chỉ Mặt Nghi Vấn', en: 'Accuse',},
    bubble: { vi: '👉 Rất đáng nghi!', en: '👉 Looking sus!',},
  },
  {
    id: 'clap',
    icon: '👏',
    label: { vi: 'Vỗ Tay Tán Thưởng', en: 'Applaud',},
    bubble: { vi: '👏 Suy luận hay lắm!', en: '👏 Great deduction!',},
  },
  {
    id: 'laugh',
    icon: '😂',
    label: { vi: 'Cười Lớn', en: 'Laugh',},
    bubble: { vi: '😂 Hahaha không phải tôi!', en: '😂 Haha not me!',},
  },
  {
    id: 'panic',
    icon: '😱',
    label: { vi: 'Hoảng Hốt', en: 'Panic',},
    bubble: { vi: '😱 Khoan đã nghe tôi nói!', en: '😱 Wait hear me out!',},
  },
  {
    id: 'dance',
    icon: '💃',
    label: { vi: 'Nhảy Mừng Lửa Trại', en: 'Campfire Dance',},
    bubble: { vi: '💃 Quẩy quanh lửa trại!', en: '💃 Campfire groove!',},
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
