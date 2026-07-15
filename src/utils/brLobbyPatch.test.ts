import { describe, expect, it } from 'vitest';
import {
  omitLobbyGameFieldsWhenGamesModel,
  shouldOmitLobbyGameFields,
  usesGameOnlySchedule,
  usesPerGameLobbyUi,
} from './brLobbyPatch';

describe('brLobbyPatch', () => {
  it('usesPerGameLobbyUi requires schema and multi-game config', () => {
    expect(usesPerGameLobbyUi(true, 6)).toBe(true);
    expect(usesPerGameLobbyUi(true, 1)).toBe(false);
    expect(usesPerGameLobbyUi(false, 6)).toBe(false);
  });

  it('usesGameOnlySchedule matches schedule tab rule', () => {
    expect(usesGameOnlySchedule(true, 4)).toBe(true);
    expect(usesGameOnlySchedule(true, 1)).toBe(false);
    expect(usesGameOnlySchedule(false, 6)).toBe(false);
  });

  it('shouldOmitLobbyGameFields when schema ready and games exist or multi-game', () => {
    expect(shouldOmitLobbyGameFields(true, 0, 6)).toBe(true);
    expect(shouldOmitLobbyGameFields(true, 3, 1)).toBe(true);
    expect(shouldOmitLobbyGameFields(true, 0, 1)).toBe(false);
    expect(shouldOmitLobbyGameFields(false, 6, 6)).toBe(false);
  });

  it('omitLobbyGameFieldsWhenGamesModel strips schedule queue and map', () => {
    const body = {
      lobbyCode: 'ABC',
      status: 'active',
      scheduledAt: '2026-01-01T00:00:00.000Z',
      queueTimerMinutes: 5,
      map: 'Erangel',
    };
    expect(omitLobbyGameFieldsWhenGamesModel(true, 0, 6, body)).toEqual({
      lobbyCode: 'ABC',
      status: 'active',
    });
    expect(omitLobbyGameFieldsWhenGamesModel(false, 0, 6, body)).toEqual(body);
  });
});
