import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';
import { Calendar, Clock, Filter } from 'lucide-react';
import type { GlobalFilterState } from '../lib/globalFilter';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const MONTH_PRESETS = [
  { label: 'Spring', range: [3, 5] as const },
  { label: 'Summer', range: [6, 8] as const },
  { label: 'Fall', range: [9, 11] as const },
  { label: 'Winter', range: [12, 2] as const },
  { label: 'Annual', range: [1, 12] as const },
];

const HOUR_PRESETS = [
  { label: '7am–7pm', range: [7, 19] as const },
  { label: 'Morning', range: [7, 11] as const },
  { label: 'Midday', range: [11, 15] as const },
  { label: 'Afternoon', range: [16, 19] as const },
  { label: 'All day', range: [0, 23] as const },
];

function sliderRail(dark: boolean) {
  return { backgroundColor: dark ? '#374151' : '#e5e7eb', height: 3, borderRadius: 9999 };
}

function sliderTrack(dark: boolean) {
  return { backgroundColor: dark ? '#9ca3af' : '#374151', height: 3, borderRadius: 9999 };
}

function sliderHandles(dark: boolean) {
  const borderColor = dark ? '#d1d5db' : '#374151';
  return [
    {
      borderColor,
      backgroundColor: '#ffffff',
      width: 11,
      height: 11,
      marginTop: -4,
      boxShadow: '0 1px 2px rgba(0,0,0,0.12)',
    },
    {
      borderColor,
      backgroundColor: '#ffffff',
      width: 11,
      height: 11,
      marginTop: -4,
      boxShadow: '0 1px 2px rgba(0,0,0,0.12)',
    },
  ];
}

function presetBtn(dark: boolean, active: boolean) {
  return active
    ? dark
      ? 'border-gray-500 bg-gray-600 text-gray-100'
      : 'border-gray-400 bg-gray-200 text-gray-900'
    : dark
      ? 'border-gray-700 text-gray-400 hover:bg-gray-700'
      : 'border-gray-200 text-gray-600 hover:bg-gray-50';
}

interface Upload8760GlobalFiltersProps {
  filter: GlobalFilterState;
  onChange: (filter: GlobalFilterState) => void;
  theme: 'light' | 'dark';
  valueExtent: { min: number; max: number };
  valueUnit?: string;
  valueLabel?: string;
}

function effectiveValueBand(
  f: GlobalFilterState,
  min: number,
  max: number
): [number, number] {
  if (f.temperatureMode === 'off') return [min, max];
  const lo = Math.min(f.temperatureLoC, f.temperatureHiC);
  const hi = Math.max(f.temperatureLoC, f.temperatureHiC);
  return [lo, hi];
}

export function Upload8760GlobalFilters({
  filter,
  onChange,
  theme,
  valueExtent,
  valueUnit = '',
  valueLabel = 'Value',
}: Upload8760GlobalFiltersProps) {
  const dark = theme === 'dark';
  const labelClass = dark ? 'text-gray-400' : 'text-gray-500';
  const minV = Math.min(valueExtent.min, valueExtent.max);
  const maxV = Math.max(valueExtent.min, valueExtent.max);
  const span = Math.max(maxV - minV, 1e-6);
  const step = span > 30 ? 1 : span > 3 ? 0.1 : 0.01;
  const [lo, hi] = effectiveValueBand(filter, minV, maxV);
  const clamp = (t: number) => Math.min(maxV, Math.max(minV, t));

  const syncMode = (nextLo: number, nextHi: number): GlobalFilterState['temperatureMode'] => {
    const a = Math.min(nextLo, nextHi);
    const b = Math.max(nextLo, nextHi);
    const atFull = Math.abs(a - minV) < 1e-6 && Math.abs(b - maxV) < 1e-6;
    return atFull ? 'off' : 'between';
  };

  const monthSummary =
    filter.startMonth <= filter.endMonth
      ? `${MONTHS[filter.startMonth - 1]}–${MONTHS[filter.endMonth - 1]}`
      : `${MONTHS[filter.startMonth - 1]}–${MONTHS[filter.endMonth - 1]} (wrap)`;

  return (
    <div className="flex min-h-0 flex-col gap-2 overflow-y-auto">
      <div className={`flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-wide ${labelClass}`}>
        <Filter className="h-3 w-3" />
        Time filters
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between gap-1">
          <span className={`flex items-center gap-1 text-[9px] font-semibold ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
            <Calendar className="h-3 w-3" />
            Months
          </span>
          <span className={`rounded-full border px-1.5 py-px font-mono text-[8px] ${dark ? 'border-gray-600 bg-gray-900/50 text-gray-400' : 'border-gray-200 bg-gray-50 text-gray-500'}`}>
            {monthSummary}
          </span>
        </div>
        <div className="px-0.5 py-1">
          <Slider
            range
            min={1}
            max={12}
            value={[filter.startMonth, filter.endMonth]}
            onChange={val => {
              if (Array.isArray(val)) onChange({ ...filter, startMonth: val[0]!, endMonth: val[1]! });
            }}
            trackStyle={[sliderTrack(dark)]}
            handleStyle={sliderHandles(dark)}
            railStyle={sliderRail(dark)}
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {MONTH_PRESETS.map(p => (
            <button
              key={p.label}
              type="button"
              onClick={() => onChange({ ...filter, startMonth: p.range[0], endMonth: p.range[1] })}
              className={`rounded-full border px-1.5 py-0.5 text-[8px] font-semibold ${presetBtn(
                dark,
                filter.startMonth === p.range[0] && filter.endMonth === p.range[1]
              )}`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between gap-1">
          <span className={`flex items-center gap-1 text-[9px] font-semibold ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
            <Clock className="h-3 w-3" />
            Hours
          </span>
          <span className={`rounded-full border px-1.5 py-px font-mono text-[8px] ${dark ? 'border-gray-600 bg-gray-900/50 text-gray-400' : 'border-gray-200 bg-gray-50 text-gray-500'}`}>
            {filter.startHour.toString().padStart(2, '0')}:00–{filter.endHour.toString().padStart(2, '0')}:59
          </span>
        </div>
        <div className="px-0.5 py-1">
          <Slider
            range
            min={0}
            max={23}
            value={[filter.startHour, filter.endHour]}
            onChange={val => {
              if (Array.isArray(val)) onChange({ ...filter, startHour: val[0]!, endHour: val[1]! });
            }}
            trackStyle={[sliderTrack(dark)]}
            handleStyle={sliderHandles(dark)}
            railStyle={sliderRail(dark)}
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {HOUR_PRESETS.map(p => (
            <button
              key={p.label}
              type="button"
              onClick={() => onChange({ ...filter, startHour: p.range[0], endHour: p.range[1] })}
              className={`rounded-full border px-1.5 py-0.5 text-[8px] font-semibold ${presetBtn(
                dark,
                filter.startHour === p.range[0] && filter.endHour === p.range[1]
              )}`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className={`space-y-1 border-t pt-2 ${dark ? 'border-gray-700' : 'border-gray-100'}`}>
        <div className="flex items-center justify-between gap-1">
          <span className={`text-[9px] font-semibold ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
            {valueLabel} isolation
          </span>
          <button
            type="button"
            onClick={() =>
              onChange({
                ...filter,
                temperatureMode: 'off',
                temperatureLoC: minV,
                temperatureHiC: maxV,
              })
            }
            className={`text-[8px] font-semibold underline-offset-2 hover:underline ${labelClass}`}
          >
            Reset
          </button>
        </div>
        <p className={`text-[8px] leading-snug ${labelClass}`}>
          {filter.temperatureMode === 'off'
            ? `Full range (${minV.toFixed(2)}–${maxV.toFixed(2)}${valueUnit ? ` ${valueUnit}` : ''})`
            : `Isolating ${lo.toFixed(2)}–${hi.toFixed(2)}${valueUnit ? ` ${valueUnit}` : ''}`}
        </p>
        <div className="px-0.5 py-1">
          <Slider
            range
            min={minV}
            max={maxV}
            step={step}
            value={[clamp(lo), clamp(hi)]}
            onChange={val => {
              if (!Array.isArray(val)) return;
              const a = clamp(val[0]!);
              const b = clamp(val[1]!);
              onChange({
                ...filter,
                temperatureLoC: a,
                temperatureHiC: b,
                temperatureMode: syncMode(a, b),
              });
            }}
            trackStyle={[sliderTrack(dark)]}
            handleStyle={sliderHandles(dark)}
            railStyle={sliderRail(dark)}
          />
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <label className="flex flex-col gap-0.5">
            <span className={`text-[8px] font-medium ${labelClass}`}>Low</span>
            <input
              type="number"
              step={step}
              value={Math.round(lo * 1000) / 1000}
              onChange={e => {
                const parsed = Number(e.target.value);
                if (!Number.isFinite(parsed)) return;
                const nextLo = clamp(Math.min(parsed, hi));
                onChange({
                  ...filter,
                  temperatureLoC: nextLo,
                  temperatureHiC: hi,
                  temperatureMode: syncMode(nextLo, hi),
                });
              }}
              className={`w-full rounded-lg border px-1.5 py-0.5 font-mono text-[10px] outline-none ${dark ? 'border-gray-600 bg-gray-900/80 text-gray-100' : 'border-gray-200 bg-white'}`}
            />
          </label>
          <label className="flex flex-col gap-0.5">
            <span className={`text-[8px] font-medium ${labelClass}`}>High</span>
            <input
              type="number"
              step={step}
              value={Math.round(hi * 1000) / 1000}
              onChange={e => {
                const parsed = Number(e.target.value);
                if (!Number.isFinite(parsed)) return;
                const nextHi = clamp(Math.max(parsed, lo));
                onChange({
                  ...filter,
                  temperatureLoC: lo,
                  temperatureHiC: nextHi,
                  temperatureMode: syncMode(lo, nextHi),
                });
              }}
              className={`w-full rounded-lg border px-1.5 py-0.5 font-mono text-[10px] outline-none ${dark ? 'border-gray-600 bg-gray-900/80 text-gray-100' : 'border-gray-200 bg-white'}`}
            />
          </label>
        </div>
      </div>
    </div>
  );
}
