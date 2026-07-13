import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { supabase } from '../../lib/supabaseClient'
import type { CombatantStatBlock } from '../sessions/useSessionExtras'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (table: string) => supabase.from(table as any) as any

export interface AdversaryLibraryEntry {
  id: string
  campaign_id: string
  name: string
  max_hp: number | null
  max_stress: number | null
  stat_block: CombatantStatBlock
  created_at: string
  updated_at: string
}

export function useAdversaryLibrary(campaignId: string | undefined) {
  return useQuery({
    queryKey: ['adversary-library', campaignId],
    enabled: Boolean(campaignId),
    queryFn: async (): Promise<AdversaryLibraryEntry[]> => {
      const { data, error } = await db('adversary_library')
        .select('*')
        .eq('campaign_id', campaignId!)
        .order('name', { ascending: true })
      if (error) throw error
      return data as AdversaryLibraryEntry[]
    },
  })
}

function invalidate(queryClient: ReturnType<typeof useQueryClient>, campaignId: string) {
  queryClient.invalidateQueries({ queryKey: ['adversary-library', campaignId] })
}

export function useSaveAdversary() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (args: {
      id: string | null
      campaignId: string
      name: string
      maxHp: number | null
      maxStress: number | null
      statBlock: CombatantStatBlock
    }) => {
      if (args.id) {
        const { error } = await db('adversary_library')
          .update({ name: args.name, max_hp: args.maxHp, max_stress: args.maxStress, stat_block: args.statBlock })
          .eq('id', args.id)
        if (error) throw error
      } else {
        const { error } = await db('adversary_library').insert({
          campaign_id: args.campaignId,
          name: args.name,
          max_hp: args.maxHp,
          max_stress: args.maxStress,
          stat_block: args.statBlock,
        })
        if (error) throw error
      }
    },
    onSuccess: (_r, v) => invalidate(queryClient, v.campaignId),
  })
}

export function useDeleteAdversary() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id }: { id: string; campaignId: string }) => {
      const { error } = await db('adversary_library').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: (_r, v) => invalidate(queryClient, v.campaignId),
  })
}
