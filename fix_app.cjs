const fs = require('fs');

const path = './src/App.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Remove react-grid-layout imports
content = content.replace(/import ReactGridLayout.*?from 'react-grid-layout';\s*type Layout.*?ResponsiveGridLayout = WidthProvider\(Responsive\);\s*/gm, '');
content = content.replace(/import 'react-grid-layout.*?styles.css';\s*import 'react-resizable.*?styles.css';/g, '');

// 2. Change ActiveChart to ChartConfig
content = content.replace(/type ChartType = 'sunpath' \| 'explorer' \| 'wind' \| 'windrose' \| 'utci';/, 
  "export type ChartType = 'sunpath' | 'explorer' | 'wind' | 'windrose' | 'utci' | 'empty';\nexport type LayoutMode = 'hero-left' | 'grid-4x2' | 'focus-deep';");

content = content.replace(/interface ActiveChart \{\s*id: string;\s*type: ChartType;\s*\}/, 
  "export interface ChartConfig {\n  id: string;\n  type: ChartType;\n  variable?: string;\n}");

content = content.replace(
  "import { InteractiveLegend, GradientDef } from './components/InteractiveLegend';",
  "import { InteractiveLegend, GradientDef } from './components/InteractiveLegend';\nimport { SingleModeLayout } from './components/SingleModeLayout';\nimport { ComparisonModeLayout } from './components/ComparisonModeLayout';\nimport { LayoutTemplate } from 'lucide-react';"
);

// 3. Replace state
const stateToReplace = `  const [activeCharts, setActiveCharts] = useState<ActiveChart[]>([
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
  });`;

content = content.replace(stateToReplace, `  const [layoutMode, setLayoutMode] = useState<LayoutMode>('hero-left');
  const [slots, setSlots] = useState<ChartConfig[]>([
    { id: '1', type: 'sunpath' },
    { id: '2', type: 'explorer' },
    { id: '3', type: 'utci' },
    { id: '4', type: 'wind' },
    { id: '5', type: 'windrose' },
    { id: '6', type: 'explorer' },
    { id: '7', type: 'explorer' }
  ]);
  
  const [comparisonSlots, setComparisonSlots] = useState<ChartConfig[]>([
    { id: 'c1', type: 'sunpath' },
    { id: 'c2', type: 'explorer' },
    { id: 'c3', type: 'utci' },
    { id: 'c4', type: 'wind' },
    { id: 'c5', type: 'windrose' }
  ]);
`);

// 4. Remove handleLayoutChange, etc
content = content.replace(/const handleLayoutChange = useCallback.*?\}, \[\]\);/ms, '');
const isDraggingRefRegex = /const isDraggingRef = useRef\(false\);/g;
content = content.replace(isDraggingRefRegex, '');
content = content.replace(/const handleChartHeightChange = useCallback.*?\}, \[layouts\]\);/ms, '');

// 5. Update renderChartForFile
content = content.replace(/const renderChartForFile = \(chart: ActiveChart, fileData: ParsedEPW, compareFileData\?: ParsedEPW, isDiffMode: boolean = false\) => \{/, 
  "const renderChartForFile = (chart: ChartConfig, fileData: ParsedEPW, compareFileData?: ParsedEPW, isDiffMode: boolean = false, isStacked: boolean = false) => {");

content = content.replace(/<DataExplorer/g, '<DataExplorer chartId={chart.id} onChangeType={handleChangeType} stackedComparison={isStacked} ');
content = content.replace(/<SunPath/g,     '<SunPath chartId={chart.id} onChangeType={handleChangeType} stackedComparison={isStacked} ');
content = content.replace(/<UtciExplorer/g,'<UtciExplorer chartId={chart.id} onChangeType={handleChangeType} stackedComparison={isStacked} ');
content = content.replace(/<WindExplorer/g,'<WindExplorer chartId={chart.id} onChangeType={handleChangeType} stackedComparison={isStacked} ');
content = content.replace(/<WindRose/g,    '<WindRose chartId={chart.id} onChangeType={handleChangeType} stackedComparison={isStacked} ');

content = content.replace(/<ScaledWrapper.*?<\/ScaledWrapper>/g, '{renderChartForFile}');

// 6. Add layout toggle in top nav
const navTarget = "          <button\n            onClick={() => setShowSettingsModal(true)}";
const navInject = `          {viewMode === 'single' && (
             <div className={\`flex items-center p-0.5 sm:p-1 rounded-lg sm:rounded-xl border shrink-0 \${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-200'}\`}>
              <button onClick={() => setLayoutMode('hero-left')} className={\`px-2 py-1.5 rounded-md text-xs font-bold transition-all \${layoutMode === 'hero-left' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}\`}>16:9</button>
              <button onClick={() => setLayoutMode('grid-4x2')} className={\`px-2 py-1.5 rounded-md text-xs font-bold transition-all \${layoutMode === 'grid-4x2' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}\`}>Grid</button>
              <button onClick={() => setLayoutMode('focus-deep')} className={\`px-2 py-1.5 rounded-md text-xs font-bold transition-all \${layoutMode === 'focus-deep' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}\`}>Details</button>
             </div>
          )}
          <button
            onClick={() => setShowSettingsModal(true)}`;
content = content.replace(navTarget, navInject);

// 7. Replace bottom render area completely.
// We look for "{selectedFiles.length >= 2 && (" all the way down to "exportMode &&"

const bottomRenderRegex = /\{selectedFiles.length >= 2 && \([\s\S]*?\{\/\* Floating Action Buttons \*\/\}/;

const replacement = `{selectedFiles.length >= 2 && viewMode === 'comparison' ? (
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
                  setComparisonSlots(prev => [...prev, { id: \`c\${Date.now()}\`, type: 'empty' }]);
                }}
              />
            ) : scale < 0.8 ? (
              <div className="flex flex-col gap-8 pb-12">
                {slots.filter(s => s.type !== 'empty').map(chart => (
                  <div key={chart.id} className={\`w-full flex flex-col overflow-visible \${exportMode ? 'bg-white border-none shadow-none' : \`rounded-2xl border shadow-hard-xl \${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}\`}\`}>
                    <div className={\`flex-1 overflow-visible \${exportMode ? '' : 'rounded-2xl'}\`}>
                       {renderChartForFile(chart, selectedFiles[activeFileIndex])}
                    </div>
                  </div>
                ))}
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
                     // Expand array if needed
                     while (next.length <= idx) next.push({ id: \`slot-\${Date.now()}-\${next.length}\`, type: 'empty' });
                     next[idx].type = type;
                     return next;
                  });
                }}
                onAddSlot={() => setSlots(prev => [...prev, { id: \`slot-\${Date.now()}\`, type: 'empty' }])}
              />
            )}
          </div>
          
          {/* Floating Action Buttons */}`;

content = content.replace(bottomRenderRegex, replacement);

const handleChangeType = `  const handleChangeType = (id: string, type: ChartType) => {
    setSlots(prev => prev.map(s => s.id === id ? { ...s, type } : s));
    setComparisonSlots(prev => prev.map(s => s.id === id ? { ...s, type } : s));
  };`;

content = content.replace("  const handleRemoveChart = (id: string) => {", handleChangeType + "\n  const handleRemoveChart = (id: string) => {");

// Change handleRemoveChart to just assign 'empty'
content = content.replace(/const handleRemoveChart = \(id: string\) => \{[\s\S]*?\}\;/g, 
  `const handleRemoveChart = (id: string) => {\n    handleChangeType(id, 'empty');\n  };`);

// Remove handleAddChart entirely since SingleModeLayout uses onAddSlot
content = content.replace(/const handleAddChart = \(type: ChartType\) => \{[\s\S]*?\}\;/g, "");

fs.writeFileSync(path, content, 'utf8');
console.log("App.tsx parsed successfully");
