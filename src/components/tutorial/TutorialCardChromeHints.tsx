import type { RefObject } from 'react';
import { useEffect, useMemo, useState } from 'react';
import type { ChartType } from '../../App';
import { useTutorialLive } from '../../context/TutorialLiveContext';
import { getTutorialLegendHoverDef } from '../../lib/tutorialCopy';
import type { HoverHintDef } from './TutorialHoverPopover';
import { TutorialHoverPopoverLayer } from './TutorialHoverPopover';

const AGG_PREFIX = 'tutorial-card-aggregation';

const PERIOD_HINTS: HoverHintDef[] = [
  {
    id: `${AGG_PREFIX}-hour`,
    title: 'Hour',
    body: 'Each plotted point is one EPW timestep when the sun is above the horizon — full temporal detail.',
  },
  {
    id: `${AGG_PREFIX}-day`,
    title: 'Day',
    body: 'Groups timesteps by calendar day, then averages within each hour-of-day for that day.',
  },
  {
    id: `${AGG_PREFIX}-week`,
    title: 'Week',
    body: 'Buckets timesteps by week of the year, then averages within each hour-of-day inside that week.',
  },
  {
    id: `${AGG_PREFIX}-month`,
    title: 'Month',
    body: 'Buckets timesteps by calendar month, then averages within each hour-of-day inside that month.',
  },
];

const STATS_SETTINGS_HINTS: HoverHintDef[] = [
  {
    id: 'tutorial-card-stats',
    title: 'Stats',
    body: 'Opens a summary panel with min, max, average, and counts for the filtered period (and difference stats when comparing files).',
  },
  {
    id: 'tutorial-card-settings',
    title: 'Chart settings',
    body: 'Change color ramp, radius mapping, filters, and other options specific to this chart.',
  },
];

export function TutorialCardChromeHints({
  theme,
  chartType,
  measureRootRef,
}: {
  theme: 'light' | 'dark';
  chartType: ChartType;
  measureRootRef: RefObject<HTMLDivElement | null>;
}) {
  const { snapshot } = useTutorialLive();
  const [rebindTick, setRebindTick] = useState(0);

  useEffect(() => {
    const root = measureRootRef.current;
    if (!root) return;
    let t: ReturnType<typeof setTimeout> | null = null;
    const ro = new ResizeObserver(() => {
      if (t) clearTimeout(t);
      t = setTimeout(() => setRebindTick(n => n + 1), 80);
    });
    ro.observe(root);
    return () => {
      ro.disconnect();
      if (t) clearTimeout(t);
    };
  }, [measureRootRef, chartType]);

  const defs: HoverHintDef[] = useMemo(() => {
    const dataBody =
      chartType === 'windrose'
        ? 'This chart summarizes wind direction; open the gear for bins, filters, and color settings.'
        : chartType === 'sunpath'
          ? 'Use Color in the header for dot color. When the card is wide, Radius sits beside it; otherwise set radius mapping in Settings (gear).'
          : chartType === 'utci'
            ? 'This slot shows outdoor UTCI comfort; visualization mode and inputs are in Settings (gear).'
            : 'Open the dropdown to pick which EPW column drives bar height and heatmap color.';

    return [
      { id: 'tutorial-card-chart-type', title: 'Chart type', body: 'Switch between Sun path, Data explorer, UTCI, Wind explorer, and Wind rose.' },
      { id: 'tutorial-card-data-control', title: 'Data / variable', body: dataBody },
      ...(chartType === 'sunpath'
        ? [
            {
              id: 'tutorial-card-sunpath-radius',
              title: 'Radius',
              body: 'Chooses which EPW column scales dot distance from the sun center; min/max mapping stays in Settings (gear).',
            } as HoverHintDef,
          ]
        : []),
    ];
  }, [chartType]);

  const allDefs: HoverHintDef[] = useMemo(() => {
    const withPeriod = [...defs, ...PERIOD_HINTS];
    const base =
      chartType === 'windrose'
        ? [...defs, STATS_SETTINGS_HINTS[1]]
        : [...withPeriod, ...STATS_SETTINGS_HINTS];
    const legend = getTutorialLegendHoverDef(chartType, snapshot);
    return legend ? [...base, legend] : base;
  }, [defs, chartType, snapshot]);

  return <TutorialHoverPopoverLayer defs={allDefs} theme={theme} zIndex={90} rebindKey={`${chartType}-${rebindTick}`} />;
}
