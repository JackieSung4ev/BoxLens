import { describe, expect, it } from 'vitest';
import { clampFaceCornerRadius, createRoundedFaceShape } from './roundedFace';

describe('rounded face geometry helpers', () => {
  it('clamps the face radius to half of the smaller side', () => {
    expect(clampFaceCornerRadius(2, 1, 0.8)).toBe(0.5);
    expect(clampFaceCornerRadius(2, 1, -1)).toBe(0);
    expect(clampFaceCornerRadius(2, 1, Number.NaN)).toBe(0);
  });

  it('builds a centered rounded rectangle shape', () => {
    const shape = createRoundedFaceShape(2, 1, 0.2);
    const points = shape.getPoints(8);
    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);

    expect(Math.min(...xs)).toBeCloseTo(-1);
    expect(Math.max(...xs)).toBeCloseTo(1);
    expect(Math.min(...ys)).toBeCloseTo(-0.5);
    expect(Math.max(...ys)).toBeCloseTo(0.5);
  });
});
