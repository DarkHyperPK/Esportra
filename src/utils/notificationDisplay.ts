export interface DenseScheduleNotificationMeta {
  tournamentName: string | null;
  detailLines: string[];
  actionLabel: string;
}

export interface MatchScheduleNotificationMeta extends DenseScheduleNotificationMeta {
  stageName: string | null;
  matchLabel: string | null;
  matchup: string | null;
  timeLabel: string | null;
  scheduleCleared: boolean;
}

function readString(data: Record<string, unknown>, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = data[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
}

function formatMatchLabelFromData(data: Record<string, unknown>): string | null {
  const explicit = readString(data, 'match_label');
  if (explicit) return explicit;

  const matchNumber = typeof data.match_number === 'number' ? data.match_number : null;
  const roundIndex = typeof data.round_index === 'number' ? data.round_index : null;
  if (matchNumber === null) return null;

  if (roundIndex !== null && roundIndex >= 0) {
    return `Round ${roundIndex + 1}, Match ${matchNumber}`;
  }

  return `Match ${matchNumber}`;
}

function formatTimeLabel(data: Record<string, unknown>): string | null {
  const scheduledTime = readString(data, 'scheduled_time', 'scheduled_at');
  if (scheduledTime) {
    const parsed = new Date(scheduledTime);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: 'UTC',
        timeZoneName: 'short',
      });
    }
  }

  return readString(data, 'time_label');
}

function legacyMessageLines(message?: string | null): string[] | null {
  if (!message) return null;
  const lines = message.split('\n').map((line) => line.trim()).filter(Boolean);
  return lines.length > 0 ? lines : null;
}

function buildBrContextLine(data: Record<string, unknown>): string | null {
  const stageName = readString(data, 'stage_name');
  const groupLabel = readString(data, 'group_label');
  const waveNumber = typeof data.wave_number === 'number' ? data.wave_number : null;
  const parts = [
    stageName,
    groupLabel,
    waveNumber && waveNumber > 0 ? `Matchday ${waveNumber}` : null,
  ].filter(Boolean) as string[];
  return parts.length > 0 ? parts.join(' · ') : null;
}

export function getBrScheduleNotificationMeta(notification: {
  type?: string;
  message?: string | null;
  data?: Record<string, unknown> | null;
}): DenseScheduleNotificationMeta | null {
  if (notification.type !== 'br_game_schedule_changed' && notification.type !== 'br_lobby_schedule_changed') {
    return null;
  }

  const data = notification.data ?? {};
  const scheduleCleared = !readString(data, 'scheduled_at');
  const tournamentName = readString(data, 'tournament_name');
  const contextLine = buildBrContextLine(data);
  const gameNumber = typeof data.game_number === 'number' ? data.game_number : null;
  const waveNumber = typeof data.wave_number === 'number' ? data.wave_number : null;
  const lobbyCode = readString(data, 'lobby_code');
  const timeLabel = scheduleCleared
    ? 'Time TBD'
    : (formatTimeLabel(data) ?? 'Schedule updated');

  const detailLines: string[] = [];
  if (tournamentName) detailLines.push(tournamentName);
  if (contextLine) detailLines.push(contextLine);
  if (notification.type === 'br_game_schedule_changed' && gameNumber !== null) {
    detailLines.push(`Game ${gameNumber}`);
  } else if (notification.type === 'br_lobby_schedule_changed') {
    detailLines.push(waveNumber && waveNumber > 0 ? `Round ${waveNumber}` : 'Lobby schedule');
  }
  detailLines.push(timeLabel);
  if (lobbyCode) detailLines.push(`Lobby code: ${lobbyCode}`);

  const hasStructuredContent = !!(tournamentName || contextLine || readString(data, 'scheduled_at'));
  if (!hasStructuredContent) {
    const legacyLines = legacyMessageLines(notification.message);
    if (legacyLines) {
      return {
        tournamentName,
        detailLines: legacyLines,
        actionLabel: 'Open BR game room',
      };
    }
  }

  return {
    tournamentName,
    detailLines,
    actionLabel: 'Open BR game room',
  };
}

export function getDenseScheduleNotificationMeta(notification: {
  type?: string;
  title?: string;
  message?: string | null;
  data?: Record<string, unknown> | null;
}): DenseScheduleNotificationMeta | null {
  const walkoverMeta = getMatchWalkoverNotificationMeta(notification);
  if (walkoverMeta) return walkoverMeta;

  const matchMeta = getMatchScheduleNotificationMeta(notification);
  if (matchMeta) {
    return {
      tournamentName: matchMeta.tournamentName,
      detailLines: matchMeta.detailLines,
      actionLabel: 'Open match room',
    };
  }
  return getBrScheduleNotificationMeta(notification);
}

function formatMatchupFromData(data: Record<string, unknown>): string | null {
  const explicit = readString(data, 'matchup');
  if (explicit) return explicit;

  const team1 = readString(data, 'team1_name');
  const team2 = readString(data, 'team2_name');
  if (!team1 && !team2) return null;

  return `${team1 ?? 'TBD'} vs ${team2 ?? 'TBD'}`;
}

export function getMatchWalkoverNotificationMeta(notification: {
  type?: string;
  message?: string | null;
  data?: Record<string, unknown> | null;
}): DenseScheduleNotificationMeta | null {
  if (notification.type !== 'match_walkover') return null;

  const data = notification.data ?? {};
  const audience = readString(data, 'audience');
  const reason = readString(data, 'reason');
  if (audience !== 'organizer' || reason !== 'neither_checked_in') return null;

  const tournamentName = readString(data, 'tournament_name');
  const stageName = readString(data, 'stage_name');
  const matchLabel = formatMatchLabelFromData(data);
  const matchup = formatMatchupFromData(data);

  const detailLines: string[] = [];
  if (stageName) detailLines.push(stageName);
  if (matchLabel) detailLines.push(matchLabel);
  if (matchup) detailLines.push(matchup);
  detailLines.push('Neither team checked in before the window closed.');
  detailLines.push('Review or reset the forfeited match from the bracket.');

  const hasStructuredContent = !!(stageName || matchLabel || matchup);
  if (!hasStructuredContent && notification.message) {
    const legacyLines = legacyMessageLines(notification.message);
    if (legacyLines) {
      return {
        tournamentName,
        detailLines: legacyLines,
        actionLabel: 'Open bracket',
      };
    }
  }

  return {
    tournamentName,
    detailLines,
    actionLabel: 'Open bracket',
  };
}

export function getMatchScheduleNotificationMeta(notification: {
  type?: string;
  message?: string | null;
  data?: Record<string, unknown> | null;
}): MatchScheduleNotificationMeta | null {
  if (notification.type !== 'match_schedule_changed') return null;

  const data = notification.data ?? {};
  const scheduleCleared = data.schedule_cleared === true || !readString(data, 'scheduled_time');
  const tournamentName = readString(data, 'tournament_name');
  const stageName = readString(data, 'stage_name');
  const matchLabel = formatMatchLabelFromData(data);
  const matchup = formatMatchupFromData(data);
  const timeLabel = scheduleCleared
    ? 'Time TBD'
    : (formatTimeLabel(data) ?? 'Scheduled time updated');

  const detailLines: string[] = [];
  if (stageName) detailLines.push(stageName);
  if (matchLabel) detailLines.push(matchLabel);
  if (matchup) detailLines.push(matchup);
  detailLines.push(timeLabel);

  const hasStructuredContent = !!(
    stageName
    || matchup
    || readString(data, 'scheduled_time')
    || readString(data, 'time_label')
  );

  if (!hasStructuredContent && notification.message) {
    const legacyLines = legacyMessageLines(notification.message);
    if (legacyLines) {
      return {
        tournamentName,
        stageName,
        matchLabel,
        matchup,
        timeLabel,
        scheduleCleared,
        detailLines: legacyLines,
        actionLabel: 'Open match room',
      };
    }
  }

  return {
    tournamentName,
    stageName,
    matchLabel,
    matchup,
    timeLabel,
    scheduleCleared,
    detailLines,
    actionLabel: 'Open match room',
  };
}

export function isCaptainMatchNotification(type?: string): boolean {
  return type === 'match_schedule_changed'
    || type === 'match_ready'
    || type === 'match_walkover'
    || type === 'result_disputed'
    || type === 'dispute_resolved'
    || type === 'dispute_rejected'
    || type === 'veto_your_turn'
    || type === 'veto_completed';
}
