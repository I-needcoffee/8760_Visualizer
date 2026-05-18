import type { ReactNode } from 'react';
import {
  CHART_TOOLBAR_CONTROLS_CLASS,
  CHART_TOOLBAR_ROW_CLASS,
  chartToolbarTitleClass,
} from '../lib/chartToolbarLayout';

/** UTCI / Wind rose primary row: [icon + title area] | trailing actions */
export function ChartToolbarRow({
  children,
  className = '',
  relative = false,
}: {
  children: ReactNode;
  className?: string;
  relative?: boolean;
}) {
  return (
    <div className={`${relative ? 'relative ' : ''}${CHART_TOOLBAR_ROW_CLASS} w-full ${className}`.trim()}>
      {children}
    </div>
  );
}

export function ChartToolbarControls({ children }: { children: ReactNode }) {
  return <div className={CHART_TOOLBAR_CONTROLS_CLASS}>{children}</div>;
}

/** Static title line beside the chart-type icon. */
export function ChartToolbarTitle({
  theme,
  children,
  id,
  title,
}: {
  theme: 'light' | 'dark';
  children: ReactNode;
  id?: string;
  title?: string;
}) {
  return (
    <span id={id} className={chartToolbarTitleClass(theme)} title={title}>
      {children}
    </span>
  );
}
