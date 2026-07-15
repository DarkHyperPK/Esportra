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

    if (variant === 'text') {
        return isPick ? 'text-emerald-300' : isSide ? 'text-white' : 'text-rose-300';
    }

    if (variant === 'border') {
        return isPick ? 'border-emerald-500/40' : isSide ? 'border-white/30' : 'border-rose-500/40';
    }

    if (variant === 'surface') {
        return isPick ? 'bg-emerald-500/12' : isSide ? 'bg-white/10' : 'bg-rose-500/12';
    }

    return cn(
        'border',
        isPick && 'border-emerald-500/45 bg-emerald-500/15 text-emerald-200',
        isSide && 'border-white/30 bg-white/10 text-white',
        !isPick && !isSide && 'border-rose-500/45 bg-rose-500/15 text-rose-200',
    );
}

export function getVetoActionHoverClasses(action: VetoActionKind | string) {
    if (action === 'pick' || action === 'auto_decider') {
        return 'border-emerald-500/50 hover:border-emerald-400 hover:shadow-emerald-500/20';
    }

    if (action === 'pick_side') {
        return 'border-white/40 hover:border-white hover:shadow-white/15';
    }

    return 'border-rose-500/50 hover:border-rose-400 hover:shadow-rose-500/20';
}
