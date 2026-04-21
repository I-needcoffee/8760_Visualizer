import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

const COLORFUL_CLIMATE = 'https://colorfulclimate.com';
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
}: {
  theme: 'light' | 'dark';
  exportMode: boolean;
  exportCaptions?: SiteFooterExportCaption[];
}) {
  const [supportOpen, setSupportOpen] = useState(false);

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

  const pillShell =
    theme === 'dark'
      ? 'border-white/15 bg-gray-950/90 text-gray-300 shadow-hard-sm backdrop-blur-sm'
      : 'border-gray-200/90 bg-white/92 text-gray-700 shadow-hard-sm backdrop-blur-sm';

  const linkClassNormal =
    theme === 'dark'
      ? 'font-medium text-gray-300 underline decoration-gray-500/60 underline-offset-2 hover:text-white'
      : 'font-medium text-gray-800 underline decoration-gray-400/60 underline-offset-2 hover:text-gray-950';

  const exportLinkClass =
    'font-medium text-gray-900 underline decoration-gray-400/70 underline-offset-2 hover:text-gray-950';

  const supportBtn =
    'shrink-0 rounded-full bg-gray-100 px-2.5 py-0.5 text-[10px] font-semibold text-gray-700 shadow-[inset_0_0_0_1px_rgba(229,231,235,0.95)] transition-colors hover:bg-gray-200 sm:text-[11px]';

  const captionPlace =
    exportMode ? 'text-[11px] font-medium leading-snug text-gray-900' : theme === 'dark' ? 'text-[11px] font-medium leading-snug text-gray-100' : 'text-[11px] font-medium leading-snug text-gray-900';
  const captionFile =
    exportMode ? 'font-mono text-[10px] font-normal leading-snug text-gray-500' : theme === 'dark' ? 'font-mono text-[10px] font-normal leading-snug text-gray-400' : 'font-mono text-[10px] font-normal leading-snug text-gray-500';

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
        <div className="relative w-full max-w-md rounded-2xl border border-gray-200 bg-white p-4 shadow-hard-xl sm:p-5">
          <button
            type="button"
            onClick={() => setSupportOpen(false)}
            className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
          <h2 id="support-modal-title" className="sr-only">
            Support development
          </h2>
          <div className="px-2 pr-12 text-center font-light text-gray-800 sm:px-4">
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
          className={`flex w-full flex-wrap items-center gap-x-6 gap-y-2 ${showCaptions ? 'justify-between' : 'justify-end'}`}
          aria-label="Export caption and attribution"
        >
          {showCaptions ? (
            <div className="flex min-h-[2.25rem] min-w-0 flex-1 flex-col justify-center space-y-0.5 text-left">
              {exportCaptions!.map((row, i) => (
                <div key={`${row.filename}-${i}`} className="flex min-w-0 flex-col gap-0 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-2">
                  <span className={`min-w-0 truncate ${captionPlace}`}>{row.place}</span>
                  <span className={`min-w-0 truncate ${captionFile}`}>{row.filename}</span>
                </div>
              ))}
            </div>
          ) : null}
          <div className="flex min-h-[2.25rem] shrink-0 items-center text-[11px] leading-snug">
            <a href={COLORFUL_CLIMATE} target="_blank" rel="noopener noreferrer" className={exportLinkClass}>
              Created at ColorfulClimate.com
            </a>
          </div>
        </footer>
      </>
    );
  }

  return (
    <>
      <footer
        className={`flex w-full flex-wrap items-end justify-end gap-x-4 gap-y-2 ${showCaptions ? 'sm:justify-between' : ''}`}
        aria-label="Site attribution"
      >
        {showCaptions ? (
          <div className="min-w-0 flex-1 space-y-0.5 text-left">
            {exportCaptions!.map((row, i) => (
              <div key={`${row.filename}-${i}`} className="flex min-w-0 flex-col gap-0 sm:flex-row sm:flex-wrap sm:items-baseline sm:gap-x-2">
                <span className={`min-w-0 truncate ${captionPlace}`}>{row.place}</span>
                <span className={`min-w-0 truncate ${captionFile}`}>{row.filename}</span>
              </div>
            ))}
          </div>
        ) : null}
        <div className="pointer-events-none ml-auto shrink-0 max-w-[min(100vw-1rem,22rem)] text-[10px] leading-snug sm:text-[11px]">
          <div
            className={`pointer-events-auto flex flex-wrap items-center gap-x-2 gap-y-1 rounded-full border px-2.5 py-1 sm:px-3 ${pillShell}`}
          >
            <a href={COLORFUL_CLIMATE} target="_blank" rel="noopener noreferrer" className={`min-w-0 ${linkClassNormal}`}>
              Created at ColorfulClimate.com
            </a>
            <span className="text-gray-400 select-none" aria-hidden>
              ·
            </span>
            <button type="button" onClick={() => setSupportOpen(true)} className={supportBtn}>
              Support
            </button>
          </div>
        </div>
      </footer>
      {modal}
    </>
  );
}
