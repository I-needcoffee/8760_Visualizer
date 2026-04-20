/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { MapSelector } from './components/MapSelector';
import { SunPath } from './components/SunPath';
import { DataExplorer } from './components/DataExplorer';
import { WindExplorer } from './components/WindExplorer';
import { WindRose } from './components/WindRose';
import { UtciExplorer } from './components/UtciExplorer';
import { GlobalFilterState } from './components/GlobalFilterPanel';
import { SettingsModal } from './components/SettingsModal';
import { toPng, toJpeg } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { SingleModeLayout } from './components/SingleModeLayout';
import { ComparisonModeLayout } from './components/ComparisonModeLayout';
import { TutorialLiveProvider } from './context/TutorialLiveContext';
import { TutorialHeaderHints } from './components/tutorial/TutorialHeaderHints';
import { MapPin, ArrowLeft, Plus, Sun, BarChart2, Wind, ThermometerSun, Settings, X, Compass, BarChart3, Radar, Download, FileJson, FileImage, FileText, CloudLightning, Info, ArrowLeftRight, Sparkles } from 'lucide-react';
import { CARTO_LIGHT_ALL_WATER_HEX, GRADIENTS } from './lib/constants';
import { TUTORIAL_LEGEND_DOM_ID } from './lib/tutorialCopy';
import { GradientDef } from './components/InteractiveLegend';
import { ParsedEPW } from './lib/epwParser';
import {
  exportFilenameLine,
  weatherFileTypeLine,
  weatherLocationTypeCaption,
  weatherPlaceLine,
} from './lib/weatherCaption';

const TUTORIAL_HOVER_HINTS_KEY = 'climate-compare-tutorial-hover-hints';

function readTutorialHoverHintsEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return window.localStorage.getItem(TUTORIAL_HOVER_HINTS_KEY) !== 'false';
  } catch {
    return true;
  }
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

const LAYOUT_PICKER: readonly {
  mode: LayoutMode;
  ariaLabel: string;
  title: string;
  Icon: typeof LayoutIconHeroLeft;
}[] = [
  {
    mode: 'hero-left',
    ariaLabel: 'Default layout — hero tile with supporting grid',
    title: 'Default — hero with supporting tiles',
    Icon: LayoutIconHeroLeft,
  },
  {
    mode: 'grid-4x2',
    ariaLabel: 'Grid layout — four by two tiles',
    title: 'Grid — 4×2 tiles',
    Icon: LayoutIconGrid4x2,
  },
  {
    mode: 'focus-deep',
    ariaLabel: 'Detail layout — two large tiles',
    title: 'Detail — two large tiles',
    Icon: LayoutIconFocusDeep,
  },
  {
    mode: 'tutorial',
    ariaLabel: 'Guided layout — one large card with explanations',
    title: 'Guided — one card + tutorial panel',
    Icon: LayoutIconTutorial,
  },
];

export interface ChartConfig {
  id: string;
  type: ChartType;
  /** When `type` is `explorer`, default EPW column id (e.g. `directNormalRadiation`). */
  variable?: string;
}

/** Default slot line-up per dashboard layout; ids are layout-prefixed so React charts do not reuse state across layouts. */
function defaultSlotsForLayout(mode: LayoutMode): ChartConfig[] {
  const ex = (suffix: string, variable?: string): ChartConfig =>
    variable
      ? { id: `ex-${mode}-${suffix}`, type: 'explorer', variable }
      : { id: `ex-${mode}-${suffix}`, type: 'explorer' };

  switch (mode) {
    case 'tutorial':
      return [{ id: `sp-${mode}-0`, type: 'sunpath' }];
    case 'focus-deep':
      return [
        { id: `sp-${mode}-0`, type: 'sunpath' },
        { id: `ex-${mode}-dn`, type: 'explorer', variable: 'directNormalRadiation' },
      ];
    case 'grid-4x2':
      return [
        { id: `sp-${mode}-0`, type: 'sunpath' },
        ex('a'),
        { id: `ut-${mode}-0`, type: 'utci' },
        { id: `wd-${mode}-0`, type: 'wind' },
        ex('b', 'directNormalRadiation'),
        ex('c', 'relativeHumidity'),
        { id: `wr-${mode}-0`, type: 'windrose' },
        { id: `em-${mode}-0`, type: 'empty' },
      ];
    case 'hero-left':
      return [
        { id: `sp-${mode}-0`, type: 'sunpath' },
        ex('a'),
        { id: `ut-${mode}-0`, type: 'utci' },
        { id: `wd-${mode}-0`, type: 'wind' },
        ex('b', 'directNormalRadiation'),
        ex('c', 'relativeHumidity'),
        { id: `wr-${mode}-0`, type: 'windrose' },
      ];
  }
}

function initialSlotsByLayout(): Record<LayoutMode, ChartConfig[]> {
  return {
    'hero-left': defaultSlotsForLayout('hero-left'),
    'grid-4x2': defaultSlotsForLayout('grid-4x2'),
    'focus-deep': defaultSlotsForLayout('focus-deep'),
    tutorial: defaultSlotsForLayout('tutorial'),
  };
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
  /** Compare pair row: omit per-pane footer legend (parent renders one shared strip). */
  pairSuppressFooterLegend?: boolean;
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
  const activeLayoutPick = useMemo(
    () => LAYOUT_PICKER.find(o => o.mode === layoutMode) ?? LAYOUT_PICKER[0],
    [layoutMode]
  );
  const ActiveLayoutIcon = activeLayoutPick.Icon;
  const [tutorialHoverHints, setTutorialHoverHints] = useState(readTutorialHoverHintsEnabled);
  const [reorderMode, setReorderMode] = useState(false);

  useEffect(() => {
    try {
      window.localStorage.setItem(TUTORIAL_HOVER_HINTS_KEY, tutorialHoverHints ? 'true' : 'false');
    } catch {
      /* ignore */
    }
  }, [tutorialHoverHints]);
  const [slotsByLayout, setSlotsByLayout] = useState<Record<LayoutMode, ChartConfig[]>>(initialSlotsByLayout);
  const slots = slotsByLayout[layoutMode];

  const handleChangeType = useCallback(
    (id: string, newType: ChartType) => {
      setSlotsByLayout(prev => ({
        ...prev,
        [layoutMode]: (prev[layoutMode] ?? []).map(s => (s.id === id ? { ...s, type: newType } : s)),
      }));
    },
    [layoutMode]
  );

  const handleRemoveChart = useCallback(
    (id: string) => {
      setSlotsByLayout(prev => {
        const cur = [...(prev[layoutMode] ?? [])];
        const i = cur.findIndex(s => s.id === id);
        if (i === -1) return prev;
        const next = [...cur];
        next[i] = { id: `empty-${Date.now()}`, type: 'empty' };
        return { ...prev, [layoutMode]: next };
      });
    },
    [layoutMode]
  );

  const swapSlotsByIndex = useCallback(
    (a: number, b: number) => {
      if (a === b) return;
      const max = Math.max(a, b);
      const min = Math.min(a, b);
      if (min < 0) return;
      setSlotsByLayout(prev => {
        const cur = [...(prev[layoutMode] ?? [])];
        const next = [...cur];
        while (next.length <= max) next.push({ id: `slot-${Date.now()}-${next.length}`, type: 'empty' });
        const tmp = next[a];
        next[a] = next[b]!;
        next[b] = tmp!;
        return { ...prev, [layoutMode]: next };
      });
    },
    [layoutMode]
  );

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
    const pairSuppressFooterLegend = compareOpts?.pairSuppressFooterLegend;

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
            metadata={fileData.metadata}
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
            pairSuppressFooterLegend={pairSuppressFooterLegend}
          />
        );
      case 'wind':
        return (
          <WindExplorer
            metadata={fileData.metadata}
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
            pairSuppressFooterLegend={pairSuppressFooterLegend}
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
            pairSuppressFooterLegend={pairSuppressFooterLegend}
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
            pairSuppressFooterLegend={pairSuppressFooterLegend}
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
      <div
        className="h-dvh w-full min-h-0 overflow-hidden font-sans relative box-border p-5 sm:p-6"
        style={{ backgroundColor: '#fcfbf8' }}
      >
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
    <div
      className={`h-dvh w-full min-h-0 overflow-hidden flex flex-col font-sans transition-colors duration-300 box-border p-5 sm:p-6 ${
        theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'
      }`}
      style={theme === 'dark' ? undefined : { backgroundColor: '#fcfbf8' }}
    >
      <div id="tutorial-header-dock" className="relative z-20 flex shrink-0 flex-col">
      {/* Top Navigation Bar */}
      <div
        id="tutorial-nav-bar"
        className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b px-2 sm:px-4 py-1.5 flex items-center justify-between gap-2 shadow-sm transition-colors duration-300`}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-4">
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
            className="flex min-w-0 items-center gap-1.5 overflow-x-auto hide-scrollbar py-0.5 sm:gap-2"
          >
            {selectedFiles.map((file, index) => {
              const fileTypeNote = weatherFileTypeLine(file);
              return (
              <div 
                key={index} 
                className={`group flex shrink-0 items-center gap-1 px-1.5 py-0.5 sm:gap-1.5 sm:px-2.5 sm:py-1 rounded-full border transition-all cursor-pointer ${
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
                title={
                  [weatherLocationTypeCaption(file), file.sourceFilename].filter(Boolean).join('\n') ||
                  undefined
                }
              >
                <MapPin
                  className={`h-2.5 w-2.5 shrink-0 sm:h-3 sm:w-3 ${viewMode === 'single' && activeFileIndex === index ? (theme === 'dark' ? 'text-gray-200' : 'text-gray-600') : (theme === 'dark' ? 'text-gray-400' : 'text-gray-500')}`}
                />
                <div className="flex max-w-[11rem] min-w-0 flex-col gap-0.5 text-left leading-none sm:max-w-[15rem]">
                  <span className="truncate text-[10px] font-semibold leading-none sm:text-[11px]">
                    {weatherPlaceLine(file) || file.metadata.city}
                  </span>
                  {fileTypeNote ? (
                    <span
                      className={`truncate text-[9px] font-medium leading-none tracking-wide sm:text-[10px] ${
                        viewMode === 'single' && activeFileIndex === index
                          ? theme === 'dark'
                            ? 'text-gray-300'
                            : 'text-gray-600'
                          : theme === 'dark'
                            ? 'text-gray-400'
                            : 'text-gray-500'
                      }`}
                    >
                      {fileTypeNote}
                    </span>
                  ) : null}
                </div>
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
                  className={`ml-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-red-500/10 hover:text-red-500 ${viewMode === 'single' && activeFileIndex === index ? (theme === 'dark' ? 'text-gray-300' : 'text-gray-500') : 'text-gray-400'}`}
                  title="Remove file"
                >
                  <X className="h-2 w-2 sm:h-2.5 sm:w-2.5" />
                </button>
              </div>
              );
            })}
            <button
              id="tutorial-nav-add"
              onClick={() => setIsSelectingFile(true)}
              className={`flex shrink-0 items-center gap-1 rounded-full border border-dashed px-2 py-0.5 text-[10px] font-medium transition-colors sm:gap-1.5 sm:px-2.5 sm:py-1 sm:text-[11px] ${theme === 'dark' ? 'border-gray-600 text-gray-400 hover:border-gray-400 hover:text-gray-200' : 'border-gray-300 text-gray-500 hover:border-gray-400 hover:text-gray-700'}`}
            >
              <Plus className="h-2.5 w-2.5 sm:h-3 sm:w-3" /> Add
            </button>
          </div>
        </div>

        <div className="flex shrink min-w-0 items-center justify-end gap-1 sm:gap-2">
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

          {viewMode === 'single' && layoutMode === 'tutorial' && (
            <button
              type="button"
              id="tutorial-nav-hover-hints"
              role="switch"
              aria-checked={tutorialHoverHints}
              aria-label={tutorialHoverHints ? 'Deactivate tool tips' : 'Activate tool tips'}
              onClick={() => setTutorialHoverHints(v => !v)}
              title={tutorialHoverHints ? 'Deactivate tool tips' : 'Activate tool tips'}
              className={`inline-flex h-9 shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wide shadow-hard-sm transition-all active:scale-95 sm:h-10 sm:gap-1.5 sm:px-2.5 ${
                tutorialHoverHints
                  ? theme === 'dark'
                    ? 'border-sky-700/70 bg-sky-950/40 text-sky-200 hover:bg-sky-900/35'
                    : 'border-sky-300 bg-sky-50 text-sky-900 hover:bg-sky-100'
                  : theme === 'dark'
                    ? 'border-gray-700 bg-gray-800 text-gray-400 hover:bg-gray-700'
                    : 'border-gray-200 bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" aria-hidden />
              <span className="hidden min-[380px]:inline">Tips</span>
            </button>
          )}

          {viewMode === 'single' && (
            <div
              id="tutorial-nav-layouts"
              className={`group/layout-pick inline-flex h-9 shrink-0 items-stretch rounded-full border p-0.5 sm:h-10 ${
                theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-100 shadow-hard-sm'
              }`}
              role="group"
              aria-label="Dashboard layout"
            >
              <div className="flex shrink-0 gap-0.5 overflow-hidden transition-[max-width] duration-300 ease-out motion-reduce:transition-none max-w-0 opacity-0 pointer-events-none group-hover/layout-pick:pointer-events-auto group-hover/layout-pick:max-w-[11rem] group-hover/layout-pick:opacity-100 group-focus-within/layout-pick:pointer-events-auto group-focus-within/layout-pick:max-w-[11rem] group-focus-within/layout-pick:opacity-100 sm:group-hover/layout-pick:max-w-[12rem] sm:group-focus-within/layout-pick:max-w-[12rem]">
                {LAYOUT_PICKER.filter(o => o.mode !== layoutMode).map(({ mode, ariaLabel, title, Icon }) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setLayoutMode(mode)}
                    aria-label={ariaLabel}
                    title={title}
                    className={`flex min-w-9 shrink-0 items-center justify-center rounded-full px-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-1 sm:min-w-10 sm:px-2.5 ${
                      theme === 'dark'
                        ? 'text-gray-400 hover:bg-gray-700/60 hover:text-gray-200'
                        : 'text-gray-500 hover:bg-white/60 hover:text-gray-800'
                    }`}
                  >
                    <Icon className="h-[18px] w-[26px] sm:h-5 sm:w-7" />
                  </button>
                ))}
              </div>
              <div
                className={`flex min-w-9 shrink-0 items-center justify-center rounded-full px-2 sm:min-w-10 sm:px-2.5 ${
                  theme === 'dark' ? 'bg-gray-600 text-gray-100 shadow-sm' : 'bg-white text-gray-900 shadow-sm'
                }`}
                title={activeLayoutPick.title}
                aria-current="true"
                aria-label={activeLayoutPick.ariaLabel}
              >
                <ActiveLayoutIcon className="h-[18px] w-[26px] sm:h-5 sm:w-7" />
              </div>
            </div>
          )}

          <div className={`h-5 sm:h-6 w-px mx-0.5 sm:mx-1 hidden xs:block shrink-0 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'}`}></div>

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
          ) : null}

          <div
            className={`inline-flex shrink-0 flex-row-reverse items-center gap-1 ${!exportMode ? 'group/nav-more' : ''}`}
          >
            <button
              id="tutorial-nav-settings"
              type="button"
              onClick={() => setShowSettingsModal(true)}
              className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border p-0 shadow-hard-sm transition-all active:scale-95 sm:h-10 sm:w-10 ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 border-gray-200 text-gray-700 hover:bg-gray-200'}`}
              title="Global settings"
            >
              <Settings className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 dark:text-gray-300" />
            </button>
            {!exportMode && (
              <div className="flex max-w-0 shrink-0 flex-row gap-1 overflow-hidden opacity-0 transition-[max-width] duration-300 ease-out motion-reduce:transition-none pointer-events-none group-hover/nav-more:pointer-events-auto group-hover/nav-more:max-w-[6.25rem] group-hover/nav-more:opacity-100 group-focus-within/nav-more:pointer-events-auto group-focus-within/nav-more:max-w-[6.25rem] group-focus-within/nav-more:opacity-100 sm:group-hover/nav-more:max-w-[6.75rem] sm:group-focus-within/nav-more:max-w-[6.75rem]">
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
                <button
                  id="tutorial-nav-export"
                  type="button"
                  onClick={() => setExportMode(true)}
                  className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border p-0 shadow-hard-sm transition-all active:scale-95 sm:h-10 sm:w-10 ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 border-gray-200 text-gray-700 hover:bg-gray-200'}`}
                  title="Export layout"
                >
                  <Download className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
            )}
          </div>

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
            : 'overflow-visible'
        } ${exportMode ? 'bg-white' : ''}`}
        style={{
          backgroundColor: exportMode ? '#ffffff' : theme === 'dark' ? '#121211' : '#fcfbf8',
        }}
      >
        <div className={`max-w-[1600px] mx-auto p-1.5 sm:p-2.5 lg:p-3 flex-1 min-h-0 flex flex-col w-full overflow-visible ${exportMode ? 'bg-white' : ''}`}>
          {exportMode && selectedFiles.length > 0 ? (
            <header className="mb-4 w-full shrink-0 border-b border-gray-200 pb-4">
              <h2 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                Weather data files
              </h2>
              <div className="flex flex-col gap-2">
                {selectedFiles.map((f, i) => (
                  <p
                    key={i}
                    className="break-all font-mono text-[11px] leading-snug text-gray-900"
                  >
                    {exportFilenameLine(f)}
                  </p>
                ))}
              </div>
            </header>
          ) : null}

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
                unitSystem={unitSystem}
                gradients={allGradients}
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
                tutorialHoverHints={tutorialHoverHints}
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
                  setSlotsByLayout(prev => {
                    const cur = [...(prev[layoutMode] ?? [])];
                    while (cur.length <= idx) cur.push({ id: `slot-${Date.now()}-${cur.length}`, type: 'empty' });
                    cur[idx] = { ...cur[idx]!, type };
                    return { ...prev, [layoutMode]: cur };
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
