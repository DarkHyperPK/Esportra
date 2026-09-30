/**
 * useCompletionState.ts
 *
 * Computes completion state for each configuration panel based on tournament data.
 * Returns per-panel required/recommended missing fields and overall canPublish flag.
 */

import { useMemo } from 'react';
import type { DashboardTournament, DashboardStage } from '@/hooks/useTournamentDashboard';

export interface PanelCompletionState {
  requiredMissing: string[];
  recommendedMissing: string[];
  isComplete: boolean;
}

export interface CompletionSummary {
  panels: Record<string, PanelCompletionState>;
  totalRequiredMissing: number;
  totalRecommendedMissing: number;
  canPublish: boolean;
  blockingPanels: string[];
}

export function useCompletionState(
  tournament: DashboardTournament | undefined,
  stages: DashboardStage[],
  distributionComplete?: boolean,
  mapPoolEmpty?: boolean
): CompletionSummary {
  return useMemo(() => {
    if (!tournament) {
      // No tournament data — all incomplete
      return {
        panels: {},
        totalRequiredMissing: 0,
        totalRecommendedMissing: 0,
        canPublish: false,
        blockingPanels: [],
      };
    }

    const panels: Record<string, PanelCompletionState> = {};

    // ── Basic Info Panel ──
    const basicRequired: string[] = [];
    const basicRecommended: string[] = [];

    if (!tournament.name || tournament.name.trim() === '') {
      basicRequired.push('name');
    }
    if (!tournament.description || tournament.description.trim() === '') {
      basicRecommended.push('description');
    }

    panels['basic-info'] = {
      requiredMissing: basicRequired,
      recommendedMissing: basicRecommended,
      isComplete: basicRequired.length === 0 && basicRecommended.length === 0,
    };

    // ── Format & Stages Panel ──
    const formatRequired: string[] = [];
    const formatRecommended: string[] = [];

    if (!stages || stages.length === 0) {
      formatRequired.push('stages');
    }

    panels['format-stages'] = {
      requiredMissing: formatRequired,
      recommendedMissing: formatRecommended,
      isComplete: formatRequired.length === 0 && formatRecommended.length === 0,
    };

    // ── Registration Panel ──
    const registrationRequired: string[] = [];
    const registrationRecommended: string[] = [];

    if (!tournament.registration_deadline || tournament.registration_deadline.trim() === '') {
      registrationRequired.push('registration_deadline');
    }
    if (!tournament.max_teams || tournament.max_teams <= 0) {
      registrationRequired.push('max_teams');
    }
    if (tournament.check_in_required && !tournament.check_in_deadline) {
      registrationRecommended.push('check_in_deadline');
    }

    panels['registration'] = {
      requiredMissing: registrationRequired,
      recommendedMissing: registrationRecommended,
      isComplete: registrationRequired.length === 0 && registrationRecommended.length === 0,
    };

    // ── Prize & Payouts Panel ──
    const prizeRequired: string[] = [];
    const prizeRecommended: string[] = [];

    const prizePool = parseFloat(tournament.prize_pool || '0');
    if (prizePool > 0) {
      // Require distribution to sum to 100% when a prize pool is set.
      // distributionComplete === undefined means still loading — don't block publish.
      if (distributionComplete === false) {
        prizeRequired.push('distribution');
      }
    } else {
      prizeRecommended.push('prize_pool');
    }

    panels['prize-payouts'] = {
      requiredMissing: prizeRequired,
      recommendedMissing: prizeRecommended,
      isComplete: prizeRequired.length === 0 && prizeRecommended.length === 0,
    };

    // ── Branding Panel ──
    const brandingRequired: string[] = [];
    const brandingRecommended: string[] = [];

    if (!tournament.banner_url || tournament.banner_url.trim() === '') {
      brandingRecommended.push('banner_url');
    }
    if (!tournament.logo_url || tournament.logo_url.trim() === '') {
      brandingRecommended.push('logo_url');
    }

    panels['branding'] = {
      requiredMissing: brandingRequired,
      recommendedMissing: brandingRecommended,
      isComplete: brandingRequired.length === 0 && brandingRecommended.length === 0,
    };

    // ── Staff Panel ──
    panels['staff'] = {
      requiredMissing: [],
      recommendedMissing: [],
      isComplete: true,
    };

    // ── Match Settings Panel (nav id: 'settings') ──
    const settingsRecommended: string[] = [];
    if (mapPoolEmpty) settingsRecommended.push('map_pool');
    panels['settings'] = {
      requiredMissing: [],
      recommendedMissing: settingsRecommended,
      isComplete: settingsRecommended.length === 0,
    };

    // ── Summary ──
    const allPanels = Object.values(panels);
    const totalRequiredMissing = allPanels.reduce((sum, p) => sum + p.requiredMissing.length, 0);
    const totalRecommendedMissing = allPanels.reduce((sum, p) => sum + p.recommendedMissing.length, 0);
    const blockingPanels = Object.entries(panels)
      .filter(([, state]) => state.requiredMissing.length > 0)
      .map(([key]) => key);

    return {
      panels,
      totalRequiredMissing,
      totalRecommendedMissing,
      canPublish: totalRequiredMissing === 0,
      blockingPanels,
    };
  }, [tournament, stages, distributionComplete, mapPoolEmpty]);
}
