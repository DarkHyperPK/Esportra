import { BracketMatch, BracketTeam } from "@/types/bracketTypes";

type AnyRecord = Record<string, any>;

const pick = <T,>(obj: AnyRecord | null | undefined, ...keys: string[]): T | undefined => {
  if (!obj) return undefined;
  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null) return obj[key] as T;
  }
  return undefined;
};

const asNumber = (value: unknown, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

export type PublicToolTeam = {
  id: string;
  name: string;
  seed: number;
};

export type PublicBracketPayload = {
  title: string;
  format: string;
  bestOf: number;
  bracketSize: number;
  teams: PublicToolTeam[];
  graph: AnyRecord;
};

export type PublicBracketResponse = {
  id: string;
  title: string;
  format: string;
  bestOf: number;
  status: string;
  visibility: string;
  shareToken?: string | null;
  createdAt?: string;
  updatedAt?: string;
  payload: PublicBracketPayload;
};

const resolveToolBracketPayloadSource = (raw: AnyRecord): AnyRecord => {
  const nested = pick<AnyRecord>(raw, "payload", "Payload");
  if (nested) return nested;

  const graphJson = pick<string>(raw, "graph_json", "graphJson");
  if (graphJson) {
    try {
      return typeof graphJson === "string" ? JSON.parse(graphJson) : graphJson;
    } catch {
      return raw;
    }
  }

  return raw;
};

export const normalizeToolBracketResponse = (raw: AnyRecord): PublicBracketResponse => ({
  id: String(pick(raw, "id") ?? ""),
  title: String(pick(raw, "title") ?? pick(raw, "payload", "Payload")?.title ?? "Untitled bracket"),
  format: String(pick(raw, "format") ?? ""),
  bestOf: asNumber(pick(raw, "bestOf", "best_of"), 1),
  status: String(pick(raw, "status") ?? "active"),
  visibility: String(pick(raw, "visibility") ?? "private"),
  shareToken: pick(raw, "shareToken", "share_token") ?? null,
  createdAt: pick(raw, "createdAt", "created_at"),
  updatedAt: pick(raw, "updatedAt", "updated_at"),
  payload: normalizeToolBracketPayload(resolveToolBracketPayloadSource(raw)),
});

export const normalizeToolBracketPayload = (raw: AnyRecord): PublicBracketPayload => {
  const teams = (pick<any[]>(raw, "teams", "Teams") ?? []).map((team, index) => ({
    id: String(pick(team, "id", "Id") ?? ""),
    name: String(pick(team, "name", "Name") ?? `Team ${index + 1}`),
    seed: asNumber(pick(team, "seed", "Seed"), index + 1),
  }));

  return {
    title: String(pick(raw, "title", "Title") ?? "Untitled bracket"),
    format: String(pick(raw, "format", "Format") ?? "single_elimination"),
    bestOf: asNumber(pick(raw, "bestOf", "BestOf"), 1),
    bracketSize: asNumber(pick(raw, "bracketSize", "BracketSize"), Math.max(teams.length, 2)),
    teams,
    graph: pick(raw, "graph", "Graph") ?? { nodes: [], edges: [] },
  };
};

export const parseTeamText = (text: string, mode: "lines" | "csv" = "lines") => {
  const rawNames = mode === "csv"
    ? text.split(/[\n,;]+/g)
    : text.split(/\r?\n/g);
  const names = rawNames.map((name) => name.trim()).filter(Boolean);
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const name of names) {
    const key = name.toLowerCase();
    if (seen.has(key)) duplicates.add(name);
    seen.add(key);
  }

  return { names, duplicates: Array.from(duplicates) };
};

export const formatBracketFormat = (format: string) =>
  format === "double_elimination" ? "Double elimination" : "Single elimination";

export const adaptPublicBracketPayload = (payload: PublicBracketPayload): BracketMatch[] => {
  const teamsById = new Map<string, BracketTeam>();
  payload.teams.forEach((team) => {
    teamsById.set(String(team.id), {
      id: String(team.id),
      name: team.name,
      seed: team.seed,
    });
  });

  const graph = payload.graph ?? {};
  const rawNodes = pick<any[]>(graph, "nodes", "Nodes") ?? [];
  const rawEdges = pick<any[]>(graph, "edges", "Edges") ?? [];
  const nextBySource = new Map<string, string>();
  const loserNextBySource = new Map<string, string>();

  rawEdges.forEach((edge) => {
    const source = String(pick(edge, "sourceMatchId", "source_match_id", "SourceMatchId") ?? "");
    const target = String(pick(edge, "targetMatchId", "target_match_id", "TargetMatchId") ?? "");
    const type = String(pick(edge, "type", "Type") ?? "winner");
    if (!source || !target) return;
    if (type === "loser") loserNextBySource.set(source, target);
    else nextBySource.set(source, target);
  });

  return rawNodes.map((node): BracketMatch => {
    const id = String(pick(node, "id", "Id") ?? "");
    const team1Id = pick<string>(node, "team1Id", "team1_id", "Team1Id");
    const team2Id = pick<string>(node, "team2Id", "team2_id", "Team2Id");
    const winnerId = pick<string>(node, "winnerId", "winner_id", "WinnerId");
    const bracketType = String(pick(node, "bracketType", "bracket_type", "BracketType") ?? "winners");
    const bracketSide = bracketType === "losers" ? "losers" : bracketType === "final" ? "final" : "winners";

    return {
      id,
      round: asNumber(pick(node, "roundIndex", "round_index", "RoundIndex"), 0) + 1,
      matchNumber: asNumber(pick(node, "matchNumber", "match_number", "MatchNumber"), 0),
      team1: team1Id ? teamsById.get(String(team1Id)) ?? null : null,
      team2: team2Id ? teamsById.get(String(team2Id)) ?? null : null,
      winner: winnerId ? teamsById.get(String(winnerId)) ?? null : null,
      score: null,
      team1_score: pick<number>(node, "team1Score", "team1_score", "Team1Score") ?? null,
      team2_score: pick<number>(node, "team2Score", "team2_score", "Team2Score") ?? null,
      status: String(pick(node, "status", "Status") ?? "pending") as BracketMatch["status"],
      bestOf: payload.bestOf,
      bracketSide,
      bracketType: bracketSide,
      nextMatchId: nextBySource.get(id) ?? null,
      loserNextMatchId: loserNextBySource.get(id) ?? null,
    };
  });
};

export const copyText = async (text: string) => {
  await navigator.clipboard.writeText(text);
};

export const buildPublicBracketShareUrl = (shareToken: string) =>
  `${window.location.origin}/tools/brackets/share/${shareToken}`;

export const buildPublicBracketEmbedUrl = (shareToken: string) =>
  `${window.location.origin}/tools/brackets/embed/share/${shareToken}`;

export const buildPublicBracketEmbedCode = (shareToken: string, height = 720) => {
  const src = buildPublicBracketEmbedUrl(shareToken);
  return `<iframe src="${src}" width="100%" height="${height}" style="border:0;border-radius:12px;background:#09090b" allowfullscreen loading="lazy" title="Esportra bracket"></iframe>`;
};

export const slugifyBracketFileName = (title: string) =>
  title.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "bracket";
