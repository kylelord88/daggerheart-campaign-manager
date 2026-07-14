import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCampaign } from '../../context/CampaignContext'
import { useEntityList, useReferenceOptions } from './useEntity'
import { ShapeIcon } from './ShapeIcon'
import { htmlToExcerpt } from '../../lib/textExcerpt'
import type { EntityConfig, FieldConfig } from './types'

type Row = Record<string, unknown>

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

function FilterSelect({
  field,
  rows,
  selected,
  onChange,
  campaignId,
}: {
  field: FieldConfig
  rows: Row[]
  selected: string
  onChange: (value: string) => void
  campaignId: string | undefined
}) {
  const { data: referenceOptions } = useReferenceOptions(field.kind === 'reference' ? field.reference : undefined, campaignId)

  const labelFor = (value: string) =>
    field.kind === 'reference' ? (referenceOptions?.find((o) => o.id === value)?.label ?? value) : value.replace(/_/g, ' ')

  const distinctValues = Array.from(
    new Set(rows.map((r) => r[field.key]).filter((v): v is string => typeof v === 'string' && v !== '')),
  ).sort((a, b) => labelFor(a).localeCompare(labelFor(b)))

  return (
    <select className="entity-filter-select" value={selected} onChange={(e) => onChange(e.target.value)}>
      <option value="">All {field.label}</option>
      {distinctValues.map((value) => (
        <option key={value} value={value}>
          {labelFor(value)}
        </option>
      ))}
    </select>
  )
}

export function EntityListPage({ config }: { config: EntityConfig }) {
  const { campaign, isGm, previewAsPlayer, isLoading: campaignLoading } = useCampaign()
  const { data: allRows, isLoading } = useEntityList(config, campaign?.id)
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string>>({})
  const [activeListTab, setActiveListTab] = useState(config.listTabs?.tabs[0]?.value)

  if (campaignLoading || isLoading) return <div className="page-loading">Loading…</div>

  // The GM's own query still returns unpublished rows regardless of preview
  // mode (RLS is keyed off the real role) — filter client-side so "View as
  // Player" actually reflects what a player would see.
  const visibleRows = previewAsPlayer ? (allRows ?? []).filter((r) => r.is_published !== false) : allRows
  const rows = config.listTabs
    ? (visibleRows ?? []).filter((r) => r[config.listTabs!.fieldKey] === activeListTab)
    : visibleRows

  const metaFields = (config.listMetaFieldKeys ?? [])
    .map((key) => config.fields.find((f) => f.key === key))
    .filter((f): f is FieldConfig => Boolean(f))
  const filterFields = (config.listFilterFieldKeys ?? [])
    .map((key) => config.fields.find((f) => f.key === key))
    .filter((f): f is FieldConfig => Boolean(f))
  const heroImageKey = config.heroImageFieldKey ?? 'hero_image_url'

  const filteredRows = (rows ?? []).filter((row) =>
    filterFields.every((f) => {
      const selected = selectedFilters[f.key]
      return !selected || row[f.key] === selected
    }),
  )

  return (
    <div className="entity-list-page">
      <div className="entity-list-header">
        <h1>
          {config.labelPlural} <span className="entity-list-count">· {filteredRows.length}</span>
        </h1>
        {isGm && (
          <Link className="btn" to="new">
            + New {config.label}
          </Link>
        )}
      </div>

      {config.listTabs && (
        <div className="tabbar">
          {config.listTabs.tabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              className={activeListTab === tab.value ? 'tab active' : 'tab'}
              onClick={() => setActiveListTab(tab.value)}
            >
              {tab.label}{' '}
              <span className="caps">· {(visibleRows ?? []).filter((r) => r[config.listTabs!.fieldKey] === tab.value).length}</span>
            </button>
          ))}
        </div>
      )}

      {filterFields.length > 0 && (
        <div className="entity-filter-bar">
          {filterFields.map((field) => (
            <FilterSelect
              key={field.key}
              field={field}
              rows={rows ?? []}
              selected={selectedFilters[field.key] ?? ''}
              onChange={(value) => setSelectedFilters((prev) => ({ ...prev, [field.key]: value }))}
              campaignId={campaign?.id}
            />
          ))}
        </div>
      )}

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

      {!rows?.length && <p className="empty-state">No {config.labelPlural.toLowerCase()} yet.</p>}
      {Boolean(rows?.length) && !filteredRows.length && (
        <p className="empty-state">No {config.labelPlural.toLowerCase()} match these filters.</p>
      )}

      <ul className="entity-grid">
        {filteredRows.map((row) => {
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
                {isGm && row.is_published === false && <span className="entity-card-badge caps">Hidden</span>}
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
                <span className="entity-card-readmore">Read More &rarr;</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
