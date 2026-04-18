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
  windRoseBins?: number;
  radiusVarId?: string;
  radiusVarName?: string;
}

type Ctx = {
  enabled: boolean;
  snapshot: TutorialLiveSnapshot;
  report: (p: Partial<TutorialLiveSnapshot>) => void;
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
  useEffect(() => {
    if (!enabled) clear();
  }, [enabled, clear]);
  const value = useMemo(
    () => ({ enabled, snapshot, report, clear }),
    [enabled, snapshot, report, clear]
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
