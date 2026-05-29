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
