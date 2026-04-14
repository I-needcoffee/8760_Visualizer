import React from 'react';
import { ChartType, ChartConfig } from '../App';
import { Plus } from 'lucide-react';

interface ComparisonModeLayoutProps {
  diffChartConfig: ChartConfig;
  stackedSlots: ChartConfig[];
  renderChart: (config: ChartConfig, forceDiffMode?: boolean, forceStacked?: boolean) => React.ReactNode;
  onSelectSlotType: (index: number, type: ChartType) => void;
  onAddSlot: () => void;
  exportMode: boolean;
  theme: 'light' | 'dark';
}

export function ComparisonModeLayout({
  diffChartConfig,
  stackedSlots,
  renderChart,
  onSelectSlotType,
  onAddSlot,
  exportMode,
  theme
}: ComparisonModeLayoutProps) {
  
  return (
    <div className="flex flex-col lg:flex-row gap-4 flex-1 h-full min-h-[85vh]">
      
      {/* LEFT COLUMN: Difference Chart (approx 25-30% width) */}
      <div className={`w-full lg:w-[28%] xl:w-1/4 flex flex-col flex-shrink-0 overflow-visible ${exportMode ? 'bg-white' : `rounded-2xl border shadow-hard-xl ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}`}>
        {renderChart(diffChartConfig, true, false)}
      </div>

      {/* RIGHT COLUMN: Scroller of Stacked Columns */}
      <div className="flex-1 w-full overflow-x-auto hide-scrollbar pb-4 pt-1">
        <div className="flex flex-nowrap gap-4 h-full items-stretch">
          {stackedSlots.map((slot, idx) => (
             <div key={slot.id} className={`w-[350px] sm:w-[400px] flex-shrink-0 flex flex-col overflow-visible ${exportMode ? 'bg-white' : `rounded-2xl border shadow-hard-xl ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}`}>
                {slot.type === 'empty' ? (
                  <EmptySlot onSelectType={(type) => onSelectSlotType(idx, type)} theme={theme} />
                ) : (
                  renderChart(slot, false, true)
                )}
             </div>
          ))}

          {/* Add Column Button */}
          {!exportMode && (
            <div className="w-[80px] flex-shrink-0 flex items-center justify-center">
               <button 
                  onClick={onAddSlot}
                  className={`w-12 h-12 flex flex-col items-center justify-center rounded-full border-2 border-dashed transition-all ${
                    theme === 'dark' ? 'border-gray-700 hover:border-gray-500 hover:bg-gray-800 text-gray-400' : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50/50 text-gray-500'
                  }`}
                  title="Add Stacked Column"
                >
                  <Plus size={24} />
               </button>
            </div>
          )}
        </div>
      </div>
      
    </div>
  );
}

function EmptySlot({ onSelectType, theme }: { onSelectType: (t: ChartType) => void, theme: string }) {
  return (
    <div className="flex-1 w-full h-full flex flex-col items-center justify-center p-6 bg-transparent gap-4" style={{ minHeight: '600px' }}>
      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
        theme === 'dark' ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'
      }`}>
        <Plus size={24} />
      </div>
      <span className={`font-medium text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Fill Slot</span>
      <select 
        onChange={(e) => onSelectType(e.target.value as ChartType)}
        className={`mt-2 p-2 rounded-md font-semibold text-sm border shadow-sm outline-none ${
          theme === 'dark' ? 'bg-gray-700 border-gray-600 text-gray-200' : 'bg-white border-gray-300 text-gray-700'
        }`}
        value=""
      >
        <option value="" disabled>Select Chart Type...</option>
        <option value="sunpath">Sun Path</option>
        <option value="explorer">Data Explorer</option>
        <option value="utci">UTCI Comfort</option>
        <option value="wind">Wind Explorer</option>
        <option value="windrose">Wind Rose</option>
      </select>
    </div>
  );
}
