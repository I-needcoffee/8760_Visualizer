import type { WindFileSource } from '../lib/iem/windIemPrefsShared';

export type SiteFooterWindControlsProps = {
  visible: boolean;
  source: WindFileSource;
  yearStart: number;
  yearEnd: number;
  onSelectTmy: () => void;
  onSelectAsos: () => void;
  onConfigureYears: () => void;
};

export function windYearRangeShort(start: number, end: number): string {
  return start === end ? `${start}` : `${start}–${end}`;
}
