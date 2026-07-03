import type { ArtworkSide, BoxDimensions, FacePlacement, NormalizedBoxDimensions } from '../types';

const MIN_DIMENSION_MM = 1;
const FACE_OFFSET = 0.001;

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

export function getFacePlacement(side: ArtworkSide, size: NormalizedBoxDimensions): FacePlacement {
  switch (side) {
    case 'front':
      return {
        position: [0, 0, size.depth / 2 + FACE_OFFSET],
        rotation: [0, 0, 0],
        planeSize: [size.width, size.height],
      };
    case 'back':
      return {
        position: [0, 0, -size.depth / 2 - FACE_OFFSET],
        rotation: [0, Math.PI, 0],
        planeSize: [size.width, size.height],
      };
    case 'left':
      return {
        position: [-size.width / 2 - FACE_OFFSET, 0, 0],
        rotation: [0, -Math.PI / 2, 0],
        planeSize: [size.depth, size.height],
      };
    case 'right':
      return {
        position: [size.width / 2 + FACE_OFFSET, 0, 0],
        rotation: [0, Math.PI / 2, 0],
        planeSize: [size.depth, size.height],
      };
    case 'top':
      return {
        position: [0, size.height / 2 + FACE_OFFSET, 0],
        rotation: [-Math.PI / 2, 0, 0],
        planeSize: [size.width, size.depth],
      };
    case 'bottom':
      return {
        position: [0, -size.height / 2 - FACE_OFFSET, 0],
        rotation: [Math.PI / 2, 0, 0],
        planeSize: [size.width, size.depth],
      };
  }
}

function sanitizeDimension(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : MIN_DIMENSION_MM;
}
