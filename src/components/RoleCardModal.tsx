import React, { useState } from 'react';
import { Eye, EyeOff, X, Sparkles } from 'lucide-react';
import { RoleId, Language } from '../types/game';
import { ROLES } from '../game/roles';
import { sound } from '../utils/sound';

interface RoleCardModalProps {
  roleId: RoleId;
  playerName: string;
  isAlive: boolean;
  lang: Language;
  onClose: () => void;
}

export const RoleCardModal: React.FC<RoleCardModalProps> = ({
  roleId,
  playerName,
  isAlive,
  lang,
  onClose,
}) => {
  const [isRevealed, setIsRevealed] = useState(true);
  const role = ROLES[roleId];

  const handleToggleReveal = () => {
    sound.playCardFlip();
    setIsRevealed(!isRevealed);
  };

  const factionColor =
    role.faction === 'werewolf'
      ? 'text-red-300 border-red-700 bg-red-950'
      : role.faction === 'neutral'
      ? 'text-amber-300 border-amber-700 bg-amber-950'
      : 'text-sky-300 border-sky-700 bg-sky-950';

  const factionLabel =
    role.faction === 'werewolf'
      ? 'Phe Ma Sói'
      : role.faction === 'neutral'
      ? 'Phe Thứ Ba (Độc Lập)'
      : 'Phe Dân Làng';

  const roleEmoji =
    role.id === 'werewolf'
      ? '🐺'
      : role.id === 'seer'
      ? '🔮'
      : role.id === 'bodyguard'
      ? '🛡️'
      : role.id === 'witch'
      ? '🧪'
      : role.id === 'hunter'
      ? '🎯'
      : role.id === 'cupid'
      ? '💘'
      : role.id === 'tanner'
      ? '🎭'
      : role.id === 'wolf_pup'
      ? '🔥'
      : role.id === 'elder'
      ? '👑'
      : role.id === 'cursed'
      ? '🌓'
      : role.id === 'traitor'
      ? '🗡️'
      : role.id === 'doppelganger'
      ? '🪞'
      : '🧑‍🌾';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto pointer-events-auto"
      style={{ backgroundColor: 'rgba(5, 8, 17, 0.88)' }}
    >
      <div className="relative w-full max-w-md bg-[#0d1322] border-2 border-amber-600/50 rounded-2xl p-5 shadow-2xl text-slate-100">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
          aria-label="Close Role Card"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-4">
          <span className="text-[11px] font-mono uppercase tracking-widest text-amber-400">
            Thẻ Bài Định Mệnh 3D
          </span>
          <h3 className="text-xl font-extrabold text-amber-100 tracking-wide mt-0.5">
            {playerName}
          </h3>
          <div className="flex items-center justify-center gap-2 mt-1">
            <span
              className={`text-[11px] font-bold px-2.5 py-0.5 rounded border ${
                isAlive
                  ? 'border-emerald-700 bg-emerald-950 text-emerald-300'
                  : 'border-rose-800 bg-rose-950 text-rose-300'
              }`}
            >
              {isAlive ? 'Đang Sống' : 'Đã Ngã Xuống'}
            </span>
          </div>
        </div>

        {/* 3D Tarot Card Container */}
        <div
          onClick={handleToggleReveal}
          className="cursor-pointer mx-auto w-full max-w-[320px] min-h-[380px] rounded-2xl border-2 border-amber-500/50 bg-[#090d18] shadow-2xl flex flex-col items-center justify-center p-6 text-center transition-transform duration-300 hover:scale-[1.01]"
        >
          {!isRevealed ? (
            <div className="flex flex-col items-center justify-center space-y-4 py-8">
              <div className="w-24 h-24 rounded-full bg-rose-950 border-2 border-amber-500/60 flex items-center justify-center shadow-lg">
                <span className="text-5xl select-none">🐺</span>
              </div>
              <div>
                <h4 className="font-bold text-lg text-amber-200 tracking-widest uppercase">
                  Ấn Ký Ma Sói
                </h4>
                <p className="text-xs text-slate-400 mt-1 max-w-[220px]">
                  Thẻ bài đang được úp bảo mật. Chạm vào thẻ để lật mở!
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleReveal();
                }}
                className="mt-2 px-5 py-2.5 rounded-xl bg-rose-700 hover:bg-rose-600 text-white text-xs font-bold shadow-lg flex items-center gap-2"
              >
                <Eye className="w-4 h-4" />
                Lật Thẻ Để Xem Vai Trò
              </button>
            </div>
          ) : (
            <div className="w-full flex flex-col items-center">
              <div className="w-20 h-20 rounded-2xl bg-slate-900 border-2 border-amber-500/60 flex items-center justify-center shadow-lg mb-3">
                <span className="text-4xl select-none">{roleEmoji}</span>
              </div>

              <h4 className="font-extrabold text-2xl text-amber-100 tracking-wide">
                {role.name[lang] || role.name.vi}
              </h4>

              <div className={`mt-1.5 px-3 py-0.5 rounded text-xs font-bold border ${factionColor}`}>
                {factionLabel}
              </div>

              {role.wakeOrder > 0 && (
                <span className="mt-1 text-[11px] font-mono text-slate-400">
                  Thứ tự thức đêm: #{role.wakeOrder}
                </span>
              )}

              <p className="mt-3 text-xs text-slate-200 leading-relaxed text-center px-1">
                {role.description[lang] || role.description.vi}
              </p>

              {/* Newbie Guide Box */}
              <div className="mt-4 w-full bg-[#111827] border border-amber-700/40 rounded-xl p-3 text-left">
                <div className="flex items-center gap-1.5 text-amber-300 font-bold text-xs mb-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Chiến Thuật & Mẹo Chơi:</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-normal">
                  {role.guideForNewbie[lang] || role.guideForNewbie.vi}
                </p>
              </div>

              <div className="mt-4 flex items-center gap-2 w-full">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleReveal();
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5"
                >
                  <EyeOff className="w-3.5 h-3.5" />
                  Úp Thẻ Bảo Mật
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClose();
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 text-xs font-extrabold"
                >
                  Vào Trận Ngay
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
