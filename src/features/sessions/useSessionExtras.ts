import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { supabase } from '../../lib/supabaseClient'
import type { EncounterCombatant, SessionEncounter, SessionRollTable, SessionRollTableEntry } from '../../types/database'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (table: string) => supabase.from(table as any) as any

export interface EncounterWithCombatants extends SessionEncounter {
  encounter_combatants: EncounterCombatant[]
}

export function useSessionEncounters(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['session-encounters', sessionId],
    enabled: Boolean(sessionId),
    queryFn: async (): Promise<EncounterWithCombatants[]> => {
      const { data, error } = await db('session_encounters')
        .select('*, encounter_combatants(*)')
        .eq('session_id', sessionId!)
        .order('created_at', { ascending: true })
      if (error) throw error
      return (data as EncounterWithCombatants[]).map((e) => ({
        ...e,
        encounter_combatants: [...e.encounter_combatants].sort((a, b) => a.sort_order - b.sort_order),
      }))
    },
  })
}

function invalidateEncounters(queryClient: ReturnType<typeof useQueryClient>, sessionId: string) {
  queryClient.invalidateQueries({ queryKey: ['session-encounters', sessionId] })
}

export function useCreateEncounter() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ sessionId, campaignId, name }: { sessionId: string; campaignId: string; name: string }) => {
      const { error } = await db('session_encounters').insert({ session_id: sessionId, campaign_id: campaignId, name })
      if (error) throw error
    },
    onSuccess: (_r, v) => invalidateEncounters(queryClient, v.sessionId),
  })
}

export function useDeleteEncounter() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id }: { id: string; sessionId: string }) => {
      const { error } = await db('session_encounters').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: (_r, v) => invalidateEncounters(queryClient, v.sessionId),
  })
}

export function useAddCombatant() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (args: {
      sessionId: string
      encounterId: string
      campaignId: string
      displayName: string
      characterId: string | null
      isAdversary: boolean
      maxHp: number | null
      maxStress: number | null
      sortOrder: number
    }) => {
      const { error } = await db('encounter_combatants').insert({
        encounter_id: args.encounterId,
        campaign_id: args.campaignId,
        display_name: args.displayName,
        character_id: args.characterId,
        is_adversary: args.isAdversary,
        max_hp: args.maxHp,
        current_hp: args.maxHp,
        max_stress: args.maxStress,
        current_stress: args.maxStress,
        sort_order: args.sortOrder,
      })
      if (error) throw error
    },
    onSuccess: (_r, v) => invalidateEncounters(queryClient, v.sessionId),
  })
}

export function useUpdateCombatantStat() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, field, value }: { id: string; sessionId: string; field: 'current_hp' | 'current_stress'; value: number }) => {
      const { error } = await db('encounter_combatants')
        .update({ [field]: value })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: (_r, v) => invalidateEncounters(queryClient, v.sessionId),
  })
}

export function useRemoveCombatant() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id }: { id: string; sessionId: string }) => {
      const { error } = await db('encounter_combatants').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: (_r, v) => invalidateEncounters(queryClient, v.sessionId),
  })
}

// ---------------- roll tables ----------------

export interface RollTableWithEntries extends SessionRollTable {
  session_roll_table_entries: SessionRollTableEntry[]
}

export function useSessionRollTables(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['session-roll-tables', sessionId],
    enabled: Boolean(sessionId),
    queryFn: async (): Promise<RollTableWithEntries[]> => {
      const { data, error } = await db('session_roll_tables')
        .select('*, session_roll_table_entries(*)')
        .eq('session_id', sessionId!)
        .order('created_at', { ascending: true })
      if (error) throw error
      return (data as RollTableWithEntries[]).map((t) => ({
        ...t,
        session_roll_table_entries: [...t.session_roll_table_entries].sort((a, b) => a.sort_order - b.sort_order),
      }))
    },
  })
}

function invalidateRollTables(queryClient: ReturnType<typeof useQueryClient>, sessionId: string) {
  queryClient.invalidateQueries({ queryKey: ['session-roll-tables', sessionId] })
}

export function useCreateRollTable() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      sessionId,
      campaignId,
      name,
      diceLabel,
    }: {
      sessionId: string
      campaignId: string
      name: string
      diceLabel: string
    }) => {
      const { error } = await db('session_roll_tables').insert({
        session_id: sessionId,
        campaign_id: campaignId,
        name,
        dice_label: diceLabel || null,
      })
      if (error) throw error
    },
    onSuccess: (_r, v) => invalidateRollTables(queryClient, v.sessionId),
  })
}

export function useDeleteRollTable() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id }: { id: string; sessionId: string }) => {
      const { error } = await db('session_roll_tables').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: (_r, v) => invalidateRollTables(queryClient, v.sessionId),
  })
}

export function useAddRollEntry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (args: {
      sessionId: string
      rollTableId: string
      campaignId: string
      rollLabel: string
      resultText: string
      sortOrder: number
    }) => {
      const { error } = await db('session_roll_table_entries').insert({
        roll_table_id: args.rollTableId,
        campaign_id: args.campaignId,
        roll_label: args.rollLabel,
        result_text: args.resultText,
        sort_order: args.sortOrder,
      })
      if (error) throw error
    },
    onSuccess: (_r, v) => invalidateRollTables(queryClient, v.sessionId),
  })
}

export function useRemoveRollEntry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id }: { id: string; sessionId: string }) => {
      const { error } = await db('session_roll_table_entries').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: (_r, v) => invalidateRollTables(queryClient, v.sessionId),
  })
}
