import React from 'react';
import { ChartType, ChartConfig, LayoutMode } from '../App';
import { Plus } from 'lucide-react';

interface SingleModeLayoutProps {
  slots: ChartConfig[];
  layoutMode: LayoutMode;
  renderChart: (config: ChartConfig) => React.ReactNode;
  onSelectSlotType: (index: number, type: ChartType) => void;
  exportMode: boolean;
  theme: 'light' | 'dark';
}

function getSlotsPerPage(mode: LayoutMode) {
  if (mode === 'hero-left') return 7;
  if (mode === 'grid-4x2') return 8;
  if (mode === 'focus-deep') return 2;
  return 7;
}

export function SingleModeLayout({
  slots,
  layoutMode,
  renderChart,
  onSelectSlotType,
  exportMode,
  theme
}: SingleModeLayoutProps) {
  const slotsPerPage = getSlotsPerPage(layoutMode);
  const pages = [];
  
  // Create pages, ensuring each page has exactly `slotsPerPage` slots (filling with empties)
  let allSlots = [...slots];
  while (allSlots.length % slotsPerPage !== 0 || allSlots.length === 0) {
    allSlots.push({ id: `empty-${allSlots.length}`, type: 'empty' });
  }

  for (let i = 0; i < allSlots.length; i += slotsPerPage) {
    pages.push(allSlots.slice(i, i + slotsPerPage));
  }

  return (
    <div className="flex flex-col w-full gap-8">
      {pages.map((pageSlots, pageIndex) => (
        <div key={pageIndex} className="w-full relative">
          {layoutMode === 'hero-left' && (
            <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-4 gap-4 w-full" style={{ minHeight: '80vh' }}>
              {pageSlots.map((slot, idx) => {
                const globalIndex = pageIndex * slotsPerPage + idx;
                const isHero = idx === 0;
                let className = "w-full h-full flex flex-col overflow-hidden ";
                if (!exportMode) className += `rounded-xl border shadow-hard-lg ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`;
                if (isHero) className += " md:col-span-1 md:row-span-2";
                else className += " col-span-1";
                
                return (
                  <div key={slot.id || idx} className={className} style={{ contain: 'layout style' }}>
                    {slot.type === 'empty' ? <EmptySlot onSelectType={(type) => onSelectSlotType(globalIndex, type)} theme={theme} /> : renderChart(slot)}
                  </div>
                );
              })}
            </div>
          )}

          {layoutMode === 'grid-4x2' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full" style={{ minHeight: '80vh' }}>
              {pageSlots.map((slot, idx) => {
                const globalIndex = pageIndex * slotsPerPage + idx;
                let className = "w-full h-full flex flex-col overflow-hidden col-span-1 ";
                if (!exportMode) className += `rounded-xl border shadow-hard-lg ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`;
                
                return (
                  <div key={slot.id || idx} className={className} style={{ contain: 'layout style' }}>
                    {slot.type === 'empty' ? <EmptySlot onSelectType={(type) => onSelectSlotType(globalIndex, type)} theme={theme} /> : renderChart(slot)}
                  </div>
                );
              })}
            </div>
          )}

          {layoutMode === 'focus-deep' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full" style={{ minHeight: '80vh' }}>
              {pageSlots.map((slot, idx) => {
                const globalIndex = pageIndex * slotsPerPage + idx;
                let className = "w-full h-full flex flex-col overflow-hidden col-span-1 ";
                if (!exportMode) className += `rounded-xl border shadow-hard-lg ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`;
                
                return (
                  <div key={slot.id || idx} className={className} style={{ contain: 'layout style' }}>
                    {slot.type === 'empty' ? <EmptySlot onSelectType={(type) => onSelectSlotType(globalIndex, type)} theme={theme} /> : renderChart(slot)}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function EmptySlot({ onSelectType, theme }: { onSelectType: (t: ChartType) => void, theme: string }) {
  return (
    <div className="flex-1 w-full h-full flex flex-col items-center justify-center p-6 bg-transparent gap-4">
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
