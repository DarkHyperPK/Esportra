import type {
  DisputeReport,
  DisputeRiotAccount,
  MatchDisputeEvidence,
} from '@/components/organizer/DisputeEvidencePanel';

function parseJsonArray<T>(raw: unknown): T[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as T[];
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function parseDisputeReports(raw: unknown): DisputeReport[] {
  return parseJsonArray<DisputeReport>(raw);
}

export function parseDisputeRiotAccounts(raw: unknown): DisputeRiotAccount[] {
  return parseJsonArray<DisputeRiotAccount>(raw);
}

function parsePostgresTextArray(raw: string): string[] {
  const trimmed = raw.trim();
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) return [];
  const inner = trimmed.slice(1, -1).trim();
  if (!inner) return [];
  return inner
    .split(',')
    .map((part) => part.trim().replace(/^"(.*)"$/, '$1'))
    .filter((url) => url.length > 0);
}

export function parseEvidenceUrls(raw: unknown): string[] {
  if (typeof raw === 'string') {
    const jsonParsed = parseJsonArray<string>(raw);
    if (jsonParsed.length > 0) {
      return jsonParsed.filter((url) => typeof url === 'string' && url.length > 0);
    }
    return parsePostgresTextArray(raw);
  }
  return parseJsonArray<string>(raw).filter((url) => typeof url === 'string' && url.length > 0);
}

export function parseMatchDispute(raw: unknown): MatchDisputeEvidence | null {
  if (!raw || typeof raw !== 'object') return null;
  const dispute = raw as MatchDisputeEvidence;
  return {
    ...dispute,
    evidence_urls: parseEvidenceUrls(dispute.evidence_urls),
  };
}

export function resolveDisputingEvidenceUrls(
  matchDispute: MatchDisputeEvidence | null | undefined,
  fallbackEvidenceUrl?: string | null,
): string[] {
  const fromDispute = parseEvidenceUrls(matchDispute?.evidence_urls);
  if (fromDispute.length > 0) return fromDispute;
  if (fallbackEvidenceUrl) return [fallbackEvidenceUrl];
  return [];
}

function teamNameForId(
  teamId: string | null | undefined,
  matchContext?: {
    team1_name?: string;
    team2_name?: string;
    team1_id?: string;
    team2_id?: string;
  } | null,
): string | null {
  if (!teamId || !matchContext) return null;
  if (teamId === matchContext.team1_id) return matchContext.team1_name || 'Team 1';
  if (teamId === matchContext.team2_id) return matchContext.team2_name || 'Team 2';
  return null;
}

export function getReporterTeamName(
  report: DisputeReport | null,
  matchContext?: {
    team1_name?: string;
    team2_name?: string;
    team1_id?: string;
    team2_id?: string;
  } | null,
): string | null {
  if (!report) return null;
  return teamNameForId(report.reported_by_team_id, matchContext);
}

export function getDisputingTeamName(
  matchDispute: MatchDisputeEvidence | null | undefined,
  matchContext?: {
    team1_name?: string;
    team2_name?: string;
    team1_id?: string;
    team2_id?: string;
  } | null,
  fallbackTeamName?: string | null,
): string | null {
  if (matchDispute?.disputed_by_team_name) return matchDispute.disputed_by_team_name;
  const fromContext = teamNameForId(matchDispute?.disputed_by_team_id, matchContext);
  if (fromContext) return fromContext;
  return fallbackTeamName ?? null;
}

/** The report under dispute — prefer disputed, then pending, then newest. */
export function getPrimaryDisputeReport(reports: DisputeReport[]): DisputeReport | null {
  if (!reports.length) return null;

  const disputed = reports.find((r) => r.status === 'disputed');
  if (disputed) return disputed;

  const pending = reports.find((r) => r.status === 'pending');
  if (pending) return pending;

  return [...reports].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )[0];
}

/** Original score report filed before the counter-claim (excludes disputer's team). */
export function getInitialReport(
  reports: DisputeReport[],
  matchDispute?: MatchDisputeEvidence | null,
): DisputeReport | null {
  if (!reports.length) return null;

  const disputerTeamId = matchDispute?.disputed_by_team_id;
  if (disputerTeamId) {
    const fromReporter = reports.find((r) => r.reported_by_team_id !== disputerTeamId);
    if (fromReporter) return fromReporter;
  }

  const accepted = reports.find((r) => r.status === 'accepted');
  if (accepted) return accepted;

  const pending = reports.find((r) => r.status === 'pending');
  if (pending) return pending;

  const disputed = reports.find((r) => r.status === 'disputed');
  if (disputed) return disputed;

  return [...reports].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  )[0];
}
