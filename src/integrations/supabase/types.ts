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
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          link: string | null
          message: string
          read: boolean
          reason: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message: string
          read?: boolean
          reason?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string
          read?: boolean
          reason?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          role: string
          updated_at: string | null
          username: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          role?: string
          updated_at?: string | null
          username: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          role?: string
          updated_at?: string | null
          username?: string
        }
        Relationships: []
      }
      role_approval_requests: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          requested_role: string
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          requested_role: string
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          requested_role?: string
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tournament_bans: {
        Row: {
          ban_reason: string | null
          banned_at: string | null
          banned_by: string | null
          id: string
          tournament_id: string
          user_id: string
          team_id: string | null
          is_active: boolean
        }
        Insert: {
          ban_reason?: string | null
          banned_at?: string | null
          banned_by?: string | null
          id?: string
          tournament_id: string
          user_id: string
          team_id?: string | null
          is_active?: boolean
        }
        Update: {
          ban_reason?: string | null
          banned_at?: string | null
          banned_by?: string | null
          id?: string
          tournament_id?: string
          user_id?: string
          team_id?: string | null
          is_active?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "tournament_bans_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_participants: {
        Row: {
          created_at: string
          gamer_tag: string | null
          id: string
          registered_at: string | null
          registration_type: string
          status: string
          team_captain: string | null
          team_email: string | null
          team_logo: string | null
          team_members: string | null
          team_name: string | null
          team_phone: string | null
          tournament_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          gamer_tag?: string | null
          id?: string
          registered_at?: string | null
          registration_type: string
          status?: string
          team_captain?: string | null
          team_email?: string | null
          team_logo?: string | null
          team_members?: string | null
          team_name?: string | null
          team_phone?: string | null
          tournament_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          gamer_tag?: string | null
          id?: string
          registered_at?: string | null
          registration_type?: string
          status?: string
          team_captain?: string | null
          team_email?: string | null
          team_logo?: string | null
          team_members?: string | null
          team_name?: string | null
          team_phone?: string | null
          tournament_id?: string
          updated_at?: string | null
          user_id?: string
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
          }
        ]
      }
      tournaments: {
        Row: {
          created_at: string | null
          date: string
          description: string
          entry_fee: string | null
          finished: boolean | null
          game: string
          id: string
          image_url: string | null
          is_online: boolean | null
          max_participants: number
          name: string
          organizer_id: string | null
          prize_pool: string
          slug: string | null
          status: string
          structure: string | null
          team_size: number | null
          format: string
          check_in_required: boolean | null
          check_in_deadline: string | null
          time: string
          updated_at: string | null
          user_id: string
          venue: string
        }
        Insert: {
          created_at?: string | null
          date: string
          description: string
          entry_fee?: string | null
          finished?: boolean | null
          game: string
          id?: string
          image_url?: string | null
          is_online?: boolean | null
          max_participants: number
          name: string
          organizer_id?: string | null
          prize_pool: string
          slug?: string | null
          status?: string
          structure?: string | null
          team_size?: number | null
          format?: string
          check_in_required?: boolean | null
          check_in_deadline?: string | null
          time: string
          updated_at?: string | null
          user_id: string
          venue: string
        }
        Update: {
          created_at?: string | null
          date?: string
          description?: string
          entry_fee?: string | null
          finished?: boolean | null
          game?: string
          id?: string
          image_url?: string | null
          is_online?: boolean | null
          max_participants?: number
          name?: string
          organizer_id?: string | null
          prize_pool?: string
          slug?: string | null
          status?: string
          structure?: string | null
          team_size?: number | null
          format?: string
          check_in_required?: boolean | null
          check_in_deadline?: string | null
          time?: string
          updated_at?: string | null
          user_id?: string
          venue?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      venue_bookings: {
        Row: {
          amount: number
          booking_date: string
          booking_time: string
          created_at: string
          hours: number
          id: string
          status: string
          updated_at: string
          user_id: string
          venue_id: string
        }
        Insert: {
          amount: number
          booking_date: string
          booking_time: string
          created_at?: string
          hours?: number
          id?: string
          status?: string
          updated_at?: string
          user_id: string
          venue_id: string
        }
        Update: {
          amount?: number
          booking_date?: string
          booking_time?: string
          created_at?: string
          hours?: number
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_bookings_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venues: {
        Row: {
          address: string
          city: string
          contact_email: string
          contact_phone: string
          created_at: string
          description: string
          games: string
          hours: string
          id: string
          image_url: string | null
          name: string
          open_now: boolean | null
          price_range: string | null
          rating: number | null
          stations: number
          updated_at: string
          user_id: string
        }
        Insert: {
          address: string
          city: string
          contact_email: string
          contact_phone: string
          created_at?: string
          description: string
          games: string
          hours: string
          id?: string
          image_url?: string | null
          name: string
          open_now?: boolean | null
          price_range?: string | null
          rating?: number | null
          stations: number
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string
          city?: string
          contact_email?: string
          contact_phone?: string
          created_at?: string
          description?: string
          games?: string
          hours?: string
          id?: string
          image_url?: string | null
          name?: string
          open_now?: boolean | null
          price_range?: string | null
          rating?: number | null
          stations?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      teams: {
        Row: {
          id: string
          name: string
          created_by: string | null
          owner_id: string | null
          logo_url: string | null
          game: string | null
          games: Json | null
          description: string | null
          website_url: string | null
          social_media: Json | null
          achievements: Json | null
          is_active: boolean | null
          updated_at: string | null
          game_format: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          name: string
          created_by?: string | null
          owner_id?: string | null
          logo_url?: string | null
          game?: string | null
          games?: Json | null
          description?: string | null
          website_url?: string | null
          social_media?: Json | null
          achievements?: Json | null
          is_active?: boolean | null
          updated_at?: string | null
          game_format?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          created_by?: string | null
          owner_id?: string | null
          logo_url?: string | null
          game?: string | null
          games?: Json | null
          description?: string | null
          website_url?: string | null
          social_media?: Json | null
          achievements?: Json | null
          is_active?: boolean | null
          updated_at?: string | null
          game_format?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      team_members: {
        Row: {
          id: string
          team_id: string
          user_id: string
          role: string | null
          joined_at: string | null
          is_active: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: string
          team_id: string
          user_id: string
          role?: string | null
          joined_at?: string | null
          is_active?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: string
          team_id?: string
          user_id?: string
          role?: string | null
          joined_at?: string | null
          is_active?: boolean | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_invitations: {
        Row: {
          id: string
          team_id: string
          invited_user_id: string
          invited_by: string
          status: string
          message: string | null
          created_at: string
          responded_at: string | null
        }
        Insert: {
          id?: string
          team_id: string
          invited_user_id: string
          invited_by: string
          status?: string
          message?: string | null
          created_at?: string
          responded_at?: string | null
        }
        Update: {
          id?: string
          team_id?: string
          invited_user_id?: string
          invited_by?: string
          status?: string
          message?: string | null
          created_at?: string
          responded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_invitations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_invitations_invited_user_id_fkey"
            columns: ["invited_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      game_maps: {
        Row: {
          id: string
          game: string
          map_name: string
          map_image_url: string | null
          is_active: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          game: string
          map_name: string
          map_image_url?: string | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          game?: string
          map_name?: string
          map_image_url?: string | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      tournament_map_pools: {
        Row: {
          id: string
          tournament_id: string
          map_id: string
          created_at: string | null
        }
        Insert: {
          id?: string
          tournament_id: string
          map_id: string
          created_at?: string | null
        }
        Update: {
          id?: string
          tournament_id?: string
          map_id?: string
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tournament_map_pools_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_map_pools_map_id_fkey"
            columns: ["map_id"]
            isOneToOne: false
            referencedRelation: "game_maps"
            referencedColumns: ["id"]
          },
        ]
      }
      match_map_vetos: {
        Row: {
          id: string
          match_id: string
          tournament_id: string
          team1_id: string | null
          team2_id: string | null
          veto_format: string | null
          status: string | null
          current_team_id: string | null
          current_action: string | null
          current_action_number: number | null
          turn_started_at: string | null
          turn_duration_seconds: number | null
          team1_banned_maps: string[] | null
          team2_banned_maps: string[] | null
          selected_map_id: string | null
          started_at: string | null
          completed_at: string | null
          created_at: string | null
          updated_at: string | null
          best_of: number | null
          team1_picked_maps: Json | null
          team2_picked_maps: Json | null
          team1_link_token: string | null
          team2_link_token: string | null
        }
        Insert: {
          id?: string
          match_id: string
          tournament_id: string
          team1_id?: string | null
          team2_id?: string | null
          veto_format?: string | null
          status?: string | null
          current_team_id?: string | null
          current_action?: string | null
          current_action_number?: number | null
          turn_started_at?: string | null
          turn_duration_seconds?: number | null
          team1_banned_maps?: string[] | null
          team2_banned_maps?: string[] | null
          selected_map_id?: string | null
          started_at?: string | null
          completed_at?: string | null
          created_at?: string | null
          updated_at?: string | null
          best_of?: number | null
          team1_picked_maps?: Json | null
          team2_picked_maps?: Json | null
          team1_link_token?: string | null
          team2_link_token?: string | null
        }
        Update: {
          id?: string
          match_id?: string
          tournament_id?: string
          team1_id?: string | null
          team2_id?: string | null
          veto_format?: string | null
          status?: string | null
          current_team_id?: string | null
          current_action?: string | null
          current_action_number?: number | null
          turn_started_at?: string | null
          turn_duration_seconds?: number | null
          team1_banned_maps?: string[] | null
          team2_banned_maps?: string[] | null
          selected_map_id?: string | null
          started_at?: string | null
          completed_at?: string | null
          created_at?: string | null
          updated_at?: string | null
          best_of?: number | null
          team1_picked_maps?: Json | null
          team2_picked_maps?: Json | null
          team1_link_token?: string | null
          team2_link_token?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "match_map_vetos_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "tournament_matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_map_vetos_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_map_vetos_team1_id_fkey"
            columns: ["team1_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_map_vetos_team2_id_fkey"
            columns: ["team2_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      match_map_veto_actions: {
        Row: {
          id: string
          veto_id: string
          match_id: string
          team_id: string
          action_type: string
          map_id: string
          action_number: number
          created_at: string | null
          side: string | null
        }
        Insert: {
          id?: string
          veto_id: string
          match_id: string
          team_id: string
          action_type: string
          map_id: string
          action_number: number
          created_at?: string | null
          side?: string | null
        }
        Update: {
          id?: string
          veto_id?: string
          match_id?: string
          team_id?: string
          action_type?: string
          map_id?: string
          action_number?: number
          created_at?: string | null
          side?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "match_map_veto_actions_veto_id_fkey"
            columns: ["veto_id"]
            isOneToOne: false
            referencedRelation: "match_map_vetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_map_veto_actions_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "tournament_matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_map_veto_actions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_map_veto_actions_map_id_fkey"
            columns: ["map_id"]
            isOneToOne: false
            referencedRelation: "game_maps"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_stages: {
        Row: {
          id: string
          tournament_id: string
          name: string
          format: string
          stage_order: number
          config: Json | null
          capacity: number | null
          advancement_count: number | null
          status: string | null
          is_locked: boolean | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tournament_id: string
          name: string
          format: string
          stage_order: number
          config?: Json | null
          capacity?: number | null
          advancement_count?: number | null
          status?: string | null
          is_locked?: boolean | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tournament_id?: string
          name?: string
          format?: string
          stage_order?: number
          config?: Json | null
          capacity?: number | null
          advancement_count?: number | null
          status?: string | null
          is_locked?: boolean | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_stages_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      stage_participants: {
        Row: {
          id: string
          stage_id: string
          team_id: string
          enrolled_at: string | null
        }
        Insert: {
          id?: string
          stage_id: string
          team_id: string
          enrolled_at?: string | null
        }
        Update: {
          id?: string
          stage_id?: string
          team_id?: string
          enrolled_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stage_participants_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "tournament_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stage_participants_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          }
        ]
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
        }
        Relationships: [
          {
            foreignKeyName: "tournament_staff_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_staff_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      team_rosters: {
        Row: {
          id: string
          team_id: string
          name: string
          game: string
          format: string | null
          team_size: number
          created_at: string
        }
        Insert: {
          id?: string
          team_id: string
          name: string
          game: string
          format?: string | null
          team_size: number
          created_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          name?: string
          game?: string
          format?: string | null
          team_size?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_rosters_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          }
        ]
      }
      team_roster_members: {
        Row: {
          id: string
          roster_id: string
          user_id: string
          role: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          roster_id: string
          user_id: string
          role?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          roster_id?: string
          user_id?: string
          role?: string | null
          is_active?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_roster_members_roster_id_fkey"
            columns: ["roster_id"]
            isOneToOne: false
            referencedRelation: "team_rosters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_roster_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      tournament_matches: {
        Row: {
          id: string
          tournament_id: string
          round: number
          match_number: number
          team1_id: string | null
          team2_id: string | null
          team1_score: number | null
          team2_score: number | null
          status: "pending" | "in_progress" | "completed" | "disputed"
          scheduled_time: string | null
          winner_id: string | null
          next_match_id: string | null
          loser_next_match_id: string | null
          bracket_side: string
          stage_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tournament_id: string
          round: number
          match_number: number
          team1_id?: string | null
          team2_id?: string | null
          team1_score?: number | null
          team2_score?: number | null
          status?: "pending" | "in_progress" | "completed" | "disputed"
          scheduled_time?: string | null
          winner_id?: string | null
          next_match_id?: string | null
          loser_next_match_id?: string | null
          bracket_side?: string
          stage_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tournament_id?: string
          round?: number
          match_number?: number
          team1_id?: string | null
          team2_id?: string | null
          team1_score?: number | null
          team2_score?: number | null
          status?: "pending" | "in_progress" | "completed" | "disputed"
          scheduled_time?: string | null
          winner_id?: string | null
          next_match_id?: string | null
          loser_next_match_id?: string | null
          bracket_side?: string
          stage_id?: string | null
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
          {
            foreignKeyName: "tournament_matches_next_match_id_fkey"
            columns: ["next_match_id"]
            isOneToOne: false
            referencedRelation: "tournament_matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_loser_next_match_id_fkey"
            columns: ["loser_next_match_id"]
            isOneToOne: false
            referencedRelation: "tournament_matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "tournament_stages"
            referencedColumns: ["id"]
          }
        ]
      }
      match_results: {
        Row: {
          id: string
          match_id: string
          reported_by: string
          team1_score: number
          team2_score: number
          screenshots: string[]
          status: string
          verification_notes: string | null
          verified_by: string | null
          verified_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          match_id: string
          reported_by?: string
          team1_score: number
          team2_score: number
          screenshots?: string[]
          status?: string
          verification_notes?: string | null
          verified_by?: string | null
          verified_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          match_id?: string
          reported_by?: string
          team1_score?: number
          team2_score?: number
          screenshots?: string[]
          status?: string
          verification_notes?: string | null
          verified_by?: string | null
          verified_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_results_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "tournament_matches"
            referencedColumns: ["id"]
          }
        ]
      }
      tournament_match_results: {
        Row: {
          id: string
          tournament_id: string
          match_id: string
          reporter_user_id: string | null
          image_url: string | null
          comment: string | null
          created_at: string
        }
        Insert: {
          id?: string
          tournament_id: string
          match_id: string
          reporter_user_id?: string | null
          image_url?: string | null
          comment?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          tournament_id?: string
          match_id?: string
          reporter_user_id?: string | null
          image_url?: string | null
          comment?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_match_results_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_match_results_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "tournament_matches"
            referencedColumns: ["id"]
          }
        ]
      }
      valorant_match_map_vetos: {
        Row: {
          id: string
          match_id: string
          tournament_id: string
          team1_id: string | null
          team2_id: string | null
          team1_link_token: string | null
          team2_link_token: string | null
          current_turn: string | null
          status: string
          selected_map: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          match_id: string
          tournament_id: string
          team1_id?: string | null
          team2_id?: string | null
          team1_link_token?: string | null
          team2_link_token?: string | null
          current_turn?: string | null
          status?: string
          selected_map?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          match_id?: string
          tournament_id?: string
          team1_id?: string | null
          team2_id?: string | null
          team1_link_token?: string | null
          team2_link_token?: string | null
          current_turn?: string | null
          status?: string
          selected_map?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "valorant_match_map_vetos_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "tournament_matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "valorant_match_map_vetos_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          }
        ]
      }
      valorant_match_map_veto_actions: {
        Row: {
          id: string
          veto_id: string
          team_id: string
          action_type: string
          map_name: string
          action_order: number
          created_at: string
        }
        Insert: {
          id?: string
          veto_id: string
          team_id: string
          action_type: string
          map_name: string
          action_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          veto_id?: string
          team_id?: string
          action_type?: string
          map_name?: string
          action_order?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "valorant_match_map_veto_actions_veto_id_fkey"
            columns: ["veto_id"]
            isOneToOne: false
            referencedRelation: "valorant_match_map_vetos"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      assign_user_role: {
        Args: { p_user_id: string; p_role: string }
        Returns: boolean
      }
      get_user_role: {
        Args: { user_uuid: string }
        Returns: string
      }
      get_user_role_safely: {
        Args: { user_uuid: string }
        Returns: string
      }
      has_role: {
        Args:
        | { _role: Database["public"]["Enums"]["app_role"] }
        | { _role: string }
        Returns: boolean
      }
      register_for_tournament: {
        Args:
        | {
          p_tournament_id: string
          p_player_id: string
          p_team_name?: string
          p_player_tag?: string
          p_is_team_captain?: boolean
        }
        | {
          p_tournament_id: string
          p_user_id: string
          p_registration_type: string
          p_team_name?: string
          p_team_captain?: string
          p_team_members?: string
          p_gamer_tag?: string
        }
        Returns: Json
      }
      get_roster_members: {
        Args: { r_id: string }
        Returns: Json
      }
      get_team_roster: {
        Args: { t_id: string }
        Returns: Json
      }
      initialize_match_veto: {
        Args: {
          p_match_id: string
          p_veto_format?: string
        }
        Returns: string
      }
      reset_match_veto: {
        Args: {
          p_match_id: string
        }
        Returns: undefined
      }
      advance_match_v2: {
        Args: {
          p_match_id: string
          p_winner_id: string
          p_team1_score: number
          p_team2_score: number
        }
        Returns: undefined
      }
      reorder_tournament_stages: {
        Args: {
          p_stage_ids: string[]
        }
        Returns: undefined
      }
      enroll_team_in_stage: {
        Args: {
          p_stage_id: string
          p_team_id: string
        }
        Returns: undefined
      }
      get_stage_teams: {
        Args: {
          p_stage_id: string
        }
        Returns: Json
      }
      advance_teams_to_next_stage: {
        Args: {
          p_current_stage_id: string
        }
        Returns: number
      }
      generate_stage_bracket: {
        Args: {
          p_stage_id: string
          p_bracket_size?: number
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "venue_owner" | "organizer"
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
      app_role: ["admin", "venue_owner", "organizer"],
    },
  },
} as const
