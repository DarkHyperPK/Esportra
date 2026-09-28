/**
 * tournamentEditability.ts
 *
 * Determines which tournament fields can be edited based on tournament status and user permissions.
 * Fields are progressively locked as the tournament advances through its lifecycle.
 */

type TournamentStatus = 'draft' | 'published' | 'open' | 'ongoing' | 'completed';

/**
 * Returns the set of editable field names for the given tournament status.
 * @param status Current tournament status
 * @param isSuperAdmin Whether the user is a super admin (can edit everything)
 * @returns Set of field names that can be edited, or Set(['*']) for "all fields"
 */
export function getEditableFields(status: TournamentStatus, isSuperAdmin: boolean): Set<string> {
  if (isSuperAdmin) {
    // Super admins can edit everything regardless of status
    return new Set(['*']);
  }

  // Always editable fields across all states (branding, prize, announcements, staff)
  const editable = new Set([
    'name',
    'description',
    'rules',
    'branding',
    'banner_url',
    'logo_url',
    'prize_pool',
    'payout_distribution',
    'announcements',
    'staff',
    'discord_webhook_url',
    'stream_url',
  ]);

  if (status === 'draft') {
    // Everything is editable in draft
    return new Set(['*']);
  }

  if (status === 'published') {
    // After publish but before registration opens, these additional fields remain editable
    editable.add('entry_fee');
    editable.add('currency');
    editable.add('max_teams');
    editable.add('registration_deadline');
    editable.add('registration_type');
    editable.add('check_in_required');
    editable.add('check_in_deadline');
    editable.add('map_pool');
    editable.add('veto_sequence');
    editable.add('start_date');
    editable.add('end_date');
    editable.add('invited_teams');
    return editable;
  }

  if (status === 'open') {
    // Registration is open — entry fee and currency locked, but map pool and dates still editable
    editable.add('map_pool');
    editable.add('veto_sequence');
    editable.add('start_date');
    editable.add('end_date');
    return editable;
  }

  // ongoing/completed — only minimal fields remain editable
  return editable;
}

/**
 * Check if a specific field is editable.
 * @param field Field name to check
 * @param status Current tournament status
 * @param isSuperAdmin Whether the user is a super admin
 */
export function isFieldEditable(
  field: string,
  status: TournamentStatus,
  isSuperAdmin: boolean
): boolean {
  const fields = getEditableFields(status, isSuperAdmin);
  return fields.has('*') || fields.has(field);
}

/**
 * Get the reason why a field is locked, or null if it's editable.
 * @param field Field name
 * @param status Current tournament status
 * @returns User-facing lock reason or null
 */
export function getLockReason(field: string, status: TournamentStatus): string | null {
  // Nothing is locked in draft
  if (status === 'draft') {
    return null;
  }

  // Structural fields locked after publish
  const structuralFields = new Set([
    'game',
    'game_mode',
    'team_size',
    'format',
    'stage_structure',
    'multi_stage',
  ]);

  if (structuralFields.has(field)) {
    return 'Locked after publish';
  }

  // Registration-related fields locked after registration opens
  const registrationFields = new Set([
    'entry_fee',
    'currency',
    'max_teams',
    'invited_teams',
  ]);

  if (registrationFields.has(field) && ['open', 'ongoing', 'completed'].includes(status)) {
    return 'Locked after registration opens';
  }

  // Live configuration fields locked during ongoing tournament
  const liveFields = new Set([
    'map_pool',
    'veto_sequence',
    'start_date',
    'end_date',
  ]);

  if (liveFields.has(field) && ['ongoing', 'completed'].includes(status)) {
    return 'Locked during ongoing tournament';
  }

  // Field is not locked
  return null;
}
