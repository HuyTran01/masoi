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
import { realtimeClient } from '../utils/realtimeClient';
import type {
  OpenRoomSummary,
  RealtimeRoomState,
  RealtimeTimerConfig,
} from '../server/realtimeRooms';
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
    serverTimerConfig?: RealtimeTimerConfig
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
  const [liveRoom, setLiveRoom] = useState<RealtimeRoomState | null>(null);
  const [openRooms, setOpenRooms] = useState<OpenRoomSummary[]>([]);
  const [openGMRooms, setOpenGMRooms] = useState<GMRoomSummary[]>([]);
  const [gmDeckMode, setGmDeckMode] = useState<GMDeckMode>('virtual_deck');
  const [isJoining, setIsJoining] = useState<boolean>(false);
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

  const t = UI_TEXT[lang];

  const clearJoinTimeout = useCallback(() => {
    if (joinTimeoutRef.current !== null) {
      window.clearTimeout(joinTimeoutRef.current);
      joinTimeoutRef.current = null;
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
    setIsJoining(false);
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
  }, [initialMode, isOpen, fetchOpenOnlineRooms, fetchOpenGMRooms]);

  // Subscribe to real WebSocket room events while modal is open
  useEffect(() => {
    if (!isOpen) return;

    const unsubStatus = realtimeClient.subscribeStatus(setWsStatus);
    const unsubEvents = realtimeClient.subscribe((evt) => {
      if (evt.type === 'room:list') {
        setOpenRooms(evt.rooms);
      } else if (evt.type === 'gm:room_list') {
        setOpenGMRooms(evt.rooms);
      } else if (evt.type === 'room:state') {
        clearJoinTimeout();
        // Drop late room:state from a solo auto-created room if user already switched to Join tab
        if (
          actionTabRef.current === 'join' &&
          !pendingJoinCodeRef.current &&
          evt.room.hostId === currentUser.id
        ) {
          realtimeClient.leaveRoom(evt.room.code, currentUser.id);
          return;
        }
        setConnectTimedOut(false);
        setLiveRoom(evt.room);
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
      } else if (evt.type === 'room:kicked' && evt.targetId === currentUser.id) {
        clearJoinTimeout();
        isJoinedGuestRoomRef.current = false;
        pendingJoinCodeRef.current = null;
        setIsJoining(false);
        setLiveRoom(null);
        setActionTab('join');
        setJoinError(evt.reason);
        setLobbyNotice(evt.reason);
        realtimeClient.requestRoomList();
      } else if (evt.type === 'room:match_started' && !launchedRef.current) {
        clearJoinTimeout();
        launchedRef.current = true;
        sound.playNightBell();
        const mapped: LobbyParticipant[] = evt.room.participants.map((p) => ({
          id: p.id,
          name: p.name,
          avatar: p.avatar,
          isBot: Boolean(p.isBot),
          isHost: p.isHost,
        }));
        onLaunchOnlineRoom(
          evt.room.code,
          Math.max(4, mapped.length),
          mapped,
          evt.room.matchRoles,
          evt.room.timerConfig
        );
      } else if (evt.type === 'error') {
        clearJoinTimeout();
        if (pendingJoinCodeRef.current) {
          pendingJoinCodeRef.current = null;
          setIsJoining(false);
        }
        setJoinError(evt.message);
        setLobbyNotice(evt.message);
      }
    });

    realtimeClient.requestRoomList();
    fetchOpenOnlineRooms();
    fetchOpenGMRooms();

    return () => {
      clearJoinTimeout();
      unsubStatus();
      unsubEvents();
    };
  }, [isOpen, currentUser.id, onLaunchOnlineRoom, fetchOpenOnlineRooms, fetchOpenGMRooms, clearJoinTimeout]);

  // Automatically create the Host's own online room ONLY when on Create tab and NOT joining via invite code
  useEffect(() => {
    if (!isOpen || modeTab !== 'online' || actionTab !== 'create') return;
    if (isJoinedGuestRoomRef.current || pendingJoinCodeRef.current) return;
    if (liveRoomRef.current && liveRoomRef.current.hostId !== currentUser.id) return;
    if (!createdRoomId.startsWith('ONL-')) return;

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

  const activeRoomCode = liveRoom?.code || createdRoomId;
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
    const activeCode = liveRoomRef.current?.code || autoCreatedCodeRef.current;
    if (activeCode && !launchedRef.current) {
      realtimeClient.leaveRoom(activeCode, currentUser.id);
    }
    autoCreatedCodeRef.current = null;
    isJoinedGuestRoomRef.current = false;
    pendingJoinCodeRef.current = null;
    setIsJoining(false);
    setLiveRoom(null);
  };

  // BUG-26: Closing the modal preserves the active/created room code unless user clicks "Rời phòng"
  const handleCloseModal = () => {
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
    });
  };

  const handleLeaveJoinedRoom = () => {
    sound.playCardFlip();
    leaveActiveOnlineRoomIfAny();
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

  const handleChangeSize = (nextSize: number) => {
    if (modeTab === 'online' && !isHost) return;
    const minAllowed = modeTab === 'online' ? Math.max(4, humanCount) : 4;
    const clamped = Math.max(minAllowed, Math.min(20, nextSize));
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
    if (!isHost || !liveRoom) {
      setLobbyNotice(
        lang === 'vi'
          ? 'Đang chờ Chủ phòng bấm Bắt đầu ván đấu...'
          : 'Waiting for the Room Host to start the match...'
      );
      return;
    }
    if (participants.length < 4) {
      setLobbyNotice(t.minPlayersWarning(participants.length));
      return;
    }
    realtimeClient.startMatch(liveRoom.code, currentUser.id);
  };

  const handleJoinRoomSubmit = async (overrideCode?: string) => {
    const clean = (overrideCode ?? joinCodeInput).trim().toUpperCase();
    if (!clean || clean.length < 3) {
      setJoinError(
        lang === 'vi'
          ? modeTab === 'online'
            ? 'Nhập mã phòng hợp lệ (VD: ONL-4821)'
            : 'Nhập mã phòng Quản Trò hợp lệ (VD: GM-4821)'
          : 'Enter a valid room code'
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
            lang === 'vi'
              ? `Không tìm thấy phòng Quản Trò "${clean}". Hãy kiểm tra lại mã phòng từ Quản Trò.`
              : `GM room "${clean}" not found. Check the code with your Game Master.`
          );
          setIsJoining(false);
          return;
        }
        setIsJoining(false);
        onLaunchGMPlayerCard(clean);
      } catch {
        setJoinError(
          lang === 'vi'
            ? 'Không thể kiểm tra phòng Quản Trò. Vui lòng thử lại.'
            : 'Could not reach GM server. Please try again.'
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
          lang === 'vi'
            ? `Quá thời gian kết nối máy chủ phòng "${clean}" (10s). Kiểm tra mạng hoặc bấm Thử lại.`
            : `Connection timed out while joining "${clean}" (10s). Please retry.`
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
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={modeTab === 'online' ? t.lobbyOnlineTitle : t.lobbyGMTitle}
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-5 pointer-events-auto"
      style={{ backgroundColor: 'rgba(4, 7, 15, 0.9)' }}
      data-testid="room-lobby-modal"
    >
      <div className="w-full max-w-2xl bg-[#0b1120] border-2 border-amber-500/60 rounded-3xl p-4 sm:p-6 shadow-2xl space-y-3.5 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 gap-2">
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
                        ? lang === 'vi'
                          ? 'Máy chủ trực tuyến'
                          : 'Live Server'
                        : lang === 'vi'
                        ? 'Đang kết nối...'
                        : 'Connecting...'}
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
            onClick={handleCloseModal}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer shrink-0"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Switcher */}
        <div className="grid grid-cols-2 gap-2 bg-[#070a14] p-1.5 rounded-2xl border border-slate-800">
          <button
            type="button"
            onClick={() => {
              sound.playCardFlip();
              if (modeTab === 'online') return;
              leaveActiveOnlineRoomIfAny();
              setModeTab('online');
              setActionTab('create');
              setCreatedRoomId(preservedCodesRef.current.online);
              setJoinError('');
              setLobbyNotice('');
            }}
            className={`py-2.5 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 cursor-pointer ${
              modeTab === 'online'
                ? 'bg-rose-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe className="w-4 h-4 shrink-0" />
            <span className="truncate">{t.tabOnline3D}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              sound.playCardFlip();
              if (modeTab === 'gm') return;
              leaveActiveOnlineRoomIfAny();
              setModeTab('gm');
              setActionTab('create');
              setCreatedRoomId(preservedCodesRef.current.gm);
              setJoinError('');
              setLobbyNotice('');
              fetchOpenGMRooms();
            }}
            className={`py-2.5 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 cursor-pointer ${
              modeTab === 'gm'
                ? 'bg-amber-500 text-slate-950 shadow-lg'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Shield className="w-4 h-4 shrink-0" />
            <span className="truncate">{t.tabGMOffline}</span>
          </button>
        </div>

        {modeTab === 'online' && (
          <div
            data-testid="online-beta-badge"
            className="px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px] font-semibold text-slate-300"
          >
            {lang === 'vi'
              ? 'Beta · Đồng bộ phòng chờ, chat, đạo cụ & phiếu bầu'
              : 'Beta · Syncs lobby, chat, props & votes'}
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
                {lang === 'vi'
                  ? 'Khách mời · Chỉ Chủ phòng được tùy chỉnh thông tin phòng'
                  : 'Guest · Only the Room Host can modify room settings'}
              </span>
            </div>

            <button
              type="button"
              data-testid="lobby-leave-room-btn"
              onClick={handleLeaveJoinedRoom}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{lang === 'vi' ? 'Rời phòng' : 'Leave Room'}</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                data-testid="lobby-subtab-create"
                onClick={() => {
                  sound.playCardFlip();
                  isJoinedGuestRoomRef.current = false;
                  pendingJoinCodeRef.current = null;
                  setIsJoining(false);
                  if (modeTab === 'online' && !liveRoom) {
                    setCreatedRoomId(generateRoomCode('ONL-'));
                  }
                  setActionTab('create');
                  setJoinError('');
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                  actionTab === 'create'
                    ? 'bg-amber-500/20 border border-amber-400 text-amber-200'
                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Plus className="w-4 h-4" />
                <span>{t.subTabCreate}</span>
              </button>

              <button
                type="button"
                data-testid="lobby-subtab-join"
                onClick={() => {
                  sound.playCardFlip();
                  if (modeTab === 'online') {
                    // Leave auto-created solo room so open room list stays clean
                    leaveActiveOnlineRoomIfAny();
                  }
                  setActionTab('join');
                  setJoinError('');
                  setLobbyNotice('');
                  realtimeClient.requestRoomList();
                  fetchOpenGMRooms();
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                  actionTab === 'join'
                    ? 'bg-sky-500/20 border border-sky-400 text-sky-200'
                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <LogIn className="w-4 h-4" />
                <span>{t.subTabJoin}</span>
              </button>
            </div>

            {isInJoinedOnlineRoom && isHost && (
              <span
                data-testid="lobby-host-badge"
                className="px-2.5 py-1 rounded-lg bg-amber-950/70 border border-amber-500/40 text-[11px] font-bold text-amber-300 flex items-center gap-1"
              >
                <Crown className="w-3.5 h-3.5" />
                <span>{lang === 'vi' ? 'Chủ phòng' : 'Room Host'}</span>
              </span>
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
                    ? lang === 'vi'
                      ? 'MÃ PHÒNG ĐANG THAM GIA'
                      : 'JOINED ROOM CODE'
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
                        onClick={() => handleChangeSize(effectiveSize - 1)}
                        className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 cursor-pointer"
                        aria-label="Decrease player count"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <input
                        type="number"
                        min={4}
                        max={20}
                        data-testid="lobby-custom-size-input"
                        aria-label={lang === 'vi' ? 'Số ghế tối đa' : 'Maximum seats'}
                        value={effectiveSize}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          if (!Number.isNaN(val)) handleChangeSize(val);
                        }}
                        className="w-10 text-center bg-slate-950 border border-slate-700 rounded py-0.5 text-xs font-mono font-extrabold text-amber-300 focus:outline-none"
                      />
                      <button
                        type="button"
                        data-testid="lobby-custom-size-inc"
                        disabled={effectiveSize >= 20}
                        onClick={() => handleChangeSize(effectiveSize + 1)}
                        className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 cursor-pointer"
                        aria-label="Increase player count"
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
                    {lang === 'vi' ? 'Cấu hình phòng (Chủ phòng đặt)' : 'Room Settings (Host Only)'}
                  </div>
                  <div className="text-xs font-extrabold text-amber-300">
                    {effectiveSize} {lang === 'vi' ? 'ghế' : 'seats'} · 🌙 {effectiveTimer.nightActionSec}s · ☀️ {effectiveTimer.dayDiscussSec}s · ⚖️ {effectiveTimer.dayVoteSec}s
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
                      ? lang === 'vi'
                        ? `Gửi mã ${activeRoomCode} cho bạn bè ở thiết bị khác nhập tại tab "Vào Phòng" để cùng chơi trực tuyến thời gian thực.`
                        : `Share code ${activeRoomCode} with friends on other devices to join this live WebSocket room.`
                      : lang === 'vi'
                      ? 'Danh sách thành viên và cấu hình phòng được đồng bộ trực tiếp từ Chủ phòng.'
                      : 'Participant list and room rules are synced live from the Room Host.'}
                  </p>

                  {connectTimedOut && isHostSyncing && (
                    <div
                      role="alert"
                      data-testid="lobby-connect-timeout-banner"
                      className="px-3 py-2.5 rounded-xl bg-rose-950/70 border border-rose-500/60 text-xs text-rose-200 font-semibold flex flex-wrap items-center justify-between gap-2"
                    >
                      <span>
                        {lang === 'vi'
                          ? 'Không thể kết nối máy chủ phòng trực tuyến sau 10 giây. Vui lòng thử lại.'
                          : 'Could not reach the live room server after 10s. Please retry.'}
                      </span>
                      <button
                        type="button"
                        onClick={handleRetryOnlineConnect}
                        className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>{lang === 'vi' ? 'Thử lại' : 'Retry'}</span>
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
                                        ({lang === 'vi' ? 'Bạn' : 'You'})
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
                            ⏱️ {lang === 'vi' ? 'Thời gian mỗi pha:' : 'Phase timers:'}
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
                              ⚡ {lang === 'vi' ? 'Nhanh' : 'Fast'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleChangeTimers(DEFAULT_TIMER_CONFIG)}
                              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-amber-300 cursor-pointer"
                            >
                              ⚖️ {lang === 'vi' ? 'Chuẩn' : 'Standard'}
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
                              🐢 {lang === 'vi' ? 'Thư thả' : 'Relaxed'}
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                          <label className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-lg px-2 py-1">
                            <span className="text-slate-300 font-semibold">
                              🌙 {lang === 'vi' ? 'Đêm:' : 'Night:'}
                            </span>
                            <input
                              type="number"
                              min={5}
                              max={120}
                              value={effectiveTimer.nightActionSec}
                              onChange={(e) => {
                                const v = parseInt(e.target.value, 10);
                                if (!Number.isNaN(v)) {
                                  handleChangeTimers({
                                    ...timerConfig,
                                    nightActionSec: Math.max(5, Math.min(120, v)),
                                  });
                                }
                              }}
                              className="w-12 text-center bg-slate-950 border border-slate-700 rounded py-0.5 font-mono font-bold text-amber-300"
                            />
                          </label>
                          <label className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-lg px-2 py-1">
                            <span className="text-slate-300 font-semibold">
                              ☀️ {lang === 'vi' ? 'Thảo luận:' : 'Debate:'}
                            </span>
                            <input
                              type="number"
                              min={10}
                              max={300}
                              value={effectiveTimer.dayDiscussSec}
                              onChange={(e) => {
                                const v = parseInt(e.target.value, 10);
                                if (!Number.isNaN(v)) {
                                  handleChangeTimers({
                                    ...timerConfig,
                                    dayDiscussSec: Math.max(10, Math.min(300, v)),
                                  });
                                }
                              }}
                              className="w-12 text-center bg-slate-950 border border-slate-700 rounded py-0.5 font-mono font-bold text-amber-300"
                            />
                          </label>
                          <label className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-lg px-2 py-1">
                            <span className="text-slate-300 font-semibold">
                              ⚖️ {lang === 'vi' ? 'Bỏ phiếu:' : 'Vote:'}
                            </span>
                            <input
                              type="number"
                              min={10}
                              max={180}
                              value={effectiveTimer.dayVoteSec}
                              onChange={(e) => {
                                const v = parseInt(e.target.value, 10);
                                if (!Number.isNaN(v)) {
                                  handleChangeTimers({
                                    ...timerConfig,
                                    dayVoteSec: Math.max(10, Math.min(180, v)),
                                  });
                                }
                              }}
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
                  disabled={!isHost || isHostSyncing}
                  onClick={handleStartOnlineClick}
                  className={`w-full py-3.5 rounded-2xl font-extrabold text-xs sm:text-sm shadow-xl flex items-center justify-center gap-2 ${
                    isHost && !isHostSyncing
                      ? 'bg-rose-600 hover:bg-rose-500 text-white cursor-pointer'
                      : 'bg-slate-800 text-slate-400 border border-slate-700 cursor-not-allowed'
                  }`}
                >
                  {isHost && !isHostSyncing ? (
                    <Play className="w-4 h-4 fill-white" />
                  ) : isHostSyncing ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Lock className="w-4 h-4" />
                  )}
                  <span>
                    {isHostSyncing
                      ? lang === 'vi'
                        ? 'Đang đồng bộ phòng với máy chủ...'
                        : 'Syncing room with server...'
                      : isHost
                      ? t.startOnlineMatchBtn(participants.length, activeRoomCode)
                      : lang === 'vi'
                      ? 'Đang chờ Chủ phòng bắt đầu ván đấu...'
                      : 'Waiting for Host to start the match...'}
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
                      🃏 {lang === 'vi' ? 'Không có bộ bài ngoài đời' : 'No physical deck (Virtual)'}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                      {lang === 'vi'
                        ? 'App chia vai tự động. Người chơi vào mã phòng chỉ thấy duy nhất vai trò của riêng mình.'
                        : 'App deals balanced roles. Players join with the room code and see ONLY their own role.'}
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
                      🎴 {lang === 'vi' ? 'Đã có bộ bài giấy ngoài đời' : 'Have physical deck'}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                      {lang === 'vi'
                        ? 'Người chơi tự nhập lá bài mình bốc trước trận đấu, hoặc Quản Trò nhập hộ trực tiếp.'
                        : 'Players submit their own drawn card before match starts, or GM enters it for them.'}
                    </p>
                  </button>
                </div>

                <div className="bg-[#070a14] border border-slate-800 rounded-2xl p-3.5 text-xs text-slate-300 space-y-1.5 leading-relaxed">
                  <p className="font-bold text-amber-300">
                    {lang === 'vi'
                      ? 'Chế độ hỗ trợ chơi ngoài đời (tách biệt hoàn toàn với game 3D Online/Bot):'
                      : 'Real-life companion mode (completely isolated from 3D Online/Bot matches):'}
                  </p>
                  <p>
                    {lang === 'vi'
                      ? `1. Quản Trò mở bảng điều khiển phòng ${createdRoomId} để gọi đêm, ghi nhớ Bảo Vệ/Phù Thủy/Sói Con.`
                      : `1. GM opens room ${createdRoomId} to track nights, potions, lovers, and wolf pup frenzy.`}
                  </p>
                  <p>
                    {lang === 'vi'
                      ? `2. Người chơi nhập mã ${createdRoomId} ở tab "Vào Phòng" — chỉ xem được mỗi vai trò của mình hoặc tự nhập bài trước khi bắt đầu.`
                      : `2. Players enter ${createdRoomId} in "Join Room" to view ONLY their own secret role or enter their physical card.`}
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
                    {lang === 'vi' ? 'Phòng Online đang mở trên máy chủ:' : 'Open Online rooms on server:'}
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
                    <span>{lang === 'vi' ? 'Làm mới' : 'Refresh'}</span>
                  </button>
                </div>

                {openRooms.length === 0 ? (
                  <p className="text-[11px] text-slate-500 py-2 text-center">
                    {lang === 'vi'
                      ? 'Chưa có phòng nào đang mở. Hãy tạo phòng mới hoặc nhập mã từ bạn bè!'
                      : 'No open rooms yet. Create one or enter a friend’s room code!'}
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
                                ({lang === 'vi' ? 'Đang chơi' : 'In match'})
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
                          {lang === 'vi' ? 'Vào ngay' : 'Join'}
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
                    {lang === 'vi' ? 'Phòng Quản Trò đang mở:' : 'Active GM rooms on server:'}
                  </span>
                  <button
                    type="button"
                    onClick={fetchOpenGMRooms}
                    className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-amber-300 flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>{lang === 'vi' ? 'Làm mới' : 'Refresh'}</span>
                  </button>
                </div>

                {openGMRooms.length === 0 ? (
                  <p className="text-[11px] text-slate-500 py-2 text-center">
                    {lang === 'vi'
                      ? 'Chưa có phòng Quản Trò nào đang mở. Hãy tạo phòng hoặc nhập mã từ Quản Trò!'
                      : 'No active GM rooms yet. Create one or enter your Game Master’s code!'}
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
                              ? lang === 'vi'
                                ? '🎴 Bài giấy'
                                : '🎴 Physical'
                              : lang === 'vi'
                              ? '🃏 Chia bài ảo'
                              : '🃏 Virtual'}{' '}
                            · {r.claimedCount}/{r.playerCount}
                          </span>
                        </div>
                        <button
                          type="button"
                          disabled={isJoining}
                          onClick={() => handleJoinRoomSubmit(r.code)}
                          className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-bold text-[11px] cursor-pointer"
                        >
                          {lang === 'vi' ? 'Vào ngay' : 'Join'}
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
                      ? lang === 'vi'
                        ? 'Đang vào phòng...'
                        : 'Joining room...'
                      : t.joinOnlineBtn}
                  </span>
                </>
              ) : (
                <>
                  <Smartphone className="w-4 h-4" />
                  <span>
                    {isJoining
                      ? lang === 'vi'
                        ? 'Đang kiểm tra mã phòng...'
                        : 'Checking room...'
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

