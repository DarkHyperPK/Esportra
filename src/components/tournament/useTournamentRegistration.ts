import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { apiClient } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';
import { sendEmail } from '@/hooks/useEmail';
import {
  RegistrationDetails,
  RegistrationType,
  RegistrationStatus,
  TeamMember,
  RegistrationError,
  RegistrationFormData
} from '@/types/tournament';
import esportsGames from '@/data/esportsGames.json';

interface UseTournamentRegistrationProps {
  tournamentId: string;
  tournamentName: string;
  teamSize: number;
  onSuccess?: (registration: RegistrationDetails | null) => void;
  isEdit?: boolean;
  initialData?: RegistrationDetails | null;
}

interface RegistrationState {
  type: RegistrationType;
  riot_tag: string;
  steam_tag: string;
  teamName: string;
  teamMembers: string[];
  status: RegistrationStatus;
}

export const useTournamentRegistration = ({
  tournamentId,
  tournamentName,
  teamSize,
  onSuccess,
  isEdit = false,
  initialData
}: UseTournamentRegistrationProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<RegistrationError | null>(null);

  // Consolidated state using a single state object
  const [registrationState, setRegistrationState] = useState<RegistrationState>(() => ({
    type: initialData?.team_name ? 'team' : 'solo',
    riot_tag: (initialData as any)?.riot_tag || initialData?.gamer_tag || '',
    steam_tag: (initialData as any)?.steam_tag || '',
    teamName: initialData?.team_name || '',
    teamMembers: initialData?.team_members ? initialData.team_members.split(',') : Array(teamSize).fill(''),
    status: initialData?.status || 'registered'
  }));

  // Reset state when initialData changes
  useEffect(() => {
    if (initialData) {
      setRegistrationState({
        type: initialData.team_name ? 'team' : 'solo',
        riot_tag: (initialData as any)?.riot_tag || initialData.gamer_tag || '',
        steam_tag: (initialData as any)?.steam_tag || '',
        teamName: initialData.team_name || '',
        teamMembers: initialData.team_members ? initialData.team_members.split(',') : Array(teamSize).fill(''),
        status: initialData.status
      });
    }
  }, [initialData, teamSize]);

  // Memoized validation function
  const validateRegistration = useCallback((): string | null => {
    if (!user?.id) {
      return "You need to be logged in to register for tournaments";
    }

    if (registrationState.type === 'solo' && !registrationState.riot_tag && !registrationState.steam_tag) {
      return "Please enter your game ID (Riot ID or Steam ID)";
    }

    if (registrationState.type === 'team') {
      if (!registrationState.teamName) {
        return "Please enter your team name";
      }

      const validMembers = registrationState.teamMembers.filter(member => member.trim() !== '');
      if (validMembers.length < teamSize) {
        return `Please enter all ${teamSize} team member names`;
      }
    }

    return null;
  }, [user?.id, registrationState, teamSize]);

  const handleRegistration = async (override?: Partial<RegistrationState> & {
    coach?: string;
    substitute?: string;
    teamCaptain?: string;
    teamLogo?: string;
  }) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to register for tournaments.",
        variant: "destructive",
      });
      return;
    }

    try {
      setError(null);
      setIsSubmitting(true);
      console.log('[useTournamentRegistration] Starting registration process');

      // Use override values if provided, else fall back to registrationState
      const state = {
        ...registrationState,
        ...override,
      };

      const validationError = validateRegistration();
      if (validationError) {
        console.log('[useTournamentRegistration] Validation error:', validationError);
        throw new Error(validationError);
      }

      // Build team members array for 5v5 with coach/sub if provided
      const teamMembersArr = [...(state.teamMembers || [])];
      if (state.type === 'team' && teamSize === 5) {
        if (override?.coach) teamMembersArr[5] = override.coach;
        if (override?.substitute) teamMembersArr[6] = override.substitute;
      }

      const registrationData = {
        tournament_id: tournamentId,
        user_id: user.id,
        participant_type: state.type,
        riot_tag: state.type === 'solo' ? state.riot_tag : null,
        steam_tag: state.type === 'solo' ? state.steam_tag : null,
        team_name: state.type === 'team' ? state.teamName : null,
        team_captain: state.type === 'team' ? (override?.teamCaptain || null) : null,
        team_members: state.type === 'team' ? teamMembersArr.join(',') : null,
        team_logo_url: state.type === 'team' ? (override?.teamLogo || null) : null,
        user_email: user.email || null,
        status: 'registered',
        created_at: new Date().toISOString()
      };

      console.log('[useTournamentRegistration] Saving registration:', registrationData);

      const { data } = await apiClient.post<any>(
        `/api/tournaments/${tournamentId}/register`,
        registrationData
      );
      const dbError = null;

      if (dbError) {
        console.error('[useTournamentRegistration] Registration error:', dbError);
        throw dbError;
      }

      console.log('[useTournamentRegistration] Registration saved successfully:', data);

      toast({
        title: "Registration Successful",
        description: `You have successfully registered for ${tournamentName}!`,
      });

      // Send confirmation email (fire-and-forget, don't block registration)
      if (user.email) {
        sendEmail({
          type: 'TournamentRegistration',
          email: user.email,
          data: {
            username: user.user_metadata?.username || user.user_metadata?.full_name || '',
            tournamentName,
            gamertag: state.type === 'solo' ? (state.riot_tag || state.steam_tag) : undefined,
            teamName: state.type === 'team' ? state.teamName : undefined,
            registrationType: state.type,
            tournamentUrl: `https://esportra.com/tournaments/${tournamentId}`,
          },
        }).catch((err) => console.warn('[Registration] Email send failed (non-critical):', err));
      }

      if (onSuccess) {
        const registrationDetails: RegistrationDetails = {
          id: data?.id || '',
          tournament_id: tournamentId,
          user_id: user.id,
          riot_tag: state.type === 'solo' ? state.riot_tag : '',
          steam_tag: state.type === 'solo' ? state.steam_tag : '',
          gamer_tag: state.type === 'solo' ? (state.riot_tag || state.steam_tag) : state.teamName || '',
          team_name: state.type === 'team' ? state.teamName : null,
          team_members: state.type === 'team' ? teamMembersArr.join(',') : null,
          team_logo: state.type === 'team' ? (override?.teamLogo || null) : null,
          status: 'registered',
          registered_at: new Date().toISOString(),
          created_at: data?.created_at || new Date().toISOString(),
          updated_at: data?.created_at || new Date().toISOString()
        };
        onSuccess(registrationDetails);
      }
    } catch (err: unknown) {
      const e = err as { message?: string };
      console.error('[useTournamentRegistration] Error registering for tournament:', err);
      setError(e as RegistrationError);
      toast({
        title: "Registration Failed",
        description: e.message || "Failed to register for the tournament. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWithdraw = async () => {
    if (!user) return;

    try {
      setError(null);
      console.log('[useTournamentRegistration] Starting withdrawal process for tournament:', tournamentId, 'user:', user.id);

      // First, check if registration exists - check both user_id (solo) and team_captain_id (team)
      let existingRegistration: any = null;
      try {
        existingRegistration = await apiClient.get<any>(
          `/api/tournaments/me/registration-status?tournamentId=${tournamentId}`
        );
      } catch {
        // No registration found
      }

      if (!existingRegistration) {
        console.log('[useTournamentRegistration] No registration found to withdraw');
        if (onSuccess) {
          onSuccess(null);
        }
        return;
      }

      console.log('[useTournamentRegistration] Found registration:', existingRegistration);

      // Verify the user has permission to withdraw (must be the registered user or team captain)
      const isSoloRegistration = existingRegistration.participant_type === 'solo' && existingRegistration.user_id === user.id;
      const isTeamCaptain = existingRegistration.participant_type === 'team' && (existingRegistration as any).team_captain_id === user.id;

      if (!isSoloRegistration && !isTeamCaptain) {
        console.error('[useTournamentRegistration] User does not have permission to withdraw this registration');
        throw new Error('You do not have permission to withdraw this registration.');
      }

      // Delete the registration
      await apiClient.delete(`/api/tournaments/${tournamentId}/register`);

      console.log('[useTournamentRegistration] Withdrawal successful');

      toast({
        title: "Registration Withdrawn",
        description: "Your tournament registration has been withdrawn.",
      });

      if (onSuccess) {
        onSuccess(null);
      }
    } catch (err: unknown) {
      const e = err as { message?: string };
      console.error('[useTournamentRegistration] Error withdrawing registration:', err);
      setError(e as RegistrationError);
      toast({
        title: "Withdrawal Failed",
        description: e.message || "Failed to withdraw from the tournament. Please try again.",
        variant: "destructive",
      });
    }
  };

  const uploadTeamLogo = async (file: File, teamName: string): Promise<string | null> => {
    if (!file) return null;

    try {
      const sanitizedTeamName = teamName.replace(/[^a-z0-9]/gi, '-').toLowerCase();
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}-${Date.now()}.${fileExt}`;
      const filePath = `${sanitizedTeamName}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('tournaments')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('tournaments')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error: unknown) {
      const e = error as { message?: string };
      console.error("Logo upload error:", error);
      toast({
        title: "Upload Failed",
        description: e.message || "Failed to upload team logo",
        variant: "destructive",
      });
      return null;
    }
  };

  return {
    isSubmitting,
    error,
    registrationType: registrationState.type,
    setRegistrationType: (type: RegistrationType) =>
      setRegistrationState(prev => ({ ...prev, type })),
    riot_tag: registrationState.riot_tag,
    setRiotTag: (riot_tag: string) =>
      setRegistrationState(prev => ({ ...prev, riot_tag })),
    steam_tag: registrationState.steam_tag,
    setSteamTag: (steam_tag: string) =>
      setRegistrationState(prev => ({ ...prev, steam_tag })),
    teamName: registrationState.teamName,
    setTeamName: (teamName: string) =>
      setRegistrationState(prev => ({ ...prev, teamName })),
    teamMembers: registrationState.teamMembers,
    setTeamMembers: (teamMembers: string[]) =>
      setRegistrationState(prev => ({ ...prev, teamMembers })),
    handleRegistration,
    handleWithdraw,
    validateRegistration,
    uploadTeamLogo
  };
};
