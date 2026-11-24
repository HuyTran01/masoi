import React, { useState } from 'react';
import {
  Bot,
  ChevronDown,
  ChevronUp,
  Globe,
  HelpCircle,
  Minus,
  Palette,
  Plus,
  Shield,
  SlidersHorizontal,
  Volume2,
} from 'lucide-react';
import { Language, RoleId } from '../types/game';
import { ROLES } from '../game/roles';
import { CustomTimerConfig, DEFAULT_TIMER_CONFIG } from '../game/autoGM';
import {
  AGROU_BIOMES,
  AGROU_HATS,
  AGROU_TITLES,
  AgrouAvatarConfig,
  AgrouMapBiome,
} from '../game/agrouMechanics';
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
  avatarConfig: AgrouAvatarConfig;
  onChangeBiome: (biome: AgrouMapBiome) => void;
  onOpenAvatarLocker: () => void;
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
  avatarConfig,
  onChangeBiome,
  onOpenAvatarLocker,
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

  const currentHatMeta = AGROU_HATS.find((h) => h.id === avatarConfig.hat);
  const currentTitleMeta = AGROU_TITLES.find((ti) => ti.id === avatarConfig.titleId);

  return (
    <div className="fixed inset-0 z-30 pointer-events-none flex flex-col justify-between p-2.5 sm:p-4">
      {/* Top Bar: Carved-Wood Profile + Quick Utilities */}
      <div className="flex items-center justify-between gap-2 pointer-events-auto">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            data-testid="title-profile-btn"
            onClick={() => {
              sound.playCardFlip();
              onOpenAccountModal(isLoggedIn ? 'profile' : 'login');
            }}
            className="flex items-center gap-2 agrou-wood-panel hover:border-[#f5b82e] rounded-xl px-2.5 py-1.5 cursor-pointer transition-colors"
          >
            <span className="text-base sm:text-lg leading-none">
              {currentHatMeta?.icon || currentUser.avatar}
            </span>
            <div className="text-left leading-tight">
              <div className="text-xs font-extrabold text-[#f6ebd8] max-w-[115px] sm:max-w-none truncate">
                {currentUser.name}
              </div>
              <div className="text-[10px] font-mono text-[#f5b82e]">
                ELO {currentUser.elo}
                {currentTitleMeta && (
                  <span className="hidden md:inline text-[#d6bfa2] font-sans ml-1">
                    · {currentTitleMeta.label[lang]}
                  </span>
                )}
              </div>
            </div>
          </button>

          {/* Agrou Locker & Map Selector Trigger */}
          <button
            type="button"
            data-testid="open-avatar-locker-btn"
            onClick={() => {
              sound.playCardFlip();
              onOpenAvatarLocker();
            }}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl bg-[#382517] hover:bg-[#49301e] border border-[#e89c3e]/75 text-[#fde7c3] text-xs font-extrabold shadow-lg cursor-pointer transition-colors"
          >
            <Palette className="w-4 h-4 text-[#f5b82e] shrink-0" />
            <span className="hidden sm:inline">
              {lang === 'vi' ? 'Tủ Đồ & Bản Đồ' : 'Locker & Maps'}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onToggleMute}
            aria-label={t.toggleSound}
            title={t.toggleSound}
            className="p-2 rounded-xl agrou-wood-panel hover:border-[#e89c3e] text-[#f6ebd8] cursor-pointer"
          >
            <Volume2 className={`w-4 h-4 ${isMuted ? 'text-[#8c7258]' : 'text-[#5cb85c]'}`} />
          </button>

          <button
            type="button"
            data-testid="open-onboarding-tour-btn"
            onClick={onStartOnboardingTour}
            className="px-2.5 sm:px-3 py-2 rounded-xl agrou-wood-panel hover:border-[#e89c3e] text-xs font-bold text-[#fde7c3] flex items-center gap-1.5 cursor-pointer"
          >
            <HelpCircle className="w-4 h-4 text-[#f5b82e] shrink-0" />
            <span className="hidden sm:inline">{t.newbieGuide}</span>
          </button>

          <select
            value={lang}
            onChange={(e) => onChangeLanguage(e.target.value as Language)}
            aria-label="Select Language"
            data-testid="language-select"
            className="agrou-wood-panel text-xs font-bold rounded-xl px-2.5 py-2 text-[#f6ebd8] focus:outline-none cursor-pointer"
          >
            <option value="vi">🇻🇳 Tiếng Việt</option>
            <option value="en">🇬🇧 English</option>
            <option value="fr">🇫🇷 Français</option>
            <option value="es">🇪🇸 Español</option>
            <option value="ja">🇯🇵 日本語</option>
          </select>
        </div>
      </div>

      {/* Bottom-Docked Agrou Carved-Wood Command Panel (Leaves 75%+ 3D Campfire Scene Open) */}
      <div
        data-testid="title-command-dock"
        className="mt-auto mx-auto w-full max-w-2xl pointer-events-auto agrou-wood-panel rounded-2xl p-3 sm:p-4 space-y-3"
      >
        {/* Header Row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Agrou-Inspired Wolf & Campfire Crest */}
            <svg
              viewBox="0 0 80 80"
              className="w-9 h-9 sm:w-10 sm:h-10 shrink-0"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="agrouEmberGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#fde047" />
                  <stop offset="50%" stopColor="#e86f24" />
                  <stop offset="100%" stopColor="#991b1b" />
                </linearGradient>
              </defs>
              <polygon
                points="40,5 70,22 70,58 40,75 10,58 10,22"
                fill="#22150d"
                stroke="#d9973b"
                strokeWidth="3.5"
              />
              <circle cx="40" cy="36" r="20" fill="url(#agrouEmberGrad)" opacity="0.92" />
              <path
                d="M24 58 L29 36 L34 23 L40 32 L46 23 L51 36 L57 44 L48 50 L50 61 L30 61 Z"
                fill="#24160e"
              />
              <circle cx="36" cy="39" r="2.2" fill="#fde047" />
              <circle cx="44" cy="39" r="2.2" fill="#fde047" />
            </svg>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-xl font-extrabold tracking-tight text-[#fde7c3] leading-none">
                  {t.appTitle}
                </h1>
                <span className="text-[11px] font-semibold text-[#d6bfa2]">
                  {villageSize} {t.peopleUnit} · {selectedRoleLabel} · {timerPresetLabel}
                </span>
              </div>
              <p className="text-[11px] text-[#bfa586] truncate hidden sm:block mt-0.5">
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
                    ? 'bg-[#e86f24] text-[#fff8ed] border-[#fbc266]'
                    : 'bg-[#1b120b] hover:bg-[#312115] border-[#785334] text-[#f6ebd8]'
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
              className="px-2.5 py-1.5 rounded-xl bg-[#1b120b] hover:bg-[#312115] border border-[#9c7248]/70 text-[11px] font-bold text-[#f5b82e] flex items-center gap-1 cursor-pointer"
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
            {/* Quick 3D Biome Selector Strip (Live 3D Switching right on the Title Screen!) */}
            <div className="flex items-center justify-between gap-2 bg-[#1a110a]/90 border border-[#6b4a2e]/70 rounded-xl px-2.5 py-1.5">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#d9a65d] shrink-0">
                🗺️ {lang === 'vi' ? 'Bản đồ 3D:' : '3D Map:'}
              </span>
              <div className="flex items-center gap-1 overflow-x-auto">
                {(['forest', 'frostpeak', 'autumn'] as AgrouMapBiome[]).map((bId) => {
                  const biome = AGROU_BIOMES[bId];
                  const active = avatarConfig.mapBiome === bId;
                  return (
                    <button
                      key={bId}
                      type="button"
                      data-testid={`title-biome-btn-${bId}`}
                      onClick={() => {
                        sound.playCardFlip();
                        onChangeBiome(bId);
                      }}
                      className={`px-2 py-1 rounded-lg text-[11px] font-extrabold border whitespace-nowrap cursor-pointer transition-colors ${
                        active
                          ? 'bg-[#e86f24] text-[#fff8ed] border-[#fbc266]'
                          : 'bg-[#2a1c12] text-[#d6bfa2] border-[#6b4a2e] hover:border-[#d9973b]'
                      }`}
                    >
                      {biome.icon} {biome.name[lang]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Collapsible Match Settings Drawer */}
            {settingsOpen && (
              <div
                data-testid="title-match-settings-panel"
                className="bg-[#1a110a] border border-[#785334] rounded-xl p-3 space-y-3"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#f5b82e] block mb-1">
                      {t.selectRoleLabel}
                    </label>
                    <select
                      value={preferredRole}
                      onChange={(e) => onChangePreferredRole(e.target.value as RoleId | 'random')}
                      aria-label={t.selectRoleLabel}
                      className="w-full bg-[#2a1c12] border border-[#785334] rounded-lg px-2.5 py-1.5 text-xs font-bold text-[#f6ebd8]"
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
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#f5b82e] block mb-1">
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
                              ? 'bg-[#e86f24] text-[#fff8ed] border-[#fbc266]'
                              : 'bg-[#2a1c12] text-[#d6bfa2] border-[#6b4a2e] hover:border-[#e89c3e]'
                          }`}
                        >
                          {cnt}
                        </button>
                      ))}

                      <div className="flex items-center gap-0.5 bg-[#2a1c12] border border-[#9c7248] rounded-lg px-1 py-0.5 shrink-0">
                        <button
                          type="button"
                          data-testid="custom-player-count-dec"
                          disabled={villageSize <= 4}
                          onClick={() => onChangeVillageSize(Math.max(4, villageSize - 1))}
                          className="p-1 rounded bg-[#3b281a] hover:bg-[#4e3624] disabled:opacity-35 text-[#f6ebd8] cursor-pointer"
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
                          className="w-9 text-center bg-[#1a110a] border border-[#6b4a2e] rounded py-0.5 text-xs font-mono font-extrabold text-[#f5b82e]"
                        />
                        <button
                          type="button"
                          data-testid="custom-player-count-inc"
                          disabled={villageSize >= 20}
                          onClick={() => onChangeVillageSize(Math.min(20, villageSize + 1))}
                          className="p-1 rounded bg-[#3b281a] hover:bg-[#4e3624] disabled:opacity-35 text-[#f6ebd8] cursor-pointer"
                          aria-label="Increase player count"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Phase Timers */}
                <div className="border-t border-[#5a3d25] pt-2.5 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#f5b82e]">
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
                          ? 'bg-[#e86f24] text-[#fff8ed] border-[#fbc266]'
                          : 'bg-[#2a1c12] text-[#d6bfa2] border-[#6b4a2e]'
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
                          ? 'bg-[#e86f24] text-[#fff8ed] border-[#fbc266]'
                          : 'bg-[#2a1c12] text-[#d6bfa2] border-[#6b4a2e]'
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
                          ? 'bg-[#e86f24] text-[#fff8ed] border-[#fbc266]'
                          : 'bg-[#2a1c12] text-[#d6bfa2] border-[#6b4a2e]'
                      }`}
                    >
                      {lang === 'vi' ? 'Thư thả (35s/75s)' : 'Relaxed'}
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5 text-[10px] text-[#d6bfa2]">
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
                      className="w-11 bg-[#2a1c12] border border-[#6b4a2e] rounded px-1 py-0.5 text-center font-mono font-bold text-[#f5b82e]"
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
                      className="w-12 bg-[#2a1c12] border border-[#6b4a2e] rounded px-1 py-0.5 text-center font-mono font-bold text-[#f5b82e]"
                    />
                  </div>
                </div>

                <label className="flex items-center justify-between gap-2 pt-2 border-t border-[#5a3d25] text-[11px] text-[#d6bfa2] cursor-pointer">
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
                    className="accent-[#e86f24] w-4 h-4 cursor-pointer"
                  />
                </label>
              </div>
            )}

            {/* Primary Campfire Ember CTA + 2 Warm Secondary CTAs */}
            <div className="space-y-2">
              <button
                type="button"
                data-start="true"
                data-testid="title-quick-play-ai-btn"
                onClick={onStartAIPractice}
                className="w-full py-2.5 sm:py-3 px-4 rounded-xl bg-[#e86f24] hover:bg-[#f28139] border border-[#fbc266] text-[#fffaf0] font-extrabold text-xs sm:text-sm shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <Bot className="w-4 h-4 shrink-0" />
                <span>
                  {lang === 'vi' ? 'Vào Làng Quanh Lửa Trại (AI)' : 'Play Around Campfire (AI)'}
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
                  className="py-2 px-3 rounded-xl bg-[#9e2b25] hover:bg-[#b8362f] border border-[#e67367]/60 text-[#fff5f2] font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
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
                  className="py-2 px-3 rounded-xl bg-[#362417] hover:bg-[#49311f] text-[#fde7c3] border border-[#9c7248] font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Shield className="w-3.5 h-3.5 shrink-0 text-[#f5b82e]" />
                  <span>{lang === 'vi' ? 'Trợ Lý Quản Trò' : 'GM Assistant'}</span>
                </button>
              </div>
            </div>

            {/* Account Strip */}
            <div className="pt-2 border-t border-[#5a3d25] flex items-center justify-between gap-2 text-[11px]">
              <span className="text-[#bfa586] font-semibold hidden sm:inline">
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
                      ? 'bg-[#1c3621] border-[#6ee7b7] text-[#d1fae5]'
                      : 'bg-[#1c130c] border-[#785334] text-[#fde7c3] hover:border-[#e89c3e]'
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
                    className="px-2.5 py-1 rounded-lg border bg-[#1c3621] border-[#5cb85c]/70 hover:border-[#86efac] text-[#dcfce7] text-[11px] font-bold cursor-pointer"
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
