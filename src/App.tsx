import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './context/AuthContext'
import { RequireAuth } from './components/RequireAuth'
import { RequireOnboarded } from './components/RequireOnboarded'
import { RequireCampaignRole } from './components/RequireCampaignRole'
import { Login } from './routes/Login'
import { JoinPage } from './routes/JoinPage'
import { Account } from './routes/Account'
import { Onboarding } from './routes/Onboarding'
import { CampaignsPicker } from './routes/CampaignsPicker'
import { CampaignLayout } from './routes/CampaignLayout'
import { Dashboard } from './routes/Dashboard'
import { EntityListPage } from './features/entities/EntityListPage'
import { EntityFormPage } from './features/entities/EntityFormPage'
import {
  LOCATION_CONFIG,
  FACTION_CONFIG,
  DIVINITY_CONFIG,
  CHARACTER_CONFIG,
  QUEST_CONFIG,
  SESSION_CONFIG,
} from './features/entities/entityConfigs'
import { MembersPage } from './features/members/MembersPage'
import { MapPage } from './features/map/MapPage'
import { MiscListPage } from './features/misc/MiscListPage'
import { MiscEntryPage } from './features/misc/MiscEntryPage'
import { PlayerNotesPage } from './features/notes/PlayerNotesPage'
import { postAuthRedirectPath } from './lib/pendingInvite'

const queryClient = new QueryClient()

function RootRedirect() {
  return <Navigate to={postAuthRedirectPath()} replace />
}

function EntitySection({ config }: { config: (typeof LOCATION_CONFIG) }) {
  return (
    <Routes>
      <Route index element={<EntityListPage config={config} />} />
      <Route path=":slug" element={<EntityFormPage config={config} />} />
    </Routes>
  )
}

function MiscSection() {
  return (
    <Routes>
      <Route index element={<MiscListPage />} />
      <Route path=":slug" element={<MiscEntryPage />} />
    </Routes>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <HashRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/join/:linkId" element={<JoinPage />} />

            <Route element={<RequireAuth />}>
              <Route path="/onboarding" element={<Onboarding />} />

              <Route element={<RequireOnboarded />}>
                <Route path="/" element={<RootRedirect />} />
                <Route path="/campaigns" element={<CampaignsPicker />} />
                <Route path="/account" element={<Account />} />

                <Route path="/c/:campaignSlug" element={<CampaignLayout />}>
                  <Route index element={<Dashboard />} />
                  <Route path="map" element={<MapPage />} />
                  <Route path="locations/*" element={<EntitySection config={LOCATION_CONFIG} />} />
                  <Route path="factions/*" element={<EntitySection config={FACTION_CONFIG} />} />
                  <Route path="divinities/*" element={<EntitySection config={DIVINITY_CONFIG} />} />
                  <Route path="characters/*" element={<EntitySection config={CHARACTER_CONFIG} />} />
                  <Route path="quests/*" element={<EntitySection config={QUEST_CONFIG} />} />
                  {/* Not GM-gated: RLS itself restricts players to published
                      sessions and hides session_gm_notes entirely, so this
                      route can be open to every member. */}
                  <Route path="sessions/*" element={<EntitySection config={SESSION_CONFIG} />} />
                  <Route path="misc/*" element={<MiscSection />} />
                  <Route path="notes" element={<PlayerNotesPage />} />
                  <Route path="account" element={<Account />} />
                  <Route element={<RequireCampaignRole role="gm" />}>
                    <Route path="members" element={<MembersPage />} />
                  </Route>
                </Route>
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </HashRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
