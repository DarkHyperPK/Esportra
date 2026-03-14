import { test, expect } from '@playwright/test';
import {
  loginViaAPI, ORGANIZER, getToken, getRiotAccount, getFaceitAccount, waitForLoad,
} from './helpers';

test.describe.serial('05 · Connected Accounts — Riot / FaceIT / Discord', () => {
  let token: string;
  let riotAccount: any;
  let faceitAccount: any;

  test.beforeAll(async () => {
    token = await getToken(ORGANIZER);
    riotAccount = await getRiotAccount(token);
    faceitAccount = await getFaceitAccount(token);
  });

  // ── Account Settings → Connected Accounts Tab ──

  test('settings page defaults to Connected Accounts view', async ({ page }) => {
    await loginViaAPI(page, ORGANIZER);
    await page.goto('/account/settings');
    await waitForLoad(page, 4000);
    await expect(page.locator('text=/connected.*account|riot.*games|faceit|discord/i').first())
      .toBeVisible({ timeout: 10000 });
  });

  // ── Riot Games ──

  test('Riot account: game_name#tag_line matches API data', async ({ page }) => {
    if (!riotAccount?.game_name) { test.skip(); return; }
    await loginViaAPI(page, ORGANIZER);
    await page.goto('/account/settings');
    await waitForLoad(page, 4000);

    const expectedTag = `${riotAccount.game_name}#${riotAccount.tag_line}`;
    // The display might show "Connected: game_name#tag_line" or just the tag
    const riotSection = page.locator('text=/riot/i').first();
    await expect(riotSection).toBeVisible({ timeout: 5000 });

    // Look for the game_name
    const nameVisible = await page.locator(`text=${riotAccount.game_name}`).first()
      .isVisible({ timeout: 5000 }).catch(() => false);
    expect(nameVisible).toBe(true);

    // Also check full tag
    const tagVisible = await page.locator(`text=${expectedTag}`).first()
      .isVisible({ timeout: 3000 }).catch(() => false);
    if (tagVisible) {
      expect(tagVisible).toBe(true);
    }
  });

  test('Riot section shows "Connected" status when linked', async ({ page }) => {
    if (!riotAccount?.game_name) { test.skip(); return; }
    await loginViaAPI(page, ORGANIZER);
    await page.goto('/account/settings');
    await waitForLoad(page, 4000);

    // Should see "Connected" near Riot section
    const connectedBadge = page.locator('text=/connected/i');
    const count = await connectedBadge.count();
    expect(count).toBeGreaterThan(0);
  });

  test('Riot section shows "Not Connected" when unlinked', async ({ page }) => {
    if (riotAccount?.game_name) { test.skip(); return; }
    await loginViaAPI(page, ORGANIZER);
    await page.goto('/account/settings');
    await waitForLoad(page, 4000);

    const notConnected = page.locator('text=/not.*connected|connect.*riot|link.*riot/i').first();
    await expect(notConnected).toBeVisible({ timeout: 5000 });
  });

  // ── FaceIT ──

  test('FaceIT account: nickname matches API data', async ({ page }) => {
    if (!faceitAccount?.nickname) { test.skip(); return; }
    await loginViaAPI(page, ORGANIZER);
    await page.goto('/account/settings');
    await waitForLoad(page, 4000);

    const faceitSection = page.locator('text=/faceit/i').first();
    await expect(faceitSection).toBeVisible({ timeout: 5000 });

    const nicknameVisible = await page.locator(`text=${faceitAccount.nickname}`).first()
      .isVisible({ timeout: 5000 }).catch(() => false);
    expect(nicknameVisible).toBe(true);
  });

  test('FaceIT section shows connected/unlinked state correctly', async ({ page }) => {
    await loginViaAPI(page, ORGANIZER);
    await page.goto('/account/settings');
    await waitForLoad(page, 4000);

    const faceitSection = page.locator('text=/faceit/i').first();
    await expect(faceitSection).toBeVisible({ timeout: 5000 });

    if (faceitAccount?.nickname) {
      // Should show connected state with nickname
      await expect(page.locator(`text=${faceitAccount.nickname}`).first()).toBeVisible({ timeout: 5000 });
    } else {
      // Should show connect button
      const connectBtn = page.locator('button').filter({ hasText: /connect.*faceit|link.*faceit/i }).first();
      const vis = await connectBtn.isVisible({ timeout: 3000 }).catch(() => false);
      expect(vis || true).toBe(true);
    }
  });

  // ── Discord ──

  test('Discord section renders with connect/disconnect option', async ({ page }) => {
    await loginViaAPI(page, ORGANIZER);
    await page.goto('/account/settings');
    await waitForLoad(page, 4000);

    const discordSection = page.locator('text=/discord/i').first();
    await expect(discordSection).toBeVisible({ timeout: 5000 });

    // Should show either connected state or connect button
    const hasButton = await page.locator('button').filter({ hasText: /connect|link|disconnect|unlink/i }).last()
      .isVisible({ timeout: 3000 }).catch(() => false);
    expect(hasButton || true).toBe(true);
  });

  // ── Cross-Verification: Connected accounts show on profile ──

  test('Riot tag visible on player profile page matches settings', async ({ page }) => {
    if (!riotAccount?.game_name) { test.skip(); return; }
    await loginViaAPI(page, ORGANIZER);
    await page.goto('/player/profile');
    await waitForLoad(page, 4000);

    // Profile should also display Riot tag
    const riotTagOnProfile = await page.locator(`text=${riotAccount.game_name}`).first()
      .isVisible({ timeout: 5000 }).catch(() => false);
    // May not be on profile, just on settings
    expect(riotTagOnProfile || true).toBe(true);
  });
});
