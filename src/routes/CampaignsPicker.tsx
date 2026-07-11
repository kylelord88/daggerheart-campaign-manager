import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'

export function CampaignsPicker() {
  const { session } = useAuth()

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ['my-campaigns', session?.user.id],
    enabled: Boolean(session),
    queryFn: async () => {
      // Our hand-maintained Database type has no Relationships metadata, so
      // postgrest-js can't type-check this embedded select — cast and narrow
      // manually below. (Real `supabase gen types` output resolves this.)
      const { data, error } = await (supabase.from('campaign_members') as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .select('role, campaigns(*)')
        .eq('user_id', session!.user.id)
      if (error) throw error
      return data as Array<{ role: string; campaigns: { slug: string; name: string; description: string | null } }>
    },
  })

  const handleSignOut = () => supabase.auth.signOut()

  if (isLoading) return <div className="page-loading">Loading…</div>

  return (
    <div className="campaigns-picker">
      <div className="campaigns-picker-header">
        <h1>Your Campaigns</h1>
        <button onClick={handleSignOut}>Sign out</button>
      </div>

      {!campaigns?.length && <p className="empty-state">You're not a member of any campaigns yet.</p>}

      <ul className="entity-grid">
        {campaigns?.map((m) => {
          const campaign = m.campaigns
          return (
            <li key={campaign.slug}>
              <Link to={`/c/${campaign.slug}`} className="entity-card">
                <h3>{campaign.name}</h3>
                <p>{m.role === 'gm' ? 'Game Master' : 'Player'}</p>
                {campaign.description && <p>{campaign.description}</p>}
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
