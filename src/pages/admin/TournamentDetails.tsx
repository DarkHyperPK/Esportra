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

function getTournamentStatus(tournament: any) {
  // Use the DB status directly
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

  const fetchTournament = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient.get<any>(`/api/tournaments/${id}`);
      const data = response?.tournament || response;
      setTournament(data);
    } catch {
      toast({ title: 'Error', description: 'Failed to fetch tournament.' });
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void fetchTournament();
  }, [fetchTournament]);

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
