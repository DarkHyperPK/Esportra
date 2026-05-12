/**
 * seasonBuilderUtils — Season Builder Utilities
 *
 * Helper functions for the season structure builder and manage page.
 */

import type {
  SeasonBuilderNode,
  SeasonNodeData,
  SeasonNodeDraft,
  SeasonNodeType,
  SeasonRuleDraft,
  SeasonTreeNode,
  AdvancementConnection,
} from '@/types/season';

// ── Phase metadata ──────────────────────────────────────────────────────────

interface PhaseMeta {
  label: string;
  accent: string;
  accentBg: string;
  accentBorder: string;
}

const PHASE_META: Record<Exclude<SeasonNodeType, 'root'>, PhaseMeta> = {
  qualifier: {
    label: 'Qualifiers',
    accent: 'text-amber-400',
    accentBg: 'bg-amber-500/10',
    accentBorder: 'border-amber-500/25',
  },
  event: {
    label: 'Events',
    accent: 'text-violet-400',
    accentBg: 'bg-violet-500/10',
    accentBorder: 'border-violet-500/25',
  },
  stage: {
    label: 'Stages',
    accent: 'text-cyan-400',
    accentBg: 'bg-cyan-500/10',
    accentBorder: 'border-cyan-500/25',
  },
  final: {
    label: 'Finals',
    accent: 'text-rose-400',
    accentBg: 'bg-rose-500/10',
    accentBorder: 'border-rose-500/25',
  },
  custom: {
    label: 'Custom',
    accent: 'text-zinc-400',
    accentBg: 'bg-zinc-500/10',
    accentBorder: 'border-zinc-500/25',
  },
};

export function getPhaseMetaForType(type: Exclude<SeasonNodeType, 'root'>): PhaseMeta {
  return PHASE_META[type] ?? PHASE_META.custom;
}

// ── Tournament config ───────────────────────────────────────────────────────

export interface TournamentConfig {
  format?: string;
  teamSize?: number;
  maxTeams?: number;
  registrationType?: string;
  bestOf?: number;
}

export function readTournamentConfig(node: SeasonBuilderNode): TournamentConfig {
  const meta = node.metadata as Record<string, unknown> | null | undefined;
  if (!meta) return {};
  return {
    format: typeof meta.format === 'string' ? meta.format : undefined,
    teamSize: typeof meta.teamSize === 'number' ? meta.teamSize : undefined,
    maxTeams: typeof meta.maxTeams === 'number' ? meta.maxTeams : undefined,
    registrationType: typeof meta.registrationType === 'string' ? meta.registrationType : undefined,
    bestOf: typeof meta.bestOf === 'number' ? meta.bestOf : undefined,
  };
}

export function isTournamentConfigComplete(config: TournamentConfig): boolean {
  return !!(config.format && config.teamSize && config.maxTeams && config.registrationType);
}

// ── Advancement connections ─────────────────────────────────────────────────

export function readOutgoingConnections(node: SeasonBuilderNode): AdvancementConnection[] {
  const meta = node.metadata as Record<string, unknown> | null | undefined;
  if (!meta || !Array.isArray(meta.connections)) return [];
  return meta.connections as AdvancementConnection[];
}

export function isRegistrationIntakeNode(node: SeasonBuilderNode): boolean {
  return node.nodeType === 'qualifier' || node.nodeType === 'event' || node.nodeType === 'custom';
}

export function isProgressionOnlyNode(node: SeasonBuilderNode): boolean {
  return node.nodeType === 'stage' || node.nodeType === 'final';
}

export function nodeRequiresRegistrationDeadline(node: SeasonBuilderNode): boolean {
  return isRegistrationIntakeNode(node);
}

// ── Hydration / serialisation ───────────────────────────────────────────────

export function hydrateSeasonBuilderNodes(nodes: SeasonNodeData[]): SeasonBuilderNode[] {
  return nodes.map((n) => ({ ...n }));
}

export function toSeasonNodeDraftPayload(nodes: SeasonBuilderNode[]): SeasonNodeDraft[] {
  return nodes.map((n) => ({
    id: n.id,
    seasonId: n.seasonId,
    parentNodeId: n.parentNodeId,
    name: n.name,
    slug: n.slug,
    nodeType: n.nodeType,
    displayOrder: n.displayOrder,
    region: n.region,
    city: n.city,
    country: n.country,
    linkedTournamentId: n.linkedTournamentId,
    linkedStageId: n.linkedStageId,
    status: n.status,
    registrationDeadline: n.registrationDeadline,
    startsAt: n.startsAt,
    endsAt: n.endsAt,
    metadata: n.metadata,
  }));
}

// ── Validation ──────────────────────────────────────────────────────────────

export function validateSeasonBuilderNodes(nodes: SeasonBuilderNode[]): {
  valid: boolean;
  message?: string;
} {
  if (nodes.length === 0) {
    return { valid: false, message: 'Add at least one node before saving.' };
  }
  const hasRoot = nodes.some((n) => n.nodeType === 'root');
  if (!hasRoot) {
    return { valid: false, message: 'The season circuit must have a root node.' };
  }
  const unnamed = nodes.find((n) => !n.name?.trim());
  if (unnamed) {
    return { valid: false, message: 'All nodes must have a name.' };
  }
  return { valid: true };
}

export function validateSeasonSetupDomain(nodes: SeasonBuilderNode[], rules: SeasonRuleDraft[]) {
  const planned = nodes.filter((node) => node.nodeType !== 'root');
  const structureValidation = validateSeasonBuilderNodes(nodes);
  const missingConfig = planned.filter((node) => !isTournamentConfigComplete(readTournamentConfig(node)));
  const missingSchedule = planned.filter((node) => {
    if (!node.startsAt || !node.endsAt) return true;
    return nodeRequiresRegistrationDeadline(node) && !node.registrationDeadline;
  });
  const invalidSchedule = planned.filter((node) => {
    if (node.registrationDeadline && node.startsAt && new Date(node.registrationDeadline) > new Date(node.startsAt)) return true;
    if (node.startsAt && node.endsAt && new Date(node.endsAt) < new Date(node.startsAt)) return true;
    return false;
  });
  const invalidRules = rules.filter((rule) => {
    if (!rule.sourceNodeId) return false;
    return rule.placementFrom < 1 || rule.placementTo < 1 || rule.placementFrom > rule.placementTo || rule.pointsAwarded < 0;
  });
  const connectionCount = planned.reduce((total, node) => total + readOutgoingConnections(node).length, 0);
  const hasRuleDestination = rules.some((rule) => Boolean(rule.destinationNodeId));
  const nodeById = new Map(planned.map((node) => [node.id, node]));
  const domainIssues: string[] = [];

  planned.forEach((node) => {
    const config = readTournamentConfig(node);
    const outgoing = readOutgoingConnections(node);

    if (isProgressionOnlyNode(node)) {
      if (config.registrationType !== 'closed') {
        domainIssues.push(`${node.name || 'Progression node'} must have registration closed because entrants come from prior events.`);
      }
      if (node.registrationDeadline) {
        domainIssues.push(`${node.name || 'Progression node'} cannot have its own registration deadline.`);
      }
    }

    if (node.nodeType === 'final' && outgoing.length > 0) {
      domainIssues.push(`${node.name || 'Finals'} must be terminal and cannot advance into another tournament.`);
    }

    outgoing.forEach((connection) => {
      const target = nodeById.get(connection.targetNodeId);
      if (!target) {
        domainIssues.push(`${node.name || 'Tournament'} has an advancement link without a valid target.`);
        return;
      }
      if (target.id === node.id) {
        domainIssues.push(`${node.name || 'Tournament'} cannot advance into itself.`);
      }
      if (connection.placementStart < 1 || connection.placementEnd < 1 || connection.placementStart > connection.placementEnd) {
        domainIssues.push(`${node.name || 'Tournament'} has an invalid advancement placement range.`);
      }
      const placementRange = connection.placementEnd - connection.placementStart + 1;
      if (connection.advancementCount < 1 || connection.advancementCount > placementRange) {
        domainIssues.push(`${node.name || 'Tournament'} advances more entrants than its placement range allows.`);
      }
      if (node.endsAt && target.startsAt && new Date(node.endsAt) > new Date(target.startsAt)) {
        domainIssues.push(`${target.name || 'Target tournament'} must start after ${node.name || 'source tournament'} ends.`);
      }
    });
  });

  planned.filter((node) => node.nodeType === 'final').forEach((finalNode) => {
    const incomingConnectionSources = planned.filter((source) =>
      readOutgoingConnections(source).some((connection) => connection.targetNodeId === finalNode.id),
    );
    const incomingRuleSources = rules
      .filter((rule) => rule.destinationNodeId === finalNode.id)
      .map((rule) => nodeById.get(rule.sourceNodeId))
      .filter((node): node is SeasonBuilderNode => Boolean(node));
    const meta = finalNode.metadata as Record<string, unknown> | null | undefined;
    const hasPointsSource = meta?.qualificationSource === 'points_standings' && rules.some((rule) => {
      const source = nodeById.get(rule.sourceNodeId);
      return source && source.nodeType !== 'final';
    });
    const allowedInboundSources = [...incomingConnectionSources, ...incomingRuleSources].filter((source) =>
      source.nodeType === 'qualifier' || source.nodeType === 'event' || source.nodeType === 'stage',
    );

    if (!hasPointsSource && allowedInboundSources.length === 0) {
      domainIssues.push(`${finalNode.name || 'Finals'} must be fed by qualifiers, events, stages, or a points standings source.`);
    }
  });

  rules.forEach((rule) => {
    if (!rule.sourceNodeId || !rule.destinationNodeId) return;
    const source = nodeById.get(rule.sourceNodeId);
    const destination = nodeById.get(rule.destinationNodeId);
    if (!source || !destination) return;
    if (source.id === destination.id) {
      domainIssues.push(`${source.name || 'Tournament'} cannot qualify entrants into itself.`);
    }
    if (source.endsAt && destination.startsAt && new Date(source.endsAt) > new Date(destination.startsAt)) {
      domainIssues.push(`${destination.name || 'Destination tournament'} must start after ${source.name || 'source tournament'} ends.`);
    }
  });

  const issues = [
    !structureValidation.valid ? structureValidation.message ?? 'Create a valid season tree.' : null,
    planned.length === 0 ? 'Add at least one tournament to the plan.' : null,
    missingConfig.length > 0 ? `${missingConfig.length} tournament${missingConfig.length === 1 ? '' : 's'} missing format, team size, max teams, or registration type.` : null,
    missingSchedule.length > 0 ? `${missingSchedule.length} tournament${missingSchedule.length === 1 ? '' : 's'} missing required schedule fields.` : null,
    invalidSchedule.length > 0 ? `${invalidSchedule.length} tournament${invalidSchedule.length === 1 ? '' : 's'} have invalid schedule order.` : null,
    invalidRules.length > 0 ? 'Fix rule placement ranges before review.' : null,
    ...domainIssues,
  ].filter(Boolean) as string[];

  return { planned, missingConfig, missingSchedule, invalidSchedule, invalidRules, connectionCount, hasRuleDestination, domainIssues, issues };
}

// ── Tree builder ────────────────────────────────────────────────────────────

export function buildSeasonTreeFromDrafts(
  _seasonId: string,
  nodes: SeasonBuilderNode[],
): SeasonTreeNode[] {
  const roots = nodes.filter((n) => n.nodeType === 'root' || !n.parentNodeId);

  const buildChildren = (parentId: string): SeasonTreeNode[] =>
    nodes
      .filter((n) => n.parentNodeId === parentId && n.id !== parentId)
      .map((n) => ({
        id: n.id,
        name: n.name,
        type: n.nodeType,
        status: n.status,
        children: n.id ? buildChildren(n.id) : undefined,
      }));

  return roots.map((n) => ({
    id: n.id,
    name: n.name,
    type: n.nodeType,
    status: n.status,
    children: n.id ? buildChildren(n.id) : undefined,
  }));
}
