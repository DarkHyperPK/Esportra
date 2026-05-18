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

export interface CreateInvitationsRequest {
  emails: string[];
}

export interface SendInvitationsRequest {
  invitationIds?: string[];
}

export interface RedeemInvitationRequest {
  code: string;
}

export interface RedeemInvitationResponse {
  success: boolean;
  tournamentId: string;
  seasonId?: string | null;
}
