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
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/apiClient';
import { formatDate, formatTime } from '@/utils/dateFormat';

export interface DashboardTournament {
    id: string;
    name: string;
    description: string;
    slug: string;
    game: string;
    max_teams: number;
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
    format: 'single_elimination' | 'double_elimination' | 'swiss' | 'round_robin';
    // Legacy/Computed fields
    date?: string;
    time?: string;
    venue?: string;
    is_online?: boolean;
    current_participants?: number;
    registration_open?: boolean;
    max_participants?: number;
}

export interface DashboardParticipant {
    id: string;
    user_id: string;
    tournament_id: string;
    status: 'approved' | 'checked_in' | 'withdrawn' | 'pending';
    participant_type: 'solo' | 'team';
    team_name: string | null;
    team_logo: string | null;
    team_members: string | null;
    gamer_tag: string | null;
    registered_at: string;
    created_at: string;
    payment_status?: string | null;
    payment_receipt_url?: string | null;
    payment_rejection_reason?: string | null;
    entry_fee_amount?: number | null;
    entry_fee_paid?: boolean;
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
    is_locked: boolean;
    created_at: string;
    updated_at: string;
}

export interface TournamentDashboardData {
    tournament: DashboardTournament;
    participants: DashboardParticipant[];
    stages: DashboardStage[];
    isOrganizer: boolean;
    staffPermissions: string[];
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
            }>(`/api/tournaments/${encodeURIComponent(identifier)}`);

            const t = result.tournament;

            const mappedTournament: DashboardTournament = {
                ...t,
                settings:    typeof t.settings === 'string' ? (() => { try { return JSON.parse(t.settings); } catch { return t.settings; } })() : (t.settings || {}),
                entry_fee:   t.entry_fee?.toString()  ?? '0',
                prize_pool:  t.prize_pool?.toString()  ?? '0',
                // Legacy computed fields
                date:                  t.start_date ? formatDate(t.start_date) : '',
                time:                  t.start_date ? formatTime(t.start_date) : '',
                venue:                 t.venue_id ? `Venue ${t.venue_id}` : 'Online',
                is_online:             !t.venue_id,
                max_participants:      t.max_teams ?? 0,
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
                payment_status:           p.payment_status ?? null,
                payment_receipt_url:      p.payment_receipt_url ?? null,
                payment_rejection_reason: p.payment_rejection_reason ?? null,
                entry_fee_amount:         p.entry_fee_amount ?? null,
                entry_fee_paid:           p.entry_fee_paid ?? false,
                user:             p.username ? { username: p.username, avatar_url: null, full_name: null } : undefined,
                teams:            p.team_logo ? { logo_url: p.team_logo } : undefined,
            }));

            const mappedStages: DashboardStage[] = result.stages.map((s: any) => ({
                ...s,
                config: typeof s.config === 'string' ? (() => { try { return JSON.parse(s.config); } catch { return s.config; } })() : (s.config || null),
                capacity:          s.capacity ?? 0,
                advancement_count: s.advancement_count ?? 0,
                is_locked:         !!s.is_locked,
            }));

            return {
                tournament:       mappedTournament,
                participants:     mappedParticipants,
                stages:           mappedStages,
                isOrganizer:      result.isOrganizer,
                staffPermissions: result.staffPermissions ?? [],
            };
        },
        enabled:              !!slug,
        staleTime:            1000 * 60 * 5,
        refetchOnWindowFocus: false,
        refetchOnReconnect:   false,
    });
}
