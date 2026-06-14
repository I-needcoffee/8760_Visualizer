/** Cell overlay number formatting for 8760 upload charts. */

export type CellFormatSuffix = 'none' | 'percent' | 'degree';

export interface CellFormatOptions {
  /** Decimal places shown on month/week heatmap cell labels (0–3). */
  decimalPlaces: number;
  suffix: CellFormatSuffix;
  /** When suffix is %, multiply the value by 100 before formatting. */
  percentScale100: boolean;
}

export const DEFAULT_CELL_FORMAT: CellFormatOptions = {
  decimalPlaces: 1,
  suffix: 'none',
  percentScale100: false,
};

export function formatCellValue(value: number, options: CellFormatOptions): string {
  if (!Number.isFinite(value)) return '—';

  const dp = Math.max(0, Math.min(3, Math.round(options.decimalPlaces)));

  if (options.suffix === 'percent') {
    const n = options.percentScale100 ? value * 100 : value;
    const formatted = dp === 0 ? String(Math.round(n)) : n.toFixed(dp);
    return `${formatted}%`;
  }

  const formatted = dp === 0 ? String(Math.round(value)) : value.toFixed(dp);

  if (options.suffix === 'degree') {
    return `${formatted}\u00B0`;
  }

  return formatted;
}

export function createCellValueFormatter(options: CellFormatOptions): (value: number) => string {
  return (value: number) => formatCellValue(value, options);
}

export function cellFormatPreview(options: CellFormatOptions): string {
  return formatCellValue(0.23456, options);
}
