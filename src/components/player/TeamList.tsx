import React, { useState } from 'react';
import { Card, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Plus, Edit2, Trash2, UserMinus } from 'lucide-react';

// Dummy data for UI preview
const dummyTeams = [
  {
    id: '1',
    name: 'Alpha Squad',
    tag: 'ALPHA',
    logo: '/games/valorant.png',
    game: 'valorant',
    members: [
      { id: 'u1', username: 'captain1', avatar: '', role: 'Captain' },
      { id: 'u2', username: 'player2', avatar: '', role: 'Member' },
    ],
  },
  {
    id: '2',
    name: 'Bravo Team',
    tag: 'BRAVO',
    logo: '/games/cs2.png',
    game: 'cs2',
    members: [
      { id: 'u3', username: 'captain2', avatar: '', role: 'Captain' },
      { id: 'u4', username: 'player4', avatar: '', role: 'Member' },
    ],
  },
];

const TeamList = ({ teams, setTeams, onEdit, onDelete, onInvite }) => {
  const [activeTab, setActiveTab] = useState({}); // { [teamId]: 'members' | 'stats' }

  // Remove member (only if captain)
  const handleRemoveMember = (teamId, memberId) => {
    setTeams(teams =>
      teams.map(team =>
        team.id === teamId
          ? { ...team, members: team.members.filter(m => m.id !== memberId) }
          : team
      )
    );
  };

  return (
    <div className="space-y-10">
      {teams.map((team) => {
        const tab = activeTab[team.id] || 'members';
        return (
          <Card
            key={team.id}
            className="bg-gradient-to-br from-gaming-dark via-gaming-darker to-gaming-dark border border-gaming-purple/50 rounded-3xl shadow-2xl p-8 flex flex-col gap-6 relative transition-all duration-200 hover:shadow-purple-700/30"
          >
            {/* Header Row */}
            <div className="flex items-center gap-6 mb-4">
              <div className="h-20 w-20 rounded-full bg-esports-dark flex items-center justify-center overflow-hidden border-4 border-gaming-purple/60 shadow-lg">
                <img src={team.logo} alt={team.name} className="h-full w-full object-cover" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-3xl font-extrabold text-white drop-shadow mb-1">{team.name}</CardTitle>
                <div className="flex items-center gap-3 mt-1">
                  <span className="bg-gaming-purple/90 text-white px-4 py-1 rounded-full text-xs font-semibold shadow uppercase tracking-wider">{team.game}</span>
                  <span className="bg-gaming-purple/80 text-white px-4 py-1 rounded-full text-xs font-semibold shadow">{team.members.length} members</span>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-4">
              <button
                className={`px-5 py-2 rounded-full font-semibold text-sm transition-all duration-150 focus:outline-none ${tab === 'members' ? 'bg-gaming-purple text-white shadow-lg' : 'bg-gaming-dark text-gray-300 hover:bg-gaming-purple/20'}`}
                onClick={() => setActiveTab(a => ({ ...a, [team.id]: 'members' }))}
              >
                Members
              </button>
              <button
                className={`px-5 py-2 rounded-full font-semibold text-sm transition-all duration-150 focus:outline-none ${tab === 'stats' ? 'bg-gaming-purple text-white shadow-lg' : 'bg-gaming-dark text-gray-300 hover:bg-gaming-purple/20'}`}
                onClick={() => setActiveTab(a => ({ ...a, [team.id]: 'stats' }))}
              >
                Stats
              </button>
            </div>

            {/* Members Tab */}
            {tab === 'members' && (
              <div className="space-y-3 mb-4">
                {team.members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between bg-gaming-dark rounded-2xl px-5 py-3 shadow-sm transition-all duration-150 hover:shadow-lg"
                  >
                    <div className="flex items-center gap-4">
                      <Avatar src={member.avatar} name={member.username} size={48} />
                      <div>
                        <div className="font-bold text-white text-lg">{member.username}</div>
                        <div className="text-xs text-gray-400">{member.role}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {member.role === 'Captain' && (
                        <Badge variant="outline" className="border-yellow-500 text-yellow-400 bg-gaming-dark/80 px-4 py-1 rounded-full font-bold">Captain</Badge>
                      )}
                      {member.role !== 'Captain' && (
                        <Button
                          size="sm"
                          variant="destructive"
                          className="flex items-center gap-1 px-4 py-1 rounded-full text-xs font-semibold shadow hover:shadow-lg transition-all duration-150"
                          onClick={() => handleRemoveMember(team.id, member.id)}
                        >
                          <UserMinus className="h-4 w-4 mr-1" /> Remove
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Stats Tab (placeholder) */}
            {tab === 'stats' && (
              <div className="text-gray-400 text-center py-8">Team stats coming soon...</div>
            )}

            {/* Floating Action Bar */}
            <div className="flex gap-4 mt-4 justify-end flex-wrap">
              <Button
                variant="outline"
                size="sm"
                className="bg-gaming-purple/20 hover:bg-gaming-purple/40 border-gaming-purple/40 text-gaming-purple font-semibold rounded-full shadow flex items-center gap-2 px-6 py-2 transition-all duration-150"
                onClick={() => onInvite(team)}
              >
                <Plus className="h-4 w-4" /> Invite Member
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full flex items-center gap-2 px-6 py-2 transition-all duration-150"
                onClick={() => onEdit(team)}
              >
                <Edit2 className="h-4 w-4" /> Edit
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="rounded-full flex items-center gap-2 px-6 py-2 transition-all duration-150"
                onClick={() => onDelete(team)}
              >
                <Trash2 className="h-4 w-4" /> Delete
              </Button>
            </div>
          </Card>
        );
      })}
    </div>
  );
};

export default TeamList; 