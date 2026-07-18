import type { ComponentType } from 'react'

export type FieldKind =
  | 'text'
  | 'url'
  | 'textarea'
  | 'richtext'
  | 'select'
  | 'tags'
  | 'reference'
  | 'player'
  | 'image'
  | 'date'
  | 'boolean'
  | 'number'
export type ShapeKind = 'square' | 'circle' | 'triangle' | 'diamond' | 'settlement' | 'wilderness' | 'landmark' | 'dungeon'

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
  /**
   * Hides this field from non-GM viewers in read-only view mode, even though
   * it lives on the main (non-gmTable) row. Use for columns that must be on
   * the public table for structural reasons (e.g. a workflow flag referenced
   * by RLS) but aren't meant for players to see.
   */
  visibleToGmOnly?: boolean
  /**
   * The member who owns this record (per EntityConfig.ownerFieldKey) can edit
   * this one field themselves in view mode, without full GM edit rights -
   * e.g. a player setting their own character's Demiplane link. Persisted via
   * a narrow SECURITY DEFINER RPC, not a general self-UPDATE policy.
   */
  playerEditableWhenOwned?: boolean
  /**
   * Still editable on the form, but never rendered as a content block on the
   * read-only Details/GM Notes view - for fields used elsewhere entirely
   * (e.g. a location's map-tooltip blurb), where repeating it in the normal
   * prose flow would just be redundant clutter.
   */
  hideFromDetailView?: boolean
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
  /** Field keys (from `fields`) shown as filter dropdowns above the list grid */
  listFilterFieldKeys?: string[]
  /** Splits the list into top-level tabs by a field's value (e.g. Characters' Kind -> NPCs/PCs), instead of that field being one of the filter dropdowns. */
  listTabs?: { fieldKey: string; tabs: Array<{ value: string; label: string }> }
  /** Label for the public-facing view tab, shown alongside "GM Notes". Defaults to "Details". */
  publicTabLabel?: string
  /**
   * Extra top-level tabs after "GM Notes" (e.g. Sessions' Encounters/Roll
   * Tables). GM-only by default; `gmOnly: false` makes the tab visible to
   * every member (e.g. Sessions' Clocks) — the component itself must then
   * render read-only for non-GMs (RLS enforces this server-side regardless).
   * Not shown for a new/unsaved record.
   */
  extraTabs?: Array<{
    key: string
    label: string
    gmOnly?: boolean
    component: ComponentType<{ entityId: string; campaignId: string }>
  }>
  /** Field key (a 'player' reference to auth.users) that marks who "owns" a record, for playerEditableWhenOwned fields. */
  ownerFieldKey?: string
  /** Overrides the default list sort (by `name` ascending), e.g. Sessions sorts newest-first. */
  listOrderBy?: { key: string; ascending: boolean }
}
