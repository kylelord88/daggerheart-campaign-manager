import { Navigate, Outlet } from 'react-router-dom'
import { useMyProfile } from '../features/account/useProfile'

export function RequireOnboarded() {
  const { data: profile, isLoading } = useMyProfile()

  if (isLoading) return <div className="page-loading">Loading…</div>
  if (!profile?.onboarded) return <Navigate to="/onboarding" replace />

  return <Outlet />
}
