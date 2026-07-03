import { Shape } from 'three';

export function clampFaceCornerRadius(width: number, height: number, radius: number): number {
  if (!Number.isFinite(width) || !Number.isFinite(height) || !Number.isFinite(radius) || radius <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(radius, Math.min(Math.abs(width), Math.abs(height)) / 2));
}

export function createRoundedFaceShape(width: number, height: number, radius: number): Shape {
  const shape = new Shape();
  const safeWidth = Number.isFinite(width) && width > 0 ? width : 1;
  const safeHeight = Number.isFinite(height) && height > 0 ? height : 1;
  const r = clampFaceCornerRadius(safeWidth, safeHeight, radius);
  const halfWidth = safeWidth / 2;
  const halfHeight = safeHeight / 2;

  if (r === 0) {
    shape.moveTo(-halfWidth, -halfHeight);
    shape.lineTo(halfWidth, -halfHeight);
    shape.lineTo(halfWidth, halfHeight);
    shape.lineTo(-halfWidth, halfHeight);
    shape.lineTo(-halfWidth, -halfHeight);
    return shape;
  }

  shape.moveTo(-halfWidth + r, -halfHeight);
  shape.lineTo(halfWidth - r, -halfHeight);
  shape.quadraticCurveTo(halfWidth, -halfHeight, halfWidth, -halfHeight + r);
  shape.lineTo(halfWidth, halfHeight - r);
  shape.quadraticCurveTo(halfWidth, halfHeight, halfWidth - r, halfHeight);
  shape.lineTo(-halfWidth + r, halfHeight);
  shape.quadraticCurveTo(-halfWidth, halfHeight, -halfWidth, halfHeight - r);
  shape.lineTo(-halfWidth, -halfHeight + r);
  shape.quadraticCurveTo(-halfWidth, -halfHeight, -halfWidth + r, -halfHeight);

  return shape;
}
