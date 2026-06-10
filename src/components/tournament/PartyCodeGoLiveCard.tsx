import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Zap } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { matchRoomStateQueryKey } from '@/hooks/useMatchRoomState';

interface PartyCodeGoLiveCardProps {
    matchId: string;
    onSuccess?: (code: string) => void;
    className?: string;
}

const PartyCodeGoLiveCard: React.FC<PartyCodeGoLiveCardProps> = ({
    matchId,
    onSuccess,
    className = '',
}) => {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [manualCode, setManualCode] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const submitPartyCode = async () => {
        if (!manualCode.trim()) return;
        setIsSubmitting(true);
        try {
            const code = manualCode.trim().toUpperCase();
            await apiClient.post(`/api/matches/${matchId}/go-live`, { partyCode: code });
            queryClient.invalidateQueries({ queryKey: matchRoomStateQueryKey(matchId) });
            onSuccess?.(code);
            toast({ title: 'Match Started', description: `Party Code: ${code}` });
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Failed to start match';
            toast({ title: 'Error', description: message, variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className={`space-y-3 p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg ${className}`}>
            <div className="flex items-center gap-2 text-sm text-purple-300 font-medium">
                <Zap className="w-4 h-4 text-purple-400" />
                <span>Both teams are checked in — submit the lobby code to start the match</span>
            </div>
            <div className="flex gap-2">
                <Input
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    placeholder="Lobby Code"
                    className="bg-zinc-900 border-zinc-700 text-white font-mono uppercase"
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && manualCode.trim()) {
                            void submitPartyCode();
                        }
                    }}
                />
                <Button
                    onClick={() => void submitPartyCode()}
                    disabled={isSubmitting || !manualCode.trim()}
                    className="bg-rose-500 hover:bg-rose-600 transition-all text-white font-semibold px-6 shrink-0"
                >
                    {isSubmitting ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                        'Start Match'
                    )}
                </Button>
            </div>
        </div>
    );
};

export default PartyCodeGoLiveCard;
