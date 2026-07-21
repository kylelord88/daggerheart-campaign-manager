import { useState } from 'react'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { useCampaign } from '../../context/CampaignContext'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabaseClient'
import { RichTextEditor } from '../../components/RichTextEditor'
import { htmlToExcerpt } from '../../lib/textExcerpt'
import type { PlayerNote } from '../../types/database'
import { CampaignHandoutsTab } from '../sources/CampaignHandoutsTab'
import { useSharedSourceImages } from '../sources/useSourceImages'

function useMyNotes(campaignId: string | undefined, userId: string | undefined) {
  return useQuery({
    queryKey: ['player-notes', campaignId, userId],
    enabled: Boolean(campaignId && userId),
    queryFn: async (): Promise<PlayerNote[]> => {
      const { data, error } = await supabase
        .from('player_notes')
        .select('*')
        .eq('campaign_id', campaignId!)
        .eq('user_id', userId!)
        .order('updated_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

export function PlayerNotesPage() {
  const { campaign } = useCampaign()
  const { session } = useAuth()
  const queryClient = useQueryClient()
  const userId = session?.user.id
  const { data: notes, isLoading } = useMyNotes(campaign?.id, userId)
  const { data: handouts } = useSharedSourceImages(campaign?.id)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draftTitle, setDraftTitle] = useState('')
  const [draftContent, setDraftContent] = useState('')
  const [activeTab, setActiveTab] = useState<'notes' | 'handouts'>('notes')

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['player-notes', campaign?.id, userId] })

  const openNote = (note: PlayerNote) => {
    setSelectedId(note.id)
    setDraftTitle(note.title)
    setDraftContent(note.content_html ?? '')
  }

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('player_notes')
        .insert({ campaign_id: campaign!.id, user_id: userId!, title: 'Untitled Note', content_html: '' })
        .select()
        .single()
      if (error) throw error
      return data as PlayerNote
    },
    onSuccess: (note) => {
      invalidate()
      openNote(note)
    },
  })

  const saveMutation = useMutation({
    mutationFn: async ({ id, title, content_html }: { id: string; title: string; content_html: string }) => {
      const { error } = await supabase.from('player_notes').update({ title, content_html }).eq('id', id)
      if (error) throw error
    },
    onSuccess: invalidate,
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('player_notes').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      invalidate()
      setSelectedId(null)
    },
  })

  const handleSave = () => {
    if (!selectedId) return
    saveMutation.mutate({ id: selectedId, title: draftTitle.trim() || 'Untitled Note', content_html: draftContent })
  }

  const handleDelete = () => {
    if (!selectedId) return
    if (!window.confirm('Delete this note? This cannot be undone.')) return
    deleteMutation.mutate(selectedId)
  }

  if (!campaign) return null
  if (isLoading) return <div className="page-loading">Loading…</div>

  const selectedNote = notes?.find((n) => n.id === selectedId)

  return (
    <div className="notes-page">
      <div className="entity-list-header">
        <h1>My Notes</h1>
        {activeTab === 'notes' && (
          <button className="btn-primary" onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
            + New Note
          </button>
        )}
      </div>

      <div className="tabbar">
        <button type="button" className={activeTab === 'notes' ? 'tab active' : 'tab'} onClick={() => setActiveTab('notes')}>
          Notes <span className="caps">· {notes?.length ?? 0}</span>
        </button>
        <button type="button" className={activeTab === 'handouts' ? 'tab active' : 'tab'} onClick={() => setActiveTab('handouts')}>
          Handouts <span className="caps">· {handouts?.length ?? 0}</span>
        </button>
      </div>

      {activeTab === 'notes' ? (
        <>
          <p className="misc-page-hint">Private to you — not even your GM can see these.</p>

          <div className="notes-layout">
            <ul className="notes-list">
              {!notes?.length && <p className="empty-state">No notes yet.</p>}
              {notes?.map((note) => {
                const excerpt = note.content_html ? htmlToExcerpt(note.content_html, 80) : null
                return (
                  <li key={note.id}>
                    <button
                      type="button"
                      className={`notes-list-item ${selectedId === note.id ? 'active' : ''}`}
                      onClick={() => openNote(note)}
                    >
                      <span className="notes-list-item-title">{note.title}</span>
                      {excerpt && <span className="notes-list-item-excerpt">{excerpt}</span>}
                    </button>
                  </li>
                )
              })}
            </ul>

            {selectedNote ? (
              <div className="notes-editor">
                <input
                  type="text"
                  className="notes-title-input"
                  value={draftTitle}
                  onChange={(e) => setDraftTitle(e.target.value)}
                  placeholder="Note title"
                />
                <RichTextEditor value={draftContent} onChange={setDraftContent} />
                <div className="entity-form-actions">
                  <button className="btn-primary" onClick={handleSave} disabled={saveMutation.isPending}>
                    {saveMutation.isPending ? 'Saving…' : 'Save'}
                  </button>
                  <button className="btn-danger" onClick={handleDelete}>
                    Delete
                  </button>
                </div>
              </div>
            ) : (
              <p className="empty-state notes-empty-hint">Select a note, or create a new one.</p>
            )}
          </div>
        </>
      ) : (
        <>
          <p className="misc-page-hint">Images your GM has shared with the table.</p>
          <CampaignHandoutsTab campaignId={campaign.id} />
        </>
      )}
    </div>
  )
}
