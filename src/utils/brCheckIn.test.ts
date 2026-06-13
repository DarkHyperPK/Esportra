import { describe, expect, it } from 'vitest';
import { resolveBRRegisteredUnitCount } from './brStageFlow';
import {
  countBRSeedEligibleParticipants,
  countCheckedInParticipants,
  countPendingCheckInParticipants,
  getBRSeedEligibleStatuses,
  isParticipantCheckedIn,
} from './brCheckIn';

describe('brCheckIn', () => {
  const participants = [
    { status: 'approved', checked_in_at: null },
    { status: 'checked_in', checked_in_at: '2026-01-01T00:00:00Z' },
    { status: 'pending', checked_in_at: null },
    { status: 'rejected', checked_in_at: null },
  ];

  it('treats checked_in_at as checked in', () => {
    expect(isParticipantCheckedIn({ status: 'approved', checked_in_at: '2026-01-01' })).toBe(true);
  });

  it('uses checked_in only when check-in is required', () => {
    expect(getBRSeedEligibleStatuses(true)).toEqual(['checked_in']);
    expect(getBRSeedEligibleStatuses(false)).toEqual(['approved', 'checked_in']);
    expect(countBRSeedEligibleParticipants(participants, false)).toBe(2);
    expect(countBRSeedEligibleParticipants(participants, true)).toBe(1);
  });

  it('counts pending and checked-in participants for monitor', () => {
    expect(countCheckedInParticipants(participants)).toBe(1);
    expect(countPendingCheckInParticipants(participants)).toBe(2);
  });

  it('does not fall back to max capacity while check-in is pending', () => {
    const registered = [
      { status: 'approved', checked_in_at: null },
      { status: 'approved', checked_in_at: null },
    ];
    expect(resolveBRRegisteredUnitCount(registered, 64, true)).toBe(0);
    expect(resolveBRRegisteredUnitCount(registered, 64, false)).toBe(2);
    expect(resolveBRRegisteredUnitCount([], 64, true)).toBe(64);
  });
});
