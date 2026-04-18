/**
 * Shared bar + 1224 heatmap SVG layout for Data / Wind / UTCI explorers so
 * adjacent cards keep the same viewBox, scale, and vertical alignment.
 */

export const EXPLORER_SVG_BASE_WIDTH = 350;
export const EXPLORER_SVG_LAYOUT_BASELINE_HEIGHT = 420;

export const EXPLORER_SVG_MARGIN = { top: 6, right: 4, bottom: 8, left: 34 } as const;

/** Vertical band between bar bottom and heatmap (month axis labels). */
export const EXPLORER_BAR_HEATMAP_GAP_PX = 24;

export function explorerInnerWidth(): number {
  const m = EXPLORER_SVG_MARGIN;
  return EXPLORER_SVG_BASE_WIDTH - m.left - m.right;
}

export function explorerBarChartHeightPx(): number {
  return Math.max(75, EXPLORER_SVG_LAYOUT_BASELINE_HEIGHT * 0.25);
}

export function explorerHeatmapHeightPx(): number {
  const m = EXPLORER_SVG_MARGIN;
  const inner = explorerInnerWidth();
  const barH = explorerBarChartHeightPx();
  const budget =
    EXPLORER_SVG_LAYOUT_BASELINE_HEIGHT -
    m.top -
    m.bottom -
    barH -
    EXPLORER_BAR_HEATMAP_GAP_PX;
  return Math.min(budget, inner * (3 / 4));
}

export function explorerSvgHeightPx(): number {
  const m = EXPLORER_SVG_MARGIN;
  return Math.round(
    m.top +
      m.bottom +
      explorerBarChartHeightPx() +
      EXPLORER_BAR_HEATMAP_GAP_PX +
      explorerHeatmapHeightPx()
  );
}
