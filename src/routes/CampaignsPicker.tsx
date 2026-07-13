import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function CampaignsPicker() {
  const { session } = useAuth()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [showCreate, setShowCreate] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [createError, setCreateError] = useState<string | null>(null)

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ['my-campaigns', session?.user.id],
    enabled: Boolean(session),
    queryFn: async () => {
      // Our hand-maintained Database type has no Relationships metadata, so
      // postgrest-js can't type-check this embedded select — cast and narrow
      // manually below. (Real `supabase gen types` output resolves this.)
      const { data, error } = await (supabase.from('campaign_members') as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .select('role, campaigns(*)')
        .eq('user_id', session!.user.id)
      if (error) throw error
      return data as Array<{ role: string; campaigns: { slug: string; name: string; description: string | null } }>
    },
  })

  const handleSignOut = () => supabase.auth.signOut()

  const createMutation = useMutation({
    mutationFn: async () => {
      const baseSlug = slugify(name) || 'campaign'
      let slug = baseSlug
      let campaignId: string | null = null

      // Slugs are globally unique; retry with a numeric suffix on conflict
      // rather than making the GM think up a URL-safe name up front.
      for (let attempt = 1; attempt <= 20; attempt++) {
        const { data, error } = await supabase
          .from('campaigns')
          .insert({ slug, name: name.trim(), description: description.trim() || null, created_by: session!.user.id })
          .select('id')
          .single()
        if (!error) {
          campaignId = data.id
          break
        }
        if (error.code !== '23505') throw error
        slug = `${baseSlug}-${attempt + 1}`
      }
      if (!campaignId) throw new Error('Could not generate a unique URL for this campaign name.')

      const { error: memberError } = await supabase
        .from('campaign_members')
        .insert({ campaign_id: campaignId, user_id: session!.user.id, role: 'gm' })
      if (memberError) throw memberError

      return slug
    },
    onSuccess: (slug) => {
      queryClient.invalidateQueries({ queryKey: ['my-campaigns', session?.user.id] })
      navigate(`/c/${slug}`)
    },
    onError: (err: Error) => setCreateError(err.message),
  })

  const handleCreate = (e: FormEvent) => {
    e.preventDefault()
    setCreateError(null)
    createMutation.mutate()
  }

  if (isLoading) return <div className="page-loading">Loading…</div>

  return (
    <div className="campaigns-picker">
      <div className="campaigns-picker-header">
        <h1>Your Campaigns</h1>
        <div className="campaigns-picker-actions">
          <button type="button" className="btn" onClick={() => setShowCreate((v) => !v)}>
            {showCreate ? 'Cancel' : '+ New Campaign'}
          </button>
          <Link to="/account">Settings</Link>
          <button onClick={handleSignOut}>Sign out</button>
        </div>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="auth-form campaign-create-form">
          <label>
            <span>Campaign name</span>
            <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="The Witherwild" />
          </label>
          <label>
            <span>Description (optional)</span>
            <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>
          <button type="submit" className="btn-primary" disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Creating…' : 'Create Campaign'}
          </button>
          {createError && <p className="error-text">{createError}</p>}
        </form>
      )}

      {!campaigns?.length && <p className="empty-state">You're not a member of any campaigns yet.</p>}

      <ul className="entity-grid">
        {campaigns?.map((m) => {
          const campaign = m.campaigns
          return (
            <li key={campaign.slug}>
              <Link to={`/c/${campaign.slug}`} className="entity-card">
                <h3>{campaign.name}</h3>
                <p>{m.role === 'gm' ? 'Game Master' : 'Player'}</p>
                {campaign.description && <p>{campaign.description}</p>}
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
