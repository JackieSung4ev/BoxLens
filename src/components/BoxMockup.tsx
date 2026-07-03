import { Suspense, useEffect, useMemo } from 'react';
import { Edges, RoundedBox, useTexture } from '@react-three/drei';
import { CanvasTexture, DoubleSide, ShapeGeometry, type Texture } from 'three';
import { ARTWORK_SIDES, getFacePlacement, normalizeDimensions } from '../lib/boxGeometry';
import { createAutoFoilMaskCanvas } from '../lib/foilDetection';
import { cornerRadiusMmToSceneUnits } from '../lib/renderSettings';
import { clampFaceCornerRadius, createRoundedFaceShape } from '../lib/roundedFace';
import { applyArtworkTextureSettings } from '../lib/textureUtils';
import type {
  ArtworkAsset,
  ArtworkMap,
  ArtworkSide,
  BoxDimensions,
  FacePlacement,
  FaceAppearanceMap,
  FinishSettingsMap,
  FoilSettings,
  RenderSettings,
  SideArtworkRotation,
} from '../types';

interface BoxMockupProps {
  artwork: ArtworkMap;
  dimensions: BoxDimensions;
  faceAppearance: FaceAppearanceMap;
  finishSettings: FinishSettingsMap;
  settings: RenderSettings;
}

const SIDE_TINTS: Record<ArtworkSide, string> = {
  front: '#3478f6',
  back: '#14b8a6',
  left: '#7c8da3',
  right: '#8b5cf6',
  top: '#f59e0b',
  bottom: '#64748b',
};

export function BoxMockup({ artwork, dimensions, faceAppearance, finishSettings, settings }: BoxMockupProps) {
  const size = useMemo(() => normalizeDimensions(dimensions), [dimensions]);
  const cornerRadius = useMemo(
    () => cornerRadiusMmToSceneUnits(settings.cornerRadiusMm, dimensions),
    [dimensions, settings.cornerRadiusMm],
  );

  return (
    <group rotation={[0, -0.08, 0]}>
      <RoundedBox
        args={[size.width, size.height, size.depth]}
        castShadow
        receiveShadow
        radius={Math.max(0.001, cornerRadius)}
        smoothness={8}
      >
        <meshPhysicalMaterial
          clearcoat={0.18}
          clearcoatRoughness={0.58}
          color="#f4f1ea"
          envMapIntensity={0.18}
          metalness={0}
          roughness={0.66}
        />
        <Edges color="#cfc5b7" threshold={15} />
      </RoundedBox>

      {ARTWORK_SIDES.map((side) => {
        const placement = getFacePlacement(side, size);
        const asset = artwork[side];
        const appearance = faceAppearance[side];
        const finish = finishSettings[side];
        const faceRadius = clampFaceCornerRadius(placement.planeSize[0], placement.planeSize[1], cornerRadius);

        return appearance.mode === 'solid' ? (
          <SolidColorFace
            color={appearance.color}
            finish={finish}
            key={side}
            placement={placement}
            radius={faceRadius}
            rgbProof={settings.rgbProof}
          />
        ) : asset ? (
          <Suspense fallback={<PlaceholderFace placement={placement} radius={faceRadius} side={side} />} key={side}>
            <ArtworkFace
              asset={asset}
              finish={finish}
              placement={placement}
              radius={faceRadius}
              rgbProof={settings.rgbProof}
              rotation={getSideTextureRotation(side, settings.sideArtworkRotation)}
              side={side}
            />
          </Suspense>
        ) : (
          <PlaceholderFace key={side} placement={placement} radius={faceRadius} side={side} />
        );
      })}
    </group>
  );
}

function SolidColorFace({
  color,
  finish,
  placement,
  radius,
  rgbProof,
}: {
  color: string;
  finish: FoilSettings;
  placement: FacePlacement;
  radius: number;
  rgbProof: boolean;
}) {
  return (
    <group position={placement.position} rotation={placement.rotation}>
      <mesh castShadow receiveShadow>
        <RoundedFaceGeometry planeSize={placement.planeSize} radius={radius} />
        {rgbProof ? (
          <meshBasicMaterial color={color} side={DoubleSide} toneMapped={false} />
        ) : (
          <meshStandardMaterial color={color} metalness={0} roughness={0.58} side={DoubleSide} toneMapped={false} />
        )}
      </mesh>
      <FoilOverlay finish={finish} placement={placement} radius={radius} />
    </group>
  );
}

function ArtworkFace({
  asset,
  finish,
  placement,
  radius,
  rgbProof,
  rotation,
  side,
}: {
  asset: ArtworkAsset;
  finish: FoilSettings;
  placement: FacePlacement;
  radius: number;
  rgbProof: boolean;
  rotation: number;
  side: ArtworkSide;
}) {
  const texture = useTexture(asset.url) as Texture;

  useEffect(() => {
    applyArtworkTextureSettings(texture, placement.planeSize, rotation);
  }, [placement.planeSize[0], placement.planeSize[1], rotation, texture]);

  useEffect(() => {
    return () => {
      texture.dispose();
    };
  }, [texture]);

  return (
    <group position={placement.position} rotation={placement.rotation}>
      <mesh castShadow receiveShadow>
        <RoundedFaceGeometry planeSize={placement.planeSize} radius={radius} />
        {rgbProof ? (
          <meshBasicMaterial map={texture} side={DoubleSide} toneMapped={false} transparent={false} />
        ) : (
          <meshStandardMaterial
            map={texture}
            metalness={0}
            roughness={0.48}
            side={DoubleSide}
            toneMapped={false}
            transparent={false}
          />
        )}
      </mesh>
      {rgbProof ? null : (
        <mesh position={[0, 0, -0.002]}>
          <RoundedFaceGeometry planeSize={placement.planeSize} radius={radius} />
          <meshBasicMaterial color={SIDE_TINTS[side]} opacity={0.03} side={DoubleSide} transparent />
        </mesh>
      )}
      <FoilOverlay artworkTexture={texture} finish={finish} placement={placement} radius={radius} rotation={rotation} />
    </group>
  );
}

function FoilOverlay({
  artworkTexture,
  finish,
  placement,
  radius,
  rotation = 0,
}: {
  artworkTexture?: Texture;
  finish: FoilSettings;
  placement: FacePlacement;
  radius: number;
  rotation?: number;
}) {
  const wantsAuto = finish.mode === 'auto' || finish.mode === 'autoMask';
  const wantsMask = finish.mode === 'mask' || finish.mode === 'autoMask';

  if (finish.mode === 'off') {
    return null;
  }

  if (wantsAuto && wantsMask && artworkTexture && finish.mask) {
    return (
      <Suspense fallback={null}>
        <CombinedFoilOverlay
          artworkTexture={artworkTexture}
          finish={finish}
          mask={finish.mask}
          placement={placement}
          radius={radius}
          rotation={rotation}
        />
      </Suspense>
    );
  }

  if (wantsMask && finish.mask) {
    return (
      <Suspense fallback={null}>
        <ManualFoilOverlay finish={finish} mask={finish.mask} placement={placement} radius={radius} rotation={rotation} />
      </Suspense>
    );
  }

  if (wantsAuto && artworkTexture) {
    return <AutoFoilOverlay artworkTexture={artworkTexture} finish={finish} placement={placement} radius={radius} rotation={rotation} />;
  }

  return null;
}

function AutoFoilOverlay({
  artworkTexture,
  finish,
  placement,
  radius,
  rotation,
}: {
  artworkTexture: Texture;
  finish: FoilSettings;
  placement: FacePlacement;
  radius: number;
  rotation: number;
}) {
  const alphaMap = useMemo(() => {
    const source = getTextureImageSource(artworkTexture);
    if (!source) {
      return null;
    }

    const [width, height] = getSourceDimensions(source);
    const texture = new CanvasTexture(createAutoFoilMaskCanvas(source, width, height));
    applyArtworkTextureSettings(texture, placement.planeSize, rotation);
    return texture;
  }, [artworkTexture, placement.planeSize, rotation]);

  useEffect(() => {
    return () => alphaMap?.dispose();
  }, [alphaMap]);

  if (!alphaMap) {
    return null;
  }

  return <FoilMesh alphaMap={alphaMap} finish={finish} placement={placement} radius={radius} />;
}

function ManualFoilOverlay({
  finish,
  mask,
  placement,
  radius,
  rotation,
}: {
  finish: FoilSettings;
  mask: ArtworkAsset;
  placement: FacePlacement;
  radius: number;
  rotation: number;
}) {
  const maskTexture = useTexture(mask.url) as Texture;
  const alphaMap = useMemo(() => {
    const source = getTextureImageSource(maskTexture);
    if (!source) {
      return null;
    }

    const [width, height] = getSourceDimensions(source);
    const texture = new CanvasTexture(createLuminanceMaskCanvas(source, width, height));
    applyArtworkTextureSettings(texture, placement.planeSize, rotation);
    return texture;
  }, [maskTexture, placement.planeSize, rotation]);

  useEffect(() => {
    return () => {
      alphaMap?.dispose();
      maskTexture.dispose();
    };
  }, [alphaMap, maskTexture]);

  if (!alphaMap) {
    return null;
  }

  return <FoilMesh alphaMap={alphaMap} finish={finish} placement={placement} radius={radius} />;
}

function CombinedFoilOverlay({
  artworkTexture,
  finish,
  mask,
  placement,
  radius,
  rotation,
}: {
  artworkTexture: Texture;
  finish: FoilSettings;
  mask: ArtworkAsset;
  placement: FacePlacement;
  radius: number;
  rotation: number;
}) {
  const maskTexture = useTexture(mask.url) as Texture;
  const alphaMap = useMemo(() => {
    const artworkSource = getTextureImageSource(artworkTexture);
    const maskSource = getTextureImageSource(maskTexture);
    if (!artworkSource || !maskSource) {
      return null;
    }

    const [width, height] = getSourceDimensions(artworkSource);
    const texture = new CanvasTexture(createCombinedMaskCanvas(artworkSource, maskSource, width, height));
    applyArtworkTextureSettings(texture, placement.planeSize, rotation);
    return texture;
  }, [artworkTexture, maskTexture, placement.planeSize, rotation]);

  useEffect(() => {
    return () => {
      alphaMap?.dispose();
      maskTexture.dispose();
    };
  }, [alphaMap, maskTexture]);

  if (!alphaMap) {
    return null;
  }

  return <FoilMesh alphaMap={alphaMap} finish={finish} placement={placement} radius={radius} />;
}

function FoilMesh({
  alphaMap,
  finish,
  placement,
  radius,
}: {
  alphaMap: Texture;
  finish: FoilSettings;
  placement: FacePlacement;
  radius: number;
}) {
  return (
    <mesh position={[0, 0, 0.003]} renderOrder={4}>
      <RoundedFaceGeometry planeSize={placement.planeSize} radius={radius} />
      <meshPhysicalMaterial
        alphaMap={alphaMap}
        color={finish.color}
        depthWrite={false}
        metalness={1}
        opacity={clampFoilIntensity(finish.intensity)}
        polygonOffset
        polygonOffsetFactor={-2}
        polygonOffsetUnits={-2}
        roughness={0.16}
        side={DoubleSide}
        toneMapped={false}
        transparent
      />
    </mesh>
  );
}

function createLuminanceMaskCanvas(source: CanvasImageSource, width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.floor(width));
  canvas.height = Math.max(1, Math.floor(height));
  const context = canvas.getContext('2d', { willReadFrequently: true });

  if (!context) {
    return canvas;
  }

  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  for (let index = 0; index < data.length; index += 4) {
    const transparent = data[index + 3] < 16;
    const luminance = transparent ? 0 : Math.round(data[index] * 0.2126 + data[index + 1] * 0.7152 + data[index + 2] * 0.0722);
    data[index] = luminance;
    data[index + 1] = luminance;
    data[index + 2] = luminance;
    data[index + 3] = 255;
  }

  context.putImageData(imageData, 0, 0);
  return canvas;
}

function createCombinedMaskCanvas(
  artworkSource: CanvasImageSource,
  maskSource: CanvasImageSource,
  width: number,
  height: number,
): HTMLCanvasElement {
  const autoCanvas = createAutoFoilMaskCanvas(artworkSource, width, height);
  const maskCanvas = createLuminanceMaskCanvas(maskSource, width, height);
  const context = autoCanvas.getContext('2d', { willReadFrequently: true });
  const maskContext = maskCanvas.getContext('2d', { willReadFrequently: true });

  if (!context || !maskContext) {
    return autoCanvas;
  }

  const autoData = context.getImageData(0, 0, autoCanvas.width, autoCanvas.height);
  const maskData = maskContext.getImageData(0, 0, maskCanvas.width, maskCanvas.height);

  for (let index = 0; index < autoData.data.length; index += 4) {
    const alpha = Math.max(autoData.data[index], maskData.data[index]);
    autoData.data[index] = alpha;
    autoData.data[index + 1] = alpha;
    autoData.data[index + 2] = alpha;
    autoData.data[index + 3] = 255;
  }

  context.putImageData(autoData, 0, 0);
  return autoCanvas;
}

function getTextureImageSource(texture: Texture): CanvasImageSource | null {
  return texture.image && isCanvasImageSource(texture.image) ? texture.image : null;
}

function isCanvasImageSource(source: unknown): source is CanvasImageSource {
  return Boolean(source && typeof source === 'object');
}

function getSourceDimensions(source: CanvasImageSource): [number, number] {
  const image = source as {
    height?: number;
    naturalHeight?: number;
    naturalWidth?: number;
    videoHeight?: number;
    videoWidth?: number;
    width?: number;
  };
  const width = image.naturalWidth ?? image.videoWidth ?? image.width ?? 1;
  const height = image.naturalHeight ?? image.videoHeight ?? image.height ?? 1;

  return [Math.max(1, width), Math.max(1, height)];
}

function clampFoilIntensity(intensity: number): number {
  if (!Number.isFinite(intensity)) {
    return 0.85;
  }

  return Math.max(0.2, Math.min(1, intensity));
}

function getSideTextureRotation(side: ArtworkSide, sideArtworkRotation: SideArtworkRotation): number {
  if (side !== 'left' && side !== 'right') {
    return 0;
  }

  switch (sideArtworkRotation) {
    case 'rotate90':
      return Math.PI / 2;
    case 'rotateMinus90':
      return -Math.PI / 2;
    case 'rotate180':
      return Math.PI;
    case 'none':
      return 0;
  }
}

function PlaceholderFace({ placement, radius, side }: { placement: FacePlacement; radius: number; side: ArtworkSide }) {
  return (
    <group position={placement.position} rotation={placement.rotation}>
      <mesh receiveShadow>
        <RoundedFaceGeometry planeSize={placement.planeSize} radius={radius} />
        <meshStandardMaterial
          color={SIDE_TINTS[side]}
          metalness={0}
          opacity={0.18}
          roughness={0.7}
          side={DoubleSide}
          transparent
        />
      </mesh>
    </group>
  );
}

function RoundedFaceGeometry({ planeSize, radius }: { planeSize: [number, number]; radius: number }) {
  const geometry = useMemo(() => {
    const [width, height] = planeSize;
    const shape = createRoundedFaceShape(width, height, radius);
    const faceGeometry = new ShapeGeometry(shape, 18);
    const position = faceGeometry.attributes.position;
    const uv = faceGeometry.attributes.uv;

    for (let index = 0; index < position.count; index += 1) {
      uv.setXY(index, (position.getX(index) + width / 2) / width, (position.getY(index) + height / 2) / height);
    }

    uv.needsUpdate = true;
    faceGeometry.computeVertexNormals();
    return faceGeometry;
  }, [planeSize, radius]);

  useEffect(() => {
    return () => geometry.dispose();
  }, [geometry]);

  return <primitive attach="geometry" object={geometry} />;
}
