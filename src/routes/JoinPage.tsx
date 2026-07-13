import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'

const PENDING_INVITE_KEY = 'pendingInviteLink'

export function JoinPage() {
  const { linkId } = useParams<{ linkId: string }>()
  const { session, loading } = useAuth()
  const navigate = useNavigate()
  const [redeemError, setRedeemError] = useState<string | null>(null)

  const infoQuery = useQuery({
    queryKey: ['invite-link-info', linkId],
    enabled: Boolean(linkId),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_invite_link_info', { p_link_id: linkId! })
      if (error) throw error
      return data?.[0] ?? null
    },
  })

  const redeemMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('redeem_campaign_invite_link', { p_link_id: linkId! })
      if (error) throw error
      return data?.[0]?.campaign_slug as string | undefined
    },
    onSuccess: (slug) => {
      localStorage.removeItem(PENDING_INVITE_KEY)
      navigate(slug ? `/c/${slug}` : '/campaigns', { replace: true })
    },
    onError: (err: Error) => setRedeemError(err.message),
  })

  useEffect(() => {
    if (!linkId || loading) return
    if (!session) {
      localStorage.setItem(PENDING_INVITE_KEY, linkId)
      return
    }
    if (redeemMutation.isIdle) redeemMutation.mutate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkId, loading, session])

  if (loading || infoQuery.isLoading) return <div className="page-loading">Loading…</div>

  if (infoQuery.isError || !infoQuery.data) {
    return (
      <div className="auth-page">
        <h1>Invite link</h1>
        <p>This invite link doesn't exist.</p>
        <Link to="/login">Back to sign in</Link>
      </div>
    )
  }

  const info = infoQuery.data

  if (!info.valid) {
    return (
      <div className="auth-page">
        <h1>Invite link</h1>
        <p>This invite link has been revoked. Ask your GM for a new one.</p>
        <Link to="/login">Back to sign in</Link>
      </div>
    )
  }

  if (session) {
    return (
      <div className="auth-page">
        <h1>Joining {info.campaign_name}…</h1>
        {redeemError && <p className="error-text">{redeemError}</p>}
      </div>
    )
  }

  return (
    <div className="auth-page">
      <h1>You're invited</h1>
      <p>
        Join <strong>{info.campaign_name}</strong> as a <strong>{info.role}</strong>.
      </p>
      <p className="auth-hint">Sign in or create an account to accept — you'll land right in the campaign.</p>
      <Link to="/login" className="btn-primary">
        Continue
      </Link>
    </div>
  )
}
