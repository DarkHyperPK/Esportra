import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import { 
  Gamepad2, 
  Trophy, 
  Building2, 
  ChevronDown, 
  Loader2,
  DollarSign,
  Users,
  Calendar
} from 'lucide-react';
import { useDualRole } from '@/contexts/DualRoleContext';

const FiverrStyleRoleSwitcher: React.FC = () => {
  const { 
    currentMode, 
    switchMode, 
    isLoading,
    canAccessMode,
    currentDisplayName,
    currentAvatar,
    playerEarnings,
    organizerRevenue,
    venueRevenue
  } = useDualRole();
  
  const [switching, setSwitching] = useState(false);

  const handleModeSwitch = async (mode: 'player' | 'organizer' | 'venue_owner') => {
    if (mode === currentMode) return;
    
    setSwitching(true);
    await switchMode(mode);
    setSwitching(false);
  };

  const getModeIcon = (mode: 'player' | 'organizer' | 'venue_owner') => {
    switch (mode) {
      case 'player': return <Gamepad2 className="w-4 h-4" />;
      case 'organizer': return <Trophy className="w-4 h-4" />;
      case 'venue_owner': return <Building2 className="w-4 h-4" />;
    }
  };

  const getModeColor = (mode: 'player' | 'organizer' | 'venue_owner') => {
    switch (mode) {
      case 'player': return 'bg-blue-600';
      case 'organizer': return 'bg-purple-600';
      case 'venue_owner': return 'bg-green-600';
    }
  };

  const getModeEarnings = (mode: 'player' | 'organizer' | 'venue_owner') => {
    switch (mode) {
      case 'player': return playerEarnings;
      case 'organizer': return organizerRevenue;
      case 'venue_owner': return venueRevenue;
    }
  };

  const getModeDescription = (mode: 'player' | 'organizer' | 'venue_owner') => {
    switch (mode) {
      case 'player': return 'Play games, join tournaments, earn rewards';
      case 'organizer': return 'Create tournaments, manage events, earn revenue';
      case 'venue_owner': return 'Host events, list venues, earn bookings';
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className="border-gray-600 text-gray-300 hover:bg-gray-700/50 hover:text-white min-w-[200px] justify-between"
          disabled={isLoading || switching}
        >
          <div className="flex items-center gap-3">
            {isLoading || switching ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Avatar className="w-6 h-6">
                <AvatarImage src={currentAvatar || undefined} />
                <AvatarFallback className="text-xs">
                  {currentDisplayName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            )}
            <div className="text-left">
              <div className="font-medium text-sm">{currentDisplayName}</div>
              <div className="text-xs text-gray-400 capitalize">
                {currentMode} Mode
              </div>
            </div>
          </div>
          <ChevronDown className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="start" 
        className="w-80 bg-gray-800 border-gray-700"
      >
        <DropdownMenuLabel className="text-gray-300">
          Switch Mode
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-gray-700" />
        
        {/* Player Mode */}
        <DropdownMenuItem
          onClick={() => handleModeSwitch('player')}
          className={`flex items-center gap-3 p-4 cursor-pointer ${
            currentMode === 'player' 
              ? 'bg-blue-600/20 text-blue-400' 
              : 'text-gray-300 hover:bg-gray-700'
          }`}
        >
          <div className={`p-3 rounded-lg ${getModeColor('player')}`}>
            {getModeIcon('player')}
          </div>
          <div className="flex-1">
            <div className="font-medium flex items-center gap-2">
              Player Mode
              {currentMode === 'player' && (
                <Badge variant="secondary" className="bg-blue-600 text-white text-xs">
                  Active
                </Badge>
              )}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {getModeDescription('player')}
            </div>
            <div className="flex items-center gap-4 mt-2 text-xs">
              <div className="flex items-center gap-1 text-green-400">
                <DollarSign className="w-3 h-3" />
                ${getModeEarnings('player').toLocaleString()}
              </div>
              <div className="flex items-center gap-1 text-gray-400">
                <Users className="w-3 h-3" />
                Teams
              </div>
              <div className="flex items-center gap-1 text-gray-400">
                <Calendar className="w-3 h-3" />
                Tournaments
              </div>
            </div>
          </div>
        </DropdownMenuItem>

        {/* Organizer Mode */}
        <DropdownMenuItem
          onClick={() => handleModeSwitch('organizer')}
          disabled={!canAccessMode('organizer')}
          className={`flex items-center gap-3 p-4 cursor-pointer ${
            currentMode === 'organizer' 
              ? 'bg-purple-600/20 text-purple-400' 
              : canAccessMode('organizer')
                ? 'text-gray-300 hover:bg-gray-700'
                : 'text-gray-500 cursor-not-allowed'
          }`}
        >
          <div className={`p-3 rounded-lg ${getModeColor('organizer')}`}>
            {getModeIcon('organizer')}
          </div>
          <div className="flex-1">
            <div className="font-medium flex items-center gap-2">
              Organizer Mode
              {currentMode === 'organizer' && (
                <Badge variant="secondary" className="bg-purple-600 text-white text-xs">
                  Active
                </Badge>
              )}
              {!canAccessMode('organizer') && (
                <Badge variant="outline" className="text-yellow-400 border-yellow-400 text-xs">
                  Requires Verification
                </Badge>
              )}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {getModeDescription('organizer')}
            </div>
            {canAccessMode('organizer') && (
              <div className="flex items-center gap-4 mt-2 text-xs">
                <div className="flex items-center gap-1 text-green-400">
                  <DollarSign className="w-3 h-3" />
                  ${getModeEarnings('organizer').toLocaleString()}
                </div>
                <div className="flex items-center gap-1 text-gray-400">
                  <Trophy className="w-3 h-3" />
                  Events
                </div>
                <div className="flex items-center gap-1 text-gray-400">
                  <Users className="w-3 h-3" />
                  Participants
                </div>
              </div>
            )}
          </div>
        </DropdownMenuItem>

        {/* Venue Owner Mode */}
        <DropdownMenuItem
          onClick={() => handleModeSwitch('venue_owner')}
          disabled={!canAccessMode('venue_owner')}
          className={`flex items-center gap-3 p-4 cursor-pointer ${
            currentMode === 'venue_owner' 
              ? 'bg-green-600/20 text-green-400' 
              : canAccessMode('venue_owner')
                ? 'text-gray-300 hover:bg-gray-700'
                : 'text-gray-500 cursor-not-allowed'
          }`}
        >
          <div className={`p-3 rounded-lg ${getModeColor('venue_owner')}`}>
            {getModeIcon('venue_owner')}
          </div>
          <div className="flex-1">
            <div className="font-medium flex items-center gap-2">
              Venue Owner Mode
              {currentMode === 'venue_owner' && (
                <Badge variant="secondary" className="bg-green-600 text-white text-xs">
                  Active
                </Badge>
              )}
              {!canAccessMode('venue_owner') && (
                <Badge variant="outline" className="text-yellow-400 border-yellow-400 text-xs">
                  Requires Verification
                </Badge>
              )}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {getModeDescription('venue_owner')}
            </div>
            {canAccessMode('venue_owner') && (
              <div className="flex items-center gap-4 mt-2 text-xs">
                <div className="flex items-center gap-1 text-green-400">
                  <DollarSign className="w-3 h-3" />
                  ${getModeEarnings('venue_owner').toLocaleString()}
                </div>
                <div className="flex items-center gap-1 text-gray-400">
                  <Building2 className="w-3 h-3" />
                  Venues
                </div>
                <div className="flex items-center gap-1 text-gray-400">
                  <Calendar className="w-3 h-3" />
                  Bookings
                </div>
              </div>
            )}
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default FiverrStyleRoleSwitcher;
