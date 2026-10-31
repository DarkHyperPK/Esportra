import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { competitiveApiClient as apiClient } from '@/hooks/competitive/competitiveApiClient';
import { apiClient as rawApiClient } from '@/lib/apiClient';
import type {
  ScrimListing,
  ScrimOffer,
  ScrimSession,
  ScrimSlot,
  ScrimDispute,
  AdminScrimDisputeRow,
  ScrimDisputeOutcome,
  PracticeSession,
  PracticeAttendance,
  ScrimHistoryPage,
  ScrimHistoryPrivacy,
  ScrimScreenshotParseResult,
  ScrimRecentMatch,
} from '@/types/competitive';
import { ApiError } from '@/lib/apiClient';

// --- Query keys ---

export const scrimKeys = {
  teamListings: (teamId: string) => ['scrims', 'listings', teamId] as const,
  discover: (game: string) => ['scrims', 'discover', game] as const,
  listingOffers: (listingId: string) => ['scrims', 'listing-offers', listingId] as const,
  myOffers: (teamId: string) => ['scrims', 'offers-mine', teamId] as const,
  teamSessions: (teamId: string) => ['scrims', 'sessions', teamId] as const,
  session: (id: string) => ['scrims', 'session', id] as const,
  // PROJ-078
  slots: (listingId: string) => ['scrims', 'slots', listingId] as const,
  sessionDispute: (sessionId: string) => ['scrims', 'dispute', sessionId] as const,
  adminDisputes: (status: string, page: number) => ['admin', 'scrims', 'disputes', status, page] as const,
};

export const practiceKeys = {
  teamSessions: (teamId: string) => ['practice', 'sessions', teamId] as const,
  session: (id: string) => ['practice', 'session', id] as const,
  attendance: (sessionId: string) => ['practice', 'attendance', sessionId] as const,
};

// --- Local request interfaces ---

interface CreateScrimListingReq {
  teamId: string;
  gameSlug?: string;
  modeKey?: string;
  regionKey?: string;
  minRankKey?: string;
  maxRankKey?: string;
  preferredDays?: number[];
  preferredTimeStart?: string;
  preferredTimeEnd?: string;
  timezone?: string;
  notes?: string;
  // T9 — recurring schedule fields
  scheduleType?: 'one_off' | 'recurring';
  scheduleUntil?: string;
  slotDurationMinutes?: number;
}

interface MakeOfferReq {
  offeringTeamId: string;
  proposedAt?: string;
  proposedDurationMinutes?: number;
  notes?: string;
  slotId?: string;
}

interface ReportResultReq {
  reportingTeamId: string;
  team1Score: number;
  team2Score: number;
  notes?: string;
  screenshotUrls?: string[];
}

interface OpenDisputeReq {
  raisedByTeamId: string;
  reason: string;
}

interface CreatePracticeReq {
  teamId: string;
  title: string;
  gameSlug?: string;
  scheduledAt?: string;
  durationMinutes?: number;
  notes?: string;
}

// --- Scrim listing queries ---

export function useScrimListings(teamId: string) {
  return useQuery({
    queryKey: scrimKeys.teamListings(teamId),
    queryFn: () => apiClient.get<ScrimListing[]>(`/api/scrims/listings?team_id=${teamId}`),
    enabled: !!teamId,
    staleTime: 30_000,
  });
}

export function useDiscoverScrims(game: string) {
  return useQuery({
    queryKey: scrimKeys.discover(game),
    queryFn: () => apiClient.get<ScrimListing[]>(`/api/scrims/discover?game=${game}`),
    enabled: !!game,
    staleTime: 30_000,
  });
}

export function useListingOffers(listingId: string) {
  return useQuery({
    queryKey: scrimKeys.listingOffers(listingId),
    queryFn: () => apiClient.get<ScrimOffer[]>(`/api/scrims/listings/${listingId}/offers`),
    enabled: !!listingId,
    staleTime: 30_000,
  });
}

export function useMyOffers(teamId: string) {
  return useQuery({
    queryKey: scrimKeys.myOffers(teamId),
    queryFn: () => apiClient.get<ScrimOffer[]>(`/api/scrims/offers/mine?team_id=${teamId}`),
    enabled: !!teamId,
    staleTime: 30_000,
  });
}

export function useTeamScrimSessions(teamId: string) {
  return useQuery({
    queryKey: scrimKeys.teamSessions(teamId),
    queryFn: () => apiClient.get<ScrimSession[]>(`/api/scrims/sessions?team_id=${teamId}`),
    enabled: !!teamId,
    staleTime: 30_000,
  });
}

export function useScrimSession(id: string) {
  return useQuery({
    queryKey: scrimKeys.session(id),
    queryFn: () => apiClient.get<ScrimSession>(`/api/scrims/sessions/${id}`),
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function useSessionResults(sessionId: string) {
  return useQuery({
    queryKey: ['scrims', 'results', sessionId],
    queryFn: () => apiClient.get<unknown>(`/api/scrims/sessions/${sessionId}/results`),
    enabled: !!sessionId,
    staleTime: 30_000,
  });
}

// --- Scrim listing mutations ---

export function useCreateScrimListing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: CreateScrimListingReq) =>
      apiClient.post<ScrimListing>('/api/scrims/listings', {
        team_id: req.teamId,
        game_slug: req.gameSlug,
        mode_key: req.modeKey,
        region_key: req.regionKey,
        min_rank_key: req.minRankKey,
        max_rank_key: req.maxRankKey,
        preferred_days: req.preferredDays,
        preferred_time_start: req.preferredTimeStart,
        preferred_time_end: req.preferredTimeEnd,
        timezone: req.timezone,
        notes: req.notes,
        schedule_type: req.scheduleType,
        schedule_until: req.scheduleUntil,
        slot_duration_minutes: req.slotDurationMinutes,
      }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: scrimKeys.teamListings(variables.teamId) });
    },
  });
}

export function useUpdateScrimListing(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: Partial<CreateScrimListingReq>) =>
      apiClient.put<ScrimListing>(`/api/scrims/listings/${id}`, {
        game_slug: req.gameSlug,
        mode_key: req.modeKey,
        region_key: req.regionKey,
        notes: req.notes,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['scrims', 'listings'] });
    },
  });
}

export function usePauseListing(listingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.post<ScrimListing>(`/api/scrims/listings/${listingId}/pause`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['scrims', 'listings'] });
    },
  });
}

export function useReopenListing(listingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.post<ScrimListing>(`/api/scrims/listings/${listingId}/reopen`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['scrims', 'listings'] });
    },
  });
}

export function useCloseListing(listingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.post<ScrimListing>(`/api/scrims/listings/${listingId}/close`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['scrims', 'listings'] });
    },
  });
}

// --- Scrim offer mutations ---

export function useMakeOffer(listingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: MakeOfferReq) =>
      apiClient.post<ScrimOffer>(`/api/scrims/listings/${listingId}/offer`, {
        offering_team_id: req.offeringTeamId,
        proposed_at: req.proposedAt,
        proposed_duration_minutes: req.proposedDurationMinutes,
        notes: req.notes,
        slot_id: req.slotId,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: scrimKeys.listingOffers(listingId) });
      qc.invalidateQueries({ queryKey: ['scrims', 'offers-mine'] });
    },
  });
}

export function useAcceptOffer(offerId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.post<ScrimSession>(`/api/scrims/offers/${offerId}/accept`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['scrims', 'listing-offers'] });
      qc.invalidateQueries({ queryKey: ['scrims', 'offers-mine'] });
      qc.invalidateQueries({ queryKey: ['scrims', 'sessions'] });
    },
  });
}

export function useDeclineOffer(offerId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.post<ScrimOffer>(`/api/scrims/offers/${offerId}/decline`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['scrims', 'listing-offers'] });
      qc.invalidateQueries({ queryKey: ['scrims', 'offers-mine'] });
    },
  });
}

export function useWithdrawOffer(offerId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.post<ScrimOffer>(`/api/scrims/offers/${offerId}/withdraw`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['scrims', 'listing-offers'] });
      qc.invalidateQueries({ queryKey: ['scrims', 'offers-mine'] });
    },
  });
}

// --- Scrim session mutations ---

export function useStartScrimSession(sessionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.post<ScrimSession>(`/api/scrims/sessions/${sessionId}/start`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['scrims', 'sessions'] });
      qc.invalidateQueries({ queryKey: scrimKeys.session(sessionId) });
    },
  });
}

export function useCompleteScrimSession(sessionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.post<ScrimSession>(`/api/scrims/sessions/${sessionId}/complete`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['scrims', 'sessions'] });
      qc.invalidateQueries({ queryKey: scrimKeys.session(sessionId) });
    },
  });
}

export function useCancelScrimSession(sessionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.post<ScrimSession>(`/api/scrims/sessions/${sessionId}/cancel`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['scrims', 'sessions'] });
    },
  });
}

export function useReportScrimResult(sessionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: ReportResultReq) =>
      apiClient.post<unknown>(`/api/scrims/sessions/${sessionId}/report-result`, {
        reporting_team_id: req.reportingTeamId,
        team1_score: req.team1Score,
        team2_score: req.team2Score,
        notes: req.notes,
        screenshot_urls: req.screenshotUrls,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: scrimKeys.session(sessionId) });
      qc.invalidateQueries({ queryKey: ['scrims', 'sessions'] });
    },
  });
}

export function useOpenDispute(sessionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: OpenDisputeReq) =>
      apiClient.post<unknown>(`/api/scrims/sessions/${sessionId}/dispute`, {
        raised_by_team_id: req.raisedByTeamId,
        reason: req.reason,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: scrimKeys.session(sessionId) });
      qc.invalidateQueries({ queryKey: ['scrims', 'sessions'] });
    },
  });
}

// --- Practice queries ---

export function usePracticeSessions(teamId: string) {
  return useQuery({
    queryKey: practiceKeys.teamSessions(teamId),
    queryFn: () => apiClient.get<PracticeSession[]>(`/api/practice/sessions?team_id=${teamId}`),
    enabled: !!teamId,
    staleTime: 30_000,
  });
}

export function usePracticeSession(id: string) {
  return useQuery({
    queryKey: practiceKeys.session(id),
    queryFn: () => apiClient.get<PracticeSession>(`/api/practice/sessions/${id}`),
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function usePracticeAttendance(sessionId: string) {
  return useQuery({
    queryKey: practiceKeys.attendance(sessionId),
    queryFn: () =>
      apiClient.get<PracticeAttendance[]>(`/api/practice/sessions/${sessionId}/attendance`),
    enabled: !!sessionId,
    staleTime: 30_000,
  });
}

// --- Practice mutations ---

export function useCreatePractice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: CreatePracticeReq) =>
      apiClient.post<PracticeSession>('/api/practice/sessions', {
        team_id: req.teamId,
        title: req.title,
        game_slug: req.gameSlug,
        scheduled_at: req.scheduledAt,
        duration_minutes: req.durationMinutes,
        notes: req.notes,
      }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: practiceKeys.teamSessions(variables.teamId) });
    },
  });
}

export function useUpdatePractice(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: Partial<CreatePracticeReq>) =>
      apiClient.put<PracticeSession>(`/api/practice/sessions/${id}`, {
        title: req.title,
        game_slug: req.gameSlug,
        scheduled_at: req.scheduledAt,
        duration_minutes: req.durationMinutes,
        notes: req.notes,
      }),
    onSuccess: (updated) => {
      qc.setQueryData(practiceKeys.session(id), updated);
      qc.invalidateQueries({ queryKey: ['practice', 'sessions'] });
    },
  });
}

export function useCompletePractice(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.post<PracticeSession>(`/api/practice/sessions/${id}/complete`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['practice', 'sessions'] });
      qc.invalidateQueries({ queryKey: practiceKeys.session(id) });
    },
  });
}

export function useCancelPractice(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.post<PracticeSession>(`/api/practice/sessions/${id}/cancel`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['practice', 'sessions'] });
    },
  });
}

export function useUpsertAttendance(sessionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (entries: Array<{ userId: string; status: string }>) =>
      apiClient.put<PracticeAttendance[]>(`/api/practice/sessions/${sessionId}/attendance`, {
        entries: entries.map((e) => ({ user_id: e.userId, status: e.status })),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: practiceKeys.attendance(sessionId) });
    },
  });
}

export function useUpdateOwnAttendance(attendanceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (status: 'confirmed' | 'excused') =>
      apiClient.put<PracticeAttendance>(`/api/practice/attendance/${attendanceId}`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['practice', 'attendance'] });
    },
  });
}

// ── PROJ-078 — Check-in, slots, disputes ─────────────────────────────────────

/**
 * useScrimCheckin — wraps the check-in mutation with 409 (window not open)
 * detection. Returns `isWindowNotOpen: boolean` alongside standard mutation state.
 */
export function useScrimCheckin(sessionId: string) {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: () =>
      apiClient.post<ScrimSession>(`/api/scrims/sessions/${sessionId}/checkin`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: scrimKeys.session(sessionId) });
      qc.invalidateQueries({ queryKey: ['scrims', 'sessions'] });
    },
  });

  const isWindowNotOpen =
    mutation.isError && mutation.error instanceof ApiError && mutation.error.status === 409;

  return { ...mutation, isWindowNotOpen };
}

/** Fetch available/booked slots for a recurring listing. */
export function useScrimSlots(listingId: string, enabled = true) {
  return useQuery({
    queryKey: scrimKeys.slots(listingId),
    queryFn: () => apiClient.get<ScrimSlot[]>(`/api/scrims/listings/${listingId}/slots`),
    enabled: enabled && !!listingId,
    staleTime: 30_000,
  });
}

interface BookSlotReq {
  offeringTeamId: string;
  slotId: string;
  proposedAt: string;
  proposedDurationMinutes?: number;
}

/** Create an offer tied to a specific slot on a recurring listing. */
export function useBookScrimSlot(listingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: BookSlotReq) =>
      apiClient.post<ScrimOffer>(`/api/scrims/listings/${listingId}/offer`, {
        offeringTeamId: req.offeringTeamId,
        proposedAt: req.proposedAt,
        proposedDurationMinutes: req.proposedDurationMinutes,
        slotId: req.slotId,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: scrimKeys.slots(listingId) });
      qc.invalidateQueries({ queryKey: ['scrims', 'offers-mine'] });
    },
  });
}

/** Submit responder evidence for an open dispute. */
export function useSubmitDisputeEvidence(sessionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (evidenceUrls: string[]) =>
      apiClient.post<ScrimDispute>(
        `/api/scrims/sessions/${sessionId}/dispute/evidence`,
        { evidenceUrls },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: scrimKeys.session(sessionId) });
    },
  });
}

interface AdminDisputeListResponse {
  items: AdminScrimDisputeRow[];
  total: number;
  page: number;
  pageSize: number;
}

/** Paginated admin list of scrim disputes. */
export function useAdminScrimDisputes(status: string, page: number, enabled: boolean) {
  return useQuery({
    queryKey: scrimKeys.adminDisputes(status, page),
    queryFn: () =>
      rawApiClient.get<AdminDisputeListResponse>(
        `/api/admin/scrims/disputes?status=${encodeURIComponent(status)}&page=${page}&pageSize=20`,
      ),
    enabled,
    staleTime: 30_000,
  });
}

interface ResolveDisputeReq {
  outcome: ScrimDisputeOutcome;
  resolutionNotes?: string;
}

/** Resolve a scrim dispute (staff only). */
export function useResolveScrimDispute(disputeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: ResolveDisputeReq) =>
      rawApiClient.post<unknown>(`/api/admin/scrims/disputes/${disputeId}/resolve`, {
        outcome: req.outcome,
        resolution_notes: req.resolutionNotes,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'scrims', 'disputes'] });
    },
  });
}

// --- T9/T11 session action hooks ---

export function useUpdateSessionLobby(sessionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: { lobbyCode?: string; serverInfo?: string }) =>
      apiClient.patch<ScrimSession>(`/api/scrims/sessions/${sessionId}/lobby`, req),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['scrims', 'sessions'] });
      qc.invalidateQueries({ queryKey: scrimKeys.session(sessionId) });
    },
  });
}

export function useCheckInSession(sessionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.post<ScrimSession>(`/api/scrims/sessions/${sessionId}/checkin`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['scrims', 'sessions'] });
      qc.invalidateQueries({ queryKey: scrimKeys.session(sessionId) });
    },
  });
}

export function useConfirmScrimResult(sessionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiClient.post<ScrimSession>(`/api/scrims/sessions/${sessionId}/confirm-result`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['scrims', 'sessions'] });
      qc.invalidateQueries({ queryKey: scrimKeys.session(sessionId) });
    },
  });
}

// ── Scrim history ─────────────────────────────────────────────────────────────

export const scrimHistoryKeys = {
  page: (teamId: string, page: number, pageSize: number) =>
    ['scrims', 'history', teamId, page, pageSize] as const,
  privacy: (teamId: string) => ['scrims', 'history-privacy', teamId] as const,
  recentMatches: (sessionId: string) => ['scrims', 'recent-matches', sessionId] as const,
};

export function useScrimHistory(teamId: string, page: number, pageSize: number) {
  return useQuery({
    queryKey: scrimHistoryKeys.page(teamId, page, pageSize),
    queryFn: () =>
      apiClient.get<ScrimHistoryPage>(
        `/api/scrims/teams/${teamId}/history?page=${page}&pageSize=${pageSize}`,
      ),
    enabled: !!teamId,
    staleTime: 30_000,
    retry: false,
  });
}

export function useScrimHistoryPrivacy(teamId: string, enabled = true) {
  return useQuery({
    queryKey: scrimHistoryKeys.privacy(teamId),
    queryFn: () =>
      apiClient.get<ScrimHistoryPrivacy>(`/api/scrims/teams/${teamId}/history/privacy`),
    enabled: enabled && !!teamId,
    staleTime: 60_000,
  });
}

export function useUpdateScrimHistoryPrivacy(teamId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (isPublic: boolean) =>
      apiClient.patch<ScrimHistoryPrivacy>(`/api/scrims/teams/${teamId}/history/privacy`, { isPublic }),
    onSuccess: (updated) => {
      qc.setQueryData(scrimHistoryKeys.privacy(teamId), updated);
    },
  });
}

/** Recent Riot matches for the session's game. Triggered manually via refetch(). */
export function useScrimRecentMatches(sessionId: string) {
  return useQuery({
    queryKey: scrimHistoryKeys.recentMatches(sessionId),
    queryFn: () =>
      apiClient.get<ScrimRecentMatch[]>(`/api/scrims/sessions/${sessionId}/recent-matches`),
    enabled: false,
    staleTime: 0,
    gcTime: 0,
    retry: false,
  });
}

/** Parse a scoreboard screenshot for a scrim session. Returns score + confidence. */
export function useScrimParseScreenshot(sessionId: string) {
  return useMutation({
    mutationFn: async (file: File): Promise<ScrimScreenshotParseResult> => {
      const form = new FormData();
      form.append('file', file);
      return rawApiClient.upload<ScrimScreenshotParseResult>(
        `/api/scrims/sessions/${sessionId}/reports/parse-screenshot`,
        form,
      );
    },
  });
}
