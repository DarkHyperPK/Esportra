/**
 * MatchCardSkeleton - Lightweight placeholder for matches outside viewport
 * 
 * Used for matches that are within the extended buffer but not in the immediate viewport.
 * Much lighter than the full MatchCard component.
 */

import React from 'react';
import { cn } from '@/lib/utils';

// Layout constants - must match MatchCard
const CARD_WIDTH = 320;
const CARD_HEIGHT = 180;

interface MatchCardSkeletonProps {
  x?: number;
  y?: number;
  className?: string;
}

export const MatchCardSkeleton: React.FC<MatchCardSkeletonProps> = React.memo(({
  x,
  y,
  className,
}) => {
  const style: React.CSSProperties = x !== undefined && y !== undefined ? {
    position: 'absolute',
    left: x,
    top: y,
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    contain: 'strict',
  } : {
    position: 'relative',
    width: '100%',
    maxWidth: CARD_WIDTH,
    height: CARD_HEIGHT,
    contain: 'strict',
  };

  return (
    <div style={style}>
      <div
        className={cn(
          'rounded-xl overflow-hidden border border-white/5 bg-zinc-900/30 h-full',
          'animate-pulse',
          className
        )}
      >
        <div className="p-5 space-y-4">
          {/* Team 1 skeleton */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-zinc-800" />
              <div className="w-20 h-4 rounded bg-zinc-800" />
            </div>
            <div className="w-6 h-6 rounded bg-zinc-800" />
          </div>
          
          {/* Divider */}
          <div className="h-px bg-zinc-800/50" />
          
          {/* Team 2 skeleton */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-zinc-800" />
              <div className="w-24 h-4 rounded bg-zinc-800" />
            </div>
            <div className="w-6 h-6 rounded bg-zinc-800" />
          </div>
        </div>
        
        {/* Footer skeleton */}
        <div className="px-4 py-2 bg-black/10 border-t border-white/5 flex justify-between items-center h-9">
          <div className="w-16 h-4 rounded bg-zinc-800" />
          <div className="w-4 h-4 rounded bg-zinc-800" />
        </div>
      </div>
    </div>
  );
});

MatchCardSkeleton.displayName = 'MatchCardSkeleton';

export default MatchCardSkeleton;
