import { Box, Palette, RotateCcw, Sparkles } from 'lucide-react';
import { ArtworkUploader } from './ArtworkUploader';
import { DimensionControls } from './DimensionControls';
import { ExportButton } from './ExportButton';
import { formatMessage, LOCALE_OPTIONS, type Locale, type Translation } from '../lib/i18n';
import type {
  ArtworkMap,
  ArtworkSide,
  BoxDimensions,
  FaceAppearance,
  FaceAppearanceMap,
  LightDirection,
  LightingPreset,
  RenderSettings,
  SideArtworkRotation,
  SurfacePreset,
} from '../types';

const BACKGROUND_PRESETS = ['#f7f9fb', '#f3efe8', '#e8eef7', '#18202a'];

const SIDE_ROTATION_OPTIONS: SideArtworkRotation[] = ['none', 'rotate90', 'rotateMinus90', 'rotate180'];
const LIGHTING_PRESET_OPTIONS: LightingPreset[] = ['softbox', 'studio', 'crisp', 'dramatic'];
const LIGHT_DIRECTION_OPTIONS: LightDirection[] = ['frontRight', 'frontLeft', 'top', 'sideRight'];
const SURFACE_OPTIONS: SurfacePreset[] = ['none', 'woodFloor', 'woodTable'];

interface SidebarProps {
  artwork: ArtworkMap;
  copy: Translation;
  dimensions: BoxDimensions;
  exportDisabled: boolean;
  faceAppearance: FaceAppearanceMap;
  locale: Locale;
  onFaceAppearanceChange: (side: ArtworkSide, appearance: Partial<FaceAppearance>) => void;
  onArtworkRemove: (side: ArtworkSide) => void;
  onArtworkUpload: (side: ArtworkSide, file: File) => void;
  onDimensionChange: (key: keyof BoxDimensions, value: number) => void;
  onExport: () => void;
  onLocaleChange: (locale: Locale) => void;
  onResetCamera: () => void;
  onSettingsChange: (settings: RenderSettings) => void;
  settings: RenderSettings;
}

export function Sidebar({
  artwork,
  copy,
  dimensions,
  exportDisabled,
  faceAppearance,
  locale,
  onFaceAppearanceChange,
  onArtworkRemove,
  onArtworkUpload,
  onDimensionChange,
  onExport,
  onLocaleChange,
  onResetCamera,
  onSettingsChange,
  settings,
}: SidebarProps) {
  return (
    <aside className="border-b border-ink-300/60 bg-white/95 px-5 py-5 shadow-panel lg:h-dvh lg:overflow-y-auto lg:border-b-0 lg:border-r">
      <div className="space-y-6">
        <header className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-ink-950 text-white shadow-control">
              <Box aria-hidden="true" size={23} strokeWidth={1.8} />
            </div>
            <div>
              <h1 className="text-2xl font-semibold leading-tight text-ink-950">BoxLens</h1>
              <p className="text-sm leading-6 text-ink-500">{copy.subtitle}</p>
            </div>
          </div>
        </header>

        <DimensionControls copy={copy} dimensions={dimensions} onChange={onDimensionChange} />

        <ArtworkUploader
          artwork={artwork}
          copy={copy}
          faceAppearance={faceAppearance}
          onAppearanceChange={onFaceAppearanceChange}
          onRemove={onArtworkRemove}
          onUpload={onArtworkUpload}
        />

        <section className="space-y-4 border-t border-ink-100 pt-5" aria-labelledby="render-controls-heading">
          <div className="flex items-center gap-2">
            <Palette aria-hidden="true" className="text-ink-700" size={18} />
            <h2 id="render-controls-heading" className="text-sm font-semibold uppercase tracking-normal text-ink-700">
              {copy.renderingHeading}
            </h2>
          </div>

          <div className="space-y-3">
            <div>
              <label htmlFor="background-color" className="text-sm font-medium text-ink-900">
                {copy.backgroundColor}
              </label>
              <div className="mt-2 flex items-center gap-2">
                {BACKGROUND_PRESETS.map((color) => (
                  <button
                    aria-label={formatMessage(copy.useBackground, { color })}
                    className="h-10 w-10 rounded-lg border border-ink-300 shadow-control outline-none ring-offset-2 transition hover:scale-[1.03] focus-visible:ring-2 focus-visible:ring-lens-500"
                    key={color}
                    onClick={() => onSettingsChange({ ...settings, backgroundColor: color })}
                    style={{ backgroundColor: color }}
                    type="button"
                  />
                ))}
                <input
                  aria-label={copy.customBackground}
                  className="h-10 w-12 cursor-pointer rounded-lg border border-ink-300 bg-white p-1"
                  id="background-color"
                  onChange={(event) => onSettingsChange({ ...settings, backgroundColor: event.target.value })}
                  type="color"
                  value={settings.backgroundColor}
                />
              </div>
            </div>

            <label className="block rounded-lg border border-ink-100 px-3 py-2">
              <span className="text-sm font-medium text-ink-900">{copy.surface}</span>
              <select
                aria-label={copy.surface}
                className="mt-2 h-10 w-full rounded-lg border border-ink-300 bg-white px-3 text-sm text-ink-950 shadow-control outline-none transition focus:border-lens-500 focus:ring-2 focus:ring-lens-100"
                onChange={(event) => onSettingsChange({ ...settings, surface: event.target.value as SurfacePreset })}
                value={settings.surface}
              >
                {SURFACE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {copy.surfaceOptions[option]}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex min-h-11 items-center justify-between gap-4 rounded-lg border border-ink-100 px-3 py-2 text-sm font-medium text-ink-900">
              {copy.shadows}
              <input
                checked={settings.shadows}
                className="h-5 w-5 accent-lens-600"
                onChange={(event) => onSettingsChange({ ...settings, shadows: event.target.checked })}
                type="checkbox"
              />
            </label>

            <label className="flex min-h-11 items-center justify-between gap-4 rounded-lg border border-ink-100 px-3 py-2 text-sm font-medium text-ink-900">
              {copy.environmentLighting}
              <input
                checked={settings.environment}
                className="h-5 w-5 accent-lens-600"
                onChange={(event) => onSettingsChange({ ...settings, environment: event.target.checked })}
                type="checkbox"
              />
            </label>

            <label className="block rounded-lg border border-ink-100 px-3 py-2">
              <span className="text-sm font-medium text-ink-900">{copy.sideArtworkRotation}</span>
              <select
                aria-label={copy.sideArtworkRotation}
                className="mt-2 h-10 w-full rounded-lg border border-ink-300 bg-white px-3 text-sm text-ink-950 shadow-control outline-none transition focus:border-lens-500 focus:ring-2 focus:ring-lens-100"
                onChange={(event) =>
                  onSettingsChange({ ...settings, sideArtworkRotation: event.target.value as SideArtworkRotation })
                }
                value={settings.sideArtworkRotation}
              >
                {SIDE_ROTATION_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {copy.sideRotationOptions[option]}
                  </option>
                ))}
              </select>
            </label>

            <label className="block rounded-lg border border-ink-100 px-3 py-2">
              <span className="text-sm font-medium text-ink-900">{copy.lightingPreset}</span>
              <select
                aria-label={copy.lightingPreset}
                className="mt-2 h-10 w-full rounded-lg border border-ink-300 bg-white px-3 text-sm text-ink-950 shadow-control outline-none transition focus:border-lens-500 focus:ring-2 focus:ring-lens-100"
                onChange={(event) => onSettingsChange({ ...settings, lightingPreset: event.target.value as LightingPreset })}
                value={settings.lightingPreset}
              >
                {LIGHTING_PRESET_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {copy.lightingPresetOptions[option]}
                  </option>
                ))}
              </select>
            </label>

            <label className="block rounded-lg border border-ink-100 px-3 py-2">
              <span className="flex items-center justify-between gap-3 text-sm font-medium text-ink-900">
                {copy.lightIntensity}
                <span className="tabular-nums text-xs text-ink-500">{settings.lightIntensity.toFixed(2)}</span>
              </span>
              <input
                aria-label={copy.lightIntensity}
                className="mt-2 w-full accent-lens-600"
                max={1.8}
                min={0.35}
                onChange={(event) => onSettingsChange({ ...settings, lightIntensity: event.target.valueAsNumber })}
                step={0.05}
                type="range"
                value={settings.lightIntensity}
              />
            </label>

            <label className="block rounded-lg border border-ink-100 px-3 py-2">
              <span className="text-sm font-medium text-ink-900">{copy.lightDirection}</span>
              <select
                aria-label={copy.lightDirection}
                className="mt-2 h-10 w-full rounded-lg border border-ink-300 bg-white px-3 text-sm text-ink-950 shadow-control outline-none transition focus:border-lens-500 focus:ring-2 focus:ring-lens-100"
                onChange={(event) => onSettingsChange({ ...settings, lightDirection: event.target.value as LightDirection })}
                value={settings.lightDirection}
              >
                {LIGHT_DIRECTION_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {copy.lightDirectionOptions[option]}
                  </option>
                ))}
              </select>
            </label>

            <label className="block rounded-lg border border-ink-100 px-3 py-2">
              <span className="flex items-center justify-between gap-3 text-sm font-medium text-ink-900">
                {copy.environmentIntensity}
                <span className="tabular-nums text-xs text-ink-500">{settings.environmentIntensity.toFixed(2)}</span>
              </span>
              <input
                aria-label={copy.environmentIntensity}
                className="mt-2 w-full accent-lens-600 disabled:opacity-50"
                disabled={!settings.environment}
                max={0.8}
                min={0.05}
                onChange={(event) => onSettingsChange({ ...settings, environmentIntensity: event.target.valueAsNumber })}
                step={0.05}
                type="range"
                value={settings.environmentIntensity}
              />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <button
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-ink-300 bg-white px-4 py-2 text-sm font-semibold text-ink-800 shadow-control transition hover:bg-ink-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lens-500"
              onClick={onResetCamera}
              type="button"
            >
              <RotateCcw aria-hidden="true" size={17} />
              {copy.resetCamera}
            </button>
            <ExportButton disabled={exportDisabled} label={copy.exportPng} onClick={onExport} />
          </div>

          <div className="flex items-start gap-2 rounded-lg bg-proof-100 px-3 py-3 text-sm leading-5 text-ink-800">
            <Sparkles aria-hidden="true" className="mt-0.5 shrink-0 text-proof-500" size={17} />
            <span>{copy.renderHint}</span>
          </div>
        </section>

        <section className="border-t border-ink-100 pt-5">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-normal text-ink-500">{copy.language}</span>
            <select
              aria-label={copy.language}
              className="mt-1 h-10 w-full rounded-lg border border-ink-300 bg-white px-3 text-sm text-ink-950 shadow-control outline-none transition focus:border-lens-500 focus:ring-2 focus:ring-lens-100"
              onChange={(event) => onLocaleChange(event.target.value as Locale)}
              value={locale}
            >
              {LOCALE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </section>
      </div>
    </aside>
  );
}
