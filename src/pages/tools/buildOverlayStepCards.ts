import type { GameMap, MatchMapVeto } from "@/hooks/useMapVetoMachine";
import type { VetoHistoryEntry } from "@/hooks/useVetoHistory";
import { buildVetoSequenceItems } from "@/components/tournament/map-veto/buildVetoSequenceItems";
import { buildVetoStripCards, type VetoStripCard } from "@/components/tournament/map-veto/buildVetoStripCards";
import type { OverlayEventSlot } from "./overlayVetoEvents";

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

/** The shape the on-air event queue diffs: only settled slots count as moments. */
export function toOverlayEventSlots(cards: VetoStripCard[]): OverlayEventSlot[] {
  return cards.map((card) => ({
    key: `step-${card.stepNumber}`,
    kind: card.mapSettled ? card.kind : "pending",
    mapName: card.mapName ?? "",
    mapImageUrl: card.mapImageUrl,
    topTeam: card.teamName,
    bottomTeam: card.sideTeamName,
    side: card.sideStatus === "done" ? card.side ?? null : null,
  }));
}

export type OverlayMapState = {
  status: "open" | "ban" | "pick" | "decider";
  /** Team that banned or picked. */
  teamName?: string;
  /** Position in the series for picks and the decider. */
  mapNumber?: number;
  side?: "attack" | "defend" | null;
  sideTeamName?: string;
};

/**
 * What happened to each map in the pool, keyed by map name. Cards stay in pool
 * order; this only says which layers each card switches on. The decider is
 * marked as soon as it's the map left, even while its side is still open.
 */
export function buildMapStates(cards: VetoStripCard[]): Map<string, OverlayMapState> {
  const states = new Map<string, OverlayMapState>();
  let mapNumber = 0;

  cards.forEach((card) => {
    if (!card.mapName) return;
    const isDecider = card.kind === "decider" && (card.mapSettled || card.status === "current");
    if (!card.mapSettled && !isDecider) return;
    if (card.kind !== "ban") mapNumber += 1;

    states.set(card.mapName, {
      status: isDecider ? "decider" : card.kind,
      teamName: card.kind === "decider" ? undefined : card.teamName,
      mapNumber: card.kind === "ban" ? undefined : mapNumber,
      side: card.sideStatus === "done" ? card.side ?? null : null,
      sideTeamName: card.sideStatus === "done" ? card.sideTeamName : undefined,
    });
  });

  return states;
}
