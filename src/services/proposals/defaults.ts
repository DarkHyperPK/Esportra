import type {
  PlatformProposal,
  Proposal,
  ProposalKind,
  TournamentProposal,
} from '@/schemas/proposal';

const SENDER = {
  name: 'Mudassir Siddiqui',
  title: 'Founder / CEO',
  company: 'Esportra',
  email: 'business@esportra.com',
  website: 'esportra.com',
  discord: 'discord.gg/esportra',
};

const PARTNERS = [
  { name: 'SystemOptix', logoUrl: '/proposals/systemoptix-logo.png', note: '' },
  { name: 'ASUS', logoUrl: '', note: '' },
];

const RECOGNITION = [
  'Featured by Ignite (National Technology Fund), Ministry of IT & Telecom (MoITT)',
  'Top 10 startup incubatee, National Incubation Center, at the 28th ITCN Asia, Expo Centre Karachi',
];

const STATS = [
  { value: '16', label: 'Squads played Genesis Stage 1', note: '' },
  { value: '32', label: 'Teams signed up on Esportra', note: '' },
  { value: '250', label: 'Players signed up on the platform', note: '' },
];

const ABOUT =
  'Esportra is a competitive platform for tournaments, matches and the venues they happen in. '
  + 'Organizers run events with automated brackets, check-in and match rooms. '
  + 'Teams register, play and keep a record of their results. Built in Pakistan.';

const TOURNAMENT_TERMS = [
  'Prices are in PKR and apply per tournament.',
  'Each package covers Genesis Stage 2 only.',
  'Placements are scheduled with the Esportra team and confirmed before the event.',
  'Brand assets are used only for the placements agreed in this proposal.',
  'Reports contain aggregate figures only. No personal player data is shared.',
];

const PLATFORM_TERMS = [
  'Platform partnership terms are agreed directly with each partner.',
  'Brand assets are used only for the placements agreed in this proposal.',
  'Reports contain aggregate figures only. No personal player data is shared.',
];

const TOURNAMENT_TIERS: TournamentProposal['tiers'] = [
  {
    name: 'Silver', price: 30000, currency: 'PKR', tagline: 'Presence', availability: 'Open',
    includesPrevious: false, featured: false,
    features: [
      '1 social post across all Esportra channels',
      '1 platform placement: Card Badge',
      'Livestream overlay branding on welcome and break screens',
    ],
  },
  {
    name: 'Gold', price: 60000, currency: 'PKR', tagline: 'Presence on stream', availability: 'Open',
    includesPrevious: true, featured: false,
    features: [
      '1 more social post (2 in total)',
      'Sidebar placement on the tournament page',
      'Logo on the live in-game HUD',
      'Post-event report: total reach',
    ],
  },
  {
    name: 'Platinum', price: 100000, currency: 'PKR', tagline: 'Part of the broadcast', availability: 'Open',
    includesPrevious: true, featured: false,
    features: [
      '2 more social posts (4 in total)',
      'Header banner and Match Bar placements',
      'Live caster shoutouts during broadcasts',
      'Post-event report adds an aggregate audience breakdown',
    ],
  },
  {
    name: 'Title', price: 150000, currency: 'PKR', tagline: 'The event carries your name', availability: 'One brand only',
    includesPrevious: true, featured: true,
    features: [
      'Naming rights: "Esportra Genesis Stage 2, Powered by {brand}"',
      '2 more social posts (6 in total)',
      'Dominant branding across all broadcast HUDs',
      'All six placement zones, including the homepage ticker',
    ],
  },
];

const ZONE_ROWS: TournamentProposal['zoneRows'] = [
  { zone: 'Card Badge', cells: ['Logo', 'Logo', 'Logo', 'Logo'] },
  { zone: 'Sidebar', cells: ['—', 'Logo', 'Logo', 'Logo'] },
  { zone: 'Header banner', cells: ['—', '—', 'Banner', 'Banner'] },
  { zone: 'Match Bar', cells: ['—', '—', 'Logo', 'Logo'] },
  { zone: 'Stream overlay', cells: ['Welcome & break screens', '+ live HUD logo', '+ live HUD logo', 'All broadcast HUDs'] },
  { zone: 'Homepage ticker', cells: ['—', '—', '—', 'Logo'] },
];

const TOURNAMENT_STEPS = [
  { title: 'Choose a package', body: 'Pick the tier that fits. Title is held for one brand.' },
  { title: 'Send your assets', body: 'A logo (PNG or SVG), brand colours and any copy. We confirm every placement back to you.' },
  { title: 'Go live', body: 'Placements, posts and stream branding run from the start of the event.' },
  { title: 'Receive the report', body: 'After the final, you get the post-event report included in your tier.' },
];

const PLATFORM_TIERS: PlatformProposal['tiers'] = [
  {
    name: 'Partner', label: 'Entry', featured: false,
    summary: 'Your brand on the platform, visible to everyone who visits.',
    points: [
      'Logo on the homepage partner ticker',
      'Sponsorship on 1 tournament of your choice',
      'Partner portal access with a campaign overview',
    ],
  },
  {
    name: 'Ascendant', label: 'Growth', featured: false,
    summary: 'More events, with the data to see how your brand performs.',
    points: [
      'Everything in Partner',
      'Sponsorship on up to 3 tournaments',
      'Ticker, sidebar and card badge placements',
      'Full analytics, daily and weekly: impressions, clicks, CTR and audience demographics',
      'Banner uploads, 5 gallery images and a hosted brand deck',
      'Company profile on the Partners page',
    ],
  },
  {
    name: 'Radiant', label: 'Premium', featured: true,
    summary: 'The full platform presence, with monthly reporting.',
    points: [
      'Everything in Ascendant',
      'Sponsorship on up to 5 tournaments',
      'All six placement zones, including header, match bar and stream overlay',
      'Monthly analytics report',
      '8 gallery images',
      'Priority listing across the platform',
    ],
  },
];

const PLATFORM_ZONES: PlatformProposal['zones'] = [
  { name: 'Ticker', desc: 'Homepage logo scroll', tiers: 'Partner, Ascendant, Radiant' },
  { name: 'Sidebar', desc: 'Vertical ad on tournament pages', tiers: 'Ascendant, Radiant' },
  { name: 'Card Badge', desc: 'Logo on tournament cards', tiers: 'Ascendant, Radiant' },
  { name: 'Header', desc: 'Top banner on tournament pages', tiers: 'Radiant' },
  { name: 'Match Bar', desc: 'Branding on match pages', tiers: 'Radiant' },
  { name: 'Stream Overlay', desc: 'Assets for live streams', tiers: 'Radiant' },
];

const PLATFORM_AUDIENCES = [
  { who: 'Players and teams', body: 'Register squads, check in, play matches and keep their results on Esportra.' },
  { who: 'Organizers', body: 'Create and run tournaments with automated brackets, match rooms and payouts.' },
  { who: 'Venues', body: 'List gaming stations for booking and host events.' },
  { who: 'Viewers', body: 'Follow brackets, results and live streams.' },
];

const PLATFORM_PORTAL = [
  'Manage your profile and upload brand assets',
  'Track placements and campaign status',
  'Analytics by tier: impressions, clicks, CTR and audience demographics',
  'Accepted files: PNG, SVG and JPEG up to 3 MB; PDF and PPTX decks up to 10 MB',
];

const PLATFORM_STEPS = [
  { title: 'Agree terms', body: 'Esportra and your team agree the tier and scope.' },
  { title: 'Onboard', body: 'You receive partner portal access and upload your assets.' },
  { title: 'Placements', body: 'Our admin team links your brand to tournaments and zones for your tier.' },
  { title: 'Review', body: 'You see active placements and analytics in the portal.' },
];

function newId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function base(now: Date) {
  const iso = now.toISOString();
  return {
    id: newId(),
    createdAt: iso,
    updatedAt: iso,
    theme: 'stage' as const,
    preparedOn: iso.slice(0, 10),
    prospect: { brandName: '', industry: '', attention: '' },
    sender: { ...SENDER },
    partners: PARTNERS.map((p) => ({ ...p })),
    recognition: [...RECOGNITION],
    stats: STATS.map((s) => ({ ...s })),
    about: ABOUT,
  };
}

export function createTournamentProposal(now = new Date()): TournamentProposal {
  return {
    ...base(now),
    kind: 'tournament',
    title: 'Genesis Stage 2 · Tournament partner',
    terms: [...TOURNAMENT_TERMS],
    event: {
      name: 'Esportra Genesis Stage 2',
      edition: 'Second Esportra tournament',
      game: 'Valorant',
      startDate: '2026-11-06',
      channels: 'YouTube and Facebook',
      format: '',
      prizePool: '',
      next: 'A further tournament is planned for December.',
    },
    audienceHeading: 'Who you reach',
    audienceBody:
      'Genesis Stage 2 puts {brand} in front of competitive Valorant players while they sign up, check in and play.',
    audiencePoints: [
      'Competitive Valorant squads registered on Esportra',
      'Their teammates, friends and communities following along',
      'Viewers on the YouTube and Facebook live streams',
    ],
    tiers: TOURNAMENT_TIERS.map((t) => ({ ...t, features: [...t.features] })),
    zoneRows: ZONE_ROWS.map((r) => ({ ...r, cells: [...r.cells] })),
    steps: TOURNAMENT_STEPS.map((s) => ({ ...s })),
  };
}

export function createPlatformProposal(now = new Date()): PlatformProposal {
  return {
    ...base(now),
    kind: 'platform',
    title: 'Platform partner',
    terms: [...PLATFORM_TERMS],
    audiences: PLATFORM_AUDIENCES.map((a) => ({ ...a })),
    tiers: PLATFORM_TIERS.map((t) => ({ ...t, points: [...t.points] })),
    zones: PLATFORM_ZONES.map((z) => ({ ...z })),
    portalPoints: [...PLATFORM_PORTAL],
    steps: PLATFORM_STEPS.map((s) => ({ ...s })),
    outlook: 'Esportra is built in Pakistan. Southeast Asia and the Middle East are the markets we are growing toward.',
  };
}

export function createProposal(kind: ProposalKind, now = new Date()): Proposal {
  return kind === 'tournament' ? createTournamentProposal(now) : createPlatformProposal(now);
}
