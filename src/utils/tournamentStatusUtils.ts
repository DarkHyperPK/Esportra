/** Parse API start_date / startDate values for timeline comparisons. */
export function parseTournamentStartDate(value: unknown): Date | null {
    if (!value) return null;
    const parsed = new Date(String(value));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** True only after the scheduled start instant (date + time), not calendar day alone. */
export function hasTournamentStartTimePassed(
    startDate: unknown,
    now: Date = new Date(),
): boolean {
    const parsed = parseTournamentStartDate(startDate);
    if (!parsed) return false;
    return parsed.getTime() <= now.getTime();
}

/** Live badge / ongoing UI should follow explicit lifecycle status, not inferred dates. */
export function isExplicitlyOngoingStatus(status: unknown): boolean {
    return String(status ?? '').toLowerCase() === 'ongoing';
}
