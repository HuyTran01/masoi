import test from 'node:test';
import assert from 'node:assert/strict';
import type { Language, Player, RoleId, StorylineId } from '../types/game.ts';
import {
  STORYLINE_CATALOG,
  STORYLINE_LIST,
  applyStorylineRoleSetup,
  createAIMatchBrain,
  recordBotSeerInspection,
  recordRoundPublicOutcome,
  computeSmartBotNightAction,
  computeSmartBotVotes,
  suggestWolfPackTargets,
  pickSmartBotHunterTargetWithBrain,
  generateScheduledDiscussionBeats,
  generateGallowsDefenseBeat,
  generateHumanChatResponses,
  adjustPublicSuspicion,
} from './smartAI.ts';
import {
  DEFAULT_TIMER_CONFIG,
  buildAutoGMNightSchedule,
  buildNightSkillCutsceneForStep,
  computeAutoGMBotNightStepAction,
  computeSmartBotDayVotes,
  getStepInitialTimerSeconds,
  pickSmartBotHunterTarget,
  prepareNightStartForHuman,
} from './autoGM.ts';
import { generateBalancedRoster, assignPreferredRoleToDeck } from './rules.ts';

function makeSeededRng(seed = 1337): () => number {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function makeRoster(specs: Array<[string, string, RoleId, Partial<Player>?]>): Player[] {
  return specs.map(([id, name, roleId, extra]) => ({
    id,
    name,
    avatar: '🧑',
    roleId,
    isAlive: true,
    isBot: id !== 'u1',
    ...extra,
  }));
}

test('[SmartAI #0] STORYLINE_CATALOG covers all 8 storylines x 5 languages and applyStorylineRoleSetup enforces required roles while respecting preferredRole', () => {
  const expectedIds: StorylineId[] = [
    'random_dramatic',
    'classic_deduction',
    'twin_seers',
    'forbidden_lovers',
    'wolf_civil_war',
    'jester_mindgame',
    'silent_night_paranoia',
    'mayor_coup',
  ];
  const langs: Language[] = ['vi', 'en', 'fr', 'es', 'ja'];

  assert.equal(STORYLINE_LIST.length, 8);
  for (const id of expectedIds) {
    const meta = STORYLINE_CATALOG[id];
    assert.ok(meta, `Missing storyline ${id}`);
    for (const lang of langs) {
      assert.ok(meta.label[lang]?.trim().length > 0, `Missing label for ${id}.${lang}`);
      assert.ok(meta.description[lang]?.trim().length > 0, `Missing desc for ${id}.${lang}`);
    }
  }

  // 8-player deck with human preferredRole = 'hunter' + storyline 'wolf_civil_war' -> adds wolf_pup while preserving deck[0] = 'hunter' and exact wolf count!
  const base8 = assignPreferredRoleToDeck(generateBalancedRoster(8), 'hunter');
  const wolfWarDeck = applyStorylineRoleSetup(base8, 'wolf_civil_war', 8, 'hunter');
  assert.equal(wolfWarDeck.length, 8);
  assert.equal(wolfWarDeck[0], 'hunter', 'Must preserve preferredRole at seat 0');
  assert.ok(wolfWarDeck.includes('wolf_pup'), 'wolf_civil_war must include wolf_pup');
  assert.equal(
    wolfWarDeck.filter((r) => r === 'werewolf' || r === 'wolf_pup').length,
    base8.filter((r) => r === 'werewolf' || r === 'wolf_pup').length,
    'Must preserve exact wolf faction count'
  );

  const jesterDeck = applyStorylineRoleSetup(base8, 'jester_mindgame', 8, 'hunter');
  assert.equal(jesterDeck[0], 'hunter');
  assert.ok(jesterDeck.includes('tanner'), 'jester_mindgame must include tanner');

  // random_dramatic resolves secretly to a compatible concrete storyline
  const players = makeRoster([
    ['u1', 'Bạn', 'villager'],
    ['b1', 'Đức Huy', 'werewolf'],
    ['b2', 'Minh Hoàng', 'seer'],
    ['b3', 'Thảo My', 'bodyguard'],
    ['b4', 'Tuấn Kiệt', 'witch'],
    ['b5', 'Bảo Châu', 'cupid'],
    ['b6', 'Gia Bảo', 'tanner'],
  ]);
  const brain = createAIMatchBrain(players, 'random_dramatic', 'u1', makeSeededRng(42));
  assert.notEqual(brain.activeStoryline, 'random_dramatic');
  assert.equal(Object.keys(brain.personas).length, 6);
  assert.ok(new Set(Object.values(brain.personas)).size >= 4, 'Bots must get varied personas');
});

test('[SmartAI #1] Zero Villager Telepathy: unclaimed hidden wolf is NOT auto-targeted 72% by villagers', () => {
  const players = makeRoster([
    ['u1', 'Bạn', 'villager'],
    ['w1', 'Sói Ẩn', 'werewolf'],
    ['v1', 'Dân 1', 'villager'],
    ['v2', 'Dân 2', 'villager'],
    ['v3', 'Dân 3', 'villager'],
    ['v4', 'Dân 4', 'villager'],
    ['v5', 'Dân 5', 'villager'],
  ]);

  const rng = makeSeededRng(2026);
  let totalVillagerVotes = 0;
  let votesOnHiddenWolf = 0;

  for (let i = 0; i < 120; i++) {
    const brain = createAIMatchBrain(players, 'classic_deduction', 'u1', rng);
    // Even if legacy caller passes knownWolfIds=['w1'], Villagers with brain MUST NOT telepathically target w1 without a public Seer claim!
    const votes = computeSmartBotDayVotes(players, ['w1'], null, null, brain);
    for (const v of votes) {
      if (v.voterId.startsWith('v')) {
        totalVillagerVotes++;
        if (v.targetId === 'w1') votesOnHiddenWolf++;
      }
    }
  }

  const rate = votesOnHiddenWolf / totalVillagerVotes;
  assert.ok(
    rate < 0.3,
    `Expected ~16.7% uniform vote rate on unclaimed hidden wolf (zero telepathy), got ${(rate * 100).toFixed(1)}%`
  );
});

test('[SmartAI #2] Traitor (Kẻ Phản Bội) NEVER self-sabotages Werewolves in voting (with brain AND legacy mode)', () => {
  const players = makeRoster([
    ['u1', 'Bạn', 'villager'],
    ['tr', 'Kẻ Phản Bội', 'traitor'],
    ['w1', 'Sói Chúa', 'werewolf'],
    ['se', 'Tiên Tri', 'seer'],
    ['v1', 'Dân 1', 'villager'],
    ['v2', 'Dân 2', 'villager'],
  ]);

  // Case A: With AIMatchBrain — Seer publicly accuses w1 as 'wolf'
  const rng = makeSeededRng(77);
  const brain = createAIMatchBrain(players, 'classic_deduction', 'u1', rng);
  brain.publicClaims.push({
    speakerId: 'se',
    claimedRole: 'seer',
    round: 1,
    targetId: 'w1',
    checkResult: 'wolf',
  });
  adjustPublicSuspicion(brain, 'w1', 45);

  let traitorCounterVotedSeer = 0;
  for (let i = 0; i < 80; i++) {
    const votes = computeSmartBotVotes(brain, players, { rng });
    const trVote = votes.find((v) => v.voterId === 'tr');
    assert.ok(trVote);
    assert.notEqual(
      trVote.targetId,
      'w1',
      'Traitor must NEVER self-sabotage an accused/inferred Werewolf!'
    );
    if (trVote.targetId === 'se') traitorCounterVotedSeer++;
  }
  assert.ok(
    traitorCounterVotedSeer >= 60,
    `Expected Traitor to counter-vote claimed Seer, got ${traitorCounterVotedSeer}/80`
  );

  // Case B: Legacy computeSmartBotDayVotes (no brain) with knownWolfIds=['w1']
  for (let i = 0; i < 80; i++) {
    const legacyVotes = computeSmartBotDayVotes(players, ['w1']);
    const trVote = legacyVotes.find((v) => v.voterId === 'tr');
    assert.ok(trVote);
    assert.notEqual(
      trVote.targetId,
      'w1',
      'Legacy computeSmartBotDayVotes must also prevent Traitor from lynching knownWolfIds!'
    );
  }
});

test('[SmartAI #3] Bot Seer tracks BOTH wolf and good checks and NEVER re-inspects an already-checked innocent', () => {
  const players = makeRoster([
    ['u1', 'Bạn', 'villager', { isMayor: true }],
    ['se', 'Bot Tiên Tri', 'seer'],
    ['w1', 'Ma Sói', 'werewolf'],
    ['v1', 'Dân 1', 'villager'],
    ['v2', 'Dân 2', 'villager'],
    ['v3', 'Dân 3', 'villager'],
  ]);

  const rng = makeSeededRng(99);
  const brain = createAIMatchBrain(players, 'classic_deduction', 'u1', rng);

  // Pre-record an innocent ('good') check on v1 and a 'wolf' check on w1
  recordBotSeerInspection(brain, 'se', 'v1', false);
  recordBotSeerInspection(brain, 'se', 'w1', true);

  const inspectedIds = new Set<string>(['v1', 'w1']);
  // Next 3 nights: Bot Seer must inspect the remaining 3 unchecked living players (u1, v2, v3) with ZERO repeats!
  for (let round = 2; round <= 4; round++) {
    const act = computeSmartBotNightAction(brain, 'seer', players, {}, {
      round,
      wolfPupFrenzy: false,
      humanPlayerId: 'u1',
      rng,
    });
    assert.ok(act.seerTargetId, `Seer must pick a target on Night ${round}`);
    assert.equal(
      inspectedIds.has(act.seerTargetId),
      false,
      `Bot Seer re-inspected already-checked player ${act.seerTargetId}!`
    );
    inspectedIds.add(act.seerTargetId);
  }

  assert.equal(brain.seerChecksByBot.se.v1, 'good');
  assert.equal(brain.seerChecksByBot.se.w1, 'wolf');
  assert.equal(Object.keys(brain.seerChecksByBot.se).length, 5);
});

test('[SmartAI #4] Bot Witch heals on Round 3+ and NEVER randomly poisons un-suspected innocents', () => {
  const players = makeRoster([
    ['u1', 'Bạn', 'villager', { isMayor: true }],
    ['wt', 'Phù Thủy', 'witch'],
    ['w1', 'Ma Sói', 'werewolf'],
    ['v1', 'Dân 1', 'villager'],
    ['v2', 'Dân 2', 'villager'],
    ['v3', 'Dân 3', 'villager'],
  ]);

  // 1. Round 3+ Heal works (fixes round <= 2 0% heal bug!)
  let healedOnRound3Plus = 0;
  for (let i = 0; i < 40; i++) {
    const rng = makeSeededRng(300 + i);
    const brain = createAIMatchBrain(players, 'classic_deduction', 'u1', rng);
    const act = computeSmartBotNightAction(
      brain,
      'witch',
      players,
      { wolfTargetId: 'u1' },
      { round: 4, wolfPupFrenzy: false, humanPlayerId: 'u1', rng }
    );
    if (act.witchHealTargetId === 'u1') healedOnRound3Plus++;
  }
  assert.ok(
    healedOnRound3Plus >= 30,
    `Expected Bot Witch to reliably heal Mayor on Round 4, got ${healedOnRound3Plus}/40`
  );

  // 2. Zero blind random Poison on un-suspected innocents
  for (let i = 0; i < 80; i++) {
    const rng = makeSeededRng(500 + i);
    const brain = createAIMatchBrain(players, 'classic_deduction', 'u1', rng);
    const act = computeSmartBotNightAction(
      brain,
      'witch',
      players,
      { wolfTargetId: 'v3' },
      { round: 3, wolfPupFrenzy: false, humanPlayerId: 'u1', rng }
    );
    assert.equal(
      act.witchPoisonTargetId,
      undefined,
      'Bot Witch must NOT blindly poison random un-suspected players!'
    );
  }

  // 3. DOES Poison when a player has high publicSuspicion (e.g. exposed Fake-Seer / public suspect)
  const rngPoison = makeSeededRng(777);
  const brainWithSuspect = createAIMatchBrain(players, 'silent_night_paranoia', 'u1', rngPoison);
  adjustPublicSuspicion(brainWithSuspect, 'w1', 55);
  const poisonAct = computeSmartBotNightAction(
    brainWithSuspect,
    'witch',
    players,
    { wolfTargetId: 'v3' },
    { round: 2, wolfPupFrenzy: false, humanPlayerId: 'u1', rng: rngPoison }
  );
  assert.equal(poisonAct.witchPoisonTargetId, 'w1');
});

test('[SmartAI #5] twin_seers storyline triggers a real vs fake Seer counter-claim conflict in staggered discussion beats', () => {
  const players = makeRoster([
    ['u1', 'Bạn', 'villager'],
    ['se', 'Bảo Châu', 'seer'],
    ['w1', 'Đức Huy', 'werewolf'],
    ['v1', 'Thảo My', 'bodyguard'],
    ['v2', 'Minh Hoàng', 'witch'],
    ['v3', 'Tuấn Kiệt', 'villager'],
  ]);

  const rng = makeSeededRng(101);
  const brain = createAIMatchBrain(players, 'twin_seers', 'u1', rng);
  assert.equal(brain.activeStoryline, 'twin_seers');

  const beats = generateScheduledDiscussionBeats(brain, {
    players,
    round: 1,
    lang: 'vi',
    killedNames: ['Ai Đó'],
    dayDiscussSec: 35,
    seerInspection: { playerId: 'v3', roleId: 'villager', isWerewolf: false },
    rng,
  });

  assert.ok(beats.length >= 4 && beats.length <= 6, `Expected 4-6 beats, got ${beats.length}`);
  // Strictly increasing stagger delays
  for (let i = 1; i < beats.length; i++) {
    assert.ok(beats[i].delayMs > beats[i - 1].delayMs, 'Beat delays must be strictly staggered');
  }

  const seerClaims = beats.filter((b) => b.claimedRole === 'seer');
  assert.equal(seerClaims.length, 2, 'twin_seers must produce BOTH real Seer and fake Wolf Seer claims');
  assert.ok(seerClaims.some((b) => b.speakerId === 'se'), 'Real Seer must claim');
  assert.ok(seerClaims.some((b) => b.speakerId === 'w1'), 'Fake-Seer Wolf must counter-claim');

  // Public claims memory also records both Seer claims
  assert.equal(
    brain.publicClaims.filter((c) => c.claimedRole === 'seer').length,
    2
  );
});

test('[SmartAI #6] forbidden_lovers Cupid pairs 1 Werewolf + 1 Villager', () => {
  const players = makeRoster([
    ['u1', 'Bạn', 'villager'],
    ['cp', 'Cupid', 'cupid'],
    ['w1', 'Sói Một', 'werewolf'],
    ['w2', 'Sói Hai', 'wolf_pup'],
    ['v1', 'Dân 1', 'seer'],
    ['v2', 'Dân 2', 'bodyguard'],
  ]);

  for (let i = 0; i < 30; i++) {
    const rng = makeSeededRng(900 + i);
    const brain = createAIMatchBrain(players, 'forbidden_lovers', 'u1', rng);
    assert.equal(brain.activeStoryline, 'forbidden_lovers');

    const act = computeAutoGMBotNightStepAction('cupid', players, {}, {
      round: 1,
      wolfPupFrenzy: false,
      humanPlayerId: 'u1',
      brain,
    });
    assert.ok(act.cupidLovers && act.cupidLovers.length === 2);
    const p1 = players.find((p) => p.id === act.cupidLovers![0])!;
    const p2 = players.find((p) => p.id === act.cupidLovers![1])!;
    const isWolf1 = p1.roleId === 'werewolf' || p1.roleId === 'wolf_pup';
    const isWolf2 = p2.roleId === 'werewolf' || p2.roleId === 'wolf_pup';
    assert.notEqual(
      isWolf1,
      isWolf2,
      `forbidden_lovers must pair 1 Wolf + 1 Villager, got ${p1.roleId} + ${p2.roleId}`
    );
    assert.equal(brain.cupidBiasApplied, true);
  }
});

test('[SmartAI #7] generateHumanChatResponses responds to Vietnamese accusation, role claim & vouch and updates publicSuspicion & publicClaims', () => {
  const players = makeRoster([
    ['u1', 'Bạn', 'villager'],
    ['b1', 'Minh Hoàng', 'werewolf'],
    ['b2', 'Thảo My', 'seer'],
    ['b3', 'Tuấn Kiệt', 'villager'],
    ['b4', 'Bảo Châu', 'bodyguard'],
  ]);

  const rng = makeSeededRng(55);
  const brain = createAIMatchBrain(players, 'classic_deduction', 'u1', rng);
  const beforeSusp = brain.publicSuspicion.b1;

  // 1. Vietnamese accusation
  const accuseReplies = generateHumanChatResponses(
    brain,
    'Mình nghi Minh Hoàng là sói',
    players,
    1,
    'vi',
    rng
  );
  assert.ok(accuseReplies.length >= 1 && accuseReplies.length <= 2);
  assert.equal(accuseReplies[0].speakerId, 'b1', 'Accused bot Minh Hoàng should respond first');
  assert.ok(
    accuseReplies[0].delayMs >= 1400 && accuseReplies[0].delayMs <= 2400,
    `Expected reply delay in 1400..2400ms, got ${accuseReplies[0].delayMs}`
  );
  assert.ok(
    brain.publicSuspicion.b1 > beforeSusp,
    'Human accusation must raise publicSuspicion on Minh Hoàng'
  );

  // 2. Vietnamese vouch (must NOT falsely trigger villager self-claim!)
  const beforeVouch = brain.publicSuspicion.b4;
  const vouchReplies = generateHumanChatResponses(
    brain,
    'Mình tin Bảo Châu là dân',
    players,
    1,
    'vi',
    rng
  );
  assert.ok(vouchReplies.length >= 1);
  assert.ok(brain.publicSuspicion.b4 < beforeVouch, 'Human vouch must lower publicSuspicion');
  assert.equal(
    brain.publicClaims.some((c) => c.speakerId === 'u1' && c.claimedRole === 'villager'),
    false,
    'Vouching "Bảo Châu là dân" must NOT record a human self-claim'
  );

  // 3. Human claims Seer -> real bot Seer immediately counter-challenges and updates publicClaims!
  const claimReplies = generateHumanChatResponses(
    brain,
    'Tôi là tiên tri, soi Minh Hoàng là sói',
    players,
    2,
    'vi',
    rng
  );
  assert.ok(
    brain.publicClaims.some(
      (c) =>
        c.speakerId === 'u1' &&
        c.claimedRole === 'seer' &&
        c.targetId === 'b1' &&
        c.checkResult === 'wolf'
    ),
    'Human Seer claim with target must be recorded in brain.publicClaims'
  );
  assert.equal(
    claimReplies[0].speakerId,
    'b2',
    'Real bot Seer must immediately challenge a rival human Seer claim'
  );
});

test('[SmartAI #8] Ghost Spectator timer (>= 4.5s active, 1.8s inactive), prepareNightStartForHuman & buildNightSkillCutsceneForStep', () => {
  const players = makeRoster([
    ['u1', 'Bạn', 'villager', { isAlive: false }],
    ['bg', 'Bảo Vệ', 'bodyguard'],
    ['w1', 'Ma Sói', 'werewolf'],
    ['wt', 'Phù Thủy', 'witch'],
    ['se', 'Tiên Tri', 'seer', { isAlive: false }],
  ]);

  const schedule = buildAutoGMNightSchedule(players, 2, DEFAULT_TIMER_CONFIG, 'u1');
  const activeStep = schedule.find((s) => s.key === 'werewolf')!;
  const inactiveStep = schedule.find((s) => s.key === 'seer')!;

  assert.equal(activeStep.hasLivingActor, true);
  assert.equal(inactiveStep.hasLivingActor, false);

  // Supports both (step, myIdx, currIdx, isGhost) and (step, round, timerConfig, isGhost)
  assert.ok(
    getStepInitialTimerSeconds(activeStep, -1, 0, true) >= 4.5,
    'Ghost spectator must get >= 4.5s for active steps'
  );
  assert.ok(
    getStepInitialTimerSeconds(activeStep, 2, DEFAULT_TIMER_CONFIG, true) >= 4.5,
    'Ghost spectator must get >= 4.5s when passing timerConfig'
  );
  assert.equal(
    getStepInitialTimerSeconds(inactiveStep, -1, 0, true),
    1.8,
    'Ghost spectator must get 1.8s for inactive steps'
  );

  // prepareNightStartForHuman when human is dead Ghost uses Ghost timer
  const preparedGhost = prepareNightStartForHuman(players, 2, DEFAULT_TIMER_CONFIG, 'u1');
  assert.equal(preparedGhost.initialStepIndex, 0);
  assert.ok(
    preparedGhost.initialTimerSec >= 4.5,
    `Expected Ghost initialTimerSec >= 4.5s, got ${preparedGhost.initialTimerSec}`
  );

  // buildNightSkillCutsceneForStep emits BOTH witch_heal and witch_poison when Witch uses both!
  const witchCutscenes = buildNightSkillCutsceneForStep({
    stepKey: 'witch',
    players,
    actions: { witchHealTargetId: 'bg', witchPoisonTargetId: 'w1' },
    round: 2,
  });
  assert.deepEqual(
    witchCutscenes.map((c) => c.kind),
    ['witch_heal', 'witch_poison']
  );

  // Seer cutscene strictly hides alignment unless includeSeerAlignment === true
  const livingSeerPlayers = players.map((p) => (p.id === 'se' ? { ...p, isAlive: true } : p));
  const hiddenSeerCutscene = buildNightSkillCutsceneForStep({
    stepKey: 'seer',
    players: livingSeerPlayers,
    actions: { seerTargetId: 'w1' },
    round: 2,
    includeSeerAlignment: false,
  });
  assert.equal(hiddenSeerCutscene[0].seerIsWolf, null);

  const ghostSeerCutscene = buildNightSkillCutsceneForStep({
    stepKey: 'seer',
    players: livingSeerPlayers,
    actions: { seerTargetId: 'w1' },
    round: 2,
    includeSeerAlignment: true,
  });
  assert.equal(ghostSeerCutscene[0].seerIsWolf, true);
});

test('[SmartAI #9] Round outcome tracking, Wolf Pup bussing, Gallows Defense, Wolf prey scoring & Hunter instigator shot', () => {
  const players = makeRoster([
    ['u1', 'Bạn', 'villager'],
    ['w1', 'Sói Chúa', 'werewolf'],
    ['wp', 'Sói Con', 'wolf_pup'],
    ['hu', 'Thợ Săn', 'hunter'],
    ['se', 'Tiên Tri', 'seer'],
    ['v1', 'Dân 1', 'villager'],
  ]);

  const rng = makeSeededRng(2025);
  const brain = createAIMatchBrain(players, 'wolf_civil_war', 'u1', rng);

  // 1. Wolf Pup civil war bussing when Wolf Pup has pressure
  adjustPublicSuspicion(brain, 'wp', 45);
  const votes = computeSmartBotVotes(brain, players, {
    currentVotes: [
      { voterId: 'u1', targetId: 'wp' },
      { voterId: 'se', targetId: 'wp' },
    ],
    rng,
  });
  assert.equal(
    votes.find((v) => v.voterId === 'w1')?.targetId,
    'wp',
    'In wolf_civil_war, alpha wolf should bus pressured Wolf Pup to unleash double-kill frenzy'
  );

  // 2. Gallows defense when Hunter leads votes -> threatens revenge & claims Hunter
  const defense = generateGallowsDefenseBeat(brain, {
    players,
    votes: [
      { voterId: 'w1', targetId: 'hu' },
      { voterId: 'v1', targetId: 'hu' },
    ],
    round: 2,
    lang: 'vi',
    rng,
  });
  assert.ok(defense);
  assert.equal(defense.speakerId, 'hu');
  assert.equal(defense.delayMs, 2500);
  assert.equal(defense.claimedRole, 'hunter');

  // 3. recordRoundPublicOutcome updates voteHistory & suspicion, and Hunter targets lynch instigator (zero telepathy!)
  recordRoundPublicOutcome(brain, {
    round: 2,
    votes: [
      { voterId: 'v1', targetId: 'hu' },
      { voterId: 'u1', targetId: 'se' },
    ],
    lynchedId: 'hu',
    lynchedRoleId: 'hunter',
  });
  assert.ok(brain.publicSuspicion.v1 > 0, 'Pushing a mislynched Villager raises suspicion');
  const hunterShot = pickSmartBotHunterTarget(
    players.map((p) => (p.id === 'hu' ? { ...p, isAlive: false } : p)),
    { ...players[3], isAlive: false },
    ['w1'], // Even if hidden wolf is passed, brain mode ignores telepathy and shoots lynch instigator v1!
    null,
    brain
  );
  assert.equal(
    hunterShot?.id,
    'v1',
    'Smart Bot Hunter must shoot lynch instigator v1 instead of telepathically shooting hidden w1'
  );

  // 4. Wolf prey scoring prefers uncontested revealed Seer over high-suspicion scapegoat
  const preyBrain = createAIMatchBrain(players, 'classic_deduction', 'u1', makeSeededRng(5));
  preyBrain.publicClaims.push({ speakerId: 'se', claimedRole: 'seer', round: 1 });
  adjustPublicSuspicion(preyBrain, 'v1', 50); // scapegoat / suspected Tanner
  let seerBites = 0;
  let scapegoatBites = 0;
  for (let i = 0; i < 40; i++) {
    const pick = suggestWolfPackTargets(preyBrain, players, false, makeSeededRng(1000 + i));
    if (pick.primaryTargetId === 'se') seerBites++;
    if (pick.primaryTargetId === 'v1') scapegoatBites++;
  }
  assert.ok(seerBites > scapegoatBites, 'Wolves should prioritize revealed Seer over high-suspicion scapegoat');
  assert.equal(scapegoatBites, 0, 'Wolves should avoid biting high-suspicion scapegoat (-40)');
});

test('[SmartAI #10] Cross-faction Lovers defend each other in voting & discussion beats never accuse a speaker who just spoke of being quiet', () => {
  const players = makeRoster([
    ['u1', 'Bạn', 'villager'],
    ['w1', 'Sói Tình', 'werewolf', { loverId: 'v1' }],
    ['v1', 'Dân Tình', 'villager', { loverId: 'w1' }],
    ['w2', 'Sói Lẻ', 'werewolf'],
    ['v2', 'Thám Tử', 'villager'],
    ['v3', 'Bảo Vệ', 'bodyguard'],
  ]);

  const rng = makeSeededRng(404);
  const brain = createAIMatchBrain(players, 'forbidden_lovers', 'u1', rng);

  // w2 publicly accuses v1 -> w1 (cross-faction Wolf Lover of v1) MUST protect v1 and vote against threatener w2!
  const votes = computeSmartBotVotes(brain, players, {
    chatSignals: {
      suspectsByVoter: { w2: ['v1'] },
      alliesByVoter: {},
      suspectsSilentVoters: [],
      silentPlayerIds: [],
    },
    rng,
  });
  assert.equal(
    votes.find((v) => v.voterId === 'w1')?.targetId,
    'w2',
    'Cross-faction Wolf Lover must vote against whoever threatens their Lover'
  );
  assert.equal(
    votes.find((v) => v.voterId === 'v1')?.targetId,
    'w2',
    'Cross-faction Villager Lover must vote against whoever threatens their Lover'
  );

  // Round 2 quiet-seat check in discussion beats must NEVER accuse someone who already spoke in an earlier beat!
  const enBrain = createAIMatchBrain(players, 'classic_deduction', 'u1', makeSeededRng(808));
  const enBeats = generateScheduledDiscussionBeats(enBrain, {
    players,
    round: 2,
    lang: 'en',
    killedNames: [],
    dayDiscussSec: 35,
    rng: makeSeededRng(808),
  });
  assert.ok(enBeats.length >= 4);
  const spokenBefore = new Set<string>();
  for (const beat of enBeats) {
    if (/hasn’t spoken|quiet|chưa lên tiếng|im lặng/i.test(beat.text)) {
      for (const prevName of spokenBefore) {
        assert.equal(
          beat.text.includes(prevName),
          false,
          `Beat accused ${prevName} of silence even though they already spoke earlier: ${beat.text}`
        );
      }
    }
    spokenBefore.add(beat.speakerName);
  }
});

