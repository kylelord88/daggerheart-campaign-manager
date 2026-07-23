import { Link } from 'react-router-dom'
import { useCampaign } from '../../context/CampaignContext'
import { useRecapSession } from './useCurrentSession'

// A compact "catch me up" link to the recap of whichever session the GM chose
// (campaigns.recap_session_id, set in SessionControlPanel). Renders nothing
// when no session is chosen or it isn't visible to this viewer — RLS returns
// null for a player if the chosen session is unpublished, so there's never a
// broken link.
export function LastRecapLink({ campaignId }: { campaignId: string | undefined }) {
  const { campaign } = useCampaign()
  const { data: session } = useRecapSession(campaign?.recap_session_id)

  if (!campaignId || !session) return null

  return (
    <Link to={`sessions/${session.slug}`} className="dashboard-recap-link">
      <span className="dashboard-recap-link-kicker caps">Last Session Recap</span>
      <span className="dashboard-recap-link-name">
        {session.session_number ? `#${session.session_number} — ` : ''}
        {session.name}
      </span>
      <span className="dashboard-recap-link-cta caps">Read the recap &rarr;</span>
    </Link>
  )
}
