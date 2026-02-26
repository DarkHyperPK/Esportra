import { supabase } from "@/lib/supabase";
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
    const { data, error } = await supabase
        .from("tournament_announcements")
        .select(`
            id, tournament_id, sender_id, title, content, created_at, updated_at,
            sender:sender_id(username, full_name, avatar_url)
        `)
        .eq("tournament_id", tournamentId)
        .order("created_at", { ascending: false });

    if (error) throw error;

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
    // 1. Insert announcement
    const { data: announcement, error } = await supabase
        .from("tournament_announcements")
        .insert({
            tournament_id: tournamentId,
            sender_id: senderId,
            title,
            content,
        })
        .select("id, tournament_id, sender_id, title, content, created_at, updated_at")
        .single();

    if (error) throw error;

    // 2. Get tournament name and org ID for notification message and audit
    const { data: tournament } = await supabase
        .from("tournaments")
        .select("name, organization_id")
        .eq("id", tournamentId)
        .single();

    const tournamentName = tournament?.name || "a tournament";

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

    // 3. Get all participants of this tournament (both solo and teams)
    const { data: participants } = await supabase
        .from("tournament_participants")
        .select("user_id, team_id")
        .eq("tournament_id", tournamentId);

    const userIdsToNotify = new Set<string>();

    if (participants) {
        // Collect solo participant user IDs
        for (const p of participants) {
            if (p.user_id) userIdsToNotify.add(p.user_id);
        }

        // Collect team member user IDs
        const teamIds = participants.map((p) => p.team_id).filter(Boolean);
        if (teamIds.length > 0) {
            const { data: teamMembers } = await supabase
                .from("team_members")
                .select("user_id")
                .in("team_id", teamIds);

            if (teamMembers) {
                for (const tm of teamMembers) {
                    if (tm.user_id) userIdsToNotify.add(tm.user_id);
                }
            }
        }
    }

    // Remove the sender from the notification list
    userIdsToNotify.delete(senderId);

    if (userIdsToNotify.size > 0) {
        // 4. Create notification for each participant
        const notifications = Array.from(userIdsToNotify).map((userId) => ({
            user_id: userId,
            type: "tournament_announcement",
            title: `📢 ${title}`,
            message: `New announcement for ${tournamentName}: ${content.substring(0, 100)}${content.length > 100 ? "..." : ""}`,
            data: {
                link: `/tournaments/${tournamentId}`,
                announcement_id: announcement.id,
                tournament_id: tournamentId,
            },
        }));

        const { error: notifError } = await supabase
            .from("notifications")
            .insert(notifications);

        if (notifError) {
            console.error("Failed to send announcement notifications:", notifError);
        }
    }

    return announcement as TournamentAnnouncement;
};

/** Delete an announcement (sender or admin only — enforced by RLS) */
export const deleteAnnouncement = async (id: string): Promise<void> => {
    const { error } = await supabase
        .from("tournament_announcements")
        .delete()
        .eq("id", id);

    if (error) throw error;
};
