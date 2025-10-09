export type TournamentStatus = 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
export type RegistrationStatus = 'registered' | 'checked_in' | 'eliminated' | 'winner';
export type RegistrationType = 'solo' | 'team';

export interface BaseTournament {
  id: string;
  name: string;
  game: string;
  date: string;
  time: string;
  venue: string | null;
  is_online: boolean;
  max_participants: number;
  team_size: number;
  prize_pool: string;
  entry_fee: string | null;
  description: string;
  user_id: string;
  created_at: string;
  image_url?: string | null;
}

export interface Tournament extends BaseTournament {
  current_participants: number;
  status: TournamentStatus;
  finished?: boolean;
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
  gamer_tag: string | null;
  team_name: string | null;
  team_members: string | null; // Comma-separated string of member names
  status: RegistrationStatus;
  registered_at: string;
  created_at: string;
  updated_at: string;
}

export interface TournamentRegistration extends RegistrationDetails {
  registration_type: RegistrationType;
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
  gamer_tag: string | null;
  team_name: string | null;
  team_members: string | null;
  status: RegistrationStatus;
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
  gamertag?: string;
  teamName?: string;
  teamMembers?: TeamMember[];
}

export interface RegistrationError {
  code: string;
  message: string;
  details?: unknown;
} 