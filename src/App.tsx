import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Scene } from './components/Scene';
import { ARTWORK_SIDES } from './lib/boxGeometry';
import { hexToCmyk } from './lib/colorMode';
import { detectLocale, translations, type Locale } from './lib/i18n';
import type {
  ArtworkAsset,
  ArtworkMap,
  ArtworkSide,
  BoxDimensions,
  FaceAppearance,
  FaceAppearanceMap,
  RenderSettings,
} from './types';

const DEFAULT_DIMENSIONS: BoxDimensions = {
  width: 120,
  height: 180,
  depth: 60,
};

const DEFAULT_SETTINGS: RenderSettings = {
  backgroundColor: '#f7f9fb',
  shadows: false,
  environment: false,
  environmentIntensity: 0.22,
  lightingPreset: 'softbox',
  lightDirection: 'frontRight',
  lightIntensity: 1,
  sideArtworkRotation: 'none',
  surface: 'none',
};

const DEFAULT_FACE_COLOR = '#f4f1ea';

const DEFAULT_FACE_APPEARANCE = ARTWORK_SIDES.reduce((appearance, side) => {
  appearance[side] = {
    color: DEFAULT_FACE_COLOR,
    colorMode: 'rgb',
    cmyk: hexToCmyk(DEFAULT_FACE_COLOR),
    mode: 'artwork',
  };
  return appearance;
}, {} as FaceAppearanceMap);

export default function App() {
  const [dimensions, setDimensions] = useState<BoxDimensions>(DEFAULT_DIMENSIONS);
  const [artwork, setArtwork] = useState<ArtworkMap>({});
  const [faceAppearance, setFaceAppearance] = useState<FaceAppearanceMap>(DEFAULT_FACE_APPEARANCE);
  const [settings, setSettings] = useState<RenderSettings>(DEFAULT_SETTINGS);
  const [locale, setLocale] = useState<Locale>(() => detectLocale());
  const [canvasElement, setCanvasElement] = useState<HTMLCanvasElement | null>(null);
  const [resetToken, setResetToken] = useState(0);
  const artworkRef = useRef(artwork);
  const copy = useMemo(() => translations[locale], [locale]);

  useEffect(() => {
    artworkRef.current = artwork;
  }, [artwork]);

  useEffect(() => {
    return () => {
      Object.values(artworkRef.current).forEach((asset) => {
        if (asset) {
          URL.revokeObjectURL(asset.url);
        }
      });
    };
  }, []);

  const handleDimensionChange = useCallback((key: keyof BoxDimensions, value: number) => {
    setDimensions((current) => ({
      ...current,
      [key]: Number.isFinite(value) ? value : 1,
    }));
  }, []);

  const handleArtworkUpload = useCallback((side: ArtworkSide, file: File) => {
    const nextAsset: ArtworkAsset = {
      file,
      url: URL.createObjectURL(file),
    };

    setArtwork((current) => {
      const previousAsset = current[side];
      if (previousAsset) {
        URL.revokeObjectURL(previousAsset.url);
      }

      return {
        ...current,
        [side]: nextAsset,
      };
    });

    setFaceAppearance((current) => ({
      ...current,
      [side]: {
        ...current[side],
        mode: 'artwork',
      },
    }));
  }, []);

  const handleArtworkRemove = useCallback((side: ArtworkSide) => {
    setArtwork((current) => {
      const previousAsset = current[side];
      if (previousAsset) {
        URL.revokeObjectURL(previousAsset.url);
      }

      const nextArtwork = { ...current };
      delete nextArtwork[side];
      return nextArtwork;
    });
  }, []);

  const handleFaceAppearanceChange = useCallback((side: ArtworkSide, appearance: Partial<FaceAppearance>) => {
    setFaceAppearance((current) => ({
      ...current,
      [side]: {
        ...current[side],
        ...appearance,
      },
    }));
  }, []);

  const handleExport = useCallback(() => {
    if (!canvasElement) {
      return;
    }

    const imageUrl = canvasElement.toDataURL('image/png');
    const link = document.createElement('a');
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    link.href = imageUrl;
    link.download = `boxlens-mockup-${stamp}.png`;
    link.click();
  }, [canvasElement]);

  return (
    <main className="min-h-dvh bg-ink-100 text-ink-900 lg:h-dvh lg:overflow-hidden">
      <div className="grid min-h-dvh grid-cols-1 lg:h-full lg:min-h-0 lg:grid-cols-[380px_minmax(0,1fr)]">
        <Sidebar
          artwork={artwork}
          copy={copy}
          dimensions={dimensions}
          exportDisabled={!canvasElement}
          faceAppearance={faceAppearance}
          locale={locale}
          onFaceAppearanceChange={handleFaceAppearanceChange}
          onArtworkRemove={handleArtworkRemove}
          onArtworkUpload={handleArtworkUpload}
          onDimensionChange={handleDimensionChange}
          onExport={handleExport}
          onLocaleChange={setLocale}
          onResetCamera={() => setResetToken((value) => value + 1)}
          onSettingsChange={setSettings}
          settings={settings}
        />
        <section className="min-h-[560px] p-3 sm:p-4 lg:h-full lg:min-h-0 lg:p-5" aria-label={copy.previewLabel}>
          <Scene
            artwork={artwork}
            dimensions={dimensions}
            faceAppearance={faceAppearance}
            onCanvasReady={setCanvasElement}
            resetToken={resetToken}
            settings={settings}
          />
        </section>
      </div>
    </main>
  );
}
