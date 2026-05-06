import React from 'react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import esportsGames from '@/data/esportsGames.json';
import { motion, AnimatePresence } from 'framer-motion';
import { Checkbox } from '@/components/ui/checkbox';

interface FormData {
  name: string;
  game: string;
  date: string;
  time: string;
  venue: string;
  maxParticipants: string;
  prizePool: string;
  entryFee: string;
  isOnline: boolean;
  description: string;
  structure?: string;
}

interface TournamentBasicInfoFormProps {
  formData: FormData;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSelectChange: (field: string, value: string) => void;
  onCheckboxChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const TournamentBasicInfoForm = ({
  formData,
  onInputChange,
  onSelectChange,
  onCheckboxChange
}: TournamentBasicInfoFormProps) => {
  // Find the selected game object
  const selectedGame = esportsGames.games.find(
    (g) => g.name.toLowerCase().replace(/\s+/g, '') === formData.game.toLowerCase().replace(/\s+/g, '')
  );

  // Team format options (for structure)
  let structureOptions: { value: string; label: string }[] = [];
  if (selectedGame) {
    structureOptions = selectedGame.formats.map(format => ({
      value: format.value,
      label: format.name
    }));
  }

  // Only show structure field if there are multiple options
  const showStructureField = structureOptions.length > 1;

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Tournament Name</label>
          <Input
            placeholder="Enter tournament name"
            value={formData.name}
            name="name"
            onChange={onInputChange}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Game</label>
          <Select
            value={formData.game}
            onValueChange={(value) => onSelectChange('game', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select game" />
            </SelectTrigger>
            <SelectContent>
              {esportsGames.games.map((game) => (
                <SelectItem key={game.name} value={game.name}>
                  {game.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Animated Game Info Card */}
      <AnimatePresence>
        {selectedGame && (
          <motion.div
            key={selectedGame.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.4 }}
            className="flex items-center gap-6 bg-zinc-800/30 rounded-lg p-4 my-4 shadow-lg border border-white/10/40"
          >
            <div>
              <div className="text-xl font-bold mb-1">{selectedGame.name}</div>
              <div className="text-sm text-gaming-purple font-semibold mb-1">
                Available Formats: {selectedGame.formats.map(f => f.name).join(', ')}
              </div>
              <div className="text-xs text-gaming-gray-200">
                Default Format: {selectedGame.defaultFormat}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Only show structure field if there are multiple options */}
      {showStructureField && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Structure</label>
            <Select
              value={formData.structure || ''}
              onValueChange={(value) => onSelectChange('structure', value)}
              disabled={!selectedGame}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select structure" />
              </SelectTrigger>
              <SelectContent>
                {structureOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Date</label>
          <Input
            type="date"
            value={formData.date}
            name="date"
            onChange={onInputChange}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Time</label>
          <Input
            type="time"
            value={formData.time}
            name="time"
            onChange={onInputChange}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Venue</label>
          <Input
            type="text"
            placeholder="Enter venue name (LAN only)"
            value={formData.venue}
            name="venue"
            onChange={onInputChange}
            required={!formData.isOnline}
            disabled={formData.isOnline}
          />
        </div>
        <div className="flex items-center mt-6">
          <input
            type="checkbox"
            id="isOnline"
            name="isOnline"
            checked={formData.isOnline}
            onChange={onCheckboxChange}
            className="rounded border-gray-300 text-gaming-purple focus:ring-gaming-purple mr-2"
          />
          <label htmlFor="isOnline" className="text-sm font-medium">
            This is an online tournament
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Max Participants</label>
          <Input
            type="number"
            placeholder="Enter max participants"
            value={formData.maxParticipants}
            name="maxParticipants"
            onChange={onInputChange}
            required
            min="2"
          />
        </div>
      </div>
    </>
  );
};

export default TournamentBasicInfoForm;

