export type CameraViewPreset = 'orbit' | 'campfire' | 'overhead' | 'dramatic' | 'first_person';

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
 * Computes the First-Person eye position, forward/right basis vectors, and lookAt target
 * given the character's world position, yaw, pitch, and walking/breathing bob parameters.
 */
export function computeFpvCameraPose(params: {
  charPos: Vec3Like;
  isGhost: boolean;
  yaw: number;
  pitch: number;
  elapsedSec: number;
  isMoving: boolean;
}): FpvPoseResult {
  const { charPos, isGhost, yaw, pitch, elapsedSec, isMoving } = params;
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

  // Eye height & subtle head bob
  const baseEyeY = isGhost ? charPos.y + 1.05 : 1.56;
  const bobFreq = isMoving ? 11.5 : 2.4;
  const bobAmpY = isMoving ? 0.055 : 0.012;
  const bobAmpSide = isMoving ? 0.025 : 0;

  const bobY = Math.sin(elapsedSec * bobFreq) * bobAmpY;
  const bobSide = Math.cos(elapsedSec * (bobFreq * 0.5)) * bobSideSign(bobAmpSide);

  // Offset eye slightly forward so it clears any collar/shoulder geometry
  const forwardOffset = 0.14;
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
  };
}

function bobSideSign(val: number): number {
  return val;
}

/**
 * Computes world-space XZ movement delta in First-Person mode from local input
 * (inputZ < 0 = W/Forward, inputZ > 0 = S/Backward, inputX > 0 = D/Right, inputX < 0 = A/Left).
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
}): { nextX: number; nextZ: number; moveWorldX: number; moveWorldZ: number } {
  const { yaw, inputX, inputZ, speed, dt, currentX, currentZ, maxRadius = 10.5 } = params;
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

  // Keep player outside the central fire pit (r >= 1.85) and within the village plaza (r <= maxRadius)
  const distFromCenter = Math.hypot(nextX, nextZ);
  const minRadius = 1.85;
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
    maxDistance = 18,
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
    const dot =
      (dx * forward.x + dy * forward.y + dz * forward.z) * invDist;

    if (dot >= minCosineThreshold && dot > bestScore) {
      bestScore = dot;
      bestId = c.playerId;
    }
  }

  return bestId;
}

/**
 * Cycles through camera presets including First-Person mode.
 */
export function getNextCameraPreset(current: CameraViewPreset): CameraViewPreset {
  const order: CameraViewPreset[] = ['campfire', 'first_person', 'overhead', 'dramatic'];
  const idx = order.indexOf(current);
  if (idx === -1) return 'first_person';
  return order[(idx + 1) % order.length];
}

/**
 * Computes responsive camera distance multiplier and vertical FOV so the full village
 * circle (radius ~5.65m) stays comfortably framed on narrow portrait mobile screens
 * (e.g., 390x844, aspect ~0.46) as well as wide desktops.
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

  // On portrait screens, horizontal FOV shrinks dramatically when vertical FOV is fixed.
  // Expand vertical FOV moderately and pull camera back inversely with aspect so all seats fit.
  const targetFov = Math.min(60, Math.round(baseFov + (1.05 - safeAspect) * 20));
  const vFovRad = (targetFov * Math.PI) / 180;
  const hFovRad = 2 * Math.atan(Math.tan(vFovRad / 2) * safeAspect);

  // Desired horizontal half-width span at distance d should cover villageRadius
  const requiredDistForHorizontalFit = villageRadius / Math.max(0.25, Math.tan(hFovRad / 2));
  const referenceLandscapeDist = 14.5;
  const rawMult = requiredDistForHorizontalFit / referenceLandscapeDist;
  const distMultiplier = Math.max(1.0, Math.min(2.15, Number(rawMult.toFixed(3))));

  return { distMultiplier, targetFov };
}

