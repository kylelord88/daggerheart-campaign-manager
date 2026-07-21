import { useState } from 'react'
import { Lightbox } from '../../components/Lightbox'
import { useSharedSourceImages, useSignedSourceUrl, type SourceImage } from './useSourceImages'

function HandoutCard({ source }: { source: SourceImage }) {
  const { data: signedUrl, isLoading: urlLoading } = useSignedSourceUrl(source.image_path)
  const [lightboxOpen, setLightboxOpen] = useState(false)

  return (
    <div className="encounter-card">
      <div className="source-attached-image-wrap">
        {signedUrl ? (
          <button
            type="button"
            className="source-lightbox-trigger"
            onClick={() => setLightboxOpen(true)}
            aria-label={`View larger image of ${source.name}`}
          >
            <img src={signedUrl} alt={source.name} className="source-attached-image" />
          </button>
        ) : (
          <div className="source-attached-image source-card-thumb-empty">{urlLoading ? 'Loading…' : ''}</div>
        )}
      </div>
      <Lightbox src={lightboxOpen ? signedUrl ?? null : null} alt={source.name} onClose={() => setLightboxOpen(false)} />
      <div style={{ padding: '0.8rem 1.2rem 1rem' }}>
        <h3 style={{ margin: '0 0 0.3rem' }}>{source.name}</h3>
        {source.description && <p style={{ margin: 0, color: 'var(--ink-soft)' }}>{source.description}</p>}
      </div>
    </div>
  )
}

// Every handout the GM has shared anywhere in the campaign, in one place -
// unlike the entity/session Handouts tabs, this isn't scoped to what's
// attached to a specific thing. RLS on gm_source_images means this only ever
// returns rows the GM has explicitly marked shared.
export function CampaignHandoutsTab({ campaignId }: { campaignId: string | undefined }) {
  const { data: handouts, isLoading } = useSharedSourceImages(campaignId)
  const list = handouts ?? []

  if (isLoading) return <p className="empty-state">Loading…</p>
  if (!list.length) return <p className="empty-state">Nothing shared yet. Your GM will post handouts here as they come up.</p>

  return (
    <div>
      {list.map((source) => (
        <HandoutCard key={source.id} source={source} />
      ))}
    </div>
  )
}
