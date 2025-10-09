import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

type Dispute = {
  id: string;
  match_id: string;
  reporter_id: string;
  reported_id: string;
  status: 'open'|'resolved'|'rejected';
  reason: string;
  created_at: string;
};

const DisputeCenter: React.FC = () => {
  const { toast } = useToast();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('disputes').select('*').order('created_at', { ascending: false });
    setDisputes((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const resolve = async (status: 'resolved'|'rejected') => {
    if (!selectedId) return;
    try {
      const { error } = await supabase.from('disputes').update({ status }).eq('id', selectedId);
      if (error) throw error;
      // audit
      await supabase.from('audit_logs').insert({ action_type: 'dispute:'+status, target_type: 'dispute', target_id: selectedId, target_name: selectedId, details: { note } });
      toast({ title: 'Updated', description: `Dispute ${status}` });
      setNote('');
      setSelectedId(null);
      load();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Failed', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4">
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader><CardTitle className="text-white">Dispute Center</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-gray-400">Loading...</div>
          ) : disputes.length === 0 ? (
            <div className="text-gray-400">No disputes</div>
          ) : (
            <div className="space-y-3">
              {disputes.map(d => (
                <div key={d.id} className={`p-3 rounded border ${selectedId===d.id? 'border-blue-500':'border-gray-700'} bg-gray-900`}
                     onClick={() => setSelectedId(d.id)}>
                  <div className="flex justify-between items-center">
                    <div className="text-white font-medium">Match {d.match_id}</div>
                    <Badge className={d.status==='open'? 'bg-yellow-600':'bg-green-600'}>{d.status}</Badge>
                  </div>
                  <div className="text-gray-400 text-sm mt-1">{d.reason}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedId && (
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader><CardTitle className="text-white">Resolution</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Textarea value={note} onChange={(e)=>setNote(e.target.value)} placeholder="Resolution note" className="bg-gray-700 border-gray-600 text-white" />
            <div className="flex gap-2">
              <Button onClick={()=>resolve('resolved')} className="bg-green-600 hover:bg-green-700 text-white">Resolve</Button>
              <Button onClick={()=>resolve('rejected')} variant="outline" className="border-red-600 text-red-400 hover:bg-red-600/10">Reject</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DisputeCenter;


