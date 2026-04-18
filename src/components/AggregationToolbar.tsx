import { useEffect, useRef, useState, type ReactNode } from 'react';

export type AggregationPeriod = 'hour' | 'day' | 'week' | 'month';

const FULL: Record<AggregationPeriod, string> = {
  hour: 'Hour',
  day: 'Day',
  week: 'Week',
  month: 'Month',
};

const SHORT: Record<AggregationPeriod, string> = {
  hour: 'H',
  day: 'D',
  week: 'W',
  month: 'M',
};

export interface AggregationToolbarProps {
  value: AggregationPeriod;
  onChange: (v: AggregationPeriod) => void;
  theme: 'light' | 'dark';
  /** Shown on the same row after aggregation (Stats, settings, etc.) */
  trailing?: ReactNode;
  /** When the toolbar is narrower than this (px), use H/D/W/M labels */
  compactWidthThreshold?: number;
  /** DOM id on the toolbar shell (legacy single target for guided hints). */
  tutorialShellId?: string;
  /**
   * When set, each period button gets `id={`${prefix}-${period}`}` (e.g. tutorial-card-aggregation-hour).
   * Prefer this over `tutorialShellId` so hovers can target individual toggles.
   */
  tutorialPeriodIdPrefix?: string;
}

export function AggregationToolbar({
  value,
  onChange,
  theme,
  trailing,
  compactWidthThreshold = 292,
  tutorialShellId,
  tutorialPeriodIdPrefix,
}: AggregationToolbarProps) {
  const shellRef = useRef<HTMLDivElement>(null);
  const [compact, setCompact] = useState(false);
  const dark = theme === 'dark';

  useEffect(() => {
    const el = shellRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0;
      setCompact(w < compactWidthThreshold);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [compactWidthThreshold]);

  const shellId = tutorialPeriodIdPrefix ? undefined : tutorialShellId;
  return (
    <div
      id={shellId}
      ref={shellRef}
      className="flex flex-nowrap items-center justify-between gap-1 w-full min-w-0"
    >
      <div
        className={`flex flex-nowrap shrink min-w-0 rounded-full p-0.5 gap-0.5 ${
          dark ? 'bg-gray-700' : 'bg-gray-100'
        }`}
      >
        {(['hour', 'day', 'week', 'month'] as const).map((agg) => (
          <button
            key={agg}
            id={tutorialPeriodIdPrefix ? `${tutorialPeriodIdPrefix}-${agg}` : undefined}
            type="button"
            title={FULL[agg]}
            onClick={() => onChange(agg)}
            className={`rounded-full shrink-0 font-semibold capitalize transition-colors whitespace-nowrap leading-none ${
              compact ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-0.5 text-[10px]'
            } ${
              value === agg
                ? dark
                  ? 'bg-gray-600 text-gray-100 shadow-sm'
                  : 'bg-white text-gray-900 shadow-sm'
                : dark
                  ? 'text-gray-400 hover:text-gray-200'
                  : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {compact ? SHORT[agg] : FULL[agg]}
          </button>
        ))}
      </div>
      {trailing ? (
        <div className="flex flex-nowrap items-center gap-0.5 shrink-0">{trailing}</div>
      ) : null}
    </div>
  );
}
