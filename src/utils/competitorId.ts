/** Strip bracket prefixes and normalize for ID comparison across match/team sources. */
export const normalizeCompetitorId = (value?: string | null): string =>
    value?.replace(/^(db-|wb-|lb-)/i, '').toLowerCase() ?? '';

export const competitorIdsMatch = (
    a?: string | null,
    b?: string | null,
): boolean => normalizeCompetitorId(a) === normalizeCompetitorId(b);
