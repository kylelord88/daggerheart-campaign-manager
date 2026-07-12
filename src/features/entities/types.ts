export type FieldKind = 'text' | 'textarea' | 'richtext' | 'select' | 'tags' | 'reference' | 'player' | 'image'
export type ShapeKind = 'square' | 'circle' | 'triangle' | 'diamond'

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
  /** Field keys (from `fields`) shown as a compact caps meta line under the title on list cards */
  listMetaFieldKeys?: string[]
  /** Field key (rich text or plain text) a short excerpt is derived from on list cards */
  listExcerptField?: string
  /** Field key whose value selects a shape icon on list cards (e.g. a location's `type`) */
  listShapeField?: string
  /** Maps the listShapeField's value to a shape glyph */
  listShapeMap?: Record<string, ShapeKind>
  /** Field key shown as a thumbnail on list cards and as the big hero image on the detail page (kind: 'image') */
  heroImageFieldKey?: string
}
