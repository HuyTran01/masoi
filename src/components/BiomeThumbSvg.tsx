import React from 'react';
import { AgrouMapBiome } from '../game/agrouMechanics';
import { Language } from '../types/game';

export const BIOME_DESCRIPTIONS: Record<AgrouMapBiome, Record<Language, string>> = {
  forest: {
    vi: 'Lửa trại ấm áp giữa rừng thông đỏ cổ thụ',
    en: 'Warm campfire beneath ancient redwood pines',
    fr: 'Feu de camp sous les séquoias géants',
    es: 'Fogata cálida bajo pinos milenarios',
    ja: '巨木の赤松林に灯る焚き火',
  },
  frostpeak: {
    vi: 'Đỉnh núi tuyết băng giá dưới bầu trời cực quang',
    en: 'Snowy alpine summit under polar twilight',
    fr: 'Sommet enneigé sous le crépuscule polaire',
    es: 'Cumbre nevada bajo el crepúsculo polar',
    ja: 'オーロラ輝く雪山の頂',
  },
  autumn: {
    vi: 'Thung lũng lá phong đỏ rực ánh hoàng hôn',
    en: 'Golden-amber autumn valley at sunset',
    fr: 'Vallée d’automne aux érables dorés',
    es: 'Valle otoñal de arces dorados',
    ja: '紅葉が舞う黄金の渓谷',
  },
};

export const BiomeThumbSvg: React.FC<{ biome: AgrouMapBiome; className?: string }> = ({
  biome,
  className = 'w-11 h-7 rounded-md shrink-0 border border-white/15',
}) => {
  if (biome === 'frostpeak') {
    return (
      <svg viewBox="0 0 64 40" className={className} aria-hidden="true">
        <defs>
          <linearGradient id="bt-frost-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1e3a5f" />
            <stop offset="65%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#bae6fd" />
          </linearGradient>
        </defs>
        <rect width="64" height="40" fill="url(#bt-frost-sky)" />
        <polygon points="0,34 18,10 34,34" fill="#cbd5e1" />
        <polygon points="18,10 24,18 14,19" fill="#f8fafc" />
        <polygon points="24,34 45,7 64,34" fill="#94a3b8" />
        <polygon points="45,7 51,16 39,17" fill="#ffffff" />
        <rect y="30" width="64" height="10" fill="#e2e8f0" />
        <circle cx="32" cy="31" r="4.5" fill="#f97316" />
        <circle cx="32" cy="30" r="2.2" fill="#fde047" />
      </svg>
    );
  }
  if (biome === 'autumn') {
    return (
      <svg viewBox="0 0 64 40" className={className} aria-hidden="true">
        <defs>
          <linearGradient id="bt-autumn-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7c2d12" />
            <stop offset="60%" stopColor="#ea580c" />
            <stop offset="100%" stopColor="#fcd34d" />
          </linearGradient>
        </defs>
        <rect width="64" height="40" fill="url(#bt-autumn-sky)" />
        <circle cx="48" cy="13" r="6" fill="#fef08a" opacity="0.9" />
        <ellipse cx="14" cy="24" rx="10" ry="8" fill="#b91c1c" />
        <ellipse cx="52" cy="25" rx="9" ry="7" fill="#d97706" />
        <rect x="13" y="29" width="2.5" height="6" fill="#451a03" />
        <rect x="51" y="29" width="2.5" height="6" fill="#451a03" />
        <rect y="31" width="64" height="9" fill="#78350f" />
        <circle cx="32" cy="32" r="4.5" fill="#f97316" />
        <circle cx="32" cy="31" r="2.2" fill="#fef08a" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 64 40" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="bt-forest-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0f172a" />
          <stop offset="60%" stopColor="#1e3a5f" />
          <stop offset="100%" stopColor="#2f5233" />
        </linearGradient>
      </defs>
      <rect width="64" height="40" fill="url(#bt-forest-sky)" />
      <circle cx="52" cy="10" r="4.5" fill="#fef9c3" />
      <polygon points="10,32 16,11 22,32" fill="#14532d" />
      <polygon points="44,32 51,12 58,32" fill="#166534" />
      <polygon points="2,32 8,16 14,32" fill="#0f3d21" />
      <rect y="30" width="64" height="10" fill="#2b4728" />
      <circle cx="32" cy="31" r="5" fill="#ea580c" />
      <circle cx="32" cy="30" r="2.4" fill="#fde047" />
    </svg>
  );
};
