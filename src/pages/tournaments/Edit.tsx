import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/apiClient';
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

      // 1. Fetch Tournament Details — returns wrapped { tournament, participants, stages, ... }
      const response = await apiClient.get<any>(`/api/tournaments/${slug}`);
      if (!response?.tournament) throw new Error('Tournament not found');

      const tournamentData = response.tournament;
      // Parse jsonb settings from Dapper (returned as string)
      if (typeof tournamentData.settings === 'string') {
        try { tournamentData.settings = JSON.parse(tournamentData.settings); } catch { /* keep as-is */ }
      }
      console.log('[EditTournament] Parsed settings:', tournamentData.settings);
      setTournamentId(tournamentData.id);

      // 2. Stages from wrapped response, or fetch separately as fallback
      let stages: any[] = response.stages || [];
      if (stages.length === 0) {
        try {
          stages = await apiClient.get<any[]>(`/api/tournaments/${tournamentData.id}/stages`) || [];
        } catch (e) {
          console.error('Error fetching stages:', e);
        }
      }

      // 2.2 Fetch Map Pool (kept as part of tournament data or separate call)
      const mapPoolIds: string[] = tournamentData.map_pool_ids || [];

      // 2.5 Participant count from wrapped response
      const participantCountVal = response.participants?.length || 0;

      setParticipantCount(participantCountVal);

      // 3. Map to Wizard Data
      // Use local time helpers to avoid UTC↔local timezone drift on each save cycle.
      // datetime-local inputs interpret values as local time, so we must load as local too.
      const startDate = new Date(tournamentData.start_date);
      const endDate = new Date(tournamentData.end_date);
      const regDeadline = new Date(tournamentData.registration_deadline);
      const checkInDeadline = tournamentData.check_in_deadline ? new Date(tournamentData.check_in_deadline) : null;

      // Calculate registration opens (default to 7 days before deadline if not set)
      const regOpensDate = new Date(regDeadline.getTime() - (7 * 24 * 60 * 60 * 1000));

      // Helper: format Date to local YYYY-MM-DD
      const toLocalDate = (d: Date) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      };
      // Helper: format Date to local HH:MM
      const toLocalTime = (d: Date) => {
        const h = String(d.getHours()).padStart(2, '0');
        const min = String(d.getMinutes()).padStart(2, '0');
        return `${h}:${min}`;
      };
      // Helper: format Date to local YYYY-MM-DDTHH:MM (for datetime-local inputs)
      const toLocalDateTime = (d: Date) => `${toLocalDate(d)}T${toLocalTime(d)}`;

      const mappedData: TournamentWizardData = {
        ...DEFAULT_WIZARD_DATA,
        // Step 1: Basic Info
        name: tournamentData.name,
        game: tournamentData.game,
        isOnline: tournamentData.is_online ?? true, // Default to true if null
        visibility: tournamentData.is_public ? 'public' : 'unlisted',
        startDate: toLocalDate(startDate),
        startTime: toLocalTime(startDate),
        endDate: toLocalDate(endDate),
        endTime: toLocalTime(endDate),
        venue: tournamentData.venue || '',
        region: tournamentData.region || '',
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
        currency: tournamentData.currency || 'USD',
        paymentInstructions: tournamentData.payment_instructions || '',
        description: tournamentData.description || 'Tournament description goes here.',
        discordUrl: '', // Not in DB schema shown
        twitterUrl: '', // Not in DB schema shown
        streamUrl: tournamentData.stream_url || '',
        rewards: tournamentData.rewards || '',
        rules: tournamentData.rules || '',

        // Step 4: Registration
        registrationOpens: toLocalDateTime(regOpensDate),
        registrationCloses: toLocalDateTime(regDeadline),
        checkInRequired: tournamentData.check_in_required ?? false,
        checkInWindowMinutes: (() => {
          const fromSettings = (tournamentData.settings as any)?.checkInWindowMinutes;
          if (fromSettings && fromSettings >= 5) return fromSettings;
          if (checkInDeadline) {
            const mins = Math.round((startDate.getTime() - checkInDeadline.getTime()) / 60000);
            if (mins >= 5) return mins;
          }
          return 30;
        })(),
        autoRemoveUnchecked: tournamentData.auto_remove_unchecked ?? false,
        waitlistEnabled: false, // Default
        waitlistMax: 10, // Default

        // Game-specific settings
        assistedMatchReporting: !!(tournamentData.settings as any)?.assistedMatchReporting,
        mapVetoEnabled: (tournamentData.settings as any)?.mapVetoEnabled ?? true,
      };

      console.log('[EditTournament] Mapped assistedMatchReporting:', mappedData.assistedMatchReporting);
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
