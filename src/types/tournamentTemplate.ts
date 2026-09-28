/** TypeScript mirror of TournamentTemplateResponse from the .NET backend. */
export interface TournamentTemplateDto {
  id: string;
  gameCatalogId: string;
  slug: string;
  rulesText: string;
  rulesSourceUrl: string | null;
  rulesUpdatedAt: string;
  defaultBestOf: number;
  defaultMaxTeams: number;
  /** e.g. [8, 16, 32] — quick-select chip values */
  recommendedTeamCounts: number[];
  isPublisherEndorsed: boolean;
  isActive: boolean;
  rulesStale: boolean;
  sortOrder: number;
  createdAt: string;
  gameName: string;
  gameSlug: string;
  /** "bracket" | "battle_royale" */
  gameType: string;
  defaultModeKey: string;
  bannerUrl: string | null;
  logoUrl: string | null;
  iconUrl: string | null;
}
