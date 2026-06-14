import { normalizeAuditDetails } from '@/utils/auditLogDetails';

export { normalizeAuditDetails };

export function auditDetailValue(
    details: Record<string, unknown>,
    ...keys: string[]
): string | null {
    for (const key of keys) {
        const val = details[key];
        if (val === null || val === undefined || val === '') continue;
        if (typeof val === 'string') return val;
        if (typeof val === 'number' || typeof val === 'boolean') return String(val);
    }
    return null;
}

export function auditActionLabel(
    action: string,
    options: { value: string; label: string }[],
): string {
    const normalized = action.toLowerCase();
    return (
        options.find((o) => o.value.toLowerCase() === normalized)?.label
        ?? action.replace(/\./g, ' · ')
    );
}

export function formatTournamentMatchAuditLine(
    details: Record<string, unknown>,
    verb: string,
): string {
    const tournament = auditDetailValue(details, 'tournament_name', 'TournamentName') ?? 'Tournament';
    const matchLabel = auditDetailValue(details, 'match_label', 'MatchLabel');
    const matchup = auditDetailValue(details, 'matchup', 'Matchup');
    const matchPart = matchLabel ?? matchup ?? 'Unknown match';
    const role = auditDetailValue(details, 'actor_role', 'ActorRole');
    const roleSuffix = role ? ` (${role})` : '';
    const partyCode = auditDetailValue(details, 'party_code', 'partyCode', 'PartyCode');

    const segments = [tournament, matchPart];
    if (matchup && matchLabel && matchup !== matchPart) {
        segments.push(matchup);
    }
    let line = verb;
    if (partyCode) {
        line = `${verb} · code ${partyCode}`;
    }
    segments.push(line);

    return `${segments.join(' · ')}${roleSuffix}`;
}

export function resolveOrganizationAuditLogLink(
    action: string,
    details: unknown,
): string | null {
    const d = normalizeAuditDetails(details);
    const normalized = action.toLowerCase();
    if (
        !normalized.startsWith('match.')
        && !normalized.startsWith('dispute.')
        && !normalized.startsWith('tournament.schedule')
    ) {
        return null;
    }

    const slug = auditDetailValue(d, 'tournament_slug', 'tournamentSlug', 'TournamentSlug');
    if (slug) {
        return `/organizer/tournament/${encodeURIComponent(slug)}/brackets`;
    }

    const tournamentId = auditDetailValue(d, 'tournament_id', 'tournamentId', 'TournamentId');
    if (tournamentId) {
        return `/organizer/tournament/${encodeURIComponent(tournamentId)}/brackets`;
    }

    return null;
}

export interface OrganizationAuditLogInput {
    action: string;
    details: unknown;
}

export function formatOrganizationAuditDetails(log: OrganizationAuditLogInput): string {
    const d = normalizeAuditDetails(log.details);
    const action = log.action.toLowerCase();
    const formatPerms = (perms: unknown) => {
        if (!Array.isArray(perms) || perms.length === 0) return 'default permissions';
        return perms.join(', ');
    };

    switch (action) {
        case 'staff.invite':
            return `Invited ${auditDetailValue(d, 'invitedEmail', 'InvitedEmail') || 'user'} as ${auditDetailValue(d, 'role', 'Role') || 'staff'} (${formatPerms(d.Permissions ?? d.permissions)})`;
        case 'staff.accept':
            return 'Accepted staff invitation';
        case 'staff.decline':
            return 'Declined staff invitation';
        case 'staff.remove':
            return `Removed ${auditDetailValue(d, 'removedEmail', 'RemovedEmail') || 'a staff member'}`;
        case 'staff.update_permissions':
            return `Updated role to ${auditDetailValue(d, 'role', 'Role') || 'unknown'} — ${formatPerms(d.Permissions ?? d.permissions)}`;
        case 'staff.update_assignment_permissions':
            return d.Permissions === null || d.permissions === null
                ? 'Reset tournament permissions to org defaults'
                : `Updated tournament permissions — ${formatPerms(d.Permissions ?? d.permissions)}`;
        case 'staff.assign_tournament': {
            const ids = d.tournamentIds ?? d.tournament_ids;
            return `Assigned to ${Array.isArray(ids) ? ids.length : 1} tournament(s)`;
        }
        case 'staff.unassign_tournament':
            return auditDetailValue(d, 'tournamentName', 'tournament_name')
                ? `Unassigned from ${auditDetailValue(d, 'tournamentName', 'tournament_name')}`
                : 'Unassigned from a tournament';
        case 'venue.add':
            return 'Added venue to organization';
        case 'venue.remove':
            return 'Removed venue from organization';
        case 'match.go_live':
            return formatTournamentMatchAuditLine(d, 'Went live');
        case 'match.score_update': {
            const t1 = auditDetailValue(d, 'team1_score', 'team1Score', 'Team1Score');
            const t2 = auditDetailValue(d, 'team2_score', 'team2Score', 'Team2Score');
            const scoreVerb =
                t1 !== null && t2 !== null ? `Score set to ${t1}–${t2}` : 'Score updated';
            return formatTournamentMatchAuditLine(d, scoreVerb);
        }
        case 'match.finalize':
            return formatTournamentMatchAuditLine(d, 'Finalized match');
        case 'match.walkover':
            return formatTournamentMatchAuditLine(d, 'Awarded walkover');
        case 'match.reset':
            return formatTournamentMatchAuditLine(d, 'Reset match');
        case 'match.swap_teams':
            return formatTournamentMatchAuditLine(d, 'Swapped teams');
        case 'match.schedule_update':
            return formatTournamentMatchAuditLine(d, 'Updated match schedule');
        case 'tournament.schedule_bulk':
            return `${auditDetailValue(d, 'tournament_name', 'tournamentName') || 'Tournament'} — bulk schedule (${auditDetailValue(d, 'matches_updated', 'matchesUpdated') ?? '0'} matches)`;
        case 'dispute.resolve':
            return formatTournamentMatchAuditLine(d, 'Resolved dispute');
        case 'dispute.reject':
            return formatTournamentMatchAuditLine(d, 'Rejected dispute');
        default:
            return JSON.stringify(d).slice(0, 120);
    }
}

export function isTournamentOpsAudit(action: string): boolean {
    const normalized = action.toLowerCase();
    return (
        normalized.startsWith('match.')
        || normalized.startsWith('dispute.')
        || normalized.startsWith('tournament.schedule')
    );
}

export function shouldShowOrganizationAuditDetailLine(log: OrganizationAuditLogInput): boolean {
    if (isTournamentOpsAudit(log.action)) return true;
    return Object.keys(normalizeAuditDetails(log.details)).length > 0;
}
