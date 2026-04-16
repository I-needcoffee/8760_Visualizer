import { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';
import { EPWDataRow, EPWVariable } from '../lib/epwParser';
import { InteractiveLegend, GradientDef } from './InteractiveLegend';
import { ChartType } from '../App';
import { X, Settings2 } from 'lucide-react';
import { GlobalFilterState } from './GlobalFilterPanel';
import { UnitSystem } from '../App';
import { ChartTypeMenu } from './ChartTypeMenu';
import { ExportHeaderCaption } from './ExportHeaderCaption';

interface WindRoseProps {
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

const COMPASS_POINTS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];

export function WindRose({ 
  data, compareData, showDifference, stackedComparison, variables, onRemove, onChangeType, gradients, filter, unitSystem, heatmapTextColor, theme, 
  setShowGradientModal, exportMode
}: WindRoseProps) {
  const roseRef = useRef<SVGSVGElement>(null);
  const compareRoseRef = useRef<SVGSVGElement>(null);
  const [colorVar, setColorVar] = useState(variables.find(v => v.id === 'windSpeed')?.id || variables[0]?.id || '');
  const [gradientId, setGradientId] = useState(gradients[0].id);
  const [showSettings, setShowSettings] = useState(false);
  const [numBins, setNumBins] = useState(16);
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

  // Filter data based on global filter and comfort filters
  const getFilteredData = (targetData: EPWDataRow[]) => {
    return targetData.filter(d => {
      const isMonthMatch = filter.startMonth <= filter.endMonth
        ? (d.month >= filter.startMonth && d.month <= filter.endMonth)
        : (d.month >= filter.startMonth || d.month <= filter.endMonth);
      
      const isTimeMatch = isMonthMatch && d.hour >= filter.startHour && d.hour <= filter.endHour;
      if (!isTimeMatch) return false;

      let isTempMatch = true;
      if (tempFilterEnabled) {
        const temp = convertValue(d.dryBulbTemperature as number, '°C');
        if (tempFilterType === 'above') {
          isTempMatch = temp > tempThreshold;
        } else {
          isTempMatch = temp < tempThreshold;
        }
      }

      let isSpeedMatch = true;
      if (speedFilterEnabled) {
        const speed = convertValue(d.windSpeed as number, 'm/s');
        if (speedFilterType === 'above') {
          isSpeedMatch = speed > speedThreshold;
        } else {
          isSpeedMatch = speed < speedThreshold;
        }
      }

      return isTempMatch && isSpeedMatch;
    });
  };

  const filteredData = useMemo(() => getFilteredData(data), [data, filter, tempFilterEnabled, tempThreshold, tempFilterType, speedFilterEnabled, speedThreshold, speedFilterType, unitSystem]);
  const filteredCompareData = useMemo(() => compareData ? getFilteredData(compareData) : [], [compareData, filter, tempFilterEnabled, tempThreshold, tempFilterType, speedFilterEnabled, speedThreshold, speedFilterType, unitSystem]);

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
    if (!roseRef.current || !filteredData.length || dimensions.width === 0) return;

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

    // --- Wind Rose ---
    const roseWidth = 350;
    const roseHeight = 420;
    const roseMargin = 30;
    const roseRadius = (Math.min(roseWidth, roseHeight - 80) / 2 - roseMargin);

    const roseSvg = d3.select(roseRef.current);
    roseSvg.selectAll("*").remove();

    const roseG = roseSvg
      .attr("viewBox", `0 0 ${roseWidth} ${roseHeight}`)
      .append("g")
      .attr("transform", `translate(${roseWidth / 2}, ${(roseHeight - 80) / 2 + 10})`);

    // Group wind by direction
    const binSize = 360 / numBins;
    
    // Create 6 buckets based on the color variable's domain
    const numBuckets = 6;
    const bucketScale = d3.scaleQuantize<number>()
      .domain([cMin, cMax])
      .range(d3.range(numBuckets));
    
    const bins = d3.range(numBins).map(i => ({
      angle: i * binSize,
      buckets: new Array(numBuckets).fill(0),
      totalCount: 0
    }));

    filteredData.forEach(d => {
      const dir = d.windDirection as number;
      const speed = d.windSpeed as number;
      
      let val: number;
      if (showDifference && compareData) {
        const idx = data.indexOf(d);
        const primaryVal = d[colorVar] as number;
        const compareVal = compareData[idx]?.[colorVar] as number;
        if (primaryVal === null || compareVal === null) return;
        val = convertValue(compareVal - primaryVal, colorVarDef.unit, true);
      } else {
        val = convertValue(d[colorVar] as number, colorVarDef.unit);
      }

      if (dir !== null && dir !== undefined && val !== null && val !== undefined && speed > 0) {
        let binIndex = Math.round(dir / binSize) % numBins;
        if (binIndex < 0) binIndex += numBins;
        
        let bucketIndex = bucketScale(val);
        if (bucketIndex === undefined) bucketIndex = 0;
        if (bucketIndex >= numBuckets) bucketIndex = numBuckets - 1;
        
        bins[binIndex].buckets[bucketIndex]++;
        bins[binIndex].totalCount++;
      }
    });

    const maxTotalCount = d3.max(bins, d => d.totalCount) || 1;
    const rScaleRose = d3.scaleLinear()
      .domain([0, maxTotalCount])
      .range([0, roseRadius]);

    // Draw grid circles
    const ticks = rScaleRose.ticks(4);
    roseG.selectAll(".rose-grid")
      .data(ticks)
      .join("circle")
      .attr("class", "rose-grid")
      .attr("r", d => rScaleRose(d))
      .style("fill", "none")
      .style("stroke", theme === 'dark' ? '#4b5563' : '#e5e7eb')
      .style("stroke-width", '1.5px')
      .style("stroke-dasharray", "none");

    // Draw axis lines (16 compass points)
    roseG.selectAll(".rose-axis")
      .data(d3.range(16))
      .join("line")
      .attr("class", "rose-axis")
      .attr("x1", 0)
      .attr("y1", 0)
      .attr("x2", d => roseRadius * Math.sin(d * (360/16) * Math.PI / 180))
      .attr("y2", d => -roseRadius * Math.cos(d * (360/16) * Math.PI / 180))
      .style("stroke", theme === 'dark' ? '#4b5563' : '#e5e7eb')
      .style("stroke-width", '1px')
      .style("stroke-opacity", 0.5);

    // Draw labels (16 compass points)
    roseG.selectAll(".rose-label")
      .data(d3.range(16))
      .join("text")
      .attr("class", "rose-label")
      .attr("x", d => (roseRadius + 10) * Math.sin(d * (360/16) * Math.PI / 180))
      .attr("y", d => -(roseRadius + 10) * Math.cos(d * (360/16) * Math.PI / 180))
      .attr("dy", "0.35em")
      .attr("text-anchor", "middle")
      .style("fill", heatmapTextColor)
      .style("font-size", d => d % 2 === 0 ? `10px` : `8px`)
      .style("font-weight", d => d % 4 === 0 ? "bold" : "normal")
      .text(d => COMPASS_POINTS[d]);

    // Stack the buckets
    const stack = d3.stack<any>()
      .keys(d3.range(numBuckets).map(String))
      .value((d, key) => d.buckets[Number(key)]);
    
    const series = stack(bins);
    
    const wedges: any[] = [];
    series.forEach((s) => {
      const extent = bucketScale.invertExtent(Number(s.key));
      s.forEach(d => {
        if (d[1] > d[0]) {
          wedges.push({
            angle: d.data.angle,
            inner: d[0],
            outer: d[1],
            count: d[1] - d[0],
            bucketIndex: Number(s.key),
            extent: extent
          });
        }
      });
    });

    const arc = d3.arc<any>()
      .innerRadius(d => rScaleRose(d.inner))
      .outerRadius(d => rScaleRose(d.outer))
      .startAngle(d => (d.angle - binSize / 2) * Math.PI / 180)
      .endAngle(d => (d.angle + binSize / 2) * Math.PI / 180);

    roseG.selectAll(".rose-wedge")
      .data(wedges)
      .join("path")
      .attr("class", "rose-wedge")
      .attr("d", arc)
      .style("fill", d => {
        const midVal = (d.extent[0] + d.extent[1]) / 2;
        return colorScale(midVal);
      })
      .style("stroke", "#ffffff")
      .style("stroke-width", "0.5px")
      .append("title")
      .text(d => `Direction: ${Math.round(d.angle)}°\nRange: ${d.extent[0].toFixed(1)} - ${d.extent[1].toFixed(1)} ${cUnit}\nCount: ${d.count} hours`);

    // Wind Rose Title
    roseG.append("text")
      .attr("y", -roseRadius - 25)
      .attr("text-anchor", "middle")
      .style("font-size", `10px`)
      .style("font-weight", "bold")
      .style("fill", heatmapTextColor)
      .text("Wind Rose (Frequency & Speed)");

    // --- Wind Rose Legend ---
    const legendItemWidth = 50;
    const totalLegendWidth = numBuckets * legendItemWidth;
    const legendG = roseSvg.append("g")
      .attr("transform", `translate(${(roseWidth - totalLegendWidth) / 2}, ${roseHeight - 35})`);

    const legendItems = d3.range(numBuckets);
    const itemHeight = 14;

    legendG.selectAll(".rose-legend-item")
      .data(legendItems)
      .join("g")
      .attr("transform", (d, i) => `translate(${i * legendItemWidth}, 0)`)
      .each(function(d) {
        const itemG = d3.select(this);
        const extent = bucketScale.invertExtent(d);
        if (!extent[0] && extent[0] !== 0) return;
        
        const midVal = (extent[0] + extent[1]) / 2;

        itemG.append("rect")
          .attr("width", 12)
          .attr("height", itemHeight)
          .attr("rx", 2)
          .style("fill", colorScale(midVal));

        itemG.append("text")
          .attr("x", 16)
          .attr("y", itemHeight / 2)
          .attr("dy", "0.35em")
          .style("font-size", `7px`)
          .style("fill", heatmapTextColor)
          .text(`${extent[0].toFixed(1)}-${extent[1].toFixed(1)}`);
      });

    legendG.append("text")
      .attr("x", totalLegendWidth / 2)
      .attr("y", -10)
      .attr("text-anchor", "middle")
      .style("font-size", `9px`)
      .style("font-weight", "bold")
      .style("fill", heatmapTextColor)
      .text(`Wind Speed (${cUnit})`);

  }, [filteredData, data, compareData, showDifference, variables, colorVar, gradientId, gradients, filter, dimensions.width, numBins, unitSystem, heatmapTextColor, theme]);

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
        {exportMode ? (
          <div className="flex items-center gap-2 min-w-0 min-h-[28px]">
            <ChartTypeMenu
              value="windrose"
              label="Wind Rose"
              onChange={() => {}}
              theme="light"
              display="icon"
              staticIcon
            />
            <ExportHeaderCaption
              lines={[{ short: colorVarDef.category, long: colorVarDef.name }]}
            />
          </div>
        ) : (
        <div className="relative flex items-center w-full min-h-[28px] gap-1.5">
          <div
            className={`flex items-center min-w-0 gap-1.5 sm:gap-2 flex-1 transition-[padding] duration-200 ease-out ${
              showSettings
                ? onRemove
                  ? 'pr-[4.75rem]'
                  : 'pr-9'
                : onRemove
                  ? 'pr-0 group-hover:pr-[4.75rem] focus-within:pr-[4.75rem]'
                  : 'pr-0 group-hover:pr-9 focus-within:pr-9'
            }`}
          >
            <ChartTypeMenu
              value="windrose"
              label="Wind Rose"
              onChange={(t) => onChangeType?.(t)}
              theme={theme}
              disabled={!onChangeType}
              display="icon"
            />
            <span
              className={`text-[10px] font-medium truncate min-w-0 flex-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}
              title="Wind Direction"
            >
              Wind Direction
            </span>
          </div>
          <div
            className={`absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-1 shrink-0 transition-opacity duration-200 ease-out ${
              showSettings
                ? 'opacity-100'
                : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-within:opacity-100 focus-within:pointer-events-auto'
            }`}
          >
            <button
              type="button"
              onClick={() => setShowSettings(!showSettings)}
              className={`rounded p-0.5 transition-colors shrink-0 ${
                showSettings 
                  ? (theme === 'dark' ? 'bg-blue-900/40 text-blue-400' : 'bg-blue-50 text-blue-600') 
                  : (theme === 'dark' ? 'bg-gray-800 text-gray-400 hover:text-gray-200' : 'bg-gray-50 text-gray-500 hover:text-gray-800')
              }`}
              title="Chart settings"
            >
              <Settings2 className="w-3 h-3" />
            </button>
            {onRemove && (
              <button 
                type="button"
                onClick={onRemove} 
                className={`rounded p-0.5 transition-colors shrink-0 ${theme === 'dark' ? 'text-gray-400 hover:text-red-400 hover:bg-red-900/20' : 'text-gray-400 hover:text-red-500 hover:bg-red-50'}`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
        )}
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2" onClick={() => setShowSettings(false)}>
          <div className={`p-3 rounded-lg shadow-hard-xl max-w-xs sm:max-w-sm w-full max-h-[min(88vh,520px)] overflow-y-auto border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-2">
              <h3 className={`text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Chart settings</h3>
              <button type="button" onClick={() => setShowSettings(false)} className={`p-1 rounded-md ${theme === 'dark' ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3">
              <div className="space-y-2">
                <div className="space-y-2">
                  <label className={`block text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Wind Rose Granularity</label>
                  <select
                    value={numBins}
                    onChange={(e) => setNumBins(parseInt(e.target.value))}
                    className={`w-full text-sm rounded-lg block p-2.5 transition-all outline-none border ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white hover:bg-gray-600' : 'bg-gray-50 border-gray-200 text-gray-900 hover:bg-white'}`}
                  >
                    <option value={8}>8 Directions (Basic)</option>
                    <option value={16}>16 Directions (Standard)</option>
                    <option value={36}>36 Directions (Detailed)</option>
                    <option value={72}>72 Directions (High Res)</option>
                  </select>
                </div>

                <div className="space-y-3 p-3 rounded-lg border border-dashed border-gray-300 dark:border-gray-600">
                  <div className="flex items-center justify-between">
                    <label className={`text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Temperature Filter</label>
                    <input 
                      type="checkbox" 
                      checked={tempFilterEnabled} 
                      onChange={e => setTempFilterEnabled(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </div>
                  {tempFilterEnabled && (
                    <div className="space-y-3 pt-1">
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setTempFilterType('above')}
                          className={`flex-1 py-1 px-2 text-[10px] font-bold rounded border transition-all ${tempFilterType === 'above' ? 'bg-blue-600 border-blue-600 text-white' : 'bg-transparent border-gray-300 text-gray-500'}`}
                        >
                          ABOVE
                        </button>
                        <button 
                          onClick={() => setTempFilterType('below')}
                          className={`flex-1 py-1 px-2 text-[10px] font-bold rounded border transition-all ${tempFilterType === 'below' ? 'bg-blue-600 border-blue-600 text-white' : 'bg-transparent border-gray-300 text-gray-500'}`}
                        >
                          BELOW
                        </button>
                      </div>
                      <div className="px-2">
                        <Slider 
                          min={unitSystem === 'imperial' ? 0 : -20} 
                          max={unitSystem === 'imperial' ? 120 : 50} 
                          value={tempThreshold} 
                          onChange={(v) => setTempThreshold(v as number)}
                          trackStyle={{ backgroundColor: '#3b82f6' }}
                          handleStyle={{ borderColor: '#3b82f6', backgroundColor: '#fff' }}
                        />
                        <div className="flex justify-between mt-1">
                          <span className="text-[10px] text-gray-400">{unitSystem === 'imperial' ? '0°F' : '-20°C'}</span>
                          <span className="text-xs font-bold text-blue-500">{tempThreshold}{unitSystem === 'imperial' ? '°F' : '°C'}</span>
                          <span className="text-[10px] text-gray-400">{unitSystem === 'imperial' ? '120°F' : '50°C'}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-3 p-3 rounded-lg border border-dashed border-gray-300 dark:border-gray-600">
                  <div className="flex items-center justify-between">
                    <label className={`text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Wind Speed Filter</label>
                    <input 
                      type="checkbox" 
                      checked={speedFilterEnabled} 
                      onChange={e => setSpeedFilterEnabled(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </div>
                  {speedFilterEnabled && (
                    <div className="space-y-3 pt-1">
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setSpeedFilterType('above')}
                          className={`flex-1 py-1 px-2 text-[10px] font-bold rounded border transition-all ${speedFilterType === 'above' ? 'bg-blue-600 border-blue-600 text-white' : 'bg-transparent border-gray-300 text-gray-500'}`}
                        >
                          ABOVE
                        </button>
                        <button 
                          onClick={() => setSpeedFilterType('below')}
                          className={`flex-1 py-1 px-2 text-[10px] font-bold rounded border transition-all ${speedFilterType === 'below' ? 'bg-blue-600 border-blue-600 text-white' : 'bg-transparent border-gray-300 text-gray-500'}`}
                        >
                          BELOW
                        </button>
                      </div>
                      <div className="px-2">
                        <Slider 
                          min={0} 
                          max={unitSystem === 'imperial' ? 45 : 20} 
                          value={speedThreshold} 
                          onChange={(v) => setSpeedThreshold(v as number)}
                          trackStyle={{ backgroundColor: '#3b82f6' }}
                          handleStyle={{ borderColor: '#3b82f6', backgroundColor: '#fff' }}
                        />
                        <div className="flex justify-between mt-1">
                          <span className="text-[10px] text-gray-400">0</span>
                          <span className="text-xs font-bold text-blue-500">{speedThreshold}{unitSystem === 'imperial' ? 'mph' : 'm/s'}</span>
                          <span className="text-[10px] text-gray-400">{unitSystem === 'imperial' ? '45' : '20'}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
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
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="px-0 py-1 flex-1 min-h-0 flex flex-col gap-1 overflow-hidden min-w-0">
        <div className="w-full flex-1 min-h-0 min-w-0 flex items-center justify-center relative">
          <svg ref={roseRef} className="w-full h-full max-h-full max-w-full" preserveAspectRatio="xMidYMid meet" />
        </div>
        {stackedComparison && compareData && (
        <div className="w-full flex-1 min-h-0 min-w-0 flex items-center justify-center relative">
          <svg ref={compareRoseRef} className="w-full h-full max-h-full max-w-full" preserveAspectRatio="xMidYMid meet" />
        </div>
        )}
        <div className="mt-0 flex-shrink-0 px-0.5 pt-0 w-full min-w-0">
          <InteractiveLegend 
            variable={{ 
              id: colorVar, 
              name: colorVarDef.name, 
              unit: colorVarDef.unit, 
              min: cMin, 
              max: cMax, 
              category: colorVarDef.category 
            }} 
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
