import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { useSetDisplayName } from '../features/account/useProfile'

export function Account() {
  const { session } = useAuth()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const [displayName, setDisplayName] = useState('')
  const setDisplayNameMutation = useSetDisplayName()
  const [nameStatus, setNameStatus] = useState<'idle' | 'saved'>('idle')

  // The name a player set is the same across every campaign they're in, but it
  // only lives on campaign_members rows (one per membership) - grab it from
  // whichever membership the roster RPC returns first.
  useEffect(() => {
    if (!session) return
    supabase
      .from('campaign_members')
      .select('display_name')
      .eq('user_id', session.user.id)
      .not('display_name', 'is', null)
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.display_name) setDisplayName(data.display_name)
      })
  }, [session])

  const handleSaveName = async (e: FormEvent) => {
    e.preventDefault()
    setNameStatus('idle')
    await setDisplayNameMutation.mutateAsync(displayName.trim())
    setNameStatus('saved')
  }

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
      <h1>Settings</h1>
      <p className="account-email">{session?.user.email}</p>

      <div className="account-section">
        <h2>Display Name</h2>
        <p className="account-help">
          Shown anywhere the app references you — quest assignments, session highlights, community content, the
          members list. Leave blank to just show your email instead.
        </p>
        <form onSubmit={handleSaveName} className="auth-form">
          <label>
            <span>Display Name</span>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={session?.user.email ?? 'Your name'}
            />
          </label>
          <button type="submit" className="btn-primary" disabled={setDisplayNameMutation.isPending}>
            {setDisplayNameMutation.isPending ? 'Saving…' : 'Save Name'}
          </button>
          {nameStatus === 'saved' && <p className="account-success">Display name saved.</p>}
        </form>
      </div>

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
