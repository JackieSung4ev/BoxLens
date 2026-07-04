export interface MarblePixel {
  b: number;
  bump: number;
  g: number;
  r: number;
}

export const MARBLE_TEXTURE_SIZE = 2048;

export function getMarbleTextureSettings() {
  return {
    repeat: [1, 1] as [number, number],
    size: MARBLE_TEXTURE_SIZE,
    wrap: 'clampToEdge' as const,
  };
}

export function createMarbleTextureCanvases() {
  const { size } = getMarbleTextureSettings();
  const colorCanvas = document.createElement('canvas');
  const bumpCanvas = document.createElement('canvas');
  colorCanvas.width = size;
  colorCanvas.height = size;
  bumpCanvas.width = size;
  bumpCanvas.height = size;

  const colorContext = colorCanvas.getContext('2d', { willReadFrequently: true });
  const bumpContext = bumpCanvas.getContext('2d', { willReadFrequently: true });

  if (colorContext && bumpContext) {
    const colorData = colorContext.createImageData(size, size);
    const bumpData = bumpContext.createImageData(size, size);

    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const index = (y * size + x) * 4;
        const pixel = sampleMarblePixel(x / (size - 1), y / (size - 1));

        colorData.data[index] = pixel.r;
        colorData.data[index + 1] = pixel.g;
        colorData.data[index + 2] = pixel.b;
        colorData.data[index + 3] = 255;
        bumpData.data[index] = pixel.bump;
        bumpData.data[index + 1] = pixel.bump;
        bumpData.data[index + 2] = pixel.bump;
        bumpData.data[index + 3] = 255;
      }
    }

    colorContext.putImageData(colorData, 0, 0);
    bumpContext.putImageData(bumpData, 0, 0);
  }

  return { bumpCanvas, colorCanvas };
}

export function sampleMarblePixel(u: number, v: number): MarblePixel {
  const nx = clamp01(u);
  const ny = clamp01(v);
  const x = nx * 2.35;
  const y = ny * 1.75;
  const cloud = fbm(x * 0.9 + 8.2, y * 0.9 - 3.8, 5);
  const warpX = x + (fbm(x * 1.45 + 31.1, y * 1.45 - 11.7, 5) - 0.5) * 0.86;
  const warpY = y + (fbm(x * 1.65 - 12.6, y * 1.65 + 24.8, 5) - 0.5) * 0.74;
  const flow = warpX * 1.18 + warpY * 0.46 + Math.sin((warpY + cloud * 0.9) * 2.6) * 0.16;
  const mainWave = Math.sin((flow + fbm(warpX * 2.15 + 4.2, warpY * 2.15 + 19.1, 5) * 0.92) * Math.PI * 2.25);
  const secondaryWave = Math.sin(
    (warpX * -0.62 + warpY * 1.36 + fbm(warpX * 3.2 + 61.4, warpY * 3.2 - 4.6, 4) * 0.78) *
      Math.PI *
      1.65,
  );
  const slabWave = Math.sin(
    (nx * 1.65 - ny * 0.74 + fbm(x * 0.86 + 52.4, y * 0.86 - 21.9, 4) * 0.55) * Math.PI * 2.1,
  );
  const crackWave = Math.sin(
    (warpX * 4.9 - warpY * 2.25 + fbm(warpX * 7.4 + 81.2, warpY * 7.4 + 3.7, 3) * 1.38) * Math.PI,
  );
  const mainWidth = 0.065 + fbm(warpX * 8.2 - 7.1, warpY * 8.2 + 9.4, 3) * 0.055;
  const mainVein = Math.pow(1 - smoothstep(0, mainWidth, Math.abs(mainWave)), 1.45);
  const softVein = Math.pow(1 - smoothstep(0, 0.16, Math.abs(secondaryWave)), 2.1) * 0.58;
  const slabVein = Math.pow(1 - smoothstep(0, 0.18, Math.abs(slabWave)), 2.2) * (0.45 + cloud * 0.45);
  const hairline = Math.pow(1 - smoothstep(0, 0.028, Math.abs(crackWave)), 4.2) * (0.35 + cloud * 0.5);
  const mineral = fbm(warpX * 17.5 + 2.4, warpY * 17.5 - 16.2, 2);
  const cloudyShade = (cloud - 0.5) * 44 + (fbm(x * 4.6 + 2.3, y * 4.6 + 33.6, 3) - 0.5) * 20;
  const veinStrength = clamp01(mainVein * 0.9 + softVein * 0.62 + slabVein * 0.52 + hairline * 1.1);
  const base = 238 + cloudyShade - mainVein * 88 - softVein * 52 - slabVein * 62 - hairline * 64 - mineral * 7;
  const coolCast = (fbm(x * 1.1 - 9.8, y * 1.1 + 15.5, 4) - 0.5) * 9;

  return {
    b: clampChannel(base + 5 + coolCast * 0.55 - veinStrength * 2),
    bump: clampChannel(126 + mainVein * 70 + softVein * 36 + slabVein * 30 + hairline * 88 + mineral * 12),
    g: clampChannel(base + 8 - coolCast * 0.12),
    r: clampChannel(base + 12 - coolCast * 0.35),
  };
}

function fbm(x: number, y: number, octaves: number): number {
  let amplitude = 0.5;
  let frequency = 1;
  let max = 0;
  let sum = 0;

  for (let octave = 0; octave < octaves; octave += 1) {
    sum += valueNoise(x * frequency, y * frequency) * amplitude;
    max += amplitude;
    amplitude *= 0.52;
    frequency *= 2.03;
  }

  return sum / max;
}

function valueNoise(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const sx = smoothstep(0, 1, fx);
  const sy = smoothstep(0, 1, fy);
  const top = lerp(hash(ix, iy), hash(ix + 1, iy), sx);
  const bottom = lerp(hash(ix, iy + 1), hash(ix + 1, iy + 1), sx);

  return lerp(top, bottom, sy);
}

function hash(x: number, y: number): number {
  const value = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;

  return value - Math.floor(value);
}

function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = clamp01((value - edge0) / (edge1 - edge0));

  return t * t * (3 - 2 * t);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(1, value));
}

function clampChannel(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}
