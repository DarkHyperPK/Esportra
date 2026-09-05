import { describe, expect, it } from 'vitest';
import { generateSequence, R6S_CONFIG } from '../sequences';
import { VetoService } from '../vetoService';

describe('VetoService R6 9-map sequences', () => {
    const service = new VetoService('rainbow six siege', 9);

    it('BO1 pure-ban produces 8 bans and decider side pick for 9-map pool', () => {
        const sequence = service.getSequence(1);
        expect(sequence).toHaveLength(9);
        expect(sequence.filter((step) => step.action === 'ban')).toHaveLength(8);
        expect(sequence.at(-1)).toMatchObject({
            action: 'pick_side',
            isDecider: true,
            team: 'T1',
        });
    });

    it('BO3 with 9-map pool has expected action count and decider', () => {
        const sequence = service.getSequence(3);
        expect(sequence).toHaveLength(11);
        expect(sequence.filter((step) => step.action === 'pick')).toHaveLength(2);
        expect(sequence.filter((step) => step.action === 'pick_side')).toHaveLength(3);
        expect(sequence.at(-1)?.isDecider).toBe(true);
    });

    it('BO5 throws when pool is too small for five-map series', () => {
        expect(() => generateSequence(6, 5, R6S_CONFIG.bo1Style)).toThrow(/too small/i);
    });

    it('BO5 with 9-map pool is valid', () => {
        const sequence = service.getSequence(5);
        expect(sequence.length).toBeGreaterThan(0);
        expect(sequence.at(-1)).toMatchObject({
            action: 'pick_side',
            team: 'T2',
            isDecider: true,
        });
    });

    it('isDeciderAction identifies final side pick for R6 BO1', () => {
        expect(service.isDeciderAction(1, 9)).toBe(true);
        expect(service.isDeciderAction(1, 8)).toBe(false);
    });
});

describe('VetoService Valorant 7-map regression', () => {
    const service = new VetoService('valorant', 7);

    it('BO1 pure-ban sequence produces 7 actions', () => {
        const sequence = service.getSequence(1);
        expect(sequence).toHaveLength(7);
        expect(sequence.filter((step) => step.action === 'ban')).toHaveLength(6);
        expect(sequence.filter((step) => step.action === 'pick')).toHaveLength(0);
        expect(sequence.filter((step) => step.action === 'pick_side')).toHaveLength(1);
        expect(sequence.at(-1)).toMatchObject({
            action: 'pick_side',
            isDecider: true,
            team: 'T1',
        });
    });

    it('BO5 decider side pick goes to T2', () => {
        const sequence = service.getSequence(5);
        const decider = sequence.at(-1);
        expect(decider).toMatchObject({
            action: 'pick_side',
            team: 'T2',
            isDecider: true,
        });
    });

    it('BO3 decider side pick remains T1', () => {
        const sequence = service.getSequence(3);
        const decider = sequence.at(-1);
        expect(decider).toMatchObject({
            action: 'pick_side',
            team: 'T1',
            isDecider: true,
        });
    });
});
