import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { AgrouHatId, AgrouMapBiome, AGROU_BIOMES } from '../game/agrouMechanics';
import {
  applyAdventurerBodyPose,
  buildAgrouAdventurerPool,
} from './village3d/buildAgrouAdventurer';

interface AvatarPreview3DProps {
  hat: AgrouHatId;
  cloakColor: number;
  mapBiome: AgrouMapBiome;
  playerName: string;
}

export const AvatarPreview3D: React.FC<AvatarPreview3DProps> = ({
  hat,
  cloakColor,
  mapBiome,
  playerName,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const propsRef = useRef({ hat, cloakColor, mapBiome });
  const celebrateTimerRef = useRef<number>(0);

  useEffect(() => {
    const prev = propsRef.current;
    if (prev.hat !== hat || prev.cloakColor !== cloakColor || prev.mapBiome !== mapBiome) {
      celebrateTimerRef.current = 0.72;
    }
    propsRef.current = { hat, cloakColor, mapBiome };
  }, [hat, cloakColor, mapBiome]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = Math.max(180, container.clientWidth || 260);
    const height = Math.max(220, container.clientHeight || 340);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });

    const glCtx = renderer.getContext();
    let isSoftwareGl = false;
    try {
      const dbgInfo = glCtx.getExtension('WEBGL_debug_renderer_info');
      const rendererStr = dbgInfo ? String(glCtx.getParameter(dbgInfo.UNMASKED_RENDERER_WEBGL)) : '';
      if (/swiftshader|llvmpipe|software/i.test(rendererStr)) {
        isSoftwareGl = true;
      }
    } catch {
      // ignore
    }

    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height, false);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.cursor = 'grab';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const initialBiome = AGROU_BIOMES[propsRef.current.mapBiome] || AGROU_BIOMES.forest;
    scene.background = new THREE.Color(initialBiome.daySky);
    scene.fog = new THREE.FogExp2(initialBiome.daySky, 0.045);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTex = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;

    const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 40);
    camera.position.set(0, 1.56, 4.45);
    camera.lookAt(0, 1.12, 0);

    // Warm studio & campfire rim lighting
    const hemiLight = new THREE.HemisphereLight(
      initialBiome.dayHemiSky,
      initialBiome.dayHemiGround,
      1.25
    );
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(initialBiome.daySunColor, 1.9);
    keyLight.position.set(3.2, 5.2, 4.4);
    scene.add(keyLight);

    const rimLight = new THREE.PointLight(0xff8c2b, 4.5, 10, 1.6);
    rimLight.position.set(-2.2, 1.8, -1.8);
    scene.add(rimLight);

    // Carved wooden campfire turntable plinth
    const plinthGroup = new THREE.Group();
    const plinthBaseMat = new THREE.MeshStandardMaterial({
      color: 0x4b2f1b,
      roughness: 0.85,
      flatShading: true,
    });
    const plinthTopMat = new THREE.MeshStandardMaterial({
      color: initialBiome.groundDay,
      roughness: 0.92,
      flatShading: true,
    });
    const plinthRingMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      roughness: 0.45,
      metalness: 0.4,
      flatShading: true,
    });

    const plinthBase = new THREE.Mesh(
      new THREE.CylinderGeometry(1.12, 1.24, 0.22, 14),
      plinthBaseMat
    );
    plinthBase.position.y = -0.11;
    const plinthTop = new THREE.Mesh(
      new THREE.CylinderGeometry(1.04, 1.08, 0.06, 14),
      plinthTopMat
    );
    plinthTop.position.y = 0.02;
    const plinthTrim = new THREE.Mesh(
      new THREE.TorusGeometry(1.06, 0.032, 6, 18),
      plinthRingMat
    );
    plinthTrim.rotation.x = Math.PI / 2;
    plinthTrim.position.y = 0.04;
    plinthGroup.add(plinthBase, plinthTop, plinthTrim);
    scene.add(plinthGroup);

    // Decorative biome backdrop stones & mini pines behind pedestal
    const bgStoneMat = new THREE.MeshStandardMaterial({
      color: initialBiome.rockColor,
      roughness: 0.92,
      flatShading: true,
    });
    const bgLeafMat = new THREE.MeshStandardMaterial({
      color: initialBiome.foliagePrimary,
      roughness: 0.86,
      flatShading: true,
    });
    const bgTrunkMat = new THREE.MeshStandardMaterial({
      color: 0x4d311d,
      roughness: 0.95,
      flatShading: true,
    });

    const backdropGroup = new THREE.Group();
    for (let i = 0; i < 4; i++) {
      const rock = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.28 + (i % 2) * 0.14, 0),
        bgStoneMat
      );
      const ang = -Math.PI * 0.72 + i * 0.48;
      rock.position.set(Math.cos(ang) * 1.65, 0.08, Math.sin(ang) * 1.45 - 0.85);
      rock.scale.set(1.2, 0.65, 0.95);
      backdropGroup.add(rock);
    }
    const pineOffsets: [number, number, number][] = [
      [-1.55, -1.75, 0.72],
      [1.62, -1.65, 0.66],
    ];
    pineOffsets.forEach(([px, pz, sc]) => {
      const tree = new THREE.Group();
      const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.14, 1.1, 6), bgTrunkMat);
      tr.position.y = 0.55;
      const c1 = new THREE.Mesh(new THREE.ConeGeometry(0.68, 1.15, 7), bgLeafMat);
      c1.position.y = 1.35;
      const c2 = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.95, 7), bgLeafMat);
      c2.position.y = 1.98;
      tree.add(tr, c1, c2);
      tree.position.set(px, -0.05, pz);
      tree.scale.setScalar(sc);
      backdropGroup.add(tree);
    });
    scene.add(backdropGroup);

    // Build exact same 3D adventurer mesh used in-game (1-slot pool, stool hidden!)
    const pool = buildAgrouAdventurerPool(scene, [], 1, isSoftwareGl);
    const seat = pool.seats[0];
    seat.seatAnchorGroup.visible = false;
    seat.group.visible = true;
    seat.group.position.set(0, 0.05, 0);
    seat.group.rotation.y = 0.24;
    seat.haloMat.opacity = 0;

    const applyCosmetics = (nextHat: AgrouHatId, nextCloakColor: number) => {
      seat.cloakMat.color.setHex(nextCloakColor);
      (Object.keys(seat.hatVariants) as AgrouHatId[]).forEach((hId) => {
        seat.hatVariants[hId].visible = hId === nextHat;
      });
    };
    applyCosmetics(propsRef.current.hat, propsRef.current.cloakColor);

    // Interactive drag-to-rotate turntable
    let isDragging = false;
    let lastPointerX = 0;
    let turntableYaw = 0.26;
    let userVelocityYaw = 0;

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      lastPointerX = e.clientX;
      userVelocityYaw = 0;
      renderer.domElement.style.cursor = 'grabbing';
      try {
        renderer.domElement.setPointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - lastPointerX;
      lastPointerX = e.clientX;
      turntableYaw += dx * 0.012;
      userVelocityYaw = dx * 0.002;
    };
    const onPointerUp = (e: PointerEvent) => {
      isDragging = false;
      renderer.domElement.style.cursor = 'grab';
      try {
        renderer.domElement.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerup', onPointerUp);
    renderer.domElement.addEventListener('pointercancel', onPointerUp);

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.max(160, Math.floor(entry.contentRect.width));
        const h = Math.max(200, Math.floor(entry.contentRect.height));
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h, false);
      }
    });
    resizeObserver.observe(container);

    let rafId = 0;
    let timerId: number | null = null;
    let disposed = false;
    let lastTime = performance.now();
    let elapsed = 0;
    let appliedHat = propsRef.current.hat;
    let appliedCloak = propsRef.current.cloakColor;
    let appliedBiome = propsRef.current.mapBiome;

    const animate = () => {
      if (disposed) return;
      const now = performance.now();
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;
      elapsed += dt;

      const cur = propsRef.current;
      if (cur.hat !== appliedHat || cur.cloakColor !== appliedCloak) {
        applyCosmetics(cur.hat, cur.cloakColor);
        appliedHat = cur.hat;
        appliedCloak = cur.cloakColor;
      }

      if (cur.mapBiome !== appliedBiome) {
        const b = AGROU_BIOMES[cur.mapBiome] || AGROU_BIOMES.forest;
        scene.background = new THREE.Color(b.daySky);
        if (scene.fog instanceof THREE.FogExp2) {
          scene.fog.color.setHex(b.daySky);
        }
        hemiLight.color.setHex(b.dayHemiSky);
        hemiLight.groundColor.setHex(b.dayHemiGround);
        keyLight.color.setHex(b.daySunColor);
        plinthTopMat.color.setHex(b.groundDay);
        bgStoneMat.color.setHex(b.rockColor);
        bgLeafMat.color.setHex(b.foliagePrimary);
        appliedBiome = cur.mapBiome;
      }

      if (!isDragging) {
        turntableYaw += userVelocityYaw;
        userVelocityYaw *= 0.92;
        turntableYaw += Math.sin(elapsed * 0.55) * 0.0018;
      }

      if (celebrateTimerRef.current > 0) {
        celebrateTimerRef.current = Math.max(0, celebrateTimerRef.current - dt);
      }
      const hopPhase = celebrateTimerRef.current / 0.72;
      const hopY = hopPhase > 0 ? Math.sin(hopPhase * Math.PI) * 0.22 : 0;

      seat.group.rotation.y = turntableYaw;
      seat.group.position.set(0, 0.05 + hopY, 0);

      applyAdventurerBodyPose(seat, {
        standFactor: 1,
        walkPhase: 0,
        moveSpeedRatio: 0,
        crouchBlend: 0,
        jumpHeight: hopY,
      });
      // Subtle living breath sway on standing torso
      seat.bodyGroup.position.y += Math.sin(elapsed * 2.2) * 0.014;

      // Subtle living idle gaze & cheerful wave on item change
      seat.headGroup.rotation.y = Math.sin(elapsed * 1.1) * 0.14;
      seat.headGroup.rotation.x = Math.sin(elapsed * 0.85) * 0.04;
      if (hopPhase > 0) {
        seat.rightArm.rotation.x = -2.2 * Math.sin(hopPhase * Math.PI);
        seat.rightArm.rotation.z = -0.35 * Math.sin(hopPhase * Math.PI);
      } else {
        seat.rightArm.rotation.x = Math.sin(elapsed * 1.5) * 0.04;
        seat.rightArm.rotation.z = -0.06;
      }
      seat.leftArm.rotation.x = -Math.sin(elapsed * 1.5) * 0.04;
      seat.leftArm.rotation.z = 0.06;
      seat.torsoGroup.rotation.y = 0;

      plinthGroup.rotation.y = turntableYaw * 0.5;

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        timerId = window.setTimeout(() => {
          rafId = requestAnimationFrame(animate);
        }, 70);
      } else {
        rafId = requestAnimationFrame(animate);
      }
    };

    rafId = requestAnimationFrame(animate);

    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      if (timerId !== null) clearTimeout(timerId);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('pointercancel', onPointerUp);

      pool.dispose();
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry?.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material?.dispose();
          }
        }
      });
      envTex.dispose();
      pmremGenerator.dispose();
      renderer.dispose();
      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [playerName]);

  return (
    <div
      ref={containerRef}
      data-testid="avatar-preview-3d-canvas"
      className="w-full h-full min-h-[220px] sm:min-h-[340px] rounded-xl overflow-hidden border border-[#7c532e]/80 bg-[#18110c] select-none touch-none"
    />
  );
};
