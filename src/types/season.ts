export type SeasonStatus = 'draft' | 'published' | 'live' | 'completed' | 'archived';
export type TournamentRole = 'qualifier' | 'event' | 'finals' | 'custom';
export type QualificationStatus = 'qualified' | 'eliminated' | 'pending';
export type SeedMode = 'random' | 'manual' | 'top_seeded';

export interface Season {
  id: string;
  name: string;
  slug: string;
  game: string;
  description: string | null;
  banner_url: string | null;
  logo_url: string | null;
  start_date: string | null;
  end_date: string | null;
  status: SeasonStatus;
  organizer_id: string;
  organization_id: string | null;
  version: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  tournament_count: number;
  point_rules_count: number;
  advancement_rules_count: number;
  participant_count: number;
}

export interface SeasonList {
  id: string;
  name: string;
  slug: string;
  game: string;
  status: SeasonStatus;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  tournament_count: number;
  participant_count: number;
}

export interface SeasonStanding {
  id: string;
  season_id: string;
  team_id: string;
  team_name: string | null;
  team_logo_url: string | null;
  total_points: number;
  qualification_status: QualificationStatus | null;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface PointRule {
  id: string;
  season_id: string;
  tournament_id: string | null;
  placement_start: number;
  placement_end: number;
  points: number;
  qualification_status: QualificationStatus | null;
  destination_tournament_id: string | null;
  version: number;
  created_at: string;
}

export interface AdvancementRule {
  id: string;
  season_id: string;
  source_tournament_id: string;
  target_tournament_id: string | null;
  placement_start: number;
  placement_end: number;
  advancement_count: number;
  seed_mode: SeedMode | null;
  version: number;
  created_at: string;
}

export interface CreateSeasonRequest {
  name: string;
  game: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  banner_url?: string;
  logo_url?: string;
  organization_id?: string;
}

export interface UpdateSeasonRequest {
  name: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  banner_url?: string;
  logo_url?: string;
  version: number;
}

export interface CreatePointRuleRequest {
  tournament_id?: string;
  placement_start: number;
  placement_end: number;
  points: number;
  qualification_status?: QualificationStatus;
  destination_tournament_id?: string;
}

export interface UpdatePointRuleRequest {
  placement_start: number;
  placement_end: number;
  points: number;
  qualification_status?: QualificationStatus;
  destination_tournament_id?: string;
  version: number;
}

export interface CreateAdvancementRuleRequest {
  source_tournament_id: string;
  target_tournament_id?: string;
  placement_start: number;
  placement_end: number;
  advancement_count: number;
  seed_mode?: SeedMode;
}

export interface UpdateAdvancementRuleRequest {
  source_tournament_id: string;
  target_tournament_id?: string;
  placement_start: number;
  placement_end: number;
  advancement_count: number;
  seed_mode?: SeedMode;
  version: number;
}

export interface SeasonWizardData {
  name: string;
  game: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  banner_url?: string;
  logo_url?: string;
  organization_id?: string;
  tournaments?: SeasonTournament[];
  point_rules?: CreatePointRuleRequest[];
  advancement_rules?: CreateAdvancementRuleRequest[];
}

export interface SeasonTournament {
  tournament_id: string;
  season_role: TournamentRole;
  season_stage_order: number;
}

export interface SeasonTournamentDetails {
  id: string;
  name: string;
  slug: string;
  game: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  season_role: TournamentRole | null;
  season_stage_order: number | null;
  current_participants: number;
}

export interface SeasonParticipant {
  id: string;
  season_id: string;
  team_id: string;
  team_name: string;
  team_logo_url: string | null;
  team_slug: string | null;
  status: 'pending' | 'approved' | 'rejected';
  registered_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PointRuleTemplate {
  name: string;
  rules: CreatePointRuleRequest[];
}
