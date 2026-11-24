import type {
  OpenRoomSummary,
  RealtimeChatMessage,
  RealtimePropEvent,
  RealtimeRoomState,
  RealtimeTimerConfig,
} from '../server/realtimeRooms';
import type { GMRoomHostState, GMRoomPlayerView } from '../server/gmRooms';

export type ServerWsEvent =
  | { type: 'room:state'; room: RealtimeRoomState }
  | { type: 'room:list'; rooms: OpenRoomSummary[] }
  | { type: 'room:kicked'; code: string; targetId: string; reason: string }
  | { type: 'room:match_started'; room: RealtimeRoomState }
  | { type: 'room:chat'; code: string; message: RealtimeChatMessage }
  | { type: 'room:prop'; code: string; event: RealtimePropEvent }
  | { type: 'room:votes'; code: string; votes: Record<string, string> }
  | { type: 'gm:host_state'; room: GMRoomHostState }
  | { type: 'gm:player_state'; view: GMRoomPlayerView }
  | { type: 'error'; message: string };

type EventListener = (event: ServerWsEvent) => void;
type StatusListener = (status: 'connecting' | 'connected' | 'disconnected') => void;

class WerewolfRealtimeClient {
  private ws: WebSocket | null = null;
  private listeners = new Set<EventListener>();
  private statusListeners = new Set<StatusListener>();
  private status: 'connecting' | 'connected' | 'disconnected' = 'disconnected';
  private pendingQueue: string[] = [];
  private reconnectTimer: number | null = null;
  private reconnectAttempt = 0;

  getStatus() {
    return this.status;
  }

  private setStatus(next: 'connecting' | 'connected' | 'disconnected') {
    this.status = next;
    this.statusListeners.forEach((fn) => fn(next));
  }

  connect(): void {
    if (typeof window === 'undefined' || typeof WebSocket === 'undefined') return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${protocol}//${window.location.host}/ws`;
    this.setStatus('connecting');

    try {
      const socket = new WebSocket(url);
      this.ws = socket;

      socket.onopen = () => {
        this.reconnectAttempt = 0;
        this.setStatus('connected');
        while (this.pendingQueue.length > 0 && socket.readyState === WebSocket.OPEN) {
          const raw = this.pendingQueue.shift();
          if (raw) socket.send(raw);
        }
      };

      socket.onmessage = (evt) => {
        try {
          const data = JSON.parse(String(evt.data)) as ServerWsEvent;
          this.listeners.forEach((fn) => fn(data));
        } catch {
          // ignore malformed frames
        }
      };

      socket.onclose = () => {
        if (this.ws === socket) {
          this.ws = null;
        }
        this.setStatus('disconnected');
        if (this.listeners.size > 0) {
          this.scheduleReconnect();
        }
      };

      socket.onerror = () => {
        // onclose will handle backoff reconnect
      };
    } catch {
      this.setStatus('disconnected');
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (typeof window === 'undefined' || this.reconnectTimer !== null) return;
    const delay = Math.min(8000, 600 * Math.pow(1.6, this.reconnectAttempt));
    this.reconnectAttempt += 1;
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      if (this.listeners.size > 0) {
        this.connect();
      }
    }, delay);
  }

  subscribe(listener: EventListener): () => void {
    this.listeners.add(listener);
    this.connect();
    return () => {
      this.listeners.delete(listener);
    };
  }

  subscribeStatus(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    listener(this.status);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  private send(payload: Record<string, unknown>) {
    this.connect();
    const raw = JSON.stringify(payload);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(raw);
    } else {
      if (this.pendingQueue.length > 30) this.pendingQueue.shift();
      this.pendingQueue.push(raw);
    }
  }

  requestRoomList() {
    this.send({ type: 'room:list' });
  }

  createOrJoinRoom(params: {
    code: string;
    user: { id: string; name: string; avatar: string; elo: number };
    villageSize?: number;
    timerConfig?: Partial<RealtimeTimerConfig>;
    createIfMissing?: boolean;
  }) {
    this.send({ type: 'room:join', ...params });
  }

  leaveRoom(code: string, userId: string) {
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

  sendChat(code: string, message: RealtimeChatMessage) {
    this.send({ type: 'room:chat', code, message });
  }

  sendProp(code: string, event: RealtimePropEvent) {
    this.send({ type: 'room:prop', code, event });
  }

  sendVote(code: string, voterId: string, targetId: string) {
    this.send({ type: 'room:vote', code, voterId, targetId });
  }

  subscribeGMHost(code: string) {
    this.send({ type: 'gm:subscribe_host', code });
  }

  subscribeGMPlayer(code: string, userId: string) {
    this.send({ type: 'gm:subscribe_player', code, userId });
  }

  unsubscribeGM() {
    this.send({ type: 'gm:unsubscribe' });
  }
}

export const realtimeClient = new WerewolfRealtimeClient();
