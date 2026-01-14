import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { Loader2, Clock, FileText } from 'lucide-react';
import { BracketMatch } from '@/types/bracketTypes';

interface Props {
    tournamentId: string;
    teamId: string;
    matches: BracketMatch[];
}

interface MatchResult {
    id: string;
    match_id: string;
    status: 'pending' | 'approved' | 'rejected';
    comment?: string;
    image_url?: string;
    created_at: string;
    admin_comment?: string;
}

const CaptainMatchHistory: React.FC<Props> = ({ tournamentId, teamId, matches }) => {
    const [results, setResults] = useState<MatchResult[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchResults = async () => {
            if (!tournamentId || !teamId) return;

            try {
                setLoading(true);
                console.log('[CaptainMatchHistory] Fetching results for:', { tournamentId, teamId });
                const { data, error } = await supabase
                    .from('tournament_match_results')
                    .select('*')
                    .eq('tournament_id', tournamentId)
                    .eq('team_id', teamId)
                    .order('created_at', { ascending: false });

                if (error) {
                    console.error('[CaptainMatchHistory] Error fetching results:', error);
                    throw error;
                }
                console.log('[CaptainMatchHistory] Fetched results:', data);
                setResults(data || []);
            } catch (err) {
                console.error('Error fetching match results:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchResults();
    }, [tournamentId, teamId]);

    // Filter for completed matches involving this team
    const pastMatches = matches.filter(m =>
        (m.team1?.id === teamId || m.team2?.id === teamId) &&
        m.status === 'completed'
    ).sort((a, b) => Number(b.matchNumber) - Number(a.matchNumber));

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
            {/* Match History */}
            <Card className="bg-[#18181b] border-zinc-800">
                <CardHeader>
                    <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                        <FileText className="w-5 h-5 text-gaming-purple" />
                        Match History
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-[300px] pr-4">
                        {pastMatches.length === 0 ? (
                            <div className="text-center text-zinc-500 py-8">
                                No completed matches yet.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {pastMatches.map(match => {
                                    const isTeam1 = match.team1?.id === teamId;
                                    const myScore = isTeam1 ? match.team1_score : match.team2_score;
                                    const opponentScore = isTeam1 ? match.team2_score : match.team1_score;
                                    const opponentName = isTeam1 ? match.team2?.name : match.team1?.name;
                                    const isWin = (myScore || 0) > (opponentScore || 0);

                                    return (
                                        <div key={match.id} className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/50 border border-zinc-800">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium text-zinc-300">vs {opponentName || 'TBD'}</span>
                                                <span className="text-xs text-zinc-500">Match #{match.matchNumber}</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className={`text-sm font-bold ${isWin ? 'text-green-400' : 'text-red-400'}`}>
                                                    {isWin ? 'WIN' : 'LOSS'}
                                                </div>
                                                <Badge variant="outline" className="bg-zinc-950 border-zinc-700 text-white">
                                                    {myScore} - {opponentScore}
                                                </Badge>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </ScrollArea>
                </CardContent>
            </Card>

            {/* Upload History */}
            <Card className="bg-[#18181b] border-zinc-800">
                <CardHeader>
                    <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                        <Clock className="w-5 h-5 text-gaming-purple" />
                        Submission History
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-[300px] pr-4">
                        {loading ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="w-6 h-6 animate-spin text-gaming-purple" />
                            </div>
                        ) : results.length === 0 ? (
                            <div className="text-center text-zinc-500 py-8">
                                No results uploaded yet.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {results.map(result => (
                                    <div key={result.id} className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs text-zinc-500">
                                                {format(new Date(result.created_at), 'MMM d, h:mm a')}
                                            </span>
                                        </div>
                                        {result.comment && (
                                            <p className="text-sm text-zinc-300 mb-2">
                                                <span className="text-zinc-500">You:</span> {result.comment}
                                            </p>
                                        )}
                                        {result.image_url && (
                                            <div className="mt-2">
                                                <img
                                                    src={result.image_url}
                                                    alt="Match result screenshot"
                                                    className="h-20 w-auto rounded border border-zinc-700 hover:border-gaming-purple transition-colors cursor-pointer object-cover"
                                                    onClick={() => window.open(result.image_url, '_blank')}
                                                />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
    );
};

export default CaptainMatchHistory;
