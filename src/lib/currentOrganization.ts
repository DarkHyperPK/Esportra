import { apiClient } from "@/lib/apiClient";
import { fetchMeRoles, getOrganizationId } from "@/lib/meRoles";

type OrganizationLookup = {
  id?: string | null;
};

type StaffOrganizationsResponse = {
  organizations?: Array<{ id?: string | null }> | { id?: string | null } | null;
};

function getErrorStatus(error: unknown): number | null {
  if (typeof error !== "object" || error === null) return null;

  const candidate = error as {
    status?: number;
    response?: { status?: number };
  };

  return candidate.status ?? candidate.response?.status ?? null;
}

function getStaffOrganizationId(data: StaffOrganizationsResponse | null | undefined): string | null {
  const organizations = data?.organizations;
  if (Array.isArray(organizations)) {
    return organizations[0]?.id ?? null;
  }

  if (organizations && typeof organizations === "object" && "id" in organizations) {
    return organizations.id ?? null;
  }

  return null;
}

export async function fetchCurrentOrganizationId(): Promise<string | null> {
  const roles = await fetchMeRoles().catch(() => null);
  const roleOrganizationId = getOrganizationId(roles);

  if (roleOrganizationId) {
    return roleOrganizationId;
  }

  const organization = await apiClient
    .get<OrganizationLookup>("/api/organizations/me")
    .catch((error) => {
      const status = getErrorStatus(error);
      if (status === 404 || status === 403) {
        return null;
      }

      throw error;
    });

  if (organization?.id) {
    return organization.id;
  }

  const staffData = await apiClient
    .get<StaffOrganizationsResponse>("/api/organizations/my-staff")
    .catch((error) => {
      const status = getErrorStatus(error);
      if (status === 404 || status === 403) {
        return null;
      }

      throw error;
    });

  return getStaffOrganizationId(staffData);
}
