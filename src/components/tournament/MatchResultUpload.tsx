import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

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
  const [files, setFiles] = useState<File[]>([]);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length + files.length > 5) {
      toast({ title: 'Too many files', description: 'Maximum 5 images allowed.', variant: 'destructive' });
      return;
    }
    setFiles([...files, ...selectedFiles]);
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

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
    if (files.length === 0) {
      toast({ title: 'File required', description: 'Please attach at least one screenshot/photo.' });
      return;
    }
    if (!matchId || !teamId) {
      toast({ title: 'Missing match', description: 'Open the upload from a specific match box in the bracket.', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      // Upload all images to storage bucket `tournament-results`
      const imageUrls: string[] = [];
      for (const file of files) {
        const path = `${tournamentId}/${user.id}-${Date.now()}-${Math.random().toString(36).substring(7)}-${file.name}`;
        const { data: up, error: upErr } = await supabase.storage.from('tournament-results').upload(path, file, { upsert: false });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from('tournament-results').getPublicUrl(path);
        imageUrls.push(pub.publicUrl);
      }

      const { error: insErr } = await supabase.from('tournament_match_results').insert({
        tournament_id: tournamentId,
        match_id: matchId,
        team_id: teamId,
        reporter_user_id: user.id,
        image_url: imageUrls.length === 1 ? imageUrls[0] : imageUrls, // Support both single URL and array
        comment,
        status: 'pending'
      });
      if (insErr) throw insErr;
      toast({ title: 'Submitted', description: `${files.length} image(s) uploaded. Awaiting organizer review.` });
      setFiles([]); setComment('');
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
        <div>
          <label 
            className={cn(
              "flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg bg-gray-900/50 transition-colors",
              files.length >= 5 
                ? "border-gray-600 cursor-not-allowed opacity-50" 
                : "border-gaming-purple/50 cursor-pointer hover:bg-gray-900/70 hover:border-gaming-purple"
            )}
          >
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <svg className={cn("w-10 h-10 mb-3", files.length >= 5 ? "text-gray-500" : "text-gaming-purple")} aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a2 2 0 0 0 2-2V3a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h3m-3-4h8m-4-4h.01M9 11h6"/>
              </svg>
              <p className="mb-2 text-sm text-gray-300">
                {files.length >= 5 ? (
                  <span className="font-semibold text-gray-500">Maximum 5 images reached</span>
                ) : (
                  <>
                    <span className="font-semibold text-gaming-purple">Click to upload</span> or drag and drop
                  </>
                )}
              </p>
              <p className="text-xs text-gray-400">PNG, JPG, WEBP (MAX 5 images)</p>
            </div>
            <input 
              type="file" 
              accept="image/*" 
              multiple 
              onChange={handleFileChange}
              disabled={files.length >= 5}
              className="hidden"
            />
          </label>
          <p className="text-xs text-gray-400 mt-2 text-center">
            {files.length}/5 images selected
          </p>
        </div>
        
        {files.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-white font-medium">Selected Images:</p>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {files.map((file, index) => (
                <div key={index} className="flex items-center justify-between bg-gray-800/50 rounded px-2 py-1.5">
                  <span className="text-xs text-gray-300 truncate flex-1">{file.name}</span>
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="ml-2 text-red-400 hover:text-red-300 text-xs font-medium"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <Textarea placeholder="Add a short comment (optional)" value={comment} onChange={(e) => setComment(e.target.value)} />
        <div className="text-right">
          <Button disabled={submitting || files.length === 0} onClick={onSubmit} className="bg-gaming-purple hover:bg-gaming-purple/80 disabled:opacity-50 disabled:cursor-not-allowed">
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


