import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle } from 'lucide-react';
import { StatusPill } from '@/components/ui/kit';
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
        className="h-9 w-9 shrink-0 rounded-sm object-cover ring-1 ring-white/[0.08]" />
    );
  }
  return (
    <span
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-white/[0.07] ring-1 ring-white/[0.08] font-rajdhani text-sm font-semibold text-white"
      aria-hidden
    >
      {username.substring(0, 2).toUpperCase()}
    </span>
  );
}

export function LfgInterestCard({
  interest, onAccept, onDecline, isAccepting, isDeclining, readonly = false,
}: LfgInterestCardProps) {
  const excerpt = interest.message
    ? interest.message.length > 80
      ? interest.message.slice(0, 80) + '…'
      : interest.message
    : null;

  const isAccepted = interest.status === 'accepted';
  const busy = isAccepting || isDeclining;

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97, y: -4 }}
      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
      whileHover={{ y: -2, boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}
      role="article"
      aria-label={`${interest.username}'s interest`}
      className="border border-white/[0.08] bg-gradient-to-b from-white/[0.05] to-white/[0.02] p-4 space-y-2.5 shadow-[0_2px_8px_rgba(0,0,0,0.3)]"
      style={{ willChange: 'transform' }}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <Avatar username={interest.username} avatarUrl={interest.avatarUrl} />
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-[14px] font-semibold text-white">{interest.username}</p>
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
      <RegionLabel region={interest.regionDisplayName} server={interest.servers?.[0] ?? null} />

      {/* Message */}
      {excerpt && (
        <p className="text-[13px] text-white/55 leading-relaxed">
          &ldquo;{excerpt}&rdquo;{' '}
          <Link to={`/profile/${interest.username}`} className="text-white/30 hover:text-white/70 transition-colors">
            View profile →
          </Link>
        </p>
      )}

      {/* Actions */}
      <AnimatePresence>
        {!readonly && !isAccepted && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex gap-2 pt-1 overflow-hidden"
          >
            <motion.button
              type="button"
              whileTap={{ scale: 0.93 }}
              onClick={() => onDecline(interest.id)}
              disabled={busy}
              aria-label={`Decline ${interest.username}'s interest`}
              className="flex items-center gap-1.5 px-3 h-8 text-[12px] text-white/45 hover:text-white/80 border border-white/[0.07] hover:border-white/20 transition-all hover:shadow-[0_2px_8px_rgba(0,0,0,0.4)] disabled:opacity-40"
            >
              <XCircle className="h-3.5 w-3.5 shrink-0" />
              {isDeclining ? 'Declining…' : 'Decline'}
            </motion.button>
            <motion.button
              type="button"
              whileTap={{ scale: 0.93 }}
              onClick={() => onAccept(interest.id)}
              disabled={busy}
              aria-label={`Accept ${interest.username}'s interest`}
              className="flex items-center gap-1.5 px-4 h-8 text-[12px] font-medium text-white bg-rose-500/80 hover:bg-rose-500 border border-rose-500/50 transition-all hover:-translate-y-px hover:shadow-[0_4px_14px_rgba(244,63,94,0.4)] disabled:opacity-40"
            >
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              {isAccepting ? 'Accepting…' : 'Accept'}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
}
