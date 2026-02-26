import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';

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
    // Legacy/Computed fields for compatibility
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
    status: 'registered' | 'checked_in' | 'withdrawn' | 'pending';
    participant_type: 'solo' | 'team';
    team_name: string | null;
    team_logo: string | null;
    team_members: string | null;
    gamer_tag: string | null;
    registered_at: string;
    created_at: string;
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
    // Extended fields for StageManagementTab compatibility
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

    return useQuery({
        queryKey: ['tournament-dashboard', slug, user?.id],
        queryFn: async (): Promise<TournamentDashboardData> => {
            if (!slug) throw new Error('Slug is required');

            // 1. Fetch Tournament
            const identifier = (slug || '').trim();
            console.log('[useTournamentDashboard] Fetching tournament for identifier:', identifier);

            // Sanity check: if slug is literal string "undefined", treat as missing
            if (!identifier || identifier === 'undefined' || identifier === 'null') {
                console.warn('[useTournamentDashboard] Invalid tournament identifier:', identifier);
                throw new Error('Invalid tournament identifier');
            }

            // Attempt by slug first (case-sensitive exact match)
            let { data: tournament, error: tError } = await supabase
                .from('tournaments')
                .select('*')
                .eq('slug', identifier)
                .is('deleted_at', null)
                .maybeSingle();

            // If slug lookup failed or returned nothing, try by slug case-insensitive (ilike)
            if (!tournament && !tError) {
                const { data: ilikeTournament, error: ilikeError } = await supabase
                    .from('tournaments')
                    .select('*')
                    .ilike('slug', identifier)
                    .is('deleted_at', null)
                    .maybeSingle();

                if (ilikeTournament) {
                    tournament = ilikeTournament;
                } else if (ilikeError) {
                    // Log but continue to ID fallback
                    console.log('[useTournamentDashboard] ilike slug lookup error:', ilikeError.message);
                }
            }

            // Fallback to ID-based lookup if slug failed
            if (!tournament) {
                // Only try ID lookup if the slug looks like a UUID to avoid Postgres syntax errors
                const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
                if (isUuid) {
                    console.log('[useTournamentDashboard] Identifier looks like UUID, trying ID lookup...');
                    const { data: byId, error: idError } = await supabase
                        .from('tournaments')
                        .select('*')
                        .eq('id', identifier)
                        .is('deleted_at', null)
                        .maybeSingle();

                    if (byId) {
                        tournament = byId;
                        tError = null;
                    } else if (idError) {
                        console.error('[useTournamentDashboard] ID lookup error:', idError.message || idError);
                        tError = idError;
                    }
                }
            }

            if (tError) {
                console.error('[useTournamentDashboard] Final fetch error:', tError);
                throw tError;
            }

            if (!tournament) {
                console.warn('[useTournamentDashboard] Tournament not found for identifier:', slug);
                throw new Error('Tournament not found');
            }

            // 1.5 Map Legacy Fields
            const mappedTournament = {
                ...tournament,
                status: tournament.status, // Preserve 'draft' status for organizer dashboard
                date: tournament.start_date ? new Date(tournament.start_date).toLocaleDateString() : '',
                time: tournament.start_date ? new Date(tournament.start_date).toLocaleTimeString() : '',
                venue: tournament.venue_id ? `Venue ${tournament.venue_id}` : 'Online',
                is_online: !tournament.venue_id,
                max_participants: tournament.max_teams || 0,
                registration_open: tournament.status === 'open'
            };

            // 2. Fetch Participants with User Profiles
            const { data: participants, error: pError } = await supabase
                .from('tournament_participants')
                .select(`
          *,
          user:profiles!user_id (
            username,
            avatar_url,
            full_name,
            riot_tag,
            steam_tag
          ),
          teams:team_id (
            name,
            logo_url
          )
        `)
                .eq('tournament_id', tournament.id)
                .order('created_at', { ascending: false });

            if (pError) throw pError;

            // Map database fields to dashboard interface
            const mappedParticipants = (participants || []).map(p => ({
                id: p.id,
                user_id: p.user_id,
                tournament_id: p.tournament_id,
                status: p.status,
                participant_type: p.participant_type,
                team_name: (p.teams as any)?.name || p.team_name, // Prioritize official team name
                team_logo: p.team_logo_url || (p.teams as any)?.logo_url, // Map team_logo_url, fallback to teams.logo_url
                team_members: Array.isArray(p.team_members)
                    ? p.team_members.join(', ')
                    : typeof p.team_members === 'string'
                        ? p.team_members
                        : '',
                gamer_tag: p.gamer_tag,
                registered_at: p.registration_date || p.created_at, // Map to registered_at
                created_at: p.created_at,
                user: p.user,
                checked_in_at: p.checked_in_at
            }));

            // 2.5 Update current_participants count
            mappedTournament.current_participants = mappedParticipants.length;

            // 3. Fetch Stages
            const { data: stages, error: sError } = await supabase
                .from('tournament_stages')
                .select('*')
                .eq('tournament_id', tournament.id)
                .order('stage_order', { ascending: true });

            if (sError) throw sError;

            const mappedStages = (stages || []).map(s => ({
                ...s,
                stage_order: s.stage_order,
                capacity: s.capacity || 0,
                advancement_count: s.advancement_count || 0,
                is_locked: !!s.is_locked
            }));

            // 4. Check Permissions
            let isOrganizer = false;
            let staffPermissions: string[] = [];

            if (user) {
                isOrganizer = tournament.organizer_id === user.id;

                if (!isOrganizer) {
                    // Check organization-level staff (enterprise system)
                    if (tournament.organization_id) {
                        const { data: orgStaffRecord, error: orgStaffError } = await supabase
                            .from('organization_staff')
                            .select('id, role, permissions')
                            .eq('organization_id', tournament.organization_id)
                            .eq('user_id', user.id)
                            .eq('status', 'active')
                            .maybeSingle();

                        if (orgStaffError) {
                            console.error('[useTournamentDashboard] Org staff check error:', orgStaffError);
                        } else if (orgStaffRecord) {
                            // Admins get access to ALL tournaments in their org
                            if (orgStaffRecord.role === 'admin') {
                                staffPermissions = orgStaffRecord.permissions;
                            } else {
                                // Non-admins need a specific tournament assignment
                                const { data: assignment } = await supabase
                                    .from('staff_tournament_assignments')
                                    .select('id')
                                    .eq('organization_staff_id', orgStaffRecord.id)
                                    .eq('tournament_id', tournament.id)
                                    .maybeSingle();

                                if (assignment) {
                                    staffPermissions = orgStaffRecord.permissions;
                                }
                            }
                        }
                    }

                    // Fallback to legacy tournament_staff if no org staff found
                    if (staffPermissions.length === 0) {
                        const { data: staffRecord, error: staffError } = await supabase
                            .from('tournament_staff')
                            .select('permissions')
                            .eq('tournament_id', tournament.id)
                            .eq('user_id', user.id)
                            .eq('status', 'active')
                            .maybeSingle();

                        if (staffError) {
                            console.error('[useTournamentDashboard] Staff check error:', staffError);
                        } else if (staffRecord) {
                            staffPermissions = staffRecord.permissions;
                        }
                    }
                }
            } else {
                console.log('[useTournamentDashboard] No user found, skipping permission checks');
            }

            return {
                tournament: mappedTournament as DashboardTournament,
                participants: mappedParticipants as DashboardParticipant[],
                stages: mappedStages as DashboardStage[],
                isOrganizer,
                staffPermissions
            };
        },
        enabled: !!slug,
        staleTime: 1000 * 60 * 5, // 5 minutes
        refetchOnWindowFocus: false, // Disable automatic background refetches for organizer dashboard
        refetchOnReconnect: false,   // Disable automatic reconnection refetches for organizer dashboard
    });
}
