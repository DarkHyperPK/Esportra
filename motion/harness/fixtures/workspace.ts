/**
 * Crimson Five's workspace: the request Night Owls just sent arrives here.
 * Accept posts to the API (answered after a short delay, so "Accepting…" shows).
 */
import type { Route } from '../mockFetch';
import { DAY, HOUR, MIN, ME, NOW, TEAMS, iso, members, record } from './common';
import { catalogRoutes, discoveryListings } from './discovery';

const OPP = TEAMS.crimson;
const TONIGHT = new Date(NOW + 13 * MIN).toISOString();

export function createWorkspace() {
  const s = { accepted: false };
  const listing = () => ({ ...discoveryListings().find((l) => l.id === 'l-crimson')!, status: 'open' });
  const offer = () => ({
    id: 'offer-owls', listingId: 'l-crimson', offeringTeamId: ME.id, proposedAt: TONIGHT, proposedDurationMinutes: 120,
    notes: 'GG last week. Run it back?', status: s.accepted ? 'accepted' : 'pending', createdAt: iso(-2 * MIN), updatedAt: iso(-2 * MIN),
    slotId: 'slot-tonight', offeringTeamName: ME.name, offeringTeamLogo: ME.logo, offeringTeamTag: ME.tag, listingGameSlug: 'valorant',
    listingTeamName: OPP.name, offeringActiveMemberCount: 5,
    offeringMembersPreview: JSON.stringify(members(['Hex', 'Raze', 'Kilo', 'Mara', 'Tide'], 'immortal')),
    offeringScrimsCompleted: 18, offeringRecord: record(12, 6, ['W', 'L', 'W', 'W', 'W'], 3),
  });
  const past = (id: string, opp: typeof OPP, daysAgo: number, a: number, b: number) => ({
    id, team1Id: OPP.id, team2Id: opp.id, gameSlug: 'valorant', modeKey: 'competitive', scheduledAt: iso(-daysAgo * DAY), durationMinutes: 120,
    serverInfo: null, lobbyCode: null, status: 'completed', resultReportedByTeam1: true, resultReportedByTeam2: true, team1Score: a, team2Score: b,
    createdAt: iso(-daysAgo * DAY - HOUR), updatedAt: iso(-daysAgo * DAY), team1Name: OPP.name, team1Logo: OPP.logo, team2Name: opp.name, team2Logo: opp.logo, bestOf: 3,
  });
  const sessions = () => [
    ...(s.accepted ? [{
      id: 's-crimson', team1Id: ME.id, team2Id: OPP.id, gameSlug: 'valorant', modeKey: 'competitive', scheduledAt: TONIGHT, durationMinutes: 120,
      serverInfo: null, lobbyCode: null, status: 'scheduled', resultReportedByTeam1: false, resultReportedByTeam2: false, team1Score: null, team2Score: null,
      createdAt: iso(0), updatedAt: iso(0), team1Name: ME.name, team1Logo: ME.logo, team2Name: OPP.name, team2Logo: OPP.logo, bestOf: 3,
    }] : []),
    past('s-p1', TEAMS.neon, 2, 2, 1), past('s-p2', TEAMS.tigers, 4, 2, 0), past('s-p3', TEAMS.orbit, 6, 1, 2),
  ];
  const routes: Route[] = [
    ...catalogRoutes.filter(([re]) => !String(re).includes('teams')),
    [/^\/api\/teams\/me/, () => [{ id: OPP.id, name: OPP.name, tag: OPP.tag, logo_url: OPP.logo, primary_game_slug: 'valorant', role: 'captain' }]],
    [/^\/api\/scrims\/listings\?/, () => [listing()]],
    [/^\/api\/scrims\/listings\/[^/]+\/offers/, () => [offer()]],
    [/^\/api\/scrims\/offers\/mine/, () => []],
    [/^\/api\/scrims\/sessions\?/, () => sessions()],
    [/^\/api\/scrims\/offers\/[^/]+\/accept/, async () => {
      await new Promise((r) => setTimeout(r, 1500));
      s.accepted = true;
      return sessions()[0];
    }],
    [/^\/api\/scrims\/up-next/, () => ({ items: [], total: 0 })],
    [/^\/api\/scrims\/teams\/[^/]+\/history/, () => ({ items: [], total: 0, page: 1, pageSize: 5 })],
  ];
  return { routes, control: {} };
}
