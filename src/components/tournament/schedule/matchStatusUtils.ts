import type { Tone } from '@/components/ui/kit';

export interface SchedulableMatch {
  id: string;
  match_number: number;
  scheduled_time: string | null;
  team1_name: string | null;
  team2_name: string | null;
  status?: string;
  scheduling_escalated_at?: string | null;
}

export type StatusInfo = { label: string; tone: Tone };

export function deriveMatchStatusInfo(
  m: Pick<SchedulableMatch, 'status' | 'scheduled_time' | 'scheduling_escalated_at'>,
): StatusInfo | null {
  if (m.scheduling_escalated_at) return { label: 'Time dispute', tone: 'warning' };
  if (m.status === 'pending' && m.scheduled_time) {
    return { label: `Time agreed: ${new Date(m.scheduled_time).toLocaleString()}`, tone: 'success' };
  }
  if (m.status === 'pending' && !m.scheduled_time) return { label: 'No proposal yet', tone: 'neutral' };
  return null;
}
