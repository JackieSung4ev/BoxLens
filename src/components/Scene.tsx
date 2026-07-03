import { Suspense, useEffect, useMemo, useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { Environment, OrbitControls } from '@react-three/drei';
import {
  ACESFilmicToneMapping,
  CanvasTexture,
  DoubleSide,
  PCFSoftShadowMap,
  RepeatWrapping,
  SRGBColorSpace,
  Vector3,
} from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { BoxMockup } from './BoxMockup';
import { normalizeDimensions } from '../lib/boxGeometry';
import type {
  ArtworkMap,
  BoxDimensions,
  FaceAppearanceMap,
  LightDirection,
  LightingPreset,
  RenderSettings,
  SurfacePreset,
} from '../types';

interface SceneProps {
  artwork: ArtworkMap;
  dimensions: BoxDimensions;
  faceAppearance: FaceAppearanceMap;
  onCanvasReady: (canvas: HTMLCanvasElement | null) => void;
  resetToken: number;
  settings: RenderSettings;
}

const CAMERA_POSITION = new Vector3(3.35, 2.35, 4.25);

const LIGHTING_PRESETS: Record<
  LightingPreset,
  {
    ambient: number;
    hemisphere: number;
    key: number;
    fill: number;
    spot: number;
  }
> = {
  softbox: {
    ambient: 0.76,
    hemisphere: 1.2,
    key: 1.2,
    fill: 0.5,
    spot: 6.6,
  },
  studio: {
    ambient: 0.64,
    hemisphere: 1.05,
    key: 1.45,
    fill: 0.44,
    spot: 8.2,
  },
  crisp: {
    ambient: 0.48,
    hemisphere: 0.92,
    key: 1.85,
    fill: 0.28,
    spot: 10.4,
  },
  dramatic: {
    ambient: 0.34,
    hemisphere: 0.72,
    key: 2.05,
    fill: 0.16,
    spot: 12.2,
  },
};

const LIGHT_DIRECTIONS: Record<
  LightDirection,
  {
    key: [number, number, number];
    fill: [number, number, number];
    spot: [number, number, number];
  }
> = {
  frontRight: {
    key: [3.5, 4.5, 4.2],
    fill: [-4, 2.2, -2.8],
    spot: [-3.5, 5.2, 4.8],
  },
  frontLeft: {
    key: [-3.5, 4.5, 4.2],
    fill: [4, 2.2, -2.8],
    spot: [3.5, 5.2, 4.8],
  },
  top: {
    key: [0.9, 6.2, 2.1],
    fill: [-2.8, 2.5, -2.6],
    spot: [0, 6.4, 4.2],
  },
  sideRight: {
    key: [5.3, 3.2, 1.6],
    fill: [-3.8, 2, -2.4],
    spot: [4.8, 4.6, 4.2],
  },
};

export function Scene({ artwork, dimensions, faceAppearance, onCanvasReady, resetToken, settings }: SceneProps) {
  const normalizedSize = normalizeDimensions(dimensions);
  const floorY = -normalizedSize.height / 2 - 0.018;
  const lighting = LIGHTING_PRESETS[settings.lightingPreset];
  const direction = LIGHT_DIRECTIONS[settings.lightDirection];
  const lightScale = settings.lightIntensity;

  return (
    <div className="relative h-[68vh] min-h-[520px] overflow-hidden rounded-lg border border-white/80 bg-white shadow-panel lg:h-full lg:min-h-0">
      <Canvas
        camera={{ fov: 34, position: CAMERA_POSITION.toArray(), near: 0.1, far: 100 }}
        dpr={[1, 2]}
        gl={{ alpha: false, antialias: true, preserveDrawingBuffer: true }}
        shadows={settings.shadows}
      >
        <RendererSetup onCanvasReady={onCanvasReady} shadows={settings.shadows} />
        <color args={[settings.backgroundColor]} attach="background" />
        <fog attach="fog" args={[settings.backgroundColor, 8, 13]} />
        <ambientLight intensity={lighting.ambient * lightScale} />
        <hemisphereLight args={['#ffffff', '#c2cad6', lighting.hemisphere * lightScale]} />
        <directionalLight
          castShadow={settings.shadows}
          intensity={lighting.key * lightScale}
          position={direction.key}
          shadow-bias={-0.0003}
          shadow-mapSize-height={2048}
          shadow-mapSize-width={2048}
        />
        <spotLight
          angle={0.42}
          castShadow={settings.shadows}
          intensity={lighting.spot * lightScale}
          penumbra={0.72}
          position={direction.spot}
        />
        <directionalLight intensity={lighting.fill * lightScale} position={direction.fill} />
        <Suspense fallback={null}>
          {settings.environment ? (
            <Environment background={false} environmentIntensity={settings.environmentIntensity} preset="studio" />
          ) : null}
        </Suspense>
        <BoxMockup artwork={artwork} dimensions={dimensions} faceAppearance={faceAppearance} settings={settings} />
        <WoodSurface floorY={floorY} preset={settings.surface} size={normalizedSize} />
        {settings.shadows ? <SoftGroundShadow floorY={floorY} size={normalizedSize} /> : null}
        <StudioCameraControls resetToken={resetToken} />
      </Canvas>
      <div className="pointer-events-none absolute left-4 top-4 rounded-lg border border-white/70 bg-white/85 px-3 py-2 text-xs font-medium text-ink-700 shadow-control backdrop-blur">
        {Math.max(1, dimensions.width)} x {Math.max(1, dimensions.height)} x {Math.max(1, dimensions.depth)} mm
      </div>
    </div>
  );
}

function WoodSurface({
  floorY,
  preset,
  size,
}: {
  floorY: number;
  preset: SurfacePreset;
  size: { width: number; height: number; depth: number };
}) {
  const texture = useMemo(() => (preset === 'none' ? null : createWoodTexture(preset)), [preset]);

  useEffect(() => {
    return () => texture?.dispose();
  }, [texture]);

  if (!texture || preset === 'none') {
    return null;
  }

  if (preset === 'woodTable') {
    const tableWidth = Math.max(size.width * 2.35, 2.6);
    const tableDepth = Math.max(size.depth * 3.2, 2.35);
    const thickness = 0.09;

    return (
      <mesh position={[0, floorY - thickness / 2, 0]} receiveShadow>
        <boxGeometry args={[tableWidth, thickness, tableDepth]} />
        <meshStandardMaterial map={texture} metalness={0.02} roughness={0.66} />
      </mesh>
    );
  }

  return (
    <mesh position={[0, floorY, 0]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[8, 8]} />
      <meshStandardMaterial map={texture} metalness={0.01} roughness={0.72} />
    </mesh>
  );
}

function createWoodTexture(preset: Exclude<SurfacePreset, 'none'>): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const context = canvas.getContext('2d');

  if (context) {
    const palette =
      preset === 'woodFloor'
        ? { base: '#b87946', grain: '#754523', highlight: '#d7a36e', seam: '#68401f' }
        : { base: '#966035', grain: '#5f351d', highlight: '#bd8555', seam: '#4e2c18' };

    context.fillStyle = palette.base;
    context.fillRect(0, 0, canvas.width, canvas.height);

    const plankWidth = preset === 'woodFloor' ? 168 : 256;
    for (let x = 0; x < canvas.width; x += plankWidth) {
      context.fillStyle = x % (plankWidth * 2) === 0 ? 'rgba(255, 255, 255, 0.045)' : 'rgba(0, 0, 0, 0.04)';
      context.fillRect(x, 0, plankWidth, canvas.height);
      context.strokeStyle = palette.seam;
      context.lineWidth = 5;
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, canvas.height);
      context.stroke();
    }

    for (let y = 18; y < canvas.height; y += 13) {
      context.beginPath();
      context.moveTo(0, y);

      for (let x = 0; x <= canvas.width; x += 24) {
        const wobble = Math.sin((x + y * 2.2) * 0.016) * 6 + Math.sin((x - y) * 0.041) * 2.5;
        context.lineTo(x, y + wobble);
      }

      context.strokeStyle = y % 39 === 0 ? palette.highlight : palette.grain;
      context.globalAlpha = y % 39 === 0 ? 0.24 : 0.34;
      context.lineWidth = y % 26 === 0 ? 2.2 : 1.1;
      context.stroke();
    }

    context.globalAlpha = 0.18;
    for (let i = 0; i < 18; i += 1) {
      const x = (i * 137) % canvas.width;
      const y = (i * 71) % canvas.height;
      context.beginPath();
      context.ellipse(x, y, 42, 10, (i % 6) * 0.35, 0, Math.PI * 2);
      context.strokeStyle = palette.grain;
      context.lineWidth = 2;
      context.stroke();
    }
    context.globalAlpha = 1;
  }

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(preset === 'woodFloor' ? 3.5 : 1.7, preset === 'woodFloor' ? 3.5 : 1.4);
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

function SoftGroundShadow({
  floorY,
  size,
}: {
  floorY: number;
  size: { width: number; height: number; depth: number };
}) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const context = canvas.getContext('2d');

    if (context) {
      const gradient = context.createRadialGradient(256, 256, 20, 256, 256, 238);
      gradient.addColorStop(0, 'rgba(20, 24, 31, 0.23)');
      gradient.addColorStop(0.45, 'rgba(20, 24, 31, 0.12)');
      gradient.addColorStop(1, 'rgba(20, 24, 31, 0)');
      context.fillStyle = gradient;
      context.fillRect(0, 0, 512, 512);
    }

    const shadowTexture = new CanvasTexture(canvas);
    shadowTexture.needsUpdate = true;
    return shadowTexture;
  }, []);

  useEffect(() => {
    return () => texture.dispose();
  }, [texture]);

  return (
    <mesh position={[0, floorY + 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[size.width * 1.65, size.depth * 2.8, 1]}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        depthWrite={false}
        map={texture}
        opacity={0.72}
        side={DoubleSide}
        transparent
      />
    </mesh>
  );
}

function RendererSetup({
  onCanvasReady,
  shadows,
}: {
  onCanvasReady: (canvas: HTMLCanvasElement | null) => void;
  shadows: boolean;
}) {
  const { camera, gl, invalidate } = useThree();

  useEffect(() => {
    camera.position.copy(CAMERA_POSITION);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();
    gl.toneMapping = ACESFilmicToneMapping;
    gl.outputColorSpace = SRGBColorSpace;
    gl.shadowMap.enabled = shadows;
    gl.shadowMap.type = PCFSoftShadowMap;
    invalidate();
    onCanvasReady(gl.domElement);

    return () => onCanvasReady(null);
  }, [camera, gl, invalidate, onCanvasReady, shadows]);

  return null;
}

function StudioCameraControls({ resetToken }: { resetToken: number }) {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const { camera, invalidate } = useThree();

  useEffect(() => {
    camera.position.copy(CAMERA_POSITION);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();
    controlsRef.current?.target.set(0, 0, 0);
    controlsRef.current?.update();
    invalidate();
  }, [camera, invalidate, resetToken]);

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      enablePan
      enableRotate
      enableZoom
      makeDefault
      maxDistance={9}
      minDistance={2.2}
      panSpeed={0.7}
      target={[0, 0, 0]}
      zoomSpeed={0.75}
    />
  );
}
