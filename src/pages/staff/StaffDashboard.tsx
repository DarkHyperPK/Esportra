import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMyStaffAssignments } from '@/hooks/useMyStaffAssignments';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, ShieldCheck, ArrowRight, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageTransition } from '@/components/PageTransition';

const StaffDashboard = () => {
  const { user } = useAuth();
  const { assignments, loading } = useMyStaffAssignments(user?.id);
  const { toast } = useToast();

  const assignmentCount = assignments.length;
  const assignmentList = useMemo(() => assignments, [assignments]);

  if (!user) {
    return (
      <PageTransition>
        <div className="max-w-5xl mx-auto py-16 px-4 text-center text-white">
          <h1 className="text-3xl font-bold mb-2">Sign in required</h1>
          <p className="text-gray-400">Log in to access your staff workspace.</p>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="max-w-6xl mx-auto py-10 px-4 space-y-6 text-white">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Staff Console</h1>
            <p className="text-gray-400">
              Access the tournaments where organizers granted you moderator permissions.
            </p>
          </div>
          <Badge className="bg-cyan-500/20 text-cyan-200 border-cyan-400/40 w-fit">
            {assignmentCount} active {assignmentCount === 1 ? 'assignment' : 'assignments'}
          </Badge>
        </div>

        <Card className="bg-[#080d18] border border-white/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-100 text-xl">
              <ShieldCheck className="w-5 h-5 text-cyan-300" />
              My Tournaments
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-slate-300 text-sm">Loading assignments…</div>
            ) : assignmentList.length === 0 ? (
              <div className="text-slate-400 text-sm">
                Organizers haven’t added you as staff yet. Accept invitations to see tournaments here.
              </div>
            ) : (
              <div className="grid gap-4">
                {assignmentList.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 rounded-2xl border border-white/5 bg-white/2 p-4"
                  >
                    <div className="space-y-2">
                      <div className="text-lg font-semibold">
                        {assignment.tournament?.name || 'Tournament'}
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-slate-400">
                        {assignment.tournament?.game && (
                          <span className="inline-flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {assignment.tournament.game}
                          </span>
                        )}
                        {assignment.tournament?.start_date && (
                          <span className="inline-flex items-center gap-1">
                            <CalendarDays className="w-3 h-3" />
                            {new Date(assignment.tournament.start_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {assignment.permissions.map((perm) => (
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
                    <div className="flex gap-3">
                      <Button
                        asChild
                        className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:from-cyan-400 hover:to-blue-400"
                      >
                        <Link
                          to={`/organizer/tournament/${assignment.tournament?.slug || assignment.tournament_id}`}
                          onClick={() => {
                            toast({
                              title: 'Redirecting',
                              description: `Opening ${assignment.tournament?.name || 'tournament'} workspace`,
                            });
                          }}
                        >
                          Open workspace
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Link>
                      </Button>
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

export default StaffDashboard;

