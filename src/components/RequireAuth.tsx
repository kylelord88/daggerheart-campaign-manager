import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function RequireAuth() {
  const { session, loading } = useAuth()

  if (loading) return <div className="page-loading">Loading…</div>
  if (!session) return <Navigate to="/login" replace />

  return <Outlet />
}
