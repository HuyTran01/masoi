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
  onStartTour?: () => void;
}

const ROLE_CARD_TEXT: Record<
  Language,
  {
    headerBadge: string;
    alive: string;
    dead: string;
    closeAria: string;
    factionWolf: string;
    factionNeutral: string;
    factionVillager: string;
    sealTitle: string;
    sealDesc: string;
    revealBtn: string;
    wakePassive: string;
    wakeNight1Only: string;
    wakeEveryNight: string;
    tipsTitle: string;
    hideBtn: string;
    enterBtn: string;
    tourBtn: string;
  }
> = {
  vi: {
    headerBadge: 'Thẻ Bài Định Mệnh 3D',
    alive: 'Đang Sống',
    dead: 'Đã Ngã Xuống',
    closeAria: 'Đóng Thẻ Vai Trò',
    factionWolf: 'Phe Ma Sói',
    factionNeutral: 'Phe Thứ Ba (Độc Lập)',
    factionVillager: 'Phe Dân Làng',
    sealTitle: 'Ấn Ký Ma Sói',
    sealDesc: 'Thẻ bài đang được úp bảo mật. Bấm nút bên dưới để lật mở!',
    revealBtn: 'Lật Thẻ Để Xem Vai Trò',
    wakePassive: 'Ngủ ban đêm (Nội tại)',
    wakeNight1Only: 'Chỉ thức Đêm 1',
    wakeEveryNight: 'Thức mỗi đêm',
    tipsTitle: 'Chiến Thuật & Mẹo Chơi:',
    hideBtn: 'Úp Thẻ Bảo Mật',
    enterBtn: 'Vào Trận Ngay',
    tourBtn: '🧭 Hướng dẫn 5 bước',
  },
  en: {
    headerBadge: '3D Secret Role Card',
    alive: 'Alive',
    dead: 'Eliminated',
    closeAria: 'Close Role Card',
    factionWolf: 'Werewolf Pack',
    factionNeutral: 'Third Party (Solo)',
    factionVillager: 'Villager Team',
    sealTitle: 'Werewolf Seal',
    sealDesc: 'Your card is face-down for privacy. Press below to reveal!',
    revealBtn: 'Reveal Secret Role',
    wakePassive: 'Sleeps at night (Passive)',
    wakeNight1Only: 'Wakes Night 1 only',
    wakeEveryNight: 'Wakes every night',
    tipsTitle: 'Strategy & Tips:',
    hideBtn: 'Hide Card',
    enterBtn: 'Enter Match',
    tourBtn: '🧭 5-Step Guide',
  },
  fr: {
    headerBadge: 'Carte de Rôle 3D',
    alive: 'En Vie',
    dead: 'Éliminé',
    closeAria: 'Fermer la Carte de Rôle',
    factionWolf: 'Camp des Loups',
    factionNeutral: 'Camp Neutre (Solo)',
    factionVillager: 'Camp du Village',
    sealTitle: 'Sceau du Loup-Garou',
    sealDesc: 'Votre carte est cachée. Cliquez ci-dessous pour la révéler !',
    revealBtn: 'Révéler Mon Rôle',
    wakePassive: 'Dort la nuit (Passif)',
    wakeNight1Only: 'Se réveille Nuit 1 uniquement',
    wakeEveryNight: 'Se réveille chaque nuit',
    tipsTitle: 'Stratégie & Conseils :',
    hideBtn: 'Cacher la Carte',
    enterBtn: 'Jouer',
    tourBtn: '🧭 Guide en 5 étapes',
  },
  es: {
    headerBadge: 'Carta de Rol 3D',
    alive: 'Vivo',
    dead: 'Eliminado',
    closeAria: 'Cerrar Carta de Rol',
    factionWolf: 'Bando de los Lobos',
    factionNeutral: 'Tercero (Solitario)',
    factionVillager: 'Bando Aldeano',
    sealTitle: 'Sello del Lobo',
    sealDesc: 'Tu carta está oculta. ¡Pulsa el botón para revelarla!',
    revealBtn: 'Revelar Rol Secreto',
    wakePassive: 'Duerme de noche (Pasivo)',
    wakeNight1Only: 'Solo despierta Noche 1',
    wakeEveryNight: 'Despierta cada noche',
    tipsTitle: 'Estrategia y Consejos:',
    hideBtn: 'Ocultar Carta',
    enterBtn: 'Entrar al Juego',
    tourBtn: '🧭 Guía de 5 pasos',
  },
  ja: {
    headerBadge: '3D 秘密の役職カード',
    alive: '生存中',
    dead: '脱落',
    closeAria: '役職カードを閉じる',
    factionWolf: '人狼陣営',
    factionNeutral: '第三陣営（単独）',
    factionVillager: '村人陣営',
    sealTitle: '人狼の封印',
    sealDesc: 'カードは伏せられています。下のボタンで確認してください。',
    revealBtn: '役職カードをめくる',
    wakePassive: '夜は眠る（パッシブ）',
    wakeNight1Only: '1夜目のみ行動',
    wakeEveryNight: '毎晩行動',
    tipsTitle: '戦略とヒント：',
    hideBtn: 'カードを伏せる',
    enterBtn: '試合へ進む',
    tourBtn: '🧭 5ステップガイド',
  },
};

export const RoleCardModal: React.FC<RoleCardModalProps> = ({
  roleId,
  playerName,
  isAlive,
  lang,
  onClose,
  onStartTour,
}) => {
  const [isRevealed, setIsRevealed] = useState(true);
  const role = ROLES[roleId];
  const ct = ROLE_CARD_TEXT[lang] || ROLE_CARD_TEXT.en;

  let isFirstVisit = false;
  try {
    isFirstVisit = !localStorage.getItem('werewolf_3d_tour_done');
  } catch {
    isFirstVisit = false;
  }

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
      ? ct.factionWolf
      : role.faction === 'neutral'
      ? ct.factionNeutral
      : ct.factionVillager;

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
      role="dialog"
      aria-modal="true"
      aria-labelledby="role-card-modal-title"
      data-testid="role-card-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto pointer-events-auto"
      style={{ backgroundColor: 'rgba(5, 8, 17, 0.88)' }}
    >
      <div className="relative w-full max-w-md bg-[#0d1322] border-2 border-amber-600/50 rounded-2xl p-5 shadow-2xl text-slate-100">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
          aria-label={ct.closeAria}
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-4">
          <span className="text-[11px] font-mono uppercase tracking-widest text-amber-400">
            {ct.headerBadge}
          </span>
          <h3
            id="role-card-modal-title"
            className="text-xl font-extrabold text-amber-100 tracking-wide mt-0.5"
          >
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
              {isAlive ? ct.alive : ct.dead}
            </span>
          </div>
        </div>

        {/* 3D Tarot Card Container (Keyboard-safe button controls inside, no nested clickable div) */}
        <div className="mx-auto w-full max-w-[320px] min-h-[380px] rounded-2xl border-2 border-amber-500/50 bg-[#090d18] shadow-2xl flex flex-col items-center justify-center p-6 text-center">
          {!isRevealed ? (
            <div className="flex flex-col items-center justify-center space-y-4 py-8">
              <div className="w-24 h-24 rounded-full bg-rose-950 border-2 border-amber-500/60 flex items-center justify-center shadow-lg">
                <span className="text-5xl select-none">🐺</span>
              </div>
              <div>
                <h4 className="font-bold text-lg text-amber-200 tracking-widest uppercase">
                  {ct.sealTitle}
                </h4>
                <p className="text-xs text-slate-400 mt-1 max-w-[220px]">
                  {ct.sealDesc}
                </p>
              </div>
              <button
                type="button"
                onClick={handleToggleReveal}
                className="mt-2 px-5 py-2.5 rounded-xl bg-rose-700 hover:bg-rose-600 text-white text-xs font-bold shadow-lg flex items-center gap-2 cursor-pointer"
              >
                <Eye className="w-4 h-4" />
                {ct.revealBtn}
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

              <span className="mt-1 text-[11px] font-semibold text-slate-400">
                {role.wakeOrder === 0
                  ? ct.wakePassive
                  : roleId === 'cupid' || roleId === 'doppelganger'
                  ? ct.wakeNight1Only
                  : ct.wakeEveryNight}
              </span>

              <p className="mt-3 text-xs text-slate-200 leading-relaxed text-center px-1">
                {role.description[lang] || role.description.vi}
              </p>

              {/* Newbie Guide Box */}
              <div className="mt-4 w-full bg-[#111827] border border-amber-700/40 rounded-xl p-3 text-left">
                <div className="flex items-center gap-1.5 text-amber-300 font-bold text-xs mb-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>{ct.tipsTitle}</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-normal">
                  {role.guideForNewbie[lang] || role.guideForNewbie.vi}
                </p>
              </div>

              <div className="mt-4 flex items-center gap-2 w-full">
                <button
                  type="button"
                  onClick={handleToggleReveal}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <EyeOff className="w-3.5 h-3.5" />
                  {ct.hideBtn}
                </button>
                <button
                  type="button"
                  data-testid="role-card-enter-match-btn"
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold cursor-pointer"
                >
                  {ct.enterBtn}
                </button>
              </div>

              {isFirstVisit && onStartTour && (
                <button
                  type="button"
                  data-testid="role-card-start-tour-btn"
                  onClick={() => {
                    sound.playCardFlip();
                    onStartTour();
                  }}
                  className="mt-2.5 w-full py-2 rounded-xl bg-sky-950/90 hover:bg-sky-900 border border-sky-500/60 text-sky-200 text-xs font-bold cursor-pointer"
                >
                  {ct.tourBtn}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
