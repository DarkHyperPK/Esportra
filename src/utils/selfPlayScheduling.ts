import type { SchedulingConfig } from '@/hooks/useMatchScheduling';

/** Stage config fallback while room-state is still loading. */
export function isSelfPlaySchedulingEnabled(
  schedulingConfig?: SchedulingConfig | null,
  roomState?: { selfPlayEnabled: boolean } | null,
): boolean {
  const stageSelfPlay = Boolean(
    schedulingConfig?.self_play_enabled ?? schedulingConfig?.selfPlayEnabled,
  );
  if (roomState != null) return roomState.selfPlayEnabled;
  return stageSelfPlay;
}

export function readCheckinWindowMinutes(
  schedulingConfig?: SchedulingConfig | null,
  roomState?: { checkinWindowMinutes?: number } | null,
): number {
  if (typeof roomState?.checkinWindowMinutes === 'number') {
    return roomState.checkinWindowMinutes;
  }
  const fromConfig = schedulingConfig?.checkin_window_minutes
    ?? schedulingConfig?.checkinWindowMinutes;
  return typeof fromConfig === 'number' && fromConfig > 0 ? fromConfig : 15;
}
