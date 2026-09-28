/**
 * BrandingPanel.tsx
 *
 * Configuration panel for tournament branding.
 * Banner image and logo upload via existing ImageUploader.
 */

import { useState, useEffect, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import {
  CommandHeader,
  CommandSection,
  CommandActionBar,
  CommandButton,
} from '@/components/management/CommandSurface';
import { Label } from '@/components/ui/label';
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
  });

  useEffect(() => {
    setForm({
      bannerUrl: tournament.banner_url ?? null,
      logoUrl: tournament.logo_url ?? null,
    });
  }, [tournament.id, tournament.updated_at]);

  const isDirty =
    (form.bannerUrl || null) !== (tournament.banner_url || null) ||
    (form.logoUrl || null) !== (tournament.logo_url || null);

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
      });
      toast({ title: 'Branding saved' });
      onSave();
    } catch (err: any) {
      toast({ title: 'Save failed', description: err.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }, [isDirty, saving, form, tournament.id, toast, onSave]);

  return (
    <>
      <CommandHeader
        eyebrow="CONFIGURATION"
        title="Branding"
        description="Tournament banner image and logo for listings and pages."
      />

      <CommandSection>
        <div className="space-y-8">
          {/* Banner */}
          <div className="space-y-3">
            <Label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Banner Image
            </Label>
            <p className="text-xs text-zinc-500">
              Displayed as the background of your tournament card and page header. Recommended 1920×480px.
            </p>
            <div className={isFieldLocked('banner_url') ? 'pointer-events-none opacity-50' : ''}>
              <ImageUploader
                value={form.bannerUrl ?? ''}
                onChange={(url) => setForm((s) => ({ ...s, bannerUrl: url || null }))}
                aspectRatio="banner"
                label="Tournament Banner"
                helperText=""
                bucket="system.assets.website"
                folder={`Tournament-card-banners/${organizerName}`}
                customFileName={tournamentName}
                useTimestamp={false}
              />
            </div>
          </div>

          {/* Logo */}
          <div className="space-y-3">
            <Label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Tournament Logo / Thumbnail
            </Label>
            <p className="text-xs text-zinc-500">
              Square image shown in tournament listings. Recommended 256×256px.
            </p>
            <div className={isFieldLocked('logo_url') ? 'pointer-events-none opacity-50' : ''}>
              <ImageUploader
                value={form.logoUrl ?? ''}
                onChange={(url) => setForm((s) => ({ ...s, logoUrl: url || null }))}
                aspectRatio="logo"
                label="Tournament Logo"
                helperText=""
                bucket="system.assets.website"
                folder={`Tournament-logos/${organizerName}`}
                customFileName={`${tournamentName}-logo`}
                useTimestamp={false}
              />
            </div>
          </div>
        </div>
      </CommandSection>

      <CommandActionBar>
        <div className="flex items-center gap-3">
          {isDirty && <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />}
          <CommandButton
            onClick={handleSave}
            disabled={!isDirty || saving}
            variant="primary"
            size="sm"
            slide
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Changes'}
          </CommandButton>
        </div>
      </CommandActionBar>
    </>
  );
}
