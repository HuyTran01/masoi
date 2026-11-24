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
      vi: 'Rừng Lửa Trại',
      en: 'Whispering Forest',
      fr: 'Forêt du Campement',
      es: 'Bosque del Campamento',
      ja: 'ささやきの森',
    },
    subtitle: {
      vi: 'Bãi cỏ xanh, thông rậm & ánh lửa ấm áp chuẩn Agrou',
      en: 'Verdant clearing, layered pines & warm campfire glow',
      fr: 'Clairière verdoyante, sapins et feu de camp chaleureux',
      es: 'Claro verde, pinos y cálida fogata medieval',
      ja: '緑の広場、モミの木と温かな焚き火',
    },
    daySky: 0x74b9e7,
    nightSky: 0x111a2e,
    blindNightSky: 0x060a14,
    dayHemiSky: 0xdff2ff,
    dayHemiGround: 0x4b6b3c,
    nightHemiSky: 0x5c7db8,
    nightHemiGround: 0x1a221d,
    daySunColor: 0xfff1cc,
    nightMoonLight: 0x9ec5fe,
    groundDay: 0x46783d,
    groundNight: 0x26422c,
    clearingDirt: 0x8a6544,
    foliagePrimary: 0x2d6a3e,
    foliageSecondary: 0x3a8249,
    foliageAccent: 0x4e9453,
    rockColor: 0x7c858e,
    mountainColor: 0x3b4d5e,
    mountainSnowCap: 0xdce6f2,
    roofColor: 0x9b3d2b,
    wallColor: 0xd8c3a5,
    ambientParticleColor: 0xfde047,
  },
  frostpeak: {
    id: 'frostpeak',
    icon: '🏔️',
    name: {
      vi: 'Đỉnh Tuyết Trắng',
      en: 'Frostpeak Camp',
      fr: 'Sommet Enneigé',
      es: 'Campamento Nevado',
      ja: '白銀の雪山',
    },
    subtitle: {
      vi: 'Tuyết rơi lấp lánh, thông phủ băng & nhà gỗ Bắc Âu',
      en: 'Drifting snow, frosted pines & alpine timber lodges',
      fr: 'Neige tombante, sapins givrés et chalets alpins',
      es: 'Nieve brillante, pinos helados y cabañas alpinas',
      ja: '舞う雪、雪化粧のモミの木と山小屋',
    },
    daySky: 0xa7d5f2,
    nightSky: 0x132038,
    blindNightSky: 0x070d1a,
    dayHemiSky: 0xebf8ff,
    dayHemiGround: 0x9ab5cc,
    nightHemiSky: 0x7ba4d9,
    nightHemiGround: 0x283a52,
    daySunColor: 0xfff6e5,
    nightMoonLight: 0xbae6fd,
    groundDay: 0xd9e8f5,
    groundNight: 0x6b829c,
    clearingDirt: 0x7a695c,
    foliagePrimary: 0x2f6058,
    foliageSecondary: 0xcbe3f0,
    foliageAccent: 0x487a70,
    rockColor: 0x708399,
    mountainColor: 0x526b85,
    mountainSnowCap: 0xf1f7fc,
    roofColor: 0x3b5978,
    wallColor: 0x9e7452,
    ambientParticleColor: 0xf0f9ff,
  },
  autumn: {
    id: 'autumn',
    icon: '🎃',
    name: {
      vi: 'Thung Lũng Hoàng Hôn',
      en: 'Autumn Hollow',
      fr: 'Vallée d’Automne',
      es: 'Valle de Otoño',
      ja: '黄昏の紅葉谷',
    },
    subtitle: {
      vi: 'Lá phong đỏ rực, bí ngô phát sáng & hoàng hôn huyền bí',
      en: 'Amber maples, glowing pumpkins & golden dusk atmosphere',
      fr: 'Érables dorés, citrouilles lumineuses et crépuscule',
      es: 'Arces dorados, calabazas iluminadas y atardecer',
      ja: '燃える紅葉、光るカボチャと幻想的な夕暮れ',
    },
    daySky: 0xe69c65,
    nightSky: 0x1e1326,
    blindNightSky: 0x0b0712,
    dayHemiSky: 0xffd7a8,
    dayHemiGround: 0x7a4b2a,
    nightHemiSky: 0x82589f,
    nightHemiGround: 0x2b1918,
    daySunColor: 0xffcf87,
    nightMoonLight: 0xd8b4fe,
    groundDay: 0x826535,
    groundNight: 0x3d2e1e,
    clearingDirt: 0x6e4b30,
    foliagePrimary: 0xc95324,
    foliageSecondary: 0xe08e26,
    foliageAccent: 0x9e2f2b,
    rockColor: 0x6b5f59,
    mountainColor: 0x473345,
    mountainSnowCap: 0xd9a075,
    roofColor: 0x5e2c45,
    wallColor: 0xc9ae8b,
    ambientParticleColor: 0xf97316,
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

export function loadAgrouAvatarConfig(): AgrouAvatarConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_AGROU_AVATAR };
    const parsed = JSON.parse(raw);
    const validHat = AGROU_HATS.some((h) => h.id === parsed.hat)
      ? (parsed.hat as AgrouHatId)
      : DEFAULT_AGROU_AVATAR.hat;
    const validColor = AGROU_CLOAK_COLORS.some((c) => c.hex === parsed.cloakColor)
      ? Number(parsed.cloakColor)
      : DEFAULT_AGROU_AVATAR.cloakColor;
    const validTitle = AGROU_TITLES.some((t) => t.id === parsed.titleId)
      ? String(parsed.titleId)
      : DEFAULT_AGROU_AVATAR.titleId;
    const validBiome: AgrouMapBiome =
      parsed.mapBiome === 'forest' ||
      parsed.mapBiome === 'frostpeak' ||
      parsed.mapBiome === 'autumn'
        ? parsed.mapBiome
        : DEFAULT_AGROU_AVATAR.mapBiome;

    return {
      hat: validHat,
      cloakColor: validColor,
      titleId: validTitle,
      mapBiome: validBiome,
    };
  } catch {
    return { ...DEFAULT_AGROU_AVATAR };
  }
}

export function saveAgrouAvatarConfig(cfg: AgrouAvatarConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
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

  if (maxVotes === 0 || candidates.length === 0) {
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
