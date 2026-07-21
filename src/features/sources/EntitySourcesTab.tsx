import { Link, useParams } from 'react-router-dom'
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
              <img src={signedUrl} alt={source.name} className="source-attached-image" />
            ) : (
              <div className="source-attached-image source-card-thumb-empty">{urlLoading ? 'Loading…' : ''}</div>
            )}
          </div>
          <div style={{ padding: '0.8rem 1.2rem 1rem' }}>
            <h3 style={{ margin: '0 0 0.3rem' }}>{source.name}</h3>
            {source.description && <p style={{ margin: 0, color: 'var(--ink-soft)' }}>{source.description}</p>}
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

// Factory: one reusable component bound to a specific entity table, wired
// into each of LOCATION_CONFIG/CHARACTER_CONFIG/QUEST_CONFIG/FACTION_CONFIG/
// DIVINITY_CONFIG's extraTabs. Matches the generic {entityId, campaignId}
// extraTabs component signature. GM-only by default (no gmOnly: false), same
// as the rest of this feature - attaching happens from the Sources page
// itself; this tab is read + detach only.
export function makeEntitySourcesTab(entityTable: AttachableEntityTable) {
  const entityLabel = ATTACHABLE_ENTITY_TYPES.find((t) => t.table === entityTable)?.label ?? entityTable

  return function EntitySourcesTab({ entityId, campaignId }: { entityId: string; campaignId: string }) {
    const { campaignSlug } = useParams<{ campaignSlug: string }>()
    const { data: rows, isLoading } = useEntitySourceImages(campaignId, entityTable, entityId)
    const list = rows ?? []

    return (
      <div className="subsection">
        <div className="subsection-head">
          <h2>Sources</h2>
        </div>
        <p className="subsection-hint">
          Reference images attached to this {entityLabel} from your Sources library. Attach or detach images from
          the <Link to={`/c/${campaignSlug}/sources`}>Sources page</Link> - GM-only, players never see this tab.
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
