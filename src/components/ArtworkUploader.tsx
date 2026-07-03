import type { DragEvent } from 'react';
import { Droplet, Image as ImageIcon, ImagePlus, Sparkles, Trash2, Upload } from 'lucide-react';
import { isArtworkImageFile, matchArtworkFilesBySide, matchArtworkSideByFilename } from '../lib/artworkAutoMatch';
import { ARTWORK_SIDES } from '../lib/boxGeometry';
import {
  clampColorChannel,
  clampPercentChannel,
  cmykToHex,
  hexToCmyk,
  hexToRgb,
  rgbToCmyk,
  rgbToHex,
} from '../lib/colorMode';
import { formatMessage, type Translation } from '../lib/i18n';
import type {
  ArtworkAsset,
  ArtworkMap,
  ArtworkSide,
  CmykColor,
  FaceAppearance,
  FaceAppearanceMap,
  FaceColorMode,
  FinishSettingsMap,
  FoilMode,
  FoilSettings,
  RgbColor,
} from '../types';

interface ArtworkUploaderProps {
  artwork: ArtworkMap;
  copy: Translation;
  faceAppearance: FaceAppearanceMap;
  finishSettings: FinishSettingsMap;
  onAppearanceChange: (side: ArtworkSide, appearance: Partial<FaceAppearance>) => void;
  onFinishChange: (side: ArtworkSide, finish: Partial<FoilSettings>) => void;
  onFoilMaskRemove: (side: ArtworkSide) => void;
  onFoilMaskUpload: (side: ArtworkSide, file: File) => void;
  onRemove: (side: ArtworkSide) => void;
  onUpload: (side: ArtworkSide, file: File) => void;
}

const FOIL_MODE_OPTIONS: FoilMode[] = ['off', 'auto', 'mask', 'autoMask'];

type DataTransferItemWithEntry = DataTransferItem & {
  webkitGetAsEntry?: () => FileSystemEntry | null;
};

async function collectDroppedFiles(dataTransfer: DataTransfer): Promise<File[]> {
  const items = dataTransfer.items ? Array.from(dataTransfer.items) : [];
  const entries = items
    .map((item) => (item as DataTransferItemWithEntry).webkitGetAsEntry?.())
    .filter((entry): entry is FileSystemEntry => Boolean(entry));

  if (entries.length > 0) {
    const filesByEntry = await Promise.all(entries.map((entry) => collectEntryFiles(entry)));
    return filesByEntry.flat();
  }

  return dataTransfer.files ? Array.from(dataTransfer.files) : [];
}

async function collectEntryFiles(entry: FileSystemEntry): Promise<File[]> {
  if (entry.isFile) {
    const fileEntry = entry as FileSystemFileEntry;

    return new Promise((resolve) => {
      fileEntry.file((file) => resolve([attachEntryPath(file, fileEntry.fullPath)]), () => resolve([]));
    });
  }

  if (entry.isDirectory) {
    const directoryEntry = entry as FileSystemDirectoryEntry;
    const entries = await readAllDirectoryEntries(directoryEntry.createReader());
    const filesByEntry = await Promise.all(entries.map((nestedEntry) => collectEntryFiles(nestedEntry)));
    return filesByEntry.flat();
  }

  return [];
}

async function readAllDirectoryEntries(reader: FileSystemDirectoryReader): Promise<FileSystemEntry[]> {
  const allEntries: FileSystemEntry[] = [];

  while (true) {
    const entries = await new Promise<FileSystemEntry[]>((resolve) => {
      reader.readEntries(resolve, () => resolve([]));
    });

    if (entries.length === 0) {
      return allEntries;
    }

    allEntries.push(...entries);
  }
}

function attachEntryPath(file: File, fullPath: string): File {
  const relativePath = fullPath.replace(/^\/+/, '');

  if (!relativePath || file.webkitRelativePath) {
    return file;
  }

  try {
    Object.defineProperty(file, 'webkitRelativePath', {
      configurable: true,
      value: relativePath,
    });
  } catch {
    return file;
  }

  return file;
}

export function ArtworkUploader({
  artwork,
  copy,
  faceAppearance,
  finishSettings,
  onAppearanceChange,
  onFinishChange,
  onFoilMaskRemove,
  onFoilMaskUpload,
  onRemove,
  onUpload,
}: ArtworkUploaderProps) {
  const handleArtworkDrop = async (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    const files = await collectDroppedFiles(event.dataTransfer);
    const matches = matchArtworkFilesBySide(files);

    (Object.entries(matches) as Array<[ArtworkSide, File]>).forEach(([side, file]) => {
      onUpload(side, file);
    });
  };

  return (
    <section
      className="space-y-4 border-t border-ink-100 pt-5"
      aria-labelledby="artwork-heading"
      onDragOver={(event) => event.preventDefault()}
      onDrop={handleArtworkDrop}
    >
      <div className="flex items-center gap-2">
        <ImagePlus aria-hidden="true" className="text-ink-700" size={18} />
        <h2 id="artwork-heading" className="text-sm font-semibold uppercase tracking-normal text-ink-700">
          {copy.artworkHeading}
        </h2>
      </div>
      <div className="space-y-3">
        {ARTWORK_SIDES.map((side) => (
          <ArtworkSlot
            asset={artwork[side]}
            appearance={faceAppearance[side]}
            copy={copy}
            finish={finishSettings[side]}
            key={side}
            onAppearanceChange={(appearance) => onAppearanceChange(side, appearance)}
            onFinishChange={(finish) => onFinishChange(side, finish)}
            onFoilMaskRemove={() => onFoilMaskRemove(side)}
            onFoilMaskUpload={(file) => onFoilMaskUpload(side, file)}
            onRemove={() => onRemove(side)}
            onUpload={(file) => onUpload(side, file)}
            side={side}
          />
        ))}
      </div>
    </section>
  );
}

interface ArtworkSlotProps {
  asset?: ArtworkAsset;
  appearance: FaceAppearance;
  copy: Translation;
  finish: FoilSettings;
  onAppearanceChange: (appearance: Partial<FaceAppearance>) => void;
  onFinishChange: (finish: Partial<FoilSettings>) => void;
  onFoilMaskRemove: () => void;
  onFoilMaskUpload: (file: File) => void;
  onRemove: () => void;
  onUpload: (file: File) => void;
  side: ArtworkSide;
}

function ArtworkSlot({
  asset,
  appearance,
  copy,
  finish,
  onAppearanceChange,
  onFinishChange,
  onFoilMaskRemove,
  onFoilMaskUpload,
  onRemove,
  onUpload,
  side,
}: ArtworkSlotProps) {
  const sideLabel = copy.sides[side];
  const appearanceName = `${side}-face-appearance`;
  const isArtworkMode = appearance.mode === 'artwork';
  const usesFoilMask = finish.mode === 'mask' || finish.mode === 'autoMask';

  const handleDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const files = await collectDroppedFiles(event.dataTransfer);
    const imageFiles = files.filter(isArtworkImageFile);
    const file = imageFiles[0];

    if (imageFiles.length === 1 && !matchArtworkSideByFilename(file.webkitRelativePath || file.name)) {
      onUpload(file);
    }
  };

  return (
    <div
      className={`rounded-xl border p-4 transition ${
        isArtworkMode
          ? 'border-lens-200 bg-white hover:border-lens-500/45'
          : 'border-ink-200 bg-white hover:border-ink-300'
      }`}
      onDragOver={(event) => event.preventDefault()}
      onDrop={handleDrop}
    >
      <div className="grid grid-cols-[88px_minmax(0,1fr)] items-start gap-4">
        <div
          className={`flex h-[88px] w-[88px] shrink-0 flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border bg-white text-center ${
            asset || appearance.mode === 'solid' ? 'border-ink-200' : 'border-dashed border-lens-100'
          }`}
        >
          {appearance.mode === 'solid' ? (
            <div
              aria-hidden="true"
              className="h-full w-full"
              style={{ backgroundColor: appearance.color }}
            />
          ) : asset ? (
            <img
              alt={formatMessage(copy.artworkPreview, { side: sideLabel })}
              className="h-full w-full object-cover"
              src={asset.url}
            />
          ) : (
            <>
              <Upload aria-hidden="true" className="text-ink-300" size={23} />
              <span className="text-[11px] font-semibold leading-none text-ink-300">{copy.dropArtwork}</span>
            </>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex min-h-7 items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <p className="truncate text-base font-semibold leading-6 text-ink-950">{sideLabel}</p>
              {side === 'front' ? (
                <span className="shrink-0 rounded-md bg-lens-100 px-2 py-0.5 text-[10px] font-semibold leading-4 text-lens-600">
                  {copy.primaryPanelBadge}
                </span>
              ) : null}
            </div>
            {asset && appearance.mode === 'artwork' ? (
              <button
                aria-label={formatMessage(copy.removeArtwork, { side: sideLabel })}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink-500 transition hover:bg-white hover:text-ink-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lens-500"
                onClick={onRemove}
                type="button"
              >
                <Trash2 aria-hidden="true" size={17} />
              </button>
            ) : null}
          </div>
          <p className="mt-1 text-xs leading-5 text-ink-500">{copy.sideHelpers[side]}</p>
          <fieldset className="mt-3 space-y-2">
            <legend className="sr-only">{formatMessage(copy.faceAppearanceLabel, { side: sideLabel })}</legend>
            <div className="grid h-10 grid-cols-2 gap-1 rounded-lg border border-ink-200 bg-white p-1">
              {(['artwork', 'solid'] as const).map((mode) => {
                const ModeIcon = mode === 'artwork' ? ImageIcon : Droplet;

                return (
                  <label
                    className={`relative inline-flex min-w-0 cursor-pointer items-center justify-center gap-1.5 rounded-md px-2 text-xs font-semibold transition ${
                      appearance.mode === mode
                        ? 'bg-lens-600 text-white'
                        : 'text-ink-600 hover:bg-ink-50'
                    }`}
                    key={mode}
                  >
                    <input
                      aria-label={mode === 'artwork' ? copy.artworkMode : copy.solidColorMode}
                      checked={appearance.mode === mode}
                      className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                      name={appearanceName}
                      onChange={() => onAppearanceChange({ mode })}
                      type="radio"
                      value={mode}
                    />
                    <ModeIcon aria-hidden="true" className="pointer-events-none shrink-0" size={14} />
                    <span className="pointer-events-none truncate">
                      {mode === 'artwork' ? copy.artworkModeShort : copy.solidColorModeShort}
                    </span>
                  </label>
                );
              })}
            </div>
            {appearance.mode === 'solid' ? (
              <SolidColorControls
                appearance={appearance}
                copy={copy}
                onAppearanceChange={onAppearanceChange}
                sideLabel={sideLabel}
              />
            ) : null}
            <div className="space-y-2 rounded-lg border border-proof-200 bg-proof-100/55 p-2">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-normal text-ink-600">
                <Sparkles aria-hidden="true" className="text-proof-500" size={13} />
                {copy.foilFinish}
              </div>
              <label className="grid gap-1">
                <span className="text-[10px] font-semibold uppercase tracking-normal text-ink-500">{copy.foilMode}</span>
                <select
                  aria-label={formatMessage(copy.foilModeInputLabel, { side: sideLabel })}
                  className="h-9 w-full rounded-lg border border-ink-300 bg-white px-2 text-xs font-semibold text-ink-950 shadow-control outline-none transition focus:border-lens-500 focus:ring-2 focus:ring-lens-100"
                  onChange={(event) => onFinishChange({ mode: event.target.value as FoilMode })}
                  value={finish.mode}
                >
                  {FOIL_MODE_OPTIONS.map((mode) => (
                    <option key={mode} value={mode}>
                      {copy.foilModeOptions[mode]}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-2">
                <label className="grid gap-1">
                  <span className="text-[10px] font-semibold uppercase tracking-normal text-ink-500">{copy.foilColor}</span>
                  <span className="flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="h-8 w-8 rounded-md border border-ink-300"
                      style={{ backgroundColor: finish.color }}
                    />
                    <input
                      aria-label={formatMessage(copy.foilColorInputLabel, { side: sideLabel })}
                      className="h-8 w-12 cursor-pointer rounded-lg border border-ink-300 bg-white p-1"
                      onChange={(event) => onFinishChange({ color: event.target.value })}
                      type="color"
                      value={finish.color}
                    />
                  </span>
                </label>

                <label className="grid min-w-0 gap-1">
                  <span className="flex items-center justify-between gap-2 text-[10px] font-semibold uppercase tracking-normal text-ink-500">
                    {copy.foilIntensity}
                    <span className="tabular-nums">{Math.round(finish.intensity * 100)}%</span>
                  </span>
                  <input
                    aria-label={formatMessage(copy.foilIntensityInputLabel, { side: sideLabel })}
                    className="h-8 w-full accent-proof-500"
                    max={1}
                    min={0.2}
                    onChange={(event) => onFinishChange({ intensity: event.target.valueAsNumber })}
                    step={0.05}
                    type="range"
                    value={finish.intensity}
                  />
                </label>
              </div>

              {usesFoilMask ? (
                <div className="flex items-center gap-2">
                  <label className="inline-flex min-h-9 flex-1 cursor-pointer items-center justify-center rounded-lg border border-dashed border-proof-300 bg-white px-3 text-xs font-semibold text-ink-700 transition hover:border-proof-500 hover:text-ink-950">
                    <input
                      accept="image/*"
                      aria-label={formatMessage(copy.foilMaskInputLabel, { side: sideLabel })}
                      className="sr-only"
                      onChange={(event) => {
                        const file = event.currentTarget.files?.[0];
                        if (file) {
                          onFoilMaskUpload(file);
                          event.currentTarget.value = '';
                        }
                      }}
                      type="file"
                    />
                    {finish.mask?.file.name ?? copy.foilMask}
                  </label>
                  {finish.mask ? (
                    <button
                      aria-label={formatMessage(copy.removeFoilMask, { side: sideLabel })}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink-500 transition hover:bg-white hover:text-ink-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lens-500"
                      onClick={onFoilMaskRemove}
                      type="button"
                    >
                      <Trash2 aria-hidden="true" size={16} />
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          </fieldset>
        </div>
      </div>
    </div>
  );
}

function SolidColorControls({
  appearance,
  copy,
  onAppearanceChange,
  sideLabel,
}: {
  appearance: FaceAppearance;
  copy: Translation;
  onAppearanceChange: (appearance: Partial<FaceAppearance>) => void;
  sideLabel: string;
}) {
  const rgb = hexToRgb(appearance.color);
  const cmyk = appearance.cmyk ?? hexToCmyk(appearance.color);

  const handleHexChange = (color: string) => {
    onAppearanceChange({
      color,
      cmyk: hexToCmyk(color),
    });
  };

  const handleColorModeChange = (colorMode: FaceColorMode) => {
    onAppearanceChange({
      colorMode,
      cmyk,
    });
  };

  const handleRgbChannelChange = (channel: keyof RgbColor, value: number) => {
    const nextRgb = {
      ...rgb,
      [channel]: clampColorChannel(value),
    };
    const color = rgbToHex(nextRgb);

    onAppearanceChange({
      color,
      colorMode: 'rgb',
      cmyk: rgbToCmyk(nextRgb),
    });
  };

  const handleCmykChannelChange = (channel: keyof CmykColor, value: number) => {
    const nextCmyk = {
      ...cmyk,
      [channel]: clampPercentChannel(value),
    };

    onAppearanceChange({
      color: cmykToHex(nextCmyk),
      colorMode: 'cmyk',
      cmyk: nextCmyk,
    });
  };

  return (
    <div className="space-y-2 rounded-lg border border-ink-100 bg-ink-50/60 p-2" key="solid-color">
      <div className="flex items-end gap-2">
        <label className="grid gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-normal text-ink-500">{copy.faceColor}</span>
          <span className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="h-8 w-8 rounded-md border border-ink-300"
              style={{ backgroundColor: appearance.color }}
            />
            <input
              aria-label={formatMessage(copy.solidColorInputLabel, { side: sideLabel })}
              className="h-8 w-12 cursor-pointer rounded-lg border border-ink-300 bg-white p-1"
              onChange={(event) => handleHexChange(event.target.value)}
              type="color"
              value={appearance.color}
            />
          </span>
        </label>

        <label className="grid min-w-[96px] flex-1 gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-normal text-ink-500">{copy.colorMode}</span>
          <select
            aria-label={copy.colorMode}
            className="h-8 w-full rounded-lg border border-ink-300 bg-white px-2 text-xs font-semibold text-ink-950 shadow-control outline-none transition focus:border-lens-500 focus:ring-2 focus:ring-lens-100"
            onChange={(event) => handleColorModeChange(event.target.value as FaceColorMode)}
            value={appearance.colorMode}
          >
            {(['rgb', 'cmyk'] as const).map((mode) => (
              <option key={mode} value={mode}>
                {copy.colorModeOptions[mode]}
              </option>
            ))}
          </select>
        </label>
      </div>

      {appearance.colorMode === 'rgb' ? (
        <div className="grid grid-cols-3 gap-2">
          <ChannelInput
            label={copy.colorChannels.red}
            max={255}
            onChange={(value) => handleRgbChannelChange('r', value)}
            shortLabel="R"
            value={rgb.r}
          />
          <ChannelInput
            label={copy.colorChannels.green}
            max={255}
            onChange={(value) => handleRgbChannelChange('g', value)}
            shortLabel="G"
            value={rgb.g}
          />
          <ChannelInput
            label={copy.colorChannels.blue}
            max={255}
            onChange={(value) => handleRgbChannelChange('b', value)}
            shortLabel="B"
            value={rgb.b}
          />
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-2">
          <ChannelInput
            label={copy.colorChannels.cyan}
            max={100}
            onChange={(value) => handleCmykChannelChange('c', value)}
            shortLabel="C"
            value={cmyk.c}
          />
          <ChannelInput
            label={copy.colorChannels.magenta}
            max={100}
            onChange={(value) => handleCmykChannelChange('m', value)}
            shortLabel="M"
            value={cmyk.m}
          />
          <ChannelInput
            label={copy.colorChannels.yellow}
            max={100}
            onChange={(value) => handleCmykChannelChange('y', value)}
            shortLabel="Y"
            value={cmyk.y}
          />
          <ChannelInput
            label={copy.colorChannels.black}
            max={100}
            onChange={(value) => handleCmykChannelChange('k', value)}
            shortLabel="K"
            value={cmyk.k}
          />
        </div>
      )}
    </div>
  );
}

function ChannelInput({
  label,
  max,
  onChange,
  shortLabel,
  value,
}: {
  label: string;
  max: number;
  onChange: (value: number) => void;
  shortLabel: string;
  value: number;
}) {
  return (
    <label className="block min-w-0">
      <span className="text-[10px] font-semibold uppercase tracking-normal text-ink-500">{shortLabel}</span>
      <input
        aria-label={label}
        className="mt-1 h-9 w-full rounded-lg border border-ink-300 bg-white px-2 text-xs font-semibold tabular-nums text-ink-950 shadow-control outline-none transition focus:border-lens-500 focus:ring-2 focus:ring-lens-100"
        max={max}
        min={0}
        onChange={(event) => onChange(event.currentTarget.valueAsNumber)}
        step={1}
        type="number"
        value={value}
      />
    </label>
  );
}
