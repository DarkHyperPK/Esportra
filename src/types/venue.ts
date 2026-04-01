
export type VenueStatus = 'draft' | 'pending_review' | 'published' | 'rejected' | 'suspended' | 'archived';
export type VenueSubscriptionTier = 'free' | 'basic' | 'pro' | 'enterprise';

export interface Venue {
    id: string;
    name: string;
    city: string;
    state?: string;
    country?: string;
    address: string;
    description: string;
    postal_code?: string;
    stations: number;
    hours: string;
    games: string; // Comma separated string usually
    contact_email: string;
    contact_phone: string;
    images?: string[] | null;
    card_image?: string | null;
    price_per_hour: number;
    currency?: string;
    slug?: string;
    owner_id?: string;
    amenities?: string[];
    pc_specs?: Record<string, string> | null;
    latitude?: number;
    longitude?: number;
    // Venue management fields
    venue_id?: string;
    status?: VenueStatus;
    rejection_reason?: string;
    reviewed_by?: string;
    reviewed_at?: string;
    submitted_at?: string;
    published_at?: string;
    subscription_tier?: VenueSubscriptionTier;
    desktop_pairing_token?: string;
    // Metadata
    created_at?: string;
    updated_at?: string;
}
