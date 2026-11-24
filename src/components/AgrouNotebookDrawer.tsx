import React from 'react';
import { BookOpenCheck, Crown, Send, ShieldCheck, Skull, X } from 'lucide-react';
import { Language, Player, RoleId } from '../types/game';
import { ROLES } from '../game/roles';
import {
  AgrouNotebookState,
  DeductionTrustLevel,
  PlayerNotebookNote,
} from '../game/agrouMechanics';

interface AgrouNotebookDrawerProps {
  isOpen: boolean;
  lang: Language;
  players: Player[];
  meId: string;
  mayorId: string | null;
  notebook: AgrouNotebookState;
  onUpdatePlayerNote: (playerId: string, patch: Partial<PlayerNotebookNote>) => void;
  onUpdateFreeText: (text: string) => void;
  onShareSummaryToChat: () => void;
  onClose: () => void;
}

const TRUST_BUTTONS: {
  level: DeductionTrustLevel;
  icon: string;
  labelVi: string;
  labelEn: string;
  activeClass: string;
}[] = [
  {
    level: 'trusted',
    icon: '🛡️',
    labelVi: 'Tin',
    labelEn: 'Safe',
    activeClass: 'bg-[#2a7b4f] text-white border-[#1b5736]',
  },
  {
    level: 'suspicious',
    icon: '❓',
    labelVi: 'Nghi',
    labelEn: 'Sus',
    activeClass: 'bg-[#c97b1e] text-white border-[#8c520d]',
  },
  {
    level: 'wolf_lock',
    icon: '🐺',
    labelVi: 'Sói!',
    labelEn: 'Wolf!',
    activeClass: 'bg-[#b92d2d] text-white border-[#7d1919]',
  },
];

const QUICK_ROLE_GUESSES: (RoleId | 'unknown')[] = [
  'unknown',
  'werewolf',
  'seer',
  'bodyguard',
  'witch',
  'hunter',
  'villager',
  'tanner',
];

export const AgrouNotebookDrawer: React.FC<AgrouNotebookDrawerProps> = ({
  isOpen,
  lang,
  players,
  meId,
  mayorId,
  notebook,
  onUpdatePlayerNote,
  onUpdateFreeText,
  onShareSummaryToChat,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div
      data-testid="agrou-notebook-drawer"
      className="fixed inset-y-3 right-3 z-40 w-[min(410px,calc(100vw-24px))] pointer-events-auto flex flex-col agrou-parchment-panel rounded-2xl overflow-hidden"
    >
      {/* Parchment Header */}
      <div className="px-4 py-3 bg-[#e6d1ae] border-b-2 border-[#b28450] flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <BookOpenCheck className="w-5 h-5 text-[#7a3f15] shrink-0" />
          <div className="min-w-0">
            <h3 className="text-sm font-extrabold text-[#2c1b0e] truncate">
              {lang === 'vi' ? 'Sổ Tay Suy Luận Lửa Trại' : 'Campfire Deduction Notebook'}
            </h3>
            <p className="text-[10px] font-semibold text-[#6b4829] truncate">
              {lang === 'vi'
                ? 'Ghi chú riêng của bạn — không ai khác thấy được'
                : 'Private notes — only visible to you'}
            </p>
          </div>
        </div>

        <button
          type="button"
          data-testid="close-notebook-btn"
          onClick={onClose}
          aria-label={lang === 'vi' ? 'Đóng Sổ Tay' : 'Close Notebook'}
          className="p-1.5 rounded-lg bg-[#d7bc92] hover:bg-[#c8a776] text-[#3a2210] cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Scrollable Body */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5">
        {/* Per-Player Deduction Grid */}
        <div className="space-y-1.5">
          <div className="text-[11px] font-extrabold text-[#5c3618] flex items-center justify-between">
            <span>{lang === 'vi' ? 'Đánh dấu từng người chơi' : 'Tag each villager'}</span>
            <span className="text-[10px] font-semibold text-[#7d5836]">
              {players.filter((p) => p.isAlive).length}/{players.length}{' '}
              {lang === 'vi' ? 'sống' : 'alive'}
            </span>
          </div>

          <div className="space-y-1.5">
            {players.map((p, idx) => {
              const entry = notebook.playerNotes[p.id] || {
                guessedRole: 'unknown' as const,
                trust: 'unknown' as const,
                memo: '',
              };
              const isMe = p.id === meId;
              const isMayor = p.id === mayorId;

              return (
                <div
                  key={p.id}
                  data-testid={`notebook-row-${p.id}`}
                  className={`rounded-xl border px-2.5 py-2 space-y-1.5 ${
                    !p.isAlive
                      ? 'bg-[#e5d8c0]/75 border-[#b8a384] opacity-75'
                      : 'bg-[#fbf4e6] border-[#c9a97c]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-xs font-mono font-extrabold text-[#8a4d19]">
                        #{idx + 1}
                      </span>
                      <span className="text-sm">{p.isAlive ? p.avatar : '👻'}</span>
                      <span
                        className={`text-xs font-extrabold truncate ${
                          !p.isAlive ? 'line-through text-[#786552]' : 'text-[#2b1a0e]'
                        }`}
                      >
                        {p.name}
                      </span>
                      {isMe && (
                        <span className="text-[9px] font-bold text-[#1d6396]">
                          ({lang === 'vi' ? 'Bạn' : 'You'})
                        </span>
                      )}
                      {isMayor && (
                        <Crown
                          className="w-3.5 h-3.5 text-[#c7860a] shrink-0"
                          aria-label="Mayor"
                        />
                      )}
                    </div>

                    {/* Trust Buttons */}
                    <div className="flex items-center gap-1 shrink-0">
                      {TRUST_BUTTONS.map((tb) => {
                        const active = entry.trust === tb.level;
                        return (
                          <button
                            key={tb.level}
                            type="button"
                            data-testid={`notebook-trust-${p.id}-${tb.level}`}
                            onClick={() =>
                              onUpdatePlayerNote(p.id, {
                                trust: active ? 'unknown' : tb.level,
                              })
                            }
                            className={`px-1.5 py-0.5 rounded-md border text-[10px] font-extrabold cursor-pointer transition-colors ${
                              active
                                ? tb.activeClass
                                : 'bg-[#efe1c8] border-[#c4a77d] text-[#593b21] hover:bg-[#e5d0ad]'
                            }`}
                          >
                            {tb.icon} {lang === 'vi' ? tb.labelVi : tb.labelEn}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Role Guess Select + Quick Memo */}
                  <div className="flex items-center gap-1.5">
                    <select
                      value={entry.guessedRole}
                      aria-label={`Guess role for ${p.name}`}
                      data-testid={`notebook-role-select-${p.id}`}
                      onChange={(e) =>
                        onUpdatePlayerNote(p.id, {
                          guessedRole: e.target.value as RoleId | 'unknown',
                        })
                      }
                      className="bg-[#f2e5ce] border border-[#be9c6f] rounded-lg px-2 py-1 text-[11px] font-bold text-[#3a2311] focus:outline-none cursor-pointer"
                    >
                      {QUICK_ROLE_GUESSES.map((rKey) => (
                        <option key={rKey} value={rKey}>
                          {rKey === 'unknown'
                            ? lang === 'vi'
                              ? '❓ Chưa rõ vai'
                              : '❓ Unknown role'
                            : ROLES[rKey].name[lang]}
                        </option>
                      ))}
                    </select>

                    <input
                      type="text"
                      value={entry.memo}
                      onChange={(e) => onUpdatePlayerNote(p.id, { memo: e.target.value })}
                      placeholder={
                        lang === 'vi' ? 'Ghi chú nhanh...' : 'Quick clue...'
                      }
                      className="flex-1 min-w-0 bg-[#fffaf0] border border-[#cfb48e] rounded-lg px-2 py-1 text-[11px] text-[#2b1a0e] placeholder:text-[#9c8264] focus:outline-none focus:border-[#8f521a]"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Free-Form Campfire Notes */}
        <div className="space-y-1">
          <label
            htmlFor="agrou-notebook-freetext"
            className="text-[11px] font-extrabold text-[#5c3618] block"
          >
            {lang === 'vi' ? 'Ghi chép suy luận tự do' : 'Free-form deduction notes'}
          </label>
          <textarea
            id="agrou-notebook-freetext"
            data-testid="notebook-freetext-input"
            rows={3}
            value={notebook.freeText}
            onChange={(e) => onUpdateFreeText(e.target.value)}
            placeholder={
              lang === 'vi'
                ? 'VD: Đêm 1 không ai chết -> Bảo Vệ đỡ chuẩn hoặc Phù Thủy đã cứu...'
                : 'e.g. Night 1 peaceful -> Bodyguard shielded or Witch healed...'
            }
            className="w-full rounded-xl bg-[#fffaf0] border border-[#c4a172] px-2.5 py-2 text-xs text-[#2c1b0e] placeholder:text-[#9a7f60] focus:outline-none focus:border-[#8c521b] resize-none"
          />
        </div>

        {/* Auto-Recorded Match Timeline */}
        {notebook.timeline.length > 0 && (
          <div className="space-y-1.5 pt-2 border-t border-[#caa87a]">
            <div className="text-[11px] font-extrabold text-[#5c3618]">
              {lang === 'vi' ? 'Nhật ký sự kiện ván đấu' : 'Auto-logged Match Timeline'}
            </div>
            <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
              {notebook.timeline.map((ev) => (
                <div
                  key={ev.id}
                  className="text-[11px] rounded-lg bg-[#efe0c4] border border-[#cfb082] px-2.5 py-1.5 flex items-start gap-1.5 text-[#36200f]"
                >
                  <span className="shrink-0 mt-0.5">
                    {ev.tone === 'death' ? (
                      <Skull className="w-3.5 h-3.5 text-[#b52626]" />
                    ) : ev.tone === 'mayor' ? (
                      <Crown className="w-3.5 h-3.5 text-[#b57609]" />
                    ) : (
                      <ShieldCheck className="w-3.5 h-3.5 text-[#226e44]" />
                    )}
                  </span>
                  <div className="min-w-0 leading-snug">
                    <span className="font-extrabold text-[#7d4314] mr-1">
                      [{ev.phaseLabel}]
                    </span>
                    <span>{ev.text}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer Share Button */}
      <div className="px-4 py-2.5 bg-[#e6d1ae] border-t-2 border-[#b28450] flex items-center justify-between gap-2">
        <button
          type="button"
          data-testid="notebook-share-chat-btn"
          onClick={onShareSummaryToChat}
          className="flex-1 py-2 px-3 rounded-xl bg-[#9e4716] hover:bg-[#b5531c] text-[#fff6e8] font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow"
        >
          <Send className="w-3.5 h-3.5" />
          <span>
            {lang === 'vi' ? 'Chia sẻ suy luận lên Chat Làng' : 'Share Summary to Village Chat'}
          </span>
        </button>
      </div>
    </div>
  );
};
