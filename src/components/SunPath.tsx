import { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';
import SunCalc from 'suncalc';
import { EPWDataRow, EPWMetadata, EPWVariable } from '../lib/epwParser';
import { InteractiveLegend, GradientDef } from './InteractiveLegend';
import { AggregationToolbar } from './AggregationToolbar';
import { ChartType } from '../App';
import { X, Settings2 } from 'lucide-react';

import { GlobalFilterState } from './GlobalFilterPanel';
import { UnitSystem } from '../App';
import { ChartTypeMenu } from './ChartTypeMenu';
import { ExportHeaderCaption } from './ExportHeaderCaption';

interface SunPathProps {
  metadata: EPWMetadata;
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
}

export function SunPath({ 
  metadata, data, compareData, showDifference, stackedComparison, variables, onRemove, onChangeType, gradients, filter, unitSystem, heatmapTextColor, theme, 
  setShowGradientModal, exportMode
}: SunPathProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const compareSvgRef = useRef<SVGSVGElement>(null);
  const outerRef = useRef<HTMLDivElement>(null);
  const primaryChartSlotRef = useRef<HTMLDivElement>(null);
  const compareChartSlotRef = useRef<HTMLDivElement>(null);
  const [slotSize, setSlotSize] = useState({
    primary: { w: 400, h: 380 },
    compare: { w: 400, h: 380 },
  });

  const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const elP = primaryChartSlotRef.current;
    if (!elP) return;

    const readSizes = () => {
      const pr = elP.getBoundingClientRect();
      const pw = Math.max(120, Math.round(pr.width));
      const ph = Math.max(120, Math.round(pr.height));
      const elC = compareChartSlotRef.current;
      let cw = pw;
      let ch = ph;
      if (elC) {
        const cr = elC.getBoundingClientRect();
        cw = Math.max(120, Math.round(cr.width));
        ch = Math.max(120, Math.round(cr.height));
      }
      setSlotSize(prev => {
        if (
          prev.primary.w === pw &&
          prev.primary.h === ph &&
          prev.compare.w === cw &&
          prev.compare.h === ch
        ) {
          return prev;
        }
        return { primary: { w: pw, h: ph }, compare: { w: cw, h: ch } };
      });
    };

    const observer = new ResizeObserver(() => {
      if (resizeTimeoutRef.current) clearTimeout(resizeTimeoutRef.current);
      resizeTimeoutRef.current = setTimeout(readSizes, 50);
    });
    observer.observe(elP);
    const elC = compareChartSlotRef.current;
    if (elC) observer.observe(elC);
    readSizes();

    return () => {
      observer.disconnect();
      if (resizeTimeoutRef.current) clearTimeout(resizeTimeoutRef.current);
    };
  }, [stackedComparison, compareData]);
  const [aggregation, setAggregation] = useState<'hour' | 'day' | 'week' | 'month'>('week');
  const [colorVar, setColorVar] = useState(variables[0]?.id || '');
  const [radiusVar, setRadiusVar] = useState(variables.find(v => v.id === 'globalHorizontalRadiation')?.id || variables[0]?.id || '');
  const [gradientId, setGradientId] = useState(gradients[0].id);
  const [radiusMin, setRadiusMin] = useState<number | string>(2);
  const [radiusMax, setRadiusMax] = useState<number | string>(10);
  const [showSettings, setShowSettings] = useState(false);
  const [showStats, setShowStats] = useState(false);
  // chart type switching handled by ChartTypeMenu
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
    if (!svgRef.current) return;
    const { w: pw, h: ph } = slotSize.primary;
    if (pw === 0 || ph === 0) return;

    const renderChart = (
      svgEl: SVGSVGElement,
      currentData: any[],
      title: string | null,
      isCompare: boolean,
      width: number,
      height: number
    ) => {
    if (!currentData || !currentData.length) return;
    const rMaxPx = Math.min(
      28,
      Math.max(4, typeof radiusMax === 'number' ? radiusMax : parseFloat(String(radiusMax)) || 10)
    );
    const labelRim = 18;
    const titleReserve = title ? 22 : 0;
    const sideReserve = 12;
    const rawRadius = Math.min(
      width / 2 - sideReserve - labelRim - rMaxPx * 0.35,
      height / 2 - labelRim - rMaxPx * 0.35 - titleReserve / 2
    );
    const maxRadius = Math.min(width, height) / 2 - 6;
    const radius = Math.max(24, Math.min(rawRadius, maxRadius));

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
         const titleMargin = 12;
         g.append("text")
          .attr("x", -titleMargin + 4)
          .attr("y", -height/2 + 16)
          .style("font-size", "12px")
          .style("font-weight", "bold")
          .style("fill", heatmapTextColor)
          .text(title);
    }
  };

  if (stackedComparison && compareData && compareSvgRef.current) {
      const { w: cw, h: ch } = slotSize.compare;
      renderChart(svgRef.current, data, "Baseline Local Dataset", false, pw, ph);
      renderChart(compareSvgRef.current, compareData, "Comparative Dataset", true, cw, ch);
  } else {
      renderChart(svgRef.current, data, null, false, pw, ph);
  }
  }, [metadata, data, compareData, showDifference, stackedComparison, variables, colorVar, radiusVar, gradientId, radiusMin, radiusMax, aggregation, gradients, filter, slotSize.primary.w, slotSize.primary.h, slotSize.compare.w, slotSize.compare.h, unitSystem, theme, heatmapTextColor, tempFilterEnabled, tempFilterType, helpfulThreshold, harmfulThreshold, colorVarDef]);

  return (
    <div 
      ref={outerRef}
      className={`group w-full h-full min-h-0 flex flex-col relative transition-colors duration-300 ${
        exportMode ? 'bg-white' : (theme === 'dark' ? 'bg-gray-800' : 'bg-white')
      }`}
      
    >
      <div className={`flex flex-col ${exportMode ? '' : 'border-b'} ${
        exportMode ? 'bg-white' : (theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-100 bg-white')
      } p-2`}>
        <div className="flex flex-col min-w-0">
          {exportMode ? (
            <div className="flex items-start gap-2 min-w-0">
              <div className="shrink-0 pt-0.5">
                <ChartTypeMenu
                  value="sunpath"
                  label="Sun Path"
                  onChange={() => {}}
                  theme="light"
                  display="icon"
                  staticIcon
                />
              </div>
              <ExportHeaderCaption
                lines={[
                  {
                    short: `Color · ${colorVarDef.category}`,
                    long: `Color · ${colorVarDef.name}`,
                  },
                  {
                    short: `Radius · ${radiusVarDef.category}`,
                    long: `Radius · ${radiusVarDef.name}`,
                  },
                ]}
              />
            </div>
          ) : (
            <>
              <div className="relative flex items-center w-full min-h-[28px] gap-1.5">
                <div className="flex items-center min-w-0 gap-1.5 sm:gap-2 flex-1 transition-[padding] duration-200 ease-out pr-0 group-hover:pr-9 focus-within:pr-9">
                  <ChartTypeMenu
                    value="sunpath"
                    label="Sun Path"
                    onChange={(t) => onChangeType?.(t)}
                    theme={theme}
                    disabled={!onChangeType}
                    display="icon"
                  />
                  <span
                    className={`text-[10px] font-medium truncate min-w-0 flex-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}
                    title={colorVarDef.name}
                  >
                    {colorVarDef.name}
                  </span>
                </div>
                {onRemove && (
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 flex shrink-0 opacity-0 pointer-events-none transition-opacity duration-200 ease-out group-hover:opacity-100 group-hover:pointer-events-auto focus-within:opacity-100 focus-within:pointer-events-auto">
                    <button
                      type="button"
                      onClick={onRemove}
                      className={`rounded-md transition-colors shadow-hard-sm p-1 shrink-0 ${theme === 'dark' ? 'text-gray-400 hover:text-red-400 hover:bg-red-900/30' : 'text-gray-400 hover:text-red-500 hover:bg-red-50'}`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
              <div
                className="overflow-hidden transition-[max-height,opacity] duration-200 ease-out max-h-0 opacity-0 pointer-events-none group-hover:max-h-[52px] group-hover:opacity-100 group-hover:pointer-events-auto focus-within:max-h-[52px] focus-within:opacity-100 focus-within:pointer-events-auto"
              >
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
                        className={`rounded font-semibold transition-colors px-1.5 py-0.5 text-[9px] leading-none ${
                          showStats
                            ? (theme === 'dark' ? 'bg-gray-700/90 text-gray-200' : 'bg-gray-100 text-gray-800')
                            : (theme === 'dark' ? 'bg-gray-800 text-gray-400 hover:text-gray-200' : 'bg-gray-50 text-gray-500 hover:text-gray-800')
                        }`}
                        title="Statistics"
                      >
                        Stats
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowSettings(!showSettings)}
                        className={`rounded p-0.5 transition-colors ${
                          showSettings
                            ? (theme === 'dark' ? 'bg-gray-700/90 text-gray-200' : 'bg-gray-100 text-gray-800')
                            : (theme === 'dark' ? 'bg-gray-800 text-gray-400 hover:text-gray-200' : 'bg-gray-50 text-gray-500 hover:text-gray-800')
                        }`}
                        title="Chart settings"
                      >
                        <Settings2 className="w-3 h-3" />
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

      {/* Stats Modal */}
      {showStats && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2" onClick={() => setShowStats(false)}>
          <div className={`p-3 rounded-lg shadow-hard-xl max-w-xs sm:max-w-sm w-full max-h-[min(88vh,520px)] overflow-y-auto border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-2">
              <h3 className={`text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Statistics</h3>
              <button type="button" onClick={() => setShowStats(false)} className={`p-1 rounded-md ${theme === 'dark' ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
                <X className="w-4 h-4" />
              </button>
            </div>
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
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2" onClick={() => setShowSettings(false)}>
          <div className={`p-3 rounded-lg shadow-hard-xl max-w-sm w-full max-h-[min(88vh,520px)] overflow-y-auto border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-2">
              <h3 className={`text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Chart settings</h3>
              <button type="button" onClick={() => setShowSettings(false)} className={`p-1 rounded-md ${theme === 'dark' ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3">
              <div className="space-y-2">
                <label className={`block text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Color Variable</label>
                <select
                  value={colorVar}
                  onChange={(e) => setColorVar(e.target.value)}
                  className={`w-full text-sm rounded-lg focus:ring-gray-500 focus:border-gray-500 block p-2.5 transition-all outline-none border ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white hover:bg-gray-600' : 'bg-gray-50 border-gray-200 text-gray-900 hover:bg-white'}`}
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
                  className={`w-full text-sm rounded-lg focus:ring-gray-500 focus:border-gray-500 block p-2.5 transition-all outline-none border ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white hover:bg-gray-600' : 'bg-gray-50 border-gray-200 text-gray-900 hover:bg-white'}`}
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
                    className={`w-1/2 text-sm rounded-lg focus:ring-gray-500 focus:border-gray-500 block p-2.5 transition-all outline-none border ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white hover:bg-gray-600' : 'bg-gray-50 border-gray-200 text-gray-900 hover:bg-white'}`}
                    placeholder="Min"
                  />
                  <input
                    type="number"
                    value={radiusMax}
                    onChange={(e) => setRadiusMax(e.target.value)}
                    className={`w-1/2 text-sm rounded-lg focus:ring-gray-500 focus:border-gray-500 block p-2.5 transition-all outline-none border ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white hover:bg-gray-600' : 'bg-gray-50 border-gray-200 text-gray-900 hover:bg-white'}`}
                    placeholder="Max"
                  />
                </div>
              </div>
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
                <div className={`flex p-1.5 rounded-lg overflow-x-auto border ${theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                  {gradients.map(g => (
                    <button
                      key={g.id}
                      onClick={() => setGradientId(g.id)}
                      className={`flex-shrink-0 w-8 h-8 rounded-md mx-1 border-2 transition-all shadow-hard-sm ${
                        gradientId === g.id ? 'border-gray-700 scale-110 shadow-sm' : 'border-transparent hover:scale-105'
                      }`}
                      style={{ background: `linear-gradient(to right, ${g.colors.join(', ')})` }}
                      title={g.name}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-gray-700">
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
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-gray-700"></div>
                  </label>
                </div>
                
                {tempFilterEnabled && (
                  <div className="flex gap-2 items-center">
                    <select
                      value={tempFilterType}
                      onChange={e => setTempFilterType(e.target.value as any)}
                      className={`flex-1 text-sm rounded-lg focus:ring-gray-500 focus:border-gray-500 block p-2.5 transition-all outline-none border ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white hover:bg-gray-600' : 'bg-gray-50 border-gray-200 text-gray-900 hover:bg-white'}`}
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
                        className={`w-full text-sm rounded-lg focus:ring-gray-500 focus:border-gray-500 block p-2.5 transition-all outline-none border ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white hover:bg-gray-600' : 'bg-gray-50 border-gray-200 text-gray-900 hover:bg-white'}`}
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

      <div className="px-0 py-1 flex-1 min-h-0 flex flex-col gap-1 overflow-hidden min-w-0">
        <div
          ref={primaryChartSlotRef}
          className="w-full flex-1 min-h-0 min-w-0 flex items-center justify-center relative min-h-[140px]"
        >
          <svg ref={svgRef} className="w-full h-full max-h-full max-w-full block" preserveAspectRatio="xMidYMid meet" />
        </div>
        {stackedComparison && compareData && (
        <div
          ref={compareChartSlotRef}
          className="w-full flex-1 min-h-0 min-w-0 flex items-center justify-center relative min-h-[140px]"
        >
          <svg ref={compareSvgRef} className="w-full h-full max-h-full max-w-full block" preserveAspectRatio="xMidYMid meet" />
        </div>
        )}
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
