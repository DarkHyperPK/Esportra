import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Loader2,
  Plus,
  Send,
  Clock,
  CheckCircle,
  Users,
  Eye,
  BarChart3,
  Trash2,
  Edit,
  X,
  Search,
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { formatDistanceToNow, format } from 'date-fns';
import { usePlatformFeatures, FEATURES } from '@/hooks/usePlatformFeatures';
import { FeatureUnavailable } from '@/components/admin/FeatureUnavailable';

interface Broadcast {
  id: string;
  title: string;
  content: string;
  broadcast_type: string;
  priority: string;
  target_type: string;
  target_segment: Record<string, unknown> | null;
  target_user_ids: string[] | null;
  status: string;
  scheduled_at: string | null;
  sent_at: string | null;
  total_recipients: number;
  delivered_count: number;
  read_count: number;
  created_at: string;
  created_by_name: string | null;
}

interface BroadcastStats {
  total_recipients: number;
  delivered_count: number;
  read_count: number;
  failed_count: number;
  read_rate: number;
}

const statusColors: Record<string, string> = {
  draft: 'bg-zinc-500',
  scheduled: 'bg-zinc-500',
  sending: 'bg-amber-500',
  sent: 'bg-emerald-400',
  cancelled: 'bg-red-500',
};

const broadcastTypes = [
  { value: 'announcement', label: 'Announcement' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'promotion', label: 'Promotion' },
  { value: 'tournament', label: 'Tournament Update' },
  { value: 'system', label: 'System Alert' },
];

const priorities = [
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

const targetTypes = [
  { value: 'all', label: 'All Users' },
  { value: 'segment', label: 'User Segment' },
  { value: 'users', label: 'Specific Users' },
];

const roles = [
  { value: 'organizer', label: 'Tournament Organizer' },
  { value: 'venue_owner', label: 'Venue Owner' },
];

interface TargetSegment {
  is_verified?: boolean;
  role?: string;
  country?: string;
}

interface UserSearchResult {
  id: string;
  username: string;
  email: string;
}

export default function Broadcasts() {
  const { isEnabled: broadcastsEnabled, isLoading: featuresLoading } = usePlatformFeatures();
  const [activeTab, setActiveTab] = useState('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingBroadcast, setEditingBroadcast] = useState<Broadcast | null>(null);
  const [statsDialogOpen, setStatsDialogOpen] = useState(false);
  const [selectedBroadcast, setSelectedBroadcast] = useState<Broadcast | null>(null);
  const queryClient = useQueryClient();

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formType, setFormType] = useState('announcement');
  const [formPriority, setFormPriority] = useState('normal');
  const [formTargetType, setFormTargetType] = useState('all');
  const [formScheduledAt, setFormScheduledAt] = useState('');

  // Segment targeting state
  const [formSegment, setFormSegment] = useState<TargetSegment>({});
  const [formTargetUserIds, setFormTargetUserIds] = useState<string[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<UserSearchResult[]>([]);

  // Delivery channels
  const [formSendEmail, setFormSendEmail] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'broadcasts', activeTab === 'all' ? undefined : activeTab],
    queryFn: () => {
      const status = activeTab === 'all' ? '' : `?status=${activeTab}`;
      return apiClient.get<{ items: Broadcast[]; total: number }>(
        `/api/admin/broadcasts${status}`
      );
    },
  });

  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ['admin', 'broadcast-stats', selectedBroadcast?.id],
    queryFn: () => apiClient.get<BroadcastStats>(`/api/admin/broadcasts/${selectedBroadcast!.id}/stats`),
    enabled: !!selectedBroadcast && statsDialogOpen,
  });

  const { data: userSearchResponse } = useQuery({
    queryKey: ['admin', 'users-search', userSearch],
    queryFn: () =>
      apiClient.get<{ users: UserSearchResult[] }>(
        `/api/admin/users?search=${encodeURIComponent(userSearch)}&limit=5`
      ),
    enabled: userSearch.length >= 2 && formTargetType === 'users',
  });
  const userSearchResults = userSearchResponse?.users ?? [];

  const createBroadcast = useMutation({
    mutationFn: () =>
      apiClient.post('/api/admin/broadcasts', {
        title: formTitle,
        content: formContent,
        broadcast_type: formType,
        priority: formPriority,
        target_type: formTargetType,
        target_segment: formTargetType === 'segment' ? formSegment : undefined,
        target_user_ids: formTargetType === 'users' ? formTargetUserIds : undefined,
        channels: ['in_app', ...(formSendEmail ? ['email'] : [])],
        scheduled_at: formScheduledAt || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'broadcasts'] });
      toast.success('Broadcast created');
      resetForm();
      setCreateDialogOpen(false);
    },
    onError: () => {
      toast.error('Failed to create broadcast');
    },
  });

  const updateBroadcast = useMutation({
    mutationFn: () => {
      if (!editingBroadcast) return Promise.resolve();
      return apiClient.put(`/api/admin/broadcasts/${editingBroadcast.id}`, {
        title: formTitle,
        content: formContent,
        broadcast_type: formType,
        priority: formPriority,
        target_type: formTargetType,
        target_segment: formTargetType === 'segment' ? formSegment : undefined,
        target_user_ids: formTargetType === 'users' ? formTargetUserIds : undefined,
        channels: ['in_app', ...(formSendEmail ? ['email'] : [])],
        scheduled_at: formScheduledAt || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'broadcasts'] });
      toast.success('Broadcast updated');
      resetForm();
      setEditingBroadcast(null);
    },
    onError: () => {
      toast.error('Failed to update broadcast');
    },
  });

  const sendBroadcast = useMutation({
    mutationFn: (id: string) => apiClient.post(`/api/admin/broadcasts/${id}/send`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'broadcasts'] });
      toast.success('Broadcast queued for delivery');
    },
    onError: () => {
      toast.error('Failed to send broadcast');
    },
  });

  const cancelBroadcast = useMutation({
    mutationFn: (id: string) => apiClient.post(`/api/admin/broadcasts/${id}/cancel`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'broadcasts'] });
      toast.success('Broadcast cancelled');
    },
  });

  const deleteBroadcast = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/admin/broadcasts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'broadcasts'] });
      toast.success('Broadcast deleted');
    },
    onError: () => {
      toast.error('Failed to delete broadcast');
    },
  });

  const resetForm = () => {
    setFormTitle('');
    setFormContent('');
    setFormType('announcement');
    setFormPriority('normal');
    setFormTargetType('all');
    setFormScheduledAt('');
    setFormSegment({});
    setFormTargetUserIds([]);
    setSelectedUsers([]);
    setUserSearch('');
    setFormSendEmail(false);
  };

  const openEdit = (broadcast: Broadcast) => {
    setEditingBroadcast(broadcast);
    setFormTitle(broadcast.title);
    setFormContent(broadcast.content);
    setFormType(broadcast.broadcast_type);
    setFormPriority(broadcast.priority);
    // Map old 'specific' value to new 'users' value for backwards compatibility
    setFormTargetType(broadcast.target_type === 'specific' ? 'users' : broadcast.target_type);
    setFormScheduledAt(broadcast.scheduled_at ?? '');
    setFormSegment((broadcast.target_segment as TargetSegment) ?? {});
    setFormTargetUserIds(broadcast.target_user_ids ?? []);
    setSelectedUsers([]);
  };

  const addUser = (user: UserSearchResult) => {
    if (!formTargetUserIds.includes(user.id)) {
      setFormTargetUserIds([...formTargetUserIds, user.id]);
      setSelectedUsers([...selectedUsers, user]);
    }
    setUserSearch('');
  };

  const removeUser = (userId: string) => {
    setFormTargetUserIds(formTargetUserIds.filter((id) => id !== userId));
    setSelectedUsers(selectedUsers.filter((u) => u.id !== userId));
  };

  const broadcasts = data?.items ?? [];

  if (!featuresLoading && !broadcastsEnabled(FEATURES.broadcasts)) {
    return <FeatureUnavailable featureName="Broadcasts" backTo="/admin/dashboard" backLabel="Command Centre" />;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Broadcasts</h1>
          <p className="text-zinc-400 mt-1">
            Send announcements and notifications to users
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          New Broadcast
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-zinc-900/50 border border-zinc-800">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="draft">Drafts</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
          <TabsTrigger value="sent">Sent</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
            </div>
          ) : (
            <div className="space-y-3">
              {broadcasts.map((broadcast) => (
                <div
                  key={broadcast.id}
                  className="p-4 bg-zinc-900/50 border border-zinc-800"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-white font-medium">{broadcast.title}</h3>
                        <Badge className={statusColors[broadcast.status]}>
                          {broadcast.status}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {broadcast.broadcast_type}
                        </Badge>
                        {broadcast.priority !== 'normal' && (
                          <Badge
                            variant="outline"
                            className={
                              broadcast.priority === 'urgent'
                                ? 'border-red-500 text-red-400'
                                : broadcast.priority === 'high'
                                  ? 'border-amber-500 text-amber-300'
                                  : 'text-zinc-400'
                            }
                          >
                            {broadcast.priority}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-zinc-400 mt-1 line-clamp-2">
                        {broadcast.content}
                      </p>

                      <div className="flex items-center gap-4 mt-3 text-xs text-zinc-500">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {broadcast.target_type === 'all'
                            ? 'All users'
                            : broadcast.target_type === 'segment'
                              ? 'Segment'
                              : 'Specific users'}
                        </span>

                        {broadcast.status === 'scheduled' && broadcast.scheduled_at && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDistanceToNow(new Date(broadcast.scheduled_at), {
                              addSuffix: true,
                            })}
                          </span>
                        )}

                        {broadcast.status === 'sent' && (
                          <>
                            <span className="flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              {broadcast.delivered_count} delivered
                            </span>
                            <span className="flex items-center gap-1">
                              <Eye className="w-3 h-3" />
                              {broadcast.read_count} read
                            </span>
                            {broadcast.total_recipients > 0 && (
                              <span className="flex items-center gap-1">
                                <BarChart3 className="w-3 h-3" />
                                {Math.round(
                                  (broadcast.read_count / broadcast.total_recipients) * 100
                                )}
                                % read rate
                              </span>
                            )}
                          </>
                        )}

                        <span className="text-zinc-600">
                          Created {format(new Date(broadcast.created_at), 'MMM d, yyyy')}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {broadcast.status === 'sent' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedBroadcast(broadcast);
                            setStatsDialogOpen(true);
                          }}
                        >
                          <BarChart3 className="w-4 h-4 mr-1" />
                          Stats
                        </Button>
                      )}

                      {(broadcast.status === 'draft' || broadcast.status === 'scheduled') && (
                        <>
                          <Button variant="ghost" size="sm" onClick={() => openEdit(broadcast)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => sendBroadcast.mutate(broadcast.id)}
                            disabled={sendBroadcast.isPending}
                          >
                            <Send className="w-4 h-4 mr-1" />
                            Send
                          </Button>
                        </>
                      )}

                      {broadcast.status === 'scheduled' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-400 hover:text-red-300"
                          onClick={() => cancelBroadcast.mutate(broadcast.id)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}

                      {broadcast.status === 'draft' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-400 hover:text-red-300"
                          onClick={() => {
                            if (confirm('Delete this broadcast?')) {
                              deleteBroadcast.mutate(broadcast.id);
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {broadcasts.length === 0 && (
                <div className="text-center py-12 text-zinc-500">
                  No broadcasts found
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create / Edit Dialog */}
      <Dialog
        open={createDialogOpen || !!editingBroadcast}
        onOpenChange={(open) => {
          if (!open) {
            setCreateDialogOpen(false);
            setEditingBroadcast(null);
            resetForm();
          }
        }}
      >
        <DialogContent className="bg-zinc-900 border-zinc-800 max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingBroadcast ? 'Edit Broadcast' : 'Create Broadcast'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm text-zinc-400 mb-2 block">Title</label>
              <Input
                placeholder="Broadcast title"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                className="bg-zinc-800 border-zinc-700"
              />
            </div>

            <div>
              <label className="text-sm text-zinc-400 mb-2 block">Content</label>
              <Textarea
                placeholder="Broadcast message..."
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                className="bg-zinc-800 border-zinc-700"
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-zinc-400 mb-2 block">Type</label>
                <Select value={formType} onValueChange={setFormType}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
                    {broadcastTypes.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm text-zinc-400 mb-2 block">Priority</label>
                <Select value={formPriority} onValueChange={setFormPriority}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
                    {priorities.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm text-zinc-400 mb-2 block">Target Audience</label>
              <Select value={formTargetType} onValueChange={(v) => {
                setFormTargetType(v);
                setFormSegment({});
                setFormTargetUserIds([]);
                setSelectedUsers([]);
              }}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  {targetTypes.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formTargetType === 'segment' && (
              <div className="p-4 bg-zinc-800/50 space-y-4">
                <p className="text-sm text-zinc-400">Segment Criteria</p>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="verified-only"
                    checked={formSegment.is_verified === true}
                    onCheckedChange={(checked) =>
                      setFormSegment({ ...formSegment, is_verified: checked === true ? true : undefined })
                    }
                  />
                  <label htmlFor="verified-only" className="text-sm text-white cursor-pointer">
                    Verified users only
                  </label>
                </div>

                <div>
                  <label className="text-sm text-zinc-400 mb-2 block">Role</label>
                  <Select
                    value={formSegment.role ?? '_any'}
                    onValueChange={(v) =>
                      setFormSegment({ ...formSegment, role: v === '_any' ? undefined : v })
                    }
                  >
                    <SelectTrigger className="bg-zinc-800 border-zinc-700">
                      <SelectValue placeholder="Any role" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700">
                      <SelectItem value="_any">Any role</SelectItem>
                      {roles.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm text-zinc-400 mb-2 block">Country Code</label>
                  <Input
                    placeholder="e.g., US, GB, DE"
                    value={formSegment.country ?? ''}
                    onChange={(e) =>
                      setFormSegment({ ...formSegment, country: e.target.value || undefined })
                    }
                    className="bg-zinc-800 border-zinc-700"
                    maxLength={2}
                  />
                </div>
              </div>
            )}

            {formTargetType === 'users' && (
              <div className="p-4 bg-zinc-800/50 space-y-3">
                <p className="text-sm text-zinc-400">Select Users</p>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <Input
                    placeholder="Search by username or email..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="pl-10 bg-zinc-800 border-zinc-700"
                  />
                </div>

                {userSearchResults && userSearchResults.length > 0 && (
                  <div className="border border-zinc-700 overflow-hidden">
                    {userSearchResults.map((user) => (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => addUser(user)}
                        disabled={formTargetUserIds.includes(user.id)}
                        className={`w-full px-3 py-2 text-left text-sm hover:bg-zinc-700 ${
                          formTargetUserIds.includes(user.id)
                            ? 'bg-zinc-700/50 text-zinc-500'
                            : ''
                        }`}
                      >
                        <span className="text-white">{user.username}</span>
                        <span className="text-zinc-500 ml-2">{user.email}</span>
                      </button>
                    ))}
                  </div>
                )}

                {selectedUsers.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedUsers.map((user) => (
                      <span
                        key={user.id}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-zinc-700  text-sm text-white"
                      >
                        {user.username}
                        <button
                          type="button"
                          onClick={() => removeUser(user.id)}
                          className="text-zinc-400 hover:text-white"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {formTargetUserIds.length > 0 && selectedUsers.length === 0 && editingBroadcast && (
                  <p className="text-xs text-amber-400">
                    {formTargetUserIds.length} previously selected user{formTargetUserIds.length !== 1 ? 's' : ''} (search to add more)
                  </p>
                )}

                {formTargetUserIds.length > 0 && selectedUsers.length > 0 && (
                  <p className="text-xs text-zinc-500">
                    {formTargetUserIds.length} user{formTargetUserIds.length !== 1 ? 's' : ''} selected
                  </p>
                )}
              </div>
            )}

            {/* Delivery Channels */}
            <div>
              <label className="text-sm text-zinc-400 mb-2 block">Delivery Channels</label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox id="channel-inapp" checked disabled />
                  <label htmlFor="channel-inapp" className="text-sm text-zinc-300 cursor-default">
                    In-App Notification
                  </label>
                  <span className="text-xs text-zinc-600">(always enabled)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="channel-email"
                    checked={formSendEmail}
                    onCheckedChange={(checked) => setFormSendEmail(checked === true)}
                  />
                  <label htmlFor="channel-email" className="text-sm text-white cursor-pointer">
                    Email
                  </label>
                  <span className="text-xs text-zinc-500">(via Resend)</span>
                </div>
              </div>
            </div>

            <div>
              <label className="text-sm text-zinc-400 mb-2 block">
                Schedule (optional)
              </label>
              <Input
                type="datetime-local"
                value={formScheduledAt}
                onChange={(e) => setFormScheduledAt(e.target.value)}
                className="bg-zinc-800 border-zinc-700"
              />
              <p className="text-xs text-zinc-500 mt-1">
                Leave empty to save as draft
              </p>
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button
              variant="outline"
              onClick={() => {
                setCreateDialogOpen(false);
                setEditingBroadcast(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (editingBroadcast) {
                  updateBroadcast.mutate();
                } else {
                  createBroadcast.mutate();
                }
              }}
              disabled={
                !formTitle ||
                !formContent ||
                createBroadcast.isPending ||
                updateBroadcast.isPending
              }
            >
              {createBroadcast.isPending || updateBroadcast.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              {editingBroadcast ? 'Save Changes' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stats Dialog */}
      <Dialog open={statsDialogOpen} onOpenChange={setStatsDialogOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle>Broadcast Statistics</DialogTitle>
          </DialogHeader>
          {loadingStats ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
            </div>
          ) : stats ? (
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="p-4 bg-zinc-800">
                <p className="text-2xl font-bold text-white">{stats.total_recipients}</p>
                <p className="text-xs text-zinc-500">Total Recipients</p>
              </div>
              <div className="p-4 bg-zinc-800">
                <p className="text-2xl font-bold text-emerald-300">{stats.delivered_count}</p>
                <p className="text-xs text-zinc-500">Delivered</p>
              </div>
              <div className="p-4 bg-zinc-800">
                <p className="text-2xl font-bold text-zinc-400">{stats.read_count}</p>
                <p className="text-xs text-zinc-500">Read</p>
              </div>
              <div className="p-4 bg-zinc-800">
                <p className="text-2xl font-bold text-rose-400">{stats.failed_count}</p>
                <p className="text-xs text-zinc-500">Failed</p>
              </div>
              <div className="col-span-2 p-4 bg-zinc-800">
                <div className="flex items-center justify-between">
                  <p className="text-zinc-400">Read Rate</p>
                  <p className="text-2xl font-bold text-white">{stats.read_rate}%</p>
                </div>
                <div className="mt-2 h-2 bg-zinc-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-400 rounded-full"
                    style={{ width: `${stats.read_rate}%` }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <p className="text-center text-zinc-500 py-8">No statistics available</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatsDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
