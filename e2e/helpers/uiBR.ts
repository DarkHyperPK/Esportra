import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { dismissBetaModal, skipBetaModal, waitForAuthenticatedSession } from './uiAuth';

export async function openOrganizerTab(page: Page, slug: string, tab: 'stages' | 'games'): Promise<void> {
  await page.goto(`/organizer/tournament/${slug}?tab=${tab}`);
  await dismissBetaModal(page);
  await expect(page.getByRole('tab', { name: new RegExp(`^${tab}$`, 'i') })).toBeVisible({
    timeout: 45_000,
  });
}

export async function openOrganizerStages(page: Page, slug: string): Promise<void> {
  await openOrganizerTab(page, slug, 'stages');
  await expect(page.getByText(/Battle Royale Stages|Main Event|Qualifiers|Setup/i).first()).toBeVisible({
    timeout: 45_000,
  });
}

export async function openOrganizerGames(page: Page, slug: string): Promise<void> {
  await openOrganizerTab(page, slug, 'games');
  await expect(page.getByText(/Filter|Leaderboard|Rounds|Initialize Lobby/i).first()).toBeVisible({
    timeout: 45_000,
  });
}

export async function openPublicTournament(page: Page, slug: string): Promise<void> {
  await skipBetaModal(page);
  await page.goto(`/tournaments/${slug}`);
  await dismissBetaModal(page);
  await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 45_000 });
}

export async function openPublicLeaderboard(page: Page, slug: string): Promise<void> {
  await openPublicTournament(page, slug);
  await page.getByRole('tab', { name: /leaderboard/i }).click();
  await expect(page.getByText(/Leaderboard|Participants|No rounds|Round/i).first()).toBeVisible({
    timeout: 45_000,
  });
}

const brGameRoomReadyPattern =
  /not assigned to a BR lobby|Lobby Code|Round History|Your Standing|Waiting for Next Round|Report Your Results|Round Live|Waiting for lobby code/i;

export async function waitForBrGameRoomReady(page: Page, tournamentName?: string): Promise<void> {
  await waitForAuthenticatedSession(page);
  await expect(page.getByText('This is not a Battle Royale tournament')).toBeHidden({ timeout: 10_000 });
  await expect(page.getByText('Tournament not found.')).toBeHidden({ timeout: 5_000 });

  const readyLocator = tournamentName
    ? page.getByText(tournamentName).first()
        .or(page.getByRole('heading', { level: 1 }).first())
        .or(page.getByText(brGameRoomReadyPattern).first())
    : page.getByRole('heading', { level: 1 }).first()
        .or(page.getByText(brGameRoomReadyPattern).first());

  await expect(readyLocator).toBeVisible({ timeout: 45_000 });
}

export async function openPlayerGameRoom(
  page: Page,
  slug: string,
  path = 'br-game-room',
  tournamentName?: string,
): Promise<void> {
  await skipBetaModal(page);
  await page.goto(`/tournaments/${slug}/${path}`, { waitUntil: 'domcontentloaded' });
  await dismissBetaModal(page);
  await waitForBrGameRoomReady(page, tournamentName);
}

export async function waitForPlayerLobbyCode(page: Page, lobbyCode: string, timeoutMs = 90_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastHint = 'lobby code not visible yet';

  while (Date.now() < deadline) {
    await dismissBetaModal(page);
    try {
      await waitForAuthenticatedSession(page);
    } catch (error) {
      lastHint = `auth session not ready: ${error instanceof Error ? error.message : String(error)}`;
    }

    if (await page.getByText('This is not a Battle Royale tournament').isVisible().catch(() => false)) {
      throw new Error('BR game room rejected tournament type before lobby code appeared');
    }

    if (await page.getByText(/not assigned to a BR lobby/i).isVisible().catch(() => false)) {
      lastHint = 'player is not assigned to a BR lobby';
    } else if (await page.getByText(/Waiting for lobby code/i).isVisible().catch(() => false)) {
      lastHint = 'round is live but lobby code is still hidden';
    } else if (await page.getByText(lobbyCode).isVisible().catch(() => false)) {
      return;
    }

    await page.waitForTimeout(3_000);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await dismissBetaModal(page);
    try {
      await waitForBrGameRoomReady(page);
    } catch (error) {
      lastHint = `game room not ready: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  throw new Error(`Timed out waiting for lobby code ${lobbyCode}: ${lastHint}`);
}

export async function expandFirstRound(page: Page): Promise<Locator> {
  const roundButton = page.getByRole('button', { name: /Round\s+\d+/i }).first();
  await expect(roundButton).toBeVisible({ timeout: 20_000 });
  await roundButton.click();
  return page.locator('text=Round controls').locator('xpath=ancestor::div[contains(@class,"space-y-3")]').first();
}

export async function setRoundSettings(
  page: Page,
  settings: { lobbyCode?: string; scheduledAt?: string; queueTimerMinutes?: string },
): Promise<void> {
  if (settings.lobbyCode !== undefined) {
    await page.getByPlaceholder('Enter lobby code...').fill(settings.lobbyCode);
  }
  if (settings.scheduledAt !== undefined) {
    await page.locator('input[type="datetime-local"]').fill(settings.scheduledAt);
  }
  if (settings.queueTimerMinutes !== undefined) {
    await page.getByPlaceholder('e.g. 5').fill(settings.queueTimerMinutes);
  }
}

export async function fillResultsGrid(page: Page, teamCount: number): Promise<void> {
  const saveButton = page.getByRole('button', { name: /Save Results/i });
  const gridSection = saveButton.locator('xpath=ancestor::div[contains(@class,"space-y-3")]').first();
  const rows = gridSection.locator('.space-y-1 > div');

  await expect(rows.first()).toBeVisible({ timeout: 15_000 });
  await expect(rows).toHaveCount(teamCount, { timeout: 15_000 });

  for (let i = 0; i < teamCount; i++) {
    const inputs = rows.nth(i).locator('input[type="number"]');
    await inputs.nth(0).fill(String(i + 1));
    await inputs.nth(1).fill(String(Math.max(0, 3 - i)));
  }

  await expect(saveButton).toBeEnabled({ timeout: 15_000 });
}

export async function expectRoundLiveBadge(page: Page, roundNumber = 1): Promise<void> {
  const roundButton = page.getByRole('button', { name: new RegExp(`Round\\s+${roundNumber}`, 'i') }).first();
  await expect(roundButton).toContainText('Live', { timeout: 30_000 });
}

export async function waitForPlayerEvidenceUpload(page: Page, lobbyCode?: string, timeoutMs = 90_000): Promise<void> {
  if (lobbyCode) {
    await waitForPlayerLobbyCode(page, lobbyCode, timeoutMs);
  } else {
    await waitForBrGameRoomReady(page);
    await expect(page.getByText(/Report Your Results|Round \d+/i).first()).toBeVisible({
      timeout: timeoutMs,
    });
  }

  await expect(page.getByRole('button', { name: /Upload screenshot/i })).toBeVisible({
    timeout: 30_000,
  });
}

export async function submitPlayerEvidenceViaUI(page: Page, evidencePath: string, lobbyCode?: string): Promise<void> {
  await waitForPlayerEvidenceUpload(page, lobbyCode);
  await page.getByRole('button', { name: /Upload screenshot/i }).click();
  await page.locator('input[type="file"]').setInputFiles(evidencePath);
  await expect(page.getByRole('button', { name: /Submit Report/i })).toBeEnabled({ timeout: 15_000 });
  await page.getByRole('button', { name: /Submit Report/i }).click();
}
