const fs = require('fs');

const path = './src/components/WindExplorer.tsx';
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
  "setShowGradientModal, exportMode\n}: WindExplorerProps) {",
  "setShowGradientModal, exportMode, chartId, onChangeType\n}: WindExplorerProps) {"
);

const regexMatches = new RegExp(/<div className\=\"flex flex-col[\s\S]*?<h3 className\=[\s\S]*?Wind Explorer<\/h3>[\s\S]*?<X className=\"w-4 h-4\" \/>\s*<\/button>\s*\)\}\s*<\/div>/);

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
        chartType="wind"
        onChartTypeChange={type => chartId && onChangeType && onChangeType(chartId, type)}
        exportMode={exportMode}
        theme={theme}
        onRemove={onRemove}
        topContent={
          ${variableSelector.replace(/\n/g, '\n          ')}
        }
      >`;

content = content.replace(regexMatches, newHeader);

const replaceCloseTag = "        )}\n      </ChartHeader>\n\n      {/* Stats Modal */";
content = content.replace("        )}\n      </div>\n\n      {/* Stats Modal */", replaceCloseTag);


fs.writeFileSync(path, content, 'utf8');
console.log("WindExplorer done.");
