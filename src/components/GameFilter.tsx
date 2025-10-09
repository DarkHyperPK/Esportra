import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Filter, X, ChevronDown } from 'lucide-react';

interface GameFilterProps {
  selectedGames: string[];
  onGameToggle: (game: string) => void;
  onClearAll: () => void;
  availableGames: string[];
}

const GameFilter: React.FC<GameFilterProps> = ({
  selectedGames,
  onGameToggle,
  onClearAll,
  availableGames
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="flex items-center gap-4 mb-6">
      {/* Filter Dropdown */}
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            className="border-gray-600 text-gray-300 hover:bg-gray-700/50 hover:text-white"
          >
            <Filter className="w-4 h-4 mr-2" />
            Filter by Game
            {selectedGames.length > 0 && (
              <Badge variant="secondary" className="ml-2 bg-blue-600 text-white text-xs">
                {selectedGames.length}
              </Badge>
            )}
            <ChevronDown className="w-4 h-4 ml-2" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          align="start" 
          className="w-56 bg-gray-800 border-gray-700"
        >
          <div className="px-2 py-1.5 text-sm font-medium text-gray-300">
            Select Games
          </div>
          <DropdownMenuSeparator className="bg-gray-700" />
          
          {availableGames.map((game) => {
            const isSelected = selectedGames.includes(game);
            return (
              <DropdownMenuCheckboxItem
                key={game}
                checked={isSelected}
                onCheckedChange={() => onGameToggle(game)}
                className="text-gray-300 hover:bg-gray-700 focus:bg-gray-700"
              >
                {game}
              </DropdownMenuCheckboxItem>
            );
          })}
          
          {selectedGames.length > 0 && (
            <>
              <DropdownMenuSeparator className="bg-gray-700" />
              <div className="px-2 py-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClearAll}
                  className="w-full text-gray-400 hover:text-white hover:bg-gray-700"
                >
                  <X className="w-4 h-4 mr-2" />
                  Clear All
                </Button>
              </div>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Active Filters Display */}
      {selectedGames.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">Active:</span>
          {selectedGames.map((game) => (
            <Badge
              key={game}
              variant="secondary"
              className="bg-blue-600/20 text-blue-400 border border-blue-600/30 hover:bg-blue-600/30 cursor-pointer"
              onClick={() => onGameToggle(game)}
            >
              {game}
              <X className="w-3 h-3 ml-1" />
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};

export default GameFilter;
