import React, { useEffect, useMemo, useState } from 'react';
import { comfortPercentHeatStyle, utciExposureScenarioIndex } from '../../lib/utciModel';
import type { ChartConfig } from '../../App';
import type { UnitSystem } from '../../App';
import type { GlobalFilterState } from '../GlobalFilterPanel';
import type { EPWDataRow } from '../../lib/epwParser';
import { getTutorialGuideCopy } from '../../lib/tutorialCopy';
import {
  computeExplorerMonthlyByMonth,
  computeTutorialGuideQuickStats,
  computeTutorialUtciQuickStats,
} from '../../lib/tutorialGuideStats';
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
  const { snapshot, requestUtciSelection } = useTutorialLive();
  const [selectedCell, setSelectedCell] = useState<{ periodIndex: number; scenarioIndex: number } | null>(
    null
  );

  const activeScenarioIndex = utciExposureScenarioIndex(
    snapshot.includeSun ?? true,
    snapshot.includeWind ?? true
  );

  useEffect(() => {
    setSelectedCell(prev => {
      if (!prev) return null;
      if (prev.scenarioIndex === activeScenarioIndex) return prev;
      return { ...prev, scenarioIndex: activeScenarioIndex };
    });
  }, [activeScenarioIndex]);

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
      slot.type === 'utci'
        ? []
        : computeTutorialGuideQuickStats({
            chartType: slot.type,
            rows: epwRows,
            filter,
            unitSystem,
            slotVariableId: slot.variable,
            live: snapshot,
          }),
    [slot.type, slot.variable, epwRows, filter, unitSystem, snapshot]
  );

  const utciStats = useMemo(
    () =>
      slot.type === 'utci'
        ? computeTutorialUtciQuickStats({ rows: epwRows, filter, live: snapshot })
        : null,
    [slot.type, epwRows, filter, snapshot]
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
          {slot.type === 'utci'
            ? 'Modeled UTCI from your file, using the same month, hour, and temperature filters as Settings. Sun and wind options match the chart card.'
            : 'From your loaded file, using the same month and hour filters as the chart (if the chart is empty, this still reflects the file).'}
        </p>
        {slot.type === 'utci' ? (
          utciStats ? (
            <div className="flex flex-col gap-4">
              <div
                className={`rounded-lg border px-3 py-2 ${
                  theme === 'dark'
                    ? 'border-green-800/60 bg-green-950/40'
                    : 'border-green-200 bg-green-50'
                }`}
              >
                <p className={`text-[10px] font-semibold uppercase tracking-wide ${muted}`}>Time in comfort</p>
                <p
                  className={`mt-0.5 text-lg font-bold tabular-nums ${
                    theme === 'dark' ? 'text-green-400' : 'text-green-700'
                  }`}
                >
                  {utciStats.comfortPercent.toFixed(1)}%
                </p>
                <p className={`mt-0.5 text-[10px] leading-snug ${muted}`}>
                  No thermal stress · {utciStats.hoursCounted.toLocaleString()} filtered hours
                </p>
              </div>

              <div>
                <h4 className={`mb-1.5 text-[10px] font-semibold uppercase tracking-wide ${muted}`}>
                  UTCI categories (% of filtered hours)
                </h4>
                <ul className="flex flex-col gap-1">
                  {utciStats.categoryShares.map(share => (
                    <li
                      key={share.category}
                      className={`grid grid-cols-[auto_1fr_auto] items-center gap-x-2 rounded px-1 py-0.5 ${
                        share.isComfort
                          ? theme === 'dark'
                            ? 'bg-green-950/50 ring-1 ring-green-800/50'
                            : 'bg-green-50 ring-1 ring-green-200/80'
                          : ''
                      }`}
                    >
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-sm border border-black/10"
                        style={{ backgroundColor: share.color }}
                        aria-hidden
                      />
                      <span
                        className={`min-w-0 text-[11px] leading-snug ${
                          share.isComfort ? 'font-semibold text-green-700 dark:text-green-400' : muted
                        }`}
                      >
                        {share.label}
                      </span>
                      <span
                        className={`shrink-0 text-[11px] font-medium tabular-nums ${
                          share.isComfort ? 'text-green-700 dark:text-green-400' : ink
                        }`}
                      >
                        {share.percentage.toFixed(1)}%
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className={`mb-1.5 text-[10px] font-semibold uppercase tracking-wide ${muted}`}>
                  Time in comfort by period
                </h4>
                <p className={`mb-2 text-[10px] leading-snug ${muted}`}>
                  Click a cell to apply that exposure and highlight the matching time window on the chart. Greener = more
                  comfort time.
                </p>
                <div className="-mx-1 overflow-x-auto px-1">
                  <table className="w-full min-w-[28rem] border-separate border-spacing-0 text-left text-[10px]">
                    <thead>
                      <tr>
                        <th
                          className={`sticky left-0 z-10 pb-1 pr-1.5 font-semibold ${muted} ${
                            theme === 'dark' ? 'bg-gray-800/95' : 'bg-white/95'
                          }`}
                        >
                          Period
                        </th>
                        {utciStats.comfortMatrix.scenarios.map((scenario, si) => {
                          const colActive =
                            selectedCell != null
                              ? selectedCell.scenarioIndex === si
                              : activeScenarioIndex === si;
                          return (
                            <th
                              key={scenario.id}
                              title={scenario.label}
                              className={`max-w-[4.5rem] px-0.5 pb-1 text-center text-[9px] font-semibold leading-tight ${
                                colActive
                                  ? theme === 'dark'
                                    ? 'text-orange-300'
                                    : 'text-orange-700'
                                  : muted
                              }`}
                            >
                              {scenario.shortLabel}
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {utciStats.comfortMatrix.periods.map((period, pi) => {
                        const rowSelected = selectedCell?.periodIndex === pi;
                        return (
                          <tr key={period.id}>
                            <th
                              scope="row"
                              className={`sticky left-0 z-10 max-w-[6.5rem] py-1 pr-1.5 text-left font-medium leading-snug ${
                                theme === 'dark' ? 'bg-gray-800/95' : 'bg-white/95'
                              } ${rowSelected ? (theme === 'dark' ? 'text-orange-300' : 'text-orange-800') : ink}`}
                            >
                              {period.label}
                            </th>
                            {utciStats.comfortMatrix.scenarios.map((scenario, si) => {
                              const cell = utciStats.comfortMatrix.cells[pi][si];
                              const isSelected =
                                selectedCell?.periodIndex === pi && selectedCell.scenarioIndex === si;
                              const heat = comfortPercentHeatStyle(cell.percentComfort, theme);

                              return (
                                <td key={`${period.id}-${scenario.id}`} className="px-0.5 py-0.5">
                                  <button
                                    type="button"
                                    title={`${period.label} · ${scenario.label}`}
                                    aria-pressed={isSelected}
                                    style={heat}
                                    className={`w-full min-w-[2.75rem] rounded-md px-0.5 py-1 text-center text-[10px] font-medium tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-1 ${
                                      isSelected ? 'ring-2 ring-black ring-offset-1' : ''
                                    }`}
                                    onClick={() => {
                                      setSelectedCell({ periodIndex: pi, scenarioIndex: si });
                                      requestUtciSelection({
                                        periodId: period.id,
                                        includeSun: scenario.includeSun,
                                        includeWind: scenario.includeWind,
                                      });
                                    }}
                                  >
                                    {Number.isFinite(cell.percentComfort)
                                      ? `${cell.percentComfort.toFixed(1)}%`
                                      : '—'}
                                  </button>
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <p className={`text-[11px] ${muted}`}>No hours match your current filters.</p>
          )
        ) : (
          <div className="flex flex-col gap-4">
            {statBlocks.map((block, bi) => (
              <div key={bi}>
                {block.heading ? (
                  <h4 className={`mb-1.5 text-[10px] font-semibold uppercase tracking-wide ${muted}`}>
                    {block.heading}
                  </h4>
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
        )}
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
