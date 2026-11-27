import React from 'react';
import { Language, Player, RoleId } from '../types/game';
import { ROLES } from '../game/roles';
import { UI_TEXT } from '../utils/i18n';

interface RoleRevealRosterEntry {
  id?: string;
  name: string;
  avatar?: string;
  roleId: RoleId;
  isAlive: boolean;
  isHuman?: boolean;
}

interface RoleRevealRosterProps {
  roster?: RoleRevealRosterEntry[];
  players?: Player[];
  meId?: string;
  lang: Language;
  compact?: boolean;
}

export const RoleRevealRoster: React.FC<RoleRevealRosterProps> = ({
  roster,
  players,
  meId,
  lang,
  compact = false,
}) => {
  const entries: RoleRevealRosterEntry[] =
    roster ||
    (players || []).map((p) => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      roleId: p.roleId,
      isAlive: p.isAlive,
      isHuman: meId ? p.id === meId : !p.isBot,
    }));
  return (
    <div
      data-testid="role-reveal-roster"
      className="text-left space-y-2"
    >
      <div className="text-xs font-extrabold uppercase tracking-wider text-amber-300 flex items-center justify-between">
        <span>
          🃏 {UI_TEXT[lang].roleRevealRosterTitle}
        </span>
        <span className="text-[11px] font-mono text-slate-300">
          {entries.filter((p) => p.isAlive).length}/{entries.length}{' '}
          {UI_TEXT[lang].aliveSuffix}
        </span>
      </div>
      <div
        className={`grid ${
          compact ? 'grid-cols-2 gap-1.5' : 'grid-cols-1 sm:grid-cols-2 gap-2'
        } max-h-56 overflow-y-auto pr-1`}
      >
        {entries.map((player, idx) => {
          const role = ROLES[player.roleId];
          const isWolf = role.faction === 'werewolf';
          const isNeutral = role.faction === 'neutral';
          return (
            <div
              key={player.id || `${player.name}_${idx}`}
              className={`px-2.5 py-2 rounded-xl border flex items-center justify-between gap-2 text-xs ${
                player.isAlive
                  ? 'bg-[#17110d] border-[#6a4c32] text-[#f7ebd8]'
                  : 'bg-[#1b1012]/80 border-rose-900/50 text-[#cbb9a6]'
              }`}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-sm shrink-0">
                  {player.isAlive ? player.avatar || '👤' : '💀'}
                </span>
                <span className="text-amber-400 font-mono text-[11px] shrink-0">
                  #{idx + 1}
                </span>
                <span
                  className={`font-bold truncate ${
                    !player.isAlive ? 'line-through opacity-80' : ''
                  }`}
                >
                  {player.name}
                  {(meId ? player.id === meId : Boolean(player.isHuman))
                    ? ` ${UI_TEXT[lang].youSuffix}`
                    : ''}
                </span>
              </div>
              <span
                className={`px-2 py-0.5 rounded-md font-bold text-[11px] shrink-0 border ${
                  isWolf
                    ? 'bg-rose-950/90 border-rose-500/60 text-rose-200'
                    : isNeutral
                    ? 'bg-amber-950/90 border-amber-500/60 text-amber-200'
                    : 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200'
                }`}
              >
                {role.name[lang] || role.name.vi}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
