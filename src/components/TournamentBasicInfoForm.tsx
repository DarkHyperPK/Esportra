import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import esportsGames from '@/data/esportsGames.json';

interface TournamentBasicInfoFormProps {
  formData: {
    name: string;
    game: string;
    structure: string;
    teamSize: string;
  };
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSelectChange: (field: string, value: string) => void;
}

export const TournamentBasicInfoForm: React.FC<TournamentBasicInfoFormProps> = ({
  formData,
  onInputChange,
  onSelectChange,
}) => {
  const selectedGame = esportsGames.games.find(g => g.name.toLowerCase() === formData.game.toLowerCase());

  return (
    <Card>
      <CardHeader>
        <CardTitle>Basic Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Tournament Name</Label>
          <Input
            id="name"
            name="name"
            value={formData.name}
            onChange={onInputChange}
            placeholder="Enter tournament name"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="game">Game</Label>
          <Select
            value={formData.game}
            onValueChange={(value) => onSelectChange('game', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a game" />
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

        {selectedGame && (
          <div className="space-y-2">
            <Label htmlFor="structure">Format</Label>
            <Select
              value={formData.structure}
              onValueChange={(value) => onSelectChange('structure', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                {selectedGame.formats.map((format) => (
                  <SelectItem key={format.value} value={format.value}>
                    {format.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </CardContent>
    </Card>
  );
}; 