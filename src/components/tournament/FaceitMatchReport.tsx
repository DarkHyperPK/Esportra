import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Zap } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { apiClient } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';

interface FaceitMatchReportProps {
    matchId: string;
    team1Name: string;
    team2Name: string;
    isCaptain: boolean;
    onSuccess: () => void;
    className?: string;
}

/**
 * Lets a captain paste a Faceit Match ID, fetches the final score from
 * the faceit-match-proxy edge function, and auto-fills the result report.
 */
export function FaceitMatchReport({
    matchId,
    team1Name,
    team2Name,
    isCaptain,
    onSuccess,
    className,
}: FaceitMatchReportProps) {
    const [open, setOpen] = useState(false);
    const [faceitMatchId, setFaceitMatchId] = useState('');
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    if (!isCaptain) return null;

    const callProxy = async (endpoint: string) => {
        const data = await apiClient.post('/api/integrations/faceit/proxy', { endpoint });
        if (data?.errors) throw new Error(JSON.stringify(data.errors));
        return data;
    };

    const handleAutoReport = async () => {
        if (!faceitMatchId.trim()) return;
        setLoading(true);
        try {
            // Fetch match stats from Faceit
            const stats = await callProxy(`/matches/${faceitMatchId.trim()}/stats`);

            // Faceit stats shape: { rounds: [{ teams: [{ team_stats: { 'Final Score': '...' } }] }] }
            const rounds = stats?.rounds;
            if (!rounds?.length) throw new Error('No round data in Faceit match stats');

            const teams = rounds[0]?.teams;
            if (!teams || teams.length < 2) throw new Error('Could not parse team scores from Faceit stats');

            const score1 = parseInt(teams[0]?.team_stats?.['Final Score'] ?? '0', 10);
            const score2 = parseInt(teams[1]?.team_stats?.['Final Score'] ?? '0', 10);

            // Update the match result in the DB
            const { error: updateError } = await supabase
                .from('bracket_matches')
                .update({
                    team1_score: score1,
                    team2_score: score2,
                    status: 'completed',
                    faceit_match_id: faceitMatchId.trim(),
                })
                .eq('id', matchId);

            if (updateError) throw updateError;

            toast({
                title: 'Match Auto-Reported',
                description: `${team1Name} ${score1} – ${score2} ${team2Name} (via Faceit)`,
            });
            setOpen(false);
            setFaceitMatchId('');
            onSuccess();
        } catch (err: any) {
            toast({
                title: 'Auto-Report Failed',
                description: err.message || 'Could not fetch Faceit match stats.',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    if (!open) {
        return (
            <Button
                onClick={() => setOpen(true)}
                className={`bg-orange-600 hover:bg-orange-500 text-white font-bold ${className ?? 'w-full h-12 text-lg'}`}
            >
                <Zap className="w-5 h-5 mr-2" />
                Auto-Report via Faceit
            </Button>
        );
    }

    return (
        <div className="bg-zinc-900 border border-orange-500/30 rounded-xl p-4 space-y-3">
            <div className="text-sm font-bold text-orange-400 uppercase tracking-wider">CS2 Auto-Report</div>
            <div className="space-y-2">
                <Label className="text-zinc-400 text-xs">Faceit Match ID</Label>
                <Input
                    placeholder="e.g. 1-abc12345-def6-..."
                    value={faceitMatchId}
                    onChange={e => setFaceitMatchId(e.target.value)}
                    className="bg-zinc-950 border-zinc-700 text-white font-mono text-sm"
                />
                <p className="text-[10px] text-zinc-500">
                    Find the Match ID in the Faceit match room URL or match details page.
                </p>
            </div>
            <div className="flex gap-2">
                <Button
                    onClick={handleAutoReport}
                    disabled={loading || !faceitMatchId.trim()}
                    className="flex-1 bg-orange-600 hover:bg-orange-500 text-white font-bold"
                >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Zap className="w-4 h-4 mr-2" />}
                    Fetch & Report
                </Button>
                <Button variant="ghost" onClick={() => { setOpen(false); setFaceitMatchId(''); }} className="text-zinc-400 hover:text-white">
                    Cancel
                </Button>
            </div>
        </div>
    );
}
