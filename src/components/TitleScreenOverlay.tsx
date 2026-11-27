import React, { useEffect, useRef, useState } from 'react';
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
  VolumeX,
} from 'lucide-react';
import { Language, RoleId, StorylineId } from '../types/game';
import { getRoleBadge, ROLES } from '../game/roles';
import { CustomTimerConfig, DEFAULT_TIMER_CONFIG } from '../game/autoGM';
import { STORYLINE_CATALOG, STORYLINE_LIST } from '../game/smartAI';
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
import { BIOME_DESCRIPTIONS, BiomeThumbSvg } from './BiomeThumbSvg';

interface TitleScreenOverlayProps {
  lang: Language;
  isMuted: boolean;
  currentUser: UserProfileData;
  villageSize: number;
  preferredRole: RoleId | 'random';
  preferredStoryline?: StorylineId;
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
  onChangePreferredStoryline?: (id: StorylineId) => void;
  onUpdateTimerConfig: (next: CustomTimerConfig) => void;
  onToggleFactionHints: () => void;
  onOpenAccountModal: (tab: AccountModalTab) => void;
  onOpenLobbyModal: (mode: 'online' | 'gm') => void;
  onStartAIPractice: () => void;
  onStartOnboardingTour: () => void;
  onOpenRulesEncyclopedia?: () => void;
  onMinimizedChange?: (minimized: boolean) => void;
}

interface NumericDraftInputProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    'type' | 'value' | 'onChange' | 'min' | 'max'
  > {
  value: number;
  min: number;
  max: number;
  onCommit: (next: number) => void;
}

const NumericDraftInput: React.FC<NumericDraftInputProps> = ({
  value,
  min,
  max,
  onCommit,
  onBlur,
  onFocus,
  onKeyDown,
  ...rest
}) => {
  const [draft, setDraft] = useState<string>(String(value));
  const [focused, setFocused] = useState<boolean>(false);
  const skipNextBlurRef = useRef<boolean>(false);

  useEffect(() => {
    if (!focused) setDraft(String(value));
  }, [value, focused]);

  const commit = (raw: string) => {
    const parsed = parseInt(raw, 10);
    if (Number.isNaN(parsed)) {
      setDraft(String(value));
      return;
    }
    const clamped = Math.max(min, Math.min(max, parsed));
    setDraft(String(clamped));
    if (clamped !== value) onCommit(clamped);
  };

  return (
    <input
      {...rest}
      type="number"
      min={min}
      max={max}
      value={draft}
      onFocus={(e) => {
        skipNextBlurRef.current = false;
        setFocused(true);
        onFocus?.(e);
      }}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={(e) => {
        setFocused(false);
        if (skipNextBlurRef.current) {
          skipNextBlurRef.current = false;
        } else {
          commit(e.currentTarget.value);
        }
        onBlur?.(e);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          skipNextBlurRef.current = true;
          commit(e.currentTarget.value);
          e.currentTarget.blur();
        } else if (e.key === 'Escape') {
          skipNextBlurRef.current = true;
          setDraft(String(value));
          e.currentTarget.blur();
        }
        onKeyDown?.(e);
      }}
    />
  );
};

export const TitleScreenOverlay: React.FC<TitleScreenOverlayProps> = ({
  lang,
  isMuted,
  currentUser,
  villageSize,
  preferredRole,
  preferredStoryline = 'random_dramatic',
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
  onChangePreferredStoryline,
  onUpdateTimerConfig,
  onToggleFactionHints,
  onOpenAccountModal,
  onOpenLobbyModal,
  onStartAIPractice,
  onStartOnboardingTour,
  onOpenRulesEncyclopedia,
  onMinimizedChange,
}) => {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [guideMenuOpen, setGuideMenuOpen] = useState(false);
  const guideMenuRef = useRef<HTMLDivElement>(null);
  const onMinimizedChangeRef = useRef(onMinimizedChange);
  onMinimizedChangeRef.current = onMinimizedChange;
  const t = UI_TEXT[lang];

  useEffect(() => {
    onMinimizedChangeRef.current?.(isTitleMenuMinimized);
  }, [isTitleMenuMinimized]);

  useEffect(() => {
    return () => {
      onMinimizedChangeRef.current?.(false);
    };
  }, []);

  useEffect(() => {
    if (!guideMenuOpen) return;
    const handlePointerDown = (e: Event) => {
      if (guideMenuRef.current && !guideMenuRef.current.contains(e.target as Node)) {
        setGuideMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setGuideMenuOpen(false);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [guideMenuOpen]);

  const isLoggedIn = Boolean(
    currentUser.provider && currentUser.provider !== 'guest' && currentUser.handle
  );

  const selectedRoleLabel =
    preferredRole === 'random'
      ? t.randomRoleShort
      : ROLES[preferredRole]?.name[lang] || preferredRole;

  const timerPresetLabel =
    timerConfig.nightActionSec <= 15
      ? t.presetFast
      : timerConfig.nightActionSec >= 35
      ? t.presetRelaxed
      : t.presetStandard;

  const currentHatMeta = AGROU_HATS.find((h) => h.id === avatarConfig.hat);
  const currentTitleMeta = AGROU_TITLES.find((ti) => ti.id === avatarConfig.titleId);

  return (
    <div className="fixed inset-0 z-[45] pointer-events-none flex flex-col justify-between p-2 sm:p-4">
      {/* Top Bar: Carved-Wood Profile + Quick Utilities */}
      <div className="flex items-center justify-between gap-1.5 sm:gap-2 pointer-events-auto">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <button
            type="button"
            data-testid="title-profile-btn"
            aria-label={`${t.changeProfile} ${currentUser.name}`}
            onClick={() => {
              sound.playCardFlip();
              onOpenAccountModal(isLoggedIn ? 'profile' : 'login');
            }}
            className="flex items-center gap-1.5 sm:gap-2 agrou-wood-panel hover:border-[#f5b82e] rounded-xl px-2 py-1 sm:px-2.5 sm:py-1.5 cursor-pointer transition-colors min-w-0"
          >
            <span className="text-base sm:text-lg leading-none shrink-0">
              {currentHatMeta?.icon || currentUser.avatar}
            </span>
            <div className="text-left leading-tight min-w-0">
              <div className="text-[11px] sm:text-xs font-extrabold text-[#f6ebd8] max-w-[88px] sm:max-w-none truncate">
                {currentUser.name}
              </div>
              <div className="text-[10px] font-mono text-[#f5b82e] whitespace-nowrap">
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
            aria-label={t.lockerAndMaps}
            onClick={() => {
              sound.playCardFlip();
              onOpenAvatarLocker();
            }}
            className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-[#382517] hover:bg-[#49301e] border border-[#e89c3e]/75 text-[#fde7c3] text-xs font-extrabold shadow-lg cursor-pointer transition-colors shrink-0"
          >
            <Palette className="w-4 h-4 text-[#f5b82e] shrink-0" />
            <span className="hidden sm:inline whitespace-nowrap">
              {t.lockerAndMaps}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onToggleMute}
            aria-label={t.toggleSound}
            aria-pressed={isMuted}
            title={t.toggleSound}
            className="p-1.5 sm:p-2 rounded-xl agrou-wood-panel hover:border-[#e89c3e] text-[#f6ebd8] cursor-pointer shrink-0"
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4 text-[#c7ae8e]" />
            ) : (
              <Volume2 className="w-4 h-4 text-[#5cb85c]" />
            )}
          </button>

          <div className="relative shrink-0" ref={guideMenuRef}>
            <button
              type="button"
              data-testid="open-onboarding-tour-btn"
              aria-expanded={guideMenuOpen}
              title={t.newbieGuide}
              aria-label={t.newbieGuide}
              onClick={() => {
                sound.playCardFlip();
                setGuideMenuOpen((v) => !v);
              }}
              className="px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl agrou-wood-panel hover:border-[#e89c3e] text-xs font-bold text-[#fde7c3] flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <HelpCircle className="w-4 h-4 text-[#f5b82e] shrink-0" />
              <span className="hidden sm:inline whitespace-nowrap">{t.newbieGuide}</span>
            </button>

            {guideMenuOpen && (
              <div
                data-testid="guide-options-menu"
                className="absolute right-0 mt-1.5 w-64 agrou-wood-panel !border-[#e89c3e] rounded-2xl p-2 shadow-2xl space-y-1.5 z-50"
              >
                <button
                  type="button"
                  data-testid="guide-option-rules-btn"
                  onClick={() => {
                    sound.playCardFlip();
                    setGuideMenuOpen(false);
                    if (onOpenRulesEncyclopedia) {
                      onOpenRulesEncyclopedia();
                    } else {
                      onStartOnboardingTour();
                    }
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl bg-[#2a1c12] hover:bg-[#3d2818] border border-[#785334] text-xs font-extrabold text-[#fde7c3] cursor-pointer"
                >
                  <div>📖 {t.quickRulesTitle}</div>
                  <div className="text-[11px] font-normal text-[#d6bfa2] mt-0.5">
                    {t.quickRulesDesc}
                  </div>
                </button>
                <button
                  type="button"
                  data-testid="guide-option-tutorial-btn"
                  onClick={() => {
                    sound.playCardFlip();
                    setGuideMenuOpen(false);
                    onStartOnboardingTour();
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl bg-[#422614] hover:bg-[#57321a] border border-[#e89c3e]/80 text-xs font-extrabold text-[#fff4de] cursor-pointer"
                >
                  <div>🧭 {t.playTutorialTitle}</div>
                  <div className="text-[11px] font-normal text-[#fde7c3]/85 mt-0.5">
                    {t.playTutorialDesc}
                  </div>
                </button>
              </div>
            )}
          </div>

          <select
            value={lang}
            onChange={(e) => onChangeLanguage(e.target.value as Language)}
            aria-label="Select Language"
            data-testid="language-select"
            className="agrou-wood-panel text-[11px] sm:text-xs font-bold rounded-xl px-2 py-1.5 sm:px-2.5 sm:py-2 text-[#f6ebd8] focus:outline-none cursor-pointer whitespace-nowrap shrink-0"
          >
            <option value="vi">🇻🇳 Tiếng Việt</option>
            <option value="en">🇬🇧 English</option>
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
                aria-label={t.matchSettings}
                onClick={() => {
                  sound.playCardFlip();
                  setSettingsOpen((v) => !v);
                }}
                className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                  settingsOpen
                    ? 'bg-[#b84b10] hover:bg-[#9e3f0c] text-[#ffffff] border-[#fbc266]'
                    : 'bg-[#1b120b] hover:bg-[#312115] border-[#785334] text-[#f6ebd8]'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t.matchSettings}</span>
              </button>
            )}

            <button
              type="button"
              data-testid="toggle-title-menu-btn"
              aria-label={isTitleMenuMinimized ? t.expandMenuBtn : t.view3dBtn}
              onClick={onToggleMinimize}
              className="px-2.5 py-1.5 rounded-xl bg-[#1b120b] hover:bg-[#312115] border border-[#9c7248]/70 text-[11px] font-bold text-[#f5b82e] flex items-center gap-1 cursor-pointer"
            >
              {isTitleMenuMinimized ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5" />
                  <span>{t.expandMenuBtn}</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{t.view3dBtn}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {!isTitleMenuMinimized && (
          <>
            {/* Quick 3D Biome Selector Strip with Preview Thumbnails & Descriptions (BUG-25) */}
            <div className="bg-[#1a110a]/90 border border-[#6b4a2e]/70 rounded-xl p-2 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#f5b82e]">
                  🗺️ {t.campfireMapLabel}:
                </span>
                <span className="text-[11px] text-[#e6d5b8] truncate hidden sm:inline">
                  {BIOME_DESCRIPTIONS[avatarConfig.mapBiome][lang]}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                {(['forest', 'frostpeak', 'autumn'] as AgrouMapBiome[]).map((bId) => {
                  const biome = AGROU_BIOMES[bId];
                  const active = avatarConfig.mapBiome === bId;
                  return (
                    <button
                      key={bId}
                      type="button"
                      data-testid={`title-biome-btn-${bId}`}
                      title={BIOME_DESCRIPTIONS[bId][lang]}
                      onClick={() => {
                        sound.playCardFlip();
                        onChangeBiome(bId);
                      }}
                      className={`p-1.5 rounded-xl border text-left flex items-center gap-2 sm:gap-1.5 cursor-pointer transition-colors min-w-0 ${
                        active
                          ? 'bg-[#e86f24]/25 text-[#fff8ed] border-[#fbc266]'
                          : 'bg-[#2a1c12] text-[#e6d5b8] border-[#6b4a2e] hover:border-[#d9973b]'
                      }`}
                    >
                      <BiomeThumbSvg biome={bId} className="w-9 h-6 rounded border border-white/15 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="text-[11px] font-extrabold leading-snug whitespace-normal">
                          {biome.icon} {biome.name[lang]}
                        </div>
                        <div className="text-[9px] text-[#d6bfa2] truncate sm:hidden md:block">
                          {BIOME_DESCRIPTIONS[bId][lang]}
                        </div>
                      </div>
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
                          {`${r.name[lang] || r.name.en} (${getRoleBadge(r.id, lang)})`}
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
                              ? 'bg-[#b84b10] hover:bg-[#9e3f0c] text-[#ffffff] border-[#fbc266]'
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
                          className="p-1.5 min-w-[32px] min-h-[32px] flex items-center justify-center rounded bg-[#3b281a] hover:bg-[#4e3624] disabled:opacity-35 text-[#f6ebd8] cursor-pointer"
                          aria-label="Decrease player count"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <NumericDraftInput
                          min={4}
                          max={20}
                          data-testid="custom-player-count-input"
                          aria-label="Player count"
                          value={villageSize}
                          onCommit={onChangeVillageSize}
                          className="w-9 text-center bg-[#1a110a] border border-[#6b4a2e] rounded py-1 text-xs font-mono font-extrabold text-[#f5b82e]"
                        />
                        <button
                          type="button"
                          data-testid="custom-player-count-inc"
                          disabled={villageSize >= 20}
                          onClick={() => onChangeVillageSize(Math.min(20, villageSize + 1))}
                          className="p-1.5 min-w-[32px] min-h-[32px] flex items-center justify-center rounded bg-[#3b281a] hover:bg-[#4e3624] disabled:opacity-35 text-[#f6ebd8] cursor-pointer"
                          aria-label="Increase player count"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* AI Storyline Selector (8 Selectable Dramatic Storylines) */}
                {onChangePreferredStoryline && (
                  <div className="border-t border-[#5a3d25] pt-2.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#f5b82e] block mb-1">
                      🎭 {t.storylineLabel}
                    </label>
                    <select
                      data-testid="storyline-select"
                      aria-label={t.storylineLabel}
                      value={preferredStoryline}
                      onChange={(e) => {
                        sound.playCardFlip();
                        onChangePreferredStoryline(e.target.value as StorylineId);
                      }}
                      className="w-full bg-[#2a1c12] border border-[#785334] rounded-lg px-2.5 py-1.5 text-xs font-bold text-[#f6ebd8]"
                    >
                      {STORYLINE_LIST.map((st) => (
                        <option key={st.id} value={st.id}>
                          {st.label[lang] || st.label.vi}
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-[#d6bfa2] mt-1 leading-snug">
                      {STORYLINE_CATALOG[preferredStoryline]?.description[lang] ||
                        STORYLINE_CATALOG[preferredStoryline]?.description.vi}
                    </p>
                  </div>
                )}

                {/* Phase Timers */}
                <div className="border-t border-[#5a3d25] pt-2.5 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#f5b82e]">
                      ⏱️ {t.phaseTimers}:
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
                        })
                      }
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border cursor-pointer ${
                        timerConfig.nightActionSec === 12
                          ? 'bg-[#b84b10] hover:bg-[#9e3f0c] text-[#ffffff] border-[#fbc266]'
                          : 'bg-[#2a1c12] text-[#d6bfa2] border-[#6b4a2e]'
                      }`}
                    >
                      {lang === 'vi' ? `${t.presetFast} (12s/20s)` : t.presetFast}
                    </button>
                    <button
                      type="button"
                      data-testid="title-timer-preset-standard"
                      onClick={() => onUpdateTimerConfig(DEFAULT_TIMER_CONFIG)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border cursor-pointer ${
                        timerConfig.nightActionSec === 20
                          ? 'bg-[#b84b10] hover:bg-[#9e3f0c] text-[#ffffff] border-[#fbc266]'
                          : 'bg-[#2a1c12] text-[#d6bfa2] border-[#6b4a2e]'
                      }`}
                    >
                      {lang === 'vi' ? `${t.presetStandard} (20s/35s)` : t.presetStandard}
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
                        })
                      }
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border cursor-pointer ${
                        timerConfig.nightActionSec === 35
                          ? 'bg-[#b84b10] hover:bg-[#9e3f0c] text-[#ffffff] border-[#fbc266]'
                          : 'bg-[#2a1c12] text-[#d6bfa2] border-[#6b4a2e]'
                      }`}
                    >
                      {lang === 'vi' ? `${t.presetRelaxed} (35s/75s)` : t.presetRelaxed}
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5 text-[10px] text-[#d6bfa2]">
                    <span>{t.nightLabel}:</span>
                    <NumericDraftInput
                      min={5}
                      max={180}
                      data-testid="title-custom-night-sec-input"
                      aria-label={`${t.nightLabel} (s)`}
                      value={timerConfig.nightActionSec}
                      onCommit={(v) =>
                        onUpdateTimerConfig({
                          ...timerConfig,
                          nightActionSec: v,
                        })
                      }
                      className="w-11 bg-[#2a1c12] border border-[#6b4a2e] rounded px-1 py-0.5 text-center font-mono font-bold text-[#f5b82e]"
                    />
                    <span>{t.debateLabel}:</span>
                    <NumericDraftInput
                      min={10}
                      max={600}
                      data-testid="title-custom-discuss-sec-input"
                      aria-label={`${t.debateLabel} (s)`}
                      value={timerConfig.dayDiscussSec}
                      onCommit={(v) =>
                        onUpdateTimerConfig({
                          ...timerConfig,
                          dayDiscussSec: v,
                        })
                      }
                      className="w-12 bg-[#2a1c12] border border-[#6b4a2e] rounded px-1 py-0.5 text-center font-mono font-bold text-[#f5b82e]"
                    />
                  </div>
                </div>

                <label className="flex items-center justify-between gap-2 pt-2 border-t border-[#5a3d25] text-[11px] text-[#d6bfa2] cursor-pointer">
                  <span>{t.practiceHelper}</span>
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
                className="w-full py-2.5 sm:py-3 px-4 rounded-xl bg-[#b84b10] hover:bg-[#9e3f0c] border border-[#fbc266] text-[#ffffff] font-extrabold text-xs sm:text-sm shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <Bot className="w-4 h-4 shrink-0" />
                <span>{t.playCampfireAi}</span>
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
                  <span>{t.playOnline}</span>
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
                  <span>{t.gmAssistant}</span>
                </button>
              </div>
            </div>

            {/* Account Strip */}
            <div className="pt-2 border-t border-[#5a3d25] flex items-center justify-between gap-2 text-[11px]">
              <span className="text-[#bfa586] font-semibold hidden sm:inline">
                {t.saveEloHint}
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
                  {isLoggedIn && currentUser.handle ? `@${currentUser.handle}` : t.signIn}
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
                    {t.createAccount}
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
