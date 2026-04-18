import React, { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

/** Visual width reserved for the custom chevron (12px icon + inset from right edge). */
const CHEVRON_SLOT_PX = 14;

const PILL_PAD_EXTRA = 30;

/**
 * Default variant: `appearance-none`, width = label + (two-space gap) + chevron slot, Lucide chevron (no native overlap).
 * Pill variant: compact bordered control, native sizing math only.
 */
export function VariableChartSelect({
  value,
  onChange,
  selectedLabel,
  theme,
  variant = 'default',
  children,
  domId,
  fillRow = true,
}: {
  value: string;
  onChange: (next: string) => void;
  selectedLabel: string;
  theme: 'light' | 'dark';
  variant?: 'default' | 'pill';
  children: React.ReactNode;
  domId?: string;
  fillRow?: boolean;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const gapMeasureRef = useRef<HTMLSpanElement>(null);
  const [widthPx, setWidthPx] = useState<number | null>(null);
  const [paddingRightPx, setPaddingRightPx] = useState(22);
  const [isTruncated, setIsTruncated] = useState(false);
  const dark = theme === 'dark';
  const pill = variant === 'pill';
  const minSelectW = pill ? 96 : 56;

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

    if (pill) {
      const desired = Math.ceil(textW + PILL_PAD_EXTRA);
      const resolved = Math.max(minSelectW, Math.min(desired, cap));
      const truncated = resolved + 0.5 < desired;
      setIsTruncated(prev => (prev === truncated ? prev : truncated));
      setWidthPx(prev => (prev === resolved ? prev : resolved));
      return;
    }

    let gapW = 8;
    const g = gapMeasureRef.current;
    if (g) gapW = g.getBoundingClientRect().width;

    const padRight = Math.ceil(gapW + CHEVRON_SLOT_PX);
    const desired = Math.ceil(textW + padRight);
    setPaddingRightPx(prev => (prev === padRight ? prev : padRight));

    const resolved = Math.max(minSelectW, Math.min(desired, cap));
    const truncated = resolved + 0.5 < desired;
    setIsTruncated(prev => (prev === truncated ? prev : truncated));
    setWidthPx(prev => (prev === resolved ? prev : resolved));
  }, [selectedLabel, minSelectW, pill]);

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

  const measureClass = pill
    ? `text-xs font-semibold ${dark ? 'text-gray-200' : 'text-gray-800'}`
    : `text-[10px] font-medium ${dark ? 'text-gray-400' : 'text-gray-600'}`;

  const truncateClass = isTruncated ? 'truncate' : 'whitespace-nowrap';

  if (pill) {
    const selectClass = `min-w-0 max-w-full cursor-pointer ${truncateClass} rounded-full border px-3 py-1.5 pr-8 text-left text-xs font-semibold shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-0 ${
      dark
        ? 'border-gray-600 bg-gray-700/90 text-gray-100 hover:bg-gray-700 hover:border-gray-500'
        : 'border-gray-300 bg-gray-100 text-gray-900 hover:bg-gray-200/90 hover:border-gray-400'
    }`;
    const wrapClass = `relative inline-flex min-w-0 max-w-full flex-shrink items-center ${fillRow ? 'flex-1' : ''}`;
    return (
      <div id={domId} ref={wrapRef} className={wrapClass}>
        <span
          ref={measureRef}
          className={`pointer-events-none absolute left-0 top-0 -z-10 whitespace-nowrap opacity-0 ${measureClass}`}
          aria-hidden
        >
          {selectedLabel}
        </span>
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          title={selectedLabel}
          style={
            widthPx != null
              ? { width: `${widthPx}px`, maxWidth: '100%', minWidth: 0, boxSizing: 'border-box' }
              : { width: 'auto', maxWidth: '100%', minWidth: 0, boxSizing: 'border-box' }
          }
          className={`${selectClass} cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-0`}
        >
          {children}
        </select>
      </div>
    );
  }

  const selectClass = `box-border min-w-0 max-w-full cursor-pointer appearance-none border-none bg-transparent py-0 pl-0 text-left text-[10px] font-medium leading-snug focus:outline-none focus:ring-0 focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-0 ${truncateClass} ${
    dark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-900'
  }`;

  const wrapOuter = fillRow
    ? 'relative flex min-w-0 flex-1 basis-0 max-w-full items-center justify-start'
    : 'relative inline-flex max-w-full items-center';

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
      <div className="relative inline-flex max-w-full shrink-0 items-center">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          title={selectedLabel}
          style={
            widthPx != null
              ? {
                  width: `${widthPx}px`,
                  maxWidth: '100%',
                  minWidth: 0,
                  boxSizing: 'border-box',
                  paddingRight: paddingRightPx,
                  paddingLeft: 0,
                }
              : {
                  width: 'auto',
                  maxWidth: '100%',
                  minWidth: 0,
                  boxSizing: 'border-box',
                  paddingRight: paddingRightPx,
                  paddingLeft: 0,
                }
          }
          className={selectClass}
        >
          {children}
        </select>
        <ChevronDown
          className={`pointer-events-none absolute right-0.5 top-1/2 h-3 w-3 -translate-y-1/2 shrink-0 ${
            dark ? 'text-gray-500' : 'text-gray-500'
          }`}
          strokeWidth={2.25}
          aria-hidden
        />
      </div>
    </div>
  );
}
