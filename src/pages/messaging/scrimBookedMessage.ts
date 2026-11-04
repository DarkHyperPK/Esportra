export interface ScrimBookedMessage {
  game: string;
  when: string;
  path: string;
}

const SCRIM_BOOKED = /^Scrim booked:\s*(.+?)\s+—\s+(.+?)\s+—\s+Match Room:\s*(\/competitive\/scrims\/sessions\/[0-9a-f-]{8,64})\s*$/i;

/** Parses the system DM posted when a scrim is booked; returns null for ordinary messages. */
export function parseScrimBookedMessage(content: string): ScrimBookedMessage | null {
  const match = SCRIM_BOOKED.exec(content.trim());
  if (!match) return null;
  return { game: match[1], when: match[2], path: match[3] };
}

/** Short text for conversation list previews. */
export function messagePreview(content: string): string {
  const scrim = parseScrimBookedMessage(content);
  return scrim ? `Scrim booked · ${scrim.game.replace(/-/g, ' ')} · ${scrim.when}` : content;
}
