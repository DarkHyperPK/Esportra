import { describe, expect, it } from 'vitest';
import { gameTurn, toReportBody, toScrimGame, toScrimGames, type RawScrimGame } from '../scrimGames';
import type { ScrimGame } from '@/types/competitive';

const raw: RawScrimGame = {
  game_number: 2, status: 'reported', map_name: 'Haven', map_id: null, team1_score: 13, team2_score: 9, winner_slot: null,
  source: 'riot', riot_match_id: 'm-1', match_data: { players: [], source: 'riot' }, screenshot_urls: [], notes: null,
  reported_by_team_id: 't1', reported_at: '2026-11-03T10:00:00Z', confirmed_by_team_id: null, confirmed_at: null, disputed_by_team_id: null,
};

describe('toScrimGame', () => {
  it('camel-cases the top level and leaves match details untouched', () => {
    const game = toScrimGame({ ...raw, match_data: { players: [{ gameName: 'A' }] } as RawScrimGame['match_data'] });
    expect(game.gameNumber).toBe(2);
    expect(game.reportedByTeamId).toBe('t1');
    expect(game.matchData).toEqual({ players: [{ gameName: 'A' }] });
  });

  it('keeps only 1 or 2 as winner slot', () => {
    expect(toScrimGame({ ...raw, winner_slot: 2 }).winnerSlot).toBe(2);
    expect(toScrimGame({ ...raw, winner_slot: null }).winnerSlot).toBeNull();
  });
});

describe('toScrimGames', () => {
  it('maps the series summary', () => {
    const out = toScrimGames({ best_of: 3, wins_needed: 2, team1_wins: 1, team2_wins: 0, next_game_number: 2, games: [raw] });
    expect(out).toMatchObject({ bestOf: 3, winsNeeded: 2, team1Wins: 1, nextGameNumber: 2 });
    expect(out.games).toHaveLength(1);
  });
});

describe('toReportBody', () => {
  it('snake-cases only the top level so scoreboard keys survive', () => {
    const body = toReportBody({
      gameNumber: 1, reportedByTeamId: 't1', team1Score: 13, team2Score: 9, source: 'ocr',
      matchData: { players: [{ gameName: 'A', isTeam1: true }] },
    });
    expect(body.reported_by_team_id).toBe('t1');
    expect(body.match_data).toEqual({ players: [{ gameName: 'A', isTeam1: true }] });
  });
});

describe('gameTurn', () => {
  const game = (over: Partial<ScrimGame>) => ({ ...toScrimGame(raw), ...over });
  it('asks the other team to confirm a reported map', () => {
    expect(gameTurn(game({}), 't2')).toBe('confirm');
  });
  it('makes the reporter wait', () => {
    expect(gameTurn(game({}), 't1')).toBe('waiting');
  });
  it('has nothing to do once settled or without a team', () => {
    expect(gameTurn(game({ status: 'confirmed' }), 't2')).toBe('none');
    expect(gameTurn(game({}), null)).toBe('none');
  });
});
