import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/contexts/RoleContext';
import { supabase } from '@/lib/supabase';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Maximize2 } from 'lucide-react';
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
  const [activeVersionId, setActiveVersionId] = useState<string | null>(null);
  const [isClearing, setIsClearing] = useState(false);

  // 1. Fetch Tournament & Participants
  const fetchTournamentData = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch tournament
      let tournamentData: any = null;
      const { data: bySlug } = await supabase.from('tournaments').select('*').eq('slug', slug).single();
      if (bySlug) tournamentData = bySlug;
      else {
        const { data: byId } = await supabase.from('tournaments').select('*').eq('id', slug).single();
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

      // Fetch bracket version (active or draft)
      const { data: versionData } = await (supabase as any)
        .from('brkt_versions')
        .select('id')
        .eq('tournament_id', tournamentData.id)
        .in('status', ['active', 'draft'])  // Fetch both active and draft brackets
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (versionData) {
        setActiveVersionId(versionData.id);
      } else {
        setActiveVersionId(null);
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
  }, [slug, toast]);

  useEffect(() => {
    if (slug && !authLoading) {
      fetchTournamentData();
    }
  }, [slug, authLoading, fetchTournamentData]);

  // 2. Realtime Updates - handled by useBracketRealtime via setQueryData (no refetch needed)
  useBracketRealtime({
    tournamentId: tournament?.id,
    versionId: activeVersionId || undefined,
    slug: slug,
    // Real-time updates are now handled via setQueryData in the hook - no callback needed
  });

  // 3. Permissions
  const isOrganizerRole = currentRole === 'organizer';
  const isOrganizerOwner = useMemo(() =>
    isOrganizerRole && !!(user?.id && tournament?.organizer_id && user.id === tournament.organizer_id),
    [isOrganizerRole, user?.id, tournament?.organizer_id]
  );

  const canView = useMemo(() => {
    if (isOrganizerOwner) return true;
    // If bracket is active, everyone can view? Or just participants?
    // Usually public can view brackets.
    return true;
  }, [isOrganizerOwner]);

  // 4. Actions
  const handleBracketGenerated = (versionId: string) => {
    setActiveVersionId(versionId);
    // Update tournament status or other flags if needed
    fetchTournamentData();
  };

  const handleResetBracket = async () => {
    if (!activeVersionId || !tournament?.id) return;
    if (!confirm('Are you sure you want to delete this bracket? This action cannot be undone.')) return;

    setIsClearing(true);
    try {
      // Delete the version (cascade should handle matches, etc. if configured)
      const { error } = await (supabase as any).from('brkt_versions').delete().eq('id', activeVersionId);
      if (error) throw error;

      toast({ title: 'Success', description: 'Bracket deleted.' });
      // Redirect to tournament page (stages tab)
      navigate(`/tournaments/${slug}`);
    } catch (error: any) {
      console.error('Error deleting bracket:', error);
      toast({ title: 'Error', description: 'Failed to delete bracket', variant: 'destructive' });
    } finally {
      setIsClearing(false);
    }
  };

  // 5. Prepare Teams for Generator
  const generatorTeams = useMemo(() => {
    return participants
      .filter(p => p.team_id) // Only teams
      .map(p => ({
        id: p.team_id,
        name: p.team_name || p.roster_name || 'Unknown Team',
        logo_url: p.team_logo
      }))
      // Deduplicate by ID
      .filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
  }, [participants]);


  if (loading) {
    return (
      <div className="min-h-screen bg-esports-dark text-white">
        <main className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-1/3 bg-gaming-gray/20 rounded"></div>
            <div className="h-64 bg-gaming-gray/20 rounded"></div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!tournament) return <div>Tournament not found</div>;

  return (
    <div className="min-h-screen bg-esports-dark text-white">
      <main className="w-full px-4 py-8">
        <div className="w-full">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold">{tournament.name}</h1>
              <p className="text-gray-400">{tournament.game}</p>
            </div>
            <Button
              onClick={() => navigate(isOrganizerOwner ? `/organizer/tournament/${slug}` : `/tournaments/${slug}`)}
              variant="outline"
              className="border-gaming-gray/30"
            >
              Back to Tournament
            </Button>
            <Button
              onClick={() => window.open(`/tournaments/${slug}/brackets/fullscreen`, '_blank')}
              variant="outline"
              className="ml-2 border-gaming-gray/30"
            >
              <Maximize2 className="w-4 h-4 mr-2" />
              Fullscreen
            </Button>
          </div>

          {/* Bracket Content - Container Free */}
          <div className="relative">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-zinc-100">Tournament Brackets</h2>
            </div>

            {activeVersionId ? (
              <div className="w-full overflow-auto bg-zinc-950/50 rounded-xl border border-zinc-800/50 p-6">
                <PublicBracketView
                  versionId={activeVersionId}
                  tournamentId={tournament.id}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 bg-zinc-950/50 rounded-xl border border-zinc-800/50">
                <div className="text-6xl mb-4">🏆</div>
                <h3 className="text-xl font-semibold text-zinc-300 mb-2">Brackets Not Available</h3>
                <p className="text-zinc-500 text-center max-w-md">
                  The tournament bracket has not been generated yet. Check back soon!
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default TournamentBrackets;