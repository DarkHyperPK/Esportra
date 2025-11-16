import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';

interface Dispute {
  id: string;
  tournament_id: string;
  match_id: string | null;
  raised_by_user_id: string;
  team_id: string | null;
  title: string;
  description: string | null;
  evidence_url: string | null;
  status: 'open' | 'in_review' | 'resolved' | 'rejected';
  assigned_to_user_id: string | null;
  created_at: string;
}

const OrganizerDisputesPage: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      // fetch disputes for tournaments owned by organizer
      const { data, error } = await supabase
        .from('tournament_disputes')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setDisputes(data || []);
    } catch (e: any) {
      console.error('Load disputes failed:', e);
      toast({ title: 'Failed to load disputes', description: e?.message || '' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (id: string, status: Dispute['status']) => {
    try {
      const { error } = await supabase
        .from('tournament_disputes')
        .update({ status, resolution_notes: notes[id] || null, assigned_to_user_id: user?.id || null })
        .eq('id', id);
      if (error) throw error;
      toast({ title: 'Updated', description: `Dispute marked ${status}` });
      await load();
    } catch (e: any) {
      toast({ title: 'Update failed', description: e?.message || '', variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen bg-esports-dark text-white">
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold">Disputes</h1>
            <Button variant="outline" className="border-gaming-gray/30" onClick={load}>Refresh</Button>
          </div>

          {loading ? (
            <p className="text-gray-400">Loading...</p>
          ) : disputes.length === 0 ? (
            <div className="border border-gaming-gray/30 rounded-xl bg-gaming-dark/60 p-6 text-center text-gray-300">No disputes yet.</div>
          ) : (
            <div className="space-y-4">
              {disputes.map(d => (
                <div key={d.id} className="bg-gaming-dark border border-gaming-gray/30 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-white font-semibold">{d.title}</div>
                      <div className="text-xs text-gray-400">Tournament: {d.tournament_id} • Status: {d.status}</div>
                    </div>
                    {d.evidence_url && <a className="text-gaming-blue text-sm" href={d.evidence_url} target="_blank">View evidence</a>}
                  </div>
                  {d.description && <p className="text-gray-300 text-sm mt-2">{d.description}</p>}
                  <div className="mt-3">
                    <Textarea placeholder="Resolution notes" value={notes[d.id] || ''} onChange={e => setNotes({ ...notes, [d.id]: e.target.value })} />
                  </div>
                  <div className="flex gap-2 justify-end mt-3">
                    <Button variant="outline" className="border-gaming-gray/30" onClick={() => updateStatus(d.id, 'in_review')}>In review</Button>
                    <Button className="bg-emerald-600 hover:bg-emerald-500" onClick={() => updateStatus(d.id, 'resolved')}>Resolve</Button>
                    <Button className="bg-red-600 hover:bg-red-500" onClick={() => updateStatus(d.id, 'rejected')}>Reject</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default OrganizerDisputesPage;


