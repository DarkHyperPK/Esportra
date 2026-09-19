import React, { useRef } from 'react';

type StatFormat = 'integer' | 'currency' | 'ordinal' | 'preformatted';

export interface StatTile {
  value: number | string;
  label: string;
  format: StatFormat;
}

interface StatTilesRowProps {
  tiles: StatTile[];
  /** Stable ref from parent so fired state survives tab unmount/remount */
  hasFiredSetRef?: { current: Set<string> };
}

/**
 * StatTilesRow: 5-tile stat grid.
 * Desktop: single row (repeat(5, 1fr)).
 * Mobile: 3+2 grid layout.
 * Numbers animate with stat-count-up on first viewport intersection.
 */
export function StatTilesRow({ tiles, hasFiredSetRef }: StatTilesRowProps): React.JSX.Element {
  return (
    <>
      <style>{`
        .stat-tiles-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          position: relative;
        }
        @media (max-width: 767px) {
          .stat-tiles-grid {
            grid-template-columns: repeat(3, 1fr);
          }
          .stat-tile:nth-child(4),
          .stat-tile:nth-child(5) {
            grid-column: auto;
          }
          /* 5th tile spans full remaining if on its own row */
          .stat-tiles-grid.five-tiles .stat-tile:nth-child(5) {
            grid-column: 1 / -1;
          }
        }
        .stat-tile {
          padding: 20px 16px;
          text-align: center;
          position: relative;
        }
        .stat-tile + .stat-tile::before {
          content: '';
          position: absolute;
          left: 0;
          top: 10%;
          height: 80%;
          width: 1px;
          background: rgba(255,255,255,0.06);
        }
      `}</style>

      <div className={`stat-tiles-grid${tiles.length === 5 ? ' five-tiles' : ''}`}>
        {tiles.map((tile, i) => (
          <StatTileItem key={i} tile={tile} hasFiredSetRef={hasFiredSetRef} />
        ))}
      </div>
    </>
  );
}

function StatTileItem({ tile, hasFiredSetRef }: { tile: StatTile; hasFiredSetRef?: { current: Set<string> } }): React.JSX.Element {
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div className="stat-tile" ref={ref as React.RefObject<HTMLDivElement>}>
      <StatNumber
        value={tile.value}
        format={tile.format}
        parentRef={ref}
        hasFiredSetRef={hasFiredSetRef}
        label={tile.label}
      />
      <div
        style={{
          fontFamily: 'Inter, sans-serif',
          fontWeight: 400,
          fontSize: 12,
          color: 'rgba(255,255,255,0.4)',
          marginTop: 4,
          textTransform: 'none',
        }}
      >
        {tile.label}
      </div>
    </div>
  );
}

function StatNumber({
  value,
  format,
  parentRef,
  hasFiredSetRef,
  label,
}: {
  value: number | string;
  format: StatFormat;
  parentRef: React.RefObject<HTMLDivElement>;
  hasFiredSetRef?: { current: Set<string> };
  label: string;
}): React.JSX.Element {
  const displayValue = useStatCountUpWithRef(value, { format, duration: 600 }, parentRef, hasFiredSetRef, label);

  return (
    <div
      style={{
        fontFamily: 'Inter, sans-serif',
        fontWeight: 700,
        fontSize: 32,
        color: '#FFFFFF',
        fontVariantNumeric: 'tabular-nums',
        lineHeight: 1,
      }}
    >
      {displayValue}
    </div>
  );
}

// Variant of useStatCountUp that accepts an external ref for intersection.
// hasFiredSetRef (keyed by label) persists across tab unmounts so the
// animation fires at most once per label per page load.
function useStatCountUpWithRef(
  finalValue: number | string,
  options: { format: StatFormat; duration?: number },
  elementRef: React.RefObject<HTMLDivElement>,
  hasFiredSetRef?: { current: Set<string> },
  label?: string,
): string {
  const alreadyFired = label != null && (hasFiredSetRef?.current.has(label) ?? false);
  const [displayValue, setDisplayValue] = React.useState<string>(() =>
    options.format === 'preformatted'
      ? String(finalValue)
      : alreadyFired ? formatStatValue(finalValue, options.format) : formatStatValue(0, options.format),
  );
  // Local ref initialised from Set so re-mounts don't replay
  const hasFiredRef = React.useRef(alreadyFired);
  const prefersReduced = usePrefersReducedMotion();

  React.useEffect(() => {
    if (options.format === 'preformatted') {
      setDisplayValue(String(finalValue));
      return;
    }

    const el = elementRef.current;
    if (!el) return;

    if (prefersReduced || hasFiredRef.current) {
      setDisplayValue(formatStatValue(finalValue, options.format));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !hasFiredRef.current) {
          hasFiredRef.current = true;
          if (hasFiredSetRef?.current && label != null) {
            hasFiredSetRef.current.add(label);
          }
          observer.disconnect();
          runCountUp(finalValue as number, options.format, options.duration ?? 600, setDisplayValue);
        }
      },
      { threshold: 0.3 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finalValue, options.format, prefersReduced]);

  return displayValue;
}

function runCountUp(
  finalValue: number,
  format: StatFormat,
  duration: number,
  setter: (v: string) => void,
): void {
  const start = performance.now();
  function tick(now: number) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 2);
    setter(formatStatValue(Math.round(eased * finalValue), format));
    if (progress < 1) requestAnimationFrame(tick);
    else setter(formatStatValue(finalValue, format));
  }
  requestAnimationFrame(tick);
}

function formatStatValue(value: number | string, format: StatFormat): string {
  if (format === 'preformatted') return String(value);
  const num = value as number;
  if (format === 'currency') {
    if (num === 0) return '—';
    return '$' + num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }
  if (format === 'ordinal') {
    if (num === 0) return '—';
    const suffix = (() => {
      const mod100 = Math.abs(num) % 100;
      if (mod100 >= 11 && mod100 <= 13) return 'th';
      switch (Math.abs(num) % 10) {
        case 1: return 'st';
        case 2: return 'nd';
        case 3: return 'rd';
        default: return 'th';
      }
    })();
    return `${num}${suffix}`;
  }
  return num.toLocaleString('en-US');
}

function usePrefersReducedMotion(): boolean {
  const [prefers, setPrefers] = React.useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });
  React.useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = () => setPrefers(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return prefers;
}
