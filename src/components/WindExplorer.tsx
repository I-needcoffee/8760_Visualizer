import { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';
import { EPWDataRow, EPWVariable } from '../lib/epwParser';
import { InteractiveLegend, GradientDef } from './InteractiveLegend';
import { AggregationToolbar } from './AggregationToolbar';
import type { ChartType, CompareWindSharedControls } from '../App';
import { X, Settings2 } from 'lucide-react';

import { GlobalFilterState } from './GlobalFilterPanel';
import { UnitSystem } from '../App';
import { ChartTypeMenu } from './ChartTypeMenu';
import { ExportHeaderCaption } from './ExportHeaderCaption';
import { VariableChartSelect } from './VariableChartSelect';
import { CardModal } from './CardModal';

interface WindExplorerProps {
  data: EPWDataRow[];
  compareData?: EPWDataRow[];
  showDifference?: boolean;
  stackedComparison?: boolean;
  variables: EPWVariable[];
  onRemove?: () => void;
  onChangeType?: (type: ChartType) => void;
  gradients: GradientDef[];
  filter: GlobalFilterState;
  unitSystem: UnitSystem;
  heatmapTextColor: string;
  theme: 'light' | 'dark';
  setShowGradientModal: (show: boolean) => void;
  exportMode?: boolean;
  comparePane?: 'primary' | 'secondary';
  paneCity?: string;
  pairSuppressHeader?: boolean;
  pairModalHost?: boolean;
  windShared?: CompareWindSharedControls;
}

const COMPASS_POINTS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];

function getCompassDirection(degrees: number): string {
  const val = Math.floor((degrees / 22.5) + 0.5);
  return COMPASS_POINTS[(val % 16)];
}

function averageWindVector(values: EPWDataRow[], compareData?: EPWDataRow[], data?: EPWDataRow[], showDifference?: boolean): { speed: number, direction: number } {
  let sumU = 0;
  let sumV = 0;
  let count = 0;

  values.forEach(d => {
    const speed = d.windSpeed as number;
    const dir = d.windDirection as number;
    if (speed !== undefined && dir !== undefined) {
      if (showDifference && compareData && data) {
        const idx = data.indexOf(d);
        const cD = compareData[idx];
        if (cD) {
          const cSpeed = cD.windSpeed as number;
          const cDir = cD.windDirection as number;
          if (cSpeed !== undefined && cDir !== undefined) {
            const rad = dir * Math.PI / 180;
            const cRad = cDir * Math.PI / 180;
            // Vector difference
            sumU += (-speed * Math.sin(rad)) - (-cSpeed * Math.sin(cRad));
            sumV += (-speed * Math.cos(rad)) - (-cSpeed * Math.cos(cRad));
            count++;
          }
        }
      } else {
        const rad = dir * Math.PI / 180;
        sumU += -speed * Math.sin(rad);
        sumV += -speed * Math.cos(rad);
        count++;
      }
    }
  });

  if (count === 0) return { speed: 0, direction: 0 };

  const avgU = sumU / count;
  const avgV = sumV / count;
  
  const avgSpeed = Math.sqrt(avgU * avgU + avgV * avgV);
  let avgDir = Math.atan2(-avgU, -avgV) * 180 / Math.PI;
  if (avgDir < 0) avgDir += 360;

  return { speed: avgSpeed, direction: avgDir };
}

export function WindExplorer({ 
  data, compareData, showDifference, stackedComparison, variables, onRemove, onChangeType, gradients, filter, unitSystem, heatmapTextColor, theme, 
  setShowGradientModal, exportMode, comparePane, paneCity,
  pairSuppressHeader, pairModalHost, windShared
}: WindExplorerProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const compareSvgRef = useRef<SVGSVGElement>(null);
  const [iAgg, setIAgg] = useState<'hour' | 'day' | 'week' | 'month'>('month');
  const aggregation = windShared?.aggregation ?? iAgg;
  const setAggregation = windShared?.setAggregation ?? setIAgg;

  const [iColor, setIColor] = useState(variables.find(v => v.id === 'windSpeed')?.id || variables[0]?.id || '');
  const colorVar = windShared?.colorVar ?? iColor;
  const setColorVar = windShared?.setColorVar ?? setIColor;

  const [iGrad, setIGrad] = useState(gradients[0].id);
  const gradientId = windShared?.gradientId ?? iGrad;
  const setGradientId = windShared?.setGradientId ?? setIGrad;

  const [iShowSettings, setIShowSettings] = useState(false);
  const showSettings = windShared?.showSettings ?? iShowSettings;
  const setShowSettings = windShared?.setShowSettings ?? setIShowSettings;

  const [iShowStats, setIShowStats] = useState(false);
  const showStats = windShared?.showStats ?? iShowStats;
  const setShowStats = windShared?.setShowStats ?? setIShowStats;

  const showStatsModal = showStats && (!pairSuppressHeader || pairModalHost);
  const showSettingsModal = showSettings && (!pairSuppressHeader || pairModalHost);
  // chart type switching handled by ChartTypeMenu

  const outerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 400 });

  const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!outerRef.current) return;
    const observer = new ResizeObserver(entries => {
      if (resizeTimeoutRef.current) clearTimeout(resizeTimeoutRef.current);
      
      resizeTimeoutRef.current = setTimeout(() => {
        for (let entry of entries) {
          const newWidth = Math.round(entry.contentRect.width);
          
          setDimensions(prev => {
            if (prev.width === newWidth) return prev;
            return { width: newWidth };
          });
        }
      }, 100);
    });
    observer.observe(outerRef.current);
    return () => {
      observer.disconnect();
      if (resizeTimeoutRef.current) clearTimeout(resizeTimeoutRef.current);
    };
  }, []);

  const [tempFilterEnabled, setTempFilterEnabled] = useState(false);
  const [tempThreshold, setTempThreshold] = useState(unitSystem === 'imperial' ? 70 : 21);
  const [tempFilterType, setTempFilterType] = useState<'above' | 'below'>('above');
  
  const [speedFilterEnabled, setSpeedFilterEnabled] = useState(false);
  const [speedThreshold, setSpeedThreshold] = useState(unitSystem === 'imperial' ? 10 : 4.5);
  const [speedFilterType, setSpeedFilterType] = useState<'above' | 'below'>('above');

  const prevUnitSystem = useRef(unitSystem);
  useEffect(() => {
    if (prevUnitSystem.current !== unitSystem) {
      if (unitSystem === 'imperial') {
        setTempThreshold(t => Math.round(t * 9/5 + 32));
        setSpeedThreshold(s => Math.round(s * 2.23694));
      } else {
        setTempThreshold(t => Math.round((t - 32) * 5/9));
        setSpeedThreshold(s => Math.round(s / 2.23694));
      }
      prevUnitSystem.current = unitSystem;
    }
  }, [unitSystem]);

  const convertValue = (val: number | null | undefined, unit: string, isDelta: boolean = false) => {
    if (val === null || val === undefined) return 0;
    if (unitSystem === 'imperial') {
      if (unit === '°C') return isDelta ? val * 9/5 : val * 9/5 + 32;
      if (unit === 'm/s') return val * 2.23694;
      if (unit === 'mm') return val / 25.4;
    }
    return val;
  };

  const applyPreset = (type: 'summer' | 'winter' | 'pedestrian' | 'sitting') => {
    switch (type) {
      case 'summer':
        setTempFilterEnabled(true);
        setTempThreshold(unitSystem === 'imperial' ? 75 : 24);
        setTempFilterType('above');
        setSpeedFilterEnabled(true);
        setSpeedThreshold(unitSystem === 'imperial' ? 3.4 : 1.5);
        setSpeedFilterType('above');
        break;
      case 'winter':
        setTempFilterEnabled(true);
        setTempThreshold(unitSystem === 'imperial' ? 50 : 10);
        setTempFilterType('below');
        setSpeedFilterEnabled(true);
        setSpeedThreshold(unitSystem === 'imperial' ? 4.5 : 2.0);
        setSpeedFilterType('above');
        break;
      case 'pedestrian':
        setTempFilterEnabled(false);
        setSpeedFilterEnabled(true);
        setSpeedThreshold(unitSystem === 'imperial' ? 11.2 : 5.0);
        setSpeedFilterType('below');
        break;
      case 'sitting':
        setTempFilterEnabled(false);
        setSpeedFilterEnabled(true);
        setSpeedThreshold(unitSystem === 'imperial' ? 4.5 : 2.0);
        setSpeedFilterType('below');
        break;
    }
  };

  const convertUnit = (unit: string) => {
    if (unitSystem === 'imperial') {
      if (unit === '°C') return '°F';
      if (unit === 'm/s') return 'mph';
      if (unit === 'mm') return 'in';
    }
    return unit;
  };

  // Group variables by category
  const groupedVariables = variables.reduce((acc, variable) => {
    const category = variable.category || 'Other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(variable);
    return acc;
  }, {} as Record<string, EPWVariable[]>);

  // Calculate local stats for filtered data
  const filteredData = useMemo((): EPWDataRow[] => {
    return data.filter(d => {
      const isMonthMatch = filter.startMonth <= filter.endMonth
        ? (d.month >= filter.startMonth && d.month <= filter.endMonth)
        : (d.month >= filter.startMonth || d.month <= filter.endMonth);
      
      let isTempMatch = true;
      if (tempFilterEnabled) {
        const temp = convertValue(d.dryBulbTemperature, '°C');
        if (tempFilterType === 'above') {
          isTempMatch = temp > tempThreshold;
        } else {
          isTempMatch = temp < tempThreshold;
        }
      }

      let isSpeedMatch = true;
      if (speedFilterEnabled) {
        const speed = convertValue(d.windSpeed, 'm/s');
        if (speedFilterType === 'above') {
          isSpeedMatch = speed > speedThreshold;
        } else {
          isSpeedMatch = speed < speedThreshold;
        }
      }

      return isMonthMatch && 
             d.hour >= filter.startHour && 
             d.hour <= filter.endHour &&
             isTempMatch &&
             isSpeedMatch;
    });
  }, [data, filter, tempFilterEnabled, tempThreshold, tempFilterType, speedFilterEnabled, speedThreshold, speedFilterType, unitSystem]);

  const { colorVarDef, cMin, cMax, cUnit } = useMemo(() => {
    const def = variables.find(v => v.id === colorVar) || variables.find(v => v.id === 'windSpeed') || variables[0];
    let min = def.fixedMin !== undefined ? convertValue(def.fixedMin, def.unit) : convertValue(def.min, def.unit);
    let max = def.fixedMax !== undefined ? convertValue(def.fixedMax, def.unit) : convertValue(def.max, def.unit);
    const unit = convertUnit(def.unit);

    if (showDifference && compareData) {
      const diffs = data.map((d, i) => {
        const primaryVal = d[colorVar] as number;
        const compareVal = compareData[i]?.[colorVar] as number;
        if (primaryVal === null || compareVal === null) return 0;
        return compareVal - primaryVal;
      });
      const maxDiff = d3.max(diffs, d => Math.abs(d)) || 5;
      min = convertValue(-maxDiff, def.unit, true);
      max = convertValue(maxDiff, def.unit, true);
    }
    return { colorVarDef: def, cMin: min, cMax: max, cUnit: unit };
  }, [variables, colorVar, showDifference, compareData, data, unitSystem]);

  useEffect(() => {
    if (!svgRef.current || !filteredData.length || dimensions.width === 0) {
      d3.select(svgRef.current).selectAll("*").remove();
      return;
    }

    const rows: EPWDataRow[] = filteredData as EPWDataRow[];

    // --- Main Chart (1224 + Bar) ---
    const BASE_WIDTH = 350;
    const width = BASE_WIDTH;
    const height = 420;
    
    const margin = { top: 15, right: 20, bottom: 25, left: 40 };
    
    const barChartHeight = Math.max(75, height * 0.25);
    const heatmapHeight = height - margin.top - margin.bottom - barChartHeight - 20; // 20px gap
    
    const innerWidth = width - margin.left - margin.right;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const g = svg
      .attr("viewBox", `0 0 ${width} ${height}`)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // --- Data Processing ---
    const gradientDef = gradients.find(g => g.id === gradientId) || gradients[0];
    
    let colorScale: any;
    if (showDifference && compareData) {
      colorScale = d3.scaleLinear<string>()
        .domain([cMin, 0, cMax])
        .range(["#3b82f6", theme === 'dark' ? "#1f2937" : "#ffffff", "#ef4444"]);
    } else {
      colorScale = d3.scaleSequential()
        .domain([cMin, cMax])
        .interpolator(d3.interpolateRgbBasis(gradientDef.colors));
    }

    // X Scale for left charts (Day of Year 1-365)
    const xScale = d3.scaleLinear()
      .domain([1, 366])
      .range([0, innerWidth]);

    // --- Heatmap ---
    const heatmapG = g.append("g")
      .attr("transform", `translate(0, ${barChartHeight + 40})`);

    const yScaleHeatmap = d3.scaleLinear()
      .domain([0, 24])
      .range([0, heatmapHeight]);

    // Aggregate data for heatmap
    let heatmapData: any[] = [];
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    if (aggregation === 'month') {
      const groups = d3.group(rows, d => d.month, d => d.hour);
      Array.from(groups).forEach(([month, hourGroups]) => {
        Array.from(hourGroups).forEach(([hour, values]) => {
          const startDay = values[0].dayOfYear;
          const endDay = values[values.length - 1].dayOfYear + 1;
          
          let val: number;
          let wind: { speed: number, direction: number };
          if (showDifference && compareData) {
            const primaryAvg = d3.mean(values, d => d[colorVar] as number) || 0;
            const compareValues = values.map(v => {
              const idx = data.indexOf(v);
              return compareData[idx]?.[colorVar] as number;
            }).filter(v => v !== null);
            const compareAvg = d3.mean(compareValues) || 0;
            val = convertValue(compareAvg - primaryAvg, colorVarDef.unit, true);
            wind = averageWindVector(values, compareData, data, showDifference);
          } else {
            val = convertValue(d3.mean(values, d => d[colorVar] as number) || 0, colorVarDef.unit);
            wind = averageWindVector(values);
          }
          const { speed, direction } = wind;
          heatmapData.push({
            x0: startDay,
            x1: endDay,
            y: hour,
            month: month,
            value: val,
            direction: direction,
            label: `${monthNames[month - 1]}`,
            tooltip: `${monthNames[month - 1]} ${showDifference ? 'Diff' : 'Avg'}\n${colorVarDef.name}: ${val.toFixed(1)} ${cUnit}\nDir: ${getCompassDirection(direction)} (${Math.round(direction)}°)`
          });
        });
      });
    } else if (aggregation === 'week') {
      const groups = d3.group(rows, d => Math.floor((d.dayOfYear - 1) / 7), d => d.hour);
      Array.from(groups).forEach(([week, hourGroups]) => {
        Array.from(hourGroups).forEach(([hour, values]) => {
          const startDay = week * 7 + 1;
          const endDay = Math.min((week + 1) * 7 + 1, 366);
          let val: number;
          let wind: { speed: number, direction: number };
          if (showDifference && compareData) {
            const primaryAvg = d3.mean(values, d => d[colorVar] as number) || 0;
            const compareValues = values.map(v => {
              const idx = data.indexOf(v);
              return compareData[idx]?.[colorVar] as number;
            }).filter(v => v !== null);
            const compareAvg = d3.mean(compareValues) || 0;
            val = convertValue(compareAvg - primaryAvg, colorVarDef.unit, true);
            wind = averageWindVector(values, compareData, data, showDifference);
          } else {
            val = convertValue(d3.mean(values, d => d[colorVar] as number) || 0, colorVarDef.unit);
            wind = averageWindVector(values);
          }
          const { speed, direction } = wind;
          const month = values[0].month;
          heatmapData.push({
            x0: startDay,
            x1: endDay,
            y: hour,
            month: month,
            value: val,
            direction: direction,
            label: `W${week + 1}`,
            tooltip: `Week ${week + 1} ${showDifference ? 'Diff' : 'Avg'}\n${colorVarDef.name}: ${val.toFixed(1)} ${cUnit}\nDir: ${getCompassDirection(direction)} (${Math.round(direction)}°)`
          });
        });
      });
    } else {
      // day or hour
      heatmapData = rows.map(d => ({
        x0: d.dayOfYear,
        x1: d.dayOfYear + 1,
        y: d.hour,
        month: d.month,
        value: convertValue(d[colorVar] as number, colorVarDef.unit),
        direction: d.windDirection as number,
        label: d.date.toLocaleDateString(),
        tooltip: `${d.date.toLocaleString()}\n${colorVarDef.name}: ${convertValue(d[colorVar] as number, colorVarDef.unit).toFixed(1)} ${cUnit}\nDir: ${getCompassDirection(d.windDirection as number)} (${d.windDirection}°)`
      }));
    }

    const cellHeight = heatmapHeight / 24;

    const cells = heatmapG.selectAll(".heatmap-cell-group")
      .data(heatmapData)
      .join("g")
      .attr("class", "heatmap-cell-group")
      .attr("transform", d => `translate(${xScale(d.x0)}, ${yScaleHeatmap(d.y)})`);

    cells.append("rect")
      .attr("width", d => Math.max(1, xScale(d.x1) - xScale(d.x0) - 1)) // -1 for gap
      .attr("height", cellHeight - 1) // -1 for gap
      .attr("rx", 2) // Smaller corner radius
      .attr("ry", 2)
      .style("fill", d => colorScale(d.value))
      .style("stroke", (aggregation === 'month' || aggregation === 'week') ? "rgba(0,0,0,0.1)" : "none")
      .style("stroke-width", "1px")
      .style("opacity", 1)
      .append("title")
      .text(d => d.tooltip);

    // Overlay text for wind direction
    if (aggregation === 'month' || aggregation === 'week') {
      cells.append("text")
        .attr("x", d => (xScale(d.x1) - xScale(d.x0)) / 2 - 0.5)
        .attr("y", cellHeight / 2 - 0.5)
        .attr("dy", "0.35em")
        .attr("text-anchor", "middle")
        .style("fill", heatmapTextColor)
        .style("font-size", aggregation === 'month' ? "10px" : "8px")
        .style("font-weight", "500")
        .style("pointer-events", "none")
        .style("opacity", 1)
        .text(d => (xScale(d.x1) - xScale(d.x0)) > 20 ? getCompassDirection(d.direction) : "");
    }

    // Add bounding box for the selected region
    if (filter.startMonth > 1 || filter.endMonth < 12 || filter.startHour > 0 || filter.endHour < 23) {
      const startDay = data.find(d => d.month === filter.startMonth)?.dayOfYear || 1;
      const endDayData = [...data].reverse().find(d => d.month === filter.endMonth);
      const endDay = endDayData ? endDayData.dayOfYear + 1 : 366;

      heatmapG.append("rect")
        .attr("x", xScale(startDay))
        .attr("y", yScaleHeatmap(filter.startHour))
        .attr("width", xScale(endDay) - xScale(startDay))
        .attr("height", yScaleHeatmap(filter.endHour + 1) - yScaleHeatmap(filter.startHour))
        .attr("fill", "none")
        .attr("stroke", heatmapTextColor)
        .attr("stroke-width", 3)
        .attr("rx", 2)
        .attr("ry", 2)
        .style("pointer-events", "none");
    }

    // Y Axis for Heatmap
    const formatHour = (h: number) => {
      if (h === 0 || h === 24) return "12 AM";
      if (h === 12) return "12 PM";
      return h < 12 ? `${h} AM` : `${h - 12} PM`;
    };

    const yAxisHeatmap = d3.axisLeft(yScaleHeatmap)
      .tickValues(d3.range(0, 25, 1))
      .tickFormat(d => formatHour(d as number));
    
    heatmapG.append("g")
      .call(yAxisHeatmap)
      .call(g => g.select(".domain").style("stroke", "#4b5563").style("stroke-width", "2px"))
      .call(g => g.selectAll(".tick line").attr("x2", innerWidth).style("stroke", "#4b5563").style("stroke-width", "1.5px").attr("stroke-opacity", 0.2))
      .call(g => g.selectAll(".tick text").style("fill", heatmapTextColor).style("font-weight", "bold").style("font-size", "8px"));

    // --- Bar Chart ---
    const barChartG = g.append("g");

    // Aggregate data for bar chart
    let aggregatedData: { x0: number, x1: number, valueSelected: number, minSelected?: number, maxSelected?: number, month: number }[] = [];
    
    if (aggregation === 'hour') {
      aggregatedData = rows.map(d => {
        const val = convertValue((d[colorVar] as number) || 0, colorVarDef.unit);
        return {
          x0: d.dayOfYear + d.hour / 24,
          x1: d.dayOfYear + (d.hour + 1) / 24,
          valueSelected: val,
          minSelected: val,
          maxSelected: val,
          month: d.month
        };
      });
    } else if (aggregation === 'day') {
      const days = d3.group(rows, d => d.dayOfYear);
      aggregatedData = Array.from(days, ([day, values]) => {
        return {
          x0: day,
          x1: day + 1,
          valueSelected: convertValue(d3.mean(values, d => d[colorVar] as number) || 0, colorVarDef.unit),
          minSelected: convertValue(d3.min(values, d => d[colorVar] as number) || 0, colorVarDef.unit),
          maxSelected: convertValue(d3.max(values, d => d[colorVar] as number) || 0, colorVarDef.unit),
          month: values[0].month
        };
      });
    } else if (aggregation === 'week') {
      const weeks = d3.group(rows, d => Math.floor((d.dayOfYear - 1) / 7));
      aggregatedData = Array.from(weeks, ([week, values]) => {
        return {
          x0: week * 7 + 1,
          x1: Math.min((week + 1) * 7 + 1, 366),
          valueSelected: convertValue(d3.mean(values, d => d[colorVar] as number) || 0, colorVarDef.unit),
          minSelected: convertValue(d3.min(values, d => d[colorVar] as number) || 0, colorVarDef.unit),
          maxSelected: convertValue(d3.max(values, d => d[colorVar] as number) || 0, colorVarDef.unit),
          month: values[0].month
        };
      });
    } else { // month
      const months = d3.group(rows, d => d.month);
      aggregatedData = Array.from(months, ([month, values]) => {
        const startDay = values[0].dayOfYear;
        const endDay = values[values.length - 1].dayOfYear + 1;
        return {
          x0: startDay,
          x1: endDay,
          valueSelected: convertValue(d3.mean(values, d => d[colorVar] as number) || 0, colorVarDef.unit),
          minSelected: convertValue(d3.min(values, d => d[colorVar] as number) || 0, colorVarDef.unit),
          maxSelected: convertValue(d3.max(values, d => d[colorVar] as number) || 0, colorVarDef.unit),
          month: month
        };
      });
    }

    const yMin = d3.min(aggregatedData, d => d.minSelected ?? d.valueSelected) || 0;
    const yMax = d3.max(aggregatedData, d => d.maxSelected ?? d.valueSelected) || cMax;

    const yScaleBar = d3.scaleLinear()
      .domain([yMin, yMax])
      .range([barChartHeight, 0])
      .nice();

    // Draw background bars (All Data)
    // We don't have "All Data" in WindExplorer the same way as DataExplorer because it's always filtered by comfort
    // But we can show the background of the range if we want. For now let's just do the foreground.

    // Draw foreground elements (Filtered Data)
    const fgGroups = barChartG.selectAll(".fg-group")
      .data(aggregatedData)
      .join("g")
      .attr("class", "fg-group");

    fgGroups.each(function(d) {
      const group = d3.select(this);
      const barW = Math.max(1, xScale(d.x1) - xScale(d.x0) - (aggregation === 'hour' ? 0 : 4));
      const xPos = xScale(d.x0);

      // Min-Max Range Bar
      const minVal = d.minSelected ?? d.valueSelected;
      const maxVal = d.maxSelected ?? d.valueSelected;
      
      const yMaxPx = yScaleBar(maxVal);
      const yMinPx = yScaleBar(minVal);
      const topY = Math.min(yMaxPx, yMinPx);
      const barH = Math.max(1, Math.abs(yMinPx - yMaxPx));
      const pillR = Math.min(barW / 2, barH / 2);

      group.append("rect")
        .attr("x", xPos)
        .attr("y", topY)
        .attr("width", barW)
        .attr("height", barH)
        .style("fill", colorScale(d.valueSelected))
        .style("opacity", 0.6)
        .attr("rx", pillR)
        .attr("ry", pillR);

      // Average Indicator Circle
      group.append("circle")
        .attr("cx", xPos + barW / 2)
        .attr("cy", yScaleBar(d.valueSelected))
        .attr("r", Math.min(barW / 2, 4))
        .style("fill", colorScale(d.valueSelected))
        .style("stroke", "#000000")
        .style("stroke-width", "1px");
    });

    fgGroups.append("title")
      .text(d => `Avg: ${d.valueSelected.toFixed(1)} ${cUnit}\nRange: ${d.minSelected?.toFixed(1) ?? 'N/A'} to ${d.maxSelected?.toFixed(1) ?? 'N/A'} ${cUnit}`);

    // Y Axis for Bar Chart
    const yAxisBar = d3.axisLeft(yScaleBar).ticks(5);
    barChartG.append("g")
      .call(yAxisBar)
      .call(g => g.select(".domain").style("stroke", theme === 'dark' ? '#6b7280' : '#4b5563').style("stroke-width", '2px'))
      .call(g => g.selectAll(".tick line").attr("x2", innerWidth).style("stroke", theme === 'dark' ? '#374151' : '#e5e7eb').style("stroke-width", '1.5px').attr("stroke-opacity", 0.5))
      .call(g => g.selectAll(".tick text").style("fill", heatmapTextColor).style("font-weight", "bold").style("font-size", `10px`));

    // --- Shared X Axis ---
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthDays = [1, 32, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335];

    const xAxis = d3.axisTop(xScale)
      .tickValues(monthDays)
      .tickFormat((_, i) => months[i]);

    heatmapG.append("g")
      .attr("transform", `translate(0, 0)`)
      .call(xAxis)
      .call(g => g.select(".domain").style("stroke", theme === 'dark' ? '#6b7280' : '#4b5563').style("stroke-width", '2px'))
      .call(g => g.selectAll(".tick line").style("stroke", theme === 'dark' ? '#6b7280' : '#4b5563').style("stroke-width", '2px'))
      .call(g => g.selectAll(".tick text").attr("x", (innerWidth / 12) / 2).attr("dy", "-0.5em").style("fill", heatmapTextColor).style("font-weight", "bold").style("font-size", `10px`));

    heatmapG.append("g")
      .attr("transform", `translate(0, ${heatmapHeight})`)
      .call(d3.axisBottom(xScale).tickValues(monthDays).tickFormat(() => ""))
      .call(g => g.select(".domain").style("stroke", theme === 'dark' ? '#6b7280' : '#4b5563').style("stroke-width", '2px'))
      .call(g => g.selectAll(".tick line").style("stroke", theme === 'dark' ? '#6b7280' : '#4b5563').style("stroke-width", '2px'));

    // --- Wind Rose ---
    // Removed from WindExplorer

  }, [data, compareData, showDifference, filteredData, variables, colorVar, gradientId, aggregation, gradients, filter, dimensions.width, unitSystem, heatmapTextColor, theme]);

  const stats = (() => {
    if (showDifference && compareData) {
      const diffs = filteredData.map(d => {
        const idx = data.indexOf(d);
        const primaryVal = d[colorVar] as number;
        const compareVal = compareData[idx]?.[colorVar] as number;
        if (primaryVal === null || compareVal === null) return null;
        return compareVal - primaryVal;
      }).filter(v => v !== null) as number[];

      return {
        avg: convertValue(d3.mean(diffs) || 0, colorVarDef.unit, true),
        min: convertValue(d3.min(diffs) || 0, colorVarDef.unit, true),
        max: convertValue(d3.max(diffs) || 0, colorVarDef.unit, true),
        total: convertValue(d3.sum(diffs) || 0, colorVarDef.unit, true),
        count: diffs.length
      };
    }

    return {
      avg: convertValue(d3.mean(filteredData, d => d[colorVar] as number) || 0, colorVarDef.unit),
      min: convertValue(d3.min(filteredData, d => d[colorVar] as number) || 0, colorVarDef.unit),
      max: convertValue(d3.max(filteredData, d => d[colorVar] as number) || 0, colorVarDef.unit),
      total: convertValue(d3.sum(filteredData, d => d[colorVar] as number) || 0, colorVarDef.unit),
      count: filteredData.length
    };
  })();

  return (
    <div 
      ref={outerRef}
      className={`group w-full h-full min-h-0 flex flex-col relative transition-colors duration-300 ${
        exportMode ? 'bg-white' : (theme === 'dark' ? 'bg-gray-800' : 'bg-white')
      }`}
      
    >
      {(exportMode || !pairSuppressHeader) && (
      <div className={`flex flex-col ${exportMode ? '' : 'border-b'} ${
        exportMode ? 'bg-white' : (theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-100 bg-white')
      } p-2`}>
        <div className="flex flex-col min-w-0">
          {exportMode ? (
            <div className="flex items-center gap-2 min-w-0 min-h-[28px]">
              <ChartTypeMenu
                value="wind"
                label="Wind Explorer"
                onChange={() => {}}
                theme="light"
                display="icon"
                staticIcon
              />
              <ExportHeaderCaption
                lines={[{ short: colorVarDef.category, long: colorVarDef.name }]}
              />
            </div>
          ) : comparePane === 'secondary' ? (
            <>
              <div
                className={`mb-2 rounded-lg border px-2 py-1.5 text-center text-[10px] font-bold uppercase tracking-wide ${
                  theme === 'dark'
                    ? 'border-orange-800/60 bg-orange-950/45 text-orange-100'
                    : 'border-orange-200 bg-orange-50 text-orange-900'
                }`}
              >
                Comparison · {paneCity ?? '—'}
              </div>
              <div className="pointer-events-none max-h-0 overflow-hidden opacity-0 transition-[max-height,opacity] duration-200 ease-out group-hover:pointer-events-auto group-hover:max-h-[52px] group-hover:opacity-100 focus-within:pointer-events-auto focus-within:max-h-[52px] focus-within:opacity-100">
                <div className="pt-1.5">
                  <AggregationToolbar
                    value={aggregation}
                    onChange={setAggregation}
                    theme={theme}
                    trailing={
                      <>
                        <button
                          type="button"
                          onClick={() => setShowStats(!showStats)}
                          className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold leading-none transition-colors ${
                            showStats
                              ? theme === 'dark'
                                ? 'bg-gray-700/90 text-gray-200'
                                : 'bg-gray-100 text-gray-800'
                              : theme === 'dark'
                                ? 'bg-gray-800 text-gray-400 hover:text-gray-200'
                                : 'bg-gray-50 text-gray-500 hover:text-gray-800'
                          }`}
                          title="Statistics"
                        >
                          Stats
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowSettings(!showSettings)}
                          className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full p-0 transition-colors ${
                            showSettings
                              ? theme === 'dark'
                                ? 'bg-gray-700/90 text-gray-200'
                                : 'bg-gray-100 text-gray-800'
                              : theme === 'dark'
                                ? 'bg-gray-800 text-gray-400 hover:text-gray-200'
                                : 'bg-gray-50 text-gray-500 hover:text-gray-800'
                          }`}
                          title="Chart settings"
                        >
                          <Settings2 className="h-3 w-3" />
                        </button>
                      </>
                    }
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              {comparePane === 'primary' && paneCity && (
                <div
                  className={`mb-2 rounded-lg border px-2 py-1.5 text-center text-[10px] font-bold uppercase tracking-wide ${
                    theme === 'dark'
                      ? 'border-blue-800/60 bg-blue-950/45 text-blue-100'
                      : 'border-blue-200 bg-blue-50 text-blue-900'
                  }`}
                >
                  Baseline · {paneCity}
                </div>
              )}
              <div className="flex w-full items-center justify-between gap-1.5">
                <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2">
                  <ChartTypeMenu
                    value="wind"
                    label="Wind Explorer"
                    onChange={t => onChangeType?.(t)}
                    theme={theme}
                    disabled={!onChangeType}
                    display="icon"
                  />
                  <VariableChartSelect
                    value={colorVar}
                    onChange={setColorVar}
                    selectedLabel={colorVarDef.name}
                    theme={theme}
                  >
                    {Object.entries(groupedVariables).map(([category, vars]) => (
                      <optgroup key={category} label={category}>
                        {vars.map(v => (
                          <option key={v.id} value={v.id}>
                            {v.name}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </VariableChartSelect>
                </div>
                {onRemove && (
                  <div className="opacity-0 pointer-events-none transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 focus-within:pointer-events-auto focus-within:opacity-100">
                    <button
                      type="button"
                      onClick={onRemove}
                      className={`inline-flex h-7 w-7 items-center justify-center rounded-full p-0 shadow-hard-sm transition-colors ${theme === 'dark' ? 'text-gray-400 hover:bg-red-900/20 hover:text-red-400' : 'text-gray-400 hover:bg-red-50 hover:text-red-500'}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
              <div className="pointer-events-none max-h-0 overflow-hidden opacity-0 transition-[max-height,opacity] duration-200 ease-out group-hover:pointer-events-auto group-hover:max-h-[52px] group-hover:opacity-100 focus-within:pointer-events-auto focus-within:max-h-[52px] focus-within:opacity-100">
                <div className="pt-1.5">
                  <AggregationToolbar
                    value={aggregation}
                    onChange={setAggregation}
                    theme={theme}
                    trailing={
                      <>
                        <button
                          type="button"
                          onClick={() => setShowStats(!showStats)}
                          className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold leading-none transition-colors ${
                            showStats
                              ? theme === 'dark'
                                ? 'bg-gray-700/90 text-gray-200'
                                : 'bg-gray-100 text-gray-800'
                              : theme === 'dark'
                                ? 'bg-gray-800 text-gray-400 hover:text-gray-200'
                                : 'bg-gray-50 text-gray-500 hover:text-gray-800'
                          }`}
                          title="Statistics"
                        >
                          Stats
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowSettings(!showSettings)}
                          className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full p-0 transition-colors ${
                            showSettings
                              ? theme === 'dark'
                                ? 'bg-gray-700/90 text-gray-200'
                                : 'bg-gray-100 text-gray-800'
                              : theme === 'dark'
                                ? 'bg-gray-800 text-gray-400 hover:text-gray-200'
                                : 'bg-gray-50 text-gray-500 hover:text-gray-800'
                          }`}
                          title="Chart settings"
                        >
                          <Settings2 className="h-3 w-3" />
                        </button>
                      </>
                    }
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      )}

      <CardModal
        open={showStatsModal}
        onClose={() => setShowStats(false)}
        title="Statistics"
        theme={theme}
        anchorRef={outerRef as any}
      >
        <div className="grid grid-cols-2 gap-2">
          <div className={`p-2 rounded-md ${theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
            <div className={`text-[10px] font-semibold uppercase tracking-wider mb-0.5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Average</div>
            <div className={`text-base font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{stats.avg.toFixed(1)} {cUnit}</div>
          </div>
          <div className={`p-2 rounded-md ${theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
            <div className={`text-[10px] font-semibold uppercase tracking-wider mb-0.5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Min / Max</div>
            <div className={`text-base font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{stats.min.toFixed(1)} / {stats.max.toFixed(1)} {cUnit}</div>
          </div>
          <div className={`p-2 rounded-md ${theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
            <div className={`text-[10px] font-semibold uppercase tracking-wider mb-0.5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Total</div>
            <div className={`text-base font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{stats.total.toFixed(0)} {cUnit}</div>
          </div>
          <div className={`p-2 rounded-md ${theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
            <div className={`text-[10px] font-semibold uppercase tracking-wider mb-0.5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Samples</div>
            <div className={`text-base font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{stats.count}</div>
          </div>
        </div>
      </CardModal>
      <CardModal
        open={showSettingsModal}
        onClose={() => setShowSettings(false)}
        title="Chart settings"
        theme={theme}
        anchorRef={outerRef as any}
        maxWidthPx={460}
      >
        <div className="grid grid-cols-1 gap-3">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className={`block text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Color Palette</label>
                  <button 
                    onClick={() => setShowGradientModal(true)}
                    className="text-[10px] font-bold text-gray-600 hover:text-gray-800 uppercase tracking-tight"
                  >
                    + Create
                  </button>
                </div>
                <div className={`flex overflow-x-auto rounded-full border p-1.5 ${theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                  {gradients.map(g => (
                    <button
                      key={g.id}
                      onClick={() => setGradientId(g.id)}
                      className={`mx-1 h-8 w-8 flex-shrink-0 rounded-full border-2 transition-all shadow-hard-sm ${
                        gradientId === g.id ? 'border-gray-700 scale-110 shadow-sm' : 'border-transparent hover:scale-105'
                      }`}
                      style={{ background: `linear-gradient(to right, ${g.colors.join(', ')})` }}
                      title={g.name}
                    />
                  ))}
                </div>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <label className={`block text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Comfort Filtering</label>
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      onClick={() => applyPreset('summer')}
                      className={`rounded-full border px-2 py-1 text-[10px] font-semibold transition-colors ${theme === 'dark' ? 'bg-orange-900/30 text-orange-400 border-orange-800 hover:bg-orange-900/50' : 'bg-orange-50 text-orange-700 border-orange-100 hover:bg-orange-100'}`}
                    >
                      Summer Cooling
                    </button>
                    <button
                      onClick={() => applyPreset('winter')}
                      className={`rounded-full border px-2 py-1 text-[10px] font-semibold transition-colors ${theme === 'dark' ? 'bg-gray-800/80 text-gray-200 border-gray-600 hover:bg-gray-800' : 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200'}`}
                    >
                      Winter Chill
                    </button>
                    <button
                      onClick={() => applyPreset('pedestrian')}
                      className={`rounded-full border px-2 py-1 text-[10px] font-semibold transition-colors ${theme === 'dark' ? 'bg-green-900/30 text-green-400 border-green-800 hover:bg-green-900/50' : 'bg-green-50 text-green-700 border-green-100 hover:bg-green-100'}`}
                    >
                      Pedestrian
                    </button>
                    <button
                      onClick={() => applyPreset('sitting')}
                      className={`rounded-full border px-2 py-1 text-[10px] font-semibold transition-colors ${theme === 'dark' ? 'bg-teal-900/30 text-teal-400 border-teal-800 hover:bg-teal-900/50' : 'bg-teal-50 text-teal-700 border-teal-100 hover:bg-teal-100'}`}
                    >
                      Sitting
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={tempFilterEnabled}
                    onChange={(e) => setTempFilterEnabled(e.target.checked)}
                    className={`rounded text-gray-700 focus:ring-gray-500 ${theme === 'dark' ? 'border-gray-600 bg-gray-800' : 'border-gray-300'}`}
                  />
                  <span className={`text-xs ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>Filter by Temperature</span>
                </label>
                {tempFilterEnabled && (
                  <div className="flex gap-2">
                    <select
                      value={tempFilterType}
                      onChange={(e) => setTempFilterType(e.target.value as 'above' | 'below')}
                      className={`block rounded-full border p-1.5 text-xs transition-all ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-gray-200 focus:ring-gray-500 focus:border-gray-700 hover:bg-gray-700' : 'bg-gray-50 border-gray-200 text-gray-900 focus:ring-gray-500 focus:border-gray-700 hover:bg-white'}`}
                    >
                      <option value="above">Above</option>
                      <option value="below">Below</option>
                    </select>
                    <div className="relative flex-1">
                      <input
                        type="number"
                        value={tempThreshold}
                        onChange={(e) => setTempThreshold(Number(e.target.value))}
                        className={`block w-full rounded-full border p-1.5 pr-6 text-xs transition-all ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-gray-200 focus:ring-gray-500 focus:border-gray-700 hover:bg-gray-700' : 'bg-gray-50 border-gray-200 text-gray-900 focus:ring-gray-500 focus:border-gray-700 hover:bg-white'}`}
                      />
                      <span className={`absolute right-2 top-1.5 text-[10px] ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>{unitSystem === 'imperial' ? '°F' : '°C'}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={speedFilterEnabled}
                    onChange={(e) => setSpeedFilterEnabled(e.target.checked)}
                    className={`rounded text-gray-700 focus:ring-gray-500 ${theme === 'dark' ? 'border-gray-600 bg-gray-800' : 'border-gray-300'}`}
                  />
                  <span className={`text-xs ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>Filter by Wind Speed</span>
                </label>
                {speedFilterEnabled && (
                  <div className="flex gap-2">
                    <select
                      value={speedFilterType}
                      onChange={(e) => setSpeedFilterType(e.target.value as 'above' | 'below')}
                      className={`block rounded-full border p-1.5 text-xs transition-all ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-gray-200 focus:ring-gray-500 focus:border-gray-700 hover:bg-gray-700' : 'bg-gray-50 border-gray-200 text-gray-900 focus:ring-gray-500 focus:border-gray-700 hover:bg-white'}`}
                    >
                      <option value="above">Above</option>
                      <option value="below">Below</option>
                    </select>
                    <div className="relative flex-1">
                      <input
                        type="number"
                        value={speedThreshold}
                        onChange={(e) => setSpeedThreshold(Number(e.target.value))}
                        className={`block w-full rounded-full border p-1.5 pr-10 text-xs transition-all ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-gray-200 focus:ring-gray-500 focus:border-gray-700 hover:bg-gray-700' : 'bg-gray-50 border-gray-200 text-gray-900 focus:ring-gray-500 focus:border-gray-700 hover:bg-white'}`}
                      />
                      <span className={`absolute right-2 top-1.5 text-[10px] ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>{unitSystem === 'imperial' ? 'mph' : 'm/s'}</span>
                    </div>
                  </div>
                )}
              </div>
        </div>
      </CardModal>

      <div className="px-0 py-1 flex-1 min-h-0 flex flex-col gap-1 overflow-hidden min-w-0">
        <div 
          className="w-full flex-1 min-h-0 min-w-0 relative" 
          ref={containerRef}
        >
          <svg ref={svgRef} className="w-full h-full max-w-full" preserveAspectRatio="xMidYMid meet" />
        </div>
        <div className="mt-0 flex-shrink-0 px-0.5 pt-0 w-full min-w-0">
          <InteractiveLegend 
            variable={{ ...colorVarDef, min: cMin, max: cMax, unit: cUnit }} 
            gradientId={gradientId} 
            setGradientId={setGradientId} 
            gradients={gradients} 
            theme={theme} 
            isDifference={showDifference}
          />
        </div>
      </div>
    </div>
  );
}
