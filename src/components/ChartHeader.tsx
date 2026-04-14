import { X } from 'lucide-react';
import React, { ReactNode } from 'react';
import { ChartType } from '../App';

interface ChartHeaderProps {
  chartType: ChartType | string;
  onChartTypeChange?: (type: ChartType) => void;
  exportMode?: boolean;
  theme: 'light' | 'dark';
  onRemove?: () => void;
  topContent?: ReactNode; // Things next to the title (like variable dropdown)
  children?: ReactNode;   // Things below the top row (like aggregation pills)
}

export function ChartHeader({
  chartType,
  onChartTypeChange,
  exportMode,
  theme,
  onRemove,
  topContent,
  children
}: ChartHeaderProps) {
  return (
    <div className={`flex flex-col ${exportMode ? '' : 'border-b'} ${
      exportMode ? 'bg-white' : (theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-100 bg-white')
    } p-3 gap-2`}>
      {/* Top Row */}
      <div className="flex items-center justify-between w-full gap-2">
        <div className="flex items-center min-w-0 gap-2 sm:gap-3">
          {exportMode ? (
            <h3 className={`font-semibold whitespace-nowrap uppercase tracking-wider text-sm text-gray-800`}>
              {chartType === 'sunpath' ? 'Sun Path' : 
               chartType === 'explorer' ? 'Data Explorer' :
               chartType === 'utci' ? 'UTCI Comfort' :
               chartType === 'wind' ? 'Wind Explorer' :
               chartType === 'windrose' ? 'Wind Rose' : 'Chart'}
            </h3>
          ) : (
            <select
              value={chartType}
              onChange={(e) => onChartTypeChange && onChartTypeChange(e.target.value as ChartType)}
              className={`font-semibold uppercase text-xs tracking-wider border rounded p-1 shadow-hard-sm cursor-pointer ${
                theme === 'dark' ? 'bg-gray-700 text-gray-200 border-gray-600' : 'bg-gray-50 text-gray-800 border-gray-200'
              }`}
            >
              <option value="sunpath">Sun Path</option>
              <option value="explorer">Data Explorer</option>
              <option value="utci">UTCI Comfort</option>
              <option value="wind">Wind Explorer</option>
              <option value="windrose">Wind Rose</option>
            </select>
          )}

          {/* Dividing line if topContent exists */}
          {topContent && (
            <>
              <div className={`shrink-0 w-px h-4 ${exportMode ? 'bg-gray-200' : (theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200')}`}></div>
              {topContent}
            </>
          )}
        </div>
        
        {/* Remove Button */}
        {onRemove && !exportMode && (
          <button 
            onClick={onRemove} 
            className={`rounded-md transition-colors shadow-hard-md p-1.5 ${theme === 'dark' ? 'text-gray-400 hover:text-red-400 hover:bg-red-900/30' : 'text-gray-400 hover:text-red-500 hover:bg-red-50'}`}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Bottom Row / Children */}
      {children}
    </div>
  );
}
