import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import type { ScrimListing } from '@/types/competitive';
import { GlowCard, StatusPill } from './GlowCard';
import type { StatusTone } from './GlowCard';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SCRIM_STATUS_LABELS: Record<string, string> = {
  open:   'Open',
  paused: 'Paused',
  closed: 'Closed',
};

const SCRIM_STATUS_TONE: Record<string, StatusTone> = {
  open:   'accent',
  paused: 'neutral',
  closed: 'neutral',
};

function formatRankRange(min: string | null, max: string | null): string {
  if (min && max) return `${min} – ${max}`;
  if (min) return min;
  if (max) return max;
  return 'Any rank';
}

function formatDayAbbrevs(days: string[]): string {
  return days.map(d => d.slice(0, 3)).join(', ');
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface ScrimListingCardProps {
  listing: ScrimListing;
  isOwner?: boolean;
  onMakeOffer?: (listingId: string) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Discovery card for a ScrimListing.
 * accentTop when status === 'open'.
 * Confirm motion (whileTap scale 0.97) on primary CTA. Reduced-motion respects prefers-reduced-motion.
 */
export function ScrimListingCard({ listing, isOwner, onMakeOffer }: ScrimListingCardProps) {
  const reduced = useReducedMotion() ?? false;
  const isOpen = listing.status === 'open';

  const metaParts: string[] = [];
  if (listing.modeKey) metaParts.push(listing.modeKey);
  metaParts.push(formatRankRange(listing.minRankKey, listing.maxRankKey));
  if (listing.preferredDays?.length) metaParts.push(formatDayAbbrevs(listing.preferredDays));
  if (listing.preferredTimeStart && listing.preferredTimeEnd) {
    metaParts.push(`${listing.preferredTimeStart}–${listing.preferredTimeEnd}`);
  }

  return (
    <GlowCard accentTop={isOpen}>
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 min-w-0 overflow-hidden">
          <span className="text-[15px] font-semibold [font-family:var(--font-heading)] text-white truncate">
            {listing.teamName ?? 'Unknown Team'}
          </span>
          {listing.teamTag && (
            <span className="text-[13px] text-white/55 shrink-0">[{listing.teamTag}]</span>
          )}
          {listing.gameSlug && (
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-white/55 shrink-0">
              {listing.gameSlug}
            </span>
          )}
          {listing.regionKey && (
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-white/40 shrink-0">
              {listing.regionKey}
            </span>
          )}
        </div>
        <StatusPill
          label={SCRIM_STATUS_LABELS[listing.status] ?? listing.status}
          tone={SCRIM_STATUS_TONE[listing.status] ?? 'neutral'}
        />
      </div>

      {/* Meta row */}
      {metaParts.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-3">
          {metaParts.map((part, i) => (
            <span key={i} className="text-[12px] text-white/40">{part}</span>
          ))}
        </div>
      )}

      {/* Notes */}
      {listing.notes && (
        <p className="text-[13px] text-white/55 line-clamp-2 mb-3">{listing.notes}</p>
      )}

      {/* Action strip */}
      <div className="flex items-center justify-end gap-3">
        {isOwner ? (
          <Link
            to="/competitive/scrims/workspace"
            className="px-3 py-1.5 text-[13px] font-medium border border-white/[0.12] text-white/70 hover:text-white hover:border-white/25 transition-colors duration-150"
          >
            Manage
          </Link>
        ) : isOpen ? (
          <motion.button
            type="button"
            whileTap={!reduced ? { scale: 0.97 } : undefined}
            transition={{ duration: 0.12 }}
            onClick={() => onMakeOffer?.(listing.id)}
            className="px-3 py-1.5 text-[13px] font-medium bg-rose-500 hover:bg-rose-600 text-white transition-colors duration-150 [box-shadow:0_0_12px_0_rgba(255,45,85,0.35)]"
          >
            Make Offer
          </motion.button>
        ) : (
          <span className="text-[12px] text-white/30">Closed</span>
        )}
      </div>
    </GlowCard>
  );
}
