import { cn } from '@/lib/utils';

interface RegionLabelProps {
  region: string | null;
  server?: string | null;
  className?: string;
}

/**
 * RegionLabel — "EU-WEST · PAK" format.
 * Mono Inter 11px 500 ALLCAPS tracked, --c-text-secondary.
 */
export function RegionLabel({ region, server, className }: RegionLabelProps) {
  if (!region && !server) return null;

  const parts = [region, server].filter(Boolean);
  const text = parts.join(' · ').toUpperCase();

  return (
    <span
      className={cn(
        'font-mono text-[11px] font-medium uppercase tracking-widest text-white/55',
        className,
      )}
    >
      {text}
    </span>
  );
}
