import React from 'react';
import { CheckCircle2, FastForward, Flame, Megaphone, RotateCcw } from 'lucide-react';
import { ChatMessage, Language, Phase, Player, VoteRecord } from '../types/game';
import { buildVoteTallyEntries } from '../game/rules';
import { CAMPFIRE_ABSTAIN_ID, tallyVotesWithMayor } from '../game/agrouMechanics';
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
  mayorId?: string | null;
  hasVoted: boolean;
  selectedTargetId: string | null;
  timerSeconds: number;
  canAdvancePhase?: boolean;
  onStartDayVoting: () => void;
  onResolveDayVoting: () => void;
  onVoteCampfireAbstain?: () => void;
  onClearVote?: () => void;
  onReopenGMAnnouncement?: () => void;
  canUserShootHunter?: boolean;
  onSkipHunterShot?: () => void;
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
  mayorId = null,
  hasVoted,
  selectedTargetId,
  timerSeconds,
  canAdvancePhase = true,
  onStartDayVoting,
  onResolveDayVoting,
  onVoteCampfireAbstain,
  onClearVote,
  onReopenGMAnnouncement,
  canUserShootHunter = false,
  onSkipHunterShot,
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
        className={`pointer-events-auto w-full max-w-lg agrou-wood-panel rounded-2xl px-3 py-2 space-y-1.5 ${
          hasDeathInSummary ? '!border-[#dc4c3e]' : '!border-[#e89c3e]'
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="px-1.5 py-0.5 rounded bg-[#b84b10] text-white font-black text-[10px] uppercase shrink-0">
              ☀️ {t.dayDiscussTitle(round)}
            </span>
            <span
              data-testid="day-morning-summary-text"
              className={`text-[11px] font-extrabold truncate ${
                hasDeathInSummary ? 'text-[#fecaca]' : 'text-[#d1fae5]'
              }`}
            >
              {cleanSummary || t.dayDiscussHint}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {onReopenGMAnnouncement && (
              <button
                type="button"
                data-testid="reopen-gm-announcement-btn"
                onClick={onReopenGMAnnouncement}
                title={t.briefing}
                aria-label={t.briefing}
                className="px-2 py-1 rounded-xl bg-[#1b120b] hover:bg-[#312115] border border-[#9c7248] text-[#fde7c3] font-bold text-[10px] flex items-center gap-1 cursor-pointer shrink-0"
              >
                <Megaphone className="w-3 h-3 text-[#f5b82e]" />
                <span className="hidden sm:inline">{t.briefing}</span>
              </button>
            )}
            {canAdvancePhase ? (
              <button
                type="button"
                data-testid="day-console-go-vote-btn"
                onClick={onStartDayVoting}
                className="px-2.5 py-1 rounded-xl bg-[#b83227] hover:bg-[#cf3e32] border border-[#fca5a5]/60 text-white font-extrabold text-[11px] flex items-center gap-1 cursor-pointer shrink-0 shadow"
              >
                <FastForward className="w-3 h-3 fill-white" />
                <span>{t.voteAction}</span>
              </button>
            ) : (
              <span className="px-2 py-1 rounded-xl bg-[#1b120b] border border-[#6b4a2e] text-[10px] font-mono font-bold text-[#f5b82e] shrink-0">
                ⏳ {Math.round(timerSeconds)}s
              </span>
            )}
          </div>
        </div>

        {latestClue && (
          <div className="text-[11px] bg-[#1a110a] border border-[#6b4a2e] rounded-lg px-2 py-1 text-[#f6ebd8] truncate">
            <span className="font-extrabold text-[#f5b82e] mr-1">{latestClue.senderName}:</span>
            <span>{latestClue.text}</span>
          </div>
        )}
      </div>
    );
  }

  if (phase === 'day_voting') {
    const isAbstaining = selectedTargetId === CAMPFIRE_ABSTAIN_ID;
    const chosenPlayer = !isAbstaining ? players.find((p) => p.id === selectedTargetId) : null;
    const chosenName = chosenPlayer?.name;
    const mayorTally = tallyVotesWithMayor(votes, mayorId);
    const voteEntries = buildVoteTallyEntries(
      players,
      votes.filter((v) => v.targetId !== CAMPFIRE_ABSTAIN_ID)
    )
      .map((entry) => ({
        ...entry,
        weightedVotes: mayorTally.counts[entry.playerId] ?? entry.votes,
      }))
      .sort((a, b) => b.weightedVotes - a.weightedVotes);

    const abstainerPlayers = mayorTally.abstainerIds
      .map((id) => players.find((p) => p.id === id))
      .filter((p): p is Player => Boolean(p));

    return (
      <div
        data-testid="active-day-voting-console"
        className="pointer-events-auto w-full max-w-lg agrou-wood-panel !border-2 !border-[#dc4c3e] rounded-2xl px-3 py-2 space-y-1.5"
      >
        <div className="flex flex-wrap items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="px-1.5 py-0.5 rounded bg-[#b83227] text-white font-black text-[10px] uppercase shrink-0">
              ⚖️ {t.voteAction}
            </span>
            <span className="text-[11px] font-bold text-[#fde7c3] truncate">
              {hasVoted && isAbstaining
                ? t.youVotedAbstain
                : hasVoted && chosenName
                ? `${t.yourVotePrefix} ${chosenName}${me.id === mayorId ? ' (👑 x2)' : ''}`
                : t.selectSuspectHint}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {me.isAlive && onVoteCampfireAbstain && (
              <button
                type="button"
                data-testid="vote-campfire-abstain-btn"
                onClick={onVoteCampfireAbstain}
                title={t.campfireAbstain}
                className={`px-2 py-1 rounded-xl border text-[10px] font-extrabold flex items-center gap-1 cursor-pointer ${
                  isAbstaining
                    ? 'bg-[#1c3621] border-[#6ee7b7] text-[#d1fae5]'
                    : 'bg-[#362417] hover:bg-[#49311f] border-[#e89c3e] text-[#fde7c3]'
                }`}
              >
                <Flame className="w-3 h-3 text-[#f59e0b]" />
                <span>{t.abstainShort}</span>
              </button>
            )}

            {hasVoted && (chosenName || isAbstaining) && onClearVote && (
              <button
                type="button"
                data-testid="voting-console-clear-btn"
                onClick={onClearVote}
                title={t.changeVoteBtn}
                className="px-2 py-1 rounded-xl bg-[#1b120b] hover:bg-[#312115] border border-[#785334] text-[#e6d5b8] font-bold text-[10px] flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3 text-[#f5b82e]" />
                <span className="hidden sm:inline">{t.changeVoteBtn}</span>
              </button>
            )}

            {onReopenGMAnnouncement && (
              <button
                type="button"
                data-testid="reopen-gm-announcement-btn"
                onClick={onReopenGMAnnouncement}
                title={t.briefing}
                aria-label={t.briefing}
                className="p-1 rounded-lg bg-[#1b120b] hover:bg-[#312115] border border-[#9c7248] text-[#f5b82e] cursor-pointer"
              >
                <Megaphone className="w-3.5 h-3.5" />
              </button>
            )}

            <span className="text-[11px] font-mono font-bold text-[#f5b82e]">
              {timerSeconds === 0 && me.isAlive && !hasVoted ? '⏳' : `${Math.round(timerSeconds)}s`}
            </span>

            {canAdvancePhase && (
              <button
                type="button"
                data-testid="voting-console-confirm-btn"
                onClick={onResolveDayVoting}
                className="px-2.5 py-1 rounded-xl bg-[#b84b10] hover:bg-[#9e3f0c] border border-[#fbc266] text-white font-extrabold text-[11px] flex items-center gap-1 cursor-pointer shadow"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{hasVoted ? t.confirmVoteBtn : t.finishBtn}</span>
              </button>
            )}
          </div>
        </div>

        {/* Live Transparent Vote Breakdown (Shows Mayor x2 weight + Campfire Abstentions) */}
        {(voteEntries.length > 0 || mayorTally.abstainCount > 0) && (
          <div
            data-testid="live-vote-breakdown"
            className="bg-[#1a110a] border border-[#6b4a2e] rounded-xl p-2 max-h-32 sm:max-h-56 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-1.5"
          >
            {voteEntries.map((entry) => {
              const isMyTarget = selectedTargetId === entry.playerId;
              return (
                <div
                  key={entry.playerId}
                  data-testid={`live-vote-row-${entry.playerId}`}
                  className={`flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] leading-snug rounded-lg px-2 py-1 ${
                    isMyTarget ? 'bg-[#5c1d16] border border-[#f97316]/60' : 'bg-[#24180f]/60'
                  }`}
                >
                  <span className="font-extrabold text-[#fde7c3] whitespace-nowrap flex items-center gap-1">
                    <span>{entry.avatar}</span>
                    <span className="text-[#f5b82e] font-mono">#{entry.seatNumber}</span>
                    <span>{entry.name}</span>
                    <span className="px-1 py-0.2 rounded bg-[#b83227] text-white font-mono text-[9px]">
                      {entry.weightedVotes} {t.votesUnit}
                    </span>
                  </span>
                  <span className="text-[#bfa586]">←</span>
                  <span className="flex flex-wrap items-center gap-1">
                    {entry.voters.map((voter) => {
                      const isVoterMe = voter.id === me.id;
                      const isVoterMayor = Boolean(mayorId && voter.id === mayorId);
                      return (
                        <span
                          key={voter.id}
                          className={`px-1 py-0.2 rounded font-semibold ${
                            isVoterMayor
                              ? 'bg-[#4f2c12] border border-[#f5b82e] text-[#fef3c7]'
                              : isVoterMe
                              ? 'bg-[#e86f24]/30 border border-[#fbc266] text-[#fff8ed]'
                              : 'bg-[#2a1c12] text-[#e6d5b8]'
                          }`}
                        >
                          {isVoterMayor ? '👑 ' : ''}#{voter.seatNumber} {voter.name}
                          {isVoterMayor ? ' (x2)' : isVoterMe ? ` ${t.youSuffix}` : ''}
                        </span>
                      );
                    })}
                  </span>
                </div>
              );
            })}

            {mayorTally.abstainCount > 0 && (
              <div
                data-testid="live-vote-row-campfire-abstain"
                className={`flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px] leading-snug rounded-lg px-1.5 py-0.5 ${
                  isAbstaining ? 'bg-[#1c3621] border border-[#6ee7b7]/60' : ''
                }`}
              >
                <span className="font-extrabold text-[#fde7c3] whitespace-nowrap flex items-center gap-1">
                  <span>🔥</span>
                  <span>{t.campfireAbstain}</span>
                  <span className="px-1 py-0.2 rounded bg-[#b84b10] text-white font-mono text-[9px]">
                    {mayorTally.abstainCount} {t.votesUnit}
                  </span>
                </span>
                <span className="text-[#bfa586]">←</span>
                <span className="flex flex-wrap items-center gap-1">
                  {abstainerPlayers.map((ap) => (
                    <span
                      key={ap.id}
                      className="px-1 py-0.2 rounded bg-[#2a1c12] text-[#fde7c3] font-semibold"
                    >
                      {ap.id === mayorId ? '👑 ' : ''}
                      {ap.name}
                      {ap.id === mayorId ? ' (x2)' : ''}
                    </span>
                  ))}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  if (phase === 'hunter_revenge') {
    return (
      <div
        data-testid="hunter-revenge-bar"
        className="pointer-events-auto flex flex-wrap items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-[#4f1814] border-2 border-[#f87171] text-xs font-extrabold text-[#fde7c3] shadow-xl text-center"
      >
        <span>{eventBanner}</span>
        {canUserShootHunter && onSkipHunterShot && (
          <button
            type="button"
            data-testid="hunter-hold-fire-btn"
            onClick={onSkipHunterShot}
            className="px-3 py-1 rounded-lg bg-[#1b120b] hover:bg-[#312115] border border-[#f5b82e]/80 text-[#fde7c3] text-[11px] font-extrabold cursor-pointer"
          >
            {t.holdFireBtn}
          </button>
        )}
      </div>
    );
  }

  return null;
};
