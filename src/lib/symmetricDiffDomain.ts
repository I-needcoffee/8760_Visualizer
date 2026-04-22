import * as d3 from 'd3';

/**
 * For Δ maps, use a **symmetric** range around 0: if the extrema of the differences
 * are min D₀ and max D₁, the bound is B = max(|D₀|, |D₁|) and the domain is [-B, B]
 * so 0 stays visually centered in the legend and color scale.
 */
export function symmetricDiffBound(diffs: number[]): number {
  if (!diffs.length) return 0;
  const minD = d3.min(diffs);
  const maxD = d3.max(diffs);
  const a = minD != null && Number.isFinite(minD) ? Math.abs(minD) : 0;
  const b = maxD != null && Number.isFinite(maxD) ? Math.abs(maxD) : 0;
  return Math.max(a, b, 0);
}
