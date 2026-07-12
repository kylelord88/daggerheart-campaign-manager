import { NavLink, Outlet, Link, useLocation } from 'react-router-dom'
import { CampaignProvider, useCampaign } from '../context/CampaignContext'

function CampaignShell() {
  const { campaign, isGm, isLoading } = useCampaign()
  const location = useLocation()
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
          {isGm && <NavLink to="sessions">Sessions</NavLink>}
          {isGm && <NavLink to="members">Members</NavLink>}
          <Link to="/account" className="campaign-nav-switch">
            Account
          </Link>
          <Link to="/campaigns" className="campaign-nav-switch">
            Switch
          </Link>
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
