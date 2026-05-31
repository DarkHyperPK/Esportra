import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '@/lib/apiClient';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { auditLog } from '@/lib/auditLog';

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

  if (loading) return <div className="p-8 text-white">Loading...</div>;
  if (!tournament) return <div className="p-8 text-white">Tournament not found.</div>;

  return (
    <div className="min-h-screen bg-[#18181b] text-white p-8">
      <h1 className="text-3xl font-bold mb-4">Tournament Details</h1>
      <div className="mb-2"><b>Name:</b> {tournament.name}</div>
      <div className="mb-2"><b>Date:</b> {tournament.date}</div>
      <div className="mb-2"><b>Time:</b> {tournament.time}</div>
      <div className="mb-2"><b>Status:</b> {getTournamentStatus(tournament)}</div>
      <div className="mb-2"><b>ID:</b> {tournament.id}</div>
      <div className="mb-2"><b>Description:</b> {tournament.description}</div>
      <div className="mb-2"><b>Game:</b> {tournament.game}</div>
      <div className="mb-2"><b>Venue:</b> {tournament.venue}</div>
      <div className="mb-2"><b>Prize Pool:</b> {tournament.prize_pool}</div>
      <div className="mb-2"><b>Entry Fee:</b> {tournament.entry_fee}</div>
      <div className="mb-2"><b>Max Participants:</b> {tournament.max_participants}</div>
      <div className="mb-2"><b>Created At:</b> {tournament.created_at}</div>
      <div className="mb-2"><b>Updated At:</b> {tournament.updated_at}</div>
      {!tournament.finished && (
        <Button className="mt-4 mr-2" variant="destructive" onClick={handleMarkFinished}>
          Mark as Finished
        </Button>
      )}
      <Button className="mt-4" variant="destructive" onClick={handleDelete}>
        Delete Tournament
      </Button>
    </div>
  );
};

export default TournamentDetails; 
