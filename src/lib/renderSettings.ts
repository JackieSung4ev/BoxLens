import type { BoxDimensions } from '../types';

const MIN_DIMENSION_MM = 1;
export const MAX_CORNER_RADIUS_MM = 10;
const DEFAULT_TARGET_LARGEST_AXIS = 2.7;

export function clampCornerRadiusMm(cornerRadiusMm: number, dimensions: BoxDimensions): number {
  if (!Number.isFinite(cornerRadiusMm) || cornerRadiusMm <= 0) {
    return 0;
  }

  const smallestDimension = Math.min(
    sanitizeDimension(dimensions.width),
    sanitizeDimension(dimensions.height),
    sanitizeDimension(dimensions.depth),
  );

  return Math.min(cornerRadiusMm, MAX_CORNER_RADIUS_MM, smallestDimension / 2);
}

export function getDimensionScale(
  dimensions: BoxDimensions,
  targetLargestAxis = DEFAULT_TARGET_LARGEST_AXIS,
): number {
  const largestDimension = Math.max(
    sanitizeDimension(dimensions.width),
    sanitizeDimension(dimensions.height),
    sanitizeDimension(dimensions.depth),
  );

  return targetLargestAxis / largestDimension;
}

export function cornerRadiusMmToSceneUnits(
  cornerRadiusMm: number,
  dimensions: BoxDimensions,
  targetLargestAxis = DEFAULT_TARGET_LARGEST_AXIS,
): number {
  return clampCornerRadiusMm(cornerRadiusMm, dimensions) * getDimensionScale(dimensions, targetLargestAxis);
}

function sanitizeDimension(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : MIN_DIMENSION_MM;
}
