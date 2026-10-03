// Kit for the Esportra Broadcast UI/UX screens (web ops + desktop production node).
// Direction: Command Console inside Broadcast chrome. Rose = ON AIR / PGM / live only. Amber = cued / preview.
import { C, page, TONES, crest } from './lib.mjs';

export { C, TONES, crest };
export const W = 1600;
export const H = 1000;
export const AMBER = '#FBBF24';
export const img = (name) => `../../assets/hud-previews/${name}`;

const KIT_CSS = `
.scr{position:relative;width:var(--w);height:var(--h);overflow:hidden;background:${C.stage}}
.cap{font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.24em;color:${C.hint}}
.t1{font-family:Poppins,sans-serif;font-weight:800;letter-spacing:-.02em;line-height:1.05}
.muted{color:${C.secondary}}.hint{color:${C.hint}}
.box{background:${C.panel};box-shadow:inset 0 0 0 1px rgba(255,255,255,.07)}
.box2{background:#0d0d10;box-shadow:inset 0 0 0 1px rgba(255,255,255,.06)}
.row{display:flex;align-items:center}
.sep{height:1px;background:rgba(255,255,255,.07)}
.b{display:inline-flex;align-items:center;justify-content:center;gap:8px;height:34px;padding:0 14px;font-family:'JetBrains Mono',monospace;font-size:10.5px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;border:1px solid rgba(255,255,255,.12);color:${C.ink};background:rgba(255,255,255,.03);white-space:nowrap}
.b-pri{background:${C.ink};color:${C.stage};border-color:${C.ink}}
.b-take{background:${C.cue};border-color:${C.cue};color:#fff}
.b-cue{background:rgba(251,191,36,.1);border-color:rgba(251,191,36,.55);color:#FDE68A}
.b-lg{height:46px;font-size:12px;padding:0 20px}
.b-sm{height:28px;font-size:9.5px;padding:0 10px;letter-spacing:.14em}
.chip{display:inline-flex;align-items:center;gap:7px;height:22px;padding:0 8px;font-family:'JetBrains Mono',monospace;font-size:9.5px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;white-space:nowrap}
.kbd{display:inline-flex;align-items:center;justify-content:center;min-width:18px;height:18px;padding:0 4px;font-family:'JetBrains Mono',monospace;font-size:9.5px;font-weight:700;color:${C.secondary};box-shadow:inset 0 0 0 1px rgba(255,255,255,.18);background:rgba(255,255,255,.04)}
.dot{width:7px;height:7px;border-radius:99px;display:inline-block;flex:none}
.tbl{width:100%;border-collapse:collapse;font-size:13px}
.tbl th{font-family:'JetBrains Mono',monospace;font-size:9.5px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:${C.hint};text-align:left;padding:10px 12px;border-bottom:1px solid rgba(255,255,255,.08)}
.tbl td{padding:11px 12px;border-bottom:1px solid rgba(255,255,255,.05);vertical-align:middle}
.field{height:38px;display:flex;align-items:center;padding:0 12px;background:rgba(0,0,0,.35);box-shadow:inset 0 0 0 1px rgba(255,255,255,.1);font-size:13.5px}
.lbl{font-size:12px;font-weight:600;color:${C.label};margin-bottom:6px}
.tog{width:34px;height:18px;position:relative;background:rgba(255,255,255,.12);flex:none}
.tog::after{content:'';position:absolute;top:3px;left:3px;width:12px;height:12px;background:${C.secondary}}
.tog.on{background:${C.ink}}.tog.on::after{left:19px;background:${C.stage}}
.seg{display:inline-flex;background:rgba(0,0,0,.4);padding:2px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.08)}
.seg span{height:28px;white-space:nowrap;display:inline-flex;align-items:center;padding:0 12px;font-family:'JetBrains Mono',monospace;font-size:9.5px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:${C.hint}}
.seg span.on{background:${C.ink};color:${C.stage}}
.mon{position:relative;background:#000 center/cover no-repeat;box-shadow:inset 0 0 0 1px rgba(255,255,255,.1)}
.mon .tab{position:absolute;left:0;top:0;height:22px;display:flex;align-items:center;gap:6px;padding:0 9px;font-family:'JetBrains Mono',monospace;font-size:9.5px;font-weight:700;letter-spacing:.2em}
.ann{position:absolute;z-index:50;width:22px;height:22px;display:flex;align-items:center;justify-content:center;background:${C.ink};color:${C.stage};font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:700;box-shadow:0 0 0 3px rgba(9,9,11,.85)}
.nav-i{display:flex;align-items:center;gap:10px;height:34px;padding:0 12px;font-size:13px;color:${C.secondary}}
.nav-i.on{background:rgba(255,255,255,.06);color:${C.ink};box-shadow:inset 2px 0 0 ${C.ink}}
.ic{width:15px;height:15px;flex:none;opacity:.85}
.bar{height:4px;background:rgba(255,255,255,.08);position:relative}
.bar>i{position:absolute;inset:0 auto 0 0;background:${C.ink}}
`;

/** Numbered UX callout, explained per screen in design/hud-studio/README.md. */
export const ann = (n, x, y) => `<span class="ann" style="left:${x}px;top:${y}px">${n}</span>`;

export const chip = (label, tone = 'neutral') => {
  const t = TONES[tone];
  return `<span class="chip" style="background:${t.bg};color:${t.text};box-shadow:inset 0 0 0 1px ${t.ring}"><span class="dot" style="background:${t.dot};width:6px;height:6px"></span>${label}</span>`;
};
/** Tally: ON AIR is the only rose; PVW is amber; idle is grey. */
export const tally = (state) => state === 'pgm'
  ? `<span class="chip" style="background:${C.cue};color:#fff"><span class="dot" style="background:#fff;width:6px;height:6px"></span>ON AIR</span>`
  : state === 'pvw' ? `<span class="chip" style="background:rgba(251,191,36,.12);color:#FDE68A;box-shadow:inset 0 0 0 1px rgba(251,191,36,.45)">PVW</span>`
    : `<span class="chip" style="color:${C.hint};box-shadow:inset 0 0 0 1px rgba(255,255,255,.12)">OFF</span>`;

export const health = (label, value, tone = 'success') => `<span class="row" style="gap:8px;height:28px;padding:0 10px;background:rgba(255,255,255,.03);box-shadow:inset 0 0 0 1px rgba(255,255,255,.07)"><span class="dot" style="background:${TONES[tone].dot}"></span><span class="cap" style="font-size:9px;color:${C.secondary}">${label}</span><span class="mono" style="font-size:11px;color:${C.ink}">${value}</span></span>`;

export const monitor = (src, { w, label, tone = 'pgm', extra = '' }) => {
  const h = Math.round((w * 9) / 16);
  const tab = tone === 'pgm'
    ? `<span class="tab" style="background:${C.cue};color:#fff"><span class="dot" style="background:#fff;width:6px;height:6px"></span>${label}</span>`
    : tone === 'pvw' ? `<span class="tab" style="background:${AMBER};color:${C.stage}">${label}</span>`
      : `<span class="tab" style="background:rgba(9,9,11,.85);color:${C.secondary}">${label}</span>`;
  const ring = tone === 'pgm' ? `box-shadow:inset 0 0 0 2px ${C.cue}` : tone === 'pvw' ? `box-shadow:inset 0 0 0 2px ${AMBER}` : '';
  return `<div class="mon" style="width:${w}px;height:${h}px;background-image:url('${src}');${ring}">${tab}${extra}</div>`;
};

export const crestMini = (initials, hue, size = 22, shape = 0) => crest(initials, hue, size, shape);

// Simple stroke icons (24-grid) so screens don't depend on an icon font.
const P = {
  home: 'M3 11l9-7 9 7v9H3z', show: 'M3 5h18v12H3zM8 21h8', rundown: 'M4 6h16M4 12h10M4 18h13', live: 'M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0M5 5a10 10 0 0 0 0 14M19 5a10 10 0 0 1 0 14',
  crew: 'M8 11a3 3 0 1 0 0-6a3 3 0 0 0 0 6zM2 20c0-3 3-5 6-5s6 2 6 5M17 11a3 3 0 1 0 0-6M22 20c0-3-2-4.5-4-5', report: 'M5 3h10l4 4v14H5zM9 13h6M9 17h6', node: 'M4 5h16v10H4zM9 19h6M12 15v4',
  pack: 'M4 7l8-4 8 4-8 4zM4 7v10l8 4 8-4V7', team: 'M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6z', console: 'M3 4h18v12H3zM7 20h10M7 9l3 2-3 2M12 13h4', scenes: 'M3 3h8v8H3zM13 3h8v8h-8zM3 13h8v8H3zM13 13h8v8h-8z',
  capture: 'M4 8h4l2-3h4l2 3h4v11H4zM12 16a3 3 0 1 0 0-6a3 3 0 0 0 0 6z', outputs: 'M14 4h6v6M20 4l-9 9M18 14v6H4V6h6', data: 'M4 6c0-2 16-2 16 0v12c0 2-16 2-16 0zM4 12c0 2 16 2 16 0', sync: 'M4 12a8 8 0 0 1 14-5l2 2M20 12a8 8 0 0 1-14 5l-2-2M20 4v5h-5M4 20v-5h5',
  settings: 'M12 15a3 3 0 1 0 0-6a3 3 0 0 0 0 6zM19 12h2M3 12h2M12 3v2M12 19v2M17 7l1.5-1.5M5.5 18.5L7 17M17 17l1.5 1.5M5.5 5.5L7 7', bolt: 'M13 2L4 14h7l-1 8 9-12h-7z', play: 'M7 4l13 8-13 8z', pause: 'M7 4h4v16H7zM13 4h4v16h-4z',
  check: 'M4 12l5 5L20 6', x: 'M5 5l14 14M19 5L5 19', alert: 'M12 3l10 18H2zM12 10v5M12 18v1', copy: 'M8 8h12v12H8zM4 16V4h12', qr: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h3v3h-3zM18 18h3v3h-3z', link: 'M10 14a4 4 0 0 0 6 0l3-3a4 4 0 0 0-6-6l-1 1M14 10a4 4 0 0 0-6 0l-3 3a4 4 0 0 0 6 6l1-1',
  plus: 'M12 5v14M5 12h14', drag: 'M9 5h.01M15 5h.01M9 12h.01M15 12h.01M9 19h.01M15 19h.01', chevron: 'M9 6l6 6-6 6', clock: 'M12 21a9 9 0 1 0 0-18a9 9 0 0 0 0 18zM12 7v5l3 2', wifi: 'M2 9a15 15 0 0 1 20 0M5 13a10 10 0 0 1 14 0M8.5 16.5a5 5 0 0 1 7 0M12 20h.01', replay: 'M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5',
};
export const icon = (name, color = 'currentColor', size = 15) => `<svg class="ic" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="square" stroke-linejoin="miter"><path d="${P[name] || P.plus}"/></svg>`;

const LOCKUP = img('brand-lockup-word.png');
const MARK = img('brand-mark-224.png');
export const mark = (h = 20) => `<img src="${MARK}" style="height:${h}px;width:auto" alt="">`;
export const lockup = (h = 16) => `<img src="${LOCKUP}" style="height:${h}px;width:auto" alt="Esportra">`;

export function screen({ id, w = W, h = H, body, css = '' }) {
  return page({ title: id, css: `${KIT_CSS}${css}`, body: `<main class="scr" style="--w:${w}px;--h:${h}px">${body}</main>` });
}

const WEB_NAV = [
  ['BROADCAST', [['home', 'Home'], ['show', 'Shows'], ['rundown', 'Rundowns & rules'], ['live', 'Live monitor'], ['crew', 'Crew & links'], ['report', 'Reports']]],
  ['SETUP', [['node', 'Production nodes'], ['pack', 'HUD packs'], ['team', 'Teams & talent']]],
];

/** Esportra web: site navbar + organizer rail (mirrors TournamentDashboardShell) + header + content. */
export function webShell({ active, eyebrow, title, sub = '', actions = '', body, rail = true }) {
  const nav = WEB_NAV.map(([g, items]) => `<div style="margin-bottom:20px"><div class="cap" style="padding:0 12px;margin-bottom:6px;font-size:9.5px">${g}</div>
${items.map(([ic, label]) => `<div class="nav-i ${label === active ? 'on' : ''}">${icon(ic)}${label}${label === 'Live monitor' ? `<span style="margin-left:auto">${tally('pgm').replace('ON AIR', '2')}</span>` : ''}</div>`).join('')}</div>`).join('');
  return `<header class="row" style="height:56px;padding:0 28px;border-bottom:1px solid rgba(255,255,255,.07);gap:28px;background:#0b0b0d">
${lockup(15)}<nav class="row" style="gap:22px;font-size:13px;color:${C.secondary}"><span>Tournaments</span><span>Teams</span><span>Venues</span><span style="color:${C.ink}">Organizer</span></nav>
<div class="row" style="margin-left:auto;gap:14px">${health('NODES', '3 / 3')}<span class="kbd" style="height:28px;padding:0 10px">⌘K</span><span style="width:30px;height:30px;background:#27272a;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700">AR</span></div></header>
<div style="display:flex;height:calc(100% - 56px)">
${rail ? `<aside style="width:236px;flex:none;padding:22px 12px;border-right:1px solid rgba(255,255,255,.07);background:#0b0b0d">${nav}
<div class="box2" style="margin:8px 4px 0;padding:12px"><div class="cap" style="font-size:9px">ARENA ONE · PRO PLAN</div><div style="font-size:12px;color:${C.secondary};margin-top:6px">4 nodes · 6 parallel feeds</div></div></aside>` : ''}
<section style="flex:1;min-width:0;padding:26px 32px;overflow:hidden">
<div class="row" style="justify-content:space-between;gap:24px;margin-bottom:22px"><div><div class="cap" style="margin-bottom:10px">${eyebrow}</div><h1 class="t1" style="font-size:30px">${title}</h1>${sub ? `<p class="muted" style="font-size:13.5px;margin-top:8px;max-width:720px">${sub}</p>` : ''}</div><div class="row" style="gap:10px">${actions}</div></div>
${body}</section></div>`;
}

const DESK_NAV = [['console', 'Console'], ['scenes', 'Scenes'], ['capture', 'Capture'], ['outputs', 'Outputs'], ['data', 'Data'], ['sync', 'Sync']];

/** Esportra Broadcast desktop app: window chrome, icon rail, node status bar. */
export function desktopShell({ active, show = 'KVO 2026 · Upper semi-final · Night Owls vs Crimson Five', status, body, offline = false }) {
  const st = status ?? [health('GEP', '38 ms'), health('OBS', 'Studio PC'), health('CLOUD', offline ? 'Offline' : 'Synced', offline ? 'warning' : 'success'), health('LAN', '192.168.1.40:5300', 'neutral')].join('');
  return `<div class="row" style="height:34px;padding:0 12px;background:#060607;border-bottom:1px solid rgba(255,255,255,.06);gap:10px">
${mark(14)}<span class="cap" style="font-size:9.5px;color:${C.secondary}">ESPORTRA BROADCAST</span><span class="hint" style="font-size:12px">— ${show}</span>
<span class="row" style="margin-left:auto;gap:14px;color:${C.hint}"><span style="width:10px;height:1px;background:currentColor"></span><span style="width:10px;height:10px;box-shadow:inset 0 0 0 1px currentColor"></span>${icon('x', C.hint, 12)}</span></div>
<div style="display:flex;height:calc(100% - 34px)">
<aside style="position:relative;width:72px;flex:none;background:#08080a;border-right:1px solid rgba(255,255,255,.06);padding-top:10px">
${DESK_NAV.map(([ic, label]) => `<div style="height:62px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;${label === active ? `background:rgba(255,255,255,.06);box-shadow:inset 2px 0 0 ${C.ink};color:${C.ink}` : `color:${C.hint}`}">${icon(ic, 'currentColor', 18)}<span class="cap" style="font-size:8px;letter-spacing:.14em;color:inherit">${label}</span></div>`).join('')}
<div style="position:absolute;bottom:14px;width:72px;display:flex;justify-content:center;color:${C.hint}">${icon('settings', 'currentColor', 18)}</div></aside>
<section style="flex:1;min-width:0;display:flex;flex-direction:column">
<div class="row" style="height:48px;padding:0 18px;gap:10px;border-bottom:1px solid rgba(255,255,255,.06);background:#0b0b0d">${st}<span style="margin-left:auto" class="mono hint">19:42:07 PKT</span></div>
<div style="flex:1;min-height:0;position:relative">${body}</div></section></div>`;
}

export const sectionTitle = (t, right = '') => `<div class="row" style="justify-content:space-between;margin-bottom:12px"><span class="cap">${t}</span>${right}</div>`;
