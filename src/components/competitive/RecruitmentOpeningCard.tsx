import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import type { RecruitmentOpening, RecruitmentOpeningStatus } from '@/types/competitive';
import { GlowCard, StatusPill } from './GlowCard';
import type { StatusTone } from './GlowCard';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const OPENING_STATUS_LABELS: Record<RecruitmentOpeningStatus, string> = {
  draft:      'Draft',
  open:       'Open',
  paused:     'Paused',
  filled:     'Filled',
  closed:     'Closed',
  expired:    'Expired',
  moderated:  'Moderated',
};

const OPENING_STATUS_TONE: Record<RecruitmentOpeningStatus, StatusTone> = {
  draft:      'neutral',
  open:       'accent',
  paused:     'neutral',
  filled:     'neutral',
  closed:     'neutral',
  expired:    'neutral',
  moderated:  'critical',
};

const MODE_LABELS: Record<string, string> = {
  quick:      'Quick',
  structured: 'Structured',
};

function formatExpiry(expiresAt: string | null): string | null {
  if (!expiresAt) return null;
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms < 0) return 'Expired';
  if (ms < 86_400_000) return 'Expires today';
  const days = Math.ceil(ms / 86_400_000);
  return `Expires in ${days}d`;
}

// ─── Team logo with initials fallback ────────────────────────────────────────

interface TeamLogoProps {
  logoUrl: string | null;
  teamName: string | null;
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

interface RecruitmentOpeningCardProps {
  opening: RecruitmentOpening;
  isOwner?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Discovery card for a RecruitmentOpening.
 * accentTop when status === 'open'.
 * Confirm motion on "Apply" CTA. Reduced-motion respected.
 */
export function RecruitmentOpeningCard({ opening, isOwner }: RecruitmentOpeningCardProps) {
  const reduced = useReducedMotion() ?? false;
  const isOpen = opening.status === 'open';

  const expiryLabel = formatExpiry(opening.expiresAt);
  const positionsLabel =
    opening.positionsAvailable != null
      ? `${opening.positionsFilled}/${opening.positionsAvailable} filled`
      : null;

  return (
    <GlowCard accentTop={isOpen}>
      {/* Header row: logo + team identity + status pill */}
      <div className="flex items-center gap-2 mb-2">
        <TeamLogoSmall logoUrl={opening.teamLogoUrl} teamName={opening.teamName} />
        <span className="text-[13px] text-white/70 truncate">
          {opening.teamName ?? 'Unknown Team'}
        </span>
        {opening.teamTag && (
          <span className="text-[13px] text-white/40 shrink-0">· [{opening.teamTag}]</span>
        )}
        <div className="ml-auto shrink-0">
          <StatusPill
            label={OPENING_STATUS_LABELS[opening.status]}
            tone={OPENING_STATUS_TONE[opening.status]}
          />
        </div>
      </div>

      {/* Title row */}
      <p className="text-[15px] font-semibold [font-family:var(--font-heading)] text-white mb-2">
        {opening.title}
      </p>

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-3">
        {opening.gameSlug && (
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-white/40">
            {opening.gameSlug}
          </span>
        )}
        {opening.mode && (
          <span className="text-[12px] text-white/40">{MODE_LABELS[opening.mode] ?? opening.mode}</span>
        )}
        {positionsLabel && (
          <span className="text-[12px] text-white/40">{positionsLabel}</span>
        )}
        {expiryLabel && (
          <span className="text-[12px] text-white/40">{expiryLabel}</span>
        )}
      </div>

      {/* Description */}
      {opening.description && (
        <p className="text-[13px] text-white/55 line-clamp-2 mb-3">{opening.description}</p>
      )}

      {/* Action strip */}
      <div className="flex items-center justify-end gap-3">
        {isOwner && (
          <Link
            to={`/competitive/recruitment/workspace?opening_id=${opening.id}`}
            className="text-[13px] text-white/50 hover:text-white transition-colors duration-150"
          >
            Manage →
          </Link>
        )}
        {isOpen && (
          <motion.div
            className="inline-flex"
            whileTap={!reduced ? { scale: 0.97 } : undefined}
            transition={{ duration: 0.12 }}
          >
            <Link
              to={`/competitive/recruitment/${opening.id}/apply`}
              className="px-3 py-1.5 text-[13px] font-medium bg-rose-500 hover:bg-rose-600 text-white transition-colors duration-150 [box-shadow:0_0_12px_0_rgba(255,45,85,0.35)]"
            >
              Apply
            </Link>
          </motion.div>
        )}
      </div>
    </GlowCard>
  );
}
