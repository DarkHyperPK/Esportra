import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, ApiError } from '@/lib/apiClient';
import { useHub } from '@/hooks/useSignalR';
import { HubPaths } from '@/lib/signalrClient';
import type { VetoSettingsDto, VetoStepDto, VetoStepDraft } from '@/types/veto';

interface UseVetoSettingsOptions {
  matchId: string;
  vetoStatus: string; // 'pending' | 'in_progress' | 'completed' | 'cancelled'
  enabled: boolean; // pass effectiveIsOrganizer — do not fetch if not organizer
}

interface UseVetoSettingsResult {
  settings: VetoSettingsDto | undefined;
  isLoading: boolean;
  fetchError: boolean;

  localMode: 'default' | 'custom';
  localSteps: VetoStepDraft[];
  isDirty: boolean;
  externalUpdatePending: boolean;

  setLocalMode: (mode: 'default' | 'custom') => void;
  updateStep: (index: number, patch: Partial<Omit<VetoStepDraft, 'actionNumber'>>) => void;

  save: () => void;
  saveStatus: 'idle' | 'saving' | 'success' | 'error';
  saveErrorMessage: string | null;
  dismissExternalUpdateWarning: () => void;
}

function stepsFromDto(seq: VetoStepDto[]): VetoStepDraft[] {
  return seq.map((s) => ({
    actionNumber: s.actionNumber,
    action: s.action,
    team: s.team,
  }));
}

function stepsMatchDefault(
  steps: VetoStepDraft[],
  defaultSeq: VetoStepDto[],
): boolean {
  if (steps.length !== defaultSeq.length) return false;
  return steps.every(
    (s, i) => s.action === defaultSeq[i].action && s.team === defaultSeq[i].team,
  );
}

function computeIsDecider(
  steps: VetoStepDraft[],
): Array<VetoStepDraft & { isDecider: boolean }> {
  const lastPickSideIdx = steps.reduce<number>(
    (acc, s, i) => (s.action === 'pick_side' ? i : acc),
    -1,
  );
  return steps.map((s, i) => ({
    ...s,
    isDecider: s.action === 'pick_side' && i === lastPickSideIdx,
  }));
}

function resolveErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 409) {
      return 'Veto has started. Settings can no longer be changed.';
    }
    if (error.status === 400) {
      return 'Invalid sequence. Check that pick count matches the best-of format.';
    }
  }
  return 'Failed to save settings. Please try again.';
}

export function useVetoSettings({
  matchId,
  enabled,
}: UseVetoSettingsOptions): UseVetoSettingsResult {
  const queryClient = useQueryClient();
  const conn = useHub(HubPaths.Veto);

  const [localMode, setLocalModeState] = useState<'default' | 'custom'>('default');
  const [localSteps, setLocalSteps] = useState<VetoStepDraft[]>([]);
  const [externalUpdatePending, setExternalUpdatePending] = useState(false);
  const [saveStatus, setSaveStatus] = useState<
    'idle' | 'saving' | 'success' | 'error'
  >('idle');
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);

  const { data: settings, isLoading, isError } = useQuery<VetoSettingsDto>({
    queryKey: ['veto-settings', matchId],
    queryFn: () => apiClient.get<VetoSettingsDto>(`/api/veto/${matchId}/settings`),
    staleTime: 30_000,
    enabled,
  });

  // Initialize local state on first successful load.
  // Keyed on settings?.matchId (not the settings object reference) to avoid render loops.
  useEffect(() => {
    if (!settings?.matchId) return;
    setLocalModeState(settings.mode === 'Custom' ? 'custom' : 'default');
    setLocalSteps(stepsFromDto(settings.effectiveSequence));
  }, [settings?.matchId]); // eslint-disable-line react-hooks/exhaustive-deps

  const isDirty = useMemo(() => {
    if (!settings) return false;
    const serverMode = settings.mode === 'Custom' ? 'custom' : 'default';
    if (localMode !== serverMode) return true;
    const serverSteps = settings.effectiveSequence;
    if (localSteps.length !== serverSteps.length) return true;
    return localSteps.some(
      (s, i) => s.action !== serverSteps[i].action || s.team !== serverSteps[i].team,
    );
  }, [localMode, localSteps, settings]);

  // Ref lets the SignalR handler read the current isDirty without re-registering.
  const isDirtyRef = useRef(isDirty);
  useEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);

  // Auto-reset saveStatus from 'success' to 'idle' after 2000ms.
  useEffect(() => {
    if (saveStatus !== 'success') return;
    const timer = setTimeout(() => setSaveStatus('idle'), 2_000);
    return () => clearTimeout(timer);
  }, [saveStatus]);

  // SignalR: register VetoSettingsSync handler on the shared veto hub connection.
  // Group membership is managed by useVetoRealtime — we only register the event.
  useEffect(() => {
    if (!enabled || !matchId) return;

    let active = true;

    const handleSettingsSync = (dto: VetoSettingsDto) => {
      if (!active) return;
      queryClient.setQueryData(['veto-settings', matchId], dto);
      if (isDirtyRef.current) {
        setExternalUpdatePending(true);
      } else {
        setLocalModeState(dto.mode === 'Custom' ? 'custom' : 'default');
        setLocalSteps(stepsFromDto(dto.effectiveSequence));
      }
    };

    conn.on('VetoSettingsSync', handleSettingsSync);

    return () => {
      active = false;
      conn.off('VetoSettingsSync', handleSettingsSync);
    };
  }, [conn, matchId, enabled, queryClient]);

  const setLocalMode = useCallback(
    (mode: 'default' | 'custom') => {
      setLocalModeState(mode);
      if (mode === 'custom' && settings) {
        // If steps still match the default sequence, populate from defaultSequence
        // so the user starts with a sensible baseline to customise from.
        if (stepsMatchDefault(localSteps, settings.defaultSequence)) {
          setLocalSteps(stepsFromDto(settings.defaultSequence));
        }
      }
    },
    [localSteps, settings],
  );

  const updateStep = useCallback(
    (index: number, patch: Partial<Omit<VetoStepDraft, 'actionNumber'>>) => {
      setLocalSteps((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
    },
    [],
  );

  const saveMutation = useMutation({
    mutationFn: async () => {
      const computedSteps = computeIsDecider(localSteps);
      return apiClient.put<VetoSettingsDto>(`/api/veto/${matchId}/settings`, {
        mode: localMode,
        sequence: localMode === 'custom' ? computedSteps : null,
      });
    },
    onMutate: () => {
      setSaveStatus('saving');
      setSaveErrorMessage(null);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['veto-settings', matchId], data);
      void queryClient.invalidateQueries({ queryKey: ['veto-settings', matchId] });
      setExternalUpdatePending(false);
      setSaveStatus('success');
    },
    onError: (error) => {
      setSaveStatus('error');
      setSaveErrorMessage(resolveErrorMessage(error));
    },
  });

  const save = useCallback(() => {
    saveMutation.mutate();
  }, [saveMutation]);

  const dismissExternalUpdateWarning = useCallback(() => {
    setExternalUpdatePending(false);
  }, []);

  return {
    settings,
    isLoading,
    fetchError: isError,
    localMode,
    localSteps,
    isDirty,
    externalUpdatePending,
    setLocalMode,
    updateStep,
    save,
    saveStatus,
    saveErrorMessage,
    dismissExternalUpdateWarning,
  };
}
