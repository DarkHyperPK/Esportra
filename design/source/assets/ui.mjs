import { C, page, boardHead, boardFoot, pill, TONES, crest } from '../lib.mjs';

const W = 1600;
const wrap = (id, h, inner) => page({ title: id, css: `.board{position:relative;width:${W}px;height:${h}px;padding:56px 64px 80px}`, body: `<main class="board">${inner}${boardFoot(id)}</main>` });
const cap = (t) => `<div class="eyebrow" style="font-size:9.5px;margin-top:10px">${t}</div>`;

// ---------------------------------------------------------------- Components and states
function components() {
  const variants = ['primary', 'secondary', 'ghost', 'danger'];
  const state = (v, s) => {
    const base = `btn btn-${v}`;
    const extra =
      s === 'hover' ? (v === 'danger' ? `background:#E11D48;border-color:#E11D48;color:#fff` : `background:${C.cue};border-color:${v === 'primary' ? C.cue : 'rgba(255,255,255,.15)'};color:#fff`)
      : s === 'focus' ? 'box-shadow:0 0 0 2px #09090B,0 0 0 4px rgba(255,255,255,.4)'
      : s === 'disabled' ? 'opacity:.4'
      : '';
    return `<span class="${base}" style="height:40px;font-size:11px;${extra}">${v === 'danger' ? 'Remove team' : v === 'ghost' ? 'Back' : v === 'secondary' ? 'Preview' : 'Publish'}</span>`;
  };
  const field = (label, s) => {
    const border = s === 'focus' ? 'rgba(251,113,133,.6)' : s === 'error' ? 'rgba(239,68,68,.7)' : 'rgba(255,255,255,.1)';
    return `<div style="${s === 'disabled' ? 'opacity:.45' : ''}"><div style="font-size:13px;font-weight:500;color:${C.label}">${label}</div>
<div style="margin-top:8px;height:44px;border:1px solid ${border};background:rgba(0,0,0,.3);display:flex;align-items:center;padding:0 12px;font-size:15px;color:${s === 'rest' ? C.disabled : C.ink}">${s === 'rest' ? 'e.g. Night Owls' : s === 'error' ? 'NO' : 'Night Owls'}${s === 'focus' ? `<span style="width:1px;height:18px;background:${C.ink};margin-left:1px"></span>` : ''}</div>
<div style="margin-top:6px;font-size:12px;color:${s === 'error' ? '#FCA5A5' : C.hint}">${s === 'error' ? 'Team names need at least 3 characters.' : 'Players see this on the bracket.'}</div>${cap(s.toUpperCase())}</div>`;
  };
  const choice = (s) => {
    const sh = s === 'selected' ? 'rgba(244,63,94,.7)' : s === 'hover' ? 'rgba(255,255,255,.16)' : 'rgba(255,255,255,.08)';
    return `<div><div style="padding:16px;background:${s === 'selected' ? 'rgba(244,63,94,.06)' : s === 'hover' ? 'rgba(255,255,255,.04)' : C.panel};box-shadow:inset 0 0 0 1px ${sh}">
<div style="display:flex;justify-content:space-between"><b style="font-size:14px">Single elimination</b><span style="width:16px;height:16px;border-radius:99px;box-shadow:inset 0 0 0 ${s === 'selected' ? '5px ' + C.cue : '1px rgba(255,255,255,.3)'}"></span></div>
<p style="font-size:12.5px;color:${C.secondary};margin-top:6px">Lose once and you’re out. Fastest format.</p></div>${cap(s.toUpperCase())}</div>`;
  };
  const notice = (tone, title, body) => `<div style="display:flex;gap:12px;padding:14px 16px;background:${TONES[tone].bg};box-shadow:inset 0 0 0 1px ${TONES[tone].ring}"><span class="dot" style="background:${TONES[tone].dot};margin-top:7px;flex:none"></span><div><b style="font-size:13.5px;color:${TONES[tone].text}">${title}</b><p style="font-size:13px;color:${C.secondary};margin-top:2px">${body}</p></div></div>`;
  return wrap(
    'ui/components-and-states',
    900,
    `${boardHead('UI · COMPONENTS', 'Every state is designed.', 'Rest, hover, focus, pressed, disabled, loading, error. Focus rings are white, never rose. Rose arrives only on intent (hover slide) or selection.')}
<section style="display:grid;grid-template-columns:1.25fr 1fr;gap:56px;margin-top:30px">
<div><div class="eyebrow" style="margin-bottom:14px">COMMANDBUTTON · VARIANT × STATE</div>
<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px 14px">${['REST', 'HOVER', 'FOCUS', 'DISABLED'].map((s) => `<div class="eyebrow" style="font-size:9.5px">${s}</div>`).join('')}
${variants.map((v) => ['rest', 'hover', 'focus', 'disabled'].map((s) => `<div>${state(v, s)}</div>`).join('')).join('')}</div>
<div class="eyebrow" style="margin:36px 0 14px">FIELD</div>
<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:18px">${['rest', 'focus', 'error', 'disabled'].map((s) => field('Team name', s)).join('')}</div></div>
<div><div class="eyebrow" style="margin-bottom:14px">STATUSPILL · TONES</div>
<div style="display:flex;flex-wrap:wrap;gap:10px">${pill('Live', 'accent')}${pill('Checked in', 'success')}${pill('Closes soon', 'warning')}${pill('Rejected', 'critical')}${pill('Draft', 'neutral')}</div>
<div class="eyebrow" style="margin:32px 0 14px">CHOICECARD</div>
<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px">${['rest', 'hover', 'selected'].map(choice).join('')}</div>
<div class="eyebrow" style="margin:32px 0 14px">INLINENOTICE</div>
<div style="display:grid;gap:10px">${notice('neutral', 'Check-in opens at 7:30 PM', 'We’ll remind your captain 30 minutes before.')}${notice('warning', 'Two teams haven’t paid', 'They can’t be seeded until you approve their payment.')}${notice('critical', 'Couldn’t save the bracket', 'Check your connection and try again. Your changes are still here.')}${notice('success', 'Payouts sent', 'PKR 85,000 to 3 teams. References are in the statement.')}</div></div>
</section>`
  );
}

// ---------------------------------------------------------------- Check-in states
function checkinStates() {
  const scr = (title, inner, action, note) => `<div style="display:flex;flex-direction:column;align-items:center">
<div style="width:228px;height:470px;background:${C.stage};border-radius:30px;box-shadow:0 0 0 7px #1a1a1d,0 0 0 8px #2a2a2e;overflow:hidden;position:relative;padding:36px 16px 0">
<div class="eyebrow" style="font-size:7.5px">KVO 2026 · QUARTER-FINAL</div>${inner}
<div style="position:absolute;left:16px;right:16px;bottom:22px">${action}</div></div>
<div class="h" style="font-weight:700;font-size:17px;margin-top:22px">${title}</div><p style="font-size:12px;color:${C.secondary};margin-top:6px;text-align:center;max-width:220px;line-height:1.45">${note}</p></div>`;
  const big = (n, sub, cue = true) => `<div class="num" style="font-size:56px;margin-top:22px;line-height:.9">${n}</div><div style="font-size:11px;color:${C.hint};margin-top:6px">${sub}</div>${cue ? `<div style="width:36px;height:2px;background:${C.cue};margin-top:10px"></div>` : ''}`;
  const btn = (label, style = 'btn-primary', extra = '') => `<div class="btn ${style}" style="width:100%;height:42px;font-size:10px;${extra}">${label}</div>`;
  const list = (n) => `<div class="grid-px" style="margin-top:18px">${['Hamza', 'Ali', 'Sana', 'Bilal', 'Usman'].map((p, i) => `<div style="display:flex;justify-content:space-between;align-items:center;padding:7px 9px;font-size:11px"><span>${p}</span><span class="dot" style="background:${i < n ? C.success : C.disabled}"></span></div>`).join('')}</div>`;
  return wrap(
    'ui/check-in-states',
    1000,
    `${boardHead('UI · FLOW STATES', 'One screen, six honest states.', 'The captain check-in view from waiting to missed. Each state says what happened, what it means and what to do next. Reference for the states every flow must design.')}
<section style="display:grid;grid-template-columns:repeat(6,1fr);gap:8px;margin-top:40px">
${scr('Waiting', big('7:30', 'check-in opens · Sat 16 Nov', false) + list(0), btn('Check in your team', 'btn-primary', 'opacity:.4'), 'Button visible but disabled, with the opening time on the screen, not in a tooltip.')}
${scr('Open', big('12:40', 'minutes left · closes 7:59 PM') + list(3), btn('Check in your team'), 'One number, one state, one white action in thumb reach.')}
${scr('Checking in', big('12:38', 'minutes left · closes 7:59 PM') + list(3), btn('<span style="display:inline-block;width:12px;height:12px;border-radius:99px;border:2px solid rgba(9,9,11,.25);border-top-color:#09090B;margin-right:8px"></span>Checking in'), 'Button keeps its size and shows progress. No full-screen spinner.')}
${scr('Checked in', `<div style="margin-top:22px">${pill('Checked in', 'success')}</div><div class="h" style="font-weight:800;font-size:22px;margin-top:14px;line-height:1.15">You’re in. The room opens at 8:00 PM.</div>` + list(5), btn('Open match room', 'btn-secondary'), 'Confirms the fact and the next moment. The action changes to what comes next.')}
${scr('Offline', big('12:31', 'minutes left · closes 7:59 PM') + `<div style="margin-top:16px;padding:10px;background:${TONES.critical.bg};box-shadow:inset 0 0 0 1px ${TONES.critical.ring};font-size:10.5px;color:${C.label};line-height:1.45"><b style="color:#FCA5A5">You’re offline.</b> Check-in didn’t go through. Try again when you’re connected.</div>`, btn('Try again'), 'Rolls back the optimistic state and says plainly that it failed.')}
${scr('Missed', `<div style="margin-top:22px">${pill('Missed check-in', 'warning')}</div><div class="h" style="font-weight:800;font-size:22px;margin-top:14px;line-height:1.15">Check-in closed at 7:59 PM.</div><p style="font-size:11px;color:${C.secondary};margin-top:10px;line-height:1.5">The organizer decides whether Night Owls can still play. We’ve told them you tried.</p>`, btn('Message the organizer', 'btn-ghost'), 'Never blames. Names who decides and gives the one useful action.')}
</section>`
  );
}

// ---------------------------------------------------------------- Empty / error / loading
function emptyErrorLoading() {
  const panel = (t, inner) => `<div><div class="eyebrow" style="margin-bottom:12px">${t}</div><div style="height:520px;background:${C.panel};box-shadow:inset 0 0 0 1px rgba(255,255,255,.07);padding:22px;position:relative">${inner}</div></div>`;
  const sk = (w, h = 12, m = 0) => `<div style="width:${w};height:${h}px;background:rgba(255,255,255,.06);margin-top:${m}px"></div>`;
  return wrap(
    'ui/empty-error-loading',
    1000,
    `${boardHead('UI · SYSTEM STATES', 'Designed, not defaulted.', 'Skeletons take the real layout’s shape. Empty states explain when content will appear. Errors say what failed and keep the user’s work.')}
<section style="display:grid;grid-template-columns:repeat(3,1fr);gap:28px;margin-top:32px">
${panel('LOADING · SKELETON IN THE REAL SHAPE', `<div class="eyebrow" style="font-size:9.5px">PARTICIPANTS</div>${sk('45%', 20, 10)}
<div class="grid-px" style="grid-template-columns:repeat(3,1fr);margin-top:20px">${[0, 1, 2].map(() => `<div style="padding:12px">${sk('50%', 8)}${sk('60%', 22, 8)}</div>`).join('')}</div>
${[0, 1, 2, 3, 4, 5].map(() => `<div style="display:flex;gap:12px;align-items:center;padding:12px 0;border-top:1px solid rgba(255,255,255,.05);margin-top:${0}px"><div style="width:28px;height:28px;background:rgba(255,255,255,.06)"></div>${sk('38%', 12)}<div style="margin-left:auto">${sk('64px', 20)}</div></div>`).join('')}`)}
${panel('EMPTY · SAYS WHEN IT FILLS', `<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:flex-start;justify-content:center;padding:36px">
<div class="eyebrow" style="font-size:9.5px">BRACKET</div><div class="h" style="font-weight:700;font-size:24px;margin-top:14px">No matches yet.</div>
<p style="font-size:14px;color:${C.secondary};margin-top:10px;line-height:1.55">The bracket appears here when check-in closes at 7:59 PM. 41 of 64 teams are in.</p>
<div style="display:flex;gap:10px;margin-top:22px"><span class="btn btn-secondary" style="height:40px;font-size:10.5px">View check-in</span></div></div>`)}
${panel('ERROR · WHAT FAILED, WORK KEPT', `<div class="eyebrow" style="font-size:9.5px">BRACKET · UNSAVED CHANGES</div>
<div style="margin-top:16px;display:flex;gap:12px;padding:14px 16px;background:${TONES.critical.bg};box-shadow:inset 0 0 0 1px ${TONES.critical.ring}"><span class="dot" style="background:${C.critical};margin-top:7px;flex:none"></span><div><b style="font-size:14px;color:#FCA5A5">Couldn’t save the bracket.</b><p style="font-size:13px;color:${C.secondary};margin-top:4px;line-height:1.5">Check your connection and try again. Your seeding changes are still here.</p><div style="display:flex;gap:8px;margin-top:12px"><span class="btn btn-primary" style="height:34px;font-size:10px">Try again</span><span class="btn btn-ghost" style="height:34px;font-size:10px">Copy details</span></div></div></div>
<div class="grid-px" style="margin-top:18px;opacity:.75">${['Night Owls', 'Crimson Five', 'Lahore Lynx', 'Byte Force'].map((t, i) => `<div style="display:flex;gap:10px;align-items:center;padding:10px 12px;font-size:13px"><span class="mono" style="color:${C.hint};width:18px">${i + 1}</span>${crest(t.split(' ').map((w) => w[0]).join(''), i * 70 + 10, 22, i)}${t}</div>`).join('')}</div>`)}
</section>`
  );
}

export default [
  { id: 'ui/components-and-states', out: 'ui/components-and-states.png', w: W, h: 900, html: components, description: 'CommandButton variants × states, field states, status pill tones, choice card states and inline notices.', tags: ['ui', 'states', 'components'], direction: 'broadcast' },
  { id: 'ui/check-in-states', out: 'ui/check-in-states.png', w: W, h: 1000, html: checkinStates, description: 'Captain check-in screen across six states: waiting, open, checking in, checked in, offline, missed.', tags: ['ui', 'states', 'flow'], direction: 'broadcast' },
  { id: 'ui/empty-error-loading', out: 'ui/empty-error-loading.png', w: W, h: 1000, html: emptyErrorLoading, description: 'Skeleton in the real layout, an empty state that says when it fills, an error that keeps work.', tags: ['ui', 'states'], direction: 'broadcast' },
];
