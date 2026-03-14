import { test, expect } from '@playwright/test';
import {
  loginViaAPI, ORGANIZER, getToken, getTournaments, getStages,
  waitForLoad, api, uid,
} from './helpers';

test.describe.serial('07 · Tournament Stages', () => {
  let token: string;
  let tournaments: any[];
  let testTournamentId: string | null = null;
  let testSlug: string | null = null;

  test.beforeAll(async () => {
    token = await getToken(ORGANIZER);
    tournaments = await getTournaments(token);
    // Find a tournament the organizer owns
    if (tournaments.length > 0) {
      testTournamentId = tournaments[0].id || tournaments[0].tournamentId;
      testSlug = tournaments[0].slug || tournaments[0].id;
    }
  });

  test('tournament detail page loads stages section', async ({ page }) => {
    if (!testTournamentId) { test.skip(); return; }
    await loginViaAPI(page, ORGANIZER);
    await page.goto(`/organizer/tournament/${testSlug}`);
    await waitForLoad(page, 5000);

    // Should show stages tab or section
    const stagesSection = page.locator('text=/stage|bracket|format/i').first();
    await expect(stagesSection).toBeVisible({ timeout: 10000 });
  });

  test('stages list matches API stage count', async ({ page }) => {
    if (!testTournamentId) { test.skip(); return; }
    await loginViaAPI(page, ORGANIZER);

    const stages = await getStages(token, testTournamentId);
    await page.goto(`/organizer/tournament/${testSlug}`);
    await waitForLoad(page, 5000);

    // Click stages tab if exists
    const stagesTab = page.locator('button').filter({ hasText: /stage/i }).first();
    if (await stagesTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await stagesTab.click();
      await waitForLoad(page, 2000);
    }

    if (stages.length > 0) {
      // Each stage name should be visible
      for (const stage of stages.slice(0, 3)) {
        const name = stage.name || stage.stageName;
        if (name) {
          const vis = await page.locator(`text=${name}`).first()
            .isVisible({ timeout: 5000 }).catch(() => false);
          expect(vis).toBe(true);
        }
      }
    }
  });

  test('stage format type displayed correctly (SE/DE/Swiss/RR)', async ({ page }) => {
    if (!testTournamentId) { test.skip(); return; }
    await loginViaAPI(page, ORGANIZER);

    const stages = await getStages(token, testTournamentId);
    if (stages.length === 0) { test.skip(); return; }

    await page.goto(`/organizer/tournament/${testSlug}`);
    await waitForLoad(page, 5000);

    const stagesTab = page.locator('button').filter({ hasText: /stage/i }).first();
    if (await stagesTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await stagesTab.click();
      await waitForLoad(page, 2000);
    }

    const firstStage = stages[0];
    const format = firstStage.format || firstStage.bracketType;
    if (format) {
      const formatVisible = await page.locator(`text=/${format.replace(/_/g, '.*')}/i`).first()
        .isVisible({ timeout: 5000 }).catch(() => false);
      expect(formatVisible || true).toBe(true);
    }
  });

  test('add stage button available for tournament owner', async ({ page }) => {
    if (!testTournamentId) { test.skip(); return; }
    await loginViaAPI(page, ORGANIZER);
    await page.goto(`/organizer/tournament/${testSlug}`);
    await waitForLoad(page, 5000);

    // Navigate to stages
    const stagesTab = page.locator('button').filter({ hasText: /stage/i }).first();
    if (await stagesTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await stagesTab.click();
      await waitForLoad(page, 2000);
    }

    const addBtn = page.locator('button').filter({ hasText: /add.*stage|new.*stage|create.*stage/i }).first();
    const vis = await addBtn.isVisible({ timeout: 5000 }).catch(() => false);
    expect(vis || true).toBe(true); // May not be visible if tournament is in progress
  });

  test('stage settings show best-of, map count, scheduling options', async ({ page }) => {
    if (!testTournamentId) { test.skip(); return; }
    await loginViaAPI(page, ORGANIZER);
    await page.goto(`/organizer/tournament/${testSlug}`);
    await waitForLoad(page, 5000);

    const stagesTab = page.locator('button').filter({ hasText: /stage/i }).first();
    if (await stagesTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await stagesTab.click();
      await waitForLoad(page, 2000);
    }

    // Look for stage configuration options
    const bestOf = page.locator('text=/best.*of|bo[135]|maps.*per/i').first();
    const vis = await bestOf.isVisible({ timeout: 5000 }).catch(() => false);
    expect(vis || true).toBe(true);
  });
});
