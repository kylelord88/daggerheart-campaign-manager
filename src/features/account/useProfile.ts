import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import type { Profile } from '../../types/database'

// No row yet = a user who existed before profiles was added, or a brand new
// signup who hasn't finished onboarding. Both are treated as "not onboarded"
// by the caller unless a row explicitly says onboarded: true.
export function useMyProfile() {
  const { session } = useAuth()
  const userId = session?.user.id

  return useQuery({
    queryKey: ['my-profile', userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<Profile | null> => {
      const { data, error } = await supabase.from('profiles').select('*').eq('user_id', userId!).maybeSingle()
      if (error) throw error
      return data
    },
  })
}

export function useSetDisplayName() {
  const queryClient = useQueryClient()
  const { session } = useAuth()
  return useMutation({
    mutationFn: async (displayName: string) => {
      const { error } = await supabase.rpc('set_my_display_name', { p_display_name: displayName })
      if (error) throw error
    },
    onSuccess: () => {
      // display_name lives on campaign_members rows, read via get_campaign_members
      queryClient.invalidateQueries({ queryKey: ['player-options'] })
      queryClient.invalidateQueries({ queryKey: ['member-lookup'] })
      queryClient.invalidateQueries({ queryKey: ['campaign-members'] })
      queryClient.invalidateQueries({ queryKey: ['my-profile', session?.user.id] })
    },
  })
}

export function useCompleteOnboarding() {
  const queryClient = useQueryClient()
  const { session } = useAuth()
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('profiles').upsert({ user_id: session!.user.id, onboarded: true })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-profile', session?.user.id] })
    },
  })
}
