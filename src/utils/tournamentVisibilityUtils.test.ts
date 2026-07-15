import { describe, expect, it } from 'vitest';
import {
  apiToLaunchState,
  canPublicViewTournament,
  launchStateToCreatePayload,
  launchStateToUpdatePayload,
  makePrivateUpdatePayload,
} from '@/utils/tournamentVisibilityUtils';

describe('tournamentVisibilityUtils', () => {
  describe('apiToLaunchState', () => {
    it('maps draft status to draft', () => {
      expect(apiToLaunchState('draft', false)).toBe('draft');
      expect(apiToLaunchState('draft', true)).toBe('draft');
    });

    it('maps public flag to public', () => {
      expect(apiToLaunchState('open', true)).toBe('public');
      expect(apiToLaunchState('published', true)).toBe('public');
    });

    it('maps non-draft private tournaments to private', () => {
      expect(apiToLaunchState('published', false)).toBe('private');
      expect(apiToLaunchState('open', false)).toBe('private');
    });
  });

  describe('launchStateToCreatePayload', () => {
    it('creates draft payload', () => {
      expect(launchStateToCreatePayload('draft')).toEqual({ status: 'draft', isPublic: false });
    });

    it('creates private payload', () => {
      expect(launchStateToCreatePayload('private')).toEqual({ status: 'draft', isPublic: false });
    });

    it('creates public payload', () => {
      expect(launchStateToCreatePayload('public')).toEqual({ status: 'open', isPublic: true });
    });
  });

  describe('launchStateToUpdatePayload', () => {
    it('preserves open status when making private', () => {
      expect(launchStateToUpdatePayload('private', 'open')).toEqual({ status: 'open', isPublic: false });
    });

    it('preserves published when making public from published', () => {
      expect(launchStateToUpdatePayload('public', 'published')).toEqual({ status: 'published', isPublic: true });
    });

    it('only toggles isPublic for terminal lifecycle statuses', () => {
      expect(launchStateToUpdatePayload('public', 'ongoing')).toEqual({ status: 'ongoing', isPublic: true });
      expect(launchStateToUpdatePayload('private', 'completed')).toEqual({ status: 'completed', isPublic: false });
    });
  });

  describe('makePrivateUpdatePayload', () => {
    it('preserves lifecycle status and sets isPublic false', () => {
      expect(makePrivateUpdatePayload('ongoing')).toEqual({ status: 'ongoing', isPublic: false });
      expect(makePrivateUpdatePayload('open')).toEqual({ status: 'open', isPublic: false });
    });

    it('defaults status to open when missing', () => {
      expect(makePrivateUpdatePayload(null)).toEqual({ status: 'open', isPublic: false });
    });
  });

  describe('canPublicViewTournament', () => {
    it('allows direct-link access for draft, private, and public tournaments', () => {
      expect(canPublicViewTournament('draft', false)).toBe(true);
      expect(canPublicViewTournament('published', false)).toBe(true);
      expect(canPublicViewTournament('open', true)).toBe(true);
      expect(canPublicViewTournament('ongoing', false)).toBe(true);
    });
  });

  describe('apiToLaunchState legacy mapping', () => {
    it('maps existing private non-draft staging data to private', () => {
      expect(apiToLaunchState('published', false)).toBe('private');
      expect(apiToLaunchState('open', false)).toBe('private');
    });

    it('maps draft regardless of is_public', () => {
      expect(apiToLaunchState('draft', true)).toBe('draft');
      expect(apiToLaunchState('draft', false)).toBe('draft');
    });
  });
});
