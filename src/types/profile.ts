export interface PublicProfileDto {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  avatar_seed: string | null;
  avatar_style: string | null;
  bio: string | null;
  location: string | null;
  social_links: {
    twitter?: string | null;
    twitch?: string | null;
    youtube?: string | null;
    instagram?: string | null;
    discord_handle?: string | null;
  } | null;
  country_code: string | null;
  card_image_url: string | null;
  banner_url: string | null;
  riot_tag: string | null;
  steam_tag: string | null;
  created_at: string;
}

export interface UserStatsDto {
  statistics: {
    tournaments_entered: number;
    tournaments_won: number;
    best_placement: number | null;
    total_prize_cents: number;
    games_played: number;
  } | null;
  achievements: AchievementDto[];
  placement_achievements: PlacementAchievementDto[];
  verified_role: string | null;
  achievements_count: number;
}

export interface PlacementAchievementDto {
  tournament_id: string;
  tournament_name: string;
  tournament_slug: string | null;
  game: string | null;
  start_date: string | null;
  placement: number;
  team_name: string | null;
  team_logo_url: string | null;
}

export interface AchievementDto {
  achievement_id: string;
  name: string;
  description: string | null;
  icon_url: string | null;
  points: number;
  earned_at: string;
}

export interface LinkedAccountsDto {
  riot: { game_name: string | null; tag_line: string | null; region: string | null } | null;
  steam: { steam_name: string | null; profile_url: string | null } | null;
  discord: { handle: string } | null;
}

export interface TournamentHistoryEntryDto {
  tournament_id: string;
  tournament_name: string;
  game: string | null;
  format: string | null;
  start_date: string | null;
  tournament_status: string | null;
  placement: number | null;
  prize_amount: number | null;
  is_team_tournament: boolean;
  team_name: string | null;
  team_logo_url: string | null;
}

export interface TeamMembershipDto {
  membership_id: string;
  team_id: string;
  role: string | null;
  joined_at: string | null;
  is_active: boolean;
  team_name: string | null;
  team_logo_url: string | null;
  team_game: string | null;
}

export interface MatchHistoryEntryDto {
  match_id: string;
  round_index: number | null;
  bracket_type: string | null;
  result: 'win' | 'loss' | 'draw';
  our_score: number | null;
  opp_score: number | null;
  opponent_name: string | null;
  opponent_logo_url: string | null;
  my_team_name?: string | null;
  my_team_logo_url?: string | null;
  tournament_id: string;
  tournament_slug: string | null;
  tournament_name: string;
  game: string | null;
  match_date: string | null;
  is_walkover: boolean;
}
