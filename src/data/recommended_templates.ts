export interface StageTemplate {
    id: string;
    name: string;
    description: string;
    stages: {
        name: string;
        format: 'single_elimination' | 'double_elimination' | 'swiss' | 'round_robin';
        best_of: number;
        bo_mode?: 'per_stage' | 'per_round';
        round_bo_overrides?: Record<string, number>;
        advancement_count?: number;
        capacity?: number;
        settings?: any;
    }[];
    category?: 'standard';
}

export const RECOMMENDED_TEMPLATES: StageTemplate[] = [
    {
        id: 'single_elim_cup',
        name: 'Standard Cup',
        description: 'Classic Single Elimination bracket. Simple and fast.',
        category: 'standard',
        stages: [
            {
                name: 'Main Bracket',
                format: 'single_elimination',
                best_of: 1,
                bo_mode: 'per_stage'
            }
        ]
    },
    {
        id: 'double_elim_cup',
        name: 'Pro Cup',
        description: 'Double Elimination bracket with escalating series formats.',
        category: 'standard',
        stages: [
            {
                name: 'Main Bracket',
                format: 'double_elimination',
                best_of: 1,
                bo_mode: 'per_round',
                round_bo_overrides: {
                    'winners_round_1': 1,
                    'winners_round_2': 3,
                    'winners_final': 3,
                    'losers_round_1': 1,
                    'losers_round_2': 1,
                    'losers_final': 3,
                    'grand_final': 5
                }
            }
        ]
    },
    {
        id: 'groups_to_playoffs',
        name: 'World Cup Style',
        description: 'Group Stage (Round Robin) followed by Single Elimination Playoffs.',
        category: 'standard',
        stages: [
            {
                name: 'Group Stage',
                format: 'round_robin',
                best_of: 1,
                bo_mode: 'per_stage',
                advancement_count: 8,
                settings: { group_count: 4 }
            },
            {
                name: 'Playoffs',
                format: 'single_elimination',
                best_of: 3,
                bo_mode: 'per_stage'
            }
        ]
    },
    {
        id: 'swiss_to_playoffs',
        name: 'Major Format',
        description: 'Swiss System followed by Single Elimination Playoffs. Used in major esports events.',
        category: 'standard',
        stages: [
            {
                name: 'Swiss Stage',
                format: 'swiss',
                best_of: 1,
                bo_mode: 'per_stage',
                advancement_count: 8,
                settings: { swiss_rounds: 5 }
            },
            {
                name: 'Playoffs',
                format: 'single_elimination',
                best_of: 1,
                bo_mode: 'per_round',
                round_bo_overrides: {
                    'round_1': 3,
                    'round_2': 3,
                    'final': 5
                }
            }
        ]
    }
];
