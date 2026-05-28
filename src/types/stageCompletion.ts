export type StageProgressLabel =
  | 'setup'
  | 'in_progress'
  | 'ready_to_advance'
  | 'advanced';

export interface StageCompletionStatus {
  isComplete: boolean;
  alreadyAdvanced: boolean;
  progressLabel: StageProgressLabel;
  reason?: string;
  groupsTotal?: number;
  groupsWithCompletedRounds?: number;
  advancingTeams?: Array<{ team_id: string; team_name: string; seed: number }>;
}

export const STAGE_PROGRESS_LABELS: Record<StageProgressLabel, string> = {
  setup: 'Setup',
  in_progress: 'In Progress',
  ready_to_advance: 'Ready to Advance',
  advanced: 'Advanced',
};

export const STAGE_PROGRESS_CLASSES: Record<StageProgressLabel, string> = {
  setup: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  in_progress: 'bg-red-500/20 text-red-400 border-red-500/30',
  ready_to_advance: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  advanced: 'bg-zinc-500/20 text-zinc-300 border-zinc-500/30',
};

export function normalizeStageProgressLabel(value?: string | null): StageProgressLabel {
  switch (value) {
    case 'in_progress':
    case 'ready_to_advance':
    case 'advanced':
      return value;
    default:
      return 'setup';
  }
}
