import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './context/AuthContext'
import { RequireAuth } from './components/RequireAuth'
import { RequireCampaignRole } from './components/RequireCampaignRole'
import { Login } from './routes/Login'
import { Account } from './routes/Account'
import { CampaignsPicker } from './routes/CampaignsPicker'
import { CampaignLayout } from './routes/CampaignLayout'
import { Dashboard } from './routes/Dashboard'
import { EntityListPage } from './features/entities/EntityListPage'
import { EntityFormPage } from './features/entities/EntityFormPage'
import { LOCATION_CONFIG, FACTION_CONFIG, DIVINITY_CONFIG, CHARACTER_CONFIG, QUEST_CONFIG } from './features/entities/entityConfigs'
import { MembersPage } from './features/members/MembersPage'
import { MapPage } from './features/map/MapPage'

const queryClient = new QueryClient()

function EntitySection({ config }: { config: (typeof LOCATION_CONFIG) }) {
  return (
    <Routes>
      <Route index element={<EntityListPage config={config} />} />
      <Route path=":slug" element={<EntityFormPage config={config} />} />
    </Routes>
  )
}

function SessionsPlaceholder() {
  return <p className="empty-state">Session notes &amp; the live encounter tracker are coming in Phase 5.</p>
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <HashRouter>
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route element={<RequireAuth />}>
              <Route path="/" element={<Navigate to="/campaigns" replace />} />
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
                <Route element={<RequireCampaignRole role="gm" />}>
                  <Route path="sessions/*" element={<SessionsPlaceholder />} />
                  <Route path="members" element={<MembersPage />} />
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
