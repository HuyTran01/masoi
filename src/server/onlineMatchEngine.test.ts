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

test('Full multi-human progression: Night -> Dawn Hunter Revenge -> Day Voting (Mayor x2 & Campfire Abstain) -> Game Over & Rematch', () => {
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

  // Night 1: Werewolf bites u_hunter -> Witch sees dyingWolfVictimIds=['u_hunter'], skips -> Seer inspects u_wolf -> Dawn triggers Hunter Revenge!
  assert.equal(mgr.submitNightAction('FULL-02', 'u_wolf', { actionType: 'wolf_bite', targetId: 'u_hunter' }, t0 + 1000).ok, true);
  assert.equal(mgr.submitNightAction('FULL-02', 'u_wolf', { actionType: 'confirm_done' }, t0 + 1100).ok, true);

  const witchView = mgr.getMatchViewForUser('FULL-02', 'u_witch', t0 + 1200)!;
  assert.deepEqual(witchView.dyingWolfVictimIds, ['u_hunter']);
  assert.equal(mgr.submitNightAction('FULL-02', 'u_witch', { actionType: 'confirm_done' }, t0 + 1300).ok, true);

  assert.equal(mgr.submitNightAction('FULL-02', 'u_seer', { actionType: 'seer_inspect', targetId: 'u_wolf' }, t0 + 1400).ok, true);
  assert.equal(mgr.submitNightAction('FULL-02', 'u_seer', { actionType: 'confirm_done' }, t0 + 1500).ok, true);

  // Paused in hunter_revenge for human Hunter u_hunter!
  const hunterView = mgr.getMatchViewForUser('FULL-02', 'u_hunter', t0 + 1600)!;
  const hostView = mgr.getMatchViewForUser('FULL-02', 'u_host', t0 + 1600)!;
  assert.equal(hunterView.phase, 'hunter_revenge');
  assert.equal(hunterView.isMyHunterTurn, true);
  assert.equal(hostView.isMyHunterTurn, false);
  assert.equal(hunterView.gameResult, null);

  // Hunter holds fire (null) -> Dawn finishes into day_discussion with 4 alive (host, wolf, seer, witch)
  assert.equal(mgr.submitHunterShot('FULL-02', 'u_hunter', null, t0 + 2000).ok, true);
  assert.equal(mgr.getMatchState('FULL-02')?.phase, 'day_discussion');

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

  // Night 2: Wolf bites u_witch, Witch heals herself, Seer skips -> Peaceful Dawn!
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

test('Cupid/Doppelganger projection privacy, Seer Traitor stealth, and Hunter revenge timeout auto-hold', () => {
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

  // Step 2: Wolf bites u_hunter
  assert.equal(mgr.submitNightAction('EDGE-04', 'u_wolf', { actionType: 'wolf_bite', targetId: 'u_hunter' }, t0 + 500).ok, true);
  assert.equal(mgr.submitNightAction('EDGE-04', 'u_wolf', { actionType: 'confirm_done' }, t0 + 600).ok, true);

  // Step 3: Seer inspects Traitor -> isWerewolf=false AND roleId masked to 'villager' (zero Traitor leak!)
  assert.equal(mgr.submitNightAction('EDGE-04', 'u_seer', { actionType: 'seer_inspect', targetId: 'u_traitor' }, t0 + 700).ok, true);
  const seerInspectView = mgr.getMatchViewForUser('EDGE-04', 'u_seer', t0 + 750)!;
  assert.equal(seerInspectView.mySeerInspection?.isWerewolf, false);
  assert.equal(seerInspectView.mySeerInspection?.roleId, 'villager');

  // Seer confirms -> u_hunter dies, triggers hunter_revenge, AND Doppelganger inherited hunter!
  assert.equal(mgr.submitNightAction('EDGE-04', 'u_seer', { actionType: 'confirm_done' }, t0 + 800).ok, true);
  const hunterWait = mgr.getMatchState('EDGE-04')!;
  assert.equal(hunterWait.phase, 'hunter_revenge');

  // Verify loverId privacy: outsider u_seer does NOT see loverId; Cupid & lovers DO!
  const seerDuringRevenge = mgr.getMatchViewForUser('EDGE-04', 'u_seer', t0 + 900)!;
  const cupidDuringRevenge = mgr.getMatchViewForUser('EDGE-04', 'u_cupid', t0 + 900)!;
  const wolfDuringRevenge = mgr.getMatchViewForUser('EDGE-04', 'u_wolf', t0 + 900)!;
  assert.equal(seerDuringRevenge.players.some((p) => Boolean(p.loverId)), false);
  assert.equal(cupidDuringRevenge.players.find((p) => p.id === 'u_wolf')?.loverId, 'u_traitor');
  assert.equal(wolfDuringRevenge.players.find((p) => p.id === 'u_wolf')?.loverId, 'u_traitor');

  // Hunter deadline expires -> auto-holds fire and transitions cleanly to day_discussion!
  const tickAfterHunter = mgr.tickRoom('EDGE-04', hunterWait.phaseEndsAt);
  assert.equal(tickAfterHunter.changed, true);
  assert.equal(mgr.getMatchState('EDGE-04')?.phase, 'day_discussion');
});
