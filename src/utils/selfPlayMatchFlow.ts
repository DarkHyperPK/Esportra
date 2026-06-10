export type SelfPlayMatchPhase =
    | 'needs_schedule'
    | 'awaiting_checkin'
    | 'awaiting_party_code'
    | 'awaiting_veto'
    | 'ready_for_match'
    | 'completed';

type SelfPlayFlowInput = {
    status?: string | null;
    effectiveScheduledTime?: string | null;
    bothCheckedIn: boolean;
    partyCode?: string | null;
    isVetoEnabled: boolean;
    isVetoCompleted: boolean;
};

export function getSelfPlayMatchPhase(input: SelfPlayFlowInput): SelfPlayMatchPhase {
    const status = (input.status ?? 'pending').toLowerCase();

    if (status === 'completed') return 'completed';

    if (!input.effectiveScheduledTime) return 'needs_schedule';

    if (status === 'pending') {
        if (!input.bothCheckedIn) return 'awaiting_checkin';
        return 'awaiting_party_code';
    }

    if (status === 'in_progress') {
        if (input.isVetoEnabled && !input.isVetoCompleted) return 'awaiting_veto';
        return 'ready_for_match';
    }

    return 'awaiting_checkin';
}

export function isSelfPlayMatchLive(status?: string | null): boolean {
    return (status ?? '').toLowerCase() === 'in_progress';
}

export function getSelfPlayFlowMessage(
    phase: SelfPlayMatchPhase,
    options?: { isVetoEnabled?: boolean; isTeam1Captain?: boolean },
): string {
    const vetoEnabled = options?.isVetoEnabled ?? false;

    switch (phase) {
        case 'needs_schedule':
            return 'Propose and agree on a match time with your opponent to continue.';
        case 'awaiting_checkin':
            return 'Both teams must check in during the check-in window before the lobby code step.';
        case 'awaiting_party_code':
            return options?.isTeam1Captain
                ? 'Both teams are checked in. Team 1 captain: create the lobby and submit the party code.'
                : 'Both teams are checked in. Waiting for Team 1 to submit the party code.';
        case 'awaiting_veto':
            return vetoEnabled
                ? 'Match is live. Complete map veto to unlock result reporting.'
                : 'Match is live. You can now report results.';
        case 'ready_for_match':
            return 'Match is live. Map veto is complete — report results when ready.';
        case 'completed':
            return 'This match is complete.';
        default:
            return '';
    }
}
