import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LoadingSpinner } from '@/components/effects/LoadingSpinner';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/contexts/RoleContext';
import { supabase } from '@/lib/supabase';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Maximize2, Layers } from 'lucide-react';
import { PublicBracketView } from './brackets/PublicBracketView';
import { useBracketRealtime } from '@/hooks/useBracketRealtime';

const TournamentBrackets = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const { currentRole } = useRole();

  const [tournament, setTournament] = useState<any | null>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [stages, setStages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Map of stage_id -> latest version_id
  const [versionsMap, setVersionsMap] = useState<Record<string, string>>({});
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);

  const [isClearing, setIsClearing] = useState(false);

  // 1. Fetch Tournament & Participants
  const fetchTournamentData = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch tournament
      const querySpec = '*, organization:organizations(owner_id)';
      let tournamentData: any = null;
      const { data: bySlug } = await supabase.from('tournaments').select(querySpec).eq('slug', slug).single();
      if (bySlug) tournamentData = bySlug;
      else {
        const { data: byId } = await supabase.from('tournaments').select(querySpec).eq('id', slug).single();
        if (byId) tournamentData = byId;
      }

      if (!tournamentData) throw new Error('Tournament not found');
      setTournament(tournamentData);

      // Fetch stages
      const { data: stagesData } = await supabase
        .from('tournament_stages')
        .select('*')
        .eq('tournament_id', tournamentData.id)
        .order('stage_order', { ascending: true });

      setStages(stagesData || []);

      // Default selected stage to the first one if not set
      if (stagesData && stagesData.length > 0 && !selectedStageId) {
        // Check if we can find a stage with a bracket first? 
        // For now just pick the first stage or the current ongoing one logic (omitted for simplicity, picking first)
        setSelectedStageId(stagesData[0].id);
      }

      // Fetch bracket versions - Organizers see drafts, others only active
      const isActuallyOrganizer = user?.id && tournamentData.organization?.owner_id === user.id;
      const statusFilter = isActuallyOrganizer ? ['active', 'draft'] : ['active'];

      const { data: versionsData } = await (supabase as any)
        .from('brkt_versions')
        .select('id, stage_id, status, created_at')
        .eq('tournament_id', tournamentData.id)
        .in('status', statusFilter)
        .order('created_at', { ascending: false });

      // Process versions to find latest for each stage
      const vMap: Record<string, string> = {};
      if (versionsData) {
        // Since it's ordered by desc, the first one we encounter for a stage is the latest
        versionsData.forEach((v: any) => {
          if (v.stage_id && !vMap[v.stage_id]) {
            vMap[v.stage_id] = v.id;
          }
        });
      }
      setVersionsMap(vMap);

      // If we didn't have a selected stage but now we have versions, maybe pick the stage that has a version?
      if (!selectedStageId && stagesData && stagesData.length > 0) {
        const stageWithBracket = stagesData.find((s: any) => vMap[s.id]);
        setSelectedStageId(stageWithBracket ? stageWithBracket.id : stagesData[0].id);
      } else if (selectedStageId && !stagesData?.find(s => s.id === selectedStageId)) {
        // If selected stage is invalid (e.g. from previous load?), reset
        if (stagesData && stagesData.length > 0) setSelectedStageId(stagesData[0].id);
      }


      // Fetch participants (for team list in generator and access control)
      const { data: parts } = await supabase
        .from('tournament_participants')
        .select('*')
        .eq('tournament_id', tournamentData.id);

      setParticipants(parts || []);

    } catch (error: any) {
      console.error('Error fetching tournament:', error);
      toast({ title: 'Error', description: 'Failed to load tournament data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [slug, toast]); // Removed selectedStageId dependency to avoid loop, it's handled inside

  useEffect(() => {
    if (slug && !authLoading) {
      fetchTournamentData();
    }
  }, [slug, authLoading, fetchTournamentData]);

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
  const isOrganizerRole = currentRole === 'organizer';
  const isOrganizerOwner = useMemo(() =>
    isOrganizerRole && !!(user?.id && tournament?.organization?.owner_id && user.id === tournament.organization.owner_id),
    [isOrganizerRole, user?.id, tournament?.organization?.owner_id]
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent text-white relative">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="p-8 rounded-2xl bg-black/80 backdrop-blur-xl border border-white/10 shadow-2xl">
            <LoadingSpinner size={80} text="Loading Brackets..." />
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!tournament) return <div>Tournament not found</div>;

  return (
    <div className="min-h-screen bg-transparent text-white relative overflow-hidden font-sans">
      <main className="w-full px-4 py-8 relative z-10">
        {/* Bracket Content - Glassmorphism Container */}
        <div className="w-full px-6">
          <div className="p-6 rounded-2xl bg-black/20 backdrop-blur-xl border border-white/10 shadow-2xl">
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
            <div className="w-full overflow-auto bg-zinc-950/50 rounded-xl border border-zinc-800/50 p-6">
              <PublicBracketView
                versionId={activeVersionId}
                tournamentId={tournament.id}
                stages={stages}
                selectedStageId={selectedStageId}
                onStageSelect={setSelectedStageId}
                versionsMap={versionsMap}
                onFullscreen={() => window.open(`/tournaments/${slug}/brackets/fullscreen`, '_blank')}
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
