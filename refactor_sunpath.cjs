const fs = require('fs');

const path = './src/components/SunPath.tsx';
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
  "setShowGradientModal, exportMode\n}: SunPathProps) {",
  "setShowGradientModal, exportMode, chartId, onChangeType\n}: SunPathProps) {"
);

// 4. Replace the header div
const targetHeaderStr = "      <div className={`flex flex-col ${exportMode ? '' : 'border-b'} ${\n        exportMode ? 'bg-white' : (theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-100 bg-white')\n      } p-3 gap-2`}>\n        <div className=\"flex items-center justify-between w-full gap-2\">\n          <div className=\"flex items-center min-w-0 gap-2 sm:gap-3\">\n            <h3 className={`font-semibold whitespace-nowrap uppercase tracking-wider text-sm ${\n              exportMode ? 'text-gray-800' : (theme === 'dark' ? 'text-gray-200' : 'text-gray-800')\n            }`}>Sun Path</h3>\n            <div className={`shrink-0 w-px h-4 ${\n              exportMode ? 'bg-gray-200' : (theme === 'dark' ? 'bg-gray-600' : 'bg-gray-200')\n            }`}></div>\n            <span className=\"text-xs font-medium text-gray-500 truncate\">{colorVarDef.name}</span>\n          </div>\n          {onRemove && !exportMode && (\n            <button onClick={onRemove} className={`rounded-md transition-colors shadow-hard-md p-1.5 ${theme === 'dark' ? 'text-gray-400 hover:text-red-400 hover:bg-red-900/30' : 'text-gray-400 hover:text-red-500 hover:bg-red-50'}`}>\n              <X className=\"w-4 h-4\" />\n            </button>\n          )}\n        </div>";

const newHeader = `      <ChartHeader
        chartType="sunpath"
        onChartTypeChange={type => chartId && onChangeType && onChangeType(chartId, type)}
        exportMode={exportMode}
        theme={theme}
        onRemove={onRemove}
        topContent={<span className="text-xs font-medium text-gray-500 truncate">{colorVarDef.name}</span>}
      >`;

content = content.replace(targetHeaderStr, newHeader);

// We need to close the ChartHeader tag.
// Previously, after the "export mode" block there is `</div>` that closes that flex header area.
// It looks like:
//        )}
//      </div>
//
//      {/* Settings Modal */}
const closeTagStr = "        )}\n      </div>\n\n      {/* Settings Modal */";
const replaceCloseTag = "        )}\n      </ChartHeader>\n\n      {/* Settings Modal */";
content = content.replace("        )}\n      </div>\n\n      {/* Settings Modal */", replaceCloseTag);


fs.writeFileSync(path, content, 'utf8');
console.log("SunPath done.");
