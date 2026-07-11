export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      battle_participants: {
        Row: {
          battle_side_id: string
          faction_id: string | null
          id: string
          participant_label: string
          sort_order: number
          strength_count: number | null
        }
        Insert: {
          battle_side_id: string
          faction_id?: string | null
          id?: string
          participant_label: string
          sort_order?: number
          strength_count?: number | null
        }
        Update: {
          battle_side_id?: string
          faction_id?: string | null
          id?: string
          participant_label?: string
          sort_order?: number
          strength_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "battle_participants_battle_side_id_fkey"
            columns: ["battle_side_id"]
            isOneToOne: false
            referencedRelation: "battle_sides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "battle_participants_faction_id_fkey"
            columns: ["faction_id"]
            isOneToOne: false
            referencedRelation: "factions"
            referencedColumns: ["id"]
          },
        ]
      }
      battle_sides: {
        Row: {
          battle_id: string
          id: string
          side_label: string
          sort_order: number
        }
        Insert: {
          battle_id: string
          id?: string
          side_label: string
          sort_order?: number
        }
        Update: {
          battle_id?: string
          id?: string
          side_label?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "battle_sides_battle_id_fkey"
            columns: ["battle_id"]
            isOneToOne: false
            referencedRelation: "battles"
            referencedColumns: ["id"]
          },
        ]
      }
      battles: {
        Row: {
          battle_type: Database["public"]["Enums"]["battle_type"] | null
          battlefield_type:
            | Database["public"]["Enums"]["battlefield_type"]
            | null
          campaign_id: string
          content_html: string | null
          created_at: string
          end_date: string | null
          hero_image_url: string | null
          id: string
          location_id: string | null
          map_id: string | null
          name: string
          result: string | null
          slug: string
          start_date: string | null
          story_arc_id: string
          updated_at: string
        }
        Insert: {
          battle_type?: Database["public"]["Enums"]["battle_type"] | null
          battlefield_type?:
            | Database["public"]["Enums"]["battlefield_type"]
            | null
          campaign_id: string
          content_html?: string | null
          created_at?: string
          end_date?: string | null
          hero_image_url?: string | null
          id?: string
          location_id?: string | null
          map_id?: string | null
          name: string
          result?: string | null
          slug: string
          start_date?: string | null
          story_arc_id: string
          updated_at?: string
        }
        Update: {
          battle_type?: Database["public"]["Enums"]["battle_type"] | null
          battlefield_type?:
            | Database["public"]["Enums"]["battlefield_type"]
            | null
          campaign_id?: string
          content_html?: string | null
          created_at?: string
          end_date?: string | null
          hero_image_url?: string | null
          id?: string
          location_id?: string | null
          map_id?: string | null
          name?: string
          result?: string | null
          slug?: string
          start_date?: string | null
          story_arc_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "battles_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "battles_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "battles_map_id_fkey"
            columns: ["map_id"]
            isOneToOne: false
            referencedRelation: "maps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "battles_story_arc_id_fkey"
            columns: ["story_arc_id"]
            isOneToOne: false
            referencedRelation: "story_arcs"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_invites: {
        Row: {
          accepted_at: string | null
          campaign_id: string
          created_at: string
          email: string
          id: string
          invited_by: string | null
          role: Database["public"]["Enums"]["member_role"]
        }
        Insert: {
          accepted_at?: string | null
          campaign_id: string
          created_at?: string
          email: string
          id?: string
          invited_by?: string | null
          role: Database["public"]["Enums"]["member_role"]
        }
        Update: {
          accepted_at?: string | null
          campaign_id?: string
          created_at?: string
          email?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["member_role"]
        }
        Relationships: [
          {
            foreignKeyName: "campaign_invites_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_members: {
        Row: {
          campaign_id: string
          created_at: string
          display_name: string | null
          id: string
          role: Database["public"]["Enums"]["member_role"]
          user_id: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          display_name?: string | null
          id?: string
          role: Database["public"]["Enums"]["member_role"]
          user_id: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          display_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["member_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_members_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          cover_image_url: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      character_gm_notes: {
        Row: {
          character_id: string
          gm_notes: string | null
          secrets: string | null
          stat_block: Json | null
        }
        Insert: {
          character_id: string
          gm_notes?: string | null
          secrets?: string | null
          stat_block?: Json | null
        }
        Update: {
          character_id?: string
          gm_notes?: string | null
          secrets?: string | null
          stat_block?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "character_gm_notes_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: true
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
        ]
      }
      character_relationships: {
        Row: {
          campaign_id: string
          character_id: string
          created_at: string
          id: string
          is_directional: boolean
          is_gm_only: boolean
          label: string | null
          notes: string | null
          related_character_id: string
          relationship_type: Database["public"]["Enums"]["relationship_type"]
        }
        Insert: {
          campaign_id: string
          character_id: string
          created_at?: string
          id?: string
          is_directional?: boolean
          is_gm_only?: boolean
          label?: string | null
          notes?: string | null
          related_character_id: string
          relationship_type: Database["public"]["Enums"]["relationship_type"]
        }
        Update: {
          campaign_id?: string
          character_id?: string
          created_at?: string
          id?: string
          is_directional?: boolean
          is_gm_only?: boolean
          label?: string | null
          notes?: string | null
          related_character_id?: string
          relationship_type?: Database["public"]["Enums"]["relationship_type"]
        }
        Relationships: [
          {
            foreignKeyName: "character_relationships_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "character_relationships_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "character_relationships_related_character_id_fkey"
            columns: ["related_character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
        ]
      }
      characters: {
        Row: {
          appearance: string | null
          attitude: string | null
          campaign_id: string
          content_html: string | null
          created_at: string
          demiplane_url: string | null
          faction_id: string | null
          faction_rank: string | null
          home_location_id: string | null
          id: string
          kind: Database["public"]["Enums"]["character_kind"]
          name: string
          personality: string | null
          player_user_id: string | null
          portrait_url: string | null
          role_or_title: string | null
          slug: string
          tags: string[]
          updated_at: string
          vitality: Database["public"]["Enums"]["vitality_status"]
        }
        Insert: {
          appearance?: string | null
          attitude?: string | null
          campaign_id: string
          content_html?: string | null
          created_at?: string
          demiplane_url?: string | null
          faction_id?: string | null
          faction_rank?: string | null
          home_location_id?: string | null
          id?: string
          kind: Database["public"]["Enums"]["character_kind"]
          name: string
          personality?: string | null
          player_user_id?: string | null
          portrait_url?: string | null
          role_or_title?: string | null
          slug: string
          tags?: string[]
          updated_at?: string
          vitality?: Database["public"]["Enums"]["vitality_status"]
        }
        Update: {
          appearance?: string | null
          attitude?: string | null
          campaign_id?: string
          content_html?: string | null
          created_at?: string
          demiplane_url?: string | null
          faction_id?: string | null
          faction_rank?: string | null
          home_location_id?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["character_kind"]
          name?: string
          personality?: string | null
          player_user_id?: string | null
          portrait_url?: string | null
          role_or_title?: string | null
          slug?: string
          tags?: string[]
          updated_at?: string
          vitality?: Database["public"]["Enums"]["vitality_status"]
        }
        Relationships: [
          {
            foreignKeyName: "characters_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "characters_faction_id_fkey"
            columns: ["faction_id"]
            isOneToOne: false
            referencedRelation: "factions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "characters_home_location_id_fkey"
            columns: ["home_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      codex_entries: {
        Row: {
          created_at: string | null
          data: Json
          id: string
          section: string
        }
        Insert: {
          created_at?: string | null
          data?: Json
          id: string
          section: string
        }
        Update: {
          created_at?: string | null
          data?: Json
          id?: string
          section?: string
        }
        Relationships: []
      }
      conflict_viewpoints: {
        Row: {
          campaign_id: string
          content_html: string
          created_at: string
          faction_id: string | null
          id: string
          region_id: string | null
          sort_order: number
          story_arc_id: string
          updated_at: string
          viewpoint_label: string
        }
        Insert: {
          campaign_id: string
          content_html: string
          created_at?: string
          faction_id?: string | null
          id?: string
          region_id?: string | null
          sort_order?: number
          story_arc_id: string
          updated_at?: string
          viewpoint_label: string
        }
        Update: {
          campaign_id?: string
          content_html?: string
          created_at?: string
          faction_id?: string | null
          id?: string
          region_id?: string | null
          sort_order?: number
          story_arc_id?: string
          updated_at?: string
          viewpoint_label?: string
        }
        Relationships: [
          {
            foreignKeyName: "conflict_viewpoints_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conflict_viewpoints_faction_id_fkey"
            columns: ["faction_id"]
            isOneToOne: false
            referencedRelation: "factions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conflict_viewpoints_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conflict_viewpoints_story_arc_id_fkey"
            columns: ["story_arc_id"]
            isOneToOne: false
            referencedRelation: "story_arcs"
            referencedColumns: ["id"]
          },
        ]
      }
      divinities: {
        Row: {
          campaign_id: string
          content_html: string | null
          created_at: string
          dogma: string | null
          domain: string | null
          hero_image_url: string | null
          id: string
          name: string
          realm: string | null
          slug: string
          updated_at: string
          worshippers: string | null
        }
        Insert: {
          campaign_id: string
          content_html?: string | null
          created_at?: string
          dogma?: string | null
          domain?: string | null
          hero_image_url?: string | null
          id?: string
          name: string
          realm?: string | null
          slug: string
          updated_at?: string
          worshippers?: string | null
        }
        Update: {
          campaign_id?: string
          content_html?: string | null
          created_at?: string
          dogma?: string | null
          domain?: string | null
          hero_image_url?: string | null
          id?: string
          name?: string
          realm?: string | null
          slug?: string
          updated_at?: string
          worshippers?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "divinities_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      divinity_gm_notes: {
        Row: {
          divinity_id: string
          secret: string | null
        }
        Insert: {
          divinity_id: string
          secret?: string | null
        }
        Update: {
          divinity_id?: string
          secret?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "divinity_gm_notes_divinity_id_fkey"
            columns: ["divinity_id"]
            isOneToOne: true
            referencedRelation: "divinities"
            referencedColumns: ["id"]
          },
        ]
      }
      encounter_combatants: {
        Row: {
          campaign_id: string
          character_id: string | null
          created_at: string
          current_hp: number | null
          current_stress: number | null
          display_name: string
          encounter_id: string
          extra_trackers: Json
          id: string
          is_adversary: boolean
          max_hp: number | null
          max_stress: number | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          campaign_id: string
          character_id?: string | null
          created_at?: string
          current_hp?: number | null
          current_stress?: number | null
          display_name: string
          encounter_id: string
          extra_trackers?: Json
          id?: string
          is_adversary?: boolean
          max_hp?: number | null
          max_stress?: number | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          campaign_id?: string
          character_id?: string | null
          created_at?: string
          current_hp?: number | null
          current_stress?: number | null
          display_name?: string
          encounter_id?: string
          extra_trackers?: Json
          id?: string
          is_adversary?: boolean
          max_hp?: number | null
          max_stress?: number | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "encounter_combatants_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "encounter_combatants_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "encounter_combatants_encounter_id_fkey"
            columns: ["encounter_id"]
            isOneToOne: false
            referencedRelation: "session_encounters"
            referencedColumns: ["id"]
          },
        ]
      }
      faction_gm_notes: {
        Row: {
          faction_id: string
          gm_notes: string | null
          secrets: string | null
        }
        Insert: {
          faction_id: string
          gm_notes?: string | null
          secrets?: string | null
        }
        Update: {
          faction_id?: string
          gm_notes?: string | null
          secrets?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "faction_gm_notes_faction_id_fkey"
            columns: ["faction_id"]
            isOneToOne: true
            referencedRelation: "factions"
            referencedColumns: ["id"]
          },
        ]
      }
      faction_relations: {
        Row: {
          campaign_id: string
          faction_id: string
          id: string
          notes: string | null
          other_faction_id: string
          standing: string | null
        }
        Insert: {
          campaign_id: string
          faction_id: string
          id?: string
          notes?: string | null
          other_faction_id: string
          standing?: string | null
        }
        Update: {
          campaign_id?: string
          faction_id?: string
          id?: string
          notes?: string | null
          other_faction_id?: string
          standing?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "faction_relations_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faction_relations_faction_id_fkey"
            columns: ["faction_id"]
            isOneToOne: false
            referencedRelation: "factions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faction_relations_other_faction_id_fkey"
            columns: ["other_faction_id"]
            isOneToOne: false
            referencedRelation: "factions"
            referencedColumns: ["id"]
          },
        ]
      }
      factions: {
        Row: {
          campaign_id: string
          content_html: string | null
          created_at: string
          goal: string | null
          hero_image_url: string | null
          hq_location_id: string | null
          id: string
          name: string
          resources: string | null
          slug: string
          tags: string[]
          type: string | null
          updated_at: string
        }
        Insert: {
          campaign_id: string
          content_html?: string | null
          created_at?: string
          goal?: string | null
          hero_image_url?: string | null
          hq_location_id?: string | null
          id?: string
          name: string
          resources?: string | null
          slug: string
          tags?: string[]
          type?: string | null
          updated_at?: string
        }
        Update: {
          campaign_id?: string
          content_html?: string | null
          created_at?: string
          goal?: string | null
          hero_image_url?: string | null
          hq_location_id?: string | null
          id?: string
          name?: string
          resources?: string | null
          slug?: string
          tags?: string[]
          type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "factions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "factions_hq_location_id_fkey"
            columns: ["hq_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      location_gm_notes: {
        Row: {
          dangers: string | null
          gm_notes: string | null
          location_id: string
          secrets: string | null
        }
        Insert: {
          dangers?: string | null
          gm_notes?: string | null
          location_id: string
          secrets?: string | null
        }
        Update: {
          dangers?: string | null
          gm_notes?: string | null
          location_id?: string
          secrets?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "location_gm_notes_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: true
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          atmosphere: string | null
          campaign_id: string
          content_html: string | null
          controlled_by_faction_id: string | null
          created_at: string
          hero_image_url: string | null
          id: string
          name: string
          region_id: string | null
          short_blurb: string | null
          slug: string
          tags: string[]
          type: Database["public"]["Enums"]["location_type"] | null
          updated_at: string
        }
        Insert: {
          atmosphere?: string | null
          campaign_id: string
          content_html?: string | null
          controlled_by_faction_id?: string | null
          created_at?: string
          hero_image_url?: string | null
          id?: string
          name: string
          region_id?: string | null
          short_blurb?: string | null
          slug: string
          tags?: string[]
          type?: Database["public"]["Enums"]["location_type"] | null
          updated_at?: string
        }
        Update: {
          atmosphere?: string | null
          campaign_id?: string
          content_html?: string | null
          controlled_by_faction_id?: string | null
          created_at?: string
          hero_image_url?: string | null
          id?: string
          name?: string
          region_id?: string | null
          short_blurb?: string | null
          slug?: string
          tags?: string[]
          type?: Database["public"]["Enums"]["location_type"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "locations_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "locations_controlled_by_faction_id_fkey"
            columns: ["controlled_by_faction_id"]
            isOneToOne: false
            referencedRelation: "factions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "locations_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      map_pins: {
        Row: {
          battle_id: string | null
          created_at: string
          icon: string | null
          id: string
          location_id: string | null
          map_id: string
          region_id: string | null
          x: number
          y: number
        }
        Insert: {
          battle_id?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          location_id?: string | null
          map_id: string
          region_id?: string | null
          x: number
          y: number
        }
        Update: {
          battle_id?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          location_id?: string | null
          map_id?: string
          region_id?: string | null
          x?: number
          y?: number
        }
        Relationships: [
          {
            foreignKeyName: "map_pins_battle_id_fkey"
            columns: ["battle_id"]
            isOneToOne: false
            referencedRelation: "battles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "map_pins_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "map_pins_map_id_fkey"
            columns: ["map_id"]
            isOneToOne: false
            referencedRelation: "maps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "map_pins_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      map_regions: {
        Row: {
          created_at: string
          fill_color: string
          fill_opacity: number
          id: string
          map_id: string
          points: Json
          region_id: string
          stroke_color: string
        }
        Insert: {
          created_at?: string
          fill_color?: string
          fill_opacity?: number
          id?: string
          map_id: string
          points: Json
          region_id: string
          stroke_color?: string
        }
        Update: {
          created_at?: string
          fill_color?: string
          fill_opacity?: number
          id?: string
          map_id?: string
          points?: Json
          region_id?: string
          stroke_color?: string
        }
        Relationships: [
          {
            foreignKeyName: "map_regions_map_id_fkey"
            columns: ["map_id"]
            isOneToOne: false
            referencedRelation: "maps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "map_regions_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      maps: {
        Row: {
          campaign_id: string
          created_at: string
          height_px: number
          id: string
          image_url: string
          is_primary: boolean
          name: string
          parent_region_id: string | null
          updated_at: string
          width_px: number
        }
        Insert: {
          campaign_id: string
          created_at?: string
          height_px: number
          id?: string
          image_url: string
          is_primary?: boolean
          name: string
          parent_region_id?: string | null
          updated_at?: string
          width_px: number
        }
        Update: {
          campaign_id?: string
          created_at?: string
          height_px?: number
          id?: string
          image_url?: string
          is_primary?: boolean
          name?: string
          parent_region_id?: string | null
          updated_at?: string
          width_px?: number
        }
        Relationships: [
          {
            foreignKeyName: "maps_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maps_parent_region_id_fkey"
            columns: ["parent_region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      misc_categories: {
        Row: {
          campaign_id: string
          icon: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          campaign_id: string
          icon?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          campaign_id?: string
          icon?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "misc_categories_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      misc_entries: {
        Row: {
          campaign_id: string
          category_id: string
          content_html: string | null
          created_at: string
          created_by: string | null
          hero_image_url: string | null
          id: string
          name: string
          slug: string
          summary: string | null
          tags: string[]
          updated_at: string
        }
        Insert: {
          campaign_id: string
          category_id: string
          content_html?: string | null
          created_at?: string
          created_by?: string | null
          hero_image_url?: string | null
          id?: string
          name: string
          slug: string
          summary?: string | null
          tags?: string[]
          updated_at?: string
        }
        Update: {
          campaign_id?: string
          category_id?: string
          content_html?: string | null
          created_at?: string
          created_by?: string | null
          hero_image_url?: string | null
          id?: string
          name?: string
          slug?: string
          summary?: string | null
          tags?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "misc_entries_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "misc_entries_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "misc_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      quest_gm_notes: {
        Row: {
          complications: string | null
          gm_notes: string | null
          quest_id: string
        }
        Insert: {
          complications?: string | null
          gm_notes?: string | null
          quest_id: string
        }
        Update: {
          complications?: string | null
          gm_notes?: string | null
          quest_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quest_gm_notes_quest_id_fkey"
            columns: ["quest_id"]
            isOneToOne: true
            referencedRelation: "quests"
            referencedColumns: ["id"]
          },
        ]
      }
      quests: {
        Row: {
          assigned_player_id: string | null
          campaign_id: string
          content_html: string | null
          created_at: string
          giver_character_id: string | null
          hook: string | null
          id: string
          location_id: string | null
          name: string
          objective: string | null
          progress: string | null
          quest_type: Database["public"]["Enums"]["quest_type"]
          reward: string | null
          slug: string
          status: Database["public"]["Enums"]["quest_status"]
          tags: string[]
          updated_at: string
        }
        Insert: {
          assigned_player_id?: string | null
          campaign_id: string
          content_html?: string | null
          created_at?: string
          giver_character_id?: string | null
          hook?: string | null
          id?: string
          location_id?: string | null
          name: string
          objective?: string | null
          progress?: string | null
          quest_type: Database["public"]["Enums"]["quest_type"]
          reward?: string | null
          slug: string
          status?: Database["public"]["Enums"]["quest_status"]
          tags?: string[]
          updated_at?: string
        }
        Update: {
          assigned_player_id?: string | null
          campaign_id?: string
          content_html?: string | null
          created_at?: string
          giver_character_id?: string | null
          hook?: string | null
          id?: string
          location_id?: string | null
          name?: string
          objective?: string | null
          progress?: string | null
          quest_type?: Database["public"]["Enums"]["quest_type"]
          reward?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["quest_status"]
          tags?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quests_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quests_giver_character_id_fkey"
            columns: ["giver_character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quests_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      region_gm_notes: {
        Row: {
          gm_notes: string | null
          region_id: string
        }
        Insert: {
          gm_notes?: string | null
          region_id: string
        }
        Update: {
          gm_notes?: string | null
          region_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "region_gm_notes_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: true
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      regions: {
        Row: {
          campaign_id: string
          content_html: string | null
          controlled_by_faction_id: string | null
          created_at: string
          hero_image_url: string | null
          id: string
          name: string
          slug: string
          summary: string | null
          updated_at: string
        }
        Insert: {
          campaign_id: string
          content_html?: string | null
          controlled_by_faction_id?: string | null
          created_at?: string
          hero_image_url?: string | null
          id?: string
          name: string
          slug: string
          summary?: string | null
          updated_at?: string
        }
        Update: {
          campaign_id?: string
          content_html?: string | null
          controlled_by_faction_id?: string | null
          created_at?: string
          hero_image_url?: string | null
          id?: string
          name?: string
          slug?: string
          summary?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "regions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "regions_controlled_by_faction_id_fkey"
            columns: ["controlled_by_faction_id"]
            isOneToOne: false
            referencedRelation: "factions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_encounters: {
        Row: {
          campaign_id: string
          created_at: string
          id: string
          is_active: boolean
          name: string | null
          notes: string | null
          session_id: string
          updated_at: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string | null
          notes?: string | null
          session_id: string
          updated_at?: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string | null
          notes?: string | null
          session_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_encounters_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_encounters_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_gm_notes: {
        Row: {
          cliffhanger: string | null
          prep_notes_html: string | null
          quest_progress_notes: string | null
          session_id: string
        }
        Insert: {
          cliffhanger?: string | null
          prep_notes_html?: string | null
          quest_progress_notes?: string | null
          session_id: string
        }
        Update: {
          cliffhanger?: string | null
          prep_notes_html?: string | null
          quest_progress_notes?: string | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_gm_notes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_npcs: {
        Row: {
          character_id: string
          session_id: string
        }
        Insert: {
          character_id: string
          session_id: string
        }
        Update: {
          character_id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_npcs_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_npcs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          campaign_id: string
          created_at: string
          highlights: string[] | null
          id: string
          is_published: boolean
          location_id: string | null
          name: string | null
          session_date: string | null
          session_number: number | null
          slug: string
          summary_html: string | null
          tags: string[]
          updated_at: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          highlights?: string[] | null
          id?: string
          is_published?: boolean
          location_id?: string | null
          name?: string | null
          session_date?: string | null
          session_number?: number | null
          slug: string
          summary_html?: string | null
          tags?: string[]
          updated_at?: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          highlights?: string[] | null
          id?: string
          is_published?: boolean
          location_id?: string | null
          name?: string | null
          session_date?: string | null
          session_number?: number | null
          slug?: string
          summary_html?: string | null
          tags?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      shattered_lands: {
        Row: {
          created_at: string | null
          data: Json
          id: string
          section: string
        }
        Insert: {
          created_at?: string | null
          data?: Json
          id: string
          section: string
        }
        Update: {
          created_at?: string | null
          data?: Json
          id?: string
          section?: string
        }
        Relationships: []
      }
      story_arc_gm_notes: {
        Row: {
          gm_notes: string | null
          story_arc_id: string
        }
        Insert: {
          gm_notes?: string | null
          story_arc_id: string
        }
        Update: {
          gm_notes?: string | null
          story_arc_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_arc_gm_notes_story_arc_id_fkey"
            columns: ["story_arc_id"]
            isOneToOne: true
            referencedRelation: "story_arcs"
            referencedColumns: ["id"]
          },
        ]
      }
      story_arcs: {
        Row: {
          campaign_id: string
          content_html: string | null
          created_at: string
          hero_image_url: string | null
          id: string
          is_active: boolean
          name: string
          slug: string
          summary: string | null
          updated_at: string
        }
        Insert: {
          campaign_id: string
          content_html?: string | null
          created_at?: string
          hero_image_url?: string | null
          id?: string
          is_active?: boolean
          name: string
          slug: string
          summary?: string | null
          updated_at?: string
        }
        Update: {
          campaign_id?: string
          content_html?: string | null
          created_at?: string
          hero_image_url?: string | null
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          summary?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_arcs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_campaign_invites: {
        Args: { p_campaign_id: string }
        Returns: {
          created_at: string
          email: string
          id: string
          role: Database["public"]["Enums"]["member_role"]
        }[]
      }
      get_campaign_members: {
        Args: { p_campaign_id: string }
        Returns: {
          created_at: string
          display_name: string
          email: string
          id: string
          role: Database["public"]["Enums"]["member_role"]
          user_id: string
        }[]
      }
      invite_campaign_member: {
        Args: {
          p_campaign_id: string
          p_email: string
          p_role: Database["public"]["Enums"]["member_role"]
        }
        Returns: undefined
      }
      is_campaign_member: {
        Args: {
          p_campaign_id: string
          p_role?: Database["public"]["Enums"]["member_role"]
        }
        Returns: boolean
      }
    }
    Enums: {
      battle_type: "battle" | "siege" | "skirmish" | "raid" | "naval" | "other"
      battlefield_type: "land" | "naval" | "aerial" | "urban" | "other"
      character_kind: "npc" | "pc"
      location_type:
        | "settlement"
        | "landmark"
        | "dungeon"
        | "wilderness"
        | "building"
        | "other"
      member_role: "gm" | "player"
      quest_status: "active" | "complete" | "failed" | "abandoned"
      quest_type: "main" | "side" | "personal"
      relationship_type:
        | "family"
        | "faction_hierarchy"
        | "ally"
        | "enemy"
        | "rival"
        | "mentor"
        | "romantic"
        | "associate"
        | "other"
      vitality_status: "alive" | "dead" | "unknown" | "missing"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      battle_type: ["battle", "siege", "skirmish", "raid", "naval", "other"],
      battlefield_type: ["land", "naval", "aerial", "urban", "other"],
      character_kind: ["npc", "pc"],
      location_type: [
        "settlement",
        "landmark",
        "dungeon",
        "wilderness",
        "building",
        "other",
      ],
      member_role: ["gm", "player"],
      quest_status: ["active", "complete", "failed", "abandoned"],
      quest_type: ["main", "side", "personal"],
      relationship_type: [
        "family",
        "faction_hierarchy",
        "ally",
        "enemy",
        "rival",
        "mentor",
        "romantic",
        "associate",
        "other",
      ],
      vitality_status: ["alive", "dead", "unknown", "missing"],
    },
  },
} as const
