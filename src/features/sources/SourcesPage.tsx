import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { useCampaign } from '../../context/CampaignContext'
import {
  useSourceImages,
  useSignedSourceUrl,
  useCreateSourceImage,
  useUpdateSourceImage,
  useDeleteSourceImage,
  type SourceImage,
} from './useSourceImages'

function SourceForm({
  campaignId,
  existing,
  onDone,
}: {
  campaignId: string
  existing: SourceImage | null
  onDone: () => void
}) {
  const createSource = useCreateSourceImage()
  const updateSource = useUpdateSourceImage()
  const { data: existingUrl } = useSignedSourceUrl(existing?.image_path)
  const [name, setName] = useState(existing?.name ?? '')
  const [description, setDescription] = useState(existing?.description ?? '')
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const saving = createSource.isPending || updateSource.isPending
  const error = createSource.error ?? updateSource.error

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
      if (!file && !existing.image_path) return
      await updateSource.mutateAsync({
        id: existing.id,
        campaignId,
        name: name.trim(),
        description: description.trim() || null,
        file,
        previousPath: existing.image_path,
      })
    } else {
      if (!file) return
      await createSource.mutateAsync({ campaignId, name: name.trim(), description: description.trim() || null, file })
    }
    onDone()
  }

  return (
    <form onSubmit={handleSubmit} className="stat-block-form">
      <div className="add-combatant-form-row">
        <input type="text" autoFocus placeholder="Name (e.g. Aunt Ren, face ref)" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="add-combatant-form-row">
        <textarea
          placeholder="Description (what this is / why it's useful)"
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
          {existing && <p className="subsection-hint" style={{ margin: 0 }}>Choose a new file to replace the current image, or leave blank to keep it.</p>}
        </div>
      </div>

      {error && <p className="error-text">{error instanceof Error ? error.message : String(error)}</p>}

      <div className="add-combatant-form-row">
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving…' : 'Save Source'}
        </button>
        <button type="button" onClick={onDone}>
          Cancel
        </button>
      </div>
    </form>
  )
}

function SourceCard({ source, campaignId }: { source: SourceImage; campaignId: string }) {
  const deleteSource = useDeleteSourceImage()
  const { data: signedUrl, isLoading: urlLoading } = useSignedSourceUrl(source.image_path)
  const [editing, setEditing] = useState(false)

  if (editing) {
    return (
      <div className="encounter-card">
        <SourceForm campaignId={campaignId} existing={source} onDone={() => setEditing(false)} />
      </div>
    )
  }

  return (
    <li>
      <div className="entity-card source-card">
        <div className="source-card-actions">
          <button type="button" title="Edit" onClick={() => setEditing(true)}>
            ✎
          </button>
          <button
            type="button"
            title="Delete"
            onClick={() => {
              if (window.confirm(`Delete "${source.name}"?`)) {
                deleteSource.mutate({ id: source.id, campaignId, imagePath: source.image_path })
              }
            }}
          >
            &times;
          </button>
        </div>
        {signedUrl ? (
          <div className="entity-card-thumb source-card-thumb" style={{ backgroundImage: `url(${signedUrl})` }} />
        ) : (
          <div className="entity-card-thumb source-card-thumb source-card-thumb-empty">{urlLoading ? '…' : ''}</div>
        )}
        <h3>{source.name}</h3>
        {source.description && <p className="entity-card-excerpt">{source.description}</p>}
      </div>
    </li>
  )
}

export function SourcesPage() {
  const { campaign, isLoading: campaignLoading } = useCampaign()
  const { data: sources, isLoading } = useSourceImages(campaign?.id)
  const [adding, setAdding] = useState(false)

  if (campaignLoading || isLoading) return <div className="page-loading">Loading…</div>
  if (!campaign) return null

  const list = sources ?? []

  return (
    <div className="entity-list-page">
      <div className="entity-list-header">
        <h1>
          Sources <span className="entity-list-count">· {list.length}</span>
        </h1>
        {!adding && (
          <button type="button" className="btn" onClick={() => setAdding(true)}>
            + New Source
          </button>
        )}
      </div>

      <p className="subsection-hint">
        GM-only reference images — portrait refs, location refs, anything visual you look at for prep. Players never see this page or
        these images.
      </p>

      {adding && (
        <div className="encounter-card">
          <SourceForm campaignId={campaign.id} existing={null} onDone={() => setAdding(false)} />
        </div>
      )}

      {!list.length && !adding && <p className="empty-state">No source images yet.</p>}

      <ul className="entity-grid">
        {list.map((source) => (
          <SourceCard key={source.id} source={source} campaignId={campaign.id} />
        ))}
      </ul>
    </div>
  )
}
