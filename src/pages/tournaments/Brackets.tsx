import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LoadingSpinner } from '@/components/effects/LoadingSpinner';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/contexts/RoleContext';
import { useAdmin } from '@/contexts/AdminContext';
import { apiClient } from '@/lib/apiClient';
import { useQuery } from '@tanstack/react-query';
import Footer from '@/components/Footer';
import { CommandButton } from '@/components/management/CommandSurface';
import { PublicBracketView } from './brackets/PublicBracketView';
import { useBracketRealtime } from '@/hooks/useBracketRealtime';
import { isBattleRoyale } from '@/utils/gameFeatures';
import { Trophy } from 'lucide-react';

const TournamentBrackets = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const { currentRole } = useRole();
  const admin = useAdmin();

  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  const [isClearing, setIsClearing] = useState(false);

  // 1. Fetch Tournament & Participants
  const tournamentQuery = useQuery({
    queryKey: ['tournament', 'brackets', slug],
    queryFn: () => apiClient.get<any>(`/api/tournaments/${slug}`),
    enabled: !!slug && !authLoading,
    staleTime: 1000 * 60 * 5,
  });

  const tournament = tournamentQuery.data?.tournament ?? null;
  const stages: any[] = tournamentQuery.data?.stages ?? [];
  const participants: any[] = tournamentQuery.data?.participants ?? [];
  const loading = tournamentQuery.isLoading;

  // Fetch bracket versions - Organizers see drafts, others only active
  const isActuallyOrganizer = tournamentQuery.data?.isOrganizer || (user?.id && tournament?.organization?.owner_id === user.id);
  const statusFilter = isActuallyOrganizer ? 'active,draft' : 'active';

  const versionsQuery = useQuery({
    queryKey: ['bracket-versions', tournament?.id, statusFilter],
    queryFn: () => apiClient.get<any[]>(`/api/tournaments/${tournament!.id}/bracket-versions?status=${statusFilter}`),
    enabled: !!tournament?.id,
  });

  const versionsMap = useMemo(() => {
    const vMap: Record<string, string> = {};
    if (versionsQuery.data) {
      versionsQuery.data.forEach((v: any) => {
        if (v.stage_id && !vMap[v.stage_id]) {
          vMap[v.stage_id] = v.id;
        }
      });
    }
    return vMap;
  }, [versionsQuery.data]);

  // Auto-select first stage when data loads
  useEffect(() => {
    if (stages.length > 0 && !selectedStageId) {
      const stageWithBracket = stages.find((s: any) => versionsMap[s.id]);
      setSelectedStageId(stageWithBracket ? stageWithBracket.id : stages[0].id);
    }
  }, [stages, versionsMap, selectedStageId]);

  // Derive active version
  const activeVersionId = useMemo(() => {
    if (!selectedStageId) return null;
    return versionsMap[selectedStageId] || null;
  }, [selectedStageId, versionsMap]);


  // 2. Realtime Updates
  useBracketRealtime({
    tournamentId: tournament?.id,
    versionId: activeVersionId || undefined,
    slug: slug,
  });

  // 3. Permissions
  const isOrganizerRole = currentRole === 'organizer' || admin.hasPermission('tournaments:edit');
  const isOrganizerOwner = useMemo(() =>
    isOrganizerRole && !!(user?.id && tournament?.organization?.owner_id && user.id === tournament.organization.owner_id),
    [isOrganizerRole, user?.id, tournament?.organization?.owner_id]
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent text-white relative">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="border border-white/10 bg-[#0a0a0c] p-8">
            <LoadingSpinner size={80} text="Loading Brackets..." />
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!tournament) return <div>Tournament not found</div>;

  // BR tournaments don't have brackets — show leaderboard placeholder
  if (isBattleRoyale(tournament.game)) {
    return (
      <div className="min-h-screen bg-transparent text-white relative font-sans">
        <main className="w-full px-4 py-8 relative z-10">
          <div className="max-w-4xl mx-auto">
            <div className="border border-white/10 bg-[#0a0a0c] p-8 text-center">
              <Trophy className="h-12 w-12 text-rose-500 mx-auto mb-4" />
              <h2 className="text-2xl font-heading text-white mb-2">Points Leaderboard</h2>
              <p className="text-gray-400 mb-6">
                This is a Battle Royale tournament. Standings are determined by cumulative points across all games.
              </p>
              <CommandButton
                variant="secondary"
                onClick={() => navigate(`/tournaments/${slug}`)}
              >
                View Tournament Details
              </CommandButton>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent text-white relative font-sans">
      <main className="relative z-10 flex min-h-[calc(100vh-5rem)] w-full flex-col px-4 py-8">
        {/* Bracket Content - Glassmorphism Container */}
        <div className="flex min-h-0 w-full flex-1 px-6">
          <div className="flex min-h-0 w-full flex-1 flex-col border border-white/10 bg-[#0a0a0c]/95 p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
                Tournament Brackets
                {selectedStageId && stages.find(s => s.id === selectedStageId) && (
                  <span className="text-zinc-500 text-lg font-normal">
                    / {stages.find(s => s.id === selectedStageId).name}
                  </span>
                )}
              </h2>
            </div>

            {/* 
              We always render PublicBracketView now, so it can show the sidebar with stage selection,
              even if activeVersionId is null (the view handles empty state internally in content area).
            */}
            <div className="min-h-0 w-full flex-1 overflow-hidden border border-zinc-800/50 bg-zinc-950/50">
              <PublicBracketView
                versionId={activeVersionId}
                tournamentId={tournament.id}
                stages={stages}
                selectedStageId={selectedStageId}
                onStageSelect={setSelectedStageId}
                versionsMap={versionsMap}
                onFullscreen={() => window.open(`/tournaments/${slug}/brackets/fullscreen`, '_blank')}
                mode="page"
              />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default TournamentBrackets;
