const fs = require('fs');

const path = './src/App.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Remove react-grid-layout imports
content = content.replace(/import ReactGridLayout.*?from 'react-grid-layout';\s*type Layout.*?ResponsiveGridLayout = WidthProvider\(Responsive\);\s*/g, '');
content = content.replace(/import 'react-grid-layout.*?styles.css';\s*import 'react-resizable.*?styles.css';/g, '');

// 2. Change ActiveChart to ChartConfig
content = content.replace(/type ChartType = 'sunpath' \| 'explorer' \| 'wind' \| 'windrose' \| 'utci';/, 
  "export type ChartType = 'sunpath' | 'explorer' | 'wind' | 'windrose' | 'utci' | 'empty';\nexport type LayoutMode = 'hero-left' | 'grid-4x2' | 'focus-deep';");

content = content.replace(/interface ActiveChart \{\s*id: string;\s*type: ChartType;\s*\}/, 
  "export interface ChartConfig {\n  id: string;\n  type: ChartType;\n  variable?: string;\n}");

// 3. Update activeCharts state to slots, and add layoutMode
content = content.replace(/const \[activeCharts, setActiveCharts\] = useState<ActiveChart\[\]>\(\[[\s\S]*?\]\);/, 
  `const [layoutMode, setLayoutMode] = useState<LayoutMode>('hero-left');
  const [slots, setSlots] = useState<ChartConfig[]>([
    { id: 'slot-1', type: 'sunpath' },
    { id: 'slot-2', type: 'explorer' },
    { id: 'slot-3', type: 'utci' },
    { id: 'slot-4', type: 'wind' },
    { id: 'slot-5', type: 'windrose' },
    { id: 'slot-6', type: 'explorer' },
    { id: 'slot-7', type: 'explorer' }
  ]);`);

content = content.replace(/const \[layouts, setLayouts\] = useState<Layouts>\(\{[\s\S]*?\}\);/, "");

// Remove GRID_BREAKPOINTS and the other GRID constant declarations
const gridVarsRegex = /const GRID_BREAKPOINTS = \{.*?\};\nconst GRID_COLS = \{.*?\};\nconst GRID_MARGIN: \[number, number\] = \[10, 10\];\n/g;
content = content.replace(gridVarsRegex, "");

// Remove handleLayoutChange etc if they exist
content = content.replace(/const handleLayoutChange = \([\s\S]*?\}\;/g, "");
content = content.replace(/const handleChartHeightChange \= \([\s\S]*?\}\;/g, "");

content = content.replace(/const handleBreakpointChange = useCallback\(\(newBreakpoint: string\) => \{[\s\S]*?\}, \[\]\);/, "");

// Rename renderChartForFile signature to use ChartConfig
content = content.replace(/const renderChartForFile = \(chart: ActiveChart,/g, "const renderChartForFile = (chart: ChartConfig,");

// Update renderChartForFile to pass standard props
// We will weave in onChangeType, onRemove, etc. later when we refactor the components themselves.
content = content.replace(/(<DataExplorer[\s\S]*?)\/>/g, "$1 chartId={chart.id} onChangeType={handleChangeChartType} />");
content = content.replace(/(<SunPath[\s\S]*?)\/>/g, "$1 chartId={chart.id} onChangeType={handleChangeChartType} />");
content = content.replace(/(<WindExplorer[\s\S]*?)\/>/g, "$1 chartId={chart.id} onChangeType={handleChangeChartType} />");
content = content.replace(/(<WindRose[\s\S]*?)\/>/g, "$1 chartId={chart.id} onChangeType={handleChangeChartType} />");
content = content.replace(/(<UtciExplorer[\s\S]*?)\/>/g, "$1 chartId={chart.id} onChangeType={handleChangeChartType} />");

// Add handleChangeChartType
content = content.replace(/const handleRemoveChart = \(id: string\) => \{/, 
  `const handleChangeChartType = (id: string, type: ChartType) => {
    setSlots(prev => prev.map(s => s.id === id ? { ...s, type } : s));
  };
  const handleRemoveChart = (id: string) => {`);

// In handleRemoveChart, just set type to 'empty'
content = content.replace(/const handleRemoveChart = \(id: string\) => \{[\s\S]*?\};/, `const handleRemoveChart = (id: string) => {\n    setSlots(prev => prev.map(s => s.id === id ? { ...s, type: 'empty' } : s));\n  };`);

// Remove "Add Chart" legacy function
// Just make sure slots stays.
// Wait, we need a way to "Add new page/Add slot".
content = content.replace(/const handleAddChart = \(type: ChartType\) => \{[\s\S]*?\};/, 
  `const handleAddChart = () => {
    setSlots(prev => [...prev, { id: \`slot-\${Date.now()}\`, type: 'empty' }]);
  };`);

// Replace the return block's layout render.
// Find the block starting with "{selectedFiles.length >= 2 && (" all the way down.
// Wait, it's safer to just inject a file replace script.
fs.writeFileSync(path, content);
console.log("Stage 1 done.", content.includes("ResponsiveGridLayout"), content.includes("slots, setSlots"));
