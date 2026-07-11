import { Navigate, Outlet } from 'react-router-dom'
import { useCampaign } from '../context/CampaignContext'
import type { MemberRole } from '../types/database'

// UX-only guard — hides GM-only routes/nav from players in the UI. The real
// boundary is Row Level Security: a player hitting this route's data queries
// directly still gets nothing back from Supabase.
export function RequireCampaignRole({ role }: { role: MemberRole }) {
  const { role: myRole, isLoading, campaign } = useCampaign()

  if (isLoading) return <div className="page-loading">Loading…</div>
  if (!campaign || myRole !== role) return <Navigate to=".." replace />

  return <Outlet />
}
