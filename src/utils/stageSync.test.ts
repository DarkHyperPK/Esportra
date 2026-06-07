import { describe, expect, it } from 'vitest';
import { buildStageSyncPayload, mapTournamentStageToSyncDto } from '@/utils/stageSync';

describe('stageSync', () => {
  it('maps existing stages and appends a new stage for batch PUT sync', () => {
    const payload = buildStageSyncPayload(
      [
        {
          id: 'stage-1',
          name: 'Qualifiers',
          format: 'swiss',
          stage_order: 1,
          capacity: 32,
          advancement_count: 8,
          best_of: 1,
          config: { swiss_groups: 4 },
        },
      ],
      {
        name: 'Finals',
        format: 'single_elimination',
        capacity: 8,
        advancementCount: 1,
        bestOf: 3,
      },
    );

    expect(payload).toHaveLength(2);
    expect(payload[0]).toMatchObject({
      id: 'stage-1',
      stageOrder: 1,
      advancementCount: 8,
      config: { swiss_groups: 4 },
    });
    expect(payload[1]).toMatchObject({
      id: null,
      name: 'Finals',
      stageOrder: 2,
      bestOf: 3,
    });
  });

  it('normalizes invalid best-of values to 1', () => {
    const dto = mapTournamentStageToSyncDto({
      id: 'stage-2',
      name: 'Playoffs',
      format: 'double_elimination',
      stage_order: 2,
      best_of: 4,
    });

    expect(dto.bestOf).toBe(1);
  });
});
