import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabaseClient'
import { htmlToExcerpt } from '../../lib/textExcerpt'

export type ActivityKind = 'location' | 'character' | 'quest' | 'faction' | 'divinity'

export interface ActivityItem {
  kind: ActivityKind
  kindLabel: string
  name: string
  slug: string
  path: string
  excerpt: string | null
  updatedAt: string
}

type ActivitySourceTable = 'locations' | 'characters' | 'quests' | 'factions' | 'divinities'

const ACTIVITY_SOURCES: Array<{
  table: ActivitySourceTable
  path: string
  kind: ActivityKind
  kindLabel: string
  excerptField: string | null
}> = [
  { table: 'locations', path: 'locations', kind: 'location', kindLabel: 'Location', excerptField: 'content_html' },
  { table: 'characters', path: 'characters', kind: 'character', kindLabel: 'Character', excerptField: 'personality' },
  { table: 'quests', path: 'quests', kind: 'quest', kindLabel: 'Quest', excerptField: 'hook' },
  { table: 'factions', path: 'factions', kind: 'faction', kindLabel: 'Faction', excerptField: 'content_html' },
  { table: 'divinities', path: 'divinities', kind: 'divinity', kindLabel: 'Divinity', excerptField: 'dogma' },
]

export function useDashboardStats(campaignId: string | undefined, publishedOnly = false) {
  return useQuery({
    queryKey: ['dashboard-stats', campaignId, publishedOnly],
    enabled: Boolean(campaignId),
    queryFn: async () => {
      let locationsQ = supabase.from('locations').select('id', { count: 'exact', head: true }).eq('campaign_id', campaignId!)
      let charactersQ = supabase.from('characters').select('id', { count: 'exact', head: true }).eq('campaign_id', campaignId!)
      let questsQ = supabase.from('quests').select('id', { count: 'exact', head: true }).eq('campaign_id', campaignId!)
      let factionsQ = supabase.from('factions').select('id', { count: 'exact', head: true }).eq('campaign_id', campaignId!)
      if (publishedOnly) {
        locationsQ = locationsQ.eq('is_published', true)
        charactersQ = charactersQ.eq('is_published', true)
        questsQ = questsQ.eq('is_published', true)
        factionsQ = factionsQ.eq('is_published', true)
      }
      const [locations, characters, quests, factions] = await Promise.all([locationsQ, charactersQ, questsQ, factionsQ])
      return {
        locations: locations.count ?? 0,
        characters: characters.count ?? 0,
        quests: quests.count ?? 0,
        factions: factions.count ?? 0,
      }
    },
  })
}

export function useRecentActivity(campaignId: string | undefined, limit = 6, publishedOnly = false) {
  return useQuery({
    queryKey: ['dashboard-activity', campaignId, limit, publishedOnly],
    enabled: Boolean(campaignId),
    queryFn: async (): Promise<ActivityItem[]> => {
      const results = await Promise.all(
        ACTIVITY_SOURCES.map(async (source) => {
          const selectCols = ['id', 'name', 'slug', 'updated_at', source.excerptField].filter(Boolean).join(',')
          let query = supabase
            .from(source.table)
            .select(selectCols)
            .eq('campaign_id', campaignId!)
          if (publishedOnly) query = query.eq('is_published', true)
          const { data, error } = await query.order('updated_at', { ascending: false }).limit(limit)
          if (error) throw error
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return ((data ?? []) as any[]).map((row) => ({
            kind: source.kind,
            kindLabel: source.kindLabel,
            name: row.name as string,
            slug: row.slug as string,
            path: source.path,
            excerpt:
              source.excerptField && row[source.excerptField] ? htmlToExcerpt(row[source.excerptField], 120) : null,
            updatedAt: row.updated_at as string,
          }))
        }),
      )
      return results
        .flat()
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, limit)
    },
  })
}

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
