import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useCampaign } from '../context/CampaignContext'
import { ImageUploadField } from '../features/entities/ImageUploadField'
import { ActivityGlyph } from '../features/dashboard/ActivityGlyph'
import { useDashboardStats, useRecentActivity, useActiveQuests, useCampaignSummary } from '../features/dashboard/useDashboardData'
import { supabase } from '../lib/supabaseClient'

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diffMs / 86_400_000)
  if (days <= 0) return 'today'
  if (days === 1) return '1 day ago'
  if (days < 7) return `${days} days ago`
  const weeks = Math.floor(days / 7)
  if (weeks === 1) return '1 week ago'
  if (weeks < 5) return `${weeks} weeks ago`
  const months = Math.floor(days / 30)
  return months <= 1 ? '1 month ago' : `${months} months ago`
}

export function Dashboard() {
  const { campaign, isGm } = useCampaign()
  const queryClient = useQueryClient()
  const { data: stats } = useDashboardStats(campaign?.id)
  const { data: activity } = useRecentActivity(campaign?.id)
  const { data: activeQuests } = useActiveQuests(campaign?.id)
  const { data: summary } = useCampaignSummary(campaign?.id)

  const [editingDescription, setEditingDescription] = useState(false)
  const [descriptionDraft, setDescriptionDraft] = useState('')
  const [savingDescription, setSavingDescription] = useState(false)

  if (!campaign) return null

  const handleCoverChange = async (url: string | null) => {
    const { error } = await supabase.from('campaigns').update({ cover_image_url: url }).eq('id', campaign.id)
    if (error) throw error
    queryClient.invalidateQueries({ queryKey: ['campaign-membership'] })
  }

  const startEditingDescription = () => {
    setDescriptionDraft(campaign.description ?? '')
    setEditingDescription(true)
  }

  const handleSaveDescription = async () => {
    setSavingDescription(true)
    try {
      const { error } = await supabase
        .from('campaigns')
        .update({ description: descriptionDraft.trim() || null })
        .eq('id', campaign.id)
      if (error) throw error
      queryClient.invalidateQueries({ queryKey: ['campaign-membership'] })
      setEditingDescription(false)
    } finally {
      setSavingDescription(false)
    }
  }

  const descriptionEditor = (
    <div className="dashboard-hero-editor">
      <textarea
        value={descriptionDraft}
        onChange={(e) => setDescriptionDraft(e.target.value)}
        rows={3}
        placeholder="A short line describing this campaign, shown here on the dashboard…"
      />
      <div className="dashboard-hero-editor-actions">
        <button type="button" className="btn-primary" onClick={handleSaveDescription} disabled={savingDescription}>
          {savingDescription ? 'Saving…' : 'Save'}
        </button>
        <button type="button" onClick={() => setEditingDescription(false)}>
          Cancel
        </button>
      </div>
    </div>
  )

  return (
    <div className="dashboard-page">
      {campaign.cover_image_url ? (
        <div className="dashboard-hero" style={{ backgroundImage: `url(${campaign.cover_image_url})` }}>
          <div className="dashboard-hero-scrim" />
          <div className="dashboard-hero-content">
            <div className="dashboard-hero-kicker caps">Campaign Cover</div>
            <h1>{campaign.name}</h1>
            {editingDescription ? (
              descriptionEditor
            ) : (
              <div className="dashboard-hero-description-row">
                {campaign.description && <p>{campaign.description}</p>}
                {isGm && (
                  <button type="button" className="dashboard-hero-edit-btn" onClick={startEditingDescription}>
                    Edit
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          <h1>{campaign.name}</h1>
          {editingDescription ? (
            descriptionEditor
          ) : (
            <div className="dashboard-lede-row">
              {campaign.description && <p className="dashboard-lede">{campaign.description}</p>}
              {isGm && (
                <button type="button" onClick={startEditingDescription}>
                  Edit description
                </button>
              )}
            </div>
          )}
        </>
      )}

      {isGm && (
        <div className="dashboard-cover-upload">
          <ImageUploadField
            value={campaign.cover_image_url}
            onChange={handleCoverChange}
            campaignId={campaign.id}
            folder="campaigns"
            showPreview={false}
          />
        </div>
      )}

      {stats && (
        <div className="dashboard-stats">
          <Link to="locations" className="dashboard-stat">
            <div className="dashboard-stat-n">{stats.locations}</div>
            <div className="dashboard-stat-l caps">Locations</div>
          </Link>
          <Link to="characters" className="dashboard-stat">
            <div className="dashboard-stat-n">{stats.characters}</div>
            <div className="dashboard-stat-l caps">Characters</div>
          </Link>
          <Link to="quests" className="dashboard-stat">
            <div className="dashboard-stat-n">{stats.quests}</div>
            <div className="dashboard-stat-l caps">Quests</div>
          </Link>
          <Link to="factions" className="dashboard-stat">
            <div className="dashboard-stat-n">{stats.factions}</div>
            <div className="dashboard-stat-l caps">Factions</div>
          </Link>
        </div>
      )}

      <div className="dashboard-grid">
        <div>
          <h2 className="dashboard-section-title caps">Recently Updated</h2>
          {!activity?.length && <p className="empty-state">Nothing yet.</p>}
          <div className="dashboard-feed">
            {activity?.map((item) => (
              <Link key={`${item.kind}-${item.slug}`} to={`${item.path}/${item.slug}`} className="dashboard-feed-item">
                <ActivityGlyph kind={item.kind} />
                <div>
                  <div className="dashboard-feed-kind caps">{item.kindLabel}</div>
                  <div className="dashboard-feed-name">{item.name}</div>
                  {item.excerpt && <div className="dashboard-feed-excerpt">{item.excerpt}</div>}
                </div>
                <div className="dashboard-feed-when">{timeAgo(item.updatedAt)}</div>
              </Link>
            ))}
          </div>
        </div>

        <aside>
          <div className="dashboard-side-card">
            <h3 className="caps">Active Quests</h3>
            {!activeQuests?.length && <p className="empty-state">No active quests.</p>}
            {activeQuests?.map((q) => (
              <Link key={q.id} to={`quests/${q.slug}`} className="dashboard-quicklink">
                <span>{q.name}</span>
                <span className="caps">{q.quest_type}</span>
              </Link>
            ))}
          </div>
          <div className="dashboard-side-card">
            <h3 className="caps">Campaign</h3>
            <div className="dashboard-quicklink">
              <span className="caps">Name</span>
              <span>{campaign.name}</span>
            </div>
            <div className="dashboard-quicklink">
              <span className="caps">Sessions logged</span>
              <span>{summary?.sessionsLogged ?? '—'}</span>
            </div>
            <div className="dashboard-quicklink">
              <span className="caps">GM</span>
              <span>{summary?.gmLabel ?? '—'}</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
