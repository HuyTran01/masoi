import test from 'node:test';
import assert from 'node:assert/strict';
import { RealtimeRoomManager } from './realtimeRooms.ts';
import { CAMPFIRE_ABSTAIN_ID } from '../game/agrouMechanics.ts';

test('OnlineMatchEngine enforces strict zero-leak per-viewer projections across all roles and Ghost chat', () => {
  const mgr = new RealtimeRoomManager();
  const t0 = 1_700_000_000_000;

  mgr.createOrJoinRoom('ZERO-01', { id: 'u_wolf1', name: 'Sói Một', avatar: '🐺', elo: 1600 }, { villageSize: 6 });
  mgr.createOrJoinRoom('ZERO-01', { id: 'u_wolf2', name: 'Sói Hai', avatar: '🔥', elo: 1600 });
  mgr.createOrJoinRoom('ZERO-01', { id: 'u_guard', name: 'Bảo Vệ', avatar: '🛡️', elo: 1600 });
  mgr.createOrJoinRoom('ZERO-01', { id: 'u_witch', name: 'Phù Thủy', avatar: '🧪', elo: 1600 });
  mgr.createOrJoinRoom('ZERO-01', { id: 'u_seer', name: 'Tiên Tri', avatar: '🔮', elo: 1600 });
  mgr.createOrJoinRoom('ZERO-01', { id: 'u_vil', name: 'Dân Làng', avatar: '🧑‍🌾', elo: 1600 });

  const started = mgr.startMatch('ZERO-01', 'u_wolf1', {
    now: t0,
    customRoles: {
      u_wolf1: 'werewolf',
      u_wolf2: 'wolf_pup',
      u_guard: 'bodyguard',
      u_witch: 'witch',
      u_seer: 'seer',
      u_vil: 'villager',
    },
  });
  assert.equal(started.ok, true);

  // Step 0: Bodyguard turn
  const vilView = mgr.getMatchViewForUser('ZERO-01', 'u_vil', t0)!;
  const wolf1View = mgr.getMatchViewForUser('ZERO-01', 'u_wolf1', t0)!;
  const guardView = mgr.getMatchViewForUser('ZERO-01', 'u_guard', t0)!;

  assert.equal(guardView.currentNightStep?.key, 'bodyguard');
  assert.equal(guardView.isMyNightTurn, true);
  assert.equal(vilView.isMyNightTurn, false);
  assert.equal(wolf1View.isMyNightTurn, false);

  // Villager must NEVER see any other player's true role
  assert.equal(
    vilView.players.every((p) => p.roleId === 'villager'),
    true,
    'Living villager must see all other players masked as villager'
  );
  assert.equal(vilView.wolfPackPicks, null);
  assert.deepEqual(vilView.dyingWolfVictimIds, []);
  assert.equal(vilView.mySeerInspection, null);

  // Wolf 1 sees packmate Wolf 2, but NEVER sees Guard/Witch/Seer
  const wolf1Roles = Object.fromEntries(wolf1View.players.map((p) => [p.id, p.roleId]));
  assert.equal(wolf1Roles.u_wolf1, 'werewolf');
  assert.equal(wolf1Roles.u_wolf2, 'wolf_pup');
  assert.equal(wolf1Roles.u_seer, 'villager');
  assert.equal(wolf1Roles.u_witch, 'villager');
  assert.equal(wolf1Roles.u_guard, 'villager');

  // Guard protects u_seer and confirms -> advances immediately to werewolf step
  assert.equal(
    mgr.submitNightAction('ZERO-01', 'u_guard', { actionType: 'guard', targetId: 'u_seer' }, t0 + 1000).ok,
    true
  );
  // Villager cannot submit night action on Guard's turn
  assert.equal(
    mgr.submitNightAction('ZERO-01', 'u_vil', { actionType: 'guard', targetId: 'u_vil' }, t0 + 1100).ok,
    false
  );
  assert.equal(
    mgr.submitNightAction('ZERO-01', 'u_guard', { actionType: 'confirm_done' }, t0 + 2000).ok,
    true
  );

  // Step 1: Werewolf step -> wolves see wolfPackPicks; villager & witch see null
  assert.equal(
    mgr.submitNightAction('ZERO-01', 'u_wolf1', { actionType: 'wolf_bite', targetId: 'u_seer' }, t0 + 3000).ok,
    true
  );
  const wolf2DuringHunt = mgr.getMatchViewForUser('ZERO-01', 'u_wolf2', t0 + 3000)!;
  const vilDuringHunt = mgr.getMatchViewForUser('ZERO-01', 'u_vil', t0 + 3000)!;
  assert.equal(wolf2DuringHunt.wolfPackPicks?.u_wolf1?.primary, 'u_seer');
  assert.equal(vilDuringHunt.wolfPackPicks, null);

  // Wolf 1 confirms, Wolf 2 hasn't confirmed yet -> must stay on werewolf step!
  assert.equal(
    mgr.submitNightAction('ZERO-01', 'u_wolf1', { actionType: 'confirm_done' }, t0 + 3500).ok,
    true
  );
  assert.equal(mgr.getMatchState('ZERO-01')?.nightStepIndex, 1);

  // Wolf 2 bites u_vil and both confirm (wait: wolf1 already confirmed, wolf2 confirms -> advances to witch!)
  assert.equal(
    mgr.submitNightAction('ZERO-01', 'u_wolf2', { actionType: 'wolf_bite', targetId: 'u_seer' }, t0 + 3600).ok,
    true
  );
  assert.equal(
    mgr.submitNightAction('ZERO-01', 'u_wolf2', { actionType: 'confirm_done' }, t0 + 3700).ok,
    true
  );

  // Step 2: Witch step — because Bodyguard shielded u_seer, dyingWolfVictimIds MUST be empty (zero meta-leak!)
  const witchView = mgr.getMatchViewForUser('ZERO-01', 'u_witch', t0 + 4000)!;
  assert.equal(witchView.currentNightStep?.key, 'witch');
  assert.deepEqual(witchView.dyingWolfVictimIds, []);
  // Witch cannot heal someone who isn't dying
  assert.equal(
    mgr.submitNightAction('ZERO-01', 'u_witch', { actionType: 'witch_heal', targetId: 'u_seer' }, t0 + 4100).ok,
    false
  );
  // Witch poisons u_vil and confirms
  assert.equal(
    mgr.submitNightAction('ZERO-01', 'u_witch', { actionType: 'witch_poison', targetId: 'u_vil' }, t0 + 4200).ok,
    true
  );
  assert.equal(
    mgr.submitNightAction('ZERO-01', 'u_witch', { actionType: 'confirm_done' }, t0 + 4300).ok,
    true
  );

  // Step 3: Seer step -> inspects u_wolf2 (wolf_pup), gets immediate private feedback, cannot inspect a 2nd target
  assert.equal(
    mgr.submitNightAction('ZERO-01', 'u_seer', { actionType: 'seer_inspect', targetId: 'u_wolf2' }, t0 + 5000).ok,
    true
  );
  assert.equal(
    mgr.submitNightAction('ZERO-01', 'u_seer', { actionType: 'seer_inspect', targetId: 'u_wolf1' }, t0 + 5100).ok,
    false,
    'Seer cannot inspect twice in the same night'
  );
  const seerView = mgr.getMatchViewForUser('ZERO-01', 'u_seer', t0 + 5200)!;
  const witchDuringSeer = mgr.getMatchViewForUser('ZERO-01', 'u_witch', t0 + 5200)!;
  assert.equal(seerView.mySeerInspection?.playerId, 'u_wolf2');
  assert.equal(seerView.mySeerInspection?.isWerewolf, true);
  assert.equal(witchDuringSeer.mySeerInspection, null);

  // Seer confirms -> Dawn resolves! u_vil died from Witch poison, u_seer survived from Bodyguard
  assert.equal(
    mgr.submitNightAction('ZERO-01', 'u_seer', { actionType: 'confirm_done' }, t0 + 6000).ok,
    true
  );

  const seerAtDawn = mgr.getMatchViewForUser('ZERO-01', 'u_seer', t0 + 6000)!;
  const deadVilAtDawn = mgr.getMatchViewForUser('ZERO-01', 'u_vil', t0 + 6000)!;

  assert.equal(seerAtDawn.phase, 'day_discussion');
  assert.equal(seerAtDawn.deathCinematic, null, 'Living non-wolf villager gets zero death cinematic leak');
  assert.equal(seerAtDawn.announcement?.privateNotice, null);
  assert.equal(deadVilAtDawn.deathCinematic?.causeType, 'witch_poison');
  assert.ok(deadVilAtDawn.announcement?.privateNotice?.includes('Hồn Ma'));
  // Dead Ghost unlocks all roles
  assert.equal(deadVilAtDawn.players.find((p) => p.id === 'u_wolf1')?.roleId, 'werewolf');
  assert.equal(deadVilAtDawn.players.find((p) => p.id === 'u_witch')?.roleId, 'witch');

  // Ghost chat isolation: dead player cannot post public chat, CAN post ghost chat, living players NEVER see ghost chat
  const deadPublicChat = mgr.postChat('ZERO-01', {
    id: 'c_dead_pub',
    senderId: 'u_vil',
    senderName: 'Dân Làng',
    text: 'Phù thủy giết tôi!',
    timestamp: t0 + 7000,
    isGhost: false,
  });
  assert.equal(deadPublicChat.ok, false);

  const deadGhostChat = mgr.postChat('ZERO-01', {
    id: 'c_dead_ghost',
    senderId: 'u_vil',
    senderName: '👻 Dân Làng',
    text: 'Kênh ma bí mật',
    timestamp: t0 + 7100,
    isGhost: true,
  });
  assert.equal(deadGhostChat.ok, true);

  const livingRoom = mgr.getSanitizedRoomForUser('ZERO-01', 'u_seer')!;
  const ghostRoom = mgr.getSanitizedRoomForUser('ZERO-01', 'u_vil')!;
  assert.equal(livingRoom.chatMessages.some((m) => m.id === 'c_dead_ghost'), false);
  assert.equal(ghostRoom.chatMessages.some((m) => m.id === 'c_dead_ghost'), true);
});

test('Full multi-human progression: Night (Night-Aim Hunter) -> Dawn -> Day Voting (Mayor x2 & Campfire Abstain) -> Game Over & Rematch', () => {
  const mgr = new RealtimeRoomManager();
  const t0 = 1_700_100_000_000;

  // 5-player all-human village: Host (Mayor) = Villager, 1 Werewolf, 1 Hunter, 1 Seer, 1 Witch
  mgr.createOrJoinRoom('FULL-02', { id: 'u_host', name: 'Thị Trưởng', avatar: '👑', elo: 1600 }, { villageSize: 5 });
  mgr.createOrJoinRoom('FULL-02', { id: 'u_wolf', name: 'Sói Chúa', avatar: '🐺', elo: 1600 });
  mgr.createOrJoinRoom('FULL-02', { id: 'u_hunter', name: 'Thợ Săn', avatar: '🎯', elo: 1600 });
  mgr.createOrJoinRoom('FULL-02', { id: 'u_seer', name: 'Tiên Tri', avatar: '🔮', elo: 1600 });
  mgr.createOrJoinRoom('FULL-02', { id: 'u_witch', name: 'Phù Thủy', avatar: '🧪', elo: 1600 });

  const started = mgr.startMatch('FULL-02', 'u_host', {
    now: t0,
    customRoles: {
      u_host: 'villager',
      u_wolf: 'werewolf',
      u_hunter: 'hunter',
      u_seer: 'seer',
      u_witch: 'witch',
    },
  });
  assert.equal(started.ok, true);
  assert.equal(mgr.getMatchState('FULL-02')?.mayorId, 'u_host');

  // Night 1: Hunter wakes FIRST (wakeOrder 18) and chooses "Không ghim" (null)
  assert.equal(mgr.getMatchState('FULL-02')?.nightSchedule[0]?.key, 'hunter');
  assert.equal(mgr.submitNightAction('FULL-02', 'u_hunter', { actionType: 'hunter_mark', targetId: null }, t0 + 900).ok, true);
  assert.equal(mgr.submitNightAction('FULL-02', 'u_hunter', { actionType: 'confirm_done' }, t0 + 950).ok, true);

  // Werewolf bites u_hunter -> Witch sees dyingWolfVictimIds=['u_hunter'], skips -> Seer inspects u_wolf -> Dawn (no live Hunter shot phase!)
  assert.equal(mgr.submitNightAction('FULL-02', 'u_wolf', { actionType: 'wolf_bite', targetId: 'u_hunter' }, t0 + 1000).ok, true);
  assert.equal(mgr.submitNightAction('FULL-02', 'u_wolf', { actionType: 'confirm_done' }, t0 + 1100).ok, true);

  const witchView = mgr.getMatchViewForUser('FULL-02', 'u_witch', t0 + 1200)!;
  assert.deepEqual(witchView.dyingWolfVictimIds, ['u_hunter']);
  assert.equal(mgr.submitNightAction('FULL-02', 'u_witch', { actionType: 'confirm_done' }, t0 + 1300).ok, true);

  assert.equal(mgr.submitNightAction('FULL-02', 'u_seer', { actionType: 'seer_inspect', targetId: 'u_wolf' }, t0 + 1400).ok, true);
  assert.equal(mgr.submitNightAction('FULL-02', 'u_seer', { actionType: 'confirm_done' }, t0 + 1500).ok, true);

  // Dawn goes straight to day_discussion: dead Hunter had "Không ghim" so nobody else dies (4 alive: host, wolf, seer, witch)
  const hunterView = mgr.getMatchViewForUser('FULL-02', 'u_hunter', t0 + 1600)!;
  assert.equal(hunterView.phase, 'day_discussion');
  assert.equal(hunterView.gameResult, null);
  assert.equal(mgr.getMatchState('FULL-02')?.players.filter((p) => p.isAlive).length, 4);

  // Host advances discussion -> day_voting
  assert.equal(mgr.advancePhase('FULL-02', 'u_host', t0 + 3000).ok, true);
  assert.equal(mgr.getMatchState('FULL-02')?.phase, 'day_voting');

  // Day 1 Voting: Test Campfire Abstain majority prevents lynch (host Mayor=2 abstain + seer=1 abstain vs wolf=1 on seer)
  assert.equal(mgr.castVote('FULL-02', 'u_host', CAMPFIRE_ABSTAIN_ID).ok, true);
  assert.equal(mgr.castVote('FULL-02', 'u_seer', CAMPFIRE_ABSTAIN_ID).ok, true);
  assert.equal(mgr.castVote('FULL-02', 'u_wolf', 'u_seer').ok, true);
  assert.equal(mgr.castVote('FULL-02', 'u_witch', 'u_wolf').ok, true);
  assert.equal(mgr.advancePhase('FULL-02', 'u_host', t0 + 4000).ok, true);

  // Nobody lynched -> Night 2 begins with all 4 still alive!
  const night2State = mgr.getMatchState('FULL-02')!;
  assert.equal(night2State.phase, 'night');
  assert.equal(night2State.round, 2);
  assert.equal(night2State.players.filter((p) => p.isAlive).length, 4);
  // BUG-08 Online Parity: Dusk voteBreakdown preserves Campfire Abstain row with Mayor x2 weight (2 + 1 = 3)
  const day1AbstainRow = night2State.duskAnnouncement?.voteBreakdown?.find(
    (row) => row.playerId === CAMPFIRE_ABSTAIN_ID
  );
  assert.ok(day1AbstainRow, 'Online Dusk tie voteBreakdown must preserve __CAMPFIRE_ABSTAIN__ row');
  assert.equal(day1AbstainRow.votes, 3);
  assert.deepEqual(
    day1AbstainRow.voters?.map((v) => v.id),
    ['u_host', 'u_seer']
  );

  // Night 2: the dead Hunter's step has no living actor, so the host fast-forwards it (like a dead Bodyguard)
  assert.equal(mgr.getMatchState('FULL-02')?.nightSchedule[0]?.key, 'hunter');
  assert.equal(mgr.advancePhase('FULL-02', 'u_host', t0 + 4900).ok, true);

  // Wolf bites u_witch, Witch heals herself, Seer skips -> Peaceful Dawn!
  assert.equal(mgr.submitNightAction('FULL-02', 'u_wolf', { actionType: 'wolf_bite', targetId: 'u_witch' }, t0 + 5000).ok, true);
  assert.equal(mgr.submitNightAction('FULL-02', 'u_wolf', { actionType: 'confirm_done' }, t0 + 5100).ok, true);
  assert.equal(mgr.submitNightAction('FULL-02', 'u_witch', { actionType: 'witch_heal', targetId: 'u_witch' }, t0 + 5200).ok, true);
  assert.equal(mgr.submitNightAction('FULL-02', 'u_witch', { actionType: 'confirm_done' }, t0 + 5300).ok, true);
  assert.equal(mgr.submitNightAction('FULL-02', 'u_seer', { actionType: 'confirm_done' }, t0 + 5400).ok, true);

  assert.equal(mgr.getMatchState('FULL-02')?.phase, 'day_discussion');
  assert.equal(mgr.advancePhase('FULL-02', 'u_host', t0 + 6000).ok, true);

  // Day 2 Voting: Mayor x2 tie-breaker breaks 1-vs-1 headcount tie cleanly!
  // u_host (Mayor, weight 2) -> u_wolf (2); u_wolf (1) -> u_seer (1); u_witch (1) -> u_host (1); u_seer unvoted -> auto-abstain (1)
  assert.equal(mgr.castVote('FULL-02', 'u_host', 'u_wolf').ok, true);
  assert.equal(mgr.castVote('FULL-02', 'u_wolf', 'u_seer').ok, true);
  assert.equal(mgr.castVote('FULL-02', 'u_witch', 'u_host').ok, true);
  const duskRes = mgr.advancePhase('FULL-02', 'u_host', t0 + 7000);
  assert.equal(duskRes.ok, true);
  assert.equal(
    mgr.getMatchState('FULL-02')?.duskAnnouncement?.chatMessageText.includes('__CAMPFIRE_ABSTAIN__'),
    false,
    'Dusk announcement must never leak raw CAMPFIRE_ABSTAIN_ID token'
  );
  // BUG-08 Online Parity: Dusk voteBreakdown counts Mayor x2 consistently & preserves auto-abstain row
  const day2Breakdown = mgr.getMatchState('FULL-02')?.duskAnnouncement?.voteBreakdown || [];
  assert.equal(
    day2Breakdown.find((row) => row.playerId === 'u_wolf')?.votes,
    2,
    'Mayor x2 vote weight must be reflected in Dusk voteBreakdown'
  );
  assert.equal(
    day2Breakdown.find((row) => row.playerId === CAMPFIRE_ABSTAIN_ID)?.votes,
    1,
    'Auto-abstained player must appear in Dusk voteBreakdown abstain row'
  );

  // Last wolf lynched -> Villagers win immediately!
  const endViewHost = mgr.getMatchViewForUser('FULL-02', 'u_host', t0 + 7000)!;
  const endViewWolf = mgr.getMatchViewForUser('FULL-02', 'u_wolf', t0 + 7000)!;
  assert.equal(endViewHost.phase, 'game_over');
  assert.equal(endViewHost.gameResult?.winner, 'villagers');
  assert.ok((endViewHost.gameResult?.myEloDelta ?? 0) > 0);
  assert.ok((endViewWolf.gameResult?.myEloDelta ?? 0) < 0);

  // Rematch in the same room!
  const nonHostRestart = mgr.restartMatch('FULL-02', 'u_wolf', { now: t0 + 8000 });
  assert.equal(nonHostRestart.ok, false);
  const rematch = mgr.restartMatch('FULL-02', 'u_host', { now: t0 + 8500 });
  assert.equal(rematch.ok, true);
  const rematchView = mgr.getMatchViewForUser('FULL-02', 'u_host', t0 + 8500)!;
  assert.equal(rematchView.matchId, 2);
  assert.equal(rematchView.round, 1);
  assert.equal(rematchView.phase, 'night');
  assert.equal(rematchView.players.every((p) => p.isAlive), true);
  assert.equal(rematchView.gameResult, null);
});

test('Lazy deadline tick (tickRoom) advances phases deterministically without setInterval', () => {
  const mgr = new RealtimeRoomManager();
  let clock = 1_700_200_000_000;

  mgr.createOrJoinRoom(
    'TICK-03',
    { id: 'u_human', name: 'Dân Thường', avatar: '🧑‍🌾', elo: 1500 },
    {
      villageSize: 4,
      timerConfig: { nightActionSec: 10, dayDiscussSec: 15, dayVoteSec: 12 },
    }
  );
  mgr.fillBots('TICK-03', 'u_human');
  const botIds = mgr.getRoom('TICK-03')!.participants.filter((p) => p.isBot).map((p) => p.id);

  const started = mgr.startMatch('TICK-03', 'u_human', {
    now: clock,
    customRoles: {
      u_human: 'villager',
      [botIds[0]]: 'werewolf',
      [botIds[1]]: 'witch',
      [botIds[2]]: 'seer',
    },
  });
  assert.equal(started.ok, true);

  // Before deadline -> no change
  assert.equal(mgr.tickRoom('TICK-03', clock + 1000).changed, false);

  // Advance step by step purely via phaseEndsAt until day_discussion (or game_over)
  let safety = 0;
  while (mgr.getMatchState('TICK-03')!.phase === 'night' && safety++ < 10) {
    clock = mgr.getMatchState('TICK-03')!.phaseEndsAt;
    const tick = mgr.tickRoom('TICK-03', clock);
    assert.equal(tick.changed, true);
  }

  const afterNight = mgr.getMatchState('TICK-03')!;
  assert.ok(afterNight.phase === 'day_discussion' || afterNight.phase === 'game_over');

  if (afterNight.phase === 'day_discussion') {
    // Advance discussion deadline -> enters day_voting with server-generated bot votes!
    clock = afterNight.phaseEndsAt;
    assert.equal(mgr.tickRoom('TICK-03', clock).changed, true);
    const votingState = mgr.getMatchState('TICK-03')!;
    assert.equal(votingState.phase, 'day_voting');
    assert.ok(votingState.dayVotes.length > 0, 'Bot votes must be computed once on server when day_voting starts');

    // Advance voting deadline -> Dusk resolves cleanly to Night 2 or game_over
    clock = votingState.phaseEndsAt;
    assert.equal(mgr.tickRoom('TICK-03', clock).changed, true);
    const postDusk = mgr.getMatchState('TICK-03')!;
    assert.ok(
      (postDusk.phase === 'night' && postDusk.round === 2) || postDusk.phase === 'game_over'
    );
  }
});

test('Cupid/Doppelganger projection privacy, Seer Traitor stealth, and Doppelganger inheriting a Night-Aim Hunter', () => {
  const mgr = new RealtimeRoomManager();
  const t0 = 1_700_300_000_000;

  mgr.createOrJoinRoom('EDGE-04', { id: 'u_doppel', name: 'Nhân Bản', avatar: '🪞', elo: 1500 }, { villageSize: 6 });
  mgr.createOrJoinRoom('EDGE-04', { id: 'u_cupid', name: 'Cupid', avatar: '💘', elo: 1500 });
  mgr.createOrJoinRoom('EDGE-04', { id: 'u_wolf', name: 'Sói', avatar: '🐺', elo: 1500 });
  mgr.createOrJoinRoom('EDGE-04', { id: 'u_hunter', name: 'Thợ Săn', avatar: '🎯', elo: 1500 });
  mgr.createOrJoinRoom('EDGE-04', { id: 'u_seer', name: 'Tiên Tri', avatar: '🔮', elo: 1500 });
  mgr.createOrJoinRoom('EDGE-04', { id: 'u_traitor', name: 'Tay Sai', avatar: '🗡️', elo: 1500 });

  assert.equal(
    mgr.startMatch('EDGE-04', 'u_doppel', {
      now: t0,
      customRoles: {
        u_doppel: 'doppelganger',
        u_cupid: 'cupid',
        u_wolf: 'werewolf',
        u_hunter: 'hunter',
        u_seer: 'seer',
        u_traitor: 'traitor',
      },
    }).ok,
    true
  );

  // Night 1 Step 0: Doppelganger picks u_hunter
  assert.equal(mgr.submitNightAction('EDGE-04', 'u_doppel', { actionType: 'doppelganger_pick', targetId: 'u_hunter' }, t0 + 100).ok, true);
  assert.equal(mgr.submitNightAction('EDGE-04', 'u_doppel', { actionType: 'confirm_done' }, t0 + 200).ok, true);

  // Step 1: Cupid links u_wolf & u_traitor
  assert.equal(mgr.submitNightAction('EDGE-04', 'u_cupid', { actionType: 'cupid_link', targetId: 'u_wolf', secondTargetId: 'u_traitor' }, t0 + 300).ok, true);
  assert.equal(mgr.submitNightAction('EDGE-04', 'u_cupid', { actionType: 'confirm_done' }, t0 + 400).ok, true);

  // Step 2: Hunter wakes (Night-Aim) and holds fire; a non-Hunter cannot send hunter_mark
  assert.equal(mgr.getMatchState('EDGE-04')?.nightSchedule[2]?.key, 'hunter');
  assert.equal(mgr.submitNightAction('EDGE-04', 'u_wolf', { actionType: 'hunter_mark', targetId: 'u_seer' }, t0 + 420).ok, false);
  assert.equal(mgr.submitNightAction('EDGE-04', 'u_hunter', { actionType: 'hunter_mark', targetId: null }, t0 + 440).ok, true);
  assert.equal(mgr.submitNightAction('EDGE-04', 'u_hunter', { actionType: 'confirm_done' }, t0 + 460).ok, true);

  // Step 3: Wolf bites u_hunter
  assert.equal(mgr.submitNightAction('EDGE-04', 'u_wolf', { actionType: 'wolf_bite', targetId: 'u_hunter' }, t0 + 500).ok, true);
  assert.equal(mgr.submitNightAction('EDGE-04', 'u_wolf', { actionType: 'confirm_done' }, t0 + 600).ok, true);

  // Step 4: Seer inspects Traitor -> isWerewolf=false AND roleId masked to 'villager' (zero Traitor leak!)
  assert.equal(mgr.submitNightAction('EDGE-04', 'u_seer', { actionType: 'seer_inspect', targetId: 'u_traitor' }, t0 + 700).ok, true);
  const seerInspectView = mgr.getMatchViewForUser('EDGE-04', 'u_seer', t0 + 750)!;
  assert.equal(seerInspectView.mySeerInspection?.isWerewolf, false);
  assert.equal(seerInspectView.mySeerInspection?.roleId, 'villager');

  // Seer confirms -> u_hunter dies, Doppelganger inherits Hunter (no stale mark), Dawn goes straight to day_discussion
  assert.equal(mgr.submitNightAction('EDGE-04', 'u_seer', { actionType: 'confirm_done' }, t0 + 800).ok, true);
  const hunterWait = mgr.getMatchState('EDGE-04')!;
  assert.equal(hunterWait.phase, 'day_discussion');
  const inheritedDoppel = hunterWait.players.find((p) => p.id === 'u_doppel')!;
  assert.equal(inheritedDoppel.roleId, 'hunter');
  assert.equal(inheritedDoppel.hunterMarkId, undefined);

  // Verify loverId privacy: outsider u_seer does NOT see loverId; Cupid & lovers DO!
  const seerDuringRevenge = mgr.getMatchViewForUser('EDGE-04', 'u_seer', t0 + 900)!;
  const cupidDuringRevenge = mgr.getMatchViewForUser('EDGE-04', 'u_cupid', t0 + 900)!;
  const wolfDuringRevenge = mgr.getMatchViewForUser('EDGE-04', 'u_wolf', t0 + 900)!;
  assert.equal(seerDuringRevenge.players.some((p) => Boolean(p.loverId)), false);
  assert.equal(cupidDuringRevenge.players.find((p) => p.id === 'u_wolf')?.loverId, 'u_traitor');
  assert.equal(wolfDuringRevenge.players.find((p) => p.id === 'u_wolf')?.loverId, 'u_traitor');

});

test('Night-Aim Hunter online: mark pierces Bodyguard shield, hunterMarkId is private, hunter_mark only accepted from the Hunter on their step', () => {
  const mgr = new RealtimeRoomManager();
  const t0 = 1_700_900_000_000;
  mgr.createOrJoinRoom('HUNT-MARK', { id: 'u_host', name: 'Dân', avatar: '🧑‍🌾', elo: 1500 }, { villageSize: 5 });
  mgr.createOrJoinRoom('HUNT-MARK', { id: 'u_wolf', name: 'Sói', avatar: '🐺', elo: 1500 });
  mgr.createOrJoinRoom('HUNT-MARK', { id: 'u_hunter', name: 'Người Chơi Ba', avatar: '🎯', elo: 1500 });
  mgr.createOrJoinRoom('HUNT-MARK', { id: 'u_seer', name: 'Tiên Tri', avatar: '🔮', elo: 1500 });
  mgr.createOrJoinRoom('HUNT-MARK', { id: 'u_vil', name: 'Dân 2', avatar: '🧑‍🌾', elo: 1500 });
  assert.equal(
    mgr.startMatch('HUNT-MARK', 'u_host', {
      now: t0,
      customRoles: {
        u_host: 'villager',
        u_wolf: 'werewolf',
        u_hunter: 'hunter',
        u_seer: 'seer',
        u_vil: 'villager',
      },
    }).ok,
    true
  );
  const match = mgr.getMatchState('HUNT-MARK')!;
  assert.equal(match.nightSchedule[0]?.key, 'hunter');

  // Only the Hunter may mark, and never themselves / a dead / unknown player
  assert.equal(mgr.submitNightAction('HUNT-MARK', 'u_wolf', { actionType: 'hunter_mark', targetId: 'u_host' }, t0 + 10).ok, false);
  assert.equal(mgr.submitNightAction('HUNT-MARK', 'u_hunter', { actionType: 'hunter_mark', targetId: 'u_hunter' }, t0 + 20).ok, false);
  assert.equal(mgr.submitNightAction('HUNT-MARK', 'u_hunter', { actionType: 'hunter_mark', targetId: 'nobody' }, t0 + 30).ok, false);
  assert.equal(mgr.submitNightAction('HUNT-MARK', 'u_hunter', { actionType: 'hunter_mark', targetId: 'u_vil' }, t0 + 40).ok, true);
  assert.equal(mgr.getMatchViewForUser('HUNT-MARK', 'u_hunter', t0 + 45)!.myNightSelection.targetId, 'u_vil');
  assert.equal(mgr.getMatchViewForUser('HUNT-MARK', 'u_host', t0 + 45)!.myNightSelection.targetId, undefined);
  assert.equal(mgr.submitNightAction('HUNT-MARK', 'u_hunter', { actionType: 'confirm_done' }, t0 + 50).ok, true);

  // Werewolf bites the Hunter; Seer confirms -> Dawn
  assert.equal(mgr.submitNightAction('HUNT-MARK', 'u_wolf', { actionType: 'wolf_bite', targetId: 'u_hunter' }, t0 + 60).ok, true);
  assert.equal(mgr.submitNightAction('HUNT-MARK', 'u_wolf', { actionType: 'confirm_done' }, t0 + 70).ok, true);
  assert.equal(mgr.submitNightAction('HUNT-MARK', 'u_seer', { actionType: 'confirm_done' }, t0 + 80).ok, true);

  const dawn = mgr.getMatchState('HUNT-MARK')!;
  assert.equal(dawn.phase, 'day_discussion');
  assert.equal(dawn.players.find((p) => p.id === 'u_hunter')?.isAlive, false);
  assert.equal(dawn.players.find((p) => p.id === 'u_vil')?.isAlive, false, 'Marked target dies with the Hunter');
  assert.equal(mgr.submitNightAction('HUNT-MARK', 'u_hunter', { actionType: 'hunter_mark', targetId: 'u_host' }, t0 + 90).ok, false);

  // Dawn announcement stays neutral: no Hunter/shot leak in public text
  const ann = mgr.getMatchViewForUser('HUNT-MARK', 'u_host', t0 + 100)!.announcement!;
  const publicText = [ann.headline, ann.gmQuote, ann.chatMessageText, ...ann.publicEvents, ...ann.victims.map((v) => v.tag || '')].join(' ');
  assert.equal(/Thợ Săn|bắn|ghim/i.test(publicText), false, publicText);
});

test('Night-Aim Hunter online: surviving Hunter mark is visible only to the Hunter and dead Ghosts', () => {
  const mgr = new RealtimeRoomManager();
  const t0 = 1_701_000_000_000;
  mgr.createOrJoinRoom('HUNT-PRIV', { id: 'u_host', name: 'Dân', avatar: '🧑‍🌾', elo: 1500 }, { villageSize: 5 });
  mgr.createOrJoinRoom('HUNT-PRIV', { id: 'u_wolf', name: 'Sói', avatar: '🐺', elo: 1500 });
  mgr.createOrJoinRoom('HUNT-PRIV', { id: 'u_hunter', name: 'Thợ Săn', avatar: '🎯', elo: 1500 });
  mgr.createOrJoinRoom('HUNT-PRIV', { id: 'u_seer', name: 'Tiên Tri', avatar: '🔮', elo: 1500 });
  mgr.createOrJoinRoom('HUNT-PRIV', { id: 'u_vil', name: 'Dân 2', avatar: '🧑‍🌾', elo: 1500 });
  mgr.startMatch('HUNT-PRIV', 'u_host', {
    now: t0,
    customRoles: { u_host: 'villager', u_wolf: 'werewolf', u_hunter: 'hunter', u_seer: 'seer', u_vil: 'villager' },
  });
  assert.equal(mgr.submitNightAction('HUNT-PRIV', 'u_hunter', { actionType: 'hunter_mark', targetId: 'u_host' }, t0 + 10).ok, true);
  assert.equal(mgr.submitNightAction('HUNT-PRIV', 'u_hunter', { actionType: 'confirm_done' }, t0 + 20).ok, true);
  // Wolf bites the Seer (not the Hunter) so the Hunter survives with the mark armed
  assert.equal(mgr.submitNightAction('HUNT-PRIV', 'u_wolf', { actionType: 'wolf_bite', targetId: 'u_seer' }, t0 + 30).ok, true);
  assert.equal(mgr.submitNightAction('HUNT-PRIV', 'u_wolf', { actionType: 'confirm_done' }, t0 + 40).ok, true);
  assert.equal(mgr.submitNightAction('HUNT-PRIV', 'u_seer', { actionType: 'confirm_done' }, t0 + 50).ok, true);

  assert.equal(mgr.getMatchState('HUNT-PRIV')!.phase, 'day_discussion');
  const markOf = (viewer: string) =>
    mgr.getMatchViewForUser('HUNT-PRIV', viewer, t0 + 60)!.players.find((p) => p.id === 'u_hunter')?.hunterMarkId;
  assert.equal(markOf('u_hunter'), 'u_host', 'Hunter sees their own mark');
  assert.equal(markOf('u_host'), undefined, 'Living villager must not see the mark');
  assert.equal(markOf('u_wolf'), undefined, 'Living wolf must not see the mark');
  assert.equal(markOf('u_seer'), 'u_host', 'Dead Seer (Ghost) sees everything');
});

test('Zero-Leak & Omniscient Ghost Night Projection: living/unknown get null, dead Ghost sees live night telemetry and skillCutscenes', () => {
  const mgr = new RealtimeRoomManager();
  const t0 = 1_700_400_000_000;

  mgr.createOrJoinRoom('GHOST-05', { id: 'u_ghost', name: 'Hồn Ma', avatar: '👻', elo: 1500 }, { villageSize: 8 });
  mgr.createOrJoinRoom('GHOST-05', { id: 'u_doppel', name: 'Nhân Bản', avatar: '🪞', elo: 1500 });
  mgr.createOrJoinRoom('GHOST-05', { id: 'u_cupid', name: 'Cupid', avatar: '💘', elo: 1500 });
  mgr.createOrJoinRoom('GHOST-05', { id: 'u_guard', name: 'Bảo Vệ', avatar: '🛡️', elo: 1500 });
  mgr.createOrJoinRoom('GHOST-05', { id: 'u_wolf', name: 'Ma Sói', avatar: '🐺', elo: 1500 });
  mgr.createOrJoinRoom('GHOST-05', { id: 'u_witch', name: 'Phù Thủy', avatar: '🧪', elo: 1500 });
  mgr.createOrJoinRoom('GHOST-05', { id: 'u_seer', name: 'Tiên Tri', avatar: '🔮', elo: 1500 });
  mgr.createOrJoinRoom('GHOST-05', { id: 'u_vil', name: 'Dân Làng', avatar: '🧑‍🌾', elo: 1500 });

  assert.equal(
    mgr.startMatch('GHOST-05', 'u_ghost', {
      now: t0,
      customRoles: {
        u_ghost: 'villager',
        u_doppel: 'doppelganger',
        u_cupid: 'cupid',
        u_guard: 'bodyguard',
        u_wolf: 'werewolf',
        u_witch: 'witch',
        u_seer: 'seer',
        u_vil: 'villager',
      },
    }).ok,
    true
  );

  // Zero-leak check BEFORE any death: living Villager, Werewolf, Seer, and unknown viewer ALL get null
  for (const viewerId of ['u_ghost', 'u_vil', 'u_wolf', 'u_seer', 'u_witch', 'u_guard', 'u_unknown_stranger']) {
    const view = mgr.getMatchViewForUser('GHOST-05', viewerId, t0)!;
    assert.equal(view.ghostNightState, null, `${viewerId} must receive ghostNightState === null`);
  }

  // Mark u_ghost dead to verify full Round 1 Ghost omniscient telemetry across all waking roles
  const match = mgr.getMatchState('GHOST-05')!;
  match.players.find((p) => p.id === 'u_ghost')!.isAlive = false;

  // Step 0: Doppelganger
  let ghostView = mgr.getMatchViewForUser('GHOST-05', 'u_ghost', t0 + 100)!;
  assert.ok(ghostView.ghostNightState);
  assert.deepEqual(ghostView.ghostNightState.wakingActorIds, ['u_doppel']);
  assert.equal(mgr.submitNightAction('GHOST-05', 'u_doppel', { actionType: 'doppelganger_pick', targetId: 'u_vil' }, t0 + 150).ok, true);
  assert.equal(mgr.submitNightAction('GHOST-05', 'u_doppel', { actionType: 'confirm_done' }, t0 + 200).ok, true);

  // Step 1: Cupid
  ghostView = mgr.getMatchViewForUser('GHOST-05', 'u_ghost', t0 + 250)!;
  assert.deepEqual(ghostView.ghostNightState?.wakingActorIds, ['u_cupid']);
  assert.equal(
    ghostView.ghostNightState?.skillCutscenes.some(
      (c) => c.kind === 'doppelganger' && c.primaryTargetId === 'u_vil'
    ),
    true
  );
  assert.equal(mgr.submitNightAction('GHOST-05', 'u_cupid', { actionType: 'cupid_link', targetId: 'u_vil', secondTargetId: 'u_seer' }, t0 + 300).ok, true);
  assert.equal(mgr.submitNightAction('GHOST-05', 'u_cupid', { actionType: 'confirm_done' }, t0 + 350).ok, true);

  // Step 2: Bodyguard shields u_seer
  ghostView = mgr.getMatchViewForUser('GHOST-05', 'u_ghost', t0 + 400)!;
  assert.deepEqual(ghostView.ghostNightState?.wakingActorIds, ['u_guard']);
  assert.deepEqual(ghostView.ghostNightState?.liveActions.cupidLovers, ['u_vil', 'u_seer']);
  assert.equal(
    ghostView.ghostNightState?.skillCutscenes.some(
      (c) => c.kind === 'cupid' && c.primaryTargetId === 'u_vil' && c.secondaryTargetId === 'u_seer'
    ),
    true
  );
  assert.equal(mgr.submitNightAction('GHOST-05', 'u_guard', { actionType: 'guard', targetId: 'u_seer' }, t0 + 450).ok, true);
  assert.equal(mgr.submitNightAction('GHOST-05', 'u_guard', { actionType: 'confirm_done' }, t0 + 500).ok, true);

  // Step 3: Werewolf bites u_vil
  ghostView = mgr.getMatchViewForUser('GHOST-05', 'u_ghost', t0 + 550)!;
  assert.deepEqual(ghostView.ghostNightState?.wakingActorIds, ['u_wolf']);
  assert.equal(
    ghostView.ghostNightState?.skillCutscenes.some(
      (c) => c.kind === 'bodyguard' && c.primaryTargetId === 'u_seer'
    ),
    true
  );
  assert.equal(mgr.submitNightAction('GHOST-05', 'u_wolf', { actionType: 'wolf_bite', targetId: 'u_vil' }, t0 + 600).ok, true);

  // Live mid-step check: Ghost sees wolfPackPicks & lethal dyingWolfVictimIds; living roles STILL get null!
  ghostView = mgr.getMatchViewForUser('GHOST-05', 'u_ghost', t0 + 620)!;
  assert.equal(ghostView.ghostNightState?.wolfPackPicks.u_wolf?.targetId, 'u_vil');
  assert.deepEqual(ghostView.ghostNightState?.dyingWolfVictimIds, ['u_vil']);
  assert.equal(mgr.getMatchViewForUser('GHOST-05', 'u_vil', t0 + 620)!.ghostNightState, null);
  assert.equal(mgr.getMatchViewForUser('GHOST-05', 'u_wolf', t0 + 620)!.ghostNightState, null);
  assert.equal(mgr.getMatchViewForUser('GHOST-05', 'u_seer', t0 + 620)!.ghostNightState, null);
  assert.equal(mgr.getMatchViewForUser('GHOST-05', 'u_unknown_stranger', t0 + 620)!.ghostNightState, null);

  assert.equal(mgr.submitNightAction('GHOST-05', 'u_wolf', { actionType: 'confirm_done' }, t0 + 650).ok, true);

  // Step 4: Witch heals u_vil AND poisons u_guard
  ghostView = mgr.getMatchViewForUser('GHOST-05', 'u_ghost', t0 + 700)!;
  assert.deepEqual(ghostView.ghostNightState?.wakingActorIds, ['u_witch']);
  assert.equal(
    ghostView.ghostNightState?.skillCutscenes.some(
      (c) => c.kind === 'werewolf' && c.actorIds.includes('u_wolf') && c.primaryTargetId === 'u_vil'
    ),
    true
  );
  assert.equal(mgr.submitNightAction('GHOST-05', 'u_witch', { actionType: 'witch_heal', targetId: 'u_vil' }, t0 + 750).ok, true);
  assert.equal(mgr.submitNightAction('GHOST-05', 'u_witch', { actionType: 'witch_poison', targetId: 'u_guard' }, t0 + 780).ok, true);
  assert.equal(mgr.submitNightAction('GHOST-05', 'u_witch', { actionType: 'confirm_done' }, t0 + 800).ok, true);

  // Step 5: Seer inspects u_wolf -> Ghost immediately sees seerInspectionTonight & seer cutscene BEFORE confirm_done!
  ghostView = mgr.getMatchViewForUser('GHOST-05', 'u_ghost', t0 + 850)!;
  assert.deepEqual(ghostView.ghostNightState?.wakingActorIds, ['u_seer']);
  assert.equal(
    ghostView.ghostNightState?.skillCutscenes.some(
      (c) => c.kind === 'witch_heal' && c.primaryTargetId === 'u_vil'
    ),
    true
  );
  assert.equal(
    ghostView.ghostNightState?.skillCutscenes.some(
      (c) => c.kind === 'witch_poison' && c.primaryTargetId === 'u_guard'
    ),
    true
  );
  assert.equal(ghostView.ghostNightState?.seerInspectionTonight, null);

  assert.equal(mgr.submitNightAction('GHOST-05', 'u_seer', { actionType: 'seer_inspect', targetId: 'u_wolf' }, t0 + 900).ok, true);
  ghostView = mgr.getMatchViewForUser('GHOST-05', 'u_ghost', t0 + 920)!;
  assert.deepEqual(ghostView.ghostNightState?.seerInspectionTonight, {
    seerId: 'u_seer',
    targetId: 'u_wolf',
    roleId: 'werewolf',
    isWerewolf: true,
  });
  const seerCutscene = ghostView.ghostNightState?.skillCutscenes.find((c) => c.kind === 'seer');
  assert.ok(seerCutscene);
  assert.equal(seerCutscene.primaryTargetId, 'u_wolf');
  assert.equal(seerCutscene.seerIsWolf, true);
  // Living Seer still never receives ghostNightState
  assert.equal(mgr.getMatchViewForUser('GHOST-05', 'u_seer', t0 + 920)!.ghostNightState, null);

  // Seer confirms -> Dawn (day_discussion): ghostNightState becomes null during daytime, and Night 2 clears skillCutscenes!
  assert.equal(mgr.submitNightAction('GHOST-05', 'u_seer', { actionType: 'confirm_done' }, t0 + 950).ok, true);
  const dawnGhost = mgr.getMatchViewForUser('GHOST-05', 'u_ghost', t0 + 950)!;
  const newlyDeadGuard = mgr.getMatchViewForUser('GHOST-05', 'u_guard', t0 + 950)!;
  assert.equal(dawnGhost.phase, 'day_discussion');
  assert.equal(dawnGhost.ghostNightState, null);
  assert.equal(newlyDeadGuard.players.find((p) => p.id === 'u_guard')?.isAlive, false);
  assert.equal(newlyDeadGuard.ghostNightState, null);

  // Advance Day 1 (discussion -> voting -> Night 2 with no lynch)
  assert.equal(mgr.advancePhase('GHOST-05', 'u_ghost', t0 + 1500).ok, true);
  assert.equal(mgr.advancePhase('GHOST-05', 'u_ghost', t0 + 2000).ok, true);
  const night2GuardGhost = mgr.getMatchViewForUser('GHOST-05', 'u_guard', t0 + 2000)!;
  assert.equal(night2GuardGhost.phase, 'night');
  assert.equal(night2GuardGhost.round, 2);
  assert.ok(night2GuardGhost.ghostNightState, 'Naturally killed player receives ghostNightState on Night 2');
  assert.deepEqual(
    night2GuardGhost.ghostNightState.skillCutscenes,
    [],
    'nightSkillEvents must be cleared at the start of every new Night'
  );
});

test('Save-Preservation Invariant: werewolf skillCutscene NEVER overrides Bodyguard shield or Witch heal at Dawn', () => {
  const mgr = new RealtimeRoomManager();
  const t0 = 1_700_500_000_000;

  // Case A: Bodyguard shields u_vil, then Werewolf bites u_vil & confirms -> u_vil wakes up ALIVE with no deathCinematic
  mgr.createOrJoinRoom('SAVE-BG', { id: 'u_guard', name: 'Bảo Vệ', avatar: '🛡️', elo: 1500 }, { villageSize: 5 });
  mgr.createOrJoinRoom('SAVE-BG', { id: 'u_wolf', name: 'Sói', avatar: '🐺', elo: 1500 });
  mgr.createOrJoinRoom('SAVE-BG', { id: 'u_witch', name: 'Phù Thủy', avatar: '🧪', elo: 1500 });
  mgr.createOrJoinRoom('SAVE-BG', { id: 'u_vil', name: 'Dân Làng', avatar: '🧑‍🌾', elo: 1500 });
  mgr.createOrJoinRoom('SAVE-BG', { id: 'u_ghost', name: 'Hồn Ma', avatar: '👻', elo: 1500 });

  assert.equal(
    mgr.startMatch('SAVE-BG', 'u_guard', {
      now: t0,
      customRoles: {
        u_guard: 'bodyguard',
        u_wolf: 'werewolf',
        u_witch: 'witch',
        u_vil: 'villager',
        u_ghost: 'villager',
      },
    }).ok,
    true
  );
  mgr.getMatchState('SAVE-BG')!.players.find((p) => p.id === 'u_ghost')!.isAlive = false;

  assert.equal(mgr.submitNightAction('SAVE-BG', 'u_guard', { actionType: 'guard', targetId: 'u_vil' }, t0 + 100).ok, true);
  assert.equal(mgr.submitNightAction('SAVE-BG', 'u_guard', { actionType: 'confirm_done' }, t0 + 200).ok, true);
  assert.equal(mgr.submitNightAction('SAVE-BG', 'u_wolf', { actionType: 'wolf_bite', targetId: 'u_vil' }, t0 + 300).ok, true);
  assert.equal(mgr.submitNightAction('SAVE-BG', 'u_wolf', { actionType: 'confirm_done' }, t0 + 400).ok, true);

  // During Witch step, Ghost sees BOTH bodyguard & werewolf cutscenes AND dyingWolfVictimIds is empty (blocked!)
  const ghostMidBg = mgr.getMatchViewForUser('SAVE-BG', 'u_ghost', t0 + 450)!;
  assert.equal(
    ghostMidBg.ghostNightState?.skillCutscenes.some((c) => c.kind === 'werewolf' && c.primaryTargetId === 'u_vil'),
    true
  );
  assert.deepEqual(ghostMidBg.ghostNightState?.dyingWolfVictimIds, []);

  // Witch does nothing and confirms -> Dawn!
  assert.equal(mgr.submitNightAction('SAVE-BG', 'u_witch', { actionType: 'confirm_done' }, t0 + 500).ok, true);
  const vilAfterBg = mgr.getMatchViewForUser('SAVE-BG', 'u_vil', t0 + 500)!;
  assert.equal(vilAfterBg.phase, 'day_discussion');
  assert.equal(vilAfterBg.players.find((p) => p.id === 'u_vil')?.isAlive, true);
  assert.equal(vilAfterBg.deathCinematic, null);

  // Case B: Werewolf bites u_vil & confirms (recording werewolf cutscene), then Witch heals u_vil -> u_vil wakes up ALIVE!
  mgr.createOrJoinRoom('SAVE-WT', { id: 'u_wolf', name: 'Sói', avatar: '🐺', elo: 1500 }, { villageSize: 5 });
  mgr.createOrJoinRoom('SAVE-WT', { id: 'u_witch', name: 'Phù Thủy', avatar: '🧪', elo: 1500 });
  mgr.createOrJoinRoom('SAVE-WT', { id: 'u_seer', name: 'Tiên Tri', avatar: '🔮', elo: 1500 });
  mgr.createOrJoinRoom('SAVE-WT', { id: 'u_vil', name: 'Dân Làng', avatar: '🧑‍🌾', elo: 1500 });
  mgr.createOrJoinRoom('SAVE-WT', { id: 'u_ghost', name: 'Hồn Ma', avatar: '👻', elo: 1500 });

  assert.equal(
    mgr.startMatch('SAVE-WT', 'u_wolf', {
      now: t0,
      customRoles: {
        u_wolf: 'werewolf',
        u_witch: 'witch',
        u_seer: 'seer',
        u_vil: 'villager',
        u_ghost: 'villager',
      },
    }).ok,
    true
  );
  mgr.getMatchState('SAVE-WT')!.players.find((p) => p.id === 'u_ghost')!.isAlive = false;

  assert.equal(mgr.submitNightAction('SAVE-WT', 'u_wolf', { actionType: 'wolf_bite', targetId: 'u_vil' }, t0 + 100).ok, true);
  assert.equal(mgr.submitNightAction('SAVE-WT', 'u_wolf', { actionType: 'confirm_done' }, t0 + 200).ok, true);

  // Werewolf cutscene is recorded AND dyingWolfVictimIds shows u_vil before Witch heals
  const ghostBeforeHeal = mgr.getMatchViewForUser('SAVE-WT', 'u_ghost', t0 + 250)!;
  assert.equal(
    ghostBeforeHeal.ghostNightState?.skillCutscenes.some((c) => c.kind === 'werewolf' && c.primaryTargetId === 'u_vil'),
    true
  );
  assert.deepEqual(ghostBeforeHeal.ghostNightState?.dyingWolfVictimIds, ['u_vil']);

  // Witch heals u_vil and confirms; Seer confirms -> Dawn!
  assert.equal(mgr.submitNightAction('SAVE-WT', 'u_witch', { actionType: 'witch_heal', targetId: 'u_vil' }, t0 + 300).ok, true);
  assert.equal(mgr.submitNightAction('SAVE-WT', 'u_witch', { actionType: 'confirm_done' }, t0 + 350).ok, true);
  assert.equal(mgr.submitNightAction('SAVE-WT', 'u_seer', { actionType: 'confirm_done' }, t0 + 400).ok, true);

  const vilAfterHeal = mgr.getMatchViewForUser('SAVE-WT', 'u_vil', t0 + 400)!;
  assert.equal(vilAfterHeal.phase, 'day_discussion');
  assert.equal(vilAfterHeal.players.find((p) => p.id === 'u_vil')?.isAlive, true);
  assert.equal(vilAfterHeal.deathCinematic, null);
});

test('Bot night steps emit deduplicated skillCutscenes and pending Hunter cannot peek ghostNightState before shooting', () => {
  const mgr = new RealtimeRoomManager();
  let clock = 1_700_600_000_000;

  mgr.createOrJoinRoom('BOT-GHOST', { id: 'u_ghost', name: 'Hồn Ma', avatar: '👻', elo: 1500 }, { villageSize: 5 });
  mgr.createOrJoinRoom('BOT-GHOST', { id: 'u_hunter', name: 'Thợ Săn', avatar: '🎯', elo: 1500 });
  mgr.fillBots('BOT-GHOST', 'u_ghost');
  const bots = mgr.getRoom('BOT-GHOST')!.participants.filter((p) => p.isBot).map((p) => p.id);

  assert.equal(
    mgr.startMatch('BOT-GHOST', 'u_ghost', {
      now: clock,
      customRoles: {
        u_ghost: 'villager',
        u_hunter: 'hunter',
        [bots[0]]: 'werewolf',
        [bots[1]]: 'bodyguard',
        [bots[2]]: 'seer',
      },
    }).ok,
    true
  );

  // Mark u_ghost dead to inspect live bot night cutscenes
  const match = mgr.getMatchState('BOT-GHOST')!;
  match.players.find((p) => p.id === 'u_ghost')!.isAlive = false;

  // Step 0 is bot Bodyguard: bot immediately picked & emitted bodyguard cutscene
  const ghostStep0 = mgr.getMatchViewForUser('BOT-GHOST', 'u_ghost', clock)!;
  assert.equal(ghostStep0.currentNightStep?.key, 'bodyguard');
  assert.equal(
    ghostStep0.ghostNightState?.skillCutscenes.filter((c) => c.kind === 'bodyguard').length,
    1
  );

  // Advance step 0 deadline -> step 1 (human Hunter wakes): Ghost spectates the Hunter's live aim
  clock = match.phaseEndsAt;
  assert.equal(mgr.tickRoom('BOT-GHOST', clock).changed, true);
  const ghostHunterStep = mgr.getMatchViewForUser('BOT-GHOST', 'u_ghost', clock)!;
  assert.equal(ghostHunterStep.currentNightStep?.key, 'hunter');
  assert.deepEqual(ghostHunterStep.ghostNightState?.wakingActorIds, ['u_hunter']);
  // A living Hunter is NOT a ghost: no omniscient telemetry for them
  assert.equal(mgr.getMatchViewForUser('BOT-GHOST', 'u_hunter', clock)!.ghostNightState, null);

  // Hunter marks the bot Seer (who the Bodyguard shields tonight) -> Ghost sees the live mark
  assert.equal(mgr.submitNightAction('BOT-GHOST', 'u_hunter', { actionType: 'hunter_mark', targetId: bots[2] }, clock + 50).ok, true);
  assert.equal(
    mgr.getMatchViewForUser('BOT-GHOST', 'u_ghost', clock + 60)!.ghostNightState?.liveActions.hunterTargetId,
    bots[2]
  );

  // Hunter step deadline -> step 2 (bot Werewolf); hunter_shot cutscene recorded once, bodyguard cutscene not duplicated
  clock = match.phaseEndsAt;
  assert.equal(mgr.tickRoom('BOT-GHOST', clock).changed, true);
  const ghostStep2 = mgr.getMatchViewForUser('BOT-GHOST', 'u_ghost', clock)!;
  assert.equal(ghostStep2.currentNightStep?.key, 'werewolf');
  assert.equal(
    ghostStep2.ghostNightState?.skillCutscenes.filter((c) => c.kind === 'bodyguard').length,
    1,
    'Dedupe ID must prevent duplicate cutscenes when bot step finishes'
  );
  assert.equal(
    ghostStep2.ghostNightState?.skillCutscenes.filter(
      (c) => c.kind === 'hunter_shot' && c.actorIds.includes('u_hunter') && c.primaryTargetId === bots[2]
    ).length,
    1
  );
  assert.equal(
    ghostStep2.ghostNightState?.skillCutscenes.filter((c) => c.kind === 'werewolf').length,
    1
  );

  // Force wolf target onto u_hunter and shield the marked Seer: bullet must pierce the shield at Dawn
  match.nightActions.guardTargetId = bots[2];
  match.nightActions.wolfTargetId = 'u_hunter';
  clock = match.phaseEndsAt;
  assert.equal(mgr.tickRoom('BOT-GHOST', clock).changed, true); // -> seer
  clock = match.phaseEndsAt;
  assert.equal(mgr.tickRoom('BOT-GHOST', clock).changed, true); // -> Dawn (no live Hunter shot phase)

  assert.notEqual(match.phase, 'night');
  assert.equal(match.players.find((p) => p.id === 'u_hunter')?.isAlive, false);
  assert.equal(match.players.find((p) => p.id === bots[2])?.isAlive, false, 'Shielded mark still dies to the Hunter bullet');
});

test('Host cannot skip own unconfirmed Wolf step and stale expectedStepIndex is rejected', () => {
  const mgr = new RealtimeRoomManager();
  const t0 = 1_700_800_000_000;
  mgr.createOrJoinRoom('HOST-WOLF', { id: 'u_host', name: 'Host Sói', avatar: '🐺', elo: 1600 }, { villageSize: 4 });
  mgr.fillBots('HOST-WOLF', 'u_host');
  const bots = mgr.getRoom('HOST-WOLF')!.participants.filter((p) => p.isBot).map((p) => p.id);

  const started = mgr.startMatch('HOST-WOLF', 'u_host', {
    now: t0,
    customRoles: {
      u_host: 'werewolf',
      [bots[0]]: 'witch',
      [bots[1]]: 'seer',
      [bots[2]]: 'villager',
    },
  });
  assert.equal(started.ok, true);
  const match = mgr.getMatchState('HOST-WOLF')!;
  assert.equal(match.nightSchedule[match.nightStepIndex]?.key, 'werewolf');

  // Host tries to advance own unconfirmed Wolf turn -> rejected!
  const skipOwn = mgr.advancePhase('HOST-WOLF', 'u_host', t0 + 100, match.nightStepIndex);
  assert.equal(skipOwn.ok, false);
  assert.equal(mgr.getMatchState('HOST-WOLF')!.nightStepIndex, 0);

  // After confirming, all living humans confirmed -> auto-advances to step 1 (bot Witch)
  assert.equal(
    mgr.submitNightAction('HOST-WOLF', 'u_host', { actionType: 'confirm_done' }, t0 + 200).ok,
    true
  );
  assert.equal(mgr.getMatchState('HOST-WOLF')!.nightStepIndex, 1);

  // Stale expectedStepIndex (0 instead of 1) -> rejected!
  const staleAdv = mgr.advancePhase('HOST-WOLF', 'u_host', t0 + 250, 0);
  assert.equal(staleAdv.ok, false);
  assert.equal(mgr.getMatchState('HOST-WOLF')!.nightStepIndex, 1);

  // Matching expectedStepIndex (1) advances cleanly
  const validAdv = mgr.advancePhase('HOST-WOLF', 'u_host', t0 + 300, 1);
  assert.equal(validAdv.ok, true);
  assert.equal(mgr.getMatchState('HOST-WOLF')!.nightStepIndex, 2);
});
