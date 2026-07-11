// Hand-written types for Phase 1 tables. Once migrations are applied to the
// linked Supabase project, regenerate the authoritative version with:
//   supabase gen types typescript --linked > src/types/database.ts
//
// NOTE: these row shapes must be `type` aliases, not `interface`s — Supabase's
// generic client requires each Row to structurally satisfy
// `Record<string, unknown>`, and TypeScript only infers an implicit index
// signature for object type literals/aliases, not for interfaces.

export type MemberRole = 'gm' | 'player'
export type CharacterKind = 'npc' | 'pc'
export type VitalityStatus = 'alive' | 'dead' | 'unknown' | 'missing'
export type QuestType = 'main' | 'side' | 'personal'
export type QuestStatus = 'active' | 'complete' | 'failed' | 'abandoned'
export type LocationType = 'settlement' | 'landmark' | 'dungeon' | 'wilderness' | 'building' | 'other'

type Timestamps = {
  created_at: string
  updated_at: string
}

export type Campaign = Timestamps & {
  id: string
  slug: string
  name: string
  description: string | null
  cover_image_url: string | null
  created_by: string | null
}

export type CampaignMember = {
  id: string
  campaign_id: string
  user_id: string
  role: MemberRole
  display_name: string | null
  created_at: string
}

export type Region = Timestamps & {
  id: string
  campaign_id: string
  slug: string
  name: string
  controlled_by_faction_id: string | null
  summary: string | null
  content_html: string | null
  hero_image_url: string | null
}

export type Location = Timestamps & {
  id: string
  campaign_id: string
  region_id: string | null
  slug: string
  name: string
  type: LocationType | null
  tags: string[]
  controlled_by_faction_id: string | null
  atmosphere: string | null
  short_blurb: string | null
  content_html: string | null
  hero_image_url: string | null
}

export type LocationGmNotes = {
  location_id: string
  secrets: string | null
  dangers: string | null
  gm_notes: string | null
}

export type Faction = Timestamps & {
  id: string
  campaign_id: string
  slug: string
  name: string
  type: string | null
  tags: string[]
  hq_location_id: string | null
  goal: string | null
  resources: string | null
  content_html: string | null
  hero_image_url: string | null
}

export type FactionGmNotes = {
  faction_id: string
  secrets: string | null
  gm_notes: string | null
}

export type Divinity = Timestamps & {
  id: string
  campaign_id: string
  slug: string
  name: string
  domain: string | null
  realm: string | null
  dogma: string | null
  worshippers: string | null
  content_html: string | null
  hero_image_url: string | null
}

export type DivinityGmNotes = {
  divinity_id: string
  secret: string | null
}

export type Character = Timestamps & {
  id: string
  campaign_id: string
  slug: string
  name: string
  kind: CharacterKind
  player_user_id: string | null
  demiplane_url: string | null
  role_or_title: string | null
  tags: string[]
  faction_id: string | null
  faction_rank: string | null
  home_location_id: string | null
  attitude: string | null
  vitality: VitalityStatus
  appearance: string | null
  personality: string | null
  portrait_url: string | null
  content_html: string | null
}

export type CharacterGmNotes = {
  character_id: string
  secrets: string | null
  gm_notes: string | null
  stat_block: Record<string, unknown> | null
}

export type Quest = Timestamps & {
  id: string
  campaign_id: string
  slug: string
  name: string
  quest_type: QuestType
  status: QuestStatus
  assigned_player_id: string | null
  giver_character_id: string | null
  location_id: string | null
  hook: string | null
  objective: string | null
  reward: string | null
  progress: string | null
  tags: string[]
  content_html: string | null
}

export type QuestGmNotes = {
  quest_id: string
  complications: string | null
  gm_notes: string | null
}

// Minimal Supabase-shaped Database type so supabase-js generics work.
// Insert/Update are loosened to Partial<Row> minus generated columns, which is
// good enough for Phase 1 hand-maintained types (codegen will tighten this later).
type Table<Row> = {
  Row: Row
  Insert: Partial<Row>
  Update: Partial<Row>
  Relationships: []
}

export type Database = {
  public: {
    Views: Record<string, never>
    Functions: Record<string, never>
    Tables: {
      campaigns: Table<Campaign>
      campaign_members: Table<CampaignMember>
      regions: Table<Region>
      locations: Table<Location>
      location_gm_notes: Table<LocationGmNotes>
      factions: Table<Faction>
      faction_gm_notes: Table<FactionGmNotes>
      divinities: Table<Divinity>
      divinity_gm_notes: Table<DivinityGmNotes>
      characters: Table<Character>
      character_gm_notes: Table<CharacterGmNotes>
      quests: Table<Quest>
      quest_gm_notes: Table<QuestGmNotes>
    }
  }
}
