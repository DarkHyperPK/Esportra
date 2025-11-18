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
      profiles: {
        Row: {
          id: string
          username: string
          full_name: string | null
          avatar_url: string | null
          email: string | null
          roles: string | null
          updated_at: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          username: string
          full_name?: string | null
          avatar_url?: string | null
          email?: string | null
          roles?: string | null
          updated_at?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          username?: string
          full_name?: string | null
          avatar_url?: string | null
          email?: string | null
          roles?: string | null
          updated_at?: string | null
          created_at?: string | null
        }
      }
      tournament_matches: {
        Row: {
          id: string
          tournament_id: string
          round: number
          position: number
          participant1_id: string | null
          participant2_id: string | null
          winner_id: string | null
          next_match_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tournament_id: string
          round: number
          position: number
          participant1_id?: string | null
          participant2_id?: string | null
          winner_id?: string | null
          next_match_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tournament_id?: string
          round?: number
          position?: number
          participant1_id?: string | null
          participant2_id?: string | null
          winner_id?: string | null
          next_match_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      tournament_participants: {
        Row: {
          id: string
          tournament_id: string
          user_id: string
          registration_type: 'solo' | 'team'
          gamer_tag: string
          team_name: string | null
          team_captain: string | null
          team_members: string | null
          team_email: string | null
          team_phone: string | null
          team_logo: string | null
          created_at: string
          status: 'registered' | 'cancelled'
        }
        Insert: {
          id?: string
          tournament_id: string
          user_id: string
          registration_type: 'solo' | 'team'
          gamer_tag: string
          team_name?: string | null
          team_captain?: string | null
          team_members?: string | null
          team_email?: string | null
          team_phone?: string | null
          team_logo?: string | null
          created_at?: string
          status?: 'registered' | 'cancelled'
        }
        Update: {
          id?: string
          tournament_id?: string
          user_id?: string
          registration_type?: 'solo' | 'team'
          gamer_tag?: string
          team_name?: string | null
          team_captain?: string | null
          team_members?: string | null
          team_email?: string | null
          team_phone?: string | null
          team_logo?: string | null
          created_at?: string
          status?: 'registered' | 'cancelled'
        }
        Relationships: [
          {
            foreignKeyName: "tournament_participants_tournament_id_fkey"
            columns: ["tournament_id"]
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_participants_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      tournaments: {
        Row: {
          id: string
          name: string
          description: string
          game: string
          date: string
          time: string
          venue: string
          max_participants: number
          prize_pool: string
          entry_fee: string | null
          is_online: boolean
          user_id: string
          status: 'upcoming' | 'ongoing' | 'completed'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description: string
          game: string
          date: string
          time: string
          venue: string
          max_participants: number
          prize_pool: string
          entry_fee?: string | null
          is_online?: boolean
          user_id: string
          status?: 'upcoming' | 'ongoing' | 'completed'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string
          game?: string
          date?: string
          time?: string
          venue?: string
          max_participants?: number
          prize_pool?: string
          entry_fee?: string | null
          is_online?: boolean
          user_id?: string
          status?: 'upcoming' | 'ongoing' | 'completed'
          created_at?: string
          updated_at?: string
        }
      }
      user_roles: {
        Row: {
          id: string
          user_id: string
          role: string
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          role: string
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          role?: string
          created_at?: string | null
        }
      }
      venue_bookings: {
        Row: {
          id: string
          venue_id: string
          user_id: string
          date: string
          time_slot: string
          status: string
          created_at: string | null
        }
        Insert: {
          id?: string
          venue_id: string
          user_id: string
          date: string
          time_slot: string
          status?: string
          created_at?: string | null
        }
        Update: {
          id?: string
          venue_id?: string
          user_id?: string
          date?: string
          time_slot?: string
          status?: string
          created_at?: string | null
        }
      }
      venues: {
        Row: {
          id: string
          name: string
          description: string
          location: string
          capacity: number
          amenities: string[]
          hourly_rate: number
          owner_id: string
          created_at: string | null
          image_url: string | null
        }
        Insert: {
          id?: string
          name: string
          description: string
          location: string
          capacity: number
          amenities: string[]
          hourly_rate: number
          owner_id: string
          created_at?: string | null
          image_url?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string
          location?: string
          capacity?: number
          amenities?: string[]
          hourly_rate?: number
          owner_id?: string
          created_at?: string | null
          image_url?: string | null
        }
      }
      tournament_bans: {
        Row: {
          id: string
          tournament_id: string
          user_id: string
          ban_reason: string
          banned_by: string
          created_at: string
        }
        Insert: {
          id?: string
          tournament_id: string
          user_id: string
          ban_reason: string
          banned_by: string
          created_at?: string
        }
        Update: {
          id?: string
          tournament_id?: string
          user_id?: string
          ban_reason?: string
          banned_by?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_bans_tournament_id_fkey"
            columns: ["tournament_id"]
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_bans_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_bans_banned_by_fkey"
            columns: ["banned_by"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: string
          title: string
          message: string
          reason: string | null
          link: string | null
          read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          title: string
          message: string
          reason?: string | null
          link?: string | null
          read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          title?: string
          message?: string
          reason?: string | null
          link?: string | null
          read?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
} 