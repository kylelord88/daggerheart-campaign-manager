import { useState, type FormEvent } from 'react'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { supabase } from '../../lib/supabaseClient'
import { useCampaign } from '../../context/CampaignContext'
import type { MemberRole } from '../../types/database'

export function MembersPage() {
  const { campaign } = useCampaign()
  const queryClient = useQueryClient()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<MemberRole>('player')
  const [feedback, setFeedback] = useState<string | null>(null)

  const membersQuery = useQuery({
    queryKey: ['campaign-members', campaign?.id],
    enabled: Boolean(campaign),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_campaign_members', { p_campaign_id: campaign!.id })
      if (error) throw error
      return data
    },
  })

  const invitesQuery = useQuery({
    queryKey: ['campaign-invites', campaign?.id],
    enabled: Boolean(campaign),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_campaign_invites', { p_campaign_id: campaign!.id })
      if (error) throw error
      return data
    },
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['campaign-members', campaign?.id] })
    queryClient.invalidateQueries({ queryKey: ['campaign-invites', campaign?.id] })
  }

  const inviteMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke<{
        emailSent?: boolean
        reason?: string
        error?: string
      }>('invite-member', {
        body: { campaignId: campaign!.id, email: email.trim(), role },
      })
      if (error) {
        // FunctionsHttpError's .message is a generic "non-2xx status code" -
        // the actual reason is in the response body, which the SDK doesn't
        // parse for us.
        const context = (error as { context?: Response }).context
        if (context && typeof context.json === 'function') {
          try {
            const body = await context.json()
            throw new Error(body?.error ?? error.message)
          } catch {
            throw error
          }
        }
        throw error
      }
      if (data?.error) throw new Error(data.error)
      return data
    },
    onSuccess: (data) => {
      const trimmedEmail = email.trim()
      if (data?.emailSent) {
        setFeedback(`Invite email sent to ${trimmedEmail}.`)
      } else if (data?.reason === 'already_has_account') {
        setFeedback(`✓ Access granted immediately — ${trimmedEmail} already has an account, so no email is needed. They can log in right now.`)
      } else {
        setFeedback(`Added ${trimmedEmail}, but the invite email failed to send — let them know to sign in directly.`)
      }
      setEmail('')
      invalidate()
    },
    onError: (err: Error) => setFeedback(`Failed to add: ${err.message}`),
  })

  const removeMemberMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('campaign_members').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: invalidate,
  })

  const updateRoleMutation = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: MemberRole }) => {
      const { error } = await supabase.from('campaign_members').update({ role }).eq('id', id)
      if (error) throw error
    },
    onSuccess: invalidate,
  })

  const cancelInviteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('campaign_invites').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: invalidate,
  })

  const handleInvite = (e: FormEvent) => {
    e.preventDefault()
    setFeedback(null)
    inviteMutation.mutate()
  }

  if (!campaign) return null

  return (
    <div className="members-page">
      <h1>Members</h1>

      <form onSubmit={handleInvite} className="invite-form">
        <input
          type="email"
          required
          placeholder="player@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <select value={role} onChange={(e) => setRole(e.target.value as MemberRole)}>
          <option value="player">Player</option>
          <option value="gm">GM</option>
        </select>
        <button type="submit" className="btn-primary" disabled={inviteMutation.isPending}>
          {inviteMutation.isPending ? 'Adding…' : '+ Add'}
        </button>
      </form>
      {feedback && <p className="invite-feedback">{feedback}</p>}

      <h2>Current members</h2>
      <ul className="members-list">
        {membersQuery.data?.map((m) => (
          <li key={m.id}>
            <span className="member-email">
              {m.display_name || m.email}
              {m.display_name && <span className="member-email-sub">{m.email}</span>}
            </span>
            <select
              value={m.role}
              onChange={(e) => updateRoleMutation.mutate({ id: m.id, role: e.target.value as MemberRole })}
            >
              <option value="player">Player</option>
              <option value="gm">GM</option>
            </select>
            <button onClick={() => removeMemberMutation.mutate(m.id)} className="btn-danger">
              Remove
            </button>
          </li>
        ))}
      </ul>

      {Boolean(invitesQuery.data?.length) && (
        <>
          <h2>Pending invites</h2>
          <p className="empty-state">Not signed up yet — access will apply automatically once they do.</p>
          <ul className="members-list">
            {invitesQuery.data?.map((inv) => (
              <li key={inv.id}>
                <span className="member-email">{inv.email}</span>
                <span className="tag">{inv.role}</span>
                <button onClick={() => cancelInviteMutation.mutate(inv.id)} className="btn-danger">
                  Cancel
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
