import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useCampaign } from '../../context/CampaignContext'
import { useAuth } from '../../context/AuthContext'
import { useMiscCategories, useMiscEntry, useSaveMiscEntry, useDeleteMiscEntry, useMemberLookup } from './useMiscData'
import { RichTextEditor } from '../../components/RichTextEditor'
import { ImageUploadField } from '../entities/ImageUploadField'
import type { MiscEntry } from '../../types/database'

export function MiscEntryPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { campaign, isGm } = useCampaign()
  const { session } = useAuth()
  const isNew = slug === 'new'
  const { data: entry, isLoading } = useMiscEntry(campaign?.id, slug)
  const { data: categories } = useMiscCategories(campaign?.id)
  const { data: members } = useMemberLookup(campaign?.id)
  const saveMutation = useSaveMiscEntry()
  const deleteMutation = useDeleteMiscEntry()

  const [editing, setEditing] = useState(isNew)
  const [values, setValues] = useState<Partial<MiscEntry>>({})
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    if (entry) setValues(entry)
    else if (isNew) setValues({})
  }, [entry, isNew])

  // New entries need a category to satisfy the not-null column - default to
  // the first one available once categories load, rather than making the
  // contributor pick from a blank select.
  useEffect(() => {
    if (isNew && !values.category_id && categories?.length) {
      setValues((prev) => ({ ...prev, category_id: categories[0].id }))
    }
  }, [isNew, categories, values.category_id])

  if (!isNew && isLoading) return <div className="page-loading">Loading…</div>
  if (!campaign) return null

  const canEdit = isGm || Boolean(entry && entry.created_by === session?.user.id) || isNew
  const contributor = members?.find((m) => m.user_id === entry?.created_by)

  const handleSave = async () => {
    if (!values.category_id) {
      setSaveError('Choose a category before saving.')
      return
    }
    if (!values.name?.trim()) {
      setSaveError('Give it a name before saving.')
      return
    }
    setSaveError(null)
    const result = await saveMutation.mutateAsync({
      campaignId: campaign.id,
      id: isNew ? null : (entry?.id as string),
      values,
    })
    setEditing(false)
    if (isNew && result?.slug) {
      navigate(`../${result.slug}`, { replace: true })
    }
  }

  const handleDelete = async () => {
    if (!entry) return
    if (!window.confirm(`Delete "${values.name}"? This cannot be undone.`)) return
    await deleteMutation.mutateAsync({ id: entry.id, campaignId: campaign.id })
    navigate('..')
  }

  return (
    <div className="entity-form-page">
      <div className="entity-form-header">
        <Link to="..">&larr; Community Content</Link>
        {canEdit && !isNew && !editing && <button onClick={() => setEditing(true)}>Edit</button>}
      </div>

      {editing ? (
        <div className="entity-form">
          <h1>{isNew ? 'New Entry' : values.name}</h1>
          <label className="form-field">
            <span>Name</span>
            <input type="text" value={values.name ?? ''} onChange={(e) => setValues((p) => ({ ...p, name: e.target.value }))} />
          </label>
          <label className="form-field">
            <span>Category</span>
            <select value={values.category_id ?? ''} onChange={(e) => setValues((p) => ({ ...p, category_id: e.target.value }))}>
              <option value="">—</option>
              {categories?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="form-field">
            <span>Tags</span>
            <input
              type="text"
              value={Array.isArray(values.tags) ? values.tags.join(', ') : ''}
              placeholder="comma, separated, tags"
              onChange={(e) =>
                setValues((p) => ({ ...p, tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean) }))
              }
            />
          </label>
          <label className="form-field">
            <span>Summary</span>
            <textarea rows={2} value={values.summary ?? ''} onChange={(e) => setValues((p) => ({ ...p, summary: e.target.value }))} />
          </label>
          <label className="form-field">
            <span>Photo</span>
            <ImageUploadField
              value={values.hero_image_url}
              onChange={(url) => setValues((p) => ({ ...p, hero_image_url: url }))}
              campaignId={campaign.id}
              folder="misc_entries"
            />
          </label>
          <label className="form-field">
            <span>Details</span>
            <RichTextEditor value={values.content_html ?? ''} onChange={(html) => setValues((p) => ({ ...p, content_html: html }))} />
          </label>

          <div className="entity-form-actions">
            <button className="btn-primary" onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving…' : 'Save'}
            </button>
            <button
              onClick={() => {
                if (isNew) navigate('..')
                else {
                  setValues(entry ?? {})
                  setEditing(false)
                }
              }}
            >
              Cancel
            </button>
            {!isNew && canEdit && (
              <button className="btn-danger" onClick={handleDelete}>
                Delete
              </button>
            )}
          </div>
          {saveError && <p className="error-text">{saveError}</p>}
        </div>
      ) : (
        <article className="entity-view">
          {values.hero_image_url && <img className="hero-image" src={values.hero_image_url} alt="" />}
          <div className="entity-view-grid">
            <div className="entity-view-main">
              <h1>{values.name}</h1>
              {values.summary && <p className="misc-summary">{values.summary}</p>}
              {values.content_html && <RichTextEditor value={values.content_html} onChange={() => {}} editable={false} />}
            </div>
            <aside className="entity-view-meta">
              {values.tags && values.tags.length > 0 && (
                <div className="field-view tags">
                  {values.tags.map((t) => (
                    <span key={t} className="tag">
                      {t}
                    </span>
                  ))}
                </div>
              )}
              <div className="field-view">
                <span className="field-label">Contributed By</span>
                <span className="field-value">{contributor?.display_name || contributor?.email || 'Unknown'}</span>
              </div>
            </aside>
          </div>
        </article>
      )}
    </div>
  )
}
