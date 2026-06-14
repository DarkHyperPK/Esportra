import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { JackButton } from '@/components/ui/JackButton';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useStaffInvites } from '@/hooks/useStaffInvites';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ShieldCheck, Check, X, Users } from 'lucide-react';
import { PageTransition } from '@/components/PageTransition';

const StaffInvitesPage = () => {
  const { user } = useAuth();
  const { invites, loading, respond } = useStaffInvites(user?.id);
  const { toast } = useToast();

  const pendingCount = invites.length;
  const inviteList = useMemo(() => invites, [invites]);

  const handleRespond = async (inviteId: string, accept: boolean) => {
    try {
      await respond(inviteId, accept);
      window.dispatchEvent(new Event('staffInviteUpdated'));
      toast({
        title: accept ? 'Invite accepted' : 'Invite declined',
        description: accept
          ? 'You now have access to organization staff tools.'
          : 'The organization has been notified of your decision.',
      });
    } catch (error: unknown) {
      console.error('Failed to respond to invite', error);
      toast({
        title: 'Unable to update invite',
        description:
          error instanceof Error ? error.message : 'Please try again or refresh the page.',
        variant: 'destructive',
      });
    }
  };

  if (!user) {
    return (
      <PageTransition>
        <div className="max-w-5xl mx-auto py-16 px-4 text-center text-white">
          <h1 className="text-3xl font-bold mb-2">Sign in required</h1>
          <p className="text-gray-400">Log in to view staff invitations.</p>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="max-w-5xl mx-auto py-10 px-4 space-y-6 text-white">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold">Staff Invitations</h1>
          <p className="text-gray-400">
            Review organization requests to help manage tournaments. Accepting grants you the listed
            permissions; declining notifies the organization.
          </p>
        </div>

        <Card className="bg-[#080d18] border border-white/5">
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2 text-slate-100 text-xl">
              <ShieldCheck className="w-5 h-5 text-cyan-300" />
              Pending Invitations
            </CardTitle>
            <Badge className="bg-cyan-500/20 text-cyan-200 border-cyan-400/40">
              {pendingCount} open {pendingCount === 1 ? 'invite' : 'invites'}
            </Badge>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center gap-2 text-slate-300">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading your invitations…
              </div>
            ) : inviteList.length === 0 ? (
              <div className="text-slate-400 text-sm">
                You don’t have any pending staff invitations right now.
              </div>
            ) : (
              <div className="space-y-4">
                {inviteList.map((invite) => (
                  <div
                    key={invite.id}
                    className="rounded-2xl border border-white/5 bg-white/2 p-4 flex flex-col gap-4"
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <p className="text-lg font-semibold">
                          {invite.organization?.name || 'Organization'}
                        </p>
                        <div className="flex flex-wrap gap-4 text-sm text-slate-400 mt-1">
                          {invite.organization?.slug && (
                            <span className="inline-flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              @{invite.organization.slug}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-2">
                          Invited by{' '}
                          {invite.assigner_profile?.full_name ||
                            invite.assigner_profile?.username ||
                            'Organization admin'}
                        </p>
                      </div>
                      <Badge className="bg-amber-500/20 text-amber-200 border-amber-400/40 w-fit">
                        {invite.role.replace(/_/g, ' ')}
                      </Badge>
                    </div>

                    <div>
                      <p className="text-sm text-slate-400 mb-2">Permissions granted</p>
                      <div className="flex flex-wrap gap-2">
                        {invite.permissions.map((perm) => (
                          <Badge
                            key={perm}
                            variant="outline"
                            className="bg-white/5 border-white/10 text-slate-200"
                          >
                            {perm.replace(':', ' · ')}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3">
                      <Button
                        variant="outline"
                        className="text-slate-300 border-white/10 hover:bg-white/10"
                        onClick={() => handleRespond(invite.id, false)}
                      >
                        <X className="w-4 h-4 mr-2" />
                        Decline
                      </Button>
                      <JackButton
                        onClick={() => handleRespond(invite.id, true)}
                      >
                        <Check className="w-4 h-4 mr-2" />
                        Accept Invite
                      </JackButton>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
};

export default StaffInvitesPage;

