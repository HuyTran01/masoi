import test from 'node:test';
import assert from 'node:assert/strict';
import { LOGIC_TEST_SCENARIOS, runAllLogicTests } from './logicTestSuite.ts';
import {
  QA_1000_TEST_CASES,
  run1000MatchExperienceCampaign,
} from './qa1000TestSuite.ts';
import { generateBalancedRoster, resolveNightActions } from './rules.ts';
import { UI_TEXT } from '../utils/i18n.ts';
import { ROLES } from './roles.ts';
import { Language, Player, PropType, RoleId } from '../types/game.ts';
import { PROP_REACTION_META, ROLE_CALLOUT_LINES } from '../utils/sound.ts';
import {
  buildAutoGMNightSchedule,
  isPlayerAwakeForNightStep,
  computeAutoGMBotNightStepAction,
  computeSmartBotDayVotes,
  buildBotDayDiscussionLines,
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

  // Night 1 schedule includes doppelganger & cupid before werewolf, witch, seer, bodyguard
  const night1 = buildAutoGMNightSchedule(roster, 1);
  assert.deepEqual(
    night1.map((s) => s.key),
    ['doppelganger', 'cupid', 'werewolf', 'witch', 'seer', 'bodyguard']
  );

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

