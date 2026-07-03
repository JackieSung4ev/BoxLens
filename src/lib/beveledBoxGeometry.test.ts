import { describe, expect, it } from 'vitest';
import { createEdgeBeveledBoxGeometry } from './beveledBoxGeometry';

function getPositions(geometry: ReturnType<typeof createEdgeBeveledBoxGeometry>) {
  const position = geometry.getAttribute('position');
  const points: Array<[number, number, number]> = [];

  for (let index = 0; index < position.count; index += 1) {
    points.push([position.getX(index), position.getY(index), position.getZ(index)]);
  }

  return points;
}

describe('createEdgeBeveledBoxGeometry', () => {
  it('builds Blender-style edge bevel faces around the six inset main faces', () => {
    const geometry = createEdgeBeveledBoxGeometry(2, 4, 6, 0.25, 1);
    const points = getPositions(geometry);
    const frontFacePoints = points.filter((point) => point[2] === 3);
    const frontXs = frontFacePoints.map((point) => point[0]);
    const frontYs = frontFacePoints.map((point) => point[1]);

    expect(geometry.getAttribute('position').count).toBe(132);
    expect(Math.min(...frontXs)).toBeCloseTo(-0.75);
    expect(Math.max(...frontXs)).toBeCloseTo(0.75);
    expect(Math.min(...frontYs)).toBeCloseTo(-1.75);
    expect(Math.max(...frontYs)).toBeCloseTo(1.75);
    expect(points).toContainEqual([1, 1.75, 2.75]);
    expect(points).toContainEqual([0.75, 2, 2.75]);
  });

  it('uses twelve bevel segments by default for a rounded edge profile', () => {
    const geometry = createEdgeBeveledBoxGeometry(2, 4, 6, 0.25);

    expect(geometry.getAttribute('position').count).toBe(7524);
  });

  it('adds intermediate rounded edge points when segments are above one', () => {
    const geometry = createEdgeBeveledBoxGeometry(2, 4, 6, 0.25, 6);
    const points = getPositions(geometry);
    const hasMidpointOnFrontTopRightEdge = points.some(
      ([x, y, z]) =>
        Math.abs(x - (0.75 + Math.cos(Math.PI / 4) * 0.25)) < 0.00001 &&
        Math.abs(y - (1.75 + Math.sin(Math.PI / 4) * 0.25)) < 0.00001 &&
        Math.abs(z - 2.75) < 0.00001,
    );

    expect(hasMidpointOnFrontTopRightEdge).toBe(true);
  });

  it('falls back to a plain six-face box when the edge bevel is zero', () => {
    const geometry = createEdgeBeveledBoxGeometry(2, 4, 6, 0);

    expect(geometry.getAttribute('position').count).toBe(36);
  });
});
