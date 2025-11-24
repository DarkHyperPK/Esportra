import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  Gamepad2, 
  Calendar, 
  Trophy, 
  DollarSign,
  CheckCircle,
  AlertCircle,
  Loader2,
  UserCheck,
  Shield
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
  gamer_tag: string;
}

const SoloTournamentRegistration: React.FC<SoloTournamentRegistrationProps> = ({
  tournament,
  onRegistrationComplete,
  onCancel
}) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [existingRegistration, setExistingRegistration] = useState<any>(null);
  const [registrationData, setRegistrationData] = useState<RegistrationData>({
    gamer_tag: profile?.username || ''
  });

  // Check if user is already registered
  useEffect(() => {
    checkExistingRegistration();
  }, [user, tournament.id]);

  // Update gamer tag when profile loads
  useEffect(() => {
    if (profile?.username && !registrationData.gamer_tag) {
      setRegistrationData(prev => ({
        ...prev,
        gamer_tag: profile.username
      }));
    }
  }, [profile?.username]);

  const checkExistingRegistration = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('tournament_participants')
        .select('*')
        .eq('tournament_id', tournament.id)
        .eq('user_id', user.id)
        .eq('participant_type', 'solo')
        .single();

      if (data && !error) {
        setIsRegistered(true);
        setExistingRegistration(data);
        setRegistrationData({
          gamer_tag: data.gamer_tag || profile?.username || ''
        });
      }
    } catch (error) {
      console.log('No existing registration found');
    }
  };

  const handleInputChange = (field: keyof RegistrationData, value: string) => {
    setRegistrationData(prev => ({
      ...prev,
      [field]: value
    }));
  };

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
      const { data: tournamentData, error: tournamentError } = await supabase
        .from('tournaments')
        .select('status, registration_deadline, max_teams')
        .eq('id', tournament.id)
        .single();

      if (tournamentError || !tournamentData) {
        throw new Error('Tournament not found');
      }

      console.log('Tournament data:', tournamentData);
      console.log('Tournament status:', tournamentData.status);

      // Check if tournament is open for registration (accept multiple statuses)
      if (!['open', 'upcoming', 'draft', 'published'].includes(tournamentData.status)) {
        throw new Error(`Tournament registration is not open. Current status: ${tournamentData.status}`);
      }

      if (tournamentData.registration_deadline && new Date(tournamentData.registration_deadline) < new Date()) {
        throw new Error('Registration deadline has passed');
      }

      // Check current registration count
      const { count: currentRegistrations } = await supabase
        .from('tournament_participants')
        .select('*', { count: 'exact', head: true })
        .eq('tournament_id', tournament.id)
        .in('status', ['pending', 'approved', 'checked_in']);

      if (currentRegistrations && currentRegistrations >= tournamentData.max_teams) {
        throw new Error('Tournament is full');
      }

      // Check if user is already registered
      const { data: existingReg } = await supabase
        .from('tournament_participants')
        .select('id')
        .eq('tournament_id', tournament.id)
        .eq('user_id', user.id)
        .eq('participant_type', 'solo')
        .single();

      if (existingReg) {
        throw new Error('You are already registered for this tournament');
      }

      // Create registration
      const { data, error } = await supabase
        .from('tournament_participants')
        .insert({
          tournament_id: tournament.id,
          participant_type: 'solo',
          user_id: user.id,
          gamer_tag: registrationData.gamer_tag.trim(),
          solo_contact_email: user.email, // Use registered email
          status: tournament.entry_fee && tournament.entry_fee > 0 ? 'pending' : 'approved',
          entry_fee_amount: tournament.entry_fee || 0,
          entry_fee_paid: !tournament.entry_fee || tournament.entry_fee === 0
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      toast({
        title: 'Registration Successful!',
        description: tournament.entry_fee && tournament.entry_fee > 0 
          ? 'Your registration is pending approval. You will be notified once approved.'
          : 'You have been successfully registered for the tournament.',
        variant: 'default',
      });

      setIsRegistered(true);
      setExistingRegistration(data);
      onRegistrationComplete?.();

    } catch (error: any) {
      console.error('Registration error:', error);
      toast({
        title: 'Registration Failed',
        description: error.message || 'An error occurred while registering. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelRegistration = async () => {
    if (!existingRegistration) return;

    setLoading(true);
    try {
      // Delete the registration completely instead of just updating status
      const { error } = await supabase
        .from('tournament_participants')
        .delete()
        .eq('id', existingRegistration.id);

      if (error) throw error;

      toast({
        title: 'Registration Withdrawn',
        description: 'Your tournament registration has been withdrawn.',
        variant: 'default',
      });

      setIsRegistered(false);
      setExistingRegistration(null);
      onRegistrationComplete?.(); // Notify parent component
    } catch (error: any) {
      console.error('Withdrawal error:', error);
      toast({
        title: 'Error',
        description: 'Failed to withdraw registration. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-500', text: 'Pending Approval' },
      approved: { color: 'bg-green-500', text: 'Approved' },
      rejected: { color: 'bg-red-500', text: 'Rejected' },
      cancelled: { color: 'bg-gray-500', text: 'Cancelled' },
      checked_in: { color: 'bg-blue-500', text: 'Checked In' },
      eliminated: { color: 'bg-gray-500', text: 'Eliminated' },
      disqualified: { color: 'bg-red-500', text: 'Disqualified' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return (
      <Badge className={`${config.color} text-white`}>
        {config.text}
      </Badge>
    );
  };

  if (isRegistered && existingRegistration) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-white/10">
          <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
            <CheckCircle className="w-5 h-5 text-green-500" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Registration Status</h3>
            <p className="text-sm text-white/60">You're registered for this tournament</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-white/70">Status:</span>
            {getStatusBadge(existingRegistration.status)}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-white/60 text-sm">Gamer Tag</Label>
              <p className="text-white font-medium mt-1">{existingRegistration.gamer_tag}</p>
            </div>
            <div>
              <Label className="text-white/60 text-sm">Contact Email</Label>
              <p className="text-white font-medium mt-1">{user?.email}</p>
            </div>
            <div>
              <Label className="text-white/60 text-sm">Registration Date</Label>
              <p className="text-white font-medium mt-1">{formatDate(existingRegistration.registration_date)}</p>
            </div>
          </div>

          {existingRegistration.status === 'pending' && (
            <Alert className="bg-yellow-900/20 border-yellow-500/50">
              <AlertCircle className="h-4 w-4 text-yellow-500" />
              <AlertDescription className="text-yellow-200 text-sm">
                Your registration is pending approval. You will be notified once the organizer reviews your application.
              </AlertDescription>
            </Alert>
          )}

          {existingRegistration.status === 'rejected' && existingRegistration.rejection_reason && (
            <Alert className="bg-red-900/20 border-red-500/50">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <AlertDescription className="text-red-200 text-sm">
                <strong>Rejection Reason:</strong> {existingRegistration.rejection_reason}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2 pt-2">
            {existingRegistration.status === 'pending' && (
              <Button
                onClick={handleCancelRegistration}
                variant="outline"
                disabled={loading}
                className="border-red-500/50 text-red-400 hover:bg-red-500/10 flex-1"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Cancel Registration
              </Button>
            )}
            <Button
              onClick={onCancel}
              variant="outline"
              className="border-gray-600 text-gray-300 hover:bg-gray-800 flex-1"
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    );
  }

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
            <span>{formatDate(tournament.start_date)}</span>
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
        {/* Gamer Tag */}
        <div className="space-y-2">
          <Label htmlFor="gamer_tag" className="text-white flex items-center gap-2 text-sm font-medium">
            <Gamepad2 className="w-4 h-4 text-blue-400" />
            Gamer Tag <span className="text-red-400">*</span>
          </Label>
          <Input
            id="gamer_tag"
            type="text"
            value={registrationData.gamer_tag}
            onChange={(e) => handleInputChange('gamer_tag', e.target.value)}
            placeholder="Enter your gamer tag"
            className="bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 h-10"
            required
          />
          <p className="text-xs text-white/50">This will be displayed as your in-game name</p>
        </div>

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
            className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white disabled:opacity-50 disabled:cursor-not-allowed h-11 font-semibold shadow-lg shadow-blue-500/20"
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
