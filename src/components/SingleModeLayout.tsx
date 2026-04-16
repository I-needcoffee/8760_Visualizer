import React, { useState } from 'react';
import { ChartType, ChartConfig, LayoutMode } from '../App';
import { GripVertical, Plus } from 'lucide-react';

const SLOT_DRAG_MIME = 'application/x-climate-slot-index';

interface SingleModeLayoutProps {
  slots: ChartConfig[];
  layoutMode: LayoutMode;
  renderChart: (config: ChartConfig) => React.ReactNode;
  onSelectSlotType: (index: number, type: ChartType) => void;
  onSwapSlots: (a: number, b: number) => void;
  exportMode: boolean;
  theme: 'light' | 'dark';
  reorderMode?: boolean;
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
  onSwapSlots,
  exportMode,
  theme,
  reorderMode
}: SingleModeLayoutProps) {
  const slotsPerPage = getSlotsPerPage(layoutMode);
  const pages = [];
  const [dragSource, setDragSource] = useState<number | null>(null);
  const [dropHover, setDropHover] = useState<number | null>(null);

  const onDragStart = (e: React.DragEvent, globalIndex: number) => {
    e.dataTransfer.setData(SLOT_DRAG_MIME, String(globalIndex));
    e.dataTransfer.setData('text/plain', String(globalIndex));
    e.dataTransfer.effectAllowed = 'move';
    setDragSource(globalIndex);
  };

  const onDragEnd = () => {
    setDragSource(null);
    setDropHover(null);
  };

  const onDragOver = (e: React.DragEvent, globalIndex: number) => {
    if (!reorderMode || exportMode) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropHover(globalIndex);
  };

  const onDragLeave = (e: React.DragEvent, globalIndex: number) => {
    const next = e.relatedTarget as Node | null;
    if (next && (e.currentTarget as HTMLElement).contains(next)) return;
    setDropHover(prev => (prev === globalIndex ? null : prev));
  };

  const onDrop = (e: React.DragEvent, globalIndex: number) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData(SLOT_DRAG_MIME) || e.dataTransfer.getData('text/plain');
    const from = parseInt(raw, 10);
    if (Number.isFinite(from) && from !== globalIndex) {
      onSwapSlots(from, globalIndex);
    }
    onDragEnd();
  };

  let allSlots = [...slots];
  while (allSlots.length % slotsPerPage !== 0 || allSlots.length === 0) {
    allSlots.push({ id: `empty-${allSlots.length}`, type: 'empty' });
  }

  for (let i = 0; i < allSlots.length; i += slotsPerPage) {
    pages.push(allSlots.slice(i, i + slotsPerPage));
  }

  const renderSlotShell = (
    slot: ChartConfig,
    idx: number,
    pageIndex: number,
    pageSlots: ChartConfig[],
    baseClass: string
  ) => {
    const globalIndex = pageIndex * slotsPerPage + idx;
    const showHandle = !!reorderMode && !exportMode && slot.type !== 'empty';
    const isDragging = dragSource === globalIndex;
    const isDropTarget =
      dropHover === globalIndex && dragSource !== null && dragSource !== globalIndex;

    const dragRing = isDropTarget
      ? theme === 'dark'
        ? 'ring-2 ring-blue-400 ring-offset-2 ring-offset-gray-900'
        : 'ring-2 ring-blue-500 ring-offset-2 ring-offset-white'
      : '';

    return (
      <div
        key={slot.id || idx}
        className={`${baseClass} relative ${dragRing} ${isDragging ? 'opacity-45 saturate-0' : ''}`}
        style={{ contain: 'layout style' }}
        onDragOver={e => onDragOver(e, globalIndex)}
        onDragLeave={e => onDragLeave(e, globalIndex)}
        onDrop={e => onDrop(e, globalIndex)}
      >
        {showHandle && (
          <div
            draggable
            onDragStart={e => onDragStart(e, globalIndex)}
            onDragEnd={onDragEnd}
            className={`absolute left-2 top-2 z-30 flex cursor-grab items-center gap-1 rounded-md border px-1.5 py-1 shadow-hard-sm active:cursor-grabbing select-none ${
              theme === 'dark'
                ? 'border-gray-600 bg-gray-700/95 text-gray-200 hover:bg-gray-600'
                : 'border-gray-300 bg-gray-100/95 text-gray-700 hover:bg-gray-200'
            }`}
            title="Drag onto another card to swap positions"
            onClick={e => e.stopPropagation()}
          >
            <GripVertical className="w-4 h-4 shrink-0" aria-hidden />
            <span className="hidden text-[9px] font-bold uppercase tracking-wide sm:inline">Move</span>
          </div>
        )}
        {slot.type === 'empty' ? (
          <EmptySlot onSelectType={type => onSelectSlotType(globalIndex, type)} theme={theme} />
        ) : (
          renderChart(slot)
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col w-full flex-1 min-h-0 gap-3 md:gap-4">
      {pages.map((pageSlots, pageIndex) => (
        <div
          key={pageIndex}
          className={`w-full relative flex flex-col ${pages.length === 1 ? 'flex-1 min-h-0' : ''}`}
        >
          {layoutMode === 'hero-left' && (
            <div className="grid w-full gap-2 flex-1 min-h-0 grid-cols-1 md:grid-cols-[minmax(0,3fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] md:[grid-template-rows:minmax(0,1fr)_minmax(0,1fr)] md:overflow-hidden">
              {pageSlots.map((slot, idx) => {
                const isHero = idx === 0;
                let className = 'w-full min-h-0 h-full flex flex-col overflow-hidden ';
                if (!exportMode) {
                  className += `rounded-xl border shadow-hard-lg ${
                    theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
                  }`;
                }
                if (isHero) className += ' md:col-span-1 md:row-span-2';
                else className += ' md:col-span-1';
                return renderSlotShell(slot, idx, pageIndex, pageSlots, className);
              })}
            </div>
          )}

          {layoutMode === 'grid-4x2' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 w-full flex-1 min-h-0 md:[grid-template-rows:minmax(0,1fr)_minmax(0,1fr)] md:overflow-hidden">
              {pageSlots.map((slot, idx) => {
                let className = 'w-full min-h-0 h-full flex flex-col overflow-hidden col-span-1 ';
                if (!exportMode) {
                  className += `rounded-xl border shadow-hard-lg ${
                    theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
                  }`;
                }
                return renderSlotShell(slot, idx, pageIndex, pageSlots, className);
              })}
            </div>
          )}

          {layoutMode === 'focus-deep' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 w-full flex-1 min-h-0 md:overflow-hidden">
              {pageSlots.map((slot, idx) => {
                let className = 'w-full min-h-0 h-full flex flex-col overflow-hidden col-span-1 ';
                if (!exportMode) {
                  className += `rounded-xl border shadow-hard-lg ${
                    theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
                  }`;
                }
                return renderSlotShell(slot, idx, pageIndex, pageSlots, className);
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function EmptySlot({ onSelectType, theme }: { onSelectType: (t: ChartType) => void; theme: string }) {
  return (
    <div className="flex-1 w-full h-full flex flex-col items-center justify-center p-6 bg-transparent gap-4">
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
