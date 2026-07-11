export type FieldKind = 'text' | 'textarea' | 'richtext' | 'select' | 'tags' | 'reference'

export interface ReferenceConfig {
  table: string
  labelField: string
  // e.g. { role: 'player' } to restrict campaign_members to players only
  extraEq?: Record<string, string>
}

export interface FieldConfig {
  key: string
  label: string
  kind: FieldKind
  options?: string[] // for 'select'
  reference?: ReferenceConfig // for 'reference'
  placeholder?: string
}

export interface EntityConfig {
  /** Supabase table name for the public row */
  table: string
  /** Supabase table name for the GM-only sibling row, if any */
  gmTable?: string
  /** Column on gmTable that is both its PK and the FK back to the entity id */
  gmFk?: string
  /** URL path segment, e.g. 'locations' */
  path: string
  label: string
  labelPlural: string
  fields: FieldConfig[]
  gmFields?: FieldConfig[]
  /** Optional short list-page subtitle field */
  listSubtitleField?: string
}
