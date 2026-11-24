import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Player, Phase, ThrownPropEvent, PropType, Language, VoteRecord } from '../types/game';
import { ROLES } from '../game/roles';
import { UI_TEXT } from '../utils/i18n';
import { sound, PROP_REACTION_META } from '../utils/sound';
import {
  AGROU_BIOMES,
  AGROU_EMOTES,
  AgrouEmoteEvent,
  AgrouEmoteId,
  AgrouHatId,
  AgrouMapBiome,
  CAMPFIRE_ABSTAIN_ID,
  getBotCosmetics,
} from '../game/agrouMechanics';
import {
  CameraViewPreset,
  computeDefaultFpvYawFromSeatAngle,
  clampFpvPitch,
  computeFpvCameraPose,
  computeFpvMovementStep,
  computeResponsiveCameraFraming,
  findFpvCrosshairTarget,
} from '../game/fpvCamera';

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
  votersByTarget?: Record<string, string[]>;
  votes?: VoteRecord[];
  activeSpeakers: string[];
  revealAllRoles?: boolean;
  cameraPreset: CameraViewPreset;
  activePropTool?: PropType | null;
  fpvLookTurnRate?: number;
  mapBiome?: AgrouMapBiome;
  mayorId?: string | null;
  emoteEvents?: AgrouEmoteEvent[];
  onAimedPlayerChange?: (playerId: string | null) => void;
  onSelectPlayer: (playerId: string) => void;
  onVoteCampfireAbstain?: () => void;
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
  mayorCrownGroup: THREE.Group;
  hatVariants: Record<AgrouHatId, THREE.Group>;
  koProgress: number;
  wobbleTimer: number;
  throwAnimTimer: number;
  reactionType: 'none' | 'angry' | 'happy_dance';
  reactionTimer: number;
  emoteType: AgrouEmoteId | null;
  emoteTimer: number;
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
  votersByTarget,
  votes = [],
  activeSpeakers,
  revealAllRoles,
  cameraPreset,
  activePropTool = null,
  fpvLookTurnRate = 0,
  mapBiome = 'forest',
  mayorId = null,
  emoteEvents = [],
  onAimedPlayerChange,
  onSelectPlayer,
  onVoteCampfireAbstain,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const labelContainerRef = useRef<HTMLDivElement>(null);
  const labelElsRef = useRef<(HTMLDivElement | null)[]>([]);
  const campfireLabelRef = useRef<HTMLDivElement | null>(null);
  const processedPropsRef = useRef<Set<string>>(new Set());
  const processedEmotesRef = useRef<Set<string>>(new Set());

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
    votes,
    activeSpeakers,
    revealAllRoles,
    cameraPreset,
    activePropTool,
    fpvLookTurnRate,
    mapBiome,
    mayorId,
    emoteEvents,
    onAimedPlayerChange,
    onSelectPlayer,
    onVoteCampfireAbstain,
    hoveredPlayerId: null as string | null,
    hoveredCampfire: false,
    aimedPlayerId: null as string | null,
    lastReportedAimedId: null as string | null,
    trauma: 0,
    hitstop: 0,
    // 360° Camera Orbit State
    azimuthAngle: 0,
    polarAngle: 0.54,
    cameraDist: 16.2,
    isDraggingOrbit: false,
    // First-Person View (FPV) State
    fpvYaw: Math.PI,
    fpvPitch: -0.04,
    fpvThrowSwingTimer: 0,
    snapCameraImmediate: false,
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
    const prevPreset = stateRef.current.cameraPreset;
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
      votes,
      activeSpeakers,
      revealAllRoles,
      cameraPreset,
      activePropTool,
      fpvLookTurnRate,
      mapBiome,
      mayorId,
      emoteEvents,
      onAimedPlayerChange,
      onSelectPlayer,
      onVoteCampfireAbstain,
    };

    if (cameraPreset !== prevPreset) {
      stateRef.current.snapCameraImmediate = true;
    }

    if (cameraPreset === 'first_person' && prevPreset !== 'first_person') {
      const meIdx = Math.max(0, players.findIndex((p) => p.id === userPlayerId));
      const count = Math.max(1, players.length);
      const seatAngle = Math.PI / 2 + (meIdx / count) * Math.PI * 2;
      stateRef.current.fpvYaw = computeDefaultFpvYawFromSeatAngle(seatAngle);
      stateRef.current.fpvPitch = -0.04;
      const meP = players[meIdx];
      if (meP?.isAlive) {
        const hx = Math.cos(seatAngle) * 5.65;
        const hz = Math.sin(seatAngle) * 5.65;
        stateRef.current.fpvYaw = Math.atan2(-hx, -hz);
      }
    }

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
    votes,
    activeSpeakers,
    revealAllRoles,
    cameraPreset,
    activePropTool,
    fpvLookTurnRate,
    mapBiome,
    mayorId,
    emoteEvents,
    onAimedPlayerChange,
    onSelectPlayer,
    onVoteCampfireAbstain,
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
    const initialSky = AGROU_BIOMES[stateRef.current.mapBiome || 'forest'].daySky;
    scene.background = new THREE.Color(initialSky);
    scene.fog = new THREE.FogExp2(initialSky, 0.0085);

    const camera = new THREE.PerspectiveCamera(46, width / height, 0.12, 140);
    camera.position.set(0, 8.2, 15.5);
    camera.lookAt(0, 1.0, 0);
    scene.add(camera);

    // First-Person Viewmodel Rig (Hands + Village Lantern + Claws / Held Prop)
    const fpvRigGroup = new THREE.Group();
    fpvRigGroup.visible = false;
    camera.add(fpvRigGroup);

    const fpvSleeveMat = new THREE.MeshLambertMaterial({ color: 0x0284c7 });
    const fpvSkinMat = new THREE.MeshLambertMaterial({ color: 0xfde68a });
    const fpvLanternMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    const fpvDarkIronMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });

    // Left Hand + Glowing Village Lantern
    const fpvLeftHandGroup = new THREE.Group();
    fpvLeftHandGroup.position.set(-0.26, -0.19, -0.55);
    const fpvSleeveGeo = new THREE.CylinderGeometry(0.052, 0.068, 0.34, 10);
    const fpvHandSphereGeo = new THREE.SphereGeometry(0.06, 10, 10);
    const leftSleeveMesh = new THREE.Mesh(fpvSleeveGeo, fpvSleeveMat);
    leftSleeveMesh.rotation.x = Math.PI / 2.3;
    leftSleeveMesh.rotation.z = -0.22;
    leftSleeveMesh.position.set(-0.04, -0.1, 0.14);
    const leftPalmMesh = new THREE.Mesh(fpvHandSphereGeo, fpvSkinMat);
    const fpvLanternBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.058, 0.048, 0.14, 8),
      fpvLanternMat
    );
    fpvLanternBody.position.set(0.02, -0.11, -0.02);
    const fpvLanternCap = new THREE.Mesh(
      new THREE.ConeGeometry(0.082, 0.06, 8),
      fpvDarkIronMat
    );
    fpvLanternCap.position.set(0.02, -0.02, -0.02);
    const fpvLanternBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.062, 0.025, 8),
      fpvDarkIronMat
    );
    fpvLanternBase.position.set(0.02, -0.19, -0.02);
    fpvLeftHandGroup.add(
      leftSleeveMesh,
      leftPalmMesh,
      fpvLanternBody,
      fpvLanternCap,
      fpvLanternBase
    );
    fpvRigGroup.add(fpvLeftHandGroup);

    // Right Hand + Werewolf Claws + Equipped Prop Preview
    const fpvRightHandGroup = new THREE.Group();
    fpvRightHandGroup.position.set(0.26, -0.18, -0.53);
    const rightSleeveMesh = new THREE.Mesh(fpvSleeveGeo, fpvSleeveMat);
    rightSleeveMesh.rotation.x = Math.PI / 2.3;
    rightSleeveMesh.rotation.z = 0.22;
    rightSleeveMesh.position.set(0.04, -0.1, 0.14);
    const rightPalmMesh = new THREE.Mesh(fpvHandSphereGeo, fpvSkinMat);
    fpvRightHandGroup.add(rightSleeveMesh, rightPalmMesh);

    const fpvClawsGroup = new THREE.Group();
    const clawGeo = new THREE.ConeGeometry(0.016, 0.095, 6);
    const clawMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    for (let c = -1; c <= 1; c++) {
      const claw = new THREE.Mesh(clawGeo, clawMat);
      claw.rotation.x = -Math.PI / 2.2;
      claw.position.set(c * 0.026, 0.01, -0.075);
      fpvClawsGroup.add(claw);
    }
    fpvClawsGroup.visible = false;
    fpvRightHandGroup.add(fpvClawsGroup);

    // Held Prop Previews (Tomato, Egg, Rose, Water Bucket)
    const fpvPropHolderGroup = new THREE.Group();
    fpvPropHolderGroup.position.set(0, 0.06, -0.04);
    const fpvHeldTomato = new THREE.Mesh(
      new THREE.SphereGeometry(0.065, 10, 10),
      new THREE.MeshLambertMaterial({ color: 0xef4444 })
    );
    const fpvHeldEgg = new THREE.Mesh(
      new THREE.SphereGeometry(0.058, 10, 10),
      new THREE.MeshLambertMaterial({ color: 0xfef9c3 })
    );
    fpvHeldEgg.scale.set(0.85, 1.22, 0.85);
    const fpvHeldRose = new THREE.Mesh(
      new THREE.ConeGeometry(0.06, 0.14, 8),
      new THREE.MeshLambertMaterial({ color: 0xf43f5e })
    );
    fpvHeldRose.rotation.x = Math.PI;
    const fpvHeldWater = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.048, 0.11, 10),
      new THREE.MeshLambertMaterial({ color: 0x38bdf8 })
    );
    fpvPropHolderGroup.add(fpvHeldTomato, fpvHeldEgg, fpvHeldRose, fpvHeldWater);
    fpvRightHandGroup.add(fpvPropHolderGroup);
    fpvRigGroup.add(fpvRightHandGroup);

    // Studio Environment Map (RoomEnvironment)
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 3. Agrou-Style Stylized Low-Poly Meadow Ground & Warm Dirt Campfire Clearing
    const initPalette = AGROU_BIOMES[stateRef.current.mapBiome || 'forest'];

    const groundGeo = new THREE.PlaneGeometry(118, 118, 36, 36);
    groundGeo.rotateX(-Math.PI / 2);
    const gPos = groundGeo.attributes.position;
    for (let i = 0; i < gPos.count; i++) {
      const gx = gPos.getX(i);
      const gz = gPos.getZ(i);
      const dist = Math.hypot(gx, gz);
      if (dist > 11.5) {
        const hillFactor = Math.min(1, (dist - 11.5) / 22);
        const wave =
          Math.sin(gx * 0.16) * Math.cos(gz * 0.16) * 1.45 +
          Math.sin((gx + gz) * 0.25) * 0.65;
        gPos.setY(i, Math.max(0, wave * hillFactor + hillFactor * 0.9));
      } else {
        gPos.setY(i, 0);
      }
    }
    groundGeo.computeVertexNormals();

    const groundMat = new THREE.MeshStandardMaterial({
      color: initPalette.groundNight,
      roughness: 0.92,
      metalness: 0.02,
      flatShading: true,
    });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.receiveShadow = true;
    scene.add(groundMesh);

    // Warm Packed-Dirt Campfire Clearing Disc + Mossy Stepping Stones
    const clearingDirtGeo = new THREE.CylinderGeometry(7.2, 7.6, 0.05, 18);
    const clearingDirtMat = new THREE.MeshStandardMaterial({
      color: initPalette.clearingDirt,
      roughness: 0.94,
      metalness: 0.02,
      flatShading: true,
    });
    const clearingDirt = new THREE.Mesh(clearingDirtGeo, clearingDirtMat);
    clearingDirt.position.y = 0.01;
    clearingDirt.receiveShadow = true;
    scene.add(clearingDirt);

    const innerDirtGeo = new THREE.CylinderGeometry(2.65, 2.85, 0.07, 14);
    const innerDirtMat = new THREE.MeshStandardMaterial({
      color: 0x5c422e,
      roughness: 0.95,
      flatShading: true,
    });
    const innerDirt = new THREE.Mesh(innerDirtGeo, innerDirtMat);
    innerDirt.position.y = 0.025;
    innerDirt.receiveShadow = true;
    scene.add(innerDirt);

    // Subtle Campfire Abstention Voting Ring (lights up warmly during day_voting!)
    const campfireVoteRingGeo = new THREE.RingGeometry(1.75, 2.08, 24);
    const campfireVoteRingMat = new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const campfireVoteRing = new THREE.Mesh(campfireVoteRingGeo, campfireVoteRingMat);
    campfireVoteRing.rotation.x = -Math.PI / 2;
    campfireVoteRing.position.y = 0.07;
    scene.add(campfireVoteRing);

    // 4. Lighting Rig (Warm Storytelling Agrou Key + Moonlight/Sunlight + Campfire Glow)
    const hemiLight = new THREE.HemisphereLight(
      initPalette.nightHemiSky,
      initPalette.nightHemiGround,
      1.05
    );
    hemiLight.position.set(0, 26, 0);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(initPalette.nightMoonLight, 1.55);
    dirLight.position.set(14, 21, -11);
    dirLight.castShadow = !isSoftwareGl;
    if (!isSoftwareGl) {
      dirLight.shadow.mapSize.width = 1024;
      dirLight.shadow.mapSize.height = 1024;
      const d = 15;
      dirLight.shadow.camera.left = -d;
      dirLight.shadow.camera.right = d;
      dirLight.shadow.camera.top = d;
      dirLight.shadow.camera.bottom = -d;
      dirLight.shadow.camera.near = 1;
      dirLight.shadow.camera.far = 48;
      dirLight.shadow.bias = -0.0005;
      dirLight.shadow.normalBias = 0.02;
    }
    scene.add(dirLight);

    const fireLight = new THREE.PointLight(0xff7b24, 6.2, 24, 1.45);
    fireLight.position.set(0, 1.65, 0);
    scene.add(fireLight);

    // Celestial Golden Sun / Stylized Low-Poly Moon in background vista
    const moonGroup = new THREE.Group();
    const moonGeo = new THREE.IcosahedronGeometry(2.7, 1);
    const moonMat = new THREE.MeshBasicMaterial({ color: 0xfde68a });
    const moonMesh = new THREE.Mesh(moonGeo, moonMat);
    const moonHaloGeo = new THREE.RingGeometry(2.9, 4.4, 24);
    const moonHaloMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.28,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const moonHalo = new THREE.Mesh(moonHaloGeo, moonHaloMat);
    moonGroup.add(moonMesh, moonHalo);
    moonGroup.position.set(0, 15.8, -32);
    scene.add(moonGroup);

    // Stylized Low-Poly Clouds drifting overhead (visible at Day / Dusk like Agrou!)
    const cloudGroup = new THREE.Group();
    const cloudMat = new THREE.MeshStandardMaterial({
      color: 0xfff8eb,
      roughness: 0.9,
      flatShading: true,
    });
    const cloudPuffGeo = new THREE.DodecahedronGeometry(1.4, 0);
    const cloudClusters: { mesh: THREE.Group; baseAngle: number; radius: number; height: number; speed: number }[] = [];
    for (let c = 0; c < 9; c++) {
      const cluster = new THREE.Group();
      const puffCount = 3 + (c % 2);
      for (let p = 0; p < puffCount; p++) {
        const puff = new THREE.Mesh(cloudPuffGeo, cloudMat);
        puff.position.set((p - 1) * 1.45, (p % 2) * 0.42, (p % 3 - 1) * 0.4);
        const ps = 0.72 + (p === 1 ? 0.42 : 0.15);
        puff.scale.set(ps * 1.35, ps * 0.72, ps);
        cluster.add(puff);
      }
      const ba = (c / 9) * Math.PI * 2;
      const cr = 22 + (c % 3) * 6.5;
      const ch = 13.5 + (c % 4) * 1.8;
      cluster.position.set(Math.cos(ba) * cr, ch, Math.sin(ba) * cr);
      cloudGroup.add(cluster);
      cloudClusters.push({ mesh: cluster, baseAngle: ba, radius: cr, height: ch, speed: 0.025 + (c % 3) * 0.008 });
    }
    scene.add(cloudGroup);

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

    // 5. Agrou Central Campfire Hearth, Crossed Firewood, Tripod Cauldron & Faceted Flames
    const campfireGroup = new THREE.Group();

    const rockMat = new THREE.MeshStandardMaterial({
      color: initPalette.rockColor,
      roughness: 0.86,
      metalness: 0.05,
      flatShading: true,
    });
    const stoneGeo = new THREE.DodecahedronGeometry(0.36, 0);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const rock = new THREE.Mesh(stoneGeo, rockMat);
      rock.position.set(Math.cos(a) * 1.32, 0.22, Math.sin(a) * 1.32);
      rock.scale.set(1.15 + (i % 2) * 0.16, 0.72 + (i % 3) * 0.1, 0.92);
      rock.rotation.set(i * 0.3, a, i * 0.2);
      rock.castShadow = !isSoftwareGl;
      campfireGroup.add(rock);
    }

    const logGeo = new THREE.CylinderGeometry(0.12, 0.15, 1.85, 6);
    const logMat = new THREE.MeshStandardMaterial({
      color: 0x5c3a21,
      roughness: 0.92,
      flatShading: true,
    });
    const paleWoodMat = new THREE.MeshStandardMaterial({
      color: 0xd9b382,
      roughness: 0.88,
      flatShading: true,
    });
    for (let i = 0; i < 6; i++) {
      const log = new THREE.Mesh(logGeo, logMat);
      log.position.y = 0.28;
      log.rotation.z = Math.PI / 2.45;
      log.rotation.y = (i * Math.PI) / 3;
      campfireGroup.add(log);
    }

    // Wooden Cooking Tripod + Cast-Iron Stew Pot over Campfire (Classic Medieval Campfire Charm)
    const tripodPoleGeo = new THREE.CylinderGeometry(0.045, 0.06, 2.75, 5);
    for (let p = 0; p < 3; p++) {
      const pa = (p / 3) * Math.PI * 2 + 0.35;
      const pole = new THREE.Mesh(tripodPoleGeo, logMat);
      pole.position.set(Math.cos(pa) * 0.78, 1.12, Math.sin(pa) * 0.78);
      pole.lookAt(0, 2.38, 0);
      pole.rotateX(Math.PI / 2);
      campfireGroup.add(pole);
    }
    const ironMat = new THREE.MeshStandardMaterial({
      color: 0x262930,
      roughness: 0.55,
      metalness: 0.65,
      flatShading: true,
    });
    const cauldronMesh = new THREE.Mesh(new THREE.DodecahedronGeometry(0.36, 0), ironMat);
    cauldronMesh.position.y = 1.52;
    cauldronMesh.scale.set(1.05, 0.82, 1.05);
    const chainRod = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.72, 5), ironMat);
    chainRod.position.y = 1.98;
    campfireGroup.add(cauldronMesh, chainRod);

    const emberCoreGeo = new THREE.DodecahedronGeometry(0.58, 0);
    const emberCoreMat = new THREE.MeshBasicMaterial({ color: 0xf97316 });
    const emberCore = new THREE.Mesh(emberCoreGeo, emberCoreMat);
    emberCore.scale.set(1.25, 0.42, 1.25);
    emberCore.position.y = 0.24;
    campfireGroup.add(emberCore);

    const flameOuterGeo = new THREE.ConeGeometry(0.76, 1.65, 6);
    const flameOuterMat = new THREE.MeshBasicMaterial({
      color: 0xea580c,
      transparent: true,
      opacity: 0.9,
    });
    const flameOuter = new THREE.Mesh(flameOuterGeo, flameOuterMat);
    flameOuter.position.y = 0.88;

    const flameInnerGeo = new THREE.ConeGeometry(0.45, 1.18, 5);
    const flameInnerMat = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
    });
    const flameInner = new THREE.Mesh(flameInnerGeo, flameInnerMat);
    flameInner.position.y = 0.74;

    // Clickable Campfire Abstention Hitbox
    const campfireHitbox = new THREE.Mesh(
      new THREE.CylinderGeometry(1.55, 1.55, 2.3, 10),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    campfireHitbox.position.y = 1.15;
    campfireHitbox.userData.isCampfire = true;
    campfireGroup.add(flameOuter, flameInner, campfireHitbox);
    scene.add(campfireGroup);

    // 6. Rustic Carved Timber Village Archway with Hanging Lanterns
    const archGroup = new THREE.Group();
    const pillarGeo = new THREE.CylinderGeometry(0.32, 0.42, 4.4, 6);
    const archBeamGeo = new THREE.BoxGeometry(5.6, 0.55, 0.65);
    const archRoofGeo = new THREE.ConeGeometry(3.5, 1.15, 4);
    const wallMat = new THREE.MeshStandardMaterial({
      color: initPalette.wallColor,
      roughness: 0.88,
      flatShading: true,
    });
    const roofMat = new THREE.MeshStandardMaterial({
      color: initPalette.roofColor,
      roughness: 0.74,
      flatShading: true,
    });
    const leftPillar = new THREE.Mesh(pillarGeo, logMat);
    leftPillar.position.set(-2.15, 2.2, 0);
    const rightPillar = new THREE.Mesh(pillarGeo, logMat);
    rightPillar.position.set(2.15, 2.2, 0);
    const lintel = new THREE.Mesh(archBeamGeo, logMat);
    lintel.position.set(0, 4.45, 0);
    const archCanopy = new THREE.Mesh(archRoofGeo, roofMat);
    archCanopy.position.set(0, 5.25, 0);
    archCanopy.scale.set(1.25, 1, 0.45);
    archCanopy.rotation.y = Math.PI / 4;

    const runeOrbGeo = new THREE.OctahedronGeometry(0.42, 0);
    const runeOrbMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });
    const runeOrb = new THREE.Mesh(runeOrbGeo, runeOrbMat);
    runeOrb.position.set(0, 3.82, 0);

    archGroup.add(leftPillar, rightPillar, lintel, archCanopy, runeOrb);
    archGroup.position.set(0, 0, -11.8);
    scene.add(archGroup);

    // 6B. Stylized Low-Poly Medieval Windmill & Timber Watchtower
    const windmillGroup = new THREE.Group();
    const millTower = new THREE.Mesh(
      new THREE.CylinderGeometry(1.15, 1.68, 5.6, 7),
      wallMat
    );
    millTower.position.y = 2.8;
    const millRoof = new THREE.Mesh(new THREE.ConeGeometry(1.55, 1.85, 7), roofMat);
    millRoof.position.y = 6.5;
    windmillGroup.add(millTower, millRoof);

    const windmillBlades = new THREE.Group();
    windmillBlades.position.set(0, 4.8, 1.34);
    const bladeHub = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.4, 6), logMat);
    bladeHub.rotation.x = Math.PI / 2;
    windmillBlades.add(bladeHub);

    const sailSpokeGeo = new THREE.BoxGeometry(0.14, 5.8, 0.08);
    const sailCanvasGeo = new THREE.BoxGeometry(0.66, 2.2, 0.05);
    const sailCanvasMat = new THREE.MeshStandardMaterial({
      color: 0xf3e5cc,
      roughness: 0.78,
      flatShading: true,
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
      sail.position.set(0.25, 1.65, 0.04);
      sailPivot.add(sail);
      windmillBlades.add(sailPivot);
    }
    windmillGroup.add(windmillBlades);
    windmillGroup.position.set(-14.5, 0, -13.5);
    windmillGroup.rotation.y = 0.48;
    scene.add(windmillGroup);

    const watchtowerGroup = new THREE.Group();
    const towerBody = new THREE.Mesh(
      new THREE.CylinderGeometry(1.32, 1.68, 6.2, 7),
      rockMat
    );
    towerBody.position.y = 3.1;
    const towerCrown = new THREE.Mesh(
      new THREE.CylinderGeometry(1.62, 1.45, 0.68, 7),
      logMat
    );
    towerCrown.position.y = 6.32;
    const brazierFlame = new THREE.Mesh(
      new THREE.ConeGeometry(0.68, 1.42, 6),
      flameOuterMat
    );
    brazierFlame.position.y = 7.12;
    watchtowerGroup.add(towerBody, towerCrown, brazierFlame);
    watchtowerGroup.position.set(14.5, 0, -13.5);
    scene.add(watchtowerGroup);

    // 7. Warm Agrou Stylized Half-Timbered Cottages with Pitched Roofs & Glowing Windows
    const cottagePositions = [
      { x: -11.8, z: -7.6, rot: 0.55 },
      { x: 11.8, z: -7.6, rot: -0.55 },
      { x: -13.4, z: 4.5, rot: 1.25 },
      { x: 13.4, z: 4.5, rot: -1.25 },
      { x: -7.6, z: -13.2, rot: 0.25 },
      { x: 7.6, z: -13.2, rot: -0.25 },
      { x: -10.2, z: 11.5, rot: 2.35 },
      { x: 10.2, z: 11.5, rot: -2.35 },
    ];
    const wallGeo = new THREE.BoxGeometry(3.4, 2.45, 2.9);
    const roofGeo = new THREE.ConeGeometry(2.9, 2.2, 4);
    const chimneyGeo = new THREE.BoxGeometry(0.54, 2.35, 0.54);
    const doorGeo = new THREE.BoxGeometry(0.76, 1.35, 0.14);
    const doorMat = new THREE.MeshStandardMaterial({
      color: 0x4a2c18,
      roughness: 0.9,
      flatShading: true,
    });
    const winGeo = new THREE.PlaneGeometry(0.62, 0.7);
    const winMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });
    const barrelGeo = new THREE.CylinderGeometry(0.28, 0.26, 0.68, 7);

    cottagePositions.forEach((pos) => {
      const house = new THREE.Group();
      const base = new THREE.Mesh(wallGeo, wallMat);
      base.position.y = 1.22;
      const roof = new THREE.Mesh(roofGeo, roofMat);
      roof.position.y = 3.55;
      roof.rotation.y = Math.PI / 4;
      const chimney = new THREE.Mesh(chimneyGeo, rockMat);
      chimney.position.set(0.95, 3.25, -0.55);
      const door = new THREE.Mesh(doorGeo, doorMat);
      door.position.set(0, 0.68, 1.46);
      const winL = new THREE.Mesh(winGeo, winMat);
      winL.position.set(-0.92, 1.42, 1.47);
      const winR = new THREE.Mesh(winGeo, winMat);
      winR.position.set(0.92, 1.42, 1.47);
      const barrel = new THREE.Mesh(barrelGeo, logMat);
      barrel.position.set(1.48, 0.34, 1.38);
      house.add(base, roof, chimney, door, winL, winR, barrel);
      house.position.set(pos.x, 0, pos.z);
      house.rotation.y = pos.rot;
      scene.add(house);
    });

    // 7B. Rustic Wooden Lantern Posts, Split-Rail Fences, Boulders, Mushrooms & Autumn Pumpkins
    const lampPoleGeo = new THREE.CylinderGeometry(0.08, 0.11, 2.85, 6);
    const lampArmGeo = new THREE.BoxGeometry(0.55, 0.09, 0.09);
    const lampOrbGeo = new THREE.OctahedronGeometry(0.22, 0);
    const lampGlowMat = new THREE.MeshBasicMaterial({ color: 0xfde047 });
    const fenceRailGeo = new THREE.BoxGeometry(2.3, 0.1, 0.08);
    const fencePostGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.95, 5);
    const pumpkinGroup = new THREE.Group();
    const pumpkinMat = new THREE.MeshStandardMaterial({
      color: 0xea580c,
      roughness: 0.72,
      flatShading: true,
    });
    const pumpkinStemMat = new THREE.MeshStandardMaterial({
      color: 0x365314,
      roughness: 0.85,
      flatShading: true,
    });
    const mushroomCapMat = new THREE.MeshStandardMaterial({
      color: 0xdc2626,
      roughness: 0.65,
      flatShading: true,
    });

    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + Math.PI / 8;
      const lx = Math.cos(a) * 8.65;
      const lz = Math.sin(a) * 8.65;

      const lampGroup = new THREE.Group();
      const pole = new THREE.Mesh(lampPoleGeo, logMat);
      pole.position.y = 1.42;
      const arm = new THREE.Mesh(lampArmGeo, logMat);
      arm.position.set(0.22, 2.78, 0);
      const bulb = new THREE.Mesh(lampOrbGeo, lampGlowMat);
      bulb.position.set(0.45, 2.58, 0);
      lampGroup.add(pole, arm, bulb);
      lampGroup.position.set(lx, 0, lz);
      lampGroup.rotation.y = -a + Math.PI;
      scene.add(lampGroup);

      // Split-rail wooden fence & decorative mossy boulder / toadstool cluster
      if (k % 2 === 0) {
        const fence = new THREE.Group();
        const p1 = new THREE.Mesh(fencePostGeo, logMat);
        p1.position.set(-1.05, 0.47, 0);
        const p2 = new THREE.Mesh(fencePostGeo, logMat);
        p2.position.set(1.05, 0.47, 0);
        const r1 = new THREE.Mesh(fenceRailGeo, logMat);
        r1.position.set(0, 0.72, 0);
        const r2 = new THREE.Mesh(fenceRailGeo, logMat);
        r2.position.set(0, 0.36, 0);
        fence.add(p1, p2, r1, r2);
        const fa = a + 0.22;
        fence.position.set(Math.cos(fa) * 9.3, 0, Math.sin(fa) * 9.3);
        fence.rotation.y = -fa + Math.PI / 2;
        scene.add(fence);

        // Low-poly woodland boulder + red-capped toadstool
        const boulder = new THREE.Mesh(stoneGeo, rockMat);
        boulder.position.set(Math.cos(a - 0.16) * 8.9, 0.28, Math.sin(a - 0.16) * 8.9);
        boulder.scale.set(1.65, 1.05, 1.4);
        boulder.rotation.y = k;
        scene.add(boulder);

        const mushStem = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.22, 5), paleWoodMat);
        mushStem.position.set(Math.cos(a - 0.11) * 8.3, 0.11, Math.sin(a - 0.11) * 8.3);
        const mushCap = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.16, 6), mushroomCapMat);
        mushCap.position.set(Math.cos(a - 0.11) * 8.3, 0.26, Math.sin(a - 0.11) * 8.3);
        scene.add(mushStem, mushCap);
      }

      // Glowing Autumn Pumpkins around clearing (visible in 'autumn' biome!)
      const pBody = new THREE.Mesh(new THREE.DodecahedronGeometry(0.32, 0), pumpkinMat);
      pBody.scale.set(1.15, 0.84, 1.15);
      pBody.position.set(Math.cos(a + 0.1) * 7.8, 0.26, Math.sin(a + 0.1) * 7.8);
      const pStem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 0.16, 5), pumpkinStemMat);
      pStem.position.set(Math.cos(a + 0.1) * 7.8, 0.54, Math.sin(a + 0.1) * 7.8);
      pumpkinGroup.add(pBody, pStem);
    }
    pumpkinGroup.visible = stateRef.current.mapBiome === 'autumn';
    scene.add(pumpkinGroup);

    // 8. Agrou Multi-Tiered Stylized Low-Poly Pine Forest (2-Tier Faceted Cones!)
    const treeCount = 68;
    const trunkGeo = new THREE.CylinderGeometry(0.18, 0.3, 1.75, 5);
    const trunkMat = new THREE.MeshStandardMaterial({
      color: 0x4f321d,
      roughness: 0.92,
      flatShading: true,
    });
    const foliageLowerGeo = new THREE.ConeGeometry(1.65, 2.85, 6);
    const foliageUpperGeo = new THREE.ConeGeometry(1.18, 2.45, 6);
    const foliageMatLower = new THREE.MeshStandardMaterial({
      color: initPalette.foliagePrimary,
      roughness: 0.84,
      flatShading: true,
    });
    const foliageMatUpper = new THREE.MeshStandardMaterial({
      color: initPalette.foliageSecondary,
      roughness: 0.82,
      flatShading: true,
    });

    const trunkInst = new THREE.InstancedMesh(trunkGeo, trunkMat, treeCount);
    const foliageLowerInst = new THREE.InstancedMesh(foliageLowerGeo, foliageMatLower, treeCount);
    const foliageUpperInst = new THREE.InstancedMesh(foliageUpperGeo, foliageMatUpper, treeCount);

    for (let i = 0; i < treeCount; i++) {
      const angle = (i / treeCount) * Math.PI * 2 + (i % 3) * 0.04;
      const radius = 15.8 + (i % 5) * 2.7;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const scale = 0.88 + (i % 4) * 0.22;

      _dummyObj.position.set(x, 0.85 * scale, z);
      _dummyObj.scale.set(scale, scale, scale);
      _dummyObj.rotation.set(0, angle, 0);
      _dummyObj.updateMatrix();
      trunkInst.setMatrixAt(i, _dummyObj.matrix);

      _dummyObj.position.set(x, 2.55 * scale, z);
      _dummyObj.updateMatrix();
      foliageLowerInst.setMatrixAt(i, _dummyObj.matrix);

      _dummyObj.position.set(x, 4.15 * scale, z);
      _dummyObj.rotation.set(0, angle + 0.5, 0);
      _dummyObj.updateMatrix();
      foliageUpperInst.setMatrixAt(i, _dummyObj.matrix);
    }
    trunkInst.computeBoundingSphere();
    foliageLowerInst.computeBoundingSphere();
    foliageUpperInst.computeBoundingSphere();
    scene.add(trunkInst, foliageLowerInst, foliageUpperInst);

    // Distant Faceted Alpine Mountain Range + Crisp Snow Caps (18 Peaks)
    const mountainCount = 18;
    const mountainGeo = new THREE.ConeGeometry(8.8, 19.5, 5);
    const mountainMat = new THREE.MeshStandardMaterial({
      color: initPalette.mountainColor,
      roughness: 0.92,
      flatShading: true,
    });
    const snowCapGeo = new THREE.ConeGeometry(3.55, 7.6, 5);
    const snowCapMat = new THREE.MeshStandardMaterial({
      color: initPalette.mountainSnowCap,
      roughness: 0.86,
      flatShading: true,
    });
    const mountainInst = new THREE.InstancedMesh(mountainGeo, mountainMat, mountainCount);
    const snowCapInst = new THREE.InstancedMesh(snowCapGeo, snowCapMat, mountainCount);
    for (let m = 0; m < mountainCount; m++) {
      const ma = (m / mountainCount) * Math.PI * 2;
      const mr = 39 + (m % 3) * 3.5;
      const mx = Math.cos(ma) * mr;
      const mz = Math.sin(ma) * mr;
      const sy = 0.78 + (m % 4) * 0.24;
      const sxz = 0.88 + (m % 3) * 0.22;
      _dummyObj.position.set(mx, 8.8 * sy, mz);
      _dummyObj.scale.set(sxz, sy, sxz);
      _dummyObj.rotation.set(0, ma * 1.7, 0);
      _dummyObj.updateMatrix();
      mountainInst.setMatrixAt(m, _dummyObj.matrix);

      _dummyObj.position.set(mx, 14.8 * sy, mz);
      _dummyObj.scale.set(sxz, sy, sxz);
      _dummyObj.updateMatrix();
      snowCapInst.setMatrixAt(m, _dummyObj.matrix);
    }
    mountainInst.computeBoundingSphere();
    snowCapInst.computeBoundingSphere();
    scene.add(mountainInst, snowCapInst);

    // 9. Pooled Ember / Snowflake / Autumn Leaf Particle System
    const particleGeo = new THREE.DodecahedronGeometry(0.07, 0);
    const particleMat = new THREE.MeshBasicMaterial({ color: initPalette.ambientParticleColor });
    const particleInst = new THREE.InstancedMesh(particleGeo, particleMat, PARTICLE_COUNT);
    particleInst.frustumCulled = false;
    scene.add(particleInst);

    const particleData = Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
      x: (Math.random() - 0.5) * 14,
      y: Math.random() * 6.5,
      z: (Math.random() - 0.5) * 14,
      vy: 0.7 + Math.random() * 1.2,
      phase: i * 0.7,
    }));

    // 9B. Pooled 3D Glowing Vote / Accusation Arcs (Zero-GC Instanced Diamond Beads)
    const VOTE_BEADS_PER_ARC = 7;
    const MAX_VOTE_ARCS = MAX_SEATS;
    const voteBeadGeo = new THREE.OctahedronGeometry(0.11, 0);
    const voteBeadMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const voteArcInst = new THREE.InstancedMesh(
      voteBeadGeo,
      voteBeadMat,
      MAX_VOTE_ARCS * VOTE_BEADS_PER_ARC
    );
    voteArcInst.frustumCulled = false;
    voteArcInst.visible = false;
    scene.add(voteArcInst);

    // 10. Create 20 Agrou Stylized Low-Poly Characters on Wooden Log Stumps + 7 Hats + Mayor Crown
    const seats: SeatVisual[] = [];
    const clickables: THREE.Mesh[] = [campfireHitbox];
    const activeProjectiles: ActiveProjectile3D[] = [];
    const activeSplats: ActiveSplatEffect3D[] = [];

    const stumpBarkGeo = new THREE.CylinderGeometry(0.62, 0.72, 0.34, 8);
    const stumpTopGeo = new THREE.CylinderGeometry(0.56, 0.58, 0.05, 8);
    const shadowDiscGeo = new THREE.CircleGeometry(0.9, 14);
    const shadowDiscMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
    });

    const bootGeo = new THREE.BoxGeometry(0.17, 0.14, 0.27);
    const bootMat = new THREE.MeshStandardMaterial({
      color: 0x382214,
      roughness: 0.85,
      flatShading: true,
    });
    const torsoGeo = new THREE.CylinderGeometry(0.28, 0.44, 0.88, 7);
    const beltGeo = new THREE.CylinderGeometry(0.37, 0.38, 0.11, 7);
    const beltBuckleGeo = new THREE.BoxGeometry(0.14, 0.12, 0.09);
    const buckleMat = new THREE.MeshStandardMaterial({
      color: 0xf5b82e,
      roughness: 0.3,
      metalness: 0.75,
      flatShading: true,
    });
    const capeGeo = new THREE.CylinderGeometry(0.32, 0.5, 0.36, 7);
    const armGeo = new THREE.CylinderGeometry(0.075, 0.085, 0.42, 6);
    const handGeo = new THREE.DodecahedronGeometry(0.085, 0);
    const headGeo = new THREE.IcosahedronGeometry(0.27, 1);
    const noseGeo = new THREE.ConeGeometry(0.048, 0.11, 5);
    const headMat = new THREE.MeshStandardMaterial({
      color: 0xfad7a0,
      roughness: 0.6,
      flatShading: true,
    });

    // Shared Low-Poly Hat Geometries & Materials (7 Agrou Variants!)
    const hatDarkMat = new THREE.MeshStandardMaterial({ color: 0x261c2e, roughness: 0.72, flatShading: true });
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x4a2f1d, roughness: 0.85, flatShading: true });
    const knightSteelMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.35, metalness: 0.7, flatShading: true });
    const plumeRedMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.65, flatShading: true });
    const strawMat = new THREE.MeshStandardMaterial({ color: 0xe6be63, roughness: 0.85, flatShading: true });
    const antlerMat = new THREE.MeshStandardMaterial({ color: 0x784c2a, roughness: 0.88, flatShading: true });
    const rubyMat = new THREE.MeshStandardMaterial({ color: 0xe11d48, roughness: 0.25, metalness: 0.3, flatShading: true });

    const earGeo = new THREE.ConeGeometry(0.1, 0.29, 5);
    const earMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.7, flatShading: true });
    const snoutGeo = new THREE.ConeGeometry(0.12, 0.22, 5);
    const eyeGeo = new THREE.BoxGeometry(0.065, 0.065, 0.05);

    const haloGeo = new THREE.RingGeometry(0.76, 0.94, 18);
    const shieldGeo = new THREE.TorusGeometry(0.68, 0.042, 6, 16);
    const shieldMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
    const heartGeo = new THREE.OctahedronGeometry(0.16, 0);
    const heartMat = new THREE.MeshBasicMaterial({ color: 0xf43f5e });

    const postGeo = new THREE.CylinderGeometry(0.05, 0.07, 1.48, 5);
    const lanternGeo = new THREE.OctahedronGeometry(0.15, 0);
    const lanternCapGeo = new THREE.ConeGeometry(0.19, 0.13, 6);
    const tombGeo = new THREE.BoxGeometry(0.5, 0.78, 0.18);
    const tombCrossVGeo = new THREE.BoxGeometry(0.08, 0.34, 0.06);
    const tombCrossHGeo = new THREE.BoxGeometry(0.24, 0.08, 0.06);
    const tombMat = new THREE.MeshStandardMaterial({ color: 0x78716c, roughness: 0.88, flatShading: true });

    // Spectral Ghost Soul Geometries & Materials (Low-Poly Faceted)
    const ghostShroudGeo = new THREE.ConeGeometry(0.38, 1.05, 7);
    const ghostHeadGeo = new THREE.IcosahedronGeometry(0.24, 1);
    const ghostWispGeo = new THREE.OctahedronGeometry(0.09, 0);
    const ghostMat = new THREE.MeshBasicMaterial({
      color: 0x7dd3fc,
      transparent: true,
      opacity: 0.65,
    });
    const ghostEyeMat = new THREE.MeshBasicMaterial({ color: 0xf0f9ff });

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
      shadowDisc.position.y = 0.02;
      group.add(shadowDisc);

      // Wooden Campfire Log Stump Seat (Agrou style!)
      const stumpBark = new THREE.Mesh(stumpBarkGeo, logMat);
      stumpBark.position.y = 0.17;
      stumpBark.receiveShadow = true;
      const stumpTop = new THREE.Mesh(stumpTopGeo, paleWoodMat);
      stumpTop.position.y = 0.34;
      stumpTop.receiveShadow = true;
      group.add(stumpBark, stumpTop);

      const haloMat = new THREE.MeshBasicMaterial({
        color: 0xf59e0b,
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const halo = new THREE.Mesh(haloGeo, haloMat);
      halo.rotation.x = -Math.PI / 2;
      halo.position.y = 0.04;
      group.add(halo);

      const shieldRing = new THREE.Mesh(shieldGeo, shieldMat);
      shieldRing.rotation.x = Math.PI / 2;
      shieldRing.position.y = 0.82;
      shieldRing.visible = false;
      group.add(shieldRing);

      const loverHeart = new THREE.Mesh(heartGeo, heartMat);
      loverHeart.position.set(0.45, 1.88, 0);
      loverHeart.visible = false;
      group.add(loverHeart);

      const bodyGroup = new THREE.Group();
      bodyGroup.position.y = 0.34;

      const leftBoot = new THREE.Mesh(bootGeo, bootMat);
      leftBoot.position.set(-0.14, 0.07, 0.04);
      const rightBoot = new THREE.Mesh(bootGeo, bootMat);
      rightBoot.position.set(0.14, 0.07, 0.04);
      bodyGroup.add(leftBoot, rightBoot);

      const defaultCosm = getBotCosmetics(i);
      const cloakMat = new THREE.MeshStandardMaterial({
        color: defaultCosm.cloakColor,
        roughness: 0.72,
        metalness: 0.08,
        flatShading: true,
      });
      const torso = new THREE.Mesh(torsoGeo, cloakMat);
      torso.position.y = 0.52;
      torso.castShadow = !isSoftwareGl;
      bodyGroup.add(torso);

      const belt = new THREE.Mesh(beltGeo, bootMat);
      belt.position.y = 0.42;
      const buckle = new THREE.Mesh(beltBuckleGeo, buckleMat);
      buckle.position.set(0, 0.42, 0.35);
      bodyGroup.add(belt, buckle);

      const cape = new THREE.Mesh(capeGeo, hatDarkMat);
      cape.position.y = 0.84;
      bodyGroup.add(cape);

      const leftArm = new THREE.Group();
      leftArm.position.set(-0.37, 0.82, 0);
      const lArmMesh = new THREE.Mesh(armGeo, cloakMat);
      lArmMesh.position.y = -0.18;
      const lHandMesh = new THREE.Mesh(handGeo, headMat);
      lHandMesh.position.y = -0.4;
      leftArm.add(lArmMesh, lHandMesh);
      leftArm.rotation.z = 0.18;

      const rightArm = new THREE.Group();
      rightArm.position.set(0.37, 0.82, 0);
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

      // Build 7 Low-Poly Agrou Customizable Hats
      const hatAnchor = new THREE.Group();
      hatAnchor.position.y = 1.38;
      bodyGroup.add(hatAnchor);

      const hNone = new THREE.Group();
      const hairCap = new THREE.Mesh(new THREE.DodecahedronGeometry(0.25, 0), hairMat);
      hairCap.scale.set(1.06, 0.65, 1.06);
      hairCap.position.set(0, -0.02, -0.02);
      hNone.add(hairCap);

      const hWitch = new THREE.Group();
      const wBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.48, 0.05, 8), hatDarkMat);
      const wBand = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.3, 0.08, 7), buckleMat);
      wBand.position.y = 0.05;
      const wCone = new THREE.Mesh(new THREE.ConeGeometry(0.29, 0.56, 7), hatDarkMat);
      wCone.position.set(0, 0.32, -0.03);
      wCone.rotation.x = -0.14;
      hWitch.add(wBrim, wBand, wCone);

      const hKnight = new THREE.Group();
      const kDome = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.3, 0.32, 7), knightSteelMat);
      kDome.position.y = -0.03;
      const kVisor = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.09, 0.14), ironMat);
      kVisor.position.set(0, -0.08, 0.24);
      const kPlume = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.22, 0.36), plumeRedMat);
      kPlume.position.set(0, 0.2, -0.02);
      hKnight.add(kDome, kVisor, kPlume);

      const hStraw = new THREE.Group();
      const sBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.55, 0.05, 9), strawMat);
      const sCrown = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.3, 0.24, 8), strawMat);
      sCrown.position.y = 0.13;
      const sRibbon = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.3, 0.06, 8), plumeRedMat);
      sRibbon.position.y = 0.05;
      hStraw.add(sBrim, sCrown, sRibbon);

      const hAntlers = new THREE.Group();
      const aBand = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.27, 0.07, 7), hairMat);
      const aL1 = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.045, 0.42, 5), antlerMat);
      aL1.position.set(-0.22, 0.18, 0);
      aL1.rotation.z = 0.48;
      const aL2 = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.03, 0.22, 5), antlerMat);
      aL2.position.set(-0.34, 0.32, 0.04);
      aL2.rotation.z = -0.35;
      const aR1 = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.045, 0.42, 5), antlerMat);
      aR1.position.set(0.22, 0.18, 0);
      aR1.rotation.z = -0.48;
      const aR2 = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.03, 0.22, 5), antlerMat);
      aR2.position.set(0.34, 0.32, 0.04);
      aR2.rotation.z = 0.35;
      hAntlers.add(aBand, aL1, aL2, aR1, aR2);

      const hPirate = new THREE.Group();
      const pBase = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.38, 0.16, 3), hatDarkMat);
      pBase.position.y = 0.08;
      const pTrim = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.05, 0.08), buckleMat);
      pTrim.position.set(0, 0.12, 0.26);
      const pBadge = new THREE.Mesh(new THREE.OctahedronGeometry(0.07, 0), paleWoodMat);
      pBadge.position.set(0, 0.14, 0.3);
      hPirate.add(pBase, pTrim, pBadge);

      const hCrown = new THREE.Group();
      const cRing = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.25, 0.18, 6), buckleMat);
      cRing.position.y = 0.08;
      const cGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.065, 0), rubyMat);
      cGem.position.set(0, 0.12, 0.27);
      for (let sp = 0; sp < 5; sp++) {
        const sa = (sp / 5) * Math.PI * 2;
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.16, 4), buckleMat);
        spike.position.set(Math.cos(sa) * 0.24, 0.23, Math.sin(sa) * 0.24);
        hCrown.add(spike);
      }
      hCrown.add(cRing, cGem);

      const hatVariants: Record<AgrouHatId, THREE.Group> = {
        none: hNone,
        witch: hWitch,
        knight: hKnight,
        straw: hStraw,
        antlers: hAntlers,
        pirate: hPirate,
        crown: hCrown,
      };
      (Object.keys(hatVariants) as AgrouHatId[]).forEach((k) => {
        hatVariants[k].visible = k === defaultCosm.hat;
        hatAnchor.add(hatVariants[k]);
      });

      // Floating Golden Mayor Crown (hovers neatly above the living Village Mayor!)
      const mayorCrownGroup = new THREE.Group();
      mayorCrownGroup.position.set(0, 1.94, 0);
      mayorCrownGroup.scale.setScalar(0.76);
      const mcBand = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.045, 5, 6), buckleMat);
      mcBand.rotation.x = Math.PI / 2;
      mayorCrownGroup.add(mcBand);
      for (let sp = 0; sp < 4; sp++) {
        const sa = (sp / 4) * Math.PI * 2;
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.18, 4), buckleMat);
        spike.position.set(Math.cos(sa) * 0.24, 0.1, Math.sin(sa) * 0.24);
        mayorCrownGroup.add(spike);
      }
      const mcGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.08, 0), rubyMat);
      mcGem.position.y = 0.08;
      mayorCrownGroup.add(mcGem);
      mayorCrownGroup.visible = false;
      bodyGroup.add(mayorCrownGroup);

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
      eyeL.position.set(-0.09, 1.2, 0.24);
      const eyeR = new THREE.Mesh(eyeGeo, eyeRightMat);
      eyeR.position.set(0.09, 1.2, 0.24);
      bodyGroup.add(eyeL, eyeR);

      // 3D Anger Reaction Aura
      const angerAuraGroup = new THREE.Group();
      angerAuraGroup.position.set(0, 1.92, 0);
      const angerBarGeo = new THREE.BoxGeometry(0.32, 0.075, 0.075);
      const angerMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
      const angerCross1 = new THREE.Mesh(angerBarGeo, angerMat);
      angerCross1.rotation.z = Math.PI / 4;
      angerCross1.position.set(0.28, 0.12, 0.16);
      const angerCross2 = new THREE.Mesh(angerBarGeo, angerMat);
      angerCross2.rotation.z = -Math.PI / 4;
      angerCross2.position.set(0.28, 0.12, 0.16);
      const rageRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.46, 0.035, 6, 14),
        angerMat
      );
      rageRing.rotation.x = Math.PI / 2;
      rageRing.position.y = -0.15;
      angerAuraGroup.add(angerCross1, angerCross2, rageRing);
      angerAuraGroup.visible = false;
      bodyGroup.add(angerAuraGroup);

      // 3D Happy Dance Aura
      const happyAuraGroup = new THREE.Group();
      happyAuraGroup.position.set(0, 1.82, 0);
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
      post.position.set(-0.56, 0.74, 0.25);
      const lanternMat = new THREE.MeshStandardMaterial({
        color: 0xfef08a,
        emissive: 0xf59e0b,
        emissiveIntensity: 1.5,
        roughness: 0.25,
        flatShading: true,
      });
      const lantern = new THREE.Mesh(lanternGeo, lanternMat);
      lantern.position.set(-0.56, 1.48, 0.25);
      const lanternCap = new THREE.Mesh(lanternCapGeo, hatDarkMat);
      lanternCap.position.set(-0.56, 1.62, 0.25);
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
      gEyeL.position.set(-0.08, 1.18, 0.21);
      const gEyeR = new THREE.Mesh(eyeGeo, ghostEyeMat);
      gEyeR.position.set(0.08, 1.18, 0.21);
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
        mayorCrownGroup,
        hatVariants,
        koProgress: 0,
        wobbleTimer: 0,
        throwAnimTimer: 0,
        reactionType: 'none',
        reactionTimer: 0,
        emoteType: null,
        emoteTimer: 0,
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

    // 11. Pointer, 360° Orbit Drag & Raycasting Handlers (Includes Campfire Abstain Click!)
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const groundHitPoint = new THREE.Vector3();
    let lastHoverTime = 0;
    let lastDragX = 0;
    let lastDragY = 0;
    let isPointerDown = false;
    let dragDistance = 0;

    const getRayHitTarget = (
      clientX: number,
      clientY: number
    ): { playerId: string | null; isCampfire: boolean } => {
      const rect = renderer.domElement.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return { playerId: null, isCampfire: false };
      pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(clickables, false);
      for (const hit of hits) {
        if (hit.object.userData.isCampfire) {
          if (stateRef.current.phase === 'day_voting' && !stateRef.current.isTitleScreen) {
            return { playerId: null, isCampfire: true };
          }
          continue;
        }
        const seatIdx = hit.object.userData.seatIndex;
        const seat = seats[seatIdx];
        if (seat && seat.group.visible && seat.playerId) {
          return { playerId: seat.playerId, isCampfire: false };
        }
      }
      return { playerId: null, isCampfire: false };
    };

    const onPointerDown = (e: PointerEvent) => {
      isPointerDown = true;
      lastDragX = e.clientX;
      lastDragY = e.clientY;
      dragDistance = 0;
    };

    const onPointerMove = (e: PointerEvent) => {
      const st = stateRef.current;
      const isFpv = !st.isTitleScreen && st.cameraPreset === 'first_person';

      if (isPointerDown) {
        const dx = e.clientX - lastDragX;
        const dy = e.clientY - lastDragY;
        dragDistance += Math.hypot(dx, dy);
        lastDragX = e.clientX;
        lastDragY = e.clientY;

        if (dragDistance > 5) {
          st.isDraggingOrbit = true;
          if (isFpv) {
            st.fpvYaw -= dx * 0.0065;
            st.fpvPitch = clampFpvPitch(st.fpvPitch - dy * 0.005);
          } else {
            st.azimuthAngle -= dx * 0.0075;
            st.polarAngle = Math.max(0.22, Math.min(1.28, st.polarAngle + dy * 0.0055));
          }
        }
      } else if (st.freeLook360 && !st.isTitleScreen) {
        const rect = renderer.domElement.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
          const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
          if (isFpv) {
            st.fpvYaw = Math.PI - nx * Math.PI;
            st.fpvPitch = clampFpvPitch(-ny * 0.55);
          } else {
            st.azimuthAngle = -nx * Math.PI;
            st.polarAngle = 0.35 + (ny + 1) * 0.35;
          }
        }
      }

      const now = performance.now();
      if (now - lastHoverTime < 45) return;
      lastHoverTime = now;
      const hit = getRayHitTarget(e.clientX, e.clientY);
      st.hoveredPlayerId = hit.playerId;
      st.hoveredCampfire = hit.isCampfire;
      renderer.domElement.style.cursor =
        hit.playerId || hit.isCampfire || (isFpv && st.aimedPlayerId)
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

      const st = stateRef.current;
      const isFpv = st.cameraPreset === 'first_person';
      const hit = getRayHitTarget(e.clientX, e.clientY);
      if (hit.isCampfire && st.phase === 'day_voting') {
        st.onVoteCampfireAbstain?.();
        return;
      }
      const pid = hit.playerId || (isFpv ? st.aimedPlayerId : null);
      if (pid) {
        st.onSelectPlayer(pid);
      } else {
        const me = st.players.find((p) => p.id === st.userPlayerId);
        const canRoam =
          (me && !me.isAlive) ||
          (st.phase === 'night' && st.isPlayerAwakeAtNight && me?.isAlive) ||
          (isFpv && me?.isAlive);
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
        [
          'KeyW',
          'KeyA',
          'KeyS',
          'KeyD',
          'KeyQ',
          'KeyE',
          'ArrowUp',
          'ArrowDown',
          'ArrowLeft',
          'ArrowRight',
        ].includes(e.code)
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
          renderer.render(scene, camera);
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

      // Biome-Aware Day vs Night vs Blindfold Atmosphere Interpolation (Agrou Stylized Biomes)
      const activeBiomeKey = st.mapBiome || 'forest';
      const biome = AGROU_BIOMES[activeBiomeKey];
      const isDay =
        st.isTitleScreen || st.phase === 'day_discussion' || st.phase === 'day_voting';
      const targetBgHex = isDay
        ? biome.daySky
        : isNightBlindfolded
        ? biome.blindNightSky
        : biome.nightSky;
      const bgLerp = isSoftwareGl ? 0.65 : 1 - Math.exp(-5.5 * dt);
      _scratchColor.setHex(targetBgHex);
      (scene.background as THREE.Color).lerp(_scratchColor, bgLerp);
      if (scene.fog instanceof THREE.FogExp2) {
        scene.fog.color.copy(scene.background as THREE.Color);
        scene.fog.density = THREE.MathUtils.damp(
          scene.fog.density,
          isNightBlindfolded ? 0.075 : isDay ? 0.0075 : 0.0175,
          6,
          dt
        );
      }

      // Smoothly (and crisply on low-FPS software WebGL) tint Biome Materials
      const colorDamp = isSoftwareGl ? 0.85 : 1 - Math.exp(-9 * dt);
      _scratchColor.setHex(isDay ? biome.groundDay : biome.groundNight);
      groundMat.color.lerp(_scratchColor, colorDamp);
      _scratchColor.setHex(isDay ? biome.clearingDirt : 0x523925);
      clearingDirtMat.color.lerp(_scratchColor, colorDamp);
      _scratchColor.setHex(biome.foliagePrimary);
      foliageMatLower.color.lerp(_scratchColor, colorDamp);
      _scratchColor.setHex(biome.foliageSecondary);
      foliageMatUpper.color.lerp(_scratchColor, colorDamp);
      _scratchColor.setHex(biome.rockColor);
      rockMat.color.lerp(_scratchColor, colorDamp);
      _scratchColor.setHex(biome.mountainColor);
      mountainMat.color.lerp(_scratchColor, colorDamp);
      _scratchColor.setHex(biome.mountainSnowCap);
      snowCapMat.color.lerp(_scratchColor, colorDamp);
      _scratchColor.setHex(biome.roofColor);
      roofMat.color.lerp(_scratchColor, colorDamp);
      _scratchColor.setHex(biome.wallColor);
      wallMat.color.lerp(_scratchColor, colorDamp);
      _scratchColor.setHex(biome.ambientParticleColor);
      particleMat.color.lerp(_scratchColor, colorDamp);
      pumpkinGroup.visible = activeBiomeKey === 'autumn';

      hemiLight.color.setHex(isDay ? biome.dayHemiSky : biome.nightHemiSky);
      hemiLight.groundColor.setHex(isDay ? biome.dayHemiGround : biome.nightHemiGround);
      const targetHemi = isDay ? 1.55 : isNightBlindfolded ? 0.14 : 0.46;
      const targetDir = isDay ? 2.45 : isNightBlindfolded ? 0.12 : 0.62;
      hemiLight.intensity = isSoftwareGl
        ? targetHemi
        : THREE.MathUtils.damp(hemiLight.intensity, targetHemi, 5.5, dt);
      dirLight.intensity = isSoftwareGl
        ? targetDir
        : THREE.MathUtils.damp(dirLight.intensity, targetDir, 5.5, dt);
      dirLight.color.setHex(isDay ? biome.daySunColor : biome.nightMoonLight);
      moonMat.color.setHex(isDay ? 0xfff3b0 : 0xfda4af);
      moonHaloMat.color.setHex(isDay ? 0xfbbf24 : 0xf43f5e);
      starInst.visible = !isDay;
      starMat.opacity = isDay ? 0 : 0.78 + Math.sin(elapsedTotal * 3) * 0.18;
      cloudGroup.visible = isDay;
      if (isDay) {
        for (const cl of cloudClusters) {
          const a = cl.baseAngle + elapsedTotal * cl.speed;
          cl.mesh.position.set(
            Math.cos(a) * cl.radius,
            cl.height + Math.sin(elapsedTotal * 0.6 + cl.baseAngle) * 0.35,
            Math.sin(a) * cl.radius
          );
          cl.mesh.lookAt(0, cl.height, 0);
        }
      }
      winMat.color.setHex(isDay ? 0x93c5fd : 0xfbbf24);
      lampGlowMat.color.setHex(isDay ? 0xfffbeb : 0xfde047);

      // Campfire Voting Abstention Ring Pulse
      const isVotingPhase = st.phase === 'day_voting' && !st.isTitleScreen;
      const isAbstaining = st.selectedTargetId === CAMPFIRE_ABSTAIN_ID;
      campfireVoteRingMat.color.setHex(
        isAbstaining ? 0x22c55e : st.hoveredCampfire ? 0xfef08a : 0xf59e0b
      );
      campfireVoteRingMat.opacity = isVotingPhase
        ? isAbstaining || st.hoveredCampfire
          ? 0.92
          : 0.42 + Math.sin(elapsedTotal * 4.5) * 0.18
        : 0.18;

      // Rotate Windmill Sails & Flicker Campfire
      windmillBlades.rotation.z += simDt * 0.55;
      const flicker = Math.sin(elapsedTotal * 11) * 0.12 + Math.cos(elapsedTotal * 17) * 0.08;
      const fireScale = isDay && !st.isTitleScreen ? 0.62 : 1.02;
      flameOuter.scale.set(
        fireScale * (1 + flicker * 0.4),
        fireScale * (1 + flicker),
        fireScale * (1 + flicker * 0.4)
      );
      flameInner.scale.set(
        fireScale * (1 - flicker * 0.3),
        fireScale * (1 + flicker * 1.2),
        fireScale * (1 - flicker * 0.3)
      );
      brazierFlame.scale.set(
        fireScale * (1 + flicker * 0.35),
        fireScale * (1 + flicker * 0.9),
        fireScale * (1 + flicker * 0.35)
      );
      fireLight.intensity =
        (isDay && !st.isTitleScreen ? 2.0 : isNightBlindfolded ? 1.1 : 7.4) +
        flicker * (isDay && !st.isTitleScreen ? 0.8 : 3.6);
      runeOrb.rotation.y += simDt * 1.4;
      runeOrb.position.y = 3.82 + Math.sin(elapsedTotal * 2.5) * 0.12;

      // Biome-Specific Ambient Particles (Snow falls in frostpeak, leaves drift in autumn, embers rise in forest!)
      const isSnow = st.mapBiome === 'frostpeak';
      const isAutumn = st.mapBiome === 'autumn';
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const p = particleData[i];
        if (isSnow || isAutumn) {
          p.y -= (isSnow ? 1.15 : 0.85) * p.vy * simDt;
          if (p.y < 0.15) {
            p.y = 8.5 + (i % 4) * 1.2;
            p.x = (Math.random() - 0.5) * 18;
            p.z = (Math.random() - 0.5) * 18;
          }
          const swayX = Math.sin(elapsedTotal * 1.8 + p.phase) * (isAutumn ? 0.75 : 0.38);
          const swayZ = Math.cos(elapsedTotal * 1.4 + p.phase) * (isAutumn ? 0.65 : 0.35);
          _dummyObj.position.set(p.x + swayX, p.y, p.z + swayZ);
          _dummyObj.rotation.set(elapsedTotal + p.phase, elapsedTotal * 1.4, p.phase);
          _dummyObj.scale.set(isAutumn ? 1.6 : 1.0, isAutumn ? 0.35 : 1.0, isAutumn ? 1.2 : 1.0);
        } else {
          p.y += p.vy * simDt;
          if (p.y > 4.8) {
            p.y = 0.3;
            p.x = (Math.random() - 0.5) * 1.4;
            p.z = (Math.random() - 0.5) * 1.4;
          }
          const sway = Math.sin(elapsedTotal * 2.5 + p.phase) * 0.22;
          const s = Math.max(0.15, 1 - p.y / 4.8);
          _dummyObj.position.set(p.x + sway, p.y, p.z + sway);
          _dummyObj.rotation.set(0, 0, 0);
          _dummyObj.scale.set(s, s, s);
        }
        _dummyObj.updateMatrix();
        particleInst.setMatrixAt(i, _dummyObj.matrix);
      }
      particleInst.instanceMatrix.needsUpdate = true;

      // Trigger New 3D Agrou Campfire Emotes
      for (const emEv of st.emoteEvents) {
        if (!processedEmotesRef.current.has(emEv.id)) {
          processedEmotesRef.current.add(emEv.id);
          const seatIdx = activePlayers.findIndex((p) => p.id === emEv.playerId);
          if (seatIdx !== -1 && seats[seatIdx]) {
            seats[seatIdx].emoteType = emEv.emote;
            seats[seatIdx].emoteTimer = 3.6;
          }
        }
      }

      // Spawn New Detailed Composite 3D Thrown Prop Projectiles
      for (const propEv of st.thrownProps) {
        if (!processedPropsRef.current.has(propEv.id)) {
          processedPropsRef.current.add(propEv.id);
          const fromIdx = activePlayers.findIndex((p) => p.id === propEv.fromId);
          const toIdx = activePlayers.findIndex((p) => p.id === propEv.toId);
          if (fromIdx !== -1 && toIdx !== -1 && seats[fromIdx] && seats[toIdx]) {
            seats[fromIdx].throwAnimTimer = 0.45;
            if (propEv.fromId === st.userPlayerId) {
              st.fpvThrowSwingTimer = 0.42;
            }
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

      // Compute WASD / Mobile Virtual D-Pad Input for Open-World Night Movement, Ghost Flight, or First-Person Roaming
      const viewportAspect =
        container && container.clientHeight > 0
          ? container.clientWidth / container.clientHeight
          : window.innerWidth / Math.max(1, window.innerHeight);
      const responsiveFraming = computeResponsiveCameraFraming({
        aspect: viewportAspect,
        baseFov: 46,
      });
      const isFirstPerson = !st.isTitleScreen && st.cameraPreset === 'first_person';
      const targetFov = isFirstPerson ? 62 : responsiveFraming.targetFov;
      if (Math.abs(camera.fov - targetFov) > 0.05) {
        camera.fov = THREE.MathUtils.damp(camera.fov, targetFov, 10, dt);
        camera.updateProjectionMatrix();
      }

      let turnInput = st.fpvLookTurnRate || 0;
      if (st.keysPressed.has('KeyQ')) turnInput -= 1;
      if (st.keysPressed.has('KeyE')) turnInput += 1;
      if (Math.abs(turnInput) > 0.01) {
        if (isFirstPerson) {
          st.fpvYaw -= turnInput * 2.1 * dt;
        } else {
          st.azimuthAngle -= turnInput * 1.8 * dt;
        }
      }

      let inputX = st.moveVector.x;
      let inputZ = st.moveVector.z;
      if (st.keysPressed.has('KeyW') || st.keysPressed.has('ArrowUp')) inputZ -= 1;
      if (st.keysPressed.has('KeyS') || st.keysPressed.has('ArrowDown')) inputZ += 1;
      if (st.keysPressed.has('KeyA') || st.keysPressed.has('ArrowLeft')) inputX -= 1;
      if (st.keysPressed.has('KeyD') || st.keysPressed.has('ArrowRight')) inputX += 1;

      const hasMoveInput = Math.hypot(inputX, inputZ) > 0.05;
      const canUserRoamAlive =
        !st.isTitleScreen &&
        Boolean(me?.isAlive) &&
        ((st.phase === 'night' && st.isPlayerAwakeAtNight) ||
          (isFirstPerson && !isNightBlindfolded));
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
            if (isFirstPerson) {
              const step = computeFpvMovementStep({
                yaw: st.fpvYaw,
                inputX,
                inputZ,
                speed: 5.8,
                dt: simDt,
                currentX: seat.currentPos.x,
                currentZ: seat.currentPos.z,
                maxRadius: 9.5,
              });
              seat.currentPos.x = step.nextX;
              seat.currentPos.z = step.nextZ;
              seat.bodyGroup.rotation.y =
                Math.atan2(step.moveWorldX, step.moveWorldZ) - seat.group.rotation.y;
            } else {
              const cosA = Math.cos(st.azimuthAngle);
              const sinA = Math.sin(st.azimuthAngle);
              const moveWorldX = inputX * cosA + inputZ * sinA;
              const moveWorldZ = -inputX * sinA + inputZ * cosA;
              const speed = 5.8 * simDt;
              seat.currentPos.x = Math.max(-9.5, Math.min(9.5, seat.currentPos.x + moveWorldX * speed));
              seat.currentPos.z = Math.max(-9.5, Math.min(9.5, seat.currentPos.z + moveWorldZ * speed));
              seat.bodyGroup.rotation.y = Math.atan2(moveWorldX, moveWorldZ) - seat.group.rotation.y;
            }

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

        // Hide own 3rd-person body mesh in First-Person View so camera is unobstructed
        seat.bodyGroup.visible = !(isMe && isFirstPerson);

        // Sync Custom Agrou Hat, Cloak Color & Floating Golden Mayor Crown
        const fallbackCosm = getBotCosmetics(i);
        const activeHat: AgrouHatId = p.hat ?? fallbackCosm.hat;
        (Object.keys(seat.hatVariants) as AgrouHatId[]).forEach((hk) => {
          seat.hatVariants[hk].visible = hk === activeHat;
        });
        seat.cloakMat.color.setHex(p.cloakColor ?? fallbackCosm.cloakColor);

        const isMayor = Boolean(st.mayorId && p.id === st.mayorId && p.isAlive);
        seat.mayorCrownGroup.visible = isMayor;
        if (isMayor) {
          seat.mayorCrownGroup.rotation.y += simDt * 1.9;
          seat.mayorCrownGroup.position.y = 1.94 + Math.sin(elapsedTotal * 3.5) * 0.04;
        }

        const targetKo = p.isAlive ? 0 : 1;
        seat.koProgress = THREE.MathUtils.damp(seat.koProgress, targetKo, 6, dt);
        seat.bodyGroup.rotation.x = -seat.koProgress * 1.25;
        seat.bodyGroup.position.y = 0.34 - seat.koProgress * 0.15;
        seat.tombstoneGroup.visible = !p.isAlive && !(isMe && isFirstPerson);
        seat.lanternMat.emissiveIntensity = p.isAlive ? (isNightBlindfolded ? 0.15 : 1.5) : 0.05;

        if (seat.reactionTimer > 0 && p.isAlive) {
          seat.reactionTimer = Math.max(0, seat.reactionTimer - simDt);
        } else if (!p.isAlive) {
          seat.reactionTimer = 0;
        }

        if (seat.emoteTimer > 0 && p.isAlive) {
          seat.emoteTimer = Math.max(0, seat.emoteTimer - simDt);
          if (seat.emoteTimer === 0) seat.emoteType = null;
        } else if (!p.isAlive) {
          seat.emoteTimer = 0;
          seat.emoteType = null;
        }

        const isAngryReacting = seat.reactionTimer > 0 && seat.reactionType === 'angry' && p.isAlive;
        const isHappyDancing =
          seat.reactionTimer > 0 && seat.reactionType === 'happy_dance' && p.isAlive;
        const activeEmote = seat.emoteTimer > 0 && p.isAlive ? seat.emoteType : null;

        seat.angerAuraGroup.visible = isAngryReacting;
        seat.happyAuraGroup.visible = isHappyDancing;

        if (isAngryReacting) {
          const stomp = Math.abs(Math.sin(elapsedTotal * 22)) * 0.24;
          seat.bodyGroup.position.y = 0.34 + stomp;
          seat.bodyGroup.rotation.z = Math.sin(elapsedTotal * 32) * 0.28;
          seat.bodyGroup.rotation.y = Math.sin(elapsedTotal * 20) * 0.45;
          seat.angerAuraGroup.rotation.y += simDt * 4.5;
          const pulseScale = 1 + Math.sin(elapsedTotal * 18) * 0.22;
          seat.angerAuraGroup.scale.setScalar(pulseScale);
        } else if (isHappyDancing) {
          const danceJump = Math.abs(Math.sin(elapsedTotal * 11)) * 0.36;
          seat.bodyGroup.position.y = 0.34 + danceJump;
          seat.bodyGroup.rotation.z = Math.sin(elapsedTotal * 11) * 0.22;
          seat.bodyGroup.rotation.y = Math.sin(elapsedTotal * 7.5) * 1.35;
          seat.happyAuraGroup.rotation.y += simDt * 3.6;
          seat.happyAuraGroup.position.y = 1.82 + Math.sin(elapsedTotal * 10) * 0.12;
        } else if (activeEmote === 'dance') {
          seat.bodyGroup.position.y = 0.34 + Math.abs(Math.sin(elapsedTotal * 10)) * 0.28;
          seat.bodyGroup.rotation.y = Math.sin(elapsedTotal * 6) * 0.95;
          seat.bodyGroup.rotation.z = Math.sin(elapsedTotal * 10) * 0.18;
        } else if (activeEmote === 'laugh') {
          seat.bodyGroup.rotation.x = -0.22 + Math.sin(elapsedTotal * 18) * 0.1;
          seat.bodyGroup.position.y = 0.34 + Math.abs(Math.sin(elapsedTotal * 14)) * 0.12;
          seat.bodyGroup.rotation.z = 0;
        } else if (activeEmote === 'panic') {
          seat.bodyGroup.rotation.z = Math.sin(elapsedTotal * 34) * 0.22;
          seat.bodyGroup.position.y = 0.34 + Math.abs(Math.sin(elapsedTotal * 20)) * 0.16;
        } else if (activeEmote === 'accuse') {
          seat.bodyGroup.rotation.x = 0.18;
          seat.bodyGroup.rotation.z = 0;
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
        } else if (isAngryReacting || activeEmote === 'panic') {
          seat.leftArm.rotation.x = -2.35 + Math.sin(elapsedTotal * 26) * 0.75;
          seat.rightArm.rotation.x = -2.35 - Math.sin(elapsedTotal * 26) * 0.75;
          seat.leftArm.rotation.z = 0.45;
          seat.rightArm.rotation.z = -0.45;
        } else if (isHappyDancing || activeEmote === 'dance') {
          seat.leftArm.rotation.x = -2.45 + Math.sin(elapsedTotal * 12) * 0.55;
          seat.rightArm.rotation.x = -2.45 - Math.sin(elapsedTotal * 12) * 0.55;
          seat.leftArm.rotation.z = 0.5 + Math.sin(elapsedTotal * 12) * 0.25;
          seat.rightArm.rotation.z = -0.5 - Math.sin(elapsedTotal * 12) * 0.25;
        } else if (activeEmote === 'wave') {
          seat.rightArm.rotation.x = -2.6;
          seat.rightArm.rotation.z = -0.45 + Math.sin(elapsedTotal * 14) * 0.48;
          seat.leftArm.rotation.x = 0;
          seat.leftArm.rotation.z = 0.18;
        } else if (activeEmote === 'accuse') {
          seat.rightArm.rotation.x = -1.55;
          seat.rightArm.rotation.z = -0.05;
          seat.leftArm.rotation.x = 0.25;
          seat.leftArm.rotation.z = 0.25;
        } else if (activeEmote === 'clap') {
          seat.leftArm.rotation.x = -1.1;
          seat.rightArm.rotation.x = -1.1;
          const clapAmt = Math.abs(Math.sin(elapsedTotal * 16)) * 0.42;
          seat.leftArm.rotation.z = -0.35 + clapAmt;
          seat.rightArm.rotation.z = 0.35 - clapAmt;
        } else if (activeEmote === 'laugh') {
          seat.leftArm.rotation.x = -0.65 + Math.sin(elapsedTotal * 16) * 0.2;
          seat.rightArm.rotation.x = -0.65 - Math.sin(elapsedTotal * 16) * 0.2;
          seat.leftArm.rotation.z = 0.35;
          seat.rightArm.rotation.z = -0.35;
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
          seat.ghostGroup.visible = !(isMe && isFirstPerson);
          if (isMe && isUserGhost && (hasMoveInput || st.dashTargetPos)) {
            if (hasMoveInput) {
              st.dashTargetPos = null;
              if (isFirstPerson) {
                const gStep = computeFpvMovementStep({
                  yaw: st.fpvYaw,
                  inputX,
                  inputZ,
                  speed: 7.2,
                  dt: simDt,
                  currentX: seat.ghostPos.x,
                  currentZ: seat.ghostPos.z,
                  maxRadius: 11,
                });
                seat.ghostPos.x = gStep.nextX;
                seat.ghostPos.z = gStep.nextZ;
                seat.ghostGroup.rotation.y = Math.atan2(gStep.moveWorldX, gStep.moveWorldZ);
              } else {
                const cosA = Math.cos(st.azimuthAngle);
                const sinA = Math.sin(st.azimuthAngle);
                const moveWorldX = inputX * cosA + inputZ * sinA;
                const moveWorldZ = -inputX * sinA + inputZ * cosA;
                const ghostSpeed = 7.2 * simDt;
                seat.ghostPos.x = Math.max(-11, Math.min(11, seat.ghostPos.x + moveWorldX * ghostSpeed));
                seat.ghostPos.z = Math.max(-11, Math.min(11, seat.ghostPos.z + moveWorldZ * ghostSpeed));
                seat.ghostGroup.rotation.y = Math.atan2(moveWorldX, moveWorldZ);
              }
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
        const isHovered =
          st.hoveredPlayerId === p.id || (isFirstPerson && st.aimedPlayerId === p.id);

        if (isSelected) {
          seat.haloMat.color.setHex(0xe86f24);
          seat.haloMat.opacity = 0.95;
        } else if (isHovered) {
          seat.haloMat.color.setHex(0xfbbf24);
          seat.haloMat.opacity = 0.88;
        } else if (isMayor) {
          seat.haloMat.color.setHex(0xf59e0b);
          seat.haloMat.opacity = 0.72;
        } else if (isMe) {
          seat.haloMat.color.setHex(0x38bdf8);
          seat.haloMat.opacity = 0.65;
        } else if (!p.isAlive) {
          seat.haloMat.color.setHex(0x64748b);
          seat.haloMat.opacity = 0.2;
        } else {
          seat.haloMat.color.setHex(0xd6bfa2);
          seat.haloMat.opacity = 0.25;
        }
      }

      // Render Flowing 3D Vote/Accusation Arcs during Day Voting!
      if (isVotingPhase && st.votes.length > 0) {
        voteArcInst.visible = true;
        let beadCursor = 0;
        const latestByVoter = new Map<string, string>();
        for (const v of st.votes) {
          if (v.voterId && v.targetId) latestByVoter.set(v.voterId, v.targetId);
        }
        let arcIdx = 0;
        for (const [voterId, targetId] of latestByVoter.entries()) {
          if (arcIdx >= MAX_VOTE_ARCS) break;
          const vSeatIdx = activePlayers.findIndex((p) => p.id === voterId);
          if (vSeatIdx === -1 || !seats[vSeatIdx]) continue;
          const fromPos = seats[vSeatIdx].currentPos;
          const isAbstainArc = targetId === CAMPFIRE_ABSTAIN_ID;
          const tSeatIdx = isAbstainArc
            ? -1
            : activePlayers.findIndex((p) => p.id === targetId);
          if (!isAbstainArc && (tSeatIdx === -1 || !seats[tSeatIdx])) continue;

          const toX = isAbstainArc ? 0 : seats[tSeatIdx].currentPos.x;
          const toZ = isAbstainArc ? 0 : seats[tSeatIdx].currentPos.z;
          const isMayorVote = Boolean(st.mayorId && voterId === st.mayorId);
          _scratchColor.setHex(
            isAbstainArc ? 0xfbbf24 : isMayorVote ? 0xf59e0b : 0xf43f5e
          );

          for (let b = 0; b < VOTE_BEADS_PER_ARC; b++) {
            const tFlow = ((b / VOTE_BEADS_PER_ARC) + elapsedTotal * 0.55) % 1;
            const bx = THREE.MathUtils.lerp(fromPos.x, toX, tFlow);
            const bz = THREE.MathUtils.lerp(fromPos.z, toZ, tFlow);
            const by = 1.45 + Math.sin(tFlow * Math.PI) * (isAbstainArc ? 1.45 : 2.35);
            const bScale = (isMayorVote ? 1.35 : 1.0) * (0.6 + Math.sin(tFlow * Math.PI) * 0.55);
            _dummyObj.position.set(bx, by, bz);
            _dummyObj.scale.setScalar(bScale);
            _dummyObj.rotation.set(elapsedTotal * 3, elapsedTotal * 2, 0);
            _dummyObj.updateMatrix();
            voteArcInst.setMatrixAt(beadCursor, _dummyObj.matrix);
            voteArcInst.setColorAt(beadCursor, _scratchColor);
            beadCursor++;
          }
          arcIdx++;
        }
        // Park unused beads at scale 0
        _dummyObj.scale.setScalar(0);
        _dummyObj.updateMatrix();
        for (let rem = beadCursor; rem < MAX_VOTE_ARCS * VOTE_BEADS_PER_ARC; rem++) {
          voteArcInst.setMatrixAt(rem, _dummyObj.matrix);
        }
        voteArcInst.instanceMatrix.needsUpdate = true;
        if (voteArcInst.instanceColor) voteArcInst.instanceColor.needsUpdate = true;
      } else {
        voteArcInst.visible = false;
      }

      // Camera Choreography: 360° Third-Person Presets vs First-Person Eye-Level Rig
      const portraitDistMultiplier = responsiveFraming.distMultiplier;

      if (st.isTitleScreen) {
        fpvRigGroup.visible = false;
        st.aimedPlayerId = null;
        const tourAngle = elapsedTotal * 0.22;
        const titleRadius = 13.5 * portraitDistMultiplier;
        _targetCamPos.set(
          Math.sin(tourAngle) * titleRadius,
          (6.8 + Math.sin(elapsedTotal * 0.5) * 1.2) * portraitDistMultiplier,
          Math.cos(tourAngle) * titleRadius
        );
        _targetLookAt.set(0, 1.2, 0);
      } else if (isFirstPerson) {
        const mySeatIdx = Math.max(
          0,
          activePlayers.findIndex((p) => p.id === st.userPlayerId)
        );
        const mySeat = seats[mySeatIdx] || seats[0];
        const fpvPose = computeFpvCameraPose({
          charPos: isUserGhost ? mySeat.ghostPos : mySeat.currentPos,
          isGhost: isUserGhost,
          yaw: st.fpvYaw,
          pitch: st.fpvPitch,
          elapsedSec: elapsedTotal,
          isMoving: hasMoveInput,
        });
        _targetCamPos.set(fpvPose.eyePos.x, fpvPose.eyePos.y, fpvPose.eyePos.z);
        _targetLookAt.set(fpvPose.lookTarget.x, fpvPose.lookTarget.y, fpvPose.lookTarget.z);

        // Animate 3D First-Person Hands, Lantern & Equipped Prop
        fpvRigGroup.visible = !isNightBlindfolded;
        const handBobFreq = hasMoveInput ? 11.5 : 2.6;
        const handBobAmp = hasMoveInput ? 0.024 : 0.007;
        fpvLeftHandGroup.position.y = -0.19 + Math.sin(elapsedTotal * handBobFreq) * handBobAmp;
        fpvLeftHandGroup.position.x = -0.26 + Math.cos(elapsedTotal * handBobFreq * 0.5) * handBobAmp;

        if (st.fpvThrowSwingTimer > 0) {
          st.fpvThrowSwingTimer = Math.max(0, st.fpvThrowSwingTimer - simDt);
        }
        const swingOffset =
          st.fpvThrowSwingTimer > 0 ? Math.sin(st.fpvThrowSwingTimer * Math.PI * 2.3) * 0.55 : 0;
        fpvRightHandGroup.position.y =
          -0.18 - Math.sin(elapsedTotal * handBobFreq) * handBobAmp + swingOffset * 0.15;
        fpvRightHandGroup.position.z = -0.53 - swingOffset * 0.25;
        fpvRightHandGroup.rotation.x = -swingOffset * 1.1;

        const isMeWolf = Boolean(me && (me.roleId === 'werewolf' || me.roleId === 'wolf_pup'));
        fpvClawsGroup.visible = isMeWolf && !st.activePropTool;
        fpvHeldTomato.visible = st.activePropTool === 'tomato';
        fpvHeldEgg.visible = st.activePropTool === 'egg';
        fpvHeldRose.visible = st.activePropTool === 'rose';
        fpvHeldWater.visible = st.activePropTool === 'water';

        // Crosshair Ray Alignment Detection against Villagers
        const candidates = [];
        for (let idx = 0; idx < count; idx++) {
          const p = activePlayers[idx];
          const s = seats[idx];
          if (!p || !s || !s.group.visible) continue;
          candidates.push({
            playerId: p.id,
            pos: {
              x: s.currentPos.x,
              y: p.isAlive ? 1.25 : 0.9,
              z: s.currentPos.z,
            },
            visible: s.group.visible,
          });
        }
        st.aimedPlayerId = findFpvCrosshairTarget({
          eyePos: fpvPose.eyePos,
          forward: fpvPose.forward,
          candidates,
          selfPlayerId: st.userPlayerId,
        });
      } else {
        fpvRigGroup.visible = false;
        st.aimedPlayerId = null;
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

        const focusId = st.hoveredPlayerId || st.selectedTargetId;
        if (focusId && !st.isTitleScreen && !st.isDraggingOrbit) {
          const focusSeat = seats.find((s) => s.playerId === focusId);
          if (focusSeat && focusSeat.group.visible) {
            _targetLookAt.lerp(focusSeat.worldPos, 0.18);
          }
        }
      }

      if (st.aimedPlayerId !== st.lastReportedAimedId) {
        st.lastReportedAimedId = st.aimedPlayerId;
        st.onAimedPlayerChange?.(st.aimedPlayerId);
      }

      if (st.snapCameraImmediate) {
        st.snapCameraImmediate = false;
        camera.position.copy(_targetCamPos);
        _currentLookAt.copy(_targetLookAt);
        camera.fov = targetFov;
        camera.updateProjectionMatrix();
      } else {
        const dampFactor = 1 - Math.exp((isFirstPerson ? -18 : -4.8) * dt);
        camera.position.lerp(_targetCamPos, dampFactor);
        _currentLookAt.lerp(_targetLookAt, dampFactor);
      }

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

          const isMeLabel = seat.playerId === st.userPlayerId;
          if (
            !seat.group.visible ||
            st.isTitleScreen ||
            isNightBlindfolded ||
            (isFirstPerson && isMeLabel)
          ) {
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

        // Project Central Campfire Abstain Hint during Day Voting
        const cfEl = campfireLabelRef.current;
        if (cfEl) {
          if (isVotingPhase) {
            _projVec.set(0, 2.35, 0).project(camera);
            if (_projVec.z >= -1 && _projVec.z <= 1) {
              const sx = (_projVec.x + 1) * 0.5 * cW;
              const sy = (-_projVec.y + 1) * 0.5 * cH;
              cfEl.style.display = 'flex';
              cfEl.style.transform = `translate3d(${Math.round(sx)}px, ${Math.round(sy)}px, 0) translate(-50%, -100%)`;
            } else {
              cfEl.style.display = 'none';
            }
          } else {
            cfEl.style.display = 'none';
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
  const abstainVotesCount = votesMap[CAMPFIRE_ABSTAIN_ID] || 0;

  return (
    <div className="fixed inset-0 z-0 overflow-hidden select-none bg-[#15100c]">
      {/* Isolated WebGL Canvas Container */}
      <div
        ref={mountRef}
        data-testid="village-3d-canvas"
        className="w-full h-full touch-none"
      />

      {/* World-Projected 3D Character Floating Nameplates (Agrou Warm Wood & Parchment Style) */}
      <div
        ref={labelContainerRef}
        className="fixed inset-0 pointer-events-none overflow-hidden z-10"
      >
        {/* Central Campfire Abstention Vote Indicator (Visible during Day Voting) */}
        <div
          ref={campfireLabelRef}
          style={{ display: 'none', left: 0, top: 0 }}
          className="absolute flex-col items-center pointer-events-none"
        >
          <div
            className={`px-2.5 py-1 rounded-xl border text-center shadow-lg ${
              selectedTargetId === CAMPFIRE_ABSTAIN_ID
                ? 'bg-[#1c3621]/95 border-[#6ee7b7] text-[#ecfdf5]'
                : 'bg-[#2a1c12]/92 border-[#e89c3e] text-[#fde7c3]'
            }`}
          >
            <div className="text-[10px] font-black whitespace-nowrap flex items-center gap-1">
              <span>🔥</span>
              <span>
                {lang === 'vi' ? 'Lửa Trại · Phiếu Trắng' : 'Campfire · Abstain'}
              </span>
              {abstainVotesCount > 0 && (
                <span className="px-1.5 py-0.2 rounded bg-[#e86f24] text-[#fff8ed] font-mono text-[9px]">
                  {abstainVotesCount}
                </span>
              )}
            </div>
          </div>
        </div>

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
          const isMayor = Boolean(mayorId && p.id === mayorId && p.isAlive);
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

          const recentEmote = [...emoteEvents]
            .reverse()
            .find((ev) => ev.playerId === p.id && nowRender - ev.timestamp < 4200);
          const emoteMeta = recentEmote
            ? AGROU_EMOTES.find((e) => e.id === recentEmote.emote)
            : null;

          return (
            <div
              key={p.id}
              ref={(el) => {
                labelElsRef.current[idx] = el;
              }}
              style={{ display: 'none', left: 0, top: 0 }}
              className="absolute flex flex-col items-center gap-0.5 transition-opacity duration-150"
            >
              {/* Agrou Campfire Comic Emote Bubble */}
              {emoteMeta && !propStyle && (
                <div
                  data-testid="character-emote-bubble"
                  className="px-2 py-0.5 rounded-xl bg-[#f5ead4] border border-[#8d6134] text-[#2c1a0e] shadow-lg text-[10px] font-extrabold whitespace-nowrap"
                >
                  {emoteMeta.bubble[lang]}
                </div>
              )}

              {/* Thrown Prop Impact + Character Emotional Reaction Badge */}
              {propStyle && propReaction && (
                <div
                  data-testid="character-prop-reaction"
                  data-emotion={propReaction.emotion}
                  className={`px-2 py-0.5 rounded-xl border shadow-xl flex items-center justify-center text-center animate-bounce ${
                    propReaction.emotion === 'happy_dance'
                      ? 'bg-[#4f1930] border-[#f472b6] text-[#fce7f3]'
                      : 'bg-[#4f1814] border-[#f87171] text-[#fee2e2]'
                  }`}
                >
                  <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-amber-200 whitespace-nowrap">
                    {propStyle.icon} {propReaction.badgeText[lang]}
                  </span>
                </div>
              )}

              {/* Vote Count + Voters Tag */}
              {voteCount > 0 && (
                <div className="px-1.5 py-0.5 rounded-lg bg-[#b91c1c] text-white text-[9px] sm:text-[10px] font-extrabold shadow-lg border border-[#fca5a5] leading-tight text-center max-w-[175px]">
                  <div className="font-mono leading-none">
                    {voteCount} {t.votesUnit}
                  </div>
                  {votersByTarget?.[p.id] && votersByTarget[p.id].length > 0 && (
                    <div className="text-[8px] font-sans font-semibold text-amber-100 truncate mt-0.5">
                      ← {votersByTarget[p.id].slice(0, 3).join(', ')}
                      {votersByTarget[p.id].length > 3
                        ? ` +${votersByTarget[p.id].length - 3}`
                        : ''}
                    </div>
                  )}
                </div>
              )}

              {/* Ghost Soul Indicator if dead */}
              {!p.isAlive && (
                <div className="px-1.5 py-0.5 rounded-lg bg-[#0d2838] border border-[#67e8f9]/60 text-[#cffafe] font-bold text-[8px] sm:text-[9px] shadow leading-none">
                  {t.ghostFloatingBadge}
                </div>
              )}

              {/* Warm Carved-Wood Agrou Nameplate */}
              <div
                className={`px-2 py-0.5 rounded-lg border text-center shadow-lg ${
                  !p.isAlive
                    ? 'bg-[#1a1614]/88 border-[#67e8f9]/45 text-[#a5f3fc]/80'
                    : isSelected
                    ? 'bg-[#5c1d16]/95 border-[#f97316] text-[#fff7ed] scale-105'
                    : isMayor
                    ? 'bg-[#362312]/95 border-[#f5b82e] text-[#fef3c7]'
                    : isMe
                    ? 'bg-[#1b2d3c]/95 border-[#60a5fa] text-[#eff6ff]'
                    : 'bg-[#261a12]/90 border-[#9c7248]/65 text-[#f6ebd8]'
                }`}
              >
                <div className="flex items-center gap-0.5 sm:gap-1 text-[9px] sm:text-[11px] font-bold whitespace-nowrap leading-tight">
                  {isMayor && <span title="Mayor">👑</span>}
                  <span className="text-[#f5b82e] font-mono">#{idx + 1}</span>
                  <span className="max-w-[66px] sm:max-w-none truncate">{p.name}</span>
                  {isMe && <span className="text-[#7dd3fc] hidden sm:inline">{t.youSuffix}</span>}
                  {isSpeaking && <span className="text-[#4ade80]">🔊</span>}
                </div>
                {showRole && (
                  <div className="text-[8px] sm:text-[9px] font-mono text-[#fcd34d] font-semibold leading-tight">
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
