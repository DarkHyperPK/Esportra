import type { PublicVetoState } from "./publicMapVetoUtils";

export type TossSide = "team1" | "team2";

/** The toss fields a view needs, as the server sends them for this link. */
export type TossView = Pick<
  PublicVetoState,
  | "role"
  | "team1Name"
  | "team2Name"
  | "team1Id"
  | "team2Id"
  | "tossWinnerTeamId"
  | "tossWinnerName"
  | "tossFirstActorTeamId"
  | "tossFirstActorName"
  | "isTossWinner"
  | "currentAction"
>;

/**
 * Which side won the toss, from what this link can see: the host has both team
 * ids, a team link knows only whether it won, and viewers (the overlay) have
 * names alone, so two teams with one name can't be told apart.
 */
export function tossWinnerSide(view: TossView): TossSide | null {
  if (!view.tossWinnerTeamId) return null;
  if (view.team1Id && view.tossWinnerTeamId === view.team1Id) return "team1";
  if (view.team2Id && view.tossWinnerTeamId === view.team2Id) return "team2";
  if ((view.role === "team1" || view.role === "team2") && view.isTossWinner != null) {
    const own: TossSide = view.role;
    return view.isTossWinner ? own : own === "team1" ? "team2" : "team1";
  }
  if (view.team1Name === view.team2Name) return null;
  if (view.tossWinnerName === view.team1Name) return "team1";
  if (view.tossWinnerName === view.team2Name) return "team2";
  return null;
}

function firstTurnLabel(action: TossView["currentAction"]) {
  if (action === "ban") return "first ban";
  if (action === "pick") return "first pick";
  return "first turn";
}

/**
 * What the toss winner decided, worded for whoever is reading: the winner, the
 * team that lost the toss (who may be up first), or the host and the stream.
 */
export function tossDecisionLine(view: TossView): string | null {
  if (!view.tossFirstActorTeamId || !view.tossWinnerTeamId) return null;
  const tookIt = view.tossFirstActorTeamId === view.tossWinnerTeamId;
  const winner = view.tossWinnerName ?? "The toss winner";
  const other = view.tossFirstActorName ?? "the other team";
  const turn = firstTurnLabel(view.currentAction);
  const onTeamLink = view.role === "team1" || view.role === "team2";

  if (onTeamLink && view.isTossWinner) {
    return tookIt ? `You won the toss and took the ${turn}.` : `You won the toss and gave the ${turn} to ${other}.`;
  }
  if (tookIt) return `${winner} won the toss and chose to go first.`;
  if (onTeamLink) return `${winner} won the toss and gave you the ${turn}. Your move.`;
  return `${winner} won the toss and gave the ${turn} to ${other}.`;
}
