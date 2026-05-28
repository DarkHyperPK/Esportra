import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { dismissBetaModal, skipBetaModal } from './uiAuth';

export async function openOrganizerStagesTab(page: Page, slug: string): Promise<void> {
  await page.goto(`/organizer/tournament/${slug}?tab=stages`);
  await expect(
    page.getByText(/Battle Royale Stages|Tournament Stages|Main Event|Qualifiers/i).first(),
  ).toBeVisible({ timeout: 45_000 });
}

export async function openPublicStagesTab(page: Page, slug: string): Promise<void> {
  await skipBetaModal(page);
  await page.goto(`/tournaments/${slug}?tab=stages`);
  await dismissBetaModal(page);
  await expect(
    page.getByText(/Tournament Structure|Stage 01|Setup|In Progress|Main Event/i).first(),
  ).toBeVisible({ timeout: 45_000 });
}

/** Manual stage status dropdowns should not exist after stage-status simplification. */
export async function assertNoManualStageStatusControls(page: Page): Promise<void> {
  const legacyStatusComboboxes = page.locator('button[role="combobox"]').filter({
    hasText: /^(upcoming|live|completed)$/i,
  });
  await expect(legacyStatusComboboxes).toHaveCount(0);
}

/** Derived progress labels replace legacy upcoming/live/completed badges. */
export async function assertDerivedStageProgressVisible(page: Page): Promise<void> {
  await expect(
    page.getByText(/Setup|In Progress|Ready to Advance|Advanced/i).first(),
  ).toBeVisible({ timeout: 15_000 });
}

/** Legacy manual status badges must not appear on public or organizer views. */
export async function assertNoLegacyStageStatusBadges(page: Page): Promise<void> {
  await expect(page.getByText(/^Live Now$/i)).toHaveCount(0);
  await expect(page.getByText(/^upcoming$/i)).toHaveCount(0);
  await expect(page.locator('span').filter({ hasText: /^pending$/i })).toHaveCount(0);
}
