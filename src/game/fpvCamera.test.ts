import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeCampfireCircleRadius,
  computeDefaultFpvYawFromSeatAngle,
  computeFpvYawTowardOrigin,
  computeCameraViewRay,
  clampAndSlideCampfireCollision,
  clampFpvPitch,
  computeFpvCameraPose,
  computeThirdPersonCameraPose,
  isDirectLookCameraPreset,
  computeFpvMovementStep,
  stepCharacterVerticalPhysics,
  findFpvCrosshairTarget,
  getContextualInteractionPrompt,
  getNextCameraPreset,
  computeResponsiveCameraFraming,
  stepGhostFreeFlight,
  computeBotGhostWanderStep,
  computeDragEdgePanRate,
  shouldApplyCameraLook,
} from './fpvCamera';

test('computeCampfireCircleRadius expands smoothly for larger player counts without crowding', () => {
  const r6 = computeCampfireCircleRadius(6);
  const r8 = computeCampfireCircleRadius(8);
  const r12 = computeCampfireCircleRadius(12);
  const r16 = computeCampfireCircleRadius(16);
  const r20 = computeCampfireCircleRadius(20);

  assert.ok(r6 >= 5.65);
  assert.ok(r12 > r8, `expected 12-player radius (${r12}) > 8-player radius (${r8})`);
  assert.ok(r16 > r12, `expected 16-player radius (${r16}) > 12-player radius (${r12})`);
  assert.ok(r20 > r16, `expected 20-player radius (${r20}) > 16-player radius (${r16})`);

  // Arc spacing per player for 12 and 16 players should be >= 2.2m so characters don't overlap
  const arc12 = (2 * Math.PI * r12) / 12;
  const arc16 = (2 * Math.PI * r16) / 16;
  assert.ok(arc12 >= 2.2, `expected 12p arc spacing >= 2.2m, got ${arc12}`);
  assert.ok(arc16 >= 2.2, `expected 16p arc spacing >= 2.2m, got ${arc16}`);
});

test('computeDefaultFpvYawFromSeatAngle points directly toward campfire (0, 0, 0)', () => {
  const seatAngle = Math.PI / 2; // Seat 0 at (0, 0, +R)
  const yaw = computeDefaultFpvYawFromSeatAngle(seatAngle);
  const pose = computeFpvCameraPose({
    charPos: { x: 0, y: 0, z: 5.65 },
    isGhost: false,
    yaw,
    pitch: 0,
    elapsedSec: 0,
    isMoving: false,
  });

  // Forward should point along -Z toward (0, 0, 0)
  assert.ok(Math.abs(pose.forward.x) < 1e-6);
  assert.ok(Math.abs(pose.forward.z - -1) < 1e-6);
  assert.ok(pose.lookTarget.z < 0);
});

test('computeFpvCameraPose adjusts eye height realistically for seated, standing, crouching, and jumping', () => {
  const seated = computeFpvCameraPose({
    charPos: { x: 0, y: 0, z: 6 },
    isGhost: false,
    yaw: Math.PI,
    pitch: 0,
    elapsedSec: 0,
    isMoving: false,
    stance: 'seated',
  });
  const standing = computeFpvCameraPose({
    charPos: { x: 0, y: 0, z: 6 },
    isGhost: false,
    yaw: Math.PI,
    pitch: 0,
    elapsedSec: 0,
    isMoving: false,
    stance: 'standing',
  });
  const crouching = computeFpvCameraPose({
    charPos: { x: 0, y: 0, z: 6 },
    isGhost: false,
    yaw: Math.PI,
    pitch: 0,
    elapsedSec: 0,
    isMoving: false,
    stance: 'crouching',
    crouchBlend: 1,
  });
  const jumping = computeFpvCameraPose({
    charPos: { x: 0, y: 0, z: 6 },
    isGhost: false,
    yaw: Math.PI,
    pitch: 0,
    elapsedSec: 0,
    isMoving: false,
    stance: 'standing',
    jumpHeight: 0.9,
  });

  assert.ok(standing.eyePos.y > seated.eyePos.y, 'standing eye should be higher than seated');
  assert.ok(crouching.eyePos.y < seated.eyePos.y, 'crouching eye should be lower than seated');
  assert.ok(jumping.eyePos.y > standing.eyePos.y + 0.8, 'jumping eye should rise by jumpHeight');
});

test('stepCharacterVerticalPhysics simulates jump impulse, gravity arc, landing, and crouch blend', () => {
  let state = stepCharacterVerticalPhysics({
    yOffset: 0,
    vy: 0,
    isGrounded: true,
    crouchBlend: 0,
    jumpRequested: true,
    isCrouching: false,
    canJump: true,
    dt: 0.05,
  });
  assert.equal(state.isGrounded, false);
  assert.ok(state.yOffset > 0.2, 'jump should lift character upward');
  assert.ok(state.vy > 0);

  let peakY = state.yOffset;
  let landed = false;
  for (let i = 0; i < 40; i++) {
    state = stepCharacterVerticalPhysics({
      ...state,
      jumpRequested: false,
      isCrouching: false,
      canJump: true,
      dt: 0.05,
    });
    if (state.yOffset > peakY) peakY = state.yOffset;
    if (state.landedThisFrame) landed = true;
  }

  assert.ok(peakY > 0.8 && peakY < 1.6, `expected natural jump peak ~1.1m, got ${peakY}`);
  assert.equal(state.isGrounded, true);
  assert.equal(state.yOffset, 0);
  assert.equal(landed, true);

  // Crouch smoothly transitions blend toward 1
  for (let i = 0; i < 15; i++) {
    state = stepCharacterVerticalPhysics({
      ...state,
      jumpRequested: false,
      isCrouching: true,
      canJump: true,
      dt: 0.05,
    });
  }
  assert.ok(state.crouchBlend > 0.95, `expected crouchBlend near 1, got ${state.crouchBlend}`);
});

test('clampFpvPitch constrains vertical look angle within safe bounds', () => {
  assert.equal(clampFpvPitch(2.0), 0.68);
  assert.equal(clampFpvPitch(-2.0), -0.68);
  assert.equal(clampFpvPitch(0.25), 0.25);
});

test('computeFpvMovementStep moves forward along look direction and supports expanded 24m roaming map', () => {
  const stepForward = computeFpvMovementStep({
    yaw: Math.PI,
    inputX: 0,
    inputZ: -1, // W key
    speed: 5,
    dt: 0.2,
    currentX: 0,
    currentZ: 5.65,
  });

  assert.ok(Math.abs(stepForward.nextX) < 1e-5);
  assert.ok(Math.abs(stepForward.nextZ - 4.65) < 1e-5);

  const stepRight = computeFpvMovementStep({
    yaw: Math.PI,
    inputX: 1,
    inputZ: 0,
    speed: 5,
    dt: 0.2,
    currentX: 0,
    currentZ: 5.65,
  });
  assert.ok(stepRight.nextX > 0.9);

  // Expanded map allows walking well past old 10.5m cap up to 24m
  const outerWalk = computeFpvMovementStep({
    yaw: 0,
    inputX: 0,
    inputZ: -1,
    speed: 6,
    dt: 0.5,
    currentX: 0,
    currentZ: 15,
  });
  assert.ok(outerWalk.nextZ > 17.5, `expected expanded map walk past 17.5m, got ${outerWalk.nextZ}`);

  // Walking into the campfire center (0, 0) clamps at minRadius = 1.85
  const nearFire = computeFpvMovementStep({
    yaw: Math.PI,
    inputX: 0,
    inputZ: -1,
    speed: 10,
    dt: 0.05,
    currentX: 0,
    currentZ: 2.0,
  });
  const distToFire = Math.hypot(nearFire.nextX, nearFire.nextZ);
  assert.ok(Math.abs(distToFire - 1.85) < 1e-4);
});

test('findFpvCrosshairTarget selects the villager closest to the center look ray', () => {
  const eyePos = { x: 0, y: 1.56, z: 5.5 };
  const forward = { x: 0, y: 0, z: -1 };
  const candidates = [
    { playerId: 'usr_me', pos: { x: 0, y: 1.4, z: 5.5 }, visible: true },
    { playerId: 'bot_front', pos: { x: 0.2, y: 1.5, z: -5.5 }, visible: true },
    { playerId: 'bot_side', pos: { x: 5.5, y: 1.5, z: 0 }, visible: true },
  ];

  const target = findFpvCrosshairTarget({
    eyePos,
    forward,
    candidates,
    selfPlayerId: 'usr_me',
  });

  assert.equal(target, 'bot_front');
});

test('getContextualInteractionPrompt returns exact phase/role/tool labels instead of generic interact text', () => {
  const meAlive = { id: 'me', roleId: 'seer' as const, isAlive: true };
  const target = { id: 'p2', name: 'Đức Huy', isAlive: true };

  const votePrompt = getContextualInteractionPrompt({
    phase: 'day_voting',
    me: meAlive,
    target,
    activePropTool: null,
    currentNightStep: null,
    isPlayerAwakeAtNight: false,
    lang: 'vi',
  });
  assert.ok(votePrompt?.actionLabel.includes('bỏ phiếu treo cổ'));
  assert.equal(votePrompt?.tone, 'vote');

  const propPrompt = getContextualInteractionPrompt({
    phase: 'day_discussion',
    me: meAlive,
    target,
    activePropTool: 'tomato',
    currentNightStep: null,
    isPlayerAwakeAtNight: false,
    lang: 'vi',
  });
  assert.ok(propPrompt?.actionLabel.includes('Ném Cà Chua'));
  assert.equal(propPrompt?.tone, 'prop');

  const seerNightPrompt = getContextualInteractionPrompt({
    phase: 'night',
    me: meAlive,
    target,
    activePropTool: null,
    currentNightStep: 'seer',
    isPlayerAwakeAtNight: true,
    lang: 'vi',
  });
  assert.ok(seerNightPrompt?.actionLabel.includes('Soi phe thật'));
  assert.equal(seerNightPrompt?.tone, 'night');

  const ghostPrompt = getContextualInteractionPrompt({
    phase: 'day_voting',
    me: { id: 'me', roleId: 'villager', isAlive: false },
    target,
    activePropTool: null,
    currentNightStep: null,
    isPlayerAwakeAtNight: false,
    lang: 'vi',
  });
  assert.equal(ghostPrompt?.canInteract, false);
  const ownSeatPrompt = getContextualInteractionPrompt({
    phase: 'day_discussion',
    me: meAlive,
    target: null,
    isOwnSeatTarget: true,
    isUserRoaming: true,
    activePropTool: null,
    currentNightStep: null,
    isPlayerAwakeAtNight: false,
    lang: 'vi',
  });
  assert.equal(ownSeatPrompt?.canInteract, true);
  assert.ok(ownSeatPrompt?.actionLabel.includes('Ngồi lại vào ghế'));

  // P3-1: Dying Hunter (isAlive: false) MUST receive interactive shooting prompt in hunter_revenge phase
  const dyingHunterPrompt = getContextualInteractionPrompt({
    phase: 'hunter_revenge',
    me: { id: 'me', roleId: 'hunter', isAlive: false, hasUsedPower: false },
    target,
    activePropTool: null,
    currentNightStep: null,
    isPlayerAwakeAtNight: false,
    lang: 'vi',
  });
  assert.equal(dyingHunterPrompt?.canInteract, true);
  assert.equal(dyingHunterPrompt?.icon, '🏹');
  assert.equal(dyingHunterPrompt?.tone, 'night');
  assert.ok(dyingHunterPrompt?.actionLabel.includes('Bắn kéo theo'));

  // Dying Hunter aiming at already-dead player gets blocked dead-target prompt
  const dyingHunterDeadTarget = getContextualInteractionPrompt({
    phase: 'hunter_revenge',
    me: { id: 'me', roleId: 'hunter', isAlive: false, hasUsedPower: false },
    target: { id: 'p3', name: 'Minh Hoàng', isAlive: false },
    activePropTool: null,
    currentNightStep: null,
    isPlayerAwakeAtNight: false,
    lang: 'en',
  });
  assert.equal(dyingHunterDeadTarget?.canInteract, false);
  assert.equal(dyingHunterDeadTarget?.icon, '🪦');

  // Already-spent Hunter falls through to Ghost spectating prompt
  const spentHunterPrompt = getContextualInteractionPrompt({
    phase: 'hunter_revenge',
    me: { id: 'me', roleId: 'hunter', isAlive: false, hasUsedPower: true },
    target,
    activePropTool: null,
    currentNightStep: null,
    isPlayerAwakeAtNight: false,
    lang: 'vi',
  });
  assert.equal(spentHunterPrompt?.canInteract, false);
  assert.equal(spentHunterPrompt?.icon, '👻');
});

test('getNextCameraPreset cycles through first_person, third_person, and other presets', () => {
  assert.equal(getNextCameraPreset('campfire'), 'first_person');
  assert.equal(getNextCameraPreset('first_person'), 'third_person');
  assert.equal(getNextCameraPreset('third_person'), 'overhead');
  assert.equal(getNextCameraPreset('overhead'), 'dramatic');
  assert.equal(getNextCameraPreset('dramatic'), 'campfire');
});

test('isDirectLookCameraPreset enables direct mouse-look for both first_person and third_person', () => {
  assert.equal(isDirectLookCameraPreset('first_person'), true);
  assert.equal(isDirectLookCameraPreset('third_person'), true);
  assert.equal(isDirectLookCameraPreset('campfire'), false);
  assert.equal(isDirectLookCameraPreset('overhead'), false);
  assert.equal(isDirectLookCameraPreset('dramatic'), false);
});

test('computeThirdPersonCameraPose positions camera behind character, shares FPV forward ray, and clamps terrain clearance', () => {
  const yaw = Math.PI; // Facing -Z toward campfire
  const fpv = computeFpvCameraPose({
    charPos: { x: 0, y: 0, z: 6 },
    isGhost: false,
    yaw,
    pitch: -0.1,
    elapsedSec: 0,
    isMoving: false,
    stance: 'standing',
  });
  const tpv = computeThirdPersonCameraPose({
    charPos: { x: 0, y: 0, z: 6 },
    isGhost: false,
    yaw,
    pitch: -0.1,
    elapsedSec: 0,
    isMoving: false,
    stance: 'standing',
    minCameraY: 0.9,
  });

  // Camera must sit BEHIND the player (+Z when facing -Z)
  assert.ok(tpv.eyePos.z > 6 + 2.0, `expected TPV camera behind player (+Z), got z=${tpv.eyePos.z}`);
  assert.ok(tpv.eyePos.y >= 0.9, `expected TPV camera above minCameraY=0.9, got y=${tpv.eyePos.y}`);
  // Forward aim direction matches FPV closely so crosshair targeting behaves identically
  assert.ok(Math.abs(tpv.forward.x - fpv.forward.x) < 1e-6);
  assert.ok(Math.abs(tpv.forward.y - fpv.forward.y) < 1e-6);
  assert.ok(Math.abs(tpv.forward.z - fpv.forward.z) < 1e-6);

  // Looking steeply up should not push behind-the-back camera underground
  const steepUp = computeThirdPersonCameraPose({
    charPos: { x: 0, y: 0, z: 6 },
    isGhost: false,
    yaw,
    pitch: 0.68,
    elapsedSec: 0,
    isMoving: false,
    stance: 'crouching',
    crouchBlend: 1,
    minCameraY: 1.15,
  });
  assert.ok(steepUp.eyePos.y >= 1.15, `expected terrain clearance >= 1.15, got ${steepUp.eyePos.y}`);
});

test('computeResponsiveCameraFraming preserves landscape framing and expands portrait FOV/distance', () => {
  const desktop = computeResponsiveCameraFraming({ aspect: 1440 / 900, baseFov: 46, villageRadius: 6.2 });
  assert.equal(desktop.distMultiplier, 1.0);
  assert.equal(desktop.targetFov, 46);

  const mobile = computeResponsiveCameraFraming({ aspect: 390 / 844, baseFov: 46, villageRadius: 6.2 });
  assert.ok(mobile.targetFov > 52 && mobile.targetFov <= 60, `expected expanded portrait FOV, got ${mobile.targetFov}`);
  assert.ok(mobile.distMultiplier > 1.45 && mobile.distMultiplier <= 2.15, `expected portrait zoom-out multiplier, got ${mobile.distMultiplier}`);
});

test('stepGhostFreeFlight moves freely and stays in place after releasing movement keys (never snaps back to orbit)', () => {
  let pos = { x: 0, y: 1.6, z: 6.0 };
  let vel = { x: 0, z: 0 };
  let hoverHeight = 1.6;
  let facingYaw = Math.PI;

  // Fly forward (W) and slightly right (D) for 1 second in direct-look mode facing -Z (yaw = PI)
  for (let step = 0; step < 20; step++) {
    const res = stepGhostFreeFlight({
      currentPos: pos,
      velocity: vel,
      hoverHeight,
      facingYaw,
      cameraYaw: Math.PI,
      isDirectLook: true,
      inputX: 0.6,
      inputZ: -1,
      verticalInput: 1, // ascend slightly
      isSprinting: false,
      dashTargetPos: null,
      groundY: 0,
      elapsedSec: step * 0.05,
      dt: 0.05,
    });
    pos = res.nextPos;
    vel = res.nextVelocity;
    hoverHeight = res.nextHoverHeight;
    facingYaw = res.nextFacingYaw;
  }

  const posAfterFlight = { ...pos };
  assert.ok(posAfterFlight.z < 2.0, `ghost should have flown well forward, got z=${posAfterFlight.z}`);
  assert.ok(posAfterFlight.x > 1.5, `ghost should have flown right, got x=${posAfterFlight.x}`);
  assert.ok(hoverHeight > 2.8, `ghost should have ascended on Space, got hoverHeight=${hoverHeight}`);

  // Release ALL movement keys and wait 2.5 seconds -> ghost MUST hover near posAfterFlight, NOT jump back to z=6 or orbit!
  for (let step = 0; step < 50; step++) {
    const res = stepGhostFreeFlight({
      currentPos: pos,
      velocity: vel,
      hoverHeight,
      facingYaw,
      cameraYaw: Math.PI,
      isDirectLook: true,
      inputX: 0,
      inputZ: 0,
      verticalInput: 0,
      isSprinting: false,
      dashTargetPos: null,
      groundY: 0,
      elapsedSec: 1.0 + step * 0.05,
      dt: 0.05,
    });
    pos = res.nextPos;
    vel = res.nextVelocity;
    hoverHeight = res.nextHoverHeight;
    facingYaw = res.nextFacingYaw;
  }

  // Velocity settled to 0, and ghost stayed near where it decelerated (never snapped back to home z=6)
  assert.equal(vel.x, 0);
  assert.equal(vel.z, 0);
  const driftAfterRelease = Math.hypot(pos.x - posAfterFlight.x, pos.z - posAfterFlight.z);
  assert.ok(
    driftAfterRelease < 1.5,
    `ghost must settle smoothly where released instead of jumping back; drift=${driftAfterRelease}`
  );
  assert.ok(pos.z < 1.5, `ghost must stay at flown location (z=${pos.z}), not snap back to seat`);
});

test('computeBotGhostWanderStep drifts smoothly toward waypoints and pauses without snapping', () => {
  const start = { x: 4, y: 1.6, z: 4 };
  const step1 = computeBotGhostWanderStep({
    currentPos: start,
    wanderTarget: { x: -4, z: 4 },
    waitTimer: 0,
    facingYaw: 0,
    groundY: 0,
    elapsedSec: 1.0,
    seatIndex: 2,
    circleRadius: 6,
    dt: 0.05,
  });
  assert.ok(step1.nextPos.x < start.x, 'bot ghost should glide smoothly toward target x');
  assert.ok(Math.abs(step1.nextPos.x - start.x) < 0.25, 'bot ghost should move smoothly without teleporting');
});

test('computeDragEdgePanRate returns 0 in center and smooth opposing turn speeds near screen borders', () => {
  assert.equal(
    computeDragEdgePanRate({ clientX: 720, viewportLeft: 0, viewportWidth: 1440 }),
    0
  );
  const leftEdge = computeDragEdgePanRate({ clientX: 15, viewportLeft: 0, viewportWidth: 1440 });
  const rightEdge = computeDragEdgePanRate({ clientX: 1425, viewportLeft: 0, viewportWidth: 1440 });
  assert.ok(leftEdge > 1.0, `expected positive left turn rate at left edge, got ${leftEdge}`);
  assert.ok(rightEdge < -1.0, `expected negative right turn rate at right edge, got ${rightEdge}`);
});

test('shouldApplyCameraLook blocks rotation during menus/overlays and passive cursor hover', () => {
  // Moving mouse passively without drag or pointer lock must NOT rotate camera (prevents menu-navigation spin)
  assert.equal(
    shouldApplyCameraLook({
      isTitleScreen: false,
      isNightBlindfolded: false,
      hasDeathCinematic: false,
      isUiOverlayOpen: false,
      isPointerLocked: false,
      isDraggingCanvas: false,
    }),
    false
  );

  // Even if dragging or locked, opening ANY menu/overlay must freeze camera immediately
  assert.equal(
    shouldApplyCameraLook({
      isTitleScreen: false,
      isNightBlindfolded: false,
      hasDeathCinematic: false,
      isUiOverlayOpen: true,
      isPointerLocked: true,
      isDraggingCanvas: true,
    }),
    false
  );

  // Active canvas drag rotates smoothly
  assert.equal(
    shouldApplyCameraLook({
      isTitleScreen: false,
      isNightBlindfolded: false,
      hasDeathCinematic: false,
      isUiOverlayOpen: false,
      isPointerLocked: false,
      isDraggingCanvas: true,
    }),
    true
  );

  // Active Pointer Lock rotates infinitely 360 degrees
  assert.equal(
    shouldApplyCameraLook({
      isTitleScreen: false,
      isNightBlindfolded: false,
      hasDeathCinematic: false,
      isUiOverlayOpen: false,
      isPointerLocked: true,
      isDraggingCanvas: false,
    }),
    true
  );

  // BUG-22: Title Screen allows drag orbit ONLY when allowTitleOrbit is enabled
  assert.equal(
    shouldApplyCameraLook({
      isTitleScreen: true,
      allowTitleOrbit: false,
      isNightBlindfolded: false,
      hasDeathCinematic: false,
      isUiOverlayOpen: true,
      isPointerLocked: false,
      isDraggingCanvas: true,
    }),
    false
  );
  assert.equal(
    shouldApplyCameraLook({
      isTitleScreen: true,
      allowTitleOrbit: true,
      isNightBlindfolded: false,
      hasDeathCinematic: false,
      isUiOverlayOpen: true,
      isPointerLocked: false,
      isDraggingCanvas: true,
    }),
    true
  );
  assert.equal(
    shouldApplyCameraLook({
      isTitleScreen: true,
      allowTitleOrbit: true,
      isNightBlindfolded: false,
      hasDeathCinematic: false,
      isUiOverlayOpen: true,
      isPointerLocked: false,
      isDraggingCanvas: false,
    }),
    false
  );
});

test('BUG-10: initial FPV & TPV yaw faces inward toward campfire (0, 0) from seat #1 and every circle angle', () => {
  for (const playerCount of [6, 8, 12, 20]) {
    const radius = computeCampfireCircleRadius(playerCount);
    for (let seatIdx = 0; seatIdx < playerCount; seatIdx++) {
      const seatAngle = Math.PI / 2 + (seatIdx / playerCount) * Math.PI * 2;
      const seatPos = {
        x: Math.cos(seatAngle) * radius,
        y: 0,
        z: Math.sin(seatAngle) * radius,
      };
      const toCampfire = {
        x: -seatPos.x / radius,
        z: -seatPos.z / radius,
      };

      for (const yaw of [
        computeDefaultFpvYawFromSeatAngle(seatAngle),
        computeFpvYawTowardOrigin(seatPos, seatAngle),
      ]) {
        const fpv = computeFpvCameraPose({
          charPos: seatPos,
          isGhost: false,
          yaw,
          pitch: 0,
          elapsedSec: 0,
          isMoving: false,
          stance: 'standing',
        });
        const fpvDot = fpv.forward.x * toCampfire.x + fpv.forward.z * toCampfire.z;
        assert.ok(
          fpvDot > 0.99,
          `seat #${seatIdx + 1}/${playerCount}: expected FPV forward toward campfire (dot > 0.99), got ${fpvDot}`
        );

        const tpv = computeThirdPersonCameraPose({
          charPos: seatPos,
          isGhost: false,
          yaw,
          pitch: 0,
          elapsedSec: 0,
          isMoving: false,
          stance: 'standing',
        });
        const tpvRay = computeCameraViewRay(tpv.eyePos, tpv.lookTarget);
        const tpvHorizLen = Math.hypot(tpvRay.x, tpvRay.z);
        const tpvDot = (tpvRay.x * toCampfire.x + tpvRay.z * toCampfire.z) / tpvHorizLen;
        assert.ok(
          tpvDot > 0.99,
          `seat #${seatIdx + 1}/${playerCount}: expected TPV view ray toward campfire (dot > 0.99), got ${tpvDot}`
        );
      }
    }
  }

  // Fallback when standing directly on origin (0, 0) never produces NaN or random flip
  const fallbackYaw = computeFpvYawTowardOrigin({ x: 0, z: 0 }, Math.PI / 2);
  assert.ok(Math.abs(Math.cos(fallbackYaw) - -1) < 1e-6);
});

test('BUG-29: computeCameraViewRay aligns TPV center crosshair with rendered over-the-shoulder lookAt vector', () => {
  const tpv = computeThirdPersonCameraPose({
    charPos: { x: 0, y: 0, z: 6 },
    isGhost: false,
    yaw: Math.PI,
    pitch: 0.45,
    elapsedSec: 0,
    isMoving: false,
    stance: 'standing',
    minCameraY: 2.2, // forces vertical parallax clamp between eyePos and lookTarget
  });

  const viewRay = computeCameraViewRay(tpv.eyePos, tpv.lookTarget);
  const len = Math.hypot(viewRay.x, viewRay.y, viewRay.z);
  assert.ok(Math.abs(len - 1) < 1e-6, 'view ray must be unit length');
  // Camera is elevated/clamped above pivot - forward*dist, so actual rendered ray tilts lower than raw forward
  assert.ok(
    viewRay.y < tpv.forward.y - 0.05,
    `expected clamped TPV view ray Y (${viewRay.y}) significantly below un-tilted forward Y (${tpv.forward.y})`
  );

  // Target sitting directly on the rendered TPV center screen ray must be locked by crosshair
  const dist = 10;
  const centerScreenTarget = {
    x: tpv.eyePos.x + viewRay.x * dist,
    y: tpv.eyePos.y + viewRay.y * dist,
    z: tpv.eyePos.z + viewRay.z * dist,
  };
  const hit = findFpvCrosshairTarget({
    eyePos: tpv.eyePos,
    forward: viewRay,
    candidates: [{ playerId: 'villager_center', pos: centerScreenTarget, visible: true }],
    selfPlayerId: 'me',
    minCosineThreshold: 0.995,
  });
  assert.equal(hit, 'villager_center');
});

test('BUG-41: walking straight into campfire radius deflects smoothly tangentially without stalling', () => {
  // Start right on the campfire perimeter facing straight into (0, 0)
  let x = 0;
  let z = 1.85;
  for (let i = 0; i < 6; i++) {
    const step = computeFpvMovementStep({
      yaw: Math.PI,
      inputX: 0,
      inputZ: -1, // W straight at center
      speed: 5.4,
      dt: 0.05,
      currentX: x,
      currentZ: z,
      minRadius: 1.85,
    });
    x = step.nextX;
    z = step.nextZ;
    const r = Math.hypot(x, z);
    assert.ok(r >= 1.85 - 1e-4, `player must stay outside campfire radius, got r=${r}`);
  }
  const displaced = Math.hypot(x - 0, z - 1.85);
  assert.ok(
    displaced > 0.5,
    `expected smooth tangential slide around campfire instead of stalling dead, displaced=${displaced}`
  );

  // Direct helper also slides smoothly to the angled side when slightly left of center
  const leftSlide = clampAndSlideCampfireCollision({
    currentX: -0.4,
    currentZ: 1.81,
    moveWorldX: 0,
    moveWorldZ: -1,
    stepDist: 0.3,
    minRadius: 1.85,
  });
  assert.ok(leftSlide.nextX < -0.4, `expected left-angled approach to slide left, got x=${leftSlide.nextX}`);
  assert.ok(Math.abs(Math.hypot(leftSlide.nextX, leftSlide.nextZ) - 1.85) < 1e-4);
});

