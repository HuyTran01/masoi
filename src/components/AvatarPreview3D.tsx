import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { AGROU_CLOAK_COLORS, AGROU_HATS, AgrouHatId, AgrouMapBiome } from '../game/agrouMechanics';
import { Language } from '../types/game';

const BIOME_PREVIEW_THEMES: Record<
  AgrouMapBiome,
  {
    bgCss: string;
    hemiSky: number;
    hemiGround: number;
    keyColor: number;
    rimColor: number;
    pedestalColor: number;
  }
> = {
  forest: {
    bgCss: 'radial-gradient(circle at 50% 35%, #24402a 0%, #162419 60%, #0e140f 100%)',
    hemiSky: 0xffe6bd,
    hemiGround: 0x243b22,
    keyColor: 0xfff1d6,
    rimColor: 0xff8c3a,
    pedestalColor: 0x4d331f,
  },
  frostpeak: {
    bgCss: 'radial-gradient(circle at 50% 32%, #2b5984 0%, #162c47 60%, #0b1626 100%)',
    hemiSky: 0xdff2ff,
    hemiGround: 0x5d748f,
    keyColor: 0xe8f6ff,
    rimColor: 0x38bdf8,
    pedestalColor: 0x9bb7cf,
  },
  autumn: {
    bgCss: 'radial-gradient(circle at 50% 35%, #3c7a42 0%, #204526 60%, #112416 100%)',
    hemiSky: 0xd8f3ff,
    hemiGround: 0x4e7535,
    keyColor: 0xfff3c4,
    rimColor: 0xfacc15,
    pedestalColor: 0x638f3d,
  },
};

function buildPreviewHat(hat: AgrouHatId): THREE.Group {
  const g = new THREE.Group();
  const mat = (color: number, roughness = 0.78, metalness = 0.05) =>
    new THREE.MeshStandardMaterial({ color, roughness, metalness, flatShading: true });
  if (hat === 'witch') {
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.44, 0.045, 12), mat(0x2d1a4c));
    brim.position.y = 0.24;
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.52, 10), mat(0x3a1f63));
    cone.position.y = 0.5;
    cone.rotation.z = 0.08;
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.245, 0.26, 0.06, 10), mat(0xd946ef, 0.5, 0.2));
    band.position.y = 0.28;
    g.add(brim, cone, band);
  } else if (hat === 'crown') {
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.25, 0.14, 8), mat(0xf5b82e, 0.3, 0.7));
    base.position.y = 0.29;
    g.add(base);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.14, 4), mat(0xfacc15, 0.28, 0.75));
      spike.position.set(Math.cos(a) * 0.22, 0.4, Math.sin(a) * 0.22);
      g.add(spike);
    }
  } else if (hat === 'knight') {
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.62),
      mat(0x94a3b8, 0.35, 0.75)
    );
    dome.position.y = 0.06;
    const plume = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.22, 0.34), mat(0xdc2626, 0.7));
    plume.position.set(0, 0.36, -0.02);
    g.add(dome, plume);
  } else if (hat === 'straw') {
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.48, 0.04, 14), mat(0xeab308, 0.88));
    brim.position.y = 0.23;
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.27, 0.17, 10), mat(0xfacc15, 0.85));
    top.position.y = 0.32;
    const ribbon = new THREE.Mesh(new THREE.CylinderGeometry(0.265, 0.275, 0.05, 10), mat(0xdc2626, 0.75));
    ribbon.position.y = 0.26;
    g.add(brim, top, ribbon);
  } else if (hat === 'antlers') {
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.29, 0.06, 10), mat(0x5c3a21, 0.9));
    band.position.y = 0.2;
    const antlerGeo = new THREE.CylinderGeometry(0.03, 0.045, 0.34, 6);
    const leftA = new THREE.Mesh(antlerGeo, mat(0x8c5a32, 0.85));
    leftA.position.set(-0.2, 0.38, 0);
    leftA.rotation.z = 0.42;
    const rightA = new THREE.Mesh(antlerGeo, mat(0x8c5a32, 0.85));
    rightA.position.set(0.2, 0.38, 0);
    rightA.rotation.z = -0.42;
    g.add(band, leftA, rightA);
  } else if (hat === 'pirate') {
    const brim = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.16, 0.44), mat(0x1e293b, 0.85));
    brim.position.y = 0.3;
    const goldTrim = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.04, 0.46), mat(0xeab308, 0.35, 0.65));
    goldTrim.position.y = 0.38;
    g.add(brim, goldTrim);
  }
  return g;
}

interface AvatarPreview3DProps {
  hat: AgrouHatId;
  cloakColor: number;
  mapBiome?: AgrouMapBiome;
  playerName?: string;
  lang?: Language;
}

const Fallback2DAvatarPreview: React.FC<{
  hat: AgrouHatId;
  cloakColor: number;
  mapBiome: AgrouMapBiome;
  lang: Language;
}> = ({ hat, cloakColor, mapBiome, lang }) => {
  const hexColor =
    AGROU_CLOAK_COLORS.find((c) => c.hex === cloakColor)?.cssHex ||
    `#${(cloakColor >>> 0).toString(16).padStart(6, '0')}`;
  const hatMeta = AGROU_HATS.find((h) => h.id === hat);
  const theme = BIOME_PREVIEW_THEMES[mapBiome] || BIOME_PREVIEW_THEMES.forest;

  return (
    <div
      data-testid="avatar-preview-2d-fallback"
      data-biome={mapBiome}
      className="w-full h-full flex flex-col items-center justify-center relative select-none rounded-xl overflow-hidden"
      style={{ background: theme.bgCss }}
    >
      <svg
        viewBox="0 0 180 210"
        className="w-40 h-44 drop-shadow-[0_12px_20px_rgba(0,0,0,0.65)]"
        aria-label="Adventurer Preview"
      >
        <ellipse cx="90" cy="186" rx="52" ry="12" fill="#3b2617" stroke="#7c5636" strokeWidth="2" />
        {/* Cloak & tunic */}
        <path
          d="M52 178 L62 114 Q90 102 118 114 L128 178 Z"
          fill={hexColor}
          stroke="#1a110b"
          strokeWidth="3"
        />
        {/* Leather belt & buckle */}
        <rect x="61" y="144" width="58" height="10" rx="3" fill="#2e1d12" />
        <rect x="83" y="142" width="14" height="14" rx="2" fill="#e5b34b" stroke="#5c3b10" strokeWidth="1.5" />
        {/* Shoulders */}
        <circle cx="58" cy="120" r="13" fill={hexColor} stroke="#1a110b" strokeWidth="2.5" />
        <circle cx="122" cy="120" r="13" fill={hexColor} stroke="#1a110b" strokeWidth="2.5" />
        {/* Head */}
        <circle cx="90" cy="84" r="24" fill="#f3c6a5" stroke="#2c1a0e" strokeWidth="2.5" />
        {/* Eyes & warm smile */}
        <circle cx="81" cy="82" r="3" fill="#1e1510" />
        <circle cx="99" cy="82" r="3" fill="#1e1510" />
        <path d="M83 94 Q90 99 97 94" stroke="#5c3220" strokeWidth="2.2" fill="none" strokeLinecap="round" />
        {/* Hat icon overlay */}
        {hat === 'witch' && (
          <g>
            <ellipse cx="90" cy="64" rx="34" ry="7" fill="#311b4f" stroke="#c084fc" strokeWidth="1.5" />
            <path d="M68 62 L92 18 L112 62 Z" fill="#3b1f63" stroke="#1b0e2e" strokeWidth="2" />
          </g>
        )}
        {hat === 'crown' && (
          <path
            d="M68 64 L72 42 L83 54 L90 36 L97 54 L108 42 L112 64 Z"
            fill="#f5b82e"
            stroke="#78440e"
            strokeWidth="2"
          />
        )}
        {hat === 'knight' && (
          <g>
            <path d="M66 74 Q90 42 114 74 Z" fill="#94a3b8" stroke="#334155" strokeWidth="2" />
            <rect x="87" y="42" width="6" height="22" rx="2" fill="#dc2626" />
          </g>
        )}
        {hat === 'straw' && (
          <g>
            <ellipse cx="90" cy="64" rx="36" ry="8" fill="#eab308" stroke="#854d0e" strokeWidth="2" />
            <path d="M72 62 Q90 42 108 62 Z" fill="#facc15" stroke="#854d0e" strokeWidth="1.8" />
          </g>
        )}
        {hat === 'antlers' && (
          <g stroke="#78350f" strokeWidth="4" strokeLinecap="round" fill="none">
            <path d="M74 62 Q62 42 54 30 M64 46 L72 34" />
            <path d="M106 62 Q118 42 126 30 M116 46 L108 34" />
          </g>
        )}
        {hat === 'pirate' && (
          <path
            d="M58 64 Q90 36 122 64 Q90 58 58 64 Z"
            fill="#1e293b"
            stroke="#f59e0b"
            strokeWidth="2"
          />
        )}
      </svg>
      {hatMeta && (
        <span className="mt-1 px-2.5 py-0.5 rounded-full bg-[#1a110b]/85 border border-[#8e6338]/70 text-xs font-bold text-[#f6d99a]">
          {hatMeta.icon} {hatMeta.label[lang] || hatMeta.label.vi}
        </span>
      )}
    </div>
  );
};

export const AvatarPreview3D: React.FC<AvatarPreview3DProps> = ({
  hat,
  cloakColor,
  mapBiome = 'forest',
  lang = 'vi',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const hatRef = useRef(hat);
  const cloakRef = useRef(cloakColor);
  const biomeRef = useRef<AgrouMapBiome>(mapBiome);
  const rebuildRef = useRef<(() => void) | null>(null);
  const rotRef = useRef({ yaw: 0, pitch: 0, dragging: false, interacted: false, lastX: 0, lastY: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [useFallback2D, setUseFallback2D] = useState(false);

  hatRef.current = hat;
  cloakRef.current = cloakColor;
  biomeRef.current = mapBiome;

  useEffect(() => {
    rebuildRef.current?.();
  }, [hat, cloakColor, mapBiome]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || useFallback2D) return;

    let renderer: THREE.WebGLRenderer | null = null;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      setUseFallback2D(true);
      return;
    }

    const w = container.clientWidth || 220;
    const h = container.clientHeight || 240;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(w, h);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const onContextLost = (e: Event) => {
      e.preventDefault();
      setUseFallback2D(true);
    };
    renderer.domElement.addEventListener('webglcontextlost', onContextLost, false);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, w / h, 0.1, 40);
    camera.position.set(0, 1.45, 3.6);
    camera.lookAt(0, 1.0, 0);

    const initTheme = BIOME_PREVIEW_THEMES[biomeRef.current] || BIOME_PREVIEW_THEMES.forest;
    const hemiLight = new THREE.HemisphereLight(initTheme.hemiSky, initTheme.hemiGround, 1.35);
    scene.add(hemiLight);
    const keyLight = new THREE.DirectionalLight(initTheme.keyColor, 1.75);
    keyLight.position.set(2.5, 4, 3);
    scene.add(keyLight);
    const rimLight = new THREE.PointLight(initTheme.rimColor, 1.5, 8);
    rimLight.position.set(-2, 1.6, -1.5);
    scene.add(rimLight);

    const pedestalMat = new THREE.MeshStandardMaterial({
      color: initTheme.pedestalColor,
      roughness: 0.9,
      flatShading: true,
    });
    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.05, 0.18, 12), pedestalMat);
    pedestal.position.y = -0.09;
    scene.add(pedestal);

    const heroGroup = new THREE.Group();
    scene.add(heroGroup);

    const cloakMat = new THREE.MeshStandardMaterial({
      color: cloakRef.current,
      roughness: 0.78,
      flatShading: true,
    });
    const skinMat = new THREE.MeshStandardMaterial({
      color: 0xf0c09b,
      roughness: 0.75,
      flatShading: true,
    });
    const darkMat = new THREE.MeshStandardMaterial({
      color: 0x231710,
      roughness: 0.9,
      flatShading: true,
    });
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xeab308,
      roughness: 0.35,
      metalness: 0.65,
      flatShading: true,
    });

    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.44, 0.92, 8), cloakMat);
    torso.position.y = 0.56;
    heroGroup.add(torso);

    const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.4, 0.12, 8), darkMat);
    belt.position.y = 0.42;
    heroGroup.add(belt);

    const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 0.08), goldMat);
    buckle.position.set(0, 0.42, 0.38);
    heroGroup.add(buckle);

    const shoulderGeo = new THREE.DodecahedronGeometry(0.16, 0);
    const leftShoulder = new THREE.Mesh(shoulderGeo, cloakMat);
    leftShoulder.position.set(-0.36, 0.9, 0);
    const rightShoulder = new THREE.Mesh(shoulderGeo, cloakMat);
    rightShoulder.position.set(0.36, 0.9, 0);
    heroGroup.add(leftShoulder, rightShoulder);

    const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.28, 1), skinMat);
    head.position.y = 1.24;
    heroGroup.add(head);

    const eyeGeo = new THREE.BoxGeometry(0.055, 0.06, 0.04);
    const leftEye = new THREE.Mesh(eyeGeo, darkMat);
    leftEye.position.set(-0.09, 1.26, 0.24);
    const rightEye = new THREE.Mesh(eyeGeo, darkMat);
    rightEye.position.set(0.09, 1.26, 0.24);
    heroGroup.add(leftEye, rightEye);

    const hatAnchor = new THREE.Group();
    hatAnchor.position.y = 1.24;
    heroGroup.add(hatAnchor);

    const applyCosmetics = () => {
      cloakMat.color.setHex(cloakRef.current);
      const theme = BIOME_PREVIEW_THEMES[biomeRef.current] || BIOME_PREVIEW_THEMES.forest;
      hemiLight.color.setHex(theme.hemiSky);
      hemiLight.groundColor.setHex(theme.hemiGround);
      keyLight.color.setHex(theme.keyColor);
      rimLight.color.setHex(theme.rimColor);
      pedestalMat.color.setHex(theme.pedestalColor);
      while (hatAnchor.children.length > 0) {
        hatAnchor.remove(hatAnchor.children[0]);
      }
      if (hatRef.current !== 'none') {
        const hatObj = buildPreviewHat(hatRef.current);
        hatAnchor.add(hatObj);
      }
    };
    rebuildRef.current = applyCosmetics;
    applyCosmetics();

    const resizeObserver =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => {
            if (!renderer) return;
            const nw = container.clientWidth;
            const nh = container.clientHeight;
            if (nw > 0 && nh > 0) {
              camera.aspect = nw / nh;
              camera.updateProjectionMatrix();
              renderer.setSize(nw, nh);
            }
          })
        : null;
    resizeObserver?.observe(container);

    let rafId = 0;
    const clock = new THREE.Clock();
    const animate = () => {
      rafId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      const rot = rotRef.current;
      if (rot.interacted) {
        heroGroup.rotation.y = rot.yaw;
        heroGroup.rotation.x = rot.pitch;
        heroGroup.position.y = rot.dragging ? 0 : Math.sin(t * 2.2) * 0.025;
      } else {
        const swayY = Math.sin(t * 0.75) * 0.65;
        heroGroup.rotation.y = swayY;
        heroGroup.rotation.x = 0;
        heroGroup.position.y = Math.sin(t * 2.2) * 0.03;
        rot.yaw = swayY;
      }
      renderer?.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(rafId);
      resizeObserver?.disconnect();
      rebuildRef.current = null;
      if (renderer) {
        renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
        renderer.dispose();
        const gl = renderer.getContext?.();
        gl?.getExtension?.('WEBGL_lose_context')?.loseContext?.();
      }
      container.innerHTML = '';
    };
  }, [useFallback2D]);

  if (useFallback2D) {
    return (
      <Fallback2DAvatarPreview hat={hat} cloakColor={cloakColor} mapBiome={mapBiome} lang={lang} />
    );
  }

  const activeTheme = BIOME_PREVIEW_THEMES[mapBiome] || BIOME_PREVIEW_THEMES.forest;

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!rotRef.current.dragging) return;
    rotRef.current.dragging = false;
    setIsDragging(false);
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  return (
    <div
      ref={containerRef}
      data-testid="avatar-preview-3d-canvas"
      data-biome={mapBiome}
      style={{ background: activeTheme.bgCss }}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture?.(e.pointerId);
        rotRef.current.dragging = true;
        rotRef.current.interacted = true;
        rotRef.current.lastX = e.clientX;
        rotRef.current.lastY = e.clientY;
        setIsDragging(true);
      }}
      onPointerMove={(e) => {
        if (!rotRef.current.dragging) return;
        const dx = e.clientX - rotRef.current.lastX;
        const dy = e.clientY - rotRef.current.lastY;
        rotRef.current.yaw += dx * 0.014;
        rotRef.current.pitch = Math.max(-0.35, Math.min(0.35, rotRef.current.pitch + dy * 0.008));
        rotRef.current.lastX = e.clientX;
        rotRef.current.lastY = e.clientY;
      }}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      className={`w-full h-full rounded-xl overflow-hidden touch-none select-none ${
        isDragging ? 'cursor-grabbing' : 'cursor-grab'
      }`}
    />
  );
};
