import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { apiClient } from "@/lib/apiClient";
import {
  airGrantSchema,
  airPlanSchema,
  airReleaseSchema,
  airText,
} from "@/schemas/airSchema";
import type {
  AirAdminList,
  AirAdminSection,
  AirGrantInput,
  AirOverview,
  AirPlanInput,
  AirReleaseInput,
} from "@/types/air";
export function useAirOverview() {
  return useQuery({
    queryKey: ["air-admin", "overview"],
    queryFn: () => apiClient.get<AirOverview>("/api/admin/air/"),
    refetchInterval: 30000,
  });
}
export function useAirAdminList(section: AirAdminSection, page = 1) {
  return useQuery({
    queryKey: ["air-admin", section, page],
    queryFn: () =>
      apiClient.get<AirAdminList>(`/api/admin/air/${section}?page=${page}`),
  });
}
type AirAdminAction =
  | { kind: "plan"; id?: string; input: AirPlanInput }
  | { kind: "grant"; id: string; input: AirGrantInput }
  | { kind: "revoke"; id: string; reason: string }
  | { kind: "release"; id?: string; input: AirReleaseInput };
export function useAirAdminActions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (action: AirAdminAction) => {
      const id = action.id ? z.string().uuid().parse(action.id) : null;
      if (action.kind === "grant")
        return apiClient.put(
          `/api/admin/air/customers/${id}/access`,
          airGrantSchema.parse(action.input),
        );
      if (action.kind === "revoke")
        return apiClient.post(`/api/admin/air/devices/${id}/revoke`, {
          reason: airText(500).parse(action.reason),
        });
      const path = `/api/admin/air/${action.kind === "plan" ? "plans" : "releases"}`,
        input =
          action.kind === "plan"
            ? airPlanSchema.parse(action.input)
            : airReleaseSchema.parse(action.input);
      return id
        ? apiClient.put(`${path}/${id}`, input)
        : apiClient.post(path, input);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["air-admin"] }),
  });
}
