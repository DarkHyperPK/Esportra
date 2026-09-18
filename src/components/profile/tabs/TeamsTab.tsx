import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import type { TeamMembershipDto } from '@/types/profile';
import { format, parseISO } from 'date-fns';

interface TeamsTabProps {
  profileId: string;
}

/**
 * TeamsTab: current + past team memberships. Former members are muted.
 */
export function TeamsTab({ profileId }: TeamsTabProps): React.JSX.Element {
  const { data: teams = [], isLoading } = useQuery({
    queryKey: ['profile-teams', profileId],
    queryFn: () => apiClient.get<TeamMembershipDto[]>(`/api/profiles/${profileId}/teams`),
    staleTime: 5 * 60 * 1000,
  });

  const current = teams.filter((t) => t.is_active);
  const former = teams.filter((t) => !t.is_active);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
        <Loader2 size={24} color="rgba(255,255,255,0.4)" className="animate-spin" />
      </div>
    );
  }

  if (teams.length === 0) {
    return (
      <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)', textAlign: 'center', padding: '40px 0' }}>
        No team memberships
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      {current.length > 0 && (
        <section>
          {former.length > 0 && (
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.04em', marginBottom: 12 }}>
              Current
            </div>
          )}
          <TeamCardGrid teams={current} muted={false} />
        </section>
      )}

      {former.length > 0 && (
        <section>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.04em', marginBottom: 12 }}>
            Former member
          </div>
          <TeamCardGrid teams={former} muted={true} />
        </section>
      )}
    </div>
  );
}

function TeamCardGrid({
  teams,
  muted,
}: {
  teams: TeamMembershipDto[];
  muted: boolean;
}): React.JSX.Element {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
        gap: 12,
      }}
    >
      {teams.map((team) => (
        <TeamCard key={team.membership_id} team={team} muted={muted} />
      ))}
    </div>
  );
}

function TeamCard({ team, muted }: { team: TeamMembershipDto; muted: boolean }): React.JSX.Element {
  const textColor = muted ? 'rgba(255,255,255,0.4)' : '#FFFFFF';
  const subColor = muted ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.5)';
  const dateColor = muted ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.35)';
  const logoOpacity = muted ? 0.5 : 1;

  const joinedStr = team.joined_at
    ? (() => { try { return format(parseISO(team.joined_at), 'MMM d, yyyy'); } catch { return ''; } })()
    : '';

  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 8,
        padding: 16,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
      }}
    >
      {/* Team logo */}
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 8,
          background: 'rgba(255,255,255,0.05)',
          overflow: 'hidden',
          flexShrink: 0,
          opacity: logoOpacity,
        }}
      >
        {team.team_logo_url ? (
          <img
            src={team.team_logo_url}
            alt={team.team_name ?? ''}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
              fontWeight: 700,
              color: textColor,
            }}
          >
            {(team.team_name?.[0] ?? '?').toUpperCase()}
          </div>
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: textColor, fontFamily: 'Inter, sans-serif' }}>
          {team.team_name}
        </div>
        {team.role && (
          <div style={{ fontSize: 13, color: subColor, marginTop: 2, fontFamily: 'Inter, sans-serif' }}>
            {team.role.charAt(0).toUpperCase() + team.role.slice(1)}
          </div>
        )}
        {team.team_game && (
          <div style={{ fontSize: 12, color: subColor, marginTop: 2 }}>
            {team.team_game}
          </div>
        )}
        {joinedStr && (
          <div style={{ fontSize: 12, color: dateColor, marginTop: 4, fontFamily: 'Inter, sans-serif' }}>
            Joined {joinedStr}
          </div>
        )}
      </div>
    </div>
  );
}
