// Build a contact sheet (one frame per beat) for a format: node contact.cjs <fmt> <frames-dir> <out.png>
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
(async () => {
  const [fmt, dir, out] = process.argv.slice(2);
  const tl = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../comp/timeline.json'), 'utf8'));
  const times = [1.8, 3.6, 4.95, 6.52, 8.95, 10.95, 13.15, 14.9, 16.85, 19.2];
  const actions = ['5 words, one per beat', 'Logo slam, page builds itself', 'Cursor clicks Request', 'Click 8:00 PM, send offer', 'Click Accept this time',
    'Click Check in your team', 'Click Haven to ban it', 'Auto-fetch, pick the Riot map', 'Rating counts up, hover Raze', 'Scrims, sorted.'];
  const cols = fmt === '16x9' ? 4 : 5;
  const tw = fmt === '9x16' ? 300 : fmt === '1x1' ? 330 : 440;
  const th = fmt === '9x16' ? 533 : fmt === '1x1' ? 330 : 248;
  const cells = tl.beats.map((b, i) => {
    const t = times[i];
    const file = path.resolve(dir, `${fmt}_${String(t).padStart(5, '0')}.png`);
    const src = `data:image/png;base64,${fs.readFileSync(file).toString('base64')}`;
    return `<figure><img src="${src}" style="width:${tw}px;height:${th}px"/><figcaption><b>${String(i + 1).padStart(2, '0')} ${b.label}</b><span>${b.start.toFixed(1)}–${b.end.toFixed(1)}s · frame @ ${t.toFixed(2)}s</span><em>${actions[i]}</em></figcaption></figure>`;
  }).join('');
  const html = `<!doctype html><html><head><link rel="stylesheet" href="/assets/fonts/fonts.css"><style>
    body{margin:0;background:#09090B;color:#FAFAFA;font-family:Inter,sans-serif;padding:40px 44px 36px}
    h1{font:900 34px Poppins;letter-spacing:-0.02em;margin:0 0 4px;text-transform:uppercase}
    p.sub{margin:0 0 28px;color:#A1A1AA;font-size:15px} p.sub span{color:#F43F5E}
    .grid{display:grid;grid-template-columns:repeat(${cols},${tw}px);gap:26px 22px}
    figure{margin:0} img{display:block;box-shadow:0 0 0 1px rgba(255,255,255,.1)}
    figcaption{margin-top:10px;display:flex;flex-direction:column;gap:3px}
    figcaption b{font:700 15px Poppins;text-transform:uppercase;letter-spacing:.02em}
    figcaption span{font:600 11px 'JetBrains Mono';letter-spacing:.14em;text-transform:uppercase;color:#71717A}
    figcaption em{font-style:normal;font-size:13px;color:#A1A1AA}
  </style></head><body><h1>Esportra Scrims · ${fmt.replace('x', ':')} contact sheet</h1>
  <p class="sub">One frame per beat · 20 s · 120 BPM · <span>real product UI</span>, captured from the scrim pages in this repo</p><div class="grid">${cells}</div></body></html>`;
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: cols * tw + (cols - 1) * 22 + 88, height: 400 }, deviceScaleFactor: 2 });
  await p.goto('http://localhost:5300/motion/comp/timeline.json');
  await p.setContent(html, { waitUntil: 'networkidle' });
  await p.evaluate(() => Promise.all(['900 34px Poppins', '700 15px Poppins', '600 11px "JetBrains Mono"', '400 13px Inter'].map((f) => document.fonts.load(f))));
  await p.evaluate(() => document.fonts.ready);
  await p.screenshot({ path: out, fullPage: true });
  await b.close();
})();
