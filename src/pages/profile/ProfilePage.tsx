import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Loader2, AlertTriangle } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import type {
  PublicProfileDto,
  UserStatsDto,
  LinkedAccountsDto,
  TournamentHistoryEntryDto,
  TeamMembershipDto,
} from '@/types/profile';
import { useAccentColor } from '@/hooks/useAccentColor';
import { useAuth } from '@/hooks/useAuth';
import { ProfileHero } from '@/components/profile/hero/ProfileHero';
import { ProfileSidebar } from '@/components/profile/sidebar/ProfileSidebar';
import { ProfileTabBar, type ProfileTab } from '@/components/profile/tabs/ProfileTabBar';
import { ProfileOverviewTab } from '@/components/profile/tabs/ProfileOverviewTab';
import { TournamentHistoryTab } from '@/components/profile/tabs/TournamentHistoryTab';
import { TeamsTab } from '@/components/profile/tabs/TeamsTab';
import { AchievementsTab } from '@/components/profile/tabs/AchievementsTab';
import { MatchHistoryTab } from '@/components/profile/tabs/MatchHistoryTab';

/**
 * ProfilePage: top-level route for /profile/:username.
 * Public — no auth required.
 * Computes accent color. Handles 404 and error states.
 */
export default function ProfilePage(): React.JSX.Element {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const [activeTab, setActiveTab] = useState<ProfileTab>('overview');
  const { profile: authProfile } = useAuth();
  const queryClient = useQueryClient();

  const profileQuery = useQuery({
    queryKey: ['public-profile-by-username', username],
    queryFn: () => apiClient.get<PublicProfileDto>(`/api/profiles/by-username/${username}`),
    enabled: !!username,
    staleTime: 5 * 60 * 1000,
    retry: (failureCount, error: unknown) => {
      if ((error as { status?: number })?.status === 404) return false;
      return failureCount < 2;
    },
  });

  const profileId = profileQuery.data?.id;

  const statsQuery = useQuery({
    queryKey: ['public-stats', profileId],
    queryFn: () => apiClient.get<UserStatsDto>(`/api/profiles/${profileId}/stats`),
    enabled: !!profileId,
    staleTime: 5 * 60 * 1000,
  });

  const linkedQuery = useQuery({
    queryKey: ['public-linked', profileId],
    queryFn: () => apiClient.get<LinkedAccountsDto>(`/api/profiles/${profileId}/linked-accounts`),
    enabled: !!profileId,
    staleTime: 5 * 60 * 1000,
  });

  const historyQuery = useQuery({
    queryKey: ['public-history-overview', profileId],
    queryFn: () =>
      apiClient.get<{ items: TournamentHistoryEntryDto[]; has_more: boolean }>(
        `/api/profiles/${profileId}/tournament-history?page=1`,
      ),
    enabled: !!profileId,
    staleTime: 5 * 60 * 1000,
  });

  const teamsQuery = useQuery({
    queryKey: ['public-teams', profileId],
    queryFn: () => apiClient.get<TeamMembershipDto[]>(`/api/profiles/${profileId}/teams`),
    enabled: !!profileId,
    staleTime: 5 * 60 * 1000,
  });

  const accentColor = useAccentColor(
    profileQuery.data ?? ({ country_code: null, riot_tag: null, steam_tag: null } as unknown as PublicProfileDto),
    linkedQuery.data ?? null,
  );

  const isOwner = !!authProfile && authProfile.username === username;

  const bannerPositionMutation = useMutation({
    mutationFn: ({ focalY, zoom }: { focalY: number; zoom: number }) =>
      apiClient.put('/api/profiles/me/banner-position', { focal_y: focalY, zoom }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['public-profile-by-username', username] });
    },
  });

  // Loading state
  if (profileQuery.isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
        }}
      >
        <Loader2 size={32} color="rgba(255,255,255,0.4)" className="animate-spin" />
      </div>
    );
  }

  // 404
  if (profileQuery.error && (profileQuery.error as { status?: number })?.status === 404) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          gap: 16,
          textAlign: 'center',
          padding: 24,
        }}
      >
        <AlertTriangle size={32} color="rgba(255,255,255,0.3)" />
        <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.7)', margin: 0 }}>Profile not found</p>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', margin: 0 }}>
          @{username} doesn&apos;t exist on this platform.
        </p>
        <button
          type="button"
          onClick={() => navigate(-1)}
          style={{
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 6,
            color: '#FFFFFF',
            fontSize: 14,
            padding: '10px 20px',
            cursor: 'pointer',
          }}
        >
          Go back
        </button>
      </div>
    );
  }

  // General error
  if (profileQuery.error) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          gap: 16,
          padding: 24,
        }}
      >
        <AlertTriangle size={32} color="rgba(255,255,255,0.3)" />
        <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.6)', margin: 0 }}>
          Could not load profile
        </p>
        <button
          type="button"
          onClick={() => void profileQuery.refetch()}
          style={{
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 6,
            color: '#FFFFFF',
            fontSize: 14,
            padding: '10px 20px',
            cursor: 'pointer',
          }}
        >
          Try again
        </button>
      </div>
    );
  }

  const profile = profileQuery.data!;

  const stats = statsQuery.data ?? { statistics: null, achievements: [], placement_achievements: [], verified_role: null, achievements_count: 0 };
  const linkedAccounts = linkedQuery.data ?? null;
  const recentTournaments = historyQuery.data?.items ?? [];
  const teams = teamsQuery.data ?? [];

  // Tab animation variants — tab-out / tab-in
  const tabVariants = {
    initial: { opacity: 0 },
    animate: {
      opacity: 1,
      transition: { duration: 0.15, ease: [0, 0, 0.58, 1], delay: reduced ? 0 : 0.04 },
    },
    exit: {
      opacity: 0,
      transition: { duration: reduced ? 0 : 0.08, ease: [0.42, 0, 1, 1] },
    },
  };

  function renderTab(): React.JSX.Element {
    switch (activeTab) {
      case 'overview':
        return (
          <ProfileOverviewTab
            stats={stats}
            recentTournaments={recentTournaments}
            teams={teams}
            accentColor={accentColor}
            onViewAllTournaments={() => setActiveTab('history')}
            onViewAllTeams={() => setActiveTab('teams')}
            profileUsername={profile.username}
          />
        );
      case 'history':
        return <TournamentHistoryTab profileId={profile.id} accentColor={accentColor} />;
      case 'matches':
        return <MatchHistoryTab profileId={profile.id} accentColor={accentColor} />;
      case 'teams':
        return <TeamsTab profileId={profile.id} />;
      case 'achievements':
        return <AchievementsTab profileId={profile.id} accentColor={accentColor} />;
      default:
        return <div />;
    }
  }

  return (
    <div
      style={{ minHeight: '100vh', background: '#0E0E12', color: '#FFFFFF', position: 'relative', overflowX: 'hidden' }}
    >
      {/* Signature background — grid + noise + rose glow blobs */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:100px_100px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_70%)]" />
        <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-15 brightness-100 contrast-150 mix-blend-overlay" />
        <div className="absolute top-[-20%] right-[-10%] w-[60vw] h-[60vw] bg-rose-600/10 blur-[150px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-rose-600/10 blur-[150px] rounded-full mix-blend-screen" />
      </div>

      {/* Content */}
      <div className="relative z-10">
      {/* Hero section */}
      <ProfileHero
            profile={profile}
            accentColor={accentColor}
            isOwner={isOwner}
            onSaveAppearance={async (focalY, zoom) => { await bannerPositionMutation.mutateAsync({ focalY, zoom }); }}
          />

      {/* Tab bar — becomes sticky once hero scrolls past */}
      <ProfileTabBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        accentColor={accentColor}
      />

      {/* Main content */}
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '32px 24px',
          display: 'flex',
          gap: 40,
          alignItems: 'flex-start',
        }}
      >
        {/* Sidebar */}
        <ProfileSidebar profile={profile} linkedAccounts={linkedAccounts} />

        {/* Tab content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              variants={tabVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              {renderTab()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
      </div>{/* end relative z-10 */}
    </div>
  );
}
