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
} from 'lucide-react';
import { WerewolfVillage3D } from './components/WerewolfVillage3D';
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
} from './types/game';
import { ROLES } from './game/roles';
import {
  generateBalancedRoster,
  assignPreferredRoleToDeck,
  resolveNightActions,
  applyDayLynch,
  tallyVotes,
  checkWinCondition,
  resolveHunterShot,
} from './game/rules';
import {
  buildAutoGMNightSchedule,
  isPlayerAwakeForNightStep,
  computeAutoGMBotNightStepAction,
  computeSmartBotDayVotes,
  buildBotDayDiscussionLines,
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
  // Game Shell State ('title' | 'playing' | 'paused' | 'gameover')
  const [shellState, setShellState] = useState<'title' | 'playing' | 'paused' | 'gameover'>(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1' || params.get('room')) return 'playing';
    return 'title';
  });

  const [gameMode, setGameMode] = useState<GameMode>('ai_practice');
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
  const [virtualCardRoomId, setVirtualCardRoomId] = useState<string>('');
  const [activeDrawer, setActiveDrawer] = useState<DrawerTool>('none');
  const [isDockCollapsed, setIsDockCollapsed] = useState<boolean>(false);
  const [isTitleMenuMinimized, setIsTitleMenuMinimized] = useState<boolean>(false);
  const [cameraPreset, setCameraPreset] = useState<'orbit' | 'campfire' | 'overhead' | 'dramatic'>(
    'campfire'
  );
  const [freeLook360, setFreeLook360] = useState<boolean>(false);

  // Room Creation / Join Lobby Modal State
  const [lobbyModalState, setLobbyModalState] = useState<{
    isOpen: boolean;
    mode: 'online' | 'gm';
  }>({ isOpen: false, mode: 'online' });

  // Interactive Spotlight Onboarding Guide ("Guild hướng dẫn")
  const [showOnboardingTour, setShowOnboardingTour] = useState<boolean>(false);

  // Mobile / Open-World Virtual D-Pad Vector
  const [moveVector, setMoveVector] = useState<{ x: number; z: number }>({ x: 0, z: 0 });

  // Fun Day Discussion Props (Tomatoes, Rotten Eggs, Roses, Water)
  const [activePropTool, setActivePropTool] = useState<PropType | null>(null);
  const [thrownProps, setThrownProps] = useState<ThrownPropEvent[]>([]);

  // Role Callout Voice Toast Banner
  const [roleCalloutToast, setRoleCalloutToast] = useState<{
    roleId: RoleId;
    quote: string;
    sfxLabel: string;
  } | null>(null);

  // Anti-Cheat Night Blindfold Override (allows player to close eyes after acting)
  const [hasClosedEyesTonight, setHasClosedEyesTonight] = useState<boolean>(false);

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
  const [phase, setPhase] = useState<Phase>('night');
  const [round, setRound] = useState<number>(1);
  const [timerSeconds, setTimerSeconds] = useState<number>(30);
  const [wolfPupFrenzy, setWolfPupFrenzy] = useState<boolean>(false);

  // Players in the 3D Village Circle
  const [players, setPlayers] = useState<Player[]>(() => {
    const initialCount = 8;
    const roles = generateBalancedRoster(initialCount);
    return [
      {
        id: 'usr_me',
        name: 'Thợ Săn Đêm',
        avatar: '🐺',
        roleId: roles[0],
        isAlive: true,
        isHost: true,
        elderLives: roles[0] === 'elder' ? 2 : undefined,
      },
      ...BOT_NAMES.slice(0, initialCount - 1).map((name, i) => ({
        id: `bot_${i + 1}`,
        name,
        avatar: ['🐺', '🔮', '🛡️', '🧪', '🎯', '💘', '🎭', '👑', '🔥'][i % 9],
        roleId: roles[i + 1],
        isAlive: true,
        isBot: true,
        elderLives: roles[i + 1] === 'elder' ? 2 : undefined,
      })),
    ];
  });

  // Active 3D Selection & Role Power State
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [secondWolfTargetId, setSecondWolfTargetId] = useState<string | null>(null);
  const [cupidLovers, setCupidLovers] = useState<[string, string] | null>(null);
  const [witchSaveUsedTonight, setWitchSaveUsedTonight] = useState<boolean>(false);
  const [witchPoisonTargetId, setWitchPoisonTargetId] = useState<string | null>(null);
  const [tonightWolfVictimId, setTonightWolfVictimId] = useState<string | null>(null);
  const [seerInspectResult, setSeerInspectResult] = useState<string | null>(null);
  const [showMyRoleModal, setShowMyRoleModal] = useState<boolean>(false);

  // Automated Game Master ("Quản Trò Máy") Sequential Night & Rule State
  const [nightStepIndex, setNightStepIndex] = useState<number>(0);
  const [hasInspectedTonight, setHasInspectedTonight] = useState<boolean>(false);
  const [doppelgangerTargetId, setDoppelgangerTargetId] = useState<string | null>(null);
  const [guardTargetTonightId, setGuardTargetTonightId] = useState<string | null>(null);
  const [seerTargetTonightId, setSeerTargetTonightId] = useState<string | null>(null);
  const [knownWolfIds, setKnownWolfIds] = useState<string[]>([]);

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

  // Build sequential Night Call Schedule moderated by Quản Trò Máy
  const nightSchedule = buildAutoGMNightSchedule(players, round);
  const currentNightStep =
    phase === 'night'
      ? nightSchedule[Math.min(nightStepIndex, Math.max(0, nightSchedule.length - 1))] || null
      : null;

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

  // Sync Ambient BGM with current phase
  useEffect(() => {
    if (shellState === 'playing') {
      sound.setBGMMode(phase === 'night' ? 'night' : 'day');
    } else if (shellState === 'title') {
      sound.stopBGM();
    }
  }, [shellState, phase]);

  // Check URL query parameters on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      setVirtualCardRoomId(roomParam);
      setShellState('playing');
      setActiveDrawer('cards');
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

  // Reset per-night tracking whenever a new Night begins
  useEffect(() => {
    if (phase === 'night') {
      setNightStepIndex(0);
      setHasInspectedTonight(false);
      setHasClosedEyesTonight(false);
      setActivePropTool(null);
      setSelectedTargetId(null);
      setSecondWolfTargetId(null);
      setTonightWolfVictimId(null);
      setGuardTargetTonightId(null);
      setSeerTargetTonightId(null);
      setWitchSaveUsedTonight(false);
      setWitchPoisonTargetId(null);
    }
  }, [phase, round]);

  // Automated Game Master ("Quản Trò Máy") sequential night step orchestrator
  useEffect(() => {
    if (phase !== 'night' || !currentNightStep) return;

    const awakeNow = isPlayerAwakeForNightStep(me, currentNightStep.key, round);
    setHasClosedEyesTonight(false);
    setSelectedTargetId(null);
    setTimerSeconds(
      awakeNow ? currentNightStep.humanDurationSec : currentNightStep.botDurationSec
    );

    setEventBanner(
      awakeNow
        ? `${currentNightStep.gmNarration[lang]} · ${currentNightStep.playerInstruction[lang]}`
        : currentNightStep.gmNarration[lang]
    );

    if (shellState === 'playing') {
      triggerNightRoleCallout(currentNightStep.roleId);
    }

    // Execute AI Bot actions for the current night step according to canonical rules
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
  }, [phase, round, nightStepIndex, shellState]);

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

  // Throw a Tomato / Rotten Egg / Rose / Water Prop in 3D (Purely visual & audio fun teasing — NO chat message spam)
  const handleThrowProp = useCallback(
    (fromId: string, toId: string, propType: PropType) => {
      sound.playThrowWhoosh(propType);
      const newEv: ThrownPropEvent = {
        id: `prop_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        fromId,
        toId,
        propType,
        timestamp: Date.now(),
      };
      setThrownProps((prev) => [...prev.slice(-15), newEv]);
    },
    []
  );

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

      const freshPlayers: Player[] =
        customParticipants && customParticipants.length >= 4
          ? customParticipants.map((part, idx) => ({
              id: idx === 0 ? currentUser.id : part.id,
              name: idx === 0 ? currentUser.name : part.name,
              avatar: idx === 0 ? currentUser.avatar : part.avatar,
              roleId: deck[idx] || 'villager',
              isAlive: true,
              isHost: idx === 0 || Boolean(part.isHost),
              isBot: idx === 0 ? false : part.isBot,
              elderLives: deck[idx] === 'elder' ? 2 : undefined,
            }))
          : [
              {
                id: currentUser.id,
                name: currentUser.name,
                avatar: currentUser.avatar,
                roleId: deck[0],
                isAlive: true,
                isHost: true,
                elderLives: deck[0] === 'elder' ? 2 : undefined,
              },
              ...Array.from({ length: count - 1 }).map((_, i) => ({
                id: `bot_${i + 1}`,
                name: BOT_NAMES[i % BOT_NAMES.length],
                avatar: ['🐺', '🔮', '🛡️', '🧪', '🎯', '💘', '🎭', '👑', '🔥', '🧑‍🌾'][i % 10],
                roleId: deck[i + 1],
                isAlive: true,
                isBot: true,
                elderLives: deck[i + 1] === 'elder' ? 2 : undefined,
              })),
            ];

      setPlayers(freshPlayers);
      setRound(1);
      setPhase('night');
      setNightStepIndex(0);
      setHasInspectedTonight(false);
      setDoppelgangerTargetId(null);
      setGuardTargetTonightId(null);
      setSeerTargetTonightId(null);
      setKnownWolfIds([]);
      setTimerSeconds(18);
      setWolfPupFrenzy(false);
      setSelectedTargetId(null);
      setSecondWolfTargetId(null);
      setCupidLovers(null);
      setWitchSaveUsedTonight(false);
      setWitchPoisonTargetId(null);
      setTonightWolfVictimId(null);
      setSeerInspectResult(null);
      setVotes([]);
      setHasVoted(false);
      setActiveHunter(null);
      setGameResult(null);
      setHasClosedEyesTonight(false);
      setActiveDrawer('none');
      setLobbyModalState({ isOpen: false, mode: 'online' });
      setShellState('playing');

      // Show Interactive Onboarding Guild Tour on first entry unless already completed
      const tourDone = localStorage.getItem('werewolf_3d_tour_done') === '1';
      if (!tourDone) {
        setShowOnboardingTour(true);
      }

      const assignedDef = ROLES[deck[0]];
      setMessages([
        {
          id: `gm_start_${Date.now()}`,
          senderId: 'sys',
          senderName: '🤖 Quản Trò Máy',
          text:
            lang === 'vi'
              ? `🤖 Quản Trò Máy: Ván đấu ${count} người bắt đầu! Vai trò bí mật của bạn là ${assignedDef.name.vi}. Màn đêm buông xuống, cả làng nhắm mắt!`
              : `🤖 Auto-GM: ${count}-player match started! Your secret role is ${assignedDef.name[lang]}. Night falls, everyone close your eyes!`,
          timestamp: Date.now(),
          isSystem: true,
        },
      ]);
      setEventBanner(
        `${t.nightPhaseTitle(1)} · ${assignedDef.name[lang]}: ${assignedDef.instructions[lang]}`
      );
    },
    [currentUser, gameMode, villageSize, preferredRole, t, lang]
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
        fetch('/api/accounts/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: currentUser.handle,
            elo: nextElo,
            matchesPlayed: nextMatches,
            wins: nextWins,
          }),
        }).catch(() => {});

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

  // Resolve Night Actions -> Transition to Day (Moderated by Quản Trò Máy)
  const handleResolveNight = useCallback(() => {
    sound.playDayGong();

    const nonWolves = players.filter(
      (p) => p.isAlive && p.roleId !== 'werewolf' && p.roleId !== 'wolf_pup'
    );
    const livingGuards = players.filter(
      (p) => p.roleId === 'bodyguard' && p.isAlive && !p.hasUsedPower
    );
    const livingWitches = players.filter(
      (p) => p.roleId === 'witch' && p.isAlive && !p.hasUsedPower
    );

    let wolfTarget =
      me.roleId === 'werewolf' || me.roleId === 'wolf_pup'
        ? tonightWolfVictimId || selectedTargetId
        : tonightWolfVictimId;
    if (!wolfTarget && nonWolves.length > 0) {
      wolfTarget = nonWolves[Math.floor(Math.random() * nonWolves.length)].id;
    }

    let secondTarget = secondWolfTargetId;
    if (wolfPupFrenzy && !secondTarget && nonWolves.length > 1) {
      const other = nonWolves.find((p) => p.id !== wolfTarget);
      if (other) secondTarget = other.id;
    }

    let guardTarget =
      me.roleId === 'bodyguard' && !me.hasUsedPower
        ? guardTargetTonightId || selectedTargetId
        : guardTargetTonightId;
    if (!guardTarget && livingGuards.length > 0 && me.roleId !== 'bodyguard') {
      const validGuardTargets = players.filter((p) => p.isAlive && !p.protectedLastNight);
      if (validGuardTargets.length > 0) {
        guardTarget =
          validGuardTargets[Math.floor(Math.random() * validGuardTargets.length)].id;
      }
    }

    let witchHeal =
      livingWitches.length > 0 && !livingWitches[0].hasUsedHeal && witchSaveUsedTonight
        ? wolfTarget
        : null;
    let witchPoison =
      livingWitches.length > 0 && !livingWitches[0].hasUsedPoison
        ? witchPoisonTargetId
        : null;

    if (
      me.roleId !== 'witch' &&
      livingWitches.length > 0 &&
      !livingWitches[0].hasUsedPower &&
      !witchHeal &&
      !witchPoison
    ) {
      if (!livingWitches[0].hasUsedHeal && round === 1 && Math.random() > 0.5) {
        witchHeal = wolfTarget;
      } else if (!livingWitches[0].hasUsedPoison && round >= 2 && Math.random() > 0.65) {
        const poisonCandidates = players.filter(
          (p) => p.isAlive && p.id !== livingWitches[0].id && p.id !== wolfTarget
        );
        if (poisonCandidates.length > 0) {
          witchPoison =
            poisonCandidates[Math.floor(Math.random() * poisonCandidates.length)].id;
        }
      }
    }

    let resolvedCupidLovers: [string, string] | null =
      round === 1 && cupidLovers && cupidLovers[0] && cupidLovers[1]
        ? cupidLovers
        : null;
    if (round === 1 && !resolvedCupidLovers && me.roleId !== 'cupid') {
      const botCupid = players.find((p) => p.isAlive && p.roleId === 'cupid');
      const alivePool = players.filter((p) => p.isAlive);
      if (botCupid && alivePool.length >= 2) {
        resolvedCupidLovers = [alivePool[0].id, alivePool[1].id];
      }
    }

    let resolvedDoppelTarget: string | null =
      round === 1
        ? doppelgangerTargetId || (me.roleId === 'doppelganger' ? selectedTargetId : null)
        : null;
    if (round === 1 && !resolvedDoppelTarget && me.roleId !== 'doppelganger') {
      const botDoppel = players.find((p) => p.isAlive && p.roleId === 'doppelganger');
      const others = players.filter((p) => p.isAlive && p.id !== botDoppel?.id);
      if (botDoppel && others.length > 0) {
        resolvedDoppelTarget = others[0].id;
      }
    }

    const resolvedSeerTarget =
      seerTargetTonightId || (me.roleId === 'seer' && !me.hasUsedPower ? selectedTargetId : null);

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

    if (
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

    setPlayers(updatedPlayers);
    setWolfPupFrenzy(Boolean(result.wolfPupTriggeredNextNight));
    setSelectedTargetId(null);
    setSecondWolfTargetId(null);
    setGuardTargetTonightId(null);
    setSeerTargetTonightId(null);
    setWitchSaveUsedTonight(false);
    setWitchPoisonTargetId(null);
    setRoleCalloutToast(null);

    const updatedMe = updatedPlayers.find((p) => p.id === me.id);
    if (me.isAlive && updatedMe && !updatedMe.isAlive) {
      sound.playGhostWail();
    }

    const killedNames = result.killedPlayerIds
      .map((id) => players.find((p) => p.id === id)?.name)
      .filter(Boolean) as string[];

    const summaryText =
      killedNames.length > 0
        ? `☀️ ${t.dayDiscussTitle(round)}: 💀 ${killedNames.join(', ')}`
        : `☀️ ${t.dayDiscussTitle(round)}: 🛡️ 0 💀`;

    const gmDetailText =
      lang === 'vi'
        ? `🤖 Quản Trò Máy (${t.dayDiscussTitle(round)}): ${result.summary.join(' · ')}`
        : `${summaryText} — ${result.summary.join(' · ')}`;

    setMessages((prev) => [
      ...prev,
      {
        id: `sys_${Date.now()}`,
        senderId: 'sys',
        senderName: '🤖 Quản Trò Máy',
        text: gmDetailText,
        timestamp: Date.now(),
        isSystem: true,
      },
    ]);

    if (result.triggeredHunterId) {
      const hunterPlayer = updatedPlayers.find((p) => p.id === result.triggeredHunterId);
      if (hunterPlayer) {
        triggerNightRoleCallout('hunter');
        if (hunterPlayer.isBot) {
          const aliveTargets = updatedPlayers.filter((p) => p.isAlive);
          if (aliveTargets.length > 0) {
            const shotTarget =
              aliveTargets[Math.floor(Math.random() * aliveTargets.length)];
            const afterShot = resolveHunterShot(
              updatedPlayers,
              hunterPlayer.id,
              shotTarget.id
            );
            setPlayers(afterShot.updatedPlayers);
            if (afterShot.wolfPupTriggeredNextNight) setWolfPupFrenzy(true);
            setMessages((prev) => [
              ...prev,
              {
                id: `hunter_bot_${Date.now()}`,
                senderId: 'sys',
                senderName: '🤖 Quản Trò Máy',
                text:
                  lang === 'vi'
                    ? `🎯 Thợ Săn ${hunterPlayer.name} nổ súng cuối đời bắn hạ ${shotTarget.name}!`
                    : `🎯 Hunter ${hunterPlayer.name} fired their final shot at ${shotTarget.name}!`,
                timestamp: Date.now(),
                isSystem: true,
              },
            ]);
            const winAfterBotShot = checkWinCondition(afterShot.updatedPlayers);
            if (winAfterBotShot.isOver) {
              finishGame(
                winAfterBotShot.winner || 'villagers',
                winAfterBotShot.reason,
                afterShot.updatedPlayers,
                round
              );
              return;
            }
          }
        } else {
          setActiveHunter(hunterPlayer);
          setHunterOriginPhase('night');
          setPhase('hunter_revenge');
          setTimerSeconds(20);
          setEventBanner(`🎯 ${t.hunterPhaseTitle}: ${ROLES.hunter.instructions[lang]}`);
          return;
        }
      }
    }

    const winCheck = checkWinCondition(updatedPlayers);
    if (winCheck.isOver) {
      finishGame(winCheck.winner || 'villagers', winCheck.reason, updatedPlayers, round);
      return;
    }

    setPhase('day_discussion');
    setTimerSeconds(30);
    setEventBanner(summaryText);

    // AI Bots actively discuss clues & suspects during Day Discussion
    const botDiscussionLines = buildBotDayDiscussionLines(
      updatedPlayers,
      killedNames,
      lang,
      result.seerInspection
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

    // Visual 3D prop teasing between bots (does not post to chat)
    const aliveBots = updatedPlayers.filter((p) => p.isBot && p.isAlive);
    if (aliveBots.length >= 2) {
      const botPick = aliveBots[Math.floor(Math.random() * aliveBots.length)];
      const otherBot = aliveBots.find((b) => b.id !== botPick.id) || aliveBots[0];
      setTimeout(() => {
        handleThrowProp(botPick.id, otherBot.id, round % 2 === 0 ? 'egg' : 'tomato');
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
    finishGame,
    triggerNightRoleCallout,
    handleThrowProp,
    t,
    lang,
  ]);

  // Step-by-step Night Progression moderated by Quản Trò Máy
  const handleAdvanceNightStep = useCallback(() => {
    if (phase !== 'night') return;
    if (nightStepIndex + 1 < nightSchedule.length) {
      setNightStepIndex((idx) => idx + 1);
      setHasClosedEyesTonight(false);
    } else {
      handleResolveNight();
    }
  }, [phase, nightStepIndex, nightSchedule.length, handleResolveNight]);

  // Enter Day Voting Phase & generate rule-compliant smart bot votes
  const handleStartDayVoting = useCallback(() => {
    sound.playGavel();
    setActivePropTool(null);
    setPhase('day_voting');
    setTimerSeconds(25);
    setVotes([]);
    setHasVoted(false);
    setSelectedTargetId(null);
    setEventBanner(
      lang === 'vi'
        ? `🤖 Quản Trò Máy: ⚖️ ${t.dayVoteTitle(round)} — Chạm vào 1 người để bỏ phiếu treo cổ!`
        : `🤖 Auto-GM: ⚖️ ${t.dayVoteTitle(round)}`
    );

    setTimeout(() => {
      setPlayers((currentPlayers) => {
        const botVotes = computeSmartBotDayVotes(
          currentPlayers,
          knownWolfIds,
          selectedTargetId
        );
        setVotes((prev) => [
          ...prev.filter((v) => !currentPlayers.find((p) => p.id === v.voterId)?.isBot),
          ...botVotes,
        ]);
        return currentPlayers;
      });
    }, 900);
  }, [t, round, lang, knownWolfIds, selectedTargetId]);

  // Resolve Day Voting -> Execute Lynch or Advance to Next Night
  const handleResolveDayVoting = useCallback(
    (overrideVotes?: VoteRecord[]) => {
      sound.playGavel();
      const activeVotes = overrideVotes || votes;
      const tally = tallyVotes(activeVotes);

      if (tally.isTie || !tally.targetId) {
        setMessages((prev) => [
          ...prev,
          {
            id: `tie_${Date.now()}`,
            senderId: 'sys',
            senderName: '🤖 Quản Trò Máy',
            text:
              lang === 'vi'
                ? `🤖 Quản Trò Máy: ⚖️ Biểu quyết hoà phiếu! Không ai bị treo cổ hôm nay. Màn đêm thứ ${round + 1} buông xuống!`
                : `🤖 Auto-GM: ⚖️ Vote tied! Nobody was executed today. Night ${round + 1} begins!`,
            timestamp: Date.now(),
            isSystem: true,
          },
        ]);
        setEventBanner(`⚖️ 0 💀 → ${t.nightPhaseTitle(round + 1)}`);
        setRound((r) => r + 1);
        setPhase('night');
        setNightStepIndex(0);
        setSelectedTargetId(null);
        setSeerInspectResult(null);
        return;
      }

      const victim = players.find((p) => p.id === tally.targetId);
      if (!victim) return;

      const {
        updatedPlayers,
        wolfPupTriggeredNextNight,
        triggeredHunterId,
        elderLynchedPenalty,
      } = applyDayLynch(players, victim.id);

      setPlayers(updatedPlayers);
      if (wolfPupTriggeredNextNight) setWolfPupFrenzy(true);

      const updatedMe = updatedPlayers.find((p) => p.id === me.id);
      if (me.isAlive && updatedMe && !updatedMe.isAlive) {
        sound.playGhostWail();
      }

      const elderNote = elderLynchedPenalty
        ? lang === 'vi'
          ? ' ⚠️ Dân làng đã treo cổ nhầm Già Làng! Toàn bộ chức năng đặc biệt của phe Dân Làng bị phong ấn!'
          : ' ⚠️ The village executed the Elder! All Villager special powers are now sealed!'
        : '';

      setMessages((prev) => [
        ...prev,
        {
          id: `lynch_${Date.now()}`,
          senderId: 'sys',
          senderName: '🤖 Quản Trò Máy',
          text: `⚖️ ${victim.name} (${ROLES[victim.roleId].name[lang]}) — ${
            tally.counts[victim.id]
          } ${t.votesUnit}!${elderNote}`,
          timestamp: Date.now(),
          isSystem: true,
        },
      ]);

      if (victim.roleId === 'tanner') {
        finishGame(
          'tanner',
          `${victim.name} (${ROLES.tanner.name[lang]}) — ${t.winTanner}`,
          updatedPlayers,
          round
        );
        return;
      }

      if (triggeredHunterId) {
        triggerNightRoleCallout('hunter');
        const hunter = updatedPlayers.find((p) => p.id === triggeredHunterId);
        if (hunter && !hunter.isBot) {
          setActiveHunter(hunter);
          setHunterOriginPhase('day_voting');
          setPhase('hunter_revenge');
          setTimerSeconds(20);
          setEventBanner(`🎯 ${t.hunterPhaseTitle}: ${ROLES.hunter.instructions[lang]}`);
          return;
        } else if (hunter && hunter.isBot) {
          const aliveTargets = updatedPlayers.filter((p) => p.isAlive);
          if (aliveTargets.length > 0) {
            const target =
              aliveTargets[Math.floor(Math.random() * aliveTargets.length)];
            const shotRes = resolveHunterShot(updatedPlayers, hunter.id, target.id);
            setPlayers(shotRes.updatedPlayers);
            if (shotRes.wolfPupTriggeredNextNight) setWolfPupFrenzy(true);
            const winCheckAfter = checkWinCondition(shotRes.updatedPlayers, victim.id);
            if (winCheckAfter.isOver) {
              finishGame(
                winCheckAfter.winner || 'villagers',
                winCheckAfter.reason,
                shotRes.updatedPlayers,
                round
              );
              return;
            }
          }
        }
      }

      const winCheck = checkWinCondition(updatedPlayers, victim.id);
      if (winCheck.isOver) {
        finishGame(winCheck.winner || 'villagers', winCheck.reason, updatedPlayers, round);
      } else {
        sound.playNightBell();
        setRound((r) => r + 1);
        setPhase('night');
        setNightStepIndex(0);
        setSelectedTargetId(null);
        setSeerInspectResult(null);
        setEventBanner(`👻 ${victim.name} → ${t.nightPhaseTitle(round + 1)}`);
      }
    },
    [votes, players, me, round, finishGame, triggerNightRoleCallout, t, lang]
  );

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
        const { updatedPlayers, victimName, wolfPupTriggeredNextNight } =
          resolveHunterShot(players, activeHunter.id, targetId);
        setPlayers(updatedPlayers);
        if (wolfPupTriggeredNextNight) setWolfPupFrenzy(true);
        setActiveHunter(null);
        setSelectedTargetId(null);
        const winCheck = checkWinCondition(updatedPlayers);
        if (winCheck.isOver) {
          finishGame(winCheck.winner || 'villagers', winCheck.reason, updatedPlayers, round);
        } else if (hunterOriginPhase === 'night') {
          setPhase('day_discussion');
          setTimerSeconds(30);
          setEventBanner(`🎯 ${victimName}! · ☀️ ${t.dayDiscussTitle(round)}`);
        } else {
          sound.playNightBell();
          setRound((r) => r + 1);
          setPhase('night');
          setNightStepIndex(0);
          setEventBanner(`🎯 ${victimName}! → ${t.nightPhaseTitle(round + 1)}`);
        }
        return;
      }

      if (phase === 'day_voting') {
        if (!me.isAlive || targetId === me.id) return;
        setSelectedTargetId(targetId);
        const myVote: VoteRecord = { voterId: me.id, targetId };
        const updatedVotes = [...votes.filter((v) => v.voterId !== me.id), myVote];
        setVotes(updatedVotes);
        setHasVoted(true);
        setEventBanner(`⚖️ ${target.name} (+1 ${t.votesUnit})`);
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
          if (isWolf) {
            setKnownWolfIds((prev) => (prev.includes(targetId) ? prev : [...prev, targetId]));
          }
          const resText = `${target.name}: ${
            isWolf ? `🐺 ${ROLES.werewolf.name[lang]}` : `🛡️ ${ROLES.villager.name[lang]}`
          }`;
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
      votes,
      isPlayerAwakeAtNight,
      currentNightStep,
      hasInspectedTonight,
      wolfPupFrenzy,
      tonightWolfVictimId,
      witchPoisonTargetId,
      cupidLovers,
      round,
      hunterOriginPhase,
      finishGame,
      handleThrowProp,
      t,
      lang,
    ]
  );

  // Fast-Forward / Advance Phase Handler (Top-Left Button skips remaining night steps immediately)
  const handleAdvancePhaseFast = useCallback(() => {
    if (phase === 'night') {
      handleResolveNight();
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
          setTimerSeconds(30);
        } else {
          setRound((r) => r + 1);
          setPhase('night');
          setNightStepIndex(0);
        }
      }
    }
  }, [
    phase,
    handleResolveNight,
    handleStartDayVoting,
    handleResolveDayVoting,
    activeHunter,
    players,
    selectedTargetId,
    handleSelect3DPlayer,
    hunterOriginPhase,
  ]);

  // Countdown Timer Effect (Paused while Onboarding Tour is open)
  useEffect(() => {
    if (
      shellState !== 'playing' ||
      phase === 'game_over' ||
      phase === 'lobby' ||
      showOnboardingTour
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
  }, [shellState, phase, showOnboardingTour]);

  // Trigger step-by-step Auto-GM progression when timer reaches 0
  useEffect(() => {
    if (shellState === 'playing' && timerSeconds === 0 && !showOnboardingTour) {
      if (phase === 'night') {
        handleAdvanceNightStep();
      } else {
        handleAdvancePhaseFast();
      }
    }
  }, [
    timerSeconds,
    shellState,
    showOnboardingTour,
    phase,
    handleAdvanceNightStep,
    handleAdvancePhaseFast,
  ]);

  // Keyboard Shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (shellState === 'title' && (e.code === 'Enter' || e.code === 'Space')) {
        if (!lobbyModalState.isOpen) {
          e.preventDefault();
          handleStartMatch(villageSize, preferredRole, 'ai_practice');
        }
        return;
      }

      if (e.code === 'Escape' || e.code === 'KeyP') {
        e.preventDefault();
        if (showOnboardingTour) {
          localStorage.setItem('werewolf_3d_tour_done', '1');
          setShowOnboardingTour(false);
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
      } else if (e.code === 'KeyM') {
        const m = sound.toggleMute();
        setIsMuted(m);
      } else if (e.code === 'KeyC' && shellState === 'playing') {
        setShowMyRoleModal((s) => !s);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    shellState,
    activeDrawer,
    lobbyModalState,
    showOnboardingTour,
    showProfileModal,
    showMyRoleModal,
    villageSize,
    preferredRole,
    handleStartMatch,
  ]);

  // Send Chat Message (with Anti-Cheat Ghost Guard)
  const handleSendMessage = () => {
    if (!chatInput.trim()) return;
    if (!me.isAlive && chatTab === 'main') {
      setChatNotice(`🛡️ ${t.chatGhostTab}`);
      setChatTab('ghost');
      setMessages((prev) => [
        ...prev,
        {
          id: `msg_${Date.now()}`,
          senderId: me.id,
          senderName: me.name,
          text: chatInput.trim(),
          timestamp: Date.now(),
          isGhost: true,
        },
      ]);
      setChatInput('');
      return;
    }

    setChatNotice('');
    setMessages((prev) => [
      ...prev,
      {
        id: `msg_${Date.now()}`,
        senderId: me.id,
        senderName: me.name,
        text: chatInput.trim(),
        timestamp: Date.now(),
        isGhost: chatTab === 'ghost',
      },
    ]);
    setChatInput('');
  };

  // Compute Vote Counts Map for 3D Nameplates
  const votesMap: Record<string, number> = {};
  for (const v of votes) {
    votesMap[v.targetId] = (votesMap[v.targetId] || 0) + 1;
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
    !showOnboardingTour;

  const canUseVirtualDpad =
    shellState === 'playing' &&
    ((phase === 'night' && isPlayerAwakeAtNight) || !me.isAlive);

  return (
    <div className="relative w-screen h-screen overflow-hidden select-none bg-[#070a14] text-slate-100">
      {/* 1. FULL-VIEWPORT INTERACTIVE 3D VILLAGE SCENE */}
      <WerewolfVillage3D
        players={players}
        userPlayerId={me.id}
        phase={phase}
        lang={lang}
        isTitleScreen={shellState === 'title'}
        isPlayerAwakeAtNight={isPlayerAwakeAtNight || showOnboardingTour}
        freeLook360={freeLook360}
        moveVector={moveVector}
        thrownProps={thrownProps}
        selectedTargetId={selectedTargetId}
        secondaryTargetId={secondWolfTargetId}
        cupidLovers={cupidLovers}
        votesMap={votesMap}
        activeSpeakers={activeSpeakers}
        revealAllRoles={shellState === 'gameover'}
        cameraPreset={cameraPreset}
        onSelectPlayer={handleSelect3DPlayer}
      />

      {/* ANTI-CHEAT NIGHT BLINDFOLD OVERLAY (WITH QUẢN TRÒ MÁY STEP PROGRESS) */}
      {isNightBlindfolded && (
        <div
          className="fixed inset-0 z-10 pointer-events-none flex flex-col items-center justify-center p-4 transition-opacity duration-500"
          style={{
            background:
              'radial-gradient(circle at center, rgba(4,7,17,0.78) 0%, rgba(2,4,10,0.96) 75%)',
          }}
        >
          <div className="max-w-md w-full bg-[#090d18]/95 border-2 border-indigo-500/40 rounded-3xl p-5 text-center shadow-2xl space-y-2.5 pointer-events-auto">
            <div className="w-11 h-11 rounded-2xl bg-indigo-950 border border-indigo-500/50 mx-auto flex items-center justify-center text-indigo-300">
              <EyeOff className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-indigo-400 font-bold block">
              🤖 {lang === 'vi' ? 'QUẢN TRÒ MÁY ĐIỀU HÀNH ĐÊM' : 'AUTO-GM NIGHT SEQUENCE'} · {t.antiCheatNightBadge}
            </span>
            <h4 className="text-base font-black text-slate-100">
              {t.sleepingTitle(myRole.name[lang])}
            </h4>

            {currentNightStep && (
              <div className="bg-indigo-950/60 border border-indigo-500/40 rounded-2xl p-2.5 space-y-1.5">
                <div className="text-xs font-extrabold text-amber-300">
                  {lang === 'vi'
                    ? `Đang gọi (${currentNightStep.stepIndex + 1}/${currentNightStep.totalSteps}): ${ROLES[currentNightStep.roleId].name.vi}`
                    : `Calling (${currentNightStep.stepIndex + 1}/${currentNightStep.totalSteps}): ${ROLES[currentNightStep.roleId].name[lang]}`}
                </div>
                <p className="text-[11px] text-indigo-200 italic">
                  {currentNightStep.gmNarration[lang]}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-1 pt-1">
                  {nightSchedule.map((st, idx) => (
                    <span
                      key={st.key}
                      className={`px-2 py-0.5 rounded-md text-[9px] font-bold border ${
                        idx === nightStepIndex
                          ? 'bg-amber-500 text-slate-950 border-amber-300'
                          : idx < nightStepIndex
                          ? 'bg-emerald-950/70 text-emerald-300 border-emerald-700/50'
                          : 'bg-slate-900 text-slate-400 border-slate-800'
                      }`}
                    >
                      {ROLES[st.roleId].name[lang]}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <p className="text-[11px] text-slate-300 leading-relaxed">
              {t.sleepingDesc}
            </p>
            <div className="pt-1.5 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                data-testid="blindfold-next-step-btn"
                onClick={handleAdvanceNightStep}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-lg cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>
                  {lang === 'vi' ? 'Qua bước tiếp' : 'Next Role Step'} ({Math.round(timerSeconds)}s)
                </span>
              </button>
              <button
                type="button"
                onClick={handleAdvancePhaseFast}
                className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 shadow-lg cursor-pointer"
              >
                <FastForward className="w-3.5 h-3.5 fill-slate-950" />
                <span>{t.skipNightLongBtn}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. TITLE SCREEN OVERLAY */}
      {shellState === 'title' && (
        <div className="fixed inset-0 z-30 pointer-events-none flex flex-col justify-between p-3 sm:p-8 overflow-y-auto">
          {/* Top-Left / Right Minimal Utility Bar */}
          <div className="flex items-center justify-between pointer-events-auto gap-2">
            <div className="px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-[#090d18]/90 border border-amber-700/40 flex items-center gap-2 shadow-xl">
              <span className="text-base sm:text-xl">{currentUser.avatar}</span>
              <div>
                <div className="flex items-center gap-1.5">
                  <span
                    data-testid="title-profile-name"
                    className="text-xs font-extrabold text-amber-200 max-w-[110px] sm:max-w-none truncate"
                  >
                    {currentUser.name}
                  </span>
                  {currentUser.provider && currentUser.provider !== 'guest' && (
                    <span
                      data-testid="title-provider-pill"
                      className="px-1.5 py-0.5 rounded bg-emerald-950 border border-emerald-500/50 text-[9px] font-mono text-emerald-300 font-bold"
                    >
                      @{currentUser.handle || 'db'}
                    </span>
                  )}
                </div>
                <div
                  className="text-[10px] sm:text-[11px] font-mono text-amber-400"
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {currentUser.elo} ELO
                </div>
              </div>
              <button
                type="button"
                data-testid="open-social-login-btn"
                onClick={() => {
                  setInitialAccountTab(null);
                  setShowProfileModal(true);
                }}
                className="ml-0.5 px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-[10px] font-extrabold text-slate-950 cursor-pointer shadow"
              >
                {t.changeProfile}
              </button>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                data-testid="open-onboarding-tour-btn"
                onClick={() => {
                  handleStartMatch(villageSize, preferredRole, 'ai_practice');
                  setShowOnboardingTour(true);
                }}
                className="px-2.5 sm:px-3 py-2 rounded-xl bg-[#090d18]/90 border border-amber-700/40 text-xs font-bold text-amber-300 hover:bg-slate-900 flex items-center gap-1.5 cursor-pointer"
              >
                <HelpCircle className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="hidden sm:inline">{t.newbieGuide}</span>
              </button>

              <select
                value={lang}
                onChange={(e) => handleChangeLanguage(e.target.value as Language)}
                aria-label="Select Language"
                data-testid="language-select"
                className="bg-[#090d18]/90 border border-amber-700/40 text-xs font-bold rounded-xl px-2.5 py-2 text-amber-100 focus:outline-none cursor-pointer"
              >
                <option value="vi">🇻🇳 Tiếng Việt</option>
                <option value="en">🇬🇧 English</option>
                <option value="fr">🇫🇷 Français</option>
                <option value="es">🇪🇸 Español</option>
                <option value="ja">🇯🇵 日本語</option>
              </select>
            </div>
          </div>

          {/* Compact Bottom-Docked Command Panel (Leaves Upper 72%+ of 3D Village Unobstructed) */}
          <div
            data-testid="title-command-dock"
            className="mt-auto mx-auto w-full max-w-3xl pointer-events-auto bg-[#070a14]/88 backdrop-blur-md border border-amber-500/45 rounded-2xl p-2 sm:p-3 shadow-2xl"
          >
            {/* Compact Header Row with Minimize Toggle to Inspect 3D Village */}
            <div className="flex items-center justify-between gap-2 pb-1.5 mb-1.5 border-b border-slate-800/80">
              <div className="flex items-center gap-2 min-w-0">
                <svg
                  viewBox="0 0 80 80"
                  className="w-7 h-7 sm:w-8 sm:h-8 shrink-0"
                  aria-hidden="true"
                >
                  <defs>
                    <linearGradient id="bloodMoonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#fbbf24" />
                      <stop offset="55%" stopColor="#ef4444" />
                      <stop offset="100%" stopColor="#7f1d1d" />
                    </linearGradient>
                  </defs>
                  <circle cx="40" cy="40" r="34" fill="url(#bloodMoonGrad)" opacity="0.95" />
                  <circle cx="50" cy="32" r="24" fill="#070a14" />
                  <path
                    d="M22 62 L28 38 L34 24 L40 33 L48 22 L52 38 L60 46 L50 53 L53 66 Z"
                    fill="#fef08a"
                  />
                </svg>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h1 className="text-sm sm:text-base font-black tracking-wider text-amber-200 truncate">
                      {t.appTitle}
                    </h1>
                    <span className="hidden md:inline text-[10px] font-extrabold uppercase tracking-widest text-rose-400">
                      · {t.appSubtitle}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 truncate hidden sm:block">
                    {t.bottomControlHint}
                  </p>
                </div>
              </div>

              <button
                type="button"
                data-testid="toggle-title-menu-btn"
                onClick={() => setIsTitleMenuMinimized((m) => !m)}
                className="px-2.5 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 border border-amber-500/40 text-[10px] sm:text-[11px] font-bold text-amber-300 flex items-center gap-1 cursor-pointer shrink-0"
              >
                {isTitleMenuMinimized ? (
                  <>
                    <ChevronUp className="w-3.5 h-3.5" />
                    <span>{lang === 'vi' ? 'Mở Menu' : 'Expand Menu'}</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3.5 h-3.5" />
                    <span>{lang === 'vi' ? 'Thu gọn ngắm 3D' : 'Minimize for 3D'}</span>
                  </>
                )}
              </button>
            </div>

            {!isTitleMenuMinimized && (
              <>
                {/* Quick Pre-Match Role & Player Count Selector with Hover Tooltips */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2 bg-[#0d1322]/90 border border-slate-800 rounded-xl p-2">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block mb-0.5">
                      {t.selectRoleLabel}
                    </label>
                    <select
                      value={preferredRole}
                      onChange={(e) => setPreferredRole(e.target.value as RoleId | 'random')}
                      aria-label={t.selectRoleLabel}
                      className="w-full bg-[#070a14] border border-slate-700 rounded-lg px-2 py-1 text-xs font-bold text-slate-100"
                    >
                      <option value="random">{t.randomBalancedRole}</option>
                      {Object.values(ROLES).map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name[lang]} ({r.badge})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="relative">
                    <div className="flex items-center justify-between mb-0.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-amber-400 whitespace-nowrap">
                        {t.villageScaleLabel} ({villageSize} {t.peopleUnit})
                      </label>
                      <span className="text-[9px] text-slate-400 whitespace-nowrap hidden sm:inline">
                        {t.hoverForDifficulty}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                  {([6, 8, 10, 12] as const).map((cnt) => {
                    const info = t.scales[cnt];
                    const badgeStyle = VILLAGE_BADGE_CLASSES[cnt];
                    return (
                      <div key={cnt} className="relative flex-1 group">
                        <button
                          type="button"
                          onClick={() => {
                            sound.playCardFlip();
                            setVillageSize(cnt);
                            const previewRoles = generateBalancedRoster(cnt);
                            setPlayers([
                              {
                                id: currentUser.id,
                                name: currentUser.name,
                                avatar: currentUser.avatar,
                                roleId: previewRoles[0],
                                isAlive: true,
                                isHost: true,
                              },
                              ...BOT_NAMES.slice(0, cnt - 1).map((name, i) => ({
                                id: `bot_${i + 1}`,
                                name,
                                avatar: ['🐺', '🔮', '🛡️', '🧪', '🎯', '💘', '🎭', '👑', '🔥', '🧑‍🌾'][i % 10],
                                roleId: previewRoles[i + 1],
                                isAlive: true,
                                isBot: true,
                              })),
                            ]);
                          }}
                          aria-describedby={`village-size-tooltip-${cnt}`}
                          className={`w-full py-1.5 rounded-lg text-xs font-extrabold border transition-all cursor-pointer ${
                            villageSize === cnt
                              ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                              : 'bg-[#070a14] text-slate-300 border-slate-800 hover:border-amber-400/60 hover:text-amber-200'
                          }`}
                        >
                          {cnt}
                        </button>

                        {/* Hover Tooltip directly above village scale buttons */}
                        <div
                          id={`village-size-tooltip-${cnt}`}
                          role="tooltip"
                          className={`absolute bottom-full mb-2.5 ${
                            cnt === 6
                              ? 'left-0 sm:-left-3'
                              : cnt === 12
                              ? 'right-0 sm:-right-3'
                              : 'left-1/2 -translate-x-1/2'
                          } w-60 sm:w-64 p-3 rounded-2xl bg-[#090e1c] border border-amber-500/40 shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible group-focus-within:opacity-100 group-focus-within:visible pointer-events-none transition-all duration-200 transform translate-y-1 group-hover:translate-y-0 group-focus-within:translate-y-0 z-[100]`}
                        >
                          <div className="flex items-center justify-between gap-1 mb-1.5 border-b border-slate-800 pb-1.5">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-black text-amber-300">
                                {info.label}
                              </span>
                              <span
                                className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border ${badgeStyle.badgeClass}`}
                              >
                                {info.badge}
                              </span>
                            </div>
                            <span className="text-[10px] font-extrabold text-amber-400 tracking-wider">
                              {badgeStyle.stars}
                            </span>
                          </div>
                          <div className="text-[11px] font-bold text-slate-200 mb-1">
                            <span>{info.difficulty}</span>
                          </div>
                          <div className="text-[10px] font-semibold text-amber-200/90 mb-1.5">
                            {info.summary}
                          </div>
                          <p className="text-[10px] leading-relaxed text-slate-300/95 font-normal">
                            {info.mechanics}
                          </p>
                          <div
                            className={`absolute top-full ${
                              cnt === 6
                                ? 'left-5 sm:left-6'
                                : cnt === 12
                                ? 'right-5 sm:right-6'
                                : 'left-1/2 -translate-x-1/2'
                            } w-0 h-0 border-x-[6px] border-x-transparent border-t-[6px] border-t-amber-500/50`}
                          />
                        </div>
                      </div>
                    );
                  })}

                  {/* Custom Player Count Stepper & Input (4..20 players) */}
                  <div className="flex items-center gap-0.5 bg-[#070a14] border border-amber-500/50 rounded-lg px-1 py-0.5 shrink-0">
                    <button
                      type="button"
                      data-testid="custom-player-count-dec"
                      disabled={villageSize <= 4}
                      onClick={() => {
                        const next = Math.max(4, villageSize - 1);
                        sound.playCardFlip();
                        setVillageSize(next);
                        const previewRoles = generateBalancedRoster(next);
                        setPlayers([
                          {
                            id: currentUser.id,
                            name: currentUser.name,
                            avatar: currentUser.avatar,
                            roleId: previewRoles[0],
                            isAlive: true,
                            isHost: true,
                          },
                          ...BOT_NAMES.slice(0, next - 1).map((name, i) => ({
                            id: `bot_${i + 1}`,
                            name,
                            avatar: ['🐺', '🔮', '🛡️', '🧪', '🎯', '💘', '🎭', '👑', '🔥', '🧑‍🌾'][i % 10],
                            roleId: previewRoles[i + 1],
                            isAlive: true,
                            isBot: true,
                          })),
                        ]);
                      }}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-35 text-slate-200 cursor-pointer"
                      aria-label="Decrease custom player count"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <input
                      type="number"
                      min={4}
                      max={20}
                      data-testid="custom-player-count-input"
                      aria-label="Custom player count"
                      value={villageSize}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!Number.isNaN(val)) {
                          const clamped = Math.max(4, Math.min(20, val));
                          setVillageSize(clamped);
                          const previewRoles = generateBalancedRoster(clamped);
                          setPlayers([
                            {
                              id: currentUser.id,
                              name: currentUser.name,
                              avatar: currentUser.avatar,
                              roleId: previewRoles[0],
                              isAlive: true,
                              isHost: true,
                            },
                            ...BOT_NAMES.slice(0, clamped - 1).map((name, i) => ({
                              id: `bot_${i + 1}`,
                              name,
                              avatar: ['🐺', '🔮', '🛡️', '🧪', '🎯', '💘', '🎭', '👑', '🔥', '🧑‍🌾'][i % 10],
                              roleId: previewRoles[i + 1],
                              isAlive: true,
                              isBot: true,
                            })),
                          ]);
                        }
                      }}
                      className="w-9 text-center bg-slate-950 border border-slate-700 rounded py-0.5 text-xs font-mono font-extrabold text-amber-300 focus:outline-none focus:border-amber-400"
                    />
                    <button
                      type="button"
                      data-testid="custom-player-count-inc"
                      disabled={villageSize >= 20}
                      onClick={() => {
                        const next = Math.min(20, villageSize + 1);
                        sound.playCardFlip();
                        setVillageSize(next);
                        const previewRoles = generateBalancedRoster(next);
                        setPlayers([
                          {
                            id: currentUser.id,
                            name: currentUser.name,
                            avatar: currentUser.avatar,
                            roleId: previewRoles[0],
                            isAlive: true,
                            isHost: true,
                          },
                          ...BOT_NAMES.slice(0, next - 1).map((name, i) => ({
                            id: `bot_${i + 1}`,
                            name,
                            avatar: ['🐺', '🔮', '🛡️', '🧪', '🎯', '💘', '🎭', '👑', '🔥', '🧑‍🌾'][i % 10],
                            roleId: previewRoles[i + 1],
                            isAlive: true,
                            isBot: true,
                          })),
                        ]);
                      }}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-35 text-slate-200 cursor-pointer"
                      aria-label="Increase custom player count"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Full-Width Live Summary Strip of Selected Village Scale (Compact 1-Line on Mobile) */}
              {(() => {
                const preset = t.scales[villageSize];
                if (preset) {
                  return (
                    <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-1 text-[10px] sm:text-[11px] text-amber-200/95 bg-[#070a14]/90 px-2.5 py-1 rounded-lg border border-slate-800/90">
                      <span className="font-extrabold text-amber-400">
                        {preset.difficulty} ({VILLAGE_BADGE_CLASSES[villageSize]?.stars})
                      </span>
                      <span className="text-slate-300 font-medium truncate max-w-full sm:max-w-none">
                        {preset.summary}
                      </span>
                    </div>
                  );
                }
                const customDeck = generateBalancedRoster(villageSize);
                const wolvesCnt = customDeck.filter(
                  (r) => r === 'werewolf' || r === 'wolf_pup'
                ).length;
                const othersCnt = villageSize - wolvesCnt;
                const customStars =
                  villageSize <= 6
                    ? '★☆☆☆'
                    : villageSize <= 9
                    ? '★★☆☆'
                    : villageSize <= 11
                    ? '★★★☆'
                    : '★★★★';
                return (
                  <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-1 text-[10px] sm:text-[11px] text-amber-200/95 bg-[#070a14]/90 px-2.5 py-1 rounded-lg border border-amber-500/40">
                    <span className="font-extrabold text-amber-400">
                      {lang === 'vi'
                        ? `Tuỳ chỉnh: ${villageSize} Người (${customStars})`
                        : `Custom: ${villageSize} Players (${customStars})`}
                    </span>
                    <span className="text-slate-300 font-medium truncate max-w-full sm:max-w-none">
                      {lang === 'vi'
                        ? `${wolvesCnt} Ma Sói vs ${othersCnt} Dân Làng & Vai Chức Năng`
                        : `${wolvesCnt} Werewolves vs ${othersCnt} Villagers & Special Roles`}
                    </span>
                  </div>
                );
              })()}
            </div>

            {/* 3 Mode Action Buttons + Compact Account Strip */}
            <div className="space-y-1.5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-2">
                <button
                  type="button"
                  onClick={() => {
                    sound.playCardFlip();
                    setLobbyModalState({ isOpen: true, mode: 'online' });
                  }}
                  className="py-1.5 sm:py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs shadow-lg flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-transform"
                >
                  <Globe className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{t.playOnlineBtn}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    sound.playCardFlip();
                    setLobbyModalState({ isOpen: true, mode: 'gm' });
                  }}
                  className="py-1.5 sm:py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs shadow-lg flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-transform"
                >
                  <Shield className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{t.playGMBtn}</span>
                </button>

                <button
                  type="button"
                  data-start="true"
                  onClick={() => handleStartMatch(villageSize, preferredRole, 'ai_practice')}
                  className="py-1.5 sm:py-2 px-3 rounded-xl bg-[#131c31] hover:bg-slate-800 text-sky-300 border border-sky-500/40 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Bot className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span className="truncate">{t.playAIPracticeBtn}</span>
                </button>
              </div>

              {/* Standard Account & Database Persistence Strip right on Title Card */}
              <div className="pt-1 border-t border-slate-800/90 flex items-center justify-between gap-1.5">
                <span className="hidden sm:inline text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {lang === 'vi'
                    ? 'Tài khoản & Lưu trữ Database:'
                    : lang === 'ja'
                    ? 'アカウント＆DB保存:'
                    : lang === 'fr'
                    ? 'Compte & Base de données :'
                    : lang === 'es'
                    ? 'Cuenta y Base de datos:'
                    : 'Account & Database Storage:'}
                </span>
                <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    data-testid="title-login-account-btn"
                    onClick={() => {
                      sound.playCardFlip();
                      setInitialAccountTab('login');
                      setShowProfileModal(true);
                    }}
                    className={`px-2.5 py-1 rounded-lg border text-[10px] font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
                      currentUser.provider && currentUser.provider !== 'guest'
                        ? 'bg-emerald-950 border-emerald-400 text-emerald-200 shadow'
                        : 'bg-[#0d1322] border-slate-700 text-amber-200 hover:border-amber-400'
                    }`}
                  >
                    <span>🔑</span>
                    <span>
                      {currentUser.provider && currentUser.provider !== 'guest' && currentUser.handle
                        ? `@${currentUser.handle}`
                        : lang === 'vi'
                        ? 'Đăng Nhập TK'
                        : 'Sign In'}
                    </span>
                  </button>

                  <button
                    type="button"
                    data-testid="title-register-account-btn"
                    onClick={() => {
                      sound.playCardFlip();
                      setInitialAccountTab('register');
                      setShowProfileModal(true);
                    }}
                    className="px-2.5 py-1 rounded-lg border bg-emerald-950/80 border-emerald-500/60 hover:border-emerald-400 text-emerald-200 text-[10px] font-extrabold flex items-center gap-1 transition-all cursor-pointer"
                  >
                    <span>✨</span>
                    <span>{lang === 'vi' ? 'Đăng Ký Tài Khoản' : 'Create Account'}</span>
                  </button>
                </div>
              </div>
            </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* 3. PLAYING HUD (Streamlined Single-Row Mobile Perimeter + Fun Day Props + Mobile D-Pad + Collapsible Dock) */}
      {shellState !== 'title' && (
        <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-1.5 sm:p-3">
          {/* TOP PERIMETER BAR — Single-row on Mobile & Desktop (Never wraps onto 2 rows) */}
          <div className="flex items-center justify-between gap-1 sm:gap-2">
            {/* Top-Left Phase & Timer Cluster */}
            <div
              data-tour-id="top-left"
              className="pointer-events-auto flex items-center gap-1.5 sm:gap-2 bg-[#090d18]/90 backdrop-blur-sm border border-amber-700/50 rounded-xl sm:rounded-2xl px-2 py-1 sm:px-3 sm:py-1.5 shadow-xl min-w-0"
            >
              <div
                className={`w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center border shrink-0 ${
                  phase === 'night'
                    ? 'bg-rose-950 border-rose-500 text-rose-300'
                    : 'bg-amber-950 border-amber-400 text-amber-300'
                }`}
              >
                {phase === 'night' ? (
                  <Moon className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                ) : (
                  <Sun className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                )}
              </div>

              <div className="md:pr-2.5 md:border-r md:border-slate-800 min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-[8px] sm:text-[10px] font-extrabold uppercase tracking-wider text-amber-400 truncate">
                    {phase === 'night'
                      ? t.nightPhaseTitle(round)
                      : phase === 'day_discussion'
                      ? t.dayDiscussTitle(round)
                      : phase === 'day_voting'
                      ? t.dayVoteTitle(round)
                      : t.hunterPhaseTitle}
                  </span>
                  <span className="hidden sm:inline text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                    {gameMode === 'online' ? t.roomBadge(roomId) : t.aiPracticeBadge}
                  </span>
                </div>
                <div className="flex items-center gap-1 sm:gap-1.5">
                  <span
                    className="text-sm sm:text-xl font-black text-slate-100 font-mono leading-tight"
                    style={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    {Math.round(timerSeconds)}s
                  </span>
                  <button
                    type="button"
                    data-testid="fast-forward-phase-btn"
                    onClick={(e) => {
                      e.currentTarget.blur();
                      handleAdvancePhaseFast();
                    }}
                    className="px-1.5 py-0.5 sm:px-2 sm:py-0.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-[9px] sm:text-[11px] flex items-center gap-1 shadow cursor-pointer whitespace-nowrap"
                  >
                    <FastForward className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-slate-950 shrink-0" />
                    <span>
                      {phase === 'night'
                        ? t.skipNightBtn
                        : phase === 'day_discussion'
                        ? t.goToVoteBtn
                        : t.confirmVoteBtn}
                    </span>
                  </button>
                </div>
              </div>

              {/* Alive Faction Pips */}
              <div className="hidden md:flex items-center gap-2.5 text-xs">
                <div>
                  <span className="text-[8px] font-bold uppercase text-rose-400 block">
                    {t.wolvesAlive}
                  </span>
                  <span
                    className="text-sm font-black text-rose-200 font-mono"
                    style={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    {aliveWolvesCount}
                  </span>
                </div>
                <div>
                  <span className="text-[8px] font-bold uppercase text-sky-400 block">
                    {t.villagersAlive}
                  </span>
                  <span
                    className="text-sm font-black text-sky-200 font-mono"
                    style={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    {aliveVillagersCount}
                  </span>
                </div>
              </div>
            </div>

            {/* Top-Right Compact Utility Buttons (Clean 4-button Mobile Bar, Full Bar on Desktop) */}
            <div
              data-tour-id="top-right"
              className="pointer-events-auto flex items-center gap-1 bg-[#090d18]/90 backdrop-blur-sm border border-amber-700/40 rounded-xl sm:rounded-2xl p-1 shadow-xl shrink-0"
            >
              {/* My Secret Card Button */}
              <button
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.currentTarget.blur();
                  sound.playCardFlip();
                  setShowMyRoleModal(true);
                }}
                className="px-2 py-1.5 rounded-xl bg-amber-950/90 hover:bg-amber-900 border border-amber-500/50 text-amber-200 text-xs font-extrabold flex items-center gap-1 cursor-pointer"
                title={myRole.name[lang]}
              >
                <Eye className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">{myRole.name[lang]}</span>
              </button>

              {/* 360° Free Mouse Look Toggle */}
              <button
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.currentTarget.blur();
                  setFreeLook360(!freeLook360);
                }}
                className={`px-2 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1 cursor-pointer ${
                  freeLook360
                    ? 'bg-sky-600 border-sky-300 text-white'
                    : 'bg-slate-900 border-slate-800 text-sky-300 hover:bg-slate-800'
                }`}
                title={t.freeLook360}
              >
                <Compass className="w-3.5 h-3.5" />
                <span>{t.freeLook360}</span>
              </button>

              {/* Camera Angle Switcher (Desktop & Tablet) */}
              <button
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.currentTarget.blur();
                  const next =
                    cameraPreset === 'campfire'
                      ? 'overhead'
                      : cameraPreset === 'overhead'
                      ? 'dramatic'
                      : 'campfire';
                  setCameraPreset(next);
                }}
                className="hidden sm:flex p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 cursor-pointer"
                title={t.switchCamera}
                aria-label={t.switchCamera}
              >
                <Camera className="w-4 h-4 text-sky-400" />
              </button>

              {/* Guide / Guild Onboarding Button */}
              <button
                type="button"
                data-testid="open-onboarding-tour-btn"
                tabIndex={-1}
                onClick={(e) => {
                  e.currentTarget.blur();
                  setShowOnboardingTour(true);
                }}
                className="p-1.5 sm:p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 border border-slate-800 cursor-pointer"
                title={t.openGuide}
                aria-label={t.openGuide}
              >
                <HelpCircle className="w-4 h-4" />
              </button>

              {/* Voice Mic Toggle (Desktop) */}
              <button
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.currentTarget.blur();
                  setIsMicOn(!isMicOn);
                }}
                className={`hidden sm:flex p-2 rounded-xl border cursor-pointer ${
                  isMicOn
                    ? 'bg-rose-700 border-rose-400 text-white'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                }`}
                title={t.toggleMic}
                aria-label={t.toggleMic}
              >
                {isMicOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
              </button>

              {/* Sound & BGM Mute [M] (Desktop) */}
              <button
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.currentTarget.blur();
                  const m = sound.toggleMute();
                  setIsMuted(m);
                }}
                className="hidden sm:flex p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 cursor-pointer"
                title={t.toggleSound}
                aria-label={t.toggleSound}
              >
                <Volume2 className={`w-4 h-4 ${isMuted ? 'text-slate-500' : 'text-emerald-400'}`} />
              </button>

              {/* Pause & Quick Settings Button [P] */}
              <button
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.currentTarget.blur();
                  setShellState('paused');
                }}
                className="p-1.5 sm:p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 border border-slate-800 cursor-pointer"
                title={t.pauseGame}
                aria-label={t.pauseGame}
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                </svg>
              </button>
            </div>
          </div>

          {/* TOP-CENTER NARRATIVE & CONTEXTUAL INTERACTION STRIP (Ultra-Compact on Small Screens) */}
          <div className="mx-auto mb-auto mt-0.5 max-w-xl w-full flex flex-col items-center gap-1">
            {/* Automated Game Master ("Quản Trò Máy") Sequential Night Step Pill */}
            {phase === 'night' && currentNightStep && (
              <div
                data-testid="auto-gm-step-pill"
                className="pointer-events-auto flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-950/90 border border-indigo-400/50 text-[9px] sm:text-[10px] font-bold text-indigo-100 shadow-lg max-w-[94vw] whitespace-nowrap"
              >
                <span className="text-amber-300 font-extrabold">
                  🤖 {lang === 'vi' ? 'Quản Trò Máy' : 'Auto-GM'} ({currentNightStep.stepIndex + 1}/
                  {currentNightStep.totalSteps}):
                </span>
                <span className="truncate max-w-[150px] sm:max-w-xs font-extrabold text-white">
                  {ROLES[currentNightStep.roleId].name[lang]}
                </span>
                <button
                  type="button"
                  data-testid="auto-gm-next-step-btn"
                  onClick={handleAdvanceNightStep}
                  className="px-2 py-0.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-[9px] flex items-center gap-0.5 cursor-pointer shadow"
                >
                  <CheckCircle2 className="w-2.5 h-2.5" />
                  <span>{lang === 'vi' ? 'Xong lượt' : 'Next Step'}</span>
                </button>
              </div>
            )}

            {/* Concise Single-Line Event Status Pill (Hidden on small screens unless a target/action is selected or hunter revenge is active) */}
            <div
              className={`px-2.5 py-0.5 rounded-full bg-[#090d18]/85 border border-amber-600/35 text-[10px] sm:text-[11px] font-bold text-amber-100 shadow text-center pointer-events-none truncate max-w-[90vw] sm:max-w-lg ${
                selectedTargetId || seerInspectResult || phase === 'hunter_revenge'
                  ? 'block'
                  : 'hidden sm:block'
              }`}
            >
              {eventBanner}
            </div>

            {/* LIVE VOICE CHAT BAR WHEN PLAYER IS AWAKE (Daytime, Night Role Awake, or Ghost Channel) */}
            {(phase !== 'night' || isPlayerAwakeAtNight || !me.isAlive) && (
              <VoiceChatBar
                players={players}
                userPlayerId={me.id}
                phase={phase}
                isPlayerAwakeAtNight={isPlayerAwakeAtNight}
                isMicOn={isMicOn}
                onToggleMic={() => setIsMicOn((m) => !m)}
                activeSpeakers={activeSpeakers}
                onTriggerUserSpeech={(transcript) => {
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
                      isGhost: !me.isAlive,
                    },
                  ]);
                }}
                lang={lang}
                compact={true}
              />
            )}

            {/* Dramatic Role Callout Voice Banner during Night (Single-Line & Dismissible) */}
            {phase === 'night' && roleCalloutToast && (
              <div className="pointer-events-auto px-2.5 py-0.5 rounded-full bg-rose-950/90 border border-rose-500/50 text-[9px] sm:text-[10px] text-rose-100 shadow flex items-center justify-center gap-1.5 max-w-[92vw] whitespace-nowrap">
                <span className="font-extrabold text-amber-300 truncate max-w-[140px] sm:max-w-none">
                  {roleCalloutToast.sfxLabel}
                </span>
                <span className="hidden md:inline italic truncate max-w-[220px]">
                  "{roleCalloutToast.quote}"
                </span>
                {isPlayerAwakeAtNight && (
                  <div className="flex items-center gap-1">
                    {(selectedTargetId || witchSaveUsedTonight || witchPoisonTargetId) && (
                      <button
                        type="button"
                        onClick={handleAdvanceNightStep}
                        className="px-2 py-0.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-[9px] sm:text-[10px] font-extrabold text-slate-950 flex items-center gap-0.5 cursor-pointer shadow"
                      >
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        <span>{t.confirmAndSkipNight}</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setHasClosedEyesTonight(true)}
                      className="px-2 py-0.5 rounded-full bg-indigo-800 hover:bg-indigo-700 text-[9px] sm:text-[10px] font-bold text-white cursor-pointer"
                    >
                      {t.closeEyesSleep}
                    </button>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setRoleCalloutToast(null)}
                  className="p-0.5 rounded-full hover:bg-rose-900 text-rose-300 cursor-pointer"
                  aria-label="Dismiss callout banner"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            {/* Fun Day Discussion Prop Bar (Sleek Single-Line Pill) */}
            {(phase === 'day_discussion' || showOnboardingTour) && (
              <div
                data-tour-id="prop-bar"
                className="pointer-events-auto flex items-center gap-1 bg-[#090d18]/90 backdrop-blur-sm border border-amber-500/40 rounded-full px-2 py-0.5 sm:px-3 sm:py-1 shadow-lg overflow-x-auto max-w-[94vw] whitespace-nowrap"
              >
                <span className="hidden sm:inline text-[9px] font-extrabold uppercase text-amber-400 mr-0.5">
                  {t.funPropsLabel}
                </span>
                {(['tomato', 'egg', 'rose', 'water'] as PropType[]).map((pType) => {
                  const isActive = activePropTool === pType;
                  const pLabel = t.propButtons[pType];
                  return (
                    <button
                      key={pType}
                      type="button"
                      onClick={() => {
                        sound.playCardFlip();
                        setActivePropTool(isActive ? null : pType);
                      }}
                      className={`px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-extrabold border transition-all cursor-pointer shrink-0 ${
                        isActive
                          ? 'bg-amber-500 text-slate-950 border-amber-300 scale-105 shadow'
                          : 'bg-slate-900 text-slate-200 border-slate-700 hover:border-amber-400/60'
                      }`}
                    >
                      {pLabel}
                    </button>
                  );
                })}
                {activePropTool && (
                  <button
                    type="button"
                    onClick={() => setActivePropTool(null)}
                    className="px-1.5 py-0.5 rounded-full bg-rose-900/70 text-rose-200 text-[9px] font-bold cursor-pointer shrink-0"
                  >
                    {t.dropPropBtn}
                  </button>
                )}
              </div>
            )}

            {/* Ghost Soul Free-Flight Banner when User is Dead */}
            {!me.isAlive && (
              <div className="pointer-events-auto px-2.5 py-0.5 rounded-full bg-cyan-950/90 border border-cyan-400/60 text-[9px] sm:text-[10px] font-bold text-cyan-200 flex items-center gap-1 shadow-lg max-w-[92vw]">
                <Ghost className="w-3.5 h-3.5 text-cyan-400 animate-bounce shrink-0" />
                <span className="truncate">{t.ghostBannerText}</span>
              </div>
            )}
          </div>

          {/* MOBILE & OPEN-WORLD VIRTUAL D-PAD (Compact & Translucent on Small Screens) */}
          {canUseVirtualDpad && (
            <div className="fixed bottom-24 right-2 sm:right-auto sm:bottom-28 sm:left-3 z-30 pointer-events-auto flex flex-col items-center gap-0.5 bg-[#090d18]/75 backdrop-blur-sm border border-amber-600/35 p-1 sm:p-1.5 rounded-xl shadow-lg">
              <span className="text-[7px] sm:text-[8px] font-mono uppercase text-amber-300 font-bold">
                {me.isAlive ? t.dpadWalkNight : t.dpadFlyGhost}
              </span>
              <button
                type="button"
                onPointerDown={() => setMoveVector({ x: 0, z: -1 })}
                onPointerUp={() => setMoveVector({ x: 0, z: 0 })}
                onPointerLeave={() => setMoveVector({ x: 0, z: 0 })}
                className="w-7 h-6 sm:w-8 sm:h-7 rounded-lg bg-slate-800/90 active:bg-amber-500 active:text-slate-950 flex items-center justify-center cursor-pointer"
                aria-label="Move Up"
              >
                <ArrowUp className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              </button>
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onPointerDown={() => setMoveVector({ x: -1, z: 0 })}
                  onPointerUp={() => setMoveVector({ x: 0, z: 0 })}
                  onPointerLeave={() => setMoveVector({ x: 0, z: 0 })}
                  className="w-7 h-6 sm:w-8 sm:h-7 rounded-lg bg-slate-800/90 active:bg-amber-500 active:text-slate-950 flex items-center justify-center cursor-pointer"
                  aria-label="Move Left"
                >
                  <ArrowLeft className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </button>
                <button
                  type="button"
                  onPointerDown={() => setMoveVector({ x: 0, z: 1 })}
                  onPointerUp={() => setMoveVector({ x: 0, z: 0 })}
                  onPointerLeave={() => setMoveVector({ x: 0, z: 0 })}
                  className="w-7 h-6 sm:w-8 sm:h-7 rounded-lg bg-slate-800/90 active:bg-amber-500 active:text-slate-950 flex items-center justify-center cursor-pointer"
                  aria-label="Move Down"
                >
                  <ArrowDown className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </button>
                <button
                  type="button"
                  onPointerDown={() => setMoveVector({ x: 1, z: 0 })}
                  onPointerUp={() => setMoveVector({ x: 0, z: 0 })}
                  onPointerLeave={() => setMoveVector({ x: 0, z: 0 })}
                  className="w-7 h-6 sm:w-8 sm:h-7 rounded-lg bg-slate-800/90 active:bg-amber-500 active:text-slate-950 flex items-center justify-center cursor-pointer"
                  aria-label="Move Right"
                >
                  <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* UNIFIED COLLAPSIBLE BOTTOM CONTROL DOCK */}
          <div
            data-tour-id="bottom-dock"
            className="mx-auto w-full max-w-[920px] pointer-events-auto flex flex-col items-center"
          >
            <button
              type="button"
              onClick={() => setIsDockCollapsed(!isDockCollapsed)}
              className="px-3 py-0.5 rounded-t-xl bg-[#090d18]/92 border-t border-x border-amber-700/50 text-[9px] sm:text-[10px] font-bold text-amber-300 flex items-center gap-1 cursor-pointer"
            >
              {isDockCollapsed && !showOnboardingTour ? (
                <>
                  <ChevronUp className="w-3 h-3" />
                  <span>{t.expandDock}</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-3 h-3" />
                  <span>{t.collapseDock}</span>
                </>
              )}
            </button>

            {(!isDockCollapsed || showOnboardingTour) && (
              <div className="w-full bg-[#090d18]/92 backdrop-blur-sm border border-amber-700/50 rounded-xl sm:rounded-2xl p-1.5 sm:p-2.5 shadow-2xl space-y-1 sm:space-y-1.5">
                {/* Contextual Role Power & Action Strip */}
                <div className="flex items-center justify-between gap-1 border-b border-slate-800/90 pb-1">
                  <div className="flex flex-wrap items-center gap-1 text-xs min-w-0">
                    <span className="px-1.5 py-0.5 rounded bg-amber-950 border border-amber-600/50 text-amber-300 font-bold text-[10px] sm:text-[11px] whitespace-nowrap">
                      {t.yourRolePrefix} {myRole.name[lang]}
                    </span>

                    {/* Cupid Lover Partner Badge */}
                    {me.loverId && (
                      <span className="px-1.5 py-0.5 rounded bg-pink-950 border border-pink-500/60 text-pink-200 font-bold text-[10px] whitespace-nowrap">
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

                    {/* Witch Special Potion Controls (Only when Quản Trò Máy calls Witch) */}
                    {phase === 'night' &&
                      me.roleId === 'witch' &&
                      me.isAlive &&
                      !me.hasUsedPower &&
                      currentNightStep?.key === 'witch' && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={Boolean(me.hasUsedHeal) || !tonightWolfVictimId}
                            onClick={() => {
                              sound.playWitchCauldron();
                              setWitchSaveUsedTonight(!witchSaveUsedTonight);
                            }}
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border flex items-center gap-1 cursor-pointer ${
                              witchSaveUsedTonight
                                ? 'bg-emerald-700 border-emerald-400 text-white'
                                : 'bg-slate-900 border-emerald-700/50 text-emerald-300 disabled:opacity-40'
                            }`}
                          >
                            <FlaskConical className="w-3 h-3" />
                            <span>
                              {me.hasUsedHeal
                                ? t.witchOutHeal
                                : witchSaveUsedTonight
                                ? t.witchHealActive
                                : t.witchHealBtn(
                                    players.find((p) => p.id === tonightWolfVictimId)?.name || '?'
                                  )}
                            </span>
                          </button>
                          <span className="hidden md:inline text-[10px] text-rose-300">
                            {me.hasUsedPoison ? t.witchOutPoison : t.witchPoisonHint}
                          </span>
                        </div>
                      )}

                    {/* Seer Inspection Result Badge */}
                    {seerInspectResult && (
                      <span className="px-1.5 py-0.5 rounded bg-purple-950 border border-purple-500 text-purple-200 font-bold text-[10px]">
                        🔮 {seerInspectResult}
                      </span>
                    )}
                  </div>

                  {/* Tool Drawer Toggles */}
                  <div className="flex items-center gap-1 overflow-x-auto shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        setActiveDrawer(activeDrawer === 'chat' ? 'none' : 'chat')
                      }
                      className={`px-2 py-0.5 sm:py-1 rounded-lg text-[10px] font-bold border flex items-center gap-1 cursor-pointer shrink-0 ${
                        activeDrawer === 'chat'
                          ? 'bg-rose-800 border-rose-400 text-white'
                          : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white'
                      }`}
                    >
                      <MessageSquare className="w-3 h-3 text-rose-400" />
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
                              ? 'bg-amber-600 border-amber-300 text-slate-950'
                              : 'bg-slate-900 border-slate-700 text-amber-300 hover:bg-slate-800'
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
                              : 'bg-slate-900 border-slate-700 text-purple-300 hover:bg-slate-800'
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
                      className="px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-lg bg-slate-900 border border-slate-700 text-[10px] font-bold text-yellow-300 hover:bg-slate-800 flex items-center gap-1 cursor-pointer shrink-0"
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
                      className="px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-lg bg-slate-900 border border-slate-700 text-[10px] font-bold text-sky-300 hover:bg-slate-800 flex items-center gap-1 cursor-pointer shrink-0"
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
                      className="px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-lg bg-slate-900 border border-slate-700 text-[10px] font-bold text-emerald-300 hover:bg-slate-800 flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <BookOpen className="w-3 h-3" />
                      <span className="hidden sm:inline">{t.rulesShort}</span>
                    </button>
                  </div>
                </div>

                {/* Horizontal Player Seat Strip (Single-Line Chips on Mobile, 2-Line on Desktop) */}
                <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto pb-0.5">
                  {players.map((p, idx) => {
                    const isSelected =
                      selectedTargetId === p.id || secondWolfTargetId === p.id;
                    const vCount = votesMap[p.id] || 0;
                    const isMyLover = me.loverId === p.id;
                    const isMyWolfPackmate =
                      p.id !== me.id &&
                      (me.roleId === 'werewolf' || me.roleId === 'wolf_pup') &&
                      (p.roleId === 'werewolf' || p.roleId === 'wolf_pup');
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleSelect3DPlayer(p.id)}
                        className={`shrink-0 px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded-lg sm:rounded-xl border text-left transition-all flex items-center gap-1 sm:gap-1.5 cursor-pointer ${
                          !p.isAlive
                            ? 'bg-slate-950/60 border-cyan-900/50 text-cyan-400/70'
                            : isSelected
                            ? 'bg-rose-950 border-rose-400 text-rose-100 shadow-md'
                            : p.id === me.id
                            ? 'bg-sky-950/80 border-sky-500/60 text-sky-100'
                            : isMyLover
                            ? 'bg-pink-950/80 border-pink-500/60 text-pink-100'
                            : isMyWolfPackmate
                            ? 'bg-rose-950/70 border-rose-500/50 text-rose-100'
                            : 'bg-[#0f172a] border-slate-800 text-slate-200 hover:border-amber-500/50'
                        }`}
                      >
                        <span className="text-xs sm:text-sm">{p.isAlive ? p.avatar : '👻'}</span>
                        <div>
                          <div className="text-[9px] sm:text-[11px] font-bold whitespace-nowrap flex items-center gap-0.5 sm:gap-1">
                            <span className="text-amber-400 font-mono">#{idx + 1}</span>
                            <span className="max-w-[68px] sm:max-w-none truncate">{p.name}</span>
                            {isMyLover && <span title="Tình nhân">💘</span>}
                            {isMyWolfPackmate && <span title="Đồng đội Sói">🐺</span>}
                            {vCount > 0 && (
                              <span className="sm:hidden px-1 rounded bg-rose-700 text-white text-[8px] font-mono">
                                {vCount}
                              </span>
                            )}
                          </div>
                          <div className="hidden sm:block text-[9px] font-mono text-slate-400 leading-tight">
                            {!p.isAlive
                              ? t.ghostStatus
                              : vCount > 0
                              ? `${vCount} ${t.votesUnit}`
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
            )}
          </div>
        </div>
      )}

      {/* 4. MODAL DRAWERS FOR CHAT, GM ASSISTANT, VIRTUAL CARDS, LEADERBOARD, HISTORY, ENCYCLOPEDIA */}
      {activeDrawer !== 'none' && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center p-2.5 sm:p-4 pointer-events-auto"
          style={{ backgroundColor: 'rgba(5, 8, 17, 0.86)' }}
        >
          <div className="relative w-full max-w-5xl max-h-[88vh] bg-[#0b101e] border-2 border-amber-600/50 rounded-2xl p-3.5 sm:p-5 overflow-y-auto shadow-2xl">
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
                  isMicOn={isMicOn}
                  onToggleMic={() => setIsMicOn((m) => !m)}
                  activeSpeakers={activeSpeakers}
                  onTriggerUserSpeech={(transcript) => {
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
                        isGhost: !me.isAlive,
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

                <div className="pt-3 flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder={t.chatPlaceholder}
                    className="flex-1 bg-[#070a14] border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={handleSendMessage}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{t.sendBtn}</span>
                  </button>
                </div>
              </div>
            )}

            {activeDrawer === 'gm' && (
              <GMAssistantView
                lang={lang}
                initialRoomId={virtualCardRoomId || roomId}
                initialPlayerCount={villageSize}
                onOpenVirtualCards={(code) => {
                  setVirtualCardRoomId(code);
                  setActiveDrawer('cards');
                }}
              />
            )}

            {activeDrawer === 'cards' && (
              <VirtualCardPlayerView initialRoomId={virtualCardRoomId} lang={lang} />
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
                  onClick={() => {
                    const next =
                      cameraPreset === 'campfire'
                        ? 'overhead'
                        : cameraPreset === 'overhead'
                        ? 'dramatic'
                        : 'campfire';
                    setCameraPreset(next);
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
        onChangeVillageSize={setVillageSize}
        onChangePreferredRole={setPreferredRole}
        onClose={() => setLobbyModalState({ ...lobbyModalState, isOpen: false })}
        onLaunchOnlineRoom={(code, size, peers) => {
          handleStartMatch(size, preferredRole, 'online', code, peers);
        }}
        onLaunchGMHost={(code, size) => {
          setLobbyModalState({ isOpen: false, mode: 'gm' });
          setGameMode('gm');
          setRoomId(code);
          setVirtualCardRoomId(code);
          setVillageSize(size);
          setShellState('playing');
          setActiveDrawer('gm');
        }}
        onLaunchGMPlayerCard={(code) => {
          setLobbyModalState({ isOpen: false, mode: 'gm' });
          setGameMode('gm');
          setVirtualCardRoomId(code);
          setShellState('playing');
          setActiveDrawer('cards');
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

      {/* 10. ACCOUNT & DATABASE PROFILE MODAL */}
      {showProfileModal && (
        <SocialLoginModal
          currentUser={currentUser}
          initialTab={initialAccountTab}
          lang={lang}
          onClose={() => {
            setShowProfileModal(false);
            setInitialAccountTab(null);
          }}
          onSaveProfile={(profile) => {
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
    </div>
  );
}
