import { z } from 'zod';

const text = (max = 300) => z.string().max(max);

export const statSchema = z.object({ value: text(40), label: text(80), note: text(160) });
export const partnerSchema = z.object({ name: text(80), logoUrl: text(300), note: text(160) });
export const stepSchema = z.object({ title: text(80), body: text(400) });

export const senderSchema = z.object({
  name: text(80),
  title: text(80),
  company: text(80),
  email: text(120),
  website: text(120),
  discord: text(120),
  phone: text(40).default(''),
});

export const prospectSchema = z.object({
  brandName: text(80),
  industry: text(80),
  attention: text(120),
});

export const tournamentTierSchema = z.object({
  name: text(40),
  price: z.number().min(0).max(100_000_000),
  currency: text(8),
  tagline: text(120),
  availability: text(80),
  includesPrevious: z.boolean(),
  featured: z.boolean(),
  features: z.array(text(200)).max(20),
});

export const zoneRowSchema = z.object({
  zone: text(60),
  cells: z.array(text(60)).max(8),
});

export const eventSchema = z.object({
  name: text(80),
  edition: text(80),
  game: text(60),
  startDate: text(10),
  channels: text(120),
  format: text(120),
  prizePool: text(80),
  next: text(200),
});

export const platformTierSchema = z.object({
  name: text(40),
  label: text(60),
  summary: text(300),
  featured: z.boolean(),
  points: z.array(text(200)).max(20),
});

export const audienceSchema = z.object({ who: text(60), body: text(300) });
export const platformZoneSchema = z.object({ name: text(60), desc: text(160), tiers: text(80) });

const commonShape = {
  id: text(64).min(1),
  title: text(120).min(1),
  createdAt: text(40),
  updatedAt: text(40),
  theme: z.enum(['stage', 'paper']),
  preparedOn: text(10),
  prospect: prospectSchema,
  sender: senderSchema,
  partners: z.array(partnerSchema).max(12),
  recognition: z.array(text(200)).max(8),
  terms: z.array(text(300)).max(12),
  // Added later: defaults keep proposals saved before these fields readable.
  closingLine: text(200).default('Every match, official.'),
  closingNote: text(600).default(''),
  images: z.object({
    cover: text(300),
    page: text(300),
    stream: text(300),
  }).default({ cover: '', page: '/proposals/tournament-page.jpg', stream: '/proposals/stream-overlay.jpg' }),
};

export const tournamentProposalSchema = z.object({
  ...commonShape,
  kind: z.literal('tournament'),
  coverHeadline: text(120).default(''),
  coverLine: text(240).default('Put {brand} inside the match, not beside it.'),
  event: eventSchema,
  about: text(1200),
  stats: z.array(statSchema).max(6),
  audienceHeading: text(120),
  audienceBody: text(1200),
  audiencePoints: z.array(text(200)).max(8),
  tiers: z.array(tournamentTierSchema).max(6),
  zoneRows: z.array(zoneRowSchema).max(12),
  steps: z.array(stepSchema).max(8),
});

export const platformProposalSchema = z.object({
  ...commonShape,
  kind: z.literal('platform'),
  coverHeadline: text(120).default('Be part of the match, not the ad break.'),
  coverLine: text(240).default('Year-round presence where competitive players register, play and follow their results.'),
  about: text(1200),
  stats: z.array(statSchema).max(6),
  audiences: z.array(audienceSchema).max(6),
  tiers: z.array(platformTierSchema).max(6),
  zones: z.array(platformZoneSchema).max(12),
  portalPoints: z.array(text(200)).max(10),
  steps: z.array(stepSchema).max(8),
  outlook: text(600),
});

export const proposalSchema = z.discriminatedUnion('kind', [
  tournamentProposalSchema,
  platformProposalSchema,
]);

export const proposalListSchema = z.array(proposalSchema);

export type ProposalStat = z.infer<typeof statSchema>;
export type ProposalPartner = z.infer<typeof partnerSchema>;
export type ProposalStep = z.infer<typeof stepSchema>;
export type TournamentTier = z.infer<typeof tournamentTierSchema>;
export type PlatformTier = z.infer<typeof platformTierSchema>;
export type TournamentProposal = z.infer<typeof tournamentProposalSchema>;
export type PlatformProposal = z.infer<typeof platformProposalSchema>;
export type Proposal = z.infer<typeof proposalSchema>;
export type ProposalKind = Proposal['kind'];
