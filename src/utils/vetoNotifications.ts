import { apiClient } from '@/lib/apiClient';

const GUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidNotificationUserId(id: unknown): id is string {
    return typeof id === 'string' && GUID_RE.test(id);
}

/** Extract unique captain user IDs from /api/teams/members rows. */
export function extractCaptainUserIds(rows: unknown): string[] {
    if (!Array.isArray(rows)) return [];

    const ids = rows
        .map((row) => {
            const record = row as Record<string, unknown>;
            return String(record.user_id ?? record.userId ?? '');
        })
        .filter(isValidNotificationUserId);

    return [...new Set(ids)];
}

export async function fetchCaptainUserIdsForTeams(teamIds: string[]): Promise<string[]> {
    const cleaned = teamIds.filter(Boolean);
    if (cleaned.length === 0) return [];

    const rows = await apiClient
        .get<unknown>(`/api/teams/members?team_ids=${cleaned.join(',')}&roles=captain`)
        .catch(() => []);

    return extractCaptainUserIds(rows);
}

export interface VetoNotificationPayload {
    type: string;
    title: string;
    message: string;
    link: string;
    data: Record<string, unknown>;
}

export function sendVetoNotifications(userIds: string[], payload: VetoNotificationPayload): void {
    if (userIds.length === 0) return;

    for (const userId of userIds) {
        apiClient.post('/api/notifications', {
            userId,
            ...payload,
        }).catch(() => {});
    }
}
