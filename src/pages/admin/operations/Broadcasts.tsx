import { useState, type ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { AdminPage } from '@/components/admin/AdminPage';
import {
  CommandButton,
  CommandIconButton,
  CommandEmptyState,
  CommandPanel,
  CommandSection,
  CommandTabs,
} from '@/components/management/CommandSurface';

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

const STATUS_CHIP: Record<string, { dot: string; chip: string }> = {
  draft: { dot: 'bg-zinc-600', chip: 'border-white/10 text-zinc-400' },
  scheduled: { dot: 'bg-amber-300', chip: 'border-amber-500/30 text-amber-300' },
  sending: { dot: 'bg-amber-300', chip: 'border-amber-500/30 text-amber-300' },
  sent: { dot: 'bg-rose-500', chip: 'border-white/25 text-white' },
  cancelled: { dot: 'bg-red-400', chip: 'border-red-500/30 text-red-300' },
};

const TYPE_CHIP = 'border border-white/10 text-zinc-400';

const priorityChipClass = (priority: string) =>
  priority === 'urgent'
    ? 'border border-red-500/40 text-red-300'
    : priority === 'high'
      ? 'border border-amber-500/30 text-amber-300'
      : TYPE_CHIP;

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
    <AdminPage
      eyebrow="Operations"
      title="Broadcasts"
      description="Send announcements and notifications to users"
      actions={
        <CommandButton onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          New Broadcast
        </CommandButton>
      }
    >
      <CommandTabs
        tabs={[
          { value: 'all', label: 'All' },
          { value: 'draft', label: 'Drafts' },
          { value: 'scheduled', label: 'Scheduled' },
          { value: 'sent', label: 'Sent' },
        ]}
        active={activeTab}
        onChange={setActiveTab}
      />

      {isLoading ? (
        <CommandSection className="py-16 text-center">
          <Loader2 className="mx-auto h-5 w-5 animate-spin text-zinc-600" />
        </CommandSection>
      ) : broadcasts.length === 0 ? (
        <CommandEmptyState
          title="No broadcasts found"
          description="Create a broadcast to announce updates across the platform."
          icon={<Send className="h-5 w-5" />}
        />
      ) : (
        <CommandSection className="p-0">
          <div className="divide-y divide-white/5">
            {broadcasts.map((broadcast) => {
              const statusChip = STATUS_CHIP[broadcast.status];
              return (
                <div key={broadcast.id} className="p-5 transition-colors hover:bg-white/[0.02]">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <h3 className="text-base font-bold text-white">{broadcast.title}</h3>
                        {statusChip && (
                          <span className={`inline-flex items-center gap-1.5 border px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider ${statusChip.chip}`}>
                            <span className={`h-1.5 w-1.5 ${statusChip.dot}`} />
                            {broadcast.status}
                          </span>
                        )}
                        <span className={`px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider ${TYPE_CHIP}`}>
                          {broadcast.broadcast_type}
                        </span>
                        {broadcast.priority !== 'normal' && (
                          <span className={`px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider ${priorityChipClass(broadcast.priority)}`}>
                            {broadcast.priority}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm text-zinc-400">
                        {broadcast.content}
                      </p>

                      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {broadcast.target_type === 'all'
                            ? 'All users'
                            : broadcast.target_type === 'segment'
                              ? 'Segment'
                              : 'Specific users'}
                        </span>

                        {broadcast.status === 'scheduled' && broadcast.scheduled_at && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNow(new Date(broadcast.scheduled_at), {
                              addSuffix: true,
                            })}
                          </span>
                        )}

                        {broadcast.status === 'sent' && (
                          <>
                            <span className="flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" />
                              <span className="font-mono tabular-nums">{broadcast.delivered_count}</span> delivered
                            </span>
                            <span className="flex items-center gap-1">
                              <Eye className="h-3 w-3" />
                              <span className="font-mono tabular-nums">{broadcast.read_count}</span> read
                            </span>
                            {broadcast.total_recipients > 0 && (
                              <span className="flex items-center gap-1">
                                <BarChart3 className="h-3 w-3" />
                                <span className="font-mono tabular-nums">
                                  {Math.round(
                                    (broadcast.read_count / broadcast.total_recipients) * 100
                                  )}
                                  %
                                </span>{' '}
                                read rate
                              </span>
                            )}
                          </>
                        )}

                        <span className="font-mono tabular-nums text-zinc-600">
                          Created {format(new Date(broadcast.created_at), 'MMM d, yyyy')}
                        </span>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-1.5">
                      {broadcast.status === 'sent' && (
                        <CommandButton
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedBroadcast(broadcast);
                            setStatsDialogOpen(true);
                          }}
                        >
                          <BarChart3 className="h-4 w-4" />
                          Stats
                        </CommandButton>
                      )}

                      {(broadcast.status === 'draft' || broadcast.status === 'scheduled') && (
                        <>
                          <CommandIconButton
                            label="Edit broadcast"
                            variant="ghost"
                            className="h-8 w-8 text-zinc-500 hover:text-white"
                            onClick={() => openEdit(broadcast)}
                          >
                            <Edit className="h-4 w-4" />
                          </CommandIconButton>
                          <CommandButton
                            size="sm"
                            onClick={() => sendBroadcast.mutate(broadcast.id)}
                            disabled={sendBroadcast.isPending}
                          >
                            <Send className="h-4 w-4" />
                            Send
                          </CommandButton>
                        </>
                      )}

                      {broadcast.status === 'scheduled' && (
                        <CommandIconButton
                          label="Cancel scheduled broadcast"
                          variant="danger"
                          className="h-8 w-8"
                          onClick={() => cancelBroadcast.mutate(broadcast.id)}
                        >
                          <X className="h-4 w-4" />
                        </CommandIconButton>
                      )}

                      {broadcast.status === 'draft' && (
                        <CommandIconButton
                          label="Delete draft"
                          variant="danger"
                          className="h-8 w-8"
                          onClick={() => {
                            if (confirm('Delete this broadcast?')) {
                              deleteBroadcast.mutate(broadcast.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </CommandIconButton>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CommandSection>
      )}

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
        <DialogContent className="max-w-lg border-white/10 bg-[#0a0a0c]">
          <DialogHeader>
            <DialogTitle>
              {editingBroadcast ? 'Edit Broadcast' : 'Create Broadcast'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <Field label="Title">
              <Input
                placeholder="Broadcast title"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
              />
            </Field>

            <Field label="Content">
              <Textarea
                placeholder="Broadcast message..."
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                rows={4}
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Type">
                <Select value={formType} onValueChange={setFormType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {broadcastTypes.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Priority">
                <Select value={formPriority} onValueChange={setFormPriority}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {priorities.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <Field label="Target Audience">
              <Select value={formTargetType} onValueChange={(v) => {
                setFormTargetType(v);
                setFormSegment({});
                setFormTargetUserIds([]);
                setSelectedUsers([]);
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {targetTypes.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            {formTargetType === 'segment' && (
              <CommandPanel className="space-y-4">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">Segment Criteria</p>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="verified-only"
                    checked={formSegment.is_verified === true}
                    onCheckedChange={(checked) =>
                      setFormSegment({ ...formSegment, is_verified: checked === true ? true : undefined })
                    }
                  />
                  <label htmlFor="verified-only" className="cursor-pointer text-sm text-white">
                    Verified users only
                  </label>
                </div>

                <Field label="Role">
                  <Select
                    value={formSegment.role ?? '_any'}
                    onValueChange={(v) =>
                      setFormSegment({ ...formSegment, role: v === '_any' ? undefined : v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Any role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_any">Any role</SelectItem>
                      {roles.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="Country Code">
                  <Input
                    placeholder="e.g., US, GB, DE"
                    value={formSegment.country ?? ''}
                    onChange={(e) =>
                      setFormSegment({ ...formSegment, country: e.target.value || undefined })
                    }
                    maxLength={2}
                  />
                </Field>
              </CommandPanel>
            )}

            {formTargetType === 'users' && (
              <CommandPanel className="space-y-3">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">Select Users</p>

                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <Input
                    placeholder="Search by username or email..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {userSearchResults && userSearchResults.length > 0 && (
                  <div className="divide-y divide-white/5 border border-white/10 overflow-hidden">
                    {userSearchResults.map((user) => (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => addUser(user)}
                        disabled={formTargetUserIds.includes(user.id)}
                        className={`w-full px-3 py-2 text-left text-sm transition-colors hover:bg-white/[0.05] ${
                          formTargetUserIds.includes(user.id)
                            ? 'bg-white/[0.04] text-zinc-500'
                            : ''
                        }`}
                      >
                        <span className="text-white">{user.username}</span>
                        <span className="ml-2 text-zinc-500">{user.email}</span>
                      </button>
                    ))}
                  </div>
                )}

                {selectedUsers.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedUsers.map((user) => (
                      <span
                        key={user.id}
                        className="inline-flex items-center gap-1 border border-white/15 bg-white/[0.05] px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-white"
                      >
                        {user.username}
                        <button
                          type="button"
                          onClick={() => removeUser(user.id)}
                          className="text-zinc-400 transition-colors hover:text-white"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {formTargetUserIds.length > 0 && selectedUsers.length === 0 && editingBroadcast && (
                  <p className="text-xs text-amber-300">
                    {formTargetUserIds.length} previously selected user{formTargetUserIds.length !== 1 ? 's' : ''} (search to add more)
                  </p>
                )}

                {formTargetUserIds.length > 0 && selectedUsers.length > 0 && (
                  <p className="font-mono text-xs uppercase tracking-wider text-zinc-500">
                    {formTargetUserIds.length} user{formTargetUserIds.length !== 1 ? 's' : ''} selected
                  </p>
                )}
              </CommandPanel>
            )}

            {/* Delivery Channels */}
            <Field label="Delivery Channels">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox id="channel-inapp" checked disabled />
                  <label htmlFor="channel-inapp" className="cursor-default text-sm text-zinc-300">
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
                  <label htmlFor="channel-email" className="cursor-pointer text-sm text-white">
                    Email
                  </label>
                  <span className="text-xs text-zinc-500">(via Resend)</span>
                </div>
              </div>
            </Field>

            <Field label="Schedule (optional)">
              <Input
                type="datetime-local"
                value={formScheduledAt}
                onChange={(e) => setFormScheduledAt(e.target.value)}
              />
              <p className="mt-1 text-xs text-zinc-500">
                Leave empty to save as draft
              </p>
            </Field>
          </div>
          <DialogFooter className="mt-6">
            <CommandButton
              variant="ghost"
              size="sm"
              onClick={() => {
                setCreateDialogOpen(false);
                setEditingBroadcast(null);
                resetForm();
              }}
            >
              Cancel
            </CommandButton>
            <CommandButton
              size="sm"
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
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              {editingBroadcast ? 'Save Changes' : 'Create'}
            </CommandButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stats Dialog */}
      <Dialog open={statsDialogOpen} onOpenChange={setStatsDialogOpen}>
        <DialogContent className="border-white/10 bg-[#0a0a0c]">
          <DialogHeader>
            <DialogTitle>Broadcast Statistics</DialogTitle>
          </DialogHeader>
          {loadingStats ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
            </div>
          ) : stats ? (
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="border border-white/10 bg-white/[0.025] p-4">
                <p className="font-mono text-2xl font-black tabular-nums text-white">{stats.total_recipients}</p>
                <p className="mt-1 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">Total Recipients</p>
              </div>
              <div className="border border-white/10 bg-white/[0.025] p-4">
                <p className="font-mono text-2xl font-black tabular-nums text-white">{stats.delivered_count}</p>
                <p className="mt-1 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">Delivered</p>
              </div>
              <div className="border border-white/10 bg-white/[0.025] p-4">
                <p className="font-mono text-2xl font-black tabular-nums text-zinc-400">{stats.read_count}</p>
                <p className="mt-1 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">Read</p>
              </div>
              <div className="border border-white/10 bg-white/[0.025] p-4">
                <p className="font-mono text-2xl font-black tabular-nums text-red-300">{stats.failed_count}</p>
                <p className="mt-1 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">Failed</p>
              </div>
              <div className="col-span-2 border border-white/10 bg-white/[0.025] p-4">
                <div className="flex items-center justify-between">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">Read Rate</p>
                  <p className="font-mono text-2xl font-black tabular-nums text-white">{stats.read_rate}%</p>
                </div>
                <div className="mt-2 h-2 overflow-hidden bg-white/10">
                  <div
                    className="h-full bg-rose-500"
                    style={{ width: `${stats.read_rate}%` }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <p className="py-8 text-center text-zinc-500">No statistics available</p>
          )}
          <DialogFooter>
            <CommandButton variant="ghost" size="sm" onClick={() => setStatsDialogOpen(false)}>
              Close
            </CommandButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPage>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">{label}</p>
      {children}
    </div>
  );
}
