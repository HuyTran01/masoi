import test from 'node:test';
import assert from 'node:assert/strict';
import netlifyApiHandler, {
  config as netlifyApiConfig,
  resetNetlifyApiTestStore,
} from '../../netlify/functions/api.mts';
import { resolveNetlifyStoreMode } from './stateStore.ts';

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

  // Chat & Prop via HTTP action propagate to other player on next poll
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

  const propRes = await netlifyApiHandler(
    req('/api/rooms/NET-101/action', {
      headers: { 'x-room-player-secret': j2.playerSecret },
      body: {
        userId: 'u_p2',
        action: 'prop',
        event: { id: 'http_prop_1', propType: 'rose', targetPlayerId: 'u_p1' },
      },
    })
  );
  assert.equal(propRes.status, 200);

  const p1Poll = await (
    await netlifyApiHandler(
      req('/api/rooms/NET-101/state?userId=u_p1', {
        headers: { 'x-room-player-secret': j1.playerSecret },
      })
    )
  ).json();
  assert.equal(p1Poll.room.chatMessages.some((m: { id: string }) => m.id === 'http_msg_1'), true);
  assert.equal(p1Poll.recentProps.some((e: { id: string }) => e.id === 'http_prop_1'), true);

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
