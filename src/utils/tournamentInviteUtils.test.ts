import { describe, expect, it } from 'vitest';
import {
  canShowInviteRedemption,
  canShowOpenRegistration,
  getOpenRegistrationCapacity,
  getReservedInviteSlotsFromTournament,
  isTournamentRegistrationOpen,
} from '@/utils/tournamentInviteUtils';

describe('tournamentInviteUtils', () => {
  describe('getReservedInviteSlotsFromTournament', () => {
    it('prefers column value when positive', () => {
      expect(
        getReservedInviteSlotsFromTournament({
          reserved_invite_slots: 4,
          settings: { reservedInviteSlots: 2 },
        }),
      ).toBe(4);
    });

    it('falls back to settings when column is zero', () => {
      expect(
        getReservedInviteSlotsFromTournament({
          reserved_invite_slots: 0,
          settings: { reservedInviteSlots: 3 },
        }),
      ).toBe(3);
    });
  });

  describe('getOpenRegistrationCapacity', () => {
    it('returns full capacity when no reserved slots', () => {
      expect(getOpenRegistrationCapacity(16, 0)).toBe(16);
    });

    it('subtracts reserved slots from max teams', () => {
      expect(getOpenRegistrationCapacity(16, 4)).toBe(12);
    });
  });

  describe('isTournamentRegistrationOpen', () => {
    it('accepts published and open statuses', () => {
      expect(isTournamentRegistrationOpen('published')).toBe(true);
      expect(isTournamentRegistrationOpen('open')).toBe(true);
    });

    it('rejects closed or draft statuses', () => {
      expect(isTournamentRegistrationOpen('draft')).toBe(false);
      expect(isTournamentRegistrationOpen('completed')).toBe(false);
    });
  });

  describe('canShowInviteRedemption', () => {
    const base = {
      isOrganizer: false,
      isRegistered: false,
      status: 'open',
      registrationType: 'open' as const,
      reservedSlots: 0,
      isPublic: true,
    };

    it('shows for invite-only tournaments when registration is open', () => {
      expect(canShowInviteRedemption({ ...base, registrationType: 'invite_only' })).toBe(true);
    });

    it('shows for private tournaments when registration is open', () => {
      expect(canShowInviteRedemption({ ...base, isPublic: false })).toBe(true);
    });

    it('shows when reserved invite slots exist', () => {
      expect(canShowInviteRedemption({ ...base, reservedSlots: 2 })).toBe(true);
    });

    it('hides when registration is closed', () => {
      expect(canShowInviteRedemption({ ...base, status: 'completed', reservedSlots: 2 })).toBe(false);
    });

    it('hides for organizers and registered users', () => {
      expect(canShowInviteRedemption({ ...base, isOrganizer: true, reservedSlots: 2 })).toBe(false);
      expect(canShowInviteRedemption({ ...base, isRegistered: true, reservedSlots: 2 })).toBe(false);
    });
  });

  describe('canShowOpenRegistration', () => {
    const base = {
      isOrganizer: false,
      isRegistered: false,
      status: 'open',
      registrationType: 'open' as const,
      reservedSlots: 0,
      isPublic: true,
      maxTeams: 16,
    };

    it('shows for public open-registration tournaments', () => {
      expect(canShowOpenRegistration(base)).toBe(true);
    });

    it('hides for invite-only tournaments', () => {
      expect(canShowOpenRegistration({ ...base, registrationType: 'invite_only' })).toBe(false);
    });

    it('hides when open capacity is exhausted', () => {
      expect(canShowOpenRegistration({ ...base, reservedSlots: 16 })).toBe(false);
    });

    it('hides for private tournaments', () => {
      expect(canShowOpenRegistration({ ...base, isPublic: false })).toBe(false);
    });
  });
});
