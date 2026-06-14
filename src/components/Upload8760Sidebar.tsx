import { useCallback, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { ClipboardPaste, FileUp, Plus, X } from 'lucide-react';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';
import type { GradientDef } from './InteractiveLegend';
import {
  cellFormatPreview,
  type CellFormatOptions,
  type CellFormatSuffix,
} from '../lib/cellFormatPresets';
import {
  Parse8760Error,
  parse8760Upload,
  parse8760UploadFile,
  type Parsed8760Upload,
} from '../lib/parse8760Upload';

const UPLOAD_GRADIENT_PRESETS = [
  { id: 'temperature-comfort', label: 'Temperature' },
  { id: 'humidity-spectrum', label: 'Humidity' },
  { id: 'wind-speed-warm', label: 'Wind' },
  { id: 'solar-yellow-orange', label: 'Solar' },
  { id: 'cloud-cover-gray', label: 'Cloud' },
  { id: 'coolwarm', label: 'Cool / warm' },
  { id: 'viridis', label: 'Viridis' },
  { id: 'turbo', label: 'Turbo' },
] as const;

interface Upload8760SidebarProps {
  theme: 'light' | 'dark';
  parsed: Parsed8760Upload | null;
  onParsed: (data: Parsed8760Upload) => void;
  onClear: () => void;
  gradients: GradientDef[];
  gradientId: string;
  onGradientIdChange: (id: string) => void;
  onAddCustomGradient: (gradient: GradientDef) => void;
  cellFormat: CellFormatOptions;
  onCellFormatChange: (format: CellFormatOptions) => void;
}

function pillTrackClass(dark: boolean) {
  return dark
    ? 'rounded-full border border-gray-600 bg-gray-900/40 p-0.5'
    : 'rounded-full border border-gray-200 bg-gray-50 p-0.5';
}

function pillSegClass(dark: boolean, active: boolean) {
  if (active) {
    return dark
      ? 'rounded-full bg-gray-600 text-white shadow-sm'
      : 'rounded-full bg-white text-gray-900 shadow-sm';
  }
  return dark
    ? 'rounded-full text-gray-400 hover:text-gray-200'
    : 'rounded-full text-gray-500 hover:text-gray-800';
}

function Section({
  title,
  hint,
  action,
  children,
  dark,
  className = '',
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
  children: ReactNode;
  dark: boolean;
  className?: string;
}) {
  return (
    <section
      className={`flex min-h-0 flex-col gap-1.5 overflow-hidden px-3 py-2 sm:px-3.5 sm:py-2.5 ${className}`}
    >
      <div className="flex shrink-0 items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className={`text-[10px] font-bold uppercase tracking-wide ${dark ? 'text-gray-200' : 'text-gray-800'}`}>
            {title}
          </h2>
          {hint && (
            <p className={`mt-0.5 truncate text-[9px] leading-snug ${dark ? 'text-gray-500' : 'text-gray-500'}`}>
              {hint}
            </p>
          )}
        </div>
        {action}
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-hidden">{children}</div>
    </section>
  );
}

export function Upload8760Sidebar({
  theme,
  parsed,
  onParsed,
  onClear,
  gradients,
  gradientId,
  onGradientIdChange,
  onAddCustomGradient,
  cellFormat,
  onCellFormatChange,
}: Upload8760SidebarProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [pasteText, setPasteText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showCustomGradient, setShowCustomGradient] = useState(false);
  const [newGradientName, setNewGradientName] = useState('Custom gradient');
  const [newGradientColors, setNewGradientColors] = useState(['#30123B', '#4686FB', '#FDE725']);

  const dark = theme === 'dark';
  const labelClass = dark ? 'text-gray-400' : 'text-gray-500';
  const inputClass = dark
    ? 'border-gray-600 bg-gray-900/50 text-gray-100 placeholder:text-gray-500'
    : 'border-gray-300 bg-white text-gray-900 placeholder:text-gray-400';
  const pillTrack = pillTrackClass(dark);

  const applyParsed = useCallback(
    (result: Parsed8760Upload) => {
      setError(null);
      onParsed(result);
    },
    [onParsed]
  );

  const handleParseError = (err: unknown) => {
    if (err instanceof Parse8760Error) {
      setError(err.message);
    } else if (err instanceof Error) {
      setError(err.message);
    } else {
      setError('Could not parse the uploaded data.');
    }
  };

  const handlePasteSubmit = () => {
    try {
      applyParsed(parse8760Upload(pasteText));
    } catch (err) {
      handleParseError(err);
    }
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      applyParsed(await parse8760UploadFile(file));
    } catch (err) {
      handleParseError(err);
    } finally {
      setBusy(false);
    }
  };

  const handlePasteFromClipboard = async () => {
    setError(null);
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) {
        setError('Clipboard empty — copy 8760 values first.');
        return;
      }
      setPasteText(text);
      applyParsed(parse8760Upload(text));
    } catch {
      setError('Paste into the box below (Ctrl+V).');
    }
  };

  const visiblePresets = UPLOAD_GRADIENT_PRESETS.filter(p => gradients.some(g => g.id === p.id));

  const createCustomGradient = () => {
    const id = `custom-${Date.now()}`;
    onAddCustomGradient({
      id,
      name: newGradientName.trim() || 'Custom gradient',
      colors: newGradientColors.filter(Boolean),
    });
    onGradientIdChange(id);
    setShowCustomGradient(false);
  };

  const suffixOptions: { id: CellFormatSuffix; label: string }[] = [
    { id: 'none', label: 'None' },
    { id: 'percent', label: '%' },
    { id: 'degree', label: '°' },
  ];

  return (
    <aside
      className={`grid h-full min-h-0 w-full grid-rows-[minmax(0,1.2fr)_auto_minmax(0,0.75fr)] overflow-hidden rounded-xl border shadow-hard-lg ${
        dark ? 'border-gray-700 bg-gray-800' : 'border-gray-100 bg-white'
      }`}
    >
      <Section
        title="Data input"
        hint="8760 hourly values — CSV, Excel, EPW, or paste."
        dark={dark}
        className={dark ? 'border-b border-gray-700' : 'border-b border-gray-100'}
        action={
          parsed ? (
            <button
              type="button"
              onClick={onClear}
              className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-semibold ${
                dark
                  ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              Clear
            </button>
          ) : undefined
        }
      >
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.txt,.tsv,.xlsx,.xls,.epw"
          className="hidden"
          onChange={handleFileChange}
        />
        <div className={`grid shrink-0 grid-cols-2 gap-1 ${pillTrack}`}>
          <button
            type="button"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
            className={`flex items-center justify-center gap-1 py-1.5 text-[10px] font-semibold ${pillSegClass(dark, false)}`}
          >
            <FileUp className="h-3 w-3 shrink-0" />
            {busy ? '…' : 'Choose file'}
          </button>
          <button
            type="button"
            onClick={handlePasteFromClipboard}
            className={`flex items-center justify-center gap-1 py-1.5 text-[10px] font-semibold ${pillSegClass(dark, false)}`}
          >
            <ClipboardPaste className="h-3 w-3 shrink-0" />
            Paste
          </button>
        </div>
        <textarea
          value={pasteText}
          onChange={e => setPasteText(e.target.value)}
          placeholder="Or paste values here…"
          className={`min-h-[2.75rem] flex-1 resize-none rounded-xl border px-2.5 py-1.5 font-mono text-[10px] outline-none focus:ring-2 focus:ring-gray-400/60 ${inputClass}`}
        />
        <button
          type="button"
          onClick={handlePasteSubmit}
          disabled={!pasteText.trim()}
          className={`shrink-0 rounded-full py-1.5 text-[10px] font-bold text-white disabled:opacity-40 ${
            dark ? 'bg-sky-600 hover:bg-sky-500' : 'bg-gray-800 hover:bg-gray-900'
          }`}
        >
          Parse data
        </button>
        {error && (
          <p className="shrink-0 rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-[9px] leading-snug text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </p>
        )}
        {parsed && !error && (
          <p className={`shrink-0 truncate text-[9px] ${dark ? 'text-emerald-300' : 'text-emerald-700'}`}>
            {parsed.data.length} hours · {parsed.valueColumnLabel ?? 'values'}
            {parsed.parseMode === 'epw' ? ' · EPW' : ''}
          </p>
        )}
      </Section>

      <Section
        title="Color gradient"
        hint={gradients.find(g => g.id === gradientId)?.name ?? gradientId}
        dark={dark}
        className={dark ? 'border-b border-gray-700' : 'border-b border-gray-100'}
        action={
          <button
            type="button"
            onClick={() => setShowCustomGradient(v => !v)}
            className={`flex shrink-0 items-center gap-0.5 rounded-full border px-2 py-0.5 text-[9px] font-semibold ${
              dark
                ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Plus className="h-3 w-3" />
            Custom
          </button>
        }
      >
        <div className="grid shrink-0 grid-cols-4 gap-x-1.5 gap-y-1.5">
          {visiblePresets.map(p => {
            const g = gradients.find(x => x.id === p.id);
            if (!g) return null;
            const active = gradientId === g.id;
            return (
              <button
                key={g.id}
                type="button"
                title={g.name}
                onClick={() => onGradientIdChange(g.id)}
                className="group flex flex-col gap-0.5 text-left"
              >
                <span
                  className={`block h-7 w-full rounded-md border-2 transition-all ${
                    active
                      ? 'border-gray-800 ring-1 ring-gray-800/20 dark:border-gray-200 dark:ring-white/20'
                      : 'border-transparent opacity-90 group-hover:opacity-100'
                  }`}
                  style={{ background: `linear-gradient(to right, ${g.colors.join(', ')})` }}
                />
                <span
                  className={`truncate text-[8px] font-medium leading-none ${
                    active ? (dark ? 'text-gray-100' : 'text-gray-900') : labelClass
                  }`}
                >
                  {p.label}
                </span>
              </button>
            );
          })}
        </div>
        {showCustomGradient && (
          <div
            className={`shrink-0 space-y-1 rounded-lg border p-1.5 ${
              dark ? 'border-gray-600 bg-gray-900/30' : 'border-gray-200 bg-gray-50'
            }`}
          >
            <input
              type="text"
              value={newGradientName}
              onChange={e => setNewGradientName(e.target.value)}
              className={`w-full rounded-full border px-2 py-0.5 text-[10px] ${inputClass}`}
              placeholder="Name"
            />
            {newGradientColors.map((color, i) => (
              <div key={i} className="flex items-center gap-1">
                <input
                  type="color"
                  value={color}
                  onChange={e => {
                    const next = [...newGradientColors];
                    next[i] = e.target.value;
                    setNewGradientColors(next);
                  }}
                  className="h-5 w-5 cursor-pointer rounded-md border-0 p-0"
                />
                {newGradientColors.length > 2 && (
                  <button
                    type="button"
                    aria-label="Remove color"
                    onClick={() => setNewGradientColors(prev => prev.filter((_, idx) => idx !== i))}
                    className="text-red-500"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={createCustomGradient}
              className={`w-full rounded-full py-0.5 text-[9px] font-bold text-white ${
                dark ? 'bg-sky-600' : 'bg-gray-800'
              }`}
            >
              Save
            </button>
          </div>
        )}
      </Section>

      <Section title="Cell labels" hint={`Preview ${cellFormatPreview(cellFormat)}`} dark={dark}>
        <div className={`shrink-0 ${pillTrack} px-3 py-2`}>
          <span className={`mb-1.5 block text-[9px] font-semibold uppercase tracking-wide ${labelClass}`}>
            Decimal
          </span>
          <div className="mb-1 flex justify-between px-0.5">
            {[0, 1, 2, 3].map(n => (
              <span
                key={n}
                className={`w-4 text-center text-[9px] font-medium tabular-nums ${
                  cellFormat.decimalPlaces === n
                    ? dark
                      ? 'font-bold text-gray-100'
                      : 'font-bold text-gray-900'
                    : labelClass
                }`}
              >
                {n}
              </span>
            ))}
          </div>
          <div className="px-0.5">
            <Slider
              min={0}
              max={3}
              step={1}
              value={cellFormat.decimalPlaces}
              onChange={v => {
                const decimalPlaces = Array.isArray(v) ? v[0] : v;
                onCellFormatChange({ ...cellFormat, decimalPlaces });
              }}
              dotStyle={{ display: 'none' }}
              handleStyle={{
                borderColor: dark ? '#d1d5db' : '#374151',
                backgroundColor: '#ffffff',
                width: 11,
                height: 11,
                marginTop: -4,
                boxShadow: '0 1px 2px rgba(0,0,0,0.12)',
              }}
              trackStyle={{ backgroundColor: dark ? '#9ca3af' : '#374151', height: 3, borderRadius: 9999 }}
              railStyle={{ backgroundColor: dark ? '#374151' : '#e5e7eb', height: 3, borderRadius: 9999 }}
            />
          </div>
        </div>

        <div className={`grid shrink-0 grid-cols-3 gap-1 ${pillTrack}`}>
          {suffixOptions.map(opt => {
            const active = cellFormat.suffix === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() =>
                  onCellFormatChange({
                    ...cellFormat,
                    suffix: opt.id,
                    percentScale100: opt.id === 'percent' ? cellFormat.percentScale100 : false,
                  })
                }
                className={`py-1.5 text-[11px] font-semibold ${pillSegClass(dark, active)}`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {cellFormat.suffix === 'percent' && (
          <button
            type="button"
            onClick={() =>
              onCellFormatChange({ ...cellFormat, percentScale100: !cellFormat.percentScale100 })
            }
            className={`w-full rounded-full border py-1.5 text-[10px] font-semibold transition-colors ${
              cellFormat.percentScale100
                ? dark
                  ? 'border-gray-500 bg-gray-700 text-white'
                  : 'border-gray-400 bg-gray-100 text-gray-900'
                : dark
                  ? 'border-gray-600 bg-gray-900/40 text-gray-400 hover:text-gray-200'
                  : 'border-gray-200 bg-gray-50 text-gray-600 hover:text-gray-800'
            }`}
            title="Multiply values by 100 before adding %"
          >
            ×100
          </button>
        )}
      </Section>
    </aside>
  );
}
