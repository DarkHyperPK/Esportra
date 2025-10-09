import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Select from 'react-select';
import { X, UploadCloud } from 'lucide-react';

const games = [
  { value: 'valorant', label: 'VALORANT', logo: '/games/valorant.png' },
  { value: 'cs2', label: 'CS2', logo: '/games/cs2.png' },
  { value: 'fortnite', label: 'Fortnite', logo: '/games/fortnite.png' },
  // Add more games as needed
];

// Dummy users for autocomplete
const dummyUsers = [
  { value: 'Dark2', label: 'Dark2' },
  { value: 'Dark3', label: 'Dark3' },
  { value: 'PlayerX', label: 'PlayerX' },
  { value: 'PlayerY', label: 'PlayerY' },
];

const TeamForm = ({ mode = 'create', team = null, onClose, onSubmit }) => {
  const [teamName, setTeamName] = useState(team?.name || '');
  const [teamTag, setTeamTag] = useState(team?.tag || '');
  const [game, setGame] = useState(team?.game || '');
  const [teamLogoFile, setTeamLogoFile] = useState(null);
  const [teamLogoUrl, setTeamLogoUrl] = useState(team?.logo || null);
  const [members, setMembers] = useState(team?.members?.filter(m => m.role !== 'Captain').map(m => ({ value: m.username, label: m.username })) || []);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef();

  const handleLogoChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setTeamLogoFile(e.target.files[0]);
      setTeamLogoUrl(URL.createObjectURL(e.target.files[0]));
    }
  };

  const handleLogoRemove = () => {
    setTeamLogoFile(null);
    setTeamLogoUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitting(true);
    // For now, just pass the form data up
    onSubmit({
      id: team?.id,
      name: teamName,
      tag: teamTag,
      logo: teamLogoUrl,
      game,
      members: members.map(m => ({ id: 'u' + m.value, username: m.value, avatar: '', role: 'Member' })),
      captain: 'You', // Placeholder
    });
    setSubmitting(false);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg bg-gradient-to-br from-gaming-dark via-gaming-darker to-gaming-dark rounded-2xl shadow-2xl p-0">
        <DialogHeader>
          <DialogTitle className="text-2xl font-extrabold text-white mb-2">{mode === 'edit' ? 'Edit Team' : 'Create a New Team'}</DialogTitle>
        </DialogHeader>
        <form className="space-y-6 p-6" onSubmit={handleSubmit}>
          {/* Logo Upload */}
          <div>
            <Label className="mb-1 block text-lg">Team Logo (Optional)</Label>
            <div
              className={`flex items-center justify-center border-2 border-dashed rounded-xl bg-esports-dark/60 p-6 cursor-pointer transition-all duration-150 hover:border-gaming-purple/60 ${teamLogoUrl ? 'border-gaming-purple/60' : 'border-gaming-gray/30'}`}
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
            >
              {teamLogoUrl ? (
                <div className="relative group">
                  <img src={teamLogoUrl} alt="Team Logo" className="w-20 h-20 object-cover rounded-xl shadow-lg" />
                  <button
                    type="button"
                    className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 shadow hover:bg-red-700 transition-all"
                    onClick={e => { e.stopPropagation(); handleLogoRemove(); }}
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-gray-400">
                  <UploadCloud size={32} className="text-gaming-purple mb-1" />
                  <span className="text-sm">Click or drag to upload</span>
                </div>
              )}
              <input
                ref={fileInputRef}
                id="teamLogo"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoChange}
              />
            </div>
          </div>
          {/* Team Name */}
          <div>
            <Label htmlFor="teamName" className="mb-1 block text-lg">Team Name</Label>
            <Input id="teamName" value={teamName} onChange={e => setTeamName(e.target.value)} required className="text-lg px-4 py-3 rounded-xl bg-gaming-dark border-gaming-gray/30 focus:border-gaming-purple/60" />
          </div>
          {/* Team Tag */}
          <div>
            <Label htmlFor="teamTag" className="mb-1 block text-lg">Team Tag (short)</Label>
            <Input id="teamTag" value={teamTag} onChange={e => setTeamTag(e.target.value)} maxLength={6} required className="text-lg px-4 py-3 rounded-xl bg-gaming-dark border-gaming-gray/30 focus:border-gaming-purple/60" />
          </div>
          {/* Game Select */}
          <div>
            <Label htmlFor="game" className="mb-1 block text-lg">Game</Label>
            <Select
              id="game"
              options={games}
              value={games.find(opt => opt.value === game) || null}
              onChange={opt => setGame(opt ? opt.value : '')}
              placeholder="Select a game"
              classNamePrefix="react-select"
              styles={{
                control: (base) => ({ ...base, backgroundColor: '#18181b', color: '#fff', borderColor: '#23232b', minHeight: 48, fontSize: 18 }),
                menu: (base) => ({ ...base, backgroundColor: '#18181b', color: '#fff' }),
                option: (base, state) => ({
                  ...base,
                  backgroundColor: state.isSelected ? '#a259ff' : state.isFocused ? '#23232b' : '#18181b',
                  color: state.isSelected ? '#fff' : '#fff',
                }),
                singleValue: (base) => ({ ...base, color: '#fff' }),
                placeholder: (base) => ({ ...base, color: '#aaa' }),
              }}
            />
          </div>
          {/* Members Autocomplete */}
          <div>
            <Label className="mb-1 block text-lg">Team Members <span className="text-gray-400 text-sm">(optional)</span></Label>
            <Select
              isMulti
              options={dummyUsers}
              value={members}
              onChange={setMembers}
              placeholder="Type to search and add members..."
              classNamePrefix="react-select"
              styles={{
                control: (base) => ({ ...base, backgroundColor: '#18181b', color: '#fff', borderColor: '#23232b', minHeight: 48, fontSize: 18 }),
                menu: (base) => ({ ...base, backgroundColor: '#18181b', color: '#fff' }),
                option: (base, state) => ({
                  ...base,
                  backgroundColor: state.isSelected ? '#a259ff' : state.isFocused ? '#23232b' : '#18181b',
                  color: state.isSelected ? '#fff' : '#fff',
                }),
                multiValue: (base) => ({ ...base, backgroundColor: '#a259ff', color: '#fff', borderRadius: 12, padding: '2px 8px' }),
                multiValueLabel: (base) => ({ ...base, color: '#fff' }),
                multiValueRemove: (base) => ({ ...base, color: '#fff', ':hover': { backgroundColor: '#7c3aed', color: '#fff' } }),
                placeholder: (base) => ({ ...base, color: '#aaa' }),
              }}
            />
            <div className="text-xs text-gray-400 mt-1">Add usernames of verified users to your team. You can invite more later.</div>
          </div>
          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="rounded-xl px-6 py-2">Cancel</Button>
            <Button type="submit" className="bg-gaming-purple hover:bg-gaming-purple/80 rounded-xl px-8 py-2 text-lg font-semibold shadow-lg" disabled={submitting}>
              {submitting ? (mode === 'edit' ? 'Saving...' : 'Creating...') : (mode === 'edit' ? 'Save Changes' : 'Create Team')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TeamForm; 