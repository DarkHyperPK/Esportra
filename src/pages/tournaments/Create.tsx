import { useState, useEffect } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/contexts/RoleContext';
import { useAdmin } from '@/contexts/AdminContext';
import { deriveHasOrganization, fetchMeRoles } from '@/lib/meRoles';
import Footer from '@/components/Footer';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, ArrowRight, Building2, Loader2, Trophy } from 'lucide-react';
import { WizardContainer } from '@/components/tournament/wizard';
import { Button } from '@/components/ui/button';

const CreateTournament = () => {
  const { user } = useAuth();
  const { canCreateTournaments, currentRole } = useRole();
  const admin = useAdmin();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [hasOrganization, setHasOrganization] = useState(false);

  const canCreate = canCreateTournaments || admin.hasPermission('tournaments:create');

  // Check if user has an organization
  useEffect(() => {
    const checkOrganization = async () => {
      if (!user?.id || (currentRole !== 'organizer' && !admin.hasPermission('tournaments:create'))) {
        setLoading(false);
        return;
      }
      try {
        const roles = await fetchMeRoles();
        setHasOrganization(deriveHasOrganization(roles));
      } catch {
        setHasOrganization(false);
      } finally {
        setLoading(false);
      }
    };
    checkOrganization();
  }, [user?.id, currentRole, admin]);

  if (!user) {
    return (
      <div className="min-h-screen bg-transparent text-white flex flex-col">
        <main className="flex-grow container mx-auto px-4 py-8">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You must be signed in to create tournaments.
            </AlertDescription>
          </Alert>
        </main>
        <Footer />
      </div>
    );
  }

  if (!canCreate) {
    return (
      <div className="min-h-screen bg-transparent text-white flex flex-col">
        <main className="flex-grow container mx-auto px-4 py-8">
          <div className="text-center max-w-md mx-auto p-6">
            <div className="w-16 h-16 mx-auto mb-4 bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
              <Trophy className="h-8 w-8 text-white" />
            </div>
            <div className="text-esports-primary text-xl font-semibold mb-2">Player Mode</div>
            <div className="text-esports-secondary text-sm mb-4">
              You're currently in Player mode. Switch to Organizer mode to create tournaments.
            </div>
            <div className="text-xs text-gray-500">
              As a player, you can create teams and join tournaments but not create them. Switch roles to access organizer features.
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-esports-accent" />
          <span className="text-gray-400">Loading...</span>
        </div>
      </div>
    );
  }

  if (!hasOrganization && !admin.hasPermission('tournaments:create')) {
    return (
      <div className="min-h-screen bg-transparent text-white flex flex-col">
        <main className="flex-grow container mx-auto px-4 py-20 relative z-10">
          <div className="max-w-lg mx-auto text-center">
            <div className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 mb-8">
              <Building2 className="h-12 w-12 text-amber-400" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold font-heading mb-4">
              Setup Your Organization First
            </h1>
            <p className="text-gray-400 text-lg mb-8 max-w-md mx-auto">
              Before you can host tournaments, you need to create your organization.
              This will be your public brand that players will see.
            </p>
            <div className="grid grid-cols-1 gap-3 mb-10 text-left max-w-sm mx-auto">
              {[
                'Your organization name appears on all tournaments',
                'Build a recognizable esports brand',
                'Get a public profile page for your org',
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 text-sm text-gray-300">
                  <div className="w-1.5 h-1.5 rounded-full bg-esports-accent flex-shrink-0" />
                  {item}
                </div>
              ))}
            </div>
            <Button
              onClick={() => navigate('/organizer/setup-organization')}
              className="px-8 py-6 text-lg font-semibold bg-gradient-to-r from-esports-purple to-esports-accent hover:from-esports-purple/90 hover:to-esports-accent/90 shadow-lg shadow-esports-purple/25 gap-2"
            >
              Setup Organization
              <ArrowRight className="h-5 w-5" />
            </Button>
            <p className="text-gray-500 text-sm mt-6">
              Takes less than 2 minutes to complete
            </p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (searchParams.get('mode') === 'season') {
    return <Navigate to="/organizer/seasons/create" replace />;
  }

  return (
    <div className="min-h-screen bg-transparent text-white flex flex-col">
      <main className="flex-grow">
        <WizardContainer />
      </main>
      <Footer />
    </div>
  );
};

export default CreateTournament;
