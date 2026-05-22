import * as d3 from 'd3';

/** @deprecated Use {@link explorerChartValueGradientId} — duplicate ids break multi-card dashboards. */
export const EXPLORER_CHART_VALUE_GRADIENT_ID = 'explorer-chart-value-grad';

/** Unique per chart instance so `url(#…)` does not resolve to another card's gradient. */
export function explorerChartValueGradientId(instanceKey: string): string {
  const safe = instanceKey.replace(/[^a-zA-Z0-9_-]/g, '_');
  return `explorer-chart-value-grad-${safe}`;
}

/** SVG `<defs>` on the root `<svg>` (survives the transformed `<g>` chart group). */
export function upsertSvgDefs(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>
): d3.Selection<SVGDefsElement, unknown, null, undefined> {
  let defs = svg.select<SVGDefsElement>('defs');
  if (defs.empty()) {
    defs = svg.append('defs');
  }
  return defs;
}

/**
 * One vertical gradient per chart, mapped in chart Y space from legend min (bottom) to max (top).
 * All bars share this fill so each bar height reveals the matching slice of the legend ramp.
 */
export function createExplorerChartValueGradient(
  defs: d3.Selection<SVGDefsElement, unknown, null, undefined>,
  colorAt: (v: number) => string,
  legendMin: number,
  legendMax: number,
  valueToPixelY: (v: number) => number,
  options?: { stopCount?: number; id?: string }
): string {
  const id = options?.id ?? EXPLORER_CHART_VALUE_GRADIENT_ID;
  const lo = Math.min(legendMin, legendMax);
  const hi = Math.max(legendMin, legendMax);
  const stopCount = options?.stopCount ?? 24;

  defs.select(`#${id}`).remove();

  const grad = defs
    .append('linearGradient')
    .attr('id', id)
    .attr('gradientUnits', 'userSpaceOnUse')
    .attr('x1', 0)
    .attr('x2', 0)
    .attr('y1', valueToPixelY(hi))
    .attr('y2', valueToPixelY(lo));

  for (let i = 0; i <= stopCount; i++) {
    const t = i / stopCount;
    const v = hi - t * (hi - lo);
    grad
      .append('stop')
      .attr('offset', `${(t * 100).toFixed(2)}%`)
      .attr('stop-color', colorAt(v));
  }

  return `url(#${id})`;
}
