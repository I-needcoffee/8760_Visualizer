import type { IemWindStationSelection } from './windStationTypes';

export type WindFileSource = 'epw' | 'iem';

/** Shared between Wind Explorer and Wind Rose (compare layout lifts one instance). */
export interface CompareWindIemSharedControls {
  source: WindFileSource;
  setSource: (v: WindFileSource) => void;
  /** Inclusive calendar-year range of IEM archives merged into the EPW timeline (vector-mean by hour). */
  iemYearStart: number;
  iemYearEnd: number;
  setIemYearRange: (start: number, end: number) => void;
  /** User-selected ASOS or RWIS station; when null, nearest ASOS is resolved on fetch. */
  iemStation: IemWindStationSelection | null;
  setIemStation: (station: IemWindStationSelection | null) => void;
}
