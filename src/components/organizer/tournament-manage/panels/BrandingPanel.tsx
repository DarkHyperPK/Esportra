/**
 * BrandingPanel.tsx
 *
 * Configuration panel for tournament branding.
 * Banner image and logo upload via existing ImageUploader.
 */

import { useState, useEffect, useCallback } from 'react';
import { CommandHeader, CommandSection } from '@/components/management/CommandSurface';
import { Input } from '@/components/ui/input';
import { CONTROL_CLASS, Field, FORM_MEASURE_CLASS } from '@/components/ui/kit';
import { cn } from '@/lib/utils';
import { PanelSaveBar } from '../PanelSaveBar';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/lib/apiClient';
import ImageUploader from '@/components/tournament/wizard/ImageUploader';
import { useDirtyState } from '@/components/organizer/tournament-manage/TournamentDashboardShell';
import type { DashboardTournament } from '@/hooks/useTournamentDashboard';

interface BrandingPanelProps {
  tournament: DashboardTournament;
  editableFields: Set<string>;
  onSave: () => void;
}

interface FormState {
  bannerUrl: string | null;
  logoUrl: string | null;
  streamUrl: string;
}

export function BrandingPanel({ tournament, editableFields, onSave }: BrandingPanelProps) {
  const { toast } = useToast();
  const { profile } = useAuth();
  const { setDirty } = useDirtyState();
  const [saving, setSaving] = useState(false);

  const sanitize = (str: string) =>
    str
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

  const organizerName = sanitize(profile?.username || profile?.full_name || 'unknown-organizer');
  const tournamentName = sanitize(tournament.name || 'unnamed-tournament');

  const [form, setForm] = useState<FormState>({
    bannerUrl: tournament.banner_url ?? null,
    logoUrl: tournament.logo_url ?? null,
    streamUrl: tournament.stream_url || '',
  });

  const resetForm = () => setForm({
    bannerUrl: tournament.banner_url ?? null,
    logoUrl: tournament.logo_url ?? null,
    streamUrl: tournament.stream_url || '',
  });

  useEffect(() => {
    resetForm();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournament.id, tournament.updated_at]);

  const isDirty =
    (form.bannerUrl || null) !== (tournament.banner_url || null) ||
    (form.logoUrl || null) !== (tournament.logo_url || null) ||
    form.streamUrl !== (tournament.stream_url || '');

  useEffect(() => {
    setDirty(isDirty);
    return () => setDirty(false);
  }, [isDirty, setDirty]);

  const isFieldLocked = (field: string) => !editableFields.has('*') && !editableFields.has(field);

  const handleSave = useCallback(async () => {
    if (!isDirty || saving) return;
    setSaving(true);
    try {
      await apiClient.put(`/api/tournaments/${tournament.id}`, {
        bannerUrl: form.bannerUrl || null,
        logoUrl: form.logoUrl || null,
        streamUrl: form.streamUrl.trim() || undefined,
      });
      toast({ title: 'Saved', description: 'The new look is live on your tournament page.' });
      onSave();
    } catch (err: any) {
      toast({ title: "Couldn't save", description: err.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }, [isDirty, saving, form, tournament.id, toast, onSave]);

  const lockNote = 'Locked once the tournament is live.';

  return (
    <>
      <CommandHeader
        eyebrow="Configure"
        title="Branding"
        description="The banner and logo players see in listings and on your tournament page, plus your stream."
      />

      <CommandSection>
        <div className={cn(FORM_MEASURE_CLASS, 'space-y-8')}>
          <Field label="Banner" hint="1920 × 480 px works best. Keep text away from the edges; phones crop them." lockedReason={isFieldLocked('banner_url') ? lockNote : undefined}>
            <div className={cn('max-w-lg', isFieldLocked('banner_url') && 'pointer-events-none opacity-50')}>
              <ImageUploader
                value={form.bannerUrl ?? ''}
                onChange={(url) => setForm((s) => ({ ...s, bannerUrl: url || null }))}
                aspectRatio="banner"
                label="Tournament banner"
                helperText=""
                bucket="system.assets.website"
                folder={`Tournament-card-banners/${organizerName}`}
                customFileName={tournamentName}
                useTimestamp={false}
              />
            </div>
          </Field>

          <Field label="Logo" hint="Square, 256 × 256 px. Used in the dashboard header and small listings." lockedReason={isFieldLocked('logo_url') ? lockNote : undefined}>
            <div className={isFieldLocked('logo_url') ? 'pointer-events-none opacity-50' : ''}>
              <ImageUploader
                value={form.logoUrl ?? ''}
                onChange={(url) => setForm((s) => ({ ...s, logoUrl: url || null }))}
                aspectRatio="logo"
                label="Tournament logo"
                helperText=""
                bucket="system.assets.website"
                folder={`Tournament-logos/${organizerName}`}
                customFileName={`${tournamentName}-logo`}
                useTimestamp={false}
              />
            </div>
          </Field>

          <Field label="Stream link" htmlFor="br-stream" optional hint="Twitch, YouTube or Kick. Shown on the tournament page while matches are live." lockedReason={isFieldLocked('stream_url') ? lockNote : undefined}>
            <Input id="br-stream" value={form.streamUrl} onChange={(e) => setForm((s) => ({ ...s, streamUrl: e.target.value }))}
              disabled={isFieldLocked('stream_url')} placeholder="https://twitch.tv/yourchannel" className={cn(CONTROL_CLASS, 'max-w-md')} />
          </Field>
        </div>
      </CommandSection>

      <PanelSaveBar isDirty={isDirty} saving={saving} onSave={handleSave} onDiscard={resetForm} />
    </>
  );
}
