import React, { useState } from 'react';
import { CtaButton } from '@/components/ui/app-buttons';
import { Input } from '@/components/ui/input';
import { apiClient, getApiErrorMessage } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { invalidateMatchLifecycleQueries } from '@/utils/matchLifecycleQueries';

interface PartyCodeGoLiveCardProps {
    matchId: string;
    versionId?: string | null;
    onSuccess?: (code: string) => void;
    className?: string;
}

const PartyCodeGoLiveCard: React.FC<PartyCodeGoLiveCardProps> = ({
    matchId,
    versionId,
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
            invalidateMatchLifecycleQueries(queryClient, { matchId, versionId });
            onSuccess?.(code);
            toast({ title: 'Match is live', description: `Party code: ${code}` });
        } catch (error: unknown) {
            toast({
                title: 'Could not go live',
                description: getApiErrorMessage(error, 'Failed to start match'),
                variant: 'destructive',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className={`space-y-3 ${className}`}>
            <p className="text-sm text-zinc-400">Enter the lobby code to share with your opponent and go live.</p>
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
                <CtaButton
                    onClick={() => void submitPartyCode()}
                    disabled={isSubmitting || !manualCode.trim()}
                    className="transition-all font-semibold px-6 shrink-0"
                >
                    {isSubmitting ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                        'Share & Go Live'
                    )}
                </CtaButton>
            </div>
        </div>
    );
};

export default PartyCodeGoLiveCard;
