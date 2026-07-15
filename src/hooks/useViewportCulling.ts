/**
 * useViewportCulling - Viewport-based rendering for large lists
 * 
 * Only renders items that are within the visible viewport (plus a buffer).
 * Uses requestAnimationFrame throttling for smooth scroll performance.
 */

import { useState, useEffect, useCallback, useMemo, RefObject } from 'react';

export interface ViewportCullingOptions {
  positions: Map<string, { x: number; y: number }>;
  itemWidth: number;
  itemHeight: number;
  buffer?: number; // Default 400px
}

interface Viewport {
  left: number;
  top: number;
  width: number;
  height: number;
}

export function useViewportCulling<T extends { id: string | number }>(
  items: T[],
  containerRef: RefObject<HTMLElement | null>,
  options: ViewportCullingOptions
): {
  visibleItems: T[];
  viewport: Viewport;
  handleScroll: () => void;
} {
  const { positions, itemWidth, itemHeight, buffer = 400 } = options;
  
  const [viewport, setViewport] = useState<Viewport>({
    left: 0,
    top: 0,
    width: 2000,
    height: 1200,
  });
  
  // Track if we have a pending RAF
  const [rafPending, setRafPending] = useState(false);
  
  // Update viewport on scroll with RAF throttling
  const handleScroll = useCallback(() => {
    if (rafPending) return;
    
    setRafPending(true);
    requestAnimationFrame(() => {
      const container = containerRef.current;
      if (container) {
        setViewport({
          left: container.scrollLeft,
          top: container.scrollTop,
          width: container.clientWidth,
          height: container.clientHeight,
        });
      }
      setRafPending(false);
    });
  }, [containerRef, rafPending]);
  
  // Initialize viewport on mount and attach scroll listener
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    // Initial viewport
    setViewport({
      left: container.scrollLeft,
      top: container.scrollTop,
      width: container.clientWidth,
      height: container.clientHeight,
    });
    
    // Attach scroll listener
    container.addEventListener('scroll', handleScroll, { passive: true });
    
    // Also listen for resize
    const resizeObserver = new ResizeObserver(() => {
      if (container) {
        setViewport(prev => ({
          ...prev,
          width: container.clientWidth,
          height: container.clientHeight,
        }));
      }
    });
    resizeObserver.observe(container);
    
    return () => {
      container.removeEventListener('scroll', handleScroll);
      resizeObserver.disconnect();
    };
  }, [containerRef, handleScroll]);
  
  // Force viewport update when positions change (e.g., filter change)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    // Immediate update when positions change
    setViewport({
      left: container.scrollLeft,
      top: container.scrollTop,
      width: container.clientWidth,
      height: container.clientHeight,
    });
  }, [positions, containerRef]);
  
  // Filter items to only those in viewport
  const visibleItems = useMemo(() => {
    // For small lists, render all
    if (items.length <= 64) return items;
    
    const vLeft = viewport.left - buffer;
    const vRight = viewport.left + viewport.width + buffer;
    const vTop = viewport.top - buffer;
    const vBottom = viewport.top + viewport.height + buffer;
    
    return items.filter(item => {
      const pos = positions.get(String(item.id));
      if (!pos) return false;
      
      const itemRight = pos.x + itemWidth;
      const itemBottom = pos.y + itemHeight;
      
      // Check if item is within viewport (with buffer)
      return pos.x < vRight && itemRight > vLeft && pos.y < vBottom && itemBottom > vTop;
    });
  }, [items, positions, viewport, itemWidth, itemHeight, buffer]);
  
  return { visibleItems, viewport, handleScroll };
}

export default useViewportCulling;
