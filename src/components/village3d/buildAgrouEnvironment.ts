import * as THREE from 'three';
import { AGROU_BIOMES, AgrouMapBiome } from '../../game/agrouMechanics';

export interface AgrouEnvironmentHandle {
  campfireHitbox: THREE.Mesh;
  fireLight: THREE.PointLight;
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

// Create lush multi-blade low-poly grass tuft BufferGeometry (7 lush fanned tapered blades)
function createGrassTuftGeometry(): THREE.BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const bladeSpecs = [
    { angle: 0.0, lean: 0.18, h: 0.68, w: 0.11, ox: 0.0, oz: 0.0 },
    { angle: 0.9, lean: 0.24, h: 0.56, w: 0.095, ox: 0.09, oz: 0.06 },
    { angle: 1.8, lean: 0.21, h: 0.64, w: 0.105, ox: -0.07, oz: 0.08 },
    { angle: 2.7, lean: 0.25, h: 0.5, w: 0.09, ox: -0.1, oz: -0.04 },
    { angle: 3.6, lean: 0.2, h: 0.6, w: 0.1, ox: 0.06, oz: -0.09 },
    { angle: 4.55, lean: 0.26, h: 0.46, w: 0.085, ox: 0.12, oz: -0.02 },
    { angle: 5.5, lean: 0.22, h: 0.58, w: 0.095, ox: -0.04, oz: -0.11 },
  ];

  const vA = new THREE.Vector3();
  const vB = new THREE.Vector3();
  const vC = new THREE.Vector3();
  const e1 = new THREE.Vector3();
  const e2 = new THREE.Vector3();
  const n = new THREE.Vector3();

  for (const b of bladeSpecs) {
    const ca = Math.cos(b.angle);
    const sa = Math.sin(b.angle);
    vA.set(b.ox - sa * b.w, 0, b.oz + ca * b.w);
    vB.set(b.ox + sa * b.w, 0, b.oz - ca * b.w);
    vC.set(b.ox + ca * b.lean, b.h, b.oz + sa * b.lean);

    e1.subVectors(vB, vA);
    e2.subVectors(vC, vA);
    n.crossVectors(e1, e2).normalize();

    positions.push(vA.x, vA.y, vA.z, vB.x, vB.y, vB.z, vC.x, vC.y, vC.z);
    normals.push(n.x, n.y, n.z, n.x, n.y, n.z, n.x, n.y, n.z);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
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
function createCanvasTent(variant: 'light' | 'dark'): THREE.Group {
  const tent = new THREE.Group();
  const canvasColor = variant === 'light' ? 0xdad5c7 : 0xcfcfc2;
  const sideWallColor = variant === 'light' ? 0x4b4642 : 0x353c45;
  const trimColor = 0x26292e;

  const canvasMat = new THREE.MeshStandardMaterial({
    color: canvasColor,
    roughness: 0.9,
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

  return tent;
}

// Build a monumental ancient gnarled hilltop oak tree with wide umbrella canopy framed cleanly in sky (Matches Image 1 & 3!)
function createAncientOakTree(scale: number): THREE.Group {
  const oak = new THREE.Group();
  const barkMat = new THREE.MeshStandardMaterial({
    color: 0x3b2d24,
    roughness: 0.96,
    flatShading: true,
  });
  const canopyDarkMat = new THREE.MeshStandardMaterial({
    color: 0x2d5223,
    roughness: 0.9,
    flatShading: true,
  });
  const canopyMidMat = new THREE.MeshStandardMaterial({
    color: 0x426e2b,
    roughness: 0.88,
    flatShading: true,
  });
  const canopyLightMat = new THREE.MeshStandardMaterial({
    color: 0x5c8c38,
    roughness: 0.86,
    flatShading: true,
  });

  // Massive flared gnarled trunk (compact proportions so sweeping boughs & wide green umbrella crown frame inside upper sky!)
  const lowerTrunk = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 2.0, 2.6, 8), barkMat);
  lowerTrunk.position.y = 1.25;
  lowerTrunk.castShadow = true;
  oak.add(lowerTrunk);

  const upperTrunk = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 1.02, 2.1, 8), barkMat);
  upperTrunk.position.set(0.14, 3.15, 0.08);
  upperTrunk.rotation.z = -0.06;
  upperTrunk.castShadow = true;
  oak.add(upperTrunk);

  const boughSpecs = [
    { angle: 0.25, tilt: 0.95, len: 5.0, r: 0.46, y: 3.7 },
    { angle: 1.4, tilt: 0.88, len: 4.7, r: 0.42, y: 3.95 },
    { angle: 2.55, tilt: 0.96, len: 5.4, r: 0.48, y: 3.65 },
    { angle: 3.7, tilt: 0.9, len: 4.5, r: 0.42, y: 3.9 },
    { angle: 4.9, tilt: 0.94, len: 4.9, r: 0.44, y: 3.75 },
  ];

  for (let i = 0; i < boughSpecs.length; i++) {
    const b = boughSpecs[i];
    const boughPivot = new THREE.Group();
    boughPivot.position.set(0.1, b.y, 0.04);
    boughPivot.rotation.y = b.angle;

    const branch = new THREE.Mesh(
      new THREE.CylinderGeometry(b.r * 0.42, b.r, b.len, 6),
      barkMat
    );
    branch.position.set(0, b.len * 0.44, 0);
    branch.rotation.z = b.tilt;
    boughPivot.add(branch);
    oak.add(boughPivot);

    const tipDist = Math.sin(b.tilt) * b.len * 0.88;
    const tipY = b.y + Math.cos(b.tilt) * b.len * 0.8;
    const cx = Math.cos(-b.angle) * tipDist;
    const cz = Math.sin(-b.angle) * tipDist;

    const leafCluster = new THREE.Mesh(
      new THREE.DodecahedronGeometry(2.85 + (i % 2) * 0.5, 1),
      i % 2 === 0 ? canopyMidMat : canopyDarkMat
    );
    leafCluster.scale.set(1.36, 0.62, 1.24);
    leafCluster.position.set(cx, tipY + 0.8, cz);
    leafCluster.castShadow = true;
    oak.add(leafCluster);

    const leafSub = new THREE.Mesh(new THREE.DodecahedronGeometry(2.1, 1), canopyLightMat);
    leafSub.scale.set(1.26, 0.58, 1.15);
    leafSub.position.set(cx * 0.72, tipY + 1.75, cz * 0.72);
    oak.add(leafSub);
  }

  const crownTop = new THREE.Mesh(new THREE.DodecahedronGeometry(4.0, 1), canopyMidMat);
  crownTop.scale.set(1.44, 0.56, 1.32);
  crownTop.position.set(0.1, 6.4, 0);
  oak.add(crownTop);

  const crownHighlight = new THREE.Mesh(new THREE.DodecahedronGeometry(2.9, 1), canopyLightMat);
  crownHighlight.scale.set(1.25, 0.54, 1.18);
  crownHighlight.position.set(-0.5, 7.4, 0.4);
  oak.add(crownHighlight);

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

  // =========================================================================
  // 1. PROCEDURAL GRADIENT SKY DOME + STARS + SOFT CLOUDS
  // =========================================================================
  const skyGeo = trackGeo(new THREE.SphereGeometry(96, 24, 16));
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
      // Riverside Meadow: bright painted sky-blue dome (Image 1 & 3)
      cTop.setHex(isDay ? 0x3b74b8 : 0x0a1326);
      cMid.setHex(isDay ? 0x6ba1d6 : 0x162642);
      cHorizon.setHex(isDay ? 0xa9cde8 : 0x263c5c);
    } else if (biome === 'frostpeak') {
      cTop.setHex(isDay ? 0x5c90c2 : 0x091224);
      cMid.setHex(isDay ? 0x91bcdb : 0x162945);
      cHorizon.setHex(isDay ? 0xd0e6f5 : 0x2a4060);
    } else {
      // Redwood Forest Camp: cool blue-slate atmospheric forest mist sky (Image 2 & 4)
      cTop.setHex(isDay ? 0x22303d : 0x080d17);
      cMid.setHex(isDay ? 0x3a4d5e : 0x121c2c);
      cHorizon.setHex(isDay ? 0x5c7082 : 0x1e2c3e);
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
  const STAR_COUNT = 120;
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

  // Soft Wispy Horizon Clouds (visible on Meadow & Frostpeak day sky)
  const cloudGroup = new THREE.Group();
  const cloudMat = trackMat(
    new THREE.MeshBasicMaterial({ color: 0xdcebf7, transparent: true, opacity: 0.5, fog: false })
  );
  const cloudClusters: Array<{ mesh: THREE.Group; baseAngle: number; radius: number; height: number; speed: number }> = [];
  for (let c = 0; c < 8; c++) {
    const cl = new THREE.Group();
    const baseAngle = (c / 8) * Math.PI * 2 + 0.35;
    const radius = 56 + (c % 3) * 8;
    const height = 22 + (c % 4) * 3.5;
    for (let p = 0; p < 4; p++) {
      const puff = new THREE.Mesh(
        trackGeo(new THREE.DodecahedronGeometry(2.6 + (p % 2) * 1.4, 0)),
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
  // 2. SCULPTED VERTEX-COLORED LOW-POLY FACETED TERRAIN (Radial-Concentrated Smooth Rim!)
  // =========================================================================
  const baseTerrainGeo = new THREE.PlaneGeometry(164, 164, 68, 68);
  baseTerrainGeo.rotateX(-Math.PI / 2);
  const bPos = baseTerrainGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < bPos.count; i++) {
    const ux = bPos.getX(i) / 82;
    const uz = bPos.getZ(i) / 82;
    bPos.setX(i, Math.sign(ux) * Math.pow(Math.abs(ux), 1.28) * 82);
    bPos.setZ(i, Math.sign(uz) * Math.pow(Math.abs(uz), 1.28) * 82);
  }
  const terrainGeo = trackGeo(baseTerrainGeo.toNonIndexed());
  baseTerrainGeo.dispose();

  const tPos = terrainGeo.attributes.position as THREE.BufferAttribute;
  const terrainColors = new Float32Array(tPos.count * 3);
  terrainGeo.setAttribute('color', new THREE.BufferAttribute(terrainColors, 3));

  const terrainMat = trackMat(
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.94,
      metalness: 0.0,
      flatShading: true,
    })
  );
  const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
  terrainMesh.receiveShadow = true;
  scene.add(terrainMesh);

  const cSand = new THREE.Color();
  const cGrass = new THREE.Color();
  const cGrassDeep = new THREE.Color();
  const cCliff = new THREE.Color();
  const cBank = new THREE.Color();
  const cVert = new THREE.Color();

  const rebuildTerrainGeometry = (biome: AgrouMapBiome, isDay: boolean) => {
    const pal = AGROU_BIOMES[biome];
    cSand.setHex(isDay ? pal.clearingDirt : biome === 'frostpeak' ? 0x6d7782 : 0x766248);
    cGrass.setHex(isDay ? pal.groundDay : pal.groundNight);
    cGrassDeep.copy(cGrass).multiplyScalar(0.8);
    cCliff.setHex(isDay ? 0x454e4f : 0x242a2e);
    cBank.setHex(isDay ? 0x8f8260 : 0x4a4332);

    const colAttr = terrainGeo.attributes.color as THREE.BufferAttribute;
    for (let i = 0; i < tPos.count; i += 3) {
      let maxH = -999;
      let minH = 999;
      for (let k = 0; k < 3; k++) {
        const vx = tPos.getX(i + k);
        const vz = tPos.getZ(i + k);
        const vy = sampleTerrainHeight(vx, vz, biome);
        tPos.setY(i + k, vy);
        if (vy > maxH) maxH = vy;
        if (vy < minH) minH = vy;
      }
      const slope = maxH - minH;

      // Per-vertex smooth color blending eliminates blocky squares while keeping crisp flat-shaded triangles!
      for (let k = 0; k < 3; k++) {
        const vx = tPos.getX(i + k);
        const vz = tPos.getZ(i + k);
        const r = Math.hypot(vx, vz);
        const ang = Math.atan2(vz, vx);
        const edgeRadius = 11.4 + Math.sin(ang * 5) * 0.55 + Math.cos(ang * 9) * 0.32;
        const sandToGrass = THREE.MathUtils.smoothstep(r, edgeRadius - 1.35, edgeRadius + 1.45);

        cVert.lerpColors(cSand, cGrass, sandToGrass);
        if (sandToGrass > 0.45) {
          const wavePatch = 0.5 + 0.5 * Math.sin(vx * 0.14 + vz * 0.11);
          cVert.lerp(cGrassDeep, wavePatch * 0.22);
        }
        if (biome === 'autumn') {
          const distRiver = Math.abs(vz - getRiverCenterZ(vx));
          if (distRiver < 3.0) {
            cVert.lerp(cBank, (1 - distRiver / 3.0) * 0.65);
          }
        }
        if (slope > 0.92 && r > 12) {
          cVert.lerp(cCliff, THREE.MathUtils.clamp((slope - 0.92) * 0.65, 0, 0.85));
        }
        const microJitter = (hash2(Math.floor(vx * 0.8), Math.floor(vz * 0.8)) - 0.5) * 0.035;
        cVert.offsetHSL(0, 0, microJitter);
        colAttr.setXYZ(i + k, cVert.r, cVert.g, cVert.b);
      }
    }
    tPos.needsUpdate = true;
    colAttr.needsUpdate = true;
    terrainGeo.computeVertexNormals();
  };

  // =========================================================================
  // 3. INSTANCED FLAT CLEARING PEBBLES (~170) & SWAYING GRASS TUFTS (~520)
  // =========================================================================
  const PEBBLE_COUNT = 170;
  const pebbleGeo = trackGeo(new THREE.DodecahedronGeometry(0.19, 0));
  const pebbleMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.93,
      metalness: 0.02,
      flatShading: true,
    })
  );
  const pebbleInst = new THREE.InstancedMesh(pebbleGeo, pebbleMat, PEBBLE_COUNT);
  pebbleInst.receiveShadow = true;

  const pebblePalette = [0x8b8378, 0x736c62, 0xa09582, 0x625e57, 0x998e7b];
  for (let i = 0; i < PEBBLE_COUNT; i++) {
    const a = hash2(i, 4.1) * Math.PI * 2;
    // Scatter pebbles across clearing (r = 1.55..8.3), denser near fire & mid-ring (Images 1, 2, 3, 4!)
    const rNorm = Math.pow(hash2(i, 9.7), 0.72);
    const r = 1.55 + rNorm * 6.8;
    const px = Math.cos(a) * r;
    const pz = Math.sin(a) * r;
    const sx = 0.48 + hash2(i, 2.3) * 1.25;
    const sz = 0.45 + hash2(i, 5.9) * 1.15;
    const sy = 0.16 + hash2(i, 8.2) * 0.2;

    dummy.position.set(px, sy * 0.12, pz);
    dummy.rotation.set(
      (hash2(i, 1.1) - 0.5) * 0.2,
      hash2(i, 6.4) * Math.PI * 2,
      (hash2(i, 3.3) - 0.5) * 0.2
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

  // Instanced Lush Multi-Blade Low-Poly Grass Tufts carpeting the clearing rim & foreground meadow!
  const GRASS_COUNT = isSoftwareGl ? 500 : 760;
  const grassGeo = trackGeo(createGrassTuftGeometry());
  const grassMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.88,
      metalness: 0.0,
      flatShading: true,
      side: THREE.DoubleSide,
    })
  );
  const grassInst = new THREE.InstancedMesh(grassGeo, grassMat, GRASS_COUNT);
  const grassPlacements: Array<{ x: number; z: number; rotY: number; scale: number; tint: number }> = [];
  for (let i = 0; i < GRASS_COUNT; i++) {
    const a = (i / GRASS_COUNT) * Math.PI * 2 + (hash2(i, 2.1) - 0.5) * 0.2;
    const edgeR = 11.2 + Math.sin(a * 5) * 0.5 + Math.cos(a * 9) * 0.3;
    let r: number;
    if (i < 190) {
      r = edgeR - 0.35 + hash2(i, 6.2) * 1.8;
    } else if (i < 380) {
      r = edgeR + 1.2 + hash2(i, 5.1) * 6.5;
    } else {
      r = edgeR + 6.0 + Math.pow(hash2(i, 7.7), 1.15) * 16.5;
    }
    grassPlacements.push({
      x: Math.cos(a) * r,
      z: Math.sin(a) * r,
      rotY: hash2(i, 4.9) * Math.PI * 2,
      scale: 0.98 + hash2(i, 8.8) * 0.95,
      tint: hash2(i, 3.2),
    });
  }
  scene.add(grassInst);

  const repositionGrassForBiome = (biome: AgrouMapBiome, isDay: boolean) => {
    const cG1 = new THREE.Color(
      biome === 'frostpeak' ? (isDay ? 0xc8dce8 : 0x5d768f) : isDay ? 0x4e8c2b : 0x24421d
    );
    const cG2 = new THREE.Color(
      biome === 'frostpeak' ? (isDay ? 0x9cb9cc : 0x475e75) : isDay ? 0x6ea834 : 0x325725
    );

    for (let i = 0; i < GRASS_COUNT; i++) {
      const g = grassPlacements[i];
      // Skip grass directly inside the Riverside Meadow river channel
      const inRiver = biome === 'autumn' && Math.abs(g.z - getRiverCenterZ(g.x)) < 2.35;
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
  };

  // =========================================================================
  // 4. RADIANT AGROU CAMPFIRE HEARTH + GOLDEN GROUND GLOW POOL + SHIMMER
  // =========================================================================
  const campfireGroup = new THREE.Group();
  scene.add(campfireGroup);

  // Low flat hearth stones (compact, low-profile like Images 1, 2, 4!)
  const hearthStoneMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x5c5750, roughness: 0.94, flatShading: true })
  );
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.2;
    const st = new THREE.Mesh(trackGeo(new THREE.DodecahedronGeometry(0.24, 0)), hearthStoneMat);
    st.scale.set(1.25, 0.42, 0.95);
    st.position.set(Math.cos(a) * 0.72, 0.06, Math.sin(a) * 0.72);
    st.rotation.y = a;
    campfireGroup.add(st);
  }

  // Glowing ember bed under logs
  const emberBedMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x3b1808,
      emissive: 0xff6200,
      emissiveIntensity: 2.4,
      roughness: 0.9,
      flatShading: true,
      fog: false,
    })
  );
  const emberBed = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.56, 0.64, 0.09, 8)), emberBedMat);
  emberBed.position.y = 0.04;
  campfireGroup.add(emberBed);

  // Crossed campfire logs
  const logMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x452b18,
      emissive: 0x6b1d00,
      emissiveIntensity: 0.55,
      roughness: 0.92,
      flatShading: true,
    })
  );
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const log = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.085, 0.105, 1.15, 6)), logMat);
    log.position.set(Math.cos(a) * 0.24, 0.24, Math.sin(a) * 0.24);
    log.rotation.z = Math.PI / 2 - 0.56;
    log.rotation.y = -a;
    campfireGroup.add(log);
  }

  // Soft additive radial golden ground light pool (Signature Agrou warm floor glow!)
  const fireGlowTex = createRadialGlowTexture(
    'rgba(255, 248, 195, 0.95)',
    'rgba(255, 178, 56, 0.55)',
    'rgba(255, 118, 22, 0.14)'
  );
  disposableTex.push(fireGlowTex);
  const fireGlowPoolMat = trackMat(
    new THREE.MeshBasicMaterial({
      map: fireGlowTex,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    })
  );
  const fireGlowPool = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(7.4, 7.4)), fireGlowPoolMat);
  fireGlowPool.rotation.x = -Math.PI / 2;
  fireGlowPool.position.y = 0.025;
  campfireGroup.add(fireGlowPool);

  // Multi-layered compact blazing faceted flames (Jewel-like Agrou campfire cluster — Images 1, 2, 4!)
  const flameOuterMat = trackMat(
    new THREE.MeshBasicMaterial({ color: 0xff7b14, transparent: true, opacity: 0.94, fog: false })
  );
  const flameMidMat = trackMat(
    new THREE.MeshBasicMaterial({ color: 0xffcc3b, transparent: true, opacity: 0.96, fog: false })
  );
  const flameCoreMat = trackMat(new THREE.MeshBasicMaterial({ color: 0xfffce0, fog: false }));

  const flameGroup = new THREE.Group();
  flameGroup.position.y = 0.14;
  campfireGroup.add(flameGroup);

  const flameOuter = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.42, 0.72, 6)), flameOuterMat);
  flameOuter.position.y = 0.34;
  flameGroup.add(flameOuter);

  const flameSide1 = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.24, 0.56, 5)), flameMidMat);
  flameSide1.position.set(0.22, 0.24, 0.14);
  flameSide1.rotation.z = -0.26;
  flameGroup.add(flameSide1);

  const flameSide2 = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.22, 0.52, 5)), flameMidMat);
  flameSide2.position.set(-0.22, 0.23, -0.12);
  flameSide2.rotation.z = 0.24;
  flameGroup.add(flameSide2);

  const flameSide3 = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.2, 0.48, 5)), flameOuterMat);
  flameSide3.position.set(-0.1, 0.22, 0.22);
  flameSide3.rotation.x = 0.22;
  flameGroup.add(flameSide3);

  const flameCore = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.24, 0.5, 5)), flameCoreMat);
  flameCore.position.y = 0.26;
  flameGroup.add(flameCore);

  // Subtle faceted heat-smoke & rising spark cubes right above the fire (Image 4!)
  const FIRE_SMOKE_COUNT = 22;
  const smokeCubeGeo = trackGeo(new THREE.BoxGeometry(0.16, 0.16, 0.16));
  const smokeCubeMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xffcc66,
      transparent: true,
      opacity: 0.48,
      depthWrite: false,
      fog: false,
    })
  );
  const fireSmokeInst = new THREE.InstancedMesh(smokeCubeGeo, smokeCubeMat, FIRE_SMOKE_COUNT);
  const fireSmokeData = Array.from({ length: FIRE_SMOKE_COUNT }, (_, i) => ({
    x: (hash2(i, 1.2) - 0.5) * 0.65,
    y: 0.4 + hash2(i, 2.8) * 1.9,
    z: (hash2(i, 5.1) - 0.5) * 0.65,
    vy: 0.55 + hash2(i, 8.4) * 0.55,
    phase: hash2(i, 9.3) * Math.PI * 2,
  }));
  scene.add(fireSmokeInst);

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

  // 5a. Giant Towering Redwood Trunks (34 massive dark trunks rising straight out of frame!)
  const redwoodBarkMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x2a1d17,
      roughness: 0.96,
      flatShading: true,
    })
  );
  const redwoodCanopyMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x264c33,
      roughness: 0.9,
      flatShading: true,
    })
  );
  const redwoodCanopyHiMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x35643e,
      roughness: 0.88,
      flatShading: true,
    })
  );

  const REDWOOD_COUNT = 40;
  const trunkGeo = trackGeo(new THREE.CylinderGeometry(0.58, 1.12, 34, 8));
  const trunkInst = new THREE.InstancedMesh(trunkGeo, redwoodBarkMat, REDWOOD_COUNT);
  trunkInst.castShadow = !isSoftwareGl;
  trunkInst.receiveShadow = true;

  // Slender, graceful conifer spire tiers framing the distant forest horizon without ever obstructing panoramic/overhead camera views
  const canopyConeGeo = trackGeo(new THREE.ConeGeometry(3.05, 4.6, 7));
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
  const tentSpecs: Array<{ x: number; z: number; rotY: number; variant: 'light' | 'dark' }> = [
    { x: -13.6, z: 10.6, rotY: 0.72, variant: 'dark' },
    { x: 12.8, z: 10.4, rotY: -0.78, variant: 'light' },
    { x: -16.2, z: -0.8, rotY: 1.48, variant: 'light' },
    { x: -9.4, z: -15.4, rotY: 2.65, variant: 'dark' },
    { x: 5.6, z: -15.8, rotY: -2.75, variant: 'light' },
    { x: 15.2, z: -8.8, rotY: -1.95, variant: 'light' },
  ];
  for (const ts of tentSpecs) {
    const tent = createCanvasTent(ts.variant);
    const ty = sampleTerrainHeight(ts.x, ts.z, 'forest');
    tent.position.set(ts.x, ty - 0.03, ts.z);
    tent.rotation.y = ts.rotY;
    redwoodCampGroup.add(tent);
  }

  // 5c. Stacked Cut Timber Log Pile near foreground clearing edge (Exact prop from Image 2!)
  const timberPile = new THREE.Group();
  const timberLogMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x4f3827, roughness: 0.92, flatShading: true })
  );
  const timberEndMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x9c7b55, roughness: 0.9, flatShading: true })
  );
  const logRows = [
    [-0.58, 0.25], [0, 0.25], [0.58, 0.25],
    [-0.29, 0.72], [0.29, 0.72],
    [0, 1.18],
  ];
  for (const [lx, ly] of logRows) {
    const tLog = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.27, 0.29, 4.6, 7)),
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

  // 5d. Expedition Camp Props: Supply Barrels, Banded Chest, Camp Table with Bottles, Hide Drying Rack!
  const barrelWoodMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x5c3e26, roughness: 0.88, flatShading: true })
  );
  const darkIronMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x262b30, roughness: 0.55, metalness: 0.55, flatShading: true })
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

  // 5e. Mossy Stepped Rock Ledges & Giant Fallen Hollow Logs framing the outer glade
  const mossyRockMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x505960, roughness: 0.94, flatShading: true })
  );
  const mossCapMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x4c7c32, roughness: 0.92, flatShading: true })
  );
  const rockLedges = [
    { x: -16.5, z: -19.0, sx: 4.8, sy: 2.7, sz: 3.6 },
    { x: -3.5, z: -21.5, sx: 5.2, sy: 3.0, sz: 3.8 },
    { x: 11.8, z: -20.5, sx: 5.4, sy: 3.3, sz: 4.0 },
    { x: 19.2, z: -13.5, sx: 4.2, sy: 2.4, sz: 3.4 },
  ];
  for (const rl of rockLedges) {
    const lg = new THREE.Group();
    const baseRock = new THREE.Mesh(trackGeo(new THREE.DodecahedronGeometry(1.0, 0)), mossyRockMat);
    baseRock.scale.set(rl.sx, rl.sy, rl.sz);
    baseRock.position.y = rl.sy * 0.45;
    lg.add(baseRock);

    const mossTop = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.84, 0.96, 0.42, 7)), mossCapMat);
    mossTop.scale.set(rl.sx * 0.82, 1, rl.sz * 0.78);
    mossTop.position.y = rl.sy * 1.18;
    lg.add(mossTop);

    lg.position.set(rl.x, sampleTerrainHeight(rl.x, rl.z, 'forest') - 0.5, rl.z);
    redwoodCampGroup.add(lg);
  }

  // Dramatic angled fallen redwood trunk resting against the back mossy cliff (Exact detail from center-back of Image 2!)
  const fallenTrunk = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.62, 0.95, 11.5, 7)),
    redwoodBarkMat
  );
  fallenTrunk.position.set(2.8, 2.4, -19.8);
  fallenTrunk.rotation.set(0.32, 0.48, 0.98);
  redwoodCampGroup.add(fallenTrunk);

  const fallenTrunk2 = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.48, 0.72, 9.5, 7)),
    redwoodBarkMat
  );
  fallenTrunk2.position.set(-18.2, 0.9, -12.5);
  fallenTrunk2.rotation.set(0.05, 0.4, Math.PI / 2 - 0.08);
  redwoodCampGroup.add(fallenTrunk2);

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

  // 6a. Winding Shimmering Blue River Ribbon
  const riverGeo = trackGeo(new THREE.PlaneGeometry(108, 5.2, 48, 4));
  riverGeo.rotateX(-Math.PI / 2);
  const rPos = riverGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < rPos.count; i++) {
    const rx = rPos.getX(i);
    const rzLocal = rPos.getZ(i);
    rPos.setZ(i, getRiverCenterZ(rx) + rzLocal);
    rPos.setY(i, -0.24 + Math.sin(rx * 0.4 + rzLocal) * 0.03);
  }
  rPos.needsUpdate = true;
  riverGeo.computeVertexNormals();

  const riverMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x3b92de,
      emissive: 0x113358,
      emissiveIntensity: 0.35,
      roughness: 0.16,
      metalness: 0.25,
      flatShading: true,
    })
  );
  const riverMesh = new THREE.Mesh(riverGeo, riverMat);
  meadowCampGroup.add(riverMesh);

  // Shimmering foam / water highlight strips along the river
  const shimmerMat = trackMat(
    new THREE.MeshBasicMaterial({ color: 0xbce6ff, transparent: true, opacity: 0.45 })
  );
  const shimmerStrips: THREE.Mesh[] = [];
  for (let s = 0; s < 14; s++) {
    const sx = -26 + s * 4.1;
    const sz = getRiverCenterZ(sx) + (s % 2 === 0 ? -0.45 : 0.45);
    const strip = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(2.1, 0.22)), shimmerMat);
    strip.rotation.x = -Math.PI / 2;
    strip.position.set(sx, -0.19, sz);
    meadowCampGroup.add(strip);
    shimmerStrips.push(strip);
  }

  // 6b. Riverside Boulders & Cattail Reeds lining both banks (Exact detail from Image 1!)
  const riverRockMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x737b80, roughness: 0.9, flatShading: true })
  );
  const riverBoulderPositions = [
    { x: -3.2, dz: -1.65, s: 1.55 },
    { x: -1.6, dz: -1.85, s: 0.95 },
    { x: 11.5, dz: 1.55, s: 1.2 },
    { x: -13.4, dz: 1.65, s: 1.15 },
    { x: 6.2, dz: -1.9, s: 0.85 },
  ];
  for (const rb of riverBoulderPositions) {
    const bx = rb.x;
    const bz = getRiverCenterZ(bx) + rb.dz;
    const rock = new THREE.Mesh(trackGeo(new THREE.DodecahedronGeometry(rb.s, 0)), riverRockMat);
    rock.scale.set(1.45, 0.72, 1.05);
    rock.position.set(bx, -0.05, bz);
    rock.rotation.y = bx * 0.7;
    meadowCampGroup.add(rock);
  }

  // Instanced Cattail Reeds along riverbanks
  const REED_COUNT = 68;
  const reedStalkGeo = trackGeo(new THREE.CylinderGeometry(0.022, 0.032, 1.35, 4));
  const reedStalkMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x3b6329, roughness: 0.9, flatShading: true })
  );
  const reedHeadGeo = trackGeo(new THREE.CylinderGeometry(0.052, 0.052, 0.28, 5));
  const reedHeadMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x3b2618, roughness: 0.95, flatShading: true })
  );
  const reedStalkInst = new THREE.InstancedMesh(reedStalkGeo, reedStalkMat, REED_COUNT);
  const reedHeadInst = new THREE.InstancedMesh(reedHeadGeo, reedHeadMat, REED_COUNT);

  for (let i = 0; i < REED_COUNT; i++) {
    const rx = -24 + (i / REED_COUNT) * 48 + (hash2(i, 1.7) - 0.5) * 1.4;
    const side = i % 2 === 0 ? 1 : -1;
    const rz = getRiverCenterZ(rx) + side * (1.75 + hash2(i, 4.3) * 0.85);
    const ry = sampleTerrainHeight(rx, rz, 'autumn');
    const tilt = (hash2(i, 6.6) - 0.5) * 0.22;
    const hScale = 0.78 + hash2(i, 8.9) * 0.52;

    dummy.position.set(rx, ry + 0.62 * hScale, rz);
    dummy.rotation.set(tilt, hash2(i, 2.5) * Math.PI, tilt * 0.8);
    dummy.scale.set(1, hScale, 1);
    dummy.updateMatrix();
    reedStalkInst.setMatrixAt(i, dummy.matrix);

    dummy.position.set(rx + tilt * 0.2, ry + 1.08 * hScale, rz);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    reedHeadInst.setMatrixAt(i, dummy.matrix);
  }
  reedStalkInst.instanceMatrix.needsUpdate = true;
  reedHeadInst.instanceMatrix.needsUpdate = true;
  meadowCampGroup.add(reedStalkInst);
  meadowCampGroup.add(reedHeadInst);

  // 6c. 3 Monumental Ancient Gnarled Hilltop Oak Trees positioned so FULL trunks + wide umbrella canopies frame the blue sky (Exact match to Image 1 & 3!)
  const oakSpecs = [
    { x: 10.6, z: -32.0, scale: 1.08, rotY: 0.4 },   // Giant Hero Oak on right-center hill (Image 1!)
    { x: -3.2, z: -38.0, scale: 0.78, rotY: 2.1 },   // Distant mid-hill oak (Image 1!)
    { x: -24.5, z: -29.5, scale: 1.02, rotY: 4.3 },  // Left hillside oak (Image 3!)
  ];
  for (const os of oakSpecs) {
    const oak = createAncientOakTree(os.scale);
    const oy = sampleTerrainHeight(os.x, os.z, 'autumn');
    oak.position.set(os.x, oy - 0.55, os.z);
    oak.rotation.y = os.rotY;
    meadowCampGroup.add(oak);
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
      isSoftwareGl: swGl,
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

      // Frostpeak snow tint on canopies, rocks & ferns
      if (biomeKey === 'frostpeak') {
        redwoodCanopyMat.color.setHex(isDay ? 0x628596 : 0x263f4d);
        redwoodCanopyHiMat.color.setHex(isDay ? 0xd2e6f5 : 0x5d7a94);
        mossCapMat.color.setHex(isDay ? 0xe4f0f8 : 0x627c94);
        fernMat.color.setHex(isDay ? 0xd2e4ef : 0x587488);
        for (let fi = 0; fi < FERN_COUNT; fi++) {
          cTmp.setHex(fi % 2 === 0 ? 0xcfe4f0 : 0x8eb0c4);
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

      riverMat.color.setHex(isDay ? 0x3b92de : 0x163c66);
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

    // Subtle river shimmer drift in Riverside Meadow
    if (meadowCampGroup.visible) {
      for (let s = 0; s < shimmerStrips.length; s++) {
        const st = shimmerStrips[s];
        const sx = ((st.position.x + simDt * 0.65 + 28) % 56) - 28;
        st.position.x = sx;
        st.position.z = getRiverCenterZ(sx) + (s % 2 === 0 ? -0.45 : 0.45);
      }
    }

    // When blindfolded asleep at night, hide distant camp scenery so ONLY the glowing campfire embers shine in darkness!
    if (isNightBlindfolded) {
      redwoodCampGroup.visible = false;
      meadowCampGroup.visible = false;
      grassInst.visible = false;
      pebbleInst.visible = false;
    } else {
      redwoodCampGroup.visible = biomeKey !== 'autumn';
      meadowCampGroup.visible = biomeKey === 'autumn';
      grassInst.visible = true;
      pebbleInst.visible = true;
    }

    // Campfire Flame, Ground Light Pool & PointLight Flicker
    const flicker = Math.sin(elapsed * 11.5) * 0.11 + Math.cos(elapsed * 17.3) * 0.07;
    const baseScale = isNightBlindfolded ? 0.92 : isDay && !isTitleScreen ? 0.92 : 1.08;
    flameOuter.scale.set(
      baseScale * (1 + flicker * 0.35),
      baseScale * (1 + flicker * 0.95),
      baseScale * (1 + flicker * 0.35)
    );
    flameCore.scale.set(
      baseScale * (1 - flicker * 0.25),
      baseScale * (1 + flicker * 1.1),
      baseScale * (1 - flicker * 0.25)
    );
    flameSide1.scale.setScalar(baseScale * (0.95 + flicker * 0.5));
    flameSide2.scale.setScalar(baseScale * (0.95 - flicker * 0.45));

    fireGlowPoolMat.opacity = isNightBlindfolded
      ? 0.84 + flicker * 0.14
      : (isDay ? 0.78 : 0.96) + flicker * 0.14;
    const poolScale = (isNightBlindfolded ? 0.82 : 1) + flicker * 0.12;
    fireGlowPool.scale.set(poolScale, poolScale, 1);

    fireLight.intensity =
      (isNightBlindfolded ? 10.5 : isDay ? 12.5 : 18.5) +
      flicker * (isNightBlindfolded ? 2.4 : 4.2);
    fireLight.distance = isNightBlindfolded ? 9.5 : 34;

    // Rising faceted heat-smoke & ember cubes right above campfire (keep warm embers drifting even when blindfolded!)
    for (let i = 0; i < FIRE_SMOKE_COUNT; i++) {
      const sp = fireSmokeData[i];
      sp.y += sp.vy * simDt;
      if (sp.y > 2.45) {
        sp.y = 0.32;
        sp.x = (hash2(i, Math.floor(elapsed * 3) + 1) - 0.5) * 0.55;
        sp.z = (hash2(i, Math.floor(elapsed * 3) + 7) - 0.5) * 0.55;
      }
      const life = 1 - (sp.y - 0.32) / 2.13;
      const sc = Math.max(0.15, life * (isNightBlindfolded ? 0.72 : 1.15));
      dummy.position.set(
        sp.x + Math.sin(elapsed * 3.8 + sp.phase) * 0.12,
        sp.y,
        sp.z + Math.cos(elapsed * 3.2 + sp.phase) * 0.12
      );
      dummy.rotation.set(elapsed * 1.5 + sp.phase, elapsed * 2.1, 0);
      dummy.scale.setScalar(sc);
      dummy.updateMatrix();
      fireSmokeInst.setMatrixAt(i, dummy.matrix);
    }
    fireSmokeInst.instanceMatrix.needsUpdate = true;

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
    // - Frostpeak ('frostpeak'): Soft falling alpine snow
    // - Redwood ('forest'): Warm glowing embers + forest firefly motes
    const isSnow = biomeKey === 'frostpeak';
    const isMeadow = biomeKey === 'autumn';
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const p = particleData[i];
      if (isSnow) {
        p.y -= 1.2 * p.vy * simDt;
        if (p.y < 0.15) {
          p.y = 9.5 + (i % 4) * 1.4;
        }
        dummy.position.set(
          p.x + Math.sin(elapsed * 1.4 + p.phase) * 0.6,
          p.y,
          p.z + Math.cos(elapsed * 1.1 + p.phase) * 0.5
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

    // Gentle breeze sway on grass mesh (skip per-frame transform on software WebGL for speed)
    if (!swGl) {
      grassInst.rotation.y = Math.sin(elapsed * 0.9) * 0.004;
    }
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

  const dispose = () => {
    for (const g of disposableGeos) g.dispose();
    for (const m of disposableMats) m.dispose();
    for (const t of disposableTex) t.dispose();
  };

  return {
    campfireHitbox,
    fireLight,
    update,
    dispose,
  };
}
