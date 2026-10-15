// Clean slate state — same shape as state.default.js but with empty/zero values.
// Use for GEP testing or fresh show setup so demo data doesn't bleed through.
const _p = () => ({ name: '', agent: '', hp: 100, armor: 0, credits: 800, weapon: 'VANDAL', ult: 0, ultMax: 7, charges: [0, 0, 0], alive: true, k: 0, d: 0, a: 0, acs: 0, adr: 0, hs: 0, fk: 0 });
window.HUD_CLEAN = {
  event: { name: '', stage: '', bestOf: 1, handle: '', site: '' },
  teams: [
    { name: '', tag: '', color: '#4fd3ea', logo: '', score: 0, series: 0, side: 'ATK', timeouts: 2, lossStreak: 0 },
    { name: '', tag: '', color: '#e0445e', logo: '', score: 0, series: 0, side: 'DEF', timeouts: 2, lossStreak: 0 }
  ],
  map: { name: 'LOTUS', number: 1 },
  mapPool: ['HAVEN', 'ASCENT', 'SPLIT', 'SUNSET', 'ABYSS', 'LOTUS', 'SUMMIT'],
  veto: [],
  series: [{ map: 'LOTUS', pick: -1, score: [0, 0], winner: null }],
  round: { number: 1, phase: 'buy', endsAt: 0, remaining: 30, winner: null, method: '' },
  players: [[_p(), _p(), _p(), _p(), _p()], [_p(), _p(), _p(), _p(), _p()]],
  observed: [0, 0],
  killfeed: [],
  banner: { type: '', team: 0, player: 0, text: '', method: '', ts: 0, hold: 4200 },
  lowerThird: { kind: 'generic', title: '', sub: '', team: 0, player: 0 },
  casters: [{ name: '', handle: '' }, { name: '', handle: '' }],
  holding: { mode: 'starting', target: 0, minutes: 5, message: '' },
  schedule: [],
  ticker: [],
  bracket: {
    qf: [['', 0, '', 0], ['', 0, '', 0], ['', 0, '', 0], ['', 0, '', 0]],
    sf: [['', 0, '', 0], ['', 0, '', 0]],
    gf: [['', 0, '', 0]]
  },
  standings: [],
  rounds: [],
  firstSide: ['ATK', 'DEF'],
  teamStats: [
    { plants: 0, defuses: 0, clutches: 0, pistols: 0, ecoWins: 0, firstKills: 0 },
    { plants: 0, defuses: 0, clutches: 0, pistols: 0, ecoWins: 0, firstKills: 0 }
  ],
  sponsors: [],
  toast: { text: '', ts: 0 },
  poll: { question: '', options: [{ label: '', pct: 50 }, { label: '', pct: 50 }], votes: 0 },
  duel: { a: [0, 0], b: [1, 0], title: '' },
  spotlight: { team: 0, player: 0, season: { maps: 0, rating: '—', kpr: '—', acs: 0, hs: '—', clutches: 0 }, quote: '' },
  champion: { team: -1 },
  show: { scorebug: true, players: true, killfeed: true, observed: true, minimap: false, economy: 'auto', scoreboard: false, lowerThird: false, replay: false, ticker: true,
          roundHistory: false, winProb: true, spikeTimer: true, moments: true, sponsor: true, eventBug: true, poll: false, duel: false, teamCompare: false, roundRecap: 'auto', playerCams: false },
  prevCredits: [[0,0,0,0,0],[0,0,0,0,0]],
  layout: { minimap: { x: 24, y: 24, size: 400 }, bannerTheme: 'broadcast' },
  stinger: 0
};
