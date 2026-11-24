import React from 'react';
import { CheckCircle2, FastForward, Megaphone, RotateCcw } from 'lucide-react';
import { ChatMessage, Language, Phase, Player, VoteRecord } from '../types/game';
import { buildVoteTallyEntries } from '../game/rules';
import { UI_TEXT } from '../utils/i18n';

interface DayActionBarProps {
  lang: Language;
  phase: Phase;
  round: number;
  eventBanner: string;
  morningSummary?: string | null;
  messages: ChatMessage[];
  players: Player[];
  me: Player;
  votes: VoteRecord[];
  hasVoted: boolean;
  selectedTargetId: string | null;
  timerSeconds: number;
  onStartDayVoting: () => void;
  onResolveDayVoting: () => void;
  onClearVote?: () => void;
  onReopenGMAnnouncement?: () => void;
}

export const DayActionBar: React.FC<DayActionBarProps> = ({
  lang,
  phase,
  round,
  eventBanner,
  morningSummary,
  messages,
  players,
  me,
  votes,
  hasVoted,
  selectedTargetId,
  timerSeconds,
  onStartDayVoting,
  onResolveDayVoting,
  onClearVote,
  onReopenGMAnnouncement,
}) => {
  const t = UI_TEXT[lang];

  if (phase === 'day_discussion') {
    const latestClue = messages.filter((m) => !m.isGhost && !m.isSystem).slice(-1)[0];
    const cleanSummary =
      morningSummary ||
      (eventBanner.includes(':')
        ? eventBanner.slice(eventBanner.indexOf(':') + 1).trim()
        : eventBanner);
    const hasDeathInSummary = cleanSummary.includes('💀');

    return (
      <div
        data-testid="day-discussion-console"
        className={`pointer-events-auto w-full max-w-lg bg-[#090e1c]/94 border rounded-2xl px-3 py-2 shadow-xl space-y-1.5 ${
          hasDeathInSummary ? 'border-rose-500/60' : 'border-amber-500/55'
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 font-black text-[10px] uppercase shrink-0">
              ☀️ {t.dayDiscussTitle(round)}
            </span>
            <span
              data-testid="day-morning-summary-text"
              className={`text-[11px] font-extrabold truncate ${
                hasDeathInSummary ? 'text-rose-200' : 'text-emerald-200'
              }`}
            >
              {cleanSummary ||
                (lang === 'vi'
                  ? 'Chia sẻ manh mối trước khi bỏ phiếu'
                  : 'Share clues before voting')}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {onReopenGMAnnouncement && (
              <button
                type="button"
                data-testid="reopen-gm-announcement-btn"
                onClick={onReopenGMAnnouncement}
                title={lang === 'vi' ? 'Xem lại thông báo buổi sáng của Quản Trò' : 'Reopen GM Morning Briefing'}
                aria-label={lang === 'vi' ? 'Xem lại thông báo buổi sáng' : 'Reopen GM Briefing'}
                className="px-2 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 border border-amber-500/40 text-amber-200 font-bold text-[10px] flex items-center gap-1 cursor-pointer shrink-0"
              >
                <Megaphone className="w-3 h-3 text-amber-400" />
                <span className="hidden sm:inline">{lang === 'vi' ? 'Tin sáng' : 'Briefing'}</span>
              </button>
            )}
            <button
              type="button"
              data-testid="day-console-go-vote-btn"
              onClick={onStartDayVoting}
              className="px-2.5 py-1 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-[11px] flex items-center gap-1 cursor-pointer shrink-0 shadow"
            >
              <FastForward className="w-3 h-3 fill-white" />
              <span>{lang === 'vi' ? 'Bỏ Phiếu' : 'Vote'}</span>
            </button>
          </div>
        </div>

        {latestClue && (
          <div className="text-[11px] bg-slate-900/90 border border-slate-800 rounded-lg px-2 py-1 text-slate-200 truncate">
            <span className="font-extrabold text-amber-400 mr-1">{latestClue.senderName}:</span>
            <span>{latestClue.text}</span>
          </div>
        )}
      </div>
    );
  }

  if (phase === 'day_voting') {
    const chosenPlayer = players.find((p) => p.id === selectedTargetId);
    const chosenName = chosenPlayer?.name;
    const voteEntries = buildVoteTallyEntries(players, votes);

    return (
      <div
        data-testid="active-day-voting-console"
        className="pointer-events-auto w-full max-w-lg bg-[#090e1c]/95 border-2 border-rose-500/80 rounded-2xl px-3 py-2 shadow-2xl space-y-1.5"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="px-1.5 py-0.5 rounded bg-rose-600 text-white font-black text-[10px] uppercase shrink-0">
              ⚖️ {lang === 'vi' ? 'Bỏ Phiếu' : 'Vote'}
            </span>
            <span className="text-[11px] font-bold text-rose-100 truncate">
              {hasVoted && chosenName
                ? lang === 'vi'
                  ? `Bạn bầu: ${chosenName}`
                  : `Your vote: ${chosenName}`
                : lang === 'vi'
                ? 'Chọn duy nhất 1 người để treo cổ!'
                : 'Select exactly 1 player to execute!'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {hasVoted && chosenName && onClearVote && (
              <button
                type="button"
                data-testid="voting-console-clear-btn"
                onClick={onClearVote}
                title={lang === 'vi' ? 'Hủy lựa chọn hiện tại để bầu người khác' : 'Clear current selection to change vote'}
                className="px-2 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 font-bold text-[10px] flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3 text-amber-300" />
                <span>{lang === 'vi' ? 'Đổi phiếu' : 'Change'}</span>
              </button>
            )}
            {onReopenGMAnnouncement && (
              <button
                type="button"
                data-testid="reopen-gm-announcement-btn"
                onClick={onReopenGMAnnouncement}
                title={lang === 'vi' ? 'Xem lại thông báo buổi sáng' : 'Reopen Morning Briefing'}
                aria-label={lang === 'vi' ? 'Xem lại thông báo buổi sáng' : 'Reopen Morning Briefing'}
                className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-amber-500/40 text-amber-300 cursor-pointer"
              >
                <Megaphone className="w-3.5 h-3.5" />
              </button>
            )}
            <span className="text-[11px] font-mono font-bold text-amber-300">
              {timerSeconds === 0 && me.isAlive && !hasVoted ? '⏳' : `${Math.round(timerSeconds)}s`}
            </span>
            <button
              type="button"
              data-testid="voting-console-confirm-btn"
              onClick={onResolveDayVoting}
              className="px-2.5 py-1 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-[11px] flex items-center gap-1 cursor-pointer shadow"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>
                {hasVoted
                  ? lang === 'vi'
                    ? 'Chốt Phiếu'
                    : 'Confirm Vote'
                  : lang === 'vi'
                  ? 'Phiếu Trắng'
                  : 'Abstain'}
              </span>
            </button>
          </div>
        </div>

        {/* Live Transparent Vote Breakdown: Shows BOTH count AND exact voters */}
        {voteEntries.length > 0 && (
          <div
            data-testid="live-vote-breakdown"
            className="bg-[#060913]/95 border border-slate-800 rounded-xl px-2 py-1.5 max-h-24 overflow-y-auto space-y-1"
          >
            {voteEntries.map((entry) => {
              const isMyTarget = selectedTargetId === entry.playerId;
              return (
                <div
                  key={entry.playerId}
                  data-testid={`live-vote-row-${entry.playerId}`}
                  className={`flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px] leading-snug rounded-lg px-1.5 py-0.5 ${
                    isMyTarget ? 'bg-rose-950/70 border border-rose-500/50' : ''
                  }`}
                >
                  <span className="font-extrabold text-rose-200 whitespace-nowrap flex items-center gap-1">
                    <span>{entry.avatar}</span>
                    <span className="text-amber-400 font-mono">#{entry.seatNumber}</span>
                    <span>{entry.name}</span>
                    <span className="px-1 py-0.2 rounded bg-rose-700 text-white font-mono text-[9px]">
                      {entry.votes} {t.votesUnit}
                    </span>
                  </span>
                  <span className="text-slate-400">←</span>
                  <span className="flex flex-wrap items-center gap-1">
                    {entry.voters.map((voter) => {
                      const isVoterMe = voter.id === me.id;
                      return (
                        <span
                          key={voter.id}
                          className={`px-1 py-0.2 rounded font-semibold ${
                            isVoterMe
                              ? 'bg-amber-500/25 border border-amber-400/60 text-amber-200'
                              : 'bg-slate-800/90 text-slate-200'
                          }`}
                        >
                          #{voter.seatNumber} {voter.name}
                          {isVoterMe ? (lang === 'vi' ? ' (Bạn)' : ' (You)') : ''}
                        </span>
                      );
                    })}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  if (phase === 'hunter_revenge') {
    return (
      <div className="px-3 py-1 rounded-full bg-rose-950/95 border border-rose-400 text-xs font-extrabold text-amber-200 shadow text-center pointer-events-none">
        {eventBanner}
      </div>
    );
  }

  return null;
};
