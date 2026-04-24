import { useSyncExternalStore } from 'react';

/** Tailwind `sm` (640px): below this, primary card chrome must not rely on hover. */
export function useIsMobileMaxSm() {
  return useSyncExternalStore(
    onChange => {
      if (typeof window === 'undefined') return () => {};
      const mql = window.matchMedia('(max-width: 639px)');
      const on = () => onChange();
      mql.addEventListener('change', on);
      return () => mql.removeEventListener('change', on);
    },
    () => (typeof window !== 'undefined' ? window.matchMedia('(max-width: 639px)').matches : false),
    () => false
  );
}
