import {
  normalizeStageProgressLabel,
  type StageProgressLabel,
} from '@/types/stageCompletion';

export function getStageProgressFromStage(stage: { progress_label?: string | null; status?: string | null }): StageProgressLabel {
  if (stage.progress_label) {
    return normalizeStageProgressLabel(stage.progress_label);
  }

  if (stage.status === 'completed') return 'advanced';
  if (stage.status === 'live') return 'in_progress';
  return 'setup';
}
