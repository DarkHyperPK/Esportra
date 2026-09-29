import { describe, expect, it } from 'vitest';
import {
    DEFAULT_STAGE_CONFIG,
    calculateSwissConfig,
    commitStage,
    formatLabel,
    formatsTooSmallFor,
    getAdvancementOptions,
    getBestOfLabel,
    getFormatTransitionWarning,
    getSeriesOptions,
    stageFromExisting,
    stagesFromTemplate,
    swissRoundsFor,
    validateStageConfig,
    type StageConfig,
} from '../stageSetupRules';

const stage = (patch: Partial<StageConfig>): StageConfig => ({ ...DEFAULT_STAGE_CONFIG, name: 'Stage', ...patch });

describe('validateStageConfig', () => {
    it('rejects a field smaller than the format minimum, in plain words', () => {
        const result = validateStageConfig(stage({ format: 'double_elimination', capacity: 3 }));
        expect(result).toEqual({ valid: false, error: 'Double elimination needs at least 4 teams.' });
    });

    it('uses the real participant count when capacity is unset', () => {
        expect(validateStageConfig(stage({ format: 'round_robin' }), 2).valid).toBe(false);
        expect(validateStageConfig(stage({ format: 'round_robin' }), 3).valid).toBe(true);
    });

    it('requires a power of 2 moving on in elimination formats only', () => {
        expect(validateStageConfig(stage({ capacity: 16, advancement_count: 6 })).valid).toBe(false);
        expect(validateStageConfig(stage({ format: 'round_robin', capacity: 16, advancement_count: 6 })).valid).toBe(true);
    });

    it('requires fewer teams moving on than playing', () => {
        expect(validateStageConfig(stage({ capacity: 8, advancement_count: 8 })).valid).toBe(false);
        expect(validateStageConfig(stage({ capacity: 8, advancement_count: 4 })).valid).toBe(true);
    });

    it('rejects a stage bigger than the tournament cap', () => {
        const result = validateStageConfig(stage({ capacity: 64 }), 0, 32);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('capped at 32');
    });
});

describe('getAdvancementOptions', () => {
    it('lists powers of 2 below capacity, largest first', () => {
        expect(getAdvancementOptions(16)).toEqual([8, 4, 2]);
        expect(getAdvancementOptions(17)).toEqual([16, 8, 4, 2]);
    });

    it('offers up to 128 when capacity is unknown', () => {
        expect(getAdvancementOptions(0)[0]).toBe(128);
    });
});

describe('calculateSwissConfig', () => {
    it('keeps small fields in one group', () => {
        expect(calculateSwissConfig(32, 8)).toBe(1);
    });

    it('splits big fields toward ~32 per group without exceeding places', () => {
        expect(calculateSwissConfig(128, 16)).toBe(4);
        expect(calculateSwissConfig(128, 2)).toBe(2);
    });

    it('pairs with a round count of log2(group) + 2', () => {
        expect(swissRoundsFor(32, 1)).toBe(7);
    });
});

describe('labels and warnings', () => {
    it('formats every underscore, not just the first', () => {
        expect(formatLabel('single_elimination')).toBe('Single elimination');
        expect(formatLabel('some_new_format')).toBe('some new format');
    });

    it('warns on unusual orders only', () => {
        expect(getFormatTransitionWarning('double_elimination', 'swiss')).toMatch(/unusual/);
        expect(getFormatTransitionWarning('swiss', 'single_elimination')).toBeNull();
        expect(getFormatTransitionWarning(undefined, 'swiss')).toBeNull();
    });

    it('names series in the game’s own terms', () => {
        const game = { features: { seriesFormats: ['bo1', 'ft3'] } };
        expect(getSeriesOptions(game)).toEqual([{ label: 'Best of 1', value: 1 }, { label: 'First to 3', value: 5 }]);
        expect(getBestOfLabel(5, game)).toBe('First to 3');
        expect(getBestOfLabel(3, null)).toBe('Best of 3');
    });
});

describe('stageFromExisting', () => {
    it('parses JSON string columns and keeps only set settings', () => {
        const result = stageFromExisting({
            id: 's1', name: 'Swiss', format: 'swiss', capacity: 32, advancement_count: 8, best_of: 3, bo_mode: null,
            round_bo_overrides: '{"r1":1}', config: '{"swiss_rounds":5,"group_count":null}',
        });
        expect(result).toMatchObject({ id: 's1', capacity: 32, best_of: 3, bo_mode: 'per_stage', round_bo_overrides: { r1: 1 }, settings: { swiss_rounds: 5 } });
        expect(result.settings).not.toHaveProperty('group_count');
    });

    it('falls back to empty values for bad JSON and missing numbers', () => {
        const result = stageFromExisting({ id: 's2', name: 'Final', format: 'single_elimination', round_bo_overrides: '{bad', config: null });
        expect(result).toMatchObject({ capacity: '', advancement_count: '', best_of: 1, round_bo_overrides: {}, settings: {} });
    });
});

describe('stagesFromTemplate', () => {
    const template = [
        { name: 'Swiss', format: 'swiss', best_of: 1, advancement_count: 8 },
        { name: 'Playoffs', format: 'single_elimination', best_of: 3 },
    ];

    it('gives stage 1 the tournament cap and sizes Swiss to it', () => {
        const [first, second] = stagesFromTemplate(template, 0, 32);
        expect(first).toMatchObject({ capacity: 32, advancement_count: 8, settings: { swiss_groups: 1, swiss_rounds: 7 } });
        expect(second.capacity).toBe('');
    });

    it('shrinks places that the real field cannot fill', () => {
        const [first] = stagesFromTemplate(template, 6, null);
        expect(first.advancement_count).toBe(4);
    });
});

describe('commitStage', () => {
    const groups = stage({ name: 'Groups', format: 'round_robin', capacity: 16, advancement_count: 8 });
    const playoffs = stage({ name: 'Playoffs', capacity: 8 });

    it('links a new stage to the places from the one before', () => {
        const result = commitStage([groups], stage({ name: 'Playoffs' }), null);
        expect(result).toHaveLength(2);
        expect(result[1].capacity).toBe(8);
    });

    it('pushes an edited stage’s places into the next stage', () => {
        const result = commitStage([groups, playoffs], { ...groups, advancement_count: 4 }, 0);
        expect(result[1].capacity).toBe(4);
        expect(result[0].advancement_count).toBe(4);
    });

    it('does not mutate the input', () => {
        const input = [groups, playoffs];
        commitStage(input, { ...groups, advancement_count: 4 }, 0);
        expect(input[1].capacity).toBe(8);
    });
});

describe('formatsTooSmallFor', () => {
    it('lists formats the field is too small for', () => {
        expect(formatsTooSmallFor(3)).toEqual({ double_elimination: 'needs 4+ teams', swiss: 'needs 4+ teams' });
        expect(formatsTooSmallFor('')).toEqual({});
    });
});
