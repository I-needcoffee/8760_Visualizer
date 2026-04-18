import React, { useRef, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { BarChart2, Compass, GripVertical, Sun, ThermometerSun, Wind } from 'lucide-react';
import { ChartType, ChartConfig, LayoutMode, UnitSystem } from '../App';
import type { EPWDataRow } from '../lib/epwParser';
import type { GlobalFilterState } from './GlobalFilterPanel';
import { TutorialCardChromeHints } from './tutorial/TutorialCardChromeHints';
import { TutorialGuidePanel } from './tutorial/TutorialGuidePanel';

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
  /** Guided layout: EPW rows for the tutorial side panel quick stats. */
  tutorialEpwRows?: EPWDataRow[];
  tutorialFilter?: GlobalFilterState;
  tutorialUnitSystem?: UnitSystem;
}

function getSlotsPerPage(mode: LayoutMode) {
  if (mode === 'tutorial') return 1;
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
  reorderMode,
  tutorialEpwRows,
  tutorialFilter,
  tutorialUnitSystem,
}: SingleModeLayoutProps) {
  const tutorialColRef = useRef<HTMLDivElement>(null);
  /** Chart + guide grid only (excludes `TutorialCardChromeHints`) so ResizeObserver does not watch the hints strip. */
  const tutorialChromeObserveRef = useRef<HTMLDivElement>(null);
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

  let allSlots: ChartConfig[];
  if (layoutMode === 'tutorial') {
    allSlots = [slots[0] ?? { id: 'empty-0', type: 'empty' }];
  } else {
    allSlots = [...slots];
    while (allSlots.length % slotsPerPage !== 0 || allSlots.length === 0) {
      allSlots.push({ id: `empty-${allSlots.length}`, type: 'empty' });
    }
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
    const reorderChrome = !!reorderMode && !exportMode;
    const showHandle = reorderChrome && slot.type !== 'empty';
    const isDragging = dragSource === globalIndex;
    const isDropTarget =
      dropHover === globalIndex && dragSource !== null && dragSource !== globalIndex;

    const dragRing = isDropTarget
      ? theme === 'dark'
        ? 'ring-[3px] ring-sky-400 ring-offset-2 ring-offset-gray-900'
        : 'ring-[3px] ring-sky-500 ring-offset-2 ring-offset-white'
      : '';

    const chartReorderDim =
      reorderChrome && slot.type !== 'empty'
        ? `grayscale contrast-[0.94] ${isDragging ? 'opacity-45' : 'opacity-[0.9]'} transition-[filter,opacity] duration-200`
        : '';

    return (
      <div
        key={slot.id || idx}
        className={`${baseClass} relative ${dragRing} ${slot.type === 'empty' ? '!overflow-visible' : ''}`}
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
            className={`absolute left-1/2 top-1/2 z-[45] flex -translate-x-1/2 -translate-y-1/2 cursor-grab items-center gap-2 rounded-full border px-3.5 py-1.5 shadow-sm active:cursor-grabbing select-none ${
              theme === 'dark'
                ? 'border-blue-900/50 bg-blue-900/55 text-blue-300 hover:bg-blue-900/75'
                : 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'
            }`}
            title="Drag this handle onto another card to swap positions"
            onClick={e => e.stopPropagation()}
          >
            <GripVertical className="h-5 w-5 shrink-0" aria-hidden />
            <span className="text-[10px] font-bold uppercase tracking-wide">Move</span>
          </div>
        )}
        {slot.type === 'empty' ? (
          <div className={reorderChrome ? 'grayscale opacity-80 transition-[filter,opacity] duration-200' : ''}>
            <EmptySlot onSelectType={type => onSelectSlotType(globalIndex, type)} theme={theme} />
          </div>
        ) : (
          <div className={`min-h-0 flex-1 flex flex-col overflow-hidden ${chartReorderDim}`}>{renderChart(slot)}</div>
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
          {layoutMode === 'tutorial' && (
            <div ref={tutorialColRef} className="flex w-full flex-1 min-h-0 flex-col gap-2 md:min-h-0 md:overflow-hidden">
              <TutorialCardChromeHints
                theme={theme}
                chartType={pageSlots[0]?.type ?? 'empty'}
                measureRootRef={tutorialChromeObserveRef}
              />
              <div
                ref={tutorialChromeObserveRef}
                className="grid min-h-0 flex-1 grid-cols-1 gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:gap-4 md:overflow-hidden"
              >
                {(() => {
                  const slot = pageSlots[0];
                  let className =
                    'flex h-full min-h-[46vh] w-full flex-col overflow-hidden md:min-h-0 md:min-h-0 ';
                  if (!exportMode) {
                    className += `rounded-xl border shadow-hard-lg ${
                      theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
                    }`;
                  }
                  return (
                    <>
                      {renderSlotShell(slot, 0, pageIndex, pageSlots, className)}
                      <TutorialGuidePanel
                        theme={theme}
                        slot={slot}
                        epwRows={tutorialEpwRows}
                        filter={tutorialFilter ?? { startMonth: 1, endMonth: 12, startHour: 0, endHour: 23 }}
                        unitSystem={tutorialUnitSystem ?? 'metric'}
                      />
                    </>
                  );
                })()}
              </div>
            </div>
          )}

          {layoutMode === 'hero-left' && (
            // Primary column share must match tutorial mode (2fr chart + 3fr guide → 2/5) so the hero card width is unchanged when switching layouts.
            <div className="grid w-full gap-2 flex-1 min-h-0 grid-cols-1 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] md:[grid-template-rows:minmax(0,1fr)_minmax(0,1fr)] md:overflow-hidden">
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

const EMPTY_SLOT_CHOICES: { type: ChartType; label: string; Icon: LucideIcon }[] = [
  { type: 'sunpath', label: 'Sun Path', Icon: Sun },
  { type: 'explorer', label: 'Data Explorer', Icon: BarChart2 },
  { type: 'utci', label: 'UTCI Comfort', Icon: ThermometerSun },
  { type: 'wind', label: 'Wind Explorer', Icon: Wind },
  { type: 'windrose', label: 'Wind Rose', Icon: Compass },
];

function EmptySlot({ onSelectType, theme }: { onSelectType: (t: ChartType) => void; theme: 'light' | 'dark' }) {
  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col px-2 py-1.5 sm:px-2.5 sm:py-2">
      <div
        className={`flex min-h-0 flex-1 flex-col items-center justify-center rounded-xl border-2 border-dashed px-3 py-5 sm:px-4 sm:py-6 ${
          theme === 'dark'
            ? 'border-gray-600 bg-gray-900/20'
            : 'border-gray-300 bg-gray-50/40'
        }`}
      >
        <div className="flex max-w-full flex-wrap items-center justify-center gap-3 sm:gap-4">
          {EMPTY_SLOT_CHOICES.map(({ type, label, Icon }) => (
            <button
              key={type}
              type="button"
              onClick={() => onSelectType(type)}
              aria-label={label}
              title={label}
              className={`group relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border shadow-sm transition-all active:scale-95 sm:h-12 sm:w-12 ${
                theme === 'dark'
                  ? 'border-gray-600 bg-gray-800 text-gray-200 hover:border-gray-500 hover:bg-gray-700 hover:text-white'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Icon className="h-5 w-5 sm:h-[22px] sm:w-[22px]" strokeWidth={2} aria-hidden />
              <span
                className={`pointer-events-none absolute left-1/2 top-full z-20 mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-full px-2 py-1 text-[10px] font-semibold opacity-0 shadow-md transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100 ${
                  theme === 'dark'
                    ? 'bg-gray-100 text-gray-900 ring-1 ring-gray-700/30'
                    : 'bg-gray-900 text-white ring-1 ring-black/10'
                }`}
                role="tooltip"
              >
                {label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
