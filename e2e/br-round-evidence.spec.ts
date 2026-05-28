import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, expect } from '@playwright/test';
import { signInWithPassword } from './helpers/auth';
import { ApiClient } from './helpers/api';
import {
  setupBrRoundFixture,
  getRoundEvidenceCount,
  submitPlayerEvidence,
} from './helpers/brSetup';
import { readE2eEnv, e2eSkipReason } from './helpers/env';
import { loginViaUi } from './helpers/uiAuth';

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
          const page = await context.newPage();
          await loginViaUi(page, player.email, player.password);
          await page.goto(`/tournaments/${fixture.slug}/${env.brGameRoomPath}`);

          await expect(page.getByText(fixture.tournamentName)).toBeVisible({ timeout: 45_000 });

          const lobbyCodeVisible = await page
            .getByText(fixture.lobbyCode)
            .isVisible({ timeout: 12_000 })
            .catch(() => false);

          if (lobbyCodeVisible) {
            await expect(page.getByText('Report Your Results')).toBeVisible();
            await page.getByText('Upload screenshot').click();
            await page.locator('input[type="file"]').setInputFiles(evidencePath);
            await expect(page.getByRole('button', { name: 'Submit Report' })).toBeEnabled();
            await page.getByRole('button', { name: 'Submit Report' }).click();
            await expect(page.getByText(/Evidence submitted for Round/i)).toBeVisible({ timeout: 45_000 });
          } else {
            // Staging may still run legacy BR game room UI without relational lobby state.
            await submitPlayerEvidence(
              playerClient,
              fixture.roundId,
              evidencePath,
              index + 1,
              index + 2,
            );
          }
        }),
      );

      await expect.poll(
        () => getRoundEvidenceCount(organizer, fixture.roundId),
        { timeout: 30_000 },
      ).toBeGreaterThanOrEqual(2);
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
