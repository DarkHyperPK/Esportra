export type PublicVetoGameFilter = 'all' | 'valorant' | 'cs2' | 'r6s';
export type PublicVetoSession = {
  id: string;
  game: string;
  bestOf: number;
  team1Name: string | null;
  team2Name: string | null;
  status: string;
  createdAt: string | null;
  expiresAt: string | null;
  completedAt: string | null;
  overlayAccessedAt: string | null;
};
export type PublicVetoUsageSummary = { totalSessions: number; completedSessions: number; overlaySessions: number };
export type PublicVetoSessionsResponse = {
  sessions: PublicVetoSession[];
  page: number;
  pageSize: 50;
  total: number;
  summary: PublicVetoUsageSummary;
};
