import { cn } from '@/lib/utils';
import type { VetoHistoryAction } from '@/hooks/useVetoHistory';
import type { MatchMapVeto } from '@/hooks/useMapVetoMachine';

export type VetoActionKind = VetoHistoryAction | NonNullable<MatchMapVeto['current_action']>;
export type VetoSide = 'attack' | 'defend';

export function getVetoActionLabel(
    action: VetoActionKind | string,
    side?: VetoSide | null,
    tense: 'past' | 'present' = 'past',
) {
    switch (action) {
        case 'ban':
            return tense === 'present' ? 'banning' : 'banned';
        case 'pick':
            return tense === 'present' ? 'picking' : 'picked';
        case 'pick_side':
            if (tense === 'present') {
                return side ? `choosing ${getSideShortLabel(side)} on` : 'choosing side for';
            }
            return side ? `chose ${getSideShortLabel(side)} on` : 'chose side for';
        case 'auto_decider':
            return 'decider';
        case 'ignore':
            return tense === 'present' ? 'auto-removing' : 'auto-removed';
        default:
            return action.replace(/_/g, ' ');
    }
}

export function getVetoActionNoun(action: VetoActionKind | string) {
    switch (action) {
        case 'ban':
            return 'BAN';
        case 'pick':
            return 'PICK';
        case 'pick_side':
            return 'SIDE';
        case 'auto_decider':
            return 'DECIDER';
        case 'ignore':
            return 'AUTO';
        default:
            return action.replace(/_/g, ' ').toUpperCase();
    }
}

export function getSideShortLabel(side?: VetoSide | null) {
    if (side === 'attack') return 'ATK';
    if (side === 'defend') return 'DEF';
    return 'SIDE';
}

export function getSideFullLabel(side?: VetoSide | null) {
    if (side === 'attack') return 'ATTACK';
    if (side === 'defend') return 'DEFENSE';
    return 'SIDE';
}

export function getVetoActionClasses(action: VetoActionKind | string, variant: 'chip' | 'text' | 'border' | 'surface' = 'chip') {
    const isPick = action === 'pick' || action === 'auto_decider';
    const isSide = action === 'pick_side';
    const isIgnore = action === 'ignore';

    if (variant === 'text') {
        if (isIgnore) return 'text-zinc-500';
        return isPick ? 'text-zinc-300' : isSide ? 'text-white/70' : 'text-rose-300';
    }

    if (variant === 'border') {
        if (isIgnore) return 'border-zinc-700/50';
        return isPick ? 'border-zinc-500/40' : isSide ? 'border-white/20' : 'border-rose-500/35';
    }

    if (variant === 'surface') {
        if (isIgnore) return 'bg-zinc-800/40';
        return isPick ? 'bg-zinc-700/20' : isSide ? 'bg-white/[0.06]' : 'bg-rose-500/10';
    }

    if (isIgnore) return 'border border-zinc-700/40 bg-zinc-800/30 text-zinc-500';

    return cn(
        'border',
        isPick && 'border-zinc-500/40 bg-zinc-700/20 text-zinc-200',
        isSide && 'border-white/20 bg-white/[0.06] text-white/80',
        !isPick && !isSide && 'border-rose-500/35 bg-rose-500/10 text-rose-300',
    );
}

export function getVetoActionHoverClasses(action: VetoActionKind | string) {
    if (action === 'pick' || action === 'auto_decider') {
        return 'border-zinc-500/40 hover:border-zinc-400 hover:shadow-zinc-500/15';
    }

    if (action === 'pick_side') {
        return 'border-white/25 hover:border-white/50 hover:shadow-white/10';
    }

    return 'border-rose-500/40 hover:border-rose-400 hover:shadow-rose-500/20';
}
