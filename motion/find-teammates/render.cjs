// Full render: node render.cjs <fmt> [fps]  (playback length = 30 s timeline / speed 0.9 ≈ 33.3 s) → build/find-teammates-<fmt>.mp4 (H.264 + AAC soundtrack)
// Frames are rendered deterministically via window.renderAt(t) and piped straight into ffmpeg.
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');

(async () => {
  const fmt = process.argv[2] || '9x16';
  const fps = Number(process.argv[3] || 30);
  const [W, H] = { '9x16': [1080, 1920], '1x1': [1080, 1080], '16x9': [1920, 1080] }[fmt];
  const out = path.join(__dirname, 'build', `find-teammates-${fmt}.mp4`);
  const audio = path.join(__dirname, 'build', 'soundtrack.wav');
  const total = Math.round((30 / 0.9) * fps);

  const ff = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y',
    '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'png', '-i', '-',
    '-i', audio,
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-movflags', '+faststart',
    '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-shortest', out], { stdio: ['pipe', 'inherit', 'inherit'] });

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  page.on('pageerror', e => console.log('PAGEERR', e.message));
  await page.goto(`http://127.0.0.1:8765/motion/find-teammates/reel.html?fmt=${fmt}&fps=${fps}`, { waitUntil: 'load' });
  await page.evaluate(() => window.READY);
  const t0 = Date.now();
  for (let i = 0; i < total; i++) {
    await page.evaluate(t => window.renderAt(t), i / fps);
    const buf = await page.screenshot({ type: 'png' });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % (fps * 5) === 0) console.log(`${fmt} frame ${i}/${total} · ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  await browser.close();
  console.log('wrote', out, `in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
})();
