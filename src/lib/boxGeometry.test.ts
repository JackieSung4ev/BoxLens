import { describe, expect, it } from 'vitest';
import { getFacePlacement, normalizeDimensions } from './boxGeometry';
import type { BoxDimensions } from '../types';

describe('normalizeDimensions', () => {
  it('preserves the real-world ratio while fitting the largest dimension to the viewport target', () => {
    const dimensions: BoxDimensions = { width: 120, height: 180, depth: 60 };

    const normalized = normalizeDimensions(dimensions, 2.7);

    expect(normalized.width).toBeCloseTo(1.8, 5);
    expect(normalized.height).toBeCloseTo(2.7, 5);
    expect(normalized.depth).toBeCloseTo(0.9, 5);
    expect(normalized.width / normalized.height).toBeCloseTo(120 / 180, 5);
    expect(normalized.depth / normalized.height).toBeCloseTo(60 / 180, 5);
  });

  it('guards against empty or negative input without breaking the scene scale', () => {
    const normalized = normalizeDimensions({ width: 0, height: -20, depth: 80 }, 2.4);

    expect(normalized.width).toBeGreaterThan(0);
    expect(normalized.height).toBeGreaterThan(0);
    expect(normalized.depth).toBeCloseTo(2.4, 5);
  });
});

describe('getFacePlacement', () => {
  it('places each artwork plane slightly above the matching box face', () => {
    const size = { width: 1.8, height: 2.7, depth: 0.9 };

    expect(getFacePlacement('front', size)).toMatchObject({
      position: [0, 0, 0.451],
      rotation: [0, 0, 0],
      planeSize: [1.8, 2.7],
    });
    expect(getFacePlacement('back', size)).toMatchObject({
      position: [0, 0, -0.451],
      rotation: [0, Math.PI, 0],
      planeSize: [1.8, 2.7],
    });
    expect(getFacePlacement('left', size)).toMatchObject({
      position: [-0.901, 0, 0],
      rotation: [0, -Math.PI / 2, 0],
      planeSize: [0.9, 2.7],
    });
    expect(getFacePlacement('right', size)).toMatchObject({
      position: [0.901, 0, 0],
      rotation: [0, Math.PI / 2, 0],
      planeSize: [0.9, 2.7],
    });
    expect(getFacePlacement('top', size)).toMatchObject({
      position: [0, 1.351, 0],
      rotation: [-Math.PI / 2, 0, 0],
      planeSize: [1.8, 0.9],
    });
    expect(getFacePlacement('bottom', size)).toMatchObject({
      position: [0, -1.351, 0],
      rotation: [Math.PI / 2, 0, 0],
      planeSize: [1.8, 0.9],
    });
  });
});
