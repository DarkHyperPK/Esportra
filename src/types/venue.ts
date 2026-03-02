
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
    stations: number;
    hours: string;
    games: string; // Comma separated string usually
    contact_email: string;
    contact_phone: string;
    image_url: string | null;
    images?: string[] | null;
    card_image?: string | null;
    price_range: string;
    price_per_hour?: number;
    rating: number;
    slug?: string;
    owner_id?: string;
    amenities?: string[];
    location?: string;
    openNow?: boolean;
    priceRange?: string;
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
    // Metadata for DB
    created_at?: string;
    updated_at?: string;
}
