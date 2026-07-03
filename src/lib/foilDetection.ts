export interface FoilDetectionOptions {
  alphaThreshold?: number;
  hueMax?: number;
  hueMin?: number;
  lightnessMax?: number;
  lightnessMin?: number;
  saturationMin?: number;
}

const DEFAULT_OPTIONS: Required<FoilDetectionOptions> = {
  alphaThreshold: 16,
  hueMax: 62,
  hueMin: 38,
  lightnessMax: 0.78,
  lightnessMin: 0.28,
  saturationMin: 0.48,
};

export function detectFoilAlphaFromRgba(
  red: number,
  green: number,
  blue: number,
  alpha: number,
  options: FoilDetectionOptions = {},
): number {
  const thresholds = { ...DEFAULT_OPTIONS, ...options };

  if (alpha < thresholds.alphaThreshold) {
    return 0;
  }

  const hsl = rgbToHsl(red, green, blue);
  const isGoldHue = hsl.h >= thresholds.hueMin && hsl.h <= thresholds.hueMax;
  const isSaturated = hsl.s >= thresholds.saturationMin;
  const hasUsefulLightness = hsl.l >= thresholds.lightnessMin && hsl.l <= thresholds.lightnessMax;

  return isGoldHue && isSaturated && hasUsefulLightness ? 255 : 0;
}

export function createAutoFoilMaskCanvas(
  source: CanvasImageSource,
  width: number,
  height: number,
  options?: FoilDetectionOptions,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.floor(width));
  canvas.height = Math.max(1, Math.floor(height));
  const context = canvas.getContext('2d', { willReadFrequently: true });

  if (!context) {
    return canvas;
  }

  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  for (let index = 0; index < data.length; index += 4) {
    const alpha = detectFoilAlphaFromRgba(data[index], data[index + 1], data[index + 2], data[index + 3], options);
    data[index] = alpha;
    data[index + 1] = alpha;
    data[index + 2] = alpha;
    data[index + 3] = 255;
  }

  context.putImageData(imageData, 0, 0);
  return canvas;
}

function rgbToHsl(red: number, green: number, blue: number): { h: number; l: number; s: number } {
  const r = clampColorByte(red) / 255;
  const g = clampColorByte(green) / 255;
  const b = clampColorByte(blue) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) {
    return { h: 0, l, s: 0 };
  }

  const delta = max - min;
  const s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);
  let h: number;

  if (max === r) {
    h = (g - b) / delta + (g < b ? 6 : 0);
  } else if (max === g) {
    h = (b - r) / delta + 2;
  } else {
    h = (r - g) / delta + 4;
  }

  return { h: h * 60, l, s };
}

function clampColorByte(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(255, value));
}
