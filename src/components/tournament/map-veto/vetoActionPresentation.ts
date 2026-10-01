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

/**
 * Veto actions are told apart by their noun (BAN / PICK / SIDE), never by colour alone.
 * Picks shape the series, so they read in bone white; bans recede to grey.
 * Rose is reserved for the live turn cue and is never used for an action.
 */
export function getVetoActionClasses(action: VetoActionKind | string, variant: 'chip' | 'text' | 'border' | 'surface' = 'chip') {
    const isPick = action === 'pick' || action === 'auto_decider';
    const isSide = action === 'pick_side';
    const isIgnore = action === 'ignore';

    if (variant === 'text') {
        if (isIgnore) return 'text-zinc-600';
        return isPick ? 'text-white' : isSide ? 'text-zinc-200' : 'text-zinc-400';
    }

    if (variant === 'border') {
        if (isIgnore) return 'border-white/[0.06]';
        return isPick ? 'border-white/30' : isSide ? 'border-white/15' : 'border-white/10';
    }

    if (variant === 'surface') {
        if (isIgnore) return 'bg-transparent';
        return isPick ? 'bg-white/[0.08]' : isSide ? 'bg-white/[0.05]' : 'bg-white/[0.03]';
    }

    if (isIgnore) return 'border border-white/[0.06] bg-transparent text-zinc-600';

    return cn(
        'border',
        isPick && 'border-white/30 bg-white/[0.08] text-white',
        isSide && 'border-white/15 bg-white/[0.05] text-zinc-200',
        !isPick && !isSide && 'border-white/10 bg-white/[0.03] text-zinc-400',
    );
}

export function getVetoActionHoverClasses(action: VetoActionKind | string) {
    if (action === 'pick' || action === 'auto_decider') {
        return 'hover:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.45)]';
    }
    return 'hover:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.3)]';
}

/** Instruction for the team on the clock, in the referee's voice. */
export function getVetoInstruction(action: VetoActionKind | string | null | undefined) {
    switch (action) {
        case 'ban':
            return 'Ban a map';
        case 'pick':
            return 'Pick a map';
        case 'pick_side':
            return 'Choose your starting side';
        default:
            return 'Make your choice';
    }
}

/** What the other side sees while a team is on the clock. */
export function getVetoSpectatorLine(teamName: string, action: VetoActionKind | string | null | undefined) {
    switch (action) {
        case 'ban':
            return `${teamName} is banning a map`;
        case 'pick':
            return `${teamName} is picking a map`;
        case 'pick_side':
            return `${teamName} is choosing a side`;
        default:
            return `Waiting for ${teamName}`;
    }
}

