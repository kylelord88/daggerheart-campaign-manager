import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { useSetDisplayName, useCompleteOnboarding } from '../features/account/useProfile'

export function Onboarding() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const setDisplayNameMutation = useSetDisplayName()
  const completeOnboarding = useCompleteOnboarding()

  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [status, setStatus] = useState<'idle' | 'saving' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (password || confirmPassword) {
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
    }

    setStatus('saving')
    try {
      if (displayName.trim()) {
        await setDisplayNameMutation.mutateAsync(displayName.trim())
      }
      if (password) {
        const { error } = await supabase.auth.updateUser({ password })
        if (error) throw error
      }
      await completeOnboarding.mutateAsync()
      navigate('/campaigns', { replace: true })
    } catch (err) {
      setStatus('error')
      setErrorMessage(err instanceof Error ? err.message : 'Something went wrong — please try again.')
    }
  }

  const handleSkip = async () => {
    setStatus('saving')
    await completeOnboarding.mutateAsync()
    navigate('/campaigns', { replace: true })
  }

  return (
    <div className="auth-page">
      <h1>Welcome</h1>
      <p className="account-email">{session?.user.email}</p>
      <p className="account-help">
        Two quick things before you dive in — both optional, and you can change them later from Settings.
      </p>

      <form onSubmit={handleSubmit} className="auth-form">
        <div className="account-section">
          <h2>Display Name</h2>
          <p className="account-help">Shown anywhere the app references you, instead of your email.</p>
          <label>
            <span>Display Name</span>
            <input
              type="text"
              autoFocus
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={session?.user.email ?? 'Your name'}
            />
          </label>
        </div>

        <div className="account-section">
          <h2>Set a Password</h2>
          <p className="account-help">Sign in with a password next time instead of requesting a magic link.</p>
          <label>
            <span>New Password</span>
            <input
              type="password"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters (optional)"
            />
          </label>
          <label>
            <span>Confirm Password</span>
            <input type="password" minLength={8} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          </label>
        </div>

        {status === 'error' && <p className="error-text">{errorMessage}</p>}

        <div className="entity-form-actions">
          <button type="submit" className="btn-primary" disabled={status === 'saving'}>
            {status === 'saving' ? 'Saving…' : 'Continue'}
          </button>
          <button type="button" onClick={handleSkip} disabled={status === 'saving'}>
            Skip for now
          </button>
        </div>
      </form>
    </div>
  )
}
