import type { CmykColor, RgbColor } from '../types';

export function clampColorChannel(value: number): number {
  return clampRounded(value, 0, 255);
}

export function clampPercentChannel(value: number): number {
  return clampRounded(value, 0, 100);
}

export function hexToRgb(hex: string): RgbColor {
  const normalized = normalizeHex(hex);

  return {
    r: Number.parseInt(normalized.slice(1, 3), 16),
    g: Number.parseInt(normalized.slice(3, 5), 16),
    b: Number.parseInt(normalized.slice(5, 7), 16),
  };
}

export function rgbToHex(color: RgbColor): string {
  return `#${toHexPair(clampColorChannel(color.r))}${toHexPair(clampColorChannel(color.g))}${toHexPair(
    clampColorChannel(color.b),
  )}`;
}

export function hexToCmyk(hex: string): CmykColor {
  return rgbToCmyk(hexToRgb(hex));
}

export function rgbToCmyk(color: RgbColor): CmykColor {
  const r = clampColorChannel(color.r) / 255;
  const g = clampColorChannel(color.g) / 255;
  const b = clampColorChannel(color.b) / 255;
  const k = 1 - Math.max(r, g, b);

  if (k >= 1) {
    return { c: 0, m: 0, y: 0, k: 100 };
  }

  return {
    c: Math.round(((1 - r - k) / (1 - k)) * 100),
    m: Math.round(((1 - g - k) / (1 - k)) * 100),
    y: Math.round(((1 - b - k) / (1 - k)) * 100),
    k: Math.round(k * 100),
  };
}

export function cmykToHex(color: CmykColor): string {
  return rgbToHex(cmykToRgb(color));
}

export function cmykToRgb(color: CmykColor): RgbColor {
  const c = clampPercentChannel(color.c) / 100;
  const m = clampPercentChannel(color.m) / 100;
  const y = clampPercentChannel(color.y) / 100;
  const k = clampPercentChannel(color.k) / 100;

  return {
    r: Math.round(255 * (1 - c) * (1 - k)),
    g: Math.round(255 * (1 - m) * (1 - k)),
    b: Math.round(255 * (1 - y) * (1 - k)),
  };
}

function clampRounded(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(max, Math.max(min, Math.round(value)));
}

function normalizeHex(hex: string): string {
  const cleaned = hex.trim().replace(/^#/, '');

  if (/^[\da-f]{3}$/i.test(cleaned)) {
    return `#${cleaned
      .split('')
      .map((character) => `${character}${character}`)
      .join('')}`.toLowerCase();
  }

  if (/^[\da-f]{6}$/i.test(cleaned)) {
    return `#${cleaned.toLowerCase()}`;
  }

  return '#000000';
}

function toHexPair(value: number): string {
  return value.toString(16).padStart(2, '0');
}
