import React from 'react';
import { Check, Map, Palette, Sparkles, X } from 'lucide-react';
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

  return (
    <div
      data-testid="agrou-avatar-locker-modal"
      className="fixed inset-0 z-50 flex items-center justify-end p-3 sm:p-5 pointer-events-auto"
      style={{ backgroundColor: 'rgba(12, 8, 5, 0.52)' }}
    >
      {/* Side-aligned drawer so player can admire live 3D character & biome changes on the left! */}
      <div className="agrou-wood-panel w-full max-w-md max-h-[92vh] overflow-y-auto rounded-2xl p-3.5 sm:p-4 space-y-2.5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#6b4728]/70 pb-2">
          <div>
            <h2 className="text-sm sm:text-base font-extrabold text-[#fce8c3] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#f59e0b]" />
              <span>{lang === 'vi' ? 'Tủ Đồ & Bản Đồ Lửa Trại' : 'Campfire Locker & Maps'}</span>
            </h2>
            <p className="text-[11px] text-[#c7ae8e]">
              {playerName} · {activeTitle}
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

        {/* 1. Map Biome Selector (Live 3D Preview) */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-[#f2be6b]">
            <Map className="w-3.5 h-3.5" />
            <span>{lang === 'vi' ? 'Bản Đồ Lửa Trại 3D' : '3D Campfire Map'}</span>
          </div>
          <div className="grid grid-cols-1 gap-1.5">
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
                  className={`w-full text-left px-2.5 py-2 rounded-xl border transition-all flex items-center justify-between gap-2 cursor-pointer ${
                    isSelected
                      ? 'bg-[#462d18] border-[#f59e0b] text-[#fff6e5]'
                      : 'bg-[#221710] border-[#593c23] text-[#d9c3a5] hover:border-[#a87238]'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-lg shrink-0">{biome.icon}</span>
                    <div className="min-w-0">
                      <div className="text-xs font-extrabold truncate">{biome.name[lang]}</div>
                      <div className="text-[10px] text-[#baa282] truncate">
                        {biome.subtitle[lang]}
                      </div>
                    </div>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-[#f59e0b] shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. 3D Low-Poly Hat Selector */}
        <div className="space-y-1.5 pt-1 border-t border-[#593c23]/70">
          <div className="text-[11px] font-extrabold text-[#f2be6b]">
            {lang === 'vi' ? 'Mũ & Phụ Kiện Đầu 3D' : '3D Headgear & Hats'}
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

        {/* 3. Medieval Cloak Color Swatches */}
        <div className="space-y-1.5 pt-1 border-t border-[#593c23]/70">
          <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-[#f2be6b]">
            <Palette className="w-3.5 h-3.5" />
            <span>{lang === 'vi' ? 'Màu Áo Choàng' : 'Cloak Color'}</span>
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

        {/* 4. Campfire Title */}
        <div className="space-y-1.5 pt-1 border-t border-[#593c23]/70">
          <div className="text-[11px] font-extrabold text-[#f2be6b]">
            {lang === 'vi' ? 'Danh Hiệu Lửa Trại' : 'Campfire Title'}
          </div>
          <div className="grid grid-cols-2 gap-1.5">
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

        {/* Done Button */}
        <button
          type="button"
          onClick={() => {
            sound.playCardFlip();
            onClose();
          }}
          className="w-full py-2 rounded-xl bg-[#e86f24] hover:bg-[#f28038] text-[#1a0f08] font-extrabold text-xs sm:text-sm shadow-lg cursor-pointer transition-colors"
        >
          {lang === 'vi' ? 'Lưu & Quay Lại Lửa Trại' : 'Save & Return to Campfire'}
        </button>
      </div>
    </div>
  );
};
