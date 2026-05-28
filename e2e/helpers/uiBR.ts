import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { dismissBetaModal, skipBetaModal } from './uiAuth';

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

export async function openPlayerGameRoom(page: Page, slug: string, path = 'br-game-room'): Promise<void> {
  await page.goto(`/tournaments/${slug}/${path}`);
  await dismissBetaModal(page);
  await expect(page.getByText(/Battle Royale|Round|not assigned|Waiting for Next Round/i).first()).toBeVisible({
    timeout: 45_000,
  });
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
  const placeInputs = page.locator('input[type="number"]').filter({ hasNot: page.locator('[placeholder="e.g. 5"]') });
  const count = await placeInputs.count();

  // The results grid alternates placement/kills inputs after the settings inputs.
  const gridStart = Math.max(0, count - (teamCount * 2));
  for (let i = 0; i < teamCount; i++) {
    await placeInputs.nth(gridStart + i * 2).fill(String(i + 1));
    await placeInputs.nth(gridStart + i * 2 + 1).fill(String(Math.max(0, 3 - i)));
  }
}
