import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getCountryFlagUrl } from '@/utils/countries';
import EditProfileDialog from './EditProfileDialog';

interface PlayerProfileProps {
  profileData?: any;
  isOwnProfile?: boolean;
}

const PlayerProfile = ({ profileData, isOwnProfile = true }: PlayerProfileProps) => {
  const { profile: authProfile } = useAuth();
  const displayProfile = profileData || authProfile;
  const [editOpen, setEditOpen] = useState(false);
  const [autoOpenAvatarPicker, setAutoOpenAvatarPicker] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (isOwnProfile && (location.state as any)?.openAvatarPicker) {
      setEditOpen(true);
      setAutoOpenAvatarPicker(true);
      navigate(location.pathname, { replace: true, state: {} });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <h2 className="text-2xl font-bold">
          {isOwnProfile ? 'My Profile' : `${displayProfile?.username}'s Profile`}
        </h2>
        {isOwnProfile && (
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <Settings className="mr-2 h-4 w-4" />
            Edit Profile
          </Button>
        )}
      </div>

      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-6">
        <div className="flex flex-col sm:flex-row gap-6 items-start">
          {/* Avatar */}
          <Avatar className="h-24 w-24 shrink-0">
            <AvatarImage src={displayProfile?.avatar_url || ''} alt={displayProfile?.username} />
            <AvatarFallback className="text-xl">{displayProfile?.username?.substring(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>

          {/* Info */}
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-2xl font-bold">{displayProfile?.username}</h3>
              {displayProfile?.country_code && (
                <img
                  src={getCountryFlagUrl(displayProfile.country_code)}
                  alt={displayProfile.country_code}
                  className="w-6 h-4 object-cover rounded shadow-sm border border-white/10"
                  title={displayProfile.country_code}
                />
              )}
            </div>

            {displayProfile?.full_name && (
              <p className="text-gray-400">{displayProfile.full_name}</p>
            )}

            {displayProfile?.bio && (
              <p className="text-gray-300 text-sm max-w-prose italic">"{displayProfile.bio}"</p>
            )}

            {isOwnProfile && displayProfile?.email && (
              <p className="text-gray-500 text-sm">{displayProfile.email}</p>
            )}
          </div>
        </div>
      </div>

      {isOwnProfile && (
        <EditProfileDialog
          open={editOpen}
          onOpenChange={(v) => { setEditOpen(v); if (!v) setAutoOpenAvatarPicker(false); }}
          autoOpenAvatarPicker={autoOpenAvatarPicker}
        />
      )}
    </div>
  );
};

export default PlayerProfile;
