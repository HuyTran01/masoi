import React, { useState } from 'react';
import { BookOpen, Sparkles, Search } from 'lucide-react';
import { ROLES } from '../game/roles';
import { Faction, Language, RoleId } from '../types/game';
import { TRANSLATIONS } from '../utils/i18n';

const LOCALIZED_ROLE_BADGES: Record<RoleId, Record<Language, string>> = {
  villager: { vi: '🛡️ Phổ thông', en: '🛡️ Core',},
  werewolf: { vi: '🐺 Hung bạo', en: '🐺 Predator',},
  seer: { vi: '🔮 Thần thánh', en: '🔮 Oracle',},
  bodyguard: { vi: '🛡️ Hộ vệ', en: '🛡️ Protector',},
  witch: { vi: '🧪 Dược sư', en: '🧪 Alchemist',},
  hunter: { vi: '🎯 Thiện xạ', en: '🎯 Marksman',},
  cupid: { vi: '💘 Se duyên', en: '💘 Matchmaker',},
  wolf_pup: { vi: '🔥 Cuồng nộ', en: '🔥 Frenzy',},
  tanner: { vi: '🎭 Đơn độc', en: '🎭 Solo',},
  elder: { vi: '👑 Kiên cường', en: '👑 Resilient',},
  doppelganger: { vi: '🪞 Sao chép', en: '🪞 Mimic',},
  cursed: { vi: '🌓 Biến hình', en: '🌓 Shapeshifter',},
  traitor: { vi: '🗡️ Gián điệp', en: '🗡️ Spy',},
};

const ENCYCLOPEDIA_TEXT = {
  vi: {
    intro: 'Toàn thư bách khoa về luật chơi, quyền năng, thời điểm thức dậy và chiến thuật dành cho cả người mới bắt đầu lẫn cao thủ ma sói.',
    searchPlaceholder: 'Tìm vai trò hoặc kỹ năng...',
    searchAria: 'Tìm vai trò',
    all: (n: number) => `Tất Cả (${n})`,
    villagers: 'Dân Làng',
    werewolves: 'Ma Sói',
    thirdParty: 'Phe Thứ Ba',
    noMatch: 'Không tìm thấy vai trò phù hợp với từ khóa của bạn.',
    factionWolf: 'Phe Ma Sói',
    factionNeutral: 'Phe Độc Lập / Thứ Ba',
    factionVillager: 'Phe Dân Làng',
    wakePassive: 'Ngủ ban đêm (Nội tại)',
    wakeNight1: 'Chỉ đêm 1',
    wakeNight: 'Thức ban đêm',
    callout: 'Lời gọi của Quản Trò:',
    tip: 'Mẹo Cho Người Mới:',
  },
  en: {
    intro: 'Complete guide to rules, role abilities, night schedule, and winning tactics for both beginners and veteran Werewolf players.',
    searchPlaceholder: 'Search role or ability...',
    searchAria: 'Search roles',
    all: (n: number) => `All (${n})`,
    villagers: 'Villagers',
    werewolves: 'Werewolves',
    thirdParty: 'Third Party',
    noMatch: 'No roles match your search query.',
    factionWolf: 'Werewolf Team',
    factionNeutral: 'Independent / Third Party',
    factionVillager: 'Villager Team',
    wakePassive: 'Sleeps at night (Passive)',
    wakeNight1: 'Night 1 only',
    wakeNight: 'Wakes at night',
    callout: 'Game Master Callout:',
    tip: 'Tip for New Players:',
  },
} as const;

interface RoleEncyclopediaViewProps {
  lang: Language;
}

export const RoleEncyclopediaView: React.FC<RoleEncyclopediaViewProps> = ({ lang }) => {
  const t = TRANSLATIONS[lang];
  const L = ENCYCLOPEDIA_TEXT[lang];
  const [filterFaction, setFilterFaction] = useState<Faction | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const rolesList = Object.values(ROLES);

  const filtered = rolesList.filter((r) => {
    if (filterFaction !== 'all' && r.faction !== filterFaction) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const name = (r.name[lang] || r.name.vi).toLowerCase();
      const desc = (r.description[lang] || r.description.vi).toLowerCase();
      return name.includes(q) || desc.includes(q);
    }
    return true;
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-emerald-950/70 via-slate-900 to-teal-950/60 border border-emerald-800/40 rounded-2xl p-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <BookOpen className="w-5 h-5" />
            </span>
            <h2 className="text-xl sm:text-2xl font-bold font-display text-emerald-200">
              {t.roleEncyclopedia}
            </h2>
          </div>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            {L.intro}
          </p>
        </div>

        {/* Search + Filter Controls */}
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 w-full sm:w-auto">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              data-testid="role-encyclopedia-search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={L.searchPlaceholder}
              aria-label={L.searchAria}
              className="w-full sm:w-52 bg-slate-950/90 border border-slate-700 focus:border-emerald-400 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none"
            />
          </div>

          {/* Filter Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-950/80 p-1.5 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setFilterFaction('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                filterFaction === 'all'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {L.all(rolesList.length)}
            </button>
            <button
              type="button"
              onClick={() => setFilterFaction('villager')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                filterFaction === 'villager'
                  ? 'bg-sky-950 text-sky-300 border border-sky-800'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {L.villagers}
            </button>
            <button
              type="button"
              onClick={() => setFilterFaction('werewolf')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                filterFaction === 'werewolf'
                  ? 'bg-red-950 text-red-300 border border-red-800'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {L.werewolves}
            </button>
            <button
              type="button"
              onClick={() => setFilterFaction('neutral')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                filterFaction === 'neutral'
                  ? 'bg-amber-950 text-amber-300 border border-amber-800'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {L.thirdParty}
            </button>
          </div>
        </div>
      </div>

      {/* Roles Grid */}
      {filtered.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-xs text-slate-400">
          {L.noMatch}
        </div>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((role) => {
          const factionColor =
            role.faction === 'werewolf'
              ? 'text-red-400 border-red-800 bg-red-950/40'
              : role.faction === 'neutral'
              ? 'text-amber-400 border-amber-800 bg-amber-950/40'
              : 'text-sky-400 border-sky-800 bg-sky-950/40';

          const factionLabel =
            role.faction === 'werewolf'
              ? L.factionWolf
              : role.faction === 'neutral'
              ? L.factionNeutral
              : L.factionVillager;

          const isFirstNightOnly = role.id === 'cupid' || role.id === 'doppelganger';
          const wakeLabel =
            role.wakeOrder === 0
              ? L.wakePassive
              : isFirstNightOnly
              ? L.wakeNight1
              : L.wakeNight;

          return (
            <div
              key={role.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3 hover:border-slate-700 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-2xl shadow-inner">
                    {role.id === 'werewolf'
                      ? '🐺'
                      : role.id === 'seer'
                      ? '🔮'
                      : role.id === 'bodyguard'
                      ? '🛡️'
                      : role.id === 'witch'
                      ? '🧪'
                      : role.id === 'hunter'
                      ? '🎯'
                      : role.id === 'cupid'
                      ? '💘'
                      : role.id === 'wolf_pup'
                      ? '🔥'
                      : role.id === 'tanner'
                      ? '🎭'
                      : role.id === 'elder'
                      ? '👑'
                      : role.id === 'doppelganger'
                      ? '🪞'
                      : role.id === 'cursed'
                      ? '🌓'
                      : role.id === 'traitor'
                      ? '🗡️'
                      : '🧑‍🌾'}
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-lg text-slate-100">
                      {role.name[lang] || role.name.vi}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 mt-0.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${factionColor}`}>
                        {factionLabel}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-400">
                        {wakeLabel}
                      </span>
                    </div>
                  </div>
                </div>

                <span className="text-[11px] text-slate-500 font-mono">
                  {LOCALIZED_ROLE_BADGES[role.id]?.[lang] || role.badge}
                </span>
              </div>

              {/* Description */}
              <p className="text-xs text-slate-300 leading-relaxed">
                {role.description[lang] || role.description.vi}
              </p>

              {/* Moderator Instruction */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 text-[11px] text-slate-400">
                <strong className="text-slate-300 block mb-0.5">
                  {L.callout}
                </strong>
                {role.instructions[lang] || role.instructions.vi}
              </div>

              {/* Beginner Guide Tip */}
              <div className="bg-amber-950/20 border border-amber-900/40 rounded-xl p-2.5 text-[11px] text-amber-200">
                <div className="flex items-center gap-1 font-bold text-amber-400 mb-0.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{L.tip}</span>
                </div>
                <p className="leading-relaxed">
                  {role.guideForNewbie[lang] || role.guideForNewbie.vi}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
};
