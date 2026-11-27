import {
  BotPersonaId,
  Language,
  NightActions,
  Player,
  PublicRoleClaim,
  RoleId,
  StorylineId,
  VoteRecord,
} from '../types/game';
import { ROLES } from './roles';
import { getDyingWolfVictimsForWitch } from './rules';

// Pick the bot chat line for the current language (falls back to English).
const tr = (lang: Language, m: Record<Language, string>) => m[lang] ?? m.en;

export type ConcreteStorylineId = Exclude<StorylineId, 'random_dramatic'>;

export interface StorylineMeta {
  id: StorylineId;
  icon: string;
  label: Record<Language, string>;
  description: Record<Language, string>;
  requiredRoles?: RoleId[];
}

export const STORYLINE_CATALOG: Record<StorylineId, StorylineMeta> = {
  random_dramatic: {
    id: 'random_dramatic',
    icon: '🎲',
    label: {
      vi: '🎲 Ngẫu Nhiên Kịch Tính',
      en: '🎲 Dramatic Random',
      fr: '🎲 Aléatoire Dramatique',
      es: '🎲 Aleatorio Dramático',
      ja: '🎲 ドラマチックおまかせ',
    },
    description: {
      vi: 'Bí mật chọn 1 kịch bản kịch tính khớp với đội hình hiện tại mỗi ván đấu.',
      en: 'Secretly picks a compatible high-drama storyline for every match.',
      fr: 'Choisit secrètement un scénario dramatique compatible à chaque partie.',
      es: 'Elige en secreto una trama dramática compatible en cada partida.',
      ja: '試合ごとに配役に合ったドラマチックな展開を秘密裏に選択します。',
    },
  },
  classic_deduction: {
    id: 'classic_deduction',
    icon: '⚖️',
    label: {
      vi: '⚖️ Đấu Trí Cổ Điển',
      en: '⚖️ Classic Deduction',
      fr: '⚖️ Déduction Classique',
      es: '⚖️ Deducción Clásica',
      ja: '⚖️ 王道推理戦',
    },
    description: {
      vi: 'Suy luận thuần túy qua lịch sử bỏ phiếu, phản ứng bình minh và tranh luận.',
      en: 'Pure social deduction driven by voting trails, dawn reads, and debates.',
      fr: 'Déduction pure basée sur les votes, les réactions à l’aube et les débats.',
      es: 'Deducción social pura guiada por votos, pistas al amanecer y debate.',
      ja: '投票履歴・朝の反応・議論から人狼を追い詰める王道の推理戦。',
    },
  },
  twin_seers: {
    id: 'twin_seers',
    icon: '🔮',
    label: {
      vi: '🔮 Song Sinh Tiên Tri — Thật Giả Đối Đầu',
      en: '🔮 Twin Seers — Real vs Fake Clash',
      fr: '🔮 Doubles Voyantes — Vraie vs Fausse',
      es: '🔮 Videntes Gemelas — Real vs Falsa',
      ja: '🔮 双子の占い師 — 真贋対決',
    },
    description: {
      vi: 'Ma Sói táo bạo giả danh Tiên Tri đối chất trực diện với Tiên Tri thật!',
      en: 'A bold Werewolf counter-claims Seer head-to-head against the real Seer!',
      fr: 'Un Loup-Garou audacieux se prétend Voyante face à la vraie Voyante !',
      es: '¡Un Lobo audaz finge ser Vidente frente a frente contra la real!',
      ja: '人狼が大胆に占い師を騙り、本物の占い師と真っ向対決します！',
    },
    requiredRoles: ['seer'],
  },
  forbidden_lovers: {
    id: 'forbidden_lovers',
    icon: '💘',
    label: {
      vi: '💘 Tình Nhân Nghịch Cảnh — Sói & Dân',
      en: '💘 Forbidden Lovers — Wolf & Villager',
      fr: '💘 Amants Interdits — Loup & Villageois',
      es: '💘 Amantes Prohibidos — Lobo y Aldeano',
      ja: '💘 禁断の恋人 — 人狼と村人',
    },
    description: {
      vi: 'Cupid se duyên 1 Ma Sói + 1 Dân Làng tạo nên phe thứ 3 đầy kịch tính.',
      en: 'Cupid binds 1 Werewolf + 1 Villager into a razor-edge 3rd-faction romance.',
      fr: 'Cupidon lie 1 Loup et 1 Villageois en un 3e camp électrique.',
      es: 'Cupido une a 1 Lobo y 1 Aldeano en una intensa tercera facción.',
      ja: 'キューピッドが人狼と村人を結び、スリル満点の第三勢力が誕生！',
    },
    requiredRoles: ['cupid'],
  },
  wolf_civil_war: {
    id: 'wolf_civil_war',
    icon: '🐺',
    label: {
      vi: '🐺 Nội Chiến Đàn Sói — Thí Tốt Cuồng Nộ',
      en: '🐺 Wolf Civil War — Frenzy Gambit',
      fr: '🐺 Guerre Civile des Loups — Sacrifice Fureur',
      es: '🐺 Guerra Civil de Lobos — Sacrificio Feroz',
      ja: '🐺 人狼内戦 — 狂乱の捨て駒',
    },
    description: {
      vi: 'Đàn Sói sẵn sàng thí Sói Con lấy lòng tin dân làng để mở khóa cú cắn kép!',
      en: 'Wolves bus their own Wolf Pup for town credit to unleash double-kill frenzy!',
      fr: 'Les Loups sacrifient le Louveteau pour gagner confiance et double morsure !',
      es: 'Los Lobos sacrifican al Cachorro para ganarse al pueblo y atacar doble.',
      ja: '子狼を売って村の信頼を勝ち取り、翌夜の2人襲撃を狙う策謀戦！',
    },
    requiredRoles: ['wolf_pup'],
  },
  jester_mindgame: {
    id: 'jester_mindgame',
    icon: '🎭',
    label: {
      vi: '🎭 Bẫy Kẻ Chán Đời — Đòn Tâm Lý',
      en: '🎭 Jester Mindgame — Psychological Trap',
      fr: '🎭 Piège du Fou — Jeu Psychologique',
      es: '🎭 Trampa del Bufón — Juego Mental',
      ja: '🎭 道化師の罠 — 心理戦',
    },
    description: {
      vi: 'Kẻ Chán Đời tung mồi nhử tinh vi khiến cả làng phân vân Sói thật hay bẫy treo cổ.',
      en: 'The Tanner plants subtle bait so the village doubts every easy lynch.',
      fr: 'Le Tanneur tend des pièges subtils faisant douter chaque vote facile.',
      es: 'El Curtidor lanza cebos sutiles que hacen dudar de cada linchamiento.',
      ja: '吊人が巧妙な罠を張り、村人たちの処刑判断を揺さぶります。',
    },
    requiredRoles: ['tanner'],
  },
  silent_night_paranoia: {
    id: 'silent_night_paranoia',
    icon: '🧪',
    label: {
      vi: '🧪 Đêm Bình Yên & Bình Độc Nửa Đêm',
      en: '🧪 Silent Night & Midnight Poison',
      fr: '🧪 Nuit Silencieuse & Poison de Minuit',
      es: '🧪 Noche Silenciosa y Veneno Nocturno',
      ja: '🧪 静寂の夜と真夜中の毒薬',
    },
    description: {
      vi: 'Bảo Vệ và Phù Thủy tung chiêu cứu người lẫn bình độc tạo áp lực nghẹt thở.',
      en: 'Bodyguard shields and Witch elixirs trigger tense peaceful nights and counter-poisons.',
      fr: 'Boucliers du Salvateur et potions de la Sorcière créent une paranoïa intense.',
      es: 'Escudos y pociones provocan noches sin bajas seguidas de venenos letales.',
      ja: '騎士の護衛と魔女の秘薬が交錯し、静かな夜の裏で疑心暗鬼が深まる。',
    },
    requiredRoles: ['bodyguard', 'witch'],
  },
  mayor_coup: {
    id: 'mayor_coup',
    icon: '👑',
    label: {
      vi: '👑 Đảo Chính Thị Trưởng — Quyền Lực x2',
      en: '👑 Mayor Coup — Double Vote Power',
      fr: '👑 Coup du Maire — Pouvoir Double',
      es: '👑 Golpe del Alcalde — Poder x2',
      ja: '👑 村長クーデター — 2票の権力',
    },
    description: {
      vi: 'Mọi toan tính xoay quanh chiếc vương miện Thị Trưởng và lá phiếu quyền lực x2.',
      en: 'Every alliance and ambush revolves around the Mayor’s double-weight vote.',
      fr: 'Toutes les manœuvres tournent autour du double vote du Maire.',
      es: 'Todas las alianzas y emboscadas giran en torno al voto doble del Alcalde.',
      ja: '2票の権限を持つ村長の座と継承をめぐり、激しい権力闘争が勃発！',
    },
  },
};

export const STORYLINE_LIST: StorylineMeta[] = Object.values(STORYLINE_CATALOG);

export interface RoundVoteSnapshot {
  round: number;
  votes: VoteRecord[];
  lynchedId: string | null;
  lynchedRoleId?: RoleId | null;
}

export interface WolfBluffPlan {
  bluffWolfId: string | null;
  targetVillagerId: string | null;
  vouchedAllyId: string | null;
  hasClaimed: boolean;
}

export interface AIMatchBrain {
  preferredStoryline: StorylineId;
  activeStoryline: ConcreteStorylineId;
  humanId: string;
  personas: Record<string, BotPersonaId>;

  // Strictly PUBLIC memory (populated ONLY from public chat, Dawn casualties, and Dusk vote records)
  publicClaims: PublicRoleClaim[];
  voteHistory: RoundVoteSnapshot[];
  publicSuspicion: Record<string, number>; // -100..+100
  spokenCounts: Record<string, number>;
  revealedRoles: Record<string, RoleId>;
  dawnDeathHistory: Array<{ round: number; victimIds: string[] }>;
  lastDawnPeaceful: boolean;
  lastMayorTransferredToId: string | null;

  // Strictly ROLE-PRIVATE memory (scoped per botId — never read across roles!)
  seerChecksByBot: Record<string, Record<string, 'wolf' | 'good'>>;
  witchHealedByBot: Record<string, string[]>;
  witchPoisonedByBot: Record<string, string | null>;
  wolfBluffPlan: WolfBluffPlan;
  cupidBiasApplied: boolean;
}

export interface ScheduledBotBeat {
  delayMs: number;
  speakerId: string;
  speakerName: string;
  text: string;
  persona?: BotPersonaId;
  claimedRole?: RoleId;
  targetId?: string;
  checkResult?: 'wolf' | 'good';
}

export interface SmartChatVoteSignals {
  suspectsByVoter: Record<string, string[]>;
  alliesByVoter: Record<string, string[]>;
  suspectsSilentVoters: string[];
  silentPlayerIds: string[];
}

export interface DiscussionBeatContext {
  players: Player[];
  round: number;
  lang: Language;
  killedNames: string[];
  killedIds?: string[];
  dayDiscussSec?: number;
  mayorId?: string | null;
  mayorTransferredFromName?: string | null;
  mayorTransferredToName?: string | null;
  seerInspection?: { playerId: string; roleId: RoleId; isWerewolf: boolean } | null;
  rng?: () => number;
}

export interface GallowsDefenseContext {
  players: Player[];
  votes: VoteRecord[];
  mayorId?: string | null;
  round: number;
  lang: Language;
  rng?: () => number;
}

export interface RoundPublicOutcomeInput {
  round: number;
  dawnDeaths?: string[];
  votes?: VoteRecord[];
  lynchedId?: string | null;
  lynchedRoleId?: RoleId | null;
  mayorTransferredToId?: string | null;
}

const ALL_PERSONAS: BotPersonaId[] = [
  'detective',
  'prosecutor',
  'observer',
  'manipulator',
  'protector',
  'wildcard',
];

const CAMPFIRE_ABSTAIN_TOKEN = '__CAMPFIRE_ABSTAIN__';

function isBitingWolf(roleId: RoleId): boolean {
  return roleId === 'werewolf' || roleId === 'wolf_pup';
}

function clampSuspicion(val: number): number {
  return Math.max(-100, Math.min(100, Math.round(val)));
}

export function adjustPublicSuspicion(brain: AIMatchBrain, playerId: string, delta: number): void {
  const prev = brain.publicSuspicion[playerId] ?? 0;
  brain.publicSuspicion[playerId] = clampSuspicion(prev + delta);
}

function pickFrom<T>(items: readonly T[], rng: () => number): T {
  return items[Math.floor(rng() * items.length) % items.length];
}

function pickWeightedTop<T>(
  scored: Array<{ item: T; score: number }>,
  rng: () => number,
  jitter = 0
): T | null {
  if (scored.length === 0) return null;
  let best = scored[0];
  let bestVal = best.score + (jitter > 0 ? rng() * jitter : 0);
  for (let i = 1; i < scored.length; i++) {
    const val = scored[i].score + (jitter > 0 ? rng() * jitter : 0);
    if (val > bestVal) {
      bestVal = val;
      best = scored[i];
    }
  }
  return best.item;
}

function addPublicClaim(brain: AIMatchBrain, claim: PublicRoleClaim): void {
  const dup = brain.publicClaims.some(
    (c) =>
      c.speakerId === claim.speakerId &&
      c.claimedRole === claim.claimedRole &&
      c.round === claim.round &&
      c.targetId === claim.targetId &&
      c.checkResult === claim.checkResult
  );
  if (!dup) {
    brain.publicClaims.push({ ...claim });
  }
}

function getLivingSeerClaimers(brain: AIMatchBrain, players: Player[]): string[] {
  const aliveIds = new Set(players.filter((p) => p.isAlive).map((p) => p.id));
  const ids = new Set<string>();
  for (const c of brain.publicClaims) {
    if (c.claimedRole === 'seer' && aliveIds.has(c.speakerId)) {
      ids.add(c.speakerId);
    }
  }
  return Array.from(ids);
}

function isStorylineCompatible(storyline: ConcreteStorylineId, players: Player[]): boolean {
  const has = (r: RoleId) => players.some((p) => p.roleId === r);
  const wolves = players.filter((p) => isBitingWolf(p.roleId));
  const botWolves = wolves.filter((p) => p.isBot);

  switch (storyline) {
    case 'twin_seers':
      return has('seer') && botWolves.length >= 1;
    case 'forbidden_lovers':
      return has('cupid') && wolves.length >= 1 && players.some((p) => ROLES[p.roleId].faction === 'villager');
    case 'wolf_civil_war':
      return has('wolf_pup') && wolves.length >= 2;
    case 'jester_mindgame':
      return has('tanner');
    case 'silent_night_paranoia':
      return has('bodyguard') || has('witch');
    case 'mayor_coup':
      return players.length >= 5;
    case 'classic_deduction':
    default:
      return true;
  }
}

function resolveActiveStoryline(
  players: Player[],
  preferred: StorylineId,
  rng: () => number
): ConcreteStorylineId {
  if (preferred !== 'random_dramatic') {
    return isStorylineCompatible(preferred, players) ? preferred : 'classic_deduction';
  }

  const dramaticPool: ConcreteStorylineId[] = [
    'twin_seers',
    'forbidden_lovers',
    'wolf_civil_war',
    'jester_mindgame',
    'silent_night_paranoia',
    'mayor_coup',
  ].filter((id) => isStorylineCompatible(id as ConcreteStorylineId, players)) as ConcreteStorylineId[];

  if (dramaticPool.length === 0) return 'classic_deduction';
  return pickFrom(dramaticPool, rng);
}

/**
 * Ensures required roles for a chosen storyline exist in the deck while preserving
 * exact deck size, wolf/non-wolf balance, and index 0 (human preferred role).
 */
export function applyStorylineRoleSetup(
  roles: RoleId[],
  storylineId: StorylineId,
  villageSize: number,
  preferredRole?: RoleId | 'random'
): RoleId[] {
  const targetLen = Math.max(4, Math.min(villageSize, roles.length || villageSize));
  const deck = [...roles].slice(0, targetLen);
  while (deck.length < targetLen) deck.push('villager');

  const meta = STORYLINE_CATALOG[storylineId];
  const required = meta?.requiredRoles;
  if (!required || required.length === 0) {
    return deck;
  }

  const lockFirstSeat = Boolean(preferredRole && preferredRole !== 'random') || deck.length >= 5;
  const requiredSet = new Set<RoleId>(required);
  const fillerPriority: RoleId[] = [
    'villager',
    'cursed',
    'doppelganger',
    'elder',
    'hunter',
    'tanner',
    'cupid',
    'traitor',
    'bodyguard',
    'witch',
  ];

  for (const reqRole of required) {
    if (deck.includes(reqRole)) continue;
    const startIdx = lockFirstSeat ? 1 : 0;

    if (isBitingWolf(reqRole)) {
      let replaceIdx = deck.findIndex((r, i) => i >= startIdx && isBitingWolf(r));
      if (replaceIdx === -1) replaceIdx = deck.findIndex((r) => isBitingWolf(r));
      if (replaceIdx !== -1 && !(lockFirstSeat && replaceIdx === 0 && preferredRole && preferredRole !== 'random')) {
        deck[replaceIdx] = reqRole;
      }
      continue;
    }

    let replaceIdx = -1;
    for (const filler of fillerPriority) {
      if (requiredSet.has(filler)) continue;
      if (preferredRole && preferredRole !== 'random' && filler === preferredRole) continue;
      const idx = deck.findIndex((r, i) => i >= startIdx && r === filler);
      if (idx !== -1) {
        replaceIdx = idx;
        break;
      }
    }
    if (replaceIdx === -1) {
      replaceIdx = deck.findIndex(
        (r, i) => i >= startIdx && !isBitingWolf(r) && !requiredSet.has(r)
      );
    }
    if (replaceIdx !== -1) {
      deck[replaceIdx] = reqRole;
    }
  }

  return deck;
}

/**
 * Initializes the zero-cheat AI match brain with varied bot personas, resolved storyline,
 * and strictly separated public vs role-private memory.
 */
export function createAIMatchBrain(
  players: Player[],
  preferredStoryline: StorylineId = 'random_dramatic',
  humanId = 'usr_me',
  rng: () => number = Math.random
): AIMatchBrain {
  const activeStoryline = resolveActiveStoryline(players, preferredStoryline, rng);
  const personas: Record<string, BotPersonaId> = {};
  const publicSuspicion: Record<string, number> = {};
  const spokenCounts: Record<string, number> = {};

  const bots = players.filter((p) => p.isBot);
  const personaOrder = [...ALL_PERSONAS];
  for (let i = personaOrder.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [personaOrder[i], personaOrder[j]] = [personaOrder[j], personaOrder[i]];
  }

  bots.forEach((bot, idx) => {
    personas[bot.id] = personaOrder[idx % personaOrder.length];
  });

  players.forEach((p) => {
    publicSuspicion[p.id] = 0;
    spokenCounts[p.id] = 0;
  });

  // Assign a wolf-private bluff actor for twin_seers / pressured counter-claims
  const botWolves = bots.filter((b) => isBitingWolf(b.roleId));
  const preferredBluffer =
    botWolves.find((b) => b.roleId === 'werewolf') || botWolves[0] || null;
  if (preferredBluffer && activeStoryline === 'twin_seers') {
    personas[preferredBluffer.id] = 'manipulator';
  }

  return {
    preferredStoryline,
    activeStoryline,
    humanId,
    personas,
    publicClaims: [],
    voteHistory: [],
    publicSuspicion,
    spokenCounts,
    revealedRoles: {},
    dawnDeathHistory: [],
    lastDawnPeaceful: false,
    lastMayorTransferredToId: null,
    seerChecksByBot: {},
    witchHealedByBot: {},
    witchPoisonedByBot: {},
    wolfBluffPlan: {
      bluffWolfId: preferredBluffer?.id ?? null,
      targetVillagerId: null,
      vouchedAllyId: null,
      hasClaimed: false,
    },
    cupidBiasApplied: false,
  };
}

/**
 * Records a bot Seer's OWN private inspection result (both 'wolf' and 'good').
 */
export function recordBotSeerInspection(
  brain: AIMatchBrain,
  seerBotId: string,
  targetId: string,
  isWerewolf: boolean
): void {
  if (!brain.seerChecksByBot[seerBotId]) {
    brain.seerChecksByBot[seerBotId] = {};
  }
  brain.seerChecksByBot[seerBotId][targetId] = isWerewolf ? 'wolf' : 'good';
}

/**
 * Updates strictly PUBLIC memory after Dawn casualties and/or Dusk voting resolution.
 */
export function recordRoundPublicOutcome(
  brain: AIMatchBrain,
  outcome: RoundPublicOutcomeInput
): void {
  // Subtle decay on old suspicion so fresh evidence dominates
  for (const id of Object.keys(brain.publicSuspicion)) {
    brain.publicSuspicion[id] = clampSuspicion(brain.publicSuspicion[id] * 0.88);
  }

  if (outcome.dawnDeaths !== undefined) {
    brain.dawnDeathHistory.push({
      round: outcome.round,
      victimIds: [...outcome.dawnDeaths],
    });
    brain.lastDawnPeaceful = outcome.dawnDeaths.length === 0;
  }

  if (outcome.mayorTransferredToId) {
    brain.lastMayorTransferredToId = outcome.mayorTransferredToId;
  }

  if (outcome.votes || outcome.lynchedId !== undefined) {
    const dedupVotesMap = new Map<string, string>();
    for (const v of outcome.votes || []) {
      if (v.voterId && v.targetId) {
        dedupVotesMap.set(v.voterId, v.targetId);
      }
    }
    const cleanVotes: VoteRecord[] = Array.from(dedupVotesMap.entries()).map(
      ([voterId, targetId]) => ({ voterId, targetId })
    );

    brain.voteHistory.push({
      round: outcome.round,
      votes: cleanVotes,
      lynchedId: outcome.lynchedId ?? null,
      lynchedRoleId: outcome.lynchedRoleId ?? null,
    });

    if (outcome.lynchedId && outcome.lynchedRoleId) {
      brain.revealedRoles[outcome.lynchedId] = outcome.lynchedRoleId;
      const lynchedWasWolf = isBitingWolf(outcome.lynchedRoleId);
      const lynchedWasVillager = ROLES[outcome.lynchedRoleId].faction === 'villager';

      for (const v of cleanVotes) {
        if (v.voterId === outcome.lynchedId) continue;
        if (lynchedWasWolf) {
          if (v.targetId === outcome.lynchedId) {
            adjustPublicSuspicion(brain, v.voterId, -18);
          } else {
            adjustPublicSuspicion(brain, v.voterId, 10);
          }
        } else if (lynchedWasVillager) {
          if (v.targetId === outcome.lynchedId) {
            adjustPublicSuspicion(brain, v.voterId, 12);
          }
        }
      }

      // Cross-check public Seer claims against the revealed lynch role
      for (const claim of brain.publicClaims) {
        if (claim.claimedRole !== 'seer') continue;
        if (claim.targetId === outcome.lynchedId && claim.checkResult) {
          const claimMatched =
            (claim.checkResult === 'wolf' && lynchedWasWolf) ||
            (claim.checkResult === 'good' && !lynchedWasWolf);
          adjustPublicSuspicion(brain, claim.speakerId, claimMatched ? -28 : 55);
        }
        // If the lynched player was the real Seer, any OTHER Seer claimer is exposed!
        if (outcome.lynchedRoleId === 'seer' && claim.speakerId !== outcome.lynchedId) {
          adjustPublicSuspicion(brain, claim.speakerId, 60);
        }
      }
    }
  }
}

// ============================================================================
// ROLE-LEGAL SMART NIGHT DECISIONS (ZERO CHEATING)
// ============================================================================

/**
 * Computes wolf pack target suggestions using ONLY wolf-legal knowledge
 * (packmate ids, lovers, and public board state). Works even when Human is a Wolf.
 */
export function suggestWolfPackTargets(
  brain: AIMatchBrain,
  players: Player[],
  wolfPupFrenzy: boolean,
  rng: () => number = Math.random
): { primaryTargetId: string | null; secondaryTargetId: string | null } {
  const alive = players.filter((p) => p.isAlive);
  const livingWolves = alive.filter((p) => isBitingWolf(p.roleId));
  const wolfLoverIds = new Set(
    livingWolves.map((w) => w.loverId).filter(Boolean) as string[]
  );
  const nonWolves = alive.filter((p) => !isBitingWolf(p.roleId));
  const preferredPrey = nonWolves.filter((p) => !wolfLoverIds.has(p.id));
  const preyPool = preferredPrey.length > 0 ? preferredPrey : nonWolves;

  if (preyPool.length === 0) {
    return { primaryTargetId: null, secondaryTargetId: null };
  }

  const seerClaimers = getLivingSeerClaimers(brain, players);
  const uncontestedSeerId = seerClaimers.length === 1 ? seerClaimers[0] : null;
  const guardDead = Object.values(brain.revealedRoles).includes('bodyguard');
  const guardDodgeActive =
    !guardDead &&
    rng() < (brain.activeStoryline === 'silent_night_paranoia' ? 0.45 : 0.28);

  const publicPowerClaimMap = new Map<string, RoleId>();
  for (const c of brain.publicClaims) {
    if (c.claimedRole === 'witch' || c.claimedRole === 'bodyguard') {
      publicPowerClaimMap.set(c.speakerId, c.claimedRole);
    }
  }

  const scored = preyPool.map((p) => {
    let score = 10;
    const susp = brain.publicSuspicion[p.id] ?? 0;
    const spoken = brain.spokenCounts[p.id] ?? 0;
    const persona = brain.personas[p.id];

    // +50 for uncontested revealed Seer (with smart Bodyguard-dodge chance)
    if (uncontestedSeerId === p.id) {
      score += guardDodgeActive ? 12 : 50;
    } else if (seerClaimers.includes(p.id)) {
      score += 20;
    }

    if (publicPowerClaimMap.has(p.id)) {
      score += 26;
    }

    // +25 for living Mayor (especially in mayor_coup!)
    if (p.isMayor) {
      score += brain.activeStoryline === 'mayor_coup' ? 40 : 25;
    }

    // +20 for vocal detective / analytical town leaders
    if (spoken >= 2 || (persona === 'detective' && spoken >= 1)) {
      score += 20;
    }

    // -40 for suspected Tanner / high-suspicion daytime scapegoats
    if (susp >= 30) {
      score -= 40;
    } else if (susp <= -15) {
      score += 15; // Trusted townies are dangerous to leave alive
    }

    return { item: p, score };
  });

  const primary = pickWeightedTop(scored, rng, 10);
  let secondary: Player | null = null;
  if (wolfPupFrenzy && primary) {
    const rest = scored.filter((s) => s.item.id !== primary.id);
    secondary = pickWeightedTop(rest, rng, 10);
  }

  return {
    primaryTargetId: primary?.id ?? null,
    secondaryTargetId: secondary?.id ?? null,
  };
}

/**
 * Computes rule-compliant, role-legal night actions using AIMatchBrain.
 */
export function computeSmartBotNightAction(
  brain: AIMatchBrain,
  stepKey: 'doppelganger' | 'cupid' | 'bodyguard' | 'hunter' | 'werewolf' | 'witch' | 'seer',
  players: Player[],
  currentActions: NightActions,
  options: {
    round: number;
    wolfPupFrenzy: boolean;
    humanPlayerId: string;
    rng?: () => number;
  }
): Partial<NightActions> {
  const rng = options.rng ?? Math.random;
  const alivePlayers = players.filter((p) => p.isAlive);
  const human = players.find((p) => p.id === options.humanPlayerId);

  if (stepKey === 'doppelganger' && options.round === 1) {
    const botDoppel = alivePlayers.find(
      (p) => p.roleId === 'doppelganger' && p.id !== options.humanPlayerId
    );
    if (botDoppel && !currentActions.doppelgangerTargetId) {
      const candidates = alivePlayers.filter((p) => p.id !== botDoppel.id);
      if (candidates.length > 0) {
        const scored = candidates.map((p) => ({
          item: p,
          score: (p.isMayor ? 20 : 0) + (p.id === options.humanPlayerId ? 10 : 0),
        }));
        const pick = pickWeightedTop(scored, rng, 25);
        if (pick) return { doppelgangerTargetId: pick.id };
      }
    }
    return {};
  }

  if (stepKey === 'cupid' && options.round === 1) {
    const botCupid = alivePlayers.find(
      (p) => p.roleId === 'cupid' && p.id !== options.humanPlayerId
    );
    if (
      botCupid &&
      (!currentActions.cupidLovers ||
        !currentActions.cupidLovers[0] ||
        !currentActions.cupidLovers[1])
    ) {
      if (brain.activeStoryline === 'forbidden_lovers') {
        const wolves = alivePlayers.filter((p) => isBitingWolf(p.roleId));
        const villagers = alivePlayers.filter(
          (p) => ROLES[p.roleId].faction === 'villager' && p.id !== botCupid.id
        );
        const fallbackVillagers = alivePlayers.filter(
          (p) => ROLES[p.roleId].faction === 'villager'
        );
        const goodPool = villagers.length > 0 ? villagers : fallbackVillagers;
        if (wolves.length > 0 && goodPool.length > 0) {
          // Include human preferentially ~55% when human is in either pool for electric drama
          const humanWolf = wolves.find((p) => p.id === options.humanPlayerId);
          const humanGood = goodPool.find((p) => p.id === options.humanPlayerId);
          const wolfPick =
            humanWolf && rng() < 0.55 ? humanWolf : pickFrom(wolves, rng);
          const goodPick =
            humanGood && !humanWolf && rng() < 0.55
              ? humanGood
              : pickFrom(goodPool, rng);
          brain.cupidBiasApplied = true;
          return { cupidLovers: [wolfPick.id, goodPick.id] };
        }
      }

      if (alivePlayers.length >= 2) {
        const pool = [...alivePlayers];
        for (let i = pool.length - 1; i > 0; i--) {
          const j = Math.floor(rng() * (i + 1));
          [pool[i], pool[j]] = [pool[j], pool[i]];
        }
        return { cupidLovers: [pool[0].id, pool[1].id] };
      }
    }
    return {};
  }

  if (stepKey === 'bodyguard') {
    const botGuard = alivePlayers.find(
      (p) => p.roleId === 'bodyguard' && p.id !== options.humanPlayerId
    );
    if (botGuard && !botGuard.hasUsedPower && !currentActions.guardTargetId) {
      const validTargets = alivePlayers.filter((p) => !p.protectedLastNight);
      if (validTargets.length === 0) return {};

      const seerClaimers = getLivingSeerClaimers(brain, players);
      const uncontestedSeerId = seerClaimers.length === 1 ? seerClaimers[0] : null;

      // 70% direct priority on an uncontested revealed Seer (80% in silent_night_paranoia)
      if (uncontestedSeerId) {
        const seerTarget = validTargets.find((p) => p.id === uncontestedSeerId);
        const guardSeerChance =
          brain.activeStoryline === 'silent_night_paranoia' ? 0.8 : 0.7;
        if (seerTarget && rng() < guardSeerChance) {
          return { guardTargetId: seerTarget.id };
        }
      }

      const scored = validTargets.map((p) => {
        let score = 10;
        const susp = brain.publicSuspicion[p.id] ?? 0;
        const spoken = brain.spokenCounts[p.id] ?? 0;
        if (p.id === uncontestedSeerId) score += 45;
        if (p.id === botGuard.loverId) score += 42;
        if (p.isMayor) score += brain.activeStoryline === 'mayor_coup' ? 40 : 32;
        if (p.id === botGuard.id) score += options.round === 1 ? 18 : 12;
        if (spoken >= 2 && susp <= 10) score += 18;
        if (susp <= -15) score += 20;
        if (susp >= 30) score -= 35;
        return { item: p, score };
      });
      const pick = pickWeightedTop(scored, rng, 18);
      if (pick) return { guardTargetId: pick.id };
    }
    return {};
  }

  if (stepKey === 'hunter') {
    const botHunter = alivePlayers.find(
      (p) =>
        p.roleId === 'hunter' &&
        !p.hasUsedPower &&
        p.id !== options.humanPlayerId
    );
    if (botHunter && currentActions.hunterTargetId === undefined) {
      // ~15% tactical hold ("Không ghim") so bots don't always lock a shot blindly
      if (rng() < 0.15) {
        return { hunterTargetId: null };
      }
      const pick = pickSmartBotHunterTargetWithBrain(brain, players, botHunter, {
        rng,
      });
      return { hunterTargetId: pick ? pick.id : null };
    }
    return {};
  }

  if (stepKey === 'werewolf') {
    const isHumanLivingWolf = Boolean(
      human && human.isAlive && isBitingWolf(human.roleId)
    );
    if (isHumanLivingWolf) return {};

    const suggestion = suggestWolfPackTargets(
      brain,
      players,
      options.wolfPupFrenzy,
      rng
    );
    const updates: Partial<NightActions> = {};
    if (!currentActions.wolfTargetId && suggestion.primaryTargetId) {
      updates.wolfTargetId = suggestion.primaryTargetId;
    }
    const chosenPrimary = updates.wolfTargetId || currentActions.wolfTargetId;
    if (
      options.wolfPupFrenzy &&
      !currentActions.secondWolfTargetId &&
      suggestion.secondaryTargetId &&
      suggestion.secondaryTargetId !== chosenPrimary
    ) {
      updates.secondWolfTargetId = suggestion.secondaryTargetId;
    }
    return updates;
  }

  if (stepKey === 'witch') {
    const botWitch = alivePlayers.find(
      (p) => p.roleId === 'witch' && p.id !== options.humanPlayerId
    );
    if (botWitch && !botWitch.hasUsedPower) {
      const updates: Partial<NightActions> = {};
      const dyingVictims = getDyingWolfVictimsForWitch(
        players,
        currentActions,
        options.wolfPupFrenzy
      );

      // Heal potion: works across ALL rounds (fixes Round 3+ 0% bug!)
      if (!botWitch.hasUsedHeal && dyingVictims.length > 0) {
        if (dyingVictims.includes(botWitch.id)) {
          updates.witchHealTargetId = botWitch.id;
        } else if (botWitch.loverId && dyingVictims.includes(botWitch.loverId)) {
          updates.witchHealTargetId = botWitch.loverId;
        } else {
          const seerClaimers = getLivingSeerClaimers(brain, players);
          const uncontestedSeerId = seerClaimers.length === 1 ? seerClaimers[0] : null;
          let bestVictimId: string | null = null;
          let bestPriority = -Infinity;

          for (const vid of dyingVictims) {
            const vp = alivePlayers.find((p) => p.id === vid);
            if (!vp) continue;
            const susp = brain.publicSuspicion[vid] ?? 0;
            let prio = 20 - susp * 0.5;
            if (vid === uncontestedSeerId) prio += 70;
            if (vp.isMayor) prio += 40;
            if (susp <= -10) prio += 25;
            if (prio > bestPriority) {
              bestPriority = prio;
              bestVictimId = vid;
            }
          }

          if (bestVictimId) {
            const susp = brain.publicSuspicion[bestVictimId] ?? 0;
            const isVip =
              bestVictimId === uncontestedSeerId ||
              Boolean(alivePlayers.find((p) => p.id === bestVictimId)?.isMayor);
            const healChance = isVip
              ? 0.95
              : susp >= 35
              ? 0.1
              : options.round >= 3
              ? 0.82
              : brain.activeStoryline === 'silent_night_paranoia'
              ? 0.85
              : 0.68;

            if (rng() < healChance) {
              updates.witchHealTargetId = bestVictimId;
            }
          }
        }

        if (updates.witchHealTargetId) {
          if (!brain.witchHealedByBot[botWitch.id]) {
            brain.witchHealedByBot[botWitch.id] = [];
          }
          if (!brain.witchHealedByBot[botWitch.id].includes(updates.witchHealTargetId)) {
            brain.witchHealedByBot[botWitch.id].push(updates.witchHealTargetId);
          }
        }
      }

      // Poison potion: ONLY targets high-suspicion suspects or exposed Fake-Seers (NEVER random innocents!)
      if (!botWitch.hasUsedPoison && options.round >= 2) {
        const dyingSet = new Set(dyingVictims);
        const healedHistory = new Set(brain.witchHealedByBot[botWitch.id] || []);
        const seerClaimers = getLivingSeerClaimers(brain, players);
        const uncontestedSeerId = seerClaimers.length === 1 ? seerClaimers[0] : null;
        const seerAccusedWolves = new Set<string>();
        if (uncontestedSeerId) {
          for (const c of brain.publicClaims) {
            if (
              c.speakerId === uncontestedSeerId &&
              c.claimedRole === 'seer' &&
              c.checkResult === 'wolf' &&
              c.targetId
            ) {
              seerAccusedWolves.add(c.targetId);
            }
          }
        }

        const candidates = alivePlayers.filter(
          (p) =>
            p.id !== botWitch.id &&
            p.id !== botWitch.loverId &&
            p.id !== updates.witchHealTargetId &&
            !dyingSet.has(p.id)
        );

        const scored = candidates
          .map((p) => {
            const susp = brain.publicSuspicion[p.id] ?? 0;
            let score = susp;
            if (seerAccusedWolves.has(p.id)) score += 50;
            if (healedHistory.has(p.id)) score -= 50;
            if (p.id === uncontestedSeerId) score -= 70;
            return { item: p, score };
          })
          .sort((a, b) => b.score - a.score);

        const poisonThreshold =
          brain.activeStoryline === 'silent_night_paranoia' || alivePlayers.length <= 6
            ? 35
            : 42;

        if (scored.length > 0 && scored[0].score >= poisonThreshold) {
          updates.witchPoisonTargetId = scored[0].item.id;
          brain.witchPoisonedByBot[botWitch.id] = scored[0].item.id;
        }
      }

      return updates;
    }
    return {};
  }

  if (stepKey === 'seer') {
    const botSeer = alivePlayers.find(
      (p) => p.roleId === 'seer' && p.id !== options.humanPlayerId
    );
    if (botSeer && !botSeer.hasUsedPower && !currentActions.seerTargetId) {
      const checkedMap = brain.seerChecksByBot[botSeer.id] || {};
      const unchecked = alivePlayers.filter(
        (p) => p.id !== botSeer.id && !(p.id in checkedMap)
      );
      const pool =
        unchecked.length > 0
          ? unchecked
          : alivePlayers.filter((p) => p.id !== botSeer.id);

      if (pool.length === 0) return {};

      const seerClaimers = new Set(getLivingSeerClaimers(brain, players));
      const anyClaimers = new Set(brain.publicClaims.map((c) => c.speakerId));

      const scored = pool.map((p) => {
        let score = 10;
        const susp = brain.publicSuspicion[p.id] ?? 0;
        const spoken = brain.spokenCounts[p.id] ?? 0;

        // Rival Seer claimer is #1 inspection priority!
        if (seerClaimers.has(p.id)) score += 75;
        else if (anyClaimers.has(p.id)) score += 22;

        if (p.isMayor) score += 30;
        if (spoken >= 2) score += 20;
        if (susp >= 15 && susp <= 65) score += 25;
        if (options.round >= 2 && spoken === 0) score += 14;
        return { item: p, score };
      });

      const pick = pickWeightedTop(scored, rng, 12);
      if (pick) {
        // Record Seer's OWN role-legal check result immediately (both 'wolf' and 'good')
        recordBotSeerInspection(brain, botSeer.id, pick.id, isBitingWolf(pick.roleId));
        return { seerTargetId: pick.id };
      }
    }
    return {};
  }

  return {};
}

// ============================================================================
// ROLE-LEGAL SMART DAY VOTING & HUNTER REVENGE (ZERO VILLAGER TELEPATHY)
// ============================================================================

function computeMayorWeightedCounts(
  votes: VoteRecord[],
  mayorId: string | null | undefined
): Record<string, number> {
  const latest = new Map<string, string>();
  for (const v of votes) {
    if (v.voterId && v.targetId && v.targetId !== CAMPFIRE_ABSTAIN_TOKEN) {
      latest.set(v.voterId, v.targetId);
    }
  }
  const counts: Record<string, number> = {};
  for (const [voterId, targetId] of latest.entries()) {
    const w = mayorId && voterId === mayorId ? 2 : 1;
    counts[targetId] = (counts[targetId] || 0) + w;
  }
  return counts;
}

/**
 * Role-legal day voting engine:
 * - Zero Villager Telepathy: villagers NEVER read hidden roles.
 * - Fixed Traitor: infers likely wolves from public accusations/claims, protects them, counter-votes town/Seer.
 * - Smart Wolves: coordinate counter-wagons, bus doomed packmates (>=45% pressure or Wolf Pup gambit), mind Mayor 2x.
 * - Smart Cross-Faction Lovers: defend lover at all costs and target anyone threatening their lover.
 * - Smart Tanner: casts contrarian/shady votes to draw suspicion without throwing away a lynch on self.
 */
export function computeSmartBotVotes(
  brain: AIMatchBrain,
  players: Player[],
  options: {
    humanTargetId?: string | null;
    chatSignals?: SmartChatVoteSignals | null;
    currentVotes?: VoteRecord[];
    mayorId?: string | null;
    round?: number;
    rng?: () => number;
  } = {}
): VoteRecord[] {
  const rng = options.rng ?? Math.random;
  const alive = players.filter((p) => p.isAlive);
  const aliveBots = alive.filter((p) => p.isBot);
  const aliveIds = new Set(alive.map((p) => p.id));
  const mayorId =
    options.mayorId ?? alive.find((p) => p.isMayor)?.id ?? null;

  const seerClaimers = getLivingSeerClaimers(brain, players);
  const uncontestedSeerId = seerClaimers.length === 1 ? seerClaimers[0] : null;
  const seerAccusedWolves = new Set<string>();
  const seerClearedGood = new Set<string>();
  const accusedByAnySeer = new Set<string>();

  for (const c of brain.publicClaims) {
    if (c.claimedRole !== 'seer' || !c.targetId || !aliveIds.has(c.targetId)) continue;
    if (c.checkResult === 'wolf') {
      accusedByAnySeer.add(c.targetId);
      if (c.speakerId === uncontestedSeerId) seerAccusedWolves.add(c.targetId);
    } else if (c.checkResult === 'good' && c.speakerId === uncontestedSeerId) {
      seerClearedGood.add(c.targetId);
    }
  }

  // Track who is publicly accusing whom in chatSignals
  const chatAccusedCounts: Record<string, number> = {};
  const accusersOf: Record<string, Set<string>> = {};
  for (const [voterId, targets] of Object.entries(options.chatSignals?.suspectsByVoter || {})) {
    for (const tid of targets) {
      chatAccusedCounts[tid] = (chatAccusedCounts[tid] || 0) + 1;
      if (!accusersOf[tid]) accusersOf[tid] = new Set();
      accusersOf[tid].add(voterId);
    }
  }
  for (const c of brain.publicClaims) {
    if (c.claimedRole === 'seer' && c.checkResult === 'wolf' && c.targetId) {
      if (!accusersOf[c.targetId]) accusersOf[c.targetId] = new Set();
      accusersOf[c.targetId].add(c.speakerId);
    }
  }

  const incomingVoteWeights = computeMayorWeightedCounts(
    options.currentVotes || [],
    mayorId
  );
  const totalVotingPower = alive.reduce(
    (sum, p) => sum + (mayorId && p.id === mayorId ? 2 : 1),
    0
  );
  const silentSet = new Set(options.chatSignals?.silentPlayerIds || []);
  const silentVotersSet = new Set(options.chatSignals?.suspectsSilentVoters || []);

  // Pre-compute pack-coordinated non-wolf wagon for Werewolves
  const nonWolfAlive = alive.filter((p) => !isBitingWolf(p.roleId));
  const packWagonScores = nonWolfAlive.map((p) => {
    let score = (brain.publicSuspicion[p.id] ?? 0) * 1.1;
    score += (incomingVoteWeights[p.id] ?? 0) * 22;
    score += (chatAccusedCounts[p.id] ?? 0) * 14;
    if (p.id === uncontestedSeerId) score += 35;
    if (p.isMayor) score += brain.activeStoryline === 'mayor_coup' ? 35 : 18;
    return { item: p, score };
  });
  const coordinatedPackTarget = pickWeightedTop(packWagonScores, rng, 8);

  return aliveBots.map((bot) => {
    const validOthers = alive.filter((p) => p.id !== bot.id && p.id !== bot.loverId);
    const fallbackOthers = alive.filter((p) => p.id !== bot.id);
    const pool = validOthers.length > 0 ? validOthers : fallbackOthers;

    if (pool.length === 0) {
      return { voterId: bot.id, targetId: bot.id };
    }

    const myAllies = new Set(options.chatSignals?.alliesByVoter[bot.id] || []);
    const mySuspects = new Set(options.chatSignals?.suspectsByVoter[bot.id] || []);
    const lover = bot.loverId ? alive.find((p) => p.id === bot.loverId) : null;
    const isCrossFactionLover = Boolean(
      lover && ROLES[bot.roleId].faction !== ROLES[lover.roleId].faction
    );

    // 1. Cross-Faction Lovers protect their pair (both Lover and self, since either death kills both!)
    if (isCrossFactionLover && lover) {
      const loverThreateners = accusersOf[lover.id] || new Set<string>();
      const selfThreateners = accusersOf[bot.id] || new Set<string>();
      const votingPair = new Set(
        (options.currentVotes || [])
          .filter((v) => v.targetId === lover.id || v.targetId === bot.id)
          .map((v) => v.voterId)
      );
      const scored = pool.map((p) => {
        let score = (brain.publicSuspicion[p.id] ?? 0) * 0.7;
        if (loverThreateners.has(p.id)) score += 90;
        if (selfThreateners.has(p.id)) score += 75;
        if (votingPair.has(p.id)) score += 85;
        if (mySuspects.has(p.id)) score += 45;
        if (myAllies.has(p.id)) score -= 25;
        score += (incomingVoteWeights[p.id] ?? 0) * 15;
        return { item: p, score };
      });
      const pick = pickWeightedTop(scored, rng, 10);
      return { voterId: bot.id, targetId: pick ? pick.id : pool[0].id };
    }

    // 2. Biting Werewolves (werewolf / wolf_pup)
    if (isBitingWolf(bot.roleId)) {
      const persona = brain.personas[bot.id] || 'observer';
      const scored = pool.map((p) => {
        if (isBitingWolf(p.roleId)) {
          // Check whether packmate p is doomed (>=45% vote pressure or Wolf Pup civil war gambit)
          const votesOnMate = incomingVoteWeights[p.id] ?? 0;
          const voteShare = totalVotingPower > 0 ? votesOnMate / totalVotingPower : 0;
          const mateSusp = brain.publicSuspicion[p.id] ?? 0;
          const seerCaughtMate = seerAccusedWolves.has(p.id);
          const doomedByVotes = voteShare >= 0.45;
          const doomedBySeer = seerCaughtMate && mateSusp >= 50;
          const pupGambit =
            brain.activeStoryline === 'wolf_civil_war' &&
            p.roleId === 'wolf_pup' &&
            (voteShare >= 0.3 || mateSusp >= 35 || seerCaughtMate);

          if (pupGambit) {
            return { item: p, score: 110 };
          }
          if (
            (doomedByVotes || doomedBySeer) &&
            (persona === 'manipulator' ||
              brain.activeStoryline === 'wolf_civil_war' ||
              voteShare >= 0.5)
          ) {
            return { item: p, score: 95 };
          }
          // Otherwise strongly avoid voting packmates
          return { item: p, score: -200 };
        }

        let score = 20 + (brain.publicSuspicion[p.id] ?? 0) * 0.9;
        if (coordinatedPackTarget && p.id === coordinatedPackTarget.id) score += 32;
        if (mySuspects.has(p.id)) score += 55;
        if (myAllies.has(p.id)) score -= 30;
        if (seerClaimers.includes(p.id)) score += 30;
        if (p.isMayor) score += brain.activeStoryline === 'mayor_coup' ? 35 : 15;
        score += (incomingVoteWeights[p.id] ?? 0) * 16;
        return { item: p, score };
      });
      const pick = pickWeightedTop(scored, rng, 10);
      return { voterId: bot.id, targetId: pick ? pick.id : pool[0].id };
    }

    // 3. Traitor (Werewolf faction, ZERO cheating: infers wolves from public accusations & protects them!)
    if (bot.roleId === 'traitor') {
      const inferredLikelyWolves = new Set<string>();
      for (const p of pool) {
        const susp = brain.publicSuspicion[p.id] ?? 0;
        const votesOn = incomingVoteWeights[p.id] ?? 0;
        if (
          accusedByAnySeer.has(p.id) ||
          susp >= 25 ||
          votesOn >= 2 ||
          (chatAccusedCounts[p.id] ?? 0) >= 2
        ) {
          inferredLikelyWolves.add(p.id);
        }
      }

      const scored = pool.map((p) => {
        let score = 15;
        // NEVER self-sabotage inferred wolves!
        if (inferredLikelyWolves.has(p.id)) {
          score -= 140;
        }
        // Counter-vote claimed Seer, power roles, Mayor, and vocal accusers of inferred wolves
        if (seerClaimers.includes(p.id)) score += 95;
        if (
          brain.publicClaims.some(
            (c) =>
              c.speakerId === p.id &&
              (c.claimedRole === 'witch' || c.claimedRole === 'bodyguard')
          )
        ) {
          score += 55;
        }
        if (p.isMayor) score += 45;
        for (const lw of inferredLikelyWolves) {
          if (accusersOf[lw]?.has(p.id)) score += 50;
        }
        // Push low-suspicion / trusted townies
        const susp = brain.publicSuspicion[p.id] ?? 0;
        if (susp <= -10) score += 35;
        if (mySuspects.has(p.id) && !inferredLikelyWolves.has(p.id)) score += 40;
        if (myAllies.has(p.id)) score -= 20;
        return { item: p, score };
      });
      const pick = pickWeightedTop(scored, rng, 10);
      return { voterId: bot.id, targetId: pick ? pick.id : pool[0].id };
    }

    // 4. Tanner (Neutral baiter: votes contrarian/shady to nudge self suspicion into 40..70)
    if (bot.roleId === 'tanner') {
      const currentSusp = brain.publicSuspicion[bot.id] ?? 0;
      if (currentSusp < 45) {
        adjustPublicSuspicion(brain, bot.id, 8);
      }
      const scored = pool.map((p) => {
        let score = 10;
        const susp = brain.publicSuspicion[p.id] ?? 0;
        // Vote trusted / Seer / Mayor to look suspicious, avoid helping lynch the current #1 wagon
        if (susp <= 0) score += 28;
        if (p.isMayor || seerClaimers.includes(p.id)) score += 32;
        score -= (incomingVoteWeights[p.id] ?? 0) * 20;
        return { item: p, score };
      });
      const pick = pickWeightedTop(scored, rng, 18);
      return { voterId: bot.id, targetId: pick ? pick.id : pool[0].id };
    }

    // 5. Villager-faction & Doppelganger bots (STRICTLY ZERO TELEPATHY!)
    const ownSeerChecks =
      bot.roleId === 'seer' ? brain.seerChecksByBot[bot.id] || {} : {};
    const ownWitchHealed =
      bot.roleId === 'witch' ? new Set(brain.witchHealedByBot[bot.id] || []) : new Set<string>();
    const persona = brain.personas[bot.id] || 'observer';

    const scored = pool.map((p) => {
      let score = (brain.publicSuspicion[p.id] ?? 0) * 1.0;

      // Role-legal private memory (strictly scoped to THIS bot!)
      if (ownSeerChecks[p.id] === 'wolf') score += 140;
      else if (ownSeerChecks[p.id] === 'good') score -= 95;
      if (ownWitchHealed.has(p.id)) score -= 45;

      // Public Seer claims (uncontested vs contested Twin Seers)
      if (uncontestedSeerId) {
        if (p.id === uncontestedSeerId) score -= 55;
        if (seerAccusedWolves.has(p.id)) score += 85;
        if (seerClearedGood.has(p.id)) score -= 50;
      } else if (seerClaimers.length >= 2) {
        // Contested Twin Seers: detectives/prosecutors focus on resolving the two Seer claimers
        if (seerClaimers.includes(p.id)) {
          score += persona === 'detective' || persona === 'prosecutor' ? 35 : 22;
        }
      }

      // Consistency with own Day Discussion statements (BUG-14)
      if (mySuspects.has(p.id)) score += 55;
      if (myAllies.has(p.id)) score -= 45;

      if (silentVotersSet.has(bot.id) && silentSet.has(p.id)) {
        score += 32;
      }

      // Lover defense (same-faction lovers still dislike anyone accusing their lover)
      if (lover && accusersOf[lover.id]?.has(p.id)) {
        score += 35;
      }

      // Organic coordination with Human / Mayor vote if credible
      if (options.humanTargetId && p.id === options.humanTargetId && !myAllies.has(p.id)) {
        const humanSusp = brain.publicSuspicion[brain.humanId] ?? 0;
        if (humanSusp < 30 && ownSeerChecks[p.id] !== 'good') {
          score += mayorId === brain.humanId ? 24 : 14;
        }
      }

      if (mayorId && (incomingVoteWeights[p.id] ?? 0) >= 2 && persona !== 'wildcard') {
        score += 10;
      }

      return { item: p, score };
    });

    const pick = pickWeightedTop(scored, rng, 18);
    return { voterId: bot.id, targetId: pick ? pick.id : pool[0].id };
  });
}

/**
 * Selects a zero-telepathy revenge shot target for an AI Bot Hunter using AIMatchBrain:
 * prioritizes top lynch instigators and highest public wolf suspects.
 */
export function pickSmartBotHunterTargetWithBrain(
  brain: AIMatchBrain,
  players: Player[],
  hunter: Player,
  options: {
    chatSignals?: SmartChatVoteSignals | null;
    lynchVoters?: string[];
    rng?: () => number;
  } = {}
): Player | null {
  const rng = options.rng ?? Math.random;
  const aliveOthers = players.filter((p) => p.isAlive && p.id !== hunter.id);
  if (aliveOthers.length === 0) return null;

  const nonLovers = aliveOthers.filter((p) => p.id !== hunter.loverId);
  const pool = nonLovers.length > 0 ? nonLovers : aliveOthers;

  const latestLynch = brain.voteHistory[brain.voteHistory.length - 1];
  const inferredLynchVoters =
    options.lynchVoters && options.lynchVoters.length > 0
      ? options.lynchVoters
      : latestLynch && latestLynch.lynchedId === hunter.id
      ? latestLynch.votes
          .filter((v) => v.targetId === hunter.id)
          .map((v) => v.voterId)
      : [];
  const lynchVoterSet = new Set(inferredLynchVoters);

  const seerClaimers = getLivingSeerClaimers(brain, players);
  const uncontestedSeerId = seerClaimers.length === 1 ? seerClaimers[0] : null;
  const seerWolfTargets = new Set(
    brain.publicClaims
      .filter(
        (c) =>
          c.claimedRole === 'seer' &&
          c.speakerId === uncontestedSeerId &&
          c.checkResult === 'wolf' &&
          c.targetId
      )
      .map((c) => c.targetId!)
  );
  const seerGoodTargets = new Set(
    brain.publicClaims
      .filter(
        (c) =>
          c.claimedRole === 'seer' &&
          c.speakerId === uncontestedSeerId &&
          c.checkResult === 'good' &&
          c.targetId
      )
      .map((c) => c.targetId!)
  );

  const mySuspects = new Set(options.chatSignals?.suspectsByVoter[hunter.id] || []);
  const myAllies = new Set(options.chatSignals?.alliesByVoter[hunter.id] || []);

  const scored = pool.map((p) => {
    let score = brain.publicSuspicion[p.id] ?? 0;
    if (lynchVoterSet.has(p.id)) score += 70;
    if (options.chatSignals?.suspectsByVoter[p.id]?.includes(hunter.id)) score += 30;
    if (seerWolfTargets.has(p.id)) score += 75;
    if (seerGoodTargets.has(p.id) || p.id === uncontestedSeerId) score -= 55;
    if (mySuspects.has(p.id)) score += 45;
    if (myAllies.has(p.id)) score -= 45;
    return { item: p, score };
  });

  return pickWeightedTop(scored, rng, 10) || pool[0];
}

// ============================================================================
// STAGGERED MULTI-BEAT DAY DISCUSSION, GALLOWS DEFENSE & LIVE HUMAN CHAT
// ============================================================================

function personaTagline(
  persona: BotPersonaId,
  lang: Language,
  targetName: string,
  rng: () => number
): string {
  const map: Record<BotPersonaId, Record<Language, string>[]> = {
    detective: [
      {
        vi: `Xâu chuỗi các dữ kiện từ đầu đến giờ, biểu hiện của ${targetName} có điểm vênh rất rõ — mọi người nên kiểm tra kỹ.`,
        en: `Connecting the clues so far, ${targetName}’s story doesn’t quite add up — let’s press them.`,
        fr: `En recoupant les indices depuis le début, l’histoire de ${targetName} ne tient pas vraiment — mettons la pression à ${targetName}.`,
        es: `Juntando las pistas hasta ahora, la historia de ${targetName} no termina de cuadrar — vamos a presionar a ${targetName}.`,
        ja: `ここまでの手がかりをつなぐと、${targetName}の話はどうも辻褄が合わないね — 突っ込んでみよう。`,
      },
      {
        vi: `Mình ghi chép lại nhịp bàn luận và thấy ${targetName} đang né trả lời trực diện.`,
        en: `Tracking the timeline carefully, ${targetName} has been dodging direct questions.`,
        fr: `En suivant bien la chronologie, ${targetName} esquive toutes les questions directes.`,
        es: `Siguiendo bien la cronología, ${targetName} lleva rato esquivando las preguntas directas.`,
        ja: `流れを追っていくと、${targetName}は直接の質問をずっとかわしてるよ。`,
      },
    ],
    prosecutor: [
      {
        vi: `Tôi nói thẳng luôn: ${targetName} đáng nghi nhất bàn lúc này, đừng chần chừ kẻo lỡ nhịp treo Sói!`,
        en: `Let’s be direct: ${targetName} looks like our top Wolf suspect right now — explain yourself!`,
        fr: `Soyons directs : ${targetName} est notre suspect n°1 pour le Loup-Garou en ce moment — explique-toi !`,
        es: `Vamos al grano: ${targetName} es el principal sospechoso de ser Lobo ahora mismo — ¡explícate!`,
        ja: `ハッキリ言うよ：今いちばん人狼っぽいのは${targetName}だ — ちゃんと説明して！`,
      },
      {
        vi: `Không cần vòng vo — tôi đang nghi ${targetName} là Sói và muốn nghe họ giải trình ngay!`,
        en: `No stalling — I suspect ${targetName} is a Werewolf and want answers before votes lock.`,
        fr: `Pas de détour — je soupçonne ${targetName} d’être un Loup-Garou et je veux des réponses avant la clôture des votes.`,
        es: `Sin rodeos: sospecho que ${targetName} es un Hombre Lobo y quiero respuestas antes de que se cierren los votos.`,
        ja: `回りくどいのはなし — ${targetName}は人狼だと思う。投票が締まる前に答えが聞きたい！`,
      },
    ],
    observer: [
      {
        vi: `Mình ngồi quan sát từ nãy giờ thấy thái độ của ${targetName} hơi khác thường, mọi người để ý thử xem.`,
        en: `Watching closely around the fire, ${targetName}’s reactions felt off to me.`,
        fr: `En observant bien autour du feu, les réactions de ${targetName} m’ont paru bizarres.`,
        es: `Mirando con atención alrededor de la hoguera, las reacciones de ${targetName} me parecieron raras.`,
        ja: `焚き火のまわりをよく見てたけど、${targetName}の反応はちょっと変だったな。`,
      },
      {
        vi: `Chưa vội kết luận, nhưng ${targetName} cần nói rõ góc nhìn hơn trước khi chốt phiếu.`,
        en: `I’m not rushing, but we need a clear read from ${targetName} before voting.`,
        fr: `Je ne m’emballe pas, mais on a besoin d’un avis clair de ${targetName} avant de voter.`,
        es: `No tengo prisa, pero necesitamos una opinión clara de ${targetName} antes de votar.`,
        ja: `焦るつもりはないけど、投票の前に${targetName}の考えをはっきり聞きたいな。`,
      },
    ],
    manipulator: [
      {
        vi: `Mọi người cẩn thận kẻo bị dắt mũi nhé — tôi thấy ${targetName} mới là người đáng nghi nhất ở đây.`,
        en: `Careful not to fall for distractions — ${targetName} is the one acting shady here.`,
        fr: `Attention à ne pas tomber dans le panneau — c’est ${targetName} qui a un comportement louche ici.`,
        es: `Ojo con las distracciones — el que actúa raro aquí es ${targetName}.`,
        ja: `惑わされないで — ここで怪しい動きをしてるのは${targetName}だよ。`,
      },
      {
        vi: `Đừng nhìn sai hướng! Nếu phân tích kỹ thì ${targetName} có động cơ rất lạ.`,
        en: `Everyone’s looking the wrong way; ${targetName}’s angle makes zero sense.`,
        fr: `Tout le monde regarde du mauvais côté ; la version de ${targetName} n’a aucun sens.`,
        es: `Todos están mirando hacia el lado equivocado; el planteamiento de ${targetName} no tiene ningún sentido.`,
        ja: `みんな見る方向が違うよ。${targetName}の言い分は筋が通ってない。`,
      },
    ],
    protector: [
      {
        vi: `Chúng ta phải bảo vệ phe Dân trước đã — ${targetName}, bạn giải thích rõ để cả làng khỏi vote nhầm đi.`,
        en: `We need to keep the village unified — ${targetName}, help clear your name so we don’t mislynch.`,
        fr: `Il faut garder le village uni — ${targetName}, aide-nous à te disculper pour qu’on ne pende pas un innocent.`,
        es: `Hay que mantener unido al pueblo — ${targetName}, ayúdanos a limpiar tu nombre para no linchar a un inocente.`,
        ja: `村はまとまっておかないと — ${targetName}、冤罪で吊らないように疑いを晴らしてほしい。`,
      },
      {
        vi: `Đừng vội xé lẻ phiếu, nhưng tôi cần ${targetName} chứng minh mình thuộc phe Dân.`,
        en: `Let’s stay disciplined and hear ${targetName}’s defense clearly.`,
        fr: `Restons disciplinés et écoutons bien la défense de ${targetName}.`,
        es: `Mantengamos la disciplina y escuchemos bien la defensa de ${targetName}.`,
        ja: `落ち着いて、${targetName}の弁明をちゃんと聞こう。`,
      },
    ],
    wildcard: [
      {
        vi: `Trực giác quanh lửa trại mách bảo tôi phải để mắt tới ${targetName} hôm nay — cảm giác lạ lắm!`,
        en: `My campfire gut says keep a close eye on ${targetName} today — something feels wild.`,
        fr: `Mon instinct de feu de camp me dit de surveiller ${targetName} aujourd’hui — il y a un truc bizarre.`,
        es: `Mi instinto de hoguera dice que vigilemos a ${targetName} hoy — algo huele raro.`,
        ja: `焚き火の勘が言ってる、今日は${targetName}から目を離すなって — なんか妙な感じ！`,
      },
      {
        vi: `Bàn này căng thật đấy! Tôi đặt dấu hỏi lớn lên ${targetName} xem phản ứng ra sao.`,
        en: `Plot twist energy today — I’m testing ${targetName} to see how they react!`,
        fr: `Ambiance rebondissement aujourd’hui — je teste ${targetName} pour voir sa réaction !`,
        es: `Hoy hay energía de giro de guion — ¡voy a probar a ${targetName} a ver cómo reacciona!`,
        ja: `今日は大どんでん返しの予感 — ${targetName}を試して、どう反応するか見てみるよ！`,
      },
    ],
  };
  return tr(lang, pickFrom(map[persona], rng));
}

/**
 * Generates 4-6 staggered, role-legal discussion beats across `dayDiscussSec`
 * (+1.5s, +5.5s, +10.5s, +16s, +22s, +27s).
 */
export function generateScheduledDiscussionBeats(
  brain: AIMatchBrain,
  context: DiscussionBeatContext
): ScheduledBotBeat[] {
  const rng = context.rng ?? Math.random;
  const { players, round, lang, killedNames } = context;
  const alive = players.filter((p) => p.isAlive);
  const aliveBots = alive.filter((p) => p.isBot);
  if (aliveBots.length === 0) return [];

  // Sync live bot Seer's inspection into its own private memory if provided
  const botSeer = aliveBots.find((b) => b.roleId === 'seer' && !b.hasUsedPower) || null;
  if (botSeer && context.seerInspection) {
    recordBotSeerInspection(
      brain,
      botSeer.id,
      context.seerInspection.playerId,
      context.seerInspection.isWerewolf
    );
  }

  const baseDelays = [1500, 5500, 10500, 16000, 22000, 27000];
  const maxAllowedMs = Math.max(
    6000,
    ((context.dayDiscussSec ?? 35) - 4) * 1000
  );
  const scale = maxAllowedMs < 22000 ? maxAllowedMs / 22000 : 1;
  const getDelay = (idx: number) =>
    Math.round((baseDelays[idx] ?? baseDelays[baseDelays.length - 1] + idx * 2500) * scale);

  const beats: ScheduledBotBeat[] = [];
  const usedSpeakers = new Set<string>();

  const pushBeat = (
    speaker: Player,
    text: string,
    extra?: { claimedRole?: RoleId; targetId?: string; checkResult?: 'wolf' | 'good' }
  ) => {
    usedSpeakers.add(speaker.id);
    brain.spokenCounts[speaker.id] = (brain.spokenCounts[speaker.id] ?? 0) + 1;
    if (extra?.claimedRole) {
      addPublicClaim(brain, {
        speakerId: speaker.id,
        claimedRole: extra.claimedRole,
        round,
        targetId: extra.targetId,
        checkResult: extra.checkResult,
      });
    }
    beats.push({
      delayMs: getDelay(beats.length),
      speakerId: speaker.id,
      speakerName: speaker.name,
      persona: brain.personas[speaker.id],
      text,
      ...extra,
    });
  };

  const pickUnusedBot = (predicate?: (b: Player) => boolean): Player | null => {
    const firstPass = aliveBots.filter(
      (b) => !usedSpeakers.has(b.id) && (!predicate || predicate(b))
    );
    if (firstPass.length > 0) return pickFrom(firstPass, rng);
    const anyUnused = aliveBots.filter((b) => !usedSpeakers.has(b.id));
    if (anyUnused.length > 0) return pickFrom(anyUnused, rng);
    const matchingAny = predicate ? aliveBots.filter(predicate) : aliveBots;
    return matchingAny.length > 0 ? pickFrom(matchingAny, rng) : null;
  };

  // Reserve real Bot Seer & designated Twin-Seers bluff Wolf so Beat 1 doesn't consume them
  const livingBotWolvesForReserve = aliveBots.filter((b) => isBitingWolf(b.roleId));
  const reservedBluffWolf =
    livingBotWolvesForReserve.find((b) => b.id === brain.wolfBluffPlan.bluffWolfId) ||
    livingBotWolvesForReserve[0] ||
    null;
  const reserveIds = new Set<string>();
  if (botSeer) reserveIds.add(botSeer.id);
  if (reservedBluffWolf && brain.activeStoryline === 'twin_seers') {
    reserveIds.add(reservedBluffWolf.id);
  }

  // --- BEAT 1 (+1.5s): Dawn Reaction (peaceful / single / double kill / Mayor transfer) ---
  const dawnSpeaker =
    pickUnusedBot((b) => {
      if (reserveIds.has(b.id)) return false;
      const p = brain.personas[b.id];
      return p === 'observer' || p === 'protector' || p === 'detective';
    }) ||
    pickUnusedBot((b) => !reserveIds.has(b.id)) ||
    aliveBots[0];

  if (dawnSpeaker) {
    let dawnText = '';
    if (context.mayorTransferredToName) {
      const crown = tr(lang, {
        vi: `👑 Vương miện Thị Trưởng đã chuyển sang ${context.mayorTransferredToName} (phiếu x2)!`,
        en: `👑 The Mayor’s crown passed to ${context.mayorTransferredToName} (2x vote)!`,
        fr: `👑 La couronne de Maire est passée à ${context.mayorTransferredToName} (vote x2) !`,
        es: `👑 ¡La corona de Alcalde pasó a ${context.mayorTransferredToName} (voto x2)!`,
        ja: `👑 村長の王冠が${context.mayorTransferredToName}に移った（2票分）！`,
      });
      const night =
        killedNames.length > 0
          ? tr(lang, {
            vi: `Đêm qua mất ${killedNames.join(', ')} — cả làng phải tỉnh táo kẻo quyền lực x2 rơi vào tay Sói!`,
            en: `We lost ${killedNames.join(', ')} overnight — stay sharp so double vote power doesn’t swing to the Wolves!`,
            fr: `On a perdu ${killedNames.join(', ')} cette nuit — restons vigilants pour que le vote double ne tombe pas aux mains des Loups !`,
            es: `Perdimos a ${killedNames.join(', ')} esta noche — ¡atentos para que el voto doble no acabe en manos de los Lobos!`,
            ja: `昨夜は${killedNames.join(', ')}を失った — 2倍の票の力が人狼に渡らないよう気を引き締めよう！`,
          })
          : tr(lang, {
            vi: 'Đêm qua bình yên, nhưng quyền lực Thị Trưởng sẽ quyết định bàn cân hôm nay!',
            en: 'A peaceful night, yet that 2x vote will shape today’s lynch!',
            fr: 'Nuit paisible, mais ce vote x2 va peser lourd dans le lynchage d’aujourd’hui !',
            es: 'Noche tranquila, ¡pero ese voto x2 decidirá el linchamiento de hoy!',
            ja: '静かな夜だったけど、その2票分が今日の処刑を左右するよ！',
          });
      dawnText = `${crown} ${night}`;
    } else if (killedNames.length === 0) {
      dawnText =
        brain.activeStoryline === 'silent_night_paranoia'
          ? tr(lang, {
            vi: 'Đêm qua hoàn toàn bình yên! Không biết Bảo Vệ đã đỡ chuẩn, Phù Thủy cứu người, hay Sói vừa cắn trúng Bán Sói / Già Làng nữa...',
            en: 'A completely silent night! Either the Bodyguard nailed the shield, the Witch healed, or the Wolves hit the Elder or Cursed...',
            fr: 'Nuit totalement calme ! Soit le Salvateur a bien protégé, soit la Sorcière a soigné, soit les Loups ont mordu l’Ancien ou le Maudit...',
            es: '¡Noche completamente tranquila! O el Guardaespaldas acertó con el escudo, o la Bruja curó, o los Lobos mordieron al Anciano o al Maldito...',
            ja: '完全に静かな夜！騎士が見事に守ったか、魔女が治したか、人狼が長老か呪われし者を噛んだか…',
          })
          : tr(lang, {
            vi: 'Đêm qua không ai tử trận! Một pha cứu người quá xuất sắc, nhưng đừng chủ quan vì đàn Sói vẫn đang ngồi ngay quanh lửa trại.',
            en: 'Zero casualties overnight! Great save for the village, though the Wolves are still sitting right beside us.',
            fr: 'Aucune victime cette nuit ! Beau sauvetage pour le village, mais les Loups sont toujours assis juste à côté de nous.',
            es: '¡Ninguna baja esta noche! Gran salvada para el pueblo, aunque los Lobos siguen sentados justo a nuestro lado.',
            ja: '昨夜は犠牲者ゼロ！村にとってはナイスな救出だけど、人狼はまだすぐそばに座ってるよ。',
          });
    } else if (killedNames.length >= 2) {
      dawnText = tr(lang, {
        vi: `Trời ơi, một đêm đẫm máu — mất tới ${killedNames.length} người (${killedNames.join(', ')})! Chắc chắn có liên kết Tình Nhân, Bình Độc Phù Thủy, hoặc Sói Con cuồng nộ rồi!`,
        en: `A brutal night — we lost ${killedNames.length} villagers (${killedNames.join(', ')})! Lovers, Witch Poison, or Wolf Pup frenzy is definitely in play!`,
        fr: `Quelle nuit sanglante — on a perdu ${killedNames.length} villageois (${killedNames.join(', ')}) ! Les Amoureux, le poison de la Sorcière ou la rage du Chiot Loup sont forcément en jeu !`,
        es: `¡Qué noche tan brutal! Perdimos a ${killedNames.length} aldeanos (${killedNames.join(', ')}). ¡Seguro que hay Enamorados, veneno de la Bruja o frenesí del Cachorro de Lobo de por medio!`,
        ja: `なんて血まみれの夜 — ${killedNames.length}人も失った（${killedNames.join(', ')}）！恋人の連鎖か、魔女の毒か、子狼の暴走が絡んでるに違いない！`,
      });
    } else {
      dawnText = tr(lang, {
        vi: `Đêm qua ${killedNames[0]} đã ngã xuống rồi... Mọi người bình tĩnh chia sẻ thông tin trước khi dồn phiếu nhé.`,
        en: `We lost ${killedNames[0]} last night... Let’s share reads calmly before locking votes.`,
        fr: `On a perdu ${killedNames[0]} cette nuit... Partageons calmement nos impressions avant de verrouiller les votes.`,
        es: `Perdimos a ${killedNames[0]} anoche... Compartamos nuestras sospechas con calma antes de cerrar los votos.`,
        ja: `昨夜は${killedNames[0]}が倒れた... 投票を確定する前に、落ち着いて情報を共有しよう。`,
      });
    }
    pushBeat(dawnSpeaker, dawnText);
  }

  // --- BEAT 2 (+5.5s): Real Bot Seer Claim (or Witch/Guard soft-vouch / Detective lead) ---
  let realSeerClaimedId: string | null = null;
  let realSeerAccusedId: string | null = null;

  if (botSeer) {
    const checks = brain.seerChecksByBot[botSeer.id] || {};
    const livingWolfCheck = Object.entries(checks).find(
      ([tid, res]) => res === 'wolf' && alive.some((p) => p.id === tid)
    );
    const livingGoodCheck = Object.entries(checks).find(
      ([tid, res]) => res === 'good' && alive.some((p) => p.id === tid)
    );

    if (livingWolfCheck) {
      const target = alive.find((p) => p.id === livingWolfCheck[0])!;
      realSeerClaimedId = botSeer.id;
      realSeerAccusedId = target.id;
      adjustPublicSuspicion(brain, target.id, 45);
      const text = tr(lang, {
        vi: `Tôi lên vai luôn: tôi là Tiên Tri thật! Đêm qua tôi đã soi ${target.name} và kết quả là MA SÓI — đề nghị cả làng treo cổ ${target.name} ngay hôm nay!`,
        en: `Stepping forward now: I am the real Seer! I inspected ${target.name} and saw WEREWOLF — we must vote ${target.name} out today!`,
        fr: `Je me dévoile : je suis la vraie Voyante ! J’ai sondé ${target.name} et c’est LOUP-GAROU — on doit voter ${target.name} dehors dès aujourd’hui !`,
        es: `Doy un paso al frente: ¡soy la verdadera Vidente! Inspeccioné a ${target.name} y salió HOMBRE LOBO — ¡hay que votar a ${target.name} hoy mismo!`,
        ja: `名乗り出るよ：私が本物の占い師だ！${target.name}を占ったら人狼だった — 今日は${target.name}を吊るべき！`,
      });
      pushBeat(botSeer, text, {
        claimedRole: 'seer',
        targetId: target.id,
        checkResult: 'wolf',
      });
    } else if (livingGoodCheck) {
      const target = alive.find((p) => p.id === livingGoodCheck[0])!;
      const shouldHardClaim = brain.activeStoryline === 'twin_seers' || round >= 2;
      if (shouldHardClaim) {
        realSeerClaimedId = botSeer.id;
        adjustPublicSuspicion(brain, target.id, -28);
        const text = tr(lang, {
          vi: `Tôi nhận vai Tiên Tri để dẫn bàn: tôi đã soi ${target.name} thuộc phe Dân Làng (người tốt). Nếu có ai khác nhận Tiên Tri thì chắc chắn là Sói giả!`,
          en: `Claiming Seer to anchor town: I checked ${target.name} as GOOD (Villager side). Anyone counter-claiming Seer is a lying Wolf!`,
          fr: `Je me déclare Voyante pour guider le village : j’ai sondé ${target.name}, c’est un BON (côté Villageois). Quiconque se déclare Voyante après moi est un Loup qui ment !`,
          es: `Me declaro Vidente para guiar al pueblo: comprobé a ${target.name} y es BUENO (bando Aldeano). ¡Quien se declare Vidente después de mí es un Lobo mentiroso!`,
          ja: `村をまとめるために占い師を名乗るよ：${target.name}を占ったら善良（村人側）だった。対抗で占い師を名乗る人は嘘つきの人狼だ！`,
        });
        pushBeat(botSeer, text, {
          claimedRole: 'seer',
          targetId: target.id,
          checkResult: 'good',
        });
      } else {
        // Subtle Day 1 safe vouch (does NOT leak Seer role!)
        adjustPublicSuspicion(brain, target.id, -12);
        const text = tr(lang, {
          vi: `Cảm giác của mình vòng này là ${target.name} khá đáng tin và thuộc phe Dân, mọi người khoan nhắm vào họ.`,
          en: `My early read is that ${target.name} seems clean and trustworthy — let’s look elsewhere first.`,
          fr: `Mon premier ressenti, c’est que ${target.name} a l’air clean et digne de confiance — regardons ailleurs d’abord.`,
          es: `Mi primera impresión es que ${target.name} parece limpio y de fiar — mejor miremos primero a otro lado.`,
          ja: `最初の印象だと${target.name}は白っぽくて信用できそう — まずは他を見てみよう。`,
        });
        pushBeat(botSeer, text);
      }
    }
  }

  // --- BEAT 3 (+10.5s): Fake-Seer Wolf Counter-Claim (Twin Seers!) OR Traitor Defense OR Wolf Deflection ---
  const livingBotWolves = aliveBots.filter((b) => isBitingWolf(b.roleId));
  const bluffWolf =
    livingBotWolves.find((b) => b.id === brain.wolfBluffPlan.bluffWolfId) ||
    livingBotWolves[0] ||
    null;
  const anyWolfExposed =
    Boolean(
      realSeerAccusedId &&
        livingBotWolves.some((w) => w.id === realSeerAccusedId)
    ) ||
    livingBotWolves.some((w) => (brain.publicSuspicion[w.id] ?? 0) >= 40);

  const shouldCounterClaimSeer =
    Boolean(bluffWolf && !usedSpeakers.has(bluffWolf.id)) &&
    (brain.activeStoryline === 'twin_seers' ||
      (anyWolfExposed && !brain.wolfBluffPlan.hasClaimed));

  if (shouldCounterClaimSeer && bluffWolf) {
    // Pick a non-wolf, non-lover frame target (prefer real Seer claimer if one just claimed!)
    const nonWolfTargets = alive.filter(
      (p) => !isBitingWolf(p.roleId) && p.id !== bluffWolf.id && p.id !== bluffWolf.loverId
    );
    const frameTarget =
      (realSeerClaimedId && nonWolfTargets.find((p) => p.id === realSeerClaimedId)) ||
      nonWolfTargets.find((p) => p.id === brain.humanId) ||
      (nonWolfTargets.length > 0 ? pickFrom(nonWolfTargets, rng) : null);

    if (frameTarget) {
      brain.wolfBluffPlan.hasClaimed = true;
      brain.wolfBluffPlan.targetVillagerId = frameTarget.id;
      adjustPublicSuspicion(brain, frameTarget.id, 22);
      const text = realSeerClaimedId
        ? tr(lang, {
          vi: `Khoan đã! Đừng tin lời giả mạo — TÔI mới là Tiên Tri thật! Đêm qua tôi soi chính ${frameTarget.name} ra MA SÓI, họ đang cố đóng kịch để lừa cả làng!`,
          en: `Hold everything! Don’t buy that bluff — I am the REAL Seer! I checked ${frameTarget.name} as WEREWOLF; they’re panicking and faking a claim!`,
          fr: `Stop ! N’avalez pas ce bluff — c’est MOI la VRAIE Voyante ! J’ai sondé ${frameTarget.name} : LOUP-GAROU ; ça panique et ça invente une révélation !`,
          es: `¡Un momento! No caigan en ese farol — ¡la VERDADERA Vidente soy YO! Comprobé a ${frameTarget.name} como HOMBRE LOBO; está en pánico e inventando una revelación!`,
          ja: `ちょっと待って！そのハッタリに騙されないで — 本物の占い師は私だ！${frameTarget.name}を占ったら人狼だった。向こうは焦って偽の告白をしてるんだ！`,
        })
        : tr(lang, {
          vi: `Tôi lên nhận Tiên Tri luôn cho rõ ràng: đêm qua tôi soi ${frameTarget.name} và thấy dấu hiệu MA SÓI! Mọi người đừng để họ dẫn dắt!`,
          en: `Stepping up as Seer: I inspected ${frameTarget.name} last night and got WEREWOLF! Don’t let them control the table!`,
          fr: `Je me déclare Voyante : j’ai sondé ${frameTarget.name} cette nuit et c’est LOUP-GAROU ! Ne les laissez pas mener la table !`,
          es: `Me declaro Vidente: anoche inspeccioné a ${frameTarget.name} ¡y salió HOMBRE LOBO! ¡No dejen que controlen la mesa!`,
          ja: `占い師として名乗り出るよ：昨夜${frameTarget.name}を占ったら人狼だった！あの人に場を支配させないで！`,
        });
      pushBeat(bluffWolf, text, {
        claimedRole: 'seer',
        targetId: frameTarget.id,
        checkResult: 'wolf',
      });
    }
  } else {
    const botTraitor = aliveBots.find(
      (b) => b.roleId === 'traitor' && !usedSpeakers.has(b.id)
    );
    if (botTraitor && realSeerClaimedId && realSeerAccusedId) {
      const claimedSeerObj = alive.find((p) => p.id === realSeerClaimedId);
      const accusedObj = alive.find((p) => p.id === realSeerAccusedId);
      if (claimedSeerObj && accusedObj) {
        adjustPublicSuspicion(brain, claimedSeerObj.id, 15);
        const text = tr(lang, {
          vi: `Mọi người khoan vội tin ${claimedSeerObj.name}! Lên nhận Tiên Tri vội như vậy rất dễ là Sói giả để đổ oan cho ${accusedObj.name} đấy!`,
          en: `Hold on — don’t blindly trust ${claimedSeerObj.name}! Rushing a Seer claim to frame ${accusedObj.name} screams Wolf bait!`,
          fr: `Minute — ne faites pas confiance aveuglément à ${claimedSeerObj.name} ! Se précipiter pour se déclarer Voyante et accuser ${accusedObj.name}, ça sent le Loup à plein nez !`,
          es: `¡Un momento, no confíen a ciegas en ${claimedSeerObj.name}! Apresurarse a declararse Vidente para inculpar a ${accusedObj.name} ¡huele a Lobo a kilómetros!`,
          ja: `ちょっと待って、${claimedSeerObj.name}を鵜呑みにしないで！慌てて占い師を名乗って${accusedObj.name}を陥れようなんて、人狼の罠そのものだよ！`,
        });
        pushBeat(botTraitor, text);
      }
    } else if (
      brain.activeStoryline === 'wolf_civil_war' &&
      round >= 2 &&
      livingBotWolves.length >= 2
    ) {
      const pup = livingBotWolves.find((w) => w.roleId === 'wolf_pup');
      const alpha = livingBotWolves.find((w) => w.id !== pup?.id && !usedSpeakers.has(w.id));
      if (pup && alpha) {
        adjustPublicSuspicion(brain, pup.id, 20);
        const text = tr(lang, {
          vi: `Nói thật lòng, tôi thấy biểu hiện của ${pup.name} vòng này cực kỳ bất ổn — nếu cả làng nghi thì tôi cũng sẵn sàng vote ${pup.name}!`,
          en: `Honestly, ${pup.name}’s reads feel super sketchy this round — if town wants to test ${pup.name}, I’m willing to vote them!`,
          fr: `Franchement, le comportement de ${pup.name} est super louche ce tour — si le village veut tester ${pup.name}, je suis prêt à voter contre !`,
          es: `Sinceramente, las lecturas de ${pup.name} me parecen muy turbias esta ronda — si el pueblo quiere probar a ${pup.name}, ¡estoy dispuesto a votar por ${pup.name}!`,
          ja: `正直、今ラウンドの${pup.name}の動きはかなり怪しい — 村が${pup.name}を試したいなら、私も投票するよ！`,
        });
        pushBeat(alpha, text);
      }
    }
  }

  // --- BEAT 4 (+16.0s): Vote-History Cross-Examination OR Unspoken Seat Check (NEVER accuses someone who just spoke!) ---
  const crossExaminer = pickUnusedBot(
    (b) => brain.personas[b.id] === 'detective' || brain.personas[b.id] === 'prosecutor'
  );
  if (crossExaminer) {
    const isWolfSpeaker = isBitingWolf(crossExaminer.roleId);
    const validTargets = alive.filter(
      (p) =>
        p.id !== crossExaminer.id &&
        p.id !== crossExaminer.loverId &&
        (!isWolfSpeaker || !isBitingWolf(p.roleId))
    );

    const prevSnapshot = brain.voteHistory[brain.voteHistory.length - 1];
    let crossText = '';

    if (round >= 2 && prevSnapshot && prevSnapshot.votes.length > 0 && validTargets.length > 0) {
      // Find a living target who cast a notable vote in the previous round
      const prevVoteTarget =
        validTargets.find((p) => {
          const v = prevSnapshot.votes.find((rec) => rec.voterId === p.id);
          if (!v) return false;
          if (prevSnapshot.lynchedRoleId && isBitingWolf(prevSnapshot.lynchedRoleId)) {
            return v.targetId !== prevSnapshot.lynchedId;
          }
          return Boolean(prevSnapshot.lynchedId && v.targetId === prevSnapshot.lynchedId);
        }) || validTargets[0];

      const prevVote = prevSnapshot.votes.find((rec) => rec.voterId === prevVoteTarget.id);
      const votedForObj = prevVote
        ? players.find((p) => p.id === prevVote.targetId)
        : null;
      adjustPublicSuspicion(brain, prevVoteTarget.id, 14);
      const votedName = votedForObj
        ? votedForObj.name
        : tr(lang, {
          vi: 'mục tiêu lệch nhịp',
          en: 'an off-wagon target',
          fr: 'une cible à contre-courant',
          es: 'un objetivo a contracorriente',
          ja: '流れに逆らう相手',
        });
      const voteText = tr(lang, {
        vi: `Lật lại lịch sử phiếu Ngày ${prevSnapshot.round}: ${prevVoteTarget.name} đã bỏ phiếu cho ${votedName} — hành động đó rất đáng nghi!`,
        en: `Checking Day ${prevSnapshot.round}’s vote log: ${prevVoteTarget.name} voted for ${votedName} — that vote trail looks very suspicious!`,
        fr: `Je repasse le journal des votes du Jour ${prevSnapshot.round} : ${prevVoteTarget.name} a voté pour ${votedName} — cette piste de vote est très suspecte !`,
        es: `Revisando el registro de votos del Día ${prevSnapshot.round}: ${prevVoteTarget.name} votó por ${votedName} — ¡ese rastro de votos es muy sospechoso!`,
        ja: `${prevSnapshot.round}日目の投票記録を見直すと、${prevVoteTarget.name}は${votedName}に投票してる — この投票の流れはすごく怪しい！`,
      });
      crossText =
        lang === 'vi'
          ? `${voteText} ${personaTagline(
              brain.personas[crossExaminer.id] || 'detective',
              lang,
              prevVoteTarget.name,
              rng
            )}`
          : voteText;
    } else {
      // Quiet-seat check: STRICTLY exclude anyone who already spoke in this batch!
      const trulyQuiet = validTargets.filter(
        (p) => !usedSpeakers.has(p.id) && (brain.spokenCounts[p.id] ?? 0) === 0
      );
      const pickPool = trulyQuiet.length > 0 ? trulyQuiet : validTargets;
      if (pickPool.length > 0) {
        const target = pickFrom(pickPool, rng);
        if (round <= 1) {
          crossText = tr(lang, {
            vi: `Vòng 1 còn ít manh mối — ${target.name}, góc nhìn của bạn quanh lửa trại lúc này nghiêng về ai nhất?`,
            en: `Day 1 clues are still fresh — ${target.name}, who’s giving you the strangest read around the fire?`,
            fr: `Les indices du Jour 1 sont encore frais — ${target.name}, qui te paraît le plus étrange autour du feu ?`,
            es: `Las pistas del Día 1 son todavía recientes — ${target.name}, ¿quién te da la sensación más extraña junto a la hoguera?`,
            ja: `1日目はまだ手がかりが少ないね — ${target.name}、焚き火のまわりで一番変だと思う人は誰？`,
          });
        } else {
          adjustPublicSuspicion(brain, target.id, 12);
          crossText = trulyQuiet.includes(target)
            ? tr(lang, {
              vi: `Từ đầu đến giờ ${target.name} chưa lên tiếng phân tích gì — sự im lặng đó khiến tôi bắt đầu nghi ngờ.`,
              en: `${target.name} hasn’t spoken up yet today — staying that quiet makes me suspicious.`,
              fr: `${target.name} n’a encore rien dit aujourd’hui — rester aussi silencieux commence à me paraître suspect.`,
              es: `${target.name} todavía no ha dicho nada hoy — tanto silencio me empieza a parecer sospechoso.`,
              ja: `${target.name}は今日まだ一言も発言してない — そんなに静かだと怪しく思えてくるよ。`,
            })
            : personaTagline(
                brain.personas[crossExaminer.id] || 'detective',
                lang,
                target.name,
                rng
              );
        }
      }
    }

    if (crossText) {
      pushBeat(crossExaminer, crossText);
    }
  }

  // --- BEAT 5 (+22.0s): Role Flavor (Tanner bait / Witch soft-vouch / Mayor Coup / Lover defense / Persona wrap) ---
  const botTanner = aliveBots.find(
    (b) => b.roleId === 'tanner' && !usedSpeakers.has(b.id)
  );
  const botWitch = aliveBots.find(
    (b) => b.roleId === 'witch' && !usedSpeakers.has(b.id)
  );
  const witchHealedLiving = botWitch
    ? (brain.witchHealedByBot[botWitch.id] || [])
        .map((id) => alive.find((p) => p.id === id))
        .find((p): p is Player => Boolean(p && p.id !== botWitch.id))
    : undefined;

  if (botTanner && (brain.activeStoryline === 'jester_mindgame' || rng() < 0.75)) {
    // Nudge Tanner suspicion into the 40..70 bait sweet spot
    const cur = brain.publicSuspicion[botTanner.id] ?? 0;
    if (cur < 55) adjustPublicSuspicion(brain, botTanner.id, 22);
    const tannerText = tr(lang, pickFrom([
      {
        vi: 'Ơ hay, sao tự dưng mấy ánh mắt cứ liếc sang tôi thế? Tôi chẳng biết đêm qua có chuyện gì đâu, ai thích thì cứ thử vote tôi đi!',
        en: 'Wait, why are people glancing at me? I slept through the whole night — go ahead and vote me if you dare!',
        fr: 'Attends, pourquoi tout le monde me regarde ? J’ai dormi toute la nuit — votez pour moi si vous osez !',
        es: 'Un momento, ¿por qué me miran todos? Me dormí toda la noche — ¡voten por mí si se atreven!',
        ja: 'え、なんでみんなこっちをチラチラ見てるの？昨夜はずっと寝てたよ — やれるものなら投票してみなよ！',
      },
      {
        vi: 'Bàn này suy luận rối rắm quá... Tôi chán giải thích rồi, các người muốn nghi tôi là Sói thì cứ tự nhiên!',
        en: 'This debate is exhausting... I’m done defending myself, suspect me if you want!',
        fr: 'Ce débat est épuisant... J’en ai marre de me défendre, soupçonnez-moi si ça vous chante !',
        es: 'Este debate es agotador... Ya me cansé de defenderme, ¡sospechen de mí si quieren!',
        ja: 'この議論、疲れる… もう弁解するのは飽きた、疑いたいなら好きに疑って！',
      },
    ], rng));
    pushBeat(botTanner, tannerText);
  } else if (botWitch && witchHealedLiving) {
    adjustPublicSuspicion(brain, witchHealedLiving.id, -18);
    const witchText = tr(lang, {
      vi: `Tôi có lý do rất chắc chắn để tin ${witchHealedLiving.name} là người tốt — hôm nay tuyệt đối đừng treo nhầm ${witchHealedLiving.name}!`,
      en: `I have solid reason to trust ${witchHealedLiving.name} is clean — let’s definitely not lynch ${witchHealedLiving.name} today!`,
      fr: `J’ai de solides raisons de croire que ${witchHealedLiving.name} est clean — on ne pend surtout pas ${witchHealedLiving.name} aujourd’hui !`,
      es: `Tengo buenas razones para confiar en que ${witchHealedLiving.name} está limpio — ¡hoy desde luego no linchemos a ${witchHealedLiving.name}!`,
      ja: `${witchHealedLiving.name}が白だと信じる確かな理由があるんだ — 今日は絶対に${witchHealedLiving.name}を吊らないで！`,
    });
    pushBeat(botWitch, witchText);
  } else if (brain.activeStoryline === 'mayor_coup' && context.mayorId) {
    const mayorObj = alive.find((p) => p.id === context.mayorId);
    const speaker = pickUnusedBot((b) => b.id !== context.mayorId);
    if (mayorObj && speaker) {
      const text = tr(lang, {
        vi: `Thị Trưởng ${mayorObj.name} đang cầm lá phiếu x2 quyền lực nhất bàn! ${mayorObj.name} định dẫn phiếu về phía ai để cả làng theo dõi?`,
        en: `Mayor ${mayorObj.name} holds the decisive 2x vote! Where are you leading today’s vote, ${mayorObj.name}?`,
        fr: `Le Maire ${mayorObj.name} détient le vote x2 décisif ! Vers qui diriges-tu le vote d’aujourd’hui, ${mayorObj.name} ?`,
        es: `¡El Alcalde ${mayorObj.name} tiene el voto x2 decisivo! ¿Hacia quién vas a llevar el voto de hoy, ${mayorObj.name}?`,
        ja: `村長の${mayorObj.name}が決定的な2票分を握ってる！今日の投票はどこへ導くの、${mayorObj.name}？`,
      });
      pushBeat(speaker, text);
    }
  } else {
    const flavorBot = pickUnusedBot();
    if (flavorBot) {
      const isWolfSpeaker = isBitingWolf(flavorBot.roleId);
      const candidates = alive.filter(
        (p) =>
          p.id !== flavorBot.id &&
          p.id !== flavorBot.loverId &&
          (!isWolfSpeaker || !isBitingWolf(p.roleId))
      );
      if (candidates.length > 0) {
        const topSuspect =
          [...candidates].sort(
            (a, b) => (brain.publicSuspicion[b.id] ?? 0) - (brain.publicSuspicion[a.id] ?? 0)
          )[0] || candidates[0];
        const text = personaTagline(
          brain.personas[flavorBot.id] || 'observer',
          lang,
          topSuspect.name,
          rng
        );
        pushBeat(flavorBot, text);
      }
    }
  }

  // --- Ensure at least 4 paced beats whenever >= 4 living bots exist (plus optional 5th/6th Twin-Seers reaction!) ---
  const seerClaimersNow = getLivingSeerClaimers(brain, players);
  if (seerClaimersNow.length >= 2 && beats.length < 6) {
    const reactor = pickUnusedBot((b) => !seerClaimersNow.includes(b.id));
    if (reactor) {
      const names = seerClaimersNow
        .map((id) => alive.find((p) => p.id === id)?.name)
        .filter(Boolean)
        .join(' vs ');
      const text = tr(lang, {
        vi: `Căng thẳng tột độ rồi: ${names} cùng nhận Tiên Tri! Chắc chắn 1 trong 2 là Ma Sói giả danh — hôm nay phải soi cực kỹ!`,
        en: `Huge clash: ${names} are BOTH claiming Seer! One of them is 100% a lying Wolf — focus the vote right here!`,
        fr: `Gros clash : ${names} se déclarent TOUS LES DEUX Voyante ! L’un des deux est à 100 % un Loup menteur — concentrons le vote ici !`,
        es: `Choque enorme: ¡${names} se declaran AMBOS Vidente! Uno de los dos es 100 % un Lobo mentiroso — ¡centremos el voto aquí!`,
        ja: `大衝突だ：${names}が両方とも占い師を名乗ってる！どちらかは100％嘘つきの人狼 — 投票はここに集中しよう！`,
      });
      pushBeat(reactor, text);
    }
  }

  while (beats.length < Math.min(4, aliveBots.length)) {
    const extraBot = pickUnusedBot();
    if (!extraBot) break;
    const isWolfSpeaker = isBitingWolf(extraBot.roleId);
    const others = alive.filter(
      (p) =>
        p.id !== extraBot.id &&
        p.id !== extraBot.loverId &&
        (!isWolfSpeaker || !isBitingWolf(p.roleId))
    );
    const target = others.length > 0 ? pickFrom(others, rng) : null;
    if (!target) break;
    pushBeat(
      extraBot,
      personaTagline(brain.personas[extraBot.id] || 'observer', lang, target.name, rng)
    );
  }

  return beats.slice(0, 6);
}

/**
 * When a bot leads the Day Voting tally, generates a tense role-appropriate
 * last-minute gallows defense (+2.5s).
 */
export function generateGallowsDefenseBeat(
  brain: AIMatchBrain,
  context: GallowsDefenseContext
): ScheduledBotBeat | null {
  const rng = context.rng ?? Math.random;
  const { players, votes, mayorId, round, lang } = context;
  const alive = players.filter((p) => p.isAlive);
  const counts = computeMayorWeightedCounts(votes, mayorId);

  let leaderId: string | null = null;
  let maxVotes = 0;
  for (const [id, count] of Object.entries(counts)) {
    if (count > maxVotes) {
      maxVotes = count;
      leaderId = id;
    }
  }

  const minVotesToTrigger = alive.length <= 4 ? 1 : 2;
  if (!leaderId || maxVotes < minVotesToTrigger) return null;

  const leader = alive.find((p) => p.id === leaderId && p.isBot);
  if (!leader) return null;

  const topVoterRecord = votes.find(
    (v) => v.targetId === leader.id && v.voterId !== leader.id
  );
  const accuser = topVoterRecord
    ? alive.find((p) => p.id === topVoterRecord.voterId)
    : null;

  let text = '';
  let claimedRole: RoleId | undefined;

  if (leader.roleId === 'tanner') {
    adjustPublicSuspicion(brain, leader.id, 14);
    text = tr(lang, {
      vi: 'Được thôi, cứ dồn phiếu treo cổ tôi đi! Các người sai lầm rồi, nhưng tôi chẳng thèm van xin đâu!',
      en: 'Fine, go ahead and hang me! You’re all making a huge mistake, and I’m not begging!',
      fr: 'Très bien, pendez-moi ! Vous faites tous une énorme erreur, et je ne vais pas supplier !',
      es: '¡Está bien, cuélguenme! Todos están cometiendo un error enorme, ¡y no pienso suplicar!',
      ja: 'いいよ、吊るしたければ吊るせば！みんな大きな間違いをしてるけど、私は命乞いなんてしないからね！',
    });
  } else if (leader.roleId === 'hunter') {
    claimedRole = 'hunter';
    const pusher = accuser
      ? accuser.name
      : tr(lang, {
        vi: 'kẻ đẩy phiếu mạnh nhất',
        en: 'whoever pushed this wagon',
        fr: 'celui qui a lancé ce vote',
        es: 'quien haya empujado este voto',
        ja: 'この投票を扇動した人',
      });
    text = tr(lang, {
      vi: `Khoan đã! Tôi là Thợ Săn — nếu bị treo cổ hôm nay, phát súng cuối cùng của tôi sẽ bắn thẳng vào ${pusher}! Đừng để Sói cười thầm!`,
      en: `Wait! I’m the Hunter — if you lynch me today, my dying bullet goes straight into ${pusher}!`,
      fr: `Attendez ! Je suis le Chasseur — si vous me pendez aujourd’hui, ma dernière balle ira droit dans ${pusher} !`,
      es: `¡Esperen! Soy el Cazador — si me linchan hoy, ¡mi última bala va directa a ${pusher}!`,
      ja: `待って！私はハンターだ — 今日吊るされたら、最期の一発は${pusher}に撃ち込むよ！`,
    });
  } else if (leader.roleId === 'elder') {
    claimedRole = 'elder';
    text = tr(lang, {
      vi: 'Dừng tay ngay cả làng! Tôi chính là Già Làng — treo cổ nhầm tôi thì toàn bộ Tiên Tri, Bảo Vệ và Phù Thủy sẽ bị phong ấn mất hết kỹ năng đấy!',
      en: 'Stop the vote! I am the Elder — lynching me will seal ALL Villager special powers for the rest of the match!',
      fr: 'Arrêtez le vote ! Je suis l’Ancien — me pendre scellera TOUS les pouvoirs spéciaux des Villageois jusqu’à la fin de la partie !',
      es: '¡Paren la votación! Soy el Anciano — si me linchan se sellarán TODOS los poderes especiales de los Aldeanos el resto de la partida!',
      ja: '投票をやめて！私は長老だ — 私を吊ると、残りの試合中、村人の特殊能力がすべて封印されるよ！',
    });
  } else if (leader.roleId === 'seer') {
    claimedRole = 'seer';
    const checks = Object.entries(brain.seerChecksByBot[leader.id] || {})
      .map(([id, res]) => {
        const name = players.find((p) => p.id === id)?.name || id;
        return `${name}=${res === 'wolf' ? tr(lang, {
            vi: 'Sói',
            en: 'Wolf',
            fr: 'Loup',
            es: 'Lobo',
            ja: '人狼',
          }) : tr(lang, {
            vi: 'Dân',
            en: 'Good',
            fr: 'Villageois',
            es: 'Aldeano',
            ja: '村人',
          })}`;
      })
      .join(', ');
    text = tr(lang, {
      vi: `Đừng treo tôi — tôi là Tiên Tri thật!${checks ? ` Lịch sử soi của tôi: ${checks}.` : ''} Chuyển phiếu sang kẻ đang gài bẫy tôi ngay!`,
      en: `Don’t lynch your real Seer!${checks ? ` My checks: ${checks}.` : ''} Flip the vote onto the real wolves!`,
      fr: `Ne pendez pas votre vraie Voyante !${checks ? ` Mes sondages : ${checks}.` : ''} Reportez le vote sur les vrais loups !`,
      es: `¡No linchen a su verdadera Vidente!${checks ? ` Mis comprobaciones: ${checks}.` : ''} ¡Pasen el voto a los verdaderos lobos!`,
      ja: `本物の占い師を吊らないで！${checks ? ` 私の占い結果：${checks}。` : ''} 本物の人狼に票を移して！`,
    });
  } else if (leader.roleId === 'bodyguard' || leader.roleId === 'witch') {
    claimedRole = leader.roleId;
    const roleLabel = ROLES[leader.roleId].name[lang] || ROLES[leader.roleId].name.vi;
    text = tr(lang, {
      vi: `Bình tĩnh đã! Tôi là ${roleLabel} đang âm thầm giữ mạng cho làng — mất tôi đêm nay bầy Sói sẽ làm loạn mất!`,
      en: `Hold on! I’m the ${roleLabel} keeping this village alive — losing me tonight hands the game to the Wolves!`,
      fr: `Doucement ! Mon rôle, c’est ${roleLabel} : je garde ce village en vie — me perdre ce soir livre la partie aux Loups !`,
      es: `¡Un momento! Soy ${roleLabel} y mantengo vivo a este pueblo — ¡perderme esta noche le regala la partida a los Lobos!`,
      ja: `待って！私は${roleLabel}で、この村を生かし続けてるんだ — 今夜私を失ったら人狼に勝ちを渡すことになるよ！`,
    });
  } else if (isBitingWolf(leader.roleId) || leader.roleId === 'traitor') {
    const counter =
      accuser ||
      alive.find(
        (p) => p.id !== leader.id && !isBitingWolf(p.roleId)
      );
    const blame = counter
      ? tr(lang, {
        vi: `${counter.name} mới là kẻ vội vàng đẩy phiếu đáng nghi nhất`,
        en: `${counter.name} is rushing this vote way too eagerly`,
        fr: `${counter.name} précipite ce vote beaucoup trop avidement`,
        es: `${counter.name} está apurando este voto con demasiado entusiasmo`,
        ja: `${counter.name}がやけに急いでこの投票を進めてる`,
      })
      : tr(lang, {
        vi: 'Đàn Sói đang lợi dụng để đẩy một Dân Làng',
        en: 'The real Wolves are steering this mislynch',
        fr: 'Les vrais Loups manipulent ce vote pour faire pendre un innocent',
        es: 'Los verdaderos Lobos están dirigiendo este linchamiento erróneo',
        ja: '本物の人狼がこの誤った処刑を誘導してる',
      });
    text = tr(lang, {
      vi: `Cả làng đang bị dắt mũi rồi! ${blame} — xin hãy suy nghĩ lại trước khi hết giờ!`,
      en: `You’re all being played! ${blame} — reconsider before time runs out!`,
      fr: `Vous vous faites tous manipuler ! ${blame} — reconsidérez avant la fin du temps imparti !`,
      es: `¡Los están manipulando a todos! ${blame} — ¡reconsideren antes de que se acabe el tiempo!`,
      ja: `みんな踊らされてるよ！${blame} — 時間切れになる前に考え直して！`,
    });
  } else {
    text = tr(lang, pickFrom([
      {
        vi: `Tôi chỉ là Dân Làng vô tội! Hãy nhìn kỹ ai đang hùa theo đẩy phiếu cho tôi${accuser ? ` — ${accuser.name}, bạn giải thích đi!` : '!'}`,
        en: `I’m an innocent Villager! Watch closely who piled onto this wagon${accuser ? ` — ${accuser.name}, why the rush?` : '!'}`,
        fr: `Je suis un simple Villageois innocent ! Regardez bien qui a rejoint ce vote${accuser ? ` — ${accuser.name}, pourquoi cette précipitation ?` : ' !'}`,
        es: `¡Soy un Aldeano inocente! Fíjense bien en quién se sumó a este voto${accuser ? ` — ${accuser.name}, ¿por qué tanta prisa?` : '.'}`,
        ja: `私は無実の村人だよ！誰がこの投票に乗っかってるのかよく見て${accuser ? ` — ${accuser.name}、なんでそんなに急ぐの？` : '！'}`,
      },
      {
        vi: 'Treo nhầm tôi là mất thêm một lá phiếu phe Dân đấy! Còn thời gian, mọi người kiểm tra lại nghi phạm thật đi!',
        en: 'Mislynching me only hands numbers to the Wolves! Check the real suspects before locking!',
        fr: 'Me pendre à tort ne fait qu’avantager les Loups ! Vérifiez les vrais suspects avant de verrouiller !',
        es: '¡Linchar a un inocente como yo solo le da ventaja a los Lobos! ¡Revisen a los verdaderos sospechosos antes de cerrar!',
        ja: '私を誤って吊っても人狼を有利にするだけだよ！確定する前に本当の容疑者を確認して！',
      },
    ], rng));
  }

  if (claimedRole) {
    addPublicClaim(brain, {
      speakerId: leader.id,
      claimedRole,
      round,
    });
  }
  brain.spokenCounts[leader.id] = (brain.spokenCounts[leader.id] ?? 0) + 1;

  return {
    delayMs: 2500,
    speakerId: leader.id,
    speakerName: leader.name,
    persona: brain.personas[leader.id],
    text,
    claimedRole,
  };
}

function foldVietnamese(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');
}

function findMentionedLivingPlayers(
  message: string,
  players: Player[],
  excludeId: string
): Player[] {
  const lower = message.toLowerCase();
  const folded = foldVietnamese(message);
  const found: Player[] = [];
  const seen = new Set<string>();

  players.forEach((p, idx) => {
    if (!p.isAlive || p.id === excludeId) return;
    const nameLower = p.name.toLowerCase();
    const nameFolded = foldVietnamese(p.name);
    const seatMatch = new RegExp(`(?:#|số\\s*|so\\s*)${idx + 1}\\b`, 'i').test(lower);
    if (
      (nameLower.length >= 2 && lower.includes(nameLower)) ||
      (nameFolded.length >= 2 && folded.includes(nameFolded)) ||
      seatMatch
    ) {
      if (!seen.has(p.id)) {
        seen.add(p.id);
        found.push(p);
      }
    }
  });

  // If no full-name match, allow unambiguous last-word match (e.g. "Hoàng" if unique)
  if (found.length === 0) {
    const aliveOthers = players.filter((p) => p.isAlive && p.id !== excludeId);
    const lastWordCounts = new Map<string, number>();
    for (const p of aliveOthers) {
      const parts = foldVietnamese(p.name).split(/\s+/).filter(Boolean);
      const last = parts[parts.length - 1];
      if (last && last.length >= 3) {
        lastWordCounts.set(last, (lastWordCounts.get(last) ?? 0) + 1);
      }
    }
    for (const p of aliveOthers) {
      const parts = foldVietnamese(p.name).split(/\s+/).filter(Boolean);
      const last = parts[parts.length - 1];
      if (last && lastWordCounts.get(last) === 1 && new RegExp(`\\b${last}\\b`).test(folded)) {
        found.push(p);
      }
    }
  }

  return found;
}

function detectHumanRoleClaim(message: string): RoleId | null {
  const folded = foldVietnamese(message);
  const claimPatterns: Array<[RoleId, RegExp]> = [
    ['seer', /\b(?:toi|minh|tui|em|anh|chi|i am|i'm|im)\s+(?:chinh\s+la|la|vai|the|a)?\s*(?:tien tri|seer)\b/i],
    ['bodyguard', /\b(?:toi|minh|tui|em|anh|chi|i am|i'm|im)\s+(?:chinh\s+la|la|vai|the|a)?\s*(?:bao ve|bodyguard|guard)\b/i],
    ['witch', /\b(?:toi|minh|tui|em|anh|chi|i am|i'm|im)\s+(?:chinh\s+la|la|vai|the|a)?\s*(?:phu thuy|witch)\b/i],
    ['hunter', /\b(?:toi|minh|tui|em|anh|chi|i am|i'm|im)\s+(?:chinh\s+la|la|vai|the|a)?\s*(?:tho san|hunter)\b/i],
    ['elder', /\b(?:toi|minh|tui|em|anh|chi|i am|i'm|im)\s+(?:chinh\s+la|la|vai|the|a)?\s*(?:gia lang|elder)\b/i],
    ['cupid', /\b(?:toi|minh|tui|em|anh|chi|i am|i'm|im)\s+(?:chinh\s+la|la|vai|the|a)?\s*(?:cupid|than tinh yeu)\b/i],
    ['villager', /\b(?:toi|minh|tui|em|anh|chi|i am|i'm|im)\s+(?:chinh\s+la|la|vai|chi la|the|a)?\s*(?:dan lang|dan thuong|villager)\b/i],
  ];

  for (const [role, rx] of claimPatterns) {
    if (rx.test(folded)) return role;
  }
  return null;
}

/**
 * Lightweight VI/EN human chat intent parser & targeted bot responder.
 * Updates `brain.publicClaims` & `brain.publicSuspicion` and returns 1-2 paced bot replies (1400..2400ms).
 */
export function generateHumanChatResponses(
  brain: AIMatchBrain,
  humanMessage: string,
  players: Player[],
  round: number,
  lang: Language,
  rng: () => number = Math.random
): ScheduledBotBeat[] {
  const trimmed = (humanMessage || '').trim();
  if (!trimmed) return [];

  const folded = foldVietnamese(trimmed);
  const aliveBots = players.filter((p) => p.isAlive && p.isBot);
  if (aliveBots.length === 0) return [];

  brain.spokenCounts[brain.humanId] = (brain.spokenCounts[brain.humanId] ?? 0) + 1;

  const claimedRole = detectHumanRoleClaim(trimmed);
  const mentioned = findMentionedLivingPlayers(trimmed, players, brain.humanId);
  const primaryMentioned = mentioned[0] || null;

  const isNegatedTrust = /(khong tin|ko tin|chua tin|don't trust|dont trust|not clean|gia dan)/i.test(folded);
  const isAccuse =
    /(nghi|soi\b|ma soi|treo|vote|dang ngo|ke xau|wolf|werewolf|\bsus\b|suspicious|lynch|guilty|fake)/i.test(
      folded
    ) || isNegatedTrust;
  const isVouch =
    !isNegatedTrust &&
    /(tin\b|tin tuong|dan lang|nguoi tot|benh\b|vo toi|trust|clean|innocent|vouch|\bgood\b|\bsafe\b)/i.test(
      folded
    );

  const replies: ScheduledBotBeat[] = [];
  const used = new Set<string>();

  // 1. Record Human Role Claim
  if (claimedRole) {
    const checkResult: 'wolf' | 'good' | undefined =
      claimedRole === 'seer' && primaryMentioned
        ? isAccuse
          ? 'wolf'
          : isVouch
          ? 'good'
          : undefined
        : undefined;

    addPublicClaim(brain, {
      speakerId: brain.humanId,
      claimedRole,
      round,
      targetId: primaryMentioned?.id,
      checkResult,
    });

    if (claimedRole !== 'villager') {
      adjustPublicSuspicion(brain, brain.humanId, -8);
    }
    if (claimedRole === 'seer' && primaryMentioned && checkResult === 'wolf') {
      adjustPublicSuspicion(brain, primaryMentioned.id, 30);
    } else if (claimedRole === 'seer' && primaryMentioned && checkResult === 'good') {
      adjustPublicSuspicion(brain, primaryMentioned.id, -24);
    }

    // Real bot Seer immediately challenges a human fake Seer claim!
    const realBotSeer =
      claimedRole === 'seer'
        ? aliveBots.find((b) => b.roleId === 'seer' && !b.hasUsedPower)
        : null;

    if (realBotSeer) {
      used.add(realBotSeer.id);
      brain.spokenCounts[realBotSeer.id] = (brain.spokenCounts[realBotSeer.id] ?? 0) + 1;
      addPublicClaim(brain, {
        speakerId: realBotSeer.id,
        claimedRole: 'seer',
        round,
      });
      adjustPublicSuspicion(brain, brain.humanId, 38);
      replies.push({
        delayMs: 1450,
        speakerId: realBotSeer.id,
        speakerName: realBotSeer.name,
        persona: brain.personas[realBotSeer.id],
        claimedRole: 'seer',
        text: tr(lang, {
          vi: 'Khoan đã! Bạn đang nói dối — TÔI mới là Tiên Tri thật! Cả làng cẩn thận, đừng để Sói cướp vai!',
          en: 'Hold on! You’re lying — I am the real Seer! Village, don’t fall for a Wolf counter-claim!',
          fr: 'Minute ! Tu mens — la vraie Voyante, c’est MOI ! Village, ne vous laissez pas avoir par la contre-déclaration d’un Loup !',
          es: '¡Un momento! Estás mintiendo — ¡la verdadera Vidente soy YO! Pueblo, ¡no se dejen engañar por la contradeclaración de un Lobo!',
          ja: 'ちょっと待って！あなたは嘘をついてる — 本物の占い師は私だ！みんな、人狼の対抗告白に騙されないで！',
        }),
      });
    } else {
      const challenger =
        aliveBots.find(
          (b) =>
            !used.has(b.id) &&
            (brain.personas[b.id] === 'detective' || brain.personas[b.id] === 'manipulator')
        ) || aliveBots[0];
      if (challenger) {
        used.add(challenger.id);
        brain.spokenCounts[challenger.id] = (brain.spokenCounts[challenger.id] ?? 0) + 1;
        const roleLabel = ROLES[claimedRole].name[lang] || ROLES[claimedRole].name.vi;
        replies.push({
          delayMs: 1550,
          speakerId: challenger.id,
          speakerName: challenger.name,
          persona: brain.personas[challenger.id],
          text:
            claimedRole === 'seer'
              ? tr(lang, {
                vi: `Bạn nhận ${roleLabel} à? Vậy đêm qua bạn soi ai và có manh mối cụ thể nào để cả làng kiểm chứng không?`,
                en: `Claiming ${roleLabel}? Name who you inspected and why we should trust your claim!`,
                fr: `Tu te déclares ${roleLabel} ? Dis-nous qui tu as sondé et pourquoi on devrait te croire !`,
                es: `¿Dices ser ${roleLabel}? ¡Di a quién inspeccionaste y por qué deberíamos creerte!`,
                ja: `${roleLabel}を名乗るの？誰を占ったのか、なぜ信じていいのか教えて！`,
              })
              : tr(lang, {
                vi: `Ghi nhận bạn nhận vai ${roleLabel}! Nếu là thật thì nhớ giữ lập trường rõ ràng để phe Dân phối hợp nhé.`,
                en: `Noted on your ${roleLabel} claim — let’s see if the night results back you up.`,
                fr: `Noté pour ta déclaration de ${roleLabel} — voyons si les résultats de la nuit te donnent raison.`,
                es: `Anotado lo de tu declaración de ${roleLabel} — veamos si los resultados de la noche te respaldan.`,
                ja: `${roleLabel}の名乗り、了解 — 夜の結果が裏付けてくれるか見てみよう。`,
              }),
        });
      }
    }
  }

  // 2. Process Human Accusation against a named player
  if (isAccuse && primaryMentioned) {
    adjustPublicSuspicion(brain, primaryMentioned.id, 22);

    if (primaryMentioned.isBot && !used.has(primaryMentioned.id)) {
      used.add(primaryMentioned.id);
      brain.spokenCounts[primaryMentioned.id] =
        (brain.spokenCounts[primaryMentioned.id] ?? 0) + 1;

      let defenseText = '';
      if (primaryMentioned.roleId === 'tanner') {
        adjustPublicSuspicion(brain, primaryMentioned.id, 10);
        defenseText = tr(lang, {
          vi: 'Ồ, nghi tôi nhanh thế? Nếu bạn tự tin vậy thì cứ bỏ phiếu treo cổ tôi đi, xem ai mới hối hận!',
          en: 'Oh, pointing at me already? Go ahead and vote me out if you’re so sure — don’t regret it!',
          fr: 'Oh, tu me pointes déjà du doigt ? Si t’es si sûr de toi, vote contre moi — mais ne viens pas pleurer après !',
          es: 'Oh, ¿ya me estás señalando? Si estás tan seguro, vótame — ¡luego no te arrepientas!',
          ja: 'おや、もう私を指さすの？そんなに自信があるなら投票すれば — 後悔しても知らないよ！',
        });
      } else if (isBitingWolf(primaryMentioned.roleId)) {
        // A fake Seer must stay consistent with its public claim instead of "I'm just a Villager".
        const claimsSeer = brain.publicClaims.some(
          (c) => c.speakerId === primaryMentioned.id && c.claimedRole === 'seer'
        );
        defenseText = claimsSeer
          ? tr(lang, {
            vi: 'Tôi là Tiên Tri, soi được gì tôi đã báo cả làng rồi! Đổ tội cho tôi lúc này chỉ có lợi cho Sói thôi!',
            en: 'I’m the Seer and I already shared my results! Pushing on me now only helps the Wolves!',
            fr: 'Je suis la Voyante et j’ai déjà partagé mes résultats ! Me charger maintenant n’avantage que les Loups !',
            es: '¡Soy la Vidente y ya compartí mis resultados! ¡Presionarme ahora solo ayuda a los Lobos!',
            ja: '私は占い師で、結果はもう共有したよ！今私を責めても人狼が得するだけ！',
          })
          : tr(lang, pickFrom([
            {
              vi: 'Nghi vô cớ thế bạn? Tôi chỉ là Dân Làng thôi — bạn vội đổ tội cho tôi như vậy có khi mới đáng nghi đấy!',
              en: 'Baseless accusation! I’m a regular Villager — pushing on me this fast makes you look pretty sus yourself!',
              fr: 'Accusation sans fondement ! Je suis un simple Villageois — me charger aussi vite, ça te rend plutôt suspect toi-même !',
              es: '¡Acusación sin fundamento! Soy un Aldeano normal — ¡presionarme tan rápido te hace parecer bastante sospechoso a ti también!',
              ja: '根拠のない言いがかりだよ！私はただの村人 — こんなに急いで私を責めるなんて、あなたのほうが怪しいんじゃない？',
            },
            {
              vi: 'Tôi là Dân Làng đàng hoàng! Bạn có bằng chứng gì không hay chỉ đang đẩy phiếu cho nhanh?',
              en: 'I’m just a Villager! Got any evidence, or are you only rushing the vote?',
              fr: 'Je ne suis qu’un Villageois ! T’as des preuves, ou tu cherches juste à précipiter le vote ?',
              es: '¡Solo soy un Aldeano! ¿Tienes pruebas, o solo tienes prisa por votar?',
              ja: '私はただの村人だよ！証拠はあるの？それとも投票を急ぎたいだけ？',
            },
          ], rng));
      } else if (primaryMentioned.roleId === 'seer') {
        defenseText = tr(lang, {
          vi: 'Bình tĩnh đi bạn, bạn đang nhắm sai người rồi! Tôi có thông tin rất quan trọng cho phe Dân đấy!',
          en: 'Slow down — you’re aiming at the wrong person! I have crucial info for the village!',
          fr: 'Doucement — tu vises la mauvaise personne ! J’ai des infos cruciales pour le village !',
          es: '¡Calma — estás apuntando a la persona equivocada! ¡Tengo información crucial para el pueblo!',
          ja: 'ちょっと落ち着いて — 狙う相手を間違ってるよ！私は村にとって大事な情報を持ってるんだ！',
        });
      } else {
        defenseText = tr(lang, {
          vi: 'Khoan đã! Bạn dựa vào bằng chứng nào mà nghi tôi là Sói? Tôi phe Dân đàng hoàng, đừng để Sói thật cười thầm!',
          en: 'Wait a second! What evidence do you have against me? I’m town — don’t let the real Wolves hide behind this!',
          fr: 'Une seconde ! Quelles preuves as-tu contre moi ? Je suis du village — ne laisse pas les vrais Loups se cacher derrière ça !',
          es: '¡Un segundo! ¿Qué pruebas tienes contra mí? Soy del pueblo — ¡no dejes que los verdaderos Lobos se escondan detrás de esto!',
          ja: 'ちょっと待って！私にどんな証拠があるの？私は村側だよ — 本物の人狼にここへ隠れさせないで！',
        });
      }

      replies.push({
        delayMs: replies.length === 0 ? 1450 : 2250,
        speakerId: primaryMentioned.id,
        speakerName: primaryMentioned.name,
        persona: brain.personas[primaryMentioned.id],
        text: defenseText,
      });
    }

    // Optional 2nd bot chimes in to weigh the accusation
    if (replies.length < 2) {
      const analyst =
        aliveBots.find(
          (b) =>
            !used.has(b.id) &&
            (b.loverId === primaryMentioned.id ||
              brain.personas[b.id] === 'detective' ||
              brain.personas[b.id] === 'prosecutor')
        ) || aliveBots.find((b) => !used.has(b.id));
      if (analyst) {
        used.add(analyst.id);
        brain.spokenCounts[analyst.id] = (brain.spokenCounts[analyst.id] ?? 0) + 1;
        const isDefendingLover = analyst.loverId === primaryMentioned.id;
        const text = isDefendingLover
          ? tr(lang, {
            vi: `Tôi thấy ${primaryMentioned.name} chưa có gì đáng nghi cả — khoan vội hùa theo nhé mọi người!`,
            en: `I don’t buy the case on ${primaryMentioned.name} at all — let’s not rush a bad vote!`,
            fr: `Je n’achète pas du tout l’accusation contre ${primaryMentioned.name} — ne précipitons pas un mauvais vote !`,
            es: `No me creo nada el caso contra ${primaryMentioned.name} — ¡no nos apresuremos con un mal voto!`,
            ja: `${primaryMentioned.name}への疑いは全然ピンとこないな — 間違った投票を急がないようにしよう！`,
          })
          : tr(lang, {
            vi: `Góc nhìn thú vị đấy — để tôi quan sát kỹ phản ứng của ${primaryMentioned.name} trước khi bỏ phiếu.`,
            en: `Interesting push — let’s watch how ${primaryMentioned.name} responds before voting.`,
            fr: `Intéressante accusation — voyons comment ${primaryMentioned.name} réagit avant de voter.`,
            es: `Interesante acusación — veamos cómo responde ${primaryMentioned.name} antes de votar.`,
            ja: `面白い指摘だね — 投票の前に${primaryMentioned.name}がどう反応するか見てみよう。`,
          });
        replies.push({
          delayMs: 2250 + Math.round(rng() * 150),
          speakerId: analyst.id,
          speakerName: analyst.name,
          persona: brain.personas[analyst.id],
          text,
        });
      }
    }
  } else if (isVouch && primaryMentioned && !isAccuse) {
    // 3. Process Human Vouch / Trust
    adjustPublicSuspicion(brain, primaryMentioned.id, -18);

    if (replies.length < 2 && primaryMentioned.isBot && !used.has(primaryMentioned.id)) {
      used.add(primaryMentioned.id);
      brain.spokenCounts[primaryMentioned.id] =
        (brain.spokenCounts[primaryMentioned.id] ?? 0) + 1;
      replies.push({
        delayMs: replies.length === 0 ? 1500 : 2300,
        speakerId: primaryMentioned.id,
        speakerName: primaryMentioned.name,
        persona: brain.personas[primaryMentioned.id],
        text: tr(lang, {
          vi: 'Cảm ơn bạn đã tin tưởng! Cùng nhau lọc ra Sói thật quanh lửa trại nhé.',
          en: 'Appreciate the trust! Let’s focus together on finding the real Wolves.',
          fr: 'Merci de ta confiance ! Concentrons-nous ensemble pour trouver les vrais Loups.',
          es: '¡Gracias por la confianza! Concentrémonos juntos en encontrar a los verdaderos Lobos.',
          ja: '信じてくれてありがとう！みんなで本物の人狼を見つけ出そう。',
        }),
      });
    }

    if (replies.length < 2) {
      const skeptic = aliveBots.find(
        (b) =>
          !used.has(b.id) &&
          (brain.personas[b.id] === 'prosecutor' || brain.personas[b.id] === 'manipulator')
      );
      if (skeptic) {
        used.add(skeptic.id);
        brain.spokenCounts[skeptic.id] = (brain.spokenCounts[skeptic.id] ?? 0) + 1;
        replies.push({
          delayMs: 2300,
          speakerId: skeptic.id,
          speakerName: skeptic.name,
          persona: brain.personas[skeptic.id],
          text: tr(lang, {
            vi: `Sao bạn chắc chắn ${primaryMentioned.name} là Dân thế? Cẩn thận kẻo bênh nhầm Sói đấy!`,
            en: `Why are you so sure ${primaryMentioned.name} is clean? Careful not to vouch for a Wolf!`,
            fr: `Pourquoi es-tu si sûr que ${primaryMentioned.name} est clean ? Attention à ne pas défendre un Loup !`,
            es: `¿Por qué estás tan seguro de que ${primaryMentioned.name} está limpio? ¡Cuidado, no vayas a respaldar a un Lobo!`,
            ja: `なんで${primaryMentioned.name}が白だってそんなに言い切れるの？人狼をかばわないよう気をつけて！`,
          }),
        });
      }
    }
  }

  return replies.slice(0, 2);
}
