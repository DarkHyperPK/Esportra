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
          is_suspended: boolean
          suspension_until: string | null
          suspension_reason: string | null
          suspension_type: string | null
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
          is_suspended?: boolean
          suspension_until?: string | null
          suspension_reason?: string | null
          suspension_type?: string | null
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
          is_suspended?: boolean
          suspension_until?: string | null
          suspension_reason?: string | null
          suspension_type?: string | null
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
          participant_type: 'solo' | 'team'
          team_id: string | null
          gamer_tag: string
          team_name: string | null
          team_captain_id: string | null
          team_members: Json | null
          team_logo_url: string | null
          team_contact_email: string | null
          team_contact_phone: string | null
          status: 'registered' | 'checked_in' | 'withdrawn' | 'pending'
          registration_date: string | null
          checked_in_at: string | null
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          tournament_id: string
          user_id: string
          participant_type: 'solo' | 'team'
          team_id?: string | null
          gamer_tag: string
          team_name?: string | null
          team_captain_id?: string | null
          team_members?: Json | null
          team_logo_url?: string | null
          team_contact_email?: string | null
          team_contact_phone?: string | null
          status?: 'registered' | 'checked_in' | 'withdrawn' | 'pending'
          registration_date?: string | null
          checked_in_at?: string | null
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          tournament_id?: string
          user_id?: string
          participant_type?: 'solo' | 'team'
          team_id?: string | null
          gamer_tag?: string
          team_name?: string | null
          team_captain_id?: string | null
          team_members?: Json | null
          team_logo_url?: string | null
          team_contact_email?: string | null
          team_contact_phone?: string | null
          status?: 'registered' | 'checked_in' | 'withdrawn' | 'pending'
          registration_date?: string | null
          checked_in_at?: string | null
          created_at?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tournament_participants_team_id_fkey"
            columns: ["team_id"]
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
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
      tournament_disputes: {
        Row: {
          id: string
          tournament_id: string
          match_id: string | null
          raised_by_user_id: string
          team_id: string | null
          title: string
          description: string | null
          evidence_url: string | null
          status: 'open' | 'in_review' | 'resolved' | 'rejected'
          assigned_to_user_id: string | null
          resolution_notes: string | null
          dispute_reason: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tournament_id: string
          match_id?: string | null
          raised_by_user_id: string
          team_id?: string | null
          title: string
          description?: string | null
          evidence_url?: string | null
          status?: 'open' | 'in_review' | 'resolved' | 'rejected'
          assigned_to_user_id?: string | null
          resolution_notes?: string | null
          dispute_reason?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tournament_id?: string
          match_id?: string | null
          raised_by_user_id?: string
          team_id?: string | null
          title?: string
          description?: string | null
          evidence_url?: string | null
          status?: 'open' | 'in_review' | 'resolved' | 'rejected'
          assigned_to_user_id?: string | null
          resolution_notes?: string | null
          dispute_reason?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      tournaments: {
        Row: {
          id: string
          name: string
          description: string | null
          slug: string
          game: string | null
          max_teams: number | null
          min_teams: number | null
          entry_fee: number | null
          prize_pool: number | null
          prize_distribution: Json | null
          start_date: string | null
          end_date: string | null
          registration_deadline: string | null
          check_in_time: string | null
          status: Database['public']['Enums']['tournament_status'] | null
          rules: string | null
          requirements: string | null
          age_restriction: Json | null
          skill_level: string | null
          banner_url: string | null
          logo_url: string | null
          organizer_id: string | null
          venue_id: string | null
          is_public: boolean | null
          is_featured: boolean | null
          allow_spectators: boolean | null
          stream_url: string | null
          stats: Json | null
          approved_by: string | null
          approved_at: string | null
          rejection_reason: string | null
          created_at: string | null
          updated_at: string | null
          check_in_required: boolean | null
          check_in_deadline: string | null
          auto_remove_unchecked: boolean | null
          participant_cap: number | null
          deleted_at: string | null
          team_size: number | null
          settings: Json | null
          format: string | null
          rewards: string | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          slug: string
          game?: string | null
          max_teams?: number | null
          min_teams?: number | null
          entry_fee?: number | null
          prize_pool?: number | null
          prize_distribution?: Json | null
          start_date?: string | null
          end_date?: string | null
          registration_deadline?: string | null
          check_in_time?: string | null
          status?: Database['public']['Enums']['tournament_status'] | null
          rules?: string | null
          requirements?: string | null
          age_restriction?: Json | null
          skill_level?: string | null
          banner_url?: string | null
          logo_url?: string | null
          organizer_id?: string | null
          venue_id?: string | null
          is_public?: boolean | null
          is_featured?: boolean | null
          allow_spectators?: boolean | null
          stream_url?: string | null
          stats?: Json | null
          approved_by?: string | null
          approved_at?: string | null
          rejection_reason?: string | null
          created_at?: string | null
          updated_at?: string | null
          check_in_required?: boolean | null
          check_in_deadline?: string | null
          auto_remove_unchecked?: boolean | null
          participant_cap?: number | null
          deleted_at?: string | null
          team_size?: number | null
          settings?: Json | null
          format?: string | null
          rewards?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          slug?: string
          game?: string | null
          max_teams?: number | null
          min_teams?: number | null
          entry_fee?: number | null
          prize_pool?: number | null
          prize_distribution?: Json | null
          start_date?: string | null
          end_date?: string | null
          registration_deadline?: string | null
          check_in_time?: string | null
          status?: Database['public']['Enums']['tournament_status'] | null
          rules?: string | null
          requirements?: string | null
          age_restriction?: Json | null
          skill_level?: string | null
          banner_url?: string | null
          logo_url?: string | null
          organizer_id?: string | null
          venue_id?: string | null
          is_public?: boolean | null
          is_featured?: boolean | null
          allow_spectators?: boolean | null
          stream_url?: string | null
          stats?: Json | null
          approved_by?: string | null
          approved_at?: string | null
          rejection_reason?: string | null
          created_at?: string | null
          updated_at?: string | null
          check_in_required?: boolean | null
          check_in_deadline?: string | null
          auto_remove_unchecked?: boolean | null
          participant_cap?: number | null
          deleted_at?: string | null
          team_size?: number | null
          settings?: Json | null
          format?: string | null
          rewards?: string | null
        }
      }
      team_invitations: {
        Row: {
          id: string
          team_id: string | null
          invited_user_id: string | null
          invited_email: string | null
          status: string
          created_at: string | null
        }
        Insert: {
          id?: string
          team_id?: string | null
          invited_user_id?: string | null
          invited_email?: string | null
          status?: string
          created_at?: string | null
        }
        Update: {
          id?: string
          team_id?: string | null
          invited_user_id?: string | null
          invited_email?: string | null
          status?: string
          created_at?: string | null
        }
      }
      tournament_staff: {
        Row: {
          id: string
          tournament_id: string
          user_id: string
          role: string
          permissions: string[]
          status: string
          assigned_by: string | null
          created_at: string
          updated_at: string
          accepted_at: string | null
          responded_at: string | null
        }
        Insert: {
          id?: string
          tournament_id: string
          user_id: string
          role?: string
          permissions?: string[]
          status?: string
          assigned_by?: string | null
          created_at?: string
          updated_at?: string
          accepted_at?: string | null
          responded_at?: string | null
        }
        Update: {
          id?: string
          tournament_id?: string
          user_id?: string
          role?: string
          permissions?: string[]
          status?: string
          assigned_by?: string | null
          created_at?: string
          updated_at?: string
          accepted_at?: string | null
          responded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tournament_staff_tournament_id_fkey"
            columns: ["tournament_id"]
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_staff_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
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
      app_role: "casual" | "organizer" | "venue_owner" | "admin"
      invite_status: "pending" | "accepted" | "declined" | "expired"
      match_status: "scheduled" | "in_progress" | "completed" | "cancelled"
      notification_type: "info" | "success" | "warning" | "error"
      registration_status:
      | "pending"
      | "approved"
      | "rejected"
      | "cancelled"
      | "checked_in"
      | "eliminated"
      | "disqualified"
      | "waitlist"
      registration_type: "solo" | "team"
      team_member_role: "owner" | "captain" | "member"
      tournament_format:
      | "single_elimination"
      | "double_elimination"
      | "round_robin"
      | "swiss"
      | "custom"
      | "battle_royale"
      tournament_status:
      | "draft"
      | "open"
      | "closed"
      | "check_in"
      | "ongoing"
      | "completed"
      | "cancelled"
      verification_status: "unverified" | "pending" | "verified"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
