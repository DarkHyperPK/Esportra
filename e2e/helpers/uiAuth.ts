import type { Page } from '@playwright/test';

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
  }
}

/** Sign in through the app UI so Supabase session + AuthContext are fully initialized. */
export async function loginViaUi(page: Page, email: string, password: string): Promise<void> {
  await skipBetaModal(page);
  await page.goto('/auth/signin');
  await dismissBetaModal(page);
  await page.getByPlaceholder('Enter your email').fill(email);
  await page.getByPlaceholder('Enter your password').fill(password);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForURL((url) => !url.pathname.includes('/auth/signin'), { timeout: 45_000 });
}
