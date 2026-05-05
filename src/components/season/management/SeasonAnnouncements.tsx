import { useState } from 'react';
import { Plus, Edit2, Trash2, Send, Users, Trophy, XCircle } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';

interface SeasonAnnouncement {
  id: string;
  season_id: string;
  title: string;
  body: string;
  target_audience: string;
  target_tournament_id: string | null;
  created_by: string;
  created_by_username: string;
  created_by_full_name: string;
  created_at: string;
  updated_at: string;
}

interface SeasonAnnouncementsProps {
  seasonId: string;
}

export default function SeasonAnnouncements({ seasonId }: SeasonAnnouncementsProps) {
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    body: '',
    target_audience: 'all',
    target_tournament_id: null as string | null,
  });

  const { data: announcements, isLoading } = useQuery({
    queryKey: ['seasonAnnouncements', seasonId],
    queryFn: () => apiClient.get<SeasonAnnouncement[]>(`/api/seasons/${seasonId}/announcements`),
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => 
      apiClient.post(`/api/seasons/${seasonId}/announcements`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seasonAnnouncements', seasonId] });
      setIsCreating(false);
      setFormData({ title: '', body: '', target_audience: 'all', target_tournament_id: null });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<typeof formData> }) =>
      apiClient.patch(`/api/seasons/${seasonId}/announcements/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seasonAnnouncements', seasonId] });
      setEditingId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/api/seasons/${seasonId}/announcements/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seasonAnnouncements', seasonId] });
    },
  });

  const handleCreate = () => {
    createMutation.mutate(formData);
  };

  const handleUpdate = (id: string) => {
    updateMutation.mutate({ id, data: formData });
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this announcement?')) {
      deleteMutation.mutate(id);
    }
  };

  const startEdit = (announcement: SeasonAnnouncement) => {
    setEditingId(announcement.id);
    setFormData({
      title: announcement.title,
      body: announcement.body,
      target_audience: announcement.target_audience,
      target_tournament_id: announcement.target_tournament_id,
    });
  };

  const getAudienceIcon = (audience: string) => {
    switch (audience) {
      case 'all':
        return <Users className="w-4 h-4" />;
      case 'qualified':
        return <Trophy className="w-4 h-4" />;
      case 'eliminated':
        return <XCircle className="w-4 h-4" />;
      default:
        return <Users className="w-4 h-4" />;
    }
  };

  const getAudienceBadge = (audience: string) => {
    switch (audience) {
      case 'all':
        return 'bg-blue-100 text-blue-800';
      case 'qualified':
        return 'bg-green-100 text-green-800';
      case 'eliminated':
        return 'bg-red-100 text-red-800';
      case 'specific_tournament':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Announcements</h2>
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>New Announcement</span>
        </button>
      </div>

      {/* Create Form */}
      {isCreating && (
        <div className="bg-white border rounded-lg p-6 space-y-4">
          <h3 className="text-lg font-semibold">Create Announcement</h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Announcement title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
            <textarea
              value={formData.body}
              onChange={(e) => setFormData({ ...formData, body: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Announcement message"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Target Audience</label>
            <select
              value={formData.target_audience}
              onChange={(e) => setFormData({ ...formData, target_audience: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Participants</option>
              <option value="qualified">Qualified Teams</option>
              <option value="eliminated">Eliminated Teams</option>
              <option value="specific_tournament">Specific Tournament</option>
            </select>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={createMutation.isPending || !formData.title || !formData.body}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
              <span>{createMutation.isPending ? 'Sending...' : 'Send Announcement'}</span>
            </button>
            <button
              onClick={() => setIsCreating(false)}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Announcements List */}
      <div className="space-y-3">
        {announcements?.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No announcements yet.</p>
          </div>
        ) : (
          announcements?.map((announcement: SeasonAnnouncement) => (
            <div key={announcement.id} className="bg-white border rounded-lg p-4">
              {editingId === announcement.id ? (
                // Edit Form
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                    <textarea
                      value={formData.body}
                      onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleUpdate(announcement.id)}
                      disabled={updateMutation.isPending}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      {updateMutation.isPending ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                // Display View
                <div>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900">{announcement.title}</h3>
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium capitalize ${getAudienceBadge(announcement.target_audience)}`}>
                          {getAudienceIcon(announcement.target_audience)}
                          {announcement.target_audience.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-gray-600 text-sm">{announcement.body}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEdit(announcement)}
                        className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(announcement.id)}
                        className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>By {announcement.created_by_full_name || announcement.created_by_username}</span>
                    <span>•</span>
                    <span>{new Date(announcement.created_at).toLocaleString()}</span>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
