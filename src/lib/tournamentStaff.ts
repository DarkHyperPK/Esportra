/**
 * Legacy tournament-scoped staff list API (dispute workspace).
 * Organization staff CRUD lives in organizationStaff.ts.
 * Authorization uses useTournamentAccess + GET /api/tournaments/{slug}/access.
 */

import { apiClient } from '@/lib/apiClient';
import type { StaffPermission } from '@/types/staff';

export type { StaffPermission };

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

export const fetchTournamentStaff = async (
  tournamentId: string,
): Promise<TournamentStaffRecord[]> =>
  apiClient.get<TournamentStaffRecord[]>(`/api/tournaments/${tournamentId}/staff`);
