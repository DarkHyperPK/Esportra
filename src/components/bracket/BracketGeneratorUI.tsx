import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { SingleEliminationGenerator } from '@/services/bracket/SingleEliminationGenerator';
import { DoubleEliminationGenerator } from '@/services/bracket/DoubleEliminationGenerator';
import { MatchRepository } from '@/services/bracket/MatchRepository';
import { GraphValidator } from '@/services/bracket/BracketGenerator';

interface Team {
    id: string;
    name: string;
    logo_url?: string | null;
}

interface BracketGeneratorUIProps {
    tournamentId: string;
    stageId: string;
    stageFormat: 'single_elimination' | 'double_elimination';
    stageBestOf?: number; // Best-of format from stage settings (e.g., 3, 5)
    teams: Team[];
    onGenerated: (versionId: string) => void;
}

export const BracketGeneratorUI: React.FC<BracketGeneratorUIProps> = ({
    tournamentId,
    stageId,
    stageFormat,
    stageBestOf = 3, // Default to Best-of-3
    teams,
    onGenerated
}) => {
    const [isGenerating, setIsGenerating] = useState(false);
    const { toast } = useToast();

    const handleGenerate = async () => {
        if (teams.length < 2) {
            toast({ title: 'Error', description: 'Need at least 2 teams to generate a bracket.', variant: 'destructive' });
            return;
        }

        setIsGenerating(true);
        try {
            // Get next version_number to avoid unique constraint violation
            const { data: maxVersionData } = await (supabase as any)
                .from('brkt_versions')
                .select('version_number')
                .eq('tournament_id', tournamentId)
                .order('version_number', { ascending: false })
                .limit(1)
                .single();
            const nextVersionNumber = (maxVersionData?.version_number || 0) + 1;

            let generator;
            if (stageFormat === 'single_elimination') {
                generator = new SingleEliminationGenerator();
            } else if (stageFormat === 'double_elimination') {
                generator = new DoubleEliminationGenerator();
            } else {
                throw new Error('Unknown format: ' + stageFormat);
            }

            // 1. Generate Graph with teams seeded and best_of from stage
            const graph = generator.generate(teams, tournamentId, stageId, stageBestOf);

            // Update version_number with the next available number
            graph.version.version_number = nextVersionNumber;

            // 2. Validate
            const errors = GraphValidator.validate(graph);
            if (errors.length > 0) {
                console.error('Graph Validation Errors:', errors);
                throw new Error('Generated graph failed validation: ' + errors.join(', '));
            }

            // 3. Calculate Layout - Proper Bracket Tree Positioning
            const MATCH_WIDTH = 320;
            const MATCH_HEIGHT = 130;
            const HORIZONTAL_GAP = 80;
            const BASE_VERTICAL_GAP = 20;

            // Group nodes by bracket type
            const winnerNodes = graph.nodes.filter(n => n.bracket_type === 'winners');
            const loserNodes = graph.nodes.filter(n => n.bracket_type === 'losers');
            const finalNodes = graph.nodes.filter(n => n.bracket_type === 'final');

            // Calculate number of teams and first round matches
            const bracketSize = Math.pow(2, Math.ceil(Math.log2(teams.length || 4)));
            const firstRoundMatches = bracketSize / 2;

            // Layout Winners Bracket using proper tree positioning
            // Round 1 matches are evenly spaced
            // Each subsequent round is centered between its two feeder matches

            // First, position Round 0 (first round) evenly
            const round0Matches = winnerNodes.filter(n => n.round_index === 0).sort((a, b) => a.match_number - b.match_number);
            const baseSpacing = MATCH_HEIGHT + BASE_VERTICAL_GAP * 2;

            round0Matches.forEach((node, idx) => {
                node.x = 0;
                node.y = idx * baseSpacing * 2;
            });

            // Then position each subsequent round centered between feeder matches
            const maxRound = Math.max(...winnerNodes.map(n => n.round_index));
            for (let round = 1; round <= maxRound; round++) {
                const roundMatches = winnerNodes
                    .filter(n => n.round_index === round)
                    .sort((a, b) => a.match_number - b.match_number);

                const prevRoundMatches = winnerNodes
                    .filter(n => n.round_index === round - 1)
                    .sort((a, b) => a.match_number - b.match_number);

                roundMatches.forEach((node, idx) => {
                    node.x = round * (MATCH_WIDTH + HORIZONTAL_GAP);

                    // Center between the two feeder matches
                    const feeder1 = prevRoundMatches[idx * 2];
                    const feeder2 = prevRoundMatches[idx * 2 + 1];

                    if (feeder1 && feeder2 && feeder1.y !== undefined && feeder2.y !== undefined) {
                        node.y = (feeder1.y + feeder2.y) / 2;
                    } else if (feeder1 && feeder1.y !== undefined) {
                        node.y = feeder1.y;
                    } else {
                        node.y = idx * baseSpacing * 2;
                    }
                });
            }

            // Layout Losers Bracket (below winners)
            const winnersBracketHeight = (firstRoundMatches - 1) * baseSpacing * 2 + MATCH_HEIGHT + 150;
            loserNodes.forEach(node => {
                node.x = node.round_index * (MATCH_WIDTH + HORIZONTAL_GAP);
                const loserRoundMatches = loserNodes.filter(n => n.round_index === node.round_index).length;
                const spacing = baseSpacing * 2;
                node.y = winnersBracketHeight + (node.match_number - 1) * spacing;
            });

            // Layout Grand Finals
            finalNodes.forEach(node => {
                const maxWinnerRound = Math.max(...winnerNodes.map(n => n.round_index), 0);
                node.x = (maxWinnerRound + 1) * (MATCH_WIDTH + HORIZONTAL_GAP);
                // Center vertically in the winners bracket area
                const midY = winnerNodes.length > 0
                    ? winnerNodes.reduce((sum, n) => sum + (n.y || 0), 0) / winnerNodes.length
                    : 200;
                node.y = midY;
            });

            // 4. Save to DB
            const repo = new MatchRepository();
            await repo.createVersion(graph);

            toast({ title: 'Success', description: `${stageFormat.replace('_', ' ')} bracket generated with ${teams.length} teams.` });
            onGenerated(graph.version.id);

        } catch (error) {
            console.error(error);
            toast({ title: 'Error', description: (error as Error).message, variant: 'destructive' });
        } finally {
            setIsGenerating(false);
        }
    };

    const formatLabel = stageFormat === 'single_elimination' ? 'Single Elimination' : 'Double Elimination';

    return (
        <div className="flex flex-col gap-4 p-6 border rounded-lg bg-slate-900/50 border-slate-700">
            <div className="text-sm text-gray-400">
                Format: <span className="text-white font-medium">{formatLabel}</span>
            </div>
            <div className="text-sm text-gray-400">
                Teams: <span className="text-white font-medium">{teams.length}</span>
            </div>

            <Button
                onClick={handleGenerate}
                disabled={isGenerating || teams.length < 2}
                className="bg-gaming-purple hover:bg-gaming-purple/80"
            >
                {isGenerating ? 'Generating...' : `Generate ${formatLabel} Bracket`}
            </Button>

            {teams.length < 2 && (
                <p className="text-xs text-yellow-500">Need at least 2 registered teams to generate a bracket.</p>
            )}
        </div>
    );
};
