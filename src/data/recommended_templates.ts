export interface StageTemplate {
    id: string;
    name: string;
    description: string;
    stages: {
        name: string;
        format: 'single_elimination' | 'double_elimination' | 'swiss' | 'round_robin';
        best_of: number;
        advancement_count?: number; // Optional, can be calculated or set by user
        settings?: any;
    }[];
}

export const RECOMMENDED_TEMPLATES: StageTemplate[] = [
    {
        id: 'single_elim_cup',
        name: 'Standard Cup',
        description: 'Classic Single Elimination bracket. Simple and fast.',
        stages: [
            {
                name: 'Main Bracket',
                format: 'single_elimination',
                best_of: 1
            }
        ]
    },
    {
        id: 'double_elim_cup',
        name: 'Pro Cup',
        description: 'Double Elimination bracket. Teams have a second chance in the lower bracket.',
        stages: [
            {
                name: 'Main Bracket',
                format: 'double_elimination',
                best_of: 3
            }
        ]
    },
    {
        id: 'groups_to_playoffs',
        name: 'World Cup Style',
        description: 'Group Stage (Round Robin) followed by Single Elimination Playoffs.',
        stages: [
            {
                name: 'Group Stage',
                format: 'round_robin',
                best_of: 1,
                advancement_count: 8, // Default assumption, user can change
                settings: { group_count: 4 }
            },
            {
                name: 'Playoffs',
                format: 'single_elimination',
                best_of: 3
            }
        ]
    },
    {
        id: 'swiss_to_playoffs',
        name: 'Major Format',
        description: 'Swiss System followed by Single Elimination Playoffs. Used in major esports events.',
        stages: [
            {
                name: 'Swiss Stage',
                format: 'swiss',
                best_of: 1,
                advancement_count: 8,
                settings: { swiss_rounds: 5 }
            },
            {
                name: 'Playoffs',
                format: 'single_elimination',
                best_of: 3
            }
        ]
    }
];
