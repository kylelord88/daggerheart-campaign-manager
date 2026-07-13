import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { supabase } from '../../lib/supabaseClient'
import type { EncounterCombatant, SessionEncounter, SessionRollTable, SessionRollTableEntry } from '../../types/database'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (table: string) => supabase.from(table as any) as any

export interface EncounterWithCombatants extends SessionEncounter {
  encounter_combatants: EncounterCombatant[]
}

export interface StatBlockFeature {
  id: string
  name: string
  type: 'Action' | 'Reaction' | 'Passive'
  cost?: string
  description: string
  dice?: string
}

// Stored in encounter_combatants.extra_trackers (jsonb, already existed unused).
export interface CombatantStatBlock {
  description?: string
  tier?: number
  role?: string
  difficulty?: number
  attackModifier?: string
  weaponName?: string
  weaponRange?: string
  weaponDice?: string
  weaponDamageType?: string
  experience?: string
  motivesTactics?: string
  majorThreshold?: number
  severeThreshold?: number
  summons?: string
  features?: StatBlockFeature[]
}

export function getStatBlock(combatant: EncounterCombatant): CombatantStatBlock {
  return (combatant.extra_trackers as CombatantStatBlock | null) ?? {}
}

export function hasStatBlock(block: CombatantStatBlock): boolean {
  return Object.keys(block).some((k) => {
    const v = block[k as keyof CombatantStatBlock]
    return Array.isArray(v) ? v.length > 0 : v !== undefined && v !== null && v !== ''
  })
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

// Adds one or more copies of the same combatant in one go (e.g. 3x Bog
// Assassin), each with its own HP/Stress tracking but an identical starting
// stat block. Names get an auto-numbered suffix ("Bog Assassin 1", "Bog
// Assassin 2"...) only when quantity > 1, so a single add keeps a clean
// unsuffixed name.
export function useAddCombatant() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (args: {
      sessionId: string
      encounterId: string
      campaignId: string
      baseName: string
      quantity?: number
      characterId: string | null
      isAdversary: boolean
      maxHp: number | null
      maxStress: number | null
      sortOrder: number
      statBlock?: CombatantStatBlock
    }) => {
      const quantity = Math.max(1, args.quantity ?? 1)
      const rows = Array.from({ length: quantity }, (_, i) => ({
        encounter_id: args.encounterId,
        campaign_id: args.campaignId,
        display_name: quantity > 1 ? `${args.baseName} ${i + 1}` : args.baseName,
        character_id: args.characterId,
        is_adversary: args.isAdversary,
        max_hp: args.maxHp,
        current_hp: args.maxHp,
        max_stress: args.maxStress,
        current_stress: args.maxStress,
        sort_order: args.sortOrder + i,
        extra_trackers: args.statBlock ?? null,
      }))
      const { error } = await db('encounter_combatants').insert(rows)
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

export function useUpdateCombatantStatBlock() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, statBlock }: { id: string; sessionId: string; statBlock: CombatantStatBlock }) => {
      const { error } = await db('encounter_combatants')
        .update({ extra_trackers: statBlock })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: (_r, v) => invalidateEncounters(queryClient, v.sessionId),
  })
}

// Multiple copies of the same adversary (e.g. "Bog Assassin 1/2/3") are
// displayed with one shared stat block, so editing it needs to write the
// same statBlock to every combatant in the group at once, not just one.
export function useUpdateGroupStatBlock() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ ids, statBlock }: { ids: string[]; sessionId: string; statBlock: CombatantStatBlock }) => {
      const { error } = await db('encounter_combatants')
        .update({ extra_trackers: statBlock })
        .in('id', ids)
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
