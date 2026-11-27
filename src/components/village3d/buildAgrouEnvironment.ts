import * as THREE from 'three';
import { AGROU_BIOMES, AgrouMapBiome } from '../../game/agrouMechanics';
import type { EnvObstacle } from '../../game/fpvCamera';
import {
  createSoftSmokeTexture,
  createStoneTexture,
  createStylizedFlameTexture,
  createTerrainBumpTexture,
  createTerrainDetailTexture,
  createWaterRippleTexture,
  createWoodGrainTexture,
} from './stylizedAssets';

export type { EnvObstacle };

export interface AgrouEnvironmentHandle {
  campfireHitbox: THREE.Mesh;
  fireLight: THREE.PointLight;
  getObstacles: (biome: AgrouMapBiome) => readonly EnvObstacle[];
  update: (params: {
    biomeKey: AgrouMapBiome;
    isDay: boolean;
    isNightBlindfolded: boolean;
    isTitleScreen: boolean;
    isVotingPhase: boolean;
    isAbstaining: boolean;
    hoveredCampfire: boolean;
    elapsed: number;
    simDt: number;
    dt: number;
    isSoftwareGl: boolean;
  }) => void;
  dispose: () => void;
}

// Deterministic pseudo-random helper for repeatable organic placement
function hash2(x: number, z: number): number {
  const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453123;
  return s - Math.floor(s);
}

// Winding river center Z as a function of X for the Riverside Meadow biome (pushed back to expand walkable clearing)
export function getRiverCenterZ(x: number): number {
  return -16.2 + Math.sin(x * 0.095) * 2.4 + Math.cos(x * 0.045) * 0.95;
}

// Procedural sculpted low-poly terrain height function
export function sampleTerrainHeight(x: number, z: number, biome: AgrouMapBiome): number {
  const r = Math.hypot(x, z);
  const angle = Math.atan2(z, x);

  // Expanded flat playable campfire clearing inside r <= 11.4m so 10-20 players & free walking have plenty of room
  if (r < 11.4) {
    const ripple = (hash2(Math.round(x * 2), Math.round(z * 2)) - 0.5) * 0.025;
    return r < 3.5 ? 0 : ripple * Math.min(1, (r - 3.5) / 7.9);
  }

  if (biome === 'autumn') {
    const riverZ = getRiverCenterZ(x);
    const distRiver = Math.abs(z - riverZ);
    let h = 0;

    // Gentle meadow roll outside expanded clearing
    const outerBlend = THREE.MathUtils.smoothstep(r, 11.4, 21.0);
    h += outerBlend * (0.22 + Math.sin(x * 0.11) * 0.18 + Math.cos(z * 0.1) * 0.16);

    // Sweeping rolling emerald hills behind the river
    if (z < riverZ - 2.4) {
      const hillDepth = Math.min(1, (riverZ - 2.4 - z) / 28);
      const centralHill = Math.exp(-Math.pow((x + 3.0) / 18, 2)) * 3.4;
      const rightHill = Math.exp(-Math.pow((x - 18.0) / 18, 2)) * 3.1;
      const farRidge = Math.sin(x * 0.075 + 0.8) * 0.95 + 1.65;
      h += hillDepth * (farRidge + centralHill + rightHill);

      if (x < -14) {
        const bluffFactor = THREE.MathUtils.smoothstep(-x, 14, 30) * THREE.MathUtils.smoothstep(-z, 17, 32);
        const rawBluff = bluffFactor * 10.2;
        h += Math.floor(rawBluff / 1.7) * 1.55 + (rawBluff % 1.7) * 0.4;
      }
    } else if (z > 18) {
      const backRoll = THREE.MathUtils.smoothstep(z, 18, 48);
      h += backRoll * (2.4 + Math.sin(x * 0.1) * 0.75);
    }

    if (Math.abs(x) > 20 && z > riverZ - 2) {
      h += THREE.MathUtils.smoothstep(Math.abs(x), 20, 46) * 2.0;
    }

    // Carve smooth river channel
    if (distRiver < 3.6) {
      const bankT = 1 - THREE.MathUtils.smoothstep(distRiver, 1.45, 3.6);
      h = THREE.MathUtils.lerp(h, -0.78, bankT);
    }

    return h;
  }

  // REDWOOD FOREST CAMP ('forest') & FROSTPEAK ALPINE CAMP ('frostpeak')
  const forestRing = THREE.MathUtils.smoothstep(r, 12.0, 26.0);
  let h = forestRing * (0.42 + Math.sin(x * 0.12 + 0.5) * 0.28 + Math.cos(z * 0.12) * 0.25);

  if (r > 24.0) {
    const ridgeT = THREE.MathUtils.smoothstep(r, 24.0, 56.0);
    const undulating = 1.0 + 0.35 * Math.sin(angle * 4.0 + 0.7) + 0.2 * Math.cos(angle * 7.0);
    const backBoost = z < -14 ? 1.35 : 0.8;
    h += ridgeT * 5.2 * undulating * backBoost;
  }

  return h;
}

// Create a soft radial glow texture via HTML Canvas (zero external asset requests)
function createRadialGlowTexture(
  innerColor: string,
  midColor: string,
  outerColor: string
): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(size / 2, size / 2, 4, size / 2, size / 2, size / 2);
    grad.addColorStop(0.0, innerColor);
    grad.addColorStop(0.32, midColor);
    grad.addColorStop(0.68, outerColor);
    grad.addColorStop(1.0, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Create lush curved multi-blade storybook grass tuft BufferGeometry (9 arching 2-segment blades with root-to-tip vertex shading!)
function createGrassTuftGeometry(): THREE.BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const colors: number[] = [];
  const bladeSpecs = [
    { angle: 0.0, lean: 0.24, h: 0.72, w: 0.082, ox: 0.0, oz: 0.0 },
    { angle: 0.72, lean: 0.29, h: 0.58, w: 0.072, ox: 0.09, oz: 0.06 },
    { angle: 1.44, lean: 0.26, h: 0.68, w: 0.078, ox: -0.07, oz: 0.08 },
    { angle: 2.16, lean: 0.31, h: 0.52, w: 0.068, ox: -0.11, oz: -0.04 },
    { angle: 2.88, lean: 0.25, h: 0.64, w: 0.075, ox: 0.06, oz: -0.09 },
    { angle: 3.6, lean: 0.32, h: 0.48, w: 0.066, ox: 0.12, oz: -0.02 },
    { angle: 4.32, lean: 0.27, h: 0.62, w: 0.074, ox: -0.04, oz: -0.11 },
    { angle: 5.04, lean: 0.3, h: 0.54, w: 0.07, ox: -0.09, oz: 0.05 },
    { angle: 5.76, lean: 0.22, h: 0.66, w: 0.076, ox: 0.04, oz: 0.1 },
  ];

  const v0 = new THREE.Vector3();
  const v1 = new THREE.Vector3();
  const v2 = new THREE.Vector3();
  const v3 = new THREE.Vector3();
  const v4 = new THREE.Vector3();
  const e1 = new THREE.Vector3();
  const e2 = new THREE.Vector3();
  const n = new THREE.Vector3();

  const pushTri = (
    a: THREE.Vector3,
    b: THREE.Vector3,
    c: THREE.Vector3,
    ca: [number, number, number],
    cb: [number, number, number],
    cc: [number, number, number]
  ) => {
    e1.subVectors(b, a);
    e2.subVectors(c, a);
    n.crossVectors(e1, e2).normalize();
    // Tilt normal softly upward so grass catches warm sunlit sky lighting naturally
    n.lerp(new THREE.Vector3(0, 1, 0), 0.45).normalize();
    positions.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
    normals.push(n.x, n.y, n.z, n.x, n.y, n.z, n.x, n.y, n.z);
    colors.push(...ca, ...cb, ...cc);
  };

  const cRoot: [number, number, number] = [0.48, 0.54, 0.38];
  const cMid: [number, number, number] = [0.85, 0.92, 0.72];
  const cTip: [number, number, number] = [1.14, 1.18, 0.88];

  for (const b of bladeSpecs) {
    const ca = Math.cos(b.angle);
    const sa = Math.sin(b.angle);
    const midW = b.w * 0.58;
    const midLean = b.lean * 0.36;
    const midH = b.h * 0.54;

    v0.set(b.ox - sa * b.w, 0, b.oz + ca * b.w);
    v1.set(b.ox + sa * b.w, 0, b.oz - ca * b.w);
    v2.set(b.ox + ca * midLean - sa * midW, midH, b.oz + sa * midLean + ca * midW);
    v3.set(b.ox + ca * midLean + sa * midW, midH, b.oz + sa * midLean - ca * midW);
    v4.set(b.ox + ca * b.lean, b.h, b.oz + sa * b.lean);

    pushTri(v0, v1, v2, cRoot, cRoot, cMid);
    pushTri(v1, v3, v2, cRoot, cMid, cMid);
    pushTri(v2, v3, v4, cMid, cMid, cTip);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  return geo;
}

// Create lush multi-frond low-poly fern cluster geometry (6 arching serrated fronds)
function createFernClusterGeometry(): THREE.BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const v0 = new THREE.Vector3();
  const v1 = new THREE.Vector3();
  const v2 = new THREE.Vector3();
  const v3 = new THREE.Vector3();
  const e1 = new THREE.Vector3();
  const e2 = new THREE.Vector3();
  const n = new THREE.Vector3();

  const pushTri = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3) => {
    e1.subVectors(b, a);
    e2.subVectors(c, a);
    n.crossVectors(e1, e2).normalize();
    positions.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
    normals.push(n.x, n.y, n.z, n.x, n.y, n.z, n.x, n.y, n.z);
  };

  const frondCount = 7;
  for (let f = 0; f < frondCount; f++) {
    const ang = (f / frondCount) * Math.PI * 2 + (f % 2) * 0.25;
    const ca = Math.cos(ang);
    const sa = Math.sin(ang);
    const len = 0.85 + (f % 3) * 0.22;
    const peakH = 0.42 + (f % 2) * 0.14;
    const wMid = 0.22;

    // Arching 2-segment diamond frond
    v0.set(ca * 0.06, 0.02, sa * 0.06);
    v1.set(ca * len * 0.48 - sa * wMid, peakH, sa * len * 0.48 + ca * wMid);
    v2.set(ca * len * 0.48 + sa * wMid, peakH, sa * len * 0.48 - ca * wMid);
    v3.set(ca * len, peakH * 0.48, sa * len);

    pushTri(v0, v1, v2);
    pushTri(v1, v3, v2);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  return geo;
}

// Build an authentic Agrou low-poly A-frame canvas expedition tent (Image 2 & 4)
function createCanvasTent(variant: 'light' | 'dark'): {
  tent: THREE.Group;
  leftFlap: THREE.Mesh;
  rightFlap: THREE.Mesh;
} {
  const tent = new THREE.Group();
  const canvasColor = variant === 'light' ? 0xb5ada0 : 0xa39d92;
  const sideWallColor = variant === 'light' ? 0x4b4642 : 0x353c45;
  const trimColor = 0x26292e;

  const canvasMat = new THREE.MeshStandardMaterial({
    color: canvasColor,
    roughness: 0.96,
    metalness: 0.0,
    flatShading: true,
    side: THREE.DoubleSide,
  });
  const wallMat = new THREE.MeshStandardMaterial({
    color: sideWallColor,
    roughness: 0.92,
    metalness: 0.0,
    flatShading: true,
    side: THREE.DoubleSide,
  });
  const interiorMat = new THREE.MeshStandardMaterial({
    color: 0x1a1715,
    roughness: 1.0,
    flatShading: true,
  });
  const woodPoleMat = new THREE.MeshStandardMaterial({
    color: 0x4e3522,
    roughness: 0.92,
    flatShading: true,
  });
  const ropeMat = new THREE.MeshStandardMaterial({
    color: trimColor,
    roughness: 0.95,
  });

  const width = variant === 'light' ? 2.45 : 2.8;
  const length = variant === 'light' ? 3.5 : 3.9;
  const wallH = variant === 'light' ? 0.65 : 0.72;
  const ridgeH = variant === 'light' ? 1.85 : 2.05;

  // Two pitched canvas roof panels
  const slopeLen = Math.hypot(width / 2 + 0.14, ridgeH - wallH + 0.08);
  const slopeAngle = Math.atan2(ridgeH - wallH, width / 2);
  const roofPanelGeo = new THREE.BoxGeometry(slopeLen, 0.055, length + 0.18);

  const leftRoof = new THREE.Mesh(roofPanelGeo, canvasMat);
  leftRoof.position.set(-width / 4 - 0.03, (ridgeH + wallH) / 2, 0);
  leftRoof.rotation.z = slopeAngle;
  leftRoof.castShadow = true;
  leftRoof.receiveShadow = true;
  tent.add(leftRoof);

  const rightRoof = new THREE.Mesh(roofPanelGeo, canvasMat);
  rightRoof.position.set(width / 4 + 0.03, (ridgeH + wallH) / 2, 0);
  rightRoof.rotation.z = -slopeAngle;
  rightRoof.castShadow = true;
  rightRoof.receiveShadow = true;
  tent.add(rightRoof);

  // Lower dark canvas side walls (matches Image 2's charcoal-skirt white-top tents!)
  const sideGeo = new THREE.BoxGeometry(0.06, wallH, length);
  const leftSide = new THREE.Mesh(sideGeo, wallMat);
  leftSide.position.set(-width / 2, wallH / 2, 0);
  leftSide.castShadow = true;
  leftSide.receiveShadow = true;
  tent.add(leftSide);

  const rightSide = new THREE.Mesh(sideGeo, wallMat);
  rightSide.position.set(width / 2, wallH / 2, 0);
  rightSide.castShadow = true;
  rightSide.receiveShadow = true;
  tent.add(rightSide);

  // Back gable closure + dark interior floor shadow
  const backWall = new THREE.Mesh(new THREE.BoxGeometry(width, wallH, 0.06), wallMat);
  backWall.position.set(0, wallH / 2, -length / 2);
  tent.add(backWall);

  const gableShape = new THREE.Shape();
  gableShape.moveTo(-width / 2, wallH);
  gableShape.lineTo(width / 2, wallH);
  gableShape.lineTo(0, ridgeH);
  gableShape.closePath();
  const gableGeo = new THREE.ShapeGeometry(gableShape);
  const backGable = new THREE.Mesh(gableGeo, wallMat);
  backGable.position.set(0, 0, -length / 2);
  tent.add(backGable);

  // Shadowed interior box (gives crisp dark tent opening depth!)
  const innerDark = new THREE.Mesh(
    new THREE.BoxGeometry(width * 0.88, wallH * 0.92, length * 0.88),
    interiorMat
  );
  innerDark.position.set(0, wallH * 0.45, -0.08);
  tent.add(innerDark);

  // Folded-back entrance flaps on front face
  const flapGeo = new THREE.BoxGeometry(0.45, wallH * 1.15, 0.05);
  const leftFlap = new THREE.Mesh(flapGeo, wallMat);
  leftFlap.position.set(-width * 0.36, wallH * 0.56, length / 2 + 0.02);
  leftFlap.rotation.y = 0.32;
  tent.add(leftFlap);

  const rightFlap = new THREE.Mesh(flapGeo, wallMat);
  rightFlap.position.set(width * 0.36, wallH * 0.56, length / 2 + 0.02);
  rightFlap.rotation.y = -0.32;
  tent.add(rightFlap);

  // Wooden ridge pole & front/back upright poles
  const ridgePole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.045, 0.045, length + 0.45, 6),
    woodPoleMat
  );
  ridgePole.rotation.x = Math.PI / 2;
  ridgePole.position.set(0, ridgeH + 0.02, 0);
  tent.add(ridgePole);

  for (const pz of [length / 2 + 0.02, -length / 2 - 0.02]) {
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.05, ridgeH + 0.14, 6),
      woodPoleMat
    );
    post.position.set(0, (ridgeH + 0.14) / 2, pz);
    tent.add(post);
  }

  // Taut diagonal guy-ropes pinned to ground stakes (iconic detail from Image 2!)
  const ropePositions = [
    [-width / 2, wallH, length * 0.44, -width / 2 - 0.72, 0, length * 0.54],
    [width / 2, wallH, length * 0.44, width / 2 + 0.72, 0, length * 0.54],
    [-width / 2, wallH, -length * 0.44, -width / 2 - 0.72, 0, -length * 0.54],
    [width / 2, wallH, -length * 0.44, width / 2 + 0.72, 0, -length * 0.54],
  ];
  for (const [x1, y1, z1, x2, y2, z2] of ropePositions) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dz = z2 - z1;
    const dist = Math.hypot(dx, dy, dz);
    const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, dist, 4), ropeMat);
    rope.position.set((x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2);
    rope.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(dx, dy, dz).normalize()
    );
    tent.add(rope);

    const stake = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.016, 0.18, 5), woodPoleMat);
    stake.position.set(x2, 0.07, z2);
    tent.add(stake);
  }

  return { tent, leftFlap, rightFlap };
}

// Build a lush painterly storybook gnarled oak tree with organic roots, spreading boughs & layered leafy clusters!
function createAncientOakTree(scale: number, woodTex: THREE.Texture): THREE.Group {
  const oak = new THREE.Group();
  const barkMat = new THREE.MeshStandardMaterial({
    color: 0x5c3e26,
    map: woodTex,
    roughness: 0.94,
    metalness: 0.0,
  });
  const canopyDarkMat = new THREE.MeshStandardMaterial({
    color: 0x264419,
    roughness: 0.88,
    metalness: 0.0,
  });
  const canopyMidMat = new THREE.MeshStandardMaterial({
    color: 0x3f6922,
    roughness: 0.84,
    metalness: 0.0,
  });
  const canopyLightMat = new THREE.MeshStandardMaterial({
    color: 0x678f2e,
    roughness: 0.8,
    metalness: 0.0,
  });
  const canopySunMat = new THREE.MeshStandardMaterial({
    color: 0x8db03c,
    roughness: 0.78,
    metalness: 0.0,
  });

  // Flared organic surface roots gripping the grassy soil
  for (let r = 0; r < 5; r++) {
    const ra = (r / 5) * Math.PI * 2 + 0.3;
    const root = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.56, 2.3, 8), barkMat);
    root.position.set(Math.cos(ra) * 1.15, 0.55, Math.sin(ra) * 1.15);
    root.rotation.z = Math.cos(ra) * 0.82;
    root.rotation.x = -Math.sin(ra) * 0.82;
    root.castShadow = true;
    oak.add(root);
  }

  // Smooth gnarled trunk
  const lowerTrunk = new THREE.Mesh(new THREE.CylinderGeometry(0.88, 1.65, 2.9, 12), barkMat);
  lowerTrunk.position.y = 1.4;
  lowerTrunk.castShadow = true;
  lowerTrunk.receiveShadow = true;
  oak.add(lowerTrunk);

  const upperTrunk = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.94, 2.3, 12), barkMat);
  upperTrunk.position.set(0.16, 3.45, 0.08);
  upperTrunk.rotation.z = -0.07;
  upperTrunk.castShadow = true;
  oak.add(upperTrunk);

  const boughSpecs = [
    { angle: 0.25, tilt: 0.95, len: 5.0, r: 0.44, y: 3.9 },
    { angle: 1.4, tilt: 0.88, len: 4.7, r: 0.4, y: 4.15 },
    { angle: 2.55, tilt: 0.96, len: 5.3, r: 0.46, y: 3.85 },
    { angle: 3.7, tilt: 0.9, len: 4.5, r: 0.4, y: 4.1 },
    { angle: 4.9, tilt: 0.94, len: 4.9, r: 0.42, y: 3.95 },
  ];

  // Organic scalloped leafy clump geometry (jittered vertices prevent smooth pancake/mushroom look!)
  const makeLeafClusterGeo = (radius: number, seed: number) => {
    const g = new THREE.IcosahedronGeometry(radius, 1);
    const pos = g.attributes.position as THREE.BufferAttribute;
    for (let vi = 0; vi < pos.count; vi++) {
      const vx = pos.getX(vi);
      const vy = pos.getY(vi);
      const vz = pos.getZ(vi);
      const n = 0.86 + hash2(vx * 3.1 + vy * 2.3, vz * 3.7 + seed) * 0.28;
      pos.setXYZ(vi, vx * n, vy * n, vz * n);
    }
    pos.needsUpdate = true;
    g.computeVertexNormals();
    return g;
  };
  const puffGeoLarge = makeLeafClusterGeo(1.78, 1.1);
  const puffGeoMed = makeLeafClusterGeo(1.32, 3.7);
  const puffGeoSmall = makeLeafClusterGeo(0.92, 6.4);

  for (let i = 0; i < boughSpecs.length; i++) {
    const b = boughSpecs[i];
    const boughPivot = new THREE.Group();
    boughPivot.position.set(0.1, b.y, 0.04);
    boughPivot.rotation.y = b.angle;

    const branch = new THREE.Mesh(
      new THREE.CylinderGeometry(b.r * 0.36, b.r, b.len, 8),
      barkMat
    );
    branch.position.set(0, b.len * 0.44, 0);
    branch.rotation.z = b.tilt;
    boughPivot.add(branch);
    oak.add(boughPivot);

    const tipDist = Math.sin(b.tilt) * b.len * 0.86;
    const tipY = b.y + Math.cos(b.tilt) * b.len * 0.85;
    const cx = Math.cos(-b.angle) * tipDist;
    const cz = Math.sin(-b.angle) * tipDist;

    // Deep shaded lower bough cluster
    const underPuff = new THREE.Mesh(puffGeoLarge, canopyDarkMat);
    underPuff.scale.set(1.12, 0.82, 1.06);
    underPuff.position.set(cx, tipY + 0.55, cz);
    underPuff.rotation.set(i * 0.4, i * 1.1, 0.2);
    underPuff.castShadow = true;
    oak.add(underPuff);

    // Rich mid-canopy rounded leafy clump
    const midPuff = new THREE.Mesh(puffGeoLarge, canopyMidMat);
    midPuff.scale.set(1.06, 0.9, 1.02);
    midPuff.position.set(cx * 0.84, tipY + 1.45, cz * 0.84);
    midPuff.rotation.set(0.2, i * 1.7, -0.15);
    midPuff.castShadow = true;
    oak.add(midPuff);

    // Irregular overhanging leafy sprigs around the bough edge
    for (let k = 0; k < 4; k++) {
      const ka = b.angle + (k - 1.5) * 0.58;
      const sub = new THREE.Mesh(
        k % 2 === 0 ? puffGeoSmall : puffGeoMed,
        k === 1 ? canopySunMat : k === 2 ? canopyLightMat : canopyMidMat
      );
      sub.scale.set(0.95 + (k % 2) * 0.16, 0.78 + (k % 3) * 0.12, 0.92);
      sub.position.set(
        cx + Math.cos(ka) * (1.15 + (k % 2) * 0.45),
        tipY + 0.85 + (k === 1 ? 1.15 : k === 2 ? 0.55 : -0.05),
        cz + Math.sin(ka) * (1.15 + (k % 2) * 0.45)
      );
      sub.rotation.set(k * 0.5, ka, k * 0.3);
      oak.add(sub);
    }

    // Sunlit crown tip cluster
    const topPuff = new THREE.Mesh(puffGeoMed, i % 2 === 0 ? canopySunMat : canopyLightMat);
    topPuff.scale.set(1.05, 0.88, 1.0);
    topPuff.position.set(cx * 0.62, tipY + 2.35, cz * 0.62);
    oak.add(topPuff);
  }

  // Sculpted asymmetric storybook crown dome (irregular clusters, never a flat pancake!)
  const crownClusters = [
    { x: 0.1, y: 6.2, z: 0.0, s: 1.38, sy: 1.05, mat: canopyDarkMat },
    { x: -1.1, y: 7.0, z: 0.8, s: 1.18, sy: 0.96, mat: canopyMidMat },
    { x: 1.25, y: 7.1, z: -0.65, s: 1.15, sy: 0.95, mat: canopyMidMat },
    { x: 0.2, y: 7.55, z: 0.35, s: 1.24, sy: 1.02, mat: canopyLightMat },
    { x: -0.55, y: 8.35, z: 0.45, s: 0.98, sy: 0.88, mat: canopySunMat },
    { x: 0.75, y: 8.15, z: -0.2, s: 0.88, sy: 0.84, mat: canopySunMat },
  ];
  for (let c = 0; c < crownClusters.length; c++) {
    const cc = crownClusters[c];
    const m = new THREE.Mesh(c < 4 ? puffGeoLarge : puffGeoMed, cc.mat);
    m.scale.set(cc.s, cc.sy, cc.s * 0.96);
    m.position.set(cc.x, cc.y, cc.z);
    m.rotation.set(c * 0.3, c * 1.4, c * 0.2);
    m.castShadow = true;
    oak.add(m);
  }

  oak.scale.setScalar(scale);
  return oak;
}

export function buildAgrouEnvironment(
  scene: THREE.Scene,
  clickables: THREE.Object3D[],
  initialBiome: AgrouMapBiome,
  isSoftwareGl: boolean
): AgrouEnvironmentHandle {
  const disposableGeos: THREE.BufferGeometry[] = [];
  const disposableMats: THREE.Material[] = [];
  const disposableTex: THREE.Texture[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    disposableGeos.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    disposableMats.push(m);
    return m;
  };
  const trackTex = <T extends THREE.Texture>(t: T): T => {
    disposableTex.push(t);
    return t;
  };

  // Shared high-craft procedural hand-painted textures
  const terrainDetailTex = trackTex(createTerrainDetailTexture());
  const terrainBumpTex = trackTex(createTerrainBumpTexture());
  const woodGrainTex = trackTex(createWoodGrainTexture());
  const stoneTex = trackTex(createStoneTexture());
  const waterRippleTex = trackTex(createWaterRippleTexture());
  const softSmokeTex = trackTex(createSoftSmokeTexture());
  const stylizedFlameTex = trackTex(createStylizedFlameTexture());

  // =========================================================================
  // 1. GOLDEN-HOUR STORYBOOK SKY DOME + STARS + SOFT CLOUDS
  // =========================================================================
  const skyGeo = trackGeo(new THREE.SphereGeometry(96, 28, 18));
  const skyPos = skyGeo.attributes.position;
  const skyColors = new Float32Array(skyPos.count * 3);
  skyGeo.setAttribute('color', new THREE.BufferAttribute(skyColors, 3));
  const skyMat = trackMat(
    new THREE.MeshBasicMaterial({
      vertexColors: true,
      side: THREE.BackSide,
      fog: false,
      depthWrite: false,
    })
  );
  const skyDome = new THREE.Mesh(skyGeo, skyMat);
  scene.add(skyDome);

  const cTop = new THREE.Color();
  const cMid = new THREE.Color();
  const cHorizon = new THREE.Color();
  const cTmp = new THREE.Color();

  const updateSkyDomeColors = (biome: AgrouMapBiome, isDay: boolean, isBlind: boolean) => {
    if (isBlind) {
      cTop.setHex(0x03050a);
      cMid.setHex(0x060a14);
      cHorizon.setHex(0x0c1322);
    } else if (biome === 'autumn') {
      // Riverside Meadow: warm golden-hour sunlit meadow mist horizon (Matches reference!)
      cTop.setHex(isDay ? 0x89b3c4 : 0x0a1326);
      cMid.setHex(isDay ? 0xd5d2b0 : 0x162642);
      cHorizon.setHex(isDay ? 0xf2e6be : 0x263c5c);
    } else if (biome === 'frostpeak') {
      cTop.setHex(isDay ? 0x5c90c2 : 0x091224);
      cMid.setHex(isDay ? 0x9ec4e0 : 0x162945);
      cHorizon.setHex(isDay ? 0xe5f0f7 : 0x2a4060);
    } else {
      // Redwood Forest Camp: warm dappled golden forest mist sky
      cTop.setHex(isDay ? 0x587478 : 0x080d17);
      cMid.setHex(isDay ? 0x98ab96 : 0x121c2c);
      cHorizon.setHex(isDay ? 0xd9d7b6 : 0x1e2c3e);
    }

    const colAttr = skyGeo.attributes.color as THREE.BufferAttribute;
    for (let i = 0; i < skyPos.count; i++) {
      const yNorm = THREE.MathUtils.clamp(skyPos.getY(i) / 96, 0, 1);
      if (yNorm > 0.35) {
        cTmp.lerpColors(cMid, cTop, (yNorm - 0.35) / 0.65);
      } else {
        cTmp.lerpColors(cHorizon, cMid, yNorm / 0.35);
      }
      colAttr.setXYZ(i, cTmp.r, cTmp.g, cTmp.b);
    }
    colAttr.needsUpdate = true;
  };

  // Night Starfield
  const STAR_COUNT = 130;
  const starGeo = trackGeo(new THREE.OctahedronGeometry(0.14, 0));
  const starMat = trackMat(
    new THREE.MeshBasicMaterial({ color: 0xe6f0ff, transparent: true, opacity: 0.85, fog: false })
  );
  const starInst = new THREE.InstancedMesh(starGeo, starMat, STAR_COUNT);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < STAR_COUNT; i++) {
    const theta = hash2(i, 1.3) * Math.PI * 2;
    const phi = 0.22 + hash2(i, 7.1) * 0.95;
    const r = 72;
    dummy.position.set(
      Math.cos(theta) * Math.cos(phi) * r,
      Math.sin(phi) * r + 8,
      Math.sin(theta) * Math.cos(phi) * r
    );
    dummy.scale.setScalar(0.5 + hash2(i, 3.7) * 1.1);
    dummy.updateMatrix();
    starInst.setMatrixAt(i, dummy.matrix);
  }
  starInst.instanceMatrix.needsUpdate = true;
  scene.add(starInst);

  // Soft Warm Sunlit Horizon Clouds
  const cloudGroup = new THREE.Group();
  const cloudMat = trackMat(
    new THREE.MeshBasicMaterial({ color: 0xf7f1dd, transparent: true, opacity: 0.44, fog: false })
  );
  const cloudClusters: Array<{ mesh: THREE.Group; baseAngle: number; radius: number; height: number; speed: number }> = [];
  for (let c = 0; c < 8; c++) {
    const cl = new THREE.Group();
    const baseAngle = (c / 8) * Math.PI * 2 + 0.35;
    const radius = 56 + (c % 3) * 8;
    const height = 22 + (c % 4) * 3.5;
    for (let p = 0; p < 4; p++) {
      const puff = new THREE.Mesh(
        trackGeo(new THREE.IcosahedronGeometry(2.6 + (p % 2) * 1.4, 1)),
        cloudMat
      );
      puff.position.set((p - 1.5) * 2.5, (p % 2) * 0.6, (p % 3 - 1) * 0.8);
      puff.scale.set(1.6, 0.38, 0.9);
      cl.add(puff);
    }
    cloudGroup.add(cl);
    cloudClusters.push({ mesh: cl, baseAngle, radius, height, speed: 0.008 + (c % 3) * 0.003 });
  }
  scene.add(cloudGroup);

  // =========================================================================
  // 2. SMOOTH HAND-PAINTED TEXTURED & VERTEX-COLORED STORYBOOK TERRAIN
  // =========================================================================
  const terrainGeo = trackGeo(new THREE.PlaneGeometry(164, 164, 74, 74));
  terrainGeo.rotateX(-Math.PI / 2);
  const tPos = terrainGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < tPos.count; i++) {
    const ux = tPos.getX(i) / 82;
    const uz = tPos.getZ(i) / 82;
    tPos.setX(i, Math.sign(ux) * Math.pow(Math.abs(ux), 1.24) * 82);
    tPos.setZ(i, Math.sign(uz) * Math.pow(Math.abs(uz), 1.24) * 82);
  }

  const terrainColors = new Float32Array(tPos.count * 3);
  terrainGeo.setAttribute('color', new THREE.BufferAttribute(terrainColors, 3));

  const terrainMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      vertexColors: true,
      map: terrainDetailTex,
      bumpMap: terrainBumpTex,
      bumpScale: 0.14,
      roughness: 0.93,
      metalness: 0.0,
      flatShading: false,
    })
  );
  const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
  terrainMesh.receiveShadow = true;
  scene.add(terrainMesh);

  const cSand = new THREE.Color();
  const cSandWarm = new THREE.Color();
  const cSandDark = new THREE.Color();
  const cGrass = new THREE.Color();
  const cGrassSun = new THREE.Color();
  const cGrassDeep = new THREE.Color();
  const cCliff = new THREE.Color();
  const cBank = new THREE.Color();
  const cVert = new THREE.Color();

  const rebuildTerrainGeometry = (biome: AgrouMapBiome, isDay: boolean) => {
    const pal = AGROU_BIOMES[biome];
    cSand.setHex(isDay ? pal.clearingDirt : biome === 'frostpeak' ? 0x5c6875 : 0x523c28);
    cSandWarm.copy(cSand).offsetHSL(0.015, 0.05, 0.08);
    cSandDark.copy(cSand).multiplyScalar(0.76);
    cGrass.setHex(isDay ? pal.groundDay : pal.groundNight);
    cGrassSun.copy(cGrass).offsetHSL(-0.025, 0.06, 0.11);
    cGrassDeep.copy(cGrass).multiplyScalar(0.72);
    cCliff.setHex(isDay ? 0x565c58 : 0x242a2e);
    cBank.setHex(isDay ? 0x7a6544 : 0x3c3426);

    const colAttr = terrainGeo.attributes.color as THREE.BufferAttribute;
    for (let i = 0; i < tPos.count; i++) {
      const vx = tPos.getX(i);
      const vz = tPos.getZ(i);
      const vy = sampleTerrainHeight(vx, vz, biome);
      tPos.setY(i, vy);

      const r = Math.hypot(vx, vz);
      const ang = Math.atan2(vz, vx);
      const edgeRadius = 11.1 + Math.sin(ang * 5) * 0.72 + Math.cos(ang * 9) * 0.38;
      const sandToGrass = THREE.MathUtils.smoothstep(r, edgeRadius - 1.9, edgeRadius + 1.85);

      // Rich organic earth mottling inside the campfire clearing
      const dirtMottle =
        0.5 +
        0.32 * Math.sin(vx * 0.38 + vz * 0.29) +
        0.18 * Math.cos(vx * 0.72 - vz * 0.61);
      cVert.lerpColors(cSandDark, cSandWarm, THREE.MathUtils.clamp(dirtMottle, 0, 1));
      // Warm campfire-lit soil ring near center
      if (r < 4.5) {
        cVert.lerp(cSandWarm, (1 - r / 4.5) * 0.28);
      }

      // Smooth lush blend into meadow grass with golden sunlit hill crests & deep shaded hollows
      if (sandToGrass > 0.001) {
        const grassShade = 0.5 + 0.5 * Math.sin(vx * 0.13 + vz * 0.11);
        const hillSun = THREE.MathUtils.clamp((vy - 0.6) / 3.8, 0, 1);
        cTmp.lerpColors(cGrassDeep, cGrass, grassShade);
        if (isDay && biome !== 'frostpeak') {
          cTmp.lerp(cGrassSun, hillSun * 0.65);
        }
        cVert.lerp(cTmp, sandToGrass);
      }

      if (biome === 'autumn') {
        const distRiver = Math.abs(vz - getRiverCenterZ(vx));
        if (distRiver < 3.1) {
          cVert.lerp(cBank, (1 - distRiver / 3.1) * 0.55);
        }
      }
      if (vy > 3.8 && r > 18) {
        const slopeApprox = Math.abs(
          sampleTerrainHeight(vx + 0.8, vz, biome) - sampleTerrainHeight(vx - 0.8, vz, biome)
        );
        if (slopeApprox > 0.75) {
          cVert.lerp(cCliff, THREE.MathUtils.clamp((slopeApprox - 0.75) * 0.75, 0, 0.75));
        }
      }
      const microJitter = (hash2(Math.floor(vx * 0.9), Math.floor(vz * 0.9)) - 0.5) * 0.025;
      cVert.offsetHSL(0, 0, microJitter);
      colAttr.setXYZ(i, cVert.r, cVert.g, cVert.b);
    }
    tPos.needsUpdate = true;
    colAttr.needsUpdate = true;
    terrainGeo.computeVertexNormals();
  };

  // =========================================================================
  // 3. SCATTERED RIVER STONES, FALLEN LEAVES, CURVED GRASS TUFTS & WILDFLOWERS
  // =========================================================================
  const PEBBLE_COUNT = 125;
  const pebbleGeo = trackGeo(new THREE.IcosahedronGeometry(0.15, 1));
  const pebbleMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: stoneTex,
      roughness: 0.94,
      metalness: 0.01,
    })
  );
  const pebbleInst = new THREE.InstancedMesh(pebbleGeo, pebbleMat, PEBBLE_COUNT);
  pebbleInst.receiveShadow = true;

  const pebblePalette = [0x6b5844, 0x5c4b3a, 0x78644e, 0x4f4031, 0x665441];
  for (let i = 0; i < PEBBLE_COUNT; i++) {
    const a = hash2(i, 4.1) * Math.PI * 2;
    const rNorm = Math.pow(hash2(i, 9.7), 0.82);
    const r = 1.9 + rNorm * 9.5;
    const px = Math.cos(a) * r;
    const pz = Math.sin(a) * r;
    const sx = 0.35 + hash2(i, 2.3) * 0.85;
    const sz = 0.32 + hash2(i, 5.9) * 0.78;
    const sy = 0.08 + hash2(i, 8.2) * 0.14;

    dummy.position.set(px, sy * 0.04, pz);
    dummy.rotation.set(
      (hash2(i, 1.1) - 0.5) * 0.16,
      hash2(i, 6.4) * Math.PI * 2,
      (hash2(i, 3.3) - 0.5) * 0.16
    );
    dummy.scale.set(sx, sy, sz);
    dummy.updateMatrix();
    pebbleInst.setMatrixAt(i, dummy.matrix);
    cTmp.setHex(pebblePalette[i % pebblePalette.length]);
    pebbleInst.setColorAt(i, cTmp);
  }
  pebbleInst.instanceMatrix.needsUpdate = true;
  if (pebbleInst.instanceColor) pebbleInst.instanceColor.needsUpdate = true;
  scene.add(pebbleInst);

  // Scattered Fallen Warm Leaves & Twigs across the earthy clearing (rich foreground detail from reference!)
  const LEAF_COUNT = 160;
  const leafGeo = trackGeo(new THREE.CircleGeometry(0.11, 5));
  leafGeo.rotateX(-Math.PI / 2);
  const leafMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.92,
      metalness: 0.0,
      side: THREE.DoubleSide,
    })
  );
  const leafInst = new THREE.InstancedMesh(leafGeo, leafMat, LEAF_COUNT);
  leafInst.receiveShadow = true;
  const leafPalette = [0xb36b2c, 0x945224, 0xc98a38, 0x735629, 0x824420];
  for (let i = 0; i < LEAF_COUNT; i++) {
    const a = hash2(i, 2.7) * Math.PI * 2;
    const r = 1.8 + Math.pow(hash2(i, 6.3), 0.72) * 9.5;
    const lx = Math.cos(a) * r;
    const lz = Math.sin(a) * r;
    dummy.position.set(lx, 0.014, lz);
    dummy.rotation.set(0, hash2(i, 8.9) * Math.PI * 2, 0);
    dummy.scale.set(0.65 + hash2(i, 4.4) * 0.85, 1, 0.45 + hash2(i, 9.2) * 0.55);
    dummy.updateMatrix();
    leafInst.setMatrixAt(i, dummy.matrix);
    cTmp.setHex(leafPalette[i % leafPalette.length]);
    leafInst.setColorAt(i, cTmp);
  }
  leafInst.instanceMatrix.needsUpdate = true;
  if (leafInst.instanceColor) leafInst.instanceColor.needsUpdate = true;
  scene.add(leafInst);

  // Instanced Lush Curved Multi-Blade Grass Tufts carpeting the clearing rim, riverbank & hills!
  const GRASS_COUNT = isSoftwareGl ? 620 : 980;
  const grassGeo = trackGeo(createGrassTuftGeometry());
  const grassMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      vertexColors: true,
      roughness: 0.84,
      metalness: 0.0,
      side: THREE.DoubleSide,
    })
  );
  const grassInst = new THREE.InstancedMesh(grassGeo, grassMat, GRASS_COUNT);
  const grassPlacements: Array<{ x: number; z: number; rotY: number; scale: number; tint: number }> = [];
  for (let i = 0; i < GRASS_COUNT; i++) {
    const a = (i / GRASS_COUNT) * Math.PI * 2 + (hash2(i, 2.1) - 0.5) * 0.22;
    const edgeR = 10.6 + Math.sin(a * 5) * 0.65 + Math.cos(a * 9) * 0.35;
    let r: number;
    if (i < 260) {
      // Dense foreground & clearing-edge grass rim framing the campfire soil
      r = edgeR - 0.65 + hash2(i, 6.2) * 2.2;
    } else if (i < 520) {
      r = edgeR + 1.1 + hash2(i, 5.1) * 7.0;
    } else {
      r = edgeR + 6.0 + Math.pow(hash2(i, 7.7), 1.15) * 17.5;
    }
    grassPlacements.push({
      x: Math.cos(a) * r,
      z: Math.sin(a) * r,
      rotY: hash2(i, 4.9) * Math.PI * 2,
      scale: 0.92 + hash2(i, 8.8) * 1.05,
      tint: hash2(i, 3.2),
    });
  }
  scene.add(grassInst);

  // Instanced Charming Meadow Wildflowers (daisies, yellow buttercups, rose petals tucked into the grass!)
  const FLOWER_COUNT = isSoftwareGl ? 150 : 240;
  const flowerGeo = trackGeo(new THREE.DodecahedronGeometry(0.055, 0));
  const flowerMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.78,
      metalness: 0.0,
    })
  );
  const flowerInst = new THREE.InstancedMesh(flowerGeo, flowerMat, FLOWER_COUNT);
  const flowerPlacements: Array<{ x: number; z: number; scale: number; colorHex: number }> = [];
  const flowerColors = [0xfff5cc, 0xfacc15, 0xfef9c3, 0xf472b6, 0xe11d48, 0xfde047];
  for (let i = 0; i < FLOWER_COUNT; i++) {
    // Cluster 3-4 blooms per wildflower patch around the clearing rim & outer meadow
    const clusterIdx = Math.floor(i / 4);
    const ca = hash2(clusterIdx, 1.9) * Math.PI * 2;
    const edgeR = 11.2 + Math.sin(ca * 5) * 0.65;
    const cr = edgeR + 0.4 + hash2(clusterIdx, 5.3) * 8.5;
    const fx = Math.cos(ca) * cr + (hash2(i, 3.1) - 0.5) * 0.55;
    const fz = Math.sin(ca) * cr + (hash2(i, 7.7) - 0.5) * 0.55;
    flowerPlacements.push({
      x: fx,
      z: fz,
      scale: 0.52 + hash2(i, 4.8) * 0.55,
      colorHex: flowerColors[clusterIdx % flowerColors.length],
    });
  }
  scene.add(flowerInst);

  const repositionGrassForBiome = (biome: AgrouMapBiome, isDay: boolean) => {
    const cG1 = new THREE.Color(
      biome === 'frostpeak' ? (isDay ? 0x9cb5c7 : 0x506880) : isDay ? 0x3b631e : 0x1c3318
    );
    const cG2 = new THREE.Color(
      biome === 'frostpeak' ? (isDay ? 0x7b96aa : 0x3d5369) : isDay ? 0x638a2b : 0x294a20
    );

    for (let i = 0; i < GRASS_COUNT; i++) {
      const g = grassPlacements[i];
      const inRiver = biome === 'autumn' && Math.abs(g.z - getRiverCenterZ(g.x)) < 2.25;
      if (inRiver) {
        dummy.position.set(0, -20, 0);
        dummy.scale.setScalar(0.001);
      } else {
        const y = sampleTerrainHeight(g.x, g.z, biome);
        dummy.position.set(g.x, y - 0.04, g.z);
        dummy.rotation.set(0, g.rotY, 0);
        dummy.scale.setScalar(g.scale);
      }
      dummy.updateMatrix();
      grassInst.setMatrixAt(i, dummy.matrix);
      cTmp.lerpColors(cG1, cG2, g.tint);
      grassInst.setColorAt(i, cTmp);
    }
    grassInst.instanceMatrix.needsUpdate = true;
    if (grassInst.instanceColor) grassInst.instanceColor.needsUpdate = true;

    for (let i = 0; i < FLOWER_COUNT; i++) {
      const fl = flowerPlacements[i];
      const hideFlower =
        biome === 'frostpeak' ||
        (biome === 'autumn' && Math.abs(fl.z - getRiverCenterZ(fl.x)) < 2.5);
      if (hideFlower) {
        dummy.position.set(0, -20, 0);
        dummy.scale.setScalar(0.001);
      } else {
        const y = sampleTerrainHeight(fl.x, fl.z, biome);
        dummy.position.set(fl.x, y + 0.11 + (i % 3) * 0.04, fl.z);
        dummy.rotation.set(0.2, i * 1.1, 0.15);
        dummy.scale.set(fl.scale * 1.05, fl.scale * 0.45, fl.scale * 1.05);
      }
      dummy.updateMatrix();
      flowerInst.setMatrixAt(i, dummy.matrix);
      cTmp.setHex(fl.colorHex);
      if (!isDay) cTmp.multiplyScalar(0.42);
      flowerInst.setColorAt(i, cTmp);
    }
    flowerInst.instanceMatrix.needsUpdate = true;
    if (flowerInst.instanceColor) flowerInst.instanceColor.needsUpdate = true;

    leafInst.visible = biome !== 'frostpeak';
  };

  // =========================================================================
  // 4. RADIANT AGROU CAMPFIRE HEARTH + GOLDEN GROUND GLOW POOL + SHIMMER
  // =========================================================================
  const campfireGroup = new THREE.Group();
  scene.add(campfireGroup);

  // Textured rounded hearth stones
  const hearthStoneMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x6b655c, map: stoneTex, roughness: 0.92 })
  );
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + 0.15;
    const st = new THREE.Mesh(trackGeo(new THREE.IcosahedronGeometry(0.24, 1)), hearthStoneMat);
    st.scale.set(1.22, 0.48, 0.95);
    st.position.set(Math.cos(a) * 0.76, 0.08, Math.sin(a) * 0.76);
    st.rotation.y = a;
    st.receiveShadow = true;
    campfireGroup.add(st);
  }

  // Glowing ember bed under logs
  const emberBedMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x3b1808,
      emissive: 0xff6200,
      emissiveIntensity: 1.85,
      roughness: 0.9,
      fog: false,
    })
  );
  const emberBed = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.56, 0.64, 0.09, 12)), emberBedMat);
  emberBed.position.y = 0.04;
  campfireGroup.add(emberBed);

  // Crossed wood-textured campfire logs
  const logMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x4c2e19,
      map: woodGrainTex,
      emissive: 0x7c2200,
      emissiveIntensity: 0.45,
      roughness: 0.9,
    })
  );
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const log = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.088, 0.11, 1.22, 8)), logMat);
    log.position.set(Math.cos(a) * 0.25, 0.25, Math.sin(a) * 0.25);
    log.rotation.z = Math.PI / 2 - 0.56;
    log.rotation.y = -a;
    campfireGroup.add(log);
  }

  // Soft additive radial golden ground light pool (Warm campfire floor illumination without washout!)
  const fireGlowTex = createRadialGlowTexture(
    'rgba(255, 224, 145, 0.68)',
    'rgba(255, 148, 38, 0.36)',
    'rgba(255, 98, 14, 0.08)'
  );
  disposableTex.push(fireGlowTex);
  const fireGlowPoolMat = trackMat(
    new THREE.MeshBasicMaterial({
      map: fireGlowTex,
      transparent: true,
      opacity: 0.52,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    })
  );
  const fireGlowPool = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(7.8, 7.8)), fireGlowPoolMat);
  fireGlowPool.rotation.x = -Math.PI / 2;
  fireGlowPool.position.y = 0.025;
  campfireGroup.add(fireGlowPool);

  // Volumetric Painterly Blazing Campfire Flames (Crossed luminous flame planes + soft glow core — ZERO blocky cones!)
  const flameCardMat = trackMat(
    new THREE.MeshBasicMaterial({
      map: stylizedFlameTex,
      color: 0xffb84d,
      transparent: true,
      opacity: 0.88,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: false,
      toneMapped: false,
    })
  );
  const flameCoreMat = trackMat(
    new THREE.MeshBasicMaterial({
      map: stylizedFlameTex,
      color: 0xffe8a3,
      transparent: true,
      opacity: 0.82,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: false,
      toneMapped: false,
    })
  );

  const flameGroup = new THREE.Group();
  flameGroup.position.y = 0.12;
  campfireGroup.add(flameGroup);

  const flamePlaneGeo = trackGeo(new THREE.PlaneGeometry(1.45, 1.75));
  const flameOuter = new THREE.Group();
  for (let p = 0; p < 3; p++) {
    const card = new THREE.Mesh(flamePlaneGeo, flameCardMat);
    card.position.y = 0.72;
    card.rotation.y = (p / 3) * Math.PI;
    flameOuter.add(card);
  }
  flameGroup.add(flameOuter);

  const flameCore = new THREE.Group();
  for (let p = 0; p < 2; p++) {
    const coreCard = new THREE.Mesh(flamePlaneGeo, flameCoreMat);
    coreCard.scale.set(0.68, 0.72, 0.68);
    coreCard.position.y = 0.56;
    coreCard.rotation.y = (p / 2) * Math.PI + 0.4;
    flameCore.add(coreCard);
  }
  flameGroup.add(flameCore);

  const flameSide1 = new THREE.Mesh(flamePlaneGeo, flameCardMat);
  flameSide1.scale.set(0.65, 0.7, 0.65);
  flameSide1.position.set(0.24, 0.55, 0.14);
  flameSide1.rotation.set(0, 0.6, -0.18);
  flameGroup.add(flameSide1);

  const flameSide2 = new THREE.Mesh(flamePlaneGeo, flameCardMat);
  flameSide2.scale.set(0.62, 0.66, 0.62);
  flameSide2.position.set(-0.22, 0.52, -0.14);
  flameSide2.rotation.set(0, -0.5, 0.18);
  flameGroup.add(flameSide2);

  // Soft Billowing Campfire Smoke Plume Sprites (matches reference painterly smoke!) + Tiny Rising Ember Sparks
  const FIRE_SMOKE_COUNT = 16;
  const smokeSprites: THREE.Sprite[] = [];
  const smokeSpriteMats: THREE.SpriteMaterial[] = [];
  const fireSmokeData = Array.from({ length: FIRE_SMOKE_COUNT }, (_, i) => {
    const mat = trackMat(
      new THREE.SpriteMaterial({
        map: softSmokeTex,
        color: 0xe8ded2,
        transparent: true,
        opacity: 0.36,
        depthWrite: false,
      })
    );
    const sp = new THREE.Sprite(mat);
    scene.add(sp);
    smokeSprites.push(sp);
    smokeSpriteMats.push(mat);
    return {
      x: (hash2(i, 1.2) - 0.5) * 0.42,
      y: 0.85 + (i / FIRE_SMOKE_COUNT) * 2.8,
      z: (hash2(i, 5.1) - 0.5) * 0.42,
      vy: 0.48 + hash2(i, 8.4) * 0.35,
      phase: hash2(i, 9.3) * Math.PI * 2,
    };
  });

  // Glowing rising tiny campfire ember sparks
  const SPARK_COUNT = 24;
  const sparkGeo = trackGeo(new THREE.OctahedronGeometry(0.042, 0));
  const sparkMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xffd566,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
      toneMapped: false,
    })
  );
  const fireSparkInst = new THREE.InstancedMesh(sparkGeo, sparkMat, SPARK_COUNT);
  const fireSparkData = Array.from({ length: SPARK_COUNT }, (_, i) => ({
    x: (hash2(i, 3.1) - 0.5) * 0.65,
    y: 0.4 + hash2(i, 6.4) * 2.4,
    z: (hash2(i, 9.7) - 0.5) * 0.65,
    vy: 0.72 + hash2(i, 2.2) * 0.65,
    phase: hash2(i, 4.9) * Math.PI * 2,
  }));
  scene.add(fireSparkInst);

  // Campfire Voting Abstention Ring (subtle during discussion, pulses during voting)
  const campfireVoteRingMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.0,
      side: THREE.DoubleSide,
    })
  );
  const campfireVoteRing = new THREE.Mesh(
    trackGeo(new THREE.RingGeometry(1.12, 1.32, 28)),
    campfireVoteRingMat
  );
  campfireVoteRing.rotation.x = -Math.PI / 2;
  campfireVoteRing.position.y = 0.032;
  campfireGroup.add(campfireVoteRing);

  // Clickable Campfire Hitbox for Abstention Vote
  const campfireHitbox = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(1.25, 1.25, 2.2, 10)),
    trackMat(new THREE.MeshBasicMaterial({ visible: false }))
  );
  campfireHitbox.position.y = 1.1;
  campfireHitbox.userData = { isCampfire: true };
  campfireGroup.add(campfireHitbox);
  clickables.push(campfireHitbox);

  // Intense Warm Campfire PointLight illuminating seated adventurers & clearing sand!
  const fireLight = new THREE.PointLight(0xff922b, 14.5, 24, 1.45);
  fireLight.position.set(0, 1.55, 0);
  scene.add(fireLight);

  // =========================================================================
  // 5. REDWOOD FOREST CAMP LAYER ('forest' & 'frostpeak' — Matches Images 2 & 4!)
  // =========================================================================
  const redwoodCampGroup = new THREE.Group();
  scene.add(redwoodCampGroup);

  // 5a. Giant Towering Redwood Trunks (40 massive bark-textured trunks rising gracefully around the glade!)
  const redwoodBarkMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x3b271c,
      map: woodGrainTex,
      roughness: 0.94,
    })
  );
  const redwoodCanopyMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x264c33,
      roughness: 0.88,
    })
  );
  const redwoodCanopyHiMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x3a6e3e,
      roughness: 0.85,
    })
  );

  const REDWOOD_COUNT = 40;
  const trunkGeo = trackGeo(new THREE.CylinderGeometry(0.58, 1.12, 34, 12));
  const trunkInst = new THREE.InstancedMesh(trunkGeo, redwoodBarkMat, REDWOOD_COUNT);
  trunkInst.castShadow = !isSoftwareGl;
  trunkInst.receiveShadow = true;

  // Slender, graceful conifer spire tiers framing the distant forest horizon without ever obstructing panoramic/overhead camera views
  const canopyConeGeo = trackGeo(new THREE.ConeGeometry(3.05, 4.6, 10));
  const canopyInst = new THREE.InstancedMesh(canopyConeGeo, redwoodCanopyMat, REDWOOD_COUNT * 3);

  for (let i = 0; i < REDWOOD_COUNT; i++) {
    const isInner = i < 18;
    const idx = isInner ? i : i - 18;
    const total = isInner ? 18 : 22;
    const baseAng = (idx / total) * Math.PI * 2 + (isInner ? 0.14 : 0.31);
    const jitterAng = (hash2(i, 1.9) - 0.5) * 0.15;
    const ang = baseAng + jitterAng;
    // Wide open forest glade: inner trunks at r=30.5..37.5m, outer trunks at r=40..54m
    const r = isInner ? 30.5 + hash2(i, 3.4) * 7.0 : 40.0 + hash2(i, 6.8) * 14.0;

    const tx = Math.cos(ang) * r;
    const tz = Math.sin(ang) * r;
    const ty = sampleTerrainHeight(tx, tz, 'forest');
    const radiusScale = (isInner ? 0.82 : 0.94) + hash2(i, 5.5) * 0.32;
    const heightScale = 0.88 + hash2(i, 7.2) * 0.32;

    dummy.position.set(tx, ty + 14.5 * heightScale - 0.8, tz);
    dummy.rotation.set(
      (hash2(i, 2.2) - 0.5) * 0.035,
      hash2(i, 4.4) * Math.PI * 2,
      (hash2(i, 8.8) - 0.5) * 0.035
    );
    dummy.scale.set(radiusScale, heightScale, radiusScale);
    dummy.updateMatrix();
    trunkInst.setMatrixAt(i, dummy.matrix);

    for (let tier = 0; tier < 3; tier++) {
      dummy.position.set(tx, ty + 8.8 + tier * 2.6 + hash2(i, tier + 2) * 0.85, tz);
      dummy.rotation.set(0, hash2(i, tier + 5) * Math.PI, 0);
      const cs = radiusScale * (1.06 - tier * 0.18);
      dummy.scale.set(cs, 0.95, cs);
      dummy.updateMatrix();
      canopyInst.setMatrixAt(i * 3 + tier, dummy.matrix);
    }
  }
  trunkInst.instanceMatrix.needsUpdate = true;
  canopyInst.instanceMatrix.needsUpdate = true;
  redwoodCampGroup.add(trunkInst);
  redwoodCampGroup.add(canopyInst);

  // 5b. 6 Pitched Canvas A-Frame Expedition Tents encircling the expanded clearing
  const redwoodObstacles: EnvObstacle[] = [];
  const meadowObstacles: EnvObstacle[] = [];
  const tentFlaps: Array<{ mesh: THREE.Mesh; baseRotY: number; phase: number }> = [];
  const tentSpecs: Array<{ x: number; z: number; rotY: number; variant: 'light' | 'dark' }> = [
    { x: -13.6, z: 10.6, rotY: 0.72, variant: 'dark' },
    { x: 12.8, z: 10.4, rotY: -0.78, variant: 'light' },
    { x: -16.2, z: -0.8, rotY: 1.48, variant: 'light' },
    { x: -9.4, z: -15.4, rotY: 2.65, variant: 'dark' },
    { x: 5.6, z: -15.8, rotY: -2.75, variant: 'light' },
    { x: 15.2, z: -8.8, rotY: -1.95, variant: 'light' },
  ];
  tentSpecs.forEach((ts, idx) => {
    const { tent, leftFlap, rightFlap } = createCanvasTent(ts.variant);
    const ty = sampleTerrainHeight(ts.x, ts.z, 'forest');
    tent.position.set(ts.x, ty - 0.03, ts.z);
    tent.rotation.y = ts.rotY;
    redwoodCampGroup.add(tent);
    tentFlaps.push(
      { mesh: leftFlap, baseRotY: 0.32, phase: idx * 1.1 },
      { mesh: rightFlap, baseRotY: -0.32, phase: idx * 1.1 + 1.5 }
    );
    redwoodObstacles.push({
      kind: 'obb',
      x: ts.x,
      z: ts.z,
      hx: ts.variant === 'light' ? 1.32 : 1.5,
      hz: ts.variant === 'light' ? 1.85 : 2.05,
      rotY: ts.rotY,
    });
  });

  // 5c. Stacked Cut Timber Log Pile near foreground clearing edge
  const timberPile = new THREE.Group();
  const timberLogMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x5c3f2a, map: woodGrainTex, roughness: 0.9 })
  );
  const timberEndMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xa8865c, roughness: 0.88 })
  );
  const logRows = [
    [-0.58, 0.25], [0, 0.25], [0.58, 0.25],
    [-0.29, 0.72], [0.29, 0.72],
    [0, 1.18],
  ];
  for (const [lx, ly] of logRows) {
    const tLog = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.27, 0.29, 4.6, 10)),
      [timberLogMat, timberEndMat, timberEndMat]
    );
    tLog.rotation.x = Math.PI / 2;
    tLog.position.set(lx, ly, 0);
    tLog.castShadow = !isSoftwareGl;
    tLog.receiveShadow = true;
    timberPile.add(tLog);
  }
  timberPile.position.set(-3.4, 0, 14.4);
  timberPile.rotation.y = 0.72;
  redwoodCampGroup.add(timberPile);
  redwoodObstacles.push({ kind: 'obb', x: -3.4, z: 14.4, hx: 0.96, hz: 2.38, rotY: 0.72 });

  // 5d. Expedition Camp Props: Supply Barrels, Banded Chest, Camp Table with Bottles, Hide Drying Rack!
  const barrelWoodMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x6b472c, map: woodGrainTex, roughness: 0.86 })
  );
  const darkIronMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x2a3036, roughness: 0.5, metalness: 0.58 })
  );
  const createBarrel = (x: number, z: number) => {
    const bg = new THREE.Group();
    const body = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.42, 0.38, 0.95, 8)), barrelWoodMat);
    body.position.y = 0.48;
    body.castShadow = !isSoftwareGl;
    bg.add(body);
    for (const ry of [0.22, 0.72]) {
      const hoop = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.435, 0.435, 0.08, 8)), darkIronMat);
      hoop.position.y = ry;
      bg.add(hoop);
    }
    bg.position.set(x, sampleTerrainHeight(x, z, 'forest'), z);
    redwoodCampGroup.add(bg);
    redwoodObstacles.push({ kind: 'circle', x, z, r: 0.5 });
  };
  createBarrel(14.2, -2.6);
  createBarrel(13.4, -3.5);
  createBarrel(-12.2, -12.4);

  // Camp Supply Table + Bottles + Banded Expedition Chest
  const campTable = new THREE.Group();
  const tableTop = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.7, 0.1, 0.95)), barrelWoodMat);
  tableTop.position.y = 0.76;
  campTable.add(tableTop);
  for (const [lx, lz] of [[-0.7, -0.35], [0.7, -0.35], [-0.7, 0.35], [0.7, 0.35]]) {
    const leg = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.1, 0.76, 0.1)), barrelWoodMat);
    leg.position.set(lx, 0.38, lz);
    campTable.add(leg);
  }
  const bottleMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x3b6e4c, roughness: 0.25 }));
  const bottle = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.05, 0.08, 0.34, 6)), bottleMat);
  bottle.position.set(-0.25, 0.98, 0.05);
  campTable.add(bottle);
  const mug = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.06, 0.06, 0.14, 6)), timberEndMat);
  mug.position.set(0.28, 0.88, -0.1);
  campTable.add(mug);
  campTable.position.set(14.6, sampleTerrainHeight(14.6, 2.2, 'forest'), 2.2);
  campTable.rotation.y = -1.2;
  redwoodCampGroup.add(campTable);
  redwoodObstacles.push({ kind: 'obb', x: 14.6, z: 2.2, hx: 0.9, hz: 0.52, rotY: -1.2 });

  const supplyChest = new THREE.Group();
  const chestBox = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.25, 0.82, 0.82)), darkIronMat);
  chestBox.position.y = 0.41;
  supplyChest.add(chestBox);
  const chestTrim = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.3, 0.12, 0.86)), barrelWoodMat);
  chestTrim.position.y = 0.65;
  supplyChest.add(chestTrim);
  supplyChest.position.set(15.8, sampleTerrainHeight(15.8, 3.2, 'forest'), 3.2);
  supplyChest.rotation.y = -0.35;
  redwoodCampGroup.add(supplyChest);
  redwoodObstacles.push({ kind: 'obb', x: 15.8, z: 3.2, hx: 0.68, hz: 0.46, rotY: -0.35 });

  // Wooden Hide-Drying Rack with stretched pelt (Exact prop from left of Image 2!)
  const dryingRack = new THREE.Group();
  for (const sx of [-0.65, 0.65]) {
    const pole = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.045, 0.055, 1.9, 5)), timberLogMat);
    pole.position.set(sx, 0.9, 0);
    pole.rotation.z = sx < 0 ? -0.18 : 0.18;
    dryingRack.add(pole);
  }
  const crossBar = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.04, 0.04, 1.55, 5)), timberLogMat);
  crossBar.rotation.z = Math.PI / 2;
  crossBar.position.set(0, 1.58, 0);
  dryingRack.add(crossBar);
  const peltMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xb8a389, roughness: 0.96, flatShading: true, side: THREE.DoubleSide })
  );
  const pelt = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(0.95, 1.15, 2, 2)), peltMat);
  pelt.position.set(0, 0.98, 0.06);
  pelt.rotation.x = -0.12;
  dryingRack.add(pelt);
  dryingRack.position.set(-11.6, sampleTerrainHeight(-11.6, 3.8, 'forest'), 3.8);
  dryingRack.rotation.y = 0.95;
  redwoodCampGroup.add(dryingRack);
  redwoodObstacles.push({ kind: 'obb', x: -11.6, z: 3.8, hx: 0.82, hz: 0.3, rotY: 0.95 });

  // 5e. Smooth Weathered Mossy Rock Ledges & Foreground Boulders framing the glade
  const mossyRockMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x676f73, map: stoneTex, roughness: 0.88 })
  );
  const mossCapMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x52842e, roughness: 0.9 })
  );
  const rockLedges = [
    { x: -16.5, z: -19.0, sx: 4.8, sy: 2.7, sz: 3.6 },
    { x: -3.5, z: -21.5, sx: 5.2, sy: 3.0, sz: 3.8 },
    { x: 11.8, z: -20.5, sx: 5.4, sy: 3.3, sz: 4.0 },
    { x: 19.2, z: -13.5, sx: 4.2, sy: 2.4, sz: 3.4 },
    // Foreground framing mossy boulders near clearing edge
    { x: -11.4, z: 5.2, sx: 1.5, sy: 0.95, sz: 1.25 },
    { x: 11.6, z: 8.8, sx: 1.55, sy: 0.95, sz: 1.3 },
    { x: 11.2, z: -6.2, sx: 1.35, sy: 0.88, sz: 1.15 },
  ];
  for (let rli = 0; rli < rockLedges.length; rli++) {
    const rl = rockLedges[rli];
    const lg = new THREE.Group();
    const isLargeLedge = rl.sx > 3.0;
    const subRocks = isLargeLedge
      ? [
          { ox: 0, oy: 0.42, oz: 0, sx: 0.76, sy: 0.85, sz: 0.78, ry: 0.4 },
          { ox: -rl.sx * 0.46, oy: 0.28, oz: rl.sz * 0.16, sx: 0.54, sy: 0.62, sz: 0.56, ry: 1.3 },
          { ox: rl.sx * 0.44, oy: 0.3, oz: -rl.sz * 0.14, sx: 0.56, sy: 0.66, sz: 0.58, ry: 2.2 },
        ]
      : [
          { ox: 0, oy: 0.38, oz: 0, sx: 0.92, sy: 0.86, sz: 0.88, ry: rli * 0.9 },
          { ox: rl.sx * 0.35, oy: 0.22, oz: rl.sz * 0.2, sx: 0.48, sy: 0.52, sz: 0.46, ry: rli * 1.7 },
        ];
    for (const sr of subRocks) {
      const baseRock = new THREE.Mesh(trackGeo(new THREE.DodecahedronGeometry(1.0, 1)), mossyRockMat);
      baseRock.scale.set(rl.sx * sr.sx, rl.sy * sr.sy, rl.sz * sr.sz);
      baseRock.position.set(sr.ox, rl.sy * sr.oy, sr.oz);
      baseRock.rotation.set(0.15, sr.ry, 0.1);
      baseRock.castShadow = !isSoftwareGl;
      baseRock.receiveShadow = true;
      lg.add(baseRock);

      const mossTop = new THREE.Mesh(trackGeo(new THREE.IcosahedronGeometry(0.84, 1)), mossCapMat);
      mossTop.scale.set(rl.sx * sr.sx * 0.88, Math.max(0.24, rl.sy * sr.sy * 0.22), rl.sz * sr.sz * 0.82);
      mossTop.position.set(sr.ox, rl.sy * (sr.oy + sr.sy * 0.68), sr.oz);
      lg.add(mossTop);
    }

    lg.position.set(rl.x, sampleTerrainHeight(rl.x, rl.z, 'forest') - 0.35, rl.z);
    redwoodCampGroup.add(lg);
    redwoodObstacles.push({ kind: 'circle', x: rl.x, z: rl.z, r: Math.max(rl.sx, rl.sz) * 0.82 });
  }

  // Dramatic angled fallen redwood trunk resting against the back mossy cliff (Exact detail from center-back of Image 2!)
  const fallenTrunk = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.62, 0.95, 11.5, 7)),
    redwoodBarkMat
  );
  fallenTrunk.position.set(2.8, 2.4, -19.8);
  fallenTrunk.rotation.set(0.32, 0.48, 0.98);
  redwoodCampGroup.add(fallenTrunk);
  redwoodObstacles.push({ kind: 'obb', x: 2.8, z: -19.8, hx: 4.6, hz: 0.92, rotY: 0.48 });

  const fallenTrunk2 = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.48, 0.72, 9.5, 7)),
    redwoodBarkMat
  );
  fallenTrunk2.position.set(-18.2, 0.9, -12.5);
  fallenTrunk2.rotation.set(0.05, 0.4, Math.PI / 2 - 0.08);
  redwoodCampGroup.add(fallenTrunk2);
  redwoodObstacles.push({ kind: 'obb', x: -18.2, z: -12.5, hx: 4.6, hz: 0.78, rotY: 0.4 });

  // 5f. Instanced Lush Oversized Forest Ferns (~80 clusters around tents, logs, and rocks!)
  const FERN_COUNT = isSoftwareGl ? 56 : 82;
  const fernGeo = trackGeo(createFernClusterGeometry());
  const fernMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.85,
      metalness: 0.0,
      flatShading: true,
      side: THREE.DoubleSide,
    })
  );
  const fernInst = new THREE.InstancedMesh(fernGeo, fernMat, FERN_COUNT);
  for (let i = 0; i < FERN_COUNT; i++) {
    let fx: number;
    let fz: number;
    if (i < 10) {
      // Hero foreground fern cluster right beside the stacked timber logs (Image 2!)
      fx = 1.4 + (hash2(i, 1.5) - 0.5) * 4.2;
      fz = 8.4 + (hash2(i, 4.2) - 0.5) * 2.4;
    } else {
      const a = hash2(i, 2.7) * Math.PI * 2;
      const r = 8.4 + hash2(i, 6.1) * 11.5;
      fx = Math.cos(a) * r;
      fz = Math.sin(a) * r;
    }
    const fy = sampleTerrainHeight(fx, fz, 'forest');
    const sc = 0.85 + hash2(i, 9.1) * 0.95;
    dummy.position.set(fx, fy - 0.02, fz);
    dummy.rotation.set(0, hash2(i, 3.8) * Math.PI * 2, 0);
    dummy.scale.setScalar(sc);
    dummy.updateMatrix();
    fernInst.setMatrixAt(i, dummy.matrix);

    cTmp.setHex(i % 3 === 0 ? 0x67a832 : i % 3 === 1 ? 0x4f8e2c : 0x3f7a26);
    fernInst.setColorAt(i, cTmp);
  }
  fernInst.instanceMatrix.needsUpdate = true;
  if (fernInst.instanceColor) fernInst.instanceColor.needsUpdate = true;
  redwoodCampGroup.add(fernInst);

  // =========================================================================
  // 6. RIVERSIDE MEADOW LAYER ('autumn' — Matches Images 1 & 3!)
  // =========================================================================
  const meadowCampGroup = new THREE.Group();
  scene.add(meadowCampGroup);

  // 6a. Winding Shimmering Sky-Blue River Ribbon (Animated hand-painted water ripples!)
  const riverGeo = trackGeo(new THREE.PlaneGeometry(108, 5.2, 56, 6));
  riverGeo.rotateX(-Math.PI / 2);
  const rPos = riverGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < rPos.count; i++) {
    const rx = rPos.getX(i);
    const rzLocal = rPos.getZ(i);
    rPos.setZ(i, getRiverCenterZ(rx) + rzLocal);
    rPos.setY(i, -0.22 + Math.sin(rx * 0.35 + rzLocal) * 0.02);
  }
  rPos.needsUpdate = true;
  riverGeo.computeVertexNormals();

  const riverMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x8fd0f2,
      map: waterRippleTex,
      emissive: 0x265c85,
      emissiveIntensity: 0.38,
      roughness: 0.12,
      metalness: 0.22,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    })
  );
  const riverMesh = new THREE.Mesh(riverGeo, riverMat);
  riverMesh.renderOrder = 1;
  meadowCampGroup.add(riverMesh);

  // Shimmering white foam / water highlight strips along the river
  const shimmerMat = trackMat(
    new THREE.MeshBasicMaterial({ color: 0xebfbff, transparent: true, opacity: 0.55, depthWrite: false })
  );
  const shimmerStrips: THREE.Mesh[] = [];
  for (let s = 0; s < 16; s++) {
    const sx = -26 + s * 3.6;
    const sz = getRiverCenterZ(sx) + (s % 2 === 0 ? -0.55 : 0.45);
    const strip = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(2.4, 0.16)), shimmerMat);
    strip.rotation.x = -Math.PI / 2;
    strip.position.set(sx, -0.18, sz);
    strip.renderOrder = 2;
    meadowCampGroup.add(strip);
    shimmerStrips.push(strip);
  }

  // 6b. Smooth Moss-Draped Riverside & Foreground Boulders + Cattail Reeds + Flowering Meadow Shrubs
  const riverRockMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x9aa09c, map: stoneTex, roughness: 0.84 })
  );
  const meadowMossMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x528229, roughness: 0.88 })
  );
  const riverBoulderPositions = [
    { x: -3.2, z: getRiverCenterZ(-3.2) - 1.55, s: 1.45, mossy: true },
    { x: -1.4, z: getRiverCenterZ(-1.4) - 1.75, s: 0.88, mossy: false },
    { x: 10.6, z: getRiverCenterZ(10.6) + 1.55, s: 1.25, mossy: true },
    { x: -12.8, z: getRiverCenterZ(-12.8) + 1.65, s: 1.2, mossy: true },
    { x: 6.2, z: getRiverCenterZ(6.2) - 1.8, s: 0.85, mossy: true },
    // Foreground left & right framing mossy boulders (matches bottom-left and bottom-right of reference!)
    { x: -11.4, z: 4.6, s: 1.35, mossy: true },
    { x: -10.2, z: 6.2, s: 0.85, mossy: true },
    { x: 11.4, z: 8.6, s: 1.38, mossy: true },
    { x: 11.8, z: -4.2, s: 1.18, mossy: true },
  ];
  for (const rb of riverBoulderPositions) {
    const rockGroup = new THREE.Group();
    const rock = new THREE.Mesh(trackGeo(new THREE.DodecahedronGeometry(rb.s, 1)), riverRockMat);
    rock.scale.set(1.38, 0.72, 1.08);
    rock.castShadow = !isSoftwareGl;
    rock.receiveShadow = true;
    rockGroup.add(rock);

    if (rb.mossy) {
      const mossPatch = new THREE.Mesh(trackGeo(new THREE.IcosahedronGeometry(rb.s * 0.76, 1)), meadowMossMat);
      mossPatch.scale.set(1.22, 0.34, 0.92);
      mossPatch.position.set(0.08, rb.s * 0.44, 0.05);
      rockGroup.add(mossPatch);
    }

    const by = sampleTerrainHeight(rb.x, rb.z, 'autumn');
    rockGroup.position.set(rb.x, by + rb.s * 0.14, rb.z);
    rockGroup.rotation.y = rb.x * 0.7;
    meadowCampGroup.add(rockGroup);
    meadowObstacles.push({ kind: 'circle', x: rb.x, z: rb.z, r: rb.s * 1.1 });
  }

  // Flowering Storybook Shrubs around clearing rim & beneath the right oak tree (Matches reference floral bushes!)
  const shrubLeafDarkMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x355c1d, roughness: 0.88 }));
  const shrubLeafLightMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x528228, roughness: 0.84 }));
  const shrubRoseMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xe6495c, roughness: 0.65 }));
  const shrubButtercupMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xfde047, roughness: 0.65 }));
  const shrubWhiteMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xfffbeb, roughness: 0.68 }));
  const shrubSpecs = [
    { x: 11.6, z: -2.2, s: 0.95, rose: true },
    { x: 12.6, z: -0.6, s: 0.82, rose: true },
    { x: 10.2, z: 7.4, s: 0.85, rose: false },
    { x: -10.8, z: 3.2, s: 0.9, rose: false },
    { x: -9.6, z: 7.6, s: 0.88, rose: true },
    { x: -12.4, z: -3.2, s: 0.92, rose: false },
    { x: 12.8, z: 4.5, s: 0.96, rose: false },
  ];
  const shrubBlobGeo = trackGeo(new THREE.IcosahedronGeometry(0.55, 1));
  const shrubBloomGeo = trackGeo(new THREE.IcosahedronGeometry(0.11, 0));
  for (let si = 0; si < shrubSpecs.length; si++) {
    const sp = shrubSpecs[si];
    const sg = new THREE.Group();
    for (let b = 0; b < 4; b++) {
      const ba = (b / 4) * Math.PI * 2 + si;
      const blob = new THREE.Mesh(shrubBlobGeo, b % 2 === 0 ? shrubLeafDarkMat : shrubLeafLightMat);
      blob.scale.set(1.0 + (b % 2) * 0.25, 0.72 + (b === 0 ? 0.24 : 0), 0.95);
      blob.position.set(Math.cos(ba) * 0.34, 0.28 + (b === 0 ? 0.14 : 0), Math.sin(ba) * 0.34);
      sg.add(blob);
    }
    for (let fl = 0; fl < 6; fl++) {
      const fa = (fl / 6) * Math.PI * 2 + si * 0.7;
      const bloom = new THREE.Mesh(
        shrubBloomGeo,
        sp.rose ? (fl % 2 === 0 ? shrubRoseMat : shrubWhiteMat) : fl % 2 === 0 ? shrubButtercupMat : shrubWhiteMat
      );
      bloom.scale.set(1.2, 0.65, 1.2);
      bloom.position.set(Math.cos(fa) * 0.56, 0.44 + (fl % 3) * 0.14, Math.sin(fa) * 0.56);
      sg.add(bloom);
    }
    sg.position.set(sp.x, sampleTerrainHeight(sp.x, sp.z, 'autumn') - 0.04, sp.z);
    sg.scale.setScalar(sp.s);
    meadowCampGroup.add(sg);
  }

  // Instanced Cattail Reeds along riverbanks
  const REED_COUNT = 82;
  const reedStalkGeo = trackGeo(new THREE.CylinderGeometry(0.022, 0.032, 1.45, 5));
  const reedStalkMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x3b6624, roughness: 0.86 })
  );
  const reedHeadGeo = trackGeo(new THREE.CylinderGeometry(0.052, 0.052, 0.28, 6));
  const reedHeadMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x452b18, roughness: 0.92 })
  );
  const reedStalkInst = new THREE.InstancedMesh(reedStalkGeo, reedStalkMat, REED_COUNT);
  const reedHeadInst = new THREE.InstancedMesh(reedHeadGeo, reedHeadMat, REED_COUNT);

  for (let i = 0; i < REED_COUNT; i++) {
    const rx = -24 + (i / REED_COUNT) * 48 + (hash2(i, 1.7) - 0.5) * 1.4;
    const side = i % 2 === 0 ? 1 : -1;
    const rz = getRiverCenterZ(rx) + side * (1.75 + hash2(i, 4.3) * 0.85);
    const ry = sampleTerrainHeight(rx, rz, 'autumn');
    const tilt = (hash2(i, 6.6) - 0.5) * 0.22;
    const hScale = 0.78 + hash2(i, 8.9) * 0.55;

    dummy.position.set(rx, ry + 0.65 * hScale, rz);
    dummy.rotation.set(tilt, hash2(i, 2.5) * Math.PI, tilt * 0.8);
    dummy.scale.set(1, hScale, 1);
    dummy.updateMatrix();
    reedStalkInst.setMatrixAt(i, dummy.matrix);

    dummy.position.set(rx + tilt * 0.2, ry + 1.14 * hScale, rz);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    reedHeadInst.setMatrixAt(i, dummy.matrix);
  }
  reedStalkInst.instanceMatrix.needsUpdate = true;
  reedHeadInst.instanceMatrix.needsUpdate = true;
  meadowCampGroup.add(reedStalkInst);
  meadowCampGroup.add(reedHeadInst);

  // 6c. Hero Gnarled Storybook Oak Trees (Right foreground framing oak + rolling hilltop oaks matching reference!)
  const oakSpecs = [
    { x: 14.5, z: -6.4, scale: 0.82, rotY: -1.1 },  // Framing right-side foreground oak (Matches right side of reference!)
    { x: -3.2, z: -31.5, scale: 1.05, rotY: 2.1 },  // Central sunlit hilltop oak behind stream
    { x: 14.8, z: -33.0, scale: 0.92, rotY: 0.4 },  // Right-back hillside oak
    { x: -23.5, z: -28.0, scale: 0.98, rotY: 4.3 }, // Left hillside oak
  ];
  for (const os of oakSpecs) {
    const oak = createAncientOakTree(os.scale, woodGrainTex);
    const oy = sampleTerrainHeight(os.x, os.z, 'autumn');
    oak.position.set(os.x, oy - 0.35, os.z);
    oak.rotation.y = os.rotY;
    meadowCampGroup.add(oak);
    if (Math.hypot(os.x, os.z) < 22) {
      meadowObstacles.push({ kind: 'circle', x: os.x, z: os.z, r: 1.35 * os.scale });
    }
  }

  // =========================================================================
  // 7. AMBIENT PARTICLES (Fireflies in Meadow, Embers in Redwood, Snow in Frostpeak!)
  // =========================================================================
  const PARTICLE_COUNT = 78;
  const particleGeo = trackGeo(new THREE.OctahedronGeometry(0.065, 0));
  const particleMat = trackMat(
    new THREE.MeshBasicMaterial({ color: 0xffe47a, transparent: true, opacity: 0.9 })
  );
  const particleInst = new THREE.InstancedMesh(particleGeo, particleMat, PARTICLE_COUNT);
  const particleData = Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
    x: (hash2(i, 1.1) - 0.5) * 32,
    y: 0.6 + hash2(i, 2.2) * 6.5,
    z: (hash2(i, 3.3) - 0.5) * 28 - 4,
    vy: 0.45 + hash2(i, 4.4) * 0.6,
    phase: hash2(i, 5.5) * Math.PI * 2,
  }));
  scene.add(particleInst);

  // Track last rebuilt terrain state so we only rebuild vertex heights/colors when biome or day/night flips
  let lastBuiltBiome: AgrouMapBiome | null = null;
  let lastBuiltIsDay: boolean | null = null;
  let lastBuiltBlind: boolean | null = null;

  // Pre-allocated campfire warm-color endpoints (zero GC)
  const fireWarmLow = new THREE.Color(0xff7b1a);
  const fireWarmHigh = new THREE.Color(0xffb347);

  const update = (params: {
    biomeKey: AgrouMapBiome;
    isDay: boolean;
    isNightBlindfolded: boolean;
    isTitleScreen: boolean;
    isVotingPhase: boolean;
    isAbstaining: boolean;
    hoveredCampfire: boolean;
    elapsed: number;
    simDt: number;
    dt: number;
    isSoftwareGl: boolean;
  }) => {
    const {
      biomeKey,
      isDay,
      isNightBlindfolded,
      isTitleScreen,
      isVotingPhase,
      isAbstaining,
      hoveredCampfire,
      elapsed,
      simDt,
    } = params;

    // Rebuild vertex-colored terrain, grass height/colors & sky dome only on biome or day/night transitions
    if (
      lastBuiltBiome !== biomeKey ||
      lastBuiltIsDay !== isDay ||
      lastBuiltBlind !== isNightBlindfolded
    ) {
      lastBuiltBiome = biomeKey;
      lastBuiltIsDay = isDay;
      lastBuiltBlind = isNightBlindfolded;
      rebuildTerrainGeometry(biomeKey, isDay);
      repositionGrassForBiome(biomeKey, isDay);
      updateSkyDomeColors(biomeKey, isDay, isNightBlindfolded);

      // Show Redwood Camp for 'forest' & 'frostpeak'; show Riverside Meadow for 'autumn'
      redwoodCampGroup.visible = biomeKey !== 'autumn';
      meadowCampGroup.visible = biomeKey === 'autumn';

      // Frostpeak snow tint on canopies, rocks & ferns (matte alpine snow with zero glare!)
      if (biomeKey === 'frostpeak') {
        redwoodCanopyMat.color.setHex(isDay ? 0x547587 : 0x243b48);
        redwoodCanopyHiMat.color.setHex(isDay ? 0xa5bfd1 : 0x536e86);
        mossCapMat.color.setHex(isDay ? 0xb9cddc : 0x5a738a);
        fernMat.color.setHex(isDay ? 0x9ab3c4 : 0x4f697d);
        for (let fi = 0; fi < FERN_COUNT; fi++) {
          cTmp.setHex(fi % 2 === 0 ? 0xaec5d6 : 0x7c9cb0);
          fernInst.setColorAt(fi, cTmp);
        }
        if (fernInst.instanceColor) fernInst.instanceColor.needsUpdate = true;
      } else {
        redwoodCanopyMat.color.setHex(isDay ? 0x22462d : 0x102218);
        redwoodCanopyHiMat.color.setHex(isDay ? 0x33633c : 0x1b3624);
        mossCapMat.color.setHex(isDay ? 0x4c7c32 : 0x233c1b);
        fernMat.color.setHex(0xffffff);
        for (let fi = 0; fi < FERN_COUNT; fi++) {
          cTmp.setHex(fi % 3 === 0 ? 0x67a832 : fi % 3 === 1 ? 0x4f8e2c : 0x3f7a26);
          fernInst.setColorAt(fi, cTmp);
        }
        if (fernInst.instanceColor) fernInst.instanceColor.needsUpdate = true;
      }

      riverMat.color.setHex(isDay ? 0x8fd0f2 : 0x26527d);
      particleMat.color.setHex(AGROU_BIOMES[biomeKey].ambientParticleColor);
    }

    // Stars & wispy clouds
    starInst.visible = !isDay && !isNightBlindfolded;
    starMat.opacity = !isDay ? 0.75 + Math.sin(elapsed * 2.6) * 0.2 : 0;

    cloudGroup.visible = isDay && biomeKey !== 'forest';
    if (cloudGroup.visible) {
      for (const cl of cloudClusters) {
        const a = cl.baseAngle + elapsed * cl.speed;
        cl.mesh.position.set(
          Math.cos(a) * cl.radius,
          cl.height + Math.sin(elapsed * 0.5 + cl.baseAngle) * 0.3,
          Math.sin(a) * cl.radius
        );
        cl.mesh.lookAt(0, cl.height, 0);
      }
    }

    // Smooth animated river flow & shimmer drift in Riverside Meadow
    if (meadowCampGroup.visible) {
      waterRippleTex.offset.x = (elapsed * 0.085) % 1;
      for (let s = 0; s < shimmerStrips.length; s++) {
        const st = shimmerStrips[s];
        const sx = ((st.position.x + simDt * 0.8 + 28) % 56) - 28;
        st.position.x = sx;
        st.position.z = getRiverCenterZ(sx) + (s % 2 === 0 ? -0.55 : 0.45);
      }
    }

    // When blindfolded asleep at night, hide distant camp scenery so ONLY the glowing campfire embers shine in darkness!
    if (isNightBlindfolded) {
      redwoodCampGroup.visible = false;
      meadowCampGroup.visible = false;
      grassInst.visible = false;
      flowerInst.visible = false;
      pebbleInst.visible = false;
      leafInst.visible = false;
    } else {
      redwoodCampGroup.visible = biomeKey !== 'autumn';
      meadowCampGroup.visible = biomeKey === 'autumn';
      grassInst.visible = true;
      flowerInst.visible = biomeKey !== 'frostpeak';
      pebbleInst.visible = true;
      leafInst.visible = biomeKey !== 'frostpeak';
    }

    // Shared Coherent Wind Vector driving flames, smoke drift, tent flaps & alpine snowfall slant
    const windStrength =
      (biomeKey === 'frostpeak' ? 1.15 : biomeKey === 'autumn' ? 0.72 : 0.88) *
      (0.75 + 0.35 * Math.sin(elapsed * 0.65) + 0.2 * Math.sin(elapsed * 1.9));
    const windAngle = 0.45 + Math.sin(elapsed * 0.22) * 0.28;
    const windX = Math.cos(windAngle) * windStrength;
    const windZ = Math.sin(windAngle) * windStrength;

    // Campfire Flame, Ground Light Pool & Dynamic PointLight Dance
    const flicker = Math.sin(elapsed * 11.5) * 0.11 + Math.cos(elapsed * 17.3) * 0.07;
    const baseScale = isNightBlindfolded ? 0.92 : isDay && !isTitleScreen ? 1.0 : 1.12;
    flameGroup.rotation.z = -windX * 0.11;
    flameGroup.rotation.x = windZ * 0.11;
    flameOuter.scale.set(
      baseScale * (1 + flicker * 0.3),
      baseScale * (1 + flicker * 0.85),
      baseScale * (1 + flicker * 0.3)
    );
    flameCore.scale.set(
      baseScale * (1 - flicker * 0.22),
      baseScale * (1 + flicker * 0.95),
      baseScale * (1 - flicker * 0.22)
    );
    flameSide1.scale.set(
      0.65 * baseScale * (0.95 + flicker * 0.45),
      0.7 * baseScale * (0.95 + flicker * 0.75),
      0.65 * baseScale
    );
    flameSide2.scale.set(
      0.62 * baseScale * (0.95 - flicker * 0.4),
      0.66 * baseScale * (0.95 - flicker * 0.65),
      0.62 * baseScale
    );

    fireGlowPoolMat.opacity = isNightBlindfolded
      ? 0.48 + flicker * 0.08
      : (isDay ? 0.42 : 0.58) + flicker * 0.09;
    const poolScale = (isNightBlindfolded ? 0.82 : 1) + flicker * 0.1;
    fireGlowPool.scale.set(poolScale, poolScale, 1);

    fireLight.position.set(
      Math.sin(elapsed * 9.3) * 0.08,
      1.65 + Math.cos(elapsed * 13.7) * 0.05,
      Math.cos(elapsed * 11.1) * 0.08
    );
    fireLight.color.lerpColors(fireWarmLow, fireWarmHigh, THREE.MathUtils.clamp(0.5 + flicker * 2.6, 0, 1));
    fireLight.intensity =
      (isNightBlindfolded ? 8.5 : isDay ? 10.5 : 13.5) +
      flicker * (isNightBlindfolded ? 1.8 : 2.8);
    fireLight.distance = isNightBlindfolded ? 10.5 : 32;

    // Flutter expedition tent entrance flaps with the shared wind
    if (redwoodCampGroup.visible) {
      for (let f = 0; f < tentFlaps.length; f++) {
        const flap = tentFlaps[f];
        flap.mesh.rotation.y =
          flap.baseRotY + Math.sin(elapsed * 3.4 + flap.phase) * 0.09 * windStrength;
      }
    }

    // Soft rising billowing painterly campfire smoke puffs (drifting gently downwind!)
    for (let i = 0; i < FIRE_SMOKE_COUNT; i++) {
      const sp = fireSmokeData[i];
      sp.y += sp.vy * simDt;
      if (sp.y > 3.85) {
        sp.y = 0.85;
        sp.x = (hash2(i, Math.floor(elapsed * 2) + 1) - 0.5) * 0.35;
        sp.z = (hash2(i, Math.floor(elapsed * 2) + 7) - 0.5) * 0.35;
      }
      const rise = sp.y - 0.85;
      const tLife = THREE.MathUtils.clamp(rise / 3.0, 0, 1);
      const fadeIn = THREE.MathUtils.smoothstep(tLife, 0.0, 0.18);
      const fadeOut = 1 - THREE.MathUtils.smoothstep(tLife, 0.45, 1.0);
      const sz = (0.65 + tLife * 1.45) * (isNightBlindfolded ? 0.72 : 1.0);
      const sprite = smokeSprites[i];
      sprite.position.set(
        sp.x + windX * rise * 0.22 + Math.sin(elapsed * 1.8 + sp.phase) * 0.14,
        sp.y,
        sp.z + windZ * rise * 0.22 + Math.cos(elapsed * 1.5 + sp.phase) * 0.14
      );
      sprite.scale.set(sz, sz, 1);
      smokeSpriteMats[i].opacity = fadeIn * fadeOut * (isDay ? 0.34 : 0.24);
    }

    // Tiny glowing rising campfire ember sparks
    for (let i = 0; i < SPARK_COUNT; i++) {
      const sk = fireSparkData[i];
      sk.y += sk.vy * simDt;
      if (sk.y > 3.2) {
        sk.y = 0.35;
        sk.x = (hash2(i, Math.floor(elapsed * 4) + 3) - 0.5) * 0.55;
        sk.z = (hash2(i, Math.floor(elapsed * 4) + 9) - 0.5) * 0.55;
      }
      const rise = sk.y - 0.35;
      const life = Math.max(0.1, 1 - rise / 2.85);
      dummy.position.set(
        sk.x + windX * rise * 0.3 + Math.sin(elapsed * 4.5 + sk.phase) * 0.14,
        sk.y,
        sk.z + windZ * rise * 0.3 + Math.cos(elapsed * 3.8 + sk.phase) * 0.14
      );
      dummy.rotation.set(elapsed * 2 + sk.phase, elapsed * 3, 0);
      dummy.scale.setScalar(life * 0.95);
      dummy.updateMatrix();
      fireSparkInst.setMatrixAt(i, dummy.matrix);
    }
    fireSparkInst.instanceMatrix.needsUpdate = true;

    // Campfire Voting Abstention Ring Pulse
    campfireVoteRingMat.color.setHex(
      isAbstaining ? 0x22c55e : hoveredCampfire ? 0xfef08a : 0xf59e0b
    );
    campfireVoteRingMat.opacity = isVotingPhase
      ? isAbstaining || hoveredCampfire
        ? 0.9
        : 0.42 + Math.sin(elapsed * 4.5) * 0.18
      : 0.0;

    // Ambient Biome Particles:
    // - Meadow ('autumn'): Golden Fireflies drifting serenely across clearing, river & hills (Image 1!)
    // - Frostpeak ('frostpeak'): Soft falling alpine snow slanted by coherent wind
    // - Redwood ('forest'): Warm glowing embers + forest firefly motes
    const isSnow = biomeKey === 'frostpeak';
    const isMeadow = biomeKey === 'autumn';
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const p = particleData[i];
      if (isSnow) {
        p.y -= 1.2 * p.vy * simDt;
        p.x += windX * 0.95 * simDt;
        p.z += windZ * 0.95 * simDt;
        if (p.x > 16) p.x -= 32;
        if (p.x < -16) p.x += 32;
        if (p.z > 10) p.z -= 28;
        if (p.z < -18) p.z += 28;
        if (p.y < 0.15) {
          p.y = 9.5 + (i % 4) * 1.4;
        }
        dummy.position.set(
          p.x + Math.sin(elapsed * 1.4 + p.phase) * 0.45,
          p.y,
          p.z + Math.cos(elapsed * 1.1 + p.phase) * 0.4
        );
        dummy.scale.setScalar(1.0);
      } else if (isMeadow) {
        // Floating golden fireflies hovering over grass & distant hills
        const fy = 0.75 + (i % 7) * 0.65 + Math.sin(elapsed * 1.8 + p.phase) * 0.45;
        const pulse = 0.55 + Math.sin(elapsed * 4.5 + p.phase) * 0.45;
        dummy.position.set(
          p.x + Math.sin(elapsed * 0.7 + p.phase) * 1.2,
          fy,
          p.z + Math.cos(elapsed * 0.6 + p.phase) * 1.1
        );
        dummy.scale.setScalar(pulse * 1.05);
      } else {
        // Redwood embers rising gently around camp
        p.y += p.vy * 0.55 * simDt;
        if (p.y > 5.8) p.y = 0.4;
        const pulse = 0.45 + Math.sin(elapsed * 3.8 + p.phase) * 0.45;
        dummy.position.set(
          p.x * 0.55 + Math.sin(elapsed * 1.3 + p.phase) * 0.5,
          p.y,
          p.z * 0.55 + Math.cos(elapsed * 1.1 + p.phase) * 0.5
        );
        dummy.scale.setScalar(pulse * 0.85);
      }
      dummy.rotation.set(0, elapsed + p.phase, 0);
      dummy.updateMatrix();
      particleInst.setMatrixAt(i, dummy.matrix);
    }
    particleInst.instanceMatrix.needsUpdate = true;
  };

  // Run initial build immediately
  update({
    biomeKey: initialBiome,
    isDay: true,
    isNightBlindfolded: false,
    isTitleScreen: true,
    isVotingPhase: false,
    isAbstaining: false,
    hoveredCampfire: false,
    elapsed: 0,
    simDt: 0.016,
    dt: 0.016,
    isSoftwareGl,
  });

  const getObstacles = (biome: AgrouMapBiome): readonly EnvObstacle[] =>
    biome === 'autumn' ? meadowObstacles : redwoodObstacles;

  const dispose = () => {
    for (const g of disposableGeos) g.dispose();
    for (const m of disposableMats) m.dispose();
    for (const t of disposableTex) t.dispose();
  };

  return {
    campfireHitbox,
    fireLight,
    getObstacles,
    update,
    dispose,
  };
}
