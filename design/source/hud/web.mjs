// Web: Esportra → Broadcast (planning + ops). Sample names are fictional; monitors show the HUD's own demo renders.
import { C, TONES, AMBER, img, screen, webShell, ann, chip, tally, health, monitor, icon, crestMini, sectionTitle } from '../hud-kit.mjs';

const kpis = (items) => `<div class="grid-px" style="grid-template-columns:repeat(${items.length},1fr);box-shadow:0 0 0 1px rgba(255,255,255,.06)">${items.map(([l, v, s, tone]) => `<div style="padding:14px 16px"><div class="cap" style="font-size:9px">${l}</div><div class="row" style="gap:10px;margin-top:8px"><span class="t1" style="font-size:26px">${v}</span>${tone ? `<span class="dot" style="background:${TONES[tone].dot}"></span>` : ''}</div><div class="hint" style="font-size:11.5px;margin-top:4px">${s}</div></div>`).join('')}</div>`;

const teamPair = (a, b, size = 20) => `<span class="row" style="gap:8px">${crestMini(a[0], a[1], size, 0)}<b style="font-size:13.5px">${a[2]}</b><span class="hint" style="font-size:12px">vs</span>${crestMini(b[0], b[1], size, 2)}<b style="font-size:13.5px">${b[2]}</b></span>`;
const NO = ['NO', 265, 'Night Owls'];
const C5 = ['C5', 0, 'Crimson Five'];
const LL = ['LL', 190, 'Lahore Lynx'];
const BF = ['BF', 140, 'Byte Force'];
const ZP = ['ZP', 40, 'Zero Ping'];
const GU = ['GU', 300, 'Ghost Unit'];

function liveCard({ src, a, b, map, score, node, next, secs, lat }) {
  return `<div class="box" style="display:grid;grid-template-columns:300px 1fr;gap:0">
${monitor(src, { w: 300, label: 'PGM' })}
<div style="padding:14px 16px;display:flex;flex-direction:column;gap:10px;min-width:0">
<div class="row" style="justify-content:space-between">${teamPair(a, b)}${tally('pgm')}</div>
<div class="row" style="gap:14px;font-size:12.5px" ><span class="t1" style="font-size:22px">${score}</span><span class="muted">${map}</span><span class="hint">· ${node}</span></div>
<div class="row" style="gap:10px;padding:8px 10px;background:rgba(255,255,255,.03);box-shadow:inset 0 0 0 1px rgba(255,255,255,.07)">${icon('bolt', AMBER, 14)}<span style="font-size:12.5px">Autopilot · next <b>${next}</b></span><span class="mono" style="margin-left:auto;color:#FDE68A;font-size:12px">in ${secs}</span></div>
<div class="row" style="gap:8px;margin-top:auto">${health('FEED', lat)}<span class="b b-sm" style="margin-left:auto">Open monitor</span></div></div></div>`;
}

export function home() {
  const queue = [
    ['20:30', [LL, BF], 'Upper semi-final · Bo3', 'Booth B', chip('Ready', 'success')],
    ['21:30', [ZP, GU], 'Lower round 3 · Bo1', 'Booth B', chip('Rescheduled', 'warning')],
    ['22:00', [NO, LL], 'Upper final · Bo3', 'Studio PC', chip('Waiting on result', 'neutral')],
    ['22:45', [BF, ZP], 'Lower round 4 · Bo1', '—', chip('Needs a node', 'critical')],
  ];
  const nodes = [
    ['Studio PC', 'GEP · OBS · 2 feeds', 'success', 'Live'], ['Booth B', 'GEP · vMix', 'warning', 'OBS reconnecting'], ['Venue LAN PC', 'Offline relay ready', 'neutral', 'Idle'],
  ];
  const alerts = [
    ['warning', 'Booth B lost OBS for 9 s', 'Reconnected. Autopilot paused there until you resume.', '19:41'],
    ['neutral', 'Zero Ping vs Ghost Unit moved to 21:30', 'Rundown and countdown graphics shifted automatically.', '19:32'],
    ['success', 'Map 2 result verified from Riot', 'Night Owls 13–9. Bracket updated, share cards ready.', '19:18'],
  ];
  const body = `${kpis([['LIVE NOW', '2', 'Studio PC · Booth B', 'accent'], ['QUEUED TODAY', '7', 'From the KVO schedule'], ['NODES', '3 / 3', 'One needs attention', 'warning'], ['HANDS-FREE', '94%', 'Automatic takes this week'], ['SPONSOR ON AIR', '41m', 'Arclight PC leads']])}
<div style="display:grid;grid-template-columns:1fr 360px;gap:24px;margin-top:24px">
<div>${sectionTitle('LIVE NOW')}
<div style="display:grid;gap:12px">${liveCard({ src: img('ingame-full.jpg'), a: NO, b: C5, map: 'Map 3 · Lotus · R24', score: '11 – 12', node: 'Studio PC', next: 'Round recap', secs: '0:04', lat: '38 ms' })}
${liveCard({ src: img('economy.jpg'), a: LL, b: BF, map: 'Map 1 · Ascent · R7', score: '4 – 2', node: 'Booth B', next: 'Economy board', secs: '0:12', lat: '61 ms' })}</div>
<div style="margin-top:26px">${sectionTitle('UP NEXT · AUTO-QUEUED FROM THE SCHEDULE', '<span class="b b-sm">Open rundowns</span>')}
<table class="tbl box"><tr><th>Time</th><th>Match</th><th>Stage</th><th>Node</th><th>Status</th></tr>
${queue.map(([t, [a, b], st, n, s]) => `<tr><td class="mono">${t}</td><td>${teamPair(a, b, 18)}</td><td class="muted">${st}</td><td>${n}</td><td>${s}</td></tr>`).join('')}</table></div></div>
<div>${sectionTitle('PRODUCTION NODES')}
<div class="box" style="padding:4px 0">${nodes.map(([n, d, tone, s]) => `<div class="row" style="gap:12px;padding:12px 14px;border-bottom:1px solid rgba(255,255,255,.05)">${icon('node', C.secondary, 18)}<div style="min-width:0"><b style="font-size:13.5px">${n}</b><div class="hint" style="font-size:12px">${d}</div></div><span style="margin-left:auto">${chip(s, tone)}</span></div>`).join('')}
<div style="padding:12px 14px"><span class="b b-sm">${icon('plus', C.ink, 12)} Pair a node</span></div></div>
<div style="margin-top:24px">${sectionTitle('ALERTS')}
<div style="display:grid;gap:8px">${alerts.map(([tone, t, d, time]) => `<div style="display:flex;gap:10px;padding:12px 14px;background:${TONES[tone].bg};box-shadow:inset 0 0 0 1px ${TONES[tone].ring}"><span class="dot" style="background:${TONES[tone].dot};margin-top:6px"></span><div style="min-width:0"><b style="font-size:13px;color:${TONES[tone].text}">${t}</b><p class="muted" style="font-size:12px;margin-top:2px">${d}</p></div><span class="mono hint" style="margin-left:auto;font-size:11px">${time}</span></div>`).join('')}</div></div></div></div>
${ann(1, 244, 214)}${ann(2, 560, 444)}${ann(3, 244, 790)}${ann(4, 1184, 365)}${ann(5, 1184, 672)}`;
  return screen({ id: 'hud/web-01-home', body: webShell({ active: 'Home', eyebrow: 'BROADCAST · SAT 4 OCT · KVO 2026', title: 'Tonight’s shows', sub: 'Every match on the schedule becomes a show. Nodes run them; you step in only when something needs a person.', actions: '<span class="b">Install desktop app</span><span class="b b-pri">New show</span>', body }) });
}

export function showSetup() {
  const step = (n, t, s, state) => `<div class="row" style="gap:12px;padding:12px 14px;${state === 'on' ? `background:rgba(255,255,255,.05);box-shadow:inset 2px 0 0 ${C.ink}` : ''}"><span class="mono" style="width:24px;height:24px;display:flex;align-items:center;justify-content:center;font-size:11px;${state === 'done' ? `background:${C.ink};color:${C.stage}` : 'box-shadow:inset 0 0 0 1px rgba(255,255,255,.25)'}">${state === 'done' ? '✓' : n}</span><div><b style="font-size:13.5px">${t}</b><div class="hint" style="font-size:11.5px">${s}</div></div></div>`;
  const pack = (name, src, on, tag) => `<div style="position:relative">${monitor(img(src), { w: 222, label: tag, tone: on ? 'pvw' : 'idle' })}<div class="row" style="justify-content:space-between;margin-top:8px"><b style="font-size:13px">${name}</b>${on ? chip('Selected', 'warning') : '<span class="hint" style="font-size:11.5px">45 graphics</span>'}</div></div>`;
  const body = `<div style="display:grid;grid-template-columns:270px 1fr;gap:28px">
<div class="box" style="padding:6px 0;align-self:start">${step(1, 'Tournament', 'KVO 2026 · Playoffs', 'done')}${step(2, 'HUD pack', 'Look and graphics', 'on')}${step(3, 'Brand & talent', 'Synced from teams', '')}${step(4, 'Nodes & crew', 'Who runs it', '')}
<div class="sep" style="margin:8px 0"></div><div style="padding:10px 14px"><div class="cap" style="font-size:9px">COVERAGE</div><p class="muted" style="font-size:12.5px;margin-top:6px">14 matches · Playoffs (upper and lower) · auto-adds new matches when the bracket advances.</p></div></div>
<div>
<div class="box" style="padding:18px 20px">${sectionTitle('HUD PACK', '<span class="seg"><span class="on">Esportra packs</span><span>My packs</span><span>Studio (soon)</span></span>')}
<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px">${pack('Esportra Broadcast', 'ingame.jpg', true, 'IN-GAME')}${pack('Esportra Broadcast · Lite', 'scorebug.jpg', false, 'SCOREBUG')}${pack('Holding & breaks', 'starting-soon.jpg', false, 'HOLDING')}${pack('Map veto & intro', 'map-veto.jpg', false, 'VETO')}</div></div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:16px">
<div class="box" style="padding:18px 20px">${sectionTitle('THEME')}
<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
<div><div class="lbl">Accent for team frames</div><div class="seg"><span class="on">Team colours</span><span>Event colour</span></div></div>
<div><div class="lbl">Event bug</div><div class="field">KVO 2026 · Playoffs</div></div>
<div><div class="lbl">Sponsor rotation</div><div class="field">Every 8 s · 3 sponsors</div></div>
<div><div class="lbl">Stinger</div><div class="field row" style="gap:8px">${icon('play', C.secondary, 12)} esportra-stinger.webm · 600 ms</div></div></div>
<div class="row" style="gap:10px;margin-top:16px"><span class="tog on"></span><span style="font-size:13px">Use each team’s colours from their Esportra profile</span></div></div>
<div class="box" style="padding:18px 20px">${sectionTitle('SYNCED FROM THE TOURNAMENT', chip('Live sync', 'success'))}
<table class="tbl"><tr><th>Team</th><th>Logo</th><th>Colour</th><th>Roster</th></tr>
${[NO, C5, LL, BF].map((t, i) => `<tr><td><b>${t[2]}</b></td><td>${crestMini(t[0], t[1], 22, i)}</td><td><span style="display:inline-block;width:26px;height:12px;background:hsl(${t[1]} 70% 55%)"></span></td><td class="muted">5 + 1 sub</td></tr>`).join('')}</table>
<p class="hint" style="font-size:12px;margin-top:10px">Edits made by teams update every graphic within seconds. Override per show in Brand & talent.</p></div></div>
<div class="box" style="padding:16px 20px;margin-top:16px">${sectionTitle('WHAT YOUR CREW GETS FROM THIS PACK', '<span class="hint" style="font-size:12px">Per node · 1920×1080 browser sources</span>')}
<div class="row" style="gap:10px;flex-wrap:wrap">${[['In-game', '1 source · 12 layers'], ['Between rounds', 'Economy, recap, scoreboard'], ['Full-screen scenes', 'Intro, veto, result, series'], ['Holding', 'Starting soon, BRB, ending'], ['Stinger', 'Live + webm/mov']].map(([t, d]) => `<div style="flex:1;min-width:180px;padding:12px 14px;background:rgba(255,255,255,.03);box-shadow:inset 0 0 0 1px rgba(255,255,255,.07)"><b style="font-size:13px">${t}</b><div class="hint" style="font-size:11.5px;margin-top:2px">${d}</div></div>`).join('')}</div></div>
<div class="row" style="justify-content:space-between;margin-top:18px"><span class="b">Back</span><div class="row" style="gap:10px"><span class="b">Preview on a node</span><span class="b b-pri">Continue to brand & talent</span></div></div>
</div></div>
${ann(1, 244, 196)}${ann(2, 542, 196)}${ann(3, 1052, 462)}${ann(4, 542, 830)}${ann(5, 542, 950)}`;
  return screen({ id: 'hud/web-02-show-setup', body: webShell({ active: 'Shows', eyebrow: 'SHOWS · NEW SHOW · STEP 2 OF 4', title: 'KVO 2026 Playoffs show', sub: 'Pick the look once. Every match in the playoffs inherits it, and new matches join as the bracket advances.', actions: '<span class="b">Save draft</span>', body }) });
}

export function rundown() {
  const thumb = (f) => `<span style="width:56px;height:32px;flex:none;background:#000 url('${img(f)}') center/cover;box-shadow:inset 0 0 0 1px rgba(255,255,255,.12)"></span>`;
  const seg = (n, name, trigger, graphics, scene, hold, opts = {}) => `<div class="row" style="gap:12px;padding:7px 14px;${opts.on ? `background:rgba(255,255,255,.05);box-shadow:inset 2px 0 0 ${C.ink}` : ''};border-bottom:1px solid rgba(255,255,255,.05)">
<span style="color:${C.disabled}">${icon('drag', 'currentColor', 14)}</span><span class="mono hint" style="width:18px;font-size:11px">${n}</span>
<div style="width:190px;min-width:0"><b style="font-size:13.5px">${name}</b><div class="hint" style="font-size:11.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${trigger}</div></div>
<div class="row" style="gap:6px;width:190px">${graphics.map(thumb).join('')}</div>
<span class="chip" style="color:${C.label};box-shadow:inset 0 0 0 1px rgba(255,255,255,.14)">${icon('scenes', C.secondary, 11)} ${scene}</span>
<span class="mono hint" style="font-size:11px;margin-left:auto">${hold}</span><span class="tog ${opts.manual ? '' : 'on'}"></span></div>`;
  const rules = [['Buy phase starts', 'Economy board · In-game layer', 'Auto'], ['Round ends', 'Round recap · 6 s', 'Auto'], ['Tech pause called', 'Pause panel + scene BRB', 'Hold 3 s'], ['Observer replay key', 'Replay bug + scene Replay', 'Manual']];
  const body = `<div style="display:grid;grid-template-columns:1fr 420px;gap:22px">
<div><div class="box">${sectionTitle('<span style="padding:14px 14px 0;display:block">SEGMENTS · BEST OF 3</span>')}
${seg(1, 'Starting soon', 'Match room opens · T−15 min', ['starting-soon.jpg'], 'Holding', '—')}
${seg(2, 'Match intro', 'Both teams checked in', ['match-intro.jpg'], 'Fullscreen', 'Hold 5 s')}
${seg(3, 'Map veto', 'Live from the Esportra veto', ['map-veto.jpg'], 'Fullscreen', 'Auto')}
${seg(4, 'Agent select', 'GEP: agent select phase', ['agent-select.jpg'], 'Fullscreen', 'Auto')}
${seg('5×', 'Map · live rounds', 'GEP: round live · repeats per map', ['ingame.jpg', 'economy.jpg', 'round-recap.jpg'], 'Gameplay', 'Rules ↓')}
${seg(6, 'Halftime', 'Round 12 ends', ['halftime.jpg'], 'Fullscreen', 'Hold 5 s')}
${seg(7, 'Map result', 'Map ends · winner known', ['map-result.jpg', 'series.jpg'], 'Fullscreen', 'Hold 5 s', { on: true })}
${seg(8, 'Series result', 'Series decided', ['champion.jpg'], 'Fullscreen', 'Manual', { manual: true })}
${seg(9, 'Next match', 'Bracket advances', ['schedule.jpg'], 'Holding', 'Auto')}</div>
<div class="box" style="margin-top:16px;padding:14px 16px">${sectionTitle('IN-ROUND RULES · RUN INSIDE “MAP · LIVE ROUNDS”')}
<table class="tbl"><tr><th>When</th><th>Then</th><th>Mode</th></tr>${rules.map(([w, t, m]) => `<tr><td style="padding:8px 12px">${w}</td><td class="muted">${t}</td><td>${m === 'Auto' ? chip('Auto', 'success') : m === 'Manual' ? chip('Manual', 'neutral') : chip(m, 'warning')}</td></tr>`).join('')}</table></div></div>
<div class="box" style="padding:18px 18px;align-self:start">
<div class="row" style="justify-content:space-between"><span class="cap">RULE · MAP RESULT</span>${icon('x', C.hint, 14)}</div>
<div style="margin-top:16px"><div class="lbl">When</div><div class="field row" style="gap:8px">${icon('bolt', AMBER, 13)} Map ends <span class="hint">· winner known</span></div></div>
<div style="margin-top:12px"><div class="lbl">Only if</div><div class="field">Not in a tech pause <span class="hint" style="margin-left:6px">+ add condition</span></div></div>
<div style="margin-top:16px"><div class="lbl">Then, in order</div>
${[['1', 'OBS', 'Switch to scene “Fullscreen” with stinger'], ['2', 'Graphic', 'Map result · 12 s'], ['3', 'Graphic', 'Series · until next map'], ['4', 'Sponsor', 'Read “Arclight PC” on the ticker']].map(([n, k, t]) => `<div class="row" style="gap:10px;padding:10px 12px;margin-top:6px;background:rgba(255,255,255,.03);box-shadow:inset 0 0 0 1px rgba(255,255,255,.07)"><span class="mono hint" style="font-size:11px">${n}</span><span class="cap" style="font-size:9px;width:58px">${k}</span><span style="font-size:13px">${t}</span></div>`).join('')}
<div class="hint" style="font-size:12px;margin-top:8px">+ Add action · OBS, vMix, graphic, sponsor, wait</div></div>
<div style="margin-top:16px"><div class="lbl">Hold window</div><div class="row" style="gap:12px"><div class="seg"><span>Auto</span><span class="on">Hold 5 s</span><span>Manual</span></div></div>
<p class="hint" style="font-size:12px;margin-top:8px">The producer console counts down 5 s. Anyone can hold or skip; otherwise it takes on its own.</p></div>
<div class="sep" style="margin:16px 0"></div>
<div class="row" style="gap:10px"><span class="b b-cue">${icon('play', '#FDE68A', 12)} Test fire on simulator</span><span class="b b-pri" style="margin-left:auto">Save rule</span></div>
<div class="row" style="gap:8px;margin-top:12px;font-size:12px">${icon('check', C.success, 13)}<span class="muted">Last test 19:44:03 · 4 actions ok · 210 ms</span></div></div></div>
${ann(1, 244, 236)}${ann(2, 1124, 236)}${ann(3, 1124, 650)}${ann(4, 244, 700)}`;
  return screen({ id: 'hud/web-03-rundown', body: webShell({ active: 'Rundowns & rules', eyebrow: 'RUNDOWNS & RULES · KVO PLAYOFFS · BO3 TEMPLATE', title: 'Match rundown', sub: 'The show follows the tournament. Each segment knows what starts it, what goes on screen and which scene OBS cuts to.', actions: '<span class="b">Duplicate as Bo1</span><span class="b b-pri">Publish to nodes</span>', body }) });
}

export function liveMonitor() {
  const tile = ({ src, pvw, a, b, map, score, node, auto, secs, alert }) => `<div class="box" style="padding:12px;${alert ? `box-shadow:inset 0 0 0 1px ${TONES.warning.ring}` : ''}">
<div class="row" style="justify-content:space-between;margin-bottom:10px">${teamPair(a, b, 18)}${tally('pgm')}</div>
<div class="row" style="gap:8px;align-items:flex-start">${monitor(src, { w: 318, label: 'PGM' })}<div style="display:grid;gap:8px;flex:1;min-width:0">${monitor(pvw, { w: 114, label: 'PVW', tone: 'pvw' })}<div style="padding:8px 10px;background:rgba(255,255,255,.03);box-shadow:inset 0 0 0 1px rgba(255,255,255,.07)"><div class="t1" style="font-size:22px">${score}</div><div class="hint" style="font-size:11px;margin-top:4px">${map}</div></div></div></div>
${alert
    ? `<div class="row" style="gap:10px;margin-top:10px;padding:9px 12px;background:${TONES.warning.bg};box-shadow:inset 0 0 0 1px ${TONES.warning.ring}">${icon('alert', C.warning, 14)}<span style="font-size:12.5px;color:#FDE68A">${alert}</span><span class="b b-sm" style="margin-left:auto">Resume autopilot</span></div>`
    : `<div class="row" style="gap:10px;margin-top:10px;padding:9px 12px;background:rgba(255,255,255,.03);box-shadow:inset 0 0 0 1px rgba(255,255,255,.07)">${icon('bolt', AMBER, 14)}<span style="font-size:12.5px">Next <b>${auto}</b></span><span class="mono" style="color:#FDE68A;font-size:12px">in ${secs}</span><span class="b b-sm" style="margin-left:auto">Hold</span><span class="b b-sm b-pri">Take now</span></div>`}
<div class="row" style="gap:8px;margin-top:8px">${health('NODE', node)}${health('FEED', alert ? '—' : '42 ms', alert ? 'warning' : 'success')}</div></div>`;
  const body = `<div style="display:grid;grid-template-columns:1fr 1fr 290px;gap:14px">
${tile({ src: img('ingame-full.jpg'), pvw: img('round-recap.jpg'), a: NO, b: C5, map: 'Map 3 · Lotus · R24', score: '11 – 12', node: 'Studio PC', auto: 'Round recap', secs: '0:04' })}
${tile({ src: img('economy.jpg'), pvw: img('ingame.jpg'), a: LL, b: BF, map: 'Map 1 · Ascent · R7', score: '4 – 2', node: 'Booth B', alert: 'OBS reconnected after 9 s. Autopilot paused.' })}
<div class="box" style="grid-row:span 2;padding:14px;display:flex;flex-direction:column">${sectionTitle('NODE CHAT · STUDIO PC')}
${[['Ayesha · Producer', 'Holding the recap, casters want the replay first.', '19:43'], ['Studio PC', 'Hold applied · Round recap paused', '19:43'], ['Bilal · Ops', 'Booth B back on OBS. Resume when ready.', '19:42']].map(([w, t, time]) => `<div style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,.05)"><div class="row" style="justify-content:space-between"><b style="font-size:12.5px">${w}</b><span class="mono hint" style="font-size:10.5px">${time}</span></div><p class="muted" style="font-size:12.5px;margin-top:3px">${t}</p></div>`).join('')}
<div class="field" style="margin-top:auto;color:${C.disabled}">Message the node crew…</div>
<div style="margin-top:16px">${sectionTitle('INCIDENTS TODAY')}${[['warning', 'Booth B · OBS dropped 9 s'], ['neutral', 'Manual take · Studio PC · replay'], ['neutral', 'Score corrected · 11–12 (was 12–11)']].map(([t, d]) => `<div class="row" style="gap:8px;padding:6px 0;font-size:12.5px"><span class="dot" style="background:${TONES[t].dot}"></span>${d}</div>`).join('')}</div></div>
<div class="box" style="grid-column:span 2;padding:14px 16px">${sectionTitle('STARTING NEXT', '<span class="hint" style="font-size:12px">Nodes pick these up on their own</span>')}
<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px">${[[ZP, GU, '21:30 · Booth B', 'Countdown on air in 46 min'], [NO, LL, '22:00 · Studio PC', 'Waits for current series'], [BF, ZP, '22:45 · no node', 'Assign a node']].map(([a, b, t, s], i) => `<div style="padding:12px;background:rgba(255,255,255,.03);box-shadow:inset 0 0 0 1px ${i === 2 ? TONES.critical.ring : 'rgba(255,255,255,.07)'}">${teamPair(a, b, 16)}<div class="mono hint" style="font-size:11px;margin-top:8px">${t}</div><div style="font-size:12.5px;margin-top:4px;color:${i === 2 ? '#FCA5A5' : C.secondary}">${s}</div></div>`).join('')}</div></div></div>
<div class="box" style="position:absolute;left:268px;right:32px;bottom:26px;padding:14px 16px">${sectionTitle('SHOW TIMELINE · STUDIO PC · LAST 60 MIN', '<span class="row" style="gap:14px;font-size:11.5px" class="hint"><span class="row" style="gap:6px"><span style="width:10px;height:10px;background:rgba(255,255,255,.18)"></span><span class="hint">Auto take</span></span><span class="row" style="gap:6px"><span style="width:10px;height:10px;background:#FBBF24"></span><span class="hint">Hold</span></span><span class="row" style="gap:6px"><span style="width:10px;height:10px;background:#fff"></span><span class="hint">Manual take</span></span></span>')}
<div style="position:relative;height:34px;display:flex;gap:2px">${[['Starting soon', 8], ['Intro', 3], ['Veto', 5], ['Agents', 3], ['Map 1 · Ascent', 30], ['Result', 3], ['Map 2', 26], ['Result', 3], ['Map 3 · Lotus', 19]].map(([t, w], i) => `<div style="flex:${w};background:${i === 8 ? 'rgba(244,63,94,.18)' : 'rgba(255,255,255,.06)'};box-shadow:inset 0 0 0 1px ${i === 8 ? 'rgba(244,63,94,.5)' : 'rgba(255,255,255,.06)'};display:flex;align-items:center;padding:0 8px;font-size:11px;color:${C.secondary};white-space:nowrap;overflow:hidden">${t}</div>`).join('')}
${[12, 23, 31, 44, 58, 66, 71, 83, 90, 96].map((x, i) => `<span style="position:absolute;left:${x}%;top:-6px;width:3px;height:46px;background:${i === 4 || i === 9 ? '#FBBF24' : i === 7 ? '#fff' : 'rgba(255,255,255,.28)'}"></span>`).join('')}</div>
<div class="row" style="justify-content:space-between;margin-top:8px" ><span class="mono hint" style="font-size:10.5px">18:45</span><span class="mono hint" style="font-size:10.5px">19:15</span><span class="mono" style="font-size:10.5px;color:#FDA4AF">NOW 19:43</span></div></div>
${ann(1, 244, 178)}${ann(2, 548, 470)}${ann(3, 1000, 470)}${ann(4, 1250, 178)}${ann(5, 244, 600)}${ann(6, 244, 860)}`;
  return screen({ id: 'hud/web-04-live-monitor', body: webShell({ active: 'Live monitor', eyebrow: 'LIVE MONITOR · 2 ON AIR', title: 'Everything on air, from anywhere', sub: 'Remote eyes on every node. Hold or take from here; the node does the work.', actions: '<span class="seg"><span class="on">Grid</span><span>Focus</span></span>', body }) });
}
