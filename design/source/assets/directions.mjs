import { C, page, crest, pill, logo, shardsSvg } from '../lib.mjs';

const W = 1600;
const H = 1000;

function rail({ n, name, line, fits, avoid, ingredients, dos, donts, paper = false }) {
  const ink = paper ? C.paperInk : C.ink;
  const sec = paper ? C.paperSecondary : C.secondary;
  const hair = paper ? C.paperHair : 'rgba(255,255,255,.07)';
  const cue = paper ? C.paperCue : C.cue;
  const row = (k, v) => `<div style="display:grid;grid-template-columns:92px 1fr;gap:12px;padding:9px 0;border-top:1px solid ${hair}"><span class="eyebrow" style="font-size:9.5px;padding-top:3px">${k}</span><span style="font-size:12.5px;color:${sec};line-height:1.45">${v}</span></div>`;
  return `<aside style="width:452px;flex:none;padding:44px 40px;border-left:1px solid ${hair};color:${ink};display:flex;flex-direction:column">
<div class="eyebrow"><span style="display:inline-block;width:18px;height:2px;background:${cue};vertical-align:middle;margin-right:10px"></span>DIRECTION ${String(n).padStart(2, '0')} / 09</div>
<h1 class="h" style="font-weight:900;font-size:46px;margin-top:14px">${name}</h1>
<p style="font-size:15px;color:${sec};margin-top:12px;line-height:1.5">${line}</p>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:22px">
<div><div class="eyebrow" style="font-size:9.5px;color:${paper ? C.paperSuccess : C.success}">FITS</div><p style="font-size:12.5px;color:${sec};margin-top:6px;line-height:1.45">${fits}</p></div>
<div><div class="eyebrow" style="font-size:9.5px;color:${paper ? C.paperCritical : '#FCA5A5'}">NOT FOR</div><p style="font-size:12.5px;color:${sec};margin-top:6px;line-height:1.45">${avoid}</p></div></div>
<div style="margin-top:20px">${ingredients.map(([k, v]) => row(k, v)).join('')}</div>
<div style="margin-top:auto;display:grid;grid-template-columns:1fr 1fr;gap:16px;padding-top:18px;border-top:1px solid ${hair}">
<div><div class="eyebrow" style="font-size:9.5px">DO</div>${dos.map((d) => `<p style="font-size:12px;color:${sec};margin-top:6px">✓ ${d}</p>`).join('')}</div>
<div><div class="eyebrow" style="font-size:9.5px">DON'T</div>${donts.map((d) => `<p style="font-size:12px;color:${sec};margin-top:6px">✕ ${d}</p>`).join('')}</div></div>
<div class="eyebrow" style="font-size:9px;margin-top:18px">SPEC · .claude/skills/design-recipe/reference/directions/</div>
</aside>`;
}

const board = (id, canvas, railHtml, { bg = C.stage, css = '' } = {}) =>
  page({
    title: id,
    bg,
    css: `.board{display:flex;width:${W}px;height:${H}px}.canvas{position:relative;flex:1;overflow:hidden}${css}`,
    body: `<main class="board"><section class="canvas">${canvas}</section>${railHtml}</main>`,
  });

const phone = (inner, { bg = C.stage, w = 360, h = 760 } = {}) =>
  `<div style="width:${w}px;height:${h}px;background:${bg};border-radius:44px;box-shadow:0 0 0 10px #1a1a1d,0 0 0 11px #2a2a2e,0 40px 80px rgba(0,0,0,.6);overflow:hidden;position:relative">${inner}</div>`;

// ---------------------------------------------------------------- 1 Broadcast
function broadcast() {
  const roster = [['Hamza “Viper”', 'In', 'success'], ['Ali', 'In', 'success'], ['Sana', 'In', 'success'], ['Bilal', 'Not in', 'neutral'], ['Usman', 'Not in', 'neutral']];
  const ph = phone(`<div style="padding:54px 22px 0">
<div class="eyebrow" style="font-size:9.5px">KARACHI VALORANT OPEN · CHECK-IN</div>
<div class="num" style="font-size:88px;margin-top:22px;line-height:.9">12:40</div>
<div style="font-size:13px;color:${C.hint};margin-top:6px">minutes left · closes 7:59 PM</div>
<div style="width:56px;height:2px;background:${C.cue};margin-top:14px"></div>
<div style="margin-top:26px;display:flex;justify-content:space-between;align-items:center"><b style="font-size:15px">Night Owls</b><span class="mono" style="font-size:11px;color:${C.secondary}">3 OF 5 IN</span></div>
<div class="grid-px" style="margin-top:12px">${roster.map(([n, s, t]) => `<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px"><span style="font-size:14px">${n}</span>${pill(s, t)}</div>`).join('')}</div></div>
<div style="position:absolute;left:0;right:0;bottom:0;padding:16px 22px 30px;background:linear-gradient(transparent,${C.stage} 30%)"><div class="btn btn-primary" style="width:100%;height:52px">Check in your team</div></div>`);
  const card = `<div style="width:420px;height:525px;position:relative;overflow:hidden;box-shadow:inset 0 0 0 1px rgba(255,255,255,.08)">
<div style="position:absolute;inset:0;opacity:.9">${shardsSvg({ w: 420, h: 525, seed: 5, count: 3, fill: '#141416' })}</div>
<div style="position:relative;padding:30px;height:100%;display:flex;flex-direction:column">
<div class="eyebrow" style="color:${C.secondary}">REGISTRATION OPEN · VALORANT</div>
<div class="h" style="font-weight:900;font-size:58px;margin-top:auto;line-height:.95">Karachi<br>Valorant<br>Open</div>
<div style="width:48px;height:2px;background:${C.cue};margin:16px 0 18px"></div>
<div class="grid-px" style="grid-template-columns:repeat(3,1fr)">${[['DATE', '18 NOV'], ['TEAMS', '64'], ['PRIZE', '250K']].map(([a, b]) => `<div style="padding:10px 12px"><div class="eyebrow" style="font-size:8.5px">${a}</div><div class="num" style="font-size:22px;margin-top:3px">${b}</div></div>`).join('')}</div>
<div style="display:flex;justify-content:space-between;align-items:center;margin-top:18px">${logo({ height: 18 })}<span class="btn btn-primary" style="height:36px;font-size:10.5px">Register</span></div></div></div>`;
  return board(
    'directions/broadcast',
    `<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;gap:72px">${ph}${card}</div>
<div class="eyebrow" style="position:absolute;left:48px;bottom:32px">CAPTAIN CHECK-IN (PHONE, NERVES) · ANNOUNCEMENT 4:5</div>`,
    rail({
      n: 1,
      name: 'Broadcast',
      line: 'The arena at rest. A dark stage, one cue of light, captions like a scorebug.',
      fits: 'Product screens, match rooms, fixtures, results, announcements. Operate mode, fluent players.',
      avoid: 'Long reads, 400-row consoles, print, newcomers who need warmth first.',
      ingredients: [
        ['GROUND', 'Stage #09090B → panel #111114 → white 2/4/6% insets.'],
        ['TYPE', 'Poppins 900 display 30–48 px; Inter 14–15 body; mono caps captions.'],
        ['CUE', 'One rose mark per view: timer underline, live dot, selected choice.'],
        ['MOTION', 'Arrive 180 ms, y 6→0, cubic-bezier(0.2,0,0,1). Nothing loops.'],
        ['MOVES', 'Caption over number, scoreboard grid, versus lockup, lower-third.'],
      ],
      dos: ['One rose cue per view', 'Skeletons in the real layout'],
      donts: ['Rose borders on buttons', 'Caps headlines'],
    })
  );
}

// ---------------------------------------------------------------- 2 Command Console
function console_() {
  const rows = [
    ['Night Owls', 'To review', 'warning', '2,500', '18 Nov 14:20', true],
    ['Crimson Five', 'To review', 'warning', '2,500', '18 Nov 14:12', false],
    ['Lahore Lynx', 'To review', 'warning', '2,500', '18 Nov 13:58', false],
    ['Byte Force', 'Approved', 'success', '2,500', '18 Nov 13:41', false],
    ['Karachi Kings', 'Approved', 'success', '2,500', '18 Nov 13:30', false],
    ['Sandstorm', 'Rejected', 'critical', '2,500', '18 Nov 13:02', false],
    ['Pixel Pirates', 'Approved', 'success', '2,500', '18 Nov 12:47', false],
    ['Zero Ping', 'To review', 'warning', '2,500', '18 Nov 12:31', false],
    ['Indus Esports', 'Approved', 'success', '2,500', '18 Nov 12:10', false],
  ];
  const tr = ([n, s, t, amt, when, sel], i) => `<div style="display:grid;grid-template-columns:36px 1.4fr 1.1fr 1fr 1.1fr 48px;align-items:center;height:44px;padding:0 16px;border-top:1px solid rgba(255,255,255,.06);${sel ? `background:rgba(244,63,94,.05);box-shadow:inset 2px 0 0 ${C.cue}` : ''}">
<span style="width:14px;height:14px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.25);${sel ? `background:${C.ink}` : ''}"></span>
<span style="display:flex;align-items:center;gap:10px;font-size:13.5px">${crest(n.split(' ').map((w) => w[0]).join(''), (i * 47) % 360, 22, i)}${n}</span>
<span>${pill(s, t)}</span><span class="mono" style="font-size:12.5px">PKR ${amt}</span><span class="mono" style="font-size:12.5px;color:${C.secondary}">${when}</span><span style="color:${C.hint}">⋯</span></div>`;
  return board(
    'directions/command-console',
    `<div style="position:absolute;inset:40px 40px 64px;background:${C.stage};box-shadow:inset 0 0 0 1px rgba(255,255,255,.07);display:flex">
<nav style="width:180px;border-right:1px solid rgba(255,255,255,.07);padding:20px 14px">${logo({ height: 16 })}
${['Overview', 'Participants', 'Payments', 'Bracket', 'Match rooms', 'Disputes', 'Settings'].map((x, i) => `<div style="margin-top:${i ? 2 : 24}px;padding:8px 10px;font-size:13px;${x === 'Payments' ? `background:rgba(255,255,255,.05);box-shadow:inset 2px 0 0 ${C.cue};color:${C.ink}` : `color:${C.secondary}`}">${x}</div>`).join('')}</nav>
<div style="flex:1;padding:22px 26px">
<div style="display:flex;justify-content:space-between;align-items:center"><div><div class="eyebrow" style="font-size:9.5px">KARACHI VALORANT OPEN</div><div class="h" style="font-weight:700;font-size:22px;margin-top:6px">Payments review</div></div>
<div style="display:flex;gap:8px"><span class="btn btn-ghost" style="height:36px;font-size:10.5px">Export</span></div></div>
<div class="grid-px" style="grid-template-columns:repeat(4,1fr);margin-top:18px">${[['TO REVIEW', '7'], ['APPROVED', '41'], ['REJECTED', '2'], ['TOTAL PKR', '102,500']].map(([a, b]) => `<div style="padding:12px 16px"><div class="eyebrow" style="font-size:9px">${a}</div><div class="num" style="font-size:24px;margin-top:4px">${b}</div></div>`).join('')}</div>
<div style="display:flex;justify-content:space-between;align-items:center;margin-top:16px">
<div style="display:flex;gap:8px"><div style="width:220px;height:36px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.1);background:rgba(0,0,0,.3);display:flex;align-items:center;padding:0 12px;font-size:13px;color:${C.disabled}">Search teams</div><div style="height:36px;padding:0 12px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.1);display:flex;align-items:center;font-size:13px;color:${C.secondary}">Status: To review ▾</div></div>
<div style="display:flex;gap:8px;align-items:center"><span class="mono" style="font-size:11px;color:${C.secondary}">1 SELECTED</span><span class="btn btn-primary" style="height:36px;font-size:10.5px">Approve</span><span class="btn btn-danger" style="height:36px;font-size:10.5px">Reject</span></div></div>
<div style="margin-top:14px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.07)">
<div style="display:grid;grid-template-columns:36px 1.4fr 1.1fr 1fr 1.1fr 48px;height:36px;align-items:center;padding:0 16px;font-size:12px;font-weight:500;color:${C.secondary}"><span></span><span>Team</span><span>Status</span><span>Amount</span><span>Submitted</span><span></span></div>
${rows.map(tr).join('')}</div></div></div>
<div class="eyebrow" style="position:absolute;left:48px;bottom:26px">PAYMENTS REVIEW QUEUE · ORGANIZER · DESKTOP</div>`,
    rail({
      n: 2,
      name: 'Command Console',
      line: 'The control room. Dense, organised, calm. Staff do real work here.',
      fits: 'Organizer and staff operations: queues, tables, live check-in, match control.',
      avoid: 'Anything a player sees; fewer than ~10 items (use Broadcast).',
      ingredients: [
        ['GROUND', 'Broadcast ground; more hairlines, fewer panels.'],
        ['TYPE', 'Poppins 700 titles 20–24; Inter 13–14 table body; Inter 500 12 px headers, sentence case.'],
        ['DENSITY', 'Rows 40–44 px (never < 36). "Needs you" first. Cut by permission.'],
        ['CUE', '2 px rose inset on the focused row; active nav item.'],
        ['MOTION', 'Feedback only: confirm 150 ms, changed cell flashes once 600 ms.'],
      ],
      dos: ['Summary strip of 3–4 counts', 'Bulk actions with counts'],
      donts: ['Display type on work surfaces', 'Mono caps column headers'],
    })
  );
}

// ---------------------------------------------------------------- 3 Editorial
function editorial() {
  return board(
    'directions/editorial',
    `<article style="position:absolute;inset:0;padding:56px 0 0 120px;overflow:hidden">
<div class="eyebrow">KARACHI · 18 NOV 2026 · 6 MIN READ</div>
<h2 class="h" style="font-weight:900;font-size:58px;margin-top:18px;max-width:780px;line-height:1.02">Night Owls, from a cafe cup to the Karachi final</h2>
<p style="font-size:21px;line-height:1.45;color:#D4D4D8;max-width:680px;margin-top:22px">Two years ago they borrowed a fifth player to make the roster. On Saturday they lifted the trophy in front of four hundred people.</p>
<figure style="margin:34px 0 0 -120px;width:1148px;height:230px;position:relative;overflow:hidden;background:#101012">
<div style="position:absolute;inset:0">${shardsSvg({ w: 1148, h: 230, seed: 3, count: 6, fill: '#17171a' })}</div>
<div style="position:absolute;left:120px;top:50%;transform:translateY(-50%);display:flex;gap:18px;align-items:center">${crest('NO', 265, 110)}<div class="eyebrow" style="color:${C.secondary}">PHOTO SLOT · THE LIFT · FULL BLEED ONCE PER SECTION</div></div></figure>
<figcaption class="eyebrow" style="margin-top:10px;font-size:10px">NIGHT OWLS LIFT THE TROPHY · PHOTO: EVENT CREW</figcaption>
<div style="display:grid;grid-template-columns:680px 1fr;gap:48px;margin-top:28px">
<p style="font-size:18px;line-height:1.65;color:${C.label}">The final went the distance. Crimson Five took the first map on Ascent, and for twenty minutes it looked like the favourites would close it out. Then Hamza “Viper” called a slow default on Bind that nobody in the room saw coming.</p>
<blockquote style="border-left:2px solid ${C.cue};padding-left:20px;font-family:Poppins;font-weight:800;font-size:26px;line-height:1.2;letter-spacing:-0.01em;max-width:330px">“We stopped playing to not lose.”<div class="eyebrow" style="margin-top:12px;font-size:10px">HAMZA “VIPER” · IGL</div></blockquote></div></article>
<div class="eyebrow" style="position:absolute;left:48px;bottom:26px">SEASON RECAP · ONE COLUMN, 680 PX MEASURE</div>`,
    rail({
      n: 3,
      name: 'Editorial',
      line: 'The magazine. One strong column, real photographs, time to read.',
      fits: 'Recaps, guides, announcements with depth, rulebooks on screen.',
      avoid: 'Anything operated under time pressure; dense data.',
      ingredients: [
        ['TYPE', 'Headline Poppins 800–900 40–64; standfirst Inter 20–22; body 17–19 / 1.65, 60–70 characters.'],
        ['LAYOUT', 'One column, max 680 px. Images break it once per section.'],
        ['CUE', 'The pull quote’s 2 px rose rule is the page’s only cue.'],
        ['CAPTIONS', 'Mono 11 px caps datelines and credits.'],
        ['MOTION', 'Almost none. Images arrive by opacity, 240 ms.'],
      ],
      dos: ['Players as the subject', 'Quiet action at the end'],
      donts: ['Scroll-triggered text reveals', 'Banners at the top'],
    })
  );
}

// ---------------------------------------------------------------- 4 Cinematic
function cinematic() {
  return board(
    'directions/cinematic',
    `<div style="position:absolute;inset:0;background:${C.stage}">
<svg width="1148" height="1000" style="position:absolute;inset:0"><defs><linearGradient id="b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e1e4f0" stop-opacity=".17"/><stop offset=".9" stop-color="#e1e4f0" stop-opacity=".02"/></linearGradient><filter id="s" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="40"/></filter><radialGradient id="p"><stop offset="0" stop-color="#e1e4f0" stop-opacity=".12"/><stop offset="1" stop-color="#e1e4f0" stop-opacity="0"/></radialGradient></defs>
<polygon points="820,-20 900,-20 1140,820 560,820" fill="url(#b)" filter="url(#s)"/><ellipse cx="850" cy="830" rx="330" ry="60" fill="url(#p)"/></svg>
<div style="position:absolute;left:84px;top:84px" class="mono"><span style="font-size:12px;font-weight:700;letter-spacing:.5em;color:${C.secondary}">FOR ORGANIZERS · FREE TO START</span></div>
<div class="h" style="position:absolute;left:70px;top:250px;font-weight:900;font-size:260px;letter-spacing:-0.05em;line-height:.85">final.</div>
<p style="position:absolute;left:84px;top:540px;font-size:22px;color:${C.label};max-width:520px;line-height:1.4">Run your cup like a final. Brackets, check-in, disputes and payouts in one place.</p>
<div style="position:absolute;left:84px;top:650px;display:flex;gap:14px"><span class="btn btn-primary" style="height:52px;padding:0 28px">Host a cup</span><span class="btn btn-ghost" style="height:52px">See how it works</span></div>
<div style="position:absolute;left:84px;bottom:90px;display:flex;align-items:center;gap:18px">${logo({ height: 20 })}</div>
<div class="eyebrow" style="position:absolute;left:48px;bottom:26px">ORGANIZER LANDING HERO · ONE LIGHT, ONE LINE</div></div>`,
    rail({
      n: 4,
      name: 'Cinematic',
      line: 'The trailer. Stillness, one light, one decisive line, a long hold.',
      fits: 'Launches, landing heroes, finals hype, event trailers. Persuade mode, high latitude.',
      avoid: 'Product surfaces people operate; anything read twice a day.',
      ingredients: [
        ['LIGHT', 'Stage black with one light source and one soft falloff. No multicolour gradients, flares, particles.'],
        ['TYPE', 'Poppins 900 96–200 px, -3%, leading 0.9 (56–72 on phones). One Inter sentence.'],
        ['CUE', 'White speaks; rose confirms on the action only.'],
        ['MOTION', 'Mask wipe 500 ms cubic-bezier(0.7,0,0.2,1); push-in 1.0→1.04 over 8 s, once.'],
        ['TEST', 'Three seconds on a phone: can you say what it is?'],
      ],
      dos: ['One word can carry the page', 'Cut the music before the reveal'],
      donts: ['Neon rims and glows', 'Designing for 1440 only'],
    })
  );
}

// ---------------------------------------------------------------- 5 Community
function community() {
  const av = (i, s, hue) => `<div style="width:${s}px;height:${s}px;border-radius:999px;background:hsl(${hue} 25% 22%);box-shadow:0 0 0 3px ${C.warmGround};display:grid;place-items:center;font-family:Poppins;font-weight:800;font-size:${s * 0.36}px;color:hsl(${hue} 60% 80%)">${i}</div>`;
  const ph = phone(`<div style="padding:60px 24px 0">
<div class="h" style="font-weight:800;font-size:38px;letter-spacing:-0.01em;line-height:1.1">Welcome,<br>Ayesha.</div>
<p style="font-size:16px;color:${C.warmSecondary};margin-top:12px;line-height:1.55">Let’s get your team into its first cup.</p>
<div style="margin-top:26px;display:flex;flex-direction:column;gap:12px">
<div style="padding:18px;border-radius:4px;background:rgba(244,63,94,.06);box-shadow:inset 0 0 0 1px rgba(244,63,94,.7)"><div style="display:flex;justify-content:space-between"><b style="font-size:16px">Join a cup this weekend</b>${pill('Popular', 'neutral')}</div><p style="font-size:13.5px;color:${C.warmSecondary};margin-top:6px">12 open cups near Karachi</p></div>
<div style="padding:18px;border-radius:4px;background:${C.warmSurface};box-shadow:inset 0 0 0 1px rgba(255,255,255,.08)"><b style="font-size:16px">Create a team with friends</b><p style="font-size:13.5px;color:${C.warmSecondary};margin-top:6px">Invite up to 7 players</p></div></div>
<div style="margin-top:26px;display:flex;align-items:center;gap:10px;font-size:13px;color:${C.warmHint}"><span style="width:8px;height:8px;border-radius:9px;background:${C.ink}"></span><b style="color:${C.ink};font-weight:600">Pick a game</b> → Join a team → Check in</div></div>
<div style="position:absolute;left:24px;right:24px;bottom:30px"><div class="btn btn-primary" style="width:100%;height:52px">Continue</div></div>`, { bg: C.warmGround });
  const team = `<div style="width:420px;background:${C.warmSurface};border-radius:4px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.07);overflow:hidden">
<div style="height:6px;background:hsl(265 70% 55%)"></div>
<div style="padding:26px"><div style="display:flex;gap:18px;align-items:center">${crest('NO', 265, 84)}<div><div class="h" style="font-weight:800;font-size:28px">Night Owls</div><div style="font-size:14px;color:${C.warmSecondary};margin-top:4px">Karachi · Valorant · since 2024</div></div></div>
<div style="display:flex;margin-top:24px">${[['HV', 265], ['AL', 200], ['SA', 330], ['BI', 30], ['US', 150]].map(([i, h], k) => `<div style="margin-left:${k ? -12 : 0}px">${av(i, 56, h)}</div>`).join('')}</div>
<p style="font-size:15px;color:${C.label};margin-top:18px;line-height:1.6">Five friends from a Clifton cafe. Champions of the Karachi Valorant Open 2026.</p>
<div style="display:flex;gap:10px;margin-top:20px"><span class="btn btn-primary" style="height:40px;font-size:11px">Ask to join</span><span class="btn btn-ghost" style="height:40px;font-size:11px">Share</span></div></div></div>`;
  return board(
    'directions/community',
    `<div style="position:absolute;inset:0;background:${C.warmGround};display:flex;align-items:center;justify-content:center;gap:72px">${ph}${team}</div>
<div class="eyebrow" style="position:absolute;left:48px;bottom:26px;color:${C.warmHint}">FIRST-RUN WELCOME (PHONE) · TEAM PAGE CARD</div>`,
    rail({
      n: 5,
      name: 'Community',
      line: 'The clubhouse. Faces, names and one clear next step. Warm, never cute.',
      fits: 'First run, team and player pages, community cups, parent-facing pages.',
      avoid: 'Staff operations; match-day pressure moments.',
      ingredients: [
        ['GROUND', 'Warmed greys: surfaces #141212–#1C1917; text #A8A29E / #78716C.'],
        ['TYPE', 'Poppins 800 32–44, sentence case, 0 to -1%; Inter 16–17 / 1.6.'],
        ['SHAPE', 'Round avatars 48–96 px lead. 2–4 px radius on people cards only (documented exception).'],
        ['COLOUR', 'Team colours inside their frames (crest, a thin rule). Rose stays the single cue.'],
        ['MOTION', 'Gentle arrivals 220–260 ms, cubic-bezier(0.25,0.1,0.25,1).'],
      ],
      dos: ['Faces and names at the centre', 'One next step'],
      donts: ['Mascots, emoji, “Hey gamer!”', 'Team colours tinting the UI'],
    }),
    { bg: C.warmGround }
  );
}

// ---------------------------------------------------------------- 6 Daylight
function daylight() {
  const rows = [['1st', 'Night Owls', '50,000', 'Bank transfer', '18 Nov 14:20', 'ESP-PAY-8841'], ['2nd', 'Crimson Five', '25,000', 'Bank transfer', '18 Nov 14:22', 'ESP-PAY-8842'], ['3rd', 'Lahore Lynx', '10,000', 'JazzCash', '18 Nov 14:31', 'ESP-PAY-8843']];
  return board(
    'directions/daylight',
    `<div style="position:absolute;inset:48px 60px 70px;display:flex;justify-content:center">
<div style="width:760px;background:#fff;box-shadow:0 1px 0 ${C.paperHair},0 30px 60px rgba(0,0,0,.08);padding:48px 52px;color:${C.paperInk}">
<div style="display:flex;justify-content:space-between;align-items:flex-start">${logo({ height: 20, dark: true })}<div style="text-align:right"><div class="eyebrow" style="color:${C.paperHint};font-size:9.5px">PAYOUT STATEMENT</div><div class="mono" style="font-size:11px;color:${C.paperSecondary};margin-top:4px">ESP-ST-2026-118</div></div></div>
<div style="margin-top:34px;font-size:13px;color:${C.paperSecondary}">Karachi Valorant Open 2026 · Grand final 18 Nov 2026</div>
<div class="eyebrow" style="color:${C.paperHint};margin-top:26px;font-size:9.5px">TOTAL PAID</div>
<div class="num" style="font-size:64px;margin-top:6px">PKR 85,000</div>
<div style="display:flex;align-items:center;gap:12px;margin-top:12px"><span class="pill" style="background:#ECFDF5;color:${C.paperSuccess};box-shadow:inset 0 0 0 1px #A7F3D0"><span class="dot" style="background:${C.paperSuccess}"></span>PAID</span><span style="font-size:13px;color:${C.paperSecondary}">All payouts completed 18 Nov 2026, 14:31 PKT</span></div>
<div style="margin-top:30px;border-top:1px solid ${C.paperInk}">
<div style="display:grid;grid-template-columns:50px 1.3fr 1fr 1.1fr 1.1fr 1.2fr;padding:10px 0;font-size:11px;font-weight:600;color:${C.paperSecondary};border-bottom:1px solid ${C.paperHair}"><span>Place</span><span>Team</span><span>Amount PKR</span><span>Method</span><span>Paid (PKT)</span><span>Reference</span></div>
${rows.map((r) => `<div style="display:grid;grid-template-columns:50px 1.3fr 1fr 1.1fr 1.1fr 1.2fr;padding:12px 0;font-size:13px;border-bottom:1px solid ${C.paperHair}">${r.map((c, i) => `<span class="${i === 2 || i >= 4 ? 'mono' : ''}" style="${i === 2 ? 'font-weight:500' : ''}">${c}</span>`).join('')}</div>`).join('')}</div>
<p style="font-size:11.5px;color:${C.paperHint};margin-top:30px;line-height:1.6">Questions about a payout? Reply to the payout email or write to support with the reference. Sample statement for layout reference; figures are fictional.</p></div></div>
<div class="eyebrow" style="position:absolute;left:48px;bottom:26px;color:${C.paperHint}">PAYOUT STATEMENT · PDF / PRINT</div>`,
    rail({
      n: 6,
      name: 'Daylight',
      line: 'The printed page. Ink on paper, exact and dated. Pure referee.',
      fits: 'PDFs, receipts, statements, emails, rulebooks, sunlit venue signage.',
      avoid: 'Live match rooms; anything that should feel like the arena.',
      paper: true,
      ingredients: [
        ['GROUND', 'Paper #FAFAF9 / white; ink #09090B; hairline #E4E4E7.'],
        ['SIGNALS', 'Darker on paper: rose-600, emerald-700, amber-700, red-700.'],
        ['TYPE', 'Inter 11–12 pt print / 15–16 px screen. Numbers Poppins 800 tabular.'],
        ['MONEY', 'Every line: amount, currency, date, time zone, reference.'],
        ['MOTION', 'None. Email-safe only.'],
      ],
      dos: ['One cue: the total or status', 'Legal line and help in the footer'],
      donts: ['Dark-ground tones on white', '“Your winnings are on the way!”'],
    }),
    { bg: C.paper }
  );
}

// ---------------------------------------------------------------- 7 Trophy
function trophy() {
  const card = `<div style="width:520px;height:650px;position:relative;overflow:hidden;background:${C.stage}">
<svg width="520" height="650" style="position:absolute;inset:0"><defs><radialGradient id="w" cx=".5" cy=".36" r=".6"><stop offset="0" stop-color="hsl(265 60% 40%)" stop-opacity=".45"/><stop offset=".45" stop-color="#2a1d18" stop-opacity=".5"/><stop offset="1" stop-color="${C.stage}" stop-opacity="0"/></radialGradient></defs><rect width="520" height="650" fill="url(#w)"/>
<path d="M0.5 0.5 H470 L519.5 50 V649.5 H0.5 Z" fill="none" stroke="rgba(255,255,255,.12)"/><line x1="470" y1="0.5" x2="519.5" y2="50" stroke="${C.cue}" stroke-width="3"/></svg>
<div style="position:relative;padding:36px;height:100%;display:flex;flex-direction:column">
<div class="eyebrow" style="color:${C.secondary}">CHAMPIONS · KARACHI VALORANT OPEN · 2026</div>
<div style="margin:44px auto 0">${crest('NO', 265, 170)}</div>
<div class="h" style="font-weight:900;font-size:84px;text-align:center;margin-top:30px;letter-spacing:-0.04em">Night Owls</div>
<div style="width:120px;height:3px;background:${C.cue};margin:16px auto 0"></div>
<div style="display:flex;align-items:center;justify-content:center;gap:16px;margin-top:30px"><span style="font-weight:600">Night Owls</span><span class="num" style="font-size:40px">3</span><span style="color:${C.hint}">–</span><span class="num" style="font-size:40px;color:${C.hint}">1</span><span style="font-weight:600;color:${C.hint}">Crimson Five</span></div>
<div class="eyebrow" style="margin-top:auto;display:flex;justify-content:space-between;font-size:9.5px"><span>GRAND FINAL · 18 NOV 2026 · KARACHI</span><span>ON ESPORTRA</span></div></div></div>`;
  return board(
    'directions/trophy',
    `<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center">${card}</div>
<p style="position:absolute;left:48px;right:48px;bottom:60px;text-align:center;font-size:15px;color:${C.secondary}">“Night Owls are champions. 3–1 over Crimson Five in a final that went the distance.”</p>
<div class="eyebrow" style="position:absolute;left:48px;bottom:26px">CHAMPION CARD 4:5 · ALSO SHIP 9:16</div>`,
    rail({
      n: 7,
      name: 'Trophy',
      line: 'The podium. A beat of silence, one reveal, a long hold.',
      fits: 'Champions, winners, milestones, payouts completed.',
      avoid: 'Anything routine; celebrating the platform instead of the players.',
      ingredients: [
        ['LIGHT', 'Stage black with one warm key light; the champion’s colour may glow behind the crest.'],
        ['TYPE', 'Champion name Poppins 900 120–200 desktop / 64–80 phone. Mono caption.'],
        ['CUE', 'Rose underline under the name; the one 45° notch.'],
        ['LOCKUP', 'Resolved versus: winner white, runners-up grey and named with respect.'],
        ['MOTION', 'Silence 600–800 ms → name wipes in 500 ms → hold → slow push-in.'],
      ],
      dos: ['Name the runners-up', 'Ship 4:5 and 9:16'],
      donts: ['Confetti storms, fireworks loops', 'Red for the loser'],
    })
  );
}

// ---------------------------------------------------------------- 8 Co-brand
function cobrand() {
  const partner = `<div style="width:64px;height:64px;background:rgba(255,255,255,.04);display:grid;place-items:center"><span class="mono" style="font-size:8.5px;letter-spacing:.2em;color:${C.secondary}">PARTNER</span></div>`;
  return board(
    'directions/co-brand',
    `<div style="position:absolute;left:48px;right:48px;top:50%;transform:translateY(-52%);background:${C.stage};box-shadow:inset 0 0 0 1px rgba(255,255,255,.07);overflow:hidden">
<div style="position:absolute;left:0;right:0;top:0;height:420px;opacity:.8">${shardsSvg({ w: 1052, h: 420, seed: 9, count: 5, fill: '#141416' })}</div>
<div style="position:relative;padding:40px 44px 0;height:420px">
<div style="display:flex;justify-content:space-between;align-items:flex-start"><div class="eyebrow" style="color:${C.secondary}">KARACHI VALORANT OPEN · PRESENTED BY PARTNER</div>${partner}</div>
<div class="num" style="font-size:132px;margin-top:40px;line-height:.9">18 NOV</div>
<div style="width:56px;height:2px;background:${C.cue};margin-top:18px"></div>
<div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:22px"><p style="font-size:18px;color:${C.label};max-width:520px">64 teams. One night at the Expo Centre. Registration closes 12 Nov.</p><span class="btn btn-primary" style="height:48px">Register your team</span></div></div>
<div class="grid-px" style="grid-template-columns:repeat(4,1fr);border-top:1px solid rgba(255,255,255,.07)">${[['1ST', '150K'], ['2ND', '60K'], ['3RD', '25K'], ['MVP', '15K']].map(([a, b]) => `<div style="padding:22px 26px"><div class="eyebrow" style="font-size:9.5px">${a} · PKR</div><div class="num" style="font-size:40px;margin-top:6px">${b}</div></div>`).join('')}</div>
<div style="padding:16px 26px;display:flex;justify-content:space-between;align-items:center;border-top:1px solid rgba(255,255,255,.07)"><span style="font-size:13px;color:${C.secondary}">Prize pool supported by Partner</span>${logo({ height: 16 })}</div></div>
<div class="eyebrow" style="position:absolute;left:48px;bottom:26px">PRESENTED-BY TOURNAMENT HEADER · ESPORTRA LEADS</div>`,
    rail({
      n: 8,
      name: 'Co-brand',
      line: 'Two brands in one frame, with one clear lead and one cue.',
      fits: 'Sponsored and presented-by events, venue partners, publisher collaborations.',
      avoid: 'Frames where both brands try to lead.',
      ingredients: [
        ['FIRST', 'Decide the relationship: presented by, in partnership with, powered by.'],
        ['CUE', 'One cue light per frame, owned by the leading brand.'],
        ['PARTNER', 'Mark in monochrome, in a 64 px dark well, never larger than the lead.'],
        ['REPEAT', 'Partner appears at most twice: header and one supporting line.'],
        ['REGIONS', 'If both accents must appear, separate them by region, never in one frame.'],
      ],
      dos: ['Partner name in words once', 'Their rules for their mark'],
      donts: ['Rose and a partner red together', 'Logo walls'],
    })
  );
}

// ---------------------------------------------------------------- 9 Themed event
function themed() {
  const teal = '#0F766E';
  return board(
    'directions/themed-event',
    `<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;gap:56px">
<div style="width:480px;height:600px;background:#F5F2EC;color:#1C1917;position:relative;padding:36px;display:flex;flex-direction:column;overflow:hidden">
<svg width="480" height="600" style="position:absolute;inset:0">${Array.from({ length: 9 }, (_, i) => `<circle cx="${420 - (i % 3) * 34}" cy="${130 + Math.floor(i / 3) * 34}" r="10" fill="none" stroke="${teal}" stroke-opacity=".35" stroke-width="2"/>`).join('')}</svg>
<div class="mono" style="font-size:10.5px;font-weight:700;letter-spacing:.28em;color:#57534E">CHARITY CUP · IN PARTNERSHIP WITH CHILDREN'S HOSPITAL</div>
<div style="font-family:Poppins;font-weight:800;font-size:52px;line-height:1;letter-spacing:-0.02em;margin-top:56px">Every match funds a bed.</div>
<div style="margin-top:auto"><div class="mono" style="font-size:10.5px;font-weight:700;letter-spacing:.28em;color:#57534E">RAISED SO FAR</div>
<div class="num" style="font-size:60px;color:#1C1917;margin-top:4px;white-space:nowrap">PKR 412,000</div><div style="width:64px;height:3px;background:${teal};margin-top:10px"></div>
<div style="display:flex;justify-content:space-between;align-items:center;margin-top:26px"><span style="padding:12px 20px;background:#1C1917;color:#F5F2EC;font-family:'JetBrains Mono';font-weight:700;font-size:11px;letter-spacing:.18em">ENTER YOUR TEAM</span><span class="mono" style="font-size:9.5px;letter-spacing:.24em;color:#78716C">HOSTED ON ESPORTRA</span></div></div></div>
<div style="width:420px">
<div class="eyebrow" style="margin-bottom:12px">EVENT MINI STYLE SHEET</div>
<div class="grid-px" style="grid-template-columns:repeat(4,1fr)">${[['#F5F2EC', 'Warm paper'], ['#1C1917', 'Ink'], [teal, 'Hospital teal · cue'], ['#57534E', 'Secondary']].map(([h, n]) => `<div style="padding:0"><div style="height:90px;background:${h}"></div><div style="padding:10px"><div style="font-size:12px;font-weight:600">${n}</div><div class="mono" style="font-size:10px;color:${C.secondary}">${h}</div></div></div>`).join('')}</div>
<div style="margin-top:22px;font-size:13px;color:${C.secondary};line-height:1.7"><b style="color:${C.ink}">Moved:</b> palette temperature, the event accent (teal replaces rose as the cue), motif (bed-count dots), warm ground.<br><b style="color:${C.ink}">Kept:</b> honest words, one hero, one cue, exact money, contrast, the “hosted on Esportra” lock-up.</div>
<div style="margin-top:22px;padding:18px;background:${C.panel};box-shadow:inset 0 0 0 1px rgba(255,255,255,.07)"><div class="eyebrow" style="font-size:9.5px">IN THE PRODUCT</div><div style="height:3px;background:${teal};margin-top:12px"></div><div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px"><b>Charity Cup 2026</b>${pill('Open', 'success')}</div><p style="font-size:12.5px;color:${C.secondary};margin-top:6px">Only a thin event rule and the mark. Everything else stays core.</p></div></div></div>
<div class="eyebrow" style="position:absolute;left:48px;bottom:26px">CHARITY CUP POSTER · MINI STYLE SHEET · PRODUCT HEADER</div>`,
    rail({
      n: 9,
      name: 'Themed event',
      line: 'A small sub-brand world grown from the event’s own truth, framed by the invariants.',
      fits: 'Charity cups, Ramadan nights, women’s circuits, university leagues, city championships.',
      avoid: 'Core product surfaces; themes borrowed from trends.',
      ingredients: [
        ['TRUTH', 'Interview first: what is this event about for the people in it?'],
        ['MOVE 3–4', 'Palette temperature, one event accent, a display pairing, a motif, imagery.'],
        ['CUE', 'The event accent may replace rose as the cue on event surfaces. Never both.'],
        ['LOCK-UP', 'Mono “HOSTED ON ESPORTRA” at the footer and on the bracket.'],
        ['APPROVAL', 'Mini style sheet in creative/theme-&lt;event&gt;.md before production.'],
      ],
      dos: ['Ask the community about motifs', 'End the theme with the event'],
      donts: ['Imposing pink on a women’s circuit', 'Leaking the theme into the core'],
    })
  );
}

const d = (slug, fn, description) => ({ id: `directions/${slug}`, out: `directions/${slug}.png`, w: W, h: H, html: fn, direction: slug, description, tags: ['direction', slug] });

export default [
  d('broadcast', broadcast, 'Broadcast: captain check-in on a phone and a 4:5 announcement, with the direction spec.'),
  d('command-console', console_, 'Command Console: organizer payments review queue with summary strip, filters, bulk actions and a focused row.'),
  d('editorial', editorial, 'Editorial: season recap with dateline, standfirst, full-bleed image slot and pull quote.'),
  d('cinematic', cinematic, 'Cinematic: organizer landing hero, one light, one word.'),
  d('community', community, 'Community: first-run welcome on a phone and a team page card with avatars, warm greys.'),
  d('daylight', daylight, 'Daylight: payout statement on paper with darker signals and complete money lines.'),
  d('trophy', trophy, 'Trophy: 4:5 champion card with warm light, team glow, notch and resolved versus lockup.'),
  d('co-brand', cobrand, 'Co-brand: presented-by tournament header with a monochrome partner well and prize scoreboard.'),
  d('themed-event', themed, 'Themed event: charity cup poster, mini style sheet and how the theme appears in the product.'),
];
