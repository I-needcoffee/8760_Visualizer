import React, { useState } from 'react';
import { ChartType, ChartConfig } from '../App';
import { GripVertical, Plus } from 'lucide-react';

const SLOT_DRAG_MIME = 'application/x-climate-slot-index';

interface ComparisonModeLayoutProps {
  diffChartConfig: ChartConfig;
  stackedSlots: ChartConfig[];
  renderChart: (config: ChartConfig, forceDiffMode?: boolean, forceStacked?: boolean) => React.ReactNode;
  onSelectSlotType: (index: number, type: ChartType) => void;
  onSwapSlots: (a: number, b: number) => void;
  onAddSlot: () => void;
  exportMode: boolean;
  theme: 'light' | 'dark';
  reorderMode?: boolean;
}

export function ComparisonModeLayout({
  diffChartConfig,
  stackedSlots,
  renderChart,
  onSelectSlotType,
  onSwapSlots,
  onAddSlot,
  exportMode,
  theme,
  reorderMode
}: ComparisonModeLayoutProps) {
  const [dragSource, setDragSource] = useState<number | null>(null);
  const [dropHover, setDropHover] = useState<number | null>(null);

  const onDragStart = (e: React.DragEvent, idx: number) => {
    e.dataTransfer.setData(SLOT_DRAG_MIME, String(idx));
    e.dataTransfer.setData('text/plain', String(idx));
    e.dataTransfer.effectAllowed = 'move';
    setDragSource(idx);
  };

  const onDragEnd = () => {
    setDragSource(null);
    setDropHover(null);
  };

  const onDragOver = (e: React.DragEvent, idx: number) => {
    if (!reorderMode || exportMode) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropHover(idx);
  };

  const onDragLeave = (e: React.DragEvent, idx: number) => {
    const next = e.relatedTarget as Node | null;
    if (next && (e.currentTarget as HTMLElement).contains(next)) return;
    setDropHover(prev => (prev === idx ? null : prev));
  };

  const onDrop = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData(SLOT_DRAG_MIME) || e.dataTransfer.getData('text/plain');
    const from = parseInt(raw, 10);
    if (Number.isFinite(from) && from !== idx) {
      onSwapSlots(from, idx);
    }
    onDragEnd();
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 flex-1 h-full min-h-[85vh]">
      <div
        className={`w-full lg:w-[28%] xl:w-1/4 flex flex-col flex-shrink-0 overflow-visible ${
          exportMode ? 'bg-white' : `rounded-2xl border shadow-hard-xl ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`
        }`}
      >
        {renderChart(diffChartConfig, true, false)}
      </div>

      <div className="flex-1 w-full overflow-x-auto hide-scrollbar pb-4 pt-1">
        <div className="flex flex-nowrap gap-4 h-full items-stretch">
          {stackedSlots.map((slot, idx) => {
            const showHandle = !!reorderMode && !exportMode && slot.type !== 'empty';
            const isDragging = dragSource === idx;
            const isDropTarget = dropHover === idx && dragSource !== null && dragSource !== idx;
            const dragRing = isDropTarget
              ? theme === 'dark'
                ? 'ring-2 ring-blue-400 ring-offset-2 ring-offset-gray-900'
                : 'ring-2 ring-blue-500 ring-offset-2 ring-offset-white'
              : '';

            return (
              <div
                key={slot.id}
                className={`relative w-[350px] sm:w-[400px] flex-shrink-0 flex flex-col overflow-visible ${dragRing} ${
                  isDragging ? 'opacity-45 saturate-0' : ''
                } ${
                  exportMode ? 'bg-white' : `rounded-2xl border shadow-hard-xl ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`
                }`}
                onDragOver={e => onDragOver(e, idx)}
                onDragLeave={e => onDragLeave(e, idx)}
                onDrop={e => onDrop(e, idx)}
              >
                {showHandle && (
                  <div
                    draggable
                    onDragStart={e => onDragStart(e, idx)}
                    onDragEnd={onDragEnd}
                    className={`absolute left-2 top-2 z-30 flex cursor-grab items-center gap-1 rounded-md border px-1.5 py-1 shadow-hard-sm active:cursor-grabbing select-none ${
                      theme === 'dark'
                        ? 'border-gray-600 bg-gray-700/95 text-gray-200 hover:bg-gray-600'
                        : 'border-gray-300 bg-gray-100/95 text-gray-700 hover:bg-gray-200'
                    }`}
                    title="Drag onto another column to swap positions"
                    onClick={e => e.stopPropagation()}
                  >
                    <GripVertical className="w-4 h-4 shrink-0" aria-hidden />
                    <span className="hidden text-[9px] font-bold uppercase tracking-wide sm:inline">Move</span>
                  </div>
                )}
                {slot.type === 'empty' ? (
                  <EmptySlot onSelectType={type => onSelectSlotType(idx, type)} theme={theme} />
                ) : (
                  renderChart(slot, false, true)
                )}
              </div>
            );
          })}

          {!exportMode && (
            <div className="w-[80px] flex-shrink-0 flex items-center justify-center">
              <button
                onClick={onAddSlot}
                className={`w-12 h-12 flex flex-col items-center justify-center rounded-full border-2 border-dashed transition-all ${
                  theme === 'dark'
                    ? 'border-gray-700 hover:border-gray-500 hover:bg-gray-800 text-gray-400'
                    : 'border-gray-300 hover:border-gray-500 hover:bg-gray-100 text-gray-500'
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

function EmptySlot({ onSelectType, theme }: { onSelectType: (t: ChartType) => void; theme: string }) {
  return (
    <div className="flex-1 w-full h-full flex flex-col items-center justify-center p-6 bg-transparent gap-4" style={{ minHeight: '600px' }}>
      <div
        className={`w-12 h-12 rounded-full flex items-center justify-center ${
          theme === 'dark' ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'
        }`}
      >
        <Plus size={24} />
      </div>
      <span className={`font-medium text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Fill Slot</span>
      <select
        onChange={e => onSelectType(e.target.value as ChartType)}
        className={`mt-2 p-2 rounded-md font-semibold text-sm border shadow-sm outline-none ${
          theme === 'dark' ? 'bg-gray-700 border-gray-600 text-gray-200' : 'bg-white border-gray-300 text-gray-700'
        }`}
        value=""
      >
        <option value="" disabled>
          Select Chart Type...
        </option>
        <option value="sunpath">Sun Path</option>
        <option value="explorer">Data Explorer</option>
        <option value="utci">UTCI Comfort</option>
        <option value="wind">Wind Explorer</option>
        <option value="windrose">Wind Rose</option>
      </select>
    </div>
  );
}
