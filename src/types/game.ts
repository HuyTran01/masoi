export type Faction = 'villager' | 'werewolf' | 'neutral';

export type GameMode = 'online' | 'gm' | 'ai_practice';

export type PropType = 'tomato' | 'egg' | 'rose' | 'water';

export interface ThrownPropEvent {
  id: string;
  fromId: string;
  toId: string;
  propType: PropType;
  timestamp: number;
}

export type RoleId =
  | 'villager'
  | 'werewolf'
  | 'seer'
  | 'bodyguard'
  | 'witch'
  | 'hunter'
  | 'cupid'
  | 'wolf_pup'
  | 'tanner'
  | 'doppelganger'
  | 'elder'
  | 'cursed'
  | 'traitor';

export interface RoleDefinition {
  id: RoleId;
  name: { [lang: string]: string };
  faction: Faction;
  wakeOrder: number; // Order during the night (0 = never wakes)
  description: { [lang: string]: string };
  instructions: { [lang: string]: string };
  guideForNewbie: { [lang: string]: string };
  icon: string;
  color: string;
  badge: string;
}

export interface Player {
  id: string;
  name: string;
  avatar: string;
  roleId: RoleId;
  isAlive: boolean;
  isHost?: boolean;
  isBot?: boolean;
  isSpeaking?: boolean;
  isMuted?: boolean;
  hasUsedHeal?: boolean; // witch heal potion
  hasUsedPoison?: boolean; // witch poison potion
  hasUsedPower?: boolean; // elder seal or spent hunter shot
  hunterMarkId?: string; // player pre-aimed by Hunter at night
  loverId?: string; // paired by cupid
  protectedLastNight?: boolean;
  elderLives?: number; // starts with 2
  targetPlayerId?: string; // for doppelganger specific player model
  targetRoleId?: RoleId; // fallback role inheritance
  hat?: 'none' | 'witch' | 'crown' | 'knight' | 'straw' | 'antlers' | 'pirate';
  cloakColor?: number;
  isMayor?: boolean;
}

export type Phase = 'lobby' | 'night' | 'day_discussion' | 'day_voting' | 'hunter_revenge' | 'game_over';

export interface NightActions {
  wolfTargetId?: string | null;
  secondWolfTargetId?: string | null; // when wolf pup frenzy is active
  guardTargetId?: string | null;
  hunterTargetId?: string | null; // optional Night-Aim Hunter mark (null = Không ghim)
  seerTargetId?: string | null;
  witchHealTargetId?: string | null;
  witchPoisonTargetId?: string | null;
  cupidLovers?: [string, string] | null;
  doppelgangerTargetId?: string | null;
}

export type NightDeathCauseType =
  | 'werewolf'
  | 'witch_poison'
  | 'cupid_lover'
  | 'hunter_shot'
  | 'lynch'
  | 'unknown';

export interface NightVictimDetail {
  playerId: string;
  name: string;
  roleId: RoleId;
  causes: string[];
  logicExplanation: string;
  causeType?: NightDeathCauseType;
  killerId?: string | null;
  killerName?: string | null;
  killerRoleId?: RoleId | null;
  linkedLoverId?: string | null;
  linkedLoverName?: string | null;
}

export interface NightDeathCinematicState {
  mode?: 'wolf_kill' | 'victim_death';
  revealKiller?: boolean;
  victimId: string;
  victimName: string;
  causeType: NightDeathCauseType;
  killerId?: string | null;
  killerName?: string | null;
  killerRoleId?: RoleId | null;
  linkedLoverId?: string | null;
  linkedLoverName?: string | null;
  reasonText: string;
}

export interface NightLogicStep {
  badge: string;
  title: string;
  detail: string;
  category: 'death' | 'saved' | 'special' | 'info';
}

export interface HunterShotRecord {
  hunterId: string;
  targetId: string;
}

export interface NightResult {
  killedPlayerIds: string[];
  savedPlayerIds: string[];
  seerInspection?: { playerId: string; roleId: RoleId; isWerewolf: boolean } | null;
  loversLinked?: [string, string] | null;
  wolfPupTriggeredNextNight?: boolean;
  elderAttacked?: boolean;
  hunterShots?: HunterShotRecord[];
  summary: string[];
  killedDetails?: NightVictimDetail[];
  logicExplanations?: NightLogicStep[];
}

export interface VoteRecord {
  voterId: string;
  targetId: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole?: RoleId;
  text: string;
  timestamp: number;
  isGhost?: boolean; // ghost chat anti-cheat
  isSystem?: boolean;
}

export interface GameHistoryRecord {
  id: string;
  roomId: string;
  date: string;
  winner: 'villagers' | 'werewolves' | 'lovers' | 'tanner' | 'draw';
  rounds: number;
  playersCount: number;
  roster: { name: string; roleId: RoleId; isAlive: boolean }[];
  mvp: string;
}

export interface LeaderboardUser {
  id: string;
  name: string;
  avatar: string;
  elo: number;
  matchesPlayed: number;
  wins: number;
  winRate: number;
  favoriteRole: RoleId;
  badges: string[];
}

export type Language = 'vi' | 'en' | 'fr' | 'es' | 'ja';

export type NightSkillCutsceneKind =
  | 'werewolf'
  | 'cupid'
  | 'bodyguard'
  | 'seer'
  | 'witch_heal'
  | 'witch_poison'
  | 'doppelganger'
  | 'hunter_shot';

export interface NightSkillCutsceneEvent {
  id: string;
  kind: NightSkillCutsceneKind;
  actorIds: string[];
  primaryTargetId: string | null;
  secondaryTargetId?: string | null;
  /** Populated ONLY for the Seer themselves (after confirming) or dead Ghosts. */
  seerIsWolf?: boolean | null;
  durationMs?: number;
  label?: string;
}

export interface GhostNightSpectatorView {
  wakingActorIds: string[];
  liveActions: NightActions;
  wolfPackPicks: Record<string, { targetId: string | null; secondTargetId?: string | null }>;
  dyingWolfVictimIds: string[];
  seerInspectionTonight: {
    seerId: string;
    targetId: string;
    roleId: RoleId;
    isWerewolf: boolean;
  } | null;
  skillCutscenes: NightSkillCutsceneEvent[];
}

export type BotPersonaId =
  | 'detective'
  | 'prosecutor'
  | 'observer'
  | 'manipulator'
  | 'protector'
  | 'wildcard';

export type StorylineId =
  | 'random_dramatic'
  | 'classic_deduction'
  | 'twin_seers'
  | 'forbidden_lovers'
  | 'wolf_civil_war'
  | 'jester_mindgame'
  | 'silent_night_paranoia'
  | 'mayor_coup';

export interface PublicRoleClaim {
  speakerId: string;
  claimedRole: RoleId;
  round: number;
  targetId?: string;
  checkResult?: 'wolf' | 'good';
}
