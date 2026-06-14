import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BarChart3, Download } from 'lucide-react';
import { DataExplorer } from './components/DataExplorer';
import { Upload8760Sidebar } from './components/Upload8760Sidebar';
import { ExportModeToolbar } from './components/ExportModeToolbar';
import type { CompareExplorerSharedControls } from './App';
import { CARTO_LIGHT_ALL_WATER_HEX, GRADIENTS } from './lib/constants';
import { DEFAULT_GLOBAL_FILTER, type HeatmapCellStatistic } from './lib/globalFilter';
import type { GradientDef } from './components/InteractiveLegend';
import {
  inferDefaultGradientId,
  UPLOAD_VALUE_ID,
  type Parsed8760Upload,
} from './lib/parse8760Upload';
import {
  createCellValueFormatter,
  DEFAULT_CELL_FORMAT,
  type CellFormatOptions,
} from './lib/cellFormatPresets';
import { gradientsForVariable } from './lib/availableGradientsForVariable';
import {
  exportDashboardArea,
  type ExportFormat,
  type ExportFrameSize,
} from './lib/exportCapture';

export type UnitSystem = 'metric' | 'imperial';

/** Matches Climate Canvas Details layout: chart 2fr, companion column 3fr. */
const WORKSPACE_GRID =
  'grid h-full min-h-0 w-full max-w-[1440px] grid-cols-1 grid-rows-[minmax(0,2fr)_minmax(0,3fr)] gap-2 overflow-hidden md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:grid-rows-1 md:gap-3';

export function Upload8760App() {
  const [parsed, setParsed] = useState<Parsed8760Upload | null>(null);
  const [customGradients, setCustomGradients] = useState<GradientDef[]>([]);
  const [gradientId, setGradientId] = useState('temperature-comfort');
  const [cellFormat, setCellFormat] = useState<CellFormatOptions>(DEFAULT_CELL_FORMAT);
  const [heatmapCellStatistic, setHeatmapCellStatistic] = useState<HeatmapCellStatistic>('mean');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [heatmapTextColor] = useState('#374151');
  const [exportMode, setExportMode] = useState(false);
  const [exportFrame, setExportFrame] = useState<ExportFrameSize>('hd1080');
  const [exportFormat, setExportFormat] = useState<ExportFormat>('jpeg');
  const [exportBusy, setExportBusy] = useState(false);
  const exportAreaRef = useRef<HTMLDivElement>(null);

  const allGradients = useMemo(() => [...GRADIENTS, ...customGradients], [customGradients]);

  const activeVariable = useMemo(() => {
    if (!parsed) return undefined;
    if (parsed.parseMode === 'epw') {
      return parsed.variables.find(v => v.id === 'dryBulbTemperature') ?? parsed.variables[0];
    }
    return parsed.variables.find(v => v.id === UPLOAD_VALUE_ID) ?? parsed.variables[0];
  }, [parsed]);

  const defaultVariableId = activeVariable?.id ?? UPLOAD_VALUE_ID;

  const [aggregation, setAggregation] = useState<'hour' | 'day' | 'week' | 'month'>('month');
  const [colorVar, setColorVar] = useState(defaultVariableId);

  useEffect(() => {
    setColorVar(defaultVariableId);
  }, [defaultVariableId]);

  const handleParsed = useCallback((data: Parsed8760Upload) => {
    setParsed(data);
    const v =
      data.parseMode === 'epw'
        ? data.variables.find(x => x.id === 'dryBulbTemperature') ?? data.variables[0]
        : data.variables.find(x => x.id === UPLOAD_VALUE_ID) ?? data.variables[0];
    if (v) {
      setGradientId(inferDefaultGradientId(v.name, v.unit, v.min, v.max));
    }
  }, []);

  const overlayValueFormatter = useMemo(
    () => createCellValueFormatter(cellFormat),
    [cellFormat]
  );

  const explorerSharedLive = useMemo(
    (): CompareExplorerSharedControls => ({
      aggregation,
      setAggregation,
      colorVar: parsed?.parseMode === 'epw' ? colorVar : defaultVariableId,
      setColorVar,
      gradientId,
      setGradientId,
      showStats: false,
      setShowStats: () => {},
      showSettings: false,
      setShowSettings: () => {},
      barYDomain: null,
      onBarYExtent: () => {},
    }),
    [aggregation, colorVar, defaultVariableId, gradientId, parsed?.parseMode]
  );

  const handleAddCustomGradient = (gradient: GradientDef) => {
    setCustomGradients(prev => [...prev, gradient]);
  };

  const handleExport = async () => {
    const element = exportAreaRef.current;
    if (!element || exportBusy || !parsed) return;
    const filenameBase =
      activeVariable?.name?.replace(/[^\w\-]+/g, '_').slice(0, 40) ||
      parsed.valueColumnLabel?.replace(/[^\w\-]+/g, '_').slice(0, 40) ||
      '8760-chart';
    setExportBusy(true);
    try {
      await exportDashboardArea({
        element,
        frame: exportFrame,
        format: exportFormat,
        filenameBase,
        filenamePrefix: '8760-chart',
      });
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setExportBusy(false);
    }
  };

  const dark = theme === 'dark';
  const exportActive = exportMode && !!parsed;

  const cardShell = exportActive
    ? 'border-gray-200 bg-white'
    : dark
      ? 'border-gray-700 bg-gray-800'
      : 'border-gray-100 bg-white';

  return (
    <div
      className={`flex h-full min-h-0 w-full flex-col overflow-hidden ${dark ? 'bg-gray-900 text-gray-100' : ''}`}
      style={dark ? undefined : { backgroundColor: CARTO_LIGHT_ALL_WATER_HEX }}
    >
      <header
        className={`z-20 shrink-0 border-b px-2 py-1 ${
          dark ? 'border-gray-800 bg-gray-900/95' : 'border-gray-200/80 bg-white/95'
        }`}
      >
        <div className="flex min-w-0 items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5">
            <BarChart3 className={`h-4 w-4 shrink-0 ${dark ? 'text-sky-400' : 'text-gray-700'}`} />
            <h1 className={`truncate text-xs font-bold sm:text-[13px] ${dark ? 'text-white' : 'text-gray-900'}`}>
              8760 Visualizer
            </h1>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <div
              className={`flex items-center gap-0.5 rounded-full border p-0.5 text-[9px] font-semibold ${
                dark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'
              }`}
            >
              {(['low', 'mean', 'high'] as const).map(stat => (
                <button
                  key={stat}
                  type="button"
                  onClick={() => setHeatmapCellStatistic(stat)}
                  className={`rounded-full px-1.5 py-px capitalize transition-colors ${
                    heatmapCellStatistic === stat
                      ? dark
                        ? 'bg-gray-700 text-white'
                        : 'bg-white text-gray-900 shadow-sm'
                      : dark
                        ? 'text-gray-400 hover:text-gray-200'
                        : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  {stat === 'mean' ? 'Ave' : stat === 'low' ? 'Low' : 'High'}
                </button>
              ))}
            </div>

            {exportActive ? (
              <ExportModeToolbar
                theme={theme}
                frame={exportFrame}
                onFrameChange={setExportFrame}
                format={exportFormat}
                onFormatChange={setExportFormat}
                onExport={handleExport}
                onClose={() => setExportMode(false)}
                exporting={exportBusy}
              />
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setTheme(t => (t === 'dark' ? 'light' : 'dark'))}
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                    dark
                      ? 'border-gray-600 text-gray-300 hover:bg-gray-800'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {dark ? 'Light' : 'Dark'}
                </button>
                <button
                  type="button"
                  data-export-ui
                  disabled={!parsed}
                  onClick={() => setExportMode(true)}
                  className={`inline-flex h-7 w-7 items-center justify-center rounded-full border p-0 transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                    dark
                      ? 'border-gray-600 bg-gray-800 text-gray-300 hover:bg-gray-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-100'
                  }`}
                  title={parsed ? 'Export chart for print / InDesign' : 'Load data to export'}
                >
                  <Download className="h-3.5 w-3.5" />
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex min-h-0 flex-1 justify-start overflow-hidden px-2 py-1.5 sm:px-4 sm:py-2">
        <div className={exportActive ? 'h-full min-h-0 w-full max-w-[720px]' : WORKSPACE_GRID}>
          <div
            ref={exportAreaRef}
            id="chart-export-area"
            className={`flex h-full min-h-0 w-full flex-col overflow-hidden rounded-xl border shadow-hard-lg ${cardShell}`}
          >
            {parsed ? (
              <DataExplorer
                metadata={parsed.metadata}
                data={parsed.data}
                variables={parsed.variables}
                defaultVariableId={defaultVariableId}
                gradients={
                  activeVariable
                    ? gradientsForVariable(activeVariable.id, parsed.variables, allGradients)
                    : allGradients
                }
                filter={DEFAULT_GLOBAL_FILTER}
                heatmapCellStatistic={heatmapCellStatistic}
                barChartFillMode="gradient"
                unitSystem="metric"
                heatmapTextColor={heatmapTextColor}
                theme={exportActive ? 'light' : theme}
                setShowGradientModal={() => {}}
                explorerShared={explorerSharedLive}
                suppressSettingsButton
                overlayValueFormatter={overlayValueFormatter}
                upload8760Mode
                exportMode={exportActive}
              />
            ) : (
              <EmptyChartPlaceholder theme={theme} />
            )}
          </div>

          {!exportActive && (
            <Upload8760Sidebar
              theme={theme}
              parsed={parsed}
              onParsed={handleParsed}
              onClear={() => setParsed(null)}
              gradients={allGradients}
              gradientId={gradientId}
              onGradientIdChange={setGradientId}
              onAddCustomGradient={handleAddCustomGradient}
              cellFormat={cellFormat}
              onCellFormatChange={setCellFormat}
            />
          )}
        </div>
      </main>
    </div>
  );
}

function EmptyChartPlaceholder({ theme }: { theme: 'light' | 'dark' }) {
  const dark = theme === 'dark';
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-6 text-center">
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-xl border ${
          dark ? 'border-gray-600 bg-gray-700/50' : 'border-gray-200 bg-gray-50'
        }`}
      >
        <BarChart3 className="h-5 w-5 text-gray-400" />
      </div>
      <div>
        <p className={`text-xs font-semibold ${dark ? 'text-gray-200' : 'text-gray-800'}`}>No data loaded yet</p>
        <p className={`mt-0.5 max-w-[16rem] text-[10px] leading-snug ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
          Upload or paste 8760 hourly values in the panel beside the chart.
        </p>
      </div>
    </div>
  );
}
