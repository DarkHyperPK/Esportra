
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/contexts/RoleContext';
import Footer from '@/components/Footer';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Trophy } from 'lucide-react';
import { WizardContainer } from '@/components/tournament/wizard';

const CreateTournament = () => {
  const { user } = useAuth();
  const { canCreateTournaments, currentRole } = useRole();

  if (!user) {
    return (
      <div className="min-h-screen bg-esports-dark text-white flex flex-col">
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

  if (!canCreateTournaments) {
    return (
      <div className="min-h-screen bg-esports-dark text-white flex flex-col">
        <main className="flex-grow container mx-auto px-4 py-8">
          <div className="text-center max-w-md mx-auto p-6">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl flex items-center justify-center">
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

  return (
    <div className="min-h-screen bg-esports-dark text-white flex flex-col">
      <main className="flex-grow">
        <WizardContainer />
      </main>
      <Footer />
    </div>
  );
};

export default CreateTournament;
