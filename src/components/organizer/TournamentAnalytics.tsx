import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend } from 'recharts';
import { useAuth } from "@/contexts/AuthContext";
import { useOrganizerStats } from "@/hooks/useOrganizerStats";

const TournamentAnalytics = () => {
  const { user } = useAuth();

  const { data, isLoading } = useOrganizerStats();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-zinc-800/10 rounded-lg animate-pulse"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-80 bg-zinc-800/10 rounded-lg animate-pulse"></div>
          <div className="h-80 bg-zinc-800/10 rounded-lg animate-pulse"></div>
        </div>
      </div>
    );
  }

  // Fallback if data is undefined (should involve error handling, but hook handles most)
  const analyticsData = data || {
    totalTournaments: 0,
    totalParticipants: 0,
    activeTournaments: 0,
    upcomingTournaments: 0,
    totalPrizePool: 0,
    monthlyParticipation: [],
    gameDistribution: []
  };

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#a4de6c'];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-[#0a0a0c] border-white/10/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Total Tournaments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.totalTournaments}</div>
            <p className="text-xs text-gray-400 mt-1">
              {(analyticsData.activeTournaments || 0) + (analyticsData.upcomingTournaments || 0)} active/upcoming
            </p>
          </CardContent>
        </Card>

        <Card className="bg-[#0a0a0c] border-white/10/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Total Participants</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.totalParticipants}</div>
            <p className="text-xs text-green-500 mt-1 flex items-center">
              Lifetime total
            </p>
          </CardContent>
        </Card>

        <Card className="bg-[#0a0a0c] border-white/10/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Total Prize Pool</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${analyticsData.totalPrizePool.toLocaleString()}</div>
            <p className="text-xs text-gray-400 mt-1">Across all tournaments</p>
          </CardContent>
        </Card>

        <Card className="bg-[#0a0a0c] border-white/10/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Active Tournaments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.activeTournaments}</div>
            <p className="text-xs text-gray-400 mt-1">Currently running</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-[#0a0a0c] border-white/10/30">
          <CardHeader>
            <CardTitle>Monthly Participation</CardTitle>
            <CardDescription>Participants over the last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {analyticsData.monthlyParticipation.length === 0 ? (
                <div className="h-full flex items-center justify-center text-gray-500">Not enough data yet</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={analyticsData.monthlyParticipation}
                    margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="month" stroke="#999" />
                    <YAxis stroke="#999" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0a0a0c',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        color: 'white'
                      }}
                    />
                    <Line type="monotone" dataKey="participants" stroke="#8884d8" activeDot={{ r: 8 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#0a0a0c] border-white/10/30">
          <CardHeader>
            <CardTitle>Tournaments by Game</CardTitle>
            <CardDescription>Which games are you hosting most?</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {analyticsData.gameDistribution.length === 0 ? (
                <div className="h-full flex items-center justify-center text-gray-500">Not enough data yet</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analyticsData.gameDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {analyticsData.gameDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0a0a0c',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        color: 'white'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TournamentAnalytics;

