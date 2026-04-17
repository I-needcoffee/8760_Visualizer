import React, { useMemo, useState } from 'react';
import { Settings2 } from 'lucide-react';
import { EPWVariable, ParsedEPW } from '../lib/epwParser';
import type {
  ChartConfig,
  ChartType,
  CompareChartOpts,
  CompareExplorerSharedControls,
  CompareSunpathSharedControls,
  CompareUtciSharedControls,
  CompareWindSharedControls,
  CompareWindRoseSharedControls,
} from '../App';
import { GRADIENTS } from '../lib/constants';
import { ChartTypeMenu } from './ChartTypeMenu';
import { AggregationToolbar } from './AggregationToolbar';
import { VariableChartSelect } from './VariableChartSelect';

interface ComparisonModeLayoutProps {
  files: ParsedEPW[];
  baselineIndex: number;
  compareIndex: number;
  onBaselineIndex: (i: number) => void;
  onCompareIndex: (i: number) => void;
  exportMode: boolean;
  theme: 'light' | 'dark';
  renderChart: (
    config: ChartConfig,
    primary: ParsedEPW,
    compare: ParsedEPW | undefined,
    showDifference: boolean,
    stacked: boolean,
    opts?: CompareChartOpts
  ) => React.ReactNode;
}

function PillSelect({
  label,
  value,
  onChange,
  options,
  tone,
  theme,
}: {
  label: string;
  value: number;
  onChange: (i: number) => void;
  options: ParsedEPW[];
  /** Baseline = light grey; comparison = near-black (light) / ink (dark). */
  tone: 'baseline' | 'comparison';
  theme: 'light' | 'dark';
}) {
  const base =
    tone === 'baseline'
      ? theme === 'dark'
        ? 'border-gray-600 bg-gray-700/55 text-gray-100'
        : 'border-gray-300 bg-gray-200/90 text-gray-900'
      : theme === 'dark'
        ? 'border-gray-700 bg-gray-950 text-gray-50'
        : 'border-gray-800 bg-gray-950 text-white';

  const caret =
    tone === 'baseline'
      ? theme === 'dark'
        ? 'text-gray-400'
        : 'text-gray-500'
      : theme === 'dark'
        ? 'text-gray-500'
        : 'text-gray-300';

  return (
    <label
      className={`mx-auto flex w-full max-w-[min(100%,280px)] flex-col items-center justify-center gap-0.5 rounded-full border px-2.5 py-1 text-center shadow-sm ${base}`}
    >
      <span
        className={`block w-full text-center text-[7px] font-bold uppercase leading-none tracking-wider ${
          tone === 'baseline'
            ? theme === 'dark'
              ? 'text-gray-400'
              : 'text-gray-600'
            : theme === 'dark'
              ? 'text-gray-400'
              : 'text-gray-300'
        }`}
      >
        {label}
      </span>
      <div className="relative flex w-full min-w-0 items-center justify-center leading-none">
        <select
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          className={`m-0 block h-auto min-h-0 w-full cursor-pointer appearance-none truncate rounded-none border-0 bg-transparent py-0 pl-1 pr-5 text-center text-[10px] font-semibold leading-none outline-none ring-0 focus:ring-0 ${
            tone === 'baseline'
              ? theme === 'dark'
                ? 'text-gray-100'
                : 'text-gray-900'
              : theme === 'dark'
                ? 'text-gray-50'
                : 'text-white'
          }`}
          style={{ lineHeight: 1.15 }}
        >
          {options.map((f, i) => (
            <option key={i} value={i} className="bg-white text-gray-900">
              {f.metadata.city}
              {f.metadata.state ? `, ${f.metadata.state}` : ''}
            </option>
          ))}
        </select>
        <span
          className={`pointer-events-none absolute right-0.5 top-1/2 -translate-y-1/2 text-[8px] leading-none opacity-70 ${caret}`}
          aria-hidden
        >
          ▾
        </span>
      </div>
    </label>
  );
}

function CompareCardShell({
  children,
  theme,
  exportMode,
  className = '',
}: {
  children: React.ReactNode;
  theme: 'light' | 'dark';
  exportMode: boolean;
  className?: string;
}) {
  return (
    <div
      className={`flex min-h-0 flex-col overflow-hidden rounded-2xl border shadow-hard-lg ${className} ${
        exportMode
          ? 'border-gray-200 bg-white'
          : theme === 'dark'
            ? 'border-gray-700 bg-gray-800'
            : 'border-gray-200 bg-white'
      }`}
    >
      {children}
    </div>
  );
}

function groupVariables(variables: ParsedEPW['variables']): Record<string, EPWVariable[]> {
  return variables.reduce<Record<string, EPWVariable[]>>((acc, v) => {
    const cat = v.category || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(v);
    return acc;
  }, {});
}

function PairSharedToolbar({
  theme,
  exportMode,
  children,
}: {
  theme: 'light' | 'dark';
  exportMode: boolean;
  children: React.ReactNode;
}) {
  if (exportMode) return null;
  return (
    <div
      className={`shrink-0 border-b px-2 py-2 ${
        theme === 'dark' ? 'border-gray-700 bg-gray-800/95' : 'border-gray-200 bg-gray-50/90'
      }`}
    >
      {children}
    </div>
  );
}

export function ComparisonModeLayout({
  files,
  baselineIndex,
  compareIndex,
  onBaselineIndex,
  onCompareIndex,
  exportMode,
  theme,
  renderChart,
}: ComparisonModeLayoutProps) {
  const baseline = files[baselineIndex];
  const compare = files[compareIndex];

  const baselineGrouped = useMemo(() => groupVariables(baseline.variables), [baseline.variables]);

  const [expAgg, setExpAgg] = useState<CompareExplorerSharedControls['aggregation']>('month');
  const [expVar, setExpVar] = useState('dryBulbTemperature');
  const [expGrad, setExpGrad] = useState(GRADIENTS[0].id);
  const [expStats, setExpStats] = useState(false);
  const [expSettings, setExpSettings] = useState(false);

  const explorerShared: CompareExplorerSharedControls = {
    aggregation: expAgg,
    setAggregation: setExpAgg,
    colorVar: expVar,
    setColorVar: setExpVar,
    gradientId: expGrad,
    setGradientId: setExpGrad,
    showStats: expStats,
    setShowStats: setExpStats,
    showSettings: expSettings,
    setShowSettings: setExpSettings,
  };

  const [utciAgg, setUtciAgg] = useState<CompareUtciSharedControls['aggregation']>('month');
  const [utciSun, setUtciSun] = useState(true);
  const [utciWind, setUtciWind] = useState(true);
  const [utciColorMode, setUtciColorMode] = useState<CompareUtciSharedControls['colorMode']>('comfortTime');
  const [utciGrad, setUtciGrad] = useState(GRADIENTS[0].id);
  const [utciStats, setUtciStats] = useState(false);
  const [utciSettings, setUtciSettings] = useState(false);

  const utciShared: CompareUtciSharedControls = {
    aggregation: utciAgg,
    setAggregation: setUtciAgg,
    includeSun: utciSun,
    setIncludeSun: setUtciSun,
    includeWind: utciWind,
    setIncludeWind: setUtciWind,
    colorMode: utciColorMode,
    setColorMode: setUtciColorMode,
    gradientId: utciGrad,
    setGradientId: setUtciGrad,
    showStats: utciStats,
    setShowStats: setUtciStats,
    showSettings: utciSettings,
    setShowSettings: setUtciSettings,
  };

  const [windAgg, setWindAgg] = useState<CompareWindSharedControls['aggregation']>('month');
  const [windVar, setWindVar] = useState(
    () => baseline.variables.find(v => v.id === 'windSpeed')?.id || baseline.variables[0]?.id || ''
  );
  const [windGrad, setWindGrad] = useState(GRADIENTS[0].id);
  const [windStats, setWindStats] = useState(false);
  const [windSettings, setWindSettings] = useState(false);

  const windShared: CompareWindSharedControls = {
    aggregation: windAgg,
    setAggregation: setWindAgg,
    colorVar: windVar,
    setColorVar: setWindVar,
    gradientId: windGrad,
    setGradientId: setWindGrad,
    showStats: windStats,
    setShowStats: setWindStats,
    showSettings: windSettings,
    setShowSettings: setWindSettings,
  };

  const [roseVar, setRoseVar] = useState(
    () => baseline.variables.find(v => v.id === 'windSpeed')?.id || baseline.variables[0]?.id || ''
  );
  const [roseGrad, setRoseGrad] = useState(GRADIENTS[0].id);
  const [roseBins, setRoseBins] = useState(16);
  const [roseSettings, setRoseSettings] = useState(false);

  const windRoseShared: CompareWindRoseSharedControls = {
    colorVar: roseVar,
    setColorVar: setRoseVar,
    gradientId: roseGrad,
    setGradientId: setRoseGrad,
    numBins: roseBins,
    setNumBins: setRoseBins,
    showSettings: roseSettings,
    setShowSettings: setRoseSettings,
  };

  const [sunAgg, setSunAgg] = useState<CompareSunpathSharedControls['aggregation']>('week');
  const [sunColorVar, setSunColorVar] = useState(
    () => baseline.variables[0]?.id || ''
  );
  const [sunRadiusVar, setSunRadiusVar] = useState(
    () =>
      baseline.variables.find(v => v.id === 'globalHorizontalRadiation')?.id ||
      baseline.variables[0]?.id ||
      ''
  );
  const [sunGrad, setSunGrad] = useState(GRADIENTS[0].id);
  const [sunRadMin, setSunRadMin] = useState<number | string>(1);
  const [sunRadMax, setSunRadMax] = useState<number | string>(5);
  const [sunStats, setSunStats] = useState(false);
  const [sunSettings, setSunSettings] = useState(false);

  const sunpathShared: CompareSunpathSharedControls = {
    aggregation: sunAgg,
    setAggregation: setSunAgg,
    colorVar: sunColorVar,
    setColorVar: setSunColorVar,
    radiusVar: sunRadiusVar,
    setRadiusVar: setSunRadiusVar,
    gradientId: sunGrad,
    setGradientId: setSunGrad,
    radiusMin: sunRadMin,
    setRadiusMin: setSunRadMin,
    radiusMax: sunRadMax,
    setRadiusMax: setSunRadMax,
    showStats: sunStats,
    setShowStats: setSunStats,
    showSettings: sunSettings,
    setShowSettings: setSunSettings,
  };

  const expColorDef = baseline.variables.find(v => v.id === expVar) || baseline.variables[0];
  const sunColorDef = baseline.variables.find(v => v.id === sunColorVar) || baseline.variables[0];
  const sunRadiusDef = baseline.variables.find(v => v.id === sunRadiusVar) || baseline.variables[0];
  const windColorDef = baseline.variables.find(v => v.id === windVar) || baseline.variables[0];
  const roseColorDef = baseline.variables.find(v => v.id === roseVar) || baseline.variables[0];

  const noopType = (_t: ChartType) => {};

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden lg:flex-row lg:gap-4">
      <aside className="flex w-full min-w-0 shrink-0 flex-col overflow-hidden lg:w-1/2 lg:min-w-0 lg:flex-none">
        <CompareCardShell theme={theme} exportMode={exportMode} className="min-h-0 flex-1">
          {renderChart(
            { id: 'diff-explorer', type: 'explorer' },
            baseline,
            compare,
            true,
            false,
            { diffFillColumn: true }
          )}
        </CompareCardShell>
      </aside>

      <section className="flex min-h-0 min-w-0 w-full flex-1 flex-col gap-3 overflow-y-auto overflow-x-hidden pb-2 pr-0.5 lg:w-1/2 lg:flex-none">
        <div
          className={`sticky top-0 z-10 -mx-0.5 mb-1 grid shrink-0 grid-cols-2 gap-2 px-0.5 pb-1.5 pt-0.5 sm:gap-3 ${
            theme === 'dark' ? 'border-b border-gray-800/50 bg-transparent' : 'border-b border-gray-200/60 bg-transparent'
          }`}
        >
          <div className="flex min-w-0 justify-center">
            <PillSelect
              label="Baseline"
              value={baselineIndex}
              onChange={onBaselineIndex}
              options={files}
              tone="baseline"
              theme={theme}
            />
          </div>
          <div className="flex min-w-0 justify-center">
            <PillSelect
              label="Comparison"
              value={compareIndex}
              onChange={onCompareIndex}
              options={files}
              tone="comparison"
              theme={theme}
            />
          </div>
        </div>
        <CompareCardShell theme={theme} exportMode={exportMode} className="min-h-[280px] sm:min-h-[300px]">
          <PairSharedToolbar theme={theme} exportMode={exportMode}>
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <ChartTypeMenu
                value="sunpath"
                label="Sun Path"
                onChange={noopType}
                theme={theme}
                disabled
                display="icon"
              />
              <span
                className={`text-[10px] font-semibold uppercase tracking-wide ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}
              >
                Sun Path
              </span>
              <VariableChartSelect
                value={sunColorVar}
                onChange={setSunColorVar}
                selectedLabel={sunColorDef.name}
                theme={theme}
              >
                {(Object.entries(baselineGrouped) as [string, EPWVariable[]][]).map(([category, vars]) => (
                  <optgroup key={category} label={category}>
                    {vars.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </VariableChartSelect>
              <VariableChartSelect
                value={sunRadiusVar}
                onChange={setSunRadiusVar}
                selectedLabel={sunRadiusDef.name}
                theme={theme}
              >
                {(Object.entries(baselineGrouped) as [string, EPWVariable[]][]).map(([category, vars]) => (
                  <optgroup key={category} label={category}>
                    {vars.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </VariableChartSelect>
              <div className="min-w-0 flex-1 basis-full sm:basis-[min(100%,280px)]">
                <AggregationToolbar
                  value={sunAgg}
                  onChange={setSunAgg}
                  theme={theme}
                  trailing={
                    <>
                      <button
                        type="button"
                        onClick={() => setSunStats(v => !v)}
                        className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold leading-none transition-colors ${
                          sunStats
                            ? theme === 'dark'
                              ? 'bg-gray-700/90 text-gray-200'
                              : 'bg-gray-100 text-gray-800'
                            : theme === 'dark'
                              ? 'bg-gray-800 text-gray-400 hover:text-gray-200'
                              : 'bg-gray-50 text-gray-500 hover:text-gray-800'
                        }`}
                      >
                        Stats
                      </button>
                      <button
                        type="button"
                        onClick={() => setSunSettings(v => !v)}
                        className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full p-0 transition-colors ${
                          sunSettings
                            ? theme === 'dark'
                              ? 'bg-gray-700/90 text-gray-200'
                              : 'bg-gray-100 text-gray-800'
                            : theme === 'dark'
                              ? 'bg-gray-800 text-gray-400 hover:text-gray-200'
                              : 'bg-gray-50 text-gray-500 hover:text-gray-800'
                        }`}
                        title="Chart settings"
                      >
                        <Settings2 className="h-3 w-3" />
                      </button>
                    </>
                  }
                />
              </div>
            </div>
          </PairSharedToolbar>
          {renderChart(
            { id: 'cmp-sun', type: 'sunpath' },
            baseline,
            compare,
            false,
            true,
            {
              pairComparisonHorizontal: true,
              pairSuppressHeader: true,
              pairModalHost: true,
              sunpathShared,
            }
          )}
        </CompareCardShell>

        <CompareCardShell theme={theme} exportMode={exportMode} className="min-h-[300px]">
          <PairSharedToolbar theme={theme} exportMode={exportMode}>
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <ChartTypeMenu
                value="explorer"
                label="Data Explorer"
                onChange={noopType}
                theme={theme}
                disabled
                display="icon"
              />
              <span
                className={`text-[10px] font-semibold uppercase tracking-wide ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}
              >
                Data Explorer
              </span>
              <VariableChartSelect
                value={expVar}
                onChange={setExpVar}
                selectedLabel={expColorDef.name}
                theme={theme}
              >
                {(Object.entries(baselineGrouped) as [string, EPWVariable[]][]).map(([category, vars]) => (
                  <optgroup key={category} label={category}>
                    {vars.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </VariableChartSelect>
              <div className="min-w-0 flex-1 basis-full sm:basis-[min(100%,280px)]">
                <AggregationToolbar
                  value={expAgg}
                  onChange={setExpAgg}
                  theme={theme}
                  trailing={
                    <>
                      <button
                        type="button"
                        onClick={() => setExpStats(v => !v)}
                        className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold leading-none transition-colors ${
                          expStats
                            ? theme === 'dark'
                              ? 'bg-gray-700/90 text-gray-200'
                              : 'bg-gray-100 text-gray-800'
                            : theme === 'dark'
                              ? 'bg-gray-800 text-gray-400 hover:text-gray-200'
                              : 'bg-gray-50 text-gray-500 hover:text-gray-800'
                        }`}
                      >
                        Stats
                      </button>
                      <button
                        type="button"
                        onClick={() => setExpSettings(v => !v)}
                        className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full p-0 transition-colors ${
                          expSettings
                            ? theme === 'dark'
                              ? 'bg-gray-700/90 text-gray-200'
                              : 'bg-gray-100 text-gray-800'
                            : theme === 'dark'
                              ? 'bg-gray-800 text-gray-400 hover:text-gray-200'
                              : 'bg-gray-50 text-gray-500 hover:text-gray-800'
                        }`}
                        title="Chart settings"
                      >
                        <Settings2 className="h-3 w-3" />
                      </button>
                    </>
                  }
                />
              </div>
            </div>
          </PairSharedToolbar>
          <div className="flex flex-1 min-h-0 flex-col divide-y divide-gray-200 dark:divide-gray-700 md:flex-row md:divide-x md:divide-y-0">
            <div className="min-h-[220px] min-w-0 flex-1 md:min-h-[260px]">
              {renderChart(
                { id: 'cmp-explorer-l', type: 'explorer', variable: 'dryBulbTemperature' },
                baseline,
                undefined,
                false,
                false,
                {
                  comparePane: 'primary',
                  paneCity: baseline.metadata.city,
                  pairSuppressHeader: true,
                  pairModalHost: true,
                  explorerShared,
                }
              )}
            </div>
            <div className="min-h-[220px] min-w-0 flex-1 md:min-h-[260px]">
              {renderChart(
                { id: 'cmp-explorer-r', type: 'explorer', variable: 'dryBulbTemperature' },
                compare,
                undefined,
                false,
                false,
                {
                  comparePane: 'secondary',
                  paneCity: compare.metadata.city,
                  pairSuppressHeader: true,
                  pairModalHost: false,
                  explorerShared,
                }
              )}
            </div>
          </div>
        </CompareCardShell>

        <CompareCardShell theme={theme} exportMode={exportMode} className="min-h-[300px]">
          <PairSharedToolbar theme={theme} exportMode={exportMode}>
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <ChartTypeMenu
                value="utci"
                label="Outdoor Comfort"
                onChange={noopType}
                theme={theme}
                disabled
                display="icon"
              />
              <span
                className={`text-[10px] font-semibold uppercase tracking-wide ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}
              >
                Outdoor Comfort (UTCI)
              </span>
              <div className="min-w-0 flex-1 basis-full sm:basis-[min(100%,320px)]">
                <AggregationToolbar
                  value={utciAgg}
                  onChange={setUtciAgg}
                  theme={theme}
                  trailing={
                    <>
                      <button
                        type="button"
                        onClick={() => setUtciStats(v => !v)}
                        className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold leading-none transition-colors ${
                          utciStats
                            ? theme === 'dark'
                              ? 'bg-blue-900/40 text-blue-400'
                              : 'bg-blue-50 text-blue-600'
                            : theme === 'dark'
                              ? 'bg-gray-800 text-gray-400 hover:text-gray-200'
                              : 'bg-gray-50 text-gray-500 hover:text-gray-800'
                        }`}
                      >
                        Stats
                      </button>
                      <button
                        type="button"
                        onClick={() => setUtciSettings(v => !v)}
                        className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full p-0 transition-colors ${
                          utciSettings
                            ? theme === 'dark'
                              ? 'bg-blue-900/40 text-blue-400'
                              : 'bg-blue-50 text-blue-600'
                            : theme === 'dark'
                              ? 'bg-gray-800 text-gray-400 hover:text-gray-200'
                              : 'bg-gray-50 text-gray-500 hover:text-gray-800'
                        }`}
                        title="Chart settings"
                      >
                        <Settings2 className="h-3 w-3" />
                      </button>
                    </>
                  }
                />
              </div>
            </div>
          </PairSharedToolbar>
          <div className="flex flex-1 min-h-0 flex-col divide-y divide-gray-200 dark:divide-gray-700 md:flex-row md:divide-x md:divide-y-0">
            <div className="min-h-[220px] min-w-0 flex-1 md:min-h-[260px]">
              {renderChart({ id: 'cmp-utci-l', type: 'utci' }, baseline, undefined, false, false, {
                comparePane: 'primary',
                paneCity: baseline.metadata.city,
                pairSuppressHeader: true,
                pairModalHost: true,
                utciShared,
              })}
            </div>
            <div className="min-h-[220px] min-w-0 flex-1 md:min-h-[260px]">
              {renderChart({ id: 'cmp-utci-r', type: 'utci' }, compare, undefined, false, false, {
                comparePane: 'secondary',
                paneCity: compare.metadata.city,
                pairSuppressHeader: true,
                pairModalHost: false,
                utciShared,
              })}
            </div>
          </div>
        </CompareCardShell>

        <CompareCardShell theme={theme} exportMode={exportMode} className="min-h-[300px]">
          <PairSharedToolbar theme={theme} exportMode={exportMode}>
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <ChartTypeMenu
                value="wind"
                label="Wind Explorer"
                onChange={noopType}
                theme={theme}
                disabled
                display="icon"
              />
              <span
                className={`text-[10px] font-semibold uppercase tracking-wide ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}
              >
                Wind Explorer
              </span>
              <VariableChartSelect
                value={windVar}
                onChange={setWindVar}
                selectedLabel={windColorDef.name}
                theme={theme}
              >
                {(Object.entries(baselineGrouped) as [string, EPWVariable[]][]).map(([category, vars]) => (
                  <optgroup key={category} label={category}>
                    {vars.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </VariableChartSelect>
              <div className="min-w-0 flex-1 basis-full sm:basis-[min(100%,280px)]">
                <AggregationToolbar
                  value={windAgg}
                  onChange={setWindAgg}
                  theme={theme}
                  trailing={
                    <>
                      <button
                        type="button"
                        onClick={() => setWindStats(v => !v)}
                        className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold leading-none transition-colors ${
                          windStats
                            ? theme === 'dark'
                              ? 'bg-gray-700/90 text-gray-200'
                              : 'bg-gray-100 text-gray-800'
                            : theme === 'dark'
                              ? 'bg-gray-800 text-gray-400 hover:text-gray-200'
                              : 'bg-gray-50 text-gray-500 hover:text-gray-800'
                        }`}
                      >
                        Stats
                      </button>
                      <button
                        type="button"
                        onClick={() => setWindSettings(v => !v)}
                        className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full p-0 transition-colors ${
                          windSettings
                            ? theme === 'dark'
                              ? 'bg-gray-700/90 text-gray-200'
                              : 'bg-gray-100 text-gray-800'
                            : theme === 'dark'
                              ? 'bg-gray-800 text-gray-400 hover:text-gray-200'
                              : 'bg-gray-50 text-gray-500 hover:text-gray-800'
                        }`}
                        title="Chart settings"
                      >
                        <Settings2 className="h-3 w-3" />
                      </button>
                    </>
                  }
                />
              </div>
            </div>
          </PairSharedToolbar>
          <div className="flex flex-1 min-h-0 flex-col divide-y divide-gray-200 dark:divide-gray-700 md:flex-row md:divide-x md:divide-y-0">
            <div className="min-h-[220px] min-w-0 flex-1 md:min-h-[260px]">
              {renderChart({ id: 'cmp-wind-l', type: 'wind' }, baseline, undefined, false, false, {
                comparePane: 'primary',
                paneCity: baseline.metadata.city,
                pairSuppressHeader: true,
                pairModalHost: true,
                windShared,
              })}
            </div>
            <div className="min-h-[220px] min-w-0 flex-1 md:min-h-[260px]">
              {renderChart({ id: 'cmp-wind-r', type: 'wind' }, compare, undefined, false, false, {
                comparePane: 'secondary',
                paneCity: compare.metadata.city,
                pairSuppressHeader: true,
                pairModalHost: false,
                windShared,
              })}
            </div>
          </div>
        </CompareCardShell>

        <CompareCardShell theme={theme} exportMode={exportMode} className="min-h-[300px]">
          <PairSharedToolbar theme={theme} exportMode={exportMode}>
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <ChartTypeMenu
                value="windrose"
                label="Wind Rose"
                onChange={noopType}
                theme={theme}
                disabled
                display="icon"
              />
              <span
                className={`text-[10px] font-semibold uppercase tracking-wide ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}
              >
                Wind Rose
              </span>
              <VariableChartSelect
                value={roseVar}
                onChange={setRoseVar}
                selectedLabel={roseColorDef.name}
                theme={theme}
              >
                {(Object.entries(baselineGrouped) as [string, EPWVariable[]][]).map(([category, vars]) => (
                  <optgroup key={category} label={category}>
                    {vars.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </VariableChartSelect>
              <label className={`flex items-center gap-1 text-[10px] font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                <span className="whitespace-nowrap">Bins</span>
                <select
                  value={roseBins}
                  onChange={e => setRoseBins(Number(e.target.value))}
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                    theme === 'dark'
                      ? 'border-gray-600 bg-gray-700 text-gray-100'
                      : 'border-gray-200 bg-white text-gray-800'
                  }`}
                >
                  <option value={8}>8</option>
                  <option value={16}>16</option>
                  <option value={36}>36</option>
                  <option value={72}>72</option>
                </select>
              </label>
              <button
                type="button"
                onClick={() => setRoseSettings(v => !v)}
                className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full p-0 transition-colors ${
                  roseSettings
                    ? theme === 'dark'
                      ? 'bg-blue-900/40 text-blue-400'
                      : 'bg-blue-50 text-blue-600'
                    : theme === 'dark'
                      ? 'bg-gray-800 text-gray-400 hover:text-gray-200'
                      : 'bg-gray-50 text-gray-500 hover:text-gray-800'
                }`}
                title="Chart settings"
              >
                <Settings2 className="h-3 w-3" />
              </button>
            </div>
          </PairSharedToolbar>
          <div className="flex flex-1 min-h-0 flex-col divide-y divide-gray-200 dark:divide-gray-700 md:flex-row md:divide-x md:divide-y-0">
            <div className="min-h-[220px] min-w-0 flex-1 md:min-h-[260px]">
              {renderChart({ id: 'cmp-rose-l', type: 'windrose' }, baseline, undefined, false, false, {
                comparePane: 'primary',
                paneCity: baseline.metadata.city,
                pairSuppressHeader: true,
                pairModalHost: true,
                windRoseShared,
              })}
            </div>
            <div className="min-h-[220px] min-w-0 flex-1 md:min-h-[260px]">
              {renderChart({ id: 'cmp-rose-r', type: 'windrose' }, compare, undefined, false, false, {
                comparePane: 'secondary',
                paneCity: compare.metadata.city,
                pairSuppressHeader: true,
                pairModalHost: false,
                windRoseShared,
              })}
            </div>
          </div>
        </CompareCardShell>
      </section>
    </div>
  );
}
