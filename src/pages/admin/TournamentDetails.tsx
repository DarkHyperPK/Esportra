import { useEffect, useState, useCallback, type ReactNode } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '@/lib/apiClient';
import { toast } from '@/components/ui/use-toast';
import { auditLog } from '@/lib/auditLog';
import { formatCurrency } from '@/utils/formatCurrency';
import { AdminPage } from '@/components/admin/AdminPage';
import {
  CommandButton,
  CommandPanel,
  CommandSection,
} from '@/components/management/CommandSurface';
import { Input } from '@/components/ui/input';
import { CONTROL_CLASS, EYEBROW_CLASS, StatusPill } from '@/components/ui/kit';
import { cn } from '@/lib/utils';

function getTournamentStatus(tournament: any) {
  const status = tournament.status || 'draft';
  const labels: Record<string, string> = {
    draft: 'Draft',
    published: 'Published',
    open: 'Open',
    closed: 'Closed',
    ongoing: 'Live',
    completed: 'Completed',
    cancelled: 'Cancelled',
  };
  return labels[status] || status;
}

const TournamentDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tournament, setTournament] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [participants, setParticipants] = useState<any[]>([]);
  const [bans, setBans] = useState<any[]>([]);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', prizePool: '', maxTeams: '', startDate: '' });
  const [saving, setSaving] = useState(false);
  const [orgProBusy, setOrgProBusy] = useState(false);
  const [hasOrganizerPro, setHasOrganizerPro] = useState(false);

  const fetchTournament = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient.get<any>(`/api/admin/tournaments/${id}`);
      const data = response?.tournament || response;
      setTournament(data);
      setParticipants(response?.participants || data?.participants || []);
      setEditForm({
        name: data.name || '',
        prizePool: data.prize_pool?.toString() || '0',
        maxTeams: data.max_teams?.toString() || '',
        startDate: data.start_date ? new Date(data.start_date).toISOString().slice(0, 16) : '',
      });
    } catch {
      toast({ title: 'Error', description: 'Failed to fetch tournament.' });
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchParticipants = useCallback(async () => {
    try {
      const resp = await apiClient.get<any>(`/api/tournaments/${id}`);
      setParticipants(resp?.participants || []);
    } catch { /* silent */ }
  }, [id]);

  const fetchBans = useCallback(async () => {
    try {
      const resp = await apiClient.get<any[]>(`/api/tournaments/${id}/bans`);
      setBans(Array.isArray(resp) ? resp : []);
    } catch { /* silent */ }
  }, [id]);

  const fetchOrganizerPro = useCallback(async () => {
    try {
      const resp = await apiClient.get<{ hasOrganizerPro: boolean }>(`/api/admin/tournaments/${id}/organizer-pro`);
      setHasOrganizerPro(resp?.hasOrganizerPro ?? false);
    } catch { /* silent — may not exist yet */ }
  }, [id]);

  useEffect(() => {
    void fetchTournament();
    void fetchParticipants();
    void fetchBans();
    void fetchOrganizerPro();
  }, [fetchTournament, fetchParticipants, fetchBans, fetchOrganizerPro]);

  const handleMarkFinished = async () => {
    try {
      await apiClient.put(`/api/tournaments/${id}`, { finished: true });
      await auditLog.log('update', 'tournament', id!, tournament?.name || 'Unknown', {
        action: 'marked_finished',
        tournament_id: id,
      });
      toast({ title: 'Tournament marked as finished.' });
      await fetchTournament();
    } catch {
      toast({ title: 'Error', description: 'Failed to mark as finished.' });
    }
  };

  const handleDelete = async () => {
    const name = tournament?.name || 'Unknown';
    try {
      await apiClient.delete(`/api/tournaments/${id}`);
      await auditLog.log('delete', 'tournament', id!, name, { deleted_from: 'admin_details' });
      toast({ title: 'Tournament deleted.' });
      navigate('/admin');
    } catch {
      toast({ title: 'Error', description: 'Failed to delete tournament.' });
    }
  };

  const handleSaveFields = async () => {
    setSaving(true);
    try {
      await apiClient.put(`/api/admin/tournaments/${id}`, {
        name: editForm.name.trim() || undefined,
        prizePool: editForm.prizePool ? parseFloat(editForm.prizePool) : undefined,
        maxTeams: editForm.maxTeams ? parseInt(editForm.maxTeams, 10) : undefined,
        startDate: editForm.startDate ? new Date(editForm.startDate).toISOString() : undefined,
      });
      toast({ title: 'Saved', description: 'Tournament fields updated.' });
      setEditing(false);
      await fetchTournament();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to save.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleOrganizerPro = async (enable: boolean) => {
    setOrgProBusy(true);
    try {
      await apiClient.post(`/api/admin/tournaments/${id}/organizer-pro`, { enabled: enable });
      await auditLog.log('update', 'tournament', id!, tournament?.name || 'Unknown', {
        action: enable ? 'organizer_pro_enabled' : 'organizer_pro_disabled',
      });
      toast({ title: enable ? 'Organizer Pro enabled' : 'Organizer Pro disabled' });
      await fetchOrganizerPro();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to update.', variant: 'destructive' });
    } finally {
      setOrgProBusy(false);
    }
  };

  const handleLiftBan = async (banId: string) => {
    try {
      await apiClient.delete(`/api/admin/tournaments/${id}/bans/${banId}`);
      toast({ title: 'Ban lifted', description: 'Participant has been unbanned.' });
      await fetchBans();
      await fetchParticipants();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to lift ban.', variant: 'destructive' });
    }
  };

  const handleRestoreParticipant = async (pid: string) => {
    try {
      await apiClient.patch(`/api/admin/tournaments/${id}/participants/${pid}/restore`, {});
      toast({ title: 'Restored', description: 'Participant has been re-admitted.' });
      await fetchParticipants();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to restore.', variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <AdminPage eyebrow="Content" title="Tournament Details">
        <CommandSection className="font-mono text-xs uppercase tracking-widest text-zinc-500">
          Loading...
        </CommandSection>
      </AdminPage>
    );
  }

  if (!tournament) {
    return (
      <AdminPage eyebrow="Content" title="Tournament Details">
        <CommandSection className="text-sm text-zinc-400">Tournament not found.</CommandSection>
      </AdminPage>
    );
  }

  const rows: [string, ReactNode][] = [
    ['Name', tournament.name],
    ['Organizer', tournament.organizer_name || '—'],
    ['Date', tournament.date],
    ['Time', tournament.time],
    [
      'Status',
      <span key="status" className="border border-white/25 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-white">
        {getTournamentStatus(tournament)}
      </span>,
    ],
    ['ID', <span key="id" className="font-mono text-xs">{tournament.id}</span>],
    ['Description', tournament.description],
    ['Game', tournament.game],
    ['Venue', tournament.venue],
    ['Prize Pool', formatCurrency(parseFloat(tournament.prize_pool || '0'), tournament.currency)],
    [
      'Entry Fee',
      tournament.entry_fee ? formatCurrency(parseFloat(tournament.entry_fee), tournament.currency) : 'Free',
    ],
    ['Max Participants', String(tournament.max_participants ?? '')],
    ['Created At', <span key="created" className="font-mono text-xs">{tournament.created_at}</span>],
    ['Updated At', <span key="updated" className="font-mono text-xs">{tournament.updated_at}</span>],
  ];

  const statusPill = (status: string) => {
    if (status === 'disqualified') return <StatusPill label="Disqualified" tone="critical" />;
    if (status === 'approved' || status === 'registered' || status === 'checked_in') return <StatusPill label={status.replace('_', ' ')} tone="success" />;
    if (status === 'cancelled' || status === 'rejected') return <StatusPill label={status} tone="warning" />;
    return <StatusPill label={status} tone="neutral" />;
  };

  const restorableStatuses = ['disqualified', 'rejected', 'cancelled'];

  return (
    <AdminPage
      eyebrow="Content"
      title="Tournament Details"
      description={tournament.name}
      actions={
        !tournament.finished ? (
          <CommandButton variant="warning" size="sm" onClick={handleMarkFinished}>
            Mark as Finished
          </CommandButton>
        ) : undefined
      }
    >
      {/* Info */}
      <CommandSection>
        <h2 className="mb-4 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">
          Tournament Information
        </h2>
        <div className="divide-y divide-white/5">
          {rows.map(([label, value]) => (
            <div key={label} className="flex justify-between gap-6 py-2.5 text-sm">
              <span className="shrink-0 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500 pt-0.5">
                {label}
              </span>
              <span className="truncate text-right capitalize text-white">{value || '—'}</span>
            </div>
          ))}
        </div>
      </CommandSection>

      {/* Edit Fields */}
      <CommandSection>
        <div className="flex items-center justify-between mb-4">
          <h2 className={EYEBROW_CLASS}>Edit Fields</h2>
          {!editing ? (
            <CommandButton variant="secondary" size="sm" onClick={() => setEditing(true)}>Edit</CommandButton>
          ) : (
            <div className="flex gap-2">
              <CommandButton variant="secondary" size="sm" onClick={() => setEditing(false)}>Cancel</CommandButton>
              <CommandButton variant="primary" size="sm" onClick={handleSaveFields} disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </CommandButton>
            </div>
          )}
        </div>
        {editing ? (
          <div className="grid gap-4 sm:grid-cols-2 max-w-xl">
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Name</label>
              <Input value={editForm.name} onChange={(e) => setEditForm((s) => ({ ...s, name: e.target.value }))} className={CONTROL_CLASS} />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Prize pool</label>
              <Input type="number" value={editForm.prizePool} onChange={(e) => setEditForm((s) => ({ ...s, prizePool: e.target.value }))} className={CONTROL_CLASS} />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Max teams</label>
              <Input type="number" value={editForm.maxTeams} onChange={(e) => setEditForm((s) => ({ ...s, maxTeams: e.target.value }))} className={CONTROL_CLASS} />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Start date</label>
              <Input type="datetime-local" value={editForm.startDate} onChange={(e) => setEditForm((s) => ({ ...s, startDate: e.target.value }))} className={CONTROL_CLASS} />
            </div>
          </div>
        ) : (
          <p className="text-sm text-zinc-500">Click Edit to modify tournament name, prize pool, max teams or start date.</p>
        )}
      </CommandSection>

      {/* Organizer Pro */}
      <CommandSection>
        <div className="flex items-center justify-between">
          <div>
            <h2 className={EYEBROW_CLASS}>Organizer Pro</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Unlocks veto, broadcast, Discord integration and the public veto tool for this event.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className={cn('font-mono text-[10px] font-bold uppercase tracking-[0.3em]', hasOrganizerPro ? 'text-emerald-400' : 'text-zinc-500')}>
              {hasOrganizerPro ? 'Active' : 'Inactive'}
            </span>
            {hasOrganizerPro ? (
              <CommandButton variant="warning" size="sm" disabled={orgProBusy} onClick={() => handleToggleOrganizerPro(false)}>
                {orgProBusy ? 'Saving…' : 'Revoke'}
              </CommandButton>
            ) : (
              <CommandButton variant="primary" size="sm" disabled={orgProBusy} onClick={() => handleToggleOrganizerPro(true)}>
                {orgProBusy ? 'Saving…' : 'Grant Pro'}
              </CommandButton>
            )}
          </div>
        </div>
      </CommandSection>

      {/* Participants */}
      <CommandSection>
        <h2 className={cn(EYEBROW_CLASS, 'mb-4')}>Participants ({participants.length})</h2>
        {participants.length === 0 ? (
          <p className="text-sm text-zinc-500">No participants registered.</p>
        ) : (
          <div className="overflow-hidden border border-white/[0.06]">
            <table className="w-full">
              <thead className="bg-white/[0.02]">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-zinc-500">Name</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-zinc-500">Status</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-zinc-500">Registered</th>
                  <th className="px-4 py-2.5"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {participants.map((p: any) => (
                  <tr key={p.id} className={cn('h-11 text-sm', p.status === 'disqualified' && 'opacity-50')}>
                    <td className="px-4 text-white font-medium">{p.team_name ?? p.gamer_tag ?? p.user?.username ?? '—'}</td>
                    <td className="px-4">{statusPill(p.status)}</td>
                    <td className="px-4 text-zinc-400 text-xs">{p.registered_at ? new Date(p.registered_at).toLocaleDateString() : '—'}</td>
                    <td className="px-4">
                      {restorableStatuses.includes(p.status) && (
                        <CommandButton variant="secondary" size="sm" onClick={() => handleRestoreParticipant(p.id)}>
                          Restore
                        </CommandButton>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CommandSection>

      {/* Bans */}
      <CommandSection>
        <h2 className={cn(EYEBROW_CLASS, 'mb-4')}>Bans ({bans.length})</h2>
        {bans.length === 0 ? (
          <p className="text-sm text-zinc-500">No bans on record.</p>
        ) : (
          <div className="space-y-3">
            {bans.map((ban: any) => (
              <div key={ban.id} className="flex items-center justify-between border border-white/[0.06] px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-white">{ban.user_display_name ?? ban.team_name ?? '—'}</p>
                  <p className="text-xs text-zinc-500">{ban.ban_reason || 'No reason given'}</p>
                  <p className="text-xs text-zinc-600">{ban.is_active ? 'Active' : `Lifted ${ban.lifted_at ? new Date(ban.lifted_at).toLocaleDateString() : ''}`}</p>
                </div>
                {ban.is_active && (
                  <CommandButton variant="warning" size="sm" onClick={() => handleLiftBan(ban.id)}>
                    Lift Ban
                  </CommandButton>
                )}
              </div>
            ))}
          </div>
        )}
      </CommandSection>

      {/* Danger zone */}
      <CommandPanel className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">
          Danger Zone
        </p>
        <div className="flex flex-wrap items-center gap-3">
          {!tournament.finished && (
            <CommandButton variant="warning" size="sm" onClick={handleMarkFinished}>
              Mark as Finished
            </CommandButton>
          )}
          <CommandButton variant="danger" size="sm" onClick={handleDelete}>
            Delete Tournament
          </CommandButton>
        </div>
      </CommandPanel>
    </AdminPage>
  );
};

export default TournamentDetails;
