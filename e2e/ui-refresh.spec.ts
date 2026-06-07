import { test, expect } from '@playwright/test';
import { readE2eEnv, e2eSkipReason } from './helpers/env';
import {
  attachConsoleErrorGuard,
  assertJackButtonVisible,
  assertLenisActive,
  assertNavbarMounted,
  assertNoHorizontalOverflow,
  assertNoNewConsoleErrors,
  assertScrollWorks,
  captureUiArtifact,
  clickDesktopDropdownItem,
  expectMenuItemVisible,
  expectMenuItemHidden,
  gotoShellPage,
  openDesktopDropdown,
  openUserMenu,
  UI_REFRESH_PUBLIC_ROUTES,
  waitForShellSettled,
} from './helpers/uiShell';
import {
  assertAnonymousHeroCtas,
  assertHeroHeadline,
  assertHeroVideoCredit,
  assertHostTournamentCta,
  assertLegacyHeroRemoved,
  assertSignedInHeroBrowseCta,
  toggleHeroMute,
} from './helpers/uiHero';
import {
  dismissBetaModal,
  loginOrganizerViaUi,
  loginPlayerViaUi,
  skipBetaModal,
} from './helpers/uiAuth';
import { expectNoTechnicalCopy } from './helpers/assertCopy';

const env = readE2eEnv();
const skipReason = e2eSkipReason(env);

function skipIfMissingEnv(): void {
  test.skip(Boolean(skipReason), skipReason ?? undefined);
}

test.describe('@ui-refresh @ui-refresh-desktop Site UI refresh — desktop shell', () => {
  test.describe.configure({ mode: 'serial' });

  test('NAV-01 navbar mounts with pill shell on homepage', async ({ page }, testInfo) => {
    await gotoShellPage(page, '/');
    await assertNavbarMounted(page);
    await captureUiArtifact(page, testInfo, 'navbar-home');
  });

  test('NAV-02 landing navbar is fixed; inner routes use sticky shell', async ({ page }) => {
    await gotoShellPage(page, '/');
    await expect(page.locator('[data-app-navbar]')).toHaveClass(/fixed/);
    await gotoShellPage(page, '/tournaments');
    await expect(page.locator('[data-app-navbar]')).toHaveClass(/sticky/);
  });

  test('NAV-03 anonymous auth links route to sign-in and sign-up', async ({ page }) => {
    await gotoShellPage(page, '/tournaments');
    await page.getByRole('link', { name: /Log in/i }).click();
    await expect(page).toHaveURL(/\/auth\/signin/);

    await gotoShellPage(page, '/tournaments');
    await page.getByRole('link', { name: /Sign Up|Jack In/i }).first().click();
    await expect(page).toHaveURL(/\/auth\/(signup|signin)/);
  });

  test('DD-01 venues dropdown navigates to find venues', async ({ page }, testInfo) => {
    await gotoShellPage(page, '/');
    await openDesktopDropdown(page, 'Venues');
    await clickDesktopDropdownItem(page, 'Find Venues');
    await expect(page).toHaveURL(/\/venues\/search/);
    await captureUiArtifact(page, testInfo, 'venues-dropdown');
  });

  test('DD-02 about dropdown navigates to FAQ', async ({ page }) => {
    await gotoShellPage(page, '/');
    await openDesktopDropdown(page, 'About');
    await clickDesktopDropdownItem(page, 'FAQ');
    await expect(page).toHaveURL(/\/about\/faq/);
  });

  test('HERO-01 headline visible without legacy mock stats', async ({ page }, testInfo) => {
    await gotoShellPage(page, '/');
    await assertHeroHeadline(page);
    await assertLegacyHeroRemoved(page);
    await captureUiArtifact(page, testInfo, 'hero-home', { fullPage: true });
  });

  test('HERO-02 anonymous Jack In routes to signup', async ({ page }) => {
    await assertAnonymousHeroCtas(page);
  });

  test('HERO-03 anonymous Host Tournament routes to signup', async ({ page }) => {
    await assertHostTournamentCta(page, /\/auth\/signup/);
  });

  test('HERO-04 video credit and mute control present', async ({ page }) => {
    const errors = attachConsoleErrorGuard(page);
    const start = errors.length;
    await assertHeroVideoCredit(page);
    await toggleHeroMute(page);
    assertNoNewConsoleErrors(errors, start, 'HERO-04');
  });

  test('LENIS-01 smooth scroll active and wheel scroll works', async ({ page }) => {
    await gotoShellPage(page, '/');
    await assertLenisActive(page);
    await assertScrollWorks(page);
  });

  test('PAGE-01 brand page renders with JackButton CTA', async ({ page }, testInfo) => {
    await gotoShellPage(page, '/brand');
    await assertNavbarMounted(page);
    await assertJackButtonVisible(page, /contact|get in touch/i);
    await expectNoTechnicalCopy(page);
    await captureUiArtifact(page, testInfo, 'brand-page', { fullPage: true });
  });

  test('PAGE-02 refund policy reachable and footer link works', async ({ page }, testInfo) => {
    await gotoShellPage(page, '/refund-policy');
    await expect(page.getByText(/refund/i).first()).toBeVisible();
    await captureUiArtifact(page, testInfo, 'refund-policy');

    await gotoShellPage(page, '/');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const footerLink = page.getByRole('link', { name: /Refund Policy/i });
    await expect(footerLink).toBeVisible({ timeout: 15_000 });
    await footerLink.click();
    await expect(page).toHaveURL(/\/refund-policy/);
  });

  test('REG-01 public route crawl loads navbar without app errors', async ({ page }) => {
    const errors = attachConsoleErrorGuard(page);
    for (const route of UI_REFRESH_PUBLIC_ROUTES) {
      const start = errors.length;
      await gotoShellPage(page, route);
      await assertNavbarMounted(page);
      await waitForShellSettled(page);
      await expect(page.locator('body')).not.toContainText(/Application error/i);
      await expectNoTechnicalCopy(page);
      assertNoNewConsoleErrors(errors, start, route);
    }
  });

  test('BETA-01 beta modal dismiss persists on reload', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const dismiss = page.getByRole('button', { name: "Don't show me again" });
    if (await dismiss.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await dismiss.click();
    }
    await page.reload({ waitUntil: 'domcontentloaded' });
    await dismissBetaModal(page);
    await expect(page.getByRole('button', { name: "Don't show me again" })).toHaveCount(0);
  });
});

test.describe('@ui-refresh @ui-refresh-desktop Site UI refresh — authenticated POVs', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(() => {
    skipIfMissingEnv();
  });

  test('NAV-04 organizer sees manage tournaments in tournaments menu', async ({ page }, testInfo) => {
    await loginOrganizerViaUi(page, env!.organizerEmail, env!.organizerPassword);
    const errors = attachConsoleErrorGuard(page);
    const start = errors.length;
    await gotoShellPage(page, '/');
    await openDesktopDropdown(page, 'Tournaments');
    await expectMenuItemVisible(page, /Manage Tournaments/i);
    await expectMenuItemVisible(page, /Manage Seasons/i);
    await captureUiArtifact(page, testInfo, 'organizer-tournaments-menu');
    assertNoNewConsoleErrors(errors, start, 'NAV-04');
  });

  test('NAV-05 player does not see organizer-only tournament menu items', async ({ page }) => {
    await loginPlayerViaUi(page, env!.players[0].email, env!.players[0].password);
    const errors = attachConsoleErrorGuard(page);
    const start = errors.length;
    await gotoShellPage(page, '/');
    await openDesktopDropdown(page, 'Tournaments');
    await expectMenuItemVisible(page, /Browse Tournaments/i);
    await expectMenuItemHidden(page, /Manage Tournaments/i);
    assertNoNewConsoleErrors(errors, start, 'NAV-05');
  });

  test('HERO-05 signed-in player browse CTA routes to tournaments', async ({ page }) => {
    await loginPlayerViaUi(page, env!.players[0].email, env!.players[0].password);
    const errors = attachConsoleErrorGuard(page);
    const start = errors.length;
    await assertSignedInHeroBrowseCta(page);
    assertNoNewConsoleErrors(errors, start, 'HERO-05');
  });

  test('HERO-06 organizer host CTA routes to create or verification', async ({ page }) => {
    await loginOrganizerViaUi(page, env!.organizerEmail, env!.organizerPassword);
    const errors = attachConsoleErrorGuard(page);
    const start = errors.length;
    await gotoShellPage(page, '/');
    const host = page.getByRole('link', { name: /Host Tournament/i });
    await expect(host).toBeVisible();
    await host.click();
    await expect(page).toHaveURL(/\/(tournaments\/create|verification|auth\/signup)/);
    assertNoNewConsoleErrors(errors, start, 'HERO-06');
  });

  test('UM-01 player user menu shows profile links', async ({ page }, testInfo) => {
    await loginPlayerViaUi(page, env!.players[0].email, env!.players[0].password);
    const errors = attachConsoleErrorGuard(page);
    const start = errors.length;
    await gotoShellPage(page, '/tournaments');
    await openUserMenu(page);
    await expectMenuItemVisible(page, /My Profile/i);
    await expectMenuItemVisible(page, /Create Your Team|My Team/i);
    await captureUiArtifact(page, testInfo, 'player-user-menu');
    assertNoNewConsoleErrors(errors, start, 'UM-01');
  });

  test('UM-02 organizer user menu shows manage tournaments', async ({ page }, testInfo) => {
    await loginOrganizerViaUi(page, env!.organizerEmail, env!.organizerPassword);
    const errors = attachConsoleErrorGuard(page);
    const start = errors.length;
    await gotoShellPage(page, '/tournaments');
    await openUserMenu(page);
    await expectMenuItemVisible(page, /Manage Tournaments/i);
    await captureUiArtifact(page, testInfo, 'organizer-user-menu');
    assertNoNewConsoleErrors(errors, start, 'UM-02');
  });

  test('UM-03 multi-role organizer can open role switcher dialog', async ({ page }, testInfo) => {
    await loginOrganizerViaUi(page, env!.organizerEmail, env!.organizerPassword);
    await gotoShellPage(page, '/tournaments');
    await openUserMenu(page);
    const switchButton = page.getByRole('button', { name: /^Switch$/i });
    if (await switchButton.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await switchButton.click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.getByRole('button', { name: /Player|Organizer/i }).first()).toBeVisible();
      await captureUiArtifact(page, testInfo, 'role-switcher-dialog');
      return;
    }
    test.info().annotations.push({
      type: 'note',
      description: 'Role switcher hidden — organizer account may lack approved license for switch UI',
    });
  });
});
