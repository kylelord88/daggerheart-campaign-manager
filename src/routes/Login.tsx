import { useState, type FormEvent } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { postAuthRedirectPath } from '../lib/pendingInvite'

type Mode = 'magic-link' | 'password'

function readableError(error: { message: string } | null): string | null {
  if (!error) return null
  // Supabase occasionally returns a malformed/empty error body (e.g. on an
  // SMTP-level send failure), which surfaces as an uninformative "{}" or
  // blank message — fall back to something a user can actually act on.
  return error.message && error.message.trim() !== '{}' ? error.message : 'Something went wrong. Please try again.'
}

export function Login() {
  const { session, loading } = useAuth()
  const [searchParams] = useSearchParams()
  // Coming from an invite link: default to magic-link, since a brand-new
  // player has no password yet (signInWithOtp creates their account on
  // first use — that's this app's de facto sign-up flow).
  const isJoinIntent = searchParams.get('intent') === 'join'
  const [mode, setMode] = useState<Mode>(isJoinIntent ? 'magic-link' : 'password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  if (loading) return <div className="page-loading">Loading…</div>
  if (session) return <Navigate to={postAuthRedirectPath()} replace />

  const handleMagicLinkSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setStatus('sending')
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin + window.location.pathname },
    })
    if (error) {
      setStatus('error')
      setErrorMessage(readableError(error) ?? '')
    } else {
      setStatus('sent')
    }
  }

  const handlePasswordSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setStatus('sending')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setStatus('error')
      setErrorMessage(readableError(error) ?? '')
    }
    // On success, the AuthContext's onAuthStateChange picks up the new
    // session and the redirect above takes over — nothing else to do here.
  }

  const switchMode = (next: Mode) => {
    setMode(next)
    setStatus('idle')
    setErrorMessage('')
    setPassword('')
  }

  return (
    <div className="auth-page">
      <h1>Daggerheart Campaign Manager</h1>
      {isJoinIntent && mode === 'magic-link' && status !== 'sent' && (
        <p className="auth-hint">Enter your email and we'll send you a link — click it to finish joining.</p>
      )}

      {mode === 'magic-link' ? (
        status === 'sent' ? (
          <p>{isJoinIntent ? "Check your email — clicking the link will finish joining." : 'Check your email for a sign-in link.'}</p>
        ) : (
          <form onSubmit={handleMagicLinkSubmit} className="auth-form">
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
            <button type="submit" className="btn-primary" disabled={status === 'sending'}>
              {status === 'sending' ? 'Sending…' : 'Send magic link'}
            </button>
            {status === 'error' && <p className="error-text">{errorMessage}</p>}
            <button type="button" className="btn-link" onClick={() => switchMode('password')}>
              Back to password sign-in
            </button>
          </form>
        )
      ) : (
        <form onSubmit={handlePasswordSubmit} className="auth-form">
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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <button type="submit" className="btn-primary" disabled={status === 'sending'}>
            {status === 'sending' ? 'Signing in…' : 'Sign In'}
          </button>
          {status === 'error' && <p className="error-text">{errorMessage}</p>}
          <button type="button" className="btn-link" onClick={() => switchMode('magic-link')}>
            Forgot your password? Use a magic link instead
          </button>
        </form>
      )}
    </div>
  )
}
