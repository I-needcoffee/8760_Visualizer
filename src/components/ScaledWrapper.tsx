import React, { useEffect, useRef, useState, useCallback } from 'react';

/**
 * ScaledWrapper: Scales 350px-wide chart content to fill its container width,
 * then reports the resulting height so the grid layout can size the card correctly.
 * 
 * STABILITY STRATEGY:
 * The jitter loop happens because:
 *   1. ScaledWrapper reports height H to the grid
 *   2. Grid resizes the card to H rows
 *   3. Card resizes, ScaledWrapper's container width changes slightly
 *   4. Scale changes, content height changes, new height H' != H
 *   5. Back to step 1
 * 
 * We break this by:
 *   - Only reporting height when scale changes significantly (>1% change)
 *   - Locking height reports after 2 rapid updates (oscillation detected)
 *   - Using a generous dead zone (40px) for height changes
 *   - Debouncing with RAF + timeout
 */
export const ScaledWrapper: React.FC<{ children: React.ReactNode, onHeightChange?: (height: number) => void }> = ({ children, onHeightChange }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [height, setHeight] = useState<number | 'auto'>('auto');
  
  // Stability state
  const lastScaleRef = useRef(1);
  const lastHeightRef = useRef<number>(0);
  const updateCountRef = useRef(0);
  const lockedRef = useRef(false);
  const lockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onHeightChangeRef = useRef(onHeightChange);
  useEffect(() => {
    onHeightChangeRef.current = onHeightChange;
  }, [onHeightChange]);

  const measure = useCallback(() => {
    if (!containerRef.current || !contentRef.current) return;
    
    const containerWidth = containerRef.current.clientWidth;
    if (containerWidth === 0) return;
    
    const newScale = containerWidth / 350;
    
    // Only recalculate if scale changed meaningfully (>1%)
    const scaleDelta = Math.abs(newScale - lastScaleRef.current) / lastScaleRef.current;
    if (scaleDelta < 0.01 && lastHeightRef.current > 0) {
      return; // Scale didn't change enough, don't recalculate
    }
    
    lastScaleRef.current = newScale;
    setScale(newScale);
    
    const contentHeight = contentRef.current.scrollHeight;
    if (contentHeight === 0) return;
    
    const scaledHeight = Math.ceil(contentHeight * newScale);
    
    // Height must change by at least 40px to be worth reporting
    const heightDelta = Math.abs(scaledHeight - lastHeightRef.current);
    if (heightDelta < 40 && lastHeightRef.current > 0) {
      return;
    }
    
    // Oscillation detection: if we've updated 3+ times rapidly, lock for 5 seconds
    if (lockedRef.current) return;
    
    updateCountRef.current++;
    if (updateCountRef.current >= 3) {
      lockedRef.current = true;
      // Unlock after 5 seconds of quiet
      if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
      lockTimerRef.current = setTimeout(() => {
        lockedRef.current = false;
        updateCountRef.current = 0;
      }, 5000);
      return;
    }
    
    // Reset update count after 3 seconds of quiet
    if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
    lockTimerRef.current = setTimeout(() => {
      updateCountRef.current = 0;
    }, 3000);
    
    lastHeightRef.current = scaledHeight;
    setHeight(scaledHeight);
    onHeightChangeRef.current?.(scaledHeight);
  }, []);

  useEffect(() => {
    if (!containerRef.current || !contentRef.current) return;
    let isMounted = true;
    
    const observer = new ResizeObserver(() => {
      if (!isMounted) return;
      
      // Cancel previous pending measurements
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      
      // Debounce: wait 300ms, then measure on next animation frame
      debounceRef.current = setTimeout(() => {
        if (!isMounted) return;
        rafRef.current = requestAnimationFrame(() => {
          if (isMounted) measure();
        });
      }, 300);
    });
    
    observer.observe(containerRef.current);
    observer.observe(contentRef.current);
    
    // Initial measurement after a short delay
    const initTimer = setTimeout(measure, 100);
    
    return () => {
      isMounted = false;
      observer.disconnect();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
      clearTimeout(initTimer);
    };
  }, [measure]);

  return (
    <div ref={containerRef} className="w-full relative bg-transparent" style={{ height: height === 'auto' ? 'auto' : `${height}px` }}>
      <div 
        ref={contentRef}
        style={{ 
          width: '350px', 
          transform: `scale(${scale})`, 
          transformOrigin: 'top left',
          position: 'absolute',
          top: 0,
          left: 0
        }}
      >
        {children}
      </div>
    </div>
  );
};
