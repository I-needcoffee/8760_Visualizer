import React, { useCallback, useLayoutEffect, useRef, useState } from 'react';

/** Native `<select>` is sized to the widest `<option>`; this sizes the control to the current label (+ caret). */
export function VariableChartSelect({
  value,
  onChange,
  selectedLabel,
  theme,
  children,
}: {
  value: string;
  onChange: (next: string) => void;
  selectedLabel: string;
  theme: 'light' | 'dark';
  children: React.ReactNode;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const [widthPx, setWidthPx] = useState<number | null>(null);
  const dark = theme === 'dark';

  const recalc = useCallback(() => {
    const span = measureRef.current;
    const wrap = wrapRef.current;
    if (!span || !wrap) return;
    const textW = span.getBoundingClientRect().width;
    const cap = wrap.clientWidth;
    const desired = Math.ceil(textW + 22);
    if (cap > 0) {
      setWidthPx(Math.max(36, Math.min(desired, cap)));
    } else {
      setWidthPx(Math.max(36, desired));
    }
  }, [selectedLabel]);

  useLayoutEffect(() => {
    recalc();
  }, [recalc]);

  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const ro = new ResizeObserver(() => recalc());
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [recalc]);

  return (
    <div ref={wrapRef} className="relative min-w-0 flex-1 overflow-hidden flex items-center">
      <span
        ref={measureRef}
        className={`pointer-events-none absolute left-0 top-0 -z-10 opacity-0 whitespace-nowrap text-[10px] font-medium ${
          dark ? 'text-gray-400' : 'text-gray-600'
        }`}
        aria-hidden
      >
        {selectedLabel}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        title={selectedLabel}
        style={widthPx != null ? { width: `${widthPx}px`, maxWidth: '100%' } : { maxWidth: '100%' }}
        className={`min-w-0 bg-transparent border-none font-medium focus:ring-0 cursor-pointer transition-colors py-0 pl-0 pr-0.5 text-[10px] truncate ${
          dark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        {children}
      </select>
    </div>
  );
}
