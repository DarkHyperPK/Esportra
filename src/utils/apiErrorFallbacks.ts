export type ApiErrorContext =
  | 'inviteRedeem'
  | 'invitePreview'
  | 'brLobbyUpdate'
  | 'brLobbyCreate'
  | 'brLobbyReset'
  | 'brResults'
  | 'brEvidence'
  | 'brGroups'
  | 'brStageSchedule'
  | 'brStageSetup'
  | 'registration'
  | 'tournamentPublish'
  | 'tournamentPrivate'
  | 'tournamentWithdraw'
  | 'checkIn'
  | 'dispute'
  | 'generic';

export const API_ERROR_FALLBACKS: Record<ApiErrorContext, string> = {
  inviteRedeem: 'Invite redemption failed. Check the code and try again.',
  invitePreview: 'Could not verify this invitation code.',
  brLobbyUpdate: 'Lobby settings could not be saved. Refresh and try again.',
  brLobbyCreate: 'Could not create this lobby. Check the group setup.',
  brLobbyReset: 'Could not reset this lobby. Refresh and try again.',
  brResults: 'Could not save results. Check every placement and try again.',
  brEvidence: 'Could not submit evidence. Refresh and try again.',
  brGroups: 'Could not update groups for this stage.',
  brStageSchedule: 'Could not save the stage schedule.',
  brStageSetup: 'Could not save stage setup. Review the configuration.',
  registration: 'Registration failed. Review your details and try again.',
  tournamentPublish: 'Could not publish this tournament. Check required settings.',
  tournamentPrivate: 'Could not make this tournament private. Try again.',
  tournamentWithdraw: 'Could not withdraw from this tournament.',
  checkIn: 'Check-in failed. Try again closer to match time.',
  dispute: 'Could not file this dispute. Try again.',
  generic: "We couldn't complete that request. Please refresh and try again.",
};

export function getApiErrorFallback(context: ApiErrorContext = 'generic'): string {
  return API_ERROR_FALLBACKS[context] ?? API_ERROR_FALLBACKS.generic;
}
