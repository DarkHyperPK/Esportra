import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
export interface CrewAssignment {
  id: string;
  title: string;
  status: string;
  role: string;
}
export interface CrewWorkspace {
  show: CrewAssignment;
  matches: { code: string }[];
  rundown: {
    id: string;
    title: string;
    type: string;
    durationSeconds: number | null;
    status: string;
  }[];
}
export function useBroadcastCrewAssignments() {
  return useQuery({
    queryKey: ["broadcast-crew-assignments"],
    queryFn: () => apiClient.get<CrewAssignment[]>("/api/broadcast/crew/shows"),
  });
}
export function useBroadcastCrewWorkspace(showId?: string) {
  return useQuery({
    queryKey: ["broadcast-crew-workspace", showId],
    enabled: !!showId,
    refetchInterval: 15000,
    queryFn: () =>
      apiClient.get<CrewWorkspace>(`/api/broadcast/crew/shows/${showId}`),
  });
}
