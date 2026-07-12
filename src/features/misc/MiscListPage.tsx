import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useCampaign } from '../../context/CampaignContext'
import { useMiscCategories, useMiscEntries, useCreateMiscCategory } from './useMiscData'
import { htmlToExcerpt } from '../../lib/textExcerpt'

export function MiscListPage() {
  const { campaign, isGm, isLoading: campaignLoading } = useCampaign()
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const { data: categories, isLoading: categoriesLoading } = useMiscCategories(campaign?.id)
  const { data: entries, isLoading: entriesLoading } = useMiscEntries(campaign?.id, selectedCategoryId)
  const createCategory = useCreateMiscCategory()
  const [newCategoryName, setNewCategoryName] = useState('')
  const [addingCategory, setAddingCategory] = useState(false)

  if (campaignLoading || categoriesLoading) return <div className="page-loading">Loading…</div>
  if (!campaign) return null

  const handleAddCategory = async (e: FormEvent) => {
    e.preventDefault()
    if (!newCategoryName.trim()) return
    await createCategory.mutateAsync({ campaignId: campaign.id, name: newCategoryName.trim() })
    setNewCategoryName('')
    setAddingCategory(false)
  }

  return (
    <div className="entity-list-page">
      <div className="entity-list-header">
        <h1>
          Community Content <span className="entity-list-count">· {entries?.length ?? 0}</span>
        </h1>
        {categories && categories.length > 0 && (
          <Link className="btn-primary" to="new">
            + New Entry
          </Link>
        )}
      </div>

      <p className="misc-page-hint">
        World flavor anyone can add to — cocktail recipes, local wildlife, in-world trivia, and other background
        details.
      </p>

      {!categories?.length ? (
        <p className="empty-state">
          No categories yet.{' '}
          {isGm ? 'Add one below to let players start contributing.' : 'Ask your GM to add one to get started.'}
        </p>
      ) : (
        <div className="entity-chip-row">
          <button type="button" className={`entity-chip ${selectedCategoryId === null ? 'active' : ''}`} onClick={() => setSelectedCategoryId(null)}>
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              className={`entity-chip ${selectedCategoryId === cat.id ? 'active' : ''}`}
              onClick={() => setSelectedCategoryId(cat.id)}
            >
              {cat.icon ? `${cat.icon} ` : ''}
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {isGm &&
        (addingCategory ? (
          <form onSubmit={handleAddCategory} className="misc-add-category-form">
            <input
              type="text"
              autoFocus
              placeholder="New category name"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
            />
            <button type="submit" className="btn-primary" disabled={createCategory.isPending}>
              Add
            </button>
            <button type="button" onClick={() => setAddingCategory(false)}>
              Cancel
            </button>
          </form>
        ) : (
          <button type="button" className="misc-add-category-link" onClick={() => setAddingCategory(true)}>
            + Add category
          </button>
        ))}

      {Boolean(categories?.length) &&
        (entriesLoading ? (
          <div className="page-loading">Loading…</div>
        ) : (
          <>
            {!entries?.length && <p className="empty-state">Nothing here yet — be the first to add something.</p>}
            <ul className="entity-grid">
              {entries?.map((entry) => {
                const excerpt = entry.content_html ? htmlToExcerpt(entry.content_html) : entry.summary
                return (
                  <li key={entry.id}>
                    <Link to={entry.slug} className="entity-card">
                      {entry.hero_image_url && (
                        <div className="entity-card-thumb" style={{ backgroundImage: `url(${entry.hero_image_url})` }} />
                      )}
                      <h3>{entry.name}</h3>
                      {excerpt && <p className="entity-card-excerpt">{excerpt}</p>}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </>
        ))}
    </div>
  )
}
