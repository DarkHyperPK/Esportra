import { Link } from 'react-router-dom';
import { RoleChip } from './RoleChip';
import { RegionLabel } from './RegionLabel';
import type { LfgListing, LfgIntent } from '@/types/competitive';

interface LfgDiscoveryCardProps {
  listing: LfgListing;
}

const INTENT_LABELS: Record<LfgIntent, string> = {
  ranked: 'Ranked',
  scrims: 'Scrims',
  casual: 'Casual',
  coaching: 'Coaching',
};

function Avatar({ username, avatarUrl }: { username: string; avatarUrl: string | null }) {
  if (avatarUrl) {
    return (
      <img src={avatarUrl} alt="" aria-hidden
        className="h-8 w-8 shrink-0 object-cover bg-white/[0.07]" />
    );
  }
  return (
    <span
      className="flex h-8 w-8 shrink-0 items-center justify-center bg-white/[0.07] font-rajdhani text-sm font-semibold text-white"
      aria-hidden
    >
      {username.substring(0, 2).toUpperCase()}
    </span>
  );
}

function ExpiryLine({ expiresAt }: { expiresAt: string | null }) {
  if (!expiresAt) return null;
  const ms = new Date(expiresAt).getTime() - Date.now();
  const days = Math.ceil(ms / (1000 * 60 * 60 * 24));
  const isToday = days <= 0 || (ms > 0 && ms < 86_400_000);
  const colorClass = ms < 86_400_000 ? 'text-amber-400' : 'text-white/35';

  return (
    <span className={`text-[11px] ${colorClass}`}>
      {isToday ? 'Expires today.' : days > 0 ? `Expires in ${days} days.` : 'Expired.'}
    </span>
  );
}

/**
 * Discovery card for an LFG listing in the Find LFG tab.
 */
export function LfgDiscoveryCard({ listing }: LfgDiscoveryCardProps) {
  const rankRange =
    listing.minRankDisplayName && listing.maxRankDisplayName
      ? `${listing.minRankDisplayName} — ${listing.maxRankDisplayName}`
      : listing.minRankDisplayName ?? listing.maxRankDisplayName ?? null;

  const excerpt = listing.description
    ? listing.description.length > 80
      ? listing.description.slice(0, 80) + '…'
      : listing.description
    : null;

  return (
    <article
      className="border border-white/[0.08] bg-white/[0.04] p-4 transition-colors duration-[120ms] hover:border-white/20 hover:bg-white/[0.07]"
    >
      {/* Header row */}
      <div className="flex items-start gap-3 mb-3">
        <Avatar username={listing.username} avatarUrl={listing.avatarUrl} />
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-medium text-white truncate">{listing.username}</p>
          <p className="text-[13px] text-white/55">
            Valorant · {INTENT_LABELS[listing.intent] ?? listing.intent}
          </p>
        </div>
      </div>

      {/* Rank range */}
      {rankRange ? (
        <p className="font-rajdhani text-[13px] font-semibold text-white mb-2">{rankRange}</p>
      ) : (
        <p className="text-[13px] text-white/35 mb-2">Any rank</p>
      )}

      {/* Roles */}
      {listing.roles.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {listing.roles.map((role) => (
            <RoleChip key={role} role={role} displayName={role.toUpperCase()} mode="display" />
          ))}
        </div>
      )}

      {/* Region */}
      <RegionLabel
        region={listing.regionDisplayName}
        server={listing.servers?.[0] ?? null}
        className="mb-2"
      />

      {/* Languages */}
      {listing.languages.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {listing.languages.map((lang) => (
            <span key={lang}
              className="inline-flex h-5 items-center px-1.5 border border-white/[0.08] bg-white/[0.04] font-rajdhani text-[9px] uppercase tracking-wide text-white/55">
              {lang}
            </span>
          ))}
        </div>
      )}

      {/* Description excerpt */}
      {excerpt && (
        <p className="text-[13px] text-white/55 mb-3">&ldquo;{excerpt}&rdquo;</p>
      )}

      {/* Footer: expiry + view link */}
      <div className="flex items-center justify-between">
        <ExpiryLine expiresAt={listing.expiresAt} />
        <Link
          to={`/competitive/lfg/${listing.id}`}
          className="text-[13px] text-white/55 hover:text-white transition-colors duration-[120ms]"
        >
          View listing →
        </Link>
      </div>
    </article>
  );
}
