import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Lightbox } from '../../components/Lightbox'
import { useCampaign } from '../../context/CampaignContext'
import {
  useEntitySourceImages,
  useDetachSourceFromEntity,
  useCreateSourceImage,
  useUpdateSourceImage,
  useAttachSourceToEntity,
  useSignedSourceUrl,
  ATTACHABLE_ENTITY_TYPES,
  type AttachableEntityTable,
  type SourceImage,
  type SourceAttachmentWithImage,
} from './useSourceImages'

// Mirrors SessionSourcesTab's AttachedSourceCard image sizing/CSS
// (.source-attached-image-wrap / .source-attached-image) - reuse those
// classes rather than duplicating them. No reordering here (unlike the
// session version): entries are added one at a time, so plain created-at
// order is enough.
//
// The image is optional (a text-only entry, e.g. a district/establishment
// inside a city) - the image block is skipped entirely when there's no
// image_path rather than showing an empty placeholder box.
//
// GM view only - full chrome (detach button, shared/GM-only status, link
// back to the library). Players get the much simpler PlayerSourceImageCard
// below instead.
function AttachedEntitySourceCard({
  row,
  campaignId,
  entityTable,
  entityId,
  noun,
}: {
  row: SourceAttachmentWithImage
  campaignId: string
  entityTable: AttachableEntityTable
  entityId: string
  noun: string
}) {
  const detach = useDetachSourceFromEntity()
  const { campaignSlug } = useParams<{ campaignSlug: string }>()
  const source = row.gm_source_images
  const { data: signedUrl, isLoading: urlLoading } = useSignedSourceUrl(source?.image_path)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  // Location entries are hidden from the Sources library page, so the "open it
  // there" link would go nowhere useful — the card's own Edit button is how you
  // manage them instead.
  const isLocation = entityTable === 'locations'

  if (editing && source) {
    return (
      <div className="encounter-card">
        <EntitySourceForm
          campaignId={campaignId}
          entityTable={entityTable}
          entityId={entityId}
          noun={noun}
          existing={source}
          onDone={() => setEditing(false)}
        />
      </div>
    )
  }

  return (
    <div className="encounter-card">
      <div className="env-card-actions">
        {source && (
          <button type="button" className="env-reorder-btn" title="Edit" onClick={() => setEditing(true)}>
            ✎
          </button>
        )}
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
          {source.image_path && (
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
            </>
          )}
          <div style={{ padding: '0.8rem 1.2rem 1rem' }}>
            <h3 style={{ margin: '0 0 0.3rem' }}>{source.name}</h3>
            <span className={`source-shared-badge ${source.is_shared ? 'is-shared' : 'is-gm-only'}`}>
              {source.is_shared ? 'Shared' : 'GM only'}
            </span>
            {source.description && <p style={{ margin: '0.4rem 0 0', color: 'var(--ink-soft)' }}>{source.description}</p>}
          </div>
          {!isLocation && (
            <div className="env-card-foot">
              <Link to={`/c/${campaignSlug}/sources`} className="stat-block-edit-link">
                Open in Sources library
              </Link>
            </div>
          )}
        </>
      ) : (
        <p className="empty-state" style={{ margin: '1rem' }}>
          This entry was deleted from the library.
        </p>
      )}
    </div>
  )
}

// Player view - read-only, no detach/edit affordances, no GM-flavored copy
// pointing at the (GM-only) Sources library page. RLS on gm_source_images/
// source_attachments already guarantees this query only ever returns rows
// for images explicitly marked is_shared, so anything rendered here was
// deliberately shared by the GM. The image is optional (text-only entries
// render as just a name + description).
function PlayerSourceImageCard({ row }: { row: SourceAttachmentWithImage }) {
  const source = row.gm_source_images
  const { data: signedUrl, isLoading: urlLoading } = useSignedSourceUrl(source?.image_path)
  const [lightboxOpen, setLightboxOpen] = useState(false)

  if (!source) return null

  return (
    <div className="encounter-card">
      {source.image_path && (
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
        </>
      )}
      <div style={{ padding: '0.8rem 1.2rem 1rem' }}>
        <h3 style={{ margin: '0 0 0.3rem' }}>{source.name}</h3>
        {source.description && <p style={{ margin: 0, color: 'var(--ink-soft)' }}>{source.description}</p>}
      </div>
    </div>
  )
}

// Inline entry form used right inside the tab, so the GM never has to detour
// to the Sources library page. Same fields the library form offers: name,
// description, an optional image, and the share-with-players toggle.
//   * add  (existing == null): creates a gm_source_images row (image OPTIONAL)
//     and attaches it to this entity in one step.
//   * edit (existing set): updates that row in place. This is the only way to
//     edit a location entry, since location entries are hidden from the
//     Sources library page.
function EntitySourceForm({
  campaignId,
  entityTable,
  entityId,
  noun,
  existing,
  onDone,
}: {
  campaignId: string
  entityTable: AttachableEntityTable
  entityId: string
  noun: string
  existing?: SourceImage | null
  onDone: () => void
}) {
  const createSource = useCreateSourceImage()
  const updateSource = useUpdateSourceImage()
  const attach = useAttachSourceToEntity()
  const { data: existingUrl } = useSignedSourceUrl(existing?.image_path)
  const [name, setName] = useState(existing?.name ?? '')
  const [description, setDescription] = useState(existing?.description ?? '')
  const [isShared, setIsShared] = useState(existing?.is_shared ?? false)
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const saving = createSource.isPending || updateSource.isPending || attach.isPending
  const error = createSource.error ?? updateSource.error ?? attach.error

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] ?? null)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    if (existing) {
      await updateSource.mutateAsync({
        id: existing.id,
        campaignId,
        name: name.trim(),
        description: description.trim() || null,
        file,
        previousPath: existing.image_path,
        isShared,
      })
    } else {
      const { id } = await createSource.mutateAsync({
        campaignId,
        name: name.trim(),
        description: description.trim() || null,
        file,
        isShared,
      })
      await attach.mutateAsync({ campaignId, sourceId: id, entityTable, entityId })
    }
    onDone()
  }

  return (
    <form onSubmit={handleSubmit} className="stat-block-form">
      <div className="add-combatant-form-row">
        <input
          type="text"
          autoFocus
          placeholder={`Name (e.g. ${noun})`}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="add-combatant-form-row">
        <textarea
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          style={{ flex: 1 }}
        />
      </div>
      <div className="add-combatant-form-row">
        <div className="image-upload-field">
          {previewUrl ? (
            <div className="image-upload-current">
              <img src={previewUrl} alt="" className="image-upload-preview" />
              <button type="button" className="image-upload-remove" onClick={() => setFile(null)} aria-label="Remove selected image">
                ×
              </button>
            </div>
          ) : existing && existingUrl ? (
            <div className="image-upload-current">
              <img src={existingUrl} alt="" className="image-upload-preview" />
            </div>
          ) : null}
          {!file && <input type="file" accept="image/*" onChange={handleFileChange} disabled={saving} />}
          <p className="subsection-hint" style={{ margin: 0 }}>
            {existing
              ? 'Choose a new file to replace the current image, or leave blank to keep it.'
              : 'Image is optional — leave blank for a text-only entry.'}
          </p>
        </div>
      </div>
      <div className="add-combatant-form-row">
        <label className="form-field" style={{ maxWidth: 'none' }}>
          <span>Share with players</span>
          <input
            type="checkbox"
            className="field-checkbox"
            checked={isShared}
            onChange={(e) => setIsShared(e.target.checked)}
          />
        </label>
      </div>

      {error && <p className="error-text">{error instanceof Error ? error.message : String(error)}</p>}

      <div className="add-combatant-form-row">
        <button type="submit" className="btn btn-primary" disabled={saving || !name.trim()}>
          {saving ? 'Saving…' : existing ? 'Save' : 'Add'}
        </button>
        <button type="button" onClick={onDone}>
          Cancel
        </button>
      </div>
    </form>
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
  // Locations use these attachments for the places INSIDE them (districts,
  // taverns, shops) rather than general handouts, so the section is titled to
  // match, the add form is worded for sub-places, and these entries are kept
  // out of the campaign-wide Handouts feed (see useSharedSourceImages).
  const isLocation = entityTable === 'locations'
  const sectionTitle = isLocation ? 'Districts & Establishments' : 'Handouts'
  const addLabel = isLocation ? '+ Add a district or establishment' : '+ Add a handout'
  const addNoun = isLocation ? 'Fox’s Rest, Canal District' : 'map, letter, portrait'

  return function EntitySourcesTab({ entityId, campaignId }: { entityId: string; campaignId: string }) {
    const { campaignSlug } = useParams<{ campaignSlug: string }>()
    const { isGm, previewAsPlayer } = useCampaign()
    const { data: rows, isLoading } = useEntitySourceImages(campaignId, entityTable, entityId)
    const [adding, setAdding] = useState(false)
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
          {!adding && (
            <button type="button" className="btn" onClick={() => setAdding(true)}>
              {addLabel}
            </button>
          )}
        </div>
        <p className="subsection-hint">
          {isLocation
            ? 'Places inside this location — districts, taverns, shops. Add one here (an image is optional), or attach an existing reference image from the '
            : `Reference images attached to this ${entityLabel}. Add one here, or attach an existing image from the `}
          <Link to={`/c/${campaignSlug}/sources`}>Sources page</Link>. Turn on "Share with players" to let players see it
          here too.
        </p>

        {adding && (
          <div className="encounter-card">
            <EntitySourceForm
              campaignId={campaignId}
              entityTable={entityTable}
              entityId={entityId}
              noun={addNoun}
              onDone={() => setAdding(false)}
            />
          </div>
        )}

        {isLoading && <p className="empty-state">Loading…</p>}
        {!isLoading && !list.length && !adding && (
          <p className="empty-state">Nothing here yet.</p>
        )}

        {list.map((row) => (
          <AttachedEntitySourceCard
            key={row.id}
            row={row}
            campaignId={campaignId}
            entityTable={entityTable}
            entityId={entityId}
            noun={addNoun}
          />
        ))}
      </div>
    )
  }
}
