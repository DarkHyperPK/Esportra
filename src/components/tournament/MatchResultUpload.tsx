import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface Props {
  tournamentId: string;
  matchId?: string;
  teamId?: string;
  isCaptain: boolean;
  onSuccess?: () => void;
}

const MatchResultUpload: React.FC<Props> = ({ tournamentId, matchId, teamId, isCaptain, onSuccess }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    console.log('Submit clicked:', { userId: user?.id, isCaptain, user: !!user });
    if (!user) {
      toast({ title: 'Not allowed', description: 'Please log in to submit results.', variant: 'destructive' });
      return;
    }
    if (!isCaptain) {
      toast({ title: 'Not allowed', description: 'Only team captains can submit results. If you are the captain, please refresh the page.', variant: 'destructive' });
      return;
    }
    if (!file) {
      toast({ title: 'File required', description: 'Please attach a screenshot/photo.' });
      return;
    }
    if (!matchId || !teamId) {
      toast({ title: 'Missing match', description: 'Open the upload from a specific match box in the bracket.', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      // Upload image to storage bucket `tournament-results`
      const path = `${tournamentId}/${user.id}-${Date.now()}-${file.name}`;
      const { data: up, error: upErr } = await supabase.storage.from('tournament-results').upload(path, file, { upsert: false });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from('tournament-results').getPublicUrl(path);

      const { error: insErr } = await supabase.from('tournament_match_results').insert({
        tournament_id: tournamentId,
        match_id: matchId,
        team_id: teamId,
        reporter_user_id: user.id,
        image_url: pub.publicUrl,
        comment,
        status: 'pending'
      });
      if (insErr) throw insErr;
      toast({ title: 'Submitted', description: 'Result uploaded. Awaiting organizer review.' });
      setFile(null); setComment('');
      // Close the modal by calling onSuccess callback
      if (onSuccess) {
        onSuccess();
      }
    } catch (e: any) {
      console.error('Result submit failed:', e);
      toast({ title: 'Upload failed', description: e?.message || 'Could not submit.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-gaming-dark border border-gaming-gray/30 rounded-xl p-4">
      <h3 className="text-white font-semibold mb-3">Upload Match Result (Captain only)</h3>
      <div className="space-y-3">
        <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} className="block w-full text-sm" />
        <Textarea placeholder="Add a short comment (optional)" value={comment} onChange={(e) => setComment(e.target.value)} />
        <div className="text-right">
          <Button disabled={submitting} onClick={onSubmit} className="bg-gaming-purple hover:bg-gaming-purple/80 disabled:opacity-50 disabled:cursor-not-allowed">
            {submitting ? 'Submitting...' : 'Submit Result'}
          </Button>
        </div>
        {!isCaptain && (
          <p className="text-xs text-amber-400 mt-2">⚠️ Only the team captain can submit results. Contact your team captain if you need to submit a result.</p>
        )}
      </div>
    </div>
  );
};

export default MatchResultUpload;


