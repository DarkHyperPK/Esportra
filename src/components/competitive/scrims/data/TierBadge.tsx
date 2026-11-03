import { StatusPill } from '@/components/ui/kit';
import { TIER_LABEL } from '@/services/scrimData/format';
import type { DataTier } from '@/types/scrimData';

/** How much data a map carries. The full tier is the only one that is "healthy"; the others are said plainly, not alarmed. */
export function TierBadge({ tier }: { tier: DataTier }) {
  return <StatusPill label={TIER_LABEL[tier]} tone={tier === 'full' ? 'success' : 'neutral'} />;
}
