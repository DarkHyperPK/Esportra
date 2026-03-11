import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertCircle, ArrowRightLeft, Building2, Gamepad2, Trophy } from 'lucide-react';
import { useRole } from '@/contexts/RoleContext';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/apiClient';
import { useToast } from "@/hooks/use-toast";
import VerificationRequestForm from '@/components/VerificationRequestForm';

// --- Shared Helper Functions ---

const getRoleIcon = (role: string) => {
  switch (role) {
    case 'casual': return <Gamepad2 className="w-4 h-4" />;
    case 'organizer': return <Trophy className="w-4 h-4" />;
    case 'venue_owner': return <Building2 className="w-4 h-4" />;
    default: return <Gamepad2 className="w-4 h-4" />;
  }
};

const getRoleBadgeClasses = (role: string) => {
  switch (role) {
    case 'casual': return 'bg-gradient-to-r from-cyan-500/70 to-sky-500/70 border border-cyan-400/30';
    case 'organizer': return 'bg-gradient-to-r from-rose-500/70 to-orange-500/70 border border-rose-400/30';
    case 'venue_owner': return 'bg-gradient-to-r from-emerald-500/70 to-lime-500/70 border border-emerald-400/30';
    default: return 'bg-gradient-to-r from-cyan-500/70 to-sky-500/70 border border-cyan-400/30';
  }
};

const getRoleLabel = (role: string) => {
  if (role === 'casual') return 'Player';
  if (role === 'organizer') return 'Organizer';
  if (role === 'venue_owner') return 'Venue Owner';
  if (role === 'admin') return 'Admin';
  return String(role);
};

// --- Controlled Part: RoleSwitcherDialog ---

export const RoleSwitcherDialog: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
}> = ({ open, onOpenChange }) => {
  const { currentRole, isLoading, switchRole } = useRole();
  const { user, profile } = useAuth();
  const { toast } = useToast();

  const [reason, setReason] = useState('');
  const [showVerificationForm, setShowVerificationForm] = useState(false);
  const [verificationRequestedRole, setVerificationRequestedRole] = useState<'organizer' | 'venue_owner'>('organizer');
  const [verificationStatus, setVerificationStatus] = useState<{
    organizer: boolean;
    venue_owner: boolean;
  }>({ organizer: false, venue_owner: false });
  const [verificationSystemReady, setVerificationSystemReady] = useState(false);
  const [switching, setSwitching] = useState(false);

  // Check verification status for organizer and venue_owner roles using multi-role system
  const checkVerificationStatus = async () => {
    if (!user) return;
    try {
      // Fetch roles from the .NET backend — same endpoint RoleContext uses
      const rolesData = await apiClient.get<{
        userRoles: Array<{ role: string; is_active: boolean }>;
        verifiedRoles: Array<{ role: string; status: string; is_active: boolean }>;
      }>('/api/me/roles');

      const isAdmin = profile?.is_admin;
      const hasOrganizerRole = rolesData.userRoles?.some(r => r.role === 'organizer' && r.is_active) || false;
      const hasVenueOwnerRole = rolesData.userRoles?.some(r => r.role === 'venue_owner' && r.is_active) || false;
      const isOrganizerVerified = rolesData.verifiedRoles?.some(r => r.role === 'organizer' && r.status === 'approved' && r.is_active) || false;
      const isVenueOwnerVerified = rolesData.verifiedRoles?.some(r => r.role === 'venue_owner' && r.status === 'approved' && r.is_active) || false;

      setVerificationSystemReady(true);
      setVerificationStatus({
        organizer: isAdmin || (hasOrganizerRole && isOrganizerVerified),
        venue_owner: isAdmin || (hasVenueOwnerRole && isVenueOwnerVerified)
      });

    } catch (error) {
      console.error('Error checking verification status:', error);
      setVerificationSystemReady(false);
      setVerificationStatus({ organizer: false, venue_owner: false });
    }
  };

  useEffect(() => {
    if (open) {
      checkVerificationStatus();
    }
  }, [user, open]);

  const handleRoleSwitch = async (newRole: 'casual' | 'organizer' | 'venue_owner') => {
    if (currentRole === 'admin' || isLoading) {
      toast({
        title: 'Admin Account',
        description: 'Admin accounts cannot switch roles. Super admins have all features, other admins stay on casual with their admin permissions.',
        variant: 'default',
      });
      return;
    }

    if (verificationSystemReady) {
      if (newRole === 'organizer' && !verificationStatus.organizer) {
        setVerificationRequestedRole('organizer');
        setShowVerificationForm(true);
        // Do not close the main dialog yet if we are showing another dialog on top?
        // Actually showing verification form on top. We can keep the main dialog open or close it.
        // Existing logic closed it.
        onOpenChange(false);
        return;
      }

      if (newRole === 'venue_owner' && !verificationStatus.venue_owner) {
        setVerificationRequestedRole('venue_owner');
        setShowVerificationForm(true);
        onOpenChange(false);
        return;
      }
    }

    setSwitching(true);
    const success = await switchRole(newRole, reason || undefined);
    if (success) {
      onOpenChange(false);
      setReason('');
    }
    setSwitching(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-sm border border-white/10 bg-[#05070f] px-4 py-5 shadow-[0_30px_70px_rgba(0,0,0,0.65)] z-[1100]">
          <DialogHeader className="pb-3">
            <DialogTitle className="flex items-center gap-2 text-lg text-white">
              <ArrowRightLeft className="w-4 h-4" />
              Switch Role
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-2">
            <div className="flex items-center gap-2 border-b border-white/10 pb-2">
              <Badge className={`${getRoleBadgeClasses(currentRole)} text-white text-xs flex items-center gap-1.5`}>
                {getRoleIcon(currentRole)}
                Current: {getRoleLabel(currentRole)}
              </Badge>
            </div>

            <div className="space-y-2">
              {/* Always show Player option */}
              <button
                key="casual"
                className={`w-full rounded-2xl border px-3 py-2.5 text-left transition-all ${currentRole === 'casual'
                  ? 'border-cyan-400/60 bg-cyan-500/10'
                  : 'border-white/10 hover:border-cyan-400/40 hover:bg-white/5'
                  }`}
                onClick={() => currentRole !== 'casual' && handleRoleSwitch('casual')}
                disabled={switching || currentRole === 'casual'}
              >
                <div className="flex items-center gap-2">
                  <Gamepad2 className="h-4 w-4 flex-shrink-0 text-cyan-300" />
                  <span className="text-sm font-medium text-white">Player</span>
                  <div className="ml-auto flex items-center gap-1">
                    {currentRole === 'casual' && (
                      <Badge className="bg-emerald-500/80 text-xs text-white">Active</Badge>
                    )}
                  </div>
                </div>
              </button>

              {/* Show Organizer only if licensed */}
              {verificationStatus.organizer && (
                <button
                  key="organizer"
                  className={`w-full rounded-2xl border px-3 py-2.5 text-left transition-all ${currentRole === 'organizer'
                    ? 'border-rose-400/70 bg-rose-500/10'
                    : 'border-white/10 hover:border-cyan-400/40 hover:bg-white/5'
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
                      ) : (
                        <Badge className="bg-emerald-500/80 text-xs text-white">Licensed</Badge>
                      )}
                    </div>
                  </div>
                </button>
              )}

              {/* Show Venue Owner only if licensed */}
              {verificationStatus.venue_owner && (
                <button
                  key="venue_owner"
                  className={`w-full rounded-2xl border px-3 py-2.5 text-left transition-all ${currentRole === 'venue_owner'
                    ? 'border-emerald-400/70 bg-emerald-500/10'
                    : 'border-white/10 hover:border-cyan-400/40 hover:bg-white/5'
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
                      ) : (
                        <Badge className="bg-emerald-500/80 text-xs text-white">Licensed</Badge>
                      )}
                    </div>
                  </div>
                </button>
              )}
            </div>
          </div>

          <div className="mt-3 flex justify-end gap-2 border-t border-white/10 pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="rounded-xl border-white/20 bg-white/5 text-white hover:bg-white/10"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showVerificationForm} onOpenChange={setShowVerificationForm}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto border border-white/10 bg-[#05070f] z-[1060]">
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

// --- Default Component: RoleSwitcher (Wrapper) ---
// Keeps backward compatibility but allows parent override if onOpen/controlled behavior is needed.
// However, the best way to fix the Z-Index/Closing issue is to NOT use this component inside a dropdown,
// but use RoleSwitcherDialog outside and a button inside.

interface RoleSwitcherProps {
  onOpen?: () => void;
}

const RoleSwitcher: React.FC<RoleSwitcherProps> = ({ onOpen }) => {
  const { currentRole, isLoading } = useRole();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div className="flex items-center gap-3">
        <Badge
          variant="secondary"
          className={`${getRoleBadgeClasses(currentRole)} text-white flex items-center gap-2`}
        >
          {getRoleIcon(currentRole)}
          {getRoleLabel(currentRole)}
        </Badge>

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setIsOpen(true);
            onOpen?.();
          }}
          disabled={isLoading}
          className="rounded-xl border-white/20 bg-white/5 text-white hover:bg-white/10"
        >
          <ArrowRightLeft className="w-4 h-4 mr-2" />
          Switch Role
        </Button>
      </div>

      <RoleSwitcherDialog open={isOpen} onOpenChange={setIsOpen} />
    </>
  );
};

export default RoleSwitcher;
