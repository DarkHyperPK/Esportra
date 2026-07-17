export type SponsorAnalyticsPeriod = 7 | 30 | 90;

export interface SponsorAudienceSegment {
  key: string;
  audience: number;
  percentageOfKnown: number;
}

export interface SponsorAudienceDimension {
  status: 'available' | 'unavailable';
  knownAudience: number;
  unknownAudience: number;
  coveragePercent: number | null;
  segments: SponsorAudienceSegment[];
}

export interface SponsorAudienceReport {
  schemaVersion: 2;
  status: 'available' | 'empty';
  periodDays: SponsorAnalyticsPeriod;
  window: {
    startsOn: string;
    endsOnExclusive: string;
    generatedAt: string;
  };
  disclosure: {
    methodologyVersion: string;
    smallSegmentsSuppressed: false;
  };
  estimatedUniqueAudience: number;
  country: SponsorAudienceDimension;
  age: SponsorAudienceDimension;
}
