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
