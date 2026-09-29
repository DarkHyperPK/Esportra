import { C, page, shardsSvg } from '../lib.mjs';

const full = (id, svg, w = 1920, h = 1080, transparent = false) =>
  page({ title: id, transparent, css: `body{width:${w}px;height:${h}px} svg{display:block}`, body: svg });

const spotlight = ({ w = 1920, h = 1080, cx = 0.5, warm = false } = {}) => {
  const x = w * cx;
  const tint = warm ? '255,196,150' : '225,228,240';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
<defs>
<linearGradient id="beam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="rgb(${tint})" stop-opacity="0.16"/><stop offset="0.85" stop-color="rgb(${tint})" stop-opacity="0.025"/></linearGradient>
<radialGradient id="pool" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="rgb(${tint})" stop-opacity="0.12"/><stop offset="1" stop-color="rgb(${tint})" stop-opacity="0"/></radialGradient>
<radialGradient id="src" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="rgb(${tint})" stop-opacity="0.35"/><stop offset="1" stop-color="rgb(${tint})" stop-opacity="0"/></radialGradient>
<filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="38"/></filter>
<linearGradient id="vig" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000" stop-opacity="0.55"/><stop offset="0.3" stop-color="#000" stop-opacity="0"/><stop offset="0.7" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.55"/></linearGradient>
</defs>
<rect width="${w}" height="${h}" fill="${C.stage}"/>
<polygon points="${x - 70},-20 ${x + 70},-20 ${x + w * 0.24},${h * 0.8} ${x - w * 0.24},${h * 0.8}" fill="url(#beam)" filter="url(#soft)"/>
<ellipse cx="${x}" cy="${h * 0.8}" rx="${w * 0.3}" ry="${h * 0.075}" fill="url(#pool)"/>
<ellipse cx="${x}" cy="-10" rx="220" ry="90" fill="url(#src)"/>
<rect width="${w}" height="${h}" fill="url(#vig)"/></svg>`;
};

const grain = (w = 1920, h = 1080) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
<filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch"/><feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0.55 0 0 0 -0.2"/></filter>
<rect width="${w}" height="${h}" filter="url(#n)"/></svg>`;

const hairlineGrid = (w = 1920, h = 1080, step = 96) => {
  let lines = '';
  for (let x = step; x < w; x += step) lines += `<line x1="${x}" y1="0" x2="${x}" y2="${h}"/>`;
  for (let y = step; y < h; y += step) lines += `<line x1="0" y1="${y}" x2="${w}" y2="${y}"/>`;
  let marks = '';
  for (let x = step; x < w; x += step * 4) for (let y = step; y < h; y += step * 4) marks += `<path d="M${x - 6} ${y}H${x + 6}M${x} ${y - 6}V${y + 6}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="${C.stage}"/>
<g stroke="rgba(255,255,255,0.05)" stroke-width="1">${lines}</g><g stroke="rgba(255,255,255,0.16)" stroke-width="1">${marks}</g>
<line x1="${step * 2}" y1="${h - step * 2}" x2="${step * 2 + 64}" y2="${h - step * 2}" stroke="${C.cue}" stroke-width="2"/></svg>`;
};

const scoreboard = (w = 1920, h = 1080, cols = 8, rows = 5) => {
  const cw = w / cols;
  const rh = h / rows;
  let tiles = '';
  for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) tiles += `<rect x="${c * cw + 1}" y="${r * rh + 1}" width="${cw - 1}" height="${rh - 1}" fill="${(c + r) % 7 === 3 ? '#131316' : C.panel}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="rgba(255,255,255,0.06)"/>${tiles}</svg>`;
};

const cutFrame = (w = 1920, h = 1080, n = 64) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
<path d="M24.5 24.5 H${w - 24 - n} L${w - 24.5} ${24 + n} V${h - 24.5} H24.5 Z" fill="none" stroke="rgba(255,255,255,0.14)"/>
<line x1="${w - 24 - n}" y1="24.5" x2="${w - 24.5}" y2="${24 + n}" stroke="${C.cue}" stroke-width="3"/></svg>`;

const paper = (w = 1920, h = 1080) => {
  let rules = '';
  for (let y = 120; y < h - 60; y += 48) rules += `<line x1="96" y1="${y}" x2="${w - 96}" y2="${y}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="${C.paper}"/>
<g stroke="${C.paperHair}" stroke-width="1">${rules}</g><line x1="96" y1="72" x2="160" y2="72" stroke="${C.paperCue}" stroke-width="2"/></svg>`;
};

const t = (id, file, svgFn, description, tags, extra = {}) => ({
  id,
  out: file,
  w: extra.w || 1920,
  h: extra.h || 1080,
  transparent: extra.transparent,
  svg: svgFn,
  html: () => full(id, svgFn(), extra.w, extra.h, extra.transparent),
  description,
  tags: ['texture', ...tags],
  direction: extra.direction,
  use: extra.use,
});

export default [
  t('textures/streak-shards', 'textures/streak-shards.png', () => shardsSvg({ seed: 7, fill: '#151517' }), 'Vector streak shards on stage black - the brand background, regenerable at any size.', ['background'], { direction: 'broadcast', use: 'Landing and event backgrounds behind a hero. Keep text on the dark gaps.' }),
  t('textures/streak-shards-cue', 'textures/streak-shards-cue.png', () => shardsSvg({ seed: 21, fill: '#151517', cueIndex: 2 }), 'Streak shards with one rose-edged shard - the cue light as texture.', ['background', 'cue'], { direction: 'broadcast', use: 'Announcement key art where nothing else on the frame uses rose.' }),
  t('textures/streak-shards-portrait', 'textures/streak-shards-portrait.png', () => shardsSvg({ w: 1080, h: 1920, seed: 11, count: 3, fill: '#151517' }), 'Portrait streak shards for stories and phone wallpapers.', ['background', 'portrait'], { w: 1080, h: 1920, direction: 'broadcast' }),
  t('textures/spotlight', 'textures/spotlight.png', () => spotlight(), 'One cool stage light with a soft falloff and a darkened floor.', ['background', 'light'], { direction: 'cinematic', use: 'Cinematic heroes: one light source, never multicolour gradients.' }),
  t('textures/trophy-light', 'textures/trophy-light.png', () => spotlight({ warm: true }), 'Warm key light for champion moments.', ['background', 'light'], { direction: 'trophy', use: 'Behind a champion crest or name. Pair with the team colour glow only on the champion card.' }),
  t('textures/hairline-grid', 'textures/hairline-grid.png', () => hairlineGrid(), '96 px hairline field with crosshair registration marks and a rose tick.', ['background', 'grid'], { direction: 'command-console', use: 'Technical and product-launch backdrops; UI screenshots float on it.' }),
  t('textures/scoreboard-field', 'textures/scoreboard-field.png', () => scoreboard(), 'The gap-px scoreboard grid as a full-bleed field.', ['background', 'grid'], { direction: 'broadcast', use: 'Stats and schedule graphics; fill tiles with numbers.' }),
  t('textures/grain', 'textures/grain.png', () => grain(), 'Transparent film grain (noise-driven white, up to ~18% alpha) to lay over flat grounds.', ['overlay'], { transparent: true, use: 'Overlay at 50-100% on key art only, never on product UI.' }),
  t('textures/cut-edge-frame', 'textures/cut-edge-frame.png', () => cutFrame(), 'Transparent 16:9 frame with the 45° notch and rose cut line.', ['overlay', 'frame'], { transparent: true, direction: 'trophy', use: 'Frame a champion photo or stream scene. Once per composition.' }),
  t('textures/daylight-paper', 'textures/daylight-paper.png', () => paper(), 'Paper ground with hairline rules and a rose-600 cue tick.', ['background', 'print'], { direction: 'daylight', use: 'Printed schedules, rulebooks, statements.' }),
];
