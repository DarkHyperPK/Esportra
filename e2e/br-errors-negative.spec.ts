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
  saveRoundResultsDirect,
  setTournamentOngoing,
  setupBrRoundFixture,
} from './helpers/brSetup';
import { expandFirstRound, openOrganizerGames, openPlayerGameRoom, setRoundSettings, submitPlayerEvidenceViaUI } from './helpers/uiBR';
import { expectFriendlyText, expectNoTechnicalCopy } from './helpers/assertCopy';
import { expectToast } from './helpers/assertToast';

const env = readE2eEnv();
const skipReason = e2eSkipReason(env);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const evidencePath = path.resolve(__dirname, 'fixtures/evidence.png');

async function expectApiMessage(
  action: () => Promise<string>,
  expected: RegExp,
): Promise<string> {
  const message = await action();
  expect(message).toMatch(expected);
  expectFriendlyText(message);
  return message;
}

test.describe('BR negative paths and error UX', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(() => {
    test.skip(Boolean(skipReason), skipReason ?? undefined);
  });

  test('API rejects starting a round while tournament is open', async () => {
    const organizer = await createOrganizerClient(env!);
    const players = await createPlayerClients(env!, 1);
    const fixture = await setupBrRoundFixture(organizer, players, { activateRound: false });

    await expectApiMessage(
      () => organizer.expectFailureText('PATCH', `/api/br/rounds/${fixture.roundId}`, 400, {
        status: 'active',
        lobbyCode: fixture.lobbyCode,
      }),
      /must be marked as ongoing|ongoing/i,
    );
  });

  test('UI start-round failure uses friendly toast copy', async ({ page }) => {
    const organizer = await createOrganizerClient(env!);
    const players = await createPlayerClients(env!, 1);
    const fixture = await setupBrRoundFixture(organizer, players, { activateRound: false });
    await setTournamentOngoing(organizer, fixture.tournamentId);

    await loginViaUi(page, env!.organizerEmail, env!.organizerPassword);
    await openOrganizerGames(page, fixture.slug);
    await expandFirstRound(page);
    await setRoundSettings(page, {
      lobbyCode: fixture.lobbyCode,
      scheduledAt: new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 16),
    });
    await page.getByRole('button', { name: /^Start$/i }).click();
    await page.getByRole('button', { name: /^Start Round$/i }).click();
    await expectToast(page, /tournament window|Failed to update round/i, { timeout: 20_000 });
    await expectNoTechnicalCopy(page);
  });

  test('API rejects schedule outside tournament window', async () => {
    const organizer = await createOrganizerClient(env!);
    const players = await createPlayerClients(env!, 1);
    const fixture = await setupBrRoundFixture(organizer, players, {
      activateRound: false,
      endDate: new Date(Date.now() + 86_400_000).toISOString(),
    });

    await expectApiMessage(
      () => organizer.expectFailureText('POST', `/api/stages/${fixture.stageId}/br/groups/${fixture.groupId}/rounds`, 400, {
        scheduledAt: new Date(Date.now() + 30 * 86_400_000).toISOString(),
        lobbyCode: 'TOO-LATE',
      }),
      /tournament window/i,
    );
  });

  test('UI blocks starting without lobby code before hitting the API', async ({ page }) => {
    const organizer = await createOrganizerClient(env!);
    const players = await createPlayerClients(env!, 1);
    const fixture = await setupBrRoundFixture(organizer, players, { activateRound: false });
    await setTournamentOngoing(organizer, fixture.tournamentId);

    await loginViaUi(page, env!.organizerEmail, env!.organizerPassword);
    await openOrganizerGames(page, fixture.slug);
    await expandFirstRound(page);
    await page.getByPlaceholder('Enter lobby code...').fill('');
    await page.getByRole('button', { name: /^Start$/i }).click();
    await expectToast(page, /Lobby code required/i);
    await expectNoTechnicalCopy(page);
  });

  test('API rejects completing a live round without saved results', async () => {
    const organizer = await createOrganizerClient(env!);
    const players = await createPlayerClients(env!, 1);
    const fixture = await setupBrRoundFixture(organizer, players);

    const response = await organizer.request('PATCH', `/api/br/rounds/${fixture.roundId}`, {
      status: 'completed',
    });
    expect([400, 409]).toContain(response.status);
    expectFriendlyText(response.body);
    expect(response.body).toMatch(/save round results|results/i);
  });

  test('API rejects completing while evidence is unreviewed', async ({ page }) => {
    const organizer = await createOrganizerClient(env!);
    const players = await createPlayerClients(env!, 2);
    const fixture = await setupBrRoundFixture(organizer, players);

    await loginViaUi(page, env!.players[0].email, env!.players[0].password);
    await openPlayerGameRoom(page, fixture.slug, env!.brGameRoomPath);
    await submitPlayerEvidenceViaUI(page, evidencePath, fixture.lobbyCode);
    await expect.poll(
      () => getRoundEvidenceCount(organizer, fixture.roundId),
      { timeout: 30_000 },
    ).toBeGreaterThanOrEqual(1);

    await saveRoundResultsDirect(organizer, fixture.stageId, fixture.groupId, fixture.roundId);

    await expectApiMessage(
      () => organizer.expectFailureText('PATCH', `/api/br/rounds/${fixture.roundId}`, 409, {
        status: 'completed',
      }),
      /evidence.*reviewed|review/i,
    );
  });

  test('API rejects second active round in same group', async () => {
    const organizer = await createOrganizerClient(env!);
    const players = await createPlayerClients(env!, 1);
    const fixture = await setupBrRoundFixture(organizer, players);
    const round2 = await createRound(organizer, fixture.stageId, fixture.groupId, { lobbyCode: 'SECOND-ROUND' });

    await expectApiMessage(
      () => organizer.expectFailureText('PATCH', `/api/br/rounds/${round2.id}`, 400, {
        status: 'active',
        lobbyCode: 'SECOND-ROUND',
      }),
      /already live|already active/i,
    );
  });

  test('API rejects assigning groups when rounds exist', async () => {
    const organizer = await createOrganizerClient(env!);
    const players = await createPlayerClients(env!, 1);
    const fixture = await setupBrRoundFixture(organizer, players, { activateRound: false });

    await expectApiMessage(
      () => organizer.expectFailureText('POST', `/api/stages/${fixture.stageId}/br/groups/assign`, 409, {
        method: 'snake',
      }),
      /already has rounds/i,
    );
  });

  test('API rejects incomplete result grids', async () => {
    const organizer = await createOrganizerClient(env!);
    const players = await createPlayerClients(env!, 2);
    const fixture = await setupBrRoundFixture(organizer, players);
    const teams = await organizer.get<{ team_id?: string; participant_id?: string }[]>(
      `/api/stages/${fixture.stageId}/br/groups/${fixture.groupId}/teams`,
    );

    await expectApiMessage(
      () => organizer.expectFailureText('PUT', `/api/br/rounds/${fixture.roundId}/results`, 400, {
        results: [
          {
            teamId: teams[0].team_id ?? teams[0].participant_id,
            placement: 1,
            kills: 1,
          },
        ],
      }),
      /every team|all teams|results/i,
    );
  });

  test('API rejects evidence while round is pending', async () => {
    const organizer = await createOrganizerClient(env!);
    const players = await createPlayerClients(env!, 1);
    const fixture = await setupBrRoundFixture(organizer, players, { activateRound: false });
    const imageUrl = await players[0].uploadEvidenceImage(evidencePath);

    await expectApiMessage(
      () => players[0].expectFailureText('PUT', `/api/br/rounds/${fixture.roundId}/evidence`, 409, {
        imageUrl,
      }),
      /round is live|submitted while the round is live/i,
    );
  });

  test('public and organizer BR screens do not display technical error copy', async ({ page }) => {
    const organizer = await createOrganizerClient(env!);
    const players = await createPlayerClients(env!, 1);
    const fixture = await setupBrRoundFixture(organizer, players, { activateRound: false });
    const groups = await getBRGroups(organizer, fixture.stageId);
    expect(groups.length).toBeGreaterThan(0);

    await loginViaUi(page, env!.organizerEmail, env!.organizerPassword);
    await openOrganizerGames(page, fixture.slug);
    await expectNoTechnicalCopy(page);
  });
});
