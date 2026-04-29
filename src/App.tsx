/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useCallback, useMemo, useEffect, useSyncExternalStore } from 'react';
import { MapSelector } from './components/MapSelector';
import { SunPath } from './components/SunPath';
import { DataExplorer } from './components/DataExplorer';
import { WindExplorer } from './components/WindExplorer';
import { WindRose } from './components/WindRose';
import { UtciExplorer } from './components/UtciExplorer';
import { Grid4x2ComfortExportOutline } from './components/Grid4x2ComfortExportOutline';
import { Grid4x2StatsColumn } from './components/QuickStatsSidebar';
import { SiteFooter, type SiteFooterExportCaption } from './components/SiteFooter';
import {
  DEFAULT_GLOBAL_FILTER,
  type GlobalFilterState,
  type HeatmapCellStatistic,
} from './lib/globalFilter';
import { SettingsModal } from './components/SettingsModal';
import { toPng, toJpeg } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { SingleModeLayout } from './components/SingleModeLayout';
import { ComparisonModeLayout } from './components/ComparisonModeLayout';
import { TutorialLiveProvider } from './context/TutorialLiveContext';
import { TutorialHeaderHints } from './components/tutorial/TutorialHeaderHints';
import { MapPin, ArrowLeft, Plus, Sun, BarChart2, Wind, ThermometerSun, Settings, X, Compass, BarChart3, Radar, Download, FileJson, FileImage, FileText, CloudLightning, Info, Sparkles } from 'lucide-react';
import { CARTO_LIGHT_ALL_WATER_HEX, GRADIENTS } from './lib/constants';
import { TUTORIAL_LEGEND_DOM_ID } from './lib/tutorialCopy';
import { GradientDef } from './components/InteractiveLegend';
import { ParsedEPW } from './lib/epwParser';
import { withDstDisplayRespectingToggle } from './lib/dstDisplay';
import {
  exportFilenameLine,
  weatherFileTypeLine,
  weatherLocationTypeCaption,
  weatherPlaceCaption,
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

function useMediaMinWidthPx(minWidthPx: number, ssrFallback: boolean) {
  const query = `(min-width: ${minWidthPx}px)`;
  return useSyncExternalStore(
    onStoreChange => {
      if (typeof window === 'undefined') return () => {};
      const mql = window.matchMedia(query);
      const onChange = () => onStoreChange();
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    },
    () => (typeof window !== 'undefined' ? window.matchMedia(query).matches : ssrFallback),
    () => ssrFallback
  );
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
export type LayoutMode = 'hero-left' | 'grid-4x2' | 'focus-deep' | 'tutorial' | 'stacked';

function LayoutIconStacked({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 28" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      {/* Single card with a left↔right arrow to suggest full-width single-column layout. */}
      <rect x="5" y="4" width="30" height="20" rx="3" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M14 14h12m0 0-2.5-2.5M26 14l-2.5 2.5M14 14l2.5-2.5M14 14l2.5 2.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.85"
      />
    </svg>
  );
}

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
  {
    mode: 'stacked',
    ariaLabel: 'Stacked layout — full-width cards',
    title: 'Stacked — full-width cards',
    Icon: LayoutIconStacked,
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
    case 'stacked':
      return [
        { id: `sp-${mode}-0`, type: 'sunpath' },
        ex('db', 'dryBulbTemperature'),
        { id: `ut-${mode}-0`, type: 'utci' },
        { id: `wr-${mode}-0`, type: 'windrose' },
        { id: `wd-${mode}-0`, type: 'wind' },
        { id: `empty-${mode}-0`, type: 'empty' },
      ];
    case 'focus-deep':
      return [
        { id: `sp-${mode}-0`, type: 'sunpath' },
        { id: `ex-${mode}-dn`, type: 'explorer', variable: 'directNormalRadiation' },
      ];
    case 'grid-4x2':
      /** Row-major: col1 sun+rose, col2 temp+wind, col3 DNR+sky cover, col4 RH+UTCI */
      return [
        { id: `sp-${mode}-0`, type: 'sunpath' },
        ex('db', 'dryBulbTemperature'),
        ex('dn', 'directNormalRadiation'),
        ex('rh', 'relativeHumidity'),
        { id: `wr-${mode}-0`, type: 'windrose' },
        { id: `wd-${mode}-0`, type: 'wind' },
        ex('cloud', 'totalSkyCover'),
        { id: `ut-${mode}-0`, type: 'utci' },
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
    stacked: defaultSlotsForLayout('stacked'),
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
  /** Merged Y domain for the top bar / range so left and right panes share the same axis (compare pair). */
  barYDomain: { min: number; max: number } | null;
  onBarYExtent: (e: { min: number; max: number; pane: 'primary' | 'secondary' } | 'clear') => void;
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
  const [dstDisplayEnabled, setDstDisplayEnabled] = useState(false);
  const [mapLibraryMode, setMapLibraryMode] = useState<'historical' | 'future'>('historical');

  /** When the EPW header says the site observes DST, default the display toggle on for this file set. */
  useEffect(() => {
    if (selectedFiles.length === 0) {
      setDstDisplayEnabled(false);
      return;
    }
    setDstDisplayEnabled(selectedFiles.some(f => f.metadata.daylightSavings === 'yes'));
  }, [selectedFiles]);
  const [heatmapTextColor, setHeatmapTextColor] = useState<string>('#000000');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    root.style.colorScheme = theme === 'dark' ? 'dark' : 'light';
  }, [theme]);

  const [globalFilter, setGlobalFilter] = useState<GlobalFilterState>(() => ({
    ...DEFAULT_GLOBAL_FILTER,
  }));

  /** Heatmaps: statistic taken within each aggregation cell (“Ave” = mean). Shared app-wide via footer toggle. */
  const [heatmapCellStatistic, setHeatmapCellStatistic] = useState<HeatmapCellStatistic>('mean');

  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [exportMode, setExportModeState] = useState(false);
  const exportModeRef = useRef(exportMode);
  const setExportMode = (val: boolean) => {
    setExportModeState(val);
    exportModeRef.current = val;
  };

  const allGradients = useMemo(() => [...GRADIENTS, ...customGradients], [customGradients]);

  const displayFiles = useMemo(
    () => selectedFiles.map(f => withDstDisplayRespectingToggle(f, dstDisplayEnabled)),
    [selectedFiles, dstDisplayEnabled]
  );

  /** Files represented in the current dashboard export (active file in single mode; baseline + compare in comparison). */
  const exportCaptionFiles = useMemo(() => {
    if (!selectedFiles.length) return [];
    if (viewMode === 'comparison' && selectedFiles.length >= 2) {
      if (differenceBaselineIndex === differenceCompareIndex) {
        const f = selectedFiles[differenceBaselineIndex];
        return f ? [f] : [];
      }
      const a = selectedFiles[differenceBaselineIndex];
      const b = selectedFiles[differenceCompareIndex];
      const out: ParsedEPW[] = [];
      if (a) out.push(a);
      if (b) out.push(b);
      return out;
    }
    const active = selectedFiles[activeFileIndex];
    return active ? [active] : [];
  }, [selectedFiles, viewMode, differenceBaselineIndex, differenceCompareIndex, activeFileIndex]);

  /** Export-only: place + filename lines shown in the footer strip (not duplicate header). */
  const exportFooterCaptions = useMemo((): SiteFooterExportCaption[] | undefined => {
    if (!exportMode || exportCaptionFiles.length === 0) return undefined;
    return exportCaptionFiles.map(f => ({
      place: weatherPlaceCaption(f),
      filename: exportFilenameLine(f),
    }));
  }, [exportMode, exportCaptionFiles]);

  const [layoutMode, setLayoutMode] = useState<LayoutMode>('hero-left');
  const smUp = useMediaMinWidthPx(640, true);
  const activeLayoutPicker = useMemo(() => {
    if (viewMode !== 'single') return LAYOUT_PICKER;
    return smUp ? LAYOUT_PICKER : LAYOUT_PICKER.filter(o => o.mode === 'tutorial' || o.mode === 'stacked');
  }, [smUp, viewMode]);

  useEffect(() => {
    if (viewMode !== 'single') return;
    if (smUp) return;
    setLayoutMode(prev => (prev === 'tutorial' || prev === 'stacked' ? prev : 'tutorial'));
  }, [smUp, viewMode]);

  const activeLayoutPick = useMemo(
    () => activeLayoutPicker.find(o => o.mode === layoutMode) ?? activeLayoutPicker[0] ?? LAYOUT_PICKER[0],
    [layoutMode, activeLayoutPicker]
  );
  const ActiveLayoutIcon = activeLayoutPick.Icon;
  const [tutorialHoverHints, setTutorialHoverHints] = useState(readTutorialHoverHintsEnabled);
  const [layoutPickerOpen, setLayoutPickerOpen] = useState(false);
  /** Positioning root for export outline around bottom-right chart + comfort stats. */
  const grid4x2ExportWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (smUp) setLayoutPickerOpen(false);
  }, [smUp]);

  useEffect(() => {
    if (smUp || !layoutPickerOpen) return;
    /**
     * Close on outside *click* only (not touchstart). A document touchstart would run before the
     * child button's onClick, could collapse the panel and steal the tap; max-w-0 + overflow
     * can also make targets miss hit-testing. Bubble-phase click: layout buttons fire first.
     */
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Element | null;
      if (!t) return;
      if (t.closest('#tutorial-nav-layouts')) return;
      setLayoutPickerOpen(false);
    };
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, [smUp, layoutPickerOpen]);

  useEffect(() => {
    try {
      window.localStorage.setItem(TUTORIAL_HOVER_HINTS_KEY, tutorialHoverHints ? 'true' : 'false');
    } catch {
      /* ignore */
    }
  }, [tutorialHoverHints]);
  const [slotsByLayout, setSlotsByLayout] = useState<Record<LayoutMode, ChartConfig[]>>(initialSlotsByLayout);
  const slots = slotsByLayout[layoutMode];

  /** Low/Ave/High applies to 12×24 explorer-style heatmaps only; comparison mode always includes those cards. */
  const dashboardHasHeatmap1224 = useMemo(() => {
    if (viewMode === 'comparison') return true;
    return slots.some(s => s.type === 'explorer' || s.type === 'wind' || s.type === 'utci');
  }, [viewMode, slots]);

  useEffect(() => {
    if (layoutMode !== 'stacked') return;
    setSlotsByLayout(prev => {
      const cur = [...(prev.stacked ?? [])];
      if (cur.length < 2) return prev;
      if (cur[1]?.type !== 'explorer') return prev;
      if (cur[1]?.variable !== 'dryBulbTemperature') return prev;
      if (cur[2]?.type === 'utci') return prev;

      const next = [...cur];
      next.splice(2, 0, { id: `ut-stacked-${Date.now()}`, type: 'utci' });
      return { ...prev, stacked: next };
    });
  }, [layoutMode]);

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
        const canvasUrl = 'https://climatecanvas.app';
        const footerStripH = Math.min(64, Math.max(36, img.height * 0.07));
        pdf.link(0, img.height - footerStripH, img.width, footerStripH, { url: canvasUrl });
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
            heatmapCellStatistic={heatmapCellStatistic}
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
            heatmapCellStatistic={heatmapCellStatistic}
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
            heatmapCellStatistic={heatmapCellStatistic}
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
        className="relative flex h-dvh w-full flex-col overflow-hidden font-sans"
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
        <div className="relative min-h-0 flex-1">
          <MapSelector 
            onSelect={handleSelectEPW} 
            isSelectingCompare={isSelectingFile && selectedFiles.length > 0} 
            initialCenter={selectedFiles.length > 0 ? [selectedFiles[0].metadata.lat, selectedFiles[0].metadata.lng] : undefined}
            initialZoom={selectedFiles.length > 0 ? 10 : undefined}
            mapLibraryMode={mapLibraryMode}
            onMapLibraryModeChange={setMapLibraryMode}
          />
        </div>
        <div className="shrink-0 border-t border-gray-200/80 bg-[#fcfbf8] px-2 py-2">
          <div className="mx-auto max-w-[1600px]">
            <SiteFooter theme={theme} exportMode={false} />
          </div>
        </div>
      </div>
    );
  }

  const singleModeLayoutEl = (
    <SingleModeLayout
      slots={slots}
      layoutMode={layoutMode}
      exportMode={exportMode}
      theme={theme}
      tutorialHoverHints={smUp && tutorialHoverHints}
      tutorialEpwRows={displayFiles[activeFileIndex]?.data}
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
          displayFiles[activeFileIndex],
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
          if (layoutMode === 'stacked') {
            const last = cur[cur.length - 1];
            const isLast = idx === cur.length - 1;
            const lastWasEmpty = last?.type === 'empty';
            if (isLast && type !== 'empty' && lastWasEmpty) {
              cur.push({ id: `empty-${Date.now()}`, type: 'empty' });
            }
            if (cur.length === 0 || cur[cur.length - 1]?.type !== 'empty') {
              cur.push({ id: `empty-${Date.now()}`, type: 'empty' });
            }
          }
          return { ...prev, [layoutMode]: cur };
        });
      }}
      onSwapSlots={swapSlotsByIndex}
    />
  );

  return (
    <div
      className={`flex h-dvh w-full flex-col overflow-hidden font-sans transition-[background-color,color] duration-200 ease-out ${
        theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'
      }`}
      style={theme === 'dark' ? undefined : { backgroundColor: '#fcfbf8' }}
    >
      <div id="tutorial-header-dock" className="relative z-20 flex shrink-0 flex-col">
      {/* Top Navigation Bar */}
      <div
        id="tutorial-nav-bar"
        className={`relative z-30 flex min-w-0 w-full min-h-0 items-center justify-between gap-2 border-b px-2 py-1.5 transition-[background-color,border-color,box-shadow] duration-200 sm:px-4 ${
          theme === 'dark'
            ? 'bg-gray-800 border-gray-700 shadow-[0_1px_0_0_rgba(0,0,0,0.35)]'
            : 'bg-white border-gray-200 shadow-sm'
        }`}
      >
        <div className="flex min-h-0 min-w-0 flex-1 items-center gap-2 overflow-hidden sm:gap-4">
          <button 
            id="tutorial-nav-back"
            onClick={() => {
              setSelectedFiles([]);
              setShowDifference(false);
            }}
            className={`inline-flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-full border border-transparent p-0 shadow-hard-sm transition-[color,background-color,border-color,box-shadow] duration-200 ${theme === 'dark' ? 'hover:bg-gray-700 text-gray-300 hover:border-gray-600' : 'hover:bg-gray-100 text-gray-600 hover:border-gray-200'}`}
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
                className={`group flex shrink-0 items-center gap-1 px-1.5 py-0.5 sm:gap-1.5 sm:px-2.5 sm:py-1 rounded-full border transition-[color,background-color,border-color,box-shadow] duration-200 cursor-pointer ${
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

        <div className="flex shrink-0 items-center justify-end gap-1 sm:gap-2">
          {selectedFiles.length > 1 && (
            <div
              id="tutorial-nav-viewmode"
              className={`flex shrink-0 items-center rounded-full border p-0.5 sm:p-1 ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200 shadow-hard-sm'}`}
            >
              <button
                onClick={() => {
                  setViewMode('single');
                  setShowDifference(false);
                }}
                className={`min-w-0 shrink rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-1 dark:focus-visible:ring-gray-500 dark:focus-visible:ring-offset-gray-800 sm:px-3 sm:py-1.5 sm:text-xs ${
                  viewMode === 'single'
                    ? theme === 'dark'
                      ? 'bg-gray-600 text-white hover:bg-gray-500'
                      : 'bg-gray-200 text-gray-900 shadow-sm hover:bg-gray-300'
                    : theme === 'dark'
                      ? 'text-gray-400 hover:text-gray-200'
                      : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Single
              </button>
              <button
                onClick={() => {
                  setViewMode('comparison');
                  setShowDifference(true);
                }}
                className={`min-w-0 shrink rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-1 dark:focus-visible:ring-gray-500 dark:focus-visible:ring-offset-gray-800 sm:px-3 sm:py-1.5 sm:text-xs ${
                  viewMode === 'comparison'
                    ? theme === 'dark'
                      ? 'bg-gray-600 text-white hover:bg-gray-500'
                      : 'bg-gray-200 text-gray-900 shadow-sm hover:bg-gray-300'
                    : theme === 'dark'
                      ? 'text-gray-400 hover:text-gray-200'
                      : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Compare
              </button>
            </div>
          )}

          {viewMode === 'single' && layoutMode === 'tutorial' && smUp && (
            <button
              type="button"
              id="tutorial-nav-hover-hints"
              role="switch"
              aria-checked={tutorialHoverHints}
              aria-label={tutorialHoverHints ? 'Deactivate hover directions' : 'Activate hover directions'}
              onClick={() => setTutorialHoverHints(v => !v)}
              title={tutorialHoverHints ? 'Deactivate hover directions' : 'Activate hover directions'}
              className={`inline-flex h-9 shrink-0 items-center justify-center rounded-full border p-0 text-[10px] font-bold uppercase tracking-wide transition-[color,background-color,border-color,transform] duration-200 ease-out active:scale-[0.98] sm:h-10 sm:gap-1.5 sm:px-2.5 ${
                tutorialHoverHints
                  ? theme === 'dark'
                    ? 'border-blue-500 bg-blue-600 text-white shadow-sm hover:bg-blue-500'
                    : 'border-blue-600 bg-blue-600 text-white shadow-sm hover:bg-blue-700'
                  : theme === 'dark'
                    ? 'border-dashed border-gray-500 bg-transparent text-gray-400 hover:bg-gray-800/80'
                    : 'border-dashed border-gray-400 bg-transparent text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" aria-hidden />
              <span className="hidden sm:inline">Directions</span>
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
              <div
                className={
                  !smUp
                    ? layoutPickerOpen
                      ? 'flex min-w-0 shrink-0 gap-0.5 overflow-hidden max-w-[min(12rem,calc(100vw-5rem))] opacity-100 pointer-events-auto transition-[max-width,opacity] duration-300 ease-out motion-reduce:transition-none'
                      : 'flex min-w-0 shrink-0 gap-0.5 max-w-0 overflow-hidden opacity-0 pointer-events-none transition-[max-width,opacity] duration-300 ease-out motion-reduce:transition-none'
                    : 'flex min-w-0 shrink-0 gap-0.5 overflow-hidden max-w-0 opacity-0 pointer-events-none transition-[max-width,opacity] duration-300 ease-out motion-reduce:transition-none group-hover/layout-pick:pointer-events-auto group-hover/layout-pick:max-w-[11rem] group-hover/layout-pick:opacity-100 group-focus-within/layout-pick:pointer-events-auto group-focus-within/layout-pick:max-w-[11rem] group-focus-within/layout-pick:opacity-100 sm:group-hover/layout-pick:max-w-[12rem] sm:group-focus-within/layout-pick:max-w-[12rem]'
                }
              >
                {activeLayoutPicker.filter(o => o.mode !== layoutMode).map(({ mode, ariaLabel, title, Icon }) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => {
                      setLayoutMode(mode);
                      setLayoutPickerOpen(false);
                    }}
                    aria-label={ariaLabel}
                    title={title}
                    className={`flex min-w-9 shrink-0 items-center justify-center rounded-full px-2 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-1 dark:focus-visible:ring-gray-500 dark:focus-visible:ring-offset-gray-800 sm:min-w-10 sm:px-2.5 ${
                      theme === 'dark'
                        ? 'text-gray-400 hover:bg-gray-700/60 hover:text-gray-200'
                        : 'text-gray-500 hover:bg-white/60 hover:text-gray-800'
                    }`}
                  >
                    <Icon className="h-[18px] w-[26px] sm:h-5 sm:w-7" />
                  </button>
                ))}
              </div>
              <button
                type="button"
                className={`flex min-w-9 shrink-0 items-center justify-center rounded-full px-2 transition-colors duration-200 sm:min-w-10 sm:px-2.5 ${
                  theme === 'dark' ? 'bg-gray-600 text-gray-100 shadow-sm' : 'bg-white text-gray-900 shadow-sm'
                }`}
                title={activeLayoutPick.title}
                aria-current="true"
                aria-label={activeLayoutPick.ariaLabel}
                onClick={() => {
                  if (!smUp) setLayoutPickerOpen(v => !v);
                }}
              >
                <ActiveLayoutIcon className="h-[18px] w-[26px] sm:h-5 sm:w-7" />
              </button>
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

          <div className="inline-flex shrink-0 flex-row items-center gap-1">
            <button
              id="tutorial-nav-settings"
              type="button"
              onClick={() => setShowSettingsModal(true)}
              className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border p-0 shadow-hard-sm transition-[color,background-color,border-color,box-shadow,transform] duration-200 ease-out active:scale-[0.97] sm:h-10 sm:w-10 ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 border-gray-200 text-gray-700 hover:bg-gray-200'}`}
              title="Global settings"
            >
              <Settings className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden />
            </button>
            {!exportMode && (
              <button
                id="tutorial-nav-export"
                type="button"
                onClick={() => setExportMode(true)}
                className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border p-0 shadow-hard-sm transition-[color,background-color,border-color,box-shadow,transform] duration-200 ease-out active:scale-[0.97] sm:h-10 sm:w-10 ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 border-gray-200 text-gray-700 hover:bg-gray-200'}`}
                title="Export layout"
              >
                <Download className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            )}
          </div>

        </div>
      </div>

      {viewMode === 'single' && layoutMode === 'tutorial' && !exportMode && smUp && tutorialHoverHints ? (
        <TutorialHeaderHints theme={theme} showCompareToggle={selectedFiles.length > 1} />
      ) : null}
      </div>

      {/* Gradient Creator Modal */}
      {showGradientModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2">
          <div
            className={`w-full max-w-xs rounded-lg border p-3 shadow-hard-xl sm:max-w-sm ${
              theme === 'dark' ? 'border-gray-600 bg-gray-800 text-gray-100' : 'border-gray-200 bg-white text-gray-900'
            }`}
          >
            <h3 className="mb-2 text-sm font-bold">Create custom gradient</h3>
            <div className="space-y-2">
              <div>
                <label
                  className={`mb-1 block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}
                >
                  Name
                </label>
                <input
                  type="text"
                  value={newGradientName}
                  onChange={e => setNewGradientName(e.target.value)}
                  className={`w-full rounded-full border px-3 py-2 text-sm transition-colors duration-200 ${
                    theme === 'dark'
                      ? 'border-gray-600 bg-gray-900/50 text-gray-100 placeholder:text-gray-500'
                      : 'border-gray-300 bg-white text-gray-900'
                  }`}
                  placeholder="e.g., My Cool Gradient"
                />
              </div>
              <div>
                <label
                  className={`mb-1 block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}
                >
                  Colors
                </label>
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
                        className={`flex-1 rounded-full border px-2 py-1 text-sm font-mono transition-colors duration-200 ${
                          theme === 'dark'
                            ? 'border-gray-600 bg-gray-900/50 text-gray-100'
                            : 'border-gray-300 bg-white text-gray-900'
                        }`}
                      />
                      {newGradientColors.length > 2 && (
                        <button 
                          type="button"
                          onClick={() => setNewGradientColors(prev => prev.filter((_, idx) => idx !== i))}
                          className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-red-500 transition-colors duration-200 ${
                            theme === 'dark' ? 'hover:bg-red-950/50 hover:text-red-400' : 'hover:bg-red-50 hover:text-red-600'
                          }`}
                          aria-label="Remove color"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button 
                    onClick={() => setNewGradientColors(prev => [...prev, '#ffffff'])}
                    className={`flex items-center gap-1 text-xs font-bold transition-colors duration-200 ${
                      theme === 'dark' ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    <Plus className="w-3 h-3" /> Add Color
                  </button>
                </div>
              </div>
            </div>
            <div className="mt-8 flex justify-end gap-3">
              <button 
                type="button"
                onClick={() => setShowGradientModal(false)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors duration-200 ${
                  theme === 'dark'
                    ? 'text-gray-300 hover:bg-gray-700/80 hover:text-white'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
                }`}
              >
                Cancel
              </button>
              <button 
                onClick={handleAddGradient}
                className={`rounded-full px-6 py-2 text-sm font-bold text-white shadow-hard-md transition-colors duration-200 ${
                  theme === 'dark' ? 'bg-sky-600 hover:bg-sky-500' : 'bg-gray-800 hover:bg-gray-900'
                }`}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dashboard Area — main charts flex-1; footer strip shrink-0 so pills never overlap cards */}
      <div 
        id="dashboard-area"
        className={`flex min-h-0 flex-1 flex-col overflow-hidden transition-[background-color] duration-200 ease-out ${exportMode ? 'bg-white' : ''}`}
        style={{
          backgroundColor: exportMode ? '#ffffff' : theme === 'dark' ? '#121211' : '#fcfbf8',
        }}
      >
        <div className={`mx-auto flex min-h-0 flex-1 flex-col overflow-hidden px-1.5 pt-1.5 pb-1.5 sm:px-2.5 sm:pt-2.5 sm:pb-2.5 lg:px-3 lg:pt-3 lg:pb-3 w-full max-w-[1600px] ${exportMode ? 'bg-white' : ''}`}>
          {showSettingsModal && (
            <SettingsModal
              isOpen={showSettingsModal}
              onClose={() => setShowSettingsModal(false)}
              filter={globalFilter}
              onChangeFilter={setGlobalFilter}
              unitSystem={unitSystem}
              theme={theme}
              setTheme={setTheme}
              heatmapTextColor={heatmapTextColor}
              setHeatmapTextColor={setHeatmapTextColor}
              setShowGradientModal={setShowGradientModal}
            />
          )}

          {selectedFiles.length >= 2 && viewMode === 'comparison' ? (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <ComparisonModeLayout
                files={displayFiles}
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
              <div className="flex min-h-0 flex-1 flex-col">
                {layoutMode === 'grid-4x2' ? (
                  <div
                    ref={grid4x2ExportWrapRef}
                    className="relative grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_minmax(0,16.666%)] grid-rows-[1fr_1fr] gap-x-2 gap-y-2 items-stretch"
                  >
                    <Grid4x2ComfortExportOutline
                      active={exportMode}
                      containerRef={grid4x2ExportWrapRef}
                      theme={theme}
                    />
                    <div className="col-span-1 row-span-2 min-h-0 min-w-0 flex flex-col">{singleModeLayoutEl}</div>
                    <Grid4x2StatsColumn
                      theme={theme}
                      rows={displayFiles[activeFileIndex]?.data}
                      unitSystem={unitSystem}
                      exportMode={exportMode}
                    />
                  </div>
                ) : (
                  singleModeLayoutEl
                )}
              </div>
            </TutorialLiveProvider>
          )}

          </div>
        <div
          className={`shrink-0 border-t ${
            exportMode ? 'border-gray-200 bg-white' : theme === 'dark' ? 'border-gray-800/80 bg-inherit' : 'border-gray-200/80 bg-inherit'
          }`}
        >
          <div className="mx-auto w-full max-w-[1600px] px-1.5 py-1 sm:px-2.5 lg:px-3">
            <SiteFooter
              theme={theme}
              exportMode={exportMode}
              exportCaptions={exportFooterCaptions}
              unitSystem={unitSystem}
              onUnitSystemChange={setUnitSystem}
              heatmapCellStatistic={heatmapCellStatistic}
              onHeatmapCellStatisticChange={setHeatmapCellStatistic}
              dstDisplayEnabled={dstDisplayEnabled}
              onDstDisplayEnabledChange={setDstDisplayEnabled}
              showHeatmapCellToggle={dashboardHasHeatmap1224}
              exportNotesDst={exportMode && dstDisplayEnabled}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
