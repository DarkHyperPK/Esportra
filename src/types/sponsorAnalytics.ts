export type SponsorAnalyticsPeriod = 7 | 30 | 90;

export interface SponsorAudienceSegment {
  key: string;
  audience: number;
  percentageOfKnown: number;
}

export interface SponsorAudienceDimension {
  status: 'available' | 'unavailable' | 'suppressed';
  knownAudience: number | null;
  unknownAudience: number | null;
  coveragePercent: number | null;
  suppressedSegmentCount: number;
  segments: SponsorAudienceSegment[];
}

export interface SponsorAudienceReport {
  schemaVersion: 1;
  status: 'available' | 'empty' | 'suppressed';
  periodDays: SponsorAnalyticsPeriod;
  estimatedUniqueAudience: number | null;
  privacy: { minimumAudience: number; methodologyVersion: string };
  country: SponsorAudienceDimension;
  age: SponsorAudienceDimension;
}
