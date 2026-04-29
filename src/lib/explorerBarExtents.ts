import * as d3 from 'd3';
import type { EPWDataRow } from './epwParser';

/**
 * **Product contract:** Bar chart extents for Solar / RH / sky use **mean(daily minimum)** and **mean(daily maximum)**
 * within each time bucket unless product explicitly requests a change. Do not regress to raw hourly min/max.
 *
 * Sky cover, humidity, and solar columns often hit both ends of the physical range within a
 * month; min/max over all hours in the bin flattens bars. Use mean(daily min) and mean(daily max)
 * instead so each bar shows a calmer “typical diurnal spread” while the dot stays the mean.
 */
export function explorerUsesDailyAvgBarExtents(variableId: string, category: string): boolean {
  return (
    variableId === 'totalSkyCover' ||
    variableId === 'opaqueSkyCover' ||
    variableId === 'relativeHumidity' ||
    category === 'Solar'
  );
}

/** Group selected hours by calendar day, then average each day’s min and max of `field`. */
export function meanDailyLowHighForRows(rows: EPWDataRow[], field: string): { low: number; high: number } | null {
  if (rows.length === 0) return null;

  const byDay = d3.group(rows, r => `${r.year}_${r.dayOfYear}`);
  const lows: number[] = [];
  const highs: number[] = [];

  for (const dayRows of byDay.values()) {
    const nums: number[] = [];
    for (const r of dayRows) {
      const v = r[field] as unknown;
      if (typeof v !== 'number' || Number.isNaN(v)) continue;
      nums.push(v);
    }
    if (nums.length === 0) continue;
    lows.push(d3.min(nums)!);
    highs.push(d3.max(nums)!);
  }

  if (!lows.length) return null;

  return {
    low: d3.mean(lows)!,
    high: d3.mean(highs)!,
  };
}
