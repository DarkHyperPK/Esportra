import type { GameMap, MatchMapVeto } from "@/hooks/useMapVetoMachine";
import type { VetoHistoryEntry } from "@/hooks/useVetoHistory";
import { buildVetoSequenceItems } from "@/components/tournament/map-veto/buildVetoSequenceItems";
import { buildVetoStripCards, type VetoStripCard } from "@/components/tournament/map-veto/buildVetoStripCards";

type Options = {
  veto: MatchMapVeto;
  history: VetoHistoryEntry[];
  maps: GameMap[];
  game: string;
  bestOf: number;
  team1Name: string;
  team2Name: string;
  team1Id?: string | null;
  team2Id?: string | null;
};

/**
 * One fixed slot per map decision, in veto order, for the whole veto: settled
 * slots carry their map, the rest say who acts next and how. Slots never move,
 * so the overlay only ever fills a slot in place.
 */
export function buildOverlayStepCards(options: Options): VetoStripCard[] {
  const { veto, history, maps, game, bestOf, team1Name, team2Name, team1Id, team2Id } = options;
  const notStarted = veto.status === "pending" && !veto.current_action;
  // Before the first action the sequence is still known; show it with nothing on the clock.
  const planned: MatchMapVeto = notStarted
    ? { ...veto, status: "in_progress", current_action_number: 0 }
    : veto;

  const items = buildVetoSequenceItems({
    veto: planned,
    entries: history,
    bestOf,
    team1Name,
    team2Name,
    team1Id,
    team2Id,
    availableMaps: maps,
    allAvailableMaps: maps,
    game,
  });

  return buildVetoStripCards(items);
}
