/*
 * Esportra Scrims reel: one deterministic timeline, three formats.
 * window.renderFrame(t) sets every element for time t (seconds). The UI is the
 * real captured product (assets/screens); layout zones adapt per format.
 */
(async function main() {
  const Q = new URLSearchParams(location.search);
  const FMT = Q.get('fmt') || '9x16';
  const SIZES = { '9x16': [1080, 1920], '1x1': [1080, 1080], '16x9': [1920, 1080] };
  const [W, H] = SIZES[FMT];
  const PORTRAIT = FMT === '9x16';
  const SQUARE = FMT === '1x1';
  const LAND = FMT === '16x9';
  const CAPW = LAND ? 1440 : 540;
  const SMAX = LAND ? 1.6 : 1.95;

  const frame = document.getElementById('frame');
  frame.style.width = `${W}px`;
  frame.style.height = `${H}px`;

  const getJSON = async (u) => (await fetch(u)).json();
  const getText = async (u) => (await fetch(u)).text();
  const TL = await getJSON('./timeline.json');
  const MAN = (await getJSON('/assets/screens/manifest.json'))[CAPW];
  const MARK = await getText('/assets/logo/esportra-mark.svg');
  const WORDMARK = await getText('/assets/logo/esportra-wordmark.svg');
  await Promise.all(['900 100px Poppins', '800 100px Poppins', '600 20px "JetBrains Mono"', '500 20px Inter', '700 20px Inter'].map((f) => document.fonts.load(f)));

  // ------------------------------------------------------------------ math
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, x) => a + (b - a) * x;
  const prog = (t, a, b) => clamp((t - a) / (b - a));
  const E = {
    lin: (x) => x,
    outCubic: (x) => 1 - (1 - x) ** 3,
    inCubic: (x) => x ** 3,
    inOutCubic: (x) => (x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2),
    outExpo: (x) => (x >= 1 ? 1 : 1 - 2 ** (-10 * x)),
    inExpo: (x) => (x <= 0 ? 0 : 2 ** (10 * x - 10)),
    inOutExpo: (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x < 0.5 ? 2 ** (20 * x - 10) / 2 : (2 - 2 ** (-20 * x + 10)) / 2),
    outBack: (x) => 1 + 2.70158 * (x - 1) ** 3 + 1.70158 * (x - 1) ** 2,
    outQuint: (x) => 1 - (1 - x) ** 5,
  };
  const tw = (t, a, b, from, to, ease = E.outExpo) => lerp(from, to, ease(prog(t, a, b)));
  const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const decay = (t, at, k) => (t < at ? 0 : Math.exp(-(t - at) / k));

  // ------------------------------------------------------------------ dom
  function el(tag, cls, parent, css) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (css) Object.assign(e.style, css);
    (parent || frame).appendChild(e);
    return e;
  }
  const show = (e, on) => { e.style.display = on ? '' : 'none'; };

  // Zones: where the feature word and the UI sit in each format.
  const Z = {
    '9x16': { word: { x: 84, y: 200, w: 912, h: 300 }, ui: { x: 54, y: 630, w: 972, h: 1140 }, pad: 64 },
    '1x1': { word: { x: 72, y: 96, w: 936, h: 186 }, ui: { x: 70, y: 346, w: 940, h: 672 }, pad: 46 },
    '16x9': { word: { x: 118, y: 300, w: 600, h: 480 }, ui: { x: 790, y: 96, w: 1050, h: 888 }, pad: 54 },
  }[FMT];
  const UIC = { x: Z.ui.x + Z.ui.w / 2, y: Z.ui.y + Z.ui.h / 2 };

  const box = (key, name) => MAN[key].boxes[name];
  const center = (b) => [b.x + b.w / 2, b.y + b.h / 2];

  // ------------------------------------------------------------------ layers
  const bg = el('div', 'layer');
  const grid = el('div', 'grid', bg);
  const spot = el('div', 'layer', bg);
  const shards = el('div', 'layer', bg, {
    backgroundImage: `url(/assets/textures/${PORTRAIT ? 'streak-shards-portrait' : 'streak-shards'}.png)`,
    backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0,
  });
  const world = el('div', 'layer');
  const words = el('div', 'layer');
  const hud = el('div', 'layer');
  const cursorLayer = el('div', 'layer');
  const fx = el('div', 'layer', null, { pointerEvents: 'none' });
  const flashEl = el('div', 'layer', fx, { background: '#fff', opacity: 0 });
  const grain = el('div', 'layer', fx, { backgroundImage: 'url(/assets/textures/grain.png)', backgroundSize: '960px 540px', opacity: 0.35, mixBlendMode: 'screen' });
  el('div', 'layer', fx, { background: 'radial-gradient(ellipse at 50% 45%, transparent 55%, rgba(0,0,0,0.55) 100%)' });

  // ------------------------------------------------------------------ panels
  class Panel {
    constructor(parent, keys, rect, opt = {}) {
      this.keys = keys;
      this.rect = { ...rect };
      this.el = el('div', 'panel', parent);
      if (opt.flat) this.el.style.boxShadow = 'none';
      this.imgs = {};
      keys.forEach((k) => {
        const m = MAN[k];
        if (!m) throw new Error(`missing capture ${k}`);
        const im = el('img', '', this.el, { width: `${m.width}px`, height: `${m.height}px` });
        im.src = `/assets/screens/${m.file}`;
        this.imgs[k] = im;
      });
      this.x = 0; this.y = 0; this.s = 1;
      this.applyRect();
    }
    applyRect() {
      const r = this.rect;
      this.el.style.width = `${r.w}px`;
      this.el.style.height = `${r.h}px`;
      Object.values(this.imgs).forEach((im) => { im.style.left = `${-r.x}px`; im.style.top = `${-r.y}px`; });
    }
    set(o) {
      if (o.rect) { this.rect = { ...o.rect }; this.applyRect(); }
      const r = this.rect;
      this.x = o.x; this.y = o.y; this.s = o.s ?? 1;
      const op = o.op ?? 1;
      this.el.style.display = op <= 0.002 ? 'none' : 'block';
      this.el.style.transform = `translate(${o.x - r.w / 2}px, ${o.y - r.h / 2}px) perspective(2000px) rotateX(${o.rx || 0}deg) rotateY(${o.ry || 0}deg) rotate(${o.rot || 0}deg) scale(${this.s})`;
      this.el.style.opacity = op;
      this.el.style.filter = o.blur > 0.3 ? `blur(${o.blur}px)` : 'none';
      if (o.mix) this.keys.forEach((k) => { this.imgs[k].style.opacity = o.mix[k] ?? 0; });
    }
    map(px, py) {
      const r = this.rect;
      return [this.x + this.s * (px - (r.x + r.w / 2)), this.y + this.s * (py - (r.y + r.h / 2))];
    }
  }

  /** Layered state images: the state shown from each time, the newer one fading in on top. */
  function mixAt(t, seq, fade = 0.06) {
    const out = {};
    seq.forEach(([ts, k], i) => {
      const next = seq[i + 1];
      const gone = next && t >= next[0] + fade;
      out[k] = gone ? 0 : i === 0 ? 1 : prog(t, ts, ts + fade);
    });
    return out;
  }

  /** Fit a vertical stack of rects into a zone; returns frame centre + scale per rect. */
  function stack(rects, zone, gap = 26, sMax = SMAX) {
    // Each panel fits the zone width on its own (a wide header does not shrink the panel under it).
    let ss = rects.map((r) => Math.min(sMax, zone.w / r.w));
    const tot = rects.reduce((a, r, i) => a + r.h * ss[i], 0);
    const room = zone.h - gap * (rects.length - 1);
    if (tot > room) ss = ss.map((v) => (v * room) / tot);
    const used = rects.reduce((a, r, i) => a + r.h * ss[i], 0) + gap * (rects.length - 1);
    let y = zone.y + (zone.h - used) / 2;
    return rects.map((r, i) => {
      const o = { x: zone.x + zone.w / 2, y: y + (r.h * ss[i]) / 2, s: ss[i] };
      y += r.h * ss[i] + gap;
      return o;
    });
  }

  // ------------------------------------------------------------------ cursor
  const CUR_SIZE = LAND ? 40 : 48;
  const cursor = el('div', 'cursor', cursorLayer, { width: `${CUR_SIZE}px`, height: `${CUR_SIZE}px` });
  cursor.innerHTML = '<svg viewBox="0 0 24 24" width="100%" height="100%"><path d="M4 2.5 L4 19.5 L8.6 15.4 L11.6 22 L14.6 20.7 L11.7 14.2 L18 14.2 Z" fill="#FAFAFA" stroke="#09090B" stroke-width="1.4" stroke-linejoin="round"/></svg>';
  const rings = [0, 1].map(() => el('div', 'ring', cursorLayer, { width: '120px', height: '120px', opacity: 0 }));
  let cursorOn = false;

  function setCursor(x, y, op, press = 0) {
    cursorOn = op > 0.01;
    cursor.style.display = cursorOn ? 'block' : 'none';
    cursor.style.opacity = op;
    cursor.style.transform = `translate(${x - CUR_SIZE * 0.17}px, ${y - CUR_SIZE * 0.1}px) scale(${1 - 0.18 * press})`;
  }
  function pressAt(t, tc) { return clamp(1 - Math.abs(t - tc) / 0.07); }
  function ringAt(i, t, tc, x, y, tint = 'rgba(255,255,255,0.9)') {
    const p = prog(t, tc, tc + 0.42);
    const r = rings[i];
    if (t < tc || p >= 1) return;
    r.style.borderColor = tint;
    r.style.opacity = (1 - p) * 0.9;
    r.style.transform = `translate(${x - 60}px, ${y - 60}px) scale(${0.15 + E.outCubic(p) * 0.9})`;
  }
  /** Eased travel with a slight arc from A to B. */
  function travel(t, t0, t1, A, B, bend = 0.12) {
    const p = E.inOutCubic(prog(t, t0, t1));
    const mx = (A[0] + B[0]) / 2 - (B[1] - A[1]) * bend;
    const my = (A[1] + B[1]) / 2 + (B[0] - A[0]) * bend;
    const u = 1 - p;
    return [u * u * A[0] + 2 * u * p * mx + p * p * B[0], u * u * A[1] + 2 * u * p * my + p * p * B[1]];
  }

  // ------------------------------------------------------------------ type helpers
  const measureCtx = document.createElement('canvas').getContext('2d');
  function textWidth(text, font) { measureCtx.font = font; return measureCtx.measureText(text).width; }
  /** Poppins 900 caps size so `text` spans `w` px (letter-spacing -0.035em). */
  function fitSize(text, w, max) {
    const raw = textWidth(text.toUpperCase(), '900 100px Poppins') - 3.5 * (text.length - 1);
    return Math.min(max, (100 * w) / raw);
  }

  function splitChars(parent, text) {
    return [...text].map((c) => {
      const s = el('span', 'char', parent);
      s.textContent = c === ' ' ? ' ' : c;
      return s;
    });
  }

  // ------------------------------------------------------------------ background + fx state
  const STEPS = Object.values(TL.screens).flatMap((sc) => sc[String(CAPW)] || sc['*']);
  const IMPACTS = [{ t: TL.hook.drop, big: true }, { t: 38.0, big: true }, ...STEPS.filter((st) => st.sfx === 'impact').map((st) => ({ t: st.t, big: false }))];
  const WORD_HITS = TL.hook.words;
  const CLICKS = STEPS.filter((st) => st.click).map((st) => st.t);

  function shakeAt(t) {
    let x = 0; let y = 0;
    const add = (at, amp, k) => {
      const d = decay(t, at, k);
      if (!d) return;
      x += amp * d * Math.sin((t - at) * 90 + at * 7);
      y += amp * d * Math.cos((t - at) * 77 + at * 3);
    };
    IMPACTS.forEach((i) => add(i.t, i.big ? 26 : 12, 0.14));
    WORD_HITS.forEach((w) => add(w, 14, 0.09));
    CLICKS.forEach((c) => add(c, 3, 0.06));
    return [x, y];
  }
  function flashAt(t) {
    let f = 0;
    IMPACTS.forEach((i) => { f += (i.big ? 0.85 : 0.25) * decay(t, i.t, i.big ? 0.07 : 0.05); });
    WORD_HITS.forEach((w) => { f += 0.1 * decay(t, w, 0.05); });
    return clamp(f);
  }

  // ------------------------------------------------------------------ HUD (broadcast chrome)
  const HUD_H = LAND ? 34 : 38;
  const hudLogo = el('div', 'abs', hud, { height: `${HUD_H}px`, display: 'flex', alignItems: 'center', gap: '14px' });
  const hudMark = el('div', '', hudLogo, { height: `${HUD_H}px`, width: `${HUD_H * 1.06}px` });
  hudMark.innerHTML = MARK;
  const hudWord = el('div', '', hudLogo, { height: `${HUD_H * 0.42}px`, width: `${HUD_H * 0.42 * 8.6}px` });
  hudWord.innerHTML = WORDMARK;
  const hudTag = el('div', 'mono', hudLogo, { fontSize: `${LAND ? 15 : 17}px`, color: '#A1A1AA', paddingLeft: '14px', borderLeft: '1px solid rgba(255,255,255,0.18)', lineHeight: '1' });
  hudTag.textContent = 'Scrims';
  [hudMark, hudWord].forEach((d) => { const s = d.querySelector('svg'); s.style.width = '100%'; s.style.height = '100%'; s.style.display = 'block'; });
  hudLogo.style.transform = `translate(${Z.pad}px, ${Z.pad - 4}px)`;

  const hudTime = el('div', 'mono abs', hud, { fontSize: `${LAND ? 15 : 17}px`, color: '#A1A1AA', display: 'flex', alignItems: 'center', gap: '12px', letterSpacing: '0.18em' });
  const hudDot = el('span', '', hudTime, { width: '10px', height: '10px', borderRadius: '50%', background: 'var(--rose)', display: 'inline-block' });
  const hudTC = el('span', '', hudTime);

  const FEATURES = TL.beats.filter((b) => !['hook', 'reveal', 'outro'].includes(b.id));
  const hudBar = el('div', 'abs', hud, { display: 'flex', gap: `${LAND ? 10 : 8}px` });
  const SEG_W = LAND ? 132 : 112;
  const segs = FEATURES.map((b) => {
    const seg = el('div', '', hudBar, { width: `${SEG_W}px` });
    const track = el('div', '', seg, { height: '3px', background: 'rgba(255,255,255,0.12)', position: 'relative', overflow: 'hidden' });
    const fill = el('div', '', track, { position: 'absolute', inset: '0', background: '#FAFAFA', transformOrigin: '0 50%', transform: 'scaleX(0)' });
    const lab = el('div', 'mono', seg, { fontSize: `${LAND ? 12 : 13}px`, color: '#71717A', marginTop: '10px', letterSpacing: '0.16em', whiteSpace: 'nowrap', display: SQUARE ? 'none' : 'block' });
    lab.textContent = b.label.replace('Agree a time', 'Agree').replace('Map veto', 'Veto');
    return { b, fill, lab };
  });
  const barW = FEATURES.length * SEG_W + (FEATURES.length - 1) * (LAND ? 10 : 8);
  hudBar.style.transform = `translate(${(W - barW) / 2}px, ${H - Z.pad - (SQUARE ? 6 : 26)}px)`;

  function updateHud(t) {
    const on = prog(t, 2.55, 2.8) * (1 - prog(t, 37.85, 38.05));
    hud.style.opacity = on;
    show(hud, on > 0.001);
    if (on <= 0.001) return;
    const f = Math.floor(t * 60);
    const ss = String(Math.floor(f / 60)).padStart(2, '0');
    const ff = String(f % 60).padStart(2, '0');
    hudTC.textContent = `Scrim night · 00:00:${ss}:${ff}`;
    const tcW = hudTime.getBoundingClientRect().width || 420;
    hudTime.style.transform = `translate(${W - Z.pad - tcW}px, ${Z.pad + 6}px)`;
    hudDot.style.opacity = Math.floor(t * 2) % 2 ? 0.35 : 1;
    segs.forEach(({ b, fill, lab }) => {
      const p = prog(t, b.start, b.end);
      fill.style.transform = `scaleX(${p})`;
      fill.style.background = t >= b.start && t < b.end ? '#F43F5E' : '#FAFAFA';
      lab.style.color = t >= b.start && t < b.end ? '#FAFAFA' : p >= 1 ? '#A1A1AA' : '#52525B';
    });
  }

  // ------------------------------------------------------------------ HOOK (0-2s): the problem in five words
  const hook = el('div', 'layer', world);
  const HOOK_LINES = PORTRAIT
    ? [['DM'], ['SPAM.'], ['NO-SHOWS.'], ['ZERO'], ['DATA.']]
    : SQUARE ? [['DM', 'SPAM.'], ['NO-SHOWS.'], ['ZERO'], ['DATA.']]
      : [['DM', 'SPAM.'], ['NO-SHOWS.'], ['ZERO', 'DATA.']];
  const HOOK_W = PORTRAIT ? 930 : SQUARE ? 920 : 1560;
  const HOOK_MAX = PORTRAIT ? 330 : SQUARE ? 240 : 290;
  const hookWords = {};
  {
    const sizes = HOOK_LINES.map((ws) => fitSize(ws.join(' '), HOOK_W, HOOK_MAX));
    const lh = sizes.map((s) => s * 0.9);
    const total = lh.reduce((a, b) => a + b, 0);
    let y = (H - total) / 2;
    HOOK_LINES.forEach((ws, i) => {
      const line = el('div', 'line display', hook, { fontSize: `${sizes[i]}px`, height: `${lh[i]}px`, lineHeight: `${lh[i]}px`, top: `${y}px`, left: `${(W - HOOK_W) / 2}px`, width: `${HOOK_W}px`, display: 'flex', justifyContent: 'space-between' });
      ws.forEach((w) => {
        const span = el('span', 'word', line);
        span.textContent = w;
        hookWords[w] = { span, size: sizes[i], line, y, h: lh[i] };
      });
      y += lh[i];
    });
  }
  // Echoes behind SPAM. (the inbox filling up), a rose strike through NO-SHOWS.
  const spam = hookWords['SPAM.'];
  const spamEchoes = [1, 2, 3, 4, 5, 6].map((k) => {
    const e = el('div', 'display outline abs', hook, { fontSize: `${spam.size}px`, lineHeight: '0.9', WebkitTextStrokeWidth: '2px', opacity: 0 });
    e.textContent = 'SPAM.';
    return { e, k };
  });
  const strike = el('div', 'abs', hook, { height: `${Math.max(8, hookWords['NO-SHOWS.'].size * 0.075)}px`, background: 'var(--rose)', transformOrigin: '0 50%' });
  const noshowChars = (() => { const sp = hookWords['NO-SHOWS.'].span; sp.textContent = ''; return splitChars(sp, 'NO-SHOWS.'); })();
  hookWords['DATA.'].span.classList.add('outline');
  hookWords['DATA.'].span.style.webkitTextStrokeWidth = `${Math.max(3, hookWords['DATA.'].size * 0.022)}px`;
  const glitchBands = [0, 1, 2, 3, 4].map(() => el('div', 'abs', hook, { left: 0, width: `${W}px`, background: 'rgba(250,250,250,0.9)', mixBlendMode: 'difference', opacity: 0 }));

  function slam(t, at, span, from = 1.9) {
    const p = prog(t, at, at + 0.16);
    const e = E.outExpo(p);
    span.style.opacity = t < at ? 0 : clamp((t - at) / 0.03);
    span.style.transform = `scale(${lerp(from, 1, e)})`;
    span.style.filter = p < 1 ? `blur(${(1 - e) * 16}px)` : 'none';
  }

  function updateHook(t) {
    const on = t < 2.02;
    show(hook, on);
    if (!on) return;
    const [d0, d1, d2, d3, d4] = WORD_HITS;
    slam(t, d0, hookWords.DM.span, 2.2);
    // SPAM. slides in hard from the right
    {
      const s = hookWords['SPAM.'].span;
      const p = E.outExpo(prog(t, d1, d1 + 0.18));
      s.style.opacity = t < d1 ? 0 : 1;
      s.style.transform = `translateX(${(1 - p) * W * 0.8}px) skewX(${(1 - p) * -18}deg)`;
      s.style.filter = p < 1 ? `blur(${(1 - p) * 18}px)` : 'none';
      const r = s.getBoundingClientRect();
      const fr = frame.getBoundingClientRect();
      spamEchoes.forEach(({ e, k }) => {
        const a = d1 + 0.05 + k * 0.035;
        const life = prog(t, a, a + 0.3);
        e.style.opacity = t < a || life >= 1 ? 0 : (1 - life) * 0.55;
        const dir = PORTRAIT ? 1 : (k % 2 ? 1 : -1);
        e.style.transform = `translate(${r.left - fr.left + (PORTRAIT ? (k % 2 ? 1 : -1) * k * 22 : 0)}px, ${r.top - fr.top + dir * k * spam.h * (PORTRAIT ? 0.32 : 0.42)}px)`;
      });
    }
    // NO-SHOWS. drops in, then its letters stop showing up and a rose line strikes it
    {
      const s = hookWords['NO-SHOWS.'].span;
      const p = prog(t, d2, d2 + 0.26);
      s.style.opacity = t < d2 ? 0 : 1;
      s.style.transform = `translateY(${(1 - E.outBack(p)) * -hookWords['NO-SHOWS.'].h * 1.1}px)`;
      noshowChars.forEach((c, i) => {
        const gone = t > d2 + 0.2 + hash(i * 3.7) * 0.22 && hash(i * 9.1) > 0.45;
        const flick = t > d2 + 0.18 && t < d2 + 0.48 && hash(Math.floor(t * 30) + i) > 0.7;
        c.style.opacity = gone ? 0.12 : flick ? 0.3 : 1;
      });
      const r = s.getBoundingClientRect();
      const fr = frame.getBoundingClientRect();
      const sp = E.outExpo(prog(t, d2 + 0.24, d2 + 0.4));
      strike.style.width = `${r.width + 30}px`;
      strike.style.opacity = t < d2 + 0.24 ? 0 : 1;
      strike.style.transform = `translate(${r.left - fr.left - 15}px, ${r.top - fr.top + r.height * 0.52}px) scaleX(${sp})`;
    }
    slam(t, d3, hookWords.ZERO.span, 0.55);
    {
      const s = hookWords['DATA.'].span;
      const p = E.outExpo(prog(t, d4, d4 + 0.2));
      s.style.opacity = t < d4 ? 0 : 1;
      s.style.transform = `translateY(${(1 - p) * hookWords['DATA.'].h * 0.9}px)`;
    }
    // Glitch tear into the drop
    const g = prog(t, 1.86, 2.0);
    const fi = Math.floor(t * 60);
    glitchBands.forEach((b, i) => {
      const on2 = g > 0 && hash(fi * 13 + i) > 0.35;
      b.style.opacity = on2 ? 1 : 0;
      b.style.top = `${hash(fi * 7 + i * 3) * H}px`;
      b.style.height = `${4 + hash(fi * 5 + i) * 60}px`;
    });
    hook.style.transform = g > 0 ? `translateX(${(hash(fi) - 0.5) * 60 * g}px) scale(${1 + g * 0.08})` : 'none';
    hook.style.opacity = 1 - prog(t, 1.97, 2.0);
  }

  // ------------------------------------------------------------------ REVEAL (2-6s): the discovery page builds itself
  const page = el('div', 'layer', world, { transformOrigin: '50% 50%' });
  const D = 'discovery-base';
  const TICKS = TL.reveal.ticks;
  const PIECES = LAND
    ? [
      ['title', { x: 0, y: 16, w: 760, h: 84 }, [-700, 0]], ['my', box(D, 'myScrims'), [500, -200]],
      ['aside', { x: 24, y: 120, w: 256, h: 270 }, [-600, 120]], ['up', box(D, 'upNext'), [0, -520]],
      ['count', box(D, 'count'), [-400, 0]], ['card0', box(D, 'card0'), [0, 700]], ['card1', box(D, 'card1'), [0, 800]],
      ['card2', box(D, 'card2'), [600, 600]], ['card3', box(D, 'card3'), [-600, 600]], ['card4', box(D, 'card4'), [0, 800]],
      ['card5', box(D, 'card5'), [700, 500]],
    ]
    : [
      ['title', { x: 0, y: 16, w: 540, h: 80 }, [-640, 0]], ['my', box(D, 'myScrims'), [640, 0]],
      ['up', box(D, 'upNext'), [0, -700]], ['count', { x: 0, y: 424, w: 540, h: 104 }, [-640, 0]],
      ['card0', box(D, 'card0'), [0, 900]], ['card1', box(D, 'card1'), [640, 500]], ['card2', box(D, 'card2'), [-640, 500]],
    ];
  const pieces = PIECES.map(([id, rect, from], i) => {
    const at = LAND ? TICKS[0] + i * ((TICKS[TICKS.length - 1] - TICKS[0]) / (PIECES.length - 1)) : TICKS[Math.min(i, TICKS.length - 1)];
    const p = new Panel(page, [D], rect, { flat: !id.startsWith('card') && id !== 'up' });
    return { id, rect, at, from, p, i };
  });
  const PAGE_VIEW = LAND ? { s: 1.24, cx: 720, cy: 520, fx: W / 2, fy: H / 2 + 20 }
    : PORTRAIT ? { s: 1.78, cx: 270, cy: 360, fx: W / 2, fy: H / 2 + 60 }
      : { s: 1.62, cx: 270, cy: 300, fx: W / 2, fy: H / 2 + 40 };

  function updateReveal(t) {
    const on = t >= 2.8 && t < 6.1;
    show(page, on);
    if (!on) return;
    const cam = PAGE_VIEW;
    const tilt = 1 - E.inOutCubic(prog(t, 2.9, 5.5));
    const out = E.inExpo(prog(t, 5.8, 6.05));
    page.style.transform = `perspective(2400px) rotateX(${tilt * 32}deg) rotateZ(${tilt * -9}deg) scale(${(1 - tilt * 0.12) * (1 + out * 0.6)})`;
    page.style.opacity = 1 - out;
    page.style.filter = out > 0.02 ? `blur(${out * 24}px)` : 'none';
    pieces.forEach(({ id, rect, at, from, p, i }) => {
      const [rx, ry] = center(rect);
      const e = prog(t, at, at + 0.42);
      const ee = E.outExpo(e);
      const isCard = id.startsWith('card');
      p.set({
        x: cam.fx + cam.s * (rx - cam.cx) + from[0] * (1 - ee), y: cam.fy + cam.s * (ry - cam.cy) + from[1] * (1 - ee),
        s: cam.s * (isCard ? lerp(0.8, 1, E.outBack(e)) : 1), rot: (1 - ee) * (i % 2 ? 7 : -7), rx: isCard ? (1 - ee) * 60 : 0,
        op: t < at ? 0 : clamp((t - at) / 0.06), blur: (1 - ee) * 14, mix: { [D]: 1 },
      });
    });
  }

  // ------------------------------------------------------------------ SCREENS (6-38s): one real interaction per beat
  const MAN_KEYS = Object.keys(MAN);
  function boxOf(key, name) {
    const hit = MAN[key] && MAN[key].boxes[name];
    if (hit) return hit;
    const pre = key.split('-')[0];
    const i = MAN_KEYS.indexOf(key);
    for (let j = i; j >= 0; j -= 1) if (MAN_KEYS[j].startsWith(pre) && MAN[MAN_KEYS[j]].boxes[name]) return MAN[MAN_KEYS[j]].boxes[name];
    for (let j = i; j < MAN_KEYS.length; j += 1) if (MAN_KEYS[j].startsWith(pre) && MAN[MAN_KEYS[j]].boxes[name]) return MAN[MAN_KEYS[j]].boxes[name];
    throw new Error(`no box "${name}" near ${key}`);
  }
  /** Camera spec [names, pad, maxH, dy, minW, top] -> a rect in capture px. */
  function camRect(spec, key) {
    const [names, pad = 0, maxH = null, dy = 0, minW = null, top = 0, maxW = null] = spec;
    const bs = names.map((n) => boxOf(key, n));
    let x0 = Math.min(...bs.map((b) => b.x)) - pad;
    let x1 = Math.max(...bs.map((b) => b.x + b.w)) + pad;
    let y0 = Math.min(...bs.map((b) => b.y)) - pad - top;
    let y1 = Math.max(...bs.map((b) => b.y + b.h)) + pad;
    if (maxW && x1 - x0 > maxW) { const c = (x0 + x1) / 2; x0 = c - maxW / 2; x1 = c + maxW / 2; }
    if (minW && x1 - x0 < minW) { const c = (x0 + x1) / 2; x0 = c - minW / 2; x1 = c + minW / 2; }
    const shift = x0 < 0 ? -x0 : x1 > CAPW ? CAPW - x1 : 0;
    x0 += shift; x1 += shift;
    if (maxH) {
      if (y1 - y0 < maxH) { const c = (y0 + y1) / 2; y0 = c - maxH / 2; y1 = c + maxH / 2; } else y1 = y0 + maxH;
    }
    return { x: x0, y: y0 + dy, w: x1 - x0, h: y1 - y0 };
  }

  const STYLES = ['left', 'up', 'right', 'down'];
  const SCREEN_IDS = Object.keys(TL.screens);
  const screens = SCREEN_IDS.map((id, n) => {
    const beat = TL.beats.find((b) => b.id === id);
    const steps = TL.screens[id][String(CAPW)] || TL.screens[id]['*'];
    const g = el('div', 'layer', world);
    let cur = steps[0].state;
    const states = []; const cams = []; const targets = []; const clicks = [];
    let lastTarget = null;
    steps.forEach((st) => {
      if (st.state) { cur = st.state; if (!states.find((s) => s[1] === cur)) states.push([st.t, cur]); else states.push([st.t, cur]); }
      const camSpec = st[`cam${CAPW}`] || st.cam;
      if (camSpec) cams.push([st.t, camRect(camSpec, cur)]);
      if (st.cursor) {
        // Targets come from the state on screen before this step's own change.
        const prevState = [...states].reverse().find((s) => s[0] < st.t || (s[0] === st.t && !st.state))?.[1] ?? cur;
        const keyFor = st.state && st.click ? prevState : (st.state || prevState);
        lastTarget = { t: st.t, pt: center(boxOf(keyFor, st.cursor)), click: !!st.click };
        targets.push(lastTarget);
      } else if (st.click && lastTarget) {
        clicks.push({ t: st.t, pt: lastTarget.pt });
      }
      if (st.click && st.cursor) clicks.push({ t: st.t, pt: lastTarget.pt });
    });
    // Panel image stack in first-seen order; later states fade in over earlier ones.
    const keys = [];
    states.forEach(([, k]) => { if (!keys.includes(k)) keys.push(k); });
    const seq = []; states.forEach(([ts, k]) => { if (!seq.length || seq[seq.length - 1][1] !== k) seq.push([ts, k]); });
    const panel = new Panel(g, keys, cams[0][1]);
    return { id, beat, g, panel, seq, cams, targets, clicks, style: STYLES[n % 4], keys };
  });

  function camAt(S, t) {
    let r = S.cams[0][1];
    for (let i = 1; i < S.cams.length; i += 1) {
      const [ts, nr] = S.cams[i];
      const p = E.inOutExpo(prog(t, ts - 0.04, ts + 0.42));
      if (p <= 0) break;
      r = { x: lerp(r.x, nr.x, p), y: lerp(r.y, nr.y, p), w: lerp(r.w, nr.w, p), h: lerp(r.h, nr.h, p) };
    }
    return r;
  }

  function updateScreen(t, S) {
    const b = S.beat;
    const on = t >= b.start - 0.08 && t < b.end + 0.08;
    show(S.g, on);
    if (!on) return;
    const ee = enterExit(t, b, S.style);
    const r = camAt(S, t);
    const s = Math.min(SMAX, Z.ui.w / r.w, Z.ui.h / r.h);
    const breathe = 1 + 0.015 * Math.sin((t - b.start) * 1.7);
    const hold = S.id === 'insights' ? lerp(0.1, 1, prog(t, 34.42, 34.6)) : 1;
    S.panel.set({
      rect: r, x: UIC.x + ee.dx, y: UIC.y + ee.dy, s: s * breathe * lerp(0.9, 1, ee.e), rx: (1 - ee.e) * 24,
      op: clamp(prog(t, b.start - 0.06, b.start + 0.06)) * hold, blur: ee.blur, mix: mixAt(t, S.seq),
    });
    // Cursor: travels target to target, pressing on the clicks.
    if (S.targets.length) {
      const first = S.targets[0];
      const entry = S.style === 'left' ? [W + 60, H * 0.85] : S.style === 'right' ? [-60, H * 0.85] : [W * 0.85, H + 60];
      let pos = entry;
      let prevT = b.start + 0.2;
      for (const tg of S.targets) {
        const dest = S.panel.map(tg.pt[0], tg.pt[1]);
        const t0 = Math.max(prevT + 0.05, tg.t - 0.5);
        if (t < t0) break;
        pos = travel(t, t0, tg.t - 0.06, pos, dest, 0.12);
        prevT = tg.t;
      }
      void first;
      const press = Math.max(0, ...S.clicks.map((c) => pressAt(t, c.t)));
      const fade = prog(t, b.start + 0.15, b.start + 0.3) * (1 - prog(t, b.end - 0.18, b.end - 0.04));
      setCursor(pos[0], pos[1], fade, press);
      S.clicks.forEach((c, i) => { const [x, y] = S.panel.map(c.pt[0], c.pt[1]); ringAt(i % 2, t, c.t, x, y); });
    }
  }

  function enterExit(t, b, style) {
    const e = E.outExpo(prog(t, b.start - 0.04, b.start + 0.42));
    const x = E.inExpo(prog(t, b.end - 0.16, b.end + 0.04));
    const k = 1 - e;
    const dirs = { left: [1, 0], up: [0, 1], right: [-1, 0], down: [0, -1] };
    const [dx, dy] = dirs[style] || [1, 0];
    return { e, x, dx: (dx * k - dx * x) * W * 0.7, dy: (dy * k - dy * x) * H * 0.55, blur: k * 22 + x * 26 };
  }

  // The Insights count-up: a giant 74 lands on the real rating.
  const ins = screens.find((S) => S.id === 'insights');
  const count = el('div', 'display abs', world, { fontSize: `${PORTRAIT ? 620 : LAND ? 560 : 440}px`, lineHeight: '1', opacity: 0, letterSpacing: '-0.06em' });
  const RATING = center(boxOf('insights-base', 'rating'));
  function updateCount(t) {
    const on = t >= 33.98 && t < 34.75;
    show(count, on);
    if (!on) return;
    count.textContent = String(Math.round(74 * E.outCubic(prog(t, 34.02, 34.42))));
    const r = count.getBoundingClientRect();
    const target = ins.panel.map(RATING[0] - 18, RATING[1] + 4);
    const land = E.inOutExpo(prog(t, 34.42, 34.64));
    const finalS = (ins.panel.s * 74) / (PORTRAIT ? 620 : LAND ? 560 : 440);
    const cx = lerp(UIC.x, target[0], land);
    const cy = lerp(UIC.y - (PORTRAIT ? 40 : 0), target[1], land);
    const sc = lerp(lerp(1.25, 1, E.outExpo(prog(t, 33.98, 34.3))), finalS, land);
    count.style.transform = `translate(${cx - r.width / 2}px, ${cy - r.height / 2}px) scale(${sc})`;
    count.style.opacity = prog(t, 33.98, 34.04) * (1 - prog(t, 34.6, 34.7));
  }

  // ------------------------------------------------------------------ feature words
  const CAPTIONS = TL.captions;
  const WORD_MAX = PORTRAIT ? 250 : SQUARE ? 150 : 200;
  const shade = el('div', 'abs', words, {
    width: `${W}px`, height: `${LAND ? H : Z.ui.y + 6}px`,
    background: LAND ? 'linear-gradient(90deg, rgba(9,9,11,0.96) 0%, rgba(9,9,11,0.9) 36%, rgba(9,9,11,0) 46%)' : 'linear-gradient(180deg, rgba(9,9,11,0.97) 0%, rgba(9,9,11,0.94) 78%, rgba(9,9,11,0) 100%)',
    opacity: 0,
  });
  const featureWords = FEATURES.map((b, idx) => {
    const [label, cap] = CAPTIONS[b.id];
    const blk = el('div', 'abs', words, { width: `${Z.word.w}px` });
    const eyebrow = el('div', 'mono', blk, { fontSize: `${LAND ? 17 : PORTRAIT ? 21 : 17}px`, color: '#A1A1AA', display: SQUARE ? 'none' : 'flex', alignItems: 'center', gap: '16px' });
    const tick = el('span', '', eyebrow, { width: '44px', height: '3px', background: 'var(--rose)', display: 'inline-block', transformOrigin: '0 50%' });
    const num = el('span', '', eyebrow);
    num.textContent = `${String(idx + 1).padStart(2, '0')} / ${String(FEATURES.length).padStart(2, '0')}`;
    const size = fitSize(label, Z.word.w, WORD_MAX);
    const mask = el('div', '', blk, { overflow: 'hidden', marginTop: `${LAND ? 18 : SQUARE ? 0 : 14}px`, paddingBottom: '4px' });
    const word = el('div', 'display', mask, { fontSize: `${size}px` });
    const chars = splitChars(word, label.toUpperCase());
    const capEl = el('div', '', blk, { fontSize: `${LAND ? 30 : PORTRAIT ? 36 : 28}px`, fontWeight: 500, color: '#A1A1AA', marginTop: `${LAND ? 22 : 16}px`, lineHeight: 1.3, maxWidth: `${Z.word.w}px` });
    capEl.textContent = cap;
    return { b, blk, tick, chars, capEl, eyebrow, size };
  });
  featureWords.forEach((f) => {
    const hgt = f.blk.getBoundingClientRect().height;
    const y = LAND ? Z.word.y + (Z.word.h - hgt) / 2 : Z.word.y + Z.word.h - hgt;
    f.blk.style.transform = `translate(${Z.word.x}px, ${y}px)`;
  });

  function updateWords(t) {
    shade.style.opacity = prog(t, 5.9, 6.1) * (1 - prog(t, 37.9, 38.05));
    featureWords.forEach(({ b, blk, tick, chars, capEl, eyebrow }) => {
      const on = t >= b.start - 0.02 && t < b.end + 0.02;
      show(blk, on);
      if (!on) return;
      chars.forEach((c, i) => {
        const a = b.start + i * 0.022;
        const pin = E.outExpo(prog(t, a, a + 0.42));
        const pout = E.inExpo(prog(t, b.end - 0.2 + i * 0.012, b.end - 0.02 + i * 0.012));
        c.style.transform = `translateY(${(1 - pin) * 110 - pout * 110}%) rotate(${(1 - pin) * 8}deg)`;
      });
      tick.style.transform = `scaleX(${E.outExpo(prog(t, b.start + 0.05, b.start + 0.4)) * (1 - prog(t, b.end - 0.15, b.end))})`;
      const cp = E.outCubic(prog(t, b.start + 0.12, b.start + 0.45));
      const cq = prog(t, b.end - 0.16, b.end - 0.02);
      capEl.style.opacity = cp * (1 - cq);
      capEl.style.transform = `translateY(${(1 - cp) * 24 - cq * 16}px)`;
      if (!SQUARE) eyebrow.style.opacity = prog(t, b.start, b.start + 0.1) * (1 - cq);
    });
  }

  // ------------------------------------------------------------------ logo (reveal + outro)
  const logo = el('div', 'abs', world);
  const logoMark = el('div', '', logo);
  logoMark.innerHTML = MARK;
  const logoWord = el('div', '', logo);
  logoWord.innerHTML = WORDMARK;
  [logoMark, logoWord].forEach((d) => { const s = d.querySelector('svg'); s.style.width = '100%'; s.style.height = '100%'; s.style.display = 'block'; });
  const MARK_H = PORTRAIT ? 400 : SQUARE ? 300 : 330;
  const MARK_W = MARK_H * 1.06;
  const WORD_W = MARK_W * 1.42;
  const WORD_H = WORD_W / 8.6;
  Object.assign(logoMark.style, { position: 'absolute', width: `${MARK_W}px`, height: `${MARK_H}px` });
  Object.assign(logoWord.style, { position: 'absolute', width: `${WORD_W}px`, height: `${WORD_H}px`, overflow: 'hidden' });
  const logoTag = el('div', 'mono abs', world, { fontSize: `${PORTRAIT ? 30 : 24}px`, color: '#A1A1AA', letterSpacing: '0.6em', opacity: 0 });
  logoTag.textContent = 'Scrims';
  const shock = el('div', 'ring', world, { width: '200px', height: '200px', borderWidth: '2px', opacity: 0 });
  const tagline = el('div', 'display abs', world, { fontSize: `${fitSize('SCRIMS, SORTED.', PORTRAIT ? 900 : SQUARE ? 860 : 1100, PORTRAIT ? 160 : 150)}px`, opacity: 0 });
  const taglineChars = splitChars(tagline, 'SCRIMS, SORTED.');
  const url = el('div', 'mono abs', world, { fontSize: `${PORTRAIT ? 26 : 22}px`, color: '#A1A1AA', opacity: 0, display: 'flex', alignItems: 'center', gap: '18px' });
  const urlTick = el('span', '', url, { width: '46px', height: '3px', background: 'var(--rose)', display: 'inline-block', transformOrigin: '0 50%' });
  el('span', '', url).textContent = 'Find your next scrim · esportra.com';

  function placeLogo(cx, cy, s, wordReveal, op) {
    const totalH = MARK_H + WORD_H * 1.6;
    logo.style.transform = `translate(${cx}px, ${cy}px) scale(${s})`;
    logo.style.opacity = op;
    logoMark.style.transform = `translate(${-MARK_W / 2}px, ${-totalH / 2}px)`;
    logoWord.style.transform = `translate(${-WORD_W / 2}px, ${-totalH / 2 + MARK_H + WORD_H * 0.6}px)`;
    logoWord.style.clipPath = `inset(0 ${100 - wordReveal * 100}% 0 0)`;
  }

  function updateLogo(t) {
    // Reveal: slam at 2.0, then shrink into the HUD corner by 2.75.
    const inReveal = t >= 2.0 && t < 2.8;
    const inOutro = t >= 37.95;
    show(logo, inReveal || inOutro);
    show(shock, (t >= 2.0 && t < 2.6) || (t >= 38.0 && t < 38.6));
    shards.style.opacity = 0.55 * prog(t, 2.0, 2.1) * (1 - prog(t, 2.6, 3.1)) + 0.5 * prog(t, 38.0, 38.3);
    if (inReveal) {
      const slamP = E.outExpo(prog(t, 2.0, 2.22));
      const toHud = E.inOutExpo(prog(t, 2.42, 2.78));
      const hudScale = HUD_H / MARK_H;
      const sx = lerp(W / 2, Z.pad + (HUD_H * 1.06) / 2, toHud);
      const sy = lerp(H / 2 - (PORTRAIT ? 40 : 10), Z.pad - 4 + HUD_H / 2 + (MARK_H + WORD_H * 1.6) * hudScale / 2 - (HUD_H / 2) * 0, toHud);
      const s = lerp(lerp(1.35, 1, slamP), hudScale, toHud);
      placeLogo(sx, sy, s, E.outExpo(prog(t, 2.08, 2.4)), 1 - prog(t, 2.72, 2.8));
      logoTag.style.opacity = prog(t, 2.18, 2.3) * (1 - prog(t, 2.4, 2.5));
      const tg = logoTag.getBoundingClientRect();
      logoTag.style.transform = `translate(${W / 2 - tg.width / 2 + 10}px, ${H / 2 + (MARK_H + WORD_H * 1.6) / 2 + 40 - (PORTRAIT ? 40 : 10)}px)`;
      logoTag.style.letterSpacing = `${lerp(1.4, 0.6, E.outExpo(prog(t, 2.18, 2.5)))}em`;
    } else { logoTag.style.opacity = 0; }
    const sh = (at) => {
      const p = prog(t, at, at + 0.55);
      shock.style.opacity = (1 - p) * 0.7;
      shock.style.transform = `translate(${W / 2 - 100}px, ${H / 2 - 100 - (inOutro && PORTRAIT ? 180 : 0)}px) scale(${0.4 + E.outExpo(p) * (Math.max(W, H) / 120)})`;
    };
    if (t >= 2.0 && t < 2.6) sh(2.0);
    if (t >= 38.0 && t < 38.6) sh(38.0);
    hudLogo.style.opacity = prog(t, 2.74, 2.8);
    if (inOutro) {
      const p = E.outExpo(prog(t, 38.0, 38.35));
      const ly = PORTRAIT ? H * 0.38 : SQUARE ? H * 0.36 : H * 0.36;
      const drift = 1 + 0.03 * prog(t, 38.3, 42);
      placeLogo(W / 2, ly, lerp(1.4, LAND ? 0.82 : 0.86, p) * drift, E.outExpo(prog(t, 38.12, 38.5)), prog(t, 38.0, 38.04));
      const tb = tagline.getBoundingClientRect();
      const ty = ly + (MARK_H + WORD_H * 1.6) * 0.86 / 2 + (PORTRAIT ? 90 : 52);
      tagline.style.opacity = 1;
      tagline.style.transform = `translate(${W / 2 - tb.width / 2}px, ${ty}px)`;
      taglineChars.forEach((c, i) => {
        const a = 38.25 + i * 0.025;
        const q = E.outExpo(prog(t, a, a + 0.4));
        c.style.transform = `translateY(${(1 - q) * 60}px)`;
        c.style.opacity = q;
      });
      const ub = url.getBoundingClientRect();
      url.style.opacity = prog(t, 38.7, 38.95);
      url.style.transform = `translate(${W / 2 - ub.width / 2}px, ${ty + tb.height + (PORTRAIT ? 64 : 40)}px)`;
      urlTick.style.transform = `scaleX(${E.outExpo(prog(t, 38.75, 39.1))})`;
    } else { tagline.style.opacity = 0; url.style.opacity = 0; }
  }

  // Cue line: one thin rose sweep on every feature cut.
  const cue = el('div', 'abs', fx, { height: '4px', width: `${W}px`, background: 'var(--rose)', transformOrigin: '0 50%', opacity: 0 });
  function updateCue(t) {
    let shown = false;
    FEATURES.concat([TL.beats.find((x) => x.id === 'outro')]).forEach((b, i) => {
      const p = prog(t, b.start - 0.06, b.start + 0.16);
      if (p > 0 && p < 1) {
        shown = true;
        const y = LAND ? H * (0.2 + 0.6 * hash(i + 2)) : H * (0.25 + 0.5 * hash(i + 5));
        cue.style.opacity = 1;
        cue.style.transform = `translate(0, ${y}px) scaleX(${E.outExpo(p)}) translateX(${E.inExpo(p) * 0}px)`;
        cue.style.clipPath = `inset(0 0 0 ${E.inCubic(p) * 100}%)`;
      }
    });
    if (!shown) cue.style.opacity = 0;
  }

  // ------------------------------------------------------------------ frame
  window.renderFrame = (t) => {
    cursorOn = false;
    setCursor(0, 0, 0);
    rings.forEach((r) => { r.style.opacity = 0; });
    const [sx, sy] = shakeAt(t);
    world.style.transform = `translate(${sx}px, ${sy}px)`;
    words.style.transform = `translate(${sx * 0.5}px, ${sy * 0.5}px)`;
    grid.style.transform = `translate(${(-t * 18) % 96}px, ${(-t * 11) % 96}px)`;
    grid.style.opacity = t < 2 ? 0.35 : 0.9;
    spot.style.background = `radial-gradient(ellipse ${LAND ? '70% 90%' : '120% 60%'} at ${50 + 12 * Math.sin(t * 0.6)}% ${-8 + 4 * Math.cos(t * 0.5)}%, rgba(220,225,255,0.10), transparent 65%)`;
    grain.style.backgroundPosition = `${Math.floor(hash(Math.floor(t * 60)) * 960)}px ${Math.floor(hash(Math.floor(t * 60) + 9) * 540)}px`;
    flashEl.style.opacity = flashAt(t);
    updateHook(t);
    updateReveal(t);
    screens.forEach((S) => updateScreen(t, S));
    updateCount(t);
    updateWords(t);
    updateLogo(t);
    updateHud(t);
    updateCue(t);
    const out = E.inExpo(prog(t, 37.9, 38.06));
    ins.g.style.transform = `scale(${1 + out * 0.5})`;
    ins.g.style.opacity = 1 - out;
  };

  // Wait for every capture to decode so no frame shows a half-loaded image.
  await Promise.all([...document.images].map((im) => im.decode().catch(() => undefined)));
  window.renderFrame(Number(Q.get('t') || 0));
  window.__ready = true;
})().catch((e) => { document.body.innerHTML = `<pre style="color:#f88;font-size:20px">${e.stack}</pre>`; window.__error = String(e); });
