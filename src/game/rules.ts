import type {
  Player,
  RoleId,
  NightActions,
  NightResult,
  VoteRecord,
  RoleDefinition,
  NightVictimDetail,
  NightLogicStep,
} from '../types/game.ts';
import { ROLES } from './roles.ts';

/**
 * Helper to initialize role-specific state when Doppelganger inherits a dead target's role
 */
function applyDoppelgangerInheritance(doppel: Player, inheritedRole: RoleId): void {
  doppel.roleId = inheritedRole;
  if (inheritedRole === 'elder') {
    doppel.elderLives = 2;
  } else if (inheritedRole === 'witch') {
    doppel.hasUsedHeal = false;
    doppel.hasUsedPoison = false;
  } else if (inheritedRole === 'hunter') {
    doppel.hasUsedPower = false;
  }
}

/**
 * Unbiased Fisher-Yates (Knuth) shuffle — returns a new shuffled array without mutating input.
 */
export function fisherYatesShuffle<T>(items: readonly T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = result[i];
    result[i] = result[j];
    result[j] = tmp;
  }
  return result;
}

/**
 * Generate a balanced deck of roles based on player count (supports custom player counts 4..24)
 */
export function generateBalancedRoster(playerCount: number, customSelection?: RoleId[]): RoleId[] {
  if (customSelection && customSelection.length === playerCount) {
    return fisherYatesShuffle(customSelection);
  }

  const roles: RoleId[] = [];

  if (playerCount < 5) {
    roles.push('werewolf', 'seer', 'villager', 'witch');
    while (roles.length < playerCount) roles.push('villager');
  } else if (playerCount === 5) {
    roles.push('werewolf', 'seer', 'bodyguard', 'witch', 'villager');
  } else if (playerCount === 6) {
    // 1 Ma Sói vs 5 Dân Làng (matches 6-player balance & tooltip)
    roles.push('werewolf', 'seer', 'bodyguard', 'witch', 'hunter', 'villager');
  } else if (playerCount === 7) {
    roles.push('werewolf', 'werewolf', 'seer', 'bodyguard', 'witch', 'hunter', 'villager');
  } else if (playerCount === 8) {
    // 2 Ma Sói vs 6 Dân Làng (matches 8-player balance & tooltip)
    roles.push('werewolf', 'werewolf', 'seer', 'bodyguard', 'witch', 'hunter', 'cupid', 'villager');
  } else if (playerCount === 9) {
    roles.push('werewolf', 'werewolf', 'seer', 'bodyguard', 'witch', 'hunter', 'cupid', 'tanner', 'villager');
  } else if (playerCount === 10) {
    // 2 Sói (1 Ma Sói + 1 Sói Con) vs 8 Dân/Trung Lập (matches 10-player balance & tooltip)
    roles.push('werewolf', 'wolf_pup', 'seer', 'bodyguard', 'witch', 'hunter', 'cupid', 'elder', 'tanner', 'villager');
  } else if (playerCount === 11) {
    roles.push('werewolf', 'werewolf', 'wolf_pup', 'seer', 'bodyguard', 'witch', 'hunter', 'cupid', 'elder', 'doppelganger', 'villager');
  } else if (playerCount >= 12) {
    roles.push(
      'werewolf',
      'werewolf',
      'wolf_pup',
      'traitor',
      'seer',
      'bodyguard',
      'witch',
      'hunter',
      'cupid',
      'elder',
      'cursed',
      'doppelganger'
    );
    // For custom large villages (13..24), add Tanner at 13, an extra Werewolf at 15 & 19, and Villagers
    const extraPool: RoleId[] = [
      'tanner',
      'villager',
      'werewolf',
      'villager',
      'villager',
      'werewolf',
      'villager',
      'villager',
      'villager',
      'werewolf',
      'villager',
      'villager',
    ];
    let idx = 0;
    while (roles.length < playerCount) {
      roles.push(extraPool[idx] || 'villager');
      idx++;
    }
  }

  return fisherYatesShuffle(roles.slice(0, playerCount));
}

/**
 * Safely assigns a preferred role to deck[0] (the human player) while preserving
 * the exact wolf-to-villager faction balance of the roster.
 */
export function assignPreferredRoleToDeck(
  deck: RoleId[],
  roleChoice: RoleId | 'random'
): RoleId[] {
  const result = [...deck];
  if (result.length === 0) return result;

  if (roleChoice === 'random') {
    const everyNightActiveRoles = new Set<RoleId>([
      'werewolf',
      'wolf_pup',
      'seer',
      'witch',
      'bodyguard',
    ]);
    if (!everyNightActiveRoles.has(result[0])) {
      const activeIndices = result
        .map((r, idx) => (everyNightActiveRoles.has(r) ? idx : -1))
        .filter((idx) => idx !== -1);
      if (activeIndices.length > 0) {
        const pickIdx = activeIndices[Math.floor(Math.random() * activeIndices.length)];
        const temp = result[0];
        result[0] = result[pickIdx];
        result[pickIdx] = temp;
      }
    }
    return result;
  }

  const existingIdx = result.indexOf(roleChoice);
  if (existingIdx !== -1) {
    const temp = result[0];
    result[0] = result[existingIdx];
    result[existingIdx] = temp;
    return result;
  }

  const isWolfRole = (r: RoleId) => r === 'werewolf' || r === 'wolf_pup';
  if (isWolfRole(roleChoice)) {
    const wolfIdx = result.findIndex(isWolfRole);
    const replaceIdx = wolfIdx !== -1 ? wolfIdx : 0;
    result[replaceIdx] = result[0];
    result[0] = roleChoice;
  } else {
    const villagerIdx = result.indexOf('villager');
    const nonWolfIdx =
      villagerIdx !== -1 ? villagerIdx : result.findIndex((r) => !isWolfRole(r));
    const replaceIdx = nonWolfIdx !== -1 ? nonWolfIdx : 0;
    result[replaceIdx] = result[0];
    result[0] = roleChoice;
  }

  return result;
}

/**
 * Returns role definitions sorted by wake order for night calling
 */
export function getNightCallOrder(): RoleDefinition[] {
  return Object.values(ROLES)
    .filter((r) => r.wakeOrder > 0)
    .sort((a, b) => a.wakeOrder - b.wakeOrder);
}

/**
 * Resolves all night actions with traditional werewolf logic + detailed causal explanation for GM
 */
export function resolveNightActions(
  players: Player[],
  actions: NightActions,
  options: { wolfPupTriggered?: boolean; roundNumber?: number } = {}
): { updatedPlayers: Player[]; result: NightResult } {
  const previousProtectedIds = new Set(
    players.filter((p) => p.protectedLastNight).map((p) => p.id)
  );

  // Reset protectedLastNight for the new night
  const updated = players.map((p) => ({ ...p, protectedLastNight: false }));
  const killedPlayerIds = new Set<string>();
  const savedPlayerIds = new Set<string>();
  const summary: string[] = [];
  const logicExplanations: NightLogicStep[] = [];
  const victimCausesMap = new Map<string, string[]>();
  const victimLogicMap = new Map<string, string[]>();
  const victimMetaMap = new Map<
    string,
    {
      causeType: NightVictimDetail['causeType'];
      killerId?: string | null;
      killerName?: string | null;
      killerRoleId?: RoleId | null;
      linkedLoverId?: string | null;
      linkedLoverName?: string | null;
    }
  >();

  const addVictimReason = (
    id: string,
    shortCause: string,
    detailedReason: string,
    meta?: {
      causeType: NightVictimDetail['causeType'];
      killerId?: string | null;
      killerName?: string | null;
      killerRoleId?: RoleId | null;
      linkedLoverId?: string | null;
      linkedLoverName?: string | null;
    }
  ) => {
    const prevCauses = victimCausesMap.get(id) || [];
    if (!prevCauses.includes(shortCause)) prevCauses.push(shortCause);
    victimCausesMap.set(id, prevCauses);

    const prevReasons = victimLogicMap.get(id) || [];
    prevReasons.push(detailedReason);
    victimLogicMap.set(id, prevReasons);

    if (meta && !victimMetaMap.has(id)) {
      victimMetaMap.set(id, meta);
    }
  };

  let elderAttacked = false;
  let wolfPupTriggeredNextNight = false;
  let triggeredHunterId: string | null = null;

  // 1. Doppelganger link (night 1 only)
  if (actions.doppelgangerTargetId && (options.roundNumber ?? 1) === 1) {
    const doppel = updated.find((p) => p.roleId === 'doppelganger' && p.isAlive);
    const target = updated.find((p) => p.id === actions.doppelgangerTargetId);
    if (doppel && target && doppel.id !== target.id) {
      doppel.targetPlayerId = target.id;
      doppel.targetRoleId = target.roleId;
      summary.push(`Nhân Bản đã chọn ${target.name} làm hình mẫu sao chép.`);
      logicExplanations.push({
        badge: '🪞 Nhân Bản',
        title: `${doppel.name} chọn hình mẫu ${target.name}`,
        detail: `Nếu ${target.name} (${ROLES[target.roleId].name.vi}) chết ở bất kỳ vòng nào, ${doppel.name} sẽ lập tức kế thừa vai trò và toàn bộ trạng thái kỹ năng của vai đó.`,
        category: 'info',
      });
    }
  }

  // 2. Cupid links lovers (night 1 only)
  let loversLinked: [string, string] | null = null;
  if (actions.cupidLovers && actions.cupidLovers.length === 2 && (options.roundNumber ?? 1) === 1) {
    const [p1Id, p2Id] = actions.cupidLovers;
    if (p1Id && p2Id && p1Id !== p2Id) {
      const p1 = updated.find((p) => p.id === p1Id);
      const p2 = updated.find((p) => p.id === p2Id);
      if (p1 && p2) {
        p1.loverId = p2Id;
        p2.loverId = p1Id;
        loversLinked = [p1Id, p2Id];
        summary.push(`Cupid đã bắn mũi tên tình ái kết nối ${p1.name} và ${p2.name}.`);
        logicExplanations.push({
          badge: '💘 Cupid Ghép Đôi',
          title: `${p1.name} & ${p2.name} trở thành Tình Nhân`,
          detail: `Hai người đã gắn kết sinh tử (${ROLES[p1.roleId].name.vi} + ${ROLES[p2.roleId].name.vi}). Nếu 1 trong 2 người chết (do Sói cắn, trúng độc, bị bắn hoặc bị treo cổ), người còn lại sẽ lập tức quyên sinh chết theo.`,
          category: 'info',
        });
      }
    }
  }

  // 3. Bodyguard protection (cannot guard the same person two nights in a row, and requires living bodyguard with active power)
  const livingGuard = updated.find((p) => p.roleId === 'bodyguard' && p.isAlive);
  let guardedId: string | null = null;
  if (
    actions.guardTargetId &&
    (!livingGuard || !livingGuard.hasUsedPower) &&
    !previousProtectedIds.has(actions.guardTargetId)
  ) {
    const guardedPlayer = updated.find((p) => p.id === actions.guardTargetId && p.isAlive);
    if (guardedPlayer) {
      guardedId = guardedPlayer.id;
      guardedPlayer.protectedLastNight = true;
      logicExplanations.push({
        badge: '🛡️ Bảo Vệ',
        title: `Bảo Vệ đặt khiên che chở cho ${guardedPlayer.name}`,
        detail: `Nếu Đàn Sói cắn trúng ${guardedPlayer.name} đêm nay, khiên Bảo Vệ sẽ chặn toàn bộ sát thương vết cắn (nhưng không chặn được Bình Độc của Phù Thủy). Đêm sau Bảo Vệ không được bảo vệ lặp lại ${guardedPlayer.name}.`,
        category: 'info',
      });
    }
  } else if (actions.guardTargetId && previousProtectedIds.has(actions.guardTargetId)) {
    const repeatPlayer = updated.find((p) => p.id === actions.guardTargetId);
    if (repeatPlayer) {
      summary.push(`Bảo Vệ không thể che chở ${repeatPlayer.name} 2 đêm liên tiếp!`);
      logicExplanations.push({
        badge: '⚠️ Luật Bảo Vệ',
        title: `Hủy khiên trên ${repeatPlayer.name} (Trùng 2 đêm liên tiếp)`,
        detail: `${repeatPlayer.name} đã được bảo vệ ở đêm ngay trước đó nên theo luật không thể nhận khiên 2 đêm liên tục.`,
        category: 'info',
      });
    }
  }

  // 4. Werewolves attack (supports 2 targets if Wolf Pup died previously, and allows self/fellow-wolf bite for mindgames)
  const wolfTargets: string[] = [];
  if (actions.wolfTargetId) wolfTargets.push(actions.wolfTargetId);
  if (
    options.wolfPupTriggered &&
    actions.secondWolfTargetId &&
    actions.secondWolfTargetId !== actions.wolfTargetId
  ) {
    wolfTargets.push(actions.secondWolfTargetId);
  }

  const victimsOfWolves: string[] = [];

  for (const wTargetId of wolfTargets) {
    const target = updated.find((p) => p.id === wTargetId && p.isAlive);
    if (!target) continue;

    if (guardedId === wTargetId) {
      savedPlayerIds.add(wTargetId);
      summary.push(`Khiên của Bảo Vệ đã cứu ${target.name} thoát khỏi hàm răng Ma Sói!`);
      logicExplanations.push({
        badge: '🛡️ Cứu Sống (Bảo Vệ)',
        title: `${target.name} bị Ma Sói cắn nhưng KHÔNG CHẾT`,
        detail: `Đàn Ma Sói chọn cắn ${target.name}, nhưng trùng khớp với mục tiêu được Bảo Vệ che chở đêm qua → Vết cắn bị chặn đứng hoàn toàn.`,
        category: 'saved',
      });
    } else if (target.roleId === 'cursed') {
      target.roleId = 'werewolf';
      savedPlayerIds.add(wTargetId);
      summary.push(`${target.name} (Bán Sói) bị cắn nhưng không chết mà thức tỉnh thành Ma Sói!`);
      logicExplanations.push({
        badge: '🌓 Hóa Sói (Bán Sói)',
        title: `${target.name} bị Sói cắn → Biến hình thành Ma Sói (Không chết)`,
        detail: `${target.name} giữ vai Bán Sói (Kẻ Bị Nguyền). Khi bị Ma Sói cắn và không có Bảo Vệ đỡ, nội tại Bán Sói kích hoạt: người này KHÔNG CHẾT mà âm thầm gia nhập phe Ma Sói từ đêm sau (Quản trò nhớ gọi dậy cùng đàn Sói).`,
        category: 'special',
      });
    } else if (target.roleId === 'elder' && (target.elderLives ?? 2) > 1) {
      target.elderLives = (target.elderLives ?? 2) - 1;
      elderAttacked = true;
      savedPlayerIds.add(wTargetId);
      summary.push(`Già Làng ${target.name} kiên cường chống đỡ phát cắn đầu tiên của bầy sói!`);
      logicExplanations.push({
        badge: '👑 Nội Tại Già Làng',
        title: `Già Làng ${target.name} chịu vết cắn đầu tiên → Còn 1 mạng (Không chết)`,
        detail: `${target.name} là Già Làng (bắt đầu với 2 mạng trước Ma Sói). Bị Sói cắn đêm qua và không có Bảo Vệ đỡ nên mất 1 mạng nội tại, hiện còn 1 mạng và vẫn sống sót khi trời sáng.`,
        category: 'saved',
      });
    } else {
      victimsOfWolves.push(wTargetId);
    }
  }

  // 5. Witch Heal potion (1 use per game)
  const witchPlayer = updated.find((p) => p.roleId === 'witch' && p.isAlive);
  if (
    actions.witchHealTargetId &&
    victimsOfWolves.includes(actions.witchHealTargetId) &&
    (!witchPlayer || (!witchPlayer.hasUsedHeal && !witchPlayer.hasUsedPower))
  ) {
    const savedPlayer = updated.find((p) => p.id === actions.witchHealTargetId);
    if (savedPlayer) {
      savedPlayerIds.add(actions.witchHealTargetId);
      const idx = victimsOfWolves.indexOf(actions.witchHealTargetId);
      if (idx !== -1) victimsOfWolves.splice(idx, 1);
      if (witchPlayer) witchPlayer.hasUsedHeal = true;
      summary.push(`Phù Thủy đã trao bình thuốc Cứu Sống cho ${savedPlayer.name}!`);
      logicExplanations.push({
        badge: '💚 Cứu Sống (Phù Thủy)',
        title: `${savedPlayer.name} bị Ma Sói cắn nhưng được Phù Thủy cứu sống`,
        detail: `${savedPlayer.name} bị Đàn Sói cắn trúng (không có Bảo Vệ đỡ), nhưng Phù Thủy đã quyết định tung Bình Cứu Sống (1 lần/ván) → ${savedPlayer.name} hồi sinh an toàn.`,
        category: 'saved',
      });
    }
  }

  const alphaWolf =
    updated.find((p) => p.isAlive && p.roleId === 'werewolf') ||
    updated.find((p) => p.isAlive && p.roleId === 'wolf_pup') ||
    null;

  for (const vId of victimsOfWolves) {
    killedPlayerIds.add(vId);
    const victimObj = updated.find((p) => p.id === vId);
    if (victimObj) {
      const wasElderSecondBite = victimObj.roleId === 'elder';
      const detailText = wasElderSecondBite
        ? `Già Làng ${victimObj.name} đã mất mạng đầu tiên từ trước, đêm qua tiếp tục bị Đàn Ma Sói cắn lần thứ 2 mà không có Bảo Vệ che chở hay Bình Cứu của Phù Thủy → Tử vong.`
        : `${victimObj.name} (${ROLES[victimObj.roleId].name.vi}) bị Đàn Ma Sói chọn cắn đêm qua. Không được Bảo Vệ che chở và Phù Thủy không dùng Bình Cứu → Tử vong vì vết cắn Ma Sói.`;
      const attacker =
        updated.find((p) => p.isAlive && (p.roleId === 'werewolf' || p.roleId === 'wolf_pup') && p.id !== vId) ||
        alphaWolf;
      addVictimReason(vId, '🐺 Bị Ma Sói cắn', detailText, {
        causeType: 'werewolf',
        killerId: attacker?.id ?? null,
        killerName: attacker?.name ?? null,
        killerRoleId: attacker?.roleId ?? 'werewolf',
      });
      logicExplanations.push({
        badge: '🐺 Ma Sói Cắn Chết',
        title: `${victimObj.name} tử vong do bị Ma Sói cắn`,
        detail: detailText,
        category: 'death',
      });
    }
  }

  // 6. Witch Poison potion (1 use per game; bypasses Bodyguard shield and Elder 2-lives)
  if (
    actions.witchPoisonTargetId &&
    (!witchPlayer || (!witchPlayer.hasUsedPoison && !witchPlayer.hasUsedPower))
  ) {
    const poisoned = updated.find((p) => p.id === actions.witchPoisonTargetId && p.isAlive);
    if (poisoned) {
      killedPlayerIds.add(actions.witchPoisonTargetId);
      if (witchPlayer) witchPlayer.hasUsedPoison = true;
      summary.push(`Bình độc kịch độc của Phù Thủy đã hạ gục ${poisoned.name}.`);
      const wasAlsoGuarded = guardedId === poisoned.id;
      const poisonDetail = wasAlsoGuarded
        ? `${poisoned.name} (${ROLES[poisoned.roleId].name.vi}) bị Phù Thủy quăng Bình Độc. Dù người này có Khiên Bảo Vệ đêm qua, độc dược của Phù Thủy xuyên qua mọi lớp bảo vệ → Tử vong.`
        : `${poisoned.name} (${ROLES[poisoned.roleId].name.vi}) bị Phù Thủy chỉ định ném Bình Độc (xuyên qua khiên Bảo Vệ và xuyên qua 2 mạng Già Làng) → Tử vong ngay trong đêm.`;
      addVictimReason(poisoned.id, '🧪 Trúng Bình Độc Phù Thủy', poisonDetail, {
        causeType: 'witch_poison',
        killerId: witchPlayer?.id ?? null,
        killerName: witchPlayer?.name ?? null,
        killerRoleId: 'witch',
      });
      logicExplanations.push({
        badge: '🧪 Phù Thủy Đầu Độc',
        title: `${poisoned.name} tử vong do trúng Bình Độc của Phù Thủy`,
        detail: poisonDetail,
        category: 'death',
      });
    }
  }

  // 7. Seer inspection (Traitor appears as Villager; Werewolf and Wolf Pup appear as Werewolf)
  const livingSeer = updated.find((p) => p.roleId === 'seer' && p.isAlive);
  let seerInspection: NightResult['seerInspection'] = null;
  if (actions.seerTargetId && (!livingSeer || !livingSeer.hasUsedPower)) {
    const target = updated.find((p) => p.id === actions.seerTargetId);
    if (target) {
      const isWerewolf = target.roleId === 'werewolf' || target.roleId === 'wolf_pup';
      seerInspection = {
        playerId: target.id,
        roleId: target.roleId,
        isWerewolf,
      };
      summary.push(`Tiên Tri đã soi thấu ${target.name} thuộc ${isWerewolf ? 'Phe Ma Sói' : 'Phe Dân Làng'}.`);
      const stealthNote =
        target.roleId === 'traitor'
          ? ' (Lưu ý cho Quản Trò: Kẻ Phản Bội tuy theo phe Sói nhưng khi Tiên Tri soi sẽ luôn hiện là Dân Làng 👍).'
          : target.roleId === 'wolf_pup'
          ? ' (Lưu ý: Sói Con hiện kết quả là Ma Sói 👎).'
          : '';
      logicExplanations.push({
        badge: '🔮 Tiên Tri Soi',
        title: `Tiên Tri soi ${target.name} → Kết quả báo: ${isWerewolf ? '👎 MA SÓI' : '👍 DÂN LÀNG'}`,
        detail: `Vai thật của ${target.name} là ${ROLES[target.roleId].name.vi}.${stealthNote}`,
        category: 'info',
      });
    }
  }

  // 8. Apply deaths and process cascade effects (Wolf Pup frenzy, Doppelganger, Lovers, Hunter)
  const toProcess = Array.from(killedPlayerIds);
  while (toProcess.length > 0) {
    const victimId = toProcess.shift()!;
    const victim = updated.find((p) => p.id === victimId);
    if (victim && victim.isAlive) {
      victim.isAlive = false;

      if (victim.roleId === 'wolf_pup') {
        wolfPupTriggeredNextNight = true;
        summary.push(`Sói Con (${victim.name}) đã tử mạng! Đêm tới bầy Sói sẽ cuồng nộ cắn 2 người!`);
        logicExplanations.push({
          badge: '🔥 Di Chúc Sói Con',
          title: `Sói Con ${victim.name} chết → Đêm tới Đàn Sói được cắn 2 người!`,
          detail: `Vì ${victim.name} giữ vai Sói Con và đã thiệt mạng, nội tại Cuồng Nộ được kích hoạt: vào Đêm kế tiếp, Quản Trò cho Đàn Sói chọn cắn tới 2 nạn nhân.`,
          category: 'special',
        });
      }

      if (victim.roleId === 'hunter' && !victim.hasUsedPower) {
        triggeredHunterId = victim.id;
        summary.push(`Thợ Săn ${victim.name} bị sát hại trong đêm nhưng kịp rút súng trả thù!`);
        logicExplanations.push({
          badge: '🎯 Phản Đòn Thợ Săn',
          title: `Thợ Săn ${victim.name} chết → Kích hoạt phát súng kéo theo 1 người!`,
          detail: `${victim.name} là Thợ Săn. Ngay khi công bố ${victim.name} chết sáng nay, Quản Trò yêu cầu ${victim.name} chỉ định bắn hạ ngay 1 người chơi đang sống.`,
          category: 'special',
        });
      }

      // Check if Doppelganger inherits from this specific victim
      const doppel = updated.find(
        (p) =>
          p.roleId === 'doppelganger' &&
          p.isAlive &&
          (p.targetPlayerId === victim.id || (!p.targetPlayerId && p.targetRoleId === victim.roleId))
      );
      if (doppel && victim.roleId !== 'doppelganger') {
        applyDoppelgangerInheritance(doppel, victim.roleId);
        summary.push(`Nhân Bản ${doppel.name} đã kế thừa hoàn toàn thân phận ${ROLES[victim.roleId].name.vi}!`);
        logicExplanations.push({
          badge: '🪞 Kế Thừa Nhân Bản',
          title: `Nhân Bản ${doppel.name} hóa thành ${ROLES[victim.roleId].name.vi}`,
          detail: `Do mục tiêu hình mẫu ${victim.name} đã chết đêm qua, ${doppel.name} chính thức nhận vai ${ROLES[victim.roleId].name.vi} (với đầy đủ bình thuốc/quyền năng mới) từ vòng này.`,
          category: 'special',
        });
      }

      // Check Lover suicide chain
      if (victim.loverId) {
        const lover = updated.find((p) => p.id === victim.loverId);
        if (lover && lover.isAlive && !killedPlayerIds.has(lover.id)) {
          killedPlayerIds.add(lover.id);
          toProcess.push(lover.id);
          summary.push(`💔 Tình nhân ${lover.name} không chịu nổi nỗi đau mất ${victim.name} nên đã quyên sinh!`);
          const loverReason = `${lover.name} (${ROLES[lover.roleId].name.vi}) không bị Sói cắn hay trúng độc trực tiếp, nhưng vì được Cupid ghép đôi Tình Nhân với ${victim.name} (đã tử vong đêm qua) nên phải quyên sinh chết theo luật dây chuyền.`;
          addVictimReason(lover.id, `💔 Quyên sinh theo Tình Nhân (${victim.name})`, loverReason, {
            causeType: 'cupid_lover',
            killerId: victim.id,
            killerName: victim.name,
            killerRoleId: 'cupid',
            linkedLoverId: victim.id,
            linkedLoverName: victim.name,
          });
          logicExplanations.push({
            badge: '💔 Tình Nhân Quyên Sinh',
            title: `${lover.name} chết dây chuyền theo Tình Nhân ${victim.name}`,
            detail: loverReason,
            category: 'death',
          });
        }
      }
    }
  }

  // If nobody died and no special save/attack happened, add a clear explanation for GM
  if (killedPlayerIds.size === 0 && savedPlayerIds.size === 0) {
    logicExplanations.push({
      badge: '🌙 Đêm Bình Yên',
      title: 'Không có nạn nhân nào thiệt mạng trong đêm qua',
      detail: 'Đàn Ma Sói chưa chọn mục tiêu hoặc không có đòn tấn công chí mạng nào xảy ra trong đêm.',
      category: 'saved',
    });
  }

  const killedDetails: NightVictimDetail[] = Array.from(killedPlayerIds)
    .map((id) => {
      const p = updated.find((item) => item.id === id);
      if (!p) return null;
      const causes = victimCausesMap.get(id) || ['🐺 Tử vong trong đêm'];
      const reasons = victimLogicMap.get(id) || ['Thiệt mạng trong đêm qua.'];
      const meta = victimMetaMap.get(id);
      return {
        playerId: p.id,
        name: p.name,
        roleId: p.roleId,
        causes,
        logicExplanation: reasons.join(' + '),
        causeType: meta?.causeType ?? 'unknown',
        killerId: meta?.killerId ?? null,
        killerName: meta?.killerName ?? null,
        killerRoleId: meta?.killerRoleId ?? null,
        linkedLoverId: meta?.linkedLoverId ?? null,
        linkedLoverName: meta?.linkedLoverName ?? null,
      };
    })
    .filter(Boolean) as NightVictimDetail[];

  return {
    updatedPlayers: updated,
    result: {
      killedPlayerIds: Array.from(killedPlayerIds),
      savedPlayerIds: Array.from(savedPlayerIds),
      seerInspection,
      loversLinked,
      wolfPupTriggeredNextNight,
      elderAttacked,
      triggeredHunterId,
      summary,
      killedDetails,
      logicExplanations,
    },
  };
}

/**
 * Applies Day Lynch execution with full cascade logic (Lovers, Wolf Pup, Doppelganger, Hunter, Elder Penalty)
 */
export function applyDayLynch(
  players: Player[],
  lynchedId: string
): {
  updatedPlayers: Player[];
  wolfPupTriggeredNextNight: boolean;
  triggeredHunterId: string | null;
  elderLynchedPenalty: boolean;
  cascadeMessages: string[];
} {
  const updated = players.map((p) => ({ ...p }));
  const cascadeMessages: string[] = [];
  let wolfPupTriggeredNextNight = false;
  let triggeredHunterId: string | null;
  triggeredHunterId = null;
  let elderLynchedPenalty = false;

  const toKill = [lynchedId];
  const processed = new Set<string>();

  while (toKill.length > 0) {
    const id = toKill.shift()!;
    if (processed.has(id)) continue;
    processed.add(id);

    const victim = updated.find((p) => p.id === id);
    if (!victim || !victim.isAlive) continue;

    victim.isAlive = false;

    // If the village directly lynched the Elder, all Villager special powers are sealed!
    if (id === lynchedId && victim.roleId === 'elder') {
      elderLynchedPenalty = true;
      for (const p of updated) {
        if (ROLES[p.roleId].faction === 'villager') {
          p.hasUsedPower = true;
          p.hasUsedHeal = true;
          p.hasUsedPoison = true;
        }
      }
      cascadeMessages.push(
        `⚠️ Già Làng ${victim.name} bị dân làng treo cổ oan! Toàn bộ quyền năng của Phe Dân Làng bị phong ấn!`
      );
    }

    if (victim.roleId === 'wolf_pup') {
      wolfPupTriggeredNextNight = true;
      cascadeMessages.push(`Sói Con ${victim.name} bị treo cổ! Đêm tới đàn Sói được cắn 2 mục tiêu!`);
    }

    if (victim.roleId === 'hunter' && !victim.hasUsedPower) {
      triggeredHunterId = victim.id;
    }

    const doppel = updated.find(
      (p) =>
        p.roleId === 'doppelganger' &&
        p.isAlive &&
        (p.targetPlayerId === victim.id || (!p.targetPlayerId && p.targetRoleId === victim.roleId))
    );
    if (doppel && victim.roleId !== 'doppelganger') {
      applyDoppelgangerInheritance(doppel, victim.roleId);
      cascadeMessages.push(`Nhân Bản ${doppel.name} đã thức tỉnh thành ${ROLES[victim.roleId].name.vi}!`);
    }

    if (victim.loverId) {
      const lover = updated.find((p) => p.id === victim.loverId);
      if (lover && lover.isAlive && !processed.has(lover.id)) {
        toKill.push(lover.id);
        cascadeMessages.push(`💔 Tình nhân ${lover.name} đã tự vẫn theo ${victim.name} tại pháp trường!`);
      }
    }
  }

  return {
    updatedPlayers: updated,
    wolfPupTriggeredNextNight,
    triggeredHunterId,
    elderLynchedPenalty,
    cascadeMessages,
  };
}

/**
 * Enforce single-vote invariant for daytime voting:
 * Each voter may hold at most ONE active vote at any time.
 * Passing targetId = null clears the voter's vote.
 */
export function castSingleDayVote(
  votes: VoteRecord[],
  voterId: string,
  targetId: string | null
): VoteRecord[] {
  const withoutVoter = votes.filter((v) => v.voterId !== voterId);
  if (!targetId) {
    return withoutVoter;
  }
  return [...withoutVoter, { voterId, targetId }];
}

export interface VoteTallyVoter {
  id: string;
  name: string;
  avatar: string;
  seatNumber: number;
}

export interface VoteTallyEntry {
  playerId: string;
  name: string;
  avatar: string;
  seatNumber: number;
  votes: number;
  voters: VoteTallyVoter[];
}

/**
 * Deduplicate votes by voterId (last vote wins) and aggregate both vote count
 * and the exact list of voters who voted for each target.
 */
export function buildVoteTallyEntries(
  players: Player[],
  votes: VoteRecord[]
): VoteTallyEntry[] {
  const latestVoteByVoter = new Map<string, string>();
  for (const v of votes) {
    if (!v.voterId || !v.targetId) continue;
    latestVoteByVoter.set(v.voterId, v.targetId);
  }

  const votersByTarget = new Map<string, VoteTallyVoter[]>();
  for (const [voterId, targetId] of latestVoteByVoter.entries()) {
    const voterIdx = players.findIndex((p) => p.id === voterId);
    const voter = voterIdx >= 0 ? players[voterIdx] : null;
    const voterInfo: VoteTallyVoter = {
      id: voterId,
      name: voter?.name || voterId,
      avatar: voter?.avatar || '👤',
      seatNumber: voterIdx >= 0 ? voterIdx + 1 : 0,
    };
    const list = votersByTarget.get(targetId) || [];
    list.push(voterInfo);
    votersByTarget.set(targetId, list);
  }

  const entries: VoteTallyEntry[] = [];
  for (const [targetId, voters] of votersByTarget.entries()) {
    const targetIdx = players.findIndex((p) => p.id === targetId);
    const target = targetIdx >= 0 ? players[targetIdx] : null;
    voters.sort((a, b) => a.seatNumber - b.seatNumber);
    entries.push({
      playerId: targetId,
      name: target?.name || targetId,
      avatar: target?.avatar || '👤',
      seatNumber: targetIdx >= 0 ? targetIdx + 1 : 0,
      votes: voters.length,
      voters,
    });
  }

  return entries.sort((a, b) => b.votes - a.votes || a.seatNumber - b.seatNumber);
}

/**
 * Tally day votes transparently (deduplicated per voter so no player can vote twice)
 */
export function tallyVotes(votes: VoteRecord[]): {
  targetId: string | null;
  isTie: boolean;
  counts: Record<string, number>;
} {
  const latestVoteByVoter = new Map<string, string>();
  for (const v of votes) {
    if (!v.voterId || !v.targetId) continue;
    latestVoteByVoter.set(v.voterId, v.targetId);
  }

  const counts: Record<string, number> = {};
  for (const targetId of latestVoteByVoter.values()) {
    counts[targetId] = (counts[targetId] || 0) + 1;
  }

  let maxVotes = 0;
  let candidates: string[] = [];

  for (const [id, count] of Object.entries(counts)) {
    if (count > maxVotes) {
      maxVotes = count;
      candidates = [id];
    } else if (count === maxVotes) {
      candidates.push(id);
    }
  }

  if (maxVotes === 0 || candidates.length === 0) {
    return { targetId: null, isTie: false, counts };
  }

  if (candidates.length > 1) {
    return { targetId: null, isTie: true, counts };
  }

  return { targetId: candidates[0], isTie: false, counts };
}

/**
 * Hunter shot resolution with full cascade (Lover suicide, Wolf Pup frenzy, Doppelganger inheritance)
 */
export function resolveHunterShot(
  players: Player[],
  hunterId: string,
  targetId: string
): {
  updatedPlayers: Player[];
  victimName: string;
  extraVictimId: string | null;
  wolfPupTriggeredNextNight: boolean;
  cascadeMessages: string[];
} {
  const updated = players.map((p) => ({ ...p }));
  const hunter = updated.find((p) => p.id === hunterId);
  if (hunter) {
    hunter.hasUsedPower = true;
  }

  let extraVictimId: string | null = null;
  let victimName = '';
  let wolfPupTriggeredNextNight = false;
  const cascadeMessages: string[] = [];

  const toKill = [targetId];
  const processed = new Set<string>();

  while (toKill.length > 0) {
    const id = toKill.shift()!;
    if (processed.has(id)) continue;
    processed.add(id);

    const victim = updated.find((p) => p.id === id);
    if (!victim || !victim.isAlive) continue;

    victim.isAlive = false;
    if (id === targetId) {
      victimName = victim.name;
    } else {
      extraVictimId = victim.id;
    }

    if (victim.roleId === 'wolf_pup') {
      wolfPupTriggeredNextNight = true;
      cascadeMessages.push(`Phát súng Thợ Săn bắn trúng Sói Con ${victim.name}! Đêm tới Sói cắn 2 người!`);
    }

    const doppel = updated.find(
      (p) =>
        p.roleId === 'doppelganger' &&
        p.isAlive &&
        (p.targetPlayerId === victim.id || (!p.targetPlayerId && p.targetRoleId === victim.roleId))
    );
    if (doppel && victim.roleId !== 'doppelganger') {
      applyDoppelgangerInheritance(doppel, victim.roleId);
      cascadeMessages.push(`Nhân Bản ${doppel.name} đã kế thừa thân phận ${ROLES[victim.roleId].name.vi}!`);
    }

    if (victim.loverId) {
      const lover = updated.find((p) => p.id === victim.loverId);
      if (lover && lover.isAlive && !processed.has(lover.id)) {
        toKill.push(lover.id);
        cascadeMessages.push(`💔 Tình nhân ${lover.name} đã quyên sinh theo ${victim.name}!`);
      }
    }
  }

  return {
    updatedPlayers: updated,
    victimName,
    extraVictimId,
    wolfPupTriggeredNextNight,
    cascadeMessages,
  };
}

/**
 * Check win conditions for all factions
 * Note: Traitor ('traitor') is allied with Werewolves but cannot bite at night;
 * if all actual Werewolves ('werewolf' | 'wolf_pup') die, Villagers win!
 */
export function checkWinCondition(
  players: Player[],
  lastLynchedPlayerId?: string
): {
  isOver: boolean;
  winner: 'villagers' | 'werewolves' | 'lovers' | 'tanner' | 'draw' | null;
  reason: string;
} {
  if (lastLynchedPlayerId) {
    const lynched = players.find((p) => p.id === lastLynchedPlayerId);
    if (lynched && lynched.roleId === 'tanner') {
      return {
        isOver: true,
        winner: 'tanner',
        reason: `Kẻ Chán Đời (${lynched.name}) đã lừa cả làng treo cổ mình thành công và giành chiến thắng tuyệt đối!`,
      };
    }
  }

  const alivePlayers = players.filter((p) => p.isAlive);

  if (alivePlayers.length === 0) {
    return {
      isOver: true,
      winner: 'draw',
      reason: 'Không còn ai sống sót trong ngôi làng. Trận đấu khép lại với kết quả Hòa!',
    };
  }

  // Lovers win if they are the final 2 survivors and belong to different factions (or neutral)
  if (alivePlayers.length === 2 && alivePlayers[0].loverId === alivePlayers[1].id) {
    const r1 = ROLES[alivePlayers[0].roleId];
    const r2 = ROLES[alivePlayers[1].roleId];
    if (r1.faction !== r2.faction) {
      return {
        isOver: true,
        winner: 'lovers',
        reason: `Cặp đôi Tình Nhân khác phe (${alivePlayers[0].name} & ${alivePlayers[1].name}) đã vượt qua định kiến và chiến thắng!`,
      };
    }
  }

  // Real biting Werewolves ('werewolf' or 'wolf_pup')
  const bitingWolves = alivePlayers.filter(
    (p) => p.roleId === 'werewolf' || p.roleId === 'wolf_pup'
  );
  const nonBitingPlayers = alivePlayers.filter(
    (p) => p.roleId !== 'werewolf' && p.roleId !== 'wolf_pup'
  );

  // If all actual Werewolves are eliminated, Villagers win (even if Traitor is still alive)
  if (bitingWolves.length === 0) {
    return {
      isOver: true,
      winner: 'villagers',
      reason: 'Toàn bộ Ma Sói đã bị tiêu diệt! Bình minh thực sự đã trở lại với Phe Dân Làng!',
    };
  }

  // If biting Werewolves reach numerical parity with non-biting players, Werewolves win
  if (bitingWolves.length >= nonBitingPlayers.length) {
    return {
      isOver: true,
      winner: 'werewolves',
      reason: `Bầy Ma Sói đã làm chủ hoàn toàn ngôi làng (${bitingWolves.length} Sói vs ${nonBitingPlayers.length} Dân). Phe Ma Sói thắng!`,
    };
  }

  return {
    isOver: false,
    winner: null,
    reason: '',
  };
}
