import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  FramerDropdownRoot,
  FramerDropdownTrigger,
  FramerDropdownContent,
  FramerDropdownItem,
  FramerDropdownSeparator
} from '@/components/ui/FramerDropdown';
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


  return (
    <div className="flex items-center gap-4 mb-6">
      {/* Filter Dropdown */}
      <FramerDropdownRoot>
        <FramerDropdownTrigger asChild>
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
        </FramerDropdownTrigger>
        <FramerDropdownContent>
          <div className="px-2 py-1.5 text-sm font-medium text-gray-300">
            Select Games
          </div>
          <FramerDropdownSeparator />

          {availableGames.map((game) => {
            const isSelected = selectedGames.includes(game);
            return (
              <FramerDropdownItem
                key={game}
                isSelected={isSelected}
                closeOnSelect={false}
                onClick={() => onGameToggle(game)}
              >
                {game}
              </FramerDropdownItem>
            );
          })}

          {selectedGames.length > 0 && (
            <>
              <FramerDropdownSeparator />
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
        </FramerDropdownContent>
      </FramerDropdownRoot>

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
