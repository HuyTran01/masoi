import React from 'react';
import { History, Award, Calendar, Users, Moon } from 'lucide-react';
import { GameHistoryRecord, Language } from '../types/game';
import { loadHistory } from '../utils/storage';
import { ROLES } from '../game/roles';
import { TRANSLATIONS } from '../utils/i18n';

interface MatchHistoryViewProps {
  lang: Language;
}

export const MatchHistoryView: React.FC<MatchHistoryViewProps> = ({ lang }) => {
  const t = TRANSLATIONS[lang];
  const isVi = lang === 'vi';
  const history: GameHistoryRecord[] = loadHistory();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-sky-950/70 via-slate-900 to-indigo-950/60 border border-sky-800/40 rounded-2xl p-6 shadow-xl flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/30">
              <History className="w-5 h-5" />
            </span>
            <h2 className="text-xl sm:text-2xl font-bold font-display text-sky-200">
              {t.matchHistory}
            </h2>
          </div>
          <p className="text-xs text-slate-300 mt-1 max-w-lg">
            {isVi
              ? 'Nhật ký lưu lại kết quả từng ván đấu, phe chiến thắng, danh sách vai trò bí mật và nhân tố xuất sắc nhất (MVP).'
              : 'Log of past match outcomes, winning factions, final role reveals, and match MVPs.'}
          </p>
        </div>
      </div>

      {/* Match Cards List */}
      <div className="space-y-4">
        {history.map((record) => {
          const isWolfWin = record.winner === 'werewolves';
          const isTannerWin = record.winner === 'tanner';
          const isLoversWin = record.winner === 'lovers';

          const winnerText = isWolfWin
            ? isVi
              ? 'Phe Ma Sói Thắng'
              : 'Werewolves Win'
            : isTannerWin
            ? isVi
              ? 'Kẻ Chán Đời Thắng'
              : 'Tanner Wins'
            : isLoversWin
            ? isVi
              ? 'Phe Tình Nhân Thắng'
              : 'Lovers Win'
            : isVi
            ? 'Phe Dân Làng Thắng'
            : 'Villagers Win';

          const winnerBadgeColor = isWolfWin
            ? 'bg-red-950 border-red-700 text-red-300'
            : isTannerWin
            ? 'bg-amber-950 border-amber-700 text-amber-300'
            : isLoversWin
            ? 'bg-rose-950 border-rose-700 text-rose-300'
            : 'bg-emerald-950 border-emerald-700 text-emerald-300';

          return (
            <div
              key={record.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4 hover:border-slate-700 transition-colors"
            >
              {/* Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold border ${winnerBadgeColor}`}
                  >
                    {winnerText}
                  </span>
                  <span className="text-xs font-mono text-slate-400">
                    {isVi ? 'Phòng:' : 'Room:'} {record.roomId}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    {record.date}
                  </span>
                  <span className="flex items-center gap-1">
                    <Moon className="w-3.5 h-3.5 text-slate-500" />
                    {record.rounds} {isVi ? 'Vòng Đêm' : 'Nights'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-slate-500" />
                    {record.playersCount} {isVi ? 'Người Chơi' : 'Players'}
                  </span>
                </div>
              </div>

              {/* MVP Bar */}
              <div className="flex items-center gap-2 text-xs text-amber-300 font-semibold bg-slate-950/70 border border-amber-950/80 rounded-xl px-3 py-2">
                <Award className="w-4 h-4 text-amber-400" />
                <span>{isVi ? 'MVP Trận Đấu:' : 'Match MVP:'}</span>
                <span className="text-slate-100">{record.mvp}</span>
              </div>

              {/* Roster & Role Reveal */}
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  {isVi ? 'Danh Sách Vai Trò Cuối Trận:' : 'Final Role Roster:'}
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  {record.roster.map((player, idx) => {
                    const role = ROLES[player.roleId];
                    return (
                      <div
                        key={idx}
                        className={`p-2 rounded-xl border flex items-center justify-between ${
                          player.isAlive
                            ? 'bg-slate-950 border-slate-800 text-slate-200'
                            : 'bg-rose-950/20 border-rose-900/40 text-slate-500 line-through'
                        }`}
                      >
                        <span className="font-medium truncate">{player.name}</span>
                        <span className="font-mono text-[10px] text-amber-400 shrink-0 ml-1">
                          {role.name[lang] || role.name.vi}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
