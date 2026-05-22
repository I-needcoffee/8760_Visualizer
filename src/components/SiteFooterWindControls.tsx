import type { WindFileSource } from '../lib/iem/windIemPrefsShared';

export type SiteFooterWindControlsProps = {
  visible: boolean;
  source: WindFileSource;
  yearStart: number;
  yearEnd: number;
  /** Short label when mesonet station is active, e.g. "ASOS DSM". */
  stationLabel?: string | null;
  onSelectTmy: () => void;
  onSelectStation: () => void;
  onConfigureYears: () => void;
  onChangeStation: () => void;
};

export function windYearRangeShort(start: number, end: number): string {
  return start === end ? `${start}` : `${start}–${end}`;
}
