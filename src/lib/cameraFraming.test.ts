import { describe, expect, it } from 'vitest';
import {
  getCameraDistanceForFocalLength,
  getCameraFogRange,
  getCameraMaxDistance,
  getCameraPositionForFocalLength,
} from './cameraFraming';

describe('cameraFraming', () => {
  it('pulls a 110mm lens farther than the old zoom limit', () => {
    const distance = getCameraDistanceForFocalLength(110);
    const position = getCameraPositionForFocalLength(110);

    expect(distance).toBeGreaterThan(16);
    expect(Math.hypot(...position)).toBeCloseTo(distance, 5);
  });

  it('lets users dolly farther than the default product-shot framing', () => {
    const distance = getCameraDistanceForFocalLength(110);

    expect(getCameraMaxDistance(110)).toBeGreaterThan(distance * 1.8);
  });

  it('keeps fog beyond the default and maximum camera distances', () => {
    const distance = getCameraDistanceForFocalLength(110);
    const maxDistance = getCameraMaxDistance(110);
    const fogRange = getCameraFogRange(110);

    expect(fogRange.near).toBeGreaterThan(distance);
    expect(fogRange.far).toBeGreaterThan(maxDistance);
  });
});
