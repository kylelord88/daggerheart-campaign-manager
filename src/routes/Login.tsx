import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'

export function Login() {
  const { session, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  if (loading) return <div className="page-loading">Loading…</div>
  if (session) return <Navigate to="/campaigns" replace />

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setStatus('sending')
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin + window.location.pathname },
    })
    if (error) {
      setStatus('error')
      // Supabase occasionally returns a malformed/empty error body (e.g. on an
      // SMTP-level send failure), which surfaces as an uninformative "{}" or
      // blank message — fall back to something a user can actually act on.
      const message = error.message && error.message.trim() !== '{}' ? error.message : 'Failed to send the magic link. Please try again in a moment.'
      setErrorMessage(message)
    } else {
      setStatus('sent')
    }
  }

  return (
    <div className="auth-page">
      <h1>Daggerheart Campaign Manager</h1>
      {status === 'sent' ? (
        <p>Check your email for a sign-in link.</p>
      ) : (
        <form onSubmit={handleSubmit} className="auth-form">
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
        </form>
      )}
    </div>
  )
}
