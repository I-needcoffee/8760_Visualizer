import { useCallback, useSyncExternalStore } from 'react';
import type { CompareWindIemSharedControls, WindFileSource } from './windIemPrefsShared';

function defaultReferenceYear(): number {
  const y = new Date().getFullYear();
  return Math.max(1980, y - 1);
}

interface GlobalWindIemPrefs {
  source: WindFileSource;
  iemYearStart: number;
  iemYearEnd: number;
  setupModalOpen: boolean;
  /** When true, Cancel on the year-range modal reverts wind source to EPW (first-time IEM pick). */
  setupModalRevertOnCancel: boolean;
}

let state: GlobalWindIemPrefs = {
  source: 'epw',
  iemYearStart: defaultReferenceYear(),
  iemYearEnd: defaultReferenceYear(),
  setupModalOpen: false,
  setupModalRevertOnCancel: false,
};

const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export function subscribeWindIemGlobalPrefs(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function getWindIemGlobalPrefsSnapshot(): GlobalWindIemPrefs {
  return state;
}

function clampYear(y: number): boolean {
  const cap = new Date().getFullYear();
  return Number.isFinite(y) && y >= 1980 && y <= cap;
}

export function setWindIemGlobalPrefs(patch: Partial<GlobalWindIemPrefs>): void {
  let next: GlobalWindIemPrefs = { ...state, ...patch };

  if (patch.iemYearStart !== undefined && !clampYear(patch.iemYearStart)) return;
  if (patch.iemYearEnd !== undefined && !clampYear(patch.iemYearEnd)) return;

  if (next.iemYearStart > next.iemYearEnd) {
    const t = next.iemYearStart;
    next = { ...next, iemYearStart: next.iemYearEnd, iemYearEnd: t };
  }

  if (
    next.source === state.source &&
    next.iemYearStart === state.iemYearStart &&
    next.iemYearEnd === state.iemYearEnd &&
    next.setupModalOpen === state.setupModalOpen &&
    next.setupModalRevertOnCancel === state.setupModalRevertOnCancel
  ) {
    return;
  }

  state = next;
  emit();
}

export function openIemSetupModal(revertOnCancel: boolean): void {
  setWindIemGlobalPrefs({ setupModalOpen: true, setupModalRevertOnCancel: revertOnCancel });
}

export function closeIemSetupModal(): void {
  setWindIemGlobalPrefs({ setupModalOpen: false, setupModalRevertOnCancel: false });
}

/** Single-mode dashboard: keep wind source + IEM years in sync across Wind Explorer and Wind Rose. */
export function useWindIemGlobalPrefs(): CompareWindIemSharedControls & {
  setupModalOpen: boolean;
  setupModalRevertOnCancel: boolean;
  openIemSetupModal: (revertOnCancel: boolean) => void;
  closeIemSetupModal: () => void;
} {
  const snap = useSyncExternalStore(subscribeWindIemGlobalPrefs, getWindIemGlobalPrefsSnapshot, getWindIemGlobalPrefsSnapshot);

  const setSource = useCallback((v: WindFileSource) => {
    setWindIemGlobalPrefs({ source: v });
  }, []);

  const setIemYearRange = useCallback((start: number, end: number) => {
    if (!clampYear(start) || !clampYear(end)) return;
    const lo = Math.min(start, end);
    const hi = Math.max(start, end);
    setWindIemGlobalPrefs({ iemYearStart: lo, iemYearEnd: hi });
  }, []);

  const openModal = useCallback((revertOnCancel: boolean) => {
    openIemSetupModal(revertOnCancel);
  }, []);

  const closeModal = useCallback(() => {
    closeIemSetupModal();
  }, []);

  return {
    source: snap.source,
    iemYearStart: snap.iemYearStart,
    iemYearEnd: snap.iemYearEnd,
    setSource,
    setIemYearRange,
    setupModalOpen: snap.setupModalOpen,
    setupModalRevertOnCancel: snap.setupModalRevertOnCancel,
    openIemSetupModal: openModal,
    closeIemSetupModal: closeModal,
  };
}
