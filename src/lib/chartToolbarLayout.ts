/**
 * Canonical chart card toolbar metrics — compact row (UTCI, Wind Rose, explorers).
 * Sun Path export captions may use a stacked export row when multiple lines are shown.
 */

export const CHART_TOOLBAR_HEADER_PAD = 'px-1.5 py-0';

export const CHART_TOOLBAR_ROW_CLASS =
  'flex h-5 min-h-5 w-full items-center justify-between gap-1 sm:gap-1.5';

/** Export card header: grows with stacked captions (e.g. Sun Path Color + Radius). */
export const CHART_TOOLBAR_EXPORT_ROW_CLASS =
  'flex w-full min-h-5 items-center justify-between gap-1 sm:gap-1.5';

export const CHART_TOOLBAR_EXPORT_STACKED_ROW_CLASS =
  'flex w-full items-start gap-1 sm:gap-1.5';

export const CHART_TOOLBAR_CONTROLS_CLASS =
  'flex h-5 min-h-5 min-w-0 flex-1 items-center gap-1 sm:gap-1.5';

export const CHART_TOOLBAR_ICON_SLOT_CLASS =
  'flex h-4 w-4 shrink-0 items-center justify-center';

export const CHART_TOOLBAR_ICON_GLYPH_CLASS = 'h-3 w-3';

export const CHART_TOOLBAR_TITLE_TEXT_CLASS = 'text-[10px] font-medium leading-none';

export function chartToolbarTitleInk(theme: 'light' | 'dark'): string {
  return theme === 'dark' ? 'text-gray-300' : 'text-gray-600';
}

/** Title slot beside the chart-type icon. */
export function chartToolbarTitleClass(theme: 'light' | 'dark'): string {
  return `flex h-5 min-w-0 flex-1 items-center truncate ${CHART_TOOLBAR_TITLE_TEXT_CLASS} ${chartToolbarTitleInk(theme)}`;
}

/** Sun path Color / Radius triggers — same typography, compact height. */
export function chartToolbarMenuTriggerClass(theme: 'light' | 'dark'): string {
  return `inline-flex h-5 shrink-0 items-center gap-0.5 rounded-md px-0.5 ${CHART_TOOLBAR_TITLE_TEXT_CLASS} ${chartToolbarTitleInk(
    theme
  )} transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-1 dark:focus-visible:ring-gray-500 dark:focus-visible:ring-offset-gray-800 ${
    theme === 'dark'
      ? 'hover:bg-white/5 hover:text-gray-100'
      : 'hover:bg-gray-50 hover:text-gray-900'
  }`;
}
