import { Suspense, useEffect, useMemo } from 'react';
import { Edges, RoundedBox, useTexture } from '@react-three/drei';
import { DoubleSide, type Texture } from 'three';
import { ARTWORK_SIDES, getFacePlacement, normalizeDimensions } from '../lib/boxGeometry';
import { applyArtworkTextureSettings } from '../lib/textureUtils';
import type {
  ArtworkAsset,
  ArtworkMap,
  ArtworkSide,
  BoxDimensions,
  FacePlacement,
  FaceAppearanceMap,
  RenderSettings,
  SideArtworkRotation,
} from '../types';

interface BoxMockupProps {
  artwork: ArtworkMap;
  dimensions: BoxDimensions;
  faceAppearance: FaceAppearanceMap;
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

export function BoxMockup({ artwork, dimensions, faceAppearance, settings }: BoxMockupProps) {
  const size = useMemo(() => normalizeDimensions(dimensions), [dimensions]);

  return (
    <group rotation={[0, -0.08, 0]}>
      <RoundedBox args={[size.width, size.height, size.depth]} castShadow receiveShadow radius={0.035} smoothness={8}>
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

        return appearance.mode === 'solid' ? (
          <SolidColorFace color={appearance.color} key={side} placement={placement} />
        ) : asset ? (
          <Suspense fallback={<PlaceholderFace placement={placement} side={side} />} key={side}>
            <ArtworkFace
              asset={asset}
              placement={placement}
              rotation={getSideTextureRotation(side, settings.sideArtworkRotation)}
              side={side}
            />
          </Suspense>
        ) : (
          <PlaceholderFace key={side} placement={placement} side={side} />
        );
      })}
    </group>
  );
}

function SolidColorFace({ color, placement }: { color: string; placement: FacePlacement }) {
  return (
    <group position={placement.position} rotation={placement.rotation}>
      <mesh castShadow receiveShadow>
        <planeGeometry args={placement.planeSize} />
        <meshStandardMaterial color={color} metalness={0} roughness={0.58} side={DoubleSide} toneMapped={false} />
      </mesh>
    </group>
  );
}

function ArtworkFace({
  asset,
  placement,
  rotation,
  side,
}: {
  asset: ArtworkAsset;
  placement: FacePlacement;
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
        <planeGeometry args={placement.planeSize} />
        <meshStandardMaterial
          map={texture}
          metalness={0}
          roughness={0.48}
          side={DoubleSide}
          toneMapped={false}
          transparent={false}
        />
      </mesh>
      <mesh position={[0, 0, -0.002]}>
        <planeGeometry args={placement.planeSize} />
        <meshBasicMaterial color={SIDE_TINTS[side]} opacity={0.03} side={DoubleSide} transparent />
      </mesh>
    </group>
  );
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

function PlaceholderFace({ placement, side }: { placement: FacePlacement; side: ArtworkSide }) {
  return (
    <group position={placement.position} rotation={placement.rotation}>
      <mesh receiveShadow>
        <planeGeometry args={placement.planeSize} />
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
