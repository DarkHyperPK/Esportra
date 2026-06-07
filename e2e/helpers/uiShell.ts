import fs from 'node:fs';
import path from 'node:path';
import type { Page, TestInfo } from '@playwright/test';
import { expect } from '@playwright/test';
import { dismissBetaModal, skipBetaModal } from './uiAuth';

const BENIGN_CONSOLE_PATTERNS = [
  /Autoplay check/i,
  /play\(\) failed/i,
  /NotAllowedError/i,
  /Hero video failed to load/i,
  /favicon/i,
  // WebKit logs blocked cross-origin fetches during preview/staging E2E — not app-thrown errors
  /due to access control checks/i,
];

export function attachConsoleErrorGuard(page: Page): string[] {
  const errors: string[] = [];
  const isBenign = (text: string) => BENIGN_CONSOLE_PATTERNS.some((pattern) => pattern.test(text));

  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    if (isBenign(text)) return;
    errors.push(text);
  });
  page.on('pageerror', (err) => {
    if (isBenign(err.message)) return;
    errors.push(err.message);
  });
  return errors;
}

export function expectNoConsoleErrors(errors: string[]): void {
  expect(errors, `Unexpected console errors:\n${errors.join('\n')}`).toEqual([]);
}

export function assertNoNewConsoleErrors(
  errors: string[],
  startIndex: number,
  context: string,
): void {
  const newErrors = errors.slice(startIndex);
  expect(newErrors, `Unexpected console errors on ${context}:\n${newErrors.join('\n')}`).toEqual(
    [],
  );
}

export async function waitForShellSettled(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => undefined);
}

export async function gotoShellPage(page: Page, route: string): Promise<void> {
  await skipBetaModal(page);
  const targetPath = route.startsWith('/') ? route : `/${route}`;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await page.goto(targetPath, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const interrupted =
        message.includes('interrupted') ||
        message.includes('NS_BINDING_ABORTED') ||
        message.includes('frame was detached');
      if (!interrupted) {
        throw error;
      }
      await page.waitForLoadState('domcontentloaded', { timeout: 20_000 }).catch(() => undefined);
    }

    const pathname = new URL(page.url()).pathname;
    if (pathname === targetPath || pathname.startsWith(`${targetPath}/`)) {
      break;
    }

    if (attempt === 2) {
      throw new Error(`Expected ${targetPath} but landed on ${pathname}`);
    }

    await page.waitForTimeout(400);
  }
  await dismissBetaModal(page);
}

export async function assertNavbarMounted(page: Page): Promise<void> {
  const navbar = page.locator('[data-app-navbar][data-mounted]');
  await expect(navbar).toBeVisible({ timeout: 30_000 });
  await expect(navbar.locator('.rounded-full').first()).toBeVisible();
}

export async function assertLandingNavbarFixed(page: Page): Promise<void> {
  await gotoShellPage(page, '/');
  const navbar = page.locator('[data-app-navbar]');
  await expect(navbar).toHaveClass(/fixed/);
}

export async function assertInnerNavbarSticky(page: Page): Promise<void> {
  await gotoShellPage(page, '/tournaments');
  const navbar = page.locator('[data-app-navbar]');
  await expect(navbar).toHaveClass(/sticky/);
}

export async function openDesktopDropdown(page: Page, label: string): Promise<void> {
  const trigger = page.getByRole('button', { name: new RegExp(label, 'i') }).first();
  await expect(trigger).toBeVisible({ timeout: 15_000 });
  await trigger.scrollIntoViewIfNeeded();
  await trigger.click({ timeout: 30_000 });
}

export async function clickDesktopDropdownItem(page: Page, itemText: string): Promise<void> {
  const pattern = new RegExp(`^${itemText}$`, 'i');
  const item = page
    .getByRole('button', { name: pattern })
    .or(page.getByRole('link', { name: pattern }))
    .first();
  await expect(item).toBeVisible({ timeout: 10_000 });
  await item.click();
}

export async function openMobileNav(page: Page): Promise<void> {
  const burger = page.getByRole('button', {
    name: /Open navigation menu|Close navigation menu/i,
  });
  await expect(burger).toBeVisible({ timeout: 15_000 });
  await burger.click();
  await expect(page.getByRole('button', { name: /Close navigation menu/i })).toBeVisible({
    timeout: 10_000,
  });
}

export async function closeMobileNav(page: Page): Promise<void> {
  const close = page.getByRole('button', { name: /Close navigation menu/i });
  if (await close.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await close.click();
  }
}

export async function openUserMenu(page: Page): Promise<void> {
  const navbar = page.locator('[data-app-navbar]');
  const authSection = navbar.locator('.flex.items-center.gap-3').last();
  const trigger = authSection.getByRole('button').last();
  await expect(trigger).toBeVisible({ timeout: 15_000 });
  await trigger.click();
  await expectMenuItemVisible(page, /My Profile/i);
}

export async function assertJackButtonVisible(page: Page, name: RegExp | string): Promise<void> {
  const button = page.getByRole('link', { name }).or(page.getByRole('button', { name }));
  await expect(button.first()).toBeVisible({ timeout: 15_000 });
}

export async function assertLenisActive(page: Page): Promise<void> {
  const active = await page.evaluate(() => document.documentElement.dataset.lenis === 'active');
  expect(active).toBe(true);
}

export async function expectMenuItemVisible(page: Page, name: RegExp | string): Promise<void> {
  const pattern = typeof name === 'string' ? new RegExp(name, 'i') : name;
  const item = page.getByRole('button', { name: pattern }).or(page.getByRole('link', { name: pattern }));
  await expect(item.first()).toBeVisible({ timeout: 10_000 });
}

export async function expectMenuItemHidden(page: Page, name: RegExp | string): Promise<void> {
  const pattern = typeof name === 'string' ? new RegExp(name, 'i') : name;
  await expect(
    page.getByRole('button', { name: pattern }).or(page.getByRole('link', { name: pattern })),
  ).toHaveCount(0);
}

export async function assertScrollWorks(page: Page): Promise<void> {
  const lenisActive = await page.evaluate(() => document.documentElement.dataset.lenis === 'active');
  const footer = page.locator('footer, [role="contentinfo"]').last();
  await expect(footer).toBeAttached({ timeout: 10_000 });

  const beforeBox = await footer.boundingBox();
  await page.mouse.move(720, 450);

  for (let i = 0; i < 8; i++) {
    await page.mouse.wheel(0, 500);
    await page.waitForTimeout(150);
  }
  await page.waitForTimeout(1200);

  const readScroll = () =>
    page.evaluate(() => Math.max(window.scrollY, document.documentElement.scrollTop));

  let after = await readScroll();
  let afterBox = await footer.boundingBox();
  let footerMovedUp = Boolean(beforeBox && afterBox && afterBox.y < beforeBox.y - 40);

  if (after <= 0 && !footerMovedUp) {
    await page.keyboard.press('End');
    await page.waitForTimeout(1200);
    after = await readScroll();
    afterBox = await footer.boundingBox();
    footerMovedUp = Boolean(beforeBox && afterBox && afterBox.y < beforeBox.y - 40);
  }

  if (after <= 0 && !footerMovedUp) {
    await page.evaluate(() => {
      window.dispatchEvent(
        new WheelEvent('wheel', { deltaY: 1600, bubbles: true, cancelable: true }),
      );
    });
    await page.waitForTimeout(1200);
    after = await readScroll();
    afterBox = await footer.boundingBox();
    footerMovedUp = Boolean(beforeBox && afterBox && afterBox.y < beforeBox.y - 40);
  }

  const footerInView = Boolean(afterBox && afterBox.y < (page.viewportSize()?.height ?? 900) - 80);
  expect(
    after > 0 || footerMovedUp || footerInView,
    lenisActive
      ? 'Expected Lenis wheel/keyboard scroll to move the page or bring footer into view'
      : 'Expected page scroll position to change',
  ).toBe(true);
}

export async function assertNoHorizontalOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return doc.scrollWidth > doc.clientWidth + 2;
  });
  expect(overflow).toBe(false);
}

export async function captureUiArtifact(
  page: Page,
  testInfo: TestInfo,
  name: string,
  options?: { fullPage?: boolean },
): Promise<void> {
  const dir = path.join('test-results', 'ui-refresh-artifacts', testInfo.project.name);
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: options?.fullPage ?? false });
  await testInfo.attach(name, { path: filePath, contentType: 'image/png' });
}

export const UI_REFRESH_PUBLIC_ROUTES = [
  '/',
  '/tournaments',
  '/venues',
  '/about',
  '/brand',
  '/refund-policy',
  '/auth/signin',
  '/leaderboards',
  '/partners',
  '/help',
] as const;
