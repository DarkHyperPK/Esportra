import { describe, expect, it } from 'vitest';
import { proposalSchema } from '@/schemas/proposal';
import { createPlatformProposal, createProposal, createTournamentProposal } from '../defaults';
import { brandLabel, fillTokens, formatLongDate, formatMoney, joinFacts } from '../format';
import { appendAtPath, getAtPath, moveAtPath, removeAtPath, setAtPath } from '../path';
import {
  buildExport,
  duplicateProposal,
  mergeImported,
  parseImport,
  parseStored,
  serializeProposals,
  sortByUpdated,
  upsertProposal,
} from '../storage';

const NOW = new Date('2026-09-30T10:00:00.000Z');

describe('defaults', () => {
  it('produce documents that satisfy the schema', () => {
    expect(proposalSchema.safeParse(createTournamentProposal(NOW)).success).toBe(true);
    expect(proposalSchema.safeParse(createPlatformProposal(NOW)).success).toBe(true);
  });

  it('keeps Stage 2 tier prices and cumulative social posts', () => {
    const doc = createTournamentProposal(NOW);
    expect(doc.tiers.map((t) => t.price)).toEqual([30000, 60000, 100000, 150000]);
    expect(doc.zoneRows.every((r) => r.cells.length === doc.tiers.length)).toBe(true);
  });

  it('states no prices or projections for the platform tiers', () => {
    const json = JSON.stringify(createPlatformProposal(NOW));
    expect(json).not.toMatch(/PKR/);
    expect(json.toLowerCase()).not.toContain('projected');
  });

  it('dispatches by kind', () => {
    expect(createProposal('platform', NOW).kind).toBe('platform');
    expect(createProposal('tournament', NOW).kind).toBe('tournament');
  });
});

describe('format', () => {
  it('formats dates and money in full', () => {
    expect(formatLongDate('2026-11-06')).toBe('6 November 2026');
    expect(formatLongDate('soon')).toBe('soon');
    expect(formatMoney('PKR', 150000)).toBe('PKR 150,000');
  });

  it('fills brand and industry tokens with fallbacks', () => {
    const doc = createTournamentProposal(NOW);
    expect(brandLabel(doc)).toBe('Your brand');
    expect(fillTokens('For {brand} in {industry}', doc)).toBe('For Your brand in your industry');
    const named = { ...doc, prospect: { ...doc.prospect, brandName: 'TapShop', industry: 'gaming retail' } };
    expect(fillTokens('For {brand} in {industry}', named)).toBe('For TapShop in gaming retail');
  });

  it('joins only non-empty facts', () => {
    expect(joinFacts(['Valorant', '', undefined, '6 November 2026'])).toBe('Valorant · 6 November 2026');
  });
});

describe('path helpers', () => {
  const root = { a: { list: ['x', 'y', 'z'], n: 1 } };

  it('reads and writes without mutating', () => {
    expect(getAtPath(root, 'a.list.1')).toBe('y');
    const next = setAtPath(root, 'a.list.1', 'Y');
    expect(getAtPath(next, 'a.list.1')).toBe('Y');
    expect(root.a.list[1]).toBe('y');
  });

  it('appends, removes and moves list items', () => {
    expect(getAtPath(appendAtPath(root, 'a.list', 'w'), 'a.list')).toEqual(['x', 'y', 'z', 'w']);
    expect(getAtPath(removeAtPath(root, 'a.list', 0), 'a.list')).toEqual(['y', 'z']);
    expect(getAtPath(moveAtPath(root, 'a.list', 2, 0), 'a.list')).toEqual(['z', 'x', 'y']);
    expect(moveAtPath(root, 'a.list', 0, -1)).toBe(root);
  });
});

describe('storage', () => {
  it('round-trips and skips invalid records', () => {
    const doc = createTournamentProposal(NOW);
    expect(parseStored(serializeProposals([doc]))).toEqual([doc]);
    expect(parseStored(JSON.stringify([doc, { kind: 'nope' }]))).toEqual([doc]);
    expect(parseStored('not json')).toEqual([]);
    expect(parseStored(null)).toEqual([]);
  });

  it('sorts newest first and upserts by id', () => {
    const older = { ...createPlatformProposal(NOW), updatedAt: '2026-01-01T00:00:00.000Z' };
    const newer = { ...createTournamentProposal(NOW), updatedAt: '2026-02-01T00:00:00.000Z' };
    expect(sortByUpdated([older, newer])[0].id).toBe(newer.id);
    const edited = { ...older, title: 'Edited' };
    const list = upsertProposal([older, newer], edited);
    expect(list).toHaveLength(2);
    expect(list.find((p) => p.id === older.id)?.title).toBe('Edited');
  });

  it('exports and imports, reporting skipped records', () => {
    const doc = createTournamentProposal(NOW);
    const exported = buildExport([doc], NOW);
    const result = parseImport(exported);
    expect(result).toEqual({ ok: true, proposals: [doc], skipped: 0 });
    const partial = parseImport(JSON.stringify({ proposals: [doc, { bad: true }] }));
    expect(partial).toMatchObject({ ok: true, skipped: 1 });
    expect(parseImport('{').ok).toBe(false);
    expect(parseImport('{"proposals":[{"bad":1}]}').ok).toBe(false);
    expect(parseImport('{"x":1}').ok).toBe(false);
  });

  it('merges imports and duplicates with a fresh id', () => {
    const doc = createTournamentProposal(NOW);
    const copy = duplicateProposal(doc, 'new-id', NOW);
    expect(copy.id).toBe('new-id');
    expect(copy.title).toContain('(copy)');
    expect(mergeImported([doc], [copy])).toHaveLength(2);
  });
});

describe('placements', () => {
  it('maps tournament rows to drawn zones with the first tier that includes them', async () => {
    const { resolveZoneSlots } = await import('../placements');
    const slots = resolveZoneSlots(createTournamentProposal(NOW));
    expect(slots.map((s) => [s.key, s.from])).toEqual([
      ['ticker', 'Title'], ['header', 'Platinum'], ['sidebar', 'Gold'],
      ['badge', 'Silver'], ['matchbar', 'Platinum'], ['overlay', 'Silver'],
    ]);
    expect(slots[0].marker).toBe('01');
  });

  it('maps platform zones and leaves out zones the document does not offer', async () => {
    const { resolveZoneSlots } = await import('../placements');
    const doc = createPlatformProposal(NOW);
    expect(resolveZoneSlots(doc).find((s) => s.key === 'sidebar')?.from).toBe('Ascendant');
    const fewer = { ...doc, zones: doc.zones.filter((z) => z.name === 'Ticker') };
    expect(resolveZoneSlots(fewer).map((s) => s.key)).toEqual(['ticker']);
  });
});

describe('readiness', () => {
  it('flags a missing brand, logo-less partners and mismatched placement rows', async () => {
    const { checkReadiness } = await import('../readiness');
    const doc = createTournamentProposal(NOW);
    const sections = checkReadiness(doc).map((i) => i.sectionId);
    expect(sections).toContain('prospect');
    expect(sections).toContain('partners');
    const broken = { ...doc, zoneRows: [{ zone: 'Sidebar', cells: ['—'] }] };
    expect(checkReadiness(broken).some((i) => i.sectionId === 'placements')).toBe(true);
  });

  it('reads older saved proposals by filling the new fields', () => {
    const { closingLine: _c, coverHeadline: _h, coverLine: _l, ...legacy } = createPlatformProposal(NOW);
    const parsed = proposalSchema.parse(legacy);
    expect(parsed.closingLine).toBe('Every match, official.');
    expect(parsed.kind === 'platform' && parsed.coverHeadline).toBe('Be part of the match, not the ad break.');
  });
});
