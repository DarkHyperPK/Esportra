export interface PrizeReward {
    type: string;
    title: string;
    description?: string;
    estimated_value?: number;
    quantity: number;
    fulfillment_notes?: string;
}

export interface PrizeDistributionEntry {
    position: number;
    label: string;
    percentage: number;
    shared_count: number;
    rewards?: PrizeReward[];
}

export interface PrizeDistributionConfig {
    mode: 'percentage';
    placements: PrizeDistributionEntry[];
    disclaimer?: string;
}

export interface PrizeDistributionTemplatePreviewRow {
    position: number;
    label: string;
    percentage: number;
    shared_count: number;
    band_total: number;
    per_team: number;
    currency: string;
}

export interface PrizeDistributionTemplate {
    name: string;
    description: string;
    format: string;
    team_count: number;
    distribution: PrizeDistributionConfig;
    preview: PrizeDistributionTemplatePreviewRow[];
}

export interface ResolvedPlacement {
    team_id: string;
    team_name: string;
    team_logo?: string;
    placement: number;
    placement_label: string;
    prize_amount: number;
    currency: string;
    rewards: PrizeReward[];
    is_tied: boolean;
    resolved_at?: string;
}

export interface CashPayout {
    id: string;
    team_id: string;
    team_name: string;
    placement: number;
    placement_label?: string;
    amount: number;
    currency: string;
    payment_method: 'manual' | 'gateway';
    manual_payment_notes?: string;
    status: 'requested' | 'approved' | 'rejected' | 'paid' | 'failed';
    initiated_at?: string;
    paid_at?: string;
    failed_reason?: string;
    updated_at?: string;
}

export interface RewardDistribution {
    id: string;
    team_id: string;
    team_name: string;
    placement: number;
    placement_label?: string;
    reward_index: number;
    reward_title: string;
    reward_type: string;
    status: 'pending' | 'distributed' | 'claimed' | 'cancelled';
    notes?: string;
    distributed_by?: string;
    distributed_at?: string;
}

export interface TournamentPayoutsResponse {
    payment_method: 'manual' | 'gateway';
    manual_payout_notes?: string;
    gateway_available: boolean;
    payouts: CashPayout[];
}
