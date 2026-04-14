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
import { ScaledWrapper } from './components/ScaledWrapper';
import { ParsedEPW } from './lib/epwParser';
import { MapPin, ArrowLeft, Plus, Sun, BarChart2, Wind, ThermometerSun, Activity, Settings2, X, Compass, BarChart3, Radar, Download, FileJson, FileImage, FileText, CloudLightning, Info } from 'lucide-react';
import { GRADIENTS } from './lib/constants';
import { GradientDef } from './components/InteractiveLegend';
import ReactGridLayout, { Responsive } from 'react-grid-layout';

type Layout = ReactGridLayout.Layout;
type Layouts = ReactGridLayout.Layouts;
import { WidthProvider } from 'react-grid-layout/legacy';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { toPng, toJpeg } from 'html-to-image';
import { jsPDF } from 'jspdf';

const ResponsiveGridLayout = WidthProvider(Responsive);

type ChartType = 'sunpath' | 'explorer' | 'wind' | 'windrose' | 'utci';

interface ActiveChart {
  id: string;
  type: ChartType;
}

export type UnitSystem = 'metric' | 'imperial';

const GRID_BREAKPOINTS = { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 };
const GRID_COLS = { lg: 12, md: 12, sm: 12, xs: 12, xxs: 12 };
const GRID_MARGIN: [number, number] = [10, 10];

export default function App() {
  const [selectedFiles, setSelectedFiles] = useState<ParsedEPW[]>([]);
  const [isSelectingFile, setIsSelectingFile] = useState(false);
  const [viewMode, setViewMode] = useState<'single' | 'comparison'>('single');
  const [showDiffTable, setShowDiffTable] = useState(true);
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [showDifference, setShowDifference] = useState(false);
  const [differenceBaselineIndex, setDifferenceBaselineIndex] = useState(0);
  const [differenceCompareIndex, setDifferenceCompareIndex] = useState(1);
  
  const [currentBreakpoint, setCurrentBreakpoint] = useState('lg');
  const currentBreakpointRef = useRef('lg');
  
  useEffect(() => {
    currentBreakpointRef.current = currentBreakpoint;
  }, [currentBreakpoint]);

  const handleBreakpointChange = useCallback((newBreakpoint: string) => {
    if (newBreakpoint !== currentBreakpointRef.current) {
      setCurrentBreakpoint(newBreakpoint);
    }
  }, []);

  const [activeCharts, setActiveCharts] = useState<ActiveChart[]>([
    { id: 'initial-sunpath', type: 'sunpath' },
    { id: 'initial-explorer', type: 'explorer' },
    { id: 'initial-utci', type: 'utci' },
    { id: 'initial-wind', type: 'wind' },
    { id: 'initial-windrose', type: 'windrose' }
  ]);
  const [layouts, setLayouts] = useState<Layouts>({
    lg: [
      { i: 'initial-sunpath', x: 0, y: 0, w: 3, h: 40, minW: 2, minH: 10 },
      { i: 'initial-explorer', x: 3, y: 0, w: 3, h: 40, minW: 2, minH: 10 },
      { i: 'initial-utci', x: 6, y: 0, w: 3, h: 40, minW: 2, minH: 10 },
      { i: 'initial-wind', x: 9, y: 0, w: 3, h: 40, minW: 2, minH: 10 },
      { i: 'initial-windrose', x: 0, y: 40, w: 3, h: 40, minW: 2, minH: 10 }
    ],
    md: [
      { i: 'initial-sunpath', x: 0, y: 0, w: 4, h: 40, minW: 2, minH: 10 },
      { i: 'initial-explorer', x: 4, y: 0, w: 4, h: 40, minW: 2, minH: 10 },
      { i: 'initial-utci', x: 8, y: 0, w: 4, h: 40, minW: 2, minH: 10 },
      { i: 'initial-wind', x: 0, y: 40, w: 4, h: 40, minW: 2, minH: 10 },
      { i: 'initial-windrose', x: 4, y: 40, w: 4, h: 40, minW: 2, minH: 10 }
    ],
    sm: [
      { i: 'initial-sunpath', x: 0, y: 0, w: 6, h: 40, minW: 2, minH: 10 },
      { i: 'initial-explorer', x: 6, y: 0, w: 6, h: 40, minW: 2, minH: 10 },
      { i: 'initial-utci', x: 0, y: 40, w: 6, h: 40, minW: 2, minH: 10 },
      { i: 'initial-wind', x: 6, y: 40, w: 6, h: 40, minW: 2, minH: 10 },
      { i: 'initial-windrose', x: 0, y: 80, w: 6, h: 40, minW: 2, minH: 10 }
    ]
  });
  const [customGradients, setCustomGradients] = useState<GradientDef[]>([]);
  const [showGradientModal, setShowGradientModal] = useState(false);
  const [scale, setScale] = useState(1);
  const scaleRef = useRef(1);

  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      let newScale = 1;
      if (width < 640) newScale = 0.7;
      else if (width < 1024) newScale = 0.85;
      else if (width < 1440) newScale = 1;
      else newScale = 1.1;
      
      setScale(newScale);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
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
  };

  const allGradients = useMemo(() => [...GRADIENTS, ...customGradients], [customGradients]);

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
        if (newFiles.length > 1) {
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
      // Temporarily hide scrollbars for capture
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
        
        // Create an image element to get dimensions
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
      // Restore overflow in case of error
      element.style.overflow = 'auto';
    }
  };

  const addChart = (type: ChartType) => {
    const newId = `${type}-${Date.now()}`;
    setActiveCharts(prev => [...prev, { id: newId, type }]);
    setLayouts(prev => {
      const newLayouts = { ...prev };
      Object.keys(newLayouts).forEach(key => {
        const layout = newLayouts[key] || [];
        const maxY = Math.max(0, ...layout.map(l => l.y + l.h));
        const w = (key === 'lg') ? 3 : (key === 'md') ? 4 : (key === 'sm') ? 6 : (key === 'xs') ? 6 : 12;
        newLayouts[key] = [...layout, { i: newId, x: 0, y: maxY, w, h: 40, minW: 2, minH: 10 }];
      });
      lastLayoutsRef.current = newLayouts;
      return newLayouts;
    });
  };

  const removeChart = (id: string) => {
    setActiveCharts(prev => prev.filter(chart => chart.id !== id));
    setLayouts(prev => {
      const newLayouts = { ...prev };
      Object.keys(newLayouts).forEach(key => {
        newLayouts[key] = newLayouts[key].filter(l => l.i !== id);
      });
      lastLayoutsRef.current = newLayouts;
      return newLayouts;
    });
  };

  const lastHeightUpdate = useRef<Record<string, { height: number, time: number, settleCount: number }>>({});

  const isDraggingRef = useRef(false);

  const handleChartHeightChange = useCallback((id: string, height: number) => {
    // Don't update height if we're in mobile view or currently dragging/resizing
    if (scaleRef.current < 0.8 || isDraggingRef.current) return; 
    
    const now = Date.now();
    const last = lastHeightUpdate.current[id];
    
    // If we've seen this exact height (within 15px) 2+ times, it's settled — ignore further updates
    if (last && Math.abs(last.height - height) < 15) {
      last.settleCount = (last.settleCount || 0) + 1;
      if (last.settleCount >= 2) return; // Settled, stop updating
    }
    
    // Rate-limit: only update every 2s for small changes
    if (last && now - last.time < 2000 && Math.abs(last.height - height) < 40) {
      return;
    }
    
    lastHeightUpdate.current[id] = { height, time: now, settleCount: 0 };

    // Use a larger timeout to let the state settle
    setTimeout(() => {
      if (isDraggingRef.current) return;

      setLayouts(prev => {
        const bp = currentBreakpointRef.current;
        const layout = prev[bp];
        if (!layout) return prev;

        const ROW_HEIGHT = 10;
        const MARGIN = 10;
        
        // Calculate exact needed rows, ceiling to ensure no cropping
        let neededH = Math.ceil(height / (ROW_HEIGHT + MARGIN)) + 1;
        
        const itemIndex = layout.findIndex(l => l.i === id);
        if (itemIndex !== -1) {
          // Respect minH to prevent infinite loops with react-grid-layout
          const minH = layout[itemIndex].minH || 10;
          neededH = Math.max(neededH, minH);

          // Only update if the change is at least 2 rows to prevent oscillation
          if (Math.abs(layout[itemIndex].h - neededH) >= 2) {
            const newLayout = [...layout];
            newLayout[itemIndex] = { ...newLayout[itemIndex], h: neededH };
            
            const normalizeLayout = (l: Layout[]) => l.map(i => ({ i: i.i, x: i.x, y: i.y, w: i.w, h: i.h })).sort((a, b) => a.i.localeCompare(b.i));
            if (JSON.stringify(normalizeLayout(prev[bp])) === JSON.stringify(normalizeLayout(newLayout))) return prev;
            
            const nextLayouts = { ...prev, [bp]: newLayout };
            lastLayoutsRef.current = nextLayouts;
            return nextLayouts;
          }
        }

        return prev;
      });
    }, 500);
  }, []);

  const lastLayoutsRef = useRef<Layouts>(layouts);
  const handleLayoutChange = useCallback((currentLayout: Layout[], allLayouts: Layouts) => {
    // Normalize layouts for comparison (only keep essential properties)
    const normalize = (lts: Layouts) => {
      const result: any = {};
      Object.keys(lts).forEach(key => {
        // SORT by ID for stability
        result[key] = lts[key].map(l => ({ i: l.i, x: l.x, y: l.y, w: l.w, h: l.h })).sort((a, b) => a.i.localeCompare(b.i));
      });
      return JSON.stringify(result);
    };

    if (normalize(lastLayoutsRef.current) === normalize(allLayouts)) return;
    
    lastLayoutsRef.current = allLayouts;
    
    // Break synchronous loop with a small delay
    setTimeout(() => {
      setLayouts(allLayouts);
    }, 0);
  }, []);

  const renderChartForFile = (chart: ActiveChart, fileData: ParsedEPW, compareFileData?: ParsedEPW, isDiffMode: boolean = false, isStacked: boolean = false) => {
    const isDiffExplorer = chart.id === 'diff-explorer';
    const onRemoveHandler = isDiffExplorer ? () => setShowDiffTable(false) : () => removeChart(chart.id);

    switch (chart.type) {
      case 'sunpath':
        return (
          <SunPath
            metadata={fileData.metadata}
            data={fileData.data}
            compareData={compareFileData?.data}
            showDifference={isDiffMode}
            stackedComparison={isStacked}
            variables={fileData.variables}
            onRemove={onRemoveHandler}
            gradients={allGradients}
            filter={globalFilter}
            unitSystem={unitSystem}
            heatmapTextColor={heatmapTextColor}
            theme={theme}
            setShowGradientModal={setShowGradientModal}
            exportMode={exportMode}
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
            onRemove={onRemoveHandler}
            gradients={allGradients}
            filter={globalFilter}
            unitSystem={unitSystem}
            heatmapTextColor={heatmapTextColor}
            theme={theme}
            setShowGradientModal={setShowGradientModal}
            exportMode={exportMode}
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
            onRemove={onRemoveHandler}
            gradients={allGradients}
            filter={globalFilter}
            unitSystem={unitSystem}
            heatmapTextColor={heatmapTextColor}
            theme={theme}
            setShowGradientModal={setShowGradientModal}
            exportMode={exportMode}
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
            onRemove={onRemoveHandler}
            gradients={allGradients}
            filter={globalFilter}
            unitSystem={unitSystem}
            heatmapTextColor={heatmapTextColor}
            theme={theme}
            setShowGradientModal={setShowGradientModal}
            exportMode={exportMode}
          />
        );
      case 'utci':
        return (
          <UtciExplorer
            data={fileData.data}
            compareData={compareFileData?.data}
            showDifference={isDiffMode}
            stackedComparison={isStacked}
            onRemove={onRemoveHandler}
            gradients={allGradients}
            filter={globalFilter}
            unitSystem={unitSystem}
            heatmapTextColor={heatmapTextColor}
            theme={theme}
            setShowGradientModal={setShowGradientModal}
            exportMode={exportMode}
          />
        );
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
      {/* Top Navigation Bar */}
      <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b px-2 sm:px-4 py-2 flex items-center justify-between gap-2 z-20 flex-shrink-0 shadow-sm transition-colors duration-300`}>
        <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
          <button 
            onClick={() => {
              setSelectedFiles([]);
              setShowDifference(false);
            }}
            className={`p-1.5 sm:p-2 rounded-full transition-colors border border-transparent shadow-hard-sm shrink-0 ${theme === 'dark' ? 'hover:bg-gray-700 text-gray-300 hover:border-gray-600' : 'hover:bg-gray-100 text-gray-600 hover:border-gray-200'}`}
            title="Back to Map"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 overflow-x-auto hide-scrollbar py-1">
            {selectedFiles.map((file, index) => (
              <div 
                key={index} 
                className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full border transition-all cursor-pointer shrink-0 ${
                  viewMode === 'single' && activeFileIndex === index 
                    ? 'bg-blue-600 border-blue-500 text-white shadow-md z-10' 
                    : (theme === 'dark' ? 'bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600' : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100')
                }`}
                onClick={() => {
                  if (viewMode === 'single') {
                    setActiveFileIndex(index);
                  }
                }}
              >
                <MapPin className={`w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0 ${viewMode === 'single' && activeFileIndex === index ? 'text-blue-200' : (theme === 'dark' ? 'text-gray-400' : 'text-gray-500')}`} />
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
                  className={`ml-0.5 hover:text-red-500 transition-colors ${viewMode === 'single' && activeFileIndex === index ? 'text-blue-200' : 'text-gray-400'}`}
                  title="Remove file"
                >
                  <X className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                </button>
              </div>
            ))}
            <button
              onClick={() => setIsSelectingFile(true)}
              className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full border border-dashed text-xs sm:text-sm font-medium transition-colors shrink-0 ${theme === 'dark' ? 'border-gray-600 text-gray-400 hover:text-gray-200 hover:border-gray-400' : 'border-gray-300 text-gray-500 hover:text-gray-700 hover:border-gray-400'}`}
            >
              <Plus className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> Add
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2 shrink min-w-0">
          {selectedFiles.length > 1 && (
            <div className={`flex items-center p-0.5 sm:p-1 rounded-lg sm:rounded-xl border shrink min-w-0 ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-200'}`}>
              <button
                onClick={() => {
                  setViewMode('single');
                  setShowDifference(false);
                }}
                className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-md sm:rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all shrink min-w-0 ${
                  viewMode === 'single'
                    ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
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
                className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-md sm:rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all shrink min-w-0 ${
                  viewMode === 'comparison'
                    ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                Comparison
              </button>
            </div>
          )}

          <div className={`h-5 sm:h-6 w-px mx-0.5 sm:mx-1 hidden xs:block shrink-0 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'}`}></div>

          <button
            onClick={() => setShowSettingsModal(true)}
            className={`p-1.5 sm:p-2 border active:scale-95 rounded-lg transition-all shadow-hard-sm shrink-0 ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}
            title="Global Settings"
          >
            <Settings2 className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Gradient Creator Modal */}
      {showGradientModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-hard-xl max-w-md w-full p-6 border border-gray-200">
            <h3 className="text-lg font-bold mb-4">Create Custom Gradient</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input 
                  type="text" 
                  value={newGradientName}
                  onChange={e => setNewGradientName(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
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
                        className="w-8 h-8 rounded cursor-pointer border-0 p-0"
                      />
                      <input 
                        type="text" 
                        value={color}
                        onChange={e => {
                          const newColors = [...newGradientColors];
                          newColors[i] = e.target.value;
                          setNewGradientColors(newColors);
                        }}
                        className="flex-1 border border-gray-300 rounded-md px-3 py-1 text-sm font-mono"
                      />
                      {newGradientColors.length > 2 && (
                        <button 
                          onClick={() => setNewGradientColors(newGradientColors.filter((_, idx) => idx !== i))}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          &times;
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button 
                  onClick={() => setNewGradientColors([...newGradientColors, '#ffffff'])}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  + Add Color
                </button>
              </div>
              <div className="pt-4 flex justify-end gap-2">
                <button 
                  onClick={() => setShowGradientModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-md shadow-hard-sm border border-gray-200"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleAddGradient}
                  disabled={!newGradientName || newGradientColors.length < 2}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50 shadow-hard-md"
                >
                  Save Gradient
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dashboard Area */}
      <div 
        id="dashboard-area"
        className={`flex-1 overflow-y-scroll relative transition-colors duration-500 ${exportMode ? 'bg-white' : ''}`}
        style={{ backgroundColor: exportMode ? '#ffffff' : (theme === 'dark' ? '#121211' : '#f9f8f6') }}
      >
        <div className={`max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 ${exportMode ? 'bg-white' : ''}`}>
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

          {activeCharts.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center text-gray-400">
              <div className="w-24 h-24 mb-6 rounded-full bg-gray-100 flex items-center justify-center">
                <Plus className="w-10 h-10 text-gray-300" />
              </div>
              <h3 className="text-xl font-medium text-gray-600 mb-2">Your Dashboard is Empty</h3>
              <p className="text-sm max-w-md text-center">
                Add widgets below to start exploring the climate data for {selectedFiles[activeFileIndex]?.metadata.city}.
              </p>
            </div>
          ) : viewMode === 'comparison' && selectedFiles.length >= 2 ? (
            <div className="flex flex-col gap-4 h-full min-h-[800px]">
              {/* Difference Mode Controls */}
              <div className={`flex flex-wrap items-center gap-4 p-4 rounded-xl border shadow-sm ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-500">Baseline:</span>
                  <select 
                    value={differenceBaselineIndex}
                    onChange={(e) => setDifferenceBaselineIndex(Number(e.target.value))}
                    className={`text-sm rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50 ${theme === 'dark' ? 'bg-gray-700 text-white border-gray-600' : 'bg-white text-gray-900'}`}
                  >
                    {selectedFiles.map((f, i) => (
                      <option key={i} value={i}>{f.metadata.city}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-500">Comparison:</span>
                  <select 
                    value={differenceCompareIndex}
                    onChange={(e) => setDifferenceCompareIndex(Number(e.target.value))}
                    className={`text-sm rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50 ${theme === 'dark' ? 'bg-gray-700 text-white border-gray-600' : 'bg-white text-gray-900'}`}
                  >
                    {selectedFiles.map((f, i) => (
                      <option key={i} value={i}>{f.metadata.city}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1"></div>
                {!showDiffTable && (
                  <button 
                    onClick={() => setShowDiffTable(true)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all shadow-hard-sm border active:scale-95 ${
                      theme === 'dark' ? 'bg-blue-900/40 text-blue-400 border-blue-800 hover:bg-blue-900/60' : 'bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100'
                    }`}
                  >
                    <BarChart3 className="w-4 h-4" />
                    Show Difference
                  </button>
                )}
                {selectedFiles.length < 2 && (
                  <div className="text-sm text-orange-500 font-medium flex items-center gap-1">
                    <Info className="w-4 h-4" />
                    Please add another location to compare.
                  </div>
                )}
              </div>

              {selectedFiles.length >= 2 && (
                <div className="flex-1 w-full overflow-x-auto min-w-0 hide-scrollbar pb-4 pt-2">
                  <div className="comparison-grid grid gap-3 h-full items-stretch" style={{ gridTemplateColumns: showDiffTable ? '2fr 1fr 1fr 1fr 1fr 1fr' : '1fr 1fr 1fr 1fr 1fr', minWidth: showDiffTable ? '1800px' : '1500px' }}>
                    {/* Column 1-2: Data Explorer Difference (spans 2fr) */}
                    {showDiffTable && (
                      <div className={`flex flex-col overflow-visible ${exportMode ? 'bg-white' : `rounded-2xl border shadow-hard-xl ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}`}>
                        <div className="w-full overflow-hidden">
                          {renderChartForFile({ id: 'diff-explorer', type: 'explorer' }, selectedFiles[differenceBaselineIndex], selectedFiles[differenceCompareIndex], true, false)}
                        </div>
                      </div>
                    )}
                    
                    {/* Sun Path Column */}
                    <div className="flex flex-col gap-2 overflow-visible">
                      <div className={`flex flex-col overflow-visible ${exportMode ? 'bg-white' : `rounded-xl border shadow-hard-lg ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}`}>
                        <div className="px-2 py-1 flex items-center gap-1.5" style={{ borderLeft: '3px solid #3b82f6' }}>
                          <span className={`text-[10px] font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>{selectedFiles[differenceBaselineIndex]?.metadata.city}</span>
                        </div>
                        <div className="comparison-chart-wrap overflow-hidden">
                          {renderChartForFile({ id: 'cmp-base-sunpath', type: 'sunpath' }, selectedFiles[differenceBaselineIndex])}
                        </div>
                      </div>
                      <div className={`flex flex-col overflow-visible ${exportMode ? 'bg-white' : `rounded-xl border shadow-hard-lg ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}`}>
                        <div className="px-2 py-1 flex items-center gap-1.5" style={{ borderLeft: '3px solid #9ca3af' }}>
                          <span className={`text-[10px] font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{selectedFiles[differenceCompareIndex]?.metadata.city}</span>
                        </div>
                        <div className="comparison-chart-wrap overflow-hidden">
                          {renderChartForFile({ id: 'cmp-comp-sunpath', type: 'sunpath' }, selectedFiles[differenceCompareIndex])}
                        </div>
                      </div>
                    </div>
                    {/* Data Explorer Column */}
                    <div className="flex flex-col gap-2 overflow-visible">
                      <div className={`flex flex-col overflow-visible ${exportMode ? 'bg-white' : `rounded-xl border shadow-hard-lg ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}`}>
                        <div className="px-2 py-1 flex items-center gap-1.5" style={{ borderLeft: '3px solid #3b82f6' }}>
                          <span className={`text-[10px] font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>{selectedFiles[differenceBaselineIndex]?.metadata.city}</span>
                        </div>
                        <div className="comparison-chart-wrap overflow-hidden">
                          {renderChartForFile({ id: 'cmp-base-explorer', type: 'explorer' }, selectedFiles[differenceBaselineIndex])}
                        </div>
                      </div>
                      <div className={`flex flex-col overflow-visible ${exportMode ? 'bg-white' : `rounded-xl border shadow-hard-lg ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}`}>
                        <div className="px-2 py-1 flex items-center gap-1.5" style={{ borderLeft: '3px solid #9ca3af' }}>
                          <span className={`text-[10px] font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{selectedFiles[differenceCompareIndex]?.metadata.city}</span>
                        </div>
                        <div className="comparison-chart-wrap overflow-hidden">
                          {renderChartForFile({ id: 'cmp-comp-explorer', type: 'explorer' }, selectedFiles[differenceCompareIndex])}
                        </div>
                      </div>
                    </div>
                    {/* UTCI Column */}
                    <div className="flex flex-col gap-2 overflow-visible">
                      <div className={`flex flex-col overflow-visible ${exportMode ? 'bg-white' : `rounded-xl border shadow-hard-lg ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}`}>
                        <div className="px-2 py-1 flex items-center gap-1.5" style={{ borderLeft: '3px solid #3b82f6' }}>
                          <span className={`text-[10px] font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>{selectedFiles[differenceBaselineIndex]?.metadata.city}</span>
                        </div>
                        <div className="comparison-chart-wrap overflow-hidden">
                          {renderChartForFile({ id: 'cmp-base-utci', type: 'utci' }, selectedFiles[differenceBaselineIndex])}
                        </div>
                      </div>
                      <div className={`flex flex-col overflow-visible ${exportMode ? 'bg-white' : `rounded-xl border shadow-hard-lg ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}`}>
                        <div className="px-2 py-1 flex items-center gap-1.5" style={{ borderLeft: '3px solid #9ca3af' }}>
                          <span className={`text-[10px] font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{selectedFiles[differenceCompareIndex]?.metadata.city}</span>
                        </div>
                        <div className="comparison-chart-wrap overflow-hidden">
                          {renderChartForFile({ id: 'cmp-comp-utci', type: 'utci' }, selectedFiles[differenceCompareIndex])}
                        </div>
                      </div>
                    </div>
                    {/* Wind Explorer Column */}
                    <div className="flex flex-col gap-2 overflow-visible">
                      <div className={`flex flex-col overflow-visible ${exportMode ? 'bg-white' : `rounded-xl border shadow-hard-lg ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}`}>
                        <div className="px-2 py-1 flex items-center gap-1.5" style={{ borderLeft: '3px solid #3b82f6' }}>
                          <span className={`text-[10px] font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>{selectedFiles[differenceBaselineIndex]?.metadata.city}</span>
                        </div>
                        <div className="comparison-chart-wrap overflow-hidden">
                          {renderChartForFile({ id: 'cmp-base-wind', type: 'wind' }, selectedFiles[differenceBaselineIndex])}
                        </div>
                      </div>
                      <div className={`flex flex-col overflow-visible ${exportMode ? 'bg-white' : `rounded-xl border shadow-hard-lg ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}`}>
                        <div className="px-2 py-1 flex items-center gap-1.5" style={{ borderLeft: '3px solid #9ca3af' }}>
                          <span className={`text-[10px] font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{selectedFiles[differenceCompareIndex]?.metadata.city}</span>
                        </div>
                        <div className="comparison-chart-wrap overflow-hidden">
                          {renderChartForFile({ id: 'cmp-comp-wind', type: 'wind' }, selectedFiles[differenceCompareIndex])}
                        </div>
                      </div>
                    </div>
                    {/* Wind Rose Column */}
                    <div className="flex flex-col gap-2 overflow-visible">
                      <div className={`flex flex-col overflow-visible ${exportMode ? 'bg-white' : `rounded-xl border shadow-hard-lg ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}`}>
                        <div className="px-2 py-1 flex items-center gap-1.5" style={{ borderLeft: '3px solid #3b82f6' }}>
                          <span className={`text-[10px] font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>{selectedFiles[differenceBaselineIndex]?.metadata.city}</span>
                        </div>
                        <div className="comparison-chart-wrap overflow-hidden">
                          {renderChartForFile({ id: 'cmp-base-windrose', type: 'windrose' }, selectedFiles[differenceBaselineIndex])}
                        </div>
                      </div>
                      <div className={`flex flex-col overflow-visible ${exportMode ? 'bg-white' : `rounded-xl border shadow-hard-lg ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}`}>
                        <div className="px-2 py-1 flex items-center gap-1.5" style={{ borderLeft: '3px solid #9ca3af' }}>
                          <span className={`text-[10px] font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{selectedFiles[differenceCompareIndex]?.metadata.city}</span>
                        </div>
                        <div className="comparison-chart-wrap overflow-hidden">
                          {renderChartForFile({ id: 'cmp-comp-windrose', type: 'windrose' }, selectedFiles[differenceCompareIndex])}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : scale < 0.8 ? (
            /* Mobile View: Simple List for Smart Height */
            <div className="flex flex-col gap-8 pb-12">
              {activeCharts.map(chart => (
                <div 
                  key={chart.id} 
                  className={`w-full flex flex-col overflow-visible ${
                    exportMode 
                      ? 'bg-white border-none shadow-none' 
                      : `rounded-2xl border shadow-hard-xl ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`
                  }`}
                >
                  <div className={`flex-1 overflow-visible ${exportMode ? '' : 'rounded-2xl'}`}>
                    <ScaledWrapper>
                      {renderChartForFile(chart, selectedFiles[activeFileIndex])}
                    </ScaledWrapper>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Desktop View: Grid Layout */
    <ResponsiveGridLayout
      className="layout"
      layouts={layouts}
      breakpoints={GRID_BREAKPOINTS}
      cols={GRID_COLS}
      rowHeight={10}
      onLayoutChange={handleLayoutChange}
      onBreakpointChange={handleBreakpointChange}
      isDraggable={scale > 0.8}
      {...({ draggableHandle: ".drag-handle" } as any)}
      onDragStart={() => { isDraggingRef.current = true; }}
      onDragStop={() => { isDraggingRef.current = false; }}
      onResizeStart={() => { isDraggingRef.current = true; }}
      onResizeStop={() => { isDraggingRef.current = false; }}
      margin={GRID_MARGIN}
    >
              {activeCharts.map(chart => (
                <div key={chart.id} className={`w-full h-full flex flex-col overflow-hidden ${
                  exportMode 
                    ? 'bg-white border-none shadow-none' 
                    : `rounded-xl border shadow-hard-lg ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`
                }`}>
                  {!exportMode && (
                    <div className={`drag-handle cursor-move w-full h-2 transition-colors flex items-center justify-center ${theme === 'dark' ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-50 hover:bg-gray-100'} sm:flex hidden`}>
                      <div className={`w-8 h-0.5 rounded-full ${theme === 'dark' ? 'bg-gray-600' : 'bg-gray-200'}`}></div>
                    </div>
                  )}
                  <div className="flex-1 h-full overflow-visible relative">
                    <ScaledWrapper onHeightChange={(h) => handleChartHeightChange(chart.id, h)}>
                      {renderChartForFile(chart, selectedFiles[activeFileIndex])}
                    </ScaledWrapper>
                  </div>
                </div>
              ))}
            </ResponsiveGridLayout>
          )}

          {/* Floating Action Buttons */}
          {!exportMode && (
            <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-3">
              <div className="relative" ref={summaryStatsRef}>
                <button
                  onClick={() => setShowSummaryStats(!showSummaryStats)}
                  className={`w-12 h-12 flex items-center justify-center rounded-full shadow-hard-xl border transition-all hover:scale-110 active:scale-95 ${
                    showSummaryStats 
                      ? (theme === 'dark' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-blue-600 border-blue-500 text-white') 
                      : (theme === 'dark' ? 'bg-gray-800 border-gray-700 text-blue-400' : 'bg-white border-gray-200 text-blue-600')
                  }`}
                  title="Overall Averages"
                >
                  <Activity className="w-6 h-6" />
                </button>

                {showSummaryStats && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowSummaryStats(false)}>
                    <div className={`p-6 rounded-xl shadow-hard-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto ${theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white'}`} onClick={e => e.stopPropagation()}>
                      <div className="flex justify-between items-center mb-4">
                        <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Overall Averages</h3>
                        <button onClick={() => setShowSummaryStats(false)} className={`p-1 rounded-md ${theme === 'dark' ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
                          <X className="w-5 h-5" />
                        </button>
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
                onClick={() => setExportMode(true)}
                className={`w-12 h-12 flex items-center justify-center rounded-full shadow-hard-xl border transition-all hover:scale-110 active:scale-95 ${
                  theme === 'dark' ? 'bg-gray-800 border-gray-700 text-green-400' : 'bg-white border-gray-200 text-green-600'
                }`}
                title="Enable Export Mode"
              >
                <Download className="w-6 h-6" />
              </button>
            </div>
          )}

          {exportMode && (
            <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-3">
              <button
                onClick={() => handleExport('pdf')}
                className="w-12 h-12 flex items-center justify-center bg-red-600 text-white rounded-full shadow-hard-xl hover:scale-110 active:scale-95 transition-all"
                title="Export PDF"
              >
                <FileText className="w-6 h-6" />
              </button>
              <button
                onClick={() => handleExport('jpeg')}
                className="w-12 h-12 flex items-center justify-center bg-blue-600 text-white rounded-full shadow-hard-xl hover:scale-110 active:scale-95 transition-all"
                title="Export JPEG"
              >
                <FileImage className="w-6 h-6" />
              </button>
              <button
                onClick={() => setExportMode(false)}
                className="w-12 h-12 flex items-center justify-center bg-gray-800 text-white rounded-full shadow-hard-xl hover:scale-110 active:scale-95 transition-all"
                title="Exit Export Mode"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          )}

          {/* Add Chart Buttons (at the bottom of scroll) */}
          {!exportMode && (
            <div className="pt-12 pb-20">
              <div className={`flex flex-col items-center gap-6 p-8 rounded-3xl border-2 border-dashed transition-colors ${theme === 'dark' ? 'bg-gray-800/30 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
              <div className="text-center">
                <h4 className={`text-lg font-semibold mb-1 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>Add More Analysis</h4>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Expand your dashboard with additional visualizations</p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-6">
                <div className="flex flex-col items-center gap-2">
                  <button
                    onClick={() => addChart('sunpath')}
                    className={`w-16 h-16 flex items-center justify-center rounded-2xl transition-all hover:scale-110 shadow-hard-md border-2 ${
                      theme === 'dark' 
                        ? 'bg-amber-900/20 border-amber-800 text-amber-400 hover:bg-amber-900/40' 
                        : 'bg-amber-50 border-amber-200 text-amber-600 hover:bg-amber-100'
                    }`}
                    title="Add Sun Path"
                  >
                    <Sun className="w-8 h-8" />
                  </button>
                  <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Sun Path</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <button
                    onClick={() => addChart('explorer')}
                    className={`w-16 h-16 flex items-center justify-center rounded-2xl transition-all hover:scale-110 shadow-hard-md border-2 ${
                      theme === 'dark' 
                        ? 'bg-blue-900/20 border-blue-800 text-blue-400 hover:bg-blue-900/40' 
                        : 'bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100'
                    }`}
                    title="Add Data Explorer"
                  >
                    <BarChart2 className="w-8 h-8" />
                  </button>
                  <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Explorer</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <button
                    onClick={() => addChart('wind')}
                    className={`w-16 h-16 flex items-center justify-center rounded-2xl transition-all hover:scale-110 shadow-hard-md border-2 ${
                      theme === 'dark' 
                        ? 'bg-teal-900/20 border-teal-800 text-teal-400 hover:bg-teal-900/40' 
                        : 'bg-teal-50 border-teal-200 text-teal-600 hover:bg-teal-100'
                    }`}
                    title="Add Wind Explorer"
                  >
                    <Wind className="w-8 h-8" />
                  </button>
                  <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Wind Chart</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <button
                    onClick={() => addChart('windrose')}
                    className={`w-16 h-16 flex items-center justify-center rounded-2xl transition-all hover:scale-110 shadow-hard-md border-2 ${
                      theme === 'dark' 
                        ? 'bg-emerald-900/20 border-emerald-800 text-emerald-400 hover:bg-emerald-900/40' 
                        : 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100'
                    }`}
                    title="Add Wind Rose"
                  >
                    <Wind className="w-8 h-8" />
                  </button>
                  <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Wind Rose</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <button
                    onClick={() => addChart('utci')}
                    className={`w-16 h-16 flex items-center justify-center rounded-2xl transition-all hover:scale-110 shadow-hard-md border-2 ${
                      theme === 'dark' 
                        ? 'bg-orange-900/20 border-orange-800 text-orange-400 hover:bg-orange-900/40' 
                        : 'bg-orange-50 border-orange-200 text-orange-600 hover:bg-orange-100'
                    }`}
                    title="Add UTCI Comfort"
                  >
                    <ThermometerSun className="w-8 h-8" />
                  </button>
                  <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">UTCI</span>
                </div>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
