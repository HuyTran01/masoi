import React from 'react';
import { CheckCircle2, EyeOff, FlaskConical } from 'lucide-react';
import { Language, Player, RoleDefinition } from '../types/game';
import { AutoGMNightStep } from '../game/autoGM';
import { ROLES } from '../game/roles';
import { UI_TEXT } from '../utils/i18n';

interface NightActionConsoleProps {
  lang: Language;
  me: Player;
  myRole: RoleDefinition;
  players: Player[];
  currentNightStep: AutoGMNightStep;
  isPlayerAwakeAtNight: boolean;
  timerSeconds: number;
  selectedTargetId: string | null;
  secondWolfTargetId: string | null;
  tonightWolfVictimId: string | null;
  witchSaveUsedTonight: boolean;
  witchPoisonTargetId: string | null;
  seerInspectResult: string | null;
  cupidLovers: [string, string] | null;
  onToggleWitchHeal: () => void;
  onConfirmNightAction: () => void;
  onAdvanceBotStep: () => void;
  onCloseEyes: () => void;
}

export const NightActionConsole: React.FC<NightActionConsoleProps> = ({
  lang,
  me,
  myRole,
  players,
  currentNightStep,
  isPlayerAwakeAtNight,
  timerSeconds,
  selectedTargetId,
  secondWolfTargetId,
  tonightWolfVictimId,
  witchSaveUsedTonight,
  witchPoisonTargetId,
  seerInspectResult,
  cupidLovers,
  onToggleWitchHeal,
  onConfirmNightAction,
  onAdvanceBotStep,
  onCloseEyes,
}) => {
  const t = UI_TEXT[lang];

  if (!isPlayerAwakeAtNight || !me.isAlive) {
    return (
      <div
        data-testid="auto-gm-step-pill"
        className="pointer-events-auto flex items-center gap-2 px-3 py-1.5 rounded-xl agrou-wood-panel text-[10px] sm:text-xs font-bold text-[#f6ebd8] max-w-[94vw]"
      >
        <span className="text-[#f5b82e] font-extrabold whitespace-nowrap">
          🌙 {currentNightStep.stepIndex + 1}/{currentNightStep.totalSteps}:
        </span>
        <span className="truncate font-extrabold text-[#fff8ed]">
          {ROLES[currentNightStep.roleId].name[lang]}
        </span>
        <button
          type="button"
          data-testid="auto-gm-next-step-btn"
          onClick={onAdvanceBotStep}
          className="px-2.5 py-0.5 rounded-lg bg-[#e86f24] hover:bg-[#f28139] text-[#fff8ed] font-extrabold text-[10px] flex items-center gap-1 cursor-pointer shrink-0"
        >
          <CheckCircle2 className="w-3 h-3" />
          <span>{lang === 'vi' ? 'Tiếp' : 'Next'}</span>
        </button>
      </div>
    );
  }

  const hasSelectedAction = Boolean(
    selectedTargetId ||
      seerInspectResult ||
      witchSaveUsedTonight ||
      witchPoisonTargetId ||
      (me.roleId === 'cupid' && cupidLovers && cupidLovers[0] && cupidLovers[1])
  );

  const selectedSummary =
    me.roleId === 'cupid' && cupidLovers && cupidLovers.length > 0
      ? cupidLovers
          .map((id) => players.find((p) => p.id === id)?.name)
          .filter(Boolean)
          .join(' 💘 ')
      : me.roleId === 'witch' && witchPoisonTargetId
      ? `${lang === 'vi' ? 'Bình Độc' : 'Poison'}: ${
          players.find((p) => p.id === witchPoisonTargetId)?.name || ''
        }`
      : selectedTargetId
      ? `${players.find((p) => p.id === selectedTargetId)?.name || ''}${
          secondWolfTargetId
            ? ` & ${players.find((p) => p.id === secondWolfTargetId)?.name || ''}`
            : ''
        }`
      : null;

  return (
    <div
      data-testid="active-night-role-console"
      className="pointer-events-auto w-full max-w-lg agrou-wood-panel !border-2 !border-[#e89c3e] rounded-2xl px-3 py-2 sm:px-3.5 sm:py-2.5 space-y-1.5"
    >
      {/* Top Row: Role + Step + Single Primary Confirm CTA */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="px-1.5 py-0.5 rounded bg-[#e86f24] text-[#fff8ed] font-black text-[10px] uppercase shrink-0">
            {lang === 'vi' ? 'Lượt bạn' : 'Your Turn'}
          </span>
          <span className="text-xs sm:text-sm font-black text-[#fde7c3] truncate">
            {myRole.name[lang]}
          </span>
          <span
            data-testid="role-console-timer-status"
            className="text-[11px] font-mono font-bold text-[#86efac] shrink-0"
          >
            {timerSeconds === 0 ? '⏳' : `${Math.round(timerSeconds)}s`}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onCloseEyes}
            className="hidden sm:inline-flex p-1.5 rounded-lg bg-[#1b120b] hover:bg-[#312115] border border-[#785334] text-[#d6bfa2] cursor-pointer"
            title={t.closeEyesSleep}
            aria-label={t.closeEyesSleep}
          >
            <EyeOff className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            data-testid="role-console-confirm-btn"
            onClick={onConfirmNightAction}
            className="px-2.5 py-1 rounded-xl bg-[#2f7d4d] hover:bg-[#38945b] border border-[#86efac]/70 text-[#fff8ed] font-extrabold text-[11px] sm:text-xs flex items-center gap-1 cursor-pointer shadow"
          >
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>
              {hasSelectedAction
                ? lang === 'vi'
                  ? 'Xác Nhận & Kết Thúc Đêm'
                  : 'Confirm & End Night'
                : lang === 'vi'
                ? 'Qua Đêm'
                : 'End Night'}
            </span>
          </button>
        </div>
      </div>

      {/* Clear 1-Line Instruction */}
      <p className="text-[11px] text-[#e6d5b8] leading-snug">
        {currentNightStep.playerInstruction[lang]}{' '}
        <span className="text-[#f5b82e] font-semibold">
          {lang === 'vi'
            ? '(Bấm vào nhân vật 3D hoặc thanh bên dưới)'
            : '(Tap a 3D villager or bottom dock)'}
        </span>
      </p>

      {/* Witch Heal Control */}
      {me.roleId === 'witch' && currentNightStep.key === 'witch' && (
        <div className="flex flex-wrap items-center justify-between gap-2 bg-[#1c3621] border border-[#5cb85c]/60 rounded-xl px-2.5 py-1.5">
          <span className="text-[11px] text-[#dcfce7] font-bold">
            🐺{' '}
            {lang === 'vi'
              ? `Bị Sói cắn: ${
                  players.find((p) => p.id === tonightWolfVictimId)?.name || 'Không rõ'
                }`
              : `Bitten: ${
                  players.find((p) => p.id === tonightWolfVictimId)?.name || 'Unknown'
                }`}
          </span>
          <button
            type="button"
            data-testid="role-console-witch-heal-btn"
            disabled={Boolean(me.hasUsedHeal) || !tonightWolfVictimId}
            onClick={onToggleWitchHeal}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold border flex items-center gap-1 cursor-pointer ${
              witchSaveUsedTonight
                ? 'bg-[#2f7d4d] text-white border-[#86efac]'
                : 'bg-[#1a110a] text-[#86efac] border-[#5cb85c]/60 disabled:opacity-40'
            }`}
          >
            <FlaskConical className="w-3 h-3" />
            <span>
              {me.hasUsedHeal
                ? t.witchOutHeal
                : witchSaveUsedTonight
                ? t.witchHealActive
                : t.witchHealBtn(
                    players.find((p) => p.id === tonightWolfVictimId)?.name || '?'
                  )}
            </span>
          </button>
        </div>
      )}

      {/* Seer Result OR Selected Target Chip */}
      {seerInspectResult ? (
        <div
          data-testid="role-console-seer-result"
          className="px-2.5 py-1 rounded-lg bg-[#382147] border border-[#c084fc] text-[#f3e8ff] text-[11px] font-extrabold"
        >
          🔮 {seerInspectResult}
        </div>
      ) : (
        selectedSummary && (
          <div
            data-testid="role-console-selected-status"
            className="px-2.5 py-1 rounded-lg bg-[#422614] border border-[#e89c3e] text-[#fef3c7] text-[11px] font-bold"
          >
            🎯 {lang === 'vi' ? 'Đã chọn:' : 'Selected:'} {selectedSummary}
          </div>
        )
      )}
    </div>
  );
};
