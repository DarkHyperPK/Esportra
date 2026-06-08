export type TournamentStatus = 'draft' | 'published' | 'open' | 'closed' | 'ongoing' | 'completed' | 'cancelled';
export type RegistrationStatus =
    | 'pending'
    | 'approved'
    | 'checked_in'
    | 'rejected'
    | 'cancelled'
    | 'disqualified'
    | 'eliminated'
    | 'waitlist'
    | 'winner';
export type RegistrationType = 'solo' | 'team';

export interface BaseTournament {
    id: string;
    name: string;
    game: string;
    date: string;
    time: string;
    venue: string | null;
    venue_id?: string | null;
    region?: string | null;
    is_online: boolean;
    is_public?: boolean;
    max_participants: number;
    reserved_invite_slots?: number;
    invite_expiry_days?: number;
    registration_type?: string;
    team_size: number;
    game_mode?: string | null;
    prize_pool: string;
    entry_fee: string | null;
    start_date?: string;
    end_date?: string; // Added to support timeline display
    description: string;
    user_id: string; // Keep for legacy
    rewards?: string | null;
    created_at: string;
    image_url?: string | null;
    slug?: string;
    check_in_required?: boolean;
    check_in_deadline?: string | null;
    auto_remove_unchecked?: boolean;
    settings?: any;
    rules?: string | null;
    payment_instructions?: string | null;
    organizer_name?: string;
    venue_city?: string | null;
    venue_country?: string | null;
    organizer?: {
        username: string;
        avatar_url?: string | null;
    };
    organization_id?: string | null;
    organization?: {
        slug: string;
        name: string;
        logo_url?: string | null;
        owner_id?: string;
    } | null;
}

export interface Tournament extends BaseTournament {
    current_participants: number;
    status: TournamentStatus;
    finished?: boolean;
    winner_team_name?: string | null;
}

export interface TeamMember {
    name: string;
    role?: string;
    email?: string;
}

export interface RegistrationDetails {
    id: string;
    tournament_id: string;
    user_id: string;
    riot_tag: string | null;
    steam_tag: string | null;
    gamer_tag: string | null;
    team_name: string | null;
    team_members: string | null; // Comma-separated string of member names
    team_logo: string | null;
    status: RegistrationStatus;
    checked_in_at?: string | null;
    registered_at: string;
    created_at: string;
    updated_at: string;
}

export interface TournamentRegistration extends RegistrationDetails {
    registration_type: RegistrationType;
    source?: 'open' | 'invite' | 'auto_qualified' | 'advancement' | string;
    profiles?: {
        username: string;
        full_name: string | null;
        avatar_url?: string | null;
    };
}

export interface TournamentParticipant {
    id: string;
    tournament_id: string;
    user_id: string;
    registration_type: RegistrationType;
    riot_tag: string | null;
    steam_tag: string | null;
    gamer_tag: string | null;
    team_name: string | null;
    team_members: string | null;
    status: RegistrationStatus;
    source?: 'open' | 'invite' | 'auto_qualified' | 'advancement' | string;
    registered_at: string;
    created_at: string;
    user: {
        username: string;
        full_name: string | null;
        avatar_url?: string | null;
    };
}

export type NewRegistration = Omit<RegistrationDetails, 'id' | 'created_at' | 'updated_at'>;
export type UpdateRegistration = Partial<NewRegistration>;

export interface RegistrationFormData {
    registrationType: RegistrationType;
    riot_tag?: string;
    steam_tag?: string;
    gamertag?: string;
    teamName?: string;
    teamMembers?: TeamMember[];
}

export interface RegistrationError {
    code: string;
    message: string;
    details?: unknown;
} 
