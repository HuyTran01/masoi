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
    vi: 'Đồi cỏ xanh mướt, suối trong, đại thụ cổ & đom đóm bay lấp lánh',
    en: 'Rolling emerald meadow, sparkling blue river, ancient oaks & fireflies',
    fr: 'Prairie verdoyante, rivière bleue, chênes anciens et lucioles dorées',
    es: 'Pradera esmeralda, río cristalino, robles antiguos y luciérnagas doradas',
    ja: '緑の丘、澄んだ清流、古木の大樹と黄金の蛍',
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
          <linearGradient id="bt-meadow-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b76b8" />
            <stop offset="65%" stopColor="#7cc4f5" />
            <stop offset="100%" stopColor="#cfeaff" />
          </linearGradient>
        </defs>
        <rect width="64" height="40" fill="url(#bt-meadow-sky)" />
        {/* Rolling emerald meadow hills */}
        <ellipse cx="14" cy="31" rx="22" ry="10" fill="#4f8a32" />
        <ellipse cx="52" cy="31" rx="22" ry="10" fill="#3f7328" />
        <rect y="28" width="64" height="12" fill="#548a32" />
        {/* Sparkling blue river */}
        <path
          d="M 42 26 Q 36 31 46 35 Q 52 38 58 40 L 46 40 Q 38 36 33 32 Q 30 29 36 26 Z"
          fill="#38bdf8"
        />
        <path d="M 40 28 Q 37 31 44 34" stroke="#e0f2fe" strokeWidth="1" fill="none" opacity="0.85" />
        {/* Ancient oaks */}
        <rect x="11.5" y="24" width="2.8" height="7" fill="#5c3d24" />
        <ellipse cx="13" cy="20" rx="8.5" ry="6.5" fill="#2f6627" />
        <ellipse cx="15" cy="18.5" rx="5.5" ry="4.5" fill="#5a943c" />
        <rect x="52.5" y="24" width="2.6" height="6.5" fill="#5c3d24" />
        <ellipse cx="54" cy="20.5" rx="7.5" ry="5.5" fill="#2c5e24" />
        {/* Golden fireflies & campfire */}
        <circle cx="24" cy="14" r="1.2" fill="#fde047" opacity="0.95" />
        <circle cx="43" cy="11" r="1.1" fill="#fef08a" opacity="0.9" />
        <circle cx="34" cy="17" r="0.9" fill="#fde047" opacity="0.85" />
        <circle cx="27" cy="32" r="4" fill="#ea580c" />
        <circle cx="27" cy="31" r="2" fill="#fef08a" />
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
