import { useState } from 'react';
import { X, Calendar, Clock, Palette, Sun, Moon, Settings, Filter, Thermometer } from 'lucide-react';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';
import type { GlobalFilterState } from '../lib/globalFilter';
import type { UnitSystem } from '../App';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  filter: GlobalFilterState;
  onChangeFilter: (filter: GlobalFilterState) => void;
  unitSystem: UnitSystem;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  heatmapTextColor: string;
  setHeatmapTextColor: (color: string) => void;
  setShowGradientModal: (show: boolean) => void;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function SettingsModal({
  isOpen,
  onClose,
  filter,
  onChangeFilter,
  unitSystem,
  theme,
  setTheme,
  heatmapTextColor,
  setHeatmapTextColor,
  setShowGradientModal
}: SettingsModalProps) {
  if (!isOpen) return null;

  const getGrayscaleValue = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16);
    return Math.round((r / 255) * 100);
  };

  const setGrayscaleValue = (val: number) => {
    const gray = Math.round((val / 100) * 255);
    const hex = `#${gray.toString(16).padStart(2, '0').repeat(3)}`;
    setHeatmapTextColor(hex);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-2">
      <div className={`rounded-xl shadow-xl max-w-md w-full max-h-[min(90vh,560px)] overflow-y-auto border ${theme === 'dark' ? 'bg-gray-800 text-white border-gray-700' : 'bg-white text-gray-900 border-gray-200'}`}>
        <div className={`flex items-center justify-between p-2 border-b sticky top-0 z-10 ${theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Settings className="w-4 h-4 text-gray-900 dark:text-gray-100" />
            <span>Settings</span>
          </div>
          <button type="button" onClick={onClose} className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full p-0 transition-colors ${theme === 'dark' ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3 space-y-4">
          {/* Time Filters */}
          <div className="space-y-4">
            <h3 className="font-semibold text-xs border-b pb-1.5 flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-gray-900 dark:text-gray-100" />
              Global time filters
            </h3>
            
            {/* Month Filter */}
            <div className="space-y-3">
              <div className="flex items-center justify-between font-medium text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-900 dark:text-gray-100" />
                  <span>Months</span>
                </div>
                <span className={`rounded-full border px-2 py-0.5 font-mono text-xs ${theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-100'}`}>
                  {filter.startMonth <= filter.endMonth 
                    ? `${MONTHS[filter.startMonth - 1]} - ${MONTHS[filter.endMonth - 1]}`
                    : `${MONTHS[filter.startMonth - 1]} - ${MONTHS[filter.endMonth - 1]} (Wrap)`}
                </span>
              </div>
              <div className="px-2">
                <Slider 
                  range 
                  min={1} 
                  max={12} 
                  value={[filter.startMonth, filter.endMonth]} 
                  onChange={(val) => {
                    if (Array.isArray(val)) {
                      onChangeFilter({ ...filter, startMonth: val[0], endMonth: val[1] });
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
              <div className="flex flex-wrap gap-2">
                {[
                  { label: 'Spring', range: [3, 5] },
                  { label: 'Summer', range: [6, 8] },
                  { label: 'Fall', range: [9, 11] },
                  { label: 'Winter', range: [12, 2] },
                  { label: 'Annual', range: [1, 12] }
                ].map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => onChangeFilter({ ...filter, startMonth: preset.range[0], endMonth: preset.range[1] })}
                    className={`text-xs font-medium rounded-full transition-colors border px-3 py-1.5 ${
                      filter.startMonth === preset.range[0] && filter.endMonth === preset.range[1]
                        ? (theme === 'dark' ? 'bg-gray-600 text-gray-100 border-gray-500' : 'bg-gray-200 text-gray-900 border-gray-400')
                        : (theme === 'dark' ? 'bg-transparent text-gray-400 border-gray-700 hover:bg-gray-700' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50')
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Hour Filter */}
            <div className="space-y-3">
              <div className="flex items-center justify-between font-medium text-sm">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-900 dark:text-gray-100" />
                  <span>Hours</span>
                </div>
                <span className={`rounded-full border px-2 py-0.5 font-mono text-xs ${theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-100'}`}>
                  {filter.startHour.toString().padStart(2, '0')}:00 - {filter.endHour.toString().padStart(2, '0')}:59
                </span>
              </div>
              <div className="px-2">
                <Slider 
                  range 
                  min={0} 
                  max={23} 
                  value={[filter.startHour, filter.endHour]} 
                  onChange={(val) => {
                    if (Array.isArray(val)) {
                      onChangeFilter({ ...filter, startHour: val[0], endHour: val[1] });
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
              <div className="flex flex-wrap gap-2">
                {[
                  { label: '7am - 7pm', range: [7, 19] },
                  { label: 'Morning (7-11)', range: [7, 11] },
                  { label: 'Midday (11-3)', range: [11, 15] },
                  { label: 'Afternoon (4-7)', range: [16, 19] },
                  { label: 'All Day', range: [0, 23] }
                ].map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => onChangeFilter({ ...filter, startHour: preset.range[0], endHour: preset.range[1] })}
                    className={`text-xs font-medium rounded-full transition-colors border px-3 py-1.5 ${
                      filter.startHour === preset.range[0] && filter.endHour === preset.range[1]
                        ? (theme === 'dark' ? 'bg-gray-600 text-gray-100 border-gray-500' : 'bg-gray-200 text-gray-900 border-gray-400')
                        : (theme === 'dark' ? 'bg-transparent text-gray-400 border-gray-700 hover:bg-gray-700' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50')
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Dry-bulb filter (stored in °C; inputs follow unit toggle) */}
          <div className={`space-y-3 border-t pt-4 ${theme === 'dark' ? 'border-gray-700' : 'border-gray-100'}`}>
            <div className="flex items-center justify-between font-medium text-sm">
              <div className="flex items-center gap-2">
                <Thermometer className="w-4 h-4 text-gray-900 dark:text-gray-100" />
                <span>Temperature isolation</span>
              </div>
              <span className={`rounded-full border px-2 py-0.5 text-xs capitalize ${theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-100'}`}>
                {filter.temperatureMode === 'off' ? 'Off' : filter.temperatureMode}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ['off', 'Off'],
                  ['above', 'Above'],
                  ['below', 'Below'],
                  ['between', 'Between'],
                ] as const
              ).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => onChangeFilter({ ...filter, temperatureMode: mode })}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    filter.temperatureMode === mode
                      ? theme === 'dark'
                        ? 'border-gray-500 bg-gray-600 text-gray-100'
                        : 'border-gray-400 bg-gray-200 text-gray-900'
                      : theme === 'dark'
                        ? 'border-gray-700 text-gray-400 hover:bg-gray-700'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {filter.temperatureMode !== 'off' && (
              <div className={`flex flex-wrap items-end gap-3 text-xs ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                {(filter.temperatureMode === 'above' || filter.temperatureMode === 'between') && (
                  <label className="flex flex-col gap-1">
                    <span>{filter.temperatureMode === 'between' ? 'Minimum (≥)' : 'Floor (≥)'}</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step="0.5"
                        value={
                          Math.round(
                            (unitSystem === 'imperial' ? filter.temperatureLoC * (9 / 5) + 32 : filter.temperatureLoC) * 10
                          ) / 10
                        }
                        onChange={e => {
                          const parsed = Number(e.target.value);
                          if (!Number.isFinite(parsed)) return;
                          const nextC =
                            unitSystem === 'imperial' ? ((parsed - 32) * 5) / 9 : parsed;
                          onChangeFilter({ ...filter, temperatureLoC: nextC });
                        }}
                        className={`w-24 rounded-lg border px-2 py-1 font-mono text-sm outline-none ${theme === 'dark' ? 'border-gray-600 bg-gray-900/80 text-gray-100' : 'border-gray-200 bg-white'}`}
                      />
                      <span className="tabular-nums opacity-75">{unitSystem === 'imperial' ? '°F' : '°C'}</span>
                    </div>
                  </label>
                )}
                {(filter.temperatureMode === 'below' || filter.temperatureMode === 'between') && (
                  <label className="flex flex-col gap-1">
                    <span>{filter.temperatureMode === 'between' ? 'Maximum (≤)' : 'Ceiling (≤)'}</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step="0.5"
                        value={
                          Math.round(
                            (unitSystem === 'imperial' ? filter.temperatureHiC * (9 / 5) + 32 : filter.temperatureHiC) *
                              10
                          ) / 10
                        }
                        onChange={e => {
                          const parsed = Number(e.target.value);
                          if (!Number.isFinite(parsed)) return;
                          const nextC =
                            unitSystem === 'imperial' ? ((parsed - 32) * 5) / 9 : parsed;
                          onChangeFilter({ ...filter, temperatureHiC: nextC });
                        }}
                        className={`w-24 rounded-lg border px-2 py-1 font-mono text-sm outline-none ${theme === 'dark' ? 'border-gray-600 bg-gray-900/80 text-gray-100' : 'border-gray-200 bg-white'}`}
                      />
                      <span className="tabular-nums opacity-75">{unitSystem === 'imperial' ? '°F' : '°C'}</span>
                    </div>
                  </label>
                )}
              </div>
            )}
            <p className={`text-[11px] leading-snug opacity-85 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              Uses EPW dry-bulb °C internally. Applies together with months and hour filters row-by-row across charts.
            </p>
          </div>

          {/* Graphics Adjustments */}
          <div className="space-y-4">
            <h3 className="font-semibold text-xs border-b pb-1.5 flex items-center gap-2">
              <Palette className="w-3.5 h-3.5 text-gray-900 dark:text-gray-100" />
              Graphics adjustments
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Theme Toggle */}
              <div className="space-y-3">
                <span className="font-medium text-sm">Interface Theme</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setTheme('light');
                      setHeatmapTextColor('#000000');
                    }}
                    className={`flex-1 flex items-center justify-center gap-2 rounded-full font-medium transition-colors border text-sm p-2 ${theme === 'light' ? 'bg-gray-200 text-gray-900 border-gray-400 shadow-sm' : 'bg-transparent text-gray-400 border-gray-700 hover:bg-gray-700'}`}
                  >
                    <Sun className="w-4 h-4" />
                    Light
                  </button>
                  <button
                    onClick={() => {
                      setTheme('dark');
                      setHeatmapTextColor('#ffffff');
                    }}
                    className={`flex-1 flex items-center justify-center gap-2 rounded-full font-medium transition-colors border text-sm p-2 ${theme === 'dark' ? 'bg-gray-600 text-gray-100 border-gray-500 shadow-sm' : 'bg-transparent text-gray-500 border-gray-200 hover:bg-gray-50'}`}
                  >
                    <Moon className="w-4 h-4" />
                    Dark
                  </button>
                </div>
              </div>

              {/* Text Color Slider */}
              <div className="space-y-3">
                <div className="flex items-center justify-between font-medium text-sm">
                  <span>Chart Text Color</span>
                  <div className="flex items-center gap-2">
                    <div 
                      className={`h-3 w-3 rounded-full border ${theme === 'dark' ? 'border-gray-600' : 'border-gray-200'}`} 
                      style={{ backgroundColor: heatmapTextColor }}
                    />
                    <span className={`rounded-full border px-2 py-0.5 font-mono text-xs ${theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-100'}`}>
                      {heatmapTextColor.toUpperCase()}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3 px-2">
                  <span className={`font-bold uppercase tracking-wider text-[10px] ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>Black</span>
                  <div className="flex-1">
                    <Slider 
                      min={0} 
                      max={100} 
                      value={getGrayscaleValue(heatmapTextColor)} 
                      onChange={(val) => {
                        if (typeof val === 'number') {
                          setGrayscaleValue(val);
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
                      ]}
                      railStyle={{ background: 'linear-gradient(to right, #000, #fff)', height: '4px' }}
                    />
                  </div>
                  <span className={`font-bold uppercase tracking-wider text-[10px] ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>White</span>
                </div>
              </div>

              {/* Color Palettes */}
              <div className="space-y-3 sm:col-span-2">
                <span className="font-medium text-sm">Color Palettes</span>
                <button
                  onClick={() => {
                    onClose();
                    setShowGradientModal(true);
                  }}
                  className={`flex items-center justify-center gap-1.5 w-full rounded-full font-medium transition-colors border text-sm p-2 ${theme === 'dark' ? 'border-gray-600 bg-gray-700 text-gray-100 hover:bg-gray-600' : 'border-gray-300 bg-gray-100 text-gray-900 hover:bg-gray-200'}`}
                >
                  <Palette className="w-4 h-4" />
                  Create New Gradient
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
