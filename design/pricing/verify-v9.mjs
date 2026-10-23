import fs from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';

const url = process.argv[2] || 'http://127.0.0.1:5178/design/pricing/';
const browser = await chromium.launch({ headless: true });
const errors = [];
const checks = [];
const check = label => checks.push(label);
const open = async context => {
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(url, { waitUntil: 'networkidle' });
  return page;
};

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  const page = await open(context);
  await page.locator('.pricing-compare-details > summary').click();
  const rates = page.getByRole('group', { name: 'Select your event bracket' });
  for (const [teams, price] of [['64', '12,000'], ['128', '25,000'], ['256', '45,000'], ['512', '80,000']]) {
    await rates.getByRole('button', { name: new RegExp(`Up to ${teams} teams`) }).click();
    await expect(page.getByLabel('Your bracket size')).toHaveValue(teams);
    await expect(page.locator('.pricing-plan-pro .pricing-price strong')).toHaveCount(1);
    await expect(page.locator('.pricing-plan-pro .pricing-price strong')).toHaveText(price);
    await expect(rates.getByRole('button', { name: new RegExp(`Up to ${teams} teams`) })).toHaveAttribute('aria-pressed', 'true');
  }
  await page.getByLabel('Your bracket size').selectOption('custom');
  await expect(page.locator('.pricing-plan-pro .pricing-price strong')).toHaveCount(1);
  await expect(page.locator('.pricing-plan-pro .pricing-price strong')).toHaveText('Let’s talk');
  await expect(rates.locator('[aria-pressed=true]')).toHaveCount(0);
  await page.getByLabel('Your bracket size').selectOption('128');
  await expect(rates.getByRole('button', { name: /Up to 128 teams/ })).toHaveAttribute('aria-pressed', 'true');
  for (const teams of ['512', '64', '128', '256']) await rates.getByRole('button', { name: new RegExp(`Up to ${teams} teams`) }).click();
  await expect(page.locator('.pricing-plan-pro .pricing-price strong')).toHaveCount(1);
  await expect(page.locator('.pricing-plan-pro .pricing-price strong')).toHaveText('45,000');
  await page.getByLabel('Your bracket size').focus();
  await page.keyboard.press('Home'); await page.keyboard.press('ArrowDown');
  await expect(page.getByLabel('Your bracket size')).toHaveValue('128');
  await expect(rates.getByRole('button', { name: /Up to 128 teams/ })).toHaveAttribute('aria-pressed', 'true');
  check('All prices, custom quotes, rapid changes, keyboard selection and bidirectional synchronization');

  for (let index = 0; index < 4; index++) {
    await page.getByRole('button', { name: 'What Pro adds', exact: true }).click();
    await expect(page.locator('.pricing-comparison-controls p')).toHaveText('6 differences');
    await expect(page.getByRole('rowheader', { name: 'Team & player registration' })).toHaveCount(0);
    await expect(page.getByRole('rowheader', { name: 'Custom veto sequences' })).toBeVisible();
    await page.getByRole('button', { name: 'All features', exact: true }).click();
    await expect(page.locator('.pricing-comparison-controls p')).toHaveText('18 features');
  }
  check('Rapid filter changes preserve correct rows and counts');

  await page.getByRole('button', { name: 'What Pro adds', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.pricing-comparison-controls p')).toHaveText('6 differences');
  await expect(page.getByRole('button', { name: 'What Pro adds', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'All features', exact: true }).click();
  for (const trigger of await page.locator('.pricing-faq-trigger').all()) {
    await trigger.focus(); await page.keyboard.press('Enter');
    await expect(trigger).toHaveAttribute('aria-expanded','true');
    await expect(trigger.locator('..').locator('..').locator('.pricing-faq-answer')).not.toHaveAttribute('aria-hidden','true');
    await page.keyboard.press('Enter');
    await expect(trigger).toHaveAttribute('aria-expanded','false');
  }
  check('Keyboard filters and six animated Radix FAQs keep focus and use instant feedback');
  const faq = page.locator('.pricing-faq-item').first();
  await faq.getByRole('button').click();
  await expect.poll(()=>faq.locator('.pricing-faq-answer').evaluate(el=>el.clientHeight)).toBeGreaterThan(20);
  await faq.getByRole('button').click();
  await expect.poll(()=>faq.locator('.pricing-faq-answer').evaluate(el=>el.clientHeight)).toBe(0);


  const trigger = page.getByRole('button', { name: 'Inspect veto overlay' });
  for (const method of ['escape', 'button', 'outside', 'escape']) {
    await trigger.click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Close overlay preview' })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Close overlay preview' })).toBeFocused();
    if (method === 'escape') await page.keyboard.press('Escape');
    if (method === 'button') await page.getByRole('button', { name: 'Close overlay preview' }).click();
    if (method === 'outside') await page.mouse.click(5, 5);
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(trigger).toBeFocused();
    expect(await page.locator('body').evaluate(element => getComputedStyle(element).pointerEvents)).not.toBe('none');
  }
  check('Lightbox repeated close, Escape, outside click, focus trap and focus restoration');

  for (const [name, game] of [['Valorant', 'valorant'], ['Tekken 8', 'tekken8'], ['PUBG: Battlegrounds', 'pubg']]) {
    await expect(page.getByRole('link', { name: `Browse ${name} tournaments` })).toHaveAttribute('href', `/tournaments?game=${game}`);
  }
  await page.getByLabel('Your bracket size').selectOption('64');
  for (const width of [320, 390, 768, 1440, 1920]) {
    await page.setViewportSize({ width, height: 1100 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  }
  check('Game link destinations and five responsive widths');
  const story = page.getByRole('group', { name: 'Compare the hosting experience' });
  await story.getByRole('button', { name: 'The usual scramble', exact: true }).click();
  await expect(page.locator('.pricing-hosting-preview')).toHaveAttribute('data-calm', 'false');
  await expect(page.locator('.pricing-coordination-window')).toHaveCount(3);
  await expect(page.getByText('Discord', { exact: true })).toBeVisible();
  await expect(page.getByText('WhatsApp', { exact: true })).toBeVisible();
  await page.locator('#pricing-story').screenshot({ path: 'design/pricing/scramble-v9.png' });
  await page.getByRole('button', { name: 'Give the day a plan', exact: true }).click();
  await expect(story.getByRole('button', { name: 'With Esportra', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.pricing-hosting-preview')).toHaveAttribute('data-calm', 'true');
  await expect(page.locator('.pricing-schedule time')).toHaveText(['18:00', '18:45', '19:30']);
  for (let index = 0; index < 3; index++) {
    await story.getByRole('button', { name: 'The usual scramble', exact: true }).click();
    await story.getByRole('button', { name: 'With Esportra', exact: true }).click();
  }
  await expect(page.locator('.pricing-hosting-preview')).toHaveCount(1);
  await story.getByRole('button', { name: 'The usual scramble', exact: true }).focus(); await page.keyboard.press('Enter');
  await expect(page.locator('.pricing-hosting-preview')).toHaveAttribute('data-calm', 'false');
  await page.getByRole('button', { name: 'Give the day a plan', exact: true }).focus(); await page.keyboard.press('Enter');
  await expect(story.getByRole('button', { name: 'With Esportra', exact: true })).toBeFocused();
  await expect(page.locator('.pricing-hosting-preview')).toHaveAttribute('data-calm', 'true');
  check('Discord/WhatsApp/sheet teaser, scheduling transition, rapid reversal and keyboard focus recovery');
  for(let y=0;y<await page.evaluate(()=>document.body.scrollHeight);y+=650){await page.evaluate(y=>scrollTo(0,y),y);await page.waitForTimeout(80);}
  for (const image of await page.locator('img').all()) await image.scrollIntoViewIfNeeded();
  await page.waitForFunction(() => [...document.images].every(image => image.complete));
  expect(await page.locator('img').evaluateAll(images => images.filter(image => !image.naturalWidth).length)).toBe(0);
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.evaluate(() => { document.activeElement?.blur(); scrollTo(0, 0); });
  await page.screenshot({ path: 'design/pricing/desktop-interactive-v9.png', fullPage: true });
  await page.locator('.pricing-comparison-controls').scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'design/pricing/comparison-interactive-v9.png' });
  await trigger.click();
  await page.getByRole('dialog').evaluate(element => Promise.all(element.getAnimations().map(animation => animation.finished)));
  await page.screenshot({ path: 'design/pricing/overlay-lightbox-v9.png' });
  await page.keyboard.press('Escape');
  await context.close();

  for (const setting of ['system', 'app']) {
    const reduced = await browser.newContext({ viewport: { width: 390, height: 1000 }, reducedMotion: setting === 'system' ? 'reduce' : 'no-preference' });
    if (setting === 'app') await reduced.addInitScript(() => localStorage.setItem('esportra:reduce-motion', 'true'));
    const reducedPage = await open(reduced);
    expect(await reducedPage.locator('.pricing-hero-content').evaluate(element => getComputedStyle(element).animationName)).toBe('none');
    await expect(reducedPage.locator('.pricing-hero-art')).toHaveCSS('transform', 'none');
    await reducedPage.getByRole('button', { name: 'Inspect veto overlay' }).click();
    await expect(reducedPage.getByRole('dialog')).toHaveAttribute('data-motion', 'off');
    await reducedPage.keyboard.press('Escape');
    await expect(reducedPage.getByRole('dialog')).toHaveCount(0);
    await expect(reducedPage.getByRole('button', { name: 'Inspect veto overlay' })).toBeFocused();
    await reduced.close();
  }
  check('OS and Esportra reduced-motion preferences disable movement and close cleanly');

  const touch = await browser.newContext({ viewport: { width: 390, height: 1000 }, hasTouch: true, isMobile: true });
  const mobile = await open(touch);
  const storyControls = mobile.getByRole('group', { name: 'Compare the hosting experience' });
  await storyControls.getByRole('button', { name: 'The usual scramble', exact: true }).tap();
  await expect(mobile.locator('.pricing-hosting-preview')).toHaveAttribute('data-calm', 'false');
  await storyControls.getByRole('button', { name: 'With Esportra', exact: true }).tap();
  await expect(mobile.locator('.pricing-hosting-preview')).toHaveAttribute('data-calm', 'true');
  await mobile.locator('.pricing-compare-details > summary').tap();
  await mobile.getByRole('button', { name: 'What Pro adds', exact: true }).tap();
  await expect(mobile.locator('.pricing-comparison-controls p')).toHaveText('6 differences');
  await mobile.getByRole('button', { name: 'Inspect veto overlay' }).tap();
  await expect(mobile.getByRole('dialog')).toBeVisible();
  await mobile.getByRole('button', { name: 'Close overlay preview' }).tap();
  await expect(mobile.getByRole('dialog')).toHaveCount(0);
  await mobile.getByRole('button', { name: 'All features', exact: true }).tap();
  for(let y=0;y<await mobile.evaluate(()=>document.body.scrollHeight);y+=650){await mobile.evaluate(y=>scrollTo(0,y),y);await mobile.waitForTimeout(80);}
  for (const image of await mobile.locator('img').all()) await image.scrollIntoViewIfNeeded();
  await mobile.evaluate(() => scrollTo(0, 0));
  await mobile.screenshot({ path: 'design/pricing/mobile-interactive-v9.png', fullPage: true });
  await touch.close();
  check('Emulated touch controls and modal recovery');
  expect(errors).toEqual([]);
  await fs.writeFile('design/pricing/interaction-checks-v9.json', JSON.stringify({ status: 'passed', checks, pageErrors: errors }, null, 2));
  console.log(`PASS: ${checks.length} interaction groups, no page errors.`);
} finally {
  await browser.close();
}
