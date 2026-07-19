import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { supabase } from '../../lib/supabaseClient'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (table: string) => supabase.from(table as any) as any

// Environment "type" (the four kinds a Daggerheart environment can be).
export const ENV_TYPES = ['Exploration', 'Social', 'Traversal', 'Event'] as const
export type EnvType = (typeof ENV_TYPES)[number]

// Structural label for a feature. A Fear feature is still an Action or Reaction
// structurally, so "fear" is NOT a kind — it's the separate `fear` flag below.
export type EnvFeatureKind = 'passive' | 'action' | 'reaction'

// A single environment feature. This is the EXACT shape stored in
// stat_block.features (no id) — kept in lockstep with the data import and the
// migration comment. `fear` is true when the feature costs Fear to use (shown
// as a distinct badge alongside the kind tag). `question` may be empty. The
// editor adds an ephemeral key locally and strips it before saving so the
// stored jsonb matches this shape precisely.
export interface EnvironmentFeature {
  name: string
  kind: EnvFeatureKind
  text: string
  question: string
  fear: boolean
}

// stat_block jsonb shape (agreed with the import):
//   { description, impulses[], potential_adversaries[], features[] }
export interface EnvironmentStatBlock {
  description: string
  impulses: string[]
  potential_adversaries: string[]
  features: EnvironmentFeature[]
}

export function emptyStatBlock(): EnvironmentStatBlock {
  return { description: '', impulses: [], potential_adversaries: [], features: [] }
}

// Declared locally so the app typechecks before the migration + type regen
// lands (mirrors AdversaryLibraryEntry).
export interface EnvironmentLibraryEntry {
  id: string
  campaign_id: string
  name: string
  tier: number
  env_type: string
  difficulty: number | null
  difficulty_note: string | null
  stat_block: EnvironmentStatBlock
  is_homebrew: boolean
  created_at: string
  updated_at: string
}

export function useEnvironmentLibrary(campaignId: string | undefined) {
  return useQuery({
    queryKey: ['environment-library', campaignId],
    enabled: Boolean(campaignId),
    queryFn: async (): Promise<EnvironmentLibraryEntry[]> => {
      const { data, error } = await db('environment_library')
        .select('*')
        .eq('campaign_id', campaignId!)
        .order('tier', { ascending: true })
        .order('name', { ascending: true })
      if (error) throw error
      return data as EnvironmentLibraryEntry[]
    },
  })
}

function invalidate(queryClient: ReturnType<typeof useQueryClient>, campaignId: string) {
  queryClient.invalidateQueries({ queryKey: ['environment-library', campaignId] })
}

export function useSaveEnvironment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (args: {
      id: string | null
      campaignId: string
      name: string
      tier: number
      envType: string
      difficulty: number | null
      difficultyNote: string | null
      statBlock: EnvironmentStatBlock
      isHomebrew?: boolean
    }) => {
      if (args.id) {
        const { error } = await db('environment_library')
          .update({
            name: args.name,
            tier: args.tier,
            env_type: args.envType,
            difficulty: args.difficulty,
            difficulty_note: args.difficultyNote,
            stat_block: args.statBlock,
          })
          .eq('id', args.id)
        if (error) throw error
      } else {
        const { error } = await db('environment_library').insert({
          campaign_id: args.campaignId,
          name: args.name,
          tier: args.tier,
          env_type: args.envType,
          difficulty: args.difficulty,
          difficulty_note: args.difficultyNote,
          stat_block: args.statBlock,
          is_homebrew: args.isHomebrew ?? false,
        })
        if (error) throw error
      }
    },
    onSuccess: (_r, v) => invalidate(queryClient, v.campaignId),
  })
}

export function useDeleteEnvironment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id }: { id: string; campaignId: string }) => {
      const { error } = await db('environment_library').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: (_r, v) => invalidate(queryClient, v.campaignId),
  })
}

// ---------------- session_environments (reference join) ----------------

export interface SessionEnvironmentRow {
  id: string
  session_id: string
  campaign_id: string
  environment_id: string | null
  sort_order: number
  note: string | null
  created_at: string
  updated_at: string
}

export interface SessionEnvironmentWithEntry extends SessionEnvironmentRow {
  environment_library: EnvironmentLibraryEntry | null
}

export function useSessionEnvironments(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['session-environments', sessionId],
    enabled: Boolean(sessionId),
    queryFn: async (): Promise<SessionEnvironmentWithEntry[]> => {
      const { data, error } = await db('session_environments')
        .select('*, environment_library(*)')
        .eq('session_id', sessionId!)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true })
      if (error) throw error
      return data as SessionEnvironmentWithEntry[]
    },
  })
}

function invalidateSession(queryClient: ReturnType<typeof useQueryClient>, sessionId: string) {
  queryClient.invalidateQueries({ queryKey: ['session-environments', sessionId] })
}

export function useAttachEnvironment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (args: { sessionId: string; campaignId: string; environmentId: string; sortOrder: number }) => {
      const { error } = await db('session_environments').insert({
        session_id: args.sessionId,
        campaign_id: args.campaignId,
        environment_id: args.environmentId,
        sort_order: args.sortOrder,
      })
      if (error) throw error
    },
    onSuccess: (_r, v) => invalidateSession(queryClient, v.sessionId),
  })
}

export function useRemoveSessionEnvironment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id }: { id: string; sessionId: string }) => {
      const { error } = await db('session_environments').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: (_r, v) => invalidateSession(queryClient, v.sessionId),
  })
}

// Reordering swaps the sort_order of two adjacent attached environments.
export function useSwapSessionEnvironmentOrder() {
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
      const { error: e1 } = await db('session_environments').update({ sort_order: b.sort_order }).eq('id', a.id)
      if (e1) throw e1
      const { error: e2 } = await db('session_environments').update({ sort_order: a.sort_order }).eq('id', b.id)
      if (e2) throw e2
    },
    onSuccess: (_r, v) => invalidateSession(queryClient, v.sessionId),
  })
}
