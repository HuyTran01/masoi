import crypto from 'node:crypto';
import type { RoleId } from '../types/game.ts';
import {
  applyHostAdvancePhase,
  applyOnlineDayVote,
  applyOnlineHunterShot,
  applyOnlineNightAction,
  buildPlayerMatchView,
  createOnlineMatchState,
  type EloUpdateEntry,
  type MatchRoomBridge,
  type OnlineMatchState,
  type OnlineNightActionPayload,
  type OnlinePlayerMatchView,
  tickOnlineMatchIfDue,
} from './onlineMatchEngine.ts';

export interface RealtimeParticipant {
  id: string;
  name: string;
  avatar: string;
  isHost: boolean;
  isBot?: boolean;
  elo: number;
  joinedAt: number;
  connected?: boolean;
}

export interface RealtimeTimerConfig {
  nightActionSec: number;
  dayDiscussSec: number;
  dayVoteSec: number;
}

export interface RealtimeChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
  isGhost?: boolean;
  isSystem?: boolean;
}

export interface RealtimePropEvent {
  id: string;
  propType: 'tomato' | 'rose' | 'egg' | 'water';
  fromPlayerId: string;
  targetPlayerId: string;
  timestamp: number;
}

export interface RealtimeRoomState {
  code: string;
  hostId: string;
  villageSize: number;
  timerConfig: RealtimeTimerConfig;
  status: 'waiting' | 'in_match';
  participants: RealtimeParticipant[];
  chatMessages: RealtimeChatMessage[];
  votes: Record<string, string>; // voterId -> targetId
  matchRoles?: Record<string, RoleId>;
  createdAt: number;
  updatedAt: number;
}

export interface OpenRoomSummary {
  code: string;
  hostName: string;
  playerCount: number;
  humanCount: number;
  villageSize: number;
  status: 'waiting' | 'in_match';
  updatedAt: number;
}

export interface StoredOnlineRoomSnapshot {
  room: RealtimeRoomState;
  matchState: OnlineMatchState | null;
  playerSecrets: Record<string, string>;
  kickedSecrets: Record<string, string>;
  recentProps: RealtimePropEvent[];
}

const DEFAULT_TIMER: RealtimeTimerConfig = {
  nightActionSec: 45,
  dayDiscussSec: 75,
  dayVoteSec: 45,
};

const BOT_POOL: Array<{ name: string; avatar: string; elo: number }> = [
  { name: 'Minh Khôi (Bot)', avatar: '🦊', elo: 1560 },
  { name: 'Thảo Vy (Bot)', avatar: '🦉', elo: 1590 },
  { name: 'Gia Bảo (Bot)', avatar: '🐻', elo: 1520 },
  { name: 'Lan Anh (Bot)', avatar: '🐱', elo: 1610 },
  { name: 'Tuấn Kiệt (Bot)', avatar: '🐰', elo: 1545 },
  { name: 'Bảo Trâm (Bot)', avatar: '🐼', elo: 1575 },
  { name: 'Đức Anh (Bot)', avatar: '🦁', elo: 1530 },
  { name: 'Khánh Linh (Bot)', avatar: '🐸', elo: 1605 },
  { name: 'Hoàng Nam (Bot)', avatar: '🐯', elo: 1550 },
  { name: 'Ngọc Hân (Bot)', avatar: '🐨', elo: 1585 },
  { name: 'Quốc Huy (Bot)', avatar: '🦄', elo: 1540 },
  { name: 'Phương Thảo (Bot)', avatar: '🐧', elo: 1595 },
];

export function normalizeRoomCode(raw: string): string {
  return String(raw || '')
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '')
    .slice(0, 16);
}

const IDLE_ROOM_TTL_MS = 2 * 60 * 60 * 1000;
const MAX_ACTIVE_ROOMS = 500;
const MAX_CHAT_MESSAGES = 120;
const MAX_RECENT_PROPS = 24;

function safeSecretEqual(expected: string, provided?: string): boolean {
  if (typeof provided !== 'string' || !provided) return false;
  const a = Buffer.from(expected, 'utf-8');
  const b = Buffer.from(provided, 'utf-8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * Pure, server-authoritative multiplayer room manager with strict room isolation,
 * zero-leak role/chat sanitization, host permissions, idempotent reconnects,
 * and integrated server-authoritative 3D match engine.
 */
export class RealtimeRoomManager {
  private rooms = new Map<string, RealtimeRoomState>();
  private matchStates = new Map<string, OnlineMatchState>();
  private playerSecrets = new Map<string, Map<string, string>>();
  private kickedSecrets = new Map<string, Map<string, string>>();
  private recentProps = new Map<string, RealtimePropEvent[]>();

  private deleteRoomInternal(code: string) {
    this.rooms.delete(code);
    this.matchStates.delete(code);
    this.playerSecrets.delete(code);
    this.kickedSecrets.delete(code);
    this.recentProps.delete(code);
  }

  private pruneRooms(now = Date.now()) {
    for (const [code, room] of this.rooms.entries()) {
      if (now - room.updatedAt > IDLE_ROOM_TTL_MS) {
        this.deleteRoomInternal(code);
      }
    }
    if (this.rooms.size >= MAX_ACTIVE_ROOMS) {
      const oldest = Array.from(this.rooms.values()).sort((a, b) => a.updatedAt - b.updatedAt);
      const excess = this.rooms.size - MAX_ACTIVE_ROOMS + 1;
      for (let i = 0; i < excess && i < oldest.length; i++) {
        this.deleteRoomInternal(oldest[i].code);
      }
    }
  }

  private createBridge(room: RealtimeRoomState): MatchRoomBridge {
    return {
      hostId: room.hostId,
      timerConfig: room.timerConfig,
      chatMessages: room.chatMessages,
      votes: room.votes,
      appendChat: (msg: RealtimeChatMessage) => {
        if (room.chatMessages.some((m) => m.id === msg.id)) return;
        room.chatMessages.push({
          ...msg,
          text: String(msg.text || '').slice(0, 400),
          isGhost: Boolean(msg.isGhost),
          isSystem: Boolean(msg.isSystem),
        });
        if (room.chatMessages.length > MAX_CHAT_MESSAGES) {
          room.chatMessages = room.chatMessages.slice(-MAX_CHAT_MESSAGES);
        }
      },
    };
  }

  getRoom(rawCode: string): RealtimeRoomState | null {
    const code = normalizeRoomCode(rawCode);
    const room = this.rooms.get(code);
    return room ? this.cloneRoom(room) : null;
  }

  getMatchState(rawCode: string): OnlineMatchState | null {
    const code = normalizeRoomCode(rawCode);
    return this.matchStates.get(code) ?? null;
  }

  /**
   * Returns a strictly zero-leak copy of RealtimeRoomState tailored to `viewerId`:
   * - Filters out `isGhost: true` chat messages for living players during an active match.
   * - Masks `matchRoles` so living players never receive other players' roles (except wolf packmates).
   */
  getSanitizedRoomForUser(rawCode: string, viewerId: string | null): RealtimeRoomState | null {
    const code = normalizeRoomCode(rawCode);
    const room = this.rooms.get(code);
    if (!room) return null;
    const match = this.matchStates.get(code) ?? null;
    const cloned = this.cloneRoom(room);

    const viewer = viewerId && match ? match.players.find((p) => p.id === viewerId) : undefined;
    const canSeeAll = !match || match.phase === 'game_over' || Boolean(viewer && !viewer.isAlive);

    if (!canSeeAll) {
      cloned.chatMessages = cloned.chatMessages.filter((m) => !m.isGhost);
    }

    if (cloned.matchRoles) {
      if (match && canSeeAll) {
        const allRoles: Record<string, RoleId> = {};
        for (const p of match.players) allRoles[p.id] = p.roleId;
        cloned.matchRoles = allRoles;
      } else {
        const filtered: Record<string, RoleId> = {};
        const roleLookup = match
          ? Object.fromEntries(match.players.map((p) => [p.id, p.roleId]))
          : cloned.matchRoles;
        if (viewerId && roleLookup[viewerId]) {
          const myRole = roleLookup[viewerId];
          filtered[viewerId] = myRole;
          if (myRole === 'werewolf' || myRole === 'wolf_pup') {
            for (const [pid, role] of Object.entries(roleLookup)) {
              if (role === 'werewolf' || role === 'wolf_pup') {
                filtered[pid] = role;
              }
            }
          }
        }
        cloned.matchRoles = filtered;
      }
    }

    return cloned;
  }

  getMatchViewForUser(
    rawCode: string,
    viewerId: string,
    serverNow: number = Date.now()
  ): OnlinePlayerMatchView | null {
    const code = normalizeRoomCode(rawCode);
    const match = this.matchStates.get(code);
    if (!match) return null;
    return buildPlayerMatchView(match, viewerId, serverNow);
  }

  getOrIssuePlayerSecret(rawCode: string, userId: string): string {
    const code = normalizeRoomCode(rawCode);
    let map = this.playerSecrets.get(code);
    if (!map) {
      map = new Map<string, string>();
      this.playerSecrets.set(code, map);
    }
    let secret = map.get(userId);
    if (!secret) {
      secret = crypto.randomBytes(12).toString('hex');
      map.set(userId, secret);
    }
    return secret;
  }

  hasPlayerSecret(rawCode: string, userId: string): boolean {
    const code = normalizeRoomCode(rawCode);
    return Boolean(this.playerSecrets.get(code)?.has(userId));
  }

  verifyPlayerSecret(rawCode: string, userId: string, secret?: string): boolean {
    const code = normalizeRoomCode(rawCode);
    const expected = this.playerSecrets.get(code)?.get(userId);
    if (!expected) return false;
    return safeSecretEqual(expected, secret);
  }

  wasKickedWithSecret(rawCode: string, userId: string, secret?: string): boolean {
    const code = normalizeRoomCode(rawCode);
    const expected = this.kickedSecrets.get(code)?.get(userId);
    if (!expected) return false;
    return safeSecretEqual(expected, secret);
  }

  exportSnapshot(rawCode: string): StoredOnlineRoomSnapshot | null {
    const code = normalizeRoomCode(rawCode);
    const room = this.rooms.get(code);
    if (!room) return null;
    const matchState = this.matchStates.get(code) ?? null;
    const secrets = this.playerSecrets.get(code);
    const kicked = this.kickedSecrets.get(code);
    const props = this.recentProps.get(code) || [];

    return {
      room: this.cloneRoom(room),
      matchState: matchState ? (JSON.parse(JSON.stringify(matchState)) as OnlineMatchState) : null,
      playerSecrets: secrets ? Object.fromEntries(secrets.entries()) : {},
      kickedSecrets: kicked ? Object.fromEntries(kicked.entries()) : {},
      recentProps: props.map((p) => ({ ...p })),
    };
  }

  importSnapshot(snapshot: StoredOnlineRoomSnapshot): void {
    const code = normalizeRoomCode(snapshot.room.code);
    if (!code) return;
    this.rooms.set(code, this.cloneRoom(snapshot.room));
    if (snapshot.matchState) {
      this.matchStates.set(
        code,
        JSON.parse(JSON.stringify(snapshot.matchState)) as OnlineMatchState
      );
    } else {
      this.matchStates.delete(code);
    }
    this.playerSecrets.set(code, new Map(Object.entries(snapshot.playerSecrets || {})));
    this.kickedSecrets.set(code, new Map(Object.entries(snapshot.kickedSecrets || {})));
    this.recentProps.set(
      code,
      Array.isArray(snapshot.recentProps) ? snapshot.recentProps.map((p) => ({ ...p })) : []
    );
  }

  listOpenRooms(): OpenRoomSummary[] {
    const summaries: OpenRoomSummary[] = [];
    for (const room of this.rooms.values()) {
      const host = room.participants.find((p) => p.id === room.hostId) || room.participants[0];
      summaries.push({
        code: room.code,
        hostName: host?.name || 'Host',
        playerCount: room.participants.length,
        humanCount: room.participants.filter((p) => !p.isBot).length,
        villageSize: room.villageSize,
        status: room.status,
        updatedAt: room.updatedAt,
      });
    }
    return summaries.sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 24);
  }

  createOrJoinRoom(
    rawCode: string,
    user: { id: string; name: string; avatar: string; elo: number },
    options?: { villageSize?: number; timerConfig?: Partial<RealtimeTimerConfig>; createIfMissing?: boolean }
  ): { ok: true; room: RealtimeRoomState; created: boolean } | { ok: false; error: string } {
    const code = normalizeRoomCode(rawCode);
    if (code.length < 3) {
      return { ok: false, error: 'Mã phòng không hợp lệ (tối thiểu 3 ký tự).' };
    }

    const now = Date.now();
    const existing = this.rooms.get(code);

    if (!existing) {
      if (options?.createIfMissing === false) {
        return { ok: false, error: `Không tìm thấy phòng ${code}. Hãy kiểm tra lại mã phòng.` };
      }
      const villageSize = Math.max(4, Math.min(20, Math.round(options?.villageSize ?? 8)));
      const timerConfig: RealtimeTimerConfig = {
        nightActionSec: Math.max(5, Math.min(180, options?.timerConfig?.nightActionSec ?? DEFAULT_TIMER.nightActionSec)),
        dayDiscussSec: Math.max(10, Math.min(600, options?.timerConfig?.dayDiscussSec ?? DEFAULT_TIMER.dayDiscussSec)),
        dayVoteSec: Math.max(10, Math.min(300, options?.timerConfig?.dayVoteSec ?? DEFAULT_TIMER.dayVoteSec)),
      };
      const newRoom: RealtimeRoomState = {
        code,
        hostId: user.id,
        villageSize,
        timerConfig,
        status: 'waiting',
        participants: [
          {
            id: user.id,
            name: user.name.slice(0, 40),
            avatar: user.avatar.slice(0, 16) || '🐺',
            isHost: true,
            isBot: false,
            elo: Number(user.elo) || 1500,
            joinedAt: now,
            connected: true,
          },
        ],
        chatMessages: [],
        votes: {},
        createdAt: now,
        updatedAt: now,
      };
      this.pruneRooms(now);
      this.rooms.set(code, newRoom);
      return { ok: true, room: this.cloneRoom(newRoom), created: true };
    }

    // Idempotent reconnect/update for an already-present participant
    const alreadyIdx = existing.participants.findIndex((p) => p.id === user.id);
    if (alreadyIdx !== -1) {
      existing.participants[alreadyIdx] = {
        ...existing.participants[alreadyIdx],
        name: user.name.slice(0, 40),
        avatar: user.avatar.slice(0, 16) || existing.participants[alreadyIdx].avatar,
        elo: Number(user.elo) || existing.participants[alreadyIdx].elo,
        connected: true,
      };
      existing.updatedAt = now;
      return { ok: true, room: this.cloneRoom(existing), created: false };
    }

    if (existing.status === 'in_match') {
      return {
        ok: false,
        error: `Phòng ${code} đã bắt đầu ván đấu rồi. Hãy chọn phòng đang chờ khác.`,
      };
    }

    // If room is full of bots, evict one bot to make space for a real human joining!
    if (existing.participants.length >= existing.villageSize) {
      const botIdx = existing.participants.findIndex((p) => p.isBot);
      if (botIdx !== -1) {
        existing.participants.splice(botIdx, 1);
      } else {
        return { ok: false, error: `Phòng ${code} đã đủ ${existing.villageSize} người chơi.` };
      }
    }

    existing.participants.push({
      id: user.id,
      name: user.name.slice(0, 40),
      avatar: user.avatar.slice(0, 16) || '🐺',
      isHost: false,
      isBot: false,
      elo: Number(user.elo) || 1500,
      joinedAt: now,
      connected: true,
    });
    this.kickedSecrets.get(code)?.delete(user.id);
    existing.updatedAt = now;
    return { ok: true, room: this.cloneRoom(existing), created: false };
  }

  leaveRoom(
    rawCode: string,
    userId: string,
    options?: { isDisconnect?: boolean }
  ): { room: RealtimeRoomState | null; deleted: boolean } {
    const code = normalizeRoomCode(rawCode);
    const room = this.rooms.get(code);
    if (!room) return { room: null, deleted: false };

    if (options?.isDisconnect && room.status === 'in_match') {
      const participant = room.participants.find((p) => p.id === userId);
      if (participant) {
        participant.connected = false;
      }
      const connectedHumans = room.participants.filter(
        (p) => !p.isBot && p.connected !== false
      );
      if (connectedHumans.length === 0) {
        this.deleteRoomInternal(code);
        return { room: null, deleted: true };
      }
      room.updatedAt = Date.now();
      return { room: this.cloneRoom(room), deleted: false };
    }

    room.participants = room.participants.filter((p) => p.id !== userId);
    this.playerSecrets.get(code)?.delete(userId);
    const remainingHumans = room.participants.filter((p) => !p.isBot);

    if (remainingHumans.length === 0) {
      this.deleteRoomInternal(code);
      return { room: null, deleted: true };
    }

    if (room.hostId === userId || !room.participants.some((p) => p.id === room.hostId)) {
      const nextHost = remainingHumans[0];
      room.hostId = nextHost.id;
      room.participants = room.participants.map((p) => ({
        ...p,
        isHost: p.id === nextHost.id,
      }));
    }

    room.updatedAt = Date.now();
    return { room: this.cloneRoom(room), deleted: false };
  }

  kickParticipant(
    rawCode: string,
    requesterId: string,
    targetId: string
  ): { ok: true; room: RealtimeRoomState; kickedId: string } | { ok: false; error: string } {
    const code = normalizeRoomCode(rawCode);
    const room = this.rooms.get(code);
    if (!room) return { ok: false, error: 'Phòng không tồn tại.' };
    if (room.hostId !== requesterId) {
      return { ok: false, error: 'Chỉ Chủ phòng mới có quyền mời người chơi ra khỏi phòng.' };
    }
    if (room.status === 'in_match') {
      return { ok: false, error: 'Không thể mời người chơi ra khi ván đấu đang diễn ra.' };
    }
    if (targetId === requesterId) {
      return { ok: false, error: 'Chủ phòng không thể tự kick chính mình.' };
    }
    const exists = room.participants.some((p) => p.id === targetId);
    if (!exists) return { ok: false, error: 'Người chơi không còn trong phòng.' };

    const oldSecret = this.playerSecrets.get(code)?.get(targetId);
    if (oldSecret) {
      let kickedMap = this.kickedSecrets.get(code);
      if (!kickedMap) {
        kickedMap = new Map<string, string>();
        this.kickedSecrets.set(code, kickedMap);
      }
      kickedMap.set(targetId, oldSecret);
      this.playerSecrets.get(code)?.delete(targetId);
    }

    room.participants = room.participants.filter((p) => p.id !== targetId);
    room.updatedAt = Date.now();
    return { ok: true, room: this.cloneRoom(room), kickedId: targetId };
  }

  addBot(
    rawCode: string,
    requesterId: string
  ): { ok: true; room: RealtimeRoomState } | { ok: false; error: string } {
    const code = normalizeRoomCode(rawCode);
    const room = this.rooms.get(code);
    if (!room) return { ok: false, error: 'Phòng không tồn tại.' };
    if (room.hostId !== requesterId) {
      return { ok: false, error: 'Chỉ Chủ phòng mới có thể thêm AI Bot.' };
    }
    if (room.participants.length >= room.villageSize) {
      return { ok: false, error: 'Phòng đã đủ chỗ.' };
    }

    const usedNames = new Set(room.participants.map((p) => p.name));
    const pick = BOT_POOL.find((b) => !usedNames.has(b.name)) || {
      name: `AI Bot #${room.participants.length + 1}`,
      avatar: '🤖',
      elo: 1520,
    };

    room.participants.push({
      id: `bot_lobby_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      name: pick.name,
      avatar: pick.avatar,
      isHost: false,
      isBot: true,
      elo: pick.elo,
      joinedAt: Date.now(),
      connected: true,
    });
    room.updatedAt = Date.now();
    return { ok: true, room: this.cloneRoom(room) };
  }

  fillBots(
    rawCode: string,
    requesterId: string
  ): { ok: true; room: RealtimeRoomState } | { ok: false; error: string } {
    const code = normalizeRoomCode(rawCode);
    const room = this.rooms.get(code);
    if (!room) return { ok: false, error: 'Phòng không tồn tại.' };
    if (room.hostId !== requesterId) {
      return { ok: false, error: 'Chỉ Chủ phòng mới có thể thêm AI Bot.' };
    }
    while (room.participants.length < room.villageSize) {
      const res = this.addBot(code, requesterId);
      if (!res.ok) break;
    }
    return { ok: true, room: this.cloneRoom(room) };
  }

  updateConfig(
    rawCode: string,
    requesterId: string,
    config: { villageSize?: number; timerConfig?: Partial<RealtimeTimerConfig> }
  ): { ok: true; room: RealtimeRoomState } | { ok: false; error: string } {
    const code = normalizeRoomCode(rawCode);
    const room = this.rooms.get(code);
    if (!room) return { ok: false, error: 'Phòng không tồn tại.' };
    if (room.hostId !== requesterId) {
      return { ok: false, error: 'Chỉ Chủ phòng mới có thể đổi cấu hình phòng.' };
    }
    if (typeof config.villageSize === 'number') {
      const humanCount = room.participants.filter((p) => !p.isBot).length;
      const minAllowed = Math.max(4, humanCount);
      room.villageSize = Math.max(minAllowed, Math.min(20, Math.round(config.villageSize)));
      while (room.participants.length > room.villageSize) {
        let botIdx = -1;
        for (let i = room.participants.length - 1; i >= 0; i--) {
          if (room.participants[i].isBot) {
            botIdx = i;
            break;
          }
        }
        if (botIdx !== -1) {
          room.participants.splice(botIdx, 1);
        } else {
          break;
        }
      }
    }
    if (config.timerConfig) {
      room.timerConfig = {
        nightActionSec: Math.max(
          5,
          Math.min(180, config.timerConfig.nightActionSec ?? room.timerConfig.nightActionSec)
        ),
        dayDiscussSec: Math.max(
          10,
          Math.min(600, config.timerConfig.dayDiscussSec ?? room.timerConfig.dayDiscussSec)
        ),
        dayVoteSec: Math.max(
          10,
          Math.min(300, config.timerConfig.dayVoteSec ?? room.timerConfig.dayVoteSec)
        ),
      };
    }
    room.updatedAt = Date.now();
    return { ok: true, room: this.cloneRoom(room) };
  }

  startMatch(
    rawCode: string,
    requesterId: string,
    options?: { now?: number; customRoles?: Record<string, RoleId> }
  ): { ok: true; room: RealtimeRoomState; matchState: OnlineMatchState } | { ok: false; error: string } {
    const code = normalizeRoomCode(rawCode);
    const room = this.rooms.get(code);
    if (!room) return { ok: false, error: 'Phòng không tồn tại.' };
    if (room.hostId !== requesterId) {
      return { ok: false, error: 'Chỉ Chủ phòng mới có thể bắt đầu ván đấu.' };
    }
    if (room.participants.length < 4) {
      return {
        ok: false,
        error: `Cần tối thiểu 4 người chơi (hoặc thêm Bot) để bắt đầu. Hiện có ${room.participants.length} người.`,
      };
    }

    const now = options?.now ?? Date.now();
    const prevMatchId = this.matchStates.get(code)?.matchId ?? 0;
    const bridge = this.createBridge(room);
    const { matchState, matchRoles } = createOnlineMatchState(room.participants, bridge, {
      matchId: prevMatchId + 1,
      now,
      customRoles: options?.customRoles,
    });

    room.status = 'in_match';
    room.matchRoles = matchRoles;
    room.votes = {};
    room.updatedAt = now;
    this.matchStates.set(code, matchState);

    return { ok: true, room: this.cloneRoom(room), matchState };
  }

  restartMatch(
    rawCode: string,
    requesterId: string,
    options?: { now?: number; customRoles?: Record<string, RoleId> }
  ): { ok: true; room: RealtimeRoomState; matchState: OnlineMatchState } | { ok: false; error: string } {
    const code = normalizeRoomCode(rawCode);
    const room = this.rooms.get(code);
    if (!room) return { ok: false, error: 'Phòng không tồn tại.' };
    if (room.hostId !== requesterId) {
      return { ok: false, error: 'Chỉ Chủ phòng mới có thể bắt đầu ván mới.' };
    }
    const existingMatch = this.matchStates.get(code);
    if (existingMatch && existingMatch.phase !== 'game_over') {
      return { ok: false, error: 'Ván đấu hiện tại chưa kết thúc.' };
    }
    const now = options?.now ?? Date.now();
    room.chatMessages = [];
    const started = this.startMatch(code, requesterId, {
      now,
      customRoles: options?.customRoles,
    });
    if (!started.ok) return started;
    const liveRoom = this.rooms.get(code)!;
    this.createBridge(liveRoom).appendChat({
      id: `sys_rematch_${started.matchState.matchId}`,
      senderId: 'sys',
      senderName: 'Quản Trò',
      text: `🔄 Ván đấu mới (#${started.matchState.matchId}) đã bắt đầu! Vai trò đã được xáo lại hoàn toàn.`,
      timestamp: now,
      isSystem: true,
      isGhost: false,
    });
    liveRoom.updatedAt = now;
    return { ok: true, room: this.cloneRoom(liveRoom), matchState: started.matchState };
  }

  submitNightAction(
    rawCode: string,
    userId: string,
    action: OnlineNightActionPayload,
    now: number = Date.now()
  ): { ok: true; room: RealtimeRoomState; eloUpdates?: EloUpdateEntry[] } | { ok: false; error: string } {
    const code = normalizeRoomCode(rawCode);
    const room = this.rooms.get(code);
    const match = this.matchStates.get(code);
    if (!room || !match) return { ok: false, error: 'Phòng chưa vào ván đấu.' };

    const res = applyOnlineNightAction(match, this.createBridge(room), userId, action, now);
    if (!res.ok) return res;

    room.updatedAt = now;
    return { ok: true, room: this.cloneRoom(room), eloUpdates: res.eloUpdates };
  }

  submitHunterShot(
    rawCode: string,
    userId: string,
    targetId: string | null,
    now: number = Date.now()
  ): { ok: true; room: RealtimeRoomState; eloUpdates?: EloUpdateEntry[] } | { ok: false; error: string } {
    const code = normalizeRoomCode(rawCode);
    const room = this.rooms.get(code);
    const match = this.matchStates.get(code);
    if (!room || !match) return { ok: false, error: 'Phòng chưa vào ván đấu.' };

    const res = applyOnlineHunterShot(match, this.createBridge(room), userId, targetId, now);
    if (!res.ok) return res;

    room.updatedAt = now;
    return { ok: true, room: this.cloneRoom(room), eloUpdates: res.eloUpdates };
  }

  advancePhase(
    rawCode: string,
    requesterId: string,
    now: number = Date.now()
  ): { ok: true; room: RealtimeRoomState; eloUpdates?: EloUpdateEntry[] } | { ok: false; error: string } {
    const code = normalizeRoomCode(rawCode);
    const room = this.rooms.get(code);
    const match = this.matchStates.get(code);
    if (!room || !match) return { ok: false, error: 'Phòng chưa vào ván đấu.' };

    const res = applyHostAdvancePhase(match, this.createBridge(room), requesterId, now);
    if (!res.ok) return res;

    room.updatedAt = now;
    return { ok: true, room: this.cloneRoom(room), eloUpdates: res.eloUpdates };
  }

  tickRoom(
    rawCode: string,
    now: number = Date.now()
  ): { changed: boolean; room: RealtimeRoomState | null; eloUpdates?: EloUpdateEntry[] } {
    const code = normalizeRoomCode(rawCode);
    const room = this.rooms.get(code);
    const match = this.matchStates.get(code);
    if (!room || !match) return { changed: false, room: room ? this.cloneRoom(room) : null };

    const res = tickOnlineMatchIfDue(match, this.createBridge(room), now);
    if (res.changed) {
      room.updatedAt = now;
    }
    return { changed: res.changed, room: this.cloneRoom(room), eloUpdates: res.eloUpdates };
  }

  tickDueRooms(
    now: number = Date.now()
  ): Array<{ code: string; room: RealtimeRoomState; eloUpdates?: EloUpdateEntry[] }> {
    const changedRooms: Array<{
      code: string;
      room: RealtimeRoomState;
      eloUpdates?: EloUpdateEntry[];
    }> = [];
    for (const code of this.matchStates.keys()) {
      const res = this.tickRoom(code, now);
      if (res.changed && res.room) {
        changedRooms.push({ code, room: res.room, eloUpdates: res.eloUpdates });
      }
    }
    return changedRooms;
  }

  postChat(
    rawCode: string,
    msg: RealtimeChatMessage
  ): { ok: true; message: RealtimeChatMessage } | { ok: false; error: string } {
    const code = normalizeRoomCode(rawCode);
    const room = this.rooms.get(code);
    if (!room) return { ok: false, error: 'Phòng không tồn tại.' };
    const cleanText = String(msg.text || '').trim().slice(0, 400);
    if (!cleanText) return { ok: false, error: 'Nội dung tin nhắn trống.' };

    const existing = room.chatMessages.find((m) => m.id === msg.id);
    if (existing) {
      return { ok: true, message: existing };
    }

    let isGhost = Boolean(msg.isGhost);
    const match = this.matchStates.get(code);
    if (match && match.phase !== 'game_over' && !msg.isSystem) {
      const sender = match.players.find((p) => p.id === msg.senderId);
      if (sender && !sender.isAlive) {
        if (!isGhost) {
          return {
            ok: false,
            error: 'Bạn đã thành Hồn Ma — không thể gửi tin nhắn vào phòng chính!',
          };
        }
      } else if (sender && sender.isAlive) {
        // Living players cannot post to Ghost realm
        isGhost = false;
      }
    }

    const safeMsg: RealtimeChatMessage = {
      id: String(msg.id || `chat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`),
      senderId: String(msg.senderId || 'anon').slice(0, 64),
      senderName: String(msg.senderName || 'Player').slice(0, 48),
      text: cleanText,
      timestamp: typeof msg.timestamp === 'number' ? msg.timestamp : Date.now(),
      isGhost,
      isSystem: Boolean(msg.isSystem),
    };
    room.chatMessages.push(safeMsg);
    if (room.chatMessages.length > MAX_CHAT_MESSAGES) {
      room.chatMessages = room.chatMessages.slice(-MAX_CHAT_MESSAGES);
    }
    room.updatedAt = Date.now();
    return { ok: true, message: safeMsg };
  }

  recordProp(
    rawCode: string,
    event: RealtimePropEvent
  ): { ok: true; event: RealtimePropEvent } | { ok: false; error: string } {
    const code = normalizeRoomCode(rawCode);
    const room = this.rooms.get(code);
    if (!room) return { ok: false, error: 'Phòng không tồn tại.' };
    let list = this.recentProps.get(code);
    if (!list) {
      list = [];
      this.recentProps.set(code, list);
    }
    if (!list.some((p) => p.id === event.id)) {
      list.push({ ...event });
      if (list.length > MAX_RECENT_PROPS) {
        this.recentProps.set(code, list.slice(-MAX_RECENT_PROPS));
      }
    }
    room.updatedAt = Date.now();
    return { ok: true, event };
  }

  getRecentProps(rawCode: string): RealtimePropEvent[] {
    const code = normalizeRoomCode(rawCode);
    return (this.recentProps.get(code) || []).map((p) => ({ ...p }));
  }

  castVote(
    rawCode: string,
    voterId: string,
    targetId: string
  ): { ok: true; votes: Record<string, string> } | { ok: false; error: string } {
    const code = normalizeRoomCode(rawCode);
    const room = this.rooms.get(code);
    if (!room) return { ok: false, error: 'Phòng không tồn tại.' };

    const match = this.matchStates.get(code);
    if (room.status === 'in_match' && match) {
      const res = applyOnlineDayVote(match, this.createBridge(room), voterId, targetId);
      if (!res.ok) return res;
      room.updatedAt = Date.now();
      return res;
    }

    if (!targetId) {
      delete room.votes[voterId];
    } else {
      room.votes[voterId] = targetId;
    }
    room.updatedAt = Date.now();
    return { ok: true, votes: { ...room.votes } };
  }

  private cloneRoom(room: RealtimeRoomState): RealtimeRoomState {
    return {
      ...room,
      timerConfig: { ...room.timerConfig },
      participants: room.participants.map((p) => ({ ...p })),
      chatMessages: room.chatMessages.map((m) => ({ ...m })),
      votes: { ...room.votes },
      matchRoles: room.matchRoles ? { ...room.matchRoles } : undefined,
    };
  }
}
