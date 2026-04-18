import * as d3 from 'd3';
import type { ChartType, UnitSystem } from '../App';
import type { TutorialLiveSnapshot } from '../context/TutorialLiveContext';
import type { GlobalFilterState } from '../components/GlobalFilterPanel';
import type { EPWDataRow } from './epwParser';
import { EPW_COLUMNS } from './epwParser';

export type TutorialQuickStat = { label: string; value: string };

export type TutorialQuickStatBlock = { heading?: string; rows: TutorialQuickStat[] };

const COLUMN = Object.fromEntries(EPW_COLUMNS.map(c => [c.id, c])) as Record<string, (typeof EPW_COLUMNS)[number]>;

function filterRows(rows: EPWDataRow[], filter: GlobalFilterState): EPWDataRow[] {
  return rows.filter(d => {
    const isMonthMatch =
      filter.startMonth <= filter.endMonth
        ? d.month >= filter.startMonth && d.month <= filter.endMonth
        : d.month >= filter.startMonth || d.month <= filter.endMonth;
    return isMonthMatch && d.hour >= filter.startHour && d.hour <= filter.endHour;
  });
}

function numericSeries(rows: EPWDataRow[], columnId: string): number[] {
  const meta = COLUMN[columnId];
  const missing = meta?.missing ?? 999999;
  const out: number[] = [];
  for (const r of rows) {
    const v = r[columnId];
    if (typeof v !== 'number' || Number.isNaN(v) || v === missing) continue;
    out.push(v);
  }
  return out;
}

function formatValue(v: number, unit: string, unitSystem: UnitSystem): string {
  let n = v;
  let u = unit;
  if (unitSystem === 'imperial') {
    if (unit === '°C') {
      n = (v * 9) / 5 + 32;
      u = '°F';
    } else if (unit === 'm/s') {
      n = v * 2.23694;
      u = 'mph';
    } else if (unit === 'mm') {
      n = v / 25.4;
      u = 'in';
    } else if (unit === 'km') {
      n = v * 0.621371;
      u = 'mi';
    }
  }
  const abs = Math.abs(n);
  const decimals = abs >= 100 ? 0 : abs >= 10 ? 1 : 2;
  return `${n.toFixed(decimals)}${u ? ` ${u}` : ''}`;
}

function coreStats(vals: number[], unit: string, unitSystem: UnitSystem): TutorialQuickStat[] {
  if (!vals.length) return [{ label: 'Values', value: 'None in this filtered range.' }];
  const min = d3.min(vals)!;
  const max = d3.max(vals)!;
  const mean = d3.mean(vals)!;
  const median = d3.median(vals)!;
  const dev = d3.deviation(vals);
  const lines: TutorialQuickStat[] = [
    { label: 'Peak', value: formatValue(max, unit, unitSystem) },
    { label: 'Low', value: formatValue(min, unit, unitSystem) },
    { label: 'Average', value: formatValue(mean, unit, unitSystem) },
    { label: 'Median (middle timestep)', value: formatValue(median as number, unit, unitSystem) },
  ];
  if (dev != null && vals.length > 2 && Number.isFinite(dev) && dev > 0) {
    lines.push({ label: 'Typical day-to-day swing (std. dev.)', value: formatValue(dev, unit, unitSystem) });
  }
  lines.push({ label: 'Timesteps counted', value: String(vals.length) });
  return lines;
}

function blockForColumn(
  rows: EPWDataRow[],
  columnId: string,
  unitSystem: UnitSystem,
  heading?: string
): TutorialQuickStatBlock {
  const vals = numericSeries(rows, columnId);
  const meta = COLUMN[columnId];
  const unit = meta?.unit ?? '';
  const h = heading || meta?.name || columnId;
  return { heading: h, rows: coreStats(vals, unit, unitSystem) };
}

function windSpeedBlock(rows: EPWDataRow[], unitSystem: UnitSystem): TutorialQuickStatBlock {
  const vals = numericSeries(rows, 'windSpeed');
  const unit = 'm/s';
  return {
    heading: 'Wind speed (same hours as the chart)',
    rows: coreStats(vals, unit, unitSystem),
  };
}

export function computeTutorialGuideQuickStats(opts: {
  chartType: ChartType | 'empty';
  rows: EPWDataRow[] | undefined;
  filter: GlobalFilterState;
  unitSystem: UnitSystem;
  slotVariableId?: string;
  live: TutorialLiveSnapshot;
}): TutorialQuickStatBlock[] {
  const { chartType, rows, filter, unitSystem, slotVariableId, live } = opts;
  if (!rows?.length) return [];

  const filtered = filterRows(rows, filter);
  if (!filtered.length) {
    return [{ heading: undefined, rows: [{ label: 'Filtered range', value: 'No rows match your month/hour filters.' }] }];
  }

  if (chartType === 'empty') {
    return [blockForColumn(filtered, 'dryBulbTemperature', unitSystem, 'Air temperature in your file')];
  }

  if (chartType === 'explorer') {
    const id = live.colorVarId || slotVariableId || 'dryBulbTemperature';
    return [blockForColumn(filtered, id, unitSystem)];
  }

  if (chartType === 'sunpath') {
    const colorId = live.colorVarId || 'dryBulbTemperature';
    const radiusId = live.radiusVarId || 'globalHorizontalRadiation';
    const colorHeading = `Dot color · ${live.colorVarName || COLUMN[colorId]?.name || 'Variable'}`;
    const radiusHeading = `Dot radius · ${live.radiusVarName || COLUMN[radiusId]?.name || 'Variable'}`;
    return [
      blockForColumn(filtered, colorId, unitSystem, colorHeading),
      blockForColumn(filtered, radiusId, unitSystem, radiusHeading),
    ];
  }

  if (chartType === 'wind') {
    const colorId = live.colorVarId || 'dryBulbTemperature';
    return [windSpeedBlock(filtered, unitSystem), blockForColumn(filtered, colorId, unitSystem, `Color overlay · ${live.colorVarName || COLUMN[colorId]?.name || 'Variable'}`)];
  }

  if (chartType === 'windrose') {
    const colorId = live.colorVarId || 'windSpeed';
    return [
      {
        heading: 'Sample size',
        rows: [{ label: 'Filtered hours in the rose', value: String(filtered.length) }],
      },
      blockForColumn(filtered, colorId, unitSystem, `Petal color · ${live.colorVarName || COLUMN[colorId]?.name || 'Variable'}`),
    ];
  }

  if (chartType === 'utci') {
    return [
      blockForColumn(filtered, 'dryBulbTemperature', unitSystem, 'Air temperature (feeds the comfort model)'),
      blockForColumn(filtered, 'relativeHumidity', unitSystem, 'Relative humidity (feeds the comfort model)'),
      windSpeedBlock(filtered, unitSystem),
      {
        heading: 'Modeled comfort (UTCI)',
        rows: [
          {
            label: 'Summary on the card',
            value: 'Use the Stats control on the chart for UTCI high, low, and average.',
          },
        ],
      },
    ];
  }

  return [blockForColumn(filtered, 'dryBulbTemperature', unitSystem)];
}
