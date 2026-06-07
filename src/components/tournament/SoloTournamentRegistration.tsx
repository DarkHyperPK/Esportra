import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/apiClient';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useRiotAccount } from '@/hooks/useRiotAccount';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  User,
  Gamepad2,
  Calendar,
  Trophy,
  DollarSign,
  Loader2,
  UserCheck,
  Shield,
  ShieldCheck
} from 'lucide-react';

interface SoloTournamentRegistrationProps {
  tournament: {
    id: string;
    name: string;
    game: string;
    start_date: string;
    entry_fee?: number;
    prize_pool?: number;
    max_teams: number;
    registration_deadline?: string;
    description?: string;
  };
  onRegistrationComplete?: () => void;
  onCancel?: () => void;
}

interface RegistrationData {
  riot_tag: string;
  steam_tag: string;
  gamer_tag: string; // Keep for legacy form submission if needed by DB
}

const SoloTournamentRegistration: React.FC<SoloTournamentRegistrationProps> = ({
  tournament,
  onRegistrationComplete,
  onCancel
}) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const { riotAccount } = useRiotAccount();
  const [loading, setLoading] = useState(false);
  const [registrationData, setRegistrationData] = useState<RegistrationData>({
    riot_tag: profile?.riot_tag || '',
    steam_tag: profile?.steam_tag || '',
    gamer_tag: profile?.username || ''
  });

  // Riot games require linked Riot account
  const isRiotGame = ['valorant', 'league of legends'].includes(tournament.game?.toLowerCase() || '');
  const requiresRiotLink = isRiotGame && !!riotAccount;

  // Auto-fill gamer tag: Riot tag for Riot games, otherwise username
  useEffect(() => {
    if (isRiotGame && riotAccount) {
      setRegistrationData(prev => ({
        ...prev,
        riot_tag: `${riotAccount.game_name}#${riotAccount.tag_line}`,
        gamer_tag: `${riotAccount.game_name}#${riotAccount.tag_line}`
      }));
    } else if (profile?.username) {
      setRegistrationData(prev => ({
        ...prev,
        gamer_tag: profile.username
      }));
    }
  }, [profile?.username, riotAccount, isRiotGame]);

  const validateRegistration = (): string | null => {
    if (!registrationData.gamer_tag.trim()) {
      return 'Gamer tag is required';
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to register for tournaments.',
        variant: 'destructive',
      });
      return;
    }

    const validationError = validateRegistration();
    if (validationError) {
      toast({
        title: 'Validation Error',
        description: validationError,
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      // Check if tournament is still open for registration
      const response = await apiClient.get<any>(`/api/tournaments/${tournament.id}`);
      const tournamentData = response?.tournament || response;

      if (!tournamentData) {
        throw new Error('Tournament not found');
      }

      console.log('Tournament data:', tournamentData);
      console.log('Tournament status:', tournamentData.status);

      // Check if tournament is open for registration (accept multiple statuses)
      if (!['open', 'published'].includes(tournamentData.status)) {
        throw new Error(`Tournament registration is not open. Current status: ${tournamentData.status}`);
      }

      if (tournamentData.registration_deadline && new Date(tournamentData.registration_deadline) < new Date()) {
        throw new Error('Registration deadline has passed');
      }

      // Check current registration count
      const participants = await apiClient.get<any[]>(
        `/api/tournaments/${tournament.id}/participants?status=pending,approved,checked_in`
      );
      const currentRegistrations = participants?.length ?? 0;

      if (currentRegistrations && currentRegistrations >= tournamentData.max_teams) {
        throw new Error('Tournament is full');
      }

      // Create registration
      await apiClient.post<any>(`/api/tournaments/${tournament.id}/register`, {
        participantType: 'solo',
        gamerTag: registrationData.gamer_tag.trim(),
        soloContactEmail: user.email,
      });

      toast({
        title: 'Registration Successful!',
        description: tournament.entry_fee && tournament.entry_fee > 0
          ? 'Your registration is pending approval. You will be notified once approved.'
          : 'You have been successfully registered for the tournament.',
        variant: 'default',
      });

      // Send confirmation email
      if (user.email) {
        const { sendEmail } = await import('@/hooks/useEmail');
        sendEmail({
          type: 'TournamentRegistration',
          email: user.email,
          data: {
            username: user.user_metadata?.username || user.user_metadata?.full_name || '',
            tournamentName: tournament.name,
            gamertag: registrationData.gamer_tag.trim(),
            registrationType: 'solo',
            game: tournament.game,
            startDate: tournament.start_date ? new Date(tournament.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '',
            endDate: (tournament as any).end_date ? new Date((tournament as any).end_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '',
            tournamentUrl: `${window.location.origin}/tournaments/${tournament.id}`,
          },
        }).catch((err) => console.warn('[SoloRegistration] Email send failed:', err));
      }

      onRegistrationComplete?.();

    } catch (error: any) {
      console.error('Registration error:', error);
      const msg = (error.message || '').toLowerCase();
      if (msg.includes('already registered') || msg.includes('already exists')) {
        // Ghost registration or race condition — treat as success
        toast({
          title: 'Already Registered',
          description: 'You are already registered for this tournament.',
        });
        onRegistrationComplete?.();
        return;
      }
      toast({
        title: 'Registration Failed',
        description: error.message || 'An error occurred while registering. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Solo Registration Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-white/10">
        <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
          <User className="w-5 h-5 text-blue-500" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Solo Registration</h3>
          <p className="text-sm text-white/60">Register as an individual player for {tournament.name}</p>
        </div>
      </div>

      {/* Tournament Details */}
      <div className="bg-gray-800/30 rounded-lg p-4 border border-white/5">
        <div className="flex items-center gap-2 mb-3">
          <Gamepad2 className="w-4 h-4 text-blue-400" />
          <h4 className="text-white font-medium text-sm">Tournament Details</h4>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-white/80">
            <Calendar className="w-4 h-4 text-white/50" />
            <span>{new Date(tournament.start_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
          {tournament.entry_fee && tournament.entry_fee > 0 && (
            <div className="flex items-center gap-2 text-white/80">
              <DollarSign className="w-4 h-4 text-white/50" />
              <span>Entry Fee: ${tournament.entry_fee}</span>
            </div>
          )}
          {tournament.prize_pool && tournament.prize_pool > 0 && (
            <div className="flex items-center gap-2 text-white/80">
              <Trophy className="w-4 h-4 text-white/50" />
              <span>Prize Pool: ${tournament.prize_pool}</span>
            </div>
          )}
        </div>
      </div>

      {/* Your Information */}
      <div className="bg-gray-800/30 rounded-lg p-4 border border-white/5">
        <div className="flex items-center gap-2 mb-3">
          <UserCheck className="w-4 h-4 text-blue-400" />
          <h4 className="text-white font-medium text-sm">Your Information</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-white/60">Username:</span>
            <span className="text-white font-medium">{profile?.username || 'Loading...'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-white/60">Email:</span>
            <span className="text-white font-medium">{user?.email}</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Riot-linked tag for Riot games */}
        {isRiotGame && (
          <div className="space-y-2">
            <Label htmlFor="gamer_tag" className="text-white flex items-center gap-2 text-sm font-medium">
              <Gamepad2 className="w-4 h-4 text-blue-400" />
              Riot ID
              {requiresRiotLink && (
                <span className="ml-auto flex items-center gap-1 text-[10px] text-red-400 font-mono">
                  <ShieldCheck className="w-3 h-3" /> VERIFIED
                </span>
              )}
            </Label>
            <Input
              id="gamer_tag"
              type="text"
              value={registrationData.gamer_tag}
              className="bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500 h-10 disabled:opacity-60"
              disabled
            />
            {requiresRiotLink ? (
              <p className="text-xs text-red-400/70">Verified via Riot Sign-On</p>
            ) : (
              <p className="text-xs text-amber-400/70">Link your Riot account in Settings for verified status</p>
            )}
          </div>
        )}

        {/* Show username as display name for non-Riot games */}
        {!isRiotGame && (
          <div className="space-y-2">
            <Label className="text-white flex items-center gap-2 text-sm font-medium">
              <User className="w-4 h-4 text-blue-400" />
              Display Name
            </Label>
            <div className="bg-gray-800/50 border border-gray-700 rounded-md px-3 h-10 flex items-center">
              <span className="text-white font-medium">{profile?.username || 'Loading...'}</span>
            </div>
            <p className="text-xs text-white/50">Your username will be used as your in-game display name</p>
          </div>
        )}

        {/* Agreement */}
        <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-200 leading-relaxed">
              By registering, you agree to participate in the tournament and follow all rules and regulations.
              Your contact information will be used for tournament communication only.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <Button
            type="submit"
            disabled={loading || !registrationData.gamer_tag.trim()}
            className="flex-1 bg-rose-500 hover:bg-rose-600 transition-all text-white disabled:opacity-50 disabled:cursor-not-allowed h-11 font-semibold"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Registering...
              </>
            ) : (
              <>
                <User className="w-4 h-4 mr-2" />
                Register Solo
              </>
            )}
          </Button>
          <Button
            type="button"
            onClick={onCancel}
            variant="outline"
            className="border-gray-600 text-gray-300 hover:bg-gray-800 h-11 px-6"
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
};

export default SoloTournamentRegistration;
