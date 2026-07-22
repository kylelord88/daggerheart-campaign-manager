import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Lightbox } from '../../components/Lightbox'
import { useCampaign } from '../../context/CampaignContext'
import {
  useSourceImages,
  useSignedSourceUrl,
  useSessionSources,
  useAttachSource,
  useRemoveSessionSource,
  useReorderSessionSources,
  type SessionSourceWithEntry,
} from './useSourceImages'

function AttachSourceForm({
  sessionId,
  campaignId,
  sortOrder,
  onDone,
}: {
  sessionId: string
  campaignId: string
  sortOrder: number
  onDone: () => void
}) {
  const { data: library } = useSourceImages(campaignId)
  const attach = useAttachSource()
  const [sourceId, setSourceId] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!sourceId) return
    await attach.mutateAsync({ sessionId, campaignId, sourceId, sortOrder })
    onDone()
  }

  const options = library ?? []

  return (
    <form onSubmit={handleSubmit} className="add-combatant-form">
      <div className="add-combatant-form-row">
        {options.length ? (
          <select value={sourceId} onChange={(e) => setSourceId(e.target.value)}>
            <option value="">— pick a source image —</option>
            {options.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        ) : (
          <span className="empty-state">No source images in the library yet.</span>
        )}
        <button type="submit" className="btn btn-primary" disabled={attach.isPending || !sourceId}>
          Attach
        </button>
        <button type="button" onClick={onDone}>
          Cancel
        </button>
      </div>
    </form>
  )
}

function AttachedSourceCard({
  row,
  sessionId,
  isFirst,
  isLast,
  isReordering,
  onMoveUp,
  onMoveDown,
}: {
  row: SessionSourceWithEntry
  sessionId: string
  isFirst: boolean
  isLast: boolean
  isReordering: boolean
  onMoveUp: () => void
  onMoveDown: () => void
}) {
  const remove = useRemoveSessionSource()
  const { campaignSlug } = useParams<{ campaignSlug: string }>()
  const source = row.gm_source_images
  const { data: signedUrl, isLoading: urlLoading } = useSignedSourceUrl(source?.image_path)
  const [lightboxOpen, setLightboxOpen] = useState(false)

  return (
    <div className="encounter-card">
      <div className="env-card-actions">
        <button
          type="button"
          className="env-reorder-btn"
          title="Move up"
          disabled={isFirst || isReordering}
          onClick={onMoveUp}
        >
          &#8593;
        </button>
        <button
          type="button"
          className="env-reorder-btn"
          title="Move down"
          disabled={isLast || isReordering}
          onClick={onMoveDown}
        >
          &#8595;
        </button>
        <button
          type="button"
          className="remove-combatant"
          title="Remove from this session"
          onClick={() => remove.mutate({ id: row.id, sessionId })}
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

// Player view - read-only, no reorder/remove affordances, no GM-flavored
// copy. RLS on session_sources/gm_source_images already guarantees this
// query only ever returns rows for images the GM explicitly shared.
function PlayerSourceCard({ row }: { row: SessionSourceWithEntry }) {
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

function SourcesSection({ sessionId, campaignId }: { sessionId: string; campaignId: string }) {
  const { isGm, previewAsPlayer } = useCampaign()
  const { data: rows, isLoading } = useSessionSources(sessionId)
  const reorder = useReorderSessionSources()
  const [adding, setAdding] = useState(false)

  // The GM's own session always gets every attached row back from RLS
  // (shared or not) - previewAsPlayer doesn't change that, it's cosmetic. So
  // simulating "what a player sees" here means filtering client-side to
  // is_shared, not just swapping which branch renders (a real player's query
  // already only returns shared rows - this reproduces that).
  const effectiveIsGm = isGm && !previewAsPlayer
  const list = effectiveIsGm ? (rows ?? []) : (rows ?? []).filter((row) => row.gm_source_images?.is_shared)

  // Swap two adjacent cards and persist a clean renumbering of the whole list.
  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= list.length) return
    const orderedIds = list.map((r) => r.id)
    ;[orderedIds[index], orderedIds[target]] = [orderedIds[target], orderedIds[index]]
    reorder.mutate({
      sessionId,
      rows: list.map((r) => ({ id: r.id, sort_order: r.sort_order })),
      orderedIds,
    })
  }

  if (!effectiveIsGm) {
    // Players: nothing GM-flavored, and no empty state at all if there's
    // nothing shared - just render nothing rather than a tab that reads
    // "no sources attached yet."
    if (isLoading || !list.length) return null
    return (
      <div className="subsection">
        <div className="subsection-head">
          <h2>Handouts</h2>
        </div>
        <div className="source-card-grid">
          {list.map((row) => (
            <PlayerSourceCard key={row.id} row={row} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="subsection">
      <div className="subsection-head">
        <h2>Handouts</h2>
        {!adding && (
          <button type="button" className="subtle-add-btn" onClick={() => setAdding(true)}>
            + Attach Source
          </button>
        )}
      </div>
      <p className="subsection-hint">
        Pull reference images from your Sources library into this session — pin the portraits and location refs you'll
        want to glance at while describing a scene. Mark an image "Share with players" on the library page to let
        players see it here too.
      </p>

      {adding && (
        <div className="encounter-card">
          <AttachSourceForm
            sessionId={sessionId}
            campaignId={campaignId}
            sortOrder={list.length}
            onDone={() => setAdding(false)}
          />
        </div>
      )}

      {isLoading && <p className="empty-state">Loading…</p>}
      {!isLoading && !list.length && !adding && <p className="empty-state">No source images attached to this session yet.</p>}

      <div className="source-card-grid">
        {list.map((row, i) => (
          <AttachedSourceCard
            key={row.id}
            row={row}
            sessionId={sessionId}
            isFirst={i === 0}
            isLast={i === list.length - 1}
            isReordering={reorder.isPending}
            onMoveUp={() => move(i, -1)}
            onMoveDown={() => move(i, 1)}
          />
        ))}
      </div>
    </div>
  )
}

// Adapter matching the generic {entityId, campaignId} extraTabs signature.
export function SourcesTab({ entityId, campaignId }: { entityId: string; campaignId: string }) {
  return <SourcesSection sessionId={entityId} campaignId={campaignId} />
}
