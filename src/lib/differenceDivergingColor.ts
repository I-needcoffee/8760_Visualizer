/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as d3 from 'd3';

/**
 * Low end → midpoint (white at t=0.5): same family as `TEMPERATURE_COMFORT_GRADIENT_COLORS`
 * cool end — muted blue → lighter blues → white (no near‑black navy).
 */
const DIFF_LOWS = [
  '#085a96',
  '#0069b4',
  '#1e80c4',
  '#3d96d0',
  '#62adda',
  '#8ac3e4',
  '#b0d8ef',
  '#d6ebf7',
  '#eef6fc',
  '#ffffff',
] as const;

/**
 * Midpoint → high end: white → pale cream/yellow → `TEMPERATURE_COMFORT` yellow/orange
 * (ends near `#f06441`, no dark brown).
 */
const DIFF_HIGHS = [
  '#ffffff',
  '#fffbeb',
  '#fef9c3',
  '#fef08a',
  '#fde767',
  '#f5d163',
  '#f0a65c',
  '#ed8a52',
  '#f06441',
] as const;

const lowBasis = d3.interpolateRgbBasis([...DIFF_LOWS]);
const highBasis = d3.interpolateRgbBasis([...DIFF_HIGHS]);

/**
 * Map a **difference** value in `[cMin, cMax]` to a diverging color: cool blues at the
 * minimum, **white at zero**, warm oranges at the maximum. Assumes a mostly symmetric
 * range around 0; values are clamped to `[cMin, cMax]`.
 */
export function differenceDivergingColor(v: number, cMin: number, cMax: number): string {
  const den = cMax - cMin || 1e-9;
  const t = Math.max(0, Math.min(1, (v - cMin) / den));
  if (t <= 0.5) return lowBasis(t * 2);
  return highBasis((t - 0.5) * 2);
}

/**
 * Stops for the legend / gradient list (one combined ramp; used by `GRADIENTS` and
 * `linear-gradient` in `InteractiveLegend`).
 */
export const DIFFERENCE_DIVERGING_COLORS: readonly string[] = [...DIFF_LOWS, ...DIFF_HIGHS.slice(1)];

export const DIFFERENCE_DIVERGING_ID = 'difference-diverging' as const;
