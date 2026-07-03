export const CAMERA_BASE_POSITION = [3.35, 2.35, 4.25] as const;
export const CAMERA_REFERENCE_FOCAL_LENGTH_MM = 50;

const MIN_CAMERA_SCALE = 1;
const FOCAL_LENGTH_FRAMING_MULTIPLIER = 1.35;
const DOLLY_HEADROOM_MULTIPLIER = 2.2;
const FOG_NEAR_MULTIPLIER = 1.25;
const FOG_FAR_MULTIPLIER = 1.12;

const BASE_CAMERA_DISTANCE = Math.hypot(...CAMERA_BASE_POSITION);

export function getCameraScaleForFocalLength(focalLengthMm: number): number {
  const safeFocalLength =
    Number.isFinite(focalLengthMm) && focalLengthMm > 0 ? focalLengthMm : CAMERA_REFERENCE_FOCAL_LENGTH_MM;

  return Math.max(
    MIN_CAMERA_SCALE,
    (safeFocalLength / CAMERA_REFERENCE_FOCAL_LENGTH_MM) * FOCAL_LENGTH_FRAMING_MULTIPLIER,
  );
}

export function getCameraDistanceForFocalLength(focalLengthMm: number): number {
  return BASE_CAMERA_DISTANCE * getCameraScaleForFocalLength(focalLengthMm);
}

export function getCameraPositionForFocalLength(focalLengthMm: number): [number, number, number] {
  const scale = getCameraScaleForFocalLength(focalLengthMm);

  return [CAMERA_BASE_POSITION[0] * scale, CAMERA_BASE_POSITION[1] * scale, CAMERA_BASE_POSITION[2] * scale];
}

export function getCameraMaxDistance(focalLengthMm: number): number {
  return getCameraDistanceForFocalLength(focalLengthMm) * DOLLY_HEADROOM_MULTIPLIER;
}

export function getCameraFogRange(focalLengthMm: number): { far: number; near: number } {
  return {
    far: getCameraMaxDistance(focalLengthMm) * FOG_FAR_MULTIPLIER,
    near: getCameraDistanceForFocalLength(focalLengthMm) * FOG_NEAR_MULTIPLIER,
  };
}
