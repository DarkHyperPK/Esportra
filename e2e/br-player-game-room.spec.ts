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
  setTournamentOngoing,
  setupBrRoundFixture,
} from './helpers/brSetup';
import { openPlayerGameRoom, openPublicTournament } from './helpers/uiBR';
import { expectNoTechnicalCopy } from './helpers/assertCopy';
import { expectToast } from './helpers/assertToast';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const evidencePath = path.resolve(__dirname, 'fixtures/evidence.png');
const env = readE2eEnv();
const skipReason = e2eSkipReason(env);

test.describe('BR player game room', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(() => {
    test.skip(Boolean(skipReason), skipReason ?? undefined);
  });

  test('registered player can enter game room from public tournament page', async ({ page }) => {
    const organizer = await createOrganizerClient(env!);
    const players = await createPlayerClients(env!, 2);
    const fixture = await setupBrRoundFixture(organizer, players);

    await loginViaUi(page, env!.players[0].email, env!.players[0].password);
    await openPublicTournament(page, fixture.slug);

    const enterButton = page.getByRole('button', { name: /enter game room|match room|game room/i }).first();
    if (await enterButton.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await enterButton.click({ force: true });
      await page.waitForURL(/br-game-room|br-lobby/, { timeout: 30_000 });
    } else {
      await openPlayerGameRoom(page, fixture.slug, env!.brGameRoomPath);
    }

    await expect(page.getByText(fixture.lobbyCode)).toBeVisible({ timeout: 45_000 });
    await expectNoTechnicalCopy(page);
  });

  test('active round shows lobby code and copy feedback', async ({ page }) => {
    const organizer = await createOrganizerClient(env!);
    const players = await createPlayerClients(env!, 2);
    const fixture = await setupBrRoundFixture(organizer, players);

    await loginViaUi(page, env!.players[0].email, env!.players[0].password);
    await openPlayerGameRoom(page, fixture.slug, env!.brGameRoomPath);
    await expect(page.getByText(fixture.lobbyCode)).toBeVisible();
    const lobbyCard = page.getByText('Lobby Code').locator('xpath=ancestor::div[contains(@class,"rounded-xl")]').first();
    await lobbyCard.locator('button').last().click();
    await expectToast(page, /Copied/i);
  });

  test('player submits evidence and duplicate submission is handled clearly', async ({ page }) => {
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
    await page.reload();
    await expect(page.getByText(/Awaiting organizer review|Evidence submitted/i)).toBeVisible({ timeout: 45_000 });

    const duplicate = await players[0].expectFailureText(
      'PUT',
      `/api/br/rounds/${fixture.roundId}/evidence`,
      409,
      { imageUrl: 'https://staging.esportra.com/storage/v1/object/public/tournaments.results/e2e/evidence.png' },
    ).catch((message) => message.message as string);
    expect(duplicate.toLowerCase()).toContain('evidence');
  });

  test('evidence submit while round pending is rejected with friendly copy', async () => {
    const organizer = await createOrganizerClient(env!);
    const players = await createPlayerClients(env!, 2);
    const fixture = await setupBrRoundFixture(organizer, players, { activateRound: false });

    const error = await players[0].expectFailureText(
      'PUT',
      `/api/br/rounds/${fixture.roundId}/evidence`,
      409,
      { imageUrl: 'https://staging.esportra.com/storage/v1/object/public/tournaments.results/e2e/evidence.png' },
    );
    expect(error).toContain('Evidence can only be submitted while the round is live');
  });

  test('unassigned user sees not-assigned lobby gate', async ({ page }) => {
    const organizer = await createOrganizerClient(env!);
    const players = await createPlayerClients(env!, 1);
    const fixture = await setupBrRoundFixture(organizer, players);

    await loginViaUi(page, env!.organizerEmail, env!.organizerPassword);
    await openPlayerGameRoom(page, fixture.slug, env!.brGameRoomPath);
    await expect(page.getByText(/not assigned to a BR lobby/i)).toBeVisible();
    await expectNoTechnicalCopy(page);
  });

  test('completed round history and standings are visible after round completion', async ({ page }) => {
    const organizer = await createOrganizerClient(env!);
    const players = await createPlayerClients(env!, 2);
    const fixture = await setupBrRoundFixture(organizer, players);
    await publishRoundResultsDirect(organizer, fixture.stageId, fixture.groupId, fixture.roundId);

    await loginViaUi(page, env!.players[0].email, env!.players[0].password);
    await openPlayerGameRoom(page, fixture.slug, env!.brGameRoomPath);
    await expect(page.getByText(/Round History|Your Standing|Waiting for Next Round/i).first()).toBeVisible({
      timeout: 45_000,
    });
    await expectNoTechnicalCopy(page);
  });

  test('player room observes a newly started round after organizer action', async ({ page }) => {
    const organizer = await createOrganizerClient(env!);
    const players = await createPlayerClients(env!, 2);
    const fixture = await setupBrRoundFixture(organizer, players, { activateRound: false });
    const groupId = (await getBRGroups(organizer, fixture.stageId))[0].id;

    await loginViaUi(page, env!.players[0].email, env!.players[0].password);
    await openPlayerGameRoom(page, fixture.slug, env!.brGameRoomPath);
    await expect(page.getByText(/Waiting for Next Round|not assigned/i).first()).toBeVisible({ timeout: 45_000 });

    await setTournamentOngoing(organizer, fixture.tournamentId);
    await organizer.patch(`/api/br/rounds/${fixture.roundId}`, {
      status: 'active',
      lobbyCode: fixture.lobbyCode,
    });

    await expect(page.getByText(fixture.lobbyCode)).toBeVisible({ timeout: 75_000 });

    const secondRound = await createRound(organizer, fixture.stageId, groupId, { lobbyCode: `${fixture.lobbyCode}-2` });
    expect(secondRound.id).toBeTruthy();
  });
});
