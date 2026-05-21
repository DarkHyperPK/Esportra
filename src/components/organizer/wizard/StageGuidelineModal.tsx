import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertCircle, GitBranch, Layers, ShieldCheck, Sparkles, Trophy, Users } from 'lucide-react';

interface StageGuidelineModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const guidance = [
    {
        icon: Trophy,
        title: 'Opening Stage Capacity',
        body: 'Stage 1 always uses the tournament max capacity. Edit tournament details to change the field size; stage management keeps it read-only so registrations, groups, and brackets do not drift.',
    },
    {
        icon: GitBranch,
        title: 'Advancement Flow',
        body: 'Every stage after the opener should match the number of teams advancing from the previous stage. If Stage 1 advances 16 teams, Stage 2 capacity should be 16.',
    },
    {
        icon: Layers,
        title: 'Groups',
        body: 'Round-robin, Swiss, and battle royale group stages can be shown publicly once groups or bracket data exist. Keep group setup complete before announcing the public page.',
    },
    {
        icon: Sparkles,
        title: 'Mock Mode',
        body: 'Mock teams are for testing brackets and flow only. They can be regenerated while the tournament has no real participants, payments, completed matches, or result reports.',
    },
    {
        icon: ShieldCheck,
        title: 'Publishing',
        body: 'Clear mock teams before publishing. Public tournaments expose stages, brackets, and group data, so verify names, capacity, schedule, and rules first.',
    },
    {
        icon: Users,
        title: 'Registration Integrity',
        body: 'Direct registrations belong to the tournament participant list. Later stages should receive teams through advancement, not manual capacity changes.',
    },
];

export const StageGuidelineModal: React.FC<StageGuidelineModalProps> = ({ open, onOpenChange }) => {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[84vh] bg-[#050506] text-white border-white/10 rounded-none">
                <DialogHeader>
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center border border-rose-500/40 bg-rose-500/10">
                            <AlertCircle className="h-5 w-5 text-rose-400" />
                        </div>
                        <div>
                            <DialogTitle className="font-heading text-2xl uppercase tracking-wide">
                                Tournament Guidelines
                            </DialogTitle>
                            <DialogDescription className="mt-1 text-zinc-400">
                                Fast operational rules for stages, groups, mock mode, and publishing.
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <ScrollArea className="max-h-[62vh] pr-3">
                    <div className="grid gap-4 md:grid-cols-2">
                        {guidance.map((item) => {
                            const Icon = item.icon;
                            return (
                                <section key={item.title} className="border border-white/10 bg-white/[0.03] p-5">
                                    <div className="mb-3 flex items-center gap-3">
                                        <div className="flex h-9 w-9 items-center justify-center border border-white/10 bg-black">
                                            <Icon className="h-4 w-4 text-rose-400" />
                                        </div>
                                        <h3 className="text-sm font-black uppercase tracking-[0.18em] text-white">
                                            {item.title}
                                        </h3>
                                    </div>
                                    <p className="text-sm leading-6 text-zinc-400">{item.body}</p>
                                </section>
                            );
                        })}
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
};
