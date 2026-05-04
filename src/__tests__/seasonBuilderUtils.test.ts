import { describe, it, expect } from 'vitest';

import {
  validateSeasonBuilderNodes,
  isTournamentConfigComplete,
  getPhaseMetaForType,
  validateAdvancementGraph,
  createSeasonBuilderRootNode,
  createSeasonBuilderNode,
} from '@/components/season/builder/seasonBuilderUtils';

import type { SeasonBuilderNode, SeasonStageTournamentConfig } from '@/types/season';
import { DEFAULT_TOURNAMENT_CONFIG } from '@/types/season';

// ─────────────────────────────────────────────────────────────────────────────
// Test helpers
// ─────────────────────────────────────────────────────────────────────────────

const FIXED_ROOT_ID = 'root-id-fixed';
const FIXED_NODE_ID = 'node-id-fixed';
const FIXED_NODE_ID_2 = 'node-id-fixed-2';
const FIXED_NODE_ID_3 = 'node-id-fixed-3';

/** Build a root node with a deterministic ID for tests. */
const makeRoot = (id = FIXED_ROOT_ID): SeasonBuilderNode => ({
  ...createSeasonBuilderRootNode(),
  id,
});

/** Build a non-root node with deterministic IDs. */
const makeNode = (
  overrides: Partial<SeasonBuilderNode> & { id?: string } = {},
): SeasonBuilderNode => ({
  ...createSeasonBuilderNode(FIXED_ROOT_ID, 1, 'qualifier'),
  id: FIXED_NODE_ID,
  parentNodeId: FIXED_ROOT_ID,
  name: 'Qualifier 1',
  ...overrides,
});

/** Minimal set of first-class tournament config fields that make isTournamentConfigComplete → true. */
const COMPLETE_CONFIG_FIELDS = {
  tournamentFormat: 'single_elimination' as const,
  teamSize: 5,
  maxTeams: 8,
  registrationType: 'open' as const,
};

/** Build a builder node that passes isTournamentConfigComplete. */
const makeConfiguredNode = (
  overrides: Partial<SeasonBuilderNode> = {},
): SeasonBuilderNode =>
  makeNode({ ...COMPLETE_CONFIG_FIELDS, ...overrides } as Partial<SeasonBuilderNode>);

/** Build a SeasonStageTournamentConfig for isTournamentConfigComplete tests. */
const makeConfig = (
  overrides: Partial<SeasonStageTournamentConfig> = {},
): SeasonStageTournamentConfig => ({
  ...DEFAULT_TOURNAMENT_CONFIG,
  ...overrides,
});

// ─────────────────────────────────────────────────────────────────────────────
// validateSeasonBuilderNodes
// ─────────────────────────────────────────────────────────────────────────────

describe('validateSeasonBuilderNodes', () => {
  it('returns invalid with "at least one tournament" message when array is empty', () => {
    const result = validateSeasonBuilderNodes([]);
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/at least one tournament/i);
  });

  it('returns invalid when only a root node is present', () => {
    const root = makeRoot();
    const result = validateSeasonBuilderNodes([root]);
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/at least one tournament/i);
  });

  it('returns invalid with name error when a non-root node has no name', () => {
    const root = makeRoot();
    const unnamed = makeNode({ name: '' });
    const result = validateSeasonBuilderNodes([root, unnamed]);
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/name every planned tournament/i);
    expect(result.nodeId).toBe(unnamed.id);
  });

  it('returns invalid when node has name but tournament config is incomplete', () => {
    const root = makeRoot();
    // Has a name but no tournament config — config is incomplete
    const node = makeNode({ name: 'Open Qualifier' });
    const result = validateSeasonBuilderNodes([root, node]);
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/finish the tournament setup/i);
    expect(result.nodeId).toBe(node.id);
  });

  it('returns valid for root + single configured qualifier (no outgoing — generates warning only)', () => {
    const root = makeRoot();
    const node = makeConfiguredNode({ name: 'Open Qualifier', nodeType: 'qualifier' });
    const result = validateSeasonBuilderNodes([root, node]);
    // A qualifier with no outgoing connections is a WARNING, not an error → valid: true
    expect(result.valid).toBe(true);
    expect(result.message).toBeNull();
    expect(result.warnings.length).toBeGreaterThanOrEqual(1);
    expect(result.warnings[0]).toMatch(/no advancement target/i);
  });

  it('returns valid with no warnings when root + final (finals are terminal by definition)', () => {
    const root = makeRoot();
    const finalNode = makeConfiguredNode({
      id: FIXED_NODE_ID,
      name: 'Grand Finals',
      nodeType: 'final',
    });
    const result = validateSeasonBuilderNodes([root, finalNode]);
    expect(result.valid).toBe(true);
    expect(result.message).toBeNull();
    expect(result.warnings).toHaveLength(0);
  });

  it('returns schedule error when registration deadline is after start date', () => {
    const root = makeRoot();
    const node = makeConfiguredNode({
      name: 'LAN Qualifier',
      registrationDeadline: '2025-06-15',
      startsAt: '2025-06-10', // starts before deadline closes
    });
    const result = validateSeasonBuilderNodes([root, node]);
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/closes registration after it starts/i);
  });

  it('returns schedule error when end date is before start date', () => {
    const root = makeRoot();
    const node = makeConfiguredNode({
      name: 'LAN Event',
      startsAt: '2025-07-20',
      endsAt: '2025-07-18',
    });
    const result = validateSeasonBuilderNodes([root, node]);
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/ends before it starts/i);
  });

  it('returns nodeId pointing to the problematic node for name errors', () => {
    const root = makeRoot();
    const good = makeConfiguredNode({ id: FIXED_NODE_ID, name: 'Regional Event' });
    const bad = makeNode({ id: FIXED_NODE_ID_2, name: '  ' }); // whitespace-only name
    const result = validateSeasonBuilderNodes([root, good, bad]);
    expect(result.valid).toBe(false);
    expect(result.nodeId).toBe(bad.id);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// isTournamentConfigComplete
// ─────────────────────────────────────────────────────────────────────────────

describe('isTournamentConfigComplete', () => {
  it('returns false for DEFAULT_TOURNAMENT_CONFIG (null format, null teamSize, null maxTeams)', () => {
    expect(isTournamentConfigComplete(DEFAULT_TOURNAMENT_CONFIG)).toBe(false);
  });

  it('returns false when only format is set', () => {
    const config = makeConfig({ format: 'single_elimination' });
    expect(isTournamentConfigComplete(config)).toBe(false);
  });

  it('returns false when format + teamSize are set but maxTeams is missing', () => {
    const config = makeConfig({ format: 'single_elimination', teamSize: 5, maxTeams: null });
    expect(isTournamentConfigComplete(config)).toBe(false);
  });

  it('returns false when format + teamSize + maxTeams set but registrationType is missing', () => {
    const config = makeConfig({
      format: 'single_elimination',
      teamSize: 5,
      maxTeams: 8,
      registrationType: null,
    });
    expect(isTournamentConfigComplete(config)).toBe(false);
  });

  it('returns false when maxTeams is less than 2', () => {
    const config = makeConfig({
      format: 'double_elimination',
      teamSize: 5,
      maxTeams: 1,
      registrationType: 'open',
    });
    expect(isTournamentConfigComplete(config)).toBe(false);
  });

  it('returns false when teamSize is 0', () => {
    const config = makeConfig({
      format: 'round_robin',
      teamSize: 0,
      maxTeams: 8,
      registrationType: 'open',
    });
    expect(isTournamentConfigComplete(config)).toBe(false);
  });

  it('returns true for a fully configured config (format + teamSize + maxTeams + registrationType)', () => {
    const config = makeConfig({
      format: 'single_elimination',
      teamSize: 5,
      maxTeams: 8,
      registrationType: 'open',
    });
    expect(isTournamentConfigComplete(config)).toBe(true);
  });

  it('returns true with invite registration type', () => {
    const config = makeConfig({
      format: 'double_elimination',
      teamSize: 3,
      maxTeams: 16,
      registrationType: 'invite',
    });
    expect(isTournamentConfigComplete(config)).toBe(true);
  });

  it('returns true with maxTeams equal to 2 (boundary)', () => {
    const config = makeConfig({
      format: 'single_elimination',
      teamSize: 5,
      maxTeams: 2,
      registrationType: 'open',
    });
    expect(isTournamentConfigComplete(config)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getPhaseMetaForType
// ─────────────────────────────────────────────────────────────────────────────

describe('getPhaseMetaForType', () => {
  it('returns meta for "qualifier" with expected shape', () => {
    const meta = getPhaseMetaForType('qualifier');
    expect(meta).toBeDefined();
    expect(meta.label).toBe('Qualifiers');
    expect(typeof meta.accent).toBe('string');
    expect(typeof meta.accentBg).toBe('string');
    expect(typeof meta.accentBorder).toBe('string');
  });

  it('returns meta for "event"', () => {
    const meta = getPhaseMetaForType('event');
    expect(meta).toBeDefined();
    expect(meta.label).toBe('Events');
  });

  it('returns meta for "stage"', () => {
    const meta = getPhaseMetaForType('stage');
    expect(meta).toBeDefined();
    expect(meta.label).toBe('Stages');
  });

  it('returns meta for "final"', () => {
    const meta = getPhaseMetaForType('final');
    expect(meta).toBeDefined();
    expect(meta.label).toBe('Finals');
  });

  it('returns meta for "custom"', () => {
    const meta = getPhaseMetaForType('custom');
    expect(meta).toBeDefined();
    expect(meta.label).toBe('Custom');
  });

  it('each known type has distinct label values', () => {
    const labels = (['qualifier', 'event', 'stage', 'final', 'custom'] as const).map(
      (t) => getPhaseMetaForType(t).label,
    );
    const unique = new Set(labels);
    expect(unique.size).toBe(labels.length);
  });

  it('returns undefined for an unknown type (runtime fallback — no throw)', () => {
    // Cast to bypass TypeScript to test runtime behaviour
    const meta = getPhaseMetaForType('unknown' as any);
    expect(meta).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// validateAdvancementGraph
// ─────────────────────────────────────────────────────────────────────────────

describe('validateAdvancementGraph', () => {
  it('returns no issues for an empty node list', () => {
    const issues = validateAdvancementGraph([]);
    expect(issues).toHaveLength(0);
  });

  it('returns no issues for a root-only list (root is excluded from stages)', () => {
    const root = makeRoot();
    const issues = validateAdvancementGraph([root]);
    expect(issues).toHaveLength(0);
  });

  it('returns an error when a node has a self-referential advancement connection', () => {
    const root = makeRoot();
    const node = makeNode({
      id: FIXED_NODE_ID,
      name: 'Qualifier A',
      outgoing_advancement_connections: [
        {
          id: 'conn-1',
          fromNodeId: FIXED_NODE_ID,
          toNodeId: FIXED_NODE_ID, // points to itself
          ruleType: 'top_n',
          ruleValue: 3,
          seedMode: 'preserve_seed',
          label: null,
        },
      ],
    });
    const issues = validateAdvancementGraph([root, node]);
    const errors = issues.filter((i) => i.severity === 'error');
    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors[0].message).toMatch(/cannot advance into itself/i);
  });

  it('returns an error when advancement ruleValue is 0 or negative', () => {
    const root = makeRoot();
    const nodeA = makeNode({
      id: FIXED_NODE_ID,
      name: 'Qualifier A',
      outgoing_advancement_connections: [
        {
          id: 'conn-1',
          fromNodeId: FIXED_NODE_ID,
          toNodeId: FIXED_NODE_ID_2,
          ruleType: 'top_n',
          ruleValue: 0, // invalid
          seedMode: 'preserve_seed',
          label: null,
        },
      ],
    });
    const nodeB = makeNode({ id: FIXED_NODE_ID_2, name: 'Final', nodeType: 'final' });
    const issues = validateAdvancementGraph([root, nodeA, nodeB]);
    const errors = issues.filter((i) => i.severity === 'error');
    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors.some((e) => e.message.match(/at least 1 team/i))).toBe(true);
  });

  it('returns an error when a connection references a node that does not exist', () => {
    const root = makeRoot();
    const node = makeNode({
      id: FIXED_NODE_ID,
      name: 'Qualifier A',
      outgoing_advancement_connections: [
        {
          id: 'conn-1',
          fromNodeId: FIXED_NODE_ID,
          toNodeId: 'non-existent-id',
          ruleType: 'top_n',
          ruleValue: 3,
          seedMode: 'preserve_seed',
          label: null,
        },
      ],
    });
    const issues = validateAdvancementGraph([root, node]);
    const errors = issues.filter((i) => i.severity === 'error');
    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors[0].message).toMatch(/no longer exists/i);
  });

  it('detects a cycle between two nodes advancing into each other', () => {
    const root = makeRoot();
    const nodeA = makeNode({
      id: FIXED_NODE_ID,
      name: 'Stage A',
      nodeType: 'qualifier',
      outgoing_advancement_connections: [
        {
          id: 'conn-a-b',
          fromNodeId: FIXED_NODE_ID,
          toNodeId: FIXED_NODE_ID_2,
          ruleType: 'top_n',
          ruleValue: 2,
          seedMode: 'preserve_seed',
          label: null,
        },
      ],
    });
    const nodeB = makeNode({
      id: FIXED_NODE_ID_2,
      name: 'Stage B',
      nodeType: 'qualifier',
      parentNodeId: FIXED_ROOT_ID,
      outgoing_advancement_connections: [
        {
          id: 'conn-b-a',
          fromNodeId: FIXED_NODE_ID_2,
          toNodeId: FIXED_NODE_ID, // cycle back to A
          ruleType: 'top_n',
          ruleValue: 2,
          seedMode: 'preserve_seed',
          label: null,
        },
      ],
    });
    const issues = validateAdvancementGraph([root, nodeA, nodeB]);
    const cycleErrors = issues.filter(
      (i) => i.severity === 'error' && i.message.match(/cycle detected/i),
    );
    expect(cycleErrors.length).toBeGreaterThanOrEqual(1);
  });

  it('returns a warning for a non-final stage with no outgoing connections', () => {
    const root = makeRoot();
    const node = makeNode({
      id: FIXED_NODE_ID,
      name: 'Open Qualifier',
      nodeType: 'qualifier',
      outgoing_advancement_connections: [],
    });
    const issues = validateAdvancementGraph([root, node]);
    const warnings = issues.filter((i) => i.severity === 'warning');
    expect(warnings.length).toBeGreaterThanOrEqual(1);
    expect(warnings[0].message).toMatch(/no advancement target/i);
  });

  it('does not warn about missing outgoing connections for a "final" node', () => {
    const root = makeRoot();
    const finalNode = makeNode({
      id: FIXED_NODE_ID,
      name: 'Grand Finals',
      nodeType: 'final',
      outgoing_advancement_connections: [],
    });
    const issues = validateAdvancementGraph([root, finalNode]);
    const warnings = issues.filter((i) => i.severity === 'warning');
    expect(warnings).toHaveLength(0);
  });

  it('returns an error when no terminal stage exists (all non-final nodes have outgoing connections)', () => {
    // Two qualifiers each pointing to each other — no final, no dead-end stage
    // However since a cycle also exists, we just check for at least one error.
    // A simpler scenario: one stage with outgoing to another, neither is final,
    // and the target also has outgoing pointing somewhere non-existent... tricky.
    // Easiest: single qualifier pointing to a final that also has an outgoing
    // connection to another qualifier, but that means the final has outgoing → not terminal.
    // The rule: "hasTerminal = some node is 'final' OR has no outgoing"
    // So 2 qualifiers each with outgoing to each other → neither is terminal → error.
    const root = makeRoot();
    const nodeA: SeasonBuilderNode = {
      ...makeNode({ id: FIXED_NODE_ID, name: 'Stage A', nodeType: 'qualifier' }),
      outgoing_advancement_connections: [
        {
          id: 'conn-a-b',
          fromNodeId: FIXED_NODE_ID,
          toNodeId: FIXED_NODE_ID_2,
          ruleType: 'top_n',
          ruleValue: 2,
          seedMode: 'preserve_seed',
          label: null,
        },
      ],
    };
    const nodeB: SeasonBuilderNode = {
      ...makeNode({ id: FIXED_NODE_ID_2, name: 'Stage B', nodeType: 'qualifier' }),
      outgoing_advancement_connections: [
        {
          id: 'conn-b-a',
          fromNodeId: FIXED_NODE_ID_2,
          toNodeId: FIXED_NODE_ID,
          ruleType: 'top_n',
          ruleValue: 2,
          seedMode: 'preserve_seed',
          label: null,
        },
      ],
    };
    const issues = validateAdvancementGraph([root, nodeA, nodeB]);
    // There's a cycle AND no terminal stage — at least one error is expected
    const errors = issues.filter((i) => i.severity === 'error');
    expect(errors.length).toBeGreaterThanOrEqual(1);
  });

  it('returns no errors for a valid linear chain: qualifier → final', () => {
    const root = makeRoot();
    const qualifier: SeasonBuilderNode = {
      ...makeNode({ id: FIXED_NODE_ID, name: 'Regional Qualifier', nodeType: 'qualifier' }),
      outgoing_advancement_connections: [
        {
          id: 'conn-q-f',
          fromNodeId: FIXED_NODE_ID,
          toNodeId: FIXED_NODE_ID_2,
          ruleType: 'top_n',
          ruleValue: 4,
          seedMode: 'preserve_seed',
          label: null,
        },
      ],
    };
    const finalNode: SeasonBuilderNode = {
      ...makeNode({ id: FIXED_NODE_ID_2, name: 'Grand Finals', nodeType: 'final' }),
      outgoing_advancement_connections: [],
    };
    const issues = validateAdvancementGraph([root, qualifier, finalNode]);
    const errors = issues.filter((i) => i.severity === 'error');
    expect(errors).toHaveLength(0);
  });

  it('returns no errors for a three-stage chain: qualifier → event → final', () => {
    const root = makeRoot();
    const qualifier: SeasonBuilderNode = {
      ...makeNode({ id: FIXED_NODE_ID, name: 'Qualifier', nodeType: 'qualifier' }),
      outgoing_advancement_connections: [
        {
          id: 'conn-q-e',
          fromNodeId: FIXED_NODE_ID,
          toNodeId: FIXED_NODE_ID_2,
          ruleType: 'top_n',
          ruleValue: 8,
          seedMode: 'preserve_seed',
          label: null,
        },
      ],
    };
    const event: SeasonBuilderNode = {
      ...makeNode({ id: FIXED_NODE_ID_2, name: 'Regional Final', nodeType: 'event' }),
      outgoing_advancement_connections: [
        {
          id: 'conn-e-f',
          fromNodeId: FIXED_NODE_ID_2,
          toNodeId: FIXED_NODE_ID_3,
          ruleType: 'top_n',
          ruleValue: 4,
          seedMode: 'preserve_seed',
          label: null,
        },
      ],
    };
    const finalNode: SeasonBuilderNode = {
      ...makeNode({ id: FIXED_NODE_ID_3, name: 'Grand Finals', nodeType: 'final' }),
      outgoing_advancement_connections: [],
    };
    const issues = validateAdvancementGraph([root, qualifier, event, finalNode]);
    const errors = issues.filter((i) => i.severity === 'error');
    expect(errors).toHaveLength(0);
  });
});
