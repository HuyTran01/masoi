import crypto from 'node:crypto';
import type { RoleId } from '../types/game.ts';
import { ROLES } from '../game/roles.ts';
import { generateBalancedRoster } from '../game/rules.ts';
import { normalizeRoomCode } from './realtimeRooms.ts';

export type GMDeckMode = 'virtual_deck' | 'physical_cards';
export type GMRoleSource = 'unassigned' | 'auto_dealt' | 'gm_assigned' | 'self_input';
export type GMRoomStatus = 'setup' | 'in_match';

export interface GMPlayerSeat {
  id: string;
  seatNumber: number;
  name: string;
  avatar: string;
  roleId: RoleId | null;
  roleSource: GMRoleSource;
  isAlive: boolean;
  claimedByUserId: string | null;
  elderLives?: number;
}

export interface GMRoomHostState {
  code: string;
  matchId: string;
  hostId: string;
  deckMode: GMDeckMode;
  status: GMRoomStatus;
  round: number;
  phase: 'setup' | 'night' | 'day';
  seats: GMPlayerSeat[];
  createdAt: number;
  updatedAt: number;
}

/**
 * Strictly sanitized view sent to a player joining a GM room.
 * INVARIANT: NEVER includes any other player's roleId or roleSource!
 */
export interface GMRoomPlayerView {
  code: string;
  matchId: string;
  deckMode: GMDeckMode;
  status: GMRoomStatus;
  round: number;
  phase: 'setup' | 'night' | 'day';
  totalPlayers: number;
  claimedCount: number;
  canSelfInputRole: boolean;
  mySeat: {
    id: string;
    seatNumber: number;
    name: string;
    avatar: string;
    roleId: RoleId | null;
    roleSource: GMRoleSource;
    isAlive: boolean;
  } | null;
  openSeats: Array<{
    id: string;
    seatNumber: number;
    name: string;
  }>;
  updatedAt: number;
}

export interface GMRoomSummary {
  code: string;
  matchId: string;
  deckMode: GMDeckMode;
  status: GMRoomStatus;
  playerCount: number;
  claimedCount: number;
  updatedAt: number;
}

export interface StoredGMRoomSnapshot {
  room: GMRoomHostState;
  hostSecret: string;
  playerTokens: Record<string, string>;
}

const VALID_ROLE_IDS = new Set<string>(Object.keys(ROLES));
const SEAT_AVATARS = ['🐺', '🔮', '🛡️', '🧪', '🎯', '💘', '🎭', '👑', '🔥', '🧑‍🌾'];

const DEFAULT_SEAT_NAMES = [
  'Bảo An',
  'Tuấn Kiệt',
  'Minh Hoàng',
  'Thảo My',
  'Hữu Phước',
  'Kim Ngân',
  'Đức Huy',
  'Quỳnh Anh',
  'Gia Bảo',
  'Phương Linh',
  'Hải Đăng',
  'Thanh Trúc',
  'Khánh Duy',
  'Ngọc Ánh',
  'Hoàng Nam',
  'Trúc Lam',
  'Nhật Minh',
  'Thiên Kim',
  'Anh Tuấn',
  'Bích Ngọc',
];

export function isValidRoleId(roleId: unknown): roleId is RoleId {
  return typeof roleId === 'string' && VALID_ROLE_IDS.has(roleId);
}

const IDLE_ROOM_TTL_MS = 2 * 60 * 60 * 1000;
const MAX_ACTIVE_ROOMS = 500;

function safeTokenEqual(expected: string, provided?: string): boolean {
  if (typeof provided !== 'string' || !provided) return false;
  const a = Buffer.from(expected, 'utf-8');
  const b = Buffer.from(provided, 'utf-8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * Server-authoritative real-life Game Master room manager.
 * Completely isolated from online 3D match rooms (RealtimeRoomManager).
 * Guarantees strict role privacy: players only ever receive their own seat's role.
 */
export class GMRoomManager {
  private rooms = new Map<string, GMRoomHostState>();
  private hostSecrets = new Map<string, string>();
  private playerTokens = new Map<string, Map<string, string>>();

  private deleteRoom(code: string) {
    this.rooms.delete(code);
    this.hostSecrets.delete(code);
    this.playerTokens.delete(code);
  }

  private pruneRooms(now = Date.now()) {
    for (const [code, room] of this.rooms.entries()) {
      if (now - room.updatedAt > IDLE_ROOM_TTL_MS) {
        this.deleteRoom(code);
      }
    }
    if (this.rooms.size >= MAX_ACTIVE_ROOMS) {
      const oldest = Array.from(this.rooms.values()).sort((a, b) => a.updatedAt - b.updatedAt);
      const excess = this.rooms.size - MAX_ACTIVE_ROOMS + 1;
      for (let i = 0; i < excess && i < oldest.length; i++) {
        this.deleteRoom(oldest[i].code);
      }
    }
  }

  verifyHostSecret(rawCode: string, secret?: string): boolean {
    const code = normalizeRoomCode(rawCode);
    const expected = this.hostSecrets.get(code);
    if (!expected) return false;
    return safeTokenEqual(expected, secret);
  }

  hasPlayerToken(rawCode: string, userId: string): boolean {
    const code = normalizeRoomCode(rawCode);
    const cleanUserId = String(userId || '').trim().slice(0, 64);
    if (!cleanUserId) return false;
    return Boolean(this.playerTokens.get(code)?.has(cleanUserId));
  }

  verifyPlayerToken(rawCode: string, userId: string, token?: string): boolean {
    const code = normalizeRoomCode(rawCode);
    const cleanUserId = String(userId || '').trim().slice(0, 64);
    const expected = this.playerTokens.get(code)?.get(cleanUserId);
    if (!expected) return false;
    return safeTokenEqual(expected, token);
  }

  private getOrIssuePlayerToken(code: string, userId: string): string {
    let map = this.playerTokens.get(code);
    if (!map) {
      map = new Map<string, string>();
      this.playerTokens.set(code, map);
    }
    let token = map.get(userId);
    if (!token) {
      token = crypto.randomBytes(12).toString('hex');
      map.set(userId, token);
    }
    return token;
  }

  listRooms(): GMRoomSummary[] {
    const list: GMRoomSummary[] = [];
    for (const room of this.rooms.values()) {
      list.push({
        code: room.code,
        matchId: room.matchId,
        deckMode: room.deckMode,
        status: room.status,
        playerCount: room.seats.length,
        claimedCount: room.seats.filter((s) => Boolean(s.claimedByUserId)).length,
        updatedAt: room.updatedAt,
      });
    }
    return list.sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 30);
  }

  getHostState(rawCode: string): GMRoomHostState | null {
    const code = normalizeRoomCode(rawCode);
    const room = this.rooms.get(code);
    return room ? this.cloneHostState(room) : null;
  }

  exportSnapshot(rawCode: string): StoredGMRoomSnapshot | null {
    const code = normalizeRoomCode(rawCode);
    const room = this.rooms.get(code);
    const hostSecret = this.hostSecrets.get(code);
    if (!room || !hostSecret) return null;
    const tokens = this.playerTokens.get(code);
    return {
      room: this.cloneHostState(room),
      hostSecret,
      playerTokens: tokens ? Object.fromEntries(tokens.entries()) : {},
    };
  }

  importSnapshot(snapshot: StoredGMRoomSnapshot): void {
    const code = normalizeRoomCode(snapshot.room.code);
    if (!code) return;
    this.rooms.set(code, this.cloneHostState(snapshot.room));
    this.hostSecrets.set(code, snapshot.hostSecret);
    this.playerTokens.set(code, new Map(Object.entries(snapshot.playerTokens || {})));
  }

  /**
   * Creates or synchronizes a GM room from the Game Master host console.
   * Preserves claimedByUserId and player self-input roles unless the host explicitly changed that seat's role.
   */
  syncFromHost(
    rawCode: string,
    hostId: string,
    payload: {
      deckMode?: GMDeckMode;
      status?: GMRoomStatus;
      round?: number;
      phase?: 'setup' | 'night' | 'day';
      resetMatch?: boolean;
      seats?: Array<{
        id?: string;
        name: string;
        avatar?: string;
        roleId?: RoleId | null;
        roleSource?: GMRoleSource;
        isAlive?: boolean;
        claimedByUserId?: string | null;
        elderLives?: number;
      }>;
      playerCount?: number;
    },
    hostSecret?: string
  ): { ok: true; room: GMRoomHostState; hostSecret: string } | { ok: false; error: string } {
    const code = normalizeRoomCode(rawCode);
    if (code.length < 3) {
      return { ok: false, error: 'Mã phòng Quản Trò không hợp lệ (tối thiểu 3 ký tự).' };
    }
    const cleanHostId = String(hostId || '').trim().slice(0, 64);
    if (!cleanHostId) {
      return { ok: false, error: 'Thiếu mã định danh Quản Trò.' };
    }

    const now = Date.now();
    const existing = this.rooms.get(code);
    if (existing && existing.hostId !== cleanHostId) {
      return {
        ok: false,
        error: 'Chỉ Quản Trò tạo phòng mới có quyền chỉnh sửa cấu hình phòng này.',
      };
    }
    if (existing && hostSecret !== undefined && !this.verifyHostSecret(code, hostSecret)) {
      return {
        ok: false,
        error: 'Chỉ Quản Trò sở hữu phòng mới có quyền chỉnh sửa cấu hình phòng này.',
      };
    }

    const deckMode: GMDeckMode =
      payload.deckMode === 'physical_cards'
        ? 'physical_cards'
        : payload.deckMode === 'virtual_deck'
        ? 'virtual_deck'
        : existing?.deckMode || 'virtual_deck';

    const status: GMRoomStatus =
      payload.status === 'in_match'
        ? 'in_match'
        : payload.status === 'setup'
        ? 'setup'
        : existing?.status || 'setup';

    const round = Math.max(1, Math.round(payload.round ?? existing?.round ?? 1));
    const phase: 'setup' | 'night' | 'day' =
      payload.phase === 'night' || payload.phase === 'day' || payload.phase === 'setup'
        ? payload.phase
        : status === 'in_match'
        ? existing?.phase === 'day'
          ? 'day'
          : 'night'
        : 'setup';

    const isReset = Boolean(payload.resetMatch);
    const nextMatchId = isReset || !existing?.matchId
      ? `gm_${now}_${Math.random().toString(36).slice(2, 7)}`
      : existing.matchId;

    let nextSeats: GMPlayerSeat[];
    if (Array.isArray(payload.seats) && payload.seats.length > 0) {
      const existingById = new Map<string, GMPlayerSeat>(
        (existing?.seats || []).map((s) => [s.id, s])
      );
      nextSeats = payload.seats.slice(0, 20).map((incoming, idx) => {
        const seatId = String(incoming.id || `p_${idx + 1}`).slice(0, 48);
        const prev = existingById.get(seatId);

        // On explicit resetMatch, clear previous self-input roles so players start fresh for the new round
        const isStaleUnassignedOverSelfInput =
          !isReset &&
          Boolean(
            prev &&
              prev.roleSource === 'self_input' &&
              prev.roleId &&
              incoming.roleId === null &&
              incoming.roleSource !== 'gm_assigned'
          );

        const safeRoleId: RoleId | null = isStaleUnassignedOverSelfInput
          ? prev!.roleId
          : incoming.roleId === null
          ? null
          : isValidRoleId(incoming.roleId)
          ? incoming.roleId
          : isReset
          ? null
          : prev?.roleId ?? null;

        let roleSource: GMRoleSource = isStaleUnassignedOverSelfInput
          ? 'self_input'
          : incoming.roleSource || (isReset ? 'unassigned' : prev?.roleSource || 'unassigned');
        if (safeRoleId === null) {
          roleSource = 'unassigned';
        } else if (
          !isReset &&
          prev &&
          prev.roleSource === 'self_input' &&
          prev.roleId === safeRoleId &&
          !incoming.roleSource
        ) {
          roleSource = 'self_input';
        } else if (!incoming.roleSource) {
          roleSource = deckMode === 'virtual_deck' ? 'auto_dealt' : 'gm_assigned';
        }

        // Preserve player claim and player-chosen display name across syncs
        const preservedClaim = incoming.claimedByUserId || prev?.claimedByUserId || null;
        const incomingName = String(incoming.name || '').trim();
        const isDefaultPlaceholder = /^Người Chơi #\d+$/i.test(incomingName);
        const resolvedName =
          prev?.claimedByUserId && prev.name && isDefaultPlaceholder
            ? prev.name
            : incomingName || DEFAULT_SEAT_NAMES[idx] || `Người Chơi #${idx + 1}`;

        return {
          id: seatId,
          seatNumber: idx + 1,
          name: resolvedName.slice(0, 40),
          avatar: String(incoming.avatar || prev?.avatar || SEAT_AVATARS[idx % SEAT_AVATARS.length]).slice(0, 16),
          roleId: safeRoleId,
          roleSource,
          isAlive: isReset ? true : incoming.isAlive !== undefined ? Boolean(incoming.isAlive) : prev?.isAlive ?? true,
          claimedByUserId: preservedClaim,
          elderLives:
            safeRoleId === 'elder'
              ? isReset
                ? 2
                : typeof incoming.elderLives === 'number'
                ? incoming.elderLives
                : prev?.elderLives ?? 2
              : undefined,
        };
      });
    } else if (existing) {
      nextSeats = existing.seats.map((s, idx) => {
        const nextRole = isReset && deckMode === 'physical_cards' ? null : s.roleId;
        return {
          ...s,
          seatNumber: idx + 1,
          isAlive: isReset ? true : s.isAlive,
          roleId: nextRole,
          roleSource: isReset && deckMode === 'physical_cards' ? 'unassigned' : s.roleSource,
          elderLives: nextRole === 'elder' ? (isReset ? 2 : s.elderLives ?? 2) : undefined,
        };
      });
    } else {
      const count = Math.max(4, Math.min(20, Math.round(payload.playerCount ?? 8)));
      const autoRoles = deckMode === 'virtual_deck' ? generateBalancedRoster(count) : [];
      nextSeats = Array.from({ length: count }).map((_, idx) => {
        const roleId = deckMode === 'virtual_deck' ? autoRoles[idx] || 'villager' : null;
        return {
          id: `p_${idx + 1}`,
          seatNumber: idx + 1,
          name: DEFAULT_SEAT_NAMES[idx] || `Người Chơi #${idx + 1}`,
          avatar: SEAT_AVATARS[idx % SEAT_AVATARS.length],
          roleId,
          roleSource: roleId ? 'auto_dealt' : 'unassigned',
          isAlive: true,
          claimedByUserId: null,
          elderLives: roleId === 'elder' ? 2 : undefined,
        };
      });
    }

    const updated: GMRoomHostState = {
      code,
      matchId: nextMatchId,
      hostId: existing?.hostId || cleanHostId,
      deckMode,
      status: isReset ? 'setup' : status,
      round: isReset ? 1 : round,
      phase: isReset ? 'setup' : phase,
      seats: nextSeats,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };

    if (!existing) {
      this.pruneRooms(now);
    }

    let secret = this.hostSecrets.get(code);
    if (!secret) {
      secret = crypto.randomBytes(16).toString('hex');
      this.hostSecrets.set(code, secret);
    }

    this.rooms.set(code, updated);
    return { ok: true, room: this.cloneHostState(updated), hostSecret: secret };
  }

  /**
   * Joins a real-life player into a GM room.
   * Returns a strictly sanitized player view containing ONLY their own seat/role.
   */
  joinAsPlayer(
    rawCode: string,
    user: { id: string; name: string; avatar?: string },
    options?: { seatId?: string }
  ):
    | { ok: true; view: GMRoomPlayerView; room: GMRoomHostState; playerToken: string }
    | { ok: false; error: string } {
    const code = normalizeRoomCode(rawCode);
    const room = this.rooms.get(code);
    if (!room) {
      return {
        ok: false,
        error: `Không tìm thấy phòng Quản Trò "${code}". Hãy kiểm tra lại mã phòng từ Quản Trò.`,
      };
    }

    const cleanUserId = String(user.id || '').trim().slice(0, 64);
    const cleanName = String(user.name || '').trim().slice(0, 40);
    const cleanAvatar = String(user.avatar || '🐺').trim().slice(0, 16) || '🐺';

    if (!cleanUserId || !cleanName) {
      return { ok: false, error: 'Vui lòng nhập tên của bạn trước khi vào phòng.' };
    }

    const now = Date.now();

    const okJoin = () => ({
      ok: true as const,
      view: this.buildPlayerView(room, cleanUserId),
      room: this.cloneHostState(room),
      playerToken: this.getOrIssuePlayerToken(code, cleanUserId),
    });

    // 1. Idempotent reconnect if this player already claimed a seat
    const existingSeat = room.seats.find((s) => s.claimedByUserId === cleanUserId);
    if (existingSeat) {
      if (options?.seatId && options.seatId !== existingSeat.id && room.status === 'setup') {
        const target = room.seats.find(
          (s) => s.id === options.seatId && !s.claimedByUserId
        );
        if (target) {
          existingSeat.claimedByUserId = null;
          target.claimedByUserId = cleanUserId;
          target.name = cleanName;
          target.avatar = cleanAvatar;
        }
      } else {
        existingSeat.name = cleanName;
        existingSeat.avatar = cleanAvatar;
      }
      room.updatedAt = now;
      return okJoin();
    }

    // 2. Claim explicitly requested seat if open
    if (options?.seatId) {
      const requested = room.seats.find((s) => s.id === options.seatId);
      if (!requested) {
        return { ok: false, error: 'Ghế bạn chọn không tồn tại trong phòng.' };
      }
      if (requested.claimedByUserId && requested.claimedByUserId !== cleanUserId) {
        return { ok: false, error: 'Ghế này đã có người khác nhận rồi.' };
      }
      requested.claimedByUserId = cleanUserId;
      requested.name = cleanName;
      requested.avatar = cleanAvatar;
      room.updatedAt = now;
      return okJoin();
    }

    // 3. Match an unclaimed seat with identical name first (case-insensitive)
    const nameMatch = room.seats.find(
      (s) => !s.claimedByUserId && s.name.trim().toLowerCase() === cleanName.toLowerCase()
    );
    if (nameMatch) {
      nameMatch.claimedByUserId = cleanUserId;
      nameMatch.avatar = cleanAvatar;
      room.updatedAt = now;
      return okJoin();
    }

    // 4. Otherwise claim the first open unclaimed seat
    const firstOpen = room.seats.find((s) => !s.claimedByUserId);
    if (firstOpen) {
      firstOpen.claimedByUserId = cleanUserId;
      firstOpen.name = cleanName;
      firstOpen.avatar = cleanAvatar;
      room.updatedAt = now;
      return okJoin();
    }

    // 5. If all seats are claimed and room is still in setup with < 20 players, append a new seat
    if (room.status === 'setup' && room.seats.length < 20) {
      const nextNum = room.seats.length + 1;
      const newSeat: GMPlayerSeat = {
        id: `p_${Date.now().toString(36)}_${nextNum}`,
        seatNumber: nextNum,
        name: cleanName,
        avatar: cleanAvatar,
        roleId: room.deckMode === 'virtual_deck' ? 'villager' : null,
        roleSource: room.deckMode === 'virtual_deck' ? 'auto_dealt' : 'unassigned',
        isAlive: true,
        claimedByUserId: cleanUserId,
      };
      room.seats.push(newSeat);
      room.updatedAt = now;
      return okJoin();
    }

    return {
      ok: false,
      error: `Phòng ${code} đã đủ ${room.seats.length} người chơi.`,
    };
  }

  /**
   * Allows a player to submit their own physical card role BEFORE the match starts
   * (only when room is in physical_cards mode & status === 'setup').
   */
  submitSelfRole(
    rawCode: string,
    userId: string,
    roleId: RoleId
  ):
    | { ok: true; view: GMRoomPlayerView; room: GMRoomHostState }
    | { ok: false; error: string } {
    const code = normalizeRoomCode(rawCode);
    const room = this.rooms.get(code);
    if (!room) {
      return { ok: false, error: 'Phòng Quản Trò không tồn tại.' };
    }
    if (room.status !== 'setup') {
      return {
        ok: false,
        error: 'Ván đấu đã bắt đầu — không thể tự thay đổi vai trò nữa!',
      };
    }
    if (room.deckMode !== 'physical_cards') {
      return {
        ok: false,
        error: 'Phòng này đang chia bài ảo tự động — chỉ Quản Trò mới có thể sắp xếp vai trò.',
      };
    }
    if (!isValidRoleId(roleId)) {
      return { ok: false, error: 'Vai trò không hợp lệ.' };
    }

    const seat = room.seats.find((s) => s.claimedByUserId === userId);
    if (!seat) {
      return { ok: false, error: 'Bạn chưa tham gia ghế nào trong phòng này.' };
    }

    seat.roleId = roleId;
    seat.roleSource = 'self_input';
    seat.elderLives = roleId === 'elder' ? 2 : undefined;
    room.updatedAt = Date.now();

    return {
      ok: true,
      view: this.buildPlayerView(room, userId),
      room: this.cloneHostState(room),
    };
  }

  /**
   * Releases a player's seat claim when they explicitly leave the GM room.
   */
  leaveAsPlayer(
    rawCode: string,
    userId: string
  ): { ok: true; room: GMRoomHostState } | { ok: false; error: string } {
    const code = normalizeRoomCode(rawCode);
    const room = this.rooms.get(code);
    if (!room) {
      return { ok: false, error: 'Phòng Quản Trò không tồn tại.' };
    }
    const cleanUserId = String(userId || '').trim().slice(0, 64);
    if (!cleanUserId) {
      return { ok: false, error: 'Thiếu mã người chơi.' };
    }
    const seat = room.seats.find((s) => s.claimedByUserId === cleanUserId);
    if (seat) {
      seat.claimedByUserId = null;
      room.updatedAt = Date.now();
    }
    this.playerTokens.get(code)?.delete(cleanUserId);
    return { ok: true, room: this.cloneHostState(room) };
  }

  getPlayerView(rawCode: string, userId: string): GMRoomPlayerView | null {
    const code = normalizeRoomCode(rawCode);
    const room = this.rooms.get(code);
    if (!room) return null;
    return this.buildPlayerView(room, userId);
  }

  getClaimedUserIds(rawCode: string): string[] {
    const code = normalizeRoomCode(rawCode);
    const room = this.rooms.get(code);
    if (!room) return [];
    return room.seats
      .map((s) => s.claimedByUserId)
      .filter((id): id is string => Boolean(id));
  }

  private buildPlayerView(room: GMRoomHostState, userId: string): GMRoomPlayerView {
    const mySeat = room.seats.find((s) => s.claimedByUserId === userId) || null;
    const openSeats = room.seats
      .filter((s) => !s.claimedByUserId)
      .map((s) => ({
        id: s.id,
        seatNumber: s.seatNumber,
        name: s.name,
      }));

    return {
      code: room.code,
      matchId: room.matchId,
      deckMode: room.deckMode,
      status: room.status,
      round: room.round,
      phase: room.phase,
      totalPlayers: room.seats.length,
      claimedCount: room.seats.filter((s) => Boolean(s.claimedByUserId)).length,
      canSelfInputRole: room.status === 'setup' && room.deckMode === 'physical_cards',
      mySeat: mySeat
        ? {
            id: mySeat.id,
            seatNumber: mySeat.seatNumber,
            name: mySeat.name,
            avatar: mySeat.avatar,
            roleId: mySeat.roleId,
            roleSource: mySeat.roleSource,
            isAlive: mySeat.isAlive,
          }
        : null,
      openSeats,
      updatedAt: room.updatedAt,
    };
  }

  private cloneHostState(room: GMRoomHostState): GMRoomHostState {
    return {
      ...room,
      seats: room.seats.map((s) => ({ ...s })),
    };
  }
}
