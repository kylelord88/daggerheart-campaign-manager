import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useEnvironmentLibrary } from './useEnvironmentLibrary'
import {
  useSessionEnvironments,
  useAttachEnvironment,
  useRemoveSessionEnvironment,
  useSwapSessionEnvironmentOrder,
  type SessionEnvironmentWithEntry,
} from './useEnvironmentLibrary'
import { EnvironmentStatBlockDisplay } from './EnvironmentStatBlock'
import { TierEnvironmentPicker } from './TierEnvironmentPicker'

function AttachEnvironmentForm({
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
  const { data: library } = useEnvironmentLibrary(campaignId)
  const attach = useAttachEnvironment()
  const [environmentId, setEnvironmentId] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!environmentId) return
    await attach.mutateAsync({ sessionId, campaignId, environmentId, sortOrder })
    onDone()
  }

  return (
    <form onSubmit={handleSubmit} className="add-combatant-form">
      <div className="add-combatant-form-row">
        <TierEnvironmentPicker library={library ?? []} value={environmentId} onChange={setEnvironmentId} />
        <button type="submit" className="btn btn-primary" disabled={attach.isPending || !environmentId}>
          Attach
        </button>
        <button type="button" onClick={onDone}>
          Cancel
        </button>
      </div>
    </form>
  )
}

function AttachedEnvironmentCard({
  row,
  sessionId,
  isFirst,
  isLast,
  prev,
  next,
}: {
  row: SessionEnvironmentWithEntry
  sessionId: string
  isFirst: boolean
  isLast: boolean
  prev: SessionEnvironmentWithEntry | null
  next: SessionEnvironmentWithEntry | null
}) {
  const remove = useRemoveSessionEnvironment()
  const swap = useSwapSessionEnvironmentOrder()
  const { campaignSlug } = useParams<{ campaignSlug: string }>()
  const env = row.environment_library

  return (
    <div className="encounter-card">
      <div className="env-card-actions">
        <button
          type="button"
          className="env-reorder-btn"
          title="Move up"
          disabled={isFirst || swap.isPending || !prev}
          onClick={() => prev && swap.mutate({ sessionId, a: { id: row.id, sort_order: row.sort_order }, b: { id: prev.id, sort_order: prev.sort_order } })}
        >
          &#8593;
        </button>
        <button
          type="button"
          className="env-reorder-btn"
          title="Move down"
          disabled={isLast || swap.isPending || !next}
          onClick={() => next && swap.mutate({ sessionId, a: { id: row.id, sort_order: row.sort_order }, b: { id: next.id, sort_order: next.sort_order } })}
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

      {env ? (
        <>
          <EnvironmentStatBlockDisplay env={env} />
          <div className="env-card-foot">
            <Link to={`/c/${campaignSlug}/environments`} className="stat-block-edit-link">
              Open in Environment Library
            </Link>
          </div>
        </>
      ) : (
        <p className="empty-state" style={{ margin: '1rem' }}>
          This environment was deleted from the library.
        </p>
      )}
    </div>
  )
}

function EnvironmentsSection({ sessionId, campaignId }: { sessionId: string; campaignId: string }) {
  const { data: rows, isLoading } = useSessionEnvironments(sessionId)
  const [adding, setAdding] = useState(false)

  const list = rows ?? []

  return (
    <div className="subsection">
      <div className="subsection-head">
        <h2>Environments</h2>
        {!adding && (
          <button type="button" className="subtle-add-btn" onClick={() => setAdding(true)}>
            + Attach Environment
          </button>
        )}
      </div>
      <p className="subsection-hint">
        Pull environment stat blocks from your library into this session's prep — the scenes you expect to run. Each shows
        its full stat block inline and links back to the library entry.
      </p>

      {adding && (
        <div className="encounter-card">
          <AttachEnvironmentForm
            sessionId={sessionId}
            campaignId={campaignId}
            sortOrder={list.length}
            onDone={() => setAdding(false)}
          />
        </div>
      )}

      {isLoading && <p className="empty-state">Loading…</p>}
      {!isLoading && !list.length && !adding && <p className="empty-state">No environments attached to this session yet.</p>}

      {list.map((row, i) => (
        <AttachedEnvironmentCard
          key={row.id}
          row={row}
          sessionId={sessionId}
          isFirst={i === 0}
          isLast={i === list.length - 1}
          prev={i > 0 ? list[i - 1] : null}
          next={i < list.length - 1 ? list[i + 1] : null}
        />
      ))}
    </div>
  )
}

// Adapter matching the generic {entityId, campaignId} extraTabs signature.
export function EnvironmentsTab({ entityId, campaignId }: { entityId: string; campaignId: string }) {
  return <EnvironmentsSection sessionId={entityId} campaignId={campaignId} />
}
