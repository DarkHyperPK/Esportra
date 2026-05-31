import React from 'react';
import { cn } from '@/lib/utils';
import {
  STAGE_PROGRESS_CLASSES,
  STAGE_PROGRESS_LABELS,
  normalizeStageProgressLabel,
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
