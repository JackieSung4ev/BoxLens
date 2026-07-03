import { describe, expect, it } from 'vitest';
import { getArtworkTextureTransform, getCoverTransform } from './textureUtils';

describe('getCoverTransform', () => {
  it('crops a wide image horizontally when fitting a narrower plane', () => {
    const transform = getCoverTransform(2, 1);

    expect(transform.repeat).toEqual([0.5, 1]);
    expect(transform.offset).toEqual([0.25, 0]);
  });

  it('crops a tall image vertically when fitting a wider plane', () => {
    const transform = getCoverTransform(0.5, 1.5);

    expect(transform.repeat[0]).toBe(1);
    expect(transform.repeat[1]).toBeCloseTo(1 / 3, 5);
    expect(transform.offset[0]).toBe(0);
    expect(transform.offset[1]).toBeCloseTo(1 / 3, 5);
  });
});

describe('getArtworkTextureTransform', () => {
  it('uses the rotated image aspect when side artwork is pre-rotated', () => {
    const transform = getArtworkTextureTransform(0.5, 1.5, Math.PI / 2);

    expect(transform.rotation).toBeCloseTo(Math.PI / 2, 5);
    expect(transform.center).toEqual([0.5, 0.5]);
    expect(transform.repeat[0]).toBeCloseTo(0.75, 5);
    expect(transform.repeat[1]).toBe(1);
    expect(transform.offset[0]).toBeCloseTo(0.125, 5);
    expect(transform.offset[1]).toBe(0);
  });
});
