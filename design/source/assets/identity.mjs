import { C, page, boardHead, boardFoot, contrast, grade, bezierSvg, logo, pill, crest, hasLogo } from '../lib.mjs';

const W = 1600;
const H = 1000;
const wrap = (id, inner, extraCss = '') =>
  page({
    title: id,
    css: `.board{position:relative;width:${W}px;height:${H}px;padding:56px 64px 80px}${extraCss}`,
    body: `<main class="board">${inner}${boardFoot(id)}</main>`,
  });

// ---------------------------------------------------------------- Colour palette
function palette() {
  const ground = [
    ['Stage black', C.stage, 'bg-background', 'The ground. Every surface starts here.'],
    ['Panel', C.panel, 'bg-card', 'One step up: cards, panels, sheets.'],
    ['Inset', '#141416', 'bg-white/[0.02]', 'Wells, grouped rows.'],
    ['Hover', '#18181B', 'bg-white/[0.04]', 'Pointer over interactive rows.'],
    ['Pressed', '#1C1C1F', 'bg-white/[0.06]', 'Pressed, neutral selected.'],
  ];
  const text = [
    ['Ink', C.ink, 'text-white', 'What must be read. The primary action.'],
    ['Label', C.label, 'text-zinc-200', 'Field labels.'],
    ['Secondary', C.secondary, 'text-zinc-400', 'Supporting copy.'],
    ['Hint', C.hint, 'text-zinc-500', 'Captions, hints. Floor for readable text.'],
    ['Disabled', C.disabled, 'text-zinc-600', 'Disabled, separators.'],
  ];
  const sem = [
    ['Success', C.success, 'emerald-400', 'Checked in, paid, approved.'],
    ['Warning', C.warning, 'amber-400', 'Closing soon, needs review.'],
    ['Critical', C.critical, 'red-500', 'Failed, rejected, destructive.'],
  ];
  const sw = ([n, hex, cls, use], dark = true) => `<div style="display:flex;gap:16px;align-items:center;padding:14px 0;border-top:1px solid rgba(255,255,255,.06)">
<div style="width:56px;height:56px;background:${hex};box-shadow:inset 0 0 0 1px rgba(255,255,255,${dark ? '.10' : '0'})"></div>
<div style="flex:1"><div style="display:flex;justify-content:space-between"><b style="font-weight:600">${n}</b><span class="mono" style="font-size:12px;color:${C.secondary}">${hex}</span></div>
<div class="mono" style="font-size:11px;color:${C.hint};margin-top:2px">${cls}</div><div style="font-size:12px;color:${C.secondary};margin-top:2px">${use}</div></div></div>`;
  return wrap(
    'identity/colour/palette',
    `${boardHead('IDENTITY · COLOUR', 'The palette is a language.', 'Two luminance steps separate anything. White speaks. Rose is the one light that comes on when something needs you, never a fill, never a border on a button.')}
<section style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:48px;margin-top:32px">
<div><div class="eyebrow" style="margin-bottom:8px">GROUND · DARK TO LIGHT</div>${ground.map((g) => sw(g)).join('')}</div>
<div><div class="eyebrow" style="margin-bottom:8px">TEXT LADDER</div>${text.map((g) => sw(g)).join('')}</div>
<div><div class="eyebrow" style="margin-bottom:8px">THE CUE</div>
<div style="position:relative;height:196px;background:${C.panel};box-shadow:inset 0 0 0 1px rgba(255,255,255,.07);padding:22px">
<div class="eyebrow" style="color:${C.secondary}">CHECK-IN · CLOSES 7:59 PM</div>
<div class="num" style="font-size:72px;margin-top:10px">12:40</div>
<div style="width:64px;height:2px;background:${C.cue};margin-top:10px"></div>
<div class="mono" style="position:absolute;right:20px;bottom:18px;font-size:12px;color:${C.secondary}">#F43F5E · rose-500</div></div>
<p style="font-size:12px;color:${C.secondary};margin-top:10px">One per view: the live dot, the timer's underline, the selected choice, the hover slide under a white button.</p>
<div class="eyebrow" style="margin:22px 0 8px">SEMANTIC · STATE ONLY</div>${sem.map((g) => sw(g)).join('')}</div>
</section>`
  );
}

// ---------------------------------------------------------------- Contrast
function contrastBoard() {
  const pairs = [
    ['Ink on stage', C.ink, C.stage],
    ['Label on panel', C.label, C.panel],
    ['Secondary on stage', C.secondary, C.stage],
    ['Hint on stage', C.hint, C.stage],
    ['Disabled on stage', C.disabled, C.stage],
    ['Rose on stage', C.cue, C.stage],
    ['Rose-300 text on stage', '#FDA4AF', C.stage],
    ['Stage on ink (primary button)', C.stage, C.ink],
    ['Ink on rose (hover fill)', C.ink, C.cue],
    ['Emerald on stage', C.success, C.stage],
    ['Amber on stage', C.warning, C.stage],
    ['Red-300 on stage', '#FCA5A5', C.stage],
    ['Ink on paper', C.paperInk, C.paper],
    ['Secondary ink on paper', C.paperSecondary, C.paper],
    ['Rose-600 on paper', C.paperCue, C.paper],
    ['Rose-500 on paper (avoid)', C.cue, C.paper],
  ];
  const cell = ([n, fg, bg]) => {
    const r = contrast(fg, bg);
    const g = grade(r);
    const tone = g === 'Fail' ? C.critical : g === 'UI only' ? C.warning : g === 'AAA' ? C.success : C.ink;
    return `<div style="background:${bg};padding:18px 20px;height:152px;display:flex;flex-direction:column;justify-content:space-between">
<div style="color:${fg};font-family:Poppins;font-weight:800;font-size:30px;letter-spacing:-0.02em">Aa 7:59</div>
<div style="display:flex;justify-content:space-between;align-items:flex-end"><div style="color:${fg};font-size:12px;opacity:.9">${n}</div>
<div style="text-align:right;background:${C.stage};padding:4px 8px"><div class="num" style="font-size:18px;color:${tone}">${r.toFixed(2)}</div><div class="mono" style="font-size:9px;letter-spacing:.2em;color:${tone}">${g.toUpperCase()}</div></div></div></div>`;
  };
  return wrap(
    'identity/colour/contrast-pairs',
    `${boardHead('IDENTITY · ACCESSIBILITY', 'Contrast, measured.', 'WCAG 2.2 ratios computed from the tokens. Body text needs 4.5:1, large text and UI 3:1. Hint (#71717A) is the floor for readable copy on dark; rose on paper must be rose-600.')}
<section class="grid-px" style="grid-template-columns:repeat(4,1fr);margin-top:32px">${pairs.map(cell).join('')}</section>`
  );
}

// ---------------------------------------------------------------- Daylight palette
function daylight() {
  const rows = [
    ['Paper', C.paper, 'Screens; uncoated white in print'],
    ['Ink', C.paperInk, 'Everything that must be read'],
    ['Secondary ink', C.paperSecondary, 'Supporting copy'],
    ['Hint ink', C.paperHint, 'Captions, footers'],
    ['Hairline', C.paperHair, 'Table rules'],
    ['Cue · rose-600', C.paperCue, 'One per page: the total or the status'],
    ['Success · emerald-700', C.paperSuccess, 'Paid, approved'],
    ['Warning · amber-700', C.paperWarning, 'Pending'],
    ['Critical · red-700', C.paperCritical, 'Failed, overdue'],
  ];
  return page({
    title: 'identity/colour/daylight',
    bg: C.paper,
    css: `.board{position:relative;width:${W}px;height:${H}px;padding:56px 64px;color:${C.paperInk}} .eyebrow{color:${C.paperHint}}`,
    body: `<main class="board">
<header style="display:flex;justify-content:space-between;align-items:flex-end;padding-bottom:28px;border-bottom:1px solid ${C.paperHair}">
<div><div class="eyebrow" style="margin-bottom:14px"><span style="display:inline-block;width:18px;height:2px;background:${C.paperCue};vertical-align:middle;margin-right:12px"></span>IDENTITY · DAYLIGHT</div>
<h1 class="h" style="font-weight:900;font-size:52px">Same brand, in daylight.</h1></div>
<div style="max-width:440px;color:${C.paperSecondary};font-size:14px;text-align:right">For print, PDFs, receipts, payout statements, emails and sunlit venue signage. Signals step one shade darker so they pass on paper.</div></header>
<section style="display:grid;grid-template-columns:repeat(9,1fr);gap:0;margin-top:40px;border:1px solid ${C.paperHair}">
${rows.map(([n, hex, use]) => `<div style="border-right:1px solid ${C.paperHair}"><div style="height:300px;background:${hex};${hex === C.paper ? `box-shadow:inset 0 -1px 0 ${C.paperHair}` : ''}"></div><div style="padding:14px"><b style="font-size:13px">${n}</b><div class="mono" style="font-size:11px;color:${C.paperSecondary};margin-top:4px">${hex}</div><div style="font-size:12px;color:${C.paperSecondary};margin-top:6px">${use}</div></div></div>`).join('')}
</section>
<section style="display:grid;grid-template-columns:1.2fr 1fr;gap:48px;margin-top:40px">
<div style="border:1px solid ${C.paperHair};padding:22px 26px"><div class="eyebrow">PAYOUT · KARACHI VALORANT OPEN</div>
<div class="num" style="font-size:56px;margin-top:10px">PKR 50,000</div><div style="width:48px;height:2px;background:${C.paperCue};margin:10px 0 14px"></div>
<div style="font-size:14px;color:${C.paperSecondary}">Paid to Night Owls on 18 Nov 2026, 14:20 PKT · Ref ESP-PAY-8841</div></div>
<div style="font-size:14px;color:${C.paperSecondary};line-height:1.7"><b style="color:${C.paperInk}">Rules on paper</b><br>Never reuse the dark-ground tones on white; they fail contrast.<br>One cue per page. No rose headings.<br>Every money line: amount, currency, date, time zone, reference.</div>
</section>
<footer style="position:absolute;left:64px;right:64px;bottom:28px;display:flex;justify-content:space-between" class="eyebrow"><span>ESPORTRA DESIGN DATASET</span><span>identity/colour/daylight</span></footer></main>`,
  });
}

// ---------------------------------------------------------------- Type specimen
function typeSpecimen() {
  return wrap(
    'identity/type/specimen',
    `${boardHead('IDENTITY · TYPE', 'Three voices, one system.', 'Poppins speaks in headlines and numbers. Inter does the reading. Mono is the scorebug: captions, states, button labels. Caps only in mono.')}
<section style="display:grid;grid-template-columns:1.35fr 1fr;gap:56px;margin-top:36px">
<div>
<div class="eyebrow">POPPINS 900 · DISPLAY · TRACKING -2% · LEADING 1.0</div>
<div class="h" style="font-weight:900;font-size:124px;margin-top:14px;line-height:.92;letter-spacing:-0.035em">Run your cup like a final.</div>
<div style="display:flex;gap:40px;margin-top:34px;align-items:flex-end">
<div><div class="eyebrow">POPPINS 900 · NUMBERS · TABULAR</div><div class="num" style="font-size:88px;margin-top:8px">3<span style="color:${C.hint}">–</span>1</div></div>
<div><div class="eyebrow">WITH UNIT</div><div class="num" style="font-size:88px;margin-top:8px">50,000<span style="font-size:26px;color:${C.hint};margin-left:8px;letter-spacing:0">PKR</span></div></div></div>
</div>
<div style="display:flex;flex-direction:column;gap:28px">
<div><div class="eyebrow">POPPINS 700 · TITLE · 20 PX</div><div class="h" style="font-weight:700;font-size:28px;margin-top:10px">Check-in closes at 7:59 PM</div></div>
<div><div class="eyebrow">INTER 400 · BODY · 15 PX / 1.5</div><p style="margin-top:10px;color:${C.label};font-size:17px;line-height:1.55">Brackets, check-in, disputes and payouts in one place. When a match is ready, the room opens and both captains get the same clock.</p></div>
<div><div class="eyebrow">INTER 500 · LABEL · 13 PX</div><div style="margin-top:10px;font-weight:500;font-size:15px;color:${C.label}">Team name</div><div style="margin-top:4px;font-size:13px;color:${C.hint}">Players see this on the bracket. 3–24 characters.</div></div>
<div><div class="eyebrow">MONO 700 · CAPTION · 10–11 PX · 0.28EM</div><div class="mono" style="margin-top:10px;font-weight:700;font-size:13px;letter-spacing:.28em;color:${C.secondary}">ROUND OF 16 · BEST OF 3 · STATION 4</div></div>
<div><div class="eyebrow">MONO 700 · BUTTON LABEL</div><div style="margin-top:12px;display:flex;gap:12px"><span class="btn btn-primary">Check in your team</span><span class="btn btn-ghost">Back</span></div></div>
</div></section>`
  );
}

// ---------------------------------------------------------------- Type scale by direction
function typeScale() {
  const rows = [
    ['Broadcast', 'Poppins 900 · 30–48 px (96 campaign)', 'Poppins 700 · 18–20', 'Inter 400 · 14–15 / 1.5', 'Mono 700 · 10–11 caps'],
    ['Command Console', 'none on work surfaces', 'Poppins 700 · 20–24', 'Inter 400 · 13–14 / 1.4', 'Inter 500 · 12 sentence case'],
    ['Editorial', 'Poppins 800–900 · 40–64', 'Poppins 700 · 22–24', 'Inter 400 · 17–19 / 1.65', 'Mono 11 caps dateline'],
    ['Cinematic', 'Poppins 900 · 96–200, -3%, 0.9', 'Inter 500 · 18–22', 'one sentence', 'Mono 11–12 wide, zinc-400'],
    ['Community', 'Poppins 800 · 32–44, 0 to -1%', 'Inter 600 · 16–18 names', 'Inter 400 · 16–17 / 1.6', 'fewer; zinc-400'],
    ['Daylight', 'Poppins 800 numbers', 'Poppins 700', 'Inter 400 · 11–12 pt print', 'Mono 8–9 pt'],
    ['Trophy', 'Poppins 900 · 120–200 name', 'versus lockup', 'one proud sentence', 'CHAMPIONS · EVENT · YEAR'],
  ];
  return wrap(
    'identity/type/scale-by-direction',
    `${boardHead('IDENTITY · TYPE SCALE', 'The scale moves with the room.', 'Families never change. Size, weight, leading and how much mono appears move with the direction the surface chose.')}
<section style="margin-top:28px">
<div class="grid-px" style="grid-template-columns:200px repeat(4,1fr)">
${['DIRECTION', 'DISPLAY', 'TITLE / SUPPORT', 'BODY', 'CAPTION'].map((h) => `<div class="eyebrow" style="padding:14px 16px">${h}</div>`).join('')}
${rows.map((r) => r.map((c, i) => `<div style="padding:18px 16px;${i === 0 ? 'font-family:Poppins;font-weight:700;font-size:16px' : `font-size:13px;color:${C.label}`}">${c}</div>`).join('')).join('')}
</div>
<div style="display:flex;align-items:flex-end;gap:36px;margin-top:40px">
${[['Display', 88, 900], ['Title', 32, 700], ['Body', 17, 400], ['Label', 13, 500]].map(([n, s, w]) => `<div><div class="eyebrow" style="margin-bottom:8px">${n} · ${s}PX</div><div style="font-family:${w === 400 || w === 500 ? 'Inter' : 'Poppins'};font-weight:${w};font-size:${s}px;letter-spacing:${w > 600 ? '-0.02em' : '0'};line-height:1">Night Owls</div></div>`).join('')}
<div><div class="eyebrow" style="margin-bottom:8px">CAPTION · 11PX</div><div class="mono" style="font-weight:700;font-size:11px;letter-spacing:.28em">GRAND FINAL</div></div>
</div></section>`
  );
}

// ---------------------------------------------------------------- Signature moves
function signatureMoves() {
  const tile = (n, name, inner, rule) => `<div style="padding:22px;display:flex;flex-direction:column;height:360px">
<div style="display:flex;justify-content:space-between"><span class="eyebrow">0${n}</span><span class="eyebrow" style="color:${C.secondary}">${name}</span></div>
<div style="flex:1;display:flex;align-items:center;justify-content:center">${inner}</div>
<div style="font-size:12px;color:${C.secondary};border-top:1px solid rgba(255,255,255,.07);padding-top:12px">${rule}</div></div>`;
  const moves = [
    tile(1, 'THE CUE LIGHT', `<div><div class="h" style="font-weight:800;font-size:30px">Check in</div><div style="width:48px;height:2px;background:${C.cue};margin-top:10px"></div></div>`, 'A 2 px rose mark on the one thing that needs you.'),
    tile(2, 'CAPTION OVER NUMBER', `<div><div class="eyebrow">PRIZE POOL</div><div class="num" style="font-size:64px;margin-top:6px">250K<span style="font-size:18px;color:${C.hint};margin-left:6px">PKR</span></div></div>`, 'Mono caption orients; the number is the hero.'),
    tile(3, 'TIGHT DISPLAY · WIDE CAPTION', `<div><div class="h" style="font-weight:900;font-size:52px;letter-spacing:-0.04em">final.</div><div class="mono" style="font-size:10px;font-weight:700;letter-spacing:.5em;color:${C.secondary};margin-top:8px">FOR ORGANIZERS</div></div>`, 'Maximum contrast between compression and air.'),
    tile(4, 'THE VERSUS LOCKUP', `<div style="display:flex;align-items:center;gap:16px">${crest('NO', 265, 44)}<span class="num" style="font-size:44px">3</span><span style="color:${C.hint}">–</span><span class="num" style="font-size:44px;color:${C.hint}">1</span>${crest('C5', 0, 44, 2)}</div>`, 'Winner white, other side grey. Never red for the loser.'),
    tile(5, 'THE LOWER-THIRD', `<div style="display:flex;align-items:stretch;gap:12px"><div style="width:3px;background:${C.cue}"></div><div><div class="eyebrow" style="color:${C.secondary}">IGL · NIGHT OWLS</div><div class="h" style="font-weight:800;font-size:30px;margin-top:6px">Hamza “Viper”</div></div></div>`, 'Rose tick, role caption, name. For people.'),
    tile(6, 'THE SCOREBOARD GRID', `<div class="grid-px" style="grid-template-columns:repeat(3,96px)">${[['TEAMS', '64'], ['IN', '41'], ['LEFT', '12:40']].map(([a, b]) => `<div style="padding:12px"><div class="eyebrow" style="font-size:9px">${a}</div><div class="num" style="font-size:26px;margin-top:4px">${b}</div></div>`).join('')}</div>`, 'gap-px tiles on a hairline field.'),
    tile(7, 'THE CUT EDGE', `<svg width="240" height="130" viewBox="0 0 240 130"><path d="M0.5 0.5 H214 L239.5 26 V129.5 H0.5 Z" fill="${C.panel}" stroke="rgba(255,255,255,.12)"/><line x1="214" y1="0.5" x2="239.5" y2="26" stroke="${C.cue}" stroke-width="2"/><text x="16" y="112" font-family="JetBrains Mono" font-weight="700" font-size="10" letter-spacing="2.8" fill="${C.hint}">CHAMPIONS</text></svg>`, 'One 45° notch. Once per composition.'),
    tile(8, 'WHITE SPEAKS, ROSE CONFIRMS', `<div style="display:flex;gap:14px"><span class="btn btn-primary">Host a cup</span><span class="btn" style="background:${C.cue};border-color:${C.cue};color:#fff">Host a cup</span></div>`, 'White primary at rest; rose slides in on intent (hover, press).'),
  ];
  return page({
    title: 'identity/signature-moves',
    css: `.board{position:relative;width:${W}px;height:1060px;padding:56px 64px 80px}`,
    body: `<main class="board">${boardHead('IDENTITY · SIGNATURE MOVES', 'Eight moves. Use two, never all eight.', 'These make a surface unmistakably Esportra without a logo. In code they live in src/components/ui/kit and CommandSurface.')}
<section class="grid-px" style="grid-template-columns:repeat(4,1fr);margin-top:28px">${moves.join('')}</section>${boardFoot('identity/signature-moves')}</main>`,
  });
}

// ---------------------------------------------------------------- Motion verbs
function motion() {
  const verbs = [
    ['ARRIVE', '180 ms', [0.2, 0, 0, 1], 'Opacity 0→1, y 6→0. Content entering the view.'],
    ['MOVE', '220 ms', [0.2, 0, 0, 1], 'Shared layout (layoutId). Something changes place.'],
    ['CONFIRM', '200 ms', [0.2, 0, 0, 1], 'Rose fill slides under the white primary.'],
    ['REPLACE', '150 / 250 ms', [0.4, 0, 1, 1], 'Exit fast, enter calm. Swapping content.'],
    ['REVEAL', '500 ms', [0.7, 0, 0.2, 1], 'Mask wipe. Cinematic and Trophy only, once.'],
    ['WARM', '240 ms', [0.25, 0.1, 0.25, 1], 'Community arrivals. Softer, a little slower.'],
  ];
  return wrap(
    'identity/motion/verbs',
    `${boardHead('IDENTITY · MOTION', 'Motion clarifies. It never decorates.', 'Five verbs cover product surfaces; reveal and warm belong to their directions. Nothing loops at rest. Reduced motion: opacity only, or static.')}
<section class="grid-px" style="grid-template-columns:repeat(3,1fr);margin-top:28px">
${verbs.map(([v, d, b, use]) => `<div style="padding:24px;display:grid;grid-template-columns:1fr 240px;gap:18px;align-items:center;height:300px">
<div><div class="h" style="font-weight:900;font-size:34px">${v.toLowerCase()}</div><div class="num" style="font-size:22px;margin-top:10px;color:${C.label}">${d}</div>
<div class="mono" style="font-size:11px;color:${C.secondary};margin-top:8px">cubic-bezier(${b.join(', ')})</div><p style="font-size:13px;color:${C.secondary};margin-top:14px">${use}</p></div>
<div>${bezierSvg(b, 220, 150)}</div></div>`).join('')}
</section>`
  );
}

// ---------------------------------------------------------------- Space and shape
function spaceShape() {
  const ladder = [['8', 'label → control'], ['20', 'between fields'], ['24', 'panel padding'], ['32', 'sections (24 in dialogs)'], ['48', 'regions'], ['16', 'phone gutter']];
  return wrap(
    'identity/space-and-shape',
    `${boardHead('IDENTITY · SPACE & SHAPE', 'Square, exact, with air where it matters.', '4 px base. Square corners everywhere except avatars and status dots. Hairlines at white 7%. Depth from tone, not shadow.')}
<section style="display:grid;grid-template-columns:1fr 1fr;gap:56px;margin-top:32px">
<div><div class="eyebrow" style="margin-bottom:18px">THE SPACE LADDER</div>
${ladder.map(([px, use]) => `<div style="display:flex;align-items:center;gap:20px;height:58px;border-top:1px solid rgba(255,255,255,.06)"><div class="num" style="width:60px;font-size:24px">${px}</div><div style="height:14px;width:${Number(px) * 6}px;background:rgba(255,255,255,.12);border-left:2px solid ${C.cue}"></div><div style="color:${C.secondary};font-size:13px">${use}</div></div>`).join('')}
</div>
<div><div class="eyebrow" style="margin-bottom:18px">SHAPE & DEPTH</div>
<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:20px">
<div><div style="height:110px;background:${C.panel};box-shadow:inset 0 0 0 1px rgba(255,255,255,.08)"></div><div class="eyebrow" style="margin-top:10px">REST · 8%</div></div>
<div><div style="height:110px;background:${C.panel};box-shadow:inset 0 0 0 1px rgba(255,255,255,.16)"></div><div class="eyebrow" style="margin-top:10px">HOVER · 16%</div></div>
<div><div style="height:110px;background:rgba(244,63,94,.06);box-shadow:inset 0 0 0 1px rgba(244,63,94,.7)"></div><div class="eyebrow" style="margin-top:10px">SELECTED · ROSE 70%</div></div>
<div style="display:flex;align-items:center;gap:14px"><div style="width:56px;height:56px;border-radius:999px;background:#27272A;display:grid;place-items:center;font-weight:700">AY</div><div class="eyebrow">AVATAR · ROUND</div></div>
<div style="display:flex;align-items:center;gap:10px"><span class="dot" style="width:10px;height:10px;background:${C.cue}"></span><div class="eyebrow">STATUS DOT</div></div>
<div style="display:flex;align-items:center"><span class="btn btn-secondary" style="height:40px">Square</span></div>
</div>
<div style="margin-top:28px;position:relative;height:150px;background:${C.stage};box-shadow:inset 0 0 0 1px rgba(255,255,255,.07)">
<div style="position:absolute;left:24px;top:24px;right:120px;bottom:24px;background:${C.panel};box-shadow:inset 0 0 0 1px rgba(255,255,255,.07)"></div>
<div style="position:absolute;left:48px;top:48px;width:180px;bottom:48px;background:rgba(255,255,255,.04)"></div>
<div class="eyebrow" style="position:absolute;right:16px;top:20px;text-align:right;line-height:2">STAGE<br>PANEL<br>INSET</div></div>
</div></section>`
  );
}

// ---------------------------------------------------------------- Logo usage
function logoUsage() {
  const real = hasLogo();
  const cell = (bg, inner, cap, ok = true) => `<div style="background:${bg};height:190px;position:relative;display:grid;place-items:center">${inner}
<div class="eyebrow" style="position:absolute;left:14px;bottom:12px;color:${bg === C.cue ? '#fff' : ok ? C.secondary : C.critical}">${ok ? '✓' : '✕'} ${cap}</div></div>`;
  return wrap(
    'identity/logo/usage',
    `${boardHead('IDENTITY · LOGO', 'The mark, handled with care.', real ? 'Usage rules for the Esportra mark.' : 'The real mark lives in Supabase storage (system.assets.website/eSportra-Logo/). Drop the exports into design/identity/logo/ and re-run the build; every template picks them up.')}
<section style="display:grid;grid-template-columns:1.1fr 1fr;gap:48px;margin-top:30px">
<div>
<div class="eyebrow" style="margin-bottom:14px">CLEAR SPACE · MINIMUM SIZE</div>
<div style="position:relative;height:300px;background:${C.stage};box-shadow:inset 0 0 0 1px rgba(255,255,255,.07);display:grid;place-items:center">
<div style="position:relative;padding:40px;outline:1px dashed rgba(244,63,94,.5)">${logo({ height: 64 })}
<span class="mono" style="position:absolute;top:10px;left:50%;transform:translateX(-50%);font-size:10px;color:${C.cueSoft}">x</span></div>
<div class="mono" style="position:absolute;left:16px;bottom:14px;font-size:11px;color:${C.secondary}">Clear space = x (the cap height of the wordmark) on every side</div></div>
<div style="display:flex;gap:40px;margin-top:22px;align-items:flex-end">
<div>${logo({ height: 24 })}<div class="eyebrow" style="margin-top:8px">DIGITAL MIN · 24 PX HIGH</div></div>
<div>${logo({ height: 16 })}<div class="eyebrow" style="margin-top:8px;color:${C.critical}">✕ BELOW 20 PX</div></div></div>
</div>
<div class="grid-px" style="grid-template-columns:1fr 1fr">
${cell(C.stage, logo({ height: 40 }), 'ON STAGE BLACK')}
${cell(C.panel, logo({ height: 40 }), 'ON PANEL')}
${cell(C.paper, logo({ height: 40, dark: true }), 'DARK VERSION ON PAPER')}
${cell(`${C.stage}`, `<div style="filter:hue-rotate(300deg) saturate(8)">${logo({ height: 40 })}</div><div style="position:absolute;inset:0;background:linear-gradient(90deg,rgba(139,92,246,.35),rgba(59,130,246,.35))"></div>`, 'NO GRADIENTS OR TINTS', false)}
${cell(C.stage, `<div style="transform:rotate(-12deg)">${logo({ height: 40 })}</div>`, 'NO ROTATION', false)}
${cell(C.cue, logo({ height: 40 }), 'NOT ON ROSE FILLS', false)}
</div></section>
<p style="margin-top:22px;font-size:13px;color:${C.secondary}">Co-brand: partner marks in monochrome, in a 64 px dark well, never larger than the lead brand. Themed events lock up with a mono “HOSTED ON ESPORTRA” line, not the mark.</p>`
  );
}

export default [
  { id: 'identity/colour/palette', out: 'identity/colour/palette.png', w: W, h: H, html: palette, description: 'Ground ladder, text ladder, the rose cue and semantic tones with hex, Tailwind class and use.', tags: ['colour', 'tokens'] },
  { id: 'identity/colour/contrast-pairs', out: 'identity/colour/contrast-pairs.png', w: W, h: H, html: contrastBoard, description: 'WCAG contrast ratios computed from the tokens, dark and paper grounds.', tags: ['colour', 'accessibility'] },
  { id: 'identity/colour/daylight', out: 'identity/colour/daylight.png', w: W, h: H, html: daylight, description: 'Daylight (paper) palette with darker signal variants and a payout example.', tags: ['colour', 'daylight', 'print'] },
  { id: 'identity/type/specimen', out: 'identity/type/specimen.png', w: W, h: H, html: typeSpecimen, description: 'Poppins display and numbers, Inter body and labels, mono captions and button labels.', tags: ['type'] },
  { id: 'identity/type/scale-by-direction', out: 'identity/type/scale-by-direction.png', w: W, h: H, html: typeScale, description: 'How the type scale changes per design direction.', tags: ['type', 'directions'] },
  { id: 'identity/signature-moves', out: 'identity/signature-moves.png', w: W, h: 1060, html: signatureMoves, description: 'The eight signature moves, each drawn with its rule.', tags: ['identity', 'moves'] },
  { id: 'identity/motion/verbs', out: 'identity/motion/verbs.png', w: W, h: H, html: motion, description: 'Motion verbs with durations and plotted easing curves.', tags: ['motion'] },
  { id: 'identity/space-and-shape', out: 'identity/space-and-shape.png', w: W, h: H, html: spaceShape, description: 'Space ladder, card outline states, shape rules and tonal depth.', tags: ['layout', 'shape'] },
  { id: 'identity/logo/usage', out: 'identity/logo/usage.png', w: W, h: H, html: logoUsage, description: 'Logo clear space, minimum size, allowed grounds and misuse. Uses the real mark once exported into design/identity/logo/.', tags: ['logo'] },
];
