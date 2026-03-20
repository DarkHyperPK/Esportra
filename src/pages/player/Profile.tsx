import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import Footer from "@/components/Footer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Gamepad2, Calendar, User, Medal } from "lucide-react";
import PlayerProfile from "@/components/player/PlayerProfile";
import PlayerTournaments from "@/components/player/PlayerTournaments";
import PlayerBookings from "@/components/player/PlayerBookings";
import TeamCreationWizard from "@/components/player/TeamCreationWizard";
import TeamInvites from "@/components/player/TeamInvites";
import PlayerAchievements from "@/components/player/PlayerAchievements";
import { Link, useParams } from 'react-router-dom';
import { apiClient } from "@/lib/apiClient";
import { useQuery } from '@tanstack/react-query';

const PlayerProfilePage = () => {
  const { profile: authProfile } = useAuth();
  const { username } = useParams();
  const [activeTab, setActiveTab] = useState("profile");

  const profileQuery = useQuery({
    queryKey: ['profile', 'by-username', username],
    queryFn: () => apiClient.get<any>(`/api/profiles/by-username/${username}`),
    enabled: !!username,
    staleTime: 1000 * 60 * 5,
  });
  const displayedProfile = username ? profileQuery.data ?? null : authProfile;
  const loading = username ? profileQuery.isLoading : false;

  const isOwnProfile = !username || (authProfile && displayedProfile?.id === authProfile.id);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center text-white">
        <div className="w-10 h-10 border-4 border-rose-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!displayedProfile) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center text-white gap-4">
        <h1 className="text-4xl font-bold">User Not Found</h1>
        <p className="text-gray-400">The user @{username} does not exist.</p>
        <Link to="/">
          <button className="px-4 py-2 bg-rose-500 rounded hover:bg-rose-600 transition-colors">Go Home</button>
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-rose-500/30 overflow-x-hidden font-sans">
      {/* Dynamic Background Noise & Grid */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:100px_100px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_70%)]" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-15 brightness-100 contrast-150 mix-blend-overlay"></div>
        <div className={`absolute top-[-20%] right-[-10%] w-[60vw] h-[60vw] bg-rose-600/10 blur-[150px] rounded-full mix-blend-screen`} />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-indigo-600/10 blur-[150px] rounded-full mix-blend-screen" />
      </div>

      <div className="relative z-10 flex-grow container mx-auto px-4 py-12">
        {/* Header Section */}
        <div className="mb-16">
          <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-white/5 pb-8">
            <div>
              <div className={`mb-4 inline-flex items-center gap-2 text-rose-500 font-mono text-xs tracking-[0.5em] uppercase`}>
                <span className={`w-2 h-2 bg-rose-500 animate-pulse rounded-full`} />
                System_Online
              </div>
              <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-none mb-2">
                PLAYER <span className="text-rose-500">PROFILE</span>
              </h1>
              <p className="text-gray-500 font-mono text-sm tracking-widest uppercase">
                /user/{displayedProfile.username || 'UNKNOWN'}
              </p>
            </div>

            <div className="hidden md:flex gap-8">
              <div className="flex flex-col items-end">
                <span className="text-xs text-gray-500 font-mono uppercase tracking-wider">Status</span>
                <span className="text-emerald-500 font-bold tracking-tight">ACTIVE</span>
              </div>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            {/* Sidebar Navigation */}
            <div className="lg:col-span-3 space-y-8">
              <div className="p-1">
                <nav className="space-y-1">
                  <TabsList className="flex flex-col w-full bg-transparent p-0 h-auto space-y-2">
                    {[
                      { id: 'profile', icon: User, label: 'Profile' },
                      { id: 'tournaments', icon: Trophy, label: 'Tournaments' },
                      // Only show private sections if it's the own user's profile
                      ...(isOwnProfile ? [
                        { id: 'bookings', icon: Calendar, label: 'Bookings' },
                        { id: 'teams', icon: Gamepad2, label: 'Teams' },
                        { id: 'achievements', icon: Medal, label: 'Achievements' },
                      ] : [])
                    ].map((item) => (
                      <TabsTrigger
                        key={item.id}
                        value={item.id}
                        className={`group flex items-center w-full px-4 py-4 text-sm font-bold tracking-widest uppercase rounded-none border-l-2 border-transparent transition-all duration-300
                          data-[state=active]:border-rose-500 data-[state=active]:bg-white/5 data-[state=active]:text-rose-500
                          hover:bg-white/5 hover:text-white text-gray-500 justify-start`}
                      >
                        <item.icon className="mr-3 h-4 w-4" />
                        {item.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </nav>
              </div>

              {isOwnProfile && (
                <Link
                  to="/player/history"
                  className="group flex items-center justify-between p-4 border border-zinc-800/50 hover:border-rose-500/50 bg-[#121214] transition-all duration-300"
                >
                  <span className="text-xs font-mono text-gray-400 group-hover:text-rose-500 uppercase tracking-wider">View Full History</span>
                  <Trophy className="h-4 w-4 text-gray-600 group-hover:text-rose-500 transition-colors" />
                </Link>
              )}
            </div>

            {/* Main Content Area */}
            <div className="lg:col-span-9">
              {/* Dynamic Content Container */}
              <div className="bg-[#121214] border border-zinc-800/50 p-1 relative min-h-[500px]">
                {/* Decorative Corners */}
                <div className={`absolute -top-[1px] -left-[1px] w-4 h-4 border-t-2 border-l-2 border-zinc-700`} />
                <div className={`absolute -bottom-[1px] -right-[1px] w-4 h-4 border-b-2 border-r-2 border-zinc-700`} />

                <div className="p-6 md:p-8">
                  <TabsContent value="profile" className="m-0 mt-0 focus-visible:outline-none animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <PlayerProfile profileData={displayedProfile} isOwnProfile={isOwnProfile} />
                  </TabsContent>

                  <TabsContent value="tournaments" className="m-0 mt-0 focus-visible:outline-none animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <PlayerTournaments />
                  </TabsContent>

                  {isOwnProfile && (
                    <>
                      <TabsContent value="bookings" className="m-0 mt-0 focus-visible:outline-none animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <PlayerBookings />
                      </TabsContent>

                      <TabsContent value="teams" className="m-0 mt-0 focus-visible:outline-none animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="space-y-8">
                          <TeamCreationWizard onClose={() => { }} />
                          <TeamInvites />
                        </div>
                      </TabsContent>

                      <TabsContent value="achievements" className="m-0 mt-0 focus-visible:outline-none animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <PlayerAchievements />
                      </TabsContent>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Tabs>
      </div>
      <Footer />
    </div>
  );
};

export default PlayerProfilePage;
