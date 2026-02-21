import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { WizardContainer } from '@/components/tournament/wizard';
import { TournamentWizardData, DEFAULT_WIZARD_DATA } from '@/types/tournamentWizard';
import { Loader2 } from 'lucide-react';

const EditTournament = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [wizardData, setWizardData] = useState<TournamentWizardData | null>(null);
  const [tournamentId, setTournamentId] = useState<string | null>(null);
  const [participantCount, setParticipantCount] = useState<number>(0);

  useEffect(() => {
    if (slug) {
      fetchTournamentData();
    }
  }, [slug]);

  const fetchTournamentData = async () => {
    try {
      setLoading(true);

      // 1. Fetch Tournament Details (try slug first, then ID)
      let tournamentData: any = null;

      const { data: bySlug, error: slugError } = await supabase
        .from('tournaments')
        .select('*')
        .eq('slug', slug)
        .single();

      if (bySlug) {
        tournamentData = bySlug;
      } else {
        const { data: byId, error: idError } = await supabase
          .from('tournaments')
          .select('*')
          .eq('id', slug)
          .single();

        if (byId) {
          tournamentData = byId;
        } else {
          throw new Error('Tournament not found');
        }
      }

      setTournamentId(tournamentData.id);

      // 2. Fetch Stages
      // 2. Fetch Stages
      const { data: stages, error: stagesError } = await supabase
        .from('tournament_stages')
        .select('*')
        .eq('tournament_id', tournamentData.id)
        .order('stage_order', { ascending: true });

      if (stagesError) throw stagesError;

      // 2.2 Fetch Map Pool
      const { data: mapPoolData, error: mapPoolError } = await supabase
        .from('tournament_map_pools')
        .select('map_id')
        .eq('tournament_id', tournamentData.id);

      if (mapPoolError) console.error('Error fetching map pool:', mapPoolError);
      const mapPoolIds = mapPoolData?.map(m => m.map_id) || [];

      // 2.5 Fetch Participant Count
      const { count: participantCount, error: countError } = await supabase
        .from('tournament_participants')
        .select('*', { count: 'exact', head: true })
        .eq('tournament_id', tournamentData.id);

      if (countError) console.error('Error fetching count:', countError);

      setParticipantCount(participantCount || 0);

      // 3. Map to Wizard Data
      const startDate = new Date(tournamentData.start_date);
      const endDate = new Date(tournamentData.end_date);
      const regDeadline = new Date(tournamentData.registration_deadline);
      const checkInDeadline = tournamentData.check_in_deadline ? new Date(tournamentData.check_in_deadline) : null;

      // Calculate registration opens (default to 7 days before deadline if not set)
      const regOpensDate = new Date(regDeadline.getTime() - (7 * 24 * 60 * 60 * 1000));

      const mappedData: TournamentWizardData = {
        ...DEFAULT_WIZARD_DATA,
        // Step 1: Basic Info
        name: tournamentData.name,
        game: tournamentData.game,
        isOnline: tournamentData.is_online ?? true, // Default to true if null
        visibility: tournamentData.is_public ? 'public' : 'unlisted',
        startDate: startDate.toISOString().split('T')[0],
        startTime: startDate.toTimeString().slice(0, 5),
        endDate: endDate.toISOString().split('T')[0],
        endTime: endDate.toTimeString().slice(0, 5),
        venue: tournamentData.venue || '',
        status: tournamentData.status || 'draft',

        // Step 2: Format & Rules
        bracketType: (stages.length > 0 ? stages[0].format : 'single_elimination') as any, // Derive from first stage
        stages: stages.map(s => ({
          id: s.id,
          name: s.name,
          format: s.format as any,
          stage_order: s.stage_order,
          best_of: (s as any).best_of || 1
        })),
        maxTeams: tournamentData.max_teams ?? DEFAULT_WIZARD_DATA.maxTeams,
        teamSize: tournamentData.team_size ?? DEFAULT_WIZARD_DATA.teamSize,
        seedingType: 'random', // Default, as it's not strictly stored in tournament row usually
        thirdPlaceMatch: false, // Default
        mapPoolIds: mapPoolIds,

        // Step 3: Branding
        bannerUrl: tournamentData.banner_url,
        logoUrl: tournamentData.logo_url,
        prizePool: tournamentData.prize_pool?.toString() || '0',
        entryFee: tournamentData.entry_fee?.toString() || 'Free',
        description: tournamentData.description || 'Tournament description goes here.',
        discordUrl: '', // Not in DB schema shown
        twitterUrl: '', // Not in DB schema shown
        streamUrl: tournamentData.stream_url || '',
        rewards: tournamentData.rewards || '',

        // Step 4: Registration
        registrationOpens: regOpensDate.toISOString().split('T')[0],
        registrationCloses: regDeadline.toISOString().split('T')[0],
        checkInRequired: tournamentData.check_in_required ?? false,
        checkInWindowMinutes: (tournamentData.settings as any)?.checkInWindowMinutes ||
          (checkInDeadline
            ? Math.round((startDate.getTime() - checkInDeadline.getTime()) / 60000)
            : 30),
        autoRemoveUnchecked: tournamentData.auto_remove_unchecked ?? false,
        waitlistEnabled: false, // Default
        waitlistMax: 10, // Default
      };

      setWizardData(mappedData);

    } catch (error: any) {
      console.error('Error fetching tournament data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load tournament data.',
        variant: 'destructive',
      });
      navigate('/organizer/tournaments');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-esports-dark flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-gaming-purple animate-spin" />
      </div>
    );
  }

  if (!wizardData || !tournamentId) {
    return null; // Should have redirected
  }

  return (
    <WizardContainer
      initialData={wizardData}
      tournamentId={tournamentId}
      participantsCount={participantCount}
    />
  );
};

export default EditTournament; 
