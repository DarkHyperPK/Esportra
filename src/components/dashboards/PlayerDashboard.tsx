import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Trophy, 
  Users, 
  Calendar, 
  DollarSign, 
  TrendingUp,
  Gamepad2,
  Star
} from 'lucide-react';

const PlayerDashboard: React.FC = () => {
  // Mock data - in real app, this would come from the DualRoleContext
  const stats = {
    tournamentsPlayed: 12,
    tournamentsWon: 3,
    currentTeams: 2,
    totalEarnings: 1250,
    winRate: 25,
    rank: 'Gold III'
  };

  const upcomingTournaments = [
    { id: 1, name: 'Valorant Championship', date: '2024-02-15', prize: 5000, team: 'Team Alpha' },
    { id: 2, name: 'CS2 Weekly', date: '2024-02-18', prize: 1000, team: 'Team Beta' },
  ];

  const recentActivity = [
    { type: 'win', tournament: 'Weekly Valorant', earnings: 250, date: '2024-02-10' },
    { type: 'join', tournament: 'CS2 Championship', team: 'Team Alpha', date: '2024-02-08' },
    { type: 'earn', amount: 150, source: 'Tournament participation', date: '2024-02-05' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Player Dashboard</h1>
          <p className="text-gray-400">Track your gaming progress and earnings</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-blue-600 text-white">
            <Gamepad2 className="w-3 h-3 mr-1" />
            {stats.rank}
          </Badge>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gray-800/50 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Trophy className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Tournaments Won</p>
                <p className="text-white text-2xl font-bold">{stats.tournamentsWon}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800/50 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-600 rounded-lg">
                <DollarSign className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Total Earnings</p>
                <p className="text-white text-2xl font-bold">${stats.totalEarnings}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800/50 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-600 rounded-lg">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Active Teams</p>
                <p className="text-white text-2xl font-bold">{stats.currentTeams}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800/50 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-600 rounded-lg">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Win Rate</p>
                <p className="text-white text-2xl font-bold">{stats.winRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Tournaments */}
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Upcoming Tournaments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingTournaments.map((tournament) => (
                <div key={tournament.id} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                  <div>
                    <p className="text-white font-medium">{tournament.name}</p>
                    <p className="text-gray-400 text-sm">{tournament.team}</p>
                    <p className="text-gray-400 text-xs">{tournament.date}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-green-400 font-bold">${tournament.prize}</p>
                    <Badge variant="outline" className="text-xs">Registered</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Star className="w-5 h-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivity.map((activity, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-gray-700/50 rounded-lg">
                  <div className={`p-2 rounded-lg ${
                    activity.type === 'win' ? 'bg-green-600' :
                    activity.type === 'join' ? 'bg-blue-600' : 'bg-yellow-600'
                  }`}>
                    {activity.type === 'win' ? <Trophy className="w-4 h-4 text-white" /> :
                     activity.type === 'join' ? <Users className="w-4 h-4 text-white" /> :
                     <DollarSign className="w-4 h-4 text-white" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-white text-sm">
                      {activity.type === 'win' && `Won ${activity.tournament}`}
                      {activity.type === 'join' && `Joined ${activity.tournament}`}
                      {activity.type === 'earn' && `Earned $${activity.amount}`}
                    </p>
                    <p className="text-gray-400 text-xs">{activity.date}</p>
                  </div>
                  {activity.earnings && (
                    <p className="text-green-400 font-bold">+${activity.earnings}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PlayerDashboard;
