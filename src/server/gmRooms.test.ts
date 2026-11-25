import test from 'node:test';
import assert from 'node:assert/strict';
import { GMRoomManager } from './gmRooms';

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

