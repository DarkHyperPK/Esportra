// Drives the REAL Esportra app (local Vite dev server) through the Find Teammates
// flows and saves screenshots + element rects for cropping in the video.
const { open, settle, shot, BASE } = require('./lib.cjs');
const MODE = process.argv[2] || 'desktop';
const M = MODE === 'mobile';
const P = M ? 'm-' : 'd-';
const common = { card: '.lfg-card', save: '.lfg-compact-save', more: '.lfg-compact-expand', nav: '.lfg-nav', heading: '.lfg-heading',
  filters: '.lfg-filters', tools: '.lfg-tools', seg: '.lfg-segmented', search: '.lfg-search', chips: '.lfg-filter-chip', grid: '.lfg-grid',
  sidebar: 'aside:not(.lfg-filters)', create: '.lfg-create', h1: '.lfg-heading h1', eyebrow: '.lfg-eyebrow', agents: '.lfg-compact-agents',
  metrics: '.lfg-metrics', rank: '.lfg-compact-rank-inline', roles: '.lfg-card-roles', hero: '.lfg-compact-hero', mobileFilter: '.lfg-mobile-filter', roleSelect: '.lfg-filters select', teamTab: '.lfg-segmented button:has-text("Find a team")', playersTab: '.lfg-segmented button:has-text("Find players")', applied: '.lfg-applied-filters', rankTrigger: '.lfg-rank-trigger', bottomNav: 'nav.fixed, [class*=bottom-nav]' };

(async () => {
  const opts = M ? { width: 430, height: 932, dpr: 3, mobile: true } : { width: 1440, height: 900, dpr: 3 };
  const { browser, page } = await open(opts);
  const go = async (path, sel = '.lfg-card') => { await page.goto(BASE + path, { waitUntil: 'domcontentloaded' }); await page.waitForSelector(sel, { timeout: 60000 }); await settle(page, 1500); };

  // 1. Discover — players
  await go('/competitive/lfg?game=valorant');
  await shot(page, P + '01-discover', common);
  if (!M) await page.screenshot({ path: `${process.env.OUT}/${P}01-discover-full.png`, fullPage: true });

  // 2. Search typed
  await page.locator('.lfg-search').click();
  await page.locator('.lfg-search').pressSequentially('duelist', { delay: 40 });
  await settle(page, 900);
  await shot(page, P + '02-search', common);
  await page.locator('.lfg-search').fill('');
  await settle(page, 700);

  // 3. Filters: role + min rank (desktop rail; mobile opens the filter sheet)
  if (M) { await page.locator('.lfg-mobile-filter').click(); await settle(page, 500); await shot(page, P + '03a-filters-open', common); }
  await page.locator('.lfg-filters select').first().selectOption('duelist');
  await settle(page, 700);
  await shot(page, P + '03b-role', { ...common, trigger: '.lfg-rank-trigger' });
  await page.locator('.lfg-rank-trigger').first().click();
  await settle(page, 900);
  await shot(page, P + '03c-rank-open', { ...common, trigger: '.lfg-rank-trigger', items: '.lfg-rank-item', list: '.lfg-rank-list' });
  const diamond = page.locator('.lfg-rank-item', { hasText: 'Diamond 1' });
  await diamond.scrollIntoViewIfNeeded();
  await settle(page, 300);
  await shot(page, P + '03d-rank-scrolled', { ...common, trigger: '.lfg-rank-trigger', items: '.lfg-rank-item', list: '.lfg-rank-list', target: '.lfg-rank-item:has-text("Diamond 1")' });
  await diamond.click();
  await settle(page, 1000);
  if (M) { await page.locator('.lfg-mobile-filter').click(); await settle(page, 600); await page.evaluate(() => window.scrollTo(0, 0)); await settle(page, 500); }
  await shot(page, P + '03e-filtered', common);
  await page.locator('.lfg-filters button', { hasText: 'Reset filters' }).click({ force: true }).catch(() => {});
  await go('/competitive/lfg?game=valorant');

  // 4. Save a listing
  await shot(page, P + '04a-save-before', common);
  await page.locator('.lfg-compact-save').first().click();
  await settle(page, 900);
  await shot(page, P + '04b-save-after', common);

  // 5. Teams tab
  await page.locator('.lfg-segmented button', { hasText: 'Find a team' }).click();
  await page.waitForSelector('.lfg-team-card'); await page.waitForSelector('.lfg-roster-preview').catch(() => {});
  await settle(page, 1500);
  await shot(page, P + '05-teams', { ...common, roster: '.lfg-roster-preview', range: '.lfg-rank-range' });
  if (!M) await page.screenshot({ path: `${process.env.OUT}/${P}05-teams-full.png`, fullPage: true });

  // 6. Detail drawer + introduction + send
  await go('/competitive/lfg?game=valorant&kind=teams');
  await page.waitForSelector('.lfg-roster-preview').catch(() => {});
  await page.locator('.lfg-compact-expand').first().click();
  await page.waitForSelector('.lfg-detail-drawer textarea', { timeout: 30000 });
  await settle(page, 1500);
  const dsel = { ...common, drawer: '.lfg-detail-drawer', textarea: '.lfg-detail-drawer textarea', send: '.lfg-detail-drawer .lfg-button-primary', roster: '.lfg-detail-drawer .lfg-roster-list', stats: '.lfg-detail-drawer .lfg-stats', dhero: '.lfg-drawer-hero' };
  await shot(page, P + '06a-detail', dsel);
  await page.locator('.lfg-detail-drawer textarea').click();
  await page.locator('.lfg-detail-drawer textarea').pressSequentially('Entry duelist, Ascendant 2. Free Mon–Thu evenings — happy to trial!', { delay: 15 });
  await page.locator('.lfg-detail-drawer textarea').evaluate(el => el.scrollIntoView({ block: 'center' }));
  await settle(page, 500);
  await shot(page, P + '06b-intro', dsel);
  await page.locator('.lfg-detail-drawer .lfg-button-primary').click();
  await settle(page, 1500);
  await shot(page, P + '06c-sent', { ...dsel, status: '.lfg-detail-drawer .lfg-status' });

  // 7. Requests
  await go('/competitive/lfg/requests', '.lfg-row');
  const rsel = { ...common, row: '.lfg-row', accept: '.lfg-row .lfg-button-primary', panel: '.lfg-page .lfg-panel', rowActions: '.lfg-row .lfg-row-actions' };
  await shot(page, P + '07-requests', rsel);
  await page.locator('.lfg-row .lfg-button-primary', { hasText: 'Accept' }).first().click();
  await page.waitForSelector('.lfg-row .lfg-button-primary:has-text("Open conversation")', { timeout: 15000 }).catch(() => console.log('no accept state'));
  await settle(page, 900);
  await shot(page, P + '07b-accepted', rsel);

  // 8. Create wizard
  await go('/competitive/lfg/create', '.lfg-wizard-form');
  await shot(page, P + '08a-create', { ...common, form: '.lfg-wizard-form', preview: '.lfg-wizard-preview', primary: '.lfg-wizard-form .lfg-button-primary' });
  await page.locator('.lfg-wizard-form .lfg-button-primary', { hasText: 'Continue' }).click();
  await settle(page, 1200);
  const csel = { ...common, form: '.lfg-wizard-form', preview: '.lfg-wizard-preview', roleOpt: '.lfg-role-option', agentOpt: '.lfg-agent-option', primary: '.lfg-wizard-form .lfg-button-primary',
    jett: '.lfg-agent-option:has-text("Jett")', raze: '.lfg-agent-option:has-text("Raze")', neon: '.lfg-agent-option:has-text("Neon")', previewCard: '.lfg-wizard-preview .lfg-card' };
  const freeze = async () => { await page.evaluate(y => window.scrollTo(0, y), M ? 300 : 0); await settle(page, 700); };
  await freeze(); await shot(page, P + '08b0-step2', csel);
  await page.locator('.lfg-role-option').first().click(); await freeze(); await shot(page, P + '08b1-role', csel);
  let k = 2;
  for (const name of ['Jett', 'Raze', 'Neon']) { await page.locator('.lfg-agent-option', { hasText: name }).first().click(); await freeze(); await shot(page, P + `08b${k++}-${name.toLowerCase()}`, csel); }
  await settle(page, 400);
  await shot(page, P + '08b-create-details', { ...common, form: '.lfg-wizard-form', preview: '.lfg-wizard-preview', roleOpt: '.lfg-role-option', agentOpt: '.lfg-agent-option', primary: '.lfg-wizard-form .lfg-button-primary' });
  if (!M) await page.screenshot({ path: `${process.env.OUT}/${P}08b-create-details-full.png`, fullPage: true });

  await browser.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
