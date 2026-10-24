import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { format } from 'date-fns';
import type { TryoutSession, TryoutParticipantStatus, TryoutSessionStatus } from '@/types/competitive';
import { GlowCard, StatusPill } from './GlowCard';
import type { StatusTone } from './GlowCard';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SESSION_STATUS_LABELS: Record<TryoutSessionStatus, string> = {
  draft:       'Draft',
  scheduled:   'Scheduled',
  in_progress: 'In Progress',
  completed:   'Completed',
  cancelled:   'Cancelled',
};

const SESSION_STATUS_TONE: Record<TryoutSessionStatus, StatusTone> = {
  draft:       'neutral',
  scheduled:   'accent',
  in_progress: 'critical',
  completed:   'success',
  cancelled:   'neutral',
};

function formatScheduledAt(iso: string): string {
  try {
    return format(new Date(iso), 'EEE d MMM, HH:mm');
  } catch {
    return iso;
  }
}

function formatRankRange(min: string | null, max: string | null): string | null {
  if (!min && !max) return null;
  if (min && max) return `${min} – ${max}`;
  return min ?? max ?? null;
}

// ─── Team logo with initials fallback ────────────────────────────────────────

interface TeamLogoProps {
  logoUrl: string | undefined;
  teamName: string | undefined;
}

function TeamLogoSmall({ logoUrl, teamName }: TeamLogoProps) {
  const [failed, setFailed] = useState(false);
  const initials = (teamName ?? 'T').slice(0, 2).toUpperCase();

  if (logoUrl && !failed) {
    return (
      <img
        src={logoUrl}
        alt=""
        aria-hidden="true"
        className="h-6 w-6 shrink-0 object-cover"
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className="flex h-6 w-6 shrink-0 items-center justify-center bg-white/[0.07] font-mono text-[9px] font-semibold text-white/55"
    >
      {initials}
    </span>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface TryoutSessionCardProps {
  session: TryoutSession;
  isOwner?: boolean;
  participantStatus?: TryoutParticipantStatus;
  onAccept?: (sessionId: string) => void;
  onDecline?: (sessionId: string) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Card for a TryoutSession in both workspace and invite contexts.
 * accentTop when status === 'scheduled' || 'in_progress'.
 * Action strip adapts to isOwner / participantStatus.
 * Confirm motion on Accept CTA. Reduced-motion respected.
 */
export function TryoutSessionCard({
  session,
  isOwner,
  participantStatus,
  onAccept,
  onDecline,
}: TryoutSessionCardProps) {
  const reduced = useReducedMotion() ?? false;
  const isActive = session.status === 'scheduled' || session.status === 'in_progress';

  const rankRange = formatRankRange(session.minRankKey, session.maxRankKey);

  const participantLabel =
    session.maxParticipants != null
      ? `${session.participantCount ?? 0}/${session.maxParticipants} participants`
      : `${session.participantCount ?? 0} participants`;

  return (
    <GlowCard accentTop={isActive}>
      {/* Header row: logo + team name + status pill */}
      <div className="flex items-center gap-2 mb-2">
        <TeamLogoSmall logoUrl={session.teamLogoUrl} teamName={session.teamName} />
        <span className="text-[13px] text-white/70 truncate">
          {session.teamName ?? 'Unknown Team'}
        </span>
        <div className="ml-auto shrink-0">
          <StatusPill
            label={SESSION_STATUS_LABELS[session.status]}
            tone={SESSION_STATUS_TONE[session.status]}
          />
        </div>
      </div>

      {/* Title row */}
      <p className="text-[15px] font-semibold [font-family:var(--font-heading)] text-white mb-2">
        {session.title}
      </p>

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-3">
        {session.gameSlug && (
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-white/40">
            {session.gameSlug}
          </span>
        )}
        {session.scheduledAt && (
          <span className="text-[12px] text-white/40">{formatScheduledAt(session.scheduledAt)}</span>
        )}
        {session.durationMinutes != null && (
          <span className="text-[12px] text-white/40">{session.durationMinutes} min</span>
        )}
        <span className="text-[12px] text-white/40">{participantLabel}</span>
      </div>

      {/* Rank gate */}
      {rankRange && (
        <p className="text-[12px] text-white/40 mb-3">Rank requirement: {rankRange}</p>
      )}

      {/* Action strip */}
      <div className="flex items-center justify-end gap-3">
        {isOwner ? (
          <Link
            to={`/competitive/tryouts/sessions/${session.id}`}
            className="text-[13px] text-white/50 hover:text-white transition-colors duration-150"
          >
            Manage →
          </Link>
        ) : participantStatus === 'invited' ? (
          <>
            <button
              type="button"
              onClick={() => onDecline?.(session.id)}
              className="text-[13px] text-white/50 hover:text-white transition-colors duration-150"
            >
              Decline
            </button>
            <motion.button
              type="button"
              whileTap={!reduced ? { scale: 0.97 } : undefined}
              transition={{ duration: 0.12 }}
              onClick={() => onAccept?.(session.id)}
              className="px-3 py-1.5 text-[13px] font-medium bg-rose-500 hover:bg-rose-600 text-white transition-colors duration-150 [box-shadow:0_0_12px_0_rgba(255,45,85,0.35)]"
            >
              Accept
            </motion.button>
          </>
        ) : (
          <Link
            to={`/competitive/tryouts/sessions/${session.id}`}
            className="text-[13px] text-white/50 hover:text-white transition-colors duration-150"
          >
            View Details →
          </Link>
        )}
      </div>
    </GlowCard>
  );
}
