export type LaunchState = 'draft' | 'private' | 'public';

const TERMINAL_STATUSES = new Set(['ongoing', 'completed', 'closed', 'cancelled', 'check_in']);

export const LAUNCH_STATE_LABELS: Record<LaunchState, string> = {
  draft: 'Draft',
  private: 'Private',
  public: 'Public',
};

export const LAUNCH_STATE_DESCRIPTIONS: Record<LaunchState, string> = {
  draft: 'Accessible via direct link (slug or ID). Hidden from browse and search.',
  private: 'Accessible via direct link (slug or ID). Hidden from browse and search.',
  public: 'Listed in discovery. Anyone can find and join.',
};

/** Map API fields to wizard launch state. */
export function apiToLaunchState(status?: string | null, isPublic?: boolean | null): LaunchState {
  if (status === 'draft') return 'draft';
  if (isPublic === true) return 'public';
  return 'private';
}

/** Map wizard launch state to API payload on create. */
export function launchStateToCreatePayload(launchState: LaunchState): { status: string; isPublic: boolean } {
  switch (launchState) {
    case 'draft':
      return { status: 'draft', isPublic: false };
    case 'private':
      return { status: 'published', isPublic: false };
    case 'public':
      return { status: 'open', isPublic: true };
  }
}

/** Map wizard launch state to API payload on update, preserving lifecycle status when needed. */
export function launchStateToUpdatePayload(
  launchState: LaunchState,
  currentStatus?: string | null,
): { status: string; isPublic: boolean } {
  const status = (currentStatus || '').toLowerCase();

  if (status && TERMINAL_STATUSES.has(status)) {
    return {
      status,
      isPublic: launchState === 'public',
    };
  }

  switch (launchState) {
    case 'draft':
      return { status: 'draft', isPublic: false };
    case 'private':
      return {
        status: status === 'open' ? 'open' : 'published',
        isPublic: false,
      };
    case 'public':
      return {
        status: status === 'published' ? 'published' : 'open',
        isPublic: true,
      };
  }
}

/** Dashboard action: hide from discovery while preserving lifecycle status. */
export function makePrivateUpdatePayload(currentStatus?: string | null): { status: string; isPublic: boolean } {
  return {
    status: currentStatus || 'open',
    isPublic: false,
  };
}

/** Whether a tournament can be viewed via direct link (slug or tournament ID). */
export function canPublicViewTournament(_status: string, _isPublic?: boolean): boolean {
  return true;
}

/** Whether user is organizer, org owner, assigned staff, or admin. */
export function canManageTournamentVisibility(input: {
  isOrganizer?: boolean;
  staffPermissions?: string[] | null;
  isAdmin?: boolean;
}): boolean {
  return Boolean(
    input.isAdmin ||
    input.isOrganizer ||
    (input.staffPermissions && input.staffPermissions.length > 0),
  );
}
