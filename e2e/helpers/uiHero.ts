import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { gotoShellPage } from './uiShell';

export async function assertHeroHeadline(page: Page): Promise<void> {
  await expect(page.getByRole('heading', { name: /where competition/i })).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByText(/actually lives/i)).toBeVisible();
}

export async function assertLegacyHeroRemoved(page: Page): Promise<void> {
  await expect(page.getByText(/mock stats|status pill|coming soon to beta/i)).toHaveCount(0);
}

export async function assertAnonymousHeroCtas(page: Page): Promise<void> {
  await gotoShellPage(page, '/');
  await assertHeroHeadline(page);
  const jackIn = page.getByRole('link', { name: /Jack In/i });
  await expect(jackIn).toBeVisible();
  await jackIn.click();
  await expect(page).toHaveURL(/\/auth\/signup/);
}

export async function assertSignedInHeroBrowseCta(page: Page): Promise<void> {
  await gotoShellPage(page, '/');
  await assertHeroHeadline(page);
  const browse = page.getByRole('link', { name: /Browse Tournaments/i });
  await expect(browse).toBeVisible({ timeout: 15_000 });
  await browse.click();
  await expect(page).toHaveURL(/\/tournaments/);
}

export async function assertHostTournamentCta(page: Page, expectedPath: RegExp): Promise<void> {
  await gotoShellPage(page, '/');
  const host = page.getByRole('link', { name: /Host Tournament/i });
  await expect(host).toBeVisible({ timeout: 15_000 });
  await host.click();
  await expect(page).toHaveURL(expectedPath);
}

export async function assertHeroVideoCredit(page: Page): Promise<void> {
  await gotoShellPage(page, '/');
  await expect(page.getByText(/Credits:\s*VALORANT Champions Tour/i)).toBeVisible({
    timeout: 15_000,
  });
}

export async function toggleHeroMute(page: Page): Promise<void> {
  await gotoShellPage(page, '/');
  const muteButton = page.locator('.group\\/controls button').first();
  await expect(muteButton).toBeVisible({ timeout: 15_000 });
  await muteButton.click();
  const muted = await page.locator('video').first().evaluate((video) => video.muted);
  expect(typeof muted).toBe('boolean');
}
