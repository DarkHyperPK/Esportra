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
  window: {
    startsOn: string;
    endsOnExclusive: string;
    generatedAt: string;
  };
  privacy: {
    minimumAudience: number;
    methodologyVersion: string;
  };
  estimatedUniqueAudience: number | null;
  country: SponsorAudienceDimension;
  age: SponsorAudienceDimension;
}
