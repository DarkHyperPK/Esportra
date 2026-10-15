import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiClient } from "@/lib/apiClient";
export interface ReceivedBroadcastInvite { id: string; showId: string; showTitle: string; role: string; expiresAt: string }
export function useBroadcastInvitations() {
  const { user } = useAuth();
  return useQuery({ queryKey: ["broadcast-invitations", user?.id], queryFn: () => apiClient.get<ReceivedBroadcastInvite[]>("/api/broadcast/crew/invitations"), enabled: !!user, refetchInterval: 15000 });
}
export function useAcceptBroadcastInvitation() {
  const query = useQueryClient();
  return useMutation({ mutationFn: (inviteId: string) => apiClient.post<{ showId: string; role: string }>(`/api/broadcast/crew/invitations/${inviteId}/accept`, {}), onSuccess: () => { void query.invalidateQueries({ queryKey: ["broadcast-invitations"] }); void query.invalidateQueries({ queryKey: ["broadcast-crew-assignments"] }); } });
}
