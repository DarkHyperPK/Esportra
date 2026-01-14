// OrganizerDashboard.tsx
// This file is the main dashboard for the organizer (stats, quick links, etc.)
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Footer from "@/components/Footer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Users, Calendar, BarChart3, GitBranch, Plus } from "lucide-react";
import TournamentsList from "@/components/organizer/TournamentsList";
import ParticipantsList from "@/components/organizer/ParticipantsList";
import TournamentSchedule from "@/components/organizer/TournamentSchedule";
import TournamentAnalytics from "@/components/organizer/TournamentAnalytics";
import { Button } from "@/components/ui/button";

const OrganizerDashboard = () => {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState("tournaments");
  const navigate = useNavigate();

  const handleCreateTournament = () => {
    navigate('/tournaments/create');
  };

  return (
    <div className="min-h-screen bg-esports-dark text-white flex flex-col">
      <div className="flex-grow container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Tournament Organizer Dashboard</h1>
            <p className="text-gray-400">Welcome back, {profile?.full_name || profile?.username}</p>
          </div>
          <div className="flex gap-4">
            <Button
              onClick={() => navigate('/organizer/tournaments')}
              className="bg-gaming-blue hover:bg-gaming-blue/80"
            >
              <Trophy className="mr-2 h-4 w-4" />
              Manage Tournaments
            </Button>
            <Button
              onClick={() => navigate('/tournaments/create')}
              className="bg-gaming-purple hover:bg-gaming-purple/80"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Tournament
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          {/* Left sidebar */}
          <div className="md:col-span-1">
            <div className="bg-gaming-dark rounded-lg border border-gaming-gray/30 p-4">
              <h2 className="text-xl font-semibold mb-4">Management</h2>
              <nav className="space-y-2">
                <TabsList className="flex flex-col w-full bg-transparent">
                  <TabsTrigger
                    value="tournaments"
                    onClick={() => setActiveTab("tournaments")}
                    className={"justify-start " + (activeTab === "tournaments" ? "bg-gaming-purple/20" : "")}
                  >
                    <Trophy className="mr-2 h-5 w-5" />
                    My Tournaments
                  </TabsTrigger>

                  <TabsTrigger
                    value="participants"
                    onClick={() => setActiveTab("participants")}
                    className={"justify-start " + (activeTab === "participants" ? "bg-gaming-purple/20" : "")}
                  >
                    <Users className="mr-2 h-5 w-5" />
                    Participants
                  </TabsTrigger>



                  <TabsTrigger
                    value="schedule"
                    onClick={() => setActiveTab("schedule")}
                    className={"justify-start " + (activeTab === "schedule" ? "bg-gaming-purple/20" : "")}
                  >
                    <Calendar className="mr-2 h-5 w-5" />
                    Schedule
                  </TabsTrigger>

                  <TabsTrigger
                    value="analytics"
                    onClick={() => setActiveTab("analytics")}
                    className={"justify-start " + (activeTab === "analytics" ? "bg-gaming-purple/20" : "")}
                  >
                    <BarChart3 className="mr-2 h-5 w-5" />
                    Analytics
                  </TabsTrigger>

                  <TabsTrigger
                    value="history"
                    onClick={() => setActiveTab("history")}
                    className={"justify-start " + (activeTab === "history" ? "bg-gaming-purple/20" : "")}
                  >
                    <Trophy className="mr-2 h-5 w-5" />
                    Tournament History
                  </TabsTrigger>
                </TabsList>
              </nav>
              <Link to="/tournament-history" className="block px-4 py-2 rounded hover:bg-gaming-purple/20 text-gaming-purple font-semibold mt-2">
                <Trophy className="inline-block mr-2 h-5 w-5" />
                Tournament History
              </Link>
            </div>
          </div>

          {/* Main content area */}
          <div className="md:col-span-4">
            <Tabs value={activeTab} className="w-full">
              <TabsContent value="tournaments" className="m-0">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <Card className="bg-gaming-dark border-gaming-gray/30">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg font-medium">Active Tournaments</CardTitle>
                      <CardDescription>Currently running</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">3</div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gaming-dark border-gaming-gray/30">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg font-medium">Upcoming</CardTitle>
                      <CardDescription>Next 30 days</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">5</div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gaming-dark border-gaming-gray/30">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg font-medium">Total Participants</CardTitle>
                      <CardDescription>Across all tournaments</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">342</div>
                    </CardContent>
                  </Card>
                </div>

                <TournamentsList />
              </TabsContent>

              <TabsContent value="participants" className="m-0">
                <ParticipantsList />
              </TabsContent>

              <TabsContent value="schedule" className="m-0">
                <TournamentSchedule />
              </TabsContent>

              <TabsContent value="analytics" className="m-0">
                <TournamentAnalytics />
              </TabsContent>

              <TabsContent value="history" className="m-0">
                {/* Placeholder for history content */}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default OrganizerDashboard;
