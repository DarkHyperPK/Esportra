import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/MongoAuthContext';
import { useToast } from '@/hooks/use-toast';
import Footer from '@/components/Footer';
import { ProfileLoading } from '@/components/profile/ProfileLoading';
import { ProfileError } from '@/components/profile/ProfileError';
import { ProfileDetails } from '@/components/profile/ProfileDetails';

const Profile = () => {
  const { user, logout, updateProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState({
    signOut: false,
    updateProfile: false
  });
  const [error, setError] = useState<string | null>(null);

  const handleSignOut = async () => {
    try {
      setLoading(prev => ({ ...prev, signOut: true }));
      setError(null);
      await logout();
      navigate('/auth/signin');
      toast({
        title: "Signed out successfully",
        description: "You have been signed out of your account.",
      });
    } catch (error: any) {
      console.error("Error signing out:", error);
      setError(error.message || 'Error signing out');
      toast({
        title: "Error signing out",
        description: error.message || 'An unexpected error occurred',
        variant: "destructive",
      });
    } finally {
      setLoading(prev => ({ ...prev, signOut: false }));
    }
  };

  if (!user || !profile) {
    return <ProfileLoading />;
  }

  if (error) {
    return <ProfileError message={error} />;
  }

  return (
    <div className="min-h-screen bg-esports-dark text-white flex flex-col">
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Profile Settings</h1>
          <div className="grid gap-6">
            <ProfileDetails
              profile={user}
              error={error}
              loading={loading}
              onSignOut={handleSignOut}
              onUpdateProfile={updateProfile}
            />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Profile;
