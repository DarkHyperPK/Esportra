import { createContext } from 'react';

export type UserRole = 'casual' | 'organizer' | 'venue_owner' | 'admin';

export interface SwitchRoleOptions {
  /** Skip the "Role Switched" toast — for flows that already confirm success themselves. */
  quiet?: boolean;
}

export interface RoleContextType {
  currentRole: UserRole;
  isLoading: boolean;
  switchRole: (newRole: UserRole, reason?: string, options?: SwitchRoleOptions) => Promise<boolean>;
  resetToBaseRole: () => void;
  refreshRoleFromDatabase: () => Promise<void>;
  canCreateTeams: boolean;
  canCreateTournaments: boolean;
  canManageTournaments: boolean;
  canJoinTeams: boolean;
  canReportScores: boolean;
  canVerifyResults: boolean;
}

export const RoleContext = createContext<RoleContextType | undefined>(undefined);
