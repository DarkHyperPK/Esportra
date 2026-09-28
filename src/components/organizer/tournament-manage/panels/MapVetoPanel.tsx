/**
 * MapVetoPanel.tsx
 *
 * Configuration panel for map pool and veto sequence.
 * Uses TournamentMapPoolSelector for map pool, and informs about veto config.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Loader2, Map } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import {
  CommandHeader,
  CommandSection,
  CommandActionBar,
  CommandButton,
  CommandEmptyState,
} from '@/components/management/CommandSurface';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/apiClient';
import { getEffectiveGameFeatures } from '@/utils/gameFeatures';
import { useDirtyState } from '@/components/organizer/tournament-manage/TournamentDashboardShell';
import TournamentMapPoolSelector from '@/components/tournament/wizard/TournamentMapPoolSelector';
import type { TournamentMapOption } from '@/components/tournament/wizard/TournamentMapPoolSelector';
import type { DashboardTournament } from '@/hooks/useTournamentDashboard';

interface MapVetoPanelProps {
  tournament: DashboardTournament;
  editableFields: Set<string>;
  onSave: () => void;
}

export function MapVetoPanel({ tournament, editableFields, onSave }: MapVetoPanelProps) {
  const { toast } = useToast();
  const { setDirty } = useDirtyState();
  const [saving, setSaving] = useState(false);
  const gameFeatures = getEffectiveGameFeatures(tournament.game || '', tournament.game_mode);

  const settings = useMemo(() => tournament.settings ?? {}, [tournament.settings]);
  const mapVetoEnabled = settings.mapVetoEnabled ?? gameFeatures.mapVeto ?? false;

  // Fetch available maps for this game
  const { data: availableMaps = [], isLoading: mapsLoading } = useQuery<TournamentMapOption[]>({
    queryKey: ['maps', tournament.game],
    queryFn: () => apiClient.get<TournamentMapOption[]>(`/api/maps?game=${encodeURIComponent(tournament.game || '')}`),
    enabled: Boolean(tournament.game) && gameFeatures.mapVeto,
    staleTime: 5 * 60_000,
  });

  const [selectedMapIds, setSelectedMapIds] = useState<string[]>(settings.mapPoolIds ?? []);

  useEffect(() => {
    setSelectedMapIds(settings.mapPoolIds ?? []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournament.id, tournament.updated_at]);

  const originalMapIds = JSON.stringify(settings.mapPoolIds ?? []);
  const isDirty = JSON.stringify(selectedMapIds) !== originalMapIds;

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
          mapPoolIds: selectedMapIds,
        },
      });
      toast({ title: 'Map pool saved' });
      onSave();
    } catch (err: any) {
      toast({ title: 'Save failed', description: err.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }, [isDirty, saving, selectedMapIds, tournament.id, settings, toast, onSave]);

  // Games without map veto support
  if (!gameFeatures.mapVeto) {
    return (
      <>
        <CommandHeader
          eyebrow="CONFIGURATION"
          title="Map Veto"
          description="Map pool selection and veto sequence configuration."
        />
        <CommandEmptyState
          icon={<Map className="h-5 w-5" />}
          title="Not available for this game"
          description={`${tournament.game || 'This game'} does not support map veto configuration.`}
        />
      </>
    );
  }

  // Map veto disabled for this tournament
  if (!mapVetoEnabled) {
    return (
      <>
        <CommandHeader
          eyebrow="CONFIGURATION"
          title="Map Veto"
          description="Map pool selection and veto sequence configuration."
        />
        <CommandEmptyState
          icon={<Map className="h-5 w-5" />}
          title="Map veto disabled"
          description="Enable map veto in Advanced Settings to configure the map pool."
        />
      </>
    );
  }

  return (
    <>
      <CommandHeader
        eyebrow="CONFIGURATION"
        title="Map Veto"
        description="Select the map pool for this tournament. Players will vote to ban maps from this pool."
      />

      <CommandSection>
        {mapsLoading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-zinc-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading maps...
          </div>
        ) : availableMaps.length === 0 ? (
          <p className="text-sm text-zinc-500">No maps found for {tournament.game}.</p>
        ) : (
          <div className={isFieldLocked('map_pool') ? 'pointer-events-none opacity-50' : ''}>
            <TournamentMapPoolSelector
              game={tournament.game || ''}
              requiredCount={7}
              availableMaps={availableMaps}
              selectedIds={selectedMapIds}
              onChange={setSelectedMapIds}
              mapVetoEnabled={mapVetoEnabled}
            />
          </div>
        )}
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
