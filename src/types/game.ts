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
  hasUsedPower?: boolean; // hunter shot
  loverId?: string; // paired by cupid
  protectedLastNight?: boolean;
  elderLives?: number; // starts with 2
  targetPlayerId?: string; // for doppelganger specific player model
  targetRoleId?: RoleId; // fallback role inheritance
}

export type Phase = 'lobby' | 'night' | 'day_discussion' | 'day_voting' | 'hunter_revenge' | 'game_over';

export interface NightActions {
  wolfTargetId?: string | null;
  secondWolfTargetId?: string | null; // when wolf pup frenzy is active
  guardTargetId?: string | null;
  seerTargetId?: string | null;
  witchHealTargetId?: string | null;
  witchPoisonTargetId?: string | null;
  cupidLovers?: [string, string] | null;
  doppelgangerTargetId?: string | null;
}

export interface NightVictimDetail {
  playerId: string;
  name: string;
  roleId: RoleId;
  causes: string[];
  logicExplanation: string;
}

export interface NightLogicStep {
  badge: string;
  title: string;
  detail: string;
  category: 'death' | 'saved' | 'special' | 'info';
}

export interface NightResult {
  killedPlayerIds: string[];
  savedPlayerIds: string[];
  seerInspection?: { playerId: string; roleId: RoleId; isWerewolf: boolean } | null;
  loversLinked?: [string, string] | null;
  wolfPupTriggeredNextNight?: boolean;
  elderAttacked?: boolean;
  triggeredHunterId?: string | null;
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
