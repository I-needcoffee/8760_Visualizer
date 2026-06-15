import { useEffect, useState } from 'react';
import type { LegendDomain } from '../lib/upload8760LegendDefaults';
import { normalizeLegendDomain } from '../lib/upload8760LegendDefaults';

const textInputClass =
  'w-full min-w-0 rounded-lg border px-3 py-2 font-mono text-sm tabular-nums outline-none transition-shadow focus:ring-2 focus:ring-gray-400/50 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none';

interface LegendDomainFieldsProps {
  domain: LegendDomain;
  presetMin: number;
  presetMax: number;
  unit?: string;
  dark: boolean;
  onChange: (domain: LegendDomain) => void;
  onReset: () => void;
  isCustom: boolean;
}

function parseDomainField(raw: string): number | null {
  const trimmed = raw.trim().replace(/,/g, '');
  if (trimmed === '' || trimmed === '-' || trimmed === '.') return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

export function LegendDomainFields({
  domain,
  presetMin,
  presetMax,
  unit,
  dark,
  onChange,
  onReset,
  isCustom,
}: LegendDomainFieldsProps) {
  const labelClass = dark ? 'text-gray-400' : 'text-gray-500';
  const inputClass = dark
    ? `${textInputClass} border-gray-600 bg-gray-900/60 text-gray-100 placeholder:text-gray-500`
    : `${textInputClass} border-gray-300 bg-white text-gray-900 placeholder:text-gray-400`;

  const [minText, setMinText] = useState(String(domain.min));
  const [maxText, setMaxText] = useState(String(domain.max));

  useEffect(() => {
    setMinText(String(domain.min));
    setMaxText(String(domain.max));
  }, [domain.min, domain.max]);

  const commitMin = (text: string) => {
    const parsed = parseDomainField(text);
    if (parsed == null) {
      setMinText(String(domain.min));
      return;
    }
    const next = normalizeLegendDomain(parsed, domain.max);
    onChange(next);
    setMinText(String(next.min));
    setMaxText(String(next.max));
  };

  const commitMax = (text: string) => {
    const parsed = parseDomainField(text);
    if (parsed == null) {
      setMaxText(String(domain.max));
      return;
    }
    const next = normalizeLegendDomain(domain.min, parsed);
    onChange(next);
    setMinText(String(next.min));
    setMaxText(String(next.max));
  };

  return (
    <div
      className={`min-w-0 space-y-2 rounded-xl border p-3 ${
        dark ? 'border-gray-600 bg-gray-900/30' : 'border-gray-200 bg-gray-50/80'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <span className={`block text-[10px] font-semibold uppercase tracking-wide ${labelClass}`}>
            Color scale
          </span>
          <p className={`mt-0.5 text-[9px] leading-snug ${labelClass}`}>
            Preset {presetMin}–{presetMax}
            {unit ? ` ${unit}` : ''} · bars match this range
          </p>
        </div>
        {isCustom && (
          <button
            type="button"
            onClick={onReset}
            className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-semibold ${
              dark
                ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                : 'border-gray-300 text-gray-700 hover:bg-white'
            }`}
          >
            Reset
          </button>
        )}
      </div>
      <div className="grid min-w-0 grid-cols-2 gap-3">
        <label className="flex min-w-0 flex-col gap-1">
          <span className={`text-[9px] font-medium uppercase tracking-wide ${labelClass}`}>Min</span>
          <input
            type="text"
            inputMode="decimal"
            autoComplete="off"
            spellCheck={false}
            value={minText}
            onChange={e => setMinText(e.target.value)}
            onBlur={() => commitMin(minText)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.currentTarget.blur();
              }
            }}
            className={inputClass}
            aria-label="Color scale minimum"
          />
        </label>
        <label className="flex min-w-0 flex-col gap-1">
          <span className={`text-[9px] font-medium uppercase tracking-wide ${labelClass}`}>Max</span>
          <input
            type="text"
            inputMode="decimal"
            autoComplete="off"
            spellCheck={false}
            value={maxText}
            onChange={e => setMaxText(e.target.value)}
            onBlur={() => commitMax(maxText)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.currentTarget.blur();
              }
            }}
            className={inputClass}
            aria-label="Color scale maximum"
          />
        </label>
      </div>
    </div>
  );
}
