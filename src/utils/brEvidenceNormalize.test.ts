import { describe, expect, it } from 'vitest';
import {
  canApproveEvidenceEntry,
  canApproveReportedResult,
  getBREvidenceRowKey,
  normalizeBREvidence,
  normalizeBREvidenceList,
} from './brEvidenceNormalize';

describe('brEvidenceNormalize', () => {
  it('normalizes snake_case API rows', () => {
    const entry = normalizeBREvidence({
      team_id: '22222222-2222-2222-2222-222222222222',
      team_name: 'Player One',
      image_url: 'https://example.com/evidence.png',
      submitted_at: '2026-06-15T10:00:00.000Z',
      placement: 1,
      kills: 3,
      reviewed: false,
      game_number: 1,
    });

    expect(entry).toEqual({
      teamId: '22222222-2222-2222-2222-222222222222',
      teamName: 'Player One',
      imageUrl: 'https://example.com/evidence.png',
      submittedAt: '2026-06-15T10:00:00.000Z',
      placement: 1,
      kills: 3,
      reviewed: false,
      gameNumber: 1,
    });
  });

  it('normalizes camelCase API rows', () => {
    const entry = normalizeBREvidence({
      teamId: '11111111-1111-1111-1111-111111111111',
      teamName: 'Team Alpha',
      imageUrl: 'https://example.com/camel.png',
      submittedAt: '2026-06-15T11:00:00.000Z',
      reviewed: true,
    }, 2);

    expect(entry?.teamId).toBe('11111111-1111-1111-1111-111111111111');
    expect(entry?.gameNumber).toBe(2);
    expect(entry?.reviewed).toBe(true);
  });

  it('filters invalid rows missing entity id or image', () => {
    expect(normalizeBREvidence({ team_id: 'x' })).toBeNull();
    expect(normalizeBREvidence({ image_url: 'https://example.com/a.png' })).toBeNull();
    expect(normalizeBREvidenceList([
      { team_id: 'a', image_url: 'https://example.com/1.png', submitted_at: '2026-01-01T00:00:00.000Z' },
      { team_id: 'b' },
    ])).toHaveLength(1);
  });

  it('builds stable row keys', () => {
    const key = getBREvidenceRowKey({
      teamId: 'team-1',
      teamName: 'A',
      imageUrl: 'https://example.com/1.png',
      submittedAt: '2026-06-15T10:00:00.000Z',
      gameNumber: 1,
    });

    expect(key).toBe('team-1-1-2026-06-15T10:00:00.000Z-https://example.com/1.png');
  });

  it('requires placement, kills, and game number to approve', () => {
    expect(canApproveReportedResult(1, 0)).toBe(true);
    expect(canApproveReportedResult(undefined, 0)).toBe(false);
    expect(
      canApproveEvidenceEntry(
        {
          placement: 2,
          kills: 1,
          gameNumber: 1,
          reviewed: false,
        },
        undefined,
      ),
    ).toBe(true);
    expect(
      canApproveEvidenceEntry(
        {
          placement: 2,
          kills: 1,
          reviewed: false,
        },
        1,
      ),
    ).toBe(true);
    expect(
      canApproveEvidenceEntry(
        {
          placement: 2,
          kills: 1,
          reviewed: false,
        },
        undefined,
      ),
    ).toBe(false);
    expect(
      canApproveEvidenceEntry(
        {
          placement: 2,
          kills: 1,
          gameNumber: 1,
          reviewed: true,
        },
        undefined,
      ),
    ).toBe(false);
  });
});
