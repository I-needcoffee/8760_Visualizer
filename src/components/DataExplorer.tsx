import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { useTutorialLiveOptional } from '../context/TutorialLiveContext';
import * as d3 from 'd3';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';
import { EPWDataRow, EPWMetadata, EPWVariable } from '../lib/epwParser';
import { sequentialHeatmapColorFn } from '../lib/heatmapColorAdjust';
import { differenceDivergingColor, DIFFERENCE_DIVERGING_ID } from '../lib/differenceDivergingColor';
import { dataExplorerDiffValuesForAggregation } from '../lib/dataExplorerDiffAggregation';
import { symmetricDiffBound } from '../lib/symmetricDiffDomain';
import { isSolarNightEpwStation, solarNightOverlayRgba } from '../lib/solarNightHeatmap';
import { InteractiveLegend, GradientDef } from './InteractiveLegend';
import { gradientsForVariable } from '../lib/availableGradientsForVariable';
import { AggregationToolbar } from './AggregationToolbar';
import type { ChartType, CompareExplorerSharedControls } from '../App';
import { X, Settings2 } from 'lucide-react';

import { GlobalFilterState } from './GlobalFilterPanel';

import { UnitSystem } from '../App';
import { ChartTypeMenu } from './ChartTypeMenu';
import { ExportHeaderCaption, exportCaptionLinesWithUnit } from './ExportHeaderCaption';
import { VariableChartSelect } from './VariableChartSelect';
import { CardModal } from './CardModal';
import { defaultGradientIdForVariable } from '../lib/defaultGradientForVariable';
import {
  EXPLORER_SVG_BASE_WIDTH,
  EXPLORER_SVG_MARGIN,
  EXPLORER_MONTH_AXIS_BAND_PX,
  EXPLORER_MONTH_LABELS_SHORT,
  explorerBarGridStroke,
  explorerHeatmapRowLayout,
  explorerInnerWidth,
  explorerBarChartHeightPx,
  explorerHeatmapCellXPx,
  explorerHeatmapHeightPx,
  explorerHeatmapSpanXPx,
  explorerHeatmapXOfDay,
  explorerMonthLabelCenterDays,
  explorerSvgHeightPx,
} from '../lib/explorerChartSvgLayout';

const EMPTY_VARIABLES_FALLBACK: EPWVariable = {
  id: 'dryBulbTemperature',
  name: 'Dry bulb temperature',
  unit: '°C',
  min: 0,
  max: 35,
  category: 'Temperature',
  fixedMin: 5,
  fixedMax: 35,
};

/** Dual-series line chart in difference mode: baseline vs comparison (not Δ heatmap colors). */
function compareExplorerLineColors(theme: 'light' | 'dark') {
  return theme === 'dark'
    ? { baseline: '#d1d5db', comparison: '#ffffff' }
    : { baseline: '#e5e7eb', comparison: '#000000' };
}

interface DataExplorerProps {
  data: EPWDataRow[];
  compareData?: EPWDataRow[];
  showDifference?: boolean;
  stackedComparison?: boolean;
  variables: EPWVariable[];
  /** Initial EPW column id when this chart instance mounts (from dashboard slot). */
  defaultVariableId?: string;
  onRemove?: () => void;
  onChangeType?: (type: ChartType) => void;
  gradients: GradientDef[];
  filter: GlobalFilterState;
  unitSystem: UnitSystem;
  heatmapTextColor: string;
  theme: 'light' | 'dark';
  setShowGradientModal: (show: boolean) => void;
  exportMode?: boolean;
  /** Site location for solar diurnal shading on Solar-category 12×24 heatmaps. */
  metadata?: EPWMetadata;
  comparePane?: 'primary' | 'secondary';
  paneCity?: string;
  pairSuppressHeader?: boolean;
  pairModalHost?: boolean;
  explorerShared?: CompareExplorerSharedControls;
  /** Difference column: reduce outer padding so the card fills height cleanly */
  diffFillColumn?: boolean;
  /** Highlight + anchor the legend row for the guided layout. */
  tutorialLegendDomId?: string;
  /** Show chart-header anchors and keep the aggregation strip visible for guided callouts. */
  tutorialChromeAnchors?: boolean;
  /** Compare pair row: parent renders a single shared legend below both panes. */
  pairSuppressFooterLegend?: boolean;
}

export function DataExplorer({ 
  data, compareData, showDifference, stackedComparison, variables, defaultVariableId, onRemove, onChangeType, gradients, filter, unitSystem, heatmapTextColor, theme, 
  setShowGradientModal,
  exportMode,
  metadata,
  comparePane,
  paneCity,
  pairSuppressHeader,
  pairModalHost,
  explorerShared,
  diffFillColumn,
  tutorialLegendDomId,
  tutorialChromeAnchors,
  pairSuppressFooterLegend,
}: DataExplorerProps) {
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
  const [internalAggregation, setInternalAggregation] = useState<'hour' | 'day' | 'week' | 'month'>('month');
  const aggregation = explorerShared?.aggregation ?? internalAggregation;
  const setAggregation = explorerShared?.setAggregation ?? setInternalAggregation;

  const [internalShowStats, setInternalShowStats] = useState(false);
  const showStats = explorerShared?.showStats ?? internalShowStats;
  const setShowStats = explorerShared?.setShowStats ?? setInternalShowStats;

  const [internalColorVar, setInternalColorVar] = useState(() => {
    if (defaultVariableId && variables.some((v) => v.id === defaultVariableId)) return defaultVariableId;
    return variables.find((v) => v.category === 'Temperature')?.id || variables[0]?.id || 'dryBulbTemperature';
  });
  const colorVar = explorerShared?.colorVar ?? internalColorVar;
  const setColorVar = explorerShared?.setColorVar ?? setInternalColorVar;

  const [internalGradientId, setInternalGradientId] = useState(gradients[0].id);
  const gradientId = explorerShared?.gradientId ?? internalGradientId;
  const setGradientId = explorerShared?.setGradientId ?? setInternalGradientId;

  useEffect(() => {
    if (showDifference && compareData) {
      if (gradients.some(g => g.id === DIFFERENCE_DIVERGING_ID)) {
        setGradientId(DIFFERENCE_DIVERGING_ID);
        return;
      }
    }
    const id = defaultGradientIdForVariable(colorVar, variables, gradients);
    setGradientId(id);
  }, [colorVar, variables, gradients, setGradientId, showDifference, compareData]);

  const [internalShowSettings, setInternalShowSettings] = useState(false);
  const showSettings = explorerShared?.showSettings ?? internalShowSettings;
  const setShowSettings = explorerShared?.setShowSettings ?? setInternalShowSettings;

  const showStatsModal = showStats && (!pairSuppressHeader || pairModalHost);
  const showSettingsModal = showSettings && (!pairSuppressHeader || pairModalHost);

  const paletteGradients = useMemo(
    () => gradientsForVariable(colorVar, variables, gradients),
    [colorVar, variables, gradients]
  );

  const expandChromeStrip = !!(tutorialChromeAnchors && !exportMode);
  const chartToolbarRevealClass = expandChromeStrip
    ? 'pointer-events-auto max-h-[52px] overflow-visible opacity-100 pt-1 transition-[max-height,opacity] duration-200 ease-out'
    : 'pointer-events-none max-h-0 overflow-hidden opacity-0 transition-[max-height,opacity] duration-200 ease-out group-hover:pointer-events-auto group-hover:max-h-[48px] group-hover:opacity-100 focus-within:pointer-events-auto focus-within:max-h-[48px] focus-within:opacity-100';

  const tutorialLive = useTutorialLiveOptional();
  const tutorialReport = tutorialLive?.report;
  const tutorialEnabled = tutorialLive?.enabled;
  useEffect(() => {
    if (!tutorialEnabled || !tutorialReport) return;
    const v = variables.find(x => x.id === colorVar);
    tutorialReport({
      aggregation,
      colorVarId: colorVar,
      colorVarName: v?.name,
    });
  }, [tutorialEnabled, tutorialReport, aggregation, colorVar, variables]);

  const convertValue = useCallback((val: number | null | undefined, unit: string, isDelta: boolean = false) => {
    if (val === null || val === undefined) return 0;
    if (unitSystem === 'imperial') {
      if (unit === '°C') return isDelta ? val * 9/5 : val * 9/5 + 32;
      if (unit === 'm/s') return val * 2.23694;
      if (unit === 'mm') return val / 25.4;
    }
    return val;
  }, [unitSystem]);

  const convertUnit = (unit: string) => {
    if (unitSystem === 'imperial') {
      if (unit === '°C') return '°F';
      if (unit === 'm/s') return 'mph';
      if (unit === 'mm') return 'in';
    }
    return unit;
  };

  // Group variables by category
  const groupedVariables = variables.reduce((acc, v) => {
    const cat = v.category || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(v);
    return acc;
  }, {} as Record<string, EPWVariable[]>);

  const { colorVarDef, cMin, cMax, cUnit } = useMemo(() => {
    const def = variables.find(v => v.id === colorVar) ?? variables[0] ?? EMPTY_VARIABLES_FALLBACK;
    let min = def.fixedMin !== undefined ? convertValue(def.fixedMin, def.unit) : convertValue(def.min, def.unit);
    let max = def.fixedMax !== undefined ? convertValue(def.fixedMax, def.unit) : convertValue(def.max, def.unit);
    const unit = convertUnit(def.unit);

    if (showDifference && compareData) {
      const diffs = dataExplorerDiffValuesForAggregation(
        aggregation,
        data,
        compareData,
        colorVar,
        def.unit,
        convertValue
      );
      const bound = symmetricDiffBound(diffs);
      const half = bound > 0 ? bound : 1;
      min = -half;
      max = half;
    }
    return { colorVarDef: def, cMin: min, cMax: max, cUnit: unit };
  }, [variables, colorVar, showDifference, compareData, data, unitSystem, aggregation, convertValue]);

  const colorVarLabel = `${colorVarDef.name} (${cUnit})`;

  useEffect(() => {
    if (!svgRef.current || dimensions.width === 0) return;

    const width = EXPLORER_SVG_BASE_WIDTH;
    const margin = EXPLORER_SVG_MARGIN;
    const innerWidth = explorerInnerWidth();
    const barChartHeight = explorerBarChartHeightPx();
    const monthAxisBand = EXPLORER_MONTH_AXIS_BAND_PX;
    const heatmapBodyHeight = explorerHeatmapHeightPx();
    const height = explorerSvgHeightPx();

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const g = svg
      .attr("viewBox", `0 0 ${width} ${height}`)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // --- Data Processing ---
    const gradientDef = gradients.find(g => g.id === gradientId) || gradients[0];

    let colorScale: (v: number) => string;

    if (showDifference && compareData) {
      colorScale = v => differenceDivergingColor(v, cMin, cMax);
    } else {
      colorScale = sequentialHeatmapColorFn(gradientDef.colors, colorVarDef, cMin, cMax);
    }

    const solarNightOverlayEnabled =
      !!metadata &&
      Number.isFinite(metadata.lat) &&
      Number.isFinite(metadata.lng) &&
      Number.isFinite(metadata.timeZone) &&
      colorVarDef.category === 'Solar' &&
      !(showDifference && compareData);

    // X Scale for both charts (Day of Year 1-365)
    const xScale = d3.scaleLinear()
      .domain([1, 366])
      .range([0, innerWidth]);

    const barChartG = g.append("g");

    // --- Heatmap ---
    const heatmapG = g.append("g").attr("transform", `translate(0, ${barChartHeight})`);

    // Aggregate data for heatmap
    let heatmapData: any[] = [];
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    if (aggregation === 'month') {
      const groups = d3.group(data, d => d.month, d => d.hour);
      Array.from(groups).forEach(([month, hourGroups]) => {
        Array.from(hourGroups).forEach(([hour, values]) => {
          const startDay = values[0].dayOfYear;
          const endDay = values[values.length - 1].dayOfYear + 1;
          
          let val: number;
          if (showDifference && compareData) {
            const primaryAvg = d3.mean(values, d => d[colorVar] as number) || 0;
            // Find corresponding values in compareData
            const compareValues = values.map(v => {
              const idx = data.indexOf(v);
              return compareData[idx]?.[colorVar] as number;
            }).filter(v => v !== null);
            const compareAvg = d3.mean(compareValues) || 0;
            val = convertValue(compareAvg - primaryAvg, colorVarDef.unit, true);
          } else {
            val = convertValue(d3.mean(values, d => d[colorVar] as number) || 0, colorVarDef.unit);
          }

          heatmapData.push({
            x0: startDay,
            x1: endDay,
            y: hour,
            month: month,
            value: val,
            label: `${monthNames[month - 1]}`,
            tooltip: `${monthNames[month - 1]} ${showDifference ? 'Diff' : 'Avg'}\n${colorVarDef.name}: ${val.toFixed(1)} ${cUnit}`,
            sunYear: values[0].year,
            sunMonth: month,
            sunDay: 15,
            sunHour: hour,
          });
        });
      });
    } else if (aggregation === 'week') {
      const groups = d3.group(data, d => Math.floor((d.dayOfYear - 1) / 7), d => d.hour);
      Array.from(groups).forEach(([week, hourGroups]) => {
        Array.from(hourGroups).forEach(([hour, values]) => {
          const startDay = week * 7 + 1;
          const endDay = Math.min((week + 1) * 7 + 1, 366);
          // Approximate month for week
          const month = values[0].month;

          let val: number;
          if (showDifference && compareData) {
            const primaryAvg = d3.mean(values, d => d[colorVar] as number) || 0;
            const compareValues = values.map(v => {
              const idx = data.indexOf(v);
              return compareData[idx]?.[colorVar] as number;
            }).filter(v => v !== null);
            const compareAvg = d3.mean(compareValues) || 0;
            val = convertValue(compareAvg - primaryAvg, colorVarDef.unit, true);
          } else {
            val = convertValue(d3.mean(values, d => d[colorVar] as number) || 0, colorVarDef.unit);
          }

          const mid = values[Math.floor(values.length / 2)];
          heatmapData.push({
            x0: startDay,
            x1: endDay,
            y: hour,
            month: month,
            value: val,
            label: `W${week + 1}`,
            tooltip: `Week ${week + 1} ${showDifference ? 'Diff' : 'Avg'}\n${colorVarDef.name}: ${val.toFixed(1)} ${cUnit}`,
            sunYear: mid.year,
            sunMonth: mid.month,
            sunDay: mid.day,
            sunHour: hour,
          });
        });
      });
    } else {
      // day or hour
      heatmapData = data.map((d, i) => {
        let val: number;
        if (showDifference && compareData) {
          val = convertValue((compareData[i]?.[colorVar] as number || 0) - (d[colorVar] as number || 0), colorVarDef.unit, true);
        } else {
          val = convertValue(d[colorVar] as number, colorVarDef.unit);
        }
        return {
          x0: d.dayOfYear,
          x1: d.dayOfYear + 1,
          y: d.hour,
          month: d.month,
          value: val,
          label: d.date.toLocaleDateString(),
          tooltip: `${d.date.toLocaleString()}\n${colorVarDef.name} ${showDifference ? 'Diff' : ''}: ${val.toFixed(1)} ${cUnit}`,
          sunYear: d.year,
          sunMonth: d.month,
          sunDay: d.day,
          sunHour: d.hour,
        };
      });
    }

    const { cellGapPx, cellInnerHeightPx, rowInnerHeight, hourRowTop, hourRowCenter } =
      explorerHeatmapRowLayout(heatmapBodyHeight);
    const minDayCellWidth = innerWidth / 366;
    const overlayMinWidth = Math.max(12, minDayCellWidth * 1.1, cellInnerHeightPx * 0.75);
    const heatmapHourAxisPx = Math.max(5, Math.min(9, cellInnerHeightPx * 0.33));
    const heatmapMonthAxisPx = Math.max(7, Math.min(11, Math.min(innerWidth / 26, cellInnerHeightPx * 0.45)));
    const overlayFontMonthPx = Math.max(6, Math.min(12, Math.min(cellInnerHeightPx * 0.4, innerWidth / 22)));
    const overlayFontWeekPx = Math.max(5, Math.min(10, overlayFontMonthPx * 0.82));

    const heatmapCellsG = heatmapG.append("g").attr("transform", `translate(0, ${monthAxisBand})`);

    const cells = heatmapCellsG.selectAll(".heatmap-cell-group")
      .data(heatmapData)
      .join("g")
      .attr("class", "heatmap-cell-group")
      .attr("transform", d => {
        const xp = explorerHeatmapCellXPx(innerWidth, cellGapPx, d.x0, d.x1);
        return `translate(${xp.x}, ${hourRowTop(d.y)})`;
      })
      .style("opacity", d => {
        const isMonthMatch =
          filter.startMonth <= filter.endMonth
            ? d.month >= filter.startMonth && d.month <= filter.endMonth
            : d.month >= filter.startMonth || d.month <= filter.endMonth;
        const isHourMatch = d.y >= filter.startHour && d.y <= filter.endHour;
        return isMonthMatch && isHourMatch ? 1 : 0.2;
      });

    cells
      .append("rect")
      .attr("width", d =>
        explorerHeatmapCellXPx(innerWidth, cellGapPx, d.x0, d.x1).width
      )
      .attr("height", d => rowInnerHeight(d.y))
      .attr("rx", 2) // Smaller corner radius
      .attr("ry", 2)
      .style("fill", d => colorScale(d.value))
      .style("stroke", (aggregation === 'month' || aggregation === 'week') ? "rgba(0,0,0,0.1)" : "none")
      .style("stroke-width", "1px")
      .append("title")
      .text(d => d.tooltip);

    if (solarNightOverlayEnabled) {
      cells
        .append("rect")
        .attr("width", d =>
          explorerHeatmapCellXPx(innerWidth, cellGapPx, d.x0, d.x1).width
        )
        .attr("height", d => rowInnerHeight(d.y))
        .attr("rx", 2)
        .attr("ry", 2)
        .style("fill", solarNightOverlayRgba(theme))
        .style("stroke", "none")
        .style("pointer-events", "none")
        .style("opacity", d =>
          isSolarNightEpwStation(metadata!.lat, metadata!.lng, {
            year: d.sunYear,
            month: d.sunMonth,
            day: d.sunDay,
            jsHour: d.sunHour,
            timeZoneHours: metadata!.timeZone,
          })
            ? 1
            : 0
        );
    }

    // Overlay text for month and week aggregations if cells are large enough
    if (aggregation === 'month' || aggregation === 'week') {
      cells.append("text")
        .attr("x", d => explorerHeatmapCellXPx(innerWidth, cellGapPx, d.x0, d.x1).width / 2 - 0.5)
        .attr("y", d => rowInnerHeight(d.y) / 2 - 0.5)
        .attr("dy", "0.35em")
        .attr("text-anchor", "middle")
        .style("fill", heatmapTextColor)
        .style("font-size", `${aggregation === 'month' ? overlayFontMonthPx : overlayFontWeekPx}px`)
        .style("font-weight", "500")
        .style("pointer-events", "none")
        .style("opacity", d => {
          const isMonthMatch = filter.startMonth <= filter.endMonth
            ? (d.month >= filter.startMonth && d.month <= filter.endMonth)
            : (d.month >= filter.startMonth || d.month <= filter.endMonth);
          const isHourMatch = d.y >= filter.startHour && d.y <= filter.endHour;
          return (isMonthMatch && isHourMatch) ? 1 : 0.2;
        })
        .text(d =>
          explorerHeatmapCellXPx(innerWidth, cellGapPx, d.x0, d.x1).width > overlayMinWidth
            ? Math.round(d.value)
            : ""
        );
    }

    // Add bounding box for the selected region
    if (filter.startMonth > 1 || filter.endMonth < 12 || filter.startHour > 0 || filter.endHour < 23) {
      // Find start day of startMonth and end day of endMonth
      const startDay = data.find(d => d.month === filter.startMonth)?.dayOfYear || 1;
      const endDayData = [...data].reverse().find(d => d.month === filter.endMonth);
      const endDay = endDayData ? endDayData.dayOfYear + 1 : 366;

      {
        const span = explorerHeatmapSpanXPx(innerWidth, startDay, endDay);
        heatmapCellsG.append("rect")
        .attr("x", span.x)
        .attr("y", hourRowTop(filter.startHour))
        .attr("width", span.width)
        .attr("height", hourRowTop(filter.endHour + 1) - hourRowTop(filter.startHour))
        .attr("fill", "none")
        .attr("stroke", "#1f2937") // Dark grey
        .attr("stroke-width", 3)
        .attr("rx", 2)
        .attr("ry", 2)
        .style("pointer-events", "none");
      }
    }

    const formatHourRow = (h: number) => {
      if (h === 0) return "12 AM";
      if (h === 12) return "12 PM";
      if (h < 12) return `${h} AM`;
      return `${h - 12} PM`;
    };
    heatmapCellsG.append("g")
      .attr("class", "heatmap-hour-labels")
      .attr("pointer-events", "none")
      .selectAll("text")
      .data(d3.range(0, 24))
      .join("text")
      .attr("x", -4)
      .attr("y", h => hourRowCenter(h))
      .attr("dominant-baseline", "middle")
      .attr("text-anchor", "end")
      .style("fill", heatmapTextColor)
      .style("font-weight", "500")
      .style("font-size", `${heatmapHourAxisPx}px`)
      .text(h => formatHourRow(h));

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
    const pairLineData = aggregatedData.filter(
      d => d.valueSelected !== null && d.compareValueSelected !== null
    );

    barChartG.append("g")
      .attr("class", "explorer-bar-grid")
      .attr("pointer-events", "none")
      .selectAll("line")
      .data(yScaleBar.ticks(5))
      .join("line")
      .attr("x1", 0)
      .attr("x2", innerWidth)
      .attr("y1", d => yScaleBar(d))
      .attr("y2", d => yScaleBar(d))
      .attr("stroke", explorerBarGridStroke(theme))
      .attr("stroke-width", 1);

    if (showDifference && compareData) {
      // Draw Line Chart connecting dots
      const linePrimary = d3
        .line<(typeof pairLineData)[0]>()
        .defined(d => d.valueSelected != null && d.compareValueSelected != null)
        .x(d => xScale(d.x0) + (xScale(d.x1) - xScale(d.x0)) / 2)
        .y(d => yScaleBar(d.valueSelected!))
        .curve(d3.curveMonotoneX);

      const lineCompare = d3
        .line<(typeof pairLineData)[0]>()
        .defined(d => d.valueSelected != null && d.compareValueSelected != null)
        .x(d => xScale(d.x0) + (xScale(d.x1) - xScale(d.x0)) / 2)
        .y(d => yScaleBar(d.compareValueSelected!))
        .curve(d3.curveMonotoneX);

      const areaDiff = d3
        .area<(typeof pairLineData)[0]>()
        .defined(d => d.valueSelected != null && d.compareValueSelected != null)
        .x(d => xScale(d.x0) + (xScale(d.x1) - xScale(d.x0)) / 2)
        .y0(d => yScaleBar(d.compareValueSelected!))
        .y1(d => yScaleBar(d.valueSelected!))
        .curve(d3.curveMonotoneX);

      // Add difference shading
      barChartG.append("path")
        .datum(pairLineData)
        .attr("fill", theme === 'dark' ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)")
        .attr("d", areaDiff);

      const { baseline: lineBaseline, comparison: lineComparison } = compareExplorerLineColors(theme);

      // Add lines
      barChartG.append("path")
        .datum(pairLineData)
        .attr("fill", "none")
        .attr("stroke", lineBaseline)
        .attr("stroke-width", 2.25)
        .attr("stroke-linecap", "round")
        .attr("stroke-linejoin", "round")
        .attr("d", linePrimary);

      barChartG.append("path")
        .datum(pairLineData)
        .attr("fill", "none")
        .attr("stroke", lineComparison)
        .attr("stroke-width", 2.25)
        .attr("stroke-linecap", "round")
        .attr("stroke-linejoin", "round")
        .attr("d", lineCompare);

      // Add dots
      barChartG.selectAll(".dot-primary")
        .data(pairLineData)
        .join("circle")
        .attr("class", "dot-primary")
        .attr("cx", d => xScale(d.x0) + (xScale(d.x1) - xScale(d.x0)) / 2)
        .attr("cy", d => yScaleBar(d.valueSelected!))
        .attr("r", 3)
        .attr("fill", lineBaseline)
        .append("title")
        .text(d => `Primary: ${d.valueSelected!.toFixed(1)} ${cUnit}`);

      barChartG.selectAll(".dot-compare")
        .data(pairLineData)
        .join("circle")
        .attr("class", "dot-compare")
        .attr("cx", d => xScale(d.x0) + (xScale(d.x1) - xScale(d.x0)) / 2)
        .attr("cy", d => yScaleBar(d.compareValueSelected!))
        .attr("r", 3)
        .attr("fill", lineComparison)
        .append("title")
        .text(d => `Comparison: ${d.compareValueSelected!.toFixed(1)} ${cUnit}`);

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
        const yMinPx = yScaleBar(minVal);
        const yMaxPx = yScaleBar(maxVal);
        const topY = Math.min(yMinPx, yMaxPx);
        const barH = Math.max(1, Math.abs(yMinPx - yMaxPx));
        const pillR = Math.min(barW / 2, barH / 2);

        group.append("rect")
          .attr("x", xPos)
          .attr("y", topY)
          .attr("width", barW)
          .attr("height", barH)
          .style("fill", colorScale(val))
          .style("opacity", 0.6)
          .attr("rx", pillR)
          .attr("ry", pillR);

        // Only show average indicator dot when there's a min-max range (not in hour mode)
        if (aggregation !== 'hour') {
          group.append("circle")
            .attr("cx", xPos + barW / 2)
            .attr("cy", yScaleBar(val))
            .attr("r", Math.min(barW / 2, 4))
            .style("fill", colorScale(val))
            .style("stroke", "#000000")
            .style("stroke-width", "1px");
        }
      });

      fgGroups.append("title")
        .text(d => `Selected Hours Avg: ${d.valueSelected!.toFixed(1)} ${cUnit}`);
    }

    const yAxisBar = d3.axisLeft(yScaleBar).ticks(5);
    barChartG.append("g")
      .call(yAxisBar)
      .call(g => g.select(".domain").remove())
      .call(g => g.selectAll(".tick line").remove())
      .call(g => g.selectAll(".tick text").style("fill", heatmapTextColor).style("font-weight", "500").style("font-size", `${heatmapMonthAxisPx}px`));

    const monthCenters = explorerMonthLabelCenterDays();
    heatmapG.append("g")
      .attr("class", "explorer-month-labels")
      .attr("pointer-events", "none")
      .selectAll("text")
      .data(
        EXPLORER_MONTH_LABELS_SHORT.map((label, i) => ({
          label,
          cx: monthCenters[i]!,
        }))
      )
      .join("text")
      .attr("x", d => explorerHeatmapXOfDay(innerWidth, d.cx))
      .attr("y", monthAxisBand / 2)
      .attr("dominant-baseline", "middle")
      .attr("text-anchor", "middle")
      .style("fill", heatmapTextColor)
      .style("font-weight", "500")
      .style("font-size", `${heatmapMonthAxisPx}px`)
      .text(d => d.label);

  }, [data, compareData, showDifference, variables, colorVar, gradientId, aggregation, gradients, filter, unitSystem, heatmapTextColor, theme, dimensions.width, metadata]);

  // Calculate local stats for filtered data
  const stats = (() => {
    const filteredData = data.filter(d => {
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
      className={`group relative flex h-full min-h-0 w-full flex-col transition-colors duration-300 ${
        exportMode ? 'bg-white' : (theme === 'dark' ? 'bg-gray-800' : 'bg-white')
      }`}
      
    >
      {(exportMode || !pairSuppressHeader) && (
      <div
        className={`flex flex-col ${exportMode ? '' : 'border-b'} ${
          exportMode ? 'bg-white' : (theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-100 bg-white')
        } ${diffFillColumn && !exportMode ? 'shrink-0 py-0.5' : 'px-1.5 py-0.5'}`}
      >
        <div className="flex flex-col min-w-0">
          {exportMode ? (
            <div className="flex min-h-[24px] min-w-0 items-center gap-2">
              <ChartTypeMenu
                value="explorer"
                label={showDifference ? 'Data Difference' : 'Data Explorer'}
                onChange={() => {}}
                theme="light"
                display="icon"
                staticIcon
              />
              <ExportHeaderCaption
                lines={[exportCaptionLinesWithUnit(colorVarDef.category, colorVarDef.name, cUnit)]}
              />
            </div>
          ) : comparePane === 'secondary' ? (
            <>
              <div
                className={`mb-1.5 rounded-lg border px-1.5 py-1 text-center text-[10px] font-bold uppercase tracking-wide ${
                  theme === 'dark'
                    ? 'border-gray-700 bg-gray-950 text-gray-100'
                    : 'border-gray-800 bg-gray-950 text-white'
                }`}
              >
                Comparison · {paneCity ?? '—'}
              </div>
              <div className="flex w-full items-center justify-between gap-1.5">
                <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2">
                  <VariableChartSelect
                    value={colorVar}
                    onChange={setColorVar}
                    selectedLabel={colorVarLabel}
                    theme={theme}
                    fillRow={false}
                    domId={tutorialChromeAnchors ? 'tutorial-card-data-control' : undefined}
                  >
                    {Object.entries(groupedVariables).map(([category, vars]) => (
                      <optgroup key={category} label={category}>
                        {vars.map(v => (
                          <option key={v.id} value={v.id}>
                            {v.name} ({convertUnit(v.unit)})
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </VariableChartSelect>
                </div>
              </div>
              <div className={chartToolbarRevealClass}>
                <div className="pt-1">
                  <AggregationToolbar
                    value={aggregation}
                    onChange={setAggregation}
                    theme={theme}
                    tutorialPeriodIdPrefix={tutorialChromeAnchors ? 'tutorial-card-aggregation' : undefined}
                    trailing={
                      <>
                        <button
                          type="button"
                          id={tutorialChromeAnchors ? 'tutorial-card-stats' : undefined}
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
                          id={tutorialChromeAnchors ? 'tutorial-card-settings' : undefined}
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
                          <Settings2 className="w-3 h-3" />
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
                  className={`mb-1.5 rounded-lg border px-1.5 py-1 text-center text-[10px] font-bold uppercase tracking-wide ${
                    theme === 'dark'
                      ? 'border-gray-600 bg-gray-700/50 text-gray-100'
                      : 'border-gray-300 bg-gray-200/90 text-gray-900'
                  }`}
                >
                  Baseline · {paneCity}
                </div>
              )}
              <div className="flex w-full items-center justify-between gap-1.5">
                <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2">
                  <ChartTypeMenu
                    value="explorer"
                    label={showDifference ? 'Data Difference' : 'Data Explorer'}
                    onChange={t => onChangeType?.(t)}
                    theme={theme}
                    disabled={!onChangeType}
                    display="icon"
                    tutorialAnchorId={tutorialChromeAnchors ? 'tutorial-card-chart-type' : undefined}
                  />
                  <VariableChartSelect
                    value={colorVar}
                    onChange={setColorVar}
                    selectedLabel={colorVarLabel}
                    theme={theme}
                    fillRow={false}
                    domId={tutorialChromeAnchors ? 'tutorial-card-data-control' : undefined}
                  >
                    {Object.entries(groupedVariables).map(([category, vars]) => (
                      <optgroup key={category} label={category}>
                        {vars.map(v => (
                          <option key={v.id} value={v.id}>
                            {v.name} ({convertUnit(v.unit)})
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </VariableChartSelect>
                </div>
                {onRemove && (
                  <div className="pointer-events-none opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 focus-within:pointer-events-auto focus-within:opacity-100">
                    <button
                      type="button"
                      onClick={onRemove}
                      className={`flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide shadow-hard-sm transition-all active:scale-95 ${
                        showDifference
                          ? theme === 'dark'
                            ? 'border border-red-800/50 bg-red-900/20 text-red-400 hover:bg-red-900/40'
                            : 'border border-red-100 bg-red-50 text-red-600 hover:bg-red-100'
                          : theme === 'dark'
                            ? 'text-gray-400 hover:bg-red-900/20 hover:text-red-400'
                            : 'text-gray-400 hover:bg-red-50 hover:text-red-500'
                      }`}
                    >
                      {showDifference ? (
                        <>
                          <X className="w-3 h-3" />
                          <span>Hide</span>
                        </>
                      ) : (
                        <X className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                )}
              </div>
              <div className={chartToolbarRevealClass}>
                <div className="pt-1">
                  <AggregationToolbar
                    value={aggregation}
                    onChange={setAggregation}
                    theme={theme}
                    tutorialPeriodIdPrefix={tutorialChromeAnchors ? 'tutorial-card-aggregation' : undefined}
                    trailing={
                      <>
                        <button
                          type="button"
                          id={tutorialChromeAnchors ? 'tutorial-card-stats' : undefined}
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
                          id={tutorialChromeAnchors ? 'tutorial-card-settings' : undefined}
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
      )}

      {!pairSuppressFooterLegend && (
        <div className="w-full min-w-0 flex-shrink-0 px-2 pt-1">
          <InteractiveLegend
            domId={tutorialLegendDomId}
            variable={{ ...colorVarDef, min: cMin, max: cMax, unit: cUnit }}
            gradientId={gradientId}
            setGradientId={setGradientId}
            gradients={gradients}
            theme={theme}
            isDifference={showDifference}
          />
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

      {/* Settings Modal */}
      <CardModal
        open={showSettingsModal}
        onClose={() => setShowSettings(false)}
        title="Chart settings"
        theme={theme}
        anchorRef={outerRef as any}
      >
        <div className="grid grid-cols-1 gap-3">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className={`block text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Color Palette</label>
              <button 
                type="button"
                onClick={() => setShowGradientModal(true)}
                className="text-[10px] font-bold text-gray-600 hover:text-gray-800 uppercase tracking-tight"
              >
                + Create
              </button>
            </div>
            <div className={`flex overflow-x-auto rounded-full border p-1.5 ${theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
              {paletteGradients.map(g => (
                <button
                  key={g.id}
                  type="button"
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
          <div className="space-y-2">
            <label className={`block text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Variable</label>
            <select 
              value={colorVar} 
              onChange={e => setColorVar(e.target.value)}
              className={`w-full rounded-full border p-2 text-sm outline-none transition-colors focus:ring-2 focus:ring-gray-500 ${
                theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              {Object.entries(
                variables.reduce((acc, variable) => {
                  const category = variable.category || 'Other';
                  if (!acc[category]) acc[category] = [];
                  acc[category].push(variable);
                  return acc;
                }, {} as Record<string, typeof variables>)
              ).map(([category, vars]) => (
                <optgroup key={category} label={category}>
                  {vars.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({convertUnit(v.unit)})
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
        </div>
      </CardModal>

      <div
        className={`flex min-h-0 min-w-0 flex-1 flex-col gap-0 overflow-hidden px-1 ${
          diffFillColumn ? 'py-0' : 'py-0.5'
        }`}
      >
        <div className="relative flex min-h-0 w-full flex-1 items-center justify-center overflow-hidden">
          <svg
            ref={svgRef}
            className="block h-full w-full max-h-full max-w-full"
            preserveAspectRatio={pairSuppressFooterLegend ? 'xMidYMax meet' : 'xMidYMid meet'}
          />
        </div>
        {stackedComparison && compareData && (
        <div className="relative flex min-h-0 w-full flex-1 items-center justify-center overflow-hidden">
          <svg
            ref={compareSvgRef}
            className="block h-full w-full max-h-full max-w-full"
            preserveAspectRatio={pairSuppressFooterLegend ? 'xMidYMax meet' : 'xMidYMid meet'}
          />
        </div>
        )}
      </div>
    </div>
  );
}
