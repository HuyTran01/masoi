/**
 * Lightweight self-contained QR Code matrix generator (Byte mode, ECC Level L, Versions 1..6)
 * Produces a genuine scannable QR code SVG with zero external network dependencies (BUG-16).
 */

const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);
(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) {
    GF_EXP[i] = GF_EXP[i - 255];
  }
})();

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[GF_LOG[a] + GF_LOG[b]];
}

function rsGeneratorPoly(ecCount: number): number[] {
  let poly = [1];
  for (let i = 0; i < ecCount; i++) {
    const next = new Array<number>(poly.length + 1).fill(0);
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j];
      next[j + 1] ^= gfMul(poly[j], GF_EXP[i]);
    }
    poly = next;
  }
  return poly;
}

function rsComputeEcc(data: number[], ecCount: number): number[] {
  const gen = rsGeneratorPoly(ecCount);
  const res = new Array<number>(ecCount).fill(0);
  for (const b of data) {
    const factor = b ^ res.shift()!;
    res.push(0);
    for (let i = 0; i < ecCount; i++) {
      res[i] ^= gfMul(gen[i + 1], factor);
    }
  }
  return res;
}

// Version 1..6 Level-L specs: [version, totalCodewords, dataCodewords, ecPerBlock, blocks, alignmentCenters]
const QR_SPECS: Array<{
  version: number;
  size: number;
  dataCap: number;
  ecCount: number;
  blocks: number;
  align: number[];
}> = [
  { version: 1, size: 21, dataCap: 19, ecCount: 7, blocks: 1, align: [] },
  { version: 2, size: 25, dataCap: 34, ecCount: 10, blocks: 1, align: [6, 18] },
  { version: 3, size: 29, dataCap: 55, ecCount: 15, blocks: 1, align: [6, 22] },
  { version: 4, size: 33, dataCap: 80, ecCount: 20, blocks: 1, align: [6, 26] },
  { version: 5, size: 37, dataCap: 108, ecCount: 26, blocks: 1, align: [6, 30] },
  { version: 6, size: 41, dataCap: 136, ecCount: 18, blocks: 2, align: [6, 34] },
];

export function generateQrMatrix(text: string): boolean[][] {
  const bytes = Array.from(new TextEncoder().encode(text));
  const spec =
    QR_SPECS.find((s) => bytes.length + 2 <= s.dataCap) || QR_SPECS[QR_SPECS.length - 1];
  const safeBytes = bytes.slice(0, spec.dataCap - 2);

  // Build bit stream: Byte mode (0100), 8-bit length, payload, terminator, pad bytes
  const bits: number[] = [];
  const pushBits = (val: number, len: number) => {
    for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1);
  };
  pushBits(0b0100, 4);
  pushBits(safeBytes.length, 8);
  for (const b of safeBytes) pushBits(b, 8);
  const maxBits = spec.dataCap * 8;
  for (let i = 0; i < 4 && bits.length < maxBits; i++) bits.push(0);
  while (bits.length % 8 !== 0) bits.push(0);

  const dataCodewords: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let val = 0;
    for (let j = 0; j < 8; j++) val = (val << 1) | bits[i + j];
    dataCodewords.push(val);
  }
  const padBytes = [0xec, 0x11];
  let padIdx = 0;
  while (dataCodewords.length < spec.dataCap) {
    dataCodewords.push(padBytes[padIdx % 2]);
    padIdx++;
  }

  // Split blocks & compute ECC
  const blockLen = Math.floor(spec.dataCap / spec.blocks);
  const dataBlocks: number[][] = [];
  const eccBlocks: number[][] = [];
  for (let b = 0; b < spec.blocks; b++) {
    const slice = dataCodewords.slice(b * blockLen, (b + 1) * blockLen);
    dataBlocks.push(slice);
    eccBlocks.push(rsComputeEcc(slice, spec.ecCount));
  }

  const finalCodewords: number[] = [];
  for (let i = 0; i < blockLen; i++) {
    for (let b = 0; b < spec.blocks; b++) finalCodewords.push(dataBlocks[b][i]);
  }
  for (let i = 0; i < spec.ecCount; i++) {
    for (let b = 0; b < spec.blocks; b++) finalCodewords.push(eccBlocks[b][i]);
  }

  const size = spec.size;
  const modules: Array<Array<boolean | null>> = Array.from({ length: size }, () =>
    Array<boolean | null>(size).fill(null)
  );
  const isFunction: boolean[][] = Array.from({ length: size }, () =>
    Array<boolean>(size).fill(false)
  );

  const setFn = (r: number, c: number, val: boolean) => {
    if (r < 0 || r >= size || c < 0 || c >= size) return;
    modules[r][c] = val;
    isFunction[r][c] = true;
  };

  const drawFinder = (tr: number, tc: number) => {
    for (let dr = -1; dr <= 7; dr++) {
      for (let dc = -1; dc <= 7; dc++) {
        const r = tr + dr;
        const c = tc + dc;
        if (r < 0 || r >= size || c < 0 || c >= size) continue;
        const inOuter = dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6;
        const onBorder = dr === 0 || dr === 6 || dc === 0 || dc === 6;
        const inCenter = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4;
        setFn(r, c, inOuter && (onBorder || inCenter));
      }
    }
  };

  drawFinder(0, 0);
  drawFinder(0, size - 7);
  drawFinder(size - 7, 0);

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    setFn(6, i, i % 2 === 0);
    setFn(i, 6, i % 2 === 0);
  }

  // Alignment patterns
  for (const r of spec.align) {
    for (const c of spec.align) {
      if (isFunction[r][c]) continue;
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          const dist = Math.max(Math.abs(dr), Math.abs(dc));
          setFn(r + dr, c + dc, dist !== 1);
        }
      }
    }
  }

  // Reserve format info & dark module
  for (let i = 0; i <= 8; i++) {
    if (i !== 6) {
      setFn(8, i, false);
      setFn(i, 8, false);
    }
  }
  for (let i = 0; i < 8; i++) {
    setFn(8, size - 1 - i, false);
    setFn(size - 1 - i, 8, false);
  }
  setFn(size - 8, 8, true);

  // Place data bits in zig-zag columns with Mask 0 ((r + c) % 2 === 0)
  const finalBits: number[] = [];
  for (const cw of finalCodewords) {
    for (let i = 7; i >= 0; i--) finalBits.push((cw >>> i) & 1);
  }

  let bitIdx = 0;
  let upward = true;
  for (let col = size - 1; col >= 1; col -= 2) {
    if (col === 6) col--;
    for (let step = 0; step < size; step++) {
      const row = upward ? size - 1 - step : step;
      for (let offset = 0; offset < 2; offset++) {
        const c = col - offset;
        if (!isFunction[row][c]) {
          const rawBit = bitIdx < finalBits.length ? finalBits[bitIdx++] === 1 : false;
          const maskBit = (row + c) % 2 === 0;
          modules[row][c] = rawBit !== maskBit;
        }
      }
    }
    upward = !upward;
  }

  // Format bits for ECC Level L (01) + Mask 0 (000) -> 0b01000 -> BCH + XOR 0x5412 = 0x77c4 (111011111000100)
  const formatBits = 0b111011111000100;
  for (let i = 0; i <= 5; i++) setFn(8, i, ((formatBits >>> (14 - i)) & 1) === 1);
  setFn(8, 7, ((formatBits >>> 8) & 1) === 1);
  setFn(8, 8, ((formatBits >>> 7) & 1) === 1);
  setFn(7, 8, ((formatBits >>> 6) & 1) === 1);
  for (let i = 9; i < 15; i++) setFn(14 - i, 8, ((formatBits >>> (14 - i)) & 1) === 1);
  for (let i = 0; i < 8; i++) setFn(8, size - 1 - i, ((formatBits >>> i) & 1) === 1);
  for (let i = 0; i < 7; i++) setFn(size - 1 - i, 8, ((formatBits >>> (14 - i)) & 1) === 1);

  return modules.map((row) => row.map((cell) => Boolean(cell)));
}
