// Shared building blocks for the Esportra design dataset.
// Every asset is plain HTML + CSS rendered by build.mjs, so any board can be edited and re-rendered.
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Brand tokens - mirror of src/components/ui/kit/tone.ts and .claude/skills/esportra-brand/reference/tokens.md
export const C = {
  stage: '#09090B',
  panel: '#111114',
  ink: '#FAFAFA',
  label: '#E4E4E7',
  secondary: '#A1A1AA',
  hint: '#71717A',
  disabled: '#52525B',
  cue: '#F43F5E',
  cueSoft: '#FDA4AF',
  success: '#34D399',
  warning: '#FBBF24',
  critical: '#EF4444',
  // Daylight (paper) variants
  paper: '#FAFAF9',
  paperInk: '#09090B',
  paperSecondary: '#52525B',
  paperHint: '#71717A',
  paperHair: '#E4E4E7',
  paperCue: '#E11D48',
  paperSuccess: '#047857',
  paperWarning: '#B45309',
  paperCritical: '#B91C1C',
  // Community warm greys
  warmSurface: '#1C1917',
  warmGround: '#141212',
  warmSecondary: '#A8A29E',
  warmHint: '#78716C',
};

// Logo: the real mark lives in Supabase storage (system.assets.website/eSportra-Logo/).
// Drop exported files into design/identity/logo/ and re-run the build to composite them everywhere.
export const LOGO_WHITE = 'identity/logo/esportra-logo-white.png';
export const LOGO_DARK = 'identity/logo/esportra-logo-dark.png';
export const hasLogo = (p = LOGO_WHITE) => existsSync(path.join(ROOT, p));

export function logo({ height = 28, dark = false } = {}) {
  const p = dark ? LOGO_DARK : LOGO_WHITE;
  if (hasLogo(p)) return `<img class="logo" src="../../${p}" style="height:${height}px;width:auto" alt="Esportra">`;
  const col = dark ? 'rgba(9,9,11,.35)' : 'rgba(255,255,255,.28)';
  return `<span class="logo-slot" style="height:${height}px;border-color:${col};color:${col}">LOGO</span>`;
}

const FONT = (family, file, weight) =>
  `@font-face{font-family:'${family}';src:url('../fonts/${file}') format('woff2');font-weight:${weight};font-style:normal;font-display:block}`;

export const BASE_CSS = `
${FONT('Poppins', 'poppins-latin-700-normal.woff2', 700)}
${FONT('Poppins', 'poppins-latin-800-normal.woff2', 800)}
${FONT('Poppins', 'poppins-latin-900-normal.woff2', 900)}
${FONT('Inter', 'inter-latin-400-normal.woff2', 400)}
${FONT('Inter', 'inter-latin-500-normal.woff2', 500)}
${FONT('Inter', 'inter-latin-600-normal.woff2', 600)}
${FONT('Inter', 'inter-latin-700-normal.woff2', 700)}
${FONT('JetBrains Mono', 'jetbrains-mono-latin-500-normal.woff2', 500)}
${FONT('JetBrains Mono', 'jetbrains-mono-latin-700-normal.woff2', 700)}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:100%;height:100%}
body{background:${C.stage};color:${C.ink};font-family:Inter,system-ui,sans-serif;font-size:15px;line-height:1.5;-webkit-font-smoothing:antialiased;overflow:hidden}
.h{font-family:Poppins,sans-serif;letter-spacing:-0.02em;line-height:1}
.mono{font-family:'JetBrains Mono',ui-monospace,monospace}
.eyebrow{font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.28em;color:${C.hint}}
.num{font-family:Poppins,sans-serif;font-weight:900;font-variant-numeric:tabular-nums;letter-spacing:-0.02em}
.hair{border-color:rgba(255,255,255,.07)}
.panel{background:${C.panel};box-shadow:inset 0 0 0 1px rgba(255,255,255,.07)}
.cue{background:${C.cue}}
.grid-px{display:grid;gap:1px;background:rgba(255,255,255,.06)}
.grid-px>*{background:${C.panel}}
.logo-slot{display:inline-flex;align-items:center;justify-content:center;padding:0 12px;border:1px dashed;font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:700;letter-spacing:.3em}
.pill{display:inline-flex;align-items:center;gap:8px;height:24px;padding:0 10px;font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:700;letter-spacing:.2em;text-transform:uppercase}
.dot{width:6px;height:6px;border-radius:999px;display:inline-block}
.btn{display:inline-flex;align-items:center;justify-content:center;height:44px;padding:0 20px;font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;border:1px solid}
.btn-primary{background:${C.ink};color:${C.stage};border-color:${C.ink}}
.btn-secondary{background:${C.stage};color:${C.ink};border-color:rgba(255,255,255,.15)}
.btn-ghost{background:rgba(255,255,255,.03);color:${C.ink};border-color:rgba(255,255,255,.10)}
.btn-danger{background:rgba(69,10,10,.2);color:#FEE2E2;border-color:rgba(239,68,68,.35)}
`;

export function page({ title, css = '', body, transparent = false, bg }) {
  const bgCss = transparent ? 'html,body{background:transparent}' : bg ? `body{background:${bg}}` : '';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${title}</title>
<style>${BASE_CSS}${bgCss}${css}</style></head><body>${body}</body></html>`;
}

// Tone helpers (mirror of TONE_* in tone.ts)
export const TONES = {
  accent: { dot: C.cue, text: '#FDA4AF', bg: 'rgba(244,63,94,.08)', ring: 'rgba(244,63,94,.25)' },
  success: { dot: C.success, text: '#6EE7B7', bg: 'rgba(52,211,153,.08)', ring: 'rgba(52,211,153,.25)' },
  warning: { dot: C.warning, text: '#FDE68A', bg: 'rgba(251,191,36,.08)', ring: 'rgba(251,191,36,.25)' },
  critical: { dot: C.critical, text: '#FCA5A5', bg: 'rgba(239,68,68,.08)', ring: 'rgba(239,68,68,.25)' },
  neutral: { dot: C.hint, text: '#D4D4D8', bg: 'rgba(255,255,255,.04)', ring: 'rgba(255,255,255,.10)' },
};
export const pill = (label, tone = 'neutral') => {
  const t = TONES[tone];
  return `<span class="pill" style="background:${t.bg};color:${t.text};box-shadow:inset 0 0 0 1px ${t.ring}"><span class="dot" style="background:${t.dot}"></span>${label}</span>`;
};

// Sample team crests: geometric monograms, clearly placeholders (real teams upload their own).
export function crest(initials, hue, size = 64, shape = 0) {
  const shapes = [
    'M50 4 L92 20 L92 56 Q92 84 50 96 Q8 84 8 56 L8 20 Z',
    'M50 4 L96 50 L50 96 L4 50 Z',
    'M16 4 H84 L96 16 V84 L84 96 H16 L4 84 V16 Z',
    'M50 4 L90 27 V73 L50 96 L10 73 V27 Z',
  ];
  const col = `hsl(${hue} 70% 55%)`;
  const deep = `hsl(${hue} 55% 18%)`;
  return `<svg width="${size}" height="${size}" viewBox="0 0 100 100" aria-label="Sample crest"><path d="${shapes[shape % 4]}" fill="${deep}" stroke="${col}" stroke-width="4"/><text x="50" y="${shape === 1 ? 60 : 62}" text-anchor="middle" font-family="Poppins" font-weight="900" font-size="${initials.length > 2 ? 26 : 34}" fill="${col}" letter-spacing="-1">${initials}</text></svg>`;
}

// WCAG 2.x contrast ratio
function lum(hex) {
  const n = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function contrast(a, b) {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}
export const grade = (r, large = false) => (r >= 7 ? 'AAA' : r >= 4.5 ? 'AA' : r >= 3 && large ? 'AA large' : r >= 3 ? 'UI only' : 'Fail');

// Cubic-bezier curve drawn as an SVG path (for the motion board)
export function bezierSvg([x1, y1, x2, y2], w = 220, h = 140, color = C.cue) {
  const P = (x, y) => `${(x * w).toFixed(1)} ${((1 - y) * h).toFixed(1)}`;
  return `<svg width="${w}" height="${h}" viewBox="-2 -2 ${w + 4} ${h + 4}" style="overflow:visible">
<rect x="0" y="0" width="${w}" height="${h}" fill="none" stroke="rgba(255,255,255,.07)"/>
<line x1="0" y1="${h}" x2="${w}" y2="0" stroke="rgba(255,255,255,.08)" stroke-dasharray="3 4"/>
<line x1="0" y1="${h}" x2="${x1 * w}" y2="${(1 - y1) * h}" stroke="rgba(255,255,255,.25)"/>
<line x1="${w}" y1="0" x2="${x2 * w}" y2="${(1 - y2) * h}" stroke="rgba(255,255,255,.25)"/>
<circle cx="${x1 * w}" cy="${(1 - y1) * h}" r="3" fill="${C.ink}"/><circle cx="${x2 * w}" cy="${(1 - y2) * h}" r="3" fill="${C.ink}"/>
<path d="M${P(0, 0)} C${P(x1, y1)} ${P(x2, y2)} ${P(1, 1)}" fill="none" stroke="${color}" stroke-width="2.5"/></svg>`;
}

// Deterministic PRNG so textures are reproducible
export function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

// Streak shards - vector recreation of the brand background (esportra-bg-*.png)
export function shardsSvg({ w = 1920, h = 1080, seed = 7, count = 5, fill = '#161618', cueIndex = -1, opacity = 1 } = {}) {
  const r = rng(seed);
  let out = '';
  for (let i = 0; i < count; i++) {
    const cx = (w / count) * (i + 0.2 + r() * 0.6);
    const pts = [];
    const segs = 5 + Math.floor(r() * 3);
    let x = cx;
    const left = [];
    const right = [];
    for (let k = 0; k <= segs; k++) {
      const y = (h / segs) * k;
      x += (r() - 0.5) * 180;
      const width = 40 + r() * 120;
      left.push([x - width / 2, y]);
      right.push([x + width / 2 + (r() - 0.5) * 30, y]);
    }
    left[0][1] = -10; right[0][1] = -10; left[segs][1] = h + 10; right[segs][1] = h + 10;
    pts.push(...left, ...right.reverse());
    const d = 'M' + pts.map((p) => p.map((v) => v.toFixed(1)).join(' ')).join(' L') + ' Z';
    out += `<path d="${d}" fill="${fill}" opacity="${opacity}"/>`;
    if (i === cueIndex) {
      const edge = right.slice().reverse();
      out += `<path d="M${edge.map((p) => p.map((v) => v.toFixed(1)).join(' ')).join(' L')}" fill="none" stroke="${C.cue}" stroke-width="2"/>`;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid slice"><rect width="${w}" height="${h}" fill="${C.stage}"/>${out}</svg>`;
}

// Board chrome used on reference boards (not on templates)
export function boardHead(kicker, title, note = '') {
  return `<header style="display:flex;align-items:flex-end;justify-content:space-between;gap:32px;padding-bottom:28px;border-bottom:1px solid rgba(255,255,255,.07)">
<div><div class="eyebrow" style="margin-bottom:14px"><span style="display:inline-block;width:18px;height:2px;background:${C.cue};vertical-align:middle;margin-right:12px"></span>${kicker}</div>
<h1 class="h" style="font-weight:900;font-size:52px">${title}</h1></div>
<div style="max-width:420px;color:${C.secondary};font-size:14px;text-align:right">${note}</div></header>`;
}
export const boardFoot = (id) => `<footer style="position:absolute;left:64px;right:64px;bottom:28px;display:flex;justify-content:space-between" class="eyebrow"><span>ESPORTRA DESIGN DATASET</span><span>${id}</span></footer>`;
