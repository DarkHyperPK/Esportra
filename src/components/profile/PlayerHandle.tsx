import React from 'react';
import { usePeekStore } from '@/stores/peekStore';

interface PlayerHandleProps {
  userId: string;
  children: React.ReactNode;
  className?: string;
  /** true for inline text contexts — renders as <span> instead of <div> */
  asSpan?: boolean;
}

/**
 * PlayerHandle: wraps any clickable player reference (avatar, name, username).
 * Calls openPeek(userId) on click. Never navigates.
 * Renders as <span> in inline text contexts (asSpan=true).
 */
export function PlayerHandle({
  userId,
  children,
  className,
  asSpan = false,
}: PlayerHandleProps): React.JSX.Element {
  const openPeek = usePeekStore((s) => s.openPeek);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    openPeek(userId);
  };

  // div variant: minHeight 44 satisfies touch target without affecting visual appearance
  // (content taller than 44px, e.g. an avatar, simply overrides it)
  const baseStyles: React.CSSProperties = {
    cursor: 'pointer',
    WebkitTapHighlightColor: 'transparent',
    display: asSpan ? 'inline' : 'inline-flex',
    alignItems: asSpan ? undefined : 'center',
    minHeight: asSpan ? undefined : 44,
  };

  if (asSpan) {
    // ::after extends the tap area to 44px without disrupting inline text flow
    return (
      <>
        <style>{`
          .player-handle-span { position: relative; }
          .player-handle-span::after {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            min-width: 44px;
            min-height: 44px;
            display: block;
          }
        `}</style>
        <span
          role="button"
          tabIndex={0}
          onClick={handleClick}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPeek(userId); } }}
          className={`player-handle-span${className ? ` ${className}` : ''}`}
          style={baseStyles}
        >
          {children}
        </span>
      </>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPeek(userId); } }}
      className={className}
      style={baseStyles}
    >
      {children}
    </div>
  );
}
