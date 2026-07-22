import { Link } from 'react-router-dom'
import { htmlToExcerpt } from '../../lib/textExcerpt'
import {
  useCurrentSession,
  useCurrentSessionRealtime,
  useSessionAttachedCharacters,
  useSessionAttachedLocations,
  useSessionAttachmentsRealtime,
} from './useCurrentSession'

function formatSessionDate(iso: string | null): string | null {
  if (!iso) return null
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })
}

// Player-facing "what's happening right now" block: the session the GM has
// marked current, plus whichever characters/locations they've revealed on
// it. Always filtered to revealed=true here even for the GM's own view (the
// GM manages the hidden/unrevealed state separately, in SessionControlPanel
// below) so this section shows the same thing everyone at the table sees.
export function CurrentSessionSection({ campaignId }: { campaignId: string | undefined }) {
  const { data: session, isLoading } = useCurrentSession(campaignId)
  useCurrentSessionRealtime(campaignId)

  const { data: characters } = useSessionAttachedCharacters(session?.id)
  const { data: locations } = useSessionAttachedLocations(session?.id)
  useSessionAttachmentsRealtime(session?.id)

  if (isLoading) return null

  if (!session) {
    return (
      <div>
        <h2 className="dashboard-section-title caps">Current Session</h2>
        <p className="empty-state">No session in progress.</p>
      </div>
    )
  }

  const revealedCharacters = (characters ?? []).filter((c) => c.revealed)
  const revealedLocations = (locations ?? []).filter((l) => l.revealed)
  const hasReveals = revealedCharacters.length > 0 || revealedLocations.length > 0
  const formattedDate = formatSessionDate(session.session_date)

  return (
    <div>
      <h2 className="dashboard-section-title caps">Current Session</h2>
      <div className="session-current-header">
        <Link to={`sessions/${session.slug}`} className="session-current-name">
          {session.name}
        </Link>
        {(session.session_number || formattedDate) && (
          <div className="session-current-meta caps">
            {session.session_number ? <span>Session #{session.session_number}</span> : null}
            {session.session_number && formattedDate ? <span> · </span> : null}
            {formattedDate ? <span>{formattedDate}</span> : null}
          </div>
        )}
        {session.highlights && session.highlights.length > 0 && (
          <div className="field-view tags">
            {session.highlights.map((h) => (
              <span key={h} className="tag">
                {h}
              </span>
            ))}
          </div>
        )}
      </div>

      {!hasReveals && <p className="empty-state">The GM hasn't revealed anything yet.</p>}

      {hasReveals && (
        <ul className="entity-grid session-reveal-grid">
          {revealedCharacters.map((c) => (
            <li key={`char-${c.characterId}`}>
              <Link to={`characters/${c.slug}`} className="entity-card">
                {c.portraitUrl && <div className="entity-card-thumb" style={{ backgroundImage: `url(${c.portraitUrl})` }} />}
                <span className="entity-card-badge caps">Character</span>
                <h3>{c.name}</h3>
                {c.blurb && <p className="entity-card-excerpt">{htmlToExcerpt(c.blurb)}</p>}
                <span className="entity-card-readmore">Read More &rarr;</span>
              </Link>
            </li>
          ))}
          {revealedLocations.map((l) => (
            <li key={`loc-${l.id}`}>
              <Link to={`locations/${l.slug}`} className="entity-card">
                {l.heroImageUrl && <div className="entity-card-thumb" style={{ backgroundImage: `url(${l.heroImageUrl})` }} />}
                <span className="entity-card-badge caps">Location</span>
                <h3>{l.name}</h3>
                {l.blurb && <p className="entity-card-excerpt">{htmlToExcerpt(l.blurb)}</p>}
                <span className="entity-card-readmore">Read More &rarr;</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
