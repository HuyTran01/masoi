import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Village2DFallback } from './Village2DFallback';
import {
  Player,
  Phase,
  ThrownPropEvent,
  PropType,
  Language,
  VoteRecord,
  NightDeathCinematicState,
  NightSkillCutsceneEvent,
} from '../types/game';
import { ROLES } from '../game/roles';
import { UI_TEXT } from '../utils/i18n';
import { sound, PROP_REACTION_META } from '../utils/sound';
import {
  AGROU_BIOMES,
  AGROU_EMOTES,
  AgrouEmoteEvent,
  AgrouHatId,
  AgrouMapBiome,
  CAMPFIRE_ABSTAIN_ID,
  getBotCosmetics,
} from '../game/agrouMechanics';
import {
  CameraViewPreset,
  EnvObstacle,
  computeCampfireCircleRadius,
  computeDefaultFpvYawFromSeatAngle,
  computeFpvYawTowardOrigin,
  computeCameraViewRay,
  clampAndSlideCampfireCollision,
  clampFpvPitch,
  computeFpvCameraPose,
  computeThirdPersonCameraPose,
  computeFpvMovementStep,
  computeResponsiveCameraFraming,
  findFpvCrosshairTarget,
  isDirectLookCameraPreset,
  stepCharacterVerticalPhysics,
  stepGhostFreeFlight,
  computeBotGhostWanderStep,
  computeDragEdgePanRate,
  shouldApplyCameraLook,
  resolveObstaclesCollision,
  clampCameraRayAgainstObstacles,
  computeRiverWadingState,
} from '../game/fpvCamera';
import { buildAgrouEnvironment, sampleTerrainHeight } from './village3d/buildAgrouEnvironment';
import { buildAgrouAdventurerPool, applyAdventurerBodyPose } from './village3d/buildAgrouAdventurer';
import { createNightActionDirector } from './village3d/nightActionDirector';

type FootstepSurface = 'dirt' | 'grass' | 'snow' | 'water';

function getFootstepSurface(
  biome: AgrouMapBiome,
  x: number,
  z: number,
  groundY: number
): FootstepSurface {
  if (biome === 'autumn' && groundY < -0.26) return 'water';
  const r = Math.hypot(x, z);
  if (biome === 'frostpeak' && r >= 11.4) return 'snow';
  if (biome !== 'frostpeak' && r >= 11.4) return 'grass';
  return 'dirt';
}

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
  deathCinematic?: NightDeathCinematicState | null;
  activeNightScene?: NightSkillCutsceneEvent | null;
  wakingActorIds?: string[];
  returnToSeatTrigger?: number;
  returnToSeatSeq?: number;
  jumpTriggerSeq?: number;
  ghostVerticalRate?: number;
  allowTitleOrbit?: boolean;
  isUiOverlayOpen?: boolean;
  onPointerLockChange?: (locked: boolean) => void;
  onFreeLookChange?: (active: boolean) => void;
  onAimedPlayerChange?: (playerId: string | null) => void;
  onAimedCampfireChange?: (aimed: boolean) => void;
  onAimedOwnSeatChange?: (aimed: boolean) => void;
  onRoamingStateChange?: (isRoaming: boolean) => void;
  onReturnToSeat?: () => void;
  onSelectPlayer: (playerId: string) => void;
  onVoteCampfireAbstain?: () => void;
  onSelectCampfire?: () => void;
}

interface ActiveProjectile3D {
  id: string;
  group: THREE.Group;
  trailGroup: THREE.Group;
  trailParticles: THREE.Mesh[];
  startPos: THREE.Vector3;
  endPos: THREE.Vector3;
  targetSeatIndex: number;
  propType: PropType;
  progress: number;
  flightDuration: number;
  apexHeight: number;
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
  attachedParent: THREE.Object3D | null;
  targetSeatIndex: number;
  age: number;
  maxAge: number;
  propType: PropType;
}

const MAX_SEATS = 20;

// Pre-allocated math scratch objects outside render loop (Zero GC)
const _projVec = new THREE.Vector3();
const _targetCamPos = new THREE.Vector3();
const _targetLookAt = new THREE.Vector3();
const _currentLookAt = new THREE.Vector3(0, 1.25, -1.2);
const _dummyObj = new THREE.Object3D();
const _scratchColor = new THREE.Color();
const _ghostBaseTint = new THREE.Color(0x7ee8fa);
const _ghostEmissiveTint = new THREE.Color(0x22d3ee);
const _arcPos = new THREE.Vector3();
const _arcPrevPos = new THREE.Vector3();
const _velVec = new THREE.Vector3();
const _earPos = new THREE.Vector3();
const _earFwd = new THREE.Vector3();
const _earUp = new THREE.Vector3();
const _activeObstacles: EnvObstacle[] = [];
const _stoolObstaclePool: Array<{ kind: 'circle'; x: number; z: number; r: number }> = Array.from(
  { length: MAX_SEATS },
  () => ({ kind: 'circle', x: 0, z: 0, r: 0.52 })
);
const _vfxColor = new THREE.Color();

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
  votes = [],
  activeSpeakers,
  revealAllRoles,
  cameraPreset,
  activePropTool = null,
  fpvLookTurnRate = 0,
  mapBiome = 'forest',
  mayorId = null,
  emoteEvents = [],
  deathCinematic = null,
  activeNightScene = null,
  wakingActorIds = [],
  returnToSeatTrigger = 0,
  returnToSeatSeq = 0,
  jumpTriggerSeq = 0,
  ghostVerticalRate = 0,
  allowTitleOrbit = false,
  isUiOverlayOpen = false,
  onPointerLockChange,
  onFreeLookChange,
  onAimedPlayerChange,
  onAimedCampfireChange,
  onAimedOwnSeatChange,
  onRoamingStateChange,
  onReturnToSeat,
  onSelectPlayer,
  onVoteCampfireAbstain,
  onSelectCampfire,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const canvasElemRef = useRef<HTMLCanvasElement | null>(null);
  const labelContainerRef = useRef<HTMLDivElement>(null);
  const labelElsRef = useRef<(HTMLDivElement | null)[]>([]);
  const campfireLabelRef = useRef<HTMLDivElement | null>(null);
  const processedPropsRef = useRef<Set<string>>(new Set());
  const processedEmotesRef = useRef<Set<string>>(new Set());
  const [webglUnavailable, setWebglUnavailable] = useState(false);

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
    deathCinematic,
    activeNightScene,
    wakingActorIds,
    needsDawnReset: false,
    returnToSeatTrigger,
    returnToSeatSeq,
    jumpTriggerSeq,
    ghostVerticalRate,
    allowTitleOrbit,
    isUiOverlayOpen,
    onPointerLockChange,
    onFreeLookChange,
    onAimedPlayerChange,
    onAimedCampfireChange,
    onAimedOwnSeatChange,
    onRoamingStateChange,
    onReturnToSeat,
    onSelectPlayer,
    onVoteCampfireAbstain,
    onSelectCampfire,
    hoveredPlayerId: null as string | null,
    hoveredCampfire: false,
    hoveredOwnSeat: false,
    aimedPlayerId: null as string | null,
    lastReportedAimedId: null as string | null,
    aimedCampfire: false,
    lastReportedAimedCampfire: false,
    aimedOwnSeat: false,
    lastReportedAimedOwnSeat: false,
    lastReportedRoaming: false,
    trauma: 0,
    hitstop: 0,
    // 360° Camera Orbit State (Lower cinematic Agrou angle!)
    azimuthAngle: 0,
    polarAngle: 0.41,
    cameraDist: 15.6,
    isDraggingOrbit: false,
    hasUserDraggedTitle: false,
    isPointerLocked: false,
    releasePointerLockFlag: false,
    // First-Person & Third-Person Direct-Look State
    fpvYaw: Math.PI,
    fpvPitch: -0.04,
    fpvThrowSwingTimer: 0,
    snapCameraImmediate: false,
    resetDirectLookAnchor: true,
    // Open-World Roaming, Jump/Sprint/Crouch & Mouse Gaze Tracking
    userRoamX: 0,
    userRoamZ: 5.65,
    isUserRoaming: false,
    dashTargetPos: null as THREE.Vector3 | null,
    jumpQueued: false,
    crouchToggled: false,
    mouseWorldLookPoint: new THREE.Vector3(0, 1.35, 0),
    hasMouseLook: false,
    deathCinematicElapsed: 0,
    // Active Keyboard WASD + Movement Modifiers state
    keysPressed: new Set<string>(),
  });

  useEffect(() => {
    const prevSelected = stateRef.current.selectedTargetId;
    const prevPhase = stateRef.current.phase;
    const prevPreset = stateRef.current.cameraPreset;
    const prevDeath = stateRef.current.deathCinematic;
    const prevReturnTrigger = stateRef.current.returnToSeatTrigger;
    const prevReturnSeq = stateRef.current.returnToSeatSeq;
    const prevJumpSeq = stateRef.current.jumpTriggerSeq;
    const prevFreeLook = stateRef.current.freeLook360;
    const prevUiOpen = stateRef.current.isUiOverlayOpen;
    const prevTitleScreen = stateRef.current.isTitleScreen;
    const prevAllowTitleOrbit = stateRef.current.allowTitleOrbit;
    const prevUserPlayerId = stateRef.current.userPlayerId;
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
      deathCinematic,
      activeNightScene,
      wakingActorIds,
      returnToSeatTrigger,
      returnToSeatSeq,
      jumpTriggerSeq,
      ghostVerticalRate,
      allowTitleOrbit,
      isUiOverlayOpen,
      onPointerLockChange,
      onFreeLookChange,
      onAimedPlayerChange,
      onAimedCampfireChange,
      onAimedOwnSeatChange,
      onRoamingStateChange,
      onReturnToSeat,
      onSelectPlayer,
      onVoteCampfireAbstain,
      onSelectCampfire,
    };

    if (
      (!freeLook360 && prevFreeLook) ||
      (isUiOverlayOpen && !prevUiOpen) ||
      isTitleScreen ||
      Boolean(deathCinematic)
    ) {
      stateRef.current.releasePointerLockFlag = true;
    }

    const canTitleOrbitNow = isTitleScreen && Boolean(allowTitleOrbit);
    if (isUiOverlayOpen && !prevUiOpen && !canTitleOrbitNow) {
      stateRef.current.keysPressed.clear();
      stateRef.current.isDraggingOrbit = false;
      if (canvasElemRef.current) {
        canvasElemRef.current.style.cursor = '';
      }
    }

    if (!allowTitleOrbit && prevAllowTitleOrbit) {
      stateRef.current.hasUserDraggedTitle = false;
      stateRef.current.isDraggingOrbit = false;
      if (canvasElemRef.current) {
        canvasElemRef.current.style.cursor = '';
      }
    }

    if (prevTitleScreen && !isTitleScreen) {
      stateRef.current.hasUserDraggedTitle = false;
      stateRef.current.azimuthAngle = 0;
      stateRef.current.polarAngle = 0.41;
      stateRef.current.cameraDist = 15.6;
    }

    if (deathCinematic && deathCinematic !== prevDeath) {
      stateRef.current.deathCinematicElapsed = 0;
      stateRef.current.trauma = Math.min(1, stateRef.current.trauma + 0.65);
    }

    if (cameraPreset !== prevPreset) {
      stateRef.current.snapCameraImmediate = true;
      if (cameraPreset === 'overhead') {
        stateRef.current.polarAngle = 1.12;
        stateRef.current.cameraDist = 18.2;
      } else if (cameraPreset === 'dramatic') {
        stateRef.current.polarAngle = 0.25;
        stateRef.current.cameraDist = 12.2;
      } else if (cameraPreset === 'campfire' || cameraPreset === 'orbit') {
        stateRef.current.polarAngle = 0.41;
        stateRef.current.cameraDist = 15.6;
      }
    }

    if (
      jumpTriggerSeq > 0 &&
      jumpTriggerSeq !== prevJumpSeq &&
      !isTitleScreen &&
      !isUiOverlayOpen &&
      phase === 'day_discussion'
    ) {
      const meP = players.find((p) => p.id === userPlayerId);
      if (meP?.isAlive) {
        stateRef.current.jumpQueued = true;
        stateRef.current.isUserRoaming = true;
      }
    }

    const triggeredReturnSeq =
      returnToSeatSeq > 0 &&
      returnToSeatSeq !== prevReturnSeq &&
      !isTitleScreen &&
      !isUiOverlayOpen;
    if (returnToSeatTrigger !== prevReturnTrigger || triggeredReturnSeq) {
      const meIdx = players.findIndex((p) => p.id === userPlayerId);
      const meP = meIdx !== -1 ? players[meIdx] : null;
      if (triggeredReturnSeq && meP && !meP.isAlive) {
        const count = Math.max(1, players.length);
        const circleR = computeCampfireCircleRadius(count);
        const seatAngle = Math.PI / 2 + (meIdx / count) * Math.PI * 2;
        stateRef.current.dashTargetPos = new THREE.Vector3(
          Math.cos(seatAngle) * circleR,
          0,
          Math.sin(seatAngle) * circleR
        );
      } else {
        stateRef.current.isUserRoaming = false;
        stateRef.current.dashTargetPos = null;
        stateRef.current.crouchToggled = false;
        if (isDirectLookCameraPreset(cameraPreset)) {
          stateRef.current.resetDirectLookAnchor = true;
        }
      }
    }

    if (
      isDirectLookCameraPreset(cameraPreset) &&
      (!isDirectLookCameraPreset(prevPreset) ||
        userPlayerId !== prevUserPlayerId ||
        (prevTitleScreen && !isTitleScreen))
    ) {
      const meIdx = Math.max(0, players.findIndex((p) => p.id === userPlayerId));
      const count = Math.max(1, players.length);
      const seatAngle = Math.PI / 2 + (meIdx / count) * Math.PI * 2;
      stateRef.current.fpvYaw = computeDefaultFpvYawFromSeatAngle(seatAngle);
      stateRef.current.fpvPitch = cameraPreset === 'third_person' ? -0.1 : -0.04;
      stateRef.current.resetDirectLookAnchor = true;
      stateRef.current.snapCameraImmediate = true;
    }

    if (phase !== prevPhase || isTitleScreen) {
      stateRef.current.isUserRoaming = false;
      stateRef.current.dashTargetPos = null;
      stateRef.current.crouchToggled = false;
      if (prevPhase === 'night' && phase === 'day_discussion') {
        stateRef.current.needsDawnReset = true;
      }
      if (phase !== prevPhase && isDirectLookCameraPreset(cameraPreset)) {
        stateRef.current.resetDirectLookAnchor = true;
      }
    }

    if (selectedTargetId && selectedTargetId !== prevSelected) {
      stateRef.current.trauma = Math.min(1, stateRef.current.trauma + 0.3);
      stateRef.current.hitstop = 0.035;
    }
    if (phase !== prevPhase) {
      stateRef.current.trauma = Math.min(1, stateRef.current.trauma + 0.38);
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
    deathCinematic,
    activeNightScene,
    wakingActorIds,
    returnToSeatTrigger,
    returnToSeatSeq,
    jumpTriggerSeq,
    ghostVerticalRate,
    allowTitleOrbit,
    isUiOverlayOpen,
    onPointerLockChange,
    onFreeLookChange,
    onAimedPlayerChange,
    onAimedCampfireChange,
    onAimedOwnSeatChange,
    onRoamingStateChange,
    onReturnToSeat,
    onSelectPlayer,
    onVoteCampfireAbstain,
    onSelectCampfire,
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

    // 2. Initialize Renderer, Scene, Camera (Graceful WebGL -> 2D Campfire fallback for BUG-04/BUG-06)
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: isSoftwareGl ? 'default' : 'high-performance',
      });
    } catch {
      try {
        renderer = new THREE.WebGLRenderer({ antialias: false });
      } catch (err) {
        console.warn('WebGLRenderer unavailable, switching to 2D Campfire mode:', err);
        setWebglUnavailable(true);
        return;
      }
    }
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.16;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    renderer.setSize(width, height);
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    canvasElemRef.current = renderer.domElement;

    const onWebglContextLost = (e: Event) => {
      e.preventDefault();
      console.warn('WebGL context lost — activating 2D Campfire fallback');
      setWebglUnavailable(true);
    };
    renderer.domElement.addEventListener('webglcontextlost', onWebglContextLost, false);

    const scene = new THREE.Scene();
    const initialBiome = stateRef.current.mapBiome || 'forest';
    const initialSky = AGROU_BIOMES[initialBiome].daySky;
    scene.background = new THREE.Color(initialSky);
    scene.fog = new THREE.FogExp2(initialSky, initialBiome === 'forest' ? 0.0195 : 0.0085);

    const camera = new THREE.PerspectiveCamera(46, width / height, 0.12, 240);
    camera.position.set(0, 6.4, 15.2);
    camera.lookAt(0, 1.25, -1.2);
    scene.add(camera);

    // Subtle Studio Environment Reflection Map (Skipped in software GL to prevent tab OOM/crash on rapid transitions)
    if (!isSoftwareGl) {
      try {
        const pmremGenerator = new THREE.PMREMGenerator(renderer);
        scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
        scene.environmentIntensity = 0.42;
        pmremGenerator.dispose();
      } catch {
        // Skip reflection env map safely if unsupported
      }
    }

    // 3. First-Person Viewmodel Rig (Hands + Village Lantern + Claws / Held Prop)
    const fpvRigGroup = new THREE.Group();
    fpvRigGroup.visible = false;
    camera.add(fpvRigGroup);

    const fpvSleeveMat = new THREE.MeshStandardMaterial({ color: 0x3b4958, roughness: 0.85, flatShading: true });
    const fpvSkinMat = new THREE.MeshStandardMaterial({ color: 0xe8b08a, roughness: 0.78, flatShading: true });
    const fpvLanternMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    const fpvDarkIronMat = new THREE.MeshStandardMaterial({ color: 0x262b30, roughness: 0.5, metalness: 0.6, flatShading: true });

    const fpvLeftHandGroup = new THREE.Group();
    fpvLeftHandGroup.position.set(-0.27, -0.25, -0.54);
    fpvLeftHandGroup.scale.setScalar(0.68);
    const fpvSleeveGeo = new THREE.CylinderGeometry(0.048, 0.064, 0.34, 8);
    const fpvHandSphereGeo = new THREE.BoxGeometry(0.085, 0.075, 0.095);
    const leftSleeveMesh = new THREE.Mesh(fpvSleeveGeo, fpvSleeveMat);
    leftSleeveMesh.rotation.x = Math.PI / 2.3;
    leftSleeveMesh.rotation.z = -0.22;
    leftSleeveMesh.position.set(-0.04, -0.1, 0.14);
    const leftPalmMesh = new THREE.Mesh(fpvHandSphereGeo, fpvSkinMat);
    const fpvLanternBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.056, 0.046, 0.14, 7),
      fpvLanternMat
    );
    fpvLanternBody.position.set(0.02, -0.11, -0.02);
    const fpvLanternCap = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.058, 7), fpvDarkIronMat);
    fpvLanternCap.position.set(0.02, -0.02, -0.02);
    const fpvLanternBase = new THREE.Mesh(new THREE.CylinderGeometry(0.054, 0.06, 0.025, 7), fpvDarkIronMat);
    fpvLanternBase.position.set(0.02, -0.19, -0.02);
    fpvLeftHandGroup.add(leftSleeveMesh, leftPalmMesh, fpvLanternBody, fpvLanternCap, fpvLanternBase);
    fpvRigGroup.add(fpvLeftHandGroup);

    const fpvRightHandGroup = new THREE.Group();
    fpvRightHandGroup.position.set(0.30, -0.28, -0.48);
    fpvRightHandGroup.scale.setScalar(0.62);
    const rightSleeveMesh = new THREE.Mesh(fpvSleeveGeo, fpvSleeveMat);
    rightSleeveMesh.rotation.x = Math.PI / 2.3;
    rightSleeveMesh.rotation.z = 0.22;
    rightSleeveMesh.position.set(0.04, -0.1, 0.14);
    const rightPalmMesh = new THREE.Mesh(fpvHandSphereGeo, fpvSkinMat);
    fpvRightHandGroup.add(rightSleeveMesh, rightPalmMesh);

    const fpvClawsGroup = new THREE.Group();
    const clawGeo = new THREE.ConeGeometry(0.016, 0.095, 5);
    const clawMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    for (let c = -1; c <= 1; c++) {
      const claw = new THREE.Mesh(clawGeo, clawMat);
      claw.rotation.x = -Math.PI / 2.2;
      claw.position.set(c * 0.026, 0.01, -0.075);
      fpvClawsGroup.add(claw);
    }
    fpvClawsGroup.visible = false;
    fpvRightHandGroup.add(fpvClawsGroup);

    const fpvPropHolderGroup = new THREE.Group();
    fpvPropHolderGroup.position.set(0, 0.06, -0.04);
    const fpvHeldTomato = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.065, 1),
      new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.4, flatShading: true })
    );
    const fpvHeldEgg = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.058, 1),
      new THREE.MeshStandardMaterial({ color: 0xfef9c3, roughness: 0.4, flatShading: true })
    );
    fpvHeldEgg.scale.set(0.85, 1.22, 0.85);
    const fpvHeldRose = new THREE.Mesh(
      new THREE.ConeGeometry(0.06, 0.14, 7),
      new THREE.MeshStandardMaterial({ color: 0xf43f5e, roughness: 0.5, flatShading: true })
    );
    fpvHeldRose.rotation.x = Math.PI;
    const fpvHeldWater = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.048, 0.11, 8),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.3, flatShading: true })
    );
    fpvPropHolderGroup.add(fpvHeldTomato, fpvHeldEgg, fpvHeldRose, fpvHeldWater);
    fpvRightHandGroup.add(fpvPropHolderGroup);

    // FPV Pointing Index Finger (extends cleanly from right palm when voting in First-Person View)
    const fpvPointFinger = new THREE.Mesh(
      new THREE.BoxGeometry(0.02, 0.02, 0.105),
      fpvSkinMat
    );
    fpvPointFinger.position.set(0, 0.01, -0.075);
    fpvPointFinger.visible = false;
    fpvRightHandGroup.add(fpvPointFinger);

    fpvRigGroup.add(fpvRightHandGroup);

    // 4. Lighting Rig (Agrou Dramatic Cool Atmospheric Mist vs Warm Sun/Campfire Glow!)
    const hemiLight = new THREE.HemisphereLight(
      AGROU_BIOMES[initialBiome].dayHemiSky,
      AGROU_BIOMES[initialBiome].dayHemiGround,
      1.15
    );
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(AGROU_BIOMES[initialBiome].daySunColor, 1.85);
    dirLight.position.set(16, 23, 14);
    if (!isSoftwareGl) {
      dirLight.castShadow = true;
      dirLight.shadow.mapSize.set(2048, 2048);
      dirLight.shadow.camera.near = 2;
      dirLight.shadow.camera.far = 68;
      dirLight.shadow.camera.left = -24;
      dirLight.shadow.camera.right = 24;
      dirLight.shadow.camera.top = 24;
      dirLight.shadow.camera.bottom = -24;
      dirLight.shadow.bias = -0.0006;
    }
    scene.add(dirLight);

    // Soft cool rim backlight to separate dark redwood trunks & seated adventurer silhouettes
    const rimLight = new THREE.DirectionalLight(0x7ea6cf, 0.55);
    rimLight.position.set(-14, 12, -18);
    scene.add(rimLight);

    // 5. Build Modular Agrou Environment, Night Action Director & Seated Adventurer Pool
    const clickables: THREE.Object3D[] = [];
    const envHandle = buildAgrouEnvironment(scene, clickables, initialBiome, isSoftwareGl);
    const adventurerPool = buildAgrouAdventurerPool(scene, clickables, MAX_SEATS, isSoftwareGl);
    const seats = adventurerPool.seats;
    const nightDirector = createNightActionDirector(scene);

    // 6. Pooled Surface VFX (28 slots: dirt dust puffs, 8s snow footprints, frost breath & river splashes)
    const SURFACE_VFX_COUNT = 28;
    const surfaceVfxGeo = new THREE.DodecahedronGeometry(0.11, 0);
    const surfaceVfxMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
    });
    const surfaceVfxInst = new THREE.InstancedMesh(surfaceVfxGeo, surfaceVfxMat, SURFACE_VFX_COUNT);
    surfaceVfxInst.frustumCulled = false;
    scene.add(surfaceVfxInst);

    type SurfaceVfxKind = 'dust' | 'snowprint' | 'frost' | 'splash';
    interface SurfaceVfxSlot {
      active: boolean;
      kind: SurfaceVfxKind;
      x: number;
      y: number;
      z: number;
      vx: number;
      vy: number;
      vz: number;
      rotY: number;
      age: number;
      maxAge: number;
      baseScale: number;
    }
    const surfaceVfxSlots: SurfaceVfxSlot[] = Array.from({ length: SURFACE_VFX_COUNT }, () => ({
      active: false,
      kind: 'dust',
      x: 0,
      y: -50,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      rotY: 0,
      age: 0,
      maxAge: 1,
      baseScale: 1,
    }));
    let surfaceVfxCursor = 0;

    const spawnSurfaceVfx = (
      kind: SurfaceVfxKind,
      x: number,
      y: number,
      z: number,
      vx: number,
      vy: number,
      vz: number,
      rotY: number,
      maxAge: number,
      baseScale: number
    ) => {
      let chosenIdx = -1;
      for (let i = 0; i < SURFACE_VFX_COUNT; i++) {
        if (!surfaceVfxSlots[i].active) {
          chosenIdx = i;
          break;
        }
      }
      if (chosenIdx === -1) {
        chosenIdx = surfaceVfxCursor % SURFACE_VFX_COUNT;
        surfaceVfxCursor = (surfaceVfxCursor + 1) % SURFACE_VFX_COUNT;
      }
      const slot = surfaceVfxSlots[chosenIdx];
      slot.active = true;
      slot.kind = kind;
      slot.x = x;
      slot.y = y;
      slot.z = z;
      slot.vx = vx;
      slot.vy = vy;
      slot.vz = vz;
      slot.rotY = rotY;
      slot.age = 0;
      slot.maxAge = maxAge;
      slot.baseScale = baseScale;
    };

    // Pooled flat expanding river water ripple rings (y = -0.22m in 'autumn' stream)
    const RIPPLE_COUNT = 8;
    const rippleGeo = new THREE.RingGeometry(0.14, 0.24, 18);
    rippleGeo.rotateX(-Math.PI / 2);
    const waterRipples = Array.from({ length: RIPPLE_COUNT }, () => {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xdbf4ff,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(rippleGeo, mat);
      mesh.visible = false;
      mesh.renderOrder = 3;
      scene.add(mesh);
      return { mesh, mat, active: false, age: 0, maxAge: 0.85 };
    });
    let rippleCursor = 0;
    const spawnWaterRipple = (x: number, z: number) => {
      const r = waterRipples[rippleCursor % RIPPLE_COUNT];
      rippleCursor = (rippleCursor + 1) % RIPPLE_COUNT;
      r.active = true;
      r.age = 0;
      r.mesh.position.set(x, -0.22, z);
      r.mesh.scale.setScalar(1);
      r.mesh.visible = true;
      r.mat.opacity = 0.65;
    };

    // 6B. Night Death Cinematic 3D VFX Rig (Werewolf Claw Slash, Witch Poison Mist, Cupid Shattered Heart, Spotlight)
    const deathVfxGroup = new THREE.Group();
    deathVfxGroup.visible = false;
    scene.add(deathVfxGroup);

    const deathSpotlight = new THREE.PointLight(0xff3344, 0, 14, 1.4);
    deathSpotlight.position.set(0, 2.8, 0);
    deathVfxGroup.add(deathSpotlight);

    // Crimson Werewolf Claw Slash arcs (3 diagonal razor ribbons)
    const deathClawGroup = new THREE.Group();
    const clawSlashMat = new THREE.MeshBasicMaterial({
      color: 0xef4444,
      transparent: true,
      opacity: 0.92,
      side: THREE.DoubleSide,
    });
    const clawSlashGeo = new THREE.BoxGeometry(0.08, 1.65, 0.04);
    for (let s = -1; s <= 1; s++) {
      const slash = new THREE.Mesh(clawSlashGeo, clawSlashMat);
      slash.position.set(s * 0.24, 1.15, 0.25);
      slash.rotation.z = -0.62;
      deathClawGroup.add(slash);
    }
    deathClawGroup.visible = false;
    deathVfxGroup.add(deathClawGroup);

    // Glowing Green Witch Poison Cloud + Shattering Potion Vial
    const deathPoisonGroup = new THREE.Group();
    const poisonMistMat = new THREE.MeshBasicMaterial({
      color: 0x22c55e,
      transparent: true,
      opacity: 0.72,
    });
    const poisonCloudGeo = new THREE.DodecahedronGeometry(0.28, 0);
    const poisonOrbs: THREE.Mesh[] = [];
    for (let k = 0; k < 10; k++) {
      const orb = new THREE.Mesh(poisonCloudGeo, poisonMistMat);
      const a = (k / 10) * Math.PI * 2;
      orb.position.set(Math.cos(a) * 0.65, 0.5 + (k % 3) * 0.42, Math.sin(a) * 0.65);
      deathPoisonGroup.add(orb);
      poisonOrbs.push(orb);
    }
    deathPoisonGroup.visible = false;
    deathVfxGroup.add(deathPoisonGroup);

    // Cupid Shattering Crimson Heart Shards
    const deathHeartGroup = new THREE.Group();
    const brokenHeartMat = new THREE.MeshBasicMaterial({
      color: 0xf43f5e,
      transparent: true,
      opacity: 0.9,
    });
    const heartHalfGeo = new THREE.OctahedronGeometry(0.32, 0);
    const heartLeft = new THREE.Mesh(heartHalfGeo, brokenHeartMat);
    const heartRight = new THREE.Mesh(heartHalfGeo, brokenHeartMat);
    heartLeft.position.set(-0.22, 1.55, 0);
    heartRight.position.set(0.22, 1.55, 0);
    deathHeartGroup.add(heartLeft, heartRight);
    deathHeartGroup.visible = false;
    deathVfxGroup.add(deathHeartGroup);

    // 7. Thrown Props & Impact Splat Physics
    const activeProjectiles: ActiveProjectile3D[] = [];
    const activeSplats: ActiveSplatEffect3D[] = [];

    const tomatoSkinMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.35 });
    const tomatoSeedMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.4 });
    const tomatoStemMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.65 });
    const eggShellMat = new THREE.MeshStandardMaterial({ color: 0xecfccb, roughness: 0.32 });
    const eggYolkMat = new THREE.MeshStandardMaterial({
      color: 0xeab308,
      emissive: 0xa16207,
      emissiveIntensity: 0.35,
      roughness: 0.15,
    });
    const stinkGasMat = new THREE.MeshBasicMaterial({ color: 0x84cc16, transparent: true, opacity: 0.65 });
    const rosePetalMat = new THREE.MeshStandardMaterial({ color: 0xe11d48, roughness: 0.4 });
    const roseHeartMat = new THREE.MeshBasicMaterial({ color: 0xf472b6, transparent: true, opacity: 0.9 });
    const roseWrapMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.6 });
    const waterLiquidMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.4,
      roughness: 0.12,
      transparent: true,
      opacity: 0.86,
    });
    const waterFoamMat = new THREE.MeshBasicMaterial({
      color: 0xe0f2fe,
      transparent: true,
      opacity: 0.72,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const propGoldMat = new THREE.MeshStandardMaterial({ color: 0xeab308, metalness: 0.7, roughness: 0.3 });

    const unitSphereGeo = new THREE.SphereGeometry(1, 10, 10);
    const unitConeGeo = new THREE.ConeGeometry(1, 1, 7);
    const unitTorusGeo = new THREE.TorusGeometry(1, 0.14, 6, 16);
    const splatChunkGeo = new THREE.DodecahedronGeometry(0.085, 0);
    const heartPetalGeo = new THREE.OctahedronGeometry(0.075, 0);

    const createCompositePropGroup = (
      propType: PropType
    ): { group: THREE.Group; trailGroup: THREE.Group; trailParticles: THREE.Mesh[] } => {
      const g = new THREE.Group();
      const trailGroup = new THREE.Group();
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
        for (let t = 0; t < 4; t++) {
          const drop = new THREE.Mesh(splatChunkGeo, tomatoSkinMat);
          drop.scale.setScalar(0.55 - t * 0.08);
          trailGroup.add(drop);
          trailParticles.push(drop);
        }
      } else if (propType === 'egg') {
        const eggBody = new THREE.Mesh(unitSphereGeo, eggShellMat);
        eggBody.scale.set(0.19, 0.27, 0.19);
        g.add(eggBody);
        const stinkRing = new THREE.Mesh(unitTorusGeo, stinkGasMat);
        stinkRing.scale.setScalar(0.28);
        stinkRing.rotation.x = Math.PI / 2;
        g.add(stinkRing);
        for (let t = 0; t < 4; t++) {
          const puff = new THREE.Mesh(splatChunkGeo, stinkGasMat);
          puff.scale.setScalar(0.75 - t * 0.1);
          trailGroup.add(puff);
          trailParticles.push(puff);
        }
      } else if (propType === 'rose') {
        const coneWrap = new THREE.Mesh(unitConeGeo, roseWrapMat);
        coneWrap.scale.set(0.18, 0.42, 0.18);
        coneWrap.rotation.x = Math.PI;
        coneWrap.position.y = -0.05;
        g.add(coneWrap);
        const ribbon = new THREE.Mesh(unitTorusGeo, propGoldMat);
        ribbon.scale.setScalar(0.11);
        ribbon.rotation.x = Math.PI / 2;
        ribbon.position.y = -0.08;
        g.add(ribbon);
        [
          [0, 0.2, 0],
          [-0.09, 0.17, 0.06],
          [0.09, 0.17, -0.06],
        ].forEach(([bx, by, bz]) => {
          const bud = new THREE.Mesh(splatChunkGeo, rosePetalMat);
          bud.scale.setScalar(1.35);
          bud.position.set(bx, by, bz);
          g.add(bud);
        });
        for (let t = 0; t < 4; t++) {
          const petal = new THREE.Mesh(t % 2 === 0 ? splatChunkGeo : heartPetalGeo, t % 2 === 0 ? rosePetalMat : roseHeartMat);
          petal.scale.set(0.75, 0.22, 0.75);
          trailGroup.add(petal);
          trailParticles.push(petal);
        }
      } else {
        // Splashing liquid water arc + translucent curved splash sheet (replaces vanishing iron bucket!)
        const splashSheet = new THREE.Mesh(unitSphereGeo, waterLiquidMat);
        splashSheet.scale.set(0.26, 0.14, 0.46);
        g.add(splashSheet);
        const foamCrest = new THREE.Mesh(unitSphereGeo, waterFoamMat);
        foamCrest.scale.set(0.32, 0.09, 0.28);
        foamCrest.position.set(0, 0.07, 0.14);
        g.add(foamCrest);
        for (let d = 0; d < 4; d++) {
          const lobe = new THREE.Mesh(splatChunkGeo, d % 2 === 0 ? waterLiquidMat : waterFoamMat);
          lobe.scale.set(0.85, 0.55, 1.35);
          lobe.position.set((d - 1.5) * 0.12, (d % 2) * 0.06, -0.14 - d * 0.06);
          g.add(lobe);
        }
        for (let t = 0; t < 5; t++) {
          const splash = new THREE.Mesh(splatChunkGeo, t % 2 === 0 ? waterLiquidMat : waterFoamMat);
          splash.scale.setScalar(0.85 - t * 0.11);
          trailGroup.add(splash);
          trailParticles.push(splash);
        }
      }
      return { group: g, trailGroup, trailParticles };
    };

    const spawnPropImpactEffect = (targetSeatIndex: number, propType: PropType) => {
      const seat = seats[targetSeatIndex];
      if (!seat) return;
      const effectGroup = new THREE.Group();
      effectGroup.position.copy(seat.currentPos);
      scene.add(effectGroup);

      const particles: SplatParticle[] = [];
      const particleCount = propType === 'rose' ? 16 : 14;
      for (let k = 0; k < particleCount; k++) {
        let pMat: THREE.Material = tomatoSkinMat;
        let pGeo: THREE.BufferGeometry = splatChunkGeo;
        if (propType === 'tomato') {
          pMat = k % 4 === 0 ? tomatoSeedMat : k % 5 === 0 ? tomatoStemMat : tomatoSkinMat;
        } else if (propType === 'egg') {
          pMat = k % 3 === 0 ? eggShellMat : k % 3 === 1 ? eggYolkMat : stinkGasMat;
        } else if (propType === 'rose') {
          pMat = k % 3 === 0 ? roseHeartMat : k % 5 === 0 ? tomatoStemMat : rosePetalMat;
          pGeo = k % 3 === 0 ? heartPetalGeo : splatChunkGeo;
        } else {
          pMat = k % 3 === 0 ? waterFoamMat : waterLiquidMat;
        }
        const m = new THREE.Mesh(pGeo, pMat);
        const angle = (k / particleCount) * Math.PI * 2 + Math.random() * 0.4;
        const speed = propType === 'rose' ? 0.45 + Math.random() * 0.65 : 1.3 + Math.random() * 2.1;
        m.position.set(
          propType === 'rose' ? Math.cos(angle) * 0.35 : 0,
          propType === 'rose' ? 1.55 + Math.random() * 0.45 : 1.25,
          propType === 'rose' ? Math.sin(angle) * 0.35 : 0.15
        );
        if (propType === 'rose') {
          m.scale.set(k % 3 === 0 ? 0.9 : 0.95, k % 3 === 0 ? 0.9 : 0.2, 0.95);
        } else {
          m.scale.setScalar(0.65 + Math.random() * 0.65);
        }
        effectGroup.add(m);
        particles.push({
          mesh: m,
          vx: Math.cos(angle) * speed,
          vy: propType === 'rose' ? 0.8 + Math.random() * 0.7 : 2.0 + Math.random() * 2.2,
          vz: Math.sin(angle) * speed,
          rotSpeed: propType === 'rose' ? (Math.random() - 0.5) * 4.5 : (Math.random() - 0.5) * 14,
          isFloatingGas: propType === 'egg' && k % 3 === 2,
          isFlutterPetal: propType === 'rose',
        });
      }

      const puddleGroup = new THREE.Group();
      puddleGroup.position.set(0, 0.04, 0.25);
      // Attach bodySplatGroup directly to seat.torsoGroup so pulp/yolk/droplets stick from every angle!
      const bodySplatGroup = new THREE.Group();
      bodySplatGroup.position.set(0, 0.28, 0.24);

      if (propType === 'tomato') {
        for (let b = 0; b < 5; b++) {
          const blob = new THREE.Mesh(unitSphereGeo, tomatoSkinMat);
          const r = 0.12 + (b % 3) * 0.06;
          blob.scale.set(r, 0.025, r);
          blob.position.set((Math.random() - 0.5) * 0.45, 0, (Math.random() - 0.5) * 0.45);
          puddleGroup.add(blob);
          const chestBlob = new THREE.Mesh(unitSphereGeo, b % 3 === 0 ? tomatoSeedMat : tomatoSkinMat);
          chestBlob.scale.set(0.085, 0.09, 0.032);
          chestBlob.position.set((Math.random() - 0.5) * 0.22, (Math.random() - 0.5) * 0.24, 0);
          bodySplatGroup.add(chestBlob);
        }
      } else if (propType === 'egg') {
        const eggWhite = new THREE.Mesh(unitSphereGeo, eggShellMat);
        eggWhite.scale.set(0.36, 0.02, 0.32);
        const eggYolk = new THREE.Mesh(unitSphereGeo, eggYolkMat);
        eggYolk.scale.set(0.15, 0.06, 0.15);
        eggYolk.position.y = 0.02;
        puddleGroup.add(eggWhite, eggYolk);
        const chestWhite = new THREE.Mesh(unitSphereGeo, eggShellMat);
        chestWhite.scale.set(0.16, 0.14, 0.03);
        const chestYolk = new THREE.Mesh(unitSphereGeo, eggYolkMat);
        chestYolk.scale.set(0.1, 0.1, 0.045);
        chestYolk.position.z = 0.015;
        bodySplatGroup.add(chestWhite, chestYolk);
      } else if (propType === 'rose') {
        for (let b = 0; b < 7; b++) {
          const a = (b / 7) * Math.PI * 2;
          const petal = new THREE.Mesh(splatChunkGeo, rosePetalMat);
          petal.scale.set(0.9, 0.18, 0.9);
          petal.position.set(Math.cos(a) * 0.42, 0.02, Math.sin(a) * 0.42);
          puddleGroup.add(petal);
        }
      } else {
        const waterPool = new THREE.Mesh(unitSphereGeo, waterLiquidMat);
        waterPool.scale.set(0.55, 0.02, 0.55);
        puddleGroup.add(waterPool);
        for (let d = 0; d < 6; d++) {
          const drop = new THREE.Mesh(unitSphereGeo, d % 2 === 0 ? waterLiquidMat : waterFoamMat);
          drop.scale.set(0.045, 0.065, 0.03);
          drop.position.set((Math.random() - 0.5) * 0.24, (Math.random() - 0.5) * 0.26, 0);
          bodySplatGroup.add(drop);
        }
      }

      effectGroup.add(puddleGroup);
      seat.torsoGroup.add(bodySplatGroup);
      activeSplats.push({
        group: effectGroup,
        particles,
        puddleMesh: puddleGroup,
        bodySplatMesh: bodySplatGroup,
        attachedParent: seat.torsoGroup,
        targetSeatIndex,
        age: 0,
        maxAge: 5.0,
        propType,
      });
    };

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // 8. Pointer, 360° Drag + Edge-Pan, Pointer Lock & Menu-Safe Camera Look Handlers
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const groundHitPoint = new THREE.Vector3();
    let lastHoverTime = 0;
    let lastDragX = 0;
    let lastDragY = 0;
    let lastDragClientX = 0;
    let isPointerDown = false;
    let activePointerId: number | null = null;
    let activePointerButton = 0;
    let dragDistance = 0;
    let pointerLockAcquiredAt = 0;

    const getIdleCursor = () => {
      const st = stateRef.current;
      const canTitleOrbit = st.isTitleScreen && Boolean(st.allowTitleOrbit);
      if (st.isTitleScreen) return canTitleOrbit ? 'grab' : '';
      if (st.isUiOverlayOpen) return '';
      return isDirectLookCameraPreset(st.cameraPreset) ? 'crosshair' : 'grab';
    };

    const resetActiveInputs = () => {
      stateRef.current.keysPressed.clear();
      isPointerDown = false;
      activePointerId = null;
      activePointerButton = 0;
      dragDistance = 0;
      stateRef.current.isDraggingOrbit = false;
      renderer.domElement.style.cursor = '';
    };

    const getRayHitTarget = (
      clientX: number,
      clientY: number
    ): { playerId: string | null; isCampfire: boolean; isOwnSeat: boolean } => {
      const rect = renderer.domElement.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        return { playerId: null, isCampfire: false, isOwnSeat: false };
      }
      pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(clickables, false);
      for (const hit of hits) {
        if (hit.object.userData.isCampfire) {
          if (stateRef.current.phase === 'day_voting' && !stateRef.current.isTitleScreen) {
            return { playerId: null, isCampfire: true, isOwnSeat: false };
          }
          continue;
        }
        const seatIdx = hit.object.userData.seatIndex;
        const seat = seats[seatIdx];
        if (!seat || !seat.playerId) continue;
        if (hit.object.userData.isGhostHitbox) {
          if (seat.ghostGroup.visible) {
            return { playerId: seat.playerId, isCampfire: false, isOwnSeat: false };
          }
          continue;
        }
        if (seat.group.visible) {
          return { playerId: seat.playerId, isCampfire: false, isOwnSeat: false };
        }
      }
      const st = stateRef.current;
      // Fallback stone-ring campfire check during day_voting so clicking the fire rocks also abstains
      if (
        st.phase === 'day_voting' &&
        !st.isTitleScreen &&
        raycaster.ray.intersectPlane(groundPlane, groundHitPoint) &&
        Math.hypot(groundHitPoint.x, groundHitPoint.z) < 1.45
      ) {
        return { playerId: null, isCampfire: true, isOwnSeat: false };
      }
      // Check clickable own empty wooden stool when player is standing/roaming!
      if (st.isUserRoaming && !st.isTitleScreen) {
        const myIdx = st.players.findIndex((p) => p.id === st.userPlayerId && p.isAlive);
        if (myIdx !== -1 && seats[myIdx] && seats[myIdx].seatAnchorGroup.visible) {
          const stoolHits = raycaster.intersectObject(seats[myIdx].stoolHitbox, false);
          if (stoolHits.length > 0) {
            return { playerId: null, isCampfire: false, isOwnSeat: true };
          }
        }
      }
      return { playerId: null, isCampfire: false, isOwnSeat: false };
    };

    const releaseCanvasPointerLock = () => {
      try {
        if (document.pointerLockElement === renderer.domElement && typeof document.exitPointerLock === 'function') {
          document.exitPointerLock();
        }
      } catch {
        // Ignore
      }
    };

    const onPointerLockChange = () => {
      const locked = document.pointerLockElement === renderer.domElement;
      stateRef.current.isPointerLocked = locked;
      if (locked) {
        pointerLockAcquiredAt = performance.now();
      }
      stateRef.current.onPointerLockChange?.(locked);
      stateRef.current.onFreeLookChange?.(locked);
    };

    const onPointerLockError = () => {
      stateRef.current.isPointerLocked = false;
      stateRef.current.onPointerLockChange?.(false);
      stateRef.current.onFreeLookChange?.(false);
    };

    const onContextMenu = (e: MouseEvent) => {
      // Allow smooth right-click drag camera rotation on 3D canvas without blocking inputs/modals
      e.preventDefault();
    };

    const onPointerDown = (e: PointerEvent) => {
      const st = stateRef.current;
      const canTitleOrbit = st.isTitleScreen && Boolean(st.allowTitleOrbit);
      if (st.isTitleScreen ? !canTitleOrbit : st.isUiOverlayOpen) return;
      const isPointerLocked = document.pointerLockElement === renderer.domElement;
      // Restrict both left-click and right-click drag initiation to the 3D canvas
      if (!isPointerLocked && e.target !== renderer.domElement) return;
      // Ignore secondary touches while a drag is already active
      if (isPointerDown && activePointerId !== null && e.pointerId !== activePointerId) {
        return;
      }
      const isRightClick = e.button === 2;
      isPointerDown = true;
      activePointerId = e.pointerId;
      activePointerButton = e.button;
      lastDragX = e.clientX;
      lastDragY = e.clientY;
      lastDragClientX = e.clientX;
      dragDistance = 0;
      if (isRightClick) {
        // Right-click immediately engages pure camera look drag (never accidental walk/select)
        st.isDraggingOrbit = true;
        if (canTitleOrbit) st.hasUserDraggedTitle = true;
        renderer.domElement.style.cursor = 'grabbing';
      }
    };

    const onPointerLeaveCanvas = () => {
      if (!isPointerDown) {
        stateRef.current.hoveredPlayerId = null;
        stateRef.current.hoveredCampfire = false;
        stateRef.current.hoveredOwnSeat = false;
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (isPointerDown && activePointerId !== null && e.pointerId !== activePointerId) {
        return;
      }
      const st = stateRef.current;
      const mePlayer = st.players.find((p) => p.id === st.userPlayerId);
      const isBlindfoldedNow =
        st.phase === 'night' && Boolean(mePlayer?.isAlive) && !st.isPlayerAwakeAtNight;
      const isDirectLook = isDirectLookCameraPreset(st.cameraPreset);
      const isPointerLocked = document.pointerLockElement === renderer.domElement;
      st.isPointerLocked = isPointerLocked;

      const canTitleOrbit = st.isTitleScreen && Boolean(st.allowTitleOrbit);
      if (
        (st.isTitleScreen && !canTitleOrbit) ||
        (!st.isTitleScreen && (st.isUiOverlayOpen || isBlindfoldedNow || Boolean(st.deathCinematic)))
      ) {
        if (isPointerDown) {
          isPointerDown = false;
          activePointerId = null;
          st.isDraggingOrbit = false;
          renderer.domElement.style.cursor = '';
        }
        return;
      }

      const isDraggingCanvas = isPointerDown && (activePointerButton === 2 || dragDistance > 4);
      const canRotateNow = shouldApplyCameraLook({
        isTitleScreen: st.isTitleScreen,
        allowTitleOrbit: canTitleOrbit,
        isNightBlindfolded: isBlindfoldedNow,
        hasDeathCinematic: Boolean(st.deathCinematic),
        isUiOverlayOpen: st.isUiOverlayOpen,
        isPointerLocked,
        isDraggingCanvas: isPointerDown,
      });

      if (isPointerLocked && !st.isTitleScreen) {
        // TRUE INFINITE 360° POINTER LOCK LOOK (zero screen-edge limits, menus paused until Esc/Alt)
        const dx = e.movementX || 0;
        const dy = e.movementY || 0;
        const spikeLimit = performance.now() - pointerLockAcquiredAt < 120 ? 45 : 220;
        if (Math.abs(dx) < spikeLimit && Math.abs(dy) < spikeLimit && (dx !== 0 || dy !== 0)) {
          if (isDirectLook) {
            st.fpvYaw -= dx * 0.0042;
            st.fpvPitch = clampFpvPitch(
              st.fpvPitch - dy * 0.0034,
              st.cameraPreset === 'third_person' ? -0.58 : -0.68,
              st.cameraPreset === 'third_person' ? 0.56 : 0.68
            );
          } else {
            st.azimuthAngle -= dx * 0.0055;
            st.polarAngle = Math.max(0.18, Math.min(1.25, st.polarAngle + dy * 0.0042));
          }
        }
      } else if (canRotateNow && isPointerDown) {
        // MENU-SAFE DRAG-TO-LOOK (Hold Right-Click or Left-Click drag on canvas; passive hover NEVER spins camera!)
        const dx = e.clientX - lastDragX;
        const dy = e.clientY - lastDragY;
        dragDistance += Math.hypot(dx, dy);
        lastDragX = e.clientX;
        lastDragY = e.clientY;
        lastDragClientX = e.clientX;

        if (activePointerButton === 2 || dragDistance > 4) {
          st.isDraggingOrbit = true;
          if (canTitleOrbit) st.hasUserDraggedTitle = true;
          renderer.domElement.style.cursor = 'grabbing';
          if (isDirectLook && !st.isTitleScreen) {
            st.fpvYaw -= dx * 0.0058;
            st.fpvPitch = clampFpvPitch(
              st.fpvPitch - dy * 0.0045,
              st.cameraPreset === 'third_person' ? -0.58 : -0.68,
              st.cameraPreset === 'third_person' ? 0.56 : 0.68
            );
          } else {
            st.azimuthAngle -= dx * 0.0068;
            st.polarAngle = Math.max(0.18, Math.min(1.25, st.polarAngle + dy * 0.0052));
          }
        }
      }

      if (st.isTitleScreen) {
        renderer.domElement.style.cursor = st.isDraggingOrbit ? 'grabbing' : canTitleOrbit ? 'grab' : '';
        return;
      }

      // Skip hover raycast & head-gaze tracking when pointer is over HUD/menus (not canvas)
      if (!isPointerLocked && e.target !== renderer.domElement) {
        return;
      }

      const now = performance.now();
      if (now - lastHoverTime < 38) return;
      lastHoverTime = now;
      const hit = isPointerLocked
        ? isDirectLook
          ? { playerId: st.aimedPlayerId, isCampfire: st.aimedCampfire, isOwnSeat: st.aimedOwnSeat }
          : (() => {
              const rect = renderer.domElement.getBoundingClientRect();
              return getRayHitTarget(rect.left + rect.width / 2, rect.top + rect.height / 2);
            })()
        : getRayHitTarget(e.clientX, e.clientY);
      st.hoveredPlayerId = hit.playerId;
      st.hoveredCampfire = hit.isCampfire;
      st.hoveredOwnSeat = hit.isOwnSeat;

      // Update 3D Mouse Look Target for Head/Gaze Tracking only while hovering canvas
      if (!isPointerLocked && !isDraggingCanvas) {
        if (hit.playerId) {
          const hoveredSeat = seats.find((s) => s.playerId === hit.playerId);
          const hoveredPlayer = st.players.find((p) => p.id === hit.playerId);
          if (hoveredSeat) {
            const gazeBase =
              hoveredPlayer && !hoveredPlayer.isAlive && hoveredSeat.ghostGroup.visible
                ? hoveredSeat.ghostPos
                : hoveredSeat.currentPos;
            st.mouseWorldLookPoint.set(
              gazeBase.x,
              gazeBase.y + (hoveredPlayer && !hoveredPlayer.isAlive ? 1.05 : 1.48),
              gazeBase.z
            );
            st.hasMouseLook = true;
          }
        } else {
          const rect = renderer.domElement.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
            raycaster.setFromCamera(pointer, camera);
            if (raycaster.ray.intersectPlane(groundPlane, groundHitPoint)) {
              st.mouseWorldLookPoint.set(groundHitPoint.x, 1.35, groundHitPoint.z);
              st.hasMouseLook = true;
            }
          }
        }
      }

      renderer.domElement.style.cursor =
        st.isDraggingOrbit
          ? 'grabbing'
          : hit.playerId || hit.isCampfire || hit.isOwnSeat
          ? 'pointer'
          : isDirectLook
          ? 'crosshair'
          : 'grab';
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!isPointerDown || (activePointerId !== null && e.pointerId !== activePointerId)) {
        return;
      }
      const wasRightClick = activePointerButton === 2;
      const wasClick = !wasRightClick && dragDistance < 9;
      isPointerDown = false;
      activePointerId = null;
      activePointerButton = 0;
      dragDistance = 0;
      stateRef.current.isDraggingOrbit = false;
      renderer.domElement.style.cursor = getIdleCursor();

      const st = stateRef.current;
      if (!wasClick || st.isTitleScreen || st.isUiOverlayOpen) return;
      const isPointerLocked = document.pointerLockElement === renderer.domElement;
      if (!isPointerLocked && e.target !== renderer.domElement) return;

      const isDirectLook = isDirectLookCameraPreset(st.cameraPreset);
      const hit = isPointerLocked
        ? isDirectLook
          ? { playerId: null, isCampfire: false, isOwnSeat: false }
          : (() => {
              const rect = renderer.domElement.getBoundingClientRect();
              return getRayHitTarget(rect.left + rect.width / 2, rect.top + rect.height / 2);
            })()
        : getRayHitTarget(e.clientX, e.clientY);

      if (hit.isOwnSeat || (isPointerLocked && isDirectLook && st.aimedOwnSeat && st.isUserRoaming)) {
        st.isUserRoaming = false;
        st.dashTargetPos = null;
        st.crouchToggled = false;
        if (isDirectLook) st.resetDirectLookAnchor = true;
        st.onReturnToSeat?.();
        return;
      }

      if (
        (hit.isCampfire || (isPointerLocked && isDirectLook && st.aimedCampfire)) &&
        st.phase === 'day_voting'
      ) {
        if (st.onSelectCampfire) {
          st.onSelectCampfire();
        } else {
          st.onVoteCampfireAbstain?.();
        }
        return;
      }

      // Only fall back to center crosshair aim when Pointer Lock is engaged (never override unlocked cursor clicks)
      const pid = hit.playerId || (isPointerLocked && isDirectLook ? st.aimedPlayerId : null);
      if (pid) {
        st.onSelectPlayer(pid);
      } else if (!isPointerLocked && st.phase === 'day_discussion') {
        const me = st.players.find((p) => p.id === st.userPlayerId);
        if (me) {
          const rect = renderer.domElement.getBoundingClientRect();
          pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
          pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
          raycaster.setFromCamera(pointer, camera);
          if (raycaster.ray.intersectPlane(groundPlane, groundHitPoint)) {
            const clampedR = Math.max(
              !me.isAlive ? 0.5 : 2.1,
              Math.min(23.5, Math.hypot(groundHitPoint.x, groundHitPoint.z))
            );
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

    const onPointerCancel = (e: PointerEvent) => {
      if (activePointerId !== null && e.pointerId !== activePointerId) return;
      resetActiveInputs();
    };

    const onWindowBlur = () => {
      resetActiveInputs();
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        resetActiveInputs();
      }
    };

    const onWheel = (e: WheelEvent) => {
      const st = stateRef.current;
      const canTitleOrbit = st.isTitleScreen && Boolean(st.allowTitleOrbit);
      if (st.isTitleScreen ? !canTitleOrbit : st.isUiOverlayOpen) return;
      if (canTitleOrbit) st.hasUserDraggedTitle = true;
      st.cameraDist = Math.max(8.5, Math.min(27.5, st.cameraDist + e.deltaY * 0.012));
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const targetEl = e.target as HTMLElement | null;
      const tag = targetEl?.tagName;
      if (
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        targetEl?.isContentEditable
      ) {
        return;
      }
      // Ignore browser/OS shortcut combos (Cmd+A, Ctrl+S, Ctrl+W, Alt+*) while still allowing standalone Ctrl crouch
      if (
        e.metaKey ||
        e.altKey ||
        (e.ctrlKey && e.code !== 'ControlLeft' && e.code !== 'ControlRight')
      ) {
        return;
      }
      const st = stateRef.current;
      if (
        [
          'KeyW',
          'KeyA',
          'KeyS',
          'KeyD',
          'KeyQ',
          'ArrowUp',
          'ArrowDown',
          'ArrowLeft',
          'ArrowRight',
          'ShiftLeft',
          'ShiftRight',
          'ControlLeft',
          'ControlRight',
          'Space',
        ].includes(e.code)
      ) {
        st.keysPressed.add(e.code);
      }
      if (e.code === 'Space' && !st.isTitleScreen && !st.isUiOverlayOpen) {
        e.preventDefault();
        const me = st.players.find((p) => p.id === st.userPlayerId);
        if (me?.isAlive && st.phase === 'day_discussion') {
          st.jumpQueued = true;
          st.isUserRoaming = true;
        }
      }
      if (e.code === 'KeyX' && !st.isTitleScreen && !st.isUiOverlayOpen) {
        const meIdx = st.players.findIndex((p) => p.id === st.userPlayerId);
        const me = meIdx !== -1 ? st.players[meIdx] : null;
        if (me && !me.isAlive && seats[meIdx]) {
          // Optional smooth glide back above own tombstone for ghosts
          st.dashTargetPos = new THREE.Vector3(seats[meIdx].homePos.x, 0, seats[meIdx].homePos.z);
        } else {
          // Return cleanly to sit back down on own wooden stool
          st.isUserRoaming = false;
          st.dashTargetPos = null;
          st.crouchToggled = false;
          if (isDirectLookCameraPreset(st.cameraPreset)) {
            st.resetDirectLookAnchor = true;
          }
        }
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      stateRef.current.keysPressed.delete(e.code);
    };

    const domElem = renderer.domElement;
    window.addEventListener('pointerdown', onPointerDown);
    domElem.addEventListener('pointerleave', onPointerLeaveCanvas);
    domElem.addEventListener('contextmenu', onContextMenu);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerCancel);
    window.addEventListener('blur', onWindowBlur);
    document.addEventListener('visibilitychange', onVisibilityChange);
    document.addEventListener('pointerlockchange', onPointerLockChange);
    document.addEventListener('pointerlockerror', onPointerLockError);
    domElem.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    (window as unknown as Record<string, unknown>).__VILLAGE_DEBUG__ = {
      getState: () => {
        const st = stateRef.current;
        const myIdx = Math.max(0, st.players.findIndex((p) => p.id === st.userPlayerId));
        const mySeat = seats[myIdx];
        const visibleGhosts = seats
          .filter((s) => s.ghostGroup.visible && s.playerId)
          .map((s) => {
            const visibleHat = (Object.keys(s.ghostHatVariants) as AgrouHatId[]).find(
              (hk) => s.ghostHatVariants[hk].visible
            );
            return {
              playerId: s.playerId,
              hat: visibleHat ?? 'none',
              cloakHex: `#${s.ghostCloakMat.color.getHexString()}`,
              pos: {
                x: Number(s.ghostPos.x.toFixed(2)),
                y: Number(s.ghostPos.y.toFixed(2)),
                z: Number(s.ghostPos.z.toFixed(2)),
              },
            };
          });
        return {
          cameraPreset: st.cameraPreset,
          fpvYaw: Number(st.fpvYaw.toFixed(4)),
          fpvPitch: Number(st.fpvPitch.toFixed(4)),
          azimuthAngle: Number(st.azimuthAngle.toFixed(4)),
          isUserRoaming: st.isUserRoaming,
          isUiOverlayOpen: st.isUiOverlayOpen,
          isPointerLocked: st.isPointerLocked,
          isDraggingOrbit: st.isDraggingOrbit,
          standFactor: mySeat ? Number(mySeat.standFactor.toFixed(3)) : 0,
          bodyVisible: mySeat ? mySeat.bodyGroup.visible : false,
          myGhostVisible: mySeat ? mySeat.ghostGroup.visible : false,
          myGhostPos: mySeat
            ? {
                x: Number(mySeat.ghostPos.x.toFixed(3)),
                y: Number(mySeat.ghostPos.y.toFixed(3)),
                z: Number(mySeat.ghostPos.z.toFixed(3)),
              }
            : null,
          visibleGhosts,
          distFromStool: mySeat
            ? Number(
                Math.hypot(
                  mySeat.currentPos.x - mySeat.homePos.x,
                  mySeat.currentPos.z - mySeat.homePos.z
                ).toFixed(3)
              )
            : 0,
          camPos: {
            x: Number(camera.position.x.toFixed(2)),
            y: Number(camera.position.y.toFixed(2)),
            z: Number(camera.position.z.toFixed(2)),
          },
        };
      },
    };

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

    // 9. Software-WebGL Paced Loop & 60fps Simulation
    let lastFrameTime = performance.now();
    let frameId = 0;
    let elapsedTotal = 0;
    let lastLabelSync = 0;
    let lastSpatialAudioSync = 0;
    let lastFrostBreathTime = 0;

    function afterDraw(cb: () => void) {
      try {
        const gl = renderer.getContext() as WebGL2RenderingContext;
        if (!gl || gl.isContextLost?.() || typeof gl.fenceSync !== 'function') {
          frameId = window.setTimeout(cb, 90);
          return;
        }
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        const poll = () => {
          if (gl.isContextLost?.()) return;
          const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
          if (state === gl.UNSIGNALED) {
            frameId = window.setTimeout(poll, 8);
          } else {
            if (sync) gl.deleteSync(sync);
            frameId = window.setTimeout(cb, 85);
          }
        };
        frameId = window.setTimeout(poll, 8);
      } catch {
        frameId = window.setTimeout(cb, 90);
      }
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
      const activeDeathCinematic = !st.isTitleScreen ? st.deathCinematic : null;
      const isNightBlindfolded =
        !st.isTitleScreen &&
        !activeDeathCinematic &&
        st.phase === 'night' &&
        Boolean(me?.isAlive) &&
        !st.isPlayerAwakeAtNight;

      // Biome-Aware Atmospheric Sky, Fog & Lighting Interpolation
      const activeBiomeKey: AgrouMapBiome = st.mapBiome || 'forest';
      const biome = AGROU_BIOMES[activeBiomeKey];
      const isDay =
        !activeDeathCinematic &&
        (st.isTitleScreen || st.phase === 'day_discussion' || st.phase === 'day_voting');
      const isVotingPhase = st.phase === 'day_voting' && !st.isTitleScreen;
      const isAbstaining = st.selectedTargetId === CAMPFIRE_ABSTAIN_ID;

      const targetBgHex = activeDeathCinematic
        ? 0x050308
        : isDay
        ? biome.daySky
        : isNightBlindfolded
        ? 0x010103
        : biome.nightSky;
      const bgLerp = isSoftwareGl ? 0.85 : 1 - Math.exp(-6.0 * dt);
      _scratchColor.setHex(targetBgHex);
      (scene.background as THREE.Color).lerp(_scratchColor, bgLerp);

      if (scene.fog instanceof THREE.FogExp2) {
        const targetFogDensity = isNightBlindfolded
          ? 0.115
          : activeDeathCinematic
          ? 0.085
          : isDay
          ? activeBiomeKey === 'forest'
            ? 0.0155
            : activeBiomeKey === 'frostpeak'
            ? 0.0115
            : 0.0068
          : activeBiomeKey === 'forest'
          ? 0.0205
          : 0.0155;
        scene.fog.color.copy(scene.background as THREE.Color);
        scene.fog.density = isSoftwareGl
          ? targetFogDensity
          : THREE.MathUtils.damp(scene.fog.density, targetFogDensity, 6, dt);
      }

      hemiLight.color.setHex(isDay ? biome.dayHemiSky : biome.nightHemiSky);
      hemiLight.groundColor.setHex(isDay ? biome.dayHemiGround : biome.nightHemiGround);
      const targetHemi = isDay
        ? activeBiomeKey === 'forest'
          ? 1.05
          : 1.38
        : isNightBlindfolded
        ? 0.015
        : activeDeathCinematic
        ? 0.14
        : 0.42;
      const targetDir = isDay
        ? activeBiomeKey === 'forest'
          ? 1.65
          : 2.15
        : isNightBlindfolded
        ? 0.0
        : activeDeathCinematic
        ? 0.18
        : 0.58;
      hemiLight.intensity = isSoftwareGl
        ? targetHemi
        : THREE.MathUtils.damp(hemiLight.intensity, targetHemi, 5.5, dt);
      dirLight.intensity = isSoftwareGl
        ? targetDir
        : THREE.MathUtils.damp(dirLight.intensity, targetDir, 5.5, dt);
      dirLight.color.setHex(isDay ? biome.daySunColor : biome.nightMoonLight);
      rimLight.intensity = isDay ? 0.52 : isNightBlindfolded ? 0.0 : activeDeathCinematic ? 0.22 : 0.35;

      // Update Procedural Agrou Environment (Terrain, Sky Dome, River, Redwoods, Campfire, Fireflies/Embers)
      envHandle.update({
        biomeKey: activeBiomeKey,
        isDay,
        isNightBlindfolded,
        isTitleScreen: st.isTitleScreen,
        isVotingPhase,
        isAbstaining,
        hoveredCampfire: st.hoveredCampfire,
        elapsed: elapsedTotal,
        simDt,
        dt,
        isSoftwareGl,
      });

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

      if (st.needsDawnReset) {
        st.needsDawnReset = false;
        nightDirector.hardResetSeats(seats);
      }

      // Spawn New Detailed Composite 3D Thrown Prop Projectiles (launched from right hand / FPV hand!)
      for (const propEv of st.thrownProps) {
        if (!processedPropsRef.current.has(propEv.id)) {
          processedPropsRef.current.add(propEv.id);
          const fromIdx = activePlayers.findIndex((p) => p.id === propEv.fromId);
          const toIdx = activePlayers.findIndex((p) => p.id === propEv.toId);
          if (fromIdx !== -1 && toIdx !== -1 && seats[fromIdx] && seats[toIdx]) {
            seats[fromIdx].throwAnimTimer = 0.55;
            const isFromMe = propEv.fromId === st.userPlayerId;
            if (isFromMe) {
              st.fpvThrowSwingTimer = 0.52;
            }
            const { group: propGroup, trailGroup, trailParticles } = createCompositePropGroup(propEv.propType);
            let sPos: THREE.Vector3;
            if (isFromMe && st.cameraPreset === 'first_person') {
              const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
              const rgt = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
              sPos = camera.position.clone().addScaledVector(fwd, 0.72).addScaledVector(rgt, 0.24);
              sPos.y -= 0.14;
            } else {
              const handWorld = new THREE.Vector3();
              seats[fromIdx].rightArm.getWorldPosition(handWorld);
              sPos = handWorld.lengthSq() > 0.01
                ? handWorld.add(new THREE.Vector3(0, 0.12, 0))
                : seats[fromIdx].currentPos.clone().add(new THREE.Vector3(0, 1.45, 0));
            }
            const ePos = seats[toIdx].currentPos.clone().add(new THREE.Vector3(0, 1.32, 0));
            const horizDist = Math.max(1.0, Math.hypot(ePos.x - sPos.x, ePos.z - sPos.z));
            seats[fromIdx].throwTargetYaw = Math.atan2(
              ePos.x - seats[fromIdx].currentPos.x,
              ePos.z - seats[fromIdx].currentPos.z
            );
            const flightDuration = 0.26 + horizDist * 0.032;
            const apexHeight = Math.min(2.6, 0.45 + horizDist * 0.22);
            propGroup.position.copy(sPos);
            scene.add(propGroup);
            scene.add(trailGroup);
            sound.playThrowWhoosh(propEv.propType, { x: sPos.x, y: sPos.y, z: sPos.z });
            activeProjectiles.push({
              id: propEv.id,
              group: propGroup,
              trailGroup,
              trailParticles,
              startPos: sPos,
              endPos: ePos,
              targetSeatIndex: toIdx,
              propType: propEv.propType,
              progress: 0,
              flightDuration,
              apexHeight,
            });
          }
        }
      }

      // Animate Active Flying Projectiles (distance-scaled arc + world-space velocity trails!)
      for (let i = activeProjectiles.length - 1; i >= 0; i--) {
        const proj = activeProjectiles[i];
        const prevP = proj.progress;
        proj.progress += simDt / proj.flightDuration;
        if (proj.progress >= 1) {
          scene.remove(proj.group);
          scene.remove(proj.trailGroup);
          const hitSeat = seats[proj.targetSeatIndex];
          const impactX = hitSeat ? hitSeat.currentPos.x : proj.endPos.x;
          const impactY = hitSeat ? hitSeat.currentPos.y + 1.25 : proj.endPos.y;
          const impactZ = hitSeat ? hitSeat.currentPos.z : proj.endPos.z;
          if (hitSeat) {
            const dx = proj.endPos.x - proj.startPos.x;
            const dz = proj.endPos.z - proj.startPos.z;
            const dLen = Math.hypot(dx, dz) || 1;
            hitSeat.hitRecoilX = dx / dLen;
            hitSeat.hitRecoilZ = dz / dLen;
            hitSeat.hitRecoilTimer = 0.24;
            hitSeat.wobbleTimer = 0.65;
            hitSeat.reactionType =
              proj.propType === 'rose'
                ? 'happy_dance'
                : proj.propType === 'egg'
                ? 'egg_disgust'
                : proj.propType === 'water'
                ? 'water_shiver'
                : 'tomato_splat';
            hitSeat.reactionTimer = 4.6;
            if (proj.propType === 'water') {
              hitSeat.wetTimer = 4.5;
            }
          }
          spawnPropImpactEffect(proj.targetSeatIndex, proj.propType);
          st.trauma = Math.min(1, st.trauma + (proj.propType === 'rose' ? 0.15 : 0.35));
          st.hitstop = 0.04;
          const impactPos = { x: impactX, y: impactY, z: impactZ };
          sound.playPropSplat(proj.propType, impactPos);
          sound.playPropVictimReaction(proj.propType, impactPos);
          activeProjectiles.splice(i, 1);
        } else {
          _arcPrevPos.lerpVectors(proj.startPos, proj.endPos, prevP);
          _arcPrevPos.y += Math.sin(prevP * Math.PI) * proj.apexHeight;
          _arcPos.lerpVectors(proj.startPos, proj.endPos, proj.progress);
          _arcPos.y += Math.sin(proj.progress * Math.PI) * proj.apexHeight;
          proj.group.position.copy(_arcPos);
          if (proj.propType === 'water') {
            // Orient liquid splash sheet cleanly along velocity vector
            _velVec.subVectors(_arcPos, _arcPrevPos);
            if (_velVec.lengthSq() > 1e-6) {
              proj.group.lookAt(_arcPos.x + _velVec.x, _arcPos.y + _velVec.y, _arcPos.z + _velVec.z);
            }
          } else {
            proj.group.rotation.x += simDt * 11;
            proj.group.rotation.z += simDt * 8;
          }
          // Trail particles follow smoothly behind along actual world flight trajectory
          for (let idx = 0; idx < proj.trailParticles.length; idx++) {
            const tp = proj.trailParticles[idx];
            const tLag = Math.max(0, proj.progress - (idx + 1) * 0.065);
            _arcPrevPos.lerpVectors(proj.startPos, proj.endPos, tLag);
            _arcPrevPos.y += Math.sin(tLag * Math.PI) * proj.apexHeight;
            tp.position.set(
              _arcPrevPos.x + Math.sin(elapsedTotal * 12 + idx * 1.9) * 0.04,
              _arcPrevPos.y + Math.cos(elapsedTotal * 10 + idx) * 0.03,
              _arcPrevPos.z + Math.cos(elapsedTotal * 12 + idx * 1.9) * 0.04
            );
            tp.rotation.set(elapsedTotal * 5 + idx, elapsedTotal * 4, 0);
          }
        }
      }

      // Animate Active Impact Splat Effects
      for (let i = activeSplats.length - 1; i >= 0; i--) {
        const splat = activeSplats[i];
        splat.age += simDt;
        const targetSeat = seats[splat.targetSeatIndex];
        if (targetSeat) {
          splat.group.position.copy(targetSeat.currentPos);
        }
        if (splat.age >= splat.maxAge) {
          splat.attachedParent?.remove(splat.bodySplatMesh);
          scene.remove(splat.group);
          activeSplats.splice(i, 1);
          continue;
        }
        for (const pt of splat.particles) {
          if (pt.isFloatingGas) {
            pt.mesh.position.y += 0.82 * simDt;
            pt.mesh.position.x += Math.sin(elapsedTotal * 5 + pt.vx) * 0.28 * simDt;
          } else if (pt.isFlutterPetal) {
            pt.vy = Math.max(-0.52, pt.vy - 1.9 * simDt);
            pt.mesh.position.x += (pt.vx * 0.28 + Math.sin(elapsedTotal * 4.5 + pt.vz) * 0.26) * simDt;
            pt.mesh.position.y = Math.max(0.06, pt.mesh.position.y + pt.vy * simDt);
            pt.mesh.position.z += (pt.vz * 0.28 + Math.cos(elapsedTotal * 4.0 + pt.vx) * 0.22) * simDt;
          } else {
            pt.vy -= 9.8 * simDt;
            pt.mesh.position.x += pt.vx * simDt;
            pt.mesh.position.y += pt.vy * simDt;
            pt.mesh.position.z += pt.vz * simDt;
            if (pt.mesh.position.y < 0.06) {
              pt.mesh.position.y = 0.06;
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

      // Compute Latest Vote Lookup Map so Seated Adventurers Physically Point at Their Suspect!
      const latestVoteByVoter = new Map<string, string>();
      for (const v of st.votes) {
        if (v.voterId && v.targetId) latestVoteByVoter.set(v.voterId, v.targetId);
      }

      // Compute Dynamic Campfire Seating Circle Radius (expands cleanly for 10-20 players!)
      const radius = computeCampfireCircleRadius(count);

      // Compute WASD / Mobile D-Pad, Sprint (Shift), Crouch (Ctrl), Jump (Space) & Responsive Camera Framing
      const viewportAspect =
        container && container.clientHeight > 0
          ? container.clientWidth / container.clientHeight
          : window.innerWidth / Math.max(1, window.innerHeight);
      const responsiveFraming = computeResponsiveCameraFraming({
        aspect: viewportAspect,
        baseFov: 46,
        villageRadius: radius + 0.75,
      });
      const isFirstPerson =
        !st.isTitleScreen && !activeDeathCinematic && st.cameraPreset === 'first_person';
      const isThirdPerson =
        !st.isTitleScreen && !activeDeathCinematic && st.cameraPreset === 'third_person';
      const isDirectLook = isFirstPerson || isThirdPerson;
      const isUserGhost = !st.isTitleScreen && !activeDeathCinematic && Boolean(me && !me.isAlive);
      const canTitleOrbit = st.isTitleScreen && Boolean(st.allowTitleOrbit);

      // Clear any lingering drag/cursor state if a blocking overlay opens mid-drag
      if (
        (st.isTitleScreen ? !canTitleOrbit : st.isUiOverlayOpen) &&
        (isPointerDown || st.isDraggingOrbit)
      ) {
        isPointerDown = false;
        activePointerId = null;
        activePointerButton = 0;
        dragDistance = 0;
        st.isDraggingOrbit = false;
        renderer.domElement.style.cursor = '';
      }

      const isSprinting =
        st.keysPressed.has('ShiftLeft') || st.keysPressed.has('ShiftRight');
      const isLivingSprinting = !isUserGhost && isSprinting;
      const isCrouching =
        !isUserGhost &&
        (st.keysPressed.has('ControlLeft') ||
          st.keysPressed.has('ControlRight') ||
          st.crouchToggled);

      let inputX = st.isUiOverlayOpen ? 0 : st.moveVector.x;
      let inputZ = st.isUiOverlayOpen ? 0 : st.moveVector.z;
      if (!st.isUiOverlayOpen) {
        if (st.keysPressed.has('KeyW') || st.keysPressed.has('ArrowUp')) inputZ -= 1;
        if (st.keysPressed.has('KeyS') || st.keysPressed.has('ArrowDown')) inputZ += 1;
        if (st.keysPressed.has('KeyA') || st.keysPressed.has('ArrowLeft')) inputX -= 1;
        if (st.keysPressed.has('KeyD') || st.keysPressed.has('ArrowRight')) inputX += 1;
      }

      const hasMoveInput = Math.hypot(inputX, inputZ) > 0.05;
      const targetFov = isFirstPerson
        ? 62 + (isLivingSprinting && hasMoveInput && !isCrouching ? 5.5 : isCrouching ? -2.5 : 0)
        : isThirdPerson
        ? 56 + (isLivingSprinting && hasMoveInput && !isCrouching ? 4.5 : isCrouching ? -2.0 : 0)
        : responsiveFraming.targetFov;
      if (Math.abs(camera.fov - targetFov) > 0.05) {
        camera.fov = THREE.MathUtils.damp(camera.fov, targetFov, 10, dt);
        camera.updateProjectionMatrix();
      }

      // Release Pointer Lock cleanly when UI overlays, title screen, blindfold, or cinematics activate
      if (st.releasePointerLockFlag || st.isUiOverlayOpen || st.isTitleScreen || isNightBlindfolded || activeDeathCinematic) {
        st.releasePointerLockFlag = false;
        if (document.pointerLockElement === renderer.domElement) {
          releaseCanvasPointerLock();
        }
      }

      // Mobile touch turn buttons only (KeyE is strictly reserved for interact; KeyQ for Ghost descend)
      const turnInput = st.isUiOverlayOpen ? 0 : st.fpvLookTurnRate || 0;
      if (Math.abs(turnInput) > 0.01) {
        if (isDirectLook) {
          st.fpvYaw -= turnInput * 2.1 * dt;
        } else {
          st.azimuthAngle -= turnInput * 1.8 * dt;
        }
      }

      // Continuous Screen-Edge Turn while Dragging near Left/Right viewport border (solves edge-lockout 360°!)
      if (
        st.isDraggingOrbit &&
        isPointerDown &&
        !st.isPointerLocked &&
        (canTitleOrbit || (!st.isUiOverlayOpen && !st.isTitleScreen)) &&
        !isNightBlindfolded &&
        !activeDeathCinematic
      ) {
        const rect = renderer.domElement.getBoundingClientRect();
        const edgeRate = computeDragEdgePanRate({
          clientX: lastDragClientX,
          viewportLeft: rect.left,
          viewportWidth: rect.width,
        });
        if (Math.abs(edgeRate) > 0.001) {
          if (isDirectLook && !st.isTitleScreen) {
            st.fpvYaw += edgeRate * dt;
          } else {
            st.azimuthAngle += edgeRate * dt;
          }
        }
      }

      // Living actors only roam during Day Discussion; living night actors cast from stools while keeping 360° look (Ghosts keep free-flight 24/7!)
      const canUserRoamAlive =
        !st.isTitleScreen &&
        !st.isUiOverlayOpen &&
        !isNightBlindfolded &&
        !activeDeathCinematic &&
        Boolean(me?.isAlive) &&
        st.phase === 'day_discussion';

      // Build zero-GC per-frame collision list (static biome obstacles + seated villager/stool circles)
      _activeObstacles.length = 0;
      const staticEnvObstacles = envHandle.getObstacles(activeBiomeKey);
      for (let oi = 0; oi < staticEnvObstacles.length; oi++) {
        _activeObstacles.push(staticEnvObstacles[oi]);
      }
      const mySeatIdxNow = activePlayers.findIndex((pl) => pl.id === st.userPlayerId);
      const mySeatNow = mySeatIdxNow !== -1 ? seats[mySeatIdxNow] : null;
      for (let sj = 0; sj < count && sj < MAX_SEATS; sj++) {
        const sAng = Math.PI / 2 + (sj / count) * Math.PI * 2;
        const sx = Math.cos(sAng) * radius;
        const sz = Math.sin(sAng) * radius;
        // Skip own stool within 0.65m so standing up / sitting back down glides smoothly
        if (
          sj === mySeatIdxNow &&
          mySeatNow &&
          Math.hypot(mySeatNow.currentPos.x - sx, mySeatNow.currentPos.z - sz) < 0.65
        ) {
          continue;
        }
        const sOb = _stoolObstaclePool[sj];
        sOb.x = sx;
        sOb.z = sz;
        _activeObstacles.push(sOb);
      }

      // Update Adventurers, Stationary Stools, Articulated Stand/Walk/Jump/Crouch, Head Tracking & Spectral Ghosts
      for (let i = 0; i < MAX_SEATS; i++) {
        const seat = seats[i];
        if (i >= count) {
          seat.group.visible = false;
          seat.seatAnchorGroup.visible = false;
          seat.ghostGroup.visible = false;
          seat.playerId = '';
          seat.hitbox.userData.playerId = '';
          seat.ghostGroup.userData.playerId = '';
          seat.ghostHitbox.userData.playerId = '';
          continue;
        }

        const p = activePlayers[i];
        seat.playerId = p.id;
        seat.hitbox.userData.playerId = p.id;
        seat.ghostGroup.userData.playerId = p.id;
        seat.ghostHitbox.userData.playerId = p.id;
        const isMe = p.id === st.userPlayerId;

        const angle = Math.PI / 2 + (i / count) * Math.PI * 2;
        seat.baseAngle = angle;
        const hx = Math.cos(angle) * radius;
        const hz = Math.sin(angle) * radius;
        const homeGroundY = sampleTerrainHeight(hx, hz, activeBiomeKey);
        seat.homePos.set(hx, homeGroundY, hz);

        // Keep wooden stool & tombstone permanently anchored at homePos!
        seat.seatAnchorGroup.position.set(hx, homeGroundY, hz);
        seat.seatAnchorGroup.rotation.y = -angle - Math.PI / 2;

        // During blindfolded night, hide all other players & stools so ONLY the glowing campfire shines!
        // STRICT ANTI-LEAK: Only show killer mesh in short-film cinematic if revealKiller === true (e.g. wolf viewer)!
        const isDeathVictim = Boolean(activeDeathCinematic && p.id === activeDeathCinematic.victimId);
        const isDeathKiller = Boolean(
          activeDeathCinematic &&
            activeDeathCinematic.revealKiller &&
            activeDeathCinematic.killerId &&
            p.id === activeDeathCinematic.killerId
        );
        if (isNightBlindfolded) {
          seat.group.visible = false;
          seat.seatAnchorGroup.visible = false;
        } else if (activeDeathCinematic) {
          seat.group.visible = isDeathVictim || isDeathKiller;
          seat.seatAnchorGroup.visible = isDeathVictim;
        } else {
          seat.group.visible = true;
          seat.seatAnchorGroup.visible = true;
        }

        if (seat.currentPos.lengthSq() < 0.01) {
          seat.currentPos.copy(seat.homePos);
          seat.ghostPos.set(hx, 2.2, hz);
        }

        const prevPosX = seat.currentPos.x;
        const prevPosZ = seat.currentPos.z;
        const prevWalkPhase = seat.walkPhase;
        let moveSpeedRatio = 0;
        let landedThisFrame = false;

        // Inward vector toward campfire so standing up steps 0.48m clear of the wooden stool top!
        const inwardX = -Math.cos(angle);
        const inwardZ = -Math.sin(angle);

        if (isMe && canUserRoamAlive) {
          const curGroundY = sampleTerrainHeight(seat.currentPos.x, seat.currentPos.z, activeBiomeKey);
          const wading = computeRiverWadingState(activeBiomeKey, curGroundY);

          // Step jump & crouch vertical physics
          const vPhys = stepCharacterVerticalPhysics({
            yOffset: seat.yOffset,
            vy: seat.vy,
            isGrounded: seat.isGrounded,
            crouchBlend: seat.crouchBlend,
            jumpRequested: st.jumpQueued,
            isCrouching,
            canJump: true,
            dt: simDt,
          });
          st.jumpQueued = false;
          seat.yOffset = vPhys.yOffset;
          seat.vy = vPhys.vy;
          seat.isGrounded = vPhys.isGrounded;
          seat.crouchBlend = Math.min(vPhys.crouchBlend, wading.maxCrouchBlend);
          if (vPhys.landedThisFrame) {
            landedThisFrame = true;
            seat.landingCompress = 1.0;
            st.trauma = Math.min(0.4, st.trauma + 0.14);
          }

          if (hasMoveInput) {
            st.isUserRoaming = true;
            st.dashTargetPos = null;
            const speedMult = (isCrouching ? 0.56 : isSprinting ? 1.62 : 1.0) * wading.speedMultiplier;
            const moveSpeed = 5.4 * speedMult;
            moveSpeedRatio = speedMult;

            if (isDirectLook) {
              const step = computeFpvMovementStep({
                yaw: st.fpvYaw,
                inputX,
                inputZ,
                speed: moveSpeed,
                dt: simDt,
                currentX: seat.currentPos.x,
                currentZ: seat.currentPos.z,
                maxRadius: 23.5,
              });
              const resolved = resolveObstaclesCollision(step.nextX, step.nextZ, 0.36, _activeObstacles);
              seat.currentPos.x = resolved.x;
              seat.currentPos.z = resolved.z;
              const targetBodyYaw = Math.atan2(step.moveWorldX, step.moveWorldZ) - seat.group.rotation.y;
              const diff = Math.atan2(
                Math.sin(targetBodyYaw - seat.bodyGroup.rotation.y),
                Math.cos(targetBodyYaw - seat.bodyGroup.rotation.y)
              );
              seat.bodyGroup.rotation.y += diff * (1 - Math.exp(-12 * dt));
            } else {
              const cosA = Math.cos(st.azimuthAngle);
              const sinA = Math.sin(st.azimuthAngle);
              const moveWorldX = inputX * cosA + inputZ * sinA;
              const moveWorldZ = -inputX * sinA + inputZ * cosA;
              const mag = Math.hypot(moveWorldX, moveWorldZ) || 1;
              const nx = moveWorldX / mag;
              const nz = moveWorldZ / mag;
              const { nextX, nextZ } = clampAndSlideCampfireCollision({
                currentX: seat.currentPos.x,
                currentZ: seat.currentPos.z,
                moveWorldX: nx,
                moveWorldZ: nz,
                stepDist: moveSpeed * simDt,
                minRadius: 1.9,
                maxRadius: 23.5,
              });
              const resolved = resolveObstaclesCollision(nextX, nextZ, 0.36, _activeObstacles);
              seat.currentPos.x = resolved.x;
              seat.currentPos.z = resolved.z;
              const targetBodyYaw = Math.atan2(nx, nz) - seat.group.rotation.y;
              const diff = Math.atan2(
                Math.sin(targetBodyYaw - seat.bodyGroup.rotation.y),
                Math.cos(targetBodyYaw - seat.bodyGroup.rotation.y)
              );
              seat.bodyGroup.rotation.y += diff * (1 - Math.exp(-12 * dt));
            }
          } else if (st.dashTargetPos) {
            const dx = st.dashTargetPos.x - seat.currentPos.x;
            const dz = st.dashTargetPos.z - seat.currentPos.z;
            const dDist = Math.hypot(dx, dz);
            if (dDist > 0.14) {
              moveSpeedRatio = 1.25 * wading.speedMultiplier;
              const stepAmt = Math.min(dDist, 7.2 * wading.speedMultiplier * simDt);
              const rawX = seat.currentPos.x + (dx / dDist) * stepAmt;
              const rawZ = seat.currentPos.z + (dz / dDist) * stepAmt;
              const resolved = resolveObstaclesCollision(rawX, rawZ, 0.36, _activeObstacles);
              const moved = Math.hypot(resolved.x - seat.currentPos.x, resolved.z - seat.currentPos.z);
              seat.currentPos.x = resolved.x;
              seat.currentPos.z = resolved.z;
              if (moved < stepAmt * 0.18 && dDist < 1.35) {
                // Target is inside an obstacle; stop cleanly at the perimeter
                st.dashTargetPos = null;
              } else {
                const targetBodyYaw = Math.atan2(dx, dz) - seat.group.rotation.y;
                const diff = Math.atan2(
                  Math.sin(targetBodyYaw - seat.bodyGroup.rotation.y),
                  Math.cos(targetBodyYaw - seat.bodyGroup.rotation.y)
                );
                seat.bodyGroup.rotation.y += diff * (1 - Math.exp(-10 * dt));
              }
            } else {
              st.dashTargetPos = null;
            }
          } else if (!st.isUserRoaming) {
            const distHome = Math.hypot(
              seat.homePos.x - seat.currentPos.x,
              seat.homePos.z - seat.currentPos.z
            );
            if (distHome > 0.12) {
              moveSpeedRatio = 0.95;
              const toHomeYaw =
                Math.atan2(seat.homePos.x - seat.currentPos.x, seat.homePos.z - seat.currentPos.z) -
                seat.group.rotation.y;
              const diff = Math.atan2(
                Math.sin(toHomeYaw - seat.bodyGroup.rotation.y),
                Math.cos(toHomeYaw - seat.bodyGroup.rotation.y)
              );
              seat.bodyGroup.rotation.y += diff * (1 - Math.exp(-10 * dt));
            } else {
              seat.bodyGroup.rotation.y = THREE.MathUtils.damp(seat.bodyGroup.rotation.y, 0, 7, dt);
            }
            seat.currentPos.lerp(seat.homePos, 1 - Math.exp(-6.5 * simDt));
          } else {
            // Stool Stand-Up Step-In: clear wooden stool top (0.48m inward) when standing up in place!
            const distFromHome = Math.hypot(
              seat.currentPos.x - seat.homePos.x,
              seat.currentPos.z - seat.homePos.z
            );
            if (seat.standFactor > 0.2 && distFromHome < 0.45) {
              const stepInX = seat.homePos.x + inwardX * 0.48;
              const stepInZ = seat.homePos.z + inwardZ * 0.48;
              const stepLerp = 1 - Math.exp(-10 * simDt);
              seat.currentPos.x += (stepInX - seat.currentPos.x) * stepLerp;
              seat.currentPos.z += (stepInZ - seat.currentPos.z) * stepLerp;
            }
            if (isThirdPerson) {
              // While standing idle in behind-the-back view, smoothly align character facing with aim yaw
              const targetBodyYaw = st.fpvYaw - seat.group.rotation.y;
              const diff = Math.atan2(
                Math.sin(targetBodyYaw - seat.bodyGroup.rotation.y),
                Math.cos(targetBodyYaw - seat.bodyGroup.rotation.y)
              );
              seat.bodyGroup.rotation.y += diff * (1 - Math.exp(-9 * dt));
            }
          }

          if (isCrouching && !st.isUserRoaming) {
            st.isUserRoaming = true;
          }
        } else if (isDeathKiller && activeDeathCinematic) {
          // Killer emerges dramatically from darkness toward the victim!
          const victimIdx = activePlayers.findIndex((pl) => pl.id === activeDeathCinematic.victimId);
          const victimSeat = victimIdx !== -1 ? seats[victimIdx] : null;
          if (victimSeat) {
            const vHome = victimSeat.homePos;
            const inwardDir = new THREE.Vector3(-vHome.x, 0, -vHome.z).normalize();
            const lungeT = Math.min(1, st.deathCinematicElapsed / 1.15);
            const distFromVictim = THREE.MathUtils.lerp(3.6, 1.25, lungeT * lungeT);
            seat.currentPos.set(
              vHome.x + inwardDir.x * distFromVictim,
              sampleTerrainHeight(vHome.x + inwardDir.x * distFromVictim, vHome.z + inwardDir.z * distFromVictim, activeBiomeKey),
              vHome.z + inwardDir.z * distFromVictim
            );
            moveSpeedRatio = lungeT < 0.95 ? 1.35 : 0;
            const aimToVictim = Math.atan2(vHome.x - seat.currentPos.x, vHome.z - seat.currentPos.z);
            seat.bodyGroup.rotation.y = aimToVictim - (-angle - Math.PI / 2);
          }
        } else if (
          isMe &&
          st.isUiOverlayOpen &&
          st.isUserRoaming &&
          me?.isAlive &&
          !st.isTitleScreen &&
          !isNightBlindfolded &&
          !activeDeathCinematic
        ) {
          // Hold current standing spot cleanly while a modal/drawer is open (no movement, no snap-back)
          st.jumpQueued = false;
        } else {
          seat.yOffset = 0;
          seat.vy = 0;
          seat.isGrounded = true;
          seat.crouchBlend = THREE.MathUtils.damp(seat.crouchBlend, 0, 8, dt);
          if (!seat.nightCutsceneOverride) {
            seat.currentPos.lerp(seat.homePos, 1 - Math.exp(-6 * simDt));
            if (seat.reactionTimer <= 0) {
              seat.bodyGroup.rotation.y = THREE.MathUtils.damp(seat.bodyGroup.rotation.y, 0, 5, dt);
            }
          }
        }

        // Sample terrain height cleanly at character's current XZ position
        const groundY = sampleTerrainHeight(seat.currentPos.x, seat.currentPos.z, activeBiomeKey);
        seat.currentPos.y = groundY;
        seat.group.position.set(seat.currentPos.x, groundY, seat.currentPos.z);
        seat.group.rotation.y = -angle - Math.PI / 2;

        // Slope-aligned Contact Shadows & Halo Rings on outer hills (r > 11.4m)
        const charR = Math.hypot(seat.currentPos.x, seat.currentPos.z);
        if (charR > 11.4) {
          const eps = 0.35;
          const dhdx =
            (sampleTerrainHeight(seat.currentPos.x + eps, seat.currentPos.z, activeBiomeKey) -
              sampleTerrainHeight(seat.currentPos.x - eps, seat.currentPos.z, activeBiomeKey)) /
            (2 * eps);
          const dhdz =
            (sampleTerrainHeight(seat.currentPos.x, seat.currentPos.z + eps, activeBiomeKey) -
              sampleTerrainHeight(seat.currentPos.x, seat.currentPos.z - eps, activeBiomeKey)) /
            (2 * eps);
          const cosG = Math.cos(seat.group.rotation.y);
          const sinG = Math.sin(seat.group.rotation.y);
          const localSlopeX = dhdx * cosG - dhdz * sinG;
          const localSlopeZ = dhdx * sinG + dhdz * cosG;
          const tiltX = -Math.PI / 2 - THREE.MathUtils.clamp(Math.atan(localSlopeZ), -0.45, 0.45);
          const tiltY = THREE.MathUtils.clamp(Math.atan(localSlopeX), -0.45, 0.45);
          seat.shadowDisc.rotation.set(tiltX, tiltY, 0);
          seat.haloRing.rotation.set(tiltX, tiltY, 0);
        } else {
          seat.shadowDisc.rotation.set(-Math.PI / 2, 0, 0);
          seat.haloRing.rotation.set(-Math.PI / 2, 0, 0);
        }

        // Smooth Seated <-> Standing articulation: stool stays anchored while character stands up & walks!
        const distFromStool = Math.hypot(
          seat.currentPos.x - seat.homePos.x,
          seat.currentPos.z - seat.homePos.z
        );
        const shouldStand =
          isDeathKiller ||
          (isMe &&
            (canUserRoamAlive || (st.isUiOverlayOpen && st.isUserRoaming && Boolean(me?.isAlive))) &&
            (st.isUserRoaming || distFromStool > 0.22 || seat.yOffset > 0.03 || seat.crouchBlend > 0.05));
        seat.standFactor = THREE.MathUtils.damp(seat.standFactor, shouldStand ? 1 : 0, 9.5, dt);

        // Distance-Driven Stride (zero foot-skating!) + Spatial Footsteps + Surface VFX / River Ripples
        const actualHorizDist = Math.hypot(seat.currentPos.x - prevPosX, seat.currentPos.z - prevPosZ);
        if (actualHorizDist > 0.0005 && seat.isGrounded) {
          seat.walkPhase += actualHorizDist * 4.1;
        } else {
          seat.walkPhase = THREE.MathUtils.damp(seat.walkPhase, Math.round(seat.walkPhase / Math.PI) * Math.PI, 8, dt);
        }

        if (isMe && canUserRoamAlive) {
          const surface = getFootstepSurface(activeBiomeKey, seat.currentPos.x, seat.currentPos.z, groundY);
          const steppedHalfStride =
            seat.isGrounded &&
            actualHorizDist > 0.002 &&
            Math.floor(prevWalkPhase / Math.PI) !== Math.floor(seat.walkPhase / Math.PI);
          const facingYaw = seat.group.rotation.y + seat.bodyGroup.rotation.y;

          if (steppedHalfStride) {
            sound.playFootstep(surface, isLivingSprinting, false);
            if (surface === 'water') {
              spawnWaterRipple(seat.currentPos.x, seat.currentPos.z);
              for (let d = 0; d < 2; d++) {
                const a = Math.random() * Math.PI * 2;
                spawnSurfaceVfx(
                  'splash',
                  seat.currentPos.x,
                  -0.18,
                  seat.currentPos.z,
                  Math.cos(a) * 1.1,
                  1.5 + Math.random() * 0.8,
                  Math.sin(a) * 1.1,
                  a,
                  0.45,
                  0.65
                );
              }
            } else if (surface === 'snow') {
              const footSide = Math.floor(seat.walkPhase / Math.PI) % 2 === 0 ? -0.14 : 0.14;
              spawnSurfaceVfx(
                'snowprint',
                seat.currentPos.x + Math.cos(facingYaw) * footSide,
                groundY + 0.025,
                seat.currentPos.z - Math.sin(facingYaw) * footSide,
                0,
                0,
                0,
                facingYaw,
                8.0,
                1.25
              );
            } else if (surface === 'dirt' && isLivingSprinting) {
              for (let d = 0; d < 2; d++) {
                spawnSurfaceVfx(
                  'dust',
                  seat.currentPos.x + (Math.random() - 0.5) * 0.25,
                  groundY + 0.08,
                  seat.currentPos.z + (Math.random() - 0.5) * 0.25,
                  (Math.random() - 0.5) * 0.5,
                  0.55 + Math.random() * 0.4,
                  (Math.random() - 0.5) * 0.5,
                  Math.random() * Math.PI,
                  0.55,
                  0.9
                );
              }
            }
          }

          if (landedThisFrame) {
            sound.playFootstep(surface, isLivingSprinting, true);
            if (surface === 'water') {
              spawnWaterRipple(seat.currentPos.x, seat.currentPos.z);
              for (let d = 0; d < 4; d++) {
                const a = (d / 4) * Math.PI * 2 + Math.random() * 0.5;
                spawnSurfaceVfx(
                  'splash',
                  seat.currentPos.x,
                  -0.18,
                  seat.currentPos.z,
                  Math.cos(a) * 1.6,
                  2.1 + Math.random() * 0.7,
                  Math.sin(a) * 1.6,
                  a,
                  0.5,
                  0.85
                );
              }
            } else {
              for (let d = 0; d < 4; d++) {
                const a = (d / 4) * Math.PI * 2 + Math.random() * 0.5;
                spawnSurfaceVfx(
                  surface === 'snow' ? 'frost' : 'dust',
                  seat.currentPos.x + Math.cos(a) * 0.15,
                  groundY + 0.08,
                  seat.currentPos.z + Math.sin(a) * 0.15,
                  Math.cos(a) * 1.1,
                  0.65 + Math.random() * 0.4,
                  Math.sin(a) * 1.1,
                  a,
                  0.6,
                  1.05
                );
              }
            }
          }
        }

        // Decay jump landing squash spring cleanly
        seat.landingCompress = THREE.MathUtils.damp(seat.landingCompress, 0, 12, dt);

        const standingHeadOffset = THREE.MathUtils.lerp(1.72, 2.02, seat.standFactor) - seat.crouchBlend * 0.25 + seat.yOffset;
        seat.worldPos.set(seat.currentPos.x, groundY + standingHeadOffset, seat.currentPos.z);

        // Hide own 3rd-person body mesh in First-Person View so camera is unobstructed
        seat.bodyGroup.visible = !(isMe && isFirstPerson);

        // Sync Custom Agrou Hat, Cloak Color (with wet water sheen) & Floating Golden Mayor Crown
        const fallbackCosm = getBotCosmetics(i);
        const activeHat: AgrouHatId = p.hat ?? fallbackCosm.hat;
        (Object.keys(seat.hatVariants) as AgrouHatId[]).forEach((hk) => {
          seat.hatVariants[hk].visible = hk === activeHat;
        });
        seat.cloakMat.color.setHex(p.cloakColor ?? fallbackCosm.cloakColor);
        if (seat.wetTimer > 0 && p.isAlive) {
          seat.wetTimer = Math.max(0, seat.wetTimer - simDt);
          const wetFactor = Math.min(1, seat.wetTimer / 1.0); // glossy for 3.5s, dries smoothly over final 1.0s
          seat.cloakMat.roughness = THREE.MathUtils.lerp(seat.baseCloakRoughness, 0.2, wetFactor);
          seat.cloakMat.color.multiplyScalar(THREE.MathUtils.lerp(1.0, 0.74, wetFactor));
        } else {
          seat.wetTimer = 0;
          seat.cloakMat.roughness = seat.baseCloakRoughness;
        }

        const isMayor = Boolean(st.mayorId && p.id === st.mayorId && p.isAlive);
        seat.mayorCrownGroup.visible = isMayor;
        if (isMayor) {
          seat.mayorCrownGroup.rotation.y += simDt * 1.9;
          seat.mayorCrownGroup.position.y = 1.62 + Math.sin(elapsedTotal * 3.5) * 0.04;
        }

        // Apply articulated leg & body pose (Seated on stool <-> Standing <-> Walk/Sprint <-> Crouch <-> Jump + Landing Squash!)
        const targetKo = p.isAlive && !isDeathVictim ? 0 : isDeathVictim && st.deathCinematicElapsed < 0.9 ? 0 : 1;
        seat.koProgress = THREE.MathUtils.damp(seat.koProgress, targetKo, 6, dt);
        applyAdventurerBodyPose(seat, {
          standFactor: seat.koProgress > 0.3 ? 0 : seat.standFactor,
          walkPhase: seat.walkPhase,
          moveSpeedRatio,
          crouchBlend: seat.crouchBlend,
          jumpHeight: seat.yOffset,
          landingCompress: seat.landingCompress,
          koProgress: seat.koProgress,
        });
        seat.bodyGroup.rotation.x = -seat.koProgress * 1.15;
        if (seat.koProgress > 0.01) {
          seat.bodyGroup.position.y -= seat.koProgress * 0.22;
        }

        const isWakingActor = Boolean(
          st.phase === 'night' &&
            !isNightBlindfolded &&
            !activeDeathCinematic &&
            p.isAlive &&
            st.wakingActorIds.includes(p.id)
        );

        seat.tombstoneGroup.visible = !p.isAlive && !activeDeathCinematic && !(isMe && isFirstPerson);
        seat.lanternMat.emissiveIntensity = p.isAlive
          ? isNightBlindfolded
            ? 0.08
            : isWakingActor
            ? 1.95
            : 1.4
          : 0.05;

        if (seat.reactionTimer > 0 && p.isAlive) {
          seat.reactionTimer = Math.max(0, seat.reactionTimer - simDt);
          if (seat.reactionTimer === 0) seat.reactionType = 'none';
        } else if (!p.isAlive) {
          seat.reactionTimer = 0;
          seat.reactionType = 'none';
        }
        if (seat.emoteTimer > 0 && p.isAlive) {
          seat.emoteTimer = Math.max(0, seat.emoteTimer - simDt);
          if (seat.emoteTimer === 0) seat.emoteType = null;
        } else if (!p.isAlive) {
          seat.emoteTimer = 0;
          seat.emoteType = null;
        }

        // Un-shadowed hit recoil & wobble decay BEFORE reaction branching!
        if (seat.hitRecoilTimer > 0) {
          seat.hitRecoilTimer = Math.max(0, seat.hitRecoilTimer - simDt);
        }
        if (seat.wobbleTimer > 0) {
          seat.wobbleTimer = Math.max(0, seat.wobbleTimer - simDt);
        }

        const isTomatoSplat = seat.reactionTimer > 0 && seat.reactionType === 'tomato_splat' && p.isAlive;
        const isEggDisgust = seat.reactionTimer > 0 && seat.reactionType === 'egg_disgust' && p.isAlive;
        const isWaterShiver = seat.reactionTimer > 0 && seat.reactionType === 'water_shiver' && p.isAlive;
        const isHappyDancing = seat.reactionTimer > 0 && seat.reactionType === 'happy_dance' && p.isAlive;
        const isAngryReacting = isTomatoSplat || isEggDisgust;
        const activeEmote = seat.emoteTimer > 0 && p.isAlive ? seat.emoteType : null;

        seat.angerAuraGroup.visible = isAngryReacting;
        seat.happyAuraGroup.visible = isHappyDancing;

        // Physical Voting Arm Pointing: triggers on voted target OR human's selected vote target!
        const votedTargetId = isVotingPhase
          ? latestVoteByVoter.get(p.id) || (isMe && st.selectedTargetId ? st.selectedTargetId : undefined)
          : undefined;
        const isPointingVote = Boolean(
          p.isAlive && votedTargetId && votedTargetId !== CAMPFIRE_ABSTAIN_ID
        );
        const isTitlePointing = st.isTitleScreen && p.isAlive && (i === 0 || i === 1 || i === 5);
        const isUnderHeavySuspicion =
          isVotingPhase && p.isAlive && (st.votesMap[p.id] || 0) >= 2 && !isPointingVote;
        const isHunterAiming = Boolean(
          isDeathKiller && activeDeathCinematic?.causeType === 'hunter_shot'
        );

        seat.musketGroup.visible = isHunterAiming;
        if (isHunterAiming) {
          const smokePulse = 0.85 + Math.sin(elapsedTotal * 8) * 0.25;
          seat.musketSmoke.scale.setScalar(smokePulse);
        }

        // Compute Exact Torso + Arm Aim toward Thrown Prop Target OR Voted Suspect!
        let targetTorsoYaw = 0;
        let targetArmAimYaw = 0;
        if (seat.throwAnimTimer > 0) {
          const relYaw = seat.throwTargetYaw - (seat.group.rotation.y + seat.bodyGroup.rotation.y);
          const normYaw = Math.atan2(Math.sin(relYaw), Math.cos(relYaw));
          targetTorsoYaw = THREE.MathUtils.clamp(normYaw, -1.15, 1.15);
        } else if (isPointingVote && votedTargetId) {
          const tIdx = activePlayers.findIndex((pl) => pl.id === votedTargetId);
          if (tIdx !== -1 && seats[tIdx]) {
            const dx = seats[tIdx].currentPos.x - seat.currentPos.x;
            const dz = seats[tIdx].currentPos.z - seat.currentPos.z;
            const worldAimYaw = Math.atan2(dx, dz);
            const relYaw = worldAimYaw - (seat.group.rotation.y + seat.bodyGroup.rotation.y);
            const normYaw = Math.atan2(Math.sin(relYaw), Math.cos(relYaw));
            targetTorsoYaw = THREE.MathUtils.clamp(normYaw * 0.72, -1.08, 1.08);
            targetArmAimYaw = THREE.MathUtils.clamp(normYaw - targetTorsoYaw, -0.78, 0.78);
          }
        } else if (isTitlePointing) {
          targetTorsoYaw = i === 1 ? -0.35 : 0.28;
        }
        seat.torsoGroup.rotation.y = THREE.MathUtils.damp(
          seat.torsoGroup.rotation.y,
          targetTorsoYaw,
          seat.throwAnimTimer > 0 ? 14 : 7.5,
          dt
        );

        // Distinct 4-Prop Victim Reactions, Directional Impact Recoil & Emote Body Modifiers!
        const activeHatGroup = seat.hatVariants[activeHat];
        if (seat.hitRecoilTimer > 0) {
          const imp = Math.sin((seat.hitRecoilTimer / 0.24) * Math.PI);
          const facing = seat.group.rotation.y + seat.bodyGroup.rotation.y;
          const localBack = -(seat.hitRecoilX * Math.sin(facing) + seat.hitRecoilZ * Math.cos(facing));
          const localSide = seat.hitRecoilX * Math.cos(facing) - seat.hitRecoilZ * Math.sin(facing);
          seat.torsoGroup.rotation.x += (-0.34 - localBack * 0.22) * imp;
          seat.bodyGroup.rotation.z = localSide * 0.32 * imp;
          if (activeHatGroup && activeHat !== 'none') {
            activeHatGroup.position.y = imp * 0.14;
            activeHatGroup.rotation.z = imp * 0.34;
          }
        } else {
          if (activeHatGroup && activeHat !== 'none') {
            activeHatGroup.position.y = THREE.MathUtils.damp(activeHatGroup.position.y, 0, 12, dt);
          }
          if (isTomatoSplat) {
            seat.bodyGroup.position.y += Math.abs(Math.sin(elapsedTotal * 14)) * 0.08;
            seat.bodyGroup.rotation.z = Math.sin(elapsedTotal * 22) * 0.14;
            seat.torsoGroup.rotation.x -= 0.12;
            seat.angerAuraGroup.rotation.y += simDt * 4.5;
          } else if (isEggDisgust) {
            // Hunched gagging cough posture
            seat.torsoGroup.rotation.x += 0.34 + Math.abs(Math.sin(elapsedTotal * 7.5)) * 0.16;
            seat.bodyGroup.rotation.z = Math.sin(elapsedTotal * 14) * 0.07;
            seat.angerAuraGroup.rotation.y += simDt * 3.8;
          } else if (isWaterShiver) {
            // High-frequency cold shivering
            seat.bodyGroup.rotation.z = Math.sin(elapsedTotal * 46) * 0.068;
            seat.torsoGroup.rotation.x += 0.14 + Math.sin(elapsedTotal * 38) * 0.03;
          } else if (isHappyDancing) {
            // Joyful spin dance!
            seat.bodyGroup.position.y += Math.abs(Math.sin(elapsedTotal * 11)) * 0.22;
            seat.bodyGroup.rotation.z = Math.sin(elapsedTotal * 11) * 0.16;
            seat.bodyGroup.rotation.y += simDt * 4.2;
            seat.happyAuraGroup.rotation.y += simDt * 3.6;
          } else if (activeEmote === 'dance') {
            seat.bodyGroup.position.y += Math.abs(Math.sin(elapsedTotal * 10)) * 0.18;
            seat.bodyGroup.rotation.z = Math.sin(elapsedTotal * 10) * 0.16;
          } else if (activeEmote === 'laugh') {
            seat.torsoGroup.rotation.x += -0.18 + Math.sin(elapsedTotal * 18) * 0.08;
            seat.bodyGroup.rotation.z = 0;
          } else if (activeEmote === 'panic' || isUnderHeavySuspicion) {
            seat.bodyGroup.rotation.z = Math.sin(elapsedTotal * 26 + i) * 0.09;
            seat.torsoGroup.rotation.x += -0.06;
          } else if (activeEmote === 'accuse' || isPointingVote || isTitlePointing) {
            seat.torsoGroup.rotation.x += 0.14;
            seat.bodyGroup.rotation.z = 0;
          } else if (seat.wobbleTimer > 0) {
            seat.bodyGroup.rotation.z = Math.sin(elapsedTotal * 36) * seat.wobbleTimer * 0.34;
          } else {
            seat.bodyGroup.rotation.z = THREE.MathUtils.damp(seat.bodyGroup.rotation.z, 0, 8, dt);
            seat.torsoGroup.rotation.x += p.isAlive
              ? Math.sin(elapsedTotal * 1.9 + i * 1.3) * 0.025 + (isWakingActor ? 0.08 : 0)
              : 0;
          }
        }

        // Subtle secondary rotational inertia lag on hipLantern & active hat from vertical & yaw velocity
        const yawVel =
          Math.atan2(
            Math.sin(seat.bodyGroup.rotation.y - seat.prevBodyYaw),
            Math.cos(seat.bodyGroup.rotation.y - seat.prevBodyYaw)
          ) / Math.max(dt, 0.008);
        seat.prevBodyYaw = seat.bodyGroup.rotation.y;
        seat.hipLantern.rotation.z = THREE.MathUtils.damp(
          seat.hipLantern.rotation.z,
          THREE.MathUtils.clamp(-yawVel * 0.06, -0.35, 0.35),
          10,
          dt
        );
        seat.hipLantern.rotation.x = THREE.MathUtils.damp(
          seat.hipLantern.rotation.x,
          THREE.MathUtils.clamp(seat.vy * 0.05, -0.32, 0.32),
          10,
          dt
        );
        if (activeHatGroup && activeHat !== 'none' && seat.hitRecoilTimer <= 0) {
          activeHatGroup.rotation.z = THREE.MathUtils.damp(
            activeHatGroup.rotation.z,
            THREE.MathUtils.clamp(-yawVel * 0.025, -0.14, 0.14),
            11,
            dt
          );
          activeHatGroup.rotation.x = THREE.MathUtils.damp(
            activeHatGroup.rotation.x,
            THREE.MathUtils.clamp(-seat.vy * 0.022, -0.15, 0.15),
            11,
            dt
          );
        }

        // Articulated Arm Poses (Throw Windup, 4 Distinct Prop Reactions, Clean Natural Voting Point!)
        const isSpeaking = st.activeSpeakers.includes(p.name) && p.isAlive;
        const isWalking = actualHorizDist > 0.003 || moveSpeedRatio > 0.08;
        // Keep natural hand pointing clean without bright cone glow on fingertip!
        seat.pointGlowMesh.visible = false;

        if (isDeathKiller && activeDeathCinematic) {
          if (activeDeathCinematic.causeType === 'werewolf') {
            const slashSwing = Math.sin(Math.min(1, st.deathCinematicElapsed * 2.2) * Math.PI);
            seat.rightArm.rotation.x = -2.35 + slashSwing * 1.65;
            seat.leftArm.rotation.x = -2.2 + slashSwing * 1.45;
            seat.rightArm.rotation.z = -0.35;
            seat.leftArm.rotation.z = 0.35;
          } else if (activeDeathCinematic.causeType === 'witch_poison') {
            seat.rightArm.rotation.x = -2.1 + Math.sin(elapsedTotal * 6) * 0.25;
            seat.leftArm.rotation.x = -1.2;
          }
          seat.rightArm.rotation.y = 0;
        } else if (seat.throwAnimTimer > 0) {
          seat.throwAnimTimer = Math.max(0, seat.throwAnimTimer - simDt);
          const normT = 1 - seat.throwAnimTimer / 0.55; // 0 -> 1
          // Phase 1 (0..0.32): Pull arm high back; Phase 2 (0.32..1.0): Whip arm forward!
          const throwX =
            normT < 0.32
              ? THREE.MathUtils.lerp(-0.4, -2.75, normT / 0.32)
              : THREE.MathUtils.lerp(-2.75, -0.15, (normT - 0.32) / 0.68);
          seat.rightArm.rotation.x = throwX;
          seat.rightArm.rotation.z = -0.25;
          seat.rightArm.rotation.y = 0;
          seat.leftArm.rotation.x = -0.7;
        } else if (isHunterAiming) {
          seat.rightArm.rotation.x = -1.45;
          seat.rightArm.rotation.y = 0;
          seat.rightArm.rotation.z = 0.15;
          seat.leftArm.rotation.x = -1.35;
          seat.leftArm.rotation.z = -0.35;
        } else if (isTomatoSplat) {
          // Right hand repeatedly wiping tomato off face while left arm braces back angrily
          seat.rightArm.rotation.x = -2.25 + Math.sin(elapsedTotal * 14) * 0.22;
          seat.rightArm.rotation.y = 0;
          seat.rightArm.rotation.z = 0.45 + Math.sin(elapsedTotal * 14) * 0.26;
          seat.leftArm.rotation.x = -0.85;
          seat.leftArm.rotation.z = 0.32;
        } else if (isEggDisgust) {
          // Right hand waving rapidly in front of nose swatting rising green stink cloud
          seat.rightArm.rotation.x = -1.95;
          seat.rightArm.rotation.y = 0;
          seat.rightArm.rotation.z = 0.25 + Math.sin(elapsedTotal * 17) * 0.52;
          seat.leftArm.rotation.x = -1.1;
          seat.leftArm.rotation.z = -0.42;
        } else if (isWaterShiver) {
          // Arms crossed tightly hugging chest in freezing soak
          seat.leftArm.rotation.x = -1.25;
          seat.rightArm.rotation.x = -1.25;
          seat.rightArm.rotation.y = 0;
          seat.leftArm.rotation.z = -0.68 + Math.sin(elapsedTotal * 44) * 0.05;
          seat.rightArm.rotation.z = 0.68 - Math.sin(elapsedTotal * 44) * 0.05;
        } else if (activeEmote === 'panic' || isUnderHeavySuspicion) {
          seat.leftArm.rotation.x = -2.45 + Math.sin(elapsedTotal * 18 + i) * 0.18;
          seat.rightArm.rotation.x = -2.45 - Math.sin(elapsedTotal * 18 + i) * 0.18;
          seat.rightArm.rotation.y = 0;
          seat.leftArm.rotation.z = -0.35;
          seat.rightArm.rotation.z = 0.35;
        } else if (isHappyDancing || activeEmote === 'dance') {
          seat.leftArm.rotation.x = -2.4 + Math.sin(elapsedTotal * 12) * 0.48;
          seat.rightArm.rotation.x = -2.4 - Math.sin(elapsedTotal * 12) * 0.48;
          seat.rightArm.rotation.y = 0;
          seat.leftArm.rotation.z = 0.45;
          seat.rightArm.rotation.z = -0.45;
        } else if (activeEmote === 'wave') {
          seat.rightArm.rotation.x = -2.6;
          seat.rightArm.rotation.y = 0;
          seat.rightArm.rotation.z = -0.45 + Math.sin(elapsedTotal * 14) * 0.45;
          seat.leftArm.rotation.x = -0.2;
          seat.leftArm.rotation.z = 0.14;
        } else if (activeEmote === 'accuse' || isPointingVote || isTitlePointing) {
          // Physical extended pointing arm aimed directly at the voted suspect!
          seat.rightArm.rotation.x = THREE.MathUtils.damp(
            seat.rightArm.rotation.x,
            -Math.PI / 2 + Math.sin(elapsedTotal * 6 + i) * 0.04,
            10,
            dt
          );
          seat.rightArm.rotation.y = THREE.MathUtils.damp(
            seat.rightArm.rotation.y,
            targetArmAimYaw,
            10,
            dt
          );
          seat.rightArm.rotation.z = THREE.MathUtils.damp(seat.rightArm.rotation.z, -0.04, 10, dt);
          seat.leftArm.rotation.x = THREE.MathUtils.damp(seat.leftArm.rotation.x, -0.32, 8, dt);
          seat.leftArm.rotation.z = THREE.MathUtils.damp(seat.leftArm.rotation.z, 0.16, 8, dt);
        } else if (activeEmote === 'clap') {
          seat.leftArm.rotation.x = -1.1;
          seat.rightArm.rotation.x = -1.1;
          seat.rightArm.rotation.y = 0;
          const clapAmt = Math.abs(Math.sin(elapsedTotal * 16)) * 0.38;
          seat.leftArm.rotation.z = -0.35 + clapAmt;
          seat.rightArm.rotation.z = 0.35 - clapAmt;
        } else if (activeEmote === 'laugh') {
          seat.leftArm.rotation.x = -0.65 + Math.sin(elapsedTotal * 16) * 0.16;
          seat.rightArm.rotation.x = -0.65 - Math.sin(elapsedTotal * 16) * 0.16;
          seat.rightArm.rotation.y = 0;
          seat.leftArm.rotation.z = 0.28;
          seat.rightArm.rotation.z = -0.28;
        } else if (isWalking) {
          const swingAmp = Math.min(0.85, 0.55 * Math.max(0.7, moveSpeedRatio));
          seat.leftArm.rotation.x = -Math.sin(seat.walkPhase) * swingAmp;
          seat.rightArm.rotation.x = Math.sin(seat.walkPhase) * swingAmp;
          seat.rightArm.rotation.y = THREE.MathUtils.damp(seat.rightArm.rotation.y, 0, 8, dt);
          seat.leftArm.rotation.z = 0.14;
          seat.rightArm.rotation.z = -0.14;
        } else if (isSpeaking) {
          seat.leftArm.rotation.x = -0.65 + Math.sin(elapsedTotal * 8 + i) * 0.32;
          seat.rightArm.rotation.x = -0.95 + Math.cos(elapsedTotal * 8 + i) * 0.35;
          seat.rightArm.rotation.y = THREE.MathUtils.damp(seat.rightArm.rotation.y, 0, 8, dt);
          seat.leftArm.rotation.z = 0.16;
          seat.rightArm.rotation.z = -0.16;
        } else {
          seat.leftArm.rotation.x = THREE.MathUtils.damp(seat.leftArm.rotation.x, -0.36 * (1 - seat.standFactor * 0.7), 6, dt);
          seat.rightArm.rotation.x = THREE.MathUtils.damp(seat.rightArm.rotation.x, -0.36 * (1 - seat.standFactor * 0.7), 6, dt);
          seat.rightArm.rotation.y = THREE.MathUtils.damp(seat.rightArm.rotation.y, 0, 8, dt);
          seat.leftArm.rotation.z = THREE.MathUtils.damp(seat.leftArm.rotation.z, 0.12, 6, dt);
          seat.rightArm.rotation.z = THREE.MathUtils.damp(seat.rightArm.rotation.z, -0.12, 6, dt);
        }

        // Mouse-Driven, Reaction & Social Gaze Head Tracking
        if (p.isAlive) {
          let desiredHeadYaw = Math.sin(elapsedTotal * 0.85 + i * 2.1) * 0.14;
          let desiredHeadPitch = 0;

          if (isTomatoSplat) {
            desiredHeadYaw = Math.sin(elapsedTotal * 18) * 0.48;
            desiredHeadPitch = -0.12;
          } else if (isEggDisgust) {
            desiredHeadYaw = Math.sin(elapsedTotal * 10) * 0.24;
            desiredHeadPitch = 0.28;
          } else if (isWaterShiver) {
            desiredHeadYaw = Math.sin(elapsedTotal * 40) * 0.14;
            desiredHeadPitch = 0.16;
          } else if (isMe && !st.isTitleScreen) {
            if (isDirectLook) {
              const relFpv = st.fpvYaw - (seat.group.rotation.y + seat.bodyGroup.rotation.y + seat.torsoGroup.rotation.y);
              desiredHeadYaw = THREE.MathUtils.clamp(Math.atan2(Math.sin(relFpv), Math.cos(relFpv)), -1.15, 1.15);
              desiredHeadPitch = THREE.MathUtils.clamp(-st.fpvPitch, -0.45, 0.45);
            } else if (st.hasMouseLook) {
              const dx = st.mouseWorldLookPoint.x - seat.currentPos.x;
              const dy = st.mouseWorldLookPoint.y - (seat.currentPos.y + 1.45);
              const dz = st.mouseWorldLookPoint.z - seat.currentPos.z;
              const horizD = Math.max(0.4, Math.hypot(dx, dz));
              const worldYaw = Math.atan2(dx, dz);
              const relYaw = worldYaw - (seat.group.rotation.y + seat.bodyGroup.rotation.y + seat.torsoGroup.rotation.y);
              desiredHeadYaw = THREE.MathUtils.clamp(Math.atan2(Math.sin(relYaw), Math.cos(relYaw)), -1.12, 1.12);
              desiredHeadPitch = THREE.MathUtils.clamp(-Math.atan2(dy, horizD), -0.38, 0.38);
            }
          } else {
            // Bots glance naturally toward their voted suspect, active speaker, or center campfire
            let gazeTargetSeat: (typeof seats)[number] | null = null;
            if (isPointingVote && votedTargetId) {
              const tIdx = activePlayers.findIndex((pl) => pl.id === votedTargetId);
              if (tIdx !== -1 && tIdx !== i) gazeTargetSeat = seats[tIdx];
            } else if (st.activeSpeakers.length > 0) {
              const spIdx = activePlayers.findIndex((pl) => pl.name === st.activeSpeakers[0]);
              if (spIdx !== -1 && spIdx !== i) gazeTargetSeat = seats[spIdx];
            }
            if (gazeTargetSeat) {
              const dx = gazeTargetSeat.currentPos.x - seat.currentPos.x;
              const dz = gazeTargetSeat.currentPos.z - seat.currentPos.z;
              const worldYaw = Math.atan2(dx, dz);
              const relYaw = worldYaw - (seat.group.rotation.y + seat.bodyGroup.rotation.y + seat.torsoGroup.rotation.y);
              desiredHeadYaw = THREE.MathUtils.clamp(Math.atan2(Math.sin(relYaw), Math.cos(relYaw)), -1.05, 1.05);
            }
          }

          seat.headLookYaw = THREE.MathUtils.damp(seat.headLookYaw, desiredHeadYaw, 11, dt);
          seat.headLookPitch = THREE.MathUtils.damp(seat.headLookPitch, desiredHeadPitch, 11, dt);
          seat.headGroup.rotation.y = seat.headLookYaw;
          seat.headGroup.rotation.x = seat.headLookPitch;
        }

        // Role Visibility, Wolf Ears, Shield Ring, Lover Heart & Selection Halo
        const isWolfRole = p.roleId === 'werewolf' || p.roleId === 'wolf_pup';
        const revealAsDeathWolf = isDeathKiller && activeDeathCinematic?.causeType === 'werewolf';
        const canSeeWolf =
          revealAsDeathWolf ||
          st.revealAllRoles ||
          st.phase === 'game_over' ||
          p.id === st.userPlayerId ||
          (me && (me.roleId === 'werewolf' || me.roleId === 'wolf_pup') && isWolfRole);

        seat.wolfEarsGroup.visible = Boolean(revealAsDeathWolf || (canSeeWolf && isWolfRole));
        const eyeColorHex =
          revealAsDeathWolf || isAngryReacting
            ? 0xff2222
            : isDeathKiller && activeDeathCinematic?.causeType === 'witch_poison'
            ? 0x22c55e
            : isHappyDancing
            ? 0xfbbf24
            : canSeeWolf && isWolfRole
            ? 0xef4444
            : 0x111827;
        seat.eyeLeftMat.color.setHex(eyeColorHex);
        seat.eyeRightMat.color.setHex(eyeColorHex);

        // Personalized Spectral Ghost Free-Flight (Matches deceased adventurer's cloak, hat, hair, beard & pauldrons; NEVER snaps back to orbit!)
        if (!p.isAlive && !st.isTitleScreen && !activeDeathCinematic && !isNightBlindfolded) {
          seat.ghostGroup.visible = !(isMe && isFirstPerson);

          // Initialize ghost position right above this player's own seat/tombstone once upon death
          if (!seat.ghostInitialized) {
            seat.ghostPos.set(hx, homeGroundY + 1.55, hz);
            seat.ghostVelocity.x = 0;
            seat.ghostVelocity.z = 0;
            seat.ghostHoverHeight = 1.55;
            seat.ghostFacingYaw = Math.atan2(-hx, -hz);
            seat.ghostWanderTarget = { x: hx, z: hz };
            seat.ghostWanderWaitTimer = 0.8 + (i % 5) * 0.55;
            seat.ghostInitialized = true;
          }

          // Live-sync personalized ghost appearance with the deceased player's actual cosmetics & role!
          const cloakHex = p.cloakColor ?? fallbackCosm.cloakColor;
          seat.ghostCloakMat.color.setHex(cloakHex).lerp(_ghostBaseTint, 0.24);
          seat.ghostCloakMat.emissive.setHex(cloakHex).lerp(_ghostEmissiveTint, 0.35);
          (Object.keys(seat.ghostHatVariants) as AgrouHatId[]).forEach((hk) => {
            seat.ghostHatVariants[hk].visible = hk === activeHat;
          });
          seat.ghostWolfEarsGroup.visible = Boolean(canSeeWolf && isWolfRole);
          seat.ghostEyeMat.color.setHex(canSeeWolf && isWolfRole ? 0xfca5a5 : 0xe0f2fe);

          if (isMe && isUserGhost) {
            if (hasMoveInput) {
              st.dashTargetPos = null;
            }
            const keyVertical =
              (st.keysPressed.has('Space') ? 1 : 0) -
              (st.keysPressed.has('ShiftLeft') ||
              st.keysPressed.has('ShiftRight') ||
              st.keysPressed.has('KeyQ')
                ? 1
                : 0);
            const verticalInput = !st.isUiOverlayOpen
              ? Math.max(-1, Math.min(1, keyVertical + (st.ghostVerticalRate || 0)))
              : 0;
            const gGround = sampleTerrainHeight(seat.ghostPos.x, seat.ghostPos.z, activeBiomeKey);
            const gRes = stepGhostFreeFlight({
              currentPos: seat.ghostPos,
              velocity: seat.ghostVelocity,
              hoverHeight: seat.ghostHoverHeight,
              facingYaw: seat.ghostFacingYaw,
              cameraYaw: isDirectLook ? st.fpvYaw : st.azimuthAngle,
              isDirectLook,
              inputX: st.isUiOverlayOpen ? 0 : inputX,
              inputZ: st.isUiOverlayOpen ? 0 : inputZ,
              verticalInput,
              isSprinting: false,
              dashTargetPos: st.dashTargetPos ? { x: st.dashTargetPos.x, z: st.dashTargetPos.z } : null,
              groundY: gGround,
              elapsedSec: elapsedTotal,
              seatPhaseOffset: i * 1.15,
              dt: simDt,
              maxRadius: 23.5,
            });
            seat.ghostPos.set(gRes.nextPos.x, gRes.nextPos.y, gRes.nextPos.z);
            seat.ghostVelocity.x = gRes.nextVelocity.x;
            seat.ghostVelocity.z = gRes.nextVelocity.z;
            seat.ghostHoverHeight = gRes.nextHoverHeight;
            seat.ghostFacingYaw = gRes.nextFacingYaw;
            if (gRes.reachedDashTarget) {
              st.dashTargetPos = null;
            }
          } else {
            // Dead AI/other ghosts drift gently across the village rather than snapping in a robotic circle
            const gGround = sampleTerrainHeight(seat.ghostPos.x, seat.ghostPos.z, activeBiomeKey);
            const botRes = computeBotGhostWanderStep({
              currentPos: seat.ghostPos,
              wanderTarget: seat.ghostWanderTarget,
              waitTimer: seat.ghostWanderWaitTimer,
              facingYaw: seat.ghostFacingYaw,
              groundY: gGround,
              elapsedSec: elapsedTotal,
              seatIndex: i,
              circleRadius: radius,
              dt: simDt,
            });
            seat.ghostPos.set(botRes.nextPos.x, botRes.nextPos.y, botRes.nextPos.z);
            seat.ghostWanderTarget = botRes.nextWanderTarget;
            seat.ghostWanderWaitTimer = botRes.nextWaitTimer;
            seat.ghostFacingYaw = botRes.nextFacingYaw;
          }

          seat.ghostGroup.position.copy(seat.ghostPos);
          seat.ghostGroup.rotation.y = seat.ghostFacingYaw;

          // Subtle ethereal ghost animation (undulating tail, orbiting motes, floating arms, flight lean)
          const ghostHorizSpeed = isMe
            ? Math.hypot(seat.ghostVelocity.x, seat.ghostVelocity.z)
            : 1.5;
          const forwardTilt = Math.min(0.28, ghostHorizSpeed * 0.035);
          seat.ghostTorsoGroup.rotation.x = THREE.MathUtils.damp(
            seat.ghostTorsoGroup.rotation.x,
            forwardTilt + Math.sin(elapsedTotal * 2.4 + i) * 0.04,
            7,
            dt
          );
          seat.ghostTailGroup.rotation.x = forwardTilt * 1.35 + Math.sin(elapsedTotal * 4.2 + i) * 0.14;
          seat.ghostTailGroup.rotation.z = Math.cos(elapsedTotal * 3.1 + i) * 0.12;
          seat.ghostMotesGroup.rotation.y += simDt * 1.45;
          seat.ghostLeftArm.rotation.x = -0.35 + Math.sin(elapsedTotal * 2.7 + i) * 0.16;
          seat.ghostRightArm.rotation.x = -0.35 - Math.sin(elapsedTotal * 2.7 + i) * 0.16;
          seat.ghostLeftArm.rotation.z = 0.24 + Math.cos(elapsedTotal * 2.2 + i) * 0.08;
          seat.ghostRightArm.rotation.z = -0.24 - Math.cos(elapsedTotal * 2.2 + i) * 0.08;

          // Float the ghost nameplate cleanly above this player's personalized ghost!
          seat.worldPos.set(seat.ghostPos.x, seat.ghostPos.y + 1.98, seat.ghostPos.z);
        } else {
          seat.ghostGroup.visible = false;
          if (p.isAlive) {
            seat.ghostInitialized = false;
            seat.ghostVelocity.x = 0;
            seat.ghostVelocity.z = 0;
          }
        }

        // STRICT ANTI-LEAK: Shield Ring ONLY visible to Bodyguard or at Game Over (never leaks to other players!)
        const canSeeShield = Boolean(
          st.revealAllRoles || st.phase === 'game_over' || me?.roleId === 'bodyguard'
        );
        seat.shieldRing.visible = Boolean(canSeeShield && p.protectedLastNight && p.isAlive);
        seat.shieldRing.rotation.z += simDt * 1.5;

        const isLover =
          Boolean(p.loverId) ||
          Boolean(st.cupidLovers && (st.cupidLovers[0] === p.id || st.cupidLovers[1] === p.id));
        seat.loverHeart.visible =
          isLover && (isMe || st.revealAllRoles || st.phase === 'game_over' || me?.roleId === 'cupid');
        seat.loverHeart.rotation.y += simDt * 2.2;

        const isSelected = st.selectedTargetId === p.id || st.secondaryTargetId === p.id;
        const isHovered =
          st.hoveredPlayerId === p.id || (isDirectLook && st.aimedPlayerId === p.id);

        if (isSelected) {
          seat.haloMat.color.setHex(isVotingPhase ? 0xf5b82e : 0xe86f24);
          seat.haloMat.opacity = 0.92;
        } else if (isHovered) {
          seat.haloMat.color.setHex(0xfbbf24);
          seat.haloMat.opacity = 0.85;
        } else if (isWakingActor) {
          seat.haloMat.color.setHex(0xfde68a);
          seat.haloMat.opacity = 0.56 + Math.sin(elapsedTotal * 3.6 + i) * 0.2;
        } else if (isMayor) {
          seat.haloMat.color.setHex(0xf59e0b);
          seat.haloMat.opacity = 0.62;
        } else if (isMe && !st.isTitleScreen) {
          seat.haloMat.color.setHex(0x38bdf8);
          seat.haloMat.opacity = 0.55;
        } else {
          seat.haloMat.opacity = 0.0;
        }
      }

      // Run 3D Night Skill Micro-Cutscene Director (strictly non-lethal except hunter_shot!)
      nightDirector.update({
        sceneEvent:
          !st.isTitleScreen && !activeDeathCinematic && !isNightBlindfolded
            ? st.activeNightScene
            : null,
        seats,
        activePlayers,
        biomeKey: activeBiomeKey,
        dt,
        simDt,
        elapsed: elapsedTotal,
        onPlaySfx: (kind, pos) => {
          sound.playSkillCutsceneSfx(kind, pos);
        },
      });

      // Frostpeak subtle frost-breath puffs every ~2.6s from living adventurers
      if (
        activeBiomeKey === 'frostpeak' &&
        !isNightBlindfolded &&
        !activeDeathCinematic &&
        elapsedTotal - lastFrostBreathTime > 2.6 &&
        count > 0
      ) {
        lastFrostBreathTime = elapsedTotal;
        const pickIdx = Math.floor(elapsedTotal) % count;
        const bPlayer = activePlayers[pickIdx];
        const bSeat = seats[pickIdx];
        if (bPlayer?.isAlive && bSeat?.group.visible) {
          const bYaw = bSeat.group.rotation.y + bSeat.bodyGroup.rotation.y + bSeat.torsoGroup.rotation.y;
          spawnSurfaceVfx(
            'frost',
            bSeat.currentPos.x + Math.sin(bYaw) * 0.28,
            bSeat.currentPos.y + (bSeat.standFactor > 0.5 ? 1.62 : 1.38),
            bSeat.currentPos.z + Math.cos(bYaw) * 0.28,
            Math.sin(bYaw) * 0.35,
            0.28,
            Math.cos(bYaw) * 0.35,
            bYaw,
            0.95,
            0.65
          );
        }
      }

      // Update Pooled Surface VFX (dust puffs, 8s snow footprints, frost breath, water splash droplets)
      let anySurfaceVfxActive = false;
      for (let i = 0; i < SURFACE_VFX_COUNT; i++) {
        const slot = surfaceVfxSlots[i];
        if (!slot.active) {
          _dummyObj.position.set(0, -50, 0);
          _dummyObj.scale.setScalar(0.0001);
          _dummyObj.updateMatrix();
          surfaceVfxInst.setMatrixAt(i, _dummyObj.matrix);
          continue;
        }
        slot.age += simDt;
        if (slot.age >= slot.maxAge) {
          slot.active = false;
          _dummyObj.position.set(0, -50, 0);
          _dummyObj.scale.setScalar(0.0001);
          _dummyObj.updateMatrix();
          surfaceVfxInst.setMatrixAt(i, _dummyObj.matrix);
          continue;
        }
        anySurfaceVfxActive = true;
        const lifeT = slot.age / slot.maxAge;
        if (slot.kind === 'snowprint') {
          const fade = lifeT > 0.8 ? Math.max(0.01, (1 - lifeT) / 0.2) : 1;
          _dummyObj.position.set(slot.x, slot.y, slot.z);
          _dummyObj.rotation.set(0, slot.rotY, 0);
          _dummyObj.scale.set(0.95 * slot.baseScale * fade, 0.12 * fade, 1.55 * slot.baseScale * fade);
          _vfxColor.setHex(0x87a5be);
        } else if (slot.kind === 'splash') {
          slot.vy -= 9.5 * simDt;
          slot.x += slot.vx * simDt;
          slot.y = Math.max(-0.22, slot.y + slot.vy * simDt);
          slot.z += slot.vz * simDt;
          const sc = Math.max(0.05, (1 - lifeT) * slot.baseScale);
          _dummyObj.position.set(slot.x, slot.y, slot.z);
          _dummyObj.rotation.set(elapsedTotal * 4 + i, slot.rotY, 0);
          _dummyObj.scale.setScalar(sc);
          _vfxColor.setHex(0x7dd3fc);
        } else if (slot.kind === 'frost') {
          slot.x += slot.vx * simDt;
          slot.y += slot.vy * simDt;
          slot.z += slot.vz * simDt;
          const sc = (0.65 + lifeT * 1.25) * (1 - lifeT) * slot.baseScale;
          _dummyObj.position.set(slot.x, slot.y, slot.z);
          _dummyObj.rotation.set(0, slot.rotY + elapsedTotal, 0);
          _dummyObj.scale.setScalar(Math.max(0.02, sc));
          _vfxColor.setHex(0xe6f4ff);
        } else {
          // Dirt dust puff
          slot.x += slot.vx * simDt;
          slot.y += slot.vy * simDt;
          slot.z += slot.vz * simDt;
          slot.vy *= Math.max(0, 1 - 2.4 * simDt);
          const sc = (0.7 + lifeT * 1.15) * (1 - lifeT) * slot.baseScale;
          _dummyObj.position.set(slot.x, slot.y, slot.z);
          _dummyObj.rotation.set(elapsedTotal * 2, slot.rotY, 0);
          _dummyObj.scale.setScalar(Math.max(0.02, sc));
          _vfxColor.setHex(0xcab48e);
        }
        _dummyObj.updateMatrix();
        surfaceVfxInst.setMatrixAt(i, _dummyObj.matrix);
        surfaceVfxInst.setColorAt(i, _vfxColor);
      }
      surfaceVfxInst.visible = anySurfaceVfxActive;
      if (anySurfaceVfxActive) {
        surfaceVfxInst.instanceMatrix.needsUpdate = true;
        if (surfaceVfxInst.instanceColor) surfaceVfxInst.instanceColor.needsUpdate = true;
      }

      // Update Pooled Expanding River Water Ripple Rings
      for (let i = 0; i < waterRipples.length; i++) {
        const wr = waterRipples[i];
        if (!wr.active) continue;
        wr.age += simDt;
        if (wr.age >= wr.maxAge) {
          wr.active = false;
          wr.mesh.visible = false;
          wr.mat.opacity = 0;
        } else {
          const u = wr.age / wr.maxAge;
          wr.mesh.scale.setScalar(1 + u * 3.2);
          wr.mat.opacity = 0.65 * (1 - u) * (1 - u);
        }
      }

      // Animate 3D Night Death Cinematic VFX (Werewolf Claw Slash, Witch Poison Cloud, Cupid Shattered Heart)
      if (activeDeathCinematic) {
        st.deathCinematicElapsed += simDt;
        const vIdx = activePlayers.findIndex((pl) => pl.id === activeDeathCinematic.victimId);
        const vSeat = vIdx !== -1 ? seats[vIdx] : seats[0];
        deathVfxGroup.visible = true;
        deathVfxGroup.position.copy(vSeat.homePos);
        deathVfxGroup.rotation.y = vSeat.seatAnchorGroup.rotation.y;

        const isWolfKill =
          activeDeathCinematic.causeType === 'werewolf' || activeDeathCinematic.causeType === 'unknown';
        const isWitchKill = activeDeathCinematic.causeType === 'witch_poison';
        const isCupidKill = activeDeathCinematic.causeType === 'cupid_lover';

        deathSpotlight.color.setHex(isWitchKill ? 0x22c55e : isCupidKill ? 0xf43f5e : 0xef4444);
        deathSpotlight.intensity = 15 + Math.sin(elapsedTotal * 9) * 3.5;

        deathClawGroup.visible = isWolfKill && st.deathCinematicElapsed > 0.3;
        if (deathClawGroup.visible) {
          const slashProgress = Math.min(1, (st.deathCinematicElapsed - 0.3) / 0.55);
          deathClawGroup.scale.set(1.1, 0.25 + slashProgress * 1.15, 1.1);
          clawSlashMat.opacity = Math.max(0.28, 1 - slashProgress * 0.42);
        }

        deathPoisonGroup.visible = isWitchKill;
        if (deathPoisonGroup.visible) {
          deathPoisonGroup.rotation.y += simDt * 2.2;
          poisonOrbs.forEach((orb, idx) => {
            const a = (idx / poisonOrbs.length) * Math.PI * 2 + elapsedTotal * 1.8;
            const rr = 0.55 + Math.sin(elapsedTotal * 3 + idx) * 0.22;
            orb.position.set(
              Math.cos(a) * rr,
              0.45 + ((elapsedTotal * 0.7 + idx * 0.23) % 1.45),
              Math.sin(a) * rr
            );
          });
        }

        deathHeartGroup.visible = isCupidKill;
        if (deathHeartGroup.visible) {
          const split = Math.min(0.65, st.deathCinematicElapsed * 0.35);
          heartLeft.position.set(-0.18 - split, 1.65 - split * 0.3, 0);
          heartRight.position.set(0.18 + split, 1.65 - split * 0.3, 0);
          heartLeft.rotation.z = split * 0.8;
          heartRight.rotation.z = -split * 0.8;
        }
      } else {
        deathVfxGroup.visible = false;
        deathSpotlight.intensity = 0;
      }

      // Camera Choreography: Night Death Cinematic vs Blindfold Campfire vs Title vs FPV vs Campfire Orbit
      const circleScaleBoost = Math.max(1.0, radius / 5.65);
      const portraitDistMultiplier = responsiveFraming.distMultiplier * circleScaleBoost;
      let fpvHeadRoll = 0;

      if (activeDeathCinematic) {
        fpvRigGroup.visible = false;
        st.aimedPlayerId = null;
        st.aimedCampfire = false;
        st.aimedOwnSeat = false;
        const vIdx = activePlayers.findIndex((pl) => pl.id === activeDeathCinematic.victimId);
        const vSeat = vIdx !== -1 ? seats[vIdx] : seats[0];
        const vHome = vSeat.homePos;
        const inward = new THREE.Vector3(-vHome.x, 0, -vHome.z).normalize();
        const sideVec = new THREE.Vector3(-inward.z, 0, inward.x);
        const orbitShift = Math.sin(st.deathCinematicElapsed * 0.65) * 0.85;
        _targetCamPos.set(
          vHome.x + inward.x * 3.8 + sideVec.x * (1.8 + orbitShift),
          vHome.y + 2.05,
          vHome.z + inward.z * 3.8 + sideVec.z * (1.8 + orbitShift)
        );
        _targetLookAt.set(
          vHome.x + inward.x * 0.7,
          vHome.y + 1.25,
          vHome.z + inward.z * 0.7
        );
      } else if (isNightBlindfolded) {
        // Pitch-dark sleeping perspective gazing quietly into the lone glowing campfire embers
        fpvRigGroup.visible = false;
        st.aimedPlayerId = null;
        st.aimedCampfire = false;
        st.aimedOwnSeat = false;
        const myIdx = Math.max(0, activePlayers.findIndex((p) => p.id === st.userPlayerId));
        const myAngle = Math.PI / 2 + (myIdx / Math.max(1, count)) * Math.PI * 2;
        const eyeDist = Math.min(6.4, radius);
        _targetCamPos.set(
          Math.cos(myAngle) * eyeDist,
          1.62 + Math.sin(elapsedTotal * 1.4) * 0.03,
          Math.sin(myAngle) * eyeDist
        );
        _targetLookAt.set(0, 0.58, 0);
      } else if (st.isTitleScreen) {
        fpvRigGroup.visible = false;
        st.aimedPlayerId = null;
        st.aimedCampfire = false;
        st.aimedOwnSeat = false;
        if (st.allowTitleOrbit && (st.isDraggingOrbit || st.hasUserDraggedTitle)) {
          const dist = st.cameraDist * portraitDistMultiplier;
          const polar = st.polarAngle;
          const horizDist = Math.cos(polar) * dist;
          const camY = Math.max(2.0, Math.sin(polar) * dist);
          _targetCamPos.set(
            Math.sin(st.azimuthAngle) * horizDist,
            camY,
            Math.cos(st.azimuthAngle) * horizDist
          );
          _targetLookAt.set(0, activeBiomeKey === 'autumn' ? 2.0 : 1.5, -1.2);
        } else {
          const sweepAngle = Math.sin(elapsedTotal * 0.18) * 0.36;
          if (st.allowTitleOrbit) {
            st.azimuthAngle = sweepAngle;
            st.polarAngle = 0.36;
            st.cameraDist = 15.8;
          }
          const titleRadius = 15.8 * portraitDistMultiplier;
          _targetCamPos.set(
            Math.sin(sweepAngle) * titleRadius,
            (5.65 + Math.sin(elapsedTotal * 0.35) * 0.35) * portraitDistMultiplier,
            Math.cos(sweepAngle) * titleRadius
          );
          _targetLookAt.set(0, activeBiomeKey === 'autumn' ? 2.15 : 1.85, -3.2);
        }
      } else if (isDirectLook) {
        const mySeatIdx = Math.max(
          0,
          activePlayers.findIndex((p) => p.id === st.userPlayerId)
        );
        const mySeat = seats[mySeatIdx] || seats[0];
        if (st.resetDirectLookAnchor) {
          const anchorPos = isUserGhost
            ? mySeat.ghostPos
            : st.isUserRoaming
            ? mySeat.currentPos
            : mySeat.homePos;
          st.fpvYaw = computeFpvYawTowardOrigin(anchorPos, mySeat.baseAngle);
          st.fpvPitch = isThirdPerson ? -0.1 : -0.04;
          st.resetDirectLookAnchor = false;
          st.snapCameraImmediate = true;
        }
        const fpvStance =
          mySeat.standFactor < 0.25
            ? 'seated'
            : mySeat.crouchBlend > 0.35
            ? 'crouching'
            : 'standing';

        let directPose;
        if (isThirdPerson) {
          const tpvAnchor = isUserGhost ? mySeat.ghostPos : mySeat.currentPos;
          const approxBackX = tpvAnchor.x - Math.sin(st.fpvYaw) * 3.15;
          const approxBackZ = tpvAnchor.z - Math.cos(st.fpvYaw) * 3.15;
          const camTerrainY = sampleTerrainHeight(approxBackX, approxBackZ, activeBiomeKey);
          directPose = computeThirdPersonCameraPose({
            charPos: tpvAnchor,
            isGhost: isUserGhost,
            yaw: st.fpvYaw,
            pitch: st.fpvPitch,
            elapsedSec: elapsedTotal,
            isMoving: hasMoveInput,
            stance: fpvStance,
            isSprinting: isLivingSprinting && !isCrouching,
            jumpHeight: mySeat.yOffset,
            crouchBlend: mySeat.crouchBlend,
            groundY: mySeat.currentPos.y,
            strafeInput: inputX,
            minCameraY: camTerrainY + 0.55,
          });
          // Clamp TPV camera distance cleanly against static tents, rocks & boulders
          if (!isUserGhost) {
            const camFrac = clampCameraRayAgainstObstacles(
              tpvAnchor.x,
              tpvAnchor.z,
              directPose.eyePos.x,
              directPose.eyePos.z,
              staticEnvObstacles,
              0.38
            );
            if (camFrac < 0.999) {
              directPose.eyePos.x = THREE.MathUtils.lerp(tpvAnchor.x, directPose.eyePos.x, camFrac);
              directPose.eyePos.z = THREE.MathUtils.lerp(tpvAnchor.z, directPose.eyePos.z, camFrac);
              const clampedGroundY = sampleTerrainHeight(directPose.eyePos.x, directPose.eyePos.z, activeBiomeKey);
              directPose.eyePos.y = Math.max(clampedGroundY + 0.55, directPose.eyePos.y);
            }
          }
          fpvRigGroup.visible = false;
        } else {
          directPose = computeFpvCameraPose({
            charPos: isUserGhost ? mySeat.ghostPos : mySeat.currentPos,
            isGhost: isUserGhost,
            yaw: st.fpvYaw,
            pitch: st.fpvPitch,
            elapsedSec: elapsedTotal,
            isMoving: hasMoveInput,
            stance: fpvStance,
            isSprinting: isLivingSprinting && !isCrouching,
            jumpHeight: mySeat.yOffset,
            crouchBlend: mySeat.crouchBlend,
            groundY: mySeat.currentPos.y,
            strafeInput: inputX,
          });
          fpvRigGroup.visible = !isNightBlindfolded;
          const handBobFreq = !hasMoveInput ? 2.2 : isLivingSprinting ? 13.8 : 10.4;
          const handBobAmp = !hasMoveInput ? 0.006 : isLivingSprinting ? 0.032 : 0.019;
          fpvLeftHandGroup.position.y = -0.25 + Math.sin(elapsedTotal * handBobFreq) * handBobAmp;
          fpvLeftHandGroup.position.x = -0.27 + Math.cos(elapsedTotal * handBobFreq * 0.5) * handBobAmp;

          if (st.fpvThrowSwingTimer > 0) {
            st.fpvThrowSwingTimer = Math.max(0, st.fpvThrowSwingTimer - simDt);
          }
          const myVotedInFpv = Boolean(
            isVotingPhase &&
              me?.isAlive &&
              (latestVoteByVoter.get(me.id) || st.selectedTargetId) &&
              (latestVoteByVoter.get(me.id) || st.selectedTargetId) !== CAMPFIRE_ABSTAIN_ID
          );
          const isFpvPointing =
            !st.activePropTool && (myVotedInFpv || (isVotingPhase && Boolean(st.aimedPlayerId)));
          fpvPointFinger.visible = isFpvPointing;

          let swingY = 0;
          let swingZ = 0;
          let swingRotX = 0;
          if (st.fpvThrowSwingTimer > 0) {
            const nt = 1 - st.fpvThrowSwingTimer / 0.52;
            if (nt < 0.32) {
              const p1 = nt / 0.32;
              swingY = p1 * 0.14;
              swingZ = p1 * 0.12;
              swingRotX = p1 * 0.65;
            } else {
              const p2 = (nt - 0.32) / 0.68;
              swingY = THREE.MathUtils.lerp(0.14, -0.06, p2);
              swingZ = THREE.MathUtils.lerp(0.12, -0.24, p2);
              swingRotX = THREE.MathUtils.lerp(0.65, -0.85, p2);
            }
          } else if (isFpvPointing) {
            swingY = 0.05;
            swingZ = -0.07;
            swingRotX = 0.04;
          }
          fpvRightHandGroup.position.y =
            -0.28 - Math.sin(elapsedTotal * handBobFreq) * handBobAmp + swingY;
          fpvRightHandGroup.position.z = -0.48 + swingZ;
          fpvRightHandGroup.rotation.x = swingRotX;
          fpvRigGroup.rotation.z = THREE.MathUtils.damp(fpvRigGroup.rotation.z, directPose.headRoll, 10, dt);

          const isMeWolf = Boolean(me && (me.roleId === 'werewolf' || me.roleId === 'wolf_pup'));
          fpvClawsGroup.visible = isMeWolf && !st.activePropTool && !isFpvPointing;
          fpvHeldTomato.visible = st.activePropTool === 'tomato';
          fpvHeldEgg.visible = st.activePropTool === 'egg';
          fpvHeldRose.visible = st.activePropTool === 'rose';
          fpvHeldWater.visible = st.activePropTool === 'water';
        }

        fpvHeadRoll = directPose.headRoll;
        _targetCamPos.set(directPose.eyePos.x, directPose.eyePos.y, directPose.eyePos.z);
        _targetLookAt.set(directPose.lookTarget.x, directPose.lookTarget.y, directPose.lookTarget.z);

        // Use actual rendered view ray in TPV so center crosshair matches shoulder camera tilt
        const aimRay = isThirdPerson
          ? computeCameraViewRay(directPose.eyePos, directPose.lookTarget)
          : directPose.forward;

        const candidates = [];
        for (let idx = 0; idx < count; idx++) {
          const p = activePlayers[idx];
          const s = seats[idx];
          if (!p || !s) continue;
          const useGhostPos = !p.isAlive && s.ghostGroup.visible;
          const isVisible = useGhostPos ? s.ghostGroup.visible : s.group.visible;
          if (!isVisible) continue;
          candidates.push({
            playerId: p.id,
            pos: useGhostPos
              ? {
                  x: s.ghostPos.x,
                  y: s.ghostPos.y + 0.85,
                  z: s.ghostPos.z,
                }
              : {
                  x: s.currentPos.x,
                  y: s.currentPos.y + (p.isAlive ? 1.25 : 0.85),
                  z: s.currentPos.z,
                },
            visible: isVisible,
          });
        }
        st.aimedPlayerId = findFpvCrosshairTarget({
          eyePos: directPose.eyePos,
          forward: aimRay,
          candidates,
          selfPlayerId: st.userPlayerId,
        });

        // Detect aiming directly at own wooden stool when roaming so [E]/Click sits back down!
        if (!st.aimedPlayerId && st.isUserRoaming && me?.isAlive) {
          const toStoolX = mySeat.homePos.x - directPose.eyePos.x;
          const toStoolY = mySeat.homePos.y + 0.45 - directPose.eyePos.y;
          const toStoolZ = mySeat.homePos.z - directPose.eyePos.z;
          const sDist = Math.hypot(toStoolX, toStoolY, toStoolZ);
          const sDot =
            sDist > 0.35 && sDist < 12
              ? (toStoolX * aimRay.x + toStoolY * aimRay.y + toStoolZ * aimRay.z) / sDist
              : 0;
          st.aimedOwnSeat = sDot > 0.945;
        } else {
          st.aimedOwnSeat = false;
        }

        // Also detect aiming directly at the central Campfire during Voting Phase!
        if (!st.aimedPlayerId && !st.aimedOwnSeat && isVotingPhase) {
          const toFireX = -directPose.eyePos.x;
          const toFireY = 0.72 - directPose.eyePos.y;
          const toFireZ = -directPose.eyePos.z;
          const fDist = Math.hypot(toFireX, toFireY, toFireZ);
          const fDot =
            fDist > 0.5 && fDist < 18
              ? (toFireX * aimRay.x + toFireY * aimRay.y + toFireZ * aimRay.z) / fDist
              : 0;
          st.aimedCampfire = fDot > 0.945;
        } else {
          st.aimedCampfire = false;
        }
      } else {
        fpvRigGroup.visible = false;
        st.aimedPlayerId = null;
        st.aimedCampfire = false;
        st.aimedOwnSeat = false;
        const dist = st.cameraDist * portraitDistMultiplier;
        const polar = st.polarAngle;

        const horizDist = Math.cos(polar) * dist;
        const camY = Math.max(2.0, Math.sin(polar) * dist);
        _targetCamPos.set(
          Math.sin(st.azimuthAngle) * horizDist,
          camY,
          Math.cos(st.azimuthAngle) * horizDist
        );
        _targetLookAt.set(0, 1.15, -1.25);

        const focusId = st.hoveredPlayerId || st.selectedTargetId;
        if (focusId && !st.isTitleScreen && !st.isDraggingOrbit) {
          const focusSeat = seats.find((s) => s.playerId === focusId);
          if (focusSeat && (focusSeat.group.visible || focusSeat.ghostGroup.visible)) {
            _targetLookAt.lerp(focusSeat.worldPos, 0.16);
          }
        }
      }

      if (st.aimedPlayerId !== st.lastReportedAimedId) {
        st.lastReportedAimedId = st.aimedPlayerId;
        st.onAimedPlayerChange?.(st.aimedPlayerId);
      }
      if (st.aimedCampfire !== st.lastReportedAimedCampfire) {
        st.lastReportedAimedCampfire = st.aimedCampfire;
        st.onAimedCampfireChange?.(st.aimedCampfire);
      }
      if (st.aimedOwnSeat !== st.lastReportedAimedOwnSeat) {
        st.lastReportedAimedOwnSeat = st.aimedOwnSeat;
        st.onAimedOwnSeatChange?.(st.aimedOwnSeat);
      }
      if (st.isUserRoaming !== st.lastReportedRoaming) {
        st.lastReportedRoaming = st.isUserRoaming;
        st.onRoamingStateChange?.(st.isUserRoaming);
      }

      if (st.snapCameraImmediate) {
        st.snapCameraImmediate = false;
        camera.position.copy(_targetCamPos);
        _currentLookAt.copy(_targetLookAt);
        camera.fov = targetFov;
        camera.updateProjectionMatrix();
      } else {
        const dampFactor = 1 - Math.exp((isDirectLook ? -18 : -5.2) * dt);
        camera.position.lerp(_targetCamPos, dampFactor);
        _currentLookAt.lerp(_targetLookAt, dampFactor);
      }

      if (shake > 0.0001) {
        camera.position.x += (Math.random() - 0.5) * shake * 0.4;
        camera.position.y += (Math.random() - 0.5) * shake * 0.3;
      }
      camera.lookAt(_currentLookAt);
      if (isDirectLook && Math.abs(fpvHeadRoll) > 0.0005) {
        camera.rotateZ(fpvHeadRoll);
      }

      renderer.render(scene, camera);

      const nowMs = performance.now();

      // Update 3D Spatial Audio Listener at ~18 Hz (every 55ms) with zero-GC scratch vectors
      if (nowMs - lastSpatialAudioSync >= 55) {
        lastSpatialAudioSync = nowMs;
        if (isUserGhost && mySeatNow) {
          _earPos.set(mySeatNow.ghostPos.x, mySeatNow.ghostPos.y + 1.0, mySeatNow.ghostPos.z);
        } else if ((isDirectLook || st.isUserRoaming) && mySeatNow) {
          _earPos.copy(mySeatNow.worldPos);
        } else {
          _earPos.copy(camera.position);
        }
        _earFwd.set(0, 0, -1).transformDirection(camera.matrixWorld);
        _earUp.set(0, 1, 0).transformDirection(camera.matrixWorld);
        sound.updateSpatialFrame({
          x: _earPos.x,
          y: _earPos.y,
          z: _earPos.z,
          fx: _earFwd.x,
          fy: _earFwd.y,
          fz: _earFwd.z,
          ux: _earUp.x,
          uy: _earUp.y,
          uz: _earUp.z,
          biome: activeBiomeKey,
          isDay,
          isNightBlindfolded,
        });
      }

      // Project 3D seat positions to 2D floating HTML nameplates at ~15Hz
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
            (isDirectLook && isMeLabel)
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

        const cfEl = campfireLabelRef.current;
        if (cfEl) {
          if (isVotingPhase) {
            _projVec.set(0, 2.05, 0).project(camera);
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
      window.removeEventListener('pointerdown', onPointerDown);
      domElem.removeEventListener('pointerleave', onPointerLeaveCanvas);
      domElem.removeEventListener('contextmenu', onContextMenu);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerCancel);
      window.removeEventListener('blur', onWindowBlur);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      document.removeEventListener('pointerlockchange', onPointerLockChange);
      document.removeEventListener('pointerlockerror', onPointerLockError);
      releaseCanvasPointerLock();
      domElem.removeEventListener('wheel', onWheel);
      domElem.removeEventListener('webglcontextlost', onWebglContextLost);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      canvasElemRef.current = null;
      delete (window as unknown as Record<string, unknown>).__VILLAGE_DEBUG__;
      for (const proj of activeProjectiles) {
        scene.remove(proj.group);
        scene.remove(proj.trailGroup);
      }
      for (const splat of activeSplats) {
        splat.attachedParent?.remove(splat.bodySplatMesh);
        scene.remove(splat.group);
      }
      envHandle.dispose();
      adventurerPool.dispose();
      nightDirector.dispose();
      surfaceVfxGeo.dispose();
      surfaceVfxMat.dispose();
      rippleGeo.dispose();
      for (const wr of waterRipples) wr.mat.dispose();
      tomatoSkinMat.dispose();
      tomatoSeedMat.dispose();
      tomatoStemMat.dispose();
      eggShellMat.dispose();
      eggYolkMat.dispose();
      stinkGasMat.dispose();
      rosePetalMat.dispose();
      roseHeartMat.dispose();
      roseWrapMat.dispose();
      waterLiquidMat.dispose();
      waterFoamMat.dispose();
      propGoldMat.dispose();
      unitSphereGeo.dispose();
      unitConeGeo.dispose();
      unitTorusGeo.dispose();
      splatChunkGeo.dispose();
      heartPetalGeo.dispose();
      clawSlashGeo.dispose();
      clawSlashMat.dispose();
      poisonCloudGeo.dispose();
      poisonMistMat.dispose();
      heartHalfGeo.dispose();
      brokenHeartMat.dispose();
      renderer.dispose();
    };
  }, []);

  if (webglUnavailable) {
    return (
      <Village2DFallback
        players={players}
        userPlayerId={userPlayerId}
        phase={phase}
        lang={lang}
        isTitleScreen={isTitleScreen}
        isPlayerAwakeAtNight={isPlayerAwakeAtNight}
        selectedTargetId={selectedTargetId}
        secondaryTargetId={secondaryTargetId}
        votesMap={votesMap}
        activeSpeakers={activeSpeakers}
        revealAllRoles={revealAllRoles}
        mapBiome={mapBiome}
        mayorId={mayorId}
        onSelectPlayer={onSelectPlayer}
        onVoteCampfireAbstain={onSelectCampfire ?? onVoteCampfireAbstain}
      />
    );
  }

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

      {/* Agrou Cinematic Soft Edge Vignette (Zero backdrop-blur!) */}
      <div
        aria-hidden="true"
        className="fixed inset-0 pointer-events-none z-[5]"
        style={{
          background:
            'radial-gradient(ellipse at 50% 48%, rgba(0,0,0,0) 56%, rgba(8,10,14,0.44) 100%)',
        }}
      />

      {/* World-Projected 3D Character Floating Nameplates */}
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
                {t.campfireAbstainBanner}
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
                    ? phase === 'day_voting'
                      ? 'bg-[#362312]/95 border-[#f5b82e] text-[#fef3c7] scale-105'
                      : 'bg-[#5c1d16]/95 border-[#f97316] text-[#fff7ed] scale-105'
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
