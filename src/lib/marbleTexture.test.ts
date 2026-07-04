import { describe, expect, it } from 'vitest';
import { getMarbleTextureSettings, sampleMarblePixel } from './marbleTexture';

function brightness({ b, g, r }: ReturnType<typeof sampleMarblePixel>) {
  return (r + g + b) / 3;
}

describe('marbleTexture', () => {
  it('uses one large slab texture instead of repeated tiles', () => {
    const settings = getMarbleTextureSettings();

    expect(settings.size).toBeGreaterThanOrEqual(2048);
    expect(settings.wrap).toBe('clampToEdge');
    expect(settings.repeat).toEqual([1, 1]);
  });

  it('keeps the marble light while adding visible non-repeating veining', () => {
    const samples = [
      sampleMarblePixel(0.08, 0.12),
      sampleMarblePixel(0.25, 0.48),
      sampleMarblePixel(0.52, 0.38),
      sampleMarblePixel(0.77, 0.71),
      sampleMarblePixel(0.94, 0.19),
    ];
    const values = samples.map(brightness);
    const leftEdge = sampleMarblePixel(0.02, 0.54);
    const rightEdge = sampleMarblePixel(0.98, 0.54);
    const edgeDelta =
      Math.abs(leftEdge.r - rightEdge.r) +
      Math.abs(leftEdge.g - rightEdge.g) +
      Math.abs(leftEdge.b - rightEdge.b);

    expect(Math.min(...values)).toBeGreaterThan(120);
    expect(Math.max(...values) - Math.min(...values)).toBeGreaterThan(35);
    expect(edgeDelta).toBeGreaterThan(18);
  });
});
