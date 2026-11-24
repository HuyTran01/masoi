import React from 'react';
import {
  Camera,
  Compass,
  Eye,
  FastForward,
  HelpCircle,
  Mic,
  MicOff,
  Moon,
  Sun,
  Users,
  View,
  Volume2,
} from 'lucide-react';
import { GameMode, Language, Phase, RoleDefinition } from '../types/game';
import { CameraViewPreset } from '../game/fpvCamera';
import { UI_TEXT } from '../utils/i18n';

interface GameTopHudProps {
  lang: Language;
  phase: Phase;
  round: number;
  timerSeconds: number;
  gameMode: GameMode;
  roomId: string;
  aliveTotal: number;
  totalPlayers: number;
  aliveWolvesCount: number;
  aliveVillagersCount: number;
  showFactionHints: boolean;
  showFastForwardBtn: boolean;
  myRole: RoleDefinition;
  cameraPreset: CameraViewPreset;
  freeLook360: boolean;
  isMicOn: boolean;
  isMuted: boolean;
  onAdjustTimer: (deltaSec: number) => void;
  onAdvancePhaseFast: () => void;
  onOpenRoleCard: () => void;
  onToggleFirstPerson: () => void;
  onToggleFreeLook: () => void;
  onCycleCameraPreset: () => void;
  onOpenOnboardingTour: () => void;
  onToggleMic: () => void;
  onToggleMute: () => void;
  onPause: () => void;
}

export const GameTopHud: React.FC<GameTopHudProps> = ({
  lang,
  phase,
  round,
  timerSeconds,
  gameMode,
  roomId,
  aliveTotal,
  totalPlayers,
  aliveWolvesCount,
  aliveVillagersCount,
  showFactionHints,
  showFastForwardBtn,
  myRole,
  cameraPreset,
  freeLook360,
  isMicOn,
  isMuted,
  onAdjustTimer,
  onAdvancePhaseFast,
  onOpenRoleCard,
  onToggleFirstPerson,
  onToggleFreeLook,
  onCycleCameraPreset,
  onOpenOnboardingTour,
  onToggleMic,
  onToggleMute,
  onPause,
}) => {
  const t = UI_TEXT[lang];
  // Clean label without desktop keyboard shortcuts like [V] on mobile screens
  const cleanFpvShort = lang === 'vi' ? 'Góc nhìn 1' : 'FPV';

  return (
    <div className="flex items-center justify-between gap-1.5 sm:gap-2">
      {/* Top-Left Phase, Timer & Neutral Survivor Count (No backdrop-blur over WebGL) */}
      <div
        data-tour-id="top-left"
        className="pointer-events-auto flex items-center gap-1.5 sm:gap-2.5 bg-[#080c17]/94 border border-amber-700/50 rounded-xl sm:rounded-2xl px-2 py-1 sm:px-3 sm:py-1.5 shadow-xl min-w-0"
      >
        <div
          className={`w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl flex items-center justify-center border shrink-0 ${
            phase === 'night'
              ? 'bg-rose-950 border-rose-500 text-rose-300'
              : 'bg-amber-950 border-amber-400 text-amber-300'
          }`}
        >
          {phase === 'night' ? (
            <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          ) : (
            <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          )}
        </div>

        <div className="md:pr-2.5 md:border-r md:border-slate-800 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-amber-400 truncate">
              {phase === 'night'
                ? t.nightPhaseTitle(round)
                : phase === 'day_discussion'
                ? t.dayDiscussTitle(round)
                : phase === 'day_voting'
                ? t.dayVoteTitle(round)
                : t.hunterPhaseTitle}
            </span>
            {gameMode === 'online' && (
              <span className="hidden sm:inline text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                {t.roomBadge(roomId)}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5">
            <span
              className="text-sm sm:text-lg font-black text-slate-100 font-mono leading-tight"
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {Math.round(timerSeconds)}s
            </span>

            <button
              type="button"
              data-testid="hud-timer-minus-10"
              onClick={(e) => {
                e.currentTarget.blur();
                onAdjustTimer(-10);
              }}
              className="hidden sm:inline-flex px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-[9px] font-mono font-bold text-slate-200 cursor-pointer"
              title={lang === 'vi' ? 'Giảm 10 giây' : 'Subtract 10s'}
            >
              -10s
            </button>
            <button
              type="button"
              data-testid="hud-timer-plus-15"
              onClick={(e) => {
                e.currentTarget.blur();
                onAdjustTimer(15);
              }}
              className="hidden sm:inline-flex px-1.5 py-0.5 rounded bg-indigo-900/90 hover:bg-indigo-800 border border-indigo-400/50 text-[9px] font-mono font-bold text-indigo-200 cursor-pointer"
              title={lang === 'vi' ? 'Thêm 15 giây' : 'Add 15s'}
            >
              +15s
            </button>

            {showFastForwardBtn && (
              <button
                type="button"
                data-testid="fast-forward-phase-btn"
                onClick={(e) => {
                  e.currentTarget.blur();
                  onAdvancePhaseFast();
                }}
                className="px-2 py-0.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-[10px] sm:text-[11px] flex items-center gap-1 shadow cursor-pointer whitespace-nowrap"
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
            )}
          </div>
        </div>

        {/* Neutral Survivor Counter (Prevents Hidden Role / Cursed Wolf Info Leak!) */}
        <div
          data-testid="hud-survivor-counter"
          className="hidden md:flex items-center gap-2.5 text-xs"
        >
          {showFactionHints ? (
            <>
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
            </>
          ) : (
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-emerald-400" />
              <div>
                <span className="text-[8px] font-bold uppercase text-slate-400 block">
                  {lang === 'vi' ? 'Còn sống' : 'Alive'}
                </span>
                <span
                  className="text-sm font-black text-emerald-200 font-mono leading-none"
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {aliveTotal}/{totalPlayers}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Top-Right Compact Utility Bar */}
      <div
        data-tour-id="top-right"
        className="pointer-events-auto flex items-center gap-1 bg-[#080c17]/94 border border-amber-700/40 rounded-xl sm:rounded-2xl p-1 shadow-xl shrink-0"
      >
        <button
          type="button"
          tabIndex={-1}
          onClick={(e) => {
            e.currentTarget.blur();
            onOpenRoleCard();
          }}
          className="px-2 py-1.5 rounded-xl bg-amber-950/90 hover:bg-amber-900 border border-amber-500/50 text-amber-200 text-xs font-extrabold flex items-center gap-1 cursor-pointer"
          title={myRole.name[lang]}
        >
          <Eye className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden sm:inline">{myRole.name[lang]}</span>
        </button>

        <button
          type="button"
          data-testid="toggle-fpv-btn"
          tabIndex={-1}
          onClick={(e) => {
            e.currentTarget.blur();
            onToggleFirstPerson();
          }}
          className={`px-2 py-1.5 rounded-xl border text-[11px] font-extrabold flex items-center gap-1 cursor-pointer ${
            cameraPreset === 'first_person'
              ? 'bg-emerald-600 border-emerald-300 text-white'
              : 'bg-slate-900 border-slate-800 text-emerald-300 hover:bg-slate-800'
          }`}
          title={t.firstPersonBtn}
          aria-label={t.firstPersonBtn}
        >
          <View className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden md:inline">{t.firstPersonBtn}</span>
          <span className="hidden sm:inline md:hidden">{cleanFpvShort}</span>
        </button>

        <button
          type="button"
          tabIndex={-1}
          onClick={(e) => {
            e.currentTarget.blur();
            onToggleFreeLook();
          }}
          className={`hidden sm:flex px-2 py-1.5 rounded-xl border text-[11px] font-bold items-center gap-1 cursor-pointer ${
            freeLook360
              ? 'bg-sky-600 border-sky-300 text-white'
              : 'bg-slate-900 border-slate-800 text-sky-300 hover:bg-slate-800'
          }`}
          title={t.freeLook360}
        >
          <Compass className="w-3.5 h-3.5" />
          <span className="hidden lg:inline">{t.freeLook360}</span>
        </button>

        <button
          type="button"
          data-testid="switch-camera-preset-btn"
          tabIndex={-1}
          onClick={(e) => {
            e.currentTarget.blur();
            onCycleCameraPreset();
          }}
          className="hidden sm:flex p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 cursor-pointer"
          title={t.switchCamera}
          aria-label={t.switchCamera}
        >
          <Camera className="w-4 h-4 text-sky-400" />
        </button>

        <button
          type="button"
          data-testid="open-onboarding-tour-btn"
          tabIndex={-1}
          onClick={(e) => {
            e.currentTarget.blur();
            onOpenOnboardingTour();
          }}
          className="p-1.5 sm:p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 border border-slate-800 cursor-pointer"
          title={t.openGuide}
          aria-label={t.openGuide}
        >
          <HelpCircle className="w-4 h-4" />
        </button>

        <button
          type="button"
          tabIndex={-1}
          onClick={(e) => {
            e.currentTarget.blur();
            onToggleMic();
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

        <button
          type="button"
          tabIndex={-1}
          onClick={(e) => {
            e.currentTarget.blur();
            onToggleMute();
          }}
          className="hidden sm:flex p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 cursor-pointer"
          title={t.toggleSound}
          aria-label={t.toggleSound}
        >
          <Volume2 className={`w-4 h-4 ${isMuted ? 'text-slate-500' : 'text-emerald-400'}`} />
        </button>

        <button
          type="button"
          tabIndex={-1}
          onClick={(e) => {
            e.currentTarget.blur();
            onPause();
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
  );
};
