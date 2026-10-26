import { Link } from 'react-router-dom';
import { StatusPill } from '@/components/ui/kit';
import { Button } from '@/components/ui/button';
import { RankBadge } from './RankBadge';
import { RoleChip } from './RoleChip';
import { RegionLabel } from './RegionLabel';
import type { LfgInterest } from '@/types/competitive';

interface LfgInterestCardProps {
  interest: LfgInterest;
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
  isAccepting: boolean;
  isDeclining: boolean;
  readonly?: boolean;
}

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

/**
 * Interest card shown on the LFG management page.
 * Accepted interests show a pill; declined are hidden (caller responsibility).
 */
export function LfgInterestCard({
  interest, onAccept, onDecline, isAccepting, isDeclining, readonly = false,
}: LfgInterestCardProps) {
  const excerpt = interest.message
    ? interest.message.length > 80
      ? interest.message.slice(0, 80) + '…'
      : interest.message
    : null;

  const isAccepted = interest.status === 'accepted';

  return (
    <article
      role="article"
      aria-label={`${interest.username}'s interest`}
      className="border border-white/[0.08] bg-white/[0.04] p-4 space-y-2"
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <Avatar username={interest.username} avatarUrl={interest.avatarUrl} />
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-[14px] font-medium text-white">{interest.username}</p>
          {interest.rankTierDisplayName && (
            <RankBadge
              tierDisplayName={interest.rankTierDisplayName}
              provenance={interest.rankProvenance}
              size="inline"
            />
          )}
        </div>
        {isAccepted && <StatusPill label="Accepted" tone="success" />}
      </div>

      {/* Roles */}
      {(interest.preferredRoles?.length ?? 0) > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {interest.preferredRoles!.map((role) => (
            <RoleChip key={role} role={role} displayName={role.toUpperCase()} mode="display" />
          ))}
        </div>
      )}

      {/* Region */}
      <RegionLabel region={interest.regionDisplayName} server={interest.preferredServers?.[0] ?? null} />

      {/* Message */}
      {excerpt && (
        <p className="text-[13px] text-white/55">
          &ldquo;{excerpt}&rdquo;{' '}
          <Link to={`/profile/${interest.username}`} className="text-white/35 hover:text-white transition-colors">
            View profile →
          </Link>
        </p>
      )}

      {/* Actions */}
      {!readonly && !isAccepted && (
        <div className="flex gap-2 pt-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDecline(interest.id)}
            disabled={isDeclining || isAccepting}
            aria-label={`Decline ${interest.username}'s interest`}
            className="text-[13px] text-white/55 hover:text-white rounded-none"
          >
            {isDeclining ? 'Declining…' : 'Decline'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onAccept(interest.id)}
            disabled={isAccepting || isDeclining}
            aria-label={`Accept ${interest.username}'s interest`}
            className="border-white/[0.08] text-white hover:bg-white/[0.07] rounded-none text-[13px]"
          >
            {isAccepting ? 'Accepting…' : 'Accept'}
          </Button>
        </div>
      )}
    </article>
  );
}
