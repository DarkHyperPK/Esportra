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
  Building2,
  CheckCircle,
  Clock
} from 'lucide-react';

const OrganizerDashboard: React.FC = () => {
  // Mock data - in real app, this would come from the DualRoleContext
  const stats = {
    tournamentsCreated: 8,
    totalParticipants: 240,
    totalRevenue: 15600,
    activeTournaments: 3,
    pendingApprovals: 12
  };

  const myTournaments = [
    { id: 1, name: 'Valorant Championship 2024', status: 'active', participants: 32, revenue: 3200, date: '2024-02-15' },
    { id: 2, name: 'CS2 Weekly Series', status: 'upcoming', participants: 16, revenue: 800, date: '2024-02-20' },
  ];

  const pendingApprovals = [
    { id: 1, type: 'team_registration', team: 'Team Alpha', tournament: 'Valorant Championship', date: '2024-02-12' },
    { id: 2, type: 'score_verification', team: 'Team Beta', tournament: 'CS2 Weekly', date: '2024-02-11' },
  ];

  const revenueData = [
    { month: 'Jan', revenue: 4200 },
    { month: 'Feb', revenue: 5600 },
    { month: 'Mar', revenue: 3800 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Organizer Dashboard</h1>
          <p className="text-gray-400">Manage your tournaments and track business performance</p>
        </div>
        <div className="flex items-center gap-2">
          <Button className="bg-purple-600 hover:bg-purple-700 text-white">
            <Trophy className="w-4 h-4 mr-2" />
            Create Tournament
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-gray-800/50 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-600 rounded-lg">
                <Trophy className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Tournaments</p>
                <p className="text-white text-2xl font-bold">{stats.tournamentsCreated}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800/50 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Participants</p>
                <p className="text-white text-2xl font-bold">{stats.totalParticipants}</p>
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
                <p className="text-gray-400 text-sm">Revenue</p>
                <p className="text-white text-2xl font-bold">${stats.totalRevenue.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800/50 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-600 rounded-lg">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Active</p>
                <p className="text-white text-2xl font-bold">{stats.activeTournaments}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800/50 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-600 rounded-lg">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Pending</p>
                <p className="text-white text-2xl font-bold">{stats.pendingApprovals}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My Tournaments */}
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Trophy className="w-5 h-5" />
              My Tournaments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {myTournaments.map((tournament) => (
                <div key={tournament.id} className="p-4 bg-gray-700/50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-white font-medium">{tournament.name}</h3>
                    <Badge className={
                      tournament.status === 'active' ? 'bg-green-600' :
                        tournament.status === 'upcoming' ? 'bg-blue-600' : 'bg-gray-600'
                    }>
                      {tournament.status}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-400">Participants</p>
                      <p className="text-white font-bold">{tournament.participants}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Revenue</p>
                      <p className="text-green-400 font-bold">${tournament.revenue}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Date</p>
                      <p className="text-white">{tournament.date}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Pending Approvals */}
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Pending Approvals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingApprovals.map((approval) => (
                <div key={approval.id} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                  <div>
                    <p className="text-white font-medium">
                      {approval.type === 'team_registration' && `Team Registration: ${approval.team}`}
                      {approval.type === 'score_verification' && `Score Verification: ${approval.team}`}
                    </p>
                    <p className="text-gray-400 text-sm">{approval.tournament}</p>
                    <p className="text-gray-400 text-xs">{approval.date}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white">
                      Approve
                    </Button>
                    <Button size="sm" variant="outline" className="border-red-600 text-red-400 hover:bg-red-600/10">
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Chart */}
      <Card className="bg-gray-800/50 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Revenue Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4 h-32">
            {revenueData.map((data, index) => (
              <div key={index} className="flex-1 flex flex-col items-center">
                <div
                  className="bg-purple-600 w-full rounded-t"
                  style={{ height: `${(data.revenue / 6000) * 100}%` }}
                ></div>
                <p className="text-gray-400 text-xs mt-2">{data.month}</p>
                <p className="text-white text-sm font-bold">${data.revenue}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OrganizerDashboard;
