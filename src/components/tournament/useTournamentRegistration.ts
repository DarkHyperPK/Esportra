import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
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
  gamertag: string;
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
    gamertag: initialData?.gamer_tag || '',
    teamName: initialData?.team_name || '',
    teamMembers: initialData?.team_members ? initialData.team_members.split(',') : Array(teamSize).fill(''),
    status: initialData?.status || 'registered'
  }));

  // Reset state when initialData changes
  useEffect(() => {
    if (initialData) {
      setRegistrationState({
        type: initialData.team_name ? 'team' : 'solo',
        gamertag: initialData.gamer_tag || '',
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

    if (registrationState.type === 'solo' && !registrationState.gamertag) {
      return "Please enter your gamertag";
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

  const handleRegistration = async (override?: Partial<RegistrationState> & { coach?: string; substitute?: string }) => {
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
        registration_type: state.type,
        gamer_tag: state.type === 'solo' ? state.gamertag : null,
        team_name: state.type === 'team' ? state.teamName : null,
        team_captain: state.type === 'team' ? (override?.teamCaptain || null) : null,
        team_members: state.type === 'team' ? teamMembersArr.join(',') : null,
        team_logo: state.type === 'team' ? (override?.teamLogo || null) : null,
        user_email: user.email || null,
        status: 'registered',
        created_at: new Date().toISOString()
      };

      console.log('[useTournamentRegistration] Saving registration:', registrationData);

      const { error: dbError, data } = await supabase
        .from('tournament_registrations')
        .upsert(registrationData, {
          onConflict: 'tournament_id,user_id'
        })
        .select()
        .single();

      if (dbError) {
        console.error('[useTournamentRegistration] Database error:', dbError);
        throw dbError;
      }

      console.log('[useTournamentRegistration] Registration saved successfully:', data);

      toast({
        title: "Registration Successful",
        description: `You have successfully registered for ${tournamentName}!`,
      });

      if (onSuccess) {
        const registrationDetails: RegistrationDetails = {
          id: data?.id || '',
          tournament_id: tournamentId,
          user_id: user.id,
          gamer_tag: state.type === 'solo' ? state.gamertag : state.teamName || '',
          team_name: state.type === 'team' ? state.teamName : null,
          team_members: state.type === 'team' ? teamMembersArr.join(',') : null,
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

      // First, check if registration exists
      const { data: existingRegistration, error: fetchError } = await supabase
        .from('tournament_registrations')
        .select('*')
        .eq('tournament_id', tournamentId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (fetchError) {
        console.error('[useTournamentRegistration] Error fetching registration:', fetchError);
        throw fetchError;
      }

      if (!existingRegistration) {
        console.log('[useTournamentRegistration] No registration found to withdraw');
        if (onSuccess) {
          onSuccess(null);
        }
        return;
      }

      console.log('[useTournamentRegistration] Found registration:', existingRegistration);

      // Delete the registration
      const { error } = await supabase
        .from('tournament_registrations')
        .delete()
        .eq('id', existingRegistration.id);

      if (error) {
        console.error('[useTournamentRegistration] Error withdrawing:', error);
        throw error;
      }

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

  const uploadTeamLogo = async (file: File): Promise<string | null> => {
    if (!file) return null;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}-${Date.now()}.${fileExt}`;
      const filePath = `team-logos/${fileName}`;

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
    gamertag: registrationState.gamertag,
    setGamertag: (gamertag: string) => 
      setRegistrationState(prev => ({ ...prev, gamertag })),
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
