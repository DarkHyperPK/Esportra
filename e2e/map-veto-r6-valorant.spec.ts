import { test, expect } from '@playwright/test';
import { createOrganizerClient, createPlayerClients } from './helpers/e2eClients';
import { readE2eEnv, e2eSkipReason } from './helpers/env';
import { loginOrganizerViaUi } from './helpers/uiAuth';
import {
  openCreateTournamentWizard,
  fillWizardStepBasicInfo,
  clickWizardNext,
} from './helpers/uiCatalog';
import { fetchCatalogGame } from './helpers/catalogSetup';
import {
  buildMapPoolIds,
  completeVetoViaApi,
  fetchGameMaps,
  getVetoHistory,
  getVetoState,
  initVeto,
  setupMapVetoMatchFixture,
} from './helpers/vetoSetup';

const env = readE2eEnv();
const skipReason = e2eSkipReason(env);

function expectedBo1ActionCount(game: string, poolSize: number): number {
  if (game === 'Rainbow Six Siege') return poolSize; // pure_ban: bans + decider side
  return poolSize; // Valorant ban_pick: bans + pick + side
}

function expectedBo3ActionCount(poolSize: number): number {
  const remainingBans = poolSize - 3 - 2;
  return 2 + (2 * 2) + remainingBans + 1;
}

test.describe('@staging-only Map veto — Valorant + R6', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(() => {
    test.skip(Boolean(skipReason), skipReason ?? undefined);
  });

  test('catalog exposes R6 with 9-map pool and live map list', async () => {
    const organizer = await createOrganizerClient(env!);
    const r6 = await fetchCatalogGame(env!.apiUrl, 'rainbow-six-siege');
    expect(r6.status).toBe(200);
    expect(r6.body?.features?.mapPoolSize).toBe(9);
    expect(r6.body?.features?.mapVeto).toBe(true);

    const maps = await fetchGameMaps(organizer, 'Rainbow Six Siege');
    expect(maps.length).toBeGreaterThanOrEqual(9);
  });

  test('wizard enforces exact 9-map pool for Rainbow Six Siege', async ({ page }) => {
    const stamp = Date.now();
    await loginOrganizerViaUi(page, env!.organizerEmail, env!.organizerPassword);
    await openCreateTournamentWizard(page);

    await fillWizardStepBasicInfo(page, {
      name: `E2E R6 Veto Pool ${stamp}`,
      game: 'Rainbow Six Siege',
      region: 'EU',
    });
    await clickWizardNext(page);

    const selector = page.getByTestId('tournament-map-pool-selector');
    await expect(selector).toBeVisible({ timeout: 30_000 });
    await expect(selector.getByText(/Select exactly 9 maps/i)).toBeVisible();

    await page.getByRole('button', { name: /Clear All/i }).click();
    await clickWizardNext(page);
    await expect(page.getByText(/Select exactly 9 maps/i)).toBeVisible();

    await page.getByRole('button', { name: /Select Recommended/i }).click();
    await expect(selector.getByText(/9 of 9 required/i)).toBeVisible();
  });

  test('Valorant BO1 — full bracket fixture, veto completion, and history', async () => {
    const organizer = await createOrganizerClient(env!);
    const [captainA, captainB] = await createPlayerClients(env!, 2);
    const stamp = Date.now();

    const fixture = await setupMapVetoMatchFixture(organizer, captainA, captainB, {
      game: 'Valorant',
      bestOf: 1,
      stamp,
    });

    expect(fixture.mapPoolIds).toHaveLength(7);

    await completeVetoViaApi(organizer, fixture);

    const finalState = await getVetoState(organizer, fixture.matchId);
    expect(finalState?.status).toBe('completed');

    const history = await getVetoHistory(organizer, fixture.matchId);
    expect(history.length).toBe(expectedBo1ActionCount('Valorant', 7));
    expect(history.every((row) => row.mapId && row.action)).toBe(true);
  });

  test('R6 BO1 — pure-ban sequence completes with decider side pick', async () => {
    const organizer = await createOrganizerClient(env!);
    const [captainA, captainB] = await createPlayerClients(env!, 2);
    const stamp = Date.now();

    const fixture = await setupMapVetoMatchFixture(organizer, captainA, captainB, {
      game: 'Rainbow Six Siege',
      bestOf: 1,
      stamp,
    });

    expect(fixture.mapPoolIds).toHaveLength(9);

    await completeVetoViaApi(organizer, fixture);

    const history = await getVetoHistory(organizer, fixture.matchId);
    expect(history.length).toBe(9);
    expect(history[history.length - 1]?.action).toMatch(/pick_side|side/i);
  });

  test('Valorant BO3 — pick/ban sequence and enriched history', async () => {
    const organizer = await createOrganizerClient(env!);
    const [captainA, captainB] = await createPlayerClients(env!, 2);
    const stamp = Date.now();

    const fixture = await setupMapVetoMatchFixture(organizer, captainA, captainB, {
      game: 'Valorant',
      bestOf: 3,
      stamp,
    });

    await completeVetoViaApi(organizer, fixture);

    const history = await getVetoHistory(organizer, fixture.matchId);
    expect(history.length).toBe(expectedBo3ActionCount(7));
    const picks = history.filter((row) => /pick/i.test(row.action) && !/side/i.test(row.action));
    expect(picks.length).toBeGreaterThanOrEqual(2);
  });

  test('R6 BO3 — 9-map pool supports extended veto flow', async () => {
    const organizer = await createOrganizerClient(env!);
    const [captainA, captainB] = await createPlayerClients(env!, 2);
    const stamp = Date.now();

    const fixture = await setupMapVetoMatchFixture(organizer, captainA, captainB, {
      game: 'Rainbow Six Siege',
      bestOf: 3,
      stamp,
    });

    await completeVetoViaApi(organizer, fixture);

    const history = await getVetoHistory(organizer, fixture.matchId);
    expect(history.length).toBe(expectedBo3ActionCount(9));
    expect(history[history.length - 1]?.action).toMatch(/pick_side|side/i);
  });

  test('rejects veto init when tournament map pool size is wrong', async () => {
    const organizer = await createOrganizerClient(env!);
    const [captainA, captainB] = await createPlayerClients(env!, 2);
    const stamp = Date.now();

    const wrongPool = (await buildMapPoolIds(organizer, 'Rainbow Six Siege', 7)).slice(0, 7);
    const fixture = await setupMapVetoMatchFixture(organizer, captainA, captainB, {
      game: 'Rainbow Six Siege',
      bestOf: 1,
      mapPoolSize: 7,
      stamp,
    });

    const message = await organizer.expectFailureText(
      'POST',
      `/api/veto/${fixture.matchId}/init`,
      400,
      {
        tournamentId: fixture.tournamentId,
        team1Id: fixture.team1Id,
        team2Id: fixture.team2Id,
        bestOf: 1,
        game: 'Rainbow Six Siege',
      },
    );

    expect(message.toLowerCase()).toMatch(/pool|map|veto|try again/i);
    expect(wrongPool).toHaveLength(7);
  });

  test('veto init is idempotent for the same live match', async () => {
    const organizer = await createOrganizerClient(env!);
    const [captainA, captainB] = await createPlayerClients(env!, 2);
    const stamp = Date.now();

    const fixture = await setupMapVetoMatchFixture(organizer, captainA, captainB, {
      game: 'Valorant',
      bestOf: 1,
      stamp,
    });

    const first = await initVeto(organizer, fixture.matchId, {
      tournamentId: fixture.tournamentId,
      team1Id: fixture.team1Id,
      team2Id: fixture.team2Id,
      bestOf: 1,
      game: 'Valorant',
    });
    const second = await initVeto(organizer, fixture.matchId, {
      tournamentId: fixture.tournamentId,
      team1Id: fixture.team1Id,
      team2Id: fixture.team2Id,
      bestOf: 1,
      game: 'Valorant',
    });

    expect(first.id).toBe(second.id);
    expect(second.status).toBe('in_progress');
  });
});
