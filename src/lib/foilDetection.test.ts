import { describe, expect, it } from 'vitest';
import { detectFoilAlphaFromRgba } from './foilDetection';

describe('detectFoilAlphaFromRgba', () => {
  it('detects saturated gold and yellow pixels as foil candidates', () => {
    expect(detectFoilAlphaFromRgba(255, 214, 0, 255)).toBe(255);
    expect(detectFoilAlphaFromRgba(212, 175, 55, 255)).toBe(255);
  });

  it('rejects neutral beige and gray pixels to reduce false positives', () => {
    expect(detectFoilAlphaFromRgba(214, 196, 160, 255)).toBe(0);
    expect(detectFoilAlphaFromRgba(180, 180, 170, 255)).toBe(0);
  });

  it('rejects transparent pixels', () => {
    expect(detectFoilAlphaFromRgba(255, 214, 0, 0)).toBe(0);
  });
});
