import type {
  GhostNightSpectatorView,
  HunterShotRecord,
  NightActions,
  NightDeathCinematicState,
  NightResult,
  NightSkillCutsceneEvent,
  Phase,
  Player,
  RoleId,
  VoteRecord,
} from '../types/game.ts';
import { ROLES } from '../game/roles.ts';
import {
  applyDayLynch,
  buildVoteTallyEntries,
  castSingleDayVote,
  checkWinCondition,
  generateBalancedRoster,
  getDyingWolfVictimsForWitch,
  resolveNightActions,
} from '../game/rules.ts';
import {
  type AutoGMNightStep,
  buildAutoGMNightSchedule,
  buildBotDayDiscussionLines,
  buildDawnGMAnnouncement,
  buildDuskGMAnnouncement,
  buildPrivateHumanNightNotice,
  computeAutoGMBotNightStepAction,
  computeSmartBotDayVotes,
  type CustomTimerConfig,
  DEFAULT_TIMER_CONFIG,
  determineEndOfNightCinematic,
  extractChatVoteSignals,
  type GMAnnouncementData,
  isPlayerAwakeForNightStep,
  type NightStepKey,
} from '../game/autoGM.ts';
import {
  CAMPFIRE_ABSTAIN_ID,
  electMayorForVillage,
  getBotCosmetics,
  resolveNextMayorIfNeeded,
  tallyVotesWithMayor,
} from '../game/agrouMechanics.ts';
import type {
  RealtimeChatMessage,
  RealtimeParticipant,
  RealtimeTimerConfig,
} from './realtimeRooms.ts';

export type OnlineNightActionType =
  | 'wolf_bite'
  | 'wolf_second_bite'
  | 'guard'
  | 'hunter_mark'
  | 'seer_inspect'
  | 'witch_heal'
  | 'witch_poison'
  | 'cupid_link'
  | 'doppelganger_pick'
  | 'confirm_done';

export interface OnlineNightActionPayload {
  actionType: OnlineNightActionType;
  targetId?: string | null;
  secondTargetId?: string | null;
}

export interface OnlineSeerInspection {
  playerId: string;
  roleId: RoleId;
  isWerewolf: boolean;
  round: number;
}

export interface OnlineNightSelection {
  targetId?: string | null;
  secondTargetId?: string | null;
  witchHealTargetId?: string | null;
  witchPoisonTargetId?: string | null;
  cupidLovers?: [string, string] | null;
  doppelgangerTargetId?: string | null;
}

export interface OnlineGameResult {
  winner: 'villagers' | 'werewolves' | 'lovers' | 'tanner' | 'draw';
  reason: string;
  rounds: number;
  survivors: number;
}

/**
 * Authoritative server-only match state stored inside a room.
 * INVARIANT: NEVER serialized directly to clients; always project via `buildPlayerMatchView`.
 */
export interface OnlineMatchState {
  matchId: number;
  phase: Phase;
  round: number;
  phaseStartedAt: number;
  phaseEndsAt: number;
  mayorId: string | null;
  elderSealActive: boolean;
  wolfPupFrenzy: boolean;
  players: Player[];
  nightSchedule: AutoGMNightStep[];
  nightStepIndex: number;
  nightActions: NightActions;
  nightSkillEvents: NightSkillCutsceneEvent[];
  wolfPackPicks: Record<string, { primary?: string; secondary?: string }>;
  stepConfirmedBy: Record<string, boolean>;
  seerInspectionsByPlayer: Record<string, OnlineSeerInspection>;
  botWitchActedTonight: boolean;
  botComputedStepKey?: string | null;
  knownWolfIdsByBotSeer: string[];
  pendingDawnBeforePlayers?: Player[];
  pendingDawnKilledIds?: string[];
  pendingDawnNightResult?: NightResult;
  pendingDawnHunterShots?: HunterShotRecord[];
  pendingDuskBeforePlayers?: Player[];
  pendingLynchedVictimId?: string | null;
  pendingDuskVoteCounts?: Record<string, number>;
  pendingDuskVotes?: VoteRecord[];
  pendingDuskIsTie?: boolean;
  pendingDuskElderPenalty?: boolean;
  pendingDuskHunterShots?: HunterShotRecord[];
  dawnAnnouncement: GMAnnouncementData | null;
  duskAnnouncement: GMAnnouncementData | null;
  announcementDismissedAt?: number;
  deathCinematicByPlayer: Record<string, NightDeathCinematicState | null>;
  dayVotes: VoteRecord[];
  dayBotVotesComputed?: boolean;
  gameResult: OnlineGameResult | null;
  eloDeltasByPlayer?: Record<string, number>;
  eloApplied?: boolean;
}

/**
 * Strictly sanitized per-viewer projection sent over WebSocket & HTTP.
 */
export interface OnlinePlayerMatchView {
  matchId: number;
  phase: Phase;
  round: number;
  serverNow: number;
  phaseEndsAt: number;
  mayorId: string | null;
  elderSealActive: boolean;
  wolfPupFrenzy: boolean;
  players: Player[];
  currentNightStep: AutoGMNightStep | null;
  nightScheduleSummary: Array<{
    key: NightStepKey;
    roleId: RoleId;
    stepIndex: number;
    totalSteps: number;
    isMyTurn: boolean;
  }>;
  nightStepIndex: number;
  isMyNightTurn: boolean;
  hasConfirmedNightStep: boolean;
  myNightSelection: OnlineNightSelection;
  wolfPackPicks: Record<string, { primary?: string; secondary?: string }> | null;
  dyingWolfVictimIds: string[];
  mySeerInspection: OnlineSeerInspection | null;
  votes: VoteRecord[];
  announcement: GMAnnouncementData | null;
  deathCinematic: NightDeathCinematicState | null;
  ghostNightState: GhostNightSpectatorView | null;
  gameResult: {
    winner: 'villagers' | 'werewolves' | 'lovers' | 'tanner' | 'draw';
    reason: string;
    rounds: number;
    survivors: number;
    myEloDelta: number;
  } | null;
}

export interface MatchRoomBridge {
  hostId: string;
  timerConfig: RealtimeTimerConfig;
  chatMessages: RealtimeChatMessage[];
  votes: Record<string, string>;
  appendChat: (msg: RealtimeChatMessage) => void;
}

export interface EloUpdateEntry {
  userId: string;
  delta: number;
  won: boolean;
}

const DEFAULT_BOT_STEP_SEC = 4;
const DEFAULT_HUNTER_SHOT_SEC = 20;
const ANNOUNCEMENT_GRACE_MS = 8000;

function toCustomTimerConfig(cfg: RealtimeTimerConfig): CustomTimerConfig {
  return {
    nightActionSec: Math.max(15, Math.min(180, cfg.nightActionSec || DEFAULT_TIMER_CONFIG.nightActionSec)),
    botStepSec: DEFAULT_BOT_STEP_SEC,
    dayDiscussSec: Math.max(20, Math.min(600, cfg.dayDiscussSec || DEFAULT_TIMER_CONFIG.dayDiscussSec)),
    dayVoteSec: Math.max(15, Math.min(300, cfg.dayVoteSec || DEFAULT_TIMER_CONFIG.dayVoteSec)),
    hunterShotSec: DEFAULT_HUNTER_SHOT_SEC,
  };
}

function getSeatNumber(players: Player[], playerId: string): number {
  const idx = players.findIndex((p) => p.id === playerId);
  return idx >= 0 ? idx + 1 : 0;
}

function syncVotesMap(match: OnlineMatchState, ctx: MatchRoomBridge): void {
  for (const key of Object.keys(ctx.votes)) {
    delete ctx.votes[key];
  }
  for (const v of match.dayVotes) {
    if (v.voterId && v.targetId) ctx.votes[v.voterId] = v.targetId;
  }
}

function getLivingActorsForStep(
  match: OnlineMatchState,
  step: AutoGMNightStep | null
): Player[] {
  if (!step) return [];
  return match.players.filter((p) => isPlayerAwakeForNightStep(p, step.key, match.round));
}

function getLivingHumanActorsForStep(
  match: OnlineMatchState,
  step: AutoGMNightStep | null
): Player[] {
  if (!step) return [];
  return match.players.filter(
    (p) => !p.isBot && isPlayerAwakeForNightStep(p, step.key, match.round)
  );
}

function getLivingBotActorsForStep(
  match: OnlineMatchState,
  step: AutoGMNightStep | null
): Player[] {
  if (!step) return [];
  return match.players.filter(
    (p) => Boolean(p.isBot) && isPlayerAwakeForNightStep(p, step.key, match.round)
  );
}

function isWolfRole(roleId: RoleId): boolean {
  return roleId === 'werewolf' || roleId === 'wolf_pup';
}

function appendNightSkillCutscene(
  match: OnlineMatchState,
  stepKey: string,
  event: Omit<NightSkillCutsceneEvent, 'id'>
): NightSkillCutsceneEvent {
  if (!Array.isArray(match.nightSkillEvents)) {
    match.nightSkillEvents = [];
  }
  const actorKey = [...event.actorIds].sort().join(',');
  const id = `nsc_${match.matchId}_r${match.round}_${stepKey}_${event.kind}_${actorKey}_${event.primaryTargetId ?? 'none'}_${event.secondaryTargetId ?? 'none'}`;
  const existing = match.nightSkillEvents.find((e) => e.id === id);
  if (existing) return existing;

  const fullEvent: NightSkillCutsceneEvent = {
    id,
    ...event,
    actorIds: [...event.actorIds],
  };
  match.nightSkillEvents.push(fullEvent);
  return fullEvent;
}

/**
 * Records pure visual NightSkillCutsceneEvents for confirmed/executed night steps.
 * INVARIANT: Never mutates player liveness or resolveNightActions outcomes.
 */
function recordStepSkillCutscenes(
  match: OnlineMatchState,
  step: AutoGMNightStep | null
): void {
  if (!step) return;
  const actorIds = getLivingActorsForStep(match, step).map((p) => p.id);
  if (actorIds.length === 0) return;

  switch (step.key) {
    case 'doppelganger': {
      const targetId = match.nightActions.doppelgangerTargetId ?? null;
      if (targetId) {
        appendNightSkillCutscene(match, step.key, {
          kind: 'doppelganger',
          actorIds,
          primaryTargetId: targetId,
          secondaryTargetId: null,
        });
      }
      break;
    }
    case 'cupid': {
      const lovers = match.nightActions.cupidLovers;
      if (lovers && lovers.length === 2 && lovers[0] && lovers[1]) {
        appendNightSkillCutscene(match, step.key, {
          kind: 'cupid',
          actorIds,
          primaryTargetId: lovers[0],
          secondaryTargetId: lovers[1],
        });
      }
      break;
    }
    case 'bodyguard': {
      const targetId = match.nightActions.guardTargetId ?? null;
      if (targetId) {
        appendNightSkillCutscene(match, step.key, {
          kind: 'bodyguard',
          actorIds,
          primaryTargetId: targetId,
          secondaryTargetId: null,
        });
      }
      break;
    }
    case 'hunter': {
      const targetId = match.nightActions.hunterTargetId ?? null;
      if (targetId) {
        appendNightSkillCutscene(match, step.key, {
          kind: 'hunter_shot',
          actorIds,
          primaryTargetId: targetId,
          secondaryTargetId: null,
        });
      }
      break;
    }
    case 'werewolf': {
      const primaryId = match.nightActions.wolfTargetId ?? null;
      const secondaryId = match.wolfPupFrenzy
        ? (match.nightActions.secondWolfTargetId ?? null)
        : null;
      if (primaryId || secondaryId) {
        appendNightSkillCutscene(match, step.key, {
          kind: 'werewolf',
          actorIds,
          primaryTargetId: primaryId,
          secondaryTargetId: secondaryId,
        });
      }
      break;
    }
    case 'witch': {
      const healId = match.nightActions.witchHealTargetId ?? null;
      const poisonId = match.nightActions.witchPoisonTargetId ?? null;
      if (healId) {
        appendNightSkillCutscene(match, step.key, {
          kind: 'witch_heal',
          actorIds,
          primaryTargetId: healId,
          secondaryTargetId: null,
        });
      }
      if (poisonId) {
        appendNightSkillCutscene(match, step.key, {
          kind: 'witch_poison',
          actorIds,
          primaryTargetId: poisonId,
          secondaryTargetId: null,
        });
      }
      break;
    }
    case 'seer': {
      const targetId = match.nightActions.seerTargetId ?? null;
      if (targetId) {
        const target = match.players.find((p) => p.id === targetId);
        if (target) {
          appendNightSkillCutscene(match, step.key, {
            kind: 'seer',
            actorIds,
            primaryTargetId: target.id,
            secondaryTargetId: null,
            seerIsWolf: isWolfRole(target.roleId),
          });
        }
      }
      break;
    }
  }
}

function computeWolfConsensus(
  match: OnlineMatchState,
  tieBreakerPrimary?: string | null,
  tieBreakerSecondary?: string | null
): { primary: string | null; secondary: string | null } {
  const livingWolfIds = new Set(
    match.players.filter((p) => p.isAlive && isWolfRole(p.roleId)).map((p) => p.id)
  );

  const tallyPick = (field: 'primary' | 'secondary', tieBreaker?: string | null): string | null => {
    const counts = new Map<string, number>();
    for (const [wolfId, pick] of Object.entries(match.wolfPackPicks)) {
      if (!livingWolfIds.has(wolfId)) continue;
      const targetId = pick[field];
      if (!targetId) continue;
      const target = match.players.find((p) => p.id === targetId && p.isAlive);
      if (!target) continue;
      counts.set(targetId, (counts.get(targetId) || 0) + 1);
    }
    let bestId: string | null = null;
    let bestCount = 0;
    for (const [id, count] of counts.entries()) {
      if (count > bestCount || (count === bestCount && tieBreaker && id === tieBreaker)) {
        bestCount = count;
        bestId = id;
      }
    }
    return bestId;
  };

  const primary = tallyPick('primary', tieBreakerPrimary);
  let secondary = match.wolfPupFrenzy ? tallyPick('secondary', tieBreakerSecondary) : null;
  if (secondary && secondary === primary) secondary = null;
  return { primary, secondary };
}

function runBotActionsForCurrentNightStep(
  match: OnlineMatchState,
  ctx: MatchRoomBridge,
  options?: { wolfTimeoutFallbackOnly?: boolean }
): void {
  const step = match.nightSchedule[match.nightStepIndex] ?? null;
  if (!step) return;

  const livingHumans = getLivingHumanActorsForStep(match, step);
  const livingBots = getLivingBotActorsForStep(match, step);
  if (livingBots.length === 0) return;

  const stepGuardKey = `${match.round}:${match.nightStepIndex}:${step.key}`;

  if (options?.wolfTimeoutFallbackOnly) {
    if (step.key !== 'werewolf') return;
    if (match.nightActions.wolfTargetId && (!match.wolfPupFrenzy || match.nightActions.secondWolfTargetId)) {
      return;
    }
  } else {
    if (livingHumans.length > 0) return;
    if (match.botComputedStepKey === stepGuardKey) return;
    match.botComputedStepKey = stepGuardKey;
  }

  if (step.key === 'witch' && match.botWitchActedTonight) return;

  const chatSignals = extractChatVoteSignals(ctx.chatMessages, match.players);
  const suspectedIds = Array.from(
    new Set(Object.values(chatSignals.suspectsByVoter).flat())
  );

  const botUpdates = computeAutoGMBotNightStepAction(step.key, match.players, match.nightActions, {
    round: match.round,
    wolfPupFrenzy: match.wolfPupFrenzy,
    humanPlayerId: '__SERVER_NO_HUMAN__',
    knownWolfIdsByBotSeer: match.knownWolfIdsByBotSeer,
    suspectedIds,
  });

  if (step.key === 'witch') {
    match.botWitchActedTonight = true;
  }

  Object.assign(match.nightActions, botUpdates);

  if (
    step.key === 'werewolf' &&
    (match.nightActions.wolfTargetId || match.nightActions.secondWolfTargetId)
  ) {
    for (const botWolf of livingBots) {
      if (!match.wolfPackPicks[botWolf.id]) {
        match.wolfPackPicks[botWolf.id] = {
          primary: match.nightActions.wolfTargetId ?? undefined,
          secondary: match.nightActions.secondWolfTargetId ?? undefined,
        };
      }
    }
  }

  recordStepSkillCutscenes(match, step);
}

function setupCurrentNightStep(
  match: OnlineMatchState,
  ctx: MatchRoomBridge,
  now: number,
  graceMs = 0
): void {
  const step = match.nightSchedule[match.nightStepIndex] ?? null;
  match.stepConfirmedBy = {};
  if (!step) return;

  const timers = toCustomTimerConfig(ctx.timerConfig);
  const livingHumans = getLivingHumanActorsForStep(match, step);
  const durationSec = livingHumans.length > 0 ? timers.nightActionSec : timers.botStepSec;

  match.phaseStartedAt = now;
  match.phaseEndsAt = now + durationSec * 1000 + graceMs;

  if (livingHumans.length === 0) {
    runBotActionsForCurrentNightStep(match, ctx);
  }
}

export function beginNewNight(
  match: OnlineMatchState,
  ctx: MatchRoomBridge,
  round: number,
  now: number,
  options?: { keepDuskAnnouncement?: boolean }
): void {
  const timers = toCustomTimerConfig(ctx.timerConfig);
  match.phase = 'night';
  match.round = round;
  match.nightSchedule = buildAutoGMNightSchedule(match.players, round, timers);
  match.nightStepIndex = 0;
  match.nightActions = {};
  match.nightSkillEvents = [];
  match.wolfPackPicks = {};
  match.stepConfirmedBy = {};
  match.botWitchActedTonight = false;
  match.botComputedStepKey = null;
  match.dayVotes = [];
  match.dayBotVotesComputed = false;
  match.dawnAnnouncement = null;
  if (!options?.keepDuskAnnouncement) {
    match.duskAnnouncement = null;
  }
  match.deathCinematicByPlayer = {};
  syncVotesMap(match, ctx);

  setupCurrentNightStep(match, ctx, now, options?.keepDuskAnnouncement ? ANNOUNCEMENT_GRACE_MS : 0);
}

/**
 * Creates a fresh server-authoritative OnlineMatchState from room participants.
 */
export function createOnlineMatchState(
  participants: RealtimeParticipant[],
  ctx: MatchRoomBridge,
  options?: {
    matchId?: number;
    now?: number;
    customRoles?: Record<string, RoleId>;
  }
): { matchState: OnlineMatchState; matchRoles: Record<string, RoleId> } {
  const now = options?.now ?? Date.now();
  const deck = generateBalancedRoster(participants.length);
  const matchRoles: Record<string, RoleId> = {};

  const players: Player[] = participants.map((p, idx) => {
    const roleId = options?.customRoles?.[p.id] ?? deck[idx] ?? 'villager';
    matchRoles[p.id] = roleId;
    const cosmetics = getBotCosmetics(idx);
    return {
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      roleId,
      isAlive: true,
      isHost: p.isHost,
      isBot: Boolean(p.isBot),
      elderLives: roleId === 'elder' ? 2 : undefined,
      hat: cosmetics.hat,
      cloakColor: cosmetics.cloakColor,
      isMayor: false,
    };
  });

  const mayorId = electMayorForVillage(players, ctx.hostId);
  for (const p of players) {
    p.isMayor = p.id === mayorId;
  }

  const matchState: OnlineMatchState = {
    matchId: options?.matchId ?? 1,
    phase: 'night',
    round: 1,
    phaseStartedAt: now,
    phaseEndsAt: now,
    mayorId,
    elderSealActive: false,
    wolfPupFrenzy: false,
    players,
    nightSchedule: [],
    nightStepIndex: 0,
    nightActions: {},
    nightSkillEvents: [],
    wolfPackPicks: {},
    stepConfirmedBy: {},
    seerInspectionsByPlayer: {},
    botWitchActedTonight: false,
    botComputedStepKey: null,
    knownWolfIdsByBotSeer: [],
    dawnAnnouncement: null,
    duskAnnouncement: null,
    deathCinematicByPlayer: {},
    dayVotes: [],
    dayBotVotesComputed: false,
    gameResult: null,
    eloApplied: false,
  };

  beginNewNight(matchState, ctx, 1, now);
  return { matchState, matchRoles };
}

function didPlayerWin(player: Player, winner: OnlineGameResult['winner']): boolean {
  if (winner === 'draw') return false;
  if (winner === 'tanner') return player.roleId === 'tanner';
  if (winner === 'lovers') return Boolean(player.isAlive && player.loverId);
  if (winner === 'villagers') return ROLES[player.roleId].faction === 'villager';
  if (winner === 'werewolves') return ROLES[player.roleId].faction === 'werewolf';
  return false;
}

function enterGameOver(
  match: OnlineMatchState,
  ctx: MatchRoomBridge,
  winner: OnlineGameResult['winner'],
  reason: string,
  now: number
): EloUpdateEntry[] {
  const survivors = match.players.filter((p) => p.isAlive).length;
  match.phase = 'game_over';
  match.phaseStartedAt = now;
  match.phaseEndsAt = now;
  match.gameResult = {
    winner,
    reason,
    rounds: match.round,
    survivors,
  };

  const eloDeltasByPlayer: Record<string, number> = {};
  const eloUpdates: EloUpdateEntry[] = [];
  for (const p of match.players) {
    const won = didPlayerWin(p, winner);
    const delta = winner === 'draw' ? 0 : won ? (p.isAlive ? 24 : 16) : -14;
    eloDeltasByPlayer[p.id] = delta;
    if (!p.isBot) {
      eloUpdates.push({ userId: p.id, delta, won });
    }
  }
  match.eloDeltasByPlayer = eloDeltasByPlayer;

  ctx.appendChat({
    id: `sys_gameover_${match.matchId}`,
    senderId: 'sys',
    senderName: 'Quản Trò',
    text: `🏆 [KẾT THÚC VÁN ĐẤU] ${reason}`,
    timestamp: now,
    isSystem: true,
    isGhost: false,
  });

  return eloUpdates;
}

function updateMayorAfterDeaths(
  match: OnlineMatchState,
  ctx: MatchRoomBridge,
  tag: 'dawn' | 'dusk',
  now: number
): void {
  const res = resolveNextMayorIfNeeded(match.players, match.mayorId);
  const changed = res.nextMayorId !== match.mayorId;
  match.mayorId = res.nextMayorId;
  for (const p of match.players) {
    p.isMayor = p.id === match.mayorId;
  }
  if (changed && res.transferredToName) {
    ctx.appendChat({
      id: `sys_mayor_${match.matchId}_${match.round}_${tag}`,
      senderId: 'sys',
      senderName: 'Quản Trò',
      text: `👑 Quyền Thị Trưởng đã được trao lại cho ${res.transferredToName}!`,
      timestamp: now,
      isSystem: true,
      isGhost: false,
    });
  }
}

function finalizeDawn(
  match: OnlineMatchState,
  ctx: MatchRoomBridge,
  now: number
): EloUpdateEntry[] | undefined {
  const beforePlayers = match.pendingDawnBeforePlayers || match.players;
  const nightKilledIds = match.pendingDawnKilledIds || [];
  const nightResult: NightResult = match.pendingDawnNightResult || {
    killedPlayerIds: nightKilledIds,
    savedPlayerIds: [],
    summary: [],
    killedDetails: [],
  };
  const hunterShots = match.pendingDawnHunterShots ?? [];

  updateMayorAfterDeaths(match, ctx, 'dawn', now);

  // Build base public Dawn announcement (privateNotice is always recomputed per-viewer in projection)
  const dawnAnn = buildDawnGMAnnouncement({
    round: match.round,
    beforePlayers,
    afterPlayers: match.players,
    nightKilledIds,
    hunterShots,
    humanPlayerId: '__PUBLIC__',
    lang: 'vi',
  });
  dawnAnn.privateNotice = null;
  dawnAnn.isHumanDead = false;
  match.dawnAnnouncement = dawnAnn;
  match.duskAnnouncement = null;

  // Compute zero-leak end-of-night cinematic individually per human participant
  const cinematics: Record<string, NightDeathCinematicState | null> = {};
  for (const bp of beforePlayers) {
    if (bp.isBot) continue;
    cinematics[bp.id] = determineEndOfNightCinematic({
      beforeHuman: bp,
      beforePlayers,
      afterPlayers: match.players,
      nightResult,
      lang: 'vi',
    });
  }
  match.deathCinematicByPlayer = cinematics;

  // Single authoritative Dawn system chat line
  ctx.appendChat({
    id: `sys_dawn_${match.matchId}_${match.round}`,
    senderId: 'sys',
    senderName: 'Quản Trò',
    text: dawnAnn.chatMessageText,
    timestamp: now,
    isSystem: true,
    isGhost: false,
  });

  // Check win condition AFTER all dawn Hunter cascades completed
  const win = checkWinCondition(match.players);
  if (win.isOver && win.winner) {
    return enterGameOver(match, ctx, win.winner, win.reason, now);
  }

  // Generate AI Bot discussion lines once on server
  const botSeerAlive = match.players.some(
    (p) => p.isBot && p.isAlive && p.roleId === 'seer' && !p.hasUsedPower
  );
  const botLines = buildBotDayDiscussionLines(
    match.players,
    dawnAnn.victims.map((v) => v.name),
    'vi',
    botSeerAlive ? nightResult.seerInspection ?? null : null,
    match.round
  );
  botLines.forEach((line, idx) => {
    ctx.appendChat({
      id: `bot_day_${match.matchId}_${match.round}_${idx}`,
      senderId: line.senderId,
      senderName: line.senderName,
      text: line.text,
      timestamp: now + (idx + 1) * 10,
      isSystem: false,
      isGhost: false,
    });
  });

  const timers = toCustomTimerConfig(ctx.timerConfig);
  match.phase = 'day_discussion';
  match.phaseStartedAt = now;
  match.phaseEndsAt = now + timers.dayDiscussSec * 1000 + ANNOUNCEMENT_GRACE_MS;
  match.dayVotes = [];
  match.dayBotVotesComputed = false;
  syncVotesMap(match, ctx);
  return undefined;
}

function finalizeDusk(
  match: OnlineMatchState,
  ctx: MatchRoomBridge,
  now: number
): EloUpdateEntry[] | undefined {
  const beforePlayers = match.pendingDuskBeforePlayers || match.players;
  const lynchedId = match.pendingLynchedVictimId ?? null;
  const lynchedVictim = lynchedId
    ? beforePlayers.find((p) => p.id === lynchedId) ?? null
    : null;

  const allDuskVotes = match.pendingDuskVotes || [];
  const playerTargetVotes = allDuskVotes.filter((v) => v.targetId !== CAMPFIRE_ABSTAIN_ID);
  const votingMayorId = beforePlayers.find((p) => p.isMayor)?.id ?? null;
  const duskTally = tallyVotesWithMayor(allDuskVotes, votingMayorId);

  updateMayorAfterDeaths(match, ctx, 'dusk', now);

  const duskAnn = buildDuskGMAnnouncement({
    round: match.round,
    beforePlayers,
    afterPlayers: match.players,
    lynchedVictim,
    voteCounts: match.pendingDuskVoteCounts || {},
    votes: playerTargetVotes,
    isTie: Boolean(match.pendingDuskIsTie),
    elderLynchedPenalty: Boolean(match.pendingDuskElderPenalty),
    hunterShots: match.pendingDuskHunterShots ?? [],
    humanPlayerId: '__PUBLIC__',
    lang: 'vi',
  });
  // Align Dusk voteBreakdown with Mayor x2 weighting & preserve Campfire Abstain row (BUG-08 Online Parity)
  const weightedBreakdown = buildVoteTallyEntries(beforePlayers, playerTargetVotes).map((entry) => ({
    ...entry,
    votes: duskTally.counts[entry.playerId] ?? entry.votes,
  }));
  if (duskTally.abstainCount > 0) {
    const abstainVoters = duskTally.abstainerIds
      .map((id) => {
        const idx = beforePlayers.findIndex((p) => p.id === id);
        if (idx < 0) return null;
        return {
          id: beforePlayers[idx].id,
          name: beforePlayers[idx].name,
          avatar: beforePlayers[idx].avatar,
          seatNumber: idx + 1,
        };
      })
      .filter(
        (v): v is { id: string; name: string; avatar: string; seatNumber: number } => Boolean(v)
      );
    weightedBreakdown.push({
      playerId: CAMPFIRE_ABSTAIN_ID,
      name: 'Lửa Trại (Phiếu Trắng)',
      avatar: '🔥',
      seatNumber: 0,
      votes: duskTally.abstainCount,
      voters: abstainVoters,
    });
  }
  weightedBreakdown.sort((a, b) => b.votes - a.votes || a.seatNumber - b.seatNumber);
  duskAnn.voteBreakdown = weightedBreakdown;
  duskAnn.privateNotice = null;
  duskAnn.isHumanDead = false;
  match.duskAnnouncement = duskAnn;

  ctx.appendChat({
    id: `sys_dusk_${match.matchId}_${match.round}`,
    senderId: 'sys',
    senderName: 'Quản Trò',
    text: duskAnn.chatMessageText,
    timestamp: now,
    isSystem: true,
    isGhost: false,
  });

  const win = checkWinCondition(match.players, lynchedId ?? undefined);
  if (win.isOver && win.winner) {
    return enterGameOver(match, ctx, win.winner, win.reason, now);
  }

  beginNewNight(match, ctx, match.round + 1, now, { keepDuskAnnouncement: true });
  return undefined;
}

function advanceNightStepOrResolveDawn(
  match: OnlineMatchState,
  ctx: MatchRoomBridge,
  now: number
): EloUpdateEntry[] | undefined {
  // Ensure any living bot wolf fills missing prey if human wolves timed out without picking
  runBotActionsForCurrentNightStep(match, ctx, { wolfTimeoutFallbackOnly: true });

  // Record finalized visual skill cutscenes for the finishing step (never alters resolveNightActions!)
  recordStepSkillCutscenes(match, match.nightSchedule[match.nightStepIndex] ?? null);

  if (match.nightStepIndex + 1 < match.nightSchedule.length) {
    match.nightStepIndex += 1;
    setupCurrentNightStep(match, ctx, now);
    return undefined;
  }

  // Last night step finished -> Resolve Dawn authoritatively via rules.ts (including Night-Aim Hunter shots)
  const beforePlayers = match.players.map((p) => ({ ...p }));
  const { updatedPlayers, result } = resolveNightActions(match.players, match.nightActions, {
    wolfPupTriggered: match.wolfPupFrenzy,
    roundNumber: match.round,
    elderSealActive: match.elderSealActive,
  });

  match.players = updatedPlayers;
  match.wolfPupFrenzy = Boolean(result.wolfPupTriggeredNextNight);

  // Record known wolf ONLY when a BOT Seer performed the inspection (fair AI invariant)
  if (result.seerInspection?.isWerewolf) {
    const botSeer = beforePlayers.find((p) => p.isBot && p.isAlive && p.roleId === 'seer' && !p.hasUsedPower);
    if (botSeer && !match.knownWolfIdsByBotSeer.includes(result.seerInspection.playerId)) {
      match.knownWolfIdsByBotSeer.push(result.seerInspection.playerId);
    }
  }

  match.pendingDawnBeforePlayers = beforePlayers;
  match.pendingDawnKilledIds = [...result.killedPlayerIds];
  match.pendingDawnNightResult = result;
  match.pendingDawnHunterShots = [...(result.hunterShots || [])];

  return finalizeDawn(match, ctx, now);
}

function transitionToDayVoting(
  match: OnlineMatchState,
  ctx: MatchRoomBridge,
  now: number
): void {
  const timers = toCustomTimerConfig(ctx.timerConfig);
  match.phase = 'day_voting';
  match.phaseStartedAt = now;
  match.phaseEndsAt = now + timers.dayVoteSec * 1000;
  match.dawnAnnouncement = null;
  match.deathCinematicByPlayer = {};

  if (!match.dayBotVotesComputed) {
    const chatSignals = extractChatVoteSignals(ctx.chatMessages, match.players);
    const botVotes = computeSmartBotDayVotes(
      match.players,
      match.knownWolfIdsByBotSeer,
      null,
      chatSignals
    );
    match.dayVotes = [...botVotes];
    match.dayBotVotesComputed = true;
    syncVotesMap(match, ctx);
  }

  ctx.appendChat({
    id: `sys_vote_open_${match.matchId}_${match.round}`,
    senderId: 'sys',
    senderName: 'Quản Trò',
    text: `⚖️ [Ngày ${match.round}] Bắt đầu Bỏ Phiếu! Mọi người hãy chọn kẻ khả nghi hoặc bỏ phiếu trắng vào Lửa Trại.`,
    timestamp: now,
    isSystem: true,
    isGhost: false,
  });
}

function resolveDayVotingToDusk(
  match: OnlineMatchState,
  ctx: MatchRoomBridge,
  now: number
): EloUpdateEntry[] | undefined {
  // Auto-abstain any living human who did not cast a vote before voting closed (BUG-15)
  const votedIds = new Set(match.dayVotes.map((v) => v.voterId));
  for (const p of match.players) {
    if (p.isAlive && !votedIds.has(p.id)) {
      match.dayVotes = castSingleDayVote(match.dayVotes, p.id, CAMPFIRE_ABSTAIN_ID);
    }
  }
  syncVotesMap(match, ctx);

  const beforePlayers = match.players.map((p) => ({ ...p }));
  const tally = tallyVotesWithMayor(match.dayVotes, match.mayorId);

  match.pendingDuskBeforePlayers = beforePlayers;
  match.pendingLynchedVictimId = tally.targetId;
  match.pendingDuskVoteCounts = { ...tally.counts };
  match.pendingDuskVotes = [...match.dayVotes];
  match.pendingDuskIsTie = tally.isTie;
  match.pendingDuskElderPenalty = false;
  match.pendingDuskHunterShots = [];

  if (tally.targetId) {
    const targetBefore = beforePlayers.find((p) => p.id === tally.targetId);
    const lynchRes = applyDayLynch(match.players, tally.targetId, {
      elderSealActive: match.elderSealActive,
    });
    match.players = lynchRes.updatedPlayers;
    if (lynchRes.elderLynchedPenalty) {
      match.elderSealActive = true;
      match.pendingDuskElderPenalty = true;
    }
    if (lynchRes.wolfPupTriggeredNextNight) {
      match.wolfPupFrenzy = true;
    }
    // Tanner wins immediately on lynch without waiting on unrelated cascades
    if (targetBefore?.roleId !== 'tanner' && lynchRes.hunterShots.length > 0) {
      match.pendingDuskHunterShots = [...lynchRes.hunterShots];
    }
  }

  return finalizeDusk(match, ctx, now);
}

/**
 * Lazy deadline tick — works identically on 1s setInterval (Node) or per-request HTTP poll (Netlify).
 */
export function tickOnlineMatchIfDue(
  match: OnlineMatchState,
  ctx: MatchRoomBridge,
  now: number
): { changed: boolean; eloUpdates?: EloUpdateEntry[] } {
  if (match.phase === 'game_over' || match.phase === 'lobby') {
    return { changed: false };
  }

  if (now < match.phaseEndsAt) {
    return { changed: false };
  }

  if (match.phase === 'night') {
    const eloUpdates = advanceNightStepOrResolveDawn(match, ctx, now);
    return { changed: true, eloUpdates };
  }

  if (match.phase === 'day_discussion') {
    transitionToDayVoting(match, ctx, now);
    return { changed: true };
  }

  if (match.phase === 'day_voting') {
    const eloUpdates = resolveDayVotingToDusk(match, ctx, now);
    return { changed: true, eloUpdates };
  }

  return { changed: false };
}

/**
 * Validates and applies a human player's night action.
 * Auto-advances the night step immediately once all living human actors confirm.
 */
export function applyOnlineNightAction(
  match: OnlineMatchState,
  ctx: MatchRoomBridge,
  userId: string,
  action: OnlineNightActionPayload,
  now: number
): { ok: true; eloUpdates?: EloUpdateEntry[] } | { ok: false; error: string } {
  if (match.phase !== 'night') {
    return { ok: false, error: 'Hiện không phải pha Ban Đêm.' };
  }
  const currentStep = match.nightSchedule[match.nightStepIndex] ?? null;
  if (!currentStep) {
    return { ok: false, error: 'Không có lượt đêm nào đang hoạt động.' };
  }
  const actor = match.players.find((p) => p.id === userId);
  if (!actor || !actor.isAlive) {
    return { ok: false, error: 'Bạn đã tử trận và không thể hành động ban đêm.' };
  }
  if (!isPlayerAwakeForNightStep(actor, currentStep.key, match.round)) {
    return { ok: false, error: 'Hiện chưa đến lượt vai trò của bạn.' };
  }

  const targetId = action.targetId ?? null;
  const secondTargetId = action.secondTargetId ?? null;

  switch (action.actionType) {
    case 'wolf_bite': {
      if (currentStep.key !== 'werewolf') {
        return { ok: false, error: 'Không phải lượt Ma Sói.' };
      }
      if (targetId !== null) {
        const target = match.players.find((p) => p.id === targetId && p.isAlive);
        if (!target) return { ok: false, error: 'Mục tiêu cắn không hợp lệ.' };
      }
      const prev = match.wolfPackPicks[userId] || {};
      match.wolfPackPicks[userId] = {
        ...prev,
        primary: targetId ?? undefined,
        secondary: prev.secondary === targetId ? undefined : prev.secondary,
      };
      const consensus = computeWolfConsensus(match, targetId, null);
      match.nightActions.wolfTargetId = consensus.primary;
      match.nightActions.secondWolfTargetId = consensus.secondary;
      return { ok: true };
    }

    case 'wolf_second_bite': {
      if (currentStep.key !== 'werewolf' || !match.wolfPupFrenzy) {
        return { ok: false, error: 'Đàn Sói không ở trạng thái Cuồng Nộ 2 mục tiêu.' };
      }
      if (targetId !== null) {
        const target = match.players.find((p) => p.id === targetId && p.isAlive);
        if (!target) return { ok: false, error: 'Mục tiêu cắn thứ 2 không hợp lệ.' };
        if (targetId === match.wolfPackPicks[userId]?.primary) {
          return { ok: false, error: 'Hai mục tiêu cắn của Đàn Sói phải khác nhau.' };
        }
      }
      const prev = match.wolfPackPicks[userId] || {};
      match.wolfPackPicks[userId] = { ...prev, secondary: targetId ?? undefined };
      const consensus = computeWolfConsensus(match, null, targetId);
      match.nightActions.wolfTargetId = consensus.primary;
      match.nightActions.secondWolfTargetId = consensus.secondary;
      return { ok: true };
    }

    case 'guard': {
      if (currentStep.key !== 'bodyguard') {
        return { ok: false, error: 'Không phải lượt Bảo Vệ.' };
      }
      if (targetId !== null) {
        const target = match.players.find((p) => p.id === targetId && p.isAlive);
        if (!target) return { ok: false, error: 'Mục tiêu bảo vệ không hợp lệ.' };
        if (target.protectedLastNight) {
          return { ok: false, error: 'Không thể bảo vệ cùng một người 2 đêm liên tiếp!' };
        }
      }
      match.nightActions.guardTargetId = targetId;
      return { ok: true };
    }

    case 'hunter_mark': {
      if (currentStep.key !== 'hunter') {
        return { ok: false, error: 'Không phải lượt Thợ Săn.' };
      }
      if (actor.hasUsedPower) {
        return { ok: false, error: 'Quyền năng Thợ Săn đã bị phong ấn.' };
      }
      if (targetId !== null) {
        if (targetId === userId) {
          return { ok: false, error: 'Thợ Săn không thể tự ghim chính mình.' };
        }
        const target = match.players.find((p) => p.id === targetId && p.isAlive);
        if (!target) {
          return { ok: false, error: 'Mục tiêu ghim đạn không hợp lệ.' };
        }
      }
      match.nightActions.hunterTargetId = targetId;
      return { ok: true };
    }

    case 'seer_inspect': {
      if (currentStep.key !== 'seer') {
        return { ok: false, error: 'Không phải lượt Tiên Tri.' };
      }
      const existing = match.seerInspectionsByPlayer[userId];
      if (existing && existing.round === match.round) {
        return { ok: false, error: 'Bạn đã soi 1 người trong đêm nay rồi.' };
      }
      if (!targetId || targetId === userId) {
        return { ok: false, error: 'Hãy chọn 1 người chơi khác còn sống để soi.' };
      }
      const target = match.players.find((p) => p.id === targetId && p.isAlive);
      if (!target) {
        return { ok: false, error: 'Mục tiêu Tiên Tri không hợp lệ.' };
      }
      match.nightActions.seerTargetId = target.id;
      const isWerewolf = isWolfRole(target.roleId);
      match.seerInspectionsByPlayer[userId] = {
        playerId: target.id,
        roleId: target.roleId,
        isWerewolf,
        round: match.round,
      };
      recordStepSkillCutscenes(match, currentStep);
      return { ok: true };
    }

    case 'witch_heal': {
      if (currentStep.key !== 'witch') {
        return { ok: false, error: 'Không phải lượt Phù Thủy.' };
      }
      if (actor.hasUsedHeal || actor.hasUsedPower) {
        return { ok: false, error: 'Bạn đã dùng Bình Cứu hoặc quyền năng đã bị phong ấn.' };
      }
      if (targetId === null) {
        match.nightActions.witchHealTargetId = null;
        return { ok: true };
      }
      const dying = getDyingWolfVictimsForWitch(
        match.players,
        match.nightActions,
        match.wolfPupFrenzy
      );
      if (!dying.includes(targetId)) {
        return { ok: false, error: 'Người này không phải nạn nhân sắp tử vong vì Ma Sói đêm nay.' };
      }
      match.nightActions.witchHealTargetId = targetId;
      return { ok: true };
    }

    case 'witch_poison': {
      if (currentStep.key !== 'witch') {
        return { ok: false, error: 'Không phải lượt Phù Thủy.' };
      }
      if (actor.hasUsedPoison || actor.hasUsedPower) {
        return { ok: false, error: 'Bạn đã dùng Bình Độc hoặc quyền năng đã bị phong ấn.' };
      }
      if (targetId !== null) {
        const target = match.players.find((p) => p.id === targetId && p.isAlive);
        if (!target) return { ok: false, error: 'Mục tiêu đầu độc không hợp lệ.' };
      }
      match.nightActions.witchPoisonTargetId = targetId;
      return { ok: true };
    }

    case 'cupid_link': {
      if (currentStep.key !== 'cupid' || match.round !== 1) {
        return { ok: false, error: 'Cupid chỉ ghép đôi vào Đêm 1.' };
      }
      if (!targetId || !secondTargetId || targetId === secondTargetId) {
        return { ok: false, error: 'Hãy chọn 2 người chơi khác nhau để ghép đôi.' };
      }
      const p1 = match.players.find((p) => p.id === targetId && p.isAlive);
      const p2 = match.players.find((p) => p.id === secondTargetId && p.isAlive);
      if (!p1 || !p2) {
        return { ok: false, error: 'Cả 2 Tình Nhân phải là người chơi còn sống.' };
      }
      match.nightActions.cupidLovers = [p1.id, p2.id];
      return { ok: true };
    }

    case 'doppelganger_pick': {
      if (currentStep.key !== 'doppelganger' || match.round !== 1) {
        return { ok: false, error: 'Nhân Bản chỉ chọn hình mẫu vào Đêm 1.' };
      }
      if (!targetId || targetId === userId) {
        return { ok: false, error: 'Hãy chọn 1 người chơi khác làm hình mẫu.' };
      }
      const target = match.players.find((p) => p.id === targetId && p.isAlive);
      if (!target) {
        return { ok: false, error: 'Hình mẫu không hợp lệ.' };
      }
      match.nightActions.doppelgangerTargetId = target.id;
      return { ok: true };
    }

    case 'confirm_done': {
      match.stepConfirmedBy[userId] = true;
      const livingHumans = getLivingHumanActorsForStep(match, currentStep);
      const allConfirmed = livingHumans.every((h) => Boolean(match.stepConfirmedBy[h.id]));
      if (allConfirmed) {
        const eloUpdates = advanceNightStepOrResolveDawn(match, ctx, now);
        return { ok: true, eloUpdates };
      }
      return { ok: true };
    }

    default:
      return { ok: false, error: 'Hành động đêm không được hỗ trợ.' };
  }
}

export function applyOnlineDayVote(
  match: OnlineMatchState,
  ctx: MatchRoomBridge,
  voterId: string,
  targetId: string
): { ok: true; votes: Record<string, string> } | { ok: false; error: string } {
  if (match.phase !== 'day_voting') {
    return { ok: false, error: 'Hiện chưa đến pha Bỏ Phiếu ban ngày.' };
  }
  const voter = match.players.find((p) => p.id === voterId);
  if (!voter || !voter.isAlive) {
    return { ok: false, error: 'Chỉ người chơi còn sống mới có thể bỏ phiếu.' };
  }
  if (targetId && targetId !== CAMPFIRE_ABSTAIN_ID) {
    const target = match.players.find((p) => p.id === targetId && p.isAlive);
    if (!target) {
      return { ok: false, error: 'Mục tiêu bỏ phiếu không hợp lệ.' };
    }
  }

  match.dayVotes = castSingleDayVote(match.dayVotes, voterId, targetId || null);
  syncVotesMap(match, ctx);
  return { ok: true, votes: { ...ctx.votes } };
}

export function applyHostAdvancePhase(
  match: OnlineMatchState,
  ctx: MatchRoomBridge,
  requesterId: string,
  now: number,
  expectedStepIndex?: number
): { ok: true; eloUpdates?: EloUpdateEntry[] } | { ok: false; error: string } {
  if (ctx.hostId !== requesterId) {
    return { ok: false, error: 'Chỉ Chủ phòng mới có thể chuyển pha sớm.' };
  }
  if (match.phase === 'day_discussion') {
    transitionToDayVoting(match, ctx, now);
    return { ok: true };
  }
  if (match.phase === 'day_voting') {
    const eloUpdates = resolveDayVotingToDusk(match, ctx, now);
    return { ok: true, eloUpdates };
  }
  if (match.phase === 'night') {
    if (
      typeof expectedStepIndex === 'number' &&
      !Number.isNaN(expectedStepIndex) &&
      expectedStepIndex !== match.nightStepIndex
    ) {
      return { ok: false, error: 'Bước đêm đã thay đổi.' };
    }
    const step = match.nightSchedule[match.nightStepIndex] ?? null;
    const livingHumans = getLivingHumanActorsForStep(match, step);
    const anyUnconfirmed = livingHumans.some((h) => !match.stepConfirmedBy[h.id]);
    if (anyUnconfirmed) {
      return { ok: false, error: 'Đang chờ người chơi khác hoàn tất hành động đêm.' };
    }
    const eloUpdates = advanceNightStepOrResolveDawn(match, ctx, now);
    return { ok: true, eloUpdates };
  }
  return { ok: false, error: 'Không thể chuyển pha ở trạng thái hiện tại.' };
}

function buildPersonalizedAnnouncement(
  match: OnlineMatchState,
  viewerId: string,
  viewer: Player | undefined
): GMAnnouncementData | null {
  const isViewerDead = Boolean(viewer && !viewer.isAlive);

  if (match.phase === 'day_discussion' && match.dawnAnnouncement) {
    let privateNotice: string | null = null;
    if (match.pendingDawnBeforePlayers && viewer) {
      const beforeMe = match.pendingDawnBeforePlayers.find((p) => p.id === viewerId);
      const diedTonight = Boolean(beforeMe?.isAlive && !viewer.isAlive);
      if (diedTonight) {
        const cin = match.deathCinematicByPlayer[viewerId];
        privateNotice = [
          cin?.reasonText || null,
          '👻 Bạn đã thành Hồn Ma — toàn bộ vai trò trong làng đã được mở khóa để bạn theo dõi (Chat chính bị khóa, chỉ nhắn ở Kênh Hồn Ma).',
        ]
          .filter(Boolean)
          .join('\n');
      } else if (viewer.isAlive) {
        privateNotice = buildPrivateHumanNightNotice({
          beforePlayers: match.pendingDawnBeforePlayers,
          afterPlayers: match.players,
          humanPlayerId: viewerId,
          round: match.round,
          lang: 'vi',
        });
      }
    }
    return {
      ...match.dawnAnnouncement,
      victims: match.dawnAnnouncement.victims.map((v) => ({ ...v })),
      publicEvents: [...match.dawnAnnouncement.publicEvents],
      privateNotice,
      isHumanDead: isViewerDead,
    };
  }

  if (match.phase === 'night' && match.round > 1 && match.duskAnnouncement) {
    let privateNotice: string | null = null;
    if (match.pendingDuskBeforePlayers && viewer) {
      const beforeMe = match.pendingDuskBeforePlayers.find((p) => p.id === viewerId);
      if (beforeMe?.isAlive && !viewer.isAlive) {
        privateNotice =
          '👻 Bạn đã bị loại tại pháp trường! Từ giờ bạn là Hồn Ma — hãy giữ im lặng ở kênh chung và quan sát cuộc chơi.';
      } else if (
        beforeMe?.roleId === 'doppelganger' &&
        viewer.roleId !== 'doppelganger' &&
        viewer.isAlive
      ) {
        const newRoleName = ROLES[viewer.roleId].name.vi;
        privateNotice = `🪞 Mật báo Quản Trò: Hình mẫu của bạn vừa bị treo cổ — bạn chính thức kế thừa thân phận ${newRoleName}!`;
      }
    }
    return {
      ...match.duskAnnouncement,
      victims: match.duskAnnouncement.victims.map((v) => ({ ...v })),
      publicEvents: [...match.duskAnnouncement.publicEvents],
      voteBreakdown: match.duskAnnouncement.voteBreakdown?.map((e) => ({
        ...e,
        voters: e.voters?.map((v) => ({ ...v })),
      })),
      privateNotice,
      isHumanDead: isViewerDead,
    };
  }

  return null;
}

function buildGhostNightSpectatorView(
  match: OnlineMatchState,
  rawStep: AutoGMNightStep | null
): GhostNightSpectatorView {
  const wakingActorIds = getLivingActorsForStep(match, rawStep).map((p) => p.id);

  const liveActions: NightActions = {
    ...match.nightActions,
    ...(match.nightActions.cupidLovers
      ? {
          cupidLovers: [
            match.nightActions.cupidLovers[0],
            match.nightActions.cupidLovers[1],
          ] as [string, string],
        }
      : {}),
  };

  const wolfPackPicks: GhostNightSpectatorView['wolfPackPicks'] = Object.fromEntries(
    Object.entries(match.wolfPackPicks).map(([wolfId, pick]) => [
      wolfId,
      {
        targetId: pick.primary ?? null,
        secondTargetId: pick.secondary ?? null,
      },
    ])
  );

  const playersForLethality = match.players;
  const dyingWolfVictimIds = getDyingWolfVictimsForWitch(
    playersForLethality,
    match.nightActions,
    match.wolfPupFrenzy
  );

  let seerInspectionTonight: GhostNightSpectatorView['seerInspectionTonight'] = null;
  if (match.nightActions.seerTargetId) {
    const roundInspectionEntry = Object.entries(match.seerInspectionsByPlayer).find(
      ([, insp]) => insp.round === match.round && insp.playerId === match.nightActions.seerTargetId
    );
    const seerId =
      roundInspectionEntry?.[0] ??
      match.players.find((p) => isPlayerAwakeForNightStep(p, 'seer', match.round))?.id ??
      playersForLethality.find((p) => p.isAlive && p.roleId === 'seer')?.id ??
      playersForLethality.find((p) => p.roleId === 'seer')?.id ??
      null;
    const target = playersForLethality.find((p) => p.id === match.nightActions.seerTargetId);
    if (seerId && target) {
      seerInspectionTonight = {
        seerId,
        targetId: target.id,
        roleId: roundInspectionEntry ? roundInspectionEntry[1].roleId : target.roleId,
        isWerewolf: roundInspectionEntry
          ? roundInspectionEntry[1].isWerewolf
          : isWolfRole(target.roleId),
      };
    }
  }

  const skillCutscenes = (match.nightSkillEvents || []).map((ev) => ({
    ...ev,
    actorIds: [...ev.actorIds],
  }));

  return {
    wakingActorIds,
    liveActions,
    wolfPackPicks,
    dyingWolfVictimIds,
    seerInspectionTonight,
    skillCutscenes,
  };
}

/**
 * Projects full authoritative server OnlineMatchState into a strictly zero-leak
 * OnlinePlayerMatchView tailored to `viewerId`.
 */
export function buildPlayerMatchView(
  match: OnlineMatchState,
  viewerId: string,
  serverNow: number = Date.now()
): OnlinePlayerMatchView {
  const viewer = match.players.find((p) => p.id === viewerId);
  const canSeeAll = match.phase === 'game_over' || Boolean(viewer && !viewer.isAlive);
  const viewerIsWolf = Boolean(viewer && isWolfRole(viewer.roleId));
  const viewerIsCupid = Boolean(viewer && viewer.roleId === 'cupid');
  const viewerIsGuard = Boolean(viewer && viewer.isAlive && viewer.roleId === 'bodyguard');

  const sanitizedPlayers: Player[] = match.players.map((p) => {
    const isSelf = p.id === viewerId;
    const revealRole = canSeeAll || isSelf || (viewerIsWolf && isWolfRole(p.roleId));
    const revealLover =
      canSeeAll ||
      viewerIsCupid ||
      isSelf ||
      Boolean(viewer?.loverId && (p.id === viewer.loverId || p.loverId === viewerId));
    const revealTargetPlayer = canSeeAll || isSelf;
    const revealPrivateFlags = canSeeAll || isSelf;

    return {
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      roleId: revealRole ? p.roleId : 'villager',
      isAlive: p.isAlive,
      isHost: p.isHost,
      isBot: p.isBot,
      isSpeaking: p.isSpeaking,
      isMuted: p.isMuted,
      hat: p.hat,
      cloakColor: p.cloakColor,
      isMayor: p.isMayor,
      hasUsedHeal: revealPrivateFlags ? p.hasUsedHeal : undefined,
      hasUsedPoison: revealPrivateFlags ? p.hasUsedPoison : undefined,
      hasUsedPower: revealPrivateFlags ? p.hasUsedPower : undefined,
      elderLives: revealPrivateFlags ? p.elderLives : undefined,
      hunterMarkId: revealPrivateFlags ? p.hunterMarkId : undefined,
      protectedLastNight:
        revealPrivateFlags || viewerIsGuard ? p.protectedLastNight : undefined,
      loverId: revealLover ? p.loverId : undefined,
      targetPlayerId: revealTargetPlayer ? p.targetPlayerId : undefined,
      targetRoleId: canSeeAll ? p.targetRoleId : undefined,
    };
  });

  const rawStep =
    match.phase === 'night' ? (match.nightSchedule[match.nightStepIndex] ?? null) : null;
  const isMyNightTurn = Boolean(
    match.phase === 'night' &&
      rawStep &&
      isPlayerAwakeForNightStep(viewer, rawStep.key, match.round)
  );

  const currentNightStep: AutoGMNightStep | null = rawStep
    ? {
        ...rawStep,
        hasLivingActor: isMyNightTurn || canSeeAll,
        isHumanTurn: isMyNightTurn,
      }
    : null;

  const nightScheduleSummary = match.nightSchedule.map((s) => ({
    key: s.key,
    roleId: s.roleId,
    stepIndex: s.stepIndex,
    totalSteps: s.totalSteps,
    isMyTurn: Boolean(isPlayerAwakeForNightStep(viewer, s.key, match.round)),
  }));

  let myNightSelection: OnlineNightSelection = {};
  if (match.phase === 'night' && viewer && viewer.isAlive) {
    if (isWolfRole(viewer.roleId)) {
      const myPick = match.wolfPackPicks[viewerId];
      myNightSelection = {
        targetId: myPick?.primary ?? match.nightActions.wolfTargetId ?? null,
        secondTargetId: myPick?.secondary ?? match.nightActions.secondWolfTargetId ?? null,
      };
    } else if (viewer.roleId === 'bodyguard') {
      myNightSelection = { targetId: match.nightActions.guardTargetId ?? null };
    } else if (viewer.roleId === 'hunter') {
      myNightSelection = { targetId: match.nightActions.hunterTargetId ?? null };
    } else if (viewer.roleId === 'seer') {
      myNightSelection = { targetId: match.nightActions.seerTargetId ?? null };
    } else if (viewer.roleId === 'witch') {
      myNightSelection = {
        witchHealTargetId: match.nightActions.witchHealTargetId ?? null,
        witchPoisonTargetId: match.nightActions.witchPoisonTargetId ?? null,
      };
    } else if (viewer.roleId === 'cupid' && match.round === 1) {
      myNightSelection = {
        cupidLovers: match.nightActions.cupidLovers
          ? [match.nightActions.cupidLovers[0], match.nightActions.cupidLovers[1]]
          : null,
      };
    } else if (viewer.roleId === 'doppelganger' && match.round === 1) {
      myNightSelection = {
        doppelgangerTargetId: match.nightActions.doppelgangerTargetId ?? null,
      };
    }
  }

  const showWolfPicks = Boolean(
    match.phase === 'night' && rawStep?.key === 'werewolf' && viewer?.isAlive && viewerIsWolf
  );
  const wolfPackPicks = showWolfPicks
    ? Object.fromEntries(
        Object.entries(match.wolfPackPicks).map(([k, v]) => [k, { ...v }])
      )
    : null;

  const canSeeDyingVictims = Boolean(
    match.phase === 'night' &&
      rawStep?.key === 'witch' &&
      viewer?.isAlive &&
      viewer.roleId === 'witch' &&
      !viewer.hasUsedHeal &&
      !viewer.hasUsedPower
  );
  const dyingWolfVictimIds = canSeeDyingVictims
    ? getDyingWolfVictimsForWitch(match.players, match.nightActions, match.wolfPupFrenzy)
    : [];

  const rawSeer = match.seerInspectionsByPlayer[viewerId] ?? null;
  const mySeerInspection: OnlineSeerInspection | null = rawSeer
    ? {
        playerId: rawSeer.playerId,
        // Mask exact hidden villager/traitor role while Seer is alive — Seer only learns alignment!
        roleId: canSeeAll ? rawSeer.roleId : rawSeer.isWerewolf ? 'werewolf' : 'villager',
        isWerewolf: rawSeer.isWerewolf,
        round: rawSeer.round,
      }
    : null;

  const announcement = buildPersonalizedAnnouncement(match, viewerId, viewer);
  const deathCinematic =
    match.phase === 'day_discussion' ? (match.deathCinematicByPlayer[viewerId] ?? null) : null;

  // STRICT ZERO-LEAK GATE: only verified dead Ghosts see night omniscience
  const ghostNightState: GhostNightSpectatorView | null =
    viewer && !viewer.isAlive && match.phase === 'night'
      ? buildGhostNightSpectatorView(match, rawStep)
      : null;

  return {
    matchId: match.matchId,
    phase: match.phase,
    round: match.round,
    serverNow,
    phaseEndsAt: match.phaseEndsAt,
    mayorId: match.mayorId,
    elderSealActive: match.elderSealActive,
    wolfPupFrenzy: match.wolfPupFrenzy,
    players: sanitizedPlayers,
    currentNightStep,
    nightScheduleSummary,
    nightStepIndex: match.nightStepIndex,
    isMyNightTurn,
    hasConfirmedNightStep: Boolean(match.stepConfirmedBy[viewerId]),
    myNightSelection,
    wolfPackPicks,
    dyingWolfVictimIds,
    mySeerInspection,
    votes: match.dayVotes.map((v) => ({ ...v })),
    announcement,
    deathCinematic: deathCinematic ? { ...deathCinematic } : null,
    ghostNightState,
    gameResult: match.gameResult
      ? {
          ...match.gameResult,
          myEloDelta: match.eloDeltasByPlayer?.[viewerId] ?? 0,
        }
      : null,
  };
}
