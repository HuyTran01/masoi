import type {
  OpenRoomSummary,
  RealtimeChatMessage,
  RealtimePropEvent,
  RealtimeRoomState,
  RealtimeTimerConfig,
} from '../server/realtimeRooms';
import type { GMRoomHostState, GMRoomPlayerView, GMRoomSummary } from '../server/gmRooms';
import type {
  OnlineNightActionType,
  OnlinePlayerMatchView,
} from '../server/onlineMatchEngine';
import type { Language } from '../types/game';

export type TransportMode = 'ws' | 'http';

export type ServerWsEvent =
  | { type: 'room:state'; room: RealtimeRoomState }
  | { type: 'room:joined'; code: string; userId?: string; playerSecret: string }
  | { type: 'room:list'; rooms: OpenRoomSummary[] }
  | { type: 'room:kicked'; code: string; targetId: string; reason: string }
  | { type: 'room:match_started'; room: RealtimeRoomState }
  | { type: 'room:match_state'; code: string; view: OnlinePlayerMatchView; serverNow: number }
  | { type: 'room:chat'; code: string; message: RealtimeChatMessage }
  | { type: 'room:prop'; code: string; event: RealtimePropEvent }
  | { type: 'room:votes'; code: string; votes: Record<string, string> }
  | { type: 'gm:host_state'; room: GMRoomHostState }
  | { type: 'gm:player_state'; view: GMRoomPlayerView }
  | { type: 'gm:room_list'; rooms: GMRoomSummary[] }
  | { type: 'error'; message: string };

type EventListener = (event: ServerWsEvent) => void;
type StatusListener = (status: 'connecting' | 'connected' | 'disconnected') => void;
type TransportListener = (mode: TransportMode) => void;

interface RoomJoinParams {
  code: string;
  user: { id: string; name: string; avatar: string; elo: number };
  villageSize?: number;
  timerConfig?: Partial<RealtimeTimerConfig>;
  createIfMissing?: boolean;
  authToken?: string;
  lang?: Language;
}

type ActiveGmSub =
  | { kind: 'host'; code: string; hostSecret?: string }
  | { kind: 'player'; code: string; userId: string; playerToken?: string };

const ROOM_POLL_MS = 1000;
const GM_POLL_MS = 1500;
const WS_INITIAL_HANDSHAKE_TIMEOUT_MS = 3000;

function normalizeClientCode(raw: string): string {
  return String(raw || '')
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '')
    .slice(0, 16);
}

function secretStorageKey(code: string, userId: string): string {
  return `werewolf_room_secret:${normalizeClientCode(code)}:${userId}`;
}

function loadCachedPlayerSecret(code: string, userId: string): string | null {
  try {
    if (typeof sessionStorage === 'undefined') return null;
    return sessionStorage.getItem(secretStorageKey(code, userId));
  } catch {
    return null;
  }
}

function saveCachedPlayerSecret(code: string, userId: string, secret: string): void {
  try {
    if (typeof sessionStorage === 'undefined') return;
    sessionStorage.setItem(secretStorageKey(code, userId), secret);
  } catch {
    // ignore storage quota errors
  }
}

class WerewolfRealtimeClient {
  private ws: WebSocket | null = null;
  private listeners = new Set<EventListener>();
  private statusListeners = new Set<StatusListener>();
  private transportListeners = new Set<TransportListener>();
  private status: 'connecting' | 'connected' | 'disconnected' = 'disconnected';
  private transportMode: TransportMode = 'ws';
  private pendingQueue: Array<Record<string, unknown>> = [];
  private reconnectTimer: number | null = null;
  private wsOpenTimer: number | null = null;
  private reconnectAttempt = 0;
  private hasConnectedOnce = false;

  private activeRoomJoin: RoomJoinParams | null = null;
  private activeGmSub: ActiveGmSub | null = null;
  private playerSecrets = new Map<string, string>(); // `${code}:${userId}` -> secret
  private roomJoinPromise: Promise<void> | null = null;

  private roomPollTimer: number | null = null;
  private roomPollInFlight = false;
  private lastRoomUpdatedAt = 0;
  private launchedMatchIds = new Map<string, number>();
  private seenChatIds = new Set<string>();
  private seenPropIds = new Set<string>();
  private lastVotesJson = '';

  private gmPollTimer: number | null = null;
  private gmPollInFlight = false;
  private visibilityBound = false;

  getStatus() {
    return this.status;
  }

  getTransportMode(): TransportMode {
    return this.transportMode;
  }

  private emit(event: ServerWsEvent) {
    this.listeners.forEach((fn) => fn(event));
  }

  private setStatus(next: 'connecting' | 'connected' | 'disconnected') {
    this.status = next;
    this.statusListeners.forEach((fn) => fn(next));
  }

  private setTransportMode(next: TransportMode) {
    if (this.transportMode === next) return;
    this.transportMode = next;
    this.transportListeners.forEach((fn) => fn(next));
  }

  private bindVisibilityListener() {
    if (this.visibilityBound || typeof document === 'undefined') return;
    this.visibilityBound = true;
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.transportMode === 'http') {
        if (this.activeRoomJoin) void this.pollOnlineRoomOnce();
        if (this.activeGmSub) void this.pollGMRoomOnce();
      }
    });
  }

  private clearWsOpenTimer() {
    if (this.wsOpenTimer !== null && typeof window !== 'undefined') {
      window.clearTimeout(this.wsOpenTimer);
      this.wsOpenTimer = null;
    }
  }

  private switchToHttpTransport() {
    this.clearWsOpenTimer();
    if (this.reconnectTimer !== null && typeof window !== 'undefined') {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      try {
        this.ws.onopen = null;
        this.ws.onmessage = null;
        this.ws.onclose = null;
        this.ws.onerror = null;
        this.ws.close();
      } catch {
        // ignore
      }
      this.ws = null;
    }

    this.setTransportMode('http');
    this.setStatus('connected');
    this.bindVisibilityListener();

    // Drain any queued messages over HTTP cleanly
    const queued = this.pendingQueue.splice(0, this.pendingQueue.length);
    let replayedJoin = false;
    let replayedGm = false;
    for (const payload of queued) {
      if (payload.type === 'room:join') replayedJoin = true;
      if (payload.type === 'gm:subscribe_host' || payload.type === 'gm:subscribe_player') {
        replayedGm = true;
      }
      this.dispatchHttpPayload(payload);
    }

    if (!replayedJoin && this.activeRoomJoin) {
      void this.joinRoomHttp(this.activeRoomJoin);
    }
    if (!replayedGm && this.activeGmSub) {
      this.startGmHttpPolling();
    }
  }

  connect(): void {
    if (typeof window === 'undefined') return;
    this.bindVisibilityListener();

    if (this.transportMode === 'http') {
      if (this.status !== 'connected') this.setStatus('connected');
      return;
    }

    if (typeof WebSocket === 'undefined') {
      this.switchToHttpTransport();
      return;
    }

    if (
      this.ws &&
      (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${protocol}//${window.location.host}/ws`;
    this.setStatus('connecting');

    try {
      const socket = new WebSocket(url);
      this.ws = socket;

      if (!this.hasConnectedOnce) {
        this.clearWsOpenTimer();
        this.wsOpenTimer = window.setTimeout(() => {
          this.wsOpenTimer = null;
          if (!this.hasConnectedOnce && socket.readyState !== WebSocket.OPEN) {
            this.switchToHttpTransport();
          }
        }, WS_INITIAL_HANDSHAKE_TIMEOUT_MS);
      }

      socket.onopen = () => {
        this.clearWsOpenTimer();
        const isReconnect = this.hasConnectedOnce;
        this.hasConnectedOnce = true;
        this.reconnectAttempt = 0;
        this.setTransportMode('ws');
        this.setStatus('connected');
        if (isReconnect) {
          if (this.activeRoomJoin && socket.readyState === WebSocket.OPEN) {
            const secret = this.getPlayerSecret(
              this.activeRoomJoin.code,
              this.activeRoomJoin.user.id
            );
            socket.send(
              JSON.stringify({
                type: 'room:join',
                ...this.activeRoomJoin,
                ...(secret ? { playerSecret: secret } : {}),
              })
            );
          }
          if (this.activeGmSub && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify(this.toGmWsPayload(this.activeGmSub)));
          }
        }
        while (this.pendingQueue.length > 0 && socket.readyState === WebSocket.OPEN) {
          const item = this.pendingQueue.shift();
          if (item) socket.send(JSON.stringify(item));
        }
      };

      socket.onmessage = (evt) => {
        try {
          const data = JSON.parse(String(evt.data)) as ServerWsEvent;
          if (data.type === 'room:joined') {
            const uid = data.userId || this.activeRoomJoin?.user.id;
            if (uid && data.playerSecret) {
              this.setPlayerSecret(data.code, uid, data.playerSecret);
            }
          }
          this.emit(data);
        } catch {
          // ignore malformed frames
        }
      };

      socket.onclose = () => {
        this.clearWsOpenTimer();
        if (this.ws === socket) {
          this.ws = null;
        }
        // On platforms without WebSocket upgrade (e.g., Netlify), switch to HTTP immediately with zero spam
        if (!this.hasConnectedOnce) {
          this.switchToHttpTransport();
          return;
        }
        this.setStatus('disconnected');
        if (this.listeners.size > 0) {
          this.scheduleReconnect();
        }
      };

      socket.onerror = () => {
        if (!this.hasConnectedOnce) {
          this.switchToHttpTransport();
        }
      };
    } catch {
      if (!this.hasConnectedOnce) {
        this.switchToHttpTransport();
      } else {
        this.setStatus('disconnected');
        this.scheduleReconnect();
      }
    }
  }

  private scheduleReconnect() {
    if (typeof window === 'undefined' || this.reconnectTimer !== null) return;
    if (this.transportMode === 'http') return;
    const delay = Math.min(8000, 600 * Math.pow(1.6, this.reconnectAttempt));
    this.reconnectAttempt += 1;
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      if (this.listeners.size > 0 && this.transportMode === 'ws') {
        this.connect();
      }
    }, delay);
  }

  forceReconnect(): void {
    if (this.transportMode === 'http') {
      this.setStatus('connected');
      if (this.activeRoomJoin) {
        void this.joinRoomHttp(this.activeRoomJoin);
      }
      if (this.activeGmSub) {
        void this.pollGMRoomOnce();
      }
      return;
    }
    if (this.reconnectTimer !== null && typeof window !== 'undefined') {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.clearWsOpenTimer();
    this.reconnectAttempt = 0;
    if (this.ws) {
      try {
        this.ws.onclose = null;
        this.ws.close();
      } catch {
        // ignore
      }
      this.ws = null;
    }
    this.setStatus('disconnected');
    this.connect();
  }

  subscribe(listener: EventListener): () => void {
    this.listeners.add(listener);
    this.connect();
    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0) {
        this.stopRoomHttpPolling();
        this.stopGmHttpPolling();
      }
    };
  }

  subscribeStatus(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    listener(this.status);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  subscribeTransport(listener: TransportListener): () => void {
    this.transportListeners.add(listener);
    listener(this.transportMode);
    return () => {
      this.transportListeners.delete(listener);
    };
  }

  // =========================================================================
  // HTTP DUAL-TRANSPORT ENGINE (Netlify Serverless / Non-WS Environments)
  // =========================================================================

  private getPlayerSecret(code: string, userId: string): string | null {
    const k = `${normalizeClientCode(code)}:${userId}`;
    return this.playerSecrets.get(k) ?? loadCachedPlayerSecret(code, userId);
  }

  private setPlayerSecret(code: string, userId: string, secret: string): void {
    const k = `${normalizeClientCode(code)}:${userId}`;
    this.playerSecrets.set(k, secret);
    saveCachedPlayerSecret(code, userId, secret);
  }

  private stopRoomHttpPolling() {
    if (this.roomPollTimer !== null && typeof window !== 'undefined') {
      window.clearInterval(this.roomPollTimer);
      this.roomPollTimer = null;
    }
  }

  private startRoomHttpPolling() {
    if (typeof window === 'undefined') return;
    this.stopRoomHttpPolling();
    this.roomPollTimer = window.setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      void this.pollOnlineRoomOnce();
    }, ROOM_POLL_MS);
  }

  private applyHttpRoomPayload(data: {
    room?: RealtimeRoomState | null;
    matchView?: OnlinePlayerMatchView | null;
    recentProps?: RealtimePropEvent[];
    serverNow?: number;
  }) {
    const room = data.room;
    if (!room) return;
    const serverNow = typeof data.serverNow === 'number' ? data.serverNow : Date.now();
    this.lastRoomUpdatedAt = Math.max(this.lastRoomUpdatedAt, room.updatedAt || 0);

    this.emit({ type: 'room:state', room });

    if (room.status === 'in_match') {
      const matchId = data.matchView?.matchId ?? 1;
      const prevLaunched = this.launchedMatchIds.get(room.code);
      if (prevLaunched !== matchId) {
        this.launchedMatchIds.set(room.code, matchId);
        this.emit({ type: 'room:match_started', room });
      }
    }

    if (data.matchView) {
      this.emit({
        type: 'room:match_state',
        code: room.code,
        view: data.matchView,
        serverNow,
      });
    }

    // Emit unseen chat messages & props for listeners subscribing to granular events
    for (const msg of room.chatMessages || []) {
      if (!this.seenChatIds.has(msg.id)) {
        this.seenChatIds.add(msg.id);
        this.emit({ type: 'room:chat', code: room.code, message: msg });
      }
    }
    if (this.seenChatIds.size > 300) {
      const recentIds = new Set((room.chatMessages || []).map((m) => m.id));
      this.seenChatIds = recentIds;
    }

    for (const ev of data.recentProps || []) {
      if (!this.seenPropIds.has(ev.id)) {
        this.seenPropIds.add(ev.id);
        this.emit({ type: 'room:prop', code: room.code, event: ev });
      }
    }

    const votesJson = JSON.stringify(room.votes || {});
    if (votesJson !== this.lastVotesJson) {
      this.lastVotesJson = votesJson;
      this.emit({ type: 'room:votes', code: room.code, votes: room.votes || {} });
    }
  }

  private async joinRoomHttp(params: RoomJoinParams): Promise<void> {
    const code = normalizeClientCode(params.code);
    const cachedSecret = this.getPlayerSecret(code, params.user.id);
    const headers: Record<string, string> = { 'content-type': 'application/json' };
    if (cachedSecret) headers['x-room-player-secret'] = cachedSecret;
    if (params.authToken) headers.authorization = `Bearer ${params.authToken}`;

    const p = (async () => {
      try {
        const res = await fetch(`/api/rooms/${encodeURIComponent(code)}/join`, {
          method: 'POST',
          headers,
          body: JSON.stringify(params),
        });
        const data = await res.json();
        if (!data?.ok) {
          this.emit({ type: 'error', message: data?.error || 'Không thể tham gia phòng.' });
          return;
        }
        if (typeof data.playerSecret === 'string' && data.playerSecret) {
          this.setPlayerSecret(code, params.user.id, data.playerSecret);
        }
        this.lastRoomUpdatedAt = 0;
        this.lastVotesJson = '';
        this.applyHttpRoomPayload(data);
        this.startRoomHttpPolling();
      } catch {
        this.emit({ type: 'error', message: 'Lỗi kết nối máy chủ phòng chơi.' });
      }
    })();

    this.roomJoinPromise = p;
    try {
      await p;
    } finally {
      if (this.roomJoinPromise === p) this.roomJoinPromise = null;
    }
  }

  private async pollOnlineRoomOnce(): Promise<void> {
    if (this.roomPollInFlight || !this.activeRoomJoin) return;
    const code = normalizeClientCode(this.activeRoomJoin.code);
    const userId = this.activeRoomJoin.user.id;
    const secret = this.getPlayerSecret(code, userId);
    if (!secret) return;

    this.roomPollInFlight = true;
    try {
      const qs = new URLSearchParams({
        userId,
        since: String(this.lastRoomUpdatedAt),
        ...(this.activeRoomJoin.lang ? { lang: this.activeRoomJoin.lang } : {}),
      });
      const res = await fetch(`/api/rooms/${encodeURIComponent(code)}/state?${qs.toString()}`, {
        headers: { 'x-room-player-secret': secret },
      });
      const data = await res.json();
      if (data?.kicked) {
        this.stopRoomHttpPolling();
        this.activeRoomJoin = null;
        this.emit({
          type: 'room:kicked',
          code,
          targetId: userId,
          reason: data.reason || 'Chủ phòng đã mời bạn ra khỏi phòng.',
        });
        return;
      }
      if (!data?.ok) {
        if (res.status === 404) {
          this.stopRoomHttpPolling();
        }
        return;
      }
      if (data.unchanged) return;
      this.applyHttpRoomPayload(data);
    } catch {
      // ignore transient network poll errors
    } finally {
      this.roomPollInFlight = false;
    }
  }

  private async sendRoomActionHttp(
    rawCode: string,
    action: string,
    extra: Record<string, unknown> = {},
    explicitUserId?: string
  ): Promise<void> {
    if (this.roomJoinPromise) {
      await this.roomJoinPromise;
    }
    const code = normalizeClientCode(rawCode);
    const userId = explicitUserId || this.activeRoomJoin?.user.id || '';
    const secret = userId ? this.getPlayerSecret(code, userId) : null;
    if (!code || !userId || !secret) return;

    try {
      const res = await fetch(`/api/rooms/${encodeURIComponent(code)}/action`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-room-player-secret': secret,
        },
        body: JSON.stringify({ userId, action, ...extra }),
      });
      const data = await res.json();
      if (!data?.ok) {
        if (data?.error) {
          this.emit({ type: 'error', message: data.error });
        }
        return;
      }
      if (action === 'leave') {
        this.stopRoomHttpPolling();
        void this.requestRoomListHttp();
        return;
      }
      this.applyHttpRoomPayload(data);
    } catch {
      this.emit({ type: 'error', message: 'Không thể gửi thao tác đến máy chủ.' });
    }
  }

  private async requestRoomListHttp(): Promise<void> {
    try {
      const res = await fetch('/api/rooms');
      const data = await res.json();
      if (data?.ok && Array.isArray(data.rooms)) {
        this.emit({ type: 'room:list', rooms: data.rooms });
      }
    } catch {
      // ignore transient errors
    }
  }

  private stopGmHttpPolling() {
    if (this.gmPollTimer !== null && typeof window !== 'undefined') {
      window.clearInterval(this.gmPollTimer);
      this.gmPollTimer = null;
    }
  }

  private startGmHttpPolling() {
    if (typeof window === 'undefined') return;
    this.stopGmHttpPolling();
    void this.pollGMRoomOnce();
    this.gmPollTimer = window.setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      void this.pollGMRoomOnce();
    }, GM_POLL_MS);
  }

  private async pollGMRoomOnce(): Promise<void> {
    if (this.gmPollInFlight || !this.activeGmSub) return;
    this.gmPollInFlight = true;
    const sub = this.activeGmSub;
    try {
      if (sub.kind === 'host') {
        const headers: Record<string, string> = {};
        if (sub.hostSecret) headers['x-gm-host-secret'] = sub.hostSecret;
        const res = await fetch(`/api/gm-rooms/${encodeURIComponent(sub.code)}/host`, { headers });
        const data = await res.json();
        if (data?.ok && data.room) {
          this.emit({ type: 'gm:host_state', room: data.room });
        }
      } else {
        const headers: Record<string, string> = {};
        if (sub.playerToken) headers['x-gm-player-token'] = sub.playerToken;
        const res = await fetch(
          `/api/gm-rooms/${encodeURIComponent(sub.code)}/player/${encodeURIComponent(sub.userId)}`,
          { headers }
        );
        const data = await res.json();
        if (data?.ok && data.view) {
          this.emit({ type: 'gm:player_state', view: data.view });
        }
      }
    } catch {
      // ignore transient errors
    } finally {
      this.gmPollInFlight = false;
    }
  }

  private toGmWsPayload(sub: ActiveGmSub): Record<string, unknown> {
    if (sub.kind === 'host') {
      return {
        type: 'gm:subscribe_host',
        code: sub.code,
        ...(sub.hostSecret ? { hostSecret: sub.hostSecret } : {}),
      };
    }
    return {
      type: 'gm:subscribe_player',
      code: sub.code,
      userId: sub.userId,
      ...(sub.playerToken ? { playerToken: sub.playerToken } : {}),
    };
  }

  private dispatchHttpPayload(payload: Record<string, unknown>) {
    const type = String(payload.type || '');
    const code = String(payload.code || '');

    switch (type) {
      case 'room:list':
        void this.requestRoomListHttp();
        break;
      case 'room:join': {
        const { type: _t, ...params } = payload;
        void this.joinRoomHttp(params as unknown as RoomJoinParams);
        break;
      }
      case 'room:leave':
        void this.sendRoomActionHttp(code, 'leave', {}, String(payload.userId || ''));
        break;
      case 'room:kick':
        void this.sendRoomActionHttp(
          code,
          'kick',
          { targetId: payload.targetId },
          String(payload.requesterId || '')
        );
        break;
      case 'room:add_bot':
        void this.sendRoomActionHttp(code, 'add_bot', {}, String(payload.requesterId || ''));
        break;
      case 'room:fill_bots':
        void this.sendRoomActionHttp(code, 'fill_bots', {}, String(payload.requesterId || ''));
        break;
      case 'room:config':
        void this.sendRoomActionHttp(
          code,
          'config',
          { config: payload.config },
          String(payload.requesterId || '')
        );
        break;
      case 'room:start':
        void this.sendRoomActionHttp(code, 'start', {}, String(payload.requesterId || ''));
        break;
      case 'room:restart':
        void this.sendRoomActionHttp(code, 'restart', {});
        break;
      case 'room:chat':
        void this.sendRoomActionHttp(code, 'chat', { message: payload.message });
        break;
      case 'room:prop':
        void this.sendRoomActionHttp(code, 'prop', { event: payload.event });
        break;
      case 'room:vote':
        void this.sendRoomActionHttp(
          code,
          'vote',
          { targetId: payload.targetId },
          String(payload.voterId || '')
        );
        break;
      case 'room:night_action': {
        const action = (payload.action || {}) as Record<string, unknown>;
        void this.sendRoomActionHttp(code, 'night_action', {
          actionType: action.actionType,
          targetId: action.targetId ?? null,
          secondTargetId: action.secondTargetId ?? null,
        });
        break;
      }
      case 'room:advance_phase':
        void this.sendRoomActionHttp(
          code,
          'advance_phase',
          typeof payload.expectedStepIndex === 'number'
            ? { expectedStepIndex: payload.expectedStepIndex }
            : {}
        );
        break;
      case 'room:set_lang':
        void this.sendRoomActionHttp(code, 'set_lang', { lang: payload.lang });
        break;
      case 'gm:subscribe_host':
      case 'gm:subscribe_player':
        this.startGmHttpPolling();
        break;
      case 'gm:unsubscribe':
        this.stopGmHttpPolling();
        break;
    }
  }

  private send(payload: Record<string, unknown>) {
    this.connect();
    if (this.transportMode === 'http') {
      this.dispatchHttpPayload(payload);
      return;
    }
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    } else {
      if (this.pendingQueue.length > 30) this.pendingQueue.shift();
      this.pendingQueue.push(payload);
    }
  }

  // =========================================================================
  // PUBLIC API (100% Backwards-Compatible + Server-Authoritative Match Actions)
  // =========================================================================

  requestRoomList() {
    this.send({ type: 'room:list' });
  }

  createOrJoinRoom(params: RoomJoinParams) {
    this.activeRoomJoin = params;
    this.seenChatIds.clear();
    this.seenPropIds.clear();
    this.lastRoomUpdatedAt = 0;
    this.lastVotesJson = '';
    const secret = this.getPlayerSecret(params.code, params.user.id);
    this.send({ type: 'room:join', ...params, ...(secret ? { playerSecret: secret } : {}) });
  }

  leaveRoom(code: string, userId: string) {
    if (
      this.activeRoomJoin &&
      normalizeClientCode(this.activeRoomJoin.code) === normalizeClientCode(code)
    ) {
      this.activeRoomJoin = null;
      this.stopRoomHttpPolling();
    }
    this.launchedMatchIds.delete(normalizeClientCode(code));
    this.send({ type: 'room:leave', code, userId });
  }

  kickParticipant(code: string, requesterId: string, targetId: string) {
    this.send({ type: 'room:kick', code, requesterId, targetId });
  }

  addBot(code: string, requesterId: string) {
    this.send({ type: 'room:add_bot', code, requesterId });
  }

  fillBots(code: string, requesterId: string) {
    this.send({ type: 'room:fill_bots', code, requesterId });
  }

  updateConfig(
    code: string,
    requesterId: string,
    config: { villageSize?: number; timerConfig?: Partial<RealtimeTimerConfig> }
  ) {
    this.send({ type: 'room:config', code, requesterId, config });
  }

  startMatch(code: string, requesterId: string) {
    this.send({ type: 'room:start', code, requesterId });
  }

  restartMatch(code: string) {
    this.send({ type: 'room:restart', code });
  }

  sendChat(code: string, message: RealtimeChatMessage) {
    this.send({ type: 'room:chat', code, message });
  }

  sendProp(code: string, event: RealtimePropEvent) {
    this.send({ type: 'room:prop', code, event });
  }

  sendVote(code: string, voterId: string, targetId: string) {
    this.send({ type: 'room:vote', code, voterId, targetId });
  }

  sendNightAction(
    code: string,
    action: {
      actionType: OnlineNightActionType;
      targetId?: string | null;
      secondTargetId?: string | null;
    }
  ) {
    this.send({ type: 'room:night_action', code, action });
  }

  sendAdvancePhase(code: string, expectedStepIndex?: number) {
    this.send({
      type: 'room:advance_phase',
      code,
      ...(typeof expectedStepIndex === 'number' ? { expectedStepIndex } : {}),
    });
  }

  setLanguage(code: string, lang: Language) {
    const cleanCode = normalizeClientCode(code);
    if (
      this.activeRoomJoin &&
      normalizeClientCode(this.activeRoomJoin.code) === cleanCode
    ) {
      this.activeRoomJoin = { ...this.activeRoomJoin, lang };
    }
    this.send({ type: 'room:set_lang', code: cleanCode, lang });
  }

  subscribeGMHost(code: string, hostSecret?: string) {
    const cleanCode = normalizeClientCode(code);
    this.activeGmSub = { kind: 'host', code: cleanCode, hostSecret };
    this.send(this.toGmWsPayload(this.activeGmSub));
  }

  subscribeGMPlayer(code: string, userId: string, playerToken?: string) {
    const cleanCode = normalizeClientCode(code);
    this.activeGmSub = { kind: 'player', code: cleanCode, userId, playerToken };
    this.send(this.toGmWsPayload(this.activeGmSub));
  }

  unsubscribeGM() {
    this.activeGmSub = null;
    this.stopGmHttpPolling();
    this.send({ type: 'gm:unsubscribe' });
  }
}

export const realtimeClient = new WerewolfRealtimeClient();
