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
          ? 'radial-gradient(circle at 50% 28%, rgba(44, 28, 16, 0.78) 0%, rgba(16, 10, 6, 0.9) 78%)'
          : 'radial-gradient(circle at 50% 28%, rgba(36, 18, 22, 0.82) 0%, rgba(14, 9, 8, 0.92) 78%)',
      }}
    >
      <div
        className={`w-full max-w-lg max-h-[88vh] overflow-y-auto rounded-3xl agrou-wood-panel p-4 sm:p-6 space-y-3.5 ${
          isDawn
            ? hasVictims
              ? '!border-2 !border-[#dc4c3e]'
              : '!border-2 !border-[#e89c3e]'
            : '!border-2 !border-[#a78bfa]'
        }`}
      >
        {/* Top GM Header & Replay Voice */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center border-2 shrink-0 shadow-lg ${
                isDawn
                  ? hasVictims
                    ? 'bg-[#4f1814] border-[#f87171] text-[#fecaca]'
                    : 'bg-[#4f2c12] border-[#f5b82e] text-[#fde047]'
                  : 'bg-[#2a1d42] border-[#a78bfa] text-[#ddd6fe]'
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
                      ? 'text-[#fca5a5]'
                      : 'text-[#f5b82e]'
                    : 'text-[#c4b5fd]'
                }`}
              >
                {announcement.badge}
              </span>
              <span className="text-[11px] font-bold text-[#d6bfa2] flex items-center gap-1">
                <span>🎙️</span>
                <span>{lang === 'vi' ? 'Quản Trò Lửa Trại' : 'Campfire Game Master'}</span>
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
            className="px-2.5 py-1.5 rounded-xl bg-[#1b120b] hover:bg-[#312115] border border-[#785334] text-[11px] font-bold text-[#fde7c3] flex items-center gap-1.5 cursor-pointer disabled:opacity-40 shrink-0"
          >
            <Volume2 className="w-3.5 h-3.5 text-[#f5b82e]" />
            <span className="hidden sm:inline">
              {lang === 'vi' ? 'Đọc lại' : 'Replay'}
            </span>
          </button>
        </div>

        {/* Main Dramatic Headline */}
        <div className="text-center space-y-2 pt-0.5">
          <h2
            id="gm-announcement-headline"
            data-testid="gm-announcement-headline"
            className={`text-lg sm:text-2xl font-black tracking-tight leading-snug ${
              hasVictims ? 'text-[#fecaca]' : isDawn ? 'text-[#fef3c7]' : 'text-[#fde7c3]'
            }`}
          >
            {announcement.headline}
          </h2>

          {/* Parchment Chronicle Narration Quote */}
          <p
            data-testid="gm-announcement-quote"
            className="text-xs sm:text-sm text-[#2c1a0e] font-semibold italic leading-relaxed agrou-parchment-panel rounded-2xl px-3.5 py-2.5 text-left"
          >
            {announcement.gmQuote}
          </p>
        </div>

        {/* Victims Roster OR Peaceful Night / Tied Vote Card */}
        {hasVictims ? (
          <div className="space-y-1.5" data-testid="gm-announcement-victims">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#fca5a5] flex items-center gap-1.5 px-1">
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
            <div
              className={`grid gap-2 ${
                announcement.victims.length === 1 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'
              }`}
            >
              {announcement.victims.map((v) => (
                <div
                  key={v.id}
                  data-testid={`gm-victim-card-${v.id}`}
                  className="flex items-center gap-2.5 rounded-2xl bg-[#4a1814] border border-[#e66b5b] px-3 py-2 shadow"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#24120e] border border-[#f87171]/60 flex items-center justify-center text-xl shrink-0">
                    {v.avatar}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs sm:text-sm font-black text-[#fff1f0] truncate">
                      <span className="text-[#f5b82e] font-mono mr-1">#{v.seatNumber}</span>
                      <span>{v.name}</span>
                    </div>
                    {v.tag && (
                      <div className="text-[10px] font-bold text-[#fca5a5] truncate">
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
                ? 'bg-[#1c3621] border-[#5cb85c]/70 text-[#dcfce7]'
                : 'bg-[#241810] border-[#785334] text-[#f6ebd8]'
            }`}
          >
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                isDawn
                  ? 'bg-[#264d2d] text-[#86efac] border border-[#5cb85c]'
                  : 'bg-[#362417] text-[#f5b82e] border border-[#9c7248]'
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

        {/* Dusk Vote Tally Breakdown */}
        {!isDawn && announcement.voteBreakdown && announcement.voteBreakdown.length > 0 && (
          <div
            data-testid="gm-announcement-vote-tally"
            className="bg-[#1a110a] border border-[#6b4a2e] rounded-2xl p-2.5 space-y-1.5"
          >
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#f5b82e]">
              🗳️ {lang === 'vi' ? 'Kết quả kiểm phiếu (Ai bầu ai)' : 'Vote Tally (Who Voted Whom)'}
            </div>
            <div className="space-y-1.5">
              {announcement.voteBreakdown.slice(0, 8).map((entry) => (
                <div
                  key={entry.playerId}
                  data-testid={`gm-vote-tally-row-${entry.playerId}`}
                  className="px-2.5 py-1.5 rounded-xl bg-[#2a1c12] border border-[#6b4a2e] text-[11px] text-[#f6ebd8] space-y-1"
                >
                  <div className="flex items-center justify-between gap-2 font-bold">
                    <span className="flex items-center gap-1.5 min-w-0 truncate">
                      <span>{entry.avatar}</span>
                      <span className="truncate">
                        <span className="text-[#f5b82e] font-mono mr-0.5">#{entry.seatNumber}</span>
                        {entry.name}
                      </span>
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-[#b83227] text-white font-mono text-[10px] shrink-0">
                      {entry.votes} {lang === 'vi' ? 'phiếu' : 'votes'}
                    </span>
                  </div>
                  {entry.voters && entry.voters.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1 text-[10px] text-[#d6bfa2]">
                      <span className="text-[#bfa586] font-semibold">
                        {lang === 'vi' ? 'Người bầu:' : 'Voters:'}
                      </span>
                      {entry.voters.map((v) => (
                        <span
                          key={v.id}
                          className="px-1.5 py-0.5 rounded bg-[#1b120b] border border-[#6b4a2e] text-[#fde7c3] font-semibold"
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

        {/* Public Cascading Events */}
        {announcement.publicEvents.length > 0 && (
          <div
            data-testid="gm-announcement-public-events"
            className="space-y-1.5 bg-[#422614] border border-[#e89c3e] rounded-2xl p-3"
          >
            {announcement.publicEvents.map((ev, idx) => (
              <p key={idx} className="text-xs font-bold text-[#fef3c7] leading-snug">
                {ev}
              </p>
            ))}
          </div>
        )}

        {/* Confidential Private Whisper */}
        {announcement.privateNotice && (
          <div
            data-testid="gm-announcement-private-notice"
            className="rounded-2xl bg-[#341d47] border border-[#c084fc] p-3 space-y-1"
          >
            <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-[#e9d5ff]">
              {announcement.isHumanDead ? (
                <Ghost className="w-3.5 h-3.5 text-[#67e8f9]" />
              ) : (
                <Lock className="w-3.5 h-3.5 text-[#d8b4fe]" />
              )}
              <span>
                {lang === 'vi'
                  ? 'Thông báo mật dành riêng cho bạn'
                  : 'Private GM Notice (Only You Can See)'}
              </span>
            </div>
            <p className="text-xs font-semibold text-[#f3e8ff] whitespace-pre-line leading-relaxed">
              {announcement.privateNotice}
            </p>
          </div>
        )}

        {/* Footer: Survivor Counter + Single Primary CTA */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-1">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#e6d5b8]">
            <Users className="w-4 h-4 text-[#6ee7b7] shrink-0" />
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
                ? 'bg-[#e86f24] hover:bg-[#f28139] border border-[#fbc266] text-[#fff8ed]'
                : 'bg-[#5b3ea6] hover:bg-[#6d4dc2] border border-[#c4b5fd] text-white'
            }`}
          >
            {announcement.ctaLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
