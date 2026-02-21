import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';

function getTournamentStatus(tournament: any) {
  if (tournament.finished) return 'Completed';
  const now = new Date();
  const start = new Date(`${tournament.date}T${tournament.time}`);
  if (now < start) return 'Upcoming';
  return 'Live';
}

const TournamentDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tournament, setTournament] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  const fetchTournament = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('tournaments')
      .select('*')
      .eq('id', id)
      .single();
    if (error) {
      toast({ title: 'Error', description: 'Failed to fetch tournament.' });
      setLoading(false);
      return;
    }
    setTournament(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchTournament();
  }, [id]);

  const handleMarkFinished = async () => {
    const { error } = await supabase.from('tournaments').update({ finished: true }).eq('id', id);
    if (error) {
      toast({ title: 'Error', description: 'Failed to mark as finished.' });
      return;
    }

    // Create audit log
    const { error: auditError } = await supabase
      .from('audit_logs')
      .insert({
        action: 'tournament_finished',
        user_id: user?.id || null,
        target_type: 'tournament',
        target_id: id,
        details: {
          tournament_name: tournament.name,
          tournament_id: id,
          finished_by: user?.id || 'system'
        }
      });

    if (auditError) {
      console.error('Failed to create audit log:', auditError);
    }

    toast({ title: 'Tournament marked as finished.' });
    await fetchTournament();
  };

  const handleDelete = async () => {
    await supabase.from('tournaments').delete().eq('id', id);
    toast({ title: 'Tournament deleted.' });
    navigate('/admin');
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
