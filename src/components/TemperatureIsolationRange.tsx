import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';
import type { GlobalFilterState } from '../lib/globalFilter';
import type { UnitSystem } from '../App';

function effectiveTemperatureBand(
  f: GlobalFilterState,
  minC: number,
  maxC: number
): [number, number] {
  switch (f.temperatureMode) {
    case 'off':
      return [minC, maxC];
    case 'between':
      return [Math.min(f.temperatureLoC, f.temperatureHiC), Math.max(f.temperatureLoC, f.temperatureHiC)];
    case 'above':
      return [f.temperatureLoC, maxC];
    case 'below':
      return [minC, f.temperatureHiC];
    default:
      return [minC, maxC];
  }
}

/** Dual-handle dry-bulb isolation (°C internally); slider rail = extent of loaded file(s). */
export function TemperatureIsolationRange({
  filter,
  onChangeFilter,
  theme,
  unitSystem,
  extentMinC,
  extentMaxC,
  compact,
}: {
  filter: GlobalFilterState;
  onChangeFilter: (f: GlobalFilterState) => void;
  theme: 'light' | 'dark';
  unitSystem: UnitSystem;
  extentMinC: number;
  extentMaxC: number;
  compact?: boolean;
}) {
  const dark = theme === 'dark';
  const minC = Math.min(extentMinC, extentMaxC);
  const maxC = Math.max(extentMinC, extentMaxC);
  const span = Math.max(maxC - minC, 1e-6);

  const [loC, hiC] = effectiveTemperatureBand(filter, minC, maxC);
  const clampLo = (t: number) => Math.min(maxC, Math.max(minC, t));
  const syncMode = (nextLoC: number, nextHiC: number): GlobalFilterState['temperatureMode'] => {
    const a = Math.min(nextLoC, nextHiC);
    const b = Math.max(nextLoC, nextHiC);
    const atFull = Math.abs(a - minC) < 1e-3 && Math.abs(b - maxC) < 1e-3;
    return atFull ? 'off' : 'between';
  };

  const display = (c: number) =>
    unitSystem === 'imperial' ? (c * 9) / 5 + 32 : c;
  const parseDisplayToC = (n: number) => (unitSystem === 'imperial' ? ((n - 32) * 5) / 9 : n);

  const step = span > 30 ? 1 : 0.5;

  const trackStyle = [{ backgroundColor: dark ? '#9ca3af' : '#525252', height: compact ? '3px' : '4px' }];
  const handleStyle = [
    {
      borderColor: dark ? '#9ca3af' : '#525252',
      backgroundColor: 'white',
      opacity: 1,
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      width: compact ? '12px' : '14px',
      height: compact ? '12px' : '14px',
      marginTop: compact ? '-4px' : '-5px',
    },
    {
      borderColor: dark ? '#9ca3af' : '#525252',
      backgroundColor: 'white',
      opacity: 1,
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      width: compact ? '12px' : '14px',
      height: compact ? '12px' : '14px',
      marginTop: compact ? '-4px' : '-5px',
    },
  ];

  const shellMuted = dark ? 'text-gray-400' : 'text-gray-500';

  return (
    <div className={`space-y-3 ${compact ? '' : ''}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className={`rounded-full border px-2 py-0.5 font-mono text-xs ${dark ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-gray-50'}`}>
          {filter.temperatureMode === 'off'
            ? `Full file (${display(minC).toFixed(1)}–${display(maxC).toFixed(1)}°${unitSystem === 'imperial' ? 'F' : 'C'})`
            : `Isolating ${display(loC).toFixed(1)}–${display(hiC).toFixed(1)}°${unitSystem === 'imperial' ? 'F' : 'C'}`}
        </span>
        <button
          type="button"
          className={`text-[11px] font-medium underline-offset-2 hover:underline ${dark ? 'text-gray-300' : 'text-gray-700'}`}
          onClick={() =>
            onChangeFilter({
              ...filter,
              temperatureMode: 'off',
              temperatureLoC: minC,
              temperatureHiC: maxC,
            })
          }
        >
          Reset to full range
        </button>
      </div>

      <div className={compact ? 'px-1 py-1' : 'px-2 py-2'}>
        <Slider
          range
          min={minC}
          max={maxC}
          step={step}
          value={[clampLo(loC), clampLo(hiC)]}
          onChange={val => {
            if (!Array.isArray(val)) return;
            const a = clampLo(val[0]!);
            const b = clampLo(val[1]!);
            onChangeFilter({
              ...filter,
              temperatureLoC: a,
              temperatureHiC: b,
              temperatureMode: syncMode(a, b),
            });
          }}
          trackStyle={trackStyle}
          handleStyle={handleStyle}
          railStyle={{ backgroundColor: dark ? '#374151' : '#f3f4f6', height: compact ? '3px' : '4px' }}
        />
      </div>

      <div className={`flex flex-wrap items-end gap-4 text-xs ${dark ? 'text-gray-300' : 'text-gray-600'}`}>
        <label className="flex flex-col gap-1">
          <span className={shellMuted}>Low limit</span>
          <div className="flex items-center gap-1">
            <input
              type="number"
              step={step}
              value={Math.round(display(loC) * 100) / 100}
              onChange={e => {
                const parsed = Number(e.target.value);
                if (!Number.isFinite(parsed)) return;
                const nextC = clampLo(parseDisplayToC(parsed));
                const hi = clampLo(Math.max(loC, hiC));
                const nextLo = Math.min(nextC, hi);
                onChangeFilter({
                  ...filter,
                  temperatureLoC: nextLo,
                  temperatureHiC: hi,
                  temperatureMode: syncMode(nextLo, hi),
                });
              }}
              className={`w-24 rounded-lg border px-2 py-1 font-mono text-sm outline-none ${dark ? 'border-gray-600 bg-gray-900/80 text-gray-100' : 'border-gray-200 bg-white'}`}
            />
            <span className="tabular-nums opacity-75">{unitSystem === 'imperial' ? '°F' : '°C'}</span>
          </div>
        </label>
        <label className="flex flex-col gap-1">
          <span className={shellMuted}>High limit</span>
          <div className="flex items-center gap-1">
            <input
              type="number"
              step={step}
              value={Math.round(display(hiC) * 100) / 100}
              onChange={e => {
                const parsed = Number(e.target.value);
                if (!Number.isFinite(parsed)) return;
                const nextC = clampLo(parseDisplayToC(parsed));
                const low = clampLo(Math.min(loC, hiC));
                const nextHi = Math.max(nextC, low);
                onChangeFilter({
                  ...filter,
                  temperatureLoC: low,
                  temperatureHiC: nextHi,
                  temperatureMode: syncMode(low, nextHi),
                });
              }}
              className={`w-24 rounded-lg border px-2 py-1 font-mono text-sm outline-none ${dark ? 'border-gray-600 bg-gray-900/80 text-gray-100' : 'border-gray-200 bg-white'}`}
            />
            <span className="tabular-nums opacity-75">{unitSystem === 'imperial' ? '°F' : '°C'}</span>
          </div>
        </label>
      </div>

      <p className={`text-[11px] leading-snug opacity-90 ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
        Uses EPW dry-bulb temperature (stored in °C). Drag both handles or type limits to include only timesteps within
        this band across every chart.
      </p>
    </div>
  );
}
