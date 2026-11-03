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
const crimsonRequest = `${listingCard(0)} >> button:has-text('Request')`;

const discoveryBoxes = {
  title: 'h1', myScrims: "a:has-text('My scrims')", aside: 'aside', upNext: "section[aria-label='Up next']", count: "p[aria-live='polite']",
  card0: listingCard(0), card1: listingCard(1), card2: listingCard(2), card3: listingCard(3), card4: listingCard(4), card5: listingCard(5),
  request: crimsonRequest, filters: "button:has-text('Filters')",
};
const dialog = "[role='dialog']";
const roomBoxes = {
  back: "a:has-text('Your Scrims')", faceoff: 'header.relative >> nth=0', rail: "nav[aria-label='Scrim progress']", next: "nav[aria-label='Scrim progress'] + section", schedule: '#room-schedule', checkin: '#room-checkin', veto: '#room-veto',
  result: '#room-result', lobby: "[aria-label='Lobby']", chat: "button:has-text('Chat')",
};

const SCENES = {
  discovery: [
    ['shot', 'base', discoveryBoxes],
    ['hover', crimsonRequest], ['shot', 'hover', { request: crimsonRequest, card0: listingCard(0) }],
    ['click', crimsonRequest], ['wait', 900],
    ['shot', 'modal', { dialog, slot: `${dialog} button:has-text('8:00 PM') >> nth=0`, requestScrim: `${dialog} button:has-text('Request scrim')`, pick: `${dialog} :text('Pick a time')` }],
    ['hover', `${dialog} button:has-text('8:00 PM') >> nth=0`], ['shot', 'slot-hover', { dialog }],
    ['click', `${dialog} button:has-text('8:00 PM') >> nth=0`], ['wait', 400],
    ['shot', 'slot', { dialog, slot: `${dialog} button:has-text('8:00 PM') >> nth=0`, requestScrim: `${dialog} button:has-text('Request scrim')` }],
    ['hover', `${dialog} button:has-text('Request scrim')`], ['shot', 'request-hover', { dialog }],
    ['click', `${dialog} button:has-text('Request scrim')`], ['wait', 700],
    ['shot', 'offer', { dialog, send: `${dialog} button:has-text('Send offer')` }],
    ['hover', `${dialog} button:has-text('Send offer')`], ['shot', 'send-hover', { dialog }],
    ['click', `${dialog} button:has-text('Send offer')`], ['wait', 900],
    ['shot', 'sent', { dialog }],
  ],
  'room-time': [
    ['shot', 'base', { ...roomBoxes, accept: "button:has-text('Accept this time')" }],
    ['hover', "button:has-text('Accept this time')"], ['shot', 'hover', roomBoxes],
    ['click', "button:has-text('Accept this time')"], ['wait', 1200],
    ['shot', 'accepted', roomBoxes],
  ],
  'room-checkin': [
    ['shot', 'base', { ...roomBoxes, checkinBtn: "button:has-text('Check in your team')" }],
    ['hover', "button:has-text('Check in your team')"], ['shot', 'hover', roomBoxes],
    ['click', "button:has-text('Check in your team')"], ['wait', 1400],
    ['shot', 'checked', roomBoxes],
  ],
  'room-veto': [
    ['shot', 'base', { ...roomBoxes, openVeto: "button:has-text('Open map veto')" }],
    ['click', "button:has-text('Open map veto')"], ['wait', 2600],
    ['shot', 'dialog', { dialog, haven: `${dialog} :text-is('Haven')`, pool: `${dialog} :text('Map pool')` }],
    ['hover', `${dialog} :text-is('Haven')`], ['shot', 'hover', { dialog }],
    ['click', `${dialog} :text-is('Haven')`], ['wait', 1600],
    ['shot', 'banned', { dialog }],
  ],
  'room-report': [
    ['shot', 'base', { ...roomBoxes, fetch: "button:has-text('Auto-fetch game 1')" }],
    ['hover', "button:has-text('Auto-fetch game 1')"], ['shot', 'hover', roomBoxes],
    ['click', "button:has-text('Auto-fetch game 1')"], ['wait', 1500],
    ['shot', 'fetched', { ...roomBoxes, candidate: '#room-result div.group >> nth=0' }],
    ['hover', '#room-result div.group >> nth=0'], ['shot', 'candidate-hover', roomBoxes],
    ['click', '#room-result div.group >> nth=0'], ['wait', 1600],
    ['shot', 'reported', roomBoxes],
  ],
  insights: [
    ['shot', 'base', {
      title: 'h1', hero: "section[aria-label='Team overview']", tabs: "[role='tablist'] >> nth=0",
      roster0: "section[aria-label='Roster'] a >> nth=0", roster1: "section[aria-label='Roster'] a >> nth=1", rosterRow: "section[aria-label='Roster']",
      mapBars: ":text('Map by map') >> xpath=ancestor::section[1]", rating: ":text('Esportra rating') >> xpath=..",
    }],
    ['hover', "section[aria-label='Roster'] a >> nth=0"], ['shot', 'hover', { rosterRow: "section[aria-label='Roster']", roster0: "section[aria-label='Roster'] a >> nth=0" }],
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
  for (const [scene, steps] of Object.entries(SCENES)) {
    const page = await browser.newPage({ viewport: { width, height: HEIGHT[width] }, deviceScaleFactor: DSF, timezoneId: 'Asia/Karachi', locale: 'en-US', reducedMotion: 'reduce' });
    await page.clock.setFixedTime(CLOCK);
    await page.goto(`${HARNESS}/?scene=${scene}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2500);
    // The floating chat launcher and toasts are not part of these shots.
    await page.addStyleTag({ content: '[data-sonner-toaster]{display:none!important}' });
    for (const [kind, a, b] of steps) {
      if (kind === 'wait') await page.waitForTimeout(a);
      if (kind === 'hover') { await page.locator(a).first().hover(); await page.waitForTimeout(350); }
      if (kind === 'click') { await page.locator(a).first().click(); }
      if (kind === 'shot') {
        await page.mouse.move(-10, -10).catch(() => {});
        if (!/hover/.test(a)) await page.mouse.move(1, 1);
        const file = `${scene}-${a}.png`;
        const boxes = await boxesOf(page, b);
        await page.screenshot({ path: path.join(OUT, String(width), file) });
        manifest[`${scene}-${a}`] = { file: `${width}/${file}`, width, height: HEIGHT[width], dsf: DSF, boxes };
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
  for (const w of list) all[w] = await run(w);
  fs.writeFileSync(file, JSON.stringify(all, null, 1));
})();
