import { Link } from 'react-router-dom'
import DOMPurify from 'dompurify'
import { useCampaign } from '../../context/CampaignContext'
import { useEntityList, useReferenceOptions } from './useEntity'
import { ShapeIcon } from './ShapeIcon'
import type { EntityConfig, FieldConfig } from './types'

function htmlToExcerpt(html: string, maxLen = 140): string {
  const div = document.createElement('div')
  div.innerHTML = DOMPurify.sanitize(html)
  const text = (div.textContent ?? '').replace(/\s+/g, ' ').trim()
  return text.length > maxLen ? text.slice(0, maxLen).trimEnd() + '…' : text
}

function ReferenceMetaValue({
  field,
  value,
  campaignId,
}: {
  field: FieldConfig
  value: string
  campaignId: string | undefined
}) {
  const { data: options } = useReferenceOptions(field.reference, campaignId)
  const label = options?.find((o) => o.id === value)?.label
  return <>{label ?? '…'}</>
}

function MetaValue({ field, value, campaignId }: { field: FieldConfig; value: unknown; campaignId: string | undefined }) {
  if (field.kind === 'reference') {
    return <ReferenceMetaValue field={field} value={value as string} campaignId={campaignId} />
  }
  return <>{String(value).replace(/_/g, ' ')}</>
}

export function EntityListPage({ config }: { config: EntityConfig }) {
  const { campaign, isGm, isLoading: campaignLoading } = useCampaign()
  const { data: rows, isLoading } = useEntityList(config, campaign?.id)

  if (campaignLoading || isLoading) return <div className="page-loading">Loading…</div>

  const metaFields = (config.listMetaFieldKeys ?? [])
    .map((key) => config.fields.find((f) => f.key === key))
    .filter((f): f is FieldConfig => Boolean(f))
  const heroImageKey = config.heroImageFieldKey ?? 'hero_image_url'

  return (
    <div className="entity-list-page">
      <div className="entity-list-header">
        <h1>
          {config.labelPlural} <span className="entity-list-count">· {rows?.length ?? 0}</span>
        </h1>
        {isGm && (
          <Link className="btn-primary" to="new">
            + New {config.label}
          </Link>
        )}
      </div>

      {!rows?.length && <p className="empty-state">No {config.labelPlural.toLowerCase()} yet.</p>}

      <ul className="entity-grid">
        {rows?.map((row) => {
          const presentMetaFields = metaFields.filter((f) => {
            const v = row[f.key]
            return v !== null && v !== undefined && v !== ''
          })
          const excerptSource = config.listExcerptField ? (row[config.listExcerptField] as string | null) : null
          const excerpt = excerptSource ? htmlToExcerpt(excerptSource) : null
          const shapeValue = config.listShapeField ? (row[config.listShapeField] as string | null) : null
          const shape = shapeValue ? config.listShapeMap?.[shapeValue] : undefined
          const thumbUrl = row[heroImageKey] as string | null

          return (
            <li key={row.id as string}>
              <Link to={row.slug as string} className="entity-card">
                {thumbUrl && <div className="entity-card-thumb" style={{ backgroundImage: `url(${thumbUrl})` }} />}
                {shape && <ShapeIcon shape={shape} className="entity-card-shape" />}
                <h3>{row.name as string}</h3>
                {presentMetaFields.length > 0 && (
                  <p className="entity-card-meta caps">
                    {presentMetaFields.map((field, i) => (
                      <span key={field.key}>
                        {i > 0 && ' · '}
                        <MetaValue field={field} value={row[field.key]} campaignId={campaign?.id} />
                      </span>
                    ))}
                  </p>
                )}
                {excerpt && <p className="entity-card-excerpt">{excerpt}</p>}
              </Link>
            </li>
          )
        })}
      </ul>

      {config.listShapeMap && (
        <div className="entity-shape-legend">
          {Object.entries(config.listShapeMap)
            .filter((entry, i, arr) => arr.findIndex(([, s]) => s === entry[1]) === i)
            .map(([value, shape]) => (
              <span key={value} className="entity-shape-legend-item caps">
                <ShapeIcon shape={shape} />
                {value.replace(/_/g, ' ')}
              </span>
            ))}
        </div>
      )}
    </div>
  )
}
