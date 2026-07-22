import { useEffect } from 'react'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { supabase } from '../../lib/supabaseClient'

// Same generic-table cast point as useEntity.ts's `db` helper - session_locations
// isn't in the generated Database type yet (see the comment in database.ts).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (table: string) => supabase.from(table as any) as any

export interface CurrentSessionRow {
  id: string
  name: string
  slug: string
  session_number: number | null
  session_date: string | null
  highlights: string[] | null
}

const currentSessionKey = (campaignId: string | undefined) => ['current-session', campaignId]

// The one session (if any) the GM has marked "in progress" for this campaign.
// Drives the Dashboard's Current Session section. Returns null when nothing
// is current - RLS lets this through even for an unpublished session (a live
// session may not have its recap written yet), same idea as the active clock.
export function useCurrentSession(campaignId: string | undefined) {
  return useQuery({
    queryKey: currentSessionKey(campaignId),
    enabled: Boolean(campaignId),
    queryFn: async (): Promise<CurrentSessionRow | null> => {
      const { data, error } = await db('sessions')
        .select('id, name, slug, session_number, session_date, highlights')
        .eq('campaign_id', campaignId!)
        .eq('is_current', true)
        .maybeSingle()
      if (error) throw error
      return (data as CurrentSessionRow | null) ?? null
    },
  })
}

// Campaign-scoped live sync: picks up the GM starting/clearing/switching the
// current session, wherever a player happens to be. Mirrors
// useActiveCountdownRealtime in useSessionExtras.ts.
export function useCurrentSessionRealtime(campaignId: string | undefined) {
  const queryClient = useQueryClient()
  useEffect(() => {
    if (!campaignId) return
    const channel = supabase
      .channel(`current-session-${campaignId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sessions', filter: `campaign_id=eq.${campaignId}` },
        () => queryClient.invalidateQueries({ queryKey: currentSessionKey(campaignId) }),
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [campaignId, queryClient])
}

// All sessions in the campaign, for the GM's "which session is current" picker.
export function useAllSessions(campaignId: string | undefined) {
  return useQuery({
    queryKey: ['all-sessions', campaignId],
    enabled: Boolean(campaignId),
    queryFn: async (): Promise<Array<{ id: string; name: string; session_number: number | null }>> => {
      const { data, error } = await db('sessions')
        .select('id, name, session_number')
        .eq('campaign_id', campaignId!)
        .order('session_number', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

export function useSetCurrentSession() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ campaignId, sessionId }: { campaignId: string; sessionId: string | null }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.rpc as any)('set_current_session', {
        p_campaign_id: campaignId,
        p_session_id: sessionId,
      })
      if (error) throw error
    },
    onSuccess: (_r, v) => {
      queryClient.invalidateQueries({ queryKey: currentSessionKey(v.campaignId) })
      queryClient.invalidateQueries({ queryKey: ['all-sessions', v.campaignId] })
    },
  })
}

export interface AttachedCharacter {
  sessionId: string
  characterId: string
  revealed: boolean
  name: string
  slug: string
  portraitUrl: string | null
  blurb: string | null
}

export interface AttachedLocation {
  id: string
  sessionId: string
  locationId: string
  revealed: boolean
  name: string
  slug: string
  heroImageUrl: string | null
  blurb: string | null
}

const sessionCharactersKey = (sessionId: string | undefined) => ['session-attached-characters', sessionId]
const sessionLocationsKey = (sessionId: string | undefined) => ['session-attached-locations', sessionId]

// Attached characters for one session. RLS shapes the result by viewer: the
// GM gets every attached row (revealed or not - that's what the control panel
// manages); a player only gets rows that are both revealed and on the
// campaign's current session. Either way, the same query works for both.
export function useSessionAttachedCharacters(sessionId: string | undefined) {
  return useQuery({
    queryKey: sessionCharactersKey(sessionId),
    enabled: Boolean(sessionId),
    queryFn: async (): Promise<AttachedCharacter[]> => {
      const { data, error } = await db('session_npcs')
        .select('session_id, character_id, revealed, characters(name, slug, portrait_url, personality)')
        .eq('session_id', sessionId!)
      if (error) throw error
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (data as any[]).map((r) => ({
        sessionId: r.session_id,
        characterId: r.character_id,
        revealed: r.revealed,
        name: r.characters?.name ?? '(deleted character)',
        slug: r.characters?.slug ?? '',
        portraitUrl: r.characters?.portrait_url ?? null,
        blurb: r.characters?.personality ?? null,
      }))
    },
  })
}

export function useSessionAttachedLocations(sessionId: string | undefined) {
  return useQuery({
    queryKey: sessionLocationsKey(sessionId),
    enabled: Boolean(sessionId),
    queryFn: async (): Promise<AttachedLocation[]> => {
      const { data, error } = await db('session_locations')
        .select('id, session_id, location_id, revealed, locations(name, slug, hero_image_url, short_blurb, content_html)')
        .eq('session_id', sessionId!)
      if (error) throw error
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (data as any[]).map((r) => ({
        id: r.id,
        sessionId: r.session_id,
        locationId: r.location_id,
        revealed: r.revealed,
        name: r.locations?.name ?? '(deleted location)',
        slug: r.locations?.slug ?? '',
        heroImageUrl: r.locations?.hero_image_url ?? null,
        blurb: r.locations?.short_blurb || r.locations?.content_html || null,
      }))
    },
  })
}

// Live sync for both attachment lists on one session - covers reveal/hide
// toggles and add/remove, filtered to this session so it's cheap everywhere
// it's mounted (both the player-facing section and the GM control panel).
export function useSessionAttachmentsRealtime(sessionId: string | undefined) {
  const queryClient = useQueryClient()
  useEffect(() => {
    if (!sessionId) return
    const channel = supabase
      .channel(`session-attachments-${sessionId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'session_npcs', filter: `session_id=eq.${sessionId}` },
        () => queryClient.invalidateQueries({ queryKey: sessionCharactersKey(sessionId) }),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'session_locations', filter: `session_id=eq.${sessionId}` },
        () => queryClient.invalidateQueries({ queryKey: sessionLocationsKey(sessionId) }),
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [sessionId, queryClient])
}

function invalidateAttachments(queryClient: ReturnType<typeof useQueryClient>, sessionId: string) {
  queryClient.invalidateQueries({ queryKey: sessionCharactersKey(sessionId) })
  queryClient.invalidateQueries({ queryKey: sessionLocationsKey(sessionId) })
}

export function useAttachCharacter() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ sessionId, characterId }: { sessionId: string; characterId: string }) => {
      const { error } = await db('session_npcs').insert({ session_id: sessionId, character_id: characterId })
      if (error) throw error
    },
    onSuccess: (_r, v) => invalidateAttachments(queryClient, v.sessionId),
  })
}

export function useSetCharacterRevealed() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      sessionId,
      characterId,
      revealed,
    }: {
      sessionId: string
      characterId: string
      revealed: boolean
    }) => {
      const { error } = await db('session_npcs')
        .update({ revealed })
        .eq('session_id', sessionId)
        .eq('character_id', characterId)
      if (error) throw error
    },
    onSuccess: (_r, v) => invalidateAttachments(queryClient, v.sessionId),
  })
}

export function useDetachCharacter() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ sessionId, characterId }: { sessionId: string; characterId: string }) => {
      const { error } = await db('session_npcs').delete().eq('session_id', sessionId).eq('character_id', characterId)
      if (error) throw error
    },
    onSuccess: (_r, v) => invalidateAttachments(queryClient, v.sessionId),
  })
}

export function useAttachLocation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ sessionId, locationId }: { sessionId: string; locationId: string }) => {
      const { error } = await db('session_locations').insert({ session_id: sessionId, location_id: locationId })
      if (error) throw error
    },
    onSuccess: (_r, v) => invalidateAttachments(queryClient, v.sessionId),
  })
}

export function useSetLocationRevealed() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, revealed }: { sessionId: string; id: string; revealed: boolean }) => {
      const { error } = await db('session_locations').update({ revealed }).eq('id', id)
      if (error) throw error
    },
    onSuccess: (_r, v) => invalidateAttachments(queryClient, v.sessionId),
  })
}

export function useDetachLocation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id }: { sessionId: string; id: string }) => {
      const { error } = await db('session_locations').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: (_r, v) => invalidateAttachments(queryClient, v.sessionId),
  })
}
