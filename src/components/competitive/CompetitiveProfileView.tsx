import { RankBadge } from './RankBadge';
import { RoleChip } from './RoleChip';
import { RegionLabel } from './RegionLabel';
import { LftBadge } from './LftBadge';
import type { CompetitiveProfile } from '@/types/competitive';

interface CompetitiveProfileViewProps {
  profile: CompetitiveProfile;
  isOwnProfile: boolean;
  onEdit?: () => void;
}

const EXPERIENCE_LABELS: Record<string, string> = {
  casual: 'Casual',
  amateur: 'Amateur',
  semi_pro: 'Semi-pro',
  pro: 'Pro',
};

const ENVIRONMENT_LABELS: Record<string, string> = {
  casual: 'Casual',
  competitive: 'Competitive',
  pro: 'Pro',
};

const showLft = (p: CompetitiveProfile) => p.lftStatus === 'open' && p.lftVisible;

/**
 * Read-only view of a player's competitive profile.
 * Shows rank badge, roles, region, and optional secondary attributes.
 */
export function CompetitiveProfileView({ profile, isOwnProfile, onEdit }: CompetitiveProfileViewProps) {
  const experienceLabel = profile.experienceLevel ? EXPERIENCE_LABELS[profile.experienceLevel] : null;
  const environmentLabel = profile.preferredEnvironment ? ENVIRONMENT_LABELS[profile.preferredEnvironment] : null;

  return (
    <div className="space-y-3">
      {/* Game tab + edit link */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Active tab — uses a relative+pseudo underline so no rose on <button> */}
          <div
            role="tab"
            aria-selected
            className="relative font-mono text-[11px] font-semibold uppercase tracking-widest text-white pb-1"
          >
            VALORANT
            {/* 2px rose underline via absolute positioned span — avoids rose border on interactive elements */}
            <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-rose-500" aria-hidden />
          </div>
          {isOwnProfile && (
            <span
              className="font-mono text-[11px] uppercase tracking-widest text-white/35 cursor-not-allowed"
              title="More games coming soon."
            >
              + Add game
            </span>
          )}
        </div>
        {isOwnProfile && onEdit && (
          <button
            type="button"
            aria-label="Edit competitive profile"
            onClick={onEdit}
            className="text-[13px] text-white/55 hover:text-white transition-colors"
          >
            Edit
          </button>
        )}
      </div>

      {/* Rank badge */}
      {profile.rankTierDisplayName ? (
        <RankBadge
          tierDisplayName={profile.rankTierDisplayName}
          provenance={profile.rankProvenance}
          size="full"
        />
      ) : (
        <div className="border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-[13px] text-white/35">
          No rank set
        </div>
      )}

      {/* Roles */}
      {profile.roles.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {profile.roles.map((role) => (
            <RoleChip
              key={role}
              role={role}
              displayName={role.toUpperCase()}
              mode="display"
              isMain={role === profile.mainRole}
            />
          ))}
        </div>
      )}

      {/* Region / server + LFT badge */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <RegionLabel
          region={profile.regionDisplayName}
          server={profile.servers[0] ?? null}
        />
        {showLft(profile) && <LftBadge />}
      </div>

      {/* Languages */}
      {profile.languages.length > 0 && (
        <p className="text-[13px] text-white/55">
          {profile.languages.join(' · ')}
        </p>
      )}

      {/* Experience / environment */}
      {(experienceLabel || environmentLabel) && (
        <p className="text-[13px] text-white/55">
          {[experienceLabel, environmentLabel].filter(Boolean).join(' · ')}
        </p>
      )}
    </div>
  );
}
