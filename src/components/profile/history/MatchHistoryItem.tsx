import React from 'react';
import { Link } from 'react-router-dom';
import type { MatchHistoryEntryDto } from '@/types/profile';
import { GameLogoImage } from '@/components/games/GameLogoImage';

interface MatchHistoryItemProps {
  entry: MatchHistoryEntryDto;
  accentColor: string;
  index?: number;
}

function roundLabel(roundIndex: number | null, bracketType: string | null): string {
  if (bracketType === 'final') return 'Grand Final';
  if (bracketType === 'semifinal') return 'Semi-Final';
  if (bracketType === 'quarterfinal') return 'Quarter-Final';
  if (roundIndex === null) return 'Match';
  return `Round ${roundIndex + 1}`;
}

export function MatchHistoryItem({ entry, index = 0 }: MatchHistoryItemProps): React.JSX.Element {
  const dateStr = entry.match_date
    ? (() => {
        try {
          return new Date(entry.match_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
        } catch { return ''; }
      })()
    : '';

  const resultColor = entry.result === 'win' ? '#22c55e' : entry.result === 'loss' ? '#ef4444' : 'rgba(255,255,255,0.4)';
  const resultLabel = entry.result === 'win' ? 'W' : entry.result === 'loss' ? 'L' : 'D';
  const scoreStr = (entry.our_score !== null && entry.opp_score !== null)
    ? `${entry.our_score}–${entry.opp_score}`
    : null;
  const tournamentTo = entry.tournament_slug ? `/tournaments/${entry.tournament_slug}` : null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        paddingTop: 10,
        paddingBottom: 10,
        borderBottom: '1px solid rgba(255,255,255,0.04)',
      }}
    >
      {/* Result badge */}
      <div
        style={{
          flexShrink: 0,
          width: 28,
          height: 28,
          borderRadius: 6,
          background: `${resultColor}18`,
          border: `1px solid ${resultColor}40`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 12,
          fontWeight: 800,
          color: resultColor,
          fontFamily: 'Inter, sans-serif',
          letterSpacing: '-0.01em',
        }}
      >
        {resultLabel}
      </div>

      {/* Main content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Opponent row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
          {entry.opponent_logo_url && (
            <img
              src={entry.opponent_logo_url}
              alt=""
              style={{ width: 16, height: 16, borderRadius: 3, objectFit: 'contain', opacity: 0.85, flexShrink: 0 }}
            />
          )}
          <span style={{ fontSize: 14, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {entry.opponent_name ?? 'TBD'}
          </span>
          {scoreStr && (
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
              {scoreStr}
            </span>
          )}
        </div>

        {/* Tournament + round row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {entry.game && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.05)', borderRadius: 3, padding: '1px 5px' }}>
              <GameLogoImage gameName={entry.game} alt="" className="w-3 h-3 object-contain rounded-sm" />
              {entry.game}
            </span>
          )}
          {tournamentTo ? (
            <Link
              to={tournamentTo}
              style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              className="hover:text-white transition-colors"
            >
              {entry.tournament_name}
            </Link>
          ) : (
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {entry.tournament_name}
            </span>
          )}
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', flexShrink: 0 }}>
            · {roundLabel(entry.round_index, entry.bracket_type)}
          </span>
        </div>
      </div>

      {/* Date */}
      {dateStr && (
        <span style={{ flexShrink: 0, fontSize: 11, color: 'rgba(255,255,255,0.3)', fontFamily: 'Inter, sans-serif' }}>
          {dateStr}
        </span>
      )}
    </div>
  );
}
