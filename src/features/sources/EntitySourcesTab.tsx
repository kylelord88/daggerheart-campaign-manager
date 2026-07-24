import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Lightbox } from '../../components/Lightbox'
import { useCampaign } from '../../context/CampaignContext'
import {
  useEntitySourceImages,
  useDetachSourceFromEntity,
  useSignedSourceUrl,
  ATTACHABLE_ENTITY_TYPES,
  type AttachableEntityTable,
  type SourceAttachmentWithImage,
} from './useSourceImages'

// Mirrors SessionSourcesTab's AttachedSourceCard image sizing/CSS
// (.source-attached-image-wrap / .source-attached-image) - reuse those
// classes rather than duplicating them. No reordering here (unlike the
// session version): images are attached one at a time from the Sources
// page, so plain created-at order is enough.
//
// GM view only - full chrome (detach button, shared/GM-only status, link
// back to the library). Players get the much simpler PlayerSourceImageCard
// below instead.
function AttachedEntitySourceCard({
  row,
  campaignId,
  entityTable,
  entityId,
}: {
  row: SourceAttachmentWithImage
  campaignId: string
  entityTable: AttachableEntityTable
  entityId: string
}) {
  const detach = useDetachSourceFromEntity()
  const { campaignSlug } = useParams<{ campaignSlug: string }>()
  const source = row.gm_source_images
  const { data: signedUrl, isLoading: urlLoading } = useSignedSourceUrl(source?.image_path)
  const [lightboxOpen, setLightboxOpen] = useState(false)

  return (
    <div className="encounter-card">
      <div className="env-card-actions">
        <button
          type="button"
          className="remove-combatant"
          title="Detach"
          onClick={() =>
            detach.mutate({ id: row.id, sourceId: row.source_id, campaignId, entityTable, entityId })
          }
        >
          &times;
        </button>
      </div>

      {source ? (
        <>
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
            <span className={`source-shared-badge ${source.is_shared ? 'is-shared' : 'is-gm-only'}`}>
              {source.is_shared ? 'Shared' : 'GM only'}
            </span>
            {source.description && <p style={{ margin: '0.4rem 0 0', color: 'var(--ink-soft)' }}>{source.description}</p>}
          </div>
          <div className="env-card-foot">
            <Link to={`/c/${campaignSlug}/sources`} className="stat-block-edit-link">
              Open in Sources library
            </Link>
          </div>
        </>
      ) : (
        <p className="empty-state" style={{ margin: '1rem' }}>
          This source image was deleted from the library.
        </p>
      )}
    </div>
  )
}

// Player view - read-only, no detach/edit affordances, no GM-flavored copy
// pointing at the (GM-only) Sources library page. RLS on gm_source_images/
// source_attachments already guarantees this query only ever returns rows
// for images explicitly marked is_shared, so anything rendered here was
// deliberately shared by the GM.
function PlayerSourceImageCard({ row }: { row: SourceAttachmentWithImage }) {
  const source = row.gm_source_images
  const { data: signedUrl, isLoading: urlLoading } = useSignedSourceUrl(source?.image_path)
  const [lightboxOpen, setLightboxOpen] = useState(false)

  if (!source) return null

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

// Factory: one reusable component bound to a specific entity table, wired
// into each of LOCATION_CONFIG/CHARACTER_CONFIG/QUEST_CONFIG/FACTION_CONFIG/
// DIVINITY_CONFIG's extraTabs. Matches the generic {entityId, campaignId}
// extraTabs component signature. The tab itself is visible to every campaign
// member (gmOnly: false on the config) - RLS on the underlying tables means a
// non-GM's query only ever returns rows for images the GM explicitly shared,
// so opening the tab doesn't leak anything.
export function makeEntitySourcesTab(entityTable: AttachableEntityTable) {
  const entityLabel = ATTACHABLE_ENTITY_TYPES.find((t) => t.table === entityTable)?.label ?? entityTable
  // Locations use these attachments for district/establishment art rather than
  // general handouts, so the section is titled to match (and these images are
  // also kept out of the campaign-wide Handouts feed — see useSharedSourceImages).
  const sectionTitle = entityTable === 'locations' ? 'Districts & Establishments' : 'Handouts'

  return function EntitySourcesTab({ entityId, campaignId }: { entityId: string; campaignId: string }) {
    const { campaignSlug } = useParams<{ campaignSlug: string }>()
    const { isGm, previewAsPlayer } = useCampaign()
    const { data: rows, isLoading } = useEntitySourceImages(campaignId, entityTable, entityId)
    // The GM's own session always gets every attached row back from RLS
    // (shared or not) - previewAsPlayer doesn't change that, it's cosmetic.
    // So simulating "what a player sees" here means filtering client-side to
    // is_shared, not just swapping which branch renders (a real player's
    // query already only returns shared rows - this reproduces that).
    const effectiveIsGm = isGm && !previewAsPlayer
    const list = effectiveIsGm ? (rows ?? []) : (rows ?? []).filter((row) => row.gm_source_images?.is_shared)

    if (!effectiveIsGm) {
      // Players: nothing GM-flavored, and no empty state at all if there's
      // nothing shared - just render nothing rather than surfacing a tab
      // that says "no sources attached yet, go attach one."
      if (isLoading || !list.length) return null
      return (
        <div className="subsection">
          <div className="subsection-head">
            <h2>{sectionTitle}</h2>
          </div>
          {list.map((row) => (
            <PlayerSourceImageCard key={row.id} row={row} />
          ))}
        </div>
      )
    }

    return (
      <div className="subsection">
        <div className="subsection-head">
          <h2>{sectionTitle}</h2>
        </div>
        <p className="subsection-hint">
          Reference images attached to this {entityLabel} from your Sources library. Attach or detach images from
          the <Link to={`/c/${campaignSlug}/sources`}>Sources page</Link>. Mark an image "Share with players" on the
          library page to let players see it here too.
        </p>

        {isLoading && <p className="empty-state">Loading…</p>}
        {!isLoading && !list.length && (
          <p className="empty-state">
            No source images attached yet. Head to the{' '}
            <Link to={`/c/${campaignSlug}/sources`}>Sources page</Link> to attach one.
          </p>
        )}

        {list.map((row) => (
          <AttachedEntitySourceCard
            key={row.id}
            row={row}
            campaignId={campaignId}
            entityTable={entityTable}
            entityId={entityId}
          />
        ))}
      </div>
    )
  }
}
