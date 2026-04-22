/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as d3 from 'd3';

/**
 * Low end → midpoint (white at t=0.5 in normalized “difference” space):
 * deep blue → medium blue → sky → very pale blue → white.
 */
const DIFF_LOWS = [
  '#051324',
  '#0a1f3c',
  '#0c4a6e',
  '#1d4ed8',
  '#2563eb',
  '#3b82f6',
  '#60a5fa',
  '#7dd3fc',
  '#bae6fd',
  '#e0f2fe',
  '#f0f9ff',
  '#ffffff',
] as const;

/**
 * Midpoint (white) → high end: white → cream → gold → deep burnt orange.
 */
const DIFF_HIGHS = [
  '#ffffff',
  '#fffbeb',
  '#fef3c7',
  '#fde68a',
  '#fcd34d',
  '#fbbf24',
  '#f59e0b',
  '#ea580c',
  '#c2410c',
  '#9a3412',
  '#7c2d12',
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
