import React from 'react';
import { useReducedMotion } from 'framer-motion';

/**
 * ProfilePeekSkeleton: mirrors the exact dimensions of ProfilePeekContent.
 * Uses skeleton-shimmer animation (left-to-right directed loading).
 * No-op animation when prefers-reduced-motion is active.
 */
export function ProfilePeekSkeleton(): React.JSX.Element {
  const reduced = useReducedMotion();

  const shimmerClass = reduced ? 'skeleton-base' : 'skeleton-shimmer';

  return (
    <>
      <style>{`
        @keyframes shimmer {
          0%   { background-position: -400px 0; }
          100% { background-position:  400px 0; }
        }
        .skeleton-shimmer {
          background: linear-gradient(
            90deg,
            rgba(255,255,255,0.04) 25%,
            rgba(255,255,255,0.10) 50%,
            rgba(255,255,255,0.04) 75%
          );
          background-size: 800px 100%;
          animation: shimmer 1.5s infinite linear;
        }
        .skeleton-base {
          background: rgba(255,255,255,0.06);
        }
      `}</style>

      <div style={{ padding: '20px' }}>
        {/* Avatar + name row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div
            className={shimmerClass}
            style={{ width: 64, height: 64, borderRadius: '50%', flexShrink: 0 }}
          />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div className={shimmerClass} style={{ width: 140, height: 16, borderRadius: 4 }} />
            <div className={shimmerClass} style={{ width: 90, height: 11, borderRadius: 4 }} />
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '12px 0' }} />

        {/* Bio */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
          <div className={shimmerClass} style={{ width: '100%', height: 11, borderRadius: 4 }} />
          <div className={shimmerClass} style={{ width: '70%', height: 11, borderRadius: 4 }} />
        </div>

        {/* Teams */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <div className={shimmerClass} style={{ width: 80, height: 24, borderRadius: 6 }} />
          <div className={shimmerClass} style={{ width: 80, height: 24, borderRadius: 6 }} />
        </div>

        {/* Tournament rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
          <div className={shimmerClass} style={{ width: '100%', height: 40, borderRadius: 4 }} />
          <div className={shimmerClass} style={{ width: '100%', height: 40, borderRadius: 4 }} />
          <div className={shimmerClass} style={{ width: '100%', height: 40, borderRadius: 4 }} />
        </div>

        {/* Linked accounts */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <div className={shimmerClass} style={{ width: 100, height: 16, borderRadius: 4 }} />
          <div className={shimmerClass} style={{ width: 100, height: 16, borderRadius: 4 }} />
        </div>

        {/* CTA button — static, no shimmer */}
        <div style={{ width: '100%', height: 40, borderRadius: 6, background: 'rgba(255,255,255,0.04)' }} />
      </div>
    </>
  );
}
