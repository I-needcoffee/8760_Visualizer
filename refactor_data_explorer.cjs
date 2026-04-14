const fs = require('fs');

const path = 'c:\\Users\\Administrator\\.gemini\\antigravity\\scratch\\Climate-compare\\src\\components\\DataExplorer.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Update the aggregatedData interface
content = content.replace(
  `let aggregatedData: { x0: number, x1: number, valueAll: number, valueSelected: number | null, minSelected?: number, maxSelected?: number, month: number }[] = [];`,
  `let aggregatedData: { x0: number, x1: number, valueAll: number, valueSelected: number | null, minSelected?: number, maxSelected?: number, compareValueAll?: number, compareValueSelected?: number | null, month: number }[] = [];`
);

// 2. Replace the aggregation blocks. Specifically lines where we map values.
// For 'hour'
content = content.replace(
  /if \(showDifference && compareData\) \{\s*val = convertValue\(\(d\[colorVar\] as number \|\| 0\) - \(compareData\[i\]\?\.\[colorVar\] as number \|\| 0\), colorVarDef\.unit, true\);\s*\} else \{\s*val = convertValue\(\(d\[colorVar\] as number\) \|\| 0, colorVarDef\.unit\);\s*\}/,
  `let compareVal: number | undefined;
        if (showDifference && compareData) {
          val = convertValue((d[colorVar] as number) || 0, colorVarDef.unit);
          compareVal = convertValue((compareData[i]?.[colorVar] as number) || 0, colorVarDef.unit);
        } else {
          val = convertValue((d[colorVar] as number) || 0, colorVarDef.unit);
        }`
);

content = content.replace(
  /return \{\s*x0: d\.dayOfYear \+ d\.hour \/ 24,\s*x1: d\.dayOfYear \+ \(d\.hour \+ 1\) \/ 24,\s*valueAll: val,\s*valueSelected: selected \? val : null,\s*minSelected: selected \? val : undefined,\s*maxSelected: selected \? val : undefined,\s*month: d\.month\s*\};/,
  `return {
          x0: d.dayOfYear + d.hour / 24,
          x1: d.dayOfYear + (d.hour + 1) / 24,
          valueAll: val,
          valueSelected: selected ? val : null,
          compareValueAll: compareVal,
          compareValueSelected: selected ? compareVal : null,
          minSelected: selected ? val : undefined,
          maxSelected: selected ? val : undefined,
          month: d.month
        };`
);

// For 'day', 'week', 'month' blocks - we can just regex replace the "if (showDifference && compareData) { ... } else { ... }" 
// inside the map functions. BUT it might be complex. Let's do a more robust string replacement for the drawing section first.

// Let's replace the whole "// --- Bar Chart ---" section up to "// --- Shared X Axis ---"
const drawStartIdx = content.indexOf('// --- Bar Chart ---');
const drawEndIdx = content.indexOf('// --- Shared X Axis ---');

if (drawStartIdx !== -1 && drawEndIdx !== -1) {
    let replacedBlock = `// --- Bar/Line Chart ---
    const barChartG = g.append("g");

    const isSelected = (d: any) => {
      const isMonthMatch = filter.startMonth <= filter.endMonth
        ? (d.month >= filter.startMonth && d.month <= filter.endMonth)
        : (d.month >= filter.startMonth || d.month <= filter.endMonth);
      const isHourMatch = d.hour >= filter.startHour && d.hour <= filter.endHour;
      return isMonthMatch && isHourMatch;
    };

    let aggregatedData: { x0: number, x1: number, valueAll: number, valueSelected: number | null, minSelected?: number, maxSelected?: number, compareValueAll?: number, compareValueSelected?: number | null, month: number }[] = [];

    const calculateValues = (values: any[], selectedValues: any[]) => {
      let valAll: number, valSelected: number | null = null;
      let minSelected: number | undefined, maxSelected: number | undefined;
      let compareValAll: number | undefined, compareValSelected: number | null = null;

      if (showDifference && compareData) {
        valAll = convertValue(d3.mean(values, d => d[colorVar] as number) || 0, colorVarDef.unit);
        const compareValuesAll = values.map(v => compareData[data.indexOf(v)]?.[colorVar] as number).filter(v => v !== null);
        compareValAll = convertValue(d3.mean(compareValuesAll) || 0, colorVarDef.unit);

        if (selectedValues.length > 0) {
          valSelected = convertValue(d3.mean(selectedValues, d => d[colorVar] as number) || 0, colorVarDef.unit);
          minSelected = convertValue(d3.min(selectedValues, d => d[colorVar] as number) || 0, colorVarDef.unit);
          maxSelected = convertValue(d3.max(selectedValues, d => d[colorVar] as number) || 0, colorVarDef.unit);

          const compareValuesSel = selectedValues.map(v => compareData[data.indexOf(v)]?.[colorVar] as number).filter(v => v !== null);
          compareValSelected = convertValue(d3.mean(compareValuesSel) || 0, colorVarDef.unit);
        }
      } else {
        valAll = convertValue(d3.mean(values, d => d[colorVar] as number) || 0, colorVarDef.unit);
        if (selectedValues.length > 0) {
          valSelected = convertValue(d3.mean(selectedValues, d => d[colorVar] as number) || 0, colorVarDef.unit);
          minSelected = convertValue(d3.min(selectedValues, d => d[colorVar] as number) || 0, colorVarDef.unit);
          maxSelected = convertValue(d3.max(selectedValues, d => d[colorVar] as number) || 0, colorVarDef.unit);
        }
      }
      return { valAll, valSelected, minSelected, maxSelected, compareValAll, compareValSelected };
    };

    if (aggregation === 'hour') {
      aggregatedData = data.map((d, i) => {
        const selected = isSelected(d);
        const val = convertValue((d[colorVar] as number) || 0, colorVarDef.unit);
        const compareVal = showDifference && compareData ? convertValue((compareData[i]?.[colorVar] as number) || 0, colorVarDef.unit) : undefined;
        return {
          x0: d.dayOfYear + d.hour / 24, x1: d.dayOfYear + (d.hour + 1) / 24,
          valueAll: val, valueSelected: selected ? val : null, minSelected: selected ? val : undefined, maxSelected: selected ? val : undefined,
          compareValueAll: compareVal, compareValueSelected: selected ? compareVal : null, month: d.month
        };
      });
    } else if (aggregation === 'day') {
      aggregatedData = Array.from(d3.group(data, d => d.dayOfYear), ([day, values]) => {
        const res = calculateValues(values, values.filter(isSelected));
        return { x0: day, x1: day + 1, valueAll: res.valAll, valueSelected: res.valSelected, minSelected: res.minSelected, maxSelected: res.maxSelected, compareValueAll: res.compareValAll, compareValueSelected: res.compareValSelected, month: values[0].month };
      });
    } else if (aggregation === 'week') {
      aggregatedData = Array.from(d3.group(data, d => Math.floor((d.dayOfYear - 1) / 7)), ([week, values]) => {
        const res = calculateValues(values, values.filter(isSelected));
        return { x0: week * 7 + 1, x1: Math.min((week + 1) * 7 + 1, 366), valueAll: res.valAll, valueSelected: res.valSelected, minSelected: res.minSelected, maxSelected: res.maxSelected, compareValueAll: res.compareValAll, compareValueSelected: res.compareValSelected, month: values[0].month };
      });
    } else { // month
      aggregatedData = Array.from(d3.group(data, d => d.month), ([month, values]) => {
        const res = calculateValues(values, values.filter(isSelected));
        return { x0: values[0].dayOfYear, x1: values[values.length - 1].dayOfYear + 1, valueAll: res.valAll, valueSelected: res.valSelected, minSelected: res.minSelected, maxSelected: res.maxSelected, compareValueAll: res.compareValAll, compareValueSelected: res.compareValSelected, month: month };
      });
    }

    let yMin = d3.min(aggregatedData, d => {
        const minP = d.minSelected ?? d.valueAll;
        const minC = d.compareValueSelected ?? d.compareValueAll ?? minP;
        return Math.min(minP, minC);
    }) || 0;
    
    let yMax = d3.max(aggregatedData, d => {
        const maxP = d.maxSelected ?? d.valueAll;
        const maxC = d.compareValueSelected ?? d.compareValueAll ?? maxP;
        return Math.max(maxP, maxC);
    }) || cMax;

    // Optional: Give it a bit of bottom margin if min is above 0, or zero-bound if we prefer
    if (yMin > 0 && colorVarDef.category !== "Temperature") yMin = 0;

    const yScaleBar = d3.scaleLinear().domain([yMin, yMax]).range([barChartHeight, 0]).nice();
    const validData = aggregatedData.filter(d => d.valueSelected !== null);

    if (showDifference && compareData) {
      // Draw Line Chart connecting dots
      const linePrimary = d3.line<any>()
        .x(d => xScale(d.x0) + (xScale(d.x1) - xScale(d.x0)) / 2)
        .y(d => yScaleBar(d.valueSelected!))
        .curve(d3.curveMonotoneX);

      const lineCompare = d3.line<any>()
        .x(d => xScale(d.x0) + (xScale(d.x1) - xScale(d.x0)) / 2)
        .y(d => yScaleBar(d.compareValueSelected!))
        .curve(d3.curveMonotoneX);

      const areaDiff = d3.area<any>()
        .x(d => xScale(d.x0) + (xScale(d.x1) - xScale(d.x0)) / 2)
        .y0(d => yScaleBar(d.compareValueSelected!))
        .y1(d => yScaleBar(d.valueSelected!))
        .curve(d3.curveMonotoneX);

      // Add difference shading
      barChartG.append("path")
        .datum(validData)
        .attr("fill", theme === 'dark' ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)")
        .attr("d", areaDiff);

      // Add lines
      barChartG.append("path")
        .datum(validData)
        .attr("fill", "none")
        .attr("stroke", "#3b82f6") // Blue for primary
        .attr("stroke-width", 2)
        .attr("d", linePrimary);

      barChartG.append("path")
        .datum(validData)
        .attr("fill", "none")
        .attr("stroke", "#9ca3af") // Gray for comparison
        .attr("stroke-dasharray", "4,4") // Dashed line to differentiate
        .attr("stroke-width", 2)
        .attr("d", lineCompare);

      // Add dots
      barChartG.selectAll(".dot-primary")
        .data(validData)
        .join("circle")
        .attr("class", "dot-primary")
        .attr("cx", d => xScale(d.x0) + (xScale(d.x1) - xScale(d.x0)) / 2)
        .attr("cy", d => yScaleBar(d.valueSelected!))
        .attr("r", 3)
        .attr("fill", "#3b82f6")
        .append("title")
        .text(d => \`Primary: \${d.valueSelected!.toFixed(1)} \${cUnit}\`);

      barChartG.selectAll(".dot-compare")
        .data(validData)
        .join("circle")
        .attr("class", "dot-compare")
        .attr("cx", d => xScale(d.x0) + (xScale(d.x1) - xScale(d.x0)) / 2)
        .attr("cy", d => yScaleBar(d.compareValueSelected!))
        .attr("r", 3)
        .attr("fill", "#9ca3af")
        .append("title")
        .text(d => \`Comparison: \${d.compareValueSelected!.toFixed(1)} \${cUnit}\`);

    } else {
      // Draw standard Bar Chart
      const fgGroups = barChartG.selectAll(".fg-group")
        .data(validData)
        .join("g")
        .attr("class", "fg-group");

      fgGroups.each(function(d) {
        const group = d3.select(this);
        const barW = Math.max(1, xScale(d.x1) - xScale(d.x0) - (aggregation === 'hour' ? 0 : 4));
        const xPos = xScale(d.x0);

        const val = d.valueSelected!;
        const minVal = d.minSelected !== undefined && d.minSelected !== null ? d.minSelected : val;
        const maxVal = d.maxSelected !== undefined && d.maxSelected !== null ? d.maxSelected : val;
        const y0 = yScaleBar(minVal);
        const y1 = yScaleBar(maxVal);
        
        group.append("rect")
          .attr("x", xPos)
          .attr("y", y1)
          .attr("width", barW)
          .attr("height", Math.max(1, y0 - y1))
          .style("fill", colorScale(val))
          .style("opacity", 0.6)
          .attr("rx", aggregation === 'hour' ? 0 : 4)
          .attr("ry", aggregation === 'hour' ? 0 : 4);

        group.append("circle")
          .attr("cx", xPos + barW / 2)
          .attr("cy", yScaleBar(val))
          .attr("r", Math.min(barW / 2, 4))
          .style("fill", colorScale(val))
          .style("stroke", "#000000")
          .style("stroke-width", "1px");
      });

      fgGroups.append("title")
        .text(d => \`Selected Hours Avg: \${d.valueSelected!.toFixed(1)} \${cUnit}\`);
    }

    const yAxisBar = d3.axisLeft(yScaleBar).ticks(5);
    barChartG.append("g")
      .call(yAxisBar)
      .call(g => g.select(".domain").style("stroke", theme === 'dark' ? '#6b7280' : '#4b5563').style("stroke-width", '2px'))
      .call(g => g.selectAll(".tick line").attr("x2", innerWidth).style("stroke", theme === 'dark' ? '#374151' : '#e5e7eb').style("stroke-width", '1.5px').attr("stroke-opacity", 0.5))
      .call(g => g.selectAll(".tick text").style("fill", heatmapTextColor).style("font-weight", "bold").style("font-size", \`10px\`));

    `;

    content = content.substring(0, drawStartIdx) + replacedBlock + content.substring(drawEndIdx);
    fs.writeFileSync(path, content, 'utf8');
}
