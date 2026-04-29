import React, { useCallback, useId, useLayoutEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

/** Chevron (12px) + two-space visual gap: total tail after the selected label. */
const CHEVRON_GLYPH_PX = 12;
const CHEVRON_GAP_AFTER_TEXT_PX = 4;

/**
 * Measured width = label + two spaces (gap) + chevron. Chevron is a flex sibling of the native
 * `select` so it stays vertically centered with the 10px control (`h-5`, `leading-none`).
 * Use `fillRow={false}` in tight toolbars so the control is not squeezed by `flex-1 basis-0`.
 *
 * The native `<select>` is positioned as a full-cover overlay (`opacity-[0]` + `appearance-none`).
 * Purely programmatic `HTMLSelectElement#click()` does not reliably open the OS dropdown in Chromium;
 * real clicks on the opaque hit target do.
 */
export function VariableChartSelect({
  value,
  onChange,
  selectedLabel,
  theme,
  children,
  domId,
  fillRow = true,
}: {
  value: string;
  onChange: (next: string) => void;
  selectedLabel: string;
  theme: 'light' | 'dark';
  children: React.ReactNode;
  domId?: string;
  fillRow?: boolean;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const gapMeasureRef = useRef<HTMLSpanElement>(null);
  const uid = useId().replace(/:/g, '');
  const selectId = domId ? `${domId}-select` : `var-chart-select-${uid}`;
  const [widthPx, setWidthPx] = useState<number | null>(null);
  const [isTruncated, setIsTruncated] = useState(false);
  const dark = theme === 'dark';
  const minSelectW = 56;

  const recalc = useCallback(() => {
    const span = measureRef.current;
    const wrap = wrapRef.current;
    if (!span || !wrap) return;
    const textW = span.getBoundingClientRect().width;

    let cap = 0;
    const wrapW = wrap.getBoundingClientRect().width;
    if (wrapW > 4) cap = Math.floor(wrapW);

    let node: HTMLElement | null = wrap.parentElement;
    for (let i = 0; i < 2 && node; i++) {
      const w = Math.floor(node.getBoundingClientRect().width);
      if (w > cap) cap = w;
      node = node.parentElement;
    }

    if (!Number.isFinite(cap) || cap < minSelectW) {
      const row = wrap.parentElement;
      if (row) {
        const rowW = row.getBoundingClientRect().width;
        let usedBySiblings = 0;
        for (const child of Array.from(row.children)) {
          if (child === wrap || !(child instanceof HTMLElement)) continue;
          usedBySiblings += child.getBoundingClientRect().width;
        }
        const gapStyle = getComputedStyle(row).columnGap || getComputedStyle(row).gap;
        const gapPx = Number.parseFloat(String(gapStyle).split(/\s+/)[0]) || 8;
        const gaps = Math.max(0, row.children.length - 1) * gapPx;
        const raw = Math.floor(rowW - usedBySiblings - gaps);
        if (raw > 0) cap = Math.max(cap, raw);
      }
    }

    if (!Number.isFinite(cap) || cap <= 0) cap = Math.max(minSelectW, 200);

    let gapW = 8;
    const g = gapMeasureRef.current;
    if (g) gapW = g.getBoundingClientRect().width;

    const desired = Math.ceil(
      textW + gapW + CHEVRON_GAP_AFTER_TEXT_PX + CHEVRON_GLYPH_PX
    );

    const resolved = Math.max(minSelectW, Math.min(desired, cap));
    const truncated = resolved + 0.5 < desired;
    setIsTruncated(prev => (prev === truncated ? prev : truncated));
    setWidthPx(prev => (prev === resolved ? prev : resolved));
  }, [selectedLabel, minSelectW]);

  useLayoutEffect(() => {
    recalc();
  }, [recalc]);

  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const row = wrap.parentElement;
    const ro = new ResizeObserver(() => recalc());
    ro.observe(wrap);
    if (row) ro.observe(row);
    return () => ro.disconnect();
  }, [recalc]);

  const measureClass = `text-[10px] font-medium leading-none ${dark ? 'text-gray-400' : 'text-gray-600'}`;

  const truncateClass = isTruncated ? 'truncate' : 'whitespace-nowrap';

  const visualClass = `${measureClass} ${truncateClass} min-w-0 flex-1 text-left`;

  const wrapOuter = fillRow
    ? 'relative flex min-w-0 flex-1 basis-0 max-w-full min-h-5 items-center justify-start'
    : 'relative flex min-w-0 flex-1 max-w-full min-h-5 items-center justify-start';

  const hitLayerClass =
    `absolute inset-0 z-[1] box-border cursor-pointer rounded-md appearance-none bg-transparent opacity-0 ` +
    `focus:outline-none focus:ring-0 focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-0 ` +
    `text-[10px] font-medium leading-none`;

  /** Closed control chrome (rounding / hover rim); native select sits opaque on top receiving real clicks. */
  const layeredSurface = dark
    ? 'pointer-events-none relative z-0 flex h-5 w-full min-w-0 max-w-full items-center gap-0 rounded-md px-px border border-transparent hover:border-white/15 hover:bg-white/5'
    : 'pointer-events-none relative z-0 flex h-5 w-full min-w-0 max-w-full items-center gap-0 rounded-md px-px border border-transparent hover:border-gray-200 hover:bg-gray-50/90';

  const selectTitle = `${selectedLabel}`;

  return (
    <div id={domId} ref={wrapRef} className={wrapOuter}>
      <span
        ref={measureRef}
        className={`pointer-events-none absolute left-0 top-0 -z-10 whitespace-nowrap opacity-0 ${measureClass}`}
        aria-hidden
      >
        {selectedLabel}
      </span>
      <span
        ref={gapMeasureRef}
        className={`pointer-events-none absolute left-0 top-0 -z-10 whitespace-pre opacity-0 ${measureClass}`}
        aria-hidden
      >
        {'  '}
      </span>
      <div
        className="relative h-5 shrink-0"
        style={
          widthPx != null
            ? { width: `${widthPx}px`, maxWidth: '100%' }
            : { maxWidth: '100%' }
        }
      >
        {/* Visual label + chevron sit under the opaque select so every click hits the native control. */}
        <div className={`${layeredSurface} ${dark ? 'hover:text-gray-200' : 'hover:text-gray-900'}`}>
          <span className={visualClass}>{selectedLabel}</span>
          <ChevronDown
            className={`h-3 w-3 shrink-0 ${dark ? 'text-gray-500' : 'text-gray-500'}`}
            strokeWidth={2.25}
            aria-hidden
          />
        </div>
        <select
          id={selectId}
          value={value}
          title={selectTitle}
          aria-label={selectTitle}
          onChange={e => onChange(e.target.value)}
          className={hitLayerClass}
        >
          {children}
        </select>
      </div>
    </div>
  );
}
