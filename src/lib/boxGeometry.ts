import type { ArtworkSide, BoxDimensions, FacePlacement, NormalizedBoxDimensions } from '../types';

const MIN_DIMENSION_MM = 1;
const FACE_OFFSET = 0.001;
const MIN_FACE_SIZE = 0.001;

export const ARTWORK_SIDES: ArtworkSide[] = ['front', 'back', 'left', 'right', 'top', 'bottom'];

export const SIDE_LABELS: Record<ArtworkSide, string> = {
  front: 'Front',
  back: 'Back',
  left: 'Left',
  right: 'Right',
  top: 'Top',
  bottom: 'Bottom',
};

export const SIDE_HELPER_TEXT: Record<ArtworkSide, string> = {
  front: 'Main panel facing the camera',
  back: 'Rear panel opposite the front',
  left: 'Left side panel',
  right: 'Right side panel',
  top: 'Top flap or lid artwork',
  bottom: 'Bottom panel artwork',
};

export function normalizeDimensions(
  dimensions: BoxDimensions,
  targetLargestAxis = 2.7,
): NormalizedBoxDimensions {
  const safeDimensions = {
    width: sanitizeDimension(dimensions.width),
    height: sanitizeDimension(dimensions.height),
    depth: sanitizeDimension(dimensions.depth),
  };
  const largest = Math.max(safeDimensions.width, safeDimensions.height, safeDimensions.depth);
  const scale = targetLargestAxis / largest;

  return {
    width: safeDimensions.width * scale,
    height: safeDimensions.height * scale,
    depth: safeDimensions.depth * scale,
  };
}

export function getFacePlacement(side: ArtworkSide, size: NormalizedBoxDimensions, edgeInset = 0): FacePlacement {
  switch (side) {
    case 'front':
      return {
        position: [0, 0, size.depth / 2 + FACE_OFFSET],
        rotation: [0, 0, 0],
        planeSize: insetPlaneSize(size.width, size.height, edgeInset),
      };
    case 'back':
      return {
        position: [0, 0, -size.depth / 2 - FACE_OFFSET],
        rotation: [0, Math.PI, 0],
        planeSize: insetPlaneSize(size.width, size.height, edgeInset),
      };
    case 'left':
      return {
        position: [-size.width / 2 - FACE_OFFSET, 0, 0],
        rotation: [0, -Math.PI / 2, 0],
        planeSize: insetPlaneSize(size.depth, size.height, edgeInset),
      };
    case 'right':
      return {
        position: [size.width / 2 + FACE_OFFSET, 0, 0],
        rotation: [0, Math.PI / 2, 0],
        planeSize: insetPlaneSize(size.depth, size.height, edgeInset),
      };
    case 'top':
      return {
        position: [0, size.height / 2 + FACE_OFFSET, 0],
        rotation: [-Math.PI / 2, 0, 0],
        planeSize: insetPlaneSize(size.width, size.depth, edgeInset),
      };
    case 'bottom':
      return {
        position: [0, -size.height / 2 - FACE_OFFSET, 0],
        rotation: [Math.PI / 2, 0, 0],
        planeSize: insetPlaneSize(size.width, size.depth, edgeInset),
      };
  }
}

function sanitizeDimension(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : MIN_DIMENSION_MM;
}

function insetPlaneSize(width: number, height: number, edgeInset: number): [number, number] {
  const safeWidth = Math.abs(width);
  const safeHeight = Math.abs(height);

  if (!Number.isFinite(edgeInset) || edgeInset <= 0) {
    return [safeWidth, safeHeight];
  }

  const safeInset = Math.min(edgeInset, Math.max(0, Math.min(safeWidth, safeHeight) / 2 - MIN_FACE_SIZE));
  return [Math.max(MIN_FACE_SIZE, safeWidth - safeInset * 2), Math.max(MIN_FACE_SIZE, safeHeight - safeInset * 2)];
}
