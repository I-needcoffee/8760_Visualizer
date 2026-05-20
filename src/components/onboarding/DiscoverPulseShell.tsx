import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { useSyncExternalStore } from 'react';
import { discoverPulseActive, subscribeOnboarding } from '../../lib/onboardingStorage';

/** One pulse cycle length — must match `discover-pulse-ring` in index.css. */
const PULSE_CYCLE_MS = 2800;
const PULSE_COUNT = 5;

/**
 * Wraps a control so the discover pulse renders outside the button bounds
 * (not clipped by overflow-hidden parents or fixed-size hit targets).
 */
export function DiscoverPulseShell({
  storageKey,
  className = '',
  rounded = 'full',
  children,
}: {
  storageKey: string;
  className?: string;
  /** Match the child control shape — pulse ring follows this radius. */
  rounded?: 'full' | 'pill';
  children: ReactNode;
}) {
  const hintActive = useSyncExternalStore(
    subscribeOnboarding,
    () => discoverPulseActive(storageKey),
    () => false
  );
  const [pulsing, setPulsing] = useState(false);

  useEffect(() => {
    if (!hintActive) {
      setPulsing(false);
      return;
    }
    setPulsing(true);
    const timer = window.setTimeout(() => setPulsing(false), PULSE_COUNT * PULSE_CYCLE_MS);
    return () => window.clearTimeout(timer);
  }, [hintActive, storageKey]);

  const roundClass = rounded === 'pill' ? 'rounded-full' : 'rounded-full';

  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-visible ${pulsing ? 'discover-pulse-wrap' : ''} ${roundClass} ${className}`}
    >
      {children}
    </span>
  );
}
