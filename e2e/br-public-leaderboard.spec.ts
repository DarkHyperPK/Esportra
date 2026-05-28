import { test, expect } from '@playwright/test';
import { readE2eEnv, e2eSkipReason } from './helpers/env';
import { createOrganizerClient, createPlayerClients } from './helpers/e2eClients';
import {
  createBRGroups,
  getBRGroups,
  publishRoundResultsDirect,
  setupBrRoundFixture,
} from './helpers/brSetup';
import { openPublicLeaderboard, openPublicTournament } from './helpers/uiBR';
import { expectNoTechnicalCopy } from './helpers/assertCopy';

const env = readE2eEnv();
const skipReason = e2eSkipReason(env);

test.describe('BR public leaderboard', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(() => {
    test.skip(Boolean(skipReason), skipReason ?? undefined);
  });

  test('BR public tabs show Leaderboard instead of bracket-specific tabs', async ({ page }) => {
    const organizer = await createOrganizerClient(env!);
    const players = await createPlayerClients(env!, 2);
    const fixture = await setupBrRoundFixture(organizer, players, { activateRound: false });

    await openPublicTournament(page, fixture.slug);
    await expect(page.getByRole('tab', { name: /leaderboard/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /^brackets$/i })).toHaveCount(0);
    await expect(page.getByRole('tab', { name: /^stages$/i })).toHaveCount(0);
  });

  test('public standings show completed round scores and qualification cutoff', async ({ page }) => {
    const organizer = await createOrganizerClient(env!);
    const players = await createPlayerClients(env!, 2);
    const fixture = await setupBrRoundFixture(organizer, players);
    await publishRoundResultsDirect(organizer, fixture.stageId, fixture.groupId, fixture.roundId);

    await openPublicLeaderboard(page, fixture.slug);
    await expect(page.getByText(/Leaderboard|Pts|Points/i).first()).toBeVisible({ timeout: 45_000 });
    await expect(page.getByText(/Qualified|Cutoff|advance|Participants/i).first()).toBeVisible();
    await expectNoTechnicalCopy(page);
  });

  test('group selector changes the visible public group', async ({ page }) => {
    const organizer = await createOrganizerClient(env!);
    const players = await createPlayerClients(env!, 2);
    const fixture = await setupBrRoundFixture(organizer, players, { activateRound: false });
    await createBRGroups(organizer, fixture.stageId, { groupCount: 2, lobbySize: 2, force: true });

    await openPublicLeaderboard(page, fixture.slug);
    const groups = await getBRGroups(organizer, fixture.stageId);
    expect(groups.length).toBeGreaterThanOrEqual(2);
    await expect(page.getByRole('button', { name: new RegExp(groups[0].name ?? 'Group', 'i') }).first()).toBeVisible();
    await page.getByRole('button', { name: new RegExp(groups[1].name ?? 'Group', 'i') }).first().click();
    await expect(page.getByText(groups[1].name ?? 'Group')).toBeVisible();
  });

  test('scoring rules are visible on leaderboard page', async ({ page }) => {
    const organizer = await createOrganizerClient(env!);
    const players = await createPlayerClients(env!, 2);
    const fixture = await setupBrRoundFixture(organizer, players, { activateRound: false });

    await openPublicLeaderboard(page, fixture.slug);
    await expect(page.getByText(/Scoring|Placement|Kills|Points/i).first()).toBeVisible();
  });

  test('active lobby code is not exposed on the public page', async ({ page }) => {
    const organizer = await createOrganizerClient(env!);
    const players = await createPlayerClients(env!, 2);
    const fixture = await setupBrRoundFixture(organizer, players);

    await openPublicLeaderboard(page, fixture.slug);
    await expect(page.getByText(fixture.lobbyCode)).toHaveCount(0);
    await expect(page.getByText(/Lobby codes are only shared in the Match Room/i)).toBeVisible();
  });

  test('public brackets URL explains BR uses a points leaderboard', async ({ page }) => {
    const organizer = await createOrganizerClient(env!);
    const players = await createPlayerClients(env!, 2);
    const fixture = await setupBrRoundFixture(organizer, players, { activateRound: false });

    await page.goto(`/tournaments/${fixture.slug}/brackets`);
    await expect(page.getByText(/leaderboard|points/i).first()).toBeVisible({ timeout: 45_000 });
    await expectNoTechnicalCopy(page);
  });
});
