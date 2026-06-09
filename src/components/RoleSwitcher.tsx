import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ArrowRightLeft, Building2, Gamepad2, Trophy } from 'lucide-react';
import { useRole } from '@/hooks/useRole';
import { useAuth } from '@/hooks/useAuth';
import { useMeRoles } from '@/hooks/useMeRoles';
import { useToast } from "@/hooks/use-toast";
import VerificationRequestForm from '@/components/VerificationRequestForm';
import { JackButton } from '@/components/ui/JackButton';
import { cn } from '@/lib/utils';

// --- Shared Helper Functions ---

const getRoleIcon = (role: string) => {
  switch (role) {
    case 'casual': return <Gamepad2 className="h-4 w-4" />;
    case 'organizer': return <Trophy className="h-4 w-4" />;
    case 'venue_owner': return <Building2 className="h-4 w-4" />;
    default: return <Gamepad2 className="h-4 w-4" />;
  }
};

const getRoleLabel = (role: string) => {
  if (role === 'casual') return 'Player';
  if (role === 'organizer') return 'Organizer';
  if (role === 'venue_owner') return 'Venue Owner';
  if (role === 'admin') return 'Admin';
  return String(role);
};

// JACK IN-style role tile (white surface → rose slide-up). Disabled when active or switching.
const RoleTile: React.FC<{
  role: 'casual' | 'organizer' | 'venue_owner';
  isCurrent: boolean;
  disabled?: boolean;
  badge?: string;
  onClick: () => void;
}> = ({ role, isCurrent, disabled, badge, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled || isCurrent}
    className={cn(
      'group relative block w-full overflow-hidden border px-4 py-3 text-left font-mono text-[12px] font-bold uppercase tracking-wider transition-colors',
      isCurrent
        ? 'border-rose-500 bg-rose-500 text-white'
        : 'border-white/10 bg-white text-black disabled:opacity-50',
    )}
  >
    <span className="relative z-10 flex w-full items-center gap-2">
      <span className={cn('flex h-7 w-7 items-center justify-center', isCurrent ? 'text-white' : 'text-black')}>
        {getRoleIcon(role)}
      </span>
      <span className="flex-1">{getRoleLabel(role)}</span>
      {badge && (
        <span
          className={cn(
            'border px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider',
            isCurrent ? 'border-white/40 text-white' : 'border-black/40 text-black',
          )}
        >
          {badge}
        </span>
      )}
    </span>
    {!isCurrent && (
      <span className="absolute inset-0 z-0 translate-y-full bg-rose-500 transition-transform duration-300 group-hover:translate-y-0" />
    )}
  </button>
);

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
  const { data: rolesData, isLoading: rolesLoading } = useMeRoles(open && !!user);

  useEffect(() => {
    if (!open || !user) return;
    if (rolesLoading) return;

    try {
      const isAdmin = profile?.is_admin;
      const hasOrganizerRole = rolesData?.userRoles?.some(r => r.role === 'organizer' && r.is_active) || false;
      const hasVenueOwnerRole = rolesData?.userRoles?.some(r => r.role === 'venue_owner' && r.is_active) || false;
      const isOrganizerVerified = rolesData?.verifiedRoles?.some(r => r.role === 'organizer' && r.status === 'approved' && r.is_active) || false;
      const isVenueOwnerVerified = rolesData?.verifiedRoles?.some(r => r.role === 'venue_owner' && r.status === 'approved' && r.is_active) || false;

      setVerificationSystemReady(true);
      setVerificationStatus({
        organizer: isAdmin || (hasOrganizerRole && isOrganizerVerified),
        venue_owner: isAdmin || (hasVenueOwnerRole && isVenueOwnerVerified),
      });
    } catch (error) {
      console.error('Error checking verification status:', error);
      setVerificationSystemReady(false);
      setVerificationStatus({ organizer: false, venue_owner: false });
    }
  }, [open, user, profile?.is_admin, rolesData, rolesLoading]);

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
        <DialogContent className="z-[1100] max-w-sm rounded-none border border-rose-500/40 bg-[#0a0a0c] p-0 shadow-[0_30px_70px_rgba(0,0,0,0.65)]">
          <DialogHeader className="border-b border-white/10 px-5 py-4">
            <div className="mb-1 font-mono text-[10px] font-bold uppercase tracking-[0.4em] text-rose-400">
              Identity
            </div>
            <DialogTitle className="flex items-center gap-2 font-heading text-xl font-black uppercase tracking-tight text-white">
              <ArrowRightLeft className="h-4 w-4" />
              Switch Role
            </DialogTitle>
            <DialogDescription className="mt-1 text-xs text-zinc-500">
              Active:{" "}
              <span className="font-mono uppercase tracking-wider text-white">
                {getRoleLabel(currentRole)}
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 bg-[#0a0a0c] p-4">
            <RoleTile
              role="casual"
              isCurrent={currentRole === "casual"}
              disabled={switching}
              badge={currentRole === "casual" ? "Active" : undefined}
              onClick={() => currentRole !== "casual" && handleRoleSwitch("casual")}
            />

            {verificationStatus.organizer && (
              <RoleTile
                role="organizer"
                isCurrent={currentRole === "organizer"}
                disabled={switching}
                badge={currentRole === "organizer" ? "Active" : "Licensed"}
                onClick={() => currentRole !== "organizer" && handleRoleSwitch("organizer")}
              />
            )}

            {verificationStatus.venue_owner && (
              <RoleTile
                role="venue_owner"
                isCurrent={currentRole === "venue_owner"}
                disabled={switching}
                badge={currentRole === "venue_owner" ? "Active" : "Licensed"}
                onClick={() => currentRole !== "venue_owner" && handleRoleSwitch("venue_owner")}
              />
            )}
          </div>

          <div className="flex justify-end gap-2 border-t border-white/10 px-4 py-3">
            <JackButton
              variant="invert"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Close
            </JackButton>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showVerificationForm} onOpenChange={setShowVerificationForm}>
        <DialogContent className="z-[1060] max-h-[90vh] max-w-4xl overflow-y-auto rounded-none border border-rose-500/40 bg-[#0a0a0c] p-6">
          <DialogHeader>
            <div className="mb-1 font-mono text-[10px] font-bold uppercase tracking-[0.4em] text-rose-400">
              License gate
            </div>
            <DialogTitle className="font-heading text-2xl font-black uppercase tracking-tight text-white">
              Verification Required
            </DialogTitle>
            <DialogDescription className="text-sm text-zinc-400">
              To access organizer features you need to be verified. Submit your
              business information for review.
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
      <div className="flex items-center justify-between gap-3 border border-white/10 bg-white/[0.02] px-3 py-2">
        <div className="flex items-center gap-2 text-white">
          {getRoleIcon(currentRole)}
          <div className="flex flex-col">
            <span className="font-mono text-[9px] font-bold uppercase tracking-[0.3em] text-zinc-500">
              Active role
            </span>
            <span className="text-sm font-semibold">{getRoleLabel(currentRole)}</span>
          </div>
        </div>
        <JackButton
          size="sm"
          className="px-4"
          onClick={() => {
            setIsOpen(true);
            onOpen?.();
          }}
          disabled={isLoading}
        >
          <ArrowRightLeft className="h-3.5 w-3.5" />
          Switch
        </JackButton>
      </div>

      <RoleSwitcherDialog open={isOpen} onOpenChange={setIsOpen} />
    </>
  );
};

export default RoleSwitcher;
