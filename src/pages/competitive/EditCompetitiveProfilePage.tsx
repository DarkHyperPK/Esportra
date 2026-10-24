import { useState } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { InlineNotice, PageIntro } from '@/components/ui/kit';
import { useAuth } from '@/hooks/useAuth';
import { useCompetitiveProfile, useUpsertCompetitiveProfile } from '@/hooks/competitive/useCompetitiveProfile';
import { useRankTiers, useGameRoles, useGameRegions } from '@/hooks/competitive/useCatalogCompetitive';
import { usePlatformFeatures, FEATURES } from '@/hooks/usePlatformFeatures';
import { getApiErrorMessage } from '@/lib/apiClient';
import { CompetitiveProfileEditForm } from '@/components/competitive/CompetitiveProfileEditForm';
import type { UpsertCompetitiveProfileRequest } from '@/types/competitive';

const GAME_SLUG = 'valorant';

/**
 * Standalone mobile edit page for the competitive profile.
 * Navigated to from the profile section on screens < 1024px.
 * Gated by auth + competitive_profiles flag.
 */
export default function EditCompetitiveProfilePage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { isEnabled } = usePlatformFeatures();
  const [saveError, setSaveError] = useState<string | null>(null);

  const profileQuery = useCompetitiveProfile(profile?.id ?? '', GAME_SLUG);
  const rankTiersQuery = useRankTiers(GAME_SLUG);
  const rolesQuery = useGameRoles(GAME_SLUG);
  const regionsQuery = useGameRegions(GAME_SLUG);
  const upsertMutation = useUpsertCompetitiveProfile();

  if (!isEnabled(FEATURES.competitiveProfiles)) {
    return <Navigate to="/" replace />;
  }

  if (!profile) {
    return <Navigate to="/auth/signin" replace />;
  }

  const catalogLoading = rankTiersQuery.isLoading || rolesQuery.isLoading || regionsQuery.isLoading;
  const catalogError = rankTiersQuery.isError || rolesQuery.isError || regionsQuery.isError;

  async function handleSave(req: UpsertCompetitiveProfileRequest) {
    setSaveError(null);
    try {
      await upsertMutation.mutateAsync(req);
      navigate(-1);
    } catch (err) {
      setSaveError(getApiErrorMessage(err, 'Could not save. Check your connection and try again.'));
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <div className="px-4 py-8">
        <Link
          to={`/profile/${profile.username}`}
          className="text-[13px] text-white/55 hover:text-white mb-6 inline-block"
        >
          ‹ Competitive profile
        </Link>

        <PageIntro
          eyebrow="COMPETITIVE PROFILE"
          title="Edit Competitive Profile"
          description="Set your Valorant credentials."
          className="mb-8"
        />

        {catalogError && (
          <InlineNotice tone="critical" className="mb-6">
            Could not load game data. Refresh to try again.
          </InlineNotice>
        )}

        {(profileQuery.isLoading || catalogLoading) && (
          <div className="space-y-3 animate-pulse">
            <div className="h-11 bg-white/[0.04] border border-white/[0.06]" />
            <div className="h-11 bg-white/[0.04] border border-white/[0.06]" />
            <div className="h-6 w-48 bg-white/[0.04]" />
          </div>
        )}

        {!profileQuery.isLoading && !catalogLoading && !catalogError && (
          <CompetitiveProfileEditForm
            profile={profileQuery.data ?? null}
            rankTiers={rankTiersQuery.data!}
            gameRoles={rolesQuery.data!}
            regions={regionsQuery.data!}
            onSave={handleSave}
            onCancel={() => navigate(-1)}
            isSaving={upsertMutation.isPending}
            saveError={saveError}
          />
        )}
      </div>
    </div>
  );
}

