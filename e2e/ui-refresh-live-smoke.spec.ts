import { test, expect } from '@playwright/test';
import {
  assertNavbarMounted,
  captureUiArtifact,
  gotoShellPage,
  openMobileNav,
} from './helpers/uiShell';
import { assertHeroHeadline } from './helpers/uiHero';

const liveBaseUrl = process.env.E2E_STAGING_BASE_URL?.replace(/\/$/, '');

test.describe('@ui-refresh @ui-refresh-live Site UI refresh — live staging smoke', () => {
  test.skip(!liveBaseUrl, 'E2E_STAGING_BASE_URL not set — live UI smoke skipped');

  test.use({
    baseURL: liveBaseUrl,
  });

  test('LIVE-01 homepage navbar and hero visible on staging site', async ({ page }, testInfo) => {
    await gotoShellPage(page, '/');
    await assertNavbarMounted(page);
    await assertHeroHeadline(page);
    await captureUiArtifact(page, testInfo, 'live-home');
  });

  test('LIVE-02 brand and refund policy load on staging site', async ({ page }, testInfo) => {
    await gotoShellPage(page, '/brand');
    await assertNavbarMounted(page);
    await captureUiArtifact(page, testInfo, 'live-brand');

    await gotoShellPage(page, '/refund-policy');
    await expect(page.getByText(/refund/i).first()).toBeVisible();
    await captureUiArtifact(page, testInfo, 'live-refund');
  });

  test('LIVE-03 mobile drawer opens on live staging site', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoShellPage(page, '/');
    await openMobileNav(page);
    await expect(page.getByRole('button', { name: /Venues|Tournaments/i }).first()).toBeVisible();
    await captureUiArtifact(page, testInfo, 'live-mobile-nav');
  });
});
