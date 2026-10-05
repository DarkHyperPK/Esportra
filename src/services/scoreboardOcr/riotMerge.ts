import type { OcrDraft, OcrDraftPlayer, OcrStatKey, RiotMatchPlayer, RiotMatchSummary, TeamSlot } from '@/types/scoreboardOcr';
import { nameKey } from './verification';

/** Cells Riot's record has: taken from Riot and no longer highlighted. Trades, plants and defuses stay as read. */
const FROM_RIOT: ReadonlyArray<OcrStatKey> = ['kills', 'deaths', 'assists', 'acs', 'firstBloods'];

function teamOf(player: RiotMatchPlayer): TeamSlot | null {
  if (player.isTeam1) return 'team1';
  if (player.isTeam2) return 'team2';
  return null;
}

/** Each screenshot row's Riot player: by name, then the last unmatched pair left on a team. */
function pairRows(rows: OcrDraftPlayer[], riot: RiotMatchPlayer[]): Map<string, RiotMatchPlayer> {
  const pairs = new Map<string, RiotMatchPlayer>();
  const used = new Set<string>();
  for (const row of rows) {
    const key = nameKey(row.name);
    const hit = key ? riot.find((p) => !used.has(p.puuid) && nameKey(p.gameName) === key) : undefined;
    if (hit) {
      pairs.set(row.key, hit);
      used.add(hit.puuid);
    }
  }
  for (const team of ['team1', 'team2'] as const) {
    const openRows = rows.filter((r) => r.team === team && !pairs.has(r.key));
    const openRiot = riot.filter((p) => teamOf(p) === team && !used.has(p.puuid));
    if (openRows.length === 1 && openRiot.length === 1) pairs.set(openRows[0].key, openRiot[0]);
  }
  return pairs;
}

function mergeRow(row: OcrDraftPlayer, riot: RiotMatchPlayer, columns: OcrStatKey[]): OcrDraftPlayer {
  const values: Partial<Record<OcrStatKey, number | null>> = {
    kills: riot.kills,
    deaths: riot.deaths,
    assists: riot.assists,
    acs: riot.acs,
    firstBloods: riot.firstBloods,
  };
  const taken = FROM_RIOT.filter((key) => columns.includes(key) && values[key] != null);
  const sameAgent = row.agentId === riot.characterId;
  return {
    ...row,
    name: riot.gameName,
    team: teamOf(riot) ?? row.team,
    agentId: riot.characterId || row.agentId,
    agentName: sameAgent || !riot.characterId ? row.agentName : null,
    stats: { ...row.stats, ...Object.fromEntries(taken.map((key) => [key, values[key]])) },
    uncertain: row.uncertain.filter((field) => field !== 'name' && field !== 'agent' && field !== 'team' && !taken.includes(field as OcrStatKey)),
    riotId: `${riot.gameName}#${riot.tagLine}`,
  };
}

/**
 * Riot's record of the game over the screenshot read: exact names (with #tag), K/D/A, ACS, first bloods,
 * agents, teams and the score. Rows Riot couldn't be paired with keep the read and its highlights.
 */
export function mergeRiotMatch(draft: OcrDraft, match: RiotMatchSummary): OcrDraft {
  const pairs = pairRows(draft.players, match.players);
  const scoreKnown = match.team1Rounds != null && match.team2Rounds != null;
  return {
    ...draft,
    mapName: match.map || draft.mapName,
    team1Score: scoreKnown ? match.team1Rounds : draft.team1Score,
    team2Score: scoreKnown ? match.team2Rounds : draft.team2Score,
    uncertainScore: scoreKnown ? false : draft.uncertainScore,
    players: draft.players.map((row) => {
      const riot = pairs.get(row.key);
      return riot ? mergeRow(row, riot, draft.columns) : row;
    }),
    riotMatchId: match.matchId,
  };
}
