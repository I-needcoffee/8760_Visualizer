const fs = require('fs');

const path = './src/components/WindRose.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add import for ChartHeader and App ChartType
content = content.replace(
  "import { InteractiveLegend, GradientDef } from './InteractiveLegend';",
  "import { InteractiveLegend, GradientDef } from './InteractiveLegend';\nimport { ChartHeader } from './ChartHeader';\nimport { ChartType } from '../App';"
);

// 2. Add chartId and onChangeType to props
content = content.replace(
  "exportMode?: boolean;\n}",
  "exportMode?: boolean;\n  chartId?: string;\n  onChangeType?: (id: string, type: ChartType) => void;\n}"
);

// 3. Add to destructured props
content = content.replace(
  "setShowGradientModal, exportMode\n}: WindRoseProps) {",
  "setShowGradientModal, exportMode, chartId, onChangeType\n}: WindRoseProps) {"
);

const regexMatches = new RegExp(/<div className\=\"flex flex-col[\s\S]*?<h3 className\=[\s\S]*?Wind Rose\s*<\/h3>[\s\S]*?<X className=\"w-4 h-4\" \/>\s*<\/button>\s*\)\}\s*<\/div>\s*\)\}\s*<\/div>\s*<\/div>/);

const newHeader = `      <ChartHeader
        chartType="windrose"
        onChartTypeChange={type => chartId && onChangeType && onChangeType(chartId, type)}
        exportMode={exportMode}
        theme={theme}
        onRemove={onRemove}
      >
        {!exportMode && (
          <div className="flex flex-wrap items-center justify-end w-full gap-2">
            <button
                onClick={() => setShowSettings(!showSettings)}
                className={\`rounded-md transition-colors border shadow-hard-md p-1 sm:p-1.5 \${
                  showSettings 
                    ? (theme === 'dark' ? 'bg-blue-900/30 border-blue-800 text-blue-400' : 'bg-blue-50 border-blue-100 text-blue-600') 
                    : (theme === 'dark' ? 'bg-gray-700 border-gray-600 text-gray-400 hover:text-gray-200' : 'bg-white border-gray-200 text-gray-400 hover:text-gray-600')
                }\`}
                title="Chart Settings"
              >
                <Settings2 className="w-3 h-3 sm:w-4 sm:h-4" />
              </button>
          </div>
        )}
      </ChartHeader>`;

content = content.replace(regexMatches, newHeader);

fs.writeFileSync(path, content, 'utf8');
console.log("WindRose done.");
