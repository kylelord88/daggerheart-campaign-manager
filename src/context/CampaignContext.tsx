import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from './AuthContext'
import type { Campaign, MemberRole } from '../types/database'

const PREVIEW_KEY = 'previewAsPlayer'

interface CampaignContextValue {
  campaign: Campaign | null
  role: MemberRole | null
  isLoading: boolean
  /** True GM status only when NOT previewing as a player — every UI gate should read this one. */
  isGm: boolean
  /** True GM status regardless of preview state — for the preview toggle itself. */
  realIsGm: boolean
  previewAsPlayer: boolean
  setPreviewAsPlayer: (value: boolean) => void
}

const CampaignContext = createContext<CampaignContextValue | undefined>(undefined)

// Loads the campaign + the current user's membership role for :campaignSlug.
// This is a UX convenience only — the real access boundary is Row Level
// Security on the Supabase tables, not this context.
export function CampaignProvider({ children }: { children: ReactNode }) {
  const { campaignSlug } = useParams<{ campaignSlug: string }>()
  const { session } = useAuth()
  const userId = session?.user.id

  const { data, isLoading } = useQuery({
    queryKey: ['campaign-membership', campaignSlug, userId],
    enabled: Boolean(campaignSlug && userId),
    queryFn: async () => {
      const { data: campaign, error: campaignError } = await supabase
        .from('campaigns')
        .select('*')
        .eq('slug', campaignSlug!)
        .single()
      if (campaignError) throw campaignError

      const { data: membership, error: memberError } = await supabase
        .from('campaign_members')
        .select('role')
        .eq('campaign_id', campaign.id)
        .eq('user_id', userId!)
        .maybeSingle()
      if (memberError) throw memberError

      return { campaign, role: (membership?.role as MemberRole | undefined) ?? null }
    },
  })

  // GM-only "preview as player" toggle — session-scoped (not persisted across
  // tabs/reloads-of-a-fresh-browser) so it can't accidentally get left on
  // indefinitely. Purely a UI/content preview: it hides GM-only chrome and
  // client-side filters unpublished content, but the GM's real Supabase
  // session still has full RLS access underneath — see MembersPage.
  const [previewAsPlayer, setPreviewAsPlayerState] = useState(() => sessionStorage.getItem(PREVIEW_KEY) === 'true')
  const realIsGm = data?.role === 'gm'

  useEffect(() => {
    if (!realIsGm && previewAsPlayer) setPreviewAsPlayerState(false)
  }, [realIsGm, previewAsPlayer])

  const setPreviewAsPlayer = (value: boolean) => {
    sessionStorage.setItem(PREVIEW_KEY, String(value))
    setPreviewAsPlayerState(value)
  }

  const value: CampaignContextValue = {
    campaign: data?.campaign ?? null,
    role: data?.role ?? null,
    isLoading,
    isGm: realIsGm && !previewAsPlayer,
    realIsGm,
    previewAsPlayer: realIsGm && previewAsPlayer,
    setPreviewAsPlayer,
  }

  return <CampaignContext.Provider value={value}>{children}</CampaignContext.Provider>
}

export function useCampaign() {
  const ctx = useContext(CampaignContext)
  if (!ctx) throw new Error('useCampaign must be used within CampaignProvider')
  return ctx
}
