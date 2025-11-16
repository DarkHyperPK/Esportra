import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { MessageSquare, Upload, AlertCircle, X } from 'lucide-react';

interface DisputeSubmissionProps {
  tournamentId: string;
  tournamentName: string;
  teamId?: string | null;
  matchId?: string | null;
  onClose?: () => void;
}

const DisputeSubmission: React.FC<DisputeSubmissionProps> = ({
  tournamentId,
  tournamentName,
  teamId,
  matchId,
  onClose,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: 'Evidence file must be less than 5MB',
          variant: 'destructive',
        });
        return;
      }
      if (!file.type.startsWith('image/')) {
        toast({
          title: 'Invalid file type',
          description: 'Please upload an image file',
          variant: 'destructive',
        });
        return;
      }
      setEvidenceFile(file);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast({
        title: 'Title required',
        description: 'Please enter a dispute title',
        variant: 'destructive',
      });
      return;
    }

    if (!description.trim()) {
      toast({
        title: 'Description required',
        description: 'Please describe your dispute',
        variant: 'destructive',
      });
      return;
    }

    if (!user?.id) {
      toast({
        title: 'Authentication required',
        description: 'Please log in to submit a dispute',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      let evidenceUrl: string | null = null;

      // Upload evidence if provided
      if (evidenceFile) {
        setUploading(true);
        const fileExt = evidenceFile.name.split('.').pop();
        const fileName = `${tournamentId}/${user.id}-${Date.now()}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('tournament-screenshots')
          .upload(fileName, evidenceFile, { upsert: false });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('tournament-screenshots')
          .getPublicUrl(fileName);

        evidenceUrl = urlData.publicUrl;
        setUploading(false);
      }

      // Create dispute
      const { data, error } = await supabase
        .from('tournament_disputes')
        .insert({
          tournament_id: tournamentId,
          match_id: matchId || null,
          raised_by_user_id: user.id,
          team_id: teamId || null,
          title: title.trim(),
          description: description.trim(),
          evidence_url: evidenceUrl,
          status: 'open',
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Dispute submitted',
        description: 'Your dispute has been submitted. Organizers will review it shortly.',
      });

      // Reset form
      setTitle('');
      setDescription('');
      setEvidenceFile(null);
      
      onClose?.();
    } catch (error: any) {
      console.error('Error submitting dispute:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit dispute',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  };

  return (
    <Card className="bg-gaming-dark border-gaming-gray/30">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-blue-500" />
            Raise a Dispute
          </CardTitle>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="tournament-name">Tournament</Label>
          <Input
            id="tournament-name"
            value={tournamentName}
            disabled
            className="bg-gaming-gray/20 border-gaming-gray/50 text-gray-400"
          />
        </div>

        <div>
          <Label htmlFor="dispute-title">
            Title <span className="text-red-500">*</span>
          </Label>
          <Input
            id="dispute-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Brief summary of your dispute"
            className="bg-gaming-gray/20 border-gaming-gray/50 text-white"
            maxLength={200}
          />
        </div>

        <div>
          <Label htmlFor="dispute-description">
            Description <span className="text-red-500">*</span>
          </Label>
          <Textarea
            id="dispute-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the issue in detail. Include what happened, when it occurred, and any relevant information."
            className="bg-gaming-gray/20 border-gaming-gray/50 text-white min-h-[120px]"
            maxLength={2000}
          />
          <p className="text-xs text-gray-400 mt-1">{description.length}/2000 characters</p>
        </div>

        <div>
          <Label htmlFor="evidence-file">
            Evidence (Optional)
          </Label>
          <div className="mt-2">
            <Input
              id="evidence-file"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="bg-gaming-gray/20 border-gaming-gray/50 text-white"
            />
            <p className="text-xs text-gray-400 mt-1">
              Upload screenshots or images as evidence (max 5MB, images only)
            </p>
            {evidenceFile && (
              <div className="mt-2 flex items-center gap-2 text-sm text-gray-300">
                <Upload className="h-4 w-4" />
                <span>{evidenceFile.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEvidenceFile(null)}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="bg-yellow-600/10 border border-yellow-500/30 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-yellow-400 mt-0.5" />
            <div className="text-xs text-yellow-300">
              <strong>Note:</strong> Disputes are reviewed by tournament organizers. Please provide clear and accurate information. False reports may result in penalties.
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          {onClose && (
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
          )}
          <Button
            onClick={handleSubmit}
            disabled={submitting || uploading || !title.trim() || !description.trim()}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
          >
            {uploading ? 'Uploading...' : submitting ? 'Submitting...' : 'Submit Dispute'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default DisputeSubmission;

