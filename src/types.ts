export type ArtworkSide = 'front' | 'back' | 'left' | 'right' | 'top' | 'bottom';
export type FaceAppearanceMode = 'artwork' | 'solid';
export type FaceColorMode = 'rgb' | 'cmyk';
export type SideArtworkRotation = 'rotate90' | 'rotateMinus90' | 'none' | 'rotate180';
export type LightingPreset = 'softbox' | 'studio' | 'crisp' | 'dramatic';
export type LightDirection = 'frontRight' | 'frontLeft' | 'top' | 'sideRight';
export type SurfacePreset = 'none' | 'woodFloor' | 'marble';
export type FoilMode = 'off' | 'auto' | 'mask' | 'autoMask';

export interface BoxDimensions {
  width: number;
  height: number;
  depth: number;
}

export interface NormalizedBoxDimensions {
  width: number;
  height: number;
  depth: number;
}

export interface ArtworkAsset {
  file: File;
  url: string;
}

export type ArtworkMap = Partial<Record<ArtworkSide, ArtworkAsset>>;

export interface FoilSettings {
  color: string;
  intensity: number;
  mask?: ArtworkAsset;
  mode: FoilMode;
}

export type FinishSettingsMap = Record<ArtworkSide, FoilSettings>;

export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

export interface CmykColor {
  c: number;
  m: number;
  y: number;
  k: number;
}

export interface FaceAppearance {
  mode: FaceAppearanceMode;
  color: string;
  colorMode: FaceColorMode;
  cmyk: CmykColor;
}

export type FaceAppearanceMap = Record<ArtworkSide, FaceAppearance>;

export interface RenderSettings {
  backgroundColor: string;
  bevelSegments: number;
  cameraLengthMm: number;
  cornerRadiusMm: number;
  shadows: boolean;
  environment: boolean;
  environmentIntensity: number;
  lightingPreset: LightingPreset;
  lightDirection: LightDirection;
  lightIntensity: number;
  rgbProof: boolean;
  sideArtworkRotation: SideArtworkRotation;
  surface: SurfacePreset;
}

export interface FacePlacement {
  position: [number, number, number];
  rotation: [number, number, number];
  planeSize: [number, number];
}
