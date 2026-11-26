import test from 'node:test';
import assert from 'node:assert/strict';
import netlifyApiHandler, {
  config as netlifyApiConfig,
  resetNetlifyApiTestStore,
} from '../../netlify/functions/api.mts';
import { createApiRouter } from './apiRouter.ts';
import { RealtimeRoomManager } from './realtimeRooms.ts';
import { MemoryStateStore, resolveNetlifyStoreMode } from './stateStore.ts';

function req(
  path: string,
  options?: {
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
  }
): Request {
  const headers: Record<string, string> = { ...(options?.headers || {}) };
  let body: string | undefined;
  if (options?.body !== undefined) {
    headers['content-type'] = 'application/json';
    body = JSON.stringify(options.body);
  }
  return new Request(`https://masoi.netlify.app${path}`, {
    method: options?.method ?? (body !== undefined ? 'POST' : 'GET'),
    headers,
    body,
  });
}

test('Netlify Blobs store routing isolates deploy previews from production and api.mts binds /api/*', () => {
  assert.equal(netlifyApiConfig.path, '/api/*');
  assert.equal(resolveNetlifyStoreMode({ deploy: { context: 'production' } }), 'site');
  assert.equal(resolveNetlifyStoreMode({ deploy: { context: 'deploy-preview' } }), 'deploy');
  assert.equal(resolveNetlifyStoreMode({ deploy: { context: 'branch-deploy' } }), 'deploy');
  assert.equal(resolveNetlifyStoreMode({ deploy: { context: 'dev' } }), 'deploy');
  assert.equal(resolveNetlifyStoreMode(undefined), 'deploy');
});

test('Netlify Function /api/health and /api/accounts register, login, me, update work end-to-end', async () => {
  resetNetlifyApiTestStore();

  const healthRes = await netlifyApiHandler(req('/api/health'));
  assert.equal(healthRes.status, 200);
  const health = await healthRes.json();
  assert.deepEqual(health, { ok: true, runtime: 'netlify', wsSupported: false });

  // Register account
  const regRes = await netlifyApiHandler(
    req('/api/accounts/register', {
      body: {
        username: 'netlify_wolf',
        password: 'password123',
        displayName: 'Sói Netlify',
        avatar: '🐺',
        region: 'VN',
      },
    })
  );
  assert.equal(regRes.status, 200);
  const reg = await regRes.json();
  assert.equal(reg.ok, true);
  assert.ok(typeof reg.token === 'string' && reg.token.includes('.'));
  assert.equal(reg.account.username, 'netlify_wolf');
  assert.equal('passwordHash' in reg.account, false);

  // /api/accounts/me requires valid Bearer token
  const meFail = await netlifyApiHandler(req('/api/accounts/me'));
  assert.equal(meFail.status, 401);

  const meOk = await netlifyApiHandler(
    req('/api/accounts/me', {
      headers: { authorization: `Bearer ${reg.token}` },
    })
  );
  assert.equal(meOk.status, 200);
  const meData = await meOk.json();
  assert.equal(meData.account.id, reg.account.id);

  // Login fails on wrong password, succeeds on correct password
  const badLogin = await netlifyApiHandler(
    req('/api/accounts/login', {
      body: { username: 'netlify_wolf', password: 'wrongpassword' },
    })
  );
  assert.equal(badLogin.status, 401);

  const goodLogin = await netlifyApiHandler(
    req('/api/accounts/login', {
      body: { username: 'netlify_wolf', password: 'password123' },
    })
  );
  assert.equal(goodLogin.status, 200);
  const loginData = await goodLogin.json();
  assert.equal(loginData.ok, true);

  // Ownership check on /api/accounts/update
  const crossUpdate = await netlifyApiHandler(
    req('/api/accounts/update', {
      headers: { authorization: `Bearer ${loginData.token}` },
      body: { username: 'someone_else', displayName: 'Hacker' },
    })
  );
  assert.equal(crossUpdate.status, 403);

  const selfUpdate = await netlifyApiHandler(
    req('/api/accounts/update', {
      headers: { authorization: `Bearer ${loginData.token}` },
      body: { displayName: 'Sói Vương', elo: 1650 },
    })
  );
  assert.equal(selfUpdate.status, 200);
  const updated = await selfUpdate.json();
  assert.equal(updated.account.displayName, 'Sói Vương');
  assert.equal(updated.account.elo, 1650);
});

test('Netlify Function 2-player Online Room HTTP flow works end-to-end with zero WebSocket', async () => {
  resetNetlifyApiTestStore();

  // Player 1 creates room NET-101
  const j1Res = await netlifyApiHandler(
    req('/api/rooms/NET-101/join', {
      body: {
        user: { id: 'u_p1', name: 'Chủ Phòng', avatar: '🐺', elo: 1620 },
        villageSize: 6,
      },
    })
  );
  assert.equal(j1Res.status, 200);
  const j1 = await j1Res.json();
  assert.equal(j1.ok, true);
  assert.ok(typeof j1.playerSecret === 'string' && j1.playerSecret.length >= 16);
  assert.equal(j1.room.hostId, 'u_p1');

  // Player 2 joins room NET-101
  const j2Res = await netlifyApiHandler(
    req('/api/rooms/NET-101/join', {
      body: {
        user: { id: 'u_p2', name: 'Khách Hai', avatar: '🔮', elo: 1580 },
        createIfMissing: false,
      },
    })
  );
  assert.equal(j2Res.status, 200);
  const j2 = await j2Res.json();
  assert.equal(j2.ok, true);
  assert.equal(j2.room.participants.length, 2);

  // Room list shows NET-101
  const listRes = await netlifyApiHandler(req('/api/rooms'));
  const listData = await listRes.json();
  assert.equal(listData.ok, true);
  assert.equal(listData.rooms.some((r: { code: string }) => r.code === 'NET-101'), true);

  // State & action strictly reject missing/wrong x-room-player-secret
  const unauthState = await netlifyApiHandler(req('/api/rooms/NET-101/state?userId=u_p2'));
  assert.equal(unauthState.status, 403);
  const badAction = await netlifyApiHandler(
    req('/api/rooms/NET-101/action', {
      headers: { 'x-room-player-secret': 'wrong_secret' },
      body: { userId: 'u_p1', action: 'fill_bots' },
    })
  );
  assert.equal(badAction.status, 403);

  // Host fills bots and starts match via HTTP action
  const fillRes = await netlifyApiHandler(
    req('/api/rooms/NET-101/action', {
      headers: { 'x-room-player-secret': j1.playerSecret },
      body: { userId: 'u_p1', action: 'fill_bots' },
    })
  );
  assert.equal(fillRes.status, 200);
  const filled = await fillRes.json();
  assert.equal(filled.room.participants.length, 6);

  const startRes = await netlifyApiHandler(
    req('/api/rooms/NET-101/action', {
      headers: { 'x-room-player-secret': j1.playerSecret },
      body: { userId: 'u_p1', action: 'start' },
    })
  );
  assert.equal(startRes.status, 200);
  const started = await startRes.json();
  assert.equal(started.room.status, 'in_match');
  assert.equal(started.matchView.phase, 'night');
  assert.equal(started.matchView.round, 1);

  // Player 2 polls /state -> receives sanitized matchView without leaking non-packmate roles
  const p2StateRes = await netlifyApiHandler(
    req('/api/rooms/NET-101/state?userId=u_p2', {
      headers: { 'x-room-player-secret': j2.playerSecret },
    })
  );
  assert.equal(p2StateRes.status, 200);
  const p2State = await p2StateRes.json();
  assert.equal(p2State.ok, true);
  assert.equal(p2State.unchanged, false);
  assert.equal(p2State.room.status, 'in_match');
  assert.equal(p2State.matchView.phase, 'night');

  // Conditional `since` poll returns unchanged: true when nothing changed
  const unchangedRes = await netlifyApiHandler(
    req(`/api/rooms/NET-101/state?userId=u_p2&since=${p2State.room.updatedAt}`, {
      headers: { 'x-room-player-secret': j2.playerSecret },
    })
  );
  const unchanged = await unchangedRes.json();
  assert.equal(unchanged.ok, true);
  assert.equal(unchanged.unchanged, true);

  // Chat via HTTP action propagates to other player on next poll; throwing prop at Night is rejected with 403!
  const chatRes = await netlifyApiHandler(
    req('/api/rooms/NET-101/action', {
      headers: { 'x-room-player-secret': j1.playerSecret },
      body: {
        userId: 'u_p1',
        action: 'chat',
        message: { id: 'http_msg_1', senderName: 'Chủ Phòng', text: 'Chào làng qua HTTP!' },
      },
    })
  );
  assert.equal(chatRes.status, 200);

  const nightPropRes = await netlifyApiHandler(
    req('/api/rooms/NET-101/action', {
      headers: { 'x-room-player-secret': j2.playerSecret },
      body: {
        userId: 'u_p2',
        action: 'prop',
        event: { id: 'http_prop_night_blocked', propType: 'rose', targetPlayerId: 'u_p1' },
      },
    })
  );
  assert.equal(nightPropRes.status, 403);

  const p1Poll = await (
    await netlifyApiHandler(
      req('/api/rooms/NET-101/state?userId=u_p1', {
        headers: { 'x-room-player-secret': j1.playerSecret },
      })
    )
  ).json();
  assert.equal(p1Poll.room.chatMessages.some((m: { id: string }) => m.id === 'http_msg_1'), true);
  assert.equal(
    p1Poll.recentProps.some((e: { id: string }) => e.id === 'http_prop_night_blocked'),
    false
  );

  // Test kick detection over HTTP polling on a waiting room
  const kickRoomP1 = await (
    await netlifyApiHandler(
      req('/api/rooms/NET-KICK/join', {
        body: { user: { id: 'k_host', name: 'Host', avatar: '🐺', elo: 1500 }, villageSize: 4 },
      })
    )
  ).json();
  const kickRoomP2 = await (
    await netlifyApiHandler(
      req('/api/rooms/NET-KICK/join', {
        body: { user: { id: 'k_guest', name: 'Guest', avatar: '🛡️', elo: 1500 }, createIfMissing: false },
      })
    )
  ).json();

  const kickRes = await netlifyApiHandler(
    req('/api/rooms/NET-KICK/action', {
      headers: { 'x-room-player-secret': kickRoomP1.playerSecret },
      body: { userId: 'k_host', action: 'kick', targetId: 'k_guest' },
    })
  );
  assert.equal(kickRes.status, 200);

  const kickedPoll = await (
    await netlifyApiHandler(
      req('/api/rooms/NET-KICK/state?userId=k_guest', {
        headers: { 'x-room-player-secret': kickRoomP2.playerSecret },
      })
    )
  ).json();
  assert.equal(kickedPoll.kicked, true);
});

test('Netlify Function /api/gm-rooms enforces hostSecret and playerToken 403/200 security', async () => {
  resetNetlifyApiTestStore();

  // Host creates physical_cards GM room
  const syncRes = await netlifyApiHandler(
    req('/api/gm-rooms/GM-NET1/sync', {
      body: {
        hostId: 'gm_owner_1',
        deckMode: 'physical_cards',
        status: 'setup',
        playerCount: 4,
      },
    })
  );
  assert.equal(syncRes.status, 200);
  const syncData = await syncRes.json();
  assert.equal(syncData.ok, true);
  assert.ok(typeof syncData.hostSecret === 'string' && syncData.hostSecret.length === 32);

  // GET /host without secret or wrong secret -> 403; with right secret -> 200
  assert.equal((await netlifyApiHandler(req('/api/gm-rooms/GM-NET1/host'))).status, 403);
  assert.equal(
    (
      await netlifyApiHandler(
        req('/api/gm-rooms/GM-NET1/host', {
          headers: { 'x-gm-host-secret': 'wrong_secret' },
        })
      )
    ).status,
    403
  );
  const hostOk = await netlifyApiHandler(
    req('/api/gm-rooms/GM-NET1/host', {
      headers: { 'x-gm-host-secret': syncData.hostSecret },
    })
  );
  assert.equal(hostOk.status, 200);

  // Unauthorized host sync rejected with 403
  const hijackSync = await netlifyApiHandler(
    req('/api/gm-rooms/GM-NET1/sync', {
      headers: { 'x-gm-host-secret': 'wrong_secret' },
      body: { hostId: 'gm_owner_1', round: 2 },
    })
  );
  assert.equal(hijackSync.status, 403);

  // Player joins -> receives playerToken + isolated view
  const joinRes = await netlifyApiHandler(
    req('/api/gm-rooms/GM-NET1/join', {
      body: { user: { id: 'gm_p1', name: 'Minh Anh' } },
    })
  );
  assert.equal(joinRes.status, 200);
  const joinData = await joinRes.json();
  assert.equal(joinData.ok, true);
  assert.ok(typeof joinData.playerToken === 'string' && joinData.playerToken.length === 24);

  // Player endpoints strictly require matching x-gm-player-token (403 vs 200)
  assert.equal((await netlifyApiHandler(req('/api/gm-rooms/GM-NET1/player/gm_p1'))).status, 403);
  assert.equal(
    (
      await netlifyApiHandler(
        req('/api/gm-rooms/GM-NET1/self-role', {
          headers: { 'x-gm-player-token': 'bad_token' },
          body: { userId: 'gm_p1', roleId: 'seer' },
        })
      )
    ).status,
    403
  );

  const selfOk = await netlifyApiHandler(
    req('/api/gm-rooms/GM-NET1/self-role', {
      headers: { 'x-gm-player-token': joinData.playerToken },
      body: { userId: 'gm_p1', roleId: 'seer' },
    })
  );
  assert.equal(selfOk.status, 200);
  const selfData = await selfOk.json();
  assert.equal(selfData.view.mySeat.roleId, 'seer');

  const viewOk = await netlifyApiHandler(
    req('/api/gm-rooms/GM-NET1/player/gm_p1', {
      headers: { 'x-gm-player-token': joinData.playerToken },
    })
  );
  assert.equal(viewOk.status, 200);

  // Leave fails with bad token, succeeds with valid token
  assert.equal(
    (
      await netlifyApiHandler(
        req('/api/gm-rooms/GM-NET1/leave', {
          headers: { 'x-gm-player-token': 'bad_token' },
          body: { userId: 'gm_p1' },
        })
      )
    ).status,
    403
  );
  assert.equal(
    (
      await netlifyApiHandler(
        req('/api/gm-rooms/GM-NET1/leave', {
          headers: { 'x-gm-player-token': joinData.playerToken },
          body: { userId: 'gm_p1' },
        })
      )
    ).status,
    200
  );
});

test('HTTP apiRouter enforces prop anti-cheat (403, no onRoomMutated) and zero-leak ghostNightState on Netlify serverless store', async () => {
  const store = new MemoryStateStore();
  const mutatedEvents: Array<{ code: string; kind: string }> = [];
  const router = createApiRouter({
    store,
    isNetlify: true,
    persistRooms: true,
    hooks: {
      onRoomMutated(code, kind) {
        mutatedEvents.push({ code, kind });
      },
    },
  });

  // Seed deterministic 5-player room directly into persisted store (simulating Netlify Blobs)
  const seedMgr = new RealtimeRoomManager();
  const now = Date.now();
  seedMgr.createOrJoinRoom('NET-PROP', { id: 'u_host', name: 'Host', avatar: '👑', elo: 1600 }, { villageSize: 5 });
  seedMgr.createOrJoinRoom('NET-PROP', { id: 'u_wolf', name: 'Wolf', avatar: '🐺', elo: 1550 });
  seedMgr.createOrJoinRoom('NET-PROP', { id: 'u_seer', name: 'Seer', avatar: '🔮', elo: 1550 });
  seedMgr.createOrJoinRoom('NET-PROP', { id: 'u_vil', name: 'Villager', avatar: '🧑‍🌾', elo: 1500 });
  seedMgr.createOrJoinRoom('NET-PROP', { id: 'u_ghost', name: 'Ghost', avatar: '👻', elo: 1500 });

  const hostSecret = seedMgr.getOrIssuePlayerSecret('NET-PROP', 'u_host');
  const wolfSecret = seedMgr.getOrIssuePlayerSecret('NET-PROP', 'u_wolf');
  const seerSecret = seedMgr.getOrIssuePlayerSecret('NET-PROP', 'u_seer');
  const ghostSecret = seedMgr.getOrIssuePlayerSecret('NET-PROP', 'u_ghost');

  assert.equal(
    seedMgr.startMatch('NET-PROP', 'u_host', {
      now,
      customRoles: {
        u_host: 'villager',
        u_wolf: 'werewolf',
        u_seer: 'seer',
        u_vil: 'villager',
        u_ghost: 'villager',
      },
    }).ok,
    true
  );

  // Kill u_ghost on Night 1 -> Dawn (day_discussion)
  assert.equal(seedMgr.submitNightAction('NET-PROP', 'u_wolf', { actionType: 'wolf_bite', targetId: 'u_ghost' }, now).ok, true);
  assert.equal(seedMgr.submitNightAction('NET-PROP', 'u_wolf', { actionType: 'confirm_done' }, now).ok, true);
  assert.equal(seedMgr.submitNightAction('NET-PROP', 'u_seer', { actionType: 'confirm_done' }, now).ok, true);
  assert.equal(seedMgr.getMatchState('NET-PROP')?.phase, 'day_discussion');

  await store.setJSON('rooms/NET-PROP/state', seedMgr.exportSnapshot('NET-PROP'));

  // 1. Dead Ghost throwing prop during Day Discussion -> HTTP 403 and NO onRoomMutated!
  const ghostDayProp = await router.handleRequest(
    req('/api/rooms/NET-PROP/action', {
      headers: { 'x-room-player-secret': ghostSecret },
      body: {
        userId: 'u_ghost',
        action: 'prop',
        event: { id: 'p_ghost_day', propType: 'tomato', targetPlayerId: 'u_wolf' },
      },
    }),
    { now }
  );
  assert.equal(ghostDayProp.status, 403);
  assert.equal((await ghostDayProp.json()).ok, false);
  assert.equal(mutatedEvents.length, 0);

  // 2. Living player throwing at dead Ghost or at self during Day Discussion -> HTTP 403 and NO onRoomMutated!
  const hitDeadProp = await router.handleRequest(
    req('/api/rooms/NET-PROP/action', {
      headers: { 'x-room-player-secret': hostSecret },
      body: {
        userId: 'u_host',
        action: 'prop',
        event: { id: 'p_hit_dead', propType: 'rose', targetPlayerId: 'u_ghost' },
      },
    }),
    { now }
  );
  assert.equal(hitDeadProp.status, 403);

  const selfProp = await router.handleRequest(
    req('/api/rooms/NET-PROP/action', {
      headers: { 'x-room-player-secret': hostSecret },
      body: {
        userId: 'u_host',
        action: 'prop',
        event: { id: 'p_self', propType: 'egg', targetPlayerId: 'u_host' },
      },
    }),
    { now }
  );
  assert.equal(selfProp.status, 403);
  assert.equal(mutatedEvents.length, 0);

  // 3. Living player throwing at another living player during Day Discussion -> HTTP 200 + onRoomMutated('prop')!
  const okDayProp = await router.handleRequest(
    req('/api/rooms/NET-PROP/action', {
      headers: { 'x-room-player-secret': hostSecret },
      body: {
        userId: 'u_host',
        action: 'prop',
        event: { id: 'p_day_ok', propType: 'rose', targetPlayerId: 'u_seer' },
      },
    }),
    { now }
  );
  assert.equal(okDayProp.status, 200);
  const okDayBody = await okDayProp.json();
  assert.equal(okDayBody.ok, true);
  assert.equal(okDayBody.recentProps.some((e: { id: string }) => e.id === 'p_day_ok'), true);
  assert.deepEqual(mutatedEvents, [{ code: 'NET-PROP', kind: 'prop' }]);

  // 4. Advance to Day Voting: living -> living succeeds (200), dead Ghost still blocked (403)
  assert.equal(
    (
      await router.handleRequest(
        req('/api/rooms/NET-PROP/action', {
          headers: { 'x-room-player-secret': hostSecret },
          body: { userId: 'u_host', action: 'advance_phase' },
        }),
        { now: now + 100 }
      )
    ).status,
    200
  );
  assert.equal(
    (
      await router.handleRequest(
        req('/api/rooms/NET-PROP/action', {
          headers: { 'x-room-player-secret': ghostSecret },
          body: {
            userId: 'u_ghost',
            action: 'prop',
            event: { id: 'p_ghost_vote', propType: 'water', targetPlayerId: 'u_wolf' },
          },
        }),
        { now: now + 150 }
      )
    ).status,
    403
  );
  assert.equal(
    (
      await router.handleRequest(
        req('/api/rooms/NET-PROP/action', {
          headers: { 'x-room-player-secret': seerSecret },
          body: {
            userId: 'u_seer',
            action: 'prop',
            event: { id: 'p_vote_ok', propType: 'water', targetPlayerId: 'u_host' },
          },
        }),
        { now: now + 200 }
      )
    ).status,
    200
  );

  // 5. Advance to Night 2: both dead Ghost and living player blocked from props (403),
  // AND Netlify HTTP /state serves omniscient ghostNightState ONLY to u_ghost (null to living u_host/u_seer/u_wolf)!
  assert.equal(
    (
      await router.handleRequest(
        req('/api/rooms/NET-PROP/action', {
          headers: { 'x-room-player-secret': hostSecret },
          body: { userId: 'u_host', action: 'advance_phase' },
        }),
        { now: now + 300 }
      )
    ).status,
    200
  );

  const countBeforeNightProps = mutatedEvents.length;
  assert.equal(
    (
      await router.handleRequest(
        req('/api/rooms/NET-PROP/action', {
          headers: { 'x-room-player-secret': ghostSecret },
          body: {
            userId: 'u_ghost',
            action: 'prop',
            event: { id: 'p_ghost_night', propType: 'tomato', targetPlayerId: 'u_wolf' },
          },
        }),
        { now: now + 350 }
      )
    ).status,
    403
  );
  assert.equal(
    (
      await router.handleRequest(
        req('/api/rooms/NET-PROP/action', {
          headers: { 'x-room-player-secret': hostSecret },
          body: {
            userId: 'u_host',
            action: 'prop',
            event: { id: 'p_living_night', propType: 'tomato', targetPlayerId: 'u_seer' },
          },
        }),
        { now: now + 360 }
      )
    ).status,
    403
  );
  assert.equal(mutatedEvents.length, countBeforeNightProps);

  // Wolf picks u_vil and confirms over HTTP -> Ghost /state receives skillCutscenes, living players get null!
  assert.equal(
    (
      await router.handleRequest(
        req('/api/rooms/NET-PROP/action', {
          headers: { 'x-room-player-secret': wolfSecret },
          body: { userId: 'u_wolf', action: 'night_action', actionType: 'wolf_bite', targetId: 'u_vil' },
        }),
        { now: now + 400 }
      )
    ).status,
    200
  );
  assert.equal(
    (
      await router.handleRequest(
        req('/api/rooms/NET-PROP/action', {
          headers: { 'x-room-player-secret': wolfSecret },
          body: { userId: 'u_wolf', action: 'night_action', actionType: 'confirm_done' },
        }),
        { now: now + 450 }
      )
    ).status,
    200
  );

  const ghostStateBody = await (
    await router.handleRequest(
      req('/api/rooms/NET-PROP/state?userId=u_ghost', {
        headers: { 'x-room-player-secret': ghostSecret },
      }),
      { now: now + 500 }
    )
  ).json();
  const livingStateBody = await (
    await router.handleRequest(
      req('/api/rooms/NET-PROP/state?userId=u_host', {
        headers: { 'x-room-player-secret': hostSecret },
      }),
      { now: now + 500 }
    )
  ).json();

  assert.equal(livingStateBody.matchView.ghostNightState, null);
  assert.ok(ghostStateBody.matchView.ghostNightState);
  assert.deepEqual(ghostStateBody.matchView.ghostNightState.wakingActorIds, ['u_seer']);
  assert.equal(
    ghostStateBody.matchView.ghostNightState.skillCutscenes.some(
      (c: { kind: string; primaryTargetId: string | null }) =>
        c.kind === 'werewolf' && c.primaryTargetId === 'u_vil'
    ),
    true
  );
});
