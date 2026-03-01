import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Edit, Disc, Shield, ShieldCheck, Link2Off, Loader2, ExternalLink } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from '@/lib/supabase';
import { useRiotAccount } from '@/hooks/useRiotAccount';
import { useFaceitAccount } from '@/hooks/useFaceitAccount';
import { useToast } from '@/hooks/use-toast';
import EditProfileDialog from './EditProfileDialog';
import { getCountryFlag, getCountryFlagUrl } from '@/utils/countries';

const DiscordLogo = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 127.14 96.36" className={className} fill="currentColor">
    <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.15,105.15,0,0,0,19.39,8.07C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36a77.7,77.7,0,0,0,6.89-11.1A77.2,77.2,0,0,1,28.2,80.13a20.11,20.11,0,0,0,2.15-1.55c2.39,1.74,5.08,3.22,7.74,4.56,9.15,4.64,19.26,7.1,29.41,7.1,10.15,0,20.26-2.46,29.41-7.1,2.66-1.34,5.35-2.82,7.74-4.56a20.11,20.11,0,0,0,2.15,1.55A77.2,77.2,0,0,1,95.6,85.26a77.7,77.7,0,0,0,6.89,11.1A105.73,105.73,0,0,0,126.6,80.21h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.31,60,73.31,53s5-12.74,11.43-12.74S96.2,46,96.09,53,91.04,65.69,84.69,65.69Z" />
  </svg>
);

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
  const { faceitAccount, isLoading: faceitLoading, linkFaceitAccount, unlinkFaceitAccount, refetch: refetchFaceit } = useFaceitAccount();
  const { toast } = useToast();

  // Use passed profile data or fall back to auth profile
  const displayProfile = profileData || authProfile;

  // Handle RSO callback query params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    // ── NEW SECURE CALLBACK FLOW ──
    const riotCallback = params.get('riot_callback');
    if (riotCallback === 'true') {
      const code = params.get('code');
      const state = params.get('state');
      const storedState = sessionStorage.getItem('riotOAuthState');

      if (!state || state !== storedState) {
        toast({
          title: 'Security Error',
          description: 'Invalid security token (CSRF mismatch). Request blocked to protect your account.',
          variant: 'destructive',
        });
        sessionStorage.removeItem('riotOAuthState');
        window.history.replaceState({}, '', window.location.pathname);
        return;
      }

      // State matches! Consume it.
      sessionStorage.removeItem('riotOAuthState');

      const linkAccount = async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/riot-oauth`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session?.access_token}`
            },
            body: JSON.stringify({ code })
          });

          const data = await res.json();
          if (!res.ok) throw new Error(data.reason || data.error || 'Failed to link account');

          toast({
            title: 'Riot Account Linked!',
            description: data.gameName ? `Successfully linked ${data.gameName}#${data.tagLine}` : 'Your Riot account has been linked.',
          });
          refetchRiot();
        } catch (err: any) {
          toast({
            title: 'Riot Linking Failed',
            description: err.message,
            variant: 'destructive',
          });
        } finally {
          window.history.replaceState({}, '', window.location.pathname);
        }
      };

      linkAccount();
      return;
    }

    // ── FACEIT CALLBACK FLOW ──
    const faceitCallback = params.get('faceit_callback');
    if (faceitCallback === 'true') {
      const code = params.get('code');
      const state = params.get('state');
      const storedState = sessionStorage.getItem('faceitOAuthState');

      if (!state || state !== storedState) {
        toast({
          title: 'Security Error',
          description: 'Invalid security token (CSRF mismatch). Request blocked.',
          variant: 'destructive',
        });
        sessionStorage.removeItem('faceitOAuthState');
        window.history.replaceState({}, '', window.location.pathname);
        return;
      }

      sessionStorage.removeItem('faceitOAuthState');

      const linkFaceit = async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/faceit-oauth`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session?.access_token}`,
            },
            body: JSON.stringify({ code }),
          });

          const data = await res.json();
          if (!res.ok) throw new Error(data.detail || data.error || 'Failed to link account');

          toast({
            title: 'Faceit Account Linked!',
            description: data.nickname ? `Successfully linked "${data.nickname}"` : 'Your Faceit account has been linked.',
          });
          refetchFaceit();
        } catch (err: any) {
          toast({ title: 'Faceit Linking Failed', description: err.message, variant: 'destructive' });
        } finally {
          window.history.replaceState({}, '', window.location.pathname);
        }
      };

      linkFaceit();
      return;
    }

    // ── FACEIT ERROR REDIRECT ──
    const faceitLinked = params.get('faceit_linked');
    if (faceitLinked === 'error') {
      const reason = params.get('reason') || 'unknown';
      toast({
        title: 'Faceit Linking Failed',
        description: `Could not link Faceit account: ${reason.replace(/_/g, ' ')}`,
        variant: 'destructive',
      });
      window.history.replaceState({}, '', window.location.pathname);
    }

    // ── OLD/FALLBACK FLOW (for error redirects directly from Edge) ──
    const riotLinked = params.get('riot_linked');
    if (riotLinked === 'success') {
      const gameName = params.get('game_name');
      const tagLine = params.get('tag_line');
      toast({
        title: 'Riot Account Linked!',
        description: gameName ? `Successfully linked ${gameName}#${tagLine}` : 'Your Riot account has been linked.',
      });
      refetchRiot();
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

  const handleUnlinkFaceit = async () => {
    try {
      await unlinkFaceitAccount();
      toast({ title: 'Faceit Account Unlinked', description: 'Your Faceit account has been removed.' });
    } catch {
      toast({ title: 'Error', description: 'Failed to unlink Faceit account.', variant: 'destructive' });
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
                  <div className="flex items-center justify-center p-8 rounded-xl border border-white/5 bg-white/5">
                    <Loader2 className="w-6 h-6 animate-spin text-gaming-primary" />
                  </div>
                ) : riotAccount ? (
                  <div className="relative overflow-hidden group rounded-xl border border-red-500/20 bg-gradient-to-br from-red-500/10 to-[#111] hover:border-red-500/40 transition-all duration-300">
                    <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity duration-500 pointer-events-none">
                      <img src="/riot-logo.svg" alt="" className="w-40 h-40" />
                    </div>
                    <div className="absolute top-0 left-0 w-1 h-full bg-red-500 rounded-l-xl"></div>
                    <div className="p-4 relative z-10 flex flex-col h-full justify-between gap-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <img src="/riot-logo.svg" alt="Riot Games" className="w-5 h-5 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                          <span className="font-bold text-red-500 tracking-wide text-sm uppercase drop-shadow-md">Riot Games</span>
                        </div>
                        <Badge variant="outline" className="border-red-500/30 text-red-400 bg-red-500/10 px-2 py-0 text-[10px] font-bold shadow-[0_0_10px_rgba(239,68,68,0.2)]">VERIFIED</Badge>
                      </div>

                      <div>
                        <div className="font-black text-2xl text-white tracking-tight flex items-baseline gap-1">
                          {riotAccount.game_name}
                          <span className="text-red-500/70 text-lg font-bold">#{riotAccount.tag_line}</span>
                        </div>
                        <p className="text-[11px] text-gray-400 mt-1 font-medium">Ready for tournament registration.</p>
                      </div>

                      <div className="flex justify-end border-t border-red-500/10 pt-3 mt-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-gray-400 hover:text-red-400 hover:bg-red-500/10 text-xs h-8 px-3 transition-colors"
                          onClick={handleUnlinkRiot}
                        >
                          <Link2Off className="w-3.5 h-3.5 mr-1.5" /> Unlink Account
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="relative overflow-hidden group rounded-xl border border-white/5 bg-[#111]/50 hover:bg-[#151515] transition-all duration-300">
                    <div className="p-5 relative z-10 flex flex-col items-center text-center">
                      <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300 text-red-500">
                        <Shield className="w-6 h-6 opacity-80 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <h4 className="font-bold text-white mb-1">Connect Riot Games</h4>
                      <p className="text-gray-400 text-xs mb-4 max-w-[200px]">Required for verified tournament registration & tracking.</p>
                      <Button
                        onClick={linkRiotAccount}
                        className="w-full bg-red-600 hover:bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.3)] hover:shadow-[0_0_20px_rgba(239,68,68,0.5)] transition-all"
                      >
                        <Shield className="w-4 h-4 mr-2" /> Link Riot Account
                      </Button>
                    </div>
                  </div>
                )
              ) : (
                riotAccount ? (
                  <div className="relative overflow-hidden rounded-xl border border-red-500/20 bg-gradient-to-br from-red-500/5 to-transparent">
                    <div className="absolute top-0 left-0 w-1 h-full bg-red-500/50 rounded-l-xl"></div>
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
                ) : null
              )}

              {/* ── Faceit Account Section ── */}
              {isOwnProfile ? (
                faceitLoading ? (
                  <div className="flex items-center justify-center p-8 rounded-xl border border-white/5 bg-white/5">
                    <Loader2 className="w-6 h-6 animate-spin text-gaming-primary" />
                  </div>
                ) : faceitAccount ? (
                  <div className="relative overflow-hidden group rounded-xl border border-orange-500/20 bg-gradient-to-br from-orange-500/10 to-[#111] hover:border-orange-500/40 transition-all duration-300">
                    <div className="absolute top-0 left-0 w-1 h-full bg-orange-500 rounded-l-xl" />
                    <div className="p-4 relative z-10 flex flex-col h-full justify-between gap-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <img src="/faceit-logo.svg" alt="Faceit" className="w-5 h-5 drop-shadow-[0_0_8px_rgba(255,85,0,0.5)]" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                          <span className="font-bold text-orange-500 tracking-wide text-sm uppercase drop-shadow-md">FACEIT</span>
                        </div>
                        <Badge variant="outline" className="border-orange-500/30 text-orange-400 bg-orange-500/10 px-2 py-0 text-[10px] font-bold">VERIFIED</Badge>
                      </div>
                      <div>
                        <div className="font-black text-2xl text-white tracking-tight">{faceitAccount.nickname}</div>
                        <p className="text-[11px] text-gray-400 mt-1 font-medium">Ready for CS2 tournament registration.</p>
                      </div>
                      <div className="flex justify-end border-t border-orange-500/10 pt-3 mt-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-gray-400 hover:text-orange-400 hover:bg-orange-500/10 text-xs h-8 px-3 transition-colors"
                          onClick={handleUnlinkFaceit}
                        >
                          <Link2Off className="w-3.5 h-3.5 mr-1.5" /> Unlink Account
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="relative overflow-hidden group rounded-xl border border-white/5 bg-[#111]/50 hover:bg-[#151515] transition-all duration-300">
                    <div className="p-5 relative z-10 flex flex-col items-center text-center">
                      <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300 text-orange-500">
                        <Shield className="w-6 h-6 opacity-80 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <h4 className="font-bold text-white mb-1">Connect Faceit</h4>
                      <p className="text-gray-400 text-xs mb-4 max-w-[200px]">Required for CS2 tournament registration & match verification.</p>
                      <Button
                        onClick={linkFaceitAccount}
                        className="w-full bg-orange-600 hover:bg-orange-500 text-white shadow-[0_0_15px_rgba(255,85,0,0.3)] hover:shadow-[0_0_20px_rgba(255,85,0,0.5)] transition-all"
                      >
                        <Shield className="w-4 h-4 mr-2" /> Link Faceit Account
                      </Button>
                    </div>
                  </div>
                )
              ) : (
                faceitAccount ? (
                  <div className="relative overflow-hidden rounded-xl border border-orange-500/20 bg-gradient-to-br from-orange-500/5 to-transparent">
                    <div className="absolute top-0 left-0 w-1 h-full bg-orange-500/50 rounded-l-xl" />
                    <div className="p-4 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-1.5 text-orange-500 font-bold text-[10px] uppercase tracking-wider mb-1">
                          FACEIT
                        </div>
                        <div className="font-bold text-white text-lg">{faceitAccount.nickname}</div>
                      </div>
                      <ShieldCheck className="w-5 h-5 text-orange-500/50" />
                    </div>
                  </div>
                ) : null
              )}

              {/* ── Discord Section ── */}
              {isOwnProfile && isDiscordSignup && (
                discordIdentity ? (
                  <div className="relative overflow-hidden group rounded-xl border border-[#5865F2]/20 bg-gradient-to-br from-[#5865F2]/10 to-[#111] hover:border-[#5865F2]/40 transition-all duration-300">
                    <div className="absolute -right-2 -bottom-4 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity duration-500 pointer-events-none">
                      <DiscordLogo className="w-32 h-32" />
                    </div>
                    <div className="absolute top-0 left-0 w-1 h-full bg-[#5865F2] rounded-l-xl"></div>
                    <div className="p-4 relative z-10 flex flex-col h-full justify-between gap-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <DiscordLogo className="w-5 h-5 text-[#5865F2] drop-shadow-[0_0_8px_rgba(88,101,242,0.5)]" />
                          <span className="font-bold text-[#5865F2] tracking-wide text-sm uppercase drop-shadow-[0_0_8px_rgba(88,101,242,0.5)]">Discord</span>
                        </div>
                        <Badge variant="outline" className="border-[#5865F2]/30 text-[#5865F2] bg-[#5865F2]/10 px-2 py-0 text-[10px] font-bold shadow-[0_0_10px_rgba(88,101,242,0.2)]">CONNECTED</Badge>
                      </div>
                      <div className="font-black text-xl text-white tracking-tight">
                        {discordIdentity.identity_data?.full_name || discordIdentity.identity_data?.name || discordIdentity.identity_data?.email || 'Linked User'}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="relative overflow-hidden group rounded-xl border border-white/5 bg-[#111]/50 hover:bg-[#151515] transition-all duration-300">
                    <div className="p-5 relative z-10 flex flex-col items-center text-center">
                      <div className="w-12 h-12 rounded-full bg-[#5865F2]/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300">
                        <DiscordLogo className="w-6 h-6 text-[#5865F2] opacity-80 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <h4 className="font-bold text-white mb-1">Connect Discord</h4>
                      <p className="text-gray-400 text-xs mb-4 max-w-[200px]">Link your Discord to participate in community tournaments.</p>
                      <Button
                        onClick={linkDiscord}
                        className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white shadow-[0_0_15px_rgba(88,101,242,0.3)] hover:shadow-[0_0_20px_rgba(88,101,242,0.5)] transition-all"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" /> Link Discord
                      </Button>
                    </div>
                  </div>
                )
              )}

              {/* Public profile or non-discord signup: Just show an empty state or nothing for Discord */}
              {!isOwnProfile && !riotAccount && (
                <div className="flex items-center justify-center h-24 border border-white/5 bg-[#111]/30 rounded-xl text-center">
                  <span className="text-gray-500 italic text-sm">Game accounts are private.</span>
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
