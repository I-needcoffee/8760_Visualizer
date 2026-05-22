const SESSION_PREFIX = 'climate-compare-onboarding-session-';

const listeners = new Set<() => void>();

function emitOnboardingChange() {
  listeners.forEach(listener => listener());
}

/** Subscribe so discover shells re-render when a hint is dismissed this session. */
export function subscribeOnboarding(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

function readSessionUsed(key: string): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return sessionStorage.getItem(`${SESSION_PREFIX}${key}`) === 'used';
  } catch {
    return true;
  }
}

/** Mark a discover hint as used for the current browser session. */
export function dismissOnboarding(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(`${SESSION_PREFIX}${key}`, 'used');
    emitOnboardingChange();
  } catch {
    /* ignore quota / private mode */
  }
}

export const ONBOARDING_KEYS = {
  oneBuildingMapPins: 'one-building-map-pins',
  chartTypeSwitch: 'chart-type-switch',
  dstToggle: 'dst-toggle',
  unitSystem: 'unit-system',
  addLocation: 'add-location',
  windDataSource: 'wind-data-source',
} as const;

/** True until the user interacts with this control once in the current session. */
export function discoverPulseActive(key: string): boolean {
  return !readSessionUsed(key);
}

/** @deprecated Prefer DiscoverPulseShell — applies wrap that avoids clipping. */
export function discoverPulseClass(key: string): string {
  return discoverPulseActive(key) ? 'discover-pulse-wrap' : '';
}
