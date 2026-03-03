import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Settings, ShieldCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useRiotAccount } from '@/hooks/useRiotAccount';
import { useFaceitAccount } from '@/hooks/useFaceitAccount';
import { getCountryFlagUrl } from '@/utils/countries';

interface PlayerProfileProps {
  profileData?: any;
  isOwnProfile?: boolean;
}

const PlayerProfile = ({ profileData, isOwnProfile = true }: PlayerProfileProps) => {
  const { profile: authProfile } = useAuth();
  const { riotAccount } = useRiotAccount();
  const { faceitAccount } = useFaceitAccount();

  const displayProfile = profileData || authProfile;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <h2 className="text-2xl font-bold mb-2">
          {isOwnProfile ? 'My Profile' : `${displayProfile?.username}'s Profile`}
        </h2>
        {isOwnProfile && (
          <Link to="/account/settings">
            <Button variant="outline">
              <Settings className="mr-2 h-4 w-4" />
              Edit Profile
            </Button>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Card */}
        <Card className="bg-gaming-dark border-gaming-gray/30">
          <CardHeader className="flex flex-row items-center justify-center pb-2 space-y-0">
            <Avatar className="h-24 w-24">
              <AvatarImage src={displayProfile?.avatar_url || ''} alt={displayProfile?.username} />
              <AvatarFallback>{displayProfile?.username?.substring(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center mt-2">
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold">{displayProfile?.username}</h3>
                {displayProfile?.country_code && (
                  <img
                    src={getCountryFlagUrl(displayProfile.country_code)}
                    alt={displayProfile.country_code}
                    className="w-6 h-4 object-cover rounded shadow-sm border border-white/10"
                    title={displayProfile.country_code}
                  />
                )}
              </div>
              <p className="text-gray-400">{displayProfile?.full_name}</p>

              {displayProfile?.bio && (
                <div className="mt-4 px-4 text-center text-sm text-gray-300 italic">
                  "{displayProfile.bio}"
                </div>
              )}

              <div className="mt-6 space-y-3 w-full">
                {isOwnProfile && (
                  <div>
                    <div className="text-sm text-gray-400 mb-1">Email</div>
                    <div>{displayProfile?.email}</div>
                  </div>
                )}
                <div>
                  <div className="text-sm text-gray-400 mb-1">Member Since</div>
                  <div>April 2025</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Game Accounts */}
        <Card className="bg-gaming-dark border-gaming-gray/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl font-bold">Game Accounts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Riot */}
              {riotAccount ? (
                <div className="relative overflow-hidden rounded-xl border border-red-500/20 bg-gradient-to-br from-red-500/5 to-transparent">
                  <div className="absolute top-0 left-0 w-1 h-full bg-red-500/50 rounded-l-xl" />
                  <div className="p-4 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 text-red-500 font-bold text-[10px] uppercase tracking-wider mb-1">
                        <img src="/riot-logo.svg" alt="" className="w-3 h-3" /> Riot Games
                      </div>
                      <div className="font-bold text-white text-lg">
                        {riotAccount.game_name}<span className="text-red-500/70">#{riotAccount.tag_line}</span>
                      </div>
                    </div>
                    <ShieldCheck className="w-5 h-5 text-red-500/50" />
                  </div>
                </div>
              ) : isOwnProfile ? (
                <div className="flex items-center justify-center h-20 border border-white/5 bg-white/[0.02] rounded-xl text-center">
                  <span className="text-gray-600 text-xs">Riot not linked</span>
                </div>
              ) : null}

              {/* Faceit */}
              {faceitAccount ? (
                <div className="relative overflow-hidden rounded-xl border border-orange-500/20 bg-gradient-to-br from-orange-500/5 to-transparent">
                  <div className="absolute top-0 left-0 w-1 h-full bg-orange-500/50 rounded-l-xl" />
                  <div className="p-4 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 text-orange-500 font-bold text-[10px] uppercase tracking-wider mb-1">
                        Faceit
                      </div>
                      <div className="font-bold text-white text-lg">{faceitAccount.nickname}</div>
                    </div>
                    <ShieldCheck className="w-5 h-5 text-orange-500/50" />
                  </div>
                </div>
              ) : isOwnProfile ? (
                <div className="flex items-center justify-center h-20 border border-white/5 bg-white/[0.02] rounded-xl text-center">
                  <span className="text-gray-600 text-xs">Faceit not linked</span>
                </div>
              ) : null}

              {/* Empty state for public profiles */}
              {!isOwnProfile && !riotAccount && !faceitAccount && (
                <div className="flex items-center justify-center h-24 border border-white/5 bg-[#111]/30 rounded-xl text-center">
                  <span className="text-gray-500 italic text-sm">No public game accounts.</span>
                </div>
              )}

              {/* Own profile: link to manage */}
              {isOwnProfile && (
                <Link
                  to="/account/settings?tab=connected_accounts"
                  className="block text-center text-xs text-gray-600 hover:text-rose-400 transition-colors pt-1"
                >
                  Manage connected accounts →
                </Link>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Player Stats */}
        <Card className="bg-gaming-dark border-gaming-gray/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl font-bold">Player Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-40 text-gray-500 text-sm italic">
              No stats recorded yet.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PlayerProfile;
