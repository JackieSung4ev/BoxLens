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
  FinishSettingsMap,
  FoilSettings,
  RenderSettings,
} from './types';

const DEFAULT_DIMENSIONS: BoxDimensions = {
  width: 120,
  height: 180,
  depth: 60,
};

const DEFAULT_SETTINGS: RenderSettings = {
  backgroundColor: '#f7f9fb',
  cornerRadiusMm: 3,
  shadows: false,
  environment: false,
  environmentIntensity: 0.22,
  lightingPreset: 'softbox',
  lightDirection: 'frontRight',
  lightIntensity: 1,
  rgbProof: true,
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

const DEFAULT_FINISH_SETTINGS = ARTWORK_SIDES.reduce((settings, side) => {
  settings[side] = {
    color: '#d4af37',
    intensity: 0.85,
    mode: 'off',
  };
  return settings;
}, {} as FinishSettingsMap);

export default function App() {
  const [dimensions, setDimensions] = useState<BoxDimensions>(DEFAULT_DIMENSIONS);
  const [artwork, setArtwork] = useState<ArtworkMap>({});
  const [faceAppearance, setFaceAppearance] = useState<FaceAppearanceMap>(DEFAULT_FACE_APPEARANCE);
  const [finishSettings, setFinishSettings] = useState<FinishSettingsMap>(DEFAULT_FINISH_SETTINGS);
  const [settings, setSettings] = useState<RenderSettings>(DEFAULT_SETTINGS);
  const [locale, setLocale] = useState<Locale>(() => detectLocale());
  const [canvasElement, setCanvasElement] = useState<HTMLCanvasElement | null>(null);
  const [resetToken, setResetToken] = useState(0);
  const artworkRef = useRef(artwork);
  const finishSettingsRef = useRef(finishSettings);
  const copy = useMemo(() => translations[locale], [locale]);

  useEffect(() => {
    artworkRef.current = artwork;
  }, [artwork]);

  useEffect(() => {
    finishSettingsRef.current = finishSettings;
  }, [finishSettings]);

  useEffect(() => {
    return () => {
      Object.values(artworkRef.current).forEach((asset) => {
        if (asset) {
          URL.revokeObjectURL(asset.url);
        }
      });
      Object.values(finishSettingsRef.current).forEach((finish) => {
        if (finish.mask) {
          URL.revokeObjectURL(finish.mask.url);
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

  const handleFinishSettingsChange = useCallback((side: ArtworkSide, finish: Partial<FoilSettings>) => {
    setFinishSettings((current) => ({
      ...current,
      [side]: {
        ...current[side],
        ...finish,
      },
    }));
  }, []);

  const handleFoilMaskUpload = useCallback((side: ArtworkSide, file: File) => {
    const nextAsset: ArtworkAsset = {
      file,
      url: URL.createObjectURL(file),
    };

    setFinishSettings((current) => {
      const previousMask = current[side].mask;
      if (previousMask) {
        URL.revokeObjectURL(previousMask.url);
      }

      return {
        ...current,
        [side]: {
          ...current[side],
          mask: nextAsset,
          mode: current[side].mode === 'autoMask' ? 'autoMask' : 'mask',
        },
      };
    });
  }, []);

  const handleFoilMaskRemove = useCallback((side: ArtworkSide) => {
    setFinishSettings((current) => {
      const previousMask = current[side].mask;
      if (previousMask) {
        URL.revokeObjectURL(previousMask.url);
      }

      return {
        ...current,
        [side]: {
          ...current[side],
          mask: undefined,
        },
      };
    });
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
          finishSettings={finishSettings}
          locale={locale}
          onFaceAppearanceChange={handleFaceAppearanceChange}
          onArtworkRemove={handleArtworkRemove}
          onArtworkUpload={handleArtworkUpload}
          onDimensionChange={handleDimensionChange}
          onExport={handleExport}
          onFinishSettingsChange={handleFinishSettingsChange}
          onFoilMaskRemove={handleFoilMaskRemove}
          onFoilMaskUpload={handleFoilMaskUpload}
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
            finishSettings={finishSettings}
            onCanvasReady={setCanvasElement}
            resetToken={resetToken}
            settings={settings}
          />
        </section>
      </div>
    </main>
  );
}
