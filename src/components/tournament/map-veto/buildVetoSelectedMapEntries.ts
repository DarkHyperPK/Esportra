import {
    MatchMapVeto,
    PickedMap,
    getVetoFormat,
    getTeamForAction,
    getSidePickerTeam,
    VetoService,
} from '@/hooks/useMapVetoMachine';

export interface VetoMapLookupEntry {
    id: string;
    map_name: string;
    map_image_url?: string | null;
}

export interface VetoSelectedMapEntry {
    map_id: string;
    map_name: string;
    map_image_url?: string | null;
    side?: 'attack' | 'defend';
    mapPickerTeamName: string;
    mapNumber: number;
}

function normalizePickedMaps(pickedMaps: unknown): PickedMap[] {
    if (!pickedMaps) return [];
    if (Array.isArray(pickedMaps)) return pickedMaps;
    if (typeof pickedMaps === 'string') {
        try {
            const parsed = JSON.parse(pickedMaps);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }
    return [pickedMaps as PickedMap];
}

function normalizeBannedMaps(bannedMaps: unknown): string[] {
    if (!bannedMaps) return [];
    if (Array.isArray(bannedMaps)) return bannedMaps.filter((id) => typeof id === 'string');
    if (typeof bannedMaps === 'string') {
        try {
            const parsed = JSON.parse(bannedMaps);
            return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : [];
        } catch {
            return [];
        }
    }
    return [];
}

/** Derive ordered selected maps (explicit picks + decider) from veto state. */
export function buildVetoSelectedMapEntries(options: {
    veto: MatchMapVeto;
    bestOf: number;
    game?: string;
    mapLookup: VetoMapLookupEntry[];
    team1Name: string;
    team2Name: string;
    team1Id?: string | null;
    team2Id?: string | null;
}): VetoSelectedMapEntry[] {
    const {
        veto,
        bestOf,
        game = 'valorant',
        mapLookup,
        team1Name,
        team2Name,
        team1Id,
        team2Id,
    } = options;

    const poolSize = veto.selected_map_pool?.length || mapLookup.length || undefined;
    const service = new VetoService(game, poolSize);
    const currentBestOf = bestOf || 1;
    const vetoFormat = getVetoFormat(currentBestOf);

    const effectiveTeam1Id = veto.team1_id || team1Id;
    const effectiveTeam2Id = veto.team2_id || team2Id;
    if (!effectiveTeam1Id || !effectiveTeam2Id) return [];

    const team1Picks = normalizePickedMaps(veto.team1_picked_maps);
    const team2Picks = normalizePickedMaps(veto.team2_picked_maps);

    const mapsWithSides: VetoSelectedMapEntry[] = [];
    const sequence = service.getSequence(vetoFormat);
    const usedMapIds = new Set<string>();
    let mapNumber = 1;

    for (const step of sequence) {
        if (step.action !== 'pick') continue;

        const mapPickerTeamId = getTeamForAction(
            step.actionNumber,
            vetoFormat,
            effectiveTeam1Id,
            effectiveTeam2Id,
            service,
        );
        const pickerTeamPicks = mapPickerTeamId === effectiveTeam1Id ? team1Picks : team2Picks;

        for (const pickedMapData of pickerTeamPicks) {
            const mapId = (pickedMapData as { map_id?: string })?.map_id;
            if (!mapId || usedMapIds.has(mapId)) continue;

            usedMapIds.add(mapId);
            const map = mapLookup.find((entry) => entry.id === mapId);
            mapsWithSides.push({
                map_id: mapId,
                map_name: map?.map_name || 'Selected map',
                map_image_url: map?.map_image_url,
                side: (pickedMapData as { side?: 'attack' | 'defend' })?.side,
                mapPickerTeamName: mapPickerTeamId === effectiveTeam1Id ? team1Name : team2Name,
                mapNumber: mapNumber++,
            });
            break;
        }
    }

    const deciderStep = sequence.find((step) => step.isDecider && step.action === 'pick_side');
    if (!deciderStep) return mapsWithSides;

    const currentActionNum = veto.current_action_number || 0;
    if (currentActionNum < deciderStep.actionNumber && veto.status !== 'completed') {
        return mapsWithSides;
    }

    const finalSidePickerTeamId = getSidePickerTeam(
        deciderStep.actionNumber,
        vetoFormat,
        effectiveTeam1Id,
        effectiveTeam2Id,
        service,
    );

    const team1Bans = normalizeBannedMaps(veto.team1_banned_maps);
    const team2Bans = normalizeBannedMaps(veto.team2_banned_maps);
    const allBannedMapIds = new Set([...team1Bans, ...team2Bans]);

    const deciderMap = mapLookup.find((entry) => entry.id === veto.selected_map_id)
        || mapLookup.find((entry) => !allBannedMapIds.has(entry.id) && !usedMapIds.has(entry.id));

    if (!deciderMap || usedMapIds.has(deciderMap.id)) {
        return mapsWithSides;
    }

    const finalSidePickerPicks = finalSidePickerTeamId === effectiveTeam1Id ? team1Picks : team2Picks;
    const deciderPickData = finalSidePickerPicks.find(
        (pick) => (pick as { map_id?: string }).map_id === deciderMap.id,
    ) as { side?: 'attack' | 'defend' } | undefined;

    mapsWithSides.push({
        map_id: deciderMap.id,
        map_name: deciderMap.map_name,
        map_image_url: deciderMap.map_image_url,
        side: deciderPickData?.side,
        mapPickerTeamName: 'Decider',
        mapNumber: mapNumber++,
    });

    return mapsWithSides;
}
