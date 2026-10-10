import { useMemo } from 'react';
import type {
  BroadcastShowDetail,
  BroadcastNode,
  ShowSegment,
  BroadcastCrewMember,
  BroadcastSponsor,
  SetupStep,
} from '@/types/broadcast';

export interface SetupStatusInput {
  show: BroadcastShowDetail | undefined;
  nodes: BroadcastNode[];
  segments: ShowSegment[];
  crew: BroadcastCrewMember[];
  sponsors: BroadcastSponsor[];
  showId: string;
}

function buildSteps(showId: string): SetupStep[] {
  const base = `/broadcast/shows/${showId}`;
  return [
    { id: 'name', title: 'Name your show', description: 'Give this production a clear title.', cta: 'Edit title →', ctaHref: `${base}/setup`, ctaAction: 'edit-title', required: true },
    { id: 'tournament', title: 'Link a tournament', description: 'Connects match slots and bracket data.', cta: 'Link tournament →', ctaHref: `${base}/setup`, ctaAction: 'link-tournament', required: true },
    { id: 'node', title: 'Pair at least one node', description: 'The desktop Air app pairs nodes to your show.', cta: 'Node monitor →', ctaHref: `${base}/nodes`, required: true },
    { id: 'match-slots', title: 'Add match slots', description: 'Set which matches will appear in your rundown.', cta: 'Open rundown →', ctaHref: base, required: true },
    { id: 'match-codes', title: 'Configure match codes', description: 'e.g. MAIN, GF1. Codes link your rundown to the overlay.', cta: 'Open rundown →', ctaHref: base, required: true },
    { id: 'talent', title: 'Add talent roster', description: 'Commentators, analysts, production staff.', cta: 'Talent →', ctaHref: `${base}/crew`, required: true },
    { id: 'sponsors', title: 'Add sponsors', description: 'Sponsors appear in HUD overlays.', cta: 'Sponsors →', ctaHref: `${base}/sponsors`, required: true },
    { id: 'crew', title: 'Invite crew', description: 'Share an invite link with your crew.', cta: 'Crew →', ctaHref: `${base}/crew`, required: false },
    { id: 'sync', title: 'Sync config to node', description: 'Push your settings to the Air node before going live.', cta: 'Sync now', ctaHref: base, ctaAction: 'sync', required: false },
  ];
}

function deriveCompletion(
  steps: SetupStep[],
  input: SetupStatusInput,
): boolean[] {
  const { show, nodes, segments, crew, sponsors } = input;
  const matchSlots = show?.matchSlotCount ?? 0;
  const slotsWithCode = show?.matchSlotsWithCode ?? 0;

  return steps.map((step) => {
    switch (step.id) {
      case 'name': return !!show?.title && show.title.trim().length > 0;
      case 'tournament': return !!show?.tournamentId;
      case 'node': return nodes.length > 0;
      case 'match-slots': return matchSlots > 0 || segments.some((s) => s.type === 'match');
      case 'match-codes': return matchSlots > 0 && slotsWithCode > 0 && slotsWithCode === matchSlots;
      case 'talent': return (show?.talentCount ?? 0) > 0;
      case 'sponsors': return sponsors.length > 0;
      case 'crew': return crew.length > 0;
      case 'sync': return show?.lastSyncedAt != null;
      default: return false;
    }
  });
}

export function useBroadcastSetupStatus(input: SetupStatusInput) {
  const steps = useMemo(
    () => buildSteps(input.showId),
    [input.showId],
  );

  const completion = useMemo(
    () => deriveCompletion(steps, input),
    [steps, input],
  );

  const completedCount = completion.filter(Boolean).length;
  const allRequiredDone = steps
    .filter((s) => s.required)
    .every((s) => completion[steps.indexOf(s)]);

  return { steps, completion, completedCount, totalCount: steps.length, allRequiredDone };
}
