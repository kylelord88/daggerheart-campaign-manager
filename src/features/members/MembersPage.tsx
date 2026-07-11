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
      const { error } = await supabase.rpc('invite_campaign_member', {
        p_campaign_id: campaign!.id,
        p_email: email.trim(),
        p_role: role,
      })
      if (error) throw error
    },
    onSuccess: () => {
      setFeedback(`Added ${email.trim()} — they'll get access immediately if they already have an account, or as soon as they sign up.`)
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
            <span className="member-email">{m.email}</span>
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
