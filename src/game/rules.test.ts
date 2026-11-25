import test from 'node:test';
import assert from 'node:assert/strict';
import { LOGIC_TEST_SCENARIOS, runAllLogicTests } from './logicTestSuite.ts';
import {
  QA_1000_TEST_CASES,
  run1000MatchExperienceCampaign,
} from './qa1000TestSuite.ts';
import {
  assignPreferredRoleToDeck,
  buildVoteTallyEntries,
  castSingleDayVote,
  fisherYatesShuffle,
  generateBalancedRoster,
  resolveNightActions,
  tallyVotes,
} from './rules.ts';
import { UI_TEXT } from '../utils/i18n.ts';
import { ROLES } from './roles.ts';
import { Language, Player, PropType, RoleId } from '../types/game.ts';
import { PROP_REACTION_META, ROLE_CALLOUT_LINES } from '../utils/sound.ts';
import {
  buildAutoGMNightSchedule,
  isPlayerAwakeForNightStep,
  findHumanNightStepIndex,
  getHumanRoleWakeGuidance,
  computeAutoGMBotNightStepAction,
  computeSmartBotDayVotes,
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

  // Night 1 schedule includes doppelganger & cupid before werewolf, witch, seer, bodyguard
  const night1 = buildAutoGMNightSchedule(roster, 1, customCfg, 'u1');
  assert.deepEqual(
    night1.map((s) => s.key),
    ['doppelganger', 'cupid', 'werewolf', 'witch', 'seer', 'bodyguard']
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
  assert.equal(humanIdx, 4);
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
    ['werewolf', 'witch', 'seer', 'bodyguard']
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
  const wakingEveryNight: RoleId[] = ['werewolf', 'wolf_pup', 'witch', 'seer', 'bodyguard'];
  const wakingNight1Only: RoleId[] = ['cupid', 'doppelganger'];
  const passiveNightRoles: RoleId[] = ['villager', 'hunter', 'tanner', 'elder', 'cursed', 'traitor'];

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

test('[Human Turn Protection] prepareNightStartForHuman, shouldAutoAdvanceOnTimerZero, and random active role guarantee', () => {
  const activeEveryNight = new Set<RoleId>(['werewolf', 'wolf_pup', 'seer', 'witch', 'bodyguard']);
  for (const count of [6, 8, 10, 12]) {
    for (let i = 0; i < 25; i++) {
      const deck = assignPreferredRoleToDeck(generateBalancedRoster(count), 'random');
      assert.equal(
        activeEveryNight.has(deck[0]),
        true,
        `Expected deck[0] to be an every-night active role for 'random', got ${deck[0]}`
      );
    }
  }

  // Verify prepareNightStartForHuman starts Night 1 directly at the human player's step and pre-simulates preceding bot steps
  const players: Player[] = [
    { id: 'u1', name: 'Human Seer', avatar: '🔮', roleId: 'seer', isAlive: true },
    { id: 'b1', name: 'Bot Cupid', avatar: '💘', roleId: 'cupid', isAlive: true, isBot: true },
    { id: 'b2', name: 'Bot Wolf', avatar: '🐺', roleId: 'werewolf', isAlive: true, isBot: true },
    { id: 'b3', name: 'Bot Witch', avatar: '🧪', roleId: 'witch', isAlive: true, isBot: true },
    { id: 'b4', name: 'Bot Guard', avatar: '🛡️', roleId: 'bodyguard', isAlive: true, isBot: true },
  ];

  const prepared = prepareNightStartForHuman(players, 1, DEFAULT_TIMER_CONFIG, 'u1');
  // Schedule: cupid (0), werewolf (1), witch (2), seer (3), bodyguard (4)
  assert.equal(prepared.initialStepIndex, 3);
  assert.equal(prepared.schedule[prepared.initialStepIndex].key, 'seer');
  assert.equal(prepared.schedule[prepared.initialStepIndex].isHumanTurn, true);
  assert.ok(prepared.preSimulatedActions.wolfTargetId, 'Bot werewolf should have selected a victim before human Seer wakes');
  assert.ok(prepared.preSimulatedActions.cupidLovers, 'Bot cupid should have linked lovers before human Seer wakes');

  // Verify shouldAutoAdvanceOnTimerZero NEVER auto-skips human night turn or human day vote
  assert.equal(
    shouldAutoAdvanceOnTimerZero({
      shellState: 'playing',
      phase: 'night',
      showOnboardingTour: false,
      isPlayerAwakeAtNight: true,
      isHumanAlive: true,
      hasHumanVoted: false,
      isHumanHunterRevenge: false,
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
      isHumanHunterRevenge: false,
    }),
    false,
    'Must NEVER auto-advance day voting before living human player has voted'
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

  const day1Lines = buildBotDayDiscussionLines(players, [], 'vi', null, 1);
  assert.ok(day1Lines.length >= 2);
  for (const line of day1Lines) {
    assert.equal(
      line.text.includes('hơi im lặng từ đầu ván'),
      false,
      `Day 1 dialogue must not falsely accuse silence: ${line.text}`
    );
  }
  assert.ok(
    day1Lines.some((l) => l.text.includes('Mới sáng ngày đầu tiên')),
    'Day 1 dialogue should acknowledge Day 1 naturally'
  );

  const day2Lines = buildBotDayDiscussionLines(players, ['Gia Bảo'], 'vi', null, 2);
  assert.ok(
    day2Lines.some((l) => l.text.includes('Qua mấy lượt vừa rồi')),
    'Day 2+ dialogue may reference previous rounds'
  );
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
    hunterShotEvent: {
      hunterName: 'Minh Hoàng',
      hunterSeat: 4,
      targetId: 'b5',
      targetName: 'Tuấn Kiệt',
      targetSeat: 6,
    },
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
      isHumanHunterRevenge: false,
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
    hunterShotEvent: {
      hunterName: 'Thảo My',
      hunterSeat: 3,
      targetId: 'b5',
      targetName: 'Tuấn Kiệt',
      targetSeat: 6,
      extraLoverName: 'Minh Hoàng',
      extraLoverSeat: 4,
    },
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
  const wolfBitesHunter = resolveNightActions(rosterWithHunter, { wolfTargetId: 'b_vil' });
  const afterHunterRevenge = wolfBitesHunter.updatedPlayers.map((p) =>
    p.id === 'u_wolf' ? { ...p, isAlive: false } : { ...p }
  );
  const shotWolfCinematic = determineEndOfNightCinematic({
    beforeHuman: rosterWithHunter[0],
    beforePlayers: rosterWithHunter,
    afterPlayers: afterHunterRevenge,
    nightResult: wolfBitesHunter.result,
    hunterShotEvent: {
      hunterId: 'b_vil',
      hunterName: 'Tuấn Kiệt',
      hunterSeat: 6,
      targetId: 'u_wolf',
      targetName: 'Sói Đầu Đàn',
      targetSeat: 1,
    },
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
      hunterShotEvent: {
        hunterName: 'Đức Huy',
        hunterSeat: 2,
        targetId: 'b_vil',
        targetName: 'Tuấn Kiệt',
        targetSeat: 6,
      },
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





