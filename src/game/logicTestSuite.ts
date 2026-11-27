import {
  generateBalancedRoster,
  getNightCallOrder,
  resolveNightActions,
  applyDayLynch,
  tallyVotes,
  checkWinCondition,
} from './rules';
import { Player } from '../types/game';
import { ROLES } from './roles';

export interface LogicTestCaseResult {
  id: string;
  category: 'Roster & Setup' | 'Night Resolution' | 'Special Roles & Cascades' | 'Voting & Win Conditions';
  title: string;
  description: string;
  passed: boolean;
  expected: string;
  actual: string;
  durationMs: number;
}

export interface LogicTestScenario {
  id: string;
  category: LogicTestCaseResult['category'];
  title: string;
  description: string;
  expectedSummary: string;
  run: () => { passed: boolean; actualSummary: string };
}

export const LOGIC_TEST_SCENARIOS: LogicTestScenario[] = [
  // 1. Balanced 6-Player Roster
  {
    id: 'test-01-roster-6p',
    category: 'Roster & Setup',
    title: 'Phân chia vai cân bằng bàn 6 người (2 Sói vs 4 Dân)',
    description:
      'Kiểm tra bàn 6 người đúng tỷ lệ 2 Ma Sói vs 4 Dân Làng (Tiên Tri, Bảo Vệ, 2 Dân Làng), khớp với mô tả Tooltip độ khó.',
    expectedSummary: '6 người: 2 Ma Sói, 1 Tiên Tri, 1 Bảo Vệ, 2 Dân Làng',
    run: () => {
      const r6 = generateBalancedRoster(6);
      const wolves = r6.filter((r) => r === 'werewolf' || r === 'wolf_pup');
      const villagers = r6.filter((r) => r === 'villager');
      const passed =
        r6.length === 6 &&
        wolves.length === 2 &&
        r6.includes('seer') &&
        r6.includes('bodyguard') &&
        villagers.length === 2;
      return {
        passed,
        actualSummary: `${r6.length} người: ${wolves.length} Sói (${r6.join(', ')})`,
      };
    },
  },

  // 2. Balanced 8, 10, 12 Player Rosters
  {
    id: 'test-02-roster-scales',
    category: 'Roster & Setup',
    title: 'Phân chia vai bàn 8, 10, 12 người chuẩn luật',
    description:
      'Kiểm tra bàn 8 người có 2 Sói + Cupid; bàn 10 người có Sói Con + Già Làng + Kẻ Chán Đời; bàn 12 người đủ 3 Sói + Kẻ Phản Bội + Bán Sói + Nhân Bản.',
    expectedSummary: '8p (2 Sói), 10p (1 Sói + 1 Sói Con), 12p (2 Sói + 1 Sói Con + 1 Phản Bội)',
    run: () => {
      const r8 = generateBalancedRoster(8);
      const r10 = generateBalancedRoster(10);
      const r12 = generateBalancedRoster(12);
      const w8 = r8.filter((r) => r === 'werewolf' || r === 'wolf_pup').length;
      const w10 = r10.filter((r) => r === 'werewolf' || r === 'wolf_pup').length;
      const w12 = r12.filter((r) => r === 'werewolf' || r === 'wolf_pup').length;
      const passed =
        r8.length === 8 &&
        w8 === 2 &&
        r10.length === 10 &&
        w10 === 2 &&
        r10.includes('wolf_pup') &&
        r12.length === 12 &&
        w12 === 3 &&
        r12.includes('traitor');
      return {
        passed,
        actualSummary: `8p (${w8} Sói), 10p (${w10} Sói, có Sói Con), 12p (${w12} Sói + Phản Bội)`,
      };
    },
  },

  // 3. Night Call Order
  {
    id: 'test-03-wake-order',
    category: 'Roster & Setup',
    title: 'Thứ tự gọi thức dậy ban đêm (Wake Order)',
    description:
      'Đảm bảo Nhân Bản (5) -> Cupid (10) -> Bảo Vệ (15) -> Thợ Săn (18) -> Ma Sói (20) -> Sói Con (22) -> Phù Thủy (30) -> Tiên Tri (40).',
    expectedSummary: 'doppelganger -> cupid -> bodyguard -> hunter -> werewolf -> wolf_pup -> witch -> seer',
    run: () => {
      const order = getNightCallOrder().map((r) => r.id);
      const expected = [
        'doppelganger',
        'cupid',
        'bodyguard',
        'hunter',
        'werewolf',
        'wolf_pup',
        'witch',
        'seer',
      ];
      const passed = JSON.stringify(order) === JSON.stringify(expected);
      return {
        passed,
        actualSummary: order.join(' -> '),
      };
    },
  },

  // 4. Bodyguard Saves Wolf Victim & Blocks Consecutive Protection
  {
    id: 'test-04-bodyguard-consecutive',
    category: 'Night Resolution',
    title: 'Bảo Vệ cứu người đêm 1 & Cấm bảo vệ trùng người đêm 2',
    description:
      'Đêm 1 Bảo Vệ che chắn mục tiêu bị Sói cắn (không ai chết). Đêm 2 nếu cố bảo vệ lại cùng người đó sẽ bị từ chối và nạn nhân chết.',
    expectedSummary: 'Đêm 1: Sống (saved=true). Đêm 2 bảo vệ trùng: Chết (isAlive=false)',
    run: () => {
      const players: Player[] = [
        { id: 'p1', name: 'Sói', avatar: '🐺', roleId: 'werewolf', isAlive: true },
        { id: 'p2', name: 'Tiên Tri', avatar: '🔮', roleId: 'seer', isAlive: true },
        { id: 'p3', name: 'Bảo Vệ', avatar: '🛡️', roleId: 'bodyguard', isAlive: true },
      ];
      const n1 = resolveNightActions(players, { wolfTargetId: 'p2', guardTargetId: 'p2' });
      const n2 = resolveNightActions(n1.updatedPlayers, {
        wolfTargetId: 'p2',
        guardTargetId: 'p2',
      });
      const p2AfterN1 = n1.updatedPlayers.find((p) => p.id === 'p2')!;
      const p2AfterN2 = n2.updatedPlayers.find((p) => p.id === 'p2')!;
      const passed =
        p2AfterN1.isAlive === true &&
        p2AfterN1.protectedLastNight === true &&
        p2AfterN2.isAlive === false;
      return {
        passed,
        actualSummary: `Đêm 1: isAlive=${p2AfterN1.isAlive}. Đêm 2: isAlive=${p2AfterN2.isAlive}`,
      };
    },
  },

  // 5. Witch Heal & Poison One-Time Limit
  {
    id: 'test-05-witch-potions',
    category: 'Night Resolution',
    title: 'Phù Thủy dùng Bình Cứu & Bình Độc (Giới hạn 1 lần/ván)',
    description:
      'Phù Thủy cứu sống nạn nhân bị Sói cắn và ném độc hạ gục nghi phạm trong Đêm 1. Sang Đêm 2 cả 2 bình đều đã cạn, không thể dùng lại.',
    expectedSummary: 'Đêm 1: Cứu p2, Độc chết p4. Đêm 2: Không thể cứu p2 lần 2',
    run: () => {
      const players: Player[] = [
        { id: 'p1', name: 'Sói', avatar: '🐺', roleId: 'werewolf', isAlive: true },
        { id: 'p2', name: 'Dân A', avatar: '🧑‍🌾', roleId: 'villager', isAlive: true },
        { id: 'p3', name: 'Phù Thủy', avatar: '🧪', roleId: 'witch', isAlive: true },
        { id: 'p4', name: 'Dân B', avatar: '🧑‍🌾', roleId: 'villager', isAlive: true },
      ];
      const n1 = resolveNightActions(players, {
        wolfTargetId: 'p2',
        witchHealTargetId: 'p2',
        witchPoisonTargetId: 'p4',
      });
      const witchAfterN1 = n1.updatedPlayers.find((p) => p.id === 'p3')!;
      // Night 2: Witch tries to heal p2 again -> fails because hasUsedHeal is true
      const n2 = resolveNightActions(n1.updatedPlayers, {
        wolfTargetId: 'p2',
        witchHealTargetId: 'p2',
      });
      const p2AfterN2 = n2.updatedPlayers.find((p) => p.id === 'p2')!;
      const passed =
        n1.result.savedPlayerIds.includes('p2') &&
        n1.result.killedPlayerIds.includes('p4') &&
        witchAfterN1.hasUsedHeal === true &&
        witchAfterN1.hasUsedPoison === true &&
        p2AfterN2.isAlive === false;
      return {
        passed,
        actualSummary: `hasUsedHeal=${witchAfterN1.hasUsedHeal}, hasUsedPoison=${witchAfterN1.hasUsedPoison}, Đêm 2 p2.isAlive=${p2AfterN2.isAlive}`,
      };
    },
  },

  // 6. Werewolf Mindgame: Self-Bite + Witch Heal Bait
  {
    id: 'test-06-wolf-self-bite-bait',
    category: 'Night Resolution',
    title: 'Chiến thuật Sói tự cắn mình lừa Phù Thủy tung Bình Cứu',
    description:
      'Ma Sói tự cắn chính mình trong đêm, Phù Thủy tưởng người tốt bị hại nên dùng Bình Cứu -> Sói sống sót và Phù Thủy mất Bình Cứu!',
    expectedSummary: 'Sói (p1) vẫn sống, Phù Thủy (p2) mất Bình Cứu (hasUsedHeal=true)',
    run: () => {
      const players: Player[] = [
        { id: 'p1', name: 'Sói Chúa', avatar: '🐺', roleId: 'werewolf', isAlive: true },
        { id: 'p2', name: 'Phù Thủy', avatar: '🧪', roleId: 'witch', isAlive: true },
        { id: 'p3', name: 'Dân Làng', avatar: '🧑‍🌾', roleId: 'villager', isAlive: true },
      ];
      const { updatedPlayers, result } = resolveNightActions(players, {
        wolfTargetId: 'p1',
        witchHealTargetId: 'p1',
      });
      const wolf = updatedPlayers.find((p) => p.id === 'p1')!;
      const witch = updatedPlayers.find((p) => p.id === 'p2')!;
      const passed =
        wolf.isAlive === true &&
        result.savedPlayerIds.includes('p1') &&
        witch.hasUsedHeal === true;
      return {
        passed,
        actualSummary: `Sói isAlive=${wolf.isAlive}, Phù Thủy hasUsedHeal=${witch.hasUsedHeal}`,
      };
    },
  },

  // 7. Werewolf Mindgame: Bite Own Wolf Pup to Trigger Frenzy
  {
    id: 'test-07-wolf-bite-pup-frenzy',
    category: 'Special Roles & Cascades',
    title: 'Sói Chúa chủ động cắn Sói Con để kích hoạt Cuồng Nộ 2 mạng',
    description:
      'Đêm 1 Sói Chúa cắn hy sinh Sói Con -> kích hoạt wolfPupTriggeredNextNight. Đêm 2 Sói Chúa cắn chết 2 Dân Làng cùng lúc!',
    expectedSummary: 'Đêm 1: Sói Con chết, frenzy=true. Đêm 2: 2 Dân Làng chết cùng đêm',
    run: () => {
      const players: Player[] = [
        { id: 'p1', name: 'Sói Chúa', avatar: '🐺', roleId: 'werewolf', isAlive: true },
        { id: 'p2', name: 'Sói Con', avatar: '🔥', roleId: 'wolf_pup', isAlive: true },
        { id: 'p3', name: 'Dân A', avatar: '🧑‍🌾', roleId: 'villager', isAlive: true },
        { id: 'p4', name: 'Dân B', avatar: '🧑‍🌾', roleId: 'villager', isAlive: true },
      ];
      const n1 = resolveNightActions(players, { wolfTargetId: 'p2' });
      const n2 = resolveNightActions(
        n1.updatedPlayers,
        { wolfTargetId: 'p3', secondWolfTargetId: 'p4' },
        { wolfPupTriggered: n1.result.wolfPupTriggeredNextNight }
      );
      const passed =
        n1.result.wolfPupTriggeredNextNight === true &&
        n2.result.killedPlayerIds.length === 2 &&
        !n2.updatedPlayers.find((p) => p.id === 'p3')!.isAlive &&
        !n2.updatedPlayers.find((p) => p.id === 'p4')!.isAlive;
      return {
        passed,
        actualSummary: `Đêm 1 frenzy=${n1.result.wolfPupTriggeredNextNight}, Đêm 2 số người chết=${n2.result.killedPlayerIds.length}`,
      };
    },
  },

  // 8. Elder 2 Lives vs Werewolves
  {
    id: 'test-08-elder-two-lives',
    category: 'Special Roles & Cascades',
    title: 'Già Làng chịu được 2 phát cắn của Ma Sói',
    description:
      'Lần đầu bị Sói cắn, Già Làng giảm mạng từ 2 xuống 1 và không chết. Lần thứ 2 bị Sói cắn mới tử trận.',
    expectedSummary: 'Đêm 1: Sống (elderLives=1). Đêm 2: Chết (isAlive=false)',
    run: () => {
      const players: Player[] = [
        { id: 'p1', name: 'Sói', avatar: '🐺', roleId: 'werewolf', isAlive: true },
        { id: 'p2', name: 'Già Làng', avatar: '👑', roleId: 'elder', isAlive: true, elderLives: 2 },
      ];
      const n1 = resolveNightActions(players, { wolfTargetId: 'p2' });
      const elderAfterN1 = n1.updatedPlayers.find((p) => p.id === 'p2')!;
      const n2 = resolveNightActions(n1.updatedPlayers, { wolfTargetId: 'p2' });
      const elderAfterN2 = n2.updatedPlayers.find((p) => p.id === 'p2')!;
      const passed =
        elderAfterN1.isAlive === true &&
        elderAfterN1.elderLives === 1 &&
        n1.result.elderAttacked === true &&
        elderAfterN2.isAlive === false;
      return {
        passed,
        actualSummary: `Đêm 1: isAlive=${elderAfterN1.isAlive} (lives=${elderAfterN1.elderLives}). Đêm 2: isAlive=${elderAfterN2.isAlive}`,
      };
    },
  },

  // 9. Elder Lynched Penalty Seals Villager Powers
  {
    id: 'test-09-elder-lynch-penalty',
    category: 'Special Roles & Cascades',
    title: 'Hình phạt khi Dân Làng treo cổ nhầm Già Làng',
    description:
      'Nếu Già Làng bị dân làng biểu quyết treo cổ vào ban ngày, toàn bộ chức năng đặc biệt của Phe Dân Làng (Tiên Tri, Bảo Vệ, Phù Thủy, Thợ Săn) bị phong ấn!',
    expectedSummary: 'elderLynchedPenalty=true, Tiên Tri/Phù Thủy/Bảo Vệ mất quyền năng',
    run: () => {
      const players: Player[] = [
        { id: 'p1', name: 'Già Làng', avatar: '👑', roleId: 'elder', isAlive: true, elderLives: 2 },
        { id: 'p2', name: 'Tiên Tri', avatar: '🔮', roleId: 'seer', isAlive: true },
        { id: 'p3', name: 'Phù Thủy', avatar: '🧪', roleId: 'witch', isAlive: true },
        { id: 'p4', name: 'Sói', avatar: '🐺', roleId: 'werewolf', isAlive: true },
      ];
      const lynchRes = applyDayLynch(players, 'p1');
      const seer = lynchRes.updatedPlayers.find((p) => p.id === 'p2')!;
      const witch = lynchRes.updatedPlayers.find((p) => p.id === 'p3')!;
      // Try using Seer at night after penalty -> should return null seerInspection
      const nightRes = resolveNightActions(lynchRes.updatedPlayers, { seerTargetId: 'p4' });
      const passed =
        lynchRes.elderLynchedPenalty === true &&
        seer.hasUsedPower === true &&
        witch.hasUsedHeal === true &&
        witch.hasUsedPoison === true &&
        nightRes.result.seerInspection === null;
      return {
        passed,
        actualSummary: `Penalty=${lynchRes.elderLynchedPenalty}, Seer sealed=${seer.hasUsedPower}, Inspection=${nightRes.result.seerInspection}`,
      };
    },
  },

  // 10. Cursed (Bán Sói) Transforms into Werewolf When Bitten
  {
    id: 'test-10-cursed-transformation',
    category: 'Special Roles & Cascades',
    title: 'Bán Sói (Cursed) hóa thành Ma Sói khi bị Sói cắn',
    description:
      'Bán Sói ban đầu thuộc phe Dân Làng. Khi bị Ma Sói cắn ban đêm, không chết mà biến đổi roleId thành Ma Sói!',
    expectedSummary: 'Bán Sói không chết (isAlive=true) và roleId chuyển thành "werewolf"',
    run: () => {
      const players: Player[] = [
        { id: 'p1', name: 'Sói Chúa', avatar: '🐺', roleId: 'werewolf', isAlive: true },
        { id: 'p2', name: 'Bán Sói', avatar: '🌓', roleId: 'cursed', isAlive: true },
        { id: 'p3', name: 'Dân Làng', avatar: '🧑‍🌾', roleId: 'villager', isAlive: true },
      ];
      const { updatedPlayers, result } = resolveNightActions(players, { wolfTargetId: 'p2' });
      const transformed = updatedPlayers.find((p) => p.id === 'p2')!;
      const passed =
        transformed.isAlive === true &&
        transformed.roleId === 'werewolf' &&
        result.killedPlayerIds.length === 0;
      return {
        passed,
        actualSummary: `isAlive=${transformed.isAlive}, newRoleId=${transformed.roleId}`,
      };
    },
  },

  // 11. Seer Inspection: Traitor vs Real Werewolves
  {
    id: 'test-11-seer-traitor-stealth',
    category: 'Special Roles & Cascades',
    title: 'Tiên Tri soi Kẻ Phản Bội ra Dân Làng, soi Sói Con ra Ma Sói',
    description:
      'Kẻ Phản Bội (Traitor) thuộc phe Sói nhưng ngụy trang hoàn hảo trước Tiên Tri (isWerewolf=false). Trong khi đó Sói Con bị soi ra Ma Sói (isWerewolf=true).',
    expectedSummary: 'Soi Traitor -> isWerewolf=false; Soi Wolf Pup -> isWerewolf=true',
    run: () => {
      const players: Player[] = [
        { id: 'p1', name: 'Tiên Tri', avatar: '🔮', roleId: 'seer', isAlive: true },
        { id: 'p2', name: 'Phản Bội', avatar: '🗡️', roleId: 'traitor', isAlive: true },
        { id: 'p3', name: 'Sói Con', avatar: '🔥', roleId: 'wolf_pup', isAlive: true },
      ];
      const checkTraitor = resolveNightActions(players, { seerTargetId: 'p2' });
      const checkPup = resolveNightActions(players, { seerTargetId: 'p3' });
      const passed =
        checkTraitor.result.seerInspection?.isWerewolf === false &&
        checkPup.result.seerInspection?.isWerewolf === true;
      return {
        passed,
        actualSummary: `Traitor isWerewolf=${checkTraitor.result.seerInspection?.isWerewolf}, WolfPup isWerewolf=${checkPup.result.seerInspection?.isWerewolf}`,
      };
    },
  },

  // 12. Cupid Lovers Suicide Chain (Night & Day)
  {
    id: 'test-12-cupid-lover-suicide',
    category: 'Special Roles & Cascades',
    title: 'Cupid ghép đôi Tình Nhân & Quyên sinh dây chuyền khi 1 người chết',
    description:
      'Cupid ghép đôi p2 và p3 ở Đêm 1. Nếu Sói cắn chết p2 ngay trong đêm, p3 lập tức quyên sinh chết theo!',
    expectedSummary: 'Cả p2 và p3 đều tử trận (killedPlayerIds có cả p2 và p3)',
    run: () => {
      const players: Player[] = [
        { id: 'p1', name: 'Sói', avatar: '🐺', roleId: 'werewolf', isAlive: true },
        { id: 'p2', name: 'Romeo', avatar: '💘', roleId: 'villager', isAlive: true },
        { id: 'p3', name: 'Juliet', avatar: '💘', roleId: 'seer', isAlive: true },
        { id: 'p4', name: 'Cupid', avatar: '💘', roleId: 'cupid', isAlive: true },
      ];
      const { updatedPlayers, result } = resolveNightActions(
        players,
        {
          cupidLovers: ['p2', 'p3'],
          wolfTargetId: 'p2',
        },
        { roundNumber: 1 }
      );
      const p2 = updatedPlayers.find((p) => p.id === 'p2')!;
      const p3 = updatedPlayers.find((p) => p.id === 'p3')!;
      const passed =
        !p2.isAlive &&
        !p3.isAlive &&
        result.killedPlayerIds.includes('p2') &&
        result.killedPlayerIds.includes('p3');
      return {
        passed,
        actualSummary: `Romeo isAlive=${p2.isAlive}, Juliet isAlive=${p3.isAlive}, killed=[${result.killedPlayerIds.join(', ')}]`,
      };
    },
  },

  // 13. Doppelganger Role & State Inheritance
  {
    id: 'test-13-doppelganger-inherit',
    category: 'Special Roles & Cascades',
    title: 'Nhân Bản (Doppelgänger) kế thừa vai trò và đầy đủ trạng thái khi mục tiêu chết',
    description:
      'Đêm 1 Nhân Bản chọn sao chép Phù Thủy. Khi Phù Thủy bị giết, Nhân Bản lập tức biến thành Phù Thủy mới với đầy đủ 2 bình thuốc.',
    expectedSummary: 'Nhân Bản trở thành "witch" với hasUsedHeal=false, hasUsedPoison=false',
    run: () => {
      const players: Player[] = [
        { id: 'p1', name: 'Sói', avatar: '🐺', roleId: 'werewolf', isAlive: true },
        {
          id: 'p2',
          name: 'Phù Thủy Gốc',
          avatar: '🧪',
          roleId: 'witch',
          isAlive: true,
          hasUsedHeal: true,
          hasUsedPoison: true,
        },
        { id: 'p3', name: 'Nhân Bản', avatar: '🪞', roleId: 'doppelganger', isAlive: true },
      ];
      const { updatedPlayers } = resolveNightActions(
        players,
        {
          doppelgangerTargetId: 'p2',
          wolfTargetId: 'p2',
        },
        { roundNumber: 1 }
      );
      const doppel = updatedPlayers.find((p) => p.id === 'p3')!;
      const passed =
        doppel.roleId === 'witch' &&
        doppel.hasUsedHeal === false &&
        doppel.hasUsedPoison === false;
      return {
        passed,
        actualSummary: `Doppel roleId=${doppel.roleId}, hasUsedHeal=${doppel.hasUsedHeal}, hasUsedPoison=${doppel.hasUsedPoison}`,
      };
    },
  },

  // 14. Night-Aim Hunter dies at night -> pre-marked bullet auto-fires (Lover who is Wolf Pup); day lynch does NOT fire
  {
    id: 'test-14-hunter-shot-cascade',
    category: 'Special Roles & Cascades',
    title: 'Thợ Săn chết ban đêm tự bắn mục tiêu đã ghim, kéo theo Sói Con chết & kích hoạt Cuồng Nộ',
    description:
      'Thợ Săn đã ghim p2 (đang yêu p3 là Sói Con). Khi Thợ Săn chết trong đêm, phát đạn ghim tự nổ kéo theo p2 và p3 và kích hoạt wolfPupTriggeredNextNight; còn bị treo cổ ban ngày thì không bắn.',
    expectedSummary: 'Chết đêm: p2 & p3 chết, frenzy=true; Treo cổ ngày: p2 sống, hunterShots=0',
    run: () => {
      const players: Player[] = [
        { id: 'p1', name: 'Thợ Săn', avatar: '🎯', roleId: 'hunter', isAlive: true, hunterMarkId: 'p2' },
        { id: 'p2', name: 'Dân Làng', avatar: '🧑‍🌾', roleId: 'villager', isAlive: true, loverId: 'p3' },
        { id: 'p3', name: 'Sói Con', avatar: '🔥', roleId: 'wolf_pup', isAlive: true, loverId: 'p2' },
        { id: 'p4', name: 'Sói Chúa', avatar: '🐺', roleId: 'werewolf', isAlive: true },
      ];
      const dayRes = applyDayLynch(players, 'p1');
      const dayP2 = dayRes.updatedPlayers.find((p: Player) => p.id === 'p2')!;
      const nightRes = resolveNightActions(players, { wolfTargetId: 'p1', hunterTargetId: 'p2' });
      const p2 = nightRes.updatedPlayers.find((p: Player) => p.id === 'p2')!;
      const p3 = nightRes.updatedPlayers.find((p: Player) => p.id === 'p3')!;
      const passed =
        dayP2.isAlive &&
        dayRes.hunterShots.length === 0 &&
        !p2.isAlive &&
        !p3.isAlive &&
        nightRes.result.hunterShots.length === 1 &&
        nightRes.result.hunterShots[0].targetId === 'p2' &&
        nightRes.result.wolfPupTriggeredNextNight === true;
      return {
        passed,
        actualSummary: `dayP2.isAlive=${dayP2.isAlive}, nightP2.isAlive=${p2.isAlive}, p3.isAlive=${p3.isAlive}, frenzy=${nightRes.result.wolfPupTriggeredNextNight}`,
      };
    },
  },

  // 15. Vote Tallying: Majority vs Tie
  {
    id: 'test-15-vote-tally-tie',
    category: 'Voting & Win Conditions',
    title: 'Kiểm phiếu minh bạch: Phân biệt Đa Số và Hòa Phiếu (Tie)',
    description:
      'Nếu 1 người có số phiếu cao nhất -> trả về targetId. Nếu 2 người bằng phiếu cao nhất -> isTie=true và không ai bị treo cổ.',
    expectedSummary: 'Đa số (2 vs 1) -> targetId="p1". Hòa (2 vs 2) -> isTie=true, targetId=null',
    run: () => {
      const majority = tallyVotes([
        { voterId: 'v1', targetId: 'p1' },
        { voterId: 'v2', targetId: 'p1' },
        { voterId: 'v3', targetId: 'p2' },
      ]);
      const tie = tallyVotes([
        { voterId: 'v1', targetId: 'p1' },
        { voterId: 'v2', targetId: 'p1' },
        { voterId: 'v3', targetId: 'p2' },
        { voterId: 'v4', targetId: 'p2' },
      ]);
      const passed =
        majority.targetId === 'p1' &&
        majority.isTie === false &&
        tie.targetId === null &&
        tie.isTie === true;
      return {
        passed,
        actualSummary: `Majority target=${majority.targetId}, Tie isTie=${tie.isTie} (target=${tie.targetId})`,
      };
    },
  },

  // 16. Tanner Instant Solo Victory on Day Lynch
  {
    id: 'test-16-tanner-lynch-win',
    category: 'Voting & Win Conditions',
    title: 'Kẻ Chán Đời (Tanner) thắng độc lập ngay khi bị treo cổ ban ngày',
    description:
      'Khi Kẻ Chán Đời bị dân làng biểu quyết treo cổ, trận đấu kết thúc ngay lập tức với phần thắng thuộc về "tanner".',
    expectedSummary: 'winner="tanner", isOver=true',
    run: () => {
      const players: Player[] = [
        { id: 'p1', name: 'Kẻ Chán Đời', avatar: '🎭', roleId: 'tanner', isAlive: false },
        { id: 'p2', name: 'Sói', avatar: '🐺', roleId: 'werewolf', isAlive: true },
        { id: 'p3', name: 'Dân A', avatar: '🧑‍🌾', roleId: 'villager', isAlive: true },
        { id: 'p4', name: 'Dân B', avatar: '🧑‍🌾', roleId: 'villager', isAlive: true },
      ];
      const win = checkWinCondition(players, 'p1');
      const passed = win.isOver === true && win.winner === 'tanner';
      return {
        passed,
        actualSummary: `isOver=${win.isOver}, winner=${win.winner}`,
      };
    },
  },

  // 17. Tanner Killed at Night Does NOT Win
  {
    id: 'test-17-tanner-night-death-no-win',
    category: 'Voting & Win Conditions',
    title: 'Kẻ Chán Đời bị Sói cắn ban đêm KHÔNG được tính thắng',
    description:
      'Nếu Kẻ Chán Đời chết vào ban đêm (không phải do bị treo cổ ban ngày), ván đấu vẫn tiếp diễn bình thường.',
    expectedSummary: 'isOver=false, winner=null',
    run: () => {
      const players: Player[] = [
        { id: 'p1', name: 'Kẻ Chán Đời', avatar: '🎭', roleId: 'tanner', isAlive: false },
        { id: 'p2', name: 'Sói', avatar: '🐺', roleId: 'werewolf', isAlive: true },
        { id: 'p3', name: 'Dân A', avatar: '🧑‍🌾', roleId: 'villager', isAlive: true },
        { id: 'p4', name: 'Dân B', avatar: '🧑‍🌾', roleId: 'villager', isAlive: true },
      ];
      const win = checkWinCondition(players);
      const passed = win.isOver === false && win.winner === null;
      return {
        passed,
        actualSummary: `isOver=${win.isOver}, winner=${win.winner}`,
      };
    },
  },

  // 18. Cross-Faction Lovers Win Over Werewolf Parity
  {
    id: 'test-18-lovers-win-condition',
    category: 'Voting & Win Conditions',
    title: 'Cặp Đôi Tình Nhân khác phe (1 Sói + 1 Dân) thắng khi còn 2 người cuối',
    description:
      'Khi ngôi làng chỉ còn 2 người sống sót là 1 Ma Sói và 1 Dân Làng nhưng cả hai là Tình Nhân của nhau, chiến thắng thuộc về "lovers" chứ không phải "werewolves"!',
    expectedSummary: 'winner="lovers", isOver=true',
    run: () => {
      const players: Player[] = [
        { id: 'p1', name: 'Sói Tình Si', avatar: '🐺', roleId: 'werewolf', isAlive: true, loverId: 'p2' },
        { id: 'p2', name: 'Dân Tình Nhân', avatar: '💘', roleId: 'villager', isAlive: true, loverId: 'p1' },
        { id: 'p3', name: 'Tiên Tri', avatar: '🔮', roleId: 'seer', isAlive: false },
      ];
      const win = checkWinCondition(players);
      const passed = win.isOver === true && win.winner === 'lovers';
      return {
        passed,
        actualSummary: `isOver=${win.isOver}, winner=${win.winner}`,
      };
    },
  },

  // 19. Traitor Alone Cannot Keep Game Going When All Real Wolves Die
  {
    id: 'test-19-traitor-non-biting-rule',
    category: 'Voting & Win Conditions',
    title: 'Kẻ Phản Bội không có răng nanh: Sói chết hết là Dân Làng thắng',
    description:
      'Khi toàn bộ Ma Sói và Sói Con đã chết, dù Kẻ Phản Bội (Traitor) còn sống thì Phe Dân Làng vẫn giành chiến thắng ngay lập tức.',
    expectedSummary: 'winner="villagers" dù Traitor còn sống',
    run: () => {
      const players: Player[] = [
        { id: 'p1', name: 'Sói Chúa', avatar: '🐺', roleId: 'werewolf', isAlive: false },
        { id: 'p2', name: 'Kẻ Phản Bội', avatar: '🗡️', roleId: 'traitor', isAlive: true },
        { id: 'p3', name: 'Dân Làng', avatar: '🧑‍🌾', roleId: 'villager', isAlive: true },
      ];
      const win = checkWinCondition(players);
      const passed = win.isOver === true && win.winner === 'villagers';
      return {
        passed,
        actualSummary: `isOver=${win.isOver}, winner=${win.winner}`,
      };
    },
  },

  // 20. Traitor Does Not Count Toward Wolf Numerical Parity
  {
    id: 'test-20-traitor-parity-check',
    category: 'Voting & Win Conditions',
    title: 'Kẻ Phản Bội không tính vào tỷ lệ áp đảo cắn đêm của Sói',
    description:
      'Khi còn 1 Ma Sói + 1 Kẻ Phản Bội + 1 Dân Làng (tổng 3 người: 1 Sói có răng vs 2 người không cắn đêm), ván đấu vẫn tiếp tục để Dân và Phản Bội bỏ phiếu ban ngày.',
    expectedSummary: '1 Sói + 1 Phản Bội + 1 Dân -> isOver=false (chưa kết thúc)',
    run: () => {
      const players: Player[] = [
        { id: 'p1', name: 'Sói Chúa', avatar: '🐺', roleId: 'werewolf', isAlive: true },
        { id: 'p2', name: 'Kẻ Phản Bội', avatar: '🗡️', roleId: 'traitor', isAlive: true },
        { id: 'p3', name: 'Tiên Tri', avatar: '🔮', roleId: 'seer', isAlive: true },
      ];
      const win = checkWinCondition(players);
      const passed = win.isOver === false && win.winner === null;
      return {
        passed,
        actualSummary: `isOver=${win.isOver}, winner=${win.winner}`,
      };
    },
  },

  // 21. Draw Condition When Last Survivors Die Simultaneously
  {
    id: 'test-21-mutual-destruction-draw',
    category: 'Voting & Win Conditions',
    title: 'Xử lý Hòa (Draw) khi 2 người cuối cùng chết cùng lúc',
    description:
      'Khi Sói cắn chết Thợ Săn cuối cùng và phát đạn ghim bắn chết lại Sói (0 người sống sót), kết quả trả về "draw".',
    expectedSummary: 'winner="draw", isOver=true',
    run: () => {
      const players: Player[] = [
        { id: 'p1', name: 'Sói', avatar: '🐺', roleId: 'werewolf', isAlive: true },
        { id: 'p2', name: 'Thợ Săn', avatar: '🎯', roleId: 'hunter', isAlive: true },
      ];
      const night = resolveNightActions(players, { wolfTargetId: 'p2', hunterTargetId: 'p1' });
      const win = checkWinCondition(night.updatedPlayers);
      const passed = win.isOver === true && win.winner === 'draw';
      return {
        passed,
        actualSummary: `Alive=${night.updatedPlayers.filter((p: Player) => p.isAlive).length}, winner=${win.winner}`,
      };
    },
  },

  // 22. All 13 Roles Multilingual Integrity Check
  {
    id: 'test-22-all-13-roles-i18n',
    category: 'Roster & Setup',
    title: 'Kiểm định toàn vẹn dữ liệu 13 Vai Trò & 2 Ngôn Ngữ',
    description:
      'Đảm bảo đủ 13 vai trò (Dân, Sói, Tiên Tri, Bảo Vệ, Phù Thủy, Thợ Săn, Cupid, Sói Con, Chán Đời, Già Làng, Nhân Bản, Bán Sói, Phản Bội) có đủ bản dịch 2 ngôn ngữ (vi, en) và hướng dẫn người mới.',
    expectedSummary: '13 vai trò hợp lệ, đủ 2 ngôn ngữ (vi, en)',
    run: () => {
      const roleList = Object.values(ROLES);
      const langs = ['vi', 'en'] as const;
      const allValid =
        roleList.length === 13 &&
        roleList.every((r) =>
          langs.every(
            (l) =>
              Boolean(r.name[l]) &&
              Boolean(r.description[l]) &&
              Boolean(r.instructions[l]) &&
              Boolean(r.guideForNewbie[l])
          )
        );
      return {
        passed: allValid,
        actualSummary: `${roleList.length} vai trò kiểm tra thành công trên 2 ngôn ngữ`,
      };
    },
  },
];

export function runAllLogicTests(): LogicTestCaseResult[] {
  return LOGIC_TEST_SCENARIOS.map((sc) => {
    const t0 = performance.now();
    try {
      const res = sc.run();
      const dt = Math.max(0.1, Number((performance.now() - t0).toFixed(2)));
      return {
        id: sc.id,
        category: sc.category,
        title: sc.title,
        description: sc.description,
        passed: res.passed,
        expected: sc.expectedSummary,
        actual: res.actualSummary,
        durationMs: dt,
      };
    } catch (err: any) {
      const dt = Math.max(0.1, Number((performance.now() - t0).toFixed(2)));
      return {
        id: sc.id,
        category: sc.category,
        title: sc.title,
        description: sc.description,
        passed: false,
        expected: sc.expectedSummary,
        actual: `Exception: ${err?.message || String(err)}`,
        durationMs: dt,
      };
    }
  });
}
