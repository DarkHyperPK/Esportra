import React, { useState } from 'react';
import TeamForm from './TeamForm';
import TeamList from './TeamList';
import TeamDeleteModal from './TeamDeleteModal';
import TeamInviteModal from './TeamInviteModal';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

const initialTeams = [
  {
    id: '1',
    name: 'Maverickss',
    tag: 'MAV',
    logo: '/games/valorant.png',
    game: 'VALORANT',
    members: [
      { id: 'u1', username: 'Dark2', avatar: '', role: 'Captain' },
      { id: 'u2', username: 'Dark3', avatar: '', role: 'Member' },
    ],
  },
];

const TeamManager: React.FC = () => {
  const [teams, setTeams] = useState(initialTeams);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);

  // Create team
  const handleCreateTeam = (teamData) => {
    setTeams(prev => [
      {
        ...teamData,
        id: Date.now().toString(),
        members: [
          { id: 'u' + Date.now(), username: teamData.captain || 'Captain', avatar: '', role: 'Captain' },
          ...(teamData.members || [])
        ],
      },
      ...prev
    ]);
    setShowCreateModal(false);
  };

  // Edit team
  const handleEditTeam = (teamData) => {
    setTeams(prev => prev.map(t => t.id === teamData.id ? { ...t, ...teamData } : t));
    setShowEditModal(false);
    setSelectedTeam(null);
  };

  // Delete team
  const handleDeleteTeam = (team) => {
    setTeams(prev => prev.filter(t => t.id !== team.id));
    setShowDeleteModal(false);
    setSelectedTeam(null);
  };

  // Invite member (dummy logic)
  const handleInviteMember = (username) => {
    // Check if already a member
    if (selectedTeam.members.some(m => m.username.toLowerCase() === username.toLowerCase())) {
      alert('User is already a member!');
      return;
    }
    setTeams(prev => prev.map(t =>
      t.id === selectedTeam.id
        ? { ...t, members: [...t.members, { id: 'u' + Date.now(), username, avatar: '', role: 'Member' }] }
        : t
    ));
    setShowInviteModal(false);
    setSelectedTeam(null);
  };

  // Remove member (dummy logic, handled in TeamList for now)

  return (
    <div className="container mx-auto py-12 px-2 md:px-0">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-10">
        <div>
          <h1 className="text-4xl font-extrabold mb-2 text-white drop-shadow">Team Management</h1>
          <p className="text-gray-400 text-lg">Create, manage, and view your teams. Invite verified users, upload a team logo, and track your team's stats across tournaments.</p>
        </div>
        <Button className="bg-gaming-purple hover:bg-gaming-purple/80 text-white font-semibold px-8 py-3 rounded-xl shadow-lg text-lg" onClick={() => setShowCreateModal(true)}>
          <Plus className="mr-2 h-5 w-5" /> Create Team
        </Button>
      </div>

      <h2 className="text-2xl font-bold mb-8 text-white">Create Your Team</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* Left: Team List */}
        <div>
          <TeamList
            teams={teams}
            onEdit={team => { setSelectedTeam(team); setShowEditModal(true); }}
            onDelete={team => { setSelectedTeam(team); setShowDeleteModal(true); }}
            onInvite={team => { setSelectedTeam(team); setShowInviteModal(true); }}
            setTeams={setTeams}
          />
        </div>
        {/* Right: Create a New Team Card */}
        <Card className="bg-gradient-to-br from-gaming-dark via-gaming-darker to-gaming-dark border border-gaming-purple/40 border-dashed flex flex-col justify-center items-center p-12 min-h-[400px] rounded-3xl shadow-2xl">
          <div className="rounded-full bg-esports-dark/80 p-6 mb-6 shadow-lg">
            <Plus size={48} className="text-gaming-purple" />
          </div>
          <h3 className="text-2xl font-extrabold mb-2 text-white">Create a New Team</h3>
          <p className="text-center text-gray-400 mb-6 text-lg">Form a team to participate in tournaments together</p>
          <Button className="bg-gaming-purple hover:bg-gaming-purple/80 px-8 py-3 text-lg rounded-xl font-semibold shadow-lg" onClick={() => setShowCreateModal(true)}>
            <Plus className="mr-2 h-5 w-5" /> Create Team
          </Button>
        </Card>
      </div>

      {/* Modals */}
      {showCreateModal && (
        <TeamForm
          mode="create"
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateTeam}
        />
      )}
      {showEditModal && selectedTeam && (
        <TeamForm
          mode="edit"
          team={selectedTeam}
          onClose={() => { setShowEditModal(false); setSelectedTeam(null); }}
          onSubmit={handleEditTeam}
        />
      )}
      {showDeleteModal && selectedTeam && (
        <TeamDeleteModal
          team={selectedTeam}
          onClose={() => { setShowDeleteModal(false); setSelectedTeam(null); }}
          onDelete={handleDeleteTeam}
        />
      )}
      {showInviteModal && selectedTeam && (
        <TeamInviteModal
          team={selectedTeam}
          onClose={() => { setShowInviteModal(false); setSelectedTeam(null); }}
          onInvite={handleInviteMember}
        />
      )}
    </div>
  );
};

export default TeamManager; 