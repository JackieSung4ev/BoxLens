import { type Texture, SRGBColorSpace } from 'three';

export interface TextureCoverTransform {
  repeat: [number, number];
  offset: [number, number];
  center?: [number, number];
  rotation?: number;
}

export function getCoverTransform(imageAspect: number, planeAspect: number): TextureCoverTransform {
  if (!Number.isFinite(imageAspect) || !Number.isFinite(planeAspect) || imageAspect <= 0 || planeAspect <= 0) {
    return {
      repeat: [1, 1],
      offset: [0, 0],
    };
  }

  if (imageAspect > planeAspect) {
    const repeatX = planeAspect / imageAspect;

    return {
      repeat: [repeatX, 1],
      offset: [(1 - repeatX) / 2, 0],
    };
  }

  if (imageAspect < planeAspect) {
    const repeatY = imageAspect / planeAspect;

    return {
      repeat: [1, repeatY],
      offset: [0, (1 - repeatY) / 2],
    };
  }

  return {
    repeat: [1, 1],
    offset: [0, 0],
  };
}

export function getArtworkTextureTransform(
  imageAspect: number,
  planeAspect: number,
  rotation = 0,
): Required<TextureCoverTransform> {
  const quarterTurn = isQuarterTurn(rotation);
  const effectiveImageAspect = quarterTurn ? 1 / imageAspect : imageAspect;
  const coverTransform = getCoverTransform(effectiveImageAspect, planeAspect);

  return {
    repeat: coverTransform.repeat,
    offset: coverTransform.offset,
    center: rotation === 0 ? [0, 0] : [0.5, 0.5],
    rotation,
  };
}

export function applyArtworkTextureSettings(texture: Texture, planeSize: [number, number], rotation = 0): Texture {
  const image = texture.image as { width?: number; height?: number; naturalWidth?: number; naturalHeight?: number } | undefined;
  const imageWidth = image?.naturalWidth ?? image?.width ?? 1;
  const imageHeight = image?.naturalHeight ?? image?.height ?? 1;
  const imageAspect = imageWidth / imageHeight;
  const planeAspect = planeSize[0] / planeSize[1];
  const transform = getArtworkTextureTransform(imageAspect, planeAspect, rotation);

  texture.colorSpace = SRGBColorSpace;
  texture.repeat.set(transform.repeat[0], transform.repeat[1]);
  texture.offset.set(transform.offset[0], transform.offset[1]);
  texture.center.set(transform.center[0], transform.center[1]);
  texture.rotation = transform.rotation;
  texture.anisotropy = Math.max(texture.anisotropy, 8);
  texture.needsUpdate = true;

  return texture;
}

function isQuarterTurn(rotation: number): boolean {
  const normalized = Math.abs(rotation) % Math.PI;
  return Math.abs(normalized - Math.PI / 2) < 0.00001;
}
