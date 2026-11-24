import React from 'react';
import {
  Gavel,
  Ghost,
  Lock,
  Moon,
  ShieldCheck,
  Skull,
  Sun,
  Users,
  Volume2,
} from 'lucide-react';
import { GMAnnouncementData } from '../game/autoGM';
import { Language } from '../types/game';

interface GMAnnouncementModalProps {
  announcement: GMAnnouncementData;
  lang: Language;
  isMuted: boolean;
  onReplayVoice: () => void;
  onContinue: () => void;
}

export const GMAnnouncementModal: React.FC<GMAnnouncementModalProps> = ({
  announcement,
  lang,
  isMuted,
  onReplayVoice,
  onContinue,
}) => {
  const isDawn = announcement.kind === 'dawn';
  const hasVictims = announcement.victims.length > 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="gm-announcement-headline"
      data-testid="gm-announcement-overlay"
      data-kind={announcement.kind}
      className="fixed inset-0 z-45 flex items-center justify-center p-3 sm:p-4 pointer-events-auto"
      style={{
        background: isDawn
          ? 'radial-gradient(circle at 50% 28%, rgba(28, 19, 10, 0.78) 0%, rgba(5, 8, 17, 0.92) 78%)'
          : 'radial-gradient(circle at 50% 28%, rgba(28, 10, 22, 0.82) 0%, rgba(4, 6, 15, 0.94) 78%)',
      }}
    >
      <div
        className={`w-full max-w-lg max-h-[88vh] overflow-y-auto rounded-3xl border-2 p-4 sm:p-6 shadow-2xl space-y-3.5 ${
          isDawn
            ? hasVictims
              ? 'bg-[#0c111e] border-rose-500/75'
              : 'bg-[#0b131d] border-amber-400/75'
            : 'bg-[#0d0f1e] border-indigo-400/75'
        }`}
      >
        {/* Top GM Header & Replay Voice */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center border shrink-0 shadow-lg ${
                isDawn
                  ? hasVictims
                    ? 'bg-rose-950 border-rose-400 text-rose-300'
                    : 'bg-amber-950 border-amber-400 text-amber-300'
                  : 'bg-indigo-950 border-indigo-400 text-indigo-300'
              }`}
            >
              {isDawn ? (
                hasVictims ? (
                  <Skull className="w-5 h-5" />
                ) : (
                  <Sun className="w-5 h-5" />
                )
              ) : (
                <Gavel className="w-5 h-5" />
              )}
            </div>
            <div className="min-w-0">
              <span
                className={`text-[10px] font-sans font-extrabold uppercase tracking-wider block truncate ${
                  isDawn
                    ? hasVictims
                      ? 'text-rose-400'
                      : 'text-amber-400'
                    : 'text-indigo-300'
                }`}
              >
                {announcement.badge}
              </span>
              <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                <span>🎙️</span>
                <span>{lang === 'vi' ? 'Quản Trò AI' : 'AI Game Master'}</span>
              </span>
            </div>
          </div>

          <button
            type="button"
            data-testid="gm-announcement-replay-voice-btn"
            onClick={onReplayVoice}
            disabled={isMuted}
            title={lang === 'vi' ? 'Nghe lại Quản Trò đọc' : 'Replay GM Voice'}
            aria-label={lang === 'vi' ? 'Nghe lại Quản Trò đọc' : 'Replay GM Voice'}
            className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[11px] font-bold text-amber-200 flex items-center gap-1.5 cursor-pointer disabled:opacity-40 shrink-0"
          >
            <Volume2 className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">
              {lang === 'vi' ? 'Đọc lại' : 'Replay'}
            </span>
          </button>
        </div>

        {/* Main Dramatic Headline */}
        <div className="text-center space-y-1.5 pt-0.5">
          <h2
            id="gm-announcement-headline"
            data-testid="gm-announcement-headline"
            className={`text-lg sm:text-2xl font-black tracking-tight leading-snug ${
              hasVictims ? 'text-rose-200' : isDawn ? 'text-emerald-200' : 'text-amber-200'
            }`}
          >
            {announcement.headline}
          </h2>

          {/* Authentic Spoken GM Narration Quote */}
          <p
            data-testid="gm-announcement-quote"
            className="text-xs sm:text-sm text-slate-200 italic leading-relaxed bg-[#070a14] border border-slate-800 rounded-2xl px-3.5 py-2.5 text-left"
          >
            {announcement.gmQuote}
          </p>
        </div>

        {/* Victims Roster OR Peaceful Night / Tied Vote Card */}
        {hasVictims ? (
          <div className="space-y-1.5" data-testid="gm-announcement-victims">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-rose-400 flex items-center gap-1.5 px-1">
              <Skull className="w-3.5 h-3.5" />
              <span>
                {isDawn
                  ? lang === 'vi'
                    ? `Danh sách tử trận (${announcement.victims.length})`
                    : `Night Casualties (${announcement.victims.length})`
                  : lang === 'vi'
                  ? `Người chơi bị loại (${announcement.victims.length})`
                  : `Eliminated (${announcement.victims.length})`}
              </span>
            </div>
            <div className={`grid gap-2 ${announcement.victims.length === 1 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
              {announcement.victims.map((v) => (
                <div
                  key={v.id}
                  data-testid={`gm-victim-card-${v.id}`}
                  className="flex items-center gap-2.5 rounded-2xl bg-rose-950/65 border border-rose-500/50 px-3 py-2 shadow"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#090d18] border border-rose-400/50 flex items-center justify-center text-xl shrink-0">
                    {v.avatar}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs sm:text-sm font-black text-rose-100 truncate">
                      <span className="text-amber-400 font-mono mr-1">#{v.seatNumber}</span>
                      <span>{v.name}</span>
                    </div>
                    {v.tag && (
                      <div className="text-[10px] font-bold text-rose-300 truncate">
                        {v.tag}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div
            data-testid="gm-announcement-peaceful"
            className={`flex items-center gap-3 rounded-2xl px-3.5 py-3 border ${
              isDawn
                ? 'bg-emerald-950/55 border-emerald-500/50 text-emerald-100'
                : 'bg-slate-900/85 border-slate-700 text-slate-200'
            }`}
          >
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                isDawn
                  ? 'bg-emerald-900/90 text-emerald-300 border border-emerald-400/50'
                  : 'bg-slate-800 text-amber-300 border border-slate-600'
              }`}
            >
              {isDawn ? <ShieldCheck className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </div>
            <div className="text-xs sm:text-sm font-bold leading-snug">
              {isDawn
                ? lang === 'vi'
                  ? 'Không có ai thiệt mạng đêm qua! Cả làng cùng suy luận xem chuyện gì đã xảy ra.'
                  : 'Zero casualties last night! Discuss with the village to figure out what happened.'
                : lang === 'vi'
                ? 'Không có ai bị treo cổ hôm nay. Màn đêm sắp buông xuống!'
                : 'Nobody was executed today. Night is about to fall!'}
            </div>
          </div>
        )}

        {/* Dusk Vote Tally Breakdown (Shows BOTH vote counts AND who voted for whom) */}
        {!isDawn && announcement.voteBreakdown && announcement.voteBreakdown.length > 0 && (
          <div
            data-testid="gm-announcement-vote-tally"
            className="bg-[#070a14] border border-slate-800 rounded-2xl p-2.5 space-y-1.5"
          >
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400">
              🗳️ {lang === 'vi' ? 'Kết quả kiểm phiếu (Ai bầu ai)' : 'Vote Tally (Who Voted Whom)'}
            </div>
            <div className="space-y-1.5">
              {announcement.voteBreakdown.slice(0, 8).map((entry) => (
                <div
                  key={entry.playerId}
                  data-testid={`gm-vote-tally-row-${entry.playerId}`}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700/90 text-[11px] text-slate-200 space-y-1"
                >
                  <div className="flex items-center justify-between gap-2 font-bold">
                    <span className="flex items-center gap-1.5 min-w-0 truncate">
                      <span>{entry.avatar}</span>
                      <span className="truncate">
                        <span className="text-amber-400 font-mono mr-0.5">#{entry.seatNumber}</span>
                        {entry.name}
                      </span>
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-rose-700 text-white font-mono text-[10px] shrink-0">
                      {entry.votes} {lang === 'vi' ? 'phiếu' : 'votes'}
                    </span>
                  </div>
                  {entry.voters && entry.voters.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1 text-[10px] text-slate-300">
                      <span className="text-slate-400 font-semibold">
                        {lang === 'vi' ? 'Người bầu:' : 'Voters:'}
                      </span>
                      {entry.voters.map((v) => (
                        <span
                          key={v.id}
                          className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-amber-100 font-semibold"
                        >
                          #{v.seatNumber} {v.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Public Cascading Events (Hunter Shot, Elder Penalty, Lover Grief) */}
        {announcement.publicEvents.length > 0 && (
          <div
            data-testid="gm-announcement-public-events"
            className="space-y-1.5 bg-amber-950/45 border border-amber-500/50 rounded-2xl p-3"
          >
            {announcement.publicEvents.map((ev, idx) => (
              <p key={idx} className="text-xs font-bold text-amber-100 leading-snug">
                {ev}
              </p>
            ))}
          </div>
        )}

        {/* Confidential Private Whisper ONLY for the Human Player */}
        {announcement.privateNotice && (
          <div
            data-testid="gm-announcement-private-notice"
            className="rounded-2xl bg-purple-950/60 border border-purple-400/60 p-3 space-y-1"
          >
            <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-purple-300">
              {announcement.isHumanDead ? (
                <Ghost className="w-3.5 h-3.5 text-cyan-300" />
              ) : (
                <Lock className="w-3.5 h-3.5 text-purple-300" />
              )}
              <span>
                {lang === 'vi'
                  ? 'Thông báo mật dành riêng cho bạn'
                  : 'Private GM Notice (Only You Can See)'}
              </span>
            </div>
            <p className="text-xs font-semibold text-purple-100 whitespace-pre-line leading-relaxed">
              {announcement.privateNotice}
            </p>
          </div>
        )}

        {/* Footer: Survivor Counter + Single Primary CTA */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-1">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
            <Users className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              {lang === 'vi'
                ? `Còn sống: ${announcement.aliveCount}/${announcement.totalCount} người`
                : `Survivors: ${announcement.aliveCount}/${announcement.totalCount}`}
            </span>
          </div>

          <button
            type="button"
            data-testid="gm-announcement-continue-btn"
            onClick={onContinue}
            className={`w-full sm:w-auto px-5 py-2.5 rounded-xl font-black text-xs sm:text-sm shadow-lg cursor-pointer transition-colors ${
              isDawn
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                : 'bg-indigo-500 hover:bg-indigo-400 text-white'
            }`}
          >
            {announcement.ctaLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
