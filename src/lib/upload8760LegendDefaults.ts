import type { EPWVariable } from './epwParser';
import {
  convertUnit,
  convertValue,
  effectiveVariableLegendBounds,
  type LegendUnitSystem,
} from './unitConversion';

/**
 * Climate Canvas–aligned legend / bar-chart domains per gradient preset.
 * Matches EPW fixedMin/Max and palette-specific ramps where applicable.
 */
export const GRADIENT_LEGEND_DEFAULTS: Record<string, { min: number; max: number }> = {
  'temperature-comfort': { min: 5, max: 35 },
  'humidity-spectrum': { min: 0, max: 100 },
  'wind-speed-warm': { min: 0, max: 12 },
  'wind-intensity-blue': { min: 0, max: 12 },
  'solar-yellow-orange': { min: 0, max: 1000 },
  'direct-normal-radiation': { min: 0, max: 1000 },
  'cloud-cover-gray': { min: 0, max: 100 },
  'utci-categories': { min: -5, max: 5 },
  coolwarm: { min: 5, max: 35 },
  viridis: { min: 0, max: 100 },
  magma: { min: 0, max: 100 },
  turbo: { min: 0, max: 100 },
};

export type LegendDomain = { min: number; max: number };

export function resolveUpload8760LegendDomain(
  gradientId: string,
  variable: EPWVariable | undefined,
  unitSystem: LegendUnitSystem = 'metric'
): LegendDomain & { unit: string; presetMin: number; presetMax: number } {
  const preset = GRADIENT_LEGEND_DEFAULTS[gradientId];
  const unit = variable ? convertUnit(variable.unit, unitSystem) : '';

  if (preset) {
    return {
      min: preset.min,
      max: preset.max,
      unit,
      presetMin: preset.min,
      presetMax: preset.max,
    };
  }

  if (variable) {
    const bounds = effectiveVariableLegendBounds(variable);
    const min = convertValue(bounds.lo, variable.unit, unitSystem);
    const max = convertValue(bounds.hi, variable.unit, unitSystem);
    return { min, max, unit, presetMin: min, presetMax: max };
  }

  return { min: 0, max: 100, unit, presetMin: 0, presetMax: 100 };
}

export function normalizeLegendDomain(min: number, max: number): LegendDomain {
  if (!Number.isFinite(min)) min = 0;
  if (!Number.isFinite(max)) max = min + 1;
  if (min >= max) max = min + 1;
  return { min, max };
}
