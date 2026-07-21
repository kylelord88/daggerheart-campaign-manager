import { useEffect } from 'react'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { supabase } from '../../lib/supabaseClient'
import type {
  EncounterCombatant,
  SessionCountdown,
  SessionEncounter,
  SessionRollTable,
  SessionRollTableEntry,
} from '../../types/database'

export type { SessionCountdown }

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

// Marks (or unmarks) a single entry as already-rolled, so it's excluded from
// future random picks without deleting it (e.g. a travel table where the
// same hazard shouldn't repeat within one journey).
export function useToggleRollEntryUsed() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, isUsed }: { id: string; isUsed: boolean; sessionId: string }) => {
      const { error } = await db('session_roll_table_entries').update({ is_used: isUsed }).eq('id', id)
      if (error) throw error
    },
    onSuccess: (_r, v) => invalidateRollTables(queryClient, v.sessionId),
  })
}

// Clears every entry's used flag for a table at once, so a GM can reuse the
// same table for the next session/trip without deleting and recreating it.
export function useResetRollTableUsed() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ rollTableId }: { rollTableId: string; sessionId: string }) => {
      const { error } = await db('session_roll_table_entries').update({ is_used: false }).eq('roll_table_id', rollTableId)
      if (error) throw error
    },
    onSuccess: (_r, v) => invalidateRollTables(queryClient, v.sessionId),
  })
}

// ---------------- clocks / countdowns ----------------

const countdownsKey = (sessionId: string | undefined) => ['session-countdowns', sessionId]

export function useSessionCountdowns(sessionId: string | undefined) {
  return useQuery({
    queryKey: countdownsKey(sessionId),
    enabled: Boolean(sessionId),
    queryFn: async (): Promise<SessionCountdown[]> => {
      const { data, error } = await db('session_countdowns')
        .select('*')
        .eq('session_id', sessionId!)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true })
      if (error) throw error
      return data as SessionCountdown[]
    },
  })
}

// Live sync: when the GM steps a clock, every open screen (players included)
// invalidates and refetches without a reload. postgres_changes respects RLS,
// so players only receive events for rows they can already select; the
// refetch itself goes through the normal RLS-checked REST query anyway.
export function useSessionCountdownsRealtime(sessionId: string | undefined) {
  const queryClient = useQueryClient()
  useEffect(() => {
    if (!sessionId) return
    const channel = supabase
      .channel(`session-countdowns-${sessionId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'session_countdowns', filter: `session_id=eq.${sessionId}` },
        () => queryClient.invalidateQueries({ queryKey: countdownsKey(sessionId) }),
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [sessionId, queryClient])
}

const activeCountdownKey = (campaignId: string | undefined) => ['active-countdown', campaignId]

// The one clock (if any) turned on campaign-wide. Drives the global floating
// widget shown on every page. Returns null when nothing is active.
export function useActiveCountdown(campaignId: string | undefined) {
  return useQuery({
    queryKey: activeCountdownKey(campaignId),
    enabled: Boolean(campaignId),
    queryFn: async (): Promise<SessionCountdown | null> => {
      const { data, error } = await db('session_countdowns')
        .select('*')
        .eq('campaign_id', campaignId!)
        .eq('is_active', true)
        .maybeSingle()
      if (error) throw error
      return (data as SessionCountdown | null) ?? null
    },
  })
}

// Campaign-scoped live sync for the floating widget: it renders outside any one
// session's page, so it subscribes on campaign_id (not session_id) and refetches
// the active clock on any change. Respects RLS like the session-scoped channel.
export function useActiveCountdownRealtime(campaignId: string | undefined) {
  const queryClient = useQueryClient()
  useEffect(() => {
    if (!campaignId) return
    const channel = supabase
      .channel(`active-countdown-${campaignId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'session_countdowns', filter: `campaign_id=eq.${campaignId}` },
        () => queryClient.invalidateQueries({ queryKey: activeCountdownKey(campaignId) }),
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [campaignId, queryClient])
}

function invalidateCountdowns(queryClient: ReturnType<typeof useQueryClient>, sessionId: string) {
  queryClient.invalidateQueries({ queryKey: countdownsKey(sessionId) })
  // Value/active changes can affect the global widget too.
  queryClient.invalidateQueries({ queryKey: ['active-countdown'] })
}

export function useCreateCountdown() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (args: {
      sessionId: string
      campaignId: string
      name: string
      startValue: number
      note: string | null
      sortOrder: number
    }) => {
      const { error } = await db('session_countdowns').insert({
        session_id: args.sessionId,
        campaign_id: args.campaignId,
        name: args.name,
        value: args.startValue,
        start_value: args.startValue,
        note: args.note,
        sort_order: args.sortOrder,
      })
      if (error) throw error
    },
    onSuccess: (_r, v) => invalidateCountdowns(queryClient, v.sessionId),
  })
}

export function useUpdateCountdown() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string
      sessionId: string
      patch: Partial<Pick<SessionCountdown, 'name' | 'value' | 'start_value' | 'note'>>
    }) => {
      const { error } = await db('session_countdowns').update(patch).eq('id', id)
      if (error) throw error
    },
    onSuccess: (_r, v) => invalidateCountdowns(queryClient, v.sessionId),
  })
}

export function useDeleteCountdown() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id }: { id: string; sessionId: string }) => {
      const { error } = await db('session_countdowns').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: (_r, v) => invalidateCountdowns(queryClient, v.sessionId),
  })
}

// Turn a clock on or off. Activation goes through the set_countdown_active RPC
// so "only one active per campaign" is enforced race-safely in one transaction
// (deactivate others + activate this one), not by the client.
export function useSetCountdownActive() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, active }: { id: string; sessionId: string; active: boolean }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.rpc as any)('set_countdown_active', { p_clock_id: id, p_active: active })
      if (error) throw error
    },
    onSuccess: (_r, v) => invalidateCountdowns(queryClient, v.sessionId),
  })
}
