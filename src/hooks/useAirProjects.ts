import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { apiClient } from "@/lib/apiClient";
import { airProjectInputSchema, airText } from "@/schemas/airSchema";
import { newAirDocument } from "@/services/airProject";
import type { AirProject, AirProjectSummary, AirSession } from "@/types/air";
export function useAirAccount() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["air", user?.id, "session"],
    queryFn: () => apiClient.post<AirSession>("/api/air/session", {}),
    enabled: !!user,
    staleTime: 60000,
  });
}
export function useAirProjects(workspaceId: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["air", user?.id, "projects", workspaceId],
    queryFn: () =>
      apiClient.get<AirProjectSummary[]>(
        `/api/air/workspaces/${z.string().uuid().parse(workspaceId)}/projects`,
      ),
    enabled: !!user && !!workspaceId,
  });
}
export function useAirProject(projectId: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["air", user?.id, "project", projectId],
    queryFn: () =>
      apiClient.get<AirProject>(
        `/api/air/projects/${z.string().uuid().parse(projectId)}`,
      ),
    enabled: !!user && !!projectId,
  });
}
export function useAirProjectActions(workspaceId: string) {
  const qc = useQueryClient(),
    { user } = useAuth();
  const refresh = () => qc.invalidateQueries({ queryKey: ["air", user?.id] });
  const create = useMutation({
    mutationFn: (title: string) =>
      apiClient.post<AirProject>(
        `/api/air/workspaces/${z.string().uuid().parse(workspaceId)}/projects`,
        airProjectInputSchema.parse({ title, document: newAirDocument() }),
      ),
    onSuccess: refresh,
  });
  const save = useMutation({
    mutationFn: (project: AirProject) =>
      apiClient.put<AirProject>(
        `/api/air/projects/${z.string().uuid().parse(project.id)}`,
        airProjectInputSchema.parse(project),
      ),
    onSuccess: refresh,
  });
  const archive = useMutation({
    mutationFn: (project: AirProject) =>
      apiClient.delete(
        `/api/air/projects/${z.string().uuid().parse(project.id)}?revision=${project.revision}`,
      ),
    onSuccess: refresh,
  });
  const workspace = useMutation({
    mutationFn: (name: string) =>
      apiClient.post("/api/air/workspaces", { name: airText(120).parse(name) }),
    onSuccess: refresh,
  });
  return { create, save, archive, workspace };
}
