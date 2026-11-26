import { Language, Phase, Player, PropType, RoleId } from '../types/game';

export type CameraViewPreset =
  | 'orbit'
  | 'campfire'
  | 'overhead'
  | 'dramatic'
  | 'first_person'
  | 'third_person';

export function isDirectLookCameraPreset(preset: CameraViewPreset): boolean {
  return preset === 'first_person' || preset === 'third_person';
}

export type CharacterStance = 'seated' | 'standing' | 'crouching';

export interface Vec3Like {
  x: number;
  y: number;
  z: number;
}

export interface FpvPoseResult {
  eyePos: Vec3Like;
  lookTarget: Vec3Like;
  forward: Vec3Like;
  right: Vec3Like;
  headRoll: number;
}

export interface VerticalPhysicsState {
  yOffset: number;
  vy: number;
  isGrounded: boolean;
  crouchBlend: number;
  landedThisFrame: boolean;
}

export interface ContextualInteractionPrompt {
  icon: string;
  actionLabel: string;
  targetName: string;
  detail: string;
  canInteract: boolean;
  tone: 'vote' | 'prop' | 'night' | 'info' | 'blocked';
}

/**
 * Dynamically scales the campfire seating circle radius based on player count so that
 * larger matches (10-20 players) expand gracefully without characters sitting cramped together.
 * Guarantees at least ~2.25m arc spacing between adjacent stools.
 */
export function computeCampfireCircleRadius(playerCount: number): number {
  const safeCount = Math.max(4, Math.min(24, Math.round(playerCount)));
  const extraPlayers = Math.max(0, safeCount - 8);
  const expanded = 5.65 + extraPlayers * 0.36;
  const arcFloor = (safeCount * 3.1) / (2 * Math.PI);
  return Number(Math.max(5.65, Math.min(10.2, Math.max(expanded, arcFloor))).toFixed(2));
}

/**
 * Computes the default yaw angle (in radians) so that a player sitting at `seatAngle`
 * on the village circle initially looks straight inward toward the central campfire (0, 0, 0).
 */
export function computeDefaultFpvYawFromSeatAngle(seatAngle: number): number {
  const dirX = -Math.cos(seatAngle);
  const dirZ = -Math.sin(seatAngle);
  return Math.atan2(dirX, dirZ);
}

/**
 * Clamps vertical pitch in First-Person view to prevent neck-flipping.
 */
export function clampFpvPitch(pitch: number, minPitch = -0.68, maxPitch = 0.68): number {
  return Math.max(minPitch, Math.min(maxPitch, pitch));
}

/**
 * Pure vertical movement kinematics for jumping (Space), gravity, landing, and crouching (Ctrl).
 */
export function stepCharacterVerticalPhysics(params: {
  yOffset: number;
  vy: number;
  isGrounded: boolean;
  crouchBlend: number;
  jumpRequested: boolean;
  isCrouching: boolean;
  canJump: boolean;
  dt: number;
}): VerticalPhysicsState {
  const {
    jumpRequested,
    isCrouching,
    canJump,
    dt,
  } = params;
  const clampedDt = Math.max(0, Math.min(0.1, dt));
  let { yOffset, vy, isGrounded, crouchBlend } = params;
  let landedThisFrame = false;

  const GRAVITY = -19.5;
  const JUMP_VELOCITY = 6.7;

  if (jumpRequested && isGrounded && canJump) {
    vy = JUMP_VELOCITY;
    isGrounded = false;
  }

  if (!isGrounded || yOffset > 0 || vy > 0) {
    vy += GRAVITY * clampedDt;
    yOffset += vy * clampedDt;
    if (yOffset <= 0) {
      yOffset = 0;
      if (vy < -1.5) landedThisFrame = true;
      vy = 0;
      isGrounded = true;
    }
  }

  const targetCrouch = isCrouching && isGrounded ? 1 : 0;
  const crouchLerp = 1 - Math.exp(-12 * clampedDt);
  crouchBlend += (targetCrouch - crouchBlend) * crouchLerp;
  if (Math.abs(crouchBlend - targetCrouch) < 0.002) {
    crouchBlend = targetCrouch;
  }

  return {
    yOffset,
    vy,
    isGrounded,
    crouchBlend,
    landedThisFrame,
  };
}

/**
 * Computes the First-Person eye position, forward/right basis vectors, head roll, and lookAt target
 * given the character's world position, stance (seated/standing/crouching), jump height, sprint state,
 * yaw, pitch, and walking/breathing bob parameters.
 */
export function computeFpvCameraPose(params: {
  charPos: Vec3Like;
  isGhost: boolean;
  yaw: number;
  pitch: number;
  elapsedSec: number;
  isMoving: boolean;
  stance?: CharacterStance;
  isSprinting?: boolean;
  jumpHeight?: number;
  crouchBlend?: number;
  groundY?: number;
  strafeInput?: number;
}): FpvPoseResult {
  const {
    charPos,
    isGhost,
    yaw,
    pitch,
    elapsedSec,
    isMoving,
    stance = 'seated',
    isSprinting = false,
    jumpHeight = 0,
    crouchBlend = stance === 'crouching' ? 1 : 0,
    groundY = 0,
    strafeInput = 0,
  } = params;
  const clampedPitch = clampFpvPitch(pitch);

  const cosPitch = Math.cos(clampedPitch);
  const sinPitch = Math.sin(clampedPitch);
  const sinYaw = Math.sin(yaw);
  const cosYaw = Math.cos(yaw);

  // Forward unit vector in 3D space
  const forward: Vec3Like = {
    x: sinYaw * cosPitch,
    y: sinPitch,
    z: cosYaw * cosPitch,
  };

  // Right unit vector on the horizontal XZ plane (Forward_XZ x Up)
  const right: Vec3Like = {
    x: -cosYaw,
    y: 0,
    z: sinYaw,
  };

  // Realistic human eye heights: seated on stool (~1.50m), standing (~1.82m), crouched (~1.30m)
  let baseEyeY: number;
  if (isGhost) {
    baseEyeY = charPos.y + 1.05;
  } else if (stance === 'seated') {
    baseEyeY = groundY + 1.54 + jumpHeight;
  } else {
    const standingEyeY = 1.82;
    const crouchedEyeY = 1.28;
    const blendedHeight = standingEyeY - (standingEyeY - crouchedEyeY) * Math.max(0, Math.min(1, crouchBlend));
    baseEyeY = groundY + blendedHeight + jumpHeight;
  }

  // Natural breathing & figure-8 walk/sprint stride bob (muted while airborne)
  const groundedFactor = jumpHeight > 0.04 ? 0.15 : 1;
  const bobFreq = !isMoving
    ? 2.1
    : isSprinting
    ? 13.8
    : crouchBlend > 0.5
    ? 7.2
    : 10.4;
  const bobAmpY = (!isMoving ? 0.011 : isSprinting ? 0.072 : crouchBlend > 0.5 ? 0.028 : 0.048) * groundedFactor;
  const bobAmpSide = (!isMoving ? 0.003 : isSprinting ? 0.036 : crouchBlend > 0.5 ? 0.014 : 0.022) * groundedFactor;

  const bobY = Math.sin(elapsedSec * bobFreq) * bobAmpY;
  const bobSide = Math.cos(elapsedSec * (bobFreq * 0.5)) * bobAmpSide;

  // Subtle camera roll from strafing + stride weight shift
  const strideRoll = isMoving ? Math.cos(elapsedSec * (bobFreq * 0.5)) * (isSprinting ? 0.018 : 0.01) * groundedFactor : 0;
  const headRoll = -strafeInput * 0.024 + strideRoll;

  // Offset eye slightly forward so it clears collar/hood geometry cleanly
  const forwardOffset = stance === 'seated' ? 0.15 : 0.17;
  const eyePos: Vec3Like = {
    x: charPos.x + sinYaw * forwardOffset + right.x * bobSide,
    y: baseEyeY + bobY,
    z: charPos.z + cosYaw * forwardOffset + right.z * bobSide,
  };

  const lookDist = 10;
  const lookTarget: Vec3Like = {
    x: eyePos.x + forward.x * lookDist,
    y: eyePos.y + forward.y * lookDist,
    z: eyePos.z + forward.z * lookDist,
  };

  return {
    eyePos,
    lookTarget,
    forward,
    right,
    headRoll,
  };
}

/**
 * Computes a behind-the-back (Third-Person Over-the-Shoulder) camera pose that shares
 * the exact yaw/pitch aiming convention of First-Person View so mouse-look, WASD movement,
 * and center crosshair targeting feel identical while keeping the player's own 3D body visible.
 */
export function computeThirdPersonCameraPose(params: {
  charPos: Vec3Like;
  yaw: number;
  pitch: number;
  isGhost: boolean;
  elapsedSec: number;
  isMoving: boolean;
  stance?: CharacterStance;
  isSprinting?: boolean;
  jumpHeight?: number;
  crouchBlend?: number;
  groundY?: number;
  strafeInput?: number;
  distance?: number;
  shoulderOffset?: number;
  minCameraY?: number;
}): FpvPoseResult {
  const {
    charPos,
    yaw,
    pitch,
    isGhost,
    elapsedSec,
    isMoving,
    stance = 'seated',
    isSprinting = false,
    jumpHeight = 0,
    crouchBlend = stance === 'crouching' ? 1 : 0,
    groundY = 0,
    strafeInput = 0,
    distance = 3.95,
    shoulderOffset = 0.72,
    minCameraY = groundY + 0.55,
  } = params;

  const clampedPitch = clampFpvPitch(pitch, -0.58, 0.56);
  const cosPitch = Math.cos(clampedPitch);
  const sinPitch = Math.sin(clampedPitch);
  const sinYaw = Math.sin(yaw);
  const cosYaw = Math.cos(yaw);

  const forward: Vec3Like = {
    x: sinYaw * cosPitch,
    y: sinPitch,
    z: cosYaw * cosPitch,
  };

  const right: Vec3Like = {
    x: -cosYaw,
    y: 0,
    z: sinYaw,
  };

  let pivotBaseY: number;
  if (isGhost) {
    pivotBaseY = charPos.y + 1.25;
  } else if (stance === 'seated') {
    pivotBaseY = groundY + 1.48 + jumpHeight;
  } else {
    const standingPivotY = 1.72;
    const crouchedPivotY = 1.24;
    const blended = standingPivotY - (standingPivotY - crouchedPivotY) * Math.max(0, Math.min(1, crouchBlend));
    pivotBaseY = groundY + blended + jumpHeight;
  }

  const groundedFactor = jumpHeight > 0.04 ? 0.2 : 1;
  const bobFreq = !isMoving ? 1.8 : isSprinting ? 12.6 : 9.4;
  const bobY = Math.sin(elapsedSec * bobFreq) * (!isMoving ? 0.008 : isSprinting ? 0.042 : 0.024) * groundedFactor;

  const pivotX = charPos.x + right.x * shoulderOffset;
  const pivotY = pivotBaseY + bobY;
  const pivotZ = charPos.z + right.z * shoulderOffset;

  const sprintZoomOut = isSprinting && isMoving ? 0.35 : 0;
  const effectiveDist = distance + sprintZoomOut;

  const rawCamX = pivotX - forward.x * effectiveDist;
  const rawCamY = pivotY - forward.y * effectiveDist + 0.64;
  const rawCamZ = pivotZ - forward.z * effectiveDist;

  const eyePos: Vec3Like = {
    x: rawCamX,
    y: Math.max(minCameraY, rawCamY),
    z: rawCamZ,
  };

  const lookDist = 18;
  const lookTarget: Vec3Like = {
    x: pivotX + forward.x * lookDist,
    y: pivotY + forward.y * lookDist,
    z: pivotZ + forward.z * lookDist,
  };

  const headRoll = -strafeInput * 0.014;

  return {
    eyePos,
    lookTarget,
    forward,
    right,
    headRoll,
  };
}

/**
 * Computes world-space XZ movement delta in First-Person mode from local input
 * (inputZ < 0 = W/Forward, inputZ > 0 = S/Backward, inputX > 0 = D/Right, inputX < 0 = A/Left).
 * Expanded default maxRadius (24m) supports open clearing + tent/forest perimeter exploration.
 */
export function computeFpvMovementStep(params: {
  yaw: number;
  inputX: number;
  inputZ: number;
  speed: number;
  dt: number;
  currentX: number;
  currentZ: number;
  maxRadius?: number;
  minRadius?: number;
}): { nextX: number; nextZ: number; moveWorldX: number; moveWorldZ: number } {
  const {
    yaw,
    inputX,
    inputZ,
    speed,
    dt,
    currentX,
    currentZ,
    maxRadius = 24.0,
    minRadius = 1.85,
  } = params;
  const forwardAmount = -inputZ; // W produces inputZ = -1 -> forwardAmount = +1
  const strafeAmount = inputX; // D produces inputX = +1 -> strafeAmount = +1

  const sinYaw = Math.sin(yaw);
  const cosYaw = Math.cos(yaw);
  const rightX = -cosYaw;
  const rightZ = sinYaw;

  let moveWorldX = sinYaw * forwardAmount + rightX * strafeAmount;
  let moveWorldZ = cosYaw * forwardAmount + rightZ * strafeAmount;

  const mag = Math.hypot(moveWorldX, moveWorldZ);
  if (mag > 1e-5) {
    moveWorldX /= mag;
    moveWorldZ /= mag;
  }

  let nextX = currentX + moveWorldX * speed * dt;
  let nextZ = currentZ + moveWorldZ * speed * dt;

  // Keep player outside the central fire pit (r >= minRadius) and within the expanded camp clearing (r <= maxRadius)
  const distFromCenter = Math.hypot(nextX, nextZ);
  if (distFromCenter < minRadius && distFromCenter > 1e-4) {
    const scale = minRadius / distFromCenter;
    nextX *= scale;
    nextZ *= scale;
  } else if (distFromCenter > maxRadius) {
    const scale = maxRadius / distFromCenter;
    nextX *= scale;
    nextZ *= scale;
  }

  return { nextX, nextZ, moveWorldX, moveWorldZ };
}

/**
 * Finds the best target player seat within the First-Person center crosshair cone.
 */
export function findFpvCrosshairTarget(params: {
  eyePos: Vec3Like;
  forward: Vec3Like;
  candidates: Array<{ playerId: string; pos: Vec3Like; visible: boolean }>;
  selfPlayerId: string;
  minCosineThreshold?: number;
  maxDistance?: number;
}): string | null {
  const {
    eyePos,
    forward,
    candidates,
    selfPlayerId,
    minCosineThreshold = 0.955, // ~17 degrees cone
    maxDistance = 26,
  } = params;

  let bestId: string | null = null;
  let bestScore = -1;

  for (const c of candidates) {
    if (!c.visible || !c.playerId || c.playerId === selfPlayerId) continue;
    const dx = c.pos.x - eyePos.x;
    const dy = c.pos.y - eyePos.y;
    const dz = c.pos.z - eyePos.z;
    const dist = Math.hypot(dx, dy, dz);
    if (dist < 0.3 || dist > maxDistance) continue;

    const invDist = 1 / dist;
    const dot = (dx * forward.x + dy * forward.y + dz * forward.z) * invDist;

    if (dot >= minCosineThreshold && dot > bestScore) {
      bestScore = dot;
      bestId = c.playerId;
    }
  }

  return bestId;
}

/**
 * Resolves the exact contextual interaction label when aiming at a player (or campfire) in First-Person View,
 * replacing vague "Interact" prompts with specific phase/role/tool actions.
 */
export function getContextualInteractionPrompt(params: {
  phase: Phase;
  me: Pick<Player, 'id' | 'roleId' | 'isAlive' | 'hasUsedPoison' | 'hasUsedPower'>;
  target: Pick<Player, 'id' | 'name' | 'isAlive'> | null;
  isCampfireTarget?: boolean;
  isOwnSeatTarget?: boolean;
  isUserRoaming?: boolean;
  activePropTool: PropType | null;
  currentNightStep: RoleId | null;
  isPlayerAwakeAtNight: boolean;
  lang: Language;
}): ContextualInteractionPrompt | null {
  const {
    phase,
    me,
    target,
    isCampfireTarget = false,
    isOwnSeatTarget = false,
    isUserRoaming = false,
    activePropTool,
    currentNightStep,
    isPlayerAwakeAtNight,
    lang,
  } = params;
  const isVi = lang === 'vi';

  if (isOwnSeatTarget && isUserRoaming && me.isAlive) {
    return {
      icon: '🪑',
      actionLabel: isVi ? 'Ngồi lại vào ghế của bạn' : 'Sit back on your stool',
      targetName: isVi ? 'Ghế của bạn' : 'Your Stool',
      detail: isVi ? 'Nhấn [E], [X] hoặc Click để ngồi xuống' : 'Press [E], [X] or Click to sit down',
      canInteract: true,
      tone: 'info',
    };
  }

  if (isCampfireTarget) {
    if (phase === 'day_voting' && me.isAlive) {
      return {
        icon: '🔥',
        actionLabel: isVi ? 'Bỏ phiếu trắng (Lửa Trại)' : 'Abstain Vote (Campfire)',
        targetName: isVi ? 'Lửa Trại' : 'Campfire',
        detail: isVi ? 'Nhấn [E] hoặc Click để không treo cổ ai' : 'Press [E] or Click to abstain',
        canInteract: true,
        tone: 'vote',
      };
    }
    return null;
  }

  if (!target) return null;

  // Dying Hunter firing their revenge shot is already dead (isAlive=false), so check before Ghost block
  if (phase === 'hunter_revenge' && me.roleId === 'hunter' && !me.hasUsedPower) {
    if (!target.isAlive) {
      return {
        icon: '🪦',
        actionLabel: isVi ? `${target.name} đã tử vong` : `${target.name} is eliminated`,
        targetName: target.name,
        detail: isVi ? 'Không thể chọn mục tiêu đã chết' : 'Cannot target eliminated players',
        canInteract: false,
        tone: 'blocked',
      };
    }
    return {
      icon: '🏹',
      actionLabel: isVi ? `Bắn kéo theo ${target.name}` : `Shoot & drag down ${target.name}`,
      targetName: target.name,
      detail: isVi ? 'Nhấn [E] hoặc Click để khai hỏa' : 'Press [E] or Click to fire revenge shot',
      canInteract: true,
      tone: 'night',
    };
  }

  if (!me.isAlive) {
    return {
      icon: '👻',
      actionLabel: isVi ? `Quan sát ${target.name}` : `Spectating ${target.name}`,
      targetName: target.name,
      detail: isVi ? 'Hồn Ma chỉ có thể bay quan sát (Chat & Mic đã khóa)' : 'Ghosts can only observe (Chat & Mic locked)',
      canInteract: false,
      tone: 'blocked',
    };
  }

  // Throwing a held 3D prop takes top priority during daytime
  if (activePropTool && (phase === 'day_discussion' || phase === 'day_voting')) {
    const propLabels: Record<PropType, { icon: string; vi: string; en: string }> = {
      tomato: { icon: '🍅', vi: 'Ném Cà Chua vào', en: 'Throw Tomato at' },
      egg: { icon: '🥚', vi: 'Ném Trứng Thối vào', en: 'Throw Rotten Egg at' },
      rose: { icon: '💐', vi: 'Tặng Hoa Hồng cho', en: 'Toss Rose to' },
      water: { icon: '🪣', vi: 'Tạt Nước vào', en: 'Splash Water on' },
    };
    const p = propLabels[activePropTool];
    return {
      icon: p.icon,
      actionLabel: `${isVi ? p.vi : p.en} ${target.name}`,
      targetName: target.name,
      detail: isVi ? 'Nhấn [E] hoặc Click để ném ngay' : 'Press [E] or Click to throw now',
      canInteract: true,
      tone: 'prop',
    };
  }

  if (!target.isAlive) {
    return {
      icon: '🪦',
      actionLabel: isVi ? `${target.name} đã tử vong` : `${target.name} is eliminated`,
      targetName: target.name,
      detail: isVi ? 'Không thể chọn mục tiêu đã chết' : 'Cannot target eliminated players',
      canInteract: false,
      tone: 'blocked',
    };
  }

  if (phase === 'day_voting') {
    return {
      icon: '⚖️',
      actionLabel: isVi ? `Chỉ tay bỏ phiếu treo cổ ${target.name}` : `Point & Vote to lynch ${target.name}`,
      targetName: target.name,
      detail: isVi ? 'Nhấn [E] hoặc Click để dồn phiếu' : 'Press [E] or Click to cast your vote',
      canInteract: true,
      tone: 'vote',
    };
  }

  if (phase === 'hunter_revenge') {
    return {
      icon: '👀',
      actionLabel: isVi ? `Theo dõi ${target.name}` : `Watch ${target.name}`,
      targetName: target.name,
      detail: isVi ? 'Đang chờ Thợ Săn chọn mục tiêu' : 'Waiting for Hunter to fire',
      canInteract: false,
      tone: 'info',
    };
  }

  if (phase === 'night') {
    if (!isPlayerAwakeAtNight) {
      return null;
    }
    if (currentNightStep === 'werewolf') {
      return {
        icon: '🐺',
        actionLabel: isVi ? `Chọn cắn ${target.name}` : `Mark ${target.name} to bite`,
        targetName: target.name,
        detail: isVi ? 'Nhấn [E] hoặc Click để khóa con mồi' : 'Press [E] or Click to select prey',
        canInteract: true,
        tone: 'night',
      };
    }
    if (currentNightStep === 'seer') {
      return {
        icon: '🔮',
        actionLabel: isVi ? `Soi phe thật của ${target.name}` : `Inspect ${target.name}'s true aura`,
        targetName: target.name,
        detail: isVi ? 'Nhấn [E] hoặc Click để soi vai trò' : 'Press [E] or Click to divine role',
        canInteract: true,
        tone: 'night',
      };
    }
    if (currentNightStep === 'bodyguard') {
      return {
        icon: '🛡️',
        actionLabel: isVi ? `Bảo vệ ${target.name} đêm nay` : `Protect ${target.name} tonight`,
        targetName: target.name,
        detail: isVi ? 'Nhấn [E] hoặc Click để dựng khiên' : 'Press [E] or Click to shield target',
        canInteract: true,
        tone: 'night',
      };
    }
    if (currentNightStep === 'witch') {
      if (me.hasUsedPoison || me.hasUsedPower) {
        return {
          icon: '🧪',
          actionLabel: isVi ? 'Đã hết Bình Độc' : 'Poison Potion Depleted',
          targetName: target.name,
          detail: isVi ? 'Bạn đã sử dụng bình độc ở đêm trước' : 'Poison potion was already used',
          canInteract: false,
          tone: 'blocked',
        };
      }
      return {
        icon: '🧪',
        actionLabel: isVi ? `Ném Bình Độc hạ gục ${target.name}` : `Throw Poison Vial at ${target.name}`,
        targetName: target.name,
        detail: isVi ? 'Nhấn [E] hoặc Click để đầu độc' : 'Press [E] or Click to poison target',
        canInteract: true,
        tone: 'night',
      };
    }
    if (currentNightStep === 'cupid') {
      return {
        icon: '💘',
        actionLabel: isVi ? `Ghép đôi Tình Nhân: ${target.name}` : `Link Lover: ${target.name}`,
        targetName: target.name,
        detail: isVi ? 'Nhấn [E] hoặc Click để chọn ghép đôi' : 'Press [E] or Click to pair lover',
        canInteract: true,
        tone: 'night',
      };
    }
    if (currentNightStep === 'doppelganger') {
      return {
        icon: '🎭',
        actionLabel: isVi ? `Chọn hình mẫu sao chép: ${target.name}` : `Copy identity of ${target.name}`,
        targetName: target.name,
        detail: isVi ? 'Nhấn [E] hoặc Click để liên kết Nhân Bản' : 'Press [E] or Click to link target',
        canInteract: true,
        tone: 'night',
      };
    }
  }

  // Day discussion default interaction
  return {
    icon: '🔍',
    actionLabel: isVi ? `Chọn & đánh dấu nghi vấn ${target.name}` : `Focus & inspect ${target.name}`,
    targetName: target.name,
    detail: isVi
      ? 'Nhấn [E]/Click để chọn · Bấm [T] lấy đạo cụ ném'
      : 'Press [E]/Click to select · Press [T] to throw props',
    canInteract: true,
    tone: 'info',
  };
}

/**
 * Cycles through camera presets including First-Person mode.
 */
export function getNextCameraPreset(current: CameraViewPreset): CameraViewPreset {
  const order: CameraViewPreset[] = [
    'campfire',
    'first_person',
    'third_person',
    'overhead',
    'dramatic',
  ];
  const idx = order.indexOf(current);
  if (idx === -1) return 'first_person';
  return order[(idx + 1) % order.length];
}

/**
 * Computes responsive camera distance multiplier and vertical FOV so the full village
 * circle stays comfortably framed on narrow portrait mobile screens as well as wide desktops.
 */
export function computeResponsiveCameraFraming(params: {
  aspect: number;
  baseFov?: number;
  villageRadius?: number;
}): { distMultiplier: number; targetFov: number } {
  const { aspect, baseFov = 46, villageRadius = 6.2 } = params;
  const safeAspect = Math.max(0.35, Math.min(3.0, aspect));

  if (safeAspect >= 1.05) {
    return { distMultiplier: 1.0, targetFov: baseFov };
  }

  const targetFov = Math.min(60, Math.round(baseFov + (1.05 - safeAspect) * 20));
  const vFovRad = (targetFov * Math.PI) / 180;
  const hFovRad = 2 * Math.atan(Math.tan(vFovRad / 2) * safeAspect);

  const requiredDistForHorizontalFit = villageRadius / Math.max(0.25, Math.tan(hFovRad / 2));
  const referenceLandscapeDist = 14.5;
  const rawMult = requiredDistForHorizontalFit / referenceLandscapeDist;
  const distMultiplier = Math.max(1.0, Math.min(2.15, Number(rawMult.toFixed(3))));

  return { distMultiplier, targetFov };
}

export interface GhostFreeFlightResult {
  nextPos: Vec3Like;
  nextVelocity: { x: number; z: number };
  nextHoverHeight: number;
  nextFacingYaw: number;
  reachedDashTarget: boolean;
}

/**
 * Pure free-flight kinematics for a player's Ghost Soul.
 * Guarantees the ghost moves smoothly across the map and STAYS wherever the player stops
 * (smooth exponential deceleration + gentle bob in place — NEVER snapping back to an orbit).
 */
export function stepGhostFreeFlight(params: {
  currentPos: Vec3Like;
  velocity: { x: number; z: number };
  hoverHeight: number;
  facingYaw: number;
  cameraYaw: number;
  isDirectLook: boolean;
  inputX: number;
  inputZ: number;
  verticalInput: number; // +1 ascend (Space), -1 descend (Ctrl), 0 maintain altitude
  isSprinting: boolean;
  dashTargetPos: { x: number; z: number } | null;
  groundY: number;
  elapsedSec: number;
  seatPhaseOffset?: number;
  dt: number;
  maxRadius?: number;
  minHoverAboveGround?: number;
  maxHoverAboveGround?: number;
}): GhostFreeFlightResult {
  const {
    currentPos,
    velocity,
    hoverHeight,
    facingYaw,
    cameraYaw,
    isDirectLook,
    inputX,
    inputZ,
    verticalInput,
    isSprinting,
    dashTargetPos,
    groundY,
    elapsedSec,
    seatPhaseOffset = 0,
    dt,
    maxRadius = 23.5,
    minHoverAboveGround = 0.85,
    maxHoverAboveGround = 6.2,
  } = params;

  const clampedDt = Math.max(0, Math.min(0.1, dt));
  const maxSpeed = isSprinting ? 11.4 : 7.2;
  let targetVx = 0;
  let targetVz = 0;
  let reachedDashTarget = false;
  let nextFacingYaw = facingYaw;

  const hasMoveInput = Math.hypot(inputX, inputZ) > 0.05;

  if (hasMoveInput) {
    let dirX = 0;
    let dirZ = 0;
    if (isDirectLook) {
      const forwardAmt = -inputZ;
      const strafeAmt = inputX;
      const sinY = Math.sin(cameraYaw);
      const cosY = Math.cos(cameraYaw);
      const rightX = -cosY;
      const rightZ = sinY;
      dirX = sinY * forwardAmt + rightX * strafeAmt;
      dirZ = cosY * forwardAmt + rightZ * strafeAmt;
    } else {
      const cosA = Math.cos(cameraYaw);
      const sinA = Math.sin(cameraYaw);
      dirX = inputX * cosA + inputZ * sinA;
      dirZ = -inputX * sinA + inputZ * cosA;
    }
    const mag = Math.hypot(dirX, dirZ) || 1;
    dirX /= mag;
    dirZ /= mag;
    targetVx = dirX * maxSpeed;
    targetVz = dirZ * maxSpeed;
    nextFacingYaw = Math.atan2(dirX, dirZ);
  } else if (dashTargetPos) {
    const dx = dashTargetPos.x - currentPos.x;
    const dz = dashTargetPos.z - currentPos.z;
    const dist = Math.hypot(dx, dz);
    if (dist > 0.22) {
      const glideSpeed = Math.min(maxSpeed, Math.max(2.6, dist * 3.2));
      targetVx = (dx / dist) * glideSpeed;
      targetVz = (dz / dist) * glideSpeed;
      nextFacingYaw = Math.atan2(dx, dz);
    } else {
      reachedDashTarget = true;
    }
  } else if (isDirectLook) {
    // Gently align ghost facing with camera look yaw when hovering in third-person view
    const diff = Math.atan2(Math.sin(cameraYaw - facingYaw), Math.cos(cameraYaw - facingYaw));
    nextFacingYaw = facingYaw + diff * (1 - Math.exp(-7 * clampedDt));
  }

  // Smooth spectral acceleration & friction damping so ghost floats gently to a stop right where released
  const accelLambda = hasMoveInput || dashTargetPos ? 8.5 : 6.2;
  const blend = 1 - Math.exp(-accelLambda * clampedDt);
  let nextVx = velocity.x + (targetVx - velocity.x) * blend;
  let nextVz = velocity.z + (targetVz - velocity.z) * blend;
  if (!hasMoveInput && !dashTargetPos && Math.hypot(nextVx, nextVz) < 0.025) {
    nextVx = 0;
    nextVz = 0;
  }

  let nextX = currentPos.x + nextVx * clampedDt;
  let nextZ = currentPos.z + nextVz * clampedDt;

  // Clamp cleanly within expanded forest clearing radius (ghosts CAN float freely over the campfire!)
  const radialDist = Math.hypot(nextX, nextZ);
  if (radialDist > maxRadius && radialDist > 1e-4) {
    const scale = maxRadius / radialDist;
    nextX *= scale;
    nextZ *= scale;
  }

  // Smooth vertical altitude control (Space = ascend, Ctrl = descend)
  const climbSpeed = 3.8;
  const nextHoverHeight = Math.max(
    minHoverAboveGround,
    Math.min(maxHoverAboveGround, hoverHeight + verticalInput * climbSpeed * clampedDt)
  );
  const spectralBob = Math.sin(elapsedSec * 2.8 + seatPhaseOffset) * 0.24;
  const nextY = groundY + nextHoverHeight + spectralBob;

  return {
    nextPos: { x: nextX, y: nextY, z: nextZ },
    nextVelocity: { x: nextVx, z: nextVz },
    nextHoverHeight,
    nextFacingYaw,
    reachedDashTarget,
  };
}

/**
 * Gentle autonomous waypoint-wandering helper for dead AI/bot ghosts so they drift
 * naturally around the village and hover near living players instead of orbiting in a rigid ring.
 */
export function computeBotGhostWanderStep(params: {
  currentPos: Vec3Like;
  wanderTarget: { x: number; z: number };
  waitTimer: number;
  facingYaw: number;
  groundY: number;
  elapsedSec: number;
  seatIndex: number;
  circleRadius: number;
  dt: number;
}): {
  nextPos: Vec3Like;
  nextWanderTarget: { x: number; z: number };
  nextWaitTimer: number;
  nextFacingYaw: number;
} {
  const {
    currentPos,
    wanderTarget,
    waitTimer,
    facingYaw,
    groundY,
    elapsedSec,
    seatIndex,
    circleRadius,
    dt,
  } = params;
  const clampedDt = Math.max(0, Math.min(0.1, dt));
  let nextTarget = wanderTarget;
  let nextWait = waitTimer;
  let nextX = currentPos.x;
  let nextZ = currentPos.z;
  let nextYaw = facingYaw;

  const dx = wanderTarget.x - currentPos.x;
  const dz = wanderTarget.z - currentPos.z;
  const dist = Math.hypot(dx, dz);

  if (dist < 0.45) {
    if (nextWait > 0) {
      nextWait = Math.max(0, nextWait - clampedDt);
      // Gently turn inward toward campfire while observing
      const toFireYaw = Math.atan2(-currentPos.x, -currentPos.z);
      const diff = Math.atan2(Math.sin(toFireYaw - facingYaw), Math.cos(toFireYaw - facingYaw));
      nextYaw = facingYaw + diff * (1 - Math.exp(-3.2 * clampedDt));
    } else {
      // Deterministic pseudo-random next waypoint around camp clearing & outer tents
      const seed = Math.sin((seatIndex + 1) * 12.9898 + Math.floor(elapsedSec * 10) * 78.233) * 43758.5453;
      const frac1 = seed - Math.floor(seed);
      const seed2 = Math.sin((seatIndex + 7) * 93.989 + Math.floor(elapsedSec * 7) * 41.123) * 24634.6345;
      const frac2 = seed2 - Math.floor(seed2);
      const nextAngle = frac1 * Math.PI * 2;
      const nextRadius = Math.max(2.6, circleRadius * 0.55) + frac2 * (circleRadius * 0.95 + 3.2);
      nextTarget = {
        x: Math.cos(nextAngle) * nextRadius,
        z: Math.sin(nextAngle) * nextRadius,
      };
      nextWait = 1.6 + frac2 * 2.8;
    }
  } else {
    const speed = 1.85;
    const step = Math.min(dist, speed * clampedDt);
    nextX += (dx / dist) * step;
    nextZ += (dz / dist) * step;
    const moveYaw = Math.atan2(dx, dz);
    const diff = Math.atan2(Math.sin(moveYaw - facingYaw), Math.cos(moveYaw - facingYaw));
    nextYaw = facingYaw + diff * (1 - Math.exp(-4.5 * clampedDt));
  }

  const nextY = groundY + 1.65 + Math.sin(elapsedSec * 2.6 + seatIndex * 1.37) * 0.28;

  return {
    nextPos: { x: nextX, y: nextY, z: nextZ },
    nextWanderTarget: nextTarget,
    nextWaitTimer: nextWait,
    nextFacingYaw: nextYaw,
  };
}

/**
 * Computes continuous horizontal camera turn speed (rad/s) when the user is actively dragging
 * the mouse near the left or right viewport border, allowing effortless 360°+ rotation even
 * when Pointer Lock is not engaged and the cursor hits the edge of the screen.
 * Positive rate = turning left (increasing yaw), Negative rate = turning right (decreasing yaw).
 */
export function computeDragEdgePanRate(params: {
  clientX: number;
  viewportLeft: number;
  viewportWidth: number;
  edgeFraction?: number;
  maxTurnSpeed?: number;
}): number {
  const {
    clientX,
    viewportLeft,
    viewportWidth,
    edgeFraction = 0.11,
    maxTurnSpeed = 2.45,
  } = params;
  if (viewportWidth <= 0 || edgeFraction <= 0) return 0;

  const normX = Math.max(0, Math.min(1, (clientX - viewportLeft) / viewportWidth));
  if (normX < edgeFraction) {
    const t = (edgeFraction - normX) / edgeFraction; // 0..1 as cursor nears left edge
    return t * t * maxTurnSpeed;
  }
  if (normX > 1 - edgeFraction) {
    const t = (normX - (1 - edgeFraction)) / edgeFraction; // 0..1 as cursor nears right edge
    return -(t * t * maxTurnSpeed);
  }
  return 0;
}

/**
 * Decides whether mouse movement should rotate the 3D camera.
 * Guarantees:
 * - Zero camera rotation whenever a menu/modal/drawer/title/blindfold/cinematic is open.
 * - Zero camera rotation on passive cursor hover (moving mouse toward HUD buttons/menus).
 * - Smooth rotation ONLY when Pointer Lock is active (true infinite 360°) OR while actively dragging on canvas.
 */
export function shouldApplyCameraLook(params: {
  isTitleScreen: boolean;
  isNightBlindfolded: boolean;
  hasDeathCinematic: boolean;
  isUiOverlayOpen: boolean;
  isPointerLocked: boolean;
  isDraggingCanvas: boolean;
}): boolean {
  const {
    isTitleScreen,
    isNightBlindfolded,
    hasDeathCinematic,
    isUiOverlayOpen,
    isPointerLocked,
    isDraggingCanvas,
  } = params;

  if (isTitleScreen || isNightBlindfolded || hasDeathCinematic || isUiOverlayOpen) {
    return false;
  }
  return isPointerLocked || isDraggingCanvas;
}

