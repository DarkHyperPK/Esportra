import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useRole } from '@/contexts/RoleContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import VerificationRequestForm from '@/components/VerificationRequestForm';
import { 
  Users, 
  Trophy, 
  ArrowRightLeft, 
  Shield, 
  Gamepad2,
  AlertCircle,
  Building2
} from 'lucide-react';

const RoleSwitcher: React.FC = () => {
  const { 
    currentRole, 
    isLoading, 
    switchRole, 
    canCreateTeams, 
    canCreateTournaments 
  } = useRole();
  const { user } = useAuth();
  
  const [showDialog, setShowDialog] = useState(false);
  const [reason, setReason] = useState('');
  const [showVerificationForm, setShowVerificationForm] = useState(false);
  const [verificationRequestedRole, setVerificationRequestedRole] = useState<'organizer' | 'venue_owner'>('organizer');
  const [verificationStatus, setVerificationStatus] = useState<{
    organizer: boolean;
    venue_owner: boolean;
  }>({ organizer: false, venue_owner: false });
  const [verificationSystemReady, setVerificationSystemReady] = useState(false);
  const [checkingVerification, setCheckingVerification] = useState(false);
  const [switching, setSwitching] = useState(false);

  // Check verification status for organizer and venue_owner roles
  const checkVerificationStatus = async () => {
    if (!user) return;
    setCheckingVerification(true);
    try {
      // Get current profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      // Prefer verification_requests if present
      const base = await supabase
        .from('verification_requests')
        .select('requested_role, status, business_type')
        .eq('user_id', user.id);

      if (!base.error && Array.isArray(base.data)) {
         const approved = (role: 'organizer' | 'venue_owner') => {
           // Check approved verification requests
           const hasApprovedRequest = base.data!.some((r: any) => {
             const isApproved = (r.status || '').toLowerCase() === 'approved';
             if (role === 'venue_owner') {
               // For venue_owner, check both requested_role and business_type
               return isApproved && (
                 (r.requested_role || '').toLowerCase() === 'venue_owner' || 
                 ((r.requested_role || '').toLowerCase() === 'organizer' && (r.business_type || '').toLowerCase() === 'gaming_venue')
               );
             }
             return isApproved && (r.requested_role || '').toLowerCase() === role;
           });
           
           // For venue_owner, also check if they have a verified venue profile
           if (role === 'venue_owner') {
             return hasApprovedRequest || profile?.data?.role === 'venue_owner';
           }
           
           // For organizer, check if they have a verified company profile
           if (role === 'organizer') {
             return hasApprovedRequest || profile?.data?.role === 'organizer';
           }
           
           return hasApprovedRequest;
         };

        // Fallbacks: treat existing role/company/venue profile as verified
        let isOrganizer = approved('organizer');
        let isVenue = approved('venue_owner');

        if (!isOrganizer) {
          if (profile?.data?.role === 'organizer') isOrganizer = true;
          try {
            const org = await supabase.from('company_profiles').select('user_id, is_verified').eq('user_id', user.id).maybeSingle();
            if (!org.error && org.data?.is_verified) isOrganizer = true;
          } catch (e) {
            // Table might not exist
          }
        }
        if (!isVenue) {
          if (profile?.data?.role === 'venue_owner') isVenue = true;
          try {
            const v = await supabase.from('venue_profiles').select('owner_id, verified, is_verified').eq('owner_id', user.id).maybeSingle();
            if (!v.error && (v.data?.verified || v.data?.is_verified)) isVenue = true;
          } catch (e) {
            // Table might not exist
          }
        }

        setVerificationSystemReady(true);
        setVerificationStatus({ organizer: !!isOrganizer, venue_owner: !!isVenue });
        return;
      }

      // If table missing or error, mark system as not ready (do not block switches)
      setVerificationSystemReady(false);
      // Fallback to profile role only
      setVerificationStatus({ 
        organizer: profile?.data?.role === 'organizer', 
        venue_owner: profile?.data?.role === 'venue_owner' 
      });
    } catch (error) {
      console.error('Error checking verification status:', error);
      setVerificationSystemReady(false);
      setVerificationStatus({ organizer: false, venue_owner: false });
    } finally {
      setCheckingVerification(false);
    }
  };

  useEffect(() => {
    checkVerificationStatus();
  }, [user]);

  const handleRoleSwitch = async (newRole: 'casual' | 'organizer' | 'venue_owner') => {
    // Admins don't need verification for any role
    if (currentRole === 'admin') {
      setSwitching(true);
      const success = await switchRole(newRole, reason || undefined);
      if (success) {
        setShowDialog(false);
        setReason('');
      }
      setSwitching(false);
      return;
    }

    // Only check verification if the verification system is ready
    if (verificationSystemReady) {
      // Check if user needs verification for organizer or venue_owner roles
      if (newRole === 'organizer' && !verificationStatus.organizer) {
        setVerificationRequestedRole('organizer');
        setShowVerificationForm(true);
        setShowDialog(false);
        return;
      }

      if (newRole === 'venue_owner' && !verificationStatus.venue_owner) {
        setVerificationRequestedRole('venue_owner');
        setShowVerificationForm(true);
        setShowDialog(false);
        return;
      }
    }

    setSwitching(true);
    const success = await switchRole(newRole, reason || undefined);
    if (success) {
      setShowDialog(false);
      setReason('');
    }
    setSwitching(false);
  };

  const getRoleIcon = (role: 'casual' | 'organizer' | 'venue_owner') => {
    switch (role) {
      case 'casual': return <Gamepad2 className="w-4 h-4" />;
      case 'organizer': return <Trophy className="w-4 h-4" />;
      case 'venue_owner': return <Building2 className="w-4 h-4" />;
      default: return <Gamepad2 className="w-4 h-4" />;
    }
  };

  const getRoleColor = (role: 'casual' | 'organizer' | 'venue_owner') => {
    switch (role) {
      case 'casual': return 'bg-blue-600';
      case 'organizer': return 'bg-purple-600';
      case 'venue_owner': return 'bg-green-600';
      default: return 'bg-blue-600';
    }
  };

  const getRoleDescription = (role: 'casual' | 'organizer' | 'venue_owner') => {
    switch (role) {
      case 'casual':
        return 'Create teams, join tournaments, compete in matches';
      case 'organizer':
        return 'Create tournaments, manage events, verify results';
      case 'venue_owner':
        return 'List venues, host tournaments, manage gaming spaces';
      default:
        return 'Create teams, join tournaments, compete in matches';
    }
  };

  const getRoleLabel = (role: 'casual' | 'organizer' | 'venue_owner' | 'admin' | string) => {
    if (role === 'casual') return 'Player';
    if (role === 'organizer') return 'Organizer';
    if (role === 'venue_owner') return 'Venue Owner';
    if (role === 'admin') return 'Admin';
    return String(role);
  };

  return (
    <>
      <div className="flex items-center gap-3">
        <Badge 
          variant="secondary" 
          className={`${getRoleColor(currentRole)} text-white flex items-center gap-2`}
        >
          {getRoleIcon(currentRole)}
          {currentRole === 'casual' ? 'Player' : 'Organizer'}
        </Badge>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowDialog(true)}
          disabled={isLoading}
          className="border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white"
        >
          <ArrowRightLeft className="w-4 h-4 mr-2" />
          Switch Role
        </Button>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-gray-900 border border-gray-700 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Switch Role
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Choose your role to access different features
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Current Role Info */}
            <div className="bg-gray-800/50 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                {getRoleIcon(currentRole as any)}
                <span className="font-semibold text-white">
                  Current: {getRoleLabel(currentRole as any)}
                </span>
              </div>
              <p className="text-sm text-gray-400">
                {getRoleDescription(currentRole)}
              </p>
            </div>

            {/* Role Options */}
            <div className="space-y-3">
              {/* Player Role */}
              <div 
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  currentRole === 'casual' 
                    ? 'border-blue-500 bg-blue-500/10' 
                    : 'border-gray-600 hover:border-blue-500/50'
                }`}
                onClick={() => currentRole !== 'casual' && handleRoleSwitch('casual')}
              >
                <div className="flex items-center gap-3 mb-2">
                  <Gamepad2 className="w-5 h-5 text-blue-500" />
                  <span className="font-semibold text-white">Player Mode</span>
                </div>
                <p className="text-sm text-gray-400 mb-3">
                  Create teams, join tournaments, compete in matches
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="text-xs">Create Teams</Badge>
                  <Badge variant="outline" className="text-xs">Join Tournaments</Badge>
                  <Badge variant="outline" className="text-xs">Report Scores</Badge>
                </div>
              </div>

              {/* Organizer Role */}
              <div 
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  currentRole === 'organizer' 
                    ? 'border-purple-500 bg-purple-500/10' 
                    : verificationStatus.organizer
                      ? 'border-gray-600 hover:border-purple-500/50'
                      : 'border-gray-600 hover:border-purple-500/50 opacity-75'
                }`}
                onClick={() => currentRole !== 'organizer' && handleRoleSwitch('organizer')}
              >
                <div className="flex items-center gap-3 mb-2">
                  <Trophy className="w-5 h-5 text-purple-500" />
                  <span className="font-semibold text-white">Organizer Mode</span>
                  {currentRole === 'admin' ? (
                    <Badge className="bg-red-600 text-white text-xs">
                      <Shield className="w-3 h-3 mr-1" />
                      Admin Access
                    </Badge>
                  ) : !verificationSystemReady ? (
                    <Badge className="bg-blue-600 text-white text-xs">
                      <Shield className="w-3 h-3 mr-1" />
                      Available
                    </Badge>
                  ) : verificationStatus.organizer ? (
                    <Badge className="bg-green-600 text-white text-xs">
                      <Shield className="w-3 h-3 mr-1" />
                      Verified
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-yellow-400 border-yellow-400 text-xs">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      Requires Verification
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-gray-400 mb-3">
                  Create tournaments, manage events, verify results
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="text-xs">Create Tournaments</Badge>
                  <Badge variant="outline" className="text-xs">Manage Events</Badge>
                  <Badge variant="outline" className="text-xs">Verify Results</Badge>
                </div>
                {currentRole !== 'admin' && verificationSystemReady && !verificationStatus.organizer && (
                  <Alert className="mt-3 bg-yellow-900/20 border-yellow-700">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-yellow-300 text-xs">
                      You need to be verified as an organizer to access this mode.
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Venue Owner Role */}
              <div 
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  currentRole === 'venue_owner' 
                    ? 'border-green-500 bg-green-500/10' 
                    : verificationStatus.venue_owner
                      ? 'border-gray-600 hover:border-green-500/50'
                      : 'border-gray-600 hover:border-green-500/50 opacity-75'
                }`}
                onClick={() => currentRole !== 'venue_owner' && handleRoleSwitch('venue_owner')}
              >
                <div className="flex items-center gap-3 mb-2">
                  <Building2 className="w-5 h-5 text-green-500" />
                  <span className="font-semibold text-white">Venue Owner Mode</span>
                  {currentRole === 'admin' ? (
                    <Badge className="bg-red-600 text-white text-xs">
                      <Shield className="w-3 h-3 mr-1" />
                      Admin Access
                    </Badge>
                  ) : verificationStatus.venue_owner ? (
                    <Badge className="bg-green-600 text-white text-xs">
                      <Shield className="w-3 h-3 mr-1" />
                      Verified
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-yellow-400 border-yellow-400 text-xs">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      Requires Verification
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-gray-400 mb-3">
                  List venues, host tournaments, manage gaming spaces
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="text-xs">List Venues</Badge>
                  <Badge variant="outline" className="text-xs">Host Events</Badge>
                  <Badge variant="outline" className="text-xs">Manage Spaces</Badge>
                </div>
                {currentRole !== 'admin' && !verificationStatus.venue_owner && (
                  <Alert className="mt-3 bg-yellow-900/20 border-yellow-700">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-yellow-300 text-xs">
                      You need to be verified as a venue owner to access this mode.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </div>

            {/* Reason for switching (optional) */}
            <div>
              <Label htmlFor="reason" className="text-white">Reason for switching (optional)</Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Why are you switching roles?"
                className="bg-gray-800 border-gray-600 text-white mt-1"
                rows={2}
              />
            </div>

            {/* Warning */}
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-yellow-200">
                  <p className="font-medium mb-1">Important:</p>
                  <ul className="text-xs space-y-1 text-yellow-300">
                    <li>• You can only create teams in Player mode</li>
                    <li>• You can only create tournaments in Organizer mode</li>
                    <li>• Your role affects what features you can access</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowDialog(false)}
              className="border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Verification Request Form Dialog */}
      <Dialog open={showVerificationForm} onOpenChange={setShowVerificationForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gray-800 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Verification Required</DialogTitle>
            <DialogDescription className="text-gray-400">
              To access organizer features, you need to be verified. Please submit your business information for review.
            </DialogDescription>
          </DialogHeader>
          <VerificationRequestForm
            requestedRole={verificationRequestedRole}
            onSuccess={() => {
              setShowVerificationForm(false);
              checkVerificationStatus();
            }}
            onCancel={() => setShowVerificationForm(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default RoleSwitcher;
