import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Edit, Disc, Shield, ShieldCheck, Link2Off, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from '@/lib/supabase';
import { useRiotAccount } from '@/hooks/useRiotAccount';
import { useToast } from '@/hooks/use-toast';
import EditProfileDialog from './EditProfileDialog';
import { getCountryFlag, getCountryFlagUrl } from '@/utils/countries';

interface PlayerProfileProps {
  profileData?: any;
  isOwnProfile?: boolean;
}

const PlayerProfile = ({ profileData, isOwnProfile = true }: PlayerProfileProps) => {
  const { profile: authProfile, user } = useAuth();
  const isDiscordSignup = user?.app_metadata?.provider === 'discord';
  const [editMode, setEditMode] = useState(false);
  const [discordIdentity, setDiscordIdentity] = useState<any>(null);
  const { riotAccount, isLoading: riotLoading, linkRiotAccount, unlinkRiotAccount, refetch: refetchRiot } = useRiotAccount();
  const { toast } = useToast();

  // Use passed profile data or fall back to auth profile
  const displayProfile = profileData || authProfile;

  // Handle RSO callback query params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const riotLinked = params.get('riot_linked');
    if (riotLinked === 'success') {
      const gameName = params.get('game_name');
      const tagLine = params.get('tag_line');
      toast({
        title: 'Riot Account Linked!',
        description: gameName ? `Successfully linked ${gameName}#${tagLine}` : 'Your Riot account has been linked.',
      });
      refetchRiot();
      // Clean up query params
      window.history.replaceState({}, '', window.location.pathname);
    } else if (riotLinked === 'error') {
      const reason = params.get('reason') || 'unknown';
      toast({
        title: 'Riot Linking Failed',
        description: `Could not link Riot account: ${reason.replace(/_/g, ' ')}`,
        variant: 'destructive',
      });
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  useEffect(() => {
    const checkDiscordLink = async () => {
      if (!isOwnProfile || !user) return;
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const discord = currentUser?.identities?.find(id => id.provider === 'discord');
      setDiscordIdentity(discord);
    };
    checkDiscordLink();
  }, [user, isOwnProfile]);

  const linkDiscord = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: {
        redirectTo: window.location.href,
        scopes: 'identify email'
      }
    });
  };

  const handleUnlinkRiot = async () => {
    try {
      await unlinkRiotAccount();
      toast({ title: 'Riot Account Unlinked', description: 'Your Riot account has been removed.' });
    } catch {
      toast({ title: 'Error', description: 'Failed to unlink Riot account.', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <h2 className="text-2xl font-bold mb-2">{isOwnProfile ? 'My Profile' : `${displayProfile?.username}'s Profile`}</h2>
        {isOwnProfile && (
          <Button variant="outline" onClick={() => setEditMode(!editMode)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit Profile
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                {displayProfile?.license_id && (
                  <div className="pt-2 border-t border-white/5">
                    <div className="text-[10px] text-gray-500 font-mono uppercase tracking-[0.2em] mb-1">Professional License ID</div>
                    <div className="font-mono text-xs text-rose-500/80 break-all bg-rose-500/5 p-2 rounded border border-rose-500/10">
                      {displayProfile.license_id}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gaming-dark border-gaming-gray/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl font-bold">Game Accounts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* ── Riot Account Section ── */}
              {isOwnProfile ? (
                riotLoading ? (
                  <div className="flex items-center justify-center p-4">
                    <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                  </div>
                ) : riotAccount ? (
                  <div className="p-4 border border-red-500/30 bg-red-500/5 rounded-md space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-red-500 font-bold text-sm">
                        <ShieldCheck className="w-4 h-4" />
                        Riot Linked
                      </div>
                      <Badge variant="outline" className="border-red-500/40 text-red-400 text-[10px]">VERIFIED</Badge>
                    </div>
                    <div className="font-mono text-white text-lg">
                      {riotAccount.game_name}<span className="text-gray-500">#{riotAccount.tag_line}</span>
                    </div>
                    <p className="text-[11px] text-gray-500">This Riot ID is verified and cannot be changed manually.</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-gray-500 hover:text-red-400 text-xs mt-1 h-7 px-2"
                      onClick={handleUnlinkRiot}
                    >
                      <Link2Off className="w-3 h-3 mr-1" /> Unlink
                    </Button>
                  </div>
                ) : (
                  <div className="p-4 border border-red-500/20 bg-red-900/10 rounded-md text-center">
                    <Shield className="w-8 h-8 text-red-500/50 mx-auto mb-2" />
                    <p className="text-gray-400 text-sm mb-3">Link your Riot account for verified tournament registration.</p>
                    <Button
                      onClick={linkRiotAccount}
                      className="w-full bg-red-600 hover:bg-red-700 text-white"
                    >
                      <Shield className="w-4 h-4 mr-2" /> Link Riot Account
                    </Button>
                  </div>
                )
              ) : (
                // Public profile: show linked Riot ID if available (no private data)
                riotAccount ? (
                  <div className="p-4 border border-red-500/30 bg-red-500/5 rounded-md">
                    <div className="flex items-center gap-2 text-red-500 font-bold text-sm mb-1">
                      <ShieldCheck className="w-4 h-4" /> Riot Linked
                    </div>
                    <div className="font-mono text-white">
                      {riotAccount.game_name}<span className="text-gray-500">#{riotAccount.tag_line}</span>
                    </div>
                  </div>
                ) : null
              )}

              {/* ── Discord Section ── */}
              {isOwnProfile && isDiscordSignup && (
                discordIdentity ? (
                  <div className="p-4 border border-[#5865F2]/30 bg-[#5865F2]/10 rounded-md flex items-center justify-between">
                    <div>
                      <div className="text-[#5865F2] font-bold text-sm mb-1 flex items-center gap-2">
                        <Disc className="w-4 h-4" /> Discord Connected
                      </div>
                      <div className="font-mono text-white">
                        {discordIdentity.identity_data?.full_name || discordIdentity.identity_data?.name || discordIdentity.identity_data?.email || 'Linked'}
                      </div>
                    </div>
                  </div>
                ) : (
                  // Fallback if metadata says Discord but identity is missing (rare)
                  <div className="text-center">
                    <p className="text-gray-400 text-sm mb-4">Link your Discord to participate in tournaments.</p>
                    <Button
                      onClick={linkDiscord}
                      className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white"
                    >
                      Link Discord
                    </Button>
                  </div>
                )
              )}

              {/* Public profile or non-discord signup: Just show an empty state or nothing for Discord */}
              {!isOwnProfile && !riotAccount && (
                <div className="text-center text-gray-500 italic">
                  Game accounts are private.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

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

      {isOwnProfile && (
        <EditProfileDialog open={editMode} onOpenChange={setEditMode} />
      )}
    </div>
  );
};

export default PlayerProfile;
