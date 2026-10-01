import { test, expect } from '@playwright/test';

// Tournament created during Postman QA (stageless draft owned by player2@gmail.com)
const TEST_SLUG = 'qa-test-1790846603';

test.describe('BasicInfoPanel — Online/LAN toggle', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/organizer/tournament/${TEST_SLUG}?tab=basic-info`);
    await page.waitForLoadState('networkidle');
    // Wait for the panel to load — generous timeout for cold first navigation
    await expect(page.getByText('Where it\'s played')).toBeVisible({ timeout: 20_000 });
  });

  test('shows Online and LAN choice cards', async ({ page }) => {
    await expect(page.getByRole('radio', { name: /Online/i }).first()).toBeVisible();
    await expect(page.getByRole('radio', { name: /LAN/i }).first()).toBeVisible();
  });

  test('selecting LAN reveals venue address input', async ({ page }) => {
    // Normalize to Online first (tournament may have a stale venue_address from a previous run)
    await page.getByRole('radio', { name: /Online/i }).first().click();
    const venueInput = page.getByPlaceholder(/street, city/i);
    await expect(venueInput).not.toBeVisible({ timeout: 3_000 });

    // Switch to LAN — input must appear
    await page.getByRole('radio', { name: /LAN/i }).first().click();
    await expect(venueInput).toBeVisible();
  });

  test('switching back to Online hides venue address input', async ({ page }) => {
    // Switch to LAN first
    await page.getByRole('radio', { name: /LAN/i }).first().click();
    await expect(page.getByPlaceholder(/street, city/i)).toBeVisible();

    // Switch back to Online
    await page.getByRole('radio', { name: /Online/i }).first().click();
    await expect(page.getByPlaceholder(/street, city/i)).not.toBeVisible();
  });

  test('venue address saves and persists after reload', async ({ page }) => {
    const address = `E2E Venue ${Date.now()}`;

    // Switch to LAN and fill address
    await page.getByRole('radio', { name: /LAN/i }).first().click();
    await page.getByPlaceholder(/street, city/i).fill(address);

    // Save
    await page.getByRole('button', { name: /save changes/i }).click();
    await expect(page.getByText('Saved', { exact: true }).first()).toBeVisible({ timeout: 5_000 });

    // Reload and verify — wait for network to settle so the fresh tournament data is loaded
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Where it\'s played')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByPlaceholder(/street, city/i)).toHaveValue(address, { timeout: 10_000 });
  });

  test('clearing venue address by switching to Online saves null', async ({ page }) => {
    // First set a venue address
    await page.getByRole('radio', { name: /LAN/i }).first().click();
    await page.getByPlaceholder(/street, city/i).fill('Temp Arena, Karachi');
    await page.getByRole('button', { name: /save changes/i }).click();
    await expect(page.getByText('Saved', { exact: true }).first()).toBeVisible({ timeout: 5_000 });
    // Wait for the first toast to clear so the second save assertion is unambiguous
    await expect(page.getByText('Saved', { exact: true }).first()).not.toBeVisible({ timeout: 8_000 });

    // Now switch to Online and save
    await page.getByRole('radio', { name: /Online/i }).first().click();
    await page.getByRole('button', { name: /save changes/i }).click();
    await expect(page.getByText('Saved', { exact: true }).first()).toBeVisible({ timeout: 5_000 });

    // Reload — should be Online with no venue input visible
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Where it\'s played')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByPlaceholder(/street, city/i)).not.toBeVisible();
  });
});
