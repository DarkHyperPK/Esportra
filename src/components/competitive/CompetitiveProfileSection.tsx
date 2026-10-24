import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { InlineNotice } from '@/components/ui/kit';
import { Button } from '@/components/ui/button';
import { useCompetitiveProfile, useUpsertCompetitiveProfile } from '@/hooks/competitive/useCompetitiveProfile';
import { useRankTiers, useGameRoles, useGameRegions } from '@/hooks/competitive/useCatalogCompetitive';
import { usePlatformFeatures, FEATURES } from '@/hooks/usePlatformFeatures';
import { getApiErrorMessage } from '@/lib/apiClient';
import { CompetitiveProfileView } from './CompetitiveProfileView';
import { CompetitiveProfileEditForm } from './CompetitiveProfileEditForm';
import type { UpsertCompetitiveProfileRequest } from '@/types/competitive';

interface CompetitiveProfileSectionProps {
  userId: string;
  isOwnProfile: boolean;
}

const GAME_SLUG = 'valorant';

function SectionSkeleton() {
  return (
    <div className="border border-white/[0.08] bg-white/[0.04] p-4 space-y-3 animate-pulse">
      <div className="h-3 w-32 bg-white/10" />
      <div className="h-16 w-full bg-white/[0.06]" />
      <div className="flex gap-2">
        <div className="h-6 w-20 bg-white/[0.06]" />
        <div className="h-6 w-20 bg-white/[0.06]" />
      </div>
    </div>
  );
}

/**
 * Competitive profile section embedded in the player profile page.
 * Gated by `competitive_profiles` feature flag at component level.
 * Shows rank, roles, region, LFT badge. Own profile: edit in-place (desktop)
 * or navigate to /competitive/profile/edit (mobile, ≤1023px).
 */
export function CompetitiveProfileSection({ userId, isOwnProfile }: CompetitiveProfileSectionProps) {
  const { isEnabled } = usePlatformFeatures();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const navigate = useNavigate();

  const profileQuery = useCompetitiveProfile(userId, GAME_SLUG);
  const rankTiersQuery = useRankTiers(GAME_SLUG);
  const rolesQuery = useGameRoles(GAME_SLUG);
  const regionsQuery = useGameRegions(GAME_SLUG);
  const upsertMutation = useUpsertCompetitiveProfile();

  // Flag gate — silent omission
  if (!isEnabled(FEATURES.competitiveProfiles)) return null;

  // Other user: hide entire section if loading or no profile
  if (!isOwnProfile && (profileQuery.isLoading || !profileQuery.data)) {
    if (profileQuery.isLoading) return <SectionSkeleton />;
    return null;
  }

  const profile = profileQuery.data ?? null;

  async function handleSave(req: UpsertCompetitiveProfileRequest) {
    setSaveError(null);
    try {
      await upsertMutation.mutateAsync(req);
      setIsEditing(false);
    } catch (err) {
      setSaveError(getApiErrorMessage(err, 'Could not save. Check your connection and try again.'));
    }
  }

  function handleEditClick() {
    const isMobile = window.innerWidth < 1024;
    if (isMobile) {
      navigate('/competitive/profile/edit');
    } else {
      setIsEditing(true);
    }
  }

  const catalogReady = rankTiersQuery.data && rolesQuery.data && regionsQuery.data;

  const innerContent = (
    <div className="p-4 space-y-4">
      {profileQuery.isLoading && <SectionSkeleton />}

      {!profileQuery.isLoading && !profile && isOwnProfile && (
        <div className="space-y-3">
          <p className="text-[13px] text-white/55">You haven't set up your competitive profile yet.</p>
          <Button
            variant="outline"
            onClick={handleEditClick}
            className="rounded-none border-white/[0.08] bg-white/[0.04] text-white hover:bg-white/[0.07] w-full sm:w-auto min-h-[44px]"
          >
            Set up competitive profile
          </Button>
        </div>
      )}

      {!profileQuery.isLoading && profile && !isEditing && (
        <CompetitiveProfileView
          profile={profile}
          isOwnProfile={isOwnProfile}
          onEdit={handleEditClick}
        />
      )}

      {!profileQuery.isLoading && isEditing && catalogReady && (
        <CompetitiveProfileEditForm
          profile={profile}
          rankTiers={rankTiersQuery.data!}
          gameRoles={rolesQuery.data!}
          regions={regionsQuery.data!}
          onSave={handleSave}
          onCancel={() => { setIsEditing(false); setSaveError(null); }}
          isSaving={upsertMutation.isPending}
          saveError={saveError}
        />
      )}

      {!profileQuery.isLoading && isEditing && !catalogReady && (
        <InlineNotice tone="critical">Could not load game data. Refresh to try again.</InlineNotice>
      )}
    </div>
  );

  return (
    <div className="border border-white/[0.08] bg-white/[0.04]">
      {/* Section header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-white/35">
          COMPETITIVE PROFILE
        </span>
        {/* Mobile accordion toggle */}
        <button
          type="button"
          aria-expanded={isExpanded}
          aria-controls="competitive-section-content"
          onClick={() => setIsExpanded((p) => !p)}
          className="lg:hidden p-1 text-white/35 hover:text-white"
          aria-label={isExpanded ? 'Collapse competitive profile' : 'Expand competitive profile'}
        >
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {/* Desktop: always visible; mobile: collapsible */}
      <div
        id="competitive-section-content"
        className={isExpanded ? 'block lg:block' : 'hidden lg:block'}
      >
        {innerContent}

        {/* Mobile edit button (own profile, profile exists, not editing) */}
        {isOwnProfile && profile && !isEditing && (
          <div className="px-4 pb-4 lg:hidden">
            <Button
              variant="outline"
              onClick={() => navigate('/competitive/profile/edit')}
              className="w-full min-h-[44px] rounded-none border-white/[0.08] bg-white/[0.04] text-white hover:bg-white/[0.07]"
            >
              Edit competitive profile
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
