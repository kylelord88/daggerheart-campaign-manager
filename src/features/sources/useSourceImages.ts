import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { supabase } from '../../lib/supabaseClient'

const SOURCES_BUCKET = 'gm-sources'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (table: string) => supabase.from(table as any) as any

// Declared locally so the app typechecks even before types are regenerated
// (mirrors AdversaryLibraryEntry / EnvironmentLibraryEntry).
export interface SourceImage {
  id: string
  campaign_id: string
  name: string
  description: string | null
  // Nullable since migration 20260724000000 — a source can be a text-only
  // entry (e.g. a district/establishment inside a city) with no uploaded image.
  image_path: string | null
  is_shared: boolean
  created_at: string
  updated_at: string
}

export function useSourceImages(campaignId: string | undefined) {
  return useQuery({
    queryKey: ['gm-source-images', campaignId],
    enabled: Boolean(campaignId),
    queryFn: async (): Promise<SourceImage[]> => {
      const { data, error } = await db('gm_source_images')
        .select('*')
        .eq('campaign_id', campaignId!)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as SourceImage[]
    },
  })
}

// Every image the GM has shared campaign-wide — for the player-facing
// "Handouts" tab on My Notes. Explicitly filters is_shared itself rather than
// relying on RLS alone: a GM's own account can read unshared rows too (that's
// the whole point of the feature), so without this filter a GM viewing their
// own My Notes page would see everything, shared or not. Players get the same
// filtered result via RLS either way.
//
// Images attached to a location are deliberately EXCLUDED here: those live on
// the location page's "Districts & Establishments" section and shouldn't also
// surface in the campaign-wide Handouts feed (Kyle's call — a district/
// establishment image belongs to its place, not the general handout pile).
// The exclusion works for players too: RLS lets a member read
// source_attachments rows whose image is shared, which is exactly the set we
// want to filter out. Other attachment types (characters, quests, etc.) are
// left alone and still show as handouts.
export function useSharedSourceImages(campaignId: string | undefined) {
  return useQuery({
    queryKey: ['shared-source-images', campaignId],
    enabled: Boolean(campaignId),
    queryFn: async (): Promise<SourceImage[]> => {
      const { data, error } = await db('gm_source_images')
        .select('*')
        .eq('campaign_id', campaignId!)
        .eq('is_shared', true)
        .order('name', { ascending: true })
      if (error) throw error
      const shared = data as SourceImage[]

      const { data: locAttach, error: attachError } = await db('source_attachments')
        .select('source_id')
        .eq('campaign_id', campaignId!)
        .eq('entity_table', 'locations')
      if (attachError) throw attachError
      const attachedToLocation = new Set(
        (locAttach as Array<{ source_id: string }>).map((r) => r.source_id)
      )

      return shared.filter((s) => !attachedToLocation.has(s.id))
    },
  })
}

// Source ids that are attached to at least one location. The Sources library
// page uses this to HIDE those entries: a location-attached entry is that
// place's "District/Establishment" and is managed in the location's tab, not
// as a general reference source (Kyle's call — keep the two separate). Kept as
// its own tiny query (rather than folding into useSourceImages) so the session
// source picker, which also uses useSourceImages, still sees the full library.
export function useLocationAttachedSourceIds(campaignId: string | undefined) {
  return useQuery({
    queryKey: ['location-attached-source-ids', campaignId],
    enabled: Boolean(campaignId),
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await db('source_attachments')
        .select('source_id')
        .eq('campaign_id', campaignId!)
        .eq('entity_table', 'locations')
      if (error) throw error
      return (data as Array<{ source_id: string }>).map((r) => r.source_id)
    },
  })
}

// Bucket is private (see migration 20260721130000) — getPublicUrl would
// produce a URL that 403s. Resolve a short-lived signed URL instead, which
// still goes through the bucket's select RLS (GM-only) at sign time.
export function useSignedSourceUrl(path: string | null | undefined) {
  return useQuery({
    queryKey: ['gm-source-signed-url', path],
    enabled: Boolean(path),
    staleTime: 1000 * 60 * 50, // signed for 1hr; refetch a bit before it expires
    queryFn: async (): Promise<string> => {
      const { data, error } = await supabase.storage.from(SOURCES_BUCKET).createSignedUrl(path!, 3600)
      if (error) throw error
      return data.signedUrl
    },
  })
}

function invalidate(queryClient: ReturnType<typeof useQueryClient>, campaignId: string) {
  queryClient.invalidateQueries({ queryKey: ['gm-source-images', campaignId] })
}

async function uploadSourceFile(campaignId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `${campaignId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const { error } = await supabase.storage.from(SOURCES_BUCKET).upload(path, file)
  if (error) throw error
  return path
}

export function useCreateSourceImage() {
  const queryClient = useQueryClient()
  return useMutation({
    // Returns the new row's id so callers can attach it in the same flow (e.g.
    // the inline "add a district/establishment" form on a location's tab).
    mutationFn: async (args: {
      campaignId: string
      name: string
      description: string | null
      file?: File | null
      isShared: boolean
    }): Promise<{ id: string }> => {
      const path = args.file ? await uploadSourceFile(args.campaignId, args.file) : null
      const { data, error } = await db('gm_source_images')
        .insert({
          campaign_id: args.campaignId,
          name: args.name,
          description: args.description,
          image_path: path,
          is_shared: args.isShared,
        })
        .select('id')
        .single()
      if (error) throw error
      return { id: (data as { id: string }).id }
    },
    onSuccess: (_r, v) => invalidate(queryClient, v.campaignId),
  })
}

export function useUpdateSourceImage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (args: {
      id: string
      campaignId: string
      name: string
      description: string | null
      file?: File | null
      previousPath: string | null
      isShared: boolean
    }) => {
      if (args.file) {
        const path = await uploadSourceFile(args.campaignId, args.file)
        const { error } = await db('gm_source_images')
          .update({ name: args.name, description: args.description, image_path: path, is_shared: args.isShared })
          .eq('id', args.id)
        if (error) throw error
        // Best-effort cleanup of the replaced image; not fatal if it fails.
        // Skipped when there was no previous image (a text-only entry).
        if (args.previousPath) await supabase.storage.from(SOURCES_BUCKET).remove([args.previousPath])
      } else {
        const { error } = await db('gm_source_images')
          .update({ name: args.name, description: args.description, is_shared: args.isShared })
          .eq('id', args.id)
        if (error) throw error
      }
    },
    onSuccess: (_r, v) => invalidate(queryClient, v.campaignId),
  })
}

export function useDeleteSourceImage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, imagePath }: { id: string; campaignId: string; imagePath: string | null }) => {
      const { error } = await db('gm_source_images').delete().eq('id', id)
      if (error) throw error
      // Best-effort: the row is gone either way, so a storage cleanup failure
      // shouldn't surface as a delete failure to the GM. Nothing to remove for
      // a text-only entry.
      if (imagePath) await supabase.storage.from(SOURCES_BUCKET).remove([imagePath])
    },
    onSuccess: (_r, v) => invalidate(queryClient, v.campaignId),
  })
}

// ---------------- session_sources (reference join) ----------------
// A session points at Source library images the GM wants on hand during play —
// a glance-reference while describing a location/NPC mid-session. Pure
// REFERENCE join (no snapshot), GM-only, mirrors session_environments exactly.

export interface SessionSourceRow {
  id: string
  session_id: string
  campaign_id: string
  source_id: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export interface SessionSourceWithEntry extends SessionSourceRow {
  gm_source_images: SourceImage | null
}

export function useSessionSources(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['session-sources', sessionId],
    enabled: Boolean(sessionId),
    queryFn: async (): Promise<SessionSourceWithEntry[]> => {
      const { data, error } = await db('session_sources')
        .select('*, gm_source_images(*)')
        .eq('session_id', sessionId!)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true })
      if (error) throw error
      return data as SessionSourceWithEntry[]
    },
  })
}

function invalidateSession(queryClient: ReturnType<typeof useQueryClient>, sessionId: string) {
  queryClient.invalidateQueries({ queryKey: ['session-sources', sessionId] })
}

export function useAttachSource() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (args: { sessionId: string; campaignId: string; sourceId: string; sortOrder: number }) => {
      const { error } = await db('session_sources').insert({
        session_id: args.sessionId,
        campaign_id: args.campaignId,
        source_id: args.sourceId,
        sort_order: args.sortOrder,
      })
      if (error) throw error
    },
    onSuccess: (_r, v) => invalidateSession(queryClient, v.sessionId),
  })
}

export function useRemoveSessionSource() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id }: { id: string; sessionId: string }) => {
      const { error } = await db('session_sources').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: (_r, v) => invalidateSession(queryClient, v.sessionId),
  })
}

// Reordering renumbers the whole attached list to a clean 0..n-1 sequence in
// the given order. This replaces an earlier swap-two-values approach that
// silently no-op'd whenever two rows shared a sort_order (which happened as
// soon as a middle item was removed and another attached, or for legacy rows
// that all defaulted to 0) — that's why some arrows appeared dead. Renumbering
// the full list both performs the move and heals any duplicate values on the
// first press. Writes only the rows whose position actually changed.
export function useReorderSessionSources() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      rows,
      orderedIds,
    }: {
      sessionId: string
      // current rows (id + sort_order) so we can skip unchanged writes
      rows: Array<{ id: string; sort_order: number }>
      // the ids in their desired new order
      orderedIds: string[]
    }) => {
      const currentById = new Map(rows.map((r) => [r.id, r.sort_order]))
      await Promise.all(
        orderedIds.map(async (id, index) => {
          if (currentById.get(id) === index) return // already correctly numbered
          const { error } = await db('session_sources').update({ sort_order: index }).eq('id', id)
          if (error) throw error
        })
      )
    },
    onSuccess: (_r, v) => invalidateSession(queryClient, v.sessionId),
  })
}

// ---------------- source_attachments (generic entity attach) ----------------
// A second, independent attach mechanic (separate from session_sources above):
// pin a Source library image directly to a Location, Character, Quest,
// Faction, or Divinity via Source Type -> specific item. One polymorphic join
// table for all five entity tables rather than five near-identical ones.
// GM-only, no player-read policy, same bar as everything else in this feature.

export type AttachableEntityTable = 'locations' | 'characters' | 'quests' | 'factions' | 'divinities'

export const ATTACHABLE_ENTITY_TYPES: Array<{ table: AttachableEntityTable; label: string }> = [
  { table: 'locations', label: 'Location' },
  { table: 'characters', label: 'Character' },
  { table: 'quests', label: 'Quest' },
  { table: 'factions', label: 'Faction' },
  { table: 'divinities', label: 'Divinity' },
]

const ENTITY_TABLE_LABELS: Record<string, string> = Object.fromEntries(
  ATTACHABLE_ENTITY_TYPES.map((t) => [t.table, t.label])
)

export interface SourceAttachmentRow {
  id: string
  campaign_id: string
  source_id: string
  entity_table: AttachableEntityTable
  entity_id: string
  sort_order: number
  created_at: string
  updated_at: string
}

export interface SourceAttachmentWithLabel extends SourceAttachmentRow {
  entityName: string | null
  entityTypeLabel: string
}

// What is this image currently attached to? (chips on the Sources library card)
// entity_id is polymorphic so there's no FK to embed a join on - group the
// rows by entity_table and do one lookup query per table instead.
export function useSourceAttachments(sourceId: string | undefined) {
  return useQuery({
    queryKey: ['source-attachments', sourceId],
    enabled: Boolean(sourceId),
    queryFn: async (): Promise<SourceAttachmentWithLabel[]> => {
      const { data, error } = await db('source_attachments')
        .select('*')
        .eq('source_id', sourceId!)
        .order('created_at', { ascending: true })
      if (error) throw error
      const rows = data as SourceAttachmentRow[]

      const idsByTable = new Map<string, string[]>()
      for (const row of rows) {
        const ids = idsByTable.get(row.entity_table) ?? []
        ids.push(row.entity_id)
        idsByTable.set(row.entity_table, ids)
      }
      const nameByKey = new Map<string, string>()
      await Promise.all(
        Array.from(idsByTable.entries()).map(async ([table, ids]) => {
          const { data: entityRows, error: entityError } = await db(table).select('id, name').in('id', ids)
          if (entityError) throw entityError
          for (const r of entityRows as Array<{ id: string; name: string }>) {
            nameByKey.set(`${table}:${r.id}`, r.name)
          }
        })
      )

      return rows.map((row) => ({
        ...row,
        entityName: nameByKey.get(`${row.entity_table}:${row.entity_id}`) ?? null,
        entityTypeLabel: ENTITY_TABLE_LABELS[row.entity_table] ?? row.entity_table,
      }))
    },
  })
}

export interface SourceAttachmentWithImage extends SourceAttachmentRow {
  gm_source_images: SourceImage | null
}

// What images are attached to this specific entity? (the entity's own Sources tab)
export function useEntitySourceImages(
  campaignId: string | undefined,
  entityTable: AttachableEntityTable,
  entityId: string | undefined
) {
  return useQuery({
    queryKey: ['entity-source-images', campaignId, entityTable, entityId],
    enabled: Boolean(campaignId && entityId),
    queryFn: async (): Promise<SourceAttachmentWithImage[]> => {
      const { data, error } = await db('source_attachments')
        .select('*, gm_source_images(*)')
        .eq('campaign_id', campaignId!)
        .eq('entity_table', entityTable)
        .eq('entity_id', entityId!)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true })
      if (error) throw error
      return data as SourceAttachmentWithImage[]
    },
  })
}

function invalidateAttachments(
  queryClient: ReturnType<typeof useQueryClient>,
  args: { sourceId: string; campaignId: string; entityTable: string; entityId: string }
) {
  queryClient.invalidateQueries({ queryKey: ['source-attachments', args.sourceId] })
  queryClient.invalidateQueries({
    queryKey: ['entity-source-images', args.campaignId, args.entityTable, args.entityId],
  })
  // Attaching/detaching to a location changes what the Sources library hides
  // and what the campaign-wide Handouts feed excludes — refresh both.
  queryClient.invalidateQueries({ queryKey: ['location-attached-source-ids', args.campaignId] })
  queryClient.invalidateQueries({ queryKey: ['shared-source-images', args.campaignId] })
}

export function useAttachSourceToEntity() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (args: {
      campaignId: string
      sourceId: string
      entityTable: AttachableEntityTable
      entityId: string
      sortOrder?: number
    }) => {
      const { error } = await db('source_attachments').insert({
        campaign_id: args.campaignId,
        source_id: args.sourceId,
        entity_table: args.entityTable,
        entity_id: args.entityId,
        sort_order: args.sortOrder ?? 0,
      })
      if (error) throw error
    },
    onSuccess: (_r, v) => invalidateAttachments(queryClient, v),
  })
}

export function useDetachSourceFromEntity() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (args: {
      id: string
      sourceId: string
      campaignId: string
      entityTable: string
      entityId: string
    }) => {
      const { error } = await db('source_attachments').delete().eq('id', args.id)
      if (error) throw error
    },
    onSuccess: (_r, v) => invalidateAttachments(queryClient, v),
  })
}
