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
  Building2,
  MapPin,
  Star,
  Clock,
  CheckCircle
} from 'lucide-react';
import { useUnifiedProfile } from '@/contexts/UnifiedProfileContext';

const UnifiedDashboard: React.FC = () => {
  const { 
    profile, 
    currentMode, 
    getCurrentEarnings, 
    getCurrentStats,
    getUnifiedRating,
    getUnifiedBadges
  } = useUnifiedProfile();

  if (!profile) return null;

  const stats = getCurrentStats();
  const earnings = getCurrentEarnings();

  // Mode-specific content
  const getModeContent = () => {
    switch (currentMode) {
      case 'player':
        return {
          title: 'Player Dashboard',
          subtitle: 'Track your gaming progress and tournament performance',
          icon: <Gamepad2 className="w-6 h-6" />,
          color: 'blue',
          stats: [
            { label: 'Tournaments Won', value: stats.tournaments_won, icon: <Trophy className="w-5 h-5" />, color: 'yellow' },
            { label: 'Total Earnings', value: `$${earnings}`, icon: <DollarSign className="w-5 h-5" />, color: 'green' },
            { label: 'Teams Joined', value: stats.teams_joined, icon: <Users className="w-5 h-5" />, color: 'purple' },
            { label: 'Win Rate', value: `${((stats.tournaments_won / Math.max(stats.tournaments_played, 1)) * 100).toFixed(1)}%`, icon: <TrendingUp className="w-5 h-5" />, color: 'blue' }
          ],
          recentActivity: [
            { type: 'win', title: 'Won Valorant Championship', amount: 500, date: '2024-02-10' },
            { type: 'join', title: 'Joined Team Alpha', amount: null, date: '2024-02-08' },
            { type: 'earn', title: 'Tournament participation', amount: 150, date: '2024-02-05' }
          ]
        };
      
      case 'organizer':
        return {
          title: 'Organizer Dashboard',
          subtitle: 'Manage your tournaments and track business performance',
          icon: <Building2 className="w-6 h-6" />,
          color: 'purple',
          stats: [
            { label: 'Tournaments Created', value: stats.tournaments_created, icon: <Trophy className="w-5 h-5" />, color: 'purple' },
            { label: 'Total Revenue', value: `$${earnings}`, icon: <DollarSign className="w-5 h-5" />, color: 'green' },
            { label: 'Participants', value: stats.total_participants, icon: <Users className="w-5 h-5" />, color: 'blue' },
            { label: 'Active Events', value: stats.active_tournaments, icon: <Calendar className="w-5 h-5" />, color: 'yellow' }
          ],
          recentActivity: [
            { type: 'create', title: 'Created CS2 Championship', amount: 2000, date: '2024-02-12' },
            { type: 'approve', title: 'Approved Team Beta', amount: null, date: '2024-02-11' },
            { type: 'earn', title: 'Tournament revenue', amount: 1200, date: '2024-02-08' }
          ]
        };
      
      case 'venue_owner':
        return {
          title: 'Venue Owner Dashboard',
          subtitle: 'Manage your venues and track booking performance',
          icon: <MapPin className="w-6 h-6" />,
          color: 'green',
          stats: [
            { label: 'Venues Listed', value: stats.venues_listed, icon: <MapPin className="w-5 h-5" />, color: 'green' },
            { label: 'Total Revenue', value: `$${earnings}`, icon: <DollarSign className="w-5 h-5" />, color: 'green' },
            { label: 'Events Hosted', value: stats.tournaments_hosted, icon: <Calendar className="w-5 h-5" />, color: 'blue' },
            { label: 'Total Capacity', value: stats.total_capacity, icon: <Users className="w-5 h-5" />, color: 'purple' }
          ],
          recentActivity: [
            { type: 'book', title: 'Booked Gaming Center Pro', amount: 800, date: '2024-02-12' },
            { type: 'host', title: 'Hosted Valorant Tournament', amount: 400, date: '2024-02-10' },
            { type: 'earn', title: 'Venue booking fee', amount: 300, date: '2024-02-08' }
          ]
        };
      
      default:
        return null;
    }
  };

  const content = getModeContent();
  if (!content) return null;

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'win': return <Trophy className="w-4 h-4 text-yellow-400" />;
      case 'join': return <Users className="w-4 h-4 text-blue-400" />;
      case 'earn': return <DollarSign className="w-4 h-4 text-green-400" />;
      case 'create': return <Building2 className="w-4 h-4 text-purple-400" />;
      case 'approve': return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'book': return <MapPin className="w-4 h-4 text-green-400" />;
      case 'host': return <Calendar className="w-4 h-4 text-blue-400" />;
      default: return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'win': return 'bg-yellow-600';
      case 'join': return 'bg-blue-600';
      case 'earn': return 'bg-green-600';
      case 'create': return 'bg-purple-600';
      case 'approve': return 'bg-green-600';
      case 'book': return 'bg-green-600';
      case 'host': return 'bg-blue-600';
      default: return 'bg-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-lg bg-${content.color}-600`}>
            {content.icon}
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">{content.title}</h1>
            <p className="text-gray-400">{content.subtitle}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge className="bg-gray-700 text-white">
            <Star className="w-3 h-3 mr-1" />
            {getUnifiedRating().toFixed(1)} Rating
          </Badge>
          {getUnifiedBadges().length > 0 && (
            <Badge variant="outline" className="text-yellow-400 border-yellow-400">
              {getUnifiedBadges().length} Badges
            </Badge>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {content.stats.map((stat, index) => (
          <Card key={index} className="bg-gray-800/50 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 bg-${stat.color}-600 rounded-lg`}>
                  {stat.icon}
                </div>
                <div>
                  <p className="text-gray-400 text-sm">{stat.label}</p>
                  <p className="text-white text-2xl font-bold">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {content.recentActivity.map((activity, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-gray-700/50 rounded-lg">
                  <div className={`p-2 rounded-lg ${getActivityColor(activity.type)}`}>
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1">
                    <p className="text-white text-sm">{activity.title}</p>
                    <p className="text-gray-400 text-xs">{activity.date}</p>
                  </div>
                  {activity.amount && (
                    <p className="text-green-400 font-bold">+${activity.amount}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {currentMode === 'player' && (
                <>
                  <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white justify-start">
                    <Gamepad2 className="w-4 h-4 mr-2" />
                    Join Tournament
                  </Button>
                  <Button variant="outline" className="w-full border-gray-600 text-gray-300 hover:bg-gray-700 justify-start">
                    <Users className="w-4 h-4 mr-2" />
                    Create Team
                  </Button>
                  <Button variant="outline" className="w-full border-gray-600 text-gray-300 hover:bg-gray-700 justify-start">
                    <Trophy className="w-4 h-4 mr-2" />
                    View Leaderboard
                  </Button>
                </>
              )}
              
              {currentMode === 'organizer' && (
                <>
                  <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white justify-start">
                    <Trophy className="w-4 h-4 mr-2" />
                    Create Tournament
                  </Button>
                  <Button variant="outline" className="w-full border-gray-600 text-gray-300 hover:bg-gray-700 justify-start">
                    <Users className="w-4 h-4 mr-2" />
                    Manage Participants
                  </Button>
                  <Button variant="outline" className="w-full border-gray-600 text-gray-300 hover:bg-gray-700 justify-start">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Review Applications
                  </Button>
                </>
              )}
              
              {currentMode === 'venue_owner' && (
                <>
                  <Button className="w-full bg-green-600 hover:bg-green-700 text-white justify-start">
                    <MapPin className="w-4 h-4 mr-2" />
                    List New Venue
                  </Button>
                  <Button variant="outline" className="w-full border-gray-600 text-gray-300 hover:bg-gray-700 justify-start">
                    <Calendar className="w-4 h-4 mr-2" />
                    Manage Bookings
                  </Button>
                  <Button variant="outline" className="w-full border-gray-600 text-gray-300 hover:bg-gray-700 justify-start">
                    <Users className="w-4 h-4 mr-2" />
                    View Capacity
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default UnifiedDashboard;
