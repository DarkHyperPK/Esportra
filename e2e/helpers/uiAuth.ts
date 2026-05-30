import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

const BETA_DISMISS_KEY = 'beta-notice-permanent-dismiss';

/** Skip staging beta modal via localStorage (works before first paint). */
export async function skipBetaModal(page: Page): Promise<void> {
  await page.addInitScript((key) => {
    localStorage.setItem(key, 'true');
  }, BETA_DISMISS_KEY);
}

/** Dismiss beta modal if it still appears. */
export async function dismissBetaModal(page: Page): Promise<void> {
  const dismiss = page.getByRole('button', { name: "Don't show me again" });
  if (await dismiss.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await dismiss.click();
    return;
  }
  const close = page.locator('[class*="z-[100]"]').getByRole('button').first();
  if (await close.isVisible({ timeout: 1_000 }).catch(() => false)) {
    await close.click();
  }
}

/** Wait until AuthContext has replaced the guest nav with a signed-in user menu. */
export async function waitForAuthenticatedNav(page: Page): Promise<void> {
  await expect(page.locator('nav').getByRole('link', { name: 'Log in' })).toBeHidden({
    timeout: 45_000,
  });
}

const NAV = { waitUntil: 'domcontentloaded' as const, timeout: 90_000 };

async function gotoReliable(page: Page, url: string): Promise<void> {
  try {
    await page.goto(url, { waitUntil: 'commit', timeout: 45_000 });
  } catch {
    await page.goto(url, NAV);
  }
  await page.waitForLoadState('domcontentloaded', { timeout: 30_000 }).catch(() => undefined);
}

/** Sign in through the app UI so Supabase session + AuthContext are fully initialized. */
export async function loginViaUi(page: Page, email: string, password: string): Promise<void> {
  await skipBetaModal(page);
  await gotoReliable(page, '/auth/signin');
  await dismissBetaModal(page);
  await page.getByPlaceholder('Enter your email').fill(email);
  await page.getByPlaceholder('Enter your password').fill(password);
  await page.getByRole('button', { name: 'Sign In' }).click();

  if (await page.getByText(/Invalid login credentials/i).isVisible({ timeout: 5_000 }).catch(() => false)) {
    throw new Error(`Login failed for ${email}: invalid credentials (check E2E_ORGANIZER_PASSWORD and Supabase URL in build)`);
  }

  await page.waitForURL((url) => !url.pathname.includes('/auth/signin'), {
    timeout: 60_000,
    waitUntil: 'domcontentloaded',
  });

  if (await page.getByText(/Invalid login credentials/i).isVisible({ timeout: 1_000 }).catch(() => false)) {
    throw new Error(`Login failed for ${email}: invalid credentials`);
  }

  await dismissBetaModal(page);
  await waitForAuthenticatedNav(page);
}

/** Wait until organizer tournaments shell is ready (post auth + role load). */
export async function ensureOrganizerRole(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.setItem('sessionRole', 'organizer');
  });
  await page.goto('/organizer/tournaments', { waitUntil: 'commit', timeout: 45_000 });
  await page.waitForLoadState('domcontentloaded', { timeout: 30_000 }).catch(() => undefined);
  await dismissBetaModal(page);
  if (page.url().includes('/unauthorized')) {
    throw new Error('Organizer session role not active — check E2E organizer account roles');
  }

  const rolesResponse = await page
    .waitForResponse((resp) => resp.url().includes('/api/me/roles'), { timeout: 45_000 })
    .catch(() => null);
  if (rolesResponse && !rolesResponse.ok()) {
    throw new Error(
      `Organizer roles API failed (${rolesResponse.status()}). Preview origin may be blocked by CORS — use http://localhost:4173 in CI.`,
    );
  }

  await expect(
    page
      .getByText(/Manage Tournaments|Hosted Tournaments|Tournament Ops|No hosted tournaments found|Loading tournaments/i)
      .first(),
  ).toBeVisible({ timeout: 45_000 });

  await expect(
    page.getByText(/Manage Tournaments|Hosted Tournaments|Tournament Ops|No hosted tournaments found/i).first(),
  ).toBeVisible({ timeout: 45_000 });
}

export async function loginOrganizerViaUi(page: Page, email: string, password: string): Promise<void> {
  await skipBetaModal(page);
  await page.addInitScript(() => {
    localStorage.setItem('sessionRole', 'organizer');
  });
  await loginViaUi(page, email, password);
  await ensureOrganizerRole(page);
}
