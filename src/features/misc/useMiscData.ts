import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import type { MiscCategory, MiscEntry } from '../../types/database'

export function useMiscCategories(campaignId: string | undefined) {
  return useQuery({
    queryKey: ['misc-categories', campaignId],
    enabled: Boolean(campaignId),
    queryFn: async (): Promise<MiscCategory[]> => {
      const { data, error } = await supabase.from('misc_categories').select('*').eq('campaign_id', campaignId!).order('name')
      if (error) throw error
      return data
    },
  })
}

export function useMiscEntries(campaignId: string | undefined, categoryId: string | null) {
  return useQuery({
    queryKey: ['misc-entries', campaignId, categoryId],
    enabled: Boolean(campaignId),
    queryFn: async (): Promise<MiscEntry[]> => {
      let query = supabase.from('misc_entries').select('*').eq('campaign_id', campaignId!).order('name')
      if (categoryId) query = query.eq('category_id', categoryId)
      const { data, error } = await query
      if (error) throw error
      return data
    },
  })
}

export function useMiscEntry(campaignId: string | undefined, slug: string | undefined) {
  return useQuery({
    queryKey: ['misc-entry', campaignId, slug],
    enabled: Boolean(campaignId && slug && slug !== 'new'),
    queryFn: async (): Promise<MiscEntry> => {
      const { data, error } = await supabase
        .from('misc_entries')
        .select('*')
        .eq('campaign_id', campaignId!)
        .eq('slug', slug!)
        .single()
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

export function useCreateMiscCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ campaignId, name, icon }: { campaignId: string; name: string; icon?: string }) => {
      const { data, error } = await supabase
        .from('misc_categories')
        .insert({ campaign_id: campaignId, name, slug: slugify(name), icon: icon ?? null })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['misc-categories', variables.campaignId] })
    },
  })
}

export function useSaveMiscEntry() {
  const queryClient = useQueryClient()
  const { session } = useAuth()

  return useMutation({
    mutationFn: async ({
      campaignId,
      id,
      values,
    }: {
      campaignId: string
      id: string | null
      values: Partial<MiscEntry>
    }) => {
      const payload: Record<string, unknown> = { ...values, campaign_id: campaignId }
      let resultId = id
      let resultSlug: string | undefined
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const table = supabase.from('misc_entries') as any

      if (id) {
        const { error } = await table.update(payload).eq('id', id)
        if (error) throw error
      } else {
        resultSlug = slugify(String(values.name ?? ''))
        payload.slug = resultSlug
        payload.created_by = session?.user.id
        const { data, error } = await table.insert(payload).select('id').single()
        if (error) throw error
        resultId = data.id
      }

      return { id: resultId as string, slug: resultSlug }
    },
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['misc-entries', variables.campaignId] })
      queryClient.invalidateQueries({ queryKey: ['misc-entry'] })
    },
  })
}

export function useDeleteMiscEntry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id }: { id: string; campaignId: string }) => {
      const { error } = await supabase.from('misc_entries').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: (_void, variables) => {
      queryClient.invalidateQueries({ queryKey: ['misc-entries', variables.campaignId] })
    },
  })
}

// For "Contributed by X" - reuses the same roster RPC as Members/Dashboard.
export function useMemberLookup(campaignId: string | undefined) {
  return useQuery({
    queryKey: ['member-lookup', campaignId],
    enabled: Boolean(campaignId),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_campaign_members', { p_campaign_id: campaignId! })
      if (error) throw error
      return data
    },
  })
}
