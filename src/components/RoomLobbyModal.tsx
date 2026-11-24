import React, { useState, useEffect, useRef } from 'react';
import {
  Users,
  Plus,
  LogIn,
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
} from 'lucide-react';
import { RoleId, Language } from '../types/game';
import { ROLES } from '../game/roles';
import { CustomTimerConfig, DEFAULT_TIMER_CONFIG } from '../game/autoGM';
import { UI_TEXT } from '../utils/i18n';
import { sound } from '../utils/sound';
import { realtimeClient } from '../utils/realtimeClient';
import type { OpenRoomSummary, RealtimeRoomState } from '../server/realtimeRooms';
import type { GMDeckMode } from '../server/gmRooms';

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
    participants: LobbyParticipant[]
  ) => void;
  onLaunchGMHost: (roomId: string, size: number, deckMode: GMDeckMode) => void;
  onLaunchGMPlayerCard: (roomId: string) => void;
}

export const RoomLobbyModal: React.FC<RoomLobbyModalProps> = ({
  isOpen,
  lang,
  initialMode,
  currentUser,
  villageSize,
  preferredRole,
  timerConfig = DEFAULT_TIMER_CONFIG,
  onChangeTimerConfig,
  onChangeVillageSize,
  onChangePreferredRole,
  onClose,
  onLaunchOnlineRoom,
  onLaunchGMHost,
  onLaunchGMPlayerCard,
}) => {
  const [modeTab, setModeTab] = useState<'online' | 'gm'>(initialMode);
  const [actionTab, setActionTab] = useState<'create' | 'join'>('create');
  const [createdRoomId, setCreatedRoomId] = useState<string>(() =>
    (initialMode === 'online' ? 'ONL-' : 'GM-') + Math.floor(1000 + Math.random() * 9000)
  );
  const [joinCodeInput, setJoinCodeInput] = useState<string>('');
  const [joinError, setJoinError] = useState<string>('');
  const [lobbyNotice, setLobbyNotice] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [wsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const [liveRoom, setLiveRoom] = useState<RealtimeRoomState | null>(null);
  const [openRooms, setOpenRooms] = useState<OpenRoomSummary[]>([]);
  const [gmDeckMode, setGmDeckMode] = useState<GMDeckMode>('virtual_deck');

  const launchedRef = useRef(false);
  const t = UI_TEXT[lang];

  // Reset modal session when opening
  useEffect(() => {
    if (!isOpen) return;
    launchedRef.current = false;
    setModeTab(initialMode);
    setActionTab('create');
    const prefix = initialMode === 'online' ? 'ONL-' : 'GM-';
    setCreatedRoomId(prefix + Math.floor(1000 + Math.random() * 9000));
    setLobbyNotice('');
    setJoinError('');
    setLiveRoom(null);
  }, [initialMode, isOpen]);

  // Subscribe to real WebSocket room events while open (Online 3D mode only)
  useEffect(() => {
    if (!isOpen || modeTab !== 'online') return;

    const unsubStatus = realtimeClient.subscribeStatus(setWsStatus);
    const unsubEvents = realtimeClient.subscribe((evt) => {
      if (evt.type === 'room:list') {
        setOpenRooms(evt.rooms);
      } else if (evt.type === 'room:state') {
        setLiveRoom(evt.room);
        setCreatedRoomId(evt.room.code);
        setJoinError('');
      } else if (evt.type === 'room:kicked' && evt.targetId === currentUser.id) {
        setLiveRoom(null);
        setLobbyNotice(evt.reason);
      } else if (evt.type === 'room:match_started' && !launchedRef.current) {
        launchedRef.current = true;
        sound.playNightBell();
        const mapped: LobbyParticipant[] = evt.room.participants.map((p) => ({
          id: p.id,
          name: p.name,
          avatar: p.avatar,
          isBot: Boolean(p.isBot),
          isHost: p.isHost,
        }));
        onLaunchOnlineRoom(evt.room.code, Math.max(4, mapped.length), mapped);
      } else if (evt.type === 'error') {
        setJoinError(evt.message);
        setLobbyNotice(evt.message);
      }
    });

    realtimeClient.requestRoomList();

    return () => {
      unsubStatus();
      unsubEvents();
    };
  }, [isOpen, modeTab, currentUser.id, onLaunchOnlineRoom]);

  // Automatically create/join the online room on the WebSocket server when on Create tab in Online mode
  useEffect(() => {
    if (!isOpen || modeTab !== 'online' || actionTab !== 'create') return;
    if (!createdRoomId.startsWith('ONL-')) return;
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
    });
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
  const isHost = !liveRoom || liveRoom.hostId === currentUser.id;
  const effectiveSize = liveRoom ? liveRoom.villageSize : villageSize;
  const botCount = participants.filter((p) => p.isBot).length;
  const humanCount = participants.length - botCount;

  const handleCloseModal = () => {
    if (liveRoom && !launchedRef.current) {
      realtimeClient.leaveRoom(liveRoom.code, currentUser.id);
    }
    onClose();
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
    const clamped = Math.max(4, Math.min(20, nextSize));
    onChangeVillageSize(clamped);
    if (modeTab === 'online' && isHost) {
      realtimeClient.updateConfig(activeRoomCode, currentUser.id, { villageSize: clamped });
    }
  };

  const handleChangeTimers = (next: CustomTimerConfig) => {
    onChangeTimerConfig?.(next);
    if (modeTab === 'online' && isHost) {
      realtimeClient.updateConfig(activeRoomCode, currentUser.id, { timerConfig: next });
    }
  };

  const handleAddOneBot = () => {
    if (!isHost || participants.length >= effectiveSize) return;
    sound.playCardFlip();
    realtimeClient.addBot(activeRoomCode, currentUser.id);
    setLobbyNotice('');
  };

  const handleFillRemainingWithBots = () => {
    if (!isHost) return;
    sound.playCardFlip();
    realtimeClient.fillBots(activeRoomCode, currentUser.id);
    setLobbyNotice('');
  };

  const handleKickParticipant = (targetId: string) => {
    if (!isHost) return;
    sound.playCardFlip();
    realtimeClient.kickParticipant(activeRoomCode, currentUser.id, targetId);
  };

  const handleStartOnlineClick = () => {
    if (participants.length < 4) {
      setLobbyNotice(t.minPlayersWarning(participants.length));
      return;
    }
    if (!isHost) {
      setLobbyNotice(
        lang === 'vi'
          ? 'Đang chờ Chủ phòng bấm Bắt đầu ván đấu...'
          : 'Waiting for the Room Host to start the match...'
      );
      return;
    }
    realtimeClient.startMatch(activeRoomCode, currentUser.id);
  };

  const handleJoinRoomSubmit = (overrideCode?: string) => {
    const clean = (overrideCode ?? joinCodeInput).trim().toUpperCase();
    if (!clean || clean.length < 3) {
      setJoinError(lang === 'vi' ? 'Nhập mã phòng hợp lệ (VD: ONL-4821)' : 'Enter a valid room code');
      return;
    }
    sound.playCardFlip();
    if (modeTab === 'online' || clean.startsWith('ONL')) {
      setModeTab('online');
      setJoinError('');
      setActionTab('create');
      setCreatedRoomId(clean);
      realtimeClient.createOrJoinRoom({
        code: clean,
        user: {
          id: currentUser.id,
          name: currentUser.name,
          avatar: currentUser.avatar,
          elo: currentUser.elo,
        },
        createIfMissing: false,
      });
    } else {
      onLaunchGMPlayerCard(clean);
    }
  };

  return (
    <div
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
              setModeTab('online');
              setLiveRoom(null);
              setCreatedRoomId('ONL-' + Math.floor(1000 + Math.random() * 9000));
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
              if (liveRoom) realtimeClient.leaveRoom(liveRoom.code, currentUser.id);
              setLiveRoom(null);
              setModeTab('gm');
              setCreatedRoomId('GM-' + Math.floor(1000 + Math.random() * 9000));
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

        {/* Action Sub-Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                sound.playCardFlip();
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
              onClick={() => {
                sound.playCardFlip();
                setActionTab('join');
                setJoinError('');
                realtimeClient.requestRoomList();
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
        </div>

        {/* CREATE / ROOM LOBBY CONTENT */}
        {actionTab === 'create' ? (
          <div className="space-y-3.5">
            {/* Room Code + Size Banner */}
            <div className="bg-[#070a14] border border-amber-500/40 rounded-2xl p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  {t.yourRoomCodeLabel}
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

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block mb-1">
                  {t.maxSeatsLabel(effectiveSize)}
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {[6, 8, 10, 12].map((cnt) => (
                    <button
                      key={cnt}
                      type="button"
                      disabled={!isHost}
                      onClick={() => handleChangeSize(cnt)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-extrabold border cursor-pointer disabled:opacity-50 ${
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
                      disabled={!isHost || effectiveSize <= 4}
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
                      disabled={!isHost}
                      data-testid="lobby-custom-size-input"
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
                      disabled={!isHost || effectiveSize >= 20}
                      onClick={() => handleChangeSize(effectiveSize + 1)}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 cursor-pointer"
                      aria-label="Increase player count"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {modeTab === 'online' ? (
              <>
                <div className="bg-[#070a14] border border-slate-800 rounded-2xl p-3.5 sm:p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs font-bold text-slate-200 flex flex-wrap items-center gap-1.5">
                      <Users className="w-4 h-4 text-rose-400" />
                      <span>{t.roomListHeader(participants.length, effectiveSize)}</span>
                      <span className="px-2 py-0.5 rounded-md bg-emerald-950/90 border border-emerald-500/40 text-[10px] text-emerald-300">
                        {t.humanCountBadge(humanCount)}
                      </span>
                      {botCount > 0 && (
                        <span className="px-2 py-0.5 rounded-md bg-sky-950/90 border border-sky-500/40 text-[10px] text-sky-300">
                          {t.botCountBadge(botCount)}
                        </span>
                      )}
                    </div>

                    {isHost && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={handleAddOneBot}
                          disabled={participants.length >= effectiveSize}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-[11px] font-bold text-sky-300 flex items-center gap-1 cursor-pointer"
                        >
                          <Bot className="w-3.5 h-3.5" />
                          <span>{t.addOneBotBtn}</span>
                        </button>
                        <button
                          type="button"
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
                    {lang === 'vi'
                      ? `Gửi mã ${activeRoomCode} cho bạn bè ở thiết bị khác nhập tại tab "Vào Phòng" để cùng chơi trực tuyến thời gian thực.`
                      : `Share code ${activeRoomCode} with friends on other devices to join this live WebSocket room.`}
                  </p>

                  {lobbyNotice && (
                    <div className="px-3 py-2 rounded-xl bg-amber-950/60 border border-amber-500/50 text-xs text-amber-200 font-semibold">
                      {lobbyNotice}
                    </div>
                  )}

                  {/* Real-time Synchronized Seats Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {Array.from({ length: effectiveSize }).map((_, i) => {
                      const peer = participants[i];
                      return (
                        <div
                          key={peer ? peer.id : `empty_${i}`}
                          className={`p-2 rounded-xl border text-xs flex items-center justify-between gap-1.5 ${
                            peer
                              ? peer.isBot
                                ? 'bg-[#0f172a] border-sky-500/40 text-slate-100 font-bold'
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

                  {/* Role Preference & Phase Timers */}
                  <div className="pt-2 border-t border-slate-800 space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs text-slate-300 font-semibold">
                        {t.preferredRoleLobby}
                      </span>
                      <select
                        value={preferredRole}
                        onChange={(e) =>
                          onChangePreferredRole(e.target.value as RoleId | 'random')
                        }
                        className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold text-amber-200"
                      >
                        <option value="random">{t.randomBalancedRole}</option>
                        {Object.values(ROLES).map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name[lang]} ({r.badge})
                          </option>
                        ))}
                      </select>
                    </div>

                    {onChangeTimerConfig && isHost && (
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

                        <div className="grid grid-cols-3 gap-2 text-[11px]">
                          <label className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-lg px-2 py-1">
                            <span className="text-slate-300 font-semibold">
                              🌙 {lang === 'vi' ? 'Đêm:' : 'Night:'}
                            </span>
                            <input
                              type="number"
                              min={5}
                              max={120}
                              value={timerConfig.nightActionSec}
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
                              value={timerConfig.dayDiscussSec}
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
                              value={timerConfig.dayVoteSec}
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
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleStartOnlineClick}
                  className="w-full py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs sm:text-sm shadow-xl flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>
                    {isHost
                      ? t.startOnlineMatchBtn(participants.length, activeRoomCode)
                      : lang === 'vi'
                      ? 'Đang chờ Chủ phòng bắt đầu...'
                      : 'Waiting for Host to start...'}
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
              <label className="text-xs font-bold text-amber-300 block">
                {t.enterRoomCodeLabel}
              </label>
              <input
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
              {joinError && <p className="text-xs text-rose-400 font-semibold">{joinError}</p>}
            </div>

            {modeTab === 'online' && (
              <div className="bg-[#070a14] border border-slate-800 rounded-2xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-300">
                    {lang === 'vi' ? 'Phòng đang mở trên máy chủ:' : 'Open rooms on server:'}
                  </span>
                  <button
                    type="button"
                    onClick={() => realtimeClient.requestRoomList()}
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
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {openRooms.map((r) => (
                      <div
                        key={r.code}
                        className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs"
                      >
                        <div>
                          <span className="font-mono font-black text-amber-300">{r.code}</span>
                          <span className="text-slate-400 ml-2">
                            {r.hostName} · {r.playerCount}/{r.villageSize}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleJoinRoomSubmit(r.code)}
                          className="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-[11px] cursor-pointer"
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
              onClick={() => handleJoinRoomSubmit()}
              className="w-full py-3.5 rounded-2xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-extrabold text-xs sm:text-sm shadow-xl flex items-center justify-center gap-2 cursor-pointer"
            >
              {modeTab === 'online' ? (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>{t.joinOnlineBtn}</span>
                </>
              ) : (
                <>
                  <Smartphone className="w-4 h-4" />
                  <span>{t.joinGMCardBtn}</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
