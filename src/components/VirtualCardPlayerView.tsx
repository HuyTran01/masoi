import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Smartphone,
  Eye,
  EyeOff,
  Sparkles,
  Lock,
  CheckCircle2,
  User,
  Edit3,
  LogOut,
  RefreshCw,
  Shield,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { RoleId, Language } from '../types/game';
import { ROLES } from '../game/roles';
import { sound } from '../utils/sound';
import { realtimeClient } from '../utils/realtimeClient';
import type { GMRoomPlayerView, GMRoomSummary } from '../server/gmRooms';

interface VirtualCardPlayerViewProps {
  initialRoomId?: string;
  currentUser: { id: string; name: string; avatar: string };
  lang: Language;
}

const ROLE_ICONS: Record<RoleId, string> = {
  werewolf: '🐺',
  wolf_pup: '🔥',
  seer: '🔮',
  bodyguard: '🛡️',
  witch: '🧪',
  hunter: '🎯',
  cupid: '💘',
  tanner: '🎭',
  elder: '👑',
  doppelganger: '🪞',
  cursed: '🌓',
  traitor: '🗡️',
  villager: '🧑‍🌾',
};

function getOrCreateGMPlayerUid(): string {
  try {
    const existing = sessionStorage.getItem('werewolf_gm_player_uid');
    if (existing) return existing;
    const created = `gmp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
    sessionStorage.setItem('werewolf_gm_player_uid', created);
    return created;
  } catch {
    return `gmp_${Date.now().toString(36)}`;
  }
}

export const VirtualCardPlayerView: React.FC<VirtualCardPlayerViewProps> = ({
  initialRoomId,
  currentUser,
  lang,
}) => {
  const playerUid = useMemo(() => getOrCreateGMPlayerUid(), []);
  const [roomIdInput, setRoomIdInput] = useState<string>(() =>
    (initialRoomId || '').trim().toUpperCase()
  );
  const [playerNameInput, setPlayerNameInput] = useState<string>(() => {
    try {
      const saved = sessionStorage.getItem('werewolf_gm_player_name');
      if (saved && saved.trim()) return saved;
    } catch {
      // ignore
    }
    return '';
  });

  const [playerView, setPlayerView] = useState<GMRoomPlayerView | null>(null);
  const [openGMRooms, setOpenGMRooms] = useState<GMRoomSummary[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [statusNotice, setStatusNotice] = useState<string>('');
  const [isRevealed, setIsRevealed] = useState<boolean>(false);

  // Physical-card self-input state
  const [isEditingOwnRole, setIsEditingOwnRole] = useState<boolean>(false);
  const [pickedRoleId, setPickedRoleId] = useState<RoleId>('villager');
  const [isSavingRole, setIsSavingRole] = useState<boolean>(false);

  const isVi = lang === 'vi';

  const fetchOpenRooms = useCallback(async () => {
    try {
      const res = await fetch('/api/gm-rooms');
      const data = await res.json();
      if (data?.ok && Array.isArray(data.rooms)) {
        setOpenGMRooms(data.rooms);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchOpenRooms();
  }, [fetchOpenRooms]);

  const joinRoom = useCallback(
    async (rawCode: string, rawName?: string) => {
      const code = rawCode.trim().toUpperCase();
      const name = (rawName ?? playerNameInput).trim();
      if (code.length < 3) {
        setErrorMsg(
          isVi
            ? 'Vui lòng nhập mã phòng Quản Trò hợp lệ (VD: GM-4821).'
            : 'Please enter a valid GM room code (e.g. GM-4821).'
        );
        return;
      }
      if (!name) {
        setErrorMsg(
          isVi ? 'Vui lòng nhập tên của bạn trước khi vào phòng.' : 'Please enter your name.'
        );
        return;
      }

      setIsLoading(true);
      setErrorMsg('');
      setStatusNotice('');
      try {
        try {
          sessionStorage.setItem('werewolf_gm_player_name', name);
        } catch {
          // ignore
        }
        const res = await fetch(`/api/gm-rooms/${encodeURIComponent(code)}/join`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user: {
              id: playerUid,
              name,
              avatar: currentUser.avatar || '🐺',
            },
          }),
        });
        const data = await res.json();
        if (!res.ok || !data?.ok) {
          setErrorMsg(
            data?.error ||
              (isVi
                ? `Không tìm thấy phòng "${code}". Hãy kiểm tra lại mã từ Quản Trò.`
                : `GM room "${code}" not found. Check the code with your Game Master.`)
          );
          setIsLoading(false);
          return;
        }

        const view = data.view as GMRoomPlayerView;
        setRoomIdInput(view.code);
        setPlayerView(view);
        setIsRevealed(false);
        if (view.mySeat?.roleId) {
          setPickedRoleId(view.mySeat.roleId);
          setIsEditingOwnRole(false);
        } else if (view.canSelfInputRole) {
          setIsEditingOwnRole(true);
        }
        sound.playCardFlip();
      } catch {
        setErrorMsg(
          isVi
            ? 'Không thể kết nối máy chủ phòng Quản Trò. Vui lòng thử lại.'
            : 'Could not reach GM room server. Please try again.'
        );
      } finally {
        setIsLoading(false);
      }
    },
    [playerNameInput, playerUid, currentUser.avatar, isVi]
  );

  // Prefill room code if initialRoomId was passed in; only auto-join if player already saved their real-life name in this session
  useEffect(() => {
    if (initialRoomId && initialRoomId.trim().length >= 3 && !playerView) {
      const cleanCode = initialRoomId.trim().toUpperCase();
      setRoomIdInput(cleanCode);
      try {
        const savedName = sessionStorage.getItem('werewolf_gm_player_name');
        if (savedName && savedName.trim()) {
          joinRoom(cleanCode, savedName.trim());
        }
      } catch {
        // wait for user to enter their name
      }
    }
  }, [initialRoomId]);

  // Real-time WebSocket subscription for live updates ONLY for this player's own seat
  useEffect(() => {
    if (!playerView?.code) return;
    const roomCode = playerView.code;

    const unsub = realtimeClient.subscribe((evt) => {
      if (evt.type === 'gm:player_state' && evt.view.code === roomCode) {
        setPlayerView(evt.view);
        if (!evt.view.canSelfInputRole) {
          setIsEditingOwnRole(false);
        }
      }
    });

    realtimeClient.subscribeGMPlayer(roomCode, playerUid);

    return () => {
      unsub();
      realtimeClient.unsubscribeGM();
    };
  }, [playerView?.code, playerUid]);

  const handleSubmitSelfRole = async () => {
    if (!playerView?.code) return;
    setIsSavingRole(true);
    setErrorMsg('');
    setStatusNotice('');
    try {
      const res = await fetch(
        `/api/gm-rooms/${encodeURIComponent(playerView.code)}/self-role`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: playerUid,
            roleId: pickedRoleId,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        setErrorMsg(
          data?.error ||
            (isVi ? 'Không thể lưu lá bài của bạn.' : 'Could not save your card.')
        );
        return;
      }
      sound.playCardFlip();
      setPlayerView(data.view);
      setIsEditingOwnRole(false);
      setIsRevealed(false);
      setStatusNotice(
        isVi
          ? 'Đã gửi lá bài của bạn về bảng Quản Trò! Màn hình đã tự ẩn để chống nhìn trộm.'
          : 'Your card has been sent to the Game Master and hidden for privacy!'
      );
    } catch {
      setErrorMsg(
        isVi ? 'Lỗi kết nối khi lưu lá bài.' : 'Connection error while saving your role.'
      );
    } finally {
      setIsSavingRole(false);
    }
  };

  const handleRefreshMyCard = async () => {
    if (!playerView?.code) return;
    try {
      const res = await fetch(
        `/api/gm-rooms/${encodeURIComponent(playerView.code)}/player/${encodeURIComponent(playerUid)}`
      );
      const data = await res.json();
      if (data?.ok && data.view) {
        setPlayerView(data.view);
        sound.playCardFlip();
      }
    } catch {
      // ignore
    }
  };

  const handleLeaveRoom = () => {
    realtimeClient.unsubscribeGM();
    setPlayerView(null);
    setIsRevealed(false);
    setIsEditingOwnRole(false);
    setStatusNotice('');
    setErrorMsg('');
    fetchOpenRooms();
  };

  const mySeat = playerView?.mySeat || null;
  const myRoleDef = mySeat?.roleId ? ROLES[mySeat.roleId] : null;
  const showRoleInputUI = Boolean(
    playerView?.canSelfInputRole && (isEditingOwnRole || !mySeat?.roleId)
  );

  return (
    <div
      data-testid="gm-player-card-view"
      className="max-w-xl mx-auto space-y-5 text-slate-100 pb-8"
    >
      {/* JOIN FORM (Before entering a GM room) */}
      {!playerView ? (
        <div className="bg-[#0f172a] border border-amber-500/40 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-5">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-400 shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-amber-200">
                {isVi ? 'Thẻ Bài Cá Nhân — Phòng Quản Trò' : 'Personal Card — GM Room'}
              </h2>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                {isVi
                  ? 'Chỉ hiển thị duy nhất vai trò của riêng bạn. Nếu chơi ngoài đời không có bộ bài, Quản Trò sẽ chia bài về máy bạn; nếu đã có bài giấy, bạn có thể tự nhập lá bài mình bốc trước khi ván đấu bắt đầu.'
                  : 'Displays ONLY your own secret role. Play offline without a physical deck, or enter the physical card you drew before the match starts.'}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label
                htmlFor="gm-player-name-input"
                className="text-[11px] font-bold uppercase tracking-wider text-amber-300 block mb-1.5"
              >
                {isVi ? '1. Tên của bạn ngoài đời' : '1. Your Name'}
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="gm-player-name-input"
                  data-testid="gm-player-name-input"
                  type="text"
                  maxLength={32}
                  value={playerNameInput}
                  onChange={(e) => setPlayerNameInput(e.target.value)}
                  placeholder={isVi ? 'VD: Đức Huy, Thảo My...' : 'e.g. Alex'}
                  className="w-full bg-[#070a14] border border-slate-700 focus:border-amber-400 rounded-xl pl-9 pr-3 py-2.5 text-sm font-semibold text-slate-100 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="gm-player-room-code-input"
                className="text-[11px] font-bold uppercase tracking-wider text-amber-300 block mb-1.5"
              >
                {isVi ? '2. Mã Phòng từ Quản Trò' : '2. GM Room Code'}
              </label>
              <input
                id="gm-player-room-code-input"
                data-testid="gm-player-room-code-input"
                type="text"
                value={roomIdInput}
                onChange={(e) => {
                  setRoomIdInput(e.target.value.toUpperCase());
                  setErrorMsg('');
                }}
                onKeyDown={(e) => e.key === 'Enter' && joinRoom(roomIdInput)}
                placeholder="GM-4821"
                className="w-full bg-[#070a14] border border-slate-700 focus:border-amber-400 rounded-xl px-4 py-2.5 text-base font-mono font-black text-amber-200 uppercase tracking-widest focus:outline-none"
              />
            </div>

            {errorMsg && (
              <div
                role="alert"
                className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/50 text-xs text-rose-200 font-semibold flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="button"
              data-testid="gm-player-join-btn"
              disabled={isLoading}
              onClick={() => joinRoom(roomIdInput)}
              className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black text-sm shadow-lg cursor-pointer transition-colors"
            >
              {isLoading
                ? isVi
                  ? 'Đang kết nối...'
                  : 'Joining...'
                : isVi
                ? 'Vào Phòng & Nhận Thẻ Bài Của Tôi'
                : 'Join Room & Open My Card'}
            </button>
          </div>

          {/* Open GM Rooms List (Names/Codes ONLY, zero role info) */}
          {openGMRooms.length > 0 && (
            <div className="pt-3 border-t border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  {isVi ? 'Phòng Quản Trò đang mở:' : 'Active GM Rooms:'}
                </span>
                <button
                  type="button"
                  onClick={fetchOpenRooms}
                  className="text-[11px] font-bold text-amber-300 hover:text-amber-200 flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>{isVi ? 'Làm mới' : 'Refresh'}</span>
                </button>
              </div>
              <div className="space-y-1.5">
                {openGMRooms.map((room) => (
                  <div
                    key={room.code}
                    className="flex items-center justify-between bg-[#070a14] border border-slate-800 rounded-xl px-3 py-2 text-xs"
                  >
                    <div>
                      <span className="font-mono font-black text-amber-300">{room.code}</span>
                      <span className="text-slate-400 ml-2">
                        {room.deckMode === 'physical_cards'
                          ? isVi
                            ? '🎴 Có bài giấy (Tự nhập)'
                            : '🎴 Physical Deck'
                          : isVi
                          ? '🃏 Chia bài ảo'
                          : '🃏 Virtual Deck'}{' '}
                        · {room.claimedCount}/{room.playerCount}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => joinRoom(room.code)}
                      className="px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500 hover:text-slate-950 border border-amber-500/40 text-amber-200 font-bold text-[11px] cursor-pointer transition-colors"
                    >
                      {isVi ? 'Vào' : 'Join'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* JOINED GM ROOM — STRICTLY SINGLE-PLAYER OWN ROLE VIEW */
        <div className="space-y-4">
          {/* Compact Room & Seat Status Bar */}
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-lg">
                {mySeat?.avatar || '🐺'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span
                    data-testid="gm-player-seat-name"
                    className="text-sm font-black text-slate-100"
                  >
                    {mySeat ? `#${mySeat.seatNumber} ${mySeat.name}` : playerNameInput}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-slate-900 border border-amber-500/40 font-mono text-[10px] font-bold text-amber-300">
                    {playerView.code}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                  <Clock className="w-3 h-3 text-amber-400" />
                  <span>
                    {playerView.status === 'setup'
                      ? isVi
                        ? 'Đang chuẩn bị trước trận'
                        : 'Pre-game setup'
                      : isVi
                      ? `Ván đang diễn ra · Vòng ${playerView.round}`
                      : `Match in progress · Round ${playerView.round}`}
                  </span>
                  {mySeat && !mySeat.isAlive && (
                    <span className="text-rose-400 font-bold">
                      · {isVi ? 'Đã bị loại' : 'Eliminated'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleRefreshMyCard}
                className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 cursor-pointer"
                title={isVi ? 'Đồng bộ lại thẻ bài' : 'Refresh my card'}
                aria-label={isVi ? 'Đồng bộ lại thẻ bài' : 'Refresh my card'}
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleLeaveRoom}
                className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-slate-300 flex items-center gap-1 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{isVi ? 'Rời phòng' : 'Leave'}</span>
              </button>
            </div>
          </div>

          {statusNotice && (
            <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/50 text-xs text-emerald-200 font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{statusNotice}</span>
            </div>
          )}

          {errorMsg && (
            <div
              role="alert"
              className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/50 text-xs text-rose-200 font-semibold flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* PHYSICAL DECK SELF-INPUT PANEL (ONLY when deckMode === 'physical_cards' && status === 'setup') */}
          {showRoleInputUI ? (
            <div
              data-testid="gm-self-role-input-panel"
              className="bg-[#0f172a] border-2 border-amber-500/50 rounded-2xl p-5 shadow-2xl space-y-4"
            >
              <div className="space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-bold block">
                  {isVi ? '🎴 ĐÃ CÓ BÀI GIẤY NGOÀI ĐỜI' : '🎴 PHYSICAL DECK MODE'}
                </span>
                <h3 className="text-base sm:text-lg font-black text-slate-100">
                  {isVi
                    ? 'Nhập Lá Bài Bạn Vừa Bốc Trước Trận Đấu'
                    : 'Select the Physical Card You Drew'}
                </h3>
                <p className="text-xs text-slate-400">
                  {isVi
                    ? 'Chọn đúng vai trò trên lá bài giấy của bạn để đồng bộ về bảng Quản Trò (hoặc nhờ Quản Trò nhập hộ). Sau khi trận đấu bắt đầu sẽ khóa chỉnh sửa.'
                    : 'Choose the role on your physical card to sync with the Game Master (or let the GM enter it for you). Locked once the game starts.'}
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {Object.values(ROLES).map((role) => {
                  const isSelected = pickedRoleId === role.id;
                  return (
                    <button
                      key={role.id}
                      type="button"
                      data-testid={`self-role-option-${role.id}`}
                      onClick={() => {
                        sound.playCardFlip();
                        setPickedRoleId(role.id);
                      }}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2 ${
                        isSelected
                          ? 'bg-amber-500/20 border-amber-400 text-amber-100 shadow-md'
                          : 'bg-[#070a14] border-slate-800 text-slate-300 hover:border-slate-600'
                      }`}
                    >
                      <span className="text-lg shrink-0">{ROLE_ICONS[role.id]}</span>
                      <div className="min-w-0">
                        <div className="text-xs font-bold truncate">
                          {role.name[lang] || role.name.vi}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {role.faction === 'werewolf'
                            ? isVi
                              ? 'Phe Sói'
                              : 'Werewolf'
                            : role.faction === 'neutral'
                            ? isVi
                              ? 'Phe Thứ Ba'
                              : 'Neutral'
                            : isVi
                            ? 'Phe Dân'
                            : 'Villager'}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2 pt-2">
                {mySeat?.roleId && (
                  <button
                    type="button"
                    onClick={() => setIsEditingOwnRole(false)}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold cursor-pointer"
                  >
                    {isVi ? 'Hủy' : 'Cancel'}
                  </button>
                )}
                <button
                  type="button"
                  data-testid="gm-submit-self-role-btn"
                  disabled={isSavingRole}
                  onClick={handleSubmitSelfRole}
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black text-xs sm:text-sm shadow-lg cursor-pointer"
                >
                  {isSavingRole
                    ? isVi
                      ? 'Đang gửi...'
                      : 'Saving...'
                    : isVi
                    ? `Xác Nhận Vai Trò: ${ROLES[pickedRoleId].name.vi}`
                    : `Confirm My Role: ${ROLES[pickedRoleId].name[lang] || ROLES[pickedRoleId].name.en}`}
                </button>
              </div>
            </div>
          ) : (
            /* PRIVATE SINGLE-PLAYER SECRET ROLE CARD */
            <div className="flex flex-col items-center">
              <div
                data-testid="gm-private-role-card"
                className="w-full max-w-sm rounded-2xl border-2 border-amber-500/45 bg-gradient-to-b from-[#0d1424] via-[#0a101e] to-[#070b15] shadow-2xl p-6 text-center min-h-[410px] flex flex-col justify-between relative overflow-hidden"
              >
                {!myRoleDef ? (
                  /* WAITING FOR GM TO ASSIGN ROLE */
                  <div className="my-auto space-y-4 py-8">
                    <div className="w-20 h-20 rounded-2xl bg-slate-900 border border-amber-500/40 mx-auto flex items-center justify-center text-amber-400">
                      <Shield className="w-9 h-9" />
                    </div>
                    <h3 className="text-lg font-black text-amber-100">
                      {isVi ? 'Đang Chờ Vai Trò Của Bạn' : 'Waiting for Your Role'}
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {isVi
                        ? 'Quản Trò chưa nhập hoặc chia vai trò cho ghế của bạn. Hãy chờ Quản Trò cập nhật hoặc tự nhập lá bài nếu bạn có bài giấy.'
                        : 'The Game Master has not assigned your role yet. Wait for the GM or refresh.'}
                    </p>
                    <button
                      type="button"
                      onClick={handleRefreshMyCard}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>{isVi ? 'Kiểm tra cập nhật' : 'Check Updates'}</span>
                    </button>
                  </div>
                ) : !isRevealed ? (
                  /* CONCEALED PRIVACY LOCK SCREEN */
                  <div className="my-auto space-y-5 py-6">
                    <div className="w-24 h-24 rounded-full bg-slate-900 border-2 border-amber-500/45 mx-auto flex items-center justify-center shadow-inner">
                      <Lock className="w-10 h-10 text-amber-300" />
                    </div>

                    <div className="space-y-1.5">
                      <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-bold block">
                        {isVi ? '🔒 BẢO MẬT VAI TRÒ CÁ NHÂN' : '🔒 PERSONAL ROLE PRIVACY'}
                      </span>
                      <h3 className="text-xl font-black text-slate-100">
                        {isVi ? 'Thẻ Bài Của Bạn Đang Ẩn' : 'Your Secret Card Is Hidden'}
                      </h3>
                      <p className="text-xs text-slate-400 max-w-[260px] mx-auto leading-relaxed">
                        {isVi
                          ? 'Chỉ duy nhất bạn biết vai trò này. Hãy che màn hình trước khi bấm lật thẻ!'
                          : 'Only your own role is shown here. Shield your screen before revealing.'}
                      </p>
                    </div>

                    <div className="space-y-2.5 pt-1">
                      <button
                        type="button"
                        data-testid="gm-reveal-my-card-btn"
                        onClick={() => {
                          sound.playCardFlip();
                          setIsRevealed(true);
                        }}
                        className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs sm:text-sm shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Eye className="w-4 h-4" />
                        <span>{isVi ? 'Nhấn Để Xem Vai Trò Của Tôi' : 'Tap to Reveal My Role'}</span>
                      </button>

                      {playerView.canSelfInputRole && (
                        <button
                          type="button"
                          data-testid="gm-edit-self-role-btn"
                          onClick={() => {
                            if (mySeat?.roleId) setPickedRoleId(mySeat.roleId);
                            setIsEditingOwnRole(true);
                          }}
                          className="w-full py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-amber-300 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>
                            {isVi
                              ? 'Đổi Lá Bài Tự Nhập (Trước Trận)'
                              : 'Change My Card (Pre-Game)'}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  /* REVEALED OWN ROLE ONLY */
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                      <span className="text-[11px] font-mono text-slate-400">
                        {mySeat?.name}
                      </span>
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border ${
                          myRoleDef.faction === 'werewolf'
                            ? 'bg-rose-950/90 border-rose-600 text-rose-200'
                            : myRoleDef.faction === 'neutral'
                            ? 'bg-amber-950/90 border-amber-600 text-amber-200'
                            : 'bg-sky-950/90 border-sky-600 text-sky-200'
                        }`}
                      >
                        {myRoleDef.faction === 'werewolf'
                          ? isVi
                            ? 'Phe Ma Sói'
                            : 'Werewolf Team'
                          : myRoleDef.faction === 'neutral'
                          ? isVi
                            ? 'Phe Thứ Ba'
                            : 'Third Party'
                          : isVi
                          ? 'Phe Dân Làng'
                          : 'Villager Team'}
                      </span>
                    </div>

                    <div className="w-20 h-20 rounded-2xl bg-slate-900 border-2 border-amber-500/45 mx-auto flex items-center justify-center text-4xl shadow-lg">
                      {ROLE_ICONS[myRoleDef.id]}
                    </div>

                    <div>
                      <h3
                        data-testid="gm-revealed-role-name"
                        className="text-2xl font-black text-amber-100"
                      >
                        {myRoleDef.name[lang] || myRoleDef.name.vi}
                      </h3>
                      {myRoleDef.wakeOrder > 0 ? (
                        <span className="text-[11px] text-amber-400/90 font-mono">
                          {isVi
                            ? `Thức dậy ban đêm · Thứ tự gọi #${myRoleDef.wakeOrder}`
                            : `Wakes at night · Order #${myRoleDef.wakeOrder}`}
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-mono">
                          {isVi ? 'Ngủ suốt ban đêm' : 'Sleeps through the night'}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-200 leading-relaxed">
                      {myRoleDef.description[lang] || myRoleDef.description.vi}
                    </p>

                    <div className="bg-[#070a14] border border-amber-500/30 rounded-xl p-3 text-left">
                      <div className="flex items-center gap-1.5 text-amber-300 font-bold text-xs mb-1">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        <span>{isVi ? 'Mẹo Chơi Vai Này:' : 'Role Tip:'}</span>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        {myRoleDef.guideForNewbie[lang] || myRoleDef.guideForNewbie.vi}
                      </p>
                    </div>

                    <div className="pt-1 space-y-2">
                      <button
                        type="button"
                        data-testid="gm-hide-my-card-btn"
                        onClick={() => {
                          sound.playCardFlip();
                          setIsRevealed(false);
                        }}
                        className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <EyeOff className="w-4 h-4" />
                        <span>{isVi ? 'Đã Xem Xong — Ẩn Thẻ Ngay' : 'Hide Card Now'}</span>
                      </button>

                      {playerView.canSelfInputRole && (
                        <button
                          type="button"
                          onClick={() => {
                            setPickedRoleId(myRoleDef.id);
                            setIsEditingOwnRole(true);
                          }}
                          className="w-full py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-amber-300 text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>{isVi ? 'Đổi lại lá bài đã nhập' : 'Change my entered card'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                <div className="pt-3 mt-3 border-t border-slate-800/80 text-[10px] text-slate-400">
                  {mySeat?.roleSource === 'self_input'
                    ? isVi
                      ? 'Nguồn vai trò: Bạn đã tự nhập từ bài giấy'
                      : 'Source: Self-entered physical card'
                    : mySeat?.roleSource === 'gm_assigned'
                    ? isVi
                      ? 'Nguồn vai trò: Quản Trò đã nhập hộ'
                      : 'Source: Assigned by Game Master'
                    : mySeat?.roleSource === 'auto_dealt'
                    ? isVi
                      ? 'Nguồn vai trò: Chia bài ảo từ phòng Quản Trò'
                      : 'Source: Virtual deck dealt by GM'
                    : isVi
                    ? 'Chưa có vai trò'
                    : 'Role pending'}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
