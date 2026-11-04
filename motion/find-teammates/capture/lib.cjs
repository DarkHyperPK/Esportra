const { chromium } = require('playwright');
const fx = require('./fixtures.cjs');
const BASE = 'http://127.0.0.1:5173';

function b64url(o) { return Buffer.from(JSON.stringify(o)).toString('base64url'); }
const exp = Math.floor(Date.now() / 1000) + 86400 * 30;
const jwt = `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url({ sub: 'viewer', exp, role: 'authenticated', email: fx.viewer.email })}.sig`;
const user = { id: 'viewer', aud: 'authenticated', role: 'authenticated', email: fx.viewer.email, email_confirmed_at: '2026-01-01T00:00:00Z', confirmed_at: '2026-01-01T00:00:00Z', app_metadata: { provider: 'email' }, user_metadata: { username: 'Zephyr' }, created_at: fx.viewer.created_at };
const session = { access_token: jwt, refresh_token: 'refresh', token_type: 'bearer', expires_in: 86400 * 30, expires_at: exp, user };

async function open({ width = 1440, height = 900, dpr = 2, signedIn = true, mobile = false } = {}) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: dpr, isMobile: mobile, hasTouch: mobile, reducedMotion: 'no-preference' });
  if (signedIn) await ctx.addInitScript(s => { try { localStorage.setItem('sb-sb-auth-token', s); localStorage.setItem('cookie-consent', 'accepted'); localStorage.setItem('esportra_seen_feature_avatars_v1', '1'); localStorage.setItem('beta-notice-permanent-dismiss', 'true'); for (const t of ['lfg','discover','competitive','home','dashboard','player']) localStorage.setItem(`esportra_tour_${t}_seen`, '1'); } catch {} }, JSON.stringify(session));
  await ctx.route('**/*', async route => {
    const req = route.request(); const url = req.url();
    if (url.includes('sb.esportra.test')) {
      if (url.includes('/auth/v1/user')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(user) });
      if (url.includes('/storage/v1/object/public/system.assets.website/eSportra-Logo/')) return route.fulfill({ path: __dirname + '/../../../assets/logo/esportra-lockup-white-full.png', contentType: 'image/png' });
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    }
    if (url.includes('api.esportra.test')) {
      if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } });
      const body = fx.handle(req.method(), url);
      return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(body) });
    }
    if (!url.startsWith(BASE) && /sentry\.io|posthog|google-analytics|googletagmanager/.test(url)) return route.fulfill({ status: 204, body: '' });
    return route.continue();
  });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('PAGEERR', e.message.slice(0, 200)));
  return { browser, ctx, page };
}

async function settle(page, ms = 1200) {
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.evaluate(() => Promise.all([...document.images].filter(i => !i.complete).map(i => new Promise(r => { i.onload = i.onerror = r; setTimeout(r, 6000); }))));
  await page.waitForTimeout(ms);
}

// Save a viewport screenshot plus the rects of named elements, so the video can
// crop real pieces of the real UI.
async function shot(page, name, selectors = {}) {
  const rects = {};
  for (const [key, sel] of Object.entries(selectors)) {
    const loc = page.locator(sel);
    const n = await loc.count();
    rects[key] = [];
    for (let i = 0; i < n; i++) { const b = await loc.nth(i).boundingBox(); if (b) rects[key].push(b); }
  }
  await page.screenshot({ path: `${process.env.OUT}/${name}.png` });
  require('fs').writeFileSync(`${process.env.OUT}/${name}.json`, JSON.stringify({ viewport: page.viewportSize(), rects }, null, 1));
  console.log('shot', name, Object.fromEntries(Object.entries(rects).map(([k, v]) => [k, v.length])));
}

module.exports = { open, settle, shot, BASE };
