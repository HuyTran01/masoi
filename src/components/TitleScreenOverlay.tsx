import React, { useState } from 'react';
import {
  Bot,
  ChevronDown,
  ChevronUp,
  Globe,
  HelpCircle,
  Minus,
  Plus,
  Shield,
  SlidersHorizontal,
  Volume2,
} from 'lucide-react';
import { Language, RoleId } from '../types/game';
import { ROLES } from '../game/roles';
import { CustomTimerConfig, DEFAULT_TIMER_CONFIG } from '../game/autoGM';
import { UI_TEXT } from '../utils/i18n';
import { sound } from '../utils/sound';
import { AccountModalTab, UserProfileData } from './SocialLoginModal';

interface TitleScreenOverlayProps {
  lang: Language;
  isMuted: boolean;
  currentUser: UserProfileData;
  villageSize: number;
  preferredRole: RoleId | 'random';
  timerConfig: CustomTimerConfig;
  showFactionHints: boolean;
  isTitleMenuMinimized: boolean;
  onToggleMinimize: () => void;
  onToggleMute: () => void;
  onChangeLanguage: (lang: Language) => void;
  onChangeVillageSize: (size: number) => void;
  onChangePreferredRole: (role: RoleId | 'random') => void;
  onUpdateTimerConfig: (next: CustomTimerConfig) => void;
  onToggleFactionHints: () => void;
  onOpenAccountModal: (tab: AccountModalTab) => void;
  onOpenLobbyModal: (mode: 'online' | 'gm') => void;
  onStartAIPractice: () => void;
  onStartOnboardingTour: () => void;
}

export const TitleScreenOverlay: React.FC<TitleScreenOverlayProps> = ({
  lang,
  isMuted,
  currentUser,
  villageSize,
  preferredRole,
  timerConfig,
  showFactionHints,
  isTitleMenuMinimized,
  onToggleMinimize,
  onToggleMute,
  onChangeLanguage,
  onChangeVillageSize,
  onChangePreferredRole,
  onUpdateTimerConfig,
  onToggleFactionHints,
  onOpenAccountModal,
  onOpenLobbyModal,
  onStartAIPractice,
  onStartOnboardingTour,
}) => {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const t = UI_TEXT[lang];

  const isLoggedIn = Boolean(
    currentUser.provider && currentUser.provider !== 'guest' && currentUser.handle
  );

  const selectedRoleLabel =
    preferredRole === 'random'
      ? lang === 'vi'
        ? 'Vai ngẫu nhiên'
        : 'Random role'
      : ROLES[preferredRole]?.name[lang] || preferredRole;

  const timerPresetLabel =
    timerConfig.nightActionSec <= 15
      ? lang === 'vi'
        ? 'Nhanh'
        : 'Fast'
      : timerConfig.nightActionSec >= 35
      ? lang === 'vi'
        ? 'Thư thả'
        : 'Relaxed'
      : lang === 'vi'
      ? 'Chuẩn'
      : 'Standard';

  return (
    <div className="fixed inset-0 z-30 pointer-events-none flex flex-col justify-between p-2.5 sm:p-4">
      {/* Top Bar: Profile + Quick Utilities */}
      <div className="flex items-center justify-between gap-2 pointer-events-auto">
        <button
          type="button"
          data-testid="title-profile-btn"
          onClick={() => {
            sound.playCardFlip();
            onOpenAccountModal(isLoggedIn ? 'profile' : 'login');
          }}
          className="flex items-center gap-2 bg-[#090d18]/92 hover:bg-[#11182c] border border-amber-500/40 rounded-xl px-2.5 py-1.5 shadow-lg cursor-pointer transition-colors"
        >
          <span className="text-base sm:text-lg leading-none">{currentUser.avatar}</span>
          <div className="text-left leading-tight">
            <div className="text-xs font-extrabold text-amber-100 max-w-[120px] sm:max-w-none truncate">
              {currentUser.name}
            </div>
            <div className="text-[10px] font-mono text-amber-400">
              ELO {currentUser.elo}
            </div>
          </div>
        </button>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onToggleMute}
            aria-label={t.toggleSound}
            title={t.toggleSound}
            className="p-2 rounded-xl bg-[#090d18]/92 hover:bg-slate-900 border border-amber-700/40 text-slate-200 cursor-pointer"
          >
            <Volume2 className={`w-4 h-4 ${isMuted ? 'text-slate-500' : 'text-emerald-400'}`} />
          </button>

          <button
            type="button"
            data-testid="open-onboarding-tour-btn"
            onClick={onStartOnboardingTour}
            className="px-2.5 sm:px-3 py-2 rounded-xl bg-[#090d18]/92 border border-amber-700/40 text-xs font-bold text-amber-300 hover:bg-slate-900 flex items-center gap-1.5 cursor-pointer"
          >
            <HelpCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="hidden sm:inline">{t.newbieGuide}</span>
          </button>

          <select
            value={lang}
            onChange={(e) => onChangeLanguage(e.target.value as Language)}
            aria-label="Select Language"
            data-testid="language-select"
            className="bg-[#090d18]/92 border border-amber-700/40 text-xs font-bold rounded-xl px-2.5 py-2 text-amber-100 focus:outline-none cursor-pointer"
          >
            <option value="vi">🇻🇳 Tiếng Việt</option>
            <option value="en">🇬🇧 English</option>
            <option value="fr">🇫🇷 Français</option>
            <option value="es">🇪🇸 Español</option>
            <option value="ja">🇯🇵 日本語</option>
          </select>
        </div>
      </div>

      {/* Bottom-Docked Clean Command Panel (No backdrop-blur over WebGL, 75%+ 3D scene open) */}
      <div
        data-testid="title-command-dock"
        className="mt-auto mx-auto w-full max-w-2xl pointer-events-auto bg-[#080c17]/95 border border-amber-500/45 rounded-2xl p-3 sm:p-4 shadow-2xl space-y-3"
      >
        {/* Header Row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <svg
              viewBox="0 0 80 80"
              className="w-8 h-8 sm:w-9 sm:h-9 shrink-0"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="bloodMoonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#fbbf24" />
                  <stop offset="55%" stopColor="#ef4444" />
                  <stop offset="100%" stopColor="#7f1d1d" />
                </linearGradient>
              </defs>
              <circle cx="40" cy="40" r="34" fill="url(#bloodMoonGrad)" opacity="0.95" />
              <circle cx="50" cy="32" r="24" fill="#080c17" />
              <path
                d="M22 62 L28 38 L34 24 L40 33 L48 22 L52 38 L60 46 L50 53 L53 66 Z"
                fill="#fef08a"
              />
            </svg>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg font-black tracking-wider text-amber-200 leading-none">
                  {t.appTitle}
                </h1>
                <span className="text-[11px] font-semibold text-slate-300">
                  {villageSize} {t.peopleUnit} · {selectedRoleLabel} · {timerPresetLabel}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate hidden sm:block mt-0.5">
                {t.appSubtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {!isTitleMenuMinimized && (
              <button
                type="button"
                data-testid="toggle-match-settings-btn"
                aria-expanded={settingsOpen}
                onClick={() => {
                  sound.playCardFlip();
                  setSettingsOpen((v) => !v);
                }}
                className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                  settingsOpen
                    ? 'bg-amber-500 text-slate-950 border-amber-300'
                    : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-amber-200'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">
                  {lang === 'vi' ? 'Cài đặt ván đấu' : 'Match Settings'}
                </span>
              </button>
            )}

            <button
              type="button"
              data-testid="toggle-title-menu-btn"
              onClick={onToggleMinimize}
              className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-amber-500/40 text-[11px] font-bold text-amber-300 flex items-center gap-1 cursor-pointer"
            >
              {isTitleMenuMinimized ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5" />
                  <span>{lang === 'vi' ? 'Mở Menu' : 'Expand'}</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">
                    {lang === 'vi' ? 'Ngắm 3D' : '3D View'}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>

        {!isTitleMenuMinimized && (
          <>
            {/* Collapsible Match Settings Drawer (Closed by Default) */}
            {settingsOpen && (
              <div
                data-testid="title-match-settings-panel"
                className="bg-[#0d1424] border border-slate-700/80 rounded-xl p-3 space-y-3"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block mb-1">
                      {t.selectRoleLabel}
                    </label>
                    <select
                      value={preferredRole}
                      onChange={(e) => onChangePreferredRole(e.target.value as RoleId | 'random')}
                      aria-label={t.selectRoleLabel}
                      className="w-full bg-[#070a14] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-100"
                    >
                      <option value="random">{t.randomBalancedRole}</option>
                      {Object.values(ROLES).map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name[lang]} ({r.badge})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block mb-1">
                      {t.villageScaleLabel} ({villageSize} {t.peopleUnit})
                    </label>
                    <div className="flex items-center gap-1">
                      {([6, 8, 10, 12] as const).map((cnt) => (
                        <button
                          key={cnt}
                          type="button"
                          onClick={() => {
                            sound.playCardFlip();
                            onChangeVillageSize(cnt);
                          }}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-extrabold border cursor-pointer ${
                            villageSize === cnt
                              ? 'bg-amber-500 text-slate-950 border-amber-400'
                              : 'bg-[#070a14] text-slate-300 border-slate-700 hover:border-amber-400/60'
                          }`}
                        >
                          {cnt}
                        </button>
                      ))}

                      <div className="flex items-center gap-0.5 bg-[#070a14] border border-amber-500/40 rounded-lg px-1 py-0.5 shrink-0">
                        <button
                          type="button"
                          data-testid="custom-player-count-dec"
                          disabled={villageSize <= 4}
                          onClick={() => onChangeVillageSize(Math.max(4, villageSize - 1))}
                          className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-35 text-slate-200 cursor-pointer"
                          aria-label="Decrease player count"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <input
                          type="number"
                          min={4}
                          max={20}
                          data-testid="custom-player-count-input"
                          aria-label="Player count"
                          value={villageSize}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            if (!Number.isNaN(val)) {
                              onChangeVillageSize(Math.max(4, Math.min(20, val)));
                            }
                          }}
                          className="w-9 text-center bg-slate-950 border border-slate-700 rounded py-0.5 text-xs font-mono font-extrabold text-amber-300"
                        />
                        <button
                          type="button"
                          data-testid="custom-player-count-inc"
                          disabled={villageSize >= 20}
                          onClick={() => onChangeVillageSize(Math.min(20, villageSize + 1))}
                          className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-35 text-slate-200 cursor-pointer"
                          aria-label="Increase player count"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Phase Timers (Clean Vietnamese / English Labels) */}
                <div className="border-t border-slate-800 pt-2.5 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400">
                      ⏱️ {lang === 'vi' ? 'Thời gian mỗi pha:' : 'Phase timers:'}
                    </span>
                    <button
                      type="button"
                      data-testid="title-timer-preset-fast"
                      onClick={() =>
                        onUpdateTimerConfig({
                          nightActionSec: 12,
                          botStepSec: 3,
                          dayDiscussSec: 20,
                          dayVoteSec: 15,
                          hunterShotSec: 15,
                        })
                      }
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border cursor-pointer ${
                        timerConfig.nightActionSec === 12
                          ? 'bg-amber-500 text-slate-950 border-amber-300'
                          : 'bg-slate-900 text-slate-300 border-slate-700'
                      }`}
                    >
                      {lang === 'vi' ? 'Nhanh (12s/20s)' : 'Fast'}
                    </button>
                    <button
                      type="button"
                      data-testid="title-timer-preset-standard"
                      onClick={() => onUpdateTimerConfig(DEFAULT_TIMER_CONFIG)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border cursor-pointer ${
                        timerConfig.nightActionSec === 20
                          ? 'bg-amber-500 text-slate-950 border-amber-300'
                          : 'bg-slate-900 text-slate-300 border-slate-700'
                      }`}
                    >
                      {lang === 'vi' ? 'Chuẩn (20s/35s)' : 'Standard'}
                    </button>
                    <button
                      type="button"
                      data-testid="title-timer-preset-relaxed"
                      onClick={() =>
                        onUpdateTimerConfig({
                          nightActionSec: 35,
                          botStepSec: 6,
                          dayDiscussSec: 75,
                          dayVoteSec: 45,
                          hunterShotSec: 30,
                        })
                      }
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border cursor-pointer ${
                        timerConfig.nightActionSec === 35
                          ? 'bg-amber-500 text-slate-950 border-amber-300'
                          : 'bg-slate-900 text-slate-300 border-slate-700'
                      }`}
                    >
                      {lang === 'vi' ? 'Thư thả (35s/75s)' : 'Relaxed'}
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5 text-[10px] text-slate-300">
                    <span>{lang === 'vi' ? 'Đêm:' : 'Night:'}</span>
                    <input
                      type="number"
                      min={5}
                      max={180}
                      data-testid="title-custom-night-sec-input"
                      value={timerConfig.nightActionSec}
                      onChange={(e) => {
                        const v = parseInt(e.target.value, 10);
                        if (!Number.isNaN(v)) {
                          onUpdateTimerConfig({
                            ...timerConfig,
                            nightActionSec: Math.max(5, Math.min(180, v)),
                          });
                        }
                      }}
                      className="w-11 bg-slate-950 border border-slate-700 rounded px-1 py-0.5 text-center font-mono font-bold text-amber-300"
                    />
                    <span>{lang === 'vi' ? 'Thảo luận:' : 'Debate:'}</span>
                    <input
                      type="number"
                      min={10}
                      max={600}
                      data-testid="title-custom-discuss-sec-input"
                      value={timerConfig.dayDiscussSec}
                      onChange={(e) => {
                        const v = parseInt(e.target.value, 10);
                        if (!Number.isNaN(v)) {
                          onUpdateTimerConfig({
                            ...timerConfig,
                            dayDiscussSec: Math.max(10, Math.min(600, v)),
                          });
                        }
                      }}
                      className="w-12 bg-slate-950 border border-slate-700 rounded px-1 py-0.5 text-center font-mono font-bold text-amber-300"
                    />
                  </div>
                </div>

                {/* Practice Faction Hint Toggle (OFF by default to avoid info leak) */}
                <label className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800 text-[11px] text-slate-300 cursor-pointer">
                  <span>
                    {lang === 'vi'
                      ? 'Chế độ Tập Chơi: Hiện số lượng Sói / Dân còn sống trên HUD'
                      : 'Practice Helper: Show exact Wolves / Villagers alive on HUD'}
                  </span>
                  <input
                    type="checkbox"
                    checked={showFactionHints}
                    onChange={onToggleFactionHints}
                    data-testid="toggle-faction-hints-checkbox"
                    className="accent-amber-500 w-4 h-4 cursor-pointer"
                  />
                </label>
              </div>
            )}

            {/* Clear Action Hierarchy: 1 Prominent Primary CTA + 2 Clean Secondary CTAs (Zero Truncation) */}
            <div className="space-y-2">
              <button
                type="button"
                data-start="true"
                data-testid="title-quick-play-ai-btn"
                onClick={onStartAIPractice}
                className="w-full py-2.5 sm:py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs sm:text-sm shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <Bot className="w-4 h-4 shrink-0" />
                <span>
                  {lang === 'vi' ? 'Chơi Nhanh Với AI' : 'Quick Play vs AI'}
                </span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  data-testid="title-play-online-btn"
                  onClick={() => {
                    sound.playCardFlip();
                    onOpenLobbyModal('online');
                  }}
                  className="py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Globe className="w-3.5 h-3.5 shrink-0" />
                  <span>{lang === 'vi' ? 'Chơi Online' : 'Play Online'}</span>
                </button>

                <button
                  type="button"
                  data-testid="title-play-gm-btn"
                  onClick={() => {
                    sound.playCardFlip();
                    onOpenLobbyModal('gm');
                  }}
                  className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-200 border border-amber-500/35 font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Shield className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                  <span>{lang === 'vi' ? 'Trợ Lý Quản Trò' : 'GM Assistant'}</span>
                </button>
              </div>
            </div>

            {/* Human-Friendly Account Strip (No technical "Database" jargon) */}
            <div className="pt-2 border-t border-slate-800/90 flex items-center justify-between gap-2 text-[11px]">
              <span className="text-slate-400 font-semibold hidden sm:inline">
                {lang === 'vi' ? 'Lưu ELO & lịch sử đấu:' : 'Save ELO & match history:'}
              </span>
              <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  data-testid="title-login-account-btn"
                  onClick={() => {
                    sound.playCardFlip();
                    onOpenAccountModal(isLoggedIn ? 'profile' : 'login');
                  }}
                  className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold cursor-pointer ${
                    isLoggedIn
                      ? 'bg-emerald-950 border-emerald-400 text-emerald-200'
                      : 'bg-slate-900 border-slate-700 text-amber-200 hover:border-amber-400'
                  }`}
                >
                  {isLoggedIn && currentUser.handle
                    ? `@${currentUser.handle}`
                    : lang === 'vi'
                    ? 'Đăng Nhập'
                    : 'Sign In'}
                </button>
                {!isLoggedIn && (
                  <button
                    type="button"
                    data-testid="title-register-account-btn"
                    onClick={() => {
                      sound.playCardFlip();
                      onOpenAccountModal('register');
                    }}
                    className="px-2.5 py-1 rounded-lg border bg-emerald-950/90 border-emerald-500/50 hover:border-emerald-400 text-emerald-200 text-[11px] font-bold cursor-pointer"
                  >
                    {lang === 'vi' ? 'Đăng Ký' : 'Create Account'}
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
