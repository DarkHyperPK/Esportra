import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import Footer from "@/components/Footer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Gamepad2, Calendar, User, Medal } from "lucide-react";
import PlayerProfile from "@/components/player/PlayerProfile";
import PlayerTournaments from "@/components/player/PlayerTournaments";
import PlayerBookings from "@/components/player/PlayerBookings";
import TeamCreationWizard from "@/components/player/TeamCreationWizard";
import TeamInvites from "@/components/player/TeamInvites";
import PlayerAchievements from "@/components/player/PlayerAchievements";
import { Link } from 'react-router-dom';

const PlayerDashboard = () => {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-40 left-40 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative z-10 flex-grow container mx-auto px-4 py-8">
        {/* Glassy Header */}
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-8 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-r from-purple-500 to-blue-500 rounded-2xl shadow-lg">
                <User className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
                  Player Dashboard
                </h1>
                <p className="text-lg text-gray-300 mt-2">
                  Welcome back, {profile?.full_name || profile?.username}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden lg:flex items-center gap-2 text-sm text-gray-400">
                <Trophy className="h-4 w-4" />
                <span>Gaming Hub</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          {/* Left sidebar */}
          <div className="md:col-span-1">
            <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl">
                  <Gamepad2 className="h-5 w-5 text-white" />
                </div>
                <h2 className="text-xl font-bold text-white">My Gaming</h2>
              </div>
              <nav className="space-y-3">
                <TabsList className="flex flex-col w-full bg-transparent">
                  <TabsTrigger 
                    value="profile"
                    onClick={() => setActiveTab("profile")}
                    className={`justify-start rounded-xl transition-all duration-300 ${
                      activeTab === "profile" 
                        ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg" 
                        : "text-gray-300 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <User className="mr-2 h-5 w-5" />
                    My Profile
                  </TabsTrigger>
                  
                  <TabsTrigger 
                    value="tournaments"
                    onClick={() => setActiveTab("tournaments")}
                    className={`justify-start rounded-xl transition-all duration-300 ${
                      activeTab === "tournaments" 
                        ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg" 
                        : "text-gray-300 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <Trophy className="mr-2 h-5 w-5" />
                    My Tournaments
                  </TabsTrigger>
                  
                  <TabsTrigger 
                    value="bookings"
                    onClick={() => setActiveTab("bookings")}
                    className={`justify-start rounded-xl transition-all duration-300 ${
                      activeTab === "bookings" 
                        ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg" 
                        : "text-gray-300 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <Calendar className="mr-2 h-5 w-5" />
                    My Bookings
                  </TabsTrigger>
                  
                  <TabsTrigger 
                    value="teams"
                    onClick={() => setActiveTab("teams")}
                    className={`justify-start rounded-xl transition-all duration-300 ${
                      activeTab === "teams" 
                        ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg" 
                        : "text-gray-300 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <Gamepad2 className="mr-2 h-5 w-5" />
                    My Teams
                  </TabsTrigger>
                  
                  <TabsTrigger 
                    value="achievements"
                    onClick={() => setActiveTab("achievements")}
                    className={`justify-start rounded-xl transition-all duration-300 ${
                      activeTab === "achievements" 
                        ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg" 
                        : "text-gray-300 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <Medal className="mr-2 h-5 w-5" />
                    Achievements
                  </TabsTrigger>
                </TabsList>
                <Link 
                  to="/tournament-history" 
                  className="block px-4 py-3 rounded-xl hover:bg-gradient-to-r hover:from-purple-600 hover:to-blue-600 text-purple-400 hover:text-white font-semibold mt-4 transition-all duration-300 border border-purple-500/30 hover:border-purple-500/60"
                >
                  <Trophy className="inline-block mr-2 h-5 w-5" />
                  Tournament History
                </Link>
              </nav>
            </div>
          </div>

          {/* Main content area */}
          <div className="md:col-span-4">
            <Tabs value={activeTab} className="w-full">
              <TabsContent value="profile" className="m-0">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6 hover:bg-white/15 transition-all duration-300">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl">
                        <Trophy className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <p className="text-gray-400 text-sm">Tournaments</p>
                        <p className="text-2xl font-bold text-white">12</p>
                        <p className="text-xs text-gray-400">Participated</p>
                      </div>
                    </div>
                  </div>
                  <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6 hover:bg-white/15 transition-all duration-300">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl">
                        <Gamepad2 className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <p className="text-gray-400 text-sm">Teams</p>
                        <p className="text-2xl font-bold text-white">3</p>
                        <p className="text-xs text-gray-400">Active</p>
                      </div>
                    </div>
                  </div>
                  <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6 hover:bg-white/15 transition-all duration-300">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl">
                        <Medal className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <p className="text-gray-400 text-sm">Achievements</p>
                        <p className="text-2xl font-bold text-white">8</p>
                        <p className="text-xs text-gray-400">Unlocked</p>
                      </div>
                    </div>
                  </div>
                </div>
                <PlayerProfile />
              </TabsContent>

              <TabsContent value="tournaments" className="m-0">
                <PlayerTournaments />
              </TabsContent>

              <TabsContent value="bookings" className="m-0">
                <PlayerBookings />
              </TabsContent>

              <TabsContent value="teams" className="m-0">
                <div className="space-y-8">
                  <TeamCreationWizard />
                  <TeamInvites />
                </div>
              </TabsContent>

              <TabsContent value="achievements" className="m-0">
                <PlayerAchievements />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default PlayerDashboard;
