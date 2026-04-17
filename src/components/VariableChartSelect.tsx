import React, { useCallback, useLayoutEffect, useRef, useState } from 'react';

/** Native `<select>` is sized to the widest `<option>`; this sizes the control to the current label (+ caret). */
export function VariableChartSelect({
  value,
  onChange,
  selectedLabel,
  theme,
  variant = 'default',
  children,
}: {
  value: string;
  onChange: (next: string) => void;
  selectedLabel: string;
  theme: 'light' | 'dark';
  /** Greyscale pill + larger type — e.g. compare-mode difference column variable picker. */
  variant?: 'default' | 'pill';
  children: React.ReactNode;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const [widthPx, setWidthPx] = useState<number | null>(null);
  const dark = theme === 'dark';
  const pill = variant === 'pill';
  /** Horizontal space beyond measured label (caret / native chevron + padding). */
  const padExtra = pill ? 34 : 28;
  const minSelectW = pill ? 96 : 56;

  const recalc = useCallback(() => {
    const span = measureRef.current;
    const wrap = wrapRef.current;
    if (!span || !wrap) return;
    const textW = span.getBoundingClientRect().width;
    const desired = Math.ceil(textW + padExtra);
    const row = wrap.parentElement;
    let cap = Number.POSITIVE_INFINITY;
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
      if (raw > 0) cap = raw;
    }
    const next = Math.max(minSelectW, Math.min(desired, cap));
    setWidthPx(Number.isFinite(next) && next > 0 ? next : Math.max(minSelectW, desired));
  }, [selectedLabel, padExtra, minSelectW]);

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

  const selectClass = pill
    ? `min-w-0 max-w-full cursor-pointer truncate rounded-full border px-3 py-1.5 text-left text-xs font-semibold shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-0 ${
        dark
          ? 'border-gray-600 bg-gray-700/90 text-gray-100 hover:bg-gray-700 hover:border-gray-500'
          : 'border-gray-300 bg-gray-100 text-gray-900 hover:bg-gray-200/90 hover:border-gray-400'
      }`
    : `min-w-0 bg-transparent border-none font-medium focus:ring-0 cursor-pointer transition-colors py-0 pl-0 pr-5 text-[10px] truncate ${
        dark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-900'
      }`;

  return (
    <div
      ref={wrapRef}
      className={`relative flex min-w-0 items-center ${
        pill
          ? 'inline-flex max-w-full flex-shrink'
          : 'inline-flex max-w-[min(100%,28rem)] flex-shrink sm:max-w-[min(100%,34rem)]'
      }`}
    >
      <span
        ref={measureRef}
        className={`pointer-events-none absolute left-0 top-0 -z-10 whitespace-nowrap opacity-0 ${measureClass}`}
        aria-hidden
      >
        {selectedLabel}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        title={selectedLabel}
        style={
          widthPx != null
            ? { width: `${widthPx}px`, maxWidth: '100%', minWidth: 0 }
            : { width: 'auto', maxWidth: '100%', minWidth: 0 }
        }
        className={selectClass}
      >
        {children}
      </select>
    </div>
  );
}
