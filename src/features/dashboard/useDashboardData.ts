import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabaseClient'
import { resolvePlayedBy } from '../../lib/playedBy'

// NOTE: the stat-strip (useDashboardStats) and "Recently Updated" feed
// (useRecentActivity) that used to live here were removed when the Dashboard
// was rebuilt around the Current Session feature (see
// src/features/dashboard/useCurrentSession.ts, CurrentSessionSection.tsx,
// SessionControlPanel.tsx) - GlobalSearchBox's fan-out query is a similar
// shape if you're looking for a reference.

export function useActiveQuests(campaignId: string | undefined, publishedOnly = false) {
  return useQuery({
    queryKey: ['dashboard-active-quests', campaignId, publishedOnly],
    enabled: Boolean(campaignId),
    queryFn: async () => {
      let query = supabase
        .from('quests')
        .select('id, name, slug, quest_type')
        .eq('campaign_id', campaignId!)
        .eq('status', 'active')
      if (publishedOnly) query = query.eq('is_published', true)
      const { data, error } = await query.order('updated_at', { ascending: false }).limit(5)
      if (error) throw error
      return data
    },
  })
}

export interface PartyMember {
  id: string
  name: string
  slug: string
  portraitUrl: string | null
  playedBy: string | null
}

// PCs for the Dashboard's Party section, with a resolved "Played By" label
// (campaign_members.display_name -> characters.played_by_override -> the
// linked player's email when isGm is true -> null). See resolvePlayedBy in
// src/lib/playedBy.ts for the precedence itself; isGm must be the *real*
// viewer's GM status (not just "not previewing as player") since a genuine
// player must never see another member's email as a fallback.
export function useParty(campaignId: string | undefined, publishedOnly: boolean, isGm: boolean) {
  return useQuery({
    queryKey: ['dashboard-party', campaignId, publishedOnly, isGm],
    enabled: Boolean(campaignId),
    queryFn: async (): Promise<PartyMember[]> => {
      let query = supabase
        .from('characters')
        .select('id, name, slug, portrait_url, player_user_id, played_by_override')
        .eq('campaign_id', campaignId!)
        .eq('kind', 'pc')
      if (publishedOnly) query = query.eq('is_published', true)
      const { data, error } = await query.order('name', { ascending: true })
      if (error) throw error

      const { data: members, error: membersError } = await supabase.rpc('get_campaign_members', {
        p_campaign_id: campaignId!,
      })
      if (membersError) throw membersError

      return (data ?? []).map((c) => {
        const member = c.player_user_id ? members?.find((m) => m.user_id === c.player_user_id) : undefined
        return {
          id: c.id,
          name: c.name,
          slug: c.slug,
          portraitUrl: c.portrait_url,
          playedBy: resolvePlayedBy({
            displayName: member?.display_name,
            override: c.played_by_override,
            email: member?.email,
            isGm,
          }),
        }
      })
    },
  })
}

export function useCampaignSummary(campaignId: string | undefined) {
  return useQuery({
    queryKey: ['dashboard-campaign-summary', campaignId],
    enabled: Boolean(campaignId),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_campaign_members', { p_campaign_id: campaignId! })
      if (error) throw error
      const gm = data?.find((m) => m.role === 'gm')
      return {
        gmLabel: gm?.display_name || gm?.email || '—',
      }
    },
  })
}
