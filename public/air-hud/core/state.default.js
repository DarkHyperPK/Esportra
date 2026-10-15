// Default broadcast state. The control panel edits a live copy of this; overlays read it.
// Every field is plain JSON so a data feed can push the same shape over WebSocket.
window.HUD_DEFAULT = {
  event: { name: 'ESPORTRA INVITATIONAL', stage: 'GRAND FINAL', bestOf: 3, handle: '@esportra', site: 'ESPORTRA.COM' },
  teams: [
    { name: 'PAPER REX', tag: 'PRX', color: '#4fd3ea', logo: '', score: 11, series: 1, side: 'DEF', timeouts: 2, lossStreak: 1 },
    { name: 'FNATIC',    tag: 'FNC', color: '#e0445e', logo: '', score: 12, series: 1, side: 'ATK', timeouts: 1, lossStreak: 0 }
  ],
  map: { name: 'LOTUS', number: 3 },
  mapPool: ['HAVEN', 'ASCENT', 'SPLIT', 'SUNSET', 'ABYSS', 'LOTUS', 'SUMMIT'],
  // veto: team index (0/1) or -1 for decider; side = side picked by the other team for that map
  veto: [
    { team: 1, action: 'ban',  map: 'SPLIT' },
    { team: 0, action: 'ban',  map: 'ABYSS' },
    { team: 1, action: 'pick', map: 'HAVEN',  side: 'DEF' },
    { team: 0, action: 'pick', map: 'SUNSET', side: 'ATK' },
    { team: 1, action: 'ban',  map: 'ASCENT' },
    { team: 0, action: 'ban',  map: 'SUMMIT' },
    { team: -1, action: 'decider', map: 'LOTUS', side: 'ATK' }
  ],
  // maps in the series, in play order; winner = team index or null
  series: [
    { map: 'HAVEN',  pick: 1, score: [9, 13],  winner: 1 },
    { map: 'SUNSET', pick: 0, score: [13, 10], winner: 0 },
    { map: 'LOTUS',  pick: -1, score: [11, 12], winner: null }
  ],
  round: { number: 24, phase: 'live', endsAt: 0, remaining: 84, winner: null, method: '' },
  // phase: 'buy' | 'live' | 'planted' | 'paused' | 'end'. endsAt = epoch ms when the timer hits 0 (0 = frozen at `remaining`)
  players: [
    [
      { name: 'JUNO', agent: 'RAZE',    hp: 100, armor: 50, credits: 1150, weapon: 'VANDAL',   ult: 5, ultMax: 8, charges: [1, 2, 1], alive: true,  k: 17, d: 16, a: 4, acs: 231, adr: 148, hs: 24, fk: 4 },
      { name: 'MIRA',  agent: 'CYPHER', hp: 100, armor: 50, credits: 2900, weapon: 'PHANTOM',  ult: 6, ultMax: 6, charges: [2, 1, 1], alive: true,  k: 15, d: 15, a: 6, acs: 205, adr: 132, hs: 31, fk: 1 },
      { name: 'DAX',   agent: 'BREACH', hp: 64,  armor: 25, credits: 800,  weapon: 'SHERIFF',  ult: 3, ultMax: 9, charges: [1, 0, 2], alive: true,  k: 12, d: 17, a: 9, acs: 172, adr: 118, hs: 20, fk: 2 },
      { name: 'RIKU',  agent: 'VIPER',  hp: 0,   armor: 0,  credits: 3450, weapon: 'VANDAL',   ult: 7, ultMax: 9, charges: [1, 1, 1], alive: false, k: 18, d: 14, a: 5, acs: 244, adr: 156, hs: 27, fk: 3 },
      { name: 'ECHO',  agent: 'SKYE',   hp: 100, armor: 25, credits: 400,  weapon: 'SPECTRE',  ult: 2, ultMax: 8, charges: [2, 1, 1], alive: true,  k: 9,  d: 18, a: 11, acs: 141, adr: 97, hs: 18, fk: 1 }
    ],
    [
      { name: 'KAIRO', agent: 'JETT',    hp: 100, armor: 50, credits: 4200, weapon: 'OPERATOR', ult: 7, ultMax: 7, charges: [1, 1, 1], alive: true,  k: 24, d: 13, a: 3, acs: 298, adr: 183, hs: 29, fk: 6 },
      { name: 'SOL',   agent: 'OMEN',    hp: 38,  armor: 0,  credits: 1900, weapon: 'VANDAL',   ult: 4, ultMax: 7, charges: [1, 1, 2], alive: true,  k: 18, d: 15, a: 7, acs: 228, adr: 141, hs: 25, fk: 2 },
      { name: 'VEX',   agent: 'SOVA',    hp: 0,   armor: 0,  credits: 2600, weapon: 'PHANTOM',  ult: 6, ultMax: 8, charges: [1, 2, 1], alive: false, k: 17, d: 14, a: 10, acs: 214, adr: 136, hs: 22, fk: 3 },
      { name: 'NYX',   agent: 'KILLJOY', hp: 100, armor: 50, credits: 3100, weapon: 'VANDAL',   ult: 8, ultMax: 9, charges: [2, 1, 1], alive: true,  k: 14, d: 15, a: 6, acs: 190, adr: 121, hs: 30, fk: 1 },
      { name: 'ZEN',   agent: 'FADE',    hp: 81,  armor: 25, credits: 1300, weapon: 'BULLDOG',  ult: 5, ultMax: 8, charges: [0, 1, 1], alive: true,  k: 11, d: 16, a: 12, acs: 158, adr: 104, hs: 19, fk: 1 }
    ]
  ],
  observed: [1, 0],              // [team, player]
  killfeed: [                    // newest last; ts = epoch ms (0 = pinned, never expires)
    { killer: [1, 2], victim: [0, 1], weapon: 'PHANTOM', hs: false, ts: 0 },
    { killer: [0, 2], victim: [1, 2], weapon: 'SHERIFF', hs: true,  ts: 0 },
    { killer: [1, 0], victim: [0, 3], weapon: 'OPERATOR', hs: false, ts: 0 }
  ],
  banner: { type: '', team: 1, player: 0, text: '', method: '', ts: 0, hold: 4200 },
  // banner.type: round | ace | teamace | clutch | flawless | thrifty | matchpoint | overtime | techpause | timeout | custom
  lowerThird: { kind: 'generic', title: 'KAIRO TAKES OVER', sub: '24 KILLS / 298 ACS ON LOTUS', team: 1, player: 0 },
  casters: [ { name: 'Ava "Sparrow" Lind', handle: '@sparrowcasts' }, { name: 'Marcus Hale', handle: '@hale_gg' } ],
  holding: { mode: 'starting', target: 0, minutes: 10, message: 'The Grand Final is about to begin' },
  schedule: [
    { time: '17:00', a: 'SEN', b: 'DRX', label: 'Show match', done: true },
    { time: '18:30', a: 'PRX', b: 'FNC', label: 'Grand Final', done: false },
    { time: '21:00', a: '', b: '', label: 'Trophy lift + interviews', done: false }
  ],
  ticker: [
    'PRX and FNC trade maps: Haven to Fnatic 13–9, Sunset to Paper Rex 13–10',
    'KAIRO leads the event with 298 average combat score',
    'Decider on Lotus: first to 13, win by two in overtime',
    'Follow @esportra for match highlights'
  ],
  bracket: {
    qf: [['SENTINELS', 13, 'DRX', 9], ['EDG', 7, 'FNATIC', 13], ['PAPER REX', 13, 'NRG', 11], ['G2 ESPORTS', 10, 'HERETICS', 13]],
    sf: [['SENTINELS', 1, 'FNATIC', 2], ['PAPER REX', 2, 'HERETICS', 0]],
    gf: [['PAPER REX', 1, 'FNATIC', 1]]
  },
  standings: [
    ['FNATIC', '4–1', '8–4', '+28'], ['SENTINELS', '3–1', '7–3', '+33'], ['PAPER REX', '3–2', '7–5', '+13'], ['NRG', '2–2', '5–4', '+3'],
    ['HERETICS', '2–2', '4–5', '-7'], ['EDG', '2–2', '4–6', '-14'], ['G2 ESPORTS', '1–3', '4–7', '-16'], ['DRX', '0–4', '1–8', '-41']
  ],
  rounds: [{"w": 1, "how": "elim"}, {"w": 1, "how": "defuse"}, {"w": 0, "how": "elim"}, {"w": 1, "how": "time"}, {"w": 0, "how": "boom"}, {"w": 0, "how": "elim"}, {"w": 1, "how": "elim"}, {"w": 1, "how": "defuse"}, {"w": 0, "how": "boom"}, {"w": 1, "how": "elim"}, {"w": 1, "how": "elim"}, {"w": 0, "how": "elim"}, {"w": 0, "how": "defuse"}, {"w": 0, "how": "time"}, {"w": 1, "how": "elim"}, {"w": 0, "how": "elim"}, {"w": 1, "how": "boom"}, {"w": 1, "how": "elim"}, {"w": 0, "how": "defuse"}, {"w": 0, "how": "elim"}, {"w": 1, "how": "boom"}, {"w": 0, "how": "elim"}, {"w": 1, "how": "elim"}],          // completed rounds: w = winning team index, how = elim | boom | defuse | time
  firstSide: ['ATK', 'DEF'],     // side each team started the map on (rounds 1-12)
  teamStats: [
    { plants: 9, defuses: 3, clutches: 2, pistols: 1, ecoWins: 2, firstKills: 11 },
    { plants: 11, defuses: 2, clutches: 3, pistols: 1, ecoWins: 1, firstKills: 12 }
  ],
  sponsors: [ { name: 'NOVA ENERGY', line: 'Official energy partner', logo: '' }, { name: 'ARCLIGHT PC', line: 'Powering every observer', logo: '' }, { name: 'KITE NETWORK', line: 'Low-latency partner', logo: '' } ],
  toast: { text: 'Replay of the round-23 retake coming up after this round', ts: 0 },
  poll: { question: 'Who takes the decider on Lotus?', options: [{ label: 'PRX', pct: 41 }, { label: 'FNC', pct: 59 }], votes: 18240 },
  duel: { a: [1, 0], b: [0, 3], title: 'OPERATOR DUEL' },
  spotlight: { team: 1, player: 0, season: { maps: 18, rating: '1.24', kpr: '0.86', acs: 262, hs: '28%', clutches: 9 }, quote: 'I just want the last round.' },
  champion: { team: -1 },     // -1 = decide from series score; 0/1 = force a winner
  show: { scorebug: true, players: true, killfeed: true, observed: true, minimap: false, economy: 'auto', scoreboard: false, lowerThird: false, replay: false, ticker: true,
          roundHistory: false, winProb: true, spikeTimer: true, moments: true, sponsor: true, eventBug: true, poll: false, duel: false, teamCompare: false, roundRecap: 'auto', playerCams: false, seriesMaps: true },
  prevCredits: [[1150, 2900, 800, 3450, 400], [4200, 1900, 2600, 3100, 1300]],
  layout: { minimap: { x: 24, y: 24, size: 400 }, bannerTheme: 'broadcast' },
  stinger: 0                    // epoch ms of the last stinger trigger
};
