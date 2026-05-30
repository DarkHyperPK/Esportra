import type { Page } from '@playwright/test';
import { dismissBetaModal, skipBetaModal } from './uiAuth';

export type BrowseTab = 'upcoming' | 'live' | 'completed' | 'cancelled';

export async function openBrowseTab(page: Page, tab: BrowseTab): Promise<void> {
  await skipBetaModal(page);
  await page.goto(`/tournaments?tab=${tab}`);
  await dismissBetaModal(page);
}

export async function selectBrowseRegion(page: Page, regionValue: string): Promise<void> {
  const regionSelect = page.locator('select').filter({
    has: page.locator('option', { hasText: 'All Regions' }),
  });
  await regionSelect.selectOption(regionValue);
}

export async function selectBrowseFormatOnline(page: Page): Promise<void> {
  await page.getByRole('button', { name: /^Online$/i }).click();
}

export async function clearBrowseFilters(page: Page): Promise<void> {
  const clear = page.getByRole('button', { name: /Clear filters/i });
  if (await clear.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await clear.click();
  }
}

/** Wait for browse list API to succeed (fails fast if CORS blocks localhost → staging API). */
export async function waitForBrowseList(page: Page): Promise<void> {
  const response = await page.waitForResponse(
    (resp) => resp.url().includes('/api/tournaments') && resp.request().method() === 'GET',
    { timeout: 45_000 },
  );
  if (!response.ok()) {
    throw new Error(
      `Browse list API failed (${response.status()}). If running preview locally, ensure staging API CORS allows http://localhost:4173.`,
    );
  }
}
