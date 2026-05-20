import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type TutorialUtciMode = 'categories' | 'comfortTime' | 'gradient';

export interface TutorialLiveSnapshot {
  aggregation?: 'hour' | 'day' | 'week' | 'month';
  colorVarId?: string;
  colorVarName?: string;
  utciColorMode?: TutorialUtciMode;
  includeSun?: boolean;
  includeWind?: boolean;
  /** Guided comfort table: period row id to highlight on the UTCI heatmap/bars. */
  utciFocusPeriodId?: string | null;
  windRoseBins?: number;
  radiusVarId?: string;
  radiusVarName?: string;
}

type Ctx = {
  enabled: boolean;
  snapshot: TutorialLiveSnapshot;
  report: (p: Partial<TutorialLiveSnapshot>) => void;
  /** Guided UTCI panel: apply exposure + timeframe focus on the chart card. */
  requestUtciSelection: (selection: {
    periodId: string;
    includeSun: boolean;
    includeWind: boolean;
  }) => void;
  /** Remove period highlight on the UTCI 12×24 heatmap (keeps sun/wind toggles). */
  clearUtciFocus: () => void;
  clear: () => void;
};

const TutorialLiveContext = createContext<Ctx | null>(null);

function snapshotPatchUnchanged(prev: TutorialLiveSnapshot, p: Partial<TutorialLiveSnapshot>): boolean {
  for (const key of Object.keys(p) as (keyof TutorialLiveSnapshot)[]) {
    if (prev[key] !== p[key]) return false;
  }
  return true;
}

export function TutorialLiveProvider({
  enabled,
  children,
}: {
  enabled: boolean;
  children: ReactNode;
}) {
  const [snapshot, setSnapshot] = useState<TutorialLiveSnapshot>({});
  const clear = useCallback(() => setSnapshot({}), []);
  const report = useCallback(
    (p: Partial<TutorialLiveSnapshot>) => {
      if (!enabled) return;
      setSnapshot(prev => {
        if (snapshotPatchUnchanged(prev, p)) return prev;
        return { ...prev, ...p };
      });
    },
    [enabled]
  );
  const requestUtciSelection = useCallback(
    (selection: { periodId: string; includeSun: boolean; includeWind: boolean }) => {
      if (!enabled) return;
      setSnapshot(prev => {
        if (
          prev.includeSun === selection.includeSun &&
          prev.includeWind === selection.includeWind &&
          prev.utciFocusPeriodId === selection.periodId
        ) {
          return prev;
        }
        return {
          ...prev,
          includeSun: selection.includeSun,
          includeWind: selection.includeWind,
          utciFocusPeriodId: selection.periodId,
        };
      });
    },
    [enabled]
  );
  const clearUtciFocus = useCallback(() => {
    if (!enabled) return;
    setSnapshot(prev => {
      if (prev.utciFocusPeriodId == null) return prev;
      return { ...prev, utciFocusPeriodId: null };
    });
  }, [enabled]);
  useEffect(() => {
    if (!enabled) clear();
  }, [enabled, clear]);
  const value = useMemo(
    () => ({ enabled, snapshot, report, requestUtciSelection, clearUtciFocus, clear }),
    [enabled, snapshot, report, requestUtciSelection, clearUtciFocus, clear]
  );
  return <TutorialLiveContext.Provider value={value}>{children}</TutorialLiveContext.Provider>;
}

export function useTutorialLive(): Ctx {
  const v = useContext(TutorialLiveContext);
  if (!v) throw new Error('useTutorialLive must be used within TutorialLiveProvider');
  return v;
}

export function useTutorialLiveOptional(): Ctx | null {
  return useContext(TutorialLiveContext);
}
