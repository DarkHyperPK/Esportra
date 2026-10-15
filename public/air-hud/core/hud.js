/* Esportra Valorant broadcast HUD engine.
   Overlays: <body data-modules="scorebug,players,..."> + this script. State comes from, in order:
   ?ws=ws://host:port (live data feed)  >  control panel (BroadcastChannel/localStorage)  >  HUD_DEFAULT.
   ?demo=1 runs a local round simulation. ?bg=1 shows a map backdrop for positioning. */
(function () {
  const CAT = window.VCAT, KEY = 'esportra-hud:v1', Q = new URLSearchParams(location.search);
  const clone = o => JSON.parse(JSON.stringify(o));
  const isObj = v => v && typeof v === 'object' && !Array.isArray(v);
  function merge(a, b) { for (const k in b) { if (isObj(b[k]) && isObj(a[k])) merge(a[k], b[k]); else a[k] = b[k]; } return a; }

  const PREVIEW = Q.get('preview') === '1';
  const EMPTY_PREVIEW = PREVIEW && Q.get('empty') === '1';
  const SAMPLE_MOTION = PREVIEW && !EMPTY_PREVIEW && Q.get('sampleMotion') === '1';
  let previewPatch = {};
  try { if(Q.has('hudSettings'))previewPatch=window.AirHudSettings.validate(JSON.parse(Q.get('hudSettings'))); } catch (_) { /* Invalid preview settings never enter the match state. */ }
  const previewSettings = state => {
    const view=merge(clone(state),previewPatch),modules=(document.body.dataset.modules||'').split(',').map(name=>name.trim()).filter(Boolean);
    // Dedicated screens are selected by the producer; Match HUD switches only govern the composite HUD.
    if((PREVIEW||OUTPUT||Q.get('screen')==='1')&&modules.length===1&&modules[0]!=='ingame'){
      const gates={scorebug:'scorebug',players:'players',observed:'observed',minimap:'minimap',economy:'economy',scoreboard:'scoreboard',lowerthird:'lowerThird',replay:'replay',ticker:'ticker',roundhistory:'roundHistory',winprob:'winProb',spiketimer:'spikeTimer',moments:'moments',sponsor:'sponsor',eventbug:'eventBug',poll:'poll',duel:'duel',teamcompare:'teamCompare',roundrecap:'roundRecap',playercams:'playerCams',killfeed:'killfeed'};
      const gate=gates[modules[0]];
      if(gate){view.show={...view.show,scoreboard:false,teamCompare:false,duel:false,roundRecap:false,economy:false,[gate]:true};}
    }
    return view;
  };
  const OUTPUT = /^\/o\/([0-9a-f-]{36})$/i.exec(location.pathname)?.[1] || null;
  const MATCH = PREVIEW ? null : Q.get('match') || (OUTPUT ? 'MAIN' : null); // previews are isolated from live rooms and browser storage
  const previewNow = Date.now();
  const HUD = window.HUD = { subs: [], mods: [], events: [], now: PREVIEW && !SAMPLE_MOTION ? () => previewNow : () => Date.now(), preview: PREVIEW, demo: !PREVIEW && Q.has('demo'), live: !PREVIEW && !Q.has('demo') && !MATCH, match: MATCH };
  if (!PREVIEW) HUD.now = () => {
    const clock = HUD.state?.simulation;
    return clock && Number.isFinite(clock.epoch) && Number.isFinite(clock.positionMs)
      ? clock.epoch + clock.positionMs + (clock.playing ? Math.max(0, Date.now() - clock.wallAt) * clock.speed : 0)
      : Date.now();
  };
  function readStore() { try { const s = localStorage.getItem(KEY); if (s) return merge(clone(HUD_DEFAULT), JSON.parse(s)); } catch (e) {} return clone(HUD_DEFAULT); }
  const liveBase = () => clone(typeof HUD_CLEAN !== 'undefined' ? HUD_CLEAN : HUD_DEFAULT);
  let sourceState = MATCH || EMPTY_PREVIEW ? liveBase() : PREVIEW || HUD.demo ? clone(HUD_DEFAULT) : readStore();
  HUD.state = previewSettings(sourceState);
  let receivedMatch = false;
  let raw = '', bc = null;
  try { bc = new BroadcastChannel('esportra-hud'); } catch (e) {}
  HUD.commit = function (s, opts = {}) {
    sourceState = s;
    HUD.state = previewSettings(s);
    if (MATCH && !opts.local && !opts.remote) HUD.send({ type: 'set', state: s });
    if (HUD.live && !opts.local) {
      raw = JSON.stringify(s);
      try { localStorage.setItem(KEY, raw); } catch (e) {}
      if (bc) bc.postMessage(s);
    }
    HUD.subs.forEach(f => f(HUD.state));
  };
  HUD.set = function (patch) { HUD.commit(merge(clone(HUD.state), typeof patch === 'function' ? patch(clone(HUD.state)) : patch)); };
  HUD.reset = () => HUD.commit(clone(HUD_DEFAULT));
  HUD.resetClean = () => HUD.commit(clone(typeof HUD_CLEAN !== 'undefined' ? HUD_CLEAN : HUD_DEFAULT));
  HUD.on = f => { HUD.subs.push(f); f(HUD.state); };
  function receive(s, opts = {}) { if(MATCH){receivedMatch=true;document.getElementById('hud')?.style.setProperty('visibility','visible');document.getElementById('waiting-match-data')?.remove();} sourceState = merge(MATCH?liveBase():clone(HUD_DEFAULT), s); HUD.state = previewSettings(sourceState); HUD.subs.forEach(f => f(HUD.state, opts)); }
  if (HUD.live) {
    if (bc) bc.onmessage = e => receive(e.data);
    addEventListener('storage', e => { if (e.key === KEY && e.newValue) { raw = e.newValue; receive(JSON.parse(e.newValue)); } });
    setInterval(() => { try { const s = localStorage.getItem(KEY); if (s && s !== raw) { raw = s; receive(JSON.parse(s)); } } catch (e) {} }, 800);
  }
  // RFC 7386 merge patch: objects merge, arrays replace, null deletes
  const mergePatch = HUD.mergePatch = (a, p) => { if (!isObj(p)) return p; a = isObj(a) ? a : {}; for (const k in p) { if (p[k] === null) delete a[k]; else a[k] = mergePatch(a[k], p[k]); } return a; };
  if (MATCH) (function conn() {
    const base = Q.get('server') || ((location.protocol === 'https:' ? 'wss://' : 'ws://') + (location.host || 'localhost:5300'));
    const role = Q.get('role') || (document.body && document.body.dataset.role) || 'overlay';
    const ws = new WebSocket(`${base}/ws?${OUTPUT ? 'output=' + encodeURIComponent(OUTPUT) : 'match=' + encodeURIComponent(MATCH)}&role=${role}${Q.get('key') ? '&key=' + encodeURIComponent(Q.get('key')) : ''}`);
    let v = 0; HUD.send = m => { if (ws.readyState === 1) ws.send(JSON.stringify(m)); };
    let framePending = false;
    const renderTimer = setInterval(() => {
      if (framePending || ws.readyState !== 1 || !HUD.connected) return;
      framePending = true; requestAnimationFrame(() => { framePending = false; HUD.send({ type: 'rendered', v }); });
    }, 1000);
    ws.onopen = () => { HUD.connected = true; HUD.subs.forEach(f => f(HUD.state)); };
    ws.onmessage = e => { const m = JSON.parse(e.data);
      if (m.type === 'snapshot') { v = m.v; receive(m.state, {snapshot:true}); }
      else if (m.type === 'patch') { if (m.v !== v + 1) return HUD.send({ type: 'resync' }); v = m.v; receive(mergePatch(clone(sourceState), m.patch)); }
      else if (m.type === 'event') HUD.events.forEach(f => f(m.event));
      else if (m.type === 'error') console.warn('Esportra server:', m.message); };
    ws.onclose = () => { clearInterval(renderTimer); HUD.connected = false; HUD.subs.forEach(f => f(HUD.state)); setTimeout(conn, 1500); };
  })();
  if (!PREVIEW && Q.get('ws')) (function conn() {
    const ws = new WebSocket(Q.get('ws'));
    ws.onmessage = e => { try { const m = JSON.parse(e.data); if (m.state) receive(m.state); else if (m.patch) receive(merge(clone(HUD.state), m.patch)); else receive(m); } catch (err) {} };
    ws.onclose = () => setTimeout(conn, 2000);
  })();

  // ───── helpers ─────
  const E = HUD.el = (tag, cls, parent, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; if (parent) parent.appendChild(e); return e; };
  const agent = HUD.agent = n => n && CAT.agents[String(n).toUpperCase()];
  const weapon = HUD.weapon = n => n && CAT.weapons[String(n).toUpperCase()];
  const mapA = HUD.mapA = n => n && CAT.maps[String(n).toUpperCase()];
  const armorIcon = a => a >= 50 ? CAT.gear['HEAVY ARMOR'] : a > 0 ? CAT.gear['LIGHT ARMOR'] : '';
  const ink = HUD.ink = hex => { const h = (hex || '#ffffff').replace('#', ''); const n = parseInt(h.length === 3 ? h.replace(/./g, '$&$&') : h, 16);
    const [r, g, b] = [n >> 16 & 255, n >> 8 & 255, n & 255].map(v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); });
    return .2126 * r + .7152 * g + .0722 * b > .42 ? '#101014' : '#ffffff'; };
  const tv = HUD.tv = (el, s, i) => { const c = s.teams[i].color; el.style.setProperty('--c', c); el.style.setProperty('--ci', ink(c)); return el; };
  const fmt = HUD.fmt = sec => { sec = Math.max(0, Math.ceil(sec)); return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`; };
  const fmtHundredths = sec => { const value = Math.max(0, Math.ceil(Math.round(sec * 1000) / 10)); return `${String(Math.floor(value / 100)).padStart(2, '0')}:${String(value % 100).padStart(2, '0')}`; };
  const money = n => Number(n || 0).toLocaleString('en-US');
  const setImg = (im, url) => { if (!url) { im.style.visibility = 'hidden'; return; } im.style.visibility = ''; if (im.dataset.u !== url) { im.dataset.u = url; im.src = url; } };
  const txt = (e, v) => { v = String(v); if (e.textContent !== v) e.textContent = v; };
  const timeLeft = HUD.timeLeft = r => r.endsAt ? Math.max(0, (r.endsAt - HUD.now()) / 1000) : (r.remaining || 0);
  // Align CSS motion once per plant; the compositor keeps it smooth between HUD ticks.
  const pulseSpike = (el, round) => {
    const deadline = String(round.endsAt || 'remaining');
    if (el.dataset.spikeDeadline === deadline) return;
    const elapsed = Math.max(0, 45000 - timeLeft(round) * 1000);
    el.style.setProperty('--spike-delay', -(elapsed % 1000) + 'ms');
    el.dataset.spikeDeadline = deadline;
  };
  const need = s => Math.ceil((s.event.bestOf || 1) / 2);
  const P = (s, tp) => s.players[tp[0]] && s.players[tp[0]][tp[1]];
  function logo(team, size, parent, cls = '') {
    if (team.logo) { const im = E('img', 'lg ' + cls, parent); im.src = team.logo; im.style.width = im.style.height = size + 'px'; return im; }
    const d = E('div', 'lg mono-logo ' + cls, parent, team.tag); d.style.width = d.style.height = size + 'px'; d.style.setProperty('--c', team.color); d.style.fontSize = Math.round(size * .34) + 'px'; return d;
  }
  const SPIKE = (c = '#e0445e', w = 24) => `<svg width="${w}" height="${w * 1.15}" viewBox="-13 -15 26 30"><path d="M0 -15 L13 -7.5 L13 7.5 L0 15 L-13 7.5 L-13 -7.5 Z" fill="${c}"/><path d="M0 -7 L6 0 L0 7 L-6 0 Z" fill="#fff"/></svg>`;
  const HS = `<svg width="22" height="22" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="none" stroke="#fff" stroke-width="2"/><circle cx="12" cy="12" r="2.6" fill="#e0445e"/><path d="M12 1v5M12 18v5M1 12h5M18 12h5" stroke="#fff" stroke-width="2"/></svg>`;
  HUD.status = function (s) {                     // map point / match point / overtime
    const [a, b] = s.teams.map(t => t.score), ot = a >= 12 && b >= 12;
    for (const i of [0, 1]) { const me = i ? b : a, op = i ? a : b;
      if ((me === 12 && op < 12) || (ot && me - op === 1)) return { team: i, text: (s.teams[i].series >= need(s) - 1 ? 'MATCH POINT ' : 'MAP POINT ') + s.teams[i].tag }; }
    return ot ? { team: -1, text: 'OVERTIME' } : null;
  };
  const ABILITY_ICONS = {};
  Object.values(CAT.agents).forEach(ag => { (ag.ab || []).forEach(([name, url]) => { if (name) ABILITY_ICONS[name.toUpperCase()] = url; }); });
  const chargeCount = (p, k) => {
    if (!Array.isArray(p.charges) || (p.puuid && !p.chargesKnown)) return null;
    return Math.max(0, Math.min(16, Math.floor(Number(p.charges[k]) || 0)));
  };
  const chargeDots = count => count === null ? '' : count ? '<i></i>'.repeat(count) : '<i class="e"></i>';
  const abilityDots = (p, k) => p.abilitiesKnown && !p.chargesKnown ? `<span style="font-size:8px" title="Ability availability">${p.abilityAvailability?.[k] ? 'READY' : 'OFF'}</span>` : chargeDots(chargeCount(p, k));
  const knownHealth = p => !p.alive ? 0 : p.puuid && !p.hpKnown ? null : Math.max(0, Math.min(100, Number(p.hp) || 0));
  const vis = HUD.vis = {
    economy: s => s.show.economy === true || (s.show.economy === 'auto' && s.round.phase === 'buy'),
    focused: s => s.show.scoreboard || s.show.teamCompare || s.show.duel,
    players: s => s.show.players && !vis.economy(s) && !vis.focused(s) && !vis.recap(s),
    observed: s => s.show.observed && !vis.economy(s) && !vis.focused(s) && s.round.phase !== 'buy' && !vis.recap(s),
    recap: s => !vis.focused(s) && (s.show.roundRecap === true || (s.show.roundRecap === 'auto' && s.round.phase === 'end')) && s.rounds.length > 0,
    killfeed: s => s.show.killfeed && !vis.focused(s),
  };
  function chrome(root, right) {
    const c = E('div', 'chrome', root);
    [[48, 48, 'left', 'top'], [1836, 48, 'right', 'top'], [48, 996, 'left', 'bottom'], [1836, 996, 'right', 'bottom']].forEach(([x, y, h, v]) => {
      const b = E('div', 'br', c); b.style.cssText = `left:${x}px;top:${y}px;border-${h}-width:2px;border-${v}-width:2px`; });
    const lg = E('img', 'clg', c); lg.src = '../core/brand/mark-44.png';
    const l1 = E('div', 'l1 mono', c), r1 = E('div', 'r1 mono', c, right || ''), clk = E('div', 'clk mono', c);
    HUD.on(s => txt(l1, `ESPORTRA   /   ${s.event.stage}`));
    setInterval(() => { const d = new Date(); clk.textContent = d.toTimeString().slice(0, 8) + '  ' + 'LIVE'; }, 500);
    return { c, r1 };
  }
  let GRAIN = null;
  function sceneBg(root) {
    const sc = E('div', 'scene', root); E('div', 'glow', sc);
    if (!GRAIN) { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'), d = g.createImageData(256, 256);
      for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 34; } g.putImageData(d, 0, 0); GRAIN = c.toDataURL(); }
    const gr = E('div', 'grain', sc); gr.style.backgroundImage = `url(${GRAIN})`;
    return sc;
  }
  function sceneFx(sc) { E('div', 'lines', sc); E('div', 'vig', sc); }
  function toggle(el, on) { el.classList.toggle('on', !!on); }
  // scenes only rebuild when the data they show changes (score edits etc. don't replay entrances)
  const same = (o, s) => { const k = JSON.stringify([s.event, s.teams, s.players.map(t => t.map(p => [p.name, p.agent, p.k, p.d, p.a, p.acs, p.adr, p.hs])), s.registeredRoster, s.map, s.series, s.veto, s.bracket, s.standings, s.casters, s.schedule, s.holding, s.rounds, s.firstSide, s.teamStats, s.champion, Q.get('mode')]);
    if (o._k === k) return true; o._k = k; return false; };

  // ───── modules ─────
  const M = HUD.modules = {};

  M.scorebug = root => {
    const m = E('div', 'mod scorebug-layer', root), sb = E('div', 'sb fx-wipe', m), row = E('div', 'sb-row', sb);
    const side = i => { const n = E('div', 'sb-name ' + (i ? 'r' : 'l'), row); const sd = E('div', 'sb-side mono', n); return { n, sd }; };
    const A = side(0); const sA = E('div', 'sb-score l', row); const mid = E('div', 'sb-mid notch-b', row); const sB = E('div', 'sb-score r', row); const B = side(1);
    const top = E('div', 'top mono', mid), tm = E('div', 'tm', mid), bot = E('div', 'bot mono', mid);
    let timerCells = null;
    // Rajdhani's digits have different advances even with tabular-nums enabled.
    // Keep each urgent digit in a fixed slot and update only its text.
    function renderTimer(label, urgent) {
      if (!urgent) {
        if (timerCells) { tm.textContent = label; timerCells = null; }
        else txt(tm, label);
        return;
      }
      if (!timerCells) {
        tm.textContent = '';
        timerCells = Array.from({length:5}, (_, i) => E('span', i === 2 ? 'tm-separator' : 'tm-digit', tm));
      }
      timerCells.forEach((cell, i) => txt(cell, label[i]));
    }
    const pips = [E('div', 'sb-pips l', sb), E('div', 'sb-pips r', sb)], heads = [E('div', 'sb-heads l', sb), E('div', 'sb-heads r', sb)];
    const tag = E('div', 'sb-tag mono', sb); let last = [null, null], sig = '';
    function build(s) {
      [A, B].forEach((o, i) => { o.n.querySelectorAll('.lg,.nm,.bar').forEach(x => x.remove()); tv(o.n, s, i);
        const nm = E('div', 'nm', null, s.teams[i].name); const lg = logo(s.teams[i], 44, null);
        if (i) { o.n.appendChild(nm); o.n.appendChild(lg); } else { o.n.appendChild(lg); o.n.appendChild(nm); } E('div', 'bar', o.n); });
      heads.forEach((h, i) => { h.innerHTML = ''; tv(h, s, i); s.players[i].forEach(p => { const d = E('div', '', h); const im = E('img', '', d); setImg(im, agent(p.agent) && agent(p.agent).icon); }); });
    }
    return { update(s) {
      toggle(m, s.show.scorebug);
      const k = JSON.stringify([s.teams.map(t => [t.name, t.tag, t.color, t.logo]), s.players.map(t => t.map(p => p.agent))]);
      if (k !== sig) { sig = k; build(s); }
      [sA, sB].forEach((e, i) => { tv(e, s, i); const v = s.teams[i].score; if (last[i] !== null && last[i] !== v) { e.classList.remove('pop'); void e.offsetWidth; e.classList.add('pop'); } last[i] = v; txt(e, v); });
      [A, B].forEach((o, i) => txt(o.sd, s.teams[i].side || ''));
      pips.forEach((p, i) => { tv(p, s, i); p.innerHTML = ''; for (let j = 0; j < need(s); j++) E('i', j < s.teams[i].series ? 'w' : '', p); p.style.display = s.event.bestOf > 1 ? '' : 'none'; });
      heads.forEach((h, i) => [...h.children].forEach((d, j) => d.classList.toggle('dead', !s.players[i][j].alive)));
      heads.forEach(h => h.style.display = vis.players(s) ? 'none' : '');
      txt(top, `ROUND ${s.round.number}`); txt(bot, `MAP ${s.map.number}  /  ${s.map.name}`);
      const st = HUD.status(s); tag.classList.toggle('show', !!st);
      if (st) { txt(tag, st.text); tag.style.background = st.team >= 0 ? s.teams[st.team].color : 'var(--red)'; tag.style.color = st.team >= 0 ? ink(s.teams[st.team].color) : '#fff'; }
      this.tick(s);
    }, tick(s) {
      const r = s.round, t = timeLeft(r); let cls = '', label = fmt(t);
      if (r.phase === 'planted') {
        cls = 'planted'; label = '';
        pulseSpike(tm, r);
      } else {
        tm.style.removeProperty('--spike-delay'); delete tm.dataset.spikeDeadline;
        if (r.phase === 'buy') { cls = 'buy'; }
        else if (r.phase === 'paused') { cls = 'paused'; label = 'PAUSE'; }
        else if (r.phase === 'end') label = '0:00';
      }
      const urgent = r.phase === 'live' && t <= 15;
      if (urgent) { cls += ' urgent'; label = fmtHundredths(t); }
      renderTimer(label, urgent);
      const timerClass = 'tm ' + cls;
      if (tm.className !== timerClass) tm.className = timerClass;
    }, frame(s) {
      const r = s.round;
      if (r.endsAt && r.phase === 'live' && timeLeft(r) <= 15) this.tick(s);
    } };
  };

  function ultRingSVG(cur, max, sz) {
    if (!max) return '';
    const cx = sz / 2, cy = sz / 2, r = sz / 2 - 2.5;
    const paths = [];
    for (let i = 0; i < max; i++) {
      const gapD = 360 / max * 0.18, segD = 360 / max - gapD;
      const s = (i * 360 / max - 90) * Math.PI / 180, e = (i * 360 / max - 90 + segD) * Math.PI / 180;
      const lg = segD > 180 ? 1 : 0, col = i < cur ? 'currentColor' : 'rgba(255,255,255,.15)';
      paths.push(`<path d="M${cx+r*Math.cos(s)},${cy+r*Math.sin(s)} A${r},${r} 0 ${lg} 1 ${cx+r*Math.cos(e)},${cy+r*Math.sin(e)}" fill="none" stroke="${col}" stroke-width="2" stroke-linecap="round"/>`);
    }
    return `<svg width="${sz}" height="${sz}" viewBox="0 0 ${sz} ${sz}">${paths.join('')}</svg>`;
  }

  M.players = root => {
    const m = E('div', 'mod', root); const sides = [0, 1].map(i => { const w = E('div', 'pl fx-' + (i ? 'right' : 'left') + ' ' + (i ? 'r' : 'l'), m); const hd = E('div', 'pl-head mono', w); const htag = E('b', '', hd), hside = E('span', '', hd); const rows = [];
      for (let j = 0; j < 5; j++) {
        const r = E('div', 'pr', w);
        const col = E('div', 'ag-col', r);
        const ai = E('img', 'ag-i', col);
        const ud = E('div', 'ult', col); const uico = E('img', 'ult-ico', ud); const uring = E('div', 'ult-ring', ud);
        const mn = E('div', 'main', r);
        const r1 = E('div', 'r1', mn); const nm = E('div', 'nm', r1); const sh = E('div', 'sh', r1); const hpn = E('div', 'hpn num', r1);
        const hpb = E('div', 'hpb', mn); const hpi = E('i', '', hpb);
        const r2 = E('div', 'r2', mn);
        const abs = [0,1,2].map(() => { const ab = E('div', 'ab', r2); const im = E('img', '', ab); const cp = E('div', 'cp', ab); return { ab, im, cp }; });
        const wp = E('img', 'wp', r2);
        const ec = E('div', 'pc-econ', r2); const cri = E('img', 'cri', ec); const cr = E('span', 'cr num', ec);
        const di = E('div', 'di', r2); const dkda = E('span', '', di); const de = E('span', 'de', di); const dcri = E('img', '', de); const dcr = E('span', 'cr num', de);
        rows.push({ r, ai, ud, uico, uring, nm, sh, hpn, hpb, hpi, abs, wp, ec, cri, cr, di, dkda, dcri, dcr }); }
      return { w, hd, htag, hside, rows }; });
    return { update(s) {
      toggle(m, vis.players(s));
      sides.forEach((sd, i) => { tv(sd.w, s, i); const T = s.teams[i]; txt(sd.htag, T.tag || ''); txt(sd.hside, T.side || '');
        sd.rows.forEach((o, j) => { const p = s.players[i][j]; o.r.style.visibility = p ? '' : 'hidden'; if (!p) return; const A = agent(p.agent);
          setImg(o.ai, A && A.icon);
          setImg(o.uico, A && A.ab[3] && A.ab[3][1]);
          const um = Math.max(1, Math.min(64, Math.floor(Number(p.ultMax) || 7))), u = Math.max(0, Math.min(um, Math.floor(Number(p.ult) || 0))); o.ud.classList.toggle('ready', u >= um);
          const ringKey = `${u}/${um}`; if (o.uring.dataset.k !== ringKey) { o.uring.dataset.k = ringKey; o.uring.innerHTML = ultRingSVG(u, um, 44); }
          txt(o.nm, p.name);
          const armor = p.alive ? +p.armor || 0 : 0; txt(o.sh, armor > 0 ? armor : ''); o.sh.style.display = armor > 0 ? '' : 'none';
          const hp = knownHealth(p); txt(o.hpn, p.alive ? hp === null ? '—' : hp : ''); o.hpn.classList.toggle('low', hp !== null && hp > 0 && hp <= 30);
          o.hpi.style.width = (hp || 0) + '%'; o.hpi.classList.toggle('low', hp > 0 && hp <= 30);
          o.abs.forEach((ab, k) => { const d = A && A.ab[k]; setImg(ab.im, d && d[1]); const c = chargeCount(p, k); ab.ab.classList.toggle('empty', c === 0); ab.cp.classList.toggle('chamber-q', c > 4); if (ab.cp.dataset.c !== `${c}:${p.abilityAvailability?.[k]}`) { ab.cp.dataset.c = `${c}:${p.abilityAvailability?.[k]}`; ab.cp.innerHTML = abilityDots(p, k); } });
          const W = weapon(p.weapon); setImg(o.wp, p.alive && W && W.kill);
          txt(o.cr, money(p.credits)); o.cri.src = s.teams[i].side === 'ATK' ? '../core/assets/misc/ValorantCreditsRed.svg' : '../core/assets/misc/ValorantCreditsGreen.svg';
          txt(o.dkda, `${p.k||0}/${p.d||0}/${p.a||0}`); txt(o.dcr, money(p.credits)); o.dcri.src = o.cri.src;
          o.r.classList.toggle('dead', !p.alive); o.r.classList.toggle('obs', s.observed[0] === i && s.observed[1] === j && p.alive); }); });
    } };
  };

  M.killfeed = root => {
    const m = E('div', 'mod', root), kf = E('div', 'kf', m); const seen = new Set(); let rows = []; let initialized = false;
    const seenKey = k => `${k.killer}|${k.victim}|${k.weapon}|${k.hs ? 1 : 0}`;
    function buildRow(k, s, animate) {
      const a = P(s, k.killer), v = P(s, k.victim); if (!a || !v) return null;
      const W = weapon(k.weapon), Aa = agent(a.agent), Va = agent(v.agent);
      const aurl = !W && ABILITY_ICONS[String(k.weapon || '').toUpperCase()];
      const wHtml = W ? `<img class="w" src="${W.kill}">` : aurl ? `<img class="w" src="${aurl}">` : `<span class="n mono">${k.weapon || ''}</span>`;
      const key = seenKey(k); const r = E('div', 'kr' + (animate ? ' in' : ''), null); r.dataset.key = key; tv(r, s, k.killer[0]);
      r.innerHTML = `${Aa ? `<img class="a" src="${Aa.icon}">` : ''}<span class="n mono" style="color:${s.teams[k.killer[0]].color}">${a.name}</span>${wHtml}${k.hs ? HS : ''}<span class="n v mono">${v.name}</span>${Va ? `<img class="v" src="${Va.icon}">` : ''}`;
      if (animate) E('div', 'fl', r); return r;
    }
    return { update(s) {
      toggle(m, vis.killfeed(s)); m.style.opacity = vis.killfeed(s) ? 1 : 0;
      const current = s.killfeed.slice(-6).reverse();
      if (!initialized) {
        initialized = true;
        current.forEach(k => { const key = seenKey(k); seen.add(key); const r = buildRow(k, s, false); if (!r) return; kf.appendChild(r); rows.push({ r, ts: k.ts, key }); });
        return;
      }
      const currentKeys = new Set(current.map(seenKey));
      rows = rows.filter(o => { if (!currentKeys.has(o.key)) { o.r.remove(); return false; } return true; });
      const newRows = [];
      current.forEach(k => { const key = seenKey(k); if (seen.has(key)) return; const r = buildRow(k, s, true); if (!r) return; seen.add(key); newRows.push({ r, ts: k.ts, key }); });
      for (let i = newRows.length - 1; i >= 0; i--) kf.prepend(newRows[i].r);
      rows.unshift(...newRows);
    }, tick() { const n = HUD.now(); rows.forEach(o => { if (o.ts) { const age = n - o.ts; o.r.style.opacity = age > 7000 ? Math.max(0, 1 - (age - 7000) / 500) : 1; } }); } };
  };

  M.observed = root => {
    const m = E('div', 'mod', root), ob = E('div', 'ob fx-rise', m);
    const pt = E('div', 'pt', ob), pti = E('img', '', pt), info = E('div', 'info', ob), tg = E('div', 'tg mono', info), nm = E('div', 'nm', info), ln = E('div', 'ln', info);
    const wp = E('img', 'wp', ln), cr = E('span', 'cr num', ln), kda = E('span', 'num', ln);
    const hp = E('div', 'hp', ob), hv = E('div', 'v', hp), hl = E('div', 'l mono', hp, 'HEALTH'), ar = E('img', '', hl), hb = E('div', 'bar', hp), hbi = E('i', '', hb);
    const ab = E('div', 'ab', ob), keys = ['C', 'Q', 'E', 'X'];
    const slots = keys.map(k => { const s = E('div', 'slot' + (k === 'X' ? ' ult' : ''), ab); E('div', 'k mono', s, k); const ic = E('div', 'ic', s); const im = E('img', '', ic); const ch = E('div', k === 'X' ? 'pts num' : 'ch', s); return { s, im, ch }; });
    const dd = E('div', 'dead mono', ob, 'ELIMINATED');
    let deadSince = null;
    return { update(s) {
      toggle(m, vis.observed(s)); const cur = P(s, s.observed); if (!cur) return;
      if (cur.alive) { deadSince = null; }
      else {
        if (deadSince === null) { deadSince = Date.now(); }
        else if (s.show.autoObserver !== false && Date.now() - deadSince > 1500) {
          const [t, j] = s.observed;
          let nt = t, ni = s.players[t].findIndex((q, i) => i !== j && q.alive);
          if (ni === -1) { nt = 1 - t; ni = s.players[nt].findIndex(q => q.alive); }
          if (ni !== -1) { s.observed = [nt, ni]; deadSince = null; }
        }
      }
      const p = P(s, s.observed); if (!p) return; tv(ob, s, s.observed[0]); const A = agent(p.agent);
      setImg(pti, A && A.icon); txt(tg, `${s.teams[s.observed[0]].tag}  /  ${A ? A.name : p.agent}`); txt(nm, p.name);
      setImg(wp, weapon(p.weapon) && weapon(p.weapon).kill); txt(cr, money(p.credits)); txt(kda, `${p.k}/${p.d}/${p.a}`);
      const h = knownHealth(p); txt(hv, h === null ? '—' : h); hv.classList.toggle('low', h !== null && h <= 30); hbi.style.width = Math.min(100, h || 0) + '%'; setImg(ar, armorIcon(p.alive ? p.armor : 0));
      slots.forEach((o, k) => { const a = A && A.ab[k]; setImg(o.im, a && a[1]);
        if (k < 3) { const c = chargeCount(p, k); o.s.classList.toggle('empty', c === 0); o.ch.innerHTML = abilityDots(p, k); }
        else { const um = +p.ultMax || 7, u = Math.min(um, +p.ult || 0); o.s.classList.toggle('ready', u >= um); txt(o.ch, u >= um ? 'READY' : `${u}/${um}`); } });
      ob.classList.toggle('isdead', !p.alive);
    } };
  };

  M.playercams = root => {
    const m = E('div', 'mod', root);
    const teams = [0, 1].map(team => {
      const column = E('div', 'player-cams ' + (team ? 'r fx-right' : 'l fx-left'), m);
      const frames = Array.from({length:5}, () => {
        const frame = E('div', 'cam', column), name = E('span', 'name mono', frame);
        return {frame, name};
      });
      return {column, frames};
    });
    return {update(s) {
      toggle(m, s.show.playerCams && vis.players(s));
      teams.forEach((team, i) => {
        tv(team.column, s, i);
        team.frames.forEach(({frame, name}, j) => {
          const player = s.players[i][j]; frame.style.visibility = player ? '' : 'hidden';
          txt(name, player?.name || 'PLAYER ' + (j + 1));
          frame.classList.toggle('observed', s.observed[0] === i && s.observed[1] === j);
        });
      });
    }};
  };

  M.minimap = root => {
    const m = E('div', 'mod', root), f = E('div', 'mmf fx-rise', m);
    const lb = E('div', 'lbl mono', f), a = E('div', 'm', lb), b = E('div', '', lb);
    return { update(s) { toggle(m, s.show.minimap && !s.show.scoreboard); const L = s.layout.minimap; Object.assign(f.style, { left: L.x + 'px', top: L.y + 'px', width: L.size + 'px', height: L.size + 'px' });
      txt(a, s.map.name); txt(b, `ROUND ${s.round.number}`); } };
  };

  const BANNER_THEMES = HUD.bannerThemes = Object.freeze(['broadcast', 'compact', 'monument', 'impact']);
  const bannerTheme = HUD.bannerTheme = value => BANNER_THEMES.includes(value) ? value : value === 'velocity' ? 'compact' : 'broadcast';
  M.banner = root => {
    const m = E('div', 'mod', root), bn = E('div', 'bn', m), band = E('div', 'band', bn), por = E('img', 'por', bn), lg = E('div', 'lgw', bn), t1 = E('div', 't1', bn), t2 = E('div', 't2 mono', bn);
    E('div', 'bn-frame', bn); E('div', 'bn-wing l', bn); E('div', 'bn-wing r', bn);
    const watermark = E('img', 'bn-watermark', band); watermark.src = '../core/brand/mark-512.png'; watermark.alt = '';
    // Game art belongs to the added themes. Broadcast keeps its original composition.
    const scene = E('div', 'bn-scene', bn);
    const lineup = E('div', 'bn-lineup', scene);
    const artImages = Array.from({length:5}, (_, i) => { const slot = E('div', 'bn-agent', lineup); slot.style.setProperty('--i', i); const image = E('img', '', slot); image.alt = ''; return image; });
    const abilities = E('div', 'bn-abilities', scene), abilityImages = Array.from({length:4}, () => E('img', '', abilities));
    const context = E('div', 'bn-context', scene), roundLabel = E('div', 'bn-round-label', scene), teamGhost = E('div', 'bn-team-ghost', scene), sigil = E('div', 'bn-sigil', scene);
    scene.setAttribute('aria-hidden', 'true'); abilityImages.forEach(image => { image.alt = ''; });
    [...artImages, ...abilityImages].forEach(image => { image.onerror = () => { image.removeAttribute('src'); delete image.dataset.u; image.style.visibility = 'hidden'; }; });
    const artImage = (image, url) => { if (!url) { image.removeAttribute('src'); delete image.dataset.u; } setImg(image, url); };
    const kicker = E('div', 'bn-kicker', bn);
    const crest = E('div', 'bn-crest', bn), emblem = E('img', 'bn-emblem', crest);
    const footer = E('div', 'bn-footer', bn), side = E('span', 'bn-side', footer), teamLogo = E('div', 'bn-team-logo', footer), teamName = E('strong', 'bn-team-name', footer), actor = E('span', 'bn-actor', footer);
    const pz = E('div', 'pause', m), pauseCrest = E('div', 'pause-crest', pz), pauseIcon = E('img', 'pause-symbol', pauseCrest), pa = E('div', 'a', pz), pb = E('div', 'b mono', pz);
    E('div', 'pause-wing l', pz); E('div', 'pause-wing r', pz);
    let cur = 0, outAt = 0, content = '';
    const PERSIST = { techpause: 1, timeout: 1 };
    return { update(s, opts = {}) {
      const theme = bannerTheme(s.layout?.bannerTheme), compact = theme !== 'broadcast';
      bn.classList.toggle('compact', compact); pz.classList.toggle('compact', compact);
      ['monument', 'impact', 'velocity'].forEach(variant => { const selected = theme === (variant === 'velocity' ? 'compact' : variant); bn.classList.toggle(variant, selected); pz.classList.toggle(variant, selected); });
      const b = s.banner;
      if (PERSIST[b.type] || !b.type || !b.ts) { bn.classList.remove('on', 'out'); cur = 0; outAt = 0; content = ''; this.tick(s); return; }
      const T = s.teams[b.team] || s.teams[0]; const p = s.players[b.team] && s.players[b.team][b.player]; const A = p && agent(p.agent);
      const signature = JSON.stringify([b, theme, T, p?.name, p?.agent, s.round.number, s.round.phase, ...(compact ? [s.players[b.team]?.map(player => player.agent), s.map.name] : [])]);
      if (signature !== content) {
        content = signature;
        bn.style.setProperty('--c', T.color); bn.style.setProperty('--ci', ink(T.color)); por.style.display = 'none'; lg.innerHTML = '';
        const map = { round: [T.name, `WIN ROUND ${Math.max(1, s.round.number - (s.round.phase === 'end' ? 0 : 1))}${b.method ? '   /   ' + b.method : ''}`],
          ace: ['ACE', `${p ? p.name : ''}   /   ${T.tag}`], teamace: ['TEAM ACE', T.name], clutch: [`CLUTCH 1V${b.text || '?'}`, `${p ? p.name : ''}   /   ${T.tag}`],
          flawless: ['FLAWLESS', `${T.name} TAKE THE ROUND`], thrifty: ['THRIFTY', `${T.name} WIN ON AN ECO`], matchpoint: ['MATCH POINT', T.name], overtime: ['OVERTIME', 'FIRST TO LEAD BY TWO'], custom: [b.text || '', b.method || ''] };
        if (b.type === 'overtime') { bn.style.setProperty('--c', '#f0c040'); bn.style.setProperty('--ci', '#0d0d0f'); }
        const [a1, a2] = map[b.type] || [b.text, ''];
        txt(t1, compact && b.type === 'round' ? 'ROUND WIN' : a1); txt(t2, a2);
        t1.classList.toggle('long', compact && t1.textContent.length > 14);
        if (!compact && (b.type === 'ace' || b.type === 'clutch') && A) { por.src = A.full; por.style.display = ''; por.style.left = '380px'; }
        if (!compact && ['round', 'teamace', 'flawless', 'thrifty', 'matchpoint'].includes(b.type)) { const l = logo(T, 90, lg, 'lg'); l.style.position = 'absolute'; l.style.left = '220px'; l.style.top = '70px'; l.style.setProperty('--c', ink(T.color)); l.style.borderColor = ink(T.color); l.style.color = ink(T.color); }
        if (compact) {
          const personal = !!A && (b.type === 'ace' || b.type === 'clutch');
          const neutral = b.type === 'custom' || b.type === 'overtime';
          bn.classList.toggle('personal', personal); bn.classList.toggle('neutral', neutral);
          const roster = personal ? [A] : neutral ? [] : (s.players[b.team] || []).map(player => agent(player.agent)).filter(Boolean).slice(0, 5);
          artImages.forEach((image, i) => artImage(image, roster[i] && (theme === 'compact' && !personal ? roster[i].icon : roster[i].full)));
          abilityImages.forEach((image, i) => artImage(image, personal && theme === 'impact' ? A.ab?.[i]?.[1] : ''));
          sigil.innerHTML = ''; if (theme === 'compact' && !neutral) logo(T, 104, sigil);
          txt(context, theme === 'compact' ? s.map.name : personal ? `${A.name} / ${A.role}` : `${T.tag || T.name} / ${T.side || ''}`);
          txt(roundLabel, `ROUND ${String(s.round.number).padStart(2, '0')}`);
          txt(teamGhost, neutral ? 'AIR' : T.tag || '');
          const icons = {ace:'banners/skullAceCrown.webp', teamace:'banners/skullAceCrown.webp', flawless:'banners/flawless.svg', clutch:'banners/clutch.svg', thrifty:'banners/thrifty.webp'};
          crest.classList.toggle('brand-icon', !icons[b.type] && b.type !== 'round');
          setImg(emblem, icons[b.type] ? '../core/assets/' + icons[b.type] : b.type === 'round' ? '../core/assets/banners/round-victory.svg' : '../core/brand/mark-224.png');
          const captions = {flawless:'PERFECT ROUND', ace:'FIVE KILLS · ONE PLAYER', teamace:'EVERY PLAYER · ONE KILL', clutch:'LAST PLAYER STANDING', thrifty:'LESS SPENT · MORE WON', matchpoint:'ONE ROUND FROM VICTORY', overtime:'FIRST TO LEAD BY TWO', round:`ROUND ${s.round.number} · ${b.method || 'VICTORY'}`};
          txt(kicker, captions[b.type] || 'ESPORTRA');
          txt(side, neutral ? '' : T.side || ''); teamLogo.innerHTML = ''; teamLogo.style.display = neutral ? 'none' : '';
          if (!neutral) logo(T, 30, teamLogo);
          txt(teamName, neutral ? a2 : T.name || T.tag || 'TEAM ' + (b.team + 1));
          txt(actor, !neutral && (b.type === 'ace' || b.type === 'clutch') && p ? p.name : '');
        }
      }
      if (b.ts !== cur) {
        cur = b.ts; outAt = b.ts + (b.hold || 4200);
        bn.classList.remove('on', 'out', 'restored');
        bn.classList.toggle('restored', !!opts.snapshot && HUD.now() - b.ts > 400);
        if (HUD.now() < outAt) { void bn.offsetWidth; bn.classList.add('on'); }
      }
      this.tick(s);
    }, tick(s) {
      const b = s.banner, n = HUD.now();
      if (bn.classList.contains('on') && !bn.classList.contains('out') && n > outAt) { const id = cur; bn.classList.remove('restored'); bn.classList.add('out'); setTimeout(() => { if (cur === id && HUD.now() > outAt) bn.classList.remove('on', 'out'); }, bn.classList.contains('compact') ? 300 : 500); }
      const on = PERSIST[b.type]; pz.classList.toggle('on', !!on);
      if (on) { const T = s.teams[b.team] || s.teams[0];
        pz.style.setProperty('--c', b.type === 'techpause' ? 'var(--red)' : T.color);
        setImg(pauseIcon, '../core/assets/banners/' + (b.type === 'techpause' ? 'technical-pause' : 'timeout') + '.svg');
        if (b.type === 'techpause') { txt(pa, 'TECHNICAL PAUSE'); txt(pb, `PAUSED FOR ${fmt((n - b.ts) / 1000)}`); pz.style.borderBottomColor = 'var(--red)'; }
        else { txt(pa, `TIMEOUT  ${T.tag}`); txt(pb, `RESUMES IN ${fmt(Math.max(0, 60 - (n - b.ts) / 1000))}`); pz.style.borderBottomColor = T.color; } }
    } };
  };

  M.replay = root => { const m = E('div', 'mod', root), r = E('div', 'rp', m), a = E('div', 'a', r, '<div class="dot"></div>REPLAY'), b = E('div', 'b mono', r);
    return { update(s) { r.classList.toggle('on', !!s.show.replay); txt(b, `ROUND ${s.round.number}   /   ${s.map.name}`); } }; };

  M.economy = root => {
    const m = E('div', 'mod', root), ec = E('div', 'ec fx-rise', m);
    const teams = [0, 1].map(i => { const t = E('div', 'tm ' + (i ? 'r' : 'l'), ec); const hd = E('div', 'hd', t); return { t, hd, body: E('div', 'body', t) }; });
    return { update(s) {
      toggle(m, vis.economy(s));
      teams.forEach((o, i) => { tv(o.t, s, i); const T = s.teams[i], ps = s.players[i]; const bank = ps.reduce((a, p) => a + (+p.credits || 0), 0);
        const lb = [1900, 2400, 2900, 3400, 3900][Math.min(4, T.lossStreak || 0)];
        o.hd.innerHTML = `<div class="team"><span class="score num">${T.score}</span><span class="n">${T.name || T.tag || 'TEAM ' + (i + 1)}</span><span class="side mono">${T.side || ''}</span></div><div class="summary mono">BUY PHASE<span>LOSS BONUS ${money(lb)}</span></div><div class="bank"><span class="v num">${money(bank)}</span><span class="l mono">TEAM BANK</span></div>`;
        o.body.innerHTML = ps.map((p, j) => { const A = agent(p.agent), W = weapon(p.weapon), um = +p.ultMax || 7, u = +p.ult || 0;
          const before = s.prevCredits?.[i]?.[j], delta = before == null ? null : (+p.credits || 0) - Number(before);
          const unchanged = delta == null || delta === 0;
          const change = unchanged ? '—' : `${delta > 0 ? '+' : ''}${money(delta)}`;
          const abilities = [0, 1, 2].map(k => { const ability = A && A.ab[k], count = chargeCount(p, k); if (!ability) return '';
            return `<div class="ability ${count === 0 ? 'empty' : ''}" title="${ability[0]}"><img src="${ability[1]}"><div class="cp ${count > 4 ? 'chamber-q' : ''}">${abilityDots(p, k)}</div></div>`; }).join('');
          const kit = `<div class="kit"><div class="ult ${u >= um ? 'ready' : ''}">${A?.ab?.[3]?.[1] ? `<img src="${A.ab[3][1]}">` : ''}<span class="num">${u}/${um}</span></div><div class="weapon">${W ? `<img src="${W.kill}" title="${p.weapon}">` : `<span class="mono">${p.weapon || '—'}</span>`}</div><div class="armor">${armorIcon(p.armor) ? `<img src="${armorIcon(p.armor)}" title="${p.armor} armor">` : '<span class="mono">NO ARMOR</span>'}</div></div>`;
          const identity = `<div class="identity">${A ? `<img class="ag" src="${A.icon}">` : '<div class="ag empty"></div>'}<div class="person"><div class="n">${p.name || 'PLAYER ' + (j + 1)}</div><div class="agent mono">${A?.name || 'AGENT PENDING'}</div></div><div class="kda"><strong class="num">${p.k || 0} / ${p.d || 0} / ${p.a || 0}</strong><span class="mono">K / D / A</span></div></div>`;
          const econ = `<div class="econ"><span class="cr num">${money(p.credits)}</span><span class="change num ${unchanged ? 'neutral' : delta > 0 ? 'gain' : ''}" title="Credit change since the previous round">${change}</span></div>`;
          const util = `<div class="abilities">${abilities}</div>`;
          return `<div class="rw">${i ? identity + kit + util + econ : econ + util + kit + identity}</div>`; }).join(''); });
    } };
  };

  M.scoreboard = root => {
    const m = E('div', 'mod', root); E('div', 'st-dim', m); const st = E('div', 'st fx-rise', m);
    const COLS = ['K', 'D', 'A', '+/-', 'FK', 'CREDITS', 'ULT', 'ACS'];
    return { update(s) {
      toggle(m, !!s.show.scoreboard); const all = s.players.flat().filter(p=>p.name); const hasAcs = all.some(p => Number(p.acs) > 0);
      const mvp = all.reduce((a, p) => (+(hasAcs ? p.acs : p.k) > +(hasAcs ? a.acs : a.k) ? p : a), all[0]);
      const matchMeta=all.length?`MAP ${s.map.number} / ${s.map.name}<br>ROUND ${s.round.number}`:'WAITING FOR GAME DATA';
      st.innerHTML = `<div class="hd"><div class="t disp hl">SCOREBOARD</div><div class="m mono">${matchMeta}</div></div>` +
        [0, 1].map(i => { const T = s.teams[i]; const ps = [...s.players[i]].sort((a, b) => +(hasAcs ? b.acs : b.k) - +(hasAcs ? a.acs : a.k));
          return `<div class="tb" style="--c:${T.color}"><div class="row h"><div class="tn"><b>${T.score}</b>${T.name}</div><div></div>${COLS.map(c => `<div class="c mono">${c}</div>`).join('')}</div>` +
            ps.map(p => { const A = agent(p.agent); const pm = (+p.k || 0) - (+p.d || 0), acs = p.acs > 0 ? p.acs : '—';
              const values = p.name?[p.k, p.d, p.a, (pm > 0 ? '+' : '') + pm, p.fk ?? '—', p.creditsKnown===false?'—':money(p.credits), `${p.ult || 0}/${p.ultMax || 7}`, acs]:Array(8).fill('—');
              return `<div class="row ${p.alive ? '' : 'dead'}">${A ? `<img src="${A.icon}">` : '<div></div>'}<div class="pn">${p.name||'Waiting for player'}${p === mvp ? `<span class="mvp mono">${hasAcs ? 'MVP' : 'TOP FRAG'}</span>` : ''}</div><div class="ag mono">${A ? A.name : ''} / ${p.name?p.weapon||'—':'—'}</div>` +
                values.map((v, k) => `<div class="c num" style="${k === 3 ? `color:${pm >= 0 ? '#7ee0a0' : '#e0445e'}` : ''}">${v ?? '—'}</div>`).join('') + '</div>'; }).join('') + '</div>'; }).join('');
    } };
  };

  M.lowerthird = root => {
    const m = E('div', 'mod', root), lt = E('div', 'lt', m); E('div', 'acc', lt); const box = E('div', 'box', lt); let sig = '';
    return { update(s) {
      const L = s.lowerThird; const k = JSON.stringify([L, s.casters, s.show.lowerThird]); lt.classList.toggle('on', !!s.show.lowerThird); if (k === sig) return; sig = k;
      const T = s.teams[L.team] || s.teams[0]; tv(lt, s, L.team || 0); lt.classList.toggle('cast', L.kind === 'caster');
      if (L.kind === 'caster') { lt.style.setProperty('--c', 'var(--red)'); box.innerHTML = s.casters.map((c, i) => `<div><div class="k mono">${i ? 'ANALYST' : 'PLAY-BY-PLAY'}</div><div class="cn">${c.name}</div><div class="ch mono">${c.handle}</div></div>`).join(''); }
      else if (L.kind === 'player') { const p = s.players[L.team][L.player] || {}; const A = agent(p.agent);
        box.innerHTML = `<div class="pp">${A ? `<img src="${A.icon}">` : ''}<div><div class="k mono">${T.tag}   /   ${A ? A.name : ''}</div><div class="t disp hl">${p.name || ''}</div><div class="s mono">${L.sub || `${p.k} K   ${p.d} D   ${p.a} A   /   ${p.acs} ACS`}</div></div></div>`; box.style.paddingTop = '14px'; }
      else { lt.style.setProperty('--c', L.team >= 0 ? T.color : 'var(--red)'); box.style.paddingTop = ''; box.innerHTML = `<div class="k mono">${s.event.stage}</div><div class="t disp hl">${L.title}</div><div class="s mono">${L.sub}</div>`; }
    } };
  };

  // ───── full-screen scenes ─────
  M.veto = root => {
    const m = E('div', 'mod on vt', root); const sc = sceneBg(m); const ch = chrome(m, 'MAP VETO');
    const title = E('div', 'title disp hl', m, 'MAP VETO'), hdr = E('div', 'title-r mono', m); hdr.style.color = '#f0f0f2'; const box = E('div', '', m), cap = E('div', 'cap mono', m); sceneFx(sc);
    return { update(s) { if (same(this, s)) return;
      txt(hdr, `VALORANT   /   ${s.teams[0].tag}  VS  ${s.teams[1].tag}`); box.innerHTML = '';
      s.veto.forEach((v, i) => { const M_ = mapA(v.map); const c = E('div', 'card ' + (v.action === 'ban' ? 'ban' : v.action === 'decider' ? 'dec' : 'pick'), box); c.style.left = (167 + i * 230) + 'px';
        c.style.animation = `tIn .6s ${.08 * i}s var(--ease) both`; c.style.transform = 'translateY(40px)'; c.style.opacity = 0;
        const T = v.team >= 0 ? s.teams[v.team] : null; const inner = E('div', 'inner', c);
        inner.innerHTML = `<img src="${M_ ? M_.tall : ''}">${v.action === 'decider' ? '<div class="tint"></div>' : ''}<div class="sh"></div><div class="idx mono">0${i + 1}</div><div class="mn">${v.map}</div><div class="by mono">${T ? T.tag + ' ' + (v.action === 'ban' ? 'BAN' : 'PICK') : 'DECIDER'}${v.side ? '   /   ' + v.side : ''}</div>`;
        if (v.action === 'ban') c.insertAdjacentHTML('beforeend', `<svg class="slash" width="212" height="620"><line x1="12" y1="-18" x2="200" y2="638" stroke="#e0445e" stroke-width="3.5"/></svg>`);
        const col = T ? T.color : '#e0445e';
        const stp = E('div', 'stamp mono', c, v.action === 'ban' ? 'BANNED' : v.action === 'pick' ? `PICKED<small>${T.tag}</small>` : `DECIDER<small>MAP ${s.series.findIndex(x => x.map === v.map) + 1 || ''}</small>`);
        stp.style.cssText += v.action === 'ban' ? ';color:#e0445e;border:3px solid #e0445e;background:rgba(18,10,13,.9)' : v.action === 'pick' ? `;color:#fff;border:3px solid ${col};background:rgba(14,14,16,.85)` : ';color:#fff;border:3px solid #e0445e;background:#e0445e'; });
      const l = s.veto[s.veto.length - 1]; txt(cap, l ? (l.team >= 0 ? `${s.teams[l.team].tag} ${l.action.toUpperCase()}S ${l.map}` : `DECIDER: ${l.map}`) : '');
    } };
  };

  M.lineups = root => {
    const m = E('div', 'mod on lu', root); const sc = sceneBg(m); chrome(m, 'AGENT SELECT'); const box = E('div', '', m); sceneFx(sc);
    return { update(s) { if (same(this, s)) return; box.innerHTML = `<div class="vs">vs</div>` + [0, 1].map(i => { const T = s.teams[i];
      return `<div class="th disp hl ${i ? 'r' : 'l'}">${T.name}<small>${T.side || ''}   /   MAP ${s.map.number} ${s.map.name}</small></div><div class="col ${i ? 'r' : 'l'}" style="--c:${T.color}">` + s.players[i].map((p, j) => { const A = agent(p.agent);
        return `<div class="pc" style="animation:tIn .6s ${.07 * (i * 5 + j)}s var(--ease) both;opacity:0;transform:translateY(40px)"><div class="bgc" style="background:linear-gradient(180deg,#${A && A.grad[0] || '333'},transparent)"></div>${A ? `<img class="por" src="${A.full}" data-fallback="${A.icon}"><img class="icon" src="${A.icon}">` : '<div class="pending mono">AWAITING PICK</div>'}<div class="sh"></div><div class="pn">${p.name || 'PLAYER ' + (j + 1)}</div><div class="an mono">${A ? A.name : 'AGENT PENDING'}</div><div class="rl mono">${A ? A.role : ''}</div></div>`; }).join('') + '</div>'; }).join('');
      box.querySelectorAll('.pc img.por').forEach(im => { im.onerror = () => { im.onerror = null; im.src = im.dataset.fallback; im.classList.add('fallback'); }; });
    } };
  };

  M.intro = root => {
    const m = E('div', 'mod on in', root); const sc = sceneBg(m); chrome(m, 'MATCH'); const box = E('div', '', m); sceneFx(sc);
    return { update(s) { if (same(this, s)) return;
      box.innerHTML = [0, 1].map(i => { const T = s.teams[i]; return `<div class="side ${i ? 'r' : 'l'}" style="--c:${T.color}"><div class="wash" style="background:radial-gradient(ellipse at ${i ? 70 : 30}% 45%,${T.color},transparent 60%)"></div><div class="tn disp hl">${T.name}</div><div class="ts mono">${T.series} ${T.series === 1 ? 'MAP' : 'MAPS'} WON</div></div>`; }).join('') +
        `<div class="vs">vs</div><div class="ev mono">${s.event.name}</div><div class="st disp hl">${s.event.stage}${EMPTY_PREVIEW ? '' : ' / BEST OF '+s.event.bestOf}</div><div class="mp">` +
        s.series.map((x, k) => { const Mm = mapA(x.map); const w = x.winner != null ? s.teams[x.winner].tag + ' ' + x.score.join('–') : (k === s.map.number - 1 ? 'LIVE' : 'UPCOMING');
          return `<div>${Mm ? `<img src="${Mm.list}">` : ''}<span>${x.map}</span><em>MAP ${k + 1}   /   ${w}</em></div>`; }).join('') + '</div>';
      box.querySelectorAll('.side').forEach((sd, i) => { const l = logo(s.teams[i], 260, sd); l.style.position = 'absolute'; l.style.left = '350px'; l.style.top = '300px'; });
    } };
  };

  M.mapresult = root => {
    const m = E('div', 'mod on mr', root); const sc = sceneBg(m); const bgm = E('img', 'bgm', sc); chrome(m, 'MAP RESULT'); const box = E('div', '', m); sceneFx(sc);
    return { update(s) { if (same(this, s)) return;
      const Mm = mapA(s.map.name); if (Mm) setImg(bgm, Mm.splash);
      const [a, b] = s.teams.map(t => t.score), w = a === b ? 1 : a > b ? 0 : 1, T = s.teams[w];
      const all = s.players.flatMap((ps, i) => ps.map(p => ({ ...p, t: i }))).sort((x, y) => y.acs - x.acs); const mvp = all[0], A = agent(mvp.agent);
      box.innerHTML = `<div class="sc" style="--c:${T.color}"><div class="w mono">MAP ${s.map.number}   /   ${s.map.name}</div><div class="big disp hl">${Math.max(a, b)}<span>–</span>${Math.min(a, b)}</div><div class="tn">${T.name} WIN</div></div>` +
        `<div class="mvp" style="--c:${s.teams[mvp.t].color}">${A ? `<img src="${A.full}">` : ''}<div class="k mono">MATCH MVP</div><div class="n disp hl">${mvp.name}</div><div class="a mono">${s.teams[mvp.t].tag}   /   ${A ? A.name : ''}</div>` +
        `<div class="sts"><div>${mvp.acs}<small>ACS</small></div><div>${mvp.k}/${mvp.d}/${mvp.a}<small>K / D / A</small></div><div>${mvp.adr}<small>ADR</small></div><div>${mvp.hs}%<small>HEADSHOT</small></div></div></div>` +
        `<div class="tp"><div class="h mono">TOP PERFORMERS</div>` + all.slice(1, 5).map(p => { const Ap = agent(p.agent); return `<div class="r" style="--c:${s.teams[p.t].color}">${Ap ? `<img src="${Ap.icon}">` : ''}<div class="n">${p.name}</div><div class="v mono">${s.teams[p.t].tag}   /   ${p.acs} ACS   /   ${p.k}–${p.d}–${p.a}</div></div>`; }).join('') + '</div>';
    } };
  };

  M.series = root => {
    const m = E('div', 'mod on se', root); const sc = sceneBg(m); chrome(m, 'SERIES'); const title = E('div', 'title disp hl', m, 'SERIES'); const hr = E('div', 'title-r mono', m); const box = E('div', 'cards', m); sceneFx(sc);
    return { update(s) { if (same(this, s)) return;
      txt(hr, `${s.teams[0].tag} ${s.teams[0].series} – ${s.teams[1].series} ${s.teams[1].tag}   /   BO${s.event.bestOf}`);
      box.innerHTML = s.series.map((x, k) => { const Mm = mapA(x.map), done = x.winner != null, live = !done && k === s.map.number - 1;
        const pk = x.pick >= 0 ? `${s.teams[x.pick].tag} PICK` : 'DECIDER'; const sc_ = live ? [s.teams[0].score, s.teams[1].score] : x.score;
        return `<div class="cd ${done ? 'done' : ''}" style="--c:${done ? s.teams[x.winner].color : 'transparent'};animation:tIn .6s ${.1 * k}s var(--ease) both;opacity:0;transform:translateY(40px)">${Mm ? `<img src="${Mm.splash}">` : ''}<div class="sh"></div><div class="no mono">MAP ${k + 1}</div>${live ? '<div class="live mono">● LIVE</div>' : ''}<div class="mn">${x.map}</div><div class="pk mono">${pk}</div>` +
          `<div class="res">${[0, 1].map(i => { const lose = done && x.winner !== i; return `<div class="t ${lose ? 'lose' : ''}" style="order:${i ? 3 : 0}">${s.teams[i].tag}</div>`; }).join('')}<div class="s" style="order:1">${sc_ ? `<span class="${done && x.winner !== 0 ? 'lose' : ''}">${sc_[0]}</span><span style="color:#55555b"> – </span><span class="${done && x.winner !== 1 ? 'lose' : ''}">${sc_[1]}</span>` : '—'}</div></div><div class="bar"></div></div>`; }).join('');
    } };
  };

  M.bracket = root => {
    const m = E('div', 'mod on bk', root); const sc = sceneBg(m); chrome(m, 'PLAYOFFS'); const box = E('div', '', m); sceneFx(sc);
    return { update(s) { if (same(this, s)) return;
      const B = s.bracket, qy = i => 230 + i * 88, sfy = k => (qy(2 * k) + qy(2 * k + 1)) / 2, gfy = k => (sfy(2 * k) + sfy(2 * k + 1)) / 2, chy = (gfy(0) + gfy(1)) / 2;
      let h = [['QUARTERFINALS', 200], ['SEMIFINALS', 700], ['GRAND FINAL', 1150], ['CHAMPION', 1580]].map(([t, x], i) => `<div class="hd mono" style="left:${x}px;${i === 3 ? 'color:#e0445e' : ''}">${t}</div>`).join('');
      let lines = '';
      const row = (x, y, w, n, sc_, win, done) => `<div class="rw ${done ? (win ? 'w' : 'l') : ''}" style="left:${x}px;top:${y}px;width:${w}px"><span class="n">${n}</span><span class="s num">${sc_}</span></div>`;
      const con = (x1, y1, x2, y2, win) => { const xm = (x1 + x2) / 2; lines += `<path d="M${x1} ${y1 + 29} H${xm} V${y2 + 29} H${x2}" fill="none" stroke="${win ? '#e0445e' : 'rgba(255,255,255,.22)'}" stroke-width="2"/>`; };
      const need_ = (r) => r === 'qf' ? 13 : need(s);
      B.qf.forEach((mt, k) => [0, 1].forEach(j => { const i = 2 * k + j, won = mt[j * 2 + 1] > mt[(1 - j) * 2 + 1]; const done = Math.max(mt[1], mt[3]) >= need_('qf');
        h += row(200, qy(i), 330, mt[j * 2], mt[j * 2 + 1], won, done); con(530, qy(i), 700, sfy(k), won && done); }));
      B.sf.forEach((mt, k) => [0, 1].forEach(j => { const i = 2 * k + j, won = mt[j * 2 + 1] > mt[(1 - j) * 2 + 1], done = Math.max(mt[1], mt[3]) >= need_('sf');
        h += row(700, sfy(i), 310, mt[j * 2], mt[j * 2 + 1], won, done); con(1010, sfy(i), 1150, gfy(k), won && done); }));
      const g = B.gf[0], gd = Math.max(g[1], g[3]) >= need(s);
      [0, 1].forEach(j => { const won = g[j * 2 + 1] > g[(1 - j) * 2 + 1]; h += row(1150, gfy(j), 310, g[j * 2], g[j * 2 + 1], won, gd); con(1460, gfy(j), 1580, chy, won && gd); });
      h += `<div class="champ" style="left:1580px;top:${chy - 8}px;width:300px;${gd ? '' : 'background:rgba(255,255,255,.05);box-shadow:none;color:#77777c;font-size:26px;padding-top:20px'}">${gd ? (g[1] > g[3] ? g[0] : g[2]) : 'TO BE DECIDED'}</div>`;
      box.innerHTML = `<div class="title disp hl">PLAYOFFS</div><svg width="1920" height="1080" style="position:absolute;left:0;top:0">${lines}</svg>` + h;
    } };
  };

  M.standings = root => {
    const m = E('div', 'mod on sd', root); const sc = sceneBg(m); chrome(m, 'STANDINGS'); const box = E('div', '', m); sceneFx(sc);
    return { update(s) { if (same(this, s)) return;
      const all = s.players.flatMap((ps, i) => ps.map(p => ({ ...p, t: i }))).sort((a, b) => b.acs - a.acs), top = all[0];
      box.innerHTML = `<div class="title disp hl">STANDINGS</div><div class="title-r mono">${s.event.name}</div><div class="tbl"><div class="hh mono"><div class="p">#</div><div class="n">TEAM</div><div class="c">W–L</div><div class="c">MAPS</div><div class="c">RND ±</div></div>` +
        s.standings.map((r, i) => `<div class="rw ${i ? '' : 'top'}" style="animation:tIn .5s ${.05 * i}s var(--ease) both;opacity:0;transform:translateY(20px)"><div class="p num">${i + 1}</div><div class="n">${r[0]}</div><div class="c num">${r[1]}</div><div class="c num">${r[2]}</div><div class="c num">${r[3]}</div></div>`).join('') + '</div>' +
        `<div class="side"><div class="k mono">EVENT MVP RACE</div><div class="v disp hl">${top.name}</div><div class="s mono">${s.teams[top.t].name}   /   ${top.acs} ACS</div></div>`;
    } };
  };

  M.holding = root => {
    const m = E('div', 'mod on ho', root); const sc = sceneBg(m);
    const sv = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); sv.setAttribute('class', 'streaks'); sv.setAttribute('viewBox', '0 0 1920 1080'); sc.appendChild(sv);
    [[-200, 1100, 700, 500, 2100, -100], [-100, 1250, 850, 650, 2150, 50], [100, 1300, 1000, 760, 2200, 180], [400, 1350, 1250, 850, 2300, 380]].forEach((b, i) => {
      sv.insertAdjacentHTML('beforeend', `<path d="M${b[0]} ${b[1]} Q${b[2]} ${b[3]} ${b[4]} ${b[5]}" fill="none" stroke="rgba(224,68,94,.14)" stroke-width="1.2"/><path d="M${b[0]} ${b[1]} Q${b[2]} ${b[3]} ${b[4]} ${b[5]}" fill="none" stroke="#f05a78" stroke-width="${i % 2 ? 1.4 : 2.2}" pathLength="1" stroke-dasharray=".35 1" style="animation:dash ${5 + i}s linear infinite;animation-delay:-${i * 1.3}s;opacity:.7"/>`); });
    const st = document.createElement('style'); st.textContent = '@keyframes dash{from{stroke-dashoffset:1.35}to{stroke-dashoffset:0}}'; document.head.appendChild(st);
    chrome(m, ''); const lf = E('div', 'left', m); const mk = E('img', 'mark', lf); mk.src = '../core/brand/lockup-mark.png';
    const big = E('div', 'big disp hl', lf), sub = E('div', 'sub', lf), cd = E('div', 'cd', lf), cdl = E('div', 'cdl mono', lf), nx = E('div', 'next', m), sch = E('div', 'sch', m), soc = E('div', 'soc mono', m); sceneFx(sc);
    const mode = s => Q.get('mode') || document.body.dataset.mode || s.holding.mode;
    return { update(s) { if (same(this, s)) return;
      const md = mode(s); const W = { starting: ['STARTING SOON', 'Stay locked in.', 'BROADCAST BEGINS IN'], brb: ['BE RIGHT BACK', 'Grab a drink, don\u2019t go far.', 'WE RETURN IN'], ending: ['THANKS FOR WATCHING', 'GG to both teams.', 'SEE YOU NEXT TIME'] }[md] || ['STARTING SOON', '', ''];
      txt(big, W[0]); txt(sub, (s.holding.mode === md && s.holding.message) || W[1]); txt(cdl, W[2]); cd.style.display = md === 'ending' ? 'none' : '';
      const [a, b] = s.teams; nx.innerHTML = `<div class="k mono">${md === 'ending' ? 'FINAL' : 'UP NEXT'}   /   ${s.event.stage}</div><div class="m"><span class="t" style="color:${a.color}">${a.tag}</span><span class="v">vs</span><span class="t" style="color:${b.color}">${b.tag}</span></div><div class="s mono">${a.name}  /  ${b.name}${EMPTY_PREVIEW ? '' : ' · BO'+s.event.bestOf}</div>`;
      sch.innerHTML = s.schedule.map(x => `<div class="r ${x.done ? 'done' : ''}"><span class="tm num">${x.time}</span><span>${x.a && x.b ? x.a + '  VS  ' + x.b : ''}</span><span class="lab mono">${x.label}</span></div>`).join('');
      txt(soc, `${s.event.handle}   /   ${s.event.site}`);
    }, tick(s) { const t = s.holding.target ? (s.holding.target - HUD.now()) / 1000 : (s.holding.minutes || 0) * 60; const v = fmt(t); txt(cd, t <= 0 ? '0:00' : v.length < 5 ? '0' + v : v); } };
  };

  M.casters = root => {
    const m = E('div', 'mod on cs', root);
    const bg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); bg.setAttribute('class', 'holes'); bg.setAttribute('viewBox', '0 0 1920 1080');
    bg.innerHTML = `<defs><radialGradient id="cg1" cx="12%" cy="0%" r="70%"><stop offset="0" stop-color="#4a1522"/><stop offset="1" stop-color="#100f12"/></radialGradient></defs><path fill="url(#cg1)" fill-rule="evenodd" d="M0 0H1920V1080H0Z M120 250h820v462H120Z M980 250h820v462H980Z"/>`;
    m.appendChild(bg); chrome(m, 'ON THE DESK'); const box = E('div', '', m);
    return { update(s) { if (same(this, s)) return; box.innerHTML = `<div class="hd disp hl">${s.event.stage}</div><div class="hd2 mono">${s.teams[0].tag}  VS  ${s.teams[1].tag}   /   MAP ${s.map.number}</div>` +
      s.casters.slice(0, 2).map((c, i) => `<div class="frame ${i ? 'b' : 'a'}"></div><div class="plate ${i ? 'b' : 'a'}"><div class="n">${c.name}</div><div class="h mono">${c.handle}</div></div>`).join(''); } };
  };

  M.ticker = root => {
    const m = E('div', 'mod', root), tk = E('div', 'tk fx-rise', m), lab = E('div', 'lab mono', tk, '<img src="../core/brand/mark-44.png">ESPORTRA'), run = E('div', 'run', tk), belt = E('div', 'belt', run), clk = E('div', 'clock mono', tk); let sig = '';
    return { update(s) { toggle(m, s.show.ticker); const k = JSON.stringify(s.ticker); if (k === sig) return; sig = k; const items = s.ticker.map(t => `<span>${t}</span>`).join(''); belt.innerHTML = items + items; belt.style.animationDuration = Math.max(30, s.ticker.join('').length * .22) + 's'; },
      tick() { const d = new Date(); txt(clk, d.toTimeString().slice(0, 5)); } };
  };

  M.stinger = root => {
    const duration = 2;
    const m = E('div', 'mod stinger-layer', root), sg = E('div', 'sg', m); const w = ['w3', 'w1', 'w2'].map(c => E('div', 'w ' + c, sg)); const ul = E('div', 'ul', sg); const lg = E('img', 'lg', sg); lg.src = '../core/brand/lockup-mark.png';
    const ease = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2, cl = x => Math.max(0, Math.min(1, x));
    // Two-second playback; retain the original wipe proportions (scene cut: 0.96s).
    window.stingerAt = t => {
      t *= 1.25 / duration;
      const d = [0, .06, .12]; w.forEach((e, i) => { const a = ease(cl((t - d[i]) / .42)), b = ease(cl((t - .66 - (2 - i) * .05) / .42)); const x = -120 + a * 120 + b * 130; e.style.transform = `translateX(${x}%) skewX(-18deg)`; });
      const lp = cl((t - .34) / .16), lo = cl((t - .72) / .1); lg.style.opacity = lp * (1 - lo); lg.style.transform = `scale(${.8 + .2 * ease(lp) + .12 * lo})`;
      const up = ease(cl((t - .42) / .18)); ul.style.width = (up * 160 * (1 - lo)) + 'px'; ul.style.left = (960 - up * 80 * (1 - lo)) + 'px';
    };
    window.stingerAt(0); let st = 0, animation = 0;
    if (HUD.preview && document.body.dataset.modules.split(',').includes('stinger')) {
      const started = performance.now();
      const frame = () => { window.stingerAt(((performance.now() - started) % 3000) / 1000); requestAnimationFrame(frame); };
      frame();
    }
    return { update(s, opts = {}) {
      const trigger = Number(s.stinger) || 0;
      if (trigger === st) return; st = trigger;
      if (HUD.preview) return;
      if (!trigger) { cancelAnimationFrame(animation); animation = 0; window.stingerAt(0); return; }
      // A restored snapshot may resume a current wipe; an old one must never replay.
      if (opts.snapshot) { const age = HUD.now() - trigger; if (age >= 0 && age < duration * 1000) play(age); }
      else play();
    }, tick() {} };
    function play(offset = 0) {
      cancelAnimationFrame(animation);
      const started = performance.now() - offset;
      const frame = now => {
        const t = Math.max(0, (now - started) / 1000);
        window.stingerAt(Math.min(duration, t));
        animation = t < duration ? requestAnimationFrame(frame) : 0;
      };
      frame(performance.now());
    }
  };

  // ═════════ EXTENDED LIBRARY ═════════
  const HOW = { elim: 'ELIMINATION', boom: 'SPIKE DETONATED', defuse: 'SPIKE DEFUSED', time: 'TIME EXPIRED' };
  const RIC = (how, c = '#fff', z = 14) => ({
    elim: `<svg width="${z}" height="${z}" viewBox="0 0 14 14"><path d="M2.5 2.5L11.5 11.5M11.5 2.5L2.5 11.5" stroke="${c}" stroke-width="2.4" stroke-linecap="round"/></svg>`,
    boom: `<svg width="${z}" height="${z}" viewBox="0 0 14 14"><path d="M7 0L8.6 4.8L13.6 3.4L10.2 7L13.6 10.6L8.6 9.2L7 14L5.4 9.2L.4 10.6L3.8 7L.4 3.4L5.4 4.8Z" fill="${c}"/></svg>`,
    defuse: `<svg width="${z}" height="${z}" viewBox="0 0 14 14"><path d="M7 1L12.5 4V10L7 13L1.5 10V4Z" fill="none" stroke="${c}" stroke-width="1.8"/><path d="M4.6 7.2L6.4 9L9.6 5.2" fill="none" stroke="${c}" stroke-width="1.8"/></svg>`,
    time: `<svg width="${z}" height="${z}" viewBox="0 0 14 14"><circle cx="7" cy="7" r="5.6" fill="none" stroke="${c}" stroke-width="1.8"/><path d="M7 3.8V7L9.3 8.4" fill="none" stroke="${c}" stroke-width="1.8" stroke-linecap="round"/></svg>` }[how] || '');
  HUD.roundIcon = RIC;
  const sideOf = (s, t, r) => { const f = (s.firstSide || ['ATK', 'DEF'])[t], o = f === 'ATK' ? 'DEF' : 'ATK'; return r <= 12 ? f : r <= 24 ? o : ((r - 25) % 2 ? o : f); };
  HUD.sideOf = sideOf;
  const alive = (s, t) => s.players[t].filter(p => p.alive);
  HUD.winProb = s => {                         // simple, explainable heuristic; set s.winProbOverride (0-100, team A) to drive it from a real model
    if (typeof s.winProbOverride === 'number') return s.winProbOverride / 100;
    const str = t => alive(s, t).reduce((a, p) => a + 1 + (+p.hp || 0) / 100 * .35 + (p.armor >= 50 ? .15 : p.armor ? .07 : 0), 0) + s.players[t].reduce((a, p) => a + (+p.credits || 0), 0) / 40000;
    let a = str(0), b = str(1); if (s.round.phase === 'planted') { if (sideOf(s, 0, s.round.number) === 'ATK') a += 1.2; else b += 1.2; }
    if (!a && !b) return .5; return a / (a + b);
  };

  M.roundhistory = root => {
    const m = E('div', 'mod', root), rh = E('div', 'rh fx-rise', m);
    const RHMAP = {
      elim:   '../core/assets/roundWinReason/kills.webp',
      boom:   '../core/assets/roundWinReason/detonated.webp',
      defuse: '../core/assets/roundWinReason/defused.webp',
      time:   '../core/assets/roundWinReason/timeout.webp',
    };
    return { update(s) {
      toggle(m, (s.show.roundHistory || s.round.phase === 'buy') && !s.show.scoreboard);
      rh.classList.toggle('buy', s.round.phase === 'buy' && vis.economy(s));
      const n = Math.max(24, Math.min(30, Math.ceil((s.rounds.length + 1) / 2) * 2));
      const start = Math.max(0, Math.ceil((s.rounds.length + 1 - n) / 2) * 2);
      const half = i => i === 12 || (i >= 24 && i % 2 === 0);
      let header = '<div class="rh-head"><span class="rh-lab">ROUND</span>';
      for (let j = 0; j < n; j++) { const i = start + j; if (half(i)) header += '<span class="half"></span>'; header += `<span class="num ${i === s.rounds.length ? 'now' : ''}">${String(i + 1).padStart(2, '0')}</span>`; }
      header += '</div>';
      const buildRow = (teamIdx, isTop) => {
        const T = s.teams[teamIdx];
        let h = `<span class="rh-lab" style="--c:${T.color}">${T.tag || 'T' + (teamIdx + 1)}</span>`;
        for (let j = 0; j < n; j++) { const i = start + j;
          if (half(i)) {
            if (isTop && i === 12) {
              h += `<span class="half"><img src="../core/assets/misc/swapIcon.svg" width="16" height="16"></span>`;
            } else {
              h += '<span class="half"></span>';
            }
          }
          const r = s.rounds[i];
          if (r && r.w === teamIdx) {
            const icon = RHMAP[r.how] || '';
            const reason = HOW[r.how] || 'ROUND WON';
            h += `<span class="c w" style="--c:${T.color}" title="Round ${i + 1}: ${T.name} — ${reason}" aria-label="Round ${i + 1}: ${T.name} — ${reason}">${icon ? `<span class="result-icon" style="--result:url('${icon}')"></span>` : ''}</span>`;
          } else {
            const isCurrent = i === s.rounds.length;
            h += `<span class="c${isCurrent ? ' now' : ''}"></span>`;
          }
        }
        return `<div class="rh-row" style="--c:${T.color}">${h}</div>`;
      };
      rh.innerHTML = header + buildRow(0, true) + buildRow(1, false);
    } };
  };

  M.winprob = root => { const m = E('div', 'mod', root), wp = E('div', 'winp fx-rise', m), na = E('div', 'n num', wp), bar = E('div', 'bar', wp), ia = E('i', '', bar), ib = E('i', '', bar); E('b', '', bar); E('div', 'lab mono', wp, 'WIN PROBABILITY'); const nb = E('div', 'n num', wp);
    return { update(s) { toggle(m, s.show.winProb && ['live', 'planted', 'buy'].includes(s.round.phase) && !s.show.scoreboard); const p = HUD.winProb(s);
      ia.style.width = (p * 100) + '%'; ib.style.width = (100 - p * 100) + '%'; ia.style.background = s.teams[0].color; ib.style.background = s.teams[1].color;
      txt(na, Math.round(p * 100) + '%'); txt(nb, Math.round(100 - p * 100) + '%'); na.style.color = s.teams[0].color; nb.style.color = s.teams[1].color; } }; };

  M.spiketimer = root => {
    const m = E('div', 'mod scorebug-layer', root), sk = E('div', 'sk sb-mid notch-b', m), icon = E('div', 'tm', sk);
    return { update(s) {
      const on = s.show.spikeTimer && s.round.phase === 'planted' && !s.show.scoreboard;
      toggle(m, on); icon.classList.toggle('planted', !!on);
      if (on) pulseSpike(icon, s.round); else delete icon.dataset.spikeDeadline;
    }, tick(s) { if (m.classList.contains('on')) pulseSpike(icon, s.round); } };
  };

  M.moments = root => { const m = E('div', 'mod', root), mo = E('div', 'mo', m); let sig = '';
    function items(s) { const out = [], n = HUD.now(), live = ts => Number.isFinite(ts) && ts > 0 && n >= ts && n - ts < 6500, kf = s.killfeed;
      if (kf.length && live(kf[0].ts)) { const k = P(s, kf[0].killer); if (k) out.push({ id: 'fb', t: kf[0].killer[0], k: 'FIRST BLOOD', p: k, sub: 'ON ' + (P(s, kf[0].victim) || {}).name, priority: 1 }); }
      const cnt = {}; kf.forEach(e => { const id = e.killer.join(); cnt[id] = cnt[id] || { n: 0, e }; cnt[id].n++; cnt[id].e = e; });
      Object.values(cnt).forEach(c => { if (c.n >= 2 && live(c.e.ts)) out.push({ id: 'mk' + c.e.killer + c.n, t: c.e.killer[0], k: c.n >= 5 ? 'ACE' : c.n + 'K', p: P(s, c.e.killer), sub: 'THIS ROUND', priority: c.n + 2 }); });
      if (['live', 'planted'].includes(s.round.phase)) [0, 1].forEach(t => { const a = alive(s, t), b = alive(s, 1 - t); if (a.length === 1 && b.length >= 2) out.push({ id: 'cl' + t + b.length, t, k: '1V' + b.length, p: a[0], sub: 'CLUTCH ATTEMPT', priority: 2 }); });
      return out.sort((a, b) => b.priority - a.priority).slice(0, 1); }
    return { update(s) { toggle(m, s.show.moments && !vis.focused(s) && !vis.economy(s)); this.tick(s); }, tick(s) { const it = items(s), k = it.map(x => x.id).join('|'); if (k === sig) return; sig = k;
      mo.innerHTML = it.map(x => { const A = agent(x.p.agent), c = s.teams[x.t].color; return `<div class="m" style="--c:${c};--ci:${ink(c)}"><div class="k">${x.k}</div>${A ? `<img src="${A.icon}">` : ''}<div class="t">${x.p.name}</div><div class="s mono">${x.sub}</div></div>`; }).join(''); } }; };

  M.toast = root => { const m = E('div', 'mod', root), ts = E('div', 'ts', m); E('div', 'k mono', ts, 'UPDATE'); const t = E('div', 't', ts);
    return { update(s) { txt(t, s.toast.text || ''); }, tick(s) { ts.classList.toggle('on', !!(s.toast.ts && HUD.now() - s.toast.ts < 7000) || Q.get('toast') === '1'); } }; };

  M.sponsor = root => { const m = E('div', 'mod', root), sp = E('div', 'spn fx-rise', m); E('div', 'k mono', sp, 'PRESENTED BY'); const v = E('div', 'v', sp); let cur = -1, signature = '';
    return { update(s) { toggle(m, s.show.sponsor && s.sponsors.length && vis.players(s)); const next = JSON.stringify([s.sponsors, s.layout?.sponsorRotation, s.layout?.sponsorSeconds]); if (signature !== next) { signature = next; cur = -1; } this.tick(s); }, tick(s) { if (!s.sponsors.length) return; const seconds = Number.isInteger(s.layout?.sponsorSeconds) && s.layout.sponsorSeconds >= 5 && s.layout.sponsorSeconds <= 120 ? s.layout.sponsorSeconds : 8; const i = s.layout?.sponsorRotation === false ? 0 : Math.floor(HUD.now() / (seconds * 1000)) % s.sponsors.length; if (i === cur) return; cur = i; const x = s.sponsors[i];
      v.style.animation = 'none'; void v.offsetWidth; v.style.animation = ''; v.innerHTML = x.logo ? `<img src="${x.logo}"><span class="mono">${x.line || ''}</span>` : `<b>${x.name}</b><span class="mono">${x.line || ''}</span>`; } }; };

  M.eventbug = root => { const m = E('div', 'mod', root), eb = E('div', 'eb fx-rise', m); const im = E('img', '', eb); im.src = '../core/brand/mark-44.png'; const a = E('div', 'a mono', eb);
    return { update(s) { toggle(m, s.show.eventBug); a.innerHTML = `${s.event.name}<b>${s.event.stage}</b>`; } }; };

  M.poll = root => { const m = E('div', 'mod', root), pq = E('div', 'pq fx-rise', m);
    return { update(s) { toggle(m, s.show.poll); const tc = l => (s.teams.find(t => t.tag === l) || {}).color || 'var(--red)';
      pq.innerHTML = `<div class="k mono">LIVE POLL</div><div class="q">${s.poll.question}</div>` + s.poll.options.map(o => `<div class="o" style="--c:${tc(o.label)}"><div class="l mono">${o.label}</div><div class="b"><i style="width:${o.pct}%"></i></div><div class="p num">${o.pct}%</div></div>`).join('') + `<div class="v mono">${money(s.poll.votes)} VOTES</div>`; } }; };



  M.roundrecap = root => { const m = E('div', 'mod', root), rr = E('div', 'rr fx-rise', m);
    return { update(s) { toggle(m, vis.recap(s)); const last = s.rounds[s.rounds.length - 1]; if (!last) return; const W = s.teams[last.w];
      const kills = {}; s.killfeed.forEach(k => { const id = k.killer.join(); kills[id] = (kills[id] || 0) + 1; });
      rr.style.setProperty('--c', W.color); rr.style.setProperty('--ci', ink(W.color));
      rr.innerHTML = `<div class="hd">${RIC(last.how, ink(W.color), 22)}<div class="t">${W.name} TAKE ROUND ${s.rounds.length}</div><div class="s mono">${HOW[last.how] || ''}</div></div><div class="cols">` +
        [0, 1].map(t => `<div class="col">` + s.players[t].map((p, j) => { const A = agent(p.agent), k = kills[t + ',' + j] || 0; return `<div class="r ${p.alive ? '' : 'dead'}">${A ? `<img src="${A.icon}">` : ''}<div class="n">${p.name}</div><div class="k mono"><b>${k}</b> K THIS ROUND</div></div>`; }).join('') + '</div>').join('') +
        `</div><div class="ft mono">${s.teams.map((T, t) => `<span>${T.tag} BANK <b>${money(s.players[t].reduce((a, p) => a + (+p.credits || 0), 0))}</b></span>`).join('')}<span>SCORE ${s.teams[0].score} – ${s.teams[1].score}</span></div>`; } }; };

  M.duel = root => { const m = E('div', 'mod', root), du = E('div', 'du fx-rise', m);
    return { update(s) { toggle(m, s.show.duel && !s.show.scoreboard && !s.show.teamCompare); const d = s.duel, a = P(s, d.a), b = P(s, d.b); if (!a || !b) return;
      const side = (p, t, c) => { const A = agent(p.agent); return `<div class="p ${c}" style="--c:${s.teams[t].color}"><div class="bgc" style="background:linear-gradient(180deg,#${A && A.grad[0] || '333'},transparent)"></div>${A ? `<img src="${A.full}">` : ''}<div class="sh"></div><div class="n">${p.name}</div><div class="t mono">${s.teams[t].tag}   /   ${A ? A.name : ''}</div></div>`; };
      const ratio = p => (+p.k || 0) / Math.max(1, +p.d || 0);
      const rows = [['KILLS', a.k, b.k, 1], ['DEATHS', a.d, b.d, -1], ['ASSISTS', a.a, b.a, 1], ['K/D', ratio(a), ratio(b), 1],
        ['FIRST KILLS', a.fk, b.fk, 1], ['CREDITS', a.credits, b.credits, 1], ['ULT', a.ult, b.ult, 1], ['ACS', a.acs > 0 ? a.acs : null, b.acs > 0 ? b.acs : null, 1]];
      const display = (label, value, p) => value == null ? '—' : label === 'K/D' ? value.toFixed(2) : label === 'CREDITS' ? money(value) : label === 'ULT' ? `${value || 0}/${p.ultMax || 7}` : value;
      du.innerHTML = side(a, d.a[0], 'a') + side(b, d.b[0], 'b') + `<div class="hd mono">${d.title || 'HEAD TO HEAD'}</div><div class="rows">` + rows.map(([label, x, y, dir]) =>
        `<div class="row"><div class="v ${x != null && y != null && (x - y) * dir > 0 ? 'win' : ''}">${display(label, x, a)}</div><div class="l mono">${label}</div><div class="v ${x != null && y != null && (y - x) * dir > 0 ? 'win' : ''}">${display(label, y, b)}</div></div>`).join('') + '</div>'; } }; };

  M.teamcompare = root => { const m = E('div', 'mod', root), tc = E('div', 'tc fx-rise', m);
    return { update(s) { toggle(m, s.show.teamCompare && !s.show.scoreboard); const [A, B] = s.teams, S = s.teamStats || [{}, {}];
      const sum = (t, key) => s.players[t].reduce((total, p) => total + (+p[key] || 0), 0);
      const acs = t => s.players[t].every(p => p.acs > 0) ? Math.round(sum(t, 'acs') / s.players[t].length) : null;
      const defuses = t => Math.max(+S[t].defuses || 0, s.rounds.filter(r => r.w === t && r.how === 'defuse').length);
      const rows = [['ROUNDS WON', A.score, B.score], ['TOTAL KILLS', sum(0, 'k'), sum(1, 'k')], ['TEAM BANK', sum(0, 'credits'), sum(1, 'credits')],
        ['ULTIMATES READY', s.players[0].filter(p => +p.ult >= +p.ultMax).length, s.players[1].filter(p => +p.ult >= +p.ultMax).length],
        ['FIRST KILLS', S[0].firstKills, S[1].firstKills], ['SPIKE PLANTS', S[0].plants, S[1].plants], ['DEFUSES', defuses(0), defuses(1)],
        ['CLUTCHES', S[0].clutches, S[1].clutches], ['ECO WINS', S[0].ecoWins, S[1].ecoWins], ['AVERAGE ACS', acs(0), acs(1)]];
      tc.style.setProperty('--a', A.color); tc.style.setProperty('--b', B.color);
      tc.innerHTML = `<div class="hd"><div class="t" style="color:${A.color}">${A.tag}</div><div class="k mono">TEAM COMPARISON   /   MAP ${s.map.number}</div><div class="t" style="color:${B.color}">${B.tag}</div></div>` +
        rows.map(([l, x, y]) => { const tot = (+x || 0) + (+y || 0) || 1; return `<div class="row"><div class="v">${x == null ? '—' : l === 'TEAM BANK' ? money(x) : x}</div><div class="bar a"><i style="width:${(+x || 0) / tot * 100}%"></i></div><div class="l mono">${l}</div><div class="bar b"><i style="width:${(+y || 0) / tot * 100}%"></i></div><div class="v">${y == null ? '—' : l === 'TEAM BANK' ? money(y) : y}</div></div>`; }).join(''); } }; };

  M.clock = root => { const m = E('div', 'mod on', root), ck = E('div', 'ck', m), k = E('div', 'k mono', ck), v = E('div', 'v', ck);
    return { update(s) { txt(k, { starting: 'WE GO LIVE IN', brb: 'BACK IN', ending: 'NEXT SHOW' }[s.holding.mode] || 'BREAK'); }, tick(s) { const t = s.holding.target ? (s.holding.target - HUD.now()) / 1000 : (s.holding.minutes || 0) * 60; txt(v, fmt(t)); } }; };

  // full-screen scenes
  M.profile = root => { const m = E('div', 'mod on pp', root); const sc = sceneBg(m); const wash = E('div', 'wash', sc); chrome(m, 'PLAYER SPOTLIGHT'); const box = E('div', '', m); sceneFx(sc);
    return { update(s) { if (same(this, s) && this._sp === JSON.stringify(s.spotlight)) return; this._sp = JSON.stringify(s.spotlight); const sp = s.spotlight, p = P(s, [sp.team, sp.player]); if (!p) return; const A = agent(p.agent), T = s.teams[sp.team], se = sp.season || {};
      wash.style.background = `radial-gradient(ellipse at 60% 40%,#${A && A.grad[0] || '444'},transparent 65%)`;
      box.innerHTML = `${A ? `<img class="por" src="${A.full}">` : ''}<div class="k mono" style="--c:${T.color}">${T.name}   /   ${A ? A.role : ''}</div><div class="n disp hl">${p.name}</div><div class="a mono">${A ? A.name : ''}   /   ${s.event.stage}</div>` +
        `<div class="grid">${[[p.acs, 'ACS THIS MAP'], [`${p.k}/${p.d}/${p.a}`, 'K / D / A'], [p.adr, 'ADR'], [se.rating, 'EVENT RATING'], [se.kpr, 'KILLS PER ROUND'], [se.clutches, 'CLUTCHES WON']].map(([v, l]) => `<div>${v ?? '–'}<small>${l}</small></div>`).join('')}</div>${sp.quote ? `<div class="q">“${sp.quote}”</div>` : ''}`;
      box.querySelector('.k').style.color = T.color; } }; };

  M.roster = root => { const m = E('div', 'mod on tr', root); const sc = sceneBg(m); chrome(m, 'TEAM'); const box = E('div', '', m); sceneFx(sc);
    return { update(s) { if (same(this, s)) return; const t = +(Q.get('team') || document.body.dataset.team || 0), T = s.teams[t];
      const live = s.players[t].some(player => player.name), registered = (s.registeredRoster?.[t] || []).filter(player => ['starter', 'registered'].includes(player.role)).slice(0, 5);
      const players = live || !registered.length ? s.players[t] : registered;
      const text = value => String(value || '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
      box.innerHTML = `<div class="head" style="--c:${T.color}"><div class="lgx"></div><div><div class="t disp hl">${T.name}</div><div class="s mono">${s.event.name}   /   ${s.event.stage}</div></div></div><div class="cards" style="--c:${T.color}">` +
        players.map((p, j) => { const A = agent(p.agent); return `<div class="cd" style="animation:tIn .6s ${.08 * j}s var(--ease) both;opacity:0;transform:translateY(40px)"><div class="bgc" style="background:linear-gradient(180deg,#${A && A.grad[0] || '333'},transparent)"></div>${A ? `<img src="${A.full}">` : ''}<div class="sh"></div><div class="n">${text(p.name)}</div><div class="a mono">${A ? A.name + '  /  ' + A.role : ''}</div><div class="s mono">${live ? `${p.acs} ACS   ${p.k}/${p.d}/${p.a}` : 'REGISTERED LINEUP · WAITING FOR GAME DATA'}</div></div>`; }).join('') + '</div>';
      const l = logo(T, 120, box.querySelector('.lgx')); l.style.position = 'relative'; } }; };

  const mapBreak = half => root => { const m = E('div', 'mod on mb', root); const sc = sceneBg(m); chrome(m, half ? 'HALFTIME' : 'MAP BREAKDOWN'); const title = E('div', 'title disp hl', m, half ? 'HALFTIME' : 'MAP BREAKDOWN'); const box = E('div', '', m); sceneFx(sc);
    return { update(s) { if (same(this, s) && this._r === s.rounds.length) return; this._r = s.rounds.length; const R = half ? s.rounds.slice(0, 12) : s.rounds;
      const won = (t, a, b) => R.slice(a, b).filter(r => r.w === t).length, sc_ = t => R.filter(r => r.w === t).length;
      const sides = t => [0, 1].map(h => sideOf(s, t, h ? 13 : 1));
      let h = `<div class="score">${s.teams.map((T, t) => `<div class="t" style="color:${T.color}">${T.tag}</div>`).join(`<div class="v disp hl">${sc_(0)}–${sc_(1)}</div>`)}</div>`;
      h += `<div class="halves"><div class="row h"><div>TEAM</div><div>FIRST HALF</div><div>SECOND HALF</div><div>OVERTIME</div></div>` + s.teams.map((T, t) => `<div class="row"><div class="n" style="color:${T.color}">${T.name}</div><div class="v">${won(t, 0, 12)}<small class="mono" style="font-size:11px;color:#8a8a90;margin-left:8px">${sides(t)[0]}</small></div><div class="v">${half ? '–' : won(t, 12, 24)}${half ? '' : `<small class="mono" style="font-size:11px;color:#8a8a90;margin-left:8px">${sides(t)[1]}</small>`}</div><div class="v">${R.length > 24 ? won(t, 24, 99) : '–'}</div></div>`).join('') + '</div>';
      h += `<div class="tl"><div class="k mono">ROUND BY ROUND</div><div class="strip">` + R.map((r, i) => (i === 12 ? '<div class="half"></div>' : '') + `<div class="c w" style="--c:${s.teams[r.w].color}"><em>${i + 1}</em>${RIC(r.how, '#fff', 18)}</div>`).join('') + '</div></div>';
      const S = s.teamStats || [{}, {}];
      if (half) { const T0 = s.teams[0], T1 = s.teams[1]; h += `<div class="note">SIDES SWITCH<small>${T0.tag} TO ${sides(0)[1]}   /   ${T1.tag} TO ${sides(1)[1]}</small></div>`; }
      h += `<div class="side">${[['ATTACK ROUNDS WON', t => R.filter((r, i) => r.w === t && sideOf(s, t, i + 1) === 'ATK').length], ['DEFENSE ROUNDS WON', t => R.filter((r, i) => r.w === t && sideOf(s, t, i + 1) === 'DEF').length], ['SPIKE PLANTS', t => S[t].plants], ['CLUTCHES', t => S[t].clutches]].map(([l, f]) => `<div class="r"><b style="color:${s.teams[0].color}">${f(0) ?? '–'}</b><span>${l}</span><b style="color:${s.teams[1].color}">${f(1) ?? '–'}</b></div>`).join('')}</div>`;
      box.innerHTML = h; } }; };
  M.mapbreakdown = mapBreak(false); M.halftime = mapBreak(true);

  M.champion = root => { const m = E('div', 'mod on ch', root); const sc = sceneBg(m);
    const sv = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); sv.setAttribute('class', 'rays'); sv.setAttribute('viewBox', '0 0 1920 1080');
    let r = ''; for (let i = 0; i < 36; i++) { const a = i / 36 * Math.PI * 2; r += `<line x1="960" y1="260" x2="${960 + Math.cos(a) * 1400}" y2="${260 + Math.sin(a) * 1400}" stroke="rgba(224,68,94,${i % 2 ? .05 : .11})" stroke-width="${i % 3 ? 1 : 2}"/>`; } sv.innerHTML = r; sc.appendChild(sv);
    chrome(m, 'CHAMPIONS'); const box = E('div', '', m); sceneFx(sc);
    const TROPHY = c => `<svg class="tro" viewBox="0 0 300 330"><path d="M70 20H230V120C230 175 195 210 150 215C105 210 70 175 70 120Z" fill="none" stroke="${c}" stroke-width="6"/><path d="M70 45H28C28 105 52 130 80 140M230 45H272C272 105 248 130 220 140" fill="none" stroke="${c}" stroke-width="6"/><path d="M150 215V265M100 300H200L185 265H115Z" fill="none" stroke="${c}" stroke-width="6"/><path d="M150 55L172 95L150 120L128 95Z" fill="${c}"/><path d="M95 300H205V318H95Z" fill="${c}"/></svg>`;
    return { update(s) { if (same(this, s)) return; let w = s.champion && s.champion.team >= 0 ? s.champion.team : s.teams[0].series === s.teams[1].series ? (s.teams[0].score >= s.teams[1].score ? 0 : 1) : (s.teams[0].series > s.teams[1].series ? 0 : 1); const T = s.teams[w], L = s.teams[1 - w];
      box.innerHTML = TROPHY('#f2cf6b') + `<div class="k mono">${s.event.name}   /   CHAMPIONS</div><div class="t disp hl">${T.name}</div><div class="s mono">DEFEAT ${L.name} ${Math.max(T.series, need(s))}–${Math.min(L.series, need(s) - 1)} IN THE ${s.event.stage}</div><div class="roster" style="--c:${T.color}">` +
        s.players[w].map(p => { const A = agent(p.agent); return `<div>${A ? `<img src="${A.icon}">` : ''}${p.name}</div>`; }).join('') + '</div>'; } }; };

  M.schedule = root => { const m = E('div', 'mod on sc2', root); const sc = sceneBg(m); chrome(m, 'SCHEDULE'); E('div', 'title disp hl', m, 'TODAY'); const hr = E('div', 'title-r mono', m); const box = E('div', 'list', m); sceneFx(sc);
    return { update(s) { if (same(this, s)) return; txt(hr, s.event.name); const live = s.schedule.findIndex(x => !x.done);
      box.innerHTML = s.schedule.map((x, i) => `<div class="r ${x.done ? 'done' : ''} ${i === live ? 'live' : ''}"><div class="tm">${x.time}</div><div class="m">${x.a && x.b ? `${x.a}<i>vs</i>${x.b}` : `<span style="font-size:36px">${x.label}</span>`}${i === live ? '<span class="lv">NEXT UP</span>' : ''}</div><div class="l mono">${x.a && x.b ? x.label : ''}</div></div>`).join(''); } }; };

  M.seriesmaps = root => {
    const m = E('div', 'mod', root), sm = E('div', 'sm fx-rise', m);
    function buildTile(s, x, i) {
      const liveIdx = s.map.number - 1;
      const isPast = x.winner !== null;
      const isLive = !isPast && i === liveIdx;
      const isNext = !isPast && !isLive && i === liveIdx + 1;
      const isDec  = !isPast && !isLive && x.pick === -1;
      const stateClass = isPast ? 'past' : isLive ? 'live' : 'future';
      let badge = '';
      if (isLive) badge = `<span class="bd live">CURRENT:</span>`;
      else if (isDec) badge = `<span class="bd dec">DECIDER:</span>`;
      else if (isNext) badge = `<span class="bd next">NEXT:</span>`;
      const pickLogo = x.pick >= 0 && s.teams[x.pick].logo ? `<img class="wl" src="${s.teams[x.pick].logo}">` : '';
      const winLogo = isPast && x.winner !== null && s.teams[x.winner].logo ? `<img class="wl" src="${s.teams[x.winner].logo}">` : '';
      let score = '';
      if (isPast && x.score) score = `<span class="sc">${x.score[0]}-${x.score[1]}</span>`;
      else if (isLive) score = `<span class="sc">${s.teams[0].score}-${s.teams[1].score}</span>`;
      return `<div class="tile ${stateClass}">${isPast ? winLogo : pickLogo}${badge}<span class="mn">${x.map}</span>${score}</div>`;
    }
    return { update(s) {
      if (s.series.length <= 1) { toggle(m, false); return; }
      toggle(m, s.show.seriesMaps !== false);
      sm.innerHTML = s.series.map((x, i) => buildTile(s, x, i)).join('');
    } };
  };

  M.ingame = root => { const parts = ['minimap', 'eventbug', 'seriesmaps', 'scorebug', 'winprob', 'roundhistory', 'toast', 'killfeed', 'moments', 'poll', 'players', 'playercams', 'observed', 'sponsor', 'roundrecap', 'economy', 'duel', 'teamcompare', 'scoreboard', 'banner', 'replay', 'lowerthird', 'stinger'].map(k => M[k](root)); return { update(s, opts) { parts.forEach(p => p.update(s, opts)); }, tick(s) { parts.forEach(p => p.tick && p.tick(s)); }, frame(s) { parts.forEach(p => p.frame && p.frame(s)); } }; };

  // Sample previews activate the requested source without publishing or consuming live state.
  function previewState(list) {
    const s = clone(HUD_DEFAULT);
    if (Q.has('bannerTheme')) s.layout.bannerTheme = bannerTheme(Q.get('bannerTheme'));
    const gates = {scorebug:'scorebug', players:'players', observed:'observed', minimap:'minimap', economy:'economy', scoreboard:'scoreboard', lowerthird:'lowerThird', replay:'replay', ticker:'ticker', roundhistory:'roundHistory', winprob:'winProb', spiketimer:'spikeTimer', moments:'moments', sponsor:'sponsor', eventbug:'eventBug', poll:'poll', duel:'duel', teamcompare:'teamCompare', roundrecap:'roundRecap', playercams:'playerCams'};
    Object.assign(s.show, {economy:false, scoreboard:false, teamCompare:false, duel:false, roundRecap:false});
    list.forEach(name => { if (gates[name]) s.show[gates[name]] = true; });
    s.round.phase = 'live'; s.round.endsAt = previewNow + 84000;
    if (list.includes('economy')) s.round.phase = 'buy';
    if (list.includes('roundrecap')) s.round.phase = 'end';
    if (list.includes('spiketimer')) { s.round.phase = 'planted'; s.round.endsAt = previewNow + 26000; }
    if (list.includes('moments')) {
      s.killfeed = [{killer:[1,0], victim:[0,3], weapon:'OPERATOR', hs:false, ts:previewNow - 200},
        {killer:[1,0], victim:[0,4], weapon:'OPERATOR', hs:false, ts:previewNow - 100}];
    }
    if (list.includes('banner')) Object.assign(s.banner, {type:bannerTheme(s.layout.bannerTheme) !== 'broadcast' ? 'flawless' : 'ace', team:1, player:0, ts:previewNow - 100});
    if (list.includes('toast')) s.toast.ts = previewNow - 100;
    return s;
  }

  // ───── demo simulator (?demo=1): loops a fast round so overlays can be tested without the control panel ─────
  function demo() {
    let s = HUD.state; const R = (a, b) => a + Math.floor(Math.random() * (b - a + 1)); const W = ['VANDAL', 'PHANTOM', 'OPERATOR', 'SHERIFF', 'SPECTRE', 'GHOST'];
    function newRound() { s.round.number++; s.round.phase = 'buy'; s.round.endsAt = HUD.now() + 8000; s.killfeed = [];
      s.players.forEach(t => t.forEach(p => { p.alive = true; p.hp = 100; p.armor = [25, 50][R(0, 1)]; p.credits = R(4, 90) * 100; p.weapon = W[R(0, 4)]; })); HUD.commit(s, { local: true }); }
    function step() {
      const n = HUD.now(), r = s.round;
      if (r.phase === 'buy' && n > r.endsAt) { r.phase = 'live'; r.endsAt = n + 100000; }
      else if (r.phase === 'live' || r.phase === 'planted') {
        const alive = [0, 1].map(i => s.players[i].map((p, j) => [i, j]).filter(([i, j]) => s.players[i][j].alive));
        if (Math.random() < .5 && alive[0].length && alive[1].length) { const kt = R(0, 1), k = alive[kt][R(0, alive[kt].length - 1)], v = alive[1 - kt][R(0, alive[1 - kt].length - 1)];
          const P_ = s.players[k[0]][k[1]], V = s.players[v[0]][v[1]]; V.alive = false; V.hp = 0; V.d++; P_.k++; P_.hp = Math.max(1, P_.hp - R(0, 60)); P_.ult = Math.min(P_.ultMax, P_.ult + 1);
          s.killfeed.push({ killer: k, victim: v, weapon: P_.weapon, hs: Math.random() < .3, ts: n }); if (!P_.alive) s.observed = k; s.observed = k; }
        if (r.phase === 'live' && Math.random() < .12) { r.phase = 'planted'; r.endsAt = n + 45000; }
        const a0 = s.players[0].some(p => p.alive), a1 = s.players[1].some(p => p.alive);
        if (!a0 || !a1) { const w = a0 ? 0 : 1; s.teams[w].score++; if (s.teams[w].score > 13 && s.teams[w].score - s.teams[1 - w].score >= 2) s.teams.forEach(t => t.score = 0);
          s.banner = { type: 'round', team: w, player: 0, text: '', method: r.phase === 'planted' && w === 0 ? 'SPIKE DEFUSED' : 'ELIMINATION', ts: n, hold: 3000 }; r.phase = 'end'; r.endsAt = 0; r.remaining = 0; HUD.commit(s, { local: true }); setTimeout(newRound, 4000); return; }
      }
      HUD.commit(s, { local: true });
    }
    setInterval(step, 1300);
  }

  // ───── boot ─────
  function fit(el) { const k = Math.min(innerWidth / 1920, innerHeight / 1080); el.style.transform = `scale(${k})`; }
  function boot() {
    const root = document.getElementById('hud'); if(MATCH&&root&&!receivedMatch){root.style.visibility='hidden';const waiting=document.createElement('p');waiting.id='waiting-match-data';waiting.textContent='Waiting for match data';Object.assign(waiting.style,{color:'#afbdd0',font:'24px Arial',padding:'48px'});document.body.appendChild(waiting);} if (!root) { window.HUD_READY = true; return; } fit(root); addEventListener('resize', () => fit(root));
    if (Q.has('bg')) { const u = Q.get('bg'); document.body.style.background = `#1a1a1d url(${u && u !== '1' ? u : (mapA(HUD.state.map.name) || {}).splash}) center/cover`; }
    if(Q.get('canvas')==='1')document.body.classList.add('hud-editor-canvas');
    const list = (document.body.dataset.modules || '').split(',').map(x => x.trim()).filter(Boolean);
    const missing = list.filter(k => typeof M[k] !== 'function');
    if (missing.length) throw new Error('Unknown HUD module: ' + missing.join(', '));
    if (PREVIEW) {
      HUD.state = EMPTY_PREVIEW ? liveBase() : previewState(list);
      try { const teams=JSON.parse(Q.get('previewTeams')||'[]'); if(Array.isArray(teams)&&teams.length===2)teams.forEach((team,index)=>{ if(typeof team.name==='string'&&team.name.length<=80)HUD.state.teams[index].name=team.name.replace(/[<>]/g,''); if(typeof team.tag==='string'&&team.tag.length<=12)HUD.state.teams[index].tag=team.tag.replace(/[<>]/g,''); if(Array.isArray(team.players))team.players.slice(0,5).forEach((name,slot)=>{if(typeof name==='string'&&name.length<=80)HUD.state.players[index][slot].name=name.replace(/[<>]/g,'');}); if(typeof team.logo==='string'&&!/[<>\"'\s]/.test(team.logo)&&/^(https:\/\/|http:\/\/localhost:5300\/air-assets\/)/.test(team.logo))HUD.state.teams[index].logo=team.logo; }); } catch (_) { /* Keep safe preview defaults for invalid input. */ }
      if (EMPTY_PREVIEW) { HUD.state.series=[];HUD.state.map.name='';HUD.state.map.number=0; }
      sourceState = clone(HUD.state);
      HUD.state=previewSettings(sourceState);
      if(SAMPLE_MOTION){HUD.state.holding.target=previewNow+(HUD.state.holding.minutes||5)*60000;sourceState.holding.target=HUD.state.holding.target;}
      if(!SAMPLE_MOTION)document.body.classList.add('hud-preview');
      if(!EMPTY_PREVIEW) E('div', 'preview-label', document.body, 'PREVIEW · SAMPLE DATA');
    }
    // Static screens still preview their real design with no game data.
    const hideEmpty = EMPTY_PREVIEW && !list.every(name => ['holding','intro','casters','eventbug','sponsor','lowerthird','ticker'].includes(name));
    if (EMPTY_PREVIEW) {
      document.body.classList.add('hud-without-game-data');
    }
    if (hideEmpty) {
      root.style.visibility = 'hidden';
      const empty = E('div', 'empty-preview-message', document.body);
      empty.style.cssText = 'position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;color:#a1a1aa;font:24px system-ui;text-align:center';
      E('strong', '', empty, 'Game data hidden');
      E('span', '', empty, 'Choose Sample data or Received match data to preview this screen.');
    }
    const mods = hideEmpty ? [] : list.map(k => M[k](root)); HUD.mods = mods;
    const feedTag = E('div', 'feed-paused-tag mono', root, 'FEED PAUSED · LAST RECEIVED DATA');
    feedTag.style.cssText = 'position:absolute;top:16px;left:50%;transform:translateX(-50%);padding:6px 12px;background:#1b1410;color:#fbbf24;font-size:12px;z-index:99;display:none';
    const updateFeedTag = s => { feedTag.style.display = !PREVIEW && s.airDiagnostics?.feedPaused ? 'block' : 'none'; };
    const rehearsalTag = E('div', 'feed-paused-tag mono', root, 'REHEARSAL · SAMPLE DATA');
    rehearsalTag.style.cssText = feedTag.style.cssText;
    const updateRehearsalTag = s => { rehearsalTag.style.display = !PREVIEW && s.airContext?.simulation ? 'block' : 'none'; };
    HUD.on(updateRehearsalTag);
    const pausePanel = E('div', 'pause', root), pauseCrest = E('div', 'pause-crest', pausePanel), pauseSymbol = E('img', 'pause-symbol', pauseCrest), pauseTitle = E('div', 'a', pausePanel), pauseTime = E('div', 'b mono', pausePanel);
    E('div', 'pause-wing l', pausePanel); E('div', 'pause-wing r', pausePanel);
    const updateAirPause = s => {
      const panel = s.airPause, enabled = !PREVIEW && ['technical', 'timeout'].includes(panel?.kind) && Number.isFinite(panel.startedAt);
      pausePanel.classList.toggle('on', !!enabled);
      pausePanel.style.visibility = enabled ? 'visible' : 'hidden';
      pausePanel.setAttribute('aria-hidden', enabled ? 'false' : 'true');
      if (!enabled) return;
      const technical = panel.kind === 'technical'; pausePanel.style.setProperty('--c', technical ? 'var(--red)' : 'var(--amber, #fbbf24)');
      setImg(pauseSymbol, '../core/assets/banners/' + (technical ? 'technical-pause' : 'timeout') + '.svg');
      txt(pauseTitle, technical ? 'TECHNICAL PAUSE' : 'TEAM TIMEOUT');
      txt(pauseTime, 'ELAPSED ' + fmt(Math.max(0, (HUD.now() - panel.startedAt) / 1000)));
    };
    HUD.on(updateAirPause);
    HUD.subs.push(updateFeedTag); updateFeedTag(HUD.state);
    HUD.subs.push((s, opts) => mods.forEach(m => m.update(s, opts))); mods.forEach(m => m.update(HUD.state, {snapshot:true}));
    let lastT = 0; (function loop(t) { if (t - lastT > 90) { lastT = t; updateAirPause(HUD.state); mods.forEach(m => m.tick && m.tick(HUD.state)); } mods.forEach(m => m.frame && m.frame(HUD.state)); requestAnimationFrame(loop); })(0);
    if (HUD.demo || SAMPLE_MOTION) demo();
    window.HUD_READY = true;
    if(window.parent!==window)window.parent.postMessage({type:'AIR_HUD_PREVIEW_READY'},'*');
  }
  addEventListener('message', event => {
    if (event.source !== window.parent || window.parent === window) return;
    if (event.data?.type === 'AIR_HUD_PREVIEW_PROBE' && window.HUD_READY)
      window.parent.postMessage({type:'AIR_HUD_PREVIEW_READY'}, '*');
    // Read-only editor views only. OBS outputs cannot accept draft commands.
    if (event.data?.type !== 'AIR_HUD_PREVIEW_SETTINGS' || OUTPUT ||
        Q.get('canvas') !== '1' || Q.get('screen') !== '1' ||
        !Q.has('editorOrigin') || event.origin !== Q.get('editorOrigin')) return;
    try {
      previewPatch = event.data.settings == null ? {} : window.AirHudSettings.validate(event.data.settings);
      HUD.state = previewSettings(sourceState);
      HUD.subs.forEach(fn => fn(HUD.state, {snapshot:true}));
    } catch (_) { /* Invalid drafts leave the last valid preview in place. */ }
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
