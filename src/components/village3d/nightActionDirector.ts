import * as THREE from 'three';
import { NightSkillCutsceneEvent, NightSkillCutsceneKind, Player } from '../../types/game';
import { AgrouMapBiome } from '../../game/agrouMechanics';
import { AgrouSeatVisual, applyAdventurerBodyPose } from './buildAgrouAdventurer';
import { sampleTerrainHeight } from './buildAgrouEnvironment';

export interface NightActionDirectorHandle {
  update: (params: {
    sceneEvent: NightSkillCutsceneEvent | null;
    seats: AgrouSeatVisual[];
    activePlayers: Player[];
    biomeKey: AgrouMapBiome;
    dt: number;
    simDt: number;
    elapsed: number;
    onPlaySfx?: (kind: NightSkillCutsceneKind, pos: { x: number; y: number; z: number }) => void;
  }) => void;
  hardResetSeats: (seats: AgrouSeatVisual[]) => void;
  dispose: () => void;
}

const _vA = new THREE.Vector3();
const _vB = new THREE.Vector3();
const _vCur = new THREE.Vector3();
const _vDir = new THREE.Vector3();
const _vUp = new THREE.Vector3(0, 1, 0);
const _quat = new THREE.Quaternion();

/**
 * Interpolates XZ movement from `from` to `to` while smoothly curving around the central
 * campfire `(0, 0)` so lunging werewolves or stepping bodyguards never walk through the fire logs.
 */
export function stepAroundCampfire(
  from: { x: number; z: number },
  to: { x: number; z: number },
  t: number,
  out: THREE.Vector3,
  minR = 2.2
): THREE.Vector3 {
  const u = Math.max(0, Math.min(1, t));
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const lenSq = dx * dx + dz * dz;
  let px = from.x + dx * u;
  let pz = from.z + dz * u;

  if (lenSq > 1e-4) {
    const sClosest = Math.max(0, Math.min(1, -(from.x * dx + from.z * dz) / lenSq));
    const cx = from.x + dx * sClosest;
    const cz = from.z + dz * sClosest;
    const closestR = Math.hypot(cx, cz);
    if (closestR < minR + 0.35) {
      const len = Math.sqrt(lenSq);
      let nx = closestR > 1e-3 ? cx / closestR : -dz / len;
      let nz = closestR > 1e-3 ? cz / closestR : dx / len;
      // Ensure perpendicular bulge direction consistently deflects outward
      if (nx * cx + nz * cz < 0) {
        nx = -nx;
        nz = -nz;
      }
      const bulge = (minR + 0.55 - closestR) * Math.sin(u * Math.PI);
      px += nx * bulge;
      pz += nz * bulge;
    }
  }

  const r = Math.hypot(px, pz);
  if (r < minR) {
    if (r > 1e-4) {
      const sc = minR / r;
      px *= sc;
      pz *= sc;
    } else {
      px = minR;
      pz = 0;
    }
  }
  out.set(px, 0, pz);
  return out;
}

function aimSeatAtWorld(seat: AgrouSeatVisual, tx: number, tz: number) {
  const worldYaw = Math.atan2(tx - seat.currentPos.x, tz - seat.currentPos.z);
  const rel = worldYaw - seat.group.rotation.y;
  seat.bodyGroup.rotation.y = Math.atan2(Math.sin(rel), Math.cos(rel));
  seat.torsoGroup.rotation.y = 0;
}

function positionStopBeforeTarget(from: THREE.Vector3, target: THREE.Vector3, stopDist: number, out: THREE.Vector3) {
  const dx = target.x - from.x;
  const dz = target.z - from.z;
  const d = Math.hypot(dx, dz) || 1;
  out.set(target.x - (dx / d) * stopDist, 0, target.z - (dz / d) * stopDist);
}

export function createNightActionDirector(scene: THREE.Scene): NightActionDirectorHandle {
  const geos: THREE.BufferGeometry[] = [];
  const mats: THREE.Material[] = [];
  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => { geos.push(g); return g; };
  const trackMat = <T extends THREE.Material>(m: T): T => { mats.push(m); return m; };

  const root = new THREE.Group();
  root.visible = false;
  scene.add(root);

  const fxLight = new THREE.PointLight(0xffffff, 0, 12, 1.5);
  root.add(fxLight);

  // 1. Werewolf crimson claw slash arcs (3 curved razor ribbons)
  const clawGroup = new THREE.Group();
  const clawMat = trackMat(new THREE.MeshBasicMaterial({ color: 0xff2a3b, transparent: true, opacity: 0.92, side: THREE.DoubleSide }));
  const clawGeo = trackGeo(new THREE.BoxGeometry(0.065, 1.35, 0.03));
  for (let k = -1; k <= 1; k++) {
    const blade = new THREE.Mesh(clawGeo, clawMat);
    blade.position.set(k * 0.2, 0, 0);
    blade.rotation.z = -0.55;
    clawGroup.add(blade);
  }
  root.add(clawGroup);

  // 2. Cupid bow, 2 heart-arrows & pink heart-tether arc
  const goldMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xfbbf24, emissive: 0x92400e, emissiveIntensity: 0.45, metalness: 0.7, roughness: 0.25 }));
  const pinkGlowMat = trackMat(new THREE.MeshBasicMaterial({ color: 0xf472b6, transparent: true, opacity: 0.92 }));
  const bowGroup = new THREE.Group();
  const bowArc = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.42, 0.03, 6, 14, Math.PI)), goldMat);
  bowArc.rotation.z = -Math.PI / 2;
  const bowStr = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.008, 0.008, 0.84, 4)), pinkGlowMat);
  bowGroup.add(bowArc, bowStr);
  root.add(bowGroup);

  const arrowShaftGeo = trackGeo(new THREE.CylinderGeometry(0.018, 0.018, 0.72, 5));
  const heartTipGeo = trackGeo(new THREE.OctahedronGeometry(0.085, 0));
  const makeArrow = () => {
    const g = new THREE.Group();
    const shaft = new THREE.Mesh(arrowShaftGeo, goldMat);
    const tip = new THREE.Mesh(heartTipGeo, pinkGlowMat);
    tip.position.y = 0.38;
    g.add(shaft, tip);
    root.add(g);
    return g;
  };
  const cupidArrows = [makeArrow(), makeArrow()];
  const tetherGroup = new THREE.Group();
  const tetherBeads: THREE.Mesh[] = [];
  for (let i = 0; i < 10; i++) {
    const b = new THREE.Mesh(heartTipGeo, pinkGlowMat);
    tetherGroup.add(b);
    tetherBeads.push(b);
  }
  root.add(tetherGroup);

  // 3. Bodyguard steel-gold kite shield + translucent cyan Icosahedron Shield Dome
  const shieldSteelMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.75, roughness: 0.28, flatShading: true }));
  const kiteShield = new THREE.Group();
  const shieldBody = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.32, 0.1, 0.62, 4)), shieldSteelMat);
  shieldBody.scale.set(1.15, 1, 0.24);
  const shieldRim = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.1, 0.56, 0.1)), goldMat);
  kiteShield.add(shieldBody, shieldRim);
  root.add(kiteShield);

  const shieldDomeMat = trackMat(new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.34, wireframe: false, side: THREE.DoubleSide, depthWrite: false }));
  const shieldDome = new THREE.Mesh(trackGeo(new THREE.IcosahedronGeometry(0.95, 1)), shieldDomeMat);
  root.add(shieldDome);

  // 4. Seer Crystal Orb + Mystic Scan Beam
  const orbMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xa855f7, emissive: 0x9333ea, emissiveIntensity: 1.6, roughness: 0.12, metalness: 0.15 }));
  const crystalOrb = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.24, 12, 12)), orbMat);
  root.add(crystalOrb);

  const beamMat = trackMat(new THREE.MeshBasicMaterial({ color: 0xc084fc, transparent: true, opacity: 0.55, depthWrite: false }));
  const scanBeam = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.05, 0.14, 1.0, 8, 1, true)), beamMat);
  root.add(scanBeam);

  // 5. Witch Heal Flask + Rising Sparkles
  const healMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x059669, emissiveIntensity: 1.4, roughness: 0.2 }));
  const healFlask = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.16, 1)), healMat);
  root.add(healFlask);
  const sparkleMat = trackMat(new THREE.MeshBasicMaterial({ color: 0x6ee7b7, transparent: true, opacity: 0.9 }));
  const sparkleGeo = trackGeo(new THREE.OctahedronGeometry(0.07, 0));
  const healSparkles: THREE.Mesh[] = [];
  for (let i = 0; i < 8; i++) {
    const sp = new THREE.Mesh(sparkleGeo, sparkleMat);
    root.add(sp);
    healSparkles.push(sp);
  }

  // 6. Witch Poison Vial + Shards/Mist
  const poisonVialMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x7c3aed, emissive: 0x22c55e, emissiveIntensity: 0.9, roughness: 0.18 }));
  const poisonVial = new THREE.Mesh(trackGeo(new THREE.DodecahedronGeometry(0.15, 0)), poisonVialMat);
  root.add(poisonVial);
  const poisonMistMat = trackMat(new THREE.MeshBasicMaterial({ color: 0x84cc16, transparent: true, opacity: 0.68, depthWrite: false }));
  const poisonShardMat = trackMat(new THREE.MeshBasicMaterial({ color: 0xa855f7, transparent: true, opacity: 0.85 }));
  const poisonPuffs: THREE.Mesh[] = [];
  for (let i = 0; i < 10; i++) {
    const m = new THREE.Mesh(trackGeo(new THREE.DodecahedronGeometry(i < 5 ? 0.06 : 0.19, 0)), i < 5 ? poisonShardMat : poisonMistMat);
    root.add(m);
    poisonPuffs.push(m);
  }

  // 7. Doppelganger Phantom Mirror + Clone Motes
  const mirrorGroup = new THREE.Group();
  const mirrorFrame = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.38, 0.045, 6, 8)), shieldSteelMat);
  const mirrorGlass = new THREE.Mesh(
    trackGeo(new THREE.CircleGeometry(0.35, 8)),
    trackMat(new THREE.MeshBasicMaterial({ color: 0xc084fc, transparent: true, opacity: 0.7, side: THREE.DoubleSide }))
  );
  mirrorGroup.add(mirrorFrame, mirrorGlass);
  root.add(mirrorGroup);
  const cloneMoteMat = trackMat(new THREE.MeshBasicMaterial({ color: 0x67e8f9, transparent: true, opacity: 0.88 }));
  const cloneMotes: THREE.Mesh[] = [];
  for (let i = 0; i < 10; i++) {
    const cm = new THREE.Mesh(sparkleGeo, cloneMoteMat);
    root.add(cm);
    cloneMotes.push(cm);
  }

  // 8. Hunter Brass Bullet Streak
  const bulletMat = trackMat(new THREE.MeshBasicMaterial({ color: 0xfde047, transparent: true, opacity: 0.95 }));
  const bulletStreak = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.025, 0.025, 0.85, 5)), bulletMat);
  root.add(bulletStreak);

  const hideAllFx = () => {
    root.visible = false;
    fxLight.intensity = 0;
    clawGroup.visible = false;
    bowGroup.visible = false;
    cupidArrows[0].visible = false;
    cupidArrows[1].visible = false;
    tetherGroup.visible = false;
    kiteShield.visible = false;
    shieldDome.visible = false;
    crystalOrb.visible = false;
    scanBeam.visible = false;
    healFlask.visible = false;
    for (const s of healSparkles) s.visible = false;
    poisonVial.visible = false;
    for (const p of poisonPuffs) p.visible = false;
    mirrorGroup.visible = false;
    for (const c of cloneMotes) c.visible = false;
    bulletStreak.visible = false;
  };

  let activeEventId: string | null = null;
  let sceneTime = 0;
  let sfxFired = false;
  let flinchFiredPrimary = false;
  let flinchFiredSecondary = false;

  const clearOverrides = (seats: AgrouSeatVisual[]) => {
    for (let i = 0; i < seats.length; i++) {
      seats[i].shieldRing.scale.setScalar(1);
      if (seats[i].nightCutsceneOverride) {
        seats[i].nightCutsceneOverride = false;
        seats[i].torsoGroup.scale.set(1, 1, 1);
      }
    }
  };

  const hardResetSeats = (seats: AgrouSeatVisual[]) => {
    activeEventId = null;
    sceneTime = 0;
    sfxFired = false;
    flinchFiredPrimary = false;
    flinchFiredSecondary = false;
    hideAllFx();
    for (let i = 0; i < seats.length; i++) {
      const s = seats[i];
      s.currentPos.copy(s.homePos);
      s.group.position.copy(s.homePos);
      s.standFactor = 0;
      s.torsoGroup.scale.set(1, 1, 1);
      s.bodyGroup.rotation.set(0, 0, 0);
      s.torsoGroup.rotation.set(0, 0, 0);
      s.wolfEarsGroup.visible = false;
      s.shieldRing.scale.setScalar(1);
      s.musketSmoke.scale.setScalar(1);
      s.nightCutsceneOverride = false;
    }
  };

  const update: NightActionDirectorHandle['update'] = ({
    sceneEvent,
    seats,
    activePlayers,
    biomeKey,
    simDt,
    elapsed,
    onPlaySfx,
  }) => {
    if (!sceneEvent) {
      if (activeEventId !== null) {
        activeEventId = null;
        clearOverrides(seats);
        hideAllFx();
      }
      return;
    }

    if (sceneEvent.id !== activeEventId) {
      clearOverrides(seats);
      hideAllFx();
      activeEventId = sceneEvent.id;
      sceneTime = 0;
      sfxFired = false;
      flinchFiredPrimary = false;
      flinchFiredSecondary = false;
    }

    const totalDur = Math.max(2.15, (sceneEvent.durationMs ?? 2150) / 1000);
    sceneTime += simDt;
    if (sceneTime >= totalDur) {
      clearOverrides(seats);
      hideAllFx();
      return;
    }

    // Resolve actors and targets
    const actorSeats: AgrouSeatVisual[] = [];
    for (let i = 0; i < sceneEvent.actorIds.length; i++) {
      const idx = activePlayers.findIndex((p) => p.id === sceneEvent.actorIds[i]);
      if (idx !== -1 && seats[idx]) actorSeats.push(seats[idx]);
    }
    if (actorSeats.length === 0) {
      hideAllFx();
      return;
    }

    const pIdx = sceneEvent.primaryTargetId
      ? activePlayers.findIndex((p) => p.id === sceneEvent.primaryTargetId)
      : -1;
    const sIdx = sceneEvent.secondaryTargetId
      ? activePlayers.findIndex((p) => p.id === sceneEvent.secondaryTargetId)
      : -1;
    const primarySeat = pIdx !== -1 ? seats[pIdx] : null;
    const secondarySeat = sIdx !== -1 ? seats[sIdx] : null;
    const leadActor = actorSeats[0];

    hideAllFx();
    root.visible = true;

    const u1 = Math.min(1, sceneTime / 0.55); // 0..0.55s telegraph/approach
    const u2 = Math.max(0, Math.min(1, (sceneTime - 0.55) / 1.0)); // 0.55..1.55s cast/strike
    const u3 = Math.max(0, Math.min(1, (sceneTime - 1.55) / Math.max(0.45, totalDur - 1.55))); // 1.55..2.15s return

    if (!sfxFired && sceneTime >= 0.55) {
      sfxFired = true;
      const focusPos = primarySeat ? primarySeat.homePos : leadActor.homePos;
      onPlaySfx?.(sceneEvent.kind, { x: focusPos.x, y: focusPos.y + 1.2, z: focusPos.z });
    }

    const triggerFlinch = (victim: AgrouSeatVisual, attackerPos: THREE.Vector3) => {
      const dx = victim.homePos.x - attackerPos.x;
      const dz = victim.homePos.z - attackerPos.z;
      const len = Math.hypot(dx, dz) || 1;
      victim.hitRecoilX = dx / len;
      victim.hitRecoilZ = dz / len;
      victim.hitRecoilTimer = 0.28;
      victim.wobbleTimer = 0.65;
    };

    const setActorWorldPos = (actor: AgrouSeatVisual, x: number, z: number, sf: number, speedRatio: number) => {
      const gy = sampleTerrainHeight(x, z, biomeKey);
      actor.currentPos.set(x, gy, z);
      actor.group.position.set(x, gy, z);
      actor.standFactor = sf;
      actor.walkPhase += speedRatio > 0.05 ? simDt * 12.5 : 0;
      applyAdventurerBodyPose(actor, {
        standFactor: sf,
        walkPhase: actor.walkPhase,
        moveSpeedRatio: speedRatio,
        crouchBlend: 0,
        jumpHeight: 0,
      });
    };

    const kind = sceneEvent.kind;

    if (kind === 'werewolf' && primarySeat) {
      const hasFrenzy = Boolean(secondarySeat);
      for (let a = 0; a < actorSeats.length; a++) {
        const wolf = actorSeats[a];
        wolf.nightCutsceneOverride = true;
        const morphT = u3 > 0 ? 1 - u3 : Math.min(1, u1 * 1.4);
        wolf.wolfEarsGroup.visible = morphT > 0.15;
        wolf.eyeLeftMat.color.setHex(0xff2222);
        wolf.eyeRightMat.color.setHex(0xff2222);
        wolf.torsoGroup.scale.set(
          1 + 0.22 * morphT,
          1 + 0.14 * morphT,
          1 + 0.22 * morphT
        );

        // Spread pack slightly around victim
        const offsetDist = 1.3 + a * 0.28;
        positionStopBeforeTarget(wolf.homePos, primarySeat.homePos, offsetDist, _vA);
        let activeTarget = primarySeat;
        let moveRatio = 0;

        if (sceneTime < 0.55) {
          stepAroundCampfire(wolf.homePos, _vA, u1 * u1, _vCur, 2.2);
          moveRatio = 1.45;
          setActorWorldPos(wolf, _vCur.x, _vCur.z, Math.min(1, u1 * 1.6), moveRatio);
          aimSeatAtWorld(wolf, primarySeat.homePos.x, primarySeat.homePos.z);
          wolf.leftArm.rotation.set(-2.3 * u1, 0, 0.35);
          wolf.rightArm.rotation.set(-2.45 * u1, 0, -0.35);
        } else if (sceneTime < 1.55) {
          if (hasFrenzy && secondarySeat && u2 >= 0.5) {
            activeTarget = secondarySeat;
            const fT = (u2 - 0.5) * 2;
            positionStopBeforeTarget(_vA, secondarySeat.homePos, offsetDist, _vB);
            stepAroundCampfire(_vA, _vB, Math.min(1, fT * 1.65), _vCur, 2.2);
            moveRatio = fT < 0.6 ? 1.55 : 0;
            setActorWorldPos(wolf, _vCur.x, _vCur.z, 1, moveRatio);
            aimSeatAtWorld(wolf, secondarySeat.homePos.x, secondarySeat.homePos.z);
            const slash = Math.sin(Math.min(1, Math.max(0, (fT - 0.35) / 0.65)) * Math.PI);
            wolf.rightArm.rotation.set(-2.5 + slash * 2.0, 0, -0.4);
            wolf.leftArm.rotation.set(-2.35 + slash * 1.9, 0, 0.4);
            if (a === 0 && !flinchFiredSecondary && fT > 0.52) {
              flinchFiredSecondary = true;
              triggerFlinch(secondarySeat, _vCur);
            }
          } else {
            setActorWorldPos(wolf, _vA.x, _vA.z, 1, 0);
            aimSeatAtWorld(wolf, primarySeat.homePos.x, primarySeat.homePos.z);
            const slashU = hasFrenzy ? u2 * 2 : u2;
            const slash = Math.sin(Math.min(1, slashU * 1.35) * Math.PI);
            wolf.rightArm.rotation.set(-2.55 + slash * 2.1, 0, -0.38);
            wolf.leftArm.rotation.set(-2.4 + slash * 1.95, 0, 0.38);
            if (a === 0 && !flinchFiredPrimary && slashU > 0.25) {
              flinchFiredPrimary = true;
              triggerFlinch(primarySeat, _vA);
            }
          }
          if (a === 0) {
            clawGroup.visible = true;
            clawGroup.position.set(activeTarget.homePos.x, activeTarget.homePos.y + 1.15, activeTarget.homePos.z);
            clawGroup.lookAt(wolf.currentPos.x, activeTarget.homePos.y + 1.15, wolf.currentPos.z);
            const cPulse = 0.6 + Math.sin(u2 * Math.PI * (hasFrenzy ? 2 : 1)) * 0.55;
            clawGroup.scale.set(1.1, Math.max(0.2, cPulse), 1);
            clawMat.opacity = 0.9 * (1 - u2 * 0.45);
            fxLight.color.setHex(0xff2233);
            fxLight.position.set(activeTarget.homePos.x, activeTarget.homePos.y + 1.8, activeTarget.homePos.z);
            fxLight.intensity = 10 * Math.sin(u2 * Math.PI);
          }
        } else {
          const fromBack = hasFrenzy && secondarySeat
            ? (positionStopBeforeTarget(_vA, secondarySeat.homePos, offsetDist, _vB), _vB)
            : _vA;
          stepAroundCampfire(fromBack, wolf.homePos, u3, _vCur, 2.2);
          setActorWorldPos(wolf, _vCur.x, _vCur.z, 1 - u3, u3 < 0.88 ? 1.25 : 0);
          if (u3 < 0.85) aimSeatAtWorld(wolf, wolf.homePos.x, wolf.homePos.z);
          else wolf.bodyGroup.rotation.y = THREE.MathUtils.lerp(wolf.bodyGroup.rotation.y, 0, u3);
        }
      }
      return;
    }

    if (kind === 'cupid' && primarySeat) {
      leadActor.nightCutsceneOverride = true;
      const target2 = secondarySeat || primarySeat;
      aimSeatAtWorld(leadActor, (primarySeat.homePos.x + target2.homePos.x) * 0.5, (primarySeat.homePos.z + target2.homePos.z) * 0.5);
      leadActor.haloMat.color.setHex(0xf472b6);
      leadActor.haloMat.opacity = 0.85;
      leadActor.leftArm.rotation.set(-1.55, 0, 0.12);
      leadActor.rightArm.rotation.set(-1.55, 0, u1 < 1 ? -0.45 * u1 : -0.1);

      // Position golden bow in front of Cupid
      const fwdYaw = leadActor.group.rotation.y + leadActor.bodyGroup.rotation.y;
      bowGroup.visible = u3 < 0.85;
      bowGroup.position.set(
        leadActor.currentPos.x + Math.sin(fwdYaw) * 0.58,
        leadActor.currentPos.y + 1.35,
        leadActor.currentPos.z + Math.cos(fwdYaw) * 0.58
      );
      bowGroup.rotation.set(0, fwdYaw + Math.PI / 2, 0);

      fxLight.color.setHex(0xf472b6);
      fxLight.position.set(bowGroup.position.x, bowGroup.position.y + 0.4, bowGroup.position.z);
      fxLight.intensity = 7.5 * (1 - u3);

      if (sceneTime >= 0.55) {
        const targets = secondarySeat ? [primarySeat, secondarySeat] : [primarySeat];
        const flightU = Math.min(1, u2 * 1.65);
        for (let idx = 0; idx < targets.length; idx++) {
          const tSeat = targets[idx];
          const arrow = cupidArrows[idx];
          arrow.visible = flightU < 0.98;
          if (arrow.visible) {
            _vA.set(bowGroup.position.x, bowGroup.position.y, bowGroup.position.z);
            _vB.set(tSeat.homePos.x, tSeat.homePos.y + 1.25, tSeat.homePos.z);
            _vCur.lerpVectors(_vA, _vB, flightU);
            _vCur.y += Math.sin(flightU * Math.PI) * 2.1;
            arrow.position.copy(_vCur);
            // Tangent direction for arrow alignment
            const nextU = Math.min(1, flightU + 0.05);
            _vDir.lerpVectors(_vA, _vB, nextU);
            _vDir.y += Math.sin(nextU * Math.PI) * 2.1;
            _vDir.sub(_vCur).normalize();
            _quat.setFromUnitVectors(_vUp, _vDir);
            arrow.quaternion.copy(_quat);
          }
        }
        if (secondarySeat && flightU > 0.55) {
          tetherGroup.visible = true;
          const reveal = Math.min(1, (flightU - 0.55) / 0.45) * (1 - u3 * 0.85);
          for (let b = 0; b < tetherBeads.length; b++) {
            const frac = (b + 0.5) / tetherBeads.length;
            const bx = THREE.MathUtils.lerp(primarySeat.homePos.x, secondarySeat.homePos.x, frac);
            const bz = THREE.MathUtils.lerp(primarySeat.homePos.z, secondarySeat.homePos.z, frac);
            const by = 1.35 + Math.sin(frac * Math.PI) * 2.15 + Math.sin(elapsed * 5 + b) * 0.08;
            tetherBeads[b].position.set(bx, by, bz);
            tetherBeads[b].scale.setScalar(Math.max(0.01, reveal * (0.9 + Math.sin(elapsed * 7 + b) * 0.25)));
            tetherBeads[b].rotation.y = elapsed * 3 + b;
          }
        }
      }
      return;
    }

    if (kind === 'bodyguard' && primarySeat) {
      leadActor.nightCutsceneOverride = true;
      const isSelf = leadActor === primarySeat;
      if (isSelf) {
        _vA.copy(leadActor.homePos);
      } else {
        positionStopBeforeTarget(leadActor.homePos, primarySeat.homePos, 1.45, _vA);
      }

      if (sceneTime < 0.55) {
        if (!isSelf) {
          stepAroundCampfire(leadActor.homePos, _vA, u1, _vCur, 2.2);
          setActorWorldPos(leadActor, _vCur.x, _vCur.z, Math.min(1, u1 * 1.5), 1.15);
          aimSeatAtWorld(leadActor, primarySeat.homePos.x, primarySeat.homePos.z);
        } else {
          setActorWorldPos(leadActor, leadActor.homePos.x, leadActor.homePos.z, Math.min(1, u1 * 1.4), 0);
        }
        leadActor.leftArm.rotation.set(-2.1 * u1, 0, 0.22);
        leadActor.rightArm.rotation.set(-0.6, 0, -0.2);
      } else if (sceneTime < 1.55) {
        setActorWorldPos(leadActor, _vA.x, _vA.z, 1, 0);
        if (!isSelf) aimSeatAtWorld(leadActor, primarySeat.homePos.x, primarySeat.homePos.z);
        const slam = Math.min(1, u2 * 4);
        leadActor.leftArm.rotation.set(THREE.MathUtils.lerp(-2.1, -0.85, slam), 0, 0.12);
        shieldDome.visible = true;
        shieldDome.position.set(primarySeat.homePos.x, primarySeat.homePos.y + 0.92, primarySeat.homePos.z);
        shieldDome.scale.setScalar(0.35 + Math.sin(Math.min(1, u2 * 1.5) * Math.PI * 0.5) * 0.72);
        shieldDome.rotation.y = elapsed * 1.2;
        shieldDomeMat.opacity = 0.36 * (1 - u2 * 0.4);
        primarySeat.shieldRing.visible = true;
        primarySeat.shieldRing.scale.setScalar(1 + Math.sin(elapsed * 10) * 0.1);
        fxLight.color.setHex(0x38bdf8);
        fxLight.position.set(primarySeat.homePos.x, primarySeat.homePos.y + 1.8, primarySeat.homePos.z);
        fxLight.intensity = 9.5 * (1 - u2 * 0.4);
      } else {
        if (!isSelf) {
          stepAroundCampfire(_vA, leadActor.homePos, u3, _vCur, 2.2);
          setActorWorldPos(leadActor, _vCur.x, _vCur.z, 1 - u3, u3 < 0.88 ? 1.1 : 0);
        } else {
          setActorWorldPos(leadActor, leadActor.homePos.x, leadActor.homePos.z, 1 - u3, 0);
        }
        leadActor.bodyGroup.rotation.y = THREE.MathUtils.lerp(leadActor.bodyGroup.rotation.y, 0, u3);
        primarySeat.shieldRing.scale.setScalar(1);
      }

      const fwdYaw = leadActor.group.rotation.y + leadActor.bodyGroup.rotation.y;
      kiteShield.visible = u3 < 0.85;
      kiteShield.position.set(
        leadActor.currentPos.x + Math.sin(fwdYaw) * 0.55,
        leadActor.currentPos.y + (sceneTime < 0.55 ? 1.55 : 1.05),
        leadActor.currentPos.z + Math.cos(fwdYaw) * 0.55
      );
      kiteShield.rotation.set(0, fwdYaw, 0);
      return;
    }

    if (kind === 'seer' && primarySeat) {
      leadActor.nightCutsceneOverride = true;
      aimSeatAtWorld(leadActor, primarySeat.homePos.x, primarySeat.homePos.z);
      const lift = u3 > 0 ? 1 - u3 : Math.min(1, u1 * 1.3);
      leadActor.leftArm.rotation.set(-1.55 * lift, 0, -0.35 * lift);
      leadActor.rightArm.rotation.set(-1.55 * lift, 0, 0.35 * lift);

      const fwdYaw = leadActor.group.rotation.y + leadActor.bodyGroup.rotation.y;
      crystalOrb.visible = lift > 0.05;
      crystalOrb.position.set(
        leadActor.currentPos.x + Math.sin(fwdYaw) * 0.62,
        leadActor.currentPos.y + 1.32 + Math.sin(elapsed * 5) * 0.06,
        leadActor.currentPos.z + Math.cos(fwdYaw) * 0.62
      );
      crystalOrb.scale.setScalar(lift * (1 + (u2 > 0.45 ? Math.sin(elapsed * 14) * 0.14 : 0)));

      const revealColor =
        u2 > 0.45 && sceneEvent.seerIsWolf === true
          ? 0xef4444
          : u2 > 0.45 && sceneEvent.seerIsWolf === false
          ? 0x10b981
          : 0xa855f7;
      orbMat.color.setHex(revealColor);
      orbMat.emissive.setHex(revealColor);
      fxLight.color.setHex(revealColor);
      fxLight.position.copy(crystalOrb.position);
      fxLight.intensity = 8.5 * lift;

      if (sceneTime >= 0.55 && sceneTime < 1.55) {
        scanBeam.visible = true;
        _vA.copy(crystalOrb.position);
        _vB.set(primarySeat.homePos.x, primarySeat.homePos.y + 1.2, primarySeat.homePos.z);
        _vDir.subVectors(_vB, _vA);
        const dist = _vDir.length();
        scanBeam.position.addVectors(_vA, _vB).multiplyScalar(0.5);
        scanBeam.scale.set(1, dist, 1);
        _vDir.normalize();
        _quat.setFromUnitVectors(_vUp, _vDir);
        scanBeam.quaternion.copy(_quat);
        beamMat.color.setHex(revealColor);
        beamMat.opacity = 0.58 * Math.sin(u2 * Math.PI);
      }
      return;
    }

    if ((kind === 'witch_heal' || kind === 'witch_poison') && primarySeat) {
      leadActor.nightCutsceneOverride = true;
      const isHeal = kind === 'witch_heal';
      aimSeatAtWorld(leadActor, primarySeat.homePos.x, primarySeat.homePos.z);
      leadActor.rightArm.rotation.set(sceneTime < 0.55 ? -2.4 * u1 : -0.55, 0, -0.2);
      leadActor.leftArm.rotation.set(-0.9, 0, 0.25);

      const flyU = sceneTime < 0.55 ? 0 : Math.min(1, u2 / 0.42);
      const burstU = sceneTime < 0.97 ? 0 : Math.min(1, (sceneTime - 0.97) / 0.95);
      _vA.set(leadActor.homePos.x, leadActor.homePos.y + 1.45, leadActor.homePos.z);
      _vB.set(primarySeat.homePos.x, primarySeat.homePos.y + 1.15, primarySeat.homePos.z);

      if (sceneTime >= 0.55 && flyU < 1) {
        const bottle = isHeal ? healFlask : poisonVial;
        bottle.visible = true;
        _vCur.lerpVectors(_vA, _vB, flyU);
        _vCur.y += Math.sin(flyU * Math.PI) * 2.4;
        bottle.position.copy(_vCur);
        bottle.rotation.set(elapsed * 8, elapsed * 6, 0);
      }

      if (burstU > 0) {
        fxLight.color.setHex(isHeal ? 0x10b981 : 0x84cc16);
        fxLight.position.set(primarySeat.homePos.x, primarySeat.homePos.y + 1.5, primarySeat.homePos.z);
        fxLight.intensity = 9.5 * (1 - burstU);

        if (isHeal) {
          for (let i = 0; i < healSparkles.length; i++) {
            const sp = healSparkles[i];
            sp.visible = true;
            const ang = (i / healSparkles.length) * Math.PI * 2 + elapsed * 3.2;
            const rad = 0.55 + Math.sin(burstU * Math.PI) * 0.25;
            sp.position.set(
              primarySeat.homePos.x + Math.cos(ang) * rad,
              primarySeat.homePos.y + 0.35 + burstU * 1.9 + (i % 3) * 0.22,
              primarySeat.homePos.z + Math.sin(ang) * rad
            );
            sp.scale.setScalar(Math.max(0.01, (1 - burstU) * 1.25));
          }
        } else {
          if (!flinchFiredPrimary) {
            flinchFiredPrimary = true;
            triggerFlinch(primarySeat, leadActor.homePos);
          }
          primarySeat.torsoGroup.rotation.x += 0.28 * (1 - burstU);
          for (let i = 0; i < poisonPuffs.length; i++) {
            const pf = poisonPuffs[i];
            pf.visible = true;
            const ang = (i / poisonPuffs.length) * Math.PI * 2 + elapsed * 2.4;
            const rad = i < 5 ? 0.35 + burstU * 1.15 : 0.42 + Math.sin(elapsed * 4 + i) * 0.18;
            pf.position.set(
              primarySeat.homePos.x + Math.cos(ang) * rad,
              primarySeat.homePos.y + (i < 5 ? Math.max(0.1, 1.1 - burstU * 1.1) : 0.55 + burstU * 1.25),
              primarySeat.homePos.z + Math.sin(ang) * rad
            );
            pf.scale.setScalar((1 - burstU * 0.75) * (i < 5 ? 1.1 : 1.0 + burstU * 0.6));
          }
        }
      }
      return;
    }

    if (kind === 'doppelganger' && primarySeat) {
      leadActor.nightCutsceneOverride = true;
      aimSeatAtWorld(leadActor, primarySeat.homePos.x, primarySeat.homePos.z);
      const lift = u3 > 0 ? 1 - u3 : Math.min(1, u1 * 1.3);
      leadActor.leftArm.rotation.set(-1.35 * lift, 0, -0.25);
      leadActor.rightArm.rotation.set(-1.35 * lift, 0, 0.25);

      const fwdYaw = leadActor.group.rotation.y + leadActor.bodyGroup.rotation.y;
      mirrorGroup.visible = lift > 0.05;
      mirrorGroup.position.set(
        leadActor.currentPos.x + Math.sin(fwdYaw) * 0.62,
        leadActor.currentPos.y + 1.32,
        leadActor.currentPos.z + Math.cos(fwdYaw) * 0.62
      );
      mirrorGroup.rotation.set(0, fwdYaw, 0);
      mirrorGroup.scale.setScalar(lift);

      fxLight.color.setHex(0xc084fc);
      fxLight.position.copy(mirrorGroup.position);
      fxLight.intensity = 7.5 * lift;

      if (sceneTime >= 0.55 && sceneTime < 1.65) {
        _vA.set(primarySeat.homePos.x, primarySeat.homePos.y + 1.2, primarySeat.homePos.z);
        _vB.copy(mirrorGroup.position);
        for (let i = 0; i < cloneMotes.length; i++) {
          const cm = cloneMotes[i];
          cm.visible = true;
          const mU = ((u2 * 1.4 + i / cloneMotes.length) % 1);
          _vCur.lerpVectors(_vA, _vB, mU);
          _vCur.y += Math.sin(mU * Math.PI) * 1.4 + Math.cos(elapsed * 6 + i) * 0.14;
          cm.position.copy(_vCur);
          cm.scale.setScalar(Math.max(0.01, Math.sin(mU * Math.PI) * 1.25));
          cm.rotation.y = elapsed * 4 + i;
        }
      }
      return;
    }

    if (kind === 'hunter_shot' && primarySeat) {
      leadActor.nightCutsceneOverride = true;
      aimSeatAtWorld(leadActor, primarySeat.homePos.x, primarySeat.homePos.z);
      leadActor.musketGroup.visible = true;
      leadActor.rightArm.rotation.set(-1.45, 0, 0.15);
      leadActor.leftArm.rotation.set(-1.35, 0, -0.35);

      const fwdYaw = leadActor.group.rotation.y + leadActor.bodyGroup.rotation.y;
      const muzzleX = leadActor.currentPos.x + Math.sin(fwdYaw) * 1.25;
      const muzzleY = leadActor.currentPos.y + 1.18;
      const muzzleZ = leadActor.currentPos.z + Math.cos(fwdYaw) * 1.25;

      if (sceneTime >= 0.55) {
        const shotU = Math.min(1, (sceneTime - 0.55) / 0.24);
        // Hunter recoil kickback & expanding muzzle smoke
        const kick = Math.max(0, 1 - (sceneTime - 0.55) / 0.35);
        leadActor.torsoGroup.rotation.x -= kick * 0.38;
        leadActor.musketSmoke.scale.setScalar(1 + Math.min(1.8, (sceneTime - 0.55) * 2.4));

        fxLight.color.setHex(0xff8c1a);
        fxLight.position.set(muzzleX, muzzleY, muzzleZ);
        fxLight.intensity = kick * 18;

        if (shotU < 1) {
          bulletStreak.visible = true;
          _vA.set(muzzleX, muzzleY, muzzleZ);
          _vB.set(primarySeat.homePos.x, primarySeat.homePos.y + 1.15, primarySeat.homePos.z);
          _vCur.lerpVectors(_vA, _vB, shotU);
          bulletStreak.position.copy(_vCur);
          _vDir.subVectors(_vB, _vA).normalize();
          _quat.setFromUnitVectors(_vUp, _vDir);
          bulletStreak.quaternion.copy(_quat);
        } else {
          if (!flinchFiredPrimary) {
            flinchFiredPrimary = true;
            triggerFlinch(primarySeat, leadActor.homePos);
          }
        }
      }
    }
  };

  const dispose = () => {
    scene.remove(root);
    for (const g of geos) g.dispose();
    for (const m of mats) m.dispose();
  };

  return { update, hardResetSeats, dispose };
}
