import { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';
import { EPWDataRow } from '../lib/epwParser';
// @ts-ignore
import tc from 'jsthermalcomfort';
import { X, Settings2 } from 'lucide-react';
import { InteractiveLegend, GradientDef } from './InteractiveLegend';
import { AggregationToolbar } from './AggregationToolbar';
import { ChartType } from '../App';
import { UnitSystem } from '../App';

import { GlobalFilterState } from './GlobalFilterPanel';
import { ChartTypeMenu } from './ChartTypeMenu';
import { ExportHeaderCaption } from './ExportHeaderCaption';

interface UtciExplorerProps {
  data: EPWDataRow[];
  compareData?: EPWDataRow[];
  showDifference?: boolean;
  stackedComparison?: boolean;
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

const UTCI_COLORS: Record<string, string> = {
  'extreme cold stress': '#000033',
  'very strong cold stress': '#000099',
  'strong cold stress': '#0000ff',
  'moderate cold stress': '#0066ff',
  'slight cold stress': '#00ccff',
  'no thermal stress': '#00ff00',
  'moderate heat stress': '#ffcc00',
  'strong heat stress': '#ff6600',
  'very strong heat stress': '#ff0000',
  'extreme heat stress': '#800000'
};

// Create a continuous color scale for UTCI categories
const UTCI_THRESHOLDS = [-40, -27, -13, 0, 9, 26, 32, 38, 46, 50];
const UTCI_COLOR_VALUES = Object.values(UTCI_COLORS);

const utciCategoryScale = d3.scaleLinear<string>()
  .domain(UTCI_THRESHOLDS)
  .range(UTCI_COLOR_VALUES)
  .interpolate(d3.interpolateRgb);

function getUtciCategoryForValue(val: number): string {
  if (val < -40) return 'extreme cold stress';
  if (val < -27) return 'very strong cold stress';
  if (val < -13) return 'strong cold stress';
  if (val < 0) return 'moderate cold stress';
  if (val < 9) return 'slight cold stress';
  if (val <= 26) return 'no thermal stress';
  if (val <= 32) return 'moderate heat stress';
  if (val <= 38) return 'strong heat stress';
  if (val <= 46) return 'very strong heat stress';
  return 'extreme heat stress';
}

/** Matches `InteractiveLegend` metrics so all chart footers share the same footprint */
const LEGEND_STRIP_SCALE = 0.72;

function UtciCategoryLegendStrip({ theme }: { theme: 'light' | 'dark' }) {
  const pad = 3 * LEGEND_STRIP_SCALE;
  const gap = 2 * LEGEND_STRIP_SCALE;
  const titlePx = 8 * LEGEND_STRIP_SCALE;
  const tickPx = 7 * LEGEND_STRIP_SCALE;
  const barH = 5 * LEGEND_STRIP_SCALE;
  const cats = Object.keys(UTCI_COLORS);
  const comfortIdx = cats.indexOf('no thermal stress');
  const comfortCenterPct = ((comfortIdx + 0.5) / cats.length) * 100;

  return (
    <div
      className={`flex flex-col w-full select-none ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}
      style={{ padding: `${pad}px`, gap: `${gap}px` }}
    >
      <div className="min-w-0">
        <span
          className="font-semibold uppercase tracking-wide truncate leading-tight block"
          style={{ fontSize: `${titlePx}px` }}
        >
          UTCI (categories)
        </span>
      </div>
      <div className="flex w-full rounded-sm overflow-hidden" style={{ height: `${barH}px` }}>
        {cats.map((cat) => (
          <div
            key={cat}
            className="flex-1 h-full border-r border-black/10 last:border-r-0 dark:border-white/15"
            style={{ backgroundColor: UTCI_COLORS[cat] }}
          />
        ))}
      </div>
      <div className="relative w-full" style={{ minHeight: `${Math.max(tickPx, 10)}px`, fontSize: `${tickPx}px` }}>
        <span
          className={`absolute left-0 top-0 max-w-[34%] truncate font-medium uppercase tracking-tight leading-none ${
            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
          }`}
        >
          Extreme cold
        </span>
        <span
          className="absolute top-0 -translate-x-1/2 font-semibold uppercase tracking-tight leading-none text-green-600 dark:text-green-400 whitespace-nowrap"
          style={{ left: `${comfortCenterPct}%` }}
        >
          Comfort
        </span>
        <span
          className={`absolute right-0 top-0 max-w-[34%] truncate text-right font-medium uppercase tracking-tight leading-none ${
            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
          }`}
        >
          Extreme heat
        </span>
      </div>
    </div>
  );
}

function UtciComfortTimeLegendStrip({ theme }: { theme: 'light' | 'dark' }) {
  const pad = 3 * LEGEND_STRIP_SCALE;
  const gap = 2 * LEGEND_STRIP_SCALE;
  const titlePx = 8 * LEGEND_STRIP_SCALE;
  const tickPx = 7 * LEGEND_STRIP_SCALE;
  const barH = 5 * LEGEND_STRIP_SCALE;

  return (
    <div
      className={`flex flex-col w-full select-none ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}
      style={{ padding: `${pad}px`, gap: `${gap}px` }}
    >
      <div className="min-w-0">
        <span
          className="font-semibold uppercase tracking-wide truncate leading-tight block"
          style={{ fontSize: `${titlePx}px` }}
        >
          Time in comfort zone
        </span>
      </div>
      <div
        className={`w-full rounded-sm overflow-hidden ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'}`}
        style={{
          height: `${barH}px`,
          background:
            theme === 'dark'
              ? 'linear-gradient(to right, #1f2937, #22c55e)'
              : 'linear-gradient(to right, #ffffff, #22c55e)',
        }}
      />
      <div
        className="flex justify-between font-medium tabular-nums leading-none"
        style={{ minHeight: `${Math.max(tickPx, 10)}px`, fontSize: `${tickPx}px` }}
      >
        <span className={theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}>0%</span>
        <span className={theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}>100%</span>
      </div>
    </div>
  );
}

interface UtciDataRow extends EPWDataRow {
  utci: number;
  utciCategory: string;
  isComfortable: number;
}

export function UtciExplorer({ 
  data, compareData, showDifference, stackedComparison, onRemove, onChangeType, gradients, filter, unitSystem, heatmapTextColor, theme, 
  setShowGradientModal, exportMode
}: UtciExplorerProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const compareSvgRef = useRef<SVGSVGElement>(null);
  const [aggregation, setAggregation] = useState<'hour' | 'day' | 'week' | 'month'>('month');
  const [includeSun, setIncludeSun] = useState(true);
  const [includeWind, setIncludeWind] = useState(true);
  const [colorMode, setColorMode] = useState<'categories' | 'comfortTime' | 'gradient'>('comfortTime');
  const [gradientId, setGradientId] = useState(gradients[0].id);
  const [showSettings, setShowSettings] = useState(false);
  const [showStats, setShowStats] = useState(false);
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

  // Pre-calculate UTCI for all data points to avoid recalculating on every render/aggregation change
  const utciData: UtciDataRow[] = useMemo(() => {
    return data.map(d => {
      const tdb = (d.dryBulbTemperature as number) || 0;
      const rh = (d.relativeHumidity as number) || 50;
      const windSpeed = (d.windSpeed as number) || 0;
      const ghr = (d.globalHorizontalRadiation as number) || 0;

      const v = includeWind ? Math.max(0.5, windSpeed) : 0.5;
      const tr = includeSun ? tdb + (0.02 * ghr) : tdb;

      // Calculate UTCI
      let utciVal = tdb;
      let category = getUtciCategoryForValue(tdb);
      try {
        const result = tc.models.utci(tdb, tr, v, rh, 'SI', true, false);
        utciVal = isNaN(result.utci) ? tdb : result.utci;
        category = result.stress_category || getUtciCategoryForValue(utciVal);
      } catch (e) {
        // Fallback
      }

      return {
        ...d,
        utci: utciVal as number,
        utciCategory: category as string,
        isComfortable: (category === 'no thermal stress' ? 1 : 0) as number
      };
    });
  }, [data, includeSun, includeWind]);

  const compareUtciData: UtciDataRow[] = useMemo(() => {
    return (compareData || []).map(d => {
      const tdb = (d.dryBulbTemperature as number) || 0;
      const rh = (d.relativeHumidity as number) || 50;
      const windSpeed = (d.windSpeed as number) || 0;
      const ghr = (d.globalHorizontalRadiation as number) || 0;

      const v = includeWind ? Math.max(0.5, windSpeed) : 0.5;
      const tr = includeSun ? tdb + (0.02 * ghr) : tdb;

      // Calculate UTCI
      let utciVal = tdb;
      let category = getUtciCategoryForValue(tdb);
      try {
        const result = tc.models.utci(tdb, tr, v, rh, 'SI', true, false);
        utciVal = isNaN(result.utci) ? tdb : result.utci;
        category = result.stress_category || getUtciCategoryForValue(utciVal);
      } catch (e) {
        // Fallback
      }

      return {
        ...d,
        utci: utciVal as number,
        utciCategory: category as string,
        isComfortable: (category === 'no thermal stress' ? 1 : 0) as number
      };
    });
  }, [compareData, includeSun, includeWind]);

  const convertUtci = (val: number) => {
    if (unitSystem === 'imperial') {
      if (showDifference) return val * 9/5; // Difference in C to difference in F
      return val * 9/5 + 32;
    }
    return val;
  };
  const utciUnit = unitSystem === 'imperial' ? '°F' : '°C';

  const { utciMin, utciMax } = useMemo(() => {
    if (showDifference && compareData) {
      // Calculate max absolute difference for UTCI
      let maxDiff = 10; // Default
      try {
        const diffs = data.map((d, i) => {
          const cD = compareData[i];
          if (!cD) return 0;
          
          const getUtci = (row: EPWDataRow) => {
            const tdb = (row.dryBulbTemperature as number) || 0;
            const rh = (row.relativeHumidity as number) || 50;
            const windSpeed = (row.windSpeed as number) || 0;
            const ghr = (row.globalHorizontalRadiation as number) || 0;
            const v = includeWind ? Math.max(0.5, windSpeed) : 0.5;
            const tr = includeSun ? tdb + (0.02 * ghr) : tdb;
            try {
              const result = tc.models.utci(tdb, tr, v, rh, 'SI', true, false);
              return isNaN(result.utci) ? tdb : result.utci;
            } catch (e) { return tdb; }
          };

          return getUtci(cD) - getUtci(d);
        });
        maxDiff = d3.max(diffs, d => Math.abs(d)) || 10;
      } catch (e) {}

      return {
        utciMin: -maxDiff,
        utciMax: maxDiff
      };
    }
    return {
      utciMin: -40, // Fixed logical min for UTCI
      utciMax: 50   // Fixed logical max for UTCI
    };
  }, [data, compareData, showDifference, includeSun, includeWind]);

  useEffect(() => {
    if (!svgRef.current || dimensions.width === 0) return;

    const renderUtci = (svgEl: any, currentData: any[], title: string | null, isCompare: boolean) => {
    if (!currentData || !currentData.length) return;
    const BASE_WIDTH = 350;
    const width = BASE_WIDTH;
    const height = 420;
    
    const margin = { top: 15, right: 20, bottom: 25, left: 40 };
    
    const barChartHeight = Math.max(75, height * 0.25);
    const heatmapHeight = height - margin.top - margin.bottom - barChartHeight - 20;
    
    const innerWidth = width - margin.left - margin.right;

    const svg = d3.select(svgEl);
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
        .domain([utciMin, 0, utciMax])
        .range(["#3b82f6", theme === 'dark' ? "#1f2937" : "#ffffff", "#ef4444"]);
    } else if (colorMode === 'categories') {
      colorScale = utciCategoryScale;
    } else if (colorMode === 'comfortTime') {
      const comfortLow = theme === 'dark' ? '#1f2937' : '#ffffff';
      const comfortHigh = '#22c55e';
      colorScale = d3.scaleSequential<string>()
        .domain([0, 1])
        .interpolator(d3.interpolateRgb(comfortLow, comfortHigh));
    } else {
      colorScale = d3.scaleSequential()
        .domain([utciMin, utciMax])
        .interpolator(d3.interpolateRgbBasis(gradientDef.colors));
    }

    // X Scale
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
      const groups = d3.group(currentData, d => d.month, d => d.hour);
      Array.from(groups).forEach(([month, hourGroups]) => {
        Array.from(hourGroups).forEach(([hour, values]) => {
          const startDay = values[0].dayOfYear;
          const endDay = values[values.length - 1].dayOfYear + 1;
          
          let avgUtciVal: number;
          let comfortRatio: number;
          if (showDifference && compareData) {
            const primaryAvg = d3.mean(values, d => d.utci) || 0;
            const compareValues = values.map(v => {
              const idx = data.indexOf(v);
              const cD = compareData[idx];
              if (!cD) return null;
              
              const getUtci = (row: EPWDataRow) => {
                const tdb = (row.dryBulbTemperature as number) || 0;
                const rh = (row.relativeHumidity as number) || 50;
                const windSpeed = (row.windSpeed as number) || 0;
                const ghr = (row.globalHorizontalRadiation as number) || 0;
                const v_wind = includeWind ? Math.max(0.5, windSpeed) : 0.5;
                const tr = includeSun ? tdb + (0.02 * ghr) : tdb;
                try {
                  const result = tc.models.utci(tdb, tr, v_wind, rh, 'SI', true, false);
                  return isNaN(result.utci) ? tdb : result.utci;
                } catch (e) { return tdb; }
              };
              return getUtci(cD);
            }).filter(v => v !== null) as number[];
            const compareAvg = d3.mean(compareValues) || 0;
            avgUtciVal = compareAvg - primaryAvg;
            comfortRatio = 0;
          } else {
            avgUtciVal = d3.mean(values, d => d.utci) || 0;
            comfortRatio = d3.mean(values, d => d.isComfortable) || 0;
          }
          
          heatmapData.push({
            x0: startDay,
            x1: endDay,
            y: hour,
            month: month,
            utci: avgUtciVal,
            utciCategory: getUtciCategoryForValue(avgUtciVal),
            isComfortable: comfortRatio,
            label: `${monthNames[month - 1]}`,
            tooltip: colorMode === 'comfortTime'
              ? `${monthNames[month - 1]} Avg\nComfort Time: ${(comfortRatio * 100).toFixed(1)}%\nUTCI: ${convertUtci(avgUtciVal).toFixed(1)}${utciUnit}`
              : `${monthNames[month - 1]} Avg\nUTCI: ${convertUtci(avgUtciVal).toFixed(1)}${utciUnit}\n${getUtciCategoryForValue(avgUtciVal)}`
          });
        });
      });
    } else if (aggregation === 'week') {
      const groups = d3.group(currentData, d => Math.floor((d.dayOfYear - 1) / 7), d => d.hour);
      Array.from(groups).forEach(([week, hourGroups]) => {
        Array.from(hourGroups).forEach(([hour, values]) => {
          const startDay = week * 7 + 1;
          const endDay = Math.min((week + 1) * 7 + 1, 366);
          const avgUtci = d3.mean(values, d => d.utci) || 0;
          const comfortRatio = d3.mean(values, d => d.isComfortable) || 0;
          const month = values[0].month;
          heatmapData.push({
            x0: startDay,
            x1: endDay,
            y: hour,
            month: month,
            utci: avgUtci,
            utciCategory: getUtciCategoryForValue(avgUtci),
            isComfortable: comfortRatio,
            label: `W${week + 1}`,
            tooltip: colorMode === 'comfortTime'
              ? `Week ${week + 1} Avg\nComfort Time: ${(comfortRatio * 100).toFixed(1)}%\nUTCI: ${convertUtci(avgUtci).toFixed(1)}${utciUnit}`
              : `Week ${week + 1} Avg\nUTCI: ${convertUtci(avgUtci).toFixed(1)}${utciUnit}\n${getUtciCategoryForValue(avgUtci)}`
          });
        });
      });
    } else {
      // day or hour
      heatmapData = currentData.map(d => ({
        x0: d.dayOfYear,
        x1: d.dayOfYear + 1,
        y: d.hour,
        month: d.month,
        utci: d.utci,
        utciCategory: d.utciCategory,
        isComfortable: d.isComfortable,
        label: d.date.toLocaleDateString(),
        tooltip: colorMode === 'comfortTime'
          ? `${d.date.toLocaleString()}\nComfortable: ${d.isComfortable ? 'Yes' : 'No'}\nUTCI: ${convertUtci(d.utci).toFixed(1)}${utciUnit}`
          : `${d.date.toLocaleString()}\nUTCI: ${convertUtci(d.utci).toFixed(1)}${utciUnit}\n${d.utciCategory}`
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
      .style("fill", d => {
        if (colorMode === 'categories') {
          return UTCI_COLORS[d.utciCategory] || '#cccccc';
        } else {
          return colorScale(colorMode === 'comfortTime' ? d.isComfortable : d.utci);
        }
      })
      .style("stroke", (aggregation === 'month' || aggregation === 'week') ? "rgba(0,0,0,0.1)" : "none")
      .style("stroke-width", "1px")
      .style("opacity", d => {
        const isMonthMatch = filter.startMonth <= filter.endMonth
          ? (d.month >= filter.startMonth && d.month <= filter.endMonth)
          : (d.month >= filter.startMonth || d.month <= filter.endMonth);
        const isHourMatch = d.y >= filter.startHour && d.y <= filter.endHour;
        return (isMonthMatch && isHourMatch) ? 1 : 0.2;
      })
      .append("title")
      .text(d => d.tooltip);

    // Overlay text for month and week aggregations if cells are large enough
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
        .style("opacity", d => {
          const isMonthMatch = filter.startMonth <= filter.endMonth
            ? (d.month >= filter.startMonth && d.month <= filter.endMonth)
            : (d.month >= filter.startMonth || d.month <= filter.endMonth);
          const isHourMatch = d.y >= filter.startHour && d.y <= filter.endHour;
          return (isMonthMatch && isHourMatch) ? 1 : 0.2;
        })
        // Only show text if the cell is wide enough
        .text(d => {
          if ((xScale(d.x1) - xScale(d.x0)) <= 20) return "";
          return colorMode === 'comfortTime' ? `${Math.round(d.isComfortable * 100)}%` : Math.round(d.utci);
        });
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
        .attr("stroke", "#1f2937") // Dark grey
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
      .call(g => g.select(".domain").style("stroke", theme === 'dark' ? '#6b7280' : '#4b5563').style("stroke-width", `2px`))
      .call(g => g.selectAll(".tick line").attr("x2", innerWidth).style("stroke", theme === 'dark' ? '#374151' : '#e5e7eb').style("stroke-width", `1.5px`).attr("stroke-opacity", 0.5))
      .call(g => g.selectAll(".tick text").style("fill", heatmapTextColor).style("font-weight", "bold").style("font-size", `8px`));

    // --- Bar Chart ---
    const barChartG = g.append("g");

    const isSelected = (d: any) => {
      const isMonthMatch = filter.startMonth <= filter.endMonth
        ? (d.month >= filter.startMonth && d.month <= filter.endMonth)
        : (d.month >= filter.startMonth || d.month <= filter.endMonth);
      const isHourMatch = d.hour >= filter.startHour && d.hour <= filter.endHour;
      return isMonthMatch && isHourMatch;
    };

    // Aggregate data
    let aggregatedData: { x0: number, x1: number, valueAll: number, valueSelected: number | null, comfortRatioAll: number, comfortRatioSelected: number | null, minSelected?: number, maxSelected?: number, month: number }[] = [];
    
    if (aggregation === 'hour') {
      aggregatedData = currentData.map(d => {
        const selected = isSelected(d);
        const val = convertUtci(d.utci);
        return {
          x0: d.dayOfYear + d.hour / 24,
          x1: d.dayOfYear + (d.hour + 1) / 24,
          valueAll: val,
          valueSelected: selected ? val : null,
          comfortRatioAll: d.isComfortable,
          comfortRatioSelected: selected ? d.isComfortable : null,
          minSelected: selected ? val : undefined,
          maxSelected: selected ? val : undefined,
          month: d.month
        };
      });
    } else if (aggregation === 'day') {
      const days = d3.group(currentData, d => d.dayOfYear);
      aggregatedData = Array.from(days, ([day, values]) => {
        const selectedValues = values.filter(isSelected);
        return {
          x0: day,
          x1: day + 1,
          valueAll: convertUtci(d3.mean(values, d => d.utci) || 0),
          valueSelected: selectedValues.length > 0 ? convertUtci(d3.mean(selectedValues, d => d.utci) || 0) : null,
          comfortRatioAll: d3.mean(values, d => d.isComfortable) || 0,
          comfortRatioSelected: selectedValues.length > 0 ? (d3.mean(selectedValues, d => d.isComfortable) || 0) : null,
          minSelected: selectedValues.length > 0 ? convertUtci(d3.min(selectedValues, d => d.utci) || 0) : undefined,
          maxSelected: selectedValues.length > 0 ? convertUtci(d3.max(selectedValues, d => d.utci) || 0) : undefined,
          month: values[0].month
        };
      });
    } else if (aggregation === 'week') {
      const weeks = d3.group(currentData, d => Math.floor((d.dayOfYear - 1) / 7));
      aggregatedData = Array.from(weeks, ([week, values]) => {
        const selectedValues = values.filter(isSelected);
        return {
          x0: week * 7 + 1,
          x1: Math.min((week + 1) * 7 + 1, 366),
          valueAll: convertUtci(d3.mean(values, d => d.utci) || 0),
          valueSelected: selectedValues.length > 0 ? convertUtci(d3.mean(selectedValues, d => d.utci) || 0) : null,
          comfortRatioAll: d3.mean(values, d => d.isComfortable) || 0,
          comfortRatioSelected: selectedValues.length > 0 ? (d3.mean(selectedValues, d => d.isComfortable) || 0) : null,
          minSelected: selectedValues.length > 0 ? convertUtci(d3.min(selectedValues, d => d.utci) || 0) : undefined,
          maxSelected: selectedValues.length > 0 ? convertUtci(d3.max(selectedValues, d => d.utci) || 0) : undefined,
          month: values[0].month
        };
      });
    } else { // month
      const months = d3.group(currentData, d => d.month);
      aggregatedData = Array.from(months, ([month, values]) => {
        const startDay = values[0].dayOfYear;
        const endDay = values[values.length - 1].dayOfYear + 1;
        const selectedValues = values.filter(isSelected);
        return {
          x0: startDay,
          x1: endDay,
          valueAll: convertUtci(d3.mean(values, d => d.utci) || 0),
          valueSelected: selectedValues.length > 0 ? convertUtci(d3.mean(selectedValues, d => d.utci) || 0) : null,
          comfortRatioAll: d3.mean(values, d => d.isComfortable) || 0,
          comfortRatioSelected: selectedValues.length > 0 ? (d3.mean(selectedValues, d => d.isComfortable) || 0) : null,
          minSelected: selectedValues.length > 0 ? convertUtci(d3.min(selectedValues, d => d.utci) || 0) : null,
          maxSelected: selectedValues.length > 0 ? convertUtci(d3.max(selectedValues, d => d.utci) || 0) : null,
          month: month
        };
      });
    }

    // Y Scale for Bar Chart
    const yMin = colorMode === 'comfortTime' ? 0 : (d3.min(aggregatedData, d => Math.min(d.valueAll, d.minSelected ?? d.valueAll)) || 0);
    const yMax = colorMode === 'comfortTime' ? 1 : (d3.max(aggregatedData, d => Math.max(d.valueAll, d.maxSelected ?? d.valueAll)) || convertUtci(40));

    const yScaleBar = d3.scaleLinear()
      .domain([yMin, yMax])
      .range([barChartHeight, 0])
      .nice();

    const getFillColor = (val: number, comfortRatio: number) => {
      const metricValue = unitSystem === 'imperial' ? (val - 32) * 5/9 : val;
      if (colorMode === 'categories') {
        return utciCategoryScale(metricValue);
      } else {
        return colorScale(colorMode === 'comfortTime' ? comfortRatio : metricValue);
      }
    };

    // Draw foreground elements (Selected Data)
    const fgGroups = barChartG.selectAll(".fg-group")
      .data(aggregatedData.filter(d => d.valueSelected !== null))
      .join("g")
      .attr("class", "fg-group");

    fgGroups.each(function(d) {
      const group = d3.select(this);
      const barW = Math.max(1, xScale(d.x1) - xScale(d.x0) - (aggregation === 'hour' ? 0 : 4));
      const xPos = xScale(d.x0);

      if (colorMode === 'comfortTime') {
        group.append("rect")
          .attr("x", xPos)
          .attr("y", yScaleBar(d.comfortRatioSelected!))
          .attr("width", barW)
          .attr("height", Math.abs(yScaleBar(d.comfortRatioSelected!) - yScaleBar(0)))
          .style("fill", getFillColor(d.valueSelected!, d.comfortRatioSelected!))
          .attr("rx", aggregation === 'hour' ? 0 : 8)
          .attr("ry", aggregation === 'hour' ? 0 : 8);
      } else {
        // Bar from min to max
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
          .style("fill", getFillColor(val, d.comfortRatioSelected!))
          .style("opacity", 0.6)
          .attr("rx", aggregation === 'hour' ? 0 : 4)
          .attr("ry", aggregation === 'hour' ? 0 : 4);

        // Average Indicator Circle
        group.append("circle")
          .attr("cx", xPos + barW / 2)
          .attr("cy", yScaleBar(val))
          .attr("r", Math.min(barW / 2, 4))
          .style("fill", getFillColor(val, d.comfortRatioSelected!))
          .style("stroke", "#000000")
          .style("stroke-width", "1px");
      }
    });

    fgGroups.append("title")
      .text(d => {
        const metricValue = unitSystem === 'imperial' ? (d.valueSelected! - 32) * 5/9 : d.valueSelected!;
        if (colorMode === 'comfortTime') {
          return `Selected Hours Comfort Time: ${(d.comfortRatioSelected! * 100).toFixed(1)}%`;
        } else {
          return `Selected Hours Avg UTCI: ${d.valueSelected!.toFixed(1)}${utciUnit}\n${getUtciCategoryForValue(metricValue)}`;
        }
      });

    // Y Axis for Bar Chart
    const yAxisBar = d3.axisLeft(yScaleBar).ticks(5)
      .tickFormat(d => colorMode === 'comfortTime' ? `${(d as number * 100)}%` : `${d}${utciUnit}`);
      
    barChartG.append("g")
      .call(yAxisBar)
      .call(g => g.select(".domain").style("stroke", theme === 'dark' ? '#6b7280' : '#4b5563').style("stroke-width", '2px'))
      .call(g => g.selectAll(".tick line").attr("x2", innerWidth).style("stroke", theme === 'dark' ? '#374151' : '#e5e7eb').style("stroke-width", '1.5px').attr("stroke-opacity", 0.5))
      .call(g => g.selectAll(".tick text").style("fill", heatmapTextColor).style("font-weight", "bold").style("font-size", `10px`));

    // Zero line for UTCI values
    if (colorMode !== 'comfortTime') {
      barChartG.append("line")
        .attr("x1", 0)
        .attr("x2", innerWidth)
        .attr("y1", yScaleBar(0))
        .attr("y2", yScaleBar(0))
        .attr("stroke", theme === 'dark' ? '#6b7280' : '#4b5563')
        .attr("stroke-width", '2px')
        .attr("stroke-opacity", 0.5);
    }

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


    
    if (title) {
         g.append("text")
          .attr("x", -margin.left + 4)
          .attr("y", -margin.top + 16)
          .style("font-size", "12px")
          .style("font-weight", "bold")
          .style("fill", heatmapTextColor)
          .text(title);
    }
  };

  if (stackedComparison && compareData && compareSvgRef.current) {
      renderUtci(svgRef.current, utciData, "Baseline Local Dataset", false);
      renderUtci(compareSvgRef.current, compareUtciData, "Comparative Dataset", true);
  } else {
      renderUtci(svgRef.current, utciData, null, false);
  }
  }, [utciData, compareUtciData, compareData, showDifference, aggregation, colorMode, gradientId, gradients, filter, dimensions.width, unitSystem, heatmapTextColor, theme, utciMin, utciMax]);

  // Calculate local stats for filtered data
  const stats = (() => {
    const filteredData = utciData.filter(d => {
      const isMonthMatch = filter.startMonth <= filter.endMonth
        ? (d.month >= filter.startMonth && d.month <= filter.endMonth)
        : (d.month >= filter.startMonth || d.month <= filter.endMonth);
      return isMonthMatch && 
             d.hour >= filter.startHour && 
             d.hour <= filter.endHour;
    });

    if (showDifference && compareData) {
      const diffs = filteredData.map(d => {
        const idx = data.indexOf(d);
        const cD = compareData[idx];
        if (!cD) return null;
        
        const getUtci = (row: EPWDataRow) => {
          const tdb = (row.dryBulbTemperature as number) || 0;
          const rh = (row.relativeHumidity as number) || 50;
          const windSpeed = (row.windSpeed as number) || 0;
          const ghr = (row.globalHorizontalRadiation as number) || 0;
          const v_wind = includeWind ? Math.max(0.5, windSpeed) : 0.5;
          const tr = includeSun ? tdb + (0.02 * ghr) : tdb;
          try {
            const result = tc.models.utci(tdb, tr, v_wind, rh, 'SI', true, false);
            return isNaN(result.utci) ? tdb : result.utci;
          } catch (e) { return tdb; }
        };

        return getUtci(cD) - getUtci(d);
      }).filter(v => v !== null) as number[];

      return {
        avg: convertUtci(d3.mean(diffs) || 0),
        min: convertUtci(d3.min(diffs) || 0),
        max: convertUtci(d3.max(diffs) || 0),
        count: diffs.length,
        comfortRatio: 0, // Not applicable for diff
        categoryPercentages: [] // Not applicable for diff
      };
    }

    const categoryCounts = d3.rollup(filteredData, v => v.length, d => d.utciCategory);
    const categoryPercentages = Array.from(categoryCounts).map(([category, count]) => ({
      category,
      percentage: (count / filteredData.length) * 100,
      color: UTCI_COLORS[category] || '#cccccc'
    })).sort((a, b) => {
      // Sort by stress level (cold to hot)
      const order = Object.keys(UTCI_COLORS);
      return order.indexOf(a.category) - order.indexOf(b.category);
    });

    return {
      avg: convertUtci(d3.mean(filteredData, d => d.utci) || 0),
      min: convertUtci(d3.min(filteredData, d => d.utci) || 0),
      max: convertUtci(d3.max(filteredData, d => d.utci) || 0),
      total: convertUtci(d3.sum(filteredData, d => d.utci) || 0),
      count: filteredData.length,
      comfortRatio: d3.mean(filteredData, d => d.isComfortable) || 0,
      categoryPercentages
    };
  })();

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
            <div className="flex items-center gap-2 min-w-0 min-h-[28px]">
              <ChartTypeMenu
                value="utci"
                label="UTCI Comfort"
                onChange={() => {}}
                theme="light"
                display="icon"
                staticIcon
              />
              <ExportHeaderCaption lines={[{ short: 'Outdoor Comfort', long: 'Outdoor Comfort' }]} />
            </div>
          ) : (
            <>
              <div className="relative flex items-center w-full min-h-[28px] gap-1.5">
                <div className="flex items-center min-w-0 gap-1.5 sm:gap-2 flex-1 transition-[padding] duration-200 ease-out pr-0 group-hover:pr-9 focus-within:pr-9">
                  <ChartTypeMenu
                    value="utci"
                    label="UTCI Comfort"
                    onChange={(t) => onChangeType?.(t)}
                    theme={theme}
                    disabled={!onChangeType}
                    display="icon"
                  />
                  <span
                    className={`text-[10px] font-medium truncate min-w-0 flex-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}
                    title="Outdoor Comfort"
                  >
                    Outdoor Comfort
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
              <div className="overflow-hidden transition-[max-height,opacity] duration-200 ease-out max-h-0 opacity-0 pointer-events-none group-hover:max-h-[52px] group-hover:opacity-100 group-hover:pointer-events-auto focus-within:max-h-[52px] focus-within:opacity-100 focus-within:pointer-events-auto">
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
                              ? (theme === 'dark' ? 'bg-blue-900/40 text-blue-400' : 'bg-blue-50 text-blue-600')
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
                              ? (theme === 'dark' ? 'bg-blue-900/40 text-blue-400' : 'bg-blue-50 text-blue-600')
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
          <div className={`p-3 rounded-lg shadow-hard-xl max-w-sm w-full max-h-[min(88vh,520px)] overflow-y-auto border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-2">
              <h3 className={`text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Comfort statistics</h3>
              <button type="button" onClick={() => setShowStats(false)} className={`p-1 rounded-md ${theme === 'dark' ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className={`p-2 rounded-md ${theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                <div className={`text-[10px] font-semibold uppercase tracking-wider mb-0.5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Average UTCI</div>
                <div className={`text-base font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{stats.avg.toFixed(1)} {utciUnit}</div>
              </div>
              <div className={`p-2 rounded-md ${theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                <div className={`text-[10px] font-semibold uppercase tracking-wider mb-0.5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Comfort ratio</div>
                <div className={`text-base font-medium ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`}>{(stats.comfortRatio * 100).toFixed(1)}%</div>
              </div>
              <div className={`p-2 rounded-md ${theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                <div className={`text-[10px] font-semibold uppercase tracking-wider mb-0.5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Min / Max</div>
                <div className={`text-xs font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{stats.min.toFixed(1)} / {stats.max.toFixed(1)} {utciUnit}</div>
              </div>
              <div className={`p-2 rounded-md ${theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                <div className={`text-[10px] font-semibold uppercase tracking-wider mb-0.5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Samples</div>
                <div className={`text-base font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{stats.count}</div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className={`text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Stress category breakdown</h4>
              <div className="space-y-1.5">
                {stats.categoryPercentages.map(cat => (
                  <div key={cat.category} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className={`capitalize ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{cat.category}</span>
                      <span className={`font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>{cat.percentage.toFixed(1)}%</span>
                    </div>
                    <div className={`h-1.5 w-full rounded-full ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'}`}>
                      <div 
                        className="h-full rounded-full" 
                        style={{ backgroundColor: UTCI_COLORS[cat.category], width: `${cat.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
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
              <h3 className={`text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>UTCI chart settings</h3>
              <button type="button" onClick={() => setShowSettings(false)} className={`p-1 rounded-md ${theme === 'dark' ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 gap-3">
              <div className="space-y-2">
                <div className="space-y-2">
                  <label className={`block text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Calculation Inputs</label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={includeSun} 
                        onChange={e => setIncludeSun(e.target.checked)}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>Include Solar Radiation</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={includeWind} 
                        onChange={e => setIncludeWind(e.target.checked)}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>Include Wind Speed</span>
                    </label>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className={`block text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Visualization Mode</label>
                  <select 
                    value={colorMode} 
                    onChange={e => setColorMode(e.target.value as any)}
                    className={`w-full p-2 rounded-md border text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-colors ${
                      theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  >
                    <option value="comfortTime">Time in comfort zone</option>
                    <option value="categories">Stress categories</option>
                    <option value="gradient">Temperature gradient</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                {colorMode === 'gradient' && (
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
                          className={`flex-shrink-0 w-8 h-8 rounded-md mx-1 border-2 transition-all ${
                            gradientId === g.id ? 'border-blue-500 scale-110 shadow-sm' : 'border-transparent hover:scale-105'
                          }`}
                          style={{ background: `linear-gradient(to right, ${g.colors.join(', ')})` }}
                          title={g.name}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="px-0 py-1 flex-1 min-h-0 flex flex-col gap-1 overflow-hidden min-w-0">
        <div className="w-full flex-1 min-h-0 min-w-0 relative">
          <svg ref={svgRef} className="w-full h-full max-w-full" preserveAspectRatio="xMidYMid meet" />
        </div>
        
        {/* Custom Legend for UTCI */}
        <div className="mt-0 flex-shrink-0 px-0.5 pt-0 w-full min-w-0">
          {showDifference && compareData ? (
            <InteractiveLegend 
              variable={{ id: 'utci', name: 'UTCI', unit: utciUnit, min: convertUtci(utciMin), max: convertUtci(utciMax), category: 'Comfort' }} 
              gradientId={gradientId} 
              setGradientId={setGradientId} 
              gradients={gradients}
              theme={theme}
              isDifference={true}
            />
          ) : colorMode === 'categories' ? (
            <UtciCategoryLegendStrip theme={theme} />
          ) : colorMode === 'gradient' ? (
            <InteractiveLegend 
              variable={{ id: 'utci', name: 'UTCI', unit: utciUnit, min: convertUtci(utciMin), max: convertUtci(utciMax), category: 'Comfort' }} 
              gradientId={gradientId} 
              setGradientId={setGradientId} 
              gradients={gradients}
              theme={theme}
            />
          ) : (
            <UtciComfortTimeLegendStrip theme={theme} />
          )}
        </div>
      </div>
    </div>
  );
}
