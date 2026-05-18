import { ChevronDown, X } from 'lucide-react';
import {
  EXPORT_FRAME_OPTIONS,
  type ExportFormat,
  type ExportFrameSize,
} from '../lib/exportCapture';

const INNER_H = 'h-7';

export function ExportModeToolbar({
  theme,
  frame,
  onFrameChange,
  format,
  onFormatChange,
  onExport,
  onClose,
  exporting = false,
}: {
  theme: 'light' | 'dark';
  frame: ExportFrameSize;
  onFrameChange: (frame: ExportFrameSize) => void;
  format: ExportFormat;
  onFormatChange: (format: ExportFormat) => void;
  onExport: () => void;
  onClose: () => void;
  exporting?: boolean;
}) {
  const dark = theme === 'dark';

  const outerShell = dark
    ? 'border-gray-600 bg-gray-800'
    : 'border-gray-200 bg-white shadow-hard-sm';

  const innerTrack = dark
    ? 'rounded-full bg-gray-700 p-0.5'
    : 'rounded-full bg-gray-100 p-0.5';

  const segBase =
    'rounded-full px-2 py-1 text-[9px] font-bold uppercase tracking-wide transition-[color,background-color,box-shadow,transform] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-1 dark:focus-visible:ring-gray-500 dark:focus-visible:ring-offset-gray-800 sm:px-2.5 sm:text-[10px]';

  const segSelected = dark
    ? 'bg-gray-600 text-white shadow-sm'
    : 'bg-white text-gray-900 shadow-sm';

  const segUnselected = dark
    ? 'text-gray-400 hover:text-gray-200'
    : 'text-gray-500 hover:text-gray-700';

  const aspectHint = dark ? 'text-gray-400' : 'text-gray-500';
  const aspectValue = dark ? 'text-gray-100' : 'text-gray-800';

  const currentFrame =
    EXPORT_FRAME_OPTIONS.find(o => o.value === frame)?.shortLabel ?? 'Screen';

  return (
    <div
      role="group"
      aria-label="Export"
      className={`flex shrink-0 items-center gap-1 rounded-full border p-1 ${outerShell}`}
    >
      <div
        className={`inline-flex ${INNER_H} min-w-0 max-w-[10.5rem] items-stretch sm:max-w-[12.5rem] ${innerTrack}`}
        title="Choose export aspect ratio"
      >
        <label
          className={`relative flex min-w-0 flex-1 cursor-pointer items-center gap-0.5 rounded-full pl-1.5 pr-1 sm:gap-1 sm:pl-2 sm:pr-1.5 ${
            exporting ? 'cursor-wait opacity-60' : ''
          }`}
        >
          <span
            className={`shrink-0 text-[9px] font-semibold leading-none sm:text-[10px] ${aspectHint}`}
          >
            Aspect
          </span>
          <span
            className={`min-w-0 flex-1 truncate text-left text-[9px] font-bold leading-none sm:text-[10px] ${aspectValue}`}
          >
            {currentFrame}
          </span>
          <ChevronDown
            className={`h-3 w-3 shrink-0 opacity-70 ${aspectHint}`}
            strokeWidth={2.25}
            aria-hidden
          />
          <select
            value={frame}
            disabled={exporting}
            onChange={e => onFrameChange(e.target.value as ExportFrameSize)}
            aria-label="Export aspect ratio"
            className="absolute inset-0 z-[1] cursor-pointer appearance-none rounded-full bg-transparent opacity-0 disabled:cursor-wait"
          >
            {EXPORT_FRAME_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div
        role="group"
        aria-label="Export file type"
        className={`inline-flex ${INNER_H} shrink-0 items-stretch ${innerTrack}`}
      >
        {(['pdf', 'jpeg'] as const).map(fmt => (
          <button
            key={fmt}
            type="button"
            aria-pressed={format === fmt}
            disabled={exporting}
            onClick={() => onFormatChange(fmt)}
            className={`${segBase} ${format === fmt ? segSelected : segUnselected} disabled:cursor-wait disabled:opacity-60`}
          >
            {fmt}
          </button>
        ))}
      </div>

      <button
        type="button"
        disabled={exporting}
        onClick={onExport}
        className={`inline-flex ${INNER_H} shrink-0 items-center justify-center rounded-full px-3 text-[10px] font-bold uppercase tracking-wider shadow-hard-sm transition-[color,background-color,box-shadow,transform] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-1 active:scale-[0.97] disabled:cursor-wait disabled:opacity-60 dark:focus-visible:ring-gray-500 dark:focus-visible:ring-offset-gray-800 sm:px-3.5 ${
          dark
            ? 'bg-gray-500 text-white hover:bg-gray-400'
            : 'bg-gray-700 text-white hover:bg-gray-600'
        }`}
        title={`Download ${format.toUpperCase()}`}
      >
        {exporting ? '…' : 'Export'}
      </button>

      <button
        type="button"
        onClick={onClose}
        disabled={exporting}
        className={`inline-flex ${INNER_H} w-7 shrink-0 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-1 disabled:opacity-60 dark:focus-visible:ring-gray-500 dark:focus-visible:ring-offset-gray-800 ${
          dark
            ? 'text-gray-400 hover:bg-gray-700 hover:text-gray-100'
            : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'
        }`}
        title="Exit export mode"
      >
        <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden />
      </button>
    </div>
  );
}
