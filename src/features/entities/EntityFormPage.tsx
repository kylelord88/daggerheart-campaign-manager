import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useCampaign } from '../../context/CampaignContext'
import { useEntityRecord, useReferenceOptions, usePlayerOptions, useSaveEntity, useDeleteEntity } from './useEntity'
import { RichTextEditor } from '../../components/RichTextEditor'
import { ImageUploadField } from './ImageUploadField'
import { supabase } from '../../lib/supabaseClient'
import type { EntityConfig, FieldConfig } from './types'

type Row = Record<string, unknown>

function ReferenceSelect({
  field,
  value,
  onChange,
  campaignId,
}: {
  field: FieldConfig
  value: unknown
  onChange: (v: string | null) => void
  campaignId: string | undefined
}) {
  const { data: options, isLoading } = useReferenceOptions(field.reference, campaignId)
  return (
    <select
      value={(value as string) ?? ''}
      disabled={isLoading}
      onChange={(e) => onChange(e.target.value || null)}
    >
      <option value="">—</option>
      {options?.map((opt) => (
        <option key={opt.id} value={opt.id}>
          {opt.label}
        </option>
      ))}
    </select>
  )
}

function PlayerSelect({
  value,
  onChange,
  campaignId,
}: {
  value: unknown
  onChange: (v: string | null) => void
  campaignId: string | undefined
}) {
  const { data: options, isLoading } = usePlayerOptions(campaignId)
  return (
    <select
      value={(value as string) ?? ''}
      disabled={isLoading}
      onChange={(e) => onChange(e.target.value || null)}
    >
      <option value="">— none —</option>
      {options?.map((opt) => (
        <option key={opt.id} value={opt.id}>
          {opt.label}
        </option>
      ))}
      {!isLoading && !options?.length && <option disabled>No players in this campaign yet</option>}
    </select>
  )
}

function FieldInput({
  field,
  value,
  onChange,
  campaignId,
  folder,
}: {
  field: FieldConfig
  value: unknown
  onChange: (v: unknown) => void
  campaignId: string | undefined
  folder: string
}) {
  switch (field.kind) {
    case 'text':
      return (
        <input
          type="text"
          value={(value as string) ?? ''}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      )
    case 'textarea':
      return (
        <textarea
          value={(value as string) ?? ''}
          placeholder={field.placeholder}
          rows={3}
          onChange={(e) => onChange(e.target.value)}
        />
      )
    case 'select':
      return (
        <select value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)}>
          <option value="">—</option>
          {field.options?.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      )
    case 'tags':
      return (
        <input
          type="text"
          value={Array.isArray(value) ? (value as string[]).join(', ') : ''}
          placeholder="comma, separated, tags"
          onChange={(e) =>
            onChange(
              e.target.value
                .split(',')
                .map((t) => t.trim())
                .filter(Boolean),
            )
          }
        />
      )
    case 'reference':
      return <ReferenceSelect field={field} value={value} onChange={onChange} campaignId={campaignId} />
    case 'player':
      return <PlayerSelect value={value} onChange={onChange} campaignId={campaignId} />
    case 'image':
      return <ImageUploadField value={value} onChange={onChange} campaignId={campaignId} folder={folder} />
    case 'date':
      return <input type="date" value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value || null)} />
    case 'number':
      return (
        <input
          type="number"
          value={value === null || value === undefined ? '' : (value as number)}
          onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
        />
      )
    case 'boolean':
      return (
        <input
          type="checkbox"
          className="field-checkbox"
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
        />
      )
    case 'richtext':
      return <RichTextEditor value={(value as string) ?? ''} onChange={onChange} />
  }
}

function PlayerValueView({ userId, campaignId }: { userId: string; campaignId: string | undefined }) {
  const { data: options } = usePlayerOptions(campaignId)
  const label = options?.find((o) => o.id === userId)?.label ?? userId
  return <span className="field-value">{label}</span>
}

function ReferenceValueView({
  field,
  value,
  campaignId,
}: {
  field: FieldConfig
  value: string
  campaignId: string | undefined
}) {
  const { data: options } = useReferenceOptions(field.reference, campaignId)
  const label = options?.find((o) => o.id === value)?.label ?? value
  return <span className="field-value">{label}</span>
}

function FieldView({ field, value, campaignId }: { field: FieldConfig; value: unknown; campaignId: string | undefined }) {
  if (value === null || value === undefined || value === '') return null
  if (field.kind === 'richtext') {
    return (
      <section className="field-view richtext">
        <h3>{field.label}</h3>
        <RichTextEditor value={value as string} onChange={() => {}} editable={false} />
      </section>
    )
  }
  if (field.kind === 'textarea') {
    return (
      <section className="field-view textarea">
        <h3>{field.label}</h3>
        <p>{value as string}</p>
      </section>
    )
  }
  if (field.kind === 'tags' && Array.isArray(value)) {
    if (!value.length) return null
    return (
      <div className="field-view tags">
        {(value as string[]).map((t) => (
          <span key={t} className="tag">
            {t}
          </span>
        ))}
      </div>
    )
  }
  if (field.kind === 'player') {
    return (
      <div className="field-view">
        <span className="field-label">{field.label}</span>
        <PlayerValueView userId={value as string} campaignId={campaignId} />
      </div>
    )
  }
  if (field.kind === 'reference') {
    return (
      <div className="field-view">
        <span className="field-label">{field.label}</span>
        <ReferenceValueView field={field} value={value as string} campaignId={campaignId} />
      </div>
    )
  }
  if (field.kind === 'boolean') {
    return (
      <div className="field-view">
        <span className="field-label">{field.label}</span>
        <span className="field-value">{value ? 'Yes' : 'No'}</span>
      </div>
    )
  }
  return (
    <div className="field-view">
      <span className="field-label">{field.label}</span>
      <span className="field-value">{String(value)}</span>
    </div>
  )
}

export function EntityFormPage({ config }: { config: EntityConfig }) {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { campaign, isGm } = useCampaign()
  const isNew = slug === 'new'
  const heroImageKey = config.heroImageFieldKey ?? 'hero_image_url'
  const { data, isLoading } = useEntityRecord(config, campaign?.id, slug)
  const saveMutation = useSaveEntity()
  const deleteMutation = useDeleteEntity()

  const [editing, setEditing] = useState(isNew)
  const [values, setValues] = useState<Row>({})
  const [gmValues, setGmValues] = useState<Row>({})
  const [activeTab, setActiveTab] = useState<'public' | 'gm'>('public')

  useEffect(() => {
    if (data) {
      setValues(data.row)
      setGmValues(data.gmRow ?? {})
    } else if (isNew) {
      setValues({})
      setGmValues({})
    }
    setActiveTab('public')
  }, [data, isNew])

  if (!isNew && isLoading) return <div className="page-loading">Loading…</div>
  if (!campaign) return null

  const handleSave = async () => {
    const savedSlug = await saveMutation.mutateAsync({
      config,
      campaignId: campaign.id,
      id: isNew ? null : (data?.row.id as string),
      values,
      gmValues: config.gmTable ? gmValues : null,
    })
    setEditing(false)
    if (isNew) {
      // refetch the new row to get its generated slug for the URL
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: created } = await (supabase.from(config.table as any) as any)
        .select('slug')
        .eq('id', savedSlug)
        .single()
      navigate(`../${(created as { slug: string } | null)?.slug ?? savedSlug}`, { replace: true })
    }
  }

  const handleDelete = async () => {
    if (!data || isNew) return
    if (!window.confirm(`Delete "${values.name as string}"? This cannot be undone.`)) return
    await deleteMutation.mutateAsync({ config, id: data.row.id as string })
    navigate('..')
  }

  return (
    <div className="entity-form-page">
      <div className="entity-form-header">
        <Link to="..">&larr; {config.labelPlural}</Link>
        {isGm && !isNew && !editing && <button onClick={() => setEditing(true)}>Edit</button>}
      </div>

      {editing ? (
        <div className="entity-form">
          <h1>{isNew ? `New ${config.label}` : (values.name as string)}</h1>
          {config.fields.map((field) => (
            <label key={field.key} className="form-field">
              <span>{field.label}</span>
              <FieldInput
                field={field}
                value={values[field.key]}
                onChange={(v) => setValues((prev) => ({ ...prev, [field.key]: v }))}
                campaignId={campaign.id}
                folder={config.table}
              />
            </label>
          ))}

          {isGm && config.gmFields && (
            <fieldset className="gm-only-fields">
              <legend>GM Only</legend>
              {config.gmFields.map((field) => (
                <label key={field.key} className="form-field">
                  <span>{field.label}</span>
                  <FieldInput
                    field={field}
                    value={gmValues[field.key]}
                    onChange={(v) => setGmValues((prev) => ({ ...prev, [field.key]: v }))}
                    campaignId={campaign.id}
                    folder={config.table}
                  />
                </label>
              ))}
            </fieldset>
          )}

          <div className="entity-form-actions">
            <button className="btn-primary" onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving…' : 'Save'}
            </button>
            <button
              onClick={() => {
                if (isNew) navigate('..')
                else {
                  setValues(data?.row ?? {})
                  setGmValues(data?.gmRow ?? {})
                  setEditing(false)
                }
              }}
            >
              Cancel
            </button>
            {!isNew && (
              <button className="btn-danger" onClick={handleDelete}>
                Delete
              </button>
            )}
          </div>
        </div>
      ) : (
        <article className="entity-view">
          {values[heroImageKey] ? (
            <img className="hero-image" src={values[heroImageKey] as string} alt="" />
          ) : null}

          <div className="entity-view-grid">
            <div className="entity-view-main">
              <h1>{values.name as string}</h1>

              {isGm && config.gmFields ? (
                <>
                  <div className="tabbar">
                    <button
                      className={activeTab === 'public' ? 'tab active' : 'tab'}
                      onClick={() => setActiveTab('public')}
                    >
                      {config.publicTabLabel ?? 'Details'}
                    </button>
                    <button className={activeTab === 'gm' ? 'tab active' : 'tab'} onClick={() => setActiveTab('gm')}>
                      GM Notes <span className="lock">&#128274;</span>
                    </button>
                  </div>

                  {activeTab === 'public' ? (
                    <div className="tab-panel active">
                      {config.fields
                        .filter(
                          (f) =>
                            f.key !== 'name' &&
                            f.key !== heroImageKey &&
                            (f.kind === 'richtext' || f.kind === 'textarea') &&
                            !(f.visibleToGmOnly && !isGm),
                        )
                        .map((field) => (
                          <FieldView key={field.key} field={field} value={values[field.key]} campaignId={campaign.id} />
                        ))}
                    </div>
                  ) : (
                    <div className="tab-panel active">
                      <span className="gm-badge">Visible to GM only</span>
                      {config.gmFields.map((field) => (
                        <FieldView key={field.key} field={field} value={gmValues[field.key]} campaignId={campaign.id} />
                      ))}
                      {config.gmTabExtra && !isNew && (
                        <config.gmTabExtra entityId={data!.row.id as string} campaignId={campaign.id} />
                      )}
                    </div>
                  )}
                </>
              ) : (
                config.fields
                  .filter(
                    (f) =>
                      f.key !== 'name' &&
                      f.key !== heroImageKey &&
                      (f.kind === 'richtext' || f.kind === 'textarea') &&
                      !(f.visibleToGmOnly && !isGm),
                  )
                  .map((field) => (
                    <FieldView key={field.key} field={field} value={values[field.key]} campaignId={campaign.id} />
                  ))
              )}
            </div>

            <aside className="entity-view-meta">
              {config.fields
                .filter(
                  (f) =>
                    f.key !== 'name' &&
                    f.key !== heroImageKey &&
                    f.kind !== 'richtext' &&
                    f.kind !== 'textarea' &&
                    !(f.visibleToGmOnly && !isGm),
                )
                .map((field) => (
                  <FieldView key={field.key} field={field} value={values[field.key]} campaignId={campaign.id} />
                ))}
            </aside>
          </div>
        </article>
      )}
    </div>
  )
}
