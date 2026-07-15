export type InvitationStatus = 'draft' | 'sent' | 'redeemed' | 'expired' | 'revoked';

export interface TournamentInvitation {
  id: string;
  tournamentId: string;
  email: string;
  code: string | null;
  status: InvitationStatus;
  teamId?: string | null;
  teamName?: string | null;
  sentAt?: string | null;
  redeemedAt?: string | null;
  expiresAt: string;
  createdAt: string;
}

export interface TournamentInvitationSummary {
  reservedSlots: number;
  activeSlots: number;
  usedSlots: number;
  remainingSlots: number;
}

export interface TournamentInvitationsResult {
  invitations: TournamentInvitation[];
  summary: TournamentInvitationSummary;
}

export const EMPTY_INVITATION_SUMMARY: TournamentInvitationSummary = {
  reservedSlots: 0,
  activeSlots: 0,
  usedSlots: 0,
  remainingSlots: 0,
};

export interface CreateInvitationsRequest {
  emails: string[];
}

export interface SendInvitationsRequest {
  invitationIds?: string[];
}

export interface RedeemInvitationRequest {
  code: string;
  teamId?: string;
  rosterId?: string;
  rosterLineup?: string;
}

export interface RedeemInvitationResponse {
  success: boolean;
  tournamentId: string;
  tournamentSlug?: string | null;
  tournamentName?: string | null;
  participant?: Record<string, unknown>;
}

export interface InvitationPreview {
  canRedeem: boolean;
  emailMatch: boolean;
  status: InvitationStatus | 'not_found';
  tournamentId?: string;
  tournamentSlug?: string | null;
  tournamentName?: string | null;
  tournamentGame?: string | null;
  tournamentGameMode?: string | null;
  tournamentTeamSize?: number | null;
  tournamentStatus?: string | null;
  expiresAt?: string | null;
  message?: string;
}
