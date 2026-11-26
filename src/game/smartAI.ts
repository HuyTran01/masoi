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
  if (lang === 'vi') {
    const map: Record<BotPersonaId, string[]> = {
      detective: [
        `Xâu chuỗi các dữ kiện từ đầu đến giờ, biểu hiện của ${targetName} có điểm vênh rất rõ — mọi người nên kiểm tra kỹ.`,
        `Mình ghi chép lại nhịp bàn luận và thấy ${targetName} đang né trả lời trực diện.`,
      ],
      prosecutor: [
        `Tôi nói thẳng luôn: ${targetName} đáng nghi nhất bàn lúc này, đừng chần chừ kẻo lỡ nhịp treo Sói!`,
        `Không cần vòng vo — tôi đang nghi ${targetName} là Sói và muốn nghe họ giải trình ngay!`,
      ],
      observer: [
        `Mình ngồi quan sát từ nãy giờ thấy thái độ của ${targetName} hơi khác thường, mọi người để ý thử xem.`,
        `Chưa vội kết luận, nhưng ${targetName} cần nói rõ góc nhìn hơn trước khi chốt phiếu.`,
      ],
      manipulator: [
        `Mọi người cẩn thận kẻo bị dắt mũi nhé — tôi thấy ${targetName} mới là người đáng nghi nhất ở đây.`,
        `Đừng nhìn sai hướng! Nếu phân tích kỹ thì ${targetName} có động cơ rất lạ.`,
      ],
      protector: [
        `Chúng ta phải bảo vệ phe Dân trước đã — ${targetName}, bạn giải thích rõ để cả làng khỏi vote nhầm đi.`,
        `Đừng vội xé lẻ phiếu, nhưng tôi cần ${targetName} chứng minh mình thuộc phe Dân.`,
      ],
      wildcard: [
        `Trực giác quanh lửa trại mách bảo tôi phải để mắt tới ${targetName} hôm nay — cảm giác lạ lắm!`,
        `Bàn này căng thật đấy! Tôi đặt dấu hỏi lớn lên ${targetName} xem phản ứng ra sao.`,
      ],
    };
    return pickFrom(map[persona], rng);
  }

  const enMap: Record<BotPersonaId, string[]> = {
    detective: [
      `Connecting the clues so far, ${targetName}’s story doesn’t quite add up — let’s press them.`,
      `Tracking the timeline carefully, ${targetName} has been dodging direct questions.`,
    ],
    prosecutor: [
      `Let’s be direct: ${targetName} looks like our top Wolf suspect right now — explain yourself!`,
      `No stalling — I suspect ${targetName} is a Werewolf and want answers before votes lock.`,
    ],
    observer: [
      `Watching closely around the fire, ${targetName}’s reactions felt off to me.`,
      `I’m not rushing, but we need a clear read from ${targetName} before voting.`,
    ],
    manipulator: [
      `Careful not to fall for distractions — ${targetName} is the one acting shady here.`,
      `Everyone’s looking the wrong way; ${targetName}’s angle makes zero sense.`,
    ],
    protector: [
      `We need to keep the village unified — ${targetName}, help clear your name so we don’t mislynch.`,
      `Let’s stay disciplined and hear ${targetName}’s defense clearly.`,
    ],
    wildcard: [
      `My campfire gut says keep a close eye on ${targetName} today — something feels wild.`,
      `Plot twist energy today — I’m testing ${targetName} to see how they react!`,
    ],
  };
  return pickFrom(enMap[persona], rng);
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
      dawnText =
        lang === 'vi'
          ? `👑 Vương miện Thị Trưởng đã chuyển sang ${context.mayorTransferredToName} (phiếu x2)! ${
              killedNames.length > 0
                ? `Đêm qua mất ${killedNames.join(', ')} — cả làng phải tỉnh táo kẻo quyền lực x2 rơi vào tay Sói!`
                : 'Đêm qua bình yên, nhưng quyền lực Thị Trưởng sẽ quyết định bàn cân hôm nay!'
            }`
          : `👑 The Mayor’s crown passed to ${context.mayorTransferredToName} (2x vote)! ${
              killedNames.length > 0
                ? `We lost ${killedNames.join(', ')} overnight — stay sharp so double vote power doesn’t swing to the Wolves!`
                : 'A peaceful night, yet that 2x vote will shape today’s lynch!'
            }`;
    } else if (killedNames.length === 0) {
      dawnText =
        lang === 'vi'
          ? brain.activeStoryline === 'silent_night_paranoia'
            ? 'Đêm qua hoàn toàn bình yên! Không biết Bảo Vệ đã đỡ chuẩn, Phù Thủy cứu người, hay Sói vừa cắn trúng Bán Sói / Già Làng nữa...'
            : 'Đêm qua không ai tử trận! Một pha cứu người quá xuất sắc, nhưng đừng chủ quan vì đàn Sói vẫn đang ngồi ngay quanh lửa trại.'
          : brain.activeStoryline === 'silent_night_paranoia'
          ? 'A completely silent night! Either the Bodyguard nailed the shield, the Witch healed, or the Wolves hit the Elder or Cursed...'
          : 'Zero casualties overnight! Great save for the village, though the Wolves are still sitting right beside us.';
    } else if (killedNames.length >= 2) {
      dawnText =
        lang === 'vi'
          ? `Trời ơi, một đêm đẫm máu — mất tới ${killedNames.length} người (${killedNames.join(', ')})! Chắc chắn có liên kết Tình Nhân, Bình Độc Phù Thủy, hoặc Sói Con cuồng nộ rồi!`
          : `A brutal night — we lost ${killedNames.length} villagers (${killedNames.join(', ')})! Lovers, Witch Poison, or Wolf Pup frenzy is definitely in play!`;
    } else {
      dawnText =
        lang === 'vi'
          ? `Đêm qua ${killedNames[0]} đã ngã xuống rồi... Mọi người bình tĩnh chia sẻ thông tin trước khi dồn phiếu nhé.`
          : `We lost ${killedNames[0]} last night... Let’s share reads calmly before locking votes.`;
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
      const text =
        lang === 'vi'
          ? `Tôi lên vai luôn: tôi là Tiên Tri thật! Đêm qua tôi đã soi ${target.name} và kết quả là MA SÓI — đề nghị cả làng treo cổ ${target.name} ngay hôm nay!`
          : `Stepping forward now: I am the real Seer! I inspected ${target.name} and saw WEREWOLF — we must vote ${target.name} out today!`;
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
        const text =
          lang === 'vi'
            ? `Tôi nhận vai Tiên Tri để dẫn bàn: tôi đã soi ${target.name} thuộc phe Dân Làng (người tốt). Nếu có ai khác nhận Tiên Tri thì chắc chắn là Sói giả!`
            : `Claiming Seer to anchor town: I checked ${target.name} as GOOD (Villager side). Anyone counter-claiming Seer is a lying Wolf!`;
        pushBeat(botSeer, text, {
          claimedRole: 'seer',
          targetId: target.id,
          checkResult: 'good',
        });
      } else {
        // Subtle Day 1 safe vouch (does NOT leak Seer role!)
        adjustPublicSuspicion(brain, target.id, -12);
        const text =
          lang === 'vi'
            ? `Cảm giác của mình vòng này là ${target.name} khá đáng tin và thuộc phe Dân, mọi người khoan nhắm vào họ.`
            : `My early read is that ${target.name} seems clean and trustworthy — let’s look elsewhere first.`;
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
      const text =
        lang === 'vi'
          ? realSeerClaimedId
            ? `Khoan đã! Đừng tin lời giả mạo — TÔI mới là Tiên Tri thật! Đêm qua tôi soi chính ${frameTarget.name} ra MA SÓI, họ đang cố đóng kịch để lừa cả làng!`
            : `Tôi lên nhận Tiên Tri luôn cho rõ ràng: đêm qua tôi soi ${frameTarget.name} và thấy dấu hiệu MA SÓI! Mọi người đừng để họ dẫn dắt!`
          : realSeerClaimedId
          ? `Hold everything! Don’t buy that bluff — I am the REAL Seer! I checked ${frameTarget.name} as WEREWOLF; they’re panicking and faking a claim!`
          : `Stepping up as Seer: I inspected ${frameTarget.name} last night and got WEREWOLF! Don’t let them control the table!`;
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
        const text =
          lang === 'vi'
            ? `Mọi người khoan vội tin ${claimedSeerObj.name}! Lên nhận Tiên Tri vội như vậy rất dễ là Sói giả để đổ oan cho ${accusedObj.name} đấy!`
            : `Hold on — don’t blindly trust ${claimedSeerObj.name}! Rushing a Seer claim to frame ${accusedObj.name} screams Wolf bait!`;
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
        const text =
          lang === 'vi'
            ? `Nói thật lòng, tôi thấy biểu hiện của ${pup.name} vòng này cực kỳ bất ổn — nếu cả làng nghi thì tôi cũng sẵn sàng vote ${pup.name}!`
            : `Honestly, ${pup.name}’s reads feel super sketchy this round — if town wants to test ${pup.name}, I’m willing to vote them!`;
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
      crossText =
        lang === 'vi'
          ? `Lật lại lịch sử phiếu Ngày ${prevSnapshot.round}: ${prevVoteTarget.name} đã bỏ phiếu cho ${
              votedForObj ? votedForObj.name : 'mục tiêu lệch nhịp'
            } — hành động đó rất đáng nghi! ${personaTagline(
              brain.personas[crossExaminer.id] || 'detective',
              lang,
              prevVoteTarget.name,
              rng
            )}`
          : `Checking Day ${prevSnapshot.round}’s vote log: ${prevVoteTarget.name} voted for ${
              votedForObj ? votedForObj.name : 'an off-wagon target'
            } — that vote trail looks very suspicious!`;
    } else {
      // Quiet-seat check: STRICTLY exclude anyone who already spoke in this batch!
      const trulyQuiet = validTargets.filter(
        (p) => !usedSpeakers.has(p.id) && (brain.spokenCounts[p.id] ?? 0) === 0
      );
      const pickPool = trulyQuiet.length > 0 ? trulyQuiet : validTargets;
      if (pickPool.length > 0) {
        const target = pickFrom(pickPool, rng);
        if (round <= 1) {
          crossText =
            lang === 'vi'
              ? `Vòng 1 còn ít manh mối — ${target.name}, góc nhìn của bạn quanh lửa trại lúc này nghiêng về ai nhất?`
              : `Day 1 clues are still fresh — ${target.name}, who’s giving you the strangest read around the fire?`;
        } else {
          adjustPublicSuspicion(brain, target.id, 12);
          crossText =
            trulyQuiet.includes(target)
              ? lang === 'vi'
                ? `Từ đầu đến giờ ${target.name} chưa lên tiếng phân tích gì — sự im lặng đó khiến tôi bắt đầu nghi ngờ.`
                : `${target.name} hasn’t spoken up yet today — staying that quiet makes me suspicious.`
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
    const tannerText =
      lang === 'vi'
        ? pickFrom(
            [
              'Ơ hay, sao tự dưng mấy ánh mắt cứ liếc sang tôi thế? Tôi chẳng biết đêm qua có chuyện gì đâu, ai thích thì cứ thử vote tôi đi!',
              'Bàn này suy luận rối rắm quá... Tôi chán giải thích rồi, các người muốn nghi tôi là Sói thì cứ tự nhiên!',
            ],
            rng
          )
        : pickFrom(
            [
              'Wait, why are people glancing at me? I slept through the whole night — go ahead and vote me if you dare!',
              'This debate is exhausting... I’m done defending myself, suspect me if you want!',
            ],
            rng
          );
    pushBeat(botTanner, tannerText);
  } else if (botWitch && witchHealedLiving) {
    adjustPublicSuspicion(brain, witchHealedLiving.id, -18);
    const witchText =
      lang === 'vi'
        ? `Tôi có lý do rất chắc chắn để tin ${witchHealedLiving.name} là người tốt — hôm nay tuyệt đối đừng treo nhầm ${witchHealedLiving.name}!`
        : `I have solid reason to trust ${witchHealedLiving.name} is clean — let’s definitely not lynch ${witchHealedLiving.name} today!`;
    pushBeat(botWitch, witchText);
  } else if (brain.activeStoryline === 'mayor_coup' && context.mayorId) {
    const mayorObj = alive.find((p) => p.id === context.mayorId);
    const speaker = pickUnusedBot((b) => b.id !== context.mayorId);
    if (mayorObj && speaker) {
      const text =
        lang === 'vi'
          ? `Thị Trưởng ${mayorObj.name} đang cầm lá phiếu x2 quyền lực nhất bàn! ${mayorObj.name} định dẫn phiếu về phía ai để cả làng theo dõi?`
          : `Mayor ${mayorObj.name} holds the decisive 2x vote! Where are you leading today’s vote, ${mayorObj.name}?`;
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
      const text =
        lang === 'vi'
          ? `Căng thẳng tột độ rồi: ${names} cùng nhận Tiên Tri! Chắc chắn 1 trong 2 là Ma Sói giả danh — hôm nay phải soi cực kỹ!`
          : `Huge clash: ${names} are BOTH claiming Seer! One of them is 100% a lying Wolf — focus the vote right here!`;
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
    text =
      lang === 'vi'
        ? 'Được thôi, cứ dồn phiếu treo cổ tôi đi! Các người sai lầm rồi, nhưng tôi chẳng thèm van xin đâu!'
        : 'Fine, go ahead and hang me! You’re all making a huge mistake, and I’m not begging!';
  } else if (leader.roleId === 'hunter') {
    claimedRole = 'hunter';
    text =
      lang === 'vi'
        ? `Khoan đã! Tôi là Thợ Săn — nếu bị treo cổ hôm nay, phát súng cuối cùng của tôi sẽ bắn thẳng vào ${
            accuser ? accuser.name : 'kẻ đẩy phiếu mạnh nhất'
          }! Đừng để Sói cười thầm!`
        : `Wait! I’m the Hunter — if you lynch me today, my dying bullet goes straight into ${
            accuser ? accuser.name : 'whoever pushed this wagon'
          }!`;
  } else if (leader.roleId === 'elder') {
    claimedRole = 'elder';
    text =
      lang === 'vi'
        ? 'Dừng tay ngay cả làng! Tôi chính là Già Làng — treo cổ nhầm tôi thì toàn bộ Tiên Tri, Bảo Vệ và Phù Thủy sẽ bị phong ấn mất hết kỹ năng đấy!'
        : 'Stop the vote! I am the Elder — lynching me will seal ALL Villager special powers for the rest of the match!';
  } else if (leader.roleId === 'seer') {
    claimedRole = 'seer';
    const checks = Object.entries(brain.seerChecksByBot[leader.id] || {})
      .map(([id, res]) => {
        const name = players.find((p) => p.id === id)?.name || id;
        return `${name}=${res === 'wolf' ? (lang === 'vi' ? 'Sói' : 'Wolf') : lang === 'vi' ? 'Dân' : 'Good'}`;
      })
      .join(', ');
    text =
      lang === 'vi'
        ? `Đừng treo tôi — tôi là Tiên Tri thật!${checks ? ` Lịch sử soi của tôi: ${checks}.` : ''} Chuyển phiếu sang kẻ đang gài bẫy tôi ngay!`
        : `Don’t lynch your real Seer!${checks ? ` My checks: ${checks}.` : ''} Flip the vote onto the real wolves!`;
  } else if (leader.roleId === 'bodyguard' || leader.roleId === 'witch') {
    claimedRole = leader.roleId;
    const roleLabel = ROLES[leader.roleId].name[lang] || ROLES[leader.roleId].name.vi;
    text =
      lang === 'vi'
        ? `Bình tĩnh đã! Tôi là ${roleLabel} đang âm thầm giữ mạng cho làng — mất tôi đêm nay bầy Sói sẽ làm loạn mất!`
        : `Hold on! I’m the ${roleLabel} keeping this village alive — losing me tonight hands the game to the Wolves!`;
  } else if (isBitingWolf(leader.roleId) || leader.roleId === 'traitor') {
    const counter =
      accuser ||
      alive.find(
        (p) => p.id !== leader.id && !isBitingWolf(p.roleId)
      );
    text =
      lang === 'vi'
        ? `Cả làng đang bị dắt mũi rồi! ${
            counter ? `${counter.name} mới là kẻ vội vàng đẩy phiếu đáng nghi nhất` : 'Đàn Sói đang lợi dụng để đẩy một Dân Làng'
          } — xin hãy suy nghĩ lại trước khi hết giờ!`
        : `You’re all being played! ${
            counter ? `${counter.name} is rushing this vote way too eagerly` : 'The real Wolves are steering this mislynch'
          } — reconsider before time runs out!`;
  } else {
    text =
      lang === 'vi'
        ? pickFrom(
            [
              `Tôi chỉ là Dân Làng vô tội! Hãy nhìn kỹ ai đang hùa theo đẩy phiếu cho tôi${accuser ? ` — ${accuser.name}, bạn giải thích đi!` : '!'}`,
              'Treo nhầm tôi là mất thêm một lá phiếu phe Dân đấy! Còn thời gian, mọi người kiểm tra lại nghi phạm thật đi!',
            ],
            rng
          )
        : pickFrom(
            [
              `I’m an innocent Villager! Watch closely who piled onto this wagon${accuser ? ` — ${accuser.name}, why the rush?` : '!'}`,
              'Mislynching me only hands numbers to the Wolves! Check the real suspects before locking!',
            ],
            rng
          );
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
        text:
          lang === 'vi'
            ? 'Khoan đã! Bạn đang nói dối — TÔI mới là Tiên Tri thật! Cả làng cẩn thận, đừng để Sói cướp vai!'
            : 'Hold on! You’re lying — I am the real Seer! Village, don’t fall for a Wolf counter-claim!',
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
            lang === 'vi'
              ? claimedRole === 'seer'
                ? `Bạn nhận ${roleLabel} à? Vậy đêm qua bạn soi ai và có manh mối cụ thể nào để cả làng kiểm chứng không?`
                : `Ghi nhận bạn nhận vai ${roleLabel}! Nếu là thật thì nhớ giữ lập trường rõ ràng để phe Dân phối hợp nhé.`
              : claimedRole === 'seer'
              ? `Claiming ${roleLabel}? Name who you inspected and why we should trust your claim!`
              : `Noted on your ${roleLabel} claim — let’s see if the night results back you up.`,
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
        defenseText =
          lang === 'vi'
            ? 'Ồ, nghi tôi nhanh thế? Nếu bạn tự tin vậy thì cứ bỏ phiếu treo cổ tôi đi, xem ai mới hối hận!'
            : 'Oh, pointing at me already? Go ahead and vote me out if you’re so sure — don’t regret it!';
      } else if (isBitingWolf(primaryMentioned.roleId)) {
        // A fake Seer must stay consistent with its public claim instead of "I'm just a Villager".
        const claimsSeer = brain.publicClaims.some(
          (c) => c.speakerId === primaryMentioned.id && c.claimedRole === 'seer'
        );
        defenseText = claimsSeer
          ? lang === 'vi'
            ? 'Tôi là Tiên Tri, soi được gì tôi đã báo cả làng rồi! Đổ tội cho tôi lúc này chỉ có lợi cho Sói thôi!'
            : 'I’m the Seer and I already shared my results! Pushing on me now only helps the Wolves!'
          : lang === 'vi'
          ? pickFrom(
              [
                'Nghi vô cớ thế bạn? Tôi chỉ là Dân Làng thôi — bạn vội đổ tội cho tôi như vậy có khi mới đáng nghi đấy!',
                'Tôi là Dân Làng đàng hoàng! Bạn có bằng chứng gì không hay chỉ đang đẩy phiếu cho nhanh?',
              ],
              rng
            )
          : pickFrom(
              [
                'Baseless accusation! I’m a regular Villager — pushing on me this fast makes you look pretty sus yourself!',
                'I’m just a Villager! Got any evidence, or are you only rushing the vote?',
              ],
              rng
            );
      } else if (primaryMentioned.roleId === 'seer') {
        defenseText =
          lang === 'vi'
            ? 'Bình tĩnh đi bạn, bạn đang nhắm sai người rồi! Tôi có thông tin rất quan trọng cho phe Dân đấy!'
            : 'Slow down — you’re aiming at the wrong person! I have crucial info for the village!';
      } else {
        defenseText =
          lang === 'vi'
            ? 'Khoan đã! Bạn dựa vào bằng chứng nào mà nghi tôi là Sói? Tôi phe Dân đàng hoàng, đừng để Sói thật cười thầm!'
            : 'Wait a second! What evidence do you have against me? I’m town — don’t let the real Wolves hide behind this!';
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
        const text =
          lang === 'vi'
            ? isDefendingLover
              ? `Tôi thấy ${primaryMentioned.name} chưa có gì đáng nghi cả — khoan vội hùa theo nhé mọi người!`
              : `Góc nhìn thú vị đấy — để tôi quan sát kỹ phản ứng của ${primaryMentioned.name} trước khi bỏ phiếu.`
            : isDefendingLover
            ? `I don’t buy the case on ${primaryMentioned.name} at all — let’s not rush a bad vote!`
            : `Interesting push — let’s watch how ${primaryMentioned.name} responds before voting.`;
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
        text:
          lang === 'vi'
            ? 'Cảm ơn bạn đã tin tưởng! Cùng nhau lọc ra Sói thật quanh lửa trại nhé.'
            : 'Appreciate the trust! Let’s focus together on finding the real Wolves.',
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
          text:
            lang === 'vi'
              ? `Sao bạn chắc chắn ${primaryMentioned.name} là Dân thế? Cẩn thận kẻo bênh nhầm Sói đấy!`
              : `Why are you so sure ${primaryMentioned.name} is clean? Careful not to vouch for a Wolf!`,
        });
      }
    }
  }

  return replies.slice(0, 2);
}
