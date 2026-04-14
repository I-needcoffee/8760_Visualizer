import { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';
import SunCalc from 'suncalc';
import { EPWDataRow, EPWMetadata, EPWVariable } from '../lib/epwParser';
import { InteractiveLegend, GradientDef } from './InteractiveLegend';
import { ChartHeader } from './ChartHeader';
import { ChartType } from '../App';
import { X, Settings2 } from 'lucide-react';

import { GlobalFilterState } from './GlobalFilterPanel';
import { UnitSystem } from '../App';

interface SunPathProps {
  metadata: EPWMetadata;
  data: EPWDataRow[];
  compareData?: EPWDataRow[];
  showDifference?: boolean;
  stackedComparison?: boolean;
  variables: EPWVariable[];
  onRemove?: () => void;
  gradients: GradientDef[];
  filter: GlobalFilterState;
  unitSystem: UnitSystem;
  heatmapTextColor: string;
  theme: 'light' | 'dark';
  setShowGradientModal: (show: boolean) => void;
  exportMode?: boolean;
}

export function SunPath({ 
  metadata, data, compareData, showDifference, stackedComparison, variables, onRemove, gradients, filter, unitSystem, heatmapTextColor, theme, 
  setShowGradientModal, exportMode
}: SunPathProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const compareSvgRef = useRef<SVGSVGElement>(null);
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
  const [aggregation, setAggregation] = useState<'hour' | 'day' | 'week' | 'month'>('week');
  const [colorVar, setColorVar] = useState(variables[0]?.id || '');
  const [radiusVar, setRadiusVar] = useState(variables.find(v => v.id === 'globalHorizontalRadiation')?.id || variables[0]?.id || '');
  const [gradientId, setGradientId] = useState(gradients[0].id);
  const [radiusMin, setRadiusMin] = useState<number | string>(2);
  const [radiusMax, setRadiusMax] = useState<number | string>(10);
  const [showSettings, setShowSettings] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [tempFilterEnabled, setTempFilterEnabled] = useState(false);
  const [tempFilterType, setTempFilterType] = useState<'helpful' | 'harmful'>('helpful');
  const [helpfulThreshold, setHelpfulThreshold] = useState(unitSystem === 'imperial' ? 68 : 20);
  const [harmfulThreshold, setHarmfulThreshold] = useState(unitSystem === 'imperial' ? 77 : 25);

  const prevUnitSystem = useRef(unitSystem);
  useEffect(() => {
    if (prevUnitSystem.current !== unitSystem) {
      if (unitSystem === 'imperial') {
        setHelpfulThreshold(t => Math.round(t * 9/5 + 32));
        setHarmfulThreshold(t => Math.round(t * 9/5 + 32));
      } else {
        setHelpfulThreshold(t => Math.round((t - 32) * 5/9));
        setHarmfulThreshold(t => Math.round((t - 32) * 5/9));
      }
      prevUnitSystem.current = unitSystem;
    }
  }, [unitSystem]);

  // Group variables by category
  const groupedVariables = variables.reduce((acc, variable) => {
    const category = variable.category || 'Other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(variable);
    return acc;
  }, {} as Record<string, EPWVariable[]>);

  const radiusVarDef = variables.find(v => v.id === radiusVar) || variables[0];

  const convertValue = (val: number | null | undefined, unit: string, isDelta: boolean = false) => {
    if (val === null || val === undefined) return 0;
    if (unitSystem === 'imperial') {
      if (unit === '°C') return isDelta ? val * 9/5 : val * 9/5 + 32;
      if (unit === 'm/s') return val * 2.23694;
      if (unit === 'mm') return val / 25.4;
    }
    return val;
  };

  const convertUnit = (unit: string) => {
    if (unitSystem === 'imperial') {
      if (unit === '°C') return '°F';
      if (unit === 'm/s') return 'mph';
      if (unit === 'mm') return 'in';
    }
    return unit;
  };

  // Calculate local stats for filtered data
  const filteredData = data.filter(d => {
    const isMonthMatch = filter.startMonth <= filter.endMonth
      ? (d.month >= filter.startMonth && d.month <= filter.endMonth)
      : (d.month >= filter.startMonth || d.month <= filter.endMonth);
    
    let isTempMatch = true;
    if (tempFilterEnabled) {
      const temp = convertValue(d.dryBulbTemperature as number, '°C');
      if (tempFilterType === 'helpful') {
        isTempMatch = temp < helpfulThreshold;
      } else {
        isTempMatch = temp > harmfulThreshold;
      }
    }

    return isMonthMatch && 
           d.hour >= filter.startHour && 
           d.hour <= filter.endHour &&
           isTempMatch;
  });

const filteredCompareData = (compareData || []).filter(d => {
    const isMonthMatch = filter.startMonth <= filter.endMonth
      ? (d.month >= filter.startMonth && d.month <= filter.endMonth)
      : (d.month >= filter.startMonth || d.month <= filter.endMonth);
    
    let isTempMatch = true;
    if (tempFilterEnabled) {
      const temp = convertValue(d.dryBulbTemperature as number, '°C');
      if (tempFilterType === 'helpful') {
        isTempMatch = temp < helpfulThreshold;
      } else {
        isTempMatch = temp > harmfulThreshold;
      }
    }

    return isMonthMatch && 
           d.hour >= filter.startHour && 
           d.hour <= filter.endHour &&
           isTempMatch;
  });

  const { colorVarDef, cMin, cMax, cUnit } = useMemo(() => {
    const def = variables.find(v => v.id === colorVar) || variables[0];
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

  useEffect(() => {
    if (!svgRef.current || dimensions.width === 0) return;

const renderChart = (svgEl: any, currentData: any[], title: string | null, isCompare: boolean) => {
    if (!currentData || !currentData.length) return;
        const BASE_WIDTH = 350;
    const width = BASE_WIDTH;
    const height = 420;
    const margin = 30;
    const radius = Math.min(width, height) / 2 - margin;

    const svg = d3.select(svgEl);
    svg.selectAll("*").remove();

    const g = svg
      .attr("viewBox", `0 0 ${width} ${height}`)
      .append("g")
      .attr("transform", `translate(${width / 2},${height / 2})`);

    // Scales
    const rScale = d3.scaleLinear().domain([90, 0]).range([0, radius]); // Altitude 90 at center, 0 at edge
    const aScale = d3.scaleLinear().domain([0, 360]).range([0, 2 * Math.PI]); // Azimuth

    // Calculate sun positions and aggregate
    let points: any[] = [];
    
    if (aggregation === 'hour') {
      points = currentData.map((d, i) => {
        const pos = SunCalc.getPosition(d.date, metadata.lat, metadata.lng);
        const altitude = pos.altitude * 180 / Math.PI;
        const azimuth = (pos.azimuth * 180 / Math.PI + 180) % 360; // Convert to 0=N, 90=E
        
        let val: number;
        let rVal: number;
        if (showDifference && compareData) {
          const primaryVal = d[colorVar] as number;
          const compareVal = compareData[i]?.[colorVar] as number;
          val = convertValue(compareVal - primaryVal, colorVarDef.unit, true);
          rVal = d[radiusVar] as number; // Keep primary radius in difference mode
        } else {
          val = convertValue(d[colorVar] as number, colorVarDef.unit);
          rVal = d[radiusVar] as number;
        }
        
        return { ...d, altitude, azimuth, _val: val, _rVal: rVal };
      }).filter(d => d.altitude > 0);
      console.log('SunPath points (hour aggregation):', points.length, points[0]);
    } else {
      // Aggregate data by hour of day, then by the selected period
      // This creates an "average day" for the period
      let groups;
      if (aggregation === 'day') {
        groups = d3.group(currentData, d => d.dayOfYear, d => d.hour);
      } else if (aggregation === 'week') {
        groups = d3.group(currentData, d => Math.floor((d.dayOfYear - 1) / 7), d => d.hour);
      } else { // month
        groups = d3.group(currentData, d => d.month, d => d.hour);
      }

      Array.from(groups).forEach(([period, hourGroups]) => {
        Array.from(hourGroups).forEach(([hour, values]) => {
          // Use the middle date of the period for sun position calculation
          const midDate = values[Math.floor(values.length / 2)].date;
          const pos = SunCalc.getPosition(midDate, metadata.lat, metadata.lng);
          const altitude = pos.altitude * 180 / Math.PI;
          
          if (altitude > 0) {
            const azimuth = (pos.azimuth * 180 / Math.PI + 180) % 360;
            
            let val: number;
            let rVal: number;
            if (showDifference && compareData) {
              const primaryAvg = d3.mean(values, d => d[colorVar] as number) || 0;
              const compareValues = values.map(v => {
                const idx = currentData.indexOf(v);
                return compareData[idx]?.[colorVar] as number;
              }).filter(v => v !== null);
              const compareAvg = d3.mean(compareValues) || 0;
              val = convertValue(compareAvg - primaryAvg, colorVarDef.unit, true);
              rVal = d3.mean(values, d => d[radiusVar] as number) || 0; // Keep primary radius
            } else {
              val = convertValue(d3.mean(values, d => d[colorVar] as number) || 0, colorVarDef.unit);
              rVal = d3.mean(values, d => d[radiusVar] as number) || 0;
            }

            points.push({
              date: midDate,
              altitude,
              azimuth,
              _val: val,
              _rVal: rVal,
              [radiusVar]: rVal, // Keep for tooltip/sorting compatibility
              dryBulbTemperature: d3.mean(values as EPWDataRow[], (d: EPWDataRow) => d.dryBulbTemperature as number) || 0,
              _count: values.length,
              _period: period,
              _hour: hour,
              month: values[0].month
            });
          }
        });
      });
      console.log('SunPath points (aggregated):', points.length, points[0]);
    }

    // Color scale
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

    // Radius scale
    const rMin = typeof radiusMin === 'number' ? radiusMin : (parseFloat(radiusMin) || 5);
    const rMax = typeof radiusMax === 'number' ? radiusMax : (parseFloat(radiusMax) || 25);
    const radiusVarDef = variables.find(v => v.id === radiusVar) || variables[0];
    const pointRadiusScale = d3.scaleLinear()
      .domain([radiusVarDef.min, radiusVarDef.max])
      .range([rMin as number, rMax as number])
      .clamp(true);

    // Sort points so larger circles are drawn first (at the bottom)
    points.sort((a, b) => ((b._rVal as number) || 0) - ((a._rVal as number) || 0));

    // Split points into selected and unselected
    const isSelected = (d: any) => {
      const m = d.month || (d.date ? d.date.getMonth() + 1 : 1);
      const h = d._hour !== undefined ? d._hour : (d.hour !== undefined ? d.hour : (d.date ? d.date.getHours() : 0));
      const isMonthMatch = filter.startMonth <= filter.endMonth
        ? (m >= filter.startMonth && m <= filter.endMonth)
        : (m >= filter.startMonth || m <= filter.endMonth);
      
      let isTempMatch = true;
      if (tempFilterEnabled) {
        const temp = convertValue(d.dryBulbTemperature as number, '°C');
        if (isNaN(temp)) {
          isTempMatch = true;
        } else if (tempFilterType === 'helpful') {
          isTempMatch = temp < helpfulThreshold;
        } else {
          isTempMatch = temp > harmfulThreshold;
        }
      }

      return isMonthMatch && h >= filter.startHour && h <= filter.endHour && isTempMatch;
    };

    const selectedPoints = points.filter(isSelected);
    const unselectedPoints = points.filter(d => !isSelected(d));

    // 1. Draw unselected points (bottom layer)
    g.selectAll(".data-point-unselected")
      .data(unselectedPoints)
      .join("circle")
      .attr("class", "data-point-unselected")
      .attr("cx", d => rScale(d.altitude) * Math.sin(aScale(d.azimuth)))
      .attr("cy", d => -rScale(d.altitude) * Math.cos(aScale(d.azimuth)))
      .attr("r", d => pointRadiusScale(d._rVal as number) || 0)
      .style("fill", d => colorScale(d._val))
      .style("stroke", "none")
      .style("opacity", 0.15)
      .style("pointer-events", "none");

    // 2. Draw grid
    const altitudes = [0, 15, 30, 45, 60, 75];
    const azimuths = d3.range(0, 360, 30);

    // Altitude circles
    g.selectAll(".altitude-circle")
      .data(altitudes)
      .join("circle")
      .attr("class", "altitude-circle")
      .attr("r", d => rScale(d))
      .style("fill", "none")
      .style("stroke", d => d === 0 ? (theme === 'dark' ? '#4b5563' : '#1f2937') : (theme === 'dark' ? '#374151' : '#e5e7eb'))
      .style("stroke-width", d => d === 0 ? '2px' : '1px');

    // Altitude labels
    g.selectAll(".altitude-label")
      .data(altitudes.filter(d => d > 0))
      .join("text")
      .attr("class", "altitude-label")
      .attr("y", d => -rScale(d))
      .attr("dy", "0.35em")
      .attr("text-anchor", "middle")
      .style("fill", heatmapTextColor)
      .style("font-size", `10px`)
      .style("font-weight", "500")
      .text(d => `${d}°`);

    // Azimuth lines
    g.selectAll(".azimuth-line")
      .data(azimuths)
      .join("line")
      .attr("class", "azimuth-line")
      .attr("x1", 0)
      .attr("y1", 0)
      .attr("x2", d => rScale(0) * Math.sin(aScale(d)))
      .attr("y2", d => -rScale(0) * Math.cos(aScale(d)))
      .style("stroke", theme === 'dark' ? '#374151' : '#e5e7eb')
      .style("stroke-width", '1px');

    // Azimuth labels
    const compass = { 0: 'N', 90: 'E', 180: 'S', 270: 'W' };
    g.selectAll(".azimuth-label")
      .data(azimuths)
      .join("text")
      .attr("class", "azimuth-label")
      .attr("x", d => (rScale(0) + 10) * Math.sin(aScale(d)))
      .attr("y", d => -(rScale(0) + 10) * Math.cos(aScale(d)))
      .attr("dy", "0.35em")
      .attr("text-anchor", "middle")
      .style("fill", heatmapTextColor)
      .style("font-weight", "bold")
      .style("font-size", d => compass[d as keyof typeof compass] ? `16px` : `12px`)
      .text(d => compass[d as keyof typeof compass] || `${d}°`);

    // 3. Draw Sun Path Lines (Solstices and Equinoxes)
    const year = currentData[0]?.date.getFullYear() || new Date().getFullYear();
    const keyDates = [
      { name: 'Summer Solstice', date: new Date(year, 5, 21) }, // June 21
      { name: 'Equinox', date: new Date(year, 2, 21) }, // March 21
      { name: 'Winter Solstice', date: new Date(year, 11, 21) } // Dec 21
    ];

    const lineGenerator = d3.line<any>()
      .x(d => rScale(d.altitude) * Math.sin(aScale(d.azimuth)))
      .y(d => -rScale(d.altitude) * Math.cos(aScale(d.azimuth)))
      .curve(d3.curveBasis);

    keyDates.forEach(kd => {
      const pathPoints = [];
      // Generate points for every 10 minutes throughout the day
      for (let h = 0; h < 24; h++) {
        for (let m = 0; m < 60; m += 10) {
          const d = new Date(kd.date);
          d.setHours(h, m, 0, 0);
          const pos = SunCalc.getPosition(d, metadata.lat, metadata.lng);
          const altitude = pos.altitude * 180 / Math.PI;
          if (altitude >= 0) { // Stop exactly at horizon
            const azimuth = (pos.azimuth * 180 / Math.PI + 180) % 360;
            pathPoints.push({ altitude, azimuth });
          }
        }
      }

      if (pathPoints.length > 0) {
        g.append("path")
          .datum(pathPoints)
          .attr("d", lineGenerator)
          .style("fill", "none")
          .style("stroke", theme === 'dark' ? '#6b7280' : '#4b5563')
          .style("stroke-width", '3px')
          .style("opacity", 0.8)
          .style("pointer-events", "none");
          
        // Add label for the path
        const highestPoint = pathPoints.reduce((prev, current) => (prev.altitude > current.altitude) ? prev : current);
        if (highestPoint.altitude > 0) {
          g.append("text")
            .attr("x", rScale(highestPoint.altitude) * Math.sin(aScale(highestPoint.azimuth)))
            .attr("y", -rScale(highestPoint.altitude) * Math.cos(aScale(highestPoint.azimuth)) - 10)
            .attr("text-anchor", "middle")
            .style("fill", heatmapTextColor)
            .style("font-size", `9px`)
            .style("font-weight", "bold")
            .style("pointer-events", "none")
            .text(kd.name);
        }
      }
    });

    // 4. Draw black background circles for selected points
    g.selectAll(".data-point-bg")
      .data(selectedPoints)
      .join("circle")
      .attr("class", "data-point-bg")
      .attr("cx", d => rScale(d.altitude) * Math.sin(aScale(d.azimuth)))
      .attr("cy", d => -rScale(d.altitude) * Math.cos(aScale(d.azimuth)))
      .attr("r", d => (pointRadiusScale(d._rVal as number) || 0) + 2) // +2px for outline
      .style("fill", theme === 'dark' ? '#111827' : '#1f2937')
      .style("opacity", 0.8)
      .style("pointer-events", "none");

    // 5. Draw selected points (top layer)
    g.selectAll(".data-point-selected")
      .data(selectedPoints)
      .join("circle")
      .attr("class", "data-point-selected")
      .attr("cx", d => rScale(d.altitude) * Math.sin(aScale(d.azimuth)))
      .attr("cy", d => -rScale(d.altitude) * Math.cos(aScale(d.azimuth)))
      .attr("r", d => pointRadiusScale(d._rVal as number) || 0)
      .style("fill", d => colorScale(d._val))
      .style("stroke", "none")
      .style("opacity", 1)
      .style("mix-blend-mode", "normal")
      .append("title")
      .text(d => {
        const prefix = aggregation === 'hour' ? '' : `Avg (${d._count} samples)\n`;
        const val = d._val;
        return `${prefix}${d.date.toLocaleString()}\nAlt: ${d.altitude.toFixed(1)}°\nAz: ${d.azimuth.toFixed(1)}°\n${colorVarDef.name}${showDifference ? ' Diff' : ''}: ${val.toFixed(1)} ${cUnit}`;
      });


    
    if (title) {
         g.append("rect")
          .attr("x", -margin + 4)
          .attr("y", -height/2 + 4)
          .attr("width", 4)
          .attr("height", 16)
          .attr("rx", 2)
          .attr("fill", isCompare ? "#9ca3af" : "#3b82f6");

         g.append("text")
          .attr("x", -margin + 10)
          .attr("y", -height/2 + 16)
          .style("font-size", "12px")
          .style("font-weight", "bold")
          .style("fill", heatmapTextColor)
          .text(title);
    }
  };

  if (stackedComparison && compareData && compareSvgRef.current) {
      renderChart(svgRef.current, data, "Baseline Local Dataset", false);
      renderChart(compareSvgRef.current, compareData, "Comparative Dataset", true);
  } else {
      renderChart(svgRef.current, data, null, false);
  }
  }, [metadata, data, compareData, showDifference, variables, colorVar, radiusVar, gradientId, radiusMin, radiusMax, aggregation, gradients, filter, dimensions.width, unitSystem, theme, heatmapTextColor, tempFilterEnabled, tempFilterType, helpfulThreshold, harmfulThreshold, colorVarDef]);

  return (
    <div 
      ref={outerRef}
      className={`w-full h-fit flex flex-col relative transition-colors duration-300 ${
        exportMode ? 'bg-white' : (theme === 'dark' ? 'bg-gray-800' : 'bg-white')
      }`}
      
    >
      <div className={`flex flex-col ${exportMode ? '' : 'border-b'} ${
        exportMode ? 'bg-white' : (theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-100 bg-white')
      } p-3 gap-2`}>
        <div className="flex items-center justify-between w-full gap-2">
          <div className="flex items-center min-w-0 gap-2 sm:gap-3">
            <h3 className={`font-semibold whitespace-nowrap uppercase tracking-wider text-sm ${
              exportMode ? 'text-gray-800' : (theme === 'dark' ? 'text-gray-200' : 'text-gray-800')
            }`}>Sun Path</h3>
            <div className={`shrink-0 w-px h-4 ${
              exportMode ? 'bg-gray-200' : (theme === 'dark' ? 'bg-gray-600' : 'bg-gray-200')
            }`}></div>
            <span className="text-xs font-medium text-gray-500 truncate">{colorVarDef.name}</span>
          </div>
          {onRemove && !exportMode && (
            <button onClick={onRemove} className={`rounded-md transition-colors shadow-hard-md p-1.5 ${theme === 'dark' ? 'text-gray-400 hover:text-red-400 hover:bg-red-900/30' : 'text-gray-400 hover:text-red-500 hover:bg-red-50'}`}>
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        
        {exportMode ? (
          <div className="flex flex-wrap items-center justify-between w-full gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Aggregation:</span>
              <span className="text-xs font-bold uppercase tracking-widest text-blue-600">
                {aggregation}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between w-full gap-2">
            <div className={`flex flex-wrap rounded-lg p-1 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'}`}>
              {(['hour', 'day', 'week', 'month'] as const).map(agg => (
                <button
                  key={agg}
                  onClick={() => setAggregation(agg)}
                  className={`rounded-md font-medium capitalize transition-colors shadow-hard-sm px-3 py-1 text-xs ${
                    aggregation === agg ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {agg}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowStats(!showStats)}
                className={`rounded-md font-medium transition-colors border shadow-hard-md px-3 py-1 text-xs ${
                  showStats 
                    ? (theme === 'dark' ? 'bg-blue-900/50 border-blue-800 text-blue-400' : 'bg-blue-50 border-blue-100 text-blue-600') 
                    : (theme === 'dark' ? 'bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-200' : 'bg-white border-gray-200 text-gray-500 hover:text-gray-700')
                }`}
                title="Toggle Statistics"
              >
                Stats
              </button>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className={`rounded-md transition-colors border shadow-hard-md p-1.5 ${
                  showSettings 
                    ? (theme === 'dark' ? 'bg-blue-900/50 border-blue-800 text-blue-400' : 'bg-blue-50 border-blue-100 text-blue-600') 
                    : (theme === 'dark' ? 'bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-200' : 'bg-white border-gray-200 text-gray-400 hover:text-gray-600')
                }`}
                title="Chart Settings"
              >
                <Settings2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Stats Modal */}
      {showStats && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowStats(false)}>
          <div className={`p-6 rounded-xl shadow-hard-xl max-w-md w-full max-h-[90vh] overflow-y-auto ${theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white'}`} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Statistics</h3>
              <button onClick={() => setShowStats(false)} className={`p-1 rounded-md ${theme === 'dark' ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                <div className={`text-xs font-semibold uppercase tracking-wider mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Average</div>
                <div className={`text-xl font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{stats.avg.toFixed(1)} {cUnit}</div>
              </div>
              <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                <div className={`text-xs font-semibold uppercase tracking-wider mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Min / Max</div>
                <div className={`text-xl font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{stats.min.toFixed(1)} / {stats.max.toFixed(1)} {cUnit}</div>
              </div>
              <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                <div className={`text-xs font-semibold uppercase tracking-wider mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Total</div>
                <div className={`text-xl font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{stats.total.toFixed(0)} {cUnit}</div>
              </div>
              <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                <div className={`text-xs font-semibold uppercase tracking-wider mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Samples</div>
                <div className={`text-xl font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{stats.count}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowSettings(false)}>
          <div className={`p-6 rounded-xl shadow-hard-xl max-w-lg w-full max-h-[90vh] overflow-y-auto ${theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white'}`} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Chart Settings</h3>
              <button onClick={() => setShowSettings(false)} className={`p-1 rounded-md ${theme === 'dark' ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-2">
                <label className={`block text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Color Variable</label>
                <select
                  value={colorVar}
                  onChange={(e) => setColorVar(e.target.value)}
                  className={`w-full text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 transition-all outline-none border ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white hover:bg-gray-600' : 'bg-gray-50 border-gray-200 text-gray-900 hover:bg-white'}`}
                >
                  {Object.entries(groupedVariables).map(([category, vars]) => (
                    <optgroup key={category} label={category}>
                      {vars.map(v => (
                        <option key={v.id} value={v.id}>{v.name}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className={`block text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Radius Variable</label>
                <select
                  value={radiusVar}
                  onChange={(e) => setRadiusVar(e.target.value)}
                  className={`w-full text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 transition-all outline-none border ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white hover:bg-gray-600' : 'bg-gray-50 border-gray-200 text-gray-900 hover:bg-white'}`}
                >
                  {Object.entries(groupedVariables).map(([category, vars]) => (
                    <optgroup key={category} label={category}>
                      {vars.map(v => (
                        <option key={v.id} value={v.id}>{v.name}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className={`block text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Radius Min/Max</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={radiusMin}
                    onChange={(e) => setRadiusMin(e.target.value)}
                    className={`w-1/2 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 transition-all outline-none border ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white hover:bg-gray-600' : 'bg-gray-50 border-gray-200 text-gray-900 hover:bg-white'}`}
                    placeholder="Min"
                  />
                  <input
                    type="number"
                    value={radiusMax}
                    onChange={(e) => setRadiusMax(e.target.value)}
                    className={`w-1/2 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 transition-all outline-none border ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white hover:bg-gray-600' : 'bg-gray-50 border-gray-200 text-gray-900 hover:bg-white'}`}
                    placeholder="Max"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className={`block text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Color Palette</label>
                  <button 
                    onClick={() => setShowGradientModal(true)}
                    className="text-[10px] font-bold text-blue-500 hover:text-blue-600 uppercase tracking-tight"
                  >
                    + Create
                  </button>
                </div>
                <div className={`flex p-1.5 rounded-lg overflow-x-auto border ${theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                  {gradients.map(g => (
                    <button
                      key={g.id}
                      onClick={() => setGradientId(g.id)}
                      className={`flex-shrink-0 w-8 h-8 rounded-md mx-1 border-2 transition-all shadow-hard-sm ${
                        gradientId === g.id ? 'border-blue-500 scale-110 shadow-sm' : 'border-transparent hover:scale-105'
                      }`}
                      style={{ background: `linear-gradient(to right, ${g.colors.join(', ')})` }}
                      title={g.name}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <label className={`block text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    Temperature Filter
                  </label>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer"
                      checked={tempFilterEnabled}
                      onChange={e => setTempFilterEnabled(e.target.checked)}
                    />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                
                {tempFilterEnabled && (
                  <div className="flex gap-2 items-center">
                    <select
                      value={tempFilterType}
                      onChange={e => setTempFilterType(e.target.value as any)}
                      className={`flex-1 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 transition-all outline-none border ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white hover:bg-gray-600' : 'bg-gray-50 border-gray-200 text-gray-900 hover:bg-white'}`}
                    >
                      <option value="helpful">Helpful (Below)</option>
                      <option value="harmful">Harmful (Above)</option>
                    </select>
                    <div className="relative flex-1">
                      <input
                        type="number"
                        value={tempFilterType === 'helpful' ? helpfulThreshold : harmfulThreshold}
                        onChange={e => {
                          if (tempFilterType === 'helpful') {
                            setHelpfulThreshold(Number(e.target.value));
                          } else {
                            setHarmfulThreshold(Number(e.target.value));
                          }
                        }}
                        className={`w-full text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 transition-all outline-none border ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white hover:bg-gray-600' : 'bg-gray-50 border-gray-200 text-gray-900 hover:bg-white'}`}
                      />
                      <span className={`absolute right-3 top-2.5 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                        {unitSystem === 'imperial' ? '°F' : '°C'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="p-3 flex-1 flex flex-col gap-4">
        <div className="w-full flex items-center justify-center relative" >
          <svg ref={svgRef} className="w-full h-full max-h-full" />
        </div>
        {stackedComparison && compareData && (
        <div className="w-full flex items-center justify-center relative" style={{ aspectRatio: '350/420' }}>
          <svg ref={compareSvgRef} className="w-full h-full max-h-full" />
        </div>
        )}
        <div className="mt-2 flex-shrink-0" style={{ minHeight: "52px" }}>
          <InteractiveLegend 
            variable={{ ...colorVarDef, min: cMin, max: cMax, unit: cUnit }} 
            gradientId={gradientId} 
            setGradientId={setGradientId} 
            gradients={gradients} 
            theme={theme} 
            fontScale={1} 
            isDifference={showDifference}
          />
        </div>
      </div>
    </div>
  );
}
