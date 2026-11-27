import React from 'react';
import { CheckCircle2, EyeOff, FastForward, FlaskConical } from 'lucide-react';
import { GhostNightSpectatorView, Language, Player, RoleDefinition } from '../types/game';
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
  dyingWolfVictimIds: string[];
  witchHealTargetId: string | null;
  witchPoisonTargetId: string | null;
  seerInspectResult: string | null;
  cupidLovers: [string, string] | null;
  isOnlineWaitingConfirm?: boolean;
  isSeerInspectPending?: boolean;
  canAdvanceBotStep?: boolean;
  wolfPackPicks?: Record<string, { primary?: string; secondary?: string }> | null;
  ghostNightState?: GhostNightSpectatorView | null;
  wakingActors?: Player[];
  liveNightSummary?: string | null;
  onSkipStepFast?: () => void;
  onSelectWitchHealTarget: (victimId: string | null) => void;
  onConfirmSeerInspect?: () => void;
  onHunterNoMark?: () => void;
  onConfirmNightAction: () => void;
  onAdvanceBotStep: () => void;
  onCloseEyes: () => void;
}

function formatGhostNightLiveAction(
  stepKey: AutoGMNightStep['key'],
  players: Player[],
  ghostNightState: GhostNightSpectatorView | null | undefined,
  lang: Language
): string | null {
  if (!ghostNightState) return null;
  const nameOf = (id: string | null | undefined): string | null => {
    if (!id) return null;
    const idx = players.findIndex((p) => p.id === id);
    if (idx < 0) return null;
    return `${players[idx].name} (#${idx + 1})`;
  };
  const actions = ghostNightState.liveActions || {};

  if (stepKey === 'doppelganger') {
    const t = nameOf(actions.doppelgangerTargetId);
    return t ? `🪞 → ${t}` : null;
  }
  if (stepKey === 'cupid') {
    const a = nameOf(actions.cupidLovers?.[0]);
    const b = nameOf(actions.cupidLovers?.[1]);
    return a && b ? `💘 ${a} ❤️ ${b}` : null;
  }
  if (stepKey === 'bodyguard') {
    const t = nameOf(actions.guardTargetId);
    return t ? `🛡️ → ${t}` : null;
  }
  if (stepKey === 'hunter') {
    const t = nameOf(actions.hunterTargetId);
    return t ? `🎯 → ${t}` : null;
  }
  if (stepKey === 'werewolf') {
    const t1 = nameOf(actions.wolfTargetId);
    const t2 = nameOf(actions.secondWolfTargetId);
    if (t1) return `🐺 → ${t1}${t2 ? ` & ${t2}` : ''}`;
    const picks = Object.entries(ghostNightState.wolfPackPicks || {})
      .map(([wId, pick]) => {
        const wn = nameOf(wId);
        const pt = [nameOf(pick.targetId), nameOf(pick.secondTargetId)].filter(Boolean).join(' & ');
        return wn && pt ? `${wn} → ${pt}` : null;
      })
      .filter(Boolean);
    return picks.length > 0 ? `🐺 ${picks.join(' · ')}` : null;
  }
  if (stepKey === 'witch') {
    const parts: string[] = [];
    const heal = nameOf(actions.witchHealTargetId);
    const poison = nameOf(actions.witchPoisonTargetId);
    if (heal) parts.push(`💚 + ${heal}`);
    if (poison) parts.push(`🧪☠️ ${poison}`);
    if (parts.length > 0) return parts.join(' · ');
    const dying = (ghostNightState.dyingWolfVictimIds || []).map((id) => nameOf(id)).filter(Boolean);
    if (dying.length > 0) {
      return `🐺 ${UI_TEXT[lang].bittenPrefix} ${dying.join(' & ')}`;
    }
    return null;
  }
  if (stepKey === 'seer') {
    if (ghostNightState.seerInspectionTonight) {
      const targetName = nameOf(ghostNightState.seerInspectionTonight.targetId);
      const side = ghostNightState.seerInspectionTonight.isWerewolf
        ? `🐺 ${ROLES.werewolf.name[lang]}`
        : `🛡️ ${ROLES.villager.name[lang]}`;
      return targetName ? `🔮 ${targetName} → ${side}` : null;
    }
    if (actions.seerTargetId) {
      const target = players.find((p) => p.id === actions.seerTargetId);
      const targetName = nameOf(actions.seerTargetId);
      if (target && targetName) {
        const isWolf = target.roleId === 'werewolf' || target.roleId === 'wolf_pup';
        const side = isWolf ? `🐺 ${ROLES.werewolf.name[lang]}` : `🛡️ ${ROLES.villager.name[lang]}`;
        return `🔮 ${targetName} → ${side}`;
      }
    }
    return null;
  }
  return null;
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
  dyingWolfVictimIds,
  witchHealTargetId,
  witchPoisonTargetId,
  seerInspectResult,
  cupidLovers,
  isOnlineWaitingConfirm = false,
  isSeerInspectPending = false,
  canAdvanceBotStep = true,
  wolfPackPicks = null,
  ghostNightState = null,
  wakingActors,
  liveNightSummary = null,
  onSkipStepFast,
  onSelectWitchHealTarget,
  onConfirmSeerInspect,
  onHunterNoMark,
  onConfirmNightAction,
  onAdvanceBotStep,
  onCloseEyes,
}) => {
  const t = UI_TEXT[lang];

  if (!me.isAlive) {
    const resolvedWakingActors: Player[] =
      wakingActors && wakingActors.length > 0
        ? wakingActors
        : (ghostNightState?.wakingActorIds || [])
            .map((id) => players.find((p) => p.id === id))
            .filter((p): p is Player => Boolean(p));
    const liveReadout =
      liveNightSummary ??
      formatGhostNightLiveAction(currentNightStep.key, players, ghostNightState, lang);

    return (
      <div
        data-testid="ghost-night-spectator-card"
        className="pointer-events-auto w-full max-w-lg agrou-wood-panel !bg-[#111926]/95 !border-2 !border-cyan-400/70 rounded-2xl px-3 py-2 sm:px-3.5 sm:py-2.5 space-y-1.5 shadow-2xl"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-[11px] sm:text-xs font-black text-cyan-200 truncate">
              {t.ghostNightSpectatorTitle}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="px-1.5 py-0.5 rounded bg-cyan-950/90 border border-cyan-500/50 text-[10px] font-mono font-bold text-cyan-200 whitespace-nowrap">
              🌙 {currentNightStep.stepIndex + 1}/{currentNightStep.totalSteps} · ⏳{' '}
              {Math.round(timerSeconds)}s
            </span>
            {canAdvanceBotStep && (
              <button
                type="button"
                data-testid="auto-gm-next-step-btn"
                onClick={onSkipStepFast || onAdvanceBotStep}
                className="px-2 py-0.5 rounded-lg bg-[#b84b10] hover:bg-[#9e3f0c] border border-[#fbc266]/70 text-white font-extrabold text-[10px] flex items-center gap-1 cursor-pointer shrink-0"
              >
                <FastForward className="w-3 h-3" />
                <span>{t.ghostFastForwardStep}</span>
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className="px-2 py-0.5 rounded-lg bg-[#271b12] border border-[#e89c3e]/70 text-[#fde7c3] font-extrabold shrink-0">
            {({
              doppelganger: '🎭',
              cupid: '💘',
              bodyguard: '🛡️',
              hunter: '🎯',
              werewolf: '🐺',
              witch: '🧪',
              seer: '🔮',
            }[currentNightStep.key] || '🌙')}{' '}
            {ROLES[currentNightStep.roleId].name[lang]}
          </span>
          {resolvedWakingActors.length > 0 ? (
            <span
              data-testid="ghost-waking-actors-list"
              className="text-cyan-100 font-bold truncate"
            >
              {resolvedWakingActors
                .map((actor) => {
                  const seat = players.findIndex((p) => p.id === actor.id) + 1;
                  return seat > 0 ? `${actor.name} (#${seat})` : actor.name;
                })
                .join(', ')}
            </span>
          ) : (
            (() => {
              const hasLivingHolder = players.some(
                (p) =>
                  p.isAlive &&
                  (currentNightStep.key === 'werewolf'
                    ? p.roleId === 'werewolf' || p.roleId === 'wolf_pup'
                    : p.roleId === currentNightStep.roleId)
              );
              return (
                <span
                  data-testid="ghost-no-living-actor"
                  data-ghost-reason={hasLivingHolder ? 'power_spent' : 'all_dead'}
                  className="text-slate-300 italic font-semibold"
                >
                  {hasLivingHolder ? t.ghostActorPowerSpent : t.ghostActorAllDead}
                </span>
              );
            })()
          )}
        </div>

        {liveReadout && (
          <div
            data-testid="ghost-live-action-readout"
            className="px-2.5 py-1 rounded-xl bg-cyan-950/75 border border-cyan-500/45 text-[11px] font-extrabold text-[#fef3c7] flex items-center gap-1.5"
          >
            <span className="text-cyan-300 shrink-0">{t.ghostWatchingAction}</span>
            <span className="truncate">{liveReadout}</span>
          </div>
        )}
      </div>
    );
  }

  if (!isPlayerAwakeAtNight) {
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
        <span className="text-[10px] font-mono font-bold text-[#fde7c3] shrink-0">
          ⏳ {Math.round(timerSeconds)}s
        </span>
        {canAdvanceBotStep && (
          <button
            type="button"
            data-testid="auto-gm-skip-step-btn"
            onClick={() => (onSkipStepFast ? onSkipStepFast() : onAdvanceBotStep())}
            className="ml-1 px-2 py-0.5 rounded-lg bg-[#b84b10] hover:bg-[#d15916] border border-[#fbc266]/70 text-white text-[10px] sm:text-[11px] font-black cursor-pointer shrink-0 transition-colors"
          >
            {t.skipNightStepBtn}
          </button>
        )}
      </div>
    );
  }

  const cupidSelectedIds =
    me.roleId === 'cupid' && currentNightStep.key === 'cupid'
      ? (cupidLovers || []).filter((id): id is string => Boolean(id))
      : [];
  const cupidDistinctCount = new Set(cupidSelectedIds).size;
  const isCupidIncomplete =
    me.roleId === 'cupid' && currentNightStep.key === 'cupid' && cupidDistinctCount < 2;
  // A picked Seer target must be inspected via the purple button; the green skip button would silently discard it.
  const isSeerAwaitingInspect =
    me.roleId === 'seer' &&
    currentNightStep.key === 'seer' &&
    Boolean(selectedTargetId) &&
    Boolean(onConfirmSeerInspect) &&
    !seerInspectResult;

  const hasSelectedAction =
    me.roleId === 'cupid' && currentNightStep.key === 'cupid'
      ? cupidDistinctCount === 2
      : Boolean(
          selectedTargetId ||
            seerInspectResult ||
            witchHealTargetId ||
            witchPoisonTargetId
        );

  const witchActionParts: string[] = [];
  if (me.roleId === 'witch' && witchHealTargetId) {
    const healedName = players.find((p) => p.id === witchHealTargetId)?.name || '';
    if (healedName) {
      witchActionParts.push(`🧪+ ${healedName}`);
    }
  }
  if (me.roleId === 'witch' && witchPoisonTargetId) {
    const poisonedName = players.find((p) => p.id === witchPoisonTargetId)?.name || '';
    if (poisonedName) {
      witchActionParts.push(`☠️ ${poisonedName}`);
    }
  }

  const selectedSummary =
    me.roleId === 'cupid' && cupidLovers && cupidLovers.length > 0
      ? cupidLovers
          .map((id) => players.find((p) => p.id === id)?.name)
          .filter(Boolean)
          .join(' 💘 ')
      : me.roleId === 'witch'
      ? witchActionParts.length > 0
        ? witchActionParts.join(' · ')
        : null
      : selectedTargetId
      ? `${players.find((p) => p.id === selectedTargetId)?.name || ''}${
          secondWolfTargetId
            ? ` & ${players.find((p) => p.id === secondWolfTargetId)?.name || ''}`
            : ''
        }`
      : null;

  const dyingVictimPlayers = dyingWolfVictimIds
    .map((id) => players.find((p) => p.id === id))
    .filter((p): p is Player => Boolean(p));

  const isHealUnavailable = Boolean(me.hasUsedHeal) || Boolean(me.hasUsedPower);
  const isPoisonUnavailable = Boolean(me.hasUsedPoison) || Boolean(me.hasUsedPower);

  const packmatePickLabels =
    (me.roleId === 'werewolf' || me.roleId === 'wolf_pup') &&
    currentNightStep.key === 'werewolf' &&
    wolfPackPicks
      ? Object.entries(wolfPackPicks)
          .filter(([wolfId, pick]) => wolfId !== me.id && (pick.primary || pick.secondary))
          .map(([wolfId, pick]) => {
            const wolfName = players.find((p) => p.id === wolfId)?.name || ROLES.werewolf.name[lang];
            const targets = [pick.primary, pick.secondary]
              .filter((id): id is string => Boolean(id))
              .map((id) => players.find((p) => p.id === id)?.name)
              .filter(Boolean);
            return targets.length > 0 ? `${wolfName} → ${targets.join(' & ')}` : null;
          })
          .filter((s): s is string => Boolean(s))
      : [];

  return (
    <div
      data-testid="active-night-role-console"
      className="pointer-events-auto w-full max-w-lg agrou-wood-panel !border-2 !border-[#e89c3e] rounded-2xl px-3 py-2 sm:px-3.5 sm:py-2.5 space-y-1.5"
    >
      {/* Top Row: Role + Step + Single Primary Confirm CTA */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="px-1.5 py-0.5 rounded bg-[#b84b10] text-white font-black text-[10px] uppercase shrink-0">
            {t.yourTurnBadge}
          </span>
          <span className="text-xs sm:text-sm font-black text-[#fde7c3] truncate">
            {myRole.name[lang]}
          </span>
          <span
            data-testid="role-console-timer-status"
            className={`text-[11px] font-mono font-bold shrink-0 ${
              timerSeconds === 0 ? 'text-[#fde047]' : 'text-[#86efac]'
            }`}
          >
            {timerSeconds === 0 ? '⏳ 0s' : `${Math.round(timerSeconds)}s`}
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
            disabled={isOnlineWaitingConfirm || isCupidIncomplete || isSeerAwaitingInspect}
            onClick={onConfirmNightAction}
            className={`px-2.5 py-1 rounded-xl border font-extrabold text-[11px] sm:text-xs flex items-center gap-1 shadow ${
              isOnlineWaitingConfirm
                ? 'bg-[#1c3621] border-[#6ee7b7]/60 text-[#bbf7d0] cursor-default'
                : isCupidIncomplete || isSeerAwaitingInspect
                ? 'bg-[#3a2819] border-[#785334] text-[#d6bfa2] opacity-80 cursor-not-allowed'
                : 'bg-[#2f7d4d] hover:bg-[#38945b] border-[#86efac]/70 text-white cursor-pointer'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>
              {isOnlineWaitingConfirm
                ? t.confirmedWaiting
                : isCupidIncomplete
                ? `💘 ${t.loverLabel} (${cupidDistinctCount}/2)`
                : hasSelectedAction
                ? t.confirmAndEndNight
                : t.skipNightBtn}
            </span>
          </button>
        </div>
      </div>

      {/* Explicit Timeout Cue so player never thinks Night stalled at 0s */}
      {timerSeconds === 0 && (
        <div
          aria-live="polite"
          data-testid="role-console-timeout-cue"
          className="px-2.5 py-1 rounded-lg bg-[#4a2b10] border border-[#f5b82e] text-[#fef3c7] text-[11px] font-extrabold"
        >
          {isOnlineWaitingConfirm ? t.confirmedWaiting : t.timeUpConfirmCue}
        </div>
      )}

      {/* Wolf Packmate Live Picks Indicator (Online Multiplayer) */}
      {packmatePickLabels.length > 0 && (
        <div
          data-testid="role-console-wolf-pack-picks"
          className="px-2.5 py-1 rounded-lg bg-[#3b1518] border border-rose-500/60 text-rose-200 text-[11px] font-bold"
        >
          🐺 {t.packmatesPicked} {packmatePickLabels.join(' · ')}
        </div>
      )}

      {/* Clear 1-Line Instruction */}
      <p className="text-[11px] text-[#e6d5b8] leading-snug">
        {currentNightStep.playerInstruction[lang]}{' '}
        <span className="text-[#f5b82e] font-semibold">{t.tapTargetHint}</span>
      </p>

      {/* Hunter Night-Aim Controls (Chọn ghim hoặc Không ghim) */}
      {me.roleId === 'hunter' && currentNightStep.key === 'hunter' && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl bg-[#2a1911] border border-amber-500/60">
          <span className="text-[11px] font-bold text-[#fde7c3]">
            🎯{' '}
            {selectedTargetId
              ? `${t.selectedPrefix} ${players.find((p) => p.id === selectedTargetId)?.name || ''}`
              : t.hunterNoMarkStatus}
          </span>
          {onHunterNoMark && (
            <button
              type="button"
              data-testid="role-console-hunter-no-mark-btn"
              disabled={isOnlineWaitingConfirm}
              onClick={onHunterNoMark}
              className={`px-2.5 py-1 rounded-lg border text-[11px] font-extrabold cursor-pointer ${
                isOnlineWaitingConfirm
                  ? 'bg-[#3a2819] border-[#785334] text-[#d6bfa2] opacity-60 cursor-default'
                  : 'bg-[#1b120b] hover:bg-[#312115] border-[#f5b82e]/80 text-[#fde7c3]'
              }`}
            >
              🚫 {t.hunterNoMarkBtn}
            </button>
          )}
        </div>
      )}

      {/* Witch Heal & Poison Controls — STRICT ZERO META-LEAK: Only show genuinely dying wolf victims */}
      {me.roleId === 'witch' && currentNightStep.key === 'witch' && (
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2 bg-[#1c3621] border border-[#5cb85c]/60 rounded-xl px-2.5 py-1.5">
            <span className="text-[11px] text-[#dcfce7] font-bold">
              {isHealUnavailable
                ? t.witchHealDepletedDesc
                : dyingVictimPlayers.length === 0
                ? t.witchNoFatalVictim
                : `🐺 ${t.bittenPrefix} ${dyingVictimPlayers.map((v) => v.name).join(' & ')}`}
            </span>

            <div className="flex flex-wrap items-center gap-1.5">
              {isHealUnavailable || dyingVictimPlayers.length === 0 ? (
                <button
                  type="button"
                  data-testid="role-console-witch-heal-btn"
                  disabled
                  className="px-2.5 py-1 rounded-lg text-[11px] font-extrabold border flex items-center gap-1 bg-[#1a110a] text-[#86efac] border-[#5cb85c]/60 opacity-40 cursor-not-allowed"
                >
                  <FlaskConical className="w-3 h-3" />
                  <span>
                    {me.hasUsedHeal || me.hasUsedPower
                      ? t.witchOutHeal
                      : t.noVictimToHeal}
                  </span>
                </button>
              ) : (
                dyingVictimPlayers.map((victim, idx) => {
                  const isHealedTarget = witchHealTargetId === victim.id;
                  return (
                    <button
                      key={victim.id}
                      type="button"
                      data-testid={
                        idx === 0
                          ? 'role-console-witch-heal-btn'
                          : `role-console-witch-heal-btn-${victim.id}`
                      }
                      aria-pressed={isHealedTarget}
                      onClick={() =>
                        onSelectWitchHealTarget(isHealedTarget ? null : victim.id)
                      }
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold border flex items-center gap-1 cursor-pointer ${
                        isHealedTarget
                          ? 'bg-[#2f7d4d] text-white border-[#86efac]'
                          : 'bg-[#1a110a] text-[#86efac] border-[#5cb85c]/60 hover:bg-[#234329]'
                      }`}
                    >
                      <FlaskConical className="w-3 h-3" />
                      <span>
                        {isHealedTarget
                          ? `${t.witchHealActive}: ${victim.name}`
                          : t.witchHealBtn(victim.name)}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Poison Potion Status Pill */}
          <div className="flex items-center justify-between gap-2 px-2.5 py-1 rounded-xl bg-[#271734] border border-purple-500/50 text-[11px]">
            <span
              data-testid="role-console-witch-poison-status"
              className={`font-extrabold ${
                isPoisonUnavailable ? 'text-slate-400' : 'text-purple-200'
              }`}
            >
              {me.hasUsedPower
                ? t.poisonSealed
                : me.hasUsedPoison
                ? `🧪 ${t.witchOutPoison}`
                : t.poisonReady}
            </span>
            {!isPoisonUnavailable && (
              <span className="text-[10px] text-purple-300 font-semibold truncate">
                {witchPoisonTargetId
                  ? `${t.selectedPrefix} ${
                      players.find((p) => p.id === witchPoisonTargetId)?.name || ''
                    }`
                  : t.witchPoisonHint}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Seer Result OR Confirm-Before-Reveal OR Selected Target Chip (BUG-25) */}
      {seerInspectResult ? (
        <div
          aria-live="polite"
          data-testid="role-console-seer-result"
          className="px-2.5 py-1.5 rounded-lg bg-[#382147] border border-[#c084fc] text-[#f3e8ff] text-xs font-extrabold"
        >
          🔮 {seerInspectResult}
        </div>
      ) : me.roleId === 'seer' && currentNightStep.key === 'seer' && selectedTargetId && onConfirmSeerInspect ? (
        <div
          data-testid="role-console-seer-pending"
          className="flex flex-wrap items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl bg-[#2c193a] border border-[#c084fc]/80"
        >
          <span className="text-xs font-bold text-[#f3e8ff]">
            🔮 {t.seerTargetPending}{' '}
            <strong className="text-[#fde047]">
              {players.find((p) => p.id === selectedTargetId)?.name || ''}
            </strong>
          </span>
          <button
            type="button"
            data-testid="role-console-seer-confirm-btn"
            disabled={isSeerInspectPending}
            onClick={onConfirmSeerInspect}
            className={`px-3 py-1 rounded-lg border text-white text-xs font-extrabold shadow ${
              isSeerInspectPending
                ? 'bg-[#581c87] border-[#c084fc]/50 opacity-75 cursor-wait'
                : 'bg-[#9333ea] hover:bg-[#a855f7] border-[#e9d5ff]/70 cursor-pointer'
            }`}
          >
            🔮 {isSeerInspectPending ? `${t.seerConfirmBtn}...` : t.seerConfirmBtn}
          </button>
        </div>
      ) : (
        selectedSummary && (
          <div
            aria-live="polite"
            data-testid="role-console-selected-status"
            className="px-2.5 py-1 rounded-lg bg-[#422614] border border-[#e89c3e] text-[#fef3c7] text-[11px] font-bold"
          >
            🎯 {t.selectedPrefix} {selectedSummary}
          </div>
        )
      )}
    </div>
  );
};
