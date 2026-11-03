// Render stills of the composition: node still.cjs <fmt> <out-dir> t1 t2 ...
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
(async () => {
  const [fmt, outDir, ...ts] = process.argv.slice(2);
  const SIZES = { '9x16': [1080, 1920], '1x1': [1080, 1080], '16x9': [1920, 1080] };
  const [w, h] = SIZES[fmt];
  fs.mkdirSync(outDir, { recursive: true });
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(`http://localhost:5300/motion/comp/index.html?fmt=${fmt}`);
  await p.waitForFunction(() => window.__ready || window.__error, null, { timeout: 120000 });
  const err = await p.evaluate(() => window.__error);
  if (err) { console.log('ERROR', err); }
  for (const t of ts) {
    await p.evaluate((tt) => window.renderFrame(tt), Number(t));
    await p.screenshot({ path: path.join(outDir, `${fmt}_${String(t).padStart(5, '0')}.png`) });
  }
  if (errs.length) console.log(errs.slice(0, 10).join('\n'));
  await b.close();
})();
