import type { RoleId } from '../types/game.ts';
import { generateBalancedRoster } from '../game/rules.ts';

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
  propType: 'tomato' | 'rose' | 'egg';
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

/**
 * Pure, server-authoritative multiplayer room manager with strict room isolation,
 * host permissions, idempotent reconnects, and disconnect cleanup.
 */
export class RealtimeRoomManager {
  private rooms = new Map<string, RealtimeRoomState>();

  getRoom(rawCode: string): RealtimeRoomState | null {
    const code = normalizeRoomCode(rawCode);
    const room = this.rooms.get(code);
    return room ? this.cloneRoom(room) : null;
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
    existing.updatedAt = now;
    return { ok: true, room: this.cloneRoom(existing), created: false };
  }

  leaveRoom(rawCode: string, userId: string): { room: RealtimeRoomState | null; deleted: boolean } {
    const code = normalizeRoomCode(rawCode);
    const room = this.rooms.get(code);
    if (!room) return { room: null, deleted: false };

    room.participants = room.participants.filter((p) => p.id !== userId);
    const remainingHumans = room.participants.filter((p) => !p.isBot);

    if (remainingHumans.length === 0) {
      this.rooms.delete(code);
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
    if (targetId === requesterId) {
      return { ok: false, error: 'Chủ phòng không thể tự kick chính mình.' };
    }
    const exists = room.participants.some((p) => p.id === targetId);
    if (!exists) return { ok: false, error: 'Người chơi không còn trong phòng.' };

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
      // Trim excess bots if villageSize shrank
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
    requesterId: string
  ): { ok: true; room: RealtimeRoomState } | { ok: false; error: string } {
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
    const deck = generateBalancedRoster(room.participants.length);
    const matchRoles: Record<string, RoleId> = {};
    room.participants.forEach((p, idx) => {
      matchRoles[p.id] = deck[idx] || 'villager';
    });
    room.status = 'in_match';
    room.matchRoles = matchRoles;
    room.votes = {};
    room.updatedAt = Date.now();
    return { ok: true, room: this.cloneRoom(room) };
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

    // Idempotency guard against duplicate message IDs
    const existing = room.chatMessages.find((m) => m.id === msg.id);
    if (existing) {
      return { ok: true, message: existing };
    }

    const safeMsg: RealtimeChatMessage = {
      id: String(msg.id || `chat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`),
      senderId: String(msg.senderId || 'anon').slice(0, 64),
      senderName: String(msg.senderName || 'Player').slice(0, 48),
      text: cleanText,
      timestamp: typeof msg.timestamp === 'number' ? msg.timestamp : Date.now(),
      isGhost: Boolean(msg.isGhost),
      isSystem: Boolean(msg.isSystem),
    };
    room.chatMessages.push(safeMsg);
    if (room.chatMessages.length > 120) {
      room.chatMessages = room.chatMessages.slice(-120);
    }
    room.updatedAt = Date.now();
    return { ok: true, message: safeMsg };
  }

  castVote(
    rawCode: string,
    voterId: string,
    targetId: string
  ): { ok: true; votes: Record<string, string> } | { ok: false; error: string } {
    const code = normalizeRoomCode(rawCode);
    const room = this.rooms.get(code);
    if (!room) return { ok: false, error: 'Phòng không tồn tại.' };
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
