
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { InfoIcon } from 'lucide-react';

// Minimal local type for Riot account data used by this form
type RiotAccountData = {
  gameName: string;
};

interface TeamRegistrationFormProps {
  teamName: string;
  setTeamName: (value: string) => void;
  teamCaptain: string;
  setTeamCaptain: (value: string) => void;
  teamMembers: string;
  setTeamMembers: (value: string) => void;
  teamEmail: string;
  setTeamEmail: (value: string) => void;
  teamPhone: string;
  setTeamPhone: (value: string) => void;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  riotAccount: RiotAccountData | null;
}

const TeamRegistrationForm = ({
  teamName,
  setTeamName,
  teamCaptain,
  setTeamCaptain,
  teamMembers,
  setTeamMembers,
  teamEmail,
  setTeamEmail,
  teamPhone,
  setTeamPhone,
  handleFileChange,
  riotAccount,
}: TeamRegistrationFormProps) => {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="teamName">Team Name</Label>
        <Input
          id="teamName"
          value={teamName}
          onChange={(e) => setTeamName(e.target.value)}
          required
        />
      </div>
      <div>
        <Label htmlFor="teamCaptain">Team Captain</Label>
        <Input
          id="teamCaptain"
          value={riotAccount?.gameName || teamCaptain}
          onChange={(e) => setTeamCaptain(e.target.value)}
          disabled={!!riotAccount}
          required
        />
        {riotAccount && (
          <p className="text-xs text-gaming-green mt-1">Using verified Riot account name</p>
        )}
      </div>
      <div>
        <Label htmlFor="teamMembers">Team Members</Label>
        <Alert className="mb-2 bg-gaming-dark/50 border-gaming-gray/50">
          <InfoIcon className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Each team member must register with their own Riot account before the tournament
          </AlertDescription>
        </Alert>
        <Textarea
          id="teamMembers"
          placeholder="List your team members' Riot IDs (one per line)"
          value={teamMembers}
          onChange={(e) => setTeamMembers(e.target.value)}
          required
        />
      </div>
      <div>
        <Label htmlFor="teamEmail">Contact Email</Label>
        <Input
          id="teamEmail"
          type="email"
          value={teamEmail}
          onChange={(e) => setTeamEmail(e.target.value)}
          required
        />
      </div>
      <div>
        <Label htmlFor="teamPhone">Contact Phone</Label>
        <Input
          id="teamPhone"
          type="tel"
          value={teamPhone}
          onChange={(e) => setTeamPhone(e.target.value)}
          required
        />
      </div>
      <div>
        <Label htmlFor="teamLogo">Team Logo (Optional)</Label>
        <Input
          id="teamLogo"
          type="file"
          accept="image/*"
          onChange={handleFileChange}
        />
      </div>
    </div>
  );
};

export default TeamRegistrationForm;
