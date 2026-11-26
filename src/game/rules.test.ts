import test from 'node:test';
import assert from 'node:assert/strict';
import { LOGIC_TEST_SCENARIOS, runAllLogicTests } from './logicTestSuite.ts';
import {
  QA_1000_TEST_CASES,
  run1000MatchExperienceCampaign,
} from './qa1000TestSuite.ts';
import {
  applyDayLynch,
  assignPreferredRoleToDeck,
  buildVoteTallyEntries,
  castSingleDayVote,
  checkWinCondition,
  computeFactionAliveCounts,
  fisherYatesShuffle,
  generateBalancedRoster,
  getDyingWolfVictimsForWitch,
  resolveNightActions,
  tallyVotes,
} from './rules.ts';
import { AGROU_CLOAK_COLORS, migrateAgrouAvatarPayload } from './agrouMechanics.ts';
import { generateQrMatrix } from '../utils/qrSvg.ts';
import { UI_TEXT } from '../utils/i18n.ts';
import { ROLES } from './roles.ts';
import { ChatMessage, Language, Player, PropType, RoleId } from '../types/game.ts';
import { PROP_REACTION_META, ROLE_CALLOUT_LINES } from '../utils/sound.ts';
import {
  buildAutoGMNightSchedule,
  isPlayerAwakeForNightStep,
  findHumanNightStepIndex,
  getHumanRoleWakeGuidance,
  computeAutoGMBotNightStepAction,
  computeSmartBotDayVotes,
  pickSmartBotHunterTarget,
  extractChatVoteSignals,
  stripMarkdownAsterisks,
  buildBotDayDiscussionLines,
  prepareNightStartForHuman,
  shouldAutoAdvanceOnTimerZero,
  buildDawnGMAnnouncement,
  buildDuskGMAnnouncement,
  buildPrivateHumanNightNotice,
  determineEndOfNightCinematic,
  CustomTimerConfig,
  DEFAULT_TIMER_CONFIG,
} from './autoGM.ts';

// 1. Register each of the 22 comprehensive core game logic scenarios
for (const scenario of LOGIC_TEST_SCENARIOS) {
  test(`[${scenario.category}] ${scenario.id}: ${scenario.title}`, () => {
    const { passed, actualSummary } = scenario.run();
    assert.equal(
      passed,
      true,
      `Failed ${scenario.id}: expected (${scenario.expectedSummary}), got (${actualSummary})`
    );
  });
}

test('runAllLogicTests executes all 22 scenarios with 100% pass rate', () => {
  const results = runAllLogicTests();
  assert.equal(results.length, 22);
  const failed = results.filter((r) => !r.passed);
  assert.equal(failed.length, 0, `Failed tests: ${failed.map((f) => f.id).join(', ')}`);
});

// 2. Register all 1,051 QA Test Cases across the 6 QA Agent Teams
test('QA_1000_TEST_CASES contains at least 1,000 distinct test cases', () => {
  assert.ok(
    QA_1000_TEST_CASES.length >= 1000,
    `Expected >= 1000 test cases, got ${QA_1000_TEST_CASES.length}`
  );
});

for (const qaCase of QA_1000_TEST_CASES) {
  test(`[${qaCase.agent}] ${qaCase.id}: ${qaCase.title}`, () => {
    const out = qaCase.run();
    assert.equal(out.passed, true, `Failed ${qaCase.id}: ${out.detail}`);
  });
}

// 3. Execute the 1,000 Full-Match Bot Experience Campaign
test('[QA-Team-1000-Playthroughs] Run 1,000 full Werewolf matches from Night 1 to Game Over with 0 failures', () => {
  const campaign = run1000MatchExperienceCampaign();
  assert.equal(campaign.totalMatchesSimulated, 1000);
  assert.equal(campaign.failedMatches, 0);
  assert.equal(campaign.passedMatches, 1000);
  assert.ok(campaign.avgRounds >= 1 && campaign.avgRounds <= 20);
});

test('[i18n Agent] UI_TEXT and ROLES provide complete translations across all 5 languages (vi, en, fr, es, ja)', () => {
  const langs: Language[] = ['vi', 'en', 'fr', 'es', 'ja'];
  for (const l of langs) {
    const t = UI_TEXT[l];
    assert.ok(t, `Missing UI_TEXT for language: ${l}`);
    assert.ok(t.appTitle.length > 0);
    assert.ok(t.playOnlineBtn.length > 0);
    assert.ok(t.playGMBtn.length > 0);
    assert.ok(t.playAIPracticeBtn.length > 0);
    assert.equal(t.tourSteps.length, 5, `Expected 5 onboarding tour steps for ${l}`);
    for (const cnt of [6, 8, 10, 12] as const) {
      assert.ok(t.scales[cnt].label.length > 0);
      assert.ok(t.scales[cnt].summary.length > 0);
    }
    for (const roleDef of Object.values(ROLES)) {
      assert.ok(roleDef.name[l] && roleDef.name[l].length > 0, `Missing role name for ${roleDef.id} in ${l}`);
      assert.ok(roleDef.description[l] && roleDef.description[l].length > 0, `Missing role description for ${roleDef.id} in ${l}`);
      assert.ok(roleDef.instructions[l] && roleDef.instructions[l].length > 0, `Missing role instructions for ${roleDef.id} in ${l}`);
      assert.ok(roleDef.guideForNewbie[l] && roleDef.guideForNewbie[l].length > 0, `Missing role guideForNewbie for ${roleDef.id} in ${l}`);
    }
  }
  assert.notEqual(UI_TEXT.vi.playOnlineBtn, UI_TEXT.en.playOnlineBtn);
  assert.notEqual(UI_TEXT.vi.skipNightBtn, UI_TEXT.en.skipNightBtn);
});

test('[GM Logic & Custom Count Agent] Custom player counts (4..20) and Morning Death + Causal Logic Explanations', () => {
  for (const customCnt of [5, 7, 9, 11, 13, 15, 18, 20]) {
    const deck = generateBalancedRoster(customCnt);
    assert.equal(deck.length, customCnt, `Expected deck length ${customCnt}`);
    const wolves = deck.filter((r) => r === 'werewolf' || r === 'wolf_pup');
    assert.ok(wolves.length >= 1, `Expected at least 1 wolf for ${customCnt} players`);
  }

  const samplePlayers: Player[] = [
    { id: 'p1', name: 'Bảo An', avatar: '🐺', roleId: 'werewolf', isAlive: true },
    { id: 'p2', name: 'Tuấn Kiệt', avatar: '🛡️', roleId: 'bodyguard', isAlive: true },
    { id: 'p3', name: 'Minh Hoàng', avatar: '🧪', roleId: 'witch', isAlive: true },
    { id: 'p4', name: 'Thảo My', avatar: '💘', roleId: 'cupid', isAlive: true },
    { id: 'p5', name: 'Hữu Phước', avatar: '🧑‍🌾', roleId: 'villager', isAlive: true },
  ];

  const { result } = resolveNightActions(
    samplePlayers,
    {
      cupidLovers: ['p4', 'p5'],
      guardTargetId: 'p2',
      wolfTargetId: 'p4',
    },
    { roundNumber: 1 }
  );

  assert.equal(result.killedPlayerIds.length, 2);
  assert.ok(result.killedDetails && result.killedDetails.length === 2);
  assert.equal(result.killedDetails[0].name, 'Thảo My');
  assert.equal(result.killedDetails[1].name, 'Hữu Phước');
  assert.ok(result.logicExplanations && result.logicExplanations.length >= 3);
});

test('[Audio & Reaction Agent] Prop emotional reactions (angry vs happy_dance) and 13-role musical callouts', () => {
  const langs: Language[] = ['vi', 'en', 'fr', 'es', 'ja'];
  const props: PropType[] = ['tomato', 'egg', 'water', 'rose'];

  assert.equal(PROP_REACTION_META.tomato.emotion, 'angry');
  assert.equal(PROP_REACTION_META.egg.emotion, 'angry');
  assert.equal(PROP_REACTION_META.water.emotion, 'angry');
  assert.equal(PROP_REACTION_META.rose.emotion, 'happy_dance');

  for (const p of props) {
    for (const l of langs) {
      assert.ok(PROP_REACTION_META[p].badgeText[l].length > 0);
      assert.ok(PROP_REACTION_META[p].speechText[l].length > 0);
    }
  }

  for (const roleId of Object.keys(ROLES) as RoleId[]) {
    const callout = ROLE_CALLOUT_LINES[roleId];
    assert.ok(callout, `Missing ROLE_CALLOUT_LINES for ${roleId}`);
    assert.ok(callout.quote.length > 0);
    assert.ok(callout.sfxLabel.length > 0);
    assert.ok(callout.musicTitle.length > 0);
  }
});

test('[Auto-GM Agent] Sequential night call schedule, strict role wake rules, bot night actions, and smart bot day votes', () => {
  const roster: Player[] = [
    { id: 'u1', name: 'Người Chơi', avatar: '🔮', roleId: 'seer', isAlive: true },
    { id: 'b1', name: 'Bot Sói 1', avatar: '🐺', roleId: 'werewolf', isAlive: true, isBot: true },
    { id: 'b2', name: 'Bot Sói Con', avatar: '🐺', roleId: 'wolf_pup', isAlive: true, isBot: true },
    { id: 'b3', name: 'Bot Phù Thủy', avatar: '🧪', roleId: 'witch', isAlive: true, isBot: true },
    { id: 'b4', name: 'Bot Bảo Vệ', avatar: '🛡️', roleId: 'bodyguard', isAlive: true, isBot: true, protectedLastNight: true },
    { id: 'b5', name: 'Bot Cupid', avatar: '💘', roleId: 'cupid', isAlive: true, isBot: true },
    { id: 'b6', name: 'Bot Nhân Bản', avatar: '🎭', roleId: 'doppelganger', isAlive: true, isBot: true },
  ];

  const customCfg: CustomTimerConfig = {
    nightActionSec: 25,
    botStepSec: 4,
    dayDiscussSec: 60,
    dayVoteSec: 30,
    hunterShotSec: 18,
  };

  // Night 1 schedule follows canonical order: doppelganger -> cupid -> bodyguard -> werewolf -> witch -> seer
  const night1 = buildAutoGMNightSchedule(roster, 1, customCfg, 'u1');
  assert.deepEqual(
    night1.map((s) => s.key),
    ['doppelganger', 'cupid', 'bodyguard', 'werewolf', 'witch', 'seer']
  );

  // Verify custom timer config is respected: human turn gets nightActionSec (25s), bot steps get botStepSec (4s)
  const seerStep = night1.find((s) => s.key === 'seer');
  const wolfStep = night1.find((s) => s.key === 'werewolf');
  assert.ok(seerStep);
  assert.equal(seerStep.isHumanTurn, true);
  assert.equal(seerStep.humanDurationSec, 25);
  assert.ok(wolfStep);
  assert.equal(wolfStep.isHumanTurn, false);
  assert.equal(wolfStep.botDurationSec, 4);

  // Verify findHumanNightStepIndex and getHumanRoleWakeGuidance
  const humanIdx = findHumanNightStepIndex(night1, roster[0], 1);
  assert.equal(humanIdx, 5);
  const wakeGuidance = getHumanRoleWakeGuidance(roster[0], 1, 'vi');
  assert.equal(wakeGuidance.wakesTonight, true);
  assert.ok(wakeGuidance.headline.length > 0);

  // Passive role guidance (e.g. Villager)
  const villagerPlayer: Player = { id: 'v1', name: 'Dân Làng', avatar: '🧑‍🌾', roleId: 'villager', isAlive: true };
  const passiveGuidance = getHumanRoleWakeGuidance(villagerPlayer, 1, 'vi');
  assert.equal(passiveGuidance.wakesTonight, false);

  // Night 2 schedule omits doppelganger & cupid
  const night2 = buildAutoGMNightSchedule(roster, 2);
  assert.deepEqual(
    night2.map((s) => s.key),
    ['bodyguard', 'werewolf', 'witch', 'seer']
  );

  // Seer only opens eyes during 'seer' step, NOT during 'werewolf' or 'witch'
  assert.equal(isPlayerAwakeForNightStep(roster[0], 'werewolf', 1), false);
  assert.equal(isPlayerAwakeForNightStep(roster[0], 'seer', 1), true);
  assert.equal(isPlayerAwakeForNightStep(roster[1], 'werewolf', 1), true);
  assert.equal(isPlayerAwakeForNightStep(roster[2], 'werewolf', 1), true);
  assert.equal(isPlayerAwakeForNightStep(roster[5], 'cupid', 1), true);
  assert.equal(isPlayerAwakeForNightStep(roster[5], 'cupid', 2), false);

  // Bot Bodyguard never picks a player with protectedLastNight === true
  const guardAct = computeAutoGMBotNightStepAction('bodyguard', roster, {}, {
    round: 2,
    wolfPupFrenzy: false,
    humanPlayerId: 'u1',
  });
  assert.ok(guardAct.guardTargetId);
  assert.notEqual(guardAct.guardTargetId, 'b4');

  // Smart bot day votes: Werewolves never vote fellow Werewolves, and Villagers/Seer target known wolves
  const dayVotes = computeSmartBotDayVotes(roster, ['b1'], 'b1');
  const wolf1Vote = dayVotes.find((v) => v.voterId === 'b1');
  const wolf2Vote = dayVotes.find((v) => v.voterId === 'b2');
  assert.ok(wolf1Vote && wolf1Vote.targetId !== 'b1' && wolf1Vote.targetId !== 'b2');
  assert.ok(wolf2Vote && wolf2Vote.targetId !== 'b1' && wolf2Vote.targetId !== 'b2');

  const lines = buildBotDayDiscussionLines(roster, [], 'vi', {
    playerId: 'b1',
    roleId: 'werewolf',
    isWerewolf: true,
  });
  assert.ok(lines.length >= 1);
});

test('[All 13 Roles Wake Guidance] Verifies getHumanRoleWakeGuidance across all 13 roles on Night 1 and Night 2', () => {
  const wakingEveryNight: RoleId[] = ['werewolf', 'wolf_pup', 'witch', 'seer', 'bodyguard', 'hunter'];
  const wakingNight1Only: RoleId[] = ['cupid', 'doppelganger'];
  const passiveNightRoles: RoleId[] = ['villager', 'tanner', 'elder', 'cursed', 'traitor'];

  for (const r of wakingEveryNight) {
    const p: Player = { id: 'p', name: 'Tester', avatar: '🐺', roleId: r, isAlive: true };
    assert.equal(getHumanRoleWakeGuidance(p, 1, 'vi').wakesTonight, true, `${r} should wake Night 1`);
    assert.equal(getHumanRoleWakeGuidance(p, 2, 'vi').wakesTonight, true, `${r} should wake Night 2`);
  }

  for (const r of wakingNight1Only) {
    const p: Player = { id: 'p', name: 'Tester', avatar: '💘', roleId: r, isAlive: true };
    assert.equal(getHumanRoleWakeGuidance(p, 1, 'vi').wakesTonight, true, `${r} should wake Night 1`);
    assert.equal(getHumanRoleWakeGuidance(p, 2, 'vi').wakesTonight, false, `${r} should NOT wake Night 2`);
  }

  for (const r of passiveNightRoles) {
    const p: Player = { id: 'p', name: 'Tester', avatar: '🧑‍🌾', roleId: r, isAlive: true };
    assert.equal(getHumanRoleWakeGuidance(p, 1, 'vi').wakesTonight, false, `${r} should be passive Night 1`);
    assert.equal(getHumanRoleWakeGuidance(p, 2, 'vi').wakesTonight, false, `${r} should be passive Night 2`);
  }
});

test('[Human Turn Protection] prepareNightStartForHuman, shouldAutoAdvanceOnTimerZero, and true balanced random role selection', () => {
  const oldFiveRoleLock = new Set<RoleId>(['werewolf', 'wolf_pup', 'seer', 'witch', 'bodyguard']);
  const seenRandomRoles12 = new Set<RoleId>();
  for (const count of [6, 8, 10, 12]) {
    for (let i = 0; i < 40; i++) {
      const base = generateBalancedRoster(count);
      const deck = assignPreferredRoleToDeck(base, 'random');
      assert.equal(deck.length, count);
      assert.deepEqual([...deck].sort(), [...base].sort(), 'random selection must preserve exact roster multiset');
      if (count === 12) seenRandomRoles12.add(deck[0]);
    }
  }
  const nonFiveRolesSeen = Array.from(seenRandomRoles12).filter((r) => !oldFiveRoleLock.has(r));
  assert.ok(
    nonFiveRolesSeen.length >= 3,
    `Expected random selection on 12p roster to deal roles outside the old 5-role set, got ${Array.from(seenRandomRoles12).join(', ')}`
  );

  // Verify prepareNightStartForHuman starts Night 1 directly at the human player's step and pre-simulates preceding bot steps
  const players: Player[] = [
    { id: 'u1', name: 'Human Seer', avatar: '🔮', roleId: 'seer', isAlive: true },
    { id: 'b1', name: 'Bot Cupid', avatar: '💘', roleId: 'cupid', isAlive: true, isBot: true },
    { id: 'b2', name: 'Bot Wolf', avatar: '🐺', roleId: 'werewolf', isAlive: true, isBot: true },
    { id: 'b3', name: 'Bot Witch', avatar: '🧪', roleId: 'witch', isAlive: true, isBot: true },
    { id: 'b4', name: 'Bot Guard', avatar: '🛡️', roleId: 'bodyguard', isAlive: true, isBot: true },
  ];

  const prepared = prepareNightStartForHuman(players, 1, DEFAULT_TIMER_CONFIG, 'u1');
  // Schedule: cupid (0), bodyguard (1), werewolf (2), witch (3), seer (4)
  assert.equal(prepared.initialStepIndex, 4);
  assert.equal(prepared.schedule[prepared.initialStepIndex].key, 'seer');
  assert.equal(prepared.schedule[prepared.initialStepIndex].isHumanTurn, true);
  assert.ok(prepared.preSimulatedActions.wolfTargetId, 'Bot werewolf should have selected a victim before human Seer wakes');
  assert.ok(prepared.preSimulatedActions.cupidLovers, 'Bot cupid should have linked lovers before human Seer wakes');

  // Verify shouldAutoAdvanceOnTimerZero NEVER auto-skips human night turn,
  // while day_voting at 0s MUST auto-advance with abstain so timer never freezes (BUG-15)
  assert.equal(
    shouldAutoAdvanceOnTimerZero({
      shellState: 'playing',
      phase: 'night',
      showOnboardingTour: false,
      isPlayerAwakeAtNight: true,
      isHumanAlive: true,
      hasHumanVoted: false,
    }),
    false,
    'Must NEVER auto-advance when human player is awake on their night turn'
  );

  assert.equal(
    shouldAutoAdvanceOnTimerZero({
      shellState: 'playing',
      phase: 'day_voting',
      showOnboardingTour: false,
      isPlayerAwakeAtNight: false,
      isHumanAlive: true,
      hasHumanVoted: false,
    }),
    true,
    'Day voting MUST auto-advance at 0s with abstain instead of hanging forever (BUG-15)'
  );
});

test('[Deck Fairness & Dialogue] fisherYatesShuffle preserves multiset without mutating input and Day 1 bots use natural dialogue', () => {
  const input = [1, 2, 3, 4, 5, 6, 7, 8];
  const snapshot = [...input];
  const seenOrders = new Set<string>();

  for (let i = 0; i < 40; i++) {
    const out = fisherYatesShuffle(input);
    assert.deepEqual(input, snapshot, 'fisherYatesShuffle must not mutate original array');
    assert.equal(out.length, input.length);
    assert.deepEqual([...out].sort((a, b) => a - b), snapshot);
    seenOrders.add(out.join(','));
  }
  assert.ok(seenOrders.size > 10, `expected varied permutations, got ${seenOrders.size}`);

  const players: Player[] = [
    { id: 'u1', name: 'Bạn', avatar: '🔮', roleId: 'seer', isAlive: true },
    { id: 'b1', name: 'Minh Khôi', avatar: '🛡️', roleId: 'bodyguard', isAlive: true, isBot: true },
    { id: 'b2', name: 'Thảo Vy', avatar: '🐺', roleId: 'werewolf', isAlive: true, isBot: true },
    { id: 'b3', name: 'Gia Bảo', avatar: '🧑‍🌾', roleId: 'villager', isAlive: true, isBot: true },
  ];

  const seenDay1Texts = new Set<string>();
  const seenDay2Texts = new Set<string>();
  for (let i = 0; i < 30; i++) {
    const day1Lines = buildBotDayDiscussionLines(players, [], 'vi', null, 1);
    assert.ok(day1Lines.length >= 2);
    for (const line of day1Lines) {
      assert.equal(
        line.text.includes('hơi im lặng từ đầu ván'),
        false,
        `Day 1 dialogue must not falsely accuse silence: ${line.text}`
      );
      seenDay1Texts.add(line.text);
    }
    const day2Lines = buildBotDayDiscussionLines(players, ['Gia Bảo'], 'vi', null, 2);
    assert.ok(day2Lines.length >= 2);
    for (const line of day2Lines) {
      seenDay2Texts.add(line.text);
    }
  }
  assert.ok(seenDay1Texts.size >= 5, `Expected varied Day 1 dialogue pool, got ${seenDay1Texts.size}`);
  assert.ok(seenDay2Texts.size >= 5, `Expected varied Day 2+ dialogue pool, got ${seenDay2Texts.size}`);
});

test('[Authentic AI GM Announcements] Dawn/Dusk briefings announce casualties clearly without leaking secret night roles/causes', () => {
  const beforePlayers: Player[] = [
    { id: 'u1', name: 'Người Chơi', avatar: '🌓', roleId: 'cursed', isAlive: true },
    { id: 'b1', name: 'Đức Huy', avatar: '🐺', roleId: 'werewolf', isAlive: true, isBot: true },
    { id: 'b2', name: 'Thảo My', avatar: '🛡️', roleId: 'bodyguard', isAlive: true, isBot: true },
    { id: 'b3', name: 'Minh Hoàng', avatar: '🧪', roleId: 'witch', isAlive: true, isBot: true },
    { id: 'b4', name: 'Bảo Châu', avatar: '🔮', roleId: 'seer', isAlive: true, isBot: true },
    { id: 'b5', name: 'Tuấn Kiệt', avatar: '🧑‍🌾', roleId: 'villager', isAlive: true, isBot: true },
  ];

  // Case 1: Peaceful night (0 deaths — Cursed turned Werewolf privately) -> public text MUST NOT leak Cursed/Bodyguard/Witch/Seer!
  const afterPeaceful: Player[] = beforePlayers.map((p) =>
    p.id === 'u1' ? { ...p, roleId: 'werewolf' } : { ...p }
  );
  const peacefulDawn = buildDawnGMAnnouncement({
    round: 1,
    beforePlayers,
    afterPlayers: afterPeaceful,
    nightKilledIds: [],
    humanPlayerId: 'u1',
    lang: 'vi',
  });
  assert.equal(peacefulDawn.victims.length, 0);
  assert.ok(peacefulDawn.headline.includes('bình yên'));
  assert.ok(peacefulDawn.spokenNarration.includes('không có ai thiệt mạng'));
  assert.equal(peacefulDawn.chatMessageText.includes('Bảo Vệ'), false, 'Must not leak Bodyguard');
  assert.equal(peacefulDawn.chatMessageText.includes('Phù Thủy'), false, 'Must not leak Witch');
  assert.equal(peacefulDawn.chatMessageText.includes('Tiên Tri'), false, 'Must not leak Seer');
  assert.equal(peacefulDawn.chatMessageText.includes('Bán Sói'), false, 'Must not leak Cursed publicly');
  assert.ok(
    peacefulDawn.privateNotice && peacefulDawn.privateNotice.includes('Bán Sói'),
    'Human Cursed player should privately receive awakening tap from GM'
  );

  // Case 2: 1 night victim -> clearly announces victim name & seat number without leaking cause (wolf vs poison)
  const afterOneDeath: Player[] = beforePlayers.map((p) =>
    p.id === 'b5' ? { ...p, isAlive: false } : { ...p }
  );
  const singleDeathDawn = buildDawnGMAnnouncement({
    round: 2,
    beforePlayers,
    afterPlayers: afterOneDeath,
    nightKilledIds: ['b5'],
    humanPlayerId: 'u1',
    lang: 'vi',
  });
  assert.equal(singleDeathDawn.victims.length, 1);
  assert.equal(singleDeathDawn.victims[0].name, 'Tuấn Kiệt');
  assert.equal(singleDeathDawn.victims[0].seatNumber, 6);
  assert.ok(singleDeathDawn.headline.includes('Tuấn Kiệt'));
  assert.ok(singleDeathDawn.chatMessageText.includes('Tuấn Kiệt'));
  assert.equal(singleDeathDawn.chatMessageText.includes('Bình Độc'), false, 'Must not leak poison cause');
  assert.equal(singleDeathDawn.chatMessageText.includes('Tiên Tri'), false, 'Must not leak Seer');

  // Case 3: Multi-death + Bot Hunter dying shot at dawn MUST NOT leak Hunter role or shot cause!
  const afterMultiDeath: Player[] = beforePlayers.map((p) =>
    p.id === 'b3' || p.id === 'b5' ? { ...p, isAlive: false } : { ...p }
  );
  const multiDawn = buildDawnGMAnnouncement({
    round: 2,
    beforePlayers,
    afterPlayers: afterMultiDeath,
    nightKilledIds: ['b3'],
    hunterShots: [{ hunterId: 'b3', targetId: 'b5' }],
    humanPlayerId: 'u1',
    lang: 'vi',
  });
  assert.equal(multiDawn.victims.length, 2);
  assert.deepEqual(
    multiDawn.victims.map((v) => v.name),
    ['Minh Hoàng', 'Tuấn Kiệt'],
    'Victims must be sorted neutrally by seat number'
  );
  assert.equal(multiDawn.publicEvents.length, 0, 'Dawn publicEvents must NOT leak Hunter revenge shot');
  const fullDawnText = [
    multiDawn.headline,
    multiDawn.gmQuote,
    multiDawn.spokenNarration,
    multiDawn.chatMessageText,
    multiDawn.dayBarSummary,
    ...multiDawn.victims.map((v) => v.tag),
  ].join(' ');
  assert.equal(fullDawnText.includes('Thợ Săn'), false, 'Dawn announcement must NOT mention Thợ Săn');
  assert.equal(fullDawnText.includes('bắn'), false, 'Dawn announcement must NOT mention shot/bắn');
  assert.equal(fullDawnText.includes('kéo theo'), false, 'Dawn announcement must NOT mention kéo theo');

  // Case 4: Private human notices for Cupid Lover link & Ghost Soul death
  const afterLoverLinked: Player[] = beforePlayers.map((p) =>
    p.id === 'u1' ? { ...p, loverId: 'b4' } : p.id === 'b4' ? { ...p, loverId: 'u1' } : { ...p }
  );
  const loverNotice = buildPrivateHumanNightNotice({
    beforePlayers,
    afterPlayers: afterLoverLinked,
    humanPlayerId: 'u1',
    round: 1,
    lang: 'vi',
  });
  assert.ok(loverNotice && loverNotice.includes('Bảo Châu'));

  // Case 5: Dusk Verdict (Tie & Execution with vote tally and Elder penalty)
  const duskTie = buildDuskGMAnnouncement({
    round: 1,
    beforePlayers,
    afterPlayers: beforePlayers,
    lynchedVictim: null,
    voteCounts: { b1: 2, b5: 2 },
    isTie: true,
    humanPlayerId: 'u1',
    lang: 'vi',
  });
  assert.equal(duskTie.victims.length, 0);
  assert.ok(duskTie.headline.includes('Hòa phiếu'));
  assert.equal(duskTie.voteBreakdown?.length, 2);

  const duskLynch = buildDuskGMAnnouncement({
    round: 1,
    beforePlayers,
    afterPlayers: afterOneDeath,
    lynchedVictim: beforePlayers[5],
    voteCounts: { b5: 4, b1: 1 },
    isTie: false,
    elderLynchedPenalty: true,
    humanPlayerId: 'u1',
    lang: 'vi',
  });
  assert.equal(duskLynch.victims.length, 1);
  assert.ok(duskLynch.headline.includes('Tuấn Kiệt') && duskLynch.headline.includes('4 phiếu'));
  assert.ok(duskLynch.publicEvents.some((e) => e.includes('Già Làng')));

  // Case 6: Multi-language Dawn announcements across all 5 languages
  for (const lang of ['vi', 'en', 'fr', 'es', 'ja'] as Language[]) {
    const ann = buildDawnGMAnnouncement({
      round: 1,
      beforePlayers,
      afterPlayers: afterOneDeath,
      nightKilledIds: ['b5'],
      humanPlayerId: 'u1',
      lang,
    });
    assert.ok(ann.badge.length > 0 && ann.headline.length > 0 && ann.spokenNarration.length > 0);
  }

  // Case 7: Timer auto-advance MUST pause while GM Announcement overlay is open
  assert.equal(
    shouldAutoAdvanceOnTimerZero({
      shellState: 'playing',
      phase: 'day_discussion',
      showOnboardingTour: false,
      isPlayerAwakeAtNight: false,
      isHumanAlive: true,
      hasHumanVoted: false,
      hasActiveGMAnnouncement: true,
    }),
    false,
    'Must pause auto-advance while GM announcement modal is open'
  );
});

test('[Zero-Leak Cupid & Death Cause Hiding] Night and Dusk announcements never leak Cupid/Lover or secret causes of death', () => {
  const beforePlayers: Player[] = [
    { id: 'u1', name: 'Người Chơi', avatar: '🔮', roleId: 'seer', isAlive: true },
    { id: 'b1', name: 'Đức Huy', avatar: '🐺', roleId: 'werewolf', isAlive: true, isBot: true },
    { id: 'b2', name: 'Thảo My', avatar: '🎯', roleId: 'hunter', isAlive: true, isBot: true },
    { id: 'b3', name: 'Minh Hoàng', avatar: '💘', roleId: 'villager', isAlive: true, isBot: true, loverId: 'b5' },
    { id: 'b4', name: 'Bảo Châu', avatar: '🧪', roleId: 'witch', isAlive: true, isBot: true },
    { id: 'b5', name: 'Tuấn Kiệt', avatar: '🧑‍🌾', roleId: 'villager', isAlive: true, isBot: true, loverId: 'b3' },
  ];

  // Night: Cupid lovers b5 & b3 both die (b5 bitten, b3 lover suicide) + Hunter b2 shoots b5 triggering lover b3
  const afterDawn: Player[] = beforePlayers.map((p) =>
    p.id === 'b2' || p.id === 'b3' || p.id === 'b5' ? { ...p, isAlive: false } : { ...p }
  );
  const dawnAnn = buildDawnGMAnnouncement({
    round: 1,
    beforePlayers,
    afterPlayers: afterDawn,
    nightKilledIds: ['b2'],
    hunterShots: [{ hunterId: 'b2', targetId: 'b5' }],
    humanPlayerId: 'u1',
    lang: 'vi',
  });

  const combinedDawnPublic = [
    dawnAnn.headline,
    dawnAnn.gmQuote,
    dawnAnn.spokenNarration,
    dawnAnn.chatMessageText,
    dawnAnn.dayBarSummary,
    ...dawnAnn.publicEvents,
    ...dawnAnn.victims.map((v) => v.tag || ''),
  ].join(' ');

  for (const forbidden of ['Cupid', 'Tình Nhân', 'Tình nhân', 'Quyên sinh', 'Nỗi đau', '💔', 'Bình Độc', 'Ma Sói cắn']) {
    assert.equal(
      combinedDawnPublic.includes(forbidden),
      false,
      `Dawn announcement leaked hidden cause "${forbidden}": ${combinedDawnPublic}`
    );
  }
  // Victims are sorted by seatNumber (3, 4, 6) so order never leaks primary vs secondary
  assert.deepEqual(
    dawnAnn.victims.map((v) => v.seatNumber),
    [3, 4, 6]
  );

  // Dusk: Lynching b5 also kills lover b3 — public announcement MUST NOT say "Tình Nhân" or "Quyên sinh"
  const afterDusk: Player[] = beforePlayers.map((p) =>
    p.id === 'b3' || p.id === 'b5' ? { ...p, isAlive: false } : { ...p }
  );
  const votes = [
    { voterId: 'u1', targetId: 'b5' },
    { voterId: 'b1', targetId: 'b5' },
    { voterId: 'b2', targetId: 'b5' },
    { voterId: 'b4', targetId: 'b1' },
  ];
  const duskAnn = buildDuskGMAnnouncement({
    round: 1,
    beforePlayers,
    afterPlayers: afterDusk,
    lynchedVictim: beforePlayers[5],
    voteCounts: tallyVotes(votes).counts,
    votes,
    isTie: false,
    humanPlayerId: 'u1',
    lang: 'vi',
  });

  const combinedDuskPublic = [
    duskAnn.headline,
    duskAnn.gmQuote,
    duskAnn.spokenNarration,
    duskAnn.chatMessageText,
    ...duskAnn.publicEvents,
    ...duskAnn.victims.map((v) => v.tag || ''),
  ].join(' ');

  for (const forbidden of ['Cupid', 'Tình Nhân', 'Tình nhân', 'Quyên sinh', '💔', 'heartbreak']) {
    assert.equal(
      combinedDuskPublic.includes(forbidden),
      false,
      `Dusk announcement leaked Cupid cause "${forbidden}": ${combinedDuskPublic}`
    );
  }

  // Dusk vote breakdown MUST include who voted for whom
  const b5Entry = duskAnn.voteBreakdown?.find((e) => e.playerId === 'b5');
  assert.ok(b5Entry, 'Expected b5 in voteBreakdown');
  assert.equal(b5Entry.votes, 3);
  assert.deepEqual(
    b5Entry.voters?.map((v) => v.id),
    ['u1', 'b1', 'b2']
  );
  assert.ok(duskAnn.chatMessageText.includes('Người Chơi'), 'Dusk chat log must list voter names');
});

test('[Day Voting Integrity] castSingleDayVote prevents multi-voting and buildVoteTallyEntries tracks exact voters', () => {
  const players: Player[] = [
    { id: 'u1', name: 'Thợ Săn Đêm', avatar: '🐺', roleId: 'seer', isAlive: true },
    { id: 'b1', name: 'Đức Huy', avatar: '🦊', roleId: 'werewolf', isAlive: true, isBot: true },
    { id: 'b2', name: 'Thảo My', avatar: '🦉', roleId: 'villager', isAlive: true, isBot: true },
    { id: 'b3', name: 'Minh Hoàng', avatar: '🐻', roleId: 'villager', isAlive: true, isBot: true },
  ];

  // Start with bot votes
  let votes = [
    { voterId: 'b1', targetId: 'b2' },
    { voterId: 'b2', targetId: 'b1' },
    { voterId: 'b3', targetId: 'b1' },
  ];

  // Human votes for b1
  votes = castSingleDayVote(votes, 'u1', 'b1');
  assert.equal(votes.filter((v) => v.voterId === 'u1').length, 1);
  assert.equal(votes.find((v) => v.voterId === 'u1')?.targetId, 'b1');

  // Switching human vote to b2 MUST NOT leave a vote on b1
  votes = castSingleDayVote(votes, 'u1', 'b2');
  assert.equal(votes.filter((v) => v.voterId === 'u1').length, 1);
  assert.equal(votes.find((v) => v.voterId === 'u1')?.targetId, 'b2');

  // Clearing human vote leaves 0 votes from u1
  votes = castSingleDayVote(votes, 'u1', null);
  assert.equal(votes.filter((v) => v.voterId === 'u1').length, 0);

  // Even if duplicate voter records were somehow injected, tallyVotes and buildVoteTallyEntries deduplicate per voter
  const corruptedVotes = [
    { voterId: 'u1', targetId: 'b1' },
    { voterId: 'u1', targetId: 'b2' },
    { voterId: 'b1', targetId: 'b2' },
    { voterId: 'b3', targetId: 'b1' },
  ];
  const tally = tallyVotes(corruptedVotes);
  assert.equal(tally.counts['b2'], 2);
  assert.equal(tally.counts['b1'], 1);
  assert.equal(tally.targetId, 'b2');

  const entries = buildVoteTallyEntries(players, corruptedVotes);
  assert.equal(entries.length, 2);
  assert.equal(entries[0].playerId, 'b2');
  assert.equal(entries[0].votes, 2);
  assert.deepEqual(
    entries[0].voters.map((v) => v.name),
    ['Thợ Săn Đêm', 'Đức Huy']
  );
  assert.equal(entries[1].playerId, 'b1');
  assert.equal(entries[1].votes, 1);
  assert.deepEqual(
    entries[1].voters.map((v) => v.name),
    ['Minh Hoàng']
  );
});

test('[Zero-Leak Night Kill Short Film & Dawn Hunter] End-of-night cinematic activates ONLY on confirmed death & Dawn never leaks Hunter', () => {
  const baseRoster: Player[] = [
    { id: 'u_wolf', name: 'Sói Đầu Đàn', avatar: '🐺', roleId: 'werewolf', isAlive: true, isHost: true },
    { id: 'b_guard', name: 'Đức Huy', avatar: '🛡️', roleId: 'bodyguard', isAlive: true, isBot: true },
    { id: 'b_witch', name: 'Thảo My', avatar: '🧪', roleId: 'witch', isAlive: true, isBot: true },
    { id: 'b_elder', name: 'Minh Hoàng', avatar: '👴', roleId: 'elder', isAlive: true, isBot: true, elderLives: 2 },
    { id: 'b_cursed', name: 'Bảo Châu', avatar: '🌗', roleId: 'cursed', isAlive: true, isBot: true },
    { id: 'b_vil', name: 'Tuấn Kiệt', avatar: '🧑‍🌾', roleId: 'villager', isAlive: true, isBot: true },
  ];

  // 1. Wolf target SAVED by Bodyguard -> NO kill short film (must return null!)
  const guarded = resolveNightActions(baseRoster, {
    wolfTargetId: 'b_vil',
    guardTargetId: 'b_vil',
  });
  const guardedCinematic = determineEndOfNightCinematic({
    beforeHuman: baseRoster[0],
    afterPlayers: guarded.updatedPlayers,
    nightResult: guarded.result,
    lang: 'vi',
  });
  assert.equal(guardedCinematic, null, 'Must NOT trigger kill film when target was saved by Bodyguard');

  // 2. Wolf target HEALED by Witch -> NO kill short film
  const healed = resolveNightActions(baseRoster, {
    wolfTargetId: 'b_vil',
    witchHealTargetId: 'b_vil',
  });
  const healedCinematic = determineEndOfNightCinematic({
    beforeHuman: baseRoster[0],
    afterPlayers: healed.updatedPlayers,
    nightResult: healed.result,
    lang: 'vi',
  });
  assert.equal(healedCinematic, null, 'Must NOT trigger kill film when target was healed by Witch');

  // 3. Wolf bites Elder on 1st life -> Elder survives -> NO kill short film
  const elderSurvive = resolveNightActions(baseRoster, {
    wolfTargetId: 'b_elder',
  });
  const elderCinematic = determineEndOfNightCinematic({
    beforeHuman: baseRoster[0],
    afterPlayers: elderSurvive.updatedPlayers,
    nightResult: elderSurvive.result,
    lang: 'vi',
  });
  assert.equal(elderCinematic, null, 'Must NOT trigger kill film when Elder survives first bite');

  // 4. Wolf bites Cursed -> Cursed converts instead of dying -> NO kill short film
  const cursedConvert = resolveNightActions(baseRoster, {
    wolfTargetId: 'b_cursed',
  });
  const cursedCinematic = determineEndOfNightCinematic({
    beforeHuman: baseRoster[0],
    afterPlayers: cursedConvert.updatedPlayers,
    nightResult: cursedConvert.result,
    lang: 'vi',
  });
  assert.equal(cursedCinematic, null, 'Must NOT trigger kill film when Cursed converts instead of dying');

  // 5. Wolf target ACTUALLY DIES at end of night -> Wolf viewer gets wolf_kill short film
  const confirmedKill = resolveNightActions(baseRoster, {
    wolfTargetId: 'b_vil',
  });
  const wolfCinematic = determineEndOfNightCinematic({
    beforeHuman: baseRoster[0],
    afterPlayers: confirmedKill.updatedPlayers,
    nightResult: confirmedKill.result,
    lang: 'vi',
  });
  assert.ok(wolfCinematic !== null, 'Confirmed wolf kill must trigger end-of-night short film for wolf player');
  assert.equal(wolfCinematic?.mode, 'wolf_kill');
  assert.equal(wolfCinematic?.victimId, 'b_vil');
  assert.equal(wolfCinematic?.revealKiller, true);

  // 6. Living non-wolf Villager viewer when a bot dies -> MUST return null (zero leak of wolf kill!)
  const villagerViewerCinematic = determineEndOfNightCinematic({
    beforeHuman: baseRoster[1], // living Bodyguard
    afterPlayers: confirmedKill.updatedPlayers,
    nightResult: confirmedKill.result,
    lang: 'vi',
  });
  assert.equal(villagerViewerCinematic, null, 'Living non-wolf players must NEVER see wolf kill short film');

  // 7. Human player ACTUALLY DIES at night -> Now a Ghost (Chat/Mic locked), so reveal exact cause & killer!
  // 7a. Human killed by Werewolf
  const victimWolfCinematic = determineEndOfNightCinematic({
    beforeHuman: baseRoster[5], // b_vil died to wolf
    beforePlayers: baseRoster,
    afterPlayers: confirmedKill.updatedPlayers,
    nightResult: confirmedKill.result,
    lang: 'vi',
  });
  assert.ok(victimWolfCinematic !== null);
  assert.equal(victimWolfCinematic?.mode, 'victim_death');
  assert.equal(victimWolfCinematic?.revealKiller, true);
  assert.equal(victimWolfCinematic?.causeType, 'werewolf');
  assert.equal(victimWolfCinematic?.killerId, 'u_wolf');
  assert.equal(victimWolfCinematic?.killerName, 'Sói Đầu Đàn');
  assert.ok(victimWolfCinematic?.reasonText.includes('Sói Đầu Đàn'));

  // 7b. Human Werewolf goes hunting & gets poisoned by Witch -> Immediately learns Witch poisoned them!
  const wolfPoisoned = resolveNightActions(baseRoster, {
    wolfTargetId: 'b_vil',
    witchPoisonTargetId: 'u_wolf',
  });
  const poisonedWolfCinematic = determineEndOfNightCinematic({
    beforeHuman: baseRoster[0], // u_wolf died to Witch poison
    beforePlayers: baseRoster,
    afterPlayers: wolfPoisoned.updatedPlayers,
    nightResult: wolfPoisoned.result,
    lang: 'vi',
  });
  assert.ok(poisonedWolfCinematic !== null);
  assert.equal(poisonedWolfCinematic?.mode, 'victim_death');
  assert.equal(poisonedWolfCinematic?.revealKiller, true);
  assert.equal(poisonedWolfCinematic?.causeType, 'witch_poison');
  assert.equal(poisonedWolfCinematic?.killerId, 'b_witch');
  assert.equal(poisonedWolfCinematic?.killerName, 'Thảo My');
  assert.equal(poisonedWolfCinematic?.killerRoleId, 'witch');
  assert.ok(poisonedWolfCinematic?.reasonText.includes('Phù Thủy') && poisonedWolfCinematic?.reasonText.includes('Thảo My'));

  // 7c. Human Werewolf kills Hunter & gets shot by Hunter's dying revenge shot -> Immediately learns Hunter shot them!
  const rosterWithHunter: Player[] = baseRoster.map((p) =>
    p.id === 'b_vil' ? { ...p, roleId: 'hunter' } : { ...p }
  );
  const wolfBitesHunter = resolveNightActions(rosterWithHunter, {
    wolfTargetId: 'b_vil',
    hunterTargetId: 'u_wolf',
  });
  const afterHunterRevenge = wolfBitesHunter.updatedPlayers.map((p) =>
    p.id === 'u_wolf' ? { ...p, isAlive: false } : { ...p }
  );
  const shotWolfCinematic = determineEndOfNightCinematic({
    beforeHuman: rosterWithHunter[0],
    beforePlayers: rosterWithHunter,
    afterPlayers: afterHunterRevenge,
    nightResult: wolfBitesHunter.result,
    lang: 'vi',
  });
  assert.ok(shotWolfCinematic !== null);
  assert.equal(shotWolfCinematic?.mode, 'victim_death');
  assert.equal(shotWolfCinematic?.revealKiller, true);
  assert.equal(shotWolfCinematic?.causeType, 'hunter_shot');
  assert.equal(shotWolfCinematic?.killerId, 'b_vil');
  assert.equal(shotWolfCinematic?.killerName, 'Tuấn Kiệt');
  assert.equal(shotWolfCinematic?.killerRoleId, 'hunter');
  assert.ok(shotWolfCinematic?.reasonText.includes('Thợ Săn') && shotWolfCinematic?.reasonText.includes('Tuấn Kiệt'));

  // 8. Dawn announcement with Hunter night revenge shot leaks ZERO Hunter info across all 5 languages
  const afterHunterDawn: Player[] = baseRoster.map((p) =>
    p.id === 'b_guard' || p.id === 'b_vil' ? { ...p, isAlive: false } : { ...p }
  );
  const forbiddenTerms = ['Thợ Săn', 'Hunter', 'Chasseur', 'Cazador', 'ハンター', 'kéo theo', 'shot', 'bắn'];
  for (const lang of ['vi', 'en', 'fr', 'es', 'ja'] as Language[]) {
    const ann = buildDawnGMAnnouncement({
      round: 2,
      beforePlayers: baseRoster,
      afterPlayers: afterHunterDawn,
      nightKilledIds: ['b_guard'],
      hunterShots: [{ hunterId: 'b_guard', targetId: 'b_vil' }],
      humanPlayerId: 'u_wolf',
      lang,
    });
    assert.equal(ann.victims.length, 2);
    assert.equal(ann.publicEvents.length, 0);
    const combined = [
      ann.headline,
      ann.gmQuote,
      ann.spokenNarration,
      ann.chatMessageText,
      ann.dayBarSummary,
      ...ann.victims.map((v) => v.tag),
    ].join(' ');
    for (const term of forbiddenTerms) {
      assert.equal(
        combined.includes(term),
        false,
        `Dawn Hunter announcement in ${lang} leaked forbidden term "${term}": ${combined}`
      );
    }
  }
});

test('[QA Regression] BUG-02: migrateAgrouAvatarPayload auto-repairs corrupt and legacy configs', () => {
  const repairedNull = migrateAgrouAvatarPayload(null);
  assert.equal(repairedNull.hat, 'witch');
  assert.equal(repairedNull.mapBiome, 'forest');

  const repairedCorrupt = migrateAgrouAvatarPayload({
    hat: 'invalid_hat_xyz',
    cloakColor: 'not-a-hex-color',
    mapBiome: 'lava_world',
  });
  assert.equal(repairedCorrupt.hat, 'witch');
  assert.equal(repairedCorrupt.mapBiome, 'forest');
  assert.equal(typeof repairedCorrupt.cloakColor, 'number');

  const paletteHex = AGROU_CLOAK_COLORS[1].hex;
  const valid = migrateAgrouAvatarPayload({
    version: 2,
    hat: 'crown',
    cloakColor: paletteHex,
    mapBiome: 'frostpeak',
  });
  assert.equal(valid.hat, 'crown');
  assert.equal(valid.cloakColor, paletteHex);
  assert.equal(valid.mapBiome, 'frostpeak');
});

test('[QA Regression] BUG-08: Chained Hunter cascade and pendingDeathCascade win guard', () => {
  const players: Player[] = [
    { id: 'w1', name: 'Sói 1', avatar: '🐺', roleId: 'werewolf', isAlive: true },
    { id: 'h1', name: 'Thợ Săn 1', avatar: '🎯', roleId: 'hunter', isAlive: false },
    { id: 'h2', name: 'Thợ Săn 2', avatar: '🎯', roleId: 'hunter', isAlive: true },
    { id: 'v1', name: 'Dân 1', avatar: '🧑‍🌾', roleId: 'villager', isAlive: true },
  ];

  // Must NOT end early while a Hunter death cascade is pending
  const guarded = checkWinCondition(
    [
      { id: 'w1', name: 'Sói 1', avatar: '🐺', roleId: 'werewolf', isAlive: true },
      { id: 'h1', name: 'Thợ Săn 1', avatar: '🎯', roleId: 'hunter', isAlive: false },
      { id: 'v1', name: 'Dân 1', avatar: '🧑‍🌾', roleId: 'villager', isAlive: true },
    ],
    undefined,
    { hasPendingDeathCascade: true }
  );
  assert.equal(guarded.isOver, false);

  // Night-Aim: a lynched Hunter's mark on another Hunter chains into that Hunter's own mark
  const chained = applyDayLynch(
    players.map((p) =>
      p.id === 'h1'
        ? { ...p, isAlive: true, hunterMarkId: 'h2' }
        : p.id === 'h2'
        ? { ...p, hunterMarkId: 'v1' }
        : p
    ),
    'h1'
  );
  assert.deepEqual(
    chained.hunterShots,
    [
      { hunterId: 'h1', targetId: 'h2' },
      { hunterId: 'h2', targetId: 'v1' },
    ]
  );
  assert.equal(chained.updatedPlayers.find((p) => p.id === 'h2')?.isAlive, false);
  assert.equal(chained.updatedPlayers.find((p) => p.id === 'v1')?.isAlive, false);
});

test('[QA Regression] BUG-10: computeFactionAliveCounts separates Wolves, Villagers, and Third-Party (Tanner/Traitor)', () => {
  const mixedPlayers: Player[] = [
    { id: 'w1', name: 'Sói', avatar: '🐺', roleId: 'werewolf', isAlive: true },
    { id: 't1', name: 'Kẻ Chán Đời', avatar: '🎭', roleId: 'tanner', isAlive: true },
    { id: 'tr1', name: 'Kẻ Phản Bội', avatar: '🗡️', roleId: 'traitor', isAlive: true },
    { id: 'v1', name: 'Dân 1', avatar: '🧑‍🌾', roleId: 'villager', isAlive: true },
    { id: 'v2', name: 'Dân 2', avatar: '🔮', roleId: 'seer', isAlive: true },
    { id: 'v3', name: 'Dân 3', avatar: '🛡️', roleId: 'bodyguard', isAlive: false },
  ];
  const counts = computeFactionAliveCounts(mixedPlayers);
  assert.equal(counts.wolves, 1);
  assert.equal(counts.villagers, 2);
  assert.equal(counts.thirdParty, 2);
  assert.equal(counts.hasThirdPartyInMatch, true);
});

test('[QA Regression] BUG-14: Bot day votes stay consistent with chat accusations', () => {
  const players: Player[] = [
    { id: 'u1', name: 'Bạn', avatar: '🧑‍🌾', roleId: 'villager', isAlive: true },
    { id: 'b1', name: 'Đức Huy', avatar: '🐺', roleId: 'werewolf', isAlive: true, isBot: true },
    { id: 'b2', name: 'Thảo My', avatar: '🧑‍🌾', roleId: 'villager', isAlive: true, isBot: true },
    { id: 'b3', name: 'Minh Hoàng', avatar: '🔮', roleId: 'seer', isAlive: true, isBot: true },
    { id: 'b4', name: 'Tuấn Kiệt', avatar: '🛡️', roleId: 'bodyguard', isAlive: true, isBot: true },
  ];
  const messages: ChatMessage[] = [
    {
      id: 'm1',
      senderId: 'b2',
      senderName: 'Thảo My',
      text: 'Mình nghi Đức Huy là Sói, mọi người cân nhắc vote Đức Huy nhé!',
      timestamp: Date.now(),
    },
  ];
  const signals = extractChatVoteSignals(messages, players);
  assert.deepEqual(signals.suspectsByVoter.b2, ['b1']);

  const votes = computeSmartBotDayVotes(players, [], null, signals);
  const b2Vote = votes.find((v) => v.voterId === 'b2');
  assert.equal(b2Vote?.targetId, 'b1');
});

test('[QA Regression] BUG-16 & BUG-20: Offline QR matrix generator & markdown asterisk stripper', () => {
  const qr = generateQrMatrix('https://example.com/?gm=GM-4821');
  assert.ok(qr.length >= 21);
  assert.equal(qr.length, qr[0].length, 'QR matrix must be square');
  // Verify top-left 7x7 finder pattern outer ring is solid dark
  for (let i = 0; i < 7; i++) {
    assert.equal(qr[0][i], true);
    assert.equal(qr[6][i], true);
    assert.equal(qr[i][0], true);
    assert.equal(qr[i][6], true);
  }

  assert.equal(
    stripMarkdownAsterisks('*Đêm xuống...* **Ma Sói** thức dậy!'),
    'Đêm xuống... Ma Sói thức dậy!'
  );
});

test('[P1-1] Elder Lynch Power-Seal prevents sealed Villager roles from waking and seals Doppelganger villager inheritance', () => {
  const sealedSeer: Player = { id: 's1', name: 'Tiên Tri', avatar: '🔮', roleId: 'seer', isAlive: true, hasUsedPower: true };
  const sealedGuard: Player = { id: 'g1', name: 'Bảo Vệ', avatar: '🛡️', roleId: 'bodyguard', isAlive: true, hasUsedPower: true };
  const sealedWitch: Player = { id: 'w1', name: 'Phù Thủy', avatar: '🧪', roleId: 'witch', isAlive: true, hasUsedPower: true };
  const wolf: Player = { id: 'wf1', name: 'Sói', avatar: '🐺', roleId: 'werewolf', isAlive: true };

  assert.equal(isPlayerAwakeForNightStep(sealedSeer, 'seer', 2), false);
  assert.equal(isPlayerAwakeForNightStep(sealedGuard, 'bodyguard', 2), false);
  assert.equal(isPlayerAwakeForNightStep(sealedWitch, 'witch', 2), false);
  assert.equal(isPlayerAwakeForNightStep(wolf, 'werewolf', 2), true);

  const schedule = buildAutoGMNightSchedule([sealedSeer, sealedGuard, sealedWitch, wolf], 2, DEFAULT_TIMER_CONFIG, 's1');
  assert.equal(findHumanNightStepIndex(schedule, sealedSeer, 2), -1, 'Sealed human Seer must not stall Night');

  // Night inheritance under active elderSealActive seals villager power role (Witch), but NOT Werewolf
  const nightRoster: Player[] = [
    { id: 'wf', name: 'Sói', avatar: '🐺', roleId: 'werewolf', isAlive: true },
    { id: 'wt', name: 'Phù Thủy', avatar: '🧪', roleId: 'witch', isAlive: true, hasUsedPower: true, hasUsedHeal: true, hasUsedPoison: true },
    { id: 'dp', name: 'Nhân Bản', avatar: '🎭', roleId: 'doppelganger', isAlive: true, targetPlayerId: 'wt', targetRoleId: 'witch' },
  ];
  const nightOut = resolveNightActions(nightRoster, { wolfTargetId: 'wt' }, { roundNumber: 2, elderSealActive: true });
  const inheritedWitch = nightOut.updatedPlayers.find((p) => p.id === 'dp')!;
  assert.equal(inheritedWitch.roleId, 'witch');
  assert.equal(inheritedWitch.hasUsedPower, true);
  assert.equal(inheritedWitch.hasUsedHeal, true);
  assert.equal(inheritedWitch.hasUsedPoison, true);

  // Day lynch directly executing Elder while Doppelganger copies Elder's Lover (Seer) seals Doppelganger in same cascade
  const dayRoster: Player[] = [
    { id: 'el', name: 'Già Làng', avatar: '👑', roleId: 'elder', isAlive: true, elderLives: 2, loverId: 'se' },
    { id: 'se', name: 'Tiên Tri', avatar: '🔮', roleId: 'seer', isAlive: true, loverId: 'el' },
    { id: 'dp', name: 'Nhân Bản', avatar: '🎭', roleId: 'doppelganger', isAlive: true, targetPlayerId: 'se', targetRoleId: 'seer' },
    { id: 'wf', name: 'Sói', avatar: '🐺', roleId: 'werewolf', isAlive: true },
  ];
  const lynchOut = applyDayLynch(dayRoster, 'el');
  assert.equal(lynchOut.elderLynchedPenalty, true);
  const dpAfterLynch = lynchOut.updatedPlayers.find((p) => p.id === 'dp')!;
  assert.equal(dpAfterLynch.roleId, 'seer');
  assert.equal(dpAfterLynch.hasUsedPower, true);
  assert.equal(dpAfterLynch.hasUsedHeal, true);
  assert.equal(dpAfterLynch.hasUsedPoison, true);

  // Hunter-mark kill under elderSealActive: Doppelgänger inheriting a Hunter is sealed, but NOT when inheriting a Werewolf
  const shotRoster: Player[] = [
    { id: 'h1', name: 'Thợ Săn 1', avatar: '🎯', roleId: 'hunter', isAlive: true, hunterMarkId: 'h2' },
    { id: 'h2', name: 'Thợ Săn 2', avatar: '🎯', roleId: 'hunter', isAlive: true, hasUsedPower: true },
    { id: 'dp', name: 'Nhân Bản', avatar: '🎭', roleId: 'doppelganger', isAlive: true, targetPlayerId: 'h2', targetRoleId: 'hunter' },
    { id: 'wf', name: 'Sói', avatar: '🐺', roleId: 'werewolf', isAlive: true },
  ];
  const shotOut = applyDayLynch(shotRoster, 'h1', { elderSealActive: true });
  const dpAfterShot = shotOut.updatedPlayers.find((p) => p.id === 'dp')!;
  assert.equal(dpAfterShot.roleId, 'hunter');
  assert.equal(dpAfterShot.hasUsedPower, true);

  const wolfDoppelRoster: Player[] = [
    { id: 'h1', name: 'Thợ Săn', avatar: '🎯', roleId: 'hunter', isAlive: true, hunterMarkId: 'wf' },
    { id: 'wf', name: 'Sói', avatar: '🐺', roleId: 'werewolf', isAlive: true },
    { id: 'dp', name: 'Nhân Bản', avatar: '🎭', roleId: 'doppelganger', isAlive: true, targetPlayerId: 'wf', targetRoleId: 'werewolf' },
  ];
  const wolfShot = applyDayLynch(wolfDoppelRoster, 'h1', { elderSealActive: true });
  const dpWolf = wolfShot.updatedPlayers.find((p) => p.id === 'dp')!;
  assert.equal(dpWolf.roleId, 'werewolf');
  assert.notEqual(dpWolf.hasUsedPower, true, 'Werewolf inheritance must NOT be sealed by Elder penalty');
});

test('[P1-3] getDyingWolfVictimsForWitch handles Wolf Pup frenzy 2nd victim cleanly with zero meta-leak and Bot Witch heals Victim #2', () => {
  const players: Player[] = [
    { id: 'u1', name: 'Bạn', avatar: '🧑‍🌾', roleId: 'villager', isAlive: true },
    { id: 'w1', name: 'Sói', avatar: '🐺', roleId: 'werewolf', isAlive: true, isBot: true },
    { id: 'bg', name: 'Bảo Vệ', avatar: '🛡️', roleId: 'bodyguard', isAlive: true, isBot: true },
    { id: 'wt', name: 'Phù Thủy', avatar: '🧪', roleId: 'witch', isAlive: true, isBot: true, loverId: 'v2' },
    { id: 'cu', name: 'Bán Sói', avatar: '🌓', roleId: 'cursed', isAlive: true, isBot: true },
    { id: 'el2', name: 'Già 2 Mạng', avatar: '👑', roleId: 'elder', isAlive: true, isBot: true, elderLives: 2 },
    { id: 'el1', name: 'Già 1 Mạng', avatar: '👑', roleId: 'elder', isAlive: true, isBot: true, elderLives: 1 },
    { id: 'v2', name: 'Dân 2', avatar: '🧑‍🌾', roleId: 'villager', isAlive: true, isBot: true, loverId: 'wt' },
  ];

  // Excludes guarded target, cursed, and 2-life elder; includes 1-life elder & frenzy 2nd victim
  assert.deepEqual(
    getDyingWolfVictimsForWitch(players, { wolfTargetId: 'u1', secondWolfTargetId: 'v2', guardTargetId: 'u1' }, true),
    ['v2']
  );
  assert.deepEqual(
    getDyingWolfVictimsForWitch(players, { wolfTargetId: 'cu', secondWolfTargetId: 'el2' }, true),
    []
  );
  assert.deepEqual(
    getDyingWolfVictimsForWitch(players, { wolfTargetId: 'el1', secondWolfTargetId: 'v2' }, true),
    ['el1', 'v2']
  );
  // Without wolfPupTriggered, secondWolfTargetId is ignored
  assert.deepEqual(
    getDyingWolfVictimsForWitch(players, { wolfTargetId: 'u1', secondWolfTargetId: 'v2' }, false),
    ['u1']
  );
  // Guard target who was protectedLastNight is NOT shielded -> still dying
  const repeatGuarded = players.map((p) => (p.id === 'u1' ? { ...p, protectedLastNight: true } : p));
  assert.deepEqual(
    getDyingWolfVictimsForWitch(repeatGuarded, { wolfTargetId: 'u1', guardTargetId: 'u1' }, false),
    ['u1']
  );

  // Bot Witch heals her Lover (Victim #2) during Wolf Pup frenzy
  const botWitchAct = computeAutoGMBotNightStepAction(
    'witch',
    players,
    { wolfTargetId: 'u1', secondWolfTargetId: 'v2' },
    { round: 3, wolfPupFrenzy: true, humanPlayerId: 'u1' }
  );
  assert.equal(botWitchAct.witchHealTargetId, 'v2', 'Bot Witch must heal her Lover even when Lover is Wolf Pup Victim #2');

  // Bot Witch heals herself when she is Victim #2
  const botWitchSelfAct = computeAutoGMBotNightStepAction(
    'witch',
    players,
    { wolfTargetId: 'u1', secondWolfTargetId: 'wt' },
    { round: 3, wolfPupFrenzy: true, humanPlayerId: 'u1' }
  );
  assert.equal(botWitchSelfAct.witchHealTargetId, 'wt', 'Bot Witch must heal herself when she is Victim #2');
});

test('[P1-9 & P3-7] Multi-Hunter Lover cascade fires each marked bullet and cross-faction Lovers prevent premature Werewolf win', () => {
  // Multi-Hunter night cascade (Hunter 1 & Hunter 2 are Lovers)
  const nightHunters: Player[] = [
    { id: 'w1', name: 'Sói', avatar: '🐺', roleId: 'werewolf', isAlive: true },
    { id: 'h1', name: 'Thợ Săn 1', avatar: '🎯', roleId: 'hunter', isAlive: true, loverId: 'h2' },
    { id: 'h2', name: 'Thợ Săn 2', avatar: '🎯', roleId: 'hunter', isAlive: true, loverId: 'h1' },
    { id: 'v1', name: 'Dân', avatar: '🧑‍🌾', roleId: 'villager', isAlive: true },
  ];
  // h1 marks the villager, h2 marks the wolf; wolves bite h1 -> lover h2 dies too -> BOTH bullets fire
  const nightRes = resolveNightActions(nightHunters, { wolfTargetId: 'h1', hunterTargetId: 'v1' });
  assert.deepEqual(nightRes.result.killedPlayerIds.sort(), ['h1', 'h2', 'v1']);
  assert.equal(nightRes.result.hunterShots.length, 1, 'Only the first living Hunter received the mark action');

  // Multi-Hunter day lynch cascade with stored marks on both Hunters
  const markedHunters = nightHunters.map((p) =>
    p.id === 'h1' ? { ...p, hunterMarkId: 'v1' } : p.id === 'h2' ? { ...p, hunterMarkId: 'w1' } : p
  );
  const dayRes = applyDayLynch(markedHunters, 'h1');
  assert.deepEqual(
    dayRes.hunterShots.map((s) => s.hunterId).sort(),
    ['h1', 'h2']
  );

  // P3-7: 3 alive = Wolf A + Villager B (Lovers) + Wolf C -> MUST NOT end as Werewolves win!
  const threeAliveCrossLovers: Player[] = [
    { id: 'wA', name: 'Sói A', avatar: '🐺', roleId: 'werewolf', isAlive: true, loverId: 'vB' },
    { id: 'vB', name: 'Dân B', avatar: '🧑‍🌾', roleId: 'villager', isAlive: true, loverId: 'wA' },
    { id: 'wC', name: 'Sói C', avatar: '🐺', roleId: 'werewolf', isAlive: true },
  ];
  const midWin = checkWinCondition(threeAliveCrossLovers);
  assert.equal(midWin.isOver, false, 'Must NOT declare Werewolves win when cross-faction Lovers can still eliminate outsider Wolf C');

  // Once Wolf C is lynched, Wolf A + Villager B Lovers immediately win!
  const afterLynchC = threeAliveCrossLovers.map((p) => (p.id === 'wC' ? { ...p, isAlive: false } : p));
  const finalWin = checkWinCondition(afterLynchC);
  assert.equal(finalWin.isOver, true);
  assert.equal(finalWin.winner, 'lovers');

  // Same-faction Lovers (Wolf A + Wolf B Lovers + Villager C) -> Werewolves DO win immediately!
  const sameFactionLovers: Player[] = [
    { id: 'wA', name: 'Sói A', avatar: '🐺', roleId: 'werewolf', isAlive: true, loverId: 'wB' },
    { id: 'wB', name: 'Sói B', avatar: '🐺', roleId: 'werewolf', isAlive: true, loverId: 'wA' },
    { id: 'vC', name: 'Dân C', avatar: '🧑‍🌾', roleId: 'villager', isAlive: true },
  ];
  const wolfWin = checkWinCondition(sameFactionLovers);
  assert.equal(wolfWin.isOver, true);
  assert.equal(wolfWin.winner, 'werewolves');
});

test('[P1-11 & P2-12] Fair Bot AI: non-cheating Witch Poison, non-omniscient Traitor, subtle Seer, Dawn-scoped chat signals, & smart Bot Hunter', () => {
  // 1. Bot Witch uses suspectedIds when provided and never peeks at roleId
  const witchRoster: Player[] = [
    { id: 'u1', name: 'Bạn', avatar: '🧑‍🌾', roleId: 'villager', isAlive: true },
    { id: 'wt', name: 'Phù Thủy', avatar: '🧪', roleId: 'witch', isAlive: true, isBot: true },
    { id: 'w1', name: 'Sói 1', avatar: '🐺', roleId: 'werewolf', isAlive: true, isBot: true },
    { id: 'v1', name: 'Dân 1', avatar: '🧑‍🌾', roleId: 'villager', isAlive: true, isBot: true },
    { id: 'v2', name: 'Dân 2', avatar: '🧑‍🌾', roleId: 'villager', isAlive: true, isBot: true },
    { id: 'v3', name: 'Dân 3', avatar: '🧑‍🌾', roleId: 'villager', isAlive: true, isBot: true },
    { id: 'v4', name: 'Dân 4', avatar: '🧑‍🌾', roleId: 'villager', isAlive: true, isBot: true },
    { id: 'v5', name: 'Dân 5', avatar: '🧑‍🌾', roleId: 'villager', isAlive: true, isBot: true },
    { id: 'v6', name: 'Dân 6', avatar: '🧑‍🌾', roleId: 'villager', isAlive: true, isBot: true },
  ];
  let poisonHitsSuspect = 0;
  for (let i = 0; i < 60; i++) {
    const act = computeAutoGMBotNightStepAction(
      'witch',
      witchRoster,
      { wolfTargetId: 'v6' },
      { round: 2, wolfPupFrenzy: false, humanPlayerId: 'u1', suspectedIds: ['v2'] }
    );
    if (act.witchPoisonTargetId) {
      assert.equal(act.witchPoisonTargetId, 'v2', 'Bot Witch must honor suspectedIds instead of peeking at wolf roleId');
      poisonHitsSuspect++;
    }
  }
  assert.ok(poisonHitsSuspect > 0, 'Expected Bot Witch to poison at least once across 60 trials');

  // Without suspectedIds, Bot Witch chooses uniformly (NOT ~50% wolf bias)
  let wolfPoisons = 0;
  let totalPoisons = 0;
  for (let i = 0; i < 500; i++) {
    const act = computeAutoGMBotNightStepAction(
      'witch',
      witchRoster,
      { wolfTargetId: 'v6' },
      { round: 2, wolfPupFrenzy: false, humanPlayerId: 'u1' }
    );
    if (act.witchPoisonTargetId) {
      totalPoisons++;
      if (act.witchPoisonTargetId === 'w1') wolfPoisons++;
    }
  }
  assert.ok(totalPoisons >= 100);
  assert.ok(
    wolfPoisons / totalPoisons < 0.35,
    `Expected uniform (~14%) poison rate on wolf without suspectedIds, got ${(wolfPoisons / totalPoisons * 100).toFixed(1)}%`
  );

  // 2. Bot Traitor is NOT omniscient about packmates on Day 1
  const traitorRoster: Player[] = [
    { id: 'u1', name: 'Bạn', avatar: '🧑‍🌾', roleId: 'villager', isAlive: true },
    { id: 'tr', name: 'Phản Bội', avatar: '🗡️', roleId: 'traitor', isAlive: true, isBot: true },
    { id: 'w1', name: 'Sói 1', avatar: '🐺', roleId: 'werewolf', isAlive: true, isBot: true },
  ];
  let traitorVotedWolf = false;
  for (let i = 0; i < 50; i++) {
    const votes = computeSmartBotDayVotes(traitorRoster);
    const trVote = votes.find((v) => v.voterId === 'tr');
    if (trVote?.targetId === 'w1') {
      traitorVotedWolf = true;
      break;
    }
  }
  assert.equal(traitorVotedWolf, true, 'Bot Traitor must NOT secretly know and avoid voting wolves on Day 1');

  // 3. Bot Seer Day 1 safe check does NOT scream crystal ball emoji; Wolves never accuse packmates; Tanner baits
  const discussRoster: Player[] = [
    { id: 'u1', name: 'Bạn', avatar: '🧑‍🌾', roleId: 'villager', isAlive: true },
    { id: 'se', name: 'Bot Tiên Tri', avatar: '🔮', roleId: 'seer', isAlive: true, isBot: true },
    { id: 'w1', name: 'Sói Một', avatar: '🐺', roleId: 'werewolf', isAlive: true, isBot: true },
    { id: 'w2', name: 'Sói Hai', avatar: '🐺', roleId: 'wolf_pup', isAlive: true, isBot: true },
    { id: 'tn', name: 'Chán Đời', avatar: '🎭', roleId: 'tanner', isAlive: true, isBot: true },
  ];
  const day1SafeLines = buildBotDayDiscussionLines(
    discussRoster,
    [],
    'vi',
    { playerId: 'u1', roleId: 'villager', isWerewolf: false },
    1
  );
  const seerLineDay1 = day1SafeLines.find((l) => l.senderId === 'se');
  assert.ok(seerLineDay1);
  assert.equal(seerLineDay1.text.includes('🔮'), false, 'Bot Seer Day 1 safe check must not leak role with 🔮 prefix');

  // Wolves never accuse their packmate in random Day 2+ lines
  const wolfPackRoster: Player[] = [
    { id: 'u1', name: 'Bạn', avatar: '🧑‍🌾', roleId: 'villager', isAlive: true },
    { id: 'w1', name: 'Sói Một', avatar: '🐺', roleId: 'werewolf', isAlive: true, isBot: true },
    { id: 'w2', name: 'Sói Hai', avatar: '🐺', roleId: 'wolf_pup', isAlive: true, isBot: true },
  ];
  for (let i = 0; i < 40; i++) {
    const d2Lines = buildBotDayDiscussionLines(wolfPackRoster, ['Ai Đó'], 'vi', null, 2);
    for (const l of d2Lines) {
      if (l.senderId === 'w1') assert.equal(l.text.includes('Sói Hai'), false, `Wolf w1 accused packmate w2: ${l.text}`);
      if (l.senderId === 'w2') assert.equal(l.text.includes('Sói Một'), false, `Wolf w2 accused packmate w1: ${l.text}`);
    }
  }

  // Tanner speaks a defensive/baiting line
  const tannerRoster: Player[] = [
    { id: 'u1', name: 'Bạn', avatar: '🧑‍🌾', roleId: 'villager', isAlive: true },
    { id: 'tn', name: 'Chán Đời', avatar: '🎭', roleId: 'tanner', isAlive: true, isBot: true },
  ];
  const tannerLines = buildBotDayDiscussionLines(tannerRoster, [], 'vi', null, 1);
  assert.equal(tannerLines.length, 1);
  assert.equal(tannerLines[0].senderId, 'tn');
  assert.equal(tannerLines[0].text.includes('Bạn'), false, 'Tanner bait line should draw heat onto self, not redirect');

  // 4. extractChatVoteSignals scopes after latest Dawn, ignores question prompts, and captures named silence accusations
  const chatPlayers: Player[] = [
    { id: 'u1', name: 'Bạn', avatar: '🧑‍🌾', roleId: 'villager', isAlive: true },
    { id: 'b1', name: 'Đức Huy', avatar: '🐺', roleId: 'werewolf', isAlive: true, isBot: true },
    { id: 'b2', name: 'Thảo My', avatar: '🧑‍🌾', roleId: 'villager', isAlive: true, isBot: true },
    { id: 'b3', name: 'Minh Hoàng', avatar: '🔮', roleId: 'seer', isAlive: true, isBot: true },
  ];
  const scopedSignals = extractChatVoteSignals(
    [
      // Stale Day 1 accusation BEFORE Day 2 dawn -> MUST be ignored!
      { id: 'old_1', senderId: 'b3', text: 'Tôi nghi Đức Huy là Sói, treo cổ Đức Huy!' },
      { id: 'sys_dawn_2', senderId: 'sys', text: '☀️ [Sáng Ngày 2] Trời đã sáng!', isSystem: true },
      // Question prompt -> MUST NOT mark Thảo My as accused!
      { id: 'cur_1', senderId: 'b3', text: 'Mới sáng ngày đầu tiên, Thảo My, bạn nghi ngờ ai nhất?' },
      // Named silent accusation -> MUST add Đức Huy directly to suspectsByVoter.b2!
      { id: 'cur_2', senderId: 'b2', text: 'Qua mấy lượt vừa rồi, tôi thấy Đức Huy hơi im lặng — mọi người nghĩ sao?' },
    ],
    chatPlayers
  );
  assert.equal(scopedSignals.suspectsByVoter.b3, undefined, 'Stale pre-dawn accusation & question prompt must not mark suspects');
  assert.deepEqual(scopedSignals.suspectsByVoter.b2, ['b1'], 'Named silent accusation must directly suspect the named player');

  // 5. pickSmartBotHunterTarget respects knownWolfIds, suspects, allies, and loverId
  const hunter: Player = { id: 'h1', name: 'Thợ Săn', avatar: '🎯', roleId: 'hunter', isAlive: false, isBot: true, loverId: 'b2' };
  const hunterPool: Player[] = [
    hunter,
    { id: 'b1', name: 'Đức Huy', avatar: '🐺', roleId: 'werewolf', isAlive: true, isBot: true },
    { id: 'b2', name: 'Thảo My', avatar: '🧑‍🌾', roleId: 'villager', isAlive: true, isBot: true, loverId: 'h1' },
    { id: 'b3', name: 'Minh Hoàng', avatar: '🔮', roleId: 'seer', isAlive: true, isBot: true },
    { id: 'b4', name: 'Tuấn Kiệt', avatar: '🛡️', roleId: 'bodyguard', isAlive: false, isBot: true },
  ];
  assert.equal(pickSmartBotHunterTarget(hunterPool, hunter, ['b1'], null)?.id, 'b1');
  assert.equal(
    pickSmartBotHunterTarget(hunterPool, hunter, [], {
      suspectsByVoter: { h1: ['b3'] },
      alliesByVoter: {},
      suspectsSilentVoters: [],
      silentPlayerIds: [],
    })?.id,
    'b3'
  );
  // Avoids Lover (b2) and ally (b3) and dead (b4) -> picks b1
  assert.equal(
    pickSmartBotHunterTarget(hunterPool, hunter, [], {
      suspectsByVoter: {},
      alliesByVoter: { h1: ['b3'] },
      suspectsSilentVoters: [],
      silentPlayerIds: [],
    })?.id,
    'b1'
  );
  // If only Lover is alive, falls back to Lover cleanly
  const onlyLoverAlive = hunterPool.map((p) => (p.id === 'b2' ? p : { ...p, isAlive: false }));
  assert.equal(pickSmartBotHunterTarget(onlyLoverAlive, hunter)?.id, 'b2');
});

// ---------------------------------------------------------------------------
// Night-Aim Hunter ("Ghim Đạn Ban Đêm"): mark at night, auto-fire on death (pierces Guard & Heal)
// ---------------------------------------------------------------------------
const nightAimRoster = (): Player[] => [
  { id: 'wf', name: 'Sói', avatar: '🐺', roleId: 'werewolf', isAlive: true },
  { id: 'hn', name: 'Thợ Săn', avatar: '🎯', roleId: 'hunter', isAlive: true },
  { id: 'wi', name: 'Phù Thủy', avatar: '🧪', roleId: 'witch', isAlive: true },
  { id: 'bg', name: 'Bảo Vệ', avatar: '🛡️', roleId: 'bodyguard', isAlive: true },
  { id: 'v1', name: 'Dân 1', avatar: '🧑‍🌾', roleId: 'villager', isAlive: true },
  { id: 'v2', name: 'Dân 2', avatar: '🧑‍🌾', roleId: 'villager', isAlive: true },
];

test('[Night-Aim 1] Hunter bitten at night shoots the marked target even if that target is shielded by the Bodyguard', () => {
  const { updatedPlayers, result } = resolveNightActions(nightAimRoster(), {
    wolfTargetId: 'hn',
    hunterTargetId: 'v1',
    guardTargetId: 'v1',
  });
  assert.equal(updatedPlayers.find((p) => p.id === 'hn')?.isAlive, false);
  assert.equal(updatedPlayers.find((p) => p.id === 'v1')?.isAlive, false, 'Shield must NOT stop the Hunter bullet');
  assert.deepEqual(result.hunterShots, [{ hunterId: 'hn', targetId: 'v1' }]);
  assert.equal(result.killedDetails?.find((d) => d.playerId === 'v1')?.causeType, 'hunter_shot');
});

test('[Night-Aim 2] Witch Heal saves the Hunter from the bite but a dead Hunter\'s bullet cannot be healed away', () => {
  // Hunter bitten and Witch heals the Hunter -> Hunter lives, no shot
  const healed = resolveNightActions(nightAimRoster(), {
    wolfTargetId: 'hn',
    hunterTargetId: 'v1',
    witchHealTargetId: 'hn',
  });
  assert.equal(healed.updatedPlayers.find((p) => p.id === 'hn')?.isAlive, true);
  assert.equal(healed.result.hunterShots.length, 0);

  // Hunter killed by poison while the mark target is also "healed" in the same night -> mark still dies
  const poisoned = resolveNightActions(nightAimRoster(), {
    wolfTargetId: 'v1',
    hunterTargetId: 'v1',
    witchHealTargetId: 'v1',
    witchPoisonTargetId: 'hn',
  });
  assert.equal(poisoned.updatedPlayers.find((p) => p.id === 'hn')?.isAlive, false);
  assert.equal(poisoned.updatedPlayers.find((p) => p.id === 'v1')?.isAlive, false, 'Heal must NOT cancel the Hunter bullet');
});

test('[Night-Aim 3] "Không ghim" (hunterTargetId null) means a dying Hunter fires nothing', () => {
  const { updatedPlayers, result } = resolveNightActions(nightAimRoster(), {
    wolfTargetId: 'hn',
    hunterTargetId: null,
  });
  assert.equal(updatedPlayers.find((p) => p.id === 'hn')?.isAlive, false);
  assert.equal(result.hunterShots.length, 0);
  assert.equal(updatedPlayers.filter((p) => !p.isAlive).length, 1);
});

test('[Night-Aim 4] A mark that is already dead (or the Hunter itself) never fires', () => {
  const roster = nightAimRoster().map((p) => (p.id === 'v2' ? { ...p, isAlive: false } : p));
  const deadMark = resolveNightActions(roster, { wolfTargetId: 'hn', hunterTargetId: 'v2' });
  assert.equal(deadMark.result.hunterShots.length, 0);
  const selfMark = resolveNightActions(nightAimRoster(), { wolfTargetId: 'hn', hunterTargetId: 'hn' });
  assert.equal(selfMark.result.hunterShots.length, 0);
  assert.equal(selfMark.updatedPlayers.find((p) => p.id === 'hn')?.hunterMarkId, undefined);
});

test('[Night-Aim 5] Lynching the Hunter auto-fires the bullet marked the previous night', () => {
  const night = resolveNightActions(nightAimRoster(), { hunterTargetId: 'wf' });
  assert.equal(night.updatedPlayers.find((p) => p.id === 'hn')?.hunterMarkId, 'wf');
  const lynch = applyDayLynch(night.updatedPlayers, 'hn');
  assert.deepEqual(lynch.hunterShots, [{ hunterId: 'hn', targetId: 'wf' }]);
  assert.equal(lynch.updatedPlayers.find((p) => p.id === 'wf')?.isAlive, false);
  assert.equal(lynch.updatedPlayers.find((p) => p.id === 'hn')?.hasUsedPower, true);

  // A later night overwrites the old mark; "Không ghim" clears it
  const reMark = resolveNightActions(night.updatedPlayers, { hunterTargetId: 'v1' });
  assert.equal(reMark.updatedPlayers.find((p) => p.id === 'hn')?.hunterMarkId, 'v1');
  const cleared = resolveNightActions(reMark.updatedPlayers, { hunterTargetId: null });
  assert.equal(cleared.updatedPlayers.find((p) => p.id === 'hn')?.hunterMarkId, undefined);
  assert.equal(applyDayLynch(cleared.updatedPlayers, 'hn').hunterShots.length, 0);
});

test('[Night-Aim 6] Lynching the Elder seals the Hunter: no mark is fired', () => {
  const roster: Player[] = [
    ...nightAimRoster().map((p) => (p.id === 'hn' ? { ...p, hunterMarkId: 'wf' } : p)),
    { id: 'el', name: 'Già Làng', avatar: '👑', roleId: 'elder', isAlive: true, elderLives: 2 },
  ];
  const lynchElder = applyDayLynch(roster, 'el');
  assert.equal(lynchElder.elderLynchedPenalty, true);
  assert.equal(lynchElder.updatedPlayers.find((p) => p.id === 'hn')?.hunterMarkId, undefined);
  assert.equal(lynchElder.updatedPlayers.find((p) => p.id === 'hn')?.hasUsedPower, true);
  // Even if the sealed Hunter dies later the next day, nothing fires
  assert.equal(applyDayLynch(lynchElder.updatedPlayers, 'hn', { elderSealActive: true }).hunterShots.length, 0);
  // And a sealed Hunter's night mark is ignored
  const sealedNight = resolveNightActions(lynchElder.updatedPlayers, { wolfTargetId: 'hn', hunterTargetId: 'v1' }, { elderSealActive: true });
  assert.equal(sealedNight.result.hunterShots.length, 0);
});

test('[Night-Aim 7] The marked target\'s Lover dies with them (cascade) and Doppelgänger inheriting Hunter starts with no stale mark', () => {
  const roster: Player[] = [
    { id: 'wf', name: 'Sói', avatar: '🐺', roleId: 'werewolf', isAlive: true },
    { id: 'hn', name: 'Thợ Săn', avatar: '🎯', roleId: 'hunter', isAlive: true, hunterMarkId: 'v1' },
    { id: 'v1', name: 'Dân 1', avatar: '🧑‍🌾', roleId: 'villager', isAlive: true, loverId: 'v2' },
    { id: 'v2', name: 'Dân 2', avatar: '🧑‍🌾', roleId: 'villager', isAlive: true, loverId: 'v1' },
    { id: 'dp', name: 'Nhân Bản', avatar: '🎭', roleId: 'doppelganger', isAlive: true, targetPlayerId: 'hn', targetRoleId: 'hunter', hunterMarkId: 'wf' },
  ];
  const lynch = applyDayLynch(roster, 'hn');
  assert.equal(lynch.updatedPlayers.find((p) => p.id === 'v1')?.isAlive, false);
  assert.equal(lynch.updatedPlayers.find((p) => p.id === 'v2')?.isAlive, false, 'Lover chain must cascade from the bullet');
  const dp = lynch.updatedPlayers.find((p) => p.id === 'dp')!;
  assert.equal(dp.roleId, 'hunter');
  assert.equal(dp.hunterMarkId, undefined, 'Inherited Hunter must not carry a stale mark');
  assert.notEqual(dp.hasUsedPower, true);
});

// ---------------------------------------------------------------------------
// W3 rules hardening: pre-resolution Seer, dead-actor checks, Doppel same-night death, Lover win parity
// ---------------------------------------------------------------------------
const w3Player = (id: string, roleId: RoleId, extra: Partial<Player> = {}): Player => ({
  id, name: id, avatar: '🙂', roleId, isAlive: true, ...extra,
});

test('[W3-rules 1] Seer reads a Cursed player bitten the same night as a Villager (pre-resolution role)', () => {
  const { updatedPlayers, result } = resolveNightActions(
    [w3Player('wf', 'werewolf'), w3Player('sr', 'seer'), w3Player('cu', 'cursed'), w3Player('v1', 'villager')],
    { wolfTargetId: 'cu', seerTargetId: 'cu' }
  );
  assert.equal(result.seerInspection?.roleId, 'cursed');
  assert.equal(result.seerInspection?.isWerewolf, false);
  assert.equal(updatedPlayers.find((p) => p.id === 'cu')?.roleId, 'werewolf');
});

test('[W3-rules 2] Dead Witch cannot poison and dead Bodyguard cannot shield', () => {
  const poison = resolveNightActions(
    [w3Player('wf', 'werewolf'), w3Player('wi', 'witch', { isAlive: false }), w3Player('v1', 'villager')],
    { witchPoisonTargetId: 'v1' }
  );
  assert.equal(poison.updatedPlayers.find((p) => p.id === 'v1')?.isAlive, true);
  const guard = resolveNightActions(
    [w3Player('wf', 'werewolf'), w3Player('bg', 'bodyguard', { isAlive: false }), w3Player('v1', 'villager')],
    { wolfTargetId: 'v1', guardTargetId: 'v1' }
  );
  assert.equal(guard.updatedPlayers.find((p) => p.id === 'v1')?.isAlive, false);
});

test('[W3-rules 3] Doppelgänger dying the same night as its model does not inherit the role', () => {
  const { updatedPlayers } = resolveNightActions(
    [
      w3Player('wf', 'werewolf'), w3Player('wi', 'witch'), w3Player('v1', 'villager'),
      w3Player('dp', 'doppelganger', { targetPlayerId: 'v1', targetRoleId: 'villager' }),
    ],
    { wolfTargetId: 'v1', witchPoisonTargetId: 'dp' }
  );
  const dp = updatedPlayers.find((p) => p.id === 'dp')!;
  assert.equal(dp.isAlive, false);
  assert.equal(dp.roleId, 'doppelganger');
});

test('[W3-rules 4] Cross-faction Lovers only delay the Wolf win when a biting Wolf is in the pair', () => {
  const traitorLovers = [
    w3Player('w1', 'werewolf'), w3Player('w2', 'werewolf'),
    w3Player('tr', 'traitor', { loverId: 'v1' }), w3Player('v1', 'villager', { loverId: 'tr' }),
  ];
  assert.equal(checkWinCondition(traitorLovers).winner, 'werewolves');
  const wolfLovers = [
    w3Player('w1', 'werewolf', { loverId: 'v1' }), w3Player('v1', 'villager', { loverId: 'w1' }),
    w3Player('w2', 'werewolf'),
  ];
  assert.equal(checkWinCondition(wolfLovers).isOver, false);
});

test('[W3-stall] Last night step auto-advances at 0s for a living human who is no longer awake', () => {
  const base = { shellState: 'playing', phase: 'night', showOnboardingTour: false, isHumanAlive: true, hasHumanVoted: false } as const;
  assert.equal(shouldAutoAdvanceOnTimerZero({ ...base, isPlayerAwakeAtNight: false }), true);
  assert.equal(shouldAutoAdvanceOnTimerZero({ ...base, isPlayerAwakeAtNight: true }), false);
});

test('[W3-mayor] Dusk announcement keeps the voting Mayor even if the Mayor died in the same lynch', () => {
  const before = [
    w3Player('m', 'villager', { isMayor: true }), w3Player('a', 'villager'), w3Player('w', 'werewolf'),
  ];
  const after = before.map((p) => (p.id === 'm' ? { ...p, isAlive: false } : p));
  const dusk = buildDuskGMAnnouncement({
    round: 1, beforePlayers: before, afterPlayers: after, lynchedVictim: before[0],
    voteCounts: { m: 2 }, votes: [{ voterId: 'a', targetId: 'm' }], isTie: false, humanPlayerId: 'a', lang: 'vi',
  });
  assert.equal(dusk.votingMayorId, 'm');
});
