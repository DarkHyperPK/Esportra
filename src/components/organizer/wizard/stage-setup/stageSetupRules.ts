/**
 * Pure rules for the stage setup wizard: formats, series lengths,
 * validation and the helpers that link one stage to the next.
 * No React, no I/O, so it's unit-tested on its own.
 */

export interface StageConfig {
    id?: string; // For editing existing stages
    name: string;
    format: string;
    capacity: number | '';
    advancement_count: number | '';
    best_of: number;
    bo_mode: 'per_stage' | 'per_round';
    round_bo_overrides: Record<string, number>;
    settings?: {
        swiss_rounds?: number;
        group_count?: number;
        swiss_groups?: number;
        points_per_win?: number;
        points_per_draw?: number;
        points_per_loss?: number;
        use_check_in_only?: boolean;
    };
}

export const DEFAULT_STAGE_CONFIG: StageConfig = {
    name: '',
    format: 'single_elimination',
    capacity: '',
    advancement_count: '',
    best_of: 1,
    bo_mode: 'per_stage',
    round_bo_overrides: {},
};

export const FORMAT_LABELS: Record<string, string> = {
    single_elimination: 'Single elimination',
    double_elimination: 'Double elimination',
    round_robin: 'Round robin',
    swiss: 'Swiss',
};

export const formatLabel = (format: string): string => FORMAT_LABELS[format] ?? format.replace(/_/g, ' ');

/** Smallest field each format can run with. */
export const FORMAT_MIN_TEAMS: Record<string, number> = {
    single_elimination: 2,
    double_elimination: 4,
    swiss: 4,
    round_robin: 3,
};

// Maps series format strings from catalog game features to display labels and numeric best_of values
export const SERIES_FORMAT_MAP: Record<string, { label: string; value: number }> = {
    bo1: { label: 'Best of 1', value: 1 },
    bo2: { label: 'Best of 2', value: 2 },
    bo3: { label: 'Best of 3', value: 3 },
    bo5: { label: 'Best of 5', value: 5 },
    bo7: { label: 'Best of 7', value: 7 },
    ft2: { label: 'First to 2', value: 3 },
    ft3: { label: 'First to 3', value: 5 },
    ft5: { label: 'First to 5', value: 9 },
};

export const DEFAULT_SERIES_OPTIONS = [
    { label: 'Best of 1', value: 1 },
    { label: 'Best of 3', value: 3 },
    { label: 'Best of 5', value: 5 },
];

export type SeriesGameData = { features?: { seriesFormats?: string[] } } | null | undefined;

/** The series lengths a game supports, as select options. */
export function getSeriesOptions(gameData: SeriesGameData) {
    const formats = gameData?.features?.seriesFormats;
    if (!formats || formats.length === 0) return DEFAULT_SERIES_OPTIONS;
    return formats.map((f) => SERIES_FORMAT_MAP[f]).filter(Boolean);
}

/** Display label for a best_of value in this game's terms ("First to 3" etc.). */
export function getBestOfLabel(bestOf: number, gameData: SeriesGameData): string {
    const formats = gameData?.features?.seriesFormats;
    if (formats) {
        const match = formats.map((f) => SERIES_FORMAT_MAP[f]).find((m) => m && m.value === bestOf);
        if (match) return match.label;
    }
    return `Best of ${bestOf}`;
}

export const isPowerOfTwo = (n: number): boolean => n > 0 && (n & (n - 1)) === 0;

const isElimination = (format: string) => format === 'single_elimination' || format === 'double_elimination';

export function validateStageConfig(
    stage: StageConfig,
    totalParticipants: number = 0,
    tournamentMaxParticipants: number | null = null,
): { valid: boolean; error?: string } {
    const configuredCapacity = typeof stage.capacity === 'number' ? stage.capacity : 0;
    // Unset capacity means "everyone": validate against the real field size instead.
    const effectiveCapacity = configuredCapacity > 0 ? configuredCapacity : totalParticipants;
    const advancementCount = typeof stage.advancement_count === 'number' ? stage.advancement_count : 0;
    const minTeams = FORMAT_MIN_TEAMS[stage.format] || 2;

    if (effectiveCapacity > 0 && effectiveCapacity < minTeams) {
        return { valid: false, error: `${formatLabel(stage.format)} needs at least ${minTeams} teams.` };
    }
    if (advancementCount > 0 && isElimination(stage.format) && !isPowerOfTwo(advancementCount)) {
        return { valid: false, error: `In ${formatLabel(stage.format).toLowerCase()}, the number moving on must be a power of 2 (2, 4, 8…).` };
    }
    if (advancementCount > 0 && effectiveCapacity > 0 && advancementCount >= effectiveCapacity) {
        return { valid: false, error: 'Fewer teams must move on than play in the stage, or nobody is knocked out.' };
    }
    if (tournamentMaxParticipants !== null && configuredCapacity > tournamentMaxParticipants) {
        return { valid: false, error: `This stage holds ${configuredCapacity} teams, but the tournament is capped at ${tournamentMaxParticipants}.` };
    }
    return { valid: true };
}

/** Powers of 2 below capacity, largest first. Unknown capacity offers up to 128. */
export function getAdvancementOptions(capacity: number): number[] {
    const options: number[] = [];
    const max = capacity > 0 ? capacity : 256;
    for (let n = 2; n < max; n *= 2) options.push(n);
    return options.reverse();
}

/**
 * Swiss group count: powers of 2 only (so every group sends the same number
 * through), never more groups than places, groups of at least 16, aiming
 * for about 32 teams per group.
 */
export function calculateSwissConfig(capacity: number, advancement: number): number {
    if (capacity <= 0) return 1;
    let bestGroups = 1;
    let minDiff = Number.MAX_VALUE;
    for (const g of [1, 2, 4, 8, 16]) {
        if (advancement > 0 && g > advancement) continue;
        const groupSize = capacity / g;
        if (groupSize < 16 && g > 1) continue;
        const diff = Math.abs(groupSize - 32);
        if (diff < minDiff) {
            minDiff = diff;
            bestGroups = g;
        }
    }
    return bestGroups;
}

/** Rounds needed for a clear top group in Swiss: log2(group size) + 2. */
export const swissRoundsFor = (capacity: number, groups: number): number =>
    Math.ceil(Math.log2(capacity / groups)) + 2;

const UNUSUAL_TRANSITIONS: Record<string, string[]> = {
    single_elimination: ['round_robin'],
    double_elimination: ['swiss', 'round_robin'],
};

/** A heads-up (never a block) for stage orders organisers rarely want. */
export function getFormatTransitionWarning(prevFormat: string | undefined, newFormat: string): string | null {
    if (!prevFormat || !UNUSUAL_TRANSITIONS[prevFormat]?.includes(newFormat)) return null;
    return `${formatLabel(prevFormat)} followed by ${formatLabel(newFormat).toLowerCase()} is unusual. Most events run Swiss or round robin first, then a bracket.`;
}

/** "16 teams · top 8 move on", for lists and review. */
export function stageFacts(stage: StageConfig): string {
    const teams = stage.capacity ? `${stage.capacity} teams` : 'Everyone still in';
    return stage.advancement_count ? `${teams} · top ${stage.advancement_count} move on` : teams;
}

/** A stage row as the API returns it; JSON columns may arrive as strings. */
export interface ExistingStageRow {
    id: string;
    name: string;
    format: string;
    capacity?: number | null;
    advancement_count?: number | null;
    best_of?: number | null;
    bo_mode?: 'per_stage' | 'per_round' | null;
    round_bo_overrides?: Record<string, number> | string | null;
    config?: Record<string, unknown> | string | null;
}

const parseJsonObject = <T,>(value: T | string | null | undefined): T | Record<string, never> => {
    if (typeof value !== 'string') return value ?? {};
    try { return JSON.parse(value); } catch { return {}; }
};

const SETTING_KEYS = ['swiss_groups', 'swiss_rounds', 'group_count', 'points_per_win', 'points_per_draw', 'points_per_loss', 'use_check_in_only'] as const;

/** Turns a saved stage back into the form's shape, keeping only settings that were set. */
export function stageFromExisting(row: ExistingStageRow): StageConfig {
    const config = parseJsonObject(row.config) as Record<string, unknown>;
    const settings = Object.fromEntries(SETTING_KEYS.filter((k) => config[k] != null).map((k) => [k, config[k]]));
    return {
        id: row.id,
        name: row.name,
        format: row.format,
        capacity: row.capacity || '',
        advancement_count: row.advancement_count || '',
        best_of: row.best_of || 1,
        bo_mode: row.bo_mode || 'per_stage',
        round_bo_overrides: parseJsonObject(row.round_bo_overrides) as Record<string, number>,
        settings: settings as StageConfig['settings'],
    };
}

interface TemplateStage {
    name: string;
    format: string;
    best_of: number;
    bo_mode?: 'per_stage' | 'per_round';
    round_bo_overrides?: Record<string, number>;
    advancement_count?: number;
    capacity?: number;
    settings?: StageConfig['settings'];
}

/**
 * Fits a template to this tournament: stage 1 takes the tournament cap,
 * places that exceed the real field shrink to the largest power of 2
 * below it, and Swiss stages get groups and rounds sized to the field.
 */
export function stagesFromTemplate(stages: TemplateStage[], participantsCount: number, tournamentMax: number | null): StageConfig[] {
    return stages.map((s, i) => {
        let adv = s.advancement_count;
        if (typeof adv === 'number' && participantsCount > 0 && adv >= participantsCount) {
            let adjusted = 1;
            while (adjusted * 2 < participantsCount) adjusted *= 2;
            adv = adjusted;
        }
        const cap = i === 0 && tournamentMax ? tournamentMax : Number(s.capacity) || 0;
        let swissGroups = s.settings?.swiss_groups || 1;
        let swissRounds = s.settings?.swiss_rounds;
        const effectiveCap = cap || participantsCount;
        if (s.format === 'swiss' && effectiveCap > 0 && (adv ?? 0) > 0) {
            swissGroups = calculateSwissConfig(effectiveCap, adv ?? 0);
            swissRounds = swissRounds || swissRoundsFor(effectiveCap, swissGroups);
        }
        return {
            name: s.name,
            format: s.format,
            capacity: i === 0 && tournamentMax ? tournamentMax : '',
            advancement_count: adv || '',
            best_of: s.best_of,
            bo_mode: s.bo_mode || 'per_stage',
            round_bo_overrides: s.round_bo_overrides || {},
            settings: { ...s.settings, swiss_groups: swissGroups, swiss_rounds: swissRounds },
        };
    });
}

/**
 * Adds the form's stage (or replaces the one being edited) and keeps the
 * chain linked: places moving on from a stage become the next stage's size.
 */
export function commitStage(stages: StageConfig[], form: StageConfig, editingIndex: number | null): StageConfig[] {
    if (editingIndex !== null) {
        const next = stages.map((s, i) => (i === editingIndex ? { ...form } : s));
        const adv = Number(form.advancement_count);
        if (form.advancement_count && editingIndex < next.length - 1 && !isNaN(adv)) {
            next[editingIndex + 1] = { ...next[editingIndex + 1], capacity: adv };
        }
        return next;
    }
    const prev = stages[stages.length - 1];
    const added = prev?.advancement_count ? { ...form, capacity: Number(prev.advancement_count) } : { ...form };
    return [...stages, added];
}

/** Formats the current field is too small for, with the reason to show. */
export function formatsTooSmallFor(capacity: number | ''): Partial<Record<string, string>> {
    if (typeof capacity !== 'number') return {};
    return Object.fromEntries(
        Object.entries(FORMAT_MIN_TEAMS)
            .filter(([, min]) => capacity < min)
            .map(([format, min]) => [format, `needs ${min}+ teams`]),
    );
}

/** Typed single-field setter for the stage form. */
export type StageFieldChange = <K extends keyof StageConfig>(field: K, value: StageConfig[K]) => void;
export type StageFieldUpdate = <K extends keyof StageConfig>(index: number, field: K, value: StageConfig[K]) => void;
