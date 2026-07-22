import { useState } from 'react'
import { useReferenceOptions } from '../entities/useEntity'
import {
  useAllSessions,
  useSetCurrentSession,
  useSessionAttachedCharacters,
  useSessionAttachedLocations,
  useSessionAttachmentsRealtime,
  useAttachCharacter,
  useAttachLocation,
  useSetCharacterRevealed,
  useSetLocationRevealed,
  useDetachCharacter,
  useDetachLocation,
  type CurrentSessionRow,
} from './useCurrentSession'

function AttachRow({
  label,
  revealed,
  onToggleRevealed,
  onRemove,
}: {
  label: string
  revealed: boolean
  onToggleRevealed: () => void
  onRemove: () => void
}) {
  return (
    <div className="session-control-item">
      <span className="session-control-item-name">{label}</span>
      <label className="session-reveal-toggle">
        <input type="checkbox" checked={revealed} onChange={onToggleRevealed} />
        {revealed ? 'Revealed' : 'Hidden'}
      </label>
      <button type="button" className="btn-link session-control-remove" onClick={onRemove}>
        Remove
      </button>
    </div>
  )
}

// GM-only control panel: pick which session is "current" (live, playing
// right now), then reveal/hide the characters and locations attached to it.
// Only ever rendered when isGm is true and the GM isn't previewing as a
// player - gated by the caller (Dashboard.tsx), same as other GM-only chrome.
export function SessionControlPanel({ campaignId, session }: { campaignId: string; session: CurrentSessionRow | null }) {
  const { data: sessions } = useAllSessions(campaignId)
  const setCurrentSession = useSetCurrentSession()

  const { data: characters } = useSessionAttachedCharacters(session?.id)
  const { data: locations } = useSessionAttachedLocations(session?.id)
  useSessionAttachmentsRealtime(session?.id)

  const attachCharacter = useAttachCharacter()
  const attachLocation = useAttachLocation()
  const setCharacterRevealed = useSetCharacterRevealed()
  const setLocationRevealed = useSetLocationRevealed()
  const detachCharacter = useDetachCharacter()
  const detachLocation = useDetachLocation()

  const { data: allCharacters } = useReferenceOptions({ table: 'characters', labelField: 'name' }, campaignId)
  const { data: allLocations } = useReferenceOptions({ table: 'locations', labelField: 'name' }, campaignId)

  const [addCharacterId, setAddCharacterId] = useState('')
  const [addLocationId, setAddLocationId] = useState('')

  const attachedCharacterIds = new Set((characters ?? []).map((c) => c.characterId))
  const attachedLocationIds = new Set((locations ?? []).map((l) => l.locationId))
  const availableCharacters = (allCharacters ?? []).filter((c) => !attachedCharacterIds.has(c.id))
  const availableLocations = (allLocations ?? []).filter((l) => !attachedLocationIds.has(l.id))

  const handleAddCharacter = () => {
    if (!session || !addCharacterId) return
    attachCharacter.mutate({ sessionId: session.id, characterId: addCharacterId })
    setAddCharacterId('')
  }
  const handleAddLocation = () => {
    if (!session || !addLocationId) return
    attachLocation.mutate({ sessionId: session.id, locationId: addLocationId })
    setAddLocationId('')
  }

  return (
    <section className="session-control-panel">
      <h2 className="dashboard-section-title caps">Session Control</h2>

      <div className="session-control-row">
        <label className="caps" htmlFor="current-session-picker">
          Current Session
        </label>
        <select
          id="current-session-picker"
          value={session?.id ?? ''}
          onChange={(e) => setCurrentSession.mutate({ campaignId, sessionId: e.target.value || null })}
        >
          <option value="">— No session in progress —</option>
          {sessions?.map((s) => (
            <option key={s.id} value={s.id}>
              {s.session_number ? `#${s.session_number} — ` : ''}
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {session && (
        <>
          <div className="session-control-group">
            <h3 className="caps">Characters</h3>
            {!characters?.length && <p className="empty-state">None attached yet.</p>}
            {characters?.map((c) => (
              <AttachRow
                key={c.characterId}
                label={c.name}
                revealed={c.revealed}
                onToggleRevealed={() =>
                  setCharacterRevealed.mutate({ sessionId: c.sessionId, characterId: c.characterId, revealed: !c.revealed })
                }
                onRemove={() => detachCharacter.mutate({ sessionId: c.sessionId, characterId: c.characterId })}
              />
            ))}
            <div className="session-control-add">
              <select value={addCharacterId} onChange={(e) => setAddCharacterId(e.target.value)}>
                <option value="">Add a character…</option>
                {availableCharacters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
              <button type="button" className="btn" onClick={handleAddCharacter} disabled={!addCharacterId}>
                Add
              </button>
            </div>
          </div>

          <div className="session-control-group">
            <h3 className="caps">Locations</h3>
            {!locations?.length && <p className="empty-state">None attached yet.</p>}
            {locations?.map((l) => (
              <AttachRow
                key={l.id}
                label={l.name}
                revealed={l.revealed}
                onToggleRevealed={() => setLocationRevealed.mutate({ sessionId: l.sessionId, id: l.id, revealed: !l.revealed })}
                onRemove={() => detachLocation.mutate({ sessionId: l.sessionId, id: l.id })}
              />
            ))}
            <div className="session-control-add">
              <select value={addLocationId} onChange={(e) => setAddLocationId(e.target.value)}>
                <option value="">Add a location…</option>
                {availableLocations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label}
                  </option>
                ))}
              </select>
              <button type="button" className="btn" onClick={handleAddLocation} disabled={!addLocationId}>
                Add
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  )
}
