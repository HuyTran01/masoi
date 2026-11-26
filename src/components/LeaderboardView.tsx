import React from 'react';
import { Trophy, TrendingUp } from 'lucide-react';
import { LeaderboardUser, Language, RoleId } from '../types/game';
import { loadHistory, loadLeaderboard } from '../utils/storage';
import { ROLES } from '../game/roles';
import { TRANSLATIONS } from '../utils/i18n';

interface LeaderboardViewProps {
  lang: Language;
  users?: LeaderboardUser[];
}

const DEMO_LEADERBOARD_IDS = new Set([
  'user_1',
  'user_2',
  'user_3',
  'user_4',
  'user_5',
  'user_6',
]);
const DEMO_HISTORY_IDS = new Set(['match_1092', 'match_1091']);

function buildLocalSessionUser(isVi: boolean): LeaderboardUser | null {
  try {
    const realHistory = loadHistory().filter((r) => !DEMO_HISTORY_IDS.has(r.id));
    const rawUser = localStorage.getItem('werewolf_user');
    const parsed = rawUser ? JSON.parse(rawUser) : null;
    const savedMatches = typeof parsed?.matchesPlayed === 'number' ? parsed.matchesPlayed : 0;
    const matchesPlayed = Math.max(savedMatches, realHistory.length);
    if (matchesPlayed <= 0) return null;

    const wins =
      typeof parsed?.wins === 'number' ? Math.min(matchesPlayed, Math.max(0, parsed.wins)) : 0;
    const winRate = Number(((wins / matchesPlayed) * 100).toFixed(1));
    const roleCounts = new Map<RoleId, number>();
    const playerName =
      typeof parsed?.name === 'string' && parsed.name.trim()
        ? parsed.name.trim()
        : isVi
        ? 'Bạn'
        : 'You';
    for (const rec of realHistory) {
      const entry = rec.roster.find((p) => p.name === playerName) || rec.roster[0];
      if (entry?.roleId && entry.roleId in ROLES) {
        roleCounts.set(entry.roleId, (roleCounts.get(entry.roleId) || 0) + 1);
      }
    }
    let favoriteRole: RoleId = 'villager';
    let topCount = 0;
    for (const [roleId, count] of roleCounts.entries()) {
      if (count > topCount) {
        topCount = count;
        favoriteRole = roleId;
      }
    }

    return {
      id: typeof parsed?.id === 'string' && parsed.id ? parsed.id : 'local_player',
      name: playerName,
      avatar: typeof parsed?.avatar === 'string' && parsed.avatar ? parsed.avatar : '🐺',
      elo: typeof parsed?.elo === 'number' && Number.isFinite(parsed.elo) ? parsed.elo : 1620,
      matchesPlayed,
      wins,
      winRate,
      favoriteRole,
      badges: [isVi ? 'Lịch sử thực tế' : 'Live Session'],
    };
  } catch {
    return null;
  }
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({ lang, users: usersProp }) => {
  const t = TRANSLATIONS[lang];
  const isVi = lang === 'vi';
  const storedUsers: LeaderboardUser[] = usersProp ?? loadLeaderboard();
  const realStoredUsers = storedUsers.filter((u) => !DEMO_LEADERBOARD_IDS.has(u.id));
  const localUser = usersProp ? null : buildLocalSessionUser(isVi);
  const realUsers = [...realStoredUsers];
  if (localUser && !realUsers.some((u) => u.id === localUser.id)) {
    realUsers.push(localUser);
  }
  realUsers.sort((a, b) => b.elo - a.elo);

  const showingDemoFallback = realUsers.length === 0;
  const visibleUsers = showingDemoFallback ? storedUsers : realUsers;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-amber-950/70 via-slate-900 to-yellow-950/60 border border-amber-800/40 rounded-2xl p-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
              <Trophy className="w-5 h-5" />
            </span>
            <h2 className="text-xl sm:text-2xl font-bold font-display text-amber-200">
              {t.leaderboard}
            </h2>
            {showingDemoFallback && (
              <span
                data-testid="leaderboard-demo-badge"
                className="px-2.5 py-0.5 rounded-full bg-amber-950/90 border border-amber-500/50 text-[11px] font-bold text-amber-200"
              >
                {isVi ? 'Mẫu minh họa' : 'Sample Data'}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-300 mt-1 max-w-lg">
            {showingDemoFallback
              ? isVi
                ? 'Chưa có trận đấu thực tế nào được lưu trên thiết bị này. Bảng dưới đây là dữ liệu mẫu minh họa — thành tích của bạn sẽ xuất hiện sau ván đầu tiên.'
                : 'No local matches recorded yet. Showing sample leaderboard rows below — your real stats appear after your first match.'
              : isVi
              ? 'Bảng vinh danh những người chơi có điểm số ELO, tỷ lệ thắng và tư duy suy luận xuất sắc nhất mùa giải.'
              : 'Top-ranked players this season by ELO rating, win rate, and deduction mastery.'}
          </p>
        </div>

        <div className="hidden sm:flex items-center gap-3 bg-slate-950/80 border border-amber-600/30 rounded-xl px-4 py-2.5">
          <TrendingUp className="w-6 h-6 text-amber-400" />
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
              {isVi ? 'Mùa Giải Hiện Tại' : 'Current Season'}
            </span>
            <span className="text-sm font-bold text-amber-300">
              {isVi ? 'Season 4: Trăng Máu' : 'Season 4: Blood Moon'}
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
                <th className="py-3.5 px-4">{isVi ? 'Hạng' : 'Rank'}</th>
                <th className="py-3.5 px-4">{isVi ? 'Người Chơi' : 'Player'}</th>
                <th className="py-3.5 px-4">{isVi ? 'Điểm ELO' : 'ELO'}</th>
                <th className="py-3.5 px-4">{isVi ? 'Số Trận / Thắng' : 'Matches / Wins'}</th>
                <th className="py-3.5 px-4">{isVi ? 'Tỷ Lệ Thắng' : 'Win Rate'}</th>
                <th className="py-3.5 px-4">{isVi ? 'Vai Trò Sở Trường' : 'Favorite Role'}</th>
                <th className="py-3.5 px-4">{isVi ? 'Danh Hiệu' : 'Badges'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {visibleUsers.map((user, idx) => {
                const favRole = ROLES[user.favoriteRole] || ROLES.villager;
                const isDemoRow = DEMO_LEADERBOARD_IDS.has(user.id);
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
                          {isDemoRow && (
                            <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded bg-amber-950/70 border border-amber-700/50 text-[10px] font-semibold text-amber-200">
                              {isVi ? 'Mẫu minh họa' : 'Sample'}
                            </span>
                          )}
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
