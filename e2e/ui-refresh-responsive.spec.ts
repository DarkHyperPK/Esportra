import { test, expect } from '@playwright/test';
import { readE2eEnv, e2eSkipReason } from './helpers/env';
import {
  assertJackButtonVisible,
  assertNavbarMounted,
  assertNoHorizontalOverflow,
  assertNoNewConsoleErrors,
  attachConsoleErrorGuard,
  captureUiArtifact,
  closeMobileNav,
  expectMenuItemVisible,
  gotoShellPage,
  openMobileNav,
  UI_REFRESH_PUBLIC_ROUTES,
  waitForShellSettled,
} from './helpers/uiShell';
import { assertHeroHeadline } from './helpers/uiHero';
import { loginOrganizerViaUi, loginPlayerViaUi } from './helpers/uiAuth';
import { expectNoTechnicalCopy } from './helpers/assertCopy';

const env = readE2eEnv();
const skipReason = e2eSkipReason(env);

function skipIfMissingEnv(): void {
  test.skip(Boolean(skipReason), skipReason ?? undefined);
}

const RESPONSIVE_ROUTES = ['/', '/brand', '/refund-policy', '/tournaments'] as const;

test.describe('@ui-refresh @ui-refresh-responsive Site UI refresh — responsive shell', () => {
  test.describe.configure({ mode: 'serial' });

  test('MOB-01 burger opens and closes mobile navigation drawer', async ({ page }, testInfo) => {
    await gotoShellPage(page, '/');
    await openMobileNav(page);
    await expect(page.getByRole('button', { name: /Venues|Tournaments/i }).first()).toBeVisible();
    await captureUiArtifact(page, testInfo, 'mobile-nav-open');
    await closeMobileNav(page);
    await expect(page.getByRole('button', { name: /Open navigation menu/i })).toBeVisible();
  });

  test('MOB-02 mobile venues accordion navigates', async ({ page }) => {
    await gotoShellPage(page, '/');
    await openMobileNav(page);
    await page.getByRole('button', { name: /^Venues$/i }).click();
    await page.getByRole('link', { name: /Find Venues/i }).click();
    await expect(page).toHaveURL(/\/venues\/search/);
  });

  test('MOB-03 anonymous auth CTAs visible in mobile drawer', async ({ page }) => {
    await gotoShellPage(page, '/');
    await openMobileNav(page);
    await expect(page.getByRole('link', { name: /Log in|Sign In/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /Sign Up|Jack In/i }).first()).toBeVisible();
  });

  test('MOB-04 hero content and CTAs visible on narrow viewport', async ({ page }, testInfo) => {
    await gotoShellPage(page, '/');
    await assertHeroHeadline(page);
    await assertJackButtonVisible(page, /Jack In|Browse Tournaments/i);
    await captureUiArtifact(page, testInfo, 'mobile-hero', { fullPage: true });
  });

  test('MOB-05 no horizontal overflow on key public routes', async ({ page }) => {
    for (const route of RESPONSIVE_ROUTES) {
      await gotoShellPage(page, route);
      await assertNoHorizontalOverflow(page);
      await expectNoTechnicalCopy(page);
    }
  });

  test('MOB-06 brand and refund pages readable on narrow viewport', async ({ page }, testInfo) => {
    await gotoShellPage(page, '/brand');
    await assertNavbarMounted(page);
    await assertNoHorizontalOverflow(page);
    await captureUiArtifact(page, testInfo, 'mobile-brand');

    await gotoShellPage(page, '/refund-policy');
    await expect(page.getByText(/refund/i).first()).toBeVisible();
    await assertNoHorizontalOverflow(page);
    await captureUiArtifact(page, testInfo, 'mobile-refund');
  });

  test('MOB-07 route crawl keeps navbar mounted without horizontal overflow', async ({ page }) => {
    const errors = attachConsoleErrorGuard(page);
    for (const route of UI_REFRESH_PUBLIC_ROUTES) {
      const start = errors.length;
      await gotoShellPage(page, route);
      await assertNavbarMounted(page);
      await waitForShellSettled(page);
      await assertNoHorizontalOverflow(page);
      assertNoNewConsoleErrors(errors, start, route);
    }
  });
});

test.describe('@ui-refresh @ui-refresh-responsive Site UI refresh — authenticated mobile', () => {
  test.beforeEach(() => {
    skipIfMissingEnv();
  });

  test('MOB-08 signed-in player can open mobile nav and profile links', async ({ page }, testInfo) => {
    await loginPlayerViaUi(page, env!.players[0].email, env!.players[0].password);
    const errors = attachConsoleErrorGuard(page);
    const start = errors.length;
    await gotoShellPage(page, '/tournaments');
    await openMobileNav(page);
    await expect(page.getByRole('link', { name: /My Profile/i })).toBeVisible({ timeout: 15_000 });
    await captureUiArtifact(page, testInfo, 'mobile-player-drawer');
    assertNoNewConsoleErrors(errors, start, 'MOB-08');
  });

  test('MOB-09 signed-in organizer sees manage tournaments in mobile drawer', async ({ page }, testInfo) => {
    await loginOrganizerViaUi(page, env!.organizerEmail, env!.organizerPassword);
    const errors = attachConsoleErrorGuard(page);
    const start = errors.length;
    await gotoShellPage(page, '/');
    await openMobileNav(page);
    await page.getByRole('button', { name: /^Tournaments$/i }).click();
    await expectMenuItemVisible(page, /Manage Tournaments/i);
    await captureUiArtifact(page, testInfo, 'mobile-organizer-tournaments');
    assertNoNewConsoleErrors(errors, start, 'MOB-09');
  });
});
