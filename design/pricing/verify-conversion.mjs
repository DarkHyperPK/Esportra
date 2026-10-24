import fs from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';

const browser = await chromium.launch({ headless: true });
const checks = [];
const errors = [];
const url = 'http://127.0.0.1:5178/design/pricing/';
const reference = 'ESP-123456781234123412341234567890AB';
const invoice = { amount: 12000, currency: 'PKR', expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(), paymentDetails: {
  sellerName: 'Esportra · Test Seller', bankName: 'Test Bank', accountTitle: 'Test Business Account', accountNumber: 'TEST-ACCOUNT-NOT-REAL', instructions: 'Test fixture. Do not make a payment.', qrImageUrl: null,
} };
const receipt = { reference, estimatedAmount: 12000, currency: 'PKR', invoice };
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1080 }, reducedMotion: 'reduce' });
  const page = await context.newPage(); page.on('pageerror', e => errors.push(e.message));
  let configured = false; let submitted = false; let firstRequest = null; let details = null; let creates = 0;
  await page.route('**/api/pro-event-requests**', async route => {
    const request = route.request();
    if (request.url().endsWith('/proof')) {
      expect(request.headers()['x-pro-request-token']).toMatch(/^[a-f0-9]{64}$/i);
      submitted = true; await route.fulfill({ json: { status: 'proof_submitted' } }); return;
    }
    if (request.method() === 'GET') { await route.fulfill({ json: { receipt, details, status: submitted ? 'proof_submitted' : 'pending' } }); return; }
    creates++; const payload = request.postDataJSON();
    if (!firstRequest) firstRequest = payload;
    if (!configured) { await route.fulfill({ status: 503, json: { error: 'Instant invoicing is not configured.' } }); return; }
    expect(payload.requestId).toBe(firstRequest.requestId); expect(payload.accessToken).toBe(firstRequest.accessToken);
    details = payload; await route.fulfill({ json: receipt });
  });
  await page.goto(url, { waitUntil: 'networkidle' });
  const budget = page.locator('.pricing-budget');
  const teamCount = budget.getByLabel('Teams in your event', { exact: false });
  const slider = budget.getByRole('slider', { name: 'Adjust team count' });
  await expect(teamCount).toHaveValue('32');
  await expect(slider).toHaveAttribute('min', '2');
  await expect(budget.locator('.pricing-budget-total strong')).toHaveText('12,800');
  await expect(budget.getByRole('link', { name: 'Host this event free' })).toHaveAttribute('href', '/auth/signup');
  await expect(budget.locator('.pricing-budget-extras')).toHaveCount(0);
  await expect(budget.getByText(/sponsorship|other known costs/i)).toHaveCount(0);
  await slider.focus(); await page.keyboard.press('Home');
  await expect(teamCount).toHaveValue('2');
  await expect(budget.locator('.pricing-budget-total strong')).toHaveText('800');
  await budget.getByRole('button', { name: '64', exact: true }).click();
  await expect(budget.locator('.pricing-budget-total strong')).toHaveText('13,600');
  await teamCount.fill('65');
  await expect(budget.locator('.pricing-budget-ledger')).toContainText('PKR 25,000');
  await expect(budget.locator('.pricing-budget-total strong')).toHaveText('1,000');
  await budget.getByRole('button', { name: 'Make this event happen' }).click();
  await expect(page.getByLabel('Maximum teams', { exact: true })).toHaveValue('65');
  await page.getByRole('button', { name: 'Close event booking' }).click();
  await page.getByLabel('Entry fee per team').fill('0');
  await expect(budget.locator('.pricing-budget-result')).toHaveAttribute('data-deficit', 'true');
  await expect(budget.locator('.pricing-budget-total strong')).toHaveText('-25,000');
  await page.getByLabel('Entry fee per team').fill('1000');
  await teamCount.fill('10000');
  await expect(budget.locator('.pricing-budget-total strong')).toHaveText('Let’s go bigger.');
  await expect(budget.locator('.pricing-budget-ledger')).toContainText('Custom quote');
  await budget.getByRole('button', { name: 'Get my event quote' }).click();
  await expect(page.getByLabel('Maximum teams', { exact: true })).toHaveValue('10000');
  await page.getByRole('button', { name: 'Close event booking' }).click();
  await budget.getByRole('button', { name: '32', exact: true }).click();
  checks.push('Earnings calculator: Free default, 2-team keyboard minimum, exact sizes, automatic Pro tiers, custom quote, no sponsorship/cost inputs; booking carries exact count');
  await budget.screenshot({ path: 'design/pricing/budget-conversion-desktop.png' });

  const opener = page.locator('.pricing-plan-pro').getByRole('button', { name: 'Plan my Pro event' });
  await opener.focus(); await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog'); await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape'); await expect(dialog).toHaveCount(0); await expect(opener).toBeFocused();
  await opener.click();
  await page.getByLabel('Event name', { exact: true }).fill('The Test Cup');
  await page.getByLabel('Game', { exact: true }).fill('Valorant');
  const start = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
  await page.getByLabel('Start date').fill(start); await page.getByLabel('End date').fill(start);
  await page.getByLabel('Reply email').fill('host@example.test');
  await page.getByRole('button', { name: 'Create my Pro invoice', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('not configured');
  await expect(page.getByLabel('Event name', { exact: true })).toHaveValue('The Test Cup');
  configured = true;
  await page.getByRole('button', { name: 'Create my Pro invoice', exact: true }).click();
  await expect(dialog.getByText('Your Pro invoice is ready.')).toBeVisible();
  await expect(dialog.getByText('Test Business Account', { exact: true })).toBeVisible();
  expect(creates).toBe(2);
  checks.push('Booking keyboard focus, missing-configuration error, preserved fields and stable retry identity');
  await dialog.screenshot({ path: 'design/pricing/invoice-conversion-desktop.png' });
  const downloadPromise = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'Download invoice details' }).click();
  const download = await downloadPromise; const content = await fs.readFile(await download.path(), 'utf8');
  expect(content).toContain(reference); expect(content).not.toContain(firstRequest.accessToken);
  await page.reload({ waitUntil: 'networkidle' }); await opener.click();
  await expect(page.getByRole('dialog').getByText('Your Pro invoice is ready.')).toBeVisible();
  checks.push('Invoice download excludes access token; refresh restores private invoice within the tab');
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jG4kAAAAASUVORK5CYII=', 'base64');
  await page.getByLabel('Already paid? Upload proof').setInputFiles({ name: 'proof.png', mimeType: 'image/png', buffer: png });
  await page.getByRole('button', { name: 'Submit payment proof', exact: true }).click();
  await expect(page.getByText('Proof submitted for review.', { exact: true })).toBeVisible();
  await expect(page.getByText('Your event is not activated', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Close event booking' }).click(); await opener.click();
  await expect(page.getByText('Proof submitted for review.', { exact: true })).toBeVisible();
  checks.push('Private proof upload and review state survive modal close; no fake activation');

  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
    if (width === 390) await dialog.screenshot({ path: 'design/pricing/invoice-conversion-mobile.png' });
  }
  await page.getByRole('button', { name: 'Close event booking' }).click();
  for (const width of [320, 390, 768, 1440, 1920]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  }
  await page.setViewportSize({ width: 390, height: 1000 });
  await budget.screenshot({ path: 'design/pricing/budget-conversion-mobile.png' });
  checks.push('Page and invoice dialog responsive overflow, 320 through 1920 pixels');
  expect(errors).toEqual([]);
  await fs.writeFile('design/pricing/conversion-checks.json', JSON.stringify({ status: 'passed', checks, pageErrors: errors, api: 'controlled browser fixtures; PostgreSQL API tests run separately' }, null, 2));
  console.log(`PASS: ${checks.length} conversion groups; no page errors. Browser payment data is a fixture.`);
  await context.close();
} finally { await browser.close(); }
