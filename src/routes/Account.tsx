import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'

export function Account() {
  const { session } = useAuth()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      setStatus('error')
      setErrorMessage("Passwords don't match.")
      return
    }
    if (password.length < 8) {
      setStatus('error')
      setErrorMessage('Password must be at least 8 characters.')
      return
    }
    setStatus('saving')
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setStatus('error')
      setErrorMessage(error.message)
    } else {
      setStatus('saved')
      setPassword('')
      setConfirmPassword('')
    }
  }

  return (
    <div className="auth-page">
      <Link to="/campaigns" className="account-back-link">
        &larr; Campaigns
      </Link>
      <h1>Account</h1>
      <p className="account-email">{session?.user.email}</p>

      <div className="account-section">
        <h2>Set a Password</h2>
        <p className="account-help">
          Once set, you can sign in with your email and password instead of requesting a magic link each time.
        </p>
        <form onSubmit={handleSubmit} className="auth-form">
          <label>
            <span>New Password</span>
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
          <button type="submit" className="btn-primary" disabled={status === 'saving'}>
            {status === 'saving' ? 'Saving…' : 'Save Password'}
          </button>
          {status === 'saved' && <p className="account-success">Password saved — you can now sign in with it.</p>}
          {status === 'error' && <p className="error-text">{errorMessage}</p>}
        </form>
      </div>
    </div>
  )
}
