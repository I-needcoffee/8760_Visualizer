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
import { MapPin, ArrowLeft, Plus, Sun, BarChart2, Wind, ThermometerSun, Activity, Settings2, X, Compass, BarChart3, Radar, Download, FileJson, FileImage, FileText, CloudLightning, Info } from 'lucide-react';
import { GRADIENTS } from './lib/constants';
import { GradientDef } from './components/InteractiveLegend';
import { ParsedEPW } from './lib/epwParser';

export type ChartType = 'sunpath' | 'explorer' | 'wind' | 'windrose' | 'utci' | 'empty';
export type LayoutMode = 'hero-left' | 'grid-4x2' | 'focus-deep';

export interface ChartConfig {
  id: string;
  type: ChartType;
  variable?: string;
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
  };

  const allGradients = useMemo(() => [...GRADIENTS, ...customGradients], [customGradients]);

  const [layoutMode, setLayoutMode] = useState<LayoutMode>('hero-left');
  const [slots, setSlots] = useState<ChartConfig[]>([
    { id: 'sunpath-1', type: 'sunpath' },
    { id: 'explorer-1', type: 'explorer' },
    { id: 'utci-1', type: 'utci' },
    { id: 'wind-1', type: 'wind' },
    { id: 'windrose-1', type: 'windrose' },
    { id: 'explorer-2', type: 'explorer', variable: 'Relative Humidity' },
    { id: 'explorer-3', type: 'explorer', variable: 'Global Horizontal Radiation' }
  ]);
  const [comparisonSlots, setComparisonSlots] = useState<ChartConfig[]>([
    { id: 'c-explorer-temp', type: 'explorer' },
    { id: 'c-utci', type: 'utci' },
    { id: 'c-wind', type: 'wind' }
  ]);

  const handleChangeType = useCallback((id: string, newType: ChartType) => {
    setSlots(prev => prev.map(s => s.id === id ? { ...s, type: newType } : s));
    setComparisonSlots(prev => prev.map(s => s.id === id ? { ...s, type: newType } : s));
  }, []);

  const handleRemoveChart = useCallback((id: string) => {
    setSlots(prev => prev.filter(s => s.id !== id));
    setComparisonSlots(prev => prev.filter(s => s.id !== id));
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

  const renderChartForFile = (chart: ChartConfig, fileData: ParsedEPW, compareFileData?: ParsedEPW, isDiffMode: boolean = false, isStacked: boolean = false) => {
    const isDiffExplorer = chart.id === 'diff-explorer';
    const onRemoveHandler = isDiffExplorer ? () => setShowDiffTable(false) : () => handleRemoveChart(chart.id);

    switch (chart.type) {
      case 'sunpath':
        return (
          <SunPath chartId={chart.id} onChangeType={handleChangeType} 
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
          <DataExplorer chartId={chart.id} onChangeType={handleChangeType} 
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
          <WindExplorer chartId={chart.id} onChangeType={handleChangeType} 
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
          <WindRose chartId={chart.id} onChangeType={handleChangeType} 
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
          <UtciExplorer chartId={chart.id} onChangeType={handleChangeType} 
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
            <div className={`flex items-center p-0.5 sm:p-1 rounded-lg sm:rounded-xl border shrink min-w-0 ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200 shadow-hard-sm'}`}>
              <button
                onClick={() => {
                  setViewMode('single');
                  setShowDifference(false);
                }}
                className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-md sm:rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all shrink min-w-0 ${
                  viewMode === 'single'
                    ? 'bg-blue-600 text-white shadow-md'
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
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                Compare
              </button>
            </div>
          )}

          {viewMode === 'single' && (
            <div className={`flex items-center p-0.5 sm:p-1 rounded-lg sm:rounded-xl border shrink min-w-0 ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200 shadow-hard-sm'}`}>
              <button
                onClick={() => setLayoutMode('hero-left')}
                className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-md sm:rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all shrink min-w-0 ${
                  layoutMode === 'hero-left'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                Hero
              </button>
              <button
                onClick={() => setLayoutMode('grid-4x2')}
                className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-md sm:rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all shrink min-w-0 ${
                  layoutMode === 'grid-4x2'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                Grid
              </button>
              <button
                onClick={() => setLayoutMode('focus-deep')}
                className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-md sm:rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all shrink min-w-0 ${
                  layoutMode === 'focus-deep'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                Detail
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
                        className="flex-1 border border-gray-300 rounded-md px-2 py-1 text-sm font-mono"
                      />
                      {newGradientColors.length > 2 && (
                        <button 
                          onClick={() => setNewGradientColors(prev => prev.filter((_, idx) => idx !== i))}
                          className="text-red-500 hover:text-red-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button 
                    onClick={() => setNewGradientColors(prev => [...prev, '#ffffff'])}
                    className="text-xs font-bold text-blue-500 hover:text-blue-600 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add Color
                  </button>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-8">
              <button 
                onClick={() => setShowGradientModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button 
                onClick={handleAddGradient}
                className="px-6 py-2 bg-blue-600 text-white text-sm font-bold rounded-full shadow-hard-md hover:bg-blue-700 transition-colors"
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

          {selectedFiles.length >= 2 && viewMode === 'comparison' ? (
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
              </div>

              <ComparisonModeLayout
                diffChartConfig={{ id: 'diff', type: 'explorer' }}
                stackedSlots={comparisonSlots}
                exportMode={exportMode}
                theme={theme}
                renderChart={(config, forceDiff, forceStacked) => renderChartForFile(config, selectedFiles[differenceBaselineIndex], selectedFiles[differenceCompareIndex], forceDiff || showDifference, forceStacked)}
                onSelectSlotType={(idx, type) => {
                  setComparisonSlots(prev => {
                    const next = [...prev];
                    next[idx].type = type;
                    return next;
                  });
                }}
                onAddSlot={() => {
                  setComparisonSlots(prev => [...prev, { id: `c${Date.now()}`, type: 'empty' }]);
                }}
              />
            </div>
          ) : (
            <SingleModeLayout
              slots={slots}
              layoutMode={layoutMode}
              exportMode={exportMode}
              theme={theme}
              renderChart={(config) => renderChartForFile(config, selectedFiles[activeFileIndex])}
              onSelectSlotType={(idx, type) => {
                setSlots(prev => {
                   const next = [...prev];
                   while (next.length <= idx) next.push({ id: `slot-${Date.now()}-${next.length}`, type: 'empty' });
                   next[idx].type = type;
                   return next;
                });
              }}
              onAddSlot={() => setSlots(prev => [...prev, { id: `slot-${Date.now()}`, type: 'empty' }])}
            />
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

          </div>
      </div>
    </div>
  );
}
