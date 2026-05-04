import type {
  AdvancementConnection,
  OrganizerTournamentOption,
  SeasonBuilderNode,
  SeasonNode,
  SeasonNodeDraft,
  SeasonNodeMetadata,
  SeasonNodeType,
  SeasonStageTournamentConfig,
  SeasonTreeNode,
} from '@/types/season';
import { DEFAULT_TOURNAMENT_CONFIG } from '@/types/season';

const createDraftUuid = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (token) => {
    const random = Math.floor(Math.random() * 16);
    const value = token === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
};

const withDisplayOrders = (nodes: SeasonBuilderNode[]) =>
  nodes.map((node, index) => ({
    ...node,
    displayOrder: index,
  }));

export const createSeasonBuilderNode = (
  parentNodeId: string | null,
  displayOrder: number,
  nodeType: Exclude<SeasonNodeType, 'root'> = 'qualifier',
): SeasonBuilderNode => ({
  id: createDraftUuid(),
  parentNodeId,
  name: '',
  nodeType,
  displayOrder,
  status: 'draft',
  slug: '',
  region: '',
  city: '',
  country: '',
  linkedTournamentId: null,
  linkedStageId: '',
  registrationDeadline: '',
  startsAt: '',
  endsAt: '',
  metadata: null,
});

export const createSeasonBuilderRootNode = (name = 'Season Tree'): SeasonBuilderNode => ({
  ...createSeasonBuilderNode(null, 0, 'custom'),
  name,
  nodeType: 'root',
  parentNodeId: null,
});

export const normalizeSeasonBuilderNodes = (nodes: SeasonBuilderNode[]): SeasonBuilderNode[] => {
  if (nodes.length === 0) {
    return [createSeasonBuilderRootNode()];
  }

  const firstRoot = nodes.find((node) => node.nodeType === 'root') ?? nodes[0];
  const rootId = firstRoot.id;
  const validIds = new Set(nodes.map((node) => node.id));

  const normalized = nodes.map((node) => {
    if (node.id === rootId) {
      return {
        ...node,
        nodeType: 'root' as const,
        parentNodeId: null,
      };
    }

    return {
      ...node,
      nodeType: node.nodeType === 'root' ? ('custom' as const) : node.nodeType,
      parentNodeId:
        node.parentNodeId && validIds.has(node.parentNodeId) && node.parentNodeId !== node.id
          ? node.parentNodeId
          : rootId,
    };
  });

  const ordered = [
    normalized.find((node) => node.id === rootId)!,
    ...normalized.filter((node) => node.id !== rootId),
  ];

  return withDisplayOrders(ordered);
};

export const hydrateSeasonBuilderNodes = (nodes: SeasonNode[]): SeasonBuilderNode[] =>
  normalizeSeasonBuilderNodes(
    nodes
      .slice()
      .sort((left, right) => left.displayOrder - right.displayOrder)
      .map((node) => ({
        id: node.id,
        parentNodeId: node.parentNodeId,
        name: node.name,
        nodeType: node.nodeType,
        displayOrder: node.displayOrder,
        status: node.status,
        slug: node.slug ?? '',
        region: node.region ?? '',
        city: node.city ?? '',
        country: node.country ?? '',
        linkedTournamentId: node.linkedTournamentId ?? null,
        linkedStageId: node.linkedStageId ?? '',
        registrationDeadline: node.registrationDeadline?.slice(0, 10) ?? '',
        startsAt: node.startsAt?.slice(0, 10) ?? '',
        endsAt: node.endsAt?.slice(0, 10) ?? '',
        metadata: (node.metadata as Record<string, unknown> | null | undefined) ?? null,
        // Inline tournament config from first-class columns
        tournamentFormat: node.tournamentFormat ?? null,
        teamSize: node.teamSize ?? null,
        maxTeams: node.maxTeams ?? null,
        minTeams: node.minTeams ?? null,
        bestOf: node.bestOf ?? null,
        registrationType: node.registrationType ?? null,
        entryFee: node.entryFee ?? null,
        prizePool: node.prizePool ?? null,
        checkInMinutesBefore: node.checkInMinutesBefore ?? null,
        registrationOpensAt: node.registrationOpensAt ?? '',
        publishedTournamentId: node.publishedTournamentId ?? null,
        // Outgoing advancement connections from API
        outgoing_advancement_connections: node.outgoingAdvancementConnections ?? [],
      })),
  );

export const buildSeasonTreeFromDrafts = (
  seasonId: string,
  nodes: Array<SeasonNodeDraft | SeasonBuilderNode>,
): SeasonTreeNode[] => {
  const nodeMap = new Map<string, SeasonTreeNode>();
  const roots: SeasonTreeNode[] = [];

  nodes.forEach((node, index) => {
    const id = node.id ?? `draft-${index}`;
    nodeMap.set(id, {
      id,
      seasonId,
      parentNodeId: node.parentNodeId,
      name: node.name || `Node ${index + 1}`,
      slug: node.slug ?? null,
      nodeType: node.nodeType,
      displayOrder: node.displayOrder,
      region: node.region ?? null,
      city: node.city ?? null,
      country: node.country ?? null,
      linkedTournamentId: node.linkedTournamentId ?? null,
      linkedStageId: node.linkedStageId ?? null,
      status: node.status,
      registrationDeadline: node.registrationDeadline ?? null,
      startsAt: node.startsAt ?? null,
      endsAt: node.endsAt ?? null,
      metadata: node.metadata ?? null,
      createdAt: '',
      updatedAt: '',
      linkedTournamentName: null,
      linkedStageName: null,
      children: [],
      // Inline tournament config (first-class columns)
      tournamentFormat: (node as any).tournamentFormat ?? null,
      teamSize: (node as any).teamSize ?? null,
      maxTeams: (node as any).maxTeams ?? null,
      minTeams: (node as any).minTeams ?? null,
      bestOf: (node as any).bestOf ?? null,
      registrationType: (node as any).registrationType ?? null,
      entryFee: (node as any).entryFee ?? null,
      prizePool: (node as any).prizePool ?? null,
      checkInMinutesBefore: (node as any).checkInMinutesBefore ?? null,
      registrationOpensAt: (node as any).registrationOpensAt ?? null,
      publishedTournamentId: (node as any).publishedTournamentId ?? null,
      // Outgoing advancement connections
      outgoingAdvancementConnections: (node as any).outgoing_advancement_connections ?? [],
    });
  });

  nodeMap.forEach((node) => {
    if (node.parentNodeId && nodeMap.has(node.parentNodeId)) {
      nodeMap.get(node.parentNodeId)?.children.push(node);
      return;
    }

    roots.push(node);
  });

  const sortRecursively = (items: SeasonTreeNode[]) => {
    items.sort((left, right) => left.displayOrder - right.displayOrder || left.name.localeCompare(right.name));
    items.forEach((item) => sortRecursively(item.children));
  };

  sortRecursively(roots);
  return roots;
};

export const getNodeDepth = (nodes: SeasonBuilderNode[], nodeId: string) => {
  const parentMap = new Map(nodes.map((node) => [node.id, node.parentNodeId]));
  const visited = new Set<string>();
  let depth = 0;
  let currentParentId = parentMap.get(nodeId) ?? null;

  while (currentParentId) {
    if (visited.has(currentParentId)) {
      break;
    }

    visited.add(currentParentId);
    depth += 1;
    currentParentId = parentMap.get(currentParentId) ?? null;
  }

  return depth;
};

export const getDescendantIds = (nodes: SeasonBuilderNode[], nodeId: string) => {
  const descendants = new Set<string>();
  const childrenByParent = new Map<string, string[]>();

  nodes.forEach((node) => {
    if (!node.parentNodeId) return;
    const children = childrenByParent.get(node.parentNodeId) ?? [];
    children.push(node.id);
    childrenByParent.set(node.parentNodeId, children);
  });

  const visit = (currentId: string) => {
    const children = childrenByParent.get(currentId) ?? [];
    children.forEach((childId) => {
      if (descendants.has(childId)) return;
      descendants.add(childId);
      visit(childId);
    });
  };

  visit(nodeId);
  return descendants;
};

export const getAvailableParentOptions = (nodes: SeasonBuilderNode[], nodeId: string) => {
  const blockedIds = getDescendantIds(nodes, nodeId);
  blockedIds.add(nodeId);

  return nodes.filter((node) => !blockedIds.has(node.id));
};

export const replaceRootNodeId = (nodes: SeasonBuilderNode[], rootNodeId: string) => {
  const normalized = normalizeSeasonBuilderNodes(nodes);
  const currentRootId = normalized[0]?.id;

  if (!currentRootId || currentRootId === rootNodeId) {
    return normalized;
  }

  return normalized.map((node, index) => ({
    ...node,
    id: index === 0 ? rootNodeId : node.id,
    parentNodeId: node.parentNodeId === currentRootId ? rootNodeId : node.parentNodeId,
  }));
};

export const toSeasonNodeDraftPayload = (nodes: SeasonBuilderNode[]): SeasonNodeDraft[] =>
  normalizeSeasonBuilderNodes(nodes).map((node) => ({
    id: node.id,
    parentNodeId: node.parentNodeId,
    name: node.name.trim(),
    nodeType: node.nodeType,
    displayOrder: node.displayOrder,
    status: node.status,
    slug: node.slug?.trim() ?? '',
    region: node.region?.trim() ?? '',
    city: node.city?.trim() ?? '',
    country: node.country?.trim() ?? '',
    linkedTournamentId: node.linkedTournamentId ?? null,
    linkedStageId: node.linkedStageId?.trim() ?? '',
    registrationDeadline: node.registrationDeadline || '',
    startsAt: node.startsAt || '',
    endsAt: node.endsAt || '',
    metadata: node.metadata ?? null,
    // Inline tournament config (first-class columns to backend)
    tournamentFormat: (node as any).tournamentFormat ?? null,
    teamSize: (node as any).teamSize ?? null,
    maxTeams: (node as any).maxTeams ?? null,
    minTeams: (node as any).minTeams ?? null,
    bestOf: (node as any).bestOf ?? null,
    registrationType: (node as any).registrationType ?? null,
    entryFee: (node as any).entryFee ?? null,
    prizePool: (node as any).prizePool ?? null,
    checkInMinutesBefore: (node as any).checkInMinutesBefore ?? null,
    registrationOpensAt: (node as any).registrationOpensAt || '',
    publishedTournamentId: (node as any).publishedTournamentId ?? null,
    // Outgoing advancement connections (to be sent to season_advancement_connections table)
    outgoing_advancement_connections: (node as any).outgoing_advancement_connections ?? [],
  }));

export const validateSeasonBuilderNodes = (nodes: SeasonBuilderNode[]) => {
  const normalized = normalizeSeasonBuilderNodes(nodes);
  const plannedTournaments = normalized.filter((node) => node.nodeType !== 'root');

  if (plannedTournaments.length === 0) {
    return {
      valid: false,
      message: 'Add at least one tournament to the season flow before continuing.',
      nodeId: normalized[0]?.id ?? null,
      warnings: [],
    };
  }

  const unnamedNode = plannedTournaments.find((node) => node.name.trim().length === 0);

  if (unnamedNode) {
    return {
      valid: false,
      message: 'Name every planned tournament before continuing.',
      nodeId: unnamedNode.id,
      warnings: [],
    };
  }

  const incompleteTournament = plannedTournaments.find(
    (node) => !isTournamentConfigComplete(readTournamentConfig(node)),
  );

  if (incompleteTournament) {
    return {
      valid: false,
      message: `Finish the tournament setup for "${incompleteTournament.name}" before continuing.`,
      nodeId: incompleteTournament.id,
      warnings: [],
    };
  }

  const scheduleIssue = plannedTournaments.find((node) => {
    const registrationDeadline = node.registrationDeadline?.trim();
    const startsAt = node.startsAt?.trim();
    const endsAt = node.endsAt?.trim();

    if (registrationDeadline && startsAt && registrationDeadline > startsAt) {
      return true;
    }

    if (startsAt && endsAt && endsAt < startsAt) {
      return true;
    }

    return false;
  });

  if (scheduleIssue) {
    const registrationDeadline = scheduleIssue.registrationDeadline?.trim();
    const startsAt = scheduleIssue.startsAt?.trim();

    return {
      valid: false,
      message:
        registrationDeadline && startsAt && registrationDeadline > startsAt
          ? `"${scheduleIssue.name}" closes registration after it starts. Fix the dates before continuing.`
          : `"${scheduleIssue.name}" ends before it starts. Fix the dates before continuing.`,
      nodeId: scheduleIssue.id,
      warnings: [],
    };
  }

  const graphIssues = validateAdvancementGraph(normalized);
  const blockingIssue = graphIssues.find((issue) => issue.severity === 'error');

  if (blockingIssue) {
    return {
      valid: false,
      message: blockingIssue.message,
      nodeId: blockingIssue.nodeId,
      warnings: graphIssues.filter((issue) => issue.severity === 'warning').map((issue) => issue.message),
    };
  }

  return {
    valid: true,
    message: null,
    nodeId: null,
    warnings: graphIssues.filter((issue) => issue.severity === 'warning').map((issue) => issue.message),
  };
};

export const countLinkedTournaments = (nodes: SeasonBuilderNode[], tournaments: OrganizerTournamentOption[]) => {
  const linkedIds = new Set(
    nodes.map((node) => node.linkedTournamentId).filter((value): value is string => Boolean(value)),
  );

  return tournaments.filter((option) => linkedIds.has(option.id)).length;
};

// ─────────────────────────────────────────────────────────────────────────────
// Phase lane helpers
// ─────────────────────────────────────────────────────────────────────────────

export interface PhaseGroup {
  nodeType: Exclude<SeasonNodeType, 'root'>;
  label: string;
  accent: string;
  accentBg: string;
  accentBorder: string;
  nodes: SeasonBuilderNode[];
}

const PHASE_META: Record<
  Exclude<SeasonNodeType, 'root'>,
  { label: string; accent: string; accentBg: string; accentBorder: string }
> = {
  qualifier: { label: 'Qualifiers', accent: 'text-amber-400', accentBg: 'bg-amber-500/10', accentBorder: 'border-amber-500/25' },
  event: { label: 'Events', accent: 'text-violet-400', accentBg: 'bg-violet-500/10', accentBorder: 'border-violet-500/25' },
  stage: { label: 'Stages', accent: 'text-blue-400', accentBg: 'bg-blue-500/10', accentBorder: 'border-blue-500/25' },
  final: { label: 'Finals', accent: 'text-rose-400', accentBg: 'bg-rose-500/10', accentBorder: 'border-rose-500/25' },
  custom: { label: 'Custom', accent: 'text-zinc-400', accentBg: 'bg-zinc-500/10', accentBorder: 'border-zinc-500/25' },
};

const PHASE_ORDER: Exclude<SeasonNodeType, 'root'>[] = ['qualifier', 'event', 'stage', 'final', 'custom'];

export const groupNodesIntoPhases = (nodes: SeasonBuilderNode[]): PhaseGroup[] => {
  const phases: PhaseGroup[] = [];

  for (const type of PHASE_ORDER) {
    const phaseNodes = nodes
      .filter((n) => n.nodeType === type)
      .sort((a, b) => a.displayOrder - b.displayOrder);

    if (phaseNodes.length > 0) {
      const meta = PHASE_META[type];
      phases.push({ nodeType: type, ...meta, nodes: phaseNodes });
    }
  }

  return phases;
};

export const getPhaseMetaForType = (type: Exclude<SeasonNodeType, 'root'>) => PHASE_META[type];

export const getConnectionLabel = (
  node: SeasonBuilderNode,
  allNodes: SeasonBuilderNode[],
): string | null => {
  if (!node.parentNodeId) return null;
  const parent = allNodes.find((n) => n.id === node.parentNodeId);
  if (!parent || parent.nodeType === 'root') return null;
  return parent.name || parent.nodeType;
};

// ─────────────────────────────────────────────────────────────────────────────
// Smart template builders
// ─────────────────────────────────────────────────────────────────────────────

export const buildRegionalCircuit = (
  rootId: string,
  regions: string[],
  options: {
    includeQualifiers: boolean;
    includeRegionalFinals: boolean;
    includeGrandFinal: boolean;
  },
): SeasonBuilderNode[] => {
  const nodes: SeasonBuilderNode[] = [];
  let order = 1;

  const qualifierIds: string[] = [];
  const eventIds: string[] = [];

  if (options.includeQualifiers) {
    for (const region of regions) {
      const node = { ...createSeasonBuilderNode(rootId, order++, 'qualifier'), name: `${region} Qualifier`, region };
      qualifierIds.push(node.id);
      nodes.push(node);
    }
  }

  if (options.includeRegionalFinals) {
    for (let i = 0; i < regions.length; i++) {
      const parentId = options.includeQualifiers ? qualifierIds[i] : rootId;
      const node = {
        ...createSeasonBuilderNode(parentId, order++, 'event'),
        name: `${regions[i]} Finals`,
        region: regions[i],
      };
      eventIds.push(node.id);
      nodes.push(node);
    }
  }

  if (options.includeGrandFinal) {
    // Grand final sits at the root level — it receives from ALL regions via rules,
    // not from any single region's tree branch.
    nodes.push({
      ...createSeasonBuilderNode(rootId, order++, 'final'),
      name: 'Grand Finals',
    });
  }

  return nodes;
};

export const buildSimpleCircuit = (rootId: string, stopCount: number): SeasonBuilderNode[] => {
  const nodes: SeasonBuilderNode[] = [];
  let order = 1;

  for (let i = 1; i <= stopCount; i++) {
    nodes.push({
      ...createSeasonBuilderNode(rootId, order++, 'event'),
      name: `Event ${i}`,
    });
  }

  nodes.push({
    ...createSeasonBuilderNode(rootId, order++, 'final'),
    name: 'Grand Finals',
  });

  return nodes;
};

// ─────────────────────────────────────────────────────────────────────────────
// Inline tournament metadata helpers
// Store per-stage tournament config + advancement in node.metadata until a
// dedicated backend table lands (see migration spec).
// ─────────────────────────────────────────────────────────────────────────────

export const readNodeMetadata = (node: SeasonBuilderNode | SeasonNode): SeasonNodeMetadata => {
  const raw = node.metadata;
  if (!raw || typeof raw !== 'object') return {};
  return raw as SeasonNodeMetadata;
};

export const readTournamentConfig = (node: SeasonBuilderNode | SeasonNode): SeasonStageTournamentConfig => {
  // Prefer first-class columns from backend, fall back to metadata for backward compatibility
  const nodeAny = node as any;
  if (nodeAny.tournamentFormat !== undefined || nodeAny.teamSize !== undefined) {
    return {
      configured: Boolean(nodeAny.tournamentFormat),
      format: nodeAny.tournamentFormat ?? null,
      teamSize: nodeAny.teamSize ?? null,
      maxTeams: nodeAny.maxTeams ?? null,
      minTeams: nodeAny.minTeams ?? null,
      entryFee: nodeAny.entryFee ?? null,
      prizePool: nodeAny.prizePool ?? null,
      currency: 'USD', // Default currency
      registrationType: nodeAny.registrationType ?? null,
      registrationOpensAt: nodeAny.registrationOpensAt ?? null,
      registrationClosesAt: null, // Not in first-class columns yet
      checkInMinutes: nodeAny.checkInMinutesBefore ?? null,
      bestOf: nodeAny.bestOf ?? null,
      mapPool: null,
      rulesUrl: null,
      provisionedTournamentId: nodeAny.publishedTournamentId ?? null,
    };
  }
  // Fall back to metadata for backward compatibility
  const meta = readNodeMetadata(node);
  return { ...DEFAULT_TOURNAMENT_CONFIG, ...(meta.tournamentConfig ?? {}) };
};

export const readOutgoingConnections = (node: SeasonBuilderNode | SeasonNode): AdvancementConnection[] => {
  // Prefer first-class field from backend, fall back to metadata for backward compatibility
  const nodeAny = node as any;
  if (nodeAny.outgoing_advancement_connections !== undefined) {
    return nodeAny.outgoing_advancement_connections ?? [];
  }
  // Fall back to metadata for backward compatibility
  const meta = readNodeMetadata(node);
  return meta.advancement?.outgoing ?? [];
};

export const writeTournamentConfig = (
  node: SeasonBuilderNode,
  patch: Partial<SeasonStageTournamentConfig>,
): SeasonBuilderNode => {
  // Write to first-class fields instead of metadata
  const current = readTournamentConfig(node);
  const next = { ...current, ...patch };
  return {
    ...node,
    tournamentFormat: next.format ?? null,
    teamSize: next.teamSize ?? null,
    maxTeams: next.maxTeams ?? null,
    minTeams: next.minTeams ?? null,
    bestOf: next.bestOf ?? null,
    registrationType: next.registrationType ?? null,
    entryFee: next.entryFee ?? null,
    prizePool: next.prizePool ?? null,
    checkInMinutesBefore: next.checkInMinutes ?? null,
    registrationOpensAt: next.registrationOpensAt ?? null,
    publishedTournamentId: next.provisionedTournamentId ?? null,
  };
};

export const writeOutgoingConnections = (
  node: SeasonBuilderNode,
  connections: AdvancementConnection[],
): SeasonBuilderNode => {
  // Write to first-class field instead of metadata
  return {
    ...node,
    outgoing_advancement_connections: connections,
  };
};

export const isTournamentConfigComplete = (config: SeasonStageTournamentConfig): boolean => {
  return Boolean(
    config.format &&
    config.teamSize && config.teamSize > 0 &&
    config.maxTeams && config.maxTeams >= 2 &&
    config.registrationType,
  );
};

export const countConfiguredStages = (nodes: SeasonBuilderNode[]): { configured: number; total: number } => {
  const stages = nodes.filter((n) => n.nodeType !== 'root');
  const configured = stages.filter((n) => isTournamentConfigComplete(readTournamentConfig(n))).length;
  return { configured, total: stages.length };
};

// ─────────────────────────────────────────────────────────────────────────────
// Advancement graph validation
// ─────────────────────────────────────────────────────────────────────────────

export interface AdvancementValidationIssue {
  severity: 'error' | 'warning';
  nodeId: string | null;
  message: string;
}

/** Detect cycles, orphan connections, and terminal-stage coverage. */
export const validateAdvancementGraph = (nodes: SeasonBuilderNode[]): AdvancementValidationIssue[] => {
  const issues: AdvancementValidationIssue[] = [];
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const stages = nodes.filter((n) => n.nodeType !== 'root');

  // Build adjacency from outgoing connections
  const adjacency = new Map<string, string[]>();
  stages.forEach((n) => {
    const outgoing = readOutgoingConnections(n);
    outgoing.forEach((conn) => {
      if (!nodeMap.has(conn.toNodeId)) {
        issues.push({
          severity: 'error',
          nodeId: n.id,
          message: `"${n.name || 'Untitled stage'}" advances to a stage that no longer exists. Remove or fix the connection.`,
        });
        return;
      }
      if (conn.toNodeId === n.id) {
        issues.push({
          severity: 'error',
          nodeId: n.id,
          message: `"${n.name || 'Untitled stage'}" cannot advance into itself.`,
        });
        return;
      }
      if (conn.ruleValue <= 0) {
        issues.push({
          severity: 'error',
          nodeId: n.id,
          message: `Advancement from "${n.name || 'Untitled stage'}" must send at least 1 team.`,
        });
      }
      const neighbours = adjacency.get(n.id) ?? [];
      neighbours.push(conn.toNodeId);
      adjacency.set(n.id, neighbours);
    });
  });

  // Cycle detection via DFS
  const WHITE = 0;
  const GREY = 1;
  const BLACK = 2;
  const colour = new Map<string, number>();
  stages.forEach((n) => colour.set(n.id, WHITE));

  const dfs = (start: string): boolean => {
    const stack: Array<{ id: string; iter: number }> = [{ id: start, iter: 0 }];
    colour.set(start, GREY);
    while (stack.length > 0) {
      const frame = stack[stack.length - 1];
      const neighbours = adjacency.get(frame.id) ?? [];
      if (frame.iter >= neighbours.length) {
        colour.set(frame.id, BLACK);
        stack.pop();
        continue;
      }
      const next = neighbours[frame.iter];
      frame.iter += 1;
      const c = colour.get(next) ?? WHITE;
      if (c === GREY) return true;
      if (c === WHITE) {
        colour.set(next, GREY);
        stack.push({ id: next, iter: 0 });
      }
    }
    return false;
  };

  for (const n of stages) {
    if ((colour.get(n.id) ?? WHITE) === WHITE) {
      if (dfs(n.id)) {
        issues.push({
          severity: 'error',
          nodeId: n.id,
          message: `Cycle detected involving "${n.name || 'Untitled stage'}". Teams cannot advance in a loop.`,
        });
        break;
      }
    }
  }

  // Terminal coverage — every non-terminal should have at least one outgoing
  // connection, unless it is a Final (which is terminal by definition).
  stages.forEach((n) => {
    const outgoing = readOutgoingConnections(n);
    if (n.nodeType === 'final') return;
    if (outgoing.length === 0) {
      issues.push({
        severity: 'warning',
        nodeId: n.id,
        message: `"${n.name || 'Untitled stage'}" has no advancement target. Teams finishing here will not progress anywhere.`,
      });
    }
  });

  // Must have at least one terminal stage
  const hasTerminal = stages.some((n) => n.nodeType === 'final' || readOutgoingConnections(n).length === 0);
  if (!hasTerminal && stages.length > 0) {
    issues.push({
      severity: 'error',
      nodeId: null,
      message: 'Your season has no terminal stage. Add a Grand Final or Playoff for the season to conclude.',
    });
  }

  return issues;
};
