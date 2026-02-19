export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            sponsors: {
                Row: {
                    id: string
                    name: string
                    tagline: string | null
                    description: string | null
                    website_url: string
                    logo_url: string | null
                    banner_image_url: string | null
                    accent_color: string | null
                    tier: string | null
                    placement: string[] | null
                    cta_text: string | null
                    discount_text: string | null
                    is_active: boolean
                    priority: number
                    gallery_images: string[] | null
                    created_at: string
                    updated_at?: string
                }
                Insert: {
                    id?: string
                    name: string
                    tagline?: string | null
                    description?: string | null
                    website_url: string
                    logo_url?: string | null
                    banner_image_url?: string | null
                    accent_color?: string | null
                    tier?: string | null
                    placement?: string[] | null
                    cta_text?: string | null
                    discount_text?: string | null
                    is_active?: boolean
                    priority?: number
                    gallery_images?: string[] | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    name?: string
                    tagline?: string | null
                    description?: string | null
                    website_url?: string
                    logo_url?: string | null
                    banner_image_url?: string | null
                    accent_color?: string | null
                    tier?: string | null
                    placement?: string[] | null
                    cta_text?: string | null
                    discount_text?: string | null
                    is_active?: boolean
                    priority?: number
                    gallery_images?: string[] | null
                    created_at?: string
                    updated_at?: string
                }
            }
            sponsor_accounts: {
                Row: {
                    id: string
                    user_id: string
                    sponsor_id: string
                    role: 'owner' | 'viewer'
                    invited_by: string | null
                    invited_at: string | null
                    accepted_at: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    sponsor_id: string
                    role?: 'owner' | 'viewer'
                    invited_by?: string | null
                    invited_at?: string | null
                    accepted_at?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    sponsor_id?: string
                    role?: 'owner' | 'viewer'
                    invited_by?: string | null
                    invited_at?: string | null
                    accepted_at?: string | null
                    created_at?: string
                }
            }
            sponsor_impressions: {
                Row: {
                    id: string
                    sponsor_id: string
                    event_type: string
                    page_url: string | null
                    metadata: Json | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    sponsor_id: string
                    event_type: string
                    page_url?: string | null
                    metadata?: Json | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    sponsor_id?: string
                    event_type?: string
                    page_url?: string | null
                    metadata?: Json | null
                    created_at?: string
                }
            }
        }
    }
}
