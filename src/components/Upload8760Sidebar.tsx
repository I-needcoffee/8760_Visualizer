import { useCallback, useRef, useState, type ChangeEvent } from 'react';
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
  { id: 'temperature-comfort', label: 'Temp' },
  { id: 'humidity-spectrum', label: 'RH' },
  { id: 'wind-speed-warm', label: 'Wind' },
  { id: 'solar-yellow-orange', label: 'Solar' },
  { id: 'cloud-cover-gray', label: 'Cloud' },
  { id: 'coolwarm', label: 'Cool/warm' },
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
  const panel = dark ? 'border-gray-700 bg-gray-800/80' : 'border-gray-200 bg-gray-50/80';
  const card = dark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white';
  const labelClass = dark ? 'text-gray-400' : 'text-gray-500';
  const inputClass = dark
    ? 'border-gray-600 bg-gray-900/50 text-gray-100 placeholder:text-gray-500'
    : 'border-gray-300 bg-white text-gray-900 placeholder:text-gray-400';

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

  return (
    <aside
      className={`grid h-full min-h-0 grid-rows-[minmax(0,1.1fr)_minmax(0,0.95fr)_minmax(0,0.85fr)] gap-1 overflow-hidden rounded-lg border p-1.5 shadow-hard-lg sm:p-2 ${card}`}
    >
      <section className={`flex min-h-0 flex-col gap-1 overflow-hidden rounded-md border p-1.5 sm:p-2 ${panel}`}>
        <div className="flex shrink-0 items-center justify-between gap-1">
          <h2 className={`text-[10px] font-bold uppercase tracking-wide ${dark ? 'text-gray-200' : 'text-gray-800'}`}>
            Data input
          </h2>
          {parsed && (
            <button
              type="button"
              onClick={onClear}
              className={`shrink-0 rounded-full px-1.5 py-px text-[9px] font-semibold uppercase ${labelClass} hover:opacity-80`}
            >
              Clear
            </button>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.txt,.tsv,.xlsx,.xls,.epw"
          className="hidden"
          onChange={handleFileChange}
        />
        <div className="grid shrink-0 grid-cols-2 gap-1">
          <button
            type="button"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
            className={`flex items-center justify-center gap-1 rounded-full border px-1.5 py-1 text-[9px] font-semibold ${
              dark
                ? 'border-gray-600 bg-gray-700 text-gray-100 hover:bg-gray-600'
                : 'border-gray-300 bg-white text-gray-800 hover:bg-gray-50'
            }`}
          >
            <FileUp className="h-3 w-3 shrink-0" />
            {busy ? '…' : 'File'}
          </button>
          <button
            type="button"
            onClick={handlePasteFromClipboard}
            className={`flex items-center justify-center gap-1 rounded-full border px-1.5 py-1 text-[9px] font-semibold ${
              dark
                ? 'border-gray-600 bg-gray-900/40 text-gray-200 hover:bg-gray-700/60'
                : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
            }`}
          >
            <ClipboardPaste className="h-3 w-3 shrink-0" />
            Paste
          </button>
        </div>
        <textarea
          value={pasteText}
          onChange={e => setPasteText(e.target.value)}
          placeholder="8760 values (tab/comma separated)…"
          rows={2}
          className={`min-h-0 flex-1 resize-none rounded-md border px-2 py-1 font-mono text-[10px] outline-none focus:ring-1 focus:ring-gray-400 ${inputClass}`}
        />
        <button
          type="button"
          onClick={handlePasteSubmit}
          disabled={!pasteText.trim()}
          className={`shrink-0 rounded-full py-1 text-[9px] font-bold text-white disabled:opacity-40 ${
            dark ? 'bg-sky-600 hover:bg-sky-500' : 'bg-gray-800 hover:bg-gray-900'
          }`}
        >
          Parse data
        </button>
        {error && (
          <p className="shrink-0 rounded border border-red-200 bg-red-50 px-1.5 py-0.5 text-[9px] leading-snug text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </p>
        )}
        {parsed && !error && (
          <p
            className={`shrink-0 truncate text-[9px] ${
              dark ? 'text-emerald-300' : 'text-emerald-700'
            }`}
          >
            {parsed.data.length} hours · {parsed.valueColumnLabel ?? 'values'}
            {parsed.parseMode === 'epw' ? ' · EPW' : ''}
          </p>
        )}
      </section>

      <section className={`flex min-h-0 flex-col gap-1 overflow-hidden rounded-md border p-1.5 sm:p-2 ${panel}`}>
        <div className="flex shrink-0 items-center justify-between gap-1">
          <h3 className={`text-[10px] font-bold uppercase tracking-wide ${labelClass}`}>Gradient</h3>
          <button
            type="button"
            onClick={() => setShowCustomGradient(v => !v)}
            className={`flex items-center gap-0.5 text-[9px] font-bold uppercase ${labelClass} hover:opacity-80`}
          >
            <Plus className="h-2.5 w-2.5" />
            Custom
          </button>
        </div>
        <div className="grid shrink-0 grid-cols-4 gap-1">
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
                className={`h-6 rounded-full border transition-all ${
                  active ? 'border-gray-700 ring-1 ring-gray-700' : 'border-transparent opacity-90 hover:opacity-100'
                }`}
                style={{ background: `linear-gradient(to right, ${g.colors.join(', ')})` }}
              >
                <span className="sr-only">{p.label}</span>
              </button>
            );
          })}
        </div>
        {showCustomGradient && (
          <div className={`shrink-0 space-y-1 rounded-md border p-1.5 ${card}`}>
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
                  className="h-5 w-5 cursor-pointer rounded-full border-0 p-0"
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
        <p className={`min-h-0 flex-1 truncate text-[9px] ${labelClass}`}>
          {gradients.find(g => g.id === gradientId)?.name ?? gradientId}
        </p>
      </section>

      <section className={`flex min-h-0 flex-col gap-1.5 overflow-hidden rounded-md border p-1.5 sm:p-2 ${panel}`}>
        <div className="flex shrink-0 items-center justify-between gap-2">
          <h3 className={`text-[10px] font-bold uppercase tracking-wide ${labelClass}`}>Cell format</h3>
          <span className={`font-mono text-[9px] ${dark ? 'text-gray-300' : 'text-gray-600'}`}>
            e.g. {cellFormatPreview(cellFormat)}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className={`w-14 shrink-0 text-[9px] font-medium ${labelClass}`}>Decimals</span>
          <div className="min-w-0 flex-1 px-1">
            <Slider
              min={0}
              max={3}
              step={1}
              value={cellFormat.decimalPlaces}
              onChange={v => {
                const decimalPlaces = Array.isArray(v) ? v[0] : v;
                onCellFormatChange({ ...cellFormat, decimalPlaces });
              }}
              marks={{ 0: '0', 1: '1', 2: '2', 3: '3' }}
              dotStyle={{ display: 'none' }}
              handleStyle={{
                borderColor: dark ? '#9ca3af' : '#374151',
                backgroundColor: dark ? '#f3f4f6' : '#ffffff',
                width: 12,
                height: 12,
                marginTop: -4,
              }}
              trackStyle={{ backgroundColor: dark ? '#6b7280' : '#374151', height: 4 }}
              railStyle={{ backgroundColor: dark ? '#374151' : '#e5e7eb', height: 4 }}
            />
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <span className={`w-14 shrink-0 text-[9px] font-medium ${labelClass}`}>Suffix</span>
          <div className="flex flex-wrap gap-1">
            {(
              [
                { id: 'none' as const, label: 'None' },
                { id: 'percent' as const, label: '%' },
                { id: 'degree' as const, label: '°' },
              ] satisfies { id: CellFormatSuffix; label: string }[]
            ).map(opt => {
              const active = cellFormat.suffix === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onCellFormatChange({ ...cellFormat, suffix: opt.id })}
                  className={`min-w-[2.25rem] rounded-full border px-2 py-0.5 text-[9px] font-semibold transition-colors ${
                    active
                      ? dark
                        ? 'border-gray-500 bg-gray-700 text-white'
                        : 'border-gray-400 bg-gray-100 text-gray-900'
                      : dark
                        ? 'border-gray-700 text-gray-300 hover:bg-gray-700/50'
                        : 'border-gray-200 text-gray-700 hover:bg-white'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>
    </aside>
  );
}
