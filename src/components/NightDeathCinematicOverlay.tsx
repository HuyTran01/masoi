import React from 'react';
import {
  Clapperboard,
  Crosshair,
  Eye,
  FlaskConical,
  Ghost,
  HeartCrack,
  Lock,
  MessageSquareOff,
  MicOff,
  Skull,
  Sun,
} from 'lucide-react';
import { Language, NightDeathCinematicState } from '../types/game';
import { ROLES } from '../game/roles';

interface NightDeathCinematicOverlayProps {
  cinematic: NightDeathCinematicState;
  lang: Language;
  onContinue: () => void;
}

export const NightDeathCinematicOverlay: React.FC<NightDeathCinematicOverlayProps> = ({
  cinematic,
  lang,
  onContinue,
}) => {
  const isVi = lang === 'vi';
  const isWolfKillFilm = cinematic.mode === 'wolf_kill';
  const killerRoleDef = cinematic.killerRoleId ? ROLES[cinematic.killerRoleId] : null;
  const killerRoleName = killerRoleDef ? killerRoleDef.name[lang] || killerRoleDef.name.vi : null;

  const getVictimCauseTheme = () => {
    switch (cinematic.causeType) {
      case 'witch_poison':
        return {
          icon: '🧪',
          HeaderIcon: FlaskConical,
          badgeText: isVi
            ? 'PHIM NGẮN CUỐI ĐÊM · BỊ PHÙ THỦY HẠ ĐỘC'
            : 'END-OF-NIGHT SHORT FILM · WITCH POISON',
          borderClass: 'border-emerald-500/85',
          badgeClass: 'bg-emerald-950/95 text-emerald-200 border-emerald-500/70',
          vignette:
            'radial-gradient(circle at center, rgba(4,24,14,0.10) 26%, rgba(6,68,36,0.74) 100%)',
          title: isVi ? 'BẠN ĐÃ TRÚNG BÌNH ĐỘC CỦA PHÙ THỦY!' : 'POISONED BY THE WITCH!',
        };
      case 'hunter_shot':
        return {
          icon: '🎯',
          HeaderIcon: Crosshair,
          badgeText: isVi
            ? 'PHIM NGẮN CUỐI ĐÊM · PHÁT SÚNG THỢ SĂN'
            : 'END-OF-NIGHT SHORT FILM · HUNTER SHOT',
          borderClass: 'border-amber-500/85',
          badgeClass: 'bg-amber-950/95 text-amber-200 border-amber-500/70',
          vignette:
            'radial-gradient(circle at center, rgba(32,16,4,0.10) 26%, rgba(92,38,8,0.74) 100%)',
          title: isVi ? 'BẠN BỊ THỢ SĂN BẮN KÉO THEO!' : 'SHOT BY THE DYING HUNTER!',
        };
      case 'cupid_lover':
        return {
          icon: '💘',
          HeaderIcon: HeartCrack,
          badgeText: isVi
            ? 'PHIM NGẮN CUỐI ĐÊM · LỜI NGUYỀN CUPID'
            : 'END-OF-NIGHT SHORT FILM · CUPID HEARTBREAK',
          borderClass: 'border-pink-500/85',
          badgeClass: 'bg-pink-950/95 text-pink-200 border-pink-500/70',
          vignette:
            'radial-gradient(circle at center, rgba(32,6,20,0.10) 26%, rgba(96,12,48,0.74) 100%)',
          title: isVi ? 'BẠN TỬ TRẬN THEO TÌNH NHÂN!' : 'PERISHED WITH YOUR LOVER!',
        };
      case 'werewolf':
        return {
          icon: '🐺',
          HeaderIcon: Skull,
          badgeText: isVi
            ? 'PHIM NGẮN CUỐI ĐÊM · MA SÓI TẤN CÔNG'
            : 'END-OF-NIGHT SHORT FILM · WEREWOLF ATTACK',
          borderClass: 'border-rose-500/85',
          badgeClass: 'bg-rose-950/95 text-rose-200 border-rose-500/70',
          vignette:
            'radial-gradient(circle at center, rgba(35,0,6,0.08) 26%, rgba(110,6,14,0.76) 100%)',
          title: isVi ? 'BẠN ĐÃ BỊ MA SÓI CẮN TRONG ĐÊM!' : 'HUNTED BY WEREWOLVES!',
        };
      default:
        return {
          icon: '💀',
          HeaderIcon: Skull,
          badgeText: isVi ? 'PHIM NGẮN CUỐI ĐÊM · TỬ TRẬN' : 'END-OF-NIGHT SHORT FILM · ELIMINATED',
          borderClass: 'border-rose-500/80',
          badgeClass: 'bg-slate-950/95 text-rose-200 border-rose-500/60',
          vignette:
            'radial-gradient(circle at center, rgba(12,6,18,0.10) 26%, rgba(45,6,14,0.76) 100%)',
          title: isVi ? 'BẠN ĐÃ NGÃ XUỐNG TRONG MÀN ĐÊM!' : 'YOU PERISHED IN THE NIGHT!',
        };
    }
  };

  const victimTheme = getVictimCauseTheme();
  const theme = isWolfKillFilm
    ? {
        icon: '🐺',
        HeaderIcon: Clapperboard,
        badgeText: isVi
          ? 'PHIM NGẮN CUỐI ĐÊM · ĐÊM SĂN THÀNH CÔNG'
          : 'END-OF-NIGHT SHORT FILM · HUNT COMPLETE',
        borderClass: 'border-rose-500/85',
        badgeClass: 'bg-rose-950/95 text-rose-200 border-rose-500/70',
        vignette:
          'radial-gradient(circle at center, rgba(35,0,6,0.08) 26%, rgba(110,6,14,0.72) 100%)',
        title: isVi
          ? `MỤC TIÊU ${cinematic.victimName.toUpperCase()} ĐÃ GỤC NGÃ!`
          : `PREY ${cinematic.victimName.toUpperCase()} ELIMINATED!`,
        subtitle: cinematic.reasonText,
      }
    : {
        ...victimTheme,
        subtitle:
          cinematic.reasonText ||
          (isVi
            ? 'Bóng tối đã cướp đi sinh mạng của bạn trước khi bình minh kịp ló rạng.'
            : 'The dark night claimed your life before dawn could break.'),
      };

  const HeaderIcon = theme.HeaderIcon;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={theme.title}
      data-testid="night-death-cinematic-overlay"
      data-cinematic-mode={isWolfKillFilm ? 'wolf_kill' : 'victim_death'}
      data-death-cause={cinematic.causeType}
      className="fixed inset-0 z-40 pointer-events-auto flex flex-col justify-between"
      style={{ background: theme.vignette }}
    >
      {/* Top Widescreen Cinema Letterbox Bar + Dramatic Alert Header */}
      <div className="w-full bg-black/92 border-b border-rose-500/35 px-4 py-3 sm:py-4 text-center shadow-2xl">
        <div className="mx-auto max-w-2xl">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] sm:text-[11px] font-black uppercase tracking-widest shadow-lg ${theme.badgeClass}`}
          >
            <HeaderIcon className="w-3.5 h-3.5" />
            <span>{theme.badgeText}</span>
          </span>
          <h2 className="mt-1.5 text-lg sm:text-2xl font-black text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)] tracking-tight">
            {theme.icon} {theme.title}
          </h2>
        </div>
      </div>

      {/* Bottom Widescreen Cinema Letterbox Bar + Story & Action Card */}
      <div className="w-full bg-black/92 border-t border-rose-500/35 px-4 py-3 sm:py-4 shadow-2xl">
        <div
          className={`mx-auto max-w-xl w-full agrou-wood-panel border-2 ${theme.borderClass} rounded-2xl p-3.5 sm:p-4 shadow-2xl space-y-2.5`}
        >
          {/* Dead Ghost Truth Reveal Pill (Killer or Linked Lover) */}
          {!isWolfKillFilm && cinematic.revealKiller && (cinematic.killerName || cinematic.linkedLoverName) && (
            <div
              data-testid="ghost-death-cause-reveal"
              className="flex flex-wrap items-center justify-center gap-2 rounded-xl bg-[#1a0f0a]/95 border border-amber-500/55 px-3 py-1.5 text-xs font-extrabold text-amber-200"
            >
              {cinematic.killerName ? (
                <>
                  <span className="text-slate-300 font-semibold">
                    {isVi ? 'Thủ phạm:' : 'Eliminated by:'}
                  </span>
                  <span className="text-white">{cinematic.killerName}</span>
                  {killerRoleName && (
                    <span className="px-2 py-0.5 rounded-md bg-rose-900/85 border border-rose-400/50 text-rose-100 text-[11px]">
                      {killerRoleName}
                    </span>
                  )}
                </>
              ) : (
                <>
                  <span className="text-pink-300 font-semibold">
                    {isVi ? 'Tình nhân:' : 'Lover:'}
                  </span>
                  <span className="text-white">{cinematic.linkedLoverName}</span>
                </>
              )}
            </div>
          )}

          <p className="text-xs sm:text-sm text-[#fcebd2] font-semibold leading-relaxed text-center">
            {theme.subtitle}
          </p>

          {!isWolfKillFilm && (
            <div className="rounded-xl bg-[#110c09]/95 border border-cyan-500/45 px-3 py-2 flex flex-wrap items-center justify-center gap-2 text-[11px] text-cyan-200 font-bold">
              <span className="inline-flex items-center gap-1 text-cyan-300">
                <Ghost className="w-3.5 h-3.5" />
                {isVi ? 'Hồn Ma:' : 'Ghost Mode:'}
              </span>
              <span className="inline-flex items-center gap-1 text-emerald-300">
                <Eye className="w-3.5 h-3.5" />
                {isVi ? 'Mở khóa toàn bộ vai trò' : 'All Roles Revealed'}
              </span>
              <span>·</span>
              <span className="inline-flex items-center gap-1 text-rose-300">
                <MessageSquareOff className="w-3.5 h-3.5" />
                {isVi ? 'Cấm Chat' : 'Chat Locked'}
              </span>
              <span>·</span>
              <span className="inline-flex items-center gap-1 text-rose-300">
                <MicOff className="w-3.5 h-3.5" />
                {isVi ? 'Khóa Micro' : 'Mic Locked'}
              </span>
              <Lock className="w-3 h-3 text-slate-400" />
            </div>
          )}

          <button
            type="button"
            data-testid="night-death-continue-btn"
            onClick={onContinue}
            className={`w-full py-2.5 sm:py-3 rounded-xl text-white font-black text-xs sm:text-sm shadow-xl flex items-center justify-center gap-2 cursor-pointer transition-all ${
              isWolfKillFilm
                ? 'bg-gradient-to-r from-rose-700 to-amber-600 hover:from-rose-600 hover:to-amber-500'
                : 'bg-gradient-to-r from-cyan-600 to-sky-600 hover:from-cyan-500 hover:to-sky-500'
            }`}
          >
            {isWolfKillFilm ? <Sun className="w-4 h-4" /> : <Ghost className="w-4 h-4" />}
            <span>
              {isWolfKillFilm
                ? isVi
                  ? 'Kết Thúc Phim Ngắn & Đón Bình Minh'
                  : 'Finish Cutscene & Enter Dawn'
                : isVi
                ? 'Hóa Thành Hồn Ma & Xem Toàn Cảnh'
                : 'Rise as Ghost & Spectate Match'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
