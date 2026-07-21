import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { supabase } from '../../lib/supabaseClient'
import type { EntityConfig, ReferenceConfig } from './types'

// This layer is intentionally generic (dynamic table names via `any`) so one
// set of components drives locations/factions/divinities/characters/quests.
// It trades static row typing for not hand-duplicating five near-identical
// CRUD page sets; each config in entityConfigs.ts is the source of truth for
// what fields exist on a given table.
type Row = Record<string, unknown>

// One cast point for the "table name is a runtime string" reality of this
// generic layer, instead of scattering `as any` through every query below.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (table: string) => supabase.from(table as any) as any

// Narrow SECURITY DEFINER RPC (only ever touches demiplane_url, only on a
// character.player_user_id = auth.uid() row) so a player can self-link their
// character sheet without general self-UPDATE rights on characters, which
// also holds fields like faction_id/vitality that shouldn't be player-editable.
export function useSetMyCharacterDemiplaneUrl() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ characterId, url }: { characterId: string; url: string }) => {
      const { error } = await supabase.rpc('set_my_character_demiplane_url', {
        p_character_id: characterId,
        p_url: url,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entity-record', 'characters'] })
      queryClient.invalidateQueries({ queryKey: ['entity-list', 'characters'] })
    },
  })
}

export function useEntityList(config: EntityConfig, campaignId: string | undefined) {
  return useQuery({
    queryKey: ['entity-list', config.table, campaignId],
    enabled: Boolean(campaignId),
    queryFn: async (): Promise<Row[]> => {
      const { key, ascending } = config.listOrderBy ?? { key: 'name', ascending: true }
      const { data, error } = await db(config.table)
        .select('*')
        .eq('campaign_id', campaignId!)
        .order(key, { ascending })
      if (error) throw error
      return data as Row[]
    },
  })
}

export function useEntityRecord(config: EntityConfig, campaignId: string | undefined, slug: string | undefined) {
  return useQuery({
    queryKey: ['entity-record', config.table, campaignId, slug],
    enabled: Boolean(campaignId && slug && slug !== 'new'),
    queryFn: async (): Promise<{ row: Row; gmRow: Row | null }> => {
      const { data: row, error } = await db(config.table)
        .select('*')
        .eq('campaign_id', campaignId!)
        .eq('slug', slug!)
        .single()
      if (error) throw error

      let gmRow: Row | null = null
      if (config.gmTable && config.gmFk) {
        const { data } = await db(config.gmTable)
          .select('*')
          .eq(config.gmFk, (row as Row).id as string)
          .maybeSingle()
        gmRow = (data as Row | null) ?? null
      }

      return { row: row as Row, gmRow }
    },
  })
}

export function useReferenceOptions(reference: ReferenceConfig | undefined, campaignId: string | undefined) {
  return useQuery({
    queryKey: ['reference-options', reference?.table, campaignId, reference?.extraEq],
    enabled: Boolean(reference && campaignId),
    queryFn: async (): Promise<Array<{ id: string; label: string }>> => {
      let query = db(reference!.table).select('*').eq('campaign_id', campaignId!)
      if (reference!.extraEq) {
        for (const [key, value] of Object.entries(reference!.extraEq)) {
          query = query.eq(key, value)
        }
      }
      const { data, error } = await query
      if (error) throw error
      return (data as Row[]).map((r) => ({
        id: r.id as string,
        label: (r[reference!.labelField] as string) ?? '(unnamed)',
      }))
    },
  })
}

// campaign_members has no email column (auth.users isn't queryable from the
// client) - get_campaign_members is a security-definer RPC that joins it in,
// used here to let a "player" field show/select by their display name
// (falling back to email for anyone who hasn't set one yet).
export function usePlayerOptions(campaignId: string | undefined) {
  return useQuery({
    queryKey: ['player-options', campaignId],
    enabled: Boolean(campaignId),
    queryFn: async (): Promise<Array<{ id: string; label: string }>> => {
      const { data, error } = await supabase.rpc('get_campaign_members', { p_campaign_id: campaignId! })
      if (error) throw error
      return data.filter((m) => m.role === 'player').map((m) => ({ id: m.user_id, label: m.display_name || m.email }))
    },
  })
}

// Raw campaign_members rows (both display_name AND email available), unlike
// usePlayerOptions' combined "display_name || email" label - needed to
// resolve a character's "Played By" display label against the
// played_by_override precedence in resolvePlayedBy() (src/lib/playedBy.ts).
export function useCampaignMembersRaw(campaignId: string | undefined) {
  return useQuery({
    queryKey: ['campaign-members-raw', campaignId],
    enabled: Boolean(campaignId),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_campaign_members', { p_campaign_id: campaignId! })
      if (error) throw error
      return data
    },
  })
}

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

interface SaveArgs {
  config: EntityConfig
  campaignId: string
  id: string | null // null = create
  values: Row
  gmValues: Row | null
}

export function useSaveEntity() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ config, campaignId, id, values, gmValues }: SaveArgs) => {
      const payload: Row = { ...values, campaign_id: campaignId }
      if (typeof payload.name === 'string' && !id) {
        payload.slug = slugify(payload.name)
      }

      let savedId = id
      if (id) {
        const { error } = await db(config.table).update(payload).eq('id', id)
        if (error) throw error
      } else {
        const { data, error } = await db(config.table).insert(payload).select('id').single()
        if (error) throw error
        savedId = (data as Row).id as string
      }

      if (config.gmTable && config.gmFk && gmValues) {
        const gmPayload: Row = { ...gmValues, [config.gmFk]: savedId }
        const { error } = await db(config.gmTable).upsert(gmPayload, { onConflict: config.gmFk })
        if (error) throw error
      }

      return savedId as string
    },
    onSuccess: (_id, variables) => {
      queryClient.invalidateQueries({ queryKey: ['entity-list', variables.config.table] })
      queryClient.invalidateQueries({ queryKey: ['entity-record', variables.config.table] })
    },
  })
}

export function useDeleteEntity() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ config, id }: { config: EntityConfig; id: string }) => {
      const { error } = await db(config.table).delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: (_void, variables) => {
      queryClient.invalidateQueries({ queryKey: ['entity-list', variables.config.table] })
    },
  })
}
