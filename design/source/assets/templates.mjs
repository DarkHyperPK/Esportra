import { C, page, crest, pill, logo, shardsSvg } from '../lib.mjs';

// Sample data used across templates (fictional - replace with real event data)
const EVT = { name: 'Karachi Valorant Open', short: 'KVO 2026', game: 'VALORANT', date: '18 NOV 2026', city: 'KARACHI' };
const A = { name: 'Night Owls', tag: 'NO', hue: 265, shape: 0 };
const B = { name: 'Crimson Five', tag: 'C5', hue: 0, shape: 2 };

const frame = (id, w, h, body, { bg, transparent, css = '' } = {}) =>
  page({ title: id, bg, transparent, css: `.f{position:relative;width:${w}px;height:${h}px;overflow:hidden}${css}`, body: `<main class="f">${body}</main>` });

const shards = (w, h, seed, count = 4, cue = -1) => `<div style="position:absolute;inset:0">${shardsSvg({ w, h, seed, count, fill: '#141416', cueIndex: cue })}</div>`;
const foot = (l, r = '') => `<div style="position:absolute;left:72px;right:72px;bottom:64px;display:flex;justify-content:space-between;align-items:center"><span>${l}</span><span class="eyebrow" style="font-size:14px">${r}</span></div>`;

// ---------------------------------------------------------------- Social 1:1 fixture
function fixture() {
  return frame('templates/social/fixture-1x1', 1080, 1080, `${shards(1080, 1080, 31, 4)}
<div style="position:absolute;left:72px;top:72px" class="eyebrow"><span style="font-size:15px;color:${C.secondary}">${EVT.short} · QUARTER-FINAL · BEST OF 3</span></div>
<div style="position:absolute;left:0;right:0;top:250px;display:grid;grid-template-columns:1fr 160px 1fr;align-items:center">
<div style="text-align:center">${crest(A.tag, A.hue, 220, A.shape)}<div class="h" style="font-weight:900;font-size:54px;margin-top:26px">${A.name}</div></div>
<div class="mono" style="text-align:center;font-weight:700;font-size:22px;letter-spacing:.3em;color:${C.hint}">VS</div>
<div style="text-align:center">${crest(B.tag, B.hue, 220, B.shape)}<div class="h" style="font-weight:900;font-size:54px;margin-top:26px">${B.name}</div></div></div>
<div style="position:absolute;left:72px;right:72px;bottom:170px;display:flex;justify-content:center;align-items:center;gap:28px">
<div class="num" style="font-size:112px">8:00</div><div><div class="mono" style="font-size:24px;font-weight:700;letter-spacing:.2em;color:${C.secondary}">PM PKT</div><div style="width:64px;height:3px;background:${C.cue};margin-top:12px"></div><div class="mono" style="font-size:20px;letter-spacing:.2em;color:${C.hint};margin-top:12px">SAT 16 NOV</div></div></div>
${foot(logo({ height: 30 }), 'WATCH LIVE · STATION 4')}`);
}

// ---------------------------------------------------------------- Social 1:1 result
function result() {
  return frame('templates/social/result-1x1', 1080, 1080, `
<div style="position:absolute;left:72px;top:72px" class="eyebrow"><span style="font-size:15px;color:${C.secondary}">FULL TIME · ${EVT.short} · QUARTER-FINAL</span></div>
<div style="position:absolute;left:72px;right:72px;top:230px">
${[[A, 2, true], [B, 1, false]].map(([t, s, win]) => `<div style="display:flex;align-items:center;gap:32px;padding:34px 0;border-top:1px solid rgba(255,255,255,.08)">
${crest(t.tag, t.hue, 130, t.shape)}<div class="h" style="flex:1;font-weight:900;font-size:66px;color:${win ? C.ink : C.hint}">${t.name}</div>
<div class="num" style="font-size:150px;color:${win ? C.ink : C.hint}">${s}</div></div>`).join('')}
<div style="border-top:1px solid rgba(255,255,255,.08)"></div>
<div style="display:flex;gap:18px;margin-top:26px">${[['ASCENT', '13–9', true], ['BIND', '10–13', false], ['HAVEN', '13–11', true]].map(([m, sc, w]) => `<div style="flex:1;padding:18px 20px;background:${C.panel};box-shadow:inset 0 0 0 1px rgba(255,255,255,.07)"><div class="eyebrow" style="font-size:12px">${m}</div><div class="num" style="font-size:40px;margin-top:6px;color:${w ? C.ink : C.hint}">${sc}</div></div>`).join('')}</div></div>
<div style="position:absolute;left:72px;top:220px;width:90px;height:3px;background:${C.cue}"></div>
${foot(logo({ height: 30 }), 'NIGHT OWLS ADVANCE TO THE SEMI-FINAL')}`);
}

// ---------------------------------------------------------------- Social 4:5 champion
function champion() {
  return frame('templates/social/champion-4x5', 1080, 1350, `
<svg width="1080" height="1350" style="position:absolute;inset:0"><defs><radialGradient id="w" cx=".5" cy=".36" r=".62"><stop offset="0" stop-color="hsl(${A.hue} 60% 40%)" stop-opacity=".5"/><stop offset=".45" stop-color="#2a1d18" stop-opacity=".55"/><stop offset="1" stop-color="${C.stage}" stop-opacity="0"/></radialGradient></defs>
<rect width="1080" height="1350" fill="url(#w)"/><path d="M40.5 40.5 H940 L1039.5 140 V1309.5 H40.5 Z" fill="none" stroke="rgba(255,255,255,.12)" stroke-width="1.5"/><line x1="940" y1="40.5" x2="1039.5" y2="140" stroke="${C.cue}" stroke-width="5"/></svg>
<div style="position:absolute;left:96px;top:104px" class="eyebrow"><span style="font-size:16px;color:${C.secondary}">CHAMPIONS · ${EVT.name.toUpperCase()} · 2026</span></div>
<div style="position:absolute;left:0;right:0;top:250px;text-align:center">${crest(A.tag, A.hue, 340, A.shape)}</div>
<div class="h" style="position:absolute;left:0;right:0;top:660px;text-align:center;font-weight:900;font-size:168px;letter-spacing:-0.045em">${A.name}</div>
<div style="position:absolute;left:50%;top:860px;width:240px;height:5px;margin-left:-120px;background:${C.cue}"></div>
<div style="position:absolute;left:0;right:0;top:940px;display:flex;justify-content:center;align-items:center;gap:30px"><span style="font-size:32px;font-weight:600">${A.name}</span><span class="num" style="font-size:88px">3</span><span style="color:${C.hint};font-size:40px">–</span><span class="num" style="font-size:88px;color:${C.hint}">1</span><span style="font-size:32px;font-weight:600;color:${C.hint}">${B.name}</span></div>
<div style="position:absolute;left:96px;right:96px;bottom:100px;display:flex;justify-content:space-between;align-items:center"><span class="eyebrow" style="font-size:15px">GRAND FINAL · ${EVT.date} · ${EVT.city}</span>${logo({ height: 28 })}</div>`);
}

// ---------------------------------------------------------------- Social 4:5 registration
function registration() {
  return frame('templates/social/registration-open-4x5', 1080, 1350, `${shards(1080, 1350, 5, 3, 1)}
<div style="position:absolute;left:84px;top:96px" class="eyebrow"><span style="font-size:16px;color:${C.secondary}">REGISTRATION OPEN · ${EVT.game}</span></div>
<div class="h" style="position:absolute;left:78px;top:470px;font-weight:900;font-size:150px;line-height:.9;letter-spacing:-0.04em">Karachi<br>Valorant<br>Open</div>
<div class="grid-px" style="position:absolute;left:84px;right:84px;bottom:230px;grid-template-columns:repeat(3,1fr)">${[['FINAL', '18 NOV'], ['TEAMS', '64'], ['PRIZE PKR', '250K']].map(([a, b]) => `<div style="padding:26px 28px"><div class="eyebrow" style="font-size:13px">${a}</div><div class="num" style="font-size:64px;margin-top:8px">${b}</div></div>`).join('')}</div>
<div style="position:absolute;left:84px;right:84px;bottom:96px;display:flex;justify-content:space-between;align-items:center">${logo({ height: 30 })}<span class="btn btn-primary" style="height:68px;padding:0 36px;font-size:18px">Register by 12 Nov</span></div>`);
}

// ---------------------------------------------------------------- Story 9:16 check-in reminder
function checkinStory() {
  return frame('templates/social/check-in-story-9x16', 1080, 1920, `${shards(1080, 1920, 11, 3)}
<div style="position:absolute;left:84px;top:200px" class="eyebrow"><span style="font-size:18px;color:${C.secondary}">${EVT.short} · MATCH DAY</span></div>
<div class="h" style="position:absolute;left:80px;top:300px;font-weight:900;font-size:110px;line-height:.95">Check-in<br>is open.</div>
<div style="position:absolute;left:84px;top:680px"><div class="eyebrow" style="font-size:16px">CLOSES IN</div><div class="num" style="font-size:300px;line-height:.9;margin-top:10px">30:00</div><div style="width:140px;height:5px;background:${C.cue};margin-top:24px"></div></div>
<p style="position:absolute;left:84px;right:84px;top:1170px;font-size:40px;line-height:1.35;color:${C.label}">Captains, check your team in before 7:59 PM. Teams that miss it wait for the organizer’s call.</p>
<div style="position:absolute;left:84px;right:84px;bottom:230px"><span class="btn btn-primary" style="width:100%;height:120px;font-size:28px">Check in your team</span></div>
<div style="position:absolute;left:84px;right:84px;bottom:110px;display:flex;justify-content:space-between;align-items:center">${logo({ height: 34 })}<span class="eyebrow" style="font-size:15px">ESPORTRA.COM</span></div>`);
}

// ---------------------------------------------------------------- OG image
function og() {
  return frame('templates/web/og-image', 1200, 630, `${shards(1200, 630, 17, 4)}
<div style="position:absolute;left:72px;top:64px" class="eyebrow"><span style="font-size:14px;color:${C.secondary}">${EVT.game} · 64 TEAMS · ${EVT.city}</span></div>
<div class="h" style="position:absolute;left:68px;top:170px;font-weight:900;font-size:104px;line-height:.92;letter-spacing:-0.035em">Karachi<br>Valorant Open</div>
<div style="position:absolute;left:72px;top:392px;width:72px;height:3px;background:${C.cue}"></div>
<div style="position:absolute;left:72px;right:72px;bottom:60px;display:flex;justify-content:space-between;align-items:flex-end">
<div style="display:flex;gap:48px">${[['FINAL', '18 NOV'], ['PRIZE PKR', '250K']].map(([a, b]) => `<div><div class="eyebrow" style="font-size:12px">${a}</div><div class="num" style="font-size:48px;margin-top:4px">${b}</div></div>`).join('')}</div>${logo({ height: 28 })}</div>`);
}

// ---------------------------------------------------------------- Email (Daylight)
function email() {
  return frame('templates/email/check-in-reminder', 640, 860, `
<div style="margin:32px auto 0;width:560px;background:#fff;box-shadow:0 0 0 1px ${C.paperHair};color:${C.paperInk}">
<div style="background:${C.stage};padding:22px 32px;display:flex;justify-content:space-between;align-items:center">${logo({ height: 20 })}<span class="eyebrow" style="font-size:10px">${EVT.short}</span></div>
<div style="padding:36px 32px">
<div class="eyebrow" style="color:${C.paperHint};font-size:10px">CHECK-IN REMINDER · QUARTER-FINAL</div>
<div class="h" style="font-weight:800;font-size:34px;margin-top:14px;line-height:1.1">Check-in closes at 7:59 PM.</div>
<p style="font-size:16px;line-height:1.6;color:${C.paperSecondary};margin-top:16px">Hi Hamza, your match against Crimson Five starts at 8:00 PM PKT on Saturday 16 Nov. Check Night Owls in before 7:59 PM so the room opens on time.</p>
<div style="margin-top:26px;border:1px solid ${C.paperHair}">
${[['Match', 'Night Owls vs Crimson Five'], ['Starts', 'Sat 16 Nov, 8:00 PM PKT'], ['Check-in', '7:30–7:59 PM PKT'], ['Format', 'Best of 3 · Station 4']].map(([k, v], i) => `<div style="display:flex;justify-content:space-between;padding:12px 16px;${i ? `border-top:1px solid ${C.paperHair}` : ''};font-size:14px"><span style="color:${C.paperSecondary}">${k}</span><b style="font-weight:600">${v}</b></div>`).join('')}</div>
<div style="margin-top:28px;display:inline-flex;height:52px;align-items:center;padding:0 28px;background:${C.paperInk};color:#fff;font-family:'JetBrains Mono';font-weight:700;font-size:13px;letter-spacing:.18em">CHECK IN YOUR TEAM</div>
<p style="font-size:13px;line-height:1.6;color:${C.paperHint};margin-top:22px">The button opens the check-in page; you’ll sign in first. We never put sign-in links in email.</p></div>
<div style="border-top:1px solid ${C.paperHair};padding:20px 32px;font-size:12px;line-height:1.6;color:${C.paperHint}">You’re getting this because you captain Night Owls in ${EVT.name}. Reminder settings are in your profile.</div></div>`, { bg: '#F4F4F5' });
}

// ---------------------------------------------------------------- Stream scorebug (transparent)
function scorebug() {
  return frame('templates/stream/scorebug', 1920, 1080, `
<div style="position:absolute;left:50%;top:32px;transform:translateX(-50%);display:flex;align-items:stretch;background:rgba(9,9,11,.92);box-shadow:inset 0 0 0 1px rgba(255,255,255,.1)">
<div style="display:flex;align-items:center;gap:16px;padding:0 24px;height:72px">${crest(A.tag, A.hue, 44, A.shape)}<span class="h" style="font-weight:800;font-size:26px">${A.name}</span></div>
<div class="num" style="display:flex;align-items:center;padding:0 22px;font-size:44px;background:rgba(255,255,255,.05)">1</div>
<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:0 22px;min-width:150px"><span class="mono" style="font-size:12px;font-weight:700;letter-spacing:.24em;color:${C.secondary}">MAP 2 · BIND</span><span class="num" style="font-size:26px;margin-top:2px">8 – 6</span></div>
<div class="num" style="display:flex;align-items:center;padding:0 22px;font-size:44px;background:rgba(255,255,255,.05)">0</div>
<div style="display:flex;align-items:center;gap:16px;padding:0 24px;height:72px"><span class="h" style="font-weight:800;font-size:26px">${B.name}</span>${crest(B.tag, B.hue, 44, B.shape)}</div></div>
<div style="position:absolute;left:50%;top:104px;transform:translateX(-50%);display:flex;gap:10px;align-items:center;padding:6px 14px;background:rgba(9,9,11,.92)"><span class="dot" style="background:${C.cue}"></span><span class="mono" style="font-size:12px;font-weight:700;letter-spacing:.24em;color:${C.label}">LIVE · QUARTER-FINAL · BO3</span></div>`, { transparent: true });
}

// ---------------------------------------------------------------- Stream lower-third (transparent)
function lowerThird() {
  return frame('templates/stream/lower-third', 1920, 1080, `
<div style="position:absolute;left:96px;bottom:120px;display:flex;align-items:stretch;background:rgba(9,9,11,.92);box-shadow:inset 0 0 0 1px rgba(255,255,255,.08)">
<div style="width:6px;background:${C.cue}"></div>
<div style="padding:22px 34px 24px 26px"><div class="mono" style="font-size:15px;font-weight:700;letter-spacing:.28em;color:${C.secondary}">IGL · NIGHT OWLS</div><div class="h" style="font-weight:800;font-size:54px;margin-top:8px">Hamza “Viper” Siddiqui</div></div>
<div style="display:flex;align-items:center;padding:0 28px;border-left:1px solid rgba(255,255,255,.08)">${crest(A.tag, A.hue, 72, A.shape)}</div></div>`, { transparent: true });
}

// ---------------------------------------------------------------- Stream starting soon
function startingSoon() {
  return frame('templates/stream/starting-soon', 1920, 1080, `${shards(1920, 1080, 44, 5, 3)}
<div style="position:absolute;left:120px;top:120px" class="eyebrow"><span style="font-size:18px;color:${C.secondary}">${EVT.name.toUpperCase()} · GRAND FINAL</span></div>
<div class="h" style="position:absolute;left:112px;top:330px;font-weight:900;font-size:200px;letter-spacing:-0.045em;line-height:.9">Starting<br>soon.</div>
<div style="position:absolute;left:120px;bottom:130px;display:flex;align-items:center;gap:40px">${crest(A.tag, A.hue, 110, A.shape)}<span class="mono" style="font-size:26px;letter-spacing:.3em;color:${C.hint}">VS</span>${crest(B.tag, B.hue, 110, B.shape)}
<div style="margin-left:40px"><div class="eyebrow" style="font-size:15px">DOORS 6:00 · FIRST MAP</div><div class="num" style="font-size:90px;margin-top:6px">8:00 PM</div></div></div>
<div style="position:absolute;right:120px;bottom:130px">${logo({ height: 36 })}</div>`);
}

// ---------------------------------------------------------------- Venue station board
function venueBoard() {
  const st = [
    ['01', 'Night Owls vs Crimson Five', 'Live', 'accent', 'Map 2 · 8–6'],
    ['02', 'Lahore Lynx vs Byte Force', 'Live', 'neutral', 'Map 1 · 11–9'],
    ['03', 'Karachi Kings vs Sandstorm', 'Check-in', 'warning', 'Closes 8:14'],
    ['04', 'Pixel Pirates vs Zero Ping', 'Ready', 'success', 'Starts 8:20'],
    ['05', 'Open', 'Free', 'neutral', 'Walk-in 2h'],
    ['06', 'Open', 'Free', 'neutral', 'Walk-in 2h'],
  ];
  return frame('templates/venue/station-board', 1920, 1080, `
<div style="position:absolute;left:80px;right:80px;top:64px;display:flex;justify-content:space-between;align-items:flex-end">
<div><div class="eyebrow" style="font-size:16px">ARENA ONE · CLIFTON · TONIGHT</div><div class="h" style="font-weight:900;font-size:84px;margin-top:12px">Stations</div></div>
<div style="text-align:right"><div class="num" style="font-size:84px">8:06 PM</div><div class="eyebrow" style="font-size:14px">4 OF 6 IN USE</div></div></div>
<div class="grid-px" style="position:absolute;left:80px;right:80px;top:260px;grid-template-columns:repeat(3,1fr)">
${st.map(([n, m, s, t, d]) => `<div style="padding:32px 34px;height:340px;display:flex;flex-direction:column;${t === 'accent' ? `box-shadow:inset 0 3px 0 ${C.cue}` : ''}">
<div style="display:flex;justify-content:space-between;align-items:center"><span class="num" style="font-size:96px;color:${m === 'Open' ? C.disabled : C.ink}">${n}</span>${pill(s, t).replace('height:24px', 'height:36px;font-size:15px')}</div>
<div style="margin-top:auto"><div style="font-size:30px;font-weight:600;color:${m === 'Open' ? C.hint : C.ink}">${m}</div><div class="mono" style="font-size:20px;color:${C.secondary};margin-top:10px">${d}</div></div></div>`).join('')}</div>
<div style="position:absolute;left:80px;right:80px;bottom:44px;display:flex;justify-content:space-between;align-items:center"><span style="font-size:22px;color:${C.secondary}">Book a station at the desk or on Esportra.</span>${logo({ height: 28 })}</div>`);
}

// ---------------------------------------------------------------- Channel banner + thumbnail
function banner() {
  return frame('templates/web/channel-banner', 1500, 500, `${shards(1500, 500, 61, 5)}
<div class="h" style="position:absolute;left:520px;top:150px;font-weight:900;font-size:92px;letter-spacing:-0.04em;line-height:.9">Run your cup<br>like a final.</div>
<div style="position:absolute;left:526px;top:340px;width:64px;height:3px;background:${C.cue}"></div>
<div class="mono" style="position:absolute;left:526px;top:372px;font-size:15px;font-weight:700;letter-spacing:.3em;color:${C.secondary}">TOURNAMENTS · VENUES · PAKISTAN</div>
<div style="position:absolute;right:64px;bottom:48px">${logo({ height: 26 })}</div>`);
}

function thumbnail() {
  return frame('templates/web/video-thumbnail', 1280, 720, `
<div style="position:absolute;inset:0;background:radial-gradient(60% 80% at 75% 45%,hsl(${A.hue} 50% 22%),${C.stage} 70%)"></div>
<div style="position:absolute;right:120px;top:130px">${crest(A.tag, A.hue, 400, A.shape)}</div>
<div style="position:absolute;left:64px;top:64px" class="eyebrow"><span style="font-size:18px;color:${C.label}">GRAND FINAL · FULL VOD</span></div>
<div class="h" style="position:absolute;left:58px;top:190px;font-weight:900;font-size:124px;letter-spacing:-0.045em;line-height:.88">3–1.<br><span style="font-size:88px">Night Owls<br>take Karachi.</span></div>
<div style="position:absolute;left:64px;bottom:70px;width:110px;height:6px;background:${C.cue}"></div>`);
}

const t = (id, fn, w, h, description, use, extra = {}) => ({ id: `templates/${id}`, out: `templates/${id}.png`, w, h, html: fn, description, use, tags: ['template', id.split('/')[0]], ...extra });

export default [
  t('social/fixture-1x1', fixture, 1080, 1080, 'Match-day fixture post: versus lockup, time in PKT, station.', 'Instagram/X feed, WhatsApp communities.', { direction: 'broadcast' }),
  t('social/result-1x1', result, 1080, 1080, 'Result post: winner white, loser grey, map-by-map scoreboard.', 'Feed post right after full time.', { direction: 'broadcast' }),
  t('social/champion-4x5', champion, 1080, 1350, 'Champion card 4:5 with warm light, team glow, notch and resolved lockup.', 'The one celebratory post per event.', { direction: 'trophy' }),
  t('social/registration-open-4x5', registration, 1080, 1350, 'Registration announcement 4:5 with scoreboard facts and a dated action.', 'Launch post for an event.', { direction: 'broadcast' }),
  t('social/check-in-story-9x16', checkinStory, 1080, 1920, 'Check-in story with countdown hero and one action.', 'Instagram/WhatsApp story 30 minutes before a window.', { direction: 'broadcast' }),
  t('web/og-image', og, 1200, 630, 'Open Graph share image for a tournament page.', 'og:image / twitter:image.', { direction: 'broadcast' }),
  t('web/channel-banner', banner, 1500, 500, 'Channel header with the organizer promise; safe area on the right two-thirds.', 'X header, YouTube/Twitch banner (crop-safe centre).', { direction: 'cinematic' }),
  t('web/video-thumbnail', thumbnail, 1280, 720, 'VOD thumbnail: result as the hero, champion crest at scale.', 'YouTube thumbnails.', { direction: 'trophy' }),
  t('email/check-in-reminder', email, 640, 860, 'Transactional reminder email in Daylight: facts table, one action, no sign-in links.', 'T-30 and T-10 captain reminders.', { direction: 'daylight' }),
  t('stream/scorebug', scorebug, 1920, 1080, 'Transparent broadcast scorebug with series score, map and live tag.', 'OBS overlay above gameplay.', { direction: 'broadcast', transparent: true }),
  t('stream/lower-third', lowerThird, 1920, 1080, 'Transparent lower-third: rose tick, role caption, name, crest.', 'Caster desk and player interviews.', { direction: 'broadcast', transparent: true }),
  t('stream/starting-soon', startingSoon, 1920, 1080, 'Starting-soon screen with the final’s matchup and time.', 'Stream holding screen.', { direction: 'cinematic' }),
  t('venue/station-board', venueBoard, 1920, 1080, 'Venue TV board: six stations with live state, readable across a room.', 'Venue screens driven by the station agent.', { direction: 'command-console' }),
];
