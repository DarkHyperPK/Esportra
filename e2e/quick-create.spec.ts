import { test, expect } from '@playwright/test';

test.describe('Quick Create wizard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tournaments/create');
  });

  test('shows only 4 sections — no bracket style or publish option', async ({ page }) => {
    // Select Quick start
    await page.getByText('Quick start').click();

    // Select Valorant template
    await page.getByText('Valorant').first().click();

    // Sections that must exist
    await expect(page.getByText('The basics')).toBeVisible();
    await expect(page.getByText('When it starts')).toBeVisible();
    await expect(page.getByText(/Number of/i)).toBeVisible();
    await expect(page.getByText('Where it\'s played')).toBeVisible();

    // Sections that must NOT exist
    await expect(page.getByText(/bracket style/i)).not.toBeVisible();
    await expect(page.getByText(/lobby format/i)).not.toBeVisible();
    await expect(page.getByText(/after you create it/i)).not.toBeVisible();
    await expect(page.getByText(/publish now/i)).not.toBeVisible();
  });

  test('button always reads "Create draft"', async ({ page }) => {
    await page.getByText('Quick start').click();
    await page.getByText('Valorant').first().click();
    await expect(page.getByRole('button', { name: /create draft/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /publish/i })).not.toBeVisible();
  });

  test('bye-note does not appear when team count is not a power of 2', async ({ page }) => {
    await page.getByText('Quick start').click();
    await page.getByText('Valorant').first().click();

    // Type a non-power-of-2 team count
    const teamInput = page.getByPlaceholder(/or type a number/i);
    await teamInput.fill('6');

    await expect(page.getByText(/first-round bye/i)).not.toBeVisible();
  });

  test('submit creates draft and lands on Format & Stages panel', async ({ page }) => {
    await page.getByText('Quick start').click();
    await page.getByText('Valorant').first().click();

    // Give it a unique name
    const name = `E2E Test ${Date.now()}`;
    const nameInput = page.getByLabel(/tournament name/i);
    await nameInput.fill(name);

    await page.getByRole('button', { name: /create draft/i }).click();

    // Should land on the dashboard with Format & Stages tab active
    await expect(page).toHaveURL(/\/organizer\/tournament\/[^/]+\?tab=format-stages/, {
      timeout: 15_000,
    });
  });
});
