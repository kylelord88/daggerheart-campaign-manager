import type { EntityConfig } from './types'
import { EncountersTab, RollTablesTab } from '../sessions/SessionGmTabExtra'
import { ClocksTab } from '../sessions/SessionClocksTab'

export const LOCATION_CONFIG: EntityConfig = {
  table: 'locations',
  gmTable: 'location_gm_notes',
  gmFk: 'location_id',
  path: 'locations',
  label: 'Location',
  labelPlural: 'Locations',
  listMetaFieldKeys: ['type', 'region_id'],
  listExcerptField: 'content_html',
  listFilterFieldKeys: ['type', 'region_id'],
  listShapeField: 'type',
  listShapeMap: {
    settlement: 'settlement',
    building: 'settlement',
    wilderness: 'wilderness',
    other: 'wilderness',
    landmark: 'landmark',
    dungeon: 'dungeon',
  },
  fields: [
    { key: 'name', label: 'Name', kind: 'text' },
    { key: 'hero_image_url', label: 'Photo', kind: 'image' },
    {
      key: 'type',
      label: 'Type',
      kind: 'select',
      options: ['settlement', 'landmark', 'dungeon', 'wilderness', 'building', 'other'],
    },
    { key: 'tags', label: 'Tags', kind: 'tags' },
    { key: 'region_id', label: 'Region', kind: 'reference', reference: { table: 'regions', labelField: 'name' } },
    {
      key: 'controlled_by_faction_id',
      label: 'Controlled By',
      kind: 'reference',
      reference: { table: 'factions', labelField: 'name' },
    },
    { key: 'atmosphere', label: 'Atmosphere', kind: 'textarea' },
    {
      key: 'short_blurb',
      label: 'Map Tooltip Blurb',
      kind: 'textarea',
      placeholder: 'Shown when hovering this location on the map',
      hideFromDetailView: true,
    },
    { key: 'is_published', label: 'Published (visible to players)', kind: 'boolean', visibleToGmOnly: true },
    { key: 'content_html', label: 'Description', kind: 'richtext' },
  ],
  gmFields: [
    { key: 'dangers', label: 'Dangers', kind: 'textarea' },
    { key: 'secrets', label: 'Secrets', kind: 'textarea' },
    { key: 'gm_notes', label: 'GM Notes', kind: 'richtext' },
  ],
}

export const FACTION_CONFIG: EntityConfig = {
  table: 'factions',
  gmTable: 'faction_gm_notes',
  gmFk: 'faction_id',
  path: 'factions',
  label: 'Faction',
  labelPlural: 'Factions',
  listMetaFieldKeys: ['type'],
  listExcerptField: 'content_html',
  fields: [
    { key: 'name', label: 'Name', kind: 'text' },
    { key: 'hero_image_url', label: 'Photo', kind: 'image' },
    { key: 'type', label: 'Type', kind: 'text', placeholder: 'Nation, Guild, Cult...' },
    { key: 'tags', label: 'Tags', kind: 'tags' },
    { key: 'hq_location_id', label: 'Headquarters', kind: 'reference', reference: { table: 'locations', labelField: 'name' } },
    { key: 'goal', label: 'Goal', kind: 'textarea' },
    { key: 'resources', label: 'Resources', kind: 'textarea' },
    { key: 'is_published', label: 'Published (visible to players)', kind: 'boolean', visibleToGmOnly: true },
    { key: 'content_html', label: 'Description', kind: 'richtext' },
  ],
  gmFields: [
    { key: 'secrets', label: 'Secrets', kind: 'textarea' },
    { key: 'gm_notes', label: 'GM Notes', kind: 'richtext' },
  ],
}

export const DIVINITY_CONFIG: EntityConfig = {
  table: 'divinities',
  gmTable: 'divinity_gm_notes',
  gmFk: 'divinity_id',
  path: 'divinities',
  label: 'Divinity',
  labelPlural: 'Divinities',
  listMetaFieldKeys: ['domain'],
  listExcerptField: 'dogma',
  fields: [
    { key: 'name', label: 'Name', kind: 'text' },
    { key: 'hero_image_url', label: 'Photo', kind: 'image' },
    { key: 'domain', label: 'Domain', kind: 'text' },
    { key: 'realm', label: 'Realm', kind: 'text' },
    { key: 'worshippers', label: 'Worshippers', kind: 'textarea' },
    { key: 'dogma', label: 'Dogma', kind: 'textarea' },
    { key: 'is_published', label: 'Published (visible to players)', kind: 'boolean', visibleToGmOnly: true },
    { key: 'content_html', label: 'Description', kind: 'richtext' },
  ],
  gmFields: [{ key: 'secret', label: 'Secret', kind: 'textarea' }],
}

export const CHARACTER_CONFIG: EntityConfig = {
  table: 'characters',
  gmTable: 'character_gm_notes',
  gmFk: 'character_id',
  path: 'characters',
  label: 'Character',
  labelPlural: 'Characters',
  listMetaFieldKeys: ['role_or_title', 'faction_id'],
  listExcerptField: 'personality',
  listFilterFieldKeys: ['attitude', 'vitality'],
  listTabs: { fieldKey: 'kind', tabs: [{ value: 'npc', label: 'NPCs' }, { value: 'pc', label: 'PCs' }] },
  heroImageFieldKey: 'portrait_url',
  ownerFieldKey: 'player_user_id',
  fields: [
    { key: 'name', label: 'Name', kind: 'text' },
    { key: 'portrait_url', label: 'Portrait', kind: 'image' },
    { key: 'kind', label: 'Kind', kind: 'select', options: ['npc', 'pc'] },
    { key: 'player_user_id', label: 'Played By', kind: 'player', placeholder: 'Only relevant for PCs' },
    { key: 'role_or_title', label: 'Role / Title', kind: 'text' },
    { key: 'tags', label: 'Tags', kind: 'tags' },
    { key: 'faction_id', label: 'Faction', kind: 'reference', reference: { table: 'factions', labelField: 'name' } },
    { key: 'faction_rank', label: 'Faction Rank', kind: 'text' },
    { key: 'home_location_id', label: 'Home Location', kind: 'reference', reference: { table: 'locations', labelField: 'name' } },
    { key: 'attitude', label: 'Attitude', kind: 'text', placeholder: 'ally, hostile, neutral...' },
    { key: 'vitality', label: 'Vitality', kind: 'select', options: ['alive', 'dead', 'unknown', 'missing'] },
    {
      key: 'demiplane_url',
      label: 'Character Sheet',
      kind: 'url',
      placeholder: 'https://demiplane.com/...',
      playerEditableWhenOwned: true,
    },
    { key: 'appearance', label: 'Appearance', kind: 'textarea' },
    { key: 'personality', label: 'Personality', kind: 'textarea' },
    { key: 'is_published', label: 'Published (visible to players)', kind: 'boolean', visibleToGmOnly: true },
    { key: 'content_html', label: 'Bio', kind: 'richtext' },
  ],
  gmFields: [
    { key: 'secrets', label: 'Secrets', kind: 'textarea' },
    { key: 'gm_notes', label: 'GM Notes', kind: 'richtext' },
  ],
}

export const QUEST_CONFIG: EntityConfig = {
  table: 'quests',
  gmTable: 'quest_gm_notes',
  gmFk: 'quest_id',
  path: 'quests',
  label: 'Quest',
  labelPlural: 'Quests',
  // No listMetaFieldKeys/listExcerptField/listFilterFieldKeys - Quests uses
  // its own list page (features/quests/QuestListPage.tsx), sectioned by
  // status with a fixed Main/Side/Personal order, instead of the generic
  // EntityListPage. This config still drives the create/edit/detail form.
  fields: [
    { key: 'name', label: 'Name', kind: 'text' },
    { key: 'hero_image_url', label: 'Photo', kind: 'image' },
    { key: 'quest_type', label: 'Type', kind: 'select', options: ['main', 'side', 'personal'] },
    { key: 'status', label: 'Status', kind: 'select', options: ['active', 'complete', 'failed', 'abandoned'] },
    { key: 'assigned_player_id', label: 'Assigned Player (personal quests)', kind: 'player' },
    { key: 'giver_character_id', label: 'Quest Giver', kind: 'reference', reference: { table: 'characters', labelField: 'name' } },
    { key: 'location_id', label: 'Location', kind: 'reference', reference: { table: 'locations', labelField: 'name' } },
    { key: 'tags', label: 'Tags', kind: 'tags' },
    { key: 'hook', label: 'Hook', kind: 'textarea' },
    { key: 'objective', label: 'Objective', kind: 'textarea' },
    { key: 'reward', label: 'Reward', kind: 'textarea' },
    { key: 'progress', label: 'Progress', kind: 'textarea' },
    { key: 'is_published', label: 'Published (visible to players)', kind: 'boolean', visibleToGmOnly: true },
    { key: 'content_html', label: 'Details', kind: 'richtext' },
  ],
  gmFields: [
    { key: 'complications', label: 'Complications', kind: 'textarea' },
    { key: 'gm_notes', label: 'GM Notes', kind: 'richtext' },
  ],
}

export const SESSION_CONFIG: EntityConfig = {
  table: 'sessions',
  gmTable: 'session_gm_notes',
  gmFk: 'session_id',
  path: 'sessions',
  label: 'Session',
  labelPlural: 'Sessions',
  listMetaFieldKeys: ['session_date', 'location_id'],
  listExcerptField: 'summary_html',
  listOrderBy: { key: 'session_number', ascending: false },
  publicTabLabel: 'Recap',
  extraTabs: [
    { key: 'encounters', label: 'Encounters', component: EncountersTab },
    { key: 'rollTables', label: 'Roll Tables', component: RollTablesTab },
    // GM-only tab (like Encounters/Roll Tables). Players never see clocks here —
    // only the active clock's floating widget (bottom-left, all pages) is player-facing.
    { key: 'clocks', label: 'Clocks', component: ClocksTab },
  ],
  fields: [
    { key: 'name', label: 'Name', kind: 'text' },
    { key: 'hero_image_url', label: 'Photo', kind: 'image' },
    { key: 'session_number', label: 'Session #', kind: 'number' },
    { key: 'session_date', label: 'Date', kind: 'date' },
    { key: 'location_id', label: 'Location', kind: 'reference', reference: { table: 'locations', labelField: 'name' } },
    { key: 'tags', label: 'Tags', kind: 'tags' },
    {
      key: 'is_published',
      label: 'Published (visible to players)',
      kind: 'boolean',
      visibleToGmOnly: true,
    },
    { key: 'highlights', label: 'Highlights', kind: 'tags' },
    { key: 'summary_html', label: 'Player-Facing Recap', kind: 'richtext' },
  ],
  gmFields: [
    { key: 'prep_notes_html', label: 'Prep Notes / Story / Dialogue', kind: 'richtext' },
    { key: 'cliffhanger', label: 'Cliffhanger', kind: 'textarea' },
    { key: 'quest_progress_notes', label: 'Quest Progress', kind: 'textarea' },
  ],
}

export const ENTITY_CONFIGS = [LOCATION_CONFIG, FACTION_CONFIG, DIVINITY_CONFIG, CHARACTER_CONFIG, QUEST_CONFIG, SESSION_CONFIG]
