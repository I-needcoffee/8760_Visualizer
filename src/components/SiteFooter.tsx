import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import type { UnitSystem } from '../App';
import type { HeatmapCellStatistic } from '../lib/globalFilter';
import { useIsMobileMaxSm } from '../hooks/useIsMobileMaxSm';

const CLIMATE_CANVAS = 'https://climatecanvas.app';
const PAYPAL_URL = 'https://www.paypal.com/paypalme/coffee4tim';
const VENMO_URL = 'https://account.venmo.com/u/Tim_Meyers';

const SUPPORT_MODAL_LINE_1 =
  'Created with the intent of spreading knowledge and climate resources.';
const SUPPORT_MODAL_LINE_2 =
  'Support for continued development and hosting is greatly appreciated.';

export type SiteFooterExportCaption = {
  place: string;
  filename: string;
};

/**
 * Bottom strip: optional export captions + Created at / Support (pill hidden in export mode).
 */
export function SiteFooter({
  theme,
  exportMode,
  exportCaptions,
  unitSystem,
  onUnitSystemChange,
  heatmapCellStatistic,
  onHeatmapCellStatisticChange,
  dstDisplayEnabled,
  onDstDisplayEnabledChange,
  showHeatmapCellToggle = true,
  exportNotesDst = false,
}: {
  theme: 'light' | 'dark';
  exportMode: boolean;
  exportCaptions?: SiteFooterExportCaption[];
  unitSystem?: UnitSystem;
  onUnitSystemChange?: (u: UnitSystem) => void;
  /** Heatmap cell aggregation: min / mean / max within each cell. */
  heatmapCellStatistic?: HeatmapCellStatistic;
  onHeatmapCellStatisticChange?: (v: HeatmapCellStatistic) => void;
  dstDisplayEnabled?: boolean;
  onDstDisplayEnabledChange?: (v: boolean) => void;
  /** When false, hide Low / Ave / High (no 12×24 heatmaps on the dashboard). */
  showHeatmapCellToggle?: boolean;
  /** Export capture only: note DST in footer when the DST toggle is on. */
  exportNotesDst?: boolean;
}) {
  const [supportOpen, setSupportOpen] = useState(false);
  const isMobile = useIsMobileMaxSm();

  useEffect(() => {
    if (!supportOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSupportOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [supportOpen]);

  useEffect(() => {
    if (supportOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [supportOpen]);

  /** Light: white pill body; dark: low-contrast shell. */
  const pillShell =
    theme === 'dark'
      ? 'border-white/15 bg-gray-950/90 text-gray-300 shadow-hard-sm backdrop-blur-sm'
      : 'border-gray-200/90 bg-white/92 text-gray-700 shadow-hard-sm backdrop-blur-sm';

  /** One scale for all footer footnote & pill labels; weight varies per control (selected = bold). */
  const footnoteText = 'text-[8px] sm:text-[9px] leading-none';
  const footerLinkClass =
    theme === 'dark'
      ? 'font-normal text-gray-300 underline decoration-gray-500/60 underline-offset-2 hover:text-white'
      : 'font-normal text-gray-800 underline decoration-gray-400/60 underline-offset-2 hover:text-gray-950';

  const exportLinkClass =
    'font-medium text-gray-900 underline decoration-gray-400/70 underline-offset-2 hover:text-gray-950';

  const captionPlace =
    exportMode
      ? 'text-[11px] font-medium leading-snug text-gray-900'
      : theme === 'dark'
        ? `${footnoteText} font-normal text-gray-100`
        : `${footnoteText} font-normal text-gray-900`;
  const captionFile =
    exportMode
      ? 'font-mono text-[10px] font-normal leading-snug text-gray-500'
      : theme === 'dark'
        ? `font-mono ${footnoteText} font-normal text-gray-400`
        : `font-mono ${footnoteText} font-normal text-gray-500`;

  const modal =
    supportOpen &&
    createPortal(
      <div
        className="fixed inset-0 z-[240] flex items-center justify-center bg-black/45 p-4 backdrop-blur-[2px]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="support-modal-title"
        onMouseDown={e => {
          if (e.target === e.currentTarget) setSupportOpen(false);
        }}
      >
        <div
          className={`relative w-full max-w-md rounded-2xl border p-4 shadow-hard-xl sm:p-5 ${
            theme === 'dark' ? 'border-gray-600 bg-gray-800 text-gray-100' : 'border-gray-200 bg-white'
          }`}
        >
          <button
            type="button"
            onClick={() => setSupportOpen(false)}
            className={`absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors duration-200 ${
              theme === 'dark' ? 'text-gray-400 hover:bg-gray-700 hover:text-gray-100' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'
            }`}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
          <h2 id="support-modal-title" className="sr-only">
            Support development
          </h2>
          <div
            className={`px-2 pr-12 text-center font-light sm:px-4 ${
              theme === 'dark' ? 'text-gray-200' : 'text-gray-800'
            }`}
          >
            <p className="text-sm leading-relaxed sm:text-base">{SUPPORT_MODAL_LINE_1}</p>
            <p className="mt-3 text-sm leading-relaxed sm:text-base">{SUPPORT_MODAL_LINE_2}</p>
          </div>
          <div className="mt-5 flex flex-col gap-2.5 sm:flex-row sm:gap-3">
            <a
              href={VENMO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex flex-1 items-center justify-center rounded-full border border-gray-200 bg-[#008cff] px-4 py-2.5 text-sm font-bold text-white shadow-hard-sm transition-opacity hover:opacity-92"
            >
              Venmo
            </a>
            <a
              href={PAYPAL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex flex-1 items-center justify-center rounded-full border border-gray-200 bg-[#0070ba] px-4 py-2.5 text-sm font-bold text-white shadow-hard-sm transition-opacity hover:opacity-92"
            >
              PayPal
            </a>
          </div>
        </div>
      </div>,
      document.body
    );

  const showCaptions = Boolean(exportCaptions?.length);

  /** Export: plain attribution link, no pill/support; captions + link vertically centered as a row. */
  if (exportMode) {
    return (
      <>
        <footer
          className={`flex w-full flex-wrap items-center gap-x-4 gap-y-1 ${showCaptions ? 'justify-between' : 'justify-end'}`}
          aria-label="Export caption and attribution"
        >
          {showCaptions ? (
            <div className="flex min-h-5 min-w-0 flex-1 flex-col justify-center gap-0.5 text-left">
              {exportCaptions!.map((row, i) => (
                <div key={`${row.filename}-${i}`} className="flex min-w-0 flex-col gap-0 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-2">
                  <span className={`min-w-0 truncate ${captionPlace}`}>{row.place}</span>
                  <span className={`min-w-0 truncate ${captionFile}`}>{row.filename}</span>
                </div>
              ))}
              {exportNotesDst ? (
                <span className="text-[9px] font-normal leading-none text-gray-500">
                  Clock display: DST adjustment on
                </span>
              ) : null}
            </div>
          ) : exportNotesDst ? (
            <div className="flex min-h-5 min-w-0 flex-1 items-center text-left">
              <span className="text-[9px] font-normal leading-none text-gray-500">
                Clock display: DST adjustment on
              </span>
            </div>
          ) : null}
          <div className="flex min-h-5 shrink-0 items-center whitespace-nowrap text-[11px] leading-none">
            <a
              href={CLIMATE_CANVAS}
              target="_blank"
              rel="noopener noreferrer"
              className={`${exportLinkClass} whitespace-nowrap`}
            >
              Created with ClimateCanvas.app
            </a>
          </div>
        </footer>
      </>
    );
  }

  const showLeftControls = Boolean(
    onUnitSystemChange && unitSystem !== undefined && onDstDisplayEnabledChange && dstDisplayEnabled !== undefined
  );

  const pillH = 'h-6';
  /** Slightly below inner row height (h-5) so the chip sits with equal top/bottom inset. */
  const supportChipH = 'h-4.5';

  /**
   * Metric / Imperial: grey trough; selected = white, unselected = light grey.
   * Dark: selected white cap, unselected mid grey (reads as “unselected” on dark track).
   */
  const unitTrack =
    theme === 'dark'
      ? `inline-flex ${pillH} min-w-0 max-w-[min(100vw-8rem,15rem)] items-stretch rounded-full border border-gray-600 bg-gray-800 p-0.5 shadow-none`
      : `inline-flex ${pillH} min-w-0 max-w-[min(100vw-8rem,15rem)] items-stretch rounded-full border border-gray-200 bg-gray-100 p-0.5 shadow-none`;
  const unitSegBase = `flex min-w-0 flex-1 items-center justify-center rounded-full px-1.5 ${footnoteText} font-normal transition-[color,background-color,box-shadow,font-weight] duration-200 sm:px-2.5`;

  const metricLabel = isMobile ? 'Met' : 'Metric';
  const imperialLabel = isMobile ? 'Imp' : 'Imperial';
  const dstLabel = isMobile ? 'DST' : 'Daylight savings time';

  return (
    <>
      <footer
        className={`flex w-full flex-wrap items-center gap-x-3 gap-y-1 ${showCaptions || showLeftControls ? 'justify-between' : 'justify-end'}`}
        aria-label="Site attribution and display options"
      >
        {showLeftControls ? (
          <div className="pointer-events-auto flex min-w-0 max-w-full flex-wrap items-center gap-2">
            <div className={unitTrack} title="Unit system for numbers in charts" role="group" aria-label="Unit system">
              <button
                type="button"
                onClick={() => onUnitSystemChange?.('metric')}
                aria-label="Metric"
                className={`${unitSegBase} ${
                  unitSystem === 'metric'
                    ? theme === 'dark'
                      ? 'bg-white text-gray-900 shadow-sm font-bold'
                      : 'bg-white text-gray-900 shadow-sm font-bold'
                    : theme === 'dark'
                      ? 'bg-gray-600/80 text-gray-300 hover:text-white'
                      : 'bg-gray-50 text-gray-500 hover:text-gray-800'
                }`}
              >
                {metricLabel}
              </button>
              <button
                type="button"
                onClick={() => onUnitSystemChange?.('imperial')}
                aria-label="Imperial"
                className={`${unitSegBase} ${
                  unitSystem === 'imperial'
                    ? theme === 'dark'
                      ? 'bg-white text-gray-900 shadow-sm font-bold'
                      : 'bg-white text-gray-900 shadow-sm font-bold'
                    : theme === 'dark'
                      ? 'bg-gray-600/80 text-gray-300 hover:text-white'
                      : 'bg-gray-50 text-gray-500 hover:text-gray-800'
                }`}
              >
                {imperialLabel}
              </button>
            </div>
            {showHeatmapCellToggle && onHeatmapCellStatisticChange && heatmapCellStatistic !== undefined ? (
              <div
                className={unitTrack}
                title="Heatmaps: statistic within each colored cell over selected hours."
                role="group"
                aria-label="Heatmap cell statistic"
              >
                <button
                  type="button"
                  onClick={() => onHeatmapCellStatisticChange('low')}
                  aria-label="Heatmap cells show low"
                  className={`${unitSegBase} ${
                    heatmapCellStatistic === 'low'
                      ? theme === 'dark'
                        ? 'bg-white text-gray-900 shadow-sm font-bold'
                        : 'bg-white text-gray-900 shadow-sm font-bold'
                      : theme === 'dark'
                        ? 'bg-gray-600/80 text-gray-300 hover:text-white'
                        : 'bg-gray-50 text-gray-500 hover:text-gray-800'
                  }`}
                >
                  {isMobile ? 'Lo' : 'Low'}
                </button>
                <button
                  type="button"
                  onClick={() => onHeatmapCellStatisticChange('mean')}
                  aria-label="Heatmap cells show average"
                  className={`${unitSegBase} ${
                    heatmapCellStatistic === 'mean'
                      ? theme === 'dark'
                        ? 'bg-white text-gray-900 shadow-sm font-bold'
                        : 'bg-white text-gray-900 shadow-sm font-bold'
                      : theme === 'dark'
                        ? 'bg-gray-600/80 text-gray-300 hover:text-white'
                        : 'bg-gray-50 text-gray-500 hover:text-gray-800'
                  }`}
                >
                  {isMobile ? 'Av' : 'Ave'}
                </button>
                <button
                  type="button"
                  onClick={() => onHeatmapCellStatisticChange('high')}
                  aria-label="Heatmap cells show high"
                  className={`${unitSegBase} ${
                    heatmapCellStatistic === 'high'
                      ? theme === 'dark'
                        ? 'bg-white text-gray-900 shadow-sm font-bold'
                        : 'bg-white text-gray-900 shadow-sm font-bold'
                      : theme === 'dark'
                        ? 'bg-gray-600/80 text-gray-300 hover:text-white'
                        : 'bg-gray-50 text-gray-500 hover:text-gray-800'
                  }`}
                >
                  {isMobile ? 'Hi' : 'High'}
                </button>
              </div>
            ) : null}
            <button
              type="button"
              role="switch"
              aria-checked={dstDisplayEnabled}
              aria-label="Daylight savings time display"
              title="US-style DST display: between 2nd Sunday in March and 1st Sunday in November, shift each hourly row +1h on the civil clock (EPW rows are usually standard offset; underlying sample time is unchanged for sun math). You can use this for any file as an approximation."
              onClick={() => onDstDisplayEnabledChange?.(!dstDisplayEnabled)}
              className={`inline-flex ${pillH} max-w-[min(100vw-6rem,20rem)] min-w-0 items-stretch overflow-hidden rounded-full border p-0 ${pillShell}`}
            >
              <span
                className={`flex min-w-0 flex-1 items-center truncate pl-2 pr-1 text-left ${footnoteText} font-normal sm:pl-2 ${
                  theme === 'dark' ? 'text-gray-200' : 'text-gray-800'
                }`}
              >
                {dstLabel}
              </span>
              <span className="flex shrink-0 items-center justify-center pr-1.5 pl-0.5" aria-hidden>
                <span
                  className={`box-border h-3 w-3 shrink-0 rounded-full border sm:h-3.5 sm:w-3.5 ${
                    dstDisplayEnabled
                      ? 'border-gray-600 bg-gray-600 dark:border-gray-500 dark:bg-gray-500'
                      : theme === 'dark'
                        ? 'border-gray-500 bg-white'
                        : 'border-gray-400 bg-white'
                  }`}
                />
              </span>
            </button>
          </div>
        ) : null}
        {showCaptions ? (
          <div className="min-w-0 flex-1 min-h-6 flex items-center">
            <div className="w-full space-y-0.5 text-left">
            {exportCaptions!.map((row, i) => (
              <div key={`${row.filename}-${i}`} className="flex min-w-0 flex-col gap-0 sm:flex-row sm:flex-wrap sm:items-baseline sm:gap-x-2">
                <span className={`min-w-0 truncate ${captionPlace}`}>{row.place}</span>
                <span className={`min-w-0 truncate ${captionFile}`}>{row.filename}</span>
              </div>
            ))}
            </div>
          </div>
        ) : null}
        <div className="pointer-events-none ml-auto flex h-6 min-w-0 max-w-[min(100vw-1rem,22rem)] items-center self-center leading-none">
          <div
            className={`pointer-events-auto box-border flex h-6 min-w-0 max-w-full items-center overflow-hidden rounded-full border p-0.5 ${pillShell}`}
          >
            <a
              href={CLIMATE_CANVAS}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex h-5 min-h-0 min-w-0 flex-1 items-center truncate rounded-l-full px-2 ${footnoteText} ${footerLinkClass} sm:px-2.5 ${
                theme === 'dark' ? '' : 'bg-white'
              }`}
            >
              Created with ClimateCanvas.app
            </a>
            <div className="flex h-5 shrink-0 items-center justify-center pl-0.5 pr-0.5">
              <button
                type="button"
                onClick={() => setSupportOpen(true)}
                className={`inline-flex ${supportChipH} min-h-0 max-w-full items-center justify-center border-l pl-1.5 pr-2 text-left ${footnoteText} font-normal transition-colors duration-200 sm:pl-1.5 sm:pr-2 ${
                  theme === 'dark'
                    ? 'ml-0.5 rounded-l-full rounded-r-full border-white/10 bg-gray-800/50 text-gray-200 hover:bg-gray-800/70 hover:text-white'
                    : 'ml-0.5 rounded-l-full rounded-r-full border-gray-200/90 bg-gray-100 text-gray-800 shadow-sm hover:bg-gray-200/90'
                }`}
              >
                Support
              </button>
            </div>
          </div>
        </div>
      </footer>
      {modal}
    </>
  );
}
