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
    },
    description: {
      vi: 'Bí mật chọn 1 kịch bản kịch tính khớp với đội hình hiện tại mỗi ván đấu.',
      en: 'Secretly picks a compatible high-drama storyline for every match.',
    },
  },
  classic_deduction: {
    id: 'classic_deduction',
    icon: '⚖️',
    label: {
      vi: '⚖️ Đấu Trí Cổ Điển',
      en: '⚖️ Classic Deduction',
    },
    description: {
      vi: 'Suy luận thuần túy qua lịch sử bỏ phiếu, phản ứng bình minh và tranh luận.',
      en: 'Pure social deduction driven by voting trails, dawn reads, and debates.',
    },
  },
  twin_seers: {
    id: 'twin_seers',
    icon: '🔮',
    label: {
      vi: '🔮 Song Sinh Tiên Tri — Thật Giả Đối Đầu',
      en: '🔮 Twin Seers — Real vs Fake Clash',
    },
    description: {
      vi: 'Ma Sói táo bạo giả danh Tiên Tri đối chất trực diện với Tiên Tri thật!',
      en: 'A bold Werewolf counter-claims Seer head-to-head against the real Seer!',
    },
    requiredRoles: ['seer'],
  },
  forbidden_lovers: {
    id: 'forbidden_lovers',
    icon: '💘',
    label: {
      vi: '💘 Tình Nhân Nghịch Cảnh — Sói & Dân',
      en: '💘 Forbidden Lovers — Wolf & Villager',
    },
    description: {
      vi: 'Cupid se duyên 1 Ma Sói + 1 Dân Làng tạo nên phe thứ 3 đầy kịch tính.',
      en: 'Cupid binds 1 Werewolf + 1 Villager into a razor-edge 3rd-faction romance.',
    },
    requiredRoles: ['cupid'],
  },
  wolf_civil_war: {
    id: 'wolf_civil_war',
    icon: '🐺',
    label: {
      vi: '🐺 Nội Chiến Đàn Sói — Thí Tốt Cuồng Nộ',
      en: '🐺 Wolf Civil War — Frenzy Gambit',
    },
    description: {
      vi: 'Đàn Sói sẵn sàng thí Sói Con lấy lòng tin dân làng để mở khóa cú cắn kép!',
      en: 'Wolves bus their own Wolf Pup for town credit to unleash double-kill frenzy!',
    },
    requiredRoles: ['wolf_pup'],
  },
  jester_mindgame: {
    id: 'jester_mindgame',
    icon: '🎭',
    label: {
      vi: '🎭 Bẫy Kẻ Chán Đời — Đòn Tâm Lý',
      en: '🎭 Jester Mindgame — Psychological Trap',
    },
    description: {
      vi: 'Kẻ Chán Đời tung mồi nhử tinh vi khiến cả làng phân vân Sói thật hay bẫy treo cổ.',
      en: 'The Tanner plants subtle bait so the village doubts every easy lynch.',
    },
    requiredRoles: ['tanner'],
  },
  silent_night_paranoia: {
    id: 'silent_night_paranoia',
    icon: '🧪',
    label: {
      vi: '🧪 Đêm Bình Yên & Bình Độc Nửa Đêm',
      en: '🧪 Silent Night & Midnight Poison',
    },
    description: {
      vi: 'Bảo Vệ và Phù Thủy tung chiêu cứu người lẫn bình độc tạo áp lực nghẹt thở.',
      en: 'Bodyguard shields and Witch elixirs trigger tense peaceful nights and counter-poisons.',
    },
    requiredRoles: ['bodyguard', 'witch'],
  },
  mayor_coup: {
    id: 'mayor_coup',
    icon: '👑',
    label: {
      vi: '👑 Đảo Chính Thị Trưởng — Quyền Lực x2',
      en: '👑 Mayor Coup — Double Vote Power',
    },
    description: {
      vi: 'Mọi toan tính xoay quanh chiếc vương miện Thị Trưởng và lá phiếu quyền lực x2.',
      en: 'Every alliance and ambush revolves around the Mayor’s double-weight vote.',
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

  // Wave 2: Conversational memory & anti-repetition
  usedChatLinesByRound: Record<number, string[]>;
  recentChatHistory: Array<{ senderId: string; senderName: string; text: string; round: number }>;
  statedVoteTargetByBot: Record<string, { round: number; targetId: string }>;
}

export interface AiChatServerPayload {
  lang: Language;
  round: number;
  humanMessage: string;
  humanName: string;
  humanSeat: number;
  bot: {
    id: string;
    name: string;
    seat: number;
    persona: BotPersonaId;
    roleId: RoleId;
    roleName: string;
    faction: string;
    privateMemory: {
      wolfPackmates?: Array<{ seat: number; name: string }>;
      seerChecks?: Array<{ seat: number; name: string; result: 'wolf' | 'good' }>;
      witchHealed?: Array<{ seat: number; name: string }>;
      witchPoisoned?: { seat: number; name: string } | null;
      lover?: { seat: number; name: string } | null;
      statedSuspect?: { seat: number; name: string } | null;
    };
  };
  publicState: {
    players: Array<{
      seat: number;
      name: string;
      isAlive: boolean;
      isMayor: boolean;
      revealedRole?: RoleId;
    }>;
    lastDawnDeaths: Array<{ seat: number; name: string }>;
    recentChatHistory: Array<{ senderName: string; text: string; round: number }>;
    publicClaims: Array<{
      speakerName: string;
      claimedRole: RoleId;
      targetName?: string;
      checkResult?: 'wolf' | 'good';
      round: number;
    }>;
    recentVoteSummary: Array<{
      round: number;
      lynchedName: string | null;
      lynchedRole?: RoleId | null;
      votes: Array<{ voterName: string; targetName: string }>;
    }>;
  };
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
    usedChatLinesByRound: {},
    recentChatHistory: [],
    statedVoteTargetByBot: {},
  };
}

export function recordPublicChatMessage(
  brain: AIMatchBrain,
  entry: { senderId: string; senderName: string; text: string; round: number }
): void {
  const cleanText = String(entry.text || '').trim();
  if (!cleanText) return;
  if (!Array.isArray(brain.recentChatHistory)) brain.recentChatHistory = [];
  brain.recentChatHistory.push({
    senderId: entry.senderId,
    senderName: entry.senderName,
    text: cleanText.slice(0, 280),
    round: entry.round,
  });
  if (brain.recentChatHistory.length > 8) {
    brain.recentChatHistory = brain.recentChatHistory.slice(-8);
  }
}

function normalizeChatLineKey(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

function claimUniqueRoundLine(
  brain: AIMatchBrain,
  round: number,
  candidates: string[],
  lang: Language,
  rng: () => number
): string {
  if (!brain.usedChatLinesByRound) brain.usedChatLinesByRound = {};
  const used = brain.usedChatLinesByRound[round] ?? [];
  const usedSet = new Set(used.map(normalizeChatLineKey));
  const fresh = candidates.filter((c) => !usedSet.has(normalizeChatLineKey(c)));
  let chosen = fresh.length > 0 ? pickFrom(fresh, rng) : pickFrom(candidates, rng);
  if (usedSet.has(normalizeChatLineKey(chosen))) {
    const suffix =
      lang === 'vi'
        ? ` (Ngày ${round}, lượt ${used.length + 1})`
        : ` (Day ${round}, note #${used.length + 1})`;
    chosen = `${chosen}${suffix}`;
  }
  brain.usedChatLinesByRound[round] = [...used, chosen];
  return chosen;
}

/**
 * Strictly zero-leak payload builder for optional server-side Gemini chat (/api/ai-chat).
 * NEVER includes the human player's role or any other living bot's secret role.
 */
export function buildAiChatServerPayload(
  brain: AIMatchBrain,
  replyingBot: Player,
  players: Player[],
  round: number,
  lang: Language,
  humanMessage: string
): AiChatServerPayload {
  const seatMap = new Map<string, { seat: number; name: string }>();
  players.forEach((p, idx) => seatMap.set(p.id, { seat: idx + 1, name: p.name }));

  const humanPlayer = players.find((p) => p.id === brain.humanId);
  const humanInfo = seatMap.get(brain.humanId) || {
    seat: 1,
    name: humanPlayer?.name || (lang === 'vi' ? 'Bạn' : 'You'),
  };
  const botInfo = seatMap.get(replyingBot.id) || { seat: 1, name: replyingBot.name };

  const privateMemory: AiChatServerPayload['bot']['privateMemory'] = {};
  if (isBitingWolf(replyingBot.roleId)) {
    privateMemory.wolfPackmates = players
      .filter((p) => p.id !== replyingBot.id && isBitingWolf(p.roleId))
      .map((p) => seatMap.get(p.id)!)
      .filter(Boolean);
  }
  if (replyingBot.roleId === 'seer') {
    const checks = brain.seerChecksByBot[replyingBot.id] || {};
    privateMemory.seerChecks = Object.entries(checks)
      .map(([tid, result]) => {
        const info = seatMap.get(tid);
        return info ? { seat: info.seat, name: info.name, result } : null;
      })
      .filter((x): x is { seat: number; name: string; result: 'wolf' | 'good' } => Boolean(x));
  }
  if (replyingBot.roleId === 'witch') {
    privateMemory.witchHealed = (brain.witchHealedByBot[replyingBot.id] || [])
      .map((tid) => seatMap.get(tid))
      .filter((x): x is { seat: number; name: string } => Boolean(x));
    const poisonedId = brain.witchPoisonedByBot[replyingBot.id];
    privateMemory.witchPoisoned = poisonedId ? seatMap.get(poisonedId) ?? null : null;
  }
  if (replyingBot.loverId) {
    privateMemory.lover = seatMap.get(replyingBot.loverId) ?? null;
  }
  const stated = brain.statedVoteTargetByBot?.[replyingBot.id];
  if (stated && stated.round === round) {
    privateMemory.statedSuspect = seatMap.get(stated.targetId) ?? null;
  }

  const latestDawn = brain.dawnDeathHistory[brain.dawnDeathHistory.length - 1];
  const lastDawnDeaths = (latestDawn?.victimIds || [])
    .map((id) => seatMap.get(id))
    .filter((x): x is { seat: number; name: string } => Boolean(x));

  const roleDef = ROLES[replyingBot.roleId];

  return {
    lang,
    round,
    humanMessage: String(humanMessage || '').trim().slice(0, 280),
    humanName: humanInfo.name,
    humanSeat: humanInfo.seat,
    bot: {
      id: replyingBot.id,
      name: botInfo.name,
      seat: botInfo.seat,
      persona: brain.personas[replyingBot.id] || 'observer',
      roleId: replyingBot.roleId,
      roleName: roleDef.name[lang] || roleDef.name.en,
      faction: roleDef.faction,
      privateMemory,
    },
    publicState: {
      players: players.map((p, idx) => ({
        seat: idx + 1,
        name: p.name,
        isAlive: p.isAlive,
        isMayor: Boolean(p.isMayor),
        ...(brain.revealedRoles[p.id] ? { revealedRole: brain.revealedRoles[p.id] } : {}),
      })),
      lastDawnDeaths,
      recentChatHistory: (brain.recentChatHistory || []).slice(-8).map((m) => ({
        senderName: m.senderName,
        text: m.text,
        round: m.round,
      })),
      publicClaims: brain.publicClaims.slice(-10).map((c) => ({
        speakerName: seatMap.get(c.speakerId)?.name || c.speakerId,
        claimedRole: c.claimedRole,
        ...(c.targetId ? { targetName: seatMap.get(c.targetId)?.name || c.targetId } : {}),
        ...(c.checkResult ? { checkResult: c.checkResult } : {}),
        round: c.round,
      })),
      recentVoteSummary: brain.voteHistory.slice(-2).map((snap) => ({
        round: snap.round,
        lynchedName: snap.lynchedId ? seatMap.get(snap.lynchedId)?.name ?? null : null,
        lynchedRole: snap.lynchedRoleId ?? null,
        votes: snap.votes.slice(0, 20).map((v) => ({
          voterName: seatMap.get(v.voterId)?.name || v.voterId,
          targetName: seatMap.get(v.targetId)?.name || v.targetId,
        })),
      })),
    },
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
    const statedTarget = brain.statedVoteTargetByBot?.[bot.id];
    if (
      statedTarget &&
      (options.round === undefined || statedTarget.round === options.round) &&
      aliveIds.has(statedTarget.targetId) &&
      statedTarget.targetId !== bot.id &&
      statedTarget.targetId !== bot.loverId
    ) {
      mySuspects.add(statedTarget.targetId);
    }
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
      },
      {
        vi: `Mình ghi chép lại nhịp bàn luận và thấy ${targetName} đang né trả lời trực diện.`,
        en: `Tracking the timeline carefully, ${targetName} has been dodging direct questions.`,
      },
    ],
    prosecutor: [
      {
        vi: `Tôi nói thẳng luôn: ${targetName} đáng nghi nhất bàn lúc này, đừng chần chừ kẻo lỡ nhịp treo Sói!`,
        en: `Let’s be direct: ${targetName} looks like our top Wolf suspect right now — explain yourself!`,
      },
      {
        vi: `Không cần vòng vo — tôi đang nghi ${targetName} là Sói và muốn nghe họ giải trình ngay!`,
        en: `No stalling — I suspect ${targetName} is a Werewolf and want answers before votes lock.`,
      },
    ],
    observer: [
      {
        vi: `Mình ngồi quan sát từ nãy giờ thấy thái độ của ${targetName} hơi khác thường, mọi người để ý thử xem.`,
        en: `Watching closely around the fire, ${targetName}’s reactions felt off to me.`,
      },
      {
        vi: `Chưa vội kết luận, nhưng ${targetName} cần nói rõ góc nhìn hơn trước khi chốt phiếu.`,
        en: `I’m not rushing, but we need a clear read from ${targetName} before voting.`,
      },
    ],
    manipulator: [
      {
        vi: `Mọi người cẩn thận kẻo bị dắt mũi nhé — tôi thấy ${targetName} mới là người đáng nghi nhất ở đây.`,
        en: `Careful not to fall for distractions — ${targetName} is the one acting shady here.`,
      },
      {
        vi: `Đừng nhìn sai hướng! Nếu phân tích kỹ thì ${targetName} có động cơ rất lạ.`,
        en: `Everyone’s looking the wrong way; ${targetName}’s angle makes zero sense.`,
      },
    ],
    protector: [
      {
        vi: `Chúng ta phải bảo vệ phe Dân trước đã — ${targetName}, bạn giải thích rõ để cả làng khỏi vote nhầm đi.`,
        en: `We need to keep the village unified — ${targetName}, help clear your name so we don’t mislynch.`,
      },
      {
        vi: `Đừng vội xé lẻ phiếu, nhưng tôi cần ${targetName} chứng minh mình thuộc phe Dân.`,
        en: `Let’s stay disciplined and hear ${targetName}’s defense clearly.`,
      },
    ],
    wildcard: [
      {
        vi: `Trực giác quanh lửa trại mách bảo tôi phải để mắt tới ${targetName} hôm nay — cảm giác lạ lắm!`,
        en: `My campfire gut says keep a close eye on ${targetName} today — something feels wild.`,
      },
      {
        vi: `Bàn này căng thật đấy! Tôi đặt dấu hỏi lớn lên ${targetName} xem phản ứng ra sao.`,
        en: `Plot twist energy today — I’m testing ${targetName} to see how they react!`,
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
    const uniqueText = claimUniqueRoundLine(brain, round, [text], lang, rng);
    usedSpeakers.add(speaker.id);
    brain.spokenCounts[speaker.id] = (brain.spokenCounts[speaker.id] ?? 0) + 1;
    recordPublicChatMessage(brain, {
      senderId: speaker.id,
      senderName: speaker.name,
      text: uniqueText,
      round,
    });
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
      text: uniqueText,
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
      });
      const night =
        killedNames.length > 0
          ? tr(lang, {
            vi: `Đêm qua mất ${killedNames.join(', ')} — cả làng phải tỉnh táo kẻo quyền lực x2 rơi vào tay Sói!`,
            en: `We lost ${killedNames.join(', ')} overnight — stay sharp so double vote power doesn’t swing to the Wolves!`,
          })
          : tr(lang, {
            vi: 'Đêm qua bình yên, nhưng quyền lực Thị Trưởng sẽ quyết định bàn cân hôm nay!',
            en: 'A peaceful night, yet that 2x vote will shape today’s lynch!',
          });
      dawnText = `${crown} ${night}`;
    } else if (killedNames.length === 0) {
      dawnText =
        brain.activeStoryline === 'silent_night_paranoia'
          ? tr(lang, {
            vi: 'Đêm qua hoàn toàn bình yên! Không biết Bảo Vệ đã đỡ chuẩn, Phù Thủy cứu người, hay Sói vừa cắn trúng Bán Sói / Già Làng nữa...',
            en: 'A completely silent night! Either the Bodyguard nailed the shield, the Witch healed, or the Wolves hit the Elder or Cursed...',
          })
          : tr(lang, {
            vi: 'Đêm qua không ai tử trận! Một pha cứu người quá xuất sắc, nhưng đừng chủ quan vì đàn Sói vẫn đang ngồi ngay quanh lửa trại.',
            en: 'Zero casualties overnight! Great save for the village, though the Wolves are still sitting right beside us.',
          });
    } else if (killedNames.length >= 2) {
      dawnText = tr(lang, {
        vi: `Trời ơi, một đêm đẫm máu — mất tới ${killedNames.length} người (${killedNames.join(', ')})! Chắc chắn có liên kết Tình Nhân, Bình Độc Phù Thủy, hoặc Sói Con cuồng nộ rồi!`,
        en: `A brutal night — we lost ${killedNames.length} villagers (${killedNames.join(', ')})! Lovers, Witch Poison, or Wolf Pup frenzy is definitely in play!`,
      });
    } else {
      dawnText = tr(lang, {
        vi: `Đêm qua ${killedNames[0]} đã ngã xuống rồi... Mọi người bình tĩnh chia sẻ thông tin trước khi dồn phiếu nhé.`,
        en: `We lost ${killedNames[0]} last night... Let’s share reads calmly before locking votes.`,
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
        })
        : tr(lang, {
          vi: `Tôi lên nhận Tiên Tri luôn cho rõ ràng: đêm qua tôi soi ${frameTarget.name} và thấy dấu hiệu MA SÓI! Mọi người đừng để họ dẫn dắt!`,
          en: `Stepping up as Seer: I inspected ${frameTarget.name} last night and got WEREWOLF! Don’t let them control the table!`,
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
        });
      const voteText = tr(lang, {
        vi: `Lật lại lịch sử phiếu Ngày ${prevSnapshot.round}: ${prevVoteTarget.name} đã bỏ phiếu cho ${votedName} — hành động đó rất đáng nghi!`,
        en: `Checking Day ${prevSnapshot.round}’s vote log: ${prevVoteTarget.name} voted for ${votedName} — that vote trail looks very suspicious!`,
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
          });
        } else {
          adjustPublicSuspicion(brain, target.id, 12);
          crossText = trulyQuiet.includes(target)
            ? tr(lang, {
              vi: `Từ đầu đến giờ ${target.name} chưa lên tiếng phân tích gì — sự im lặng đó khiến tôi bắt đầu nghi ngờ.`,
              en: `${target.name} hasn’t spoken up yet today — staying that quiet makes me suspicious.`,
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
      },
      {
        vi: 'Bàn này suy luận rối rắm quá... Tôi chán giải thích rồi, các người muốn nghi tôi là Sói thì cứ tự nhiên!',
        en: 'This debate is exhausting... I’m done defending myself, suspect me if you want!',
      },
    ], rng));
    pushBeat(botTanner, tannerText);
  } else if (botWitch && witchHealedLiving) {
    adjustPublicSuspicion(brain, witchHealedLiving.id, -18);
    const witchText = tr(lang, {
      vi: `Tôi có lý do rất chắc chắn để tin ${witchHealedLiving.name} là người tốt — hôm nay tuyệt đối đừng treo nhầm ${witchHealedLiving.name}!`,
      en: `I have solid reason to trust ${witchHealedLiving.name} is clean — let’s definitely not lynch ${witchHealedLiving.name} today!`,
    });
    pushBeat(botWitch, witchText);
  } else if (brain.activeStoryline === 'mayor_coup' && context.mayorId) {
    const mayorObj = alive.find((p) => p.id === context.mayorId);
    const speaker = pickUnusedBot((b) => b.id !== context.mayorId);
    if (mayorObj && speaker) {
      const text = tr(lang, {
        vi: `Thị Trưởng ${mayorObj.name} đang cầm lá phiếu x2 quyền lực nhất bàn! ${mayorObj.name} định dẫn phiếu về phía ai để cả làng theo dõi?`,
        en: `Mayor ${mayorObj.name} holds the decisive 2x vote! Where are you leading today’s vote, ${mayorObj.name}?`,
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
    });
  } else if (leader.roleId === 'hunter') {
    claimedRole = 'hunter';
    const pusher = accuser
      ? accuser.name
      : tr(lang, {
        vi: 'kẻ đẩy phiếu mạnh nhất',
        en: 'whoever pushed this wagon',
      });
    text = tr(lang, {
      vi: `Khoan đã! Tôi là Thợ Săn — nếu bị treo cổ hôm nay, phát súng cuối cùng của tôi sẽ bắn thẳng vào ${pusher}! Đừng để Sói cười thầm!`,
      en: `Wait! I’m the Hunter — if you lynch me today, my dying bullet goes straight into ${pusher}!`,
    });
  } else if (leader.roleId === 'elder') {
    claimedRole = 'elder';
    text = tr(lang, {
      vi: 'Dừng tay ngay cả làng! Tôi chính là Già Làng — treo cổ nhầm tôi thì toàn bộ Tiên Tri, Bảo Vệ và Phù Thủy sẽ bị phong ấn mất hết kỹ năng đấy!',
      en: 'Stop the vote! I am the Elder — lynching me will seal ALL Villager special powers for the rest of the match!',
    });
  } else if (leader.roleId === 'seer') {
    claimedRole = 'seer';
    const checks = Object.entries(brain.seerChecksByBot[leader.id] || {})
      .map(([id, res]) => {
        const name = players.find((p) => p.id === id)?.name || id;
        return `${name}=${res === 'wolf' ? tr(lang, {
            vi: 'Sói',
            en: 'Wolf',
          }) : tr(lang, {
            vi: 'Dân',
            en: 'Good',
          })}`;
      })
      .join(', ');
    text = tr(lang, {
      vi: `Đừng treo tôi — tôi là Tiên Tri thật!${checks ? ` Lịch sử soi của tôi: ${checks}.` : ''} Chuyển phiếu sang kẻ đang gài bẫy tôi ngay!`,
      en: `Don’t lynch your real Seer!${checks ? ` My checks: ${checks}.` : ''} Flip the vote onto the real wolves!`,
    });
  } else if (leader.roleId === 'bodyguard' || leader.roleId === 'witch') {
    claimedRole = leader.roleId;
    const roleLabel = ROLES[leader.roleId].name[lang] || ROLES[leader.roleId].name.vi;
    text = tr(lang, {
      vi: `Bình tĩnh đã! Tôi là ${roleLabel} đang âm thầm giữ mạng cho làng — mất tôi đêm nay bầy Sói sẽ làm loạn mất!`,
      en: `Hold on! I’m the ${roleLabel} keeping this village alive — losing me tonight hands the game to the Wolves!`,
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
      })
      : tr(lang, {
        vi: 'Đàn Sói đang lợi dụng để đẩy một Dân Làng',
        en: 'The real Wolves are steering this mislynch',
      });
    text = tr(lang, {
      vi: `Cả làng đang bị dắt mũi rồi! ${blame} — xin hãy suy nghĩ lại trước khi hết giờ!`,
      en: `You’re all being played! ${blame} — reconsider before time runs out!`,
    });
  } else {
    text = tr(lang, pickFrom([
      {
        vi: `Tôi chỉ là Dân Làng vô tội! Hãy nhìn kỹ ai đang hùa theo đẩy phiếu cho tôi${accuser ? ` — ${accuser.name}, bạn giải thích đi!` : '!'}`,
        en: `I’m an innocent Villager! Watch closely who piled onto this wagon${accuser ? ` — ${accuser.name}, why the rush?` : '!'}`,
      },
      {
        vi: 'Treo nhầm tôi là mất thêm một lá phiếu phe Dân đấy! Còn thời gian, mọi người kiểm tra lại nghi phạm thật đi!',
        en: 'Mislynching me only hands numbers to the Wolves! Check the real suspects before locking!',
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
  const foundWithPos: Array<{ player: Player; pos: number }> = [];
  const seen = new Set<string>();

  players.forEach((p, idx) => {
    if (!p.isAlive || p.id === excludeId) return;
    const seatNum = idx + 1;
    const nameLower = p.name.toLowerCase();
    const nameFolded = foldVietnamese(p.name);
    const seatRx = new RegExp(`(?:#|số\\s*|so\\s*|seat\\s*|bạn\\s+số\\s*|ban\\s+so\\s*|người\\s+số\\s*|nguoi\\s+so\\s*)${seatNum}(?!\\d)`, 'i');
    const seatMatch = seatRx.exec(folded) || seatRx.exec(lower);
    const namePos = nameLower.length >= 2 ? lower.indexOf(nameLower) : -1;
    const foldedPos = nameFolded.length >= 2 ? folded.indexOf(nameFolded) : -1;
    const bestPos = [
      seatMatch ? seatMatch.index : Infinity,
      namePos >= 0 ? namePos : Infinity,
      foldedPos >= 0 ? foldedPos : Infinity,
    ].reduce((a, b) => Math.min(a, b), Infinity);

    if (bestPos < Infinity && !seen.has(p.id)) {
      seen.add(p.id);
      foundWithPos.push({ player: p, pos: bestPos });
    }
  });

  // Sort by order of appearance so "#2 thấy #6 thế nào" yields [#2, #6]!
  foundWithPos.sort((a, b) => a.pos - b.pos);
  const found = foundWithPos.map((x) => x.player);

  // If no full-name/seat match, allow unambiguous last-word match (e.g. "Hoàng" if unique)
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

function formatSeatTag(players: Player[], player: Player): string {
  const idx = players.findIndex((p) => p.id === player.id);
  return idx >= 0 ? `${player.name} (#${idx + 1})` : player.name;
}

function pickBotTopSuspectForChat(
  brain: AIMatchBrain,
  bot: Player,
  players: Player[],
  rng: () => number
): Player | null {
  const isWolfBot = isBitingWolf(bot.roleId);
  const candidates = players.filter(
    (p) =>
      p.isAlive &&
      p.id !== bot.id &&
      p.id !== bot.loverId &&
      (!isWolfBot || !isBitingWolf(p.roleId))
  );
  if (candidates.length === 0) return null;

  const ownSeerChecks = bot.roleId === 'seer' ? brain.seerChecksByBot[bot.id] || {} : {};
  const scored = candidates.map((p) => {
    let score = brain.publicSuspicion[p.id] ?? 0;
    if (ownSeerChecks[p.id] === 'wolf') score += 120;
    if (ownSeerChecks[p.id] === 'good') score -= 90;
    if ((brain.spokenCounts[p.id] ?? 0) === 0) score += 10;
    return { item: p, score };
  });
  return pickWeightedTop(scored, rng, 6);
}

function buildPublicEvidenceReason(
  brain: AIMatchBrain,
  subject: Player,
  players: Player[],
  lang: Language
): string {
  const seatLabel = formatSeatTag(players, subject);
  // 1. Check previous round vote trail
  const prevVoteSnap = [...brain.voteHistory].reverse().find((s) =>
    s.votes.some((v) => v.voterId === subject.id)
  );
  if (prevVoteSnap) {
    const rec = prevVoteSnap.votes.find((v) => v.voterId === subject.id);
    const votedTarget = rec ? players.find((p) => p.id === rec.targetId) : null;
    if (votedTarget) {
      return lang === 'vi'
        ? `Ngày ${prevVoteSnap.round} ${seatLabel} từng bỏ phiếu cho ${formatSeatTag(players, votedTarget)} khá lệch nhịp nên tôi cần kiểm chứng kỹ.`
        : `On Day ${prevVoteSnap.round}, ${seatLabel} voted for ${formatSeatTag(players, votedTarget)} off-tempo, which raised a red flag for me.`;
    }
  }
  // 2. Check rival/contested public claims
  const subjectClaim = brain.publicClaims.find((c) => c.speakerId === subject.id);
  if (subjectClaim) {
    const roleLabel = ROLES[subjectClaim.claimedRole].name[lang] || ROLES[subjectClaim.claimedRole].name.en;
    return lang === 'vi'
      ? `${seatLabel} vừa nhận vai ${roleLabel} nhưng dữ kiện quanh lửa trại vẫn chưa đủ khớp để tôi tin hoàn toàn.`
      : `${seatLabel} claimed ${roleLabel}, but the campfire timeline still doesn’t fully back that claim yet.`;
  }
  // 3. Check silence / low activity
  if ((brain.spokenCounts[subject.id] ?? 0) <= 1) {
    return lang === 'vi'
      ? `Từ đầu đến giờ ${seatLabel} nói quá ít và né đưa ra lập trường rõ ràng, kiểu im hơi đó rất hay là Sói ẩn mình.`
      : `${seatLabel} has barely spoken or taken a clear stance yet — staying that quiet is classic Wolf camouflage.`;
  }
  // 4. General public suspicion / reaction read
  const susp = brain.publicSuspicion[subject.id] ?? 0;
  if (susp >= 15) {
    return lang === 'vi'
      ? `Nhịp phản ứng của ${seatLabel} hơi vội và có nhiều điểm vênh với các lượt phát biểu trước nên tôi đang đặt dấu hỏi lớn.`
      : `${seatLabel}’s push felt rushed and clashed with earlier reads, so I’m keeping pressure on them.`;
  }
  return lang === 'vi'
    ? `Chưa có bằng chứng tuyệt đối, nhưng ${seatLabel} là một trong những ghế đáng kiểm tra phản ứng nhất lúc này.`
    : `No smoking gun yet, but ${seatLabel} is one of the best pressure tests we have right now.`;
}

/**
 * Lightweight VI/EN human chat intent parser & targeted bot responder (Wave 2 Tier 1).
 * Handles seat targeting, reason queries, game-state/suspect questions, role claims,
 * accusations, vouches, and short conversational lines with anti-repetition & vote-chat sync.
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
  const alive = players.filter((p) => p.isAlive);
  const aliveBots = alive.filter((p) => p.isBot);
  if (aliveBots.length === 0) return [];

  const humanPlayer = players.find((p) => p.id === brain.humanId);
  brain.spokenCounts[brain.humanId] = (brain.spokenCounts[brain.humanId] ?? 0) + 1;
  recordPublicChatMessage(brain, {
    senderId: brain.humanId,
    senderName: humanPlayer?.name || (lang === 'vi' ? 'Bạn' : 'You'),
    text: trimmed,
    round,
  });

  const claimedRole = detectHumanRoleClaim(trimmed);
  const mentioned = findMentionedLivingPlayers(trimmed, players, brain.humanId);
  const primaryMentioned = mentioned[0] || null;
  const secondaryMentioned = mentioned[1] || null;

  const isNegatedTrust = /(khong tin|ko tin|chua tin|don't trust|dont trust|not clean|gia dan)/i.test(folded);
  const isReasonQuery =
    /(tai sao|vi sao|sao vote|sao lai vote|sao nghi|bang chung|ly do|co so gi|why vote|why sus|why me|why do you|evidence|proof|reason)/i.test(
      folded
    );
  const isWhoDiedQuery =
    /(dem qua ai chet|ai chet|ai bi can|ai moi chet|who died|who got killed|last night)/i.test(
      folded
    );
  const isWolfCountQuery =
    /(con may soi|bao nhieu soi|may con soi|how many wolves|wolves left)/i.test(folded);
  const isOpinionQuery =
    /(thay .* the nao|nghi sao ve|nghi gi ve|ai la soi|nghi ai|vote ai|treo ai|nen vote ai|who is wolf|who should we vote|who to vote|what do you think|your read on|read on)/i.test(
      folded
    );
  const isSkipPrompt = /\b(skip|bo phieu trang|khong treo|ko treo|hoa phieu|abstain|pass)\b/i.test(folded);
  const isGreetingOrSilenceCheck =
    /\b(hello|hi|chao|hey|alo|im vay|im the|sao im|noi gi di|anyone|quiet|helloo)\b/i.test(folded);

  const isAccuse =
    !isReasonQuery &&
    !isOpinionQuery &&
    !isWhoDiedQuery &&
    !isWolfCountQuery &&
    (/(nghi|soi\b|ma soi|treo|vote|dang ngo|ke xau|wolf|werewolf|\bsus\b|suspicious|lynch|guilty|fake)/i.test(
      folded
    ) ||
      isNegatedTrust);
  const isVouch =
    !isNegatedTrust &&
    !isReasonQuery &&
    !isOpinionQuery &&
    /(tin\b|tin tuong|dan lang|nguoi tot|benh\b|vo toi|trust|clean|innocent|vouch|\bgood\b|\bsafe\b)/i.test(
      folded
    );

  const replies: ScheduledBotBeat[] = [];
  const used = new Set<string>();

  const pushReply = (
    bot: Player,
    candidates: string[],
    delayMs: number,
    extra?: { claimedRole?: RoleId; targetId?: string; checkResult?: 'wolf' | 'good'; statedSuspectId?: string }
  ) => {
    const text = claimUniqueRoundLine(brain, round, candidates, lang, rng);
    used.add(bot.id);
    brain.spokenCounts[bot.id] = (brain.spokenCounts[bot.id] ?? 0) + 1;
    recordPublicChatMessage(brain, {
      senderId: bot.id,
      senderName: bot.name,
      text,
      round,
    });
    if (extra?.statedSuspectId) {
      if (!brain.statedVoteTargetByBot) brain.statedVoteTargetByBot = {};
      brain.statedVoteTargetByBot[bot.id] = { round, targetId: extra.statedSuspectId };
    }
    replies.push({
      delayMs,
      speakerId: bot.id,
      speakerName: bot.name,
      persona: brain.personas[bot.id],
      text,
      ...(extra?.claimedRole ? { claimedRole: extra.claimedRole } : {}),
      ...(extra?.targetId ? { targetId: extra.targetId } : {}),
      ...(extra?.checkResult ? { checkResult: extra.checkResult } : {}),
    });
  };

  // 1. Record Human Role Claim & Counter-Claim Pushback
  if (claimedRole) {
    const checkResult: 'wolf' | 'good' | undefined =
      claimedRole === 'seer' && primaryMentioned
        ? isAccuse || /(la soi|is wolf|werewolf)/i.test(folded)
          ? 'wolf'
          : isVouch || /(la dan|nguoi tot|good|clean)/i.test(folded)
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

    // Real bot holding that unique power role immediately pushes back!
    const uniqueClaimableRoles: RoleId[] = ['seer', 'bodyguard', 'witch', 'hunter', 'elder', 'cupid'];
    const realRoleHolder = uniqueClaimableRoles.includes(claimedRole)
      ? aliveBots.find((b) => b.roleId === claimedRole && !(claimedRole === 'seer' && b.hasUsedPower))
      : null;

    if (realRoleHolder) {
      const roleLabel = ROLES[claimedRole].name[lang] || ROLES[claimedRole].name.en;
      addPublicClaim(brain, {
        speakerId: realRoleHolder.id,
        claimedRole,
        round,
      });
      adjustPublicSuspicion(brain, brain.humanId, 38);
      pushReply(
        realRoleHolder,
        claimedRole === 'seer'
          ? [
              tr(lang, {
                vi: 'Khoan đã! Bạn đang nói dối — TÔI mới là Tiên Tri thật! Cả làng cẩn thận, đừng để Sói cướp vai!',
                en: 'Hold on! You’re lying — I am the real Seer! Village, don’t fall for a Wolf counter-claim!',
              }),
              tr(lang, {
                vi: 'Đừng tin! Tôi mới là Tiên Tri thật của làng này — ai cướp vai tôi thì chắc chắn là Sói!',
                en: 'Don’t buy that! I’m the actual Seer — anyone stealing my claim is a Wolf!',
              }),
            ]
          : [
              tr(lang, {
                vi: `Khoan đã! Bạn nhận ${roleLabel} là sao? TÔI mới là ${roleLabel} thật — cả làng kiểm tra kỹ người vừa cướp vai đi!`,
                en: `Wait a second! How are you claiming ${roleLabel} when I’m the real ${roleLabel}? Everyone watch this fake claim!`,
              }),
            ],
        1450,
        { claimedRole, statedSuspectId: brain.humanId }
      );
    } else {
      const challenger =
        aliveBots.find(
          (b) =>
            !used.has(b.id) &&
            (isBitingWolf(b.roleId) ||
              brain.personas[b.id] === 'detective' ||
              brain.personas[b.id] === 'manipulator')
        ) || aliveBots[0];
      if (challenger) {
        const roleLabel = ROLES[claimedRole].name[lang] || ROLES[claimedRole].name.en;
        const isWolfChallenger = isBitingWolf(challenger.roleId);
        pushReply(
          challenger,
          claimedRole === 'seer'
            ? [
                tr(lang, {
                  vi: isWolfChallenger
                    ? `Bạn nhận ${roleLabel} vội quá đấy — có gì đảm bảo bạn không phải Sói đóng kịch để dẫn phiếu?`
                    : `Bạn nhận ${roleLabel} à? Vậy đêm qua bạn soi ai và có manh mối cụ thể nào để cả làng kiểm chứng không?`,
                  en: isWolfChallenger
                    ? `That ${roleLabel} claim came out fast — how do we know you aren’t a Wolf steering the vote?`
                    : `Claiming ${roleLabel}? Name who you inspected and why we should trust your claim!`,
                }),
              ]
            : [
                tr(lang, {
                  vi: `Ghi nhận bạn nhận vai ${roleLabel}! Nếu là thật thì giữ lập trường rõ để phe Dân phối hợp nhé.`,
                  en: `Noted on your ${roleLabel} claim — let’s see if the night results back you up.`,
                }),
              ],
          1550
        );
      }
    }
  }

  // 2. Game-State Queries: Who died last night?
  if (replies.length === 0 && isWhoDiedQuery) {
    const responder =
      (primaryMentioned && primaryMentioned.isBot ? primaryMentioned : null) ||
      aliveBots.find((b) => brain.personas[b.id] === 'observer' || brain.personas[b.id] === 'detective') ||
      aliveBots[0];
    const latestDawn = brain.dawnDeathHistory[brain.dawnDeathHistory.length - 1];
    const victims = (latestDawn?.victimIds || [])
      .map((id) => players.find((p) => p.id === id))
      .filter((p): p is Player => Boolean(p));

    if (responder) {
      if (victims.length === 0) {
        pushReply(
          responder,
          [
            tr(lang, {
              vi: 'Đêm qua không ai chết cả! Bảo Vệ đỡ chuẩn, Phù Thủy cứu kịp, hoặc Sói cắn hụt rồi.',
              en: 'Nobody died last night! Either a clean save happened or the Wolves missed.',
            }),
            tr(lang, {
              vi: 'Sáng nay làng bình yên nguyên vẹn, đêm qua không có nạn nhân nào ngã xuống.',
              en: 'Peaceful dawn — zero casualties overnight.',
            }),
          ],
          1450
        );
      } else {
        const list = victims.map((v) => formatSeatTag(players, v)).join(', ');
        pushReply(
          responder,
          [
            tr(lang, {
              vi: `Đêm qua mất ${list} rồi. Mọi người xem ai đang né nhắc tới vụ này nhé.`,
              en: `We lost ${list} last night. Pay attention to who’s dodging the discussion.`,
            }),
            tr(lang, {
              vi: `Sáng nay ${list} đã thiệt mạng — mình cần xâu chuỗi xem ai hưởng lợi nhất.`,
              en: `${list} fell overnight — let’s trace who benefits most from that kill.`,
            }),
          ],
          1450
        );
      }
    }
  }

  // 3. Game-State Queries: How many wolves left? (Strictly zero-leak public estimate!)
  if (replies.length === 0 && isWolfCountQuery) {
    const responder =
      (primaryMentioned && primaryMentioned.isBot ? primaryMentioned : null) ||
      aliveBots.find((b) => brain.personas[b.id] === 'detective') ||
      aliveBots[0];
    if (responder) {
      const totalPlayers = players.length;
      const expectedStartWolves =
        totalPlayers <= 5 ? 1 : totalPlayers <= 10 ? 2 : totalPlayers <= 15 ? 3 : 4;
      const revealedDeadWolves = Object.values(brain.revealedRoles).filter((r) =>
        isBitingWolf(r)
      ).length;
      const maxRemaining = Math.max(1, expectedStartWolves - revealedDeadWolves);
      pushReply(
        responder,
        [
          tr(lang, {
            vi: `Bàn ${totalPlayers} người thường có tầm ${expectedStartWolves} Sói ban đầu, đã lộ treo ${revealedDeadWolves} Sói — nên vẫn còn khoảng tối đa ${maxRemaining} Sói đang ẩn mình (chưa tính người chết ban đêm không lộ vai).`,
            en: `A ${totalPlayers}-player village typically starts with ~${expectedStartWolves} Wolves and we’ve confirmed ${revealedDeadWolves} lynched — so up to ${maxRemaining} could still be hiding among us.`,
          }),
        ],
        1500
      );
    }
  }

  // 4. Vote / Suspicion Reason Queries ("sao vote tao", "vì sao nghi #4", "bằng chứng đâu")
  if (replies.length === 0 && isReasonQuery) {
    const mentionsSelf = /(tao|toi|minh|me\b|my\b)/i.test(folded);
    const subject =
      mentionsSelf || !primaryMentioned
        ? humanPlayer || alive[0]
        : secondaryMentioned || primaryMentioned;
    const responder =
      (primaryMentioned && primaryMentioned.isBot && primaryMentioned.id !== subject.id
        ? primaryMentioned
        : null) ||
      aliveBots.find((b) => {
        const lastSnap = brain.voteHistory[brain.voteHistory.length - 1];
        return Boolean(lastSnap?.votes.some((v) => v.voterId === b.id && v.targetId === subject.id));
      }) ||
      aliveBots.find((b) => brain.personas[b.id] === 'prosecutor' || brain.personas[b.id] === 'detective') ||
      aliveBots[0];

    if (responder && subject) {
      const evidence = buildPublicEvidenceReason(brain, subject, players, lang);
      pushReply(
        responder,
        [evidence],
        1500,
        subject.id !== responder.id && subject.isAlive ? { statedSuspectId: subject.id } : undefined
      );
    }
  }

  // 5. Targeted Opinion / Suspect Query ("#2 thấy #6 thế nào", "ai là sói", "vote ai")
  if (replies.length === 0 && isOpinionQuery) {
    const addressedBot =
      primaryMentioned && primaryMentioned.isBot ? primaryMentioned : null;
    const subject = secondaryMentioned || (!addressedBot ? primaryMentioned : null);
    const responder =
      addressedBot ||
      aliveBots.find(
        (b) => brain.personas[b.id] === 'detective' || brain.personas[b.id] === 'prosecutor'
      ) ||
      aliveBots[0];

    if (responder) {
      if (subject && subject.id !== responder.id) {
        const seatLabel = formatSeatTag(players, subject);
        const ownCheck =
          responder.roleId === 'seer' ? brain.seerChecksByBot[responder.id]?.[subject.id] : undefined;
        const isPackmate = isBitingWolf(responder.roleId) && isBitingWolf(subject.roleId);
        const susp = brain.publicSuspicion[subject.id] ?? 0;

        if (ownCheck === 'wolf') {
          pushReply(
            responder,
            [
              tr(lang, {
                vi: `Nói thẳng nhé: tôi nghi ${seatLabel} cực kỳ nặng, đề nghị cả làng dồn phiếu vào ${seatLabel} hôm nay!`,
                en: `Straight up: ${seatLabel} is my #1 Wolf suspect — let’s put our votes on ${seatLabel} today!`,
              }),
            ],
            1500,
            { statedSuspectId: subject.id }
          );
        } else if (ownCheck === 'good' || isPackmate || responder.loverId === subject.id) {
          pushReply(
            responder,
            [
              tr(lang, {
                vi: `Theo quan sát của tôi thì ${seatLabel} khá ổn định và chưa lộ sơ hở gì — tạm thời đừng phí phiếu lên họ.`,
                en: `From my read, ${seatLabel} seems steady so far — I wouldn’t waste today’s vote there.`,
              }),
              tr(lang, {
                vi: `Tôi thấy ${seatLabel} có vẻ nghiêng về phe Dân hơn, nên soi mấy ghế im lặng khác trước.`,
                en: `${seatLabel} reads town-leaning to me; let’s pressure quieter seats first.`,
              }),
            ],
            1500
          );
        } else if (susp >= 18) {
          const reason = buildPublicEvidenceReason(brain, subject, players, lang);
          pushReply(
            responder,
            [
              tr(lang, {
                vi: `Tôi cũng đang đặt dấu hỏi lên ${seatLabel}. ${reason}`,
                en: `I’m suspicious of ${seatLabel} too. ${reason}`,
              }),
            ],
            1500,
            { statedSuspectId: subject.id }
          );
        } else {
          pushReply(
            responder,
            [
              tr(lang, {
                vi: `Với ${seatLabel} tôi đang ở mức 50/50 — muốn nghe họ nêu tên nghi phạm rõ hơn rồi mới chốt phiếu.`,
                en: `I’m 50/50 on ${seatLabel} right now — want to hear a clear suspect from them before voting.`,
              }),
              tr(lang, {
                vi: `${seatLabel} chưa lộ bằng chứng rõ ràng, nhưng tôi vẫn đang để mắt tới cách họ bỏ phiếu vòng này.`,
                en: `No hard read on ${seatLabel} yet, though I’m watching closely how they vote today.`,
              }),
            ],
            1500
          );
        }
      } else {
        // General "ai là sói / vote ai" -> name current top suspect and sync with Day voting!
        const topSuspect = pickBotTopSuspectForChat(brain, responder, players, rng);
        if (topSuspect) {
          const suspectTag = formatSeatTag(players, topSuspect);
          const reason = buildPublicEvidenceReason(brain, topSuspect, players, lang);
          pushReply(
            responder,
            [
              tr(lang, {
                vi: `Hiện tại tôi nghiêng về vote ${suspectTag}. ${reason}`,
                en: `Right now I’m leaning toward voting ${suspectTag}. ${reason}`,
              }),
              tr(lang, {
                vi: `Nếu phải chốt phiếu lúc này, tôi chọn ${suspectTag} — mọi người thấy hợp lý không?`,
                en: `If we lock votes now, I’m going with ${suspectTag} — what does everyone else think?`,
              }),
            ],
            1500,
            { statedSuspectId: topSuspect.id }
          );
        }
      }
    }
  }

  // 6. Process Human Accusation against a named/seated player
  if (isAccuse && primaryMentioned) {
    adjustPublicSuspicion(brain, primaryMentioned.id, 22);

    if (primaryMentioned.isBot && !used.has(primaryMentioned.id)) {
      let candidates: string[] = [];
      if (primaryMentioned.roleId === 'tanner') {
        adjustPublicSuspicion(brain, primaryMentioned.id, 10);
        candidates = [
          tr(lang, {
            vi: 'Ồ, nghi tôi nhanh thế? Nếu bạn tự tin vậy thì cứ bỏ phiếu treo cổ tôi đi, xem ai mới hối hận!',
            en: 'Oh, pointing at me already? Go ahead and vote me out if you’re so sure — don’t regret it!',
          }),
          tr(lang, {
            vi: 'Cứ thoải mái dồn phiếu cho tôi đi, tôi chán thanh minh rồi đấy!',
            en: 'Feel free to pile votes on me — I’m tired of defending myself anyway!',
          }),
        ];
      } else if (isBitingWolf(primaryMentioned.roleId)) {
        const claimsSeer = brain.publicClaims.some(
          (c) => c.speakerId === primaryMentioned.id && c.claimedRole === 'seer'
        );
        candidates = claimsSeer
          ? [
              tr(lang, {
                vi: 'Tôi là Tiên Tri, soi được gì tôi đã báo cả làng rồi! Đổ tội cho tôi lúc này chỉ có lợi cho Sói thôi!',
                en: 'I’m the Seer and I already shared my results! Pushing on me now only helps the Wolves!',
              }),
            ]
          : [
              tr(lang, {
                vi: 'Nghi vô cớ thế bạn? Tôi chỉ là Dân Làng thôi — bạn vội đổ tội cho tôi như vậy có khi mới đáng nghi đấy!',
                en: 'Baseless accusation! I’m a regular Villager — pushing on me this fast makes you look pretty sus yourself!',
              }),
              tr(lang, {
                vi: 'Tôi là Dân Làng đàng hoàng! Bạn có bằng chứng gì không hay chỉ đang đẩy phiếu cho nhanh?',
                en: 'I’m just a Villager! Got any evidence, or are you only rushing the vote?',
              }),
            ];
      } else if (primaryMentioned.roleId === 'seer') {
        candidates = [
          tr(lang, {
            vi: 'Bình tĩnh đi bạn, bạn đang nhắm sai người rồi! Tôi có thông tin rất quan trọng cho phe Dân đấy!',
            en: 'Slow down — you’re aiming at the wrong person! I have crucial info for the village!',
          }),
          tr(lang, {
            vi: 'Đừng dồn phiếu nhầm tôi — để tôi theo dõi thêm một đêm nữa sẽ giúp làng lọc Sói rõ hơn nhiều!',
            en: 'Don’t mislynch me — my reads are way too valuable for town right now!',
          }),
        ];
      } else {
        candidates = [
          tr(lang, {
            vi: 'Khoan đã! Bạn dựa vào bằng chứng nào mà nghi tôi là Sói? Tôi phe Dân đàng hoàng, đừng để Sói thật cười thầm!',
            en: 'Wait a second! What evidence do you have against me? I’m town — don’t let the real Wolves hide behind this!',
          }),
          tr(lang, {
            vi: 'Bạn nhìn nhầm người rồi! Tôi phe Dân — đừng vội đẩy phiếu khi chưa kiểm tra mấy ghế khác.',
            en: 'You’ve got the wrong read! I’m Villager-aligned — let’s check the quieter seats too.',
          }),
        ];
      }

      pushReply(primaryMentioned, candidates, replies.length === 0 ? 1450 : 2250);
    }

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
        const isDefendingLover = analyst.loverId === primaryMentioned.id;
        const targetTag = formatSeatTag(players, primaryMentioned);
        pushReply(
          analyst,
          isDefendingLover
            ? [
                tr(lang, {
                  vi: `Tôi thấy ${targetTag} chưa có gì đáng nghi cả — khoan vội hùa theo nhé mọi người!`,
                  en: `I don’t buy the case on ${targetTag} at all — let’s not rush a bad vote!`,
                }),
              ]
            : [
                tr(lang, {
                  vi: `Góc nhìn thú vị đấy — để tôi quan sát kỹ phản ứng của ${targetTag} trước khi bỏ phiếu.`,
                  en: `Interesting push — let’s watch how ${targetTag} responds before voting.`,
                }),
                tr(lang, {
                  vi: `Nếu bạn chắc tay về ${targetTag} thì nêu rõ thêm một chi tiết nữa để cả làng dễ theo phiếu nhé.`,
                  en: `If you’re confident on ${targetTag}, drop one more clue so the village can align.`,
                }),
              ],
          2250 + Math.round(rng() * 150)
        );
      }
    }
  } else if (isVouch && primaryMentioned && !isAccuse) {
    // 7. Process Human Vouch / Trust
    adjustPublicSuspicion(brain, primaryMentioned.id, -18);

    if (replies.length < 2 && primaryMentioned.isBot && !used.has(primaryMentioned.id)) {
      pushReply(
        primaryMentioned,
        [
          tr(lang, {
            vi: 'Cảm ơn bạn đã tin tưởng! Cùng nhau lọc ra Sói thật quanh lửa trại nhé.',
            en: 'Appreciate the trust! Let’s focus together on finding the real Wolves.',
          }),
          tr(lang, {
            vi: 'Cảm ơn bạn — mình cũng đang cố giữ nhịp cho phe Dân, giờ tập trung tìm ghế lệch nhịp thôi.',
            en: 'Thanks for backing me — now let’s narrow down whoever’s actually hiding.',
          }),
        ],
        replies.length === 0 ? 1500 : 2300
      );
    }

    if (replies.length < 2) {
      const skeptic = aliveBots.find(
        (b) =>
          !used.has(b.id) &&
          (brain.personas[b.id] === 'prosecutor' || brain.personas[b.id] === 'manipulator')
      );
      if (skeptic) {
        const targetTag = formatSeatTag(players, primaryMentioned);
        pushReply(
          skeptic,
          [
            tr(lang, {
              vi: `Sao bạn chắc chắn ${targetTag} là Dân thế? Cẩn thận kẻo bênh nhầm Sói đấy!`,
              en: `Why are you so sure ${targetTag} is clean? Careful not to vouch for a Wolf!`,
            }),
            tr(lang, {
              vi: `Bênh ${targetTag} sớm quá có khi tự biến hai người thành cặp đôi bị nghi đấy nhé.`,
              en: `Vouching for ${targetTag} this early might make both of you look linked.`,
            }),
          ],
          2300
        );
      }
    }
  }

  // 8. Short Conversational Lines: Skip / Greetings / Direct seat ping / General fallback
  if (replies.length === 0 && isSkipPrompt) {
    const responder =
      (primaryMentioned && primaryMentioned.isBot ? primaryMentioned : null) ||
      aliveBots.find((b) => brain.personas[b.id] === 'protector' || brain.personas[b.id] === 'prosecutor') ||
      aliveBots[0];
    if (responder) {
      pushReply(
        responder,
        [
          tr(lang, {
            vi:
              round <= 1
                ? 'Vòng 1 ít dữ kiện thì bỏ phiếu trắng (Skip) cũng an toàn, nhưng ai nghi ai cứ nói trước để mai còn đối chiếu.'
                : 'Nếu cứ skip mãi là mất nhịp vào tay Sói đấy! Ít nhất hôm nay nên kiểm tra 1 ghế đáng nghi.',
            en:
              round <= 1
                ? 'Skipping Day 1 is fair with thin clues, as long as everyone leaves a read for tomorrow.'
                : 'Skipping again just hands tempo to the Wolves — we should test at least one suspect today!',
          }),
          tr(lang, {
            vi: 'Tôi đồng ý chưa nên treo bừa, nhưng nếu có manh mối rõ trước khi hết giờ thì vẫn nên chốt phiếu.',
            en: 'Agreed on not mislynching blindly, though if a solid lead pops up we shouldn’t waste the day.',
          }),
        ],
        1450
      );
    }
  }

  if (replies.length === 0 && isGreetingOrSilenceCheck) {
    const responder =
      (primaryMentioned && primaryMentioned.isBot ? primaryMentioned : null) ||
      aliveBots.find((b) => !used.has(b.id)) ||
      aliveBots[0];
    if (responder) {
      pushReply(
        responder,
        [
          tr(lang, {
            vi: 'Có mặt đây! Mình đang nghe kỹ từng người nói để xem ai trả lời vòng vo nhất.',
            en: 'Right here! Just listening closely to see whose story slips first.',
          }),
          tr(lang, {
            vi: 'Chào bạn! Vòng này bạn đang để mắt tới ghế nào nhất quanh lửa trại?',
            en: 'Hey! Which seat around the campfire is giving you the weirdest vibe right now?',
          }),
          tr(lang, {
            vi: 'Mình vẫn đang theo dõi sát đây — chưa vội kết luận nhưng có vài ghế làm mình hơi cấn.',
            en: 'Still watching closely — not rushing, though a couple of seats already feel off.',
          }),
        ],
        1450
      );
    }
  }

  if (replies.length === 0 && primaryMentioned && primaryMentioned.isBot) {
    const topSuspect = pickBotTopSuspectForChat(brain, primaryMentioned, players, rng);
    const suspectHint = topSuspect ? formatSeatTag(players, topSuspect) : null;
    pushReply(
      primaryMentioned,
      [
        tr(lang, {
          vi: suspectHint
            ? `Gọi mình à? Hiện tại mình đang hơi để mắt tới ${suspectHint}, còn bạn nghĩ sao?`
            : 'Gọi mình có chuyện gì thế? Bạn đang nghi ghế nào nói rõ để cả làng bàn nhé.',
          en: suspectHint
            ? `Calling on me? I’ve got my eye on ${suspectHint} right now — what’s your read?`
            : 'Need my take? Tell me who you’re eyeing and we’ll compare notes.',
        }),
        tr(lang, {
          vi: 'Mình nghe đây! Bạn muốn kiểm tra thông tin gì cứ hỏi thẳng nhé.',
          en: 'I’m listening — ask me directly if you want my read on someone.',
        }),
      ],
      1450
    );
  }

  if (replies.length === 0) {
    const responder = pickFrom(aliveBots, rng);
    const topSuspect = pickBotTopSuspectForChat(brain, responder, players, rng);
    pushReply(
      responder,
      [
        tr(lang, {
          vi: topSuspect
            ? `Nghe hợp lý đấy. Tiện đây mọi người thấy ${formatSeatTag(players, topSuspect)} vòng này thế nào?`
            : 'Ghi nhận góc nhìn của bạn — mọi người góp thêm thông tin trước khi vào bỏ phiếu nhé.',
          en: topSuspect
            ? `Fair point. Speaking of reads, how is everyone feeling about ${formatSeatTag(players, topSuspect)}?`
            : 'Good point — let’s get a couple more reads before voting locks.',
        }),
        tr(lang, {
          vi: 'Mình đang theo dõi kỹ cuộc nói chuyện đây, ai có manh mối rõ thì lên tiếng ngay nhé.',
          en: 'Tracking the table closely — if anyone has a concrete lead, now’s the time.',
        }),
      ],
      1500
    );
  }

  return replies.slice(0, 2);
}
