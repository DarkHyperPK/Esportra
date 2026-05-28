import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { expectFriendlyText } from './assertCopy';

export async function expectToast(
  page: Page,
  expected: RegExp | string,
  options: { timeout?: number } = {},
): Promise<void> {
  const pattern = typeof expected === 'string' ? new RegExp(expected, 'i') : expected;
  const toast = page.locator('[data-radix-toast-viewport], [role="status"], [role="alert"]').filter({
    hasText: pattern,
  }).last();

  await expect(toast).toBeVisible({ timeout: options.timeout ?? 10_000 });
  expectFriendlyText((await toast.textContent()) ?? '');
}

export async function expectNoTechnicalToast(page: Page): Promise<void> {
  const visibleToastText = await page
    .locator('[data-radix-toast-viewport], [role="status"], [role="alert"]')
    .allTextContents()
    .catch(() => []);

  for (const text of visibleToastText) {
    if (text.trim()) expectFriendlyText(text);
  }
}
