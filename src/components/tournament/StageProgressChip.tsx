import React from 'react';
import { cn } from '@/lib/utils';
import {
  STAGE_PROGRESS_CLASSES,
  STAGE_PROGRESS_LABELS,
  normalizeStageProgressLabel,
  type StageProgressLabel,
} from '@/types/stageCompletion';

interface StageProgressChipProps {
  progressLabel?: string | null;
  className?: string;
}

export const StageProgressChip: React.FC<StageProgressChipProps> = ({ progressLabel, className }) => {
  const label = normalizeStageProgressLabel(progressLabel);
  return (
    <span
      className={cn(
        'text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded font-semibold border',
        STAGE_PROGRESS_CLASSES[label],
        className,
      )}
    >
      {STAGE_PROGRESS_LABELS[label]}
    </span>
  );
};

export function getStageProgressFromStage(stage: { progress_label?: string | null; status?: string | null }): StageProgressLabel {
  if (stage.progress_label) {
    return normalizeStageProgressLabel(stage.progress_label);
  }

  // Legacy fallback while older payloads still include status.
  if (stage.status === 'completed') return 'advanced';
  if (stage.status === 'live') return 'in_progress';
  return 'setup';
}

export default StageProgressChip;
