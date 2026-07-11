// Convenience aliases over the generated Supabase types. Regenerate the
// underlying file after any schema migration with:
//   supabase gen types typescript --linked > src/types/database.generated.ts
export type { Database } from './database.generated'
import type { Database } from './database.generated'

type Tables = Database['public']['Tables']

export type Campaign = Tables['campaigns']['Row']
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

export type MemberRole = Database['public']['Enums']['member_role']
export type CharacterKind = Database['public']['Enums']['character_kind']
export type VitalityStatus = Database['public']['Enums']['vitality_status']
export type QuestType = Database['public']['Enums']['quest_type']
export type QuestStatus = Database['public']['Enums']['quest_status']
export type LocationType = Database['public']['Enums']['location_type']
