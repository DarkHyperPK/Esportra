
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
    rating: number;
    slug?: string;
    owner_id?: string;
    amenities?: string[];
    location?: string;
    openNow?: boolean;
    priceRange?: string;
    // Metadata for DB
    created_at?: string;
    updated_at?: string;
}
