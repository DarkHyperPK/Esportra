import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MatchMapVeto } from '@/hooks/useMapVetoMachine';

interface VetoHeaderProps {
    boText: string;
    vetoStatus: MatchMapVeto['status'];
    effectiveIsOrganizer: boolean;
    handleResetVeto: () => void;
    resetting: boolean;
    vetoId?: string;
}

export const VetoHeader: React.FC<VetoHeaderProps> = ({
    boText,
    vetoStatus,
    effectiveIsOrganizer,
    handleResetVeto,
    resetting,
    vetoId,
}) => {
    return (
        <div className="mb-6 sm:mb-8 lg:mb-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 sm:gap-5">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tighter">MAP VETO</h1>
                <Badge className="bg-white/10 text-white px-3 py-1 text-xs font-bold border border-white/20 rounded-full">{boText}</Badge>
                {vetoStatus === 'in_progress' && (
                    <Badge className="bg-green-500/20 text-green-400 px-3 py-1 text-xs font-bold border border-green-500/30 rounded-full animate-pulse">
                        ● LIVE
                    </Badge>
                )}
            </div>

            {/* Reset Button - Minimalistic */}
            {effectiveIsOrganizer && vetoId && (
                <Button
                    onClick={handleResetVeto}
                    disabled={resetting}
                    variant="outline"
                    size="sm"
                    className="gap-2 px-4 py-2 text-sm font-semibold border-white/20 text-white/80 hover:bg-white/10 hover:text-white hover:border-white/30 transition-all"
                >
                    <RotateCcw className={cn("h-4 w-4", resetting && "animate-spin")} />
                    {resetting ? 'Resetting...' : 'Reset'}
                </Button>
            )}
        </div>
    );
};
