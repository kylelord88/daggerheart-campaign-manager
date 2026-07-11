import { Link } from 'react-router-dom'
import { useCampaign } from '../../context/CampaignContext'
import { useEntityList } from './useEntity'
import type { EntityConfig } from './types'

export function EntityListPage({ config }: { config: EntityConfig }) {
  const { campaign, isGm, isLoading: campaignLoading } = useCampaign()
  const { data: rows, isLoading } = useEntityList(config, campaign?.id)

  if (campaignLoading || isLoading) return <div className="page-loading">Loading…</div>

  return (
    <div className="entity-list-page">
      <div className="entity-list-header">
        <h1>{config.labelPlural}</h1>
        {isGm && (
          <Link className="btn-primary" to="new">
            + New {config.label}
          </Link>
        )}
      </div>

      {!rows?.length && <p className="empty-state">No {config.labelPlural.toLowerCase()} yet.</p>}

      <ul className="entity-grid">
        {rows?.map((row) => (
          <li key={row.id as string}>
            <Link to={row.slug as string} className="entity-card">
              <h3>{row.name as string}</h3>
              {config.listSubtitleField && row[config.listSubtitleField] ? (
                <p>{String(row[config.listSubtitleField])}</p>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
