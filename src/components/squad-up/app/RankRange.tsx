import { useCatalogRankTiers } from '@/hooks/competitive/useCatalog';

interface RankRangeProps {
  minTier: number | null;
  maxTier: number | null;
  onChange: (range: { minTier: number | null; maxTier: number | null }) => void;
}

/** Lowest and highest rank to see. Empty means "near my rank" (four tiers either side). Tier = sort order + 3. */
export function RankRange({ minTier, maxTier, onChange }: RankRangeProps) {
  const tiers = useCatalogRankTiers('valorant').data ?? [];
  const options = tiers.map((tier) => ({ value: tier.sortOrder + 3, label: tier.displayName }));
  const select = (label: string, value: number | null, update: (next: number | null) => void) => (
    <label className="su-field">
      <span>{label}</span>
      <select className="su-input" value={value ?? ''} onChange={(event) => update(event.target.value === '' ? null : Number(event.target.value))}>
        <option value="">Near my rank</option>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
  return (
    <div className="su-rank-range">
      {select('Lowest rank', minTier, (next) => onChange({ minTier: next, maxTier }))}
      {select('Highest rank', maxTier, (next) => onChange({ minTier, maxTier: next }))}
    </div>
  );
}
