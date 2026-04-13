import React, { useEffect, useRef, useState } from 'react';

export const ScaledWrapper: React.FC<{ children: React.ReactNode, onHeightChange?: (height: number) => void }> = ({ children, onHeightChange }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [height, setHeight] = useState<number | 'auto'>('auto');
  const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastReportedHeight = useRef<number | null>(null);

  const onHeightChangeRef = useRef(onHeightChange);
  useEffect(() => {
    onHeightChangeRef.current = onHeightChange;
  }, [onHeightChange]);

  useEffect(() => {
    if (!containerRef.current || !contentRef.current) return;
    let isMounted = true;
    
    const observer = new ResizeObserver(entries => {
      if (resizeTimeoutRef.current) clearTimeout(resizeTimeoutRef.current);
      
      resizeTimeoutRef.current = setTimeout(() => {
        if (!isMounted || !containerRef.current || !contentRef.current) return;
        
        const containerWidth = containerRef.current.clientWidth;
        const contentHeight = contentRef.current.clientHeight;
        
        if (containerWidth === 0 || contentHeight === 0) return;

        const newScale = containerWidth / 350;
        setScale(newScale);
        
        // Calculate the scaled height of the content
        const scaledHeight = Math.round(contentHeight * newScale);
        
        // Add a small buffer (10px) to prevent clipping
        const newTotalHeight = scaledHeight + 10;
        
        // Only report height change if it's significant (e.g., > 20px)
        // Using a slightly larger threshold (20px) for better stability with grid rows
        if (lastReportedHeight.current === null || Math.abs(newTotalHeight - lastReportedHeight.current) > 20) {
          setHeight(newTotalHeight);
          lastReportedHeight.current = newTotalHeight;
          onHeightChangeRef.current?.(newTotalHeight);
        }
        
      }, 200); // Increased debounce to 200ms
    });
    
    observer.observe(containerRef.current);
    observer.observe(contentRef.current);
    
    return () => {
      isMounted = false;
      observer.disconnect();
      if (resizeTimeoutRef.current) clearTimeout(resizeTimeoutRef.current);
    };
  }, []);

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
