import { Ruler } from 'lucide-react';
import type { Translation } from '../lib/i18n';
import type { BoxDimensions } from '../types';

interface DimensionControlsProps {
  copy: Translation;
  dimensions: BoxDimensions;
  onChange: (key: keyof BoxDimensions, value: number) => void;
}

const FIELDS: Array<keyof BoxDimensions> = [
  'width',
  'height',
  'depth',
];

export function DimensionControls({ copy, dimensions, onChange }: DimensionControlsProps) {
  return (
    <section className="space-y-4 border-t border-ink-100 pt-5" aria-labelledby="dimensions-heading">
      <div className="flex items-center gap-2">
        <Ruler aria-hidden="true" className="text-ink-700" size={18} />
        <h2 id="dimensions-heading" className="text-sm font-semibold uppercase tracking-normal text-ink-700">
          {copy.dimensionsHeading}
        </h2>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-1">
        {FIELDS.map((field) => (
          <label className="block" htmlFor={field} key={field}>
            <span className="text-sm font-medium text-ink-900">{copy.dimensions[field]}</span>
            <input
              className="mt-1 h-11 w-full rounded-lg border border-ink-300 bg-white px-3 text-base text-ink-950 shadow-control outline-none transition focus:border-lens-500 focus:ring-2 focus:ring-lens-100"
              id={field}
              min={1}
              onChange={(event) => onChange(field, event.target.valueAsNumber)}
              step={1}
              type="number"
              value={dimensions[field]}
            />
          </label>
        ))}
      </div>
    </section>
  );
}
