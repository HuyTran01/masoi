import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Player, Phase, ThrownPropEvent, PropType, Language } from '../types/game';
import { ROLES } from '../game/roles';
import { UI_TEXT } from '../utils/i18n';
import { sound, PROP_REACTION_META } from '../utils/sound';

interface WerewolfVillage3DProps {
  players: Player[];
  userPlayerId: string;
  phase: Phase;
  lang: Language;
  isTitleScreen: boolean;
  isPlayerAwakeAtNight: boolean;
  freeLook360: boolean;
  moveVector: { x: number; z: number };
  thrownProps: ThrownPropEvent[];
  selectedTargetId: string | null;
  secondaryTargetId?: string | null;
  cupidLovers?: [string, string] | null;
  votesMap: Record<string, number>;
  activeSpeakers: string[];
  revealAllRoles?: boolean;
  cameraPreset: 'orbit' | 'campfire' | 'overhead' | 'dramatic';
  onSelectPlayer: (playerId: string) => void;
}

interface SeatVisual {
  group: THREE.Group;
  bodyGroup: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  ghostGroup: THREE.Group;
  hitbox: THREE.Mesh;
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
  koProgress: number;
  wobbleTimer: number;
  throwAnimTimer: number;
  reactionType: 'none' | 'angry' | 'happy_dance';
  reactionTimer: number;
  baseAngle: number;
  homePos: THREE.Vector3;
  currentPos: THREE.Vector3;
  ghostPos: THREE.Vector3;
  worldPos: THREE.Vector3;
  playerId: string;
}

interface ActiveProjectile3D {
  id: string;
  group: THREE.Group;
  trailParticles: THREE.Mesh[];
  startPos: THREE.Vector3;
  endPos: THREE.Vector3;
  targetSeatIndex: number;
  propType: PropType;
  progress: number;
}

interface SplatParticle {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  rotSpeed: number;
  isFloatingGas?: boolean;
  isFlutterPetal?: boolean;
}

interface ActiveSplatEffect3D {
  group: THREE.Group;
  particles: SplatParticle[];
  puddleMesh: THREE.Group;
  bodySplatMesh: THREE.Group;
  targetSeatIndex: number;
  age: number;
  maxAge: number;
  propType: PropType;
}

const MAX_SEATS = 20;
const PARTICLE_COUNT = 65;
const STAR_COUNT = 140;

// Pre-allocated math scratch objects outside render loop (Zero GC)
const _projVec = new THREE.Vector3();
const _targetCamPos = new THREE.Vector3();
const _targetLookAt = new THREE.Vector3();
const _currentLookAt = new THREE.Vector3(0, 1.2, 0);
const _dummyObj = new THREE.Object3D();
const _scratchColor = new THREE.Color();
const _arcPos = new THREE.Vector3();

const SEAT_COLORS = [
  0xe11d48, // crimson
  0x9333ea, // purple
  0x0284c7, // sky
  0x059669, // emerald
  0xd97706, // amber
  0xec4899, // pink
  0x4f46e5, // indigo
  0x0d9488, // teal
  0xea580c, // orange
  0x65a30d, // lime
  0x2563eb, // blue
  0xc026d3, // fuchsia
];

const PROP_STYLE_MAP: Record<PropType, { icon: string; bg: string }> = {
  tomato: {
    icon: '🍅',
    bg: 'bg-red-600 border-red-300 text-white',
  },
  egg: {
    icon: '🥚',
    bg: 'bg-lime-500 border-yellow-200 text-slate-950',
  },
  rose: {
    icon: '💐',
    bg: 'bg-pink-600 border-pink-300 text-white',
  },
  water: {
    icon: '🪣',
    bg: 'bg-sky-500 border-sky-200 text-slate-950',
  },
};

export const WerewolfVillage3D: React.FC<WerewolfVillage3DProps> = ({
  players,
  userPlayerId,
  phase,
  lang,
  isTitleScreen,
  isPlayerAwakeAtNight,
  freeLook360,
  moveVector,
  thrownProps,
  selectedTargetId,
  secondaryTargetId,
  cupidLovers,
  votesMap,
  activeSpeakers,
  revealAllRoles,
  cameraPreset,
  onSelectPlayer,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const labelContainerRef = useRef<HTMLDivElement>(null);
  const labelElsRef = useRef<(HTMLDivElement | null)[]>([]);
  const processedPropsRef = useRef<Set<string>>(new Set());

  // Mutable ref holding latest props so 60Hz WebGL loop never tears down on React state changes
  const stateRef = useRef({
    players,
    userPlayerId,
    phase,
    isTitleScreen,
    isPlayerAwakeAtNight,
    freeLook360,
    moveVector,
    thrownProps,
    selectedTargetId,
    secondaryTargetId,
    cupidLovers,
    votesMap,
    activeSpeakers,
    revealAllRoles,
    cameraPreset,
    onSelectPlayer,
    hoveredPlayerId: null as string | null,
    trauma: 0,
    hitstop: 0,
    // 360° Camera Orbit State
    azimuthAngle: 0,
    polarAngle: 0.54,
    cameraDist: 16.2,
    isDraggingOrbit: false,
    // Open-World Roaming & Ghost Free-Flight Offset
    userRoamX: 0,
    userRoamZ: 5.65,
    isUserRoaming: false,
    dashTargetPos: null as THREE.Vector3 | null,
    lastProximitySelectTime: 0,
    // Active Keyboard WASD state
    keysPressed: new Set<string>(),
  });

  useEffect(() => {
    const prevSelected = stateRef.current.selectedTargetId;
    const prevPhase = stateRef.current.phase;
    stateRef.current = {
      ...stateRef.current,
      players,
      userPlayerId,
      phase,
      isTitleScreen,
      isPlayerAwakeAtNight,
      freeLook360,
      moveVector,
      thrownProps,
      selectedTargetId,
      secondaryTargetId,
      cupidLovers,
      votesMap,
      activeSpeakers,
      revealAllRoles,
      cameraPreset,
      onSelectPlayer,
    };

    if (phase !== prevPhase || isTitleScreen) {
      stateRef.current.isUserRoaming = false;
      stateRef.current.dashTargetPos = null;
    }

    if (
      selectedTargetId &&
      selectedTargetId !== prevSelected &&
      phase === 'night' &&
      isPlayerAwakeAtNight
    ) {
      const targetIdx = players.findIndex((p) => p.id === selectedTargetId);
      if (targetIdx !== -1 && players.length > 0) {
        const angle = Math.PI / 2 + (targetIdx / players.length) * Math.PI * 2;
        const r = 4.35;
        stateRef.current.dashTargetPos = new THREE.Vector3(
          Math.cos(angle) * r,
          0,
          Math.sin(angle) * r
        );
        stateRef.current.isUserRoaming = true;
      }
    }

    if (selectedTargetId && selectedTargetId !== prevSelected) {
      stateRef.current.trauma = Math.min(1, stateRef.current.trauma + 0.32);
      stateRef.current.hitstop = 0.04;
    }
    if (phase !== prevPhase) {
      stateRef.current.trauma = Math.min(1, stateRef.current.trauma + 0.42);
    }
  }, [
    players,
    userPlayerId,
    phase,
    isTitleScreen,
    isPlayerAwakeAtNight,
    freeLook360,
    moveVector,
    thrownProps,
    selectedTargetId,
    secondaryTargetId,
    cupidLovers,
    votesMap,
    activeSpeakers,
    revealAllRoles,
    cameraPreset,
    onSelectPlayer,
  ]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Detect software WebGL (SwiftShader / llvmpipe)
    const isSoftwareGl = (() => {
      try {
        const gl = document.createElement('canvas').getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    // 2. Initialize Renderer, Scene, Camera (with graceful WebGL fallback)
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
      });
    } catch {
      try {
        renderer = new THREE.WebGLRenderer({ antialias: false });
      } catch (err) {
        console.warn('WebGLRenderer unavailable:', err);
        return;
      }
    }
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.22;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    renderer.setSize(width, height);
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const bgNight = new THREE.Color(0x070b16);
    const bgBlindNight = new THREE.Color(0x020308);
    const bgDay = new THREE.Color(0x1e293b);
    scene.background = bgNight.clone();
    scene.fog = new THREE.FogExp2(0x070b16, 0.017);

    const camera = new THREE.PerspectiveCamera(46, width / height, 0.5, 140);
    camera.position.set(0, 8.2, 15.5);
    camera.lookAt(0, 1.0, 0);

    // Studio Environment Map (RoomEnvironment)
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 3. Detailed Procedural Ground Cobblestone & Moss Texture + Bump Micro-Relief
    const createGroundTexture = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#111822';
      ctx.fillRect(0, 0, 512, 512);
      for (let i = 0; i < 480; i++) {
        const x = (i * 97) % 512;
        const y = (i * 163) % 512;
        const r = 7 + (i % 15);
        ctx.fillStyle =
          i % 4 === 0
            ? '#1e293b'
            : i % 4 === 1
            ? '#172326'
            : i % 4 === 2
            ? '#17202e'
            : '#0f1722';
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#090d14';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      const tex = new THREE.CanvasTexture(canvas);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(11, 11);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
      return tex;
    };

    const groundTex = createGroundTexture();
    const groundGeo = new THREE.CircleGeometry(56, 60);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: groundTex,
      bumpMap: groundTex,
      bumpScale: 0.14,
      roughness: 0.84,
      metalness: 0.08,
    });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.receiveShadow = true;
    scene.add(groundMesh);

    // Stone Ritual Circle Path + Inner Rune Ring + Radial Stepping Stones
    const ringRoadGeo = new THREE.RingGeometry(4.65, 6.65, 56);
    const ringRoadMat = new THREE.MeshStandardMaterial({
      color: 0x263142,
      roughness: 0.72,
      metalness: 0.18,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const ringRoad = new THREE.Mesh(ringRoadGeo, ringRoadMat);
    ringRoad.rotation.x = -Math.PI / 2;
    ringRoad.position.y = 0.02;
    ringRoad.receiveShadow = true;
    scene.add(ringRoad);

    const innerRuneRingGeo = new THREE.RingGeometry(2.15, 2.38, 44);
    const innerRuneRingMat = new THREE.MeshBasicMaterial({
      color: 0xd97706,
      transparent: true,
      opacity: 0.42,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const innerRuneRing = new THREE.Mesh(innerRuneRingGeo, innerRuneRingMat);
    innerRuneRing.rotation.x = -Math.PI / 2;
    innerRuneRing.position.y = 0.025;
    scene.add(innerRuneRing);

    // 4. Lighting Rig
    const hemiLight = new THREE.HemisphereLight(0x4765a0, 0x111522, 0.98);
    hemiLight.position.set(0, 25, 0);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0x93c5fd, 1.4);
    dirLight.position.set(12, 19, -10);
    dirLight.castShadow = !isSoftwareGl;
    if (!isSoftwareGl) {
      dirLight.shadow.mapSize.width = 1024;
      dirLight.shadow.mapSize.height = 1024;
      const d = 14;
      dirLight.shadow.camera.left = -d;
      dirLight.shadow.camera.right = d;
      dirLight.shadow.camera.top = d;
      dirLight.shadow.camera.bottom = -d;
      dirLight.shadow.camera.near = 1;
      dirLight.shadow.camera.far = 45;
      dirLight.shadow.bias = -0.0005;
      dirLight.shadow.normalBias = 0.02;
    }
    scene.add(dirLight);

    const fireLight = new THREE.PointLight(0xff6b1a, 5.2, 22, 1.5);
    fireLight.position.set(0, 1.5, 0);
    scene.add(fireLight);

    // Celestial Blood Moon / Golden Sun Orb in background vista
    const moonGroup = new THREE.Group();
    const moonGeo = new THREE.SphereGeometry(2.7, 24, 24);
    const moonMat = new THREE.MeshBasicMaterial({ color: 0xfda4af });
    const moonMesh = new THREE.Mesh(moonGeo, moonMat);
    const moonHaloGeo = new THREE.RingGeometry(2.8, 4.3, 32);
    const moonHaloMat = new THREE.MeshBasicMaterial({
      color: 0xf43f5e,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const moonHalo = new THREE.Mesh(moonHaloGeo, moonHaloMat);
    moonGroup.add(moonMesh, moonHalo);
    moonGroup.position.set(0, 15.2, -31);
    scene.add(moonGroup);

    // 4B. Starry Night Sky Dome (140 Instanced Stars)
    const starGeo = new THREE.OctahedronGeometry(0.14, 0);
    const starMat = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      transparent: true,
      opacity: 0.85,
    });
    const starInst = new THREE.InstancedMesh(starGeo, starMat, STAR_COUNT);
    for (let i = 0; i < STAR_COUNT; i++) {
      const theta = (i * 2.39996) % (Math.PI * 2);
      const phi = 0.18 + ((i * 7) % 100) / 100 * 1.05;
      const r = 46 + (i % 5) * 2;
      const sx = Math.cos(theta) * Math.sin(phi) * r;
      const sy = Math.max(8, Math.cos(phi) * r);
      const sz = Math.sin(theta) * Math.sin(phi) * r;
      const scale = 0.6 + (i % 4) * 0.35;
      _dummyObj.position.set(sx, sy, sz);
      _dummyObj.scale.setScalar(scale);
      _dummyObj.updateMatrix();
      starInst.setMatrixAt(i, _dummyObj.matrix);
    }
    starInst.computeBoundingSphere();
    scene.add(starInst);

    // 5. Central Crackling Campfire & Stone Altar
    const campfireGroup = new THREE.Group();
    const altarBaseGeo = new THREE.CylinderGeometry(1.55, 1.75, 0.16, 20);
    const altarBaseMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.85,
      metalness: 0.2,
    });
    const altarBase = new THREE.Mesh(altarBaseGeo, altarBaseMat);
    altarBase.position.y = 0.08;
    altarBase.receiveShadow = true;
    campfireGroup.add(altarBase);

    const stoneGeo = new THREE.DodecahedronGeometry(0.32, 0);
    const stoneMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.82,
      metalness: 0.18,
    });
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const rock = new THREE.Mesh(stoneGeo, stoneMat);
      rock.position.set(Math.cos(a) * 1.22, 0.24, Math.sin(a) * 1.22);
      rock.scale.set(1.1, 0.78, 0.95);
      rock.rotation.y = a;
      campfireGroup.add(rock);
    }

    const logGeo = new THREE.CylinderGeometry(0.11, 0.14, 1.75, 8);
    const logMat = new THREE.MeshStandardMaterial({
      color: 0x3b2316,
      roughness: 0.9,
      metalness: 0.05,
    });
    for (let i = 0; i < 5; i++) {
      const log = new THREE.Mesh(logGeo, logMat);
      log.position.y = 0.3;
      log.rotation.z = Math.PI / 2.5;
      log.rotation.y = (i * Math.PI) / 5;
      campfireGroup.add(log);
    }

    const emberCoreGeo = new THREE.SphereGeometry(0.55, 12, 10);
    const emberCoreMat = new THREE.MeshBasicMaterial({ color: 0xf97316 });
    const emberCore = new THREE.Mesh(emberCoreGeo, emberCoreMat);
    emberCore.scale.set(1.2, 0.45, 1.2);
    emberCore.position.y = 0.24;
    campfireGroup.add(emberCore);

    const flameOuterGeo = new THREE.ConeGeometry(0.7, 1.75, 10);
    const flameOuterMat = new THREE.MeshBasicMaterial({
      color: 0xea580c,
      transparent: true,
      opacity: 0.88,
    });
    const flameOuter = new THREE.Mesh(flameOuterGeo, flameOuterMat);
    flameOuter.position.y = 0.92;

    const flameInnerGeo = new THREE.ConeGeometry(0.42, 1.28, 8);
    const flameInnerMat = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
    });
    const flameInner = new THREE.Mesh(flameInnerGeo, flameInnerMat);
    flameInner.position.y = 0.78;

    campfireGroup.add(flameOuter, flameInner);
    scene.add(campfireGroup);

    // 6. Ancient Gothic Stone Archway & Village Judgment Gallows Podium
    const archGroup = new THREE.Group();
    const pillarGeo = new THREE.BoxGeometry(0.9, 4.6, 0.9);
    const pillarCapGeo = new THREE.BoxGeometry(1.15, 0.32, 1.15);
    const archStoneMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.78,
      metalness: 0.22,
    });
    const leftPillar = new THREE.Mesh(pillarGeo, archStoneMat);
    leftPillar.position.set(-2.2, 2.3, 0);
    const rightPillar = new THREE.Mesh(pillarGeo, archStoneMat);
    rightPillar.position.set(2.2, 2.3, 0);
    const leftCap = new THREE.Mesh(pillarCapGeo, archStoneMat);
    leftCap.position.set(-2.2, 4.65, 0);
    const rightCap = new THREE.Mesh(pillarCapGeo, archStoneMat);
    rightCap.position.set(2.2, 4.65, 0);

    const lintelGeo = new THREE.BoxGeometry(5.8, 0.78, 1.08);
    const lintel = new THREE.Mesh(lintelGeo, archStoneMat);
    lintel.position.set(0, 5.0, 0);

    const runeOrbGeo = new THREE.OctahedronGeometry(0.5, 0);
    const runeOrbMat = new THREE.MeshBasicMaterial({ color: 0xf43f5e });
    const runeOrb = new THREE.Mesh(runeOrbGeo, runeOrbMat);
    runeOrb.position.set(0, 5.85, 0);

    archGroup.add(leftPillar, rightPillar, leftCap, rightCap, lintel, runeOrb);
    archGroup.position.set(0, 0, -11.5);
    scene.add(archGroup);

    // 6B. Medieval Windmill with Rotating Sails & Stone Watchtower with Blazing Brazier
    const windmillGroup = new THREE.Group();
    const millTowerGeo = new THREE.CylinderGeometry(1.15, 1.65, 5.6, 12);
    const millRoofGeo = new THREE.ConeGeometry(1.5, 1.8, 12);
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x453227, roughness: 0.85 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x1e1b2e, roughness: 0.62 });
    const millTower = new THREE.Mesh(millTowerGeo, wallMat);
    millTower.position.y = 2.8;
    const millRoof = new THREE.Mesh(millRoofGeo, roofMat);
    millRoof.position.y = 6.5;
    windmillGroup.add(millTower, millRoof);

    const windmillBlades = new THREE.Group();
    windmillBlades.position.set(0, 4.8, 1.32);
    const bladeHub = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.4, 10), logMat);
    bladeHub.rotation.x = Math.PI / 2;
    windmillBlades.add(bladeHub);

    const sailSpokeGeo = new THREE.BoxGeometry(0.12, 5.8, 0.08);
    const sailCanvasGeo = new THREE.BoxGeometry(0.62, 2.2, 0.04);
    const sailCanvasMat = new THREE.MeshStandardMaterial({
      color: 0xd6d3d1,
      roughness: 0.7,
    });
    for (let b = 0; b < 2; b++) {
      const spoke = new THREE.Mesh(sailSpokeGeo, logMat);
      spoke.rotation.z = (b * Math.PI) / 2;
      windmillBlades.add(spoke);
    }
    for (let s = 0; s < 4; s++) {
      const sailPivot = new THREE.Group();
      sailPivot.rotation.z = (s * Math.PI) / 2;
      const sail = new THREE.Mesh(sailCanvasGeo, sailCanvasMat);
      sail.position.set(0.24, 1.65, 0.04);
      sailPivot.add(sail);
      windmillBlades.add(sailPivot);
    }
    windmillGroup.add(windmillBlades);
    windmillGroup.position.set(-14.5, 0, -13.5);
    windmillGroup.rotation.y = 0.48;
    scene.add(windmillGroup);

    // Fortified Stone Watchtower with Glowing Beacon Brazier on the right flank
    const watchtowerGroup = new THREE.Group();
    const towerBody = new THREE.Mesh(
      new THREE.CylinderGeometry(1.35, 1.65, 6.2, 12),
      archStoneMat
    );
    towerBody.position.y = 3.1;
    const towerCrown = new THREE.Mesh(
      new THREE.CylinderGeometry(1.6, 1.45, 0.65, 12),
      archStoneMat
    );
    towerCrown.position.y = 6.3;
    const brazierFlame = new THREE.Mesh(
      new THREE.ConeGeometry(0.65, 1.4, 8),
      flameOuterMat
    );
    brazierFlame.position.y = 7.1;
    watchtowerGroup.add(towerBody, towerCrown, brazierFlame);
    watchtowerGroup.position.set(14.5, 0, -13.5);
    scene.add(watchtowerGroup);

    // 7. Detailed Multi-Part Medieval Timber-Framed Cottages + Barrels & Fences
    const cottagePositions = [
      { x: -11.5, z: -7.5, rot: 0.55 },
      { x: 11.5, z: -7.5, rot: -0.55 },
      { x: -13.2, z: 4.5, rot: 1.25 },
      { x: 13.2, z: 4.5, rot: -1.25 },
      { x: -7.5, z: -13.0, rot: 0.25 },
      { x: 7.5, z: -13.0, rot: -0.25 },
      { x: -9.8, z: 11.2, rot: 2.35 },
      { x: 9.8, z: 11.2, rot: -2.35 },
    ];
    const wallGeo = new THREE.BoxGeometry(3.4, 2.5, 2.9);
    const roofGeo = new THREE.ConeGeometry(2.85, 2.1, 4);
    const chimneyGeo = new THREE.BoxGeometry(0.52, 2.4, 0.52);
    const doorGeo = new THREE.BoxGeometry(0.75, 1.35, 0.12);
    const doorMat = new THREE.MeshStandardMaterial({ color: 0x291811, roughness: 0.9 });
    const winGeo = new THREE.PlaneGeometry(0.58, 0.68);
    const winMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });
    const barrelGeo = new THREE.CylinderGeometry(0.28, 0.26, 0.68, 10);

    cottagePositions.forEach((pos) => {
      const house = new THREE.Group();
      const base = new THREE.Mesh(wallGeo, wallMat);
      base.position.y = 1.25;
      const roof = new THREE.Mesh(roofGeo, roofMat);
      roof.position.y = 3.55;
      roof.rotation.y = Math.PI / 4;
      const chimney = new THREE.Mesh(chimneyGeo, archStoneMat);
      chimney.position.set(0.95, 3.2, -0.55);
      const door = new THREE.Mesh(doorGeo, doorMat);
      door.position.set(0, 0.68, 1.46);
      const winL = new THREE.Mesh(winGeo, winMat);
      winL.position.set(-0.92, 1.42, 1.47);
      const winR = new THREE.Mesh(winGeo, winMat);
      winR.position.set(0.92, 1.42, 1.47);
      const barrel = new THREE.Mesh(barrelGeo, logMat);
      barrel.position.set(1.45, 0.34, 1.4);
      house.add(base, roof, chimney, door, winL, winR, barrel);
      house.position.set(pos.x, 0, pos.z);
      house.rotation.y = pos.rot;
      scene.add(house);
    });

    // 7B. Wrought-Iron Streetlamps & Wooden Rail Fences around the Village Plaza (r = 8.4m)
    const lampPoleGeo = new THREE.CylinderGeometry(0.06, 0.09, 2.9, 8);
    const lampArmGeo = new THREE.BoxGeometry(0.55, 0.06, 0.06);
    const lampOrbGeo = new THREE.OctahedronGeometry(0.2, 1);
    const lampIronMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.4,
      metalness: 0.75,
    });
    const lampGlowMat = new THREE.MeshBasicMaterial({ color: 0xfde047 });
    const fenceRailGeo = new THREE.BoxGeometry(2.2, 0.09, 0.07);
    const fencePostGeo = new THREE.BoxGeometry(0.14, 0.95, 0.14);

    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + Math.PI / 8;
      const lx = Math.cos(a) * 8.45;
      const lz = Math.sin(a) * 8.45;

      const lampGroup = new THREE.Group();
      const pole = new THREE.Mesh(lampPoleGeo, lampIronMat);
      pole.position.y = 1.45;
      const arm = new THREE.Mesh(lampArmGeo, lampIronMat);
      arm.position.set(0.22, 2.85, 0);
      const bulb = new THREE.Mesh(lampOrbGeo, lampGlowMat);
      bulb.position.set(0.44, 2.65, 0);
      lampGroup.add(pole, arm, bulb);
      lampGroup.position.set(lx, 0, lz);
      lampGroup.rotation.y = -a + Math.PI;
      scene.add(lampGroup);

      // Add wooden fence segment next to alternate streetlamps
      if (k % 2 === 0) {
        const fence = new THREE.Group();
        const p1 = new THREE.Mesh(fencePostGeo, logMat);
        p1.position.set(-1.0, 0.47, 0);
        const p2 = new THREE.Mesh(fencePostGeo, logMat);
        p2.position.set(1.0, 0.47, 0);
        const r1 = new THREE.Mesh(fenceRailGeo, logMat);
        r1.position.set(0, 0.72, 0);
        const r2 = new THREE.Mesh(fenceRailGeo, logMat);
        r2.position.set(0, 0.38, 0);
        fence.add(p1, p2, r1, r2);
        const fa = a + 0.22;
        fence.position.set(Math.cos(fa) * 9.2, 0, Math.sin(fa) * 9.2);
        fence.rotation.y = -fa + Math.PI / 2;
        scene.add(fence);
      }
    }

    // 8. Instanced Layered Pine Forest & Majestic Distant Alpine Mountain Range
    const treeCount = 64;
    const trunkGeo = new THREE.CylinderGeometry(0.18, 0.28, 1.6, 6);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x2b1d14, roughness: 0.9 });
    const foliageGeo = new THREE.ConeGeometry(1.45, 4.1, 7);
    const foliageMat = new THREE.MeshStandardMaterial({ color: 0x0f2922, roughness: 0.8 });

    const trunkInst = new THREE.InstancedMesh(trunkGeo, trunkMat, treeCount);
    const foliageInst = new THREE.InstancedMesh(foliageGeo, foliageMat, treeCount);

    for (let i = 0; i < treeCount; i++) {
      const angle = (i / treeCount) * Math.PI * 2 + (i % 3) * 0.04;
      const radius = 16.0 + (i % 5) * 2.6;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const scale = 0.85 + (i % 4) * 0.18;

      _dummyObj.position.set(x, 0.8 * scale, z);
      _dummyObj.scale.set(scale, scale, scale);
      _dummyObj.rotation.set(0, angle, 0);
      _dummyObj.updateMatrix();
      trunkInst.setMatrixAt(i, _dummyObj.matrix);

      _dummyObj.position.set(x, 2.8 * scale, z);
      _dummyObj.updateMatrix();
      foliageInst.setMatrixAt(i, _dummyObj.matrix);

      _scratchColor.setHex(i % 2 === 0 ? 0x0f2922 : 0x14382d);
      foliageInst.setColorAt(i, _scratchColor);
    }
    trunkInst.computeBoundingSphere();
    foliageInst.computeBoundingSphere();
    scene.add(trunkInst, foliageInst);

    // Distant Alpine Mountain Range Perimeter (18 Jagged Peaks framing the horizon)
    const mountainCount = 18;
    const mountainGeo = new THREE.ConeGeometry(8.5, 19, 6);
    const mountainMat = new THREE.MeshStandardMaterial({
      color: 0x162032,
      roughness: 0.92,
      metalness: 0.08,
    });
    const mountainInst = new THREE.InstancedMesh(mountainGeo, mountainMat, mountainCount);
    for (let m = 0; m < mountainCount; m++) {
      const ma = (m / mountainCount) * Math.PI * 2;
      const mr = 38 + (m % 3) * 3.5;
      const mx = Math.cos(ma) * mr;
      const mz = Math.sin(ma) * mr;
      const sy = 0.75 + (m % 4) * 0.25;
      const sxz = 0.85 + (m % 3) * 0.22;
      _dummyObj.position.set(mx, 8.5 * sy, mz);
      _dummyObj.scale.set(sxz, sy, sxz);
      _dummyObj.rotation.set(0, ma * 1.7, 0);
      _dummyObj.updateMatrix();
      mountainInst.setMatrixAt(m, _dummyObj.matrix);
    }
    mountainInst.computeBoundingSphere();
    scene.add(mountainInst);

    // 9. Pooled Ember & Magic Particle System
    const particleGeo = new THREE.DodecahedronGeometry(0.06, 0);
    const particleMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });
    const particleInst = new THREE.InstancedMesh(particleGeo, particleMat, PARTICLE_COUNT);
    particleInst.frustumCulled = false;
    scene.add(particleInst);

    const particleData = Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
      x: (Math.random() - 0.5) * 1.4,
      y: Math.random() * 4.5,
      z: (Math.random() - 0.5) * 1.4,
      vy: 0.7 + Math.random() * 1.2,
      phase: i * 0.7,
    }));

    // 10. Create 12 Detailed 10-Part Player Seat Characters + Spectral Ghost Souls
    const seats: SeatVisual[] = [];
    const clickables: THREE.Mesh[] = [];
    const activeProjectiles: ActiveProjectile3D[] = [];
    const activeSplats: ActiveSplatEffect3D[] = [];

    const pedestalGeo = new THREE.CylinderGeometry(0.66, 0.76, 0.28, 20);
    const pedestalRimGeo = new THREE.TorusGeometry(0.68, 0.04, 8, 24);
    const pedestalMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.65,
      metalness: 0.28,
    });
    const shadowDiscGeo = new THREE.CircleGeometry(0.88, 20);
    const shadowDiscMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    });

    const bootGeo = new THREE.BoxGeometry(0.16, 0.14, 0.26);
    const bootMat = new THREE.MeshStandardMaterial({
      color: 0x1c1917,
      roughness: 0.8,
      metalness: 0.1,
    });
    const torsoGeo = new THREE.CylinderGeometry(0.26, 0.42, 0.88, 16);
    const beltGeo = new THREE.CylinderGeometry(0.35, 0.36, 0.1, 16);
    const beltBuckleGeo = new THREE.BoxGeometry(0.14, 0.12, 0.08);
    const buckleMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      roughness: 0.25,
      metalness: 0.85,
    });
    const capeGeo = new THREE.CylinderGeometry(0.3, 0.48, 0.36, 16);
    const armGeo = new THREE.CapsuleGeometry(0.075, 0.38, 6, 8);
    const handGeo = new THREE.SphereGeometry(0.08, 8, 8);
    const headGeo = new THREE.SphereGeometry(0.26, 18, 18);
    const noseGeo = new THREE.ConeGeometry(0.045, 0.11, 8);
    const headMat = new THREE.MeshStandardMaterial({
      color: 0xfde68a,
      roughness: 0.42,
      metalness: 0.05,
    });
    const hatBrimGeo = new THREE.CylinderGeometry(0.46, 0.46, 0.04, 16);
    const hatConeGeo = new THREE.ConeGeometry(0.3, 0.54, 14);
    const hatBandGeo = new THREE.CylinderGeometry(0.31, 0.32, 0.07, 14);
    const hatMat = new THREE.MeshStandardMaterial({
      color: 0x111827,
      roughness: 0.55,
      metalness: 0.25,
    });
    const earGeo = new THREE.ConeGeometry(0.095, 0.28, 6);
    const earMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.65 });
    const snoutGeo = new THREE.ConeGeometry(0.12, 0.22, 8);
    const eyeGeo = new THREE.SphereGeometry(0.04, 10, 10);

    const haloGeo = new THREE.RingGeometry(0.74, 0.9, 28);
    const shieldGeo = new THREE.TorusGeometry(0.68, 0.038, 8, 24);
    const shieldMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
    const heartGeo = new THREE.OctahedronGeometry(0.16, 0);
    const heartMat = new THREE.MeshBasicMaterial({ color: 0xf43f5e });

    const postGeo = new THREE.BoxGeometry(0.08, 1.48, 0.08);
    const lanternGeo = new THREE.SphereGeometry(0.14, 12, 12);
    const lanternCapGeo = new THREE.ConeGeometry(0.18, 0.12, 8);
    const tombGeo = new THREE.BoxGeometry(0.48, 0.78, 0.16);
    const tombCrossVGeo = new THREE.BoxGeometry(0.08, 0.34, 0.06);
    const tombCrossHGeo = new THREE.BoxGeometry(0.24, 0.08, 0.06);
    const tombMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.82 });

    // Spectral Ghost Soul Geometries & Materials
    const ghostShroudGeo = new THREE.ConeGeometry(0.38, 1.05, 14);
    const ghostHeadGeo = new THREE.SphereGeometry(0.24, 14, 14);
    const ghostWispGeo = new THREE.OctahedronGeometry(0.09, 0);
    const ghostMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.62,
    });
    const ghostEyeMat = new THREE.MeshBasicMaterial({ color: 0xe0f2fe });

    // Shared Materials & Geometries for Detailed Composite 3D Thrown Props & Splats
    const tomatoSkinMat = new THREE.MeshStandardMaterial({
      color: 0xdc2626,
      roughness: 0.18,
      metalness: 0.05,
    });
    const tomatoStemMat = new THREE.MeshStandardMaterial({
      color: 0x15803d,
      roughness: 0.65,
    });
    const tomatoSeedMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });

    const eggShellMat = new THREE.MeshStandardMaterial({
      color: 0xecfccb,
      roughness: 0.32,
      metalness: 0.05,
    });
    const eggYolkMat = new THREE.MeshStandardMaterial({
      color: 0xeab308,
      emissive: 0xa16207,
      emissiveIntensity: 0.35,
      roughness: 0.15,
    });
    const stinkGasMat = new THREE.MeshBasicMaterial({
      color: 0x84cc16,
      transparent: true,
      opacity: 0.65,
    });

    const rosePetalMat = new THREE.MeshStandardMaterial({
      color: 0xe11d48,
      roughness: 0.4,
    });
    const roseWrapMat = new THREE.MeshStandardMaterial({
      color: 0xfef3c7,
      roughness: 0.6,
    });

    const bucketMetalMat = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      roughness: 0.28,
      metalness: 0.78,
    });
    const waterLiquidMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.4,
      roughness: 0.12,
      transparent: true,
      opacity: 0.86,
    });

    const unitSphereGeo = new THREE.SphereGeometry(1, 14, 14);
    const unitConeGeo = new THREE.ConeGeometry(1, 1, 8);
    const unitCylGeo = new THREE.CylinderGeometry(1, 0.8, 1, 12);
    const unitTorusGeo = new THREE.TorusGeometry(1, 0.14, 8, 20);
    const splatChunkGeo = new THREE.DodecahedronGeometry(0.085, 0);

    const createCompositePropGroup = (
      propType: PropType
    ): { group: THREE.Group; trailParticles: THREE.Mesh[] } => {
      const g = new THREE.Group();
      const trailParticles: THREE.Mesh[] = [];

      if (propType === 'tomato') {
        const body = new THREE.Mesh(unitSphereGeo, tomatoSkinMat);
        body.scale.set(0.26, 0.21, 0.26);
        g.add(body);

        for (let k = 0; k < 5; k++) {
          const leaf = new THREE.Mesh(unitConeGeo, tomatoStemMat);
          leaf.scale.set(0.045, 0.12, 0.045);
          const a = (k / 5) * Math.PI * 2;
          leaf.position.set(Math.cos(a) * 0.07, 0.21, Math.sin(a) * 0.07);
          leaf.rotation.z = -Math.cos(a) * 0.8;
          leaf.rotation.x = Math.sin(a) * 0.8;
          g.add(leaf);
        }
        const stem = new THREE.Mesh(unitCylGeo, tomatoStemMat);
        stem.scale.set(0.025, 0.09, 0.025);
        stem.position.y = 0.23;
        g.add(stem);

        for (let t = 0; t < 3; t++) {
          const drop = new THREE.Mesh(splatChunkGeo, tomatoSkinMat);
          drop.scale.setScalar(0.55);
          g.add(drop);
          trailParticles.push(drop);
        }
      } else if (propType === 'egg') {
        const eggBody = new THREE.Mesh(unitSphereGeo, eggShellMat);
        eggBody.scale.set(0.19, 0.27, 0.19);
        g.add(eggBody);

        const stinkRing = new THREE.Mesh(unitTorusGeo, stinkGasMat);
        stinkRing.scale.set(0.28, 0.28, 0.28);
        stinkRing.rotation.x = Math.PI / 2;
        g.add(stinkRing);

        for (let t = 0; t < 4; t++) {
          const puff = new THREE.Mesh(splatChunkGeo, stinkGasMat);
          puff.scale.setScalar(0.75);
          g.add(puff);
          trailParticles.push(puff);
        }
      } else if (propType === 'rose') {
        const coneWrap = new THREE.Mesh(unitConeGeo, roseWrapMat);
        coneWrap.scale.set(0.18, 0.42, 0.18);
        coneWrap.rotation.x = Math.PI;
        coneWrap.position.y = -0.05;
        g.add(coneWrap);

        const ribbon = new THREE.Mesh(unitTorusGeo, buckleMat);
        ribbon.scale.set(0.11, 0.11, 0.11);
        ribbon.rotation.x = Math.PI / 2;
        ribbon.position.y = -0.08;
        g.add(ribbon);

        const budOffsets = [
          [0, 0.2, 0],
          [-0.09, 0.17, 0.06],
          [0.09, 0.17, -0.06],
        ];
        budOffsets.forEach(([bx, by, bz]) => {
          const bud = new THREE.Mesh(splatChunkGeo, rosePetalMat);
          bud.scale.setScalar(1.35);
          bud.position.set(bx, by, bz);
          g.add(bud);
        });

        for (let t = 0; t < 3; t++) {
          const petal = new THREE.Mesh(splatChunkGeo, rosePetalMat);
          petal.scale.set(0.7, 0.2, 0.7);
          g.add(petal);
          trailParticles.push(petal);
        }
      } else {
        const bucket = new THREE.Mesh(unitCylGeo, bucketMetalMat);
        bucket.scale.set(0.22, 0.34, 0.22);
        g.add(bucket);

        const waterTop = new THREE.Mesh(unitCylGeo, waterLiquidMat);
        waterTop.scale.set(0.2, 0.08, 0.2);
        waterTop.position.y = 0.15;
        g.add(waterTop);

        const handle = new THREE.Mesh(unitTorusGeo, buckleMat);
        handle.scale.set(0.22, 0.22, 0.22);
        handle.position.y = 0.16;
        g.add(handle);

        for (let t = 0; t < 4; t++) {
          const splash = new THREE.Mesh(splatChunkGeo, waterLiquidMat);
          splash.scale.setScalar(0.8);
          g.add(splash);
          trailParticles.push(splash);
        }
      }

      return { group: g, trailParticles };
    };

    const spawnPropImpactEffect = (targetSeatIndex: number, propType: PropType) => {
      const seat = seats[targetSeatIndex];
      if (!seat) return;

      const effectGroup = new THREE.Group();
      effectGroup.position.copy(seat.currentPos);
      scene.add(effectGroup);

      const particles: SplatParticle[] = [];
      const particleCount = 16;

      for (let k = 0; k < particleCount; k++) {
        let pMat: THREE.Material = tomatoSkinMat;
        if (propType === 'tomato') {
          pMat = k % 4 === 0 ? tomatoSeedMat : k % 5 === 0 ? tomatoStemMat : tomatoSkinMat;
        } else if (propType === 'egg') {
          pMat = k % 3 === 0 ? eggShellMat : k % 3 === 1 ? eggYolkMat : stinkGasMat;
        } else if (propType === 'rose') {
          pMat = k % 4 === 0 ? tomatoStemMat : rosePetalMat;
        } else {
          pMat = waterLiquidMat;
        }

        const m = new THREE.Mesh(splatChunkGeo, pMat);
        const angle = (k / particleCount) * Math.PI * 2 + Math.random() * 0.4;
        const speed = 1.4 + Math.random() * 2.4;
        m.position.set(0, 1.32, 0.15);

        if (propType === 'rose') {
          m.scale.set(0.95, 0.22, 0.95);
        } else {
          const s = 0.65 + Math.random() * 0.75;
          m.scale.setScalar(s);
        }

        effectGroup.add(m);
        particles.push({
          mesh: m,
          vx: Math.cos(angle) * speed,
          vy: propType === 'rose' ? 1.2 + Math.random() * 1.5 : 2.2 + Math.random() * 2.6,
          vz: Math.sin(angle) * speed,
          rotSpeed: (Math.random() - 0.5) * 14,
          isFloatingGas: propType === 'egg' && k % 3 === 2,
          isFlutterPetal: propType === 'rose',
        });
      }

      const puddleGroup = new THREE.Group();
      puddleGroup.position.set(0, 0.29, 0.18);

      const bodySplatGroup = new THREE.Group();
      bodySplatGroup.position.set(0, 1.25, 0.26);

      if (propType === 'tomato') {
        for (let b = 0; b < 6; b++) {
          const blob = new THREE.Mesh(unitSphereGeo, tomatoSkinMat);
          const r = 0.12 + (b % 3) * 0.06;
          blob.scale.set(r, 0.025, r);
          blob.position.set((Math.random() - 0.5) * 0.45, 0, (Math.random() - 0.5) * 0.45);
          puddleGroup.add(blob);

          const faceBlob = new THREE.Mesh(unitSphereGeo, tomatoSkinMat);
          faceBlob.scale.set(0.09, 0.09, 0.03);
          faceBlob.position.set((Math.random() - 0.5) * 0.28, (Math.random() - 0.5) * 0.35, 0);
          bodySplatGroup.add(faceBlob);
        }
      } else if (propType === 'egg') {
        const eggWhite = new THREE.Mesh(unitSphereGeo, eggShellMat);
        eggWhite.scale.set(0.36, 0.02, 0.32);
        const eggYolk = new THREE.Mesh(unitSphereGeo, eggYolkMat);
        eggYolk.scale.set(0.15, 0.06, 0.15);
        eggYolk.position.y = 0.02;
        puddleGroup.add(eggWhite, eggYolk);

        const headYolk = new THREE.Mesh(unitSphereGeo, eggYolkMat);
        headYolk.scale.set(0.18, 0.12, 0.08);
        const stinkHalo = new THREE.Mesh(unitTorusGeo, stinkGasMat);
        stinkHalo.scale.set(0.32, 0.32, 0.32);
        stinkHalo.rotation.x = Math.PI / 2;
        stinkHalo.position.y = 0.35;
        bodySplatGroup.add(headYolk, stinkHalo);
      } else if (propType === 'rose') {
        for (let b = 0; b < 8; b++) {
          const a = (b / 8) * Math.PI * 2;
          const petal = new THREE.Mesh(splatChunkGeo, rosePetalMat);
          petal.scale.set(0.9, 0.18, 0.9);
          petal.position.set(Math.cos(a) * 0.42, 0.02, Math.sin(a) * 0.42);
          puddleGroup.add(petal);
        }
      } else {
        const waterPool = new THREE.Mesh(unitSphereGeo, waterLiquidMat);
        waterPool.scale.set(0.52, 0.02, 0.52);
        const rippleRing = new THREE.Mesh(unitTorusGeo, waterLiquidMat);
        rippleRing.scale.set(0.48, 0.48, 0.48);
        rippleRing.rotation.x = Math.PI / 2;
        puddleGroup.add(waterPool, rippleRing);
      }

      effectGroup.add(puddleGroup, bodySplatGroup);

      activeSplats.push({
        group: effectGroup,
        particles,
        puddleMesh: puddleGroup,
        bodySplatMesh: bodySplatGroup,
        targetSeatIndex,
        age: 0,
        maxAge: 5.0,
        propType,
      });
    };

    const hitGeo = new THREE.CylinderGeometry(0.85, 0.85, 2.2, 12);
    const hitMat = new THREE.MeshBasicMaterial({ visible: false });

    for (let i = 0; i < MAX_SEATS; i++) {
      const group = new THREE.Group();

      const shadowDisc = new THREE.Mesh(shadowDiscGeo, shadowDiscMat);
      shadowDisc.rotation.x = -Math.PI / 2;
      shadowDisc.position.y = 0.015;
      group.add(shadowDisc);

      const pedestal = new THREE.Mesh(pedestalGeo, pedestalMat);
      pedestal.position.y = 0.14;
      pedestal.receiveShadow = true;
      const pedestalRim = new THREE.Mesh(pedestalRimGeo, buckleMat);
      pedestalRim.rotation.x = Math.PI / 2;
      pedestalRim.position.y = 0.27;
      group.add(pedestal, pedestalRim);

      const haloMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const halo = new THREE.Mesh(haloGeo, haloMat);
      halo.rotation.x = -Math.PI / 2;
      halo.position.y = 0.03;
      group.add(halo);

      const shieldRing = new THREE.Mesh(shieldGeo, shieldMat);
      shieldRing.rotation.x = Math.PI / 2;
      shieldRing.position.y = 0.78;
      shieldRing.visible = false;
      group.add(shieldRing);

      const loverHeart = new THREE.Mesh(heartGeo, heartMat);
      loverHeart.position.set(0.45, 1.85, 0);
      loverHeart.visible = false;
      group.add(loverHeart);

      const bodyGroup = new THREE.Group();
      bodyGroup.position.y = 0.28;

      const leftBoot = new THREE.Mesh(bootGeo, bootMat);
      leftBoot.position.set(-0.14, 0.07, 0.04);
      const rightBoot = new THREE.Mesh(bootGeo, bootMat);
      rightBoot.position.set(0.14, 0.07, 0.04);
      bodyGroup.add(leftBoot, rightBoot);

      const cloakMat = new THREE.MeshStandardMaterial({
        color: SEAT_COLORS[i % SEAT_COLORS.length],
        roughness: 0.62,
        metalness: 0.18,
      });
      const torso = new THREE.Mesh(torsoGeo, cloakMat);
      torso.position.y = 0.52;
      torso.castShadow = !isSoftwareGl;
      bodyGroup.add(torso);

      const belt = new THREE.Mesh(beltGeo, bootMat);
      belt.position.y = 0.42;
      const buckle = new THREE.Mesh(beltBuckleGeo, buckleMat);
      buckle.position.set(0, 0.42, 0.34);
      bodyGroup.add(belt, buckle);

      const cape = new THREE.Mesh(capeGeo, hatMat);
      cape.position.y = 0.84;
      bodyGroup.add(cape);

      const leftArm = new THREE.Group();
      leftArm.position.set(-0.36, 0.82, 0);
      const lArmMesh = new THREE.Mesh(armGeo, cloakMat);
      lArmMesh.position.y = -0.18;
      const lHandMesh = new THREE.Mesh(handGeo, headMat);
      lHandMesh.position.y = -0.4;
      leftArm.add(lArmMesh, lHandMesh);
      leftArm.rotation.z = 0.18;

      const rightArm = new THREE.Group();
      rightArm.position.set(0.36, 0.82, 0);
      const rArmMesh = new THREE.Mesh(armGeo, cloakMat);
      rArmMesh.position.y = -0.18;
      const rHandMesh = new THREE.Mesh(handGeo, headMat);
      rHandMesh.position.y = -0.4;
      rightArm.add(rArmMesh, rHandMesh);
      rightArm.rotation.z = -0.18;

      bodyGroup.add(leftArm, rightArm);

      const head = new THREE.Mesh(headGeo, headMat);
      head.position.y = 1.18;
      head.castShadow = !isSoftwareGl;
      const nose = new THREE.Mesh(noseGeo, headMat);
      nose.rotation.x = Math.PI / 2;
      nose.position.set(0, 1.16, 0.27);
      bodyGroup.add(head, nose);

      const hatBrim = new THREE.Mesh(hatBrimGeo, hatMat);
      hatBrim.position.y = 1.36;
      const hatBand = new THREE.Mesh(hatBandGeo, buckleMat);
      hatBand.position.y = 1.4;
      const hatCone = new THREE.Mesh(hatConeGeo, hatMat);
      hatCone.position.y = 1.62;
      bodyGroup.add(hatBrim, hatBand, hatCone);

      const wolfEarsGroup = new THREE.Group();
      const leftEar = new THREE.Mesh(earGeo, earMat);
      leftEar.position.set(-0.18, 1.5, 0.06);
      leftEar.rotation.z = 0.28;
      const rightEar = new THREE.Mesh(earGeo, earMat);
      rightEar.position.set(0.18, 1.5, 0.06);
      rightEar.rotation.z = -0.28;
      const wolfSnout = new THREE.Mesh(snoutGeo, earMat);
      wolfSnout.rotation.x = Math.PI / 2;
      wolfSnout.position.set(0, 1.14, 0.3);
      wolfEarsGroup.add(leftEar, rightEar, wolfSnout);
      wolfEarsGroup.visible = false;
      bodyGroup.add(wolfEarsGroup);

      const eyeLeftMat = new THREE.MeshBasicMaterial({ color: 0x1e293b });
      const eyeRightMat = new THREE.MeshBasicMaterial({ color: 0x1e293b });
      const eyeL = new THREE.Mesh(eyeGeo, eyeLeftMat);
      eyeL.position.set(-0.09, 1.2, 0.23);
      const eyeR = new THREE.Mesh(eyeGeo, eyeRightMat);
      eyeR.position.set(0.09, 1.2, 0.23);
      bodyGroup.add(eyeL, eyeR);

      // 3D Anger Reaction Aura (Red Cross-Vein & Fiery Rage Puffs when hit by Egg/Tomato/Water)
      const angerAuraGroup = new THREE.Group();
      angerAuraGroup.position.set(0, 1.88, 0);
      const angerBarGeo = new THREE.BoxGeometry(0.32, 0.075, 0.075);
      const angerMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
      const angerCross1 = new THREE.Mesh(angerBarGeo, angerMat);
      angerCross1.rotation.z = Math.PI / 4;
      angerCross1.position.set(0.28, 0.12, 0.16);
      const angerCross2 = new THREE.Mesh(angerBarGeo, angerMat);
      angerCross2.rotation.z = -Math.PI / 4;
      angerCross2.position.set(0.28, 0.12, 0.16);
      const rageRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.46, 0.035, 8, 20),
        angerMat
      );
      rageRing.rotation.x = Math.PI / 2;
      rageRing.position.y = -0.15;
      angerAuraGroup.add(angerCross1, angerCross2, rageRing);
      angerAuraGroup.visible = false;
      bodyGroup.add(angerAuraGroup);

      // 3D Happy Dance Aura (Floating Pink Hearts & Golden Stars when gifted a Rose)
      const happyAuraGroup = new THREE.Group();
      happyAuraGroup.position.set(0, 1.78, 0);
      for (let h = 0; h < 4; h++) {
        const ha = (h / 4) * Math.PI * 2;
        const hMesh = new THREE.Mesh(
          heartGeo,
          h % 2 === 0 ? heartMat : buckleMat
        );
        hMesh.position.set(Math.cos(ha) * 0.52, (h % 2) * 0.18, Math.sin(ha) * 0.52);
        hMesh.scale.setScalar(0.95);
        happyAuraGroup.add(hMesh);
      }
      happyAuraGroup.visible = false;
      bodyGroup.add(happyAuraGroup);

      group.add(bodyGroup);

      const post = new THREE.Mesh(postGeo, logMat);
      post.position.set(-0.54, 0.74, 0.25);
      const lanternMat = new THREE.MeshStandardMaterial({
        color: 0xfef08a,
        emissive: 0xf59e0b,
        emissiveIntensity: 1.5,
        roughness: 0.2,
      });
      const lantern = new THREE.Mesh(lanternGeo, lanternMat);
      lantern.position.set(-0.54, 1.48, 0.25);
      const lanternCap = new THREE.Mesh(lanternCapGeo, hatMat);
      lanternCap.position.set(-0.54, 1.62, 0.25);
      group.add(post, lantern, lanternCap);

      const tombstoneGroup = new THREE.Group();
      const tomb = new THREE.Mesh(tombGeo, tombMat);
      tomb.position.set(0, 0.65, 0.28);
      const crossV = new THREE.Mesh(tombCrossVGeo, buckleMat);
      crossV.position.set(0, 1.16, 0.28);
      const crossH = new THREE.Mesh(tombCrossHGeo, buckleMat);
      crossH.position.set(0, 1.2, 0.28);
      tombstoneGroup.add(tomb, crossV, crossH);
      tombstoneGroup.visible = false;
      group.add(tombstoneGroup);

      const ghostGroup = new THREE.Group();
      const ghostShroud = new THREE.Mesh(ghostShroudGeo, ghostMat);
      ghostShroud.position.y = 0.55;
      ghostShroud.rotation.x = Math.PI;
      const ghostHead = new THREE.Mesh(ghostHeadGeo, ghostMat);
      ghostHead.position.y = 1.15;
      const gEyeL = new THREE.Mesh(eyeGeo, ghostEyeMat);
      gEyeL.position.set(-0.08, 1.18, 0.2);
      const gEyeR = new THREE.Mesh(eyeGeo, ghostEyeMat);
      gEyeR.position.set(0.08, 1.18, 0.2);
      const wisp1 = new THREE.Mesh(ghostWispGeo, ghostEyeMat);
      wisp1.position.set(0.45, 0.9, 0);
      const wisp2 = new THREE.Mesh(ghostWispGeo, ghostEyeMat);
      wisp2.position.set(-0.45, 0.9, 0);
      ghostGroup.add(ghostShroud, ghostHead, gEyeL, gEyeR, wisp1, wisp2);
      ghostGroup.visible = false;
      scene.add(ghostGroup);

      const hitbox = new THREE.Mesh(hitGeo, hitMat);
      hitbox.position.y = 1.1;
      hitbox.userData.seatIndex = i;
      group.add(hitbox);
      clickables.push(hitbox);

      scene.add(group);

      seats.push({
        group,
        bodyGroup,
        leftArm,
        rightArm,
        ghostGroup,
        hitbox,
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
        koProgress: 0,
        wobbleTimer: 0,
        throwAnimTimer: 0,
        reactionType: 'none',
        reactionTimer: 0,
        baseAngle: 0,
        homePos: new THREE.Vector3(),
        currentPos: new THREE.Vector3(),
        ghostPos: new THREE.Vector3(0, 2.2, 0),
        worldPos: new THREE.Vector3(),
        playerId: '',
      });
    }

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // 11. Pointer, 360° Orbit Drag & Raycasting Handlers
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const groundHitPoint = new THREE.Vector3();
    let lastHoverTime = 0;
    let lastDragX = 0;
    let lastDragY = 0;
    let isPointerDown = false;
    let dragDistance = 0;

    const getIntersectedPlayerId = (clientX: number, clientY: number): string | null => {
      const rect = renderer.domElement.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return null;
      pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(clickables, false);
      if (hits.length > 0) {
        const seatIdx = hits[0].object.userData.seatIndex;
        const seat = seats[seatIdx];
        if (seat && seat.group.visible && seat.playerId) {
          return seat.playerId;
        }
      }
      return null;
    };

    const onPointerDown = (e: PointerEvent) => {
      isPointerDown = true;
      lastDragX = e.clientX;
      lastDragY = e.clientY;
      dragDistance = 0;
    };

    const onPointerMove = (e: PointerEvent) => {
      const st = stateRef.current;

      if (isPointerDown) {
        const dx = e.clientX - lastDragX;
        const dy = e.clientY - lastDragY;
        dragDistance += Math.hypot(dx, dy);
        lastDragX = e.clientX;
        lastDragY = e.clientY;

        if (dragDistance > 5) {
          st.isDraggingOrbit = true;
          st.azimuthAngle -= dx * 0.0075;
          st.polarAngle = Math.max(0.22, Math.min(1.28, st.polarAngle + dy * 0.0055));
        }
      } else if (st.freeLook360 && !st.isTitleScreen) {
        const rect = renderer.domElement.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
          const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
          st.azimuthAngle = -nx * Math.PI;
          st.polarAngle = 0.35 + (ny + 1) * 0.35;
        }
      }

      const now = performance.now();
      if (now - lastHoverTime < 45) return;
      lastHoverTime = now;
      const pid = getIntersectedPlayerId(e.clientX, e.clientY);
      st.hoveredPlayerId = pid;
      renderer.domElement.style.cursor = pid
        ? 'pointer'
        : isPointerDown
        ? 'grabbing'
        : 'grab';
    };

    const onPointerUp = (e: PointerEvent) => {
      const wasClick = dragDistance < 10;
      isPointerDown = false;
      stateRef.current.isDraggingOrbit = false;

      if (!wasClick || stateRef.current.isTitleScreen) return;

      const pid = getIntersectedPlayerId(e.clientX, e.clientY);
      if (pid) {
        stateRef.current.onSelectPlayer(pid);
      } else {
        const st = stateRef.current;
        const me = st.players.find((p) => p.id === st.userPlayerId);
        const canRoam =
          (me && !me.isAlive) || (st.phase === 'night' && st.isPlayerAwakeAtNight && me?.isAlive);
        if (canRoam) {
          const rect = renderer.domElement.getBoundingClientRect();
          pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
          pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
          raycaster.setFromCamera(pointer, camera);
          if (raycaster.ray.intersectPlane(groundPlane, groundHitPoint)) {
            const clampedR = Math.min(9.5, Math.hypot(groundHitPoint.x, groundHitPoint.z));
            const ang = Math.atan2(groundHitPoint.z, groundHitPoint.x);
            st.dashTargetPos = new THREE.Vector3(
              Math.cos(ang) * clampedR,
              0,
              Math.sin(ang) * clampedR
            );
            st.isUserRoaming = true;
          }
        }
      }
    };

    const onWheel = (e: WheelEvent) => {
      const st = stateRef.current;
      st.cameraDist = Math.max(8.5, Math.min(25, st.cameraDist + e.deltaY * 0.01));
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (
        ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(
          e.code
        )
      ) {
        stateRef.current.keysPressed.add(e.code);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      stateRef.current.keysPressed.delete(e.code);
    };

    const domElem = renderer.domElement;
    domElem.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    domElem.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: w, height: h } = entry.contentRect;
        if (w > 0 && h > 0) {
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
        }
      }
    });
    resizeObserver.observe(container);

    // 12. Software-WebGL Paced Loop & 60fps Simulation
    let lastFrameTime = performance.now();
    let frameId = 0;
    let elapsedTotal = 0;
    let lastLabelSync = 0;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      const nowPerf = performance.now();
      const rawDt = (nowPerf - lastFrameTime) / 1000;
      lastFrameTime = nowPerf;
      const dt = Math.min(Math.max(rawDt, 0.001), 0.05);
      const st = stateRef.current;

      if (st.hitstop > 0) {
        st.hitstop = Math.max(0, st.hitstop - dt);
      }
      const simDt = st.hitstop > 0 ? dt * 0.15 : dt;
      elapsedTotal += simDt;

      st.trauma = Math.max(0, st.trauma - dt * 1.8);
      const shake = st.trauma * st.trauma;

      const activePlayers = st.players;
      const count = activePlayers.length;
      const me = activePlayers.find((p) => p.id === st.userPlayerId);
      const isNightBlindfolded =
        !st.isTitleScreen &&
        st.phase === 'night' &&
        Boolean(me?.isAlive) &&
        !st.isPlayerAwakeAtNight;

      // Day vs Night vs Blindfold Atmosphere Interpolation
      const isDay = st.phase === 'day_discussion' || st.phase === 'day_voting';
      const targetBg = isDay ? bgDay : isNightBlindfolded ? bgBlindNight : bgNight;
      (scene.background as THREE.Color).lerp(targetBg, 1 - Math.exp(-3.5 * dt));
      if (scene.fog instanceof THREE.FogExp2) {
        scene.fog.color.copy(scene.background as THREE.Color);
        scene.fog.density = THREE.MathUtils.damp(
          scene.fog.density,
          isNightBlindfolded ? 0.075 : 0.017,
          4,
          dt
        );
      }

      hemiLight.intensity = THREE.MathUtils.damp(
        hemiLight.intensity,
        isDay ? 1.85 : isNightBlindfolded ? 0.15 : 0.96,
        3,
        dt
      );
      dirLight.intensity = THREE.MathUtils.damp(
        dirLight.intensity,
        isDay ? 2.45 : isNightBlindfolded ? 0.12 : 1.25,
        3,
        dt
      );
      dirLight.color.setHex(isDay ? 0xfef08a : 0x93c5fd);
      moonMat.color.setHex(isDay ? 0xfde047 : 0xfda4af);
      moonHaloMat.color.setHex(isDay ? 0xf59e0b : 0xf43f5e);
      starMat.opacity = isDay ? 0.1 : 0.72 + Math.sin(elapsedTotal * 3) * 0.18;

      // Rotate Windmill Sails & Flicker Campfire
      windmillBlades.rotation.z += simDt * 0.55;
      const flicker = Math.sin(elapsedTotal * 11) * 0.12 + Math.cos(elapsedTotal * 17) * 0.08;
      flameOuter.scale.set(1 + flicker * 0.4, 1 + flicker, 1 + flicker * 0.4);
      flameInner.scale.set(1 - flicker * 0.3, 1 + flicker * 1.2, 1 - flicker * 0.3);
      brazierFlame.scale.set(1 + flicker * 0.35, 1 + flicker * 0.9, 1 + flicker * 0.35);
      fireLight.intensity =
        (isDay ? 2.2 : isNightBlindfolded ? 0.9 : 5.2) + flicker * 3.5;
      runeOrb.rotation.y += simDt * 1.4;
      runeOrb.position.y = 5.85 + Math.sin(elapsedTotal * 2.5) * 0.15;

      // Update Pooled Ember Particles
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const p = particleData[i];
        p.y += p.vy * simDt;
        if (p.y > 4.8) {
          p.y = 0.3;
          p.x = (Math.random() - 0.5) * 1.2;
          p.z = (Math.random() - 0.5) * 1.2;
        }
        const sway = Math.sin(elapsedTotal * 2.5 + p.phase) * 0.18;
        const s = Math.max(0.1, 1 - p.y / 4.8);
        _dummyObj.position.set(p.x + sway, p.y, p.z + sway);
        _dummyObj.scale.set(s, s, s);
        _dummyObj.updateMatrix();
        particleInst.setMatrixAt(i, _dummyObj.matrix);
      }
      particleInst.instanceMatrix.needsUpdate = true;

      // Spawn New Detailed Composite 3D Thrown Prop Projectiles
      for (const propEv of st.thrownProps) {
        if (!processedPropsRef.current.has(propEv.id)) {
          processedPropsRef.current.add(propEv.id);
          const fromIdx = activePlayers.findIndex((p) => p.id === propEv.fromId);
          const toIdx = activePlayers.findIndex((p) => p.id === propEv.toId);
          if (fromIdx !== -1 && toIdx !== -1 && seats[fromIdx] && seats[toIdx]) {
            seats[fromIdx].throwAnimTimer = 0.45;
            const { group: propGroup, trailParticles } = createCompositePropGroup(propEv.propType);
            const sPos = seats[fromIdx].currentPos.clone().add(new THREE.Vector3(0, 1.45, 0));
            const ePos = seats[toIdx].currentPos.clone().add(new THREE.Vector3(0, 1.32, 0));
            propGroup.position.copy(sPos);
            scene.add(propGroup);
            activeProjectiles.push({
              id: propEv.id,
              group: propGroup,
              trailParticles,
              startPos: sPos,
              endPos: ePos,
              targetSeatIndex: toIdx,
              propType: propEv.propType,
              progress: 0,
            });
          }
        }
      }

      // Animate Active 3D Flying Composite Projectiles
      for (let i = activeProjectiles.length - 1; i >= 0; i--) {
        const proj = activeProjectiles[i];
        proj.progress += simDt * 2.4;
        if (proj.progress >= 1) {
          scene.remove(proj.group);
          const hitSeat = seats[proj.targetSeatIndex];
          if (hitSeat) {
            hitSeat.wobbleTimer = 0.95;
            hitSeat.reactionType = proj.propType === 'rose' ? 'happy_dance' : 'angry';
            hitSeat.reactionTimer = 4.6;
          }
          spawnPropImpactEffect(proj.targetSeatIndex, proj.propType);
          st.trauma = Math.min(1, st.trauma + (proj.propType === 'rose' ? 0.15 : 0.35));
          st.hitstop = 0.04;
          sound.playPropSplat(proj.propType);
          activeProjectiles.splice(i, 1);
        } else {
          _arcPos.lerpVectors(proj.startPos, proj.endPos, proj.progress);
          _arcPos.y += Math.sin(proj.progress * Math.PI) * 3.4;
          proj.group.position.copy(_arcPos);
          proj.group.rotation.x += simDt * 11;
          proj.group.rotation.z += simDt * 8;

          proj.trailParticles.forEach((tp, idx) => {
            const lag = (idx + 1) * 0.14;
            tp.position.set(
              Math.sin(elapsedTotal * 14 + idx) * 0.18,
              -lag,
              -lag * 1.2
            );
          });
        }
      }

      // Animate Active 3D Splat Explosions & Persistent Decals
      for (let i = activeSplats.length - 1; i >= 0; i--) {
        const splat = activeSplats[i];
        splat.age += simDt;
        const targetSeat = seats[splat.targetSeatIndex];
        if (targetSeat) {
          splat.group.position.copy(targetSeat.currentPos);
        }

        if (splat.age >= splat.maxAge) {
          scene.remove(splat.group);
          activeSplats.splice(i, 1);
          continue;
        }

        for (const pt of splat.particles) {
          if (pt.isFloatingGas) {
            pt.mesh.position.y += 0.9 * simDt;
            pt.mesh.position.x += Math.sin(elapsedTotal * 5 + pt.vx) * 0.3 * simDt;
          } else if (pt.isFlutterPetal) {
            pt.vy = Math.max(-0.85, pt.vy - 3.5 * simDt);
            pt.mesh.position.x += (pt.vx * 0.35 + Math.sin(elapsedTotal * 6 + pt.vz) * 0.35) * simDt;
            pt.mesh.position.y = Math.max(0.3, pt.mesh.position.y + pt.vy * simDt);
            pt.mesh.position.z += pt.vz * 0.35 * simDt;
          } else {
            pt.vy -= 9.8 * simDt;
            pt.mesh.position.x += pt.vx * simDt;
            pt.mesh.position.y += pt.vy * simDt;
            pt.mesh.position.z += pt.vz * simDt;
            if (pt.mesh.position.y < 0.3) {
              pt.mesh.position.y = 0.3;
              pt.vx *= 0.4;
              pt.vz *= 0.4;
              pt.vy = 0;
            }
          }
          pt.mesh.rotation.x += pt.rotSpeed * simDt;
          pt.mesh.rotation.z += pt.rotSpeed * simDt;
        }

        const fadeRatio =
          splat.age > splat.maxAge - 1.2
            ? Math.max(0.01, (splat.maxAge - splat.age) / 1.2)
            : 1;
        splat.puddleMesh.scale.setScalar(fadeRatio);
        splat.bodySplatMesh.scale.setScalar(fadeRatio);
      }

      // Compute WASD / Mobile Virtual D-Pad Input for Open-World Night Movement or Ghost Flight
      let inputX = st.moveVector.x;
      let inputZ = st.moveVector.z;
      if (st.keysPressed.has('KeyW') || st.keysPressed.has('ArrowUp')) inputZ -= 1;
      if (st.keysPressed.has('KeyS') || st.keysPressed.has('ArrowDown')) inputZ += 1;
      if (st.keysPressed.has('KeyA') || st.keysPressed.has('ArrowLeft')) inputX -= 1;
      if (st.keysPressed.has('KeyD') || st.keysPressed.has('ArrowRight')) inputX += 1;

      const hasMoveInput = Math.hypot(inputX, inputZ) > 0.05;
      const canUserRoamAlive =
        !st.isTitleScreen && st.phase === 'night' && st.isPlayerAwakeAtNight && Boolean(me?.isAlive);
      const isUserGhost = !st.isTitleScreen && Boolean(me && !me.isAlive);

      // Update Player Seats & Spectral Ghosts
      const radius = 5.65;

      for (let i = 0; i < MAX_SEATS; i++) {
        const seat = seats[i];
        if (i >= count) {
          seat.group.visible = false;
          seat.ghostGroup.visible = false;
          seat.playerId = '';
          continue;
        }

        const p = activePlayers[i];
        seat.group.visible = true;
        seat.playerId = p.id;
        const isMe = p.id === st.userPlayerId;

        const angle = Math.PI / 2 + (i / count) * Math.PI * 2;
        seat.baseAngle = angle;
        const hx = Math.cos(angle) * radius;
        const hz = Math.sin(angle) * radius;
        seat.homePos.set(hx, 0, hz);

        if (seat.currentPos.lengthSq() < 0.01) {
          seat.currentPos.copy(seat.homePos);
          seat.ghostPos.set(hx, 2.2, hz);
        }

        if (isMe && canUserRoamAlive) {
          if (hasMoveInput) {
            st.isUserRoaming = true;
            st.dashTargetPos = null;
            const cosA = Math.cos(st.azimuthAngle);
            const sinA = Math.sin(st.azimuthAngle);
            const moveWorldX = inputX * cosA + inputZ * sinA;
            const moveWorldZ = -inputX * sinA + inputZ * cosA;
            const speed = 5.8 * simDt;
            seat.currentPos.x = Math.max(-9.5, Math.min(9.5, seat.currentPos.x + moveWorldX * speed));
            seat.currentPos.z = Math.max(-9.5, Math.min(9.5, seat.currentPos.z + moveWorldZ * speed));
            seat.bodyGroup.rotation.y = Math.atan2(moveWorldX, moveWorldZ) - seat.group.rotation.y;

            if (nowPerf - st.lastProximitySelectTime > 900) {
              for (let j = 0; j < count; j++) {
                const otherSeat = seats[j];
                const otherP = activePlayers[j];
                if (!otherP || !otherP.isAlive || j === i) continue;
                const d = seat.currentPos.distanceTo(otherSeat.homePos);
                if (d < 1.55 && st.selectedTargetId !== otherP.id) {
                  st.lastProximitySelectTime = nowPerf;
                  st.onSelectPlayer(otherP.id);
                  break;
                }
              }
            }
          } else if (st.dashTargetPos) {
            seat.currentPos.lerp(st.dashTargetPos, 1 - Math.exp(-8 * simDt));
          } else if (!st.isUserRoaming) {
            seat.currentPos.lerp(seat.homePos, 1 - Math.exp(-5 * simDt));
            seat.bodyGroup.rotation.y = THREE.MathUtils.damp(seat.bodyGroup.rotation.y, 0, 5, dt);
          }
        } else {
          seat.currentPos.lerp(seat.homePos, 1 - Math.exp(-6 * simDt));
          if (seat.reactionTimer <= 0) {
            seat.bodyGroup.rotation.y = THREE.MathUtils.damp(seat.bodyGroup.rotation.y, 0, 5, dt);
          }
        }

        seat.group.position.copy(seat.currentPos);
        seat.worldPos.set(seat.currentPos.x, 1.72, seat.currentPos.z);
        seat.group.rotation.y = -angle - Math.PI / 2;

        const targetKo = p.isAlive ? 0 : 1;
        seat.koProgress = THREE.MathUtils.damp(seat.koProgress, targetKo, 6, dt);
        seat.bodyGroup.rotation.x = -seat.koProgress * 1.25;
        seat.bodyGroup.position.y = 0.28 - seat.koProgress * 0.15;
        seat.tombstoneGroup.visible = !p.isAlive;
        seat.lanternMat.emissiveIntensity = p.isAlive ? (isNightBlindfolded ? 0.15 : 1.5) : 0.05;

        if (seat.reactionTimer > 0 && p.isAlive) {
          seat.reactionTimer = Math.max(0, seat.reactionTimer - simDt);
        } else if (!p.isAlive) {
          seat.reactionTimer = 0;
        }

        const isAngryReacting = seat.reactionTimer > 0 && seat.reactionType === 'angry' && p.isAlive;
        const isHappyDancing =
          seat.reactionTimer > 0 && seat.reactionType === 'happy_dance' && p.isAlive;

        seat.angerAuraGroup.visible = isAngryReacting;
        seat.happyAuraGroup.visible = isHappyDancing;

        if (isAngryReacting) {
          // Angry stomp & furious head/torso shake + waving arms in rage
          const stomp = Math.abs(Math.sin(elapsedTotal * 22)) * 0.24;
          seat.bodyGroup.position.y = 0.28 + stomp;
          seat.bodyGroup.rotation.z = Math.sin(elapsedTotal * 32) * 0.28;
          seat.bodyGroup.rotation.y = Math.sin(elapsedTotal * 20) * 0.45;
          seat.angerAuraGroup.rotation.y += simDt * 4.5;
          const pulseScale = 1 + Math.sin(elapsedTotal * 18) * 0.22;
          seat.angerAuraGroup.scale.setScalar(pulseScale);
        } else if (isHappyDancing) {
          // Joyful jumping & twirling happy dance
          const danceJump = Math.abs(Math.sin(elapsedTotal * 11)) * 0.36;
          seat.bodyGroup.position.y = 0.28 + danceJump;
          seat.bodyGroup.rotation.z = Math.sin(elapsedTotal * 11) * 0.22;
          seat.bodyGroup.rotation.y = Math.sin(elapsedTotal * 7.5) * 1.35;
          seat.happyAuraGroup.rotation.y += simDt * 3.6;
          seat.happyAuraGroup.position.y = 1.78 + Math.sin(elapsedTotal * 10) * 0.12;
        } else if (seat.wobbleTimer > 0) {
          seat.wobbleTimer = Math.max(0, seat.wobbleTimer - simDt);
          seat.bodyGroup.rotation.z = Math.sin(elapsedTotal * 38) * seat.wobbleTimer * 0.48;
          seat.bodyGroup.rotation.x = -seat.wobbleTimer * 0.35;
        } else {
          seat.bodyGroup.rotation.z = 0;
        }

        const isSpeaking = st.activeSpeakers.includes(p.name) && p.isAlive;
        const isWalking = isMe && canUserRoamAlive && hasMoveInput;
        if (seat.throwAnimTimer > 0) {
          seat.throwAnimTimer = Math.max(0, seat.throwAnimTimer - simDt);
          seat.rightArm.rotation.x = -Math.sin(seat.throwAnimTimer * Math.PI * 2.2) * 1.8;
        } else if (isAngryReacting) {
          seat.leftArm.rotation.x = -2.35 + Math.sin(elapsedTotal * 26) * 0.75;
          seat.rightArm.rotation.x = -2.35 - Math.sin(elapsedTotal * 26) * 0.75;
          seat.leftArm.rotation.z = 0.45;
          seat.rightArm.rotation.z = -0.45;
        } else if (isHappyDancing) {
          seat.leftArm.rotation.x = -2.65 + Math.sin(elapsedTotal * 14) * 0.45;
          seat.rightArm.rotation.x = -2.65 - Math.sin(elapsedTotal * 14) * 0.45;
          seat.leftArm.rotation.z = 0.55 + Math.sin(elapsedTotal * 14) * 0.25;
          seat.rightArm.rotation.z = -0.55 - Math.sin(elapsedTotal * 14) * 0.25;
        } else if (isWalking) {
          seat.leftArm.rotation.x = Math.sin(elapsedTotal * 14) * 0.65;
          seat.rightArm.rotation.x = -Math.sin(elapsedTotal * 14) * 0.65;
          seat.leftArm.rotation.z = 0.18;
          seat.rightArm.rotation.z = -0.18;
        } else if (isSpeaking) {
          seat.leftArm.rotation.x = Math.sin(elapsedTotal * 9 + i) * 0.35;
          seat.rightArm.rotation.x = Math.cos(elapsedTotal * 9 + i) * 0.35;
          seat.leftArm.rotation.z = 0.18;
          seat.rightArm.rotation.z = -0.18;
        } else {
          seat.leftArm.rotation.x = THREE.MathUtils.damp(seat.leftArm.rotation.x, 0, 6, dt);
          seat.rightArm.rotation.x = THREE.MathUtils.damp(seat.rightArm.rotation.x, 0, 6, dt);
          seat.leftArm.rotation.z = THREE.MathUtils.damp(seat.leftArm.rotation.z, 0.18, 6, dt);
          seat.rightArm.rotation.z = THREE.MathUtils.damp(seat.rightArm.rotation.z, -0.18, 6, dt);
        }

        if (!p.isAlive && !st.isTitleScreen) {
          seat.ghostGroup.visible = true;
          if (isMe && isUserGhost && (hasMoveInput || st.dashTargetPos)) {
            if (hasMoveInput) {
              st.dashTargetPos = null;
              const cosA = Math.cos(st.azimuthAngle);
              const sinA = Math.sin(st.azimuthAngle);
              const moveWorldX = inputX * cosA + inputZ * sinA;
              const moveWorldZ = -inputX * sinA + inputZ * cosA;
              const ghostSpeed = 7.2 * simDt;
              seat.ghostPos.x = Math.max(-11, Math.min(11, seat.ghostPos.x + moveWorldX * ghostSpeed));
              seat.ghostPos.z = Math.max(-11, Math.min(11, seat.ghostPos.z + moveWorldZ * ghostSpeed));
              seat.ghostGroup.rotation.y = Math.atan2(moveWorldX, moveWorldZ);
            } else if (st.dashTargetPos) {
              seat.ghostPos.x = THREE.MathUtils.damp(seat.ghostPos.x, st.dashTargetPos.x, 5, simDt);
              seat.ghostPos.z = THREE.MathUtils.damp(seat.ghostPos.z, st.dashTargetPos.z, 5, simDt);
            }
            seat.ghostPos.y = 2.1 + Math.sin(elapsedTotal * 3.5 + i) * 0.35;
          } else {
            const ghostOrbitAngle = angle + elapsedTotal * 0.55;
            const ghostRadius = 3.8 + Math.sin(elapsedTotal * 1.4 + i) * 1.4;
            seat.ghostPos.set(
              Math.cos(ghostOrbitAngle) * ghostRadius,
              2.2 + Math.sin(elapsedTotal * 3.2 + i) * 0.4,
              Math.sin(ghostOrbitAngle) * ghostRadius
            );
            seat.ghostGroup.rotation.y = -ghostOrbitAngle;
          }
          seat.ghostGroup.position.copy(seat.ghostPos);
          if (isMe) {
            seat.worldPos.set(seat.ghostPos.x, seat.ghostPos.y + 1.45, seat.ghostPos.z);
          }
        } else {
          seat.ghostGroup.visible = false;
        }

        const bounce = p.isAlive
          ? Math.sin(
              elapsedTotal *
                (isAngryReacting
                  ? 22
                  : isHappyDancing
                  ? 14
                  : isWalking
                  ? 16
                  : isSpeaking
                  ? 12
                  : 2.8) + i
            ) *
            (isAngryReacting
              ? 0.14
              : isHappyDancing
              ? 0.16
              : isWalking
              ? 0.11
              : isSpeaking
              ? 0.09
              : 0.025)
          : 0;
        seat.bodyGroup.scale.set(1 - bounce * 0.4, 1 + bounce, 1 - bounce * 0.4);

        const isWolfRole = p.roleId === 'werewolf' || p.roleId === 'wolf_pup';
        const canSeeWolf =
          st.revealAllRoles ||
          st.phase === 'game_over' ||
          p.id === st.userPlayerId ||
          (me && (me.roleId === 'werewolf' || me.roleId === 'wolf_pup') && isWolfRole);

        seat.wolfEarsGroup.visible = Boolean(canSeeWolf && isWolfRole);
        const eyeColorHex = isAngryReacting
          ? 0xff2222
          : isHappyDancing
          ? 0xfbbf24
          : canSeeWolf && isWolfRole
          ? 0xef4444
          : 0x111827;
        seat.eyeLeftMat.color.setHex(eyeColorHex);
        seat.eyeRightMat.color.setHex(eyeColorHex);

        seat.shieldRing.visible = Boolean(p.protectedLastNight && p.isAlive);
        seat.shieldRing.rotation.z += simDt * 1.5;

        const isLover =
          Boolean(p.loverId) ||
          Boolean(st.cupidLovers && (st.cupidLovers[0] === p.id || st.cupidLovers[1] === p.id));
        seat.loverHeart.visible =
          isLover && (isMe || st.phase === 'game_over' || me?.roleId === 'cupid');
        seat.loverHeart.rotation.y += simDt * 2.2;

        const isSelected = st.selectedTargetId === p.id || st.secondaryTargetId === p.id;
        const isHovered = st.hoveredPlayerId === p.id;

        if (isSelected) {
          seat.haloMat.color.setHex(0xf43f5e);
          seat.haloMat.opacity = 0.92;
        } else if (isHovered) {
          seat.haloMat.color.setHex(0xfbbf24);
          seat.haloMat.opacity = 0.85;
        } else if (isMe) {
          seat.haloMat.color.setHex(0x38bdf8);
          seat.haloMat.opacity = 0.65;
        } else if (!p.isAlive) {
          seat.haloMat.color.setHex(0x475569);
          seat.haloMat.opacity = 0.2;
        } else {
          seat.haloMat.color.setHex(0x94a3b8);
          seat.haloMat.opacity = 0.28;
        }
      }

      // 360° Spherical Camera Choreography (Auto-adapts distance on narrow/portrait screens)
      const isNarrowViewport = container && container.clientWidth < 640;
      const portraitDistMultiplier = isNarrowViewport
        ? Math.min(1.38, Math.max(1.15, (640 / Math.max(320, container.clientWidth)) * 0.78))
        : 1;

      if (st.isTitleScreen) {
        const tourAngle = elapsedTotal * 0.22;
        const titleRadius = 13.5 * portraitDistMultiplier;
        _targetCamPos.set(
          Math.sin(tourAngle) * titleRadius,
          (6.8 + Math.sin(elapsedTotal * 0.5) * 1.2) * portraitDistMultiplier,
          Math.cos(tourAngle) * titleRadius
        );
        _targetLookAt.set(0, 1.2, 0);
      } else {
        let dist = st.cameraDist * portraitDistMultiplier;
        let polar = st.polarAngle;
        if (st.cameraPreset === 'overhead' && !st.isDraggingOrbit && !st.freeLook360) {
          polar = 1.15;
          dist = 18.5 * portraitDistMultiplier;
        } else if (st.cameraPreset === 'dramatic' && !st.isDraggingOrbit && !st.freeLook360) {
          polar = 0.34;
          dist = 13.2 * portraitDistMultiplier;
        }

        const horizDist = Math.cos(polar) * dist;
        const camY = Math.max(2.2, Math.sin(polar) * dist);
        _targetCamPos.set(
          Math.sin(st.azimuthAngle) * horizDist,
          camY,
          Math.cos(st.azimuthAngle) * horizDist
        );
        _targetLookAt.set(0, 0.4, 0.6);
      }

      const focusId = st.hoveredPlayerId || st.selectedTargetId;
      if (focusId && !st.isTitleScreen && !st.isDraggingOrbit) {
        const focusSeat = seats.find((s) => s.playerId === focusId);
        if (focusSeat && focusSeat.group.visible) {
          _targetLookAt.lerp(focusSeat.worldPos, 0.18);
        }
      }

      const dampFactor = 1 - Math.exp(-4.8 * dt);
      camera.position.lerp(_targetCamPos, dampFactor);
      _currentLookAt.lerp(_targetLookAt, dampFactor);

      if (shake > 0.0001) {
        camera.position.x += (Math.random() - 0.5) * shake * 0.45;
        camera.position.y += (Math.random() - 0.5) * shake * 0.35;
      }
      camera.lookAt(_currentLookAt);

      renderer.render(scene, camera);

      // Project 3D seat positions to 2D floating HTML nameplates at ~15Hz
      const nowMs = performance.now();
      if (nowMs - lastLabelSync > 65 && labelContainerRef.current && container) {
        lastLabelSync = nowMs;
        const cW = container.clientWidth;
        const cH = container.clientHeight;

        for (let i = 0; i < MAX_SEATS; i++) {
          const el = labelElsRef.current[i];
          const seat = seats[i];
          if (!el) continue;

          if (!seat.group.visible || st.isTitleScreen || isNightBlindfolded) {
            el.style.display = 'none';
            continue;
          }

          _projVec.copy(seat.worldPos).project(camera);
          if (_projVec.z >= -1 && _projVec.z <= 1) {
            const sx = (_projVec.x + 1) * 0.5 * cW;
            const sy = (-_projVec.y + 1) * 0.5 * cH;
            el.style.display = 'flex';
            el.style.transform = `translate3d(${Math.round(sx)}px, ${Math.round(sy)}px, 0) translate(-50%, -100%)`;
          } else {
            el.style.display = 'none';
          }
        }
      }

      if (isSoftwareGl) afterDraw(tick);
      else frameId = requestAnimationFrame(tick);
    }

    frameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObserver.disconnect();
      domElem.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      domElem.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      renderer.dispose();
    };
  }, []);

  const me = players.find((p) => p.id === userPlayerId);
  const nowRender = Date.now();
  const t = UI_TEXT[lang];

  return (
    <div className="fixed inset-0 z-0 overflow-hidden select-none bg-[#070a14]">
      {/* Isolated WebGL Canvas Container */}
      <div
        ref={mountRef}
        data-testid="village-3d-canvas"
        className="w-full h-full touch-none"
      />

      {/* World-Projected 3D Character Floating Nameplates (Mobile-Streamlined & Multi-Language) */}
      <div
        ref={labelContainerRef}
        className="fixed inset-0 pointer-events-none overflow-hidden z-10"
      >
        {Array.from({ length: MAX_SEATS }).map((_, idx) => {
          const p = players[idx];
          if (!p) {
            return (
              <div
                key={idx}
                ref={(el) => {
                  labelElsRef.current[idx] = el;
                }}
                style={{ display: 'none' }}
              />
            );
          }

          const isMe = p.id === userPlayerId;
          const isSelected = selectedTargetId === p.id || secondaryTargetId === p.id;
          const voteCount = votesMap[p.id] || 0;
          const isSpeaking = activeSpeakers.includes(p.name) && p.isAlive;
          const isWolf = p.roleId === 'werewolf' || p.roleId === 'wolf_pup';
          const showRole =
            revealAllRoles ||
            phase === 'game_over' ||
            isMe ||
            (me && (me.roleId === 'werewolf' || me.roleId === 'wolf_pup') && isWolf);

          const recentProp = [...thrownProps]
            .reverse()
            .find((ev) => ev.toId === p.id && nowRender - ev.timestamp < 5200);
          const propStyle = recentProp ? PROP_STYLE_MAP[recentProp.propType] : null;
          const propReaction = recentProp ? PROP_REACTION_META[recentProp.propType] : null;

          return (
            <div
              key={p.id}
              ref={(el) => {
                labelElsRef.current[idx] = el;
              }}
              style={{ display: 'none', left: 0, top: 0 }}
              className="absolute flex flex-col items-center gap-0.5 transition-opacity duration-150"
            >
              {/* Thrown Prop Impact + Character Emotional Reaction Badge */}
              {propStyle && propReaction && (
                <div
                  data-testid="character-prop-reaction"
                  data-emotion={propReaction.emotion}
                  className={`px-2 py-0.5 rounded-full border shadow-xl flex items-center justify-center text-center animate-bounce ${
                    propReaction.emotion === 'happy_dance'
                      ? 'bg-pink-950/92 border-pink-400 text-pink-100'
                      : 'bg-rose-950/92 border-red-400 text-rose-100'
                  }`}
                >
                  <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-amber-300 whitespace-nowrap">
                    {propStyle.icon} {propReaction.badgeText[lang]}
                  </span>
                </div>
              )}

              {/* Vote Count Pill */}
              {voteCount > 0 && (
                <div className="px-1.5 py-0.5 rounded bg-rose-700 text-white font-mono text-[9px] sm:text-[10px] font-extrabold shadow-lg border border-rose-400 leading-none">
                  {voteCount} {t.votesUnit}
                </div>
              )}

              {/* Ghost Soul Indicator if dead */}
              {!p.isAlive && (
                <div className="px-1.5 py-0.5 rounded-full bg-cyan-950/90 border border-cyan-400/60 text-cyan-200 font-bold text-[8px] sm:text-[9px] shadow leading-none">
                  {t.ghostFloatingBadge}
                </div>
              )}

              {/* Nameplate Badge */}
              <div
                className={`px-1.5 py-0.5 sm:px-2 sm:py-0.5 rounded-lg border text-center shadow-lg ${
                  !p.isAlive
                    ? 'bg-slate-950/85 border-cyan-800/50 text-cyan-300/80'
                    : isSelected
                    ? 'bg-rose-950/95 border-rose-400 text-rose-100 scale-105'
                    : isMe
                    ? 'bg-sky-950/92 border-sky-400 text-sky-100'
                    : 'bg-slate-950/85 border-amber-700/50 text-amber-100'
                }`}
              >
                <div className="flex items-center gap-0.5 sm:gap-1 text-[9px] sm:text-[11px] font-bold whitespace-nowrap leading-tight">
                  <span className="text-amber-400">#{idx + 1}</span>
                  <span className="max-w-[62px] sm:max-w-none truncate">{p.name}</span>
                  {isMe && <span className="text-sky-400 hidden sm:inline">{t.youSuffix}</span>}
                  {isSpeaking && <span className="text-emerald-400">🔊</span>}
                </div>
                {showRole && (
                  <div className="text-[8px] sm:text-[9px] font-mono text-amber-300 font-semibold leading-tight">
                    {ROLES[p.roleId].name[lang]}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
