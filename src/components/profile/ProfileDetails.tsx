import React from 'react';
import { User, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { UserProfile } from '@/types/auth';
import { EditProfileForm } from './EditProfileForm';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

interface ProfileDetailsProps {
  profile: UserProfile;
  error: string | null;
  loading: {
    signOut: boolean;
    updateProfile: boolean;
  };
  onSignOut: () => Promise<void>;
  onUpdateProfile: (updates: Partial<UserProfile>) => Promise<void>;
}

export const ProfileDetails = ({ 
  profile, 
  error, 
  loading, 
  onSignOut, 
  onUpdateProfile 
}: ProfileDetailsProps) => {
  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">My Profile</h1>
      
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <div className="bg-gaming-dark rounded-lg shadow-md p-6 border border-gaming-gray/30">
        <div className="flex items-center gap-4 mb-6">
          <div className="relative">
            <Avatar className="w-16 h-16">
              <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name || profile?.username || 'Profile'} />
              <AvatarFallback className="text-xl bg-gray-700 text-white">
                {(profile?.full_name || profile?.username || 'U').charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
          <div>
            <h2 className="text-xl font-semibold">
              {profile?.full_name || profile?.username || 'User'}
            </h2>
            <p className="text-gaming-gray-light">{profile?.email || ''}</p>
          </div>
        </div>
        
        <div className="space-y-2 mb-6">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-gaming-gray-light" />
            <p><span className="font-medium">Username:</span> {profile?.username || 'N/A'}</p>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-4">
          <EditProfileForm 
            profile={profile}
            onUpdateProfile={onUpdateProfile}
            loading={loading.updateProfile}
          />
          <Button 
            onClick={onSignOut} 
            className="bg-gaming-purple hover:bg-gaming-purple/80 flex items-center gap-2"
            disabled={loading.signOut}
          >
            <LogOut className="h-4 w-4" />
            {loading.signOut ? 'Signing Out...' : 'Sign Out'}
          </Button>
        </div>
      </div>
    </div>
  );
};
