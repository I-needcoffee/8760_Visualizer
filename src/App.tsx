/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { MapSelector } from './components/MapSelector';
import { SunPath } from './components/SunPath';
import { DataExplorer } from './components/DataExplorer';
import { WindExplorer } from './components/WindExplorer';
import { WindRose } from './components/WindRose';
import { UtciExplorer } from './components/UtciExplorer';
import { GlobalFilterState } from './components/GlobalFilterPanel';
import { SettingsModal } from './components/SettingsModal';
import { SummaryStats } from './components/SummaryStats';
import { toPng, toJpeg } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { SingleModeLayout } from './components/SingleModeLayout';
import { ComparisonModeLayout } from './components/ComparisonModeLayout';
import { TutorialLiveProvider } from './context/TutorialLiveContext';
import { TutorialHeaderHints } from './components/tutorial/TutorialHeaderHints';
import { MapPin, ArrowLeft, Plus, Sun, BarChart2, Wind, ThermometerSun, Activity, Settings, X, Compass, BarChart3, Radar, Download, FileJson, FileImage, FileText, CloudLightning, Info, ArrowLeftRight } from 'lucide-react';
import { GRADIENTS } from './lib/constants';
import { TUTORIAL_LEGEND_DOM_ID } from './lib/tutorialCopy';
import { GradientDef } from './components/InteractiveLegend';
import { EPWDataRow, ParsedEPW } from './lib/epwParser';

const SUMMARY_MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

function formatSummaryFilterMonths(f: GlobalFilterState): string {
  const wrap = f.startMonth > f.endMonth;
  return `${SUMMARY_MONTH_LABELS[f.startMonth - 1]} → ${SUMMARY_MONTH_LABELS[f.endMonth - 1]}${
    wrap ? ' (wraps calendar year)' : ''
  }`;
}

function formatSummaryFilterHours(f: GlobalFilterState): string {
  return `${String(f.startHour).padStart(2, '0')}:00 → ${String(f.endHour).padStart(2, '0')}:59`;
}

function formatLocationLine(meta: ParsedEPW['metadata']): string {
  const parts = [meta.city, meta.state, meta.country].filter(Boolean);
  let s = parts.join(', ');
  if (meta.wmo) s += `${s ? ' · ' : ''}WMO ${meta.wmo}`;
  return s || '—';
}

function formatEpwTimestampSpan(data: EPWDataRow[] | undefined): string | null {
  if (!data?.length) return null;
  const a = data[0]?.date;
  const b = data[data.length - 1]?.date;
  if (!(a instanceof Date) || !(b instanceof Date)) return null;
  const opts: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' };
  return `${a.toLocaleDateString(undefined, opts)} — ${b.toLocaleDateString(undefined, opts)}`;
}

/** Toolbar pictograms for single-mode dashboard layouts (stroke-only, rounded rects). */
function LayoutIconHeroLeft({ className }: { className?: string }) {
  /** Shared vertical band so hero column and 3×2 grid share top/bottom edges. */
  const top = 4;
  const bandH = 20;
  const rowH = 9;
  const rowGap = 2;
  const cellW = 6;
  const colGap = 1;
  const gridLeft = 16;
  return (
    <svg className={className} viewBox="0 0 40 28" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <rect x="2" y={top} width="12" height={bandH} rx="2" stroke="currentColor" strokeWidth="1.75" />
      {[0, 1, 2].map(c =>
        [0, 1].map(r => (
          <rect
            key={`${c}-${r}`}
            x={gridLeft + c * (cellW + colGap)}
            y={top + r * (rowH + rowGap)}
            width={cellW}
            height={rowH}
            rx="1"
            stroke="currentColor"
            strokeWidth="1.35"
          />
        ))
      )}
    </svg>
  );
}

function LayoutIconGrid4x2({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 28" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      {[0, 1, 2, 3].map(c =>
        [0, 1].map(r => (
          <rect
            key={`${c}-${r}`}
            x={2 + c * 9.25}
            y={5 + r * 10.5}
            width="7.5"
            height="8"
            rx="1"
            stroke="currentColor"
            strokeWidth="1.35"
          />
        ))
      )}
    </svg>
  );
}

function LayoutIconFocusDeep({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 28" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <rect x="2" y="4" width="17" height="20" rx="2" stroke="currentColor" strokeWidth="1.75" />
      <rect x="21" y="4" width="17" height="20" rx="2" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  );
}

/** Guided single-card layout: large tile with companion text column. */
function LayoutIconTutorial({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 28" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <rect x="2" y="5" width="16" height="18" rx="2" stroke="currentColor" strokeWidth="1.75" />
      <path d="M22 8h14M22 12h14M22 16h10" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
      <path d="M22 20h12" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" opacity="0.55" />
    </svg>
  );
}

export type ChartType = 'sunpath' | 'explorer' | 'wind' | 'windrose' | 'utci' | 'empty';
export type LayoutMode = 'hero-left' | 'grid-4x2' | 'focus-deep' | 'tutorial';

export interface ChartConfig {
  id: string;
  type: ChartType;
  /** When `type` is `explorer`, default EPW column id (e.g. `directNormalRadiation`). */
  variable?: string;
}

export type CompareAggregation = 'hour' | 'day' | 'week' | 'month';

/** Shared explorer controls lifted to compare layout (one header, two panes). */
export interface CompareExplorerSharedControls {
  aggregation: CompareAggregation;
  setAggregation: (v: CompareAggregation) => void;
  colorVar: string;
  setColorVar: (id: string) => void;
  gradientId: string;
  setGradientId: (id: string) => void;
  showStats: boolean;
  setShowStats: (v: boolean) => void;
  showSettings: boolean;
  setShowSettings: (v: boolean) => void;
}

export interface CompareUtciSharedControls {
  aggregation: CompareAggregation;
  setAggregation: (v: CompareAggregation) => void;
  includeSun: boolean;
  setIncludeSun: (v: boolean) => void;
  includeWind: boolean;
  setIncludeWind: (v: boolean) => void;
  colorMode: 'categories' | 'comfortTime' | 'gradient';
  setColorMode: (v: 'categories' | 'comfortTime' | 'gradient') => void;
  gradientId: string;
  setGradientId: (id: string) => void;
  showStats: boolean;
  setShowStats: (v: boolean) => void;
  showSettings: boolean;
  setShowSettings: (v: boolean) => void;
}

export interface CompareWindSharedControls {
  aggregation: CompareAggregation;
  setAggregation: (v: CompareAggregation) => void;
  colorVar: string;
  setColorVar: (id: string) => void;
  gradientId: string;
  setGradientId: (id: string) => void;
  showStats: boolean;
  setShowStats: (v: boolean) => void;
  showSettings: boolean;
  setShowSettings: (v: boolean) => void;
}

export interface CompareWindRoseSharedControls {
  colorVar: string;
  setColorVar: (id: string) => void;
  gradientId: string;
  setGradientId: (id: string) => void;
  numBins: number;
  setNumBins: (n: number) => void;
  showSettings: boolean;
  setShowSettings: (v: boolean) => void;
}

/** Shared sun path controls for compare layout (single card, dual charts). */
export interface CompareSunpathSharedControls {
  aggregation: CompareAggregation;
  setAggregation: (v: CompareAggregation) => void;
  colorVar: string;
  setColorVar: (id: string) => void;
  radiusVar: string;
  setRadiusVar: (id: string) => void;
  gradientId: string;
  setGradientId: (id: string) => void;
  radiusMin: number | string;
  setRadiusMin: (v: number | string) => void;
  radiusMax: number | string;
  setRadiusMax: (v: number | string) => void;
  showStats: boolean;
  setShowStats: (v: boolean) => void;
  showSettings: boolean;
  setShowSettings: (v: boolean) => void;
}

/** Options when rendering charts inside the compare dashboard pair layout. */
export interface CompareChartOpts {
  /** Primary cell shows full chrome; secondary shows a compact orange location bar. */
  comparePane?: 'primary' | 'secondary';
  paneCity?: string;
  /** Sun path: place baseline / comparison charts side by side. */
  pairComparisonHorizontal?: boolean;
  /** Single shared toolbar for a pair row; panes omit their own header. */
  pairSuppressHeader?: boolean;
  /** When headers suppressed, only the host pane mounts stats/settings modals. */
  pairModalHost?: boolean;
  explorerShared?: CompareExplorerSharedControls;
  utciShared?: CompareUtciSharedControls;
  windShared?: CompareWindSharedControls;
  windRoseShared?: CompareWindRoseSharedControls;
  sunpathShared?: CompareSunpathSharedControls;
  /** Difference card: tighter padding / fill column */
  diffFillColumn?: boolean;
}

export type UnitSystem = 'metric' | 'imperial';

export default function App() {
  const [selectedFiles, setSelectedFiles] = useState<ParsedEPW[]>([]);
  const [isSelectingFile, setIsSelectingFile] = useState(false);
  const [viewMode, setViewMode] = useState<'single' | 'comparison'>('single');
  const [showDiffTable, setShowDiffTable] = useState(true);
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [showDifference, setShowDifference] = useState(false);
  const [differenceBaselineIndex, setDifferenceBaselineIndex] = useState(0);
  const [differenceCompareIndex, setDifferenceCompareIndex] = useState(1);
  
  const [customGradients, setCustomGradients] = useState<GradientDef[]>([]);
  const [showGradientModal, setShowGradientModal] = useState(false);
  const [newGradientName, setNewGradientName] = useState('');
  const [newGradientColors, setNewGradientColors] = useState<string[]>(['#ff0000', '#0000ff']);
  const [unitSystem, setUnitSystem] = useState<UnitSystem>('metric');
  const [heatmapTextColor, setHeatmapTextColor] = useState<string>('#000000');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [showSummaryStats, setShowSummaryStats] = useState(false);
  const summaryStatsRef = useRef<HTMLDivElement>(null);
  
  const [globalFilter, setGlobalFilter] = useState<GlobalFilterState>({
    startMonth: 1,
    endMonth: 12,
    startHour: 0,
    endHour: 23
  });

  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [exportMode, setExportModeState] = useState(false);
  const exportModeRef = useRef(exportMode);
  const setExportMode = (val: boolean) => {
    setExportModeState(val);
    exportModeRef.current = val;
    if (val) setReorderMode(false);
  };

  const allGradients = useMemo(() => [...GRADIENTS, ...customGradients], [customGradients]);

  const [layoutMode, setLayoutMode] = useState<LayoutMode>('hero-left');
  const [reorderMode, setReorderMode] = useState(false);
  const [slots, setSlots] = useState<ChartConfig[]>([
    { id: 'sunpath-1', type: 'sunpath' },
    { id: 'explorer-1', type: 'explorer' },
    { id: 'utci-1', type: 'utci' },
    { id: 'wind-1', type: 'wind' },
    { id: 'explorer-2', type: 'explorer', variable: 'directNormalRadiation' },
    { id: 'explorer-3', type: 'explorer', variable: 'relativeHumidity' },
    { id: 'windrose-1', type: 'windrose' }
  ]);
  const handleChangeType = useCallback((id: string, newType: ChartType) => {
    setSlots(prev => prev.map(s => s.id === id ? { ...s, type: newType } : s));
  }, []);

  const handleRemoveChart = useCallback((id: string) => {
    setSlots(prev => {
      const i = prev.findIndex(s => s.id === id);
      if (i === -1) return prev;
      const next = [...prev];
      next[i] = { id: `empty-${Date.now()}`, type: 'empty' };
      return next;
    });
  }, []);

  const swapSlotsByIndex = useCallback((a: number, b: number) => {
    if (a === b) return;
    const max = Math.max(a, b);
    const min = Math.min(a, b);
    if (min < 0) return;
    setSlots(prev => {
      const next = [...prev];
      while (next.length <= max) next.push({ id: `slot-${Date.now()}-${next.length}`, type: 'empty' });
      const tmp = next[a];
      next[a] = next[b];
      next[b] = tmp;
      return next;
    });
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (summaryStatsRef.current && !summaryStatsRef.current.contains(event.target as Node)) {
        setShowSummaryStats(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleAddGradient = () => {
    if (newGradientName && newGradientColors.length >= 2) {
      setCustomGradients(prev => [...prev, {
        id: `custom-${Date.now()}`,
        name: newGradientName,
        colors: newGradientColors
      }]);
      setShowGradientModal(false);
      setNewGradientName('');
      setNewGradientColors(['#ff0000', '#0000ff']);
    }
  };

  const handleSelectEPW = (data: ParsedEPW, compareData?: ParsedEPW) => {
    if (selectedFiles.length === 0 || isSelectingFile) {
      const newFiles = [data];
      if (compareData) newFiles.push(compareData);
      
      if (isSelectingFile) {
        const updatedFiles = [...selectedFiles, ...newFiles];
        setSelectedFiles(updatedFiles);
        setIsSelectingFile(false);
        if (updatedFiles.length > 1) {
          setViewMode('comparison');
          setShowDifference(true);
          setShowDiffTable(true);
        }
      } else {
        setSelectedFiles(newFiles);
        if (newFiles.length === 1) {
          setLayoutMode('tutorial');
        } else if (newFiles.length > 1) {
          setViewMode('comparison');
          setShowDifference(true);
          setShowDiffTable(true);
        }
      }
    }
  };

  const handleExport = async (format: 'pdf' | 'jpeg') => {
    const element = document.getElementById('dashboard-area');
    if (!element) return;

    try {
      const originalOverflow = element.style.overflow;
      element.style.overflow = 'visible';
      
      const options = {
        quality: 0.95,
        backgroundColor: '#ffffff',
        width: element.scrollWidth,
        height: element.scrollHeight,
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left'
        }
      };

      if (format === 'jpeg') {
        const dataUrl = await toJpeg(element, options);
        element.style.overflow = originalOverflow;
        const link = document.createElement('a');
        link.download = `climate-dashboard-${selectedFiles[0]?.metadata.city || 'export'}.jpg`;
        link.href = dataUrl;
        link.click();
      } else {
        const dataUrl = await toPng(element, options);
        element.style.overflow = originalOverflow;
        
        const img = new Image();
        img.src = dataUrl;
        await new Promise(resolve => { img.onload = resolve; });
        
        const pdf = new jsPDF({
          orientation: img.width > img.height ? 'landscape' : 'portrait',
          unit: 'px',
          format: [img.width, img.height]
        });
        pdf.addImage(dataUrl, 'PNG', 0, 0, img.width, img.height);
        pdf.save(`climate-dashboard-${selectedFiles[0]?.metadata.city || 'export'}.pdf`);
      }
    } catch (error) {
      console.error('Export failed:', error);
      element.style.overflow = 'auto';
    }
  };

  const renderChartForFile = (
    chart: ChartConfig,
    fileData: ParsedEPW,
    compareFileData?: ParsedEPW,
    isDiffMode: boolean = false,
    isStacked: boolean = false,
    compareOpts?: CompareChartOpts,
    tutorialLegendDomId?: string,
    tutorialChromeAnchors?: boolean
  ) => {
    const isDiffExplorer = chart.id === 'diff-explorer';
    const onRemoveHandler = isDiffExplorer
      ? () => setShowDiffTable(false)
      : chart.id.startsWith('cmp-')
        ? undefined
        : () => handleRemoveChart(chart.id);
    const onChangeTypeHandler = chart.id.startsWith('cmp-') ? undefined : (t: ChartType) => handleChangeType(chart.id, t);
    const comparePane = compareOpts?.comparePane;
    const paneCity = compareOpts?.paneCity;
    const pairComparisonHorizontal = compareOpts?.pairComparisonHorizontal;
    const pairSuppressHeader = compareOpts?.pairSuppressHeader;
    const pairModalHost = compareOpts?.pairModalHost;
    const explorerShared = compareOpts?.explorerShared;
    const utciShared = compareOpts?.utciShared;
    const windShared = compareOpts?.windShared;
    const windRoseShared = compareOpts?.windRoseShared;
    const sunpathShared = compareOpts?.sunpathShared;
    const diffFillColumn = compareOpts?.diffFillColumn;

    switch (chart.type) {
      case 'sunpath':
        return (
          <SunPath
            metadata={fileData.metadata}
            compareMetadata={compareFileData?.metadata}
            data={fileData.data}
            compareData={compareFileData?.data}
            showDifference={isDiffMode}
            stackedComparison={isStacked}
            pairComparisonHorizontal={pairComparisonHorizontal}
            variables={fileData.variables}
            onRemove={onRemoveHandler}
            onChangeType={onChangeTypeHandler}
            gradients={allGradients}
            filter={globalFilter}
            unitSystem={unitSystem}
            heatmapTextColor={heatmapTextColor}
            theme={theme}
            setShowGradientModal={setShowGradientModal}
            exportMode={exportMode}
            pairSuppressHeader={pairSuppressHeader}
            pairModalHost={pairModalHost}
            sunpathShared={sunpathShared}
            tutorialLegendDomId={tutorialLegendDomId}
            tutorialChromeAnchors={tutorialChromeAnchors}
          />
        );
      case 'explorer':
        return (
          <DataExplorer
            data={fileData.data}
            compareData={compareFileData?.data}
            showDifference={isDiffMode}
            stackedComparison={isStacked}
            variables={fileData.variables}
            defaultVariableId={chart.variable}
            comparePane={comparePane}
            paneCity={paneCity}
            onRemove={onRemoveHandler}
            onChangeType={onChangeTypeHandler}
            gradients={allGradients}
            filter={globalFilter}
            unitSystem={unitSystem}
            heatmapTextColor={heatmapTextColor}
            theme={theme}
            setShowGradientModal={setShowGradientModal}
            exportMode={exportMode}
            pairSuppressHeader={pairSuppressHeader}
            pairModalHost={pairModalHost}
            explorerShared={explorerShared}
            diffFillColumn={diffFillColumn}
            tutorialLegendDomId={tutorialLegendDomId}
            tutorialChromeAnchors={tutorialChromeAnchors}
          />
        );
      case 'wind':
        return (
          <WindExplorer
            data={fileData.data}
            compareData={compareFileData?.data}
            showDifference={isDiffMode}
            stackedComparison={isStacked}
            variables={fileData.variables}
            comparePane={comparePane}
            paneCity={paneCity}
            onRemove={onRemoveHandler}
            onChangeType={onChangeTypeHandler}
            gradients={allGradients}
            filter={globalFilter}
            unitSystem={unitSystem}
            heatmapTextColor={heatmapTextColor}
            theme={theme}
            setShowGradientModal={setShowGradientModal}
            exportMode={exportMode}
            pairSuppressHeader={pairSuppressHeader}
            pairModalHost={pairModalHost}
            windShared={windShared}
            tutorialLegendDomId={tutorialLegendDomId}
            tutorialChromeAnchors={tutorialChromeAnchors}
          />
        );
      case 'windrose':
        return (
          <WindRose
            data={fileData.data}
            compareData={compareFileData?.data}
            showDifference={isDiffMode}
            stackedComparison={isStacked}
            variables={fileData.variables}
            comparePane={comparePane}
            paneCity={paneCity}
            onRemove={onRemoveHandler}
            onChangeType={onChangeTypeHandler}
            gradients={allGradients}
            filter={globalFilter}
            unitSystem={unitSystem}
            heatmapTextColor={heatmapTextColor}
            theme={theme}
            setShowGradientModal={setShowGradientModal}
            exportMode={exportMode}
            pairSuppressHeader={pairSuppressHeader}
            pairModalHost={pairModalHost}
            windRoseShared={windRoseShared}
            tutorialLegendDomId={tutorialLegendDomId}
            tutorialChromeAnchors={tutorialChromeAnchors}
          />
        );
      case 'utci':
        return (
          <UtciExplorer
            data={fileData.data}
            compareData={compareFileData?.data}
            showDifference={isDiffMode}
            stackedComparison={isStacked}
            comparePane={comparePane}
            paneCity={paneCity}
            onRemove={onRemoveHandler}
            onChangeType={onChangeTypeHandler}
            gradients={allGradients}
            filter={globalFilter}
            unitSystem={unitSystem}
            heatmapTextColor={heatmapTextColor}
            theme={theme}
            setShowGradientModal={setShowGradientModal}
            exportMode={exportMode}
            pairSuppressHeader={pairSuppressHeader}
            pairModalHost={pairModalHost}
            utciShared={utciShared}
            tutorialLegendDomId={tutorialLegendDomId}
            tutorialChromeAnchors={tutorialChromeAnchors}
          />
        );
      case 'empty':
        return null;
      default:
        return null;
    }
  };

  if (selectedFiles.length === 0 || isSelectingFile) {
    return (
      <div className="h-screen w-screen overflow-hidden font-sans bg-gray-50 relative">
        {isSelectingFile && selectedFiles.length > 0 && (
          <button 
            onClick={() => setIsSelectingFile(false)}
            className="absolute top-4 right-4 z-[2000] bg-white text-gray-800 px-4 py-2 rounded-full shadow-hard-md hover:bg-gray-50 font-medium flex items-center gap-2"
          >
            <X className="w-4 h-4" /> Cancel Selection
          </button>
        )}
        <MapSelector 
          onSelect={handleSelectEPW} 
          isSelectingCompare={isSelectingFile && selectedFiles.length > 0} 
          initialCenter={selectedFiles.length > 0 ? [selectedFiles[0].metadata.lat, selectedFiles[0].metadata.lng] : undefined}
          initialZoom={selectedFiles.length > 0 ? 10 : undefined}
        />
      </div>
    );
  }

  return (
    <div className={`h-screen w-screen overflow-hidden flex flex-col font-sans transition-colors duration-300 ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}>
      <div id="tutorial-header-dock" className="relative z-20 flex shrink-0 flex-col">
      {/* Top Navigation Bar */}
      <div
        id="tutorial-nav-bar"
        className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b px-2 sm:px-4 py-2 flex items-center justify-between gap-2 shadow-sm transition-colors duration-300`}
      >
        <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
          <button 
            id="tutorial-nav-back"
            onClick={() => {
              setSelectedFiles([]);
              setShowDifference(false);
            }}
            className={`inline-flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-full border border-transparent p-0 shadow-hard-sm transition-colors ${theme === 'dark' ? 'hover:bg-gray-700 text-gray-300 hover:border-gray-600' : 'hover:bg-gray-100 text-gray-600 hover:border-gray-200'}`}
            title="Back to Map"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          
          <div
            id="tutorial-nav-files"
            className="flex items-center gap-1.5 sm:gap-2 min-w-0 overflow-x-auto hide-scrollbar py-1"
          >
            {selectedFiles.map((file, index) => (
              <div 
                key={index} 
                className={`group flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full border transition-all cursor-pointer shrink-0 ${
                  viewMode === 'single' && activeFileIndex === index 
                    ? (theme === 'dark'
                      ? 'bg-gray-600 border-gray-500 text-gray-100 shadow-sm z-10'
                      : 'bg-gray-100 border-gray-300 text-gray-900 shadow-sm z-10')
                    : (theme === 'dark' ? 'bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600' : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100')
                }`}
                onClick={() => {
                  if (viewMode === 'single') {
                    setActiveFileIndex(index);
                  }
                }}
              >
                <MapPin className={`w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0 ${viewMode === 'single' && activeFileIndex === index ? (theme === 'dark' ? 'text-gray-200' : 'text-gray-600') : (theme === 'dark' ? 'text-gray-400' : 'text-gray-500')}`} />
                <span className="text-xs sm:text-sm font-medium truncate max-w-[80px] sm:max-w-[150px]">
                  {file.metadata.city}
                </span>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    const newFiles = selectedFiles.filter((_, i) => i !== index);
                    setSelectedFiles(newFiles);
                    if (newFiles.length <= 1) {
                      setViewMode('single');
                      setShowDifference(false);
                    }
                    if (activeFileIndex >= newFiles.length) {
                      setActiveFileIndex(Math.max(0, newFiles.length - 1));
                    }
                    setDifferenceBaselineIndex(0);
                    setDifferenceCompareIndex(1);
                  }}
                  className={`ml-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-red-500/10 hover:text-red-500 ${viewMode === 'single' && activeFileIndex === index ? (theme === 'dark' ? 'text-gray-300' : 'text-gray-500') : 'text-gray-400'}`}
                  title="Remove file"
                >
                  <X className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                </button>
              </div>
            ))}
            <button
              id="tutorial-nav-add"
              onClick={() => setIsSelectingFile(true)}
              className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full border border-dashed text-xs sm:text-sm font-medium transition-colors shrink-0 ${theme === 'dark' ? 'border-gray-600 text-gray-400 hover:text-gray-200 hover:border-gray-400' : 'border-gray-300 text-gray-500 hover:text-gray-700 hover:border-gray-400'}`}
            >
              <Plus className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> Add
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2 shrink min-w-0">
          {selectedFiles.length > 1 && (
            <div
              id="tutorial-nav-viewmode"
              className={`flex shrink min-w-0 items-center rounded-full border p-0.5 sm:p-1 ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200 shadow-hard-sm'}`}
            >
              <button
                onClick={() => {
                  setViewMode('single');
                  setShowDifference(false);
                }}
                className={`min-w-0 shrink rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wider transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-1 sm:px-3 sm:py-1.5 sm:text-xs ${
                  viewMode === 'single'
                    ? 'bg-gray-300 text-gray-900 shadow-md hover:bg-gray-600 hover:text-white'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                Single
              </button>
              <button
                onClick={() => {
                  setViewMode('comparison');
                  setShowDifference(true);
                }}
                className={`min-w-0 shrink rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wider transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-1 sm:px-3 sm:py-1.5 sm:text-xs ${
                  viewMode === 'comparison'
                    ? 'bg-gray-300 text-gray-900 shadow-md hover:bg-gray-600 hover:text-white'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                Compare
              </button>
            </div>
          )}

          {viewMode === 'single' && (
            <div
              id="tutorial-nav-layouts"
              className={`inline-flex h-9 shrink-0 items-stretch gap-0.5 rounded-full border p-0.5 sm:h-10 ${
                theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-100 shadow-hard-sm'
              }`}
              role="group"
              aria-label="Dashboard layout"
            >
              <button
                type="button"
                onClick={() => setLayoutMode('hero-left')}
                aria-label="Default layout — hero tile with supporting grid"
                title="Default — hero with supporting tiles"
                className={`flex min-w-9 shrink-0 items-center justify-center rounded-full px-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-1 sm:min-w-10 sm:px-2.5 ${
                  layoutMode === 'hero-left'
                    ? theme === 'dark'
                      ? 'bg-gray-600 text-gray-100 shadow-sm'
                      : 'bg-white text-gray-900 shadow-sm'
                    : theme === 'dark'
                      ? 'text-gray-400 hover:bg-gray-700/60 hover:text-gray-200'
                      : 'text-gray-500 hover:bg-white/60 hover:text-gray-800'
                }`}
              >
                <LayoutIconHeroLeft className="h-[18px] w-[26px] sm:h-5 sm:w-7" />
              </button>
              <button
                type="button"
                onClick={() => setLayoutMode('grid-4x2')}
                aria-label="Grid layout — four by two tiles"
                title="Grid — 4×2 tiles"
                className={`flex min-w-9 shrink-0 items-center justify-center rounded-full px-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-1 sm:min-w-10 sm:px-2.5 ${
                  layoutMode === 'grid-4x2'
                    ? theme === 'dark'
                      ? 'bg-gray-600 text-gray-100 shadow-sm'
                      : 'bg-white text-gray-900 shadow-sm'
                    : theme === 'dark'
                      ? 'text-gray-400 hover:bg-gray-700/60 hover:text-gray-200'
                      : 'text-gray-500 hover:bg-white/60 hover:text-gray-800'
                }`}
              >
                <LayoutIconGrid4x2 className="h-[18px] w-[26px] sm:h-5 sm:w-7" />
              </button>
              <button
                type="button"
                onClick={() => setLayoutMode('focus-deep')}
                aria-label="Detail layout — two large tiles"
                title="Detail — two large tiles"
                className={`flex min-w-9 shrink-0 items-center justify-center rounded-full px-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-1 sm:min-w-10 sm:px-2.5 ${
                  layoutMode === 'focus-deep'
                    ? theme === 'dark'
                      ? 'bg-gray-600 text-gray-100 shadow-sm'
                      : 'bg-white text-gray-900 shadow-sm'
                    : theme === 'dark'
                      ? 'text-gray-400 hover:bg-gray-700/60 hover:text-gray-200'
                      : 'text-gray-500 hover:bg-white/60 hover:text-gray-800'
                }`}
              >
                <LayoutIconFocusDeep className="h-[18px] w-[26px] sm:h-5 sm:w-7" />
              </button>
              <button
                type="button"
                onClick={() => setLayoutMode('tutorial')}
                aria-label="Guided layout — one large card with explanations"
                title="Guided — one card + tutorial panel"
                className={`flex min-w-9 shrink-0 items-center justify-center rounded-full px-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-1 sm:min-w-10 sm:px-2.5 ${
                  layoutMode === 'tutorial'
                    ? theme === 'dark'
                      ? 'bg-gray-600 text-gray-100 shadow-sm'
                      : 'bg-white text-gray-900 shadow-sm'
                    : theme === 'dark'
                      ? 'text-gray-400 hover:bg-gray-700/60 hover:text-gray-200'
                      : 'text-gray-500 hover:bg-white/60 hover:text-gray-800'
                }`}
              >
                <LayoutIconTutorial className="h-[18px] w-[26px] sm:h-5 sm:w-7" />
              </button>
            </div>
          )}

          <div className={`h-5 sm:h-6 w-px mx-0.5 sm:mx-1 hidden xs:block shrink-0 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'}`}></div>

          {!exportMode && (
            <button
              id="tutorial-nav-reorder"
              type="button"
              onClick={() => setReorderMode(v => !v)}
              className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border p-0 shadow-hard-sm transition-all active:scale-95 sm:h-10 sm:w-10 ${
                reorderMode
                  ? (theme === 'dark' ? 'bg-blue-900/40 border-blue-900/50 text-blue-300' : 'bg-blue-50 border-blue-200 text-blue-700')
                  : (theme === 'dark' ? 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 border-gray-200 text-gray-700 hover:bg-gray-200')
              }`}
              title="Reorder cards"
            >
              <ArrowLeftRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          )}

          {exportMode ? (
            <div
              role="group"
              aria-label="Export"
              className={`flex shrink-0 items-stretch overflow-hidden rounded-full border shadow-hard-sm ${
                theme === 'dark' ? 'border-red-900/55 bg-gray-900/90' : 'border-red-200 bg-red-50/90'
              }`}
            >
              <span className="hidden sm:flex items-center px-2 border-r text-[10px] font-bold uppercase tracking-wider tabular-nums leading-none max-w-[4.5rem] sm:max-w-none text-center sm:px-2.5 bg-red-100/90 text-red-800 dark:bg-red-950/50 dark:text-red-200 dark:border-red-900/50">
                Export
              </span>
              <button
                type="button"
                onClick={() => handleExport('pdf')}
                className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 bg-red-600 text-white hover:bg-red-700 active:bg-red-800 border-r border-red-700/40 transition-colors"
                title="Export PDF"
              >
                <FileText className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                <span className="hidden md:inline text-[10px] font-semibold uppercase tracking-wide">PDF</span>
              </button>
              <button
                type="button"
                onClick={() => handleExport('jpeg')}
                className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 bg-gray-700 text-white hover:bg-gray-600 active:bg-gray-800 border-r border-gray-600 transition-colors"
                title="Export JPEG"
              >
                <FileImage className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                <span className="hidden md:inline text-[10px] font-semibold uppercase tracking-wide">JPEG</span>
              </button>
              <button
                type="button"
                onClick={() => setExportMode(false)}
                className={`flex items-center justify-center px-2.5 py-1.5 sm:px-3 sm:py-2 transition-colors ${
                  theme === 'dark'
                    ? 'bg-gray-800 text-gray-200 hover:bg-gray-700'
                    : 'bg-white text-gray-800 hover:bg-gray-100'
                }`}
                title="Exit export mode"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          ) : (
            <>
              <div className="relative" id="tutorial-nav-summary" ref={summaryStatsRef}>
                <button
                  type="button"
                  onClick={() => setShowSummaryStats(!showSummaryStats)}
                  className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border p-0 shadow-hard-sm transition-all active:scale-95 sm:h-10 sm:w-10 ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 border-gray-200 text-gray-700 hover:bg-gray-200'}`}
                  title="Overall averages"
                >
                  <Activity className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
                {showSummaryStats && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 sm:p-4" onClick={() => setShowSummaryStats(false)}>
                    <div
                      className={`w-full max-w-[min(96vw,1120px)] max-h-[min(90vh,720px)] overflow-y-auto rounded-xl border p-4 shadow-hard-xl sm:p-5 ${
                        theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
                      }`}
                      onClick={e => e.stopPropagation()}
                    >
                      <div className="mb-4 flex items-start justify-between gap-3">
                        <h3 className={`text-base font-semibold sm:text-lg ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          Overall averages
                        </h3>
                        <button
                          type="button"
                          onClick={() => setShowSummaryStats(false)}
                          className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full p-0 ${theme === 'dark' ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-500 hover:bg-gray-100'}`}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>

                      <div
                        className={`mb-5 space-y-4 rounded-lg border p-3 sm:p-4 ${
                          theme === 'dark' ? 'border-gray-600 bg-gray-900/50' : 'border-gray-200 bg-gray-50'
                        }`}
                      >
                        <div>
                          <div
                            className={`mb-1 text-[10px] font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}
                          >
                            {selectedFiles.length > 1 && showDifference ? 'Baseline location' : 'Location'}
                          </div>
                          <div className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>
                            {formatLocationLine(selectedFiles[0].metadata)}
                          </div>
                          {selectedFiles[0].metadata.source ? (
                            <div
                              className={`mt-1 break-all text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}
                              title={selectedFiles[0].metadata.source}
                            >
                              Source: {selectedFiles[0].metadata.source}
                            </div>
                          ) : null}
                        </div>

                        {selectedFiles.length > 1 && showDifference && selectedFiles[1] ? (
                          <div>
                            <div
                              className={`mb-1 text-[10px] font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-orange-300' : 'text-orange-700'}`}
                            >
                              Comparison location
                            </div>
                            <div className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>
                              {formatLocationLine(selectedFiles[1].metadata)}
                            </div>
                            {selectedFiles[1].metadata.source ? (
                              <div
                                className={`mt-1 break-all text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}
                                title={selectedFiles[1].metadata.source}
                              >
                                Source: {selectedFiles[1].metadata.source}
                              </div>
                            ) : null}
                          </div>
                        ) : null}

                        <div
                          className={`grid gap-4 border-t border-dashed pt-3 sm:grid-cols-2 ${
                            theme === 'dark' ? 'border-gray-600' : 'border-gray-300'
                          }`}
                        >
                          <div>
                            <div
                              className={`mb-1 text-[10px] font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}
                            >
                              Months in filter
                            </div>
                            <div className={`text-sm ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
                              {formatSummaryFilterMonths(globalFilter)}
                            </div>
                          </div>
                          <div>
                            <div
                              className={`mb-1 text-[10px] font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}
                            >
                              Hours of day
                            </div>
                            <div className={`text-sm ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
                              {formatSummaryFilterHours(globalFilter)}
                            </div>
                          </div>
                          {formatEpwTimestampSpan(selectedFiles[0].data) ? (
                            <div className="sm:col-span-2">
                              <div
                                className={`mb-1 text-[10px] font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}
                              >
                                EPW calendar span (file)
                              </div>
                              <div className={`text-sm ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
                                {formatEpwTimestampSpan(selectedFiles[0].data)}
                              </div>
                            </div>
                          ) : null}
                          <div className="sm:col-span-2">
                            <div
                              className={`mb-1 text-[10px] font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}
                            >
                              Dashboard mode
                            </div>
                            <div className={`text-sm ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
                              {viewMode === 'comparison'
                                ? showDifference
                                  ? 'Comparison · averages use baseline with difference overlay where applicable'
                                  : 'Comparison'
                                : 'Single file'}
                              {unitSystem === 'imperial' ? ' · Units: imperial' : ' · Units: metric'}
                            </div>
                          </div>
                        </div>
                      </div>

                      <SummaryStats
                        data={selectedFiles[0].data}
                        compareData={showDifference ? selectedFiles[1]?.data : undefined}
                        showDifference={showDifference}
                        variables={selectedFiles[0].variables}
                        filter={globalFilter}
                        unitSystem={unitSystem}
                        theme={theme}
                      />
                    </div>
                  </div>
                )}
              </div>
              <button
                id="tutorial-nav-export"
                type="button"
                onClick={() => setExportMode(true)}
                className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border p-0 shadow-hard-sm transition-all active:scale-95 sm:h-10 sm:w-10 ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 border-gray-200 text-gray-700 hover:bg-gray-200'}`}
                title="Export layout"
              >
                <Download className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </>
          )}

          <button
            id="tutorial-nav-settings"
            type="button"
            onClick={() => setShowSettingsModal(true)}
            className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border p-0 shadow-hard-sm transition-all active:scale-95 sm:h-10 sm:w-10 ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 border-gray-200 text-gray-700 hover:bg-gray-200'}`}
            title="Global settings"
          >
            <Settings className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 dark:text-gray-300" />
          </button>

        </div>
      </div>

      {viewMode === 'single' && layoutMode === 'tutorial' && !exportMode ? (
        <TutorialHeaderHints theme={theme} showCompareToggle={selectedFiles.length > 1} />
      ) : null}
      </div>

      {/* Gradient Creator Modal */}
      {showGradientModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-2">
          <div className="bg-white rounded-lg shadow-hard-xl max-w-xs sm:max-w-sm w-full p-3 border border-gray-200">
            <h3 className="text-sm font-bold mb-2">Create custom gradient</h3>
            <div className="space-y-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input 
                  type="text" 
                  value={newGradientName}
                  onChange={e => setNewGradientName(e.target.value)}
                  className="w-full rounded-full border border-gray-300 px-3 py-2 text-sm"
                  placeholder="e.g., My Cool Gradient"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Colors</label>
                <div className="space-y-2">
                  {newGradientColors.map((color, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input 
                        type="color" 
                        value={color}
                        onChange={e => {
                          const newColors = [...newGradientColors];
                          newColors[i] = e.target.value;
                          setNewGradientColors(newColors);
                        }}
                        className="h-8 w-8 cursor-pointer rounded-full border-0 p-0"
                      />
                      <input 
                        type="text" 
                        value={color}
                        onChange={e => {
                          const newColors = [...newGradientColors];
                          newColors[i] = e.target.value;
                          setNewGradientColors(newColors);
                        }}
                        className="flex-1 rounded-full border border-gray-300 px-2 py-1 text-sm font-mono"
                      />
                      {newGradientColors.length > 2 && (
                        <button 
                          type="button"
                          onClick={() => setNewGradientColors(prev => prev.filter((_, idx) => idx !== i))}
                          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-red-500 transition-colors hover:bg-red-50 hover:text-red-600"
                          aria-label="Remove color"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button 
                    onClick={() => setNewGradientColors(prev => [...prev, '#ffffff'])}
                    className="text-xs font-bold text-gray-600 hover:text-gray-800 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add Color
                  </button>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-8">
              <button 
                type="button"
                onClick={() => setShowGradientModal(false)}
                className="rounded-full px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-800"
              >
                Cancel
              </button>
              <button 
                onClick={handleAddGradient}
                className="px-6 py-2 bg-gray-800 text-white text-sm font-bold rounded-full shadow-hard-md hover:bg-gray-900 transition-colors"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dashboard Area */}
      <div 
        id="dashboard-area"
        className={`flex-1 min-h-0 flex flex-col relative transition-colors duration-500 ${
          selectedFiles.length >= 2 && viewMode === 'comparison' && !exportMode
            ? 'overflow-hidden'
            : 'overflow-y-auto'
        } ${exportMode ? 'bg-white' : ''}`}
        style={{ backgroundColor: exportMode ? '#ffffff' : (theme === 'dark' ? '#121211' : '#f9f8f6') }}
      >
        <div className={`max-w-[1600px] mx-auto p-2 sm:p-3 lg:p-4 flex-1 min-h-0 flex flex-col w-full ${exportMode ? 'bg-white' : ''}`}>
          {showSettingsModal && (
            <SettingsModal
              isOpen={showSettingsModal}
              onClose={() => setShowSettingsModal(false)}
              filter={globalFilter}
              onChangeFilter={setGlobalFilter}
              theme={theme}
              setTheme={setTheme}
              unitSystem={unitSystem}
              setUnitSystem={setUnitSystem}
              heatmapTextColor={heatmapTextColor}
              setHeatmapTextColor={setHeatmapTextColor}
              setShowGradientModal={setShowGradientModal}
            />
          )}

          {selectedFiles.length >= 2 && viewMode === 'comparison' ? (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <ComparisonModeLayout
                files={selectedFiles}
                baselineIndex={differenceBaselineIndex}
                compareIndex={differenceCompareIndex}
                onBaselineIndex={setDifferenceBaselineIndex}
                onCompareIndex={setDifferenceCompareIndex}
                exportMode={exportMode}
                theme={theme}
                renderChart={(config, baseline, compare, showDiff, stacked, opts) =>
                  renderChartForFile(config, baseline, compare, showDiff, stacked, opts)
                }
              />
            </div>
          ) : (
            <TutorialLiveProvider enabled={layoutMode === 'tutorial'}>
              <SingleModeLayout
                slots={slots}
                layoutMode={layoutMode}
                exportMode={exportMode}
                theme={theme}
                reorderMode={reorderMode}
                tutorialEpwRows={selectedFiles[activeFileIndex]?.data}
                tutorialFilter={globalFilter}
                tutorialUnitSystem={unitSystem}
                renderChart={config => {
                  const tutSlot =
                    viewMode === 'single' &&
                    layoutMode === 'tutorial' &&
                    config.id === slots[0]?.id &&
                    config.type !== 'empty';
                  return renderChartForFile(
                    config,
                    selectedFiles[activeFileIndex],
                    undefined,
                    false,
                    false,
                    undefined,
                    tutSlot ? TUTORIAL_LEGEND_DOM_ID : undefined,
                    tutSlot
                  );
                }}
                onSelectSlotType={(idx, type) => {
                  setSlots(prev => {
                    const next = [...prev];
                    while (next.length <= idx) next.push({ id: `slot-${Date.now()}-${next.length}`, type: 'empty' });
                    next[idx].type = type;
                    return next;
                  });
                }}
                onSwapSlots={swapSlotsByIndex}
              />
            </TutorialLiveProvider>
          )}

          </div>
      </div>
    </div>
  );
}
