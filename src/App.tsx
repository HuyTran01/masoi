import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Moon,
  Sun,
  Shield,
  Skull,
  Eye,
  EyeOff,
  Send,
  MessageSquare,
  Camera,
  ChevronDown,
  ChevronUp,
  FastForward,
  Mic,
  MicOff,
  Trophy,
  History,
  BookOpen,
  Smartphone,
  FlaskConical,
  Play,
  X,
  Compass,
  HelpCircle,
  Globe,
  Bot,
  Ghost,
  Volume2,
  VolumeX,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Plus,
  Minus,
  Crosshair,
  View,
  RotateCcw,
  RotateCw,
  BookMarked,
  Crown,
  Lock,
} from 'lucide-react';
import { WerewolfVillage3D } from './components/WerewolfVillage3D';
import {
  CameraViewPreset,
  getContextualInteractionPrompt,
  getNextCameraPreset,
  isDirectLookCameraPreset,
} from './game/fpvCamera';
import { GMAssistantView } from './components/GMAssistantView';
import { VirtualCardPlayerView } from './components/VirtualCardPlayerView';
import { LeaderboardView } from './components/LeaderboardView';
import { MatchHistoryView } from './components/MatchHistoryView';
import { RoleEncyclopediaView } from './components/RoleEncyclopediaView';
import { RoleCardModal } from './components/RoleCardModal';
import {
  SocialLoginModal,
  UserProfileData,
  AuthProviderId,
  AccountModalTab,
} from './components/SocialLoginModal';
import { syncAuthenticatedPlayerAccountToFirestore } from './firebase';
import { OnboardingTourModal } from './components/OnboardingTourModal';
import { RoomLobbyModal, LobbyParticipant } from './components/RoomLobbyModal';
import { VoiceChatBar } from './components/VoiceChatBar';
import { TitleScreenOverlay } from './components/TitleScreenOverlay';
import { GameTopHud } from './components/GameTopHud';
import { NightActionConsole } from './components/NightActionConsole';
import { DayActionBar } from './components/DayActionBar';
import { GMAnnouncementModal } from './components/GMAnnouncementModal';
import { AgrouAvatarLockerModal } from './components/AgrouAvatarLockerModal';
import { AgrouNotebookDrawer } from './components/AgrouNotebookDrawer';
import { AgrouEmoteWheel } from './components/AgrouEmoteWheel';
import { NightDeathCinematicOverlay } from './components/NightDeathCinematicOverlay';
import { RoleRevealRoster } from './components/RoleRevealRoster';
import { realtimeClient } from './utils/realtimeClient';
import type { RealtimeChatMessage, RealtimeTimerConfig } from './server/realtimeRooms';
import type { OnlinePlayerMatchView } from './server/onlineMatchEngine';
import type { GMDeckMode } from './server/gmRooms';
import {
  Player,
  RoleId,
  Language,
  ChatMessage,
  VoteRecord,
  Phase,
  NightActions,
  GameMode,
  PropType,
  ThrownPropEvent,
  NightDeathCinematicState,
} from './types/game';
import { ROLES } from './game/roles';
import {
  generateBalancedRoster,
  assignPreferredRoleToDeck,
  getDyingWolfVictimsForWitch,
  resolveNightActions,
  applyDayLynch,
  castSingleDayVote,
  buildVoteTallyEntries,
  checkWinCondition,
  resolveHunterShot,
  computeFactionAliveCounts,
} from './game/rules';
import {
  AgrouAvatarConfig,
  AgrouEmoteEvent,
  AgrouEmoteId,
  AgrouMapBiome,
  AgrouNotebookState,
  CAMPFIRE_ABSTAIN_ID,
  PlayerNotebookNote,
  appendNotebookTimelineEvent,
  createInitialNotebook,
  electMayorForVillage,
  formatNotebookShareSummary,
  getBotCosmetics,
  loadAgrouAvatarConfig,
  resolveNextMayorIfNeeded,
  saveAgrouAvatarConfig,
  tallyVotesWithMayor,
  updateNotebookPlayerEntry,
} from './game/agrouMechanics';
import {
  buildAutoGMNightSchedule,
  isPlayerAwakeForNightStep,
  findHumanNightStepIndex,
  getHumanRoleWakeGuidance,
  computeAutoGMBotNightStepAction,
  computeSmartBotDayVotes,
  pickSmartBotHunterTarget,
  extractChatVoteSignals,
  stripMarkdownAsterisks,
  buildBotDayDiscussionLines,
  getStepInitialTimerSeconds,
  prepareNightStartForHuman,
  shouldAutoAdvanceOnTimerZero,
  buildDawnGMAnnouncement,
  buildDuskGMAnnouncement,
  determineEndOfNightCinematic,
  GMAnnouncementData,
  CustomTimerConfig,
  DEFAULT_TIMER_CONFIG,
} from './game/autoGM';
import { UI_TEXT } from './utils/i18n';
import { sound } from './utils/sound';
import { addMatchHistory } from './utils/storage';
import confetti from 'canvas-confetti';

const ACTIVE_MATCH_SNAPSHOT_KEY = 'werewolf_active_match_v1';
const AUTH_TOKEN_STORAGE_KEY = 'werewolf_auth_token';

interface SavedAIMatchSnapshot {
  savedAt: number;
  players: Player[];
  phase: Phase;
  round: number;
  nightStepIndex: number;
  timerSeconds: number;
  mayorId: string | null;
  wolfPupFrenzy: boolean;
  elderSealActive?: boolean;
  votes: VoteRecord[];
  hasVoted: boolean;
  messages: ChatMessage[];
  notebook: AgrouNotebookState;
  suspectTags: Record<string, 'wolf_suspect' | 'trusted' | undefined>;
  doppelgangerTargetId: string | null;
  cupidLovers: [string, string] | null;
  tonightWolfVictimId: string | null;
  secondWolfTargetId?: string | null;
  guardTargetTonightId: string | null;
  witchHealTargetTonightId?: string | null;
  witchSaveUsedTonight?: boolean;
  witchPoisonTargetId: string | null;
  hasInspectedTonight?: boolean;
  seerInspectResult?: string | null;
  knownWolfIds?: string[];
  villageSize: number;
  preferredRole: RoleId | 'random';
  eventBanner: string;
}

function loadSavedAIMatchSnapshot(): SavedAIMatchSnapshot | null {
  try {
    const raw = sessionStorage.getItem(ACTIVE_MATCH_SNAPSHOT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SavedAIMatchSnapshot>;
    if (
      !parsed ||
      !Array.isArray(parsed.players) ||
      parsed.players.length < 4 ||
      !parsed.phase ||
      parsed.phase === 'game_over' ||
      parsed.phase === 'lobby' ||
      parsed.phase === 'hunter_revenge'
    ) {
      return null;
    }
    return parsed as SavedAIMatchSnapshot;
  } catch {
    return null;
  }
}

function clearSavedAIMatchSnapshot(): void {
  try {
    sessionStorage.removeItem(ACTIVE_MATCH_SNAPSHOT_KEY);
  } catch {
    // ignore
  }
}

const BOT_NAMES = [
  'Đức Huy',
  'Thảo My',
  'Minh Hoàng',
  'Tuấn Kiệt',
  'Bảo Châu',
  'Quỳnh Anh',
  'Hữu Phước',
  'Kim Ngân',
  'Gia Bảo',
  'Phương Linh',
  'Hải Đăng',
  'Thanh Trúc',
  'Khánh Duy',
  'Ngọc Ánh',
  'Hoàng Nam',
  'Trúc Lam',
  'Nhật Minh',
  'Thiên Kim',
  'Anh Tuấn',
  'Bích Ngọc',
];

const BOT_AVATARS = [
  '🦊',
  '🦉',
  '🐻',
  '🐱',
  '🐰',
  '🐼',
  '🦁',
  '🐸',
  '🐯',
  '🐨',
  '🦄',
  '🐧',
  '🦝',
  '🦌',
  '🐿️',
  '🦔',
  '🦩',
  '🐙',
  '🐝',
  '🦋',
];

const VILLAGE_BADGE_CLASSES: Record<number, { badgeClass: string; stars: string }> = {
  6: {
    badgeClass: 'text-emerald-400 bg-emerald-950/90 border-emerald-500/50',
    stars: '★☆☆☆',
  },
  8: {
    badgeClass: 'text-sky-400 bg-sky-950/90 border-sky-500/50',
    stars: '★★☆☆',
  },
  10: {
    badgeClass: 'text-amber-400 bg-amber-950/90 border-amber-500/50',
    stars: '★★★☆',
  },
  12: {
    badgeClass: 'text-rose-400 bg-rose-950/90 border-rose-500/50',
    stars: '★★★★',
  },
};

type DrawerTool =
  | 'none'
  | 'chat'
  | 'gm'
  | 'cards'
  | 'leaderboard'
  | 'history'
  | 'encyclopedia';

function getOrCreateTabGuestIdentity(): { id: string; defaultName: string } {
  const randomSuffix = () => Math.floor(100 + Math.random() * 900);
  try {
    let uid = sessionStorage.getItem('werewolf_client_uid');
    if (!uid || uid === 'usr_me') {
      uid = `usr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
      sessionStorage.setItem('werewolf_client_uid', uid);
    }
    let guestName = sessionStorage.getItem('werewolf_guest_name');
    if (!guestName || guestName === 'Thợ Săn Đêm' || /^Thợ Săn #\d+$/.test(guestName)) {
      guestName = `Người Chơi #${randomSuffix()}`;
      sessionStorage.setItem('werewolf_guest_name', guestName);
    }
    return { id: uid, defaultName: guestName };
  } catch {
    const suf = randomSuffix();
    return {
      id: `usr_${Date.now().toString(36)}_${suf}`,
      defaultName: `Người Chơi #${suf}`,
    };
  }
}

export default function App() {
  // Game Shell State ('title' | 'playing' | 'paused' | 'gameover' | 'gm_host' | 'gm_player')
  const [shellState, setShellState] = useState<
    'title' | 'playing' | 'paused' | 'gameover' | 'gm_host' | 'gm_player'
  >(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('gm') || params.get('gmroom') || params.get('room')) return 'gm_player';
    if (params.get('autostart') === '1') return 'playing';
    return 'title';
  });

  const [gameMode, setGameMode] = useState<GameMode>(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('gm') || params.get('gmroom') || params.get('room')) return 'gm';
    return 'ai_practice';
  });
  const [gmDeckMode, setGmDeckMode] = useState<GMDeckMode>('virtual_deck');
  const [lang, setLang] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('werewolf_lang') as Language | null;
      if (saved && ['vi', 'en', 'fr', 'es', 'ja'].includes(saved)) return saved;
    } catch {
      // ignore
    }
    return 'vi';
  });
  const [isMuted, setIsMuted] = useState<boolean>(() => sound.getMuted());
  const [isBgmMuted, setIsBgmMuted] = useState<boolean>(() => sound.getBgmMuted());
  const [isSfxMuted, setIsSfxMuted] = useState<boolean>(() => sound.getSfxMuted());
  const [onlineMatchView, setOnlineMatchView] = useState<OnlinePlayerMatchView | null>(null);
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  const [initialAccountTab, setInitialAccountTab] = useState<AccountModalTab | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) || null;
    } catch {
      return null;
    }
  });
  const [showFactionHints, setShowFactionHints] = useState<boolean>(false);
  const [activeToolPopover, setActiveToolPopover] = useState<'none' | 'props' | 'voice'>('none');
  const [virtualCardRoomId, setVirtualCardRoomId] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    return (params.get('gm') || params.get('gmroom') || params.get('room') || '').toUpperCase();
  });
  const [savedMatchSnapshot, setSavedMatchSnapshot] = useState<SavedAIMatchSnapshot | null>(() =>
    loadSavedAIMatchSnapshot()
  );
  const [activeDrawer, setActiveDrawer] = useState<DrawerTool>('none');
  const [isDockCollapsed, setIsDockCollapsed] = useState<boolean>(false);
  const [isTitleMenuMinimized, setIsTitleMenuMinimized] = useState<boolean>(false);
  const [cameraPreset, setCameraPreset] = useState<CameraViewPreset>('campfire');
  const [freeLook360, setFreeLook360] = useState<boolean>(false);
  const [aimedPlayerId, setAimedPlayerId] = useState<string | null>(null);
  const [aimedOwnSeat, setAimedOwnSeat] = useState<boolean>(false);
  const [isUserRoaming, setIsUserRoaming] = useState<boolean>(false);
  const [returnToSeatTrigger, setReturnToSeatTrigger] = useState<number>(0);
  const [returnToSeatSeq, setReturnToSeatSeq] = useState<number>(0);
  const [jumpTriggerSeq, setJumpTriggerSeq] = useState<number>(0);
  const [fpvLookTurnRate, setFpvLookTurnRate] = useState<number>(0);
  const [ghostVerticalRate, setGhostVerticalRate] = useState<-1 | 0 | 1>(0);
  const preFreeLookCameraRef = useRef<CameraViewPreset | null>(null);
  const isResolvingVoteRef = useRef<boolean>(false);

  // Room Creation / Join Lobby Modal State
  const [lobbyModalState, setLobbyModalState] = useState<{
    isOpen: boolean;
    mode: 'online' | 'gm';
  }>({ isOpen: false, mode: 'online' });

  // Interactive Spotlight Onboarding Guide ("Guild hướng dẫn")
  const [showOnboardingTour, setShowOnboardingTour] = useState<boolean>(false);

  // Mobile / Open-World Virtual D-Pad Vector
  const [moveVector, setMoveVector] = useState<{ x: number; z: number }>({ x: 0, z: 0 });

  // Fun Day Discussion Props (Tomatoes, Rotten Eggs, Roses, Water) & Agrou 3D Emotes
  const [activePropTool, setActivePropTool] = useState<PropType | null>(null);
  const [thrownProps, setThrownProps] = useState<ThrownPropEvent[]>([]);
  const [avatarConfig, setAvatarConfig] = useState<AgrouAvatarConfig>(() =>
    loadAgrouAvatarConfig()
  );
  const [showAvatarLocker, setShowAvatarLocker] = useState<boolean>(false);
  const [isNotebookOpen, setIsNotebookOpen] = useState<boolean>(false);
  const [notebook, setNotebook] = useState<AgrouNotebookState>(() => createInitialNotebook());
  const [emoteEvents, setEmoteEvents] = useState<AgrouEmoteEvent[]>([]);

  // Role Callout Voice Toast Banner & Non-Blocking Action Warning Toast
  const [roleCalloutToast, setRoleCalloutToast] = useState<{
    roleId: RoleId;
    quote: string;
    sfxLabel: string;
  } | null>(null);
  const [actionWarningToast, setActionWarningToast] = useState<string | null>(null);
  const [isSeerInspectPending, setIsSeerInspectPending] = useState<boolean>(false);
  const [isRoleCardInitialOpen, setIsRoleCardInitialOpen] = useState<boolean>(false);

  // Anti-Cheat Night Blindfold Override (allows player to close eyes after acting)
  const [hasClosedEyesTonight, setHasClosedEyesTonight] = useState<boolean>(false);

  // Authentic Real-Life AI Game Master Dawn/Dusk Announcements & Night Death Cinematic
  const [gmAnnouncement, setGmAnnouncement] = useState<GMAnnouncementData | null>(null);
  const [lastDawnAnnouncement, setLastDawnAnnouncement] = useState<GMAnnouncementData | null>(null);
  const [aimedCampfire, setAimedCampfire] = useState<boolean>(false);
  const [nightDeathCinematic, setNightDeathCinematic] =
    useState<NightDeathCinematicState | null>(null);
  const [pendingDawnAfterDeath, setPendingDawnAfterDeath] =
    useState<GMAnnouncementData | null>(null);
  const [pendingNightTransition, setPendingNightTransition] = useState<{
    nextPlayers: Player[];
    nextRound: number;
    nextFrenzy: boolean;
  } | null>(null);
  const [pendingDawnContext, setPendingDawnContext] = useState<{
    beforePlayers: Player[];
    nightKilledIds: string[];
    seerInspection: { playerId: string; roleId: RoleId; isWerewolf: boolean } | null;
  } | null>(null);
  const [pendingDuskBeforePlayers, setPendingDuskBeforePlayers] = useState<Player[] | null>(null);

  // User Profile (Database Account & Unique Per-Tab Guest Identity)
  const [currentUser, setCurrentUser] = useState<UserProfileData>(() => {
    const tabGuest = getOrCreateTabGuestIdentity();
    const fallback: UserProfileData = {
      id: tabGuest.id,
      name: tabGuest.defaultName,
      avatar: '🐺',
      elo: 1620,
      provider: 'guest',
      handle: '',
      region: 'VN',
      matchesPlayed: 0,
      wins: 0,
    };
    try {
      const saved = localStorage.getItem('werewolf_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          const isSignedInAccount =
            parsed.provider &&
            parsed.provider !== 'guest' &&
            typeof parsed.handle === 'string' &&
            parsed.handle.trim().length > 0;
          const resolvedId = isSignedInAccount
            ? typeof parsed.id === 'string' &&
              parsed.id.trim().length > 0 &&
              !parsed.id.startsWith('usr_')
              ? parsed.id.trim()
              : `acc_${parsed.handle.trim().toLowerCase()}`
            : tabGuest.id;
          const isAutoGuestName =
            typeof parsed.name === 'string' &&
            (parsed.name.trim() === 'Thợ Săn Đêm' ||
              /^Thợ Săn #\d+$/.test(parsed.name.trim()) ||
              /^Người Chơi #\d+$/.test(parsed.name.trim()));
          const resolvedName =
            typeof parsed.name === 'string' &&
            parsed.name.trim() &&
            (isSignedInAccount || !isAutoGuestName)
              ? parsed.name
              : fallback.name;
          return {
            ...fallback,
            ...parsed,
            id: resolvedId,
            name: resolvedName,
            avatar:
              typeof parsed.avatar === 'string' && parsed.avatar
                ? parsed.avatar
                : fallback.avatar,
            elo:
              typeof parsed.elo === 'number' && !Number.isNaN(parsed.elo)
                ? parsed.elo
                : fallback.elo,
          };
        }
      }
    } catch {
      // ignore corrupted localStorage
    }
    return fallback;
  });

  // Match & Room State
  const [roomId, setRoomId] = useState<string>(
    () => 'ONL-' + Math.floor(1000 + Math.random() * 9000)
  );
  const [villageSize, setVillageSize] = useState<number>(() => {
    try {
      const saved = Number(localStorage.getItem('werewolf_pref_village_size'));
      if (Number.isInteger(saved) && saved >= 4 && saved <= 20) return saved;
    } catch {
      // ignore
    }
    return 8;
  });
  const [preferredRole, setPreferredRole] = useState<RoleId | 'random'>(() => {
    try {
      const saved = localStorage.getItem('werewolf_pref_role');
      if (saved === 'random' || (saved && saved in ROLES)) {
        return saved as RoleId | 'random';
      }
    } catch {
      // ignore
    }
    return 'random';
  });
  const [timerConfig, setTimerConfig] = useState<CustomTimerConfig>(() => {
    try {
      const saved = localStorage.getItem('werewolf_timer_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return {
            nightActionSec: Math.max(5, Math.min(120, Number(parsed.nightActionSec) || 20)),
            botStepSec: Math.max(2, Math.min(20, Number(parsed.botStepSec) || 4)),
            dayDiscussSec: Math.max(10, Math.min(300, Number(parsed.dayDiscussSec) || 35)),
            dayVoteSec: Math.max(10, Math.min(180, Number(parsed.dayVoteSec) || 25)),
            hunterShotSec: Math.max(5, Math.min(90, Number(parsed.hunterShotSec) || 20)),
          };
        }
      }
    } catch {
      // ignore
    }
    return DEFAULT_TIMER_CONFIG;
  });
  const [phase, setPhase] = useState<Phase>(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      const p = params.get('phase');
      if (p === 'day_discussion' || p === 'day_voting' || p === 'night') return p;
    }
    return 'night';
  });
  const [round, setRound] = useState<number>(1);
  const [timerSeconds, setTimerSeconds] = useState<number>(20);
  const [wolfPupFrenzy, setWolfPupFrenzy] = useState<boolean>(false);
  const [elderSealActive, setElderSealActive] = useState<boolean>(false);
  const [matchInstanceId, setMatchInstanceId] = useState<number>(1);
  const lastAutoAdvancedKeyRef = useRef<string>('');
  const botVoteTimeoutRef = useRef<number | null>(null);
  const botPropTimeoutRef = useRef<number | null>(null);
  const phaseRef = useRef<Phase>(phase);
  const matchInstanceIdRef = useRef<number>(matchInstanceId);
  const onlineClockOffsetRef = useRef<number>(0);
  const onlinePhaseEndsAtRef = useRef<number>(0);
  const activeOnlineRoomCodeRef = useRef<string | null>(null);
  const lastReceivedMatchStateRef = useRef<{
    code: string;
    view: OnlinePlayerMatchView;
    serverNow: number;
  } | null>(null);
  const lastOnlineMatchIdRef = useRef<number>(0);
  const lastOnlinePhaseRef = useRef<Phase | null>(null);
  const lastOnlineStepKeyRef = useRef<string>('');
  const lastSeenAnnouncementKeyRef = useRef<string>('');
  const lastSeenCinematicKeyRef = useRef<string>('');
  const lastSeenGameOverMatchIdRef = useRef<number>(0);
  const lastNotebookSeerKeyRef = useRef<string>('');
  const avatarConfigRef = useRef<AgrouAvatarConfig>(avatarConfig);
  const currentUserRef = useRef<UserProfileData>(currentUser);
  const langRef = useRef<Language>(lang);
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);
  useEffect(() => {
    matchInstanceIdRef.current = matchInstanceId;
  }, [matchInstanceId]);
  useEffect(() => {
    avatarConfigRef.current = avatarConfig;
  }, [avatarConfig]);
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);
  useEffect(() => {
    langRef.current = lang;
  }, [lang]);

  // Players in the 3D Village Circle (Initialized with an active night role for the human player)
  const [initialBootState] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const autostartGhostsCount =
      params.get('autostart') === '1'
        ? Math.max(0, Math.min(6, Number(params.get('ghosts')) || 0))
        : 0;
    const initialCount = 8;
    const savedCosmetics = loadAgrouAvatarConfig();
    const roles = assignPreferredRoleToDeck(generateBalancedRoster(initialCount), 'random');
    const basePlayers: Player[] = [
      {
        id: currentUser.id,
        name: currentUser.name,
        avatar: currentUser.avatar,
        roleId: roles[0],
        isAlive: autostartGhostsCount < 1,
        isHost: true,
        hat: savedCosmetics.hat,
        cloakColor: savedCosmetics.cloakColor,
        elderLives: roles[0] === 'elder' ? 2 : undefined,
      },
      ...BOT_NAMES.slice(0, initialCount - 1).map((name, i) => {
        const botLook = getBotCosmetics(i);
        return {
          id: `bot_${i + 1}`,
          name,
          avatar: BOT_AVATARS[i % BOT_AVATARS.length],
          roleId: roles[i + 1],
          isAlive: i + 1 >= autostartGhostsCount,
          isBot: true,
          hat: botLook.hat,
          cloakColor: botLook.cloakColor,
          elderLives: roles[i + 1] === 'elder' ? 2 : undefined,
        };
      }),
    ];
    const prepared = prepareNightStartForHuman(
      basePlayers,
      1,
      DEFAULT_TIMER_CONFIG,
      currentUser.id
    );
    let readyPlayers = basePlayers;
    if (prepared.preSimulatedActions.cupidLovers) {
      const [l1, l2] = prepared.preSimulatedActions.cupidLovers;
      readyPlayers = basePlayers.map((p) => {
        if (p.id === l1) return { ...p, loverId: l2 };
        if (p.id === l2) return { ...p, loverId: l1 };
        return p;
      });
    }
    const initialMayorId = electMayorForVillage(
      readyPlayers,
      readyPlayers[Math.floor(Math.random() * readyPlayers.length)]?.id
    );
    readyPlayers = readyPlayers.map((p) => ({
      ...p,
      isMayor: Boolean(initialMayorId && p.id === initialMayorId),
    }));
    return { readyPlayers, prepared, initialMayorId };
  });

  const [players, setPlayers] = useState<Player[]>(() => initialBootState.readyPlayers);
  const [mayorId, setMayorId] = useState<string | null>(() => initialBootState.initialMayorId);
  const playersRef = useRef<Player[]>(players);
  useEffect(() => {
    playersRef.current = players;
  }, [players]);

  // Active 3D Selection & Role Power State
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [secondWolfTargetId, setSecondWolfTargetId] = useState<string | null>(
    () => initialBootState.prepared.preSimulatedActions.secondWolfTargetId || null
  );
  const [cupidLovers, setCupidLovers] = useState<[string, string] | null>(
    () => initialBootState.prepared.preSimulatedActions.cupidLovers || null
  );
  const [witchHealTargetTonightId, setWitchHealTargetTonightId] = useState<string | null>(
    () => initialBootState.prepared.preSimulatedActions.witchHealTargetId || null
  );
  const botWitchActedTonightRef = useRef<boolean>(
    initialBootState.prepared.completedBotRoleIds.includes('witch')
  );
  const [witchPoisonTargetId, setWitchPoisonTargetId] = useState<string | null>(
    () => initialBootState.prepared.preSimulatedActions.witchPoisonTargetId || null
  );
  const [tonightWolfVictimId, setTonightWolfVictimId] = useState<string | null>(
    () => initialBootState.prepared.preSimulatedActions.wolfTargetId || null
  );
  const [seerInspectResult, setSeerInspectResult] = useState<string | null>(null);
  const [showMyRoleModal, setShowMyRoleModal] = useState<boolean>(false);

  // Automated Game Master ("Quản Trò Máy") Sequential Night & Rule State
  const [nightStepIndex, setNightStepIndex] = useState<number>(
    () => initialBootState.prepared.initialStepIndex
  );
  const [hasInspectedTonight, setHasInspectedTonight] = useState<boolean>(false);
  const [doppelgangerTargetId, setDoppelgangerTargetId] = useState<string | null>(
    () => initialBootState.prepared.preSimulatedActions.doppelgangerTargetId || null
  );
  const [guardTargetTonightId, setGuardTargetTonightId] = useState<string | null>(
    () => initialBootState.prepared.preSimulatedActions.guardTargetId || null
  );
  const [seerTargetTonightId, setSeerTargetTonightId] = useState<string | null>(
    () => initialBootState.prepared.preSimulatedActions.seerTargetId || null
  );
  const [knownWolfIds, setKnownWolfIds] = useState<string[]>([]);

  // Player Deduction Notebook Tags ('wolf_suspect' | 'trusted') synced from Seer & Notebook
  const [suspectTags, setSuspectTags] = useState<
    Record<string, 'wolf_suspect' | 'trusted' | undefined>
  >({});

  // Voting & Voice State
  const [votes, setVotes] = useState<VoteRecord[]>([]);
  const [hasVoted, setHasVoted] = useState<boolean>(false);
  const [isMicOn, setIsMicOn] = useState<boolean>(false);
  const [activeSpeakers, setActiveSpeakers] = useState<string[]>([]);

  const t = UI_TEXT[lang];

  // Chat & Anti-cheat Ghost Channel
  const [chatTab, setChatTab] = useState<'main' | 'ghost'>('main');
  const [chatInput, setChatInput] = useState<string>('');
  const [chatNotice, setChatNotice] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'msg_0',
      senderId: 'sys',
      senderName: '🤖 Quản Trò Máy',
      text: UI_TEXT[lang].bottomControlHint,
      timestamp: Date.now(),
      isSystem: true,
    },
  ]);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<ChatMessage[]>(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    try {
      localStorage.setItem('werewolf_pref_village_size', String(villageSize));
      localStorage.setItem('werewolf_pref_role', preferredRole);
    } catch {
      // ignore
    }
  }, [villageSize, preferredRole]);

  const me = players.find((p) => p.id === currentUser.id) || players[0];
  const myRole = (me && ROLES[me.roleId]) || ROLES.villager;

  const handleUpdateTimerConfig = useCallback((next: CustomTimerConfig) => {
    setTimerConfig(next);
    try {
      localStorage.setItem('werewolf_timer_config', JSON.stringify(next));
    } catch {
      // ignore
    }
  }, []);

  // Build sequential Night Call Schedule moderated by Quản Trò Máy (or consume server schedule in Online mode)
  const localNightSchedule = buildAutoGMNightSchedule(players, round, timerConfig, me?.id);
  const nightSchedule = localNightSchedule;
  const nightSchedulePills =
    gameMode === 'online' && onlineMatchView
      ? onlineMatchView.nightScheduleSummary.map((s) => ({
          key: s.key,
          roleId: s.roleId,
          isHumanTurn: s.isMyTurn,
        }))
      : localNightSchedule.map((s) => ({
          key: s.key,
          roleId: s.roleId,
          isHumanTurn: s.isHumanTurn,
        }));
  const currentNightStep =
    gameMode === 'online' && onlineMatchView
      ? onlineMatchView.currentNightStep
      : phase === 'night'
      ? localNightSchedule[Math.min(nightStepIndex, Math.max(0, localNightSchedule.length - 1))] ||
        null
      : null;
  const myNightStepIdx =
    gameMode === 'online' && onlineMatchView
      ? onlineMatchView.nightScheduleSummary.findIndex((s) => s.isMyTurn)
      : findHumanNightStepIndex(localNightSchedule, me, round);
  const myWakeGuidance = getHumanRoleWakeGuidance(me, round, lang);

  // Status Banner & End-of-Run Snapshot
  const [eventBanner, setEventBanner] = useState<string>(() => {
    if (phase === 'day_discussion') {
      return `${UI_TEXT[lang].dayDiscussTitle(1)} · ${UI_TEXT[lang].funPropsLabel}`;
    }
    if (phase === 'day_voting') {
      return UI_TEXT[lang].dayVoteTitle(1);
    }
    return `${UI_TEXT[lang].nightPhaseTitle(1)} · ${myRole.name[lang]}: ${myRole.instructions[lang]}`;
  });
  const [pauseTimerDraft, setPauseTimerDraft] = useState<{
    nightActionSec: string;
    dayDiscussSec: string;
    dayVoteSec: string;
  }>(() => ({
    nightActionSec: String(timerConfig.nightActionSec),
    dayDiscussSec: String(timerConfig.dayDiscussSec),
    dayVoteSec: String(timerConfig.dayVoteSec),
  }));

  useEffect(() => {
    if (shellState === 'paused') {
      setPauseTimerDraft({
        nightActionSec: String(timerConfig.nightActionSec),
        dayDiscussSec: String(timerConfig.dayDiscussSec),
        dayVoteSec: String(timerConfig.dayVoteSec),
      });
    }
  }, [shellState, timerConfig.nightActionSec, timerConfig.dayDiscussSec, timerConfig.dayVoteSec]);

  const commitPauseTimerField = useCallback(
    (field: 'nightActionSec' | 'dayDiscussSec' | 'dayVoteSec', min: number, max: number) => {
      const parsed = parseInt(pauseTimerDraft[field].trim(), 10);
      const clamped = Number.isNaN(parsed)
        ? timerConfig[field]
        : Math.max(min, Math.min(max, parsed));
      if (clamped !== timerConfig[field]) {
        handleUpdateTimerConfig({ ...timerConfig, [field]: clamped });
      }
      setPauseTimerDraft((prev) => ({ ...prev, [field]: String(clamped) }));
    },
    [pauseTimerDraft, timerConfig, handleUpdateTimerConfig]
  );
  const [activeHunter, setActiveHunter] = useState<Player | null>(null);
  const [hunterOriginPhase, setHunterOriginPhase] = useState<'night' | 'day_voting'>('night');
  const [gameResult, setGameResult] = useState<{
    winner: string;
    reason: string;
    rounds: number;
    eloDelta: number;
    survivors: number;
  } | null>(null);

  // Change language handler (persists to localStorage & updates banner immediately)
  const handleChangeLanguage = useCallback(
    (nextLang: Language) => {
      setLang(nextLang);
      try {
        localStorage.setItem('werewolf_lang', nextLang);
      } catch {
        // ignore
      }
      const nextT = UI_TEXT[nextLang];
      const roleDef = ROLES[me.roleId];
      if (phase === 'night') {
        if (currentNightStep) {
          const awakeNow = isPlayerAwakeForNightStep(me, currentNightStep.key, round);
          setEventBanner(
            awakeNow
              ? `${currentNightStep.gmNarration[nextLang]} · ${currentNightStep.playerInstruction[nextLang]}`
              : currentNightStep.gmNarration[nextLang]
          );
        } else {
          setEventBanner(
            `${nextT.nightPhaseTitle(round)} · ${roleDef.name[nextLang]}: ${roleDef.instructions[nextLang]}`
          );
        }
      } else if (phase === 'day_voting') {
        setEventBanner(nextT.dayVoteTitle(round));
      } else if (phase === 'day_discussion') {
        setEventBanner(`${nextT.dayDiscussTitle(round)} · ${nextT.funPropsLabel}`);
      }
      setMessages((prev) =>
        prev.map((m) => (m.id === 'msg_0' ? { ...m, text: nextT.bottomControlHint } : m))
      );
    },
    [me, currentNightStep, phase, round]
  );

  // Determine whether the human player is allowed to open their eyes and roam/act right now at night
  // Strictly governed by Quản Trò Máy's current role step (or server-authoritative view in Online mode)!
  const isMyTurnInNightStep =
    gameMode === 'online' && onlineMatchView
      ? onlineMatchView.isMyNightTurn
      : isPlayerAwakeForNightStep(me, currentNightStep?.key || null, round);
  const isPlayerAwakeAtNight =
    phase === 'night' && me.isAlive && isMyTurnInNightStep && !hasClosedEyesTonight;

  // Mirror shellState to document.body.dataset.state & keep <html lang> synced
  useEffect(() => {
    document.body.dataset.state = shellState;
  }, [shellState]);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  // Persist authToken in localStorage & validate on mount via GET /api/accounts/me
  useEffect(() => {
    try {
      if (authToken) {
        localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, authToken);
      } else {
        localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
      }
    } catch {
      // ignore storage errors
    }
  }, [authToken]);

  useEffect(() => {
    const token = authToken;
    if (!token) return;
    let cancelled = false;
    fetch('/api/accounts/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (cancelled) return;
        if (res.status === 401 || res.status === 404) {
          setAuthToken(null);
          try {
            localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
          } catch {
            // ignore
          }
          return;
        }
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled || !data?.ok || !data?.account) return;
        const acc = data.account as {
          id: string;
          username: string;
          displayName: string;
          avatar: string;
          region?: string;
          elo?: number;
          matchesPlayed?: number;
          wins?: number;
        };
        setCurrentUser((prev) => {
          const prevId = prev.id;
          const nextUser: UserProfileData = {
            ...prev,
            id: acc.id || prev.id,
            name: acc.displayName || prev.name,
            avatar: acc.avatar || prev.avatar,
            handle: acc.username || prev.handle,
            provider: prev.provider && prev.provider !== 'guest' ? prev.provider : 'account',
            region: acc.region || prev.region || 'VN',
            elo: typeof acc.elo === 'number' ? acc.elo : prev.elo,
            matchesPlayed:
              typeof acc.matchesPlayed === 'number'
                ? acc.matchesPlayed
                : prev.matchesPlayed ?? 0,
            wins: typeof acc.wins === 'number' ? acc.wins : prev.wins ?? 0,
          };
          try {
            localStorage.setItem('werewolf_user', JSON.stringify(nextUser));
          } catch {
            // ignore
          }
          setPlayers((prevPlayers) =>
            prevPlayers.map((p) =>
              p.id === prevId
                ? { ...p, id: nextUser.id, name: nextUser.name, avatar: nextUser.avatar }
                : p
            )
          );
          return nextUser;
        });
      })
      .catch(() => {
        // offline or server unavailable — keep cached local profile
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Ensure living players can never view the dead-only Ghost chat tab
  useEffect(() => {
    if (me.isAlive && chatTab === 'ghost') {
      setChatTab('main');
    }
  }, [me.isAlive, chatTab]);

  // Cancel pending delayed bot vote / bot prop timers whenever phase, match, or shell changes
  useEffect(() => {
    if (phase !== 'day_voting' && botVoteTimeoutRef.current !== null) {
      window.clearTimeout(botVoteTimeoutRef.current);
      botVoteTimeoutRef.current = null;
    }
    if (phase !== 'day_discussion' && botPropTimeoutRef.current !== null) {
      window.clearTimeout(botPropTimeoutRef.current);
      botPropTimeoutRef.current = null;
    }
  }, [phase, matchInstanceId, shellState]);

  useEffect(() => {
    return () => {
      if (botVoteTimeoutRef.current !== null) {
        window.clearTimeout(botVoteTimeoutRef.current);
        botVoteTimeoutRef.current = null;
      }
      if (botPropTimeoutRef.current !== null) {
        window.clearTimeout(botPropTimeoutRef.current);
        botPropTimeoutRef.current = null;
      }
    };
  }, []);

  // Sync Ambient BGM with current phase (strictly ONLY during 3D 'playing' mode)
  useEffect(() => {
    if (shellState === 'playing') {
      sound.setBGMMode(phase === 'night' ? 'night' : 'day');
    } else {
      sound.stopBGM();
    }
  }, [shellState, phase]);

  // Check URL query parameters on mount (?gm=GM-XXXX, ?gmroom=GM-XXXX, or ?room=GM-XXXX opens standalone GM Player Card view)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('gm') || params.get('gmroom') || params.get('room');
    if (roomParam) {
      setGameMode('gm');
      setVirtualCardRoomId(roomParam.trim().toUpperCase());
      setShellState('gm_player');
      setActiveDrawer('none');
    }
  }, []);

  // Trigger dramatic Role Callout sound + voice quote when Quản Trò Máy calls a role
  const triggerNightRoleCallout = useCallback(
    (roleId: RoleId) => {
      const callRole = ROLES[roleId].wakeOrder > 0 ? roleId : 'werewolf';
      const info = sound.playRoleCallout(callRole, lang);
      setRoleCalloutToast({
        roleId: callRole,
        quote: info.quote,
        sfxLabel: info.sfxLabel,
      });
    },
    [lang]
  );

  // Auto-dismiss roleCalloutToast after 4s so it never blocks the 3D screen
  useEffect(() => {
    if (!roleCalloutToast) return;
    const timer = window.setTimeout(() => {
      setRoleCalloutToast(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [roleCalloutToast]);

  // Auto-dismiss actionWarningToast after 3.5s
  useEffect(() => {
    if (!actionWarningToast) return;
    const timer = window.setTimeout(() => {
      setActionWarningToast(null);
    }, 3500);
    return () => clearTimeout(timer);
  }, [actionWarningToast]);

  const showActionWarning = useCallback((msg: string) => {
    setEventBanner(msg);
    setActionWarningToast(msg);
  }, []);

  // Clear stale night callouts when entering daytime phases (BUG-33)
  useEffect(() => {
    if (phase !== 'night') {
      setRoleCalloutToast(null);
      setIsSeerInspectPending(false);
    }
  }, [phase]);

  // Close tool popovers when collapsing dock or when player becomes a dead ghost (BUG-01, BUG-13)
  useEffect(() => {
    if (isDockCollapsed) {
      setActiveToolPopover('none');
    }
  }, [isDockCollapsed]);

  useEffect(() => {
    if (!me.isAlive) {
      setActivePropTool(null);
      setActiveToolPopover((p) => (p === 'props' ? 'none' : p));
    }
  }, [me.isAlive]);

  // Auto-scroll chat drawer to bottom when new messages arrive or drawer opens (BUG-24)
  useEffect(() => {
    if (activeDrawer !== 'chat') return;
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, activeDrawer, chatTab]);

  // Extract publicly accused suspect IDs from daytime chat for fair Bot Witch targeting
  const getPublicSuspectedIds = useCallback((targetPlayers: Player[]) => {
    const signals = extractChatVoteSignals(messagesRef.current, targetPlayers);
    const unique = new Set<string>();
    for (const list of Object.values(signals.suspectsByVoter)) {
      for (const id of list) unique.add(id);
    }
    return Array.from(unique);
  }, []);

  // Unified helper to start any Night (Round 1 or Round 2+) directly at the human player's turn
  const beginNewNight = useCallback(
    (
      targetPlayers: Player[],
      targetRound: number,
      targetFrenzy: boolean,
      knownWolves: string[] = knownWolfIds
    ) => {
      if (botVoteTimeoutRef.current !== null) {
        window.clearTimeout(botVoteTimeoutRef.current);
        botVoteTimeoutRef.current = null;
      }
      if (botPropTimeoutRef.current !== null) {
        window.clearTimeout(botPropTimeoutRef.current);
        botPropTimeoutRef.current = null;
      }

      const human = targetPlayers.find((p) => p.id === currentUser.id) || targetPlayers[0];
      const prepared = prepareNightStartForHuman(
        targetPlayers,
        targetRound,
        timerConfig,
        human?.id,
        {
          wolfPupFrenzy: targetFrenzy,
          knownWolfIdsByBotSeer: knownWolves,
          suspectedIds: getPublicSuspectedIds(targetPlayers),
        }
      );

      let nextPlayers = targetPlayers;
      if (prepared.preSimulatedActions.cupidLovers) {
        const [l1, l2] = prepared.preSimulatedActions.cupidLovers;
        nextPlayers = targetPlayers.map((p) => {
          if (p.id === l1) return { ...p, loverId: l2 };
          if (p.id === l2) return { ...p, loverId: l1 };
          return p;
        });
      }

      lastAutoAdvancedKeyRef.current = '';
      isResolvingVoteRef.current = false;
      botWitchActedTonightRef.current = prepared.completedBotRoleIds.includes('witch');
      setMatchInstanceId((m) => m + 1);
      setPlayers(nextPlayers);
      setRound(targetRound);
      setPhase('night');
      setVotes([]);
      setHasVoted(false);
      setGmAnnouncement(null);
      setPendingNightTransition(null);
      setPendingDawnContext(null);
      setPendingDuskBeforePlayers(null);
      setNightStepIndex(prepared.initialStepIndex);
      setTimerSeconds(prepared.initialTimerSec);
      setHasInspectedTonight(false);
      setIsSeerInspectPending(false);
      setHasClosedEyesTonight(false);
      setActivePropTool(null);
      setActiveToolPopover('none');
      setSelectedTargetId(null);
      setSeerInspectResult(null);
      setIsUserRoaming(false);
      setAimedOwnSeat(false);

      setDoppelgangerTargetId(prepared.preSimulatedActions.doppelgangerTargetId || null);
      if (targetRound === 1) {
        setCupidLovers(prepared.preSimulatedActions.cupidLovers || null);
      }
      setTonightWolfVictimId(prepared.preSimulatedActions.wolfTargetId || null);
      setSecondWolfTargetId(prepared.preSimulatedActions.secondWolfTargetId || null);
      setWitchHealTargetTonightId(prepared.preSimulatedActions.witchHealTargetId || null);
      setWitchPoisonTargetId(prepared.preSimulatedActions.witchPoisonTargetId || null);
      setSeerTargetTonightId(prepared.preSimulatedActions.seerTargetId || null);
      setGuardTargetTonightId(prepared.preSimulatedActions.guardTargetId || null);

      return prepared;
    },
    [currentUser.id, timerConfig, knownWolfIds, getPublicSuspectedIds]
  );

  // Automated Game Master ("Quản Trò Máy") sequential night step orchestrator
  // STRICTLY ONLY runs when shellState === 'playing' in local modes (NEVER in server-authoritative Online mode!)
  useEffect(() => {
    if (gameMode === 'online') return;
    if (shellState !== 'playing' || phase !== 'night' || !currentNightStep) return;

    const awakeNow = isPlayerAwakeForNightStep(me, currentNightStep.key, round);
    setHasClosedEyesTonight(false);
    setTimerSeconds(getStepInitialTimerSeconds(currentNightStep, myNightStepIdx, nightStepIndex));

    setEventBanner(
      awakeNow
        ? `${currentNightStep.gmNarration[lang]} · ${currentNightStep.playerInstruction[lang]}`
        : currentNightStep.gmNarration[lang]
    );

    if (shellState === 'playing' && !(awakeNow && currentNightStep.key === 'seer')) {
      triggerNightRoleCallout(currentNightStep.roleId);
    }

    // Only execute AI Bot actions when the current step is a Bot step (never overwrite human turn)
    if (!awakeNow) {
      if (currentNightStep.key === 'witch') {
        botWitchActedTonightRef.current = true;
      }
      const botUpdates = computeAutoGMBotNightStepAction(
        currentNightStep.key,
        players,
        {
          wolfTargetId: tonightWolfVictimId,
          secondWolfTargetId,
          guardTargetId: guardTargetTonightId,
          witchHealTargetId: witchHealTargetTonightId,
          witchPoisonTargetId,
          seerTargetId: seerTargetTonightId,
          cupidLovers,
          doppelgangerTargetId,
        },
        {
          round,
          wolfPupFrenzy,
          humanPlayerId: me.id,
          knownWolfIdsByBotSeer: knownWolfIds,
          suspectedIds: getPublicSuspectedIds(players),
        }
      );

      if (botUpdates.doppelgangerTargetId) {
        setDoppelgangerTargetId(botUpdates.doppelgangerTargetId);
      }
      if (botUpdates.cupidLovers) {
        const [l1, l2] = botUpdates.cupidLovers;
        setCupidLovers([l1, l2]);
        setPlayers((prev) =>
          prev.map((p) => {
            if (p.id === l1) return { ...p, loverId: l2 };
            if (p.id === l2) return { ...p, loverId: l1 };
            return p;
          })
        );
      }
      if (botUpdates.wolfTargetId) {
        setTonightWolfVictimId(botUpdates.wolfTargetId);
      }
      if (botUpdates.secondWolfTargetId) {
        setSecondWolfTargetId(botUpdates.secondWolfTargetId);
      }
      if (botUpdates.witchHealTargetId) {
        setWitchHealTargetTonightId(botUpdates.witchHealTargetId);
      }
      if (botUpdates.witchPoisonTargetId) {
        setWitchPoisonTargetId(botUpdates.witchPoisonTargetId);
      }
      if (botUpdates.seerTargetId) {
        // Defer adding Bot Seer's inspection to knownWolfIds until POST-death check in handleResolveNight!
        setSeerTargetTonightId(botUpdates.seerTargetId);
      }
      if (botUpdates.guardTargetId) {
        setGuardTargetTonightId(botUpdates.guardTargetId);
      }
    }
  }, [gameMode, phase, round, nightStepIndex, shellState, matchInstanceId]);

  // Simulate ambient voice speakers in the village (Night Wolf Channel strictly isolates to OTHER living wolves)
  useEffect(() => {
    if (shellState !== 'playing') return;
    const interval = setInterval(() => {
      if (phase === 'night') {
        const isWolf = me.roleId === 'werewolf' || me.roleId === 'wolf_pup';
        if (!isWolf || !me.isAlive) {
          setActiveSpeakers([]);
          return;
        }
        const otherLivingWolves = players.filter(
          (p) =>
            p.isAlive &&
            p.id !== me.id &&
            (p.roleId === 'werewolf' || p.roleId === 'wolf_pup')
        );
        const speakers: string[] = [];
        if (otherLivingWolves.length > 0) {
          const pick =
            otherLivingWolves[Math.floor(Math.random() * otherLivingWolves.length)];
          speakers.push(pick.name);
        }
        if (isMicOn && me.isAlive) speakers.push(me.name);
        setActiveSpeakers(speakers);
        return;
      }

      const alive = players.filter((p) => p.isAlive);
      if (alive.length === 0) return;
      const pick = alive[Math.floor(Math.random() * alive.length)];
      const speakers = [pick.name];
      if (isMicOn && me.isAlive) speakers.push(me.name);
      setActiveSpeakers(speakers);
    }, 3000);
    return () => clearInterval(interval);
  }, [shellState, phase, players, isMicOn, me]);

  // Strictly force Microphone OFF & lock voice whenever player dies (Ghost Silence Rule)
  useEffect(() => {
    if (shellState === 'playing' && !me.isAlive && isMicOn) {
      setIsMicOn(false);
    }
  }, [shellState, me.isAlive, isMicOn]);

  const handleToggleMicSafe = useCallback(() => {
    if (!me.isAlive) {
      setIsMicOn(false);
      setEventBanner(
        lang === 'vi'
          ? '👻 Bạn đã thành Hồn Ma — Micro đã bị khóa!'
          : '👻 You are a Ghost — Microphone is locked!'
      );
      return;
    }
    setIsMicOn((prev) => !prev);
  }, [me.isAlive, lang]);

  // Throw a Tomato / Rotten Egg / Rose / Water Prop in 3D (Purely visual & audio fun teasing — NO chat message spam)
  const handleThrowProp = useCallback(
    (fromId: string, toId: string, propType: PropType, skipBroadcast = false) => {
      sound.playThrowWhoosh(propType);
      const newEv: ThrownPropEvent = {
        id: `prop_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        fromId,
        toId,
        propType,
        timestamp: Date.now(),
      };
      setThrownProps((prev) => [...prev.slice(-15), newEv]);
      if (
        !skipBroadcast &&
        gameMode === 'online' &&
        (propType === 'tomato' || propType === 'rose' || propType === 'egg' || propType === 'water')
      ) {
        realtimeClient.sendProp(roomId, {
          id: newEv.id,
          propType,
          fromPlayerId: fromId,
          targetPlayerId: toId,
          timestamp: newEv.timestamp,
        });
      }
    },
    [gameMode, roomId]
  );

  // Agrou Cosmetic Locker & Map Biome Persistence + Live 3D Avatar Sync
  const handleUpdateAvatarConfig = useCallback(
    (next: AgrouAvatarConfig) => {
      setAvatarConfig(next);
      saveAgrouAvatarConfig(next);
      setPlayers((prev) =>
        prev.map((p) =>
          p.id === currentUser.id
            ? { ...p, hat: next.hat, cloakColor: next.cloakColor }
            : p
        )
      );
    },
    [currentUser.id]
  );

  const handleChangeBiome = useCallback(
    (mapBiome: AgrouMapBiome) => {
      sound.playCardFlip();
      const next: AgrouAvatarConfig = { ...avatarConfig, mapBiome };
      setAvatarConfig(next);
      saveAgrouAvatarConfig(next);
    },
    [avatarConfig]
  );

  const handleTriggerEmote = useCallback(
    (emote: AgrouEmoteId, actorId?: string) => {
      const targetActor = actorId || currentUser.id;
      const ev: AgrouEmoteEvent = {
        id: `emote_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        playerId: targetActor,
        emote,
        timestamp: Date.now(),
      };
      setEmoteEvents((prev) => [...prev.slice(-12), ev]);
    },
    [currentUser.id]
  );

  const handleUpdateNotebookPlayer = useCallback(
    (playerId: string, patch: Partial<PlayerNotebookNote>) => {
      setNotebook((prev) => updateNotebookPlayerEntry(prev, playerId, patch));
      if (patch.trust !== undefined) {
        setSuspectTags((prev) => ({
          ...prev,
          [playerId]:
            patch.trust === 'trusted'
              ? 'trusted'
              : patch.trust === 'suspicious' || patch.trust === 'wolf_lock'
              ? 'wolf_suspect'
              : undefined,
        }));
      }
    },
    []
  );

  const handleShareNotebookToChat = useCallback(() => {
    if (!me.isAlive) {
      setEventBanner(
        lang === 'vi'
          ? '🔒 Bạn đã chết thành Hồn Ma — Không thể gửi tin nhắn vào khung chat!'
          : '🔒 You are dead (Ghost) — Chat sending is locked!'
      );
      return;
    }
    const summaryText = formatNotebookShareSummary(notebook, players, lang);
    const nextMsg: ChatMessage = {
      id: `nb_share_${Date.now()}`,
      senderId: me.id,
      senderName: me.name,
      text: summaryText,
      timestamp: Date.now(),
      isGhost: false,
    };
    setMessages((prev) => [...prev, nextMsg]);
    if (gameMode === 'online') {
      realtimeClient.sendChat(roomId, nextMsg);
    }
    setEventBanner(
      lang === 'vi'
        ? '📒 Đã gửi tóm tắt Sổ Tay Suy Luận vào chat làng!'
        : '📒 Shared your Deduction Notebook summary to village chat!'
    );
    setIsNotebookOpen(false);
    setActiveDrawer('chat');
  }, [notebook, players, lang, me.id, me.name, me.roleId, me.isAlive, gameMode, roomId]);

  const mergeOnlineChatMessages = useCallback(
    (incoming: RealtimeChatMessage[] | undefined, replaceExisting = false) => {
      if (!Array.isArray(incoming)) return;
      if (replaceExisting) {
        setMessages(
          incoming
            .filter((m) => m && m.id)
            .slice()
            .sort((a, b) => a.timestamp - b.timestamp)
        );
        return;
      }
      if (incoming.length === 0) return;
      setMessages((prev) => {
        const seen = new Set(prev.map((m) => m.id));
        const additions = incoming.filter((m) => m && m.id && !seen.has(m.id));
        if (additions.length === 0) return prev;
        return [...prev, ...additions].sort((a, b) => a.timestamp - b.timestamp);
      });
    },
    []
  );

  // Authoritatively reconcile client 3D state from a server-sanitized OnlinePlayerMatchView
  const applyOnlineMatchView = useCallback(
    (view: OnlinePlayerMatchView, serverNow?: number) => {
      const effectiveServerNow = typeof serverNow === 'number' ? serverNow : view.serverNow;
      onlineClockOffsetRef.current = effectiveServerNow - Date.now();
      onlinePhaseEndsAtRef.current = view.phaseEndsAt;

      const isRematch =
        lastOnlineMatchIdRef.current !== 0 && view.matchId !== lastOnlineMatchIdRef.current;
      if (isRematch) {
        lastSeenAnnouncementKeyRef.current = '';
        lastSeenCinematicKeyRef.current = '';
        lastSeenGameOverMatchIdRef.current = 0;
        lastOnlineStepKeyRef.current = '';
        lastOnlinePhaseRef.current = null;
        lastNotebookSeerKeyRef.current = '';
        setGmAnnouncement(null);
        setLastDawnAnnouncement(null);
        setNightDeathCinematic(null);
        setPendingDawnAfterDeath(null);
        setGameResult(null);
        setSuspectTags({});
        setNotebook(createInitialNotebook());
        setHasClosedEyesTonight(false);
        setActivePropTool(null);
        setEmoteEvents([]);
        setThrownProps([]);
        setSeerInspectResult(null);
        setHasInspectedTonight(false);
        setSelectedTargetId(null);
        setSecondWolfTargetId(null);
        setWitchHealTargetTonightId(null);
        setWitchPoisonTargetId(null);
        setCupidLovers(null);
        setDoppelgangerTargetId(null);
        setShellState('playing');
        sound.playNightBell();
      }
      lastOnlineMatchIdRef.current = view.matchId;

      setOnlineMatchView(view);
      setTimerSeconds(
        view.phaseEndsAt
          ? Math.max(0, Math.ceil((view.phaseEndsAt - effectiveServerNow) / 1000))
          : 0
      );

      const myId = currentUserRef.current.id;
      const myCosmetics = avatarConfigRef.current;
      const syncedPlayers: Player[] = view.players.map((p) =>
        p.id === myId ? { ...p, hat: myCosmetics.hat, cloakColor: myCosmetics.cloakColor } : p
      );
      setPlayers(syncedPlayers);
      const viewer = syncedPlayers.find((p) => p.id === myId) || syncedPlayers[0];

      const prevPhase = lastOnlinePhaseRef.current;
      const phaseChanged = prevPhase !== null && prevPhase !== view.phase;
      lastOnlinePhaseRef.current = view.phase;

      setPhase(view.phase);
      setRound(view.round);
      setMayorId(view.mayorId);
      setElderSealActive(view.elderSealActive);
      setWolfPupFrenzy(view.wolfPupFrenzy);
      setNightStepIndex(view.nightStepIndex);
      setVotes(view.votes);
      const myVote = view.votes.find((v) => v.voterId === myId);
      setHasVoted(Boolean(myVote));

      const onlineStepKey = `${view.matchId}:${view.round}:${view.phase}:${view.nightStepIndex}:${
        view.currentNightStep?.key ?? ''
      }`;
      const stepChanged = lastOnlineStepKeyRef.current !== onlineStepKey;
      lastOnlineStepKeyRef.current = onlineStepKey;

      if (stepChanged) {
        setHasClosedEyesTonight(false);
        setIsSeerInspectPending(false);
        if (view.phase !== 'night') {
          setTonightWolfVictimId(null);
          setSecondWolfTargetId(null);
          setGuardTargetTonightId(null);
          setWitchHealTargetTonightId(null);
          setWitchPoisonTargetId(null);
          setSeerTargetTonightId(null);
          setDoppelgangerTargetId(null);
          setRoleCalloutToast(null);
        }
        if (view.phase === 'night' || view.phase === 'day_voting') {
          setActivePropTool(null);
          setActiveToolPopover('none');
        }
      }

      const sel = view.myNightSelection || {};
      if (view.phase === 'night') {
        if (viewer?.roleId === 'werewolf' || viewer?.roleId === 'wolf_pup') {
          setTonightWolfVictimId(sel.targetId ?? null);
          setSecondWolfTargetId(sel.secondTargetId ?? null);
          setSelectedTargetId(sel.targetId ?? null);
        } else if (viewer?.roleId === 'bodyguard') {
          setGuardTargetTonightId(sel.targetId ?? null);
          setSelectedTargetId(sel.targetId ?? null);
        } else if (viewer?.roleId === 'witch') {
          setWitchHealTargetTonightId(sel.witchHealTargetId ?? null);
          setWitchPoisonTargetId(sel.witchPoisonTargetId ?? null);
          setSelectedTargetId(sel.witchPoisonTargetId ?? null);
        } else if (viewer?.roleId === 'doppelganger') {
          setDoppelgangerTargetId(sel.doppelgangerTargetId ?? null);
          setSelectedTargetId(sel.doppelgangerTargetId ?? null);
        } else if (viewer?.roleId === 'cupid') {
          if (sel.cupidLovers) {
            setCupidLovers(sel.cupidLovers);
            setSelectedTargetId(sel.cupidLovers[0]);
          } else if (stepChanged || view.round > 1) {
            setCupidLovers(null);
            setSelectedTargetId(null);
          }
        } else if (viewer?.roleId === 'seer') {
          if (view.mySeerInspection && view.mySeerInspection.round === view.round) {
            setHasInspectedTonight(true);
            setIsSeerInspectPending(false);
            setSeerTargetTonightId(view.mySeerInspection.playerId);
            setSelectedTargetId(view.mySeerInspection.playerId);
          } else {
            setHasInspectedTonight(false);
            if (sel.targetId) {
              setSeerTargetTonightId(sel.targetId);
              setSelectedTargetId(sel.targetId);
            } else if (stepChanged) {
              setSeerTargetTonightId(null);
              setSelectedTargetId(null);
            }
          }
        } else if (stepChanged) {
          setSelectedTargetId(null);
        }
      } else if (view.phase === 'day_voting') {
        setSelectedTargetId(myVote ? myVote.targetId : null);
      } else if (stepChanged) {
        setSelectedTargetId(null);
      }

      if (view.phase !== 'night' || view.round > 1) {
        const loverPlayer = syncedPlayers.find((p) => Boolean(p.loverId));
        if (loverPlayer && loverPlayer.loverId) {
          setCupidLovers([loverPlayer.id, loverPlayer.loverId]);
        } else if (view.round === 1 && !sel.cupidLovers) {
          setCupidLovers(null);
        }
      }

      const curLang = langRef.current;
      const curT = UI_TEXT[curLang];

      if (view.mySeerInspection && view.mySeerInspection.round === view.round) {
        const inspected = syncedPlayers.find((p) => p.id === view.mySeerInspection!.playerId);
        if (inspected) {
          const isWolf = view.mySeerInspection.isWerewolf;
          const resText = `${inspected.name}: ${
            isWolf ? `🐺 ${ROLES.werewolf.name[curLang]}` : `🛡️ ${ROLES.villager.name[curLang]}`
          }`;
          setSeerInspectResult(resText);
          setSuspectTags((prev) => {
            const nextTag = isWolf ? 'wolf_suspect' : 'trusted';
            return prev[inspected.id] === nextTag ? prev : { ...prev, [inspected.id]: nextTag };
          });
          const seerNbKey = `${view.matchId}:${view.round}:${inspected.id}`;
          if (lastNotebookSeerKeyRef.current !== seerNbKey) {
            lastNotebookSeerKeyRef.current = seerNbKey;
            setNotebook((prevNb) => {
              const withEntry = updateNotebookPlayerEntry(prevNb, inspected.id, {
                trust: isWolf ? 'wolf_lock' : 'trusted',
                guessedRole: isWolf ? 'werewolf' : 'villager',
              });
              return appendNotebookTimelineEvent(withEntry, {
                round: view.round,
                phaseLabel: curLang === 'vi' ? `Soi Đêm #${view.round}` : `Seer #${view.round}`,
                text: `🔮 ${resText}`,
                tone: 'clue',
              });
            });
          }
        }
      } else if (stepChanged || view.phase !== 'night') {
        setSeerInspectResult(null);
      }

      const hunterPlayer = view.activeHunterId
        ? syncedPlayers.find((p) => p.id === view.activeHunterId) || null
        : null;
      setActiveHunter(hunterPlayer);

      if (stepChanged) {
        if (view.phase === 'night' && view.currentNightStep) {
          if (phaseChanged) {
            sound.playNightBell();
          }
          if (!(view.isMyNightTurn && view.currentNightStep.key === 'seer')) {
            triggerNightRoleCallout(view.currentNightStep.roleId);
          }
          setEventBanner(
            view.isMyNightTurn
              ? `${view.currentNightStep.gmNarration[curLang]} · ${view.currentNightStep.playerInstruction[curLang]}`
              : view.currentNightStep.gmNarration[curLang]
          );
        } else if (view.phase === 'day_discussion') {
          setEventBanner(
            view.announcement?.dayBarSummary
              ? `☀️ ${curT.dayDiscussTitle(view.round)}: ${view.announcement.dayBarSummary}`
              : `${curT.dayDiscussTitle(view.round)} · ${curT.funPropsLabel}`
          );
        } else if (view.phase === 'day_voting') {
          if (phaseChanged) {
            sound.playGavel();
          }
          setEventBanner(
            curLang === 'vi'
              ? `⚖️ ${curT.dayVoteTitle(view.round)} — Chọn 1 người hoặc bấm Lửa Trại để bỏ phiếu trắng!`
              : `⚖️ ${curT.dayVoteTitle(view.round)}`
          );
        } else if (view.phase === 'hunter_revenge') {
          if (phaseChanged) {
            sound.playShotgunCock();
            if (view.isMyHunterTurn) sound.playGhostWail();
          }
          setEventBanner(
            view.isMyHunterTurn
              ? curLang === 'vi'
                ? `🎯 Bạn (${view.activeHunterName || ''}) đã tử trận! Hãy chọn 1 người để nổ súng hoặc bấm Giữ súng!`
                : `🎯 You (${view.activeHunterName || ''}) fell! Pick 1 living target or Hold Fire!`
              : curLang === 'vi'
              ? `🎯 Thợ Săn ${view.activeHunterName || ''} đang chọn mục tiêu bắn trả...`
              : `🎯 Hunter ${view.activeHunterName || ''} is choosing a revenge target...`
          );
        }
      }

      const annKey = view.announcement
        ? `${view.matchId}:${view.round}:${view.announcement.kind}:${view.announcement.headline}`
        : '';
      const cinKey = view.deathCinematic
        ? `${view.matchId}:${view.round}:${view.deathCinematic.causeType}:${view.deathCinematic.victimName}`
        : '';
      const isNewCinematic = Boolean(cinKey && cinKey !== lastSeenCinematicKeyRef.current);
      const isNewAnnouncement = Boolean(annKey && annKey !== lastSeenAnnouncementKeyRef.current);

      if (view.announcement?.kind === 'dawn') {
        setLastDawnAnnouncement(view.announcement);
      }

      if (isNewCinematic && view.deathCinematic) {
        lastSeenCinematicKeyRef.current = cinKey;
        if (view.deathCinematic.causeType === 'witch_poison') {
          sound.playWitchCauldron();
        } else if (view.deathCinematic.causeType === 'cupid_lover') {
          sound.playCupidHarp();
        } else if (view.deathCinematic.causeType === 'hunter_shot') {
          sound.playShotgunCock();
        } else {
          sound.playDeath();
        }
        if (viewer && !viewer.isAlive) {
          sound.playGhostWail();
        }
        setNightDeathCinematic(view.deathCinematic);
        if (isNewAnnouncement && view.announcement) {
          lastSeenAnnouncementKeyRef.current = annKey;
          setPendingDawnAfterDeath(view.announcement);
        }
      } else if (isNewAnnouncement && view.announcement) {
        lastSeenAnnouncementKeyRef.current = annKey;
        setGmAnnouncement(view.announcement);
        sound.playGMAnnouncement(
          view.announcement.kind,
          view.announcement.victims.length > 0,
          view.announcement.spokenNarration,
          curLang
        );
        setNotebook((prevNb) =>
          appendNotebookTimelineEvent(prevNb, {
            round: view.round,
            phaseLabel:
              view.announcement!.kind === 'dawn'
                ? curLang === 'vi'
                  ? `Bình Minh #${view.round}`
                  : `Dawn #${view.round}`
                : curLang === 'vi'
                ? `Hoàng Hôn #${view.round}`
                : `Dusk #${view.round}`,
            text: view.announcement!.dayBarSummary || view.announcement!.headline,
            tone: view.announcement!.victims.length > 0 ? 'death' : 'info',
          })
        );
      }

      if (
        view.phase === 'game_over' &&
        view.gameResult &&
        lastSeenGameOverMatchIdRef.current !== view.matchId
      ) {
        lastSeenGameOverMatchIdRef.current = view.matchId;
        sound.playVictory();
        confetti({ particleCount: 100, spread: 75 });

        const eloDelta = view.gameResult.myEloDelta;
        const userNow = currentUserRef.current;
        const nextElo = Math.max(1000, userNow.elo + eloDelta);
        const nextMatches = (userNow.matchesPlayed || 0) + 1;
        const nextWins = (userNow.wins || 0) + (eloDelta > 0 ? 1 : 0);
        const updatedUser: UserProfileData = {
          ...userNow,
          elo: nextElo,
          matchesPlayed: nextMatches,
          wins: nextWins,
        };
        setCurrentUser(updatedUser);
        try {
          localStorage.setItem('werewolf_user', JSON.stringify(updatedUser));
        } catch {
          // ignore
        }

        // Server already applied authoritative ELO updates — do not double-POST /api/accounts/update
        setGmAnnouncement(null);
        setNightDeathCinematic(null);
        setPendingDawnAfterDeath(null);
        setGameResult({
          winner: view.gameResult.winner,
          reason: view.gameResult.reason,
          rounds: view.gameResult.rounds,
          eloDelta,
          survivors: view.gameResult.survivors,
        });
        setEventBanner(view.gameResult.reason);
        setShellState('gameover');

        addMatchHistory({
          id: `match_onl_${view.matchId}_${Date.now()}`,
          roomId: activeOnlineRoomCodeRef.current || roomId,
          date: new Date().toLocaleString(),
          winner: view.gameResult.winner as any,
          rounds: view.gameResult.rounds,
          playersCount: syncedPlayers.length,
          mvp: userNow.name,
          roster: syncedPlayers.map((p) => ({
            name: p.name,
            roleId: p.roleId,
            isAlive: p.isAlive,
          })),
        });
      }
    },
    [roomId, triggerNightRoleCallout]
  );

  // Clean reset of match-scoped UI overlays, popovers, pointer lock & movement (BUG-19)
  const resetMatchUiState = useCallback(() => {
    setIsNotebookOpen(false);
    setShowMyRoleModal(false);
    setIsRoleCardInitialOpen(false);
    setActiveDrawer('none');
    setActiveToolPopover('none');
    setActivePropTool(null);
    setFreeLook360(false);
    preFreeLookCameraRef.current = null;
    if (document.pointerLockElement && typeof document.exitPointerLock === 'function') {
      try {
        document.exitPointerLock();
      } catch {
        // ignore
      }
    }
    setGmAnnouncement(null);
    setNightDeathCinematic(null);
    setPendingDawnAfterDeath(null);
    setRoleCalloutToast(null);
    setActionWarningToast(null);
    setIsSeerInspectPending(false);
    isResolvingVoteRef.current = false;
    setMoveVector({ x: 0, z: 0 });
    setFpvLookTurnRate(0);
    setGhostVerticalRate(0);
  }, []);

  // Reconcile Dusk vote breakdown with Mayor x2 weight and Campfire Abstain row (BUG-08)
  const enrichDuskAnnouncementVotes = useCallback(
    (
      announcement: GMAnnouncementData,
      allVotes: VoteRecord[],
      beforePlayers: Player[],
      currentMayorId: string | null,
      curLang: Language
    ): GMAnnouncementData => {
      const tally = tallyVotesWithMayor(allVotes, currentMayorId);
      const playerVotesOnly = allVotes.filter((v) => v.targetId !== CAMPFIRE_ABSTAIN_ID);
      const weightedEntries = buildVoteTallyEntries(beforePlayers, playerVotesOnly).map((entry) => ({
        ...entry,
        votes: tally.counts[entry.playerId] ?? entry.votes,
      }));
      if (tally.abstainCount > 0) {
        const abstainVoters = tally.abstainerIds
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
            (v): v is { id: string; name: string; avatar: string; seatNumber: number } =>
              Boolean(v)
          );
        weightedEntries.push({
          playerId: CAMPFIRE_ABSTAIN_ID,
          name: UI_TEXT[curLang].campfireAbstain,
          avatar: '🔥',
          seatNumber: 0,
          votes: tally.abstainCount,
          voters: abstainVoters,
        });
      }
      weightedEntries.sort((a, b) => b.votes - a.votes || a.seatNumber - b.seatNumber);
      return { ...announcement, voteBreakdown: weightedEntries };
    },
    []
  );

  // Ensure Cupid & pre-simulated human lovers get accurate Dawn private notices (BUG-07)
  const enrichDawnCupidNotices = useCallback(
    (
      announcement: GMAnnouncementData,
      effectivePlayers: Player[],
      humanId: string,
      resolvedLovers: [string, string] | null,
      curRound: number,
      curLang: Language
    ): GMAnnouncementData => {
      if (curRound !== 1) return announcement;
      const afterMe = effectivePlayers.find((p) => p.id === humanId);
      if (!afterMe || !afterMe.isAlive) return announcement;
      const extraNotices: string[] = [];
      if (afterMe.roleId === 'cupid' && resolvedLovers && resolvedLovers[0] && resolvedLovers[1]) {
        const idx1 = effectivePlayers.findIndex((p) => p.id === resolvedLovers[0]);
        const idx2 = effectivePlayers.findIndex((p) => p.id === resolvedLovers[1]);
        if (idx1 >= 0 && idx2 >= 0) {
          const p1 = effectivePlayers[idx1];
          const p2 = effectivePlayers[idx2];
          extraNotices.push(
            curLang === 'vi'
              ? `💘 Mật báo Quản Trò: Bạn đã ghép đôi ${p1.name} (#${idx1 + 1}) và ${p2.name} (#${idx2 + 1}) thành Tình Nhân sinh tử!`
              : `💘 Secret GM Tap: You linked ${p1.name} (#${idx1 + 1}) and ${p2.name} (#${idx2 + 1}) as star-crossed Lovers!`
          );
        }
      } else if (
        afterMe.roleId !== 'cupid' &&
        afterMe.loverId &&
        !(announcement.privateNotice || '').includes('💘')
      ) {
        const partnerIdx = effectivePlayers.findIndex((p) => p.id === afterMe.loverId);
        if (partnerIdx >= 0) {
          const partner = effectivePlayers[partnerIdx];
          extraNotices.push(
            curLang === 'vi'
              ? `💘 Mật báo Quản Trò: Đêm qua mũi tên Cupid đã ghép đôi bạn với ${partner.name} (#${partnerIdx + 1}). Hai bạn cùng sống, cùng chết!`
              : `💘 Secret GM Tap: Cupid bound you as Lovers with ${partner.name} (#${partnerIdx + 1}). You live and die together!`
          );
        }
      }
      if (extraNotices.length === 0) return announcement;
      const merged = announcement.privateNotice
        ? `${announcement.privateNotice}\n${extraNotices.join('\n')}`
        : extraNotices.join('\n');
      return { ...announcement, privateNotice: merged };
    },
    []
  );

  // Start / Restart a 3D Match (Supports Online Room with exact participants & server-assigned roles, or AI Practice)
  const handleStartMatch = useCallback(
    (
      customCount?: number,
      forcedRole?: RoleId | 'random',
      modeOverride?: GameMode,
      customRoomId?: string,
      customParticipants?: LobbyParticipant[],
      serverMatchRoles?: Record<string, RoleId>,
      serverTimerConfig?: RealtimeTimerConfig,
      autoOpenRoleCard = false,
      initialMatchView?: OnlinePlayerMatchView,
      initialServerNow?: number,
      initialChatMessages?: RealtimeChatMessage[]
    ) => {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      const nextMode = modeOverride || gameMode;
      setGameMode(nextMode);
      const count =
        customParticipants && customParticipants.length >= 4
          ? customParticipants.length
          : customCount || villageSize || 8;
      setVillageSize(count);
      const effectiveRoomCode = customRoomId || roomId;
      if (customRoomId) setRoomId(customRoomId);

      if (serverTimerConfig) {
        setTimerConfig((prev) => ({
          ...prev,
          nightActionSec: serverTimerConfig.nightActionSec,
          dayDiscussSec: serverTimerConfig.dayDiscussSec,
          dayVoteSec: serverTimerConfig.dayVoteSec,
        }));
      }

      if (nextMode === 'online') {
        activeOnlineRoomCodeRef.current = effectiveRoomCode;
        onlineClockOffsetRef.current = 0;
        onlinePhaseEndsAtRef.current = 0;
        lastOnlineMatchIdRef.current = 0;
        lastOnlinePhaseRef.current = null;
        lastOnlineStepKeyRef.current = '';
        lastSeenAnnouncementKeyRef.current = '';
        lastSeenCinematicKeyRef.current = '';
        lastSeenGameOverMatchIdRef.current = 0;
        lastNotebookSeerKeyRef.current = '';
        setOnlineMatchView(null);
      } else {
        activeOnlineRoomCodeRef.current = null;
        lastReceivedMatchStateRef.current = null;
        setOnlineMatchView(null);
      }

      const roleChoice = forcedRole ?? preferredRole;
      const deck = assignPreferredRoleToDeck(generateBalancedRoster(count), roleChoice);

      const rawPlayers: Player[] =
        customParticipants && customParticipants.length >= 4
          ? customParticipants.map((part, idx) => {
              const botLook = getBotCosmetics(idx);
              const isSelf = part.id === currentUser.id;
              const assignedRole =
                nextMode === 'online'
                  ? serverMatchRoles?.[part.id] || 'villager'
                  : serverMatchRoles?.[part.id] || deck[idx] || 'villager';
              return {
                id: part.id,
                name: isSelf ? currentUser.name : part.name,
                avatar: isSelf ? currentUser.avatar : part.avatar,
                roleId: assignedRole,
                isAlive: true,
                isHost: Boolean(part.isHost),
                isBot: Boolean(part.isBot),
                hat: isSelf ? avatarConfig.hat : botLook.hat,
                cloakColor: isSelf ? avatarConfig.cloakColor : botLook.cloakColor,
                elderLives: assignedRole === 'elder' ? 2 : undefined,
              };
            })
          : [
              {
                id: currentUser.id,
                name: currentUser.name,
                avatar: currentUser.avatar,
                roleId: deck[0],
                isAlive: true,
                isHost: true,
                hat: avatarConfig.hat,
                cloakColor: avatarConfig.cloakColor,
                elderLives: deck[0] === 'elder' ? 2 : undefined,
              },
              ...Array.from({ length: count - 1 }).map((_, i) => {
                const botLook = getBotCosmetics(i);
                return {
                  id: `bot_${i + 1}`,
                  name: BOT_NAMES[i % BOT_NAMES.length],
                  avatar: BOT_AVATARS[i % BOT_AVATARS.length],
                  roleId: deck[i + 1],
                  isAlive: true,
                  isBot: true,
                  hat: botLook.hat,
                  cloakColor: botLook.cloakColor,
                  elderLives: deck[i + 1] === 'elder' ? 2 : undefined,
                };
              }),
            ];

      const initialMayorId = electMayorForVillage(
        rawPlayers,
        rawPlayers[Math.floor(Math.random() * rawPlayers.length)]?.id
      );
      const freshPlayers: Player[] = rawPlayers.map((p) => ({
        ...p,
        isMayor: Boolean(initialMayorId && p.id === initialMayorId),
      }));

      resetMatchUiState();
      setMayorId(initialMayorId);
      setKnownWolfIds([]);
      setWolfPupFrenzy(false);
      setElderSealActive(false);
      setVotes([]);
      setHasVoted(false);
      setActiveHunter(null);
      setGameResult(null);
      setLastDawnAnnouncement(null);
      setPendingNightTransition(null);
      setPendingDawnContext(null);
      setPendingDuskBeforePlayers(null);
      setSuspectTags({});
      setShowAvatarLocker(false);
      setIsRoleCardInitialOpen(autoOpenRoleCard);
      setShowMyRoleModal(autoOpenRoleCard);
      setEmoteEvents([]);
      setIsUserRoaming(false);
      setAimedOwnSeat(false);
      setNotebook(createInitialNotebook());
      setLobbyModalState({ isOpen: false, mode: 'online' });
      clearSavedAIMatchSnapshot();
      setSavedMatchSnapshot(null);

      if (nextMode === 'online') {
        setPlayers(freshPlayers);
        setRound(1);
        setPhase('night');
        setNightStepIndex(0);
        setTimerSeconds(serverTimerConfig?.nightActionSec ?? timerConfig.nightActionSec);
        setHasInspectedTonight(false);
        setHasClosedEyesTonight(false);
        setActivePropTool(null);
        setSelectedTargetId(null);
        setSecondWolfTargetId(null);
        setTonightWolfVictimId(null);
        setGuardTargetTonightId(null);
        setWitchHealTargetTonightId(null);
        setWitchPoisonTargetId(null);
        setSeerTargetTonightId(null);
        setSeerInspectResult(null);
        setCupidLovers(null);
        setDoppelgangerTargetId(null);
        setShellState('playing');
      } else {
        beginNewNight(freshPlayers, 1, false, []);
        setShellState('playing');
      }

      const myAssignedPlayer =
        freshPlayers.find((p) => p.id === currentUser.id) || freshPlayers[0];
      const assignedDef = ROLES[myAssignedPlayer.roleId];
      const introMsg: ChatMessage = {
        id: `gm_start_${Date.now()}`,
        senderId: 'sys',
        senderName: '🤖 Quản Trò Máy',
        text:
          lang === 'vi'
            ? `🤖 Quản Trò Máy: Ván đấu ${count} người bắt đầu! Vai trò bí mật của bạn là ${assignedDef.name.vi}.`
            : `🤖 Auto-GM: ${count}-player match started! Your secret role is ${assignedDef.name[lang]}.`,
        timestamp: Date.now(),
        isSystem: true,
      };
      if (nextMode === 'online' && initialChatMessages && initialChatMessages.length > 0) {
        setMessages(
          [...initialChatMessages, introMsg].sort((a, b) => a.timestamp - b.timestamp)
        );
      } else {
        setMessages([introMsg]);
      }
      setEventBanner(
        `${t.nightPhaseTitle(1)} · ${assignedDef.name[lang]}: ${assignedDef.instructions[lang]}`
      );

      if (nextMode === 'online') {
        const cached =
          lastReceivedMatchStateRef.current?.code === effectiveRoomCode
            ? lastReceivedMatchStateRef.current
            : null;
        if (initialMatchView) {
          applyOnlineMatchView(initialMatchView, initialServerNow);
        } else if (cached) {
          applyOnlineMatchView(cached.view, cached.serverNow);
        }
      }
    },
    [
      currentUser,
      avatarConfig,
      gameMode,
      roomId,
      villageSize,
      preferredRole,
      timerConfig.nightActionSec,
      beginNewNight,
      applyOnlineMatchView,
      resetMatchUiState,
      t,
      lang,
    ]
  );

  // Finish Game & Freeze Snapshot
  const finishGame = useCallback(
    (winner: string, reason: string, finalPlayers: Player[], currentRound: number) => {
      sound.playVictory();
      confetti({ particleCount: 100, spread: 75 });
      const finalMe = finalPlayers.find((p) => p.id === currentUser.id) || me;
      const userSide = ROLES[finalMe.roleId].faction;
      const didUserWin =
        (winner === 'villagers' && userSide === 'villager') ||
        (winner === 'werewolves' && userSide === 'werewolf') ||
        (winner === 'tanner' && finalMe.roleId === 'tanner') ||
        (winner === 'lovers' && Boolean(finalMe.loverId));

      const eloDelta = winner === 'draw' ? 0 : didUserWin ? 28 : -14;
      const nextElo = Math.max(1000, currentUser.elo + eloDelta);
      const nextMatches = (currentUser.matchesPlayed || 0) + 1;
      const nextWins = (currentUser.wins || 0) + (didUserWin ? 1 : 0);
      const updatedUser: UserProfileData = {
        ...currentUser,
        elo: nextElo,
        matchesPlayed: nextMatches,
        wins: nextWins,
      };
      setCurrentUser(updatedUser);
      localStorage.setItem('werewolf_user', JSON.stringify(updatedUser));

      if (currentUser.provider && currentUser.provider !== 'guest' && currentUser.handle) {
        if (authToken) {
          fetch('/api/accounts/update', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${authToken}`,
            },
            body: JSON.stringify({
              username: currentUser.handle,
              elo: nextElo,
              matchesPlayed: nextMatches,
              wins: nextWins,
            }),
          }).catch(() => {});
        }

        syncAuthenticatedPlayerAccountToFirestore({
          username: currentUser.handle,
          displayName: currentUser.name,
          avatar: currentUser.avatar,
          region: (currentUser.region as 'VN' | 'SEA' | 'GLOBAL') || 'VN',
          elo: nextElo,
          matchesPlayed: nextMatches,
          wins: nextWins,
        }).catch(() => {});
      }

      clearSavedAIMatchSnapshot();
      setSavedMatchSnapshot(null);
      setPhase('game_over');
      setShellState('gameover');
      setGameResult({
        winner,
        reason,
        rounds: currentRound,
        eloDelta,
        survivors: finalPlayers.filter((p) => p.isAlive).length,
      });
      setEventBanner(reason);

      addMatchHistory({
        id: 'match_' + Date.now(),
        roomId,
        date: new Date().toLocaleString(),
        winner: winner as any,
        rounds: currentRound,
        playersCount: finalPlayers.length,
        mvp: currentUser.name,
        roster: finalPlayers.map((p) => ({
          name: p.name,
          roleId: p.roleId,
          isAlive: p.isAlive,
        })),
      });
    },
    [currentUser, me, roomId, authToken]
  );

  // Resolve Night Actions -> Transition to Day with Authentic Real-Life GM Morning Briefing
  const handleResolveNight = useCallback(() => {
    const beforeNightPlayers = players;
    const livingWitches = players.filter(
      (p) => p.roleId === 'witch' && p.isAlive && !p.hasUsedPower
    );

    // Ensure every remaining non-human bot step runs via rule-compliant Auto-GM logic
    let wolfTarget =
      me.roleId === 'werewolf' || me.roleId === 'wolf_pup'
        ? tonightWolfVictimId || selectedTargetId
        : tonightWolfVictimId;
    let secondTarget = secondWolfTargetId;
    let guardTarget =
      me.roleId === 'bodyguard' && !me.hasUsedPower
        ? guardTargetTonightId || selectedTargetId
        : guardTargetTonightId;
    let resolvedCupidLovers: [string, string] | null =
      round === 1 && cupidLovers && cupidLovers[0] && cupidLovers[1]
        ? cupidLovers
        : null;
    let resolvedDoppelTarget: string | null =
      round === 1
        ? doppelgangerTargetId || (me.roleId === 'doppelganger' ? selectedTargetId : null)
        : null;
    let resolvedSeerTarget =
      seerTargetTonightId || (me.roleId === 'seer' && !me.hasUsedPower ? selectedTargetId : null);

    let witchHeal =
      livingWitches.length > 0 && !livingWitches[0].hasUsedHeal && witchHealTargetTonightId
        ? witchHealTargetTonightId
        : null;
    let witchPoison =
      livingWitches.length > 0 && !livingWitches[0].hasUsedPoison
        ? witchPoisonTargetId
        : null;

    const botStepOpts = {
      round,
      wolfPupFrenzy,
      humanPlayerId: me.id,
      knownWolfIdsByBotSeer: knownWolfIds,
      suspectedIds: getPublicSuspectedIds(players),
    };

    if (round === 1 && !resolvedDoppelTarget && me.roleId !== 'doppelganger') {
      const act = computeAutoGMBotNightStepAction('doppelganger', players, {}, botStepOpts);
      if (act.doppelgangerTargetId) resolvedDoppelTarget = act.doppelgangerTargetId;
    }
    if (round === 1 && !resolvedCupidLovers && me.roleId !== 'cupid') {
      const act = computeAutoGMBotNightStepAction('cupid', players, {}, botStepOpts);
      if (act.cupidLovers) resolvedCupidLovers = act.cupidLovers;
    }
    // Canonical #15 Bodyguard runs before #20 Werewolves & #30 Witch so Witch sees accurate dying victims
    if (!guardTarget && me.roleId !== 'bodyguard') {
      const act = computeAutoGMBotNightStepAction('bodyguard', players, {}, botStepOpts);
      if (act.guardTargetId) guardTarget = act.guardTargetId;
    }
    const isHumanLivingWolf =
      me.isAlive && (me.roleId === 'werewolf' || me.roleId === 'wolf_pup');
    if (!isHumanLivingWolf && (!wolfTarget || (wolfPupFrenzy && !secondTarget))) {
      const act = computeAutoGMBotNightStepAction(
        'werewolf',
        players,
        { wolfTargetId: wolfTarget, secondWolfTargetId: secondTarget },
        botStepOpts
      );
      if (!wolfTarget && act.wolfTargetId) wolfTarget = act.wolfTargetId;
      if (wolfPupFrenzy && !secondTarget && act.secondWolfTargetId) {
        secondTarget = act.secondWolfTargetId;
      }
      if (!wolfTarget) {
        const fallbackPrey = players.filter(
          (p) => p.isAlive && p.roleId !== 'werewolf' && p.roleId !== 'wolf_pup'
        );
        if (fallbackPrey.length > 0) {
          wolfTarget = fallbackPrey[Math.floor(Math.random() * fallbackPrey.length)].id;
        }
      }
    }
    if (
      me.roleId !== 'witch' &&
      !botWitchActedTonightRef.current &&
      livingWitches.length > 0 &&
      !livingWitches[0].hasUsedPower &&
      !witchHeal &&
      !witchPoison
    ) {
      botWitchActedTonightRef.current = true;
      const act = computeAutoGMBotNightStepAction(
        'witch',
        players,
        {
          wolfTargetId: wolfTarget,
          secondWolfTargetId: secondTarget,
          guardTargetId: guardTarget,
        },
        botStepOpts
      );
      if (act.witchHealTargetId) witchHeal = act.witchHealTargetId;
      if (act.witchPoisonTargetId) witchPoison = act.witchPoisonTargetId;
    }
    if (!resolvedSeerTarget && me.roleId !== 'seer') {
      const act = computeAutoGMBotNightStepAction('seer', players, {}, botStepOpts);
      if (act.seerTargetId) resolvedSeerTarget = act.seerTargetId;
    }

    const actions: NightActions = {
      wolfTargetId: wolfTarget,
      secondWolfTargetId: secondTarget,
      guardTargetId: guardTarget,
      witchHealTargetId: witchHeal,
      witchPoisonTargetId: witchPoison,
      seerTargetId: resolvedSeerTarget,
      cupidLovers: resolvedCupidLovers,
      doppelgangerTargetId: resolvedDoppelTarget,
    };

    const { updatedPlayers, result } = resolveNightActions(players, actions, {
      wolfPupTriggered: wolfPupFrenzy,
      roundNumber: round,
      elderSealActive,
    });

    // Only track bot Seer's inspections AFTER night deaths — dead Bot Seer NEVER leaks telepathy!
    const isBotSeerAlive = updatedPlayers.some(
      (p) => p.roleId === 'seer' && Boolean(p.isBot) && p.isAlive
    );
    if (
      isBotSeerAlive &&
      result.seerInspection &&
      result.seerInspection.isWerewolf &&
      !knownWolfIds.includes(result.seerInspection.playerId)
    ) {
      setKnownWolfIds((prev) =>
        prev.includes(result.seerInspection!.playerId)
          ? prev
          : [...prev, result.seerInspection!.playerId]
      );
    }

    let effectivePlayers = updatedPlayers;
    let nextFrenzy = Boolean(result.wolfPupTriggeredNextNight);
    let hunterShotEvent: {
      hunterId?: string;
      hunterName: string;
      hunterSeat: number;
      targetId: string;
      targetName: string;
      targetSeat: number;
      extraLoverId?: string;
      extraLoverName?: string;
      extraLoverSeat?: number;
    } | null = null;

    setSelectedTargetId(null);
    setSecondWolfTargetId(null);
    setGuardTargetTonightId(null);
    setSeerTargetTonightId(null);
    setSeerInspectResult(null);
    setWitchHealTargetTonightId(null);
    setWitchPoisonTargetId(null);
    setRoleCalloutToast(null);
    if (round === 1 && resolvedCupidLovers) {
      setCupidLovers(resolvedCupidLovers);
    }

    if (result.triggeredHunterIds.length > 0) {
      // Process bot hunters before pausing for any human hunter in the same simultaneous wave
      const hunterQueue: string[] = [...result.triggeredHunterIds].sort((a, b) => {
        const pa = effectivePlayers.find((p) => p.id === a);
        const pb = effectivePlayers.find((p) => p.id === b);
        return Number(!pa?.isBot) - Number(!pb?.isBot);
      });
      const processedHunters = new Set<string>();
      let chainGuard = 0;
      while (hunterQueue.length > 0 && chainGuard < 6) {
        chainGuard++;
        const nextHunterId = hunterQueue.shift()!;
        if (processedHunters.has(nextHunterId)) continue;
        processedHunters.add(nextHunterId);
        const hunterPlayer = effectivePlayers.find((p) => p.id === nextHunterId);
        if (!hunterPlayer || hunterPlayer.hasUsedPower) continue;
        // Strictly DO NOT play Hunter callout toast/SFX when a Bot Hunter dies at night (anti-leak!)
        if (!hunterPlayer.isBot) {
          triggerNightRoleCallout('hunter');
          setPlayers(effectivePlayers);
          setWolfPupFrenzy(nextFrenzy);
          setPendingDawnContext({
            beforePlayers: beforeNightPlayers,
            nightKilledIds: result.killedPlayerIds,
            seerInspection: result.seerInspection ?? null,
          });
          setActiveHunter(hunterPlayer);
          setHunterOriginPhase('night');
          setPhase('hunter_revenge');
          setTimerSeconds(timerConfig.hunterShotSec);
          const killedNames = result.killedPlayerIds
            .map((id) => beforeNightPlayers.find((p) => p.id === id)?.name)
            .filter(Boolean) as string[];
          setEventBanner(
            lang === 'vi'
              ? `🎯 Đêm qua bạn (${hunterPlayer.name}) đã tử trận${
                  killedNames.length > 1 ? ` cùng ${killedNames.filter((n) => n !== hunterPlayer.name).join(', ')}` : ''
                }! Hãy chọn 1 người để nổ súng kéo theo hoặc bấm Giữ súng!`
              : `🎯 You (${hunterPlayer.name}) fell last night! Choose 1 living player for your dying Hunter shot or Hold Fire!`
          );
          sound.playDayGong();
          sound.playGhostWail();
          return;
        }
        const chatSignals = extractChatVoteSignals(messagesRef.current, effectivePlayers);
        const shotTarget = pickSmartBotHunterTarget(
          effectivePlayers,
          hunterPlayer,
          knownWolfIds,
          chatSignals
        );
        if (shotTarget) {
          const afterShot = resolveHunterShot(
            effectivePlayers,
            hunterPlayer.id,
            shotTarget.id,
            { elderSealActive }
          );
          effectivePlayers = afterShot.updatedPlayers;
          if (afterShot.wolfPupTriggeredNextNight) nextFrenzy = true;
          const hunterSeat =
            effectivePlayers.findIndex((p) => p.id === hunterPlayer.id) + 1;
          const targetSeat =
            effectivePlayers.findIndex((p) => p.id === shotTarget.id) + 1;
          const extraLover = afterShot.extraVictimId
            ? effectivePlayers.find((p) => p.id === afterShot.extraVictimId)
            : null;
          const extraLoverSeat = extraLover
            ? effectivePlayers.findIndex((p) => p.id === extraLover.id) + 1
            : undefined;
          hunterShotEvent = {
            hunterId: hunterPlayer.id,
            hunterName: hunterPlayer.name,
            hunterSeat,
            targetId: shotTarget.id,
            targetName: shotTarget.name,
            targetSeat,
            extraLoverId: extraLover?.id,
            extraLoverName: extraLover?.name,
            extraLoverSeat,
          };
          for (const chainedId of afterShot.triggeredHunterIds) {
            if (!processedHunters.has(chainedId)) hunterQueue.push(chainedId);
          }
        }
      }
    }

    const mayorCheck = mayorId
      ? resolveNextMayorIfNeeded(effectivePlayers, mayorId)
      : { nextMayorId: null };
    if (mayorCheck.nextMayorId !== mayorId) {
      setMayorId(mayorCheck.nextMayorId);
      effectivePlayers = effectivePlayers.map((p) => ({
        ...p,
        isMayor: Boolean(mayorCheck.nextMayorId && p.id === mayorCheck.nextMayorId),
      }));
    }

    setPlayers(effectivePlayers);
    setWolfPupFrenzy(nextFrenzy);

    const updatedMe = effectivePlayers.find((p) => p.id === me.id);
    const humanDiedTonight = Boolean(me.isAlive && updatedMe && !updatedMe.isAlive);
    if (humanDiedTonight) {
      setIsMicOn(false);
      setActivePropTool(null);
      setIsUserRoaming(false);
    }

    // End-of-night short film activates strictly AFTER all night saves/shields/heals/elder/cursed resolve.
    // Living players get zero leaks; dead Ghost players (Chat/Mic locked) see exact cause & killer!
    const deathRevealState = determineEndOfNightCinematic({
      beforeHuman: me,
      beforePlayers: beforeNightPlayers,
      afterPlayers: effectivePlayers,
      nightResult: result,
      hunterShotEvent,
      lang,
    });

    if (deathRevealState) {
      if (humanDiedTonight) {
        if (deathRevealState.causeType === 'witch_poison') {
          sound.playWitchCauldron();
        } else if (deathRevealState.causeType === 'cupid_lover') {
          sound.playCupidHarp();
        } else if (deathRevealState.causeType === 'hunter_shot') {
          sound.playShotgunCock();
        } else {
          sound.playDeath();
        }
        sound.playGhostWail();
      } else {
        sound.playDeath();
      }
    }

    // Build authentic, ZERO-LEAK real-life Game Master Dawn Announcement (public text stays neutral; privateNotice tells dead Ghost why they died)
    const dawnAnnouncement = enrichDawnCupidNotices(
      buildDawnGMAnnouncement({
        round,
        beforePlayers: beforeNightPlayers,
        afterPlayers: effectivePlayers,
        nightKilledIds: result.killedPlayerIds,
        hunterShotEvent,
        humanDeathReason: humanDiedTonight ? deathRevealState?.reasonText ?? null : null,
        humanPlayerId: me.id,
        lang,
      }),
      effectivePlayers,
      me.id,
      resolvedCupidLovers,
      round,
      lang
    );

    // Auto-record Dawn casualties & Mayor succession into the Agrou Deduction Notebook
    setNotebook((prevNb) => {
      let nextNb = appendNotebookTimelineEvent(prevNb, {
        round,
        phaseLabel: lang === 'vi' ? `Bình Minh #${round}` : `Dawn #${round}`,
        text: dawnAnnouncement.dayBarSummary,
        tone: dawnAnnouncement.victims.length > 0 ? 'death' : 'info',
      });
      if (mayorCheck.transferredToName) {
        nextNb = appendNotebookTimelineEvent(nextNb, {
          round,
          phaseLabel: lang === 'vi' ? 'Thị Trưởng' : 'Mayor',
          text:
            lang === 'vi'
              ? `👑 Vương miện chuyển sang ${mayorCheck.transferredToName} (x2 phiếu).`
              : `👑 Mayor crown passed to ${mayorCheck.transferredToName} (x2 vote).`,
          tone: 'mayor',
        });
      }
      return nextNb;
    });

    const gmChatMessage: ChatMessage = {
      id: `sys_dawn_${Date.now()}`,
      senderId: 'sys',
      senderName: lang === 'vi' ? '🎙️ Quản Trò AI' : '🎙️ AI Game Master',
      text: mayorCheck.transferredToName
        ? `${dawnAnnouncement.chatMessageText}\n👑 ${
            lang === 'vi'
              ? `Thị Trưởng mới: ${mayorCheck.transferredToName} (phiếu bầu x2).`
              : `New Mayor: ${mayorCheck.transferredToName} (x2 vote).`
          }`
        : dawnAnnouncement.chatMessageText,
      timestamp: Date.now(),
      isSystem: true,
    };
    setMessages((prev) => [...prev, gmChatMessage]);
    if (gameMode === 'online') {
      realtimeClient.sendChat(roomId, gmChatMessage);
    }

    const winCheck = checkWinCondition(effectivePlayers);
    if (winCheck.isOver) {
      finishGame(winCheck.winner || 'villagers', winCheck.reason, effectivePlayers, round);
      return;
    }

    setPhase('day_discussion');
    setTimerSeconds(timerConfig.dayDiscussSec);
    setEventBanner(`☀️ ${t.dayDiscussTitle(round)}: ${dawnAnnouncement.dayBarSummary}`);
    setLastDawnAnnouncement(dawnAnnouncement);

    if (deathRevealState) {
      // Show dramatic 3D Night Death Killer Reveal first, then Dawn announcement on continue!
      setNightDeathCinematic(deathRevealState);
      setPendingDawnAfterDeath(dawnAnnouncement);
    } else {
      setGmAnnouncement(dawnAnnouncement);
      sound.playGMAnnouncement(
        'dawn',
        dawnAnnouncement.victims.length > 0,
        dawnAnnouncement.spokenNarration,
        lang
      );
    }

    // AI Bots actively discuss clues & suspects during Day Discussion using ONLY public dawn victims & bot Seer's own info
    const publicKilledNames = dawnAnnouncement.victims.map((v) => v.name);
    const botDiscussionLines = buildBotDayDiscussionLines(
      effectivePlayers,
      publicKilledNames,
      lang,
      isBotSeerAlive ? result.seerInspection : null,
      round
    );
    if (botDiscussionLines.length > 0) {
      const now = Date.now();
      setMessages((prev) => [
        ...prev,
        ...botDiscussionLines.map((line, idx) => ({
          id: `bot_chat_${now}_${idx}`,
          senderId: line.senderId,
          senderName: line.senderName,
          text: line.text,
          timestamp: now + idx + 1,
        })),
      ]);
    }

    // Visual 3D prop teasing & expressive Agrou campfire emote between bots
    const aliveBots = effectivePlayers.filter((p) => p.isBot && p.isAlive);
    if (aliveBots.length >= 2) {
      const botPick = aliveBots[Math.floor(Math.random() * aliveBots.length)];
      const otherBot = aliveBots.find((b) => b.id !== botPick.id) || aliveBots[0];
      const scheduledMatchId = matchInstanceIdRef.current;
      if (botPropTimeoutRef.current !== null) {
        window.clearTimeout(botPropTimeoutRef.current);
      }
      botPropTimeoutRef.current = window.setTimeout(() => {
        botPropTimeoutRef.current = null;
        if (
          phaseRef.current !== 'day_discussion' ||
          matchInstanceIdRef.current !== scheduledMatchId
        ) {
          return;
        }
        handleThrowProp(botPick.id, otherBot.id, round % 2 === 0 ? 'egg' : 'tomato');
        handleTriggerEmote(dawnAnnouncement.victims.length > 0 ? 'panic' : 'wave', otherBot.id);
      }, 900);
    }
  }, [
    players,
    me,
    mayorId,
    selectedTargetId,
    secondWolfTargetId,
    tonightWolfVictimId,
    guardTargetTonightId,
    seerTargetTonightId,
    doppelgangerTargetId,
    knownWolfIds,
    wolfPupFrenzy,
    elderSealActive,
    witchHealTargetTonightId,
    witchPoisonTargetId,
    cupidLovers,
    round,
    gameMode,
    roomId,
    finishGame,
    triggerNightRoleCallout,
    handleThrowProp,
    handleTriggerEmote,
    getPublicSuspectedIds,
    enrichDawnCupidNotices,
    timerConfig,
    t,
    lang,
  ]);

  // Step-by-step Night Progression moderated by Quản Trò Máy (or Host-only server advance in Online mode)
  const handleAdvanceNightStep = useCallback(() => {
    if (phase !== 'night') return;
    if (gameMode === 'online') {
      if (!me.isHost) return;
      realtimeClient.sendAdvancePhase(roomId);
      return;
    }
    const nextIdx = nightStepIndex + 1;
    if (nextIdx < nightSchedule.length) {
      const nextStep = nightSchedule[nextIdx] || null;
      const nextTimer = getStepInitialTimerSeconds(nextStep, myNightStepIdx, nextIdx);
      setHasClosedEyesTonight(false);
      setSelectedTargetId(null);
      setTimerSeconds(nextTimer);
      setNightStepIndex(nextIdx);
    } else {
      handleResolveNight();
    }
  }, [phase, gameMode, me.isHost, roomId, nightStepIndex, nightSchedule, myNightStepIdx, handleResolveNight]);

  // Confirm Night Action (Server-authoritative `confirm_done` in Online mode; local resolve in AI Practice)
  const handleConfirmNightAction = useCallback(() => {
    if (
      phase === 'night' &&
      me.isAlive &&
      me.roleId === 'cupid' &&
      currentNightStep?.key === 'cupid' &&
      !(cupidLovers && cupidLovers[0] && cupidLovers[1] && cupidLovers[0] !== cupidLovers[1])
    ) {
      const picked = (cupidLovers || []).filter(Boolean).length;
      showActionWarning(
        lang === 'vi'
          ? `💘 Hãy chọn đủ 2 Tình Nhân khác nhau trước khi xác nhận (${picked}/2)!`
          : `💘 Please select 2 distinct Lovers before confirming (${picked}/2)!`
      );
      return;
    }
    if (gameMode === 'online') {
      if (onlineMatchView?.hasConfirmedNightStep) return;
      sound.playCardFlip();
      realtimeClient.sendNightAction(roomId, { actionType: 'confirm_done' });
      setEventBanner(
        lang === 'vi'
          ? '✓ Đã xác nhận — đang chờ người chơi khác...'
          : '✓ Confirmed — waiting for other players...'
      );
      return;
    }
    handleResolveNight();
  }, [
    phase,
    me.isAlive,
    me.roleId,
    currentNightStep?.key,
    cupidLovers,
    showActionWarning,
    gameMode,
    onlineMatchView?.hasConfirmedNightStep,
    roomId,
    lang,
    handleResolveNight,
  ]);

  // Jump directly to the human player's waking night step (AI Practice only — never skips other humans in Online mode!)
  const handleJumpToMyNightTurn = useCallback(() => {
    if (phase !== 'night' || gameMode === 'online') return;
    sound.playCardFlip();
    if (myNightStepIdx !== -1 && myNightStepIdx !== nightStepIndex) {
      // Simulate any intermediate bot steps so Witch/Seer/etc. have accurate wolfTargetId
      let simWolfTarget = tonightWolfVictimId;
      let simSecondTarget = secondWolfTargetId;
      let simGuardTarget = guardTargetTonightId;
      let simWitchHeal = witchHealTargetTonightId;
      let simWitchPoison = witchPoisonTargetId;
      let simLovers = cupidLovers;
      let simDoppel = doppelgangerTargetId;
      const suspectedIds = getPublicSuspectedIds(players);

      const startIdx = Math.min(nightStepIndex, myNightStepIdx);
      for (let i = startIdx; i < myNightStepIdx; i++) {
        const step = nightSchedule[i];
        if (!step) continue;
        if (step.key === 'witch') {
          botWitchActedTonightRef.current = true;
        }
        const botAct = computeAutoGMBotNightStepAction(
          step.key,
          players,
          {
            wolfTargetId: simWolfTarget,
            secondWolfTargetId: simSecondTarget,
            guardTargetId: simGuardTarget,
            witchHealTargetId: simWitchHeal,
            witchPoisonTargetId: simWitchPoison,
            cupidLovers: simLovers,
            doppelgangerTargetId: simDoppel,
          },
          {
            round,
            wolfPupFrenzy,
            humanPlayerId: me.id,
            knownWolfIdsByBotSeer: knownWolfIds,
            suspectedIds,
          }
        );
        if (botAct.wolfTargetId) simWolfTarget = botAct.wolfTargetId;
        if (botAct.secondWolfTargetId) simSecondTarget = botAct.secondWolfTargetId;
        if (botAct.guardTargetId) simGuardTarget = botAct.guardTargetId;
        if (botAct.witchHealTargetId) simWitchHeal = botAct.witchHealTargetId;
        if (botAct.witchPoisonTargetId) simWitchPoison = botAct.witchPoisonTargetId;
        if (botAct.cupidLovers) simLovers = botAct.cupidLovers;
        if (botAct.doppelgangerTargetId) simDoppel = botAct.doppelgangerTargetId;
      }

      if (simWolfTarget) setTonightWolfVictimId(simWolfTarget);
      if (simSecondTarget) setSecondWolfTargetId(simSecondTarget);
      if (simGuardTarget) setGuardTargetTonightId(simGuardTarget);
      if (simWitchHeal) setWitchHealTargetTonightId(simWitchHeal);
      if (simWitchPoison) setWitchPoisonTargetId(simWitchPoison);
      if (simLovers) setCupidLovers(simLovers);
      if (simDoppel) setDoppelgangerTargetId(simDoppel);

      setHasClosedEyesTonight(false);
      setNightStepIndex(myNightStepIdx);
    } else if (myNightStepIdx === nightStepIndex) {
      setHasClosedEyesTonight(false);
      setTimerSeconds(timerConfig.nightActionSec);
    } else {
      handleResolveNight();
    }
  }, [
    phase,
    myNightStepIdx,
    nightStepIndex,
    nightSchedule,
    players,
    tonightWolfVictimId,
    secondWolfTargetId,
    guardTargetTonightId,
    witchHealTargetTonightId,
    witchPoisonTargetId,
    cupidLovers,
    doppelgangerTargetId,
    round,
    wolfPupFrenzy,
    me.id,
    knownWolfIds,
    getPublicSuspectedIds,
    timerConfig.nightActionSec,
    handleResolveNight,
    gameMode,
  ]);

  // Enter Day Voting Phase & generate rule-compliant smart bot votes (or Host-only server advance in Online mode)
  const handleStartDayVoting = useCallback(() => {
    if (gameMode === 'online') {
      if (!me.isHost) {
        setEventBanner(
          lang === 'vi'
            ? '⏳ Chỉ Chủ phòng mới có thể chuyển sang Bỏ Phiếu sớm!'
            : '⏳ Only the Room Host can advance to Voting early!'
        );
        return;
      }
      realtimeClient.sendAdvancePhase(roomId);
      return;
    }
    sound.playGavel();
    isResolvingVoteRef.current = false;
    setActivePropTool(null);
    setActiveToolPopover('none');
    setSecondWolfTargetId(null);
    setPhase('day_voting');
    setTimerSeconds(timerConfig.dayVoteSec);
    setVotes([]);
    setHasVoted(false);
    setSelectedTargetId(null);
    setEventBanner(
      lang === 'vi'
        ? `🤖 Quản Trò Máy: ⚖️ ${t.dayVoteTitle(round)} — Chọn duy nhất 1 người để bỏ phiếu treo cổ!`
        : `🤖 Auto-GM: ⚖️ ${t.dayVoteTitle(round)}`
    );

    const scheduledMatchId = matchInstanceIdRef.current;
    if (botVoteTimeoutRef.current !== null) {
      window.clearTimeout(botVoteTimeoutRef.current);
    }
    botVoteTimeoutRef.current = window.setTimeout(() => {
      botVoteTimeoutRef.current = null;
      if (
        phaseRef.current !== 'day_voting' ||
        matchInstanceIdRef.current !== scheduledMatchId
      ) {
        return;
      }
      const currentPlayers = playersRef.current;
      const chatSignals = extractChatVoteSignals(messagesRef.current, currentPlayers);
      const botVotes = computeSmartBotDayVotes(currentPlayers, knownWolfIds, null, chatSignals);
      const botIdSet = new Set(currentPlayers.filter((p) => p.isBot).map((p) => p.id));
      setVotes((prev) => [
        ...prev.filter((v) => !botIdSet.has(v.voterId)),
        ...botVotes,
      ]);
    }, 900);
  }, [gameMode, me.isHost, roomId, t, round, lang, knownWolfIds, timerConfig.dayVoteSec]);

  // Clear human player's current day vote so they can choose a different suspect
  const handleClearMyVote = useCallback(() => {
    if (phase !== 'day_voting' || !me.isAlive) return;
    sound.playCardFlip();
    setSelectedTargetId(null);
    setHasVoted(false);
    setVotes((prev) => castSingleDayVote(prev, me.id, null));
    if (gameMode === 'online') {
      realtimeClient.sendVote(roomId, me.id, '');
    }
    setEventBanner(
      lang === 'vi'
        ? '⚖️ Đã hủy lựa chọn — hãy chọn 1 người hoặc bấm Lửa Trại để bỏ phiếu trắng!'
        : '⚖️ Vote cleared — select 1 player or click the Campfire to abstain!'
    );
  }, [phase, me.isAlive, me.id, gameMode, roomId, lang]);

  // Agrou-style Campfire Abstention Vote (Click 3D Campfire or DayActionBar button)
  const handleVoteCampfireAbstain = useCallback(() => {
    if (phase !== 'day_voting' || !me.isAlive) return;
    sound.playCardFlip();
    if (selectedTargetId === CAMPFIRE_ABSTAIN_ID) {
      setSelectedTargetId(null);
      setHasVoted(false);
      setVotes((prev) => castSingleDayVote(prev, me.id, null));
      if (gameMode === 'online') {
        realtimeClient.sendVote(roomId, me.id, '');
      }
      setEventBanner(
        lang === 'vi'
          ? '🔥 Đã hủy phiếu trắng — bạn có thể chọn nghi phạm khác!'
          : '🔥 Abstention cleared — you can pick another suspect!'
      );
      return;
    }
    setSelectedTargetId(CAMPFIRE_ABSTAIN_ID);
    setHasVoted(true);
    setVotes((prev) => castSingleDayVote(prev, me.id, CAMPFIRE_ABSTAIN_ID));
    if (gameMode === 'online') {
      realtimeClient.sendVote(roomId, me.id, CAMPFIRE_ABSTAIN_ID);
    }
    setEventBanner(
      lang === 'vi'
        ? '🔥 Bạn đã bỏ phiếu trắng vào Lửa Trại (không treo cổ ai)!'
        : '🔥 You cast an Abstain vote into the Campfire!'
    );
  }, [phase, me.isAlive, me.id, selectedTargetId, gameMode, roomId, lang]);

  // Resolve Day Voting -> Show Authentic GM Dusk Verdict before entering Next Night (or Host-only server advance in Online mode)
  const handleResolveDayVoting = useCallback(
    (overrideVotes?: VoteRecord[]) => {
      if (gameMode === 'online') {
        if (!me.isHost) {
          setEventBanner(
            lang === 'vi'
              ? '⏳ Chỉ Chủ phòng mới có thể chốt phiếu sớm!'
              : '⏳ Only the Room Host can close voting early!'
          );
          return;
        }
        realtimeClient.sendAdvancePhase(roomId);
        return;
      }
      if (
        phaseRef.current !== 'day_voting' ||
        isResolvingVoteRef.current ||
        Boolean(gmAnnouncement)
      ) {
        return;
      }
      isResolvingVoteRef.current = true;

      const beforeVotePlayers = players;
      let activeVotes = overrideVotes || votes;
      // Flush pending 900ms bot votes synchronously if player locked vote early (BUG-27)
      if (botVoteTimeoutRef.current !== null) {
        window.clearTimeout(botVoteTimeoutRef.current);
        botVoteTimeoutRef.current = null;
        const chatSignals = extractChatVoteSignals(messagesRef.current, beforeVotePlayers);
        const botVotes = computeSmartBotDayVotes(beforeVotePlayers, knownWolfIds, null, chatSignals);
        const botIdSet = new Set(beforeVotePlayers.filter((p) => p.isBot).map((p) => p.id));
        activeVotes = [
          ...activeVotes.filter((v) => !botIdSet.has(v.voterId)),
          ...botVotes,
        ];
        setVotes(activeVotes);
      }
      const tally = tallyVotesWithMayor(activeVotes, mayorId);
      const playerTargetVotes = activeVotes.filter((v) => v.targetId !== CAMPFIRE_ABSTAIN_ID);

      if (tally.isTie || !tally.targetId) {
        const tieAnnouncement = enrichDuskAnnouncementVotes(
          buildDuskGMAnnouncement({
            round,
            beforePlayers: beforeVotePlayers,
            afterPlayers: beforeVotePlayers,
            lynchedVictim: null,
            voteCounts: tally.counts,
            votes: playerTargetVotes,
            isTie: true,
            humanPlayerId: me.id,
            lang,
          }),
          activeVotes,
          beforeVotePlayers,
          mayorId,
          lang
        );
        setNotebook((prevNb) =>
          appendNotebookTimelineEvent(prevNb, {
            round,
            phaseLabel: lang === 'vi' ? `Hoàng Hôn #${round}` : `Dusk #${round}`,
            text:
              lang === 'vi'
                ? `⚖️ Không ai bị treo cổ (${tally.abstainCount > 0 ? `${tally.abstainCount} phiếu trắng` : 'hòa phiếu'}).`
                : `⚖️ No execution (${tally.abstainCount > 0 ? `${tally.abstainCount} abstain` : 'tied vote'}).`,
            tone: 'info',
          })
        );
        const tieMsg: ChatMessage = {
          id: `tie_${Date.now()}`,
          senderId: 'sys',
          senderName: lang === 'vi' ? '🎙️ Quản Trò AI' : '🎙️ AI Game Master',
          text: tieAnnouncement.chatMessageText,
          timestamp: Date.now(),
          isSystem: true,
        };
        setMessages((prev) => [...prev, tieMsg]);
        setEventBanner(tieAnnouncement.headline);
        setPendingNightTransition({
          nextPlayers: beforeVotePlayers,
          nextRound: round + 1,
          nextFrenzy: wolfPupFrenzy,
        });
        setGmAnnouncement(tieAnnouncement);
        sound.playGMAnnouncement('dusk', false, tieAnnouncement.spokenNarration, lang);
        return;
      }

      const victim = beforeVotePlayers.find((p) => p.id === tally.targetId);
      if (!victim) {
        isResolvingVoteRef.current = false;
        return;
      }

      const {
        updatedPlayers,
        wolfPupTriggeredNextNight,
        triggeredHunterIds,
        elderLynchedPenalty,
      } = applyDayLynch(beforeVotePlayers, victim.id, { elderSealActive });

      const nextElderSealActive = elderSealActive || elderLynchedPenalty;
      if (elderLynchedPenalty) {
        setElderSealActive(true);
      }

      let effectivePlayers = updatedPlayers;
      let nextFrenzy = Boolean(wolfPupTriggeredNextNight || wolfPupFrenzy);
      let hunterShotEvent: {
        hunterName: string;
        hunterSeat: number;
        targetId: string;
        targetName: string;
        targetSeat: number;
      } | null = null;

      if (victim.roleId === 'tanner') {
        setPlayers(effectivePlayers);
        finishGame(
          'tanner',
          `${victim.name} (${ROLES.tanner.name[lang]}) — ${t.winTanner}`,
          effectivePlayers,
          round
        );
        return;
      }

      if (triggeredHunterIds.length > 0) {
        triggerNightRoleCallout('hunter');
        const hunterQueue: string[] = [...triggeredHunterIds].sort((a, b) => {
          const pa = effectivePlayers.find((p) => p.id === a);
          const pb = effectivePlayers.find((p) => p.id === b);
          return Number(!pa?.isBot) - Number(!pb?.isBot);
        });
        const processedHunters = new Set<string>();
        let chainGuard = 0;
        while (hunterQueue.length > 0 && chainGuard < 6) {
          chainGuard++;
          const nextHunterId = hunterQueue.shift()!;
          if (processedHunters.has(nextHunterId)) continue;
          processedHunters.add(nextHunterId);
          const hunter = effectivePlayers.find((p) => p.id === nextHunterId);
          if (!hunter || hunter.hasUsedPower) continue;
          if (!hunter.isBot) {
            setPlayers(effectivePlayers);
            if (nextFrenzy) setWolfPupFrenzy(true);
            setPendingDuskBeforePlayers(beforeVotePlayers);
            setActiveHunter(hunter);
            setHunterOriginPhase('day_voting');
            setPhase('hunter_revenge');
            setTimerSeconds(timerConfig.hunterShotSec);
            setEventBanner(`🎯 ${t.hunterPhaseTitle}: ${ROLES.hunter.instructions[lang]}`);
            sound.playGavel();
            sound.playGhostWail();
            return;
          }
          const chatSignals = extractChatVoteSignals(messagesRef.current, effectivePlayers);
          const target = pickSmartBotHunterTarget(
            effectivePlayers,
            hunter,
            knownWolfIds,
            chatSignals
          );
          if (target) {
            const shotRes = resolveHunterShot(effectivePlayers, hunter.id, target.id, {
              elderSealActive: nextElderSealActive,
            });
            effectivePlayers = shotRes.updatedPlayers;
            if (shotRes.wolfPupTriggeredNextNight) nextFrenzy = true;
            hunterShotEvent = {
              hunterName: hunter.name,
              hunterSeat: effectivePlayers.findIndex((p) => p.id === hunter.id) + 1,
              targetId: target.id,
              targetName: target.name,
              targetSeat: effectivePlayers.findIndex((p) => p.id === target.id) + 1,
            };
            for (const chainedId of shotRes.triggeredHunterIds) {
              if (!processedHunters.has(chainedId)) hunterQueue.push(chainedId);
            }
          }
        }
      }

      const mayorCheck = mayorId
        ? resolveNextMayorIfNeeded(effectivePlayers, mayorId)
        : { nextMayorId: null };
      if (mayorCheck.nextMayorId !== mayorId) {
        setMayorId(mayorCheck.nextMayorId);
        effectivePlayers = effectivePlayers.map((p) => ({
          ...p,
          isMayor: Boolean(mayorCheck.nextMayorId && p.id === mayorCheck.nextMayorId),
        }));
      }

      setPlayers(effectivePlayers);
      setWolfPupFrenzy(nextFrenzy);

      const updatedMe = effectivePlayers.find((p) => p.id === me.id);
      if (me.isAlive && updatedMe && !updatedMe.isAlive) {
        sound.playGhostWail();
      }

      const duskAnnouncement = enrichDuskAnnouncementVotes(
        buildDuskGMAnnouncement({
          round,
          beforePlayers: beforeVotePlayers,
          afterPlayers: effectivePlayers,
          lynchedVictim: victim,
          voteCounts: tally.counts,
          votes: playerTargetVotes,
          isTie: false,
          elderLynchedPenalty,
          hunterShotEvent,
          humanPlayerId: me.id,
          lang,
        }),
        activeVotes,
        beforeVotePlayers,
        mayorId,
        lang
      );

      setNotebook((prevNb) => {
        let nextNb = appendNotebookTimelineEvent(prevNb, {
          round,
          phaseLabel: lang === 'vi' ? `Hoàng Hôn #${round}` : `Dusk #${round}`,
          text:
            lang === 'vi'
              ? `⚖️ ${victim.name} bị treo cổ (${tally.counts[victim.id] || 0} phiếu).`
              : `⚖️ ${victim.name} was eliminated (${tally.counts[victim.id] || 0} votes).`,
          tone: 'death',
        });
        if (mayorCheck.transferredToName) {
          nextNb = appendNotebookTimelineEvent(nextNb, {
            round,
            phaseLabel: lang === 'vi' ? 'Thị Trưởng' : 'Mayor',
            text:
              lang === 'vi'
                ? `👑 Vương miện Thị Trưởng chuyển sang ${mayorCheck.transferredToName}.`
                : `👑 Mayor crown passed to ${mayorCheck.transferredToName}.`,
            tone: 'mayor',
          });
        }
        return nextNb;
      });

      const duskMsg: ChatMessage = {
        id: `lynch_${Date.now()}`,
        senderId: 'sys',
        senderName: lang === 'vi' ? '🎙️ Quản Trò AI' : '🎙️ AI Game Master',
        text: mayorCheck.transferredToName
          ? `${duskAnnouncement.chatMessageText}\n👑 ${
              lang === 'vi'
                ? `Thị Trưởng mới: ${mayorCheck.transferredToName} (phiếu bầu x2).`
                : `New Mayor: ${mayorCheck.transferredToName} (x2 vote).`
            }`
          : duskAnnouncement.chatMessageText,
        timestamp: Date.now(),
        isSystem: true,
      };
      setMessages((prev) => [...prev, duskMsg]);

      const winCheck = checkWinCondition(effectivePlayers, victim.id);
      if (winCheck.isOver) {
        finishGame(winCheck.winner || 'villagers', winCheck.reason, effectivePlayers, round);
      } else {
        setEventBanner(duskAnnouncement.headline);
        setPendingNightTransition({
          nextPlayers: effectivePlayers,
          nextRound: round + 1,
          nextFrenzy,
        });
        setGmAnnouncement(duskAnnouncement);
        sound.playGMAnnouncement(
          'dusk',
          duskAnnouncement.victims.length > 0,
          duskAnnouncement.spokenNarration,
          lang
        );
      }
    },
    [
      votes,
      mayorId,
      players,
      me,
      round,
      wolfPupFrenzy,
      elderSealActive,
      knownWolfIds,
      gameMode,
      roomId,
      finishGame,
      triggerNightRoleCallout,
      enrichDuskAnnouncementVotes,
      gmAnnouncement,
      timerConfig.hunterShotSec,
      t,
      lang,
    ]
  );

  // Dismiss Active GM Announcement (and trigger pending transition to next Night if Dusk in local mode)
  const handleDismissGMAnnouncement = useCallback(() => {
    setGmAnnouncement(null);
    if (gameMode === 'online') return;
    if (pendingNightTransition) {
      const { nextPlayers, nextRound, nextFrenzy } = pendingNightTransition;
      setPendingNightTransition(null);
      sound.playNightBell();
      beginNewNight(nextPlayers, nextRound, nextFrenzy);
    }
  }, [gameMode, pendingNightTransition, beginNewNight]);

  // Handle clicking a 3D character in the Village Circle or Bottom Dock
  const handleSelect3DPlayer = useCallback(
    (targetId: string) => {
      const target = players.find((p) => p.id === targetId);
      if (!target) return;

      if (
        activePropTool &&
        (phase === 'day_discussion' || phase === 'day_voting')
      ) {
        if (!me.isAlive) {
          setActivePropTool(null);
          return;
        }
        if (!target.isAlive || targetId === me.id) {
          return;
        }
        handleThrowProp(me.id, targetId, activePropTool);
        return;
      }

      if (!target.isAlive) return;
      sound.playCardFlip();

      if (phase === 'hunter_revenge' && activeHunter) {
        if (targetId === activeHunter.id) return;
        if (gameMode === 'online') {
          if (!onlineMatchView?.isMyHunterTurn) return;
          sound.playShotgunCock();
          setSelectedTargetId(targetId);
          realtimeClient.sendHunterShot(roomId, targetId);
          return;
        }
        sound.playShotgunCock();
        sound.playDeath();
        const {
          updatedPlayers: shotPlayers,
          victimName,
          extraVictimId,
          wolfPupTriggeredNextNight,
          triggeredHunterIds: chainedHunterIds,
        } = resolveHunterShot(players, activeHunter.id, targetId, { elderSealActive });
        let updatedPlayers = shotPlayers;
        let nextFrenzyAfterShot = Boolean(wolfPupTriggeredNextNight || wolfPupFrenzy);

        // Chained Hunter death cascade: resolve secondary Hunter(s) before evaluating Win Condition!
        if (chainedHunterIds.length > 0) {
          const chainQueue: string[] = [...chainedHunterIds].sort((a, b) => {
            const pa = updatedPlayers.find((p) => p.id === a);
            const pb = updatedPlayers.find((p) => p.id === b);
            return Number(!pa?.isBot) - Number(!pb?.isBot);
          });
          const processedChains = new Set<string>([activeHunter.id]);
          let chainGuard = 0;
          while (chainQueue.length > 0 && chainGuard < 6) {
            chainGuard++;
            const nextChainId = chainQueue.shift()!;
            if (processedChains.has(nextChainId)) continue;
            processedChains.add(nextChainId);
            const chainedHunter = updatedPlayers.find((p) => p.id === nextChainId);
            if (!chainedHunter || chainedHunter.hasUsedPower) continue;
            if (!chainedHunter.isBot) {
              setPlayers(updatedPlayers);
              if (nextFrenzyAfterShot) setWolfPupFrenzy(true);
              setActiveHunter(chainedHunter);
              setSelectedTargetId(null);
              setTimerSeconds(timerConfig.hunterShotSec);
              setEventBanner(
                lang === 'vi'
                  ? `🎯 Chuỗi Thợ Săn! Bạn (${chainedHunter.name}) bị kéo theo — hãy chọn 1 người để nổ súng hoặc Giữ súng!`
                  : `🎯 Chained Hunter! You (${chainedHunter.name}) were hit — pick 1 target or Hold Fire!`
              );
              return;
            }
            const chainSignals = extractChatVoteSignals(messagesRef.current, updatedPlayers);
            const chainTarget = pickSmartBotHunterTarget(
              updatedPlayers,
              chainedHunter,
              knownWolfIds,
              chainSignals
            );
            if (chainTarget) {
              const chainRes = resolveHunterShot(updatedPlayers, chainedHunter.id, chainTarget.id, {
                elderSealActive,
              });
              updatedPlayers = chainRes.updatedPlayers;
              if (chainRes.wolfPupTriggeredNextNight) nextFrenzyAfterShot = true;
              for (const nextId of chainRes.triggeredHunterIds) {
                if (!processedChains.has(nextId)) chainQueue.push(nextId);
              }
            }
          }
        }

        const hunterMayorCheck = mayorId
          ? resolveNextMayorIfNeeded(updatedPlayers, mayorId)
          : { nextMayorId: null };
        if (hunterMayorCheck.nextMayorId !== mayorId) {
          setMayorId(hunterMayorCheck.nextMayorId);
          updatedPlayers = updatedPlayers.map((p) => ({
            ...p,
            isMayor: Boolean(
              hunterMayorCheck.nextMayorId && p.id === hunterMayorCheck.nextMayorId
            ),
          }));
        }
        setPlayers(updatedPlayers);
        if (nextFrenzyAfterShot) setWolfPupFrenzy(true);
        setActiveHunter(null);
        setSelectedTargetId(null);
        const winCheck = checkWinCondition(updatedPlayers);
        if (winCheck.isOver) {
          finishGame(winCheck.winner || 'villagers', winCheck.reason, updatedPlayers, round);
        } else if (hunterOriginPhase === 'night') {
          const hunterSeat = updatedPlayers.findIndex((p) => p.id === activeHunter.id) + 1;
          const targetSeat = updatedPlayers.findIndex((p) => p.id === targetId) + 1;
          const extraLover = extraVictimId
            ? updatedPlayers.find((p) => p.id === extraVictimId)
            : null;
          const dawnCtx = pendingDawnContext;
          const dawnAfterShot = buildDawnGMAnnouncement({
            round,
            beforePlayers: dawnCtx?.beforePlayers || players,
            afterPlayers: updatedPlayers,
            nightKilledIds: dawnCtx?.nightKilledIds || [activeHunter.id],
            hunterShotEvent: {
              hunterName: activeHunter.name,
              hunterSeat,
              targetId,
              targetName: victimName,
              targetSeat,
              extraLoverName: extraLover?.name,
              extraLoverSeat: extraLover
                ? updatedPlayers.findIndex((p) => p.id === extraLover.id) + 1
                : undefined,
            },
            humanPlayerId: me.id,
            lang,
          });
          setPendingDawnContext(null);
          setNotebook((prevNb) => {
            let nextNb = appendNotebookTimelineEvent(prevNb, {
              round,
              phaseLabel: lang === 'vi' ? `Bình Minh #${round}` : `Dawn #${round}`,
              text: dawnAfterShot.dayBarSummary,
              tone: dawnAfterShot.victims.length > 0 ? 'death' : 'info',
            });
            if (hunterMayorCheck.transferredToName) {
              nextNb = appendNotebookTimelineEvent(nextNb, {
                round,
                phaseLabel: lang === 'vi' ? 'Thị Trưởng' : 'Mayor',
                text:
                  lang === 'vi'
                    ? `👑 Vương miện chuyển sang ${hunterMayorCheck.transferredToName} (x2 phiếu).`
                    : `👑 Mayor crown passed to ${hunterMayorCheck.transferredToName} (x2 vote).`,
                tone: 'mayor',
              });
            }
            return nextNb;
          });
          const isBotSeerInDawn = updatedPlayers.some(
            (p) => p.roleId === 'seer' && Boolean(p.isBot) && p.isAlive
          );
          const botLines = buildBotDayDiscussionLines(
            updatedPlayers,
            dawnAfterShot.victims.map((v) => v.name),
            lang,
            isBotSeerInDawn ? dawnCtx?.seerInspection ?? null : null,
            round
          );
          const nowTs = Date.now();
          setMessages((prev) => [
            ...prev,
            {
              id: `sys_dawn_hunter_${nowTs}`,
              senderId: 'sys',
              senderName: lang === 'vi' ? '🎙️ Quản Trò AI' : '🎙️ AI Game Master',
              text: dawnAfterShot.chatMessageText,
              timestamp: nowTs,
              isSystem: true,
            },
            ...botLines.map((line, idx) => ({
              id: `bot_chat_h_${nowTs}_${idx}`,
              senderId: line.senderId,
              senderName: line.senderName,
              text: line.text,
              timestamp: nowTs + idx + 1,
            })),
          ]);
          setPhase('day_discussion');
          setTimerSeconds(timerConfig.dayDiscussSec);
          setEventBanner(`☀️ ${t.dayDiscussTitle(round)}: ${dawnAfterShot.dayBarSummary}`);
          setLastDawnAnnouncement(dawnAfterShot);
          setGmAnnouncement(dawnAfterShot);
          sound.playGMAnnouncement('dawn', true, dawnAfterShot.spokenNarration, lang);
        } else {
          const hunterSeat = updatedPlayers.findIndex((p) => p.id === activeHunter.id) + 1;
          const targetSeat = updatedPlayers.findIndex((p) => p.id === targetId) + 1;
          const duskBefore = pendingDuskBeforePlayers || players;
          const duskAfterShot = enrichDuskAnnouncementVotes(
            buildDuskGMAnnouncement({
              round,
              beforePlayers: duskBefore,
              afterPlayers: updatedPlayers,
              lynchedVictim: activeHunter,
              voteCounts: tallyVotesWithMayor(votes, mayorId).counts,
              votes: votes.filter((v) => v.targetId !== CAMPFIRE_ABSTAIN_ID),
              isTie: false,
              hunterShotEvent: {
                hunterName: activeHunter.name,
                hunterSeat,
                targetId,
                targetName: victimName,
                targetSeat,
              },
              humanPlayerId: me.id,
              lang,
            }),
            votes,
            duskBefore,
            mayorId,
            lang
          );
          setPendingDuskBeforePlayers(null);
          setMessages((prev) => [
            ...prev,
            {
              id: `sys_dusk_hunter_${Date.now()}`,
              senderId: 'sys',
              senderName: lang === 'vi' ? '🎙️ Quản Trò AI' : '🎙️ AI Game Master',
              text: duskAfterShot.chatMessageText,
              timestamp: Date.now(),
              isSystem: true,
            },
          ]);
          setPendingNightTransition({
            nextPlayers: updatedPlayers,
            nextRound: round + 1,
            nextFrenzy: nextFrenzyAfterShot,
          });
          setGmAnnouncement(duskAfterShot);
          sound.playGMAnnouncement('dusk', true, duskAfterShot.spokenNarration, lang);
        }
        return;
      }

      if (phase === 'day_voting') {
        if (!me.isAlive || targetId === me.id) return;
        // Toggle off if clicking the currently voted player; otherwise switch immediately in 1 click!
        if (selectedTargetId === targetId) {
          setSelectedTargetId(null);
          setHasVoted(false);
          setVotes((prev) => castSingleDayVote(prev, me.id, null));
          if (gameMode === 'online') {
            realtimeClient.sendVote(roomId, me.id, '');
          }
          setEventBanner(
            lang === 'vi'
              ? '⚖️ Đã hủy phiếu bầu — bạn có thể chọn người khác!'
              : '⚖️ Vote cleared — you can pick another player!'
          );
          return;
        }
        const myVoteWeight = me.id === mayorId ? 2 : 1;
        setSelectedTargetId(targetId);
        setVotes((prev) => castSingleDayVote(prev, me.id, targetId));
        setHasVoted(true);
        if (gameMode === 'online') {
          realtimeClient.sendVote(roomId, me.id, targetId);
        }
        setEventBanner(
          `⚖️ ${target.name} (+${myVoteWeight} ${t.votesUnit}${myVoteWeight === 2 ? ' 👑' : ''})`
        );
        return;
      }

      if (phase === 'night' && me.isAlive) {
        if (!isPlayerAwakeAtNight) {
          setEventBanner(`🛡️ ${t.antiCheatNightBadge}`);
          return;
        }

        // Elder Lynch Power-Loss Rule Check
        if (
          me.hasUsedPower &&
          (me.roleId === 'seer' || me.roleId === 'bodyguard' || me.roleId === 'witch')
        ) {
          setEventBanner(
            lang === 'vi'
              ? '⚠️ Quyền năng đã bị phong ấn do dân làng treo cổ nhầm Già Làng!'
              : '⚠️ Your special power is sealed because the village executed the Elder!'
          );
          return;
        }

        if (me.roleId === 'seer' && currentNightStep?.key === 'seer') {
          if (targetId === me.id) return;
          if (hasInspectedTonight) {
            setEventBanner(
              lang === 'vi'
                ? '🔮 Mỗi đêm Tiên Tri chỉ được soi 1 người duy nhất!'
                : '🔮 The Seer may only inspect 1 player per night!'
            );
            return;
          }
          // 2-step Seer confirmation: click to aim, then press "Xác Nhận Soi" to inspect
          setSeerTargetTonightId(targetId);
          setSelectedTargetId(targetId);
          setEventBanner(
            lang === 'vi'
              ? `🔮 Đã chọn ${target.name} — Bấm "Xác Nhận Soi" ở bảng điều khiển để xem phe!`
              : `🔮 Selected ${target.name} — Press "Confirm Inspect" in the console to reveal!`
          );
        } else if (
          (me.roleId === 'werewolf' || me.roleId === 'wolf_pup') &&
          currentNightStep?.key === 'werewolf'
        ) {
          if (wolfPupFrenzy && tonightWolfVictimId && tonightWolfVictimId !== targetId) {
            setSecondWolfTargetId(targetId);
            setEventBanner(`🐺 2x: ${target.name}!`);
            if (gameMode === 'online') {
              realtimeClient.sendNightAction(roomId, {
                actionType: 'wolf_second_bite',
                targetId,
              });
            }
          } else {
            setTonightWolfVictimId(targetId);
            setSelectedTargetId(targetId);
            setEventBanner(`🐺 ${target.name}!`);
            if (gameMode === 'online') {
              realtimeClient.sendNightAction(roomId, {
                actionType: 'wolf_bite',
                targetId,
              });
            }
          }
        } else if (me.roleId === 'bodyguard' && currentNightStep?.key === 'bodyguard') {
          if (target.protectedLastNight) {
            showActionWarning(
              lang === 'vi'
                ? `🛡️ Không thể bảo vệ cùng một người 2 đêm liên tiếp (${target.name})!`
                : `🛡️ Cannot protect the same player two nights in a row (${target.name})!`
            );
            return;
          }
          sound.playShieldClang();
          setGuardTargetTonightId(targetId);
          setSelectedTargetId(targetId);
          setEventBanner(`🛡️ ${target.name}!`);
          if (gameMode === 'online') {
            realtimeClient.sendNightAction(roomId, {
              actionType: 'guard',
              targetId,
            });
          }
        } else if (me.roleId === 'witch' && currentNightStep?.key === 'witch') {
          if (targetId === me.id) return;
          if (!me.hasUsedPoison) {
            sound.playWitchCauldron();
            const nextPoison = witchPoisonTargetId === targetId ? null : targetId;
            setWitchPoisonTargetId(nextPoison);
            setSelectedTargetId(nextPoison);
            if (nextPoison) setEventBanner(`🧪 ${target.name}!`);
            if (gameMode === 'online') {
              realtimeClient.sendNightAction(roomId, {
                actionType: 'witch_poison',
                targetId: nextPoison,
              });
            }
          }
        } else if (me.roleId === 'cupid' && round === 1 && currentNightStep?.key === 'cupid') {
          sound.playCupidHarp();
          if (cupidLovers && cupidLovers[0] === targetId && !cupidLovers[1]) {
            setCupidLovers(null);
            setSelectedTargetId(null);
            setEventBanner(
              lang === 'vi' ? '💘 Đã bỏ chọn — hãy chọn 2 Tình Nhân!' : '💘 Cleared — pick 2 Lovers!'
            );
          } else if (!cupidLovers || (cupidLovers[0] && cupidLovers[1])) {
            setCupidLovers([targetId, '']);
            setSelectedTargetId(targetId);
            setEventBanner(
              lang === 'vi'
                ? `💘 Đã chọn 1/2: ${target.name} — Hãy chọn thêm 1 người nữa!`
                : `💘 Selected 1/2: ${target.name} — Pick 1 more player!`
            );
          } else if (cupidLovers[0] && !cupidLovers[1] && cupidLovers[0] !== targetId) {
            const pair: [string, string] = [cupidLovers[0], targetId];
            setCupidLovers(pair);
            setSelectedTargetId(pair[0]);
            setEventBanner(`💘 2/2: ${target.name}!`);
            if (gameMode === 'online') {
              realtimeClient.sendNightAction(roomId, {
                actionType: 'cupid_link',
                targetId: pair[0],
                secondTargetId: pair[1],
              });
            }
          }
        } else if (
          me.roleId === 'doppelganger' &&
          round === 1 &&
          currentNightStep?.key === 'doppelganger'
        ) {
          if (targetId === me.id) return;
          setDoppelgangerTargetId(targetId);
          setSelectedTargetId(targetId);
          setNotebook((prevNb) =>
            appendNotebookTimelineEvent(prevNb, {
              round,
              phaseLabel: lang === 'vi' ? 'Nhân Bản' : 'Doppelgänger',
              text:
                lang === 'vi'
                  ? `🪞 Đã chọn ${target.name} làm hình mẫu sao chép vai trò.`
                  : `🪞 Selected ${target.name} as your role copy model.`,
              tone: 'clue',
            })
          );
          setEventBanner(
            lang === 'vi'
              ? `🪞 Đã chọn hình mẫu: ${target.name}!`
              : `🪞 Selected model: ${target.name}!`
          );
          if (gameMode === 'online') {
            realtimeClient.sendNightAction(roomId, {
              actionType: 'doppelganger_pick',
              targetId,
            });
          }
        }
      } else if (phase !== 'night') {
        setSelectedTargetId(targetId);
      }
    },
    [
      players,
      activePropTool,
      phase,
      me,
      activeHunter,
      selectedTargetId,
      votes,
      gameMode,
      roomId,
      onlineMatchView?.isMyHunterTurn,
      isPlayerAwakeAtNight,
      currentNightStep,
      hasInspectedTonight,
      wolfPupFrenzy,
      tonightWolfVictimId,
      witchPoisonTargetId,
      cupidLovers,
      round,
      hunterOriginPhase,
      pendingDawnContext,
      pendingDuskBeforePlayers,
      elderSealActive,
      knownWolfIds,
      finishGame,
      handleThrowProp,
      showActionWarning,
      enrichDuskAnnouncementVotes,
      timerConfig.dayDiscussSec,
      timerConfig.hunterShotSec,
      mayorId,
      t,
      lang,
    ]
  );

  // Confirm 2-step Seer inspection after selecting a target (BUG-25, BUG-27, BUG-38)
  const handleConfirmSeerInspect = useCallback(() => {
    if (
      phase !== 'night' ||
      !me.isAlive ||
      me.roleId !== 'seer' ||
      me.hasUsedPower ||
      currentNightStep?.key !== 'seer' ||
      hasInspectedTonight ||
      isSeerInspectPending
    ) {
      return;
    }
    const targetId = seerTargetTonightId || selectedTargetId;
    if (!targetId || targetId === me.id) return;
    const target = players.find((p) => p.id === targetId && p.isAlive);
    if (!target) return;

    if (gameMode === 'online') {
      setIsSeerInspectPending(true);
      sound.playMysticChime();
      triggerNightRoleCallout('seer');
      setSeerTargetTonightId(targetId);
      setSelectedTargetId(targetId);
      setEventBanner(
        lang === 'vi'
          ? `🔮 Đang soi thân phận ${target.name}...`
          : `🔮 Inspecting ${target.name}...`
      );
      realtimeClient.sendNightAction(roomId, {
        actionType: 'seer_inspect',
        targetId,
      });
      return;
    }

    setHasInspectedTonight(true);
    setSeerTargetTonightId(targetId);
    setSelectedTargetId(targetId);
    sound.playMysticChime();
    triggerNightRoleCallout('seer');
    const isWolf = target.roleId === 'werewolf' || target.roleId === 'wolf_pup';
    setSuspectTags((prev) => ({
      ...prev,
      [targetId]: isWolf ? 'wolf_suspect' : 'trusted',
    }));
    const resText = `${target.name}: ${
      isWolf ? `🐺 ${ROLES.werewolf.name[lang]}` : `🛡️ ${ROLES.villager.name[lang]}`
    }`;
    setNotebook((prevNb) => {
      const withEntry = updateNotebookPlayerEntry(prevNb, targetId, {
        trust: isWolf ? 'wolf_lock' : 'trusted',
        guessedRole: isWolf ? 'werewolf' : 'villager',
      });
      return appendNotebookTimelineEvent(withEntry, {
        round,
        phaseLabel: lang === 'vi' ? `Soi Đêm #${round}` : `Seer #${round}`,
        text: `🔮 ${resText}`,
        tone: 'clue',
      });
    });
    setSeerInspectResult(resText);
    setEventBanner(`🔮 ${resText}`);
  }, [
    phase,
    me,
    currentNightStep,
    hasInspectedTonight,
    isSeerInspectPending,
    seerTargetTonightId,
    selectedTargetId,
    players,
    round,
    lang,
    gameMode,
    roomId,
    triggerNightRoleCallout,
  ]);

  // Hunter Hold-Fire ("Giữ súng") option — skip revenge shot cleanly (BUG-24)
  const handleSkipHunterShot = useCallback(() => {
    if (phase !== 'hunter_revenge' || !activeHunter) return;
    if (gameMode === 'online') {
      if (!onlineMatchView?.isMyHunterTurn) return;
      sound.playCardFlip();
      realtimeClient.sendHunterShot(roomId, null);
      return;
    }
    sound.playCardFlip();
    const skippedHunter = activeHunter;
    const updatedAfterSkip = players.map((p) =>
      p.id === skippedHunter.id ? { ...p, hasUsedPower: true } : p
    );
    setPlayers(updatedAfterSkip);
    setActiveHunter(null);
    setSelectedTargetId(null);

    const winCheck = checkWinCondition(updatedAfterSkip);
    if (winCheck.isOver) {
      setPendingDuskBeforePlayers(null);
      setPendingDawnContext(null);
      finishGame(winCheck.winner || 'villagers', winCheck.reason, updatedAfterSkip, round);
      return;
    }

    if (hunterOriginPhase === 'night') {
      const dawnCtx = pendingDawnContext;
      const dawnAfterSkip = buildDawnGMAnnouncement({
        round,
        beforePlayers: dawnCtx?.beforePlayers || updatedAfterSkip,
        afterPlayers: updatedAfterSkip,
        nightKilledIds: dawnCtx?.nightKilledIds || [skippedHunter.id],
        hunterShotEvent: null,
        humanPlayerId: me.id,
        lang,
      });
      setPendingDawnContext(null);
      setNotebook((prevNb) =>
        appendNotebookTimelineEvent(prevNb, {
          round,
          phaseLabel: lang === 'vi' ? `Bình Minh #${round}` : `Dawn #${round}`,
          text: dawnAfterSkip.dayBarSummary,
          tone: dawnAfterSkip.victims.length > 0 ? 'death' : 'info',
        })
      );
      const isBotSeerInDawn = updatedAfterSkip.some(
        (p) => p.roleId === 'seer' && Boolean(p.isBot) && p.isAlive
      );
      const botLines = buildBotDayDiscussionLines(
        updatedAfterSkip,
        dawnAfterSkip.victims.map((v) => v.name),
        lang,
        isBotSeerInDawn ? dawnCtx?.seerInspection ?? null : null,
        round
      );
      const nowTs = Date.now();
      setMessages((prev) => [
        ...prev,
        {
          id: `sys_dawn_skip_${nowTs}`,
          senderId: 'sys',
          senderName: lang === 'vi' ? '🎙️ Quản Trò AI' : '🎙️ AI Game Master',
          text: dawnAfterSkip.chatMessageText,
          timestamp: nowTs,
          isSystem: true,
        },
        ...botLines.map((line, idx) => ({
          id: `bot_chat_hs_${nowTs}_${idx}`,
          senderId: line.senderId,
          senderName: line.senderName,
          text: line.text,
          timestamp: nowTs + idx + 1,
        })),
      ]);
      setPhase('day_discussion');
      setTimerSeconds(timerConfig.dayDiscussSec);
      setEventBanner(`☀️ ${t.dayDiscussTitle(round)}: ${dawnAfterSkip.dayBarSummary}`);
      setLastDawnAnnouncement(dawnAfterSkip);
      setGmAnnouncement(dawnAfterSkip);
      sound.playGMAnnouncement('dawn', dawnAfterSkip.victims.length > 0, dawnAfterSkip.spokenNarration, lang);
    } else {
      const duskBefore = pendingDuskBeforePlayers || updatedAfterSkip;
      const duskAfterSkip = enrichDuskAnnouncementVotes(
        buildDuskGMAnnouncement({
          round,
          beforePlayers: duskBefore,
          afterPlayers: updatedAfterSkip,
          lynchedVictim: skippedHunter,
          voteCounts: tallyVotesWithMayor(votes, mayorId).counts,
          votes: votes.filter((v) => v.targetId !== CAMPFIRE_ABSTAIN_ID),
          isTie: false,
          hunterShotEvent: null,
          humanPlayerId: me.id,
          lang,
        }),
        votes,
        duskBefore,
        mayorId,
        lang
      );
      setPendingDuskBeforePlayers(null);
      setMessages((prev) => [
        ...prev,
        {
          id: `sys_hunter_skip_${Date.now()}`,
          senderId: 'sys',
          senderName: lang === 'vi' ? '🎙️ Quản Trò AI' : '🎙️ AI Game Master',
          text: duskAfterSkip.chatMessageText,
          timestamp: Date.now(),
          isSystem: true,
        },
      ]);
      setPendingNightTransition({
        nextPlayers: updatedAfterSkip,
        nextRound: round + 1,
        nextFrenzy: wolfPupFrenzy,
      });
      setGmAnnouncement(duskAfterSkip);
      sound.playGMAnnouncement('dusk', true, duskAfterSkip.spokenNarration, lang);
    }
  }, [
    phase,
    activeHunter,
    players,
    round,
    finishGame,
    hunterOriginPhase,
    pendingDawnContext,
    pendingDuskBeforePlayers,
    me.id,
    lang,
    timerConfig.dayDiscussSec,
    t,
    votes,
    mayorId,
    wolfPupFrenzy,
    gameMode,
    roomId,
    onlineMatchView?.isMyHunterTurn,
    enrichDuskAnnouncementVotes,
  ]);

  // Fast-Forward / Advance Phase Handler (Host-only server advance in Online mode; jumps to human turn in AI Practice)
  const handleAdvancePhaseFast = useCallback(() => {
    if (gameMode === 'online') {
      if (!me.isHost) {
        setEventBanner(
          lang === 'vi'
            ? '⏳ Chỉ Chủ phòng mới có thể chuyển pha sớm trong phòng Online!'
            : '⏳ Only the Room Host can advance phases early in Online mode!'
        );
        return;
      }
      realtimeClient.sendAdvancePhase(roomId);
      return;
    }
    if (phase === 'night') {
      if (myNightStepIdx !== -1 && nightStepIndex < myNightStepIdx) {
        handleJumpToMyNightTurn();
      } else {
        handleResolveNight();
      }
    } else if (phase === 'day_discussion') {
      handleStartDayVoting();
    } else if (phase === 'day_voting') {
      handleResolveDayVoting();
    } else if (phase === 'hunter_revenge') {
      const hunter = activeHunter || players.find((p) => p.roleId === 'hunter');
      const validTargets = players.filter((p) => p.isAlive && p.id !== hunter?.id);
      if (hunter && validTargets.length > 0) {
        const chosen =
          validTargets.find((p) => p.id === selectedTargetId) ||
          validTargets[Math.floor(Math.random() * validTargets.length)];
        handleSelect3DPlayer(chosen.id);
      } else {
        setActiveHunter(null);
        if (hunterOriginPhase === 'night') {
          setPhase('day_discussion');
          setTimerSeconds(timerConfig.dayDiscussSec);
        } else {
          beginNewNight(players, round + 1, wolfPupFrenzy);
        }
      }
    }
  }, [
    phase,
    myNightStepIdx,
    nightStepIndex,
    handleJumpToMyNightTurn,
    handleResolveNight,
    handleStartDayVoting,
    handleResolveDayVoting,
    activeHunter,
    players,
    selectedTargetId,
    handleSelect3DPlayer,
    hunterOriginPhase,
    timerConfig.dayDiscussSec,
    beginNewNight,
    round,
    wolfPupFrenzy,
    gameMode,
    me.isHost,
    roomId,
    lang,
  ]);

  // Quick helper to switch to an active night role if the player was dealt a passive role in AI Practice
  const handleSwitchToActiveNightRole = useCallback(() => {
    const activeRoles: RoleId[] = ['seer', 'witch', 'werewolf', 'bodyguard'];
    const nextRole = activeRoles.find((r) => r !== me.roleId) || 'seer';
    sound.playCardFlip();
    setPreferredRole(nextRole);
    handleStartMatch(villageSize, nextRole, gameMode);
  }, [me.roleId, villageSize, gameMode, handleStartMatch]);

  // Toggle Suspect / Trusted tag on a player seat (and sync to Agrou Deduction Notebook)
  const handleTogglePlayerSuspectTag = useCallback(
    (playerId: string, forcedTag?: 'wolf_suspect' | 'trusted') => {
      sound.playCardFlip();
      setSuspectTags((prev) => {
        const current = prev[playerId];
        const next: 'wolf_suspect' | 'trusted' | undefined = forcedTag
          ? current === forcedTag
            ? undefined
            : forcedTag
          : current === 'wolf_suspect'
          ? 'trusted'
          : current === 'trusted'
          ? undefined
          : 'wolf_suspect';
        setNotebook((prevNb) =>
          updateNotebookPlayerEntry(prevNb, playerId, {
            trust:
              next === 'wolf_suspect'
                ? 'suspicious'
                : next === 'trusted'
                ? 'trusted'
                : 'unknown',
          })
        );
        return { ...prev, [playerId]: next };
      });
    },
    []
  );

  // Server-Authoritative Online Countdown Interval (500ms tick synced to server clock offset)
  useEffect(() => {
    if (shellState !== 'playing' || gameMode !== 'online' || !onlineMatchView) return;
    const syncTimer = () => {
      const endsAt = onlinePhaseEndsAtRef.current;
      if (!endsAt) {
        setTimerSeconds(0);
        return;
      }
      const remaining = Math.max(
        0,
        Math.ceil((endsAt - (Date.now() + onlineClockOffsetRef.current)) / 1000)
      );
      setTimerSeconds(remaining);
    };
    syncTimer();
    const id = window.setInterval(syncTimer, 500);
    return () => window.clearInterval(id);
  }, [shellState, gameMode, onlineMatchView]);

  // Countdown Timer Effect (AI Practice / local only — disabled in server-authoritative Online mode)
  useEffect(() => {
    const isBeginnerUiPaused =
      gameMode === 'ai_practice' && (isNotebookOpen || activeDrawer === 'chat');
    if (
      gameMode === 'online' ||
      shellState !== 'playing' ||
      phase === 'game_over' ||
      phase === 'lobby' ||
      showOnboardingTour ||
      showMyRoleModal ||
      isBeginnerUiPaused ||
      Boolean(gmAnnouncement) ||
      Boolean(nightDeathCinematic)
    )
      return;
    const timer = setInterval(() => {
      setTimerSeconds((prev) => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [
    shellState,
    gameMode,
    phase,
    showOnboardingTour,
    showMyRoleModal,
    isNotebookOpen,
    activeDrawer,
    gmAnnouncement,
    nightDeathCinematic,
  ]);

  const isLastNightStep =
    gameMode === 'online' && onlineMatchView
      ? onlineMatchView.phase === 'night' &&
        onlineMatchView.nightScheduleSummary.length > 0 &&
        onlineMatchView.nightStepIndex >= onlineMatchView.nightScheduleSummary.length - 1
      : phase === 'night' && nightSchedule.length > 0 && nightStepIndex >= nightSchedule.length - 1;
  const isHumanHunterRevenge =
    gameMode === 'online' && onlineMatchView
      ? onlineMatchView.isMyHunterTurn
      : phase === 'hunter_revenge' && Boolean(activeHunter && !activeHunter.isBot);

  const canAutoAdvanceOnZero = shouldAutoAdvanceOnTimerZero({
    shellState,
    phase,
    showOnboardingTour,
    isPlayerAwakeAtNight,
    isHumanAlive: Boolean(me?.isAlive),
    hasHumanVoted: hasVoted,
    isHumanHunterRevenge,
    isLastNightStep,
    hasActiveGMAnnouncement: Boolean(gmAnnouncement) || Boolean(nightDeathCinematic),
  });

  // Trigger step-by-step Auto-GM progression when timer reaches 0 (NEVER runs in server-authoritative Online mode!)
  useEffect(() => {
    if (gameMode === 'online') return;
    if (shellState !== 'playing' || timerSeconds > 0 || !canAutoAdvanceOnZero) {
      return;
    }
    const stepGuardKey = `${matchInstanceId}-${round}-${phase}-${nightStepIndex}`;
    if (lastAutoAdvancedKeyRef.current === stepGuardKey) {
      return;
    }
    lastAutoAdvancedKeyRef.current = stepGuardKey;

    if (phase === 'night') {
      handleAdvanceNightStep();
    } else if (phase === 'day_discussion') {
      handleStartDayVoting();
    } else if (phase === 'day_voting') {
      if (me.isAlive && !hasVoted) {
        const autoVotes = castSingleDayVote(votes, me.id, CAMPFIRE_ABSTAIN_ID);
        setVotes(autoVotes);
        setHasVoted(true);
        handleResolveDayVoting(autoVotes);
      } else {
        handleResolveDayVoting();
      }
    } else {
      handleAdvancePhaseFast();
    }
  }, [
    gameMode,
    shellState,
    timerSeconds,
    canAutoAdvanceOnZero,
    matchInstanceId,
    round,
    phase,
    nightStepIndex,
    me.isAlive,
    me.id,
    hasVoted,
    votes,
    handleAdvanceNightStep,
    handleStartDayVoting,
    handleResolveDayVoting,
    handleAdvancePhaseFast,
  ]);

  // Persist active AI Practice match snapshot to sessionStorage so F5 reload can offer instant resume (BUG-09)
  useEffect(() => {
    if (
      shellState !== 'playing' ||
      gameMode !== 'ai_practice' ||
      phase === 'game_over' ||
      phase === 'lobby' ||
      phase === 'hunter_revenge' ||
      showOnboardingTour ||
      Boolean(pendingNightTransition)
    ) {
      return;
    }
    try {
      const snap: SavedAIMatchSnapshot = {
        savedAt: Date.now(),
        players,
        phase,
        round,
        nightStepIndex,
        timerSeconds,
        mayorId,
        wolfPupFrenzy,
        elderSealActive,
        votes,
        hasVoted,
        messages: messages.slice(-60),
        notebook,
        suspectTags,
        doppelgangerTargetId,
        cupidLovers,
        tonightWolfVictimId,
        secondWolfTargetId,
        guardTargetTonightId,
        witchHealTargetTonightId,
        witchPoisonTargetId,
        hasInspectedTonight,
        seerInspectResult,
        knownWolfIds,
        villageSize,
        preferredRole,
        eventBanner,
      };
      sessionStorage.setItem(ACTIVE_MATCH_SNAPSHOT_KEY, JSON.stringify(snap));
    } catch {
      // ignore quota errors
    }
  }, [
    shellState,
    gameMode,
    showOnboardingTour,
    pendingNightTransition,
    players,
    phase,
    round,
    nightStepIndex,
    timerSeconds,
    mayorId,
    wolfPupFrenzy,
    elderSealActive,
    votes,
    hasVoted,
    messages,
    notebook,
    suspectTags,
    doppelgangerTargetId,
    cupidLovers,
    tonightWolfVictimId,
    secondWolfTargetId,
    guardTargetTonightId,
    witchHealTargetTonightId,
    witchPoisonTargetId,
    hasInspectedTonight,
    seerInspectResult,
    knownWolfIds,
    villageSize,
    preferredRole,
    eventBanner,
  ]);

  const handleResumeSavedMatch = useCallback(() => {
    if (!savedMatchSnapshot) return;
    sound.playCardFlip();
    const restoredWitchHeal =
      savedMatchSnapshot.witchHealTargetTonightId !== undefined
        ? savedMatchSnapshot.witchHealTargetTonightId
        : savedMatchSnapshot.witchSaveUsedTonight
        ? savedMatchSnapshot.tonightWolfVictimId
        : null;
    botWitchActedTonightRef.current = Boolean(
      restoredWitchHeal || savedMatchSnapshot.witchPoisonTargetId
    );
    setGameMode('ai_practice');
    setOnlineMatchView(null);
    activeOnlineRoomCodeRef.current = null;
    setPlayers(savedMatchSnapshot.players);
    setPhase(savedMatchSnapshot.phase);
    setRound(savedMatchSnapshot.round);
    setNightStepIndex(savedMatchSnapshot.nightStepIndex);
    setTimerSeconds(Math.max(5, savedMatchSnapshot.timerSeconds));
    setMayorId(savedMatchSnapshot.mayorId);
    setWolfPupFrenzy(savedMatchSnapshot.wolfPupFrenzy);
    setElderSealActive(Boolean(savedMatchSnapshot.elderSealActive));
    setVotes(savedMatchSnapshot.votes);
    setHasVoted(savedMatchSnapshot.hasVoted);
    setMessages(savedMatchSnapshot.messages);
    setNotebook(savedMatchSnapshot.notebook || createInitialNotebook());
    setSuspectTags(savedMatchSnapshot.suspectTags || {});
    setDoppelgangerTargetId(savedMatchSnapshot.doppelgangerTargetId);
    setCupidLovers(savedMatchSnapshot.cupidLovers);
    setTonightWolfVictimId(savedMatchSnapshot.tonightWolfVictimId);
    setSecondWolfTargetId(savedMatchSnapshot.secondWolfTargetId || null);
    setGuardTargetTonightId(savedMatchSnapshot.guardTargetTonightId);
    setWitchHealTargetTonightId(restoredWitchHeal);
    setWitchPoisonTargetId(savedMatchSnapshot.witchPoisonTargetId);
    setHasInspectedTonight(Boolean(savedMatchSnapshot.hasInspectedTonight));
    setSeerInspectResult(savedMatchSnapshot.seerInspectResult || null);
    setKnownWolfIds(
      Array.isArray(savedMatchSnapshot.knownWolfIds) ? savedMatchSnapshot.knownWolfIds : []
    );
    setVillageSize(savedMatchSnapshot.villageSize || savedMatchSnapshot.players.length);
    setPreferredRole(savedMatchSnapshot.preferredRole || 'random');
    setEventBanner(savedMatchSnapshot.eventBanner || '');
    setSavedMatchSnapshot(null);
    setShellState('playing');
  }, [savedMatchSnapshot]);

  const handleDismissSavedMatch = useCallback(() => {
    clearSavedAIMatchSnapshot();
    setSavedMatchSnapshot(null);
  }, []);

  // Toggle First-Person View Mode [V]
  const handleToggleFirstPerson = useCallback(() => {
    sound.playCardFlip();
    setCameraPreset((prev) => (prev === 'first_person' ? 'campfire' : 'first_person'));
  }, []);

  // Toggle Behind-the-Back (Third-Person) View Mode [B]
  const handleToggleThirdPerson = useCallback(() => {
    sound.playCardFlip();
    setCameraPreset((prev) => (prev === 'third_person' ? 'campfire' : 'third_person'));
  }, []);

  // Return to own wooden stool around the campfire (Button / Click own stool / [X])
  const handleReturnToSeat = useCallback(() => {
    sound.playCardFlip();
    setReturnToSeatTrigger((n) => n + 1);
    setReturnToSeatSeq((n) => n + 1);
    setIsUserRoaming(false);
    setAimedOwnSeat(false);
  }, []);

  // Mutually exclusive panel/drawer/popover controls (BUG-11)
  const toggleNotebookPanel = useCallback(() => {
    setIsNotebookOpen((open) => {
      const next = !open;
      if (next) {
        setActiveDrawer('none');
        setActiveToolPopover('none');
      }
      return next;
    });
  }, []);

  const toggleDrawerPanel = useCallback((drawer: DrawerTool) => {
    setActiveDrawer((cur) => {
      const next = cur === drawer ? 'none' : drawer;
      if (next !== 'none') {
        setIsNotebookOpen(false);
        setActiveToolPopover('none');
      }
      return next;
    });
  }, []);

  const toggleToolPopoverPanel = useCallback((popover: 'props' | 'voice') => {
    setActiveToolPopover((cur) => {
      const next = cur === popover ? 'none' : popover;
      if (next !== 'none') {
        setIsNotebookOpen(false);
        setActiveDrawer('none');
      }
      return next;
    });
  }, []);

  const openRoleCardModal = useCallback(() => {
    sound.playCardFlip();
    setActiveToolPopover('none');
    setIsNotebookOpen(false);
    setIsRoleCardInitialOpen(false);
    setShowMyRoleModal(true);
  }, []);

  const openPauseModal = useCallback(() => {
    setActiveToolPopover('none');
    setIsNotebookOpen(false);
    setShellState('paused');
  }, []);

  const handleDismissNightDeathCinematic = useCallback(() => {
    sound.playCardFlip();
    setNightDeathCinematic(null);
    if (pendingDawnAfterDeath) {
      const nextDawn = pendingDawnAfterDeath;
      setPendingDawnAfterDeath(null);
      setGmAnnouncement(nextDawn);
      sound.playGMAnnouncement(
        'dawn',
        nextDawn.victims.length > 0,
        nextDawn.spokenNarration,
        lang
      );
    }
  }, [pendingDawnAfterDeath, lang]);

  // Keyboard Shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const targetEl = e.target as HTMLElement | null;
      const tag = targetEl?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || targetEl?.isContentEditable) return;

      // In standalone real-life GM mode, ignore 3D game shortcuts (except Escape to close rules modal)
      if (shellState === 'gm_host' || shellState === 'gm_player') {
        if (e.code === 'Escape' && activeDrawer !== 'none') {
          e.preventDefault();
          setActiveDrawer('none');
        }
        return;
      }

      if (shellState === 'title' && (e.code === 'Enter' || e.code === 'Space')) {
        const activeEl = document.activeElement as HTMLElement | null;
        const activeTag = activeEl?.tagName;
        const isInteractiveFocused =
          activeTag === 'BUTTON' ||
          activeTag === 'A' ||
          activeTag === 'INPUT' ||
          activeTag === 'TEXTAREA' ||
          activeTag === 'SELECT' ||
          Boolean(activeEl?.closest('[role="dialog"], [role="menu"]'));
        const isTitleModalOrMenuOpen =
          lobbyModalState.isOpen ||
          showAvatarLocker ||
          showProfileModal ||
          activeDrawer !== 'none' ||
          showOnboardingTour ||
          Boolean(document.querySelector('[role="dialog"], [data-testid="guide-options-menu"]'));
        if (!isInteractiveFocused && !isTitleModalOrMenuOpen) {
          e.preventDefault();
          handleStartMatch(
            villageSize,
            preferredRole,
            'ai_practice',
            undefined,
            undefined,
            undefined,
            undefined,
            true
          );
        }
        return;
      }

      if (nightDeathCinematic && (e.code === 'Enter' || e.code === 'Space' || e.code === 'Escape')) {
        e.preventDefault();
        handleDismissNightDeathCinematic();
        return;
      }

      if (gmAnnouncement && (e.code === 'Enter' || e.code === 'Space' || e.code === 'Escape')) {
        e.preventDefault();
        handleDismissGMAnnouncement();
        return;
      }

      if (e.code === 'Escape') {
        e.preventDefault();
        if (freeLook360 || document.pointerLockElement) {
          setFreeLook360(false);
          if (document.pointerLockElement && typeof document.exitPointerLock === 'function') {
            document.exitPointerLock();
          }
          if (preFreeLookCameraRef.current) {
            setCameraPreset(preFreeLookCameraRef.current);
            preFreeLookCameraRef.current = null;
          }
          return;
        }
        if (showOnboardingTour) {
          localStorage.setItem('werewolf_3d_tour_done', '1');
          setShowOnboardingTour(false);
        } else if (showAvatarLocker) {
          setShowAvatarLocker(false);
        } else if (isNotebookOpen) {
          setIsNotebookOpen(false);
        } else if (showProfileModal) {
          setShowProfileModal(false);
          setInitialAccountTab(null);
        } else if (showMyRoleModal) {
          setShowMyRoleModal(false);
        } else if (lobbyModalState.isOpen) {
          setLobbyModalState({ ...lobbyModalState, isOpen: false });
        } else if (activeDrawer !== 'none') {
          setActiveDrawer('none');
        } else if (activeToolPopover !== 'none') {
          setActiveToolPopover('none');
        } else if (activePropTool !== null) {
          setActivePropTool(null);
        } else if (shellState === 'playing') {
          openPauseModal();
        } else if (shellState === 'paused') {
          setShellState('playing');
        }
        return;
      }

      if (e.code === 'KeyP') {
        if (
          showOnboardingTour ||
          showAvatarLocker ||
          showProfileModal ||
          lobbyModalState.isOpen ||
          Boolean(gmAnnouncement) ||
          Boolean(nightDeathCinematic)
        ) {
          return;
        }
        e.preventDefault();
        if (shellState === 'playing') {
          setShowMyRoleModal(false);
          setActiveDrawer('none');
          openPauseModal();
        } else if (shellState === 'paused') {
          setShellState('playing');
        }
        return;
      }

      const hasBlockingModal =
        shellState !== 'playing' ||
        showOnboardingTour ||
        showAvatarLocker ||
        showProfileModal ||
        lobbyModalState.isOpen ||
        Boolean(gmAnnouncement) ||
        Boolean(nightDeathCinematic);

      if (e.code === 'KeyM') {
        const m = sound.toggleMute();
        setIsMuted(m);
        return;
      }

      if (hasBlockingModal) return;

      if (e.code === 'KeyC') {
        if (showMyRoleModal) {
          setShowMyRoleModal(false);
        } else {
          openRoleCardModal();
        }
      } else if (e.code === 'KeyN' && !showMyRoleModal) {
        toggleNotebookPanel();
      } else if (showMyRoleModal || isNotebookOpen || activeDrawer !== 'none') {
        return;
      } else if (e.code === 'KeyH') {
        setIsDockCollapsed((c) => !c);
      } else if (e.code === 'KeyT' && phase !== 'night' && me.isAlive) {
        toggleToolPopoverPanel('props');
      } else if (e.code === 'KeyV') {
        handleToggleFirstPerson();
      } else if (e.code === 'KeyB') {
        handleToggleThirdPerson();
      } else if (e.code === 'KeyE' && isDirectLookCameraPreset(cameraPreset)) {
        if (e.repeat) return;
        if (aimedOwnSeat && isUserRoaming) {
          e.preventDefault();
          handleReturnToSeat();
        } else if (aimedPlayerId) {
          e.preventDefault();
          handleSelect3DPlayer(aimedPlayerId);
        } else if (aimedCampfire && phase === 'day_voting') {
          e.preventDefault();
          handleVoteCampfireAbstain();
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    shellState,
    phase,
    me.isAlive,
    activeDrawer,
    activeToolPopover,
    activePropTool,
    lobbyModalState,
    showOnboardingTour,
    showAvatarLocker,
    isNotebookOpen,
    showProfileModal,
    showMyRoleModal,
    freeLook360,
    nightDeathCinematic,
    handleDismissNightDeathCinematic,
    gmAnnouncement,
    handleDismissGMAnnouncement,
    villageSize,
    preferredRole,
    handleStartMatch,
    handleToggleFirstPerson,
    handleToggleThirdPerson,
    handleReturnToSeat,
    toggleNotebookPanel,
    toggleToolPopoverPanel,
    openRoleCardModal,
    openPauseModal,
    cameraPreset,
    aimedOwnSeat,
    isUserRoaming,
    aimedPlayerId,
    aimedCampfire,
    handleSelect3DPlayer,
    handleVoteCampfireAbstain,
  ]);

  // Subscribe to server-authoritative Online 3D match state, chat, props, votes & rematches
  // Stays mounted while Online lobby is open OR during active/paused/gameover Online matches so initial match_state is never dropped!
  useEffect(() => {
    const isOnlineSessionActive =
      gameMode === 'online' &&
      (shellState === 'playing' || shellState === 'paused' || shellState === 'gameover');
    const isOnlineLobbyOpen = lobbyModalState.isOpen && lobbyModalState.mode === 'online';
    if (!isOnlineSessionActive && !isOnlineLobbyOpen) return;

    return realtimeClient.subscribe((evt) => {
      const targetCode = activeOnlineRoomCodeRef.current || roomId;

      if (evt.type === 'room:match_state') {
        lastReceivedMatchStateRef.current = {
          code: evt.code,
          view: evt.view,
          serverNow: evt.serverNow,
        };
        if (targetCode && evt.code === targetCode) {
          applyOnlineMatchView(evt.view, evt.serverNow);
        }
      } else if (evt.type === 'room:match_started' && targetCode && evt.room.code === targetCode) {
        if (isOnlineSessionActive) {
          // Rematch started by Host while players are on Game Over / Playing
          mergeOnlineChatMessages(evt.room.chatMessages, true);
          setShellState('playing');
        }
      } else if (evt.type === 'room:state' && targetCode && evt.room.code === targetCode) {
        if (isOnlineSessionActive) {
          mergeOnlineChatMessages(evt.room.chatMessages);
        }
      } else if (evt.type === 'room:chat' && targetCode && evt.code === targetCode) {
        if (isOnlineSessionActive) {
          setMessages((prev) =>
            prev.some((m) => m.id === evt.message.id) ? prev : [...prev, evt.message]
          );
        }
      } else if (evt.type === 'room:prop' && targetCode && evt.code === targetCode) {
        if (isOnlineSessionActive && evt.event.fromPlayerId !== currentUserRef.current.id) {
          handleThrowProp(
            evt.event.fromPlayerId,
            evt.event.targetPlayerId,
            evt.event.propType,
            true
          );
        }
      } else if (evt.type === 'room:votes' && targetCode && evt.code === targetCode) {
        if (isOnlineSessionActive) {
          const synced: VoteRecord[] = Object.entries(evt.votes).map(([voterId, targetId]) => ({
            voterId,
            targetId,
          }));
          setVotes(synced);
          const myV = synced.find((v) => v.voterId === currentUserRef.current.id);
          setHasVoted(Boolean(myV));
          if (phaseRef.current === 'day_voting') {
            setSelectedTargetId(myV ? myV.targetId : null);
          }
        }
      } else if (
        evt.type === 'room:kicked' &&
        isOnlineSessionActive &&
        evt.targetId === currentUserRef.current.id
      ) {
        activeOnlineRoomCodeRef.current = null;
        setOnlineMatchView(null);
        resetMatchUiState();
        setShellState('title');
      } else if (evt.type === 'error' && isOnlineSessionActive) {
        setEventBanner(`⚠️ ${evt.message}`);
      }
    });
  }, [
    shellState,
    gameMode,
    roomId,
    lobbyModalState.isOpen,
    lobbyModalState.mode,
    applyOnlineMatchView,
    mergeOnlineChatMessages,
    handleThrowProp,
    resetMatchUiState,
  ]);

  // Send Chat Message (Strict Dead Ghost Isolation: Main Chat locked when dead; Ghost tab isolated to dead players only!)
  const handleSendMessage = () => {
    const canSendInCurrentTab = me.isAlive ? chatTab === 'main' : chatTab === 'ghost';
    if (!canSendInCurrentTab) {
      setChatNotice(
        lang === 'vi'
          ? '🔒 Bạn đã thành Hồn Ma — Phòng Chính đã khóa! Hãy chuyển sang Khu Vực Ma để trò chuyện riêng.'
          : '🔒 You are a Ghost — Main Room is locked! Switch to Ghost Realm to chat with other ghosts.'
      );
      setChatInput('');
      return;
    }
    const text = chatInput.trim();
    if (!text) return;
    const isGhostMsg = !me.isAlive && chatTab === 'ghost';
    const msgId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setChatNotice('');
    const nextMsg: ChatMessage = {
      id: msgId,
      senderId: me.id,
      senderName: isGhostMsg ? `👻 ${me.name}` : me.name,
      text,
      timestamp: Date.now(),
      isGhost: isGhostMsg,
    };
    setMessages((prev) => [...prev, nextMsg]);
    if (gameMode === 'online') realtimeClient.sendChat(roomId, nextMsg);
    setChatInput('');
  };

  // Compute Mayor-Weighted Vote Counts, Campfire Abstentions & Voter Labels for 3D Nameplates and Bottom Dock
  const voteTallyEntries = buildVoteTallyEntries(players, votes);
  const weightedVoteTally = tallyVotesWithMayor(votes, mayorId);
  const votesMap: Record<string, number> = {};
  const votersByTargetLabels: Record<string, string[]> = {};
  for (const entry of voteTallyEntries) {
    votesMap[entry.playerId] = weightedVoteTally.counts[entry.playerId] ?? entry.votes;
    votersByTargetLabels[entry.playerId] = entry.voters.map((v) => {
      const crownTag = v.id === mayorId ? '👑' : '';
      return v.id === me.id
        ? `#${v.seatNumber} ${lang === 'vi' ? 'Bạn' : 'You'}${crownTag}`
        : `#${v.seatNumber} ${v.name}${crownTag}`;
    });
  }
  if (weightedVoteTally.abstainCount > 0) {
    votesMap[CAMPFIRE_ABSTAIN_ID] = weightedVoteTally.abstainCount;
  }

  const factionCounts = computeFactionAliveCounts(players);
  const aliveWolvesCount = factionCounts.wolves;
  const aliveVillagersCount = factionCounts.villagers;

  const dyingWolfVictimIds =
    gameMode === 'online' && onlineMatchView
      ? onlineMatchView.dyingWolfVictimIds
      : phase === 'night' && me.roleId === 'witch' && me.isAlive && !me.hasUsedHeal && !me.hasUsedPower
      ? getDyingWolfVictimsForWitch(
          players,
          {
            wolfTargetId: tonightWolfVictimId,
            secondWolfTargetId,
            guardTargetId: guardTargetTonightId,
          },
          wolfPupFrenzy
        )
      : [];

  const isNightBlindfolded =
    shellState === 'playing' &&
    phase === 'night' &&
    me.isAlive &&
    !isPlayerAwakeAtNight &&
    !showOnboardingTour &&
    !nightDeathCinematic;

  const isDirectLookCam = isDirectLookCameraPreset(cameraPreset);

  const isUiOverlayOpen =
    shellState !== 'playing' ||
    showOnboardingTour ||
    showAvatarLocker ||
    isNotebookOpen ||
    showProfileModal ||
    showMyRoleModal ||
    lobbyModalState.isOpen ||
    activeDrawer !== 'none' ||
    Boolean(gmAnnouncement);

  const handlePointerLockChange = useCallback((locked: boolean) => {
    setFreeLook360(locked);
    if (locked) {
      if (preFreeLookCameraRef.current && !isDirectLookCameraPreset(preFreeLookCameraRef.current)) {
        setCameraPreset('first_person');
      }
    } else if (preFreeLookCameraRef.current) {
      setCameraPreset(preFreeLookCameraRef.current);
      preFreeLookCameraRef.current = null;
    }
  }, []);

  useEffect(() => {
    const syncLock = () => {
      const locked = Boolean(document.pointerLockElement);
      handlePointerLockChange(locked);
    };
    const onLockError = () => {
      handlePointerLockChange(false);
    };
    document.addEventListener('pointerlockchange', syncLock);
    document.addEventListener('pointerlockerror', onLockError);
    return () => {
      document.removeEventListener('pointerlockchange', syncLock);
      document.removeEventListener('pointerlockerror', onLockError);
    };
  }, [handlePointerLockChange]);

  const handleToggleFreeLook = () => {
    if (freeLook360 || document.pointerLockElement) {
      if (document.pointerLockElement && typeof document.exitPointerLock === 'function') {
        try {
          document.exitPointerLock();
        } catch {
          // ignore
        }
      }
      handlePointerLockChange(false);
      return;
    }
    if (isUiOverlayOpen || isNightBlindfolded || Boolean(nightDeathCinematic)) return;
    const canvas = document.querySelector<HTMLCanvasElement>('[data-testid="village-3d-canvas"] canvas');
    if (!canvas || typeof canvas.requestPointerLock !== 'function') {
      return;
    }
    preFreeLookCameraRef.current = cameraPreset;
    try {
      const p = canvas.requestPointerLock() as unknown as Promise<void> | undefined;
      if (p && typeof p.catch === 'function') {
        p.catch(() => {
          preFreeLookCameraRef.current = null;
          setFreeLook360(false);
        });
      }
    } catch {
      preFreeLookCameraRef.current = null;
      setFreeLook360(false);
    }
  };

  const canUseVirtualDpad =
    shellState === 'playing' &&
    !isNightBlindfolded &&
    !nightDeathCinematic &&
    ((phase === 'night' && isPlayerAwakeAtNight) || !me.isAlive || isDirectLookCam);

  // Reset mobile D-Pad / turn / ghost vertical rates whenever controls disable or phase changes (BUG-06)
  useEffect(() => {
    setMoveVector({ x: 0, z: 0 });
    setFpvLookTurnRate(0);
    setGhostVerticalRate(0);
  }, [canUseVirtualDpad, isDockCollapsed, phase, shellState]);

  const aimedPlayer = aimedPlayerId ? players.find((p) => p.id === aimedPlayerId) || null : null;

  const fpvPrompt =
    shellState === 'playing' && isDirectLookCam && !isNightBlindfolded && !nightDeathCinematic
      ? getContextualInteractionPrompt({
          phase,
          me,
          target: aimedPlayer
            ? { id: aimedPlayer.id, name: aimedPlayer.name, isAlive: aimedPlayer.isAlive }
            : null,
          isCampfireTarget: aimedCampfire,
          isOwnSeatTarget: aimedOwnSeat,
          isUserRoaming,
          activePropTool,
          currentNightStep: currentNightStep?.roleId ?? null,
          isPlayerAwakeAtNight,
          lang,
        })
      : null;

  // =========================================================================
  // STANDALONE REAL-LIFE GM COMPANION SHELL (COMPLETELY ISOLATED FROM 3D/BOT GAME)
  // =========================================================================
  if (shellState === 'gm_host' || shellState === 'gm_player') {
    const isHostShell = shellState === 'gm_host';
    return (
      <div
        data-testid={isHostShell ? 'gm-host-standalone-shell' : 'gm-player-standalone-shell'}
        className="min-h-screen w-screen overflow-y-auto bg-[#070a14] text-slate-100 flex flex-col"
      >
        {/* Minimal Real-Life Companion Header */}
        <header className="sticky top-0 z-30 bg-[#090d18]/95 border-b border-amber-600/35 px-3 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-400 shrink-0">
              {isHostShell ? <Shield className="w-4 h-4" /> : <Smartphone className="w-4 h-4" />}
            </span>
            <div className="min-w-0">
              <div className="text-xs sm:text-sm font-black text-amber-200 truncate">
                {isHostShell ? t.gmHostShellTitle : t.gmPlayerShellTitle}
              </div>
              <div className="text-[10px] text-slate-400 truncate">
                {isHostShell ? t.gmHostShellSubtitle : t.gmPlayerShellSubtitle}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              aria-label={t.drawerRulesTitle}
              title={t.drawerRulesTitle}
              onClick={() =>
                setActiveDrawer(activeDrawer === 'encyclopedia' ? 'none' : 'encyclopedia')
              }
              className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-emerald-300 flex items-center gap-1 cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t.rulesShort}</span>
            </button>

            <button
              type="button"
              aria-pressed={isMuted}
              onClick={() => {
                const m = sound.toggleMute();
                setIsMuted(m);
              }}
              aria-label={t.toggleSound}
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 cursor-pointer"
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4 text-slate-400" />
              ) : (
                <Volume2 className="w-4 h-4 text-emerald-400" />
              )}
            </button>

            <select
              value={lang}
              onChange={(e) => handleChangeLanguage(e.target.value as Language)}
              aria-label="Language"
              className="bg-slate-900 border border-slate-700 text-xs font-bold rounded-lg px-2 py-1.5 text-amber-100 cursor-pointer"
            >
              <option value="vi">🇻🇳 VI</option>
              <option value="en">🇬🇧 EN</option>
              <option value="fr">🇫🇷 FR</option>
              <option value="es">🇪🇸 ES</option>
              <option value="ja">🇯🇵 JA</option>
            </select>

            <button
              type="button"
              data-testid="gm-exit-to-title-btn"
              onClick={() => {
                realtimeClient.unsubscribeGM();
                setActiveDrawer('none');
                setGameMode('ai_practice');
                setShellState('title');
                try {
                  if (window.location.search) {
                    window.history.replaceState(null, '', window.location.pathname);
                  }
                } catch {
                  // ignore
                }
              }}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-bold text-slate-100 flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>{t.homeBtn}</span>
            </button>
          </div>
        </header>

        {/* Main Standalone Real-Life Companion Content */}
        <main className="flex-1 w-full px-3 sm:px-6 py-4 sm:py-6">
          {isHostShell ? (
            <GMAssistantView
              lang={lang}
              hostId={currentUser.id}
              initialRoomId={virtualCardRoomId || roomId}
              initialPlayerCount={villageSize}
              initialDeckMode={gmDeckMode}
              onOpenVirtualCards={(code) => {
                setVirtualCardRoomId(code);
                setShellState('gm_player');
                try {
                  window.history.replaceState(null, '', `?gm=${encodeURIComponent(code)}`);
                } catch {
                  // ignore
                }
              }}
            />
          ) : (
            <VirtualCardPlayerView
              initialRoomId={virtualCardRoomId}
              currentUser={currentUser}
              lang={lang}
            />
          )}
        </main>

        {/* Optional Role Encyclopedia Quick Reference Modal */}
        {activeDrawer === 'encyclopedia' && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t.drawerRulesTitle}
            onClick={() => setActiveDrawer('none')}
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5"
            style={{ backgroundColor: 'rgba(5, 8, 17, 0.88)' }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-4xl max-h-[86vh] bg-[#0b101e] border-2 border-amber-600/50 rounded-2xl p-4 sm:p-5 overflow-y-auto shadow-2xl"
            >
              <div className="sticky top-0 z-20 bg-[#0b101e]/95 -mx-4 sm:-mx-5 px-4 sm:px-5 pt-1 flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                <span className="text-xs font-mono uppercase tracking-widest text-amber-400 font-bold">
                  {t.drawerRulesTitle}
                </span>
                <button
                  type="button"
                  onClick={() => setActiveDrawer('none')}
                  className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 flex items-center gap-1 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                  <span>{t.closeEsc}</span>
                </button>
              </div>
              <RoleEncyclopediaView lang={lang} />
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden select-none bg-[#15100c] text-[#f6ebd8]">
      {/* 1. FULL-VIEWPORT INTERACTIVE AGROU LOW-POLY 3D VILLAGE SCENE */}
      <WerewolfVillage3D
        players={players}
        userPlayerId={me.id}
        phase={phase}
        lang={lang}
        isTitleScreen={shellState === 'title'}
        allowTitleOrbit={shellState === 'title' && isTitleMenuMinimized}
        isUiOverlayOpen={isUiOverlayOpen}
        isPlayerAwakeAtNight={isPlayerAwakeAtNight || showOnboardingTour}
        freeLook360={freeLook360}
        moveVector={moveVector}
        thrownProps={thrownProps}
        selectedTargetId={selectedTargetId}
        secondaryTargetId={
          phase === 'day_voting'
            ? null
            : phase === 'night' && me.roleId === 'cupid' && round === 1
            ? cupidLovers?.[1] || null
            : secondWolfTargetId
        }
        cupidLovers={
          me.roleId === 'cupid' ||
          Boolean(me.loverId) ||
          !me.isAlive ||
          shellState === 'gameover'
            ? cupidLovers
            : null
        }
        votesMap={votesMap}
        votersByTarget={votersByTargetLabels}
        votes={votes}
        activeSpeakers={activeSpeakers}
        revealAllRoles={shellState === 'gameover' || !me.isAlive}
        cameraPreset={cameraPreset}
        activePropTool={activePropTool}
        fpvLookTurnRate={fpvLookTurnRate}
        ghostVerticalRate={ghostVerticalRate}
        jumpTriggerSeq={jumpTriggerSeq}
        returnToSeatSeq={returnToSeatSeq}
        mapBiome={avatarConfig.mapBiome}
        mayorId={mayorId}
        emoteEvents={emoteEvents}
        deathCinematic={nightDeathCinematic}
        returnToSeatTrigger={returnToSeatTrigger}
        onPointerLockChange={handlePointerLockChange}
        onAimedPlayerChange={setAimedPlayerId}
        onAimedCampfireChange={setAimedCampfire}
        onAimedOwnSeatChange={setAimedOwnSeat}
        onRoamingStateChange={setIsUserRoaming}
        onReturnToSeat={handleReturnToSeat}
        onSelectPlayer={handleSelect3DPlayer}
        onSelectCampfire={handleVoteCampfireAbstain}
        onVoteCampfireAbstain={handleVoteCampfireAbstain}
      />

      {/* DIRECT-LOOK (FIRST-PERSON & BEHIND-THE-BACK) CENTER CROSSHAIR & CONTEXTUAL INTERACTION PROMPT */}
      {shellState === 'playing' &&
        isDirectLookCam &&
        !isNightBlindfolded &&
        !nightDeathCinematic && (
          <div
            data-testid="fpv-crosshair-hud"
            className="fixed inset-0 z-15 pointer-events-none flex flex-col items-center justify-center"
          >
            <div
              className={`relative flex items-center justify-center transition-transform duration-150 ${
                fpvPrompt?.canInteract ? 'scale-125' : 'scale-100 opacity-80'
              }`}
            >
              <Crosshair
                className={`w-6 h-6 ${
                  fpvPrompt?.canInteract
                    ? fpvPrompt.tone === 'vote'
                      ? 'text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.9)]'
                      : fpvPrompt.tone === 'night'
                      ? 'text-purple-400 drop-shadow-[0_0_8px_rgba(192,132,252,0.9)]'
                      : fpvPrompt.tone === 'prop'
                      ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.9)]'
                      : 'text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.9)]'
                    : 'text-sky-200/75'
                }`}
              />
              <span
                className={`absolute w-1.5 h-1.5 rounded-full ${
                  fpvPrompt?.canInteract ? 'bg-amber-300' : 'bg-white/80'
                }`}
              />
            </div>

            {fpvPrompt && (
              <button
                type="button"
                data-testid="fpv-interact-target-btn"
                disabled={!fpvPrompt.canInteract}
                onClick={() => {
                  if (!fpvPrompt.canInteract) return;
                  if (aimedOwnSeat && isUserRoaming) handleReturnToSeat();
                  else if (aimedPlayer) handleSelect3DPlayer(aimedPlayer.id);
                  else if (aimedCampfire && phase === 'day_voting') handleVoteCampfireAbstain();
                }}
                className={`mt-8 px-3.5 py-1.5 rounded-2xl border shadow-2xl flex flex-col items-center gap-0.5 transition-all max-w-[90vw] ${
                  !fpvPrompt.canInteract
                    ? 'pointer-events-none bg-[#090d18]/90 border-slate-600/80 text-slate-300 cursor-default'
                    : fpvPrompt.tone === 'vote'
                    ? 'pointer-events-auto bg-[#2a0c12]/95 border-rose-400 text-rose-100 hover:bg-rose-600 hover:text-white cursor-pointer'
                    : fpvPrompt.tone === 'night'
                    ? 'pointer-events-auto bg-[#1c102e]/95 border-purple-400 text-purple-100 hover:bg-purple-600 hover:text-white cursor-pointer'
                    : fpvPrompt.tone === 'prop'
                    ? 'pointer-events-auto bg-[#0c261b]/95 border-emerald-400 text-emerald-100 hover:bg-emerald-600 hover:text-white cursor-pointer'
                    : 'pointer-events-auto bg-[#22150a]/95 border-amber-400 text-amber-100 hover:bg-amber-500 hover:text-slate-950 cursor-pointer'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-extrabold">
                  <span>{fpvPrompt.icon}</span>
                  <span>{fpvPrompt.actionLabel}</span>
                </div>
                <span className="text-[10px] font-mono opacity-90">{fpvPrompt.detail}</span>
              </button>
            )}
          </div>
        )}

      {/* ANTI-CHEAT NIGHT BLINDFOLD OVERLAY — PITCH DARK EXCEPT THE GLOWING CAMPFIRE IN THE CENTER */}
      {isNightBlindfolded && (
        <div
          data-testid="night-blindfold-overlay"
          className="fixed inset-0 z-10 pointer-events-none flex flex-col items-center justify-end pb-4 sm:pb-6 px-3 transition-opacity duration-500"
          style={{
            background:
              'radial-gradient(circle at 50% 48%, rgba(0,0,0,0) 0%, rgba(1,2,6,0.22) 34%, rgba(1,1,4,0.82) 78%, rgba(0,0,2,0.95) 100%)',
          }}
        >
          {/* Compact bottom bar so the glowing campfire embers remain starkly visible in the dark center! */}
          <div className="max-w-2xl w-full agrou-wood-panel !bg-[#120c08]/92 !border-[#6e4e31] rounded-2xl p-3 sm:p-3.5 shadow-2xl space-y-2 pointer-events-auto">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-[#1b1420] border border-[#8e6bb5]/60 flex items-center justify-center text-[#d2b3ff] shrink-0">
                  <EyeOff className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs sm:text-sm font-black text-[#fce8c3] truncate">
                    {t.sleepingTitle(myRole.name[lang])}
                  </div>
                  <div
                    data-testid="blindfold-wake-guidance"
                    className="text-[10px] sm:text-[11px] text-[#d6be9c] leading-snug"
                  >
                    {myWakeGuidance.headline} · {t.blindfoldEmbersSub}
                  </div>
                </div>
              </div>

              {currentNightStep && (
                <span className="px-2 py-0.5 rounded-lg bg-indigo-950/85 border border-indigo-500/50 text-[10px] font-extrabold text-amber-300 whitespace-nowrap">
                  {`${t.callingProgress} (${currentNightStep.stepIndex + 1}/${currentNightStep.totalSteps}): ${ROLES[currentNightStep.roleId].name[lang]}`}
                </span>
              )}
            </div>

            {currentNightStep && (
              <div className="flex flex-wrap items-center justify-between gap-1.5 bg-[#0a0812]/80 border border-indigo-500/30 rounded-xl px-2.5 py-1.5">
                <p className="text-[10px] sm:text-[11px] text-indigo-200 leading-snug max-w-full">
                  <em>{stripMarkdownAsterisks(currentNightStep.gmNarration[lang])}</em>
                </p>
                <div className="flex flex-wrap items-center gap-1">
                  {nightSchedulePills.map((st, idx) => (
                    <span
                      key={st.key}
                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                        idx === nightStepIndex
                          ? 'bg-amber-500 text-slate-950 border-amber-300'
                          : st.isHumanTurn
                          ? 'bg-rose-950/90 text-rose-200 border-rose-400'
                          : idx < nightStepIndex
                          ? 'bg-emerald-950/70 text-emerald-300 border-emerald-700/50'
                          : 'bg-slate-900 text-slate-400 border-slate-800'
                      }`}
                    >
                      {ROLES[st.roleId].name[lang]}
                      {st.isHumanTurn ? ` ${t.youSuffix}` : ''}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-center sm:justify-end gap-1.5">
              {!myWakeGuidance.wakesTonight && gameMode === 'ai_practice' && preferredRole === 'random' && (
                <button
                  type="button"
                  data-testid="blindfold-switch-active-role-btn"
                  onClick={handleSwitchToActiveNightRole}
                  className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-[11px] flex items-center gap-1 shadow-lg cursor-pointer"
                >
                  <span>🔮</span>
                  <span>{t.switchToNightRole}</span>
                </button>
              )}
              {gameMode === 'online' ? (
                me.isHost ? (
                  <button
                    type="button"
                    data-testid="blindfold-next-step-btn"
                    onClick={handleAdvanceNightStep}
                    className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-[11px] flex items-center gap-1 shadow-lg cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>
                      {t.nextStep} ({Math.round(timerSeconds)}s)
                    </span>
                  </button>
                ) : (
                  <span className="px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700 text-slate-300 font-bold text-[11px]">
                    ⏳ {`${t.waitingNightTurn} (${Math.round(timerSeconds)}s)...`}
                  </span>
                )
              ) : myNightStepIdx !== -1 && myNightStepIdx !== nightStepIndex ? (
                <button
                  type="button"
                  data-testid="blindfold-jump-my-turn-btn"
                  onClick={handleJumpToMyNightTurn}
                  className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-[11px] flex items-center gap-1 shadow-lg cursor-pointer"
                >
                  <FastForward className="w-3.5 h-3.5 fill-white" />
                  <span>{t.jumpToMyTurn(myRole.name[lang])}</span>
                </button>
              ) : (
                <button
                  type="button"
                  data-testid="blindfold-skip-night-btn"
                  onClick={handleAdvancePhaseFast}
                  className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-[11px] flex items-center gap-1 shadow-lg cursor-pointer"
                >
                  <FastForward className="w-3.5 h-3.5 fill-slate-950" />
                  <span>{t.skipNightLongBtn}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. TITLE SCREEN OVERLAY (Agrou Wood & Campfire Styling + Biome & Avatar Locker) */}
      {shellState === 'title' && (
        <TitleScreenOverlay
          lang={lang}
          isMuted={isMuted}
          currentUser={currentUser}
          villageSize={villageSize}
          preferredRole={preferredRole}
          timerConfig={timerConfig}
          showFactionHints={showFactionHints}
          isTitleMenuMinimized={isTitleMenuMinimized}
          avatarConfig={avatarConfig}
          onChangeBiome={handleChangeBiome}
          onOpenAvatarLocker={() => setShowAvatarLocker(true)}
          onToggleMinimize={() => setIsTitleMenuMinimized((m) => !m)}
          onMinimizedChange={setIsTitleMenuMinimized}
          onToggleMute={() => {
            const m = sound.toggleMute();
            setIsMuted(m);
          }}
          onChangeLanguage={handleChangeLanguage}
          onChangeVillageSize={(nextSize) => {
            setVillageSize(nextSize);
            const previewRoles = generateBalancedRoster(nextSize);
            setPlayers([
              {
                id: currentUser.id,
                name: currentUser.name,
                avatar: currentUser.avatar,
                roleId: previewRoles[0],
                isAlive: true,
                isHost: true,
                hat: avatarConfig.hat,
                cloakColor: avatarConfig.cloakColor,
              },
              ...BOT_NAMES.slice(0, nextSize - 1).map((name, i) => {
                const botLook = getBotCosmetics(i);
                return {
                  id: `bot_${i + 1}`,
                  name,
                  avatar: BOT_AVATARS[i % BOT_AVATARS.length],
                  roleId: previewRoles[i + 1],
                  isAlive: true,
                  isBot: true,
                  hat: botLook.hat,
                  cloakColor: botLook.cloakColor,
                };
              }),
            ]);
          }}
          onChangePreferredRole={setPreferredRole}
          onUpdateTimerConfig={handleUpdateTimerConfig}
          onToggleFactionHints={() => setShowFactionHints((v) => !v)}
          onOpenAccountModal={(tab) => {
            setInitialAccountTab(tab);
            setShowProfileModal(true);
          }}
          onOpenLobbyModal={(mode) => setLobbyModalState({ isOpen: true, mode })}
          onStartAIPractice={() =>
            handleStartMatch(
              villageSize,
              preferredRole,
              'ai_practice',
              undefined,
              undefined,
              undefined,
              undefined,
              true
            )
          }
          onStartOnboardingTour={() => {
            handleStartMatch(villageSize, preferredRole, 'ai_practice');
            setShowOnboardingTour(true);
          }}
          onOpenRulesEncyclopedia={() => setActiveDrawer('encyclopedia')}
        />
      )}

      {/* RESUME SAVED AI MATCH BANNER AFTER F5 RELOAD (BUG-09) */}
      {shellState === 'title' && savedMatchSnapshot && (
        <div
          data-testid="resume-match-banner"
          className="fixed top-14 left-1/2 -translate-x-1/2 z-40 pointer-events-auto flex flex-wrap items-center justify-center gap-2 px-3.5 py-2 rounded-2xl agrou-wood-panel border-2 border-[#f4c062]/80 shadow-2xl max-w-[94vw]"
        >
          <span className="text-xs font-bold text-[#ffebc2]">
            {`💾 ${t.roundStat} ${savedMatchSnapshot.round} · ${savedMatchSnapshot.players.filter((p) => p.isAlive).length}/${savedMatchSnapshot.players.length} ${t.aliveStatus}`}
          </span>
          <button
            type="button"
            data-testid="resume-match-btn"
            onClick={handleResumeSavedMatch}
            className="px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold cursor-pointer shadow"
          >
            {t.resumeMatchBtn}
          </button>
          <button
            type="button"
            data-testid="dismiss-saved-match-btn"
            onClick={handleDismissSavedMatch}
            className="px-2.5 py-1 rounded-xl bg-[#2a1d14] hover:bg-[#3d2a1c] border border-[#6a4c32] text-[#d6be9c] text-xs font-bold cursor-pointer"
          >
            {t.dismissBtn}
          </button>
        </div>
      )}

      {/* 3. PLAYING HUD (Streamlined Perimeter + Single-Focus Action Console + Unified Bottom Dock) */}
      {shellState !== 'title' && (
        <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-1.5 sm:p-3">
          {/* TOP PERIMETER BAR */}
          <GameTopHud
            lang={lang}
            phase={phase}
            round={round}
            timerSeconds={timerSeconds}
            gameMode={gameMode}
            roomId={roomId}
            aliveTotal={players.filter((p) => p.isAlive).length}
            totalPlayers={players.length}
            aliveWolvesCount={aliveWolvesCount}
            aliveVillagersCount={aliveVillagersCount}
            aliveThirdPartyCount={factionCounts.thirdParty}
            hasThirdPartyInMatch={factionCounts.hasThirdPartyInMatch}
            showFactionHints={showFactionHints}
            showFastForwardBtn={
              (gameMode !== 'online' || Boolean(me.isHost)) &&
              phase === 'hunter_revenge'
            }
            myRole={myRole}
            mayorName={players.find((p) => p.id === mayorId && p.isAlive)?.name || null}
            cameraPreset={cameraPreset}
            freeLook360={freeLook360}
            isMicOn={isMicOn && me.isAlive}
            isDead={!me.isAlive}
            isMuted={isMuted}
            onAdjustTimer={(delta) =>
              setTimerSeconds((s) => Math.max(0, Math.min(600, s + delta)))
            }
            onAdvancePhaseFast={handleAdvancePhaseFast}
            onOpenRoleCard={openRoleCardModal}
            onToggleFirstPerson={handleToggleFirstPerson}
            onToggleThirdPerson={handleToggleThirdPerson}
            onToggleFreeLook={handleToggleFreeLook}
            onCycleCameraPreset={() =>
              setCameraPreset((prev) => getNextCameraPreset(prev))
            }
            onOpenOnboardingTour={() => setShowOnboardingTour(true)}
            onToggleMic={handleToggleMicSafe}
            onToggleMute={() => {
              const m = sound.toggleMute();
              setIsMuted(m);
            }}
            onPause={openPauseModal}
          />

          {/* TOP-CENTER SINGLE-FOCUS ACTION CONSOLE (Never stacks 4 bars over villagers!) */}
          <div
            data-tour-id="action-console"
            className="mx-auto mb-auto mt-1 max-w-lg w-full flex flex-col items-center gap-1"
          >
            {phase === 'night' && currentNightStep && !nightDeathCinematic && (
              <NightActionConsole
                lang={lang}
                me={me}
                myRole={myRole}
                players={players}
                currentNightStep={currentNightStep}
                isPlayerAwakeAtNight={isPlayerAwakeAtNight}
                timerSeconds={timerSeconds}
                selectedTargetId={selectedTargetId}
                secondWolfTargetId={secondWolfTargetId}
                dyingWolfVictimIds={dyingWolfVictimIds}
                witchHealTargetId={witchHealTargetTonightId}
                witchPoisonTargetId={witchPoisonTargetId}
                seerInspectResult={seerInspectResult}
                cupidLovers={cupidLovers}
                isOnlineWaitingConfirm={Boolean(
                  gameMode === 'online' && onlineMatchView?.hasConfirmedNightStep
                )}
                isSeerInspectPending={isSeerInspectPending}
                canAdvanceBotStep={gameMode !== 'online' || Boolean(me.isHost)}
                wolfPackPicks={gameMode === 'online' ? onlineMatchView?.wolfPackPicks ?? null : null}
                onSelectWitchHealTarget={(victimId) => {
                  sound.playWitchCauldron();
                  setWitchHealTargetTonightId(victimId);
                  if (gameMode === 'online') {
                    realtimeClient.sendNightAction(roomId, {
                      actionType: 'witch_heal',
                      targetId: victimId,
                    });
                  }
                }}
                onConfirmSeerInspect={handleConfirmSeerInspect}
                onConfirmNightAction={handleConfirmNightAction}
                onAdvanceBotStep={handleAdvanceNightStep}
                onCloseEyes={() => setHasClosedEyesTonight(true)}
              />
            )}

            {phase !== 'night' && !nightDeathCinematic && (
              <DayActionBar
                lang={lang}
                phase={phase}
                round={round}
                eventBanner={eventBanner}
                morningSummary={lastDawnAnnouncement?.dayBarSummary || null}
                messages={messages}
                players={players}
                me={me}
                votes={votes}
                mayorId={mayorId}
                hasVoted={hasVoted}
                selectedTargetId={selectedTargetId}
                timerSeconds={timerSeconds}
                canAdvancePhase={gameMode !== 'online' || Boolean(me.isHost)}
                canUserShootHunter={
                  gameMode === 'online'
                    ? Boolean(onlineMatchView?.isMyHunterTurn)
                    : Boolean(activeHunter && !activeHunter.isBot)
                }
                onStartDayVoting={handleStartDayVoting}
                onResolveDayVoting={() => handleResolveDayVoting()}
                onVoteCampfireAbstain={handleVoteCampfireAbstain}
                onClearVote={handleClearMyVote}
                onSkipHunterShot={handleSkipHunterShot}
                onReopenGMAnnouncement={
                  lastDawnAnnouncement
                    ? () => setGmAnnouncement(lastDawnAnnouncement)
                    : undefined
                }
              />
            )}

            {/* Non-blocking Action Warning Toast (e.g. Bodyguard repeat target / Cupid incomplete) */}
            {actionWarningToast && !nightDeathCinematic && !gmAnnouncement && (
              <div
                data-testid="action-warning-toast"
                role="alert"
                className="pointer-events-none px-3 py-1 rounded-full bg-[#4a1814]/95 border border-[#f87171] text-[10px] sm:text-[11px] font-extrabold text-[#fee2e2] shadow-xl max-w-[92vw] text-center"
              >
                {actionWarningToast}
              </div>
            )}

            {/* Non-blocking Floating Armed Prop Pill (BUG-01) */}
            {activePropTool &&
              me.isAlive &&
              phase !== 'night' &&
              !nightDeathCinematic &&
              !gmAnnouncement && (
                <div
                  data-testid="armed-prop-pill"
                  className="pointer-events-none flex items-center justify-center max-w-[94vw]"
                >
                  <div className="px-2.5 py-1 rounded-full bg-[#381d0c]/95 border border-[#f59e0b] text-[10px] sm:text-[11px] font-extrabold text-[#fef3c7] shadow-xl flex items-center gap-2">
                    <span className="truncate">
                      {t.holdingPropBanner(t.propButtons[activePropTool])}
                    </span>
                    <button
                      type="button"
                      data-testid="cancel-armed-prop-btn"
                      onClick={() => setActivePropTool(null)}
                      className="pointer-events-auto px-2 py-0.5 rounded-full bg-[#7c2d12] hover:bg-[#9a3412] border border-[#fdba74]/70 text-[#ffedd5] text-[10px] font-black cursor-pointer shrink-0"
                    >
                      × {t.dropPropBtn}
                      <span className="hidden sm:inline"> / Esc</span>
                    </button>
                  </div>
                </div>
              )}

            {/* Non-blocking Role Callout Audio/Quote Toast Pill */}
            {roleCalloutToast && !nightDeathCinematic && !gmAnnouncement && !showMyRoleModal && (
              <div
                data-testid="role-callout-toast"
                aria-live="polite"
                className="pointer-events-none px-3 py-1 rounded-full bg-[#1a110a]/92 border border-[#e89c3e]/75 text-[10px] sm:text-[11px] font-bold text-[#fde7c3] shadow-lg max-w-[92vw] flex items-center gap-1.5"
              >
                <span className="text-[#f5b82e] font-extrabold shrink-0">
                  {ROLES[roleCalloutToast.roleId].name[lang]}:
                </span>
                <span className="truncate">{roleCalloutToast.quote}</span>
              </div>
            )}

            {/* Ghost Soul Free-Flight Banner when User is Dead (merged into direct-look banner when in FPV/TPV) */}
            {!me.isAlive && !isDirectLookCam && !nightDeathCinematic && (
              <div
                data-testid="ghost-locked-banner"
                className="pointer-events-none px-2.5 py-0.5 rounded-full bg-cyan-950/95 border border-cyan-400/60 text-[10px] font-bold text-cyan-200 flex items-center gap-1.5 shadow-lg max-w-[94vw]"
              >
                <Ghost className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span className="sm:hidden truncate">{t.ghostFloatingBadge}</span>
                <span className="hidden sm:inline truncate">{t.ghostFlightBanner}</span>
              </div>
            )}

            {/* Direct-Look (First-Person or Behind-the-Back) Active Status Pill */}
            {isDirectLookCam && !isNightBlindfolded && !nightDeathCinematic && (
              <div
                data-testid="fpv-active-banner"
                className={`pointer-events-none px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1.5 shadow-lg max-w-[94vw] whitespace-nowrap border ${
                  !me.isAlive
                    ? 'bg-cyan-950/95 border-cyan-400/60 text-cyan-200'
                    : 'bg-emerald-950/95 border-emerald-400/60 text-emerald-200'
                }`}
              >
                {!me.isAlive ? (
                  <Ghost className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                ) : (
                  <View className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                )}
                <span className="sm:hidden truncate">
                  {!me.isAlive
                    ? t.ghostFloatingBadge
                    : cameraPreset === 'third_person'
                    ? t.behindCamShort
                    : t.fpvShort}
                </span>
                <span className="hidden sm:inline truncate">
                  {!me.isAlive
                    ? t.ghostFlightBanner
                    : cameraPreset === 'third_person'
                    ? t.behindViewBanner
                    : t.firstPersonBanner}
                </span>
              </div>
            )}
          </div>

          {/* CLICKABLE RETURN-TO-SEAT BUTTON (Shown whenever the player stands up & walks around) */}
          {shellState === 'playing' &&
            isUserRoaming &&
            me.isAlive &&
            !isNightBlindfolded &&
            !nightDeathCinematic && (
              <div className="mx-auto mb-2 pointer-events-auto flex justify-center">
                <button
                  type="button"
                  data-testid="return-to-seat-btn"
                  onClick={handleReturnToSeat}
                  className="px-4 py-2 rounded-2xl bg-[#382313]/95 hover:bg-[#b84b10] border-2 border-[#f5b82e] text-white font-extrabold text-xs sm:text-sm flex items-center gap-2 shadow-2xl transition-all active:scale-95 cursor-pointer"
                >
                  <span>🪑</span>
                  <span>{t.sitBackBtn}</span>
                </button>
              </div>
            )}

          {/* MOBILE & OPEN-WORLD VIRTUAL D-PAD (Hidden on < lg when bottom dock is expanded so seats are never occluded) */}
          {canUseVirtualDpad && isDockCollapsed && (() => {
            const holdProps = (onStart: () => void, onEnd: () => void) => ({
              onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
                e.preventDefault();
                try {
                  e.currentTarget.setPointerCapture(e.pointerId);
                } catch {
                  // ignore synthetic events
                }
                onStart();
              },
              onPointerUp: (e: React.PointerEvent<HTMLButtonElement>) => {
                try {
                  if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                    e.currentTarget.releasePointerCapture(e.pointerId);
                  }
                } catch {
                  // ignore
                }
                onEnd();
              },
              onPointerCancel: onEnd,
              onLostPointerCapture: onEnd,
              onPointerLeave: onEnd,
            });
            const showTurnBtns = isDirectLookCam || !me.isAlive;
            return (
              <div
                data-testid="virtual-dpad"
                className="lg:hidden fixed bottom-16 right-2 sm:right-auto sm:bottom-20 sm:left-3 z-30 pointer-events-auto touch-none select-none flex flex-col items-center gap-1 agrou-wood-panel p-1.5 rounded-xl shadow-lg"
              >
                <span className="text-[10px] font-mono uppercase text-[#f2be6b] font-bold leading-tight">
                  {isDirectLookCam && me.isAlive
                    ? cameraPreset === 'third_person'
                      ? t.behindCamShort
                      : t.dpadWalkFpv
                    : me.isAlive
                    ? t.dpadWalkNight
                    : t.dpadFlyGhost}
                </span>
                <div className="flex items-center gap-1">
                  {showTurnBtns && (
                    <button
                      type="button"
                      data-testid="fpv-turn-left-btn"
                      {...holdProps(
                        () => setFpvLookTurnRate(-1),
                        () => setFpvLookTurnRate(0)
                      )}
                      className="w-10 h-10 touch-none select-none rounded-lg bg-[#1d3a27] border border-emerald-500/40 text-emerald-300 active:bg-emerald-500 active:text-slate-950 flex items-center justify-center cursor-pointer"
                      aria-label="Turn Look Left"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    data-testid="dpad-up-btn"
                    {...holdProps(
                      () => setMoveVector({ x: 0, z: -1 }),
                      () => setMoveVector({ x: 0, z: 0 })
                    )}
                    className="w-10 h-10 touch-none select-none rounded-lg bg-[#352316] border border-[#6a4a2f] text-[#f5e6cc] active:bg-[#b84b10] active:text-white flex items-center justify-center cursor-pointer"
                    aria-label="Move Up"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  {showTurnBtns && (
                    <button
                      type="button"
                      data-testid="fpv-turn-right-btn"
                      {...holdProps(
                        () => setFpvLookTurnRate(1),
                        () => setFpvLookTurnRate(0)
                      )}
                      className="w-10 h-10 touch-none select-none rounded-lg bg-[#1d3a27] border border-emerald-500/40 text-emerald-300 active:bg-emerald-500 active:text-slate-950 flex items-center justify-center cursor-pointer"
                      aria-label="Turn Look Right"
                    >
                      <RotateCw className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    data-testid="dpad-left-btn"
                    {...holdProps(
                      () => setMoveVector({ x: -1, z: 0 }),
                      () => setMoveVector({ x: 0, z: 0 })
                    )}
                    className="w-10 h-10 touch-none select-none rounded-lg bg-[#352316] border border-[#6a4a2f] text-[#f5e6cc] active:bg-[#b84b10] active:text-white flex items-center justify-center cursor-pointer"
                    aria-label="Move Left"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    data-testid="dpad-down-btn"
                    {...holdProps(
                      () => setMoveVector({ x: 0, z: 1 }),
                      () => setMoveVector({ x: 0, z: 0 })
                    )}
                    className="w-10 h-10 touch-none select-none rounded-lg bg-[#352316] border border-[#6a4a2f] text-[#f5e6cc] active:bg-[#b84b10] active:text-white flex items-center justify-center cursor-pointer"
                    aria-label="Move Down"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    data-testid="dpad-right-btn"
                    {...holdProps(
                      () => setMoveVector({ x: 1, z: 0 }),
                      () => setMoveVector({ x: 0, z: 0 })
                    )}
                    className="w-10 h-10 touch-none select-none rounded-lg bg-[#352316] border border-[#6a4a2f] text-[#f5e6cc] active:bg-[#b84b10] active:text-white flex items-center justify-center cursor-pointer"
                    aria-label="Move Right"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Living FPV/TPV: Jump + Return to Seat */}
                {me.isAlive && isDirectLookCam && (
                  <div className="mt-0.5 flex items-center gap-1 w-full">
                    <button
                      type="button"
                      data-testid="dpad-jump-btn"
                      onClick={() => setJumpTriggerSeq((n) => n + 1)}
                      aria-label={lang === 'vi' ? 'Nhảy' : 'Jump'}
                      className="flex-1 min-h-[36px] touch-none select-none px-2 py-1 rounded-md bg-[#1d3a27] active:bg-emerald-500 active:text-slate-950 border border-emerald-400/60 text-[10px] font-extrabold text-emerald-200 cursor-pointer"
                    >
                      ⬆ {lang === 'vi' ? 'Nhảy' : 'Jump'}
                    </button>
                    <button
                      type="button"
                      data-testid="dpad-return-seat-btn"
                      onClick={handleReturnToSeat}
                      aria-label={t.sitBackBtn}
                      className="flex-1 min-h-[36px] touch-none select-none px-2 py-1 rounded-md bg-[#4a2d17] active:bg-[#b84b10] border border-[#f5b82e]/70 text-[10px] font-extrabold text-white cursor-pointer"
                    >
                      🪑 {t.sitShort}
                    </button>
                  </div>
                )}

                {me.isAlive && !isDirectLookCam && isUserRoaming && (
                  <button
                    type="button"
                    data-testid="dpad-return-seat-btn"
                    onClick={handleReturnToSeat}
                    className="mt-0.5 w-full min-h-[36px] touch-none select-none px-2 py-1 rounded-md bg-[#4a2d17] hover:bg-[#b84b10] border border-[#f5b82e]/70 text-[10px] font-extrabold text-white cursor-pointer"
                  >
                    🪑 {t.sitShort}
                  </button>
                )}

                {/* Ghost Flight Controls: Fly Up, Fly Down, Return to Grave */}
                {!me.isAlive && (
                  <div className="mt-0.5 flex flex-col gap-1 w-full">
                    <div className="flex items-center gap-1 w-full">
                      <button
                        type="button"
                        data-testid="dpad-fly-up-btn"
                        {...holdProps(
                          () => setGhostVerticalRate(1),
                          () => setGhostVerticalRate(0)
                        )}
                        aria-label={lang === 'vi' ? 'Bay Lên' : 'Fly Up'}
                        className="flex-1 min-h-[36px] touch-none select-none px-1.5 py-1 rounded-md bg-cyan-950/90 active:bg-cyan-500 active:text-slate-950 border border-cyan-400/60 text-[10px] font-extrabold text-cyan-200 cursor-pointer"
                      >
                        ↑ {lang === 'vi' ? 'Lên' : 'Up'}
                      </button>
                      <button
                        type="button"
                        data-testid="dpad-fly-down-btn"
                        {...holdProps(
                          () => setGhostVerticalRate(-1),
                          () => setGhostVerticalRate(0)
                        )}
                        aria-label={lang === 'vi' ? 'Bay Xuống' : 'Fly Down'}
                        className="flex-1 min-h-[36px] touch-none select-none px-1.5 py-1 rounded-md bg-cyan-950/90 active:bg-cyan-500 active:text-slate-950 border border-cyan-400/60 text-[10px] font-extrabold text-cyan-200 cursor-pointer"
                      >
                        ↓ {lang === 'vi' ? 'Xuống' : 'Down'}
                      </button>
                    </div>
                    <button
                      type="button"
                      data-testid="dpad-return-grave-btn"
                      onClick={handleReturnToSeat}
                      aria-label={lang === 'vi' ? 'Về Mộ' : 'Return to Grave'}
                      className="w-full min-h-[36px] touch-none select-none px-2 py-1 rounded-md bg-[#2a1d36] active:bg-purple-600 border border-purple-400/60 text-[10px] font-extrabold text-purple-100 cursor-pointer"
                    >
                      🪦 {lang === 'vi' ? 'Về Mộ' : 'Grave'}
                    </button>
                  </div>
                )}
              </div>
            );
          })()}

          {/* UNIFIED COLLAPSIBLE BOTTOM CONTROL DOCK (Hidden while Night Blindfolded or Night Death Cinematic active) */}
          {!isNightBlindfolded && !nightDeathCinematic && (
          <div className="mx-auto w-full max-w-[1220px] pointer-events-auto flex flex-col items-center">
            {/* Subtle Desktop Movement Controls Legend (Living players only — Ghost has single top banner, BUG-14/BUG-40) */}
            {!isDirectLookCam && !showOnboardingTour && me.isAlive && (
              <div
                data-testid="movement-controls-legend"
                className="hidden md:flex items-center gap-2 mb-1 px-2.5 py-0.5 rounded-full bg-[#19110b]/88 border border-[#5e4128]/70 text-[10px] text-[#e4cda9] font-semibold shadow"
              >
                <span>
                  <strong className="text-[#f5b82e]">WASD</strong>{' '}
                  {lang === 'vi' ? 'Đứng dậy & Đi' : 'Stand & Walk'}
                </span>
                <span className="opacity-40">·</span>
                <span>
                  <strong className="text-[#f5b82e]">
                    {lang === 'vi' ? 'Kéo chuột' : 'Drag'}
                  </strong>{' '}
                  {lang === 'vi' ? 'Xoay 360°' : 'Look 360°'}
                </span>
                <span className="opacity-40">·</span>
                <span>
                  <strong className="text-[#f5b82e]">Shift</strong>{' '}
                  {lang === 'vi' ? 'Chạy nhanh' : 'Sprint'}
                </span>
                <span className="opacity-40">·</span>
                <span>
                  <strong className="text-[#f5b82e]">Space</strong>{' '}
                  {lang === 'vi' ? 'Nhảy' : 'Jump'}
                </span>
                <span className="opacity-40">·</span>
                <span>
                  <strong className="text-[#f5b82e]">X</strong>{' '}
                  {lang === 'vi' ? 'Về ghế' : 'Sit'}
                </span>
              </div>
            )}
            <button
              type="button"
              onClick={() => setIsDockCollapsed(!isDockCollapsed)}
              className="px-3 py-0.5 rounded-t-xl bg-[#261a12]/95 border-t border-x border-[#6a4a2f] text-[9px] sm:text-[10px] font-bold text-[#f2be6b] flex items-center gap-1 cursor-pointer"
            >
              {isDockCollapsed && !showOnboardingTour ? (
                <>
                  <ChevronUp className="w-3 h-3" />
                  <span>{t.expandDock.replace(/\s*\[H\]/g, '')}</span>
                  <span className="hidden sm:inline opacity-75">[H]</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-3 h-3" />
                  <span>{t.collapseDock.replace(/\s*\[H\]/g, '')}</span>
                  <span className="hidden sm:inline opacity-75">[H]</span>
                </>
              )}
            </button>

            {(!isDockCollapsed || showOnboardingTour) && (
              <div className="w-full space-y-1.5">
                {/* Agrou 3D Campfire Emote Wheel & Fun Props Popover */}
                {activeToolPopover === 'props' && (
                  <AgrouEmoteWheel
                    lang={lang}
                    isDayPhase={phase !== 'night'}
                    isAlive={me.isAlive}
                    activePropTool={activePropTool}
                    onTriggerEmote={(emote) => handleTriggerEmote(emote, me.id)}
                    onSelectPropTool={setActivePropTool}
                    onClose={() => setActiveToolPopover('none')}
                  />
                )}

                {/* Collapsible Voice Popover */}
                {activeToolPopover === 'voice' && (
                  <div className="w-full">
                    <VoiceChatBar
                      players={players}
                      userPlayerId={me.id}
                      phase={phase}
                      isPlayerAwakeAtNight={isPlayerAwakeAtNight}
                      isMicOn={isMicOn && me.isAlive}
                      onToggleMic={handleToggleMicSafe}
                      activeSpeakers={activeSpeakers}
                      onTriggerUserSpeech={(transcript) => {
                        if (!me.isAlive) return;
                        setActiveSpeakers((prev) =>
                          prev.includes(me.name) ? prev : [me.name, ...prev]
                        );
                        const speechMsg: ChatMessage = {
                          id: `voice_${Date.now()}`,
                          senderId: me.id,
                          senderName: `🎙️ ${me.name}`,
                          text: transcript,
                          timestamp: Date.now(),
                          isGhost: false,
                        };
                        setMessages((prev) => [...prev, speechMsg]);
                        if (gameMode === 'online') {
                          realtimeClient.sendChat(roomId, speechMsg);
                        }
                      }}
                      lang={lang}
                      compact={true}
                      onClose={() => setActiveToolPopover('none')}
                    />
                  </div>
                )}

                <div
                  data-tour-id="bottom-dock"
                  className="w-full agrou-wood-panel rounded-xl sm:rounded-2xl p-1.5 sm:p-2.5 space-y-1 sm:space-y-1.5"
                >
                {/* Contextual Role Power & Action Strip */}
                <div className="flex items-center justify-between gap-1 border-b border-[#5e422b]/80 pb-1">
                  <div className="flex flex-wrap items-center gap-1 text-xs min-w-0">
                    <span className="hidden sm:inline-flex px-1.5 py-0.5 rounded-lg bg-[#3c2717] border border-[#8e6338] text-[#f5c879] font-bold text-[10px] sm:text-[11px] whitespace-nowrap">
                      {t.yourRolePrefix} {myRole.name[lang]}
                    </span>

                    {/* Cupid Lover Partner Badge (for Lovers OR Cupid's linked pair) */}
                    {me.loverId ? (
                      <span className="px-1.5 py-0.5 rounded-lg bg-pink-950 border border-pink-500/60 text-pink-200 font-bold text-[10px] whitespace-nowrap">
                        💘 {players.find((p) => p.id === me.loverId)?.name || t.loverLabel}
                      </span>
                    ) : me.roleId === 'cupid' && cupidLovers?.[0] && cupidLovers?.[1] ? (
                      <span
                        data-testid="cupid-linked-pair-badge"
                        className="px-1.5 py-0.5 rounded-lg bg-pink-950 border border-pink-500/60 text-pink-200 font-bold text-[10px] whitespace-nowrap"
                      >
                        💘 {players.find((p) => p.id === cupidLovers[0])?.name || '?'} &amp;{' '}
                        {players.find((p) => p.id === cupidLovers[1])?.name || '?'}
                      </span>
                    ) : null}

                    {/* Werewolf Self-Kill / Mindgame Hint */}
                    {phase === 'night' &&
                      (me.roleId === 'werewolf' || me.roleId === 'wolf_pup') &&
                      me.isAlive && (
                        <span className="hidden md:inline text-[10px] text-rose-300 font-semibold truncate">
                          {t.wolfMindgameHint}
                        </span>
                      )}

                    {/* Seer Inspection Result Badge */}
                    {seerInspectResult && (
                      <span className="px-1.5 py-0.5 rounded-lg bg-purple-950 border border-purple-500 text-purple-200 font-bold text-[10px]">
                        🔮 {seerInspectResult}
                      </span>
                    )}
                  </div>

                  {/* Tool Drawer & Popover Toggles */}
                  <div className="flex items-center gap-1 overflow-x-auto shrink-0">
                    {/* Agrou Parchment Deduction Notebook Toggle [N] */}
                    <button
                      type="button"
                      data-testid="toggle-notebook-btn"
                      aria-label={t.notebookBtn}
                      onClick={() => {
                        sound.playCardFlip();
                        toggleNotebookPanel();
                      }}
                      className={`min-h-[36px] min-w-[36px] sm:min-h-0 sm:min-w-0 px-2 py-0.5 sm:py-1 rounded-lg text-[10px] font-bold border flex items-center justify-center gap-1 cursor-pointer shrink-0 ${
                        isNotebookOpen
                          ? 'bg-[#e8c682] border-[#f6e2b4] text-[#2c1a0d]'
                          : 'bg-[#362417] border-[#785334] text-[#f2d08f] hover:bg-[#493120]'
                      }`}
                    >
                      <BookMarked className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
                      <span className="hidden sm:inline">{t.notebookBtn}</span>
                    </button>

                    {phase !== 'night' && me.isAlive && (
                      <button
                        type="button"
                        data-testid="toggle-props-popover-btn"
                        aria-label={t.emotesAndProps}
                        onClick={() => toggleToolPopoverPanel('props')}
                        className={`min-h-[36px] min-w-[36px] sm:min-h-0 sm:min-w-0 px-2 py-0.5 sm:py-1 rounded-lg text-[10px] font-bold border flex items-center justify-center gap-1 cursor-pointer shrink-0 ${
                          activeToolPopover === 'props' || activePropTool
                            ? 'bg-[#b84b10] hover:bg-[#9e3f0c] border-[#ffc389] text-white'
                            : 'bg-[#362417] border-[#69482e] text-[#f3ca82] hover:bg-[#493120]'
                        }`}
                      >
                        <span>🎭</span>
                        <span className="hidden sm:inline">{t.emotesAndProps}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      data-testid="toggle-voice-popover-btn"
                      aria-label={!me.isAlive ? t.micLockedShort : t.voiceBtn}
                      onClick={() => toggleToolPopoverPanel('voice')}
                      className={`min-h-[36px] min-w-[36px] sm:min-h-0 sm:min-w-0 px-2 py-0.5 sm:py-1 rounded-lg text-[10px] font-bold border flex items-center justify-center gap-1 cursor-pointer shrink-0 ${
                        !me.isAlive
                          ? 'bg-[#2a1518] border-rose-500/50 text-rose-300'
                          : activeToolPopover === 'voice' || isMicOn
                          ? 'bg-emerald-700 border-emerald-400 text-white'
                          : 'bg-[#302016] border-[#61422a] text-emerald-300 hover:bg-[#422c1e]'
                      }`}
                    >
                      {!me.isAlive ? <Lock className="w-3.5 h-3.5 sm:w-3 sm:h-3" /> : <Mic className="w-3.5 h-3.5 sm:w-3 sm:h-3" />}
                      <span className="hidden sm:inline">
                        {!me.isAlive ? t.micLockedShort : t.voiceBtn}
                      </span>
                    </button>

                    <button
                      type="button"
                      aria-label={t.drawerChatTitle}
                      onClick={() => toggleDrawerPanel('chat')}
                      className={`min-h-[36px] sm:min-h-0 px-2 py-0.5 sm:py-1 rounded-lg text-[10px] font-bold border flex items-center justify-center gap-1 cursor-pointer shrink-0 ${
                        activeDrawer === 'chat'
                          ? 'bg-[#b33228] border-[#f4a296] text-white'
                          : 'bg-[#302016] border-[#61422a] text-[#efe0c4] hover:bg-[#422c1e]'
                      }`}
                    >
                      <MessageSquare className="w-3.5 h-3.5 sm:w-3 sm:h-3 text-[#f2955e]" />
                      <span>
                        {t.chatBtn} ({messages.length})
                      </span>
                    </button>

                    {gameMode === 'gm' && (
                      <>
                        <button
                          type="button"
                          aria-label={t.drawerGMTitle}
                          onClick={() => toggleDrawerPanel('gm')}
                          className={`min-h-[36px] sm:min-h-0 px-2 py-0.5 sm:py-1 rounded-lg text-[10px] font-bold border flex items-center justify-center gap-1 cursor-pointer shrink-0 ${
                            activeDrawer === 'gm'
                              ? 'bg-[#d9842c] border-[#f7cf86] text-[#211308]'
                              : 'bg-[#302016] border-[#61422a] text-[#f2be6b] hover:bg-[#422c1e]'
                          }`}
                        >
                          <Shield className="w-3 h-3" />
                          <span>{t.gmBtn}</span>
                        </button>

                        <button
                          type="button"
                          aria-label={t.drawerCardsTitle}
                          onClick={() => toggleDrawerPanel('cards')}
                          className={`min-h-[36px] sm:min-h-0 px-2 py-0.5 sm:py-1 rounded-lg text-[10px] font-bold border flex items-center justify-center gap-1 cursor-pointer shrink-0 ${
                            activeDrawer === 'cards'
                              ? 'bg-purple-700 border-purple-400 text-white'
                              : 'bg-[#302016] border-[#61422a] text-purple-300 hover:bg-[#422c1e]'
                          }`}
                        >
                          <Smartphone className="w-3 h-3" />
                          <span>{t.cardsBtn}</span>
                        </button>
                      </>
                    )}

                    <button
                      type="button"
                      aria-label={t.drawerLeaderboardTitle}
                      onClick={() => toggleDrawerPanel('leaderboard')}
                      className="min-h-[36px] min-w-[36px] sm:min-h-0 sm:min-w-0 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-lg bg-[#302016] border border-[#61422a] text-[10px] font-bold text-[#f4cb74] hover:bg-[#422c1e] flex items-center justify-center gap-1 cursor-pointer shrink-0"
                    >
                      <Trophy className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
                      <span className="hidden sm:inline">{t.leaderboardShort}</span>
                    </button>

                    <button
                      type="button"
                      aria-label={t.drawerHistoryTitle}
                      onClick={() => toggleDrawerPanel('history')}
                      className="min-h-[36px] min-w-[36px] sm:min-h-0 sm:min-w-0 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-lg bg-[#302016] border border-[#61422a] text-[10px] font-bold text-[#95cbf0] hover:bg-[#422c1e] flex items-center justify-center gap-1 cursor-pointer shrink-0"
                    >
                      <History className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
                      <span className="hidden sm:inline">{t.historyShort}</span>
                    </button>

                    <button
                      type="button"
                      aria-label={t.drawerRulesTitle}
                      onClick={() => toggleDrawerPanel('encyclopedia')}
                      className="min-h-[36px] min-w-[36px] sm:min-h-0 sm:min-w-0 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-lg bg-[#302016] border border-[#61422a] text-[10px] font-bold text-[#8cd8a8] hover:bg-[#422c1e] flex items-center justify-center gap-1 cursor-pointer shrink-0"
                    >
                      <BookOpen className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
                      <span className="hidden sm:inline">{t.rulesShort}</span>
                    </button>
                  </div>
                </div>

                {/* Player Seat Strip (Compact side-by-side <=8 on desktop so #1-#8 never clip at 1280x800) */}
                <div
                  className={
                    players.length >= 10
                      ? 'grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-1 sm:gap-1.5 pb-0.5 max-h-[116px] sm:max-h-none overflow-y-auto'
                      : 'flex items-center gap-1 sm:gap-1.5 overflow-x-auto md:overflow-x-visible pb-0.5'
                  }
                >
                  {players.map((p, idx) => {
                    const isDayVoting = phase === 'day_voting';
                    const cupidSelectedIds =
                      me.roleId === 'cupid' ? (cupidLovers || []).filter(Boolean) : [];
                    const isCupidSelectingNight1 =
                      phase === 'night' && me.roleId === 'cupid' && round === 1;
                    const isSelected = isDayVoting
                      ? selectedTargetId === p.id
                      : isCupidSelectingNight1
                      ? cupidSelectedIds.includes(p.id)
                      : selectedTargetId === p.id || secondWolfTargetId === p.id;
                    const vCount = votesMap[p.id] || 0;
                    const voterLabels = votersByTargetLabels[p.id] || [];
                    const isMyLover = me.loverId === p.id;
                    const isCupidPairedSeat =
                      me.roleId === 'cupid' &&
                      Boolean(
                        cupidLovers &&
                          cupidLovers[0] &&
                          cupidLovers[1] &&
                          (cupidLovers[0] === p.id || cupidLovers[1] === p.id)
                      );
                    const isLoverIndicator = isMyLover || isCupidPairedSeat;
                    const isMyDoppelModel =
                      me.roleId === 'doppelganger' &&
                      (doppelgangerTargetId === p.id || me.targetPlayerId === p.id);
                    const isMayorSeat = mayorId === p.id && p.isAlive;
                    const isMyWolfPackmate =
                      p.id !== me.id &&
                      (me.roleId === 'werewolf' || me.roleId === 'wolf_pup') &&
                      (p.roleId === 'werewolf' || p.roleId === 'wolf_pup');
                    const isBodyguardRepeatTarget =
                      phase === 'night' &&
                      me.isAlive &&
                      me.roleId === 'bodyguard' &&
                      currentNightStep?.key === 'bodyguard' &&
                      Boolean(p.protectedLastNight);
                    const suspectTag = suspectTags[p.id];
                    const nbTrust = notebook.playerNotes[p.id]?.trust;
                    const effectiveTrust: 'trusted' | 'suspicious' | 'wolf_lock' | undefined =
                      nbTrust && nbTrust !== 'unknown'
                        ? nbTrust
                        : suspectTag === 'trusted'
                        ? 'trusted'
                        : suspectTag === 'wolf_suspect'
                        ? 'wolf_lock'
                        : undefined;
                    const isPropInvalidTarget =
                      Boolean(activePropTool) &&
                      (phase === 'day_discussion' || phase === 'day_voting') &&
                      (!me.isAlive || !p.isAlive || p.id === me.id);
                    const isVoteLockedOut =
                      (isDayVoting && (!me.isAlive || !p.isAlive || p.id === me.id)) ||
                      isPropInvalidTarget;

                    const seatTooltip = [
                      p.name,
                      isBodyguardRepeatTarget
                        ? lang === 'vi'
                          ? '🛡️ Đã bảo vệ đêm qua (không thể chọn liên tiếp)'
                          : '🛡️ Protected last night (no consecutive repeat)'
                        : '',
                      isLoverIndicator ? `💘 ${t.loverLabel}` : '',
                      vCount > 0 ? `${vCount} ${t.votesUnit}: ${voterLabels.join(', ')}` : '',
                    ]
                      .filter(Boolean)
                      .join(' — ');

                    return (
                      <button
                        key={p.id}
                        type="button"
                        data-testid={`dock-player-${p.id}`}
                        aria-pressed={isSelected}
                        aria-disabled={isVoteLockedOut || isBodyguardRepeatTarget}
                        disabled={isVoteLockedOut}
                        title={seatTooltip}
                        onClick={() => handleSelect3DPlayer(p.id)}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          handleTogglePlayerSuspectTag(p.id);
                        }}
                        className={`${
                          players.length < 10 ? 'shrink-0 md:shrink md:flex-1 md:min-w-0' : 'min-w-0'
                        } px-2 py-1.5 md:px-1.5 md:py-1 rounded-lg sm:rounded-xl border text-left transition-all flex items-center gap-1 sm:gap-1.5 ${
                          isVoteLockedOut || isBodyguardRepeatTarget
                            ? 'opacity-45 cursor-not-allowed'
                            : 'cursor-pointer'
                        } ${
                          !p.isAlive
                            ? 'bg-[#1a1512]/70 border-cyan-900/50 text-cyan-300/75'
                            : isBodyguardRepeatTarget
                            ? 'bg-[#1e1a18] border-slate-600/70 text-slate-400'
                            : isSelected
                            ? isCupidSelectingNight1
                              ? 'bg-[#7d1f4b] border-[#f472b6] ring-2 ring-pink-400/80 text-pink-50 shadow-lg'
                              : isDayVoting
                              ? 'bg-[#8f261e] border-[#f4c062] ring-2 ring-[#f4c062]/80 text-white shadow-lg'
                              : 'bg-[#73231d] border-[#e6786b] text-rose-100 shadow-md'
                            : isDayVoting
                            ? 'bg-[#2a1d14] border-[#5f432b] text-[#f4e7cf] hover:border-[#f2be6b]'
                            : effectiveTrust === 'wolf_lock'
                            ? 'bg-[#5a1e1a] border-[#d9534f] text-rose-100'
                            : effectiveTrust === 'suspicious'
                            ? 'bg-[#4d3012] border-[#d9912b] text-amber-100'
                            : effectiveTrust === 'trusted'
                            ? 'bg-[#19402b] border-[#42a870] text-emerald-100'
                            : p.id === me.id
                            ? 'bg-[#3b2919] border-[#e8a346] text-[#fff1d4]'
                            : isMyDoppelModel
                            ? 'bg-fuchsia-950/80 border-fuchsia-400/70 text-fuchsia-100'
                            : isLoverIndicator
                            ? 'bg-pink-950/80 border-pink-500/60 text-pink-100'
                            : isMyWolfPackmate
                            ? 'bg-[#4f1c19] border-[#c4453d] text-rose-100'
                            : 'bg-[#241911] border-[#4f3825] text-[#f0e3cb] hover:border-[#a87544]'
                        }`}
                      >
                        <span className="text-xs sm:text-sm shrink-0">{p.isAlive ? p.avatar : '👻'}</span>
                        <div className="min-w-0 flex-1 overflow-hidden">
                          <div className="text-[9px] sm:text-[11px] font-bold flex items-center gap-0.5 sm:gap-1 min-w-0">
                            <span className="text-[#f2be6b] font-mono shrink-0">#{idx + 1}</span>
                            <span className="truncate min-w-0 flex-1">{p.name}</span>
                            {isMayorSeat && (
                              <span
                                className="inline-flex items-center text-[#f7cb66] shrink-0"
                                title={t.mayorBadge}
                              >
                                <Crown className="w-2.5 h-2.5" />
                              </span>
                            )}
                            {isDayVoting && isSelected && (
                              <span className="px-1 rounded bg-[#f4c062] text-[#221409] text-[8px] font-black uppercase shrink-0">
                                ✓<span className="hidden xl:inline"> {t.voteAction}</span>
                              </span>
                            )}
                            {isBodyguardRepeatTarget && (
                              <span
                                data-testid={`guard-repeat-badge-${p.id}`}
                                className="px-1 rounded bg-slate-700 text-slate-200 text-[8px] font-extrabold shrink-0 whitespace-nowrap"
                              >
                                🛡️ {t.nightLabel}
                              </span>
                            )}
                            {isMyDoppelModel && <span className="shrink-0" title={t.doppelModelLabel}>🪞</span>}
                            {(isLoverIndicator || (isCupidSelectingNight1 && isSelected)) && (
                              <span className="shrink-0" title={t.loverLabel}>💘</span>
                            )}
                            {isMyWolfPackmate && <span className="shrink-0" title={t.wolfAllyLabel}>🐺</span>}
                            {effectiveTrust === 'wolf_lock' && (
                              <span
                                className="px-1 rounded bg-rose-700 text-white text-[8px] font-extrabold shrink-0"
                                title={t.suspectLabel}
                              >
                                🐺!
                              </span>
                            )}
                            {effectiveTrust === 'suspicious' && (
                              <span
                                className="px-1 rounded bg-amber-600 text-white text-[8px] font-extrabold shrink-0"
                                title={t.suspectLabel}
                              >
                                🤔?
                              </span>
                            )}
                            {effectiveTrust === 'trusted' && (
                              <span
                                className="px-1 rounded bg-emerald-700 text-white text-[8px] font-extrabold shrink-0"
                                title={t.trustedLabel}
                              >
                                🛡️✓
                              </span>
                            )}
                            {vCount > 0 && (
                              <span className="sm:hidden px-1 rounded bg-[#b92e25] text-white text-[8px] font-mono shrink-0">
                                {vCount}
                              </span>
                            )}
                          </div>
                          <div className="hidden sm:block text-[9px] font-mono text-[#d4bea1] leading-tight w-full truncate">
                            {!me.isAlive
                              ? `${!p.isAlive ? '👻 ' : ''}${ROLES[p.roleId].name[lang]}${
                                  vCount > 0 ? ` · ${vCount} ${t.votesUnit}` : ''
                                }`
                              : !p.isAlive
                              ? t.ghostStatus
                              : isBodyguardRepeatTarget
                              ? `🛡️ ${t.nightLabel}`
                              : vCount > 0
                              ? `${vCount} ${t.votesUnit} · ${voterLabels.join(', ')}`
                              : effectiveTrust === 'wolf_lock'
                              ? `🐺 ${t.suspectLabel}`
                              : effectiveTrust === 'suspicious'
                              ? `🤔 ${t.suspectLabel}`
                              : effectiveTrust === 'trusted'
                              ? `🛡️ ${t.trustedLabel}`
                              : p.id === me.id
                              ? ROLES[p.roleId].name[lang]
                              : isMyDoppelModel
                              ? t.doppelModelLabel
                              : isLoverIndicator
                              ? t.loverLabel
                              : isMyWolfPackmate
                              ? t.wolfAllyLabel
                              : t.aliveStatus}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
              </div>
            )}
          </div>
          )}
        </div>
      )}

      {/* 4. MODAL DRAWERS FOR CHAT, GM ASSISTANT, VIRTUAL CARDS, LEADERBOARD, HISTORY, ENCYCLOPEDIA */}
      {activeDrawer !== 'none' && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={
            activeDrawer === 'chat'
              ? t.drawerChatTitle
              : activeDrawer === 'gm'
              ? t.drawerGMTitle
              : activeDrawer === 'cards'
              ? t.drawerCardsTitle
              : activeDrawer === 'leaderboard'
              ? t.drawerLeaderboardTitle
              : activeDrawer === 'history'
              ? t.drawerHistoryTitle
              : t.drawerRulesTitle
          }
          onClick={() => {
            if (gameMode === 'gm' && (activeDrawer === 'gm' || activeDrawer === 'cards')) {
              setActiveDrawer('none');
              setShellState('title');
            } else {
              setActiveDrawer('none');
            }
          }}
          className="fixed inset-0 z-40 flex items-center justify-center p-2.5 sm:p-4 pointer-events-auto"
          style={{ backgroundColor: 'rgba(12, 8, 5, 0.84)' }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-5xl max-h-[88vh] agrou-wood-panel rounded-2xl p-3.5 sm:p-5 overflow-y-auto shadow-2xl"
          >
            <div className="sticky top-0 z-20 bg-[#231810]/95 -mx-3.5 sm:-mx-5 px-3.5 sm:px-5 pt-1 flex items-center justify-between border-b border-slate-800 pb-3 mb-4 gap-2">
              <span className="text-xs font-mono uppercase tracking-widest text-amber-400 font-bold truncate">
                {activeDrawer === 'chat'
                  ? t.drawerChatTitle
                  : activeDrawer === 'gm'
                  ? t.drawerGMTitle
                  : activeDrawer === 'cards'
                  ? t.drawerCardsTitle
                  : activeDrawer === 'leaderboard'
                  ? t.drawerLeaderboardTitle
                  : activeDrawer === 'history'
                  ? t.drawerHistoryTitle
                  : t.drawerRulesTitle}
              </span>
              <button
                type="button"
                onClick={() => {
                  if (gameMode === 'gm' && (activeDrawer === 'gm' || activeDrawer === 'cards')) {
                    setActiveDrawer('none');
                    setShellState('title');
                  } else {
                    setActiveDrawer('none');
                  }
                }}
                className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 flex items-center gap-1 cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
                <span>
                  {gameMode === 'gm' && (activeDrawer === 'gm' || activeDrawer === 'cards')
                    ? t.backToTitleEsc
                    : t.closeEsc}
                </span>
              </button>
            </div>

            {activeDrawer === 'chat' && (
              <div className="flex flex-col h-[430px] sm:h-[460px]">
                <VoiceChatBar
                  players={players}
                  userPlayerId={me.id}
                  phase={phase}
                  isPlayerAwakeAtNight={isPlayerAwakeAtNight}
                  isMicOn={isMicOn && me.isAlive}
                  onToggleMic={handleToggleMicSafe}
                  activeSpeakers={activeSpeakers}
                  onTriggerUserSpeech={(transcript) => {
                    if (!me.isAlive) return;
                    setActiveSpeakers((prev) =>
                      prev.includes(me.name) ? prev : [me.name, ...prev]
                    );
                    const speechMsg: ChatMessage = {
                      id: `voice_${Date.now()}`,
                      senderId: me.id,
                      senderName: `🎙️ ${me.name}`,
                      text: transcript,
                      timestamp: Date.now(),
                      isGhost: false,
                    };
                    setMessages((prev) => [...prev, speechMsg]);
                    if (gameMode === 'online') {
                      realtimeClient.sendChat(roomId, speechMsg);
                    }
                  }}
                  lang={lang}
                  compact={false}
                />
                <div className="flex flex-wrap items-center justify-between pb-2 mb-2 border-b border-slate-800 gap-2">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      data-testid="chat-main-tab-btn"
                      onClick={() => setChatTab('main')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                        chatTab === 'main'
                          ? 'bg-rose-800 text-white'
                          : 'bg-slate-900 text-slate-400'
                      }`}
                    >
                      {t.chatMainTab}
                    </button>
                    {!me.isAlive && (
                      <button
                        type="button"
                        data-testid="chat-ghost-tab-btn"
                        onClick={() => setChatTab('ghost')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer ${
                          chatTab === 'ghost'
                            ? 'bg-purple-800 text-white'
                            : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <Skull className="w-3.5 h-3.5" />
                        <span>{t.chatGhostTab}</span>
                      </button>
                    )}
                  </div>
                  {chatNotice && (
                    <span className="text-[11px] text-amber-400 font-semibold">
                      {chatNotice}
                    </span>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-xs">
                  {messages
                    .filter((m) =>
                      !me.isAlive && chatTab === 'ghost' ? Boolean(m.isGhost) : !m.isGhost
                    )
                    .map((msg) => (
                      <div
                        key={msg.id}
                        className={`p-2.5 rounded-xl border ${
                          msg.isSystem
                            ? 'bg-rose-950/40 border-rose-800/50 text-rose-200'
                            : msg.isGhost
                            ? 'bg-purple-950/45 border-purple-700/60 text-purple-100'
                            : 'bg-[#0f172a] border-slate-800 text-slate-200'
                        }`}
                      >
                        <div className="flex justify-between text-[10px] text-amber-400 font-bold mb-0.5">
                          <span>{msg.senderName}</span>
                          <span>
                            {new Date(msg.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <p className="whitespace-pre-line">
                          {msg.isSystem ? stripMarkdownAsterisks(msg.text) : msg.text}
                        </p>
                      </div>
                    ))}
                  <div ref={chatBottomRef} />
                </div>

                {!me.isAlive && chatTab === 'main' ? (
                  <div
                    data-testid="dead-chat-locked-banner"
                    className="mt-3 rounded-xl bg-rose-950/75 border border-rose-500/60 px-3 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-rose-200 font-bold"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Lock className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>{t.deadChatLockedBanner}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setChatTab('ghost')}
                      className="px-2.5 py-1 rounded-lg bg-purple-700 hover:bg-purple-600 text-white text-[11px] font-extrabold cursor-pointer shrink-0"
                    >
                      👻 {t.openGhostRealmBtn}
                    </button>
                  </div>
                ) : !me.isAlive && chatTab === 'ghost' ? (
                  <div
                    data-testid="ghost-chat-isolated-banner"
                    className="mt-3 rounded-xl bg-purple-950/75 border border-purple-500/60 px-3 py-2 flex items-center gap-2 text-xs text-purple-200 font-bold"
                  >
                    <Ghost className="w-4 h-4 text-purple-300 shrink-0" />
                    <span>{t.ghostChatIsolatedBanner}</span>
                  </div>
                ) : null}

                {(() => {
                  const isChatInputLocked = !me.isAlive && chatTab === 'main';
                  return (
                    <div className="pt-3 flex gap-2">
                      <input
                        type="text"
                        data-testid="chat-message-input"
                        disabled={isChatInputLocked}
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                        placeholder={
                          isChatInputLocked
                            ? t.deadChatLockedBanner
                            : !me.isAlive
                            ? t.ghostChatIsolatedBanner
                            : t.chatPlaceholder
                        }
                        className={`flex-1 bg-[#070a14] border rounded-xl px-3 py-2 text-xs focus:outline-none ${
                          isChatInputLocked
                            ? 'border-rose-900/60 text-slate-500 cursor-not-allowed opacity-65'
                            : !me.isAlive
                            ? 'border-purple-600/80 text-purple-100 focus:border-purple-400'
                            : 'border-slate-700 text-slate-100 focus:border-amber-500'
                        }`}
                      />
                      <button
                        type="button"
                        data-testid="chat-send-btn"
                        disabled={isChatInputLocked}
                        onClick={handleSendMessage}
                        className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1 ${
                          isChatInputLocked
                            ? 'bg-slate-800 border border-slate-700 text-slate-500 cursor-not-allowed'
                            : !me.isAlive
                            ? 'bg-purple-700 hover:bg-purple-600 text-white cursor-pointer'
                            : 'bg-rose-600 hover:bg-rose-500 text-white cursor-pointer'
                        }`}
                      >
                        {isChatInputLocked ? (
                          <Lock className="w-3.5 h-3.5" />
                        ) : (
                          <Send className="w-3.5 h-3.5" />
                        )}
                        <span>{isChatInputLocked ? t.lockedBtn : t.sendBtn}</span>
                      </button>
                    </div>
                  );
                })()}
              </div>
            )}

            {activeDrawer === 'gm' && (
              <GMAssistantView
                lang={lang}
                hostId={currentUser.id}
                initialRoomId={virtualCardRoomId || roomId}
                initialPlayerCount={villageSize}
                initialDeckMode={gmDeckMode}
                onOpenVirtualCards={(code) => {
                  setVirtualCardRoomId(code);
                  setActiveDrawer('none');
                  setShellState('gm_player');
                  try {
                    window.history.replaceState(null, '', `?gm=${encodeURIComponent(code)}`);
                  } catch {
                    // ignore
                  }
                }}
              />
            )}

            {activeDrawer === 'cards' && (
              <VirtualCardPlayerView
                initialRoomId={virtualCardRoomId}
                currentUser={currentUser}
                lang={lang}
              />
            )}

            {activeDrawer === 'leaderboard' && <LeaderboardView lang={lang} />}
            {activeDrawer === 'history' && <MatchHistoryView lang={lang} />}
            {activeDrawer === 'encyclopedia' && <RoleEncyclopediaView lang={lang} />}
          </div>
        </div>
      )}

      {/* 5. PAUSE & SETTINGS MODAL (Includes Language, Sound & Camera Controls for Mobile & Desktop) */}
      {shellState === 'paused' && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t.pauseTitle}
          onClick={() => setShellState('playing')}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-auto"
          style={{ backgroundColor: 'rgba(5, 8, 17, 0.88)' }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-[#0d1322] border-2 border-amber-600/50 rounded-2xl p-5 sm:p-6 text-center space-y-4 shadow-2xl"
          >
            <h3 className="text-xl sm:text-2xl font-black text-amber-200 tracking-wide">
              {t.pauseTitle}
            </h3>

            <div className="grid grid-cols-3 gap-2 bg-[#070a14] border border-slate-800 rounded-xl p-3">
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block">
                  {t.roundStat}
                </span>
                <span
                  className="text-lg font-black text-amber-300 font-mono"
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {round}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block">
                  {t.aliveStat}
                </span>
                <span
                  className="text-lg font-black text-emerald-300 font-mono"
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {players.filter((p) => p.isAlive).length}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block">
                  {t.eloStat}
                </span>
                <span
                  className="text-lg font-black text-sky-300 font-mono"
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {currentUser.elo}
                </span>
              </div>
            </div>

            {/* In-Game Language, Audio & Camera Quick Controls */}
            <div className="flex items-center justify-between gap-2 bg-[#070a14] border border-slate-800 rounded-xl p-2.5">
              <select
                value={lang}
                onChange={(e) => handleChangeLanguage(e.target.value as Language)}
                aria-label="Language"
                className="bg-slate-900 border border-slate-700 text-xs font-bold rounded-lg px-2.5 py-1.5 text-amber-100 cursor-pointer"
              >
                <option value="vi">🇻🇳 Tiếng Việt</option>
                <option value="en">🇬🇧 English</option>
                <option value="fr">🇫🇷 Français</option>
                <option value="es">🇪🇸 Español</option>
                <option value="ja">🇯🇵 日本語</option>
              </select>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  data-testid="pause-toggle-fpv-btn"
                  onClick={handleToggleFirstPerson}
                  className={`px-2.5 py-1.5 rounded-lg border text-xs font-extrabold flex items-center gap-1 cursor-pointer ${
                    cameraPreset === 'first_person'
                      ? 'bg-emerald-600 border-emerald-300 text-white'
                      : 'bg-slate-900 border-slate-700 text-emerald-300'
                  }`}
                >
                  <View className="w-3.5 h-3.5" />
                  <span>{t.firstPersonShort}</span>
                </button>
                <button
                  type="button"
                  data-testid="pause-toggle-tpv-btn"
                  onClick={handleToggleThirdPerson}
                  className={`px-2.5 py-1.5 rounded-lg border text-xs font-extrabold flex items-center gap-1 cursor-pointer ${
                    cameraPreset === 'third_person'
                      ? 'bg-amber-600 border-amber-300 text-white'
                      : 'bg-slate-900 border-slate-700 text-amber-300'
                  }`}
                >
                  <span>{t.behindCamBtn}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCameraPreset((prev) => getNextCameraPreset(prev));
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-bold text-sky-300 flex items-center gap-1 cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>{t.switchCamera}</span>
                </button>
                <button
                  type="button"
                  aria-label={t.toggleSound}
                  aria-pressed={isMuted}
                  onClick={() => {
                    const m = sound.toggleMute();
                    setIsMuted(m);
                  }}
                  className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 cursor-pointer"
                >
                  {isMuted ? (
                    <VolumeX className="w-4 h-4 text-slate-400" />
                  ) : (
                    <Volume2 className="w-4 h-4 text-emerald-400" />
                  )}
                </button>
              </div>
            </div>

            {/* Independent Audio Channel Controls (BGM & Ambience vs SFX & Voice) */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                data-testid="pause-toggle-bgm-btn"
                aria-pressed={isBgmMuted}
                onClick={() => {
                  const m = sound.toggleBgmMute();
                  setIsBgmMuted(m);
                }}
                className={`px-2.5 py-2 rounded-xl border text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                  isBgmMuted
                    ? 'bg-slate-900 border-slate-700 text-slate-400'
                    : 'bg-emerald-950/70 border-emerald-500/50 text-emerald-200 hover:bg-emerald-900/70'
                }`}
              >
                <span>🎵</span>
                <span className="truncate">
                  {`${t.bgmToggleLabel}: ${isBgmMuted ? t.offLabel : t.onLabel}`}
                </span>
              </button>
              <button
                type="button"
                data-testid="pause-toggle-sfx-btn"
                aria-pressed={isSfxMuted}
                onClick={() => {
                  const m = sound.toggleSfxMute();
                  setIsSfxMuted(m);
                }}
                className={`px-2.5 py-2 rounded-xl border text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                  isSfxMuted
                    ? 'bg-slate-900 border-slate-700 text-slate-400'
                    : 'bg-emerald-950/70 border-emerald-500/50 text-emerald-200 hover:bg-emerald-900/70'
                }`}
              >
                <span>🔊</span>
                <span className="truncate">
                  {`${t.sfxToggleLabel}: ${isSfxMuted ? t.offLabel : t.onLabel}`}
                </span>
              </button>
            </div>

            {/* Phase Timers inside Pause Modal (Local AI Practice only) */}
            {gameMode !== 'online' && (
            <div className="bg-[#070a14] border border-slate-800 rounded-xl p-3 text-left space-y-2">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400">
                ⏱️ {t.phaseWaitTimersSec}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">
                    {t.nightLabel}
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={180}
                    value={pauseTimerDraft.nightActionSec}
                    onChange={(e) =>
                      setPauseTimerDraft((prev) => ({ ...prev, nightActionSec: e.target.value }))
                    }
                    onBlur={() => commitPauseTimerField('nightActionSec', 5, 180)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        commitPauseTimerField('nightActionSec', 5, 180);
                        e.currentTarget.blur();
                      }
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs font-mono font-bold text-amber-300 text-center"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">
                    {t.debateLabel}
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={600}
                    value={pauseTimerDraft.dayDiscussSec}
                    onChange={(e) =>
                      setPauseTimerDraft((prev) => ({ ...prev, dayDiscussSec: e.target.value }))
                    }
                    onBlur={() => commitPauseTimerField('dayDiscussSec', 10, 600)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        commitPauseTimerField('dayDiscussSec', 10, 600);
                        e.currentTarget.blur();
                      }
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs font-mono font-bold text-amber-300 text-center"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">
                    {t.voteLabel}
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={300}
                    value={pauseTimerDraft.dayVoteSec}
                    onChange={(e) =>
                      setPauseTimerDraft((prev) => ({ ...prev, dayVoteSec: e.target.value }))
                    }
                    onBlur={() => commitPauseTimerField('dayVoteSec', 10, 300)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        commitPauseTimerField('dayVoteSec', 10, 300);
                        e.currentTarget.blur();
                      }
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs font-mono font-bold text-amber-300 text-center"
                  />
                </div>
              </div>
            </div>
            )}

            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => setShellState('playing')}
                className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs cursor-pointer"
              >
                {t.resumeBtn}
              </button>
              {gameMode !== 'online' && (
                <button
                  type="button"
                  onClick={() => handleStartMatch()}
                  className="w-full py-3 rounded-xl bg-rose-700 hover:bg-rose-600 text-white font-bold text-xs cursor-pointer"
                >
                  {t.restartMatchBtn}
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  if (gameMode === 'online' && roomId) {
                    realtimeClient.leaveRoom(roomId, currentUser.id);
                    activeOnlineRoomCodeRef.current = null;
                    setOnlineMatchView(null);
                  }
                  resetMatchUiState();
                  setShellState('title');
                }}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs cursor-pointer"
              >
                {t.backToTitleBtn}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. OUTCOME-MATCHED VICTORY / GAME OVER MODAL */}
      {shellState === 'gameover' && gameResult && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t.finalResultBadge}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-auto"
          style={{ backgroundColor: 'rgba(5, 8, 17, 0.9)' }}
        >
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[#0d1322] border-2 border-amber-500/60 rounded-2xl p-5 sm:p-6 text-center space-y-4 shadow-2xl">
            <div className="w-20 h-20 rounded-2xl bg-rose-950 border-2 border-amber-400 mx-auto flex items-center justify-center text-5xl shadow-xl">
              {gameResult.winner === 'werewolves'
                ? '🐺'
                : gameResult.winner === 'lovers'
                ? '💘'
                : gameResult.winner === 'tanner'
                ? '🎭'
                : gameResult.winner === 'draw'
                ? '🤝'
                : '🏆'}
            </div>

            <div>
              <span className="text-xs font-mono uppercase tracking-widest text-amber-400 font-bold">
                {t.finalResultBadge}
              </span>
              <h3 className="text-2xl font-black text-amber-100 mt-1">
                {gameResult.winner === 'werewolves'
                  ? t.winWerewolves
                  : gameResult.winner === 'lovers'
                  ? t.winLovers
                  : gameResult.winner === 'tanner'
                  ? t.winTanner
                  : gameResult.winner === 'draw'
                  ? t.winDraw
                  : t.winVillagers}
              </h3>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                {gameResult.reason}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2.5 bg-[#070a14] border border-slate-800 rounded-xl p-3">
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block">
                  {t.totalRoundsStat}
                </span>
                <span
                  className="text-xl font-black text-amber-300 font-mono"
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {gameResult.rounds}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block">
                  {t.survivorsStat}
                </span>
                <span
                  className="text-xl font-black text-emerald-300 font-mono"
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {gameResult.survivors}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block">
                  {t.eloDeltaStat}
                </span>
                <span
                  className={`text-xl font-black font-mono ${
                    gameResult.eloDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {gameResult.eloDelta >= 0 ? `+${gameResult.eloDelta}` : gameResult.eloDelta}
                </span>
              </div>
            </div>

            {/* Full End-of-Match Role Reveal Roster (BUG-24) */}
            <RoleRevealRoster players={players} meId={me.id} lang={lang} />

            <div className="flex flex-col sm:flex-row gap-2.5">
              {gameMode === 'online' ? (
                me.isHost ? (
                  <button
                    type="button"
                    data-testid="gameover-online-rematch-btn"
                    onClick={() => realtimeClient.restartMatch(roomId)}
                    className="flex-1 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    <span>{t.playAgainBtn}</span>
                  </button>
                ) : (
                  <div
                    data-testid="gameover-online-waiting-host"
                    className="flex-1 py-3 px-4 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center"
                  >
                    {t.waitingHostRematch}
                  </div>
                )
              ) : (
                <button
                  type="button"
                  onClick={() => handleStartMatch()}
                  className="flex-1 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>{t.playAgainBtn}</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  if (gameMode === 'online' && roomId) {
                    realtimeClient.leaveRoom(roomId, currentUser.id);
                    activeOnlineRoomCodeRef.current = null;
                    setOnlineMatchView(null);
                  }
                  resetMatchUiState();
                  setShellState('title');
                }}
                className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs cursor-pointer"
              >
                {t.backToTitleBtn}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. ROOM CREATION & JOIN LOBBY MODAL */}
      <RoomLobbyModal
        isOpen={lobbyModalState.isOpen}
        lang={lang}
        initialMode={lobbyModalState.mode}
        currentUser={currentUser}
        villageSize={villageSize}
        preferredRole={preferredRole}
        timerConfig={timerConfig}
        onChangeVillageSize={setVillageSize}
        onChangePreferredRole={setPreferredRole}
        onChangeTimerConfig={handleUpdateTimerConfig}
        onClose={() => setLobbyModalState({ ...lobbyModalState, isOpen: false })}
        onLaunchOnlineRoom={(
          code,
          size,
          peers,
          matchRoles,
          serverTimers,
          initialMatchView,
          initialServerNow,
          initialChatMessages
        ) => {
          handleStartMatch(
            size,
            preferredRole,
            'online',
            code,
            peers,
            matchRoles,
            serverTimers,
            false,
            initialMatchView,
            initialServerNow,
            initialChatMessages
          );
        }}
        onLaunchGMHost={(code, size, deckMode) => {
          sound.stopBGM();
          activeOnlineRoomCodeRef.current = null;
          setOnlineMatchView(null);
          setLobbyModalState({ isOpen: false, mode: 'gm' });
          setGameMode('gm');
          setGmDeckMode(deckMode);
          setRoomId(code);
          setVirtualCardRoomId(code);
          setVillageSize(size);
          setActiveDrawer('none');
          setGmAnnouncement(null);
          setRoleCalloutToast(null);
          setGameResult(null);
          setShellState('gm_host');
        }}
        onLaunchGMPlayerCard={(code) => {
          sound.stopBGM();
          activeOnlineRoomCodeRef.current = null;
          setOnlineMatchView(null);
          setLobbyModalState({ isOpen: false, mode: 'gm' });
          setGameMode('gm');
          setVirtualCardRoomId(code);
          setActiveDrawer('none');
          setGmAnnouncement(null);
          setRoleCalloutToast(null);
          setGameResult(null);
          setShellState('gm_player');
          try {
            window.history.replaceState(null, '', `?gm=${encodeURIComponent(code)}`);
          } catch {
            // ignore
          }
        }}
      />

      {/* 8. INTERACTIVE SPOTLIGHT ONBOARDING TOUR ("Guild hướng dẫn") */}
      <OnboardingTourModal
        isOpen={showOnboardingTour}
        lang={lang}
        onComplete={() => {
          localStorage.setItem('werewolf_3d_tour_done', '1');
          setShowOnboardingTour(false);
        }}
      />

      {/* 9. SECRET 3D ROLE CARD MODAL */}
      {showMyRoleModal && (
        <RoleCardModal
          roleId={me.roleId}
          playerName={me.name}
          isAlive={me.isAlive}
          isMidMatch={!isRoleCardInitialOpen}
          lang={lang}
          onClose={() => {
            setShowMyRoleModal(false);
            setIsRoleCardInitialOpen(false);
          }}
          onStartTour={() => {
            setShowMyRoleModal(false);
            setIsRoleCardInitialOpen(false);
            setShowOnboardingTour(true);
          }}
        />
      )}

      {/* 9A. END-OF-NIGHT SHORT-FILM KILL / DEATH CINEMATIC OVERLAY (ZERO EARLY TRIGGER & ZERO LEAK) */}
      {shellState === 'playing' && nightDeathCinematic && (
        <NightDeathCinematicOverlay
          cinematic={nightDeathCinematic}
          lang={lang}
          onContinue={handleDismissNightDeathCinematic}
        />
      )}

      {/* 9B. AUTHENTIC REAL-LIFE AI GAME MASTER DAWN / DUSK ANNOUNCEMENT OVERLAY */}
      {shellState === 'playing' && gmAnnouncement && !nightDeathCinematic && (
        <GMAnnouncementModal
          announcement={gmAnnouncement}
          lang={lang}
          isMuted={isMuted}
          mayorId={mayorId}
          onReplayVoice={() =>
            sound.speakLocalized(gmAnnouncement.spokenNarration, lang, {
              pitch: gmAnnouncement.kind === 'dawn' ? 0.96 : 0.88,
              rate: 0.98,
              volume: 0.9,
            })
          }
          onContinue={handleDismissGMAnnouncement}
        />
      )}

      {/* 10. ACCOUNT & PROFILE MODAL */}
      {showProfileModal && (
        <SocialLoginModal
          currentUser={currentUser}
          authToken={authToken}
          initialTab={initialAccountTab}
          lang={lang}
          onClose={() => {
            setShowProfileModal(false);
            setInitialAccountTab(null);
          }}
          onSaveProfile={(profile, token) => {
            if (token !== undefined) {
              setAuthToken(token);
              try {
                if (token) {
                  localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
                } else {
                  localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
                }
              } catch {
                // ignore
              }
            }
            const isSignedIn =
              profile.provider &&
              profile.provider !== 'guest' &&
              Boolean(profile.handle && profile.handle.trim());
            const rawProfileId = (profile as { id?: string }).id;
            const nextId =
              typeof rawProfileId === 'string' && rawProfileId.trim().length > 0
                ? rawProfileId.trim()
                : isSignedIn
                ? `acc_${profile.handle!.trim().toLowerCase()}`
                : getOrCreateTabGuestIdentity().id;
            const prevId = currentUser.id;
            const nextUser: UserProfileData = {
              ...currentUser,
              id: nextId,
              name: profile.name,
              avatar: profile.avatar,
              provider: profile.provider,
              handle: profile.handle,
              region: profile.region,
              elo: profile.elo ?? currentUser.elo,
              matchesPlayed: profile.matchesPlayed ?? currentUser.matchesPlayed ?? 0,
              wins: profile.wins ?? currentUser.wins ?? 0,
            };
            setCurrentUser(nextUser);
            localStorage.setItem('werewolf_user', JSON.stringify(nextUser));
            // Immediately sync updated profile id, name & avatar into 3D village players
            setPlayers((prev) =>
              prev.map((p) =>
                p.id === prevId
                  ? { ...p, id: nextId, name: profile.name, avatar: profile.avatar }
                  : p
              )
            );
          }}
        />
      )}

      {/* 11. AGROU AVATAR LOCKER & MAP BIOME CUSTOMIZER */}
      <AgrouAvatarLockerModal
        isOpen={showAvatarLocker}
        lang={lang}
        config={avatarConfig}
        playerName={currentUser.name}
        onChange={handleUpdateAvatarConfig}
        onClose={() => setShowAvatarLocker(false)}
      />

      {/* 12. AGROU PARCHMENT DEDUCTION NOTEBOOK DRAWER */}
      <AgrouNotebookDrawer
        isOpen={isNotebookOpen}
        lang={lang}
        players={players}
        meId={me.id}
        isAlive={me.isAlive}
        mayorId={mayorId}
        notebook={notebook}
        onUpdatePlayerNote={handleUpdateNotebookPlayer}
        onUpdateFreeText={(freeText) =>
          setNotebook((prev) => ({ ...prev, freeText }))
        }
        onShareSummaryToChat={handleShareNotebookToChat}
        onClose={() => setIsNotebookOpen(false)}
      />
    </div>
  );
}
