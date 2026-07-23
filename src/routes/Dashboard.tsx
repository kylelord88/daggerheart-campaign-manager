import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useCampaign } from '../context/CampaignContext'
import { ImageUploadField } from '../features/entities/ImageUploadField'
import { useActiveQuests, useCampaignSummary, useParty } from '../features/dashboard/useDashboardData'
import { CurrentSessionSection } from '../features/dashboard/CurrentSessionSection'
import { LastRecapLink } from '../features/dashboard/LastRecapLink'
import { SessionControlPanel } from '../features/dashboard/SessionControlPanel'
import { useCurrentSession } from '../features/dashboard/useCurrentSession'
import { supabase } from '../lib/supabaseClient'

const QUEST_TYPE_ORDER = ['main', 'side', 'personal'] as const
const QUEST_TYPE_LABELS: Record<string, string> = { main: 'Main', side: 'Side', personal: 'Personal' }

export function Dashboard() {
  const { campaign, isGm, previewAsPlayer } = useCampaign()
  const queryClient = useQueryClient()
  const { data: activeQuests } = useActiveQuests(campaign?.id, previewAsPlayer)
  const { data: summary } = useCampaignSummary(campaign?.id)
  const { data: party } = useParty(campaign?.id, previewAsPlayer, isGm)
  const { data: currentSession } = useCurrentSession(campaign?.id)

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
            <div className="dashboard-hero-kicker caps">Campaign</div>
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

      <div className="dashboard-grid">
        <div>
          <LastRecapLink campaignId={campaign.id} />
          <CurrentSessionSection campaignId={campaign.id} />
          {isGm && <SessionControlPanel campaignId={campaign.id} session={currentSession ?? null} />}
        </div>

        <aside>
          <div className="dashboard-side-card">
            <h3 className="caps">Active Quests</h3>
            {!activeQuests?.length && <p className="empty-state">No active quests.</p>}
            {QUEST_TYPE_ORDER.map((type) => {
              const items = activeQuests?.filter((q) => q.quest_type === type) ?? []
              if (!items.length) return null
              return (
                <div key={type} className="dashboard-quest-group">
                  <div className="dashboard-quest-group-label caps">{QUEST_TYPE_LABELS[type]}</div>
                  {items.map((q) => (
                    <Link key={q.id} to={`quests/${q.slug}`} className="dashboard-quicklink">
                      <span>{q.name}</span>
                    </Link>
                  ))}
                </div>
              )
            })}
          </div>
          <div className="dashboard-side-card">
            <h3 className="caps">Party</h3>
            {!party?.length && <p className="empty-state">No player characters yet.</p>}
            {party?.map((pc) => (
              <Link key={pc.id} to={`characters/${pc.slug}`} className="dashboard-quicklink dashboard-quicklink-party">
                <span>{pc.name}</span>
                {pc.playedBy && <span className="dashboard-quicklink-caption">Played by {pc.playedBy}</span>}
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
              <span className="caps">GM</span>
              <span>{summary?.gmLabel ?? '—'}</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
