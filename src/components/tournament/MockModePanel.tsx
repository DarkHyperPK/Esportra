import { useState } from 'react';
import { Bot, Trash2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button-variants';
import { Badge } from '@/components/ui/badge';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useMockTournament } from '@/hooks/useMockTournament';
import { useAuth } from '@/hooks/useAuth';

interface MockModePanelProps {
    tournamentId: string;
    slug: string;
    maxTeams: number;
    mockCount: number;
    canGenerate?: boolean;
}

export function MockModePanel({ tournamentId, slug, maxTeams, mockCount, canGenerate = true }: MockModePanelProps) {
    const { user } = useAuth();
    const { generate, clear } = useMockTournament({ tournamentId, slug, userId: user?.id });
    const [clearConfirmOpen, setClearConfirmOpen] = useState(false);

    const hasMock = mockCount > 0;

    return (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
            <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-lg bg-amber-500/10 p-2">
                    <Bot className="h-4 w-4 text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold text-amber-300">Mock Tournament Mode</h3>
                        {hasMock && (
                            <Badge variant="outline" className="border-amber-500/40 text-amber-400 text-xs">
                                {mockCount} mock team{mockCount !== 1 ? 's' : ''} active
                            </Badge>
                        )}
                    </div>
                    <p className="mt-1 text-xs text-zinc-400 leading-relaxed">
                        Populate this draft tournament with fictitious teams to test bracket generation
                        and stage flow — without engaging real users. Mock teams are automatically blocked
                        from being published.
                    </p>

                    <div className="mt-4 flex items-center gap-2 flex-wrap">
                        {canGenerate && (
                            <button type="button"
                                className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'border-amber-500/30 text-amber-300 hover:bg-amber-500/10 h-8 text-xs')}
                                disabled={generate.isPending}
                                onClick={() => generate.mutate(maxTeams)}
                            >
                                <Bot className="mr-1.5 h-3.5 w-3.5" />
                                {generate.isPending
                                    ? 'Generating...'
                                    : hasMock
                                        ? 'Regenerate mock teams'
                                        : `Generate ${maxTeams} mock teams`}
                            </button>
                        )}

                        {hasMock && (
                            <AlertDialog open={clearConfirmOpen} onOpenChange={setClearConfirmOpen}>
                                <AlertDialogTrigger asChild>
                                    <button type="button"
                                        className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'text-red-400 hover:bg-red-500/10 h-8 text-xs')}
                                        disabled={clear.isPending}
                                    >
                                        <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                                        {clear.isPending ? 'Clearing…' : 'Clear mock data'}
                                    </button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="bg-[#0a0a0c] border-white/10">
                                    <AlertDialogHeader>
                                        <AlertDialogTitle className="flex items-center gap-2">
                                            <AlertTriangle className="h-5 w-5 text-amber-400" />
                                            Clear mock data
                                        </AlertDialogTitle>
                                        <AlertDialogDescription className="text-zinc-400">
                                            This will remove all {mockCount} mock team{mockCount !== 1 ? 's' : ''}
                                            {' '}and any bracket data generated from them. Your tournament settings
                                            and stage configuration will not be affected.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel className="bg-transparent border-white/10 hover:bg-white/5">
                                            Cancel
                                        </AlertDialogCancel>
                                        <AlertDialogAction
                                            className="bg-red-600 hover:bg-red-700 text-white"
                                            onClick={() => clear.mutate()}
                                        >
                                            Clear mock data
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
