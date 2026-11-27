import * as THREE from 'three';
import type { AgrouHatId } from '../../game/agrouMechanics';

// Deterministic hash for repeatable painterly procedural textures
function hash2d(x: number, y: number, seed = 1): number {
  const n = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453123;
  return n - Math.floor(n);
}

/**
 * Seamless hand-painted earthy soil / meadow ground detail texture.
 * Multiplies cleanly with smooth per-vertex biome colors (dirt clearing -> mossy grass hills)
 * so both dirt and grass have rich organic mottling, pebbles, and tiny fallen leaves.
 */
export function createTerrainDetailTexture(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    // Neutral bright warm base (multiplies cleanly with vertex colors without over-darkening)
    ctx.fillStyle = '#e8e2d6';
    ctx.fillRect(0, 0, size, size);

    // Broad organic painterly blotches (seamless via 3x3 wrap)
    const drawWrappedCircle = (cx: number, cy: number, r: number, color: string) => {
      for (let ox = -1; ox <= 1; ox++) {
        for (let oy = -1; oy <= 1; oy++) {
          const x = cx + ox * size;
          const y = cy + oy * size;
          if (x + r < 0 || x - r > size || y + r < 0 || y - r > size) continue;
          const g = ctx.createRadialGradient(x, y, 0, x, y, r);
          g.addColorStop(0, color);
          g.addColorStop(1, 'rgba(232,226,214,0)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    for (let i = 0; i < 64; i++) {
      const x = hash2d(i, 1.3, 11) * size;
      const y = hash2d(i, 4.7, 11) * size;
      const r = 28 + hash2d(i, 8.2, 11) * 62;
      const darker = i % 2 === 0;
      drawWrappedCircle(
        x,
        y,
        r,
        darker ? 'rgba(130, 108, 84, 0.24)' : 'rgba(255, 248, 232, 0.22)'
      );
    }

    // Fine organic earth & leaf-litter grain
    for (let i = 0; i < 900; i++) {
      const x = hash2d(i, 2.1, 23) * size;
      const y = hash2d(i, 6.9, 23) * size;
      const w = 1.5 + hash2d(i, 3.4, 23) * 4.5;
      const h = 1.2 + hash2d(i, 9.1, 23) * 2.8;
      const ang = hash2d(i, 5.5, 23) * Math.PI * 2;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(ang);
      const tone = hash2d(i, 7.7, 23);
      if (tone < 0.35) {
        ctx.fillStyle = 'rgba(92, 70, 48, 0.22)';
      } else if (tone < 0.65) {
        ctx.fillStyle = 'rgba(168, 134, 92, 0.20)';
      } else if (tone < 0.85) {
        ctx.fillStyle = 'rgba(246, 236, 212, 0.18)';
      } else {
        // Subtle tiny dried leaf / warm pebble accent
        ctx.fillStyle = 'rgba(186, 112, 54, 0.26)';
      }
      ctx.beginPath();
      ctx.ellipse(0, 0, w, h, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(16, 16);
  return tex;
}

/**
 * Seamless grayscale bump map paired with terrain detail texture for gentle dappled soil/grass relief.
 */
export function createTerrainBumpTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 420; i++) {
      const x = hash2d(i, 1.9, 41) * size;
      const y = hash2d(i, 5.2, 41) * size;
      const r = 3 + hash2d(i, 8.7, 41) * 14;
      const v = Math.floor(88 + hash2d(i, 3.1, 41) * 90);
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(${v},${v},${v},0.45)`);
      g.addColorStop(1, 'rgba(128,128,128,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(16, 16);
  return tex;
}

/**
 * Seamless painterly tree bark & carved wood grain texture.
 */
export function createWoodGrainTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#d8cfc4';
    ctx.fillRect(0, 0, size, size);

    for (let i = 0; i < 54; i++) {
      const x = (i / 54) * size + (hash2d(i, 2.3, 7) - 0.5) * 4;
      const w = 1.5 + hash2d(i, 6.1, 7) * 5;
      const dark = hash2d(i, 9.4, 7) > 0.4;
      ctx.fillStyle = dark ? 'rgba(65, 42, 26, 0.28)' : 'rgba(248, 236, 218, 0.16)';
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.bezierCurveTo(
        x + (hash2d(i, 1.1, 7) - 0.5) * 10,
        size * 0.35,
        x + (hash2d(i, 4.4, 7) - 0.5) * 10,
        size * 0.7,
        x,
        size
      );
      ctx.lineTo(x + w, size);
      ctx.lineTo(x + w, 0);
      ctx.closePath();
      ctx.fill();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/**
 * Seamless painterly stone texture for boulders, river rocks, and sculpted tombstones.
 */
export function createStoneTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#dcdcd8';
    ctx.fillRect(0, 0, size, size);

    for (let i = 0; i < 160; i++) {
      const x = hash2d(i, 3.1, 19) * size;
      const y = hash2d(i, 7.2, 19) * size;
      const r = 6 + hash2d(i, 4.5, 19) * 26;
      const dark = i % 2 === 0;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, dark ? 'rgba(92, 98, 102, 0.22)' : 'rgba(255, 255, 250, 0.20)');
      g.addColorStop(1, 'rgba(220,220,216,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Fine weathered cracks
    ctx.strokeStyle = 'rgba(65, 70, 76, 0.28)';
    ctx.lineWidth = 1.2;
    for (let c = 0; c < 12; c++) {
      let cx = hash2d(c, 1.5, 29) * size;
      let cy = hash2d(c, 8.4, 29) * size;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      for (let s = 0; s < 4; s++) {
        cx += (hash2d(c * 5 + s, 2.2, 29) - 0.5) * 26;
        cy += (hash2d(c * 5 + s, 6.7, 29) - 0.5) * 26;
        ctx.lineTo(cx, cy);
      }
      ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/**
 * Stylized flowing river water texture with luminous sky-blue base, soft caustics, and crisp white current streaks.
 */
export function createWaterRippleTexture(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const bg = ctx.createLinearGradient(0, 0, 0, size);
    bg.addColorStop(0.0, '#d2ecfa');
    bg.addColorStop(0.14, '#7ac2ea');
    bg.addColorStop(0.5, '#5daee2');
    bg.addColorStop(0.86, '#7ac2ea');
    bg.addColorStop(1.0, '#d2ecfa');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, size, size);

    // Subtle deeper aquatic bands
    for (let i = 0; i < 36; i++) {
      const y = 36 + hash2d(i, 3.7, 51) * (size - 72);
      const x = hash2d(i, 1.2, 51) * size;
      const len = 48 + hash2d(i, 7.1, 51) * 110;
      const h = 4 + hash2d(i, 9.5, 51) * 10;
      ctx.fillStyle = i % 3 === 0 ? 'rgba(235, 248, 255, 0.42)' : 'rgba(56, 130, 184, 0.22)';
      ctx.beginPath();
      ctx.ellipse(x, y, len * 0.5, h * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      if (x + len * 0.5 > size) {
        ctx.beginPath();
        ctx.ellipse(x - size, y, len * 0.5, h * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Crisp horizontal glistening stream shimmer streaks
    ctx.lineCap = 'round';
    for (let i = 0; i < 42; i++) {
      const x = hash2d(i, 4.4, 67) * size;
      const y = 44 + hash2d(i, 8.9, 67) * (size - 88);
      const len = 26 + hash2d(i, 2.6, 67) * 74;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.62)';
      ctx.lineWidth = 1.6 + hash2d(i, 5.1, 67) * 2.2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + len, y);
      ctx.stroke();
      if (x + len > size) {
        ctx.beginPath();
        ctx.moveTo(x - size, y);
        ctx.lineTo(x + len - size, y);
        ctx.stroke();
      }
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.repeat.set(9, 1);
  return tex;
}

/**
 * Fluffy painterly campfire smoke puff texture (replaces blocky solid cubes).
 */
export function createSoftSmokeTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const puffs = [
      { x: 128, y: 128, r: 92, a: 0.44 },
      { x: 96, y: 118, r: 64, a: 0.34 },
      { x: 156, y: 122, r: 60, a: 0.32 },
      { x: 124, y: 96, r: 58, a: 0.3 },
      { x: 132, y: 152, r: 54, a: 0.25 },
    ];
    for (const p of puffs) {
      const g = ctx.createRadialGradient(p.x, p.y, 4, p.x, p.y, p.r);
      g.addColorStop(0.0, `rgba(255, 245, 232, ${p.a})`);
      g.addColorStop(0.55, `rgba(218, 206, 196, ${p.a * 0.55})`);
      g.addColorStop(1.0, 'rgba(180, 170, 165, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Soft glowing stylized campfire flame sprite texture (white-gold core -> vibrant amber -> soft orange halo).
 */
export function createStylizedFlameTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Outer soft orange glow
    const halo = ctx.createRadialGradient(128, 162, 12, 128, 148, 118);
    halo.addColorStop(0.0, 'rgba(255, 210, 96, 0.85)');
    halo.addColorStop(0.45, 'rgba(255, 118, 24, 0.45)');
    halo.addColorStop(1.0, 'rgba(255, 70, 10, 0)');
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, size, size);

    // Organic flame teardrop silhouette
    const drawFlameLayer = (
      scaleX: number,
      scaleY: number,
      yBase: number,
      topCol: string,
      botCol: string
    ) => {
      ctx.save();
      ctx.translate(128, yBase);
      ctx.scale(scaleX, scaleY);
      const grad = ctx.createLinearGradient(0, -180, 0, 20);
      grad.addColorStop(0.0, topCol);
      grad.addColorStop(0.65, botCol);
      grad.addColorStop(1.0, 'rgba(255, 255, 235, 0.96)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(0, -185);
      ctx.bezierCurveTo(36, -120, 72, -55, 58, 0);
      ctx.bezierCurveTo(44, 34, -44, 34, -58, 0);
      ctx.bezierCurveTo(-72, -55, -36, -120, 0, -185);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };

    drawFlameLayer(1.0, 1.0, 215, 'rgba(255, 92, 16, 0.0)', 'rgba(255, 134, 24, 0.95)');
    drawFlameLayer(0.68, 0.78, 215, 'rgba(255, 186, 40, 0.2)', 'rgba(255, 224, 92, 0.98)');
    drawFlameLayer(0.38, 0.48, 215, 'rgba(255, 248, 195, 0.5)', 'rgba(255, 255, 242, 1.0)');
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Luminous golden-amber ground ring texture (under living seated villagers like the reference image!).
 */
export function createGoldenGroundRingTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const cx = size / 2;
    const cy = size / 2;
    // Soft warm golden ring glow (clean hollow center so it never washes out soil/boots)
    const glow = ctx.createRadialGradient(cx, cy, 70, cx, cy, 120);
    glow.addColorStop(0.0, 'rgba(255, 196, 62, 0.0)');
    glow.addColorStop(0.32, 'rgba(255, 186, 48, 0.14)');
    glow.addColorStop(0.55, 'rgba(255, 224, 120, 0.65)');
    glow.addColorStop(0.74, 'rgba(255, 168, 32, 0.24)');
    glow.addColorStop(1.0, 'rgba(255, 130, 14, 0.0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, size, size);

    // Crisp luminous golden ring contour
    ctx.strokeStyle = 'rgba(255, 238, 162, 0.92)';
    ctx.lineWidth = 6.2;
    ctx.shadowColor = '#f5a623';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(cx, cy, 94, 0, Math.PI * 2);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * High-resolution luminous cyan arcane rune circle texture (for Tombstones & Floating Ghosts — signature detail from reference!).
 */
export function createArcaneRuneTexture(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const cx = size / 2;
    const cy = size / 2;

    // Subtle cyan floor aura (kept low-opacity in the center so rune lines stay razor-sharp!)
    const bgGlow = ctx.createRadialGradient(cx, cy, 85, cx, cy, 244);
    bgGlow.addColorStop(0.0, 'rgba(70, 210, 250, 0.04)');
    bgGlow.addColorStop(0.62, 'rgba(54, 198, 245, 0.12)');
    bgGlow.addColorStop(0.84, 'rgba(110, 232, 255, 0.24)');
    bgGlow.addColorStop(1.0, 'rgba(40, 190, 255, 0.0)');
    ctx.fillStyle = bgGlow;
    ctx.fillRect(0, 0, size, size);

    ctx.strokeStyle = 'rgba(190, 246, 255, 0.94)';
    ctx.shadowColor = '#28d4f7';
    ctx.shadowBlur = 11;

    // Outer double ring
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(cx, cy, 224, 0, Math.PI * 2);
    ctx.stroke();

    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, 174, 0, Math.PI * 2);
    ctx.stroke();

    // Inner sacred hexagram / arcane star geometry
    ctx.lineWidth = 2.6;
    for (let t = 0; t < 2; t++) {
      ctx.beginPath();
      for (let v = 0; v < 3; v++) {
        const ang = (v / 3) * Math.PI * 2 + (t === 0 ? -Math.PI / 2 : Math.PI / 2);
        const px = cx + Math.cos(ang) * 168;
        const py = cy + Math.sin(ang) * 168;
        if (v === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
    }

    // Small inner compass ring
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(cx, cy, 98, 0, Math.PI * 2);
    ctx.stroke();

    // 24 Stylized glowing arcane runes around the outer band (drawn as clean geometric glyphs)
    ctx.lineWidth = 3.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const runeCount = 24;
    for (let i = 0; i < runeCount; i++) {
      const ang = (i / runeCount) * Math.PI * 2;
      ctx.save();
      ctx.translate(cx + Math.cos(ang) * 199, cy + Math.sin(ang) * 199);
      ctx.rotate(ang + Math.PI / 2);
      const kind = i % 6;
      ctx.beginPath();
      if (kind === 0) {
        ctx.moveTo(0, -13);
        ctx.lineTo(0, 13);
        ctx.moveTo(-7, -6);
        ctx.lineTo(7, 2);
        ctx.moveTo(-6, 8);
        ctx.lineTo(6, 2);
      } else if (kind === 1) {
        ctx.moveTo(-7, -12);
        ctx.lineTo(7, -12);
        ctx.lineTo(-6, 12);
        ctx.lineTo(7, 12);
      } else if (kind === 2) {
        ctx.moveTo(0, -13);
        ctx.lineTo(8, 0);
        ctx.lineTo(0, 13);
        ctx.lineTo(-8, 0);
        ctx.closePath();
      } else if (kind === 3) {
        ctx.moveTo(-6, -12);
        ctx.lineTo(-6, 12);
        ctx.moveTo(-6, -6);
        ctx.lineTo(7, -10);
        ctx.moveTo(-6, 2);
        ctx.lineTo(7, 6);
      } else if (kind === 4) {
        ctx.moveTo(-7, 12);
        ctx.lineTo(0, -13);
        ctx.lineTo(7, 12);
        ctx.moveTo(-5, 3);
        ctx.lineTo(5, 3);
      } else {
        ctx.moveTo(-6, -11);
        ctx.lineTo(6, 11);
        ctx.moveTo(6, -11);
        ctx.lineTo(-6, 11);
        ctx.moveTo(0, -13);
        ctx.lineTo(0, 13);
      }
      ctx.stroke();
      ctx.restore();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Vertical fading cyan spectral mist ribbon texture (rises around tombstones and floating ghosts).
 */
export function createSpectralMistRibbonTexture(): THREE.CanvasTexture {
  const w = 128;
  const h = 256;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const vGrad = ctx.createLinearGradient(0, h, 0, 0);
    vGrad.addColorStop(0.0, 'rgba(130, 240, 255, 0.0)');
    vGrad.addColorStop(0.18, 'rgba(140, 244, 255, 0.72)');
    vGrad.addColorStop(0.55, 'rgba(110, 224, 255, 0.28)');
    vGrad.addColorStop(1.0, 'rgba(110, 224, 255, 0.0)');
    ctx.fillStyle = vGrad;
    ctx.fillRect(0, 0, w, h);

    // Mask out vertical streaks
    ctx.globalCompositeOperation = 'destination-in';
    for (let s = 0; s < 5; s++) {
      const sx = (s + 0.5) * (w / 5);
      const sw = 12 + (s % 2) * 8;
      const sg = ctx.createLinearGradient(sx - sw, 0, sx + sw, 0);
      sg.addColorStop(0.0, 'rgba(0,0,0,0)');
      sg.addColorStop(0.5, 'rgba(0,0,0,1)');
      sg.addColorStop(1.0, 'rgba(0,0,0,0)');
      ctx.fillStyle = sg;
      ctx.fillRect(sx - sw, 0, sw * 2, h);
    }
    ctx.globalCompositeOperation = 'source-over';
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

/**
 * Charming stylized storybook portrait plaque drawn onto the stone tombstone face (matches reference tombstone!).
 */
export function createTombstonePortraitTexture(
  skinHex: number,
  hairHex: number,
  cloakHex: number,
  hat: AgrouHatId
): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const toCss = (hex: number) => `#${hex.toString(16).padStart(6, '0')}`;

    // Deep plum/slate portrait backdrop
    const bg = ctx.createLinearGradient(0, 0, 0, size);
    bg.addColorStop(0, '#3a2d4c');
    bg.addColorStop(1, '#1e1829');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, size, size);

    // Subtle stone frame bevel
    ctx.strokeStyle = '#6c727a';
    ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, size - 8, size - 8);

    // Shoulders / Cloak
    ctx.fillStyle = toCss(cloakHex);
    ctx.beginPath();
    ctx.ellipse(64, 118, 40, 28, 0, Math.PI, Math.PI * 2);
    ctx.fill();

    // Hair back
    ctx.fillStyle = toCss(hairHex);
    ctx.beginPath();
    ctx.arc(64, 72, 26, 0, Math.PI * 2);
    ctx.fill();

    // Face
    ctx.fillStyle = toCss(skinHex);
    ctx.beginPath();
    ctx.arc(64, 74, 20, 0, Math.PI * 2);
    ctx.fill();

    // Eyes & gentle smile
    ctx.fillStyle = '#1b1d26';
    ctx.beginPath();
    ctx.arc(56, 73, 2.8, 0, Math.PI * 2);
    ctx.arc(72, 73, 2.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#6d4436';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(64, 80, 5, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();

    // Stylized hat silhouette matching player
    if (hat === 'witch' || hat === 'none') {
      ctx.fillStyle = '#522c7a';
      ctx.beginPath();
      ctx.ellipse(64, 58, 34, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(44, 57);
      ctx.lineTo(66, 20);
      ctx.lineTo(84, 57);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#f2b830';
      ctx.fillRect(46, 51, 36, 5);
    } else if (hat === 'crown') {
      ctx.fillStyle = '#f2b830';
      ctx.beginPath();
      ctx.moveTo(46, 56);
      ctx.lineTo(48, 36);
      ctx.lineTo(57, 46);
      ctx.lineTo(64, 32);
      ctx.lineTo(71, 46);
      ctx.lineTo(80, 36);
      ctx.lineTo(82, 56);
      ctx.closePath();
      ctx.fill();
    } else if (hat === 'knight') {
      ctx.fillStyle = '#8d99a6';
      ctx.beginPath();
      ctx.arc(64, 58, 22, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#c83737';
      ctx.fillRect(60, 26, 8, 16);
    } else if (hat === 'straw') {
      ctx.fillStyle = '#e0b960';
      ctx.beginPath();
      ctx.ellipse(64, 58, 34, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(48, 42, 32, 16);
    } else {
      ctx.fillStyle = '#252930';
      ctx.beginPath();
      ctx.moveTo(36, 58);
      ctx.lineTo(64, 34);
      ctx.lineTo(92, 58);
      ctx.closePath();
      ctx.fill();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Radiant Fresnel Rim-Lit Ethereal Ghost ShaderMaterial!
 * Produces the exact luminous glowing icy-cyan/white translucent spirit look from the reference image
 * identically on both real GPUs and SwiftShader software WebGL.
 */
export function createSpectralGhostShaderMaterial(options: {
  baseColor?: number;
  rimColor?: number;
  opacity?: number;
  rimPower?: number;
  depthWrite?: boolean;
  additive?: boolean;
}): THREE.ShaderMaterial {
  const {
    baseColor = 0x2f9fd4,
    rimColor = 0xbef5ff,
    opacity = 0.72,
    rimPower = 2.25,
    depthWrite = true,
    additive = false,
  } = options;

  return new THREE.ShaderMaterial({
    uniforms: {
      uBaseColor: { value: new THREE.Color(baseColor) },
      uRimColor: { value: new THREE.Color(rimColor) },
      uOpacity: { value: opacity },
      uRimPower: { value: rimPower },
      uTime: { value: 0 },
    },
    vertexShader: `
      varying vec3 vNormalView;
      varying vec3 vViewPos;
      varying vec3 vLocalPos;
      void main() {
        vLocalPos = position;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vViewPos = -mvPosition.xyz;
        vNormalView = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 uBaseColor;
      uniform vec3 uRimColor;
      uniform float uOpacity;
      uniform float uRimPower;
      uniform float uTime;
      varying vec3 vNormalView;
      varying vec3 vViewPos;
      varying vec3 vLocalPos;
      void main() {
        vec3 N = normalize(vNormalView);
        vec3 V = normalize(vViewPos);
        float ndotv = clamp(abs(dot(N, V)), 0.0, 1.0);
        float fresnel = pow(1.0 - ndotv, uRimPower);
        float topShade = 0.85 + 0.15 * clamp(N.y, -1.0, 1.0);
        float shimmer = 0.94 + 0.06 * sin(vLocalPos.y * 7.5 - uTime * 2.8);
        // Deep translucent azure-cyan interior with crisp luminous icy-cyan Fresnel rim (never overexposed!)
        vec3 coreCol = uBaseColor * 0.82 * topShade;
        vec3 rimCol = uRimColor * 1.08;
        vec3 col = mix(coreCol, rimCol, clamp(fresnel * 1.15, 0.0, 1.0)) * shimmer;
        float alpha = clamp(uOpacity * (0.48 + fresnel * 0.68), 0.22, 0.88);
        gl_FragColor = vec4(col, alpha);
      }
    `,
    transparent: true,
    depthWrite,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    side: additive ? THREE.DoubleSide : THREE.FrontSide,
    toneMapped: false,
  });
}
