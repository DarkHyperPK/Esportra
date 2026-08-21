import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/apiClient';
import { WizardContainer } from '@/components/tournament/wizard';
import { TournamentWizardData, DEFAULT_WIZARD_DATA } from '@/types/tournamentWizard';
import { apiToLaunchState } from '@/utils/tournamentVisibilityUtils';
import { getEffectiveGameFeatures } from '@/utils/gameFeatures';
import { Loader2 } from 'lucide-react';

const EditTournament = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [wizardData, setWizardData] = useState<TournamentWizardData | null>(null);
  const [tournamentId, setTournamentId] = useState<string | null>(null);
  const [participantCount, setParticipantCount] = useState<number>(0);
  const [activeInvitationCount, setActiveInvitationCount] = useState<number>(0);

  const fetchTournamentData = useCallback(async () => {
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

      let activeInvites = 0;
      try {
        const inviteResponse = await apiClient.get<any>(`/api/tournaments/${tournamentData.id}/invitations`);
        activeInvites = inviteResponse?.summary?.activeSlots
          ?? inviteResponse?.summary?.active_slots
          ?? 0;
      } catch {
        activeInvites = 0;
      }
      setActiveInvitationCount(activeInvites);

      const persistedFormat = (tournamentData.format || tournamentData.tournament_type || '').toString().toLowerCase();
      const effectiveFeatures = getEffectiveGameFeatures(tournamentData.game, tournamentData.game_mode);

      // 3. Map to Wizard Data
      // Use local time helpers to avoid UTC↔local timezone drift on each save cycle.
      // datetime-local inputs interpret values as local time, so we must load as local too.
      const startDate = new Date(tournamentData.start_date);
      const endDate = new Date(tournamentData.end_date);
      const regDeadline = new Date(tournamentData.registration_deadline);
      const checkInDeadline = tournamentData.check_in_deadline ? new Date(tournamentData.check_in_deadline) : null;

      // Calculate registration opens (prefer persisted settings, else 7 days before deadline)
      const regOpensFromSettings = (tournamentData.settings as { registrationOpensAt?: string } | null)?.registrationOpensAt;
      const regOpensDate = regOpensFromSettings
        ? new Date(regOpensFromSettings)
        : new Date(regDeadline.getTime() - (7 * 24 * 60 * 60 * 1000));

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
        launchState: apiToLaunchState(tournamentData.status, tournamentData.is_public),
        startDate: toLocalDate(startDate),
        startTime: toLocalTime(startDate),
        endDate: toLocalDate(endDate),
        endTime: toLocalTime(endDate),
        venue: tournamentData.venue || '',
        region: tournamentData.region || '',
        status: tournamentData.status || 'draft',

        // Step 2: Format & Rules
        tournamentType: persistedFormat === 'battle_royale' ? 'battle_royale' : 'bracket',
        gameMode: tournamentData.game_mode || '',
        bracketType: (() => {
          if (persistedFormat === 'battle_royale') {
            return DEFAULT_WIZARD_DATA.bracketType;
          }
          const stageFormat = stages[0]?.format;
          const bracketFormats = ['single_elimination', 'double_elimination', 'swiss', 'round_robin'] as const;
          return bracketFormats.includes(stageFormat)
            ? stageFormat
            : DEFAULT_WIZARD_DATA.bracketType;
        })(),
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
        payoutMethod: (tournamentData.payout_method as 'manual' | 'gateway') || 'manual',
        manualPayoutNotes: tournamentData.manual_payout_notes || '',
        prizeDistribution: tournamentData.prize_distribution ?? null,
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
        autoRemoveUnchecked: tournamentData.auto_remove_unchecked ?? true,
        waitlistEnabled: false, // Default
        waitlistMax: 10, // Default
        invitedTeamsEnabled: (() => {
          const reserved = tournamentData.reserved_invite_slots
            ?? tournamentData.reservedInviteSlots
            ?? (tournamentData.settings as any)?.reservedInviteSlots
            ?? 0;
          return Number(reserved) > 0;
        })(),
        reservedInviteSlots: tournamentData.reserved_invite_slots
          ?? tournamentData.reservedInviteSlots
          ?? (tournamentData.settings as any)?.reservedInviteSlots
          ?? 0,
        inviteExpiryDays: tournamentData.invite_expiry_days
          ?? tournamentData.inviteExpiryDays
          ?? (tournamentData.settings as any)?.inviteExpiryDays
          ?? 7,

        // Game-specific settings
        assistedMatchReporting: !!(tournamentData.settings as any)?.assistedMatchReporting,
        mapVetoEnabled: effectiveFeatures.mapVeto
          ? ((tournamentData.settings as any)?.mapVetoEnabled ?? true)
          : false,

        // Battle Royale settings (from tournament.settings JSON)
        ...(persistedFormat === 'battle_royale' ? {
          brGameCount: (tournamentData.settings as any)?.brGameCount
            ?? (tournamentData.settings as any)?.brDefaultGameCount
            ?? DEFAULT_WIZARD_DATA.brGameCount,
          brScoringPreset: (tournamentData.settings as any)?.brScoringPreset ?? DEFAULT_WIZARD_DATA.brScoringPreset,
          brCustomScoring: (tournamentData.settings as any)?.brCustomScoring ?? null,
          brKillCap: (tournamentData.settings as any)?.brKillCap ?? null,
          brTiebreaker: (tournamentData.settings as any)?.brTiebreaker ?? DEFAULT_WIZARD_DATA.brTiebreaker,
          brDefaultLobbySize: (tournamentData.settings as any)?.brDefaultLobbySize ?? DEFAULT_WIZARD_DATA.brDefaultLobbySize,
          brDefaultMapMode: (tournamentData.settings as any)?.brDefaultMapMode ?? DEFAULT_WIZARD_DATA.brDefaultMapMode,
        } : {}),
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
  }, [slug, toast, navigate]);

  useEffect(() => {
    if (slug) {
      fetchTournamentData();
    }
  }, [slug, fetchTournamentData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center">
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
      activeInvitationCount={activeInvitationCount}
    />
  );
};

export default EditTournament; 
