import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Users,
  Plus,
  LogIn,
  LogOut,
  Copy,
  Check,
  Shield,
  Smartphone,
  Play,
  X,
  Sparkles,
  Globe,
  Bot,
  Minus,
  Wifi,
  WifiOff,
  RefreshCw,
  Lock,
  Crown,
} from 'lucide-react';
import { RoleId, Language } from '../types/game';
import { CustomTimerConfig, DEFAULT_TIMER_CONFIG } from '../game/autoGM';
import { UI_TEXT } from '../utils/i18n';
import { sound } from '../utils/sound';
import { realtimeClient, type TransportMode } from '../utils/realtimeClient';
import type {
  OpenRoomSummary,
  RealtimeChatMessage,
  RealtimeRoomState,
  RealtimeTimerConfig,
} from '../server/realtimeRooms';
import type { OnlinePlayerMatchView } from '../server/onlineMatchEngine';
import type { GMDeckMode, GMRoomSummary } from '../server/gmRooms';

export interface LobbyParticipant {
  id: string;
  name: string;
  avatar: string;
  isBot: boolean;
  isHost?: boolean;
}

interface RoomLobbyModalProps {
  isOpen: boolean;
  lang: Language;
  initialMode: 'online' | 'gm';
  currentUser: { id: string; name: string; avatar: string; elo: number };
  villageSize: number;
  preferredRole: RoleId | 'random';
  timerConfig?: CustomTimerConfig;
  onChangeTimerConfig?: (next: CustomTimerConfig) => void;
  onChangeVillageSize: (size: number) => void;
  onChangePreferredRole: (role: RoleId | 'random') => void;
  onClose: () => void;
  onLaunchOnlineRoom: (
    roomId: string,
    size: number,
    participants: LobbyParticipant[],
    matchRoles?: Record<string, RoleId>,
    serverTimerConfig?: RealtimeTimerConfig,
    initialMatchView?: OnlinePlayerMatchView,
    initialServerNow?: number,
    initialChatMessages?: RealtimeChatMessage[]
  ) => void;
  onLaunchGMHost: (roomId: string, size: number, deckMode: GMDeckMode) => void;
  onLaunchGMPlayerCard: (roomId: string) => void;
}

function generateRoomCode(prefix: 'ONL-' | 'GM-'): string {
  return prefix + Math.floor(1000 + Math.random() * 9000);
}

function getStoredAuthToken(): string | undefined {
  try {
    return localStorage.getItem('werewolf_auth_token') || undefined;
  } catch {
    return undefined;
  }
}

interface NumericDraftInputProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    'type' | 'value' | 'onChange' | 'min' | 'max'
  > {
  value: number;
  min: number;
  max: number;
  onCommit: (next: number) => void;
}

const NumericDraftInput: React.FC<NumericDraftInputProps> = ({
  value,
  min,
  max,
  onCommit,
  onBlur,
  onFocus,
  onKeyDown,
  ...rest
}) => {
  const [draft, setDraft] = useState<string>(String(value));
  const [focused, setFocused] = useState<boolean>(false);
  const skipNextBlurRef = useRef<boolean>(false);

  useEffect(() => {
    if (!focused) setDraft(String(value));
  }, [value, focused]);

  const commit = (raw: string) => {
    const parsed = parseInt(raw, 10);
    if (Number.isNaN(parsed)) {
      setDraft(String(value));
      return;
    }
    const clamped = Math.max(min, Math.min(max, parsed));
    setDraft(String(clamped));
    if (clamped !== value) onCommit(clamped);
  };

  return (
    <input
      {...rest}
      type="number"
      min={min}
      max={max}
      value={draft}
      onFocus={(e) => {
        skipNextBlurRef.current = false;
        setFocused(true);
        onFocus?.(e);
      }}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={(e) => {
        setFocused(false);
        if (skipNextBlurRef.current) {
          skipNextBlurRef.current = false;
        } else {
          commit(e.currentTarget.value);
        }
        onBlur?.(e);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          skipNextBlurRef.current = true;
          commit(e.currentTarget.value);
          e.currentTarget.blur();
        } else if (e.key === 'Escape') {
          skipNextBlurRef.current = true;
          setDraft(String(value));
          e.currentTarget.blur();
        }
        onKeyDown?.(e);
      }}
    />
  );
};

export const RoomLobbyModal: React.FC<RoomLobbyModalProps> = ({
  isOpen,
  lang,
  initialMode,
  currentUser,
  villageSize,
  timerConfig = DEFAULT_TIMER_CONFIG,
  onChangeTimerConfig,
  onChangeVillageSize,
  onClose,
  onLaunchOnlineRoom,
  onLaunchGMHost,
  onLaunchGMPlayerCard,
}) => {
  const [modeTab, setModeTab] = useState<'online' | 'gm'>(initialMode);
  const [actionTab, setActionTab] = useState<'create' | 'join'>('create');
  const [createdRoomId, setCreatedRoomId] = useState<string>(() =>
    generateRoomCode(initialMode === 'online' ? 'ONL-' : 'GM-')
  );
  const [joinCodeInput, setJoinCodeInput] = useState<string>('');
  const [joinError, setJoinError] = useState<string>('');
  const [lobbyNotice, setLobbyNotice] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [wsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const [transportMode, setTransportMode] = useState<TransportMode>(() =>
    realtimeClient.getTransportMode()
  );
  const [liveRoom, setLiveRoom] = useState<RealtimeRoomState | null>(null);
  const [openRooms, setOpenRooms] = useState<OpenRoomSummary[]>([]);
  const [openGMRooms, setOpenGMRooms] = useState<GMRoomSummary[]>([]);
  const [gmDeckMode, setGmDeckMode] = useState<GMDeckMode>('virtual_deck');
  const [isJoining, setIsJoining] = useState<boolean>(false);
  const [isStarting, setIsStarting] = useState<boolean>(false);
  const [connectTimedOut, setConnectTimedOut] = useState<boolean>(false);

  const launchedRef = useRef(false);
  const pendingJoinCodeRef = useRef<string | null>(null);
  const isJoinedGuestRoomRef = useRef(false);
  const autoCreatedCodeRef = useRef<string | null>(null);
  const actionTabRef = useRef<'create' | 'join'>(actionTab);
  actionTabRef.current = actionTab;
  const liveRoomRef = useRef<RealtimeRoomState | null>(null);
  liveRoomRef.current = liveRoom;
  const preservedCodesRef = useRef<{ online: string; gm: string }>({
    online: generateRoomCode('ONL-'),
    gm: generateRoomCode('GM-'),
  });
  const joinTimeoutRef = useRef<number | null>(null);
  const connectTimeoutRef = useRef<number | null>(null);
  const startTimeoutRef = useRef<number | null>(null);

  const t = UI_TEXT[lang];

  const clearJoinTimeout = useCallback(() => {
    if (joinTimeoutRef.current !== null) {
      window.clearTimeout(joinTimeoutRef.current);
      joinTimeoutRef.current = null;
    }
  }, []);

  const clearStartTimeout = useCallback(() => {
    if (startTimeoutRef.current !== null) {
      window.clearTimeout(startTimeoutRef.current);
      startTimeoutRef.current = null;
    }
  }, []);

  const fetchOpenOnlineRooms = useCallback(async () => {
    try {
      const res = await fetch('/api/rooms');
      const data = await res.json();
      if (data?.ok && Array.isArray(data.rooms)) {
        setOpenRooms(data.rooms);
      }
    } catch {
      // ignore transient errors
    }
  }, []);

  const fetchOpenGMRooms = useCallback(async () => {
    try {
      const res = await fetch('/api/gm-rooms');
      const data = await res.json();
      if (data?.ok && Array.isArray(data.rooms)) {
        setOpenGMRooms(data.rooms);
      }
    } catch {
      // ignore transient errors
    }
  }, []);

  // Preserve active room code across close/reopen instead of wiping it (BUG-26)
  useEffect(() => {
    if (!isOpen) return;
    launchedRef.current = false;
    pendingJoinCodeRef.current = null;
    clearStartTimeout();
    setIsJoining(false);
    setIsStarting(false);
    setConnectTimedOut(false);
    setModeTab(initialMode);
    if (initialMode === 'gm' || !liveRoomRef.current) {
      setActionTab('create');
      const nextCode =
        initialMode === 'online'
          ? preservedCodesRef.current.online
          : preservedCodesRef.current.gm;
      setCreatedRoomId(nextCode);
    }
    setLobbyNotice('');
    setJoinError('');
    fetchOpenOnlineRooms();
    fetchOpenGMRooms();
  }, [initialMode, isOpen, fetchOpenOnlineRooms, fetchOpenGMRooms, clearStartTimeout]);

  // Subscribe to real WebSocket/HTTP room events while modal is open
  useEffect(() => {
    if (!isOpen) return;

    const launchRoomMatch = (
      room: RealtimeRoomState,
      initialView?: OnlinePlayerMatchView,
      initialServerNow?: number
    ) => {
      if (launchedRef.current) return;
      clearJoinTimeout();
      clearStartTimeout();
      setIsStarting(false);
      launchedRef.current = true;
      sound.playNightBell();
      const mapped: LobbyParticipant[] = room.participants.map((p) => ({
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        isBot: Boolean(p.isBot),
        isHost: p.isHost,
      }));
      onLaunchOnlineRoom(
        room.code,
        Math.max(4, mapped.length),
        mapped,
        room.matchRoles,
        room.timerConfig,
        initialView,
        initialServerNow,
        room.chatMessages
      );
    };

    const unsubStatus = realtimeClient.subscribeStatus(setWsStatus);
    const unsubTransport = realtimeClient.subscribeTransport(setTransportMode);
    const unsubEvents = realtimeClient.subscribe((evt) => {
      if (evt.type === 'room:list') {
        setOpenRooms(evt.rooms);
      } else if (evt.type === 'gm:room_list') {
        setOpenGMRooms(evt.rooms);
      } else if (evt.type === 'room:state') {
        clearJoinTimeout();
        const prevRoom = liveRoomRef.current;
        if (
          pendingJoinCodeRef.current &&
          evt.room.code === pendingJoinCodeRef.current &&
          prevRoom &&
          prevRoom.code !== evt.room.code
        ) {
          realtimeClient.leaveRoom(prevRoom.code, currentUser.id);
        }
        setConnectTimedOut(false);
        setLiveRoom(evt.room);
        liveRoomRef.current = evt.room;
        setJoinError('');
        if (evt.room.hostId === currentUser.id) {
          preservedCodesRef.current.online = evt.room.code;
          setCreatedRoomId(evt.room.code);
        }
        if (pendingJoinCodeRef.current && evt.room.code === pendingJoinCodeRef.current) {
          pendingJoinCodeRef.current = null;
          isJoinedGuestRoomRef.current = evt.room.hostId !== currentUser.id;
          setIsJoining(false);
          setModeTab('online');
          setActionTab('create');
        }
        if (
          evt.room.status === 'in_match' &&
          evt.room.participants.some((p) => p.id === currentUser.id) &&
          !launchedRef.current
        ) {
          launchRoomMatch(evt.room);
        }
      } else if (evt.type === 'room:kicked' && evt.targetId === currentUser.id) {
        clearJoinTimeout();
        clearStartTimeout();
        isJoinedGuestRoomRef.current = false;
        pendingJoinCodeRef.current = null;
        setIsJoining(false);
        setIsStarting(false);
        setLiveRoom(null);
        setActionTab('join');
        setJoinError(evt.reason);
        setLobbyNotice('');
        realtimeClient.requestRoomList();
      } else if (evt.type === 'room:match_started' && !launchedRef.current) {
        launchRoomMatch(evt.room);
      } else if (
        evt.type === 'room:match_state' &&
        !launchedRef.current &&
        liveRoomRef.current &&
        liveRoomRef.current.code === evt.code
      ) {
        launchRoomMatch(liveRoomRef.current, evt.view, evt.serverNow);
      } else if (evt.type === 'error') {
        clearJoinTimeout();
        clearStartTimeout();
        setIsStarting(false);
        const wasJoining = Boolean(pendingJoinCodeRef.current);
        if (pendingJoinCodeRef.current) {
          pendingJoinCodeRef.current = null;
          setIsJoining(false);
        }
        if (actionTabRef.current === 'join' || wasJoining) {
          setJoinError(evt.message);
        } else {
          setLobbyNotice(evt.message);
        }
      }
    });

    realtimeClient.requestRoomList();
    fetchOpenOnlineRooms();
    fetchOpenGMRooms();

    return () => {
      clearJoinTimeout();
      clearStartTimeout();
      unsubStatus();
      unsubTransport();
      unsubEvents();
    };
  }, [
    isOpen,
    currentUser.id,
    onLaunchOnlineRoom,
    fetchOpenOnlineRooms,
    fetchOpenGMRooms,
    clearJoinTimeout,
    clearStartTimeout,
  ]);

  // Automatically create the Host's own online room ONLY when on Create tab and NOT already in that room
  useEffect(() => {
    if (!isOpen || modeTab !== 'online' || actionTab !== 'create') return;
    if (isJoinedGuestRoomRef.current || pendingJoinCodeRef.current) return;
    if (liveRoomRef.current && liveRoomRef.current.hostId !== currentUser.id) return;
    if (!createdRoomId.startsWith('ONL-')) return;
    if (
      liveRoomRef.current &&
      liveRoomRef.current.code === createdRoomId &&
      liveRoomRef.current.participants.some((p) => p.id === currentUser.id)
    ) {
      return;
    }

    preservedCodesRef.current.online = createdRoomId;
    autoCreatedCodeRef.current = createdRoomId;
    setConnectTimedOut(false);
    realtimeClient.createOrJoinRoom({
      code: createdRoomId,
      user: {
        id: currentUser.id,
        name: currentUser.name,
        avatar: currentUser.avatar,
        elo: currentUser.elo,
      },
      villageSize,
      timerConfig,
      createIfMissing: true,
      authToken: getStoredAuthToken(),
      lang,
    });

    if (connectTimeoutRef.current !== null) {
      window.clearTimeout(connectTimeoutRef.current);
    }
    connectTimeoutRef.current = window.setTimeout(() => {
      if (!liveRoomRef.current) {
        setConnectTimedOut(true);
      }
    }, 10000);

    return () => {
      if (connectTimeoutRef.current !== null) {
        window.clearTimeout(connectTimeoutRef.current);
        connectTimeoutRef.current = null;
      }
    };
  }, [
    isOpen,
    modeTab,
    actionTab,
    createdRoomId,
    currentUser.id,
    currentUser.name,
    currentUser.avatar,
    currentUser.elo,
  ]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isStarting) {
        clearJoinTimeout();
        setIsJoining(false);
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isStarting, clearJoinTimeout, onClose]);

  // Latest requested size, so rapid +/- clicks accumulate instead of reusing a stale render value.
  // (Declared before the early return below to keep hook order stable.)
  const latestSizeRef = useRef(villageSize);

  if (!isOpen) return null;

  const isInJoinedOnlineRoom = modeTab === 'online' && Boolean(liveRoom);
  const isGuestInOnlineRoom =
    modeTab === 'online' && Boolean(liveRoom) && liveRoom!.hostId !== currentUser.id;
  // BUG-11 fix: Host creating a room is recognized as Host immediately (not misclassified as Guest while WS handshake completes)
  const isHost =
    modeTab === 'gm'
      ? true
      : liveRoom
      ? liveRoom.hostId === currentUser.id
      : actionTab === 'create' && !isJoinedGuestRoomRef.current && !pendingJoinCodeRef.current;
  const isHostSyncing = modeTab === 'online' && isHost && !liveRoom;

  const activeRoomCode = modeTab === 'online' ? liveRoom?.code || createdRoomId : createdRoomId;
  const participants: LobbyParticipant[] = liveRoom
    ? liveRoom.participants.map((p) => ({
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        isBot: Boolean(p.isBot),
        isHost: p.isHost,
      }))
    : [
        {
          id: currentUser.id,
          name: currentUser.name,
          avatar: currentUser.avatar,
          isBot: false,
          isHost: true,
        },
      ];
  const effectiveSize = liveRoom ? liveRoom.villageSize : villageSize;
  const effectiveTimer: RealtimeTimerConfig = liveRoom
    ? liveRoom.timerConfig
    : {
        nightActionSec: timerConfig.nightActionSec,
        dayDiscussSec: timerConfig.dayDiscussSec,
        dayVoteSec: timerConfig.dayVoteSec,
      };
  const botCount = participants.filter((p) => p.isBot).length;
  const humanCount = participants.length - botCount;

  const leaveActiveOnlineRoomIfAny = () => {
    clearJoinTimeout();
    clearStartTimeout();
    const activeCode = liveRoomRef.current?.code || autoCreatedCodeRef.current;
    if (activeCode && !launchedRef.current) {
      realtimeClient.leaveRoom(activeCode, currentUser.id);
    }
    autoCreatedCodeRef.current = null;
    isJoinedGuestRoomRef.current = false;
    pendingJoinCodeRef.current = null;
    setIsJoining(false);
    setIsStarting(false);
    setLiveRoom(null);
    liveRoomRef.current = null;
  };

  // BUG-26: Closing the modal preserves the active/created room code unless user clicks "Rời phòng"
  const handleCloseModal = () => {
    if (isStarting) return;
    clearJoinTimeout();
    setIsJoining(false);
    onClose();
  };

  const handleRetryOnlineConnect = () => {
    sound.playCardFlip();
    setConnectTimedOut(false);
    setLobbyNotice('');
    setJoinError('');
    realtimeClient.forceReconnect();
    autoCreatedCodeRef.current = createdRoomId;
    realtimeClient.createOrJoinRoom({
      code: createdRoomId,
      user: {
        id: currentUser.id,
        name: currentUser.name,
        avatar: currentUser.avatar,
        elo: currentUser.elo,
      },
      villageSize,
      timerConfig,
      createIfMissing: true,
      authToken: getStoredAuthToken(),
      lang,
    });
  };

  const handleLeaveJoinedRoom = () => {
    sound.playCardFlip();
    leaveActiveOnlineRoomIfAny();
    const nextOnlineCode = generateRoomCode('ONL-');
    preservedCodesRef.current.online = nextOnlineCode;
    setCreatedRoomId(nextOnlineCode);
    setLobbyNotice('');
    setJoinError('');
    setActionTab('join');
    realtimeClient.requestRoomList();
  };

  const handleCopyCode = () => {
    sound.playCardFlip();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(activeRoomCode).catch(() => {});
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  latestSizeRef.current = effectiveSize;

  const handleChangeSize = (nextSize: number) => {
    if (modeTab === 'online' && !isHost) return;
    const minAllowed = modeTab === 'online' ? Math.max(4, humanCount) : 4;
    const clamped = Math.max(minAllowed, Math.min(20, nextSize));
    latestSizeRef.current = clamped;
    onChangeVillageSize(clamped);
    if (modeTab === 'online' && isHost && liveRoom) {
      realtimeClient.updateConfig(liveRoom.code, currentUser.id, { villageSize: clamped });
    }
  };

  const handleChangeTimers = (next: CustomTimerConfig) => {
    if (modeTab === 'online' && !isHost) return;
    onChangeTimerConfig?.(next);
    if (modeTab === 'online' && isHost && liveRoom) {
      realtimeClient.updateConfig(liveRoom.code, currentUser.id, { timerConfig: next });
    }
  };

  const handleAddOneBot = () => {
    if (!isHost || !liveRoom || participants.length >= effectiveSize) return;
    sound.playCardFlip();
    realtimeClient.addBot(liveRoom.code, currentUser.id);
    setLobbyNotice('');
  };

  const handleFillRemainingWithBots = () => {
    if (!isHost || !liveRoom) return;
    sound.playCardFlip();
    realtimeClient.fillBots(liveRoom.code, currentUser.id);
    setLobbyNotice('');
  };

  const handleKickParticipant = (targetId: string) => {
    if (!isHost || !liveRoom) return;
    sound.playCardFlip();
    realtimeClient.kickParticipant(liveRoom.code, currentUser.id, targetId);
  };

  const handleStartOnlineClick = () => {
    if (isStarting) return;
    if (!isHost || !liveRoom) {
      setLobbyNotice(
        t.lbWaitingHostStart
      );
      return;
    }
    if (participants.length < 4) {
      setLobbyNotice(t.minPlayersWarning(participants.length));
      return;
    }
    setIsStarting(true);
    setLobbyNotice('');
    clearStartTimeout();
    startTimeoutRef.current = window.setTimeout(() => {
      setIsStarting(false);
    }, 8000);
    realtimeClient.startMatch(liveRoom.code, currentUser.id);
  };

  const handleJoinRoomSubmit = async (overrideCode?: string) => {
    const clean = (overrideCode ?? joinCodeInput).trim().toUpperCase();
    if (!clean || clean.length < 3) {
      setJoinError(
        modeTab === 'online' ? t.lbEnterCodeOnline : t.lbEnterCodeGM
      );
      return;
    }
    sound.playCardFlip();

    const isGMRoomTarget =
      clean.startsWith('GM-') || (modeTab === 'gm' && !clean.startsWith('ONL-'));

    if (isGMRoomTarget) {
      setIsJoining(true);
      setJoinError('');
      try {
        const res = await fetch(
          `/api/gm-rooms/${encodeURIComponent(clean)}/exists`
        );
        const data = await res.json().catch(() => ({ exists: false }));
        if (!res.ok || !data.exists) {
          setJoinError(
            t.lbGMRoomNotFound(clean)
          );
          setIsJoining(false);
          return;
        }
        setIsJoining(false);
        onLaunchGMPlayerCard(clean);
      } catch {
        setJoinError(
          t.lbGMUnreachable
        );
        setIsJoining(false);
      }
      return;
    }

    // Online 3D room join: NEVER auto-create a missing room; wait for server room:state confirmation with 10s timeout (BUG-01)
    setModeTab('online');
    setJoinError('');
    setLobbyNotice('');
    setIsJoining(true);
    pendingJoinCodeRef.current = clean;
    clearJoinTimeout();
    joinTimeoutRef.current = window.setTimeout(() => {
      if (pendingJoinCodeRef.current === clean) {
        pendingJoinCodeRef.current = null;
        setIsJoining(false);
        setJoinError(
          t.lbJoinTimeout(clean)
        );
      }
    }, 10000);
    realtimeClient.createOrJoinRoom({
      code: clean,
      user: {
        id: currentUser.id,
        name: currentUser.name,
        avatar: currentUser.avatar,
        elo: currentUser.elo,
      },
      createIfMissing: false,
      authToken: getStoredAuthToken(),
      lang,
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={modeTab === 'online' ? t.lobbyOnlineTitle : t.lobbyGMTitle}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isStarting) {
          handleCloseModal();
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-5 pointer-events-auto"
      style={{ backgroundColor: 'rgba(4, 7, 15, 0.9)' }}
      data-testid="room-lobby-modal"
    >
      <div className="w-full max-w-2xl bg-[#0b1120] border-2 border-amber-500/60 rounded-3xl p-4 sm:p-6 shadow-2xl space-y-3.5 max-h-[92vh] overflow-y-auto">
        {/* Header (sticky so Close × stays reachable on 390×844 mobile) */}
        <div className="sticky top-0 z-20 -mx-4 sm:-mx-6 -mt-4 sm:-mt-6 px-4 sm:px-6 pt-4 sm:pt-5 pb-3 bg-[#0b1120]/95 backdrop-blur-sm flex items-center justify-between border-b border-slate-800 gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2.5 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-400 shrink-0">
              {modeTab === 'online' ? <Globe className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-bold">
                  {t.lobbyBadge}
                </span>
                {modeTab === 'online' && (
                  <span
                    data-testid="ws-connection-badge"
                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold flex items-center gap-1 ${
                      wsStatus === 'connected'
                        ? 'bg-emerald-950 border border-emerald-500/50 text-emerald-300'
                        : 'bg-slate-900 border border-slate-700 text-slate-400'
                    }`}
                  >
                    {wsStatus === 'connected' ? (
                      <Wifi className="w-2.5 h-2.5" />
                    ) : (
                      <WifiOff className="w-2.5 h-2.5" />
                    )}
                    <span>
                      {wsStatus === 'connected'
                        ? t.lbLiveServer
                        : t.lbConnecting}
                    </span>
                  </span>
                )}
              </div>
              <h3 className="text-sm sm:text-lg font-black text-slate-100 truncate">
                {modeTab === 'online' ? t.lobbyOnlineTitle : t.lobbyGMTitle}
              </h3>
            </div>
          </div>

          <button
            type="button"
            disabled={isStarting}
            onClick={handleCloseModal}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 cursor-pointer shrink-0"
            aria-label={t.closeAria}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Switcher */}
        <div className="grid grid-cols-2 gap-1.5 sm:gap-2 bg-[#070a14] p-1 sm:p-1.5 rounded-2xl border border-slate-800">
          <button
            type="button"
            onClick={() => {
              sound.playCardFlip();
              if (modeTab === 'online') return;
              setModeTab('online');
              setActionTab('create');
              setCreatedRoomId(liveRoomRef.current?.code || preservedCodesRef.current.online);
              setJoinError('');
              setLobbyNotice('');
            }}
            className={`py-2 px-2 sm:py-2.5 sm:px-3 rounded-xl text-[11px] sm:text-xs font-extrabold flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer whitespace-nowrap ${
              modeTab === 'online'
                ? 'bg-rose-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="sm:hidden">{t.tabOnline3DShort}</span>
            <span className="hidden sm:inline truncate">{t.tabOnline3D}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              sound.playCardFlip();
              if (modeTab === 'gm') return;
              setModeTab('gm');
              setActionTab('create');
              setCreatedRoomId(preservedCodesRef.current.gm);
              setJoinError('');
              setLobbyNotice('');
              fetchOpenGMRooms();
            }}
            className={`py-2 px-2 sm:py-2.5 sm:px-3 rounded-xl text-[11px] sm:text-xs font-extrabold flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer whitespace-nowrap ${
              modeTab === 'gm'
                ? 'bg-amber-500 text-slate-950 shadow-lg'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="sm:hidden">{t.lbGMToolShort}</span>
            <span className="hidden sm:inline truncate">{t.tabGMOffline}</span>
          </button>
        </div>

        {modeTab === 'online' && (
          <div
            data-testid="online-sync-badge"
            className={`px-3 py-1.5 rounded-xl border text-[11px] font-semibold ${
              transportMode === 'ws'
                ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-200'
                : 'bg-sky-950/50 border-sky-500/40 text-sky-200'
            }`}
          >
            {transportMode === 'ws'
              ? t.lbSyncWs
              : t.lbSyncHttp}
          </div>
        )}

        {/* Action Sub-Tabs (Hidden when Guest is inside a joined room; replaced by Guest Status + Leave button) */}
        {isGuestInOnlineRoom ? (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div
              data-testid="lobby-guest-readonly-badge"
              className="px-3 py-1.5 rounded-xl bg-sky-950/70 border border-sky-500/50 text-xs font-bold text-sky-200 flex items-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span>
                {t.lbGuestReadonly}
              </span>
            </div>

            <button
              type="button"
              data-testid="lobby-leave-room-btn"
              onClick={handleLeaveJoinedRoom}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{t.lbLeaveRoom}</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                data-testid="lobby-subtab-create"
                onClick={() => {
                  sound.playCardFlip();
                  clearJoinTimeout();
                  pendingJoinCodeRef.current = null;
                  setIsJoining(false);
                  if (modeTab === 'online') {
                    setCreatedRoomId(liveRoomRef.current?.code || preservedCodesRef.current.online);
                  }
                  setActionTab('create');
                  setJoinError('');
                  setLobbyNotice('');
                }}
                className={`px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                  actionTab === 'create'
                    ? 'bg-amber-500/20 border border-amber-400 text-amber-200'
                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span>{t.subTabCreate}</span>
              </button>

              <button
                type="button"
                data-testid="lobby-subtab-join"
                onClick={() => {
                  sound.playCardFlip();
                  setActionTab('join');
                  setJoinError('');
                  setLobbyNotice('');
                  realtimeClient.requestRoomList();
                  fetchOpenGMRooms();
                }}
                className={`px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                  actionTab === 'join'
                    ? 'bg-sky-500/20 border border-sky-400 text-sky-200'
                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <LogIn className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span>{t.subTabJoin}</span>
              </button>
            </div>

            {isInJoinedOnlineRoom && isHost && actionTab === 'create' && (
              <div className="flex items-center gap-1.5">
                <span
                  data-testid="lobby-host-badge"
                  className="px-2.5 py-1 rounded-lg bg-amber-950/70 border border-amber-500/40 text-[11px] font-bold text-amber-300 flex items-center gap-1"
                >
                  <Crown className="w-3.5 h-3.5" />
                  <span>{t.lbRoomHost}</span>
                </span>
                <button
                  type="button"
                  data-testid="lobby-leave-room-btn"
                  disabled={isStarting}
                  onClick={handleLeaveJoinedRoom}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 border border-slate-700 text-[11px] font-bold text-slate-200 flex items-center gap-1 cursor-pointer"
                >
                  <LogOut className="w-3 h-3" />
                  <span>{t.lbLeaveRoom}</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* CREATE / ACTIVE ROOM LOBBY CONTENT */}
        {actionTab === 'create' ? (
          <div className="space-y-3.5">
            {/* Room Code + Size Banner */}
            <div className="bg-[#070a14] border border-amber-500/40 rounded-2xl p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  {isGuestInOnlineRoom
                    ? t.lbJoinedRoomCode
                    : t.yourRoomCodeLabel}
                </span>
                <div className="flex items-center gap-2.5 mt-1">
                  <span
                    data-testid="lobby-room-code"
                    className="text-xl sm:text-2xl font-mono font-black text-amber-300 tracking-widest"
                  >
                    {activeRoomCode}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-amber-200 flex items-center gap-1 cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{t.copiedCode}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>{t.copyCode}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {isHost ? (
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block mb-1">
                    {t.maxSeatsLabel(effectiveSize)}
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {[6, 8, 10, 12].map((cnt) => (
                      <button
                        key={cnt}
                        type="button"
                        onClick={() => handleChangeSize(cnt)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-extrabold border cursor-pointer ${
                          effectiveSize === cnt
                            ? 'bg-amber-500 text-slate-950 border-amber-400'
                            : 'bg-slate-900 text-slate-300 border-slate-700'
                        }`}
                      >
                        {cnt}
                      </button>
                    ))}

                    <div className="flex items-center gap-1 bg-slate-900 border border-amber-500/40 rounded-lg px-1.5 py-1">
                      <button
                        type="button"
                        data-testid="lobby-custom-size-dec"
                        disabled={effectiveSize <= Math.max(4, modeTab === 'online' ? humanCount : 4)}
                        onClick={() => handleChangeSize(latestSizeRef.current - 1)}
                        className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 cursor-pointer"
                        aria-label={t.decreasePlayersAria}
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <NumericDraftInput
                        min={modeTab === 'online' ? Math.max(4, humanCount) : 4}
                        max={20}
                        data-testid="lobby-custom-size-input"
                        aria-label={t.lbMaxSeats}
                        value={effectiveSize}
                        onCommit={handleChangeSize}
                        className="w-10 text-center bg-slate-950 border border-slate-700 rounded py-0.5 text-xs font-mono font-extrabold text-amber-300 focus:outline-none"
                      />
                      <button
                        type="button"
                        data-testid="lobby-custom-size-inc"
                        disabled={effectiveSize >= 20}
                        onClick={() => handleChangeSize(latestSizeRef.current + 1)}
                        className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 cursor-pointer"
                        aria-label={t.increasePlayersAria}
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  data-testid="lobby-guest-room-settings-summary"
                  className="bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2 text-right space-y-0.5"
                >
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {t.lbRoomHost}
                  </div>
                  <div className="text-xs font-extrabold text-amber-300">
                    {effectiveSize} {t.lbSeats} · 🌙 {effectiveTimer.nightActionSec}s · ☀️ {effectiveTimer.dayDiscussSec}s · ⚖️ {effectiveTimer.dayVoteSec}s
                  </div>
                </div>
              )}
            </div>

            {modeTab === 'online' ? (
              <>
                <div className="bg-[#070a14] border border-slate-800 rounded-2xl p-3.5 sm:p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div
                      data-testid="lobby-participant-summary"
                      className="text-xs font-bold text-slate-200 flex flex-wrap items-center gap-1.5"
                    >
                      <Users className="w-4 h-4 text-rose-400" />
                      <span>{t.roomListHeader(participants.length, effectiveSize)}</span>
                      <span
                        data-testid="lobby-human-count"
                        className="px-2 py-0.5 rounded-md bg-emerald-950/90 border border-emerald-500/40 text-[10px] text-emerald-300"
                      >
                        {t.humanCountBadge(humanCount)}
                      </span>
                      {botCount > 0 && (
                        <span
                          data-testid="lobby-bot-count"
                          className="px-2 py-0.5 rounded-md bg-sky-950/90 border border-sky-500/40 text-[10px] text-sky-300"
                        >
                          {t.botCountBadge(botCount)}
                        </span>
                      )}
                    </div>

                    {isHost && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          data-testid="lobby-add-bot-btn"
                          onClick={handleAddOneBot}
                          disabled={participants.length >= effectiveSize}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-[11px] font-bold text-sky-300 flex items-center gap-1 cursor-pointer"
                        >
                          <Bot className="w-3.5 h-3.5" />
                          <span>{t.addOneBotBtn}</span>
                        </button>
                        <button
                          type="button"
                          data-testid="lobby-fill-bots-btn"
                          onClick={handleFillRemainingWithBots}
                          disabled={participants.length >= effectiveSize}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-[11px] font-bold text-amber-300 flex items-center gap-1 cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>{t.fillBotsBtn}</span>
                        </button>
                      </div>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-400">
                    {isHost
                      ? t.lbShareCode(activeRoomCode)
                      : t.lbRoomHost}
                  </p>

                  {connectTimedOut && isHostSyncing && (
                    <div
                      role="alert"
                      data-testid="lobby-connect-timeout-banner"
                      className="px-3 py-2.5 rounded-xl bg-rose-950/70 border border-rose-500/60 text-xs text-rose-200 font-semibold flex flex-wrap items-center justify-between gap-2"
                    >
                      <span>
                        {t.lbConnectTimeout}
                      </span>
                      <button
                        type="button"
                        onClick={handleRetryOnlineConnect}
                        className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>{t.lbRetry}</span>
                      </button>
                    </div>
                  )}

                  {lobbyNotice && (
                    <div className="px-3 py-2 rounded-xl bg-amber-950/60 border border-amber-500/50 text-xs text-amber-200 font-semibold">
                      {lobbyNotice}
                    </div>
                  )}

                  {/* Real-time Synchronized Seats Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" data-testid="lobby-seats-grid">
                    {Array.from({ length: effectiveSize }).map((_, i) => {
                      const peer = participants[i];
                      const isSelf = peer?.id === currentUser.id;
                      return (
                        <div
                          key={peer ? peer.id : `empty_${i}`}
                          data-testid={peer ? `lobby-seat-filled-${i + 1}` : `lobby-seat-empty-${i + 1}`}
                          className={`p-2 rounded-xl border text-xs flex items-center justify-between gap-1.5 ${
                            peer
                              ? peer.isBot
                                ? 'bg-[#0f172a] border-sky-500/40 text-slate-100 font-bold'
                                : isSelf
                                ? 'bg-[#122620] border-emerald-400 text-emerald-100 font-bold'
                                : 'bg-[#0f1f1c] border-emerald-500/50 text-emerald-100 font-bold'
                              : 'bg-slate-950/60 border-slate-800/80 text-slate-500 border-dashed'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-amber-400 font-mono text-[10px] shrink-0">
                              #{i + 1}
                            </span>
                            {peer ? (
                              <>
                                <span className="shrink-0">{peer.avatar}</span>
                                <div className="truncate">
                                  <div className="truncate text-[11px] leading-tight">
                                    {peer.name}
                                    {isSelf && (
                                      <span className="ml-1 text-[9px] text-amber-300">
                                        ({t.lbYou})
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[9px] font-normal text-slate-400">
                                    {peer.isHost
                                      ? t.hostRoleLabel
                                      : peer.isBot
                                      ? t.botRoleLabel
                                      : t.humanRoleLabel}
                                  </div>
                                </div>
                              </>
                            ) : (
                              <span className="truncate text-[11px]">{t.emptySeat}</span>
                            )}
                          </div>

                          {peer && isHost && !peer.isHost && (
                            <button
                              type="button"
                              onClick={() => handleKickParticipant(peer.id)}
                              aria-label={`Remove ${peer.name}`}
                              className="p-1 rounded-lg bg-rose-950/80 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 shrink-0 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Host-Only Phase Timers (Guests never see editable controls) */}
                  {onChangeTimerConfig && isHost && (
                    <div
                      data-testid="lobby-host-timer-controls"
                      className="pt-2 border-t border-slate-800"
                    >
                      <div className="bg-slate-950/80 border border-amber-500/35 rounded-xl p-2.5 space-y-2">
                        <div className="flex items-center justify-between flex-wrap gap-1">
                          <span className="text-[11px] font-extrabold text-amber-300">
                            ⏱️ {t.lbPhaseTimers}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                handleChangeTimers({
                                  ...timerConfig,
                                  nightActionSec: 15,
                                  botStepSec: 3,
                                  dayDiscussSec: 25,
                                  dayVoteSec: 15,
                                })
                              }
                              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-sky-300 cursor-pointer"
                            >
                              ⚡ {t.lbTimerFast}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleChangeTimers(DEFAULT_TIMER_CONFIG)}
                              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-amber-300 cursor-pointer"
                            >
                              ⚖️ {t.lbTimerStandard}
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleChangeTimers({
                                  ...timerConfig,
                                  nightActionSec: 45,
                                  botStepSec: 6,
                                  dayDiscussSec: 75,
                                  dayVoteSec: 45,
                                })
                              }
                              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-emerald-300 cursor-pointer"
                            >
                              🐢 {t.lbTimerRelaxed}
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                          <label className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-lg px-2 py-1">
                            <span className="text-slate-300 font-semibold">
                              🌙 {t.lbTimerNight}
                            </span>
                            <NumericDraftInput
                              min={15}
                              max={120}
                              value={effectiveTimer.nightActionSec}
                              onCommit={(v) =>
                                handleChangeTimers({
                                  ...timerConfig,
                                  nightActionSec: v,
                                })
                              }
                              className="w-12 text-center bg-slate-950 border border-slate-700 rounded py-0.5 font-mono font-bold text-amber-300"
                            />
                          </label>
                          <label className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-lg px-2 py-1">
                            <span className="text-slate-300 font-semibold">
                              ☀️ {t.lbTimerDebate}
                            </span>
                            <NumericDraftInput
                              min={20}
                              max={300}
                              value={effectiveTimer.dayDiscussSec}
                              onCommit={(v) =>
                                handleChangeTimers({
                                  ...timerConfig,
                                  dayDiscussSec: v,
                                })
                              }
                              className="w-12 text-center bg-slate-950 border border-slate-700 rounded py-0.5 font-mono font-bold text-amber-300"
                            />
                          </label>
                          <label className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-lg px-2 py-1">
                            <span className="text-slate-300 font-semibold">
                              ⚖️ {t.lbTimerVote}
                            </span>
                            <NumericDraftInput
                              min={15}
                              max={180}
                              value={effectiveTimer.dayVoteSec}
                              onCommit={(v) =>
                                handleChangeTimers({
                                  ...timerConfig,
                                  dayVoteSec: v,
                                })
                              }
                              className="w-12 text-center bg-slate-950 border border-slate-700 rounded py-0.5 font-mono font-bold text-amber-300"
                            />
                          </label>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  data-testid="lobby-start-online-btn"
                  disabled={!isHost || isHostSyncing || isStarting}
                  onClick={handleStartOnlineClick}
                  className={`w-full py-3.5 rounded-2xl font-extrabold text-xs sm:text-sm shadow-xl flex items-center justify-center gap-2 ${
                    isHost && !isHostSyncing && !isStarting
                      ? 'bg-rose-600 hover:bg-rose-500 text-white cursor-pointer'
                      : 'bg-slate-800 text-slate-400 border border-slate-700 cursor-not-allowed'
                  }`}
                >
                  {isHost && !isHostSyncing && !isStarting ? (
                    <Play className="w-4 h-4 fill-white" />
                  ) : isHostSyncing || isStarting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Lock className="w-4 h-4" />
                  )}
                  <span>
                    {isStarting
                      ? t.lbStarting
                      : isHostSyncing
                      ? t.lbSyncingRoom
                      : isHost
                      ? t.startOnlineMatchBtn(participants.length, activeRoomCode)
                      : t.lbWaitingHostStart}
                  </span>
                </button>
              </>
            ) : (
              <div className="space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    data-testid="lobby-gm-virtual-deck-btn"
                    onClick={() => {
                      sound.playCardFlip();
                      setGmDeckMode('virtual_deck');
                    }}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      gmDeckMode === 'virtual_deck'
                        ? 'bg-amber-500/15 border-amber-400 text-amber-100'
                        : 'bg-[#070a14] border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="text-xs font-black">
                      🃏 {t.lbNoPhysicalDeck}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                      {t.lbNoPhysicalDeckDesc}
                    </p>
                  </button>

                  <button
                    type="button"
                    data-testid="lobby-gm-physical-cards-btn"
                    onClick={() => {
                      sound.playCardFlip();
                      setGmDeckMode('physical_cards');
                    }}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      gmDeckMode === 'physical_cards'
                        ? 'bg-emerald-500/15 border-emerald-400 text-emerald-100'
                        : 'bg-[#070a14] border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="text-xs font-black">
                      🎴 {t.lbHavePhysicalDeck}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                      {t.lbHavePhysicalDeckDesc}
                    </p>
                  </button>
                </div>

                <div className="bg-[#070a14] border border-slate-800 rounded-2xl p-3.5 text-xs text-slate-300 space-y-1.5 leading-relaxed">
                  <p className="font-bold text-amber-300">
                    {t.lbCompanionTitle}
                  </p>
                  <p>
                    {t.lbCompanionStep1(createdRoomId)}
                  </p>
                  <p>
                    {t.lbCompanionStep2(createdRoomId)}
                  </p>
                </div>

                <button
                  type="button"
                  data-testid="lobby-open-gm-panel-btn"
                  onClick={() => onLaunchGMHost(createdRoomId, villageSize, gmDeckMode)}
                  className="w-full py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs sm:text-sm shadow-xl flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Shield className="w-4 h-4" />
                  <span>{t.openGMPanelBtn(createdRoomId)}</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          /* JOIN EXISTING ROOM */
          <div className="space-y-4">
            <div className="bg-[#070a14] border border-slate-800 rounded-2xl p-4 space-y-3">
              <label
                htmlFor="lobby-join-code-input"
                className="text-xs font-bold text-amber-300 block"
              >
                {t.enterRoomCodeLabel}
              </label>
              <input
                id="lobby-join-code-input"
                data-testid="lobby-join-code-input"
                type="text"
                value={joinCodeInput}
                onChange={(e) => {
                  setJoinCodeInput(e.target.value.toUpperCase());
                  setJoinError('');
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleJoinRoomSubmit()}
                placeholder={modeTab === 'online' ? 'ONL-4829' : 'GM-7391'}
                className="w-full bg-slate-950 border-2 border-slate-700 focus:border-amber-400 rounded-xl px-4 py-3 text-base font-mono font-extrabold text-amber-200 uppercase tracking-widest focus:outline-none"
              />
              {joinError && (
                <p role="alert" data-testid="lobby-join-error" className="text-xs text-rose-400 font-semibold">
                  {joinError}
                </p>
              )}
            </div>

            {modeTab === 'online' ? (
              <div className="bg-[#070a14] border border-slate-800 rounded-2xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-300">
                    {t.lbOpenOnlineRooms}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      realtimeClient.requestRoomList();
                      fetchOpenOnlineRooms();
                    }}
                    className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-sky-300 flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>{t.lbRefresh}</span>
                  </button>
                </div>

                {openRooms.length === 0 ? (
                  <p className="text-[11px] text-slate-500 py-2 text-center">
                    {t.lbNoOpenRooms}
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-44 overflow-y-auto" data-testid="lobby-open-rooms-list">
                    {openRooms.map((r) => (
                      <div
                        key={r.code}
                        className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs"
                      >
                        <div>
                          <span className="font-mono font-black text-amber-300">{r.code}</span>
                          <span className="text-slate-400 ml-2">
                            {r.hostName} · {r.playerCount}/{r.villageSize}
                            {r.status === 'in_match' && (
                              <span className="ml-1.5 text-rose-400 font-bold">
                                ({t.lbInMatch})
                              </span>
                            )}
                          </span>
                        </div>
                        <button
                          type="button"
                          disabled={isJoining || r.status === 'in_match'}
                          onClick={() => handleJoinRoomSubmit(r.code)}
                          className="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white font-bold text-[11px] cursor-pointer"
                        >
                          {t.lbJoin}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-[#070a14] border border-slate-800 rounded-2xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-300">
                    {t.lbOpenGMRooms}
                  </span>
                  <button
                    type="button"
                    onClick={fetchOpenGMRooms}
                    className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-amber-300 flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>{t.lbRefresh}</span>
                  </button>
                </div>

                {openGMRooms.length === 0 ? (
                  <p className="text-[11px] text-slate-500 py-2 text-center">
                    {t.lbNoGMRooms}
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-44 overflow-y-auto" data-testid="lobby-open-gm-rooms-list">
                    {openGMRooms.map((r) => (
                      <div
                        key={r.code}
                        className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs"
                      >
                        <div>
                          <span className="font-mono font-black text-amber-300">{r.code}</span>
                          <span className="text-slate-400 ml-2">
                            {r.deckMode === 'physical_cards'
                              ? t.lbPhysical
                              : t.lbVirtual}{' '}
                            · {r.claimedCount}/{r.playerCount}
                          </span>
                        </div>
                        <button
                          type="button"
                          disabled={isJoining}
                          onClick={() => handleJoinRoomSubmit(r.code)}
                          className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-bold text-[11px] cursor-pointer"
                        >
                          {t.lbJoin}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              data-testid="lobby-join-submit-btn"
              disabled={isJoining}
              onClick={() => handleJoinRoomSubmit()}
              className="w-full py-3.5 rounded-2xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-slate-950 font-extrabold text-xs sm:text-sm shadow-xl flex items-center justify-center gap-2 cursor-pointer"
            >
              {modeTab === 'online' ? (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>
                    {isJoining
                      ? t.lbJoining
                      : t.joinOnlineBtn}
                  </span>
                </>
              ) : (
                <>
                  <Smartphone className="w-4 h-4" />
                  <span>
                    {isJoining
                      ? t.lbChecking
                      : t.joinGMCardBtn}
                  </span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

