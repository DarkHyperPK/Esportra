import { supabase } from '@/lib/supabase';

const API_URL = import.meta.env.VITE_API_URL;

type SponsorEventType = 'impression' | 'click';
type SponsorPlacement = 'logo_ticker' | 'partner_showcase' | 'tournament_sidebar' | 'vertical_ad' | 'unknown';

interface SponsorTrackingEvent {
  eventId: string;
  sponsorId: string;
  eventType: SponsorEventType;
  placement: SponsorPlacement;
  tournamentId?: string;
  pagePath: string;
  schemaVersion: 1;
}

export async function trackSponsorEvent(
  sponsorId: string,
  eventType: SponsorEventType,
  placement: SponsorPlacement,
  tournamentId?: string,
): Promise<void> {
  if (!API_URL || !isUuid(sponsorId)) return;

  const event: SponsorTrackingEvent = {
    eventId: crypto.randomUUID(),
    sponsorId,
    eventType,
    placement,
    ...(tournamentId && isUuid(tournamentId) ? { tournamentId } : {}),
    pagePath: window.location.pathname,
    schemaVersion: 1,
  };

  try {
    const { data: { session } } = await supabase.auth.getSession();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;

    await fetch(`${API_URL}/api/sponsor-analytics/events`, {
      method: 'POST',
      headers,
      body: JSON.stringify(event),
      keepalive: true,
    });
  } catch {
    // Analytics is best effort and must never disrupt navigation.
  }
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
