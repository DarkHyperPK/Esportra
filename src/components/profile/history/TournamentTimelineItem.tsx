import React, { useRef } from 'react';
import { motion, useReducedMotion, useInView } from 'framer-motion';
import { Trophy } from 'lucide-react';
import type { TournamentHistoryEntryDto } from '@/types/profile';
import { format, parseISO } from 'date-fns';

interface TournamentTimelineItemProps {
  entry: TournamentHistoryEntryDto;
  accentColor: string;
  abbreviated?: boolean;
  index?: number;
}

function formatPlacement(placement: number | null): {
  label: string;
  color: string;
  isOrdinal: boolean;
} {
  if (placement === null) {
    return { label: 'Did not place', color: 'rgba(255,255,255,0.35)', isOrdinal: false };
  }
  const suffix = (() => {
    const mod100 = Math.abs(placement) % 100;
    if (mod100 >= 11 && mod100 <= 13) return 'th';
    switch (Math.abs(placement) % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  })();
  const label = `${placement}${suffix}`;
  const color =
    placement === 1 ? '#FFD700' :
    placement === 2 ? '#C0C0C0' :
    placement === 3 ? '#CD7F32' :
    'rgba(255,255,255,0.7)';
  return { label, color, isOrdinal: true };
}

function formatPrize(amount: number | null): string {
  if (!amount || amount === 0) return '';
  return '$' + amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export function TournamentTimelineItem({
  entry,
  accentColor,
  abbreviated = false,
  index = 0,
}: TournamentTimelineItemProps): React.JSX.Element {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  // Stagger cap: items beyond index 4 use delay 0
  const delay = Math.min(index, 4) * 0.04;

  const inView = useInView(ref, { once: true, amount: 0.2 });

  const placement = formatPlacement(entry.placement);
  const dateStr = entry.start_date
    ? (() => {
        try { return format(parseISO(entry.start_date), 'MMM d, yyyy'); }
        catch { return ''; }
      })()
    : '';

  const showPrize = !entry.is_team_tournament && entry.prize_amount && entry.prize_amount > 0;
  const showTrophyOnly = entry.is_team_tournament && entry.placement === 1;

  const variants = {
    hidden: reduced
      ? { opacity: 0 }
      : { opacity: 0, y: 8 },
    visible: reduced
      ? { opacity: 1 }
      : { opacity: 1, y: 0 },
  };

  return (
    <motion.div
      ref={ref}
      variants={variants}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      transition={{ duration: 0.18, ease: [0, 0, 0.58, 1], delay }}
      style={{
        position: 'relative',
        paddingTop: 12,
        paddingBottom: 12,
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        paddingLeft: abbreviated ? 0 : undefined,
      }}
    >
      {/* Left accent border for full view */}
      {!abbreviated && (
        <div
          style={{
            position: 'absolute',
            left: -22,
            top: 0,
            bottom: 0,
            width: 2,
            background: accentColor,
            borderRadius: 1,
          }}
        />
      )}

      {/* Abbreviated view (peek sheet) */}
      {abbreviated ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 8,
            borderLeft: `2px solid ${accentColor}`,
            paddingLeft: 10,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: '#FFFFFF',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {entry.tournament_name}
            </div>
            <div
              style={{
                fontSize: 12,
                color: placement.color,
                fontWeight: placement.isOrdinal ? 700 : 400,
                marginTop: 2,
              }}
            >
              {placement.label}
            </div>
          </div>
        </div>
      ) : (
        /* Full view */
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            gap: '4px 12px',
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Game chip + tournament name */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
              {entry.game && (
                <span
                  style={{
                    fontSize: 11,
                    background: 'rgba(255,255,255,0.07)',
                    borderRadius: 4,
                    padding: '2px 6px',
                    color: 'rgba(255,255,255,0.6)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {entry.game}
                </span>
              )}
              {entry.team_name && !abbreviated && (
                <span
                  style={{
                    fontSize: 11,
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: 4,
                    padding: '2px 6px',
                    color: 'rgba(255,255,255,0.5)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {entry.team_name}
                </span>
              )}
            </div>
            <div style={{ fontSize: 14, fontWeight: 500, color: '#FFFFFF' }}>
              {entry.tournament_name}
            </div>
            {!abbreviated && entry.format && (
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                {entry.format}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
            {/* Placement */}
            <span
              style={{
                fontSize: placement.isOrdinal ? 14 : 13,
                fontWeight: placement.isOrdinal ? 700 : 400,
                color: placement.color,
              }}
            >
              {placement.label}
            </span>
            {/* Prize or trophy */}
            {showTrophyOnly && (
              <Trophy size={14} color="rgba(255,255,255,0.4)" />
            )}
            {showPrize && (
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
                {formatPrize(entry.prize_amount)}
              </span>
            )}
            {/* Date */}
            {dateStr && (
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
                {dateStr}
              </span>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}
