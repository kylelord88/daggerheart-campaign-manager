import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabaseClient'
import { htmlToExcerpt } from '../../lib/textExcerpt'

// Global "search the whole campaign" fan-out — same shape as the Dashboard's
// useRecentActivity (src/features/dashboard/useDashboardData.ts): one small
// query per content table, run in parallel, merged client-side. No Postgres
// full-text search infra; this campaign's content volume doesn't need it.
//
// SECURITY: locations/factions/divinities/characters/quests use the "soft
// publish" RLS pattern (see supabase/migrations/20260711114425_rls_policies.sql
// and 20260712044014_entity_publish_toggle.sql) — a campaign member may be
// able to SELECT rows regardless of is_published depending on which policy
// version is actually live, so `gatedByPublish` sources always get an
// explicit `.eq('is_published', true)` filter here whenever the caller isn't
// GM. Sessions get the same explicit filter too, even though their RLS policy
// already enforces it, for defense-in-depth/consistency. misc_entries has no
// is_published column/concept at all (checked the migration — "members can
// read" is unconditional), so it's never gated.
//
// Every query selects explicit columns only — never `select('*')` — so we
// never risk pulling a column over the wire nobody intended to expose.

export type SearchResultKind = 'location' | 'faction' | 'divinity' | 'character' | 'quest' | 'session' | 'misc'

export interface SearchResult {
  id: string
  kind: SearchResultKind
  kindLabel: string
  name: string
  /** Path relative to the campaign root (e.g. "locations/some-slug"). */
  path: string
  excerpt: string | null
}

type SearchSourceTable = 'locations' | 'factions' | 'divinities' | 'characters' | 'quests' | 'sessions' | 'misc_entries'

interface SearchSource {
  table: SearchSourceTable
  path: string
  kind: SearchResultKind
  kindLabel: string
  excerptField: string | null
  gatedByPublish: boolean
}

// Order here also drives the group order in the search dropdown.
const SEARCH_SOURCES: SearchSource[] = [
  { table: 'locations', path: 'locations', kind: 'location', kindLabel: 'Location', excerptField: 'content_html', gatedByPublish: true },
  { table: 'factions', path: 'factions', kind: 'faction', kindLabel: 'Faction', excerptField: 'content_html', gatedByPublish: true },
  { table: 'divinities', path: 'divinities', kind: 'divinity', kindLabel: 'Divinity', excerptField: 'dogma', gatedByPublish: true },
  { table: 'characters', path: 'characters', kind: 'character', kindLabel: 'Character', excerptField: 'personality', gatedByPublish: true },
  { table: 'quests', path: 'quests', kind: 'quest', kindLabel: 'Quest', excerptField: 'hook', gatedByPublish: true },
  { table: 'sessions', path: 'sessions', kind: 'session', kindLabel: 'Session', excerptField: 'summary_html', gatedByPublish: true },
  { table: 'misc_entries', path: 'misc', kind: 'misc', kindLabel: 'Misc', excerptField: 'summary', gatedByPublish: false },
]

const RESULTS_PER_TYPE = 6

// Escape ILIKE's special characters so a literal "%" or "_" typed by a user
// doesn't act as a wildcard, and a literal "\" doesn't start an escape.
function escapeLikeTerm(input: string): string {
  return input.replace(/[\\%_]/g, (ch) => `\\${ch}`)
}

async function searchSource(
  source: SearchSource,
  campaignId: string,
  term: string,
  isGm: boolean,
): Promise<SearchResult[]> {
  const cols = ['id', 'name', 'slug', source.excerptField].filter(Boolean).join(',')
  const pattern = `%${escapeLikeTerm(term)}%`

  const buildQuery = (column: string) => {
    // Cast to `any`: source.table is a dynamic union across seven differently
    // shaped tables, and TS can't carry a per-table column type through that
    // (same reason useMiscData.ts casts `supabase.from('misc_entries')` for
    // its dynamic-payload mutations). The tables/columns here are still a
    // fixed, reviewed list in SEARCH_SOURCES above, not user input.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase.from(source.table) as any).select(cols).eq('campaign_id', campaignId).ilike(column, pattern)
    if (!isGm && source.gatedByPublish) query = query.eq('is_published', true)
    return query.order('name', { ascending: true }).limit(RESULTS_PER_TYPE)
  }

  // Match on name and (if this source has one) its excerpt field, as two
  // separate queries merged client-side — simpler and safer than building a
  // PostgREST `.or()` filter string, which needs its own escaping rules for
  // commas/parens and is easy to get subtly wrong.
  const queries = [buildQuery('name')]
  if (source.excerptField) queries.push(buildQuery(source.excerptField))

  const responses = await Promise.all(queries)
  for (const response of responses) {
    if (response.error) throw response.error
  }

  const seen = new Set<string>()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows: any[] = []
  for (const response of responses) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const row of (response.data ?? []) as any[]) {
      if (!seen.has(row.id)) {
        seen.add(row.id)
        rows.push(row)
      }
    }
  }

  return rows.slice(0, RESULTS_PER_TYPE).map((row) => ({
    id: row.id as string,
    kind: source.kind,
    kindLabel: source.kindLabel,
    name: row.name as string,
    path: `${source.path}/${row.slug}`,
    excerpt: source.excerptField && row[source.excerptField] ? htmlToExcerpt(row[source.excerptField], 100) : null,
  }))
}

export function useGlobalSearch(campaignId: string | undefined, term: string, isGm: boolean) {
  const trimmed = term.trim()
  return useQuery({
    queryKey: ['global-search', campaignId, trimmed, isGm],
    enabled: Boolean(campaignId) && trimmed.length >= 2,
    queryFn: async (): Promise<SearchResult[]> => {
      const results = await Promise.all(
        SEARCH_SOURCES.map((source) => searchSource(source, campaignId!, trimmed, isGm)),
      )
      return results.flat()
    },
    staleTime: 15_000,
  })
}
