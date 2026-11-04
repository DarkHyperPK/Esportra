/**
 * Captures the real scrim UI from the harness: each scene is driven by real
 * clicks and hovers, and every state is saved as a 2x screenshot together with
 * the boxes (CSS px) of the elements the motion piece animates.
 *
 *   node motion/capture/capture.cjs [width ...]
 *
 * Output: assets/screens/<width>/<scene>-<state>.png and assets/screens/manifest.json
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const OUT = path.join(ROOT, 'assets/screens');
const HARNESS = 'http://localhost:5199';
const CLOCK = new Date('2026-11-04T15:47:00Z'); // Wed 20:47 in Pakistan: scrim night.
const DSF = 2;
const HEIGHT = { 540: 2800, 1440: 1400 };

const listingCard = (i) => `ul[aria-label='Scrim listings'] > li >> nth=${i}`;
const req0 = `${listingCard(0)} >> button:has-text('Request')`;
const dialog = "[role='dialog']";
const slot9 = `${dialog} button:has-text('9:00 PM') >> nth=0`;
const msgBox = `${dialog} textarea`;
const room = {
  faceoff: 'header.relative >> nth=0', rail: "nav[aria-label='Scrim progress']", next: "section[aria-label='Next step']",
  schedule: '#room-schedule', checkin: '#room-checkin', veto: '#room-veto', result: '#room-result', lobby: "[aria-label='Lobby']",
  chatBtn: "button[aria-label^='Open chat']",
};
const W540 = (w) => w === 540;

/** Each scene: steps run in order. ['shot', name, boxes] saves a state. Width-specific steps use a function. */
const SCENES = {
  discovery: (w) => [
    ['shot', 'base', { title: 'h1', upNext: "section[aria-label='Up next']", filters: "button:has-text('Filters')", aside: 'aside', card0: listingCard(0), card1: listingCard(1), card2: listingCard(2), card3: listingCard(3), card4: listingCard(4), card5: listingCard(5), request: req0, region: "aside button[aria-label='Region']", myScrims: "a:has-text('My scrims')", count: "p[aria-live='polite']" }],
    ...(W540(w)
      ? [['vp', 540, 1170], ['click', "button:has-text('Filters')"], ['wait', 600],
        ['shot', 'sheet', { sheet: dialog, region: `${dialog} button[aria-label='Region']` }],
        ['click', `${dialog} button[aria-label='Region']`], ['wait', 400]]
      : [['click', "aside button[aria-label='Region']"], ['wait', 400]]),
    ['shot', 'region-open', { list: "[role='listbox']", ap: "[role='option']:has-text('Asia Pacific')" }],
    ['hover', "[role='option']:has-text('Asia Pacific')"], ['shot', 'region-hover', {}],
    ['click', "[role='option']:has-text('Asia Pacific')"], ['wait', 600],
    ...(W540(w) ? [['shot', 'region-picked', { sheet: dialog }], ['press', 'Escape'], ['wait', 500], ['vp', 540, 2800], ['wait', 600]] : []),
    ['shot', 'filtered', { count: "p[aria-live='polite']", card0: listingCard(0), card1: listingCard(1), request: req0, upNext: "section[aria-label='Up next']" }],
    ['hover', req0], ['shot', 'hover', {}],
    ['click', req0], ['wait', 900],
    ['shot', 'modal', { dialog, slot: slot9, pick: `${dialog} :text('Pick a time')`, recent: `${dialog} :text('Recent results')` }],
    ['hover', slot9], ['shot', 'slot-hover', {}],
    ['click', slot9], ['wait', 400],
    ['shot', 'slot', { dialog, requestScrim: `${dialog} button:has-text('Request scrim')` }],
    ['hover', `${dialog} button:has-text('Request scrim')`], ['shot', 'request-hover', {}],
    ['click', `${dialog} button:has-text('Request scrim')`], ['wait', 700],
    ['shot', 'offer', { dialog, msg: msgBox, send: `${dialog} button:has-text('Send offer')` }],
    ['click', msgBox], ['keys', 'GG last week.'], ['shot', 'type1', {}],
    ['keys', ' Run it back?'], ['shot', 'type2', {}],
    ['hover', `${dialog} button:has-text('Send offer')`], ['shot', 'send-hover', {}],
    ['click', `${dialog} button:has-text('Send offer')`], ['wait', 900],
    ['shot', 'sent', { dialog }],
  ],
  workspace: () => [
    ['shot', 'base', { header: 'header >> nth=0', needs: '#needs-you', offer: "article:has-text('wants a scrim')", accept: "button:has-text('Accept')", roster: "article:has-text('wants a scrim') :text('Roster')" }],
    ['hover', "button:has-text('Accept')"], ['shot', 'hover', {}],
    ['click', "button:has-text('Accept')"], ['wait', 400],
    ['shot', 'accepting', {}],
  ],
  room: (w) => [
    ...(W540(w) ? [['vp', 540, 1170], ['wait', 500]] : []),
    ['shot', 'base', { ...room }],
    ['hover', room.chatBtn], ['click', room.chatBtn], ['wait', 600],
    ['shot', 'chat', { chat: "[aria-label^='Chat with']", input: "textarea[aria-label='Message']", send: "button[aria-label='Send message']" }],
    ['click', "textarea[aria-label='Message']"], ['keys', 'gl hf.'], ['shot', 'chat-type1', {}],
    ['keys', ' Party code in 2'], ['shot', 'chat-type2', {}],
    ['hover', "button[aria-label='Send message']"], ['click', "button[aria-label='Send message']"], ['wait', 800],
    ['shot', 'chat-sent', { chat: "[aria-label^='Chat with']", close: "button[aria-label='Close chat']" }],
    ['click', "button[aria-label='Close chat']"], ['wait', 400],
    ...(W540(w) ? [['vp', 540, 2800], ['wait', 600]] : []),
    ['shot', 'lobby', { ...room, lobbyInput: "input[placeholder*='party code']", save: "button:has-text('Save lobby info')", checkinBtn: "button:has-text('Check in your team')" }],
    ['click', "input[placeholder*='party code']"], ['keys', 'NO-C5-'], ['shot', 'lobby-type1', {}],
    ['keys', '7Q4K'], ['shot', 'lobby-type2', { save: "button:has-text('Save lobby info')", lobby: room.lobby }],
    ['hover', "button:has-text('Save lobby info')"], ['click', "button:has-text('Save lobby info')"], ['wait', 700],
    ['shot', 'lobby-saved', { ...room, checkinBtn: "button:has-text('Check in your team')" }],
    ['hover', "button:has-text('Check in your team')"], ['shot', 'checkin-hover', {}],
    ['click', "button:has-text('Check in your team')"], ['wait', 900],
    ['shot', 'waiting', { ...room }],
    ['ctl', 'oppCheckIn'], ['wait', 1200],
    ['shot', 'live', { ...room, openVeto: "button:has-text('Open map veto')" }],
    ['hover', "button:has-text('Open map veto')"], ['click', "button:has-text('Open map veto')"], ['wait', 2600],
    ['shot', 'veto', { dialog, haven: `${dialog} :text-is('Haven')`, title: `${dialog} h2, ${dialog} :text('Your turn')` }],
    ['hover', `${dialog} :text-is('Haven')`], ['shot', 'veto-hover', {}],
    ['click', `${dialog} :text-is('Haven')`], ['wait', 1500],
    ['shot', 'veto-banned', { dialog }],
    ['ctl', 'oppBan'], ['wait', 1600],
    ['shot', 'veto-oppban', { dialog, sunset: `${dialog} :text-is('Sunset') >> nth=-1` }],
    ['hover', `${dialog} :text-is('Sunset') >> nth=-1`], ['shot', 'veto-pick-hover', {}],
    ['click', `${dialog} :text-is('Sunset') >> nth=-1`], ['wait', 1600],
    ['shot', 'veto-done', { dialog, series: `${dialog} :text('The series')` }],
    ['press', 'Escape'], ['wait', 700],
    ['shot', 'report', { ...room, manualTab: "[role='tab']:has-text('Enter manually')" }],
    ['hover', "[role='tab']:has-text('Enter manually')"], ['click', "[role='tab']:has-text('Enter manually')"], ['wait', 400],
    ['shot', 'manual', { ...room, m1: "input[id^='m1-']", m2: "input[id^='m2-']", mm: "input[id^='mm-']", reportBtn: "button:has-text('Report game 1')" }],
    ['click', "input[id^='m1-']"], ['keys', '13'], ['shot', 'manual-1', {}],
    ['click', "input[id^='m2-']"], ['keys', '9'], ['shot', 'manual-2', {}],
    ['click', "input[id^='mm-']"], ['keys', 'Ascent'], ['shot', 'manual-3', {}],
    ['hover', "button:has-text('Report game 1')"], ['click', "button:has-text('Report game 1')"], ['wait', 1200],
    ['shot', 'reported', { ...room }],
    ['ctl', 'oppConfirm'], ['wait', 1400],
    ['shot', 'confirmed', { ...room, tabs: "#room-result [role='tablist']" }],
  ],
  insights: () => [
    ['shot', 'base', {
      title: 'h1', hero: "section[aria-label='Team overview']", tabs: "[role='tablist'] >> nth=0", teamTab: "[role='tab']:has-text('Team')",
      roster0: "section[aria-label='Roster'] a >> nth=0", rosterRow: "section[aria-label='Roster']",
      mapBars: "section[aria-label='Map by map']", rating: ":text('Esportra rating') >> xpath=..",
    }],
    ['hover', "section[aria-label='Roster'] a >> nth=0"], ['shot', 'hover', {}],
    ['hover', "[role='tab']:has-text('Team')"], ['click', "[role='tab']:has-text('Team')"], ['wait', 1600],
    ['shot', 'team', { tabs: "[role='tablist'] >> nth=0", sub: "[role='tablist'] >> nth=1", mapsTab: "[role='tab']:has-text('Maps')", body: "[role='tabpanel'] >> nth=0" }],
    ['hover', "[role='tab']:has-text('Maps')"], ['click', "[role='tab']:has-text('Maps')"], ['wait', 1600],
    ['shot', 'maps', { body: "[role='tabpanel'] >> nth=0", tabs: "[role='tablist'] >> nth=0" }],
  ],
};

async function boxesOf(page, spec) {
  const out = {};
  for (const [name, sel] of Object.entries(spec)) {
    try {
      const loc = page.locator(sel).first();
      if (await loc.count() === 0) continue;
      const b = await loc.boundingBox();
      if (b) out[name] = { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) };
    } catch { /* optional element */ }
  }
  return out;
}

async function run(width) {
  const browser = await chromium.launch();
  const manifest = {};
  fs.mkdirSync(path.join(OUT, String(width)), { recursive: true });
  for (const scene of Object.keys(SCENES).filter((k) => !process.env.ONLY || process.env.ONLY.split(',').includes(k))) {
    const page = await browser.newPage({ viewport: { width, height: HEIGHT[width] }, deviceScaleFactor: DSF, timezoneId: 'Asia/Karachi', locale: 'en-US', reducedMotion: 'reduce' });
    await page.clock.setFixedTime(CLOCK);
    await page.goto(`${HARNESS}/?scene=${scene}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2500);
    // The floating chat launcher and toasts are not part of these shots.
    await page.addStyleTag({ content: '[data-sonner-toaster]{display:none!important}' });
    for (const [kind, a, b] of SCENES[scene](width)) {
      if (kind === 'wait') await page.waitForTimeout(a);
      if (kind === 'vp') { await page.setViewportSize({ width: a, height: b }); }
      if (kind === 'hover') { await page.locator(a).first().hover(); await page.waitForTimeout(350); }
      if (kind === 'click') { await page.locator(a).first().click(); await page.waitForTimeout(120); }
      if (kind === 'keys') { await page.keyboard.type(a, { delay: 15 }); await page.waitForTimeout(150); }
      if (kind === 'press') { await page.keyboard.press(a); }
      if (kind === 'ctl') { await page.evaluate((n) => { window.__ctl[n](); return window.__qc.invalidateQueries(); }, a); }
      if (kind === 'shot') {
        const file = `${scene}-${a}.png`;
        const boxes = await boxesOf(page, b);
        const vp = page.viewportSize();
        await page.screenshot({ path: path.join(OUT, String(width), file) });
        manifest[`${scene}-${a}`] = { file: `${width}/${file}`, width: vp.width, height: vp.height, dsf: DSF, boxes };
        process.stdout.write(`  ${width} ${scene}-${a} ${Object.keys(boxes).join(',')}\n`);
      }
    }
    const unmocked = await page.evaluate(() => window.__unmocked || []);
    if (unmocked.length) process.stdout.write(`  ! ${scene} unmocked: ${unmocked.join(' | ')}\n`);
    await page.close();
  }
  await browser.close();
  return manifest;
}

(async () => {
  const widths = process.argv.slice(2).map(Number).filter(Boolean);
  const list = widths.length ? widths : [540, 1440];
  const file = path.join(OUT, 'manifest.json');
  const all = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
  for (const w of list) all[w] = { ...(all[w] || {}), ...(await run(w)) };
  fs.writeFileSync(file, JSON.stringify(all, null, 1));
})();
