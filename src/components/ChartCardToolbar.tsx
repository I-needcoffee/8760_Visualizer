import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import type { ChartType } from '../App';
import {
  CHART_TOOLBAR_CONTROLS_CLASS,
  CHART_TOOLBAR_HEADER_PAD,
  CHART_TOOLBAR_ROW_CLASS,
} from '../lib/chartToolbarLayout';
import { ChartTypeMenu } from './ChartTypeMenu';

export function ChartCardToolbarShell({
  theme,
  exportMode,
  border = true,
  children,
}: {
  theme: 'light' | 'dark';
  exportMode?: boolean;
  border?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={`flex flex-col ${exportMode ? '' : border ? 'border-b' : ''} ${
        exportMode ? 'bg-white' : theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-100 bg-white'
      } ${CHART_TOOLBAR_HEADER_PAD}`}
    >
      <div className="flex min-w-0 flex-col">{children}</div>
    </div>
  );
}

export function ChartCardToolbarPrimaryRow({
  children,
  onRemove,
  theme,
  removeRevealClass,
}: {
  children: ReactNode;
  onRemove?: () => void;
  theme: 'light' | 'dark';
  removeRevealClass?: string;
}) {
  return (
    <div className={CHART_TOOLBAR_ROW_CLASS}>
      <div className={CHART_TOOLBAR_CONTROLS_CLASS}>{children}</div>
      {onRemove ? (
        <div className={removeRevealClass ?? 'shrink-0'}>
          <button
            type="button"
            onClick={onRemove}
            className={`inline-flex h-6 w-6 items-center justify-center rounded-full transition-colors ${
              theme === 'dark'
                ? 'text-gray-400 hover:bg-red-900/20 hover:text-red-400'
                : 'text-gray-400 hover:bg-red-50 hover:text-red-500'
            }`}
            title="Remove chart"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function ChartCardToolbarTypeAndVariables({
  chartType,
  chartLabel,
  onChangeType,
  theme,
  disabled,
  tutorialChartTypeId,
  discoverPulse,
  children,
}: {
  chartType: ChartType;
  chartLabel: string;
  onChangeType?: (t: ChartType) => void;
  theme: 'light' | 'dark';
  disabled?: boolean;
  tutorialChartTypeId?: string;
  discoverPulse?: boolean;
  children: ReactNode;
}) {
  return (
    <>
      <ChartTypeMenu
        value={chartType}
        label={chartLabel}
        onChange={t => onChangeType?.(t)}
        theme={theme}
        disabled={disabled ?? !onChangeType}
        display="icon"
        tutorialAnchorId={tutorialChartTypeId}
        discoverPulse={discoverPulse}
      />
      <div className={CHART_TOOLBAR_CONTROLS_CLASS}>{children}</div>
    </>
  );
}

export function ChartCardToolbarSecondaryRow({
  revealClass,
  children,
}: {
  revealClass?: string;
  children: ReactNode;
}) {
  return (
    <div className={revealClass ?? 'pt-1'}>
      <div className="flex min-w-0 flex-wrap items-center gap-1">{children}</div>
    </div>
  );
}
