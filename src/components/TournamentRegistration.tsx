import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription } from '@/components/ui/alert';
import TeamTournamentRegistration from '@/components/tournament/TeamTournamentRegistration';
import SoloTournamentRegistration from '@/components/tournament/SoloTournamentRegistration';
import { AlertTriangle, Ban as BanIcon } from 'lucide-react';
import { RegistrationDetails } from '@/types/tournament';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/apiClient';

interface TournamentRegistrationProps {
  tournamentId: string;
  tournamentName: string;
  game?: string;
  teamSize?: number;
  structure?: string;
  settings?: any;
  onSuccess?: (registration: RegistrationDetails | null) => void;
  isEdit?: boolean;
  initialData?: RegistrationDetails | null;
  onRegisterSuccess?: () => void;
  onCancel?: () => void;
}

const TournamentRegistration: React.FC<TournamentRegistrationProps> = ({
  tournamentId,
  tournamentName,
  game = '',
  teamSize = 1,
  structure = 'solo',
  settings,
  onSuccess,
  isEdit = false,
  initialData,
  onRegisterSuccess,
  onCancel
}) => {
  const { user } = useAuth();
  const { toast } = useToast();

  // Ban state
  const [banned, setBanned] = useState(false);
  const [banReason, setBanReason] = useState<string | null>(null);

  // Check if this is a team tournament
  const isTeamTournament = (teamSize || 1) > 1 || game?.toLowerCase() === 'valorant';

  // Check for ban on mount
  useEffect(() => {
    const checkBan = async () => {
      if (!user) return;
      try {
        const data = await apiClient.get<{ ban_reason: string | null } | null>(
          `/api/tournaments/${tournamentId}/ban-status`
        );

        if (data && (data as any).isBanned) {
          setBanned(true);
          setBanReason((data as any).ban?.ban_reason || null);
        } else {
          setBanned(false);
          setBanReason(null);
        }
      } catch (err) {
        console.error('Error checking ban status:', err);
        setBanned(false);
        setBanReason(null);
      }
    };
    checkBan();
  }, [user, tournamentId]);

  // Show login prompt if not authenticated
  if (!user) {
    return (
      <Alert className="rounded-lg shadow-md border-0 bg-gradient-to-r from-gray-800 to-gray-900 text-white">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Please log in to register for this tournament.
        </AlertDescription>
      </Alert>
    );
  }

  // Show banned state if user is banned
  if (banned) {
    return (
      <div
        className="w-full bg-gradient-to-r from-red-600 to-red-400 text-white font-bold py-4 rounded-xl shadow-lg flex flex-col items-center justify-center text-2xl mb-4 border-2 border-red-700 opacity-90 cursor-not-allowed"
      >
        <BanIcon className="w-10 h-10 mb-2 text-white drop-shadow-lg" />
        BANNED
        {banReason && (
          <span className="text-base font-normal mt-2 text-white/90">{banReason}</span>
        )}
      </div>
    );
  }

  // For team tournaments, use the team registration component
  if (isTeamTournament) {
    return (
      <TeamTournamentRegistration
        tournament={{
          id: tournamentId,
          name: tournamentName,
          game: game || '',
          start_date: new Date().toISOString(),
          entry_fee: undefined,
          prize_pool: undefined,
          max_teams: 100,
          team_size: teamSize,
          settings,
        }}
        onRegistrationComplete={onRegisterSuccess}
        onCancel={onCancel || onRegisterSuccess} // Close dialog on cancel
      />
    );

  }

  // For solo tournaments, use the solo registration component
  return (
    <SoloTournamentRegistration
      tournament={{
        id: tournamentId,
        name: tournamentName,
        game: game || '',
        start_date: new Date().toISOString(),
        entry_fee: 0,
        prize_pool: 0,
        max_teams: 100,
        description: ''
      }}
      onRegistrationComplete={onRegisterSuccess}
      onCancel={onCancel || onRegisterSuccess}
    />
  );
};

export default TournamentRegistration;
