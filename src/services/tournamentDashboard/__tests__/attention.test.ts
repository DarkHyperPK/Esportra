import { describe, expect, it } from 'vitest';
import { deriveAttentionItems, filterAttentionByAccess, type AttentionInput } from '../attention';

const calm: AttentionInput = {
  status: 'open',
  participantNoun: 'teams',
  stageCount: 1,
  mockCount: 0,
  pendingApprovals: 0,
  pendingPayments: 0,
  draftInvites: 0,
  openDisputes: 0,
  checkInState: 'none',
  pendingCheckIns: 0,
};

describe('deriveAttentionItems', () => {
  it('returns nothing when the tournament is healthy', () => {
    expect(deriveAttentionItems(calm)).toEqual([]);
  });

  it('orders critical before warning before info', () => {
    const items = deriveAttentionItems({
      ...calm,
      draftInvites: 2,
      pendingPayments: 1,
      openDisputes: 1,
    });
    expect(items.map((i) => i.tone)).toEqual(['critical', 'warning', 'info']);
  });

  it('flags missed check-in as critical once the window closes', () => {
    const [item] = deriveAttentionItems({ ...calm, checkInState: 'closed', pendingCheckIns: 1 });
    expect(item).toMatchObject({ id: 'check-in-missed', tone: 'critical', title: '1 team missed check-in' });
  });

  it('shows the countdown while check-in is open', () => {
    const [item] = deriveAttentionItems({
      ...calm,
      participantNoun: 'players',
      checkInState: 'open',
      pendingCheckIns: 4,
      checkInCountdown: '12m 3s',
    });
    expect(item.title).toBe('4 players not checked in yet');
    expect(item.detail).toContain('12m 3s');
  });

  it('ignores pending check-ins before the window opens', () => {
    expect(deriveAttentionItems({ ...calm, checkInState: 'not_open', pendingCheckIns: 5 })).toEqual([]);
  });

  it('asks for a stage only while the event is still running', () => {
    expect(deriveAttentionItems({ ...calm, stageCount: 0 }).map((i) => i.id)).toEqual(['no-stages']);
    expect(deriveAttentionItems({ ...calm, stageCount: 0, status: 'completed' })).toEqual([]);
  });

  it('treats mock teams as info in draft and a warning after', () => {
    expect(deriveAttentionItems({ ...calm, status: 'draft', mockCount: 2 })[0].tone).toBe('info');
    expect(deriveAttentionItems({ ...calm, mockCount: 2 })[0].tone).toBe('warning');
  });
});

describe('setup gaps', () => {
  const gaps = [
    { panel: 'basic-info' as const, label: 'Basic info', requiredMissing: 2, recommendedMissing: 1 },
    { panel: 'branding' as const, label: 'Branding', requiredMissing: 0, recommendedMissing: 1 },
    { panel: 'registration' as const, label: 'Registration', requiredMissing: 0, recommendedMissing: 0 },
  ];

  it('turns draft gaps into blocking and heads-up items', () => {
    const items = deriveAttentionItems({ ...calm, status: 'draft', setupGaps: gaps });
    expect(items.map((i) => [i.target, i.tone])).toEqual([
      ['basic-info', 'critical'],
      ['branding', 'info'],
    ]);
    expect(items[0].title).toBe('Basic info: 2 required fields missing');
  });

  it('ignores gaps once published', () => {
    expect(deriveAttentionItems({ ...calm, setupGaps: gaps })).toEqual([]);
  });

  it('routes payments and invite drafts to their own panels', () => {
    const targets = deriveAttentionItems({ ...calm, pendingPayments: 1, draftInvites: 1 }).map((i) => i.target);
    expect(targets).toEqual(['payments', 'invitations']);
  });
});

describe('filterAttentionByAccess', () => {
  it('hides items that point somewhere the actor cannot go', () => {
    const items = deriveAttentionItems({ ...calm, openDisputes: 1, pendingApprovals: 1 });
    const visible = filterAttentionByAccess(items, new Set(['participants']));
    expect(visible.map((i) => i.id)).toEqual(['approvals']);
  });
});
