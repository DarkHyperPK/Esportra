import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { scrimGameInsightsSchema } from '@/schemas/scrimInsights';
import { ScrimGameReport } from '../ScrimGameReport';

const rate = (count: number, of: number) => ({ count, of, pct: of ? Math.round((1000 * count) / of) / 10 : null });
const player = (key: string, name: string, mine: boolean) => ({
  key, name, tag: 'EUW', agent: 'add6443a-41bd-e414-f6ad-e58d267f4e95', mine, slot: mine ? 1 : 2, rounds: 3, kills: 2, deaths: 1, assists: 0,
  acs: 200, adr: 150, hs_pct: 20, body_pct: 60, leg_pct: 20, kd: 2, kast: 66.7, first_kills: 1, first_deaths: 0, k2: 0, k3: 0, k4: 0, k5: 0,
  plants: 0, defuses: 0, damage: 300, damage_received: 100, damage_share: 75, kill_share: 66.7, damage_per_kill: 150,
});
const round = (num: number, won: boolean) => ({
  num, won, my_role: 'attack', result_code: 'Elimination', plant_site: num === 1 ? 'A' : null, plant_ms: num === 1 ? 30000 : null, defused: false, defuse_ms: null,
  first_killer: 'p1', first_victim: 'p3', first_blood_mine: true, first_blood_ms: 5000, my_score: num, their_score: 0, my_loadout: 4000, their_loadout: 2500,
  my_buy: 'full', their_buy: 'force', pistol: false,
});

const FULL = {
  session_id: 's1', game_number: 1, tier: 'full', reason: null, my_team: { id: 't1', name: 'Alpha' }, opponent: { id: 't2', name: 'Omega' },
  score: { mine: 13, theirs: 7 }, result: 'win', map: 'Lotus', match: { verification: 'verified', queue_id: '', is_custom: true, started_at: '2026-10-03T12:00:00Z', length_ms: 2000000 },
  veto: { expected_map: 'Lotus', picked_by: 'you', is_decider: false, order: 1, played_on_veto_map: true },
  report: {
    players: [player('p1', 'Alpha One', true), player('p3', 'Omega One', false)],
    rounds: [round(1, true), round(2, true)], streaks: { longest_win: 2, longest_loss: 0 },
    halves: { first: rate(2, 2), second: rate(0, 0), overtime: rate(0, 0) },
    opening: { players: [{ key: 'p1', kills: 2, deaths: 0, duels_won: rate(2, 2), avg_ms_to_first_kill: 5000, avg_ms_to_first_death: null }], win_after_first_blood: rate(2, 2), win_after_first_death: rate(0, 0), first_blood_rounds: rate(2, 2), attack_first_blood: rate(2, 2), defense_first_blood: rate(0, 0) },
    kills: [{ round: 1, ordinal: 1, round_ms: 5000, killer: 'p1', victim: 'p3', assistants: [], killer_mine: true, weapon: 'w-vandal', type: 'Weapon', x: 1, y: 2 }, { round: 2, ordinal: 1, round_ms: 7000, killer: 'p3', victim: 'p1', assistants: [], killer_mine: false, weapon: '1234abcd-4575-0200-1a81-3eacf00cf872', type: 'Weapon', x: 1, y: 2 }],
    economy: { win_rate_by_buy: [{ buy: 'full', rounds_won: rate(2, 2) }], pistol_rounds: rate(0, 0), avg_loadout_mine: 4000, avg_loadout_theirs: 2500, avg_loadout_in_won_rounds: 4000, avg_loadout_in_lost_rounds: null, weapons: [{ weapon: 'w-vandal', rounds: 4 }], armor: [] },
    abilities: [{ key: 'p1', grenade: 3, ability1: 6, ability2: null, ultimate: 1, per_round: 3.3 }],
    objectives: { by_player: [], sites: [{ weapon: 'A', rounds: 1 }], avg_plant_ms: 30000, avg_defuse_ms: null, win_when_planting: rate(1, 1), win_when_opponent_plants: rate(0, 0) },
    coach: {
      trades: { deaths: 3, traded: 1, trade_kills: 1 }, led_rounds: rate(2, 2), trailed_rounds: rate(0, 1), clutches: [{ round: 1, key: 'p1', versus: 1, won: true }, { round: 2, key: 'p1', versus: 2, won: false }],
      post_plant: rate(1, 1), post_plant_by_site: [{ site: 'A', won: rate(1, 1) }], no_plant_on_attack: rate(0, 1), retake: rate(0, 0), retake_by_site: [],
      after_pistol_win: rate(0, 1), after_pistol_loss: rate(0, 0), anti_eco: rate(0, 0), eco_upsets: rate(0, 1), loadout_ahead: rate(1, 1), loadout_behind: rate(0, 1), avg_first_kill_ms: 4000, slow_rounds: rate(0, 0),
      players: [{ key: 'p1', deaths: 1, traded: 0, untraded_first_deaths: 1, trade_kills: 1, clutch_attempts: 2, clutch_wins: 1, entry_duels: 2, entry_wins: 1, multi_kill_rounds: 1, multi_kill_rounds_won: 1 }],
    },
    formulas: [{ id: 'acs', text: 'ACS = score ÷ rounds played.' }],
  },
};
const NONE = { ...FULL, tier: 'score_only', reason: 'This map was not reported from a Riot match, so only its result is recorded.', veto: null, report: null };

let state: { data?: unknown; isLoading?: boolean; isError?: boolean } = {};
const refetch = vi.fn();
vi.mock('@/hooks/competitive/useScrimGameInsights', () => ({
  useScrimGameInsights: () => ({ data: state.data, isLoading: !!state.isLoading, isError: !!state.isError, refetch }),
}));
vi.mock('../ScreenshotEvidence', () => ({ ScreenshotEvidence: () => <div data-testid="evidence" /> }));
vi.mock('@/hooks/competitive/useScrimTimeline', () => ({ useScrimTimeline: () => ({ data: undefined, isLoading: true, isError: false, refetch }) }));
vi.mock('@/hooks/useValorantCatalog', () => ({
  useValorantMaps: () => ({ data: [] }),
  useValorantWeapons: () => ({ data: [{ uuid: 'w-vandal', displayName: 'Vandal', killStreamIcon: 'https://x/vandal.png' }] }),
  useValorantAgents: () => ({ data: {} }),
  useValorantGear: () => ({ data: [] }),
}));

// The API client camel-cases keys; parse the same way the hook does.
const camel = (v: unknown): unknown => Array.isArray(v) ? v.map(camel)
  : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase()), camel(x)])) : v;
const parsed = (raw: unknown) => scrimGameInsightsSchema.parse(camel(raw));
const view = (tab = '') => render(<MemoryRouter initialEntries={[`/x${tab ? `?tab=${tab}` : ''}`]}><ScrimGameReport sessionId="s1" gameNumber={1} /></MemoryRouter>);

describe('ScrimGameReport', () => {
  beforeEach(() => { state = {}; refetch.mockClear(); });

  it('opens on the scoreboard with the veto and shows one category at a time', () => {
    state = { data: parsed(FULL) };
    view();
    expect(screen.getByRole('heading', { name: 'Lotus' })).toBeInTheDocument();
    expect(screen.getByText(/Map veto: Lotus, picked by your team/)).toBeInTheDocument();
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual(['Scoreboard', 'Timeline', 'Rounds', 'Decisive moments', 'Impact', 'Economy', 'Spike & retakes']);
    expect(screen.getByRole('region', { name: 'Scoreboard' })).toBeInTheDocument();
    expect(screen.getAllByText('Omega One').length).toBeGreaterThan(0);
    for (const hidden of ['Rounds', 'Opening duels', 'Who carried', 'Economy', 'Spike']) expect(screen.queryByRole('region', { name: hidden })).toBeNull();
    expect(screen.getByText('How these figures are worked out')).toBeInTheDocument();
  });

  it('groups the other categories under their own tabs', () => {
    state = { data: parsed(FULL) };
    view();
    fireEvent.click(screen.getByRole('tab', { name: 'Rounds' }));
    expect(screen.getByRole('region', { name: 'Rounds' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Opening duels' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Impact' }));
    expect(screen.getByRole('region', { name: 'Who carried' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Economy' }));
    expect(screen.getByRole('region', { name: 'Economy' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Spike & retakes' }));
    expect(screen.getByRole('region', { name: 'Spike' })).toBeInTheDocument();
  });

  it('shows the clutches and what decided rounds on the decisive-moments tab', () => {
    state = { data: parsed(FULL) };
    view('decisive');
    expect(screen.getByRole('region', { name: 'Clutches' })).toHaveTextContent('1v2');
    expect(screen.getByRole('region', { name: 'What decided rounds on this map' })).toHaveTextContent('Won after you planted');
    expect(screen.getByRole('region', { name: 'Players in the deciding moments' })).toHaveTextContent('Alpha One');
  });

  it('opens the tab named in the URL', () => {
    state = { data: parsed(FULL) };
    view('economy');
    expect(screen.getByRole('tab', { name: 'Economy' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.queryByRole('region', { name: 'Scoreboard' })).toBeNull();
  });

  it('shows each round as the game does: how it ended, the side, the plant, with a full sentence for each', () => {
    state = { data: parsed(FULL) };
    view('rounds');
    expect(screen.getByLabelText('Round 1: Your team won by eliminating the opposition, attacking, spike planted at A at 0:30. Score 1–0.')).toBeInTheDocument();
    expect(screen.getByText(/you attacked/)).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'First half' })).toBeInTheDocument();
    expect(screen.getByLabelText('Legend')).toHaveTextContent('Spike detonated');
  });

  it('says why there is no detail for a map without verified Riot data, and shows no sections', () => {
    state = { data: parsed(NONE) };
    view();
    expect(screen.getByText(/not reported from a Riot match/)).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Scoreboard' })).not.toBeInTheDocument();
    expect(screen.queryAllByRole('tab')).toHaveLength(0);
  });

  it('shows the stored screenshot and its scoreboard for a map reported from a screenshot', () => {
    state = { data: parsed({ ...NONE, tier: 'screenshot', reason: 'This map was not reported from a Riot match, so only its result is recorded.' }) };
    view();
    expect(screen.getByTestId('evidence')).toBeInTheDocument();
    expect(screen.getByText(/Read from a scoreboard screenshot/)).toBeInTheDocument();
    expect(screen.queryByText(/not reported from a Riot match/)).toBeNull();
  });

  it('offers a retry when the report cannot be loaded', () => {
    state = { isError: true };
    view();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(refetch).toHaveBeenCalled();
  });

  it('shows a loading state', () => {
    state = { isLoading: true };
    view();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('rejects a response that is not shaped like a report', () => {
    expect(() => parsed({ ...FULL, report: { players: 'nope' } })).toThrow();
  });
});
