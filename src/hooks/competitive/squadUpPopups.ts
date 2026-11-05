/**
 * squadUpPopups.ts
 *
 * App-wide Squad Up popups. A match can arrive two ways (the swiper's own response, and the push
 * notification both players receive), so both feed one state in the query cache and a match id is
 * only ever shown once. The cache is just a shared, reactive holder: nothing here is fetched.
 */

import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { squadUpKeys } from './queryKeys';
import type { SquadUpMatch } from '@/schemas/squadUp';

export interface MatchPopup {
  matchId: string;
  conversationId: string | null;
  title: string;
  message: string;
  sessionEnded: boolean;
  /** Full match details when known; otherwise the host loads them from the matches list. */
  details: SquadUpMatch | null;
}

export interface LikePopup { count: number }

export interface SquadUpPopupState {
  match: MatchPopup | null;
  like: LikePopup | null;
  shownMatchIds: string[];
}

const EMPTY: SquadUpPopupState = { match: null, like: null, shownMatchIds: [] };
const MAX_REMEMBERED = 50;

function read(qc: QueryClient): SquadUpPopupState {
  return qc.getQueryData<SquadUpPopupState>(squadUpKeys.popup()) ?? EMPTY;
}

export function announceSquadUpMatch(qc: QueryClient, popup: MatchPopup): void {
  const state = read(qc);
  const open = state.match?.matchId === popup.matchId;
  if (!open && state.shownMatchIds.includes(popup.matchId)) return;
  qc.setQueryData<SquadUpPopupState>(squadUpKeys.popup(), {
    ...state,
    match: open ? { ...popup, details: popup.details ?? state.match?.details ?? null, sessionEnded: popup.sessionEnded || state.match!.sessionEnded } : popup,
    shownMatchIds: open ? state.shownMatchIds : [...state.shownMatchIds, popup.matchId].slice(-MAX_REMEMBERED),
  });
}

/** A `lfg_swipe_match` notification row/push; ids live in `data` (snake_case, as persisted). */
export function announceSquadUpMatchFromNotification(
  qc: QueryClient,
  n: { title: string; message: string; data?: Record<string, unknown> },
): void {
  const matchId = typeof n.data?.match_id === 'string' ? n.data.match_id : null;
  if (!matchId) return;
  announceSquadUpMatch(qc, {
    matchId,
    conversationId: typeof n.data?.conversation_id === 'string' ? n.data.conversation_id : null,
    title: n.title,
    message: n.message,
    sessionEnded: n.data?.session_ended === true,
    details: null,
  });
}

export function announceSquadUpLike(qc: QueryClient, count: number): void {
  qc.setQueryData<SquadUpPopupState>(squadUpKeys.popup(), { ...read(qc), like: { count } });
}

export function dismissSquadUpMatch(qc: QueryClient): void {
  qc.setQueryData<SquadUpPopupState>(squadUpKeys.popup(), { ...read(qc), match: null });
}

export function dismissSquadUpLike(qc: QueryClient): void {
  qc.setQueryData<SquadUpPopupState>(squadUpKeys.popup(), { ...read(qc), like: null });
}

export function useSquadUpPopupState(): SquadUpPopupState {
  const qc = useQueryClient();
  const { data } = useQuery<SquadUpPopupState>({
    queryKey: squadUpKeys.popup(),
    queryFn: () => read(qc),
    initialData: EMPTY,
    staleTime: Infinity,
    gcTime: Infinity,
  });
  return data;
}
