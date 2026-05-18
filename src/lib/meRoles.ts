import { apiClient } from '@/lib/apiClient';

export interface MeRoleAssignment {
  role: string;
  is_active?: boolean;
  isActive?: boolean;
}

export interface MeVerifiedRole {
  id?: string;
  role: string;
  status?: string;
  is_active?: boolean;
  isActive?: boolean;
  verified_at?: string;
  verifiedAt?: string;
}

export interface MeVerificationRequest {
  id?: string;
  requested_role: 'organizer' | 'venue_owner' | string;
  status: 'pending' | 'approved' | 'rejected' | 'under_review' | string;
  business_name?: string | null;
  business_type?: string | null;
  created_at?: string;
  reviewed_at?: string | null;
  rejection_reason?: string | null;
  verification_notes?: string | null;
}

export interface MeRolesResponse {
  userRoles?: MeRoleAssignment[];
  verifiedRoles?: MeVerifiedRole[];
  verificationRequests?: MeVerificationRequest[];
  organization_id?: string | null;
  organizationId?: string | null;
  hasOrganization?: boolean;
  hasApprovedLicense?: boolean;
  canCreateTournament?: boolean;
  canCreateSeason?: boolean;
}

export const meRolesQueryKey = ['me-roles'] as const;

export const fetchMeRoles = () => apiClient.get<MeRolesResponse>('/api/me/roles');

export function getOrganizationId(roles: MeRolesResponse | null | undefined): string | null {
  return roles?.organization_id ?? roles?.organizationId ?? null;
}

export function deriveHasOrganization(roles: MeRolesResponse | null | undefined): boolean {
  return roles?.hasOrganization ?? Boolean(getOrganizationId(roles));
}

export function isApprovedVerifiedRole(role: MeVerifiedRole | null | undefined): boolean {
  if (!role) return false;
  const isActive = role.is_active ?? role.isActive ?? false;
  return isActive && String(role.status ?? '').toLowerCase() === 'approved';
}

export function deriveHasApprovedLicense(roles: MeRolesResponse | null | undefined): boolean {
  return roles?.hasApprovedLicense ?? Boolean(roles?.verifiedRoles?.some(isApprovedVerifiedRole));
}

export function deriveCanCreateTournament(roles: MeRolesResponse | null | undefined): boolean {
  return roles?.canCreateTournament ?? (deriveHasOrganization(roles) && deriveHasApprovedLicense(roles));
}

export function deriveCanCreateSeason(roles: MeRolesResponse | null | undefined): boolean {
  return roles?.canCreateSeason ?? deriveCanCreateTournament(roles);
}
