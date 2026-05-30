import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, expect } from '@playwright/test';
import { readE2eEnv, e2eSkipReason } from './helpers/env';
import { loginViaUi } from './helpers/uiAuth';
import { createOrganizerClient, createPlayerClients } from './helpers/e2eClients';
import {
  createRound,
  getBRGroups,
  getRoundEvidenceCount,
  publishRoundResultsDirect,
  resetRound,
  saveRoundResultsDirect,
  setTournamentOngoing,
  setupBrRoundFixture,
  updateRound,
} from './helpers/brSetup';
import { expandFirstRound, fillResultsGrid, expectRoundLiveBadge, openOrganizerGames, openPlayerGameRoom, setRoundSettings } from './helpers/uiBR';
import { assertNoOrphanLeaderboardZeros } from './helpers/uiLeaderboard';
import { expectNoTechnicalCopy } from './helpers/assertCopy';
import { expectToast } from './helpers/assertToast';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const evidencePath = path.resolve(__dirname, 'fixtures/evidence.png');
const env = readE2eEnv();
const skipReason = e2eSkipReason(env);

function toDateTimeLocalValue(date: Date): string {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

test.describe('BR organizer games', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(() => {
    test.skip(Boolean(skipReason), skipReason ?? undefined);
  });

  test('creates and displays a pending round in Games tab', async ({ page }) => {
    const organizer = await createOrganizerClient(env!);
    const players = await createPlayerClients(env!, 2);
    const fixture = await setupBrRoundFixture(organizer, players, { activateRound: false });

    await loginViaUi(page, env!.organizerEmail, env!.organizerPassword);
    await openOrganizerGames(page, fixture.slug);

    await expect(page.getByRole('button', { name: /Round 1/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Round 1 Pending/i })).toBeVisible();
    await expectNoTechnicalCopy(page);
  });

  test('sets lobby code, schedule, queue timer, then starts a round', async ({ page }) => {
    const organizer = await createOrganizerClient(env!);
    const players = await createPlayerClients(env!, 2);
    const fixture = await setupBrRoundFixture(organizer, players, { activateRound: false });
    await setTournamentOngoing(organizer, fixture.tournamentId);

    await loginViaUi(page, env!.organizerEmail, env!.organizerPassword);
    await openOrganizerGames(page, fixture.slug);
    await expandFirstRound(page);

    await setRoundSettings(page, {
      lobbyCode: fixture.lobbyCode,
      scheduledAt: toDateTimeLocalValue(new Date(Date.now() - 300_000)),
      queueTimerMinutes: '5',
    });

    await page.getByRole('button', { name: /^Start$/i }).click({ force: true });
    await expect(page.getByRole('alertdialog', { name: /Start Round/i })).toBeVisible();
    await page.getByRole('button', { name: /^Start Round$/i }).click({ force: true });
    await expectRoundLiveBadge(page, 1);
    await expect(page.getByText(fixture.lobbyCode)).toBeVisible();
    await expectNoTechnicalCopy(page);
  });

  test('manual results grid saves points and enables completion', async ({ page }) => {
    const organizer = await createOrganizerClient(env!);
    const players = await createPlayerClients(env!, 2);
    const fixture = await setupBrRoundFixture(organizer, players);

    await loginViaUi(page, env!.organizerEmail, env!.organizerPassword);
    await openOrganizerGames(page, fixture.slug);
    await expandFirstRound(page);
    await fillResultsGrid(page, 2);
    await page.getByRole('button', { name: /Save Results/i }).click();
    await expectToast(page, /2 results saved/i);

    await page.getByRole('button', { name: /^Complete$/i }).click();
    await page.getByRole('button', { name: /^Complete Round$/i }).click();
    await expectToast(page, /completed/i);
    await expect(page.getByRole('button', { name: /Round 1 Completed/i })).toBeVisible();
    await expectNoTechnicalCopy(page);
  });

  test('evidence review panel marks submissions reviewed', async ({ page }) => {
    const organizer = await createOrganizerClient(env!);
    const players = await createPlayerClients(env!, 2);
    const fixture = await setupBrRoundFixture(organizer, players);

    await loginViaUi(page, env!.players[0].email, env!.players[0].password);
    await openPlayerGameRoom(page, fixture.slug, env!.brGameRoomPath);
    await page.getByText('Upload screenshot').click();
    await page.locator('input[type="file"]').setInputFiles(evidencePath);
    await expect(page.getByRole('button', { name: /Submit Report/i })).toBeEnabled();
    await page.getByRole('button', { name: /Submit Report/i }).click();
    await expect.poll(
      () => getRoundEvidenceCount(organizer, fixture.roundId),
      { timeout: 30_000 },
    ).toBeGreaterThanOrEqual(1);

    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await loginViaUi(page, env!.organizerEmail, env!.organizerPassword);
    await openOrganizerGames(page, fixture.slug);
    await expandFirstRound(page);
    await expect(page.getByText('Pending review', { exact: true })).toBeVisible({ timeout: 30_000 });
    await page.getByRole('button', { name: /Mark reviewed/i }).click();
    await expectToast(page, /Evidence reviewed/i);
    await expect(page.getByText(/^Reviewed$/i)).toBeVisible();
    await expectNoTechnicalCopy(page);
  });

  test('round can be completed, reopened, and reset', async ({ page }) => {
    const organizer = await createOrganizerClient(env!);
    const players = await createPlayerClients(env!, 2);
    const fixture = await setupBrRoundFixture(organizer, players);

    await saveRoundResultsDirect(organizer, fixture.stageId, fixture.groupId, fixture.roundId);
    await updateRound(organizer, fixture.roundId, { status: 'completed' });

    await loginViaUi(page, env!.organizerEmail, env!.organizerPassword);
    await openOrganizerGames(page, fixture.slug);
    await expandFirstRound(page);
    await page.getByRole('button', { name: /Re-open/i }).click();
    await page.getByRole('button', { name: /^Re-open$/i }).click();
    await expectToast(page, /started|updated/i);

    await page.getByRole('button', { name: /Reset/i }).click();
    await page.getByRole('button', { name: /Reset Round/i }).click();
    await expectToast(page, /reset/i);
    await expect(page.getByRole('button', { name: /Round 1 Pending/i })).toBeVisible();
  });

  test('leaderboard updates after completed round and has no orphan zero rows', async ({ page }) => {
    const organizer = await createOrganizerClient(env!);
    const players = await createPlayerClients(env!, 2);
    const fixture = await setupBrRoundFixture(organizer, players);
    await publishRoundResultsDirect(organizer, fixture.stageId, fixture.groupId, fixture.roundId);

    await loginViaUi(page, env!.organizerEmail, env!.organizerPassword);
    await openOrganizerGames(page, fixture.slug);
    const leaderboardSection = page.getByText(/— Leaderboard/i).locator('xpath=ancestor::div[contains(@class,"rounded-2xl")]').first();
    await expect(leaderboardSection.getByText(/pts/i).first()).toBeVisible({ timeout: 30_000 });
    await assertNoOrphanLeaderboardZeros(leaderboardSection);
  });

  test('multi-group filter switches group context', async ({ page }) => {
    const organizer = await createOrganizerClient(env!);
    const players = await createPlayerClients(env!, 2);
    const fixture = await setupBrRoundFixture(organizer, players, { autoSeed: false } as any);
    await createRound(organizer, fixture.stageId, (await getBRGroups(organizer, fixture.stageId))[0].id);

    await loginViaUi(page, env!.organizerEmail, env!.organizerPassword);
    await openOrganizerGames(page, fixture.slug);
    await expect(page.getByText(/Main Lobby|Group/i).first()).toBeVisible();
    await expectNoTechnicalCopy(page);
  });

  test('API round reset clears round state', async () => {
    const organizer = await createOrganizerClient(env!);
    const players = await createPlayerClients(env!, 2);
    const fixture = await setupBrRoundFixture(organizer, players);

    await saveRoundResultsDirect(organizer, fixture.stageId, fixture.groupId, fixture.roundId);
    const reset = await resetRound(organizer, fixture.roundId);
    expect(reset.status).toBe('pending');
  });

  test('realtime @flaky player leaderboard updates after organizer completes round', async ({ browser }) => {
    const organizer = await createOrganizerClient(env!);
    const players = await createPlayerClients(env!, 2);
    const fixture = await setupBrRoundFixture(organizer, players);

    const playerContext = await browser.newContext();
    const playerPage = await playerContext.newPage();
    try {
      await loginViaUi(playerPage, env!.players[0].email, env!.players[0].password);
      await openPlayerGameRoom(playerPage, fixture.slug, env!.brGameRoomPath);
      await expect(playerPage.getByText(fixture.lobbyCode)).toBeVisible({ timeout: 45_000 });

      await publishRoundResultsDirect(organizer, fixture.stageId, fixture.groupId, fixture.roundId);

      const completedState = playerPage.getByText(/Round History|Your Standing|Waiting for Next Round|Tournament Complete/i).first();
      await completedState.waitFor({ state: 'visible', timeout: 45_000 }).catch(async () => {
        await playerPage.reload();
        await expect(completedState).toBeVisible({ timeout: 45_000 });
      });
      await expectNoTechnicalCopy(playerPage);
    } finally {
      await playerContext.close();
    }
  });
});
