// Dump the timeline's SFX cue list (clicks, keys, hits...) to sfx.json for the synth.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  await p.goto('http://127.0.0.1:8765/motion/find-teammates/reel.html?fmt=9x16', { waitUntil: 'load' });
  await p.evaluate(() => window.READY);
  const sfx = await p.evaluate(() => window.SFX);
  require('fs').writeFileSync(__dirname + '/sfx.json', JSON.stringify(sfx, null, 1));
  console.log(sfx.length, 'cues;', [...new Set(sfx.map(s => s.type))].join(','));
  await b.close();
})();
