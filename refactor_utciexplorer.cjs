const fs = require('fs');

const path = './src/components/UtciExplorer.tsx';
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
  "setShowGradientModal, exportMode\n}: UtciExplorerProps) {",
  "setShowGradientModal, exportMode, chartId, onChangeType\n}: UtciExplorerProps) {"
);

// 4. Replace the header div
const regexMatches = new RegExp(/<div className\=\"flex flex-col[\s\S]*?<h3 className\=[\s\S]*?UTCI Comfort<\/h3>[\s\S]*?<X className=\"w-4 h-4\" \/>\s*<\/button>\s*\)\}\s*<\/div>/);

content = content.replace(regexMatches, `      <ChartHeader
        chartType="utci"
        onChartTypeChange={type => chartId && onChangeType && onChangeType(chartId, type)}
        exportMode={exportMode}
        theme={theme}
        onRemove={onRemove}
      >`);

// 5. Close the wrapper
const replaceCloseTag = "        )}\n      </ChartHeader>\n\n      {/* Stats Modal */";
content = content.replace("        )}\n      </div>\n\n      {/* Stats Modal */", replaceCloseTag);


fs.writeFileSync(path, content, 'utf8');
console.log("UTCI Explorer done.");
