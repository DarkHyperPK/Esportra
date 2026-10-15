import { z } from 'zod';
import { SCREEN_CATALOG } from '@/services/broadcast/screenCatalog';
export const CUE_TRIGGERS = ['manual', 'match_room_opened', 'check_in_complete', 'veto_step', 'veto_complete', 'agent_select', 'round_live', 'round_end', 'kill', 'multi_kill', 'spike_planted', 'spike_defused', 'map_end', 'series_decided', 'rescheduled', 'forfeit', 'clock_time', 'delay', 'hotkey', 'remote_command', 'observer_flag'] as const;
export const AUTOMATIC_CUES: readonly string[] = ['round_live', 'round_end', 'spike_planted', 'spike_defused', 'map_end', 'observer_flag'];
export const cueLabel = (cue: string) => cue.split('_').join(' ');
export const rundownPlanSchema = z.object({
  trigger: z.enum(CUE_TRIGGERS), mode: z.enum(['manual', 'automatic']), holdMode: z.enum(['manual', 'window', 'immediate']), holdSeconds: z.number().int().min(0).max(60),
  graphics: z.array(z.string().refine(name => SCREEN_CATALOG.some(screen => screen.overlay === name), 'Choose an available screen.')).max(1),
  scene: z.string().min(1).max(256).refine(name => ![...name].some(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127), 'Use a valid scene name.').nullable().optional(),
  transition: z.object({ mode: z.enum(['current', 'cut', 'fade', 'stinger']), name: z.string().min(1).max(256).nullable().optional(), durationMs: z.number().int().min(50).max(10000).nullable().optional() }).nullable().optional(),
  mapNumber: z.number().int().min(1).max(9).nullable().optional(),
}).superRefine((value, ctx) => {
  if (value.mode === 'automatic' && !AUTOMATIC_CUES.includes(value.trigger)) ctx.addIssue({ code: 'custom', path: ['mode'], message: 'This cue currently requires a manual Take.' });
  if (value.holdMode === 'window' && value.holdSeconds < 1) ctx.addIssue({ code: 'custom', path: ['holdSeconds'], message: 'Hold window must be 1–60 seconds.' });
  if (value.transition && value.transition.mode !== 'current' && !value.transition.name?.trim()) ctx.addIssue({ code: 'custom', path: ['transition'], message: 'Enter the transition name from OBS.' });
  if (value.transition?.mode === 'fade' && !value.transition.durationMs) ctx.addIssue({ code: 'custom', path: ['transition'], message: 'Choose a Fade duration.' });
});
export type RundownPlan = z.infer<typeof rundownPlanSchema>;
export function readRundownPlan(value: unknown): RundownPlan | null { const parsed = rundownPlanSchema.safeParse(value); return parsed.success ? parsed.data : null; }
