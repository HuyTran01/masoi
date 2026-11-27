import test from 'node:test';
import assert from 'node:assert/strict';
import WebSocket from 'ws';
import { createRealtimeAppServer, type RealtimeAppServerHandle } from './realtimeServer.ts';
import type { OnlinePlayerMatchView } from './onlineMatchEngine.ts';
import type { RealtimeChatMessage, RealtimeRoomState } from './realtimeRooms.ts';
import { ROLES } from '../game/roles.ts';
import type { RoleId } from '../types/game.ts';

type BotPersona = 'newbie' | 'debater' | 'reconnector' | 'griefer';

interface ServerMsg {
  type: string;
  code?: string;
  room?: RealtimeRoomState;
  view?: OnlinePlayerMatchView;
  message?: RealtimeChatMessage | string;
  errorCode?: string;
  playerSecret?: string;
  userId?: string;
  votes?: Record<string, string>;
  serverNow?: number;
}

class SimWsClient {
  readonly userId: string;
  readonly name: string;
  readonly persona: BotPersona;
  readonly lang: 'vi' | 'en';
  ws: WebSocket | null = null;
  playerSecret = '';
  room: RealtimeRoomState | null = null;
  view: OnlinePlayerMatchView | null = null;
  chatLog: RealtimeChatMessage[] = [];
  errors: Array<{ code?: string; message: string }> = [];
  framesChecked = 0;
  leaks: string[] = [];
  reconnects = 0;
  rateLimitHits = 0;
  blockedIllegals = 0;

  private waiters: Array<{ pred: (msg: ServerMsg) => boolean; resolve: (msg: ServerMsg) => void }> = [];

  constructor(userId: string, name: string, persona: BotPersona, lang: 'vi' | 'en') {
    this.userId = userId;
    this.name = name;
    this.persona = persona;
    this.lang = lang;
  }

  async connect(wsUrl: string): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(wsUrl);
      this.ws = ws;
      ws.once('open', () => resolve());
      ws.once('error', reject);
      ws.on('message', (raw) => {
        let parsed: ServerMsg;
        try {
          parsed = JSON.parse(String(raw)) as ServerMsg;
        } catch {
          return;
        }
        this.handleIncoming(parsed);
      });
    });
  }

  private handleIncoming(msg: ServerMsg): void {
    if (msg.type === 'room:joined' && typeof msg.playerSecret === 'string') {
      this.playerSecret = msg.playerSecret;
    }
    if (msg.room) {
      this.room = msg.room;
    }
    if (msg.type === 'room:match_state' && msg.view) {
      this.view = msg.view;
      this.framesChecked += 1;
      this.assertZeroLeakFrame(msg.view);
    }
    if (msg.type === 'room:chat' && msg.message && typeof msg.message === 'object') {
      const chat = msg.message as RealtimeChatMessage;
      this.chatLog.push(chat);
      const me = this.view?.players.find((p) => p.id === this.userId);
      if (me && me.isAlive && chat.isGhost) {
        this.leaks.push(`Living player ${this.userId} received Ghost chat: ${chat.id}`);
      }
    }
    if (msg.type === 'error') {
      const code = (msg as unknown as { code?: string }).code;
      const text = typeof msg.message === 'string' ? msg.message : 'error';
      this.errors.push({ code, message: text });
      if (code === 'RATE_LIMITED') this.rateLimitHits += 1;
      else this.blockedIllegals += 1;
    }

    for (let i = this.waiters.length - 1; i >= 0; i--) {
      const w = this.waiters[i];
      if (w.pred(msg)) {
        this.waiters.splice(i, 1);
        w.resolve(msg);
      }
    }
  }

  private assertZeroLeakFrame(view: OnlinePlayerMatchView): void {
    const forbiddenPhase = ['hunter', 'revenge'].join('_');
    if ((view.phase as string) === forbiddenPhase) {
      this.leaks.push(`Forbidden legacy phase seen by ${this.userId}`);
    }
    // Check no duplicate votes per voterId
    const voterSet = new Set<string>();
    for (const v of view.votes) {
      if (voterSet.has(v.voterId)) {
        this.leaks.push(`Duplicate vote from ${v.voterId} in round ${view.round}`);
      }
      voterSet.add(v.voterId);
    }

    const me = view.players.find((p) => p.id === this.userId);
    if (!me) return;
    if (view.phase === 'game_over') return;

    if (me.isAlive) {
      if (view.ghostNightState !== null && view.ghostNightState !== undefined) {
        this.leaks.push(`Living player ${this.userId} received non-null ghostNightState`);
      }
      const myRoleDef = ROLES[me.roleId];
      const amWolf = myRoleDef?.faction === 'werewolf';
      for (const other of view.players) {
        if (other.id === me.id) continue;
        if (other.isAlive) {
          // Living non-elder must never see another living player's elderLives
          if (other.elderLives !== undefined) {
            this.leaks.push(`Living player ${this.userId} saw elderLives of ${other.id}`);
          }
          // Non-wolf must never see any other living player's true non-villager role
          if (!amWolf && other.roleId !== 'villager') {
            this.leaks.push(
              `Living non-wolf ${this.userId} (${me.roleId}) saw living ${other.id}'s role ${other.roleId}`
            );
          }
          // Wolf may only see packmates (werewolf faction), never villager power roles
          if (amWolf && other.roleId !== 'villager' && ROLES[other.roleId]?.faction !== 'werewolf') {
            this.leaks.push(
              `Living wolf ${this.userId} saw non-wolf ${other.id}'s secret role ${other.roleId}`
            );
          }
        }
      }
    }
  }

  send(payload: Record<string, unknown>): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    }
  }

  waitFor(pred: (msg: ServerMsg) => boolean, timeoutMs = 4000): Promise<ServerMsg> {
    return new Promise<ServerMsg>((resolve, reject) => {
      const timer = setTimeout(() => {
        const idx = this.waiters.findIndex((w) => w.resolve === onResolve);
        if (idx >= 0) this.waiters.splice(idx, 1);
        reject(new Error(`Timeout waiting for WS message for ${this.userId}`));
      }, timeoutMs);
      const onResolve = (msg: ServerMsg) => {
        clearTimeout(timer);
        resolve(msg);
      };
      this.waiters.push({ pred, resolve: onResolve });
    });
  }

  async joinRoom(code: string, maxPlayers: number, isReconnect = false): Promise<void> {
    const p = this.waitFor((m) => m.type === 'room:joined' || m.type === 'room:state');
    this.send({
      type: 'room:join',
      code,
      user: {
        id: this.userId,
        name: this.name,
        avatar: '🐺',
      },
      lang: this.lang,
      maxPlayers,
      createIfMissing: true,
      playerSecret: isReconnect ? this.playerSecret : undefined,
    });
    await p;
    if (isReconnect) this.reconnects += 1;
  }

  async close(): Promise<void> {
    if (!this.ws) return;
    const ws = this.ws;
    this.ws = null;
    if (ws.readyState === WebSocket.CLOSED) return;
    await new Promise<void>((resolve) => {
      ws.once('close', () => resolve());
      ws.close();
    });
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function getCurrentHost(clients: SimWsClient[]): SimWsClient | undefined {
  const active = clients.find((c) => c.ws && c.ws.readyState === WebSocket.OPEN && c.room);
  const hostId = active?.room?.hostId;
  return clients.find((c) => c.userId === hostId && c.ws && c.ws.readyState === WebSocket.OPEN);
}

async function waitForViewCondition(
  clients: SimWsClient[],
  pred: (view: OnlinePlayerMatchView) => boolean,
  timeoutMs = 3000
): Promise<OnlinePlayerMatchView> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    for (const c of clients) {
      if (c.ws?.readyState === WebSocket.OPEN && c.view && pred(c.view)) {
        return c.view;
      }
    }
    await delay(20);
  }
  const sample = clients.find((c) => c.view)?.view;
  throw new Error(
    `waitForViewCondition timed out. Last sample phase=${sample?.phase} round=${sample?.round} step=${sample?.nightStepIndex}`
  );
}

function chooseLegalNightActions(
  client: SimWsClient,
  view: OnlinePlayerMatchView
): Array<{ actionType: string; targetId?: string | null; secondTargetId?: string | null }> {
  const me = view.players.find((p) => p.id === client.userId);
  const stepKey = view.currentNightStep?.key;
  if (!me || !me.isAlive || !stepKey || !view.isMyNightTurn) return [];

  // Newbie persona occasionally omits optional Hunter mark on Round 1 (tests explicit no-mark / null)
  if (client.persona === 'newbie' && stepKey === 'hunter' && view.round === 1) {
    return [{ actionType: 'hunter_mark', targetId: null }, { actionType: 'confirm_done' }];
  }

  const livingOthers = view.players.filter((p) => p.isAlive && p.id !== me.id);
  const firstLiving = livingOthers[0] || me;

  switch (stepKey) {
    case 'werewolf': {
      const nonWolves = livingOthers.filter((p) => ROLES[p.roleId]?.faction !== 'werewolf');
      const target = nonWolves[0] || firstLiving;
      const acts: Array<{ actionType: string; targetId?: string | null }> = [
        { actionType: 'wolf_bite', targetId: target.id },
      ];
      if (view.wolfPupFrenzy && nonWolves.length >= 2) {
        acts.push({ actionType: 'wolf_second_bite', targetId: nonWolves[1].id });
      }
      acts.push({ actionType: 'confirm_done' });
      return acts;
    }
    case 'bodyguard': {
      const valid = view.players.find((p) => p.isAlive && !p.protectedLastNight);
      return [{ actionType: 'guard', targetId: valid?.id ?? me.id }, { actionType: 'confirm_done' }];
    }
    case 'seer':
      return [{ actionType: 'seer_inspect', targetId: firstLiving.id }, { actionType: 'confirm_done' }];
    case 'hunter':
      return [{ actionType: 'hunter_mark', targetId: firstLiving.id }, { actionType: 'confirm_done' }];
    case 'witch': {
      const victim = view.dyingWolfVictimIds?.[0] ?? null;
      const acts: Array<{ actionType: string; targetId?: string | null }> = [];
      if (victim && !me.hasUsedHeal) {
        acts.push({ actionType: 'witch_heal', targetId: victim });
      } else if (!me.hasUsedPoison && livingOthers.length > 0 && view.round >= 2) {
        acts.push({ actionType: 'witch_poison', targetId: livingOthers[0].id });
      }
      acts.push({ actionType: 'confirm_done' });
      return acts;
    }
    case 'cupid': {
      if (livingOthers.length >= 2) {
        return [
          {
            actionType: 'cupid_link',
            targetId: livingOthers[0].id,
            secondTargetId: livingOthers[1].id,
          },
          { actionType: 'confirm_done' },
        ];
      }
      return [{ actionType: 'confirm_done' }];
    }
    case 'doppelganger':
      return [
        { actionType: 'doppelganger_pick', targetId: firstLiving.id },
        { actionType: 'confirm_done' },
      ];
    default:
      return [{ actionType: 'confirm_done' }];
  }
}

async function runFullOnlineMatch(options: {
  server: RealtimeAppServerHandle;
  roomCode: string;
  totalPlayers: number;
  humanCount: number;
  testMidGameHostDisconnect?: boolean;
  testRematch?: boolean;
}): Promise<{
  clients: SimWsClient[];
  winners: string[];
  roundsPlayed: number[];
  hostTransferred: boolean;
}> {
  const { server, roomCode, totalPlayers, humanCount, testMidGameHostDisconnect, testRematch } =
    options;
  const personas: BotPersona[] = ['debater', 'newbie', 'reconnector', 'griefer'];
  const clients: SimWsClient[] = [];

  for (let i = 0; i < humanCount; i++) {
    const persona = personas[i % personas.length];
    const lang: 'vi' | 'en' = i % 3 === 1 ? 'en' : 'vi';
    const c = new SimWsClient(`sim_${roomCode}_u${i + 1}`, `Player${i + 1}`, persona, lang);
    await c.connect(server.wsUrl);
    await c.joinRoom(roomCode, totalPlayers, false);
    clients.push(c);

    // Host configures exact room capacity & fast timers before guests join (default is 8)
    if (i === 0) {
      const cfgP = c.waitFor((m) => Boolean(m.room && m.room.villageSize === totalPlayers));
      c.send({
        type: 'room:config',
        code: roomCode,
        config: {
          villageSize: totalPlayers,
          timerConfig: { nightActionSec: 15, dayDiscussSec: 20, dayVoteSec: 15 },
        },
      });
      await cfgP;
    }
  }

  // Griefer tries illegal non-host start & kick while waiting in lobby
  const griefer = clients.find((c) => c.persona === 'griefer' && c.userId !== clients[0].userId);
  if (griefer) {
    const errP = griefer.waitFor((m) => m.type === 'error');
    griefer.send({ type: 'room:start', code: roomCode });
    await errP;

    const kickErrP = griefer.waitFor((m) => m.type === 'error');
    griefer.send({ type: 'room:kick', code: roomCode, targetId: clients[0].userId });
    await kickErrP;
  }

  // Fill remaining seats with bots if totalPlayers > humanCount
  if (totalPlayers > humanCount) {
    const filledP = clients[0].waitFor(
      (m) => Boolean(m.room && m.room.participants.length === totalPlayers)
    );
    clients[0].send({ type: 'room:fill_bots', code: roomCode });
    await filledP;
  }

  // Host starts match
  clients[0].send({ type: 'room:start', code: roomCode });

  const winners: string[] = [];
  const roundsPlayed: number[] = [];
  let hostTransferred = false;

  const playOneGame = async (expectedMatchId: number) => {
    let view = await waitForViewCondition(
      clients,
      (v) => v.matchId === expectedMatchId && v.phase === 'night'
    );

    let reconnectedOnce = false;
    let hostDisconnectedOnce = false;
    let grieferProbedOnce = false;
    let deadGrieferProbedOnce = false;

    for (let guard = 0; guard < 220; guard++) {
      const host = getCurrentHost(clients);
      assert.ok(host, `Room ${roomCode} must always have an active human host`);
      view = host.view || view;
      if (view.phase === 'game_over') break;

      // Test Reconnector persona mid-match
      if (!reconnectedOnce && view.phase === 'day_discussion') {
        const rec = clients.find(
          (c) =>
            c.persona === 'reconnector' &&
            c.userId !== host.userId &&
            c.ws?.readyState === WebSocket.OPEN
        );
        if (rec) {
          reconnectedOnce = true;
          const prevRole = rec.view?.players.find((p) => p.id === rec.userId)?.roleId;
          await rec.close();
          await delay(60);
          await rec.connect(server.wsUrl);
          await rec.joinRoom(roomCode, totalPlayers, true);
          const afterView = await waitForViewCondition([rec], (v) => v.matchId === expectedMatchId);
          assert.equal(
            afterView.players.find((p) => p.id === rec.userId)?.roleId,
            prevRole,
            'Reconnector must restore exact secret role after mid-match reconnect'
          );
        }
      }

      // Test mid-game Host disconnect -> grace expiry -> host transfer -> new host completes match
      if (testMidGameHostDisconnect && !hostDisconnectedOnce && view.phase === 'day_discussion') {
        hostDisconnectedOnce = true;
        const oldHost = host;
        const oldHostId = oldHost.userId;
        await oldHost.close();
        // Wait past 250ms hostDisconnectGraceMs + tick interval so server promotes next human
        const promotedView = await waitForViewCondition(
          clients.filter((c) => c.userId !== oldHostId),
          (v) => v.matchId === expectedMatchId && v.phase === 'day_discussion',
          2000
        );
        await delay(380);
        const newHost = getCurrentHost(clients);
        assert.ok(newHost && newHost.userId !== oldHostId, 'Host must transfer after grace expiry');
        hostTransferred = true;
        view = promotedView;
      }

      const activeHost = getCurrentHost(clients)!;
      view = activeHost.view || view;
      if (view.phase === 'game_over') break;

      if (view.phase === 'night') {
        const stepIdx = view.nightStepIndex;
        const stepKey = view.currentNightStep?.key;
        // Every connected waking human submits legal night action(s) + confirm_done
        for (const c of clients) {
          if (!c.ws || c.ws.readyState !== WebSocket.OPEN || !c.view) continue;
          const acts = chooseLegalNightActions(c, c.view);
          for (const act of acts) {
            c.send({ type: 'room:night_action', code: roomCode, action: act });
          }
        }
        await delay(30);
        // Host advances step if it's a bot-only/empty step (ignored if already auto-advanced)
        const latestHostView = activeHost.view;
        if (
          latestHostView &&
          latestHostView.phase === 'night' &&
          latestHostView.nightStepIndex === stepIdx &&
          latestHostView.currentNightStep?.key === stepKey
        ) {
          activeHost.send({
            type: 'room:advance_phase',
            code: roomCode,
            expectedStepIndex: stepIdx,
          });
        }
        // Wait for step or phase to change
        view = await waitForViewCondition(clients, (v) => {
          if (v.matchId !== expectedMatchId) return false;
          if (v.phase !== 'night') return true;
          return v.nightStepIndex !== stepIdx || v.currentNightStep?.key !== stepKey;
        });
        continue;
      }

      if (view.phase === 'day_discussion') {
        // Debater chats during day
        const debater = clients.find(
          (c) =>
            c.persona === 'debater' &&
            c.ws?.readyState === WebSocket.OPEN &&
            c.view?.players.find((p) => p.id === c.userId)?.isAlive
        );
        if (debater) {
          debater.send({
            type: 'room:chat',
            code: roomCode,
            message: {
              id: `deb_${roomCode}_${view.round}_${Date.now()}`,
              senderName: debater.name,
              text: `Round ${view.round}: checking suspicious votes!`,
              timestamp: Date.now(),
              isGhost: false,
            },
          });
        }

        // Griefer probes illegal living ghost chat + burst rate limit once
        if (!grieferProbedOnce && griefer && griefer.ws?.readyState === WebSocket.OPEN) {
          const gMe = griefer.view?.players.find((p) => p.id === griefer.userId);
          if (gMe?.isAlive) {
            grieferProbedOnce = true;
            // Living player trying Ghost chat -> must be rejected
            griefer.send({
              type: 'room:chat',
              code: roomCode,
              message: {
                id: `illegal_ghost_${Date.now()}`,
                senderName: griefer.name,
                text: 'Trying to leak into ghost chat while alive',
                timestamp: Date.now(),
                isGhost: true,
              },
            });
            // Spam >15 chat messages rapidly -> must hit RATE_LIMITED
            for (let k = 0; k < 18; k++) {
              griefer.send({
                type: 'room:chat',
                code: roomCode,
                message: {
                  id: `spam_${roomCode}_${k}_${Date.now()}`,
                  senderName: griefer.name,
                  text: `spam #${k}`,
                  timestamp: Date.now(),
                  isGhost: false,
                },
              });
            }
            await delay(60);
            assert.ok(
              griefer.rateLimitHits >= 1,
              `Griefer spam burst must trigger RATE_LIMITED in room ${roomCode}`
            );
          }
        }

        // Dead player illegal probes (main chat & prop throw while dead)
        if (!deadGrieferProbedOnce) {
          const deadClient = clients.find(
            (c) =>
              c.ws?.readyState === WebSocket.OPEN &&
              c.view?.players.find((p) => p.id === c.userId && !p.isAlive)
          );
          if (deadClient) {
            deadGrieferProbedOnce = true;
            const beforeBlocked = deadClient.blockedIllegals;
            const aliveTarget = deadClient.view!.players.find((p) => p.isAlive);
            deadClient.send({
              type: 'room:chat',
              code: roomCode,
              message: {
                id: `dead_main_${Date.now()}`,
                senderName: deadClient.name,
                text: 'Dead player trying main chat',
                timestamp: Date.now(),
                isGhost: false,
              },
            });
            if (aliveTarget) {
              deadClient.send({
                type: 'room:prop',
                code: roomCode,
                event: {
                  id: `dead_prop_${Date.now()}`,
                  propType: 'tomato',
                  fromPlayerId: deadClient.userId,
                  targetPlayerId: aliveTarget.id,
                  timestamp: Date.now(),
                },
              });
            }
            await delay(50);
            assert.ok(
              deadClient.blockedIllegals >= beforeBlocked + 2,
              'Dead player main chat & prop throw must both be rejected by server'
            );
          }
        }

        // Advance day_discussion -> day_voting
        activeHost.send({ type: 'room:advance_phase', code: roomCode });
        view = await waitForViewCondition(
          clients,
          (v) => v.matchId === expectedMatchId && v.phase !== 'day_discussion'
        );
        continue;
      }

      if (view.phase === 'day_voting') {
        const living = view.players.filter((p) => p.isAlive);
        // Pick a consensus target so votes actually resolve lynches and finish matches
        const lynchTarget = living[living.length - 1];
        const altTarget = living[0];
        for (const c of clients) {
          if (!c.ws || c.ws.readyState !== WebSocket.OPEN) continue;
          const cMe = c.view?.players.find((p) => p.id === c.userId);
          if (!cMe?.isAlive) continue;
          const targetId = lynchTarget.id === c.userId ? altTarget.id : lynchTarget.id;
          if (c.persona === 'debater' && altTarget.id !== c.userId) {
            c.send({ type: 'room:vote', code: roomCode, targetId: altTarget.id });
          }
          c.send({ type: 'room:vote', code: roomCode, targetId });
        }
        await delay(30);
        const curRound = view.round;
        activeHost.send({ type: 'room:advance_phase', code: roomCode });
        view = await waitForViewCondition(
          clients,
          (v) =>
            v.matchId === expectedMatchId &&
            (v.phase === 'game_over' || v.phase === 'night' || v.round > curRound)
        );
        continue;
      }

      // Safety fallback for any intermediate announcement state
      await delay(30);
    }

    const finalView = await waitForViewCondition(
      clients,
      (v) => v.matchId === expectedMatchId && v.phase === 'game_over'
    );
    assert.ok(finalView.gameResult, `Match ${roomCode}#${expectedMatchId} must have gameResult`);
    assert.ok(
      ['villagers', 'werewolves', 'lovers', 'tanner'].includes(finalView.gameResult.winner),
      `Unexpected winner: ${finalView.gameResult.winner}`
    );
    winners.push(finalView.gameResult.winner);
    roundsPlayed.push(finalView.round);
  };

  await playOneGame(1);

  if (testRematch) {
    const activeHost = getCurrentHost(clients)!;
    activeHost.send({ type: 'room:restart', code: roomCode });
    await playOneGame(2);
  }

  for (const c of clients) {
    assert.deepEqual(c.leaks, [], `Zero-leak invariant failures for ${c.userId}: ${c.leaks.join('; ')}`);
    await c.close();
  }

  return { clients, winners, roundsPlayed, hostTransferred };
}

test('[Wave 5 Tier A] Autonomous multi-persona WS simulation across 6p (+rematch), 8p (+host transfer), 12p, 20p & GM 8p', async (t) => {
  const server = await createRealtimeAppServer({
    port: 0,
    host: '127.0.0.1',
    hostDisconnectGraceMs: 250,
    tickIntervalMs: 60,
    enableSnapshots: false,
    attachVite: false,
    quiet: true,
  });

  try {
    const scenarios = [
      { code: 'SIM06A', totalPlayers: 6, humanCount: 6, testRematch: true },
      { code: 'SIM08B', totalPlayers: 8, humanCount: 8, testMidGameHostDisconnect: true },
      { code: 'SIM12C', totalPlayers: 12, humanCount: 12 },
      { code: 'SIM20D', totalPlayers: 20, humanCount: 10 },
    ];

    let totalFrames = 0;
    let totalReconnects = 0;
    let totalRateLimits = 0;
    let totalBlockedIllegals = 0;
    const summaryLines: string[] = [];

    for (const sc of scenarios) {
      const res = await runFullOnlineMatch({
        server,
        roomCode: sc.code,
        totalPlayers: sc.totalPlayers,
        humanCount: sc.humanCount,
        testMidGameHostDisconnect: sc.testMidGameHostDisconnect,
        testRematch: sc.testRematch,
      });

      if (sc.testMidGameHostDisconnect) {
        assert.equal(res.hostTransferred, true, '8p scenario must verify host grace transfer');
      }
      if (sc.testRematch) {
        assert.equal(res.winners.length, 2, '6p scenario must complete initial match + rematch');
      }

      for (const c of res.clients) {
        totalFrames += c.framesChecked;
        totalReconnects += c.reconnects;
        totalRateLimits += c.rateLimitHits;
        totalBlockedIllegals += c.blockedIllegals;
      }

      summaryLines.push(
        `${sc.code} (${sc.totalPlayers}p, ${sc.humanCount} humans): winners=[${res.winners.join(',')}] rounds=[${res.roundsPlayed.join(',')}]`
      );
    }

    // Real multi-client HTTP GM Assistant 8p + Rematch privacy simulation
    const gmCode = 'SIMGM8';
    const gmRoles: RoleId[] = [
      'werewolf',
      'werewolf',
      'seer',
      'witch',
      'bodyguard',
      'hunter',
      'elder',
      'villager',
    ];
    const gmSeats = gmRoles.map((roleId, idx) => ({
      id: `p_${idx + 1}`,
      name: `Seat ${idx + 1}`,
      roleId,
      roleSource: 'auto_dealt' as const,
    }));

    const syncRes = await fetch(`${server.baseUrl}/api/gm-rooms/${gmCode}/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hostId: 'gm_sim_host',
        deckMode: 'virtual_deck',
        status: 'in_progress',
        round: 1,
        seats: gmSeats,
      }),
    });
    assert.equal(syncRes.status, 200);
    const syncJson = (await syncRes.json()) as {
      ok: boolean;
      hostSecret: string;
      room: { matchId: string };
    };
    assert.equal(syncJson.ok, true);
    const hostSecret = syncJson.hostSecret;
    const initialMatchId = syncJson.room.matchId;

    // 8 distinct players join & verify strict own-role-only privacy
    const gmTokens: Array<{ userId: string; token: string; seatId: string }> = [];
    for (let i = 0; i < 8; i++) {
      const uid = `gm_u_${i + 1}`;
      const seatId = `p_${i + 1}`;
      const joinRes = await fetch(`${server.baseUrl}/api/gm-rooms/${gmCode}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: { id: uid, name: `Guest ${i + 1}` }, seatId }),
      });
      assert.equal(joinRes.status, 200);
      const joinData = (await joinRes.json()) as {
        playerToken: string;
        view: { mySeat: { id: string; roleId: RoleId }; seats?: unknown };
      };
      assert.equal(joinData.view.mySeat.roleId, gmRoles[i]);
      assert.equal(
        'seats' in joinData.view && Array.isArray(joinData.view.seats),
        false,
        'GM player view must never expose other players seats/roles'
      );
      gmTokens.push({ userId: uid, token: joinData.playerToken, seatId: joinData.view.mySeat.id });
    }

    // Wrong host secret rejected with 403
    const hijackRes = await fetch(`${server.baseUrl}/api/gm-rooms/${gmCode}/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-gm-host-secret': 'wrong-secret' },
      body: JSON.stringify({ hostId: 'gm_sim_host', round: 99 }),
    });
    assert.equal(hijackRes.status, 403);

    // Host rematch redeal (resetMatch=true, reversed roles) -> players receive new cards
    const rematchSeats = gmSeats.map((s, idx) => ({
      ...s,
      roleId: gmRoles[gmRoles.length - 1 - idx],
    }));
    const rematchRes = await fetch(`${server.baseUrl}/api/gm-rooms/${gmCode}/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-gm-host-secret': hostSecret },
      body: JSON.stringify({
        hostId: 'gm_sim_host',
        resetMatch: true,
        seats: rematchSeats,
      }),
    });
    assert.equal(rematchRes.status, 200);
    const rematchJson = (await rematchRes.json()) as { room: { matchId: string } };
    assert.notEqual(rematchJson.room.matchId, initialMatchId);

    const poll0 = await fetch(`${server.baseUrl}/api/gm-rooms/${gmCode}/player/${gmTokens[0].userId}`, {
      headers: { 'x-gm-player-token': gmTokens[0].token },
    });
    assert.equal(poll0.status, 200);
    const poll0Data = (await poll0.json()) as { view: { matchId: string; mySeat: { roleId: RoleId } } };
    assert.equal(poll0Data.view.matchId, rematchJson.room.matchId);
    assert.equal(poll0Data.view.mySeat.roleId, 'villager');

    assert.ok(totalFrames > 100, 'Expected >100 checked WS match frames across all sizes');
    assert.ok(totalReconnects >= 4, 'Expected mid-match reconnects verified across scenarios');
    assert.ok(totalRateLimits >= 4, 'Expected spam rate limits triggered across scenarios');
    assert.ok(totalBlockedIllegals >= 8, 'Expected illegal cheat/non-host actions rejected');

    t.diagnostic(
      `[Wave 5 Playtest Summary] ${summaryLines.join(' | ')} | framesChecked=${totalFrames} reconnects=${totalReconnects} rateLimits=${totalRateLimits} blockedIllegals=${totalBlockedIllegals} | GM 8p + Rematch PASS`
    );
  } finally {
    await server.close();
  }
});
