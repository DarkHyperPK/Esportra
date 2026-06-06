import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, expect } from '@playwright/test';
import { signInWithPassword } from './helpers/auth';
import { ApiClient } from './helpers/api';
import {
  setupBrRoundFixture,
  getRoundEvidenceCount,
  getStageCompletionStatus,
  publishRoundResultsFromEvidence,
  waitForPlayerLobbyCodeApi,
} from './helpers/brSetup';
import { readE2eEnv, e2eSkipReason } from './helpers/env';
import { loginViaUi } from './helpers/uiAuth';
import { assertNoOrphanLeaderboardZeros, openOrganizerGamesTab } from './helpers/uiLeaderboard';
import { assertNoManualStageStatusControls, assertDerivedStageProgressVisible, openOrganizerStagesTab } from './helpers/uiStages';
import { openPlayerGameRoom, submitPlayerEvidenceViaUI } from './helpers/uiBR';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const evidencePath = path.resolve(__dirname, 'fixtures/evidence.png');

const env = readE2eEnv();
const skipReason = e2eSkipReason(env);

test.describe('BR game room — multi-player evidence flow', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(() => {
    test.skip(Boolean(skipReason), skipReason ?? undefined);
  });

  test('API setup → parallel player logins → game room → evidence submit', async ({ browser }) => {
    if (!env) return;

    const activePlayers = env.players.slice(0, 2);

    const organizerSession = await signInWithPassword(
      env.supabaseUrl,
      env.supabaseAnonKey,
      env.organizerEmail,
      env.organizerPassword,
    );
    const organizer = new ApiClient(env.apiUrl, organizerSession.access_token);

    const playerSessions = await Promise.all(
      activePlayers.map((player) =>
        signInWithPassword(
          env.supabaseUrl,
          env.supabaseAnonKey,
          player.email,
          player.password,
        ),
      ),
    );
    const playerClients = playerSessions.map(
      (session) => new ApiClient(env.apiUrl, session.access_token),
    );

    const fixture = await setupBrRoundFixture(organizer, playerClients);

    const playerContexts = await Promise.all(
      activePlayers.map(() => browser.newContext()),
    );

    try {
      await Promise.all(
        playerContexts.map(async (context, index) => {
          const player = activePlayers[index];
          const playerClient = playerClients[index];
          await waitForPlayerLobbyCodeApi(playerClient, fixture.tournamentId, fixture.lobbyCode);
          const page = await context.newPage();
          await loginViaUi(page, player.email, player.password);
          await openPlayerGameRoom(page, fixture.slug, env.brGameRoomPath);

          await expect(page.getByText(fixture.tournamentName)).toBeVisible({ timeout: 45_000 });
          await submitPlayerEvidenceViaUI(page, evidencePath, fixture.lobbyCode);
        }),
      );

      await expect.poll(
        () => getRoundEvidenceCount(organizer, fixture.roundId),
        { timeout: 30_000 },
      ).toBeGreaterThanOrEqual(2);

      await publishRoundResultsFromEvidence(organizer, fixture.roundId);

      await expect.poll(
        async () => (await getStageCompletionStatus(organizer, fixture.stageId)).isComplete,
        { timeout: 30_000 },
      ).toBe(true);

      const organizerContext = await browser.newContext();
      const organizerPage = await organizerContext.newPage();
      try {
        await loginViaUi(organizerPage, env.organizerEmail, env.organizerPassword);
        await openOrganizerStagesTab(organizerPage, fixture.slug);
        await assertNoManualStageStatusControls(organizerPage);
        await assertDerivedStageProgressVisible(organizerPage);
        const leaderboardSection = await openOrganizerGamesTab(organizerPage, fixture.slug);
        await expect(leaderboardSection.getByText(activePlayers[0].email.split('@')[0])).toBeVisible();
        await expect(leaderboardSection.getByText(activePlayers[1].email.split('@')[0])).toBeVisible();
        await assertNoOrphanLeaderboardZeros(leaderboardSection);
      } finally {
        await organizerContext.close();
      }
    } finally {
      await Promise.all(playerContexts.map((context) => context.close()));
    }
  });

  test('legacy /br-lobby redirects to /br-game-room', async ({ page }) => {
    if (!env) return;
    test.skip(
      env.brGameRoomPath !== 'br-game-room',
      'Staging still uses /br-lobby only — run redirect test after canonical route deploy',
    );

    const player = env.players[0];

    await loginViaUi(page, player.email, player.password);

    const organizerSession = await signInWithPassword(
      env.supabaseUrl,
      env.supabaseAnonKey,
      env.organizerEmail,
      env.organizerPassword,
    );
    const organizer = new ApiClient(env.apiUrl, organizerSession.access_token);
    const playerSession = await signInWithPassword(
      env.supabaseUrl,
      env.supabaseAnonKey,
      player.email,
      player.password,
    );
    const playerClient = new ApiClient(env.apiUrl, playerSession.access_token);
    const fixture = await setupBrRoundFixture(organizer, [playerClient]);

    await page.goto(`/tournaments/${fixture.slug}/br-lobby`);
    await page.waitForURL(`**/tournaments/${fixture.slug}/br-game-room`, { timeout: 30_000 });
    expect(page.url()).toContain('/br-game-room');
  });
});
