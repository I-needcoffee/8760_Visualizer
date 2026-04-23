import React, { useEffect, useId, useRef, useState } from 'react';
import { ChartType } from '../App';
import { Sun, BarChart3, ThermometerSun, Wind } from 'lucide-react';
import { WindRoseGlyph } from './WindRoseGlyph';

const LABELS: Record<ChartType, string> = {
  sunpath: 'Sun Path',
  explorer: 'Data Explorer',
  utci: 'UTCI Comfort',
  wind: 'Wind Explorer',
  windrose: 'Wind Rose',
  empty: 'Empty',
};
const ICON: Record<ChartType, React.ComponentType<{ className?: string }>> = {
  sunpath: Sun,
  explorer: BarChart3,
  utci: ThermometerSun,
  wind: Wind,
  windrose: WindRoseGlyph,
  empty: BarChart3,
};

export function ChartTypeMenu({
  value,
  label,
  onChange,
  theme,
  disabled,
  className,
  display = 'label',
  /** Non-interactive icon only (e.g. PDF export); ignores open state and menu. */
  staticIcon = false,
  /** DOM id for guided-layout callouts (toolbar icon row). */
  tutorialAnchorId,
}: {
  value: ChartType;
  label: string;
  onChange: (v: ChartType) => void;
  theme: 'light' | 'dark';
  disabled?: boolean;
  className?: string;
  display?: 'label' | 'icon';
  staticIcon?: boolean;
  tutorialAnchorId?: string;
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const dark = theme === 'dark';

  useEffect(() => {
    if (staticIcon || !open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node | null;
      if (!t) return;
      if (btnRef.current?.contains(t)) return;
      if (menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        btnRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, staticIcon]);

  if (staticIcon) {
    const Icon = ICON[value];
    return (
      <div
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-gray-700 ${className ?? ''}`}
        title={label}
        aria-label={label}
      >
        <Icon className="h-3.5 w-3.5" />
      </div>
    );
  }

  return (
    <div id={tutorialAnchorId} className="relative min-w-0">
      <button
        ref={btnRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        className={
          display === 'icon'
            ? `flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-colors duration-200 ${
                disabled ? 'cursor-default opacity-60' : 'hover:text-gray-900 dark:hover:text-white'
              } ${dark ? 'text-gray-300' : 'text-gray-600'} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-1 dark:focus-visible:ring-gray-500 dark:focus-visible:ring-offset-gray-800 ${className ?? ''}`
            : `inline-flex max-w-full min-w-0 font-semibold uppercase tracking-wide text-[10px] underline-offset-2 transition-colors truncate w-max ${
                disabled ? 'opacity-60 cursor-default' : 'hover:underline'
              } ${dark ? 'text-gray-200' : 'text-gray-800'} ${className ?? ''}`
        }
        title={label}
      >
        {display === 'icon' ? (() => {
          const Icon = ICON[value];
          return <Icon className="h-3.5 w-3.5" />;
        })() : label}
      </button>

      {open && (
        <div
          id={menuId}
          ref={menuRef}
          role="menu"
          className={`absolute left-0 mt-1 z-50 min-w-[168px] rounded-lg border shadow-hard-lg overflow-hidden ${
            dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}
        >
          {(['sunpath', 'explorer', 'utci', 'wind', 'windrose'] as const).map((t) => {
            const active = value === t;
            return (
              <button
                key={t}
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  onChange(t);
                }}
                className={`w-full text-left px-3 py-1.5 text-[12px] font-semibold transition-colors rounded-full ${
                  active
                    ? dark
                      ? 'bg-gray-700 text-white'
                      : 'bg-gray-100 text-gray-900'
                    : dark
                      ? 'text-gray-200 hover:bg-gray-700/60'
                      : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {LABELS[t]}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

