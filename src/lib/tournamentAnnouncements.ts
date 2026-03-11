import { apiClient } from "@/lib/apiClient";
import { logAuditEvent } from "@/lib/organizationStaff";

export interface TournamentAnnouncement {
    id: string;
    tournament_id: string;
    sender_id: string;
    title: string;
    content: string;
    created_at: string;
    updated_at: string;
    sender?: {
        username: string;
        full_name: string | null;
        avatar_url: string | null;
    };
}

/** Fetch all announcements for a tournament, most recent first */
export const fetchAnnouncements = async (tournamentId: string): Promise<TournamentAnnouncement[]> => {
    const data = await apiClient.get<any[]>(
        `/api/tournaments/${tournamentId}/announcements`
    );

    return (data || []).map((d: any) => ({
        ...d,
        sender: Array.isArray(d.sender) ? d.sender[0] : d.sender,
    })) as TournamentAnnouncement[];
};

/** Create a new tournament announcement and notify all participants */
export const createAnnouncement = async ({
    tournamentId,
    senderId,
    title,
    content,
}: {
    tournamentId: string;
    senderId: string;
    title: string;
    content: string;
}): Promise<TournamentAnnouncement> => {
    // The server handles inserting, fetching tournament info, notifying participants
    const announcement = await apiClient.post<TournamentAnnouncement>(
        `/api/tournaments/${tournamentId}/announcements`,
        { sender_id: senderId, title, content }
    );

    // Audit logging (still client-side since it uses org context)
    try {
        const tournament = await apiClient.get<{ name: string; organization_id: string | null }>(
            `/api/tournaments/${tournamentId}`
        );
        if (tournament?.organization_id) {
            await logAuditEvent({
                organizationId: tournament.organization_id,
                actorId: senderId,
                action: 'announcement.send',
                targetType: 'tournament',
                targetId: tournamentId,
                details: { title }
            });
        }
    } catch (err) {
        console.error("Failed to log audit event:", err);
    }

    return announcement;
};

/** Delete an announcement (sender or admin only — enforced by RLS) */
export const deleteAnnouncement = async (id: string, tournamentId: string): Promise<void> => {
    await apiClient.delete(`/api/tournaments/${tournamentId}/announcements/${id}`);
};
