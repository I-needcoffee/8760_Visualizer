export type WindFileSource = 'epw' | 'iem';

/** Shared between Wind Explorer and Wind Rose (compare layout lifts one instance). */
export interface CompareWindIemSharedControls {
  source: WindFileSource;
  setSource: (v: WindFileSource) => void;
  /** Inclusive calendar-year range of IEM ASOS archives merged into the EPW timeline (vector-mean by hour). */
  iemYearStart: number;
  iemYearEnd: number;
  setIemYearRange: (start: number, end: number) => void;
}
