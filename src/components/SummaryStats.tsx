import { useState } from 'react';
import { EPWDataRow, EPWVariable } from '../lib/epwParser';
import { GlobalFilterState } from './GlobalFilterPanel';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { UnitSystem } from '../App';
import tc from 'jsthermalcomfort';

interface SummaryStatsProps {
  data: EPWDataRow[];
  compareData?: EPWDataRow[];
  showDifference?: boolean;
  variables: EPWVariable[];
  filter: GlobalFilterState;
  unitSystem: UnitSystem;
  theme: 'light' | 'dark';
}

export function SummaryStats({ data, compareData, showDifference, variables, filter, unitSystem, theme }: SummaryStatsProps) {
  const [isCollapsed, setIsCollapsed] = useState(true);
  // Filter data based on the global filter
  const filteredData = data.filter(d => {
    const isMonthMatch = filter.startMonth <= filter.endMonth
      ? (d.month >= filter.startMonth && d.month <= filter.endMonth)
      : (d.month >= filter.startMonth || d.month <= filter.endMonth);
    return isMonthMatch && 
           d.hour >= filter.startHour && 
           d.hour <= filter.endHour;
  });

  if (filteredData.length === 0) {
    return null;
  }

  // Calculate averages and totals
  const tempVar = variables.find(v => v.id === 'dryBulbTemperature');
  const rhVar = variables.find(v => v.id === 'relativeHumidity');
  const windVar = variables.find(v => v.id === 'windSpeed');
  const rainVar = variables.find(v => v.id === 'liquidPrecipitationDepth');

  let avgTemp = 0;
  let avgRh = 0;
  let avgWind = 0;
  let totalRain = 0;
  let avgUtci = 0;
  let utciCount = 0;
  let comfortHours = 0;

  filteredData.forEach(d => {
    const idx = data.indexOf(d);
    
    const getVal = (v: EPWVariable | undefined) => {
      if (!v) return 0;
      const primaryVal = (d[v.id] as number) || 0;
      if (showDifference && compareData) {
        const compareVal = (compareData[idx]?.[v.id] as number) || 0;
        return primaryVal - compareVal;
      }
      return primaryVal;
    };

    avgTemp += getVal(tempVar);
    avgRh += getVal(rhVar);
    avgWind += getVal(windVar);
    totalRain += getVal(rainVar);
    
    // Calculate UTCI
    const tdb = (d.dryBulbTemperature as number) || 20;
    const rh = (d.relativeHumidity as number) || 50;
    const windSpeed = (d.windSpeed as number) || 0.5;
    const ghr = (d.globalHorizontalRadiation as number) || 0;

    const v = Math.max(0.5, windSpeed);
    const tr = tdb + (0.02 * ghr);

    let utciVal = tdb;
    try {
      const result = tc.models.utci(tdb, tr, v, rh, 'SI', true, false);
      utciVal = isNaN(result.utci) ? tdb : result.utci;
    } catch (e) {
      // Fallback
    }

    if (showDifference && compareData) {
      const cD = compareData[idx];
      if (cD) {
        const cTdb = (cD.dryBulbTemperature as number) || 20;
        const cRh = (cD.relativeHumidity as number) || 50;
        const cWindSpeed = (cD.windSpeed as number) || 0.5;
        const cGhr = (cD.globalHorizontalRadiation as number) || 0;
        const cV = Math.max(0.5, cWindSpeed);
        const cTr = cTdb + (0.02 * cGhr);
        let cUtciVal = cTdb;
        try {
          const cResult = tc.models.utci(cTdb, cTr, cV, cRh, 'SI', true, false);
          cUtciVal = isNaN(cResult.utci) ? cTdb : cResult.utci;
        } catch (e) {}
        utciVal = utciVal - cUtciVal;
      }
    }
    
    avgUtci += utciVal;
    utciCount++;
    
    if (!showDifference && utciVal >= 9 && utciVal <= 26) {
      comfortHours++;
    }
  });

  const count = filteredData.length;
  avgTemp /= count;
  avgRh /= count;
  avgWind /= count;
  if (utciCount > 0) avgUtci /= utciCount;

  // Convert units if imperial
  if (unitSystem === 'imperial') {
    if (showDifference) {
      avgTemp = avgTemp * 9/5; // Difference in C to difference in F is just * 1.8
      avgUtci = avgUtci * 9/5;
    } else {
      avgTemp = avgTemp * 9/5 + 32;
      avgUtci = avgUtci * 9/5 + 32;
    }
    avgWind = avgWind * 2.23694; // m/s to mph
    totalRain = totalRain / 25.4; // mm to inches
  }

  // Calculate comfort percentage (UTCI between 9 and 26)
  const comfortPercent = utciCount > 0 ? (comfortHours / utciCount) * 100 : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      <div className={`p-4 rounded-xl shadow-hard-md border ${theme === 'dark' ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-100'}`}>
        <div className={`text-xs font-semibold uppercase tracking-wider mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{showDifference ? 'Δ Avg Temp' : 'Avg Temp'}</div>
        <div className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{avgTemp > 0 && showDifference ? '+' : ''}{avgTemp.toFixed(1)}{unitSystem === 'imperial' ? '°F' : '°C'}</div>
      </div>
      
      <div className={`p-4 rounded-xl shadow-hard-md border ${theme === 'dark' ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-100'}`}>
        <div className={`text-xs font-semibold uppercase tracking-wider mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{showDifference ? 'Δ Avg Humidity' : 'Avg Humidity'}</div>
        <div className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{avgRh > 0 && showDifference ? '+' : ''}{avgRh.toFixed(0)}%</div>
      </div>

      <div className={`p-4 rounded-xl shadow-hard-md border ${theme === 'dark' ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-100'}`}>
        <div className={`text-xs font-semibold uppercase tracking-wider mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{showDifference ? 'Δ Avg Wind' : 'Avg Wind'}</div>
        <div className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{avgWind > 0 && showDifference ? '+' : ''}{avgWind.toFixed(1)} {unitSystem === 'imperial' ? 'mph' : 'm/s'}</div>
      </div>

      <div className={`p-4 rounded-xl shadow-hard-md border ${theme === 'dark' ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-100'}`}>
        <div className={`text-xs font-semibold uppercase tracking-wider mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{showDifference ? 'Δ Total Rain' : 'Total Rainfall'}</div>
        <div className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{totalRain > 0 && showDifference ? '+' : ''}{totalRain.toFixed(unitSystem === 'imperial' ? 2 : 0)} {unitSystem === 'imperial' ? 'in' : 'mm'}</div>
      </div>

      {utciCount > 0 && (
        <>
          <div className={`p-4 rounded-xl shadow-hard-md border ${theme === 'dark' ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-100'}`}>
            <div className={`text-xs font-semibold uppercase tracking-wider mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{showDifference ? 'Δ Avg UTCI' : 'Avg UTCI'}</div>
            <div className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{avgUtci > 0 && showDifference ? '+' : ''}{avgUtci.toFixed(1)}{unitSystem === 'imperial' ? '°F' : '°C'}</div>
          </div>
          {!showDifference && (
            <div className={`p-4 rounded-xl shadow-hard-md border ${theme === 'dark' ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-100'}`}>
              <div className={`text-xs font-semibold uppercase tracking-wider mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Comfort Time</div>
              <div className={`text-2xl font-bold ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`}>{comfortPercent.toFixed(1)}%</div>
            </div>
          )}
        </>
      )}

      <div className={`p-4 rounded-xl shadow-hard-md border ${theme === 'dark' ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-100'}`}>
        <div className={`text-xs font-semibold uppercase tracking-wider mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Selected Hours</div>
        <div className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{count}</div>
      </div>
    </div>
  );
}
