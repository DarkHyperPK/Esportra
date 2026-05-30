import { test, expect } from '@playwright/test';
import { readE2eEnv, e2eSkipReason } from './helpers/env';
import { loginOrganizerViaUi } from './helpers/uiAuth';
import { expectNoTechnicalCopy } from './helpers/assertCopy';

const env = readE2eEnv();
const skipReason = e2eSkipReason(env);

test.describe('@promotion Organizer — manage tournaments gate', () => {
  test.beforeEach(({ page: _page }, testInfo) => {
    test.skip(!!skipReason, skipReason ?? undefined);
    testInfo.setTimeout(120_000);
  });

  test('manage tournaments page loads without crashing', async ({ page }) => {
    await loginOrganizerViaUi(page, env!.organizerEmail, env!.organizerPassword);

    await expect(page.getByText(/Manage Tournaments|Tournament Ops/i).first()).toBeVisible({
      timeout: 45_000,
    });
    await expect(page.getByRole('link', { name: /Create Tournament/i })).toBeVisible({
      timeout: 15_000,
    });
    await expectNoTechnicalCopy(page);
  });

  test('hosted tournaments tab renders list or empty state', async ({ page }) => {
    await loginOrganizerViaUi(page, env!.organizerEmail, env!.organizerPassword);

    await expect(
      page.getByRole('tab', { name: /Hosted Tournaments/i }).or(
        page.getByText(/Hosted Tournaments/i),
      ).first(),
    ).toBeVisible({ timeout: 30_000 });

    const empty = page.getByText(/No hosted tournaments found/i);
    const cards = page.locator('[class*="grid"]').locator('a, button').first();
    await expect(empty.or(cards)).toBeVisible({ timeout: 30_000 });
  });
});
