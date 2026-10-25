import React from 'react';
import { Link } from 'react-router-dom';
import type { CompetitiveProfile } from '@/types/competitive';
import { useCatalogGameRoles } from '@/hooks/competitive/useCatalog';

/**
 * CompetitiveCredentialsInline — Surface 3 (PROJ-075)
 *
 * Compact rank + roles + region card on the user profile Overview tab.
 * Visibility rules:
 *   - isOwnProfile && profile === null  → "set up" prompt
 *   - !isOwnProfile && (null || !profileVisible) → hidden (return null)
 *   - otherwise → rank icon 48px, top-3 roles, region, "View →" link
 *
 * Motion: none per direction contract Surface 3 ("MOTION: None").
 * Skeleton: static (no animate-pulse) per motion spec.
 */

interface Props {
  profile: CompetitiveProfile | null;
  isLoading: boolean;
  isOwnProfile: boolean;
  onViewCompetitive?: () => void;
}

function RankIconFallback({ displayName }: { displayName: string }) {
  return (
    <div
      className="h-12 w-12 shrink-0 bg-white/[0.06] flex items-center justify-center text-[11px] text-white/35 font-mono"
      aria-hidden
    >
      {displayName.slice(0, 2).toUpperCase()}
    </div>
  );
}

export function CompetitiveCredentialsInline({
  profile,
  isLoading,
  isOwnProfile,
  onViewCompetitive,
}: Props): React.JSX.Element | null {
  const { data: roles } = useCatalogGameRoles('valorant');

  // Static skeleton — no animate-pulse per motion spec
  if (isLoading) {
    return (
      <div className="border border-white/[0.06] bg-white/[0.03] p-4" aria-hidden>
        <div className="flex items-center justify-between mb-3">
          <div className="h-3 w-24 bg-white/[0.06]" />
          <div className="h-3 w-12 bg-white/[0.04]" />
        </div>
        <div className="flex items-center gap-3 mb-3">
          <div className="h-12 w-12 bg-white/[0.06] shrink-0" />
          <div className="h-4 w-32 bg-white/[0.06]" />
        </div>
        <div className="flex gap-2">
          <div className="h-6 w-20 bg-white/[0.04]" />
          <div className="h-6 w-20 bg-white/[0.04]" />
        </div>
      </div>
    );
  }

  // Hidden: other user with no profile or profileVisible=false
  if (!isOwnProfile && (profile === null || !profile.profileVisible)) {
    return null;
  }

  // Own profile, no competitive profile set up
  if (profile === null) {
    return (
      <div className="border border-white/[0.06] bg-white/[0.03] p-4">
        <div className="mb-3">
          <span className="text-[11px] font-mono uppercase tracking-wider text-white/40">
            COMPETITIVE
          </span>
        </div>
        <Link
          to="/competitive/profile/edit"
          className="text-[13px] text-white/40 hover:text-white transition-colors"
        >
          Set up your competitive profile →
        </Link>
      </div>
    );
  }

  const topRoles = profile.preferredRoles.slice(0, 3);

  return (
    <div className="border border-white/[0.06] bg-white/[0.03] p-4">
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-mono uppercase tracking-wider text-white/40">
          COMPETITIVE
        </span>
        <button
          type="button"
          onClick={onViewCompetitive}
          className="text-[12px] text-white/40 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          aria-label="View full competitive profile"
        >
          View →
        </button>
      </div>

      {/* Rank row */}
      <div className="flex items-center gap-3 mb-3">
        {profile.rankIconUrl ? (
          <img
            src={profile.rankIconUrl}
            alt={profile.rankDisplayName ?? 'Rank'}
            width={48}
            height={48}
            className="shrink-0"
          />
        ) : (
          <RankIconFallback
            displayName={profile.rankDisplayName ?? profile.rankTierKey ?? 'RK'}
          />
        )}
        <span
          className="text-[18px] font-semibold text-white"
          style={{ fontFamily: "'Poppins', sans-serif" }}
        >
          {profile.rankDisplayName ?? profile.rankTierKey ?? 'Unknown rank'}
        </span>
      </div>

      {/* Roles + region row */}
      <div className="flex flex-wrap items-center gap-2">
        {topRoles.map((roleKey) => {
          const roleData = roles?.find((r) => r.roleKey === roleKey);
          return (
            <div
              key={roleKey}
              className="flex items-center gap-1 px-2 py-1 border border-white/[0.06] text-[12px] text-white/60"
            >
              {roleData?.iconUrl ? (
                <img
                  src={roleData.iconUrl}
                  alt={roleData.displayName}
                  width={14}
                  height={14}
                />
              ) : null}
              <span>{roleData?.displayName ?? roleKey}</span>
            </div>
          );
        })}
        {profile.regionDisplayName && (
          <>
            <span className="text-white/20 select-none" aria-hidden>
              ·
            </span>
            <span className="text-[12px] text-white/35">{profile.regionDisplayName}</span>
          </>
        )}
      </div>
    </div>
  );
}
