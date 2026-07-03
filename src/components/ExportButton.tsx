import { Download } from 'lucide-react';

interface ExportButtonProps {
  disabled: boolean;
  label: string;
  onClick: () => void;
}

export function ExportButton({ disabled, label, onClick }: ExportButtonProps) {
  return (
    <button
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-lens-600 px-4 py-2 text-sm font-semibold text-white shadow-control transition hover:bg-lens-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lens-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-ink-300 disabled:text-ink-700"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      <Download aria-hidden="true" size={17} />
      {label}
    </button>
  );
}
