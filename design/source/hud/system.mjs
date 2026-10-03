// System boards: how it works, states, components & motion, phone remote, onboarding.
import { C, TONES, AMBER, img, screen, webShell, ann, chip, tally, health, monitor, icon, crestMini, sectionTitle, mark, lockup } from '../hud-kit.mjs';
import { bezierSvg } from '../lib.mjs';

const boardHead = (kicker, title, note) => `<header class="row" style="justify-content:space-between;align-items:flex-end;gap:32px;padding-bottom:22px;border-bottom:1px solid rgba(255,255,255,.07)">
<div><div class="cap" style="margin-bottom:12px"><span style="display:inline-block;width:18px;height:2px;background:${C.cue};vertical-align:middle;margin-right:12px"></span>${kicker}</div><h1 class="t1" style="font-size:40px">${title}</h1></div>
<p class="muted" style="max-width:520px;font-size:13.5px;text-align:right">${note}</p></header>`;
const board = (id, inner, h = 1000) => screen({ id, h, body: `<div style="padding:44px 56px">${inner}</div><div class="cap" style="position:absolute;left:56px;right:56px;bottom:22px;display:flex;justify-content:space-between;font-size:9px"><span>ESPORTRA BROADCAST · UI/UX</span><span>${id}</span></div>` });

// ------------------------------------------------------------------ How it works
export function howItWorks() {
  const node = (x, y, w, h, title, sub, items, tone = 'neutral', extra = '') => `<div style="position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;padding:14px 16px;background:${C.panel};box-shadow:inset 0 0 0 1px ${tone === 'node' ? 'rgba(255,255,255,.35)' : 'rgba(255,255,255,.09)'}">
<div class="cap" style="font-size:9px">${sub}</div><b class="t1" style="display:block;font-size:18px;margin-top:6px">${title}</b>
<div style="margin-top:10px;display:grid;gap:4px">${items.map((t) => `<div class="row" style="gap:8px;font-size:12px;color:${C.secondary}"><span style="width:4px;height:4px;background:${C.hint}"></span>${t}</div>`).join('')}</div>${extra}</div>`;
  const arrow = (x1, y1, x2, y2, label, lx, ly, color = 'rgba(255,255,255,.45)') => `<svg style="position:absolute;left:0;top:0;overflow:visible" width="1" height="1"><defs><marker id="a${x1}${y1}" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0L8 4L0 8z" fill="${color}"/></marker></defs><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="1.5" marker-end="url(#a${x1}${y1})"/></svg><span class="mono" style="position:absolute;left:${lx}px;top:${ly}px;font-size:10.5px;line-height:1.5;color:${C.label};background:${C.stage};padding:2px 6px">${label}</span>`;
  const lanes = [['Esportra', ['Match room opens', 'Both checked in', 'Veto on Esportra', '—', '—', '—', 'Result verified', 'Bracket advances']],
    ['Node · autopilot', ['Load match', 'Hold 5 s → take', 'Feed bans/picks', 'GEP: agent select', 'GEP: round live', 'Replay key', 'Hold 5 s → take', 'Queue next match']],
    ['OBS scene', ['Holding', 'Fullscreen', 'Fullscreen', 'Fullscreen', 'Gameplay', 'Replay → back', 'Fullscreen', 'Holding']],
    ['On screen', ['Starting soon', 'Match intro', 'Map veto', 'Agent select', 'In-game HUD · rounds', 'Replay bug', 'Map result · series', 'Next match']]];
  const cols = ['T−15', 'CHECK-IN', 'VETO', 'AGENTS', 'ROUNDS', 'REPLAY', 'MAP ENDS', 'NEXT'];
  const inner = `${boardHead('SYSTEM · HOW IT WORKS', 'One state in, every screen out.', 'The web plans and watches. The desktop node runs the show next to OBS, so it keeps going without internet. OBS only ever switches scenes; the graphics inside them follow the match on their own.')}
<div style="position:relative;height:420px;margin-top:22px">
${node(0, 20, 300, 170, 'Esportra web', 'CLOUD · ANY BROWSER', ['Tournaments, schedule, veto, results', 'Shows, rundowns and rules', 'Live monitor, crew, reports', 'Broadcast hub (SignalR)'])}
${node(0, 230, 300, 150, 'Observer PC', 'VALORANT OBSERVER', ['Esportra app · capture only', 'GEP → node over LAN', 'Replay and flag hotkeys'])}
${node(520, 60, 400, 300, 'Production node', 'ESPORTRA BROADCAST · DESKTOP', ['Show runner and autopilot (rundown + rules)', 'Local HUD server :5300 · snapshot + patch', 'GEP ingest and fallbacks', 'OBS / vMix controller', 'Producer console · offline queue'], 'node', `<div class="row" style="gap:8px;margin-top:14px">${health('GEP', '38 ms')}${health('OBS', 'linked')}</div>`)}
${node(1140, 20, 348, 230, 'OBS Studio', 'SAME PC OR LAN', ['Scenes: Holding, Gameplay, Fullscreen, Replay, Casters', 'Browser sources from :5300', 'Your game feed and cameras', 'obs-websocket on :4455'], 'neutral', `<div class="row" style="gap:6px;margin-top:10px">${tally('pgm')}${tally('pvw')}</div>`)}
${node(1140, 290, 348, 100, 'Stream', 'RTMP / SRT', ['Twitch · YouTube · Kick'])}
${arrow(300, 105, 516, 140, 'matches · rules · results<br>⇄ SignalR', 318, 52)}
${arrow(300, 300, 516, 270, 'GEP events · LAN', 336, 300)}
${arrow(920, 150, 1136, 110, 'obs-websocket<br>scene · transition · replay', 930, 154)}
${arrow(920, 270, 1136, 230, 'state → browser sources (ws)', 928, 278)}
${arrow(1314, 250, 1314, 286, 'program out', 1324, 258)}
</div>
<div class="cap" style="margin-top:6px">A MATCH, START TO FINISH</div>
<div style="display:grid;grid-template-columns:150px repeat(8,1fr);gap:2px;margin-top:12px">
<span></span>${cols.map((c, i) => `<div class="mono" style="font-size:10px;padding:6px 8px;color:${i === 4 ? '#FDA4AF' : C.hint};letter-spacing:.14em">${c}</div>`).join('')}
${lanes.map(([lane, cells], li) => `<div class="cap" style="font-size:9px;padding:12px 8px;align-self:center">${lane}</div>${cells.map((t, i) => `<div style="padding:10px;font-size:12px;background:${li === 2 && t === 'Gameplay' ? 'rgba(244,63,94,.12)' : 'rgba(255,255,255,.035)'};box-shadow:inset 0 0 0 1px ${li === 2 && t === 'Gameplay' ? 'rgba(244,63,94,.4)' : 'rgba(255,255,255,.06)'};color:${t === '—' ? C.disabled : li === 1 && t.includes('Hold') ? '#FDE68A' : C.label}">${t}</div>`).join('')}`).join('')}</div>
<p class="hint" style="font-size:12px;margin-top:14px">Rounds never switch scenes: economy, recap, spike timer and banners appear inside the in-game HUD from rules. Amber = a 5 s hold window anyone can stop.</p>`;
  return board('hud/sys-15-how-it-works', inner);
}

// ------------------------------------------------------------------ States board
export function states() {
  const card = (title, tone, where, body, copy, action) => `<div style="background:${C.panel};box-shadow:inset 0 0 0 1px rgba(255,255,255,.08);display:flex;flex-direction:column">
<div style="height:150px;position:relative;overflow:hidden;background:#0b0b0d;border-bottom:1px solid rgba(255,255,255,.06)">${body}</div>
<div style="padding:14px 16px;display:flex;flex-direction:column;gap:6px;flex:1"><div class="row" style="justify-content:space-between"><b style="font-size:14px">${title}</b>${chip(where, tone)}</div><p class="muted" style="font-size:12.5px;line-height:1.5">${copy}</p><span class="hint" style="font-size:11.5px;margin-top:auto">${action}</span></div></div>`;
  const banner = (tone, t) => `<div class="row" style="position:absolute;left:12px;right:12px;top:12px;gap:8px;padding:8px 10px;background:${TONES[tone].bg};box-shadow:inset 0 0 0 1px ${TONES[tone].ring}"><span class="dot" style="background:${TONES[tone].dot}"></span><span style="font-size:11.5px;color:${TONES[tone].text}">${t}</span></div>`;
  const sk = (w, h, t, l) => `<div style="position:absolute;left:${l}px;top:${t}px;width:${w}px;height:${h}px;background:rgba(255,255,255,.06)"></div>`;
  const inner = `${boardHead('SYSTEM · STATES', 'Every failure has a designed answer.', 'Graphics never depend on OBS or the internet, so most failures pause automation instead of breaking the show. Each state says what happened, what still works and the one thing to do.')}
<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-top:24px">
${card('OBS disconnected', 'warning', 'Console', `${banner('warning', 'OBS lost · autopilot paused · retrying')}<div style="position:absolute;left:12px;right:12px;bottom:12px;height:70px;background:#000 url('${img('ingame.jpg')}') center/cover;opacity:.5"></div>`, 'Graphics keep updating inside OBS’s last scene. No automatic takes until OBS is back.', 'Action: Resume autopilot (appears on reconnect)')}
${card('Game feed stale', 'warning', 'Console', `${banner('warning', 'GEP silent for 12 s · live stats frozen')}<div class="mono" style="position:absolute;left:12px;bottom:14px;font-size:11px;color:${C.hint}">last event 20:53:41</div>`, 'Stats freeze with a small “feed paused” tag on screen. Scores can be kept by hand.', 'Action: Check observer PC · Switch to manual score')}
${card('Output dropped', 'critical', 'Outputs', `<div style="position:absolute;inset:12px;display:grid;grid-template-columns:1fr 1fr;gap:6px"><div style="background:#000 url('${img('casters.jpg')}') center/cover;opacity:.35;box-shadow:inset 0 0 0 2px ${C.critical}"></div><div style="background:#000 url('${img('holding.jpg')}') center/cover;opacity:.6"></div></div>`, 'Casters source closed in OBS 40 s ago. Usually a hidden scene with “shutdown when not visible” on.', 'Action: Open in OBS · Show me how')}
${card('Node offline', 'critical', 'Web', `${banner('critical', 'Booth B offline since 20:31')}<div style="position:absolute;left:12px;right:12px;bottom:12px" class="hint"><span style="font-size:11.5px">Its next match: Zero Ping vs Ghost Unit · 21:30</span></div>`, 'Web shows when it was last seen and what it was meant to run next.', 'Action: Move next match to another node')}
${card('Match rescheduled', 'neutral', 'Web + node', `${banner('neutral', '21:00 → 21:30 · countdown updated')}<div class="t1" style="position:absolute;left:12px;bottom:12px;font-size:40px">21:30</div>`, 'Rundown and the starting-soon countdown shift on their own. Nobody touches OBS.', 'No action needed')}
${card('Forfeit', 'neutral', 'Node', `${banner('neutral', 'Ghost Unit forfeited · series ends')}<div style="position:absolute;left:12px;right:12px;bottom:12px;height:60px;background:#000 url('${img('schedule.jpg')}') center/cover;opacity:.55"></div>`, 'Autopilot skips to the result card with a forfeit label, then the next match.', 'Action: Hold to keep casters on the desk')}
${card('No shows yet', 'neutral', 'Web · empty', `<div style="position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;padding:0 18px"><b style="font-size:15px">No shows yet.</b><span class="hint" style="font-size:12px;margin-top:4px">Link a tournament and every match becomes one.</span></div>`, 'Empty states say when content will appear and offer the one next step.', 'Action: New show')}
${card('Loading', 'neutral', 'Console', `${sk(130, 74, 14, 12)}${sk(130, 74, 14, 150)}${sk(260, 10, 104, 12)}${sk(180, 10, 122, 12)}`, 'Skeletons take the real layout’s shape. Monitors show the last frame, never a spinner.', 'Lasts under a second on a paired node')}
</div>`;
  return board('hud/sys-16-states', inner, 790);
}

// ------------------------------------------------------------------ Components & motion
export function components() {
  const st = (label, cls, style = '') => `<div><span class="b ${cls}" style="${style}">${label}</span></div>`;
  const ring = (n, p) => `<div style="position:relative;width:54px;height:54px"><svg width="54" height="54" viewBox="0 0 54 54"><circle cx="27" cy="27" r="23" fill="none" stroke="rgba(255,255,255,.1)" stroke-width="4"/><circle cx="27" cy="27" r="23" fill="none" stroke="${n === 'TAKE' ? C.cue : AMBER}" stroke-width="4" stroke-dasharray="144.5" stroke-dashoffset="${144.5 * (1 - p)}" transform="rotate(-90 27 27)"/></svg><span class="t1" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:${n === 'TAKE' ? 10 : 18}px">${n}</span></div>`;
  const inner = `${boardHead('SYSTEM · COMPONENTS & MOTION', 'Fast hands, calm screen.', 'Rose means on air and nothing else. Amber means cued or counting down. White is the action. Every control has a hotkey, and motion only marks a change of state.')}
<div style="display:grid;grid-template-columns:1.1fr 1fr;gap:44px;margin-top:24px">
<div>
<div class="cap" style="margin-bottom:12px">TAKE / CUE / HOLD · STATES</div>
<div style="display:grid;grid-template-columns:90px repeat(5,1fr);gap:10px 10px;align-items:center">
<span></span>${['REST', 'HOVER', 'FOCUS', 'PRESSED', 'DISABLED'].map((s) => `<span class="cap" style="font-size:8.5px">${s}</span>`).join('')}
<span class="cap" style="font-size:9px">TAKE</span>${st('Take', 'b-take')}${st('Take', 'b-take', 'background:#E11D48;border-color:#E11D48')}${st('Take', 'b-take', 'box-shadow:0 0 0 2px #09090B,0 0 0 4px rgba(255,255,255,.5)')}${st('Take', 'b-take', 'transform:translateY(1px);background:#BE123C;border-color:#BE123C')}${st('Take', 'b-take', 'opacity:.35')}
<span class="cap" style="font-size:9px">HOLD</span>${st('Hold', 'b-cue')}${st('Hold', 'b-cue', 'background:rgba(251,191,36,.2)')}${st('Hold', 'b-cue', 'box-shadow:0 0 0 2px #09090B,0 0 0 4px rgba(255,255,255,.5)')}${st('Held', 'b-cue', `background:${AMBER};color:${C.stage}`)}${st('Hold', 'b-cue', 'opacity:.35')}
<span class="cap" style="font-size:9px">PRIMARY</span>${st('Start', 'b-pri')}${st('Start', 'b-pri', 'background:#E4E4E7')}${st('Start', 'b-pri', 'box-shadow:0 0 0 2px #09090B,0 0 0 4px rgba(255,255,255,.5)')}${st('Start', 'b-pri', 'transform:translateY(1px)')}${st('Start', 'b-pri', 'opacity:.35')}
<span class="cap" style="font-size:9px">SECONDARY</span>${st('Skip', '')}${st('Skip', '', 'border-color:rgba(255,255,255,.35)')}${st('Skip', '', 'box-shadow:0 0 0 2px #09090B,0 0 0 4px rgba(255,255,255,.5)')}${st('Skip', '', 'background:rgba(255,255,255,.08)')}${st('Skip', '', 'opacity:.35')}</div>
<div class="cap" style="margin:26px 0 12px">TALLY · CHIPS · TOGGLES</div>
<div class="row" style="gap:10px;flex-wrap:wrap">${tally('pgm')}${tally('pvw')}${tally('off')}${chip('Auto', 'warning')}${chip('Live', 'success')}${chip('Covered', 'warning')}${chip('Not in OBS', 'critical')}<span class="tog on"></span><span class="tog"></span><span class="seg"><span class="on">LAN</span><span>This PC</span></span></div>
<div class="cap" style="margin:26px 0 12px">MONITORS</div>
<div class="row" style="gap:14px">${monitor(img('round-recap.jpg'), { w: 250, label: 'PVW', tone: 'pvw' })}${monitor(img('ingame-full.jpg'), { w: 250, label: 'PGM', tone: 'pgm' })}${monitor(img('holding.jpg'), { w: 150, label: 'READY', tone: 'idle' })}</div></div>
<div>
<div class="cap" style="margin-bottom:12px">HOLD COUNTDOWN · 5 S, THEN TAKE</div>
<div class="row" style="gap:14px">${ring('5', 1)}${ring('4', 0.8)}${ring('3', 0.6)}${ring('2', 0.4)}${ring('1', 0.2)}${ring('TAKE', 1)}</div>
<p class="hint" style="font-size:12px;margin-top:10px">Ring drains linearly each second. H holds (ring freezes amber, card says “Held by Ayesha”), S skips, Space takes now.</p>
<div class="cap" style="margin:24px 0 12px">TAKE · PVW → PGM</div>
<div class="row" style="gap:10px">${[0, 1, 2].map((f) => `<div style="position:relative;width:150px;height:84px;background:#000 url('${img('ingame-full.jpg')}') center/cover;box-shadow:inset 0 0 0 2px ${C.cue};overflow:hidden"><div style="position:absolute;inset:0 ${100 - f * 50}% 0 0;background:#000 url('${img('round-recap.jpg')}') left/150px 84px;box-shadow:inset -2px 0 0 #fff"></div><span class="mono" style="position:absolute;right:6px;bottom:4px;font-size:9px;background:rgba(0,0,0,.7);padding:1px 4px">${['0 ms', '120 ms', '240 ms'][f]}</span></div>`).join('')}</div>
<p class="hint" style="font-size:12px;margin-top:10px">Monitors mirror OBS: the console never animates a take OBS didn’t make. Stinger takes show the stinger’s cut point (600 ms).</p>
<div class="cap" style="margin:24px 0 12px">EASING</div>
<div class="row" style="gap:20px">${[['Enter', [0.2, 0, 0, 1], '180 ms'], ['Exit', [0.4, 0, 1, 1], '120 ms'], ['Alert in', [0.3, 0, 0, 1], '240 ms']].map(([n, b, d]) => `<div>${bezierSvg(b, 130, 80, C.ink)}<div class="row" style="justify-content:space-between;margin-top:6px"><b style="font-size:12.5px">${n}</b><span class="mono hint" style="font-size:11px">${d}</span></div></div>`).join('')}</div>
<p class="hint" style="font-size:12px;margin-top:10px">Reduced motion: rings become a number, wipes become cuts, slide-ins become fades.</p></div></div>`;
  return board('hud/sys-17-components-motion', inner, 740);
}

// ------------------------------------------------------------------ Phone remote
export function phone() {
  const frame = (title, inner) => `<div style="display:flex;flex-direction:column;align-items:center"><div style="width:300px;height:640px;background:${C.stage};border-radius:34px;box-shadow:0 0 0 8px #18181b,0 0 0 9px #2a2a2e;overflow:hidden;position:relative;padding:44px 16px 16px">${inner}</div><b class="t1" style="font-size:16px;margin-top:20px">${title}</b></div>`;
  const head = `<div class="row" style="justify-content:space-between">${mark(14)}<span class="mono hint" style="font-size:10px">STUDIO PC</span>${tally('pgm')}</div>`;
  const inner = `${boardHead('SYSTEM · PHONE REMOTE', 'The floor producer’s pocket console.', 'Opens from a QR on the desktop app. Same session as the console, so a hold on the phone shows there instantly. Thumb-sized targets, one decision per screen.')}
<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:24px;margin-top:30px">
${frame('Now / next', `${head}<div style="margin-top:14px">${monitor(img('ingame-full.jpg'), { w: 268, label: 'PGM' })}</div>
<div style="margin-top:14px;padding:14px;background:rgba(251,191,36,.07);box-shadow:inset 0 0 0 1px rgba(251,191,36,.45)"><div class="cap" style="font-size:9px;color:#FDE68A">NEXT IN 3</div><b style="font-size:17px;display:block;margin-top:6px">Round recap</b><div class="hint" style="font-size:12px">Between-rounds layer · 6 s</div></div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px"><span class="b b-cue" style="height:56px">HOLD</span><span class="b" style="height:56px">SKIP</span></div><span class="b b-take" style="height:56px;width:100%;margin-top:8px">TAKE NOW</span>`)}
${frame('Triggers', `${head}<div class="cap" style="margin-top:18px;font-size:9px">ONE TAP · CONFIRMS ON AIR</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px">${['Tech pause', 'Timeout', 'Replay', 'Toast', 'Caster L3', 'Poll', 'Stinger', 'Sponsor'].map((t, i) => `<div style="height:74px;padding:10px;background:${i === 0 ? 'rgba(251,191,36,.08)' : 'rgba(255,255,255,.04)'};box-shadow:inset 0 0 0 1px ${i === 0 ? 'rgba(251,191,36,.4)' : 'rgba(255,255,255,.1)'};display:flex;align-items:flex-end"><b style="font-size:13px">${t}</b></div>`).join('')}</div>`)}
${frame('Alerts', `${head}<div style="margin-top:16px;display:grid;gap:8px">${[['warning', 'OBS reconnected', 'Autopilot paused · tap to resume'], ['neutral', 'Observer flagged a moment', 'R23 · 20:52:40 · add replay?'], ['success', 'Map 2 verified', 'Bracket updated']].map(([t, a, b]) => `<div style="padding:12px;background:${TONES[t].bg};box-shadow:inset 0 0 0 1px ${TONES[t].ring}"><b style="font-size:13px;color:${TONES[t].text}">${a}</b><p class="muted" style="font-size:12px;margin-top:3px">${b}</p></div>`).join('')}</div><span class="b b-pri" style="width:100%;height:52px;margin-top:14px">Resume autopilot</span>`)}</div>`;
  return board('hud/sys-18-phone-remote', inner, 920);
}

// ------------------------------------------------------------------ Onboarding
export function onboarding() {
  const step = (n, t, d, state, action = '') => `<div class="row" style="gap:16px;padding:16px 18px;border-bottom:1px solid rgba(255,255,255,.05);${state === 'now' ? 'background:rgba(255,255,255,.04)' : ''}">
<span class="mono" style="width:30px;height:30px;flex:none;display:flex;align-items:center;justify-content:center;font-size:12px;${state === 'done' ? `background:${C.ink};color:${C.stage}` : state === 'now' ? `box-shadow:inset 0 0 0 2px ${C.ink}` : 'box-shadow:inset 0 0 0 1px rgba(255,255,255,.2)'}">${state === 'done' ? '✓' : n}</span>
<div style="min-width:0;flex:1"><b style="font-size:14.5px;${state === 'todo' ? `color:${C.secondary}` : ''}">${t}</b><p class="hint" style="font-size:12.5px;margin-top:2px">${d}</p></div>${action}</div>`;
  const body = `<div style="display:grid;grid-template-columns:1fr 420px;gap:24px">
<div class="box">${step(1, 'Link a tournament', 'KVO 2026 Playoffs · 14 matches become shows', 'done')}
${step(2, 'Choose the look', 'Esportra Broadcast pack · team colours on', 'done')}
${step(3, 'Install the desktop app on the streaming PC', 'Windows 10/11 · includes game capture support · 140 MB', 'done')}
${step(4, 'Pair the PC', 'Type the code the app shows', 'now', '<div class="row" style="gap:8px"><span class="field mono" style="width:150px;letter-spacing:.2em">QK7·48_</span><span class="b b-pri">Pair</span></div>')}
${step(5, 'Connect OBS', 'Turn on Tools → WebSocket Server in OBS. The app finds it.', 'todo')}
${step(6, 'Build the scenes', 'One click creates Holding, Gameplay, Fullscreen, Replay, Casters', 'todo')}
${step(7, 'Set up the observer PC', 'Same app, “Capture only”. Sends game data over the LAN.', 'todo')}
${step(8, 'Rehearse with a recorded match', 'Runs the whole show without the game. Nothing goes live.', 'todo')}
${step(9, 'Invite your crew', 'Producer, observer, crew — each sees only their part', 'todo')}</div>
<div style="display:flex;flex-direction:column;gap:16px">
<div class="box" style="padding:18px">${sectionTitle('YOUR SETUP SO FAR')}<div class="t1" style="font-size:44px">3 / 9</div><div class="bar" style="margin-top:12px"><i style="width:33%"></i></div><p class="hint" style="font-size:12.5px;margin-top:10px">About 12 minutes left. You can stop any time; we keep your place.</p></div>
<div class="box" style="padding:18px">${sectionTitle('WHAT YOU’LL HAVE')}${['Every match on the schedule runs as a show', 'OBS switches scenes on its own, with a 5 s hold you control', 'Results go straight into the bracket', 'Sponsor proof and VOD chapters after every series'].map((t) => `<div class="row" style="gap:10px;padding:7px 0;font-size:13px">${icon('check', C.success, 14)}${t}</div>`).join('')}</div>
<div class="box2" style="padding:16px"><div class="cap" style="font-size:9px">NEED A HAND?</div><p class="muted" style="font-size:12.5px;margin-top:8px">Book a 15-minute setup call, or open the step-by-step guide with screenshots.</p><div class="row" style="gap:8px;margin-top:12px"><span class="b b-sm">Open guide</span><span class="b b-sm">Book a call</span></div></div></div></div>
${ann(1, 244, 196)}${ann(2, 244, 444)}${ann(3, 1126, 196)}`;
  return screen({ id: 'hud/sys-19-onboarding', body: webShell({ active: 'Home', eyebrow: 'BROADCAST · GET STARTED', title: 'Set up your first show', sub: 'Nine steps, most of them one click. Your crew only ever adds browser sources.', actions: '<span class="b">Skip for now</span>', body }) });
}
