import { useEffect, useState, type FormEvent } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { setPendingInviteLink, clearPendingInviteLink } from '../lib/pendingInvite'

function readableError(error: { message: string } | null): string | null {
  if (!error) return null
  return error.message && error.message.trim() !== '{}' ? error.message : 'Something went wrong. Please try again.'
}

export function JoinPage() {
  const { linkId } = useParams<{ linkId: string }>()
  const { session, loading } = useAuth()
  const navigate = useNavigate()
  const [redeemError, setRedeemError] = useState<string | null>(null)

  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [signupStatus, setSignupStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [signupError, setSignupError] = useState('')

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
      clearPendingInviteLink()
      navigate(slug ? `/c/${slug}` : '/campaigns', { replace: true })
    },
    onError: (err: Error) => setRedeemError(err.message),
  })

  useEffect(() => {
    if (!linkId || loading) return
    if (!session) {
      setPendingInviteLink(linkId)
      return
    }
    if (redeemMutation.isIdle) redeemMutation.mutate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkId, loading, session])

  const handleSignup = async (e: FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      setSignupStatus('error')
      setSignupError("Passwords don't match.")
      return
    }
    if (password.length < 8) {
      setSignupStatus('error')
      setSignupError('Password must be at least 8 characters.')
      return
    }
    setSignupStatus('sending')
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin + window.location.pathname,
        data: { invite_link_id: linkId, display_name: displayName.trim() || null },
      },
    })
    if (error) {
      setSignupStatus('error')
      setSignupError(readableError(error) ?? '')
    } else {
      setSignupStatus('sent')
    }
  }

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
    <div className="join-page">
      {info.campaign_cover_image_url ? (
        <div className="dashboard-hero" style={{ backgroundImage: `url(${info.campaign_cover_image_url})` }}>
          <div className="dashboard-hero-scrim" />
          <div className="dashboard-hero-content">
            <div className="dashboard-hero-kicker caps">Campaign</div>
            <h1>{info.campaign_name}</h1>
            {info.campaign_description && <p>{info.campaign_description}</p>}
          </div>
        </div>
      ) : (
        <div className="join-hero-fallback">
          <h1>{info.campaign_name}</h1>
          {info.campaign_description && <p>{info.campaign_description}</p>}
        </div>
      )}

      <div className="join-invite-card">
        <p>
          You're invited to join as a <strong>{info.role}</strong>.
        </p>

        {signupStatus === 'sent' ? (
          <p>Check your email to confirm your account — once confirmed, sign in and you'll already be in the campaign.</p>
        ) : (
          <form onSubmit={handleSignup} className="auth-form">
            <label>
              <span>Display Name</span>
              <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Optional" />
            </label>
            <label>
              <span>Email</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </label>
            <label>
              <span>Password</span>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
              />
            </label>
            <label>
              <span>Confirm Password</span>
              <input
                type="password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </label>
            <button type="submit" className="btn-primary" disabled={signupStatus === 'sending'}>
              {signupStatus === 'sending' ? 'Joining…' : 'Join Game'}
            </button>
            {signupStatus === 'error' && <p className="error-text">{signupError}</p>}
          </form>
        )}

        <p className="auth-hint join-existing-account">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
