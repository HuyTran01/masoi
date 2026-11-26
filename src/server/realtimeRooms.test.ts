import test from 'node:test';
import assert from 'node:assert/strict';
import { RealtimeRoomManager, normalizeRoomCode, type RealtimePropEvent } from './realtimeRooms';

test('normalizeRoomCode strips invalid symbols and uppercases cleanly', () => {
  assert.equal(normalizeRoomCode(' wolf-123!@# '), 'WOLF-123');
  assert.equal(normalizeRoomCode('ab'), 'AB');
});

test('createOrJoinRoom supports multi-user join, idempotent reconnect, and rejects invalid codes', () => {
  const mgr = new RealtimeRoomManager();

  const bad = mgr.createOrJoinRoom('a', { id: 'u1', name: 'Host', avatar: '🐺', elo: 1600 });
  assert.equal(bad.ok, false);

  const missing = mgr.createOrJoinRoom(
    'WOLF-9999',
    { id: 'u2', name: 'Guest', avatar: '🔮', elo: 1500 },
    { createIfMissing: false }
  );
  assert.equal(missing.ok, false);

  const created = mgr.createOrJoinRoom('WOLF-1001', { id: 'u1', name: 'Host', avatar: '🐺', elo: 1600 });
  assert.equal(created.ok, true);
  if (created.ok) {
    assert.equal(created.created, true);
    assert.equal(created.room.hostId, 'u1');
    assert.equal(created.room.participants.length, 1);
  }

  const joined = mgr.createOrJoinRoom('WOLF-1001', { id: 'u2', name: 'Guest', avatar: '🔮', elo: 1520 });
  assert.equal(joined.ok, true);
  if (joined.ok) {
    assert.equal(joined.created, false);
    assert.equal(joined.room.participants.length, 2);
    assert.equal(joined.room.participants[1].isHost, false);
  }

  // Idempotent reconnect does not duplicate participant
  const reconn = mgr.createOrJoinRoom('WOLF-1001', { id: 'u2', name: 'Guest Renamed', avatar: '🔮', elo: 1550 });
  assert.equal(reconn.ok, true);
  if (reconn.ok) {
    assert.equal(reconn.room.participants.length, 2);
    assert.equal(reconn.room.participants[1].name, 'Guest Renamed');
  }
});

test('host-only actions reject non-hosts and allow host to addBot, fillBots, kick, updateConfig, and startMatch', () => {
  const mgr = new RealtimeRoomManager();
  mgr.createOrJoinRoom('WOLF-2002', { id: 'host', name: 'Host', avatar: '🐺', elo: 1600 }, { villageSize: 6 });
  mgr.createOrJoinRoom('WOLF-2002', { id: 'guest', name: 'Guest', avatar: '🛡️', elo: 1500 });

  // Non-host denied on all host controls
  assert.equal(mgr.addBot('WOLF-2002', 'guest').ok, false);
  assert.equal(mgr.fillBots('WOLF-2002', 'guest').ok, false);
  assert.equal(mgr.kickParticipant('WOLF-2002', 'guest', 'host').ok, false);
  assert.equal(mgr.updateConfig('WOLF-2002', 'guest', { villageSize: 10 }).ok, false);
  assert.equal(mgr.startMatch('WOLF-2002', 'guest').ok, false);

  // Host cannot self-kick
  assert.equal(mgr.kickParticipant('WOLF-2002', 'host', 'host').ok, false);

  // Host fills bots up to villageSize=6
  const filled = mgr.fillBots('WOLF-2002', 'host');
  assert.equal(filled.ok, true);
  if (filled.ok) {
    assert.equal(filled.room.participants.length, 6);
  }

  // New real human joining a bot-filled room evicts a bot to make space
  const thirdHuman = mgr.createOrJoinRoom('WOLF-2002', { id: 'u3', name: 'Player 3', avatar: '🧪', elo: 1540 });
  assert.equal(thirdHuman.ok, true);
  if (thirdHuman.ok) {
    assert.equal(thirdHuman.room.participants.length, 6);
    assert.ok(thirdHuman.room.participants.some((p) => p.id === 'u3'));
  }

  // Host kicks guest
  const kicked = mgr.kickParticipant('WOLF-2002', 'host', 'guest');
  assert.equal(kicked.ok, true);
  if (kicked.ok) {
    assert.equal(kicked.kickedId, 'guest');
    assert.equal(kicked.room.participants.some((p) => p.id === 'guest'), false);
  }

  // Host starts match
  const started = mgr.startMatch('WOLF-2002', 'host');
  assert.equal(started.ok, true);
  if (started.ok) {
    assert.equal(started.room.status, 'in_match');
  }
});

test('leaveRoom promotes next human host and deletes room when all humans leave', () => {
  const mgr = new RealtimeRoomManager();
  mgr.createOrJoinRoom('WOLF-3003', { id: 'h1', name: 'Host 1', avatar: '🐺', elo: 1600 });
  mgr.createOrJoinRoom('WOLF-3003', { id: 'h2', name: 'Host 2', avatar: '🔮', elo: 1580 });
  mgr.addBot('WOLF-3003', 'h1');

  const afterH1Leaves = mgr.leaveRoom('WOLF-3003', 'h1');
  assert.equal(afterH1Leaves.deleted, false);
  assert.equal(afterH1Leaves.room?.hostId, 'h2');
  assert.equal(afterH1Leaves.room?.participants.find((p) => p.id === 'h2')?.isHost, true);

  // When last human leaves, room with only bots left is auto-deleted
  const afterH2Leaves = mgr.leaveRoom('WOLF-3003', 'h2');
  assert.equal(afterH2Leaves.deleted, true);
  assert.equal(mgr.getRoom('WOLF-3003'), null);
});

test('rooms maintain strict isolation for chat and votes with idempotent chat IDs', () => {
  const mgr = new RealtimeRoomManager();
  mgr.createOrJoinRoom('ROOM-A', { id: 'u1', name: 'Alice', avatar: '🔮', elo: 1500 });
  mgr.createOrJoinRoom('ROOM-B', { id: 'u2', name: 'Bob', avatar: '🛡️', elo: 1500 });

  const c1 = mgr.postChat('ROOM-A', {
    id: 'msg-1',
    senderId: 'u1',
    senderName: 'Alice',
    text: 'Hello Room A',
    timestamp: 1000,
  });
  assert.equal(c1.ok, true);

  // Duplicate ID is idempotent
  mgr.postChat('ROOM-A', {
    id: 'msg-1',
    senderId: 'u1',
    senderName: 'Alice',
    text: 'Hello Room A duplicate',
    timestamp: 1001,
  });

  mgr.castVote('ROOM-A', 'u1', 'target_x');

  const roomA = mgr.getRoom('ROOM-A');
  const roomB = mgr.getRoom('ROOM-B');
  assert.equal(roomA?.chatMessages.length, 1);
  assert.equal(roomA?.chatMessages[0].text, 'Hello Room A');
  assert.equal(roomA?.votes['u1'], 'target_x');

  assert.equal(roomB?.chatMessages.length, 0);
  assert.deepEqual(roomB?.votes, {});
  assert.equal(mgr.listOpenRooms().length, 2);
});

test('startMatch requires >= 4 players, assigns authoritative matchRoles, and blocks late joins', () => {
  const mgr = new RealtimeRoomManager();
  mgr.createOrJoinRoom('ONL-7777', { id: 'host_1', name: 'Host', avatar: '🐺', elo: 1600 }, { villageSize: 6 });
  mgr.createOrJoinRoom('ONL-7777', { id: 'guest_2', name: 'Guest', avatar: '🔮', elo: 1500 });

  // Too few players -> rejected
  const tooEarly = mgr.startMatch('ONL-7777', 'host_1');
  assert.equal(tooEarly.ok, false);

  // Fill bots to reach 6
  const filled = mgr.fillBots('ONL-7777', 'host_1');
  assert.equal(filled.ok, true);

  // Host starts -> server assigns role for every participant
  const started = mgr.startMatch('ONL-7777', 'host_1');
  assert.equal(started.ok, true);
  if (started.ok) {
    assert.equal(started.room.status, 'in_match');
    assert.ok(started.room.matchRoles);
    assert.equal(Object.keys(started.room.matchRoles!).length, 6);
    assert.ok(started.room.matchRoles!['host_1']);
    assert.ok(started.room.matchRoles!['guest_2']);
  }

  // Late stranger cannot join an in-progress match
  const lateJoin = mgr.createOrJoinRoom(
    'ONL-7777',
    { id: 'late_3', name: 'Late', avatar: '🛡️', elo: 1500 },
    { createIfMissing: false }
  );
  assert.equal(lateJoin.ok, false);
});

test('in_match disconnect preserves participant as disconnected until all humans disconnect, and supports water prop type', () => {
  const waterProp: RealtimePropEvent = {
    id: 'prop_water_1',
    propType: 'water',
    fromPlayerId: 'h1',
    targetPlayerId: 'h2',
    timestamp: Date.now(),
  };
  assert.equal(waterProp.propType, 'water');

  const mgr = new RealtimeRoomManager();
  mgr.createOrJoinRoom('ONL-8888', { id: 'h1', name: 'Host', avatar: '🐺', elo: 1600 }, { villageSize: 4 });
  mgr.createOrJoinRoom('ONL-8888', { id: 'h2', name: 'Guest', avatar: '🔮', elo: 1550 });
  mgr.fillBots('ONL-8888', 'h1');
  const started = mgr.startMatch('ONL-8888', 'h1');
  assert.equal(started.ok, true);

  // Disconnect during in_match keeps participant with connected=false
  const dc1 = mgr.leaveRoom('ONL-8888', 'h2', { isDisconnect: true });
  assert.equal(dc1.deleted, false);
  const h2AfterDc = dc1.room?.participants.find((p) => p.id === 'h2');
  assert.ok(h2AfterDc, 'disconnected in_match participant must remain in roster');
  assert.equal(h2AfterDc?.connected, false);

  // Reconnecting restores connected=true without blocking
  const reconn = mgr.createOrJoinRoom(
    'ONL-8888',
    { id: 'h2', name: 'Guest', avatar: '🔮', elo: 1550 },
    { createIfMissing: false }
  );
  assert.equal(reconn.ok, true);
  if (reconn.ok) {
    assert.equal(reconn.room.participants.find((p) => p.id === 'h2')?.connected, true);
  }

  // Disconnecting ALL humans deletes the in_match room
  mgr.leaveRoom('ONL-8888', 'h2', { isDisconnect: true });
  const dcAll = mgr.leaveRoom('ONL-8888', 'h1', { isDisconnect: true });
  assert.equal(dcAll.deleted, true);
  assert.equal(mgr.getRoom('ONL-8888'), null);
});

test('recordProp anti-cheat blocks dead Ghosts, Night throws, self-throws, and dead targets while allowing living Day throws', () => {
  const mgr = new RealtimeRoomManager();
  const t0 = 1_700_700_000_000;

  mgr.createOrJoinRoom('PROP-SEC', { id: 'u_host', name: 'Host', avatar: '👑', elo: 1600 }, { villageSize: 5 });
  mgr.createOrJoinRoom('PROP-SEC', { id: 'u_wolf', name: 'Wolf', avatar: '🐺', elo: 1550 });
  mgr.createOrJoinRoom('PROP-SEC', { id: 'u_seer', name: 'Seer', avatar: '🔮', elo: 1550 });
  mgr.createOrJoinRoom('PROP-SEC', { id: 'u_vil', name: 'Villager', avatar: '🧑‍🌾', elo: 1500 });
  mgr.createOrJoinRoom('PROP-SEC', { id: 'u_victim', name: 'Victim', avatar: '🎯', elo: 1500 });

  assert.equal(
    mgr.startMatch('PROP-SEC', 'u_host', {
      now: t0,
      customRoles: {
        u_host: 'villager',
        u_wolf: 'werewolf',
        u_seer: 'seer',
        u_vil: 'villager',
        u_victim: 'villager',
      },
    }).ok,
    true
  );

  // Night 1: even living -> living is REJECTED at Night
  const nightLivingProp = mgr.recordProp('PROP-SEC', {
    id: 'p_night_living',
    propType: 'tomato',
    fromPlayerId: 'u_host',
    targetPlayerId: 'u_seer',
    timestamp: t0 + 100,
  });
  assert.equal(nightLivingProp.ok, false);
  assert.equal(mgr.getRecentProps('PROP-SEC').length, 0);

  // Kill u_victim on Night 1 -> Dawn (day_discussion)
  assert.equal(mgr.submitNightAction('PROP-SEC', 'u_wolf', { actionType: 'wolf_bite', targetId: 'u_victim' }, t0 + 200).ok, true);
  assert.equal(mgr.submitNightAction('PROP-SEC', 'u_wolf', { actionType: 'confirm_done' }, t0 + 250).ok, true);
  assert.equal(mgr.submitNightAction('PROP-SEC', 'u_seer', { actionType: 'confirm_done' }, t0 + 300).ok, true);
  assert.equal(mgr.getMatchState('PROP-SEC')?.phase, 'day_discussion');

  // Day Discussion: dead Ghost MUST NOT throw props
  assert.equal(
    mgr.recordProp('PROP-SEC', {
      id: 'p_ghost_day',
      propType: 'tomato',
      fromPlayerId: 'u_victim',
      targetPlayerId: 'u_wolf',
      timestamp: t0 + 400,
    }).ok,
    false
  );

  // Day Discussion: living player MUST NOT throw at dead tombstone or at self
  assert.equal(
    mgr.recordProp('PROP-SEC', {
      id: 'p_to_dead',
      propType: 'rose',
      fromPlayerId: 'u_host',
      targetPlayerId: 'u_victim',
      timestamp: t0 + 410,
    }).ok,
    false
  );
  assert.equal(
    mgr.recordProp('PROP-SEC', {
      id: 'p_self',
      propType: 'egg',
      fromPlayerId: 'u_host',
      targetPlayerId: 'u_host',
      timestamp: t0 + 420,
    }).ok,
    false
  );

  // Day Discussion: living -> other living SUCCEEDS
  assert.equal(
    mgr.recordProp('PROP-SEC', {
      id: 'p_day_discuss_ok',
      propType: 'rose',
      fromPlayerId: 'u_host',
      targetPlayerId: 'u_seer',
      timestamp: t0 + 430,
    }).ok,
    true
  );

  // Day Voting: dead Ghost rejected, living -> living succeeds
  assert.equal(mgr.advancePhase('PROP-SEC', 'u_host', t0 + 500).ok, true);
  assert.equal(mgr.getMatchState('PROP-SEC')?.phase, 'day_voting');

  assert.equal(
    mgr.recordProp('PROP-SEC', {
      id: 'p_ghost_vote',
      propType: 'water',
      fromPlayerId: 'u_victim',
      targetPlayerId: 'u_wolf',
      timestamp: t0 + 510,
    }).ok,
    false
  );
  assert.equal(
    mgr.recordProp('PROP-SEC', {
      id: 'p_day_vote_ok',
      propType: 'water',
      fromPlayerId: 'u_seer',
      targetPlayerId: 'u_host',
      timestamp: t0 + 520,
    }).ok,
    true
  );

  // Advance to Night 2: dead Ghost and living players BOTH rejected during Night
  assert.equal(mgr.advancePhase('PROP-SEC', 'u_host', t0 + 600).ok, true);
  assert.equal(mgr.getMatchState('PROP-SEC')?.phase, 'night');
  assert.equal(
    mgr.recordProp('PROP-SEC', {
      id: 'p_ghost_night2',
      propType: 'tomato',
      fromPlayerId: 'u_victim',
      targetPlayerId: 'u_host',
      timestamp: t0 + 610,
    }).ok,
    false
  );
  assert.equal(
    mgr.recordProp('PROP-SEC', {
      id: 'p_living_night2',
      propType: 'tomato',
      fromPlayerId: 'u_host',
      targetPlayerId: 'u_seer',
      timestamp: t0 + 620,
    }).ok,
    false
  );

  // Only the 2 legal Day props were recorded
  assert.deepEqual(
    mgr.getRecentProps('PROP-SEC').map((p) => p.id),
    ['p_day_discuss_ok', 'p_day_vote_ok']
  );
});

