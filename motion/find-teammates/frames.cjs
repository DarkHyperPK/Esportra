// Render specific timestamps to PNG for review: node frames.cjs <fmt> <outdir> t1 t2 ...
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const [fmt, out, ...ts] = process.argv.slice(2);
  const dims = { '9x16': [1080, 1920], '1x1': [1080, 1080], '16x9': [1920, 1080] }[fmt];
  const b = await chromium.launch({ args: ['--allow-file-access-from-files'] });
  const p = await b.newPage({ viewport: { width: dims[0], height: dims[1] }, deviceScaleFactor: 1 });
  p.on('pageerror', e => console.log('PAGEERR', e.message));
  p.on('console', m => { if (m.type() === 'error') console.log('CONSOLE', m.text()); });
  await p.goto(`${process.env.REEL_URL || 'http://127.0.0.1:8765/motion/find-teammates/reel.html'}?fmt=${fmt}`, { waitUntil: 'load' });
  await p.evaluate(() => window.READY);
  for (const t of ts) {
    await p.evaluate(t => window.renderAt(t), Number(t));
    await p.screenshot({ path: `${out}/${fmt}-${String(t).padStart(5, '0')}.png` });
  }
  await b.close();
})();
