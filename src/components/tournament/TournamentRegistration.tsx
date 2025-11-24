import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import Select from 'react-select';

// NOTE: Requires 'react-select' package. Install with: npm install react-select

const TournamentRegistration = ({ tournamentId, teamSize = 5, ...props }) => {
  const { user } = useAuth();
  const [isBanned, setIsBanned] = useState(false);
  const [banReason, setBanReason] = useState<string | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [loading, setLoading] = useState(true);

  // Team registration state
  const [teamName, setTeamName] = useState('');
  const [teamMembers, setTeamMembers] = useState<(string | null)[]>(Array(teamSize).fill(null));
  const [teamLogoFile, setTeamLogoFile] = useState<File | null>(null);
  const [teamLogoUrl, setTeamLogoUrl] = useState<string | null>(null);
  const [verifiedUsers, setVerifiedUsers] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const checkStatus = async () => {
      setLoading(true);
      if (!user) {
        setIsBanned(false);
        setBanReason(null);
        setIsRegistered(false);
        setLoading(false);
        return;
      }
      // Check ban
      const { data: banData } = await supabase
        .from('tournament_bans' as any)
        .select('ban_reason')
        .eq('tournament_id', tournamentId)
        .eq('user_id', user.id)
        .maybeSingle();
      if (banData && !("error" in banData) && (banData as any).ban_reason !== undefined) {
        setIsBanned(true);
        setBanReason((banData as any).ban_reason);
        setIsRegistered(false);
        setLoading(false);
        return;
      }
      // Check registration
      const { data: regData } = await supabase
        .from('tournament_participants')
        .select('id')
        .eq('tournament_id', tournamentId)
        .eq('user_id', user.id)
        .maybeSingle();
      setIsRegistered(!!regData);
      setIsBanned(false);
      setBanReason(null);
      setLoading(false);
    };
    checkStatus();
  }, [user, tournamentId]);

  // Fetch verified users for team member selection
  useEffect(() => {
    const fetchVerifiedUsers = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, full_name, email')
        .eq('is_verified', true);
      if (!error && data) setVerifiedUsers(data);
    };
    fetchVerifiedUsers();
  }, []);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setTeamLogoFile(e.target.files[0]);
    }
  };

  const handleTeamMemberChange = (idx: number, value: string) => {
    const updated = [...teamMembers];
    updated[idx] = value;
    setTeamMembers(updated);
  };

  const uploadTeamLogo = async (file: File): Promise<string | null> => {
    if (!file) return null;
    const fileExt = file.name.split('.').pop();
    const fileName = `${user?.id}-${Date.now()}.${fileExt}`;
    const filePath = `team-logos/${fileName}`;
    const { error } = await supabase.storage.from('teams.logos').upload(filePath, file);
    if (error) return null;
    const { data } = supabase.storage.from('teams.logos').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    let logoUrl = null;
    if (teamLogoFile) {
      logoUrl = await uploadTeamLogo(teamLogoFile);
      setTeamLogoUrl(logoUrl);
    }
    // Save registration (add your registration logic here)
    // Example: await supabase.from('tournament_participants').insert({...})
    setSubmitting(false);
    alert('Registration submitted! (implement your registration logic)');
  };

  // Prepare options for react-select
  const userOptions = verifiedUsers.map(user => ({
    value: user.id,
    label: `@${user.username}${user.full_name ? ` (${user.full_name})` : ''}${user.email ? ` - ${user.email}` : ''}`,
  }));

  if (loading) return <div>Loading...</div>;

  if (isBanned) {
    return (
      <button
        className="w-full bg-red-600 text-white font-bold py-2 rounded cursor-not-allowed flex flex-col items-center justify-center"
        disabled
        style={{ opacity: 1 }}
      >
        BANNED
        {banReason && (
          <span className="text-xs font-normal mt-1">{banReason}</span>
        )}
      </button>
    );
  }

  if (isRegistered) {
    return (
      <div className="rounded-lg bg-green-700/90 text-white p-4 mb-4">
        <strong>You are registered for this tournament.</strong>
      </div>
    );
  }

  // Registration form (team only for this example)
  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-gaming-dark p-6 rounded-lg border border-gaming-gray/30 max-w-lg mx-auto mt-8">
      <div>
        <Label htmlFor="teamName">Team Name</Label>
        <Input id="teamName" value={teamName} onChange={e => setTeamName(e.target.value)} required />
      </div>
      <div>
        <Label>Team Members</Label>
        {[...Array(teamSize)].map((_, idx) => (
          <div key={idx} className="mb-2">
            <Label>Member {idx + 1}</Label>
            <Select
              options={userOptions}
              value={userOptions.find(opt => opt.value === teamMembers[idx]) || null}
              onChange={option => handleTeamMemberChange(idx, option ? option.value : null)}
              isClearable
              isSearchable
              placeholder="Type to search for a verified user..."
              classNamePrefix="react-select"
            />
          </div>
        ))}
      </div>
      <div>
        <Label htmlFor="teamLogo">Team Logo (Optional)</Label>
        <Input id="teamLogo" type="file" accept="image/*" onChange={handleLogoChange} />
        {teamLogoUrl && (
          <img src={teamLogoUrl} alt="Team Logo" className="mt-2 w-16 h-16 object-cover rounded" />
        )}
      </div>
      <Button type="submit" className="w-full bg-gaming-purple hover:bg-gaming-purple/80" disabled={submitting}>
        {submitting ? 'Registering...' : 'Register Team'}
      </Button>
    </form>
  );
};

export default TournamentRegistration; 