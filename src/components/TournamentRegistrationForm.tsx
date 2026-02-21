import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

interface TournamentRegistrationFormProps {
  tournament: {
    id: string;
    name: string;
    game: string;
    team_size: number;
  };
  onSubmit: (data: { teamName: string; players: string[] }) => void;
  loading?: boolean;
}

export const TournamentRegistrationForm: React.FC<TournamentRegistrationFormProps> = ({
  tournament,
  onSubmit,
  loading = false,
}) => {
  const [teamName, setTeamName] = React.useState('');
  const [players, setPlayers] = React.useState<string[]>(Array(tournament.team_size).fill(''));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ teamName, players });
  };

  const handlePlayerChange = (index: number, value: string) => {
    const newPlayers = [...players];
    newPlayers[index] = value;
    setPlayers(newPlayers);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Register for {tournament.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="teamName">Team Name</Label>
            <Input
              id="teamName"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="Enter your team name"
              required
            />
          </div>

          {players.map((player, index) => (
            <div key={index} className="space-y-2">
              <Label htmlFor={`player${index + 1}`}>Player {index + 1}</Label>
              <Input
                id={`player${index + 1}`}
                value={player}
                onChange={(e) => handlePlayerChange(index, e.target.value)}
                placeholder={`Enter Player ${index + 1}'s name`}
                required
              />
            </div>
          ))}

          <Button type="submit" disabled={loading}>
            {loading ? 'Registering...' : 'Register Team'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}; 
