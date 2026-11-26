import React from 'react';
import { Trophy, Medal, Flame, Star, Award, Search, TrendingUp } from 'lucide-react';
import { LeaderboardUser, Language } from '../types/game';
import { loadLeaderboard } from '../utils/storage';
import { ROLES } from '../game/roles';
import { TRANSLATIONS } from '../utils/i18n';

interface LeaderboardViewProps {
  lang: Language;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({ lang }) => {
  const t = TRANSLATIONS[lang];
  const users: LeaderboardUser[] = loadLeaderboard();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-amber-950/70 via-slate-900 to-yellow-950/60 border border-amber-800/40 rounded-2xl p-6 shadow-xl flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
              <Trophy className="w-5 h-5" />
            </span>
            <h2 className="text-xl sm:text-2xl font-bold font-['Cinzel'] text-amber-200">
              {t.leaderboard}
            </h2>
          </div>
          <p className="text-xs text-slate-300 mt-1 max-w-lg">
            Bảng vinh danh những người chơi có điểm số ELO, tỷ lệ thắng và tư duy suy luận xuất sắc nhất mùa giải.
          </p>
        </div>

        <div className="hidden sm:flex items-center gap-3 bg-slate-950/80 border border-amber-600/30 rounded-xl px-4 py-2.5">
          <TrendingUp className="w-6 h-6 text-amber-400" />
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
              Mùa Giải Hiện Tại
            </span>
            <span className="text-sm font-bold text-amber-300">
              Season 4: Trăng Máu
            </span>
          </div>
        </div>
      </div>

      {/* Leaderboard Table Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/90 text-slate-400 uppercase font-mono tracking-wider border-b border-slate-800 text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Hạng</th>
                <th className="py-3.5 px-4">Người Chơi</th>
                <th className="py-3.5 px-4">Điểm ELO</th>
                <th className="py-3.5 px-4">Số Trận / Thắng</th>
                <th className="py-3.5 px-4">Tỷ Lệ Thắng</th>
                <th className="py-3.5 px-4">Vai Trò Sở Trường</th>
                <th className="py-3.5 px-4">Danh Hiệu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {users.map((user, idx) => {
                const favRole = ROLES[user.favoriteRole];
                return (
                  <tr
                    key={user.id}
                    className="hover:bg-slate-800/40 transition-colors"
                  >
                    {/* Rank */}
                    <td className="py-3.5 px-4 font-mono font-bold">
                      {idx === 0 ? (
                        <span className="text-base">🥇</span>
                      ) : idx === 1 ? (
                        <span className="text-base">🥈</span>
                      ) : idx === 2 ? (
                        <span className="text-base">🥉</span>
                      ) : (
                        <span className="text-slate-400">#{idx + 1}</span>
                      )}
                    </td>

                    {/* Name & Avatar */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xl select-none">{user.avatar}</span>
                        <div>
                          <span className="font-bold text-slate-200 block">
                            {user.name}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Elo */}
                    <td className="py-3.5 px-4 font-mono font-extrabold text-amber-300">
                      {user.elo}
                    </td>

                    {/* Matches */}
                    <td className="py-3.5 px-4 text-slate-300 font-mono">
                      {user.matchesPlayed} / <span className="text-emerald-400 font-bold">{user.wins}</span>
                    </td>

                    {/* Win rate */}
                    <td className="py-3.5 px-4 font-bold font-mono text-emerald-400">
                      {user.winRate}%
                    </td>

                    {/* Favorite Role */}
                    <td className="py-3.5 px-4 whitespace-nowrap min-w-[130px]">
                      <span className="inline-block px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 border border-slate-700 text-[11px] font-semibold whitespace-nowrap">
                        {favRole.name[lang] || favRole.name.vi}
                      </span>
                    </td>

                    {/* Badges */}
                    <td className="py-3.5 px-4 min-w-[150px]">
                      <div className="flex flex-wrap gap-1.5">
                        {user.badges.slice(0, 2).map((b, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded-md bg-amber-950/60 text-amber-200 border border-amber-700/50 text-[11px] whitespace-nowrap"
                          >
                            {b}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
