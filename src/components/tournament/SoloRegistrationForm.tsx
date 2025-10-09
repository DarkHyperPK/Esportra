
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

// Minimal local type for Riot account data used by this form
type RiotAccountData = {
  gameName: string;
};

interface SoloRegistrationFormProps {
  gamertag: string;
  setGamertag: (value: string) => void;
  riotAccount: RiotAccountData | null;
}

const SoloRegistrationForm = ({
  gamertag,
  setGamertag,
  riotAccount,
}: SoloRegistrationFormProps) => {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="gamertag">Gamer Tag/Nickname</Label>
        <Input 
          id="gamertag"
          value={riotAccount?.gameName || gamertag}
          onChange={(e) => setGamertag(e.target.value)}
          placeholder="Enter your in-game name"
          className="bg-gaming-gray/10"
          disabled={!!riotAccount}
        />
        {riotAccount && (
          <p className="text-xs text-gaming-green mt-1">Using verified Riot account name</p>
        )}
      </div>
    </div>
  );
};

export default SoloRegistrationForm;
