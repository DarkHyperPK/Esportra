import { useQuery } from '@tanstack/react-query';

/**
 * Public Valorant asset catalogs (agents, maps, ranks, weapons) from valorant-api.com.
 *
 * The raw responses are large (weapons alone carries every skin and runs to
 * several MB), so each catalog is fetched once per session, trimmed to the
 * fields the stats views read, and kept in a small local cache for a day.
 */

const BASE = 'https://valorant-api.com/v1';
const DAY_MS = 24 * 60 * 60 * 1000;
const CACHE_PREFIX = 'esportra:valorant-catalog:v1:';

export interface ValorantAbility { slot?: string; displayIcon?: string; displayName?: string }
export interface ValorantAgent { uuid: string; displayName?: string; displayIcon?: string; abilities?: ValorantAbility[] }
export interface ValorantMap {
    displayName?: string;
    displayIcon?: string;
    listViewIcon?: string;
    mapUrl?: string;
    xMultiplier?: number;
    yMultiplier?: number;
    xScalarToAdd?: number;
    yScalarToAdd?: number;
}
export interface ValorantTier { tier: number; tierName?: string; divisionName?: string; smallIcon?: string; largeIcon?: string }
export interface ValorantWeapon { uuid?: string; displayName?: string; displayIcon?: string }

type Raw = Record<string, unknown>;
type Cached<T> = { at: number; data: T };

const memo = new Map<string, Cached<unknown> | undefined>();

/** Reads the stored copy once per session; later renders reuse it. */
function readCache<T>(key: string): Cached<T> | undefined {
    if (!memo.has(key)) memo.set(key, readStorage<unknown>(key));
    return memo.get(key) as Cached<T> | undefined;
}

function readStorage<T>(key: string): Cached<T> | undefined {
    try {
        const raw = localStorage.getItem(CACHE_PREFIX + key);
        if (!raw) return undefined;
        const parsed = JSON.parse(raw) as Cached<T>;
        return Date.now() - parsed.at < DAY_MS ? parsed : undefined;
    } catch {
        return undefined;
    }
}

function writeCache<T>(key: string, data: T) {
    try {
        localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ at: Date.now(), data }));
    } catch {
        // Storage full or blocked: the in-memory query cache still holds it.
    }
}

async function fetchList(path: string): Promise<Raw[]> {
    const res = await fetch(`${BASE}${path}`);
    if (!res.ok) throw new Error(`valorant-api ${path} ${res.status}`);
    const body = (await res.json()) as { data?: unknown };
    return Array.isArray(body.data) ? (body.data as Raw[]) : [];
}

const str = (value: unknown) => (typeof value === 'string' ? value : undefined);
const num = (value: unknown) => (typeof value === 'number' ? value : undefined);

const slimAgent = (a: Raw): ValorantAgent => ({
    uuid: String(a.uuid ?? ''),
    displayName: str(a.displayName),
    displayIcon: str(a.displayIcon),
    abilities: Array.isArray(a.abilities)
        ? (a.abilities as Raw[]).map((ab) => ({ slot: str(ab.slot), displayIcon: str(ab.displayIcon), displayName: str(ab.displayName) }))
        : undefined,
});

const slimMap = (m: Raw): ValorantMap => ({
    displayName: str(m.displayName),
    displayIcon: str(m.displayIcon),
    listViewIcon: str(m.listViewIcon),
    mapUrl: str(m.mapUrl),
    xMultiplier: num(m.xMultiplier),
    yMultiplier: num(m.yMultiplier),
    xScalarToAdd: num(m.xScalarToAdd),
    yScalarToAdd: num(m.yScalarToAdd),
});

/** Only the latest episode's ladder is used, keyed by tier number. */
function latestTiers(entries: Raw[]): Record<number, ValorantTier> {
    const latest = entries
        .slice()
        .reverse()
        .find((entry) => Array.isArray(entry.tiers) && (entry.tiers as Raw[]).some((t) => t.largeIcon || t.smallIcon));
    const tiers: Record<number, ValorantTier> = {};
    ((latest?.tiers as Raw[] | undefined) ?? []).forEach((t) => {
        const tier = num(t.tier);
        if (tier === undefined) return;
        tiers[tier] = { tier, tierName: str(t.tierName), divisionName: str(t.divisionName), smallIcon: str(t.smallIcon), largeIcon: str(t.largeIcon) };
    });
    return tiers;
}

const slimWeapon = (w: Raw): ValorantWeapon => ({ uuid: str(w.uuid), displayName: str(w.displayName), displayIcon: str(w.displayIcon) });

function useCatalog<T>(key: string, load: () => Promise<T>, enabled: boolean) {
    const cached = readCache<T>(key);
    return useQuery({
        queryKey: ['valorant-catalog', key],
        queryFn: async () => {
            const data = await load();
            writeCache(key, data);
            return data;
        },
        initialData: cached?.data,
        initialDataUpdatedAt: cached?.at,
        staleTime: DAY_MS,
        gcTime: Infinity,
        retry: 1,
        refetchOnWindowFocus: false,
        enabled,
    });
}

/** Playable agents keyed by lowercase uuid. */
export const useValorantAgents = (enabled = true) =>
    useCatalog('agents', async () => {
        const map: Record<string, ValorantAgent> = {};
        (await fetchList('/agents?isPlayableCharacter=true')).map(slimAgent).forEach((agent) => {
            if (agent.uuid) map[agent.uuid.toLowerCase()] = agent;
        });
        return map;
    }, enabled);

export const useValorantMaps = (enabled = true) =>
    useCatalog('maps', async () => (await fetchList('/maps')).map(slimMap), enabled);

export const useValorantTiers = (enabled = true) =>
    useCatalog('tiers', async () => latestTiers(await fetchList('/competitivetiers')), enabled);

export const useValorantWeapons = (enabled = true) =>
    useCatalog('weapons', async () => (await fetchList('/weapons')).map(slimWeapon), enabled);
