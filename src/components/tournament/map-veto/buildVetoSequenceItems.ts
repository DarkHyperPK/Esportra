import type { VetoHistoryEntry } from '@/hooks/useVetoHistory';
import type { VetoStepDto } from '@/types/veto';
import {
    getBestOf,
    getSidePickerTeam,
    getTeamForAction,
    getVetoFormat,
    VetoService,
    isVetoLive,
    type GameMap,
    type MatchMapVeto,
} from '@/hooks/useMapVetoMachine';
import type { VetoActionKind } from './vetoActionPresentation';

export interface VetoSequenceItem {
    actionNumber: number;
    action: VetoActionKind;
    teamName: string;
    mapName?: string;
    mapImageUrl?: string | null;
    side?: 'attack' | 'defend' | null;
    status: 'done' | 'current' | 'upcoming';
}

interface BuildOptions {
    veto?: MatchMapVeto | null;
    entries: VetoHistoryEntry[];
    bestOf: number;
    team1Name: string;
    team2Name: string;
    team1Id?: string | null;
    team2Id?: string | null;
    availableMaps?: GameMap[];
    allAvailableMaps?: GameMap[];
    game?: string;
    doneOnly?: boolean;
    externalSequence?: VetoStepDto[];
}

type NormalizedStep = { actionNumber: number; action: string; isDecider: boolean; teamId: string };

function normalizeBannedMaps(bannedMaps: unknown): string[] {
    if (!bannedMaps) return [];
    if (Array.isArray(bannedMaps)) return bannedMaps.filter((id): id is string => typeof id === 'string');
    if (typeof bannedMaps === 'string') {
        try {
            const parsed = JSON.parse(bannedMaps);
            return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [bannedMaps];
        } catch {
            return [bannedMaps];
        }
    }
    return [];
}

function toDoneItem(entry: VetoHistoryEntry): VetoSequenceItem {
    return {
        actionNumber: entry.actionNumber,
        action: entry.action,
        teamName: entry.teamName,
        mapName: entry.mapName,
        mapImageUrl: entry.mapImageUrl,
        side: entry.side,
        status: 'done',
    };
}

function resolveSteps(options: BuildOptions, veto: MatchMapVeto, service: VetoService): NormalizedStep[] {
    const effectiveTeam1Id = veto.team1_id || options.team1Id || 'team1';
    const effectiveTeam2Id = veto.team2_id || options.team2Id || 'team2';

    if (options.externalSequence && options.externalSequence.length > 0) {
        return options.externalSequence.map((step) => ({
            actionNumber: step.actionNumber,
            action: step.action,
            isDecider: step.isDecider,
            teamId: step.team === 'T1' ? effectiveTeam1Id : effectiveTeam2Id,
        }));
    }

    if (!isVetoLive(veto)) return [];

    const currentBestOf = getBestOf(options.bestOf || veto.best_of);
    return service.getSequence(getVetoFormat(currentBestOf)).map((step) => ({
        actionNumber: step.actionNumber,
        action: step.action,
        isDecider: Boolean(step.isDecider),
        teamId: step.action === 'pick_side'
            ? getSidePickerTeam(step.actionNumber, currentBestOf, effectiveTeam1Id, effectiveTeam2Id, service)
            : getTeamForAction(step.actionNumber, currentBestOf, effectiveTeam1Id, effectiveTeam2Id, service),
    }));
}

/**
 * Merge recorded history with the planned sequence: done steps come from history,
 * the current and upcoming steps from the veto format (or the organizer's custom sequence).
 */
export function buildVetoSequenceItems(options: BuildOptions): VetoSequenceItem[] {
    const { veto, entries, doneOnly = false, team1Name, team2Name } = options;
    const entryItems = entries.map(toDoneItem);

    if (!veto || doneOnly || veto.status === 'completed') {
        return entryItems;
    }

    const mapLookup = (options.allAvailableMaps?.length ? options.allAvailableMaps : options.availableMaps) ?? [];
    const service = new VetoService(options.game ?? 'valorant', mapLookup.length || undefined);
    const steps = resolveSteps(options, veto, service);
    if (steps.length === 0) return [];

    const effectiveTeam1Id = veto.team1_id || options.team1Id || 'team1';
    const resolvedThrough = Math.max(0, (veto.current_action_number ?? 1) - 1);
    const trustedEntries = entries.filter((entry) => entry.actionNumber <= resolvedThrough);
    const usedMapIds = new Set([
        ...normalizeBannedMaps(veto.team1_banned_maps),
        ...normalizeBannedMaps(veto.team2_banned_maps),
        ...(veto.team1_picked_maps || []).map((picked) => picked.map_id),
        ...(veto.team2_picked_maps || []).map((picked) => picked.map_id),
    ]);
    const remainingMaps = mapLookup.filter((map) => !usedMapIds.has(map.id));

    return steps.map((step) => {
        const historyEntry = trustedEntries.find((entry) => entry.actionNumber === step.actionNumber);
        if (historyEntry) return toDoneItem(historyEntry);

        const previousEntry = trustedEntries.find((entry) => entry.actionNumber === step.actionNumber - 1);
        const status = veto.current_action_number === step.actionNumber ? 'current' : 'upcoming';
        const canResolveDeciderMap = step.isDecider && (
            status === 'current'
            || resolvedThrough >= step.actionNumber - 1
            || remainingMaps.length === 1
        );
        const deciderMap = canResolveDeciderMap ? remainingMaps[0] : undefined;
        const isSideStep = step.action === 'pick_side';

        return {
            actionNumber: step.actionNumber,
            action: step.action as VetoActionKind,
            teamName: step.teamId === effectiveTeam1Id ? team1Name : team2Name,
            mapName: isSideStep ? previousEntry?.mapName || deciderMap?.map_name : deciderMap?.map_name,
            mapImageUrl: isSideStep ? previousEntry?.mapImageUrl || deciderMap?.map_image_url : deciderMap?.map_image_url,
            status,
        };
    });
}
