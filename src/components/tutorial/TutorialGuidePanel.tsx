import React, { useMemo } from 'react';
import type { ChartConfig } from '../../App';
import type { UnitSystem } from '../../App';
import type { GlobalFilterState } from '../GlobalFilterPanel';
import type { EPWDataRow } from '../../lib/epwParser';
import { getTutorialGuideCopy } from '../../lib/tutorialCopy';
import { computeExplorerMonthlyByMonth, computeTutorialGuideQuickStats } from '../../lib/tutorialGuideStats';
import { useTutorialLive } from '../../context/TutorialLiveContext';

export function TutorialGuidePanel({
  theme,
  slot,
  epwRows,
  filter,
  unitSystem,
}: {
  theme: 'light' | 'dark';
  slot: ChartConfig;
  epwRows?: EPWDataRow[];
  filter: GlobalFilterState;
  unitSystem: UnitSystem;
}) {
  const { snapshot } = useTutorialLive();

  const explorerMonthlyByMonth = useMemo(
    () =>
      slot.type === 'explorer'
        ? computeExplorerMonthlyByMonth({
            rows: epwRows,
            filter,
            unitSystem,
            slotVariableId: slot.variable,
            live: snapshot,
          })
        : null,
    [slot.type, slot.variable, epwRows, filter, unitSystem, snapshot]
  );

  const copy = useMemo(() => {
    if (slot.type === 'empty') {
      return {
        chartTitle: 'Choose a chart',
        overviewBody:
          'This guided view keeps one large chart next to plain-language notes. Pick Sun path, Data explorer, UTCI, Wind explorer, or Wind rose from the dashed tile.',
        readingTitle: 'Why one card?',
        readingBody:
          'Focusing on a single chart keeps the story simple: what you are looking at, how to read it, and a few headline numbers from your file with the same month and hour filters you set in Settings.',
      };
    }
    return getTutorialGuideCopy({
      chartType: slot.type,
      slotVariableId: slot.variable,
      slotVariableName: undefined,
      live: snapshot,
    });
  }, [slot.type, slot.variable, snapshot]);

  const statBlocks = useMemo(
    () =>
      computeTutorialGuideQuickStats({
        chartType: slot.type,
        rows: epwRows,
        filter,
        unitSystem,
        slotVariableId: slot.variable,
        live: snapshot,
      }),
    [slot.type, slot.variable, epwRows, filter, unitSystem, snapshot]
  );

  const surface = theme === 'dark' ? 'bg-gray-800/92 shadow-sm' : 'bg-white/95 shadow-sm';
  const ink = theme === 'dark' ? 'text-gray-100' : 'text-gray-900';
  const muted = theme === 'dark' ? 'text-gray-400' : 'text-gray-600';
  const textScale = { fontSize: 'clamp(11px, 1.05vw, 13px)', lineHeight: 1.5 } as const;

  return (
    <aside className={`flex min-h-0 min-w-0 flex-col overflow-y-auto rounded-xl p-3 sm:p-4 ${surface}`}>
      <section className="mb-4">
        <h2 className={`text-sm font-semibold sm:text-base ${ink}`}>{copy.chartTitle}</h2>
        <p className={`mt-2 ${ink}`} style={textScale}>
          {copy.overviewBody}
        </p>
      </section>

      <section className="mt-1 border-t border-gray-200/80 pt-3 dark:border-gray-700/80">
        <h3 className={`mb-2 text-xs font-bold uppercase tracking-wider ${muted}`}>Quick numbers</h3>
        <p className={`mb-3 text-[11px] leading-snug ${muted}`}>
          From your loaded file, using the same month and hour filters as the chart (if the chart is empty, this still reflects the file).
        </p>
        <div className="flex flex-col gap-4">
          {statBlocks.map((block, bi) => (
            <div key={bi}>
              {block.heading ? (
                <h4 className={`mb-1.5 text-[10px] font-semibold uppercase tracking-wide ${muted}`}>{block.heading}</h4>
              ) : null}
              <dl className="grid w-max max-w-full grid-cols-[max-content_max-content] gap-x-2 gap-y-1.5 text-left">
                {block.rows.map((row, ri) => (
                  <React.Fragment key={`${bi}-${ri}`}>
                    <dt className={`text-[11px] ${muted}`}>{row.label}</dt>
                    <dd className={`text-[11px] font-medium tabular-nums ${ink}`}>{row.value}</dd>
                  </React.Fragment>
                ))}
              </dl>
            </div>
          ))}
        </div>
      </section>

      {explorerMonthlyByMonth ? (
        <section className="mt-4 border-t border-gray-200/80 pt-3 dark:border-gray-700/80">
          <h3 className={`mb-1 text-xs font-bold uppercase tracking-wider ${muted}`}>By month</h3>
          <p className={`mb-2 text-[11px] leading-snug ${muted}`}>
            High, average, and low for each calendar month (same filters as the chart). Where the explorer uses mean
            daily min/max for bars, those extents feed high/low here too.
          </p>
          <div className="grid grid-cols-6 gap-x-1 gap-y-2">
            {explorerMonthlyByMonth.slice(0, 6).map(cell => (
              <div key={cell.abbr} className="min-w-0" title={cell.title}>
                <div className="flex min-w-0 items-start justify-center gap-1">
                  <div className={`w-[2rem] shrink-0 text-right text-[10px] font-semibold leading-none ${ink}`}>
                    {cell.abbr}
                  </div>
                  <div className={`min-w-0 text-[8.5px] font-normal tabular-nums leading-[1.15] ${muted}`}>
                    <div>{cell.high}</div>
                    <div>{cell.avg}</div>
                    <div>{cell.low}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-6 gap-x-1 gap-y-2">
            {explorerMonthlyByMonth.slice(6, 12).map(cell => (
              <div key={cell.abbr} className="min-w-0" title={cell.title}>
                <div className="flex min-w-0 items-start justify-center gap-1">
                  <div className={`w-[2rem] shrink-0 text-right text-[10px] font-semibold leading-none ${ink}`}>
                    {cell.abbr}
                  </div>
                  <div className={`min-w-0 text-[8.5px] font-normal tabular-nums leading-[1.15] ${muted}`}>
                    <div>{cell.high}</div>
                    <div>{cell.avg}</div>
                    <div>{cell.low}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </aside>
  );
}
