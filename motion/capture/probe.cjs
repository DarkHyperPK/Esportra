// Probe a harness scene: screenshot + unmocked requests + console errors.
// node probe.js <scene> [width] [out.png] [fullPage]
const { chromium } = require('playwright');
(async () => {
  const [scene = 'discovery', width = '1440', out = 'probe.png', full = '1', ...actions] = process.argv.slice(2);
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: +width, height: 1000 }, deviceScaleFactor: 1, timezoneId: 'Asia/Karachi', locale: 'en-US', reducedMotion: 'reduce' });
  await p.clock.setFixedTime(new Date('2026-11-04T15:47:00Z'));
  const errs = [];
  p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push(`${m.type()}: ${m.text().slice(0, 300)}`); });
  p.on('pageerror', (e) => errs.push(`pageerror: ${e.message.slice(0, 400)}`));
  
  await p.goto(`http://localhost:5199/?scene=${scene}`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(1500);
  for (const a of actions) {
    const [kind, ...rest] = a.split(':');
    const arg = rest.join(':');
    if (kind === 'click') await p.locator(arg).first().click();
    if (kind === 'hover') await p.locator(arg).first().hover();
    if (kind === 'type') { const [sel, txt] = arg.split('|'); await p.locator(sel).first().click(); await p.keyboard.type(txt, { delay: 20 }); }
    if (kind === 'press') await p.keyboard.press(arg);
    if (kind === 'ctl') await p.evaluate((n) => { window.__ctl[n](); return window.__qc.invalidateQueries(); }, arg);
    if (kind === 'vp') { const [w, h] = arg.split('x').map(Number); await p.setViewportSize({ width: w, height: h }); }
    if (kind === 'shot') await p.screenshot({ path: out.replace('.png', `-${arg}.png`) });
    if (kind === 'wait') await p.waitForTimeout(+arg);
    await p.waitForTimeout(600);
  }
  const unmocked = await p.evaluate(() => window.__unmocked || []);
  const reqs = await p.evaluate(() => window.__requests || []);
  await p.screenshot({ path: out, fullPage: full === '1' });
  console.log('REQUESTS', JSON.stringify(reqs, null, 0));
  console.log('UNMOCKED', JSON.stringify(unmocked, null, 0));
  console.log(errs.slice(0, 25).join('\n'));
  await b.close();
})();
