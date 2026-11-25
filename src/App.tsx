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
import { realtimeClient } from './utils/realtimeClient';
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
  resolveNightActions,
  applyDayLynch,
  castSingleDayVote,
  buildVoteTallyEntries,
  checkWinCondition,
  resolveHunterShot,
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

export default function App() {
  // Game Shell State ('title' | 'playing' | 'paused' | 'gameover' | 'gm_host' | 'gm_player')
  const [shellState, setShellState] = useState<
    'title' | 'playing' | 'paused' | 'gameover' | 'gm_host' | 'gm_player'
  >(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('gmroom') || params.get('room')) return 'gm_player';
    if (params.get('autostart') === '1') return 'playing';
    return 'title';
  });

  const [gameMode, setGameMode] = useState<GameMode>(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('gmroom') || params.get('room')) return 'gm';
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
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  const [initialAccountTab, setInitialAccountTab] = useState<AccountModalTab | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [showFactionHints, setShowFactionHints] = useState<boolean>(false);
  const [activeToolPopover, setActiveToolPopover] = useState<'none' | 'props' | 'voice'>('none');
  const [virtualCardRoomId, setVirtualCardRoomId] = useState<string>('');
  const [activeDrawer, setActiveDrawer] = useState<DrawerTool>('none');
  const [isDockCollapsed, setIsDockCollapsed] = useState<boolean>(false);
  const [isTitleMenuMinimized, setIsTitleMenuMinimized] = useState<boolean>(false);
  const [cameraPreset, setCameraPreset] = useState<CameraViewPreset>('campfire');
  const [freeLook360, setFreeLook360] = useState<boolean>(false);
  const [aimedPlayerId, setAimedPlayerId] = useState<string | null>(null);
  const [aimedOwnSeat, setAimedOwnSeat] = useState<boolean>(false);
  const [isUserRoaming, setIsUserRoaming] = useState<boolean>(false);
  const [returnToSeatTrigger, setReturnToSeatTrigger] = useState<number>(0);
  const [fpvLookTurnRate, setFpvLookTurnRate] = useState<number>(0);

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

  // Role Callout Voice Toast Banner
  const [roleCalloutToast, setRoleCalloutToast] = useState<{
    roleId: RoleId;
    quote: string;
    sfxLabel: string;
  } | null>(null);

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

  // User Profile (Database Account & Guest Persistence)
  const [currentUser, setCurrentUser] = useState<UserProfileData>(() => {
    const fallback: UserProfileData = {
      id: 'usr_me',
      name: 'Thợ Săn Đêm',
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
          return {
            ...fallback,
            ...parsed,
            id: typeof parsed.id === 'string' && parsed.id ? parsed.id : fallback.id,
            name: typeof parsed.name === 'string' && parsed.name ? parsed.name : fallback.name,
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
  const [villageSize, setVillageSize] = useState<number>(8);
  const [preferredRole, setPreferredRole] = useState<RoleId | 'random'>('random');
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
  const [matchInstanceId, setMatchInstanceId] = useState<number>(1);
  const lastAutoAdvancedKeyRef = useRef<string>('');

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
        id: 'usr_me',
        name: 'Thợ Săn Đêm',
        avatar: '🐺',
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
      'usr_me'
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
    return { readyPlayers, prepared };
  });

  const [players, setPlayers] = useState<Player[]>(() => initialBootState.readyPlayers);
  const [mayorId, setMayorId] = useState<string | null>(null);
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
  const [witchSaveUsedTonight, setWitchSaveUsedTonight] = useState<boolean>(() =>
    Boolean(initialBootState.prepared.preSimulatedActions.witchHealTargetId)
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

  // Build sequential Night Call Schedule moderated by Quản Trò Máy
  const nightSchedule = buildAutoGMNightSchedule(players, round, timerConfig, me?.id);
  const currentNightStep =
    phase === 'night'
      ? nightSchedule[Math.min(nightStepIndex, Math.max(0, nightSchedule.length - 1))] || null
      : null;
  const myNightStepIdx = findHumanNightStepIndex(nightSchedule, me, round);
  const myWakeGuidance = getHumanRoleWakeGuidance(me, round, lang);

  // Status Banner & End-of-Run Snapshot
  const [eventBanner, setEventBanner] = useState<string>(() =>
    `${UI_TEXT[lang].nightPhaseTitle(1)} · ${myRole.name[lang]}: ${myRole.instructions[lang]}`
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
  // Strictly governed by Quản Trò Máy's current role step!
  const isMyTurnInNightStep = isPlayerAwakeForNightStep(
    me,
    currentNightStep?.key || null,
    round
  );
  const isPlayerAwakeAtNight =
    phase === 'night' && me.isAlive && isMyTurnInNightStep && !hasClosedEyesTonight;

  // Mirror shellState to document.body.dataset.state
  useEffect(() => {
    document.body.dataset.state = shellState;
  }, [shellState]);

  // Sync Ambient BGM with current phase (strictly ONLY during 3D 'playing' mode)
  useEffect(() => {
    if (shellState === 'playing') {
      sound.setBGMMode(phase === 'night' ? 'night' : 'day');
    } else {
      sound.stopBGM();
    }
  }, [shellState, phase]);

  // Check URL query parameters on mount (?gmroom=GM-XXXX or ?room=GM-XXXX opens standalone GM Player Card view)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('gmroom') || params.get('room');
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

  // Unified helper to start any Night (Round 1 or Round 2+) directly at the human player's turn
  const beginNewNight = useCallback(
    (
      targetPlayers: Player[],
      targetRound: number,
      targetFrenzy: boolean,
      knownWolves: string[] = knownWolfIds
    ) => {
      const human = targetPlayers.find((p) => p.id === currentUser.id) || targetPlayers[0];
      const prepared = prepareNightStartForHuman(
        targetPlayers,
        targetRound,
        timerConfig,
        human?.id,
        {
          wolfPupFrenzy: targetFrenzy,
          knownWolfIdsByBotSeer: knownWolves,
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
      setMatchInstanceId((m) => m + 1);
      setPlayers(nextPlayers);
      setRound(targetRound);
      setPhase('night');
      setGmAnnouncement(null);
      setPendingNightTransition(null);
      setPendingDawnContext(null);
      setNightStepIndex(prepared.initialStepIndex);
      setTimerSeconds(prepared.initialTimerSec);
      setHasInspectedTonight(false);
      setHasClosedEyesTonight(false);
      setActivePropTool(null);
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
      setWitchSaveUsedTonight(Boolean(prepared.preSimulatedActions.witchHealTargetId));
      setWitchPoisonTargetId(prepared.preSimulatedActions.witchPoisonTargetId || null);
      setSeerTargetTonightId(prepared.preSimulatedActions.seerTargetId || null);
      setGuardTargetTonightId(prepared.preSimulatedActions.guardTargetId || null);

      if (prepared.preSimulatedActions.seerTargetId) {
        const inspected = nextPlayers.find(
          (p) => p.id === prepared.preSimulatedActions.seerTargetId
        );
        if (
          inspected &&
          (inspected.roleId === 'werewolf' || inspected.roleId === 'wolf_pup')
        ) {
          setKnownWolfIds((prev) =>
            prev.includes(inspected.id) ? prev : [...prev, inspected.id]
          );
        }
      }

      return prepared;
    },
    [currentUser.id, timerConfig, knownWolfIds]
  );

  // Automated Game Master ("Quản Trò Máy") sequential night step orchestrator
  // STRICTLY ONLY runs when shellState === 'playing' (never during title, gm_host, or gm_player!)
  useEffect(() => {
    if (shellState !== 'playing' || phase !== 'night' || !currentNightStep) return;

    const awakeNow = isPlayerAwakeForNightStep(me, currentNightStep.key, round);
    setHasClosedEyesTonight(false);
    setTimerSeconds(getStepInitialTimerSeconds(currentNightStep, myNightStepIdx, nightStepIndex));

    setEventBanner(
      awakeNow
        ? `${currentNightStep.gmNarration[lang]} · ${currentNightStep.playerInstruction[lang]}`
        : currentNightStep.gmNarration[lang]
    );

    if (shellState === 'playing') {
      triggerNightRoleCallout(currentNightStep.roleId);
    }

    // Only execute AI Bot actions when the current step is a Bot step (never overwrite human turn)
    if (!awakeNow) {
      const botUpdates = computeAutoGMBotNightStepAction(
        currentNightStep.key,
        players,
        {
          wolfTargetId: tonightWolfVictimId,
          secondWolfTargetId,
          guardTargetId: guardTargetTonightId,
          witchHealTargetId: witchSaveUsedTonight ? tonightWolfVictimId : null,
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
        setWitchSaveUsedTonight(true);
      }
      if (botUpdates.witchPoisonTargetId) {
        setWitchPoisonTargetId(botUpdates.witchPoisonTargetId);
      }
      if (botUpdates.seerTargetId) {
        setSeerTargetTonightId(botUpdates.seerTargetId);
        const inspected = players.find((p) => p.id === botUpdates.seerTargetId);
        if (
          inspected &&
          (inspected.roleId === 'werewolf' || inspected.roleId === 'wolf_pup')
        ) {
          setKnownWolfIds((prev) =>
            prev.includes(inspected.id) ? prev : [...prev, inspected.id]
          );
        }
      }
      if (botUpdates.guardTargetId) {
        setGuardTargetTonightId(botUpdates.guardTargetId);
      }
    }
  }, [phase, round, nightStepIndex, shellState, matchInstanceId]);

  // Simulate ambient voice speakers in the village
  useEffect(() => {
    if (shellState !== 'playing') return;
    const interval = setInterval(() => {
      const alive = players.filter((p) => p.isAlive);
      if (alive.length === 0) return;
      const pick = alive[Math.floor(Math.random() * alive.length)];
      const speakers = [pick.name];
      if (isMicOn && me.isAlive) speakers.push(me.name);
      setActiveSpeakers(speakers);
    }, 3000);
    return () => clearInterval(interval);
  }, [shellState, players, isMicOn, me]);

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
        (propType === 'tomato' || propType === 'rose' || propType === 'egg')
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
      senderRole: me.roleId,
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

  // Start / Restart a 3D Match (Supports Online Room with exact participants, or AI Practice)
  const handleStartMatch = useCallback(
    (
      customCount?: number,
      forcedRole?: RoleId | 'random',
      modeOverride?: GameMode,
      customRoomId?: string,
      customParticipants?: LobbyParticipant[]
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
      if (customRoomId) setRoomId(customRoomId);

      const roleChoice = forcedRole ?? preferredRole;
      const deck = assignPreferredRoleToDeck(generateBalancedRoster(count), roleChoice);

      const rawPlayers: Player[] =
        customParticipants && customParticipants.length >= 4
          ? customParticipants.map((part, idx) => {
              const botLook = getBotCosmetics(idx);
              return {
                id: idx === 0 ? currentUser.id : part.id,
                name: idx === 0 ? currentUser.name : part.name,
                avatar: idx === 0 ? currentUser.avatar : part.avatar,
                roleId: deck[idx] || 'villager',
                isAlive: true,
                isHost: idx === 0 || Boolean(part.isHost),
                isBot: idx === 0 ? false : part.isBot,
                hat: idx === 0 ? avatarConfig.hat : botLook.hat,
                cloakColor: idx === 0 ? avatarConfig.cloakColor : botLook.cloakColor,
                elderLives: deck[idx] === 'elder' ? 2 : undefined,
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

      const freshPlayers: Player[] = rawPlayers.map((p) => ({
        ...p,
        isMayor: false,
      }));

      setMayorId(null);
      setKnownWolfIds([]);
      setWolfPupFrenzy(false);
      setVotes([]);
      setHasVoted(false);
      setActiveHunter(null);
      setGameResult(null);
      setGmAnnouncement(null);
      setLastDawnAnnouncement(null);
      setNightDeathCinematic(null);
      setPendingDawnAfterDeath(null);
      setPendingNightTransition(null);
      setPendingDawnContext(null);
      setSuspectTags({});
      setActiveDrawer('none');
      setIsNotebookOpen(false);
      setShowAvatarLocker(false);
      setEmoteEvents([]);
      setIsUserRoaming(false);
      setAimedOwnSeat(false);
      setNotebook(createInitialNotebook());
      setLobbyModalState({ isOpen: false, mode: 'online' });
      beginNewNight(freshPlayers, 1, false, []);
      setShellState('playing');

      const assignedDef = ROLES[deck[0]];
      setMessages([
        {
          id: `gm_start_${Date.now()}`,
          senderId: 'sys',
          senderName: '🤖 Quản Trò Máy',
          text:
            lang === 'vi'
              ? `🤖 Quản Trò Máy: Ván đấu ${count} người bắt đầu! Vai trò bí mật của bạn là ${assignedDef.name.vi}.`
              : `🤖 Auto-GM: ${count}-player match started! Your secret role is ${assignedDef.name[lang]}.`,
          timestamp: Date.now(),
          isSystem: true,
        },
      ]);
      setEventBanner(
        `${t.nightPhaseTitle(1)} · ${assignedDef.name[lang]}: ${assignedDef.instructions[lang]}`
      );
    },
    [currentUser, avatarConfig, gameMode, villageSize, preferredRole, beginNewNight, t, lang]
  );

  // Finish Game & Freeze Snapshot
  const finishGame = useCallback(
    (winner: string, reason: string, finalPlayers: Player[], currentRound: number) => {
      sound.playVictory();
      confetti({ particleCount: 100, spread: 75 });
      const userSide = ROLES[me.roleId].faction;
      const didUserWin =
        (winner === 'villagers' && userSide === 'villager') ||
        (winner === 'werewolves' && userSide === 'werewolf') ||
        (winner === 'tanner' && me.roleId === 'tanner') ||
        (winner === 'lovers' && Boolean(me.loverId));

      const eloDelta = didUserWin ? 28 : -14;
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
    [currentUser, me, roomId]
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
      livingWitches.length > 0 && !livingWitches[0].hasUsedHeal && witchSaveUsedTonight
        ? wolfTarget
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
    };

    if (round === 1 && !resolvedDoppelTarget && me.roleId !== 'doppelganger') {
      const act = computeAutoGMBotNightStepAction('doppelganger', players, {}, botStepOpts);
      if (act.doppelgangerTargetId) resolvedDoppelTarget = act.doppelgangerTargetId;
    }
    if (round === 1 && !resolvedCupidLovers && me.roleId !== 'cupid') {
      const act = computeAutoGMBotNightStepAction('cupid', players, {}, botStepOpts);
      if (act.cupidLovers) resolvedCupidLovers = act.cupidLovers;
    }
    if (!wolfTarget || (wolfPupFrenzy && !secondTarget)) {
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
      livingWitches.length > 0 &&
      !livingWitches[0].hasUsedPower &&
      !witchHeal &&
      !witchPoison
    ) {
      const act = computeAutoGMBotNightStepAction(
        'witch',
        players,
        { wolfTargetId: wolfTarget },
        botStepOpts
      );
      if (act.witchHealTargetId) witchHeal = act.witchHealTargetId;
      if (act.witchPoisonTargetId) witchPoison = act.witchPoisonTargetId;
    }
    if (!resolvedSeerTarget && me.roleId !== 'seer') {
      const act = computeAutoGMBotNightStepAction('seer', players, {}, botStepOpts);
      if (act.seerTargetId) resolvedSeerTarget = act.seerTargetId;
    }
    if (!guardTarget && me.roleId !== 'bodyguard') {
      const act = computeAutoGMBotNightStepAction('bodyguard', players, {}, botStepOpts);
      if (act.guardTargetId) guardTarget = act.guardTargetId;
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
    });

    // Only track bot Seer's inspections for AI voting — NEVER leak human Seer's secret inspection to AI bots!
    const isBotSeerAlive = players.some(
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
    setWitchSaveUsedTonight(false);
    setWitchPoisonTargetId(null);
    setRoleCalloutToast(null);

    if (result.triggeredHunterId) {
      const hunterPlayer = effectivePlayers.find((p) => p.id === result.triggeredHunterId);
      if (hunterPlayer) {
        // Strictly DO NOT play Hunter callout toast/SFX when a Bot Hunter dies at night (anti-leak!)
        if (!hunterPlayer.isBot) {
          triggerNightRoleCallout('hunter');
        }
        if (hunterPlayer.isBot) {
          const aliveTargets = effectivePlayers.filter((p) => p.isAlive);
          if (aliveTargets.length > 0) {
            const shotTarget =
              aliveTargets[Math.floor(Math.random() * aliveTargets.length)];
            const afterShot = resolveHunterShot(
              effectivePlayers,
              hunterPlayer.id,
              shotTarget.id
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
          }
        } else {
          // Human Hunter died during the night -> immediately prompt revenge shot with clear dawn deaths context
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
                }! Hãy chọn 1 người để nổ súng kéo theo!`
              : `🎯 You (${hunterPlayer.name}) fell last night! Choose 1 living player for your dying Hunter shot!`
          );
          sound.playDayGong();
          sound.playGhostWail();
          return;
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
    const dawnAnnouncement = buildDawnGMAnnouncement({
      round,
      beforePlayers: beforeNightPlayers,
      afterPlayers: effectivePlayers,
      nightKilledIds: result.killedPlayerIds,
      hunterShotEvent,
      humanDeathReason: humanDiedTonight ? deathRevealState?.reasonText ?? null : null,
      humanPlayerId: me.id,
      lang,
    });

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
      setTimeout(() => {
        handleThrowProp(botPick.id, otherBot.id, round % 2 === 0 ? 'egg' : 'tomato');
        handleTriggerEmote(dawnAnnouncement.victims.length > 0 ? 'panic' : 'wave', otherBot.id);
      }, 900);
    }
  }, [
    players,
    me,
    selectedTargetId,
    secondWolfTargetId,
    tonightWolfVictimId,
    guardTargetTonightId,
    seerTargetTonightId,
    doppelgangerTargetId,
    knownWolfIds,
    wolfPupFrenzy,
    witchSaveUsedTonight,
    witchPoisonTargetId,
    cupidLovers,
    round,
    gameMode,
    roomId,
    finishGame,
    triggerNightRoleCallout,
    handleThrowProp,
    timerConfig,
    t,
    lang,
  ]);

  // Step-by-step Night Progression moderated by Quản Trò Máy (synchronously updates timerSeconds to prevent cascade)
  const handleAdvanceNightStep = useCallback(() => {
    if (phase !== 'night') return;
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
  }, [phase, nightStepIndex, nightSchedule, myNightStepIdx, handleResolveNight]);

  // Jump directly to the human player's waking night step (or resolve night if passive/already past)
  const handleJumpToMyNightTurn = useCallback(() => {
    if (phase !== 'night') return;
    sound.playCardFlip();
    if (myNightStepIdx !== -1 && myNightStepIdx !== nightStepIndex) {
      // Simulate any intermediate bot steps so Witch/Seer/etc. have accurate wolfTargetId
      let simWolfTarget = tonightWolfVictimId;
      let simSecondTarget = secondWolfTargetId;
      let simGuardTarget = guardTargetTonightId;
      let simLovers = cupidLovers;
      let simDoppel = doppelgangerTargetId;

      const startIdx = Math.min(nightStepIndex, myNightStepIdx);
      for (let i = startIdx; i < myNightStepIdx; i++) {
        const step = nightSchedule[i];
        if (!step) continue;
        const botAct = computeAutoGMBotNightStepAction(
          step.key,
          players,
          {
            wolfTargetId: simWolfTarget,
            secondWolfTargetId: simSecondTarget,
            guardTargetId: simGuardTarget,
            cupidLovers: simLovers,
            doppelgangerTargetId: simDoppel,
          },
          {
            round,
            wolfPupFrenzy,
            humanPlayerId: me.id,
            knownWolfIdsByBotSeer: knownWolfIds,
          }
        );
        if (botAct.wolfTargetId) simWolfTarget = botAct.wolfTargetId;
        if (botAct.secondWolfTargetId) simSecondTarget = botAct.secondWolfTargetId;
        if (botAct.guardTargetId) simGuardTarget = botAct.guardTargetId;
        if (botAct.cupidLovers) simLovers = botAct.cupidLovers;
        if (botAct.doppelgangerTargetId) simDoppel = botAct.doppelgangerTargetId;
      }

      if (simWolfTarget) setTonightWolfVictimId(simWolfTarget);
      if (simSecondTarget) setSecondWolfTargetId(simSecondTarget);
      if (simGuardTarget) setGuardTargetTonightId(simGuardTarget);
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
    cupidLovers,
    doppelgangerTargetId,
    round,
    wolfPupFrenzy,
    me.id,
    knownWolfIds,
    timerConfig.nightActionSec,
    handleResolveNight,
  ]);

  // Enter Day Voting Phase & generate rule-compliant smart bot votes
  const handleStartDayVoting = useCallback(() => {
    sound.playGavel();
    setActivePropTool(null);
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

    setTimeout(() => {
      const currentPlayers = playersRef.current;
      const botVotes = computeSmartBotDayVotes(currentPlayers, knownWolfIds, null);
      const botIdSet = new Set(currentPlayers.filter((p) => p.isBot).map((p) => p.id));
      setVotes((prev) => [
        ...prev.filter((v) => !botIdSet.has(v.voterId)),
        ...botVotes,
      ]);
    }, 900);
  }, [t, round, lang, knownWolfIds, timerConfig.dayVoteSec]);

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

  // Resolve Day Voting -> Show Authentic GM Dusk Verdict before entering Next Night
  const handleResolveDayVoting = useCallback(
    (overrideVotes?: VoteRecord[]) => {
      const beforeVotePlayers = players;
      const activeVotes = overrideVotes || votes;
      const tally = tallyVotesWithMayor(activeVotes, mayorId);
      const playerTargetVotes = activeVotes.filter((v) => v.targetId !== CAMPFIRE_ABSTAIN_ID);

      if (tally.isTie || !tally.targetId) {
        const tieAnnouncement = buildDuskGMAnnouncement({
          round,
          beforePlayers: beforeVotePlayers,
          afterPlayers: beforeVotePlayers,
          lynchedVictim: null,
          voteCounts: tally.counts,
          votes: playerTargetVotes,
          isTie: true,
          humanPlayerId: me.id,
          lang,
        });
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
        if (gameMode === 'online') realtimeClient.sendChat(roomId, tieMsg);
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
      if (!victim) return;

      const {
        updatedPlayers,
        wolfPupTriggeredNextNight,
        triggeredHunterId,
        elderLynchedPenalty,
      } = applyDayLynch(beforeVotePlayers, victim.id);

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

      if (triggeredHunterId) {
        triggerNightRoleCallout('hunter');
        const hunter = effectivePlayers.find((p) => p.id === triggeredHunterId);
        if (hunter && !hunter.isBot) {
          setPlayers(effectivePlayers);
          if (wolfPupTriggeredNextNight) setWolfPupFrenzy(true);
          setActiveHunter(hunter);
          setHunterOriginPhase('day_voting');
          setPhase('hunter_revenge');
          setTimerSeconds(timerConfig.hunterShotSec);
          setEventBanner(`🎯 ${t.hunterPhaseTitle}: ${ROLES.hunter.instructions[lang]}`);
          sound.playGavel();
          sound.playGhostWail();
          return;
        } else if (hunter && hunter.isBot) {
          const aliveTargets = effectivePlayers.filter((p) => p.isAlive);
          if (aliveTargets.length > 0) {
            const target =
              aliveTargets[Math.floor(Math.random() * aliveTargets.length)];
            const shotRes = resolveHunterShot(effectivePlayers, hunter.id, target.id);
            effectivePlayers = shotRes.updatedPlayers;
            if (shotRes.wolfPupTriggeredNextNight) nextFrenzy = true;
            hunterShotEvent = {
              hunterName: hunter.name,
              hunterSeat: effectivePlayers.findIndex((p) => p.id === hunter.id) + 1,
              targetId: target.id,
              targetName: target.name,
              targetSeat: effectivePlayers.findIndex((p) => p.id === target.id) + 1,
            };
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

      const duskAnnouncement = buildDuskGMAnnouncement({
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
      });

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
      if (gameMode === 'online') realtimeClient.sendChat(roomId, duskMsg);

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
      gameMode,
      roomId,
      finishGame,
      triggerNightRoleCallout,
      timerConfig.hunterShotSec,
      t,
      lang,
    ]
  );

  // Dismiss Active GM Announcement (and trigger pending transition to next Night if Dusk)
  const handleDismissGMAnnouncement = useCallback(() => {
    setGmAnnouncement(null);
    if (pendingNightTransition) {
      const { nextPlayers, nextRound, nextFrenzy } = pendingNightTransition;
      setPendingNightTransition(null);
      sound.playNightBell();
      beginNewNight(nextPlayers, nextRound, nextFrenzy);
    }
  }, [pendingNightTransition, beginNewNight]);

  // Handle clicking a 3D character in the Village Circle or Bottom Dock
  const handleSelect3DPlayer = useCallback(
    (targetId: string) => {
      const target = players.find((p) => p.id === targetId);
      if (!target) return;

      if (
        activePropTool &&
        (phase === 'day_discussion' || phase === 'day_voting')
      ) {
        handleThrowProp(me.id, targetId, activePropTool);
        return;
      }

      if (!target.isAlive) return;
      sound.playCardFlip();

      if (phase === 'hunter_revenge' && activeHunter) {
        if (targetId === activeHunter.id) return;
        sound.playShotgunCock();
        sound.playDeath();
        const { updatedPlayers: shotPlayers, victimName, extraVictimId, wolfPupTriggeredNextNight } =
          resolveHunterShot(players, activeHunter.id, targetId);
        let updatedPlayers = shotPlayers;
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
        if (wolfPupTriggeredNextNight) setWolfPupFrenzy(true);
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
          const isBotSeerInDawn = (dawnCtx?.beforePlayers || players).some(
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
          const duskAfterShot = buildDuskGMAnnouncement({
            round,
            beforePlayers: players,
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
          });
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
            nextFrenzy: Boolean(wolfPupTriggeredNextNight || wolfPupFrenzy),
          });
          setGmAnnouncement(duskAfterShot);
          sound.playGMAnnouncement('dusk', true, duskAfterShot.spokenNarration, lang);
        }
        return;
      }

      if (phase === 'day_voting') {
        if (!me.isAlive || targetId === me.id) return;
        // Toggle off if clicking the currently voted player
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
        // Strict single-vote lock: prevent clicking multiple people at once!
        if (selectedTargetId !== null) {
          const currentChosenLabel =
            selectedTargetId === CAMPFIRE_ABSTAIN_ID
              ? lang === 'vi'
                ? 'Lửa Trại (Phiếu trắng)'
                : 'Campfire (Abstain)'
              : players.find((p) => p.id === selectedTargetId)?.name ||
                (lang === 'vi' ? 'người đang chọn' : 'your selection');
          setEventBanner(
            lang === 'vi'
              ? `⚖️ Chỉ được bầu 1 phiếu! Bấm lại ${currentChosenLabel} hoặc nút "Đổi phiếu" để đổi.`
              : `⚖️ Only 1 vote allowed! Unselect ${currentChosenLabel} or click "Change" first.`
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
          setHasInspectedTonight(true);
          setSeerTargetTonightId(targetId);
          setSelectedTargetId(targetId);
          sound.playMysticChime();
          const isWolf = target.roleId === 'werewolf' || target.roleId === 'wolf_pup';
          // Human Seer's inspection stays strictly private to the human's own notebook (never telepathically shared to AI bots!)
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
        } else if (
          (me.roleId === 'werewolf' || me.roleId === 'wolf_pup') &&
          currentNightStep?.key === 'werewolf'
        ) {
          if (wolfPupFrenzy && tonightWolfVictimId && tonightWolfVictimId !== targetId) {
            setSecondWolfTargetId(targetId);
            setEventBanner(`🐺 2x: ${target.name}!`);
          } else {
            setTonightWolfVictimId(targetId);
            setSelectedTargetId(targetId);
            setEventBanner(`🐺 ${target.name}!`);
          }
        } else if (me.roleId === 'bodyguard' && currentNightStep?.key === 'bodyguard') {
          if (target.protectedLastNight) {
            setEventBanner(
              lang === 'vi'
                ? `🛡️ Không được bảo vệ ${target.name} 2 đêm liên tiếp!`
                : `🛡️ Cannot shield ${target.name} two nights in a row!`
            );
            return;
          }
          sound.playShieldClang();
          setGuardTargetTonightId(targetId);
          setSelectedTargetId(targetId);
          setEventBanner(`🛡️ ${target.name}!`);
        } else if (me.roleId === 'witch' && currentNightStep?.key === 'witch') {
          if (targetId === me.id) return;
          if (!me.hasUsedPoison) {
            sound.playWitchCauldron();
            setWitchPoisonTargetId(
              witchPoisonTargetId === targetId ? null : targetId
            );
            setSelectedTargetId(targetId);
            setEventBanner(`🧪 ${target.name}!`);
          }
        } else if (me.roleId === 'cupid' && round === 1 && currentNightStep?.key === 'cupid') {
          sound.playCupidHarp();
          if (!cupidLovers || (cupidLovers[0] && cupidLovers[1])) {
            setCupidLovers([targetId, '']);
            setSelectedTargetId(targetId);
            setEventBanner(`💘 1/2: ${target.name}`);
          } else if (cupidLovers[0] && !cupidLovers[1] && cupidLovers[0] !== targetId) {
            const pair: [string, string] = [cupidLovers[0], targetId];
            setCupidLovers(pair);
            setSecondWolfTargetId(targetId);
            setPlayers((prev) =>
              prev.map((p) => {
                if (p.id === pair[0]) return { ...p, loverId: pair[1] };
                if (p.id === pair[1]) return { ...p, loverId: pair[0] };
                return p;
              })
            );
            setEventBanner(`💘 2/2: ${target.name}!`);
          }
        } else if (
          me.roleId === 'doppelganger' &&
          round === 1 &&
          currentNightStep?.key === 'doppelganger'
        ) {
          if (targetId === me.id) return;
          setDoppelgangerTargetId(targetId);
          setSelectedTargetId(targetId);
          setEventBanner(`🪞 ${target.name}!`);
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
      finishGame,
      handleThrowProp,
      timerConfig.dayDiscussSec,
      t,
      lang,
    ]
  );

  // Fast-Forward / Advance Phase Handler (If human night turn hasn't happened yet, jumps to human turn instead of skipping night!)
  const handleAdvancePhaseFast = useCallback(() => {
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

  // Countdown Timer Effect (Paused while Onboarding Tour, GM Announcement, or Night Death Cinematic is open)
  useEffect(() => {
    if (
      shellState !== 'playing' ||
      phase === 'game_over' ||
      phase === 'lobby' ||
      showOnboardingTour ||
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
  }, [shellState, phase, showOnboardingTour, gmAnnouncement, nightDeathCinematic]);

  const isLastNightStep =
    phase === 'night' && nightSchedule.length > 0 && nightStepIndex >= nightSchedule.length - 1;
  const isHumanHunterRevenge =
    phase === 'hunter_revenge' && Boolean(activeHunter && !activeHunter.isBot);

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

  // Trigger step-by-step Auto-GM progression when timer reaches 0 (NEVER runs outside 'playing'!)
  useEffect(() => {
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
    } else {
      handleAdvancePhaseFast();
    }
  }, [
    timerSeconds,
    canAutoAdvanceOnZero,
    matchInstanceId,
    round,
    phase,
    nightStepIndex,
    handleAdvanceNightStep,
    handleStartDayVoting,
    handleAdvancePhaseFast,
  ]);

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
    setIsUserRoaming(false);
    setAimedOwnSeat(false);
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
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      // In standalone real-life GM mode, ignore 3D game shortcuts (except Escape to close rules modal)
      if (shellState === 'gm_host' || shellState === 'gm_player') {
        if (e.code === 'Escape' && activeDrawer !== 'none') {
          e.preventDefault();
          setActiveDrawer('none');
        }
        return;
      }

      if (shellState === 'title' && (e.code === 'Enter' || e.code === 'Space')) {
        if (!lobbyModalState.isOpen) {
          e.preventDefault();
          handleStartMatch(villageSize, preferredRole, 'ai_practice');
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

      if (e.code === 'Escape' || e.code === 'KeyP') {
        e.preventDefault();
        if (e.code === 'Escape' && (freeLook360 || document.pointerLockElement)) {
          setFreeLook360(false);
          if (document.pointerLockElement && typeof document.exitPointerLock === 'function') {
            document.exitPointerLock();
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
        } else if (shellState === 'playing') {
          setShellState('paused');
        } else if (shellState === 'paused') {
          setShellState('playing');
        }
      } else if (e.code === 'KeyH' && shellState === 'playing') {
        setIsDockCollapsed((c) => !c);
      } else if (e.code === 'KeyN' && shellState === 'playing') {
        setIsNotebookOpen((o) => !o);
      } else if (e.code === 'KeyT' && shellState === 'playing' && phase !== 'night') {
        setActiveToolPopover((p) => (p === 'props' ? 'none' : 'props'));
      } else if (e.code === 'KeyM') {
        const m = sound.toggleMute();
        setIsMuted(m);
      } else if (e.code === 'KeyC' && shellState === 'playing') {
        setShowMyRoleModal((s) => !s);
      } else if (e.code === 'KeyV' && shellState === 'playing') {
        handleToggleFirstPerson();
      } else if (e.code === 'KeyB' && shellState === 'playing') {
        handleToggleThirdPerson();
      } else if (
        e.code === 'KeyE' &&
        shellState === 'playing' &&
        isDirectLookCameraPreset(cameraPreset)
      ) {
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
    activeDrawer,
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
    cameraPreset,
    aimedOwnSeat,
    isUserRoaming,
    aimedPlayerId,
    aimedCampfire,
    handleSelect3DPlayer,
    handleVoteCampfireAbstain,
  ]);

  // Subscribe to live WebSocket chat, props, and votes during Online matches
  useEffect(() => {
    if (shellState !== 'playing' || gameMode !== 'online' || !roomId) return;
    return realtimeClient.subscribe((evt) => {
      if (evt.type === 'room:chat' && evt.code === roomId) {
        setMessages((prev) =>
          prev.some((m) => m.id === evt.message.id) ? prev : [...prev, evt.message]
        );
      } else if (evt.type === 'room:prop' && evt.code === roomId) {
        if (evt.event.fromPlayerId !== me.id) {
          handleThrowProp(evt.event.fromPlayerId, evt.event.targetPlayerId, evt.event.propType, true);
        }
      } else if (evt.type === 'room:votes' && evt.code === roomId) {
        const synced: VoteRecord[] = Object.entries(evt.votes).map(([voterId, targetId]) => ({
          voterId,
          targetId,
        }));
        setVotes((prev) => {
          const botVotes = prev.filter((v) => !evt.votes[v.voterId]);
          return [...botVotes, ...synced];
        });
      }
    });
  }, [shellState, gameMode, roomId, me.id, handleThrowProp]);

  // Send Chat Message (Strict Dead Ghost Chat Lockout + Live WebSocket Broadcast)
  const handleSendMessage = () => {
    if (!me.isAlive) {
      setChatNotice(
        lang === 'vi'
          ? '🔒 Bạn đã thành Hồn Ma — Cấm chat & khóa Mic cho đến hết ván!'
          : '🔒 You are a Ghost — Chat & Mic are locked until the match ends!'
      );
      setChatInput('');
      return;
    }
    const text = chatInput.trim();
    if (!text) return;
    const msgId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setChatNotice('');
    const nextMsg: ChatMessage = {
      id: msgId,
      senderId: me.id,
      senderName: me.name,
      text,
      timestamp: Date.now(),
      isGhost: false,
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

  const aliveWolvesCount = players.filter(
    (p) => p.isAlive && (p.roleId === 'werewolf' || p.roleId === 'wolf_pup')
  ).length;
  const aliveVillagersCount = players.filter(
    (p) => p.isAlive && p.roleId !== 'werewolf' && p.roleId !== 'wolf_pup'
  ).length;

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
    activeToolPopover !== 'none' ||
    Boolean(gmAnnouncement);

  const handleToggleFreeLook = () => {
    if (freeLook360) {
      setFreeLook360(false);
      if (document.pointerLockElement && typeof document.exitPointerLock === 'function') {
        document.exitPointerLock();
      }
      return;
    }
    if (isUiOverlayOpen || isNightBlindfolded || Boolean(nightDeathCinematic)) return;
    setFreeLook360(true);
    const canvas = document.querySelector<HTMLCanvasElement>('[data-testid="village-3d-canvas"] canvas');
    if (canvas && typeof canvas.requestPointerLock === 'function') {
      try {
        const p = canvas.requestPointerLock() as unknown as Promise<void> | undefined;
        if (p && typeof p.catch === 'function') p.catch(() => {});
      } catch {
        // Fallback: hold-drag + viewport edge-pan remains seamlessly available
      }
    }
  };

  const canUseVirtualDpad =
    shellState === 'playing' &&
    !isNightBlindfolded &&
    !nightDeathCinematic &&
    ((phase === 'night' && isPlayerAwakeAtNight) || !me.isAlive || isDirectLookCam);

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
                {isHostShell
                  ? lang === 'vi'
                    ? 'Chế Độ Quản Trò Ngoài Đời'
                    : 'Real-Life Game Master Mode'
                  : lang === 'vi'
                  ? 'Thẻ Bài Cá Nhân — Phòng Quản Trò'
                  : 'Personal Role Card — GM Room'}
              </div>
              <div className="text-[10px] text-slate-400 truncate">
                {isHostShell
                  ? lang === 'vi'
                    ? 'Công cụ hỗ trợ ván đấu ngoài đời · Không liên quan chế độ Bot/Online'
                    : 'Offline table companion · Isolated from Bot/Online matches'
                  : lang === 'vi'
                  ? 'Chỉ hiển thị duy nhất vai trò của bạn'
                  : 'Shows ONLY your own secret role'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
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
              onClick={() => {
                const m = sound.toggleMute();
                setIsMuted(m);
              }}
              aria-label={t.toggleSound}
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 cursor-pointer"
            >
              <Volume2 className={`w-4 h-4 ${isMuted ? 'text-slate-500' : 'text-emerald-400'}`} />
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
              }}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-bold text-slate-100 flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>{lang === 'vi' ? 'Trang Chủ' : 'Home'}</span>
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
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5"
            style={{ backgroundColor: 'rgba(5, 8, 17, 0.88)' }}
          >
            <div className="relative w-full max-w-4xl max-h-[86vh] bg-[#0b101e] border-2 border-amber-600/50 rounded-2xl p-4 sm:p-5 overflow-y-auto shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
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
        isUiOverlayOpen={isUiOverlayOpen}
        isPlayerAwakeAtNight={isPlayerAwakeAtNight || showOnboardingTour}
        freeLook360={freeLook360}
        moveVector={moveVector}
        thrownProps={thrownProps}
        selectedTargetId={selectedTargetId}
        secondaryTargetId={phase === 'day_voting' ? null : secondWolfTargetId}
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
        mapBiome={avatarConfig.mapBiome}
        mayorId={mayorId}
        emoteEvents={emoteEvents}
        deathCinematic={nightDeathCinematic}
        returnToSeatTrigger={returnToSeatTrigger}
        onPointerLockChange={setFreeLook360}
        onAimedPlayerChange={setAimedPlayerId}
        onAimedCampfireChange={setAimedCampfire}
        onAimedOwnSeatChange={setAimedOwnSeat}
        onRoamingStateChange={setIsUserRoaming}
        onReturnToSeat={handleReturnToSeat}
        onSelectPlayer={handleSelect3DPlayer}
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
                    className="text-[10px] sm:text-[11px] text-[#d6be9c] truncate"
                  >
                    {myWakeGuidance.headline} ·{' '}
                    {lang === 'vi'
                      ? 'Màn đêm bao trùm, chỉ còn ánh lửa trại le lói...'
                      : 'Darkness falls, leaving only the campfire embers glowing...'}
                  </div>
                </div>
              </div>

              {currentNightStep && (
                <span className="px-2 py-0.5 rounded-lg bg-indigo-950/85 border border-indigo-500/50 text-[10px] font-extrabold text-amber-300 whitespace-nowrap">
                  {lang === 'vi'
                    ? `Đang gọi (${currentNightStep.stepIndex + 1}/${currentNightStep.totalSteps}): ${ROLES[currentNightStep.roleId].name.vi}`
                    : `Calling (${currentNightStep.stepIndex + 1}/${currentNightStep.totalSteps}): ${ROLES[currentNightStep.roleId].name[lang]}`}
                </span>
              )}
            </div>

            {currentNightStep && (
              <div className="flex flex-wrap items-center justify-between gap-1.5 bg-[#0a0812]/80 border border-indigo-500/30 rounded-xl px-2.5 py-1.5">
                <p className="text-[10px] sm:text-[11px] text-indigo-200 italic truncate max-w-full">
                  “{currentNightStep.gmNarration[lang]}”
                </p>
                <div className="flex flex-wrap items-center gap-1">
                  {nightSchedule.map((st, idx) => (
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
                      {st.isHumanTurn ? (lang === 'vi' ? ' (Bạn)' : ' (You)') : ''}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-center sm:justify-end gap-1.5">
              {myNightStepIdx !== -1 && myNightStepIdx !== nightStepIndex && (
                <button
                  type="button"
                  data-testid="blindfold-jump-my-turn-btn"
                  onClick={handleJumpToMyNightTurn}
                  className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-[11px] flex items-center gap-1 shadow-lg cursor-pointer"
                >
                  <FastForward className="w-3.5 h-3.5 fill-white" />
                  <span>
                    {lang === 'vi'
                      ? `⚡ Tua Tới Lượt Tôi (${myRole.name.vi})`
                      : `⚡ Jump to My Turn (${myRole.name[lang]})`}
                  </span>
                </button>
              )}
              {!myWakeGuidance.wakesTonight && gameMode === 'ai_practice' && (
                <button
                  type="button"
                  data-testid="blindfold-switch-active-role-btn"
                  onClick={handleSwitchToActiveNightRole}
                  className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-[11px] flex items-center gap-1 shadow-lg cursor-pointer"
                >
                  <span>🔮</span>
                  <span>
                    {lang === 'vi' ? 'Đổi Vai Có Kỹ Năng Đêm' : 'Switch to Night Role'}
                  </span>
                </button>
              )}
              <button
                type="button"
                data-testid="blindfold-next-step-btn"
                onClick={handleAdvanceNightStep}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-[11px] flex items-center gap-1 shadow-lg cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>
                  {lang === 'vi' ? 'Bước tiếp' : 'Next Step'} ({Math.round(timerSeconds)}s)
                </span>
              </button>
              <button
                type="button"
                data-testid="blindfold-skip-night-btn"
                onClick={handleAdvancePhaseFast}
                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-[11px] flex items-center gap-1 shadow-lg cursor-pointer"
              >
                <FastForward className="w-3.5 h-3.5 fill-slate-950" />
                <span>{t.skipNightLongBtn}</span>
              </button>
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
          onStartAIPractice={() => handleStartMatch(villageSize, preferredRole, 'ai_practice')}
          onStartOnboardingTour={() => {
            handleStartMatch(villageSize, preferredRole, 'ai_practice');
            setShowOnboardingTour(true);
          }}
        />
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
            showFactionHints={showFactionHints}
            showFastForwardBtn={
              !(
                (phase === 'night' && isPlayerAwakeAtNight && me.isAlive) ||
                phase === 'day_discussion' ||
                phase === 'day_voting'
              )
            }
            myRole={myRole}
            mayorName={players.find((p) => p.id === mayorId && p.isAlive)?.name || null}
            cameraPreset={cameraPreset}
            freeLook360={freeLook360}
            isMicOn={isMicOn && me.isAlive}
            isDead={!me.isAlive}
            isMuted={isMuted}
            onAdjustTimer={(delta) =>
              setTimerSeconds((s) => Math.max(3, Math.min(600, s + delta)))
            }
            onAdvancePhaseFast={handleAdvancePhaseFast}
            onOpenRoleCard={() => {
              sound.playCardFlip();
              setShowMyRoleModal(true);
            }}
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
            onPause={() => setShellState('paused')}
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
                tonightWolfVictimId={tonightWolfVictimId}
                witchSaveUsedTonight={witchSaveUsedTonight}
                witchPoisonTargetId={witchPoisonTargetId}
                seerInspectResult={seerInspectResult}
                cupidLovers={cupidLovers}
                onToggleWitchHeal={() => {
                  sound.playWitchCauldron();
                  setWitchSaveUsedTonight((prev) => !prev);
                }}
                onConfirmNightAction={handleResolveNight}
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
                onStartDayVoting={handleStartDayVoting}
                onResolveDayVoting={() => handleResolveDayVoting()}
                onVoteCampfireAbstain={handleVoteCampfireAbstain}
                onClearVote={handleClearMyVote}
                onReopenGMAnnouncement={
                  lastDawnAnnouncement
                    ? () => setGmAnnouncement(lastDawnAnnouncement)
                    : undefined
                }
              />
            )}

            {/* Ghost Soul Free-Flight Banner when User is Dead (merged into direct-look banner when in FPV/TPV) */}
            {!me.isAlive && !isDirectLookCam && !nightDeathCinematic && (
              <div
                data-testid="ghost-locked-banner"
                className="pointer-events-auto px-2.5 py-0.5 rounded-full bg-cyan-950/95 border border-cyan-400/60 text-[10px] font-bold text-cyan-200 flex items-center gap-1.5 shadow-lg max-w-[94vw]"
              >
                <Ghost className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span className="truncate">
                  {lang === 'vi'
                    ? '👻 Chế độ Hồn Ma · Bay tự do WASD · Space Lên / Ctrl Xuống · Giữ chuột kéo xoay 360° · 🔒 Chat & Mic đã khóa'
                    : '👻 Ghost Mode · Free Flight WASD · Space Up / Ctrl Down · Drag to Look 360° · 🔒 Chat & Mic Locked'}
                </span>
              </div>
            )}

            {/* Direct-Look (First-Person or Behind-the-Back) Active Status Pill */}
            {isDirectLookCam && !isNightBlindfolded && !nightDeathCinematic && (
              <div
                data-testid="fpv-active-banner"
                className={`pointer-events-auto px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1.5 shadow-lg max-w-[94vw] whitespace-nowrap border ${
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
                <span className="truncate">
                  {!me.isAlive
                    ? lang === 'vi'
                      ? `👻 Hồn Ma (${cameraPreset === 'third_person' ? 'Sau lưng [B]' : 'Góc 1 [V]'}) · Bay tự do WASD · Space Lên / Ctrl Xuống · Giữ chuột kéo xoay 360°`
                      : `👻 Ghost (${cameraPreset === 'third_person' ? 'Behind [B]' : 'FPV [V]'}) · Free Flight WASD · Space Up / Ctrl Down · Drag to Look 360°`
                    : cameraPreset === 'third_person'
                    ? lang === 'vi'
                      ? 'Góc nhìn sau lưng [B] · Giữ chuột kéo để xoay 360° (bấm 360° khóa chuột) · WASD Đi · Space Nhảy · E/Click Tương tác'
                      : 'Behind View [B] · Hold-Drag to Look 360° (360° Locks Cursor) · WASD Move · Space Jump · E/Click Interact'
                    : lang === 'vi'
                    ? 'Góc nhìn 1 [V] · Giữ chuột kéo để xoay 360° (bấm 360° khóa chuột) · WASD Đi · Space Nhảy · E/Click Tương tác'
                    : 'FPV [V] · Hold-Drag to Look 360° (360° Locks Cursor) · WASD Move · Space Jump · E/Click Interact'}
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
                  className="px-4 py-2 rounded-2xl bg-[#382313]/95 hover:bg-[#e86f24] border-2 border-[#f5b82e] text-[#fff6e5] font-extrabold text-xs sm:text-sm flex items-center gap-2 shadow-2xl transition-all active:scale-95 cursor-pointer"
                >
                  <span>🪑</span>
                  <span>
                    {lang === 'vi' ? 'Ngồi lại vào ghế của bạn [X]' : 'Sit Back on Your Stool [X]'}
                  </span>
                </button>
              </div>
            )}

          {/* MOBILE & OPEN-WORLD VIRTUAL D-PAD (Warm Agrou Wood, Zero backdrop-blur) */}
          {canUseVirtualDpad && (
            <div
              data-testid="virtual-dpad"
              className="fixed bottom-24 right-2 sm:right-auto sm:bottom-28 sm:left-3 z-30 pointer-events-auto flex flex-col items-center gap-0.5 agrou-wood-panel p-1 sm:p-1.5 rounded-xl shadow-lg"
            >
              <span className="text-[7px] sm:text-[8px] font-mono uppercase text-[#f2be6b] font-bold">
                {isDirectLookCam && me.isAlive
                  ? cameraPreset === 'third_person'
                    ? lang === 'vi'
                      ? 'Đi Bộ Sau Lưng'
                      : 'Behind Walk'
                    : t.dpadWalkFpv
                  : me.isAlive
                  ? t.dpadWalkNight
                  : t.dpadFlyGhost}
              </span>
              <div className="flex items-center gap-0.5">
                {isDirectLookCam && (
                  <button
                    type="button"
                    data-testid="fpv-turn-left-btn"
                    onPointerDown={() => setFpvLookTurnRate(-1)}
                    onPointerUp={() => setFpvLookTurnRate(0)}
                    onPointerLeave={() => setFpvLookTurnRate(0)}
                    className="w-7 h-6 sm:w-8 sm:h-7 rounded-lg bg-[#1d3a27] border border-emerald-500/40 text-emerald-300 active:bg-emerald-500 active:text-slate-950 flex items-center justify-center cursor-pointer"
                    aria-label="Turn Look Left"
                  >
                    <RotateCcw className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  data-testid="dpad-up-btn"
                  onPointerDown={() => setMoveVector({ x: 0, z: -1 })}
                  onPointerUp={() => setMoveVector({ x: 0, z: 0 })}
                  onPointerLeave={() => setMoveVector({ x: 0, z: 0 })}
                  className="w-7 h-6 sm:w-8 sm:h-7 rounded-lg bg-[#352316] border border-[#6a4a2f] text-[#f5e6cc] active:bg-[#e86f24] active:text-[#1b1008] flex items-center justify-center cursor-pointer"
                  aria-label="Move Up"
                >
                  <ArrowUp className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </button>
                {isDirectLookCam && (
                  <button
                    type="button"
                    data-testid="fpv-turn-right-btn"
                    onPointerDown={() => setFpvLookTurnRate(1)}
                    onPointerUp={() => setFpvLookTurnRate(0)}
                    onPointerLeave={() => setFpvLookTurnRate(0)}
                    className="w-7 h-6 sm:w-8 sm:h-7 rounded-lg bg-[#1d3a27] border border-emerald-500/40 text-emerald-300 active:bg-emerald-500 active:text-slate-950 flex items-center justify-center cursor-pointer"
                    aria-label="Turn Look Right"
                  >
                    <RotateCw className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  data-testid="dpad-left-btn"
                  onPointerDown={() => setMoveVector({ x: -1, z: 0 })}
                  onPointerUp={() => setMoveVector({ x: 0, z: 0 })}
                  onPointerLeave={() => setMoveVector({ x: 0, z: 0 })}
                  className="w-7 h-6 sm:w-8 sm:h-7 rounded-lg bg-[#352316] border border-[#6a4a2f] text-[#f5e6cc] active:bg-[#e86f24] active:text-[#1b1008] flex items-center justify-center cursor-pointer"
                  aria-label="Move Left"
                >
                  <ArrowLeft className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </button>
                <button
                  type="button"
                  data-testid="dpad-down-btn"
                  onPointerDown={() => setMoveVector({ x: 0, z: 1 })}
                  onPointerUp={() => setMoveVector({ x: 0, z: 0 })}
                  onPointerLeave={() => setMoveVector({ x: 0, z: 0 })}
                  className="w-7 h-6 sm:w-8 sm:h-7 rounded-lg bg-[#352316] border border-[#6a4a2f] text-[#f5e6cc] active:bg-[#e86f24] active:text-[#1b1008] flex items-center justify-center cursor-pointer"
                  aria-label="Move Down"
                >
                  <ArrowDown className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </button>
                <button
                  type="button"
                  data-testid="dpad-right-btn"
                  onPointerDown={() => setMoveVector({ x: 1, z: 0 })}
                  onPointerUp={() => setMoveVector({ x: 0, z: 0 })}
                  onPointerLeave={() => setMoveVector({ x: 0, z: 0 })}
                  className="w-7 h-6 sm:w-8 sm:h-7 rounded-lg bg-[#352316] border border-[#6a4a2f] text-[#f5e6cc] active:bg-[#e86f24] active:text-[#1b1008] flex items-center justify-center cursor-pointer"
                  aria-label="Move Right"
                >
                  <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </button>
              </div>
              {isUserRoaming && me.isAlive && (
                <button
                  type="button"
                  data-testid="dpad-return-seat-btn"
                  onClick={handleReturnToSeat}
                  className="mt-0.5 w-full px-1.5 py-0.5 rounded-md bg-[#4a2d17] hover:bg-[#e86f24] border border-[#f5b82e]/70 text-[9px] font-extrabold text-[#fff4e0] cursor-pointer"
                >
                  🪑 {lang === 'vi' ? 'Về ghế' : 'Sit'}
                </button>
              )}
            </div>
          )}

          {/* UNIFIED COLLAPSIBLE BOTTOM CONTROL DOCK (Hidden while Night Blindfolded or Night Death Cinematic active) */}
          {!isNightBlindfolded && !nightDeathCinematic && (
          <div className="mx-auto w-full max-w-[1060px] pointer-events-auto flex flex-col items-center">
            {/* Subtle Desktop Movement Controls Legend */}
            {!isDirectLookCam && !showOnboardingTour && (
              <div
                data-testid="movement-controls-legend"
                className="hidden md:flex items-center gap-2 mb-1 px-2.5 py-0.5 rounded-full bg-[#19110b]/88 border border-[#5e4128]/70 text-[10px] text-[#e4cda9] font-semibold shadow"
              >
                {me.isAlive ? (
                  <>
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
                  </>
                ) : (
                  <>
                    <span>
                      <strong className="text-cyan-300">WASD</strong>{' '}
                      {lang === 'vi' ? 'Bay tự do' : 'Free Flight'}
                    </span>
                    <span className="opacity-40">·</span>
                    <span>
                      <strong className="text-cyan-300">Space / Ctrl</strong>{' '}
                      {lang === 'vi' ? 'Bay lên / Hạ xuống' : 'Ascend / Descend'}
                    </span>
                    <span className="opacity-40">·</span>
                    <span>
                      <strong className="text-cyan-300">
                        {lang === 'vi' ? 'Kéo chuột' : 'Drag'}
                      </strong>{' '}
                      {lang === 'vi' ? 'Xoay 360°' : 'Look 360°'}
                    </span>
                    <span className="opacity-40">·</span>
                    <span>
                      <strong className="text-cyan-300">X</strong>{' '}
                      {lang === 'vi' ? 'Về bia mộ' : 'Home Grave'}
                    </span>
                  </>
                )}
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
                    activePropTool={activePropTool}
                    onTriggerEmote={(emote) => handleTriggerEmote(emote, me.id)}
                    onSelectPropTool={setActivePropTool}
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
                        setMessages((prev) => [
                          ...prev,
                          {
                            id: `voice_${Date.now()}`,
                            senderId: me.id,
                            senderName: `🎙️ ${me.name}`,
                            senderRole: me.roleId,
                            text: transcript,
                            timestamp: Date.now(),
                            isGhost: false,
                          },
                        ]);
                      }}
                      lang={lang}
                      compact={true}
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
                    <span className="px-1.5 py-0.5 rounded-lg bg-[#3c2717] border border-[#8e6338] text-[#f5c879] font-bold text-[10px] sm:text-[11px] whitespace-nowrap">
                      {t.yourRolePrefix} {myRole.name[lang]}
                    </span>

                    {/* Cupid Lover Partner Badge */}
                    {me.loverId && (
                      <span className="px-1.5 py-0.5 rounded-lg bg-pink-950 border border-pink-500/60 text-pink-200 font-bold text-[10px] whitespace-nowrap">
                        💘 {players.find((p) => p.id === me.loverId)?.name || 'Lover'}
                      </span>
                    )}

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
                      onClick={() => {
                        sound.playCardFlip();
                        setIsNotebookOpen((o) => !o);
                      }}
                      className={`px-2 py-0.5 sm:py-1 rounded-lg text-[10px] font-bold border flex items-center gap-1 cursor-pointer shrink-0 ${
                        isNotebookOpen
                          ? 'bg-[#e8c682] border-[#f6e2b4] text-[#2c1a0d]'
                          : 'bg-[#362417] border-[#785334] text-[#f2d08f] hover:bg-[#493120]'
                      }`}
                    >
                      <BookMarked className="w-3 h-3" />
                      <span className="hidden sm:inline">
                        {lang === 'vi' ? 'Sổ Tay' : 'Notebook'}
                      </span>
                    </button>

                    {phase !== 'night' && (
                      <button
                        type="button"
                        data-testid="toggle-props-popover-btn"
                        onClick={() =>
                          setActiveToolPopover((p) => (p === 'props' ? 'none' : 'props'))
                        }
                        className={`px-2 py-0.5 sm:py-1 rounded-lg text-[10px] font-bold border flex items-center gap-1 cursor-pointer shrink-0 ${
                          activeToolPopover === 'props' || activePropTool
                            ? 'bg-[#e86f24] border-[#ffc389] text-white'
                            : 'bg-[#362417] border-[#69482e] text-[#f3ca82] hover:bg-[#493120]'
                        }`}
                      >
                        <span>🎭</span>
                        <span className="hidden sm:inline">
                          {lang === 'vi' ? 'Biểu cảm & Đạo cụ' : 'Emotes & Props'}
                        </span>
                      </button>
                    )}

                    <button
                      type="button"
                      data-testid="toggle-voice-popover-btn"
                      onClick={() =>
                        setActiveToolPopover((p) => (p === 'voice' ? 'none' : 'voice'))
                      }
                      className={`px-2 py-0.5 sm:py-1 rounded-lg text-[10px] font-bold border flex items-center gap-1 cursor-pointer shrink-0 ${
                        !me.isAlive
                          ? 'bg-[#2a1518] border-rose-500/50 text-rose-300'
                          : activeToolPopover === 'voice' || isMicOn
                          ? 'bg-emerald-700 border-emerald-400 text-white'
                          : 'bg-[#302016] border-[#61422a] text-emerald-300 hover:bg-[#422c1e]'
                      }`}
                    >
                      {!me.isAlive ? <Lock className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
                      <span className="hidden sm:inline">
                        {!me.isAlive ? (lang === 'vi' ? 'Mic Khóa' : 'Mic Locked') : 'Voice'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setActiveDrawer(activeDrawer === 'chat' ? 'none' : 'chat')
                      }
                      className={`px-2 py-0.5 sm:py-1 rounded-lg text-[10px] font-bold border flex items-center gap-1 cursor-pointer shrink-0 ${
                        activeDrawer === 'chat'
                          ? 'bg-[#b33228] border-[#f4a296] text-white'
                          : 'bg-[#302016] border-[#61422a] text-[#efe0c4] hover:bg-[#422c1e]'
                      }`}
                    >
                      <MessageSquare className="w-3 h-3 text-[#f2955e]" />
                      <span>
                        {t.chatBtn} ({messages.length})
                      </span>
                    </button>

                    {gameMode === 'gm' && (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            setActiveDrawer(activeDrawer === 'gm' ? 'none' : 'gm')
                          }
                          className={`px-2 py-0.5 sm:py-1 rounded-lg text-[10px] font-bold border flex items-center gap-1 cursor-pointer shrink-0 ${
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
                          onClick={() =>
                            setActiveDrawer(activeDrawer === 'cards' ? 'none' : 'cards')
                          }
                          className={`px-2 py-0.5 sm:py-1 rounded-lg text-[10px] font-bold border flex items-center gap-1 cursor-pointer shrink-0 ${
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
                      onClick={() =>
                        setActiveDrawer(
                          activeDrawer === 'leaderboard' ? 'none' : 'leaderboard'
                        )
                      }
                      className="px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-lg bg-[#302016] border border-[#61422a] text-[10px] font-bold text-[#f4cb74] hover:bg-[#422c1e] flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <Trophy className="w-3 h-3" />
                      <span className="hidden sm:inline">{t.leaderboardShort}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setActiveDrawer(
                          activeDrawer === 'history' ? 'none' : 'history'
                        )
                      }
                      className="px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-lg bg-[#302016] border border-[#61422a] text-[10px] font-bold text-[#95cbf0] hover:bg-[#422c1e] flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <History className="w-3 h-3" />
                      <span className="hidden sm:inline">{t.historyShort}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setActiveDrawer(
                          activeDrawer === 'encyclopedia' ? 'none' : 'encyclopedia'
                        )
                      }
                      className="px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-lg bg-[#302016] border border-[#61422a] text-[10px] font-bold text-[#8cd8a8] hover:bg-[#422c1e] flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <BookOpen className="w-3 h-3" />
                      <span className="hidden sm:inline">{t.rulesShort}</span>
                    </button>
                  </div>
                </div>

                {/* Horizontal Player Seat Strip (Single-Line Chips on Mobile, 2-Line on Desktop) */}
                <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto pb-0.5">
                  {players.map((p, idx) => {
                    const isDayVoting = phase === 'day_voting';
                    const isSelected = isDayVoting
                      ? selectedTargetId === p.id
                      : selectedTargetId === p.id || secondWolfTargetId === p.id;
                    const vCount = votesMap[p.id] || 0;
                    const voterLabels = votersByTargetLabels[p.id] || [];
                    const isMyLover = me.loverId === p.id;
                    const isMayorSeat = mayorId === p.id && p.isAlive;
                    const isMyWolfPackmate =
                      p.id !== me.id &&
                      (me.roleId === 'werewolf' || me.roleId === 'wolf_pup') &&
                      (p.roleId === 'werewolf' || p.roleId === 'wolf_pup');
                    const suspectTag = suspectTags[p.id];
                    const isVoteLockedOut =
                      isDayVoting &&
                      !activePropTool &&
                      (!me.isAlive ||
                        !p.isAlive ||
                        p.id === me.id ||
                        (selectedTargetId !== null && selectedTargetId !== p.id));

                    const seatTooltip =
                      vCount > 0
                        ? `${p.name} — ${vCount} ${t.votesUnit}: ${voterLabels.join(', ')}`
                        : isVoteLockedOut && selectedTargetId !== null && p.isAlive && p.id !== me.id
                        ? lang === 'vi'
                          ? 'Chỉ được bầu 1 phiếu! Bấm lại lựa chọn hiện tại hoặc nút Đổi phiếu để đổi.'
                          : 'Only 1 vote allowed! Unselect your current choice or click Change first.'
                        : p.name;

                    return (
                      <button
                        key={p.id}
                        type="button"
                        data-testid={`dock-player-${p.id}`}
                        aria-pressed={isSelected}
                        disabled={isVoteLockedOut}
                        title={seatTooltip}
                        onClick={() => handleSelect3DPlayer(p.id)}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          handleTogglePlayerSuspectTag(p.id);
                        }}
                        className={`shrink-0 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-lg sm:rounded-xl border text-left transition-all flex items-center gap-1 sm:gap-1.5 ${
                          isVoteLockedOut
                            ? 'opacity-45 cursor-not-allowed'
                            : 'cursor-pointer'
                        } ${
                          !p.isAlive
                            ? 'bg-[#1a1512]/70 border-cyan-900/50 text-cyan-300/75'
                            : isSelected
                            ? isDayVoting
                              ? 'bg-[#8f261e] border-[#f4c062] ring-2 ring-[#f4c062]/80 text-white shadow-lg'
                              : 'bg-[#73231d] border-[#e6786b] text-rose-100 shadow-md'
                            : isDayVoting
                            ? 'bg-[#2a1d14] border-[#5f432b] text-[#f4e7cf] hover:border-[#f2be6b]'
                            : suspectTag === 'wolf_suspect'
                            ? 'bg-[#5a1e1a] border-[#d9534f] text-rose-100'
                            : suspectTag === 'trusted'
                            ? 'bg-[#19402b] border-[#42a870] text-emerald-100'
                            : p.id === me.id
                            ? 'bg-[#3b2919] border-[#e8a346] text-[#fff1d4]'
                            : isMyLover
                            ? 'bg-pink-950/80 border-pink-500/60 text-pink-100'
                            : isMyWolfPackmate
                            ? 'bg-[#4f1c19] border-[#c4453d] text-rose-100'
                            : 'bg-[#241911] border-[#4f3825] text-[#f0e3cb] hover:border-[#a87544]'
                        }`}
                      >
                        <span className="text-xs sm:text-sm">{p.isAlive ? p.avatar : '👻'}</span>
                        <div>
                          <div className="text-[9px] sm:text-[11px] font-bold whitespace-nowrap flex items-center gap-0.5 sm:gap-1">
                            <span className="text-[#f2be6b] font-mono">#{idx + 1}</span>
                            <span className="max-w-[68px] sm:max-w-none truncate">{p.name}</span>
                            {isMayorSeat && (
                              <span
                                className="inline-flex items-center text-[#f7cb66]"
                                title={lang === 'vi' ? 'Thị Trưởng (Phiếu x2)' : 'Mayor (x2 Vote)'}
                              >
                                <Crown className="w-2.5 h-2.5" />
                              </span>
                            )}
                            {isDayVoting && isSelected && (
                              <span className="px-1 rounded bg-[#f4c062] text-[#221409] text-[8px] font-black uppercase">
                                {lang === 'vi' ? '✓ Bạn bầu' : '✓ Voted'}
                              </span>
                            )}
                            {isMyLover && <span title="Tình nhân">💘</span>}
                            {isMyWolfPackmate && <span title="Đồng đội Sói">🐺</span>}
                            {suspectTag === 'wolf_suspect' && (
                              <span
                                className="px-1 rounded bg-rose-700 text-white text-[8px] font-extrabold"
                                title="Đánh dấu Nghi Sói"
                              >
                                🐺?
                              </span>
                            )}
                            {suspectTag === 'trusted' && (
                              <span
                                className="px-1 rounded bg-emerald-700 text-white text-[8px] font-extrabold"
                                title="Đánh dấu Đáng Tin"
                              >
                                🛡️✓
                              </span>
                            )}
                            {vCount > 0 && (
                              <span className="sm:hidden px-1 rounded bg-[#b92e25] text-white text-[8px] font-mono">
                                {vCount}
                              </span>
                            )}
                          </div>
                          <div className="hidden sm:block text-[9px] font-mono text-[#d4bea1] leading-tight max-w-[165px] truncate">
                            {!me.isAlive
                              ? `${!p.isAlive ? '👻 ' : ''}${ROLES[p.roleId].name[lang]}${
                                  vCount > 0 ? ` · ${vCount} ${t.votesUnit}` : ''
                                }`
                              : !p.isAlive
                              ? t.ghostStatus
                              : vCount > 0
                              ? `${vCount} ${t.votesUnit} · ${voterLabels.join(', ')}`
                              : suspectTag === 'wolf_suspect'
                              ? lang === 'vi'
                                ? '🐺 Nghi Sói'
                                : '🐺 Suspect'
                              : suspectTag === 'trusted'
                              ? lang === 'vi'
                                ? '🛡️ Đáng tin'
                                : '🛡️ Trusted'
                              : p.id === me.id
                              ? ROLES[p.roleId].name[lang]
                              : isMyLover
                              ? lang === 'vi'
                                ? '💘 Tình nhân'
                                : '💘 Lover'
                              : isMyWolfPackmate
                              ? lang === 'vi'
                                ? '🐺 Đồng đội'
                                : '🐺 Packmate'
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
          className="fixed inset-0 z-40 flex items-center justify-center p-2.5 sm:p-4 pointer-events-auto"
          style={{ backgroundColor: 'rgba(12, 8, 5, 0.84)' }}
        >
          <div className="relative w-full max-w-5xl max-h-[88vh] agrou-wood-panel rounded-2xl p-3.5 sm:p-5 overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4 gap-2">
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
                    setMessages((prev) => [
                      ...prev,
                      {
                        id: `voice_${Date.now()}`,
                        senderId: me.id,
                        senderName: `🎙️ ${me.name}`,
                        senderRole: me.roleId,
                        text: transcript,
                        timestamp: Date.now(),
                        isGhost: false,
                      },
                    ]);
                  }}
                  lang={lang}
                  compact={false}
                />
                <div className="flex flex-wrap items-center justify-between pb-2 mb-2 border-b border-slate-800 gap-2">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setChatTab('main')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                        chatTab === 'main'
                          ? 'bg-rose-800 text-white'
                          : 'bg-slate-900 text-slate-400'
                      }`}
                    >
                      {t.chatMainTab}
                    </button>
                    <button
                      type="button"
                      onClick={() => setChatTab('ghost')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer ${
                        chatTab === 'ghost'
                          ? 'bg-purple-800 text-white'
                          : 'bg-slate-900 text-slate-400'
                      }`}
                    >
                      <Skull className="w-3.5 h-3.5" />
                      <span>{t.chatGhostTab}</span>
                    </button>
                  </div>
                  {chatNotice && (
                    <span className="text-[11px] text-amber-400 font-semibold">
                      {chatNotice}
                    </span>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-xs">
                  {messages
                    .filter((m) => (chatTab === 'ghost' ? m.isGhost : !m.isGhost))
                    .map((msg) => (
                      <div
                        key={msg.id}
                        className={`p-2.5 rounded-xl border ${
                          msg.isSystem
                            ? 'bg-rose-950/40 border-rose-800/50 text-rose-200'
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
                        <p>{msg.text}</p>
                      </div>
                    ))}
                  <div ref={chatBottomRef} />
                </div>

                {!me.isAlive ? (
                  <div
                    data-testid="dead-chat-locked-banner"
                    className="mt-3 rounded-xl bg-rose-950/75 border border-rose-500/60 px-3 py-2.5 flex items-center justify-between gap-2 text-xs text-rose-200 font-bold"
                  >
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>
                        {lang === 'vi'
                          ? '👻 Bạn đã chết thành Hồn Ma — Khung chat và Micro đã bị khóa cho đến hết ván!'
                          : '👻 You are dead (Ghost) — Chat and Microphone are locked until the match ends!'}
                      </span>
                    </div>
                  </div>
                ) : null}

                <div className="pt-3 flex gap-2">
                  <input
                    type="text"
                    data-testid="chat-message-input"
                    disabled={!me.isAlive}
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder={
                      !me.isAlive
                        ? lang === 'vi'
                          ? '🔒 Hồn Ma không thể chat...'
                          : '🔒 Ghosts cannot chat...'
                        : t.chatPlaceholder
                    }
                    className={`flex-1 bg-[#070a14] border rounded-xl px-3 py-2 text-xs focus:outline-none ${
                      !me.isAlive
                        ? 'border-rose-900/60 text-slate-500 cursor-not-allowed opacity-65'
                        : 'border-slate-700 text-slate-100 focus:border-amber-500'
                    }`}
                  />
                  <button
                    type="button"
                    data-testid="chat-send-btn"
                    disabled={!me.isAlive}
                    onClick={handleSendMessage}
                    className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1 ${
                      !me.isAlive
                        ? 'bg-slate-800 border border-slate-700 text-slate-500 cursor-not-allowed'
                        : 'bg-rose-600 hover:bg-rose-500 text-white cursor-pointer'
                    }`}
                  >
                    {!me.isAlive ? <Lock className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />}
                    <span>{!me.isAlive ? (lang === 'vi' ? 'Đã khóa' : 'Locked') : t.sendBtn}</span>
                  </button>
                </div>
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
          className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-auto"
          style={{ backgroundColor: 'rgba(5, 8, 17, 0.88)' }}
        >
          <div className="w-full max-w-md bg-[#0d1322] border-2 border-amber-600/50 rounded-2xl p-5 sm:p-6 text-center space-y-4 shadow-2xl">
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
                  <span>{lang === 'vi' ? 'Sau lưng [B]' : 'Behind [B]'}</span>
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
                  onClick={() => {
                    const m = sound.toggleMute();
                    setIsMuted(m);
                  }}
                  className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 cursor-pointer"
                >
                  <Volume2
                    className={`w-4 h-4 ${isMuted ? 'text-slate-500' : 'text-emerald-400'}`}
                  />
                </button>
              </div>
            </div>

            {/* Phase Timers inside Pause Modal */}
            <div className="bg-[#070a14] border border-slate-800 rounded-xl p-3 text-left space-y-2">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400">
                ⏱️ {lang === 'vi' ? 'Thời Gian Đợi Mỗi Pha (Giây)' : 'Phase Wait Timers (Seconds)'}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">
                    {lang === 'vi' ? 'Đêm (Vai bạn)' : 'Night Turn'}
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={180}
                    value={timerConfig.nightActionSec}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      if (!Number.isNaN(v)) {
                        handleUpdateTimerConfig({
                          ...timerConfig,
                          nightActionSec: Math.max(5, Math.min(180, v)),
                        });
                      }
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs font-mono font-bold text-amber-300 text-center"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">
                    {lang === 'vi' ? 'Thảo luận' : 'Discussion'}
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={600}
                    value={timerConfig.dayDiscussSec}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      if (!Number.isNaN(v)) {
                        handleUpdateTimerConfig({
                          ...timerConfig,
                          dayDiscussSec: Math.max(10, Math.min(600, v)),
                        });
                      }
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs font-mono font-bold text-amber-300 text-center"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">
                    {lang === 'vi' ? 'Bỏ phiếu' : 'Voting'}
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={300}
                    value={timerConfig.dayVoteSec}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      if (!Number.isNaN(v)) {
                        handleUpdateTimerConfig({
                          ...timerConfig,
                          dayVoteSec: Math.max(10, Math.min(300, v)),
                        });
                      }
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs font-mono font-bold text-amber-300 text-center"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => setShellState('playing')}
                className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs cursor-pointer"
              >
                {t.resumeBtn}
              </button>
              <button
                type="button"
                onClick={() => handleStartMatch()}
                className="w-full py-3 rounded-xl bg-rose-700 hover:bg-rose-600 text-white font-bold text-xs cursor-pointer"
              >
                {t.restartMatchBtn}
              </button>
              <button
                type="button"
                onClick={() => setShellState('title')}
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
          className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-auto"
          style={{ backgroundColor: 'rgba(5, 8, 17, 0.9)' }}
        >
          <div className="w-full max-w-lg bg-[#0d1322] border-2 border-amber-500/60 rounded-2xl p-6 text-center space-y-5 shadow-2xl">
            <div className="w-20 h-20 rounded-2xl bg-rose-950 border-2 border-amber-400 mx-auto flex items-center justify-center text-5xl shadow-xl">
              {gameResult.winner === 'werewolves'
                ? '🐺'
                : gameResult.winner === 'lovers'
                ? '💘'
                : gameResult.winner === 'tanner'
                ? '🎭'
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

            <div className="flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                onClick={() => handleStartMatch()}
                className="flex-1 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>{t.playAgainBtn}</span>
              </button>
              <button
                type="button"
                onClick={() => setShellState('title')}
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
        onLaunchOnlineRoom={(code, size, peers) => {
          handleStartMatch(size, preferredRole, 'online', code, peers);
        }}
        onLaunchGMHost={(code, size, deckMode) => {
          sound.stopBGM();
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
          setLobbyModalState({ isOpen: false, mode: 'gm' });
          setGameMode('gm');
          setVirtualCardRoomId(code);
          setActiveDrawer('none');
          setGmAnnouncement(null);
          setRoleCalloutToast(null);
          setGameResult(null);
          setShellState('gm_player');
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
          lang={lang}
          onClose={() => setShowMyRoleModal(false)}
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
            }
            const nextUser: UserProfileData = {
              ...currentUser,
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
            // Immediately sync updated profile name & avatar into 3D village players
            setPlayers((prev) =>
              prev.map((p) =>
                p.id === currentUser.id
                  ? { ...p, name: profile.name, avatar: profile.avatar }
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
