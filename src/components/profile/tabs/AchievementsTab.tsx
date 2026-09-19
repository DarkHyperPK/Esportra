import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { apiClient } from '@/lib/apiClient';
import type { UserStatsDto, PlacementAchievementDto } from '@/types/profile';
import { GameLogoImage } from '@/components/games/GameLogoImage';

interface AchievementsTabProps {
  profileId: string;
  accentColor: string;
}

type PlacementTier = {
  key: string;
  label: string;
  sublabel: string;
  maxPlacement: number;
  minPlacement: number;
  medalColor: string;
  medalBg: string;
  icon: string;
};

const TIERS: PlacementTier[] = [
  { key: 'champion',    label: 'Tournament Champion', sublabel: '1st place',      minPlacement: 1, maxPlacement: 1, medalColor: '#FFD700', medalBg: 'rgba(255,215,0,0.12)',   icon: '🥇' },
  { key: 'finalist',   label: 'Grand Finalist',       sublabel: '2nd place',      minPlacement: 2, maxPlacement: 2, medalColor: '#C0C0C0', medalBg: 'rgba(192,192,192,0.10)', icon: '🥈' },
  { key: 'semifinal',  label: 'Semi-Finalist',        sublabel: 'Top 4',          minPlacement: 3, maxPlacement: 4, medalColor: '#CD7F32', medalBg: 'rgba(205,127,50,0.10)',  icon: '🥉' },
  { key: 'quarterfinal', label: 'Quarter-Finalist',   sublabel: 'Top 8',          minPlacement: 5, maxPlacement: 8, medalColor: '#4A90D9', medalBg: 'rgba(74,144,217,0.10)', icon: '⚔️' },
];

function tierFor(placement: number): PlacementTier | undefined {
  return TIERS.find(t => placement >= t.minPlacement && placement <= t.maxPlacement);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  try { return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }); }
  catch { return ''; }
}

export function AchievementsTab({ profileId, accentColor: _accentColor }: AchievementsTabProps): React.JSX.Element {
  const statsQuery = useQuery({
    queryKey: ['public-stats', profileId],
    queryFn: () => apiClient.get<UserStatsDto>(`/api/profiles/${profileId}/stats`),
    staleTime: 5 * 60 * 1000,
  });

  const placements: PlacementAchievementDto[] = statsQuery.data?.placement_achievements ?? [];

  if (statsQuery.isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{ height: 72, borderRadius: 10, background: 'rgba(255,255,255,0.04)', animation: 'pulse 1.5s ease-in-out infinite' }} />
        ))}
      </div>
    );
  }

  if (placements.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 24px', color: 'rgba(255,255,255,0.3)' }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>🏆</div>
        <p style={{ fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.5)', margin: '0 0 8px' }}>No notable placements yet</p>
        <p style={{ fontSize: 13, margin: 0 }}>Top 8 tournament finishes will appear here.</p>
      </div>
    );
  }

  // Group by tier
  const grouped = TIERS.map(tier => ({
    tier,
    entries: placements.filter(p => p.placement >= tier.minPlacement && p.placement <= tier.maxPlacement),
  })).filter(g => g.entries.length > 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {grouped.map(({ tier, entries }) => (
        <section key={tier.key}>
          {/* Tier header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 12,
              paddingBottom: 10,
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <span style={{ fontSize: 20 }}>{tier.icon}</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: tier.medalColor }}>{tier.label}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{tier.sublabel} · {entries.length}×</div>
            </div>
          </div>

          {/* Entry cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {entries.map(entry => {
              const to = entry.tournament_slug ? `/tournaments/${entry.tournament_slug}` : null;
              const dateStr = formatDate(entry.start_date);
              const t = tierFor(entry.placement);

              const card = (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 14px',
                    borderRadius: 10,
                    background: t ? t.medalBg : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${t ? t.medalColor + '28' : 'rgba(255,255,255,0.06)'}`,
                    textDecoration: 'none',
                    color: 'inherit',
                    transition: to ? 'background 140ms' : undefined,
                  }}
                  className={to ? 'hover:brightness-110' : undefined}
                >
                  {/* Placement badge */}
                  <div
                    style={{
                      flexShrink: 0,
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      background: t ? t.medalColor + '20' : 'rgba(255,255,255,0.06)',
                      border: `1px solid ${t ? t.medalColor + '50' : 'rgba(255,255,255,0.1)'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 13,
                      fontWeight: 800,
                      color: t?.medalColor ?? '#fff',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    #{entry.placement}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {entry.tournament_name}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
                      {entry.game && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.05)', borderRadius: 3, padding: '1px 5px' }}>
                          <GameLogoImage gameName={entry.game} alt="" className="w-3 h-3 object-contain rounded-sm" />
                          {entry.game}
                        </span>
                      )}
                      {entry.team_name && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                          {entry.team_logo_url && (
                            <img src={entry.team_logo_url} alt="" style={{ width: 12, height: 12, borderRadius: 2, objectFit: 'contain' }} />
                          )}
                          {entry.team_name}
                        </span>
                      )}
                      {dateStr && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>{dateStr}</span>}
                    </div>
                  </div>
                </div>
              );

              return to ? (
                <Link key={entry.tournament_id + entry.placement} to={to} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                  {card}
                </Link>
              ) : (
                <div key={entry.tournament_id + entry.placement}>{card}</div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
