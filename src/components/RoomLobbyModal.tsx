import React, { useState, useEffect } from 'react';
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
  UserPlus,
  Sparkles,
  Globe,
  Trash2,
  Bot,
  Minus,
} from 'lucide-react';
import { RoleId, Language } from '../types/game';
import { ROLES } from '../game/roles';
import { UI_TEXT } from '../utils/i18n';
import { sound } from '../utils/sound';

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
  onChangeVillageSize: (size: number) => void;
  onChangePreferredRole: (role: RoleId | 'random') => void;
  onClose: () => void;
  onLaunchOnlineRoom: (
    roomId: string,
    size: number,
    participants: LobbyParticipant[]
  ) => void;
  onLaunchGMHost: (roomId: string, size: number) => void;
  onLaunchGMPlayerCard: (roomId: string) => void;
}

const AI_BOT_CANDIDATES = [
  { name: 'Đức Huy', avatar: '🦊' },
  { name: 'Thảo My', avatar: '🔮' },
  { name: 'Minh Hoàng', avatar: '🛡️' },
  { name: 'Tuấn Kiệt', avatar: '🧪' },
  { name: 'Bảo Châu', avatar: '🎯' },
  { name: 'Quỳnh Anh', avatar: '💘' },
  { name: 'Hữu Phước', avatar: '🎭' },
  { name: 'Kim Ngân', avatar: '👑' },
  { name: 'Gia Bảo', avatar: '🔥' },
  { name: 'Phương Linh', avatar: '🌙' },
  { name: 'Hải Đăng', avatar: '⚡' },
  { name: 'Thanh Trúc', avatar: '🍀' },
  { name: 'Khánh Duy', avatar: '🗡️' },
  { name: 'Ngọc Ánh', avatar: '🌸' },
  { name: 'Hoàng Nam', avatar: '🦅' },
  { name: 'Trúc Lam', avatar: '🎐' },
  { name: 'Nhật Minh', avatar: '☀️' },
  { name: 'Thiên Kim', avatar: '💎' },
  { name: 'Anh Tuấn', avatar: '🦁' },
];

const HUMAN_AVATARS = ['🧑', '👩', '🧔', '👱‍♀️', '🕵️', '🧙‍♂️', '🧝‍♀️', '🧛'];

export const RoomLobbyModal: React.FC<RoomLobbyModalProps> = ({
  isOpen,
  lang,
  initialMode,
  currentUser,
  villageSize,
  preferredRole,
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
  const [inviteNameInput, setInviteNameInput] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  const t = UI_TEXT[lang];

  // Online Room starts cleanly with ONLY the Host (0 bots by default!)
  const [participants, setParticipants] = useState<LobbyParticipant[]>(() => [
    {
      id: currentUser.id,
      name: currentUser.name,
      avatar: currentUser.avatar,
      isBot: false,
      isHost: true,
    },
  ]);

  useEffect(() => {
    setModeTab(initialMode);
    const prefix = initialMode === 'online' ? 'ONL-' : 'GM-';
    setCreatedRoomId(prefix + Math.floor(1000 + Math.random() * 9000));
    setLobbyNotice('');
    setJoinError('');
    setParticipants([
      {
        id: currentUser.id,
        name: currentUser.name,
        avatar: currentUser.avatar,
        isBot: false,
        isHost: true,
      },
    ]);
  }, [initialMode, isOpen, currentUser.id, currentUser.name, currentUser.avatar]);

  useEffect(() => {
    setParticipants((prev) => (prev.length > villageSize ? prev.slice(0, villageSize) : prev));
  }, [villageSize]);

  useEffect(() => {
    if (!isOpen) return;
    try {
      localStorage.setItem(
        `online_room_${createdRoomId}`,
        JSON.stringify({
          roomId: createdRoomId,
          villageSize,
          participants,
        })
      );
    } catch {
      // ignore storage errors
    }

    if (typeof BroadcastChannel === 'undefined') return;
    const channel = new BroadcastChannel('werewolf_3d_lobby');
    channel.onmessage = (ev) => {
      const data = ev.data;
      if (data && data.type === 'PEER_JOINED' && data.roomId === createdRoomId) {
        setParticipants((prev) => {
          if (prev.some((p) => p.name === data.peerName) || prev.length >= villageSize) {
            return prev;
          }
          return [
            ...prev,
            {
              id: `peer_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
              name: data.peerName,
              avatar: data.peerAvatar || '🧑',
              isBot: false,
            },
          ];
        });
        setLobbyNotice(`🎉 "${data.peerName}" joined!`);
      }
    };
    return () => channel.close();
  }, [isOpen, createdRoomId, villageSize, participants]);

  if (!isOpen) return null;

  const handleCopyCode = () => {
    sound.playCardFlip();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(createdRoomId).catch(() => {});
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddHumanPlayer = () => {
    const cleanName = inviteNameInput.trim();
    if (!cleanName || participants.length >= villageSize) return;
    if (participants.some((p) => p.name.toLowerCase() === cleanName.toLowerCase())) return;
    sound.playCardFlip();
    const nextAvatar = HUMAN_AVATARS[participants.length % HUMAN_AVATARS.length];
    setParticipants((prev) => [
      ...prev,
      {
        id: `human_${Date.now()}_${prev.length}`,
        name: cleanName,
        avatar: nextAvatar,
        isBot: false,
      },
    ]);
    setInviteNameInput('');
    setLobbyNotice('');
  };

  const handleAddOneBot = () => {
    if (participants.length >= villageSize) return;
    sound.playCardFlip();
    const candidate = AI_BOT_CANDIDATES.find(
      (c) => !participants.some((p) => p.name === c.name)
    ) || {
      name: `Bot #${participants.length}`,
      avatar: '🤖',
    };
    setParticipants((prev) => [
      ...prev,
      {
        id: `bot_${Date.now()}_${prev.length}`,
        name: candidate.name,
        avatar: candidate.avatar,
        isBot: true,
      },
    ]);
    setLobbyNotice('');
  };

  const handleFillRemainingWithBots = () => {
    sound.playCardFlip();
    const updated = [...participants];
    for (const c of AI_BOT_CANDIDATES) {
      if (updated.length >= villageSize) break;
      if (!updated.some((p) => p.name === c.name)) {
        updated.push({
          id: `bot_${Date.now()}_${updated.length}`,
          name: c.name,
          avatar: c.avatar,
          isBot: true,
        });
      }
    }
    setParticipants(updated);
    setLobbyNotice('');
  };

  const handleRemoveParticipant = (targetId: string) => {
    sound.playCardFlip();
    setParticipants((prev) => prev.filter((p) => p.id !== targetId || p.isHost));
    setLobbyNotice('');
  };

  const handleClearAllBots = () => {
    sound.playCardFlip();
    setParticipants((prev) => prev.filter((p) => !p.isBot || p.isHost));
    setLobbyNotice('');
  };

  const handleStartOnlineClick = () => {
    if (participants.length < 4) {
      setLobbyNotice(t.minPlayersWarning(participants.length));
      return;
    }
    sound.playNightBell();
    onLaunchOnlineRoom(createdRoomId, participants.length, participants);
  };

  const handleJoinRoomSubmit = () => {
    const clean = joinCodeInput.trim().toUpperCase();
    if (!clean || clean.length < 3) {
      setJoinError('ONL-4821 / GM-5920');
      return;
    }
    sound.playNightBell();
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        const ch = new BroadcastChannel('werewolf_3d_lobby');
        ch.postMessage({
          type: 'PEER_JOINED',
          roomId: clean,
          peerName: currentUser.name,
          peerAvatar: currentUser.avatar,
        });
        ch.close();
      } catch {
        // ignore
      }
    }

    if (modeTab === 'online' || clean.startsWith('ONL')) {
      try {
        const saved = localStorage.getItem(`online_room_${clean}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed.participants) && parsed.participants.length > 0) {
            const list: LobbyParticipant[] = parsed.participants;
            if (!list.some((p) => p.id === currentUser.id)) {
              list.push({
                id: currentUser.id,
                name: currentUser.name,
                avatar: currentUser.avatar,
                isBot: false,
              });
            }
            onLaunchOnlineRoom(clean, Math.max(4, list.length), list);
            return;
          }
        }
      } catch {
        // ignore
      }
      const fallbackList: LobbyParticipant[] = [
        {
          id: currentUser.id,
          name: currentUser.name,
          avatar: currentUser.avatar,
          isBot: false,
          isHost: true,
        },
        ...AI_BOT_CANDIDATES.slice(0, 5).map((c, idx) => ({
          id: `peer_${idx + 1}`,
          name: c.name,
          avatar: c.avatar,
          isBot: false,
        })),
      ];
      onLaunchOnlineRoom(clean, fallbackList.length, fallbackList);
    } else {
      onLaunchGMPlayerCard(clean);
    }
  };

  const botCount = participants.filter((p) => p.isBot).length;
  const humanCount = participants.length - botCount;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-5 pointer-events-auto"
      style={{ backgroundColor: 'rgba(4, 7, 15, 0.88)' }}
      data-testid="room-lobby-modal"
    >
      <div className="w-full max-w-2xl bg-[#0b1120] border-2 border-amber-500/60 rounded-3xl p-4 sm:p-6 shadow-2xl space-y-3.5 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-400">
              {modeTab === 'online' ? (
                <Globe className="w-5 h-5" />
              ) : (
                <Shield className="w-5 h-5" />
              )}
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-bold block">
                {t.lobbyBadge}
              </span>
              <h3 className="text-sm sm:text-lg font-black text-slate-100">
                {modeTab === 'online' ? t.lobbyOnlineTitle : t.lobbyGMTitle}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Switcher: Online 3D vs GM Assistant */}
        <div className="grid grid-cols-2 gap-2 bg-[#070a14] p-1.5 rounded-2xl border border-slate-800">
          <button
            type="button"
            onClick={() => {
              sound.playCardFlip();
              setModeTab('online');
              setCreatedRoomId('ONL-' + Math.floor(1000 + Math.random() * 9000));
            }}
            className={`py-2.5 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer ${
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
              setModeTab('gm');
              setCreatedRoomId('GM-' + Math.floor(1000 + Math.random() * 9000));
            }}
            className={`py-2.5 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer ${
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
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
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

        {/* CREATE ROOM CONTENT */}
        {actionTab === 'create' ? (
          <div className="space-y-3.5">
            {/* Room Code Display Banner */}
            <div className="bg-[#070a14] border border-amber-500/40 rounded-2xl p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  {t.yourRoomCodeLabel}
                </span>
                <div className="flex items-center gap-2.5 mt-1">
                  <span className="text-xl sm:text-2xl font-mono font-black text-amber-300 tracking-widest">
                    {createdRoomId}
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

              {/* Village Size Picker (Presets + Custom 4..20 Stepper) */}
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block mb-1">
                  {t.maxSeatsLabel(villageSize)}
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {[6, 8, 10, 12].map((cnt) => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => onChangeVillageSize(cnt)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-extrabold border cursor-pointer ${
                        villageSize === cnt
                          ? 'bg-amber-500 text-slate-950 border-amber-400'
                          : 'bg-slate-900 text-slate-300 border-slate-700'
                      }`}
                    >
                      {cnt}
                    </button>
                  ))}

                  {/* Custom Player Count Stepper */}
                  <div className="flex items-center gap-1 bg-slate-900 border border-amber-500/40 rounded-lg px-1.5 py-1">
                    <button
                      type="button"
                      data-testid="lobby-custom-size-dec"
                      disabled={villageSize <= 4}
                      onClick={() => onChangeVillageSize(Math.max(4, villageSize - 1))}
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
                      value={villageSize}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!Number.isNaN(val)) {
                          onChangeVillageSize(Math.max(4, Math.min(20, val)));
                        }
                      }}
                      className="w-10 text-center bg-slate-950 border border-slate-700 rounded py-0.5 text-xs font-mono font-extrabold text-amber-300 focus:outline-none focus:border-amber-400"
                    />
                    <button
                      type="button"
                      data-testid="lobby-custom-size-inc"
                      disabled={villageSize >= 20}
                      onClick={() => onChangeVillageSize(Math.min(20, villageSize + 1))}
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
                  {/* Top Bar: Counts + Optional Bot Helpers */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs font-bold text-slate-200 flex flex-wrap items-center gap-1.5">
                      <Users className="w-4 h-4 text-rose-400" />
                      <span>{t.roomListHeader(participants.length, villageSize)}</span>
                      <span className="px-2 py-0.5 rounded-md bg-emerald-950/90 border border-emerald-500/40 text-[10px] text-emerald-300">
                        {t.humanCountBadge(humanCount)}
                      </span>
                      {botCount > 0 && (
                        <span className="px-2 py-0.5 rounded-md bg-sky-950/90 border border-sky-500/40 text-[10px] text-sky-300">
                          {t.botCountBadge(botCount)}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handleAddOneBot}
                        disabled={participants.length >= villageSize}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-[11px] font-bold text-sky-300 flex items-center gap-1 cursor-pointer"
                      >
                        <Bot className="w-3.5 h-3.5" />
                        <span>{t.addOneBotBtn}</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleFillRemainingWithBots}
                        disabled={participants.length >= villageSize}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-[11px] font-bold text-amber-300 flex items-center gap-1 cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{t.fillBotsBtn}</span>
                      </button>
                      {botCount > 0 && (
                        <button
                          type="button"
                          onClick={handleClearAllBots}
                          className="px-2.5 py-1 rounded-lg bg-rose-950/90 hover:bg-rose-900 border border-rose-500/50 text-[11px] font-bold text-rose-200 flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                          <span>{t.clearAllBotsBtn}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Direct Player Invite Input */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={inviteNameInput}
                      onChange={(e) => setInviteNameInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddHumanPlayer()}
                      placeholder={t.invitePlaceholder}
                      className="flex-1 bg-slate-950 border border-slate-700 focus:border-emerald-400 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none min-w-0"
                    />
                    <button
                      type="button"
                      onClick={handleAddHumanPlayer}
                      disabled={participants.length >= villageSize}
                      className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-extrabold text-xs flex items-center gap-1.5 shrink-0 cursor-pointer"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>{t.addHumanBtn}</span>
                    </button>
                  </div>

                  {lobbyNotice && (
                    <div className="px-3 py-2 rounded-xl bg-amber-950/60 border border-amber-500/50 text-xs text-amber-200 font-semibold">
                      {lobbyNotice}
                    </div>
                  )}

                  {/* Seats Grid with Individual Remove (Kick) Buttons */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {Array.from({ length: villageSize }).map((_, i) => {
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

                          {peer && !peer.isHost && (
                            <button
                              type="button"
                              onClick={() => handleRemoveParticipant(peer.id)}
                              aria-label={`Remove ${peer.name}`}
                              title={`Remove ${peer.name}`}
                              className="p-1 rounded-lg bg-rose-950/80 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 shrink-0 cursor-pointer transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Role Preference in Lobby */}
                  <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
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
                </div>

                <button
                  type="button"
                  onClick={handleStartOnlineClick}
                  className="w-full py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs sm:text-sm shadow-xl flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>{t.startOnlineMatchBtn(participants.length, createdRoomId)}</span>
                </button>
              </>
            ) : (
              /* GM ASSISTANT CREATE ROOM */
              <div className="space-y-4">
                <div className="bg-[#070a14] border border-slate-800 rounded-2xl p-4 text-xs text-slate-300 space-y-2 leading-relaxed">
                  <p className="font-bold text-amber-300">{t.gmGuideTitle}</p>
                  <p>{t.gmGuideStep1(createdRoomId)}</p>
                  <p>{t.gmGuideStep2(createdRoomId)}</p>
                </div>

                <button
                  type="button"
                  onClick={() => onLaunchGMHost(createdRoomId, villageSize)}
                  className="w-full py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs sm:text-sm shadow-xl flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Shield className="w-4 h-4" />
                  <span>{t.openGMPanelBtn(createdRoomId)}</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          /* JOIN EXISTING ROOM CONTENT */
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
              {joinError && (
                <p className="text-xs text-rose-400 font-semibold">{joinError}</p>
              )}
            </div>

            <button
              type="button"
              onClick={handleJoinRoomSubmit}
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
