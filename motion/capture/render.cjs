// Full render: node render.cjs <fmt> <out.mp4> [fps]
// Steps the timeline frame by frame (deterministic), pipes PNGs to ffmpeg, muxes the score.
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');
(async () => {
  const [fmt, out, fpsArg] = process.argv.slice(2);
  const fps = Number(fpsArg || 60);
  const SIZES = { '9x16': [1080, 1920], '1x1': [1080, 1080], '16x9': [1920, 1080] };
  const [w, h] = SIZES[fmt];
  const ROOT = path.resolve(__dirname, '../..');
  const DUR = JSON.parse(require('fs').readFileSync(path.join(ROOT, 'motion/comp/timeline.json'), 'utf8')).duration;
  // 16:9 plays the desktop interaction script, so it gets that click track.
  const wav = path.join(ROOT, `motion/out/score-${fmt === '16x9' ? 1440 : 540}.wav`);
  const ff = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y',
    '-f', 'image2pipe', '-framerate', String(fps), '-i', '-',
    '-i', wav,
    '-filter_complex', `[1:a]loudnorm=I=-12:TP=-1.0:LRA=7,atrim=0:${DUR},afade=t=out:st=${DUR - 0.5}:d=0.5[a]`,
    '-map', '0:v', '-map', '[a]', '-c:v', 'libx264', '-preset', 'slow', '-crf', '15', '-pix_fmt', 'yuv420p',
    '-profile:v', 'high', '-movflags', '+faststart', '-c:a', 'aac', '-ar', '48000', '-b:a', '256k', '-shortest', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  await p.goto(`http://localhost:5300/motion/comp/index.html?fmt=${fmt}`);
  await p.waitForFunction(() => window.__ready || window.__error, null, { timeout: 180000 });
  const total = Math.round(DUR * fps);
  const t0 = Date.now();
  for (let i = 0; i < total; i += 1) {
    await p.evaluate((t) => window.renderFrame(t), i / fps);
    const buf = await p.screenshot({ type: 'png' });
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    if (i % 120 === 0) process.stdout.write(`  ${fmt} ${i}/${total} ${((Date.now() - t0) / 1000).toFixed(0)}s\n`);
  }
  ff.stdin.end();
  await new Promise((r) => ff.on('close', r));
  await b.close();
  process.stdout.write(`  ${fmt} done -> ${out}\n`);
})();
