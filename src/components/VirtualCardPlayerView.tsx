import React, { useState, useEffect } from 'react';
import { Smartphone, Shield, Eye, EyeOff, Sparkles, RefreshCw, ChevronRight, Lock, CheckCircle2, User } from 'lucide-react';
import { Player, RoleId, Language } from '../types/game';
import { ROLES } from '../game/roles';
import { sound } from '../utils/sound';
import { TRANSLATIONS } from '../utils/i18n';

interface VirtualCardPlayerViewProps {
  initialRoomId?: string;
  lang: Language;
}

export const VirtualCardPlayerView: React.FC<VirtualCardPlayerViewProps> = ({ initialRoomId, lang }) => {
  const t = TRANSLATIONS[lang];
  const [roomIdInput, setRoomIdInput] = useState<string>(initialRoomId || '');
  const [loadedPlayers, setLoadedPlayers] = useState<Player[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');
  const [isRevealed, setIsRevealed] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Pass and Play mode state
  const [isPassAndPlayMode, setIsPassAndPlayMode] = useState<boolean>(false);
  const [passPlayerIndex, setPassPlayerIndex] = useState<number>(0);

  // Load room from storage
  const handleLoadRoom = (code: string) => {
    setErrorMsg('');
    try {
      const stored = localStorage.getItem(`werewolf_room_${code.trim().toUpperCase()}`);
      if (stored) {
        const data = JSON.parse(stored);
        if (data && data.players && data.players.length > 0) {
          setLoadedPlayers(data.players);
          setSelectedPlayerId(data.players[0].id);
          return;
        }
      }
    } catch {
      // fallback
    }

    // If not found in localStorage, create demo room so user can immediately experience the feature!
    const fallbackPlayers: Player[] = [
      { id: 'p_1', name: 'Bảo An', avatar: '🐺', roleId: 'werewolf', isAlive: true },
      { id: 'p_2', name: 'Tuấn Kiệt', avatar: '🔮', roleId: 'seer', isAlive: true },
      { id: 'p_3', name: 'Minh Hoàng', avatar: '🛡️', roleId: 'bodyguard', isAlive: true },
      { id: 'p_4', name: 'Thảo My', avatar: '🧪', roleId: 'witch', isAlive: true },
      { id: 'p_5', name: 'Hữu Phước', avatar: '🎯', roleId: 'hunter', isAlive: true },
      { id: 'p_6', name: 'Kim Ngân', avatar: '💘', roleId: 'cupid', isAlive: true },
      { id: 'p_7', name: 'Đức Huy', avatar: '🐺', roleId: 'wolf_pup', isAlive: true },
      { id: 'p_8', name: 'Quỳnh Anh', avatar: '🧑‍🌾', roleId: 'villager', isAlive: true },
    ];
    setLoadedPlayers(fallbackPlayers);
    setSelectedPlayerId(fallbackPlayers[0].id);
  };

  useEffect(() => {
    if (initialRoomId) {
      setRoomIdInput(initialRoomId);
      handleLoadRoom(initialRoomId);
    } else {
      // Auto-scan any existing rooms in localStorage
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('werewolf_room_')) {
          const code = key.replace('werewolf_room_', '');
          setRoomIdInput(code);
          handleLoadRoom(code);
          break;
        }
      }
    }
  }, [initialRoomId]);

  const activePlayer = loadedPlayers.find((p) => p.id === selectedPlayerId) || loadedPlayers[0];
  const roleDef = activePlayer ? ROLES[activePlayer.roleId] : null;

  const toggleReveal = () => {
    sound.playCardFlip();
    setIsRevealed(!isRevealed);
  };

  // Pass and play advance
  const handlePassToNext = () => {
    sound.playCardFlip();
    setIsRevealed(false);
    if (passPlayerIndex < loadedPlayers.length - 1) {
      const nextIdx = passPlayerIndex + 1;
      setPassPlayerIndex(nextIdx);
      setSelectedPlayerId(loadedPlayers[nextIdx].id);
    } else {
      setIsPassAndPlayMode(false);
      setPassPlayerIndex(0);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-950/70 via-slate-900 to-indigo-950/70 border border-purple-800/40 rounded-2xl p-5 shadow-xl text-center sm:text-left flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 justify-center sm:justify-start">
            <span className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/30">
              <Smartphone className="w-5 h-5" />
            </span>
            <h2 className="text-xl sm:text-2xl font-bold font-['Cinzel'] text-purple-200">
              {t.virtualCards}
            </h2>
          </div>
          <p className="text-xs text-slate-300 mt-1 max-w-lg">
            Giải pháp thay thế bộ bài giấy: Người chơi mở điện thoại, nhập Mã Phòng từ Quản Trò để xem thẻ bài bí mật kèm hướng dẫn chi tiết cho người mới.
          </p>
        </div>

        {/* Room Code Form */}
        <div className="w-full sm:w-auto flex gap-2">
          <input
            type="text"
            value={roomIdInput}
            onChange={(e) => setRoomIdInput(e.target.value.toUpperCase())}
            placeholder="Nhập mã phòng (VD: GM-108)"
            className="w-full sm:w-44 bg-slate-950 border border-purple-800/60 rounded-xl px-3 py-2 text-xs font-mono text-purple-200 focus:outline-none focus:border-purple-400 text-center uppercase tracking-wider"
          />
          <button
            onClick={() => handleLoadRoom(roomIdInput)}
            className="px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-600 text-white text-xs font-bold whitespace-nowrap shadow-md"
          >
            Tải Phòng
          </button>
        </div>
      </div>

      {loadedPlayers.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          {/* Mode Switcher / Player Selector */}
          {!isPassAndPlayMode ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  1. Chọn Tên Hoặc Số Thứ Tự Của Bạn:
                </label>
                <button
                  onClick={() => {
                    setIsPassAndPlayMode(true);
                    setPassPlayerIndex(0);
                    setSelectedPlayerId(loadedPlayers[0].id);
                    setIsRevealed(false);
                  }}
                  className="text-xs text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Bật Chế Độ Chuyền 1 Điện Thoại (Pass & Play)
                </button>
              </div>

              {/* Player Pills Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {loadedPlayers.map((p, idx) => {
                  const isSelected = p.id === activePlayer?.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => {
                        sound.playCardFlip();
                        setSelectedPlayerId(p.id);
                        setIsRevealed(false);
                      }}
                      className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all ${
                        isSelected
                          ? 'bg-purple-950/80 border-purple-500 text-purple-200 shadow-lg shadow-purple-950/40'
                          : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="font-mono text-[10px] text-purple-400">#{idx + 1}</span>
                        <span className="truncate">{p.name}</span>
                      </div>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            /* PASS & PLAY MODE BANNER */
            <div className="bg-purple-950/40 border border-purple-800/50 rounded-xl p-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-purple-400 tracking-wider">
                  Chế Độ Chuyền Tay (Pass & Play)
                </span>
                <h4 className="text-base font-bold text-slate-100 font-['Cinzel']">
                  Người chơi #{passPlayerIndex + 1}: {activePlayer?.name}
                </h4>
                <p className="text-xs text-slate-400">
                  Chuyền máy cho {activePlayer?.name}. Chỉ mở khi không ai nhìn!
                </p>
              </div>
              <button
                onClick={() => setIsPassAndPlayMode(false)}
                className="text-xs text-slate-400 hover:text-slate-200 underline"
              >
                Thoát chế độ chuyền
              </button>
            </div>
          )}

          {/* THE SECRET CARD CONTAINER */}
          {activePlayer && roleDef && (
            <div className="flex flex-col items-center">
              <div className="w-full max-w-sm rounded-2xl border-2 border-amber-600/30 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 shadow-2xl p-6 text-center min-h-[420px] flex flex-col justify-between relative overflow-hidden">
                {!isRevealed ? (
                  /* CARD BACK (CONCEALED) */
                  <div className="my-auto space-y-4 py-8 animate-in fade-in">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-950 via-slate-900 to-rose-950 border-2 border-purple-500/40 mx-auto flex items-center justify-center shadow-inner">
                      <Lock className="w-10 h-10 text-purple-300" />
                    </div>

                    <div>
                      <h4 className="font-['Cinzel'] font-bold text-lg text-purple-200 uppercase tracking-widest">
                        Thẻ Bài Đang Ẩn
                      </h4>
                      <p className="text-xs text-slate-400 mt-1 max-w-[240px] mx-auto">
                        Đảm bảo không ai xung quanh nhìn vào màn hình của bạn trước khi lật thẻ.
                      </p>
                    </div>

                    <button
                      onClick={toggleReveal}
                      className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-600 hover:to-indigo-600 text-white text-xs font-bold shadow-lg shadow-purple-950/60 flex items-center gap-2 mx-auto active:scale-95 transition-transform"
                    >
                      <Eye className="w-4 h-4" />
                      Nhấn Để Mở Thẻ Bài Bí Mật
                    </button>
                  </div>
                ) : (
                  /* CARD FRONT (REVEALED) */
                  <div className="space-y-4 animate-in zoom-in-95 duration-200">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <span className="text-[11px] font-mono text-slate-400">
                        {activePlayer.name}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          roleDef.faction === 'werewolf'
                            ? 'bg-red-950/80 border-red-700 text-red-300'
                            : roleDef.faction === 'neutral'
                            ? 'bg-amber-950/80 border-amber-700 text-amber-300'
                            : 'bg-sky-950/80 border-sky-700 text-sky-300'
                        }`}
                      >
                        {roleDef.faction === 'werewolf'
                          ? 'Phe Ma Sói'
                          : roleDef.faction === 'neutral'
                          ? 'Phe Thứ Ba'
                          : 'Phe Dân Làng'}
                      </span>
                    </div>

                    {/* Role Icon */}
                    <div className="w-20 h-20 rounded-2xl bg-slate-800/80 border-2 border-purple-500/40 mx-auto flex items-center justify-center text-4xl shadow-lg">
                      {roleDef.id === 'werewolf'
                        ? '🐺'
                        : roleDef.id === 'seer'
                        ? '🔮'
                        : roleDef.id === 'bodyguard'
                        ? '🛡️'
                        : roleDef.id === 'witch'
                        ? '🧪'
                        : roleDef.id === 'hunter'
                        ? '🎯'
                        : roleDef.id === 'cupid'
                        ? '💘'
                        : roleDef.id === 'wolf_pup'
                        ? '🔥'
                        : roleDef.id === 'tanner'
                        ? '🎭'
                        : roleDef.id === 'elder'
                        ? '👑'
                        : roleDef.id === 'doppelganger'
                        ? '🪞'
                        : roleDef.id === 'cursed'
                        ? '🌓'
                        : roleDef.id === 'traitor'
                        ? '🗡️'
                        : '🧑‍🌾'}
                    </div>

                    <div>
                      <h3 className="font-['Cinzel'] font-extrabold text-2xl text-purple-100">
                        {roleDef.name[lang] || roleDef.name.vi}
                      </h3>
                      {roleDef.wakeOrder > 0 && (
                        <span className="text-[11px] text-slate-400 font-mono">
                          Thức dậy ban đêm: Lượt #{roleDef.wakeOrder}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed text-center">
                      {roleDef.description[lang] || roleDef.description.vi}
                    </p>

                    {/* Beginner Guide Tip */}
                    <div className="bg-slate-950/90 border border-purple-900/50 rounded-xl p-3 text-left">
                      <div className="flex items-center gap-1.5 text-purple-300 font-bold text-xs mb-1">
                        <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                        <span>Mẹo Chơi Dành Cho Bạn:</span>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        {roleDef.guideForNewbie[lang] || roleDef.guideForNewbie.vi}
                      </p>
                    </div>

                    <div className="pt-2">
                      <button
                        onClick={toggleReveal}
                        className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5"
                      >
                        <EyeOff className="w-4 h-4" />
                        Đã Xem Xong - Ẩn Thẻ Ngay
                      </button>
                    </div>
                  </div>
                )}

                {/* Pass to next player button in pass & play mode */}
                {isPassAndPlayMode && isRevealed && (
                  <button
                    onClick={handlePassToNext}
                    className="mt-3 w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-lg"
                  >
                    <span>
                      {passPlayerIndex < loadedPlayers.length - 1
                        ? `Xong! Chuyền Máy Cho ${loadedPlayers[passPlayerIndex + 1].name}`
                        : 'Hoàn Tất Xem Thẻ Toàn Bộ Người Chơi!'}
                    </span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
