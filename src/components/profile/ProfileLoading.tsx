
import React from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface ProfileLoadingProps {
  error?: string | null;
  onRetry?: () => void;
}

export const ProfileLoading: React.FC<ProfileLoadingProps> = ({ error, onRetry }) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-transparent text-white flex flex-col">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 py-8 flex justify-center items-center">
        <div className="text-center">
          {error ? (
            <div className="space-y-4">
              <div className="text-red-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-3 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-xl font-semibold mb-2">Error Loading Profile</p>
                <p className="mb-4">{error}</p>
              </div>
              <div className="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-3 justify-center">
                {onRetry && (
                  <Button 
                    onClick={onRetry}
                    variant="outline"
                    className="border-esports-accent text-esports-accent"
                  >
                    Retry
                  </Button>
                )}
                <Button 
                  onClick={() => navigate('/auth/signin')}
                  className="btn-esports-blue"
                >
                  Sign In
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-esports-accent mx-auto mb-4"></div>
              <p>Loading profile...</p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};
