import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeDefaultFpvYawFromSeatAngle,
  clampFpvPitch,
  computeFpvCameraPose,
  computeFpvMovementStep,
  findFpvCrosshairTarget,
  getNextCameraPreset,
  computeResponsiveCameraFraming,
} from './fpvCamera';

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

test('clampFpvPitch constrains vertical look angle within safe bounds', () => {
  assert.equal(clampFpvPitch(2.0), 0.68);
  assert.equal(clampFpvPitch(-2.0), -0.68);
  assert.equal(clampFpvPitch(0.25), 0.25);
});

test('computeFpvMovementStep moves forward along look direction and respects firepit & plaza bounds', () => {
  // Looking straight along -Z (yaw = Math.PI)
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

  // Strafe right (D key: inputX = +1) when looking along -Z should move toward +X
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
  const forward = { x: 0, y: 0, z: -1 }; // Looking North (-Z)
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

test('getNextCameraPreset cycles through first_person and other presets', () => {
  assert.equal(getNextCameraPreset('campfire'), 'first_person');
  assert.equal(getNextCameraPreset('first_person'), 'overhead');
  assert.equal(getNextCameraPreset('overhead'), 'dramatic');
  assert.equal(getNextCameraPreset('dramatic'), 'campfire');
});

test('computeResponsiveCameraFraming preserves landscape framing and expands portrait FOV/distance', () => {
  const desktop = computeResponsiveCameraFraming({ aspect: 1440 / 900, baseFov: 46, villageRadius: 6.2 });
  assert.equal(desktop.distMultiplier, 1.0);
  assert.equal(desktop.targetFov, 46);

  const mobile = computeResponsiveCameraFraming({ aspect: 390 / 844, baseFov: 46, villageRadius: 6.2 });
  assert.ok(mobile.targetFov > 52 && mobile.targetFov <= 60, `expected expanded portrait FOV, got ${mobile.targetFov}`);
  assert.ok(mobile.distMultiplier > 1.45 && mobile.distMultiplier <= 2.15, `expected portrait zoom-out multiplier, got ${mobile.distMultiplier}`);
});
