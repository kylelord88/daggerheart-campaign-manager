import { NavLink, Outlet, Link, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CampaignProvider, useCampaign } from '../context/CampaignContext'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { ActiveClockWidget } from '../features/sessions/ActiveClockWidget'
import { GlobalSearchBox } from '../features/search/GlobalSearchBox'
import { NavDropdown } from '../components/NavDropdown'
import { MobileNav } from '../components/MobileNav'

const WORLD_SEGMENTS = ['/locations', '/factions', '/divinities', '/characters']
const GM_TOOLS_SEGMENTS = ['/adversaries', '/environments', '/sources', '/members']
const ACCOUNT_SEGMENTS = ['/account']

function CampaignShell() {
  const { campaign, isGm, isLoading, previewAsPlayer, setPreviewAsPlayer } = useCampaign()
  const { session } = useAuth()
  const location = useLocation()

  const handleSignOut = () => supabase.auth.signOut()

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

  // A dropdown's own trigger should still read as "active" when the current
  // route is one of its grouped children, so browsing to e.g. a Location
  // doesn't lose the sense of where you are in the nav.
  const matchesAny = (segments: string[]) => segments.some((s) => location.pathname.includes(s))
  const isWorldActive = matchesAny(WORLD_SEGMENTS)
  const isGmToolsActive = matchesAny(GM_TOOLS_SEGMENTS)
  const isAccountActive = matchesAny(ACCOUNT_SEGMENTS)

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
          <NavDropdown label="World" isActive={isWorldActive}>
            <NavLink to="locations">Locations</NavLink>
            <NavLink to="factions">Factions</NavLink>
            <NavLink to="divinities">Divinities</NavLink>
            <NavLink to="characters">Characters</NavLink>
          </NavDropdown>
          <NavLink to="quests">Quests</NavLink>
          <NavLink to="sessions">Sessions</NavLink>
          <NavLink to="misc">Community</NavLink>
          <NavLink to="notes">My Notes</NavLink>
          {isGm && (
            <NavDropdown label="GM Tools" isActive={isGmToolsActive}>
              <NavLink to="adversaries">Adversaries</NavLink>
              <NavLink to="environments">Environments</NavLink>
              <NavLink to="sources">Sources</NavLink>
              <NavLink to="members">Members</NavLink>
            </NavDropdown>
          )}
          <NavDropdown label="Account" isActive={isAccountActive} align="right">
            <NavLink to="account">Settings</NavLink>
            {(campaignCount ?? 0) > 1 && <Link to="/campaigns">Switch Campaign</Link>}
            <button type="button" onClick={handleSignOut}>
              Sign Out
            </button>
          </NavDropdown>
        </div>
        <GlobalSearchBox />
        <MobileNav>
          <NavLink to="" end>
            Dashboard
          </NavLink>
          <NavLink to="map">Map</NavLink>
          <div className="mobile-nav-section-label">World</div>
          <NavLink to="locations">Locations</NavLink>
          <NavLink to="factions">Factions</NavLink>
          <NavLink to="divinities">Divinities</NavLink>
          <NavLink to="characters">Characters</NavLink>
          <NavLink to="quests">Quests</NavLink>
          <NavLink to="sessions">Sessions</NavLink>
          <NavLink to="misc">Community</NavLink>
          <NavLink to="notes">My Notes</NavLink>
          {isGm && (
            <>
              <div className="mobile-nav-section-label">GM Tools</div>
              <NavLink to="adversaries">Adversaries</NavLink>
              <NavLink to="environments">Environments</NavLink>
              <NavLink to="sources">Sources</NavLink>
              <NavLink to="members">Members</NavLink>
            </>
          )}
          <div className="mobile-nav-section-label">Account</div>
          <NavLink to="account">Settings</NavLink>
          {(campaignCount ?? 0) > 1 && <Link to="/campaigns">Switch Campaign</Link>}
          <button type="button" onClick={handleSignOut}>
            Sign Out
          </button>
        </MobileNav>
      </nav>
      {previewAsPlayer && (
        <div className="preview-banner">
          <span>Previewing as a player — GM-only content is hidden.</span>
          <button type="button" className="btn-link" onClick={() => setPreviewAsPlayer(false)}>
            Exit Preview
          </button>
        </div>
      )}
      <main className={`campaign-content${isFullBleed ? ' full-bleed' : ''}`}>
        <Outlet />
      </main>
      <ActiveClockWidget />
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
