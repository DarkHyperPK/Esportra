import { BracketGraph, BracketNode, BracketEdge } from '@/types/bracket-graph';

export interface IBracketGenerator {
    generate(
        teams: any[],
        tournamentId: string,
        stageId?: string,
        bestOf?: number,
        bracketSize?: number,
        advancementCount?: number,
        config?: any
    ): BracketGraph;
}

export class GraphValidator {
    static validate(graph: BracketGraph): string[] {
        const errors: string[] = [];
        const { nodes, edges } = graph;

        // 1. Check for Cycles (DFS)
        if (this.hasCycle(nodes, edges)) {
            errors.push('Graph contains a cycle.');
        }

        // 2. Check Input Slots
        // Every match (except first round) should have inputs? 
        // Actually, in a generated bracket, seeding fills R1.
        // We check that no match has > 2 incoming edges for the same slot.
        const incoming = new Map<string, number>(); // matchId -> count
        edges.forEach(e => {
            const key = `${e.target_match_id}-${e.target_slot}`;
            incoming.set(key, (incoming.get(key) || 0) + 1);
        });

        incoming.forEach((count, key) => {
            if (count > 1) {
                errors.push(`Slot collision: ${key} has ${count} incoming edges.`);
            }
        });

        // 3. Check Single Champion
        // Exactly one node should have NO outgoing 'winner' edge (The Grand Final).
        // Note: In Double Elim with Reset, the "Potential" final might feed into a Reset match.
        // But ultimately there is one sink node.
        // EXCEPTION: Round Robin and Swiss have NO edges (all matches are independent), so skip this check.
        if (edges.length > 0) {
            const nodesWithOutgoingWinner = new Set<string>();
            edges.filter(e => e.type === 'winner').forEach(e => nodesWithOutgoingWinner.add(e.source_match_id));

            const potentialChampions = nodes.filter(n => !nodesWithOutgoingWinner.has(n.id));

            if (potentialChampions.length === 0) {
                errors.push('No champion node found (infinite loop?).');
            } else if (potentialChampions.length > 1) {
                // It's okay to have multiple sinks if they are different brackets (e.g. 3rd place match),
                // but standard single/double elim usually has one main sink.
                // We'll warn for now.
                // errors.push(`Multiple champion nodes found: ${potentialChampions.length}`);
            }
        }
        // If edges.length === 0, it's a group-stage format (RR/Swiss) where all matches are sinks,
        // and that's valid - no need to check for a single champion.


        return errors;
    }

    private static hasCycle(nodes: BracketNode[], edges: BracketEdge[]): boolean {
        const adj = new Map<string, string[]>();
        edges.forEach(e => {
            if (!adj.has(e.source_match_id)) adj.set(e.source_match_id, []);
            adj.get(e.source_match_id)?.push(e.target_match_id);
        });

        const visited = new Set<string>();
        const recStack = new Set<string>();

        const dfs = (nodeId: string): boolean => {
            if (recStack.has(nodeId)) return true;
            if (visited.has(nodeId)) return false;

            visited.add(nodeId);
            recStack.add(nodeId);

            const children = adj.get(nodeId) || [];
            for (const child of children) {
                if (dfs(child)) return true;
            }

            recStack.delete(nodeId);
            return false;
        };

        for (const node of nodes) {
            if (dfs(node.id)) return true;
        }

        return false;
    }
}
