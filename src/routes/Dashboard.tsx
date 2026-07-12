import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useCampaign } from '../context/CampaignContext'
import { ImageUploadField } from '../features/entities/ImageUploadField'
import { supabase } from '../lib/supabaseClient'

// Full activity-feed dashboard is Phase 8. For now this is a simple landing
// page confirming the campaign loaded and linking into the content sections.
export function Dashboard() {
  const { campaign, isGm } = useCampaign()
  const queryClient = useQueryClient()
  if (!campaign) return null

  const handleCoverChange = async (url: string | null) => {
    const { error } = await supabase.from('campaigns').update({ cover_image_url: url }).eq('id', campaign.id)
    if (error) throw error
    queryClient.invalidateQueries({ queryKey: ['campaign-membership'] })
  }

  return (
    <div className="dashboard-page">
      {campaign.cover_image_url && <img className="hero-image" src={campaign.cover_image_url} alt="" />}
      {isGm && (
        <div className="dashboard-cover-upload">
          <ImageUploadField
            value={campaign.cover_image_url}
            onChange={handleCoverChange}
            campaignId={campaign.id}
            folder="campaigns"
            showPreview={false}
          />
        </div>
      )}
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
