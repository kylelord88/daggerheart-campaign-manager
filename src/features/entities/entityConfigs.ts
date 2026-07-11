import type { EntityConfig } from './types'

export const LOCATION_CONFIG: EntityConfig = {
  table: 'locations',
  gmTable: 'location_gm_notes',
  gmFk: 'location_id',
  path: 'locations',
  label: 'Location',
  labelPlural: 'Locations',
  listSubtitleField: 'short_blurb',
  fields: [
    { key: 'name', label: 'Name', kind: 'text' },
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
    { key: 'short_blurb', label: 'Map Tooltip Blurb', kind: 'textarea', placeholder: 'Shown when hovering this location on the map' },
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
  listSubtitleField: 'type',
  fields: [
    { key: 'name', label: 'Name', kind: 'text' },
    { key: 'type', label: 'Type', kind: 'text', placeholder: 'Nation, Guild, Cult...' },
    { key: 'tags', label: 'Tags', kind: 'tags' },
    { key: 'hq_location_id', label: 'Headquarters', kind: 'reference', reference: { table: 'locations', labelField: 'name' } },
    { key: 'goal', label: 'Goal', kind: 'textarea' },
    { key: 'resources', label: 'Resources', kind: 'textarea' },
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
  listSubtitleField: 'domain',
  fields: [
    { key: 'name', label: 'Name', kind: 'text' },
    { key: 'domain', label: 'Domain', kind: 'text' },
    { key: 'realm', label: 'Realm', kind: 'text' },
    { key: 'worshippers', label: 'Worshippers', kind: 'textarea' },
    { key: 'dogma', label: 'Dogma', kind: 'textarea' },
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
  listSubtitleField: 'role_or_title',
  fields: [
    { key: 'name', label: 'Name', kind: 'text' },
    { key: 'kind', label: 'Kind', kind: 'select', options: ['npc', 'pc'] },
    { key: 'role_or_title', label: 'Role / Title', kind: 'text' },
    { key: 'tags', label: 'Tags', kind: 'tags' },
    { key: 'faction_id', label: 'Faction', kind: 'reference', reference: { table: 'factions', labelField: 'name' } },
    { key: 'faction_rank', label: 'Faction Rank', kind: 'text' },
    { key: 'home_location_id', label: 'Home Location', kind: 'reference', reference: { table: 'locations', labelField: 'name' } },
    { key: 'attitude', label: 'Attitude', kind: 'text', placeholder: 'ally, hostile, neutral...' },
    { key: 'vitality', label: 'Vitality', kind: 'select', options: ['alive', 'dead', 'unknown', 'missing'] },
    { key: 'demiplane_url', label: 'Demiplane Character Sheet URL', kind: 'text', placeholder: 'https://demiplane.com/...' },
    { key: 'appearance', label: 'Appearance', kind: 'textarea' },
    { key: 'personality', label: 'Personality', kind: 'textarea' },
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
  listSubtitleField: 'quest_type',
  fields: [
    { key: 'name', label: 'Name', kind: 'text' },
    { key: 'quest_type', label: 'Type', kind: 'select', options: ['main', 'side', 'personal'] },
    { key: 'status', label: 'Status', kind: 'select', options: ['active', 'complete', 'failed', 'abandoned'] },
    {
      key: 'assigned_player_id',
      label: 'Assigned Player (personal quests)',
      kind: 'reference',
      reference: { table: 'campaign_members', labelField: 'display_name', extraEq: { role: 'player' } },
    },
    { key: 'giver_character_id', label: 'Quest Giver', kind: 'reference', reference: { table: 'characters', labelField: 'name' } },
    { key: 'location_id', label: 'Location', kind: 'reference', reference: { table: 'locations', labelField: 'name' } },
    { key: 'tags', label: 'Tags', kind: 'tags' },
    { key: 'hook', label: 'Hook', kind: 'textarea' },
    { key: 'objective', label: 'Objective', kind: 'textarea' },
    { key: 'reward', label: 'Reward', kind: 'textarea' },
    { key: 'progress', label: 'Progress', kind: 'textarea' },
    { key: 'content_html', label: 'Details', kind: 'richtext' },
  ],
  gmFields: [
    { key: 'complications', label: 'Complications', kind: 'textarea' },
    { key: 'gm_notes', label: 'GM Notes', kind: 'richtext' },
  ],
}

export const ENTITY_CONFIGS = [LOCATION_CONFIG, FACTION_CONFIG, DIVINITY_CONFIG, CHARACTER_CONFIG, QUEST_CONFIG]
