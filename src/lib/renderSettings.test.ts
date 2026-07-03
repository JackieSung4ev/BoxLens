import { describe, expect, it } from 'vitest';
import { clampCornerRadiusMm, cornerRadiusMmToSceneUnits, getDimensionScale } from './renderSettings';

describe('edge bevel render settings', () => {
  it('clamps edge bevel width to half of the smallest real-world box dimension', () => {
    const clamped = clampCornerRadiusMm(30, { width: 40, height: 80, depth: 6 });

    expect(clamped).toBe(3);
  });

  it('caps edge bevel width at 5mm for packaging previews', () => {
    const clamped = clampCornerRadiusMm(16, { width: 120, height: 180, depth: 60 });

    expect(clamped).toBe(5);
  });

  it('treats invalid edge bevel values as square edges', () => {
    expect(clampCornerRadiusMm(Number.NaN, { width: 120, height: 180, depth: 60 })).toBe(0);
    expect(clampCornerRadiusMm(-4, { width: 120, height: 180, depth: 60 })).toBe(0);
  });

  it('uses the same scale as normalized box dimensions when converting millimeters', () => {
    const dimensions = { width: 120, height: 180, depth: 60 };

    expect(getDimensionScale(dimensions)).toBeCloseTo(0.015, 5);
    expect(cornerRadiusMmToSceneUnits(3, dimensions)).toBeCloseTo(0.045, 5);
  });
});
