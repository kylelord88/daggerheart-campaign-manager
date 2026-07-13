import { NavLink, Outlet, Link, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CampaignProvider, useCampaign } from '../context/CampaignContext'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'

function CampaignShell() {
  const { campaign, isGm, isLoading } = useCampaign()
  const { session } = useAuth()
  const location = useLocation()

  // Only worth showing "Switch" if there's actually somewhere else to go.
  const { data: campaignCount } = useQuery({
    queryKey: ['my-campaign-count', session?.user.id],
    enabled: Boolean(session),
    queryFn: async () => {
      const { count, error } = await supabase
        .from('campaign_members')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', session!.user.id)
      if (error) throw error
      return count ?? 0
    },
  })
  // The map wants the full viewport, not the standard prose-width content
  // column every other page uses.
  const isFullBleed = location.pathname.endsWith('/map')

  if (isLoading) return <div className="page-loading">Loading…</div>
  if (!campaign) return <p className="empty-state">Campaign not found, or you don't have access to it.</p>

  return (
    <div className="campaign-shell">
      <nav className="campaign-nav">
        <Link to="" className="campaign-nav-title">
          {campaign.name}
        </Link>
        <div className="campaign-nav-links">
          <NavLink to="" end>
            Dashboard
          </NavLink>
          <NavLink to="map">Map</NavLink>
          <NavLink to="locations">Locations</NavLink>
          <NavLink to="factions">Factions</NavLink>
          <NavLink to="divinities">Divinities</NavLink>
          <NavLink to="characters">Characters</NavLink>
          <NavLink to="quests">Quests</NavLink>
          <NavLink to="sessions">Sessions</NavLink>
          <NavLink to="misc">Community</NavLink>
          <NavLink to="notes">My Notes</NavLink>
          {isGm && <NavLink to="members">Members</NavLink>}
          <NavLink to="account" className="campaign-nav-switch">
            Settings
          </NavLink>
          {(campaignCount ?? 0) > 1 && (
            <Link to="/campaigns" className="campaign-nav-switch">
              Switch
            </Link>
          )}
        </div>
      </nav>
      <main className={`campaign-content${isFullBleed ? ' full-bleed' : ''}`}>
        <Outlet />
      </main>
    </div>
  )
}

export function CampaignLayout() {
  return (
    <CampaignProvider>
      <CampaignShell />
    </CampaignProvider>
  )
}
