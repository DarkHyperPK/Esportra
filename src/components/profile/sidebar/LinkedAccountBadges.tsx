import React from 'react';
import type { LinkedAccountsDto } from '@/types/profile';

interface LinkedAccountBadgesProps {
  linkedAccounts: LinkedAccountsDto;
}

/**
 * LinkedAccountBadges: Riot tag and Steam name display.
 * CRITICAL: steam64_id is never rendered anywhere in this component.
 * Steam links to tracker.gg.
 */
export function LinkedAccountBadges({ linkedAccounts }: LinkedAccountBadgesProps): React.JSX.Element | null {
  const hasRiot = !!linkedAccounts.riot?.game_name;
  const hasSteam = !!linkedAccounts.steam?.steam_name;

  if (!hasRiot && !hasSteam) return null;

  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          fontSize: 11,
          color: 'rgba(255,255,255,0.35)',
          letterSpacing: '0.08em',
          marginBottom: 8,
          textTransform: 'none',
        }}
      >
        Linked Accounts
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {hasRiot && linkedAccounts.riot && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <img src="/Riot.png" alt="Riot Games" style={{ width: 20, height: 20, objectFit: 'contain', flexShrink: 0, borderRadius: 3 }} />
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>
              {linkedAccounts.riot.game_name}
              {linkedAccounts.riot.tag_line ? `#${linkedAccounts.riot.tag_line}` : ''}
              {linkedAccounts.riot.region ? ` · ${linkedAccounts.riot.region}` : ''}
            </span>
          </div>
        )}

        {hasSteam && linkedAccounts.steam && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Steam icon — inline SVG */}
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              aria-label="Steam"
              style={{ flexShrink: 0 }}
            >
              <rect width="24" height="24" rx="4" fill="#1B2838" />
              <text x="12" y="16" textAnchor="middle" fontSize="11" fill="#c6d4df" fontWeight="bold">ST</text>
            </svg>
            {linkedAccounts.steam.profile_url ? (
              <a
                href={`https://tracker.gg/valorant/profile/steam/${encodeURIComponent(linkedAccounts.steam.steam_name ?? '')}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', textDecoration: 'none' }}
              >
                {linkedAccounts.steam.steam_name}
              </a>
            ) : (
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>
                {linkedAccounts.steam.steam_name}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
