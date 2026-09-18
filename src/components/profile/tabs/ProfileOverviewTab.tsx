import React from 'react';
import type { UserStatsDto, TournamentHistoryEntryDto, TeamMembershipDto } from '@/types/profile';
import { StatTilesRow, type StatTile } from '@/components/profile/stats/StatTilesRow';
// hasFiredSetRef is stable across tab switches so count-up fires exactly once
import { TournamentTimelineItem } from '@/components/profile/history/TournamentTimelineItem';

interface ProfileOverviewTabProps {
  stats: UserStatsDto;
  recentTournaments: TournamentHistoryEntryDto[];
  teams: TeamMembershipDto[];
  accentColor: string;
  onViewAllTournaments: () => void;
  onViewAllTeams: () => void;
  profileUsername: string;
}

/**
 * ProfileOverviewTab: stat tiles + recent 3 tournaments + active teams.
 */
export function ProfileOverviewTab({
  stats,
  recentTournaments,
  teams,
  accentColor,
  onViewAllTournaments,
  onViewAllTeams,
  profileUsername: _profileUsername,
}: ProfileOverviewTabProps): React.JSX.Element {
  const s = stats.statistics;
  const activeTeams = teams.filter((t) => t.is_active);
  // Persists fired labels across tab unmount/remount so animation never replays
  const hasFiredSetRef = React.useRef<Set<string>>(new Set());

  const tiles: StatTile[] = [
    { value: s?.tournaments_entered ?? 0, label: 'Tournaments Entered', format: 'integer' },
    { value: s?.tournaments_won ?? 0, label: 'Wins', format: 'integer' },
    { value: s?.best_placement ?? 0, label: 'Best Placement', format: 'ordinal' },
    { value: s?.total_prize_cents ? Math.round(s.total_prize_cents / 100) : 0, label: 'Total Prize', format: 'currency' },
    { value: s?.games_played ?? 0, label: 'Games Played', format: 'integer' },
  ];

  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    color: 'rgba(255,255,255,0.35)',
    letterSpacing: '0.04em',
    marginBottom: 12,
    textTransform: 'none',
  };

  const viewAllStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: 13,
    color: accentColor,
    padding: 0,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      {/* Stat tiles */}
      <section>
        <StatTilesRow tiles={tiles} hasFiredSetRef={hasFiredSetRef} />
      </section>

      {/* Recent activity */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <span style={labelStyle}>Recent Activity</span>
          {recentTournaments.length > 0 && (
            <button
              type="button"
              style={viewAllStyle}
              onClick={onViewAllTournaments}
            >
              View all →
            </button>
          )}
        </div>

        {/* Timeline container */}
        <div
          style={{
            borderLeft: `2px solid ${accentColor}`,
            paddingLeft: 20,
            marginLeft: 8,
          }}
        >
          {recentTournaments.length === 0 ? (
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', padding: '8px 0' }}>
              No tournament history yet
            </div>
          ) : (
            recentTournaments.slice(0, 3).map((entry, i) => (
              <TournamentTimelineItem
                key={entry.tournament_id}
                entry={entry}
                accentColor={accentColor}
                abbreviated={false}
                index={i}
              />
            ))
          )}
        </div>
      </section>

      {/* Active teams */}
      {activeTeams.length > 0 && (
        <section>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={labelStyle}>Teams</span>
            {activeTeams.length > 3 && (
              <button type="button" style={viewAllStyle} onClick={onViewAllTeams}>
                View all →
              </button>
            )}
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {activeTeams.slice(0, 3).map((team) => (
              <div
                key={team.membership_id}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  height: 32,
                  paddingLeft: 12,
                  paddingRight: 12,
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 6,
                  fontSize: 13,
                  color: 'rgba(255,255,255,0.8)',
                }}
              >
                {team.team_logo_url && (
                  <img
                    src={team.team_logo_url}
                    alt={team.team_name ?? ''}
                    style={{ width: 20, height: 20, borderRadius: 4, objectFit: 'cover' }}
                  />
                )}
                <span>{team.team_name}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
