import { apiClient } from "@/lib/apiClient";

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
  return apiClient.get<TournamentStaffRecord[]>(
    `/api/tournaments/${tournamentId}/staff`
  );
};

export const inviteTournamentStaff = async ({
  tournamentId,
  userEmail,
  role,
  permissions,
}: {
  tournamentId: string;
  userEmail: string;
  role: string;
  permissions: StaffPermission[];
  assignedBy: string;
}) => {
  return apiClient.post(`/api/tournaments/${tournamentId}/staff`, {
    userEmail,
    role,
    permissions,
  });
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
  return apiClient.put(`/api/tournaments/staff/${staffId}`, {
    role,
    permissions,
  });
};

export const removeTournamentStaff = async (staffId: string) => {
  return apiClient.delete(`/api/tournaments/staff/${staffId}`);
};

export const fetchPendingStaffInvites = async (
  _userId: string
): Promise<TournamentStaffInvite[]> => {
  return apiClient.get<TournamentStaffInvite[]>(
    `/api/tournaments/staff/my-invites`
  );
};

export const fetchUserStaffAssignments = async (
  _userId: string
): Promise<TournamentStaffInvite[]> => {
  return apiClient.get<TournamentStaffInvite[]>(
    `/api/tournaments/staff/my-assignments`
  );
};

export const respondToStaffInvite = async ({
  inviteId,
  accept,
}: {
  inviteId: string;
  accept: boolean;
}) => {
  return apiClient.post(`/api/tournaments/staff/${inviteId}/respond`, {
    accept,
  });
};
