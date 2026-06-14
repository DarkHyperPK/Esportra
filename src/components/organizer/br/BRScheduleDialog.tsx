import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar, Clock, Save, ChevronRight } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';
import { useBRStageConfig } from '@/hooks/useBRStageConfig';
import { getStageBRConfig } from '@/utils/brConfigResolve';
import { usesGameOnlySchedule } from '@/utils/brLobbyPatch';
import type { BRRound } from '@/types/brLobbies';
import type { BRGroup } from '@/types/brGroups';
import type { Database } from '@/integrations/supabase/types';

type TournamentStage = Database['public']['Tables']['tournament_stages']['Row'];

interface BRScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stage: TournamentStage;
  tournamentId: string;
  allStages: TournamentStage[];
  onUpdate: () => void;
}

const toLocalInput = (iso: string | null | undefined): string => {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const formatShort = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

type Step = 'stage' | 'rounds';

export const BRScheduleDialog: React.FC<BRScheduleDialogProps> = ({
  open,
  onOpenChange,
  stage,
  tournamentId,
  allStages,
  onUpdate,
}) => {
  const { toast } = useToast();
  const brConfig = getStageBRConfig(stage);
  const { apiConfig } = useBRStageConfig(stage.id);
  const gamesModelActive = apiConfig?.gamesModelActive ?? false;
  const gamesPerLobby = brConfig?.gamesPerLobby ?? brConfig?.gameCount ?? 6;
  const gameOnlySchedule = usesGameOnlySchedule(gamesModelActive, gamesPerLobby);

  // Step state
  const [step, setStep] = useState<Step>('stage');

  // Stage dates (local editable copies)
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [savingStage, setSavingStage] = useState(false);

  // Round data
  const [groups, setGroups] = useState<BRGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [rounds, setRounds] = useState<BRRound[]>([]);
  const [roundSchedules, setRoundSchedules] = useState<Record<string, string>>({});
  const [hasRoundsConfigured, setHasRoundsConfigured] = useState(false);
  const [loadingScheduleContext, setLoadingScheduleContext] = useState(false);
  const [loadingRounds, setLoadingRounds] = useState(false);
  const [savingRounds, setSavingRounds] = useState(false);

  // Reset on open/stage change
  useEffect(() => {
    if (open) {
      setStep('stage');
      setStartsAt(toLocalInput(stage.starts_at));
      setEndsAt(toLocalInput(stage.ends_at));
      setGroups([]);
      setSelectedGroupId(null);
      setRounds([]);
      setRoundSchedules({});
      setHasRoundsConfigured(false);
    }
  }, [open, stage.id, stage.starts_at, stage.ends_at]);

  // Load stage scheduling context as soon as the dialog opens so the stepper
  // reflects whether round-level scheduling is actually available.
  useEffect(() => {
    if (!open) return;

    setLoadingScheduleContext(true);
    apiClient
      .get<{ groups: BRGroup[]; has_rounds?: boolean }>(`/api/stages/${stage.id}/br/groups/detail?includeTeams=false`)
      .then((data) => {
        const nextGroups = Array.isArray(data?.groups) ? data.groups : [];
        setGroups(nextGroups);
        setHasRoundsConfigured(Boolean(data?.has_rounds));
        if (nextGroups.length > 0) {
          setSelectedGroupId((current) => current && nextGroups.some((group) => group.id === current) ? current : nextGroups[0].id);
        }
      })
      .catch(() => {
        setGroups([]);
        setHasRoundsConfigured(false);
      })
      .finally(() => setLoadingScheduleContext(false));
  }, [open, stage.id]);

  // Load rounds when group changes
  useEffect(() => {
    if (!selectedGroupId || step !== 'rounds') return;
    setLoadingRounds(true);
    apiClient.get<BRRound[]>(`/api/stages/${stage.id}/br/groups/${selectedGroupId}/lobbies`)
      .then(r => {
        setRounds(r);
        const schedMap: Record<string, string> = {};
        for (const round of r) {
          schedMap[round.id] = toLocalInput(round.scheduled_at);
        }
        setRoundSchedules(schedMap);
      })
      .catch(() => setRounds([]))
      .finally(() => setLoadingRounds(false));
  }, [selectedGroupId, step, stage.id]);

  const handleSaveStageSchedule = async () => {
    setSavingStage(true);
    try {
      const stageDtos = allStages.map(s => ({
        id: s.id,
        name: s.name,
        format: s.format || 'battle_royale',
        stageOrder: s.stage_order,
        bestOf: 1,
        capacity: s.capacity,
        advancementCount: s.advancement_count,
        startsAt: s.id === stage.id ? (startsAt ? new Date(startsAt).toISOString() : null) : (s.starts_at || null),
        endsAt: s.id === stage.id ? (endsAt ? new Date(endsAt).toISOString() : null) : (s.ends_at || null),
      }));
      await apiClient.put(`/api/tournaments/${tournamentId}/stages`, { stages: stageDtos });
      toast({ title: 'Stage schedule saved' });
      onUpdate();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to save schedule', variant: 'destructive' });
    } finally {
      setSavingStage(false);
    }
  };

  const handleSaveAndContinue = async () => {
    await handleSaveStageSchedule();
    if (hasRoundsConfigured) {
      setStep('rounds');
    }
  };

  const handleSaveRoundSchedules = async () => {
    if (gameOnlySchedule) {
      toast({
        title: 'Use the Schedule tab',
        description: 'Per-game start times are set on each game in the main Schedule tab.',
        variant: 'destructive',
      });
      return;
    }
    setSavingRounds(true);
    try {
      let updated = 0;
      for (const round of rounds) {
        const localVal = roundSchedules[round.id] || '';
        const isoVal = localVal ? new Date(localVal).toISOString() : null;
        const existingVal = round.scheduled_at ? new Date(round.scheduled_at).toISOString() : null;
        if (isoVal !== existingVal) {
          await apiClient.patch(`/api/br/lobbies/${round.id}`, { scheduledAt: isoVal });
          updated++;
        }
      }
      toast({ title: updated > 0 ? `${updated} round(s) scheduled` : 'No changes to save' });
      onUpdate();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to save round schedules', variant: 'destructive' });
    } finally {
      setSavingRounds(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0a0a0c] border-white/10 max-w-xl p-0 overflow-hidden">
        {/* Header with step indicator */}
        <div className="px-6 pt-6 pb-4 border-b border-white/5">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-rose-400" />
              Schedule — {stage.name}
            </DialogTitle>
            <DialogDescription className="text-gray-500 text-sm mt-1">
              {step === 'stage'
                ? 'Set the date range for this stage.'
                : hasRoundsConfigured
                  ? 'Set individual round times within the stage window.'
                  : 'Round timing unlocks after you create rounds in Lobbies & Rounds.'}
            </DialogDescription>
          </DialogHeader>

          {/* Step indicator */}
          <div className="flex items-center gap-2 mt-4">
            <button
              onClick={() => setStep('stage')}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                step === 'stage'
                  ? 'bg-rose-500/15 text-rose-400 border border-rose-500/20'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              1. Stage Dates
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
            <button
              onClick={() => { if (startsAt && endsAt && hasRoundsConfigured) setStep('rounds'); }}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                step === 'rounds'
                  ? 'bg-rose-500/15 text-rose-400 border border-rose-500/20'
                  : startsAt && endsAt && hasRoundsConfigured ? 'text-gray-500 hover:text-gray-300' : 'text-gray-700 cursor-not-allowed'
              }`}
            >
              2. Round Schedule
            </button>
          </div>
        </div>

        {/* Step 1: Stage Dates */}
        {step === 'stage' && (
          <div className="px-6 py-5 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm text-gray-300 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-gray-500" /> Start Date & Time
                </Label>
                <Input
                  type="datetime-local"
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                  className="bg-white/5 border-white/10 text-white [color-scheme:dark]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-gray-300 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-gray-500" /> End Date & Time
                </Label>
                <Input
                  type="datetime-local"
                  value={endsAt}
                  onChange={(e) => setEndsAt(e.target.value)}
                  min={startsAt || undefined}
                  className="bg-white/5 border-white/10 text-white [color-scheme:dark]"
                />
              </div>
            </div>

            <div className={`rounded-lg border px-3 py-3 text-xs ${
              hasRoundsConfigured
                ? 'border-emerald-500/20 bg-emerald-500/[0.05] text-emerald-200'
                : 'border-white/8 bg-white/[0.02] text-zinc-400'
            }`}>
              {loadingScheduleContext
                ? 'Checking whether round scheduling is available for this stage...'
                : hasRoundsConfigured
                  ? 'Round scheduling is available after you save the stage window.'
                  : 'Create at least one round in Lobbies & Rounds before using round-level scheduling here.'}
            </div>
          </div>
        )}

        {/* Step 2: Round Schedule */}
        {step === 'rounds' && (
          <div className="px-6 py-5 space-y-4 max-h-[55vh] overflow-y-auto">
            {/* Stage window summary */}
            {startsAt && endsAt && (
              <div className="flex items-center gap-2 text-xs text-gray-400 bg-white/[0.02] border border-white/5 px-3 py-2 rounded-lg">
                <Calendar className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                <span>
                  {formatShort(new Date(startsAt).toISOString())} &rarr; {formatShort(new Date(endsAt).toISOString())}
                </span>
              </div>
            )}

            {/* Group selector */}
            {groups.length > 1 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-gray-500">Group:</span>
                {groups.map(g => (
                  <button
                    key={g.id}
                    onClick={() => setSelectedGroupId(g.id)}
                    className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${
                      selectedGroupId === g.id
                        ? 'bg-white/10 text-white border border-white/20'
                        : 'text-gray-500 hover:text-gray-300 border border-transparent'
                    }`}
                  >
                    {g.name}
                  </button>
                ))}
              </div>
            )}

            {/* Lobby list */}
            {loadingRounds ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <div key={i} className="h-12 bg-white/5 rounded-lg animate-pulse" />)}
              </div>
            ) : rounds.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No lobbies created yet</p>
                <p className="text-xs text-gray-600 mt-1">Create lobbies in the group management section first.</p>
              </div>
            ) : groups.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No groups created yet</p>
                <p className="text-xs text-gray-600 mt-1">Create groups in the stage management section first.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {rounds.map((round) => (
                  <div key={round.id} className="flex items-center gap-3 p-3 bg-white/[0.02] border border-white/5 rounded-lg">
                    <div className="w-8 h-8 rounded-md bg-white/5 border border-white/10 flex items-center justify-center text-xs font-bold text-gray-400 flex-shrink-0">
                      L{round.round_number ?? round.wave_number}
                    </div>
                    <div className="flex-1 min-w-0">
                      <Input
                        type="datetime-local"
                        value={roundSchedules[round.id] || ''}
                        onChange={(e) => setRoundSchedules(prev => ({ ...prev, [round.id]: e.target.value }))}
                        min={startsAt || undefined}
                        max={endsAt || undefined}
                        className="h-8 text-xs bg-white/5 border-white/10 text-white [color-scheme:dark]"
                      />
                    </div>
                    {roundSchedules[round.id] && (
                      <button
                        onClick={() => setRoundSchedules(prev => ({ ...prev, [round.id]: '' }))}
                        className="text-[10px] text-gray-600 hover:text-red-400 transition-colors"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/5 flex items-center gap-3">
          {step === 'stage' ? (
            <>
              <Button variant="ghost" className="text-gray-400" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              {hasRoundsConfigured && (
                <Button
                  variant="outline"
                  className="border-white/10 text-gray-300 hover:text-white"
                  onClick={handleSaveAndContinue}
                  disabled={savingStage || !startsAt || !endsAt}
                >
                  <ChevronRight className="w-3.5 h-3.5 mr-1.5" />
                  {savingStage ? 'Saving...' : 'Save & Continue'}
                </Button>
              )}
              <Button
                className="flex-1 bg-rose-600 hover:bg-rose-500 text-white"
                onClick={handleSaveStageSchedule}
                disabled={savingStage || !startsAt || !endsAt}
              >
                <Save className="w-3.5 h-3.5 mr-1.5" />
                {savingStage ? 'Saving...' : 'Save Stage Dates'}
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" className="text-gray-400" onClick={() => setStep('stage')}>
                Back
              </Button>
              <Button
                className="flex-1 bg-rose-600 hover:bg-rose-500 text-white"
                onClick={handleSaveRoundSchedules}
                disabled={savingRounds || rounds.length === 0}
              >
                <Save className="w-3.5 h-3.5 mr-1.5" />
                {savingRounds ? 'Saving...' : 'Save Round Schedule'}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
