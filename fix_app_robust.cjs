const fs = require('fs');
const path = './src/App.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Remove react-grid-layout imports
content = content.replace(/import ReactGridLayout, \{ Responsive \} from 'react-grid-layout';\s*type Layout = ReactGridLayout.Layout;\s*type Layouts = ReactGridLayout.Layouts;\s*import \{ WidthProvider \} from 'react-grid-layout\/legacy';\s*const ResponsiveGridLayout = WidthProvider\(Responsive\);\s*/gm, '');

// 2. Change ActiveChart to ChartConfig
content = content.replace(/export type ChartType = 'sunpath' \| 'explorer' \| 'wind' \| 'windrose' \| 'utci';/, 
  "export type ChartType = 'sunpath' | 'explorer' | 'wind' | 'windrose' | 'utci' | 'empty';\nexport type LayoutMode = 'hero-left' | 'grid-4x2' | 'focus-deep';");

content = content.replace(/export interface ActiveChart \{\s*id: string;\s*type: ChartType;\s*\}/, 
  "export interface ChartConfig {\n  id: string;\n  type: ChartType;\n  variable?: string;\n}");

content = content.replace(
  "import { InteractiveLegend, GradientDef } from './components/InteractiveLegend';",
  "import { InteractiveLegend, GradientDef } from './components/InteractiveLegend';\nimport { SingleModeLayout } from './components/SingleModeLayout';\nimport { ComparisonModeLayout } from './components/ComparisonModeLayout';\nimport { LayoutTemplate } from 'lucide-react';"
);

// 3. Replace state definitions
const activeChartsDef = `  const [activeCharts, setActiveCharts] = useState<ActiveChart[]>([\n    { id: 'initial-sunpath', type: 'sunpath' },\n    { id: 'initial-explorer', type: 'explorer' },\n    { id: 'initial-utci', type: 'utci' },\n    { id: 'initial-wind', type: 'wind' },\n    { id: 'initial-windrose', type: 'windrose' }\n  ]);`;
const layoutsDef = `  const [layouts, setLayouts] = useState<Layouts>({\n    lg: [\n      { i: 'initial-sunpath', x: 0, y: 0, w: 3, h: 40, minW: 2, minH: 10 },\n      { i: 'initial-explorer', x: 3, y: 0, w: 3, h: 40, minW: 2, minH: 10 },\n      { i: 'initial-utci', x: 6, y: 0, w: 3, h: 40, minW: 2, minH: 10 },\n      { i: 'initial-wind', x: 9, y: 0, w: 3, h: 40, minW: 2, minH: 10 },\n      { i: 'initial-windrose', x: 0, y: 40, w: 3, h: 40, minW: 2, minH: 10 }\n    ],\n    md: [\n      { i: 'initial-sunpath', x: 0, y: 0, w: 4, h: 40, minW: 2, minH: 10 },\n      { i: 'initial-explorer', x: 4, y: 0, w: 4, h: 40, minW: 2, minH: 10 },\n      { i: 'initial-utci', x: 8, y: 0, w: 4, h: 40, minW: 2, minH: 10 },\n      { i: 'initial-wind', x: 0, y: 40, w: 4, h: 40, minW: 2, minH: 10 },\n      { i: 'initial-windrose', x: 4, y: 40, w: 4, h: 40, minW: 2, minH: 10 }\n    ],\n    sm: [\n      { i: 'initial-sunpath', x: 0, y: 0, w: 6, h: 40, minW: 2, minH: 10 },\n      { i: 'initial-explorer', x: 6, y: 0, w: 6, h: 40, minW: 2, minH: 10 },\n      { i: 'initial-utci', x: 0, y: 40, w: 6, h: 40, minW: 2, minH: 10 },\n      { i: 'initial-wind', x: 6, y: 40, w: 6, h: 40, minW: 2, minH: 10 },\n      { i: 'initial-windrose', x: 0, y: 80, w: 6, h: 40, minW: 2, minH: 10 }\n    ]\n  });`;

content = content.replace(activeChartsDef, `  const [layoutMode, setLayoutMode] = useState<LayoutMode>('hero-left');
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
  ]);`);
content = content.replace(layoutsDef, "");

// 4. Remove handleLayoutChange, etc
content = content.replace(/const handleLayoutChange = useCallback.*?\}, \[\]\);/ms, '');
const isDraggingRefRegex = /const isDraggingRef = useRef\(false\);/g;
content = content.replace(isDraggingRefRegex, '');
content = content.replace(/const handleChartHeightChange = useCallback.*?\}, \[layouts\]\);/ms, '');

// 5. Replace TopNav toggle
const navTarget = "          <button\n            onClick={() => setShowSettingsModal(true)}";
const navInject = `          {viewMode === 'single' && (
             <div className={\`flex items-center p-0.5 sm:p-1 rounded-lg sm:rounded-xl border shrink-0 \${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-200'}\`}>
              <button onClick={() => setLayoutMode('hero-left')} className={\`px-2 py-1.5 rounded-md text-xs font-bold transition-all \${layoutMode === 'hero-left' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}\`}>16:9</button>
              <button onClick={() => setLayoutMode('grid-4x2')} className={\`px-2 py-1.5 rounded-md text-xs font-bold transition-all \${layoutMode === 'grid-4x2' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}\`}>Grid</button>
              <button onClick={() => setLayoutMode('focus-deep')} className={\`px-2 py-1.5 rounded-md text-xs font-bold transition-all \${layoutMode === 'focus-deep' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}\`}>Details</button>
             </div>
          )}
          <button
            onClick={() => setShowSettingsModal(true)}`;
content = content.replace(navTarget, navInject);

// 6. Update renderChartForFile
content = content.replace(/const renderChartForFile = \(chart: ActiveChart, fileData: ParsedEPW, compareFileData\?: ParsedEPW, isDiffMode: boolean = false\) => \{/, 
  "const renderChartForFile = (chart: ChartConfig, fileData: ParsedEPW, compareFileData?: ParsedEPW, isDiffMode: boolean = false, isStacked: boolean = false) => {");

content = content.replace(/<DataExplorer/g, '<DataExplorer chartId={chart.id} onChangeType={handleChangeType} stackedComparison={isStacked} ');
content = content.replace(/<SunPath/g,     '<SunPath chartId={chart.id} onChangeType={handleChangeType} stackedComparison={isStacked} ');
content = content.replace(/<UtciExplorer/g,'<UtciExplorer chartId={chart.id} onChangeType={handleChangeType} stackedComparison={isStacked} ');
content = content.replace(/<WindExplorer/g,'<WindExplorer chartId={chart.id} onChangeType={handleChangeType} stackedComparison={isStacked} ');
content = content.replace(/<WindRose/g,    '<WindRose chartId={chart.id} onChangeType={handleChangeType} stackedComparison={isStacked} ');

// REMOVE DUPLICATE STACKED_COMPARISON PROPS
content = content.replace(/stackedComparison=\{isStacked\}\s*stackedComparison=\{isStacked\}/g, 'stackedComparison={isStacked}');

content = content.replace(/<ScaledWrapper.*?<\/ScaledWrapper>/g, '{renderChartForFile}');

// 7. Inject handle functions
const handleChangeType = `  const handleChangeType = (id: string, type: ChartType) => {
    setSlots(prev => prev.map(s => s.id === id ? { ...s, type } : s));
    setComparisonSlots(prev => prev.map(s => s.id === id ? { ...s, type } : s));
  };`;
content = content.replace("  const handleRemoveChart = (id: string) => {", handleChangeType + "\n  const handleRemoveChart = (id: string) => {");
content = content.replace(/const handleRemoveChart = \(id: string\) => \{[\s\S]*?\}\;/g, 
  `const handleRemoveChart = (id: string) => {\n    handleChangeType(id, 'empty');\n  };`);
content = content.replace(/const handleAddChart = \(type: ChartType\) => \{[\s\S]*?\}\;/g, "");

// 8. Safely cut out the layout block.
const startToken = "{activeCharts.length === 0 ? (";
const endToken = "{/* Floating Action Buttons */}";

const startIdx = content.indexOf(startToken);
const endIdx = content.indexOf(endToken);

if (startIdx !== -1 && endIdx !== -1) {
    const beforeStr = content.slice(0, startIdx);
    const afterStr = content.slice(endIdx);

    const replacementStr = `{selectedFiles.length >= 2 && viewMode === 'comparison' ? (
            <div className="flex flex-col gap-4 h-full min-h-[800px]">
              {/* Difference Mode Controls */}
              <div className={\`flex flex-wrap items-center gap-4 p-4 rounded-xl border shadow-sm \${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}\`}>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-500">Baseline:</span>
                  <select 
                    value={differenceBaselineIndex}
                    onChange={(e) => setDifferenceBaselineIndex(Number(e.target.value))}
                    className={\`text-sm rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50 \${theme === 'dark' ? 'bg-gray-700 text-white border-gray-600' : 'bg-white text-gray-900'}\`}
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
                    className={\`text-sm rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50 \${theme === 'dark' ? 'bg-gray-700 text-white border-gray-600' : 'bg-white text-gray-900'}\`}
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
                  setComparisonSlots(prev => [...prev, { id: \`c\${Date.now()}\`, type: 'empty' }]);
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
                   while (next.length <= idx) next.push({ id: \`slot-\${Date.now()}-\${next.length}\`, type: 'empty' });
                   next[idx].type = type;
                   return next;
                });
              }}
              onAddSlot={() => setSlots(prev => [...prev, { id: \`slot-\${Date.now()}\`, type: 'empty' }])}
            />
          )}

          `;
          
    content = beforeStr + replacementStr + afterStr;
} else {
    console.log("Could not find start/end tokens!", startIdx, endIdx);
}

// Ensure "Add More Analysis" block is removed because we handle slot additions directly in Layouts
const addMoreTokenStart = "{/* Add Chart Buttons (at the bottom of scroll) */}";
const addMoreLte = content.indexOf(addMoreTokenStart);
if (addMoreLte !== -1) {
    const endStr = "</div>\n      </div>\n    </div>\n  );\n}\n";
    content = content.slice(0, addMoreLte) + endStr;
}

fs.writeFileSync(path, content, 'utf8');
console.log("Rewrite successful.");
