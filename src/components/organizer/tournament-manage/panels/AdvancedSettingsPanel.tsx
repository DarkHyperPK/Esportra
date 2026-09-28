/**
 * AdvancedSettingsPanel.tsx
 *
 * Configuration panel for advanced tournament settings.
 * Discord webhook, stream URL, and other optional settings.
 */

import { useState, useEffect, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import {
  CommandHeader,
  CommandSection,
  CommandActionBar,
  CommandButton,
} from '@/components/management/CommandSurface';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/apiClient';
import { getEffectiveGameFeatures } from '@/utils/gameFeatures';
import { useDirtyState } from '@/components/organizer/tournament-manage/TournamentDashboardShell';
import type { DashboardTournament } from '@/hooks/useTournamentDashboard';

interface AdvancedSettingsPanelProps {
  tournament: DashboardTournament;
  editableFields: Set<string>;
  onSave: () => void;
}

interface FormState {
  discordWebhookUrl: string;
  streamUrl: string;
  mapVetoEnabled: boolean;
  assistedMatchReporting: boolean;
}

export function AdvancedSettingsPanel({ tournament, editableFields, onSave }: AdvancedSettingsPanelProps) {
  const { toast } = useToast();
  const { setDirty } = useDirtyState();
  const [saving, setSaving] = useState(false);

  const gameFeatures = getEffectiveGameFeatures(tournament.game || '', tournament.game_mode);
  const settings = tournament.settings ?? {};

  const [form, setForm] = useState<FormState>({
    discordWebhookUrl: settings.discordWebhookUrl || '',
    streamUrl: settings.streamUrl || '',
    mapVetoEnabled: settings.mapVetoEnabled ?? gameFeatures.mapVeto ?? false,
    assistedMatchReporting: settings.assistedMatchReporting ?? false,
  });

  useEffect(() => {
    const s = tournament.settings ?? {};
    setForm({
      discordWebhookUrl: s.discordWebhookUrl || '',
      streamUrl: s.streamUrl || '',
      mapVetoEnabled: s.mapVetoEnabled ?? gameFeatures.mapVeto ?? false,
      assistedMatchReporting: s.assistedMatchReporting ?? false,
    });
  }, [tournament.id, tournament.updated_at]);

  const originalDiscordWebhook = settings.discordWebhookUrl || '';
  const originalStreamUrl = settings.streamUrl || '';
  const originalMapVeto = settings.mapVetoEnabled ?? gameFeatures.mapVeto ?? false;
  const originalAssisted = settings.assistedMatchReporting ?? false;

  const isDirty =
    form.discordWebhookUrl !== originalDiscordWebhook ||
    form.streamUrl !== originalStreamUrl ||
    form.mapVetoEnabled !== originalMapVeto ||
    form.assistedMatchReporting !== originalAssisted;

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
        settings: {
          ...settings,
          discordWebhookUrl: form.discordWebhookUrl.trim() || undefined,
          streamUrl: form.streamUrl.trim() || undefined,
          mapVetoEnabled: form.mapVetoEnabled,
          assistedMatchReporting: form.assistedMatchReporting,
        },
      });
      toast({ title: 'Advanced settings saved' });
      onSave();
    } catch (err: any) {
      toast({ title: 'Save failed', description: err.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }, [isDirty, saving, form, tournament.id, settings, toast, onSave]);

  return (
    <>
      <CommandHeader
        eyebrow="CONFIGURATION"
        title="Advanced Settings"
        description="Discord integration, stream URL, and match reporting options."
      />

      <CommandSection>
        <div className="space-y-6">
          {/* Discord Webhook */}
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Discord Webhook URL
            </Label>
            <Input
              value={form.discordWebhookUrl}
              onChange={(e) => setForm((s) => ({ ...s, discordWebhookUrl: e.target.value }))}
              disabled={isFieldLocked('discord_webhook_url')}
              placeholder="https://discord.com/api/webhooks/..."
              className="border-white/10 bg-black/30 text-white placeholder:text-zinc-600 disabled:opacity-50"
            />
            <p className="text-xs text-zinc-500">
              Receive automated notifications in your Discord server when tournament events occur.
            </p>
          </div>

          {/* Stream URL */}
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Stream URL
            </Label>
            <Input
              value={form.streamUrl}
              onChange={(e) => setForm((s) => ({ ...s, streamUrl: e.target.value }))}
              disabled={isFieldLocked('stream_url')}
              placeholder="https://twitch.tv/..."
              className="border-white/10 bg-black/30 text-white placeholder:text-zinc-600 disabled:opacity-50"
            />
            <p className="text-xs text-zinc-500">
              Shown on the tournament page as the official stream link.
            </p>
          </div>

          {/* Map Veto Toggle (only for games that support it) */}
          {gameFeatures.mapVeto && (
            <div className="flex items-center justify-between border border-white/10 bg-white/[0.02] p-4">
              <div>
                <p className="text-sm font-medium text-white">Enable Map Veto</p>
                <p className="text-xs text-zinc-500">
                  Teams must complete a map ban/pick phase before reporting match results.
                </p>
              </div>
              <Switch
                checked={form.mapVetoEnabled}
                onCheckedChange={(checked) => setForm((s) => ({ ...s, mapVetoEnabled: checked }))}
                disabled={isFieldLocked('map_pool')}
              />
            </div>
          )}

          {/* Assisted Match Reporting (games with API integration only) */}
          {gameFeatures.assistedReporting && (
            <div className="flex items-center justify-between border border-white/10 bg-white/[0.02] p-4">
              <div>
                <p className="text-sm font-medium text-white">Assisted Match Reporting</p>
                <p className="text-xs text-zinc-500">
                  Automatically detects match results from the game's API. Captains can scan recent matches to report scores.
                </p>
              </div>
              <Switch
                checked={form.assistedMatchReporting}
                onCheckedChange={(checked) => setForm((s) => ({ ...s, assistedMatchReporting: checked }))}
              />
            </div>
          )}
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
