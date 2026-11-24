import React from 'react';
import {
  Camera,
  Compass,
  Crown,
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
  mayorName?: string | null;
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
  mayorName,
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
  const cleanFpvShort = lang === 'vi' ? 'Góc nhìn 1' : 'FPV';

  return (
    <div className="flex items-center justify-between gap-1.5 sm:gap-2">
      {/* Top-Left Carved-Wood Phase Dial, Timer, Mayor & Neutral Alive Counter */}
      <div
        data-tour-id="top-left"
        className="pointer-events-auto flex items-center gap-1.5 sm:gap-2.5 agrou-wood-panel rounded-xl sm:rounded-2xl px-2 py-1 sm:px-3 sm:py-1.5 min-w-0"
      >
        {/* Agrou-Style Circular Sun / Moon Dial */}
        <div
          className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center border-2 shrink-0 shadow-inner ${
            phase === 'night'
              ? 'bg-[#1f1936] border-[#9b7ce8] text-[#ddd6fe]'
              : 'bg-[#4f2c12] border-[#f5b82e] text-[#fde047]'
          }`}
        >
          {phase === 'night' ? (
            <Moon className="w-4 h-4 sm:w-5 sm:h-5" />
          ) : (
            <Sun className="w-4 h-4 sm:w-5 sm:h-5" />
          )}
        </div>

        <div className="md:pr-2.5 md:border-r md:border-[#634329] min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-[#f5b82e] truncate">
              {phase === 'night'
                ? t.nightPhaseTitle(round)
                : phase === 'day_discussion'
                ? t.dayDiscussTitle(round)
                : phase === 'day_voting'
                ? t.dayVoteTitle(round)
                : t.hunterPhaseTitle}
            </span>
            {gameMode === 'online' && (
              <span className="hidden sm:inline text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#3b281a] text-[#fde7c3]">
                {t.roomBadge(roomId)}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5">
            <span
              className="text-sm sm:text-lg font-black text-[#fff7e8] font-mono leading-tight"
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
              className="hidden sm:inline-flex px-1.5 py-0.5 rounded bg-[#1b120b] hover:bg-[#312115] border border-[#785334] text-[9px] font-mono font-bold text-[#e6d5b8] cursor-pointer"
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
              className="hidden sm:inline-flex px-1.5 py-0.5 rounded bg-[#312115] hover:bg-[#452e1e] border border-[#b58148] text-[9px] font-mono font-bold text-[#fde7c3] cursor-pointer"
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
                className="px-2 py-0.5 rounded-lg bg-[#e86f24] hover:bg-[#f28139] border border-[#fbc266] text-[#fff8ed] font-extrabold text-[10px] sm:text-[11px] flex items-center gap-1 shadow cursor-pointer whitespace-nowrap"
              >
                <FastForward className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-[#fff8ed] shrink-0" />
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

        {/* Neutral Survivor Counter + Agrou Village Mayor Indicator */}
        <div
          data-testid="hud-survivor-counter"
          className="hidden md:flex items-center gap-3 text-xs"
        >
          {showFactionHints ? (
            <>
              <div>
                <span className="text-[8px] font-bold uppercase text-[#f87171] block">
                  {t.wolvesAlive}
                </span>
                <span
                  className="text-sm font-black text-[#fecaca] font-mono"
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {aliveWolvesCount}
                </span>
              </div>
              <div>
                <span className="text-[8px] font-bold uppercase text-[#7dd3fc] block">
                  {t.villagersAlive}
                </span>
                <span
                  className="text-sm font-black text-[#e0f2fe] font-mono"
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {aliveVillagersCount}
                </span>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-[#6ee7b7]" />
              <div>
                <span className="text-[8px] font-bold uppercase text-[#bfa586] block">
                  {lang === 'vi' ? 'Còn sống' : 'Alive'}
                </span>
                <span
                  className="text-sm font-black text-[#d1fae5] font-mono leading-none"
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {aliveTotal}/{totalPlayers}
                </span>
              </div>
            </div>
          )}

          {mayorName && (
            <div
              data-testid="hud-mayor-chip"
              className="hidden lg:flex items-center gap-1.5 pl-2.5 border-l border-[#634329]"
              title={
                lang === 'vi'
                  ? 'Thị Trưởng có phiếu bầu x2 để phá thế hòa'
                  : 'Village Mayor has a 2x tie-breaking vote'
              }
            >
              <Crown className="w-3.5 h-3.5 text-[#f5b82e] shrink-0" />
              <div className="leading-tight">
                <span className="text-[8px] font-bold uppercase text-[#d9a65d] block">
                  {lang === 'vi' ? 'Thị Trưởng (x2)' : 'Mayor (x2)'}
                </span>
                <span className="text-[11px] font-extrabold text-[#fef3c7] max-w-[90px] truncate block">
                  {mayorName}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Top-Right Compact Carved-Wood Utility Bar */}
      <div
        data-tour-id="top-right"
        className="pointer-events-auto flex items-center gap-1 agrou-wood-panel rounded-xl sm:rounded-2xl p-1 shrink-0"
      >
        <button
          type="button"
          tabIndex={-1}
          onClick={(e) => {
            e.currentTarget.blur();
            onOpenRoleCard();
          }}
          className="px-2 py-1.5 rounded-xl bg-[#4f2c12] hover:bg-[#663a19] border border-[#e89c3e] text-[#fef3c7] text-xs font-extrabold flex items-center gap-1 cursor-pointer"
          title={myRole.name[lang]}
        >
          <Eye className="w-3.5 h-3.5 text-[#f5b82e]" />
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
              ? 'bg-[#2f7d4d] border-[#86efac] text-white'
              : 'bg-[#1c130c] border-[#6b4a2e] text-[#86efac] hover:bg-[#312115]'
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
              ? 'bg-[#2d68a8] border-[#93c5fd] text-white'
              : 'bg-[#1c130c] border-[#6b4a2e] text-[#93c5fd] hover:bg-[#312115]'
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
          className="hidden sm:flex p-2 rounded-xl bg-[#1c130c] hover:bg-[#312115] text-[#f6ebd8] border border-[#6b4a2e] cursor-pointer"
          title={t.switchCamera}
          aria-label={t.switchCamera}
        >
          <Camera className="w-4 h-4 text-[#f5b82e]" />
        </button>

        <button
          type="button"
          data-testid="open-onboarding-tour-btn"
          tabIndex={-1}
          onClick={(e) => {
            e.currentTarget.blur();
            onOpenOnboardingTour();
          }}
          className="p-1.5 sm:p-2 rounded-xl bg-[#1c130c] hover:bg-[#312115] text-[#f5b82e] border border-[#6b4a2e] cursor-pointer"
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
              ? 'bg-[#9e2b25] border-[#fca5a5] text-white'
              : 'bg-[#1c130c] border-[#6b4a2e] text-[#d6bfa2] hover:bg-[#312115]'
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
          className="hidden sm:flex p-2 rounded-xl bg-[#1c130c] hover:bg-[#312115] text-[#f6ebd8] border border-[#6b4a2e] cursor-pointer"
          title={t.toggleSound}
          aria-label={t.toggleSound}
        >
          <Volume2 className={`w-4 h-4 ${isMuted ? 'text-[#8c7258]' : 'text-[#5cb85c]'}`} />
        </button>

        <button
          type="button"
          tabIndex={-1}
          onClick={(e) => {
            e.currentTarget.blur();
            onPause();
          }}
          className="p-1.5 sm:p-2 rounded-xl bg-[#1c130c] hover:bg-[#312115] text-[#f5b82e] border border-[#6b4a2e] cursor-pointer"
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
