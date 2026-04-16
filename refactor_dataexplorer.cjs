const fs = require('fs');

const path = './src/components/DataExplorer.tsx';
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
  "setShowGradientModal, exportMode\n}: DataExplorerProps) {",
  "setShowGradientModal, exportMode, chartId, onChangeType\n}: DataExplorerProps) {"
);

// 4. Replace the header div
const targetStart = "      <div className={`flex flex-col ${exportMode ? '' : 'border-b'} ${\n        exportMode ? 'bg-white' : (theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-100 bg-white')\n      } p-3 gap-2`}>\n        <div className=\"flex items-center justify-between w-full gap-2\">\n          <div className=\"flex items-center min-w-0 gap-2 sm:gap-3\">\n            <h3 className={`font-semibold whitespace-nowrap uppercase tracking-wider text-sm ${";
const targetEnd = "\n              <X className=\"w-4 h-4\" />\n            </button>\n          )}\n        </div>";

const regexMatches = new RegExp(/<div className\=\"flex flex-col[\s\S]*?<h3 className\=[\s\S]*?Data Explorer<\/h3>[\s\S]*?<X className=\"w-4 h-4\" \/>\s*<\/button>\s*\)\}\s*<\/div>/);

// The variable selector in Data Explorer is:
const variableSelector = `{exportMode ? (
              <span className="text-xs font-medium text-gray-500 truncate">{colorVarDef.name}</span>
            ) : (
              <select
                value={colorVar}
                onChange={(e) => setColorVar(e.target.value)}
                className={\`bg-transparent border-none font-medium focus:ring-0 cursor-pointer transition-colors p-0 truncate text-xs max-w-[100px] xs:max-w-[150px] sm:max-w-[200px] \${theme === 'dark' ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-900'}\`}
              >
                {Object.entries(groupedVariables).map(([category, vars]) => (
                  <optgroup key={category} label={category}>
                    {vars.map(v => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            )}`;

const newHeader = `      <ChartHeader
        chartType="explorer"
        onChartTypeChange={type => chartId && onChangeType && onChangeType(chartId, type)}
        exportMode={exportMode}
        theme={theme}
        onRemove={onRemove}
        topContent={
          ${variableSelector.replace(/\n/g, '\n          ')}
        }
      >`;

content = content.replace(regexMatches, newHeader);

// In DataExplorer, the end of the header block is before the Stats Modal:
//         )}
//       </div>
//
//       {/* Stats Modal */}
const replaceCloseTag = "        )}\n      </ChartHeader>\n\n      {/* Stats Modal */";
content = content.replace("        )}\n      </div>\n\n      {/* Stats Modal */", replaceCloseTag);


fs.writeFileSync(path, content, 'utf8');
console.log("DataExplorer done.");
