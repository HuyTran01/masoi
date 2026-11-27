import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { GMRoomManager } from './gmRooms';
import { createRealtimeAppServer } from './realtimeServer.ts';

test('GM room virtual_deck mode deals roles and strictly isolates player view (zero-leak)', () => {
  const mgr = new GMRoomManager();
  const created = mgr.syncFromHost('GM-1001', 'host_1', {
    deckMode: 'virtual_deck',
    status: 'setup',
    seats: [
      { id: 'p_1', name: 'An', roleId: 'werewolf', roleSource: 'auto_dealt' },
      { id: 'p_2', name: 'Binh', roleId: 'seer', roleSource: 'auto_dealt' },
      { id: 'p_3', name: 'Chi', roleId: 'witch', roleSource: 'auto_dealt' },
      { id: 'p_4', name: 'Dung', roleId: 'villager', roleSource: 'auto_dealt' },
    ],
  });
  assert.equal(created.ok, true);

  // Player Binh joins and claims seat matching their name
  const joinRes = mgr.joinAsPlayer('GM-1001', { id: 'u_binh', name: 'Binh' });
  assert.equal(joinRes.ok, true);
  if (!joinRes.ok) return;

  assert.equal(joinRes.view.mySeat?.name, 'Binh');
  assert.equal(joinRes.view.mySeat?.roleId, 'seer');
  assert.equal(joinRes.view.canSelfInputRole, false);

  // STRICT PRIVACY INVARIANT: player view must NEVER contain other players' roles!
  const serialized = JSON.stringify(joinRes.view);
  assert.equal(serialized.includes('werewolf'), false);
  assert.equal(serialized.includes('witch'), false);
  assert.equal(serialized.includes('villager'), false);
  assert.equal(joinRes.view.openSeats.length, 3);
  assert.equal('roleId' in joinRes.view.openSeats[0], false);

  // In virtual_deck mode, player cannot overwrite their dealt role
  const selfSubmit = mgr.submitSelfRole('GM-1001', 'u_binh', 'werewolf');
  assert.equal(selfSubmit.ok, false);
});

test('GM room physical_cards mode allows player self-input before match and locks once match starts', () => {
  const mgr = new GMRoomManager();
  mgr.syncFromHost('GM-2026', 'host_1', {
    deckMode: 'physical_cards',
    status: 'setup',
    playerCount: 6,
  });

  // Player joins and claims first open seat
  const join1 = mgr.joinAsPlayer('GM-2026', { id: 'u_huy', name: 'Duc Huy' });
  assert.equal(join1.ok, true);
  if (!join1.ok) return;

  assert.equal(join1.view.canSelfInputRole, true);
  assert.equal(join1.view.mySeat?.roleId, null);
  assert.equal(join1.view.mySeat?.roleSource, 'unassigned');

  // Player inputs their physical card (Hunter) before game starts
  const submitRes = mgr.submitSelfRole('GM-2026', 'u_huy', 'hunter');
  assert.equal(submitRes.ok, true);
  if (!submitRes.ok) return;

  assert.equal(submitRes.view.mySeat?.roleId, 'hunter');
  assert.equal(submitRes.view.mySeat?.roleSource, 'self_input');

  // GM sees the self-entered role in host state
  const hostView = mgr.getHostState('GM-2026');
  assert.equal(hostView?.seats[0].name, 'Duc Huy');
  assert.equal(hostView?.seats[0].roleId, 'hunter');
  assert.equal(hostView?.seats[0].roleSource, 'self_input');

  // Another player joins and enters their own card (Werewolf) -> neither can see the other's card
  const join2 = mgr.joinAsPlayer('GM-2026', { id: 'u_my', name: 'Thao My' });
  assert.equal(join2.ok, true);
  const submit2 = mgr.submitSelfRole('GM-2026', 'u_my', 'werewolf');
  assert.equal(submit2.ok, true);
  if (!submit2.ok) return;

  assert.equal(JSON.stringify(submit2.view).includes('hunter'), false);
  const huyView = mgr.getPlayerView('GM-2026', 'u_huy');
  assert.equal(JSON.stringify(huyView).includes('werewolf'), false);

  // GM starts the match -> self-role input is now strictly locked
  mgr.syncFromHost('GM-2026', 'host_1', {
    deckMode: 'physical_cards',
    status: 'in_match',
    phase: 'night',
    round: 1,
  });

  const lateSubmit = mgr.submitSelfRole('GM-2026', 'u_huy', 'seer');
  assert.equal(lateSubmit.ok, false);
  assert.equal(mgr.getPlayerView('GM-2026', 'u_huy')?.canSelfInputRole, false);
});

test('GM host can enter/override role on behalf of any player and sync preserves claimed seats', () => {
  const mgr = new GMRoomManager();
  mgr.syncFromHost('GM-3333', 'host_gm', {
    deckMode: 'physical_cards',
    status: 'setup',
    playerCount: 4,
  });

  const joinRes = mgr.joinAsPlayer('GM-3333', { id: 'u_linh', name: 'Linh' });
  assert.equal(joinRes.ok, true);
  if (!joinRes.ok) return;
  const seatId = joinRes.view.mySeat!.id;

  // GM assigns Witch on behalf of Linh
  const hostState = mgr.getHostState('GM-3333')!;
  const updatedSeats = hostState.seats.map((s) =>
    s.id === seatId ? { ...s, roleId: 'witch' as const, roleSource: 'gm_assigned' as const } : s
  );
  const syncRes = mgr.syncFromHost('GM-3333', 'host_gm', {
    deckMode: 'physical_cards',
    status: 'setup',
    seats: updatedSeats,
  });
  assert.equal(syncRes.ok, true);

  // Linh immediately sees Witch on her own view and keeps her claimed seat
  const linhView = mgr.getPlayerView('GM-3333', 'u_linh');
  assert.equal(linhView?.mySeat?.roleId, 'witch');
  assert.equal(linhView?.mySeat?.roleSource, 'gm_assigned');
});

test('GM room rejects non-host sync, preserves claimed seats and self_input roles on stale sync, and supports leaveAsPlayer', () => {
  const mgr = new GMRoomManager();
  mgr.syncFromHost('GM-4444', 'gm_owner', {
    deckMode: 'physical_cards',
    status: 'setup',
    playerCount: 4,
  });

  // Non-host attempting to overwrite GM room is strictly rejected
  const hijack = mgr.syncFromHost('GM-4444', 'random_guest', {
    deckMode: 'virtual_deck',
    status: 'setup',
    playerCount: 12,
  });
  assert.equal(hijack.ok, false);

  // Player joins seat #1 and self-inputs Seer
  const joined = mgr.joinAsPlayer('GM-4444', { id: 'p_guest_1', name: 'Minh Anh' });
  assert.equal(joined.ok, true);
  if (!joined.ok) return;
  const seatId = joined.view.mySeat!.id;
  const selfRes = mgr.submitSelfRole('GM-4444', 'p_guest_1', 'seer');
  assert.equal(selfRes.ok, true);

  // Host sends a stale sync where claimedByUserId is null and roleId is null -> server must preserve both!
  const staleSync = mgr.syncFromHost('GM-4444', 'gm_owner', {
    deckMode: 'physical_cards',
    status: 'setup',
    seats: [
      { id: seatId, name: 'Minh Anh', roleId: null, roleSource: 'unassigned', claimedByUserId: null },
      { id: 'p_2', name: 'Seat 2', roleId: null, roleSource: 'unassigned', claimedByUserId: null },
      { id: 'p_3', name: 'Seat 3', roleId: null, roleSource: 'unassigned', claimedByUserId: null },
      { id: 'p_4', name: 'Seat 4', roleId: null, roleSource: 'unassigned', claimedByUserId: null },
    ],
  });
  assert.equal(staleSync.ok, true);
  if (staleSync.ok) {
    assert.equal(staleSync.room.seats[0].claimedByUserId, 'p_guest_1');
    assert.equal(staleSync.room.seats[0].roleId, 'seer');
    assert.equal(staleSync.room.seats[0].roleSource, 'self_input');
  }

  // Player leaves -> seat claim is released cleanly
  const left = mgr.leaveAsPlayer('GM-4444', 'p_guest_1');
  assert.equal(left.ok, true);
  if (left.ok) {
    assert.equal(left.room.seats[0].claimedByUserId, null);
  }
  assert.equal(mgr.getPlayerView('GM-4444', 'p_guest_1')?.mySeat, null);
});

test('[QA Regression] BUG-05: GM resetMatch bumps matchId and preserves claimed seats & names for next match', () => {
  const mgr = new GMRoomManager();
  mgr.syncFromHost('GM-5555', 'gm_host_1', {
    deckMode: 'virtual_deck',
    status: 'setup',
    seats: [
      { id: 'p_1', name: 'Ghế #1', roleId: 'werewolf', roleSource: 'auto_dealt' },
      { id: 'p_2', name: 'Ghế #2', roleId: 'seer', roleSource: 'auto_dealt' },
      { id: 'p_3', name: 'Ghế #3', roleId: 'villager', roleSource: 'auto_dealt' },
      { id: 'p_4', name: 'Ghế #4', roleId: 'villager', roleSource: 'auto_dealt' },
    ],
  });

  const joinRes = mgr.joinAsPlayer('GM-5555', { id: 'u_khanh', name: 'Khánh Vy' });
  assert.equal(joinRes.ok, true);
  if (!joinRes.ok) return;
  const initialMatchId = joinRes.view.matchId;
  assert.equal(typeof initialMatchId, 'string');
  assert.ok(initialMatchId.length > 0);

  const resetRes = mgr.syncFromHost('GM-5555', 'gm_host_1', {
    deckMode: 'virtual_deck',
    status: 'setup',
    phase: 'setup',
    round: 1,
    resetMatch: true,
    seats: [
      { id: 'p_1', name: 'Khánh Vy', roleId: 'witch', roleSource: 'auto_dealt', isAlive: true },
      { id: 'p_2', name: 'Ghế #2', roleId: 'werewolf', roleSource: 'auto_dealt', isAlive: true },
      { id: 'p_3', name: 'Ghế #3', roleId: 'villager', roleSource: 'auto_dealt', isAlive: true },
      { id: 'p_4', name: 'Ghế #4', roleId: 'seer', roleSource: 'auto_dealt', isAlive: true },
    ],
  });
  assert.equal(resetRes.ok, true);
  if (!resetRes.ok) return;
  assert.notEqual(resetRes.room.matchId, initialMatchId);

  const nextView = mgr.getPlayerView('GM-5555', 'u_khanh');
  assert.equal(nextView?.matchId, resetRes.room.matchId);
  assert.equal(nextView?.mySeat?.name, 'Khánh Vy');
  assert.equal(nextView?.mySeat?.roleId, 'witch');
  assert.equal(nextView?.mySeat?.isAlive, true);
});

test('GMRoomManager issues and verifies hostSecret/playerToken without leaking them, and preserves elderLives on sync', () => {
  const mgr = new GMRoomManager();
  const created = mgr.syncFromHost('GM-6666', 'host_secret_owner', {
    deckMode: 'virtual_deck',
    status: 'in_match',
    phase: 'night',
    round: 1,
    seats: [
      { id: 'p_1', name: 'Già Làng', roleId: 'elder', roleSource: 'auto_dealt', elderLives: 1 },
      { id: 'p_2', name: 'Sói', roleId: 'werewolf', roleSource: 'auto_dealt' },
      { id: 'p_3', name: 'Dân 1', roleId: 'villager', roleSource: 'auto_dealt' },
      { id: 'p_4', name: 'Dân 2', roleId: 'villager', roleSource: 'auto_dealt' },
    ],
  });
  assert.equal(created.ok, true);
  if (!created.ok) return;

  const secret = created.hostSecret;
  assert.equal(typeof secret, 'string');
  assert.equal(secret.length, 32);
  assert.equal(mgr.verifyHostSecret('GM-6666', secret), true);
  assert.equal(mgr.verifyHostSecret('GM-6666', 'wrong_secret'), false);
  assert.equal(mgr.verifyHostSecret('GM-6666', undefined), false);

  // Sync with wrong hostSecret rejected even with matching hostId
  const badSync = mgr.syncFromHost(
    'GM-6666',
    'host_secret_owner',
    { round: 2 },
    '0'.repeat(32)
  );
  assert.equal(badSync.ok, false);

  // Sync without elderLives preserves elderLives = 1 when !resetMatch
  const nextSync = mgr.syncFromHost(
    'GM-6666',
    'host_secret_owner',
    {
      status: 'in_match',
      round: 2,
      seats: [
        { id: 'p_1', name: 'Già Làng', roleId: 'elder', roleSource: 'auto_dealt' },
        { id: 'p_2', name: 'Sói', roleId: 'werewolf', roleSource: 'auto_dealt' },
        { id: 'p_3', name: 'Dân 1', roleId: 'villager', roleSource: 'auto_dealt' },
        { id: 'p_4', name: 'Dân 2', roleId: 'villager', roleSource: 'auto_dealt' },
      ],
    },
    secret
  );
  assert.equal(nextSync.ok, true);
  if (!nextSync.ok) return;
  assert.equal(nextSync.room.seats[0].elderLives, 1);

  // Explicit resetMatch restores elderLives back to 2
  const resetSync = mgr.syncFromHost(
    'GM-6666',
    'host_secret_owner',
    {
      resetMatch: true,
      seats: [
        { id: 'p_1', name: 'Già Làng', roleId: 'elder', roleSource: 'auto_dealt' },
        { id: 'p_2', name: 'Sói', roleId: 'werewolf', roleSource: 'auto_dealt' },
        { id: 'p_3', name: 'Dân 1', roleId: 'villager', roleSource: 'auto_dealt' },
        { id: 'p_4', name: 'Dân 2', roleId: 'villager', roleSource: 'auto_dealt' },
      ],
    },
    secret
  );
  assert.equal(resetSync.ok, true);
  if (resetSync.ok) {
    assert.equal(resetSync.room.seats[0].elderLives, 2);
  }

  // Player token issuance, verification, idempotent reconnect reuse, and zero leakage
  const join1 = mgr.joinAsPlayer('GM-6666', { id: 'u_elder', name: 'Già Làng' });
  assert.equal(join1.ok, true);
  if (!join1.ok) return;
  const token = join1.playerToken;
  assert.equal(typeof token, 'string');
  assert.equal(token.length, 24);
  assert.equal(mgr.hasPlayerToken('GM-6666', 'u_elder'), true);
  assert.equal(mgr.verifyPlayerToken('GM-6666', 'u_elder', token), true);
  assert.equal(mgr.verifyPlayerToken('GM-6666', 'u_elder', 'bad_token'), false);

  const reconnNoToken = mgr.joinAsPlayer('GM-6666', { id: 'u_elder', name: 'Già Làng' });
  assert.equal(reconnNoToken.ok, false);

  const reconn = mgr.joinAsPlayer(
    'GM-6666',
    { id: 'u_elder', name: 'Già Làng' },
    { playerToken: token }
  );
  assert.equal(reconn.ok, true);
  if (reconn.ok) {
    assert.equal(reconn.playerToken, token);
  }

  // Secrets must NEVER leak into host state, player view, or room summaries
  assert.equal(JSON.stringify(mgr.getHostState('GM-6666')).includes(secret), false);
  assert.equal(JSON.stringify(mgr.getHostState('GM-6666')).includes(token), false);
  assert.equal(JSON.stringify(mgr.getPlayerView('GM-6666', 'u_elder')).includes(secret), false);
  assert.equal(JSON.stringify(mgr.getPlayerView('GM-6666', 'u_elder')).includes(token), false);
  assert.equal(JSON.stringify(mgr.listRooms()).includes(secret), false);

  // Leave clears issued player token
  mgr.leaveAsPlayer('GM-6666', 'u_elder');
  assert.equal(mgr.hasPlayerToken('GM-6666', 'u_elder'), false);
});

test('[Wave 3] Real HTTP multi-client GM Room flow: host sync, player join with tokens, anti-hijack 403, duplicate seat block & rematch redeal', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'masoi-gm-w3-'));
  const srv = await createRealtimeAppServer({
    port: 0,
    host: '127.0.0.1',
    accountsDbPath: path.join(tmpDir, 'accounts.json'),
    enableSnapshots: false,
    attachVite: false,
    quiet: true,
  });

  try {
    // 1. Host creates GM room via HTTP sync
    const syncRes = await fetch(`${srv.baseUrl}/api/gm-rooms/GMLIVE/sync`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        hostId: 'gm_host',
        deckMode: 'virtual_deck',
        status: 'setup',
        seats: [
          { id: 'p_1', name: 'Alice', roleId: 'seer', roleSource: 'auto_dealt' },
          { id: 'p_2', name: 'Bob', roleId: 'werewolf', roleSource: 'auto_dealt' },
          { id: 'p_3', name: 'Carol', roleId: 'villager', roleSource: 'auto_dealt' },
          { id: 'p_4', name: 'Dave', roleId: 'villager', roleSource: 'auto_dealt' },
        ],
      }),
    });
    assert.equal(syncRes.status, 200);
    const syncJson = (await syncRes.json()) as { ok: boolean; hostSecret: string; room: { matchId: string } };
    assert.equal(syncJson.ok, true);
    const hostSecret = syncJson.hostSecret;
    const initialMatchId = syncJson.room.matchId;

    // 2. Hijacker trying to overwrite GM room with wrong hostSecret gets 403
    const hijackRes = await fetch(`${srv.baseUrl}/api/gm-rooms/GMLIVE/sync`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-gm-host-secret': 'wrong_secret' },
      body: JSON.stringify({ hostId: 'gm_host', round: 99 }),
    });
    assert.equal(hijackRes.status, 403);

    // 3. Player 1 joins seat p_1 -> receives token and ONLY own role
    const p1Res = await fetch(`${srv.baseUrl}/api/gm-rooms/GMLIVE/join`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ user: { id: 'u_alice', name: 'Alice' }, seatId: 'p_1' }),
    });
    assert.equal(p1Res.status, 200);
    const p1Json = (await p1Res.json()) as { ok: boolean; playerToken: string; view: { mySeat: { roleId: string } } };
    assert.equal(p1Json.view.mySeat.roleId, 'seer');
    assert.equal(JSON.stringify(p1Json.view).includes('werewolf'), false);

    // 4. Player 2 trying to steal p_1 gets rejected (400)
    const stealRes = await fetch(`${srv.baseUrl}/api/gm-rooms/GMLIVE/join`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ user: { id: 'u_bob', name: 'Bob' }, seatId: 'p_1' }),
    });
    assert.equal(stealRes.status, 400);

    // 5. Player 2 joins seat p_2 cleanly
    const p2Res = await fetch(`${srv.baseUrl}/api/gm-rooms/GMLIVE/join`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ user: { id: 'u_bob', name: 'Bob' }, seatId: 'p_2' }),
    });
    assert.equal(p2Res.status, 200);

    // 6. Rematch redeal via hostSecret updates matchId and preserves seat claim with new role
    const redealRes = await fetch(`${srv.baseUrl}/api/gm-rooms/GMLIVE/sync`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-gm-host-secret': hostSecret },
      body: JSON.stringify({
        hostId: 'gm_host',
        resetMatch: true,
        seats: [
          { id: 'p_1', name: 'Alice', roleId: 'witch', roleSource: 'auto_dealt' },
          { id: 'p_2', name: 'Bob', roleId: 'bodyguard', roleSource: 'auto_dealt' },
          { id: 'p_3', name: 'Carol', roleId: 'werewolf', roleSource: 'auto_dealt' },
          { id: 'p_4', name: 'Dave', roleId: 'villager', roleSource: 'auto_dealt' },
        ],
      }),
    });
    assert.equal(redealRes.status, 200);
    const redealJson = (await redealRes.json()) as { room: { matchId: string } };
    assert.notEqual(redealJson.room.matchId, initialMatchId);

    // Alice polls player state with her playerToken -> sees updated role 'witch' and new matchId
    const pollRes = await fetch(
      `${srv.baseUrl}/api/gm-rooms/GMLIVE/player/u_alice`,
      { headers: { 'x-gm-player-token': p1Json.playerToken } }
    );
    assert.equal(pollRes.status, 200);
    const pollJson = (await pollRes.json()) as { view: { matchId: string; mySeat: { roleId: string } } };
    assert.equal(pollJson.view.matchId, redealJson.room.matchId);
    assert.equal(pollJson.view.mySeat.roleId, 'witch');
  } finally {
    await srv.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

