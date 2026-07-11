import { Link } from 'react-router-dom'
import { useCampaign } from '../context/CampaignContext'

// Full activity-feed dashboard is Phase 8. For now this is a simple landing
// page confirming the campaign loaded and linking into the content sections.
export function Dashboard() {
  const { campaign } = useCampaign()
  if (!campaign) return null

  return (
    <div className="dashboard-page">
      {campaign.cover_image_url && <img className="hero-image" src={campaign.cover_image_url} alt="" />}
      <h1>{campaign.name}</h1>
      {campaign.description && <p>{campaign.description}</p>}
      <ul className="dashboard-links">
        <li>
          <Link to="locations">Locations</Link>
        </li>
        <li>
          <Link to="factions">Factions</Link>
        </li>
        <li>
          <Link to="divinities">Divinities</Link>
        </li>
        <li>
          <Link to="characters">Characters</Link>
        </li>
        <li>
          <Link to="quests">Quests</Link>
        </li>
      </ul>
    </div>
  )
}
