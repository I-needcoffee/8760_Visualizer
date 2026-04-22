import { useState } from 'react';
import { Calendar, Clock, ChevronDown, ChevronUp, Filter, Palette } from 'lucide-react';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';

export interface GlobalFilterState {
  startMonth: number; // 1-12
  endMonth: number; // 1-12
  startHour: number; // 0-23
  endHour: number; // 0-23
}

interface GlobalFilterPanelProps {
  filter: GlobalFilterState;
  onChange: (filter: GlobalFilterState) => void;
  theme: 'light' | 'dark';
  uiScale: number;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function GlobalFilterPanel({ filter, onChange, theme }: GlobalFilterPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className={`z-10 mx-4 mt-2 overflow-hidden rounded-b-2xl border-x border-t border-b shadow-sm transition-[background-color,border-color,box-shadow] duration-200 ease-out ${theme === 'dark' ? 'border-gray-700 bg-gray-800 shadow-[0_1px_0_0_rgba(0,0,0,0.35)]' : 'border-gray-200 bg-white'}`}>
      <div 
        className={`flex cursor-pointer items-center justify-between transition-colors duration-200 ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}
        onClick={() => setIsCollapsed(!isCollapsed)}
        style={{ padding: '8px 16px' }}
      >
        <div className={`flex items-center gap-2 font-semibold ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`} style={{ fontSize: '14px' }}>
          <Filter className="w-4 h-4 text-gray-900 dark:text-gray-100" style={{ width: '16px', height: '16px' }} />
          <span>Global Time Filters</span>
          <span className={`font-normal ml-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} style={{ fontSize: '12px' }}>
            {filter.startMonth <= filter.endMonth 
              ? `${MONTHS[filter.startMonth - 1]} - ${MONTHS[filter.endMonth - 1]}`
              : `${MONTHS[filter.startMonth - 1]} - ${MONTHS[filter.endMonth - 1]} (Over Year)`} 
            | {filter.startHour.toString().padStart(2, '0')}:00 - {filter.endHour.toString().padStart(2, '0')}:59
          </span>
        </div>
        {isCollapsed ? <ChevronDown className={`w-4 h-4 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} style={{ width: '16px', height: '16px' }} /> : <ChevronUp className={`w-4 h-4 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} style={{ width: '16px', height: '16px' }} />}
      </div>

      {!isCollapsed && (
        <div className={`flex flex-col border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-100'}`} style={{ padding: '16px', gap: '24px' }}>
          <div className="flex flex-col lg:flex-row gap-8" style={{ gap: '32px' }}>
            {/* Month Filter */}
            <div className="flex flex-col gap-3 flex-1" style={{ gap: '12px' }}>
              <div className={`flex items-center justify-between font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-900 dark:text-gray-100" style={{ width: '16px', height: '16px' }} />
                  <span className="font-semibold" style={{ fontSize: '14px' }}>Months</span>
                </div>
                <span className={`font-mono px-2 py-0.5 rounded-full font-medium border ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-gray-300' : 'bg-gray-50 border-gray-100 text-gray-500'}`} style={{ fontSize: '12px' }}>
                  {filter.startMonth <= filter.endMonth 
                    ? `${MONTHS[filter.startMonth - 1]} - ${MONTHS[filter.endMonth - 1]}`
                    : `${MONTHS[filter.startMonth - 1]} - ${MONTHS[filter.endMonth - 1]} (Wrap)`}
                </span>
              </div>
              <div className="flex items-center gap-2 px-2 py-2">
                <Slider 
                  range 
                  min={1} 
                  max={12} 
                  value={[filter.startMonth, filter.endMonth]} 
                  onChange={(val) => {
                    if (Array.isArray(val)) {
                      onChange({ ...filter, startMonth: val[0], endMonth: val[1] });
                    }
                  }}
                  trackStyle={[{ backgroundColor: theme === 'dark' ? '#9ca3af' : '#525252', height: '4px' }]}
                  handleStyle={[
                    {
                      borderColor: theme === 'dark' ? '#9ca3af' : '#525252',
                      backgroundColor: 'white',
                      opacity: 1,
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                      width: '14px',
                      height: '14px',
                      marginTop: '-5px',
                    },
                    {
                      borderColor: theme === 'dark' ? '#9ca3af' : '#525252',
                      backgroundColor: 'white',
                      opacity: 1,
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                      width: '14px',
                      height: '14px',
                      marginTop: '-5px',
                    },
                  ]}
                  railStyle={{ backgroundColor: theme === 'dark' ? '#374151' : '#f3f4f6', height: '4px' }}
                />
              </div>
              <div className="flex flex-wrap gap-1.5 mt-1" style={{ gap: '6px' }}>
                {[
                  { label: 'Spring', range: [3, 5] },
                  { label: 'Summer', range: [6, 8] },
                  { label: 'Fall', range: [9, 11] },
                  { label: 'Winter', range: [12, 2] },
                  { label: 'Annual', range: [1, 12] }
                ].map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => onChange({ ...filter, startMonth: preset.range[0], endMonth: preset.range[1] })}
                    className={`font-medium rounded-full transition-colors border shadow-hard-sm ${
                      filter.startMonth === preset.range[0] && filter.endMonth === preset.range[1]
                        ? (theme === 'dark' ? 'bg-gray-600 text-gray-100 border-gray-500' : 'bg-gray-200 text-gray-900 border-gray-400')
                        : (theme === 'dark' ? 'bg-transparent text-gray-400 border-gray-700 hover:bg-gray-700' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50')
                    }`}
                    style={{ fontSize: '12px', padding: '6px 12px' }}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div className={`hidden lg:block w-px h-auto ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'}`}></div>

            {/* Hour Filter */}
            <div className="flex flex-col gap-3 flex-1" style={{ gap: '12px' }}>
              <div className={`flex items-center justify-between font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-900 dark:text-gray-100" style={{ width: '16px', height: '16px' }} />
                  <span className="font-semibold" style={{ fontSize: '14px' }}>Hours</span>
                </div>
                <span className={`font-mono px-2 py-0.5 rounded-full font-medium border ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-gray-300' : 'bg-gray-50 border-gray-100 text-gray-500'}`} style={{ fontSize: '12px' }}>
                  {filter.startHour.toString().padStart(2, '0')}:00 - {filter.endHour.toString().padStart(2, '0')}:59
                </span>
              </div>
              <div className="flex items-center gap-2 px-2 py-2">
                <Slider 
                  range 
                  min={0} 
                  max={23} 
                  value={[filter.startHour, filter.endHour]} 
                  onChange={(val) => {
                    if (Array.isArray(val)) {
                      onChange({ ...filter, startHour: val[0], endHour: val[1] });
                    }
                  }}
                  trackStyle={[{ backgroundColor: theme === 'dark' ? '#9ca3af' : '#525252', height: '4px' }]}
                  handleStyle={[
                    {
                      borderColor: theme === 'dark' ? '#9ca3af' : '#525252',
                      backgroundColor: 'white',
                      opacity: 1,
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                      width: '14px',
                      height: '14px',
                      marginTop: '-5px',
                    },
                    {
                      borderColor: theme === 'dark' ? '#9ca3af' : '#525252',
                      backgroundColor: 'white',
                      opacity: 1,
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                      width: '14px',
                      height: '14px',
                      marginTop: '-5px',
                    },
                  ]}
                  railStyle={{ backgroundColor: theme === 'dark' ? '#374151' : '#f3f4f6', height: '4px' }}
                />
              </div>
              <div className="flex flex-wrap gap-1.5 mt-1" style={{ gap: '6px' }}>
                {[
                  { label: '7am - 7pm', range: [7, 19] },
                  { label: 'Morning (7-11)', range: [7, 11] },
                  { label: 'Midday (11-3)', range: [11, 15] },
                  { label: 'Afternoon (4-7)', range: [16, 19] },
                  { label: 'All Day', range: [0, 23] }
                ].map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => onChange({ ...filter, startHour: preset.range[0], endHour: preset.range[1] })}
                    className={`font-medium rounded-full transition-colors border shadow-hard-sm ${
                      filter.startHour === preset.range[0] && filter.endHour === preset.range[1]
                        ? (theme === 'dark' ? 'bg-gray-600 text-gray-100 border-gray-500' : 'bg-gray-200 text-gray-900 border-gray-400')
                        : (theme === 'dark' ? 'bg-transparent text-gray-400 border-gray-700 hover:bg-gray-700' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50')
                    }`}
                    style={{ fontSize: '12px', padding: '6px 12px' }}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
