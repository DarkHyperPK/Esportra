import { useEffect, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

type StatFormat = 'integer' | 'currency' | 'ordinal';

export function formatStatValue(value: number, format: StatFormat): string {
  if (format === 'currency') {
    if (value === 0) return '—';
    return '$' + value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }
  if (format === 'ordinal') {
    if (value === 0) return '—';
    const suffix = (() => {
      const abs = Math.abs(value);
      const mod100 = abs % 100;
      if (mod100 >= 11 && mod100 <= 13) return 'th';
      switch (abs % 10) {
        case 1: return 'st';
        case 2: return 'nd';
        case 3: return 'rd';
        default: return 'th';
      }
    })();
    return `${value}${suffix}`;
  }
  return value.toLocaleString('en-US');
}

/**
 * stat-count-up: fires once on first IntersectionObserver entry (threshold: 0.3).
 * Does not replay on tab re-visit (hasFired ref, internal to StatTilesRow).
 * Respects prefers-reduced-motion — snaps immediately when active.
 * Note: The rAF animation loop is handled inside StatTilesRow.tsx via the
 * useStatCountUpWithRef pattern that accepts an external element ref.
 * This export provides the format utility and the reduced-motion guard.
 */
export function useStatCountUp(
  finalValue: number,
  options: { format: StatFormat },
): string {
  const { format } = options;
  const prefersReducedMotion = useReducedMotion();
  const [displayValue, setDisplayValue] = useState<string>(() =>
    prefersReducedMotion ? formatStatValue(finalValue, format) : formatStatValue(0, format),
  );

  useEffect(() => {
    if (prefersReducedMotion) {
      setDisplayValue(formatStatValue(finalValue, format));
    }
  }, [finalValue, format, prefersReducedMotion]);

  return displayValue;
}

export default useStatCountUp;
