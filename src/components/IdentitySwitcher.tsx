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
import { User, Building2, ChevronDown, Loader2 } from 'lucide-react';
import { useIdentity } from '@/contexts/IdentityContext';

const IdentitySwitcher: React.FC = () => {
  const { 
    currentMode, 
    personalProfile, 
    companyProfile, 
    switchMode, 
    isLoading,
    currentDisplayName,
    currentAvatar
  } = useIdentity();
  
  const [switching, setSwitching] = useState(false);

  const handleModeSwitch = async (mode: 'personal' | 'company') => {
    if (mode === currentMode) return;
    
    setSwitching(true);
    await switchMode(mode);
    setSwitching(false);
  };

  const getModeIcon = (mode: 'personal' | 'company') => {
    return mode === 'personal' ? <User className="w-4 h-4" /> : <Building2 className="w-4 h-4" />;
  };

  const getModeColor = (mode: 'personal' | 'company') => {
    return mode === 'personal' ? 'bg-blue-600' : 'bg-purple-600';
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className="border-gray-600 text-gray-300 hover:bg-gray-700/50 hover:text-white"
          disabled={isLoading || switching}
        >
          {isLoading || switching ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Avatar className="w-6 h-6 mr-2">
              <AvatarImage src={currentAvatar || undefined} />
              <AvatarFallback className="text-xs">
                {currentDisplayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          )}
          {currentDisplayName}
          <ChevronDown className="w-4 h-4 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="w-64 bg-gray-800 border-gray-700"
      >
        <DropdownMenuLabel className="text-gray-300">
          Switch Identity
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-gray-700" />
        
        {/* Personal Mode */}
        <DropdownMenuItem
          onClick={() => handleModeSwitch('personal')}
          className={`flex items-center gap-3 p-3 cursor-pointer ${
            currentMode === 'personal' 
              ? 'bg-blue-600/20 text-blue-400' 
              : 'text-gray-300 hover:bg-gray-700'
          }`}
        >
          <div className={`p-2 rounded-lg ${getModeColor('personal')}`}>
            {getModeIcon('personal')}
          </div>
          <div className="flex-1">
            <div className="font-medium">Personal Mode</div>
            <div className="text-xs text-gray-400">
              {personalProfile?.username || 'Player'}
            </div>
          </div>
          {currentMode === 'personal' && (
            <Badge variant="secondary" className="bg-blue-600 text-white text-xs">
              Active
            </Badge>
          )}
        </DropdownMenuItem>

        {/* Company Mode */}
        {companyProfile && (
          <DropdownMenuItem
            onClick={() => handleModeSwitch('company')}
            className={`flex items-center gap-3 p-3 cursor-pointer ${
              currentMode === 'company' 
                ? 'bg-purple-600/20 text-purple-400' 
                : 'text-gray-300 hover:bg-gray-700'
            }`}
          >
            <div className={`p-2 rounded-lg ${getModeColor('company')}`}>
              {getModeIcon('company')}
            </div>
            <div className="flex-1">
              <div className="font-medium">Company Mode</div>
              <div className="text-xs text-gray-400">
                {companyProfile.company_name}
              </div>
            </div>
            {currentMode === 'company' && (
              <Badge variant="secondary" className="bg-purple-600 text-white text-xs">
                Active
              </Badge>
            )}
          </DropdownMenuItem>
        )}

        {!companyProfile && (
          <DropdownMenuItem disabled className="text-gray-500 p-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gray-600">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <div className="font-medium">Company Mode</div>
                <div className="text-xs">Not available</div>
              </div>
            </div>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default IdentitySwitcher;
