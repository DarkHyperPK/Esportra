export interface BRGroup {
  id: string;
  name: string;
  group_order: number;
  lobby_size: number;
  created_at: string;
  team_count: number;
}

export interface BRGroupTeam {
  team_id: string;
  seed_order: number;
  assigned_at: string;
  team_name: string;
  logo_url: string | null;
}

export type BRDistributionMethod = 'random' | 'snake';
