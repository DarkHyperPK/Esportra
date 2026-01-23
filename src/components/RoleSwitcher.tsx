import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertCircle, ArrowRightLeft, Building2, Gamepad2, Trophy } from 'lucide-react';
import { useRole } from '@/contexts/RoleContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
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
  const { user } = useAuth();
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
      const { data: userRoles } = await supabase.from('user_roles').select('role').eq('user_id', user.id).eq('is_active', true);
      const { data: verifiedRoles } = await supabase.from('verified_roles').select('role, status, is_active').eq('user_id', user.id).eq('status', 'approved').eq('is_active', true);
      const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle();

      const isAdmin = profile?.is_admin;
      const hasOrganizerRole = userRoles?.some(r => r.role === 'organizer') || false;
      const hasVenueOwnerRole = userRoles?.some(r => r.role === 'venue_owner') || false;
      const isOrganizerVerified = verifiedRoles?.some(r => r.role === 'organizer') || false;
      const isVenueOwnerVerified = verifiedRoles?.some(r => r.role === 'venue_owner') || false;

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
              {['casual', 'organizer', 'venue_owner'].map((roleKey) => {
                const role = roleKey as 'casual' | 'organizer' | 'venue_owner';
                const isCurrent = currentRole === role;
                let isVerified = true;
                if (role === 'organizer') isVerified = verificationStatus.organizer;
                if (role === 'venue_owner') isVerified = verificationStatus.venue_owner;

                let disabled = switching || isCurrent;
                let opacityClass = '';
                if (role !== 'casual' && !isVerified) {
                  // Allow clicking to verify?
                  // Logic says: if not verified, clicking triggers verification flow.
                  // So don't disable if unverified.
                  disabled = switching || isCurrent;
                  if (!isVerified) opacityClass = 'opacity-75';
                }

                // Border classes
                let borderClass = 'border-white/10 hover:border-cyan-400/40 hover:bg-white/5';
                if (isCurrent) {
                  if (role === 'casual') borderClass = 'border-cyan-400/60 bg-cyan-500/10';
                  if (role === 'organizer') borderClass = 'border-rose-400/70 bg-rose-500/10';
                  if (role === 'venue_owner') borderClass = 'border-emerald-400/70 bg-emerald-500/10';
                }

                return (
                  <button
                    key={role}
                    className={`w-full rounded-2xl border px-3 py-2.5 text-left transition-all ${borderClass} ${opacityClass}`}
                    onClick={() => !isCurrent && handleRoleSwitch(role)}
                    disabled={disabled}
                  >
                    <div className="flex items-center gap-2">
                      {role === 'casual' && <Gamepad2 className="h-4 w-4 flex-shrink-0 text-cyan-300" />}
                      {role === 'organizer' && <Trophy className="h-4 w-4 flex-shrink-0 text-rose-300" />}
                      {role === 'venue_owner' && <Building2 className="h-4 w-4 flex-shrink-0 text-emerald-300" />}

                      <span className="text-sm font-medium text-white">{getRoleLabel(role)}</span>

                      <div className="ml-auto flex items-center gap-1">
                        {isCurrent ? (
                          <Badge className="bg-emerald-500/80 text-xs text-white">Active</Badge>
                        ) : (role !== 'casual' && !isVerified) ? (
                          <Badge variant="outline" className="border-amber-400 text-xs text-amber-300">
                            <AlertCircle className="mr-0.5 h-3 w-3" />
                            Verify
                          </Badge>
                        ) : (role !== 'casual') ? (
                          <Badge className="bg-emerald-500/80 text-xs text-white">Verified</Badge>
                        ) : null}
                      </div>
                    </div>
                  </button>
                );
              })}
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
          {currentRole === 'casual' ? 'Player' : 'Organizer'}
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
