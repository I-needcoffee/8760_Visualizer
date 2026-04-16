const fs = require('fs');
const path = './src/App.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Remove old constants and types
content = content.replace(/const GRID_BREAKPOINTS = \{.*?\};\s*/g, '');
content = content.replace(/const GRID_COLS = \{.*?\};\s*/g, '');
content = content.replace(/const GRID_MARGIN: \[number, number\] = \[.*?\\];\s*/g, '');

// 2. Remove old state survivors (activeCharts, layouts, breakpoint, scale)
content = content.replace(/const \[activeCharts, setActiveCharts\] = useState<ActiveChart\[\]\>([\s\S]*?)\]\);\s*/gm, '');
content = content.replace(/const \[layouts, setLayouts\] = useState<Layouts\>([\s\S]*?)\}\);\s*/gm, '');
content = content.replace(/const \[currentBreakpoint, setCurrentBreakpoint\] = useState\('lg'\);\s*const currentBreakpointRef = useRef\('lg'\);\s*/g, '');
content = content.replace(/useEffect\(\(\) =\> \{\s*currentBreakpointRef\.current = currentBreakpoint;\s*\}, \[currentBreakpoint\]\);\s*/g, '');
content = content.replace(/const handleBreakpointChange = useCallback\([\s\S]*?\}, \[\]\);\s*/gm, '');
content = content.replace(/const \[scale, setScale\] = useState\(1\);\s*const scaleRef = useRef\(1\);\s*useEffect\(\(\) =\> \{\s*scaleRef\.current = scale;\s*\}, \[scale\]\);\s*/gm, '');
content = content.replace(/useEffect\(\(\) =\> \{\s*const handleResize = \(\) =\> \{[\s\S]*?\}, \[\]\);\s*/gm, '');

// 3. Remove old refs and functions (lastLayoutsRef, handleChartHeightChange, addChart, removeChart)
content = content.replace(/const lastLayoutsRef = useRef<Layouts\>\(layouts\);\s*/g, '');
content = content.replace(/const lastHeightUpdate = useRef[\s\S]*?\}\);\s*/gm, '');
content = content.replace(/const handleChartHeightChange = useCallback\([\s\S]*?\}, \[\]\);\s*/gm, '');
content = content.replace(/const addChart = \([\s\S]*?\}\;\s*/gm, '');
content = content.replace(/const removeChart = \([\s\S]*?\}\;\s*/gm, '');

// 4. Update renderChartForFile signature to use ChartConfig 
content = content.replace(/const renderChartForFile = \(chart: ActiveChart/g, 'const renderChartForFile = (chart: ChartConfig');

// 5. Clean up handleRemoveChart call in renderChartForFile logic
content = content.replace(/const onRemoveHandler = isDiffExplorer \? \(\) =\> setShowDiffTable\(false\) : \(\) =\> removeChart\(chart\.id\);/g, 
  "const onRemoveHandler = isDiffExplorer ? () => setShowDiffTable(false) : () => handleRemoveChart(chart.id);");

fs.writeFileSync(path, content, 'utf8');
console.log("App.tsx cleanup successful.");
