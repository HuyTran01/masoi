import * as THREE from 'three';
import { AgrouEmoteId, AgrouHatId } from '../../game/agrouMechanics';

export interface AgrouSeatVisual {
  group: THREE.Group;
  seatAnchorGroup: THREE.Group;
  stoolGroup: THREE.Group;
  bodyGroup: THREE.Group;
  torsoGroup: THREE.Group;
  headGroup: THREE.Group;
  leftHipPivot: THREE.Group;
  leftKneePivot: THREE.Group;
  rightHipPivot: THREE.Group;
  rightKneePivot: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  pointGlowMesh: THREE.Mesh;
  musketGroup: THREE.Group;
  musketSmoke: THREE.Group;
  ghostGroup: THREE.Group;
  ghostTorsoGroup: THREE.Group;
  ghostTailGroup: THREE.Group;
  ghostLeftArm: THREE.Group;
  ghostRightArm: THREE.Group;
  ghostMotesGroup: THREE.Group;
  ghostCloakMat: THREE.MeshStandardMaterial;
  ghostEyeMat: THREE.MeshBasicMaterial;
  ghostWolfEarsGroup: THREE.Group;
  ghostHatVariants: Record<AgrouHatId, THREE.Group>;
  hitbox: THREE.Mesh;
  stoolHitbox: THREE.Mesh;
  haloMat: THREE.MeshBasicMaterial;
  lanternMat: THREE.MeshStandardMaterial;
  cloakMat: THREE.MeshStandardMaterial;
  eyeLeftMat: THREE.MeshBasicMaterial;
  eyeRightMat: THREE.MeshBasicMaterial;
  tombstoneGroup: THREE.Group;
  shieldRing: THREE.Mesh;
  loverHeart: THREE.Mesh;
  wolfEarsGroup: THREE.Group;
  angerAuraGroup: THREE.Group;
  happyAuraGroup: THREE.Group;
  mayorCrownGroup: THREE.Group;
  hatVariants: Record<AgrouHatId, THREE.Group>;
  koProgress: number;
  wobbleTimer: number;
  throwAnimTimer: number;
  reactionType: 'none' | 'angry' | 'happy_dance';
  reactionTimer: number;
  emoteType: AgrouEmoteId | null;
  emoteTimer: number;
  standFactor: number; // 0 = seated on wooden stool, 1 = standing upright
  walkPhase: number;
  yOffset: number;
  vy: number;
  isGrounded: boolean;
  crouchBlend: number;
  headLookYaw: number;
  headLookPitch: number;
  baseAngle: number;
  homePos: THREE.Vector3;
  currentPos: THREE.Vector3;
  ghostPos: THREE.Vector3;
  ghostVelocity: { x: number; z: number };
  ghostHoverHeight: number;
  ghostFacingYaw: number;
  ghostInitialized: boolean;
  ghostWanderTarget: { x: number; z: number };
  ghostWanderWaitTimer: number;
  worldPos: THREE.Vector3;
  playerId: string;
}

/**
 * Applies smooth seated <-> standing <-> walking/sprinting <-> crouching <-> jumping leg & body articulation.
 * Shared by both the live 3D village and the Avatar Locker standing 3D preview.
 */
export function applyAdventurerBodyPose(
  seat: Pick<
    AgrouSeatVisual,
    'bodyGroup' | 'torsoGroup' | 'leftHipPivot' | 'leftKneePivot' | 'rightHipPivot' | 'rightKneePivot'
  >,
  params: {
    standFactor: number; // 0 = seated on stool, 1 = standing upright
    walkPhase: number;
    moveSpeedRatio: number; // 0 = idle, 1 = walk, 1.5 = sprint
    crouchBlend: number; // 0 = upright, 1 = crouched
    jumpHeight: number;
    koProgress?: number;
  }
) {
  const sf = Math.max(0, Math.min(1, params.standFactor));
  const cb = Math.max(0, Math.min(1, params.crouchBlend)) * sf;
  const speedRatio = Math.max(0, Math.min(1.6, params.moveSpeedRatio)) * sf;
  const airborne = params.jumpHeight > 0.04 ? Math.min(1, params.jumpHeight / 0.45) * sf : 0;

  // Vertical hip height: seated on stool (0.48) -> standing grounded (0.74) -> crouched (0.50)
  const uprightY = THREE.MathUtils.lerp(0.48, 0.74, sf);
  const crouchedY = uprightY - cb * 0.24;
  const strideBounce = speedRatio > 0.05 && airborne < 0.1
    ? Math.abs(Math.sin(params.walkPhase)) * (0.045 * Math.min(1.3, speedRatio))
    : 0;
  seat.bodyGroup.position.y = crouchedY + strideBounce + params.jumpHeight;

  // Base leg angles from seated -> standing -> crouched
  const seatedHipX = -1.48;
  const seatedKneeX = 1.42;
  const standingHipX = -cb * 0.82;
  const standingKneeX = cb * 1.36;

  let baseHipX = THREE.MathUtils.lerp(seatedHipX, standingHipX, sf);
  let baseKneeX = THREE.MathUtils.lerp(seatedKneeX, standingKneeX, sf);

  // Airborne jump tuck
  if (airborne > 0.01) {
    baseHipX = THREE.MathUtils.lerp(baseHipX, -0.45, airborne);
    baseKneeX = THREE.MathUtils.lerp(baseKneeX, 0.82, airborne);
  }

  // Alternating walk/sprint stride cycle
  const strideAmp = speedRatio > 0.04 && airborne < 0.25 ? Math.min(0.88, 0.56 * speedRatio) : 0;
  const leftSwing = Math.sin(params.walkPhase) * strideAmp;
  const rightSwing = -leftSwing;

  const leftWalkKnee = strideAmp > 0.01 ? Math.max(0, -Math.sin(params.walkPhase - 0.5)) * (0.72 * Math.min(1.2, speedRatio)) : 0;
  const rightWalkKnee = strideAmp > 0.01 ? Math.max(0, Math.sin(params.walkPhase - 0.5)) * (0.72 * Math.min(1.2, speedRatio)) : 0;

  seat.leftHipPivot.rotation.x = baseHipX + leftSwing;
  seat.rightHipPivot.rotation.x = baseHipX + rightSwing;
  seat.leftKneePivot.rotation.x = Math.max(0, baseKneeX + leftWalkKnee);
  seat.rightKneePivot.rotation.x = Math.max(0, baseKneeX + rightWalkKnee);

  // Subtle outward splay only when seated
  const seatedSplay = (1 - sf) * 0.12;
  seat.leftHipPivot.rotation.y = -seatedSplay;
  seat.rightHipPivot.rotation.y = seatedSplay;

  // Forward stealth lean when crouching or sprinting
  const sprintLean = speedRatio > 1.1 ? (speedRatio - 1.0) * 0.22 : 0;
  seat.torsoGroup.rotation.x = cb * 0.28 + sprintLean;
}

const SKIN_TONES = [0xe8b08a, 0xd89b72, 0xf1c29b, 0xc6865e, 0xe0a67e, 0xa86f4c];
const HAIR_COLORS = [0x2a1d15, 0x4d311d, 0x1b191a, 0x8b5a2b, 0xc9964a, 0x6b2f1f];
const WAR_PAINT_COLORS = [0x2563eb, 0xd97706, 0x0d9488, 0xb91c1c];

function createSoftShadowTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(size / 2, size / 2, 4, size / 2, size / 2, size / 2);
    grad.addColorStop(0.0, 'rgba(15, 10, 6, 0.56)');
    grad.addColorStop(0.55, 'rgba(15, 10, 6, 0.28)');
    grad.addColorStop(1.0, 'rgba(15, 10, 6, 0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function buildAgrouAdventurerPool(
  scene: THREE.Scene,
  clickables: THREE.Object3D[],
  maxSeats: number,
  isSoftwareGl: boolean
): { seats: AgrouSeatVisual[]; dispose: () => void } {
  const disposableGeos: THREE.BufferGeometry[] = [];
  const disposableMats: THREE.Material[] = [];
  const shadowTex = createSoftShadowTexture();

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    disposableGeos.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    disposableMats.push(m);
    return m;
  };

  // Shared stylized low-poly materials for crisp Agrou adventurer look (Images 3 & 4!)
  const stoolWoodMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x4d3623, roughness: 0.92, flatShading: true })
  );
  const darkLeatherMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x2d221c, roughness: 0.85, flatShading: true })
  );
  const strapLeatherMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x5c3c24, roughness: 0.84, flatShading: true })
  );
  const bedrollMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x8f8a7f, roughness: 0.92, flatShading: true })
  );
  const steelArmorMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x67727e,
      roughness: 0.42,
      metalness: 0.56,
      flatShading: true,
    })
  );
  const brightSteelMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xaab4bf,
      roughness: 0.35,
      metalness: 0.65,
      flatShading: true,
    })
  );
  const goldAccentMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xe5a928,
      emissive: 0x5c3700,
      emissiveIntensity: 0.25,
      roughness: 0.32,
      metalness: 0.72,
      flatShading: true,
    })
  );
  const pantsMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x35312d, roughness: 0.9, flatShading: true })
  );
  const contactShadowMat = trackMat(
    new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
    })
  );
  const musketWoodMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x734222, roughness: 0.82, flatShading: true })
  );
  const musketSmokeMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xedf2f7,
      roughness: 1.0,
      transparent: true,
      opacity: 0.82,
      flatShading: true,
    })
  );

  // Shared Geometries
  const stoolTopGeo = trackGeo(new THREE.CylinderGeometry(0.32, 0.29, 0.085, 8));
  const stoolLegGeo = trackGeo(new THREE.CylinderGeometry(0.036, 0.028, 0.5, 5));
  const shadowDiscGeo = trackGeo(new THREE.PlaneGeometry(1.42, 1.42));
  const haloRingGeo = trackGeo(new THREE.RingGeometry(0.68, 0.8, 24));
  const thighGeo = trackGeo(new THREE.BoxGeometry(0.16, 0.38, 0.16));
  const shinGeo = trackGeo(new THREE.BoxGeometry(0.145, 0.36, 0.155));
  const bootGeo = trackGeo(new THREE.BoxGeometry(0.175, 0.15, 0.29));
  const kneePadGeo = trackGeo(new THREE.DodecahedronGeometry(0.102, 0));
  const torsoGeo = trackGeo(new THREE.CylinderGeometry(0.24, 0.21, 0.58, 7));
  const pauldronGeo = trackGeo(new THREE.DodecahedronGeometry(0.18, 0));
  const spikeGeo = trackGeo(new THREE.ConeGeometry(0.04, 0.11, 4));
  const headGeo = trackGeo(new THREE.DodecahedronGeometry(0.245, 0));
  const armUpperGeo = trackGeo(new THREE.BoxGeometry(0.125, 0.28, 0.125));
  const armForeGeo = trackGeo(new THREE.BoxGeometry(0.11, 0.26, 0.11));
  const handGeo = trackGeo(new THREE.BoxGeometry(0.1, 0.11, 0.11));
  const fingerGeo = trackGeo(new THREE.BoxGeometry(0.036, 0.14, 0.036));

  const seats: AgrouSeatVisual[] = [];

  for (let i = 0; i < maxSeats; i++) {
    const group = new THREE.Group();
    group.visible = false;

    const skinMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: SKIN_TONES[i % SKIN_TONES.length],
        roughness: 0.78,
        flatShading: true,
      })
    );
    const hairMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: HAIR_COLORS[i % HAIR_COLORS.length],
        roughness: 0.9,
        flatShading: true,
      })
    );
    const cloakMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xc83737,
        roughness: 0.82,
        flatShading: true,
      })
    );

    // 1. Soft Contact Shadow Disc on Sandy Clearing
    const shadowDisc = new THREE.Mesh(shadowDiscGeo, contactShadowMat);
    shadowDisc.rotation.x = -Math.PI / 2;
    shadowDisc.position.y = 0.016;
    group.add(shadowDisc);

    // 2. Selection / Role Halo Ring (subtle unless selected/hovered/mayor)
    const haloMat = trackMat(
      new THREE.MeshBasicMaterial({
        color: 0xd6bfa2,
        transparent: true,
        opacity: 0.2,
        side: THREE.DoubleSide,
      })
    );
    const haloRing = new THREE.Mesh(haloRingGeo, haloMat);
    haloRing.rotation.x = -Math.PI / 2;
    haloRing.position.y = 0.022;
    group.add(haloRing);

    // 3. Stationary Seat Anchor Group (4-Legged Wooden Camp Stool + Tombstone stay anchored at homePos!)
    const seatAnchorGroup = new THREE.Group();
    seatAnchorGroup.visible = false;
    const stoolGroup = new THREE.Group();
    const stoolTop = new THREE.Mesh(stoolTopGeo, stoolWoodMat);
    stoolTop.position.y = 0.45;
    stoolTop.castShadow = !isSoftwareGl;
    stoolTop.receiveShadow = true;
    stoolGroup.add(stoolTop);

    const legAngles = [Math.PI * 0.25, Math.PI * 0.75, Math.PI * 1.25, Math.PI * 1.75];
    for (const la of legAngles) {
      const leg = new THREE.Mesh(stoolLegGeo, stoolWoodMat);
      leg.position.set(Math.cos(la) * 0.21, 0.23, Math.sin(la) * 0.21);
      leg.rotation.z = Math.cos(la) * 0.22;
      leg.rotation.x = -Math.sin(la) * 0.22;
      leg.castShadow = !isSoftwareGl;
      stoolGroup.add(leg);
    }
    const stoolHitbox = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.54, 0.54, 0.9, 8)),
      trackMat(new THREE.MeshBasicMaterial({ visible: false }))
    );
    stoolHitbox.position.y = 0.45;
    stoolHitbox.userData = { stoolSeatIndex: i };
    stoolGroup.add(stoolHitbox);
    seatAnchorGroup.add(stoolGroup);
    scene.add(seatAnchorGroup);

    // 4. Articulated Adventurer Body Group (smoothly animates Seated <-> Standing <-> Walking <-> Crouching <-> Jumping!)
    const bodyGroup = new THREE.Group();
    bodyGroup.position.y = 0.48;
    group.add(bodyGroup);

    const pelvis = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.42, 0.16, 0.3)), pantsMat);
    pelvis.position.set(0, 0.08, 0.02);
    bodyGroup.add(pelvis);

    const buildArticulatedLeg = (side: -1 | 1) => {
      const hipPivot = new THREE.Group();
      hipPivot.position.set(side * 0.145, 0.04, 0.02);
      bodyGroup.add(hipPivot);

      const thigh = new THREE.Mesh(thighGeo, i % 3 === 0 ? cloakMat : pantsMat);
      thigh.position.set(0, -0.18, 0);
      thigh.castShadow = !isSoftwareGl;
      hipPivot.add(thigh);

      const knee = new THREE.Mesh(kneePadGeo, i % 2 === 0 ? steelArmorMat : strapLeatherMat);
      knee.position.set(0, -0.35, 0.065);
      hipPivot.add(knee);

      const kneePivot = new THREE.Group();
      kneePivot.position.set(0, -0.36, 0);
      hipPivot.add(kneePivot);

      const shin = new THREE.Mesh(shinGeo, darkLeatherMat);
      shin.position.set(0, -0.17, 0);
      shin.castShadow = !isSoftwareGl;
      kneePivot.add(shin);

      const boot = new THREE.Mesh(bootGeo, strapLeatherMat);
      boot.position.set(0, -0.34, 0.065);
      boot.castShadow = !isSoftwareGl;
      kneePivot.add(boot);

      return { hipPivot, kneePivot };
    };

    const leftLeg = buildArticulatedLeg(-1);
    const rightLeg = buildArticulatedLeg(1);
    const leftHipPivot = leftLeg.hipPivot;
    const leftKneePivot = leftLeg.kneePivot;
    const rightHipPivot = rightLeg.hipPivot;
    const rightKneePivot = rightLeg.kneePivot;

    // 5. Upper Torso Group (rotates slightly when gesturing/accusing/speaking)
    const torsoGroup = new THREE.Group();
    torsoGroup.position.set(0, 0.15, 0.0);
    bodyGroup.add(torsoGroup);

    // Armored Tunic / Leather Jerkin
    const torsoMesh = new THREE.Mesh(torsoGeo, cloakMat);
    torsoMesh.position.y = 0.3;
    torsoMesh.castShadow = !isSoftwareGl;
    torsoGroup.add(torsoMesh);

    // Leather Chest Plate / Cross-Strap + Waist Belt + Gold Buckle
    const chestPlate = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.38, 0.34, 0.28)),
      i % 2 === 0 ? strapLeatherMat : darkLeatherMat
    );
    chestPlate.position.set(0, 0.35, 0.06);
    torsoGroup.add(chestPlate);

    const belt = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.225, 0.23, 0.09, 7)), darkLeatherMat);
    belt.position.y = 0.08;
    torsoGroup.add(belt);

    const buckle = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.11, 0.095, 0.06)), goldAccentMat);
    buckle.position.set(0, 0.08, 0.22);
    torsoGroup.add(buckle);

    // High protective collar / scarf
    const collar = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.21, 0.24, 0.11, 7)),
      i % 3 === 0 ? steelArmorMat : strapLeatherMat
    );
    collar.position.y = 0.58;
    torsoGroup.add(collar);

    // 6. Traveler Backpack + Strapped Rolled Bedroll on Back (Iconic Agrou silhouette in ALL 4 images!)
    const backpackGroup = new THREE.Group();
    backpackGroup.position.set(0, 0.34, -0.25);
    torsoGroup.add(backpackGroup);

    const packMain = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.38, 0.42, 0.22)),
      i % 2 === 0 ? darkLeatherMat : strapLeatherMat
    );
    packMain.castShadow = !isSoftwareGl;
    backpackGroup.add(packMain);

    const packFlap = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.4, 0.12, 0.24)),
      strapLeatherMat
    );
    packFlap.position.set(0, 0.14, -0.01);
    backpackGroup.add(packFlap);

    // Horizontal rolled canvas bedroll strapped across top of backpack!
    const bedroll = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.115, 0.115, 0.48, 8)),
      bedrollMat
    );
    bedroll.rotation.z = Math.PI / 2;
    bedroll.position.set(0, 0.27, -0.01);
    backpackGroup.add(bedroll);

    // Two dark leather bedroll straps
    for (const sx of [-0.14, 0.14]) {
      const strap = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.122, 0.122, 0.045, 8)),
        darkLeatherMat
      );
      strap.rotation.z = Math.PI / 2;
      strap.position.set(sx, 0.27, -0.01);
      backpackGroup.add(strap);
    }

    // Small glowing belt lantern (keeps lanternMat API intact for night glow!)
    const lanternMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xfde047,
        emissive: 0xf59e0b,
        emissiveIntensity: 1.3,
        roughness: 0.4,
      })
    );
    const hipLantern = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.065, 0)), lanternMat);
    hipLantern.position.set(-0.24, 0.08, 0.14);
    torsoGroup.add(hipLantern);

    // 7. Layered Faceted Shoulder Pauldrons (with metallic studs/spikes on warrior seats — Image 3!)
    for (const side of [-1, 1]) {
      const pauldron = new THREE.Mesh(
        pauldronGeo,
        i % 2 === 0 ? steelArmorMat : i % 3 === 1 ? cloakMat : strapLeatherMat
      );
      pauldron.scale.set(1.05, 0.88, 1.15);
      pauldron.position.set(side * 0.31, 0.54, 0.0);
      torsoGroup.add(pauldron);

      if (i % 2 === 0) {
        for (let sp = 0; sp < 2; sp++) {
          const spike = new THREE.Mesh(spikeGeo, brightSteelMat);
          spike.position.set(side * (0.41 + sp * 0.02), 0.58 - sp * 0.07, sp === 0 ? 0.06 : -0.06);
          spike.rotation.z = -side * 1.1;
          torsoGroup.add(spike);
        }
      }
    }

    // 8. Chiseled Low-Poly Head, Hairstyle, Beard, Brows & Expressive Eyes (Image 3!)
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.81, 0.03);
    torsoGroup.add(headGroup);

    const headMesh = new THREE.Mesh(headGeo, skinMat);
    headMesh.scale.set(0.95, 1.08, 0.96);
    headMesh.castShadow = !isSoftwareGl;
    headGroup.add(headMesh);

    // Sculpted Nose
    const nose = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.055, 0.09, 0.07)), skinMat);
    nose.position.set(0, -0.01, 0.22);
    headGroup.add(nose);

    // Angled Brow Ridge
    const brow = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.28, 0.055, 0.07)), hairMat);
    brow.position.set(0, 0.075, 0.195);
    headGroup.add(brow);

    // Expressive Recessed Eyes
    const eyeLeftMat = trackMat(new THREE.MeshBasicMaterial({ color: 0x111827 }));
    const eyeRightMat = trackMat(new THREE.MeshBasicMaterial({ color: 0x111827 }));
    const eyeGeo = trackGeo(new THREE.BoxGeometry(0.055, 0.045, 0.04));
    const eyeL = new THREE.Mesh(eyeGeo, eyeLeftMat);
    eyeL.position.set(-0.085, 0.03, 0.21);
    headGroup.add(eyeL);
    const eyeR = new THREE.Mesh(eyeGeo, eyeRightMat);
    eyeR.position.set(0.085, 0.03, 0.21);
    headGroup.add(eyeR);

    // Optional Tribal Face Paint Cheek Stripes (exact detail from Image 3!)
    if (i % 3 === 0) {
      const paintMat = trackMat(
        new THREE.MeshBasicMaterial({ color: WAR_PAINT_COLORS[i % WAR_PAINT_COLORS.length] })
      );
      for (const sx of [-0.12, 0.12]) {
        const stripe = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.065, 0.025, 0.04)), paintMat);
        stripe.position.set(sx, -0.025, 0.21);
        headGroup.add(stripe);
      }
    }

    // Distinct Low-Poly Hairstyles (varied per seat)
    const hairStyle = i % 4;
    const hairCap = new THREE.Mesh(trackGeo(new THREE.DodecahedronGeometry(0.255, 0)), hairMat);
    hairCap.scale.set(1.02, 0.72, 1.04);
    hairCap.position.set(0, 0.12, -0.03);
    headGroup.add(hairCap);

    if (hairStyle === 0) {
      // High Warrior Ponytail (exact match to foreground adventurer in Image 3!)
      const bun = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.11, 0.28, 6)), hairMat);
      bun.position.set(0, 0.25, -0.17);
      bun.rotation.x = -0.85;
      headGroup.add(bun);
    } else if (hairStyle === 1) {
      // Side-swept adventurer hair + headband
      const headband = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.245, 0.245, 0.055, 8)),
        strapLeatherMat
      );
      headband.position.set(0, 0.13, 0);
      headGroup.add(headband);
    } else if (hairStyle === 2) {
      // Long hair back curtain
      const backHair = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.36, 0.34, 0.14)), hairMat);
      backHair.position.set(0, -0.04, -0.18);
      headGroup.add(backHair);
    }

    // Distinct Beards & Mustaches (varied per seat, matching Image 3!)
    if (i % 3 !== 2) {
      const mustache = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.2, 0.055, 0.08)), hairMat);
      mustache.position.set(0, -0.075, 0.2);
      headGroup.add(mustache);
      if (i % 3 === 0) {
        // Full chiseled adventurer beard
        const beard = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.24, 0.16, 0.16)), hairMat);
        beard.position.set(0, -0.15, 0.13);
        headGroup.add(beard);
      }
    }

    // 9. Articulated Left & Right Arms (with Extended Pointing Hand on Right Arm!)
    const leftArm = new THREE.Group();
    leftArm.position.set(-0.32, 0.49, 0.02);
    torsoGroup.add(leftArm);

    const lUpper = new THREE.Mesh(armUpperGeo, cloakMat);
    lUpper.position.set(0, -0.14, 0);
    leftArm.add(lUpper);
    const lFore = new THREE.Mesh(armForeGeo, strapLeatherMat);
    lFore.position.set(0, -0.35, 0.09);
    lFore.rotation.x = -0.65;
    leftArm.add(lFore);
    const lHand = new THREE.Mesh(handGeo, skinMat);
    lHand.position.set(0, -0.45, 0.2);
    leftArm.add(lHand);

    const rightArm = new THREE.Group();
    rightArm.position.set(0.32, 0.49, 0.02);
    torsoGroup.add(rightArm);

    const rUpper = new THREE.Mesh(armUpperGeo, cloakMat);
    rUpper.position.set(0, -0.14, 0);
    rightArm.add(rUpper);
    const rFore = new THREE.Mesh(armForeGeo, i % 2 === 0 ? goldAccentMat : strapLeatherMat);
    rFore.position.set(0, -0.36, 0.04);
    rFore.rotation.x = -0.18;
    rightArm.add(rFore);
    const rHand = new THREE.Mesh(handGeo, skinMat);
    rHand.position.set(0, -0.5, 0.07);
    rightArm.add(rHand);
    // Extended pointing finger aligned along -Y so raising arm (rotation.x = -PI/2) points straight forward!
    const pointFinger = new THREE.Mesh(fingerGeo, skinMat);
    pointFinger.position.set(0, -0.61, 0.07);
    rightArm.add(pointFinger);
    // Subtle pointing tip highlight visible ONLY when actively pointing to vote
    const pointGlowMesh = new THREE.Mesh(
      trackGeo(new THREE.ConeGeometry(0.055, 0.24, 5)),
      trackMat(
        new THREE.MeshBasicMaterial({
          color: 0xf59e0b,
          transparent: true,
          opacity: 0.85,
        })
      )
    );
    pointGlowMesh.rotation.x = Math.PI;
    pointGlowMesh.position.set(0, -0.82, 0.07);
    pointGlowMesh.visible = false;
    rightArm.add(pointGlowMesh);

    // 10. Low-Poly Wooden Flintlock Musket + White Muzzle Smoke Puff (Matches Image 4!)
    const musketGroup = new THREE.Group();
    musketGroup.position.set(0.18, 0.42, 0.34);
    musketGroup.visible = false;
    torsoGroup.add(musketGroup);

    const stock = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.08, 0.12, 0.85)), musketWoodMat);
    stock.position.set(0, 0, 0.22);
    musketGroup.add(stock);
    const barrel = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.032, 0.04, 1.05, 6)), brightSteelMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.06, 0.56);
    musketGroup.add(barrel);
    const brassBand = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.046, 0.046, 0.08, 6)), goldAccentMat);
    brassBand.rotation.x = Math.PI / 2;
    brassBand.position.set(0, 0.055, 0.82);
    musketGroup.add(brassBand);

    const musketSmoke = new THREE.Group();
    musketSmoke.position.set(0, 0.06, 1.18);
    for (let s = 0; s < 5; s++) {
      const puff = new THREE.Mesh(
        trackGeo(new THREE.DodecahedronGeometry(0.14 + (s % 2) * 0.06, 0)),
        musketSmokeMat
      );
      puff.position.set((s - 2) * 0.07, ((s % 3) - 1) * 0.06, s * 0.07);
      musketSmoke.add(puff);
    }
    musketGroup.add(musketSmoke);

    // 11. All 7 Customizable Agrou Locker Hats (mounted on headGroup!)
    const hatVariants: Record<AgrouHatId, THREE.Group> = {
      none: new THREE.Group(),
      witch: new THREE.Group(),
      knight: new THREE.Group(),
      straw: new THREE.Group(),
      antlers: new THREE.Group(),
      pirate: new THREE.Group(),
      crown: new THREE.Group(),
    };

    // Witch Hat
    const witchMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x321c4a, roughness: 0.88, flatShading: true }));
    const witchBrim = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.4, 0.42, 0.045, 9)), witchMat);
    witchBrim.position.y = 0.2;
    hatVariants.witch.add(witchBrim);
    const witchCone = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.24, 0.52, 7)), witchMat);
    witchCone.position.set(0, 0.44, -0.02);
    witchCone.rotation.x = -0.14;
    hatVariants.witch.add(witchCone);
    const witchBand = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.23, 0.25, 0.06, 8)), goldAccentMat);
    witchBand.position.y = 0.24;
    hatVariants.witch.add(witchBand);

    // Knight Helm
    const helmDome = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.24, 0.26, 0.34, 8)), steelArmorMat);
    helmDome.position.y = 0.14;
    hatVariants.knight.add(helmDome);
    const helmPlume = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.06, 0.18, 0.32)),
      trackMat(new THREE.MeshStandardMaterial({ color: 0xc83737, roughness: 0.8, flatShading: true }))
    );
    helmPlume.position.set(0, 0.35, -0.02);
    hatVariants.knight.add(helmPlume);

    // Straw Hat
    const strawMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xdcb45c, roughness: 0.94, flatShading: true }));
    const strawBrim = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.42, 0.46, 0.045, 10)), strawMat);
    strawBrim.position.y = 0.19;
    hatVariants.straw.add(strawBrim);
    const strawTop = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.21, 0.25, 0.18, 8)), strawMat);
    strawTop.position.y = 0.29;
    hatVariants.straw.add(strawTop);

    // Forest Antlers
    const antlerMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x6e4a2b, roughness: 0.9, flatShading: true }));
    for (const sx of [-1, 1]) {
      const mainAntler = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.025, 0.04, 0.42, 5)), antlerMat);
      mainAntler.position.set(sx * 0.2, 0.36, 0);
      mainAntler.rotation.z = -sx * 0.45;
      hatVariants.antlers.add(mainAntler);
      const tine = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.018, 0.026, 0.2, 5)), antlerMat);
      tine.position.set(sx * 0.28, 0.46, 0.04);
      tine.rotation.z = sx * 0.32;
      hatVariants.antlers.add(tine);
    }

    // Pirate Captain Tricorne
    const pirateMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x202226, roughness: 0.88, flatShading: true }));
    const tricorne = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.36, 0.28, 0.18, 3)), pirateMat);
    tricorne.position.y = 0.25;
    tricorne.rotation.y = Math.PI;
    hatVariants.pirate.add(tricorne);
    const skullPin = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.055, 0)), goldAccentMat);
    skullPin.position.set(0, 0.28, 0.2);
    hatVariants.pirate.add(skullPin);

    // Royal Crown Hat
    const crownRing = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.24, 0.22, 0.14, 7)), goldAccentMat);
    crownRing.position.y = 0.25;
    hatVariants.crown.add(crownRing);

    (Object.keys(hatVariants) as AgrouHatId[]).forEach((hk) => {
      hatVariants[hk].visible = false;
      headGroup.add(hatVariants[hk]);
    });

    // 12. Floating Golden Mayor Crown
    const mayorCrownGroup = new THREE.Group();
    mayorCrownGroup.position.y = 1.62;
    mayorCrownGroup.visible = false;
    const mBase = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.2, 0.17, 0.12, 6)), goldAccentMat);
    mayorCrownGroup.add(mBase);
    for (let pt = 0; pt < 6; pt++) {
      const a = (pt / 6) * Math.PI * 2;
      const tip = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.045, 0.13, 4)), goldAccentMat);
      tip.position.set(Math.cos(a) * 0.17, 0.11, Math.sin(a) * 0.17);
      mayorCrownGroup.add(tip);
    }
    bodyGroup.add(mayorCrownGroup);

    // 13. Werewolf Ears & Snout (shown only to Werewolves / Revealed!)
    const wolfEarsGroup = new THREE.Group();
    wolfEarsGroup.visible = false;
    const wolfFurMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x3b2b27, roughness: 0.9, flatShading: true }));
    for (const sx of [-0.15, 0.15]) {
      const ear = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.075, 0.24, 4)), wolfFurMat);
      ear.position.set(sx, 0.29, 0.0);
      ear.rotation.z = sx < 0 ? 0.25 : -0.25;
      wolfEarsGroup.add(ear);
    }
    const snout = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.14, 0.11, 0.22)), wolfFurMat);
    snout.position.set(0, -0.04, 0.27);
    wolfEarsGroup.add(snout);
    headGroup.add(wolfEarsGroup);

    // 14. Bodyguard Shield Ring, Cupid Lover Heart, Anger/Happy Auras & Tombstone
    const shieldRing = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(0.58, 0.035, 6, 20)),
      trackMat(new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.78 }))
    );
    shieldRing.position.y = 0.72;
    shieldRing.visible = false;
    bodyGroup.add(shieldRing);

    const loverHeart = new THREE.Mesh(
      trackGeo(new THREE.OctahedronGeometry(0.14, 0)),
      trackMat(new THREE.MeshBasicMaterial({ color: 0xf43f5e }))
    );
    loverHeart.position.set(0, 1.56, 0);
    loverHeart.visible = false;
    bodyGroup.add(loverHeart);

    const angerAuraGroup = new THREE.Group();
    angerAuraGroup.position.y = 1.48;
    angerAuraGroup.visible = false;
    const angerMat = trackMat(new THREE.MeshBasicMaterial({ color: 0xef4444 }));
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2;
      const spike = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.06, 0.22, 4)), angerMat);
      spike.position.set(Math.cos(a) * 0.28, 0, Math.sin(a) * 0.28);
      angerAuraGroup.add(spike);
    }
    bodyGroup.add(angerAuraGroup);

    const happyAuraGroup = new THREE.Group();
    happyAuraGroup.position.y = 1.52;
    happyAuraGroup.visible = false;
    const happyMat = trackMat(new THREE.MeshBasicMaterial({ color: 0xf472b6 }));
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2;
      const gem = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.08, 0)), happyMat);
      gem.position.set(Math.cos(a) * 0.3, 0, Math.sin(a) * 0.3);
      happyAuraGroup.add(gem);
    }
    bodyGroup.add(happyAuraGroup);

    // Tombstone (shown when eliminated)
    const tombstoneGroup = new THREE.Group();
    tombstoneGroup.visible = false;
    const tombMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.94, flatShading: true }));
    const slab = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.56, 0.85, 0.16)), tombMat);
    slab.position.set(0, 0.42, 0.18);
    tombstoneGroup.add(slab);
    const crossV = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.08, 0.38, 0.05)), darkLeatherMat);
    crossV.position.set(0, 0.5, 0.27);
    tombstoneGroup.add(crossV);
    const crossH = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.24, 0.08, 0.05)), darkLeatherMat);
    crossH.position.set(0, 0.57, 0.27);
    tombstoneGroup.add(crossH);
    seatAnchorGroup.add(tombstoneGroup);

    // 15. Personalized Spectral Ghost Adventurer (matches this exact deceased player's look, hair, beard, pauldrons, backpack, cloak tint & hat!)
    const ghostGroup = new THREE.Group();
    ghostGroup.visible = false;

    const baseSkinCol = new THREE.Color(SKIN_TONES[i % SKIN_TONES.length]);
    const baseHairCol = new THREE.Color(HAIR_COLORS[i % HAIR_COLORS.length]);
    const spectralCyan = new THREE.Color(0x7ee8fa);
    const spectralIce = new THREE.Color(0xcffafe);

    const ghostCloakMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: spectralCyan.clone(),
        emissive: 0x0e7490,
        emissiveIntensity: 0.34,
        roughness: 0.36,
        metalness: 0.14,
        transparent: true,
        opacity: 0.68,
        depthWrite: true,
        flatShading: true,
      })
    );
    const ghostSkinMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: baseSkinCol.clone().lerp(spectralIce, 0.44),
        emissive: 0x155e75,
        emissiveIntensity: 0.24,
        roughness: 0.42,
        transparent: true,
        opacity: 0.7,
        depthWrite: true,
        flatShading: true,
      })
    );
    const ghostHairMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: baseHairCol.clone().lerp(spectralCyan, 0.28),
        emissive: 0x0c4a6e,
        emissiveIntensity: 0.22,
        roughness: 0.52,
        transparent: true,
        opacity: 0.74,
        depthWrite: true,
        flatShading: true,
      })
    );
    const ghostArmorMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(i % 2 === 0 ? 0x67758a : 0x5c3e26).lerp(spectralCyan, 0.32),
        emissive: 0x0e7490,
        emissiveIntensity: 0.26,
        roughness: 0.32,
        metalness: 0.38,
        transparent: true,
        opacity: 0.66,
        depthWrite: true,
        flatShading: true,
      })
    );
    const ghostWispMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x67e8f9,
        emissive: 0x22d3ee,
        emissiveIntensity: 0.95,
        roughness: 0.25,
        transparent: true,
        opacity: 0.36,
        side: THREE.DoubleSide,
        depthWrite: false,
        flatShading: true,
      })
    );
    const ghostEyeMat = trackMat(
      new THREE.MeshBasicMaterial({
        color: 0xe0f2fe,
      })
    );

    // 15A. Ethereal Lower Spectral Tail & Ectoplasmic Aura (replaces boots so it unmistakably reads as a floating spirit!)
    const ghostTailGroup = new THREE.Group();
    ghostTailGroup.position.y = 0.52;
    ghostGroup.add(ghostTailGroup);

    const tailOuterCone = new THREE.Mesh(
      trackGeo(new THREE.ConeGeometry(0.32, 0.86, 7, 1, true)),
      ghostWispMat
    );
    tailOuterCone.rotation.x = Math.PI;
    tailOuterCone.position.y = -0.34;
    ghostTailGroup.add(tailOuterCone);

    const tailInnerCore = new THREE.Mesh(
      trackGeo(new THREE.ConeGeometry(0.19, 0.72, 6)),
      ghostCloakMat
    );
    tailInnerCore.rotation.x = Math.PI;
    tailInnerCore.position.y = -0.24;
    ghostTailGroup.add(tailInnerCore);

    // 3 Trailing Ethereal Wisps curving below the waist
    for (let w = 0; w < 3; w++) {
      const wa = (w / 3) * Math.PI * 2 + 0.4;
      const wisp = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.08, 0.52, 5)), ghostWispMat);
      wisp.rotation.x = Math.PI + 0.18;
      wisp.position.set(Math.cos(wa) * 0.14, -0.58 - (w % 2) * 0.1, Math.sin(wa) * 0.14);
      ghostTailGroup.add(wisp);
    }

    // Orbiting Spirit Motes Halo
    const ghostMotesGroup = new THREE.Group();
    ghostMotesGroup.position.y = 0.88;
    const ghostAuraRing = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(0.46, 0.018, 5, 18)),
      ghostWispMat
    );
    ghostAuraRing.rotation.x = Math.PI / 2;
    ghostAuraRing.position.y = -0.36;
    ghostMotesGroup.add(ghostAuraRing);
    for (let m = 0; m < 4; m++) {
      const ma = (m / 4) * Math.PI * 2;
      const mote = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.048, 0)), ghostWispMat);
      mote.position.set(Math.cos(ma) * 0.52, (m % 2 === 0 ? 0.12 : -0.18), Math.sin(ma) * 0.52);
      ghostMotesGroup.add(mote);
    }
    ghostGroup.add(ghostMotesGroup);

    // 15B. Spectral Upper Torso, Backpack, Bedroll & Pauldrons matching Seat i
    const ghostTorsoGroup = new THREE.Group();
    ghostTorsoGroup.position.set(0, 0.52, 0);
    ghostGroup.add(ghostTorsoGroup);

    const gTorso = new THREE.Mesh(torsoGeo, ghostCloakMat);
    gTorso.position.y = 0.3;
    ghostTorsoGroup.add(gTorso);

    const gChest = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.38, 0.34, 0.28)), ghostArmorMat);
    gChest.position.set(0, 0.35, 0.06);
    ghostTorsoGroup.add(gChest);

    const gBelt = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.225, 0.23, 0.09, 7)), ghostArmorMat);
    gBelt.position.y = 0.08;
    ghostTorsoGroup.add(gBelt);

    const gCollar = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.21, 0.24, 0.11, 7)), ghostArmorMat);
    gCollar.position.y = 0.58;
    ghostTorsoGroup.add(gCollar);

    // Matching Traveler Backpack & Bedroll (Ghost Version)
    const gPack = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.38, 0.42, 0.22)), ghostArmorMat);
    gPack.position.set(0, 0.34, -0.25);
    ghostTorsoGroup.add(gPack);
    const gBedroll = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.115, 0.115, 0.48, 8)), ghostWispMat);
    gBedroll.rotation.z = Math.PI / 2;
    gBedroll.position.set(0, 0.61, -0.26);
    ghostTorsoGroup.add(gBedroll);

    // Matching Shoulder Pauldrons & Spikes (if warrior seat i % 2 === 0)
    for (const side of [-1, 1]) {
      const gPauldron = new THREE.Mesh(pauldronGeo, i % 2 === 0 ? ghostArmorMat : ghostCloakMat);
      gPauldron.scale.set(1.05, 0.88, 1.15);
      gPauldron.position.set(side * 0.31, 0.54, 0.0);
      ghostTorsoGroup.add(gPauldron);
      if (i % 2 === 0) {
        for (let sp = 0; sp < 2; sp++) {
          const gSpike = new THREE.Mesh(spikeGeo, ghostArmorMat);
          gSpike.position.set(side * (0.41 + sp * 0.02), 0.58 - sp * 0.07, sp === 0 ? 0.06 : -0.06);
          gSpike.rotation.z = -side * 1.1;
          ghostTorsoGroup.add(gSpike);
        }
      }
    }

    // Floating Spectral Arms
    const ghostLeftArm = new THREE.Group();
    ghostLeftArm.position.set(-0.32, 0.49, 0.02);
    ghostTorsoGroup.add(ghostLeftArm);
    const glUpper = new THREE.Mesh(armUpperGeo, ghostCloakMat);
    glUpper.position.set(0, -0.14, 0);
    const glFore = new THREE.Mesh(armForeGeo, ghostArmorMat);
    glFore.position.set(0, -0.35, 0.09);
    glFore.rotation.x = -0.65;
    const glHand = new THREE.Mesh(handGeo, ghostSkinMat);
    glHand.position.set(0, -0.45, 0.2);
    ghostLeftArm.add(glUpper, glFore, glHand);

    const ghostRightArm = new THREE.Group();
    ghostRightArm.position.set(0.32, 0.49, 0.02);
    ghostTorsoGroup.add(ghostRightArm);
    const grUpper = new THREE.Mesh(armUpperGeo, ghostCloakMat);
    grUpper.position.set(0, -0.14, 0);
    const grFore = new THREE.Mesh(armForeGeo, ghostArmorMat);
    grFore.position.set(0, -0.35, 0.09);
    grFore.rotation.x = -0.65;
    const grHand = new THREE.Mesh(handGeo, ghostSkinMat);
    grHand.position.set(0, -0.45, 0.2);
    ghostRightArm.add(grUpper, grFore, grHand);

    // 15C. Spectral Head with Exact Same Hairstyle, Beard/Mustache, War Paint, Wolf Ears & Customizable Hats!
    const ghostHeadGroup = new THREE.Group();
    ghostHeadGroup.position.set(0, 0.81, 0.03);
    ghostTorsoGroup.add(ghostHeadGroup);

    const gHeadMesh = new THREE.Mesh(headGeo, ghostSkinMat);
    gHeadMesh.scale.set(0.95, 1.08, 0.96);
    ghostHeadGroup.add(gHeadMesh);

    const gNose = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.055, 0.09, 0.07)), ghostSkinMat);
    gNose.position.set(0, -0.01, 0.22);
    ghostHeadGroup.add(gNose);

    const gBrow = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.28, 0.055, 0.07)), ghostHairMat);
    gBrow.position.set(0, 0.075, 0.195);
    ghostHeadGroup.add(gBrow);

    const gEyeL = new THREE.Mesh(eyeGeo, ghostEyeMat);
    gEyeL.position.set(-0.085, 0.03, 0.212);
    const gEyeR = new THREE.Mesh(eyeGeo, ghostEyeMat);
    gEyeR.position.set(0.085, 0.03, 0.212);
    ghostHeadGroup.add(gEyeL, gEyeR);

    if (i % 3 === 0) {
      const gPaintMat = trackMat(
        new THREE.MeshBasicMaterial({
          color: new THREE.Color(WAR_PAINT_COLORS[i % WAR_PAINT_COLORS.length]).lerp(spectralCyan, 0.45),
          transparent: true,
          opacity: 0.85,
        })
      );
      for (const sx of [-0.12, 0.12]) {
        const gStripe = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.065, 0.025, 0.04)), gPaintMat);
        gStripe.position.set(sx, -0.025, 0.212);
        ghostHeadGroup.add(gStripe);
      }
    }

    const gHairCap = new THREE.Mesh(trackGeo(new THREE.DodecahedronGeometry(0.255, 0)), ghostHairMat);
    gHairCap.scale.set(1.02, 0.72, 1.04);
    gHairCap.position.set(0, 0.12, -0.03);
    ghostHeadGroup.add(gHairCap);

    if (hairStyle === 0) {
      const gBun = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.11, 0.28, 6)), ghostHairMat);
      gBun.position.set(0, 0.25, -0.17);
      gBun.rotation.x = -0.85;
      ghostHeadGroup.add(gBun);
    } else if (hairStyle === 1) {
      const gHeadband = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.245, 0.245, 0.055, 8)),
        ghostArmorMat
      );
      gHeadband.position.set(0, 0.13, 0);
      ghostHeadGroup.add(gHeadband);
    } else if (hairStyle === 2) {
      const gBackHair = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.36, 0.34, 0.14)), ghostHairMat);
      gBackHair.position.set(0, -0.04, -0.18);
      ghostHeadGroup.add(gBackHair);
    }

    if (i % 3 !== 2) {
      const gMustache = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.2, 0.055, 0.08)), ghostHairMat);
      gMustache.position.set(0, -0.075, 0.2);
      ghostHeadGroup.add(gMustache);
      if (i % 3 === 0) {
        const gBeard = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.24, 0.16, 0.16)), ghostHairMat);
        gBeard.position.set(0, -0.15, 0.13);
        ghostHeadGroup.add(gBeard);
      }
    }

    // Spectral Wolf Ears (for revealed dead Werewolves!)
    const ghostWolfEarsGroup = new THREE.Group();
    ghostWolfEarsGroup.visible = false;
    for (const sx of [-0.15, 0.15]) {
      const gEar = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.075, 0.24, 4)), ghostHairMat);
      gEar.position.set(sx, 0.29, 0.0);
      gEar.rotation.z = sx < 0 ? 0.25 : -0.25;
      ghostWolfEarsGroup.add(gEar);
    }
    const gSnout = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.14, 0.11, 0.22)), ghostHairMat);
    gSnout.position.set(0, -0.04, 0.27);
    ghostWolfEarsGroup.add(gSnout);
    ghostHeadGroup.add(ghostWolfEarsGroup);

    // All 7 Spectral Hat Variants (live-synced to deceased player's actual equipped hat with distinct spectral hues!)
    const makeGhostHatMat = (baseHex: number) => {
      const baseCol = new THREE.Color(baseHex);
      return trackMat(
        new THREE.MeshStandardMaterial({
          color: baseCol.clone().lerp(spectralCyan, 0.24),
          emissive: baseCol.clone().lerp(spectralCyan, 0.45),
          emissiveIntensity: 0.26,
          roughness: 0.42,
          transparent: true,
          opacity: 0.74,
          depthWrite: true,
          flatShading: true,
        })
      );
    };
    const ghostHatVariants: Record<AgrouHatId, THREE.Group> = {
      none: new THREE.Group(),
      witch: new THREE.Group(),
      knight: new THREE.Group(),
      straw: new THREE.Group(),
      antlers: new THREE.Group(),
      pirate: new THREE.Group(),
      crown: new THREE.Group(),
    };

    const gWitchMat = makeGhostHatMat(0x5b3588);
    const gGoldMat = makeGhostHatMat(0xf5c84c);
    const gWitchBrim = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.4, 0.42, 0.045, 9)), gWitchMat);
    gWitchBrim.position.y = 0.2;
    const gWitchCone = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.24, 0.52, 7)), gWitchMat);
    gWitchCone.position.set(0, 0.44, -0.02);
    gWitchCone.rotation.x = -0.14;
    const gWitchBand = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.23, 0.25, 0.06, 8)), gGoldMat);
    gWitchBand.position.y = 0.24;
    ghostHatVariants.witch.add(gWitchBrim, gWitchCone, gWitchBand);

    const gHelmDome = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.24, 0.26, 0.34, 8)), ghostArmorMat);
    gHelmDome.position.y = 0.14;
    const gHelmPlume = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.06, 0.18, 0.32)), makeGhostHatMat(0xe04f4f));
    gHelmPlume.position.set(0, 0.35, -0.02);
    ghostHatVariants.knight.add(gHelmDome, gHelmPlume);

    const gStrawMat = makeGhostHatMat(0xe6c36c);
    const gStrawBrim = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.42, 0.46, 0.045, 10)), gStrawMat);
    gStrawBrim.position.y = 0.19;
    const gStrawTop = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.21, 0.25, 0.18, 8)), gStrawMat);
    gStrawTop.position.y = 0.29;
    ghostHatVariants.straw.add(gStrawBrim, gStrawTop);

    const gAntlerMat = makeGhostHatMat(0x8a643d);
    for (const sx of [-1, 1]) {
      const gMainAntler = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.025, 0.04, 0.42, 5)), gAntlerMat);
      gMainAntler.position.set(sx * 0.2, 0.36, 0);
      gMainAntler.rotation.z = -sx * 0.45;
      const gTine = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.018, 0.026, 0.2, 5)), gAntlerMat);
      gTine.position.set(sx * 0.28, 0.46, 0.04);
      gTine.rotation.z = sx * 0.32;
      ghostHatVariants.antlers.add(gMainAntler, gTine);
    }

    const gPirateMat = makeGhostHatMat(0x374151);
    const gTricorne = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.36, 0.28, 0.18, 3)), gPirateMat);
    gTricorne.position.y = 0.25;
    gTricorne.rotation.y = Math.PI;
    const gSkullPin = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.055, 0)), gGoldMat);
    gSkullPin.position.set(0, 0.28, 0.2);
    ghostHatVariants.pirate.add(gTricorne, gSkullPin);

    const gCrownRing = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.24, 0.22, 0.14, 7)), gGoldMat);
    gCrownRing.position.y = 0.25;
    ghostHatVariants.crown.add(gCrownRing);

    (Object.keys(ghostHatVariants) as AgrouHatId[]).forEach((hk) => {
      ghostHatVariants[hk].visible = false;
      ghostHeadGroup.add(ghostHatVariants[hk]);
    });

    scene.add(ghostGroup);

    // 16. Raycast Hitbox
    const hitbox = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.56, 0.56, 1.85, 8)),
      trackMat(new THREE.MeshBasicMaterial({ visible: false }))
    );
    hitbox.position.y = 0.95;
    hitbox.userData = { seatIndex: i };
    group.add(hitbox);
    clickables.push(hitbox);

    scene.add(group);

    const seatVisual: AgrouSeatVisual = {
      group,
      seatAnchorGroup,
      stoolGroup,
      bodyGroup,
      torsoGroup,
      headGroup,
      leftHipPivot,
      leftKneePivot,
      rightHipPivot,
      rightKneePivot,
      leftArm,
      rightArm,
      pointGlowMesh,
      musketGroup,
      musketSmoke,
      ghostGroup,
      ghostTorsoGroup,
      ghostTailGroup,
      ghostLeftArm,
      ghostRightArm,
      ghostMotesGroup,
      ghostCloakMat,
      ghostEyeMat,
      ghostWolfEarsGroup,
      ghostHatVariants,
      hitbox,
      stoolHitbox,
      haloMat,
      lanternMat,
      cloakMat,
      eyeLeftMat,
      eyeRightMat,
      tombstoneGroup,
      shieldRing,
      loverHeart,
      wolfEarsGroup,
      angerAuraGroup,
      happyAuraGroup,
      mayorCrownGroup,
      hatVariants,
      koProgress: 0,
      wobbleTimer: 0,
      throwAnimTimer: 0,
      reactionType: 'none',
      reactionTimer: 0,
      emoteType: null,
      emoteTimer: 0,
      standFactor: 0,
      walkPhase: 0,
      yOffset: 0,
      vy: 0,
      isGrounded: true,
      crouchBlend: 0,
      headLookYaw: 0,
      headLookPitch: 0,
      baseAngle: 0,
      homePos: new THREE.Vector3(),
      currentPos: new THREE.Vector3(),
      ghostPos: new THREE.Vector3(),
      ghostVelocity: { x: 0, z: 0 },
      ghostHoverHeight: 1.55,
      ghostFacingYaw: 0,
      ghostInitialized: false,
      ghostWanderTarget: { x: 0, z: 0 },
      ghostWanderWaitTimer: 0,
      worldPos: new THREE.Vector3(),
      playerId: '',
    };

    // Initialize in seated pose by default
    applyAdventurerBodyPose(seatVisual, {
      standFactor: 0,
      walkPhase: 0,
      moveSpeedRatio: 0,
      crouchBlend: 0,
      jumpHeight: 0,
    });

    seats.push(seatVisual);
  }

  const dispose = () => {
    for (const g of disposableGeos) g.dispose();
    for (const m of disposableMats) m.dispose();
    shadowTex.dispose();
  };

  return { seats, dispose };
}
