import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { Environment, OrbitControls, useTexture } from '@react-three/drei';
import { Maximize2, Minimize2 } from 'lucide-react';
import {
  ACESFilmicToneMapping,
  CanvasTexture,
  DoubleSide,
  PCFSoftShadowMap,
  PerspectiveCamera,
  RepeatWrapping,
  SRGBColorSpace,
  type Texture,
  Vector3,
} from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { BoxMockup } from './BoxMockup';
import { normalizeDimensions } from '../lib/boxGeometry';
import {
  CAMERA_BASE_POSITION,
  getCameraDistanceForFocalLength,
  getCameraFogRange,
  getCameraMaxDistance,
  getCameraPositionForFocalLength,
} from '../lib/cameraFraming';
import type {
  ArtworkMap,
  BoxDimensions,
  FaceAppearanceMap,
  FinishSettingsMap,
  LightDirection,
  LightingPreset,
  RenderSettings,
  SurfacePreset,
} from '../types';

interface SceneProps {
  artwork: ArtworkMap;
  dimensions: BoxDimensions;
  faceAppearance: FaceAppearanceMap;
  finishSettings: FinishSettingsMap;
  onCanvasReady: (canvas: HTMLCanvasElement | null) => void;
  resetToken: number;
  settings: RenderSettings;
}

const CAMERA_TARGET = new Vector3(0, 0, 0);
const CAMERA_BASE_DIRECTION = new Vector3(...CAMERA_BASE_POSITION).normalize();

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

export function Scene({
  artwork,
  dimensions,
  faceAppearance,
  finishSettings,
  onCanvasReady,
  resetToken,
  settings,
}: SceneProps) {
  const previewRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const normalizedSize = normalizeDimensions(dimensions);
  const floorY = -normalizedSize.height / 2 - 0.018;
  const lighting = LIGHTING_PRESETS[settings.lightingPreset];
  const direction = LIGHT_DIRECTIONS[settings.lightDirection];
  const lightScale = settings.lightIntensity;
  const cameraPosition = useMemo(
    () => getCameraPositionForFocalLength(settings.cameraLengthMm),
    [settings.cameraLengthMm],
  );
  const fogRange = useMemo(() => getCameraFogRange(settings.cameraLengthMm), [settings.cameraLengthMm]);
  const toggleFullscreen = useCallback(() => {
    const element = previewRef.current;
    if (!element) {
      return;
    }

    if (document.fullscreenElement === element) {
      void document.exitFullscreen();
      return;
    }

    void element.requestFullscreen();
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === previewRef.current);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  return (
    <div
      className={`relative overflow-hidden border border-white/80 bg-white shadow-panel ${
        isFullscreen ? 'h-dvh min-h-dvh rounded-none' : 'h-[68vh] min-h-[520px] rounded-lg lg:h-full lg:min-h-0'
      }`}
      ref={previewRef}
    >
      <Canvas
        camera={{ fov: 34, position: cameraPosition, near: 0.1, far: 100 }}
        dpr={[1, 2]}
        gl={{ alpha: false, antialias: true, preserveDrawingBuffer: true }}
        shadows={settings.shadows}
      >
        <RendererSetup
          cameraLengthMm={settings.cameraLengthMm}
          onCanvasReady={onCanvasReady}
          shadows={settings.shadows}
        />
        <color args={[settings.backgroundColor]} attach="background" />
        <fog attach="fog" args={[settings.backgroundColor, fogRange.near, fogRange.far]} />
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
        <BoxMockup
          artwork={artwork}
          dimensions={dimensions}
          faceAppearance={faceAppearance}
          finishSettings={finishSettings}
          settings={settings}
        />
        <Suspense fallback={null}>
          <SurfaceStage floorY={floorY} preset={settings.surface} size={normalizedSize} />
        </Suspense>
        {settings.shadows ? <SoftGroundShadow floorY={floorY} size={normalizedSize} /> : null}
        <StudioCameraControls cameraLengthMm={settings.cameraLengthMm} resetToken={resetToken} />
      </Canvas>
      <div className="pointer-events-none absolute left-4 top-4 rounded-lg border border-white/70 bg-white/85 px-3 py-2 text-xs font-medium text-ink-700 shadow-control backdrop-blur">
        {Math.max(1, dimensions.width)} x {Math.max(1, dimensions.height)} x {Math.max(1, dimensions.depth)} mm
      </div>
      <button
        aria-label={isFullscreen ? 'Exit fullscreen preview' : 'Enter fullscreen preview'}
        className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/70 bg-white/85 text-ink-700 shadow-control backdrop-blur transition hover:bg-white hover:text-ink-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lens-500"
        onClick={toggleFullscreen}
        title={isFullscreen ? 'Exit fullscreen preview' : 'Enter fullscreen preview'}
        type="button"
      >
        {isFullscreen ? <Minimize2 aria-hidden="true" size={18} /> : <Maximize2 aria-hidden="true" size={18} />}
      </button>
    </div>
  );
}

function SurfaceStage({
  floorY,
  preset,
  size,
}: {
  floorY: number;
  preset: SurfacePreset;
  size: { width: number; height: number; depth: number };
}) {
  if (preset === 'none') {
    return null;
  }

  if (preset === 'marble') {
    return <MarbleSurface floorY={floorY} size={size} />;
  }

  return <WoodFloorSurface floorY={floorY} />;
}

function WoodFloorSurface({ floorY }: { floorY: number }) {
  const textures = useTexture({
    bumpMap: '/textures/hardwood2_bump.jpg',
    map: '/textures/hardwood2_diffuse.jpg',
    roughnessMap: '/textures/hardwood2_roughness.jpg',
  }) as Record<'bumpMap' | 'map' | 'roughnessMap', Texture>;

  useEffect(() => {
    Object.entries(textures).forEach(([key, texture]) => {
      texture.wrapS = RepeatWrapping;
      texture.wrapT = RepeatWrapping;
      texture.repeat.set(4.2, 4.2);
      texture.anisotropy = Math.max(texture.anisotropy, 8);
      texture.needsUpdate = true;

      if (key === 'map') {
        texture.colorSpace = SRGBColorSpace;
      }
    });
  }, [textures]);

  return (
    <mesh position={[0, floorY, 0]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[8, 8]} />
      <meshStandardMaterial
        bumpMap={textures.bumpMap}
        bumpScale={0.018}
        map={textures.map}
        metalness={0.01}
        roughness={0.72}
        roughnessMap={textures.roughnessMap}
      />
    </mesh>
  );
}

function MarbleSurface({
  floorY,
  size,
}: {
  floorY: number;
  size: { width: number; height: number; depth: number };
}) {
  const textures = useMemo(() => createMarbleTextures(), []);

  useEffect(() => {
    return () => {
      textures.map.dispose();
      textures.bumpMap.dispose();
    };
  }, [textures]);

  return (
    <mesh position={[0, floorY, 0]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[Math.max(size.width * 3, 7.2), Math.max(size.depth * 4, 7.2)]} />
      <meshStandardMaterial
        bumpMap={textures.bumpMap}
        bumpScale={0.026}
        map={textures.map}
        metalness={0}
        roughness={0.42}
      />
    </mesh>
  );
}

function createMarbleTextures(): { bumpMap: CanvasTexture; map: CanvasTexture } {
  const colorCanvas = document.createElement('canvas');
  const bumpCanvas = document.createElement('canvas');
  colorCanvas.width = 1024;
  colorCanvas.height = 1024;
  bumpCanvas.width = 1024;
  bumpCanvas.height = 1024;
  const colorContext = colorCanvas.getContext('2d', { willReadFrequently: true });
  const bumpContext = bumpCanvas.getContext('2d', { willReadFrequently: true });

  if (colorContext && bumpContext) {
    const colorData = colorContext.createImageData(colorCanvas.width, colorCanvas.height);
    const bumpData = bumpContext.createImageData(bumpCanvas.width, bumpCanvas.height);
    const width = colorCanvas.width;
    const height = colorCanvas.height;

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const index = (y * width + x) * 4;
        const nx = x / width;
        const ny = y / height;
        const sweep = Math.sin((nx * 8.5 + ny * 5.7) * Math.PI + Math.sin((nx - ny) * 18) * 0.75);
        const hairline = Math.pow(Math.max(0, 1 - Math.abs(sweep) * 2.4), 3.2);
        const wideVein = Math.pow(Math.max(0, 1 - Math.abs(Math.sin((nx * 2.4 - ny * 3.8 + 0.18) * Math.PI)) * 2.1), 2.1);
        const cloud = Math.sin((nx * 21.3 + ny * 13.1) * Math.PI) * 0.5 + Math.sin((nx * 41.1 - ny * 33.7) * Math.PI) * 0.25;
        const shade = Math.max(0, Math.min(1, 0.86 - hairline * 0.32 - wideVein * 0.18 + cloud * 0.025));
        const red = Math.round(248 * shade + 20 * (1 - shade));
        const green = Math.round(247 * shade + 23 * (1 - shade));
        const blue = Math.round(244 * shade + 28 * (1 - shade));
        const bump = Math.round(178 + hairline * 62 + wideVein * 36 + cloud * 8);

        colorData.data[index] = red;
        colorData.data[index + 1] = green;
        colorData.data[index + 2] = blue;
        colorData.data[index + 3] = 255;
        bumpData.data[index] = bump;
        bumpData.data[index + 1] = bump;
        bumpData.data[index + 2] = bump;
        bumpData.data[index + 3] = 255;
      }
    }

    colorContext.putImageData(colorData, 0, 0);
    bumpContext.putImageData(bumpData, 0, 0);
  }

  const map = new CanvasTexture(colorCanvas);
  map.colorSpace = SRGBColorSpace;
  const bumpMap = new CanvasTexture(bumpCanvas);

  [map, bumpMap].forEach((texture) => {
    texture.wrapS = RepeatWrapping;
    texture.wrapT = RepeatWrapping;
    texture.repeat.set(1.8, 1.8);
    texture.anisotropy = 8;
    texture.needsUpdate = true;
  });

  return { bumpMap, map };
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
  cameraLengthMm,
  onCanvasReady,
  shadows,
}: {
  cameraLengthMm: number;
  onCanvasReady: (canvas: HTMLCanvasElement | null) => void;
  shadows: boolean;
}) {
  const { camera, gl, invalidate } = useThree();

  useEffect(() => {
    camera.lookAt(CAMERA_TARGET);
    camera.updateMatrixWorld();
    onCanvasReady(gl.domElement);

    return () => onCanvasReady(null);
  }, [camera, gl, onCanvasReady]);

  useEffect(() => {
    if (camera instanceof PerspectiveCamera) {
      camera.setFocalLength(cameraLengthMm);
      camera.updateProjectionMatrix();
      invalidate();
    }
  }, [camera, cameraLengthMm, invalidate]);

  useEffect(() => {
    gl.toneMapping = ACESFilmicToneMapping;
    gl.outputColorSpace = SRGBColorSpace;
    gl.shadowMap.enabled = shadows;
    gl.shadowMap.type = PCFSoftShadowMap;
    invalidate();
  }, [gl, invalidate, shadows]);

  return null;
}

function StudioCameraControls({ cameraLengthMm, resetToken }: { cameraLengthMm: number; resetToken: number }) {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const previousResetTokenRef = useRef(resetToken);
  const { camera, invalidate } = useThree();

  useEffect(() => {
    const controls = controlsRef.current;
    const target = controls?.target ?? CAMERA_TARGET;
    const shouldResetAngle = previousResetTokenRef.current !== resetToken;
    previousResetTokenRef.current = resetToken;
    const currentDirection = camera.position.clone().sub(target);
    const direction =
      shouldResetAngle || currentDirection.lengthSq() === 0
        ? CAMERA_BASE_DIRECTION.clone()
        : currentDirection.normalize();

    camera.position.copy(target).add(direction.multiplyScalar(getCameraDistanceForFocalLength(cameraLengthMm)));
    camera.lookAt(target);
    camera.updateMatrixWorld();
    controls?.target.copy(target);
    controls?.update();
    invalidate();
  }, [camera, cameraLengthMm, invalidate, resetToken]);

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      enablePan
      enableRotate
      enableZoom
      makeDefault
      maxDistance={getCameraMaxDistance(cameraLengthMm)}
      minDistance={2.2}
      panSpeed={0.7}
      target={[0, 0, 0]}
      zoomSpeed={0.75}
    />
  );
}
