import React from 'react';
import {
  Camera,
  Compass,
  Crown,
  Eye,
  FastForward,
  HelpCircle,
  Lock,
  Mic,
  MicOff,
  Moon,
  Sun,
  UserRound,
  Users,
  View,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { GameMode, Language, Phase, RoleDefinition } from '../types/game';
import { CameraViewPreset } from '../game/fpvCamera';
import { UI_TEXT } from '../utils/i18n';

// Keyboard-shortcut hints like "[V]" are meaningless on touch screens (accessible names keep them).
const IS_TOUCH_DEVICE =
  typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;
const visibleLabel = (label: string) => (IS_TOUCH_DEVICE ? label.replace(/\s*\[[A-Z]\]/g, '') : label);

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
  aliveThirdPartyCount?: number;
  hasThirdPartyInMatch?: boolean;
  showFactionHints: boolean;
  showFastForwardBtn: boolean;
  myRole: RoleDefinition;
  myElderLives?: number | null;
  mayorName?: string | null;
  cameraPreset: CameraViewPreset;
  freeLook360: boolean;
  isMicOn: boolean;
  isDead?: boolean;
  isMuted: boolean;
  onAdjustTimer: (deltaSec: number) => void;
  onAdvancePhaseFast: () => void;
  onOpenRoleCard: () => void;
  onToggleFirstPerson: () => void;
  onToggleThirdPerson: () => void;
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
  aliveThirdPartyCount = 0,
  hasThirdPartyInMatch = false,
  showFactionHints,
  showFastForwardBtn,
  myRole,
  myElderLives = null,
  mayorName,
  cameraPreset,
  freeLook360,
  isMicOn,
  isDead = false,
  isMuted,
  onAdjustTimer,
  onAdvancePhaseFast,
  onOpenRoleCard,
  onToggleFirstPerson,
  onToggleThirdPerson,
  onToggleFreeLook,
  onCycleCameraPreset,
  onOpenOnboardingTour,
  onToggleMic,
  onToggleMute,
  onPause,
}) => {
  const t = UI_TEXT[lang];
  const cleanFpvShort = t.fpvShort;
  const tpvLabel = t.behindCamBtn;
  const tpvShort = t.behindCamShort;
  const compactPhaseLabel =
    phase === 'night'
      ? `${t.nightLabel} ${round}`
      : phase === 'day_discussion'
      ? lang === 'vi'
        ? `Ngày ${round}`
        : `Day ${round}`
      : phase === 'day_voting'
      ? lang === 'vi'
        ? `Phiếu ${round}`
        : `${t.voteAction} ${round}`
      : phase === 'game_over'
      ? t.gameOverShort
      : t.hunterPhaseTitle;

  return (
    <div className="flex items-center justify-between gap-1 sm:gap-2">
      {/* Top-Left Carved-Wood Phase Dial, Timer, Mayor & Neutral Alive Counter */}
      <div
        data-tour-id="top-left"
        className="pointer-events-auto flex items-center gap-1 sm:gap-2.5 agrou-wood-panel rounded-xl sm:rounded-2xl px-1.5 py-1 sm:px-3 sm:py-1.5 min-w-0 shrink"
      >
        {/* Agrou-Style Circular Sun / Moon Dial */}
        <div
          className={`w-6 h-6 sm:w-10 sm:h-10 rounded-full flex items-center justify-center border-2 shrink-0 shadow-inner ${
            phase === 'night'
              ? 'bg-[#1f1936] border-[#9b7ce8] text-[#ddd6fe]'
              : 'bg-[#4f2c12] border-[#f5b82e] text-[#fde047]'
          }`}
        >
          {phase === 'night' ? (
            <Moon className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
          ) : (
            <Sun className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
          )}
        </div>

        <div className="md:pr-2.5 md:border-r md:border-[#634329] min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-[#f5b82e] whitespace-nowrap sm:truncate">
              <span className="sm:hidden">{compactPhaseLabel}</span>
              <span className="hidden sm:inline">
                {phase === 'night'
                  ? t.nightPhaseTitle(round)
                  : phase === 'day_discussion'
                  ? t.dayDiscussTitle(round)
                  : phase === 'day_voting'
                  ? t.dayVoteTitle(round)
                  : phase === 'game_over'
                  ? t.gameOverShort
                  : t.hunterPhaseTitle}
              </span>
            </span>
            <span
              data-testid="hud-mobile-alive-pill"
              className="inline-flex md:hidden items-center gap-0.5 px-1 py-0.2 rounded bg-[#1b120b] border border-[#6b4a2e] text-[9px] font-mono font-bold text-[#d1fae5] shrink-0"
              style={{ fontVariantNumeric: 'tabular-nums' }}
              title={t.aliveStatus}
            >
              <Users className="w-2.5 h-2.5 text-[#6ee7b7]" />
              <span>{aliveTotal}/{totalPlayers}</span>
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

            {gameMode !== 'online' && (
              <>
                <button
                  type="button"
                  data-testid="hud-timer-minus-10"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onAdjustTimer(-10);
                  }}
                  className="hidden sm:inline-flex px-1.5 py-0.5 rounded bg-[#1b120b] hover:bg-[#312115] border border-[#785334] text-[9px] font-mono font-bold text-[#e6d5b8] cursor-pointer"
                  title={`${t.phaseTimers} -10s`}
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
                  title={`${t.phaseTimers} +15s`}
                >
                  +15s
                </button>
              </>
            )}

            {showFastForwardBtn && (
              <button
                type="button"
                data-testid="fast-forward-phase-btn"
                onClick={(e) => {
                  e.currentTarget.blur();
                  onAdvancePhaseFast();
                }}
                className="hidden sm:flex px-2 py-0.5 rounded-lg bg-[#b84b10] hover:bg-[#9e3f0c] border border-[#fbc266] text-white font-extrabold text-[10px] sm:text-[11px] items-center gap-1 shadow cursor-pointer whitespace-nowrap"
              >
                <FastForward className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-white shrink-0" />
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
              <div data-testid="hud-wolves-count">
                <span className="text-[10px] font-bold uppercase text-[#fca5a5] block">
                  {t.wolvesAlive}
                </span>
                <span
                  className="text-sm font-black text-[#fee2e2] font-mono"
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {aliveWolvesCount}
                </span>
              </div>
              <div data-testid="hud-villagers-count">
                <span className="text-[10px] font-bold uppercase text-[#7dd3fc] block">
                  {t.villagersAlive}
                </span>
                <span
                  className="text-sm font-black text-[#e0f2fe] font-mono"
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {aliveVillagersCount}
                </span>
              </div>
              {hasThirdPartyInMatch && (
                <div data-testid="hud-third-party-count">
                  <span className="text-[10px] font-bold uppercase text-[#fcd34d] block">
                    {t.thirdPartyAlive}
                  </span>
                  <span
                    className="text-sm font-black text-[#fef3c7] font-mono"
                    style={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    {aliveThirdPartyCount}
                  </span>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-[#6ee7b7]" />
              <div>
                <span className="text-[10px] font-bold uppercase text-[#e6d5b8] block">
                  {t.aliveStatus}
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
              title={t.mayorTooltip}
            >
              <Crown className="w-3.5 h-3.5 text-[#f5b82e] shrink-0" />
              <div className="leading-tight">
                <span className="text-[8px] font-bold uppercase text-[#d9a65d] block">
                  {t.mayorBadge}
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
        className="pointer-events-auto flex items-center gap-0.5 sm:gap-1 agrou-wood-panel rounded-xl sm:rounded-2xl p-1 shrink-0"
      >
        <button
          type="button"
          onClick={(e) => {
            e.currentTarget.blur();
            onOpenRoleCard();
          }}
          className="px-1.5 sm:px-2 py-1.5 rounded-xl bg-[#4f2c12] hover:bg-[#663a19] border border-[#e89c3e] text-[#fef3c7] text-[10px] sm:text-xs font-extrabold flex items-center gap-1 cursor-pointer max-w-[92px] sm:max-w-none overflow-hidden"
          title={myRole.name[lang]}
        >
          <Eye className="w-3.5 h-3.5 text-[#f5b82e] shrink-0" />
          <span className="max-w-[92px] sm:max-w-none truncate">{myRole.name[lang]}</span>
          {myRole.id === 'elder' && !isDead && typeof myElderLives === 'number' && (
            <span
              data-testid="hud-elder-lives-badge"
              className="ml-0.5 px-1 py-0.2 rounded bg-rose-950/90 border border-rose-400/60 text-rose-200 text-[9px] sm:text-[10px] font-mono font-black shrink-0"
              title={lang === 'vi' ? `Số mạng Già Làng còn lại: ${myElderLives}/2` : `Elder lives remaining: ${myElderLives}/2`}
            >
              ❤️{myElderLives}/2
            </span>
          )}
        </button>

        <button
          type="button"
          data-testid="toggle-fpv-btn"
          aria-pressed={!freeLook360 && cameraPreset === 'first_person'}
          onClick={(e) => {
            e.currentTarget.blur();
            onToggleFirstPerson();
          }}
          className={`px-1.5 sm:px-2 py-1.5 rounded-xl border text-[11px] font-extrabold flex items-center gap-1 cursor-pointer ${
            !freeLook360 && cameraPreset === 'first_person'
              ? 'bg-[#2f7d4d] border-[#86efac] text-white'
              : 'bg-[#1c130c] border-[#6b4a2e] text-[#86efac] hover:bg-[#312115]'
          }`}
          title={t.firstPersonBtn}
          aria-label={t.firstPersonBtn}
        >
          <View className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden md:inline">{visibleLabel(t.firstPersonBtn)}</span>
          <span className="hidden sm:inline md:hidden">{visibleLabel(cleanFpvShort)}</span>
        </button>

        <button
          type="button"
          data-testid="toggle-tpv-btn"
          aria-pressed={!freeLook360 && cameraPreset === 'third_person'}
          onClick={(e) => {
            e.currentTarget.blur();
            onToggleThirdPerson();
          }}
          className={`px-1.5 sm:px-2 py-1.5 rounded-xl border text-[11px] font-extrabold flex items-center gap-1 cursor-pointer ${
            !freeLook360 && cameraPreset === 'third_person'
              ? 'bg-[#b45309] border-[#fde68a] text-white'
              : 'bg-[#1c130c] border-[#6b4a2e] text-[#fcd34d] hover:bg-[#312115]'
          }`}
          title={tpvLabel}
          aria-label={tpvLabel}
        >
          <UserRound className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden md:inline">{visibleLabel(tpvLabel)}</span>
          <span className="hidden sm:inline md:hidden">{tpvShort}</span>
        </button>

        <button
          type="button"
          data-testid="toggle-freelook-btn"
          aria-pressed={freeLook360}
          onClick={(e) => {
            e.currentTarget.blur();
            onToggleFreeLook();
          }}
          className={`hidden sm:flex px-2 py-1.5 rounded-xl border text-[11px] font-bold items-center gap-1 cursor-pointer ${
            freeLook360
              ? 'bg-[#2d68a8] border-[#93c5fd] text-white'
              : 'bg-[#1c130c] border-[#6b4a2e] text-[#93c5fd] hover:bg-[#312115]'
          }`}
          title={t.freeLookTooltip}
          aria-label={t.freeLook360}
        >
          <Compass className="w-3.5 h-3.5" />
          <span className="hidden lg:inline">{t.freeLook360}</span>
        </button>

        <button
          type="button"
          data-testid="switch-camera-preset-btn"
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
          data-testid="hud-mic-toggle-btn"
          disabled={isDead}
          onClick={(e) => {
            e.currentTarget.blur();
            if (isDead) return;
            onToggleMic();
          }}
          className={`hidden sm:flex p-2 rounded-xl border ${
            isDead
              ? 'bg-[#1a1310] border-rose-900/60 text-rose-400/70 opacity-75 cursor-not-allowed'
              : isMicOn
              ? 'bg-[#9e2b25] border-[#fca5a5] text-white cursor-pointer'
              : 'bg-[#1c130c] border-[#6b4a2e] text-[#d6bfa2] hover:bg-[#312115] cursor-pointer'
          }`}
          title={isDead ? t.micLockedDead : t.toggleMic}
          aria-label={isDead ? t.micLockedDead : t.toggleMic}
        >
          {isDead ? (
            <span className="relative flex items-center">
              <MicOff className="w-4 h-4" />
              <Lock className="w-2.5 h-2.5 -ml-1 -mt-2 text-rose-400" />
            </span>
          ) : isMicOn ? (
            <Mic className="w-4 h-4" />
          ) : (
            <MicOff className="w-4 h-4" />
          )}
        </button>

        <button
          type="button"
          aria-pressed={isMuted}
          onClick={(e) => {
            e.currentTarget.blur();
            onToggleMute();
          }}
          className="flex p-1.5 sm:p-2 rounded-xl bg-[#1c130c] hover:bg-[#312115] text-[#f6ebd8] border border-[#6b4a2e] cursor-pointer"
          title={t.toggleSound}
          aria-label={t.toggleSound}
        >
          {isMuted ? (
            <VolumeX className="w-4 h-4 text-[#d6bfa2]" />
          ) : (
            <Volume2 className="w-4 h-4 text-[#5cb85c]" />
          )}
        </button>

        <button
          type="button"
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
