import { supabase } from "@/lib/supabase";

export type StaffPermission =
  | "scores:update"
  | "teams:manage"
  | "bracket:edit"
  | "announcements:send"
  | "disputes:assist";

export interface TournamentStaffRecord {
  id: string;
  tournament_id: string;
  user_id: string;
  role: string;
  permissions: StaffPermission[];
  status: string;
  assigned_by: string;
  created_at: string;
  updated_at: string;
  accepted_at?: string | null;
  responded_at?: string | null;
  profiles?: {
    full_name: string | null;
    username: string | null;
    email: string | null;
    avatar_url?: string | null;
  };
}

export interface TournamentStaffInvite extends TournamentStaffRecord {
  tournament?: {
    id: string;
    name: string;
    slug?: string | null;
    game: string;
    start_date: string | null;
    organizer_id?: string;
  };
  organizer_profile?: {
    full_name: string | null;
    username: string | null;
    email: string | null;
  };
}

export const fetchTournamentStaff = async (
  tournamentId: string
): Promise<TournamentStaffRecord[]> => {
  const { data, error } = await supabase
    .from("tournament_staff")
    .select(
      `
        *,
        profiles:profiles!tournament_staff_user_id_fkey(
          full_name,
          username,
          email,
          avatar_url
        )
      `
    )
    .eq("tournament_id", tournamentId)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }
  return (data || []) as TournamentStaffRecord[];
};

export const inviteTournamentStaff = async ({
  tournamentId,
  userEmail,
  role,
  permissions,
  assignedBy,
}: {
  tournamentId: string;
  userEmail: string;
  role: string;
  permissions: StaffPermission[];
  assignedBy: string;
}) => {
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, email")
    .ilike("email", userEmail)
    .maybeSingle();

  if (profileError) throw profileError;
  if (!profile) throw new Error("User not found");
  const { data: existing } = await supabase
    .from("tournament_staff")
    .select("id")
    .eq("tournament_id", tournamentId)
    .eq("user_id", profile.id)
    .maybeSingle();

  const payload = {
    tournament_id: tournamentId,
    user_id: profile.id,
    role,
    permissions,
    assigned_by: assignedBy,
    status: "pending",
    accepted_at: null,
    responded_at: null,
  };

  if (existing?.id) {
    const { error } = await supabase
      .from("tournament_staff")
      .update(payload)
      .eq("id", existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("tournament_staff").insert(payload);
    if (error) throw error;
  }
};

export const updateTournamentStaff = async ({
  staffId,
  role,
  permissions,
}: {
  staffId: string;
  role: string;
  permissions: StaffPermission[];
}) => {
  const { error } = await supabase
    .from("tournament_staff")
    .update({
      role,
      permissions,
      updated_at: new Date().toISOString(),
    })
    .eq("id", staffId);
  if (error) throw error;
};

export const removeTournamentStaff = async (staffId: string) => {
  const { error } = await supabase
    .from("tournament_staff")
    .delete()
    .eq("id", staffId);
  if (error) throw error;
};

export const fetchPendingStaffInvites = async (
  userId: string
): Promise<TournamentStaffInvite[]> => {
  const { data, error } = await supabase
    .from("tournament_staff")
    .select(
      `
      *,
      tournament:tournament_id (
        id,
        name,
        game,
        start_date
      ),
      organizer_profile:profiles!tournament_staff_assigned_by_fkey (
        full_name,
        username,
        email
      )
    `
    )
    .eq("user_id", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []) as TournamentStaffInvite[];
};

export const fetchUserStaffAssignments = async (
  userId: string
): Promise<TournamentStaffInvite[]> => {
  const { data, error } = await supabase
    .from("tournament_staff")
    .select(
      `
      *,
      tournament:tournament_id(
        id,
        name,
        slug,
        game,
        start_date,
        organizer_id
      ),
      organizer_profile:profiles!tournament_staff_assigned_by_fkey(
        full_name,
        username,
        email
      )
    `
    )
    .eq("user_id", userId)
    .eq("status", "active")
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data || []) as TournamentStaffInvite[];
};

export const respondToStaffInvite = async ({
  inviteId,
  accept,
}: {
  inviteId: string;
  accept: boolean;
}) => {
  const now = new Date().toISOString();
  const updateData = {
    status: accept ? "active" : "revoked",
    accepted_at: accept ? now : null,
    responded_at: now,
  };
  const { error } = await supabase
    .from("tournament_staff")
    .update(updateData)
    .eq("id", inviteId)
    .eq("status", "pending");
  if (error) throw error;
};

