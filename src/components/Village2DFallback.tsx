import React from 'react';
import { Language, Phase, Player } from '../types/game';
import { AGROU_BIOMES, AgrouMapBiome, CAMPFIRE_ABSTAIN_ID } from '../game/agrouMechanics';
import { ROLES } from '../game/roles';
import { UI_TEXT } from '../utils/i18n';

interface Village2DFallbackProps {
  players: Player[];
  userPlayerId: string;
  phase: Phase;
  lang: Language;
  isTitleScreen: boolean;
  isPlayerAwakeAtNight: boolean;
  selectedTargetId: string | null;
  secondaryTargetId?: string | null;
  votesMap: Record<string, number>;
  activeSpeakers: string[];
  revealAllRoles?: boolean;
  mapBiome?: AgrouMapBiome;
  mayorId?: string | null;
  onSelectPlayer: (playerId: string) => void;
  onVoteCampfireAbstain?: () => void;
}

const BIOME_2D_THEMES: Record<
  AgrouMapBiome,
  {
    dayBg: string;
    nightBg: string;
    groundDay: string;
    groundNight: string;
    treePrimary: string;
    treeSecondary: string;
    accentColor: string;
  }
> = {
  forest: {
    dayBg: 'linear-gradient(180deg, #2b3f52 0%, #3d5b54 45%, #2a3e28 100%)',
    nightBg: 'linear-gradient(180deg, #0b1220 0%, #162235 45%, #121c15 100%)',
    groundDay: '#496e35',
    groundNight: '#1d2d1d',
    treePrimary: '#1f3f29',
    treeSecondary: '#2d5734',
    accentColor: '#f5b82e',
  },
  frostpeak: {
    dayBg: 'linear-gradient(180deg, #5a87ab 0%, #9ac0dc 46%, #7d9ab2 100%)',
    nightBg: 'linear-gradient(180deg, #0c172a 0%, #1d324f 48%, #22354a 100%)',
    groundDay: '#c7dce9',
    groundNight: '#374c63',
    treePrimary: '#264947',
    treeSecondary: '#b9d6e8',
    accentColor: '#7dd3fc',
  },
  autumn: {
    dayBg: 'linear-gradient(180deg, #4b81ba 0%, #7db2d8 44%, #4f8034 100%)',
    nightBg: 'linear-gradient(180deg, #0d1830 0%, #1b2f4d 45%, #192b1a 100%)',
    groundDay: '#538934',
    groundNight: '#213a20',
    treePrimary: '#35662a',
    treeSecondary: '#588c38',
    accentColor: '#fde047',
  },
};

export const Village2DFallback: React.FC<Village2DFallbackProps> = ({
  players,
  userPlayerId,
  phase,
  lang,
  isTitleScreen,
  isPlayerAwakeAtNight,
  selectedTargetId,
  secondaryTargetId,
  votesMap,
  activeSpeakers,
  revealAllRoles,
  mapBiome = 'forest',
  mayorId = null,
  onSelectPlayer,
  onVoteCampfireAbstain,
}) => {
  const theme = BIOME_2D_THEMES[mapBiome] || BIOME_2D_THEMES.forest;
  const biomeMeta = AGROU_BIOMES[mapBiome] || AGROU_BIOMES.forest;
  const isNight = phase === 'night' && !isTitleScreen;
  const me = players.find((p) => p.id === userPlayerId);
  const isBlindfolded = isNight && Boolean(me?.isAlive) && !isPlayerAwakeAtNight;
  const t = UI_TEXT[lang];
  const abstainCount = votesMap[CAMPFIRE_ABSTAIN_ID] || 0;

  return (
    <div
      data-testid="village-2d-fallback"
      data-biome={mapBiome}
      className="fixed inset-0 z-0 overflow-hidden select-none flex items-center justify-center"
      style={{
        background: isNight ? theme.nightBg : theme.dayBg,
      }}
    >
      {/* Atmospheric Horizon Trees, Mountains & Campfire Clearing SVG */}
      <svg
        viewBox="0 0 1280 720"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 w-full h-full pointer-events-none"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id="campfireGlow2D" cx="50%" cy="54%" r="36%">
            <stop offset="0%" stopColor="#ff9436" stopOpacity={isNight ? '0.52' : '0.32'} />
            <stop offset="50%" stopColor="#e86f24" stopOpacity={isNight ? '0.18' : '0.1'} />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Stars / Moon at night, Sun glow at day */}
        {isNight ? (
          <g>
            <circle cx="1040" cy="110" r="34" fill="#fef3c7" opacity="0.88" />
            <circle cx="1055" cy="102" r="28" fill="#0f1a2e" opacity="0.72" />
            {[
              [140, 80],
              [260, 120],
              [420, 65],
              [610, 95],
              [790, 72],
              [910, 130],
              [1160, 85],
            ].map(([sx, sy], i) => (
              <circle key={i} cx={sx} cy={sy} r={i % 2 === 0 ? 2.2 : 1.5} fill="#fef9c3" opacity="0.8" />
            ))}
          </g>
        ) : (
          <circle cx="980" cy="115" r="46" fill="#fff4cf" opacity="0.65" />
        )}

        {/* Distant mountain range */}
        <path
          d="M0 340 L180 210 L360 300 L560 190 L770 295 L980 200 L1160 280 L1280 225 L1280 720 L0 720 Z"
          fill={isNight ? '#131d2d' : '#35495c'}
          opacity="0.72"
        />

        {/* Ground plane */}
        <rect
          x="0"
          y="330"
          width="1280"
          height="390"
          fill={isNight ? theme.groundNight : theme.groundDay}
        />

        {/* Stylized pine silhouettes along horizon */}
        {[70, 150, 235, 320, 950, 1045, 1135, 1220].map((tx, i) => (
          <g key={i} opacity={isNight ? 0.88 : 0.94}>
            <polygon
              points={`${tx},190 ${tx - 42},345 ${tx + 42},345`}
              fill={i % 2 === 0 ? theme.treePrimary : theme.treeSecondary}
            />
            <polygon
              points={`${tx},155 ${tx - 30},275 ${tx + 30},275`}
              fill={theme.treePrimary}
            />
          </g>
        ))}

        {/* Dirt Campfire Clearing Ellipse */}
        <ellipse
          cx="640"
          cy="405"
          rx="410"
          ry="185"
          fill={isNight ? '#2c2017' : '#bfa77e'}
          stroke={isNight ? '#4a3524' : '#8e734e'}
          strokeWidth="4"
          opacity="0.92"
        />

        {/* Warm Campfire Radial Glow */}
        <rect x="0" y="0" width="1280" height="720" fill="url(#campfireGlow2D)" />
      </svg>

      {/* Mobile Compact 2-Column Grid for >= 9 Players so seats never overlap on narrow screens */}
      {players.length >= 9 && (
        <div
          data-testid="village-2d-mobile-grid"
          className="relative z-20 flex sm:hidden flex-col items-center gap-2.5 w-full max-w-[370px] px-3 pt-14 pb-24"
        >
          <button
            type="button"
            data-testid="campfire-2d-mobile-btn"
            disabled={phase !== 'day_voting' || isTitleScreen}
            onClick={() => {
              if (phase === 'day_voting' && !isTitleScreen) {
                onVoteCampfireAbstain?.();
              }
            }}
            className={`w-full px-3 py-2 rounded-2xl border-2 flex items-center justify-center gap-2 shadow-xl ${
              phase === 'day_voting' && !isTitleScreen
                ? 'cursor-pointer'
                : 'cursor-default'
            } ${
              selectedTargetId === CAMPFIRE_ABSTAIN_ID
                ? 'border-emerald-400 ring-2 ring-emerald-400/70'
                : 'border-[#e89c3e]'
            }`}
            style={{
              background:
                'linear-gradient(90deg, rgba(61,34,17,0.92) 0%, rgba(184,75,16,0.88) 50%, rgba(61,34,17,0.92) 100%)',
            }}
          >
            <span className="text-xl animate-pulse">🔥</span>
            <span className="text-xs font-extrabold text-[#fff8ed]">
              {phase === 'day_voting' && !isTitleScreen
                ? `${lang === 'vi' ? 'Lửa Trại — Phiếu trắng' : 'Campfire — Abstain'}${
                    abstainCount > 0 ? ` (${abstainCount})` : ''
                  }`
                : biomeMeta.name[lang]}
            </span>
          </button>

          {!isBlindfolded && (
            <div className="w-full grid grid-cols-2 gap-2 max-h-[54vh] overflow-y-auto pr-0.5">
              {players.map((p, idx) => {
                const isMe = p.id === userPlayerId;
                const isMayor = Boolean(mayorId && p.id === mayorId && p.isAlive);
                const isSelected = selectedTargetId === p.id || secondaryTargetId === p.id;
                const voteCount = votesMap[p.id] || 0;
                const isSpeaking = activeSpeakers.includes(p.name) && p.isAlive;
                const isWolf = p.roleId === 'werewolf' || p.roleId === 'wolf_pup';
                const showRole =
                  revealAllRoles ||
                  phase === 'game_over' ||
                  isMe ||
                  (me && (me.roleId === 'werewolf' || me.roleId === 'wolf_pup') && isWolf);

                return (
                  <button
                    key={p.id}
                    type="button"
                    disabled={isTitleScreen}
                    onClick={() => !isTitleScreen && onSelectPlayer(p.id)}
                    className={`px-2.5 py-2 rounded-xl border-2 text-left shadow-lg transition-all ${
                      isTitleScreen ? 'cursor-default' : 'cursor-pointer active:scale-95'
                    } ${
                      !p.isAlive
                        ? 'bg-[#131f28]/85 border-cyan-500/50 text-cyan-200 opacity-75'
                        : isSelected
                        ? 'bg-[#6e1f17]/95 border-[#f5b82e] ring-2 ring-[#f5b82e]/80 text-white'
                        : isMe
                        ? 'bg-[#1c3245]/95 border-sky-400 text-sky-50'
                        : 'bg-[#2a1c12]/92 border-[#9c7248] text-[#f6ebd8]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 text-sm leading-none">
                      <span className="flex items-center gap-1">
                        <span>{p.isAlive ? p.avatar : '👻'}</span>
                        {isMayor && <span title="Mayor">👑</span>}
                        {isSpeaking && <span className="text-emerald-400 text-xs">🔊</span>}
                      </span>
                      {voteCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-rose-600 text-white text-[10px] font-mono font-black">
                          {voteCount}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-[11px] font-extrabold truncate flex items-center gap-1">
                      <span className="text-[#f5b82e] font-mono">#{idx + 1}</span>
                      <span className="truncate">{p.name}</span>
                      {isMe && <span className="text-sky-300 text-[10px]">{t.youSuffix}</span>}
                    </div>
                    {showRole && (
                      <div className="text-[10px] font-mono text-[#fcd34d] font-bold truncate">
                        {ROLES[p.roleId].name[lang]}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Interactive Campfire Circle Container */}
      <div
        className={`relative w-full max-w-[920px] h-[440px] sm:h-[520px] items-center justify-center ${
          players.length >= 9 ? 'hidden sm:flex' : 'flex'
        }`}
      >
        {/* Central Animated Campfire (Clickable during day_voting to abstain) */}
        <button
          type="button"
          data-testid="campfire-2d-btn"
          disabled={phase !== 'day_voting' || isTitleScreen}
          onClick={() => {
            if (phase === 'day_voting' && !isTitleScreen) {
              onVoteCampfireAbstain?.();
            }
          }}
          title={
            phase === 'day_voting'
              ? lang === 'vi'
                ? 'Bấm Lửa Trại để bỏ phiếu trắng'
                : 'Click Campfire to Abstain'
              : biomeMeta.name[lang]
          }
          className={`relative z-10 w-24 h-24 sm:w-28 sm:h-28 rounded-full flex flex-col items-center justify-center transition-transform ${
            phase === 'day_voting' && !isTitleScreen
              ? 'cursor-pointer hover:scale-105'
              : 'cursor-default'
          } ${
            selectedTargetId === CAMPFIRE_ABSTAIN_ID
              ? 'ring-4 ring-emerald-400'
              : ''
          }`}
          style={{
            background:
              'radial-gradient(circle, rgba(255,196,77,0.9) 0%, rgba(232,111,36,0.75) 48%, rgba(61,34,17,0.85) 85%)',
            boxShadow: '0 0 42px rgba(245, 130, 32, 0.72)',
          }}
        >
          <span className="text-3xl sm:text-4xl animate-pulse">🔥</span>
          {phase === 'day_voting' && !isTitleScreen && (
            <span className="mt-0.5 px-2 py-0.5 rounded-full bg-[#1d130c]/90 border border-[#e89c3e] text-[10px] font-black text-[#fde7c3] whitespace-nowrap">
              {lang === 'vi' ? 'Phiếu trắng' : 'Abstain'}
              {abstainCount > 0 ? ` (${abstainCount})` : ''}
            </span>
          )}
        </button>

        {/* Villager Seats Arranged Around Campfire */}
        {!isBlindfolded &&
          players.map((p, idx) => {
            const count = Math.max(1, players.length);
            const angle = Math.PI / 2 + (idx / count) * Math.PI * 2;
            const rx = count > 10 ? 41 : 37;
            const ry = count > 10 ? 39 : 35;
            const leftPct = 50 + Math.cos(angle) * rx;
            const topPct = 52 + Math.sin(angle) * ry;

            const isMe = p.id === userPlayerId;
            const isMayor = Boolean(mayorId && p.id === mayorId && p.isAlive);
            const isSelected = selectedTargetId === p.id || secondaryTargetId === p.id;
            const voteCount = votesMap[p.id] || 0;
            const isSpeaking = activeSpeakers.includes(p.name) && p.isAlive;
            const isWolf = p.roleId === 'werewolf' || p.roleId === 'wolf_pup';
            const showRole =
              revealAllRoles ||
              phase === 'game_over' ||
              isMe ||
              (me && (me.roleId === 'werewolf' || me.roleId === 'wolf_pup') && isWolf);

            return (
              <button
                key={p.id}
                type="button"
                disabled={isTitleScreen}
                onClick={() => !isTitleScreen && onSelectPlayer(p.id)}
                style={{
                  left: `${leftPct}%`,
                  top: `${topPct}%`,
                  transform: 'translate(-50%, -50%)',
                }}
                className={`absolute z-20 px-2.5 py-1.5 rounded-2xl border-2 text-center shadow-xl transition-all ${
                  isTitleScreen ? 'cursor-default' : 'cursor-pointer hover:scale-105'
                } ${
                  !p.isAlive
                    ? 'bg-[#131f28]/85 border-cyan-500/50 text-cyan-200 opacity-75'
                    : isSelected
                    ? 'bg-[#6e1f17]/95 border-[#f5b82e] ring-2 ring-[#f5b82e]/80 text-white scale-105'
                    : isMe
                    ? 'bg-[#1c3245]/95 border-sky-400 text-sky-50'
                    : 'bg-[#2a1c12]/92 border-[#9c7248] text-[#f6ebd8]'
                }`}
              >
                <div className="flex items-center justify-center gap-1 text-base leading-none">
                  <span>{p.isAlive ? p.avatar : '👻'}</span>
                  {isMayor && <span title="Mayor">👑</span>}
                  {isSpeaking && <span className="text-emerald-400 text-xs">🔊</span>}
                  {voteCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded bg-rose-600 text-white text-[10px] font-mono font-black">
                      {voteCount}
                    </span>
                  )}
                </div>
                <div className="mt-0.5 text-[11px] font-extrabold whitespace-nowrap flex items-center justify-center gap-1">
                  <span className="text-[#f5b82e] font-mono">#{idx + 1}</span>
                  <span className="max-w-[78px] truncate">{p.name}</span>
                  {isMe && <span className="text-sky-300 text-[10px]">{t.youSuffix}</span>}
                </div>
                {showRole && (
                  <div className="text-[10px] font-mono text-[#fcd34d] font-bold">
                    {ROLES[p.roleId].name[lang]}
                  </div>
                )}
              </button>
            );
          })}
      </div>
    </div>
  );
};
