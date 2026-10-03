// Desktop: Esportra Broadcast app (production node). Sample names are fictional; monitors show the HUD's own demo renders.
import { C, TONES, AMBER, img, screen, desktopShell, ann, chip, tally, health, monitor, icon, crestMini, sectionTitle, mark } from '../hud-kit.mjs';

const check = (label, detail, tone = 'success', action = '') => `<div class="row" style="gap:12px;padding:12px 14px;border-bottom:1px solid rgba(255,255,255,.05)">
<span style="width:22px;height:22px;display:flex;align-items:center;justify-content:center;background:${TONES[tone].bg};box-shadow:inset 0 0 0 1px ${TONES[tone].ring}">${tone === 'success' ? icon('check', C.success, 13) : tone === 'warning' ? icon('alert', C.warning, 13) : icon('clock', C.hint, 13)}</span>
<div style="min-width:0"><b style="font-size:13.5px">${label}</b><div class="hint" style="font-size:12px">${detail}</div></div><span style="margin-left:auto">${action}</span></div>`;

export function pair() {
  const body = `<div style="position:absolute;inset:0;display:grid;grid-template-columns:460px 1fr;gap:0">
<div style="padding:40px 40px;border-right:1px solid rgba(255,255,255,.06);background:#0a0a0c">
<div class="cap">THIS PC · PAIRED</div>
<h2 class="t1" style="font-size:30px;margin-top:12px">Studio PC</h2>
<p class="muted" style="font-size:13.5px;margin-top:8px">Paired to <b style="color:${C.ink}">Arena One</b>. The web dashboard sees this PC as a production node.</p>
<div class="box2" style="margin-top:24px;padding:16px"><div class="cap" style="font-size:9px">PAIR ANOTHER PC</div><div class="mono" style="font-size:34px;font-weight:700;letter-spacing:.18em;margin-top:10px">QK7·48X</div><p class="hint" style="font-size:12px;margin-top:6px">Enter in Esportra → Broadcast → Production nodes. Expires in 9:41.</p></div>
<div style="margin-top:28px"><div class="lbl">Show</div><div class="field row" style="justify-content:space-between">KVO 2026 · Playoffs ${icon('chevron', C.hint, 13)}</div></div>
<div style="margin-top:14px"><div class="lbl">Match on this node</div><div class="field row" style="justify-content:space-between"><span class="row" style="gap:8px">${crestMini('NO', 265, 18, 0)} Night Owls vs ${crestMini('C5', 0, 18, 2)} Crimson Five</span>${chip('Auto', 'success')}</div>
<p class="hint" style="font-size:12px;margin-top:8px">Auto picks the next match the rundown assigns here. Change it only to cover for another node.</p></div>
<div class="row" style="gap:10px;margin-top:22px"><span class="tog on"></span><span style="font-size:13px">Start with Windows and resume the show after a restart</span></div></div>
<div style="padding:40px 48px;overflow:hidden">
<div class="row" style="justify-content:space-between"><div><div class="cap">READINESS · 20:14 · MATCH ROOM OPENS IN 16 MIN</div><h2 class="t1" style="font-size:30px;margin-top:12px">Ready when you are</h2></div>${chip('7 of 8 ready', 'warning')}</div>
<div class="box" style="margin-top:22px">
${check('Esportra', 'Signed in as Ayesha Raza · Producer')}
${check('Show and match', 'KVO 2026 Playoffs · Upper semi-final · Bo3 rundown loaded')}
${check('Game data', 'Observer PC 1 is feeding GEP · 38 ms · 11 of 11 features', 'success', health('GEP', '38 ms'))}
${check('OBS', 'OBS 30.2 on this PC · Studio Mode on · obs-websocket connected', 'success', health('OBS', 'Studio PC'))}
${check('Scenes', 'Holding, Gameplay, Fullscreen, Replay, Casters · all mapped')}
${check('Browser sources', '5 of 6 connected · Casters not added in OBS', 'warning', '<span class="b b-sm">Add for me</span>')}
${check('Talent', 'Casters and lower thirds synced from the show')}
${check('Internet', 'Synced · if it drops, the show keeps running here and syncs later', 'success', health('LAN', 'Fallback ready', 'neutral'))}</div>
<div class="row" style="gap:12px;margin-top:22px"><span class="b b-lg b-pri">${icon('bolt', C.stage, 14)} Start autopilot</span><span class="b b-lg">Run manually</span><span class="hint" style="font-size:12px;margin-left:8px">Autopilot cuts to Holding when the match room opens.</span></div>
<div class="box" style="margin-top:22px;padding:14px 16px">${sectionTitle('WHAT AUTOPILOT DOES NEXT')}
<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:2px">${[['20:30', 'Match room opens', 'OBS → Holding · countdown'], ['Check-in done', 'Match intro', 'Hold 5 s → stinger → Fullscreen'], ['Veto live', 'Map veto', 'Bans and picks as they happen'], ['Round 1', 'Gameplay', 'In-game HUD · rounds run on rules'], ['Map ends', 'Map result', 'Hold 5 s → Fullscreen + series']].map(([w, t, d], i) => `<div style="padding:10px 12px;background:${i === 0 ? 'rgba(251,191,36,.07)' : 'rgba(255,255,255,.03)'};box-shadow:inset 0 0 0 1px ${i === 0 ? 'rgba(251,191,36,.35)' : 'rgba(255,255,255,.06)'}"><div class="mono" style="font-size:10.5px;color:${i === 0 ? '#FDE68A' : C.hint}">${w}</div><b style="font-size:13px;display:block;margin-top:4px">${t}</b><div class="hint" style="font-size:11.5px;margin-top:2px">${d}</div></div>`).join('')}</div></div></div></div>`;
  const anns = `${ann(1, 82, 126)}${ann(2, 82, 436)}${ann(3, 556, 192)}${ann(4, 1554, 562)}${ann(5, 556, 764)}${ann(6, 556, 840)}`;
  return screen({ id: 'hud/desk-07-pair-readiness', body: desktopShell({ active: 'Console', body }) + anns });
}

const layer = (name, state, key) => {
  const st = state === 'air' ? `<span class="chip" style="color:#FDA4AF;box-shadow:inset 0 0 0 1px rgba(244,63,94,.4)"><span class="dot" style="background:${C.cue};width:6px;height:6px"></span>On</span>` : state === 'auto' ? chip('Auto', 'warning') : `<span class="chip" style="color:${C.hint};box-shadow:inset 0 0 0 1px rgba(255,255,255,.1)">Off</span>`;
  return `<div class="row" style="gap:8px;height:40px;padding:0 10px;border-bottom:1px solid rgba(255,255,255,.04)"><span style="font-size:12.5px;${state === 'off' ? `color:${C.hint}` : ''}">${name}</span><span style="margin-left:auto">${st}</span><span class="kbd">${key}</span></div>`;
};

export function console_() {
  const trig = (label, key, tone) => `<div style="height:58px;padding:8px 10px;display:flex;flex-direction:column;justify-content:space-between;background:${tone === 'warn' ? 'rgba(251,191,36,.07)' : 'rgba(255,255,255,.035)'};box-shadow:inset 0 0 0 1px ${tone === 'warn' ? 'rgba(251,191,36,.35)' : 'rgba(255,255,255,.09)'}"><b style="font-size:12.5px">${label}</b><span class="kbd" style="align-self:flex-start">${key}</span></div>`;
  const body = `<div style="position:absolute;inset:0;padding:14px;display:grid;grid-template-columns:1fr 360px;grid-template-rows:auto 1fr;gap:14px">
<div class="row" style="gap:14px;align-items:flex-start">
<div>${monitor(img('round-recap.jpg'), { w: 436, label: 'PVW · GAMEPLAY + ROUND RECAP', tone: 'pvw' })}<div class="row" style="gap:8px;margin-top:8px"><span class="hint" style="font-size:12px">Next take loads here first</span></div></div>
<div style="display:flex;flex-direction:column;gap:8px;padding-top:70px"><span class="b b-lg b-take" style="width:96px">TAKE</span><span class="kbd" style="align-self:center">SPACE</span><span class="b" style="width:96px">CUT</span><span class="b" style="width:96px">STINGER</span></div>
<div>${monitor(img('ingame-full.jpg'), { w: 560, label: 'PGM · ON AIR' })}<div class="row" style="gap:8px;margin-top:8px"><span class="mono hint" style="font-size:11px">OBS scene · Gameplay</span><span class="mono hint" style="font-size:11px;margin-left:auto">1080p60 · 6.0 Mb/s · 0 dropped</span></div></div></div>
<div class="box" style="grid-row:span 2;padding:14px;display:flex;flex-direction:column;gap:12px">
<div class="row" style="justify-content:space-between"><span class="cap">AUTOPILOT</span><span class="row" style="gap:8px"><span class="tog on"></span><span class="mono" style="font-size:11px">ON</span></span></div>
<div style="padding:12px;background:rgba(255,255,255,.03);box-shadow:inset 0 0 0 1px rgba(255,255,255,.07)"><div class="cap" style="font-size:9px">NOW</div><b style="font-size:15px;display:block;margin-top:6px">Map 3 · live rounds</b><div class="hint" style="font-size:12px">Gameplay scene · since 20:51</div></div>
<div style="padding:14px;background:rgba(251,191,36,.06);box-shadow:inset 0 0 0 1px rgba(251,191,36,.45)">
<div class="row" style="justify-content:space-between"><span class="cap" style="font-size:9px;color:#FDE68A">NEXT · ROUND ENDED</span><span class="mono" style="font-size:11px;color:#FDE68A">AUTO</span></div>
<div class="row" style="gap:14px;margin-top:10px"><div style="position:relative;width:62px;height:62px;flex:none"><svg width="62" height="62" viewBox="0 0 62 62"><circle cx="31" cy="31" r="27" fill="none" stroke="rgba(255,255,255,.1)" stroke-width="4"/><circle cx="31" cy="31" r="27" fill="none" stroke="${AMBER}" stroke-width="4" stroke-dasharray="169.6" stroke-dashoffset="68" transform="rotate(-90 31 31)"/></svg><span class="t1" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:22px">3</span></div>
<div><b style="font-size:15px">Round recap</b><div class="hint" style="font-size:12px;margin-top:2px">Between-rounds layer · 6 s</div></div></div>
<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-top:12px"><span class="b b-sm b-cue">HOLD <span class="kbd" style="height:15px;min-width:15px;font-size:8.5px">H</span></span><span class="b b-sm">SKIP <span class="kbd" style="height:15px;min-width:15px;font-size:8.5px">S</span></span><span class="b b-sm b-pri">TAKE</span></div></div>
<div>${sectionTitle('COMING UP')}${[['Economy board', 'Buy phase · auto'], ['Map result + stinger', 'Map ends · hold 5 s'], ['Series', 'After map result']].map(([t, d]) => `<div class="row" style="gap:10px;padding:9px 0;border-bottom:1px solid rgba(255,255,255,.05)"><span class="dot" style="background:${C.hint}"></span><div><span style="font-size:13px">${t}</span><div class="hint" style="font-size:11.5px">${d}</div></div></div>`).join('')}</div>
<div>${sectionTitle('LOWER THIRDS · ONE CLICK')}<div style="display:grid;gap:6px">${[['Sara Malik', 'Caster · play-by-play'], ['Omar Sheikh', 'Caster · analyst'], ['Spotlight · KAIRO', 'Player · live stats']].map(([n, r]) => `<div class="row" style="gap:10px;padding:8px 10px;background:rgba(255,255,255,.03);box-shadow:inset 0 0 0 1px rgba(255,255,255,.07)"><div><b style="font-size:12.5px">${n}</b><div class="hint" style="font-size:11px">${r}</div></div><span class="b b-sm" style="margin-left:auto">Show</span></div>`).join('')}</div></div>
<div style="margin-top:auto">${sectionTitle('EVENT LOG')}<div class="mono" style="font-size:11px;line-height:1.95;color:${C.secondary}">${['20:53:41 Kill · KAIRO ▸ VEX · Vandal · HS', '20:53:38 Spike planted · B site', '20:53:12 Hold · Ayesha · Round recap', '20:53:02 Auto take · Economy board', '20:52:55 Round 23 · C5 · elimination'].join('<br>')}</div></div></div>
<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1.1fr;gap:14px;min-height:0">
<div class="box" style="padding:10px 0">${sectionTitle('<span style="padding:0 10px">IN-GAME LAYERS</span>')}${layer('Scorebug', 'air', '1')}${layer('Player cards', 'air', '2')}${layer('Killfeed', 'air', '3')}${layer('Observed player', 'air', '4')}${layer('Minimap frame', 'air', '5')}${layer('Win probability', 'off', '6')}${layer('Spike timer', 'auto', '7')}${layer('Sponsor bug', 'auto', '8')}</div>
<div class="box" style="padding:10px 0">${sectionTitle('<span style="padding:0 10px">BETWEEN ROUNDS</span>')}${layer('Economy board', 'auto', 'Q')}${layer('Round recap', 'auto', 'W')}${layer('Scoreboard', 'off', 'E')}${layer('Duel', 'off', 'R')}${layer('Team compare', 'off', 'T')}${layer('Lower third', 'off', 'Y')}${layer('Ticker', 'air', 'U')}${layer('Poll', 'off', 'I')}</div>
<div class="box" style="padding:10px 0">${sectionTitle('<span style="padding:0 10px">FULL SCREEN</span>')}${layer('Map result', 'auto', 'A')}${layer('Series', 'auto', 'S')}${layer('Halftime', 'auto', 'D')}${layer('Player profile', 'off', 'F')}${layer('Standings', 'off', 'G')}${layer('Agent select', 'auto', 'H')}${layer('Champion', 'off', 'J')}</div>
<div class="box" style="padding:10px">${sectionTitle('TRIGGERS')}<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">${trig('Tech pause', 'F1', 'warn')}${trig('Timeout', 'F2')}${trig('Replay', 'F3')}${trig('Toast', 'F4')}${trig('Caster lower third', 'F5')}${trig('Poll', 'F6')}${trig('Stinger', 'F7')}${trig('Sponsor read', 'F8')}</div></div></div>
<div class="row" style="position:absolute;left:14px;right:388px;bottom:14px;height:44px;gap:18px;padding:0 14px;background:#0d0d10;box-shadow:inset 0 0 0 1px rgba(255,255,255,.07)">
<span class="cap" style="font-size:9px">LIVE DATA</span><span class="mono" style="font-size:12px">R24 · LIVE 1:24</span><span class="row" style="gap:6px">${crestMini('NO', 265, 16, 0)}<b class="mono" style="font-size:12px">11 – 12</b>${crestMini('C5', 0, 16, 2)}</span><span class="mono" style="font-size:12px">ALIVE 3v2</span><span class="mono" style="font-size:12px">BANK 8,700 / 13,100</span><span class="mono" style="font-size:12px;color:#FDE68A">SPIKE B · 0:31</span><span class="mono hint" style="font-size:11px;margin-left:auto">MATCH POINT · C5</span><span class="b b-sm">${icon('data', C.ink, 12)} Fix data</span></div></div>
`;
  const anns = `${ann(1, 64, 100)}${ann(2, 642, 160)}${ann(3, 1218, 240)}${ann(4, 1218, 410)}${ann(5, 64, 455)}${ann(6, 908, 455)}${ann(7, 64, 952)}${ann(8, 1218, 840)}`;
  return screen({ id: 'hud/desk-08-console', body: desktopShell({ active: 'Console', body }) + anns });
}
