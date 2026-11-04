'use strict';
/* Esportra — Find Teammates reel. 30 s at 120 BPM (60 beats, 15 bars).
 * Deterministic: window.renderAt(t) draws the frame for time t (seconds).
 * Every product pixel is a crop of a real screenshot in ../../assets/screens. */

const Q = new URLSearchParams(location.search);
const FMT = Q.get('fmt') || '9x16';
const DUR = 30, BEAT = 0.5, FPS = Number(Q.get('fps') || 30);
const A = '../../assets/';
const FORMATS = {
  '9x16': { W: 1080, H: 1920, src: 'm', stage: { x: 56, y: 660, w: 968, h: 1120 }, cap: { x: 64, w: 952, size: 118, eb: 24, gap: 44, mode: 'above' }, cur: 74, hudY: 92, barY: 1842, logoW: 560 },
  '1x1':  { W: 1080, H: 1080, src: 'd', stage: { x: 56, y: 318, w: 968, h: 706 }, cap: { x: 60, w: 960, size: 74, eb: 18, gap: 26, mode: 'above' }, cur: 56, hudY: 48, barY: 1052, logoW: 340 },
  '16x9': { W: 1920, H: 1080, src: 'd', stage: { x: 790, y: 112, w: 1050, h: 856 }, cap: { x: 112, w: 600, size: 104, eb: 22, gap: 30, mode: 'left' }, cur: 60, hudY: 50, barY: 1040, logoW: 380 },
};
const F = FORMATS[FMT];
const SRC = F.src;
const S = F.stage;
const ZMAX = 3.0;

// ── math ──────────────────────────────────────────────────────────────────────
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, p) => a + (b - a) * p;
const prog = (t, a, b) => (b <= a ? (t >= a ? 1 : 0) : clamp((t - a) / (b - a)));
const E = {
  outExpo: p => (p >= 1 ? 1 : 1 - Math.pow(2, -10 * p)),
  inExpo: p => (p <= 0 ? 0 : Math.pow(2, 10 * p - 10)),
  inOutCubic: p => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2),
  inOutQuint: p => (p < 0.5 ? 16 * p ** 5 : 1 - Math.pow(-2 * p + 2, 5) / 2),
  inOutExpo: p => (p <= 0 ? 0 : p >= 1 ? 1 : p < 0.5 ? Math.pow(2, 20 * p - 10) / 2 : (2 - Math.pow(2, -20 * p + 10)) / 2),
  outBack: (p, s = 1.7) => 1 + (s + 1) * Math.pow(p - 1, 3) + s * Math.pow(p - 1, 2),
  outCubic: p => 1 - Math.pow(1 - p, 3),
  outQuart: p => 1 - Math.pow(1 - p, 4),
  inCubic: p => p * p * p,
  inQuart: p => p ** 4,
};
const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

// ── DOM helpers ───────────────────────────────────────────────────────────────
const root = document.getElementById('root');
root.style.width = F.W + 'px'; root.style.height = F.H + 'px';
document.body.style.width = F.W + 'px'; document.body.style.height = F.H + 'px';
function el(tag, cls, parent, style) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (style) Object.assign(e.style, style);
  (parent || root).appendChild(e);
  return e;
}
const managed = []; // elements hidden at the start of every frame
function managedEl(tag, cls, parent, style) { const e = el(tag, cls, parent, style); e.style.display = 'none'; managed.push(e); return e; }
function vis(e, on = true) { e.style.display = on ? '' : 'none'; }
function px(v) { return `${v}px`; }

// ── screenshot metadata ───────────────────────────────────────────────────────
const META = {}; const IMGS = {}; const LINES = {};
const STATES = ['01-discover', '02-search', '03a-filters-open', '03b-role', '03c-rank-open', '03d-rank-scrolled', '03e-filtered', '04a-save-before', '04b-save-after',
  '05-teams', '06a-detail', '06b-intro', '06c-sent', '07-requests', '07b-accepted', '08a-create', '08b0-step2', '08b1-role', '08b2-jett', '08b3-raze', '08b4-neon'];
function nameOf(state, src = SRC) { return `${src}-${state}`; }
function dirOf(name) { return name[0] === 'd' ? 'desktop' : 'mobile'; }
function R(name, key, i = 0) {
  const m = META[name]; if (!m) return null;
  const list = m.rects[key]; if (!list || !list[i]) return null;
  const b = list[i]; return { x: b.x, y: b.y, w: b.width, h: b.height };
}
function U(...rs) {
  const v = rs.filter(Boolean); if (!v.length) return null;
  const x = Math.min(...v.map(r => r.x)), y = Math.min(...v.map(r => r.y));
  const x2 = Math.max(...v.map(r => r.x + r.w)), y2 = Math.max(...v.map(r => r.y + r.h));
  return { x, y, w: x2 - x, h: y2 - y };
}
function VP(name) { const v = META[name].viewport; return { x: 0, y: 0, w: v.width, h: v.height }; }
function clipToVP(r, name) { const v = VP(name); const x = Math.max(r.x, 0), y = Math.max(r.y, 0); return { x, y, w: Math.min(r.x + r.w, v.w) - x, h: Math.min(r.y + r.h, v.h) - y }; }
function anchor(r, ax = 0.5, ay = 0.5) { return [r.x + r.w * ax, r.y + r.h * ay]; }

// ── layers ────────────────────────────────────────────────────────────────────
const bg = el('div', 'abs', root, { width: px(F.W), height: px(F.H) });
const bgGrid = el('img', 'abs', bg, { width: px(Math.max(F.W, F.H * 16 / 9) * 1.2), opacity: 0.0 });
bgGrid.src = 'grid-clean.png'; // brand hairline-grid with its rose tick removed (rose is reserved for the UI cue)
const bgStreak = el('img', 'abs', bg, { opacity: 0 });
bgStreak.src = A + (F.H > F.W ? 'textures/streak-shards-portrait.png' : 'textures/streak-shards.png');
const bgSpot = el('img', 'abs', bg, { opacity: 0, mixBlendMode: 'screen' });
bgSpot.src = A + 'textures/spotlight.png';

const hook = el('div', 'abs', root, { width: px(F.W), height: px(F.H), transformOrigin: '0 0' });

const win = el('div', 'abs', root, { left: px(S.x), top: px(S.y), width: px(S.w), height: px(S.h), transformOrigin: '50% 50%' });
const winShadow = el('div', 'abs', win, { width: px(S.w), height: px(S.h), boxShadow: '0 40px 120px rgba(0,0,0,0.65)' });
const stageClip = el('div', '', win, { left: 0, top: 0, width: px(S.w), height: px(S.h) });
stageClip.id = 'stageClip';
const world = el('div', '', stageClip); world.id = 'world';
const frameLines = ['t', 'b', 'l', 'r'].map(s => el('div', 'frameLine', win));
const corners = ['tl', 'tr', 'bl', 'br'].map(c => el('div', 'corner', win));
const winLabel = el('div', 'mono abs', win, { top: px(-(F.cap.eb + 18)), left: 0, fontSize: px(F.cap.eb * 0.78), letterSpacing: '0.24em', color: 'var(--sec)', whiteSpace: 'nowrap' });
winLabel.innerHTML = '<span style="display:inline-block;width:0.62em;height:0.62em;background:var(--rose);border-radius:50%;margin-right:0.7em;vertical-align:0.02em"></span>Live · Esportra / Find Teammates';
const winLabelR = el('div', 'mono abs', win, { top: px(-(F.cap.eb + 18)), right: 0, left: 'auto', fontSize: px(F.cap.eb * 0.78), letterSpacing: '0.24em', color: 'var(--hint)', whiteSpace: 'nowrap' });

const pop = el('div', 'abs', root, { width: px(F.W), height: px(F.H) });
const caps = el('div', 'abs', root, { width: px(F.W), height: px(F.H) });
const hud = el('div', 'abs', root, { width: px(F.W), height: px(F.H) });
const endc = el('div', 'abs', root, { width: px(F.W), height: px(F.H) });
const slash = el('div', 'abs', root, { width: px(F.W * 0.7), height: px(F.H * 2.2), background: 'var(--ink)', top: px(-F.H * 0.6) });
const slashEdge = el('div', 'abs', slash, { width: '10px', height: '100%', right: 0, left: 'auto', background: 'var(--rose)' });
const flash = el('div', 'abs', root, { width: px(F.W), height: px(F.H), background: '#fff', opacity: 0, pointerEvents: 'none' });
const grain = el('img', 'abs', root, { width: px(Math.max(F.W, F.H * 16 / 9) * 1.3), opacity: 0, mixBlendMode: 'screen' });
grain.src = A + 'textures/grain.png';

// ── world content: full screenshots, crops, cursor ───────────────────────────
const layers = {};
function layer(name) {
  if (layers[name]) return layers[name];
  const v = VP(name);
  const img = managedEl('img', 'layer', world, { width: px(v.w), height: px(v.h) });
  img.src = IMGS[name].src; img.decoding = 'sync';
  layers[name] = img; return img;
}
function show(name, o = 1) { const l = layer(name); vis(l); l.style.opacity = o; l.style.zIndex = 1; return l; }

function crop(name, r, parent = world) {
  const v = VP(name);
  const box = managedEl('div', 'crop', parent, { left: px(r.x), top: px(r.y), width: px(r.w), height: px(r.h) });
  const img = el('img', '', box, { width: px(v.w), height: px(v.h), left: px(-r.x), top: px(-r.y) });
  img.src = IMGS[name].src; img.decoding = 'sync';
  return { box, img, r, name };
}
// world-space crop transform
function setCrop(c, o = {}) {
  vis(c.box);
  const { dx = 0, dy = 0, s = 1, sx = s, sy = s, rot = 0, rx = 0, ry = 0, op = 1, ox = 0, oy = 0, blur = 0, clip = null, z = 5, shadow = 0 } = o;
  c.box.style.transform = `translate(${dx}px,${dy}px) rotateX(${rx}deg) rotateY(${ry}deg) rotate(${rot}deg) scale(${sx},${sy})`;
  c.box.style.opacity = op; c.box.style.zIndex = z;
  c.img.style.transform = ox || oy ? `translate(${ox}px,${oy}px)` : '';
  c.box.style.filter = blur > 0.05 ? `blur(${blur}px)` : '';
  c.box.style.clipPath = clip ? `inset(${clip[0]}% ${clip[1]}% ${clip[2]}% ${clip[3]}%)` : '';
  c.box.style.boxShadow = shadow ? `0 ${shadow * 0.4}px ${shadow}px rgba(0,0,0,0.6)` : '';
}
function block(color, parent = world) { return managedEl('div', 'abs', parent, { background: color }); }
function setBlock(b, r, o = 1, z = 6) { vis(b); Object.assign(b.style, { left: px(r.x), top: px(r.y), width: px(r.w), height: px(r.h), opacity: o, zIndex: z }); }

// screen-space pop-out of a real crop
function popCrop(name, r) {
  const v = VP(name);
  const box = managedEl('div', 'crop', pop, { left: 0, top: 0, width: px(r.w), height: px(r.h) });
  const img = el('img', '', box, { width: px(v.w), height: px(v.h), left: px(-r.x), top: px(-r.y) });
  img.src = IMGS[name].src; img.decoding = 'sync';
  return { box, img, r, name };
}
function worldToScreen(x, y) { return [S.x + S.w / 2 + (x - cam.cx) * cam.z, S.y + S.h / 2 + (y - cam.cy) * cam.z]; }
function setPop(c, o = {}) {
  vis(c.box);
  const { k = 1, dx = 0, dy = 0, op = 1, rot = 0, shadow = 0, at = null, zAbs = null, radius = 0, outline = 0 } = o;
  const [sx, sy] = at || worldToScreen(c.r.x + c.r.w / 2, c.r.y + c.r.h / 2);
  let z = zAbs ?? cam.z;
  const maxK = Math.min((F.W * 0.94) / (c.r.w * z), (F.H * 0.9) / (c.r.h * z));
  const kk = Math.min(k, Math.max(maxK, 1));
  c.box.style.transform = `translate(${sx - c.r.w / 2 + dx}px,${sy - c.r.h / 2 + dy}px) rotate(${rot}deg) scale(${z * kk})`;
  c.box.style.opacity = op;
  c.box.style.borderRadius = radius ? px(radius) : '';
  c.box.style.boxShadow = [shadow ? `0 ${shadow * 0.35}px ${shadow}px rgba(0,0,0,0.7)` : '', outline ? `0 0 0 ${outline}px rgba(255,255,255,0.9)` : ''].filter(Boolean).join(',');
}

// cursor (screen-constant size inside the world)
const cursor = el('div', 'abs', world, { zIndex: 50, transformOrigin: '0 0' });
cursor.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" style="display:block;overflow:visible;filter:drop-shadow(0 2px 3px rgba(0,0,0,.55))"><path d="M3 2 L3 19.5 L7.6 15.4 L10.6 22.2 L13.6 20.9 L10.7 14.2 L16.9 14.2 Z" fill="#fff" stroke="#09090B" stroke-width="1.5" stroke-linejoin="round"/></svg>';
const ripples = Array.from({ length: 3 }, () => el('div', 'abs', world, { zIndex: 49, borderRadius: '50%', border: '3px solid var(--rose)', boxSizing: 'border-box', transformOrigin: '50% 50%', display: 'none' }));
const burst = el('div', 'abs', world, { zIndex: 48, transformOrigin: '0 0', display: 'none' });
const rays = Array.from({ length: 12 }, () => el('div', 'ray', burst));

// ── camera ────────────────────────────────────────────────────────────────────
let cam = { cx: 0, cy: 0, z: 1, rx: 0, ry: 0, rz: 0 };
function fit(r, o = {}) {
  const pad = o.pad ?? 0.07;
  const z0 = Math.min(S.w / (r.w * (1 + pad * 2)), S.h / (r.h * (1 + pad * 2)));
  const z = Math.min(z0 * (o.zm ?? 1), o.zmax ?? ZMAX);
  return { cx: r.x + r.w / 2 + (o.dx ?? 0), cy: r.y + r.h / 2 + (o.dy ?? 0), z, rx: o.rx ?? 0, ry: o.ry ?? 0, rz: o.rz ?? 0 };
}
function camLerp(a, b, p) {
  return { cx: lerp(a.cx, b.cx, p), cy: lerp(a.cy, b.cy, p), z: a.z * Math.pow(b.z / a.z, p), rx: lerp(a.rx, b.rx, p), ry: lerp(a.ry, b.ry, p), rz: lerp(a.rz, b.rz, p) };
}
// keys: [tStart, tEnd, camState, ease?]; holds drift-push between keys
function track(keys, t, from) {
  let cur = from || keys[0][2];
  for (let i = 0; i < keys.length; i++) {
    const [a, b, target, ease = E.inOutQuint] = keys[i];
    if (t < a) break;
    const p = prog(t, a, b);
    cur = camLerp(cur, target, ease(p));
    if (t >= b) {
      const next = keys[i + 1]; const holdEnd = next ? next[0] : Infinity;
      const drift = Math.min(t, holdEnd) - b;
      cur = { ...target, z: target.z * (1 + 0.018 * drift) };
    } else break;
  }
  return cur;
}

// ── timeline helpers ──────────────────────────────────────────────────────────
const SFX = [];
const sfx = (t, type, extra = {}) => SFX.push({ t: +t.toFixed(4), type, ...extra });

function cursorPath(keys, t) {
  // keys: [tStart, tEnd, [x,y]] ; returns [x,y] or null
  if (!keys.length || t < keys[0][0] - 0.0001) return null;
  let p0 = keys[0][3] || [keys[0][2][0] + 140, keys[0][2][1] + 220];
  for (let i = 0; i < keys.length; i++) {
    const [a, b, pt] = keys[i];
    if (t < a) return p0;
    const q = E.inOutCubic(prog(t, a, b));
    const mx = lerp(p0[0], pt[0], q), my = lerp(p0[1], pt[1], q);
    const arc = Math.sin(Math.PI * q) * Math.hypot(pt[0] - p0[0], pt[1] - p0[1]) * 0.12;
    const nx = -(pt[1] - p0[1]), ny = pt[0] - p0[0]; const nl = Math.hypot(nx, ny) || 1;
    const pos = [mx + (nx / nl) * arc, my + (ny / nl) * arc];
    if (t < b) return pos;
    p0 = pt;
  }
  return p0;
}

// ── captions ──────────────────────────────────────────────────────────────────
function makeCaption(eyebrow, words, opts = {}) {
  const box = managedEl('div', 'abs', caps, { width: px(F.cap.w) });
  const eb = el('div', 'mono', box, { fontSize: px(F.cap.eb), letterSpacing: '0.28em', color: 'var(--sec)', marginBottom: px(F.cap.eb * 0.9), whiteSpace: 'nowrap' });
  const ebMask = el('span', 'mask', eb); const ebIn = el('span', '', ebMask); ebIn.innerHTML = eyebrow;
  const title = el('div', 'display', box, { fontSize: px(opts.size || F.cap.size), whiteSpace: 'normal', lineHeight: 0.98 });
  const spans = words.map((w, i) => {
    const m = el('span', 'mask', title); const s = el('span', '', m); s.textContent = w;
    if (opts.rose === i) s.style.color = 'var(--rose)';
    if (i < words.length - 1) title.appendChild(document.createTextNode(' '));
    return s;
  });
  return { box, ebIn, spans, opts };
}
function placeCaption(c) {
  const h = c.box.offsetHeight;
  let top;
  if (F.cap.mode === 'above') top = S.y - F.cap.gap - (F.cap.eb + 18) - h;
  else top = S.y + S.h / 2 - h / 2;
  c.box.style.left = px(F.cap.x); c.box.style.top = px(top);
}
function animCaption(c, t, tin, tout) {
  if (t < tin - 0.05 || t > tout + 0.4) return;
  vis(c.box);
  const ein = E.outExpo(prog(t, tin, tin + 0.45));
  const eout = E.inCubic(prog(t, tout, tout + 0.28));
  c.ebIn.style.transform = `translateY(${(1 - ein) * 110 - eout * 110}%)`;
  c.spans.forEach((s, i) => {
    const pi = E.outExpo(prog(t, tin + 0.05 + i * 0.07, tin + 0.55 + i * 0.07));
    const po = E.inCubic(prog(t, tout + i * 0.035, tout + 0.25 + i * 0.035));
    s.style.transform = `translateY(${(1 - pi) * 105 - po * 105}%) skewY(${(1 - pi) * 6}deg)`;
  });
}

// ── load ──────────────────────────────────────────────────────────────────────
async function loadAll() {
  const names = new Set();
  for (const s of STATES) { names.add(nameOf(s, SRC)); names.add(nameOf(s, 'd')); }
  const jobs = [...names].map(async n => {
    const r = await fetch(`${A}screens/${dirOf(n)}/${n}.json`); if (!r.ok) return;
    const meta = await r.json();
    const img = new Image(); img.decoding = 'sync'; img.src = `${A}screens/${dirOf(n)}/${n}.png`; await img.decode();
    META[n] = meta; IMGS[n] = img;
  });
  jobs.push(fetch(`${A}screens/text-lines.json`).then(r => r.json()).then(j => Object.assign(LINES, j)));
  const statics = [bgGrid, bgStreak, bgSpot, grain];
  await Promise.all([...jobs, ...statics.map(i => i.decode().catch(() => {}))]);
  await document.fonts.load('900 100px Poppins'); await document.fonts.load('800 100px Poppins'); await document.fonts.load('600 20px Inter');
  await document.fonts.ready;
}

// ═════════════════════════════════════════════════════════════════════════════
// SCENES
// ═════════════════════════════════════════════════════════════════════════════
const SCENES = [];
let HOOK, ENDC, HUD;

function buildHook() {
  const words = ['Still', 'looking', 'for', 'a', 'fifth?'];
  const times = [0, 0.5, 1.0, 1.5, 2.0];
  const wrap = el('div', 'abs', hook, { width: px(F.W), height: px(F.H) });
  const maxW = F.W * 0.86, maxH = F.H * (F.H > F.W ? 0.22 : 0.42);
  const W = words.map((w, i) => {
    const d = managedEl('div', 'display abs', wrap, { fontSize: '200px', transformOrigin: '50% 55%' });
    if (i === 1) w.split('').forEach(ch => { const s = el('span', '', d, { display: 'inline-block' }); s.textContent = ch; });
    else d.textContent = w;
    if (i === 4) d.style.color = 'var(--rose)';
    return { d, w, t: times[i] };
  });
  // glitch copies for "fifth?"
  const gl = [0, 1, 2].map(() => { const g = managedEl('div', 'display abs', wrap, { fontSize: '200px', color: 'var(--rose)', transformOrigin: '50% 55%' }); g.textContent = 'fifth?'; return g; });
  // stacked lockup
  const lines = ['Still looking', 'for a fifth?'].map((txt, i) => {
    const d = managedEl('div', 'display abs', wrap, { fontSize: '200px', transformOrigin: '0 0' });
    const m = el('span', 'mask', d); const s = el('span', '', m);
    s.innerHTML = i === 1 ? 'for a <span style="color:var(--rose)">fifth?</span>' : txt;
    return { d, s };
  });
  const slotsBox = managedEl('div', 'abs', wrap);
  const slotCap = el('div', 'mono abs', slotsBox, { fontSize: px(F.cap.eb), letterSpacing: '0.28em', color: 'var(--sec)', whiteSpace: 'nowrap' });
  slotCap.textContent = 'Roster 4 / 5';
  const slots = Array.from({ length: 5 }, (_, i) => el('div', 'slot', slotsBox, i < 4 ? { background: 'var(--ink)' } : { border: '4px solid var(--rose)' }));
  return { W, gl, lines, slotsBox, slots, slotCap, measured: false };
}
function hookMeasure(h) {
  h.W.forEach(o => {
    vis(o.d); const w = o.d.offsetWidth, hh = o.d.offsetHeight;
    o.k = Math.min(maxFit(w, hh)); o.w0 = w; o.h0 = hh;
  });
  function maxFit(w, hh) { return Math.min((F.W * 0.88) / w, (F.H * (F.H > F.W ? 0.3 : 0.5)) / hh); }
  h.lines.forEach(l => { vis(l.d); l.w0 = l.d.offsetWidth; l.h0 = l.d.offsetHeight; });
  const lk = Math.min(...h.lines.map(l => (F.W * 0.86) / l.w0));
  h.lk = Math.min(lk, (F.H * 0.2) / h.lines[0].h0);
  h.measured = true;
}
function hookUpdate(h, t) {
  if (t >= 4.05) return;
  vis(hook);
  const cx = F.W / 2, cy = F.H * (F.H > F.W ? 0.47 : 0.48);
  // single words, one per beat
  h.W.forEach((o, i) => {
    const t0 = o.t, t1 = i < 4 ? h.W[i + 1].t : 2.5;
    if (t < t0 || t >= t1) return;
    vis(o.d);
    const u = t - t0, k = o.k;
    let dx = 0, dy = 0, s = 1, sk = 0, rot = 0, blur = 0, op = 1;
    if (i === 0) { const p = E.outExpo(prog(u, 0, 0.22)); s = lerp(1.6, 1, p) * (1 + u * 0.06); blur = (1 - p) * 18; }
    if (i === 1) {
      [...o.d.children].forEach((c, j) => { const p = E.outExpo(prog(u, j * 0.018, 0.2 + j * 0.018)); c.style.transform = `translateX(${(1 - p) * F.W * 0.5}px) skewX(${(1 - p) * -24}deg)`; c.style.opacity = p; });
      s = 1 + u * 0.05;
    }
    if (i === 2) { const p = prog(u, 0, 0.26); dy = (1 - E.outBack(p, 2.2)) * -F.H * 0.5; s = 1 + u * 0.04; }
    if (i === 3) { const p = prog(u, 0, 0.28); s = lerp(0.1, 1, E.outBack(p, 3.2)) * (1 + u * 0.08); rot = (1 - E.outCubic(p)) * -14; }
    if (i === 4) { const p = E.outExpo(prog(u, 0, 0.2)); s = lerp(1.25, 1, p) * (1 + u * 0.05); }
    o.d.style.left = px(cx - o.w0 / 2); o.d.style.top = px(cy - o.h0 / 2);
    o.d.style.transform = `translate(${dx}px,${dy}px) rotate(${rot}deg) scale(${k * s}) skewX(${sk}deg)`;
    o.d.style.filter = blur > 0.1 ? `blur(${blur}px)` : '';
    o.d.style.opacity = op;
    if (i === 4) {
      const g = u < 0.26 || (u > 0.36 && u < 0.42);
      h.gl.forEach((gd, j) => {
        if (!g) return;
        vis(gd);
        const f = Math.floor(t * FPS);
        const y0 = hash(f * 3 + j) * 80, hgt = 8 + hash(f * 7 + j) * 22;
        gd.style.left = o.d.style.left; gd.style.top = o.d.style.top;
        gd.style.transform = `translate(${(hash(f * 11 + j) - 0.5) * 90}px,0) scale(${k * s})`;
        gd.style.clipPath = `inset(${y0}% 0 ${Math.max(0, 100 - y0 - hgt)}% 0)`;
        gd.style.color = j === 0 ? '#fff' : 'var(--rose)';
        gd.style.opacity = 0.9;
      });
      o.d.style.opacity = g ? 0.85 : 1;
    }
  });
  // stacked lockup + roster slots (beats 5–7)
  if (t >= 2.5) {
    const lk = h.lk, lh = h.lines[0].h0 * lk * 0.92;
    const blockH = lh * 2;
    const slotSize = Math.min(F.W * 0.12, 150), gap = slotSize * 0.28;
    const rowW = slotSize * 5 + gap * 4;
    const top = cy - (blockH + slotSize + F.cap.eb * 3) / 2;
    h.lines.forEach((l, i) => {
      vis(l.d);
      const p = E.outExpo(prog(t, 2.5 + i * 0.25, 2.9 + i * 0.25));
      l.d.style.left = px(F.W / 2 - (l.w0 * lk) / 2); l.d.style.top = px(top + i * lh);
      l.d.style.transform = `scale(${lk})`;
      l.s.style.transform = `translateY(${(1 - p) * 110}%)`;
    });
    vis(h.slotsBox);
    const sy = top + blockH + F.cap.eb * 2.6;
    h.slotsBox.style.left = px(F.W / 2 - rowW / 2); h.slotsBox.style.top = px(sy);
    h.slotCap.style.top = px(-F.cap.eb * 1.9); h.slotCap.style.left = 0;
    h.slotCap.style.opacity = prog(t, 3.0, 3.15);
    h.slots.forEach((s, i) => {
      const p = E.outBack(prog(t, 3.0 + i * 0.0625, 3.18 + i * 0.0625), 2.5);
      Object.assign(s.style, { left: px(i * (slotSize + gap)), top: 0, width: px(slotSize), height: px(slotSize), transform: `scale(${p})` });
      if (i === 4) s.style.opacity = t > 3.25 ? (Math.floor((t - 3.25) * 8) % 2 === 0 ? 1 : 0.35) : 1;
    });
    // zoom through the empty fifth slot
    const zp = prog(t, 3.5, 4.0);
    const fx = F.W / 2 - rowW / 2 + 4 * (slotSize + gap) + slotSize / 2, fy = sy + slotSize / 2;
    const zs = Math.exp(Math.log(60) * E.inExpo(zp));
    hook.style.transformOrigin = `${fx}px ${fy}px`;
    hook.style.transform = `scale(${zs})`;
  } else { hook.style.transform = ''; }
}

// ── product-appears scene (4–8 s) ─────────────────────────────────────────────
function buildAssembly() {
  const n01 = nameOf('01-discover');
  const v = VP(n01);
  const plate = block('#101013');
  const pieces = [];
  const add = (r, dir, kind = 'piece') => { if (r && r.w > 0 && r.h > 0) pieces.push({ c: crop(n01, clipToVP(r, n01)), dir, kind }); };
  if (SRC === 'd') { add(R(n01, 'sidebar', 0), 'L'); }
  add(R(n01, 'nav', 0), 'T');
  add(R(n01, 'heading', 0), 'B');
  if (SRC === 'd') add(R(n01, 'filters', 0), 'L');
  add(R(n01, 'tools', 0), 'B');
  const cards = (META[n01].rects.card || []).map((_, i) => R(n01, 'card', i)).filter(r => r.y < v.h - 20);
  cards.forEach((cr, i) => {
    const hero = R(n01, 'hero', i);
    if (i < 2 && hero) {
      add(hero, 'D', 'hero');
      add({ x: cr.x, y: hero.y + hero.h, w: cr.w, h: cr.y + cr.h - hero.y - hero.h }, 'B', 'body');
      const ag = R(n01, 'agents', i); if (ag && ag.y + ag.h < v.h) add(ag, 'P', 'agents');
    } else add(cr, 'B');
  });
  if (SRC === 'm') add(R(n01, 'bottomNav', 0), 'Bt');
  const ft = crop('d-01-discover', { x: 8, y: 132, w: 224, h: 41 }, pop);
  ft.box.style.left = 0; ft.box.style.top = 0;
  const logo = managedEl('img', 'abs', root, { width: px(F.logoW) }); logo.src = A + 'logo/esportra-lockup-white-full.png';
  const rule = managedEl('div', 'abs', root, { height: '6px', background: 'var(--rose)' });
  const cap = makeCaption('Esportra / New', ['Find', 'Teammates.']);
  return { n01, v, plate, pieces, ft, logo, rule, cap };
}
function assemblyUpdate(a, t) {
  if (t < 3.98 || t >= 8.1) return;
  // logo slam 4.0–5.0
  if (t < 5.15) {
    const p = E.outExpo(prog(t, 4.0, 4.35));
    const out = E.inOutQuint(prog(t, 4.85, 5.15));
    const lw = F.logoW, lh = lw * 1400 / 1364;
    const lx = F.W / 2 - lw / 2, ly = F.H / 2 - lh / 2 - (F.H > F.W ? 120 : 60);
    vis(a.logo);
    a.logo.style.left = px(lx); a.logo.style.top = px(ly);
    a.logo.style.transform = `translateY(${-out * F.H * 0.12}px) scale(${lerp(1.22, 1, p) * (1 + (t - 4) * 0.03) * (1 - out * 0.4)})`;
    a.logo.style.opacity = 1 - out;
    vis(a.rule);
    const rp = E.outExpo(prog(t, 4.08, 4.5));
    const rw = lw * 0.5 * rp;
    Object.assign(a.rule.style, { left: px(F.W / 2 - rw / 2), top: px(ly + lh + 36), width: px(rw), opacity: 1 - out });
    // real "Find Teammates" nav item from the product sidebar
    const fp = E.outExpo(prog(t, 4.5, 4.85));
    const k = F.H > F.W ? 3.2 : 2.4;
    setPop(a.ft, { at: [F.W / 2, ly + lh + 36 + 60 + 41 * k / 2], zAbs: k, k: lerp(0.7, 1, fp), op: fp * (1 - out), dy: (1 - fp) * 40, radius: 4 });
    if (t < 5.0) return;
  }
  // UI assembles piece by piece 5.0–7.4
  if (t < 7.55) cam = assemblyCam(a, t);
  setBlock(a.plate, a.v, E.outCubic(prog(t, 5.05, 5.25)), 0);
  const n = a.pieces.length, step = Math.min(0.17, 1.55 / n);
  a.pieces.forEach((pc, i) => {
    const t0 = 5.25 + i * step;
    if (t < t0) return;
    const p = prog(t, t0, t0 + 0.34), e = E.outBack(p, 1.5), eo = E.outExpo(p);
    const d = 60;
    let dx = 0, dy = 0, s = 1, rx = 0;
    if (pc.dir === 'L') dx = -(1 - eo) * d * 3;
    if (pc.dir === 'T') dy = -(1 - eo) * d * 2;
    if (pc.dir === 'B') { dy = (1 - e) * d * 2; rx = (1 - eo) * 30; }
    if (pc.dir === 'Bt') dy = (1 - eo) * d;
    if (pc.dir === 'D') { s = lerp(1.25, 1, eo); }
    if (pc.dir === 'P') { s = lerp(0.4, 1, e); }
    const fade = 1 - prog(t, 7.25, 7.45);
    setCrop(pc.c, { dx, dy, s, rx, op: Math.min(1, eo * 1.4) * (t > 7.45 ? 0 : 1), blur: (1 - eo) * 8, z: pc.kind === 'agents' ? 8 : pc.kind === 'hero' ? 7 : 5, shadow: (1 - eo) * 60 });
    if (fade <= 0) vis(pc.c.box, false);
  });
  if (t >= 7.2) show(a.n01, prog(t, 7.2, 7.4)).style.zIndex = 9;
  animCaption(a.cap, t, 5.05, 7.6);
}

// ── generic feature-scene builder ─────────────────────────────────────────────
function cursorScene(def) { SCENES.push(def); return def; }

function buildScenes() {
  const N = s => nameOf(s);
  const D = s => nameOf(s, 'd');

  // 01 SEARCH 7.55–10.5
  {
    const n1 = N('01-discover'), n2 = N('02-search');
    const search = R(n1, 'search'), tools = R(n1, 'tools'), card0 = R(n1, 'card', 0);
    const line = LINES[n2] && LINES[n2].lines[0];
    const field = crop(n2, R(n2, 'search'));
    const cover = block(LINES[n2]?.bg || '#101013');
    const caret = block('#fafafa');
    const v = VP(n1);
    const falling = (META[n1].rects.card || []).map((_, i) => i).filter(i => i > 0 && R(n1, 'card', i).y < v.h).map(i => crop(n1, clipToVP(R(n1, 'card', i), n1)));
    const fallCover = block('#101013');
    const cap = makeCaption('01 / Search', ['Search', 'anyone.']);
    const camKeys = [
      [7.55, 8.0, fit(U(tools, card0), { pad: 0.05 })],
      [9.55, 9.95, fit(R(n2, 'card', 0) || card0, { pad: 0.05 }), E.outExpo],
    ];
    const tClick = 8.5, chars = 7, tType0 = 8.62, tType1 = 9.4;
    sfx(tClick, 'click');
    for (let i = 0; i < chars; i++) sfx(tType0 + (i / (chars - 1)) * (tType1 - tType0), 'key', { i });
    sfx(9.5, 'swoosh');
    cursorScene({
      id: 'search', t0: 7.55, t1: 10.5, cap, capIn: 8.0, capOut: 10.25,
      cam: (t, from) => track(camKeys, t, from),
      cursor: [[7.9, 8.42, anchor(search, 0.12, 0.6), anchor(card0, 0.8, 0.9)], [9.6, 10.1, anchor(R(n2, 'card', 0) || card0, 0.86, 0.12)]],
      clicks: [tClick],
      update(t) {
        if (t < 9.5) {
          show(n1);
          if (t >= tClick) {
            setCrop(field, { z: 6 });
            if (line) {
              const k = Math.floor(clamp((t - tType0) / (tType1 - tType0) * (chars - 1) + 1, 0, chars)) / chars;
              const rx = line.x + line.w * k;
              setBlock(cover, { x: rx, y: line.y - 3, w: line.w * (1 - k) + 4, h: line.h + 6 }, 1, 7);
              if (Math.floor(t * 4) % 2 === 0 || t < tType1 + 0.05) setBlock(caret, { x: rx + 1, y: line.y - 2, w: SRC === 'm' ? 1.3 : 1, h: line.h + 4 }, 1, 8);
            }
          }
        } else {
          show(n2);
          const fp = prog(t, 9.5, 9.85);
          if (fp < 1) {
            falling.forEach((c, i) => { const q = E.inCubic(prog(t, 9.5 + i * 0.035, 9.8 + i * 0.035)); setCrop(c, { dy: q * 140, rot: q * (i % 2 ? 6 : -6), op: 1 - q, s: 1 - q * 0.1, z: 6 }); });
          }
        }
      },
    });
  }

  // 02 FILTER 10.5–13.5
  {
    const base = N(SRC === 'm' ? '03a-filters-open' : '01-discover');
    const nb = N('03b-role'), nc = N('03c-rank-open'), nd = N('03d-rank-scrolled'), ne = N('03e-filtered');
    const role = R(base, 'roleSelect', 0), trig = R(nb, 'rankTrigger', 0) || R(nb, 'trigger', 0);
    const filters = R(base, 'filters', 0);
    const list = R(nc, 'list', 0);
    const target = R(nd, 'target', 0);
    const listC = crop(nc, U(R(nc, 'trigger', 0), list));
    const listD = crop(nd, U(R(nd, 'trigger', 0), R(nd, 'list', 0)));
    const chipsE = U(R(ne, 'chips', 0), R(ne, 'chips', 1)) || R(ne, 'applied', 0);
    const chipPop = chipsE ? popCrop(ne, chipsE) : null;
    const chipB = R(nb, 'applied', 0) || R(nb, 'chips', 0);
    const chipBC = chipB ? crop(nb, chipB) : null;
    const cap = makeCaption('02 / Filter', ['Role.', 'Rank.', 'Region.']);
    const focusA = SRC === 'm' ? U(role, trig) : U(filters, R(base, 'card', 0));
    const camKeys = [
      [10.3, 10.7, fit(SRC === 'm' ? U(R(base, 'filters', 0)) : focusA, { pad: 0.04 }), E.inOutExpo],
      [11.2, 11.5, fit(SRC === 'm' ? U(trig, list) : U(filters, list || trig), { pad: 0.05 })],
      [12.6, 12.95, fit(chipsE ? U(chipsE, R(ne, 'card', 0)) : R(ne, 'card', 0), { pad: 0.05 }), E.outExpo],
    ];
    [11.0, 11.5, 12.5].forEach(tc => sfx(tc, 'click'));
    sfx(11.52, 'tick'); sfx(11.8, 'scroll'); sfx(12.55, 'pop');
    cursorScene({
      id: 'filter', t0: 10.5, t1: 13.5, cap, capIn: 10.6, capOut: 13.2,
      cam: (t, from) => track(camKeys, t, from),
      cursor: [[10.55, 10.95, anchor(role, 0.7, 0.55)], [11.1, 11.45, anchor(trig, 0.5, 0.55)], [11.95, 12.42, anchor(target || list, 0.35, 0.5)], [12.7, 13.2, anchor(chipsE || trig, 0.9, 1.6)]],
      clicks: [11.0, 11.5, 12.5],
      update(t) {
        if (t < 11.0) show(base);
        else if (t < 12.5) {
          show(nb);
          if (chipBC && t < 11.3) { const p = E.outBack(prog(t, 11.0, 11.22), 2.6); setCrop(chipBC, { s: p, z: 7 }); }
          if (t >= 11.5) {
            const p = E.outExpo(prog(t, 11.5, 11.72));
            const sc = prog(t, 11.76, 11.96);
            if (sc < 1) setCrop(listC, { clip: [0, 0, (1 - p) * 100, 0], z: 8, op: 1, shadow: 30 });
            if (sc > 0) setCrop(listD, { z: 9, op: E.inOutCubic(sc), oy: (1 - E.outCubic(sc)) * 26, shadow: 30 });
          }
        } else {
          show(ne);
          if (chipPop) {
            const p = prog(t, 12.55, 13.25);
            const k = p < 0.35 ? lerp(1, 1.55, E.outBack(p / 0.35, 2)) : lerp(1.55, 1, E.inOutCubic((p - 0.35) / 0.65));
            if (p < 1) setPop(chipPop, { k, shadow: 40 * (k - 1) * 2 });
          }
        }
      },
    });
  }

  // 03 SAVE 13.5–15.5
  {
    const na = N('04a-save-before'), nb = N('04b-save-after');
    const save = R(na, 'save', 0), card = R(na, 'card', 0), hero = R(na, 'hero', 0);
    const cardPop = popCrop(nb, card);
    const cap = makeCaption('03 / Save', ['Keep', 'a', 'shortlist.']);
    const camKeys = [
      [13.5, 13.5, fit(U(hero, R(na, 'rank', 0)), { pad: 0.06 })],
      [14.95, 15.3, fit(U(card, R(na, 'card', 1)), { pad: 0.04 })],
    ];
    sfx(14.5, 'click'); sfx(14.52, 'burst');
    cursorScene({
      id: 'save', t0: 13.5, t1: 15.5, cap, capIn: 13.55, capOut: 15.25,
      cam: (t, from) => track(camKeys, t, from),
      cursor: [[13.6, 14.42, anchor(save, 0.5, 0.55), anchor(hero, 0.35, 0.9)], [14.9, 15.4, anchor(R(na, 'teamTab', 0) || save, 0.5, 0.6)]],
      clicks: [14.5], burst: [14.5, anchor(save, 0.5, 0.5)],
      update(t) {
        show(t < 14.5 ? na : nb);
        const p = prog(t, 14.5, 15.05);
        if (p > 0 && p < 1) {
          const k = p < 0.3 ? lerp(0.97, 1.07, E.outBack(p / 0.3, 2)) : lerp(1.07, 1, E.inOutCubic((p - 0.3) / 0.7));
          setPop(cardPop, { k, shadow: 90 * (1 - p), radius: 16 * cam.z * k });
        }
      },
    });
  }

  // 04 TEAMS 15.5–17.5
  {
    const nb = N('04b-save-after'), n5 = N('05-teams');
    const tab = R(nb, 'teamTab', 0) || R(nb, 'seg', 0);
    const v = VP(n5);
    const cardsOf = n => (META[n].rects.card || []).map((_, i) => R(n, 'card', i)).filter(r => r.y < v.h);
    const gridR = clipToVP(U(...cardsOf(nb), ...cardsOf(n5)), n5);
    const gOut = crop(nb, gridR), gIn = crop(n5, gridR);
    const cover = block('#101013');
    const t5 = R(n5, 'card', 0), roster = R(n5, 'roster', 0), range = R(n5, 'range', 0);
    const rosterPop = roster ? popCrop(n5, roster) : null;
    const cap = makeCaption('04 / Teams', ['Or', 'find', 'a', 'team.']);
    const camKeys = [
      [15.5, 15.85, fit(U(R(nb, 'seg', 0), R(nb, 'card', 0), SRC === 'd' ? R(nb, 'card', 1) : null), { pad: 0.04 })],
      [16.45, 16.85, fit(U(range, roster) || t5, { pad: 0.08 }), E.outExpo],
    ];
    sfx(16.0, 'click'); sfx(16.02, 'whoosh'); sfx(16.95, 'pop');
    cursorScene({
      id: 'teams', t0: 15.5, t1: 17.5, cap, capIn: 15.55, capOut: 17.25,
      cam: (t, from) => track(camKeys, t, from),
      cursor: [[15.5, 15.95, anchor(tab, 0.5, 0.55)], [16.5, 17.3, anchor(R(n5, 'more', 0) || t5, 0.4, 0.6)]],
      clicks: [16.0],
      update(t) {
        show(t < 16.0 ? nb : n5);
        const p = prog(t, 16.0, 16.38);
        if (t >= 16.0 && p < 1) {
          setBlock(cover, gridR, 1, 5);
          const e = E.inOutQuint(p);
          setCrop(gOut, { dx: -e * gridR.w * 0.6, op: 1 - e, z: 6, blur: Math.sin(Math.PI * p) * 6 });
          setCrop(gIn, { dx: (1 - e) * gridR.w * 0.6, op: e, z: 7, blur: Math.sin(Math.PI * p) * 6 });
        }
        if (rosterPop) {
          const q = prog(t, 16.9, 17.45);
          if (q > 0 && q < 1) { const k = q < 0.3 ? lerp(1, 1.35, E.outBack(q / 0.3, 2)) : lerp(1.35, 1, E.inOutCubic((q - 0.3) / 0.7)); setPop(rosterPop, { k, shadow: 60 * (k - 1) * 2 }); }
        }
      },
    });
  }

  // 05 CONNECT 17.5–21.0
  {
    const n5 = N('05-teams'), na = N('06a-detail'), nb = N('06b-intro'), nc = N('06c-sent');
    const more = R(n5, 'more', 0);
    const drawerA = R(na, 'drawer', 0);
    const drw = crop(na, drawerA);
    const ta = R(nb, 'textarea', 0), send = R(nb, 'send', 0) || R(nb, 'send', 0);
    const lines = (LINES[nb] && LINES[nb].lines) || [];
    const covers = lines.map(() => block(LINES[nb].bg));
    const caret = block('#fafafa');
    const status = R(nc, 'status', 0);
    const statusPop = status ? popCrop(nc, { x: status.x - 8, y: status.y - 6, w: Math.min(status.w, 132) + 16, h: status.h + 12 }) : null;
    const cap = makeCaption('05 / Connect', ['Introduce', 'yourself.']);
    const dHero = R(na, 'dhero', 0) || drawerA;
    const camKeys = [
      [17.5, 17.85, fit(R(n5, 'card', 0), { pad: 0.05 })],
      [18.05, 18.45, fit(SRC === 'd' ? U(drawerA) : U(dHero, R(na, 'stats', 0)), { pad: 0.03 }), E.outExpo],
      [18.75, 18.95, fit(U(ta, send), { pad: 0.12 }), E.inOutExpo],
      [20.55, 20.75, fit(status ? { x: R(nc, 'drawer', 0).x, y: status.y - 300, w: R(nc, 'drawer', 0).w, h: 340 } : R(nc, 'drawer', 0), { pad: 0.04 }), E.inOutExpo],
    ];
    const tType0 = 19.1, tType1 = 20.15;
    sfx(18.0, 'click'); sfx(18.02, 'whoosh'); sfx(18.8, 'whip'); sfx(19.0, 'click');
    const totalW = lines.reduce((s, l) => s + l.w, 0);
    const nKeys = 16; for (let i = 0; i < nKeys; i++) sfx(tType0 + (i / (nKeys - 1)) * (tType1 - tType0), 'key', { i });
    sfx(20.5, 'click'); sfx(20.6, 'whip'); sfx(20.78, 'confirm');
    cursorScene({
      id: 'connect', t0: 17.5, t1: 21.0, cap, capIn: 17.55, capOut: 20.85,
      cam: (t, from) => track(camKeys, t, from),
      cursor: [[17.5, 17.95, anchor(more, 0.55, 0.55)], [18.4, 18.65, anchor(drawerA, 0.5, 0.7)], [18.75, 18.95, anchor(ta, 0.3, 0.5)], [20.15, 20.42, anchor(send, 0.5, 0.55)], [20.75, 20.95, anchor(status || send, 1.1, 0.8)]],
      clicks: [18.0, 19.0, 20.5],
      update(t) {
        if (t < 18.0) { show(n5); return; }
        if (t < 18.8) {
          const p = prog(t, 18.0, 18.38);
          show(n5, 1); show(na, E.outCubic(p)).style.zIndex = 2;
          setCrop(drw, { dx: (1 - E.outExpo(p)) * drawerA.w, z: 8, shadow: 80 });
          return;
        }
        if (t < 20.5) {
          show(nb);
          const tt = prog(t, tType0, tType1);
          let acc = tt * totalW, caretAt = null;
          lines.forEach((l, i) => {
            const shown = clamp(acc, 0, l.w); acc -= l.w;
            const step = SRC === 'm' ? 7 : 6; const q = shown >= l.w - 0.01 ? l.w : Math.floor(shown / step) * step;
            const rem = l.w - q;
            if (rem > 0.5 || t < tType0) setBlock(covers[i], { x: l.x + (t < tType0 ? 0 : q), y: l.y - 3, w: (t < tType0 ? l.w : rem) + 3, h: l.h + 7 }, 1, 7);
            if (!caretAt && rem > 0.5 && t >= tType0) caretAt = [l.x + q, l.y];
            if (!caretAt && i === lines.length - 1 && rem <= 0.5) caretAt = [l.x + l.w + 1, l.y];
          });
          if (caretAt && t >= 19.0 && (Math.floor(t * 4) % 2 === 0 || t < tType1)) setBlock(caret, { x: caretAt[0], y: caretAt[1] - 2, w: 1.2, h: (lines[0]?.h || 12) + 4 }, 1, 8);
          return;
        }
        show(nc);
        if (statusPop) {
          const q = prog(t, 20.75, 21.1);
          if (q > 0 && q < 1) { const k = lerp(1, 1.45, E.outBack(Math.min(1, q / 0.4), 2)) - (q > 0.4 ? E.inOutCubic((q - 0.4) / 0.6) * 0.45 : 0); setPop(statusPop, { k, shadow: 50, radius: 6 }); }
        }
      },
    });
  }

  // 06 REQUESTS 21.0–23.5
  {
    const n7 = N('07-requests'), n7b = N('07b-accepted');
    const row0 = R(n7, 'row', 0), acc = R(n7, 'accept', 0), panel = R(n7, 'panel', 0);
    const rowPop = popCrop(n7b, R(n7b, 'row', 0) || row0);
    const cap = makeCaption('06 / Requests', ['Accept.', 'Squad', 'up.']);
    const camKeys = [
      [21.0, 21.0, fit(SRC === 'm' ? U(row0, R(n7, 'row', 1)) : U(row0, R(n7, 'row', 1)), { pad: 0.05 })],
      [22.55, 22.95, fit(SRC === 'm' ? U(R(n7b, 'heading', 0), row0) : U(R(n7b, 'heading', 0), panel), { pad: 0.04 }), E.outExpo],
    ];
    sfx(22.0, 'click'); sfx(22.04, 'confirm');
    cursorScene({
      id: 'requests', t0: 21.0, t1: 23.5, cap, capIn: 21.05, capOut: 23.25,
      cam: (t, from) => track(camKeys, t, from),
      cursor: [[21.1, 21.92, anchor(acc, 0.5, 0.55), anchor(row0, 0.2, 1.4)], [22.6, 23.2, anchor(acc, 0.9, 1.5)]],
      clicks: [22.0], burst: [22.0, anchor(acc, 0.5, 0.5)],
      update(t) {
        show(t < 22.0 ? n7 : n7b);
        const q = prog(t, 22.02, 22.6);
        if (q > 0 && q < 1) { const k = q < 0.3 ? lerp(0.98, 1.05, E.outBack(q / 0.3, 2)) : lerp(1.05, 1, E.inOutCubic((q - 0.3) / 0.7)); setPop(rowPop, { k, shadow: 80 * (1 - q) }); }
      },
    });
  }

  // 07 CREATE 23.5–27.0
  {
    const n8a = N('08a-create');
    const steps = ['08b0-step2', '08b1-role', '08b2-jett', '08b3-raze', '08b4-neon'].map(N);
    const cont = R(n8a, 'primary', 0);
    const s0 = steps[0];
    const roleR = R(s0, 'roleOpt', 0), jett = R(s0, 'jett', 0), raze = R(s0, 'raze', 0), neon = R(s0, 'neon', 0);
    const pickR = U(roleR, jett, raze, neon);
    // floating preview = the real "How you'll appear" card (desktop capture, same component)
    const pv = ['08b0-step2', '08b1-role', '08b2-jett', '08b3-raze', '08b4-neon'].map(s => popCrop(D(s), R(D(s), 'previewCard', 0)));
    const pickPad = { x: pickR.x - 14, y: pickR.y - 14, w: pickR.w + 28, h: pickR.h + 28 };
    const pz = Math.min(S.w / pickPad.w, (S.h * (FMT === '1x1' ? 0.5 : 0.55)) / pickPad.h, ZMAX);
    const pickCam = { cx: pickPad.x + pickPad.w / 2, cy: pickPad.y - 24 / pz + S.h / (2 * pz), z: pz, rx: 0, ry: 0, rz: 0 };
    const pvR = pv[0].r;
    const pvK = clamp((S.h - pickPad.h * pz - 60) / pvR.h, FMT === '1x1' ? 0.72 : 0.8, 1.3);
    const cap = makeCaption('07 / Create', ['Post', 'your', 'listing.']);
    const camKeys = [
      [23.5, 23.5, fit(U(R(n8a, 'form', 0)), { pad: 0.04 })],
      [24.05, 24.4, pickCam, E.outExpo],
    ];
    const clicks = [24.0, 24.5, 25.0, 25.5, 26.0];
    clicks.forEach(tc => sfx(tc, 'click')); sfx(24.52, 'tick'); sfx(25.02, 'tick'); sfx(25.52, 'tick'); sfx(26.02, 'tick');
    sfx(26.35, 'riser'); sfx(26.4, 'whoosh');
    cursorScene({
      id: 'create', t0: 23.5, t1: 27.0, cap, capIn: 23.55, capOut: 26.3,
      cam: (t, from) => track(camKeys, t, from),
      cursor: [[23.55, 23.92, anchor(cont, 0.5, 0.55)], [24.12, 24.42, anchor(roleR, 0.5, 0.55)], [24.62, 24.92, anchor(jett, 0.45, 0.5)], [25.12, 25.42, anchor(raze, 0.45, 0.5)], [25.62, 25.92, anchor(neon, 0.45, 0.5)]],
      clicks,
      update(t) {
        const idx = t < 24.0 ? -1 : clicks.filter(c => t >= c).length - 1;
        show(idx < 0 ? n8a : steps[Math.min(idx, 4)]);
        if (t >= 24.35) {
          const pi = Math.min(idx, 4);
          const enter = E.outExpo(prog(t, 24.35, 24.75));
          const fly = E.inOutQuint(prog(t, 26.25, 26.95));
          const r = pv[0].r;
          const kBase = pvK;
          const home = [S.x + S.w - r.w * kBase / 2 - 22, S.y + S.h - r.h * kBase / 2 - 22];
          const center = [F.W / 2, F.H / 2];
          const kHero = Math.min((F.W * 0.62) / r.w, (F.H * 0.62) / r.h);
          const at = [lerp(home[0], center[0], fly), lerp(home[1], center[1], fly) + (1 - enter) * 80];
          const bump = clicks.slice(1).reduce((s, c) => s + (t >= c ? Math.exp(-(t - c) * 14) * 0.06 : 0), 0);
          pv.forEach((c, i) => {
            if (i !== pi) return;
            setPop(c, { at, zAbs: lerp(kBase, kHero, fly), k: (1 + bump) * lerp(0.85, 1, enter), op: enter, shadow: 70, radius: 16, outline: 0, rot: lerp(-2, 0, fly) });
          });
        }
      },
    });
  }
}

// ── end card ─────────────────────────────────────────────────────────────────
function buildEnd() {
  const logo = managedEl('img', 'abs', endc, { width: px(F.logoW * 0.62) }); logo.src = A + 'logo/esportra-lockup-white-full.png';
  const words = ['Find', 'your', 'next', 'team.'];
  const size = F.H > F.W ? 150 : F.W > F.H ? 150 : 112;
  const title = managedEl('div', 'heading abs', endc, { fontSize: px(size), width: px(F.W * 0.88), left: px(F.W * 0.06), textAlign: 'center', lineHeight: 1.02 });
  const ws = words.map((w, i) => { const m = el('span', 'mask', title); const s = el('span', '', m); s.textContent = w; if (i < 3) title.appendChild(document.createTextNode(' ')); return s; });
  const sub = managedEl('div', 'abs', endc, { width: px(F.W * 0.8), left: px(F.W * 0.1), textAlign: 'center', color: 'var(--sec)', fontSize: px(F.H > F.W ? 34 : 28), fontWeight: 500 });
  sub.textContent = 'Good people. Shared goals. A team worth showing up for.';
  const cta = managedEl('div', 'mono abs', endc, { width: px(F.W), left: 0, textAlign: 'center', fontSize: px(F.cap.eb * 1.05), letterSpacing: '0.3em', color: 'var(--ink)' });
  cta.innerHTML = '<span style="display:inline-block;width:0.6em;height:0.6em;background:var(--rose);border-radius:50%;margin-right:0.8em;vertical-align:0.05em"></span>Find Teammates · Live on Esportra';
  const rule = managedEl('div', 'abs', endc, { height: '6px', background: 'var(--rose)' });
  return { logo, title, ws, sub, cta, rule };
}
function endUpdate(e, t) {
  if (t < 26.95) return;
  const lw = F.logoW * 0.62, lh = lw * 1400 / 1364;
  const titleH = e.title.offsetHeight || 300;
  const blockH = lh + 70 + titleH + 40 + 50 + 80;
  const top = F.H / 2 - blockH / 2 + (F.H > F.W ? -40 : 0);
  vis(e.logo);
  const lp = E.outExpo(prog(t, 27.0, 27.4));
  e.logo.style.left = px(F.W / 2 - lw / 2); e.logo.style.top = px(top);
  e.logo.style.transform = `scale(${lerp(1.3, 1, lp) * (1 + (t - 27) * 0.012)})`; e.logo.style.opacity = lp;
  vis(e.title); e.title.style.top = px(top + lh + 70);
  e.ws.forEach((s, i) => { const p = E.outExpo(prog(t, 27.25 + i * 0.25, 27.7 + i * 0.25)); s.style.transform = `translateY(${(1 - p) * 110}%)`; });
  vis(e.sub); e.sub.style.top = px(top + lh + 70 + titleH + 36); e.sub.style.opacity = E.outCubic(prog(t, 28.3, 28.7));
  vis(e.cta); e.cta.style.top = px(top + lh + 70 + titleH + 36 + 50 + 64); e.cta.style.opacity = E.outCubic(prog(t, 28.55, 28.9));
  vis(e.rule); const rp = E.outExpo(prog(t, 28.5, 29.0)); const rw = F.W * 0.18 * rp;
  Object.assign(e.rule.style, { left: px(F.W / 2 - rw / 2), top: px(top + lh + 36), width: px(rw) });
  const out = prog(t, 29.7, 30.0);
  endc.style.opacity = 1 - out;
}

// ── HUD ──────────────────────────────────────────────────────────────────────
function buildHud() {
  const mark = el('img', 'abs', hud, { height: px(F.cap.eb * 2.1) }); mark.src = A + 'logo/esportra-mark-white-224.png';
  const word = el('img', 'abs', hud, { height: px(F.cap.eb * 0.82) }); word.src = A + 'logo/esportra-wordmark-white.png';
  const right = el('div', 'mono abs', hud, { fontSize: px(F.cap.eb * 0.78), letterSpacing: '0.24em', color: 'var(--sec)', whiteSpace: 'nowrap' });
  const beats = Array.from({ length: 4 }, () => el('div', 'abs', hud, { width: px(F.cap.eb * 0.55), height: px(F.cap.eb * 0.55) }));
  const barBg = el('div', 'abs', hud, { height: '2px', background: 'rgba(255,255,255,0.14)' });
  const barFg = el('div', 'abs', hud, { height: '2px', background: 'var(--ink)' });
  const ticks = Array.from({ length: 16 }, () => el('div', 'abs', hud, { width: '2px', height: '10px', background: 'rgba(255,255,255,0.3)' }));
  const tc = el('div', 'mono abs', hud, { fontSize: px(F.cap.eb * 0.72), letterSpacing: '0.2em', color: 'var(--hint)', whiteSpace: 'nowrap' });
  return { mark, word, right, beats, barBg, barFg, ticks, tc };
}
function hudUpdate(h, t) {
  const on = E.outCubic(prog(t, 5.0, 5.4)) * (1 - prog(t, 26.9, 27.05));
  hud.style.opacity = on; if (on <= 0) return;
  const m = 56 * (F.W / 1080) * (F.H > F.W ? 1 : 0.9), y = F.hudY;
  const mh = F.cap.eb * 2.1;
  Object.assign(h.mark.style, { left: px(m), top: px(y - mh / 2) });
  Object.assign(h.word.style, { left: px(m + mh * 1.25), top: px(y - F.cap.eb * 0.41) });
  const sc = SCENES.find(s => t >= s.t0 && t < s.t1);
  h.right.textContent = `${sc ? sc.cap.ebIn.textContent : 'Find Teammates'}`;
  const rw = h.right.offsetWidth; const bs = F.cap.eb * 0.55, bg = bs * 0.6;
  const beatsW = 4 * bs + 3 * bg;
  Object.assign(h.right.style, { left: px(F.W - m - beatsW - 28 - rw), top: px(y - F.cap.eb * 0.5) });
  const bi = Math.floor(t / BEAT) % 4; const bp = (t % BEAT) / BEAT;
  h.beats.forEach((b, i) => { Object.assign(b.style, { left: px(F.W - m - beatsW + i * (bs + bg)), top: px(y - bs / 2), background: i === bi ? (i === 0 ? 'var(--rose)' : 'var(--ink)') : 'rgba(255,255,255,0.16)', opacity: i === bi ? 1 - bp * 0.5 : 1 }); });
  const bx = m, bw = F.W - 2 * m, by = F.barY;
  Object.assign(h.barBg.style, { left: px(bx), top: px(by), width: px(bw) });
  Object.assign(h.barFg.style, { left: px(bx), top: px(by), width: px(bw * t / DUR) });
  h.ticks.forEach((k, i) => Object.assign(k.style, { left: px(bx + (bw * i) / 15 - 1), top: px(by - 4), background: t >= i * 2 ? 'var(--ink)' : 'rgba(255,255,255,0.3)' }));
  const f = Math.floor(t * FPS) % FPS; const s = Math.floor(t);
  h.tc.textContent = `00:${String(s).padStart(2, '0')}:${String(f).padStart(2, '0')} · 120 BPM · Bar ${String(Math.floor(t / 2) + 1).padStart(2, '0')}`;
  Object.assign(h.tc.style, { left: px(bx), top: px(by + 14) });
  winLabelR.textContent = `${String(Math.floor(t / 2) + 1).padStart(2, '0')} / 15`;
}

// ═════════════════════════════════════════════════════════════════════════════
// FRAME
// ═════════════════════════════════════════════════════════════════════════════
let ASM;
function sceneAt(t) { return SCENES.find(s => t >= s.t0 && t < s.t1); }
function camFor(t) {
  const i = SCENES.findIndex(s => t >= s.t0 && t < s.t1);
  if (i < 0) return null;
  const s = SCENES[i];
  if (!s.fromCam) {
    if (i === 0) { const save = cam; assemblyUpdateCamOnly(s.t0); s.fromCam = cam; cam = save; }
    else s.fromCam = camFor(SCENES[i - 1].t1 - 1e-4);
  }
  return s.cam(t, s.fromCam);
}
function assemblyUpdateCamOnly(t) { cam = assemblyCam(ASM, t); }
function assemblyCam(a, t) {
  if (SRC === 'm') {
    const top = { ...fit({ x: 0, y: 0, w: a.v.w, h: 520 }, { pad: 0.03 }), rx: 22, ry: -6, rz: -2 };
    const mid = fit({ x: 0, y: 40, w: a.v.w, h: 520 }, { pad: 0.03 });
    const low = fit({ x: 0, y: a.v.h - 560, w: a.v.w, h: 560 }, { pad: 0.03 });
    return t < 6.0 ? camLerp(top, mid, E.outCubic(prog(t, 5.0, 6.0))) : camLerp(mid, low, E.inOutCubic(prog(t, 6.0, 7.35)));
  }
  const full = fit(a.v, { pad: 0.035 });
  const start = { ...fit(a.v, { pad: 0.035, zm: 1.5, dy: -a.v.h * 0.22 }), rx: 24, ry: -10, rz: -2 };
  return camLerp(start, full, E.outCubic(prog(t, 5.0, 7.3)));
}

function renderAt(t) {
  managed.forEach(e => { e.style.display = 'none'; });
  cursor.style.display = 'none'; ripples.forEach(r => (r.style.display = 'none')); burst.style.display = 'none';
  hook.style.display = 'none'; endc.style.opacity = 1;
  const inProduct = t >= 5.0 && t < 27.0;

  // background
  const gridOn = E.outCubic(prog(t, 4.0, 5.0)) * (1 - prog(t, 26.9, 27.2));
  bgGrid.style.opacity = 0.55 * gridOn;
  bgGrid.style.transform = `translate(${-((t * 18) % 96)}px, ${-((t * 9) % 96)}px)`;
  const streakOn = prog(t, 26.95, 27.4) * 0.55;
  bgStreak.style.opacity = streakOn; bgStreak.style.width = px(F.W * 1.08); bgStreak.style.height = px(F.H * 1.08);
  bgStreak.style.transform = `translate(${-F.W * 0.04}px,${-F.H * 0.04}px) scale(${1 + (t - 27) * 0.015})`;
  bgSpot.style.width = px(Math.max(F.W, F.H * 16 / 9)); bgSpot.style.left = px((F.W - Math.max(F.W, F.H * 16 / 9)) / 2);
  bgSpot.style.opacity = t < 4 ? 0.35 * prog(t, 2.5, 3.2) : t >= 27 ? 0.55 : 0.22;
  grain.style.opacity = t < 4.05 || t >= 27 ? 0.5 : 0;
  grain.style.transform = `translate(${-hash(Math.floor(t * FPS)) * 0.2 * Math.max(F.W, F.H * 16 / 9)}px,${-hash(Math.floor(t * FPS) + 9) * 0.2 * F.H}px)`;

  // hook
  hookUpdate(HOOK, t);

  // window
  const winOn = t >= 5.0 && t < 27.0;
  win.style.display = winOn ? '' : 'none';
  pop.style.display = (t >= 4.4 && t < 27.05) ? '' : 'none';
  if (winOn) {
    const wp = E.outExpo(prog(t, 5.0, 5.5));
    // beat punch on each bar downbeat + clicks
    let punch = 0; const lastBar = Math.floor(t / 2) * 2; punch += 0.014 * Math.exp(-(t - lastBar) * 9);
    const sc = sceneAt(t);
    (sc?.clicks || []).forEach(c => { if (t >= c) punch += 0.008 * Math.exp(-(t - c) * 16); });
    const end = E.inOutQuint(prog(t, 26.3, 26.95));
    win.style.transform = `scale(${(0.94 + 0.06 * wp + punch) * (1 - end * 0.06)})`;
    win.style.opacity = Math.min(1, wp * 1.5) * (1 - end);
    Object.assign(frameLines[0].style, { left: '0px', top: '0px', height: '1px', width: px(S.w * wp) });
    Object.assign(frameLines[1].style, { left: px(S.w * (1 - wp)), top: px(S.h - 1), height: '1px', width: px(S.w * wp) });
    Object.assign(frameLines[2].style, { left: '0px', top: px(S.h * (1 - wp)), width: '1px', height: px(S.h * wp) });
    Object.assign(frameLines[3].style, { left: px(S.w - 1), top: '0px', width: '1px', height: px(S.h * wp) });
    const co = 14;
    [['tl', -co, -co, 'borderTopWidth', 'borderLeftWidth'], ['tr', S.w - 26 + co, -co, 'borderTopWidth', 'borderRightWidth'], ['bl', -co, S.h - 26 + co, 'borderBottomWidth', 'borderLeftWidth'], ['br', S.w - 26 + co, S.h - 26 + co, 'borderBottomWidth', 'borderRightWidth']]
      .forEach(([_, x, y, b1, b2], i) => { const c = corners[i]; c.style.cssText = `left:${x}px;top:${y}px;opacity:${wp}`; c.style[b1] = '3px'; c.style[b2] = '3px'; });
    winLabel.style.opacity = wp; winLabelR.style.opacity = wp;
    stageClip.style.background = '#101013';
  }

  // product content
  assemblyUpdate(ASM, t);
  const sc = sceneAt(t);
  if (t >= 7.55) { const c = camFor(t); if (c) cam = c; }
  if (sc) sc.update(t);

  // camera shake on clicks
  let shx = 0, shy = 0;
  (sc?.clicks || []).forEach((c, i) => { if (t >= c) { const u = t - c; const a = 5 * Math.exp(-u * 20); shx += a * Math.sin(u * 70 + i); shy += a * Math.cos(u * 55 + i); } });
  // motion blur from camera speed
  const prev = t - 1 / FPS;
  let blur = 0;
  if (t >= 7.6 && t < 27) { const pc = camFor(prev) || cam; const d = Math.hypot((cam.cx - pc.cx) * cam.z, (cam.cy - pc.cy) * cam.z) + Math.abs(Math.log(cam.z / pc.z)) * S.w; blur = clamp((d - 18) * 0.07, 0, 7); }
  world.style.filter = blur > 0.3 ? `blur(${blur.toFixed(2)}px)` : '';
  world.style.transform = `translate(${S.w / 2 + shx}px,${S.h / 2 + shy}px) rotateX(${cam.rx}deg) rotateY(${cam.ry}deg) rotate(${cam.rz}deg) scale(${cam.z}) translate(${-cam.cx}px,${-cam.cy}px)`;

  // cursor + click FX
  if (sc && sc.cursor) {
    const p = cursorPath(sc.cursor, t);
    if (p) {
      vis(cursor);
      let press = 1; (sc.clicks || []).forEach(c => { if (t >= c - 0.04 && t < c + 0.12) press = 0.82; });
      cursor.style.transform = `translate(${p[0]}px,${p[1]}px) scale(${(F.cur / 24) / cam.z * press})`;
    }
    (sc.clicks || []).forEach((c, i) => {
      const u = t - c; if (u < 0 || u > 0.45) return;
      const r = ripples[i % 3]; const at = cursorPath(sc.cursor, c) || [0, 0];
      vis(r); const size = 34 + E.outCubic(u / 0.45) * 90;
      Object.assign(r.style, { width: px(size), height: px(size), left: px(at[0] - size / 2), top: px(at[1] - size / 2), opacity: 1 - u / 0.45, transform: `scale(${1 / cam.z})`, borderWidth: px(4 - u * 5) });
    });
    if (sc.burst) {
      const [tb, at] = sc.burst; const u = t - tb;
      if (u >= 0 && u < 0.4) {
        vis(burst); burst.style.transform = `translate(${at[0]}px,${at[1]}px) scale(${1 / cam.z})`;
        rays.forEach((ray, i) => {
          const ang = (i / rays.length) * 360 + 8; const q = E.outExpo(u / 0.4);
          ray.style.width = px(20 + 26 * (1 - q)); ray.style.opacity = 1 - u / 0.4;
          ray.style.transform = `rotate(${ang}deg) translateX(${30 + q * 60}px)`;
        });
      }
    }
  }

  // captions
  SCENES.forEach(s => { if (s.cap) animCaption(s.cap, t, s.capIn, s.capOut); });

  // HUD / end card
  hudUpdate(HUD, t);
  endUpdate(ENDC, t);

  // transitions: flashes + slashes
  let fl = 0;
  [[4.0, 0.9, 0.2], [27.0, 1.0, 0.3], [23.5, 0.55, 0.16], [10.5, 0.25, 0.12]].forEach(([tf, a, d]) => { if (t >= tf && t < tf + d) fl = Math.max(fl, a * (1 - (t - tf) / d)); });
  flash.style.opacity = fl;
  vis(slash, false);
  [[13.5, 1], [21.0, -1]].forEach(([ts, dir]) => {
    const p = prog(t, ts - 0.16, ts + 0.16);
    if (p > 0 && p < 1) {
      vis(slash);
      const x = lerp(-F.W * 0.9, F.W * 1.2, E.inOutQuint(p));
      slash.style.transform = `translateX(${dir > 0 ? x : F.W - x - F.W * 0.7}px) skewX(-18deg)`;
      slashEdge.style.left = dir > 0 ? 'auto' : '0'; slashEdge.style.right = dir > 0 ? '0' : 'auto';
    }
  });
}

// ── SFX that are not tied to clicks ──────────────────────────────────────────
function timelineSfx() {
  [0, 0.5, 1.0, 1.5, 2.0].forEach((t, i) => sfx(t, 'hit', { i }));
  sfx(2.5, 'slam'); sfx(2.75, 'slam');
  [3.0, 3.0625, 3.125, 3.1875].forEach(t => sfx(t, 'tick'));
  sfx(3.0, 'riser', { len: 1.0 });
  sfx(4.0, 'boom'); sfx(4.5, 'pop');
  const n = ASM.pieces.length, step = Math.min(0.17, 1.55 / n);
  for (let i = 0; i < n; i++) sfx(5.25 + i * step, 'piece', { i });
  sfx(7.55, 'whip'); sfx(10.4, 'whip'); sfx(13.4, 'slash'); sfx(20.9, 'slash'); sfx(23.45, 'whip');
  sfx(27.0, 'impact');
  [27.25, 27.5, 27.75, 28.0].forEach(t => sfx(t, 'slam'));
  SFX.sort((a, b) => a.t - b.t);
}

window.READY = (async () => {
  await loadAll();
  HOOK = buildHook();
  vis(hook); HOOK.W.forEach(o => vis(o.d)); HOOK.lines.forEach(l => vis(l.d)); hookMeasure(HOOK); vis(hook, false);
  ASM = buildAssembly();
  buildScenes();
  ENDC = buildEnd();
  HUD = buildHud();
  SCENES.forEach(s => s.cap && (vis(s.cap.box), placeCaption(s.cap), vis(s.cap.box, false)));
  vis(ASM.cap.box); placeCaption(ASM.cap); vis(ASM.cap.box, false);
  timelineSfx();
  window.SFX = SFX;
  window.SCENE_TIMES = SCENES.map(s => ({ id: s.id, t0: s.t0, t1: s.t1 }));
  renderAt(Number(Q.get('t') || 0));
  return true;
})();
window.renderAt = renderAt;
