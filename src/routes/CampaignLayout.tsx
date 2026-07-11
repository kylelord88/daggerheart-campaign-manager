import { NavLink, Outlet, Link } from 'react-router-dom'
import { CampaignProvider, useCampaign } from '../context/CampaignContext'

function CampaignShell() {
  const { campaign, isGm, isLoading } = useCampaign()

  if (isLoading) return <div className="page-loading">Loading…</div>
  if (!campaign) return <p className="empty-state">Campaign not found, or you don't have access to it.</p>

  return (
    <div className="campaign-shell">
      <nav className="campaign-nav">
        <Link to="" className="campaign-nav-title">
          {campaign.name}
        </Link>
        <NavLink to="">Dashboard</NavLink>
        <NavLink to="locations">Locations</NavLink>
        <NavLink to="factions">Factions</NavLink>
        <NavLink to="divinities">Divinities</NavLink>
        <NavLink to="characters">Characters</NavLink>
        <NavLink to="quests">Quests</NavLink>
        {isGm && <NavLink to="sessions">Sessions (GM)</NavLink>}
        <Link to="/campaigns" className="campaign-nav-switch">
          Switch campaign
        </Link>
      </nav>
      <main className="campaign-content">
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
