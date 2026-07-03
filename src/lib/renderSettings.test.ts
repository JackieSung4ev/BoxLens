import { describe, expect, it } from 'vitest';
import { clampCornerRadiusMm, cornerRadiusMmToSceneUnits, getDimensionScale } from './renderSettings';

describe('corner radius render settings', () => {
  it('clamps corner radius to half of the smallest real-world box dimension', () => {
    const clamped = clampCornerRadiusMm(30, { width: 40, height: 80, depth: 20 });

    expect(clamped).toBe(10);
  });

  it('caps corner radius at 10mm for packaging previews', () => {
    const clamped = clampCornerRadiusMm(16, { width: 120, height: 180, depth: 60 });

    expect(clamped).toBe(10);
  });

  it('treats invalid corner radius values as square corners', () => {
    expect(clampCornerRadiusMm(Number.NaN, { width: 120, height: 180, depth: 60 })).toBe(0);
    expect(clampCornerRadiusMm(-4, { width: 120, height: 180, depth: 60 })).toBe(0);
  });

  it('uses the same scale as normalized box dimensions when converting millimeters', () => {
    const dimensions = { width: 120, height: 180, depth: 60 };

    expect(getDimensionScale(dimensions)).toBeCloseTo(0.015, 5);
    expect(cornerRadiusMmToSceneUnits(3, dimensions)).toBeCloseTo(0.045, 5);
  });
});
