import { Link } from 'react-router-dom'
import { useCampaign } from '../../context/CampaignContext'
import { useEntityList, usePlayerOptions } from '../entities/useEntity'
import { QUEST_CONFIG } from '../entities/entityConfigs'
import { htmlToExcerpt } from '../../lib/textExcerpt'

type Row = Record<string, unknown>

const TYPE_ORDER: Record<string, number> = { main: 0, side: 1, personal: 2 }

function sortQuests(rows: Row[]) {
  return [...rows].sort((a, b) => {
    const typeDiff = (TYPE_ORDER[a.quest_type as string] ?? 99) - (TYPE_ORDER[b.quest_type as string] ?? 99)
    if (typeDiff !== 0) return typeDiff
    return (a.name as string).localeCompare(b.name as string)
  })
}

function QuestCard({ quest, isGm, assigneeLabel }: { quest: Row; isGm: boolean; assigneeLabel: string | null }) {
  const thumbUrl = quest.hero_image_url as string | null
  const excerpt = quest.hook ? htmlToExcerpt(quest.hook as string) : null

  return (
    <li>
      <Link to={quest.slug as string} className="entity-card">
        {thumbUrl && <div className="entity-card-thumb" style={{ backgroundImage: `url(${thumbUrl})` }} />}
        {isGm && quest.is_published === false && <span className="entity-card-badge caps">Hidden</span>}
        <h3>{quest.name as string}</h3>
        <p className="entity-card-meta caps">
          {(quest.quest_type as string)?.replace(/_/g, ' ')}
          {assigneeLabel && ` · Assigned to ${assigneeLabel}`}
        </p>
        {excerpt && <p className="entity-card-excerpt">{excerpt}</p>}
        <span className="entity-card-readmore">Read More &rarr;</span>
      </Link>
    </li>
  )
}

function QuestSection({
  title,
  quests,
  isGm,
  assigneeFor,
}: {
  title: string
  quests: Row[]
  isGm: boolean
  assigneeFor: (playerId: string) => string | null
}) {
  return (
    <div className="subsection">
      <div className="subsection-head">
        <h2>
          {title} <span className="entity-list-count">· {quests.length}</span>
        </h2>
      </div>
      {!quests.length && <p className="empty-state">None yet.</p>}
      {Boolean(quests.length) && (
        <ul className="entity-grid">
          {sortQuests(quests).map((q) => (
            <QuestCard
              key={q.id as string}
              quest={q}
              isGm={isGm}
              assigneeLabel={
                q.quest_type === 'personal' && q.assigned_player_id ? assigneeFor(q.assigned_player_id as string) : null
              }
            />
          ))}
        </ul>
      )}
    </div>
  )
}

export function QuestListPage() {
  const { campaign, isGm, previewAsPlayer, isLoading: campaignLoading } = useCampaign()
  const { data: rows, isLoading } = useEntityList(QUEST_CONFIG, campaign?.id)
  const { data: players } = usePlayerOptions(campaign?.id)

  if (campaignLoading || isLoading) return <div className="page-loading">Loading…</div>

  const visibleRows = previewAsPlayer ? (rows ?? []).filter((r) => r.is_published !== false) : (rows ?? [])
  const active = visibleRows.filter((r) => r.status === 'active')
  const completed = visibleRows.filter((r) => r.status !== 'active')

  const assigneeFor = (playerId: string) => players?.find((p) => p.id === playerId)?.label ?? null

  return (
    <div className="entity-list-page">
      <div className="entity-list-header">
        <h1>
          Quests <span className="entity-list-count">· {visibleRows.length}</span>
        </h1>
        {isGm && (
          <Link className="btn" to="new">
            + New Quest
          </Link>
        )}
      </div>

      {!visibleRows.length && <p className="empty-state">No quests yet.</p>}

      {Boolean(visibleRows.length) && (
        <>
          <QuestSection title="Active Quests" quests={active} isGm={isGm} assigneeFor={assigneeFor} />
          <QuestSection title="Completed" quests={completed} isGm={isGm} assigneeFor={assigneeFor} />
        </>
      )}
    </div>
  )
}
