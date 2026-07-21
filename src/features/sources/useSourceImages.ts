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
  image_path: string
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
    mutationFn: async (args: { campaignId: string; name: string; description: string | null; file: File }) => {
      const path = await uploadSourceFile(args.campaignId, args.file)
      const { error } = await db('gm_source_images').insert({
        campaign_id: args.campaignId,
        name: args.name,
        description: args.description,
        image_path: path,
      })
      if (error) throw error
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
      previousPath: string
    }) => {
      if (args.file) {
        const path = await uploadSourceFile(args.campaignId, args.file)
        const { error } = await db('gm_source_images')
          .update({ name: args.name, description: args.description, image_path: path })
          .eq('id', args.id)
        if (error) throw error
        // Best-effort cleanup of the replaced image; not fatal if it fails.
        await supabase.storage.from(SOURCES_BUCKET).remove([args.previousPath])
      } else {
        const { error } = await db('gm_source_images')
          .update({ name: args.name, description: args.description })
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
    mutationFn: async ({ id, imagePath }: { id: string; campaignId: string; imagePath: string }) => {
      const { error } = await db('gm_source_images').delete().eq('id', id)
      if (error) throw error
      // Best-effort: the row is gone either way, so a storage cleanup failure
      // shouldn't surface as a delete failure to the GM.
      await supabase.storage.from(SOURCES_BUCKET).remove([imagePath])
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

// Reordering swaps the sort_order of two adjacent attached sources.
export function useSwapSessionSourceOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      a,
      b,
    }: {
      sessionId: string
      a: { id: string; sort_order: number }
      b: { id: string; sort_order: number }
    }) => {
      const { error: e1 } = await db('session_sources').update({ sort_order: b.sort_order }).eq('id', a.id)
      if (e1) throw e1
      const { error: e2 } = await db('session_sources').update({ sort_order: a.sort_order }).eq('id', b.id)
      if (e2) throw e2
    },
    onSuccess: (_r, v) => invalidateSession(queryClient, v.sessionId),
  })
}
