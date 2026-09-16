/**
 * useTournamentDashboard — Domain 4: Tournament Detail + Organizer View
 *
 * Migrated from Supabase sequential queries to .NET API single consolidated call.
 * Old: 4-6 sequential queries (tournament, participants, stages, org-staff, tournament-staff, ID fallback).
 * New: GET /api/tournaments/{slugOrId} — backend handles all lookups + permissions in one call.
 *
 * Public types are backward-compatible with all existing callers (StageManagementTab, etc.).
 */

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/lib/apiClient';
import { getInviteExpiryDaysFromTournament, getReservedInviteSlotsFromTournament } from '@/utils/tournamentInviteUtils';

export interface DashboardTournament {
    id: string;
    name: string;
    description: string;
    slug: string;
    game: string;
    max_teams: number;
    reserved_invite_slots?: number;
    invite_expiry_days?: number;
    registration_type?: string | null;
    min_teams: number;
    entry_fee: string;
    prize_pool: string;
    start_date: string;
    end_date: string;
    registration_deadline: string;
    status: string;
    organizer_id: string;
    venue_id: string | null;
    is_public: boolean;
    banner_url: string | null;
    logo_url: string | null;
    created_at: string;
    updated_at: string;
    check_in_required: boolean;
    check_in_deadline: string | null;
    auto_remove_unchecked: boolean;
    team_size: number;
    game_mode?: string | null;
    currency?: string;
    winner_team_name?: string | null;
    format: 'single_elimination' | 'double_elimination' | 'swiss' | 'round_robin';
    // Legacy/Computed fields
    date?: string;
    time?: string;
    venue?: string;
    is_online?: boolean;
    current_participants?: number;
    registration_open?: boolean;
    max_participants?: number;
    settings?: any;
}

export interface DashboardParticipant {
    id: string;
    user_id: string;
    tournament_id: string;
    status: 'registered' | 'checked_in' | 'withdrawn' | 'pending' | 'approved' | 'rejected' | 'cancelled';
    participant_type: 'solo' | 'team';
    team_name: string | null;
    team_logo: string | null;
    team_members: string | null;
    gamer_tag: string | null;
    registered_at: string;
    created_at: string;
    checked_in_at: string | null;
    source?: string | null;
    is_mock: boolean;
    payment_status?: 'pending' | 'approved' | 'rejected' | 'not_required' | null;
    payment_receipt_url?: string | null;
    payment_rejection_reason?: string | null;
    entry_fee_paid?: boolean | null;
    entry_fee_amount?: number | null;
    currency?: string | null;
    user?: {
        username: string;
        avatar_url: string | null;
        full_name: string | null;
    };
    teams?: {
        logo_url: string | null;
    };
}

export interface DashboardStage {
    id: string;
    tournament_id: string;
    name: string;
    format: string;
    stage_order: number;
    status: 'draft' | 'published' | 'ongoing' | 'completed';
    config: any;
    capacity: number;
    advancement_count: number;
    best_of: number;
    bo_mode: 'per_stage' | 'per_round';
    round_bo_overrides: Record<string, number> | null;
    is_locked: boolean;
    progress_label?: string | null;
    starts_at: string | null;
    ends_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface TournamentDashboardData {
    tournament: DashboardTournament;
    participants: DashboardParticipant[];
    stages: DashboardStage[];
    isOrganizer: boolean;
    staffPermissions: string[];
    staffRole: string | null;
    mockCount: number;
}

export function useTournamentDashboard(slug: string | undefined) {
    const { user } = useAuth();

    return useQuery<TournamentDashboardData>({
        queryKey: ['tournament-dashboard', slug, user?.id],
        queryFn: async (): Promise<TournamentDashboardData> => {
            if (!slug) throw new Error('Slug is required');

            const identifier = slug.trim();
            if (!identifier || identifier === 'undefined' || identifier === 'null')
                throw new Error('Invalid tournament identifier');

            const result = await apiClient.get<{
                tournament: any;
                participants: any[];
                stages: any[];
                isOrganizer: boolean;
                staffPermissions: string[] | null;
                staffRole?: string | null;
                mockCount?: number;
            }>(`/api/tournaments/${encodeURIComponent(identifier)}`);

            const t = result.tournament;

            const parsedSettings = typeof t.settings === 'string' ? (() => { try { return JSON.parse(t.settings); } catch { return t.settings; } })() : (t.settings || {});
            const mappedTournament: DashboardTournament = {
                ...t,
                settings:    parsedSettings,
                entry_fee:   t.entry_fee?.toString()  ?? '0',
                prize_pool:  t.prize_pool?.toString()  ?? '0',
                // Legacy computed fields
                date:                  t.start_date ? new Date(t.start_date).toLocaleDateString() : '',
                time:                  t.start_date ? new Date(t.start_date).toLocaleTimeString() : '',
                venue:                 t.venue_id ? `Venue ${t.venue_id}` : 'Online',
                is_online:             !t.venue_id,
                max_participants:      t.max_teams ?? 0,
                reserved_invite_slots: getReservedInviteSlotsFromTournament({ ...t, settings: parsedSettings }),
                invite_expiry_days:    getInviteExpiryDaysFromTournament({ ...t, settings: parsedSettings }),
                registration_type:     t.registration_type ?? t.registrationType ?? parsedSettings?.registrationType ?? null,
                registration_open:     t.status === 'open',
                current_participants:  t.current_participants ?? result.participants.length,
            };

            const mappedParticipants: DashboardParticipant[] = result.participants.map((p: any) => ({
                id:               p.id,
                user_id:          p.user_id,
                tournament_id:    p.tournament_id,
                status:           p.status,
                participant_type: p.participant_type,
                team_name:        p.team_name ?? null,
                team_logo:        p.team_logo ?? null,
                team_members:     p.team_members ?? null,
                gamer_tag:        p.gamer_tag ?? null,
                registered_at:    p.registration_date ?? p.created_at,
                created_at:       p.created_at,
                checked_in_at:    p.checked_in_at ?? null,
                source:           p.source ?? p.registration_source ?? null,
                is_mock:                  p.is_mock === true || p.is_mock === 'true',
                payment_status:           p.payment_status ?? null,
                payment_receipt_url:      p.payment_receipt_url ?? null,
                payment_rejection_reason: p.payment_rejection_reason ?? null,
                entry_fee_paid:           p.entry_fee_paid ?? null,
                user:             p.username ? { username: p.username, avatar_url: null, full_name: null } : undefined,
                teams:            p.team_logo ? { logo_url: p.team_logo } : undefined,
            }));

            const mappedStages: DashboardStage[] = result.stages.map((s: any) => {
                // Parse round_bo_overrides - may be JSON string from database
                let roundBoOverrides = s.round_bo_overrides;
                if (typeof roundBoOverrides === 'string') {
                    try { roundBoOverrides = JSON.parse(roundBoOverrides); } catch { roundBoOverrides = null; }
                }
                return {
                    ...s,
                    config: typeof s.config === 'string' ? (() => { try { return JSON.parse(s.config); } catch { return s.config; } })() : (s.config || null),
                    capacity:            s.capacity ?? 0,
                    advancement_count:   s.advancement_count ?? 0,
                    best_of:             s.best_of ?? 1,
                    bo_mode:             s.bo_mode ?? 'per_stage',
                    round_bo_overrides:  roundBoOverrides ?? null,
                    is_locked:           !!s.is_locked,
                };
            });

            return {
                tournament:       mappedTournament,
                participants:     mappedParticipants,
                stages:           mappedStages,
                isOrganizer:      result.isOrganizer,
                staffPermissions: result.staffPermissions ?? [],
                staffRole:        result.staffRole ?? null,
                mockCount:        result.mockCount ?? 0,
            };
        },
        enabled:              !!slug,
        staleTime:            1000 * 60 * 5,
        refetchOnWindowFocus: false,
        refetchOnReconnect:   false,
    });
}
