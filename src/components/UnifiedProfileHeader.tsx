import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Star, 
  Trophy, 
  Users, 
  DollarSign,
  MessageCircle,
  Bell,
  Settings,
  Gamepad2,
  Building2,
  MapPin
} from 'lucide-react';
import { useUnifiedProfile } from '@/contexts/UnifiedProfileContext';

const UnifiedProfileHeader: React.FC = () => {
  const { 
    profile, 
    currentMode, 
    switchMode, 
    canAccessMode,
    getCurrentDisplayName,
    getCurrentAvatar,
    getUnifiedRating,
    getUnifiedBadges
  } = useUnifiedProfile();

  if (!profile) return null;

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case 'player': return <Gamepad2 className="w-4 h-4" />;
      case 'organizer': return <Building2 className="w-4 h-4" />;
      case 'venue_owner': return <MapPin className="w-4 h-4" />;
      default: return <Gamepad2 className="w-4 h-4" />;
    }
  };

  const getModeColor = (mode: string) => {
    switch (mode) {
      case 'player': return 'bg-blue-600';
      case 'organizer': return 'bg-purple-600';
      case 'venue_owner': return 'bg-green-600';
      default: return 'bg-blue-600';
    }
  };

  return (
    <Card className="bg-gray-800/50 border-gray-700">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          {/* Profile Info */}
          <div className="flex items-start gap-4">
            <Avatar className="w-20 h-20">
              <AvatarImage src={getCurrentAvatar() || undefined} />
              <AvatarFallback className="text-lg">
                {getCurrentDisplayName().charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-white">{getCurrentDisplayName()}</h1>
                <Badge className={`${getModeColor(currentMode)} text-white flex items-center gap-1`}>
                  {getModeIcon(currentMode)}
                  {currentMode.charAt(0).toUpperCase() + currentMode.slice(1)}
                </Badge>
              </div>
              
              <div className="flex items-center gap-4 mb-3">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-400 fill-current" />
                  <span className="text-white font-medium">{getUnifiedRating().toFixed(1)}</span>
                  <span className="text-gray-400 text-sm">({profile.reputation.total_reviews} reviews)</span>
                </div>
                
                <div className="flex items-center gap-1">
                  <Trophy className="w-4 h-4 text-yellow-400" />
                  <span className="text-white text-sm">
                    {profile.player_profile.gaming_stats.tournaments_won} wins
                  </span>
                </div>
                
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4 text-blue-400" />
                  <span className="text-white text-sm">
                    {profile.organizer_profile.business_stats.total_participants} participants
                  </span>
                </div>
              </div>
              
              {/* Badges */}
              <div className="flex items-center gap-2 mb-4">
                {getUnifiedBadges().map((badge, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {badge}
                  </Badge>
                ))}
              </div>
              
              {/* Mode Switcher */}
              <div className="flex items-center gap-2">
                <span className="text-gray-400 text-sm">Switch to:</span>
                {(['player', 'organizer', 'venue_owner'] as const).map((mode) => (
                  <Button
                    key={mode}
                    variant={currentMode === mode ? "default" : "outline"}
                    size="sm"
                    onClick={() => switchMode(mode)}
                    disabled={!canAccessMode(mode)}
                    className={`${
                      currentMode === mode 
                        ? `${getModeColor(mode)} text-white` 
                        : canAccessMode(mode)
                          ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                          : 'border-gray-700 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {getModeIcon(mode)}
                    <span className="ml-1 capitalize">{mode.replace('_', ' ')}</span>
                    {!canAccessMode(mode) && (
                      <Badge variant="outline" className="ml-1 text-xs text-yellow-400 border-yellow-400">
                        Verify
                      </Badge>
                    )}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="border-gray-600 text-gray-300 hover:bg-gray-700">
              <MessageCircle className="w-4 h-4 mr-2" />
              Messages
              {profile.messaging.unread_count > 0 && (
                <Badge className="ml-2 bg-red-600 text-white text-xs">
                  {profile.messaging.unread_count}
                </Badge>
              )}
            </Button>
            
            <Button variant="outline" size="sm" className="border-gray-600 text-gray-300 hover:bg-gray-700">
              <Bell className="w-4 h-4 mr-2" />
              Notifications
              {profile.notifications.unread_count > 0 && (
                <Badge className="ml-2 bg-red-600 text-white text-xs">
                  {profile.notifications.unread_count}
                </Badge>
              )}
            </Button>
            
            <Button variant="outline" size="sm" className="border-gray-600 text-gray-300 hover:bg-gray-700">
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        {/* Financial Overview */}
        <div className="mt-6 pt-6 border-t border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-gray-400 text-sm">Total Earnings</p>
              <p className="text-white text-xl font-bold">${profile.financial.total_earnings.toLocaleString()}</p>
            </div>
            <div className="text-center">
              <p className="text-gray-400 text-sm">Available Balance</p>
              <p className="text-green-400 text-xl font-bold">${profile.financial.available_balance.toLocaleString()}</p>
            </div>
            <div className="text-center">
              <p className="text-gray-400 text-sm">Pending Payouts</p>
              <p className="text-yellow-400 text-xl font-bold">${profile.financial.pending_payouts.toLocaleString()}</p>
            </div>
            <div className="text-center">
              <p className="text-gray-400 text-sm">Total Withdrawn</p>
              <p className="text-blue-400 text-xl font-bold">${profile.financial.total_withdrawn.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default UnifiedProfileHeader;
