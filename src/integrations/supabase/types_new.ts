export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string
          full_name: string
          avatar_url: string | null
          bio: string | null
          email: string
          role: Database["public"]["Enums"]["app_role"]
          is_admin: boolean
          admin_roles: string[]
          is_suspended: boolean
          is_banned: boolean
          suspension_reason: string | null
          suspension_until: string | null
          ban_reason: string | null
          is_verified: boolean
          verification_status: Database["public"]["Enums"]["verification_status"]
          gaming_profile: Json
          social_links: Json
          last_login: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username: string
          full_name: string
          avatar_url?: string | null
          bio?: string | null
          email: string
          role?: Database["public"]["Enums"]["app_role"]
          is_admin?: boolean
          admin_roles?: string[]
          is_suspended?: boolean
          is_banned?: boolean
          suspension_reason?: string | null
          suspension_until?: string | null
          ban_reason?: string | null
          is_verified?: boolean
          verification_status?: Database["public"]["Enums"]["verification_status"]
          gaming_profile?: Json
          social_links?: Json
          last_login?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string
          full_name?: string
          avatar_url?: string | null
          bio?: string | null
          email?: string
          role?: Database["public"]["Enums"]["app_role"]
          is_admin?: boolean
          admin_roles?: string[]
          is_suspended?: boolean
          is_banned?: boolean
          suspension_reason?: string | null
          suspension_until?: string | null
          ban_reason?: string | null
          is_verified?: boolean
          verification_status?: Database["public"]["Enums"]["verification_status"]
          gaming_profile?: Json
          social_links?: Json
          last_login?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      teams: {
        Row: {
          id: string
          name: string
          tag: string
          description: string | null
          game: string
          games: string[]
          game_format: string
          logo_url: string | null
          banner_url: string | null
          website_url: string | null
          social_media: Json
          achievements: Json
          is_public: boolean
          is_active: boolean
          max_members: number
          owner_id: string
          stats: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          tag: string
          description?: string | null
          game: string
          games?: string[]
          game_format?: string
          logo_url?: string | null
          banner_url?: string | null
          website_url?: string | null
          social_media?: Json
          achievements?: Json
          is_public?: boolean
          is_active?: boolean
          max_members?: number
          owner_id: string
          stats?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          tag?: string
          description?: string | null
          game?: string
          games?: string[]
          game_format?: string
          logo_url?: string | null
          banner_url?: string | null
          website_url?: string | null
          social_media?: Json
          achievements?: Json
          is_public?: boolean
          is_active?: boolean
          max_members?: number
          owner_id?: string
          stats?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          id: string
          team_id: string
          user_id: string
          role: Database["public"]["Enums"]["team_member_role"]
          joined_at: string
          is_active: boolean
        }
        Insert: {
          id?: string
          team_id: string
          user_id: string
          role?: Database["public"]["Enums"]["team_member_role"]
          joined_at?: string
          is_active?: boolean
        }
        Update: {
          id?: string
          team_id?: string
          user_id?: string
          role?: Database["public"]["Enums"]["team_member_role"]
          joined_at?: string
          is_active?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      team_invites: {
        Row: {
          id: string
          team_id: string
          user_id: string
          invited_by: string
          status: Database["public"]["Enums"]["invite_status"]
          message: string | null
          created_at: string
          responded_at: string | null
          expires_at: string
        }
        Insert: {
          id?: string
          team_id: string
          user_id: string
          invited_by: string
          status?: Database["public"]["Enums"]["invite_status"]
          message?: string | null
          created_at?: string
          responded_at?: string | null
          expires_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          user_id?: string
          invited_by?: string
          status?: Database["public"]["Enums"]["invite_status"]
          message?: string | null
          created_at?: string
          responded_at?: string | null
          expires_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_invites_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_invites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      venues: {
        Row: {
          id: string
          name: string
          description: string | null
          address: string
          city: string
          state: string | null
          country: string
          postal_code: string | null
          latitude: number | null
          longitude: number | null
          capacity: number | null
          amenities: string[]
          equipment: string[]
          operating_hours: Json
          contact_phone: string | null
          contact_email: string | null
          website_url: string | null
          social_media: Json
          images: string[]
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          address: string
          city: string
          state?: string | null
          country: string
          postal_code?: string | null
          latitude?: number | null
          longitude?: number | null
          capacity?: number | null
          amenities?: string[]
          equipment?: string[]
          operating_hours?: Json
          contact_phone?: string | null
          contact_email?: string | null
          website_url?: string | null
          social_media?: Json
          images?: string[]
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          address?: string
          city?: string
          state?: string | null
          country?: string
          postal_code?: string | null
          latitude?: number | null
          longitude?: number | null
          capacity?: number | null
          amenities?: string[]
          equipment?: string[]
          operating_hours?: Json
          contact_phone?: string | null
          contact_email?: string | null
          website_url?: string | null
          social_media?: Json
          images?: string[]
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      venue_profiles: {
        Row: {
          id: string
          owner_id: string
          venue_id: string
          business_name: string
          business_type: string | null
          verified: boolean
          is_verified: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          venue_id: string
          business_name: string
          business_type?: string | null
          verified?: boolean
          is_verified?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          venue_id?: string
          business_name?: string
          business_type?: string | null
          verified?: boolean
          is_verified?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_profiles_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venue_profiles_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      tournaments: {
        Row: {
          id: string
          name: string
          description: string | null
          game: string
          format: Database["public"]["Enums"]["tournament_format"]
          max_teams: number
          min_teams: number
          entry_fee: number
          prize_pool: number
          prize_distribution: Json
          start_date: string
          end_date: string
          registration_deadline: string
          check_in_time: string | null
          status: Database["public"]["Enums"]["tournament_status"]
          rules: string | null
          requirements: string | null
          age_restriction: Json
          skill_level: string
          banner_url: string | null
          logo_url: string | null
          organizer_id: string
          venue_id: string | null
          is_public: boolean
          is_featured: boolean
          allow_spectators: boolean
          stream_url: string | null
          stats: Json
          approved_by: string | null
          approved_at: string | null
          rejection_reason: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          game: string
          format: Database["public"]["Enums"]["tournament_format"]
          max_teams: number
          min_teams?: number
          entry_fee?: number
          prize_pool?: number
          prize_distribution?: Json
          start_date: string
          end_date: string
          registration_deadline: string
          check_in_time?: string | null
          status?: Database["public"]["Enums"]["tournament_status"]
          rules?: string | null
          requirements?: string | null
          age_restriction?: Json
          skill_level?: string
          banner_url?: string | null
          logo_url?: string | null
          organizer_id: string
          venue_id?: string | null
          is_public?: boolean
          is_featured?: boolean
          allow_spectators?: boolean
          stream_url?: string | null
          stats?: Json
          approved_by?: string | null
          approved_at?: string | null
          rejection_reason?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          game?: string
          format?: Database["public"]["Enums"]["tournament_format"]
          max_teams?: number
          min_teams?: number
          entry_fee?: number
          prize_pool?: number
          prize_distribution?: Json
          start_date?: string
          end_date?: string
          registration_deadline?: string
          check_in_time?: string | null
          status?: Database["public"]["Enums"]["tournament_status"]
          rules?: string | null
          requirements?: string | null
          age_restriction?: Json
          skill_level?: string
          banner_url?: string | null
          logo_url?: string | null
          organizer_id?: string
          venue_id?: string | null
          is_public?: boolean
          is_featured?: boolean
          allow_spectators?: boolean
          stream_url?: string | null
          stats?: Json
          approved_by?: string | null
          approved_at?: string | null
          rejection_reason?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournaments_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournaments_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournaments_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_participants: {
        Row: {
          id: string
          tournament_id: string
          team_id: string
          registered_at: string
          status: string
          seed: number | null
          final_position: number | null
        }
        Insert: {
          id?: string
          tournament_id: string
          team_id: string
          registered_at?: string
          status?: string
          seed?: number | null
          final_position?: number | null
        }
        Update: {
          id?: string
          tournament_id?: string
          team_id?: string
          registered_at?: string
          status?: string
          seed?: number | null
          final_position?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tournament_participants_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_participants_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_matches: {
        Row: {
          id: string
          tournament_id: string
          match_id: string
          round: number
          match_number: number
          team1_id: string | null
          team2_id: string | null
          winner_id: string | null
          score1: number | null
          score2: number | null
          status: Database["public"]["Enums"]["match_status"]
          scheduled_time: string | null
          completed_at: string | null
          stream_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tournament_id: string
          match_id: string
          round: number
          match_number: number
          team1_id?: string | null
          team2_id?: string | null
          winner_id?: string | null
          score1?: number | null
          score2?: number | null
          status?: Database["public"]["Enums"]["match_status"]
          scheduled_time?: string | null
          completed_at?: string | null
          stream_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tournament_id?: string
          match_id?: string
          round?: number
          match_number?: number
          team1_id?: string | null
          team2_id?: string | null
          winner_id?: string | null
          score1?: number | null
          score2?: number | null
          status?: Database["public"]["Enums"]["match_status"]
          scheduled_time?: string | null
          completed_at?: string | null
          stream_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_matches_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_team1_id_fkey"
            columns: ["team1_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_team2_id_fkey"
            columns: ["team2_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_bookings: {
        Row: {
          id: string
          venue_id: string
          user_id: string
          tournament_id: string | null
          start_time: string
          end_time: string
          status: string
          total_cost: number | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          venue_id: string
          user_id: string
          tournament_id?: string | null
          start_time: string
          end_time: string
          status?: string
          total_cost?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          venue_id?: string
          user_id?: string
          tournament_id?: string | null
          start_time?: string
          end_time?: string
          status?: string
          total_cost?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_bookings_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venue_bookings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venue_bookings_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      verification_requests: {
        Row: {
          id: string
          user_id: string
          requested_role: Database["public"]["Enums"]["app_role"]
          business_name: string
          business_type: string
          business_description: string
          experience_description: string
          first_name: string
          last_name: string
          email: string
          phone: string | null
          date_of_birth: string
          website_url: string | null
          social_media_links: Json
          cnic_front_url: string
          cnic_back_url: string
          additional_documents: Json
          status: string
          reviewed_by: string | null
          reviewed_at: string | null
          rejection_reason: string | null
          verification_notes: string | null
          admin_comments: Json
          submitted_at: string
          last_updated_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          requested_role: Database["public"]["Enums"]["app_role"]
          business_name: string
          business_type: string
          business_description: string
          experience_description: string
          first_name: string
          last_name: string
          email: string
          phone?: string | null
          date_of_birth: string
          website_url?: string | null
          social_media_links?: Json
          cnic_front_url: string
          cnic_back_url: string
          additional_documents?: Json
          status?: string
          reviewed_by?: string | null
          reviewed_at?: string | null
          rejection_reason?: string | null
          verification_notes?: string | null
          admin_comments?: Json
          submitted_at?: string
          last_updated_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          requested_role?: Database["public"]["Enums"]["app_role"]
          business_name?: string
          business_type?: string
          business_description?: string
          experience_description?: string
          first_name?: string
          last_name?: string
          email?: string
          phone?: string | null
          date_of_birth?: string
          website_url?: string | null
          social_media_links?: Json
          cnic_front_url?: string
          cnic_back_url?: string
          additional_documents?: Json
          status?: string
          reviewed_by?: string | null
          reviewed_at?: string | null
          rejection_reason?: string | null
          verification_notes?: string | null
          admin_comments?: Json
          submitted_at?: string
          last_updated_at?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "verification_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verification_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      verified_roles: {
        Row: {
          id: string
          user_id: string
          role: Database["public"]["Enums"]["app_role"]
          verified_at: string
          verified_by: string
          verification_request_id: string
          expires_at: string | null
          is_active: boolean
        }
        Insert: {
          id?: string
          user_id: string
          role: Database["public"]["Enums"]["app_role"]
          verified_at?: string
          verified_by: string
          verification_request_id: string
          expires_at?: string | null
          is_active?: boolean
        }
        Update: {
          id?: string
          user_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          verified_at?: string
          verified_by?: string
          verification_request_id?: string
          expires_at?: string | null
          is_active?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "verified_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verified_roles_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verified_roles_verification_request_id_fkey"
            columns: ["verification_request_id"]
            isOneToOne: false
            referencedRelation: "verification_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          title: string
          message: string
          type: Database["public"]["Enums"]["notification_type"]
          is_read: boolean
          data: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          message: string
          type?: Database["public"]["Enums"]["notification_type"]
          is_read?: boolean
          data?: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          message?: string
          type?: Database["public"]["Enums"]["notification_type"]
          is_read?: boolean
          data?: Json
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_roles: {
        Row: {
          id: string
          name: string
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          created_at?: string
        }
        Relationships: []
      }
        Row: {
          id: string
          name: string
          description: string | null
          resource: string
          action: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          resource: string
          action: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          resource?: string
          action?: string
          created_at?: string
        }
        Relationships: []
      }
      admin_role_permissions: {
        Row: {
          id: string
          role_id: string
          permission_id: string
          created_at: string
        }
        Insert: {
          id?: string
          role_id: string
          permission_id: string
          created_at?: string
        }
        Update: {
          id?: string
          role_id?: string
          permission_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "admin_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "admin_permissions"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_user_roles: {
        Row: {
          id: string
          user_id: string
          role_id: string
          assigned_by: string | null
          assigned_at: string
        }
        Insert: {
          id?: string
          user_id: string
          role_id: string
          assigned_by?: string | null
          assigned_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          role_id?: string
          assigned_by?: string | null
          assigned_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "admin_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_user_roles_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          id: string
          key: string
          value: Json
          description: string | null
          updated_by: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          key: string
          value: Json
          description?: string | null
          updated_by?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          key?: string
          value?: Json
          description?: string | null
          updated_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "system_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          id: string
          user_id: string | null
          action: string
          resource_type: string
          resource_id: string | null
          details: Json
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          action: string
          resource_type: string
          resource_id?: string | null
          details?: Json
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          action?: string
          resource_type?: string
          resource_id?: string | null
          details?: Json
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_admin_permission: {
        Args: { permission_name: string }
        Returns: boolean
      }
      has_verified_role: {
        Args: { role_name: Database["public"]["Enums"]["app_role"] }
        Returns: boolean
      }
      approve_verification_request: {
        Args: { request_id: string; admin_notes?: string }
        Returns: Json
      }
      reject_verification_request: {
        Args: { request_id: string; rejection_reason: string; admin_notes?: string }
        Returns: Json
      }
      create_notification: {
        Args: { 
          user_id: string
          title: string
          message: string
          type?: Database["public"]["Enums"]["notification_type"]
          data?: Json
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "casual" | "organizer" | "venue_owner" | "admin"
      verification_status: "unverified" | "pending" | "verified"
      tournament_status: "draft" | "published" | "open" | "closed" | "ongoing" | "completed" | "cancelled"
      tournament_format: "single_elimination" | "double_elimination" | "round_robin" | "swiss" | "custom"
      team_member_role: "owner" | "captain" | "member"
      invite_status: "pending" | "accepted" | "declined" | "expired"
      match_status: "scheduled" | "in_progress" | "completed" | "cancelled"
      notification_type: "info" | "success" | "warning" | "error"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["casual", "organizer", "venue_owner", "admin"],
      verification_status: ["unverified", "pending", "verified"],
      tournament_status: ["draft", "published", "open", "closed", "ongoing", "completed", "cancelled"],
      tournament_format: ["single_elimination", "double_elimination", "round_robin", "swiss", "custom"],
      team_member_role: ["owner", "captain", "member"],
      invite_status: ["pending", "accepted", "declined", "expired"],
      match_status: ["scheduled", "in_progress", "completed", "cancelled"],
      notification_type: ["info", "success", "warning", "error"],
    },
  },
} as const
