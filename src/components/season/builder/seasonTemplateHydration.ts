import { generateSlotDates, getTemplateById, type TournamentSlot } from '@/data/seasonTemplates';
import type { AdvancementConnection, SeasonBuilderNode, SeasonNodeDraft, SeasonNodeType, SeasonRuleDraft } from '@/types/season';

const DEFAULT_TEAM_SIZE = 5;
const DEFAULT_MAX_TEAMS = 16;
const STANDINGS_FINAL_TEMPLATE_IDS = new Set(['weekly-circuit', 'points-race']);

const addDays = (value: string, days: number) => {
  const date = new Date(value);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
};

const toNodeType = (slot: TournamentSlot): Exclude<SeasonNodeType, 'root'> => {
  if (slot.type === 'finals') return 'final';
  if (slot.type === 'match_day' || slot.type === 'monthly' || slot.type === 'weekly' || slot.type === 'major') return 'event';
  return slot.type;
};

const buildNodeMetadata = (slot: TournamentSlot, connections: AdvancementConnection[] = [], qualificationSource?: string) => ({
  format: slot.suggestedFormat,
  teamSize: DEFAULT_TEAM_SIZE,
  maxTeams: slot.type === 'finals' ? DEFAULT_MAX_TEAMS : 32,
  registrationType: slot.type === 'finals' ? 'closed' : 'open',
  bestOf: slot.defaultBestOf,
  registrationPolicy: slot.type === 'finals' ? 'inbound_only' : 'direct_entry',
  qualificationSource: qualificationSource ?? (slot.type === 'finals' ? 'upstream_results' : 'registration'),
  templateSlotType: slot.type,
  templateDescription: slot.description ?? null,
  connections,
});

export function buildSeasonTemplatePlan(params: {
  seasonId: string;
  rootNodeId?: string | null;
  templateId: string;
  startDate?: string | null;
}): { nodes: SeasonNodeDraft[]; rules: SeasonRuleDraft[] } | null {
  const template = getTemplateById(params.templateId);
  if (!template || template.id === 'custom') return null;

  const startDate = params.startDate || new Date().toISOString().split('T')[0];
  const datedSlots = generateSlotDates(template, startDate);
  const nodeIds = template.slots.map(() => crypto.randomUUID());
  const finalIndex = template.slots.findIndex((slot) => slot.type === 'finals');
  const finalNodeId = finalIndex >= 0 ? nodeIds[finalIndex] : null;
  const finalUsesStandings = STANDINGS_FINAL_TEMPLATE_IDS.has(template.id);

  const nodes: SeasonNodeDraft[] = template.slots.map((slot, index) => {
    const scheduledDate = datedSlots[index]?.suggestedDate ?? addDays(startDate, index * template.intervalDays);
    const startsAt = scheduledDate;
    const endsAt = addDays(scheduledDate, slot.type === 'finals' ? 2 : 1);
    const registrationDeadline = slot.type === 'finals' ? null : addDays(scheduledDate, -2);
    const nodeType = toNodeType(slot);
    const shouldAdvanceToFinal = Boolean(finalNodeId && !finalUsesStandings && nodeIds[index] !== finalNodeId && nodeType !== 'final');
    const connectionRange = template.advancementRules?.[0];
    const connections: AdvancementConnection[] = shouldAdvanceToFinal && finalNodeId
      ? [{
        sourceNodeId: nodeIds[index],
        targetNodeId: finalNodeId,
        placementStart: connectionRange?.placement_start ?? 1,
        placementEnd: connectionRange?.placement_end ?? 4,
        advancementCount: connectionRange?.advancement_count ?? Math.min(4, connectionRange?.placement_end ?? 4),
      }]
      : [];

    return {
      id: nodeIds[index],
      seasonId: params.seasonId,
      parentNodeId: params.rootNodeId ?? null,
      name: slot.name,
      nodeType,
      displayOrder: index + 1,
      status: 'draft',
      registrationDeadline,
      startsAt,
      endsAt,
      metadata: buildNodeMetadata(slot, connections, slot.type === 'finals' && finalUsesStandings ? 'points_standings' : undefined),
      city: null,
      country: null,
      region: null,
      linkedStageId: null,
      linkedTournamentId: null,
      slug: null,
    };
  });

  const sourceNodeIds = finalNodeId ? nodeIds.filter((id) => id !== finalNodeId) : nodeIds;
  const rules: SeasonRuleDraft[] = sourceNodeIds.flatMap((sourceNodeId) => template.pointRules.map((rule) => ({
    sourceNodeId,
    sourceStageId: null,
    destinationNodeId: finalUsesStandings ? null : finalNodeId ?? null,
    placementFrom: rule.placement_start,
    placementTo: rule.placement_end,
    pointsAwarded: rule.points,
    qualificationStatus: finalNodeId && !finalUsesStandings ? 'qualified' : rule.qualification_status ?? null,
    autoCreateQualification: Boolean(finalNodeId && !finalUsesStandings),
    regionKey: null,
  })));

  return { nodes, rules };
}

export function templatePlanToBuilderNodes(nodes: SeasonNodeDraft[]): SeasonBuilderNode[] {
  return nodes.map((node) => ({
    id: node.id ?? crypto.randomUUID(),
    seasonId: node.seasonId ?? '',
    parentNodeId: node.parentNodeId ?? null,
    name: node.name,
    slug: node.slug ?? null,
    nodeType: node.nodeType,
    displayOrder: node.displayOrder,
    region: node.region ?? null,
    city: node.city ?? null,
    country: node.country ?? null,
    linkedTournamentId: node.linkedTournamentId ?? null,
    linkedStageId: node.linkedStageId ?? null,
    status: node.status ?? 'draft',
    registrationDeadline: node.registrationDeadline ?? null,
    startsAt: node.startsAt ?? null,
    endsAt: node.endsAt ?? null,
    metadata: node.metadata ?? null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    linkedTournamentName: null,
    linkedStageName: null,
  }));
}
