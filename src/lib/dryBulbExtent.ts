import type { EPWDataRow, ParsedEPW } from './epwParser';

/** Min/max dry-bulb (°C) across loaded EPW hourly rows. Fallback when no numeric samples. */
export function dryBulbExtentFromRows(rows: EPWDataRow[]): { minC: number; maxC: number } {
  let lo = Infinity;
  let hi = -Infinity;
  for (const r of rows) {
    const t = r.dryBulbTemperature as number | undefined;
    if (typeof t !== 'number' || Number.isNaN(t)) continue;
    lo = Math.min(lo, t);
    hi = Math.max(hi, t);
  }
  if (!(lo <= hi) || !Number.isFinite(lo)) {
    return { minC: -20, maxC: 45 };
  }
  return { minC: lo, maxC: hi };
}

export function dryBulbExtentFromFiles(files: ParsedEPW[]): { minC: number; maxC: number } {
  if (!files.length) return { minC: -20, maxC: 45 };
  let lo = Infinity;
  let hi = -Infinity;
  for (const f of files) {
    const e = dryBulbExtentFromRows(f.data);
    lo = Math.min(lo, e.minC);
    hi = Math.max(hi, e.maxC);
  }
  if (!(lo <= hi) || !Number.isFinite(lo)) {
    return { minC: -20, maxC: 45 };
  }
  return { minC: lo, maxC: hi };
}
