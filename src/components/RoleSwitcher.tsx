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

  // Check verification status for organizer and venue_owner roles using multi-role system
  const checkVerificationStatus = async () => {
    if (!user) return;
    setCheckingVerification(true);
    try {
      // Get user's active roles from multi-role system
      const { data: userRoles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('is_active', true);

      // Get verified roles (must be approved AND active)
      const { data: verifiedRoles } = await supabase
        .from('verified_roles')
        .select('role, status, is_active')
        .eq('user_id', user.id)
        .eq('status', 'approved')
        .eq('is_active', true);

      // Get admin status
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .maybeSingle();

      const isAdmin = profile?.is_admin;
      const hasOrganizerRole = userRoles?.some(r => r.role === 'organizer') || false;
      const hasVenueOwnerRole = userRoles?.some(r => r.role === 'venue_owner') || false;
      const isOrganizerVerified = verifiedRoles?.some(r => r.role === 'organizer') || false;
      const isVenueOwnerVerified = verifiedRoles?.some(r => r.role === 'venue_owner') || false;

      console.log('Verification check:', {
        userRoles: userRoles?.map(r => r.role),
        verifiedRoles: verifiedRoles?.map(r => r.role),
        isAdmin,
        hasOrganizerRole,
        hasVenueOwnerRole,
        isOrganizerVerified,
        isVenueOwnerVerified
      });

      setVerificationSystemReady(true);
      setVerificationStatus({ 
        organizer: isAdmin || (hasOrganizerRole && isOrganizerVerified), 
        venue_owner: isAdmin || (hasVenueOwnerRole && isVenueOwnerVerified) 
      });

      console.log('RoleSwitcher verification status:', {
        hasOrganizerRole,
        hasVenueOwnerRole,
        isOrganizerVerified,
        isVenueOwnerVerified,
        isAdmin,
        finalOrganizer: hasOrganizerRole && (isOrganizerVerified || isAdmin),
        finalVenueOwner: hasVenueOwnerRole && (isVenueOwnerVerified || isAdmin)
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
    // Admins cannot switch roles - super admin has all perks, other admins stay on casual
    if (currentRole === 'admin' || isLoading) {
      toast({
        title: 'Admin Account',
        description: 'Admin accounts cannot switch roles. Super admins have all features, other admins stay on casual with their admin permissions.',
        variant: 'default',
      });
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

const getRoleBadgeClasses = (role: 'casual' | 'organizer' | 'venue_owner') => {
    switch (role) {
    case 'casual':
      return 'bg-gradient-to-r from-cyan-500/70 to-sky-500/70 border border-cyan-400/30';
    case 'organizer':
      return 'bg-gradient-to-r from-rose-500/70 to-orange-500/70 border border-rose-400/30';
    case 'venue_owner':
      return 'bg-gradient-to-r from-emerald-500/70 to-lime-500/70 border border-emerald-400/30';
    default:
      return 'bg-gradient-to-r from-cyan-500/70 to-sky-500/70 border border-cyan-400/30';
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
          className={`${getRoleBadgeClasses(currentRole)} text-white flex items-center gap-2`}
        >
          {getRoleIcon(currentRole)}
          {currentRole === 'casual' ? 'Player' : 'Organizer'}
        </Badge>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowDialog(true)}
          disabled={isLoading}
          className="rounded-xl border-white/20 bg-white/5 text-white hover:bg-white/10"
        >
          <ArrowRightLeft className="w-4 h-4 mr-2" />
          Switch Role
        </Button>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-sm border border-white/10 bg-[#05070f] px-4 py-5 shadow-[0_30px_70px_rgba(0,0,0,0.65)]">
          <DialogHeader className="pb-3">
            <DialogTitle className="flex items-center gap-2 text-lg text-white">
              <ArrowRightLeft className="w-4 h-4" />
              Switch Role
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-2">
            {/* Current Role Badge */}
            <div className="flex items-center gap-2 border-b border-white/10 pb-2">
              <Badge className={`${getRoleBadgeClasses(currentRole)} text-white text-xs flex items-center gap-1.5`}>
                {getRoleIcon(currentRole as any)}
                Current: {getRoleLabel(currentRole as any)}
              </Badge>
            </div>

            {/* Role Options - Compact */}
            <div className="space-y-2">
              {/* Player Role */}
              <button
                className={`w-full rounded-2xl border px-3 py-2.5 text-left transition-all ${
                  currentRole === 'casual' 
                    ? 'border-cyan-400/60 bg-cyan-500/10'
                    : 'border-white/10 hover:border-cyan-400/40 hover:bg-white/5'
                }`}
                onClick={() => currentRole !== 'casual' && handleRoleSwitch('casual')}
                disabled={switching || currentRole === 'casual'}
              >
                <div className="flex items-center gap-2">
                  <Gamepad2 className="h-4 w-4 flex-shrink-0 text-cyan-300" />
                  <span className="text-sm font-medium text-white">Player</span>
                  {currentRole === 'casual' && (
                    <Badge className="ml-auto bg-emerald-500/80 text-xs text-white">Active</Badge>
                  )}
                </div>
              </button>

              {/* Organizer Role */}
              <button
                className={`w-full rounded-2xl border px-3 py-2.5 text-left transition-all ${
                  currentRole === 'organizer' 
                    ? 'border-rose-400/70 bg-rose-500/10' 
                    : verificationStatus.organizer
                      ? 'border-white/10 hover:border-rose-400/40 hover:bg-white/5'
                      : 'border-white/10 hover:border-rose-400/40 hover:bg-white/5 opacity-75'
                }`}
                onClick={() => currentRole !== 'organizer' && handleRoleSwitch('organizer')}
                disabled={switching || currentRole === 'organizer'}
              >
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 flex-shrink-0 text-rose-300" />
                  <span className="text-sm font-medium text-white">Organizer</span>
                  <div className="ml-auto flex items-center gap-1">
                    {currentRole === 'organizer' ? (
                      <Badge className="bg-emerald-500/80 text-xs text-white">Active</Badge>
                    ) : verificationStatus.organizer ? (
                      <Badge className="bg-emerald-500/80 text-xs text-white">Verified</Badge>
                    ) : (
                      <Badge variant="outline" className="border-amber-400 text-xs text-amber-300">
                        <AlertCircle className="mr-0.5 h-3 w-3" />
                        Verify
                      </Badge>
                    )}
                  </div>
                </div>
              </button>

              {/* Venue Owner Role */}
              <button
                className={`w-full rounded-2xl border px-3 py-2.5 text-left transition-all ${
                  currentRole === 'venue_owner' 
                    ? 'border-emerald-400/70 bg-emerald-500/10' 
                    : verificationStatus.venue_owner
                      ? 'border-white/10 hover:border-emerald-400/40 hover:bg-white/5'
                      : 'border-white/10 hover:border-emerald-400/40 hover:bg-white/5 opacity-75'
                }`}
                onClick={() => currentRole !== 'venue_owner' && handleRoleSwitch('venue_owner')}
                disabled={switching || currentRole === 'venue_owner'}
              >
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 flex-shrink-0 text-emerald-300" />
                  <span className="text-sm font-medium text-white">Venue Owner</span>
                  <div className="ml-auto flex items-center gap-1">
                    {currentRole === 'venue_owner' ? (
                      <Badge className="bg-emerald-500/80 text-xs text-white">Active</Badge>
                    ) : verificationStatus.venue_owner ? (
                      <Badge className="bg-emerald-500/80 text-xs text-white">Verified</Badge>
                    ) : (
                      <Badge variant="outline" className="border-amber-400 text-xs text-amber-300">
                        <AlertCircle className="mr-0.5 h-3 w-3" />
                        Verify
                      </Badge>
                    )}
                  </div>
                </div>
              </button>
            </div>
          </div>

          <div className="mt-3 flex justify-end gap-2 border-t border-white/10 pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDialog(false)}
              className="rounded-xl border-white/20 bg-white/5 text-white hover:bg-white/10"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Verification Request Form Dialog */}
      <Dialog open={showVerificationForm} onOpenChange={setShowVerificationForm}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto border border-white/10 bg-[#05070f]">
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
