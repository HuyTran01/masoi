import * as THREE from 'three';
import { AgrouEmoteId, AgrouHatId } from '../../game/agrouMechanics';
import {
  createArcaneRuneTexture,
  createGoldenGroundRingTexture,
  createSpectralGhostShaderMaterial,
  createSpectralMistRibbonTexture,
  createStoneTexture,
  createTombstonePortraitTexture,
  createWoodGrainTexture,
} from './stylizedAssets';

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
  ghostShaderMats: THREE.ShaderMaterial[];
  ghostGroundRune: THREE.Mesh;
  ghostEyeMat: THREE.MeshBasicMaterial;
  ghostWolfEarsGroup: THREE.Group;
  ghostHatVariants: Record<AgrouHatId, THREE.Group>;
  hitbox: THREE.Mesh;
  ghostHitbox: THREE.Mesh;
  stoolHitbox: THREE.Mesh;
  shadowDisc: THREE.Mesh;
  haloRing: THREE.Mesh;
  hipLantern: THREE.Mesh;
  haloMat: THREE.MeshBasicMaterial;
  lanternMat: THREE.MeshStandardMaterial;
  cloakMat: THREE.MeshStandardMaterial;
  baseCloakRoughness: number;
  eyeLeftMat: THREE.MeshBasicMaterial;
  eyeRightMat: THREE.MeshBasicMaterial;
  tombstoneGroup: THREE.Group;
  tombstoneRuneRing: THREE.Mesh;
  tombstoneMistMesh: THREE.Mesh;
  tombstoneHatVariants: Record<AgrouHatId, THREE.Group>;
  syncTombstonePortrait: (cloakHex: number, hat: AgrouHatId) => void;
  shieldRing: THREE.Mesh;
  loverHeart: THREE.Mesh;
  wolfEarsGroup: THREE.Group;
  angerAuraGroup: THREE.Group;
  happyAuraGroup: THREE.Group;
  mayorCrownGroup: THREE.Group;
  hatVariants: Record<AgrouHatId, THREE.Group>;
  koProgress: number;
  wobbleTimer: number;
  hitRecoilX: number;
  hitRecoilZ: number;
  hitRecoilTimer: number;
  throwAnimTimer: number;
  throwTargetYaw: number;
  wetTimer: number;
  reactionType: 'none' | 'tomato_splat' | 'egg_disgust' | 'water_shiver' | 'happy_dance';
  reactionTimer: number;
  emoteType: AgrouEmoteId | null;
  emoteTimer: number;
  standFactor: number; // 0 = seated on wooden stool, 1 = standing upright
  walkPhase: number;
  landingCompress: number;
  prevBodyYaw: number;
  nightCutsceneOverride: boolean;
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
    landingCompress?: number; // 0..1 landing squash spring
    koProgress?: number;
  }
) {
  const sf = Math.max(0, Math.min(1, params.standFactor));
  const cb = Math.max(0, Math.min(1, params.crouchBlend)) * sf;
  const lc = Math.max(0, Math.min(1, params.landingCompress ?? 0)) * sf;
  const speedRatio = Math.max(0, Math.min(1.6, params.moveSpeedRatio)) * sf;
  const airborne = params.jumpHeight > 0.04 ? Math.min(1, params.jumpHeight / 0.45) * sf : 0;

  // Vertical hip height: seated on stool (0.48) -> standing grounded (0.74) -> crouched (0.50)
  const uprightY = THREE.MathUtils.lerp(0.48, 0.74, sf);
  const crouchedY = uprightY - cb * 0.24 - lc * 0.14;
  const strideBounce = speedRatio > 0.05 && airborne < 0.1
    ? Math.abs(Math.sin(params.walkPhase)) * (0.045 * Math.min(1.3, speedRatio))
    : 0;
  seat.bodyGroup.position.y = crouchedY + strideBounce + params.jumpHeight;

  // Base leg angles from seated -> standing -> crouched + landing knee squash
  const seatedHipX = -1.48;
  const seatedKneeX = 1.42;
  const standingHipX = -cb * 0.82 - lc * 0.34;
  const standingKneeX = cb * 1.36 + lc * 0.58;

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

  // Forward stealth lean when crouching, sprinting, or absorbing a jump landing
  const sprintLean = speedRatio > 1.1 ? (speedRatio - 1.0) * 0.22 : 0;
  seat.torsoGroup.rotation.x = cb * 0.28 + sprintLean + lc * 0.14;
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
  const disposableTex: THREE.Texture[] = [];

  const shadowTex = createSoftShadowTexture();
  const woodGrainTex = createWoodGrainTexture();
  const stoneTex = createStoneTexture();
  const goldenRingTex = createGoldenGroundRingTexture();
  const arcaneRuneTex = createArcaneRuneTexture();
  const spectralMistTex = createSpectralMistRibbonTexture();
  disposableTex.push(
    shadowTex,
    woodGrainTex,
    stoneTex,
    goldenRingTex,
    arcaneRuneTex,
    spectralMistTex
  );

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    disposableGeos.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    disposableMats.push(m);
    return m;
  };

  // Shared handcrafted storybook materials (smooth warm shading + procedural wood/stone grain!)
  const stoolWoodMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x6b472b, map: woodGrainTex, roughness: 0.86 })
  );
  const darkLeatherMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x38281f, roughness: 0.8 })
  );
  const strapLeatherMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x6b4428, roughness: 0.78 })
  );
  const bedrollMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xaca496, roughness: 0.88 })
  );
  const steelArmorMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x768392,
      roughness: 0.36,
      metalness: 0.54,
    })
  );
  const brightSteelMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xb6c1cc,
      roughness: 0.3,
      metalness: 0.62,
    })
  );
  const goldAccentMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xf4bc35,
      emissive: 0x804d04,
      emissiveIntensity: 0.35,
      roughness: 0.28,
      metalness: 0.7,
    })
  );
  const pantsMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x3b3530, roughness: 0.86 })
  );
  const contactShadowMat = trackMat(
    new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
    })
  );
  const musketWoodMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x7a4824, map: woodGrainTex, roughness: 0.78 })
  );
  const musketSmokeMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      roughness: 0.95,
      transparent: true,
      opacity: 0.82,
    })
  );
  const tombStoneMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x9aa2a8,
      map: stoneTex,
      roughness: 0.88,
      metalness: 0.04,
    })
  );
  const tombPlinthMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x7f888f,
      map: stoneTex,
      roughness: 0.92,
      metalness: 0.04,
    })
  );
  const tombFrameMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x586069,
      roughness: 0.86,
    })
  );
  const tombMossDarkMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x4b7a24, roughness: 0.9 })
  );
  const tombMossLightMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x6ba032, roughness: 0.86 })
  );
  const tombFlowerYellowMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xfde047, emissive: 0x6b4f00, emissiveIntensity: 0.25, roughness: 0.65 })
  );
  const tombFlowerWhiteMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xfffdf2, roughness: 0.68 })
  );
  const tombStemMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x3f6e20, roughness: 0.88 })
  );

  // Sculpted Arched Gravestone ExtrudeGeometry (shared across seats)
  const tombArchShape = new THREE.Shape();
  tombArchShape.moveTo(-0.31, 0);
  tombArchShape.lineTo(0.31, 0);
  tombArchShape.lineTo(0.33, 0.52);
  tombArchShape.quadraticCurveTo(0.32, 0.82, 0, 0.88);
  tombArchShape.quadraticCurveTo(-0.32, 0.82, -0.33, 0.52);
  tombArchShape.closePath();
  const tombArchGeo = trackGeo(
    new THREE.ExtrudeGeometry(tombArchShape, {
      depth: 0.18,
      bevelEnabled: true,
      bevelThickness: 0.04,
      bevelSize: 0.032,
      bevelSegments: 3,
      curveSegments: 14,
    })
  );
  tombArchGeo.center();

  // Shared Smooth Stylized Geometries
  const stoolTopGeo = trackGeo(new THREE.CylinderGeometry(0.34, 0.31, 0.088, 14));
  const stoolLegGeo = trackGeo(new THREE.CylinderGeometry(0.038, 0.028, 0.5, 8));
  const shadowDiscGeo = trackGeo(new THREE.PlaneGeometry(1.48, 1.48));
  const haloRingGeo = trackGeo(new THREE.PlaneGeometry(1.86, 1.86));
  const arcaneRuneGeo = trackGeo(new THREE.PlaneGeometry(2.12, 2.12));
  const ghostRuneGeo = trackGeo(new THREE.PlaneGeometry(1.94, 1.94));
  const spectralMistGeo = trackGeo(new THREE.CylinderGeometry(0.78, 0.86, 1.32, 20, 1, true));
  const thighGeo = trackGeo(new THREE.BoxGeometry(0.16, 0.38, 0.16));
  const shinGeo = trackGeo(new THREE.BoxGeometry(0.145, 0.36, 0.155));
  const bootGeo = trackGeo(new THREE.BoxGeometry(0.175, 0.15, 0.29));
  const kneePadGeo = trackGeo(new THREE.IcosahedronGeometry(0.102, 1));
  const torsoGeo = trackGeo(new THREE.CylinderGeometry(0.24, 0.21, 0.58, 12));
  const pauldronGeo = trackGeo(new THREE.IcosahedronGeometry(0.18, 2));
  const spikeGeo = trackGeo(new THREE.ConeGeometry(0.04, 0.11, 6));
  const headGeo = trackGeo(new THREE.IcosahedronGeometry(0.245, 2));
  const armUpperGeo = trackGeo(new THREE.BoxGeometry(0.125, 0.28, 0.125));
  const armForeGeo = trackGeo(new THREE.BoxGeometry(0.11, 0.26, 0.11));
  const handGeo = trackGeo(new THREE.BoxGeometry(0.1, 0.11, 0.11));
  const fingerGeo = trackGeo(new THREE.BoxGeometry(0.036, 0.14, 0.036));

  const seats: AgrouSeatVisual[] = [];

  for (let i = 0; i < maxSeats; i++) {
    const group = new THREE.Group();
    group.visible = false;

    const skinHex = SKIN_TONES[i % SKIN_TONES.length];
    const hairHex = HAIR_COLORS[i % HAIR_COLORS.length];

    const skinMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: skinHex,
        roughness: 0.72,
      })
    );
    const hairMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: hairHex,
        roughness: 0.84,
      })
    );
    const cloakMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xc83737,
        roughness: 0.76,
      })
    );

    // 1. Soft Contact Shadow Disc on Earthy Clearing
    const shadowDisc = new THREE.Mesh(shadowDiscGeo, contactShadowMat);
    shadowDisc.rotation.x = -Math.PI / 2;
    shadowDisc.position.y = 0.016;
    group.add(shadowDisc);

    // 2. Luminous Golden Ground Ring (Signature warm floor halo under every living seated villager!)
    const haloMat = trackMat(
      new THREE.MeshBasicMaterial({
        map: goldenRingTex,
        color: 0xf5b83d,
        transparent: true,
        opacity: 0.55,
        blending: THREE.NormalBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      })
    );
    const haloRing = new THREE.Mesh(haloRingGeo, haloMat);
    haloRing.rotation.x = -Math.PI / 2;
    haloRing.position.y = 0.024;
    haloRing.renderOrder = 2;
    group.add(haloRing);

    // 3. Stationary Seat Anchor Group (4-Legged Wooden Camp Stool + Sculpted Tombstone stay anchored at homePos!)
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

    // Distinct Smooth Hairstyles (varied per seat)
    const hairStyle = i % 4;
    const hairCap = new THREE.Mesh(trackGeo(new THREE.IcosahedronGeometry(0.255, 2)), hairMat);
    hairCap.scale.set(1.02, 0.72, 1.04);
    hairCap.position.set(0, 0.12, -0.03);
    headGroup.add(hairCap);

    if (hairStyle === 0) {
      // High Warrior Ponytail
      const bun = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.11, 0.28, 10)), hairMat);
      bun.position.set(0, 0.25, -0.17);
      bun.rotation.x = -0.85;
      headGroup.add(bun);
    } else if (hairStyle === 1) {
      // Side-swept adventurer hair + headband
      const headband = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.245, 0.245, 0.055, 14)),
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

    // Distinct Beards & Mustaches (varied per seat)
    if (i % 3 !== 2) {
      const mustache = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.2, 0.055, 0.08)), hairMat);
      mustache.position.set(0, -0.075, 0.2);
      headGroup.add(mustache);
      if (i % 3 === 0) {
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
    const pointFinger = new THREE.Mesh(fingerGeo, skinMat);
    pointFinger.position.set(0, -0.61, 0.07);
    rightArm.add(pointFinger);
    const pointGlowMesh = new THREE.Mesh(
      trackGeo(new THREE.ConeGeometry(0.055, 0.24, 8)),
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

    // 10. Wooden Flintlock Musket + White Muzzle Smoke Puff
    const musketGroup = new THREE.Group();
    musketGroup.position.set(0.18, 0.42, 0.34);
    musketGroup.visible = false;
    torsoGroup.add(musketGroup);

    const stock = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.08, 0.12, 0.85)), musketWoodMat);
    stock.position.set(0, 0, 0.22);
    musketGroup.add(stock);
    const barrel = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.032, 0.04, 1.05, 8)), brightSteelMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.06, 0.56);
    musketGroup.add(barrel);
    const brassBand = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.046, 0.046, 0.08, 8)), goldAccentMat);
    brassBand.rotation.x = Math.PI / 2;
    brassBand.position.set(0, 0.055, 0.82);
    musketGroup.add(brassBand);

    const musketSmoke = new THREE.Group();
    musketSmoke.position.set(0, 0.06, 1.18);
    for (let s = 0; s < 5; s++) {
      const puff = new THREE.Mesh(
        trackGeo(new THREE.IcosahedronGeometry(0.14 + (s % 2) * 0.06, 1)),
        musketSmokeMat
      );
      puff.position.set((s - 2) * 0.07, ((s % 3) - 1) * 0.06, s * 0.07);
      musketSmoke.add(puff);
    }
    musketGroup.add(musketSmoke);

    // 11. All 7 Customizable Stylized Hats (Smooth curved brims & crowns!)
    const hatVariants: Record<AgrouHatId, THREE.Group> = {
      none: new THREE.Group(),
      witch: new THREE.Group(),
      knight: new THREE.Group(),
      straw: new THREE.Group(),
      antlers: new THREE.Group(),
      pirate: new THREE.Group(),
      crown: new THREE.Group(),
    };

    const witchMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x4b2a74, roughness: 0.78 }));
    const strawMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xe3ba5f, roughness: 0.88 }));
    const antlerMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x734d2c, roughness: 0.86 }));
    const pirateMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x22252b, roughness: 0.82 }));
    const plumeMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xd13939, roughness: 0.76 }));

    const populateStylizedHats = (target: Record<AgrouHatId, THREE.Group>) => {
      // Witch Hat (rich violet + bright golden band)
      const witchBrim = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.42, 0.44, 0.048, 16)), witchMat);
      witchBrim.position.y = 0.2;
      const witchCone = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.24, 0.56, 14)), witchMat);
      witchCone.position.set(0, 0.46, -0.02);
      witchCone.rotation.x = -0.18;
      const witchBand = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.23, 0.255, 0.068, 14)), goldAccentMat);
      witchBand.position.y = 0.245;
      target.witch.add(witchBrim, witchCone, witchBand);

      // Knight Helm
      const helmDome = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.24, 0.26, 0.34, 14)), steelArmorMat);
      helmDome.position.y = 0.14;
      const helmPlume = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.06, 0.18, 0.32)), plumeMat);
      helmPlume.position.set(0, 0.35, -0.02);
      target.knight.add(helmDome, helmPlume);

      // Straw Hat
      const strawBrim = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.43, 0.47, 0.045, 16)), strawMat);
      strawBrim.position.y = 0.19;
      const strawTop = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.21, 0.25, 0.18, 14)), strawMat);
      strawTop.position.y = 0.29;
      target.straw.add(strawBrim, strawTop);

      // Forest Antlers
      for (const sx of [-1, 1]) {
        const mainAntler = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.025, 0.04, 0.42, 8)), antlerMat);
        mainAntler.position.set(sx * 0.2, 0.36, 0);
        mainAntler.rotation.z = -sx * 0.45;
        const tine = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.018, 0.026, 0.2, 7)), antlerMat);
        tine.position.set(sx * 0.28, 0.46, 0.04);
        tine.rotation.z = sx * 0.32;
        target.antlers.add(mainAntler, tine);
      }

      // Pirate Captain Tricorne
      const tricorne = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.36, 0.28, 0.18, 3)), pirateMat);
      tricorne.position.y = 0.25;
      tricorne.rotation.y = Math.PI;
      const skullPin = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.055, 0)), goldAccentMat);
      skullPin.position.set(0, 0.28, 0.2);
      target.pirate.add(tricorne, skullPin);

      // Royal Crown Hat
      const crownRing = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.24, 0.22, 0.14, 12)), goldAccentMat);
      crownRing.position.y = 0.25;
      target.crown.add(crownRing);
    };

    populateStylizedHats(hatVariants);
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
      trackGeo(new THREE.TorusGeometry(0.56, 0.022, 6, 20)),
      trackMat(new THREE.MeshBasicMaterial({ color: 0x60a5fa, transparent: true, opacity: 0.42 }))
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

    // 14B. Sculpted Mossy Storybook Tombstone with Portrait, Tilted Hat, Wildflowers, Arcane Rune Circle & Spectral Mist!
    const tombstoneGroup = new THREE.Group();
    tombstoneGroup.visible = false;

    // Stepped stone plinth base
    const plinthBottom = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.92, 0.14, 0.56)), tombPlinthMat);
    plinthBottom.position.set(0, 0.07, 0.16);
    plinthBottom.castShadow = !isSoftwareGl;
    plinthBottom.receiveShadow = true;
    tombstoneGroup.add(plinthBottom);

    const plinthMid = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.76, 0.12, 0.44)), tombStoneMat);
    plinthMid.position.set(0, 0.19, 0.16);
    plinthMid.castShadow = !isSoftwareGl;
    plinthMid.receiveShadow = true;
    tombstoneGroup.add(plinthMid);

    // Beveled arched stone headstone
    const archSlab = new THREE.Mesh(tombArchGeo, tombStoneMat);
    archSlab.position.set(0, 0.65, 0.16);
    archSlab.castShadow = !isSoftwareGl;
    archSlab.receiveShadow = true;
    tombstoneGroup.add(archSlab);

    // Carved recessed portrait frame + charming villager portrait plaque (front & back so foreground seats show portrait too!)
    const portraitFrame = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.38, 0.4, 0.05)), tombFrameMat);
    portraitFrame.position.set(0, 0.66, 0.27);
    tombstoneGroup.add(portraitFrame);

    const portraitFrameBack = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.38, 0.4, 0.05)), tombFrameMat);
    portraitFrameBack.position.set(0, 0.66, 0.05);
    tombstoneGroup.add(portraitFrameBack);

    let currentPortraitKey = `init:${i}`;
    let currentPortraitTex: THREE.CanvasTexture = createTombstonePortraitTexture(
      skinHex,
      hairHex,
      0xc83737,
      'witch'
    );
    disposableTex.push(currentPortraitTex);
    const portraitMat = trackMat(
      new THREE.MeshStandardMaterial({
        map: currentPortraitTex,
        roughness: 0.72,
      })
    );
    const portraitPlaque = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(0.32, 0.34)), portraitMat);
    portraitPlaque.position.set(0, 0.66, 0.302);
    tombstoneGroup.add(portraitPlaque);

    const portraitPlaqueBack = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(0.32, 0.34)), portraitMat);
    portraitPlaqueBack.position.set(0, 0.66, 0.018);
    portraitPlaqueBack.rotation.y = Math.PI;
    tombstoneGroup.add(portraitPlaqueBack);

    const syncTombstonePortrait = (cloakHex: number, hat: AgrouHatId) => {
      const nextKey = `${cloakHex}:${hat}`;
      if (nextKey === currentPortraitKey) return;
      currentPortraitKey = nextKey;
      const nextTex = createTombstonePortraitTexture(skinHex, hairHex, cloakHex, hat);
      const oldTex = currentPortraitTex;
      currentPortraitTex = nextTex;
      portraitMat.map = nextTex;
      portraitMat.needsUpdate = true;
      const idxTex = disposableTex.indexOf(oldTex);
      if (idxTex >= 0) disposableTex.splice(idxTex, 1);
      disposableTex.push(nextTex);
      oldTex.dispose();
    };

    // Draped green moss cushions hugging the base and corners of the headstone (front & back!)
    const mossSpecs = [
      { x: -0.26, y: 0.26, z: 0.33, sx: 0.22, sy: 0.11, sz: 0.14, light: false },
      { x: -0.34, y: 0.36, z: 0.24, sx: 0.14, sy: 0.14, sz: 0.12, light: true },
      { x: -0.18, y: 0.14, z: 0.4, sx: 0.24, sy: 0.09, sz: 0.15, light: true },
      { x: 0.28, y: 0.14, z: 0.36, sx: 0.18, sy: 0.08, sz: 0.12, light: false },
      { x: -0.22, y: 0.46, z: 0.27, sx: 0.1, sy: 0.09, sz: 0.06, light: true },
      { x: -0.24, y: 0.25, z: -0.02, sx: 0.21, sy: 0.1, sz: 0.13, light: true },
      { x: 0.24, y: 0.15, z: -0.05, sx: 0.18, sy: 0.08, sz: 0.12, light: false },
    ];
    for (const ms of mossSpecs) {
      const mossBlob = new THREE.Mesh(
        trackGeo(new THREE.IcosahedronGeometry(0.65, 1)),
        ms.light ? tombMossLightMat : tombMossDarkMat
      );
      mossBlob.scale.set(ms.sx, ms.sy, ms.sz);
      mossBlob.position.set(ms.x, ms.y, ms.z);
      tombstoneGroup.add(mossBlob);
    }

    // Delicate multi-petal wildflowers blooming naturally in the moss at the tombstone base
    const tombFlowers = [
      { x: -0.22, y: 0.17, z: 0.43, yellow: true },
      { x: -0.12, y: 0.16, z: 0.45, yellow: false },
      { x: -0.29, y: 0.15, z: 0.4, yellow: false },
      { x: 0.18, y: 0.15, z: 0.42, yellow: true },
      { x: 0.26, y: 0.14, z: 0.38, yellow: false },
    ];
    const petalGeo = trackGeo(new THREE.IcosahedronGeometry(0.016, 0));
    const budGeo = trackGeo(new THREE.IcosahedronGeometry(0.011, 0));
    for (const tf of tombFlowers) {
      const stem = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.005, 0.007, 0.08, 5)), tombStemMat);
      stem.position.set(tf.x, tf.y - 0.02, tf.z);
      tombstoneGroup.add(stem);
      const flowerCluster = new THREE.Group();
      flowerCluster.position.set(tf.x, tf.y + 0.02, tf.z);
      flowerCluster.rotation.set(0.28, tf.x * 3.1, 0);
      const petalMat = tf.yellow ? tombFlowerYellowMat : tombFlowerWhiteMat;
      const centerMat = tf.yellow ? tombFlowerWhiteMat : tombFlowerYellowMat;
      for (let p = 0; p < 5; p++) {
        const pa = (p / 5) * Math.PI * 2;
        const petal = new THREE.Mesh(petalGeo, petalMat);
        petal.scale.set(1.15, 0.45, 0.85);
        petal.position.set(Math.cos(pa) * 0.018, 0, Math.sin(pa) * 0.018);
        petal.rotation.y = -pa;
        flowerCluster.add(petal);
      }
      const centerBud = new THREE.Mesh(budGeo, centerMat);
      centerBud.scale.set(1, 0.6, 1);
      centerBud.position.y = 0.004;
      flowerCluster.add(centerBud);
      tombstoneGroup.add(flowerCluster);
    }

    // Playful Tilted Hat Perched on Top-Right Corner of Arched Tombstone (Matches reference!)
    const tombHatAnchor = new THREE.Group();
    tombHatAnchor.position.set(0.22, 0.96, 0.18);
    tombHatAnchor.rotation.set(0.14, 0.32, -0.34);
    tombHatAnchor.scale.setScalar(0.92);
    const tombstoneHatVariants: Record<AgrouHatId, THREE.Group> = {
      none: new THREE.Group(),
      witch: new THREE.Group(),
      knight: new THREE.Group(),
      straw: new THREE.Group(),
      antlers: new THREE.Group(),
      pirate: new THREE.Group(),
      crown: new THREE.Group(),
    };
    populateStylizedHats(tombstoneHatVariants);
    (Object.keys(tombstoneHatVariants) as AgrouHatId[]).forEach((hk) => {
      tombstoneHatVariants[hk].visible = false;
      tombHatAnchor.add(tombstoneHatVariants[hk]);
    });
    tombstoneGroup.add(tombHatAnchor);

    // Tombstone stands cleanly on natural earth/snow without ground halo rings
    const tombstoneRuneMat = trackMat(
      new THREE.MeshBasicMaterial({
        map: arcaneRuneTex,
        color: 0x6ee7ff,
        transparent: true,
        opacity: 0.0,
        depthWrite: false,
      })
    );
    const tombstoneRuneRing = new THREE.Mesh(arcaneRuneGeo, tombstoneRuneMat);
    tombstoneRuneRing.rotation.x = -Math.PI / 2;
    tombstoneRuneRing.position.set(0, 0.026, 0.16);
    tombstoneRuneRing.visible = false;
    tombstoneGroup.add(tombstoneRuneRing);

    const tombstoneMistMat = trackMat(
      new THREE.MeshBasicMaterial({
        map: spectralMistTex,
        color: 0x5ce1ff,
        transparent: true,
        opacity: 0.0,
        depthWrite: false,
      })
    );
    const tombstoneMistMesh = new THREE.Mesh(spectralMistGeo, tombstoneMistMat);
    tombstoneMistMesh.position.set(0, 0.68, 0.16);
    tombstoneMistMesh.visible = false;
    tombstoneGroup.add(tombstoneMistMesh);

    seatAnchorGroup.add(tombstoneGroup);

    // 15. Radiant Fresnel Rim-Lit Spectral Ghost Adventurer (Luminous icy-cyan/white spirit matching reference!)
    const ghostGroup = new THREE.Group();
    ghostGroup.visible = false;
    ghostGroup.userData = { seatIndex: i, playerId: '' };

    // Keep ghostCloakMat intact for state/debug sync compatibility
    const ghostCloakMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x62d6f8,
        emissive: 0x168bb0,
        emissiveIntensity: 0.55,
        roughness: 0.3,
        transparent: true,
        opacity: 0.72,
        depthWrite: true,
      })
    );

    const ghostBodyShaderMat = trackMat(
      createSpectralGhostShaderMaterial({
        baseColor: 0x2994c8,
        rimColor: 0xb8f2ff,
        opacity: 0.72,
        rimPower: 2.25,
        depthWrite: true,
        additive: false,
      })
    );
    const ghostSkinShaderMat = trackMat(
      createSpectralGhostShaderMaterial({
        baseColor: 0x3da8d8,
        rimColor: 0xcff8ff,
        opacity: 0.76,
        rimPower: 2.15,
        depthWrite: true,
        additive: false,
      })
    );
    const ghostHatShaderMat = trackMat(
      createSpectralGhostShaderMaterial({
        baseColor: 0x2482b8,
        rimColor: 0xb0eeff,
        opacity: 0.78,
        rimPower: 2.2,
        depthWrite: true,
        additive: false,
      })
    );
    const ghostWispShaderMat = trackMat(
      createSpectralGhostShaderMaterial({
        baseColor: 0x2299cc,
        rimColor: 0x99ebff,
        opacity: 0.42,
        rimPower: 2.0,
        depthWrite: false,
        additive: true,
      })
    );
    const ghostShaderMats = [
      ghostBodyShaderMat,
      ghostSkinShaderMat,
      ghostHatShaderMat,
      ghostWispShaderMat,
    ];

    const ghostEyeMat = trackMat(
      new THREE.MeshBasicMaterial({
        color: 0xd8f8ff,
        toneMapped: false,
      })
    );

    // 15A. Radiant Ethereal Lower Spectral Tail & Orbiting Spirit Motes
    const ghostTailGroup = new THREE.Group();
    ghostTailGroup.position.y = 0.52;
    ghostGroup.add(ghostTailGroup);

    const tailOuterCone = new THREE.Mesh(
      trackGeo(new THREE.ConeGeometry(0.36, 0.92, 16, 1, true)),
      ghostWispShaderMat
    );
    tailOuterCone.rotation.x = Math.PI;
    tailOuterCone.position.y = -0.34;
    ghostTailGroup.add(tailOuterCone);

    const tailInnerCore = new THREE.Mesh(
      trackGeo(new THREE.ConeGeometry(0.24, 0.78, 14)),
      ghostBodyShaderMat
    );
    tailInnerCore.rotation.x = Math.PI;
    tailInnerCore.position.y = -0.22;
    ghostTailGroup.add(tailInnerCore);

    for (let w = 0; w < 3; w++) {
      const wa = (w / 3) * Math.PI * 2 + 0.4;
      const wisp = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.085, 0.54, 10)), ghostWispShaderMat);
      wisp.rotation.x = Math.PI + 0.16;
      wisp.position.set(Math.cos(wa) * 0.15, -0.58 - (w % 2) * 0.1, Math.sin(wa) * 0.15);
      ghostTailGroup.add(wisp);
    }

    const ghostMotesGroup = new THREE.Group();
    ghostMotesGroup.position.y = 0.88;
    for (let m = 0; m < 4; m++) {
      const ma = (m / 4) * Math.PI * 2;
      const mote = new THREE.Mesh(trackGeo(new THREE.IcosahedronGeometry(0.036, 1)), ghostWispShaderMat);
      mote.position.set(Math.cos(ma) * 0.52, m % 2 === 0 ? 0.18 : -0.14, Math.sin(ma) * 0.52);
      ghostMotesGroup.add(mote);
    }
    ghostGroup.add(ghostMotesGroup);

    // 15B. Radiant Spectral Upper Torso, Backpack & Smooth Rounded Pauldrons
    const ghostTorsoGroup = new THREE.Group();
    ghostTorsoGroup.position.set(0, 0.52, 0);
    ghostGroup.add(ghostTorsoGroup);

    const gTorso = new THREE.Mesh(torsoGeo, ghostBodyShaderMat);
    gTorso.position.y = 0.3;
    ghostTorsoGroup.add(gTorso);

    const gChest = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.38, 0.34, 0.28)), ghostBodyShaderMat);
    gChest.position.set(0, 0.35, 0.06);
    ghostTorsoGroup.add(gChest);

    const gCollar = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.21, 0.24, 0.11, 12)), ghostBodyShaderMat);
    gCollar.position.y = 0.58;
    ghostTorsoGroup.add(gCollar);

    const gPack = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.36, 0.4, 0.2)), ghostWispShaderMat);
    gPack.position.set(0, 0.34, -0.24);
    ghostTorsoGroup.add(gPack);

    for (const side of [-1, 1]) {
      const gPauldron = new THREE.Mesh(pauldronGeo, ghostBodyShaderMat);
      gPauldron.scale.set(1.06, 0.9, 1.12);
      gPauldron.position.set(side * 0.31, 0.54, 0.0);
      ghostTorsoGroup.add(gPauldron);
    }

    // Floating Spectral Arms
    const ghostLeftArm = new THREE.Group();
    ghostLeftArm.position.set(-0.32, 0.49, 0.02);
    ghostTorsoGroup.add(ghostLeftArm);
    const glUpper = new THREE.Mesh(armUpperGeo, ghostBodyShaderMat);
    glUpper.position.set(0, -0.14, 0);
    const glFore = new THREE.Mesh(armForeGeo, ghostBodyShaderMat);
    glFore.position.set(0, -0.35, 0.09);
    glFore.rotation.x = -0.65;
    const glHand = new THREE.Mesh(handGeo, ghostSkinShaderMat);
    glHand.position.set(0, -0.45, 0.2);
    ghostLeftArm.add(glUpper, glFore, glHand);

    const ghostRightArm = new THREE.Group();
    ghostRightArm.position.set(0.32, 0.49, 0.02);
    ghostTorsoGroup.add(ghostRightArm);
    const grUpper = new THREE.Mesh(armUpperGeo, ghostBodyShaderMat);
    grUpper.position.set(0, -0.14, 0);
    const grFore = new THREE.Mesh(armForeGeo, ghostBodyShaderMat);
    grFore.position.set(0, -0.35, 0.09);
    grFore.rotation.x = -0.65;
    const grHand = new THREE.Mesh(handGeo, ghostSkinShaderMat);
    grHand.position.set(0, -0.45, 0.2);
    ghostRightArm.add(grUpper, grFore, grHand);

    // 15C. Spectral Head with Matching Hair, Luminous Eyes & Glowing Fresnel Hats!
    const ghostHeadGroup = new THREE.Group();
    ghostHeadGroup.position.set(0, 0.81, 0.03);
    ghostTorsoGroup.add(ghostHeadGroup);

    const gHeadMesh = new THREE.Mesh(headGeo, ghostSkinShaderMat);
    gHeadMesh.scale.set(0.96, 1.08, 0.96);
    ghostHeadGroup.add(gHeadMesh);

    const gEyeL = new THREE.Mesh(eyeGeo, ghostEyeMat);
    gEyeL.position.set(-0.085, 0.03, 0.218);
    const gEyeR = new THREE.Mesh(eyeGeo, ghostEyeMat);
    gEyeR.position.set(0.085, 0.03, 0.218);
    ghostHeadGroup.add(gEyeL, gEyeR);

    const gHairCap = new THREE.Mesh(trackGeo(new THREE.IcosahedronGeometry(0.255, 2)), ghostBodyShaderMat);
    gHairCap.scale.set(1.02, 0.72, 1.04);
    gHairCap.position.set(0, 0.12, -0.03);
    ghostHeadGroup.add(gHairCap);

    // Spectral Wolf Ears (for revealed dead Werewolves!)
    const ghostWolfEarsGroup = new THREE.Group();
    ghostWolfEarsGroup.visible = false;
    for (const sx of [-0.15, 0.15]) {
      const gEar = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.075, 0.24, 8)), ghostHatShaderMat);
      gEar.position.set(sx, 0.29, 0.0);
      gEar.rotation.z = sx < 0 ? 0.25 : -0.25;
      ghostWolfEarsGroup.add(gEar);
    }
    const gSnout = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.14, 0.11, 0.22)), ghostHatShaderMat);
    gSnout.position.set(0, -0.04, 0.27);
    ghostWolfEarsGroup.add(gSnout);
    ghostHeadGroup.add(ghostWolfEarsGroup);

    // All 7 Radiant Spectral Hat Variants (smooth Fresnel silhouettes matching reference!)
    const ghostHatVariants: Record<AgrouHatId, THREE.Group> = {
      none: new THREE.Group(),
      witch: new THREE.Group(),
      knight: new THREE.Group(),
      straw: new THREE.Group(),
      antlers: new THREE.Group(),
      pirate: new THREE.Group(),
      crown: new THREE.Group(),
    };

    const gWitchBrim = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.45, 0.47, 0.048, 16)), ghostHatShaderMat);
    gWitchBrim.position.y = 0.2;
    const gWitchCone = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.25, 0.58, 14)), ghostHatShaderMat);
    gWitchCone.position.set(0, 0.47, -0.02);
    gWitchCone.rotation.x = -0.16;
    ghostHatVariants.witch.add(gWitchBrim, gWitchCone);

    const gHelmDome = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.24, 0.26, 0.34, 14)), ghostHatShaderMat);
    gHelmDome.position.y = 0.14;
    const gHelmPlume = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.06, 0.18, 0.32)), ghostWispShaderMat);
    gHelmPlume.position.set(0, 0.35, -0.02);
    ghostHatVariants.knight.add(gHelmDome, gHelmPlume);

    const gStrawBrim = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.44, 0.48, 0.045, 16)), ghostHatShaderMat);
    gStrawBrim.position.y = 0.19;
    const gStrawTop = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.21, 0.25, 0.18, 14)), ghostHatShaderMat);
    gStrawTop.position.y = 0.29;
    ghostHatVariants.straw.add(gStrawBrim, gStrawTop);

    for (const sx of [-1, 1]) {
      const gMainAntler = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.025, 0.04, 0.42, 8)), ghostHatShaderMat);
      gMainAntler.position.set(sx * 0.2, 0.36, 0);
      gMainAntler.rotation.z = -sx * 0.45;
      const gTine = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.018, 0.026, 0.2, 7)), ghostHatShaderMat);
      gTine.position.set(sx * 0.28, 0.46, 0.04);
      gTine.rotation.z = sx * 0.32;
      ghostHatVariants.antlers.add(gMainAntler, gTine);
    }

    const gTricorne = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.36, 0.28, 0.18, 3)), ghostHatShaderMat);
    gTricorne.position.y = 0.25;
    gTricorne.rotation.y = Math.PI;
    ghostHatVariants.pirate.add(gTricorne);

    const gCrownRing = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.24, 0.22, 0.14, 12)), ghostHatShaderMat);
    gCrownRing.position.y = 0.25;
    ghostHatVariants.crown.add(gCrownRing);

    (Object.keys(ghostHatVariants) as AgrouHatId[]).forEach((hk) => {
      ghostHatVariants[hk].visible = false;
      ghostHeadGroup.add(ghostHatVariants[hk]);
    });

    // Raycast Hitbox following the floating ghost spirit
    const ghostHitbox = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.58, 0.58, 1.85, 8)),
      trackMat(new THREE.MeshBasicMaterial({ visible: false }))
    );
    ghostHitbox.position.y = 0.85;
    ghostHitbox.userData = { seatIndex: i, isGhostHitbox: true, playerId: '' };
    ghostGroup.add(ghostHitbox);
    clickables.push(ghostHitbox);

    scene.add(ghostGroup);

    // Ghosts float cleanly without ground halo rings
    const ghostGroundRuneMat = trackMat(
      new THREE.MeshBasicMaterial({
        map: arcaneRuneTex,
        color: 0x6ee7ff,
        transparent: true,
        opacity: 0.0,
        depthWrite: false,
      })
    );
    const ghostGroundRune = new THREE.Mesh(ghostRuneGeo, ghostGroundRuneMat);
    ghostGroundRune.rotation.x = -Math.PI / 2;
    ghostGroundRune.visible = false;
    scene.add(ghostGroundRune);

    // 16. Raycast Hitbox
    const hitbox = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.56, 0.56, 1.85, 8)),
      trackMat(new THREE.MeshBasicMaterial({ visible: false }))
    );
    hitbox.position.y = 0.95;
    hitbox.userData = { seatIndex: i, playerId: '' };
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
      ghostShaderMats,
      ghostGroundRune,
      ghostEyeMat,
      ghostWolfEarsGroup,
      ghostHatVariants,
      hitbox,
      ghostHitbox,
      stoolHitbox,
      shadowDisc,
      haloRing,
      hipLantern,
      haloMat,
      lanternMat,
      cloakMat,
      baseCloakRoughness: 0.76,
      eyeLeftMat,
      eyeRightMat,
      tombstoneGroup,
      tombstoneRuneRing,
      tombstoneMistMesh,
      tombstoneHatVariants,
      syncTombstonePortrait,
      shieldRing,
      loverHeart,
      wolfEarsGroup,
      angerAuraGroup,
      happyAuraGroup,
      mayorCrownGroup,
      hatVariants,
      koProgress: 0,
      wobbleTimer: 0,
      hitRecoilX: 0,
      hitRecoilZ: 0,
      hitRecoilTimer: 0,
      throwAnimTimer: 0,
      throwTargetYaw: 0,
      wetTimer: 0,
      reactionType: 'none',
      reactionTimer: 0,
      emoteType: null,
      emoteTimer: 0,
      standFactor: 0,
      walkPhase: 0,
      landingCompress: 0,
      prevBodyYaw: 0,
      nightCutsceneOverride: false,
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
    for (const t of disposableTex) t.dispose();
  };

  return { seats, dispose };
}
