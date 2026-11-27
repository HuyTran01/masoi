import React, { useEffect, useState } from 'react';
import { Check, Map, Palette, RotateCw, Sparkles, X } from 'lucide-react';
import { Language } from '../types/game';
import {
  AGROU_BIOMES,
  AGROU_CLOAK_COLORS,
  AGROU_HATS,
  AGROU_TITLES,
  AgrouAvatarConfig,
  AgrouHatId,
  AgrouMapBiome,
} from '../game/agrouMechanics';
import { sound } from '../utils/sound';
import { AvatarPreview3D } from './AvatarPreview3D';
import { BIOME_DESCRIPTIONS, BiomeThumbSvg } from './BiomeThumbSvg';

const LOCKER_TEXT = {
  vi: {
    lockerTitle: 'Tủ Đồ Nhân Vật & Bản Đồ 3D',
    lockerSubtitle: 'Xem trực tiếp nhân vật 3D đứng bên cạnh khi đổi mũ, áo choàng và bản đồ',
    lockerClose: 'Đóng Tủ Đồ',
    lockerDrag: 'Kéo để xoay 360°',
    lockerHats: '1. Mũ & Phụ Kiện Đầu 3D',
    lockerCloak: '2. Màu Áo Choàng',
    lockerMap: '3. Bản Đồ Lửa Trại 3D',
    lockerTitles: '4. Danh Hiệu Lửa Trại',
    lockerSave: 'Lưu & Quay Lại Lửa Trại',
  },
  en: {
    lockerTitle: '3D Character Locker & Maps',
    lockerSubtitle: 'Preview your standing 3D character live as you customize hat, cloak & map',
    lockerClose: 'Close Locker',
    lockerDrag: 'Drag to spin 360°',
    lockerHats: '1. 3D Headgear & Hats',
    lockerCloak: '2. Cloak Color',
    lockerMap: '3. 3D Campfire Map',
    lockerTitles: '4. Campfire Title',
    lockerSave: 'Save & Return to Campfire',
  },
} as const;

interface AgrouAvatarLockerModalProps {
  isOpen: boolean;
  lang: Language;
  config: AgrouAvatarConfig;
  playerName: string;
  onChange: (next: AgrouAvatarConfig) => void;
  onClose: () => void;
}

export const AgrouAvatarLockerModal: React.FC<AgrouAvatarLockerModalProps> = ({
  isOpen,
  lang,
  config,
  playerName,
  onChange,
  onClose,
}) => {
  const L = LOCKER_TEXT[lang];
  const [draftHat, setDraftHat] = useState<AgrouHatId>(config.hat);
  const [draftCloak, setDraftCloak] = useState<number>(config.cloakColor);
  const [draftBiome, setDraftBiome] = useState<AgrouMapBiome>(config.mapBiome);
  const [draftTitle, setDraftTitle] = useState<string>(config.titleId);

  useEffect(() => {
    if (!isOpen) return;
    setDraftHat(config.hat);
    setDraftCloak(config.cloakColor);
    setDraftBiome(config.mapBiome);
    setDraftTitle(config.titleId);
  }, [isOpen, config.hat, config.cloakColor, config.mapBiome, config.titleId]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        sound.playCardFlip();
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const activeTitle =
    AGROU_TITLES.find((t) => t.id === draftTitle)?.label[lang] ||
    AGROU_TITLES[0].label[lang];
  const activeHat = AGROU_HATS.find((h) => h.id === draftHat) || AGROU_HATS[0];
  const activeCloak =
    AGROU_CLOAK_COLORS.find((c) => c.hex === draftCloak) || AGROU_CLOAK_COLORS[0];

  const handleDiscardAndClose = () => {
    sound.playCardFlip();
    onClose();
  };

  const handleSaveAndClose = () => {
    sound.playCardFlip();
    onChange({
      hat: draftHat,
      cloakColor: draftCloak,
      mapBiome: draftBiome,
      titleId: draftTitle,
    });
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={L.lockerTitle}
      data-testid="agrou-avatar-locker-modal"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleDiscardAndClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-5 pointer-events-auto"
      style={{ backgroundColor: 'rgba(10, 7, 4, 0.72)' }}
    >
      <div className="agrou-wood-panel w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-2xl p-3.5 sm:p-5 pb-0 sm:pb-0 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#6b4728]/70 pb-2.5 mb-3 gap-2">
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-extrabold text-[#fce8c3] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#f59e0b] shrink-0" />
              <span>{L.lockerTitle}</span>
            </h2>
            <p className="text-[11px] text-[#c7ae8e]">
              {L.lockerSubtitle}
            </p>
          </div>
          <button
            type="button"
            data-testid="close-avatar-locker-btn"
            onClick={handleDiscardAndClose}
            aria-label={L.lockerClose}
            className="p-1.5 rounded-xl bg-[#2f2117] hover:bg-[#422f20] border border-[#7c532e] text-[#f6ebd8] cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 2-Column Side-by-Side Layout: Left = Standing 3D Character Preview, Right = Controls */}
        <div className="grid grid-cols-1 md:grid-cols-[290px_1fr] lg:grid-cols-[330px_1fr] gap-3.5 sm:gap-4 items-stretch pb-3">
          {/* LEFT COLUMN: Live Standing 3D Character Turntable */}
          <div className="flex flex-col gap-2 bg-[#1c130c]/90 border border-[#6a482b] rounded-2xl p-2">
            <div className="relative h-44 sm:h-56 md:h-full md:min-h-[340px]">
              <AvatarPreview3D
                hat={draftHat}
                cloakColor={draftCloak}
                mapBiome={draftBiome}
                playerName={playerName}
                lang={lang}
              />
              <div className="pointer-events-none absolute top-2 left-2 px-2 py-0.5 rounded-lg bg-[#160f09]/85 border border-[#8e6338]/70 text-[10px] font-bold text-[#fde7c3] flex items-center gap-1">
                <RotateCw className="w-3 h-3 text-[#f59e0b]" />
                <span>{L.lockerDrag}</span>
              </div>
              <div className="pointer-events-none absolute bottom-2 inset-x-2 px-2.5 py-1 rounded-xl bg-[#160f09]/90 border border-[#7c532e]/80 text-center">
                <div className="text-xs font-extrabold text-[#fff4de] truncate">{playerName}</div>
                <div className="text-[10px] font-bold text-[#f2be6b] truncate">{activeTitle}</div>
              </div>
            </div>

            {/* Active Outfit Summary Pills */}
            <div className="grid grid-cols-2 gap-1.5 text-[10px]">
              <div className="px-2 py-1 rounded-xl bg-[#261a11] border border-[#5a3d24] flex items-center gap-1.5 min-w-0">
                <span>{activeHat.icon}</span>
                <span className="font-bold text-[#f3dfc0] truncate">{activeHat.label[lang]}</span>
              </div>
              <div className="px-2 py-1 rounded-xl bg-[#261a11] border border-[#5a3d24] flex items-center gap-1.5 min-w-0">
                <span
                  className="w-3.5 h-3.5 rounded-full border border-[#f6ebd8]/60 shrink-0"
                  style={{ backgroundColor: activeCloak.cssHex }}
                />
                <span className="font-bold text-[#f3dfc0] truncate">{activeCloak.label[lang]}</span>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Customization Controls */}
          <div className="space-y-3">
            {/* 1. 3D Low-Poly Hat Selector */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-extrabold text-[#f2be6b]">
                {L.lockerHats}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {AGROU_HATS.map((hat) => {
                  const isSelected = draftHat === hat.id;
                  return (
                    <button
                      key={hat.id}
                      type="button"
                      data-testid={`locker-hat-${hat.id}`}
                      onClick={() => {
                        sound.playCardFlip();
                        setDraftHat(hat.id);
                      }}
                      className={`px-2 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-[#d96b27] border-[#ffd089] text-[#1a0f08]'
                          : 'bg-[#221710] border-[#593c23] text-[#e8d5b9] hover:border-[#a87238]'
                      }`}
                    >
                      <span>{hat.icon}</span>
                      <span className="truncate">{hat.label[lang]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Medieval Cloak Color Swatches */}
            <div className="space-y-1.5 pt-2 border-t border-[#593c23]/70">
              <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-[#f2be6b]">
                <Palette className="w-3.5 h-3.5" />
                <span>{L.lockerCloak}</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {AGROU_CLOAK_COLORS.map((swatch) => {
                  const isSelected = draftCloak === swatch.hex;
                  return (
                    <button
                      key={swatch.id}
                      type="button"
                      data-testid={`locker-cloak-${swatch.id}`}
                      onClick={() => {
                        sound.playCardFlip();
                        setDraftCloak(swatch.hex);
                      }}
                      className={`p-1.5 rounded-xl border flex flex-col items-center gap-1 cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-[#3d2817] border-[#f59e0b]'
                          : 'bg-[#221710] border-[#593c23] hover:border-[#a87238]'
                      }`}
                    >
                      <span
                        className="w-5 h-5 rounded-full border-2 border-[#f6ebd8]/60 shadow-inner"
                        style={{ backgroundColor: swatch.cssHex }}
                      />
                      <span className="text-[9px] font-bold text-[#e8d5b9] truncate max-w-full">
                        {swatch.label[lang]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Map Biome Selector (Live 3D Preview) */}
            <div className="space-y-1.5 pt-2 border-t border-[#593c23]/70">
              <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-[#f2be6b]">
                <Map className="w-3.5 h-3.5" />
                <span>{L.lockerMap}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {(Object.keys(AGROU_BIOMES) as AgrouMapBiome[]).map((bKey) => {
                  const biome = AGROU_BIOMES[bKey];
                  const isSelected = draftBiome === bKey;
                  return (
                    <button
                      key={bKey}
                      type="button"
                      data-testid={`locker-biome-${bKey}`}
                      onClick={() => {
                        sound.playCardFlip();
                        setDraftBiome(bKey);
                      }}
                      className={`w-full text-left p-2 rounded-xl border transition-all flex sm:flex-col items-center sm:items-stretch justify-between gap-2 cursor-pointer ${
                        isSelected
                          ? 'bg-[#462d18] border-[#f59e0b] text-[#fff6e5]'
                          : 'bg-[#221710] border-[#593c23] text-[#e6d5b8] hover:border-[#a87238]'
                      }`}
                    >
                      <div className="flex sm:w-full items-center justify-between gap-2 shrink-0">
                        <BiomeThumbSvg
                          biome={bKey}
                          className="w-11 h-7 sm:w-12 sm:h-7 rounded-md border border-white/15 shrink-0"
                        />
                        {isSelected && <Check className="w-3.5 h-3.5 text-[#f59e0b] shrink-0 hidden sm:block" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[11px] font-extrabold leading-snug whitespace-normal break-words">
                          {biome.icon} {biome.name[lang]}
                        </div>
                        <div className="text-[10px] text-[#d6bfa2] leading-snug line-clamp-2 mt-0.5">
                          {BIOME_DESCRIPTIONS[bKey][lang]}
                        </div>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-[#f59e0b] shrink-0 sm:hidden" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. Campfire Title */}
            <div className="space-y-1.5 pt-2 border-t border-[#593c23]/70">
              <div className="text-[11px] font-extrabold text-[#f2be6b]">
                {L.lockerTitles}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {AGROU_TITLES.map((title) => {
                  const isSelected = draftTitle === title.id;
                  return (
                    <button
                      key={title.id}
                      type="button"
                      onClick={() => {
                        sound.playCardFlip();
                        setDraftTitle(title.id);
                      }}
                      className={`px-2 py-1 rounded-xl border text-[10px] font-bold text-left truncate cursor-pointer ${
                        isSelected
                          ? 'bg-[#462d18] border-[#f59e0b] text-[#fde68a]'
                          : 'bg-[#221710] border-[#593c23] text-[#d9c3a5] hover:border-[#a87238]'
                      }`}
                    >
                      {title.label[lang]}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Sticky Save CTA Bar (Always reachable on mobile 390×844) */}
        <div className="sticky bottom-0 z-10 -mx-3.5 sm:-mx-5 px-3.5 sm:px-5 py-3 bg-[#1d130c]/95 backdrop-blur-sm border-t border-[#6b4728]/80">
          <button
            type="button"
            data-testid="save-avatar-locker-btn"
            onClick={handleSaveAndClose}
            className="w-full py-2.5 rounded-xl bg-[#e86f24] hover:bg-[#f28038] text-[#1a0f08] font-extrabold text-xs sm:text-sm shadow-lg cursor-pointer transition-colors"
          >
            {L.lockerSave}
          </button>
        </div>
      </div>
    </div>
  );
};
