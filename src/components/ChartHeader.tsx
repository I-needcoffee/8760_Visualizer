import { X } from 'lucide-react';
import React, { ReactNode } from 'react';
import { ChartType } from '../App';
import { ChartTypeMenu } from './ChartTypeMenu';

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
  const type = chartType as ChartType;
  const exportMenuLabel =
    type === 'sunpath' ? 'Sun Path' :
    type === 'explorer' ? 'Data Explorer' :
    type === 'utci' ? 'UTCI Comfort' :
    type === 'wind' ? 'Wind Explorer' :
    type === 'windrose' ? 'Wind Rose' : 'Chart';

  return (
    <div className={`flex flex-col ${exportMode ? '' : 'border-b'} ${
      exportMode ? 'bg-white' : (theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-100 bg-white')
    } p-2 ${exportMode ? '' : 'gap-1.5'}`}>
      {/* Top Row */}
      <div className="flex items-center justify-between w-full gap-1.5">
        <div className={`flex items-center min-w-0 ${exportMode ? 'gap-2 flex-1' : 'gap-1.5 sm:gap-2'}`}>
          {exportMode ? (
            <>
              <ChartTypeMenu
                value={type}
                label={exportMenuLabel}
                onChange={() => {}}
                theme="light"
                display="icon"
                staticIcon
              />
            </>
          ) : (
            <select
              value={chartType}
              onChange={(e) => onChartTypeChange && onChartTypeChange(e.target.value as ChartType)}
              className={`cursor-pointer rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide shadow-hard-sm transition-[color,background-color,border-color,box-shadow] duration-200 ${
                theme === 'dark' ? 'border-gray-600 bg-gray-700 text-gray-200' : 'border-gray-200 bg-gray-50 text-gray-800'
              }`}
            >
              <option value="sunpath">Sun Path</option>
              <option value="explorer">Data Explorer</option>
              <option value="utci">UTCI Comfort</option>
              <option value="wind">Wind Explorer</option>
              <option value="windrose">Wind Rose</option>
            </select>
          )}
          {topContent}
        </div>
        
        {/* Remove Button */}
        {onRemove && !exportMode && (
          <button 
            onClick={onRemove} 
            className={`inline-flex h-7 w-7 items-center justify-center rounded-full shadow-hard-sm transition-[color,background-color,box-shadow] duration-200 ${theme === 'dark' ? 'text-gray-400 hover:bg-red-900/30 hover:text-red-400' : 'text-gray-400 hover:bg-red-50 hover:text-red-500'}`}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Bottom Row / Children */}
      {children}
    </div>
  );
}
