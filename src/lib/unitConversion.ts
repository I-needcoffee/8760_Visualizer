import type { EPWVariable } from './epwParser';

/** Unicode degree units — avoids mojibake when source files are not UTF-8. */
export const UNIT_C = '\u00B0C';
export const UNIT_F = '\u00B0F';

export type LegendUnitSystem = 'metric' | 'imperial';

export function isCelsiusUnit(unit: string): boolean {
  return unit === UNIT_C || unit === '°C';
}

export function convertValue(
  val: number | null | undefined,
  unit: string,
  unitSystem: LegendUnitSystem,
  isDelta = false
): number {
  if (val === null || val === undefined) return 0;
  if (unitSystem === 'imperial') {
    if (isCelsiusUnit(unit)) return isDelta ? val * (9 / 5) : val * (9 / 5) + 32;
    if (unit === 'm/s') return val * 2.23694;
    if (unit === 'mm') return val / 25.4;
  }
  return val;
}

export function convertUnit(unit: string, unitSystem: LegendUnitSystem): string {
  if (unitSystem === 'imperial') {
    if (isCelsiusUnit(unit)) return UNIT_F;
    if (unit === 'm/s') return 'mph';
    if (unit === 'mm') return 'in';
  }
  return unit;
}

/**
 * Heatmap legend span: when fixedMin/Max are set on the variable definition, use them
 * exclusively so palettes stay comparable across locations (e.g. dry bulb 5–35 °C).
 * Otherwise fall back to the file's computed min/max.
 */
export function effectiveVariableLegendBounds(def: EPWVariable): { lo: number; hi: number } {
  return {
    lo: def.fixedMin ?? def.min,
    hi: def.fixedMax ?? def.max,
  };
}

export function variableLegendDomainValues(
  def: EPWVariable,
  unitSystem: LegendUnitSystem
): { min: number; max: number; unit: string } {
  const { lo, hi } = effectiveVariableLegendBounds(def);
  return {
    min: convertValue(lo, def.unit, unitSystem),
    max: convertValue(hi, def.unit, unitSystem),
    unit: convertUnit(def.unit, unitSystem),
  };
}

/** Default UTCI gradient domain (°C) extended to cover computed hourly UTCI in loaded data. */
export function utciGradientExtentC(values: number[]): { minC: number; maxC: number } {
  const DEFAULT_MIN = -40;
  const DEFAULT_MAX = 50;
  const PAD = 2;
  const finite = values.filter(v => typeof v === 'number' && Number.isFinite(v));
  if (!finite.length) return { minC: DEFAULT_MIN, maxC: DEFAULT_MAX };
  const dataMin = Math.min(...finite);
  const dataMax = Math.max(...finite);
  return {
    minC: Math.min(DEFAULT_MIN, Math.floor(dataMin - PAD)),
    maxC: Math.max(DEFAULT_MAX, Math.ceil(dataMax + PAD)),
  };
}
