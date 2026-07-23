// Convenience aliases over the generated Supabase types. Regenerate the
// underlying file after any schema migration with:
//   supabase gen types typescript --linked > src/types/database.generated.ts
export type { Database } from './database.generated'
import type { Database } from './database.generated'

type Tables = Database['public']['Tables']

// recap_session_id (migration 20260722120000) isn't in the generated types yet
// — same manual-bridge trick as the session intersections below. Optional so
// the generated Row (which lacks the column) still satisfies Campaign where the
// typed client is used directly (CampaignContext); becomes a no-op once types
// are regenerated.
export type Campaign = Tables['campaigns']['Row'] & { recap_session_id?: string | null }
export type CampaignMember = Tables['campaign_members']['Row']
export type Region = Tables['regions']['Row']
export type Location = Tables['locations']['Row']
export type LocationGmNotes = Tables['location_gm_notes']['Row']
export type Faction = Tables['factions']['Row']
export type FactionGmNotes = Tables['faction_gm_notes']['Row']
export type Divinity = Tables['divinities']['Row']
export type DivinityGmNotes = Tables['divinity_gm_notes']['Row']
export type Character = Tables['characters']['Row']
export type CharacterGmNotes = Tables['character_gm_notes']['Row']
export type Quest = Tables['quests']['Row']
export type QuestGmNotes = Tables['quest_gm_notes']['Row']
export type MapRow = Tables['maps']['Row']
export type MapPin = Tables['map_pins']['Row']
export type MiscCategory = Tables['misc_categories']['Row']
export type MiscEntry = Tables['misc_entries']['Row']
export type PlayerNote = Tables['player_notes']['Row']
// The `& { is_current }` / `& { revealed }` intersections below are the same
// temporary-bridge trick as SessionCountdown's `is_active`: this repo's
// `supabase gen types` regen currently fails in this environment (the CLI's
// logged-in account doesn't have access to this project), so migration
// 20260722100000's new columns/table aren't in the generated file yet.
// Regenerate with `supabase gen types typescript --linked > src/types/database.generated.ts`
// once that access issue is sorted, then these intersections become harmless
// no-ops and can be dropped.
export type Session = Tables['sessions']['Row'] & { is_current: boolean }
export type SessionGmNotes = Tables['session_gm_notes']['Row']
export type SessionEncounter = Tables['session_encounters']['Row']
export type EncounterCombatant = Tables['encounter_combatants']['Row']
export type SessionRollTable = Tables['session_roll_tables']['Row']
export type SessionRollTableEntry = Tables['session_roll_table_entries']['Row']
export type SessionCountdown = Tables['session_countdowns']['Row'] & { is_active: boolean }
export type SessionNpc = Tables['session_npcs']['Row'] & { revealed: boolean }
// session_locations is a brand-new table (migration 20260722100000) that
// isn't in the generated types at all yet - defined by hand from the
// migration's exact column list until types are regenerated.
export interface SessionLocation {
  id: string
  session_id: string
  location_id: string
  revealed: boolean
  created_at: string
}
export type Profile = Tables['profiles']['Row']

export type MemberRole = Database['public']['Enums']['member_role']
export type CharacterKind = Database['public']['Enums']['character_kind']
export type VitalityStatus = Database['public']['Enums']['vitality_status']
export type QuestType = Database['public']['Enums']['quest_type']
export type QuestStatus = Database['public']['Enums']['quest_status']
export type LocationType = Database['public']['Enums']['location_type']
