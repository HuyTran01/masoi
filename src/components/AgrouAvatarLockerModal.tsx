import React from 'react';
import { Check, Map, Palette, RotateCw, Sparkles, X } from 'lucide-react';
import { Language } from '../types/game';
import {
  AGROU_BIOMES,
  AGROU_CLOAK_COLORS,
  AGROU_HATS,
  AGROU_TITLES,
  AgrouAvatarConfig,
  AgrouMapBiome,
} from '../game/agrouMechanics';
import { sound } from '../utils/sound';
import { AvatarPreview3D } from './AvatarPreview3D';
import { BIOME_DESCRIPTIONS, BiomeThumbSvg } from './BiomeThumbSvg';

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
  if (!isOpen) return null;

  const activeTitle =
    AGROU_TITLES.find((t) => t.id === config.titleId)?.label[lang] ||
    AGROU_TITLES[0].label[lang];
  const activeHat = AGROU_HATS.find((h) => h.id === config.hat) || AGROU_HATS[0];
  const activeCloak =
    AGROU_CLOAK_COLORS.find((c) => c.hex === config.cloakColor) || AGROU_CLOAK_COLORS[0];

  return (
    <div
      data-testid="agrou-avatar-locker-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 pointer-events-auto"
      style={{ backgroundColor: 'rgba(10, 7, 4, 0.72)' }}
    >
      <div className="agrou-wood-panel w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-2xl p-3.5 sm:p-5 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#6b4728]/70 pb-2.5 mb-3">
          <div>
            <h2 className="text-sm sm:text-base font-extrabold text-[#fce8c3] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#f59e0b]" />
              <span>{lang === 'vi' ? 'Tủ Đồ Nhân Vật & Bản Đồ 3D' : '3D Character Locker & Maps'}</span>
            </h2>
            <p className="text-[11px] text-[#c7ae8e]">
              {lang === 'vi'
                ? 'Xem trực tiếp nhân vật 3D đứng bên cạnh khi đổi mũ, áo choàng và bản đồ'
                : 'Preview your standing 3D character live as you customize hat, cloak & map'}
            </p>
          </div>
          <button
            type="button"
            data-testid="close-avatar-locker-btn"
            onClick={() => {
              sound.playCardFlip();
              onClose();
            }}
            aria-label={lang === 'vi' ? 'Đóng Tủ Đồ' : 'Close Locker'}
            className="p-1.5 rounded-xl bg-[#2f2117] hover:bg-[#422f20] border border-[#7c532e] text-[#f6ebd8] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 2-Column Side-by-Side Layout: Left = Standing 3D Character Preview, Right = Controls */}
        <div className="grid grid-cols-1 md:grid-cols-[290px_1fr] lg:grid-cols-[330px_1fr] gap-4 items-stretch">
          {/* LEFT COLUMN: Live Standing 3D Character Turntable */}
          <div className="flex flex-col gap-2 bg-[#1c130c]/90 border border-[#6a482b] rounded-2xl p-2.5">
            <div className="relative flex-1 min-h-[240px] sm:min-h-[360px]">
              <AvatarPreview3D
                hat={config.hat}
                cloakColor={config.cloakColor}
                mapBiome={config.mapBiome}
                playerName={playerName}
              />
              <div className="pointer-events-none absolute top-2 left-2 px-2 py-0.5 rounded-lg bg-[#160f09]/85 border border-[#8e6338]/70 text-[10px] font-bold text-[#fde7c3] flex items-center gap-1">
                <RotateCw className="w-3 h-3 text-[#f59e0b]" />
                <span>{lang === 'vi' ? 'Kéo để xoay 360°' : 'Drag to spin 360°'}</span>
              </div>
              <div className="pointer-events-none absolute bottom-2 inset-x-2 px-2.5 py-1.5 rounded-xl bg-[#160f09]/90 border border-[#7c532e]/80 text-center">
                <div className="text-xs font-extrabold text-[#fff4de] truncate">{playerName}</div>
                <div className="text-[10px] font-bold text-[#f2be6b] truncate">{activeTitle}</div>
              </div>
            </div>

            {/* Active Outfit Summary Pills */}
            <div className="grid grid-cols-2 gap-1.5 text-[10px]">
              <div className="px-2 py-1.5 rounded-xl bg-[#261a11] border border-[#5a3d24] flex items-center gap-1.5 min-w-0">
                <span>{activeHat.icon}</span>
                <span className="font-bold text-[#f3dfc0] truncate">{activeHat.label[lang]}</span>
              </div>
              <div className="px-2 py-1.5 rounded-xl bg-[#261a11] border border-[#5a3d24] flex items-center gap-1.5 min-w-0">
                <span
                  className="w-3.5 h-3.5 rounded-full border border-[#f6ebd8]/60 shrink-0"
                  style={{ backgroundColor: activeCloak.cssHex }}
                />
                <span className="font-bold text-[#f3dfc0] truncate">{activeCloak.label[lang]}</span>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Customization Controls */}
          <div className="space-y-3 flex flex-col justify-between">
            <div className="space-y-3">
              {/* 1. 3D Low-Poly Hat Selector */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-extrabold text-[#f2be6b]">
                  {lang === 'vi' ? '1. Mũ & Phụ Kiện Đầu 3D' : '1. 3D Headgear & Hats'}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {AGROU_HATS.map((hat) => {
                    const isSelected = config.hat === hat.id;
                    return (
                      <button
                        key={hat.id}
                        type="button"
                        data-testid={`locker-hat-${hat.id}`}
                        onClick={() => {
                          sound.playCardFlip();
                          onChange({ ...config, hat: hat.id });
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
                  <span>{lang === 'vi' ? '2. Màu Áo Choàng' : '2. Cloak Color'}</span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {AGROU_CLOAK_COLORS.map((swatch) => {
                    const isSelected = config.cloakColor === swatch.hex;
                    return (
                      <button
                        key={swatch.id}
                        type="button"
                        data-testid={`locker-cloak-${swatch.id}`}
                        onClick={() => {
                          sound.playCardFlip();
                          onChange({ ...config, cloakColor: swatch.hex });
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
                  <span>{lang === 'vi' ? '3. Bản Đồ Lửa Trại 3D' : '3. 3D Campfire Map'}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {(Object.keys(AGROU_BIOMES) as AgrouMapBiome[]).map((bKey) => {
                    const biome = AGROU_BIOMES[bKey];
                    const isSelected = config.mapBiome === bKey;
                    return (
                      <button
                        key={bKey}
                        type="button"
                        data-testid={`locker-biome-${bKey}`}
                        onClick={() => {
                          sound.playCardFlip();
                          onChange({ ...config, mapBiome: bKey });
                        }}
                        className={`w-full text-left p-2 rounded-xl border transition-all flex items-center justify-between gap-2 cursor-pointer ${
                          isSelected
                            ? 'bg-[#462d18] border-[#f59e0b] text-[#fff6e5]'
                            : 'bg-[#221710] border-[#593c23] text-[#e6d5b8] hover:border-[#a87238]'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <BiomeThumbSvg biome={bKey} className="w-10 h-7 rounded-md border border-white/15 shrink-0" />
                          <div className="min-w-0">
                            <div className="text-[11px] font-extrabold truncate">
                              {biome.icon} {biome.name[lang]}
                            </div>
                            <div className="text-[10px] text-[#d6bfa2] truncate">
                              {BIOME_DESCRIPTIONS[bKey][lang]}
                            </div>
                          </div>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-[#f59e0b] shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4. Campfire Title */}
              <div className="space-y-1.5 pt-2 border-t border-[#593c23]/70">
                <div className="text-[11px] font-extrabold text-[#f2be6b]">
                  {lang === 'vi' ? '4. Danh Hiệu Lửa Trại' : '4. Campfire Title'}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {AGROU_TITLES.map((title) => {
                    const isSelected = config.titleId === title.id;
                    return (
                      <button
                        key={title.id}
                        type="button"
                        onClick={() => {
                          sound.playCardFlip();
                          onChange({ ...config, titleId: title.id });
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

            {/* Done Button */}
            <button
              type="button"
              onClick={() => {
                sound.playCardFlip();
                onClose();
              }}
              className="w-full py-2.5 rounded-xl bg-[#e86f24] hover:bg-[#f28038] text-[#1a0f08] font-extrabold text-xs sm:text-sm shadow-lg cursor-pointer transition-colors"
            >
              {lang === 'vi' ? 'Lưu & Quay Lại Lửa Trại' : 'Save & Return to Campfire'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
