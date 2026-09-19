import React from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { useReducedMotion } from 'framer-motion';
import type { PublicProfileDto, UserStatsDto, LinkedAccountsDto } from '@/types/profile';
import { TournamentTimelineItem } from '@/components/profile/history/TournamentTimelineItem';
import { SocialLinks } from '@/components/profile/sidebar/SocialLinks';
import { useAccentColor } from '@/hooks/useAccentColor';
import { format, parseISO } from 'date-fns';
import { getCountryFlagUrl } from '@/utils/countries';

interface ProfilePeekContentProps {
  profile: PublicProfileDto;
  stats: UserStatsDto;
  linkedAccounts: LinkedAccountsDto;
  tournamentHistory: import('@/types/profile').TournamentHistoryEntryDto[];
  teams: import('@/types/profile').TeamMembershipDto[];
  onClose: () => void;
}

/**
 * ProfilePeekContent: the data-loaded inner content of the peek sheet.
 * Separate from the sheet frame so animation is not coupled to data loading state.
 */
export function ProfilePeekContent({
  profile,
  stats: _stats,
  linkedAccounts,
  tournamentHistory,
  teams,
  onClose,
}: ProfilePeekContentProps): React.JSX.Element {
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const accentColor = useAccentColor(profile, linkedAccounts);

  const displayName = profile.full_name || profile.username;
  const lastThreeTournaments = tournamentHistory.slice(0, 3);
  const activeTeams = teams.filter((t) => t.is_active).slice(0, 3);

  const hasLinkedAccounts = !!linkedAccounts.riot || !!linkedAccounts.steam || !!linkedAccounts.discord;
  const hasBio = !!profile.bio;
  const hasSocials = !!(
    profile.social_links && (
      profile.social_links.twitter ||
      profile.social_links.twitch ||
      profile.social_links.youtube ||
      profile.social_links.instagram ||
      profile.social_links.discord_handle
    )
  );

  const memberSince = (() => {
    try { return format(parseISO(profile.created_at), 'MMM yyyy'); }
    catch { return ''; }
  })();

  const ctaHoverStyle = reduced ? {} : undefined;

  return (
    <>
      <style>{`
        @media (hover: hover) {
          .peek-cta-btn:hover {
            transform: translateY(-1px);
          }
        }
        .peek-cta-btn {
          transition: transform 120ms cubic-bezier(0, 0, 0.58, 1);
        }
        .peek-cta-btn:active {
          transform: translateY(0);
        }
      `}</style>

      <div style={{ padding: '20px', position: 'relative' }}>
        {/* Close button — top right */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close profile peek"
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            width: 44,
            height: 44,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: 'rgba(255,255,255,0.5)',
            borderRadius: 6,
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <X size={20} />
        </button>

        {/* Avatar + name row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16, paddingRight: 44 }}>
          {/* Avatar */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                border: `2px solid ${accentColor}`,
                overflow: 'hidden',
                background: '#1a1a24',
              }}
            >
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={displayName}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'opacity 150ms ease-out' }}
                />
              ) : (
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 24,
                    fontWeight: 700,
                    color: accentColor,
                  }}
                >
                  {(displayName[0] ?? '?').toUpperCase()}
                </div>
              )}
            </div>
          </div>

          {/* Name + username */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontFamily: 'Inter, sans-serif',
                fontWeight: 700,
                fontSize: 18,
                color: '#FFFFFF',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {displayName}
            </div>
            <div
              style={{
                fontFamily: 'Inter, sans-serif',
                fontWeight: 400,
                fontSize: 13,
                color: 'rgba(255,255,255,0.5)',
                marginTop: 2,
              }}
            >
              @{profile.username}
            </div>
            {/* Country */}
            {profile.country_code && (
              <div
                style={{
                  fontSize: 12,
                  color: 'rgba(255,255,255,0.4)',
                  marginTop: 2,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <img
                  src={getCountryFlagUrl(profile.country_code)}
                  alt={profile.country_code}
                  style={{ width: 16, height: 12, objectFit: 'cover', borderRadius: 2, flexShrink: 0 }}
                />
                {profile.location ? ` · ${profile.location}` : ''}
              </div>
            )}
            {memberSince && (
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
                Since {memberSince}
              </div>
            )}
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', marginBottom: 12 }} />

        {/* Bio snippet */}
        {hasBio && (
          <div
            style={{
              fontFamily: 'Inter, sans-serif',
              fontWeight: 400,
              fontSize: 13,
              color: 'rgba(255,255,255,0.7)',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              maxWidth: '100%',
              marginBottom: 16,
            }}
          >
            {profile.bio!.slice(0, 100)}
            {profile.bio!.length > 100 ? '…' : ''}
          </div>
        )}

        {/* Active teams chips */}
        {activeTeams.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
            {activeTeams.map((team) => (
              <div
                key={team.membership_id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  height: 24,
                  paddingLeft: 8,
                  paddingRight: 8,
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 6,
                  fontSize: 12,
                  color: 'rgba(255,255,255,0.8)',
                  whiteSpace: 'nowrap',
                }}
              >
                {team.team_logo_url && (
                  <img
                    src={team.team_logo_url}
                    alt={team.team_name ?? ''}
                    style={{ width: 16, height: 16, borderRadius: 2, objectFit: 'cover' }}
                  />
                )}
                {team.team_name}
              </div>
            ))}
          </div>
        )}

        {/* Last 3 tournaments */}
        <div style={{ marginBottom: 16 }}>
          {lastThreeTournaments.length === 0 ? (
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', padding: '4px 0' }}>
              No tournament history yet
            </div>
          ) : (
            lastThreeTournaments.map((entry, i) => (
              <TournamentTimelineItem
                key={entry.tournament_id}
                entry={entry}
                accentColor={accentColor}
                abbreviated={true}
                index={i}
              />
            ))
          )}
        </div>

        {/* Linked account badges */}
        {hasLinkedAccounts && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
            {linkedAccounts.riot?.game_name && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <img src="/Riot.png" alt="Riot Games" style={{ width: 18, height: 18, objectFit: 'contain', flexShrink: 0, borderRadius: 3 }} />
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {linkedAccounts.riot.game_name}#{linkedAccounts.riot.tag_line}
                </span>
              </div>
            )}
            {linkedAccounts.steam?.steam_name && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ background: '#1B2838', borderRadius: 3, padding: '1px 6px', fontSize: 10, fontWeight: 700, color: '#c6d4df', flexShrink: 0 }}>STEAM</span>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {linkedAccounts.steam.steam_name}
                </span>
              </div>
            )}
            {linkedAccounts.discord?.handle && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ background: '#5865F2', borderRadius: 3, padding: '1px 6px', fontSize: 10, fontWeight: 700, color: 'white', flexShrink: 0 }}>DC</span>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {linkedAccounts.discord.handle}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Social links */}
        {hasSocials && profile.social_links && (
          <SocialLinks socials={profile.social_links} />
        )}

        {/* View full profile CTA */}
        <button
          type="button"
          className="peek-cta-btn"
          onClick={() => { onClose(); navigate(`/profile/${profile.username}`); }}
          style={{
            ...(ctaHoverStyle as React.CSSProperties),
            width: '100%',
            height: 40,
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 6,
            color: '#FFFFFF',
            fontSize: 13,
            fontFamily: 'Inter, sans-serif',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          View full profile
        </button>
      </div>
    </>
  );
}
